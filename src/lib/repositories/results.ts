import { getSupabaseAdmin } from "@/lib/supabase/server";
import type { AiRunRecord, CampaignStatus } from "@/lib/types";
import { roundCurrency } from "@/lib/utils";

export interface CampaignResultRow {
  id: string;
  title: string;
  objective: string;
  status: CampaignStatus;
  target_window: string;
  coupon_limit: number;
  estimated_cost_per_redemption: number;
  budget_limit: number;
  human_approved: boolean;
  created_at: string;
  views: number;
  redemptions: number;
  opt_ins: number;
  conversion_rate_pct: number;
  recurrence_opt_in_rate_pct: number;
  budget_used: number;
}

export interface FunnelStagePoint {
  stage: string;
  count: number;
  pctOfViews: number;
}

export interface EcosystemNsmSummary {
  total_restaurants: number;
  restaurants_with_diagnostic: number;
  qualified_activated_restaurants: number;
  nsm_qualified_activation_rate_pct: number;
  total_active_campaigns: number;
  total_views: number;
  total_redemptions: number;
  total_opt_ins: number;
  ecosystem_conversion_rate_pct: number;
  ecosystem_opt_in_rate_pct: number;
  ai_total_runs: number;
  ai_success_runs: number;
  ai_fallback_runs: number;
  ai_success_rate_pct: number;
  ai_avg_latency_ms: number;
}

export interface RestaurantResultsPayload {
  kpis: {
    total_views: number;
    total_redemptions: number;
    conversion_rate_pct: number;
    total_opt_ins: number;
    recurrence_opt_in_rate_pct: number;
    budget_used: number;
    budget_ceiling: number;
    monthly_promo_budget: number;
  };
  funnel: FunnelStagePoint[];
  campaigns: CampaignResultRow[];
  ecosystem: EcosystemNsmSummary;
  ai_runs: AiRunRecord[];
}

