import { describe, expect, it } from "vitest";
import {
  calculateDeterministicMetrics,
  enforcePlanGuardrails,
  validateCampaignConstraints,
} from "./business-rules";
import { diagnosticAiOutputSchema, restaurantInputSchema } from "./schemas";
import type { RecommendedPlan, RestaurantProfileInput } from "./types";

const tacoEBrasa: RestaurantProfileInput = {
  avg_ticket: 72,
  seating_capacity: 48,
  low_demand_slots: [
    "Segunda almoço",
    "Terça almoço",
    "Quarta almoço",
    "Quinta almoço",
  ],
  current_salon_promotion: "apenas_redes_sociais",
  uses_totem: false,
  monthly_promo_budget: 500,
  max_discount_pct: 25,
};

const bravaOsteria: RestaurantProfileInput = {
  avg_ticket: 115,
  seating_capacity: 60,
  low_demand_slots: ["Terça jantar", "Quarta jantar"],
  current_salon_promotion: "nenhuma",
  uses_totem: false,
  monthly_promo_budget: 800,
  max_discount_pct: 20,
};

describe("calculateDeterministicMetrics", () => {
  it("calcula métricas determinísticas exatas para o perfil Taco & Brasa", () => {
    const metrics = calculateDeterministicMetrics(tacoEBrasa);

    expect(metrics.readiness_score).toBe(55);
    expect(metrics.max_safe_cost_per_redemption).toBe(18);
    expect(metrics.operational_coupon_ceiling).toBe(115);
    expect(metrics.recommended_coupon_cap).toBe(27);
    expect(metrics.idle_capacity_estimate).toBe(384);
    expect(metrics.potential_monthly_capture).toBe(1944);
  });

  it("limita o desconto máximo de segurança a 30% mesmo se o perfil informar valor maior", () => {
    const metrics = calculateDeterministicMetrics({
      ...bravaOsteria,
      avg_ticket: 100,
      max_discount_pct: 45,
      monthly_promo_budget: 900,
    });

    expect(metrics.max_safe_cost_per_redemption).toBe(30);
    expect(metrics.recommended_coupon_cap).toBe(30);
  });

  it("limita recommended_coupon_cap pela capacidade operacional quando o orçamento é muito alto", () => {
    const smallCafe: RestaurantProfileInput = {
      avg_ticket: 50,
      seating_capacity: 10,
      low_demand_slots: ["Terça tarde"],
      current_salon_promotion: "display_mesa_ativo",
      uses_totem: true,
      monthly_promo_budget: 5000,
      max_discount_pct: 20,
    };

    const metrics = calculateDeterministicMetrics(smallCafe);

    // 10 * 0.6 * 4 = 24 cupons operacionais vs floor(5000 / 10) = 500 por orçamento
    expect(metrics.operational_coupon_ceiling).toBe(24);
    expect(metrics.recommended_coupon_cap).toBe(24);
    expect(metrics.readiness_score).toBe(88);
  });
});

describe("validateCampaignConstraints", () => {
  it("aprova um plano dentro dos limites de orçamento, margem e capacidade", () => {
    const result = validateCampaignConstraints(tacoEBrasa, {
      budget_limit: 405,
      estimated_cost_per_redemption: 15,
      coupon_limit: 27,
    });

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.maxCommittedBudget).toBe(405);
  });

  it("bloqueia plano cujo comprometimento excede budget_limit ou orçamento mensal", () => {
    const result = validateCampaignConstraints(tacoEBrasa, {
      budget_limit: 600,
      estimated_cost_per_redemption: 18,
      coupon_limit: 40,
    });

    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("mensal"))).toBe(true);
    expect(result.errors.some((e) => e.includes("comprometimento máximo"))).toBe(true);
  });

  it("bloqueia plano cujo custo por resgate ultrapassa a margem segura", () => {
    const result = validateCampaignConstraints(bravaOsteria, {
      budget_limit: 500,
      estimated_cost_per_redemption: 30, // máximo seguro é 20% de 115 = R$ 23
      coupon_limit: 15,
    });

    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("teto seguro de margem"))).toBe(true);
  });

  it("bloqueia plano que excede o teto operacional de assentos", () => {
    const result = validateCampaignConstraints(
      { ...tacoEBrasa, seating_capacity: 15, monthly_promo_budget: 2000 },
      {
        budget_limit: 1500,
        estimated_cost_per_redemption: 10,
        coupon_limit: 50, // teto operacional: floor(15 * 0.6 * 4) = 36
      }
    );

    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("teto operacional"))).toBe(true);
  });

  it("emite alerta (sem bloquear) quando compromete >= 90% do orçamento mensal", () => {
    const result = validateCampaignConstraints(tacoEBrasa, {
      budget_limit: 480,
      estimated_cost_per_redemption: 16,
      coupon_limit: 30, // 480 / 500 = 96%
    });

    expect(result.valid).toBe(true);
    expect(result.warnings.length).toBeGreaterThan(0);
  });
});

describe("enforcePlanGuardrails", () => {
  it("corrige automaticamente plano gerado pela IA que extrapola margem e orçamento", () => {
    const unsafeAiPlan: RecommendedPlan = {
      objective: "preencher_horarios_ociosos",
      title: "Desconto agressivo",
      target_window: "Terça jantar",
      mechanic_summary: "Benefício acima da margem.",
      suggested_cost_per_redemption: 45, // excede R$ 23
      suggested_coupon_limit: 200, // excede orçamento e capacidade
      why_it_fits: "Sugestão original da IA.",
    };

    const adjusted = enforcePlanGuardrails(bravaOsteria, unsafeAiPlan);

    expect(adjusted.guardrail_adjusted).toBe(true);
    expect(adjusted.suggested_cost_per_redemption).toBe(23);
    // floor(800 / 23) = 34 (menor que teto operacional 144)
    expect(adjusted.suggested_coupon_limit).toBe(34);
  });
});

describe("Zod schemas", () => {
  it("rejeita cadastro de restaurante com campos vazios ou desconto acima de 30%", () => {
    const parsed = restaurantInputSchema.safeParse({
      name: "",
      category: "Italiana",
      neighborhood: "Pinheiros",
      city: "São Paulo",
      avg_ticket: -10,
      seating_capacity: 2,
      opening_hours: "12h",
      low_demand_slots: [],
      current_salon_promotion: "nenhuma",
      uses_totem: false,
      monthly_promo_budget: 20,
      max_discount_pct: 45,
      primary_goal: "preencher_horarios_ociosos",
    });

    expect(parsed.success).toBe(false);
  });

  it("rejeita resposta malformada do Agente 1 (menos de 3 gargalos)", () => {
    const parsed = diagnosticAiOutputSchema.safeParse({
      executive_summary: "Resumo curto mas válido para o teste de contrato.",
      bottlenecks: [{ title: "Gargalo único", impact: "alto", explanation: "Apenas um item." }],
      opportunities: [],
      recommended_plans: [],
    });

    expect(parsed.success).toBe(false);
  });
});
