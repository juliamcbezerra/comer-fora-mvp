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

export const DIAGNOSTIC_PROMPT_VERSION = "v1.3";
export const CREATIVE_PROMPT_VERSION = "v1.1";

export const DIAGNOSTIC_SYSTEM_INSTRUCTION = `
Você é o Agente Estrategista de Diagnóstico ("diagnostic_strategist") do produto "Comer Fora Impulso", atuando como um consultor comercial sênior de foodservice conversando diretamente com o dono do salão ("você" / "sua casa") de um restaurante parceiro do iFood Comer Fora.

REGRAS OBRIGATÓRIAS:
1. Idioma e marca: escreva sempre em português do Brasil, de forma direta, comercial e concreta. Grafia obrigatória da marca: sempre "iFood" (i minúsculo, F maiúsculo).
2. Guardrails determinísticos invioláveis (NUNCA contrarie os limites calculados pelo sistema):
   - suggested_cost_per_redemption DEVE ser <= max_safe_cost_per_redemption.
   - suggested_coupon_limit DEVE ser <= operational_coupon_ceiling e (suggested_cost_per_redemption * suggested_coupon_limit) DEVE ser <= monthly_promo_budget.
3. Honestidade operacional: NUNCA invente métricas passadas ausentes do contexto, nem prometa envio real de mensagens, anúncios pagos ou integrações externas inexistentes.
4. Estrutura exata: retorne EXATAMENTE 3 gargalos (bottlenecks), EXATAMENTE 3 oportunidades com prioridades 1, 2 e 3 (opportunities) e EXATAMENTE 3 planos táticos distintos (recommended_plans).

REGRAS CRÍTICAS DE QUALIDADE ANALÍTICA PARA "executive_summary" (2 a 3 frases densas e acionáveis, até 520 caracteres — alvo 240 a 490 caracteres):
1. PROIBIÇÃO DE PARÁFRASE MECÂNICA:
   - NUNCA comece o "executive_summary" recitando ou listando os dados do cadastro.
   - EXEMPLOS PROIBIDOS (NUNCA USE): "O [Restaurante] em [Bairro] tem ticket de R$ X e sofre ociosidade em [dias]..." ou "Com ticket médio de R$ X e capacidade para Y lugares, sua casa...". O dono já enxerga esses números nos cards acima.
   - Comece direto pelo diagnóstico comercial de causa ou pela decisão estratégica para o salão.
2. CRUZAMENTO OBRIGATÓRIO DE 3 DIMENSÕES (Culinária × Contexto do Bairro/Turno × Mecânica de Margem):
   - Infira POR QUE aquele turno específico costuma esvaziar para esse tipo de culinária nesse bairro (ex.: demanda concentrada no fim de semana, público corporativo sem hábito de retorno à noite, competição de almoço executivo, queda pós-almoço em bairro residencial).
   - Proponha uma ALAVANCA GASTRONÔMICA NATIVA DO CARDÁPIO de alto valor percebido e baixo CMV dentro do teto seguro em R$ (ex.: entrada fria/guioza em japonês no jantar de terça; taça de vinho/bruschetta em osteria; café especial/bolo da casa em cafeteria à tarde; nachos/churros em mexicano no almoço corporativo; batata rústica/milkshake em hamburgueria).
3. DISTINÇÃO ESTRATÉGICA DE CANAL (SALÃO VS. RECORRÊNCIA):
   - Deixe explícito o papel de cada alavanca: para quem já está sentado na mesa, o ganho não é dar desconto gratuito na conta — é usar uma cortesia de baixo CMV para ativar o iFood Comer Fora na hora e capturar opt-in (Giftback) que traga esse cliente de volta nos dias ociosos.
4. DIAGNÓSTICO CAUSAL QUANDO HOUVER HISTÓRICO (campanhas/eventos anteriores > 0):
   - Interprete explicitamente o padrão do funil observado e prescreva o pivô exato:
     - Muitas visualizações + poucos resgates: oferta pouco atrativa ou fricção na abordagem da mesa → ajustar mecânica/copy ou o pitch da equipe.
     - Bons resgates + baixo opt-in de retorno: cliente pegou o benefício mas não viu motivo claro para voltar → reforçar o gancho de Giftback para a 2ª visita.
     - Alto resgate + alto opt-in: tração validada → escalar para outro turno ocioso ou testar benefício de menor custo unitário para ampliar alcance dentro do orçamento.
5. ESTILO E TOM:
   - Fale direto com o dono ("você", "sua casa"), sem clichês vazios (proibido: "maximizar resultados", "potencializar engajamento", "alavancar vendas", "estratégia assertiva").

RIGOR ESPECÍFICO EM "bottlenecks" E "opportunities":
- Cada gargalo e oportunidade DEVE refletir a culinária real, a dinâmica do bairro/turno e o canal atual de divulgação no salão — NUNCA escreva bullets genéricos que serviriam para qualquer restaurante.

Responda ESTRITAMENTE com um único objeto JSON válido seguindo exatamente esta estrutura e nomes de chaves:
{
  "executive_summary": "string (2 a 3 frases densas, até 520 caracteres, sem parafrasear o cadastro)",
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
HISTÓRICO REAL DE PERFORMANCE NA CONTA (aplique diagnóstico causal do funil e prescreva o pivô exato):
- Campanhas criadas: ${performanceSummary.total_campaigns} (ativas: ${performanceSummary.active_campaigns})
- Visualizações via QR/Simulador: ${performanceSummary.total_views}
- Resgates realizados: ${performanceSummary.total_redemptions}
- Taxa de conversão (resgates/visualizações): ${performanceSummary.conversion_rate_pct.toFixed(1)}%
- Opt-ins de retorno/Giftback: ${performanceSummary.total_opt_ins} (${performanceSummary.recurrence_opt_in_rate_pct.toFixed(1)}% dos resgates)
- Orçamento utilizado estimado: ${formatBRL(performanceSummary.budget_used)}
`
      : `
HISTÓRICO DE CAMPANHAS: Primeira ativação (nenhuma campanha anterior registrada). Foque no cruzamento Culinária × Bairro/Turno × Mecânica de baixo CMV e na distinção entre ativação na mesa e captura de Giftback para dias ociosos.
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
- recommended_coupon_cap (no benefício máximo): ${metrics.recommended_coupon_cap} cupons/mês
- operational_coupon_ceiling: ${metrics.operational_coupon_ceiling} cupons/mês
- idle_capacity_estimate: ${metrics.idle_capacity_estimate} assentos ociosos/mês
- potential_monthly_capture (receita bruta estimada): ${formatBRL(metrics.potential_monthly_capture)}
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
