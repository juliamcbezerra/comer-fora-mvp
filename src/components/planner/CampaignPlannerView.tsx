"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  Loader2,
  ShieldCheck,
} from "lucide-react";
import { validateCampaignConstraints } from "@/lib/business-rules";
import type {
  DeterministicMetrics,
  DiagnosticRecord,
  RecommendedPlan,
  Restaurant,
} from "@/lib/types";
import {
  cn,
  formatBRL,
  formatPct,
  PRIMARY_GOAL_LABELS,
  roundCurrency,
} from "@/lib/utils";
import { startTopProgress } from "@/components/TopProgressBar";
import { NavButton } from "@/components/ui/NavButton";

interface CampaignPlannerViewProps {
  restaurant: Restaurant;
  metrics: DeterministicMetrics;
  diagnostic: DiagnosticRecord | null;
  initialPlanIndex: number | null;
}

export function CampaignPlannerView({
  restaurant,
  metrics,
  diagnostic,
  initialPlanIndex,
}: CampaignPlannerViewProps) {
  const router = useRouter();
  const recommendedPlans = diagnostic?.ai_output.recommended_plans ?? [];
  const selectedInitialPlan: RecommendedPlan | null =
    initialPlanIndex !== null && recommendedPlans[initialPlanIndex]
      ? recommendedPlans[initialPlanIndex]
      : recommendedPlans[0] ?? null;

  const defaultCost =
    selectedInitialPlan?.suggested_cost_per_redemption ??
    roundCurrency(Math.max(1, metrics.max_safe_cost_per_redemption * 0.8));
  const defaultCoupons =
    selectedInitialPlan?.suggested_coupon_limit ??
    Math.max(1, Math.min(20, metrics.recommended_coupon_cap || 10));
  const defaultBudget = Math.min(
    restaurant.monthly_promo_budget,
    roundCurrency(defaultCost * defaultCoupons)
  );

  const [selectedPlanIdx, setSelectedPlanIdx] = useState<number | null>(
    selectedInitialPlan
      ? initialPlanIndex !== null && recommendedPlans[initialPlanIndex]
        ? initialPlanIndex
        : 0
      : null
  );
  const [objective, setObjective] = useState(
    selectedInitialPlan?.objective ?? restaurant.primary_goal
  );
  const [targetWindow, setTargetWindow] = useState(
    selectedInitialPlan?.target_window ??
      (restaurant.low_demand_slots.slice(0, 2).join(", ") ||
        restaurant.opening_hours)
  );
  const [estimatedCost, setEstimatedCost] = useState(String(defaultCost));
  const [couponLimit, setCouponLimit] = useState(String(defaultCoupons));
  const [budgetLimit, setBudgetLimit] = useState(String(defaultBudget));
  const [mechanicNotes, setMechanicNotes] = useState(
    selectedInitialPlan?.mechanic_summary ?? ""
  );

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const numericPlan = useMemo(
    () => ({
      budget_limit: Number(budgetLimit) || 0,
      estimated_cost_per_redemption: Number(estimatedCost) || 0,
      coupon_limit: Number(couponLimit) || 0,
    }),
    [budgetLimit, estimatedCost, couponLimit]
  );

  const validation = useMemo(
    () => validateCampaignConstraints(restaurant, numericPlan),
    [restaurant, numericPlan]
  );

  function applyRecommendedPlan(plan: RecommendedPlan, idx: number) {
    const committed = roundCurrency(
      plan.suggested_cost_per_redemption * plan.suggested_coupon_limit
    );
    setSelectedPlanIdx(idx);
    setObjective(plan.objective);
    setTargetWindow(plan.target_window);
    setEstimatedCost(String(plan.suggested_cost_per_redemption));
    setCouponLimit(String(plan.suggested_coupon_limit));
    setBudgetLimit(
      String(Math.min(restaurant.monthly_promo_budget, committed))
    );
    setMechanicNotes(plan.mechanic_summary);
    setSubmitError(null);
  }

  async function handleGenerateKit(e: React.FormEvent) {
    e.preventDefault();
    if (!validation.valid) {
      setSubmitError(
        validation.errors[0] ?? "Revise os limites financeiros antes de continuar."
      );
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const response = await fetch("/api/ai/generate-kit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          restaurant_id: restaurant.id,
          diagnostic_id: diagnostic?.id ?? null,
          objective,
          target_window: targetWindow,
          budget_limit: Number(budgetLimit),
          estimated_cost_per_redemption: Number(estimatedCost),
          coupon_limit: Number(couponLimit),
          mechanic_notes: mechanicNotes.trim() || undefined,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        setSubmitError(
          data.error ?? "Não foi possível criar os materiais da campanha."
        );
        return;
      }

      const fallbackFlag =
        data.ai_status === "fallback" ? "?fallback=1" : "";
      startTopProgress();
      router.push(`/campanha/${data.campaign.id}/revisao${fallbackFlag}`);
    } catch {
      setSubmitError(
        "Erro de conexão ao gerar os materiais da campanha. Tente novamente."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  const budgetUsagePct =
    restaurant.monthly_promo_budget > 0
      ? Math.min(
          100,
          (validation.maxCommittedBudget / restaurant.monthly_promo_budget) * 100
        )
      : 0;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <NavButton
        href={`/restaurante/${restaurant.id}/diagnostico`}
        loadingText="Voltando..."
        icon={<ArrowLeft className="h-3.5 w-3.5" />}
        className="inline-flex items-center gap-1.5 text-xs font-bold text-[#717171] transition-colors hover:text-[#EA1D2C]"
      >
        Voltar para o diagnóstico
      </NavButton>

      <div className="mt-4 grid gap-6 lg:grid-cols-12">
        {/* Formulário de Planejamento */}
        <section className="rounded-xl border border-neutral-200/80 bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04)] sm:p-8 lg:col-span-8">
          <div className="border-b border-neutral-100 pb-5">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-[#EA1D2C]">
              <ClipboardCheck className="h-3.5 w-3.5" />
              Planejamento de Campanha
            </span>
            <h1 className="mt-1.5 text-2xl font-extrabold text-[#1A1A1A]">
              Definir campanha para {restaurant.name}
            </h1>
            <p className="mt-1 text-xs text-[#717171] sm:text-sm">
              Ajuste orçamento, benefício por cliente e quantidade de cupons.
              Conferimos cada limite automaticamente antes de montar os
              materiais do salão.
            </p>
          </div>

          {recommendedPlans.length > 0 ? (
            <div className="mt-5">
              <p className="text-xs font-bold text-[#3F3E3E]">
                Carregar uma sugestão do diagnóstico:
              </p>
              <div className="mt-2 grid gap-2 sm:grid-cols-3">
                {recommendedPlans.map((plan, idx) => (
                  <button
                    key={`${plan.title}-${idx}`}
                    type="button"
                    onClick={() => applyRecommendedPlan(plan, idx)}
                    className={cn(
                      "cursor-pointer rounded-lg border p-3 text-left transition-all",
                      selectedPlanIdx === idx
                        ? "border-[#EA1D2C] bg-red-50/40 shadow-xs"
                        : "border-neutral-200 bg-neutral-50/70 hover:border-neutral-300 hover:bg-white hover:shadow-xs"
                    )}
                  >
                    <p className="text-[11px] font-bold text-[#EA1D2C]">
                      Opção {idx + 1}
                    </p>
                    <p className="mt-0.5 line-clamp-1 text-xs font-extrabold text-[#1A1A1A]">
                      {plan.title}
                    </p>
                    <p className="mt-1 text-[11px] text-[#717171]">
                      {formatBRL(plan.suggested_cost_per_redemption)} ×{" "}
                      {plan.suggested_coupon_limit} cupons
                    </p>
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {submitError ? (
            <div
              role="alert"
              className="mt-5 flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 p-3.5 text-xs text-[#9C050B] sm:text-sm"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#EA1D2C]" />
              <span>{submitError}</span>
            </div>
          ) : null}

          <form onSubmit={handleGenerateKit} className="mt-6 space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-[#3F3E3E]">
                  Objetivo da campanha *
                </label>
                <select
                  value={objective}
                  onChange={(e) => setObjective(e.target.value)}
                  className="w-full rounded-lg border border-neutral-300 bg-white px-3.5 py-2.5 text-sm text-[#1A1A1A] outline-none focus:border-[#EA1D2C] focus:ring-2 focus:ring-[#EA1D2C]/15"
                >
                  {Object.entries(PRIMARY_GOAL_LABELS).map(([val, label]) => (
                    <option key={val} value={val}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-[#3F3E3E]">
                  Dias e horários válidos *
                </label>
                <input
                  type="text"
                  value={targetWindow}
                  onChange={(e) => setTargetWindow(e.target.value)}
                  placeholder="Ex.: Terça e Quarta, 18h30 às 22h"
                  className="w-full rounded-lg border border-neutral-300 bg-white px-3.5 py-2.5 text-sm text-[#1A1A1A] outline-none focus:border-[#EA1D2C] focus:ring-2 focus:ring-[#EA1D2C]/15"
                  required
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-[#3F3E3E]">
                  Orçamento da campanha (R$) *
                </label>
                <input
                  type="number"
                  min="1"
                  step="any"
                  value={budgetLimit}
                  onChange={(e) => setBudgetLimit(e.target.value)}
                  className="w-full rounded-lg border border-neutral-300 bg-white px-3.5 py-2.5 text-sm font-bold text-[#1A1A1A] outline-none focus:border-[#EA1D2C] focus:ring-2 focus:ring-[#EA1D2C]/15"
                  required
                />
                <p className="text-[11px] text-[#717171]">
                  Orçamento mensal: {formatBRL(restaurant.monthly_promo_budget)}
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-[#3F3E3E]">
                  Benefício por cliente (R$) *
                </label>
                <input
                  type="number"
                  min="0.01"
                  step="any"
                  value={estimatedCost}
                  onChange={(e) => setEstimatedCost(e.target.value)}
                  className="w-full rounded-lg border border-neutral-300 bg-white px-3.5 py-2.5 text-sm font-bold text-[#1A1A1A] outline-none focus:border-[#EA1D2C] focus:ring-2 focus:ring-[#EA1D2C]/15"
                  required
                />
                <p className="text-[11px] text-[#717171]">
                  Limite seguro: {formatBRL(metrics.max_safe_cost_per_redemption)}
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-[#3F3E3E]">
                  Quantidade de cupons *
                </label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={couponLimit}
                  onChange={(e) => setCouponLimit(e.target.value)}
                  className="w-full rounded-lg border border-neutral-300 bg-white px-3.5 py-2.5 text-sm font-bold text-[#1A1A1A] outline-none focus:border-[#EA1D2C] focus:ring-2 focus:ring-[#EA1D2C]/15"
                  required
                />
                <p className="text-[11px] text-[#717171]">
                  Capacidade segura: até {metrics.operational_coupon_ceiling}
                </p>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-[#3F3E3E]">
                Detalhes da oferta desejada (opcional)
              </label>
              <textarea
                rows={3}
                value={mechanicNotes}
                onChange={(e) => setMechanicNotes(e.target.value)}
                placeholder="Ex.: Cortesia de entrada ou sobremesa da casa para mesas que ativarem o benefício pelo QR Code."
                className="w-full rounded-lg border border-neutral-300 bg-white px-3.5 py-2.5 text-sm text-[#1A1A1A] outline-none focus:border-[#EA1D2C] focus:ring-2 focus:ring-[#EA1D2C]/15"
              />
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-neutral-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-[#717171]">
                A campanha começa como <strong>rascunho</strong> para você
                revisar e aprovar antes de ativar no salão.
              </p>

              <button
                type="submit"
                disabled={!validation.valid || isSubmitting}
                className="inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-lg bg-[#EA1D2C] px-6 py-3 text-sm font-bold text-white shadow-xs transition-colors hover:bg-[#A02331] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Preparando materiais...
                  </>
                ) : (
                  <>
                    Criar materiais da campanha
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>
          </form>
        </section>

        {/* Painel Lateral de Proteção do Orçamento */}
        <aside className="lg:col-span-4">
          <div className="sticky top-28 rounded-xl border border-neutral-200/80 bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5 text-sm font-extrabold text-[#1A1A1A]">
                <ShieldCheck className="h-4 w-4 text-[#EA1D2C]" />
                Proteção do orçamento
              </span>
              <span
                className={cn(
                  "rounded-md px-2 py-0.5 text-[11px] font-bold",
                  validation.valid
                    ? "bg-emerald-50 text-emerald-800"
                    : "bg-red-50 text-[#9C050B]"
                )}
              >
                {validation.valid ? "Dentro dos limites" : "Ajuste necessário"}
              </span>
            </div>

            <div className="mt-4 space-y-3">
              <div className="rounded-lg border border-neutral-200/80 bg-neutral-50/70 p-4">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-[#717171]">
                    Investimento máximo previsto
                  </span>
                  <span className="font-extrabold text-[#1A1A1A]">
                    {formatBRL(validation.maxCommittedBudget)}
                  </span>
                </div>
                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-neutral-200">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all",
                      validation.valid ? "bg-[#EA1D2C]" : "bg-[#9C050B]"
                    )}
                    style={{ width: `${Math.min(100, budgetUsagePct)}%` }}
                  />
                </div>
                <p className="mt-1.5 text-[11px] text-[#717171]">
                  {formatPct(budgetUsagePct, 0)} do orçamento mensal (
                  {formatBRL(restaurant.monthly_promo_budget)})
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-neutral-200/80 p-3.5">
                  <p className="text-[11px] font-semibold text-[#717171]">
                    Impacto no ticket
                  </p>
                  <p className="mt-1 text-lg font-extrabold text-[#1A1A1A]">
                    {formatPct(validation.effectiveDiscountPct)}
                  </p>
                  <p className="text-[10px] text-[#717171]">
                    Limite: {Math.min(restaurant.max_discount_pct, 30)}%
                  </p>
                </div>

                <div className="rounded-lg border border-neutral-200/80 p-3.5">
                  <p className="text-[11px] font-semibold text-[#717171]">
                    Volume no salão
                  </p>
                  <p className="mt-1 text-lg font-extrabold text-[#1A1A1A]">
                    {numericPlan.coupon_limit}/{validation.operationalCouponCeiling}
                  </p>
                  <p className="text-[10px] text-[#717171]">
                    {restaurant.seating_capacity} lugares
                  </p>
                </div>
              </div>

              {validation.errors.length > 0 ? (
                <div className="space-y-2 rounded-lg border border-red-200 bg-red-50 p-3.5">
                  <p className="flex items-center gap-1.5 text-xs font-bold text-[#9C050B]">
                    <AlertCircle className="h-4 w-4 text-[#EA1D2C]" />
                    Ajuste os valores para continuar
                  </p>
                  <ul className="list-disc space-y-1 pl-4 text-xs text-[#9C050B]">
                    {validation.errors.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {validation.warnings.length > 0 ? (
                <div className="space-y-2 rounded-lg border border-amber-200 bg-amber-50 p-3.5">
                  <p className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
                    <AlertTriangle className="h-4 w-4 text-amber-700" />
                    Pontos de atenção
                  </p>
                  <ul className="list-disc space-y-1 pl-4 text-xs text-amber-900">
                    {validation.warnings.map((warn, i) => (
                      <li key={i}>{warn}</li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {validation.valid && validation.warnings.length === 0 ? (
                <div className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3.5 text-xs text-emerald-900">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                  <span>
                    Tudo certo: orçamento, margem por cliente e quantidade de
                    cupons estão seguros para o seu salão.
                  </span>
                </div>
              ) : null}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
