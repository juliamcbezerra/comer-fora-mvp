# BRIEFING TÉCNICO — COMER FORA IMPULSO (MVP FUNCIONAL)

## 1. VISÃO GERAL DO PROJETO
Construir o **Comer Fora Impulso**, uma aplicação web full-stack funcional (protótipo conceitual para o desafio iFood GenAI / AI Builder — Opção 2: Restaurante que ganha).
O produto é uma Central Inteligente de Ativação Presencial para restaurantes parceiros do iFood Comer Fora. Ele combina regras financeiras determinísticas e 2 agentes especializados usando Gemini API (saídas estruturadas em JSON) para diagnosticar oportunidades no salão, planejar campanhas seguras para a margem/capacidade, gerar kits de ativação com QR Code real e medir resgates reais em tempo real no Supabase.

REGRAS CRÍTICAS:
- NÃO criar um chatbot genérico. O fluxo deve ser estruturado em telas de produto real.
- NÃO expor API keys ou Service Role Keys no frontend. Toda chamada à Gemini API e escrita no banco deve ocorrer em Next.js Route Handlers (server-side).
- NÃO usar dados reais ou coletar dados pessoais (PII). Exibir em local discreto e visível o selo: "Protótipo Conceitual • Dados Demonstrativos".
- NUNCA simular envio real de mensagens/anúncios; toda ativação deve ser claramente rotulada como demonstrativa.
- Grafia obrigatória da marca em textos: sempre "iFood" (i minúsculo, F maiúsculo). Não distorcer ou inventar logo oficial; usar assinatura tipográfica limpa "iFood | Comer Fora Impulso (Protótipo)".

## 2. STACK TECNOLÓGICA
- Framework: Next.js (App Router) + TypeScript
- Estilização: Tailwind CSS + shadcn/ui + Lucide Icons
- Validação de Contratos: Zod
- IA: Google Gemini API (`@google/genai`, modelo `gemini-2.5-flash`) com `responseMimeType: "application/json"` e `responseSchema`
- Banco de Dados: Supabase (PostgreSQL) via `@supabase/supabase-js`
- QR Code: `qrcode.react` (renderização client-side SVG)
- Gráficos: `recharts` (gráficos limpos e responsivos no dashboard)
- Deploy alvo: Vercel

## 3. IDENTIDADE VISUAL (BASEADA NO BRANDBOOK iFOOD)
Aplicar rigorosamente esta paleta de cores em Tailwind/CSS variables:
- Cor Primária (Ação / Destaque institucional): `#EA1D2C` (hover: `#A02331`, dark: `#9C050B`)
- Fundo Principal da Aplicação: `#F5F0EB` (off-white quente) e `#FFFFFF` (cards com borda sutil `#E8E2DC`)
- Superfícies Secundárias / Highlights Suaves: `#F5E9DA` (bege claro) e `#F7ACB7` (rosa claro para badges/tags suaves)
- Acentos de Atenção / Alerta Moderado: `#FFB761` / `#FFDEBB`
- Tipografia Principal: `#3F3E3E` (Cool Grey escuro) e `#000000` (títulos de alto contraste)
- Tipografia Secundária / Bordas: `#A6A29F`
- Fonte: Google Fonts `Plus Jakarta Sans` (pesos 400, 500, 600, 700, 800) como equivalente web moderna da Sul Sans.
- Layout: claro, limpo, responsivo (desktop + mobile), com cards bem espaçados, KPIs escaneáveis e estados de loading/erro elegantes.

