import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import {
  checkRateLimit,
  formatRetryAfterPtBr,
  getClientIp,
} from "@/lib/rate-limit";
import { redeemRequestSchema } from "@/lib/schemas";
import {
  attachSessionCookie,
  getOrCreateSessionId,
  isValidUuid,
} from "@/lib/session";
import { getSupabaseAdmin, SupabaseConfigError } from "@/lib/supabase/server";

const COUPON_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const REDEEM_RATE_LIMIT = {
  limit: 30,
  windowMs: 10 * 60 * 1000, // 10 minutos
};

function generateDemoCouponCode(): string {
  const bytes = randomBytes(4);
  let suffix = "";
  for (let i = 0; i < 4; i++) {
    suffix += COUPON_ALPHABET[bytes[i] % COUPON_ALPHABET.length];
  }
  return `CF-${suffix}`;
}

interface RouteContext {
  params: Promise<{ campaignId: string }>;
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { campaignId } = await context.params;
    if (!isValidUuid(campaignId)) {
      return NextResponse.json(
        { error: "Campanha inválida." },
        { status: 400 }
      );
    }

    const clientIp = getClientIp(request);
    const rateCheck = checkRateLimit(`redeem:${clientIp}`, REDEEM_RATE_LIMIT);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        {
          error: `Muitas tentativas de resgate em sequência. Aguarde ${formatRetryAfterPtBr(
            rateCheck.retryAfterSeconds
          )} para tentar novamente.`,
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(rateCheck.retryAfterSeconds),
          },
        }
      );
    }

    const body = await request.json().catch(() => ({}));
    const parsed = redeemRequestSchema.safeParse(body ?? {});
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Parâmetros de resgate inválidos." },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();
    const { data: campaign, error: campError } = await supabase
      .from("campaigns")
      .select("id, restaurant_id, session_id, status, coupon_limit")
      .eq("id", campaignId)
      .maybeSingle();

    if (campError) {
      throw new Error(campError.message);
    }

    if (!campaign) {
      return NextResponse.json(
        { error: "Campanha não encontrada." },
        { status: 404 }
      );
    }

    if (campaign.status !== "active") {
      return NextResponse.json(
        {
          error:
            "Esta campanha ainda aguarda aprovação humana e não está liberada para resgate.",
        },
        { status: 400 }
      );
    }

    // Proteção de campanhas seed (session_id IS NULL):
    // Isola os eventos do visitante em sua própria sessão para nunca esgotar nem poluir o exemplo compartilhado.
    const isSeedCampaign = campaign.session_id === null;
    let eventSessionId: string | null = campaign.session_id
      ? String(campaign.session_id)
      : null;
    let sessionCookieToAttach: string | null = null;

    if (isSeedCampaign) {
      const { sessionId, shouldSetCookie } = await getOrCreateSessionId();
      eventSessionId = sessionId;
      if (shouldSetCookie) {
        sessionCookieToAttach = sessionId;
      }
    }

    // Validação server-side obrigatória do limite de cupons + verificação de views para integridade do funil
    let redemptionsQuery = supabase
      .from("campaign_events")
      .select("id", { count: "exact", head: true })
      .eq("campaign_id", campaign.id)
      .eq("event_type", "redemption");

    let viewsQuery = supabase
      .from("campaign_events")
      .select("id", { count: "exact", head: true })
      .eq("campaign_id", campaign.id)
      .eq("event_type", "view");

    if (isSeedCampaign && eventSessionId) {
      redemptionsQuery = redemptionsQuery.or(
        `session_id.is.null,session_id.eq.${eventSessionId}`
      );
      viewsQuery = viewsQuery.or(
        `session_id.is.null,session_id.eq.${eventSessionId}`
      );
    }

    const [
      { count: currentRedemptions, error: countError },
      { count: currentViews, error: viewsError },
    ] = await Promise.all([redemptionsQuery, viewsQuery]);

    if (countError) {
      throw new Error(
        `Falha ao verificar estoque de cupons: ${countError.message}`
      );
    }
    if (viewsError) {
      throw new Error(
        `Falha ao verificar visualizações da campanha: ${viewsError.message}`
      );
    }

    const used = currentRedemptions ?? 0;
    const views = currentViews ?? 0;
    const limit = Number(campaign.coupon_limit);

    if (used >= limit) {
      const exhaustedResponse = NextResponse.json(
        {
          error:
            "Os cupons demonstrativos desta campanha se esgotaram. Nenhum novo resgate foi emitido para proteger o orçamento do restaurante.",
          exhausted: true,
          redemptions_count: used,
          coupon_limit: limit,
          remaining_coupons: 0,
        },
        { status: 409 }
      );
      return sessionCookieToAttach
        ? attachSessionCookie(exhaustedResponse, sessionCookieToAttach)
        : exhaustedResponse;
    }

    const couponCode = generateDemoCouponCode();
    const eventsToInsert: Array<Record<string, unknown>> = [];

    // Garante integridade do funil mesmo em chamadas diretas à API sem /view prévio:
    // se após este resgate (used + 1) os resgates superariam as visualizações, registra o view correspondente.
    if (views <= used) {
      eventsToInsert.push({
        campaign_id: campaign.id,
        restaurant_id: campaign.restaurant_id,
        session_id: eventSessionId,
        event_type: "view",
        coupon_code: null,
        source: parsed.data.source,
        metadata: {
          channel: "redeem_autocorrect",
          mode: "demonstrativo",
        },
      });
    }

    eventsToInsert.push({
      campaign_id: campaign.id,
      restaurant_id: campaign.restaurant_id,
      session_id: eventSessionId,
      event_type: "redemption",
      coupon_code: couponCode,
      source: parsed.data.source,
      metadata: {
        mode: "demonstrativo",
        anonymous: true,
      },
    });

    if (parsed.data.recurrence_opt_in) {
      eventsToInsert.push({
        campaign_id: campaign.id,
        restaurant_id: campaign.restaurant_id,
        session_id: eventSessionId,
        event_type: "recurrence_opt_in",
        coupon_code: couponCode,
        source: parsed.data.source,
        metadata: {
          mode: "demonstrativo",
          anonymous: true,
          giftback_opt_in: true,
        },
      });
    }

    const { error: insertError } = await supabase
      .from("campaign_events")
      .insert(eventsToInsert);

    if (insertError) {
      throw new Error(
        `Falha ao registrar resgate no Supabase: ${insertError.message}`
      );
    }

    const nextUsed = used + 1;

    const response = NextResponse.json(
      {
        coupon_code: couponCode,
        recurrence_opt_in: parsed.data.recurrence_opt_in,
        redemptions_count: nextUsed,
        coupon_limit: limit,
        remaining_coupons: Math.max(0, limit - nextUsed),
      },
      { status: 201 }
    );

    return sessionCookieToAttach
      ? attachSessionCookie(response, sessionCookieToAttach)
      : response;
  } catch (error) {
    const status = error instanceof SupabaseConfigError ? 503 : 500;
    const message =
      error instanceof Error
        ? error.message
        : "Não foi possível concluir o resgate demonstrativo.";
    return NextResponse.json({ error: message }, { status });
  }
}
