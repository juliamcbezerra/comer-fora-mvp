import {
  calculateCampaignPulseMetrics,
  evaluateCampaignPulse,
  getPulseThresholds,
  type CampaignMonitorState,
  type CampaignPulseEvaluation,
  type CampaignPulseMetrics,
  type PulseThresholds,
} from "@/lib/automation/campaign-pulse";
import type {
  AutomationAlertType,
  AutomationNotificationChannel,
  AutomationNotificationStatus,
  CampaignAlertInput,
} from "@/lib/automation/schemas";
import { getSupabaseAdmin } from "@/lib/supabase/server";

export interface MonitoredCampaignItem {
  campaign_id: string;
  restaurant_id: string;
  restaurant_name: string;
  title: string;
  target_window: string;
  approved_at: string;
  hours_since_activation: number;
  metrics: CampaignPulseMetrics;
  pulse_evaluation: CampaignPulseEvaluation;
}

export interface CampaignMonitorResponsePayload {
  checked_at: string;
  session_id: string;
  campaign_monitor_state: CampaignMonitorState;
  should_untrack: boolean;
  thresholds: PulseThresholds;
  campaigns: MonitoredCampaignItem[];
}

export interface CampaignAutomationLogRecord {
  id: string;
  campaign_id: string;
  restaurant_id: string;
  session_id: string;
  alert_type: AutomationAlertType;
  message: string;
  recommendation: string | null;
  metrics_snapshot: Record<string, unknown>;
  notification_channel: AutomationNotificationChannel;
  notification_status: AutomationNotificationStatus;
  idempotency_key: string;
  created_at: string;
}

export type RecordAlertResult =
  | {
      ok: true;
      status: 200 | 201;
      recorded: boolean;
      deduplicated: boolean;
      log: CampaignAutomationLogRecord;
    }
  | {
      ok: false;
      status: 403 | 404 | 409;
      error: string;
    };

function normalizeAutomationLogRow(
  row: Record<string, unknown>
): CampaignAutomationLogRecord {
  return {
    id: String(row.id),
    campaign_id: String(row.campaign_id),
    restaurant_id: String(row.restaurant_id),
    session_id: String(row.session_id),
    alert_type: row.alert_type as AutomationAlertType,
    message: String(row.message),
    recommendation: row.recommendation ? String(row.recommendation) : null,
    metrics_snapshot:
      row.metrics_snapshot && typeof row.metrics_snapshot === "object"
        ? (row.metrics_snapshot as Record<string, unknown>)
        : {},
    notification_channel:
      row.notification_channel as AutomationNotificationChannel,
    notification_status:
      row.notification_status as AutomationNotificationStatus,
    idempotency_key: String(row.idempotency_key),
    created_at: String(row.created_at),
  };
}

/**
 * Consulta campanhas ativas e aprovadas pertencentes estritamente à session_id informada.
 * - Exclui campanhas do seed global (session_id IS NULL).
 * - Exclui campanhas em draft, paused ou completed.
 * - Exclui eventos com source = 'demo_seed' para nunca contaminar desempenho real.
 */
export async function listMonitoredCampaignsForSession(params: {
  sessionId: string;
  campaignId?: string;
  onlyActionable?: boolean;
  now?: Date;
  thresholds?: PulseThresholds;
}): Promise<CampaignMonitorResponsePayload> {
  const now = params.now ?? new Date();
  const thresholds = params.thresholds ?? getPulseThresholds();
  const supabase = getSupabaseAdmin();

  if (params.campaignId) {
    const { data: singleCampaign, error: singleError } = await supabase
      .from("campaigns")
      .select(
        "id, restaurant_id, session_id, title, target_window, coupon_limit, budget_limit, estimated_cost_per_redemption, status, human_approved, approved_at, created_at"
      )
      .eq("id", params.campaignId)
      .eq("session_id", params.sessionId)
      .maybeSingle();

    if (singleError) {
      throw new Error(
        `Falha ao consultar campanha para monitoramento: ${singleError.message}`
      );
    }

    if (!singleCampaign) {
      return {
        checked_at: now.toISOString(),
        session_id: params.sessionId,
        campaign_monitor_state: "not_found",
        should_untrack: false,
        thresholds,
        campaigns: [],
      };
    }

    const isActiveApproved =
      singleCampaign.status === "active" &&
      Boolean(singleCampaign.human_approved);

    if (!isActiveApproved) {
      return {
        checked_at: now.toISOString(),
        session_id: params.sessionId,
        campaign_monitor_state: "inactive",
        should_untrack: true,
        thresholds,
        campaigns: [],
      };
    }

    const items = await buildMonitoredCampaignItems({
      campaigns: [singleCampaign as Record<string, unknown>],
      sessionId: params.sessionId,
      onlyActionable: Boolean(params.onlyActionable),
      now,
      thresholds,
    });

    return {
      checked_at: now.toISOString(),
      session_id: params.sessionId,
      campaign_monitor_state: "active",
      should_untrack: false,
      thresholds,
      campaigns: items,
    };
  }

  const { data: activeRows, error: listError } = await supabase
    .from("campaigns")
    .select(
      "id, restaurant_id, session_id, title, target_window, coupon_limit, budget_limit, estimated_cost_per_redemption, status, human_approved, approved_at, created_at"
    )
    .eq("session_id", params.sessionId)
    .eq("status", "active")
    .eq("human_approved", true)
    .order("approved_at", { ascending: false });

  if (listError) {
    throw new Error(
      `Falha ao listar campanhas ativas para monitoramento: ${listError.message}`
    );
  }

  const rows = (activeRows ?? []) as Array<Record<string, unknown>>;
  if (rows.length === 0) {
    return {
      checked_at: now.toISOString(),
      session_id: params.sessionId,
      campaign_monitor_state: "inactive",
      should_untrack: false,
      thresholds,
      campaigns: [],
    };
  }

  const items = await buildMonitoredCampaignItems({
    campaigns: rows,
    sessionId: params.sessionId,
    onlyActionable: Boolean(params.onlyActionable),
    now,
    thresholds,
  });

  return {
    checked_at: now.toISOString(),
    session_id: params.sessionId,
    campaign_monitor_state: "active",
    should_untrack: false,
    thresholds,
    campaigns: items,
  };
}