## 4. MODELO DE BANCO DE DADOS (SUPABASE / SQL)
Criar script SQL `supabase/schema.sql` e `supabase/seed.sql` com as seguintes tabelas:
1. `restaurants`:
   - `id` (uuid primary key default gen_random_uuid())
   - `name` (text not null)
   - `category` (text not null)
   - `neighborhood` (text not null)
   - `city` (text not null default 'São Paulo')
   - `avg_ticket` (numeric not null)
   - `seating_capacity` (integer not null)
   - `opening_hours` (text not null)
   - `low_demand_slots` (text[] not null)
   - `current_salon_promotion` (text not null)
   - `uses_totem` (boolean default false)
   - `monthly_promo_budget` (numeric not null)
   - `max_discount_pct` (numeric not null)
   - `primary_goal` (text not null)
   - `is_demo_seed` (boolean default false)
   - `onboarding_completed` (boolean default true)
   - `created_at` (timestamptz default now())

2. `diagnostics`:
   - `id` (uuid primary key default gen_random_uuid())
   - `restaurant_id` (uuid references restaurants(id) on delete cascade)
   - `readiness_score` (integer not null)
   - `deterministic_metrics` (jsonb not null)
   - `ai_output` (jsonb not null)
   - `prompt_version` (text not null default 'v1.0')
   - `created_at` (timestamptz default now())

3. `campaigns`:
   - `id` (uuid primary key default gen_random_uuid())
   - `restaurant_id` (uuid references restaurants(id) on delete cascade)
   - `diagnostic_id` (uuid references diagnostics(id) on delete set null)
   - `objective` (text not null)
   - `title` (text not null)
   - `offer_description` (text not null)
   - `estimated_cost_per_redemption` (numeric not null)
   - `budget_limit` (numeric not null)
   - `coupon_limit` (integer not null)
   - `target_window` (text not null)
   - `promo_copy` (text not null)
   - `table_tent_headline` (text not null)
   - `table_tent_body` (text not null)
   - `staff_script` (text not null)
   - `cta_text` (text not null)
   - `recurrence_hook` (text not null)
   - `status` (text not null default 'draft' check (status in ('draft', 'active', 'paused', 'completed')))
   - `human_approved` (boolean not null default false)
   - `approved_at` (timestamptz)
   - `created_at` (timestamptz default now())

4. `campaign_events`:
   - `id` (uuid primary key default gen_random_uuid())
   - `campaign_id` (uuid references campaigns(id) on delete cascade)
   - `restaurant_id` (uuid references restaurants(id) on delete cascade)
   - `event_type` (text not null check (event_type in ('view', 'redemption', 'recurrence_opt_in')))
   - `coupon_code` (text)
   - `source` (text not null default 'qr_scan' check (source in ('qr_scan', 'simulator', 'demo_seed')))
   - `metadata` (jsonb default '{}'::jsonb)
   - `created_at` (timestamptz default now())

5. `ai_runs`:
   - `id` (uuid primary key default gen_random_uuid())
   - `restaurant_id` (uuid references restaurants(id) on delete set null)
   - `agent_name` (text not null check (agent_name in ('diagnostic_strategist', 'creative_activator')))
   - `model` (text not null)
   - `prompt_version` (text not null)
   - `latency_ms` (integer not null)
   - `status` (text not null check (status in ('success', 'fallback', 'error')))
   - `error_message` (text)
   - `created_at` (timestamptz default now())

SEED INICIAL (`supabase/seed.sql`):
- Inserir 3 restaurantes demonstrativos realistas e fictícios:
  1. "Brava Osteria" (Italiana, Pinheiros, Ticket R$ 115, 60 lugares, ociosidade Ter/Qua jantar, sem divulgação no salão, orçamento R$ 800, desc máx 20%).
  2. "Taco & Brasa" (Mexicana Casual, Vila Madalena, Ticket R$ 72, 48 lugares, ociosidade Seg-Qui almoço, só divulga no Instagram, orçamento R$ 500, desc máx 25%) — incluir 1 diagnóstico, 1 campanha ativa e eventos demonstrativos (`source = 'demo_seed'`) de views, redemptions e recurrence_opt_in.
  3. "Dona Nena Café & Bistrô" (Cafeteria & Brunch, Moema, Ticket R$ 54, 32 lugares, ociosidade Ter-Qui tarde, placa simples no caixa, orçamento R$ 350, desc máx 15%).

