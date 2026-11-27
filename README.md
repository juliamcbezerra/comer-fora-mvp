# iFood | Comer Fora Up

> **Protótipo Conceitual • Ambiente de demonstração com dados fictícios**
> Central Inteligente de Ativação Presencial para restaurantes parceiros do **iFood Comer Fora** — construída para o desafio iFood GenAI / AI Builder (Opção 2: *Restaurante que ganha*).

---

## 1. Visão Geral

O **Comer Fora Up** combina **regras financeiras determinísticas**, **2 agentes especializados de IA generativa** (com saída JSON estruturada validada por Zod e fallback determinístico transparente), **aprovação humana obrigatória (Human-in-the-Loop)** e **persistência real em PostgreSQL (Supabase)** para ajudar restaurantes parceiros a:

1. Diagnosticar gargalos e oportunidades de ocupação no salão nos horários de menor movimento.
2. Planejar campanhas protegidas contra estouro de orçamento, erosão de margem (teto rígido de 30% do ticket médio) e superlotação operacional.
3. Gerar kits completos de ativação presencial (display de mesa imprimível com QR Code real, script de equipe de 15s, copy de divulgação e gancho de retorno/Giftback).
4. Medir acessos, resgates de cupons (`CF-XXXX`) com controle de estoque server-side e interesse anônimo em recorrência, alimentando o próximo ciclo de recomendação.

### Princípios de Segurança, Privacidade e Conformidade
- **Zero chaves no frontend:** todas as chamadas de IA e operações no Supabase ocorrem exclusivamente em Next.js Route Handlers server-side.
- **Zero PII:** nenhum dado pessoal real (nome, CPF, telefone ou e-mail) é solicitado ou armazenado. O opt-in de retorno/Giftback é 100% anônimo.
- **Isolamento por sessão + RLS *default-deny*:** cada visitante recebe um cookie `HttpOnly` (`cfi_session_id`), isolando seus dados criados sobre a base compartilhada dos 3 restaurantes demonstrativos.
- **Sem envios reais:** toda ativação é rotulada como demonstrativa e não dispara mensagens ou cobranças reais.

---

## 2. Stack Tecnológica

- **Framework:** Next.js 15 (App Router) + React 19 + TypeScript
- **Estilização:** Tailwind CSS v4 + Lucide Icons + Google Fonts (`Plus Jakarta Sans`)
- **Validação de Contratos:** Zod
- **IA Generativa:** Gateway server-side governado exclusivamente por modelos oficiais da **Google Gemini API** (`@google/genai`, `GEMINI_API_KEY` — `gemini-flash-lite-latest` + `gemini-3.5-flash-lite` em corrida controlada de `15s`, `maxDuration = 30s` na Vercel) + **fallback determinístico local transparente** validado por Zod e registrado em `ai_runs`
- **Banco de Dados:** Supabase (PostgreSQL) via `@supabase/supabase-js`
- **QR Code e Gráficos:** `qrcode.react` (SVG client-side) e `recharts`
- **Testes Automatizados:** Vitest (`src/lib/business-rules.test.ts` e `src/lib/ai/fallbacks.test.ts`)

---

## 3. Jornada e Rotas da Aplicação

| Rota | Papel na Jornada |
|---|---|
| `/` | **Onboarding & Perfil:** seletor dos 3 restaurantes demonstrativos (*Brava Osteria*, *Taco & Brasa*, *Dona Nena Café & Bistrô*) + criação/edição de perfil com cálculo de prontidão em tempo real. |
| `/restaurante/[id]/diagnostico` | **Agente 1 (`diagnostic_strategist`):** KPIs determinísticos + leitura estratégica personalizada, 3 pontos de atenção, 3 oportunidades e 3 planos táticos pós-validados. |
| `/restaurante/[id]/planejar` | **Planejamento & Guardrails:** formulário pré-preenchido com validação em tempo real de orçamento, impacto no ticket e teto operacional do salão. |
| `/campanha/[campaignId]/revisao` | **Agente 2 (`creative_activator`) & HITL:** edição livre dos materiais, prévia ao vivo imprimível do Display de Mesa com QR Code real e aprovação humana obrigatória para ativar (`draft` → `active`). |
| `/r/[campaignId]` | **Experiência Mobile do Cliente no Salão:** registra `view`, bloqueia campanhas em `draft`, emite cupom `CF-XXXX` com opt-in anônimo e bloqueia no servidor (`HTTP 409`) ao atingir `coupon_limit`. |
| `/restaurante/[id]/resultados` | **Resultados, Funil & Auditoria IA:** KPIs reais do Supabase, gráfico de funil Recharts, botão de próxima campanha com histórico e aba secundária **Visão Ecossistema & Auditoria IA** (North Star Metric + tabela `ai_runs`). |

