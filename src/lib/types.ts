export type SalonPromotionLevel =
  | "nenhuma"
  | "apenas_redes_sociais"
  | "placa_simples_caixa"
  | "display_mesa_ativo";

export type PrimaryGoal =
  | "preencher_horarios_ociosos"
  | "aumentar_divulgacao_salao"
  | "gerar_recorrencia_giftback"
  | "aumentar_ticket_medio";

export type CampaignStatus = "draft" | "active" | "paused" | "completed";
export type CampaignEventType = "view" | "redemption" | "recurrence_opt_in";
export type CampaignEventSource = "qr_scan" | "simulator" | "demo_seed";
export type AgentName = "diagnostic_strategist" | "creative_activator";
export type AiRunStatus = "success" | "fallback" | "error";

export interface Restaurant {
  id: string;
  session_id: string | null;
  name: string;
  category: string;
  neighborhood: string;
  city: string;
  avg_ticket: number;
  seating_capacity: number;
  opening_hours: string;
  low_demand_slots: string[];
  current_salon_promotion: string;
  uses_totem: boolean;
  monthly_promo_budget: number;
  max_discount_pct: number;
  primary_goal: string;
  is_demo_seed: boolean;
  onboarding_completed: boolean;
  created_at: string;
}

export type RestaurantProfileInput = Pick<
  Restaurant,
  | "avg_ticket"
  | "seating_capacity"
  | "low_demand_slots"
  | "current_salon_promotion"
  | "uses_totem"
  | "monthly_promo_budget"
  | "max_discount_pct"
>;

export interface DeterministicMetrics {
  readiness_score: number;
  max_safe_cost_per_redemption: number;
  recommended_coupon_cap: number;
  operational_coupon_ceiling: number;
  idle_capacity_estimate: number;
  potential_monthly_capture: number;
}

export interface DiagnosticBottleneck {
  title: string;
  impact: "alto" | "medio" | "baixo";
  explanation: string;
}

export interface DiagnosticOpportunity {
  title: string;
  priority: 1 | 2 | 3;
  rationale: string;
  expected_lever: string;
}

export interface RecommendedPlan {
  objective: string;
  title: string;
  target_window: string;
  mechanic_summary: string;
  suggested_cost_per_redemption: number;
  suggested_coupon_limit: number;
  why_it_fits: string;
  guardrail_adjusted?: boolean;
}

export interface DiagnosticAiOutput {
  executive_summary: string;
  bottlenecks: DiagnosticBottleneck[];
  opportunities: DiagnosticOpportunity[];
  recommended_plans: RecommendedPlan[];
}

export interface DiagnosticRecord {
  id: string;
  restaurant_id: string;
  session_id: string | null;
  readiness_score: number;
  deterministic_metrics: DeterministicMetrics;
  ai_output: DiagnosticAiOutput;
  prompt_version: string;
  created_at: string;
}

export interface CampaignPlanInput {
  objective: string;
  target_window: string;
  budget_limit: number;
  estimated_cost_per_redemption: number;
  coupon_limit: number;
  mechanic_notes?: string;
}

export interface CampaignConstraintValidation {
  valid: boolean;
  errors: string[];
  warnings: string[];
  maxCommittedBudget: number;
  effectiveDiscountPct: number;
  maxSafeCostPerRedemption: number;
  operationalCouponCeiling: number;
}

export interface CreativeKitOutput {
  title: string;
  offer_description: string;
  promo_copy: string;
  table_tent_headline: string;
  table_tent_body: string;
  staff_script: string;
  cta_text: string;
  recurrence_hook: string;
}

export interface CampaignRecord {
  id: string;
  restaurant_id: string;
  diagnostic_id: string | null;
  session_id: string | null;
  objective: string;
  title: string;
  offer_description: string;
  estimated_cost_per_redemption: number;
  budget_limit: number;
  coupon_limit: number;
  target_window: string;
  promo_copy: string;
  table_tent_headline: string;
  table_tent_body: string;
  staff_script: string;
  cta_text: string;
  recurrence_hook: string;
  status: CampaignStatus;
  human_approved: boolean;
  approved_at: string | null;
  created_at: string;
}

export interface CampaignEventRecord {
  id: string;
  campaign_id: string;
  restaurant_id: string;
  session_id: string | null;
  event_type: CampaignEventType;
  coupon_code: string | null;
  source: CampaignEventSource;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface AiRunRecord {
  id: string;
  restaurant_id: string | null;
  session_id: string | null;
  agent_name: AgentName;
  model: string;
  prompt_version: string;
  latency_ms: number;
  status: AiRunStatus;
  error_message: string | null;
  created_at: string;
}

export interface PerformanceSummaryInput {
  total_campaigns: number;
  active_campaigns: number;
  total_views: number;
  total_redemptions: number;
  total_opt_ins: number;
  conversion_rate_pct: number;
  recurrence_opt_in_rate_pct: number;
  budget_used: number;
}
