# TESTS AND ISSUES — COMER FORA IMPULSO

Registro contínuo de testes executados, evidências, problemas encontrados e correções aplicadas no projeto **Comer Fora Impulso**.

> **Regras de uso**
> - **Não registre como concluído algo que não foi testado.**
> - **Não invente métricas, testes ou resultados.**
> - Diferencie explicitamente **Hipótese**, **Implementação** e **Resultado Comprovado**.
> - Status permitidos para testes: `aprovado` | `reprovado` | `pendente`.
> - Status permitidos para issues: `aberto` | `em correção` | `resolvido e validado`.
> - Nunca registre credenciais, tokens ou dados pessoais reais nas evidências.

---

## Resumo do Plano de Verificação (P0 / P1)

| ID | Funcionalidade | Dimensão | Status |
|---|---|---|---|
| TST-001 | Regras determinísticas de margem, orçamento, capacidade e schemas Zod (`src/lib/business-rules.ts`) | Regras de Negócio / Riscos | `aprovado` |
| TST-002 | Schema SQL, seed inicial e persistência real no Supabase | Persistência / APIs | `aprovado` |
| TST-003 | Agente 1 (`POST /api/ai/diagnose`): JSON estruturado, pós-validação e fallback | IA / Prompts / APIs | `aprovado` |
| TST-004 | Agente 2 (`POST /api/ai/generate-kit`): geração de kit em `draft` e fallback | IA / Prompts / APIs | `aprovado` |
| TST-005 | Revisão humana (HITL), Tent Card com QR Code real e ativação demonstrativa | Jornada / Riscos | `aprovado` |
| TST-006 | Experiência mobile (`/r/[campaignId]`): registro de `view`, `redemption`, opt-in e bloqueio de teto de cupons | Jornada / Persistência | `aprovado` |
| TST-007 | Dashboard de resultados, funil real, visão NSM e loop de recorrência | Persistência / IA | `aprovado` |
| TST-008 | Segurança (zero chaves expostas no frontend), auditoria QA E2E completa e build final de produção (`npm run build`) | Segurança / APIs | `aprovado` |
| TST-009 | Passe P0+P1 pré-entrega: integridade do funil (`<= 100%`), governança Gemini oficial, isolamento de seeds, rate limiting (`429`), NSM por escopo e prompt `v1.3` | IA / APIs / Riscos / UX | `aprovado` |
| TST-010 | Automação Cloud (Campaign Pulse / Make): autenticação fail-closed, webhook outgoing, motor determinístico, endpoints internos, isolamento cross-session e proteção do Data Store (Vitest + typecheck + build) | APIs / Segurança / Riscos | `aprovado` |
| TST-011 | Validação E2E ponta a ponta em instância real do Make.com (Cenário 1 + Cenário 2 + Data Store + `campaign_automation_logs` no Supabase) | Integração Externa / E2E | `aprovado` |

---

## Modelo de Registro de Teste

```markdown
## TST-XXX — Título do teste

- **Data:** AAAA-MM-DD
- **Funcionalidade testada:** ...
- **Cenário de teste:** ...
- **Resultado esperado:** ...
- **Resultado observado:** ...
- **Status:** aprovado | reprovado | pendente
- **Problema identificado:** Nenhum / Referência a `ISS-XXX`
- **Correção implementada:** N/A / Descrição objetiva
- **Evidência ou forma de reprodução:** Comando, rota, payload ou passos exatos para reproduzir.
```

---

## Registro Detalhado de Testes

### TST-001 — Regras determinísticas de negócio, guardrails de IA e contratos Zod (Etapa 1)

- **Data:** 2026-11-25
- **Tipo:** Resultado Comprovado
- **Funcionalidade testada:** `calculateDeterministicMetrics`, `validateCampaignConstraints`, `enforcePlanGuardrails` (`src/lib/business-rules.ts`) e schemas `restaurantInputSchema` / `diagnosticAiOutputSchema` (`src/lib/schemas.ts`), além de checagem de tipos e build inicial do scaffold Next.js.
- **Cenário de teste:**
  1. Cálculo exato de prontidão, custo máximo seguro, teto operacional, capacidade ociosa e captura potencial para o perfil *Taco & Brasa*.
  2. Cap rígido de 30% sobre ticket médio mesmo quando perfil informa desconto maior.
  3. Limitação de `recommended_coupon_cap` pela capacidade operacional do salão quando orçamento é alto.
  4. Aprovação de plano válido e bloqueio de planos que excedem orçamento mensal, orçamento da campanha, margem segura ou teto operacional de assentos.
  5. Emissão de alerta (sem bloqueio) quando comprometimento >= 90% do orçamento mensal.
  6. Pós-validação (`enforcePlanGuardrails`) corrigindo automaticamente plano inseguro sugerido por IA.
  7. Rejeição Zod de cadastro inválido e de saída malformada do Agente 1.
  8. Verificação de tipos (`npm run typecheck`) e build inicial (`npm run build`).
- **Resultado esperado:** 11/11 testes unitários aprovados, zero erros de TypeScript e build Next.js bem-sucedido.
- **Resultado observado:**
  - `npm test` (`vitest run`): **11 passed (11)** em `src/lib/business-rules.test.ts` (168ms).
  - `npm run typecheck` (`tsc --noEmit`): saída limpa (código 0).
  - `npm run build` (`next build`): **Compiled successfully in 5.6s**, páginas estáticas geradas (`4/4`). *Observação:* requer acesso à rede no ambiente de build para baixar a fonte `Plus Jakarta Sans` via `next/font/google`.
- **Status:** `aprovado`
- **Problema identificado:** Nenhum.
- **Correção implementada:** N/A.
- **Evidência ou forma de reprodução:** Executar `npm test`, `npm run typecheck` e `npm run build` na raiz do projeto.

### TST-002 — Persistência real no Supabase, validação de onboarding e isolamento de sessão (Etapa 2)

- **Data:** 2026-11-25
- **Tipo:** Resultado Comprovado
- **Funcionalidade testada:** `src/middleware.ts`, `src/lib/supabase/server.ts`, `src/lib/repositories/restaurants.ts`, `GET/POST /api/restaurants`, `GET/PATCH /api/restaurants/[id]` e renderização SSR de `/`.
- **Cenário de teste:**
  1. Visitante A consulta `GET /api/restaurants` sem cookie prévio.
  2. Visitante A envia `POST /api/restaurants` com campos vazios e desconto acima de 30%.
  3. Visitante A cria um restaurante válido via `POST /api/restaurants` e consulta novamente via `GET /api/restaurants/[id]`.
  4. Visitante B (sem o cookie de sessão do Visitante A) tenta listar e acessar diretamente o ID criado pelo Visitante A.
  5. Visitante A envia `PATCH /api/restaurants/11111111-1111-4111-8111-111111111101` (seed *Brava Osteria*).
  6. Requisição SSR em `/` com o cookie do Visitante A.
  7. Limpeza dos registros temporários de teste no banco após validação.
