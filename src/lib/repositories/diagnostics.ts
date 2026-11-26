import { computeSafeFunnelMetrics } from "@/lib/funnel-metrics";
import { canAccessScopedRecord, isValidUuid } from "@/lib/session";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import type {
  CampaignRecord,
  DiagnosticAiOutput,
  DiagnosticRecord,
  PerformanceSummaryInput,
} from "@/lib/types";
import { roundCurrency } from "@/lib/utils";

function normalizeDiagnosticRow(row: Record<string, unknown>): DiagnosticRecord {
  return {
    id: String(row.id),
    restaurant_id: String(row.restaurant_id),
    session_id: row.session_id ? String(row.session_id) : null,
    readiness_score: Number(row.readiness_score),
    deterministic_metrics:
      row.deterministic_metrics as DiagnosticRecord["deterministic_metrics"],
    ai_output: row.ai_output as DiagnosticAiOutput,
    prompt_version: String(row.prompt_version),
    created_at: String(row.created_at),
  };
}

export async function getLatestDiagnosticForRestaurant(
  restaurantId: string,
  sessionId: string | null
): Promise<DiagnosticRecord | null> {
  if (!isValidUuid(restaurantId)) return null;

  const supabase = getSupabaseAdmin();
  let query = supabase
    .from("diagnostics")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .order("created_at", { ascending: false })
    .limit(1);

  if (sessionId) {
    query = query.or(`session_id.is.null,session_id.eq.${sessionId}`);
  } else {
    query = query.is("session_id", null);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(`Erro ao carregar diagnóstico: ${error.message}`);
  }

  if (!data || data.length === 0) return null;
  return normalizeDiagnosticRow(data[0] as Record<string, unknown>);
}

export async function getDiagnosticById(
  diagnosticId: string,
  sessionId: string | null
): Promise<DiagnosticRecord | null> {
  if (!isValidUuid(diagnosticId)) return null;

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("diagnostics")
    .select("*")
    .eq("id", diagnosticId)
    .maybeSingle();

  if (error || !data) return null;

  const record = normalizeDiagnosticRow(data as Record<string, unknown>);
  if (!canAccessScopedRecord(record, sessionId)) {
    return null;
  }
  return record;
}

export async function getRestaurantPerformanceSummary(
  restaurantId: string,
  sessionId: string | null
): Promise<PerformanceSummaryInput> {
  const supabase = getSupabaseAdmin();

  let campQuery = supabase
    .from("campaigns")
    .select("id, status, estimated_cost_per_redemption")
    .eq("restaurant_id", restaurantId);

  if (sessionId) {
    campQuery = campQuery.or(`session_id.is.null,session_id.eq.${sessionId}`);
  } else {
    campQuery = campQuery.is("session_id", null);
  }

  const { data: campaigns } = await campQuery;
  const campaignList = campaigns ?? [];

  if (campaignList.length === 0) {
    return {
      total_campaigns: 0,
      active_campaigns: 0,
      total_views: 0,
      total_redemptions: 0,
      total_opt_ins: 0,
      conversion_rate_pct: 0,
      recurrence_opt_in_rate_pct: 0,
      budget_used: 0,
    };
  }

  const campaignIds = campaignList.map((c) => String(c.id));
  const costMap = new Map(
    campaignList.map((c) => [
      String(c.id),
      Number(c.estimated_cost_per_redemption),
    ])
  );

  let eventsQuery = supabase
    .from("campaign_events")
    .select("campaign_id, event_type")
    .in("campaign_id", campaignIds);

  if (sessionId) {
    eventsQuery = eventsQuery.or(`session_id.is.null,session_id.eq.${sessionId}`);
  } else {
    eventsQuery = eventsQuery.is("session_id", null);
  }

  const { data: events } = await eventsQuery;

  let views = 0;
  let redemptions = 0;
  let optIns = 0;
  let budgetUsed = 0;

  for (const ev of events ?? []) {
    const type = String(ev.event_type);
    if (type === "view") views += 1;
    if (type === "redemption") {
      redemptions += 1;
      budgetUsed += costMap.get(String(ev.campaign_id)) ?? 0;
    }
    if (type === "recurrence_opt_in") optIns += 1;
  }

  const safeFunnel = computeSafeFunnelMetrics({ views, redemptions, optIns });

  return {
    total_campaigns: campaignList.length,
    active_campaigns: campaignList.filter((c) => c.status === "active").length,
    total_views: safeFunnel.views,
    total_redemptions: safeFunnel.redemptions,
    total_opt_ins: safeFunnel.optIns,
    conversion_rate_pct: safeFunnel.conversionRatePct,
    recurrence_opt_in_rate_pct: safeFunnel.recurrenceOptInRatePct,
    budget_used: roundCurrency(budgetUsed),
  };
}

export async function getAccessibleCampaignById(
  campaignId: string,
  sessionId: string | null
): Promise<CampaignRecord | null> {
  if (!isValidUuid(campaignId)) return null;

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("campaigns")
    .select("*")
    .eq("id", campaignId)
    .maybeSingle();

  if (error || !data) return null;

  const record: CampaignRecord = {
    id: String(data.id),
    restaurant_id: String(data.restaurant_id),
    diagnostic_id: data.diagnostic_id ? String(data.diagnostic_id) : null,
    session_id: data.session_id ? String(data.session_id) : null,
    objective: String(data.objective),
    title: String(data.title),
    offer_description: String(data.offer_description),
    estimated_cost_per_redemption: Number(data.estimated_cost_per_redemption),
    budget_limit: Number(data.budget_limit),
    coupon_limit: Number(data.coupon_limit),
    target_window: String(data.target_window),
    promo_copy: String(data.promo_copy),
    table_tent_headline: String(data.table_tent_headline),
    table_tent_body: String(data.table_tent_body),
    staff_script: String(data.staff_script),
    cta_text: String(data.cta_text),
    recurrence_hook: String(data.recurrence_hook),
    status: data.status as CampaignRecord["status"],
    human_approved: Boolean(data.human_approved),
    approved_at: data.approved_at ? String(data.approved_at) : null,
    created_at: String(data.created_at),
  };

  if (!canAccessScopedRecord(record, sessionId)) {
    return null;
  }

  return record;
}
