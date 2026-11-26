import {
  calculateDeterministicMetrics,
  enforcePlanGuardrails,
  validateCampaignConstraints,
} from "@/lib/business-rules";
import {
  creativeKitOutputSchema,
  diagnosticAiOutputSchema,
} from "@/lib/schemas";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import type {
  AgentName,
  AiRunStatus,
  CampaignConstraintValidation,
  CampaignPlanInput,
  CampaignRecord,
  CreativeKitOutput,
  DiagnosticAiOutput,
  DiagnosticRecord,
  PerformanceSummaryInput,
  Restaurant,
} from "@/lib/types";
import {
  creativeKitResponseSchema,
  diagnosticResponseSchema,
  GEMINI_MODEL,
  generateStructuredJson,
} from "./client";
import {
  buildCreativeKitFallback,
  buildDiagnosticFallback,
} from "./fallbacks";
import {
  buildCreativeUserPrompt,
  buildDiagnosticUserPrompt,
  CREATIVE_PROMPT_VERSION,
  CREATIVE_SYSTEM_INSTRUCTION,
  DIAGNOSTIC_PROMPT_VERSION,
  DIAGNOSTIC_SYSTEM_INSTRUCTION,
} from "./prompts";

function clampStr(value: unknown, maxLen: number): string {
  const s = typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
  if (s.length <= maxLen) return s;
  return `${s.slice(0, maxLen - 1).trimEnd()}…`;
}

function normalizeDiagnosticCandidate(raw: unknown): unknown {
  if (!raw || typeof raw !== "object") return raw;
  const obj = raw as Record<string, unknown>;

  const normalizeImpact = (val: unknown): string => {
    const clean = String(val ?? "")
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
    if (clean === "alto" || clean === "medio" || clean === "baixo") return clean;
    return "medio";
  };

  const bottlenecks = Array.isArray(obj.bottlenecks)
    ? obj.bottlenecks.slice(0, 3).map((b) => {
        const item = (b ?? {}) as Record<string, unknown>;
        return {
          title: clampStr(item.title, 120),
          impact: normalizeImpact(item.impact),
          explanation: clampStr(item.explanation, 320),
        };
      })
    : obj.bottlenecks;

  const opportunities = Array.isArray(obj.opportunities)
    ? obj.opportunities.slice(0, 3).map((o, idx) => {
        const item = (o ?? {}) as Record<string, unknown>;
        const numPrio = Number(item.priority);
        const safePrio =
          numPrio === 1 || numPrio === 2 || numPrio === 3 ? numPrio : idx + 1;
        return {
          title: clampStr(item.title, 120),
          priority: safePrio,
          rationale: clampStr(item.rationale, 320),
          expected_lever: clampStr(item.expected_lever, 180),
        };
      })
    : obj.opportunities;

  const recommended_plans = Array.isArray(obj.recommended_plans)
    ? obj.recommended_plans.slice(0, 3).map((p) => {
        const item = (p ?? {}) as Record<string, unknown>;
        return {
          objective: clampStr(item.objective, 120),
          title: clampStr(item.title, 120),
          target_window: clampStr(item.target_window, 120),
          mechanic_summary: clampStr(item.mechanic_summary, 320),
          suggested_cost_per_redemption: Number(
            item.suggested_cost_per_redemption
          ),
          suggested_coupon_limit: Math.max(
            1,
            Math.round(Number(item.suggested_coupon_limit))
          ),
          why_it_fits: clampStr(item.why_it_fits, 300),
        };
      })
    : obj.recommended_plans;

  return {
    executive_summary: clampStr(obj.executive_summary, 520),
    bottlenecks,
    opportunities,
    recommended_plans,
  };
}

function normalizeCreativeCandidate(raw: unknown): unknown {
  if (!raw || typeof raw !== "object") return raw;
  const obj = raw as Record<string, unknown>;
  return {
    title: clampStr(obj.title, 120),
    offer_description: clampStr(obj.offer_description, 360),
    promo_copy: clampStr(obj.promo_copy, 700),
    table_tent_headline: clampStr(obj.table_tent_headline, 60),
    table_tent_body: clampStr(obj.table_tent_body, 160),
    staff_script: clampStr(obj.staff_script, 450),
    cta_text: clampStr(obj.cta_text, 80),
    recurrence_hook: clampStr(obj.recurrence_hook, 300),
  };
}

