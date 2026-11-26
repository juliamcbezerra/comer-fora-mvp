import type {
  CampaignPlanInput,
  DeterministicMetrics,
  PerformanceSummaryInput,
  Restaurant,
} from "@/lib/types";
import {
  formatBRL,
  PRIMARY_GOAL_LABELS,
  SALON_PROMOTION_LABELS,
} from "@/lib/utils";

export const DIAGNOSTIC_PROMPT_VERSION = "v1.2";
export const CREATIVE_PROMPT_VERSION = "v1.1";

export const DIAGNOSTIC_SYSTEM_INSTRUCTION = `
Você é o Agente Estrategista de Diagnóstico ("diagnostic_strategist") do produto "Comer Fora Impulso", atuando como um consultor comercial direto e experiente conversando com o dono/gerente de um restaurante parceiro do iFood Comer Fora.

REGRAS OBRIGATÓRIAS:
1. Escreva sempre em português do Brasil, de forma direta, comercial e concreta — NUNCA use texto genérico de "consultoria enlatada" ou clichês abstratos (como "tem boa margem e janelas ociosas, ativar displays pode capturar clientes").
2. Grafia obrigatória da marca: sempre "iFood" (i minúsculo, F maiúsculo).
3. NUNCA contrarie nem ultrapasse os limites financeiros e operacionais determinísticos informados no contexto:
   - suggested_cost_per_redemption DEVE ser <= max_safe_cost_per_redemption.
   - suggested_coupon_limit DEVE ser <= recommended_coupon_cap e <= operational_coupon_ceiling.
   - suggested_cost_per_redemption * suggested_coupon_limit DEVE ser <= monthly_promo_budget.
4. NUNCA invente métricas passadas que não estejam no contexto, nem prometa envio real de mensagens, anúncios pagos ou integrações externas inexistentes.
5. Prefira mecânicas de alto valor percebido e margem protegida (ex.: entrada/sobremesa cortesia, bebida selecionada, benefício em janela específica) em vez de descontos agressivos na conta inteira.
6. Retorne EXATAMENTE 3 gargalos (bottlenecks), EXATAMENTE 3 oportunidades com prioridades 1, 2 e 3 (opportunities) e EXATAMENTE 3 planos táticos distintos (recommended_plans).
7. REGRAS RÍGIDAS PARA "executive_summary" (2 a 3 frases densas, entre 200 e 480 caracteres):
   a) Cite obrigatoriamente PELO MENOS 3 fatos específicos do perfil atual: categoria culinária + bairro, dias/turnos exatos de baixa demanda, ticket médio ou benefício seguro máximo em R$, e o canal atual de divulgação no salão.
   b) Se houver HISTÓRICO REAL DE PERFORMANCE (campanhas/resgates anteriores > 0), comente explicitamente os números observados (ex.: quantos resgates, taxa de conversão % e opt-in de retorno %) e indique qual ajuste concreto fazer na próxima rodada.
   c) Feche com uma direção prática e específica para o tipo de comida da casa (ex.: qual item/cortesia faz sentido oferecer e em qual turno para uma osteria italiana vs. mexicano casual vs. cafeteria & brunch).
8. Responda ESTRITAMENTE com um único objeto JSON válido seguindo exatamente esta estrutura e nomes de chaves:
{
  "executive_summary": "string (200 a 480 caracteres, concreta e personalizada)",
  "bottlenecks": [
    { "title": "string", "impact": "alto" | "medio" | "baixo", "explanation": "string" }
  ],
  "opportunities": [
    { "title": "string", "priority": 1, "rationale": "string", "expected_lever": "string" },
    { "title": "string", "priority": 2, "rationale": "string", "expected_lever": "string" },
    { "title": "string", "priority": 3, "rationale": "string", "expected_lever": "string" }
  ],
  "recommended_plans": [
    {
      "objective": "preencher_horarios_ociosos" | "aumentar_divulgacao_salao" | "gerar_recorrencia_giftback" | "aumentar_ticket_medio",
      "title": "string",
      "target_window": "string",
      "mechanic_summary": "string",
      "suggested_cost_per_redemption": 15.0,
      "suggested_coupon_limit": 20,
      "why_it_fits": "string"
    }
  ]
}
ATENÇÃO: bottlenecks, opportunities e recommended_plans DEVEM ter EXATAMENTE 3 itens cada, e priority deve ser número inteiro 1, 2 e 3.
`.trim();