- **Resultado esperado:** Emissão de cookie `HttpOnly`, 3 restaurantes do seed carregados, rejeição `400` para payload inválido, criação `201` com persistência confirmada (`200`), bloqueio total de acesso cruzado ao Visitante B (`404` e `leaked = false`), clonagem segura ao editar restaurante demo (`cloned_from_demo = true`) e SSR `200`.
- **Resultado observado:**
  - `GET /api/restaurants` (Visitante A): `200`, cookie `cfi_session_id` emitido com `HttpOnly: true`, 3 demos carregados (*Brava Osteria*, *Taco & Brasa*, *Dona Nena Café & Bistrô*).
  - `POST` inválido: `400` com `field_errors`.
  - `POST` válido: `201` e recarregamento `GET` retornou `200`.
  - Isolamento Visitante B: `GET /api/restaurants/[id]` retornou `404` e `leaked in list = false`.
  - `PATCH` no seed *Brava Osteria*: `cloned_from_demo = true`, novo ID criado na sessão A sem alterar o seed.
  - SSR `/`: `200` renderizando assinatura da marca e restaurantes demo.
- **Status:** `aprovado`
- **Problema identificado:** `ISS-001` (encontrado e corrigido durante a validação).
- **Correção implementada:** Normalização de `SUPABASE_URL` via `new URL(url).origin` e validação clara de protocolo em `src/lib/supabase/server.ts`.
- **Evidência ou forma de reprodução:** Executar `npm run build`, subir `npx next start` e testar os endpoints `/api/restaurants`, `/api/restaurants/[id]` e `/` com cookies de sessões distintas.

### TST-003 e TST-004 (Execução Parcial — Etapa 3: Fallback, Guardrails e Persistência)

- **Data:** 2026-11-25
- **Tipo:** Resultado Comprovado (parcial — aguardando resposta real `status = success` da Gemini API)
- **Funcionalidade testada:** `POST /api/ai/diagnose`, `POST /api/ai/generate-kit`, `src/lib/ai/orchestrator.ts`, `src/lib/ai/fallbacks.ts` e páginas `/restaurante/[id]/diagnostico`, `/restaurante/[id]/planejar` e `/campanha/[campaignId]/revisao`.
- **Cenário de teste:**
  1. Testes unitários dos fallbacks (`src/lib/ai/fallbacks.test.ts`).
  2. Chamada real a `POST /api/ai/diagnose` para *Brava Osteria*.
  3. Chamada a `POST /api/ai/generate-kit` com custo/resgate R$ 45 (acima do teto seguro de R$ 23).
  4. Chamada a `POST /api/ai/generate-kit` com plano válido retornado pelo diagnóstico.
  5. Verificação SSR das rotas `/diagnostico`, `/planejar` e `/revisao`.
- **Resultado esperado:** Rejeição `400` para plano fora da margem, criação `201` de diagnóstico e campanha em `draft` (`human_approved = false`), fallback transparente se Gemini falhar, e SSR `200` nas 3 telas.
- **Resultado observado:**
  - `npm test`: **13 passed (13)** incluindo 2 novos testes de contrato/limites 60/160 chars dos fallbacks.
  - `POST /api/ai/diagnose`: `201`, acionou `ai_status: fallback` (`latency_ms: 1724`) devido a erro `403` da chave Vertex Express (`ISS-002`), persistiu 3 planos seguros e registrou em `ai_runs`.
  - Guardrail em `POST /api/ai/generate-kit` (custo R$ 45 > R$ 23): bloqueado com `400` antes de acionar a IA.
  - `POST /api/ai/generate-kit` (plano válido): `201`, `ai_status: fallback`, `status: draft`, `human_approved: false`, `table_tent_headline` (38 chars <= 60) e `table_tent_body` (127 chars <= 160).
  - SSR `/diagnostico`, `/planejar`, `/revisao`: todas retornaram `200`.
- **Status:** `pendente` (mantido pendente na matriz até validarmos também `ai_status: success` com resposta real da Gemini API).
- **Problema identificado:** `ISS-002` (chave GCP `AQ....` com `aiplatform.googleapis.com` desabilitada).
- **Correção implementada:** Aguardando atualização da `GEMINI_API_KEY` (chave `AIza...` do Google AI Studio ou habilitação da API no GCP).
- **Evidência ou forma de reprodução:** Executar `npm test`, `npm run build` e acionar `POST /api/ai/diagnose` e `POST /api/ai/generate-kit`.

### TST-003 e TST-004 (Execução Completa com IA Real — Etapa 3 após DEC-011)

- **Data:** 2026-11-25
- **Tipo:** Resultado Comprovado
- **Funcionalidade testada:** `POST /api/ai/diagnose`, `POST /api/ai/generate-kit`, cadeia de failover de modelos Flash (`src/lib/ai/client.ts`), validação Zod, guardrails determinísticos e persistência em `diagnostics`, `campaigns` e `ai_runs`.
- **Cenário de teste:**
  1. Listagem de modelos ativos via `ai.models.list()` e sonda individual de disponibilidade/latência (`gemini-flash-latest`, `gemini-2.5-flash`, `gemini-2.5-flash-lite`, `gemini-flash-lite-latest`, `gemini-3-flash-preview`).
  2. Execução real de `POST /api/ai/diagnose` para *Brava Osteria* com failover ativo.
  3. Tentativa de `POST /api/ai/generate-kit` violando teto de margem (R$ 45 > R$ 23).
  4. Execução real de `POST /api/ai/generate-kit` com o primeiro plano retornado pelo Agente 1.
  5. Renderização SSR de `/restaurante/[id]/diagnostico`, `/restaurante/[id]/planejar` e `/campanha/[campaignId]/revisao`, seguida de limpeza dos dados temporários.
- **Resultado esperado:** Inferência real da Gemini API (`ai_status: success`) dentro de 15s, 100% aderente ao Zod e aos limites 60/160 chars, bloqueio `400` no plano inválido, campanha salva em `draft` (`human_approved: false`) e SSR `200`.
- **Resultado observado:**
  - Sonda de modelos: `gemini-2.5-flash` (`404` indisponível para novos usuários), `gemini-flash-latest` (`503` pico de demanda), `gemini-flash-lite-latest` (`200` em 993ms) e `gemini-3-flash-preview` (`200` em 1688ms).
  - Agente 1 (`POST /api/ai/diagnose`): HTTP `201`, **`ai_status: success`**, `model: gemini-3-flash-preview`, `latency_ms: 13016`, `plans: 3`, `guardrails_adjusted: 0`, `fallback_reason: none`.
  - Guardrail pré-chamada (`POST /api/ai/generate-kit` com R$ 45): bloqueado com HTTP `400`.
  - Agente 2 (`POST /api/ai/generate-kit`): HTTP `201`, **`ai_status: success`**, `model: gemini-3-flash-preview`, `latency_ms: 11885`, `status: draft`, `human_approved: false`, `table_tent_headline` com **46 chars** (<= 60) e `table_tent_body` com **140 chars** (<= 160).
  - SSR `/diagnostico`, `/planejar` e `/revisao`: HTTP `200` nas 3 rotas.