async function buildMonitoredCampaignItems(params: {
  campaigns: Array<Record<string, unknown>>;
  sessionId: string;
  onlyActionable: boolean;
  now: Date;
  thresholds: PulseThresholds;
}): Promise<MonitoredCampaignItem[]> {
  const supabase = getSupabaseAdmin();
  const campaignIds = params.campaigns.map((c) => String(c.id));
  const restaurantIds = Array.from(
    new Set(params.campaigns.map((c) => String(c.restaurant_id)))
  );

  const [
    { data: restaurantRows, error: restError },
    { data: eventRows, error: eventError },
    { data: logRows, error: logError },
  ] = await Promise.all([
    supabase
      .from("restaurants")
      .select("id, name")
      .in("id", restaurantIds),
    supabase
      .from("campaign_events")
      .select("campaign_id, event_type, source, session_id")
      .in("campaign_id", campaignIds)
      .eq("session_id", params.sessionId)
      .neq("source", "demo_seed"),
    supabase
      .from("campaign_automation_logs")
      .select("campaign_id, idempotency_key")
      .in("campaign_id", campaignIds)
      .eq("session_id", params.sessionId),
  ]);

  if (restError) {
    throw new Error(`Falha ao consultar restaurantes: ${restError.message}`);
  }
  if (eventError) {
    throw new Error(
      `Falha ao consultar eventos de campanha: ${eventError.message}`
    );
  }
  if (logError) {
    throw new Error(
      `Falha ao consultar logs de automação: ${logError.message}`
    );
  }

  const restaurantNameMap = new Map<string, string>();
  for (const row of restaurantRows ?? []) {
    restaurantNameMap.set(String(row.id), String(row.name));
  }

  const countsByCampaign = new Map<
    string,
    { views: number; redemptions: number; optIns: number }
  >();

  for (const ev of eventRows ?? []) {
    // Defesa em profundidade: nunca contabilizar eventos demo_seed ou de outra sessão
    if (String(ev.source) === "demo_seed") continue;
    if (String(ev.session_id ?? "") !== params.sessionId) continue;

    const cid = String(ev.campaign_id);
    const bucket = countsByCampaign.get(cid) ?? {
      views: 0,
      redemptions: 0,
      optIns: 0,
    };
    const type = String(ev.event_type);
    if (type === "view") bucket.views += 1;
    if (type === "redemption") bucket.redemptions += 1;
    if (type === "recurrence_opt_in") bucket.optIns += 1;
    countsByCampaign.set(cid, bucket);
  }

  const existingKeysByCampaign = new Map<string, Set<string>>();
  for (const log of logRows ?? []) {
    const cid = String(log.campaign_id);
    const set = existingKeysByCampaign.get(cid) ?? new Set<string>();
    set.add(String(log.idempotency_key));
    existingKeysByCampaign.set(cid, set);
  }

  const items: MonitoredCampaignItem[] = [];

  for (const row of params.campaigns) {
    const cid = String(row.id);
    const rid = String(row.restaurant_id);
    const counts = countsByCampaign.get(cid) ?? {
      views: 0,
      redemptions: 0,
      optIns: 0,
    };
    const activatedAt = row.approved_at
      ? String(row.approved_at)
      : String(row.created_at);

    const metrics = calculateCampaignPulseMetrics({
      views: counts.views,
      redemptions: counts.redemptions,
      optIns: counts.optIns,
      couponLimit: Number(row.coupon_limit),
      budgetLimit: Number(row.budget_limit),
      estimatedCostPerRedemption: Number(row.estimated_cost_per_redemption),
      activatedAtIso: activatedAt,
      now: params.now,
    });

    const evaluation = evaluateCampaignPulse({
      campaignId: cid,
      metrics,
      thresholds: params.thresholds,
      existingIdempotencyKeys: existingKeysByCampaign.get(cid),
      now: params.now,
    });

    if (params.onlyActionable && !evaluation.should_alert) {
      continue;
    }

    items.push({
      campaign_id: cid,
      restaurant_id: rid,
      restaurant_name: restaurantNameMap.get(rid) ?? "Restaurante",
      title: String(row.title),
      target_window: String(row.target_window),
      approved_at: activatedAt,
      hours_since_activation: metrics.hours_since_activation,
      metrics,
      pulse_evaluation: evaluation,
    });
  }

  return items;
}