export async function getRestaurantResultsData(params: {
  restaurantId: string;
  monthlyPromoBudget: number;
  sessionId: string | null;
}): Promise<RestaurantResultsPayload> {
  const { restaurantId, monthlyPromoBudget, sessionId } = params;
  const supabase = getSupabaseAdmin();

  // 1. Campanhas do restaurante (escopo: seed + sessão atual)
  let campQuery = supabase
    .from("campaigns")
    .select(
      "id, title, objective, status, target_window, coupon_limit, estimated_cost_per_redemption, budget_limit, human_approved, created_at"
    )
    .eq("restaurant_id", restaurantId)
    .order("created_at", { ascending: false });

  if (sessionId) {
    campQuery = campQuery.or(`session_id.is.null,session_id.eq.${sessionId}`);
  } else {
    campQuery = campQuery.is("session_id", null);
  }

  // 2. Consultas do ecossistema (escopo: seed + sessão atual — sem vazar dados de outros visitantes)
  let ecoRestQuery = supabase.from("restaurants").select("id");
  let ecoDiagQuery = supabase.from("diagnostics").select("restaurant_id");
  let ecoCampQuery = supabase
    .from("campaigns")
    .select("id, restaurant_id, status, human_approved");
  let ecoEventsQuery = supabase
    .from("campaign_events")
    .select("campaign_id, restaurant_id, event_type");
  let aiRunsQuery = supabase
    .from("ai_runs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(15);

  if (sessionId) {
    ecoRestQuery = ecoRestQuery.or(
      `is_demo_seed.eq.true,session_id.eq.${sessionId}`
    );
    ecoDiagQuery = ecoDiagQuery.or(
      `session_id.is.null,session_id.eq.${sessionId}`
    );
    ecoCampQuery = ecoCampQuery.or(
      `session_id.is.null,session_id.eq.${sessionId}`
    );
    ecoEventsQuery = ecoEventsQuery.or(
      `session_id.is.null,session_id.eq.${sessionId}`
    );
    aiRunsQuery = aiRunsQuery.or(
      `session_id.is.null,session_id.eq.${sessionId}`
    );
  } else {
    ecoRestQuery = ecoRestQuery.eq("is_demo_seed", true);
    ecoDiagQuery = ecoDiagQuery.is("session_id", null);
    ecoCampQuery = ecoCampQuery.is("session_id", null);
    ecoEventsQuery = ecoEventsQuery.is("session_id", null);
    aiRunsQuery = aiRunsQuery.is("session_id", null);
  }

  const [
    { data: campRows, error: campError },
    { data: ecoRestRows },
    { data: ecoDiagRows },
    { data: ecoCampRows },
    { data: ecoEventRows },
    { data: aiRunRows },
  ] = await Promise.all([
    campQuery,
    ecoRestQuery,
    ecoDiagQuery,
    ecoCampQuery,
    ecoEventsQuery,
    aiRunsQuery,
  ]);

  if (campError) {
    throw new Error(`Erro ao consultar campanhas: ${campError.message}`);
  }

  const restaurantCampaignIds = new Set((campRows ?? []).map((c) => String(c.id)));

  // Agrupar eventos por campanha
  const eventCountByCampaign = new Map<
    string,
    { views: number; redemptions: number; optIns: number }
  >();

  let ecoViews = 0;
  let ecoRedemptions = 0;
  let ecoOptIns = 0;
  const redeemedCampaignIds = new Set<string>();

  for (const ev of ecoEventRows ?? []) {
    const cid = String(ev.campaign_id);
    const type = String(ev.event_type);

    if (type === "view") ecoViews += 1;
    if (type === "redemption") {
      ecoRedemptions += 1;
      redeemedCampaignIds.add(cid);
    }
    if (type === "recurrence_opt_in") ecoOptIns += 1;

    if (restaurantCampaignIds.has(cid)) {
      const bucket = eventCountByCampaign.get(cid) ?? {
        views: 0,
        redemptions: 0,
        optIns: 0,
      };
      if (type === "view") bucket.views += 1;
      if (type === "redemption") bucket.redemptions += 1;
      if (type === "recurrence_opt_in") bucket.optIns += 1;
      eventCountByCampaign.set(cid, bucket);
    }
  }

  let totalViews = 0;
  let totalRedemptions = 0;
  let totalOptIns = 0;
  let totalBudgetUsed = 0;
  let totalBudgetCeiling = 0;

  const campaigns: CampaignResultRow[] = (campRows ?? []).map((row) => {
    const cid = String(row.id);
    const counts = eventCountByCampaign.get(cid) ?? {
      views: 0,
      redemptions: 0,
      optIns: 0,
    };
    const costPerRedemption = Number(row.estimated_cost_per_redemption);
    const budgetLimit = Number(row.budget_limit);
    const budgetUsed = roundCurrency(counts.redemptions * costPerRedemption);

    totalViews += counts.views;
    totalRedemptions += counts.redemptions;
    totalOptIns += counts.optIns;
    totalBudgetUsed = roundCurrency(totalBudgetUsed + budgetUsed);
    totalBudgetCeiling = roundCurrency(totalBudgetCeiling + budgetLimit);

    return {
      id: cid,
      title: String(row.title),
      objective: String(row.objective),
      status: row.status as CampaignStatus,
      target_window: String(row.target_window),
      coupon_limit: Number(row.coupon_limit),
      estimated_cost_per_redemption: costPerRedemption,
      budget_limit: budgetLimit,
      human_approved: Boolean(row.human_approved),
      created_at: String(row.created_at),
      views: counts.views,
      redemptions: counts.redemptions,
      opt_ins: counts.optIns,
      conversion_rate_pct:
        counts.views > 0
          ? roundCurrency((counts.redemptions / counts.views) * 100)
          : 0,
      recurrence_opt_in_rate_pct:
        counts.redemptions > 0
          ? roundCurrency((counts.optIns / counts.redemptions) * 100)
          : 0,
      budget_used: budgetUsed,
    };
  });

  const conversionRatePct =
    totalViews > 0 ? roundCurrency((totalRedemptions / totalViews) * 100) : 0;
  const recurrenceOptInRatePct =
    totalRedemptions > 0
      ? roundCurrency((totalOptIns / totalRedemptions) * 100)
      : 0;

  const funnel: FunnelStagePoint[] = [
    {
      stage: "Visualizações (QR)",
      count: totalViews,
      pctOfViews: totalViews > 0 ? 100 : 0,
    },
    {
      stage: "Resgates",
      count: totalRedemptions,
      pctOfViews: conversionRatePct,
    },
    {
      stage: "Opt-in Retorno",
      count: totalOptIns,
      pctOfViews:
        totalViews > 0 ? roundCurrency((totalOptIns / totalViews) * 100) : 0,
    },
  ];

  // Cálculo da North Star Metric (NSM): Taxa de Ativação Qualificada
  // % de restaurantes acessíveis que possuem campanha ativa aprovada com >= 1 resgate registrado
  const totalRestaurants = (ecoRestRows ?? []).length;
  const restaurantsWithDiagSet = new Set(
    (ecoDiagRows ?? []).map((d) => String(d.restaurant_id))
  );
  const qualifiedRestaurantsSet = new Set<string>();
  let totalActiveCampaigns = 0;

  for (const camp of ecoCampRows ?? []) {
    const isActiveApproved =
      camp.status === "active" && Boolean(camp.human_approved);
    if (isActiveApproved) {
      totalActiveCampaigns += 1;
      if (redeemedCampaignIds.has(String(camp.id))) {
        qualifiedRestaurantsSet.add(String(camp.restaurant_id));
      }
    }
  }

  const aiRuns: AiRunRecord[] = (aiRunRows ?? []).map((row) => ({
    id: String(row.id),
    restaurant_id: row.restaurant_id ? String(row.restaurant_id) : null,
    session_id: row.session_id ? String(row.session_id) : null,
    agent_name: row.agent_name as AiRunRecord["agent_name"],
    model: String(row.model),
    prompt_version: String(row.prompt_version),
    latency_ms: Number(row.latency_ms),
    status: row.status as AiRunRecord["status"],
    error_message: row.error_message ? String(row.error_message) : null,
    created_at: String(row.created_at),
  }));

  const aiSuccessRuns = aiRuns.filter((r) => r.status === "success").length;
  const aiFallbackRuns = aiRuns.filter((r) => r.status === "fallback").length;
  const aiAvgLatency =
    aiRuns.length > 0
      ? Math.round(
          aiRuns.reduce((acc, r) => acc + r.latency_ms, 0) / aiRuns.length
        )
      : 0;

  const ecosystem: EcosystemNsmSummary = {
    total_restaurants: totalRestaurants,
    restaurants_with_diagnostic: restaurantsWithDiagSet.size,
    qualified_activated_restaurants: qualifiedRestaurantsSet.size,
    nsm_qualified_activation_rate_pct:
      totalRestaurants > 0
        ? roundCurrency((qualifiedRestaurantsSet.size / totalRestaurants) * 100)
        : 0,
    total_active_campaigns: totalActiveCampaigns,
    total_views: ecoViews,
    total_redemptions: ecoRedemptions,
    total_opt_ins: ecoOptIns,
    ecosystem_conversion_rate_pct:
      ecoViews > 0 ? roundCurrency((ecoRedemptions / ecoViews) * 100) : 0,
    ecosystem_opt_in_rate_pct:
      ecoRedemptions > 0 ? roundCurrency((ecoOptIns / ecoRedemptions) * 100) : 0,
    ai_total_runs: aiRuns.length,
    ai_success_runs: aiSuccessRuns,
    ai_fallback_runs: aiFallbackRuns,
    ai_success_rate_pct:
      aiRuns.length > 0
        ? roundCurrency((aiSuccessRuns / aiRuns.length) * 100)
        : 0,
    ai_avg_latency_ms: aiAvgLatency,
  };

  return {
    kpis: {
      total_views: totalViews,
      total_redemptions: totalRedemptions,
      conversion_rate_pct: conversionRatePct,
      total_opt_ins: totalOptIns,
      recurrence_opt_in_rate_pct: recurrenceOptInRatePct,
      budget_used: totalBudgetUsed,
      budget_ceiling:
        totalBudgetCeiling > 0 ? totalBudgetCeiling : monthlyPromoBudget,
      monthly_promo_budget: monthlyPromoBudget,
    },
    funnel,
    campaigns,
    ecosystem,
    ai_runs: aiRuns,
  };
}