- **Status:** `aprovado`
- **Problema identificado:** `ISS-002` (resolvido via `DEC-011`).
- **Correção implementada:** Remoção de `vertexai: true` + cadeia de modelos Flash ativos (`gemini-flash-latest` → `gemini-flash-lite-latest` → `gemini-3-flash-preview`) com orçamento de `7.5s` por tentativa dentro do teto global de `15s`.
- **Evidência ou forma de reprodução:** Executar `npm run build`, subir `npx next start` e disparar `POST /api/ai/diagnose` e `POST /api/ai/generate-kit` para `11111111-1111-4111-8111-111111111101`.

### TST-005 — Edição livre do kit, aprovação humana HITL, Tent Card com QR Code real e ativação demonstrativa (Etapa 4)

- **Data:** 2026-11-25
- **Tipo:** Resultado Comprovado
- **Funcionalidade testada:** `GET/PATCH /api/campaigns/[campaignId]`, `src/components/campaign/CampaignReviewWorkspace.tsx`, `/campanha/[campaignId]/revisao` e verificação inicial de status em `/r/[campaignId]`.
- **Cenário de teste:**
  1. Geração de campanha em rascunho (`draft`) via `POST /api/ai/generate-kit` para *Brava Osteria*.
  2. Acesso a `/r/[campaignId]` enquanto `draft`.
  3. Tentativa de ativação via `PATCH /api/campaigns/[campaignId]` com `approve_and_activate: true` e `human_approved: false`.
  4. Salvamento de edição dos textos do kit em rascunho (`approve_and_activate: false`).
  5. Aprovação e ativação demonstrativa (`approve_and_activate: true`, `human_approved: true`).
  6. Renderização SSR de `/campanha/[campaignId]/revisao` verificando textos editados + QR Code SVG.
  7. Acesso a `/r/[campaignId]` sem cookie de sessão (simulando celular) após ativação.
  8. Checagens de segurança: `PATCH` na campanha seed *Taco & Brasa* (`403`) e `GET` cruzado por Visitante B (`404`).
- **Resultado esperado:** Bloqueio em `/r/[campaignId]` enquanto `draft`, rejeição `400` sem HITL, persistência das edições, ativação `active` com `human_approved = true` e `approved_at`, renderização do Tent Card com QR SVG, acesso mobile liberado após ativação, `403` no seed e `404` para outro visitante.
- **Resultado observado:**
  - Criação de rascunho via Gemini real (`ai_status: success`, `gemini-flash-lite-latest`): `201`.
  - `/r/[campaignId]` em rascunho: `200`, exibindo bloqueio *"aguardando aprovação humana"*.
  - Ativação sem HITL: bloqueada com HTTP `400`.
  - Edição de rascunho: `200`, `status: draft`, título e textos persistidos no Supabase.
  - Aprovação & ativação: `200`, `status: active`, `human_approved: true`, `approved_at` preenchido, webhook opcional ausente tratado sem erro (`webhook.configured = false`).
  - SSR `/campanha/[campaignId]/revisao`: `200`, renderizando título editado no Tent Card + `<svg` do QR Code.
  - `/r/[campaignId]` pós-ativação (sem cookie): `200`, exibindo *"Campanha Ativa para Resgate"*.
  - Segurança: `PATCH` no seed retornou `403`; Visitante B `GET` retornou `404`.
- **Status:** `aprovado`
- **Problema identificado:** Nenhum.
- **Correção implementada:** N/A.
- **Evidência ou forma de reprodução:** Executar `npm run typecheck`, `npm test`, `npm run build` e validar os endpoints `/api/campaigns/[campaignId]`, `/campanha/[campaignId]/revisao` e `/r/[campaignId]`.

### TST-006 e TST-007 — Resgate mobile (`/r/[campaignId]`), bloqueio de teto de cupons, Dashboard Recharts, NSM e Loop de Recorrência (Etapa 5)

- **Data:** 2026-11-25
- **Tipo:** Resultado Comprovado
- **Funcionalidade testada:** `POST /api/public/campaigns/[campaignId]/view`, `POST /api/public/campaigns/[campaignId]/redeem`, `GET /api/restaurants/[id]/results`, `src/components/redemption/MobileRedemptionClient.tsx`, `src/components/results/ResultsDashboardClient.tsx`, `/r/[campaignId]` e `/restaurante/[id]/resultados`.
- **Cenário de teste:**
  1. Criação de campanha para *Brava Osteria* com `coupon_limit = 2`, custo `R$ 15` e teto `R$ 30`.
  2. Tentativa de resgate antes da aprovação (`draft`).
  3. Aprovação HITL e ativação da campanha (`active`).
  4. Registro de 3 eventos `view`.
  5. Resgate #1 com `recurrence_opt_in: true` e Resgate #2 com `recurrence_opt_in: false`.
  6. Tentativa de Resgate #3 excedendo `coupon_limit = 2`.
  7. Consulta a `GET /api/restaurants/[id]/results` verificando cálculo exato de KPIs, NSM e observabilidade `ai_runs`.
  8. Acionamento do loop de recorrência (`POST /api/ai/diagnose` com `include_performance: true`).
  9. Verificação SSR de `/r/[campaignId]` e `/restaurante/[id]/resultados` + limpeza dos registros temporários.
- **Resultado esperado:** Bloqueio `400` em `draft`, 3 `view` gravados (`201`), 2 cupons `CF-XXXX` emitidos (`201`), bloqueio `409 Conflict` (`exhausted: true`) no 3º resgate, KPIs exatos (`3 views`, `2 resgates`, `66,67%` conversão, `1 opt-in`, `50%` opt-in, `R$ 30/R$ 30`), NSM atualizada, `ai_runs` populada, loop de recorrência `201` e SSR `200`.
- **Resultado observado:**
  - Criação de campanha via IA real (`gemini:gemini-flash-lite-latest`): `201`.
  - Resgate em rascunho: bloqueado com HTTP `400`.
  - 3 eventos `view`: `201` em todos.
  - Resgate #1 (`CF-452V`, `remaining: 1`) e Resgate #2 (`CF-MZM8`, `remaining: 0`): `201`.
  - Resgate #3 acima do teto: bloqueado com HTTP `409` (`exhausted: true`).
  - `GET /api/restaurants/[id]/results`: `200`, `total_views: 3`, `total_redemptions: 2`, `conversion_rate_pct: 66.67`, `total_opt_ins: 1`, `recurrence_opt_in_rate_pct: 50`, `budget_used: 30`, `nsm_qualified_activation_rate_pct: 66.67%`, `ai_runs: 1`.
  - Loop de recorrência `POST /api/ai/diagnose`: `201` (degradou com transparência para `fallback` em `11682ms` sob pico de demanda).
  - SSR `/r/[campaignId]` e `/restaurante/[id]/resultados`: `200` em ambas.