/**
 * Registra alerta/evento em campaign_automation_logs com:
 * - Validação de ownership (session_id e restaurant_id).
 * - Bloqueio de campanhas draft/paused/completed (409).
 * - Deduplicação por idempotency_key (retorna 200 deduplicated: true).
 * - ZERO mutação na tabela campaigns.
 */
export async function recordCampaignAutomationAlert(
  input: CampaignAlertInput
): Promise<RecordAlertResult> {
  const supabase = getSupabaseAdmin();

  const { data: campaign, error: campError } = await supabase
    .from("campaigns")
    .select("id, restaurant_id, session_id, status, human_approved")
    .eq("id", input.campaign_id)
    .eq("session_id", input.session_id)
    .maybeSingle();

  if (campError) {
    throw new Error(
      `Falha ao validar campanha para registro de alerta: ${campError.message}`
    );
  }

  if (!campaign) {
    return {
      ok: false,
      status: 404,
      error: "Campanha não encontrada na sessão autorizada.",
    };
  }

  if (String(campaign.restaurant_id) !== input.restaurant_id) {
    return {
      ok: false,
      status: 403,
      error: "restaurant_id não corresponde à campanha informada.",
    };
  }

  if (campaign.status !== "active" || !campaign.human_approved) {
    return {
      ok: false,
      status: 409,
      error:
        "Campanha pausada, concluída ou não aprovada não aceita novos alertas de monitoramento.",
    };
  }

  const { data: existingLog, error: existingError } = await supabase
    .from("campaign_automation_logs")
    .select("*")
    .eq("idempotency_key", input.idempotency_key)
    .maybeSingle();

  if (existingError) {
    throw new Error(
      `Falha ao verificar idempotência do alerta: ${existingError.message}`
    );
  }

  if (existingLog) {
    if (String(existingLog.session_id) !== input.session_id) {
      return {
        ok: false,
        status: 403,
        error: "Conflito de idempotency_key com outra sessão.",
      };
    }

    return {
      ok: true,
      status: 200,
      recorded: false,
      deduplicated: true,
      log: normalizeAutomationLogRow(existingLog as Record<string, unknown>),
    };
  }

  const { data: inserted, error: insertError } = await supabase
    .from("campaign_automation_logs")
    .insert({
      campaign_id: input.campaign_id,
      restaurant_id: input.restaurant_id,
      session_id: input.session_id,
      alert_type: input.alert_type,
      message: input.message,
      recommendation: input.recommendation ?? null,
      metrics_snapshot: input.metrics_snapshot ?? {},
      notification_channel: input.notification_channel,
      notification_status: input.notification_status,
      idempotency_key: input.idempotency_key,
    })
    .select("*")
    .single();

  if (insertError) {
    // Trata condição de corrida em unique violation (23505) de forma idempotente
    if (insertError.code === "23505") {
      const { data: racedLog } = await supabase
        .from("campaign_automation_logs")
        .select("*")
        .eq("idempotency_key", input.idempotency_key)
        .eq("session_id", input.session_id)
        .maybeSingle();

      if (racedLog) {
        return {
          ok: true,
          status: 200,
          recorded: false,
          deduplicated: true,
          log: normalizeAutomationLogRow(racedLog as Record<string, unknown>),
        };
      }
    }

    throw new Error(
      `Falha ao registrar alerta de automação: ${insertError.message}`
    );
  }

  return {
    ok: true,
    status: 201,
    recorded: true,
    deduplicated: false,
    log: normalizeAutomationLogRow(inserted as Record<string, unknown>),
  };
}
