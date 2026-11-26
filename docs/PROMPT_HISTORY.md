# PROMPT HISTORY — COMER FORA IMPULSO

Registro evolutivo dos prompts utilizados nos agentes de IA do projeto **Comer Fora Impulso**.

> **Regras de uso**
> - **Não invente históricos de prompts.** Registre apenas prompts efetivamente escritos, executados ou alterados.
> - Preserve todas as versões anteriores para evidenciar a evolução iterativa (útil para a dimensão **Prompts** do slide do processo seletivo).
> - Diferencie claramente **hipótese**, **implementação** e **resultado comprovado** em execução real.

---

## Mapa de Agentes Planejados (Escopo do Briefing)

| Agente | Rota | Modelo / Temperatura | Versão Atual | Status |
|---|---|---|---|---|
| `diagnostic_strategist` | `POST /api/ai/diagnose` | Google Gemini API oficial (`gemini-flash-lite-latest` / `gemini-3.5-flash-lite`) / `0.2` | `v1.3` | Validado em execução real (`ai_status: success`, `gemini:gemini-flash-lite-latest`, `4893ms`) |
| `creative_activator` | `POST /api/ai/generate-kit` | Google Gemini API oficial (`gemini-flash-lite-latest` / `gemini-3.5-flash-lite`) / `0.5` | `v1.1` | Validado em execução real (`ai_status: success`) |

---

## Modelo de Registro de Evolução

```markdown
## PRM-XXX — [agente] vX.Y

- **Data:** AAAA-MM-DD
- **Etapa do desenvolvimento:** Ex.: Implementação do Agente 1 / Refinamento pós-teste
- **Objetivo do prompt:** ...
- **Prompt utilizado ou referência ao seu conteúdo:** Referência ao arquivo/função (ex.: `lib/ai/prompts.ts`) e resumo fiel da estrutura/regras.
- **Problema identificado na resposta:** (Na v1.0 inicial: "Ainda não testado" ou resultado do primeiro teste real; nas versões seguintes: falha observada na versão anterior.)
- **Alteração realizada:** (O que mudou em relação à versão anterior.)
- **Motivo da alteração:** ...
- **Resultado observado:** (Indicar explicitamente se é Hipótese, Implementado aguardando teste ou Resultado Comprovado com evidência.)
```

---

## Histórico de Versões

### PRM-001 — `diagnostic_strategist` v1.0

- **Data:** 2026-11-25
- **Etapa do desenvolvimento:** Etapa 3 — Implementação inicial do Agente 1 (`POST /api/ai/diagnose`)
- **Objetivo do prompt:** Interpretar o perfil operacional/financeiro do restaurante, as métricas determinísticas já calculadas e eventual histórico real de campanhas para produzir diagnóstico estruturado (resumo executivo, 3 gargalos, 3 oportunidades priorizadas e 3 planos táticos aderentes aos guardrails).
- **Prompt utilizado ou referência ao seu conteúdo:** Definido em `src/lib/ai/prompts.ts` (`DIAGNOSTIC_SYSTEM_INSTRUCTION` + `buildDiagnosticUserPrompt`) com `temperature: 0.2`, `responseMimeType: "application/json"` e `responseSchema` (`diagnosticResponseSchema` em `src/lib/ai/client.ts`). Regras principais do prompt: grafia obrigatória `"iFood"`, proibição de extrapolar `max_safe_cost_per_redemption`/`recommended_coupon_cap`/`monthly_promo_budget`, proibição de inventar métricas ou prometer envios reais, preferência por mecânicas de alto valor percebido e limite de 350 caracteres no `executive_summary`.
- **Problema identificado na resposta:** Ainda não validado com resposta real da Gemini API — no primeiro teste de integração (`ISS-002`), a chave `AQ....` retornou HTTP 403 (`aiplatform.googleapis.com` desabilitada no projeto GCP), acionando corretamente o fallback determinístico.
- **Alteração realizada:** Versão inicial (`v1.0`).
- **Motivo da alteração:** Criação da baseline estruturada conforme especificação técnica.
- **Resultado observado:**
  - *Execução 1 (fallback):* Contrato Zod + pós-validação determinística (`enforcePlanGuardrails`) + fallback (`status = 'fallback'`) + persistência em `diagnostics` e `ai_runs` validados sob erro `403` (`ISS-002`).
  - *Execução 2 (resultado comprovado com IA real após `DEC-011`):* `POST /api/ai/diagnose` retornou HTTP `201`, `ai_status: success`, modelo `gemini-3-flash-preview` (via failover automático da cadeia Flash), `latency_ms: 13016`, 3 planos válidos conforme schema Zod e `guardrails_adjusted: 0` (o prompt `v1.0` respeitou nativamente todos os limites financeiros/operacionais sem exigir correção pós-geração).