function sanitizeErrorMessage(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err);
  // Nunca vazar eventuais strings de chave na mensagem de erro persistida
  return raw
    .replace(/AIza[0-9A-Za-z_-]{20,}/g, "[REDACTED_KEY]")
    .replace(/AQ\.[0-9A-Za-z._-]{20,}/g, "[REDACTED_KEY]")
    .replace(/gsk_[0-9A-Za-z_-]{20,}/g, "[REDACTED_KEY]")
    .replace(/github_pat_[0-9A-Za-z_]{20,}/g, "[REDACTED_KEY]")
    .replace(/ghp_[0-9A-Za-z]{20,}/g, "[REDACTED_KEY]")
    .replace(/sk-or-v1-[0-9A-Za-z]{20,}/g, "[REDACTED_KEY]")
    .replace(/csk-[0-9A-Za-z_-]{20,}/g, "[REDACTED_KEY]")
    .slice(0, 300);
}

async function logAiRun(params: {
  restaurantId: string;
  sessionId: string | null;
  agentName: AgentName;
  model: string;
  promptVersion: string;
  latencyMs: number;
  status: AiRunStatus;
  errorMessage: string | null;
}) {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("ai_runs").insert({
    restaurant_id: params.restaurantId,
    session_id: params.sessionId,
    agent_name: params.agentName,
    model: params.model,
    prompt_version: params.promptVersion,
    latency_ms: Math.max(0, Math.round(params.latencyMs)),
    status: params.status,
    error_message: params.errorMessage,
  });

  if (error) {
    console.error("[ai_runs] Falha ao registrar observabilidade:", error.message);
  }
}

export interface DiagnosticOrchestrationResult {
  diagnostic: DiagnosticRecord;
  ai_status: "success" | "fallback";
  fallback_reason: string | null;
  latency_ms: number;
  model: string;
  guardrails_adjusted_count: number;
}