- **Status:** `aprovado`
- **Problema identificado:** Nenhum.
- **Correção implementada:** N/A.
- **Evidência ou forma de reprodução:** Executar `npm run typecheck`, `npm test`, `npm run build` e validar os endpoints públicos `/view`, `/redeem`, `/results` e o loop de recorrência.

### TST-008 — Auditoria Final de QA (6 Pilares), Segurança, Resiliência e Build de Produção (Etapa 6)

- **Data:** 2026-11-25
- **Tipo:** Resultado Comprovado
- **Funcionalidade testada:** Integridade de build/tipagem/assets, fluxo E2E completo (A–F) em servidor de produção local (`next start`), segurança (varredura de segredos e `process.env` em componentes `"use client"`), resiliência de rotas inválidas, conformidade de marca/copy/PII, responsividade `375px`/`1280px` e higienização do Supabase.
- **Cenário de teste:**
  1. Verificação de tipos (`npx tsc --noEmit`), testes unitários (`npm test`) e build de produção (`npm run build`).
  2. Verificação HTTP dos assets (`/ifood-logo.webp`, `/ifood-logo.png`, `/icon.png`).
  3. Varredura estática por `process.env` em arquivos `"use client"`, segredos hardcoded, grafia incorreta de `iFood`, jargão técnico nas telas do parceiro e coleta de PII.
  4. Execução automatizada E2E contra `next start` + Supabase + provedores de IA cobrindo: 3 seeds + criação de restaurante, zero-state sem `NaN`/`Infinity`, diagnóstico híbrido (`/api/ai/diagnose`), 3 guardrails negativos (`cupons×custo > orçamento`, `desconto > max_discount_pct / > 30%`, `cupons > teto operacional`), geração de kit em `draft`, bloqueio pré-aprovação em `/r/[id]` e `/redeem`, edição + aprovação HITL, `view` + 2 resgates (`CF-XXXX`, opt-in anônimo) + 3º resgate bloqueado com `409`, conferência exata de KPIs/NSM/`ai_runs` e re-diagnóstico com histórico.
  5. Teste de resiliência em `/restaurante/id-invalido/diagnostico` e `/r/inexistente` antes e depois da criação de `not-found.tsx`/`error.tsx`.
  6. Limpeza de todos os registros não-seed no Supabase (mantendo apenas os 3 seeds limpos).
- **Resultado esperado:** Todos os 6 fluxos E2E aprovados, zero segredos ou `process.env` no cliente, zero PII, páginas 404 amigáveis em PT-BR, build final verde e Supabase higienizado.
- **Resultado observado:**
  - Fluxos A–F: **100% aprovados** com IA real (`gemini:gemini-flash-lite-latest`, `gemini:gemini-3.5-flash-lite`, `openrouter:baidu/ernie-5.5-flash-preview:free`), guardrails `400`, bloqueio de estouro de cupons `409` e zero `NaN`/`Infinity`.
  - Segurança & Copy: **0 referências** a `process.env` em componentes client, **0 segredos** no código/docs, **0 grafias incorretas** de `iFood`, **0 coleta de PII**.
  - Issues encontrados e corrigidos na mesma bateria: `ISS-007` (`not-found.tsx`/`error.tsx` e responsividade `375px`) e `ISS-008` (`maxDuration = 30` nas rotas de IA).
  - Supabase higienizado: exatamente os 3 restaurantes seed (`Brava Osteria`, `Taco & Brasa`, `Dona Nena Café & Bistrô`).
  - Revalidação final pós-correções: `npx tsc --noEmit` (0 erros), `npm test` (13/13), `npm run build` (sucesso) e rotas inválidas renderizando 404 amigável em PT-BR.
- **Status:** `aprovado`
- **Problema identificado:** `ISS-007` e `ISS-008` (ambos resolvidos e validados).
- **Correção implementada:** Criação de `src/app/not-found.tsx` e `src/app/error.tsx`, ajuste responsivo em `ResultsDashboardClient.tsx` e `AppHeader.tsx`, e `export const maxDuration = 30` em `/api/ai/diagnose` e `/api/ai/generate-kit`.
- **Evidência ou forma de reprodução:** Executar `npx tsc --noEmit`, `npm test`, `npm run build`, subir `npx next start` e validar as rotas de API e `/restaurante/id-invalido/diagnostico`.

### TST-009 — Passe P0+P1 Pré-Entrega: Integridade do Funil, Governança Gemini Oficial, Rate Limit, NSM Transparente e Prompt `v1.3`

- **Data:** 2026-11-26
- **Tipo:** Resultado Comprovado
- **Funcionalidade testada:** `src/lib/funnel-metrics.ts`, `src/lib/rate-limit.ts`, `src/lib/ai/client.ts` (Gemini oficial only), `src/lib/ai/prompts.ts` (`v1.3`), `src/lib/repositories/results.ts` (`ecosystem_session_only` vs. `ecosystem`), `src/app/api/public/campaigns/[campaignId]/redeem/route.ts`, `view/route.ts`, `MobileRedemptionClient.tsx`, `DiagnosticView.tsx`, `OnboardingWorkspace.tsx` e `ResultsDashboardClient.tsx`.
- **Cenário de teste:**
  1. Checagem de tipos (`npx tsc --noEmit`), suíte unitária expandida (`npm test`, incluindo `funnel-metrics.test.ts` e `rate-limit.test.ts`) e build de produção (`npm run build`).
  2. Teste real contra servidor local (`npx next start`) criando um restaurante japonês na Liberdade (*Sushi Mais Liberdade*), chamando `POST /api/ai/diagnose` (`v1.3`) e inspecionando `GET /api/restaurants/[id]/results` (`ai_runs`, `ecosystem_session_only`, `ecosystem`).
  3. Limpeza do restaurante, diagnóstico e `ai_runs` de teste no Supabase confirmando preservação exclusiva dos 3 seeds.
- **Resultado esperado:** Zero erros TypeScript, 19/19 testes unitários aprovados, build limpo, `executive_summary` `v1.3` sem paráfrase mecânica gerado exclusivamente por modelo oficial Gemini (`ai_status: success`), `ecosystem_session_only` sem vazamento de eventos `demo_seed` e banco higienizado com 3 seeds.
- **Resultado observado:**
  - `npx tsc --noEmit`: **0 erros**.
  - `npm test`: **19 passed (19)** em 4 arquivos (`business-rules.test.ts` 11, `fallbacks.test.ts` 2, `funnel-metrics.test.ts` 4, `rate-limit.test.ts` 2).
  - `npm run build`: **Compiled successfully in 12.6s** (7/7 páginas estáticas + rotas dinâmicas).
  - Teste ao vivo `POST /api/ai/diagnose` (`v1.3`): **`ai_status: success`**, **`model: gemini:gemini-flash-lite-latest`** registrado em `ai_runs` (zero chamada a OpenRouter/Baidu), `latency_ms: 4893`, `guardrails_adjusted_count: 0`, `executive_summary` de 375 caracteres com cruzamento Culinária × Bairro/Turno × CMV (rolinho primavera/guioza + opt-in de Giftback na mesa).
  - Separação NSM verificada na resposta de `/results`: `ecosystem_session_only` retornou `{ total_restaurants: 1, qualified: 0, redemptions: 0 }` enquanto `ecosystem` (base completa) retornou `{ total_restaurants: 4, qualified: 1, redemptions: 9 }`.
  - Limpeza Supabase confirmada: exatamente os 3 restaurantes seed intactos (*Brava Osteria*, *Dona Nena Café & Bistrô*, *Taco & Brasa*).
