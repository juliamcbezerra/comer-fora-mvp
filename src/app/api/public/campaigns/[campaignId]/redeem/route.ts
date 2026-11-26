import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { redeemRequestSchema } from "@/lib/schemas";
import { isValidUuid } from "@/lib/session";
import { getSupabaseAdmin, SupabaseConfigError } from "@/lib/supabase/server";

const COUPON_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

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

    // Validação server-side obrigatória do limite de cupons (resgates_atuais < coupon_limit)
    const { count: currentRedemptions, error: countError } = await supabase
      .from("campaign_events")
      .select("id", { count: "exact", head: true })
      .eq("campaign_id", campaign.id)
      .eq("event_type", "redemption");

    if (countError) {
      throw new Error(
        `Falha ao verificar estoque de cupons: ${countError.message}`
      );
    }

    const used = currentRedemptions ?? 0;
    const limit = Number(campaign.coupon_limit);

    if (used >= limit) {
      return NextResponse.json(
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
    }

    const couponCode = generateDemoCouponCode();
    const eventsToInsert: Array<Record<string, unknown>> = [
      {
        campaign_id: campaign.id,
        restaurant_id: campaign.restaurant_id,
        session_id: campaign.session_id,
        event_type: "redemption",
        coupon_code: couponCode,
        source: parsed.data.source,
        metadata: {
          mode: "demonstrativo",
          anonymous: true,
        },
      },
    ];

    if (parsed.data.recurrence_opt_in) {
      eventsToInsert.push({
        campaign_id: campaign.id,
        restaurant_id: campaign.restaurant_id,
        session_id: campaign.session_id,
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

    return NextResponse.json(
      {
        coupon_code: couponCode,
        recurrence_opt_in: parsed.data.recurrence_opt_in,
        redemptions_count: nextUsed,
        coupon_limit: limit,
        remaining_coupons: Math.max(0, limit - nextUsed),
      },
      { status: 201 }
    );
  } catch (error) {
    const status = error instanceof SupabaseConfigError ? 503 : 500;
    const message =
      error instanceof Error
        ? error.message
        : "Não foi possível concluir o resgate demonstrativo.";
    return NextResponse.json({ error: message }, { status });
  }
}
