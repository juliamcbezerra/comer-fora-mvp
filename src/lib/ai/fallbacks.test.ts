import { describe, expect, it } from "vitest";
import { calculateDeterministicMetrics, validateCampaignConstraints } from "@/lib/business-rules";
import { creativeKitOutputSchema, diagnosticAiOutputSchema } from "@/lib/schemas";
import type { Restaurant } from "@/lib/types";
import { buildCreativeKitFallback, buildDiagnosticFallback } from "./fallbacks";

const sampleRestaurant: Restaurant = {
  id: "11111111-1111-4111-8111-111111111101",
  session_id: null,
  name: "Restaurante Cantina Tradicional do Bairro com Nome Bem Extenso",
  category: "Italiana",
  neighborhood: "Pinheiros",
  city: "São Paulo",
  avg_ticket: 115,
  seating_capacity: 60,
  opening_hours: "Ter a Dom, 12h às 23h",
  low_demand_slots: ["Terça jantar", "Quarta jantar"],
  current_salon_promotion: "nenhuma",
  uses_totem: false,
  monthly_promo_budget: 800,
  max_discount_pct: 20,
  primary_goal: "preencher_horarios_ociosos",
  is_demo_seed: true,
  onboarding_completed: true,
  created_at: new Date().toISOString(),
};

describe("AI Deterministic Fallbacks", () => {
  it("gera fallback do Agente 1 compatível com diagnosticAiOutputSchema e guardrails", () => {
    const metrics = calculateDeterministicMetrics(sampleRestaurant);
    const fallback = buildDiagnosticFallback(sampleRestaurant, metrics);

    const parsed = diagnosticAiOutputSchema.safeParse(fallback);
    expect(parsed.success).toBe(true);

    for (const plan of fallback.recommended_plans) {
      const validation = validateCampaignConstraints(sampleRestaurant, {
        budget_limit: sampleRestaurant.monthly_promo_budget,
        estimated_cost_per_redemption: plan.suggested_cost_per_redemption,
        coupon_limit: plan.suggested_coupon_limit,
      });
      expect(validation.valid).toBe(true);
    }
  });

  it("gera fallback do Agente 2 compatível com creativeKitOutputSchema e limites 60/160 chars", () => {
    const kit = buildCreativeKitFallback(sampleRestaurant, {
      objective: "preencher_horarios_ociosos",
      target_window: "Terça e Quarta jantar (18h30 às 22h30)",
      budget_limit: 500,
      estimated_cost_per_redemption: 20,
      coupon_limit: 25,
    });

    const parsed = creativeKitOutputSchema.safeParse(kit);
    expect(parsed.success).toBe(true);
    expect(kit.table_tent_headline.length).toBeLessThanOrEqual(60);
    expect(kit.table_tent_body.length).toBeLessThanOrEqual(160);
  });
});