- **Status:** `aprovado`
- **Problema identificado:** `ISS-009` (funil > 100% no QA-11) e `ISS-010` (fallback para OpenRouter/Baidu em `ai_runs`) — ambos resolvidos e validados.
- **Correção implementada:** `DEC-018` e `DEC-019`.
- **Evidência ou forma de reprodução:** Executar `npx tsc --noEmit`, `npm test`, `npm run build` e acionar `POST /api/ai/diagnose` em servidor local.

### TST-010 — Automação Cloud (Campaign Pulse / Make): Autenticação, Webhook, Motor Determinístico e Endpoints Internos

- **Data:** 2026-11-27
- **Tipo:** Resultado Comprovado (validação automatizada local; E2E real no Make permanece em `TST-011`)
- **Funcionalidade testada:** `src/lib/automation/auth.ts`, `src/lib/automation/schemas.ts`, `src/lib/automation/campaign-pulse.ts`, `src/lib/automation/webhook.ts`, `src/lib/repositories/campaign-monitor.ts`, `GET /api/internal/campaign-monitor`, `POST /api/internal/campaign-monitor/alerts` e `PATCH /api/campaigns/[campaignId]`.
- **Cenário de teste (13 cenários cobertos em 16 testes automatizados):**
  1. Webhook outgoing com payload válido, `x-make-apikey`, `X-Idempotency-Key` e `X-Automation-Timestamp`, priorizando `MAKE_WEBHOOK_URL` e sem fallback para `N8N_WEBHOOK_URL`.
  2. Autenticação inválida do webhook (`HTTP 401` do Make) absorvida sem bloquear a ativação.
  3. Bloqueio fail-closed quando `AUTOMATION_ALLOWED_SESSION_ID` está ausente e rejeição Zod de payload inválido.
  4. Segredo ausente/incorreto (`401`), timestamp expirado (`401`) e env vars ausentes (`503` fail-closed).
  5. Falha temporária e timeout do webhook sem lançar exceção.
  6. `GET /api/internal/campaign-monitor` retornando apenas campanhas ativas e aprovadas com `estimated_budget_used` e `estimated_budget_utilization_pct`.
  7. Tentativas de acesso cross-session via `session_id` (`403`) ou `campaign_id` de outra sessão (`not_found` no `GET` e `404` no `POST`).
  8. Exclusão de eventos `source = 'demo_seed'` em campanhas criadas por visitantes.
  9. Deduplicação de alertas por `idempotency_key` (`201 recorded: true` seguido de `200 deduplicated: true`).
  10. Campanhas `paused`/`completed` excluídas da listagem ativa, sinalizadas com `campaign_monitor_state: "inactive"` + `should_untrack: true` na consulta por ID e rejeitadas com `409` em `POST /alerts`.
  11. Falha temporária de consulta (`500`/`503`/timeout) validando que `shouldUntrackFromOperationalIndex` retorna `false` e nunca autoriza limpeza indevida do Data Store.
  12. Rejeição `400` para `notification_status: "sent"`/`"failed"` quando `notification_channel: "none"`, aceitando `"recorded"` para registro interno.
  13. Registro válido de alerta em `campaign_automation_logs` confirmando zero mutações na tabela `campaigns`.
- **Resultado esperado:** Zero erros TypeScript, todos os testes unitários e de rotas internos aprovados e build de produção limpo.
- **Resultado observado:**
  - `npm run typecheck` (`tsc --noEmit`): **0 erros** (código 0).
  - `npm test` (`vitest run`): **6 arquivos, 35 passed (35)** em 2.73s (`automation.test.ts` 11, `route.test.ts` 5, `business-rules.test.ts` 11, `funnel-metrics.test.ts` 4, `fallbacks.test.ts` 2, `rate-limit.test.ts` 2).
  - `npm run build` (`next build`): **Compiled successfully in 18.5s**, 9/9 páginas estáticas geradas, rotas `/api/internal/campaign-monitor` e `/api/internal/campaign-monitor/alerts` compiladas sem erros.
- **Status:** `aprovado`
- **Problema identificado:** Nenhum bloqueio estrutural (ajustada apenas tipagem `Record<string, string | undefined>` em vez de `NodeJS.ProcessEnv` nos helpers de ambiente para compatibilidade com `tsc --noEmit`).
- **Correção implementada:** `DEC-020`.
- **Evidência ou forma de reprodução:** Executar `npm run typecheck`, `npm test` e `npm run build`.

### TST-011 — Validação Ponta a Ponta em Instância Real do Make.com (Campaign Activation + Campaign Pulse)

- **Data:** 2026-11-27
- **Tipo:** Resultado Comprovado
- **Funcionalidade testada:** Fluxo completo em produção (Vercel + Make.com Free + Supabase): ativação HITL → *Custom Webhook* Make (API Key nativa `x-make-apikey`) → Data Store `campaign_pulse_index` → `POST /api/internal/campaign-monitor/alerts` (`ACTIVATION_REGISTERED`, `notification_status = 'recorded'`) → visualizações reais em `/r/[campaignId]` → execução do Cenário 2 (`GET /api/internal/campaign-monitor` + Router + `POST /alerts` gravando `NO_REDEMPTIONS`) → reexecução imediata validando deduplicação.
- **Cenário de teste:**
  1. Aplicação da migration `supabase/migrations/20261127_campaign_automation_logs.sql` com RLS *default-deny* confirmado no Supabase Studio.
  2. Configuração de `MAKE_WEBHOOK_URL`, `AUTOMATION_WEBHOOK_SECRET`, `AUTOMATION_API_SECRET` e `AUTOMATION_ALLOWED_SESSION_ID` em *Production* na Vercel.
  3. Ativação HITL de campanha real na sessão autorizada acionando o Cenário 1 (`Campaign Activation`, trigger *Instant*).
  4. Abertura do link `/r/[campaignId]` para atingir `>= 5` visualizações reais sem resgate, seguida de execução manual (`Run once`) do Cenário 2 (`Campaign Pulse`).
  5. Segunda execução imediata (`Run once`) do Cenário 2 para comprovar prevenção de alertas duplicados e economia de operações.
