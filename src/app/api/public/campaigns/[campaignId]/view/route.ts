import { NextResponse } from "next/server";
import { z } from "zod";
import {
  attachSessionCookie,
  getOrCreateSessionId,
  isValidUuid,
} from "@/lib/session";
import { getSupabaseAdmin, SupabaseConfigError } from "@/lib/supabase/server";

const viewRequestSchema = z.object({
  source: z.enum(["qr_scan", "simulator"]).default("qr_scan"),
});

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
    const parsed = viewRequestSchema.safeParse(body ?? {});
    const source = parsed.success ? parsed.data.source : "qr_scan";

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
      return NextResponse.json({
        recorded: false,
        status: campaign.status,
        message: "Campanha aguardando aprovação humana.",
      });
    }

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

    const { error: insertError } = await supabase
      .from("campaign_events")
      .insert({
        campaign_id: campaign.id,
        restaurant_id: campaign.restaurant_id,
        session_id: eventSessionId,
        event_type: "view",
        coupon_code: null,
        source,
        metadata: { channel: "public_qr_page" },
      });

    if (insertError) {
      throw new Error(
        `Falha ao registrar visualização: ${insertError.message}`
      );
    }

    let countQuery = supabase
      .from("campaign_events")
      .select("id", { count: "exact", head: true })
      .eq("campaign_id", campaign.id)
      .eq("event_type", "redemption");

    if (isSeedCampaign && eventSessionId) {
      countQuery = countQuery.or(
        `session_id.is.null,session_id.eq.${eventSessionId}`
      );
    }

    const { count: redemptionsCount } = await countQuery;

    const used = redemptionsCount ?? 0;
    const limit = Number(campaign.coupon_limit);

    const response = NextResponse.json(
      {
        recorded: true,
        redemptions_count: used,
        coupon_limit: limit,
        remaining_coupons: Math.max(0, limit - used),
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
        : "Não foi possível registrar a visualização.";
    return NextResponse.json({ error: message }, { status });
  }
}