---

### PRM-002 — `creative_activator` v1.0

- **Data:** 2026-11-25
- **Etapa do desenvolvimento:** Etapa 3 — Implementação inicial do Agente 2 (`POST /api/ai/generate-kit`)
- **Objetivo do prompt:** A partir de um plano já validado deterministicamente pelo gestor, gerar o kit completo de ativação presencial (título, oferta honesta, copy de divulgação, display de mesa com limites rígidos de 60/160 caracteres, script de atendimento de ~15s, CTA para QR Code e gancho de recorrência/Giftback).
- **Prompt utilizado ou referência ao seu conteúdo:** Definido em `src/lib/ai/prompts.ts` (`CREATIVE_SYSTEM_INSTRUCTION` + `buildCreativeUserPrompt`) com `temperature: 0.5`, `responseMimeType: "application/json"` e `responseSchema` (`creativeKitResponseSchema` em `src/lib/ai/client.ts`). Regras principais: grafia `"iFood"`, proibição de alterar os números validados do plano, comunicação transparente/demonstrativa sem prometer integrações inexistentes e limites rígidos (`table_tent_headline <= 60`, `table_tent_body <= 160`).
- **Problema identificado na resposta:** Ainda não validado com resposta real da Gemini API devido à `ISS-002` (HTTP 403 na chave Vertex Express).
- **Alteração realizada:** Versão inicial (`v1.0`).
- **Motivo da alteração:** Criação da baseline estruturada conforme especificação técnica.
- **Resultado observado:**
  - *Execução 1 (fallback):* Bloqueio determinístico pré-chamada (`400` para plano fora da margem), fallback determinístico compatível com 60/160 chars (`38`/`127` chars), persistência em `campaigns` como `draft` (`human_approved = false`) e registro em `ai_runs` validados.
  - *Execução 2 (resultado comprovado com IA real após `DEC-011`):* `POST /api/ai/generate-kit` retornou HTTP `201`, `ai_status: success`, modelo `gemini-3-flash-preview`, `latency_ms: 11885`, `status: draft`, `human_approved: false`, respeitando rigorosamente os limites de caracteres do Tent Card (`table_tent_headline`: 46/60 chars; `table_tent_body`: 140/160 chars) e o contrato Zod.

---

### PRM-003 — `diagnostic_strategist` v1.1

- **Data:** 2026-11-25
- **Etapa do desenvolvimento:** Hardening Multi-Provider pós-Etapa 4 (`DEC-014`)
- **Objetivo do prompt:** Tornar o prompt do Agente 1 portável entre provedores (Groq `response_format: json_object` e Gemini `responseSchema`), garantindo aderência rigorosa ao contrato Zod sem depender do `responseSchema` proprietário do Google.
- **Prompt utilizado ou referência ao seu conteúdo:** `src/lib/ai/prompts.ts` (`DIAGNOSTIC_SYSTEM_INSTRUCTION`, versão `v1.1`).
- **Problema identificado na resposta:** A `v1.0` delegava o esquema exato de nomes de chaves e cardinalidade ao `responseSchema` da Gemini API; ao introduzir a Groq API gratuita (`DEC-014`) para eliminar rajadas de `503` do Google, o prompt precisava explicitar o formato JSON completo.
- **Alteração realizada:** Adicionado contrato JSON explícito com nomes de chaves, tipos, enums (`alto`/`medio`/`baixo`), cardinalidade exata (`3` itens por array, `priority` inteiro `1`, `2`, `3`) e teto de `340` caracteres em `executive_summary` (margem de segurança frente ao teto de `350`).
- **Motivo da alteração:** Portabilidade multi-provider e redução de falhas de parsing/validação Zod.
- **Resultado observado:** *Resultado Comprovado:* `POST /api/ai/diagnose` validado com `v1.1` retornando HTTP `201`, `ai_status: success` (`gemini:gemini-flash-lite-latest` após failover automático do Mistral HTTP `402`), 3 planos válidos conforme Zod e `guardrails_adjusted: 0`.