- **Resultado esperado:** Ambos os cenários executando com `Success` no histórico do Make, persistência íntegra em `campaign_automation_logs` (2 linhas: `ACTIVATION_REGISTERED` e `NO_REDEMPTIONS`), zero duplicação na reexecução e consumo observado coerente com a estimativa teórica.
- **Resultado observado:**
  - **Cenário 1 (`Campaign Activation` — Instant):** `Success` em `1s`, consumo observado de **3 créditos / 3 operações** (`2,0 KB`); registro criado no Data Store `campaign_pulse_index` (`active = true`) e linha `ACTIVATION_REGISTERED` (`notification_status = 'recorded'`) persistida em `campaign_automation_logs`.
  - **Cenário 2 (`Campaign Pulse` — 1ª execução com alerta `NO_REDEMPTIONS`):** `Success` em `2s`, consumo observado de **3 créditos / 3 operações** (`3,8 KB`); linha `NO_REDEMPTIONS` com mensagem e recomendação persistida em `campaign_automation_logs`.
  - **Cenário 2 (`Campaign Pulse` — 2ª execução imediata / deduplicação):** `Success` em `< 1s`, consumo observado de **2 créditos / 2 operações** (`2,3 KB`); filtro `already_logged_in_window == false` barrou a Rota B e o Supabase permaneceu com exatamente **2 linhas** (zero duplicidade).
  - **Proteção de falhas observada ao vivo:** durante o ajuste de mapeamento do Data Store (`Record`), o Error Handler (`Skip`) do `HTTP [2]` absorveu HTTP `400` sem remover nenhum registro do Data Store.
  - **Consumo observado vs. estimativa teórica:** exatamente alinhado à estimativa teórica por módulo e por bundle (`3 ops` no Cenário 1 sem notificação externa; `3 ops` no Cenário 2 com 1 alerta; `2 ops` no Cenário 2 sem novo alerta para 1 campanha ativa).
- **Status:** `aprovado`
- **Problema identificado:** `ISS-011` (offset `+00:00` do Supabase em `approved_at`, corrigido antes da validação final).
- **Correção implementada:** `ISS-011` (`z.string().datetime({ offset: true })` e normalização UTC em `buildActivationWebhookPayload`).
- **Evidência ou forma de reprodução:** Histórico real dos 2 cenários ativos no Make.com (Free plan) + linhas auditáveis em `public.campaign_automation_logs` no Supabase.

---

## Modelo de Registro de Problemas (Issues)

```markdown
## ISS-XXX — Título curto do problema

- **Data:** AAAA-MM-DD
- **Status:** aberto | em correção | resolvido e validado
- **Funcionalidade / Módulo afetado:** ...
- **Problema identificado:** ...
- **Impacto / Risco:** ...
- **Causa raiz:** (Informar se é Hipótese ou Confirmada)
- **Correção implementada:** ...
- **Evidência ou forma de reprodução:** ...
```

---

## Registro de Problemas e Correções

### ISS-001 — Erro `Invalid path specified in request URL` ao conectar ao Supabase com caminho `/rest/v1/`

- **Data:** 2026-11-25
- **Status:** `resolvido e validado`
- **Funcionalidade / Módulo afetado:** `src/lib/supabase/server.ts` (integração com Supabase)
- **Problema identificado:** Na primeira tentativa de integração real da Etapa 2, o cliente `@supabase/supabase-js` retornou erro `500` (`Invalid supabaseUrl` inicialmente quando o campo continha chave publishable e, após atualização para a URL da aba *Data API*, `Invalid path specified in request URL` por conter o sufixo `/rest/v1/`).
- **Impacto / Risco:** Indisponibilidade completa de leitura/escrita no banco em caso de URL copiada com sufixo `/rest/v1/` no `.env.local` ou na Vercel.
- **Causa raiz:** Confirmada — o SDK `@supabase/supabase-js` espera apenas o `origin` (`https://<projeto>.supabase.co`) e acrescenta `/rest/v1/` internamente.
- **Correção implementada:** Adicionada validação explícita de protocolo `https?://` com mensagem diagnóstica (`SupabaseConfigError`) e normalização automática via `new URL(url).origin` em `src/lib/supabase/server.ts`.
- **Evidência ou forma de reprodução:** Reexecução do fluxo de integração `TST-002` retornou `200`/`201` em todas as operações reais contra o Supabase.

### ISS-002 — Falhas HTTP 403 (`vertexai: true`), HTTP 404 (`gemini-2.5-flash`) e pico 503 (`gemini-flash-latest`) na Gemini API

- **Data:** 2026-11-25
- **Status:** `resolvido e validado`
- **Funcionalidade / Módulo afetado:** `src/lib/ai/client.ts` / `src/lib/ai/orchestrator.ts` / `POST /api/ai/diagnose` / `POST /api/ai/generate-kit`
- **Problema identificado:** Três falhas encadeadas foram observadas em testes reais contra a API do Google: (1) o flag `vertexai: true` adicionado para chaves `AQ.` causou HTTP `403` (`aiplatform.googleapis.com` desabilitada); (2) ao remover `vertexai: true`, `gemini-2.5-flash` retornou HTTP `404` (*no longer available to new users*); (3) `gemini-flash-latest` apresentou picos de HTTP `503` (*high demand*) e, sem orçamento por tentativa, a cadeia excedia `15s`.
- **Impacto / Risco:** Sem failover de modelo e orçamento por tentativa, a aplicação degradaria para fallback determinístico mesmo com outros modelos Flash ativos na chave.
- **Causa raiz:** Confirmada via `ai.models.list()` e sonda direta de modelos — necessidade de chamar a Gemini Developer API sem `vertexai: true` e usar cadeia de modelos Flash ativos com controle de tempo por tentativa.
- **Correção implementada:** Removido `vertexai: true`, configurada a cadeia `gemini-flash-latest` → `gemini-flash-lite-latest` → `gemini-3-flash-preview` com `PER_ATTEMPT_MAX_MS = 7500` dentro de `GEMINI_TIMEOUT_MS = 15000`, e atualizado `orchestrator.ts` para gravar em `ai_runs.model` o modelo real que respondeu (`DEC-011`).
- **Evidência ou forma de reprodução:** Reexecução de `TST-003` e `TST-004` validou `ai_status: success` real em ambos os agentes (`gemini-3-flash-preview`, `13016ms` e `11885ms`), mantendo o fallback determinístico como última linha de defesa.

### ISS-003 — Inputs monetários rejeitavam números decimais no navegador (`step="5"` / `step="0.5"`)

