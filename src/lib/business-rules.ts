import type {
  CampaignConstraintValidation,
  CampaignPlanInput,
  DeterministicMetrics,
  RecommendedPlan,
  RestaurantProfileInput,
} from "./types";
import { formatBRL, roundCurrency } from "./utils";

export const MAX_HARD_DISCOUNT_PCT = 30;
export const OPERATIONAL_CAPACITY_FACTOR = 0.6;
export const MONTHLY_WEEKS_ESTIMATE = 4;

function getPromotionReadinessPoints(promotion: string): number {
  const normalized = promotion.trim().toLowerCase();
  if (!normalized || normalized === "nenhuma") return 0;
  if (normalized === "apenas_redes_sociais") return 15;
  if (normalized === "placa_simples_caixa") return 25;
  if (normalized === "display_mesa_ativo") return 35;
  return 15;
}

function getSlotDefinitionPoints(slots: string[]): number {
  const validSlots = slots.filter((slot) => slot.trim().length > 0).length;
  if (validSlots === 0) return 0;
  if (validSlots === 1) return 8;
  if (validSlots === 2) return 14;
  return 20;
}

function getBudgetReadinessPoints(monthlyBudget: number): number {
  if (monthlyBudget <= 0) return 0;
  if (monthlyBudget < 250) return 10;
  if (monthlyBudget < 500) return 15;
  if (monthlyBudget < 1000) return 20;
  return 25;
}

export function calculateOperationalCouponCeiling(seatingCapacity: number): number {
  if (!Number.isFinite(seatingCapacity) || seatingCapacity <= 0) return 0;
  return Math.max(
    1,
    Math.floor(seatingCapacity * OPERATIONAL_CAPACITY_FACTOR * MONTHLY_WEEKS_ESTIMATE)
  );
}

export function calculateMaxSafeCostPerRedemption(
  avgTicket: number,
  maxDiscountPct: number
): number {
  if (!Number.isFinite(avgTicket) || avgTicket <= 0) return 0;
  if (!Number.isFinite(maxDiscountPct) || maxDiscountPct <= 0) return 0;
  const cappedDiscountPct = Math.min(maxDiscountPct, MAX_HARD_DISCOUNT_PCT);
  return roundCurrency(avgTicket * (cappedDiscountPct / 100));
}

export function calculateDeterministicMetrics(
  restaurant: RestaurantProfileInput
): DeterministicMetrics {
  const promotionPoints = getPromotionReadinessPoints(
    restaurant.current_salon_promotion
  );
  const totemPoints = restaurant.uses_totem ? 20 : 0;
  const slotPoints = getSlotDefinitionPoints(restaurant.low_demand_slots);
  const budgetPoints = getBudgetReadinessPoints(restaurant.monthly_promo_budget);

  const readiness_score = Math.max(
    0,
    Math.min(100, promotionPoints + totemPoints + slotPoints + budgetPoints)
  );

  const max_safe_cost_per_redemption = calculateMaxSafeCostPerRedemption(
    restaurant.avg_ticket,
    restaurant.max_discount_pct
  );

  const operational_coupon_ceiling = calculateOperationalCouponCeiling(
    restaurant.seating_capacity
  );

  const budgetCouponCap =
    max_safe_cost_per_redemption > 0 && restaurant.monthly_promo_budget > 0
      ? Math.floor(restaurant.monthly_promo_budget / max_safe_cost_per_redemption)
      : 0;

  const recommended_coupon_cap = Math.max(
    0,
    Math.min(budgetCouponCap, operational_coupon_ceiling)
  );

  const activeSlots = Math.max(
    restaurant.low_demand_slots.filter((s) => s.trim().length > 0).length,
    1
  );
  const idle_capacity_estimate = Math.max(
    0,
    Math.round(restaurant.seating_capacity * 0.5 * activeSlots * MONTHLY_WEEKS_ESTIMATE)
  );

  const potential_monthly_capture = roundCurrency(
    recommended_coupon_cap * Math.max(restaurant.avg_ticket, 0)
  );

  return {
    readiness_score,
    max_safe_cost_per_redemption,
    recommended_coupon_cap,
    operational_coupon_ceiling,
    idle_capacity_estimate,
    potential_monthly_capture,
  };
}

