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
| `N8N_WEBHOOK_URL` | Não | Webhook opcional disparado de forma não bloqueante (timeout 4s) na ativação da campanha |

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
   - `N8N_WEBHOOK_URL` (opcional)
4. Clique em **Deploy**.
5. **Pós-deploy obrigatório:** confirme a URL final gerada pela Vercel (ex.: `https://comer-fora-up.vercel.app`), atualize `NEXT_PUBLIC_APP_URL` caso o domínio tenha mudado e faça **Redeploy** para que os QR Codes do Display de Mesa apontem diretamente para o link público acessível pelo celular.
6. **Checklist rápido pós-publicação:**
   - Abrir `/` e confirmar carregamento dos 3 restaurantes demonstrativos e da logo iFood.
   - Gerar um diagnóstico e um kit de ativação, aprovar a campanha e escanear o QR Code pelo celular.
   - Confirmar atualização em tempo real dos KPIs, NSM e tabela `ai_runs` em **Resultados**.

---

## 6. Documentação de Engenharia

- [`GEMINI_BRIEFING_TECNICO.md`](./GEMINI_BRIEFING_TECNICO.md) — Especificação técnica e funcional do projeto.
- [`docs/DECISIONS_LOG.md`](./docs/DECISIONS_LOG.md) — Registro histórico de decisões arquiteturais, de IA e segurança (`DEC-001` a `DEC-017`).
- [`docs/PROMPT_HISTORY.md`](./docs/PROMPT_HISTORY.md) — Evolução versionada dos prompts dos 2 agentes (`v1.0` → `v1.2`).
- [`docs/TESTS_AND_ISSUES.md`](./docs/TESTS_AND_ISSUES.md) — Matriz de testes executados, evidências e issues resolvidos (`TST-001` a `TST-008`, `ISS-001` a `ISS-008`).
