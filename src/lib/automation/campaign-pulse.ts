import { computeSafeFunnelMetrics } from "@/lib/funnel-metrics";
import { roundCurrency } from "@/lib/utils";
import type { AutomationAlertType } from "@/lib/automation/schemas";

/**
 * Limites configuráveis do Campaign Pulse.
 * IMPORTANTE: são hipóteses iniciais de produto para o protótipo,
 * não regras oficiais do iFood.
 */
export interface PulseThresholds {
  no_redemptions_min_hours: number;
  no_redemptions_min_views: number;
  low_conversion_min_views: number;
  low_conversion_max_pct: number;
  budget_warning_min_pct: number;
}

export const DEFAULT_PULSE_THRESHOLDS: PulseThresholds = {
  no_redemptions_min_hours: 24,
  no_redemptions_min_views: 5,
  low_conversion_min_views: 10,
  low_conversion_max_pct: 15,
  budget_warning_min_pct: 80,
};

function parsePositiveNumber(
  raw: string | undefined,
  fallback: number,
  max: number
): number {
  if (!raw?.trim()) return fallback;
  const parsed = Number(raw.trim());
  if (!Number.isFinite(parsed) || parsed <= 0 || parsed > max) {
    return fallback;
  }
  return parsed;
}

export function getPulseThresholds(
  env: Record<string, string | undefined> = process.env
): PulseThresholds {
  return {
    no_redemptions_min_hours: parsePositiveNumber(
      env.PULSE_NO_REDEMPTIONS_MIN_HOURS,
      DEFAULT_PULSE_THRESHOLDS.no_redemptions_min_hours,
      720
    ),
    no_redemptions_min_views: parsePositiveNumber(
      env.PULSE_NO_REDEMPTIONS_MIN_VIEWS,
      DEFAULT_PULSE_THRESHOLDS.no_redemptions_min_views,
      10_000
    ),
    low_conversion_min_views: parsePositiveNumber(
      env.PULSE_LOW_CONVERSION_MIN_VIEWS,
      DEFAULT_PULSE_THRESHOLDS.low_conversion_min_views,
      10_000
    ),
    low_conversion_max_pct: parsePositiveNumber(
      env.PULSE_LOW_CONVERSION_MAX_PCT,
      DEFAULT_PULSE_THRESHOLDS.low_conversion_max_pct,
      100
    ),
    budget_warning_min_pct: parsePositiveNumber(
      env.PULSE_BUDGET_WARNING_MIN_PCT,
      DEFAULT_PULSE_THRESHOLDS.budget_warning_min_pct,
      100
    ),
  };
}

export interface CampaignPulseMetrics {
  views: number;
  redemptions: number;
  opt_ins: number;
  conversion_rate_pct: number;
  coupon_limit: number;
  coupon_utilization_pct: number;
  budget_limit: number;
  estimated_cost_per_redemption: number;
  estimated_budget_used: number;
  estimated_budget_utilization_pct: number;
  hours_since_activation: number;
}

export interface CampaignPulseEvaluation {
  alert_type: Exclude<AutomationAlertType, "ACTIVATION_REGISTERED">;
  should_alert: boolean;
  already_logged_in_window: boolean;
  idempotency_key: string;
  message: string;
  recommendation: string | null;
}

export function calculateCampaignPulseMetrics(params: {
  views: number;
  redemptions: number;
  optIns: number;
  couponLimit: number;
  budgetLimit: number;
  estimatedCostPerRedemption: number;
  activatedAtIso: string;
  now?: Date;
}): CampaignPulseMetrics {
  const safeFunnel = computeSafeFunnelMetrics({
    views: params.views,
    redemptions: params.redemptions,
    optIns: params.optIns,
  });

  const estimatedBudgetUsed = roundCurrency(
    safeFunnel.redemptions * params.estimatedCostPerRedemption
  );
  const estimatedBudgetUtilizationPct =
    params.budgetLimit > 0
      ? Math.min(
          100,
          roundCurrency((estimatedBudgetUsed / params.budgetLimit) * 100)
        )
      : 0;
  const couponUtilizationPct =
    params.couponLimit > 0
      ? Math.min(
          100,
          roundCurrency((safeFunnel.redemptions / params.couponLimit) * 100)
        )
      : 0;

  const nowMs = (params.now ?? new Date()).getTime();
  const activatedMs = Date.parse(params.activatedAtIso);
  const hoursSinceActivation = Number.isFinite(activatedMs)
    ? Math.max(0, roundCurrency((nowMs - activatedMs) / 3_600_000))
    : 0;

  return {
    views: safeFunnel.views,
    redemptions: safeFunnel.redemptions,
    opt_ins: safeFunnel.optIns,
    conversion_rate_pct: safeFunnel.conversionRatePct,
    coupon_limit: params.couponLimit,
    coupon_utilization_pct: couponUtilizationPct,
    budget_limit: roundCurrency(params.budgetLimit),
    estimated_cost_per_redemption: roundCurrency(
      params.estimatedCostPerRedemption
    ),
    estimated_budget_used: estimatedBudgetUsed,
    estimated_budget_utilization_pct: estimatedBudgetUtilizationPct,
    hours_since_activation: hoursSinceActivation,
  };
}

/**
 * Chave determinística diária (UTC) para evitar alertas duplicados do mesmo tipo
 * para a mesma campanha dentro da mesma janela.
 */
export function buildPulseIdempotencyKey(
  campaignId: string,
  alertType: AutomationAlertType,
  now: Date = new Date()
): string {
  const dayBucket = now.toISOString().slice(0, 10);
  return `pulse:${campaignId}:${alertType}:${dayBucket}`;
}

/**
 * Classificação determinística do Campaign Pulse.
 * Prioridade: BUDGET_WARNING > NO_REDEMPTIONS > LOW_CONVERSION > HEALTHY.
 */
export function evaluateCampaignPulse(params: {
  campaignId: string;
  metrics: CampaignPulseMetrics;
  thresholds?: PulseThresholds;
  existingIdempotencyKeys?: ReadonlySet<string>;
  now?: Date;
}): CampaignPulseEvaluation {
  const thresholds = params.thresholds ?? DEFAULT_PULSE_THRESHOLDS;
  const now = params.now ?? new Date();
  const { metrics } = params;

  let alertType: Exclude<AutomationAlertType, "ACTIVATION_REGISTERED"> =
    "HEALTHY";
  let message =
    "Campanha ativa dentro dos parâmetros esperados de conversão e orçamento estimado.";
  let recommendation: string | null = null;

  if (
    metrics.estimated_budget_utilization_pct >=
      thresholds.budget_warning_min_pct ||
    metrics.coupon_utilization_pct >= thresholds.budget_warning_min_pct
  ) {
    alertType = "BUDGET_WARNING";
    message = `Orçamento estimado em ${metrics.estimated_budget_utilization_pct}% (R$ ${metrics.estimated_budget_used.toFixed(2)} de R$ ${metrics.budget_limit.toFixed(2)}) e cupons em ${metrics.coupon_utilization_pct}% (${metrics.redemptions}/${metrics.coupon_limit}).`;
    recommendation =
      "Acompanhe o estoque de cupons no salão e avalie planejar a próxima rodada antes do esgotamento (aprovação humana obrigatória).";
  } else if (
    metrics.redemptions === 0 &&
    (metrics.hours_since_activation >= thresholds.no_redemptions_min_hours ||
      metrics.views >= thresholds.no_redemptions_min_views)
  ) {
    alertType = "NO_REDEMPTIONS";
    message = `Nenhum resgate registrado após ${metrics.hours_since_activation}h de ativação (${metrics.views} visualizações reais).`;
    recommendation =
      "Verifique a visibilidade do Display de Mesa com QR Code nos horários alvo e reforce o script de abordagem de 15s com a equipe.";
  } else if (
    metrics.views >= thresholds.low_conversion_min_views &&
    metrics.conversion_rate_pct < thresholds.low_conversion_max_pct
  ) {
    alertType = "LOW_CONVERSION";
    message = `Taxa de conversão em ${metrics.conversion_rate_pct}% (${metrics.redemptions} resgates em ${metrics.views} visualizações), abaixo da hipótese de ${thresholds.low_conversion_max_pct}%.`;
    recommendation =
      "Revise a clareza da oferta e da chamada (CTA) no Display de Mesa e confirme se a equipe está apresentando o benefício no momento certo.";
  }

  const idempotencyKey = buildPulseIdempotencyKey(
    params.campaignId,
    alertType,
    now
  );
  const alreadyLogged = Boolean(
    params.existingIdempotencyKeys?.has(idempotencyKey)
  );

  return {
    alert_type: alertType,
    should_alert: alertType !== "HEALTHY" && !alreadyLogged,
    already_logged_in_window: alreadyLogged,
    idempotency_key: idempotencyKey,
    message,
    recommendation,
  };
}

export type CampaignMonitorState = "active" | "inactive" | "not_found";

/**
 * Regra explícita de proteção do Data Store (índice operacional):
 * Um registro SÓ pode ser removido do Data Store quando a aplicação responder
 * HTTP 200 confirmando explicitamente que a campanha está inativa (paused/completed/draft).
 * Falhas de rede, timeout, 4xx ou 5xx NUNCA autorizam remoção.
 */
export function shouldUntrackFromOperationalIndex(response: {
  httpStatus: number | null;
  body?: {
    campaign_monitor_state?: CampaignMonitorState;
    should_untrack?: boolean;
  } | null;
}): boolean {
  if (response.httpStatus !== 200 || !response.body) {
    return false;
  }
  return (
    response.body.should_untrack === true &&
    response.body.campaign_monitor_state === "inactive"
  );
}