---

### PRM-004 — `creative_activator` v1.1

- **Data:** 2026-11-25
- **Etapa do desenvolvimento:** Hardening Multi-Provider pós-Etapa 4 (`DEC-014`)
- **Objetivo do prompt:** Garantir saída JSON 100% aderente ao `creativeKitOutputSchema` tanto na Groq API quanto na Gemini API, respeitando com folga os limites físicos do Display de Mesa (60 e 160 caracteres).
- **Prompt utilizado ou referência ao seu conteúdo:** `src/lib/ai/prompts.ts` (`CREATIVE_SYSTEM_INSTRUCTION`, versão `v1.1`).
- **Problema identificado na resposta:** Mesma dependência estrutural da `v1.0` no `responseSchema` proprietário da Gemini API + necessidade de margem de segurança para que modelos open-weights (Llama 3.3) não ultrapassem 60/160 caracteres.
- **Alteração realizada:** Adicionado contrato JSON explícito das 8 chaves obrigatórias e apertados os alvos de prompt para `55` chars em `table_tent_headline` (teto Zod: `60`) e `150` chars em `table_tent_body` (teto Zod: `160`).
- **Motivo da alteração:** Evitar rejeições de contrato por 1–5 caracteres excedentes em modelos alternativos.
- **Resultado observado:** *Resultado Comprovado:* `POST /api/ai/generate-kit` validado com `v1.1` retornando HTTP `201`, `ai_status: success` (`gemini:gemini-flash-lite-latest`, `latency_ms: 2597`), `status: draft`, `human_approved: false`, `table_tent_headline` com **26/60 chars** e `table_tent_body` com **134/160 chars**.

---

### PRM-005 — `diagnostic_strategist` v1.2

- **Data:** 2026-11-25
- **Etapa do desenvolvimento:** Refino de UX e Qualidade de Texto pós-Etapa 5
- **Objetivo do prompt:** Eliminar texto vago de "consultoria enlatada" no `executive_summary`, exigindo escrita direta de consultor comercial com dados concretos do restaurante, leitura explícita de resultados anteriores (quando existirem) e recomendação gastronômica específica para o tipo de cozinha.
- **Prompt utilizado ou referência ao seu conteúdo:** `src/lib/ai/prompts.ts` (`DIAGNOSTIC_SYSTEM_INSTRUCTION`, versão `v1.2`) + ampliação do teto de `executive_summary` para `520` caracteres no schema Zod (`src/lib/schemas.ts`), alvo no prompt `200–480` chars.
- **Problema identificado na resposta:** Na `v1.1`, o resumo executivo podia soar genérico e pouco diferenciado entre restaurantes ou repetir a mesma síntese mesmo quando a conta já tinha histórico de resgates.
- **Alteração realizada:**
  1. Proibição explícita de clichês abstratos no system prompt.
  2. Obrigatoriedade de citar ao menos 3 fatos concretos do perfil (categoria + bairro, dias/turnos exatos de ociosidade, ticket/benefício seguro em R$, canal atual de divulgação).
  3. Obrigatoriedade de comentar números reais de performance (resgates, conversão %, opt-in %) quando houver histórico e fechar com sugestão culinária concreta para a categoria da casa.
- **Motivo da alteração:** Aumentar percepção de personalização real e valor de negócio para o dono de restaurante durante a demonstração ao vivo.
- **Resultado observado:** *Resultado Comprovado em 2 restaurantes distintos:*
  - **Taco & Brasa (`gemini:gemini-flash-lite-latest`, `7988ms`, `ai_status: success`):** citou Vila Madalena, ticket R$ 72, almoço seg–qui, **9 resgates com 50% de conversão e 55,6% de opt-in de retorno**, Instagram e recomendou displays de mesa com porções de nachos.
  - **Dona Nena Café & Bistrô (`gemini:gemini-3.5-flash-lite`, `7783ms`, `ai_status: success`):** citou Cafeteria & Brunch em Moema, ticket R$ 54, tardes ter–qui, primeira ativação, placa no caixa, benefício de até R$ 8,10 e recomendou sobremesa cortesia ou café especial.