export async function runDiagnosticAgent(params: {
  restaurant: Restaurant;
  sessionId: string | null;
  performanceSummary?: PerformanceSummaryInput | null;
}): Promise<DiagnosticOrchestrationResult> {
  const { restaurant, sessionId, performanceSummary } = params;
  const metrics = calculateDeterministicMetrics(restaurant);

  const startedAt = Date.now();
  let aiStatus: "success" | "fallback" = "success";
  let fallbackReason: string | null = null;
  let latencyMs = 0;
  let usedModel: string = GEMINI_MODEL;
  let aiOutput: DiagnosticAiOutput;

  try {
    const response = await generateStructuredJson({
      systemInstruction: DIAGNOSTIC_SYSTEM_INSTRUCTION,
      userPrompt: buildDiagnosticUserPrompt(
        restaurant,
        metrics,
        performanceSummary
      ),
      responseSchema: diagnosticResponseSchema,
      temperature: 0.2,
      validateParsed: (candidate) =>
        diagnosticAiOutputSchema.safeParse(
          normalizeDiagnosticCandidate(candidate)
        ).success,
    });

    latencyMs = response.latencyMs;
    usedModel = response.model;

    const validated = diagnosticAiOutputSchema.safeParse(
      normalizeDiagnosticCandidate(response.parsed)
    );
    if (!validated.success) {
      throw new Error(
        `Saída JSON do Agente 1 fora do contrato Zod: ${validated.error.issues
          .map((i) => `${i.path.join(".")}: ${i.message}`)
          .slice(0, 3)
          .join("; ")}`
      );
    }

    aiOutput = validated.data;
  } catch (err) {
    latencyMs = Date.now() - startedAt;
    aiStatus = "fallback";
    fallbackReason = sanitizeErrorMessage(err);
    aiOutput = buildDiagnosticFallback(restaurant, metrics, performanceSummary);
  }

  // Pós-validação determinística obrigatória em todos os 3 planos recomendados
  const safePlans = aiOutput.recommended_plans.map((plan) =>
    enforcePlanGuardrails(restaurant, plan)
  );
  const guardrailsAdjustedCount = safePlans.filter(
    (p) => p.guardrail_adjusted
  ).length;

  const finalOutput: DiagnosticAiOutput = {
    ...aiOutput,
    recommended_plans: safePlans,
  };

  const persistedPromptVersion =
    aiStatus === "fallback"
      ? `${DIAGNOSTIC_PROMPT_VERSION}-fallback`
      : DIAGNOSTIC_PROMPT_VERSION;

  const supabase = getSupabaseAdmin();
  const { data: savedDiag, error: diagError } = await supabase
    .from("diagnostics")
    .insert({
      restaurant_id: restaurant.id,
      session_id: sessionId,
      readiness_score: metrics.readiness_score,
      deterministic_metrics: metrics,
      ai_output: finalOutput,
      prompt_version: persistedPromptVersion,
    })
    .select("*")
    .single();

  if (diagError || !savedDiag) {
    throw new Error(
      `Falha ao salvar diagnóstico no Supabase: ${diagError?.message ?? "erro desconhecido"}`
    );
  }

  await logAiRun({
    restaurantId: restaurant.id,
    sessionId,
    agentName: "diagnostic_strategist",
    model: usedModel,
    promptVersion: DIAGNOSTIC_PROMPT_VERSION,
    latencyMs,
    status: aiStatus,
    errorMessage: fallbackReason,
  });

  const diagnostic: DiagnosticRecord = {
    id: String(savedDiag.id),
    restaurant_id: String(savedDiag.restaurant_id),
    session_id: savedDiag.session_id ? String(savedDiag.session_id) : null,
    readiness_score: Number(savedDiag.readiness_score),
    deterministic_metrics: savedDiag.deterministic_metrics as DiagnosticRecord["deterministic_metrics"],
    ai_output: savedDiag.ai_output as DiagnosticAiOutput,
    prompt_version: String(savedDiag.prompt_version),
    created_at: String(savedDiag.created_at),
  };

  return {
    diagnostic,
    ai_status: aiStatus,
    fallback_reason: fallbackReason,
    latency_ms: latencyMs,
    model: usedModel,
    guardrails_adjusted_count: guardrailsAdjustedCount,
  };
}

export interface CreativeOrchestrationResult {
  campaign: CampaignRecord;
  validation: CampaignConstraintValidation;
  ai_status: "success" | "fallback";
  fallback_reason: string | null;
  latency_ms: number;
  model: string;
  prompt_version: string;
}

export class ConstraintViolationError extends Error {
  validation: CampaignConstraintValidation;

  constructor(validation: CampaignConstraintValidation) {
    super(validation.errors[0] ?? "Plano viola os guardrails determinísticos.");
    this.name = "ConstraintViolationError";
    this.validation = validation;
  }
}