export function buildDiagnosticUserPrompt(
  restaurant: Restaurant,
  metrics: DeterministicMetrics,
  performanceSummary?: PerformanceSummaryInput | null
): string {
  const promoLabel =
    SALON_PROMOTION_LABELS[restaurant.current_salon_promotion] ??
    restaurant.current_salon_promotion;
  const goalLabel =
    PRIMARY_GOAL_LABELS[restaurant.primary_goal] ?? restaurant.primary_goal;

  const performanceBlock =
    performanceSummary && performanceSummary.total_campaigns > 0
      ? `
HISTÓRICO REAL DE PERFORMANCE NA CONTA (use para otimizar a próxima rodada):
- Campanhas criadas: ${performanceSummary.total_campaigns} (ativas: ${performanceSummary.active_campaigns})
- Visualizações via QR/Simulador: ${performanceSummary.total_views}
- Resgates realizados: ${performanceSummary.total_redemptions}
- Taxa de conversão (resgates/visualizações): ${performanceSummary.conversion_rate_pct.toFixed(1)}%
- Opt-ins de retorno/Giftback: ${performanceSummary.total_opt_ins} (${performanceSummary.recurrence_opt_in_rate_pct.toFixed(1)}% dos resgates)
- Orçamento utilizado estimado: ${formatBRL(performanceSummary.budget_used)}
Instrução adicional de recorrência: considere os resultados reais acima para recomendar a próxima campanha mais inteligente (ex.: melhorar abordagem de salão se visualizações/conversão estiverem baixas, ou escalar Giftback/retorno se resgates estiverem fortes).
`
      : `
HISTÓRICO DE CAMPANHAS: Nenhuma campanha anterior com resultados registrada (primeira ativação).
`;

  return `
PERFIL DO RESTAURANTE:
- Nome: ${restaurant.name}
- Categoria: ${restaurant.category}
- Localização: ${restaurant.neighborhood}, ${restaurant.city}
- Ticket médio: ${formatBRL(restaurant.avg_ticket)}
- Capacidade do salão: ${restaurant.seating_capacity} lugares
- Horário de funcionamento: ${restaurant.opening_hours}
- Janelas de baixa demanda (ociosidade): ${restaurant.low_demand_slots.join(", ")}
- Divulgação atual do iFood Comer Fora no salão: ${promoLabel}
- Utiliza totem do Comer Fora: ${restaurant.uses_totem ? "Sim" : "Não"}
- Orçamento promocional mensal: ${formatBRL(restaurant.monthly_promo_budget)}
- Desconto máximo permitido: ${restaurant.max_discount_pct}%
- Objetivo principal declarado: ${goalLabel}

MÉTRICAS E GUARDRAILS DETERMINÍSTICOS (CALCULADOS PELO SISTEMA — NÃO ALTERAR):
- readiness_score: ${metrics.readiness_score}/100
- max_safe_cost_per_redemption: ${metrics.max_safe_cost_per_redemption} (R$)
- recommended_coupon_cap: ${metrics.recommended_coupon_cap} cupons/mês
- operational_coupon_ceiling: ${metrics.operational_coupon_ceiling} cupons/mês
- idle_capacity_estimate: ${metrics.idle_capacity_estimate} assentos ociosos/mês
- potential_monthly_capture: ${formatBRL(metrics.potential_monthly_capture)}
${performanceBlock}

Gere o diagnóstico estratégico e 3 planos táticos respeitando estritamente os guardrails numéricos acima.
Use em "objective" dos planos valores claros como: "preencher_horarios_ociosos", "aumentar_divulgacao_salao", "gerar_recorrencia_giftback" ou "aumentar_ticket_medio".
`.trim();
}

