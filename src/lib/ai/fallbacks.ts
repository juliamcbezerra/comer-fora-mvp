import type {
  CampaignPlanInput,
  CreativeKitOutput,
  DeterministicMetrics,
  DiagnosticAiOutput,
  PerformanceSummaryInput,
  Restaurant,
} from "@/lib/types";
import { formatBRL, roundCurrency } from "@/lib/utils";

function clampText(text: string, maxLength: number): string {
  const clean = text.trim().replace(/\s+/g, " ");
  if (clean.length <= maxLength) return clean;
  return `${clean.slice(0, maxLength - 1).trimEnd()}…`;
}

export function buildDiagnosticFallback(
  restaurant: Restaurant,
  metrics: DeterministicMetrics,
  performanceSummary?: PerformanceSummaryInput | null
): DiagnosticAiOutput {
  const slotsText =
    restaurant.low_demand_slots.slice(0, 2).join(" e ") ||
    "horários de menor movimento";
  const safeCostPrimary = roundCurrency(
    Math.max(1, metrics.max_safe_cost_per_redemption * 0.8)
  );
  const safeCostSecondary = roundCurrency(
    Math.max(1, metrics.max_safe_cost_per_redemption * 0.9)
  );
  const safeCostRecurrence = roundCurrency(
    Math.max(1, metrics.max_safe_cost_per_redemption * 0.65)
  );

  const calcSafeCoupons = (cost: number) =>
    Math.max(
      1,
      Math.min(
        Math.floor(restaurant.monthly_promo_budget / cost),
        metrics.operational_coupon_ceiling
      )
    );

  const hasHistory = Boolean(
    performanceSummary && performanceSummary.total_campaigns > 0
  );

  const summaryBase = hasHistory
    ? `Com ${performanceSummary!.total_redemptions} resgates registrados (${performanceSummary!.conversion_rate_pct.toFixed(1)}% de conversão), o ${restaurant.name} pode otimizar o salão em ${slotsText} mantendo custo máximo de ${formatBRL(metrics.max_safe_cost_per_redemption)} por resgate.`
    : `O ${restaurant.name} (${restaurant.category}, ${restaurant.neighborhood}) tem prontidão ${metrics.readiness_score}/100 e espaço imediato para ativar o iFood Comer Fora em ${slotsText}, com custo seguro de até ${formatBRL(metrics.max_safe_cost_per_redemption)}/resgate.`;

  return {
    executive_summary: clampText(summaryBase, 350),
    bottlenecks: [
      {
        title: "Baixa visibilidade do iFood Comer Fora no salão",
        impact:
          restaurant.current_salon_promotion === "display_mesa_ativo"
            ? "medio"
            : "alto",
        explanation:
          "Clientes que já frequentam o salão não percebem o benefício do Comer Fora sem sinalização direta na mesa e fala ativa da equipe.",
      },
      {
        title: `Ociosidade concentrada em ${slotsText}`,
        impact: "alto",
        explanation: `Com estimativa de ${metrics.idle_capacity_estimate} assentos ociosos/mês, falta uma mecânica específica e controlada para atrair mesas nesses turnos.`,
      },
      {
        title: restaurant.uses_totem
          ? "Subaproveitamento do gancho de recorrência pós-visita"
          : "Ausência de captura estruturada para retorno (Giftback)",
        impact: "medio",
        explanation:
          "Sem um convite de retorno imediato após o primeiro resgate, o restaurante depende de esforço constante para reconquistar o mesmo cliente.",
      },
    ],
    opportunities: [
      {
        title: "Ativação de mesa com Display + QR Code",
        priority: 1,
        rationale:
          "Aproveita o fluxo presencial existente com custo fixo baixo e mensuração direta de escaneamento e resgate.",
        expected_lever: "Aumento de visibilidade e conversão imediata no salão",
      },
      {
        title: `Benefício protegido por margem em ${slotsText}`,
        priority: 2,
        rationale: `Travar o benefício abaixo de ${formatBRL(metrics.max_safe_cost_per_redemption)} preserva a rentabilidade do ticket médio de ${formatBRL(restaurant.avg_ticket)}.`,
        expected_lever: "Maior ocupação nos horários de baixa demanda",
      },
      {
        title: "Mecânica de retorno (Giftback) no fechamento",
        priority: 3,
        rationale:
          "Oferecer um incentivo simples para a segunda visita aumenta o valor do cliente ao longo do mês.",
        expected_lever: "Crescimento da taxa de recorrência no salão",
      },
    ],
    recommended_plans: [
      {
        objective: "preencher_horarios_ociosos",
        title: clampText(`Salão Ativo — ${slotsText}`, 110),
        target_window: slotsText,
        mechanic_summary: `Cortesia de entrada ou acompanhamento selecionada (custo estimado ${formatBRL(safeCostPrimary)}) ao ativar o iFood Comer Fora na mesa.`,
        suggested_cost_per_redemption: safeCostPrimary,
        suggested_coupon_limit: calcSafeCoupons(safeCostPrimary),
        why_it_fits: `Protege sua margem (abaixo de ${formatBRL(metrics.max_safe_cost_per_redemption)}) e cabe no orçamento de ${formatBRL(restaurant.monthly_promo_budget)}.`,
      },
      {
        objective: "aumentar_divulgacao_salao",
        title: clampText(`Descubra o Comer Fora no ${restaurant.name}`, 110),
        target_window:
          restaurant.low_demand_slots.join(", ") || restaurant.opening_hours,
        mechanic_summary: `Display de mesa com QR Code e abordagem rápida da equipe liberando benefício controlado de ${formatBRL(safeCostSecondary)}.`,
        suggested_cost_per_redemption: safeCostSecondary,
        suggested_coupon_limit: calcSafeCoupons(safeCostSecondary),
        why_it_fits:
          "Transforma o próprio salão no principal canal de divulgação do iFood Comer Fora sem depender de mídia paga.",
      },
      {
        objective: "gerar_recorrencia_giftback",
        title: clampText(`Volte ao ${restaurant.name} com Giftback`, 110),
        target_window: slotsText,
        mechanic_summary: `Benefício enxuto de ${formatBRL(safeCostRecurrence)} (sobremesa ou bebida da casa) somado ao opt-in anônimo de retorno em 15 dias.`,
        suggested_cost_per_redemption: safeCostRecurrence,
        suggested_coupon_limit: calcSafeCoupons(safeCostRecurrence),
        why_it_fits:
          "Custo unitário menor permite ampliar o alcance de cupons com foco em estimular a segunda visita.",
      },
    ],
  };
}

