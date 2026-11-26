"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  Loader2,
  RefreshCw,
  ShieldAlert,
  Target,
  Ticket,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import type {
  DeterministicMetrics,
  DiagnosticRecord,
  PerformanceSummaryInput,
  Restaurant,
} from "@/lib/types";
import {
  cn,
  formatBRL,
  PRIMARY_GOAL_LABELS,
  SALON_PROMOTION_LABELS,
} from "@/lib/utils";
import { NavButton, SECONDARY_BUTTON_CLASS } from "@/components/ui/NavButton";

interface DiagnosticViewProps {
  restaurant: Restaurant;
  metrics: DeterministicMetrics;
  initialDiagnostic: DiagnosticRecord | null;
  performanceSummary: PerformanceSummaryInput;
  autoRun: boolean;
}

function formatTimeHHMM(isoDate: string): string {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function renderHighlightedSummary(text: string) {
  // Captura formato monetário brasileiro completo (ex.: R$ 3.000,00, R$ 100,00, R$ 72) e percentuais (50%, 55,6%)
  const tokenPattern =
    /(R\$\s?\d{1,3}(?:\.\d{3})*(?:,\d{2})?|\d+(?:[.,]\d+)?%)/g;
  const exactTokenPattern =
    /^(R\$\s?\d{1,3}(?:\.\d{3})*(?:,\d{2})?|\d+(?:[.,]\d+)?%)$/;

  const parts = text.split(tokenPattern);
  return parts.map((part, idx) => {
    if (exactTokenPattern.test(part)) {
      return (
        <span
          key={idx}
          className="font-semibold text-[#111111] underline decoration-[#EA1D2C]/35 decoration-2 underline-offset-4"
        >
          {part}
        </span>
      );
    }
    return <span key={idx}>{part}</span>;
  });
}

export function DiagnosticView({
  restaurant,
  metrics,
  initialDiagnostic,
  performanceSummary,
  autoRun,
}: DiagnosticViewProps) {
  const router = useRouter();
  const [diagnostic, setDiagnostic] = useState<DiagnosticRecord | null>(
    initialDiagnostic
  );
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastRunMeta, setLastRunMeta] = useState<{
    aiStatus: "success" | "fallback";
    fallbackReason: string | null;
    latencyMs: number;
    model: string;
    guardrailsAdjustedCount: number;
  } | null>(null);

  const autoRunTriggered = useRef(false);

  useEffect(() => {
    setDiagnostic(initialDiagnostic);
  }, [initialDiagnostic]);

  async function handleGenerateDiagnostic() {
    setIsGenerating(true);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/ai/diagnose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({
          restaurant_id: restaurant.id,
          include_performance: true,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        setErrorMessage(
          data.error ?? "Não foi possível gerar o diagnóstico agora."
        );
        return;
      }

      setDiagnostic(data.diagnostic);
      setLastRunMeta({
        aiStatus: data.ai_status,
        fallbackReason: data.fallback_reason,
        latencyMs: data.latency_ms,
        model: data.model,
        guardrailsAdjustedCount: data.guardrails_adjusted_count ?? 0,
      });
      router.refresh();
    } catch {
      setErrorMessage(
        "Falha de conexão ao gerar o diagnóstico. Tente novamente."
      );
    } finally {
      setIsGenerating(false);
    }
  }

  useEffect(() => {
    if (autoRun && !initialDiagnostic && !autoRunTriggered.current) {
      autoRunTriggered.current = true;
      void handleGenerateDiagnostic();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRun, initialDiagnostic]);

  const isFallbackRecord =
    lastRunMeta?.aiStatus === "fallback" ||
    Boolean(diagnostic?.prompt_version.includes("fallback"));
  const isSeedDemoRecord =
    !lastRunMeta && Boolean(diagnostic?.prompt_version.startsWith("seed-demo"));

  const updatedTime = diagnostic ? formatTimeHHMM(diagnostic.created_at) : "";
  const netEstimatedCapture = Math.max(
    0,
    metrics.potential_monthly_capture -
      metrics.recommended_coupon_cap * metrics.max_safe_cost_per_redemption
  );
  const readinessBarColor =
    metrics.readiness_score >= 75
      ? "bg-emerald-600"
      : metrics.readiness_score >= 45
        ? "bg-amber-500"
        : "bg-[#EA1D2C]";

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <NavButton
          href="/"
          loadingText="Voltando..."
          icon={<ArrowLeft className="h-3.5 w-3.5" />}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-[#717171] transition-colors hover:text-[#EA1D2C]"
        >
          Voltar para perfil do restaurante
        </NavButton>

        <div className="flex flex-wrap items-center gap-2">
          {performanceSummary.total_campaigns > 0 ? (
            <NavButton
              href={`/restaurante/${restaurant.id}/resultados`}
              loadingText="Abrindo..."
              icon={<BarChart3 className="h-3.5 w-3.5 text-[#EA1D2C]" />}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-bold shadow-[0_1px_2px_rgba(0,0,0,0.03)]",
                SECONDARY_BUTTON_CLASS
              )}
            >
              Ver resultados ({performanceSummary.total_redemptions} resgates)
            </NavButton>
          ) : null}

          <NavButton
            href={`/restaurante/${restaurant.id}/planejar${
              diagnostic ? `?diagnosticId=${diagnostic.id}` : ""
            }`}
            loadingText="Abrindo..."
            icon={<ClipboardCheck className="h-3.5 w-3.5" />}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-bold shadow-[0_1px_2px_rgba(0,0,0,0.03)]",
              SECONDARY_BUTTON_CLASS
            )}
          >
            Criar plano manual
          </NavButton>
        </div>
      </div>

      {/* Cabeçalho do Restaurante + KPIs do Topo com Hierarquia Visual */}
      <section className="mt-4 rounded-xl border border-neutral-200/80 bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04)] sm:p-8">
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wide text-[#EA1D2C]">
                Diagnóstico do Salão
              </span>
              {performanceSummary.total_campaigns > 0 ? (
                <span className="inline-flex items-center rounded-md bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800 border border-emerald-200/70">
                  Baseado nos últimos {performanceSummary.total_redemptions}{" "}
                  resgates
                </span>
              ) : null}
            </div>
            <h1 className="mt-1.5 text-2xl font-extrabold text-[#1A1A1A] sm:text-3xl">
              {restaurant.name}
            </h1>
            <p className="mt-1 text-xs text-[#717171] sm:text-sm">
              {restaurant.category} • {restaurant.neighborhood},{" "}
              {restaurant.city} •{" "}
              {SALON_PROMOTION_LABELS[restaurant.current_salon_promotion] ??
                restaurant.current_salon_promotion}{" "}
              • Objetivo:{" "}
              <strong className="text-[#3F3E3E]">
                {PRIMARY_GOAL_LABELS[restaurant.primary_goal] ??
                  restaurant.primary_goal}
              </strong>
            </p>
          </div>

          <button
            type="button"
            disabled={isGenerating}
            onClick={() => void handleGenerateDiagnostic()}
            className="inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-lg bg-[#EA1D2C] px-5 py-3 text-sm font-bold text-white shadow-xs transition-colors hover:bg-[#A02331] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Analisando seu salão...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4" />
                {diagnostic ? "Atualizar diagnóstico" : "Gerar diagnóstico"}
              </>
            )}
          </button>
        </div>

        {/* 5 KPIs com Identidade e Profundidade */}
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {/* Card 1: Prontidão com barra de progresso */}
          <div className="rounded-lg border border-neutral-200/80 bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
            <p className="text-[11px] font-semibold text-[#717171]">
              Prontidão para o Comer Fora
            </p>
            <p className="mt-1 text-xl font-extrabold text-[#1A1A1A]">
              {metrics.readiness_score}
              <span className="text-xs font-semibold text-[#717171]">/100</span>
            </p>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-neutral-200">
              <div
                className={cn(
                  "h-full rounded-full transition-all",
                  readinessBarColor
                )}
                style={{ width: `${metrics.readiness_score}%` }}
              />
            </div>
          </div>

          {/* Card 2: Benefício seguro */}
          <div className="rounded-lg border border-neutral-200/80 bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
            <p className="flex items-center gap-1.5 text-[11px] font-semibold text-[#717171]">
              <Wallet className="h-3.5 w-3.5 text-neutral-400" />
              Benefício seguro/cliente
            </p>
            <p className="mt-1 text-xl font-extrabold text-[#1A1A1A]">
              {formatBRL(metrics.max_safe_cost_per_redemption)}
            </p>
            <p className="mt-0.5 text-[11px] text-[#717171]">
              Até {Math.min(restaurant.max_discount_pct, 30)}% do ticket médio
            </p>
          </div>

          {/* Card 3: Limite de cupons */}
          <div className="rounded-lg border border-neutral-200/80 bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
            <p className="flex items-center gap-1.5 text-[11px] font-semibold text-[#717171]">
              <Ticket className="h-3.5 w-3.5 text-neutral-400" />
              Cupons no benefício máximo
            </p>
            <p className="mt-1 text-xl font-extrabold text-[#1A1A1A]">
              {metrics.recommended_coupon_cap} / mês
            </p>
            <p className="mt-0.5 text-[11px] text-[#717171]">
              Sobe se o benefício for menor (capacidade: até{" "}
              {metrics.operational_coupon_ceiling}/mês)
            </p>
          </div>

          {/* Card 4: Lugares livres */}
          <div className="rounded-lg border border-neutral-200/80 bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
            <p className="flex items-center gap-1.5 text-[11px] font-semibold text-[#717171]">
              <Users className="h-3.5 w-3.5 text-neutral-400" />
              Lugares livres/mês
            </p>
            <p className="mt-1 text-xl font-extrabold text-[#1A1A1A]">
              {metrics.idle_capacity_estimate}
            </p>
            <p className="mt-0.5 text-[11px] text-[#717171]">
              {restaurant.low_demand_slots.length} horários tranquilos
            </p>
          </div>

          {/* Card 5: Oportunidade financeira (destaque verde esmeralda) */}
          <div className="rounded-lg border border-emerald-200/80 bg-emerald-50/40 p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
            <p className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-800">
              <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />
              Receita bruta estimada (demo)
            </p>
            <p className="mt-1 text-xl font-extrabold text-emerald-700">
              {formatBRL(metrics.potential_monthly_capture)}
            </p>
            <p className="mt-0.5 text-[11px] text-emerald-800/80">
              Líquida após incentivos: {formatBRL(netEstimatedCapture)} •
              projeção demonstrativa (não incremental)
            </p>
          </div>
        </div>
      </section>

      {errorMessage ? (
        <div
          role="alert"
          className="mt-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-[#9C050B]"
        >
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-[#EA1D2C]" />
          <div>
            <p className="font-bold">Não foi possível atualizar a análise</p>
            <p className="mt-1 text-xs sm:text-sm">{errorMessage}</p>
          </div>
        </div>
      ) : null}

      {/* Aviso transparente quando em modo de contingência */}
      {diagnostic && isFallbackRecord ? (
        <div
          role="status"
          className="mt-6 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-[#3F3E3E]"
        >
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
          <div>
            <p className="font-bold text-[#1A1A1A]">
              Análise gerada em modo de contingência
            </p>
            <p className="mt-1 text-xs sm:text-sm">
              O serviço de análise inteligente esteve temporariamente ocupado no
              momento da consulta. Exibimos uma recomendação padrão respeitando
              todos os limites do seu orçamento — detalhes técnicos disponíveis
              em{" "}
              <Link
                href={`/restaurante/${restaurant.id}/resultados?tab=ecosystem`}
                className="font-semibold text-[#9C050B] underline"
              >
                Visão Ecossistema &amp; Auditoria IA
              </Link>
              .
            </p>
            <button
              type="button"
              disabled={isGenerating}
              onClick={() => void handleGenerateDiagnostic()}
              className="mt-2.5 inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-bold text-amber-900 transition-colors hover:bg-amber-100/60 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isGenerating ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5" />
              )}
              Tentar nova análise
            </button>
          </div>
        </div>
      ) : null}

      {/* Estado de carregamento inicial ou vazio */}
      {!diagnostic ? (
        <section className="mt-6 rounded-xl border border-dashed border-neutral-300 bg-white p-10 text-center">
          {isGenerating ? (
            <div className="mx-auto max-w-md space-y-3">
              <Loader2 className="mx-auto h-8 w-8 animate-spin text-[#EA1D2C]" />
              <h2 className="text-lg font-extrabold text-[#1A1A1A]">
                Preparando o diagnóstico do seu salão
              </h2>
              <p className="text-xs text-[#717171] sm:text-sm">
                Avaliando horários tranquilos, divulgação atual e margem segura
                para sugerir 3 planos prontos para o seu orçamento...
              </p>
            </div>
          ) : (
            <div className="mx-auto max-w-md space-y-3">
              <FileText className="mx-auto h-8 w-8 text-[#EA1D2C]" />
              <h2 className="text-lg font-extrabold text-[#1A1A1A]">
                Pronto para gerar o diagnóstico de {restaurant.name}
              </h2>
              <p className="text-xs text-[#717171] sm:text-sm">
                Clique abaixo para receber uma leitura estratégica personalizada
                e 3 sugestões de campanhas dentro do seu orçamento.
              </p>
              <button
                type="button"
                disabled={isGenerating}
                onClick={() => void handleGenerateDiagnostic()}
                className="mt-2 inline-flex cursor-pointer items-center gap-2 rounded-lg bg-[#EA1D2C] px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-[#A02331] disabled:cursor-not-allowed disabled:opacity-60"
              >
                Gerar diagnóstico agora
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </section>
      ) : (
        <div className="mt-6 space-y-6">
          {/* Faixa Editorial Aberta: Leitura Estratégica do Salão */}
          <section className="my-7 border-l-[3px] border-[#EA1D2C] bg-transparent py-1 pl-5 md:pl-6">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[#EA1D2C]">
                Leitura estratégica do seu salão
              </span>
              <span aria-hidden="true" className="text-xs text-neutral-400">
                •
              </span>
              <span className="inline-flex items-center gap-1.5 text-xs text-neutral-500">
                <span
                  aria-hidden="true"
                  className={cn(
                    "inline-block h-2 w-2 rounded-full",
                    isFallbackRecord
                      ? "bg-amber-500"
                      : isSeedDemoRecord
                        ? "bg-neutral-400"
                        : "bg-emerald-500"
                  )}
                />
                {isFallbackRecord
                  ? `Análise em modo de contingência${updatedTime ? ` às ${updatedTime}` : ""}`
                  : isSeedDemoRecord
                    ? "Diagnóstico de exemplo"
                    : `Análise atualizada${updatedTime ? ` às ${updatedTime}` : ""}`}
              </span>
            </div>

            <p className="mt-2 max-w-4xl text-lg font-normal leading-relaxed text-[#222222] md:text-[19px]">
              {renderHighlightedSummary(diagnostic.ai_output.executive_summary)}
            </p>
          </section>

          {/* Pontos de Atenção (Risco/Perda) vs. Maiores Oportunidades (Crescimento Esmeralda) */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Bloco Esquerdo: Pontos de atenção */}
            <section className="rounded-xl border border-neutral-200/80 bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
              <div className="flex items-center gap-3">
                <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-50 text-amber-700">
                  <ShieldAlert className="h-4 w-4" />
                </span>
                <div>
                  <h2 className="text-base font-extrabold text-[#1A1A1A] sm:text-lg">
                    Pontos de atenção no salão
                  </h2>
                  <p className="text-xs text-[#717171]">
                    Onde você está deixando faturamento ou clientes na mesa
                  </p>
                </div>
              </div>

              <div className="mt-5 space-y-3">
                {diagnostic.ai_output.bottlenecks.map((item, idx) => {
                  const borderAccent =
                    item.impact === "alto"
                      ? "border-l-[#EA1D2C]"
                      : item.impact === "medio"
                        ? "border-l-amber-600"
                        : "border-l-neutral-400";

                  return (
                    <div
                      key={`${item.title}-${idx}`}
                      className={cn(
                        "rounded-lg border border-neutral-200/80 border-l-4 bg-[#FFFDFB] p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)]",
                        borderAccent
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-sm font-bold text-[#1A1A1A]">
                          {item.title}
                        </h3>
                        <span
                          className={cn(
                            "shrink-0 rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
                            item.impact === "alto"
                              ? "bg-red-50 text-[#9C050B] border border-red-200/70"
                              : item.impact === "medio"
                                ? "bg-amber-50 text-amber-800 border border-amber-200/70"
                                : "bg-neutral-100 text-[#3F3E3E]"
                          )}
                        >
                          Impacto {item.impact}
                        </span>
                      </div>
                      <p className="mt-1.5 text-xs leading-relaxed text-[#3F3E3E]">
                        {item.explanation}
                      </p>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Bloco Direito: Maiores oportunidades (Verde Esmeralda) */}
            <section className="rounded-xl border border-neutral-200/80 bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
              <div className="flex items-center gap-3">
                <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                  <TrendingUp className="h-4 w-4" />
                </span>
                <div>
                  <h2 className="text-base font-extrabold text-[#1A1A1A] sm:text-lg">
                    Maiores oportunidades
                  </h2>
                  <p className="text-xs text-[#717171]">
                    Alavancas priorizadas para crescer com margem segura
                  </p>
                </div>
              </div>

              <div className="mt-5 space-y-3">
                {[...diagnostic.ai_output.opportunities]
                  .sort((a, b) => a.priority - b.priority)
                  .map((opp, idx) => (
                    <div
                      key={`${opp.title}-${idx}`}
                      className="rounded-lg border border-neutral-200/80 border-l-4 border-l-emerald-500 bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,0.03)] transition hover:shadow-sm"
                    >
                      <div className="flex items-start gap-3">
                        <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-emerald-200 bg-emerald-50 text-xs font-bold text-emerald-700">
                          {opp.priority}
                        </span>
                        <div className="min-w-0 flex-1">
                          <h3 className="text-sm font-bold text-[#1A1A1A]">
                            {opp.title}
                          </h3>
                          <p className="mt-1 text-xs leading-relaxed text-[#3F3E3E]">
                            {opp.rationale}
                          </p>
                          <div className="mt-2.5 flex items-center gap-2 rounded-lg bg-emerald-50/80 px-3 py-2 text-xs font-medium text-emerald-900">
                            <Target className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                            <span>Resultado esperado: {opp.expected_lever}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </section>
          </div>

          {/* 3 Planos Recomendados com Hierarquia (Opção 1 Destacada + Opções 2 e 3 Secundárias) */}
          <section>
            <div className="mb-4">
              <h2 className="text-lg font-extrabold text-[#1A1A1A] sm:text-xl">
                3 planos recomendados para o seu salão
              </h2>
              <p className="text-xs text-[#717171] sm:text-sm">
                Todas as sugestões respeitam o seu orçamento mensal e a margem
                do seu ticket médio. Escolha um plano para personalizar.
              </p>
            </div>

            <div className="grid gap-5 lg:grid-cols-3">
              {diagnostic.ai_output.recommended_plans.map((plan, index) => {
                const isPrimary = index === 0;
                const maxBudget =
                  plan.suggested_cost_per_redemption *
                  plan.suggested_coupon_limit;
                return (
                  <article
                    key={`${plan.title}-${index}`}
                    className={cn(
                      "flex flex-col justify-between rounded-xl border bg-white p-5 transition-all",
                      isPrimary
                        ? "border-[#EA1D2C]/40 shadow-md ring-1 ring-[#EA1D2C]/10"
                        : "border-neutral-200/80 shadow-[0_1px_2px_rgba(0,0,0,0.04)] hover:border-neutral-300 hover:shadow-md"
                    )}
                  >
                    <div>
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        {isPrimary ? (
                          <span className="rounded-md bg-red-50 px-2.5 py-0.5 text-[11px] font-bold text-[#EA1D2C] border border-red-200/70">
                            Recomendado para seu objetivo
                          </span>
                        ) : (
                          <span className="rounded-md bg-neutral-100 px-2.5 py-0.5 text-[11px] font-bold text-[#3F3E3E]">
                            Opção {index + 1} •{" "}
                            {PRIMARY_GOAL_LABELS[plan.objective] ??
                              plan.objective}
                          </span>
                        )}

                        {plan.guardrail_adjusted ? (
                          <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                            <CheckCircle2 className="h-3 w-3" />
                            Ajustado à sua margem
                          </span>
                        ) : null}
                      </div>

                      <h3 className="mt-3 text-base font-extrabold text-[#1A1A1A]">
                        {plan.title}
                      </h3>
                      <p className="mt-1 text-xs font-semibold text-[#EA1D2C]">
                        Horário sugerido: {plan.target_window}
                      </p>

                      <p className="mt-2.5 text-xs leading-relaxed text-[#3F3E3E]">
                        {plan.mechanic_summary}
                      </p>

                      <div className="mt-4 grid grid-cols-3 divide-x divide-neutral-200 rounded-lg border border-neutral-200/70 bg-neutral-50 py-3 text-center">
                        <div className="px-2">
                          <p className="text-[10px] font-semibold text-[#717171]">
                            Benefício
                          </p>
                          <p className="mt-0.5 text-xs font-extrabold text-[#1A1A1A]">
                            {formatBRL(plan.suggested_cost_per_redemption)}
                          </p>
                        </div>
                        <div className="px-2">
                          <p className="text-[10px] font-semibold text-[#717171]">
                            Cupons
                          </p>
                          <p className="mt-0.5 text-xs font-extrabold text-[#1A1A1A]">
                            {plan.suggested_coupon_limit}
                          </p>
                        </div>
                        <div className="px-2">
                          <p className="text-[10px] font-semibold text-[#717171]">
                            Teto total
                          </p>
                          <p className="mt-0.5 text-xs font-extrabold text-[#1A1A1A]">
                            {formatBRL(maxBudget)}
                          </p>
                        </div>
                      </div>

                      <p className="mt-3 text-[11px] leading-relaxed text-[#717171]">
                        <strong className="text-[#3F3E3E]">
                          Por que faz sentido:
                        </strong>{" "}
                        {plan.why_it_fits}
                      </p>
                    </div>

                    <NavButton
                      href={`/restaurante/${restaurant.id}/planejar?diagnosticId=${diagnostic.id}&planIndex=${index}`}
                      loadingText="Abrindo plano..."
                      trailingIcon={<ArrowRight className="h-4 w-4" />}
                      className={cn(
                        "mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-xs font-bold transition-colors",
                        isPrimary
                          ? "bg-[#EA1D2C] text-white shadow-xs hover:bg-[#A02331]"
                          : "border border-[#EA1D2C] bg-white text-[#EA1D2C] hover:bg-[#EA1D2C] hover:text-white"
                      )}
                    >
                      Planejar esta campanha
                    </NavButton>
                  </article>
                );
              })}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
