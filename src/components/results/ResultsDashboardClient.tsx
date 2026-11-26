"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Activity,
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  ClipboardCheck,
  Cpu,
  Globe,
  Loader2,
  QrCode,
  RefreshCw,
  Smartphone,
  TrendingUp,
} from "lucide-react";
import type { RestaurantResultsPayload } from "@/lib/repositories/results";
import type { Restaurant } from "@/lib/types";
import { cn, formatBRL, formatPct, PRIMARY_GOAL_LABELS } from "@/lib/utils";
import { startTopProgress } from "@/components/TopProgressBar";
import { NavButton, SECONDARY_BUTTON_CLASS } from "@/components/ui/NavButton";

const FUNNEL_COLORS = ["#EA1D2C", "#A02331", "#FFB761"];

interface ResultsDashboardClientProps {
  restaurant: Restaurant;
  initialData: RestaurantResultsPayload;
  initialTab?: "restaurant" | "ecosystem";
}

export function ResultsDashboardClient({
  restaurant,
  initialData,
  initialTab = "restaurant",
}: ResultsDashboardClientProps) {
  const router = useRouter();
  const [data, setData] = useState<RestaurantResultsPayload>(initialData);
  const [activeTab, setActiveTab] = useState<"restaurant" | "ecosystem">(
    initialTab
  );
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isRunningNextLoop, setIsRunningNextLoop] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  async function handleRefresh() {
    setIsRefreshing(true);
    setActionError(null);
    try {
      const res = await fetch(`/api/restaurants/${restaurant.id}/results`, {
        cache: "no-store",
      });
      const payload = await res.json();
      if (!res.ok) {
        setActionError(
          payload.error ?? "Não foi possível atualizar os indicadores."
        );
        return;
      }
      setData({
        kpis: payload.kpis,
        funnel: payload.funnel,
        campaigns: payload.campaigns,
        ecosystem: payload.ecosystem,
        ai_runs: payload.ai_runs,
      });
    } catch {
      setActionError("Erro de conexão ao atualizar os resultados.");
    } finally {
      setIsRefreshing(false);
    }
  }

  async function handleGenerateNextCampaignLoop() {
    setIsRunningNextLoop(true);
    setActionError(null);
    try {
      const res = await fetch("/api/ai/diagnose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          restaurant_id: restaurant.id,
          include_performance: true,
        }),
      });
      const payload = await res.json();
      if (!res.ok) {
        setActionError(
          payload.error ??
            "Não foi possível gerar a próxima recomendação agora."
        );
        return;
      }
      startTopProgress();
      router.push(`/restaurante/${restaurant.id}/diagnostico`);
    } catch {
      setActionError(
        "Erro de conexão ao gerar a próxima campanha. Tente novamente."
      );
    } finally {
      setIsRunningNextLoop(false);
    }
  }

  const budgetUtilizationPct =
    data.kpis.budget_ceiling > 0
      ? Math.min(100, (data.kpis.budget_used / data.kpis.budget_ceiling) * 100)
      : 0;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      {/* Topo de navegação */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <NavButton
          href={`/restaurante/${restaurant.id}/diagnostico`}
          loadingText="Voltando..."
          icon={<ArrowLeft className="h-3.5 w-3.5" />}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-[#717171] transition-colors hover:text-[#EA1D2C]"
        >
          Voltar para diagnóstico
        </NavButton>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={isRefreshing}
            onClick={() => void handleRefresh()}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-bold disabled:cursor-not-allowed disabled:opacity-60",
              SECONDARY_BUTTON_CLASS
            )}
          >
            <RefreshCw
              className={cn("h-3.5 w-3.5", isRefreshing && "animate-spin")}
            />
            Atualizar números
          </button>

          <NavButton
            href={`/restaurante/${restaurant.id}/planejar`}
            loadingText="Abrindo..."
            icon={<ClipboardCheck className="h-3.5 w-3.5" />}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#EA1D2C] px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-[#A02331]"
          >
            Nova campanha
          </NavButton>
        </div>
      </div>

      {/* Cabeçalho + Seletor de Abas */}
      <section className="mt-4 rounded-xl border border-neutral-200/80 bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04)] sm:p-8">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
          <div>
            <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-[#EA1D2C]">
              <BarChart3 className="h-3.5 w-3.5" />
              Resultados no Salão
            </span>
            <h1 className="mt-1.5 text-2xl font-extrabold text-[#1A1A1A] sm:text-3xl">
              {restaurant.name}
            </h1>
            <p className="mt-1 text-xs text-[#717171] sm:text-sm">
              {restaurant.category} • {restaurant.neighborhood},{" "}
              {restaurant.city} — Acompanhe acessos, resgates e interesse de
              retorno em tempo real.
            </p>
          </div>

          <div
            role="tablist"
            className="grid w-full grid-cols-1 gap-1 rounded-lg border border-neutral-200 bg-neutral-100/80 p-1 sm:inline-flex sm:w-auto sm:gap-0"
          >
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "restaurant"}
              onClick={() => setActiveTab("restaurant")}
              className={cn(
                "inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-md px-4 py-2 text-xs font-bold transition-colors",
                activeTab === "restaurant"
                  ? "bg-white text-[#EA1D2C] shadow-xs"
                  : "text-[#3F3E3E] hover:text-black"
              )}
            >
              <TrendingUp className="h-3.5 w-3.5 shrink-0" />
              Resultados do Restaurante
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "ecosystem"}
              onClick={() => setActiveTab("ecosystem")}
              className={cn(
                "inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-md px-4 py-2 text-xs font-bold transition-colors",
                activeTab === "ecosystem"
                  ? "bg-white text-[#EA1D2C] shadow-xs"
                  : "text-[#3F3E3E] hover:text-black"
              )}
            >
              <Globe className="h-3.5 w-3.5 shrink-0" />
              Visão Ecossistema &amp; Auditoria IA
            </button>
          </div>
        </div>

        {actionError ? (
          <div
            role="alert"
            className="mt-5 flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 p-3.5 text-xs text-[#9C050B]"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#EA1D2C]" />
            <span>{actionError}</span>
          </div>
        ) : null}
      </section>

      {activeTab === "restaurant" ? (
        <div className="mt-6 space-y-6">
          {/* 5 KPIs do Restaurante */}
          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <KpiCard
              label="Acessos pelo QR Code"
              value={String(data.kpis.total_views)}
              sub="Clientes que abriram a oferta"
            />
            <KpiCard
              label="Cupons resgatados"
              value={String(data.kpis.total_redemptions)}
              sub="Benefícios ativados na mesa"
              accent
            />
            <KpiCard
              label="Taxa de conversão"
              value={formatPct(data.kpis.conversion_rate_pct)}
              sub="Resgates sobre acessos"
              positive
            />
            <KpiCard
              label="Orçamento utilizado"
              value={formatBRL(data.kpis.budget_used)}
              sub={`Limite: ${formatBRL(data.kpis.budget_ceiling)} (${formatPct(budgetUtilizationPct, 0)})`}
            />
            <KpiCard
              label="Interesse em retorno"
              value={formatPct(data.kpis.recurrence_opt_in_rate_pct)}
              sub={`${data.kpis.total_opt_ins} clientes pediram Giftback`}
              positive
            />
          </section>

          {/* Gráfico de Funil Recharts + Próxima Campanha */}
          <section className="grid gap-6 lg:grid-cols-12">
            <div className="rounded-xl border border-neutral-200/80 bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04)] lg:col-span-7">
              <div>
                <h2 className="text-base font-extrabold text-[#1A1A1A] sm:text-lg">
                  Funil de clientes no salão
                </h2>
                <p className="text-xs text-[#717171]">
                  Escaneamentos na mesa → Cupons resgatados → Interesse em
                  retorno (Giftback)
                </p>
              </div>

              {data.kpis.total_views === 0 &&
              data.kpis.total_redemptions === 0 ? (
                <div className="mt-6 flex h-56 flex-col items-center justify-center rounded-lg border border-dashed border-neutral-300 bg-neutral-50 p-6 text-center">
                  <Smartphone className="h-7 w-7 text-[#EA1D2C]" />
                  <p className="mt-2 text-sm font-bold text-[#1A1A1A]">
                    Ainda não há acessos registrados
                  </p>
                  <p className="mt-1 max-w-sm text-xs text-[#717171]">
                    Ative uma campanha e clique em{" "}
                    <strong>Testar tela do cliente</strong> abaixo para
                    acompanhar o funil em tempo real.
                  </p>
                </div>
              ) : (
                <div className="mt-4 h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={data.funnel}
                      layout="vertical"
                      margin={{ top: 8, right: 28, left: 12, bottom: 8 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        horizontal={false}
                        stroke="#EFEFEF"
                      />
                      <XAxis
                        type="number"
                        allowDecimals={false}
                        tick={{ fontSize: 12, fill: "#717171" }}
                      />
                      <YAxis
                        type="category"
                        dataKey="stage"
                        width={130}
                        tick={{
                          fontSize: 12,
                          fill: "#3F3E3E",
                          fontWeight: 600,
                        }}
                      />
                      <Tooltip
                        cursor={{ fill: "#FAFAFA" }}
                        contentStyle={{
                          borderRadius: 8,
                          border: "1px solid #E5E5E5",
                          fontSize: 12,
                        }}
                        formatter={(value: number) => [`${value}`, "Total"]}
                      />
                      <Bar
                        dataKey="count"
                        radius={[0, 8, 8, 0]}
                        barSize={34}
                      >
                        {data.funnel.map((entry, idx) => (
                          <Cell
                            key={entry.stage}
                            fill={FUNNEL_COLORS[idx % FUNNEL_COLORS.length]}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* Próxima Campanha com Base nos Resultados */}
            <div className="flex flex-col justify-between rounded-xl border border-neutral-200/80 bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04)] lg:col-span-5">
              <div>
                <span className="text-xs font-bold uppercase tracking-wide text-[#EA1D2C]">
                  Próximo passo recomendado
                </span>
                <h2 className="mt-2 text-lg font-extrabold text-[#1A1A1A]">
                  Planeje a próxima rodada com base no que já funcionou
                </h2>
                <p className="mt-2 text-xs leading-relaxed text-[#3F3E3E] sm:text-sm">
                  Usamos o desempenho real do seu salão (
                  <strong>{data.kpis.total_views} acessos</strong>,{" "}
                  <strong>{data.kpis.total_redemptions} resgates</strong>,{" "}
                  <strong>{formatPct(data.kpis.conversion_rate_pct)}</strong> de
                  conversão e{" "}
                  <strong>
                    {formatPct(data.kpis.recurrence_opt_in_rate_pct)}
                  </strong>{" "}
                  de interesse em retorno) para sugerir novas ações ainda mais
                  eficientes.
                </p>
              </div>

              <div className="mt-6 space-y-2">
                <button
                  type="button"
                  disabled={isRunningNextLoop}
                  onClick={() => void handleGenerateNextCampaignLoop()}
                  className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-[#EA1D2C] px-5 py-3 text-sm font-bold text-white shadow-xs transition-colors hover:bg-[#A02331] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isRunningNextLoop ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Analisando resultados...
                    </>
                  ) : (
                    <>
                      Criar próxima campanha com base nos resultados
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
                <p className="text-center text-[11px] text-[#717171]">
                  Todas as recomendações continuam protegendo seu orçamento.
                </p>
              </div>
            </div>
          </section>

          {/* Lista de Campanhas */}
          <section className="rounded-xl border border-neutral-200/80 bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-extrabold text-[#1A1A1A]">
                Campanhas de {restaurant.name} ({data.campaigns.length})
              </h2>
              <span className="text-xs text-[#717171]">
                Use <strong>Testar tela do cliente</strong> em campanhas ativas
                para simular resgates na mesa.
              </span>
            </div>

            {data.campaigns.length === 0 ? (
              <div className="mt-4 rounded-lg border border-dashed border-neutral-300 bg-neutral-50 p-8 text-center">
                <p className="text-sm font-bold text-[#1A1A1A]">
                  Nenhuma campanha criada ainda
                </p>
                <p className="mt-1 text-xs text-[#717171]">
                  Crie sua primeira campanha para acompanhar acessos, resgates e
                  retorno aqui.
                </p>
                <NavButton
                  href={`/restaurante/${restaurant.id}/planejar`}
                  loadingText="Abrindo..."
                  className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-[#EA1D2C] px-4 py-2.5 text-xs font-bold text-white transition-colors hover:bg-[#A02331]"
                >
                  Planejar primeira campanha
                </NavButton>
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                {data.campaigns.map((camp) => {
                  const usedPct = Math.min(
                    100,
                    (camp.redemptions / Math.max(1, camp.coupon_limit)) * 100
                  );
                  return (
                    <article
                      key={camp.id}
                      className="rounded-lg border border-neutral-200/80 bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,0.03)] transition-all hover:border-neutral-300 hover:shadow-sm sm:p-5"
                    >
                      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={cn(
                                "rounded-md px-2 py-0.5 text-[11px] font-bold uppercase",
                                camp.status === "active"
                                  ? "bg-emerald-50 text-emerald-800"
                                  : "bg-amber-50 text-amber-900"
                              )}
                            >
                              {camp.status === "active" ? "Ativa" : "Rascunho"}
                            </span>
                            <span className="text-xs font-semibold text-[#717171]">
                              {PRIMARY_GOAL_LABELS[camp.objective] ??
                                camp.objective}
                            </span>
                            <span className="text-xs text-neutral-400">
                              • {camp.target_window}
                            </span>
                          </div>

                          <h3 className="mt-1.5 text-base font-extrabold text-[#1A1A1A]">
                            {camp.title}
                          </h3>

                          <div className="mt-3 grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
                            <div>
                              <span className="text-[#717171]">Acessos QR</span>
                              <p className="font-bold text-[#1A1A1A]">
                                {camp.views}
                              </p>
                            </div>
                            <div>
                              <span className="text-[#717171]">Resgates</span>
                              <p className="font-bold text-[#1A1A1A]">
                                {camp.redemptions}/{camp.coupon_limit} (
                                {formatPct(camp.conversion_rate_pct)})
                              </p>
                            </div>
                            <div>
                              <span className="text-[#717171]">
                                Interesse retorno
                              </span>
                              <p className="font-bold text-[#1A1A1A]">
                                {camp.opt_ins} (
                                {formatPct(camp.recurrence_opt_in_rate_pct)})
                              </p>
                            </div>
                            <div>
                              <span className="text-[#717171]">
                                Orçamento usado
                              </span>
                              <p className="font-bold text-[#1A1A1A]">
                                {formatBRL(camp.budget_used)} /{" "}
                                {formatBRL(camp.budget_limit)}
                              </p>
                            </div>
                          </div>

                          <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-neutral-200">
                            <div
                              className="h-full rounded-full bg-[#EA1D2C]"
                              style={{ width: `${usedPct}%` }}
                            />
                          </div>
                        </div>

                        <div className="flex shrink-0 flex-wrap gap-2 lg:flex-col">
                          <NavButton
                            href={`/r/${camp.id}?source=simulator`}
                            loadingText="Abrindo..."
                            icon={<Smartphone className="h-3.5 w-3.5" />}
                            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#EA1D2C] px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-[#A02331]"
                          >
                            Testar tela do cliente
                          </NavButton>

                          <NavButton
                            href={`/campanha/${camp.id}/revisao`}
                            loadingText="Abrindo..."
                            icon={<QrCode className="h-3.5 w-3.5" />}
                            className={cn(
                              "inline-flex items-center justify-center gap-1.5 rounded-lg px-4 py-2 text-xs font-bold",
                              SECONDARY_BUTTON_CLASS
                            )}
                          >
                            Materiais / QR Code
                          </NavButton>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      ) : (
        /* Aba Secundária (Gestores iFood): Visão Ecossistema & Auditoria IA (NSM + ai_runs) */
        <div className="mt-6 space-y-6">
          <section className="rounded-xl border border-neutral-200/80 bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04)] sm:p-8">
            <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
              <div className="max-w-2xl">
                <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-[#EA1D2C]">
                  <Globe className="h-3.5 w-3.5" />
                  North Star Metric (NSM) • Ecossistema iFood Comer Fora
                </span>
                <h2 className="mt-2 text-2xl font-extrabold text-[#1A1A1A]">
                  Taxa de Ativação Qualificada:{" "}
                  <span className="text-[#EA1D2C]">
                    {formatPct(data.ecosystem.nsm_qualified_activation_rate_pct)}
                  </span>
                </h2>
                <p className="mt-2 text-xs leading-relaxed text-[#3F3E3E] sm:text-sm">
                  Percentual de restaurantes no ambiente atual que concluíram a
                  jornada com{" "}
                  <strong>
                    campanha aprovada via Human-in-the-Loop (HITL), guardrails
                    determinísticos ativos e pelo menos 1 resgate presencial
                    registrado no banco
                  </strong>
                  . Ataca diretamente a dor do case (apenas 20% dos restaurantes
                  divulgam o Comer Fora no salão).
                </p>
              </div>

              <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-5 text-center lg:min-w-60">
                <p className="text-xs font-semibold text-[#717171]">
                  Restaurantes qualificados
                </p>
                <p className="mt-1 text-3xl font-extrabold text-[#1A1A1A]">
                  {data.ecosystem.qualified_activated_restaurants}
                  <span className="text-base font-semibold text-[#717171]">
                    {" "}
                    / {data.ecosystem.total_restaurants}
                  </span>
                </p>
                <p className="mt-1 text-[11px] text-[#717171]">
                  {data.ecosystem.restaurants_with_diagnostic} já possuem
                  diagnóstico salvo
                </p>
              </div>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <KpiCard
                label="Campanhas Ativas Aprovadas"
                value={String(data.ecosystem.total_active_campaigns)}
                sub="Com HITL confirmado"
              />
              <KpiCard
                label="Resgates no Ecossistema"
                value={String(data.ecosystem.total_redemptions)}
                sub={`De ${data.ecosystem.total_views} visualizações`}
              />
              <KpiCard
                label="Conversão Média QR → Resgate"
                value={formatPct(data.ecosystem.ecosystem_conversion_rate_pct)}
                sub="Agregado do banco"
              />
              <KpiCard
                label="Taxa Média Opt-in Retorno"
                value={formatPct(data.ecosystem.ecosystem_opt_in_rate_pct)}
                sub={`${data.ecosystem.total_opt_ins} opt-ins anônimos`}
              />
            </div>
          </section>

          {/* Auditoria & Observabilidade Real da Tabela ai_runs */}
          <section className="rounded-xl border border-neutral-200/80 bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04)] sm:p-8">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="flex items-center gap-2 text-lg font-extrabold text-[#1A1A1A]">
                  <Cpu className="h-5 w-5 text-[#EA1D2C]" />
                  Auditoria e Observabilidade de IA (<code>ai_runs</code>)
                </h2>
                <p className="mt-1 text-xs text-[#717171]">
                  Últimas 15 execuções reais registradas no Supabase (escopo da
                  sessão atual) — rastreando agente, provedor/modelo, versão do
                  prompt, latência e fallback determinístico.
                </p>
              </div>

              <div className="flex flex-wrap gap-2 text-xs">
                <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-3 py-1 font-bold text-emerald-800">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Sucesso real:{" "}
                  {formatPct(data.ecosystem.ai_success_rate_pct, 0)} (
                  {data.ecosystem.ai_success_runs}/{data.ecosystem.ai_total_runs}
                  )
                </span>
                <span className="inline-flex items-center gap-1 rounded-md bg-neutral-100 px-3 py-1 font-bold text-[#3F3E3E]">
                  <Activity className="h-3.5 w-3.5 text-[#EA1D2C]" />
                  Latência média: {data.ecosystem.ai_avg_latency_ms} ms
                </span>
              </div>
            </div>

            {data.ai_runs.length === 0 ? (
              <div className="mt-5 rounded-lg border border-dashed border-neutral-300 bg-neutral-50 p-6 text-center text-xs text-[#717171]">
                Nenhuma execução de IA registrada nesta sessão ainda. Gere um
                diagnóstico ou crie materiais de campanha para visualizar a
                telemetria real aqui (não fabricamos registros falsos no seed).
              </div>
            ) : (
              <div className="mt-5 overflow-x-auto">
                <table className="w-full min-w-[640px] text-left text-xs">
                  <thead>
                    <tr className="border-b border-neutral-200 text-[11px] uppercase tracking-wide text-[#717171]">
                      <th className="py-2.5 pr-3">Horário</th>
                      <th className="py-2.5 pr-3">Agente</th>
                      <th className="py-2.5 pr-3">Provedor / Modelo</th>
                      <th className="py-2.5 pr-3">Prompt</th>
                      <th className="py-2.5 pr-3">Latência</th>
                      <th className="py-2.5 pr-3">Status</th>
                      <th className="py-2.5">Detalhe</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {data.ai_runs.map((run) => (
                      <tr key={run.id} className="hover:bg-neutral-50">
                        <td className="whitespace-nowrap py-2.5 pr-3 text-[#717171]">
                          {new Date(run.created_at).toLocaleString("pt-BR", {
                            day: "2-digit",
                            month: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </td>
                        <td className="py-2.5 pr-3 font-mono font-semibold text-[#1A1A1A]">
                          {run.agent_name}
                        </td>
                        <td className="py-2.5 pr-3 font-mono text-[#3F3E3E]">
                          {run.model}
                        </td>
                        <td className="py-2.5 pr-3">{run.prompt_version}</td>
                        <td className="whitespace-nowrap py-2.5 pr-3 font-semibold">
                          {run.latency_ms} ms
                        </td>
                        <td className="py-2.5 pr-3">
                          <span
                            className={cn(
                              "inline-flex rounded-md px-2 py-0.5 text-[10px] font-bold uppercase",
                              run.status === "success"
                                ? "bg-emerald-50 text-emerald-800"
                                : run.status === "fallback"
                                  ? "bg-amber-50 text-amber-900"
                                  : "bg-red-50 text-[#9C050B]"
                            )}
                          >
                            {run.status}
                          </span>
                        </td>
                        <td className="max-w-xs truncate py-2.5 text-[#717171]">
                          {run.error_message ?? "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

function KpiCard({
  label,
  value,
  sub,
  accent = false,
  positive = false,
}: {
  label: string;
  value: string;
  sub: string;
  accent?: boolean;
  positive?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)]",
        accent
          ? "border-[#EA1D2C]/25 bg-red-50/40"
          : positive
            ? "border-emerald-200/80 bg-emerald-50/40"
            : "border-neutral-200/80 bg-white"
      )}
    >
      <p
        className={cn(
          "text-[11px] font-semibold",
          positive ? "text-emerald-800" : "text-[#717171]"
        )}
      >
        {label}
      </p>
      <p
        className={cn(
          "mt-1 text-xl font-extrabold",
          positive ? "text-emerald-700" : "text-[#1A1A1A]"
        )}
      >
        {value}
      </p>
      <p className="mt-0.5 text-[11px] text-[#717171]">{sub}</p>
    </div>
  );
}