---

## 4. Configuração Local

### Pré-requisitos
- Node.js 20+ e npm
- Conta gratuita no [Supabase](https://supabase.com/)
- Chave da [Google AI Studio (Gemini API)](https://aistudio.google.com/apikey)

### Passo 1 — Instalar dependências
```bash
npm install
```

### Passo 2 — Criar o banco e rodar o seed no Supabase
1. Crie um novo projeto no Supabase.
2. Abra o **SQL Editor** do projeto.
3. Execute o conteúdo completo de [`supabase/schema.sql`](./supabase/schema.sql) (cria as 5 tabelas, índices e ativa RLS *default-deny*).
4. Execute o conteúdo completo de [`supabase/seed.sql`](./supabase/seed.sql) (insere os 3 restaurantes demonstrativos de forma idempotente).

### Passo 3 — Configurar variáveis de ambiente
Copie `.env.example` para `.env.local` e preencha suas credenciais:

```bash
cp .env.example .env.local
```

| Variável | Obrigatória | Descrição |
|---|---|---|
| `SUPABASE_URL` | Sim | Project URL do Supabase (`https://<projeto>.supabase.co`) |
| `SUPABASE_SERVICE_ROLE_KEY` | Sim | Chave `service_role` (server-side only; nunca exposta ao cliente) |
| `GEMINI_API_KEY` | Recomendada* | Chave oficial da Google Gemini API (modelos Flash) |
| `NEXT_PUBLIC_APP_URL` | Sim | URL pública da aplicação usada na geração dos links do QR Code (`http://localhost:3000` em dev) |
| `MAKE_WEBHOOK_URL` | Não | URL do *Custom Webhook* do Cenário 1 no Make (disparo não bloqueante com timeout de 4s na ativação HITL; sem fallback para `N8N_WEBHOOK_URL`) |
| `AUTOMATION_WEBHOOK_SECRET` | Recomendada* | API Key nativa enviada no header `x-make-apikey` (customizável via `AUTOMATION_WEBHOOK_AUTH_HEADER`) para autenticar o *Custom Webhook* do Make |
| `AUTOMATION_API_SECRET` | Para Pulse | Segredo server-side exclusivo exigido em `/api/internal/campaign-monitor*` (*fail-closed*: retorna `503` se ausente) |
| `AUTOMATION_ALLOWED_SESSION_ID` | Para Pulse | UUID da sessão demonstrativa controlada (`cfi_session_id`) autorizada na automação (*fail-closed*: bloqueia qualquer disparo/consulta se ausente) |

> \* Caso `GEMINI_API_KEY` não esteja configurada ou os modelos oficiais da Gemini API estejam temporariamente indisponíveis, o fallback determinístico local assume de forma transparente e registra `status = 'fallback'` em `ai_runs`.

### Passo 4 — Rodar em desenvolvimento e validar
```bash
# Servidor local
npm run dev

# Validação de tipos, testes unitários e build de produção
npm run typecheck
npm test
npm run build
```

---

## 5. Publicação na Vercel

1. **Suba o repositório para o GitHub** (verifique que `.env.local` está ignorado pelo `.gitignore`).
2. Acesse [vercel.com/new](https://vercel.com/new) e importe o repositório.
3. Em **Environment Variables**, cadastre todas as variáveis obrigatórias da tabela acima para o ambiente *Production* (e *Preview*, se desejar):
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `GEMINI_API_KEY`
   - `NEXT_PUBLIC_APP_URL` (inicialmente pode deixar a URL prevista `https://<seu-projeto>.vercel.app`)
   - `MAKE_WEBHOOK_URL`, `AUTOMATION_WEBHOOK_SECRET`, `AUTOMATION_API_SECRET`, `AUTOMATION_ALLOWED_SESSION_ID` (opcionais para ativar o Campaign Pulse via Make)
4. Clique em **Deploy**.
5. **Pós-deploy obrigatório:** confirme a URL final gerada pela Vercel (ex.: `https://comer-fora-up.vercel.app`), atualize `NEXT_PUBLIC_APP_URL` caso o domínio tenha mudado e faça **Redeploy** para que os QR Codes do Display de Mesa apontem diretamente para o link público acessível pelo celular.
6. **Checklist rápido pós-publicação:**
   - Abrir `/` e confirmar carregamento dos 3 restaurantes demonstrativos e da logo iFood.
   - Gerar um diagnóstico e um kit de ativação, aprovar a campanha e escanear o QR Code pelo celular.
   - Confirmar atualização em tempo real dos KPIs, NSM e tabela `ai_runs` em **Resultados**.

---

## 6. Automação Cloud — Campaign Pulse (Make.com)

A aplicação expõe uma camada de automação **agnóstica de ferramenta** (sem acoplamento a SDKs proprietários) preparada para operar com o **Make (Make.com)** na nuvem, sem alterar regras de negócio, HITL ou isolamento por sessão.

### 6.1. Bootstrap e Recuperação da Sessão Demonstrativa (`AUTOMATION_ALLOWED_SESSION_ID`)
- O middleware ([`src/middleware.ts`](./src/middleware.ts)) gera automaticamente um UUID v4 no cookie `HttpOnly` `cfi_session_id` quando o visitante acessa a aplicação sem cookie prévio.
- **Princípio fail-closed:** enquanto `AUTOMATION_ALLOWED_SESSION_ID` não estiver configurada com um UUID válido, **nenhum** webhook de ativação é disparado e os endpoints `/api/internal/campaign-monitor*` respondem `HTTP 503`.
- **Como obter o UUID da sessão demonstrativa (sem expor em logs ou repositório):**
  1. Abra a aplicação no navegador (local ou Vercel) na sessão que você usará para demonstrar o fluxo.
  2. No DevTools do navegador, acesse **Application → Cookies** (ou **Armazenamento → Cookies**) no domínio da aplicação e copie o valor do cookie `cfi_session_id` *(alternativamente, crie um rascunho de teste e leia `session_id` diretamente no painel privado do Supabase)*.
  3. Configure exatamente esse UUID na variável server-side `AUTOMATION_ALLOWED_SESSION_ID` no `.env.local` ou nas *Environment Variables* da Vercel e reinicie/redeploye a aplicação.
- **Recuperação caso o cookie seja perdido ou renovado:** se o navegador limpar cookies ou iniciar uma nova sessão, leia o novo valor de `cfi_session_id` no DevTools, atualize `AUTOMATION_ALLOWED_SESSION_ID` no ambiente server-side, reinicie/redeploye e crie/ative as campanhas demonstrativas a partir da nova sessão.
- **Segurança:** nunca registre o valor real de `AUTOMATION_ALLOWED_SESSION_ID`, `AUTOMATION_API_SECRET` ou `AUTOMATION_WEBHOOK_SECRET` em logs, prints públicos ou documentação.

### 6.2. Persistência (`campaign_automation_logs`)
Execute a migration aditiva [`supabase/migrations/20261127_campaign_automation_logs.sql`](./supabase/migrations/20261127_campaign_automation_logs.sql) no SQL Editor do Supabase (já incluída em [`supabase/schema.sql`](./supabase/schema.sql) para ambientes novos). A tabela possui RLS *default-deny*, chave única `idempotency_key` contra duplicidade e colunas `notification_channel` + `notification_status` (`recorded` | `sent` | `failed` | `skipped`).

### 6.3. Contratos HTTP e Autenticação
- **Webhook Outgoing (`PATCH /api/campaigns/[campaignId]` → Make):**
  - Disparado apenas na transição `status !== 'active' → 'active'` com `human_approved = true` e sessão autorizada.
  - Timeout de `4s` em `try/catch` isolado (falhas HTTP `401`/`5xx`/timeout nunca bloqueiam a ativação).
  - Headers: `Content-Type: application/json`, `x-make-apikey: <AUTOMATION_WEBHOOK_SECRET>`, `X-Idempotency-Key`, `X-Automation-Timestamp`.
  - Payload: `{ contract_version: "1.0", event: "campaign_activated", mode: "demonstrativo", idempotency_key, sent_at, session_id, campaign: { id, restaurant_id, title, objective, target_window, coupon_limit, budget_limit, estimated_cost_per_redemption, approved_at } }`.
- **`GET /api/internal/campaign-monitor?session_id=<uuid>&campaign_id=<uuid>&only_actionable=false`:**
  - Header obrigatório: `X-Automation-Secret: <AUTOMATION_API_SECRET>` (comparado em tempo constante via SHA-256 + `timingSafeEqual`).
  - Retorna apenas campanhas `active` + `human_approved` da sessão autorizada, excluindo eventos `source = 'demo_seed'`, com `estimated_budget_used`, `estimated_budget_utilization_pct`, `pulse_evaluation`, `campaign_monitor_state` (`active` | `inactive` | `not_found`) e `should_untrack`.
- **`POST /api/internal/campaign-monitor/alerts`:**
  - Header obrigatório: `X-Automation-Secret` (+ opcional `X-Automation-Timestamp` com janela ±5 min).
  - Grava apenas em `campaign_automation_logs` (nunca altera `campaigns`), bloqueia campanhas `draft`/`paused`/`completed` (`409`), deduplica por `idempotency_key` (`200 deduplicated: true`) e valida coerência entre `notification_channel` e `notification_status` (`400` se `sent`/`failed` com canal `none`).

### 6.4. Configuração dos 2 Cenários no Make
> **Pré-requisito:** confirme na sua conta gratuita do Make a disponibilidade de **2 cenários ativos** e **1 Data Store** antes de publicar. Caso a conta permita apenas 1 cenário ativo, opere somente o Cenário 2 consultando `GET /api/internal/campaign-monitor?session_id=<AUTOMATION_ALLOWED_SESSION_ID>` diretamente.

1. **Cenário 1 — `Campaign Activation`:**
   - **Webhooks → Custom webhook** com **API Key nativa** (`x-make-apikey` = `AUTOMATION_WEBHOOK_SECRET`).
   - **Filter:** `body.event == "campaign_activated"` E `body.contract_version == "1.0"` E `body.idempotency_key` preenchido.
   - **Data store → Add/replace a record** (índice operacional por chave `campaign.id` com `campaign_id`, `restaurant_id`, `session_id`, `title`, `approved_at`, `active = true`).
   - *(Opcional)* **Notificação externa** (Email/Slack/Discord) com *Error Handler* (`Resume`) registrando o resultado real (`sent` ou `failed`).
   - **HTTP → Make a request** (`POST /api/internal/campaign-monitor/alerts`): envia `notification_channel: "none"` + `notification_status: "recorded"` se não houver canal externo, ou o canal/status real observado.
2. **Cenário 2 — `Campaign Pulse` (Schedule: a cada 12 horas):**
   - **Data store → Search records** (`active == true`) + **Filter** `Total number of bundles > 0`.
   - **HTTP → Make a request** (`GET /api/internal/campaign-monitor?session_id={{session_id}}&campaign_id={{campaign_id}}`) com `X-Automation-Secret` e *Error Handler* (`Ignore`/`Resume`) que **nunca exclui** o registro do Data Store em falha de rede/`5xx`/timeout.
   - **Router (somente quando `statusCode == 200`):**
     - **Rota A (Limpeza segura):** `data.should_untrack == true` E `data.campaign_monitor_state == "inactive"` → `Data store → Delete a record`.
     - **Rota B (Alertas acionáveis):** `data.campaigns[1].pulse_evaluation.should_alert == true` E `already_logged_in_window == false` → notificação externa (opcional) + `HTTP POST /api/internal/campaign-monitor/alerts`.

### 6.5. Limitações Conhecidas e Estimativa Teórica
- **Segredo global no MVP:** `AUTOMATION_API_SECRET` + `AUTOMATION_ALLOWED_SESSION_ID` restringem o MVP a uma única sessão demonstrativa controlada (em produção multi-tenant, evoluir para tokens assinados por restaurante/conta).
- **Orçamento estimado:** `estimated_budget_used` usa `redemptions × estimated_cost_per_redemption`, não faturamento real conciliado no PDV.
- **Thresholds como hipóteses de produto:** os limites `PULSE_*` são heurísticas configuráveis iniciais, não regras oficiais do iFood.
- **Estimativa teórica de operações (12h):** ~60 ops/mês ocioso ou ~313 ops/mês com 3 campanhas ativas, 10 ativações e 15 alertas (consumo observado a ser validado no histórico real do Make).

---

## 7. Documentação de Engenharia

- [`GEMINI_BRIEFING_TECNICO.md`](./GEMINI_BRIEFING_TECNICO.md) — Especificação técnica e funcional do projeto.
- [`docs/DECISIONS_LOG.md`](./docs/DECISIONS_LOG.md) — Registro histórico de decisões arquiteturais, de IA e segurança (`DEC-001` a `DEC-020`).
- [`docs/PROMPT_HISTORY.md`](./docs/PROMPT_HISTORY.md) — Evolução versionada dos prompts dos 2 agentes (`v1.0` → `v1.3`).
- [`docs/TESTS_AND_ISSUES.md`](./docs/TESTS_AND_ISSUES.md) — Matriz de testes executados, evidências e issues resolvidos (`TST-001` a `TST-010`, `ISS-001` a `ISS-010`).