---

### PRM-006 — `diagnostic_strategist` v1.3

- **Data:** 2026-11-26
- **Etapa do desenvolvimento:** Auditoria Pré-Entrega — Elevação da Qualidade Analítica do Agente 1 + Governança Gemini Oficial (`DEC-018`)
- **Objetivo do prompt:** Substituir a paráfrase mecânica de campos do formulário por raciocínio comercial e gastronômico genuíno que justifique o uso de LLM, cruzando culinária × dinâmica do bairro/turno × mecânica de baixo CMV, distinguindo ativação presencial vs. recorrência (Giftback) e aplicando diagnóstico causal de funil quando houver histórico real.
- **Prompt utilizado ou referência ao seu conteúdo:** `src/lib/ai/prompts.ts` (`DIAGNOSTIC_SYSTEM_INSTRUCTION` e `buildDiagnosticUserPrompt`, versão `v1.3`), rodando exclusivamente na Google Gemini API oficial (`gemini-flash-lite-latest` / `gemini-3.5-flash-lite`, `temperature: 0.2`, timeout `15s`).
- **Problema identificado na resposta:** Na `v1.2`, em primeiras ativações (ex.: restaurante japonês na Liberdade), o `executive_summary` ainda tendia a iniciar recitando dados do cadastro (*"O [Restaurante] na [Bairro] tem ticket de R$ X e sofre ociosidade em [dias]..."*), informação já visível nos cards superiores.
- **Alteração realizada:**
  1. Proibição explícita de paráfrase mecânica com exemplos negativos no system prompt.
  2. Cruzamento obrigatório de 3 dimensões (Culinária × Contexto do Bairro/Turno × Mecânica de Margem com item nativo de alto valor percebido e baixo CMV).
  3. Distinção explícita de canal: na mesa, a cortesia de baixo CMV serve para ativar o iFood Comer Fora na hora e capturar opt-in de Giftback para trazer o cliente de volta nos dias ociosos.
  4. Matriz de diagnóstico causal de funil quando `include_performance = true` (muitas views + poucos resgates → oferta/pitch; bons resgates + baixo opt-in → reforçar gancho Giftback; alto resgate + alto opt-in → escalar turno ou reduzir custo unitário).
  5. Tom de consultor comercial sênior ("você"/"sua casa"), sem clichês, até `520` caracteres (2–3 frases), estendendo o mesmo rigor de especificidade culinária para `bottlenecks` e `opportunities`.
- **Motivo da alteração:** Elevar o valor percebido da IA generativa frente a templates determinísticos e garantir recomendações acionáveis e aderentes ao negócio real de cada parceiro.
- **Resultado observado:** *Resultado Comprovado em teste real local (primeira ativação — restaurante japonês na Liberdade, ticket R$ 100, 46 lugares, terça/quarta jantar):*
  - **Modelo registrado em `ai_runs`:** `gemini:gemini-flash-lite-latest` (`status: success`, `latency_ms: 4893`, `prompt_version: v1.3`, `guardrails_adjusted_count: 0`, zero uso de OpenRouter/Baidu).
  - **`executive_summary` gerado (375 chars):** *"Na Liberdade, o jantar de terça e quarta sofre com o esvaziamento pela forte concorrência local de rodízios e praças corporativas que fecham cedo. Para virar esse jogo, use um rolinho primavera ou guioza de baixo CMV via iFood Comer Fora para atrair o cliente que já está circulando no bairro e capturar o opt-in de Giftback na mesa, garantindo o retorno dele nos dias frios."*
  - **Especificidade em gargalos/oportunidades:** apontou desperdício de insumos frescos nas noites frias e recomendou guioza/sunomono para estimular combinados principais preservando margem de CMV.