- **Data:** 2026-11-25
- **Status:** `resolvido e validado`
- **Funcionalidade / Módulo afetado:** `src/components/planner/CampaignPlannerView.tsx` e `src/components/onboarding/OnboardingWorkspace.tsx`
- **Problema identificado:** Em teste manual no navegador (pt-BR), ao preencher `791,2` em *Orçamento limite da campanha* (resultado de `43 × 18,4`), a validação nativa HTML5 bloqueava o envio exibindo *"Insira um valor válido. Os dois valores válidos mais próximos são 791 e 796"*.
- **Impacto / Risco:** Impedia o usuário de avançar com valores decimais legítimos gerados pelo próprio plano recomendado ou digitados manualmente.
- **Causa raiz:** Confirmada — atributos `step="5"` e `step="0.5"` em `<input type="number">` restringiam a grade de valores aceitos pelo navegador.
- **Correção implementada:** Alterados todos os campos monetários e percentuais (`budget_limit`, `estimated_cost_per_redemption`, `avg_ticket`, `monthly_promo_budget`, `max_discount_pct`) para `step="any"`, mantendo a validação numérica e de guardrails em `Zod` e `lib/business-rules.ts`.
- **Evidência ou forma de reprodução:** `npm run typecheck`, `npm test` (13/13) e `npm run build` aprovados sem erros; valores decimais como `791,20` e `18,40` aceitos sem bloqueio de `step`.

### ISS-004 — Erro 404 ao clicar em "5. Resultados" antes da Etapa 5

- **Data:** 2026-11-25
- **Status:** `resolvido e validado`
- **Funcionalidade / Módulo afetado:** `src/app/restaurante/[id]/resultados/page.tsx` e navegação de `AppHeader.tsx`
- **Problema identificado:** O link *"5. Resultados"* no cabeçalho apontava para `/restaurante/[id]/resultados`, que ainda não havia sido criado (previsto para a Etapa 5), gerando erro `404`.
- **Impacto / Risco:** Violação de experiência do usuário (link quebrado na barra principal).
- **Causa raiz:** Confirmada — rota ainda não implementada no estágio 3.
- **Correção implementada:** Criada a página real `/restaurante/[id]/resultados/page.tsx` conectada ao Supabase (exibindo KPIs reais de visualizações, resgates, conversão, opt-in e orçamento utilizado + lista de campanhas registradas), que será expandida na Etapa 5 com Recharts, `/r/[campaignId]` e aba NSM.
- **Evidência ou forma de reprodução:** Verificação SSR retornou HTTP `200` para `/restaurante/[id]/resultados`.

### ISS-005 — Timeouts intermitentes em failover sequencial sob picos `503` da Gemini API

- **Data:** 2026-11-25
- **Status:** `resolvido e validado`
- **Funcionalidade / Módulo afetado:** `src/lib/ai/client.ts` e `src/components/diagnostic/DiagnosticView.tsx`
- **Problema identificado:** Inspeção direta da tabela `ai_runs` no Supabase após teste manual do usuário mostrou `latency_ms: 15019` e `status: fallback` (`Tempo limite excedido no modelo gemini-3-flash-preview`), pois o failover sequencial perdia tempo em modelos congestionados (`503`) e no *thinking* padrão do `gemini-3-flash-preview`.
- **Impacto / Risco:** Maior incidência de fallback determinístico durante picos temporários de demanda na API do Google.
- **Causa raiz:** Confirmada via telemetria de `ai_runs` e benchmark paralelo dos modelos — picos reais de `503 UNAVAILABLE` nos endpoints Flash do Google combinados com espera sequencial e *thinking* longo.
- **Correção implementada:** Adotadas chamadas paralelas *hedged* (`Promise.any`) em até 3 ondas curtas (`5.5s`) com `ThinkingLevel.MINIMAL` nos modelos Gemini 3 (`DEC-012`), além de botão de 1 clique *"Tentar novamente com Gemini API"* no banner de fallback.
- **Evidência ou forma de reprodução:** Em teste ao vivo pós-correção, o Agente 2 respondeu com `ai_status: success` via `gemini-flash-lite-latest` em `1532ms` e `3929ms`; durante rajadas globais de `503` do Google (confirmadas via sonda direta nos 3 modelos), o sistema continuou degradando de forma transparente para fallback dentro de `15s`.
- **Atualização Multi-Provider (`DEC-014`):** Validada diretamente a chave `OPENROUTER_API_KEY` com HTTP `200` em `1413ms` (`baidu/ernie-5.5-flash-preview:free`) e `1482ms` (`particle-ai/particle-1:free`). Com a corrida paralela OpenRouter + Gemini e pré-validação Zod em `src/lib/ai/client.ts`, ambos os agentes responderam com **`ai_status: success`** em execução consecutiva: Agente 1 em **`5271ms`** (`gemini:gemini-3.5-flash-lite`, `guardrails_adjusted: 0`) e Agente 2 em **`2268ms`** (`gemini:gemini-flash-lite-latest`, Tent Card 27/60 e 132/160 chars).

### ISS-006 — Corte prematuro de onda em `8.5s` abortando OpenRouter (`11s–13s`) e causando fallback desnecessário

- **Data:** 2026-11-25
- **Status:** `resolvido e validado`
- **Funcionalidade / Módulo afetado:** `src/lib/ai/client.ts` e `src/lib/ai/orchestrator.ts`
- **Problema identificado:** Em teste manual do usuário na tela de Diagnóstico, a chamada caiu em `fallback` após `15008ms` com erro de `particle-ai/particle-1:free` (`429`) e timeout de `6s` no Gemini.
- **Impacto / Risco:** Abortava respostas válidas do OpenRouter antes de concluírem, aumentando a taxa de fallback durante picos do Gemini.
- **Causa raiz:** Confirmada por medição direta — `openrouter/free` (`baidu/ernie-5.5-flash-preview:free`) gerava JSON 100% válido para o Agente 1 em `11.0s–13.2s`, mas o `AbortController` da Onda 1 (`8.5s`) cancelava a requisição 2,5s antes de concluir; além disso, `gemma-4-26b-a4b-it:free` e `particle-ai/particle-1:free` sofriam `429` upstream no OpenRouter.
- **Correção implementada:** Substituídas as 2 ondas com corte em `8.5s` por uma **corrida paralela única de `25s`** entre `openrouter/free`, `baidu/ernie-5.5-flash-preview:free`, `gemini-flash-lite-latest` e `gemini-3.5-flash-lite` (removendo os modelos com `429`), somada a normalizadores defensivos (`normalizeDiagnosticCandidate` / `normalizeCreativeCandidate`) antes do Zod.
- **Evidência ou forma de reprodução:** Validação ao vivo após limpeza de cache e build limpo retornou `ai_status: success` nos 2 agentes consecutivos — Agente 1 em `4321ms` (`gemini:gemini-3.5-flash-lite`) e Agente 2 em `5336ms` (`gemini:gemini-flash-lite-latest`), enquanto a sonda direta comprovou `openrouter/free` retornando JSON completo em `11001ms` dentro da nova janela de `25s`.

### ISS-007 — Ausência de `not-found.tsx`/`error.tsx` em PT-BR e risco de overflow no seletor de abas em `375px`