## 5. REGRAS DE NEGÓCIO DETERMINÍSTICAS (`lib/business-rules.ts`)
Implementar funções puras e testáveis em TypeScript:
1. `calculateDeterministicMetrics(restaurant)`:
   - Calcula `readiness_score` (0 a 100) baseado em divulgação atual no salão, uso de totem, definição de horários ociosos e orçamento disponível.
   - Calcula `max_safe_cost_per_redemption = round(avg_ticket * (min(max_discount_pct, 30) / 100), 2)`.
   - Calcula `recommended_coupon_cap = min(floor(monthly_promo_budget / max_safe_cost_per_redemption), floor(seating_capacity * 0.6 * 4))`.
   - Calcula `idle_capacity_estimate` e `potential_monthly_capture`.
2. `validateCampaignConstraints(restaurant, plan)`:
   - Verifica `plan.coupon_limit * plan.estimated_cost_per_redemption <= plan.budget_limit`.
   - Verifica `plan.budget_limit <= restaurant.monthly_promo_budget`.
   - Verifica `plan.estimated_cost_per_redemption <= restaurant.avg_ticket * (Math.min(restaurant.max_discount_pct, 30) / 100)`.
   - Verifica se `plan.coupon_limit` respeita teto operacional compatível com `restaurant.seating_capacity`.
   - Retorna `{ valid: boolean, errors: string[], warnings: string[], maxCommittedBudget: number }`.

## 6. ARQUITETURA DE IA E AGENTES (`lib/ai/`)
Criar orquestrador server-side com 2 agentes distintos, schemas Zod estritos e fallback determinístico:
- **Agente 1 (`diagnostic_strategist`)** — Rota `POST /api/ai/diagnose`:
  - Input: dados do restaurante + `deterministic_metrics` + (opcional) resumo de performance de campanhas anteriores (para o loop de recorrência).
  - Temperatura: `0.2`.
  - Output JSON obrigatório:
    - `executive_summary` (string, máx 350 chars)
    - `bottlenecks` (array de 3 itens: `{ title, impact: 'alto'|'medio'|'baixo', explanation }`)
    - `opportunities` (array de 3 itens: `{ title, priority: 1|2|3, rationale, expected_lever }`)
    - `recommended_plans` (array de 3 planos táticos: `{ objective, title, target_window, mechanic_summary, suggested_cost_per_redemption, suggested_coupon_limit, why_it_fits }`)
  - Pós-validação determinística: ajustar automaticamente `suggested_cost_per_redemption` e `suggested_coupon_limit` se ultrapassarem os guardrails.
  - Gravar em `diagnostics` e registrar execução em `ai_runs`.

- **Agente 2 (`creative_activator`)** — Rota `POST /api/ai/generate-kit`:
  - Input: dados do restaurante + plano validado pelo usuário (objetivo, orçamento, custo/resgate, limite de cupons, janela alvo).
  - Temperatura: `0.5`.
  - Output JSON obrigatório:
    - `title` (nome criativo da campanha)
    - `offer_description` (descrição clara e honesta da oferta, sem promessas enganosas)
    - `promo_copy` (texto pronto para Instagram/WhatsApp/salão)
    - `table_tent_headline` (título curto máx 60 chars para display de mesa)
    - `table_tent_body` (texto conciso máx 160 chars explicando como usar o Comer Fora na mesa)
    - `staff_script` (fala natural de 15 segundos para garçom/atendente abordar a mesa)
    - `cta_text` (chamada curta para o QR Code, ex.: "Escaneie e ative seu benefício")
    - `recurrence_hook` (sugestão de mecânica de retorno / Giftback pós-visita)
  - Gravar campanha em `campaigns` com `status = 'draft'` e `human_approved = false`. Registrar em `ai_runs`.