export function validateCampaignConstraints(
  restaurant: RestaurantProfileInput,
  plan: Pick<
    CampaignPlanInput,
    "budget_limit" | "estimated_cost_per_redemption" | "coupon_limit"
  >
): CampaignConstraintValidation {
  const errors: string[] = [];
  const warnings: string[] = [];

  const maxSafeCostPerRedemption = calculateMaxSafeCostPerRedemption(
    restaurant.avg_ticket,
    restaurant.max_discount_pct
  );
  const operationalCouponCeiling = calculateOperationalCouponCeiling(
    restaurant.seating_capacity
  );

  const maxCommittedBudget = roundCurrency(
    Math.max(0, plan.coupon_limit) * Math.max(0, plan.estimated_cost_per_redemption)
  );

  const effectiveDiscountPct =
    restaurant.avg_ticket > 0
      ? roundCurrency((plan.estimated_cost_per_redemption / restaurant.avg_ticket) * 100)
      : 0;

  if (!Number.isFinite(plan.budget_limit) || plan.budget_limit <= 0) {
    errors.push("O limite de orçamento da campanha deve ser maior que R$ 0,00.");
  }

  if (
    !Number.isFinite(plan.estimated_cost_per_redemption) ||
    plan.estimated_cost_per_redemption <= 0
  ) {
    errors.push("O custo estimado por resgate deve ser maior que R$ 0,00.");
  }

  if (!Number.isInteger(plan.coupon_limit) || plan.coupon_limit < 1) {
    errors.push("O limite de cupons deve ser um número inteiro maior ou igual a 1.");
  }

  if (plan.budget_limit > restaurant.monthly_promo_budget + 0.005) {
    errors.push(
      `O orçamento da campanha (${formatBRL(plan.budget_limit)}) excede o orçamento promocional mensal do restaurante (${formatBRL(restaurant.monthly_promo_budget)}).`
    );
  }

  if (maxCommittedBudget > plan.budget_limit + 0.005) {
    errors.push(
      `O comprometimento máximo (${plan.coupon_limit} cupons × ${formatBRL(plan.estimated_cost_per_redemption)} = ${formatBRL(maxCommittedBudget)}) excede o orçamento limite da campanha (${formatBRL(plan.budget_limit)}).`
    );
  }

  if (plan.estimated_cost_per_redemption > maxSafeCostPerRedemption + 0.005) {
    const cappedPct = Math.min(restaurant.max_discount_pct, MAX_HARD_DISCOUNT_PCT);
    errors.push(
      `O custo por resgate (${formatBRL(plan.estimated_cost_per_redemption)}) ultrapassa o teto seguro de margem (${formatBRL(maxSafeCostPerRedemption)}, equivalente a ${cappedPct}% do ticket médio).`
    );
  }

  if (plan.coupon_limit > operationalCouponCeiling) {
    errors.push(
      `O limite de ${plan.coupon_limit} cupons supera o teto operacional recomendado para ${restaurant.seating_capacity} lugares (${operationalCouponCeiling} cupons/mês).`
    );
  }

  if (errors.length === 0) {
    if (
      restaurant.monthly_promo_budget > 0 &&
      maxCommittedBudget / restaurant.monthly_promo_budget >= 0.9
    ) {
      warnings.push(
        "Esta campanha compromete 90% ou mais do orçamento promocional mensal. Considere reservar margem para uma segunda rodada."
      );
    }

    if (effectiveDiscountPct > 25) {
      warnings.push(
        `O benefício representa ${effectiveDiscountPct.toFixed(1)}% do ticket médio. Prefira cortesias de alto valor percebido e menor custo de insumo.`
      );
    }

    if (
      operationalCouponCeiling > 0 &&
      plan.coupon_limit / operationalCouponCeiling >= 0.8
    ) {
      warnings.push(
        "O volume de cupons está próximo do teto operacional do salão. Monitore a fila nas janelas de ativação."
      );
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    maxCommittedBudget,
    effectiveDiscountPct,
    maxSafeCostPerRedemption,
    operationalCouponCeiling,
  };
}

/**
 * Pós-validação determinística aplicada aos planos sugeridos pelo Agente 1.
 * Impede que recomendações geradas pela IA violem guardrails financeiros ou operacionais.
 */
export function enforcePlanGuardrails(
  restaurant: RestaurantProfileInput,
  plan: RecommendedPlan
): RecommendedPlan {
  const maxSafeCost = calculateMaxSafeCostPerRedemption(
    restaurant.avg_ticket,
    restaurant.max_discount_pct
  );
  const operationalCeiling = calculateOperationalCouponCeiling(
    restaurant.seating_capacity
  );

  let adjusted = false;

  const fallbackSafeCost = maxSafeCost > 0 ? maxSafeCost : 1;
  let safeCost = roundCurrency(plan.suggested_cost_per_redemption);
  if (!Number.isFinite(safeCost) || safeCost <= 0) {
    safeCost = roundCurrency(Math.max(1, fallbackSafeCost * 0.75));
    adjusted = true;
  } else if (safeCost > fallbackSafeCost) {
    safeCost = fallbackSafeCost;
    adjusted = true;
  }

  const maxCouponsByBudget =
    safeCost > 0 && restaurant.monthly_promo_budget > 0
      ? Math.max(1, Math.floor(restaurant.monthly_promo_budget / safeCost))
      : 1;
  const maxAllowedCoupons = Math.max(
    1,
    Math.min(maxCouponsByBudget, operationalCeiling)
  );

  let safeCoupons = Math.round(plan.suggested_coupon_limit);
  if (!Number.isFinite(safeCoupons) || safeCoupons < 1) {
    safeCoupons = Math.min(10, maxAllowedCoupons);
    adjusted = true;
  } else if (safeCoupons > maxAllowedCoupons) {
    safeCoupons = maxAllowedCoupons;
    adjusted = true;
  }

  return {
    ...plan,
    suggested_cost_per_redemption: safeCost,
    suggested_coupon_limit: safeCoupons,
    guardrail_adjusted: adjusted,
  };
}