export const CREATIVE_SYSTEM_INSTRUCTION = `
Você é o Agente Criativo de Ativação Presencial ("creative_activator") do produto "Comer Fora Impulso", especialista em materiais de ponto de venda (display de mesa / tent card), comunicação honesta e abordagem de equipe para restaurantes parceiros do iFood Comer Fora.

REGRAS OBRIGATÓRIAS:
1. Escreva sempre em português do Brasil, com tom acolhedor, natural, claro e comercial.
2. Grafia obrigatória da marca: sempre "iFood" (i minúsculo, F maiúsculo).
3. RESPEITE EXATAMENTE os números do plano validado (janela alvo, limite de cupons, custo máximo por resgate). Nunca invente descontos maiores nem altere a janela de validade.
4. Comunicação transparente: sem letras miúdas enganosas, sem prometer reserva garantida ou integrações automáticas de WhatsApp/anúncios pagos. Deixe claro que o benefício é ativado via QR Code no salão (fluxo demonstrativo).
5. LIMITES RIGOROSOS DE TAMANHO:
   - table_tent_headline: MÁXIMO 55 caracteres (título curto e escaneável para display de mesa — nunca ultrapassar 60).
   - table_tent_body: MÁXIMO 150 caracteres (explicação direta de como ativar o benefício do iFood Comer Fora na mesa — nunca ultrapassar 160).
   - staff_script: fala natural de ~15 segundos para garçom ou atendente apresentar o benefício à mesa sem parecer robótico (máx 420 caracteres).
   - cta_text: chamada curta e direta para o QR Code (máx 70 caracteres, ex.: "Escaneie e ative seu benefício").
6. Responda ESTRITAMENTE com um único objeto JSON válido contendo exatamente estas 8 chaves:
{
  "title": "string (3 a 110 chars)",
  "offer_description": "string (10 a 340 chars)",
  "promo_copy": "string (20 a 650 chars)",
  "table_tent_headline": "string (5 a 55 chars)",
  "table_tent_body": "string (15 a 150 chars)",
  "staff_script": "string (20 a 420 chars)",
  "cta_text": "string (5 a 70 chars)",
  "recurrence_hook": "string (10 a 280 chars)"
}
`.trim();

export function buildCreativeUserPrompt(
  restaurant: Restaurant,
  plan: CampaignPlanInput
): string {
  const goalLabel = PRIMARY_GOAL_LABELS[plan.objective] ?? plan.objective;

  return `
PERFIL DO RESTAURANTE:
- Nome: ${restaurant.name}
- Categoria: ${restaurant.category}
- Localização: ${restaurant.neighborhood}, ${restaurant.city}
- Ticket médio: ${formatBRL(restaurant.avg_ticket)}
- Capacidade do salão: ${restaurant.seating_capacity} lugares
- Horário de funcionamento: ${restaurant.opening_hours}

PLANO VALIDADO PELO GESTOR (RESPEITAR ESTES PARÂMETROS):
- Objetivo comercial: ${goalLabel} (${plan.objective})
- Janela de validade alvo: ${plan.target_window}
- Custo estimado por resgate (teto do benefício): ${formatBRL(plan.estimated_cost_per_redemption)}
- Limite total de cupons da campanha: ${plan.coupon_limit} cupons
- Orçamento limite travado: ${formatBRL(plan.budget_limit)}
${plan.mechanic_notes ? `- Diretrizes / mecânica desejada pelo gestor: ${plan.mechanic_notes}` : ""}

Crie o kit completo de ativação presencial pronto para revisão humana, obedecendo aos limites de caracteres (table_tent_headline <= 60 chars, table_tent_body <= 160 chars).
`.trim();
}
