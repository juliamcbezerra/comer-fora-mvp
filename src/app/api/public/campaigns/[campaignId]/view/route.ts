import { NextResponse } from "next/server";
import { z } from "zod";
import { isValidUuid } from "@/lib/session";
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

    const { error: insertError } = await supabase
      .from("campaign_events")
      .insert({
        campaign_id: campaign.id,
        restaurant_id: campaign.restaurant_id,
        session_id: campaign.session_id,
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

    const { count: redemptionsCount } = await supabase
      .from("campaign_events")
      .select("id", { count: "exact", head: true })
      .eq("campaign_id", campaign.id)
      .eq("event_type", "redemption");

    const used = redemptionsCount ?? 0;
    const limit = Number(campaign.coupon_limit);

    return NextResponse.json(
      {
        recorded: true,
        redemptions_count: used,
        coupon_limit: limit,
        remaining_coupons: Math.max(0, limit - used),
      },
      { status: 201 }
    );
  } catch (error) {
    const status = error instanceof SupabaseConfigError ? 503 : 500;
    const message =
      error instanceof Error
        ? error.message
        : "Não foi possível registrar a visualização.";
    return NextResponse.json({ error: message }, { status });
  }
}