export async function runCreativeActivatorAgent(params: {
  restaurant: Restaurant;
  diagnosticId: string | null;
  plan: CampaignPlanInput;
  sessionId: string | null;
}): Promise<CreativeOrchestrationResult> {
  const { restaurant, diagnosticId, plan, sessionId } = params;

  // Validação determinística obrigatória ANTES de acionar a IA
  const validation = validateCampaignConstraints(restaurant, plan);
  if (!validation.valid) {
    throw new ConstraintViolationError(validation);
  }

  const startedAt = Date.now();
  let aiStatus: "success" | "fallback" = "success";
  let fallbackReason: string | null = null;
  let latencyMs = 0;
  let usedModel: string = GEMINI_MODEL;
  let kit: CreativeKitOutput;

  try {
    const response = await generateStructuredJson({
      systemInstruction: CREATIVE_SYSTEM_INSTRUCTION,
      userPrompt: buildCreativeUserPrompt(restaurant, plan),
      responseSchema: creativeKitResponseSchema,
      temperature: 0.5,
      validateParsed: (candidate) =>
        creativeKitOutputSchema.safeParse(
          normalizeCreativeCandidate(candidate)
        ).success,
    });

    latencyMs = response.latencyMs;
    usedModel = response.model;

    const validated = creativeKitOutputSchema.safeParse(
      normalizeCreativeCandidate(response.parsed)
    );
    if (!validated.success) {
      throw new Error(
        `Saída JSON do Agente 2 fora do contrato Zod: ${validated.error.issues
          .map((i) => `${i.path.join(".")}: ${i.message}`)
          .slice(0, 3)
          .join("; ")}`
      );
    }

    kit = validated.data;
  } catch (err) {
    latencyMs = Date.now() - startedAt;
    aiStatus = "fallback";
    fallbackReason = sanitizeErrorMessage(err);
    kit = buildCreativeKitFallback(restaurant, plan);
  }

  const supabase = getSupabaseAdmin();
  const { data: savedCampaign, error: campError } = await supabase
    .from("campaigns")
    .insert({
      restaurant_id: restaurant.id,
      diagnostic_id: diagnosticId,
      session_id: sessionId,
      objective: plan.objective,
      title: kit.title,
      offer_description: kit.offer_description,
      estimated_cost_per_redemption: plan.estimated_cost_per_redemption,
      budget_limit: plan.budget_limit,
      coupon_limit: plan.coupon_limit,
      target_window: plan.target_window,
      promo_copy: kit.promo_copy,
      table_tent_headline: kit.table_tent_headline,
      table_tent_body: kit.table_tent_body,
      staff_script: kit.staff_script,
      cta_text: kit.cta_text,
      recurrence_hook: kit.recurrence_hook,
      status: "draft",
      human_approved: false,
      approved_at: null,
    })
    .select("*")
    .single();

  if (campError || !savedCampaign) {
    throw new Error(
      `Falha ao salvar campanha no Supabase: ${campError?.message ?? "erro desconhecido"}`
    );
  }

  await logAiRun({
    restaurantId: restaurant.id,
    sessionId,
    agentName: "creative_activator",
    model: usedModel,
    promptVersion: CREATIVE_PROMPT_VERSION,
    latencyMs,
    status: aiStatus,
    errorMessage: fallbackReason,
  });

  const campaign: CampaignRecord = {
    id: String(savedCampaign.id),
    restaurant_id: String(savedCampaign.restaurant_id),
    diagnostic_id: savedCampaign.diagnostic_id
      ? String(savedCampaign.diagnostic_id)
      : null,
    session_id: savedCampaign.session_id ? String(savedCampaign.session_id) : null,
    objective: String(savedCampaign.objective),
    title: String(savedCampaign.title),
    offer_description: String(savedCampaign.offer_description),
    estimated_cost_per_redemption: Number(
      savedCampaign.estimated_cost_per_redemption
    ),
    budget_limit: Number(savedCampaign.budget_limit),
    coupon_limit: Number(savedCampaign.coupon_limit),
    target_window: String(savedCampaign.target_window),
    promo_copy: String(savedCampaign.promo_copy),
    table_tent_headline: String(savedCampaign.table_tent_headline),
    table_tent_body: String(savedCampaign.table_tent_body),
    staff_script: String(savedCampaign.staff_script),
    cta_text: String(savedCampaign.cta_text),
    recurrence_hook: String(savedCampaign.recurrence_hook),
    status: savedCampaign.status as CampaignRecord["status"],
    human_approved: Boolean(savedCampaign.human_approved),
    approved_at: savedCampaign.approved_at
      ? String(savedCampaign.approved_at)
      : null,
    created_at: String(savedCampaign.created_at),
  };

  return {
    campaign,
    validation,
    ai_status: aiStatus,
    fallback_reason: fallbackReason,
    latency_ms: latencyMs,
    model: usedModel,
    prompt_version:
      aiStatus === "fallback"
        ? `${CREATIVE_PROMPT_VERSION}-fallback`
        : CREATIVE_PROMPT_VERSION,
  };
}