- **Data:** 2026-11-25
- **Status:** `resolvido e validado`
- **Funcionalidade / Módulo afetado:** `src/app/not-found.tsx`, `src/app/error.tsx`, `src/components/results/ResultsDashboardClient.tsx`, `src/components/AppHeader.tsx`
- **Problema identificado:** Na auditoria QA pré-deploy (`TST-008`), rotas com IDs inválidos (`/restaurante/id-invalido/diagnostico`, `/r/inexistente`) exibiam o 404 padrão em inglês do Next.js sem botão de retorno; adicionalmente, em largura `375px`, o `tablist` em `ResultsDashboardClient.tsx` usava `inline-flex` sem empilhamento e a faixa utilitária superior ficava espremida.
- **Impacto / Risco:** Experiência quebrada em links inválidos e possível overflow horizontal em telas mobile pequenas.
- **Causa raiz:** Confirmada — arquivos de boundary (`not-found.tsx`/`error.tsx`) ainda não criados e ausência de breakpoint mobile no `tablist`.
- **Correção implementada:** Criados `src/app/not-found.tsx` e `src/app/error.tsx` em PT-BR na identidade iFood; ajustado `tablist` para `grid-cols-1 sm:inline-flex` e compactado o rótulo da faixa utilitária no mobile (`DEC-017`).
- **Evidência ou forma de reprodução:** Build final (`npm run build`) aprovado e acesso a `/restaurante/id-invalido/diagnostico` e `/r/inexistente` validado exibindo *"Página ou campanha não encontrada"* + botão *"Voltar para o início"*.

### ISS-008 — Risco de timeout serverless padrão (`10s`) na Vercel para chamadas de IA (`25s`)

- **Data:** 2026-11-25
- **Status:** `resolvido e validado`
- **Funcionalidade / Módulo afetado:** `src/app/api/ai/diagnose/route.ts` e `src/app/api/ai/generate-kit/route.ts`
- **Problema identificado:** O gateway multi-provider opera com orçamento de `25s` (para acomodar respostas válidas de `11s–13s` do OpenRouter), mas as rotas de API não declaravam `maxDuration` explícito para o runtime serverless da Vercel.
- **Impacto / Risco:** Possibilidade de `HTTP 504 FUNCTION_INVOCATION_TIMEOUT` em produção antes do término da corrida multi-provider ou do fallback.
- **Causa raiz:** Confirmada por inspeção pré-deploy das rotas de IA.
- **Correção implementada:** Exportado `export const maxDuration = 30;` em ambos os Route Handlers de IA (`DEC-017`).
- **Evidência ou forma de reprodução:** Compilação limpa verificada em `npm run build` após adição da diretiva.

### ISS-009 — Conversão de funil acima de 100% (`views = 1`, `redemptions = 2`) ao simular novo cliente ou chamar `/redeem` diretamente

- **Data:** 2026-11-26
- **Status:** `resolvido e validado`
- **Funcionalidade / Módulo afetado:** `MobileRedemptionClient.tsx`, `POST /api/public/campaigns/[campaignId]/redeem`, `src/lib/repositories/results.ts`, `src/lib/repositories/diagnostics.ts`
- **Problema identificado:** No QA-11, clicar em *"Simular outro cliente na mesa"* apenas limpava o estado local (`setIssuedCoupon(null)`) sem registrar novo evento `view`, gerando `views = 1` e `redemptions = 2` (conversão de `200%`).
- **Impacto / Risco:** Quebra de integridade analítica no dashboard de resultados e no gráfico de funil.
- **Causa raiz:** Confirmada — ausência de nova chamada `/view` na simulação de segundo cliente e ausência de guarda `effectiveViews = Math.max(views, redemptions)` no backend/repositório.
- **Correção implementada:** Adicionada chamada real `POST /view` no botão *"Simular outro cliente na mesa"*, auto-registro de `view` em `POST /redeem` quando `views <= used` e normalização `computeSafeFunnelMetrics` (`src/lib/funnel-metrics.ts`) travando `Visualizações >= Resgates >= Opt-in` e taxas em `[0%, 100%]` (`DEC-019`).
- **Evidência ou forma de reprodução:** Testes unitários em `src/lib/funnel-metrics.test.ts` (4/4 aprovados) + verificação no build final (`TST-009`).

### ISS-010 — Risco de governança de dados por fallback de IA para modelos gratuitos de terceiros (`openrouter:baidu/ernie-5.5-flash-preview:free`)

- **Data:** 2026-11-26
- **Status:** `resolvido e validado`
- **Funcionalidade / Módulo afetado:** `src/lib/ai/client.ts`, `.env.example`, `README.md`
- **Problema identificado:** Em `ai_runs` do QA-11, a corrida multi-provider encaminhou dados do restaurante para um modelo preview gratuito de terceiro via OpenRouter (`baidu/ernie-5.5-flash-preview:free`).
- **Impacto / Risco:** Risco de governança/retenção de dados de restaurantes parceiros do iFood e qualidade instável de resposta.
- **Causa raiz:** Confirmada — inclusão de provedores OpenAI-compatible gratuitos de terceiros na cadeia ativa em `DEC-014`.
- **Correção implementada:** Removido completamente OpenRouter e provedores gratuitos de terceiros de `src/lib/ai/client.ts`; cadeia restrita aos 2 modelos oficiais da Google Gemini API (`gemini-flash-lite-latest`, `gemini-3.5-flash-lite`) com timeout controlado de `15s` e fallback determinístico local transparente (`DEC-018`).
- **Evidência ou forma de reprodução:** Validação ao vivo (`TST-009`) registrou exclusivamente `gemini:gemini-flash-lite-latest` em `ai_runs` (`status: success`, `4893ms`).

### ISS-011 — Validação Zod do webhook rejeitava `approved_at` com offset `+00:00` retornado pelo PostgreSQL/Supabase

- **Data:** 2026-11-27
- **Status:** `resolvido e validado`
- **Funcionalidade / Módulo afetado:** `src/lib/automation/schemas.ts`, `src/lib/automation/webhook.ts`
- **Problema identificado:** No teste ao vivo na Vercel contra o Custom Webhook do Make, `PATCH /api/campaigns/[campaignId]` retornou `webhook.delivered = false` com `"Payload de ativação rejeitado pela validação de contrato"`.
- **Impacto / Risco:** Impedia o disparo do webhook de ativação para o Make (sem afetar a ativação local da campanha no Supabase).
- **Causa raiz:** Confirmada — o PostgREST/Supabase retorna colunas `timestamptz` com sufixo `+00:00` (ex.: `2026-11-27T20:04:00.123456+00:00`), e `z.string().datetime()` no Zod v3 exige sufixo `Z` a menos que `{ offset: true }` seja informado.
- **Correção implementada:** Atualizado `activationWebhookPayloadSchema` para `z.string().datetime({ offset: true })`, normalizado `approved_at` para ISO UTC (`Z`) em `buildActivationWebhookPayload` e adicionado teste de regressão em `src/lib/automation/automation.test.ts`.
- **Evidência ou forma de reprodução:** `npm run typecheck` e `npm test` aprovados com teste dedicado para `2026-11-27T20:04:00.123456+00:00`.