export function buildCreativeKitFallback(
  restaurant: Restaurant,
  plan: CampaignPlanInput
): CreativeKitOutput {
  const costText = formatBRL(plan.estimated_cost_per_redemption);

  return {
    title: clampText(
      `Benefício Especial iFood Comer Fora — ${restaurant.name}`,
      115
    ),
    offer_description: clampText(
      `Benefício demonstrativo no valor estimado de até ${costText} no ${restaurant.name} (${restaurant.neighborhood}), válido em ${plan.target_window}, limitado a ${plan.coupon_limit} cupons.`,
      350
    ),
    promo_copy: clampText(
      `Vem aproveitar o ${restaurant.name} em ${restaurant.neighborhood}! Em ${plan.target_window}, ative o benefício demonstrativo do iFood Comer Fora direto na mesa pelo QR Code (até ${costText} por resgate). Estoque controlado de ${plan.coupon_limit} cupons.`,
      680
    ),
    table_tent_headline: clampText(
      `Benefício iFood Comer Fora na sua mesa`,
      60
    ),
    table_tent_body: clampText(
      `Escaneie o QR Code em ${plan.target_window}, ative seu cupom demonstrativo do iFood Comer Fora e apresente ao atendente.`,
      160
    ),
    staff_script: clampText(
      `Oi! Bem-vindos ao ${restaurant.name}. Hoje em ${plan.target_window} estamos com uma ação do iFood Comer Fora aqui na mesa: é só escanear o QR Code do display para liberar o benefício demonstrativo na hora.`,
      420
    ),
    cta_text: "Escaneie e ative seu benefício",
    recurrence_hook: clampText(
      `Após resgatar o cupom, marque o opt-in anônimo para desbloquear uma proposta de Giftback na sua próxima visita em ${plan.target_window}.`,
      290
    ),
  };
}