- **Fallback Seguro:** em caso de erro/timeout (>15s) da Gemini API, retornar resposta determinística bem estruturada baseada no perfil do restaurante e registrar `status = 'fallback'` em `ai_runs`.

## 7. ROTAS E TELAS OBRIGATÓRIAS
1. `/` — Home & Onboarding: seletor rápido dos 3 restaurantes demo + formulário para criar/editar perfil completo. Botão "Salvar e Gerar Diagnóstico".
2. `/restaurante/[id]/diagnostico` — Exibe KPIs determinísticos no topo + cards estruturados do Agente 1 (Gargalos, Oportunidades, 3 Planos recomendados). Cada plano tem botão "Planejar esta Campanha".
3. `/restaurante/[id]/planejar` — Formulário pré-preenchido com o plano escolhido (ou livre) + painel lateral de validação determinística em tempo real (orçamento comprometido, % de margem, alerta de capacidade). Botão "Gerar Kit de Ativação com IA".
4. `/campanha/[campaignId]/revisao` — Edição livre de todos os campos gerados pelo Agente 2 + Prévia visual ao vivo do **Display de Mesa (Tent Card)** na identidade visual iFood com **QR Code real** apontando para `${NEXT_PUBLIC_APP_URL}/r/${campaignId}` + checkbox obrigatório de revisão humana + botão "Aprovar e Ativar Campanha (Modo Demonstrativo)". Ao ativar, disparar opcionalmente webhook se `process.env.N8N_WEBHOOK_URL` estiver definido (sem falhar se vazio).
5. `/r/[campaignId]` — Experiência Mobile-First do Cliente no Salão (acessada via QR Code ou botão "Simular escaneamento"):
   - Verifica se a campanha está `active`. Se `draft`, informa que aguarda aprovação.
   - Registra evento `view` automaticamente em `campaign_events`.
   - Exibe restaurante, benefício, janela de validade e selo de demonstração.
   - Permite clicar em "Resgatar Benefício Demonstrativo" (com checkbox opcional anônimo "Quero receber benefício de retorno / Giftback").
   - Verifica no servidor se `resgates_atuais < coupon_limit`. Se sim, grava `redemption` (e `recurrence_opt_in` se marcado) e retorna código de cupom demonstrativo (`CF-XXXX`). Se esgotado, bloqueia com aviso claro.
6. `/restaurante/[id]/resultados` — Dashboard de Resultados & Recorrência:
   - Cards com KPIs calculados em tempo real a partir do Supabase (Visualizações, Resgates, Taxa de Conversão, Orçamento Utilizado vs. Teto, Taxa de Opt-in/Recorrência).
   - Lista de campanhas do restaurante com link direto para o simulador `/r/[campaignId]` e status.
   - Gráfico de funil (Visualizações → Resgates → Opt-in de Retorno) com Recharts.
   - Botão "Gerar Próxima Campanha com Base nos Resultados" (chama `/api/ai/diagnose` enviando o histórico de performance real da conta).
   - Aba secundária "Visão Ecossistema iFood (NSM)": exibe a North Star Metric (Taxa de Ativação Qualificada) e métricas agregadas do produto calculadas diretamente do banco, junto com os últimos registros de observabilidade da tabela `ai_runs`.

## 8. VARIÁVEIS DE AMBIENTE (`.env.example`)
- `GEMINI_API_KEY=`
- `SUPABASE_URL=`
- `SUPABASE_SERVICE_ROLE_KEY=`
- `NEXT_PUBLIC_APP_URL=http://localhost:3000`
- `N8N_WEBHOOK_URL=` (opcional)

## 9. ENTREGÁVEIS DE CÓDIGO ESPERADOS
1. Estrutura completa do projeto Next.js App Router limpa, tipada e sem erros de build (`npm run build`).
2. Arquivos `supabase/schema.sql` e `supabase/seed.sql` prontos para executar no SQL Editor do Supabase.
3. README claro com passos para configurar variáveis de ambiente, rodar o seed e publicar na Vercel.