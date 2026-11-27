# DECISIONS LOG — COMER FORA IMPULSO

Registro contínuo das decisões arquiteturais, técnicas, de produto, de IA e de governança do projeto **Comer Fora Impulso**.

> **Regras de uso**
> - Preserve sempre o histórico anterior; não substitua decisões antigas sem registrar a mudança com nova entrada e referência à decisão anterior.
> - Priorize decisões relevantes para arquitetura, prompts, APIs, persistência, segurança e riscos.
> - Nunca registre credenciais ou chaves de API neste arquivo.
> - Status possíveis: `Confirmada` | `Em Revisão` | `Substituída por DEC-XXX`.

---

## Modelo de Registro

```markdown
## DEC-XXX — Título curto da decisão

- **Data:** AAAA-MM-DD
- **Status:** Confirmada
- **Dimensão (Slide):** Arquitetura | Prompts | APIs | Riscos
- **Contexto e problema:** ...
- **Decisão tomada:** ...
- **Alternativas consideradas:** ...
- **Justificativa técnica e de negócio:** ...
- **Impactos e limitações:** ...
```

---

## Índice de Decisões

| ID | Data | Título | Dimensão | Status |
|---|---|---|---|---|
| DEC-001 | 2026-11-25 | Arquitetura web full-stack estruturada em Next.js (não chatbot) | Arquitetura | Confirmada |
| DEC-002 | 2026-11-25 | Separação entre regras determinísticas e IA generativa | Prompts / Riscos | Confirmada |
| DEC-003 | 2026-11-25 | Arquitetura de 2 agentes Gemini com JSON estruturado, Zod e fallback | Prompts / APIs / Riscos | Confirmada |
| DEC-004 | 2026-11-25 | Persistência real e observabilidade em Supabase (PostgreSQL) | APIs / Arquitetura | Confirmada |
| DEC-005 | 2026-11-25 | Segurança server-side, governança humana (HITL), privacidade e marca | APIs / Riscos | Confirmada |
| DEC-006 | 2026-11-25 | Integração opcional de automação via webhook (n8n) não bloqueante | APIs / Riscos | Substituída por DEC-020 |
| DEC-007 | 2026-11-25 | Isolamento por sessão demonstrativa (`HttpOnly`) e RLS default-deny | APIs / Riscos | Confirmada |
| DEC-008 | 2026-11-25 | Seed idempotente e validação automatizada de regras com Vitest | Arquitetura / Riscos | Confirmada |
| DEC-009 | 2026-11-25 | Clone-on-edit em restaurantes demo e normalização defensiva de `SUPABASE_URL` | APIs / Riscos | Confirmada |
| DEC-010 | 2026-11-25 | Detecção automática de chave Gemini (`AIza` vs `AQ.`), sanitização de logs e transparência de fallback | APIs / Prompts / Riscos | Substituída por DEC-011 |
| DEC-011 | 2026-11-25 | Remoção de `vertexai: true` e cadeia de fallback entre modelos Gemini Flash ativos | APIs / Prompts / Riscos | Confirmada |
| DEC-012 | 2026-11-25 | Requisições paralelas *hedged* (`Promise.any`) na Gemini API e inputs decimais livres (`step="any"`) | APIs / Riscos / UX | Confirmada |
| DEC-013 | 2026-11-25 | Proteção de campanha seed, validação HITL no servidor e Tent Card imprimível com QR Code real | APIs / Riscos / UX | Confirmada |
| DEC-014 | 2026-11-25 | Gateway Multi-Provider de IA (Groq gratuito `llama-3.3-70b-versatile` + failover Gemini + fallback determinístico) | APIs / Prompts / Riscos | Substituída por DEC-018 |
| DEC-015 | 2026-11-25 | Bloqueio server-side de teto de cupons (`409`), opt-in anônimo sem PII e fórmula da NSM no Ecossistema | APIs / Riscos / Arquitetura | Confirmada |
| DEC-016 | 2026-11-25 | Refino visual SaaS iFood, logo oficial e separação de copy comercial vs. auditoria técnica | UX / Marca | Confirmada |
| DEC-017 | 2026-11-25 | Páginas amigáveis de erro (`not-found`/`error`), ajuste responsivo `375px` e `maxDuration = 30` para Vercel | UX / APIs / Riscos | Confirmada |
| DEC-018 | 2026-11-26 | Governança de IA exclusivamente via Gemini API oficial + fallback determinístico local (remoção de OpenRouter/Baidu) | APIs / Prompts / Riscos | Confirmada |
| DEC-019 | 2026-11-26 | Integridade analítica do funil (`views >= redemptions >= opt-in`), isolamento de eventos em campanhas seed, rate limiting e transparência de KPIs/NSM | APIs / Riscos / UX | Confirmada |
| DEC-020 | 2026-11-27 | Arquitetura de automação agnóstica (Campaign Pulse via Make.com), fail-closed por sessão controlada, 2 endpoints internos e `campaign_automation_logs` | APIs / Arquitetura / Riscos | Confirmada |

---

## DEC-001 — Arquitetura web full-stack estruturada em Next.js (não chatbot)

- **Data:** 2026-11-25
- **Status:** Confirmada
- **Dimensão (Slide):** Arquitetura
- **Contexto e problema:** O desafio propõe construir uma solução digital que ajude restaurantes parceiros do iFood Comer Fora a divulgar o serviço no salão, atrair clientes e gerar recorrência em um prazo de desenvolvimento de 3 dias. Uma interface de chatbot genérico não transmite fluxo operacional de produto real nem garante controle sobre etapas críticas.
- **Decisão tomada:** Construir uma aplicação web full-stack estruturada em telas de produto com **Next.js (App Router) + TypeScript**, **Tailwind CSS + shadcn/ui + Lucide Icons**, **Recharts** para visualização de funil, **qrcode.react** para geração de QR Code client-side em SVG e deploy alvo na **Vercel**.
- **Alternativas consideradas:**
  - Interface de chatbot único para toda a jornada (descartada por ferir o requisito de produto real e dificultar controle de estado e validação).
  - Separação em frontend SPA + backend dedicado em outro servidor (descartada pelo overhead de infraestrutura e deploy no prazo de 3 dias).
- **Justificativa técnica e de negócio:** Next.js App Router permite unificar UI responsiva e Route Handlers server-side no mesmo repositório, reduzindo latência de desenvolvimento, simplificando segurança de chaves e acelerando a publicação em link acessível na Vercel.
- **Impactos e limitações:** A aplicação depende de execução server-side compatível com o runtime serverless da Vercel (atenção a timeouts de chamadas à API de IA, mitigados com limite de 15s e fallback).

---

## DEC-002 — Separação entre regras determinísticas e IA generativa

- **Data:** 2026-11-25
- **Status:** Confirmada
- **Dimensão (Slide):** Prompts / Riscos
- **Contexto e problema:** LLMs não são confiáveis para cálculos financeiros exatos nem para garantir limites rígidos de margem, orçamento promocional e capacidade física do salão. Erros nesses cálculos podem gerar campanhas deficitárias ou superlotação operacional para o restaurante.
- **Decisão tomada:** Isolar todos os cálculos e guardrails financeiros/operacionais em funções puras e testáveis em TypeScript (`lib/business-rules.ts`), especificamente `calculateDeterministicMetrics(restaurant)` (prontidão, custo máximo seguro limitado a 30% do ticket, teto de cupons compatível com orçamento e capacidade do salão) e `validateCampaignConstraints(restaurant, plan)`. A IA atua apenas em interpretação, diagnóstico, planejamento tático e geração criativa.
- **Alternativas consideradas:**
  - Delegar cálculos de orçamento, teto de cupons e validação de margem ao próprio prompt do LLM (descartada pelo risco de alucinação numérica e inconsistência financeira).
- **Justificativa técnica e de negócio:** Garante previsibilidade financeira, auditabilidade das regras e testabilidade unitária, reduzindo drasticamente o risco operacional para o restaurante parceiro.
- **Impactos e limitações:** Regras determinísticas fixas (como teto de 30% sobre o ticket e fator `0.6 * 4` sobre assentos) são heurísticas iniciais do MVP e podem exigir calibração por categoria de restaurante em evoluções futuras.

---

## DEC-003 — Arquitetura de 2 agentes Gemini com JSON estruturado, Zod e fallback

- **Data:** 2026-11-25
- **Status:** Confirmada
- **Dimensão (Slide):** Prompts / APIs / Riscos
- **Contexto e problema:** Uma única chamada monolítica de IA para diagnosticar o restaurante e gerar todo o material criativo mistura tarefas analíticas e criativas, dificultando controle de temperatura, validação intermediária pelo usuário e rastreabilidade de falhas.
- **Decisão tomada:** Orquestrar **2 agentes especializados** no servidor (`lib/ai/`) usando `@google/genai` com o modelo `gemini-2.5-flash`, `responseMimeType: "application/json"`, `responseSchema` e validação estrita via **Zod**:
  1. `diagnostic_strategist` (`POST /api/ai/diagnose`, temperatura `0.2`): gera resumo executivo, 3 gargalos, 3 oportunidades e 3 planos táticos, com pós-validação determinística para ajustar valores fora dos guardrails.
  2. `creative_activator` (`POST /api/ai/generate-kit`, temperatura `0.5`): gera kit completo de ativação (título, oferta honesta, copy, tent card, script de atendimento, CTA e gancho de recorrência) a partir de um plano já validado.
  - Em caso de erro ou timeout (>15s), retornar **fallback determinístico estruturado**, registrando `status = 'fallback'` em `ai_runs` e nunca apresentando fallback como resultado real da IA.
- **Alternativas consideradas:**
  - Agente único gerando diagnóstico e peças criativas em uma só etapa (descartada por misturar perfis de temperatura e impedir ajuste humano do plano antes da criação do kit).
  - Resposta em texto livre com parsing via regex (descartada pela fragilidade de contrato).
- **Justificativa técnica e de negócio:** Especializar prompts por etapa melhora aderência às restrições, permite temperatura baixa para análise e moderada para criatividade, mantém o usuário no controle entre diagnóstico e ativação e assegura resiliência em demonstrações via fallback transparente.
- **Impactos e limitações:** Aumenta o número de rotas e schemas a manter; exige monitoramento de latência e taxa de fallback na tabela `ai_runs`.

---

## DEC-004 — Persistência real e observabilidade em Supabase (PostgreSQL)

- **Data:** 2026-11-25
- **Status:** Confirmada
- **Dimensão (Slide):** APIs / Arquitetura
- **Contexto e problema:** Persistência real é requisito obrigatório do projeto: alterações precisam sobreviver ao recarregamento da página, os indicadores devem ser calculados a partir de eventos reais e o sistema precisa registrar observabilidade das execuções de IA.
- **Decisão tomada:** Utilizar **Supabase (PostgreSQL)** via `@supabase/supabase-js` em camada server-side com 5 tabelas (`restaurants`, `diagnostics`, `campaigns`, `campaign_events`, `ai_runs`), provisionadas por `supabase/schema.sql` e populadas inicialmente por `supabase/seed.sql` com 3 restaurantes fictícios demonstrativos (*Brava Osteria*, *Taco & Brasa* e *Dona Nena Café & Bistrô*). Não utilizar `localStorage` como persistência principal.
- **Alternativas consideradas:**
  - `localStorage` ou JSON estático em memória (descartado por violar requisito de persistência real e impedir rastreamento consistente entre telas/dispositivos no fluxo de QR Code).
  - SQLite local (descartado por incompatibilidade com deploy serverless na Vercel).
- **Justificativa técnica e de negócio:** Garante consistência relacional, persistência imediata em nuvem, cálculo real de funil (`view` → `redemption` → `recurrence_opt_in`) e rastreabilidade operacional de IA (`latency_ms`, `status`, `prompt_version`) para o dashboard e visão NSM.
- **Impactos e limitações:** Exige configuração de projeto Supabase, variáveis de ambiente e execução manual dos scripts SQL (`schema.sql` e `seed.sql`) antes do uso.

---

## DEC-005 — Segurança server-side, governança humana (HITL), privacidade e marca

- **Data:** 2026-11-25
- **Status:** Confirmada
- **Dimensão (Slide):** APIs / Riscos
- **Contexto e problema:** Protótipos com IA generativa e integração de banco frequentemente sofrem com vazamento de chaves no cliente, publicação automática de ofertas incorretas, coleta indevida de PII ou uso inadequado de identidade visual de marca.
- **Decisão tomada:**
  - **Segurança de chaves:** Todas as chamadas à Gemini API (`GEMINI_API_KEY`) e escritas no Supabase (`SUPABASE_SERVICE_ROLE_KEY`) ocorrem exclusivamente em Next.js Route Handlers server-side.
  - **Human-in-the-Loop (HITL):** Toda campanha gerada nasce como `draft` com `human_approved = false`, exigindo revisão editável e confirmação explícita em checkbox antes da ativação demonstrativa.
  - **Privacidade e transparência:** Zero dados reais do iFood ou coleta de PII; exibição contínua do selo `"Protótipo Conceitual • Dados Demonstrativos"`; nenhuma simulação enganosa de envio real de mensagens/anúncios.
  - **Identidade visual:** Grafia obrigatória `"iFood"`, assinatura tipográfica `"iFood | Comer Fora Impulso (Protótipo)"` (sem inventar logo oficial), tema claro com `#EA1D2C`, `#F5F0EB`, `#FFFFFF` e fonte `Plus Jakarta Sans`.
- **Alternativas consideradas:**
  - Chamadas diretas do frontend ao Supabase com anon key e políticas permissivas (descartada para centralizar validações de negócio e regras de limite de cupons no servidor).
  - Ativação automática imediata após geração pela IA (descartada pelo risco de publicar copy ou oferta inadequada sem aprovação do restaurante).
- **Justificativa técnica e de negócio:** Mitiga os principais riscos de segurança, compliance, LGPD e reputação de marca, tornando a solução tecnicamente defensável no processo seletivo.
- **Impactos e limitações:** Como o MVP não inclui autenticação de usuários finais nesta fase, o controle de escrita depende da camada de API server-side e da natureza demonstrativa dos dados.

---

## DEC-006 — Integração opcional de automação via webhook (n8n) não bloqueante

- **Data:** 2026-11-25
- **Status:** Confirmada
- **Dimensão (Slide):** APIs / Riscos
- **Contexto e problema:** A ativação de campanhas pode se conectar a automações externas (ex.: n8n), mas a jornada principal (P0) não pode depender de um serviço externo opcional para funcionar.
- **Decisão tomada:** Ao aprovar e ativar uma campanha, disparar opcionalmente um webhook HTTP caso `process.env.N8N_WEBHOOK_URL` esteja definido, tratando falhas de forma isolada para não bloquear a ativação no banco e rotulando toda ativação como demonstrativa.
- **Alternativas consideradas:**
  - Tornar o n8n obrigatório no fluxo de ativação (descartada por introduzir ponto único de falha externo no fluxo P0).
- **Justificativa técnica e de negócio:** Mantém extensibilidade para automações sem comprometer a confiabilidade do fluxo principal nem o prazo de entrega.
- **Impactos e limitações:** Enquanto `N8N_WEBHOOK_URL` não estiver configurado, o disparo de webhook não ocorre e deve ser sinalizado com transparência nos logs/documentação.

---

## DEC-007 — Isolamento por sessão demonstrativa (`HttpOnly`) e RLS default-deny

- **Data:** 2026-11-25
- **Status:** Confirmada
- **Dimensão (Slide):** APIs / Riscos
- **Contexto e problema:** A aplicação precisa ser aberta e testada por qualquer avaliador em um link público sem fricção de login, mas também precisa impedir que visitantes diferentes visualizem ou alterem registros criados por outros usuários e proteger o banco contra acesso direto via chave pública.
- **Decisão tomada:** Adicionar coluna `session_id` nas 5 tabelas do `supabase/schema.sql`, habilitar `ROW LEVEL SECURITY` em todas elas sem policies permissivas para `anon`/`authenticated` (*default-deny*) e gerenciar o isolamento no servidor via cookie `HttpOnly` (`cfi_session_id`). Os 3 restaurantes do seed (`is_demo_seed = true`) ficam disponíveis como base compartilhada, enquanto criações e execuções do visitante ficam vinculadas à sua `session_id`. A rota pública `/r/[campaignId]` expõe apenas dados públicos de campanhas `active` para permitir escaneamento de QR Code em dispositivos móveis sem depender do cookie do desktop.
- **Alternativas consideradas:**
  - Fluxo obrigatório de cadastro/login com e-mail e senha (descartado por criar atrito e coletar PII desnecessária no processo seletivo).
  - Acesso compartilhado sem isolamento de sessão (descartado por permitir interferência entre avaliadores simultâneos).
- **Justificativa técnica e de negócio:** Concilia zero atrito na avaliação ao vivo com proteção real de dados no banco (RLS) e isolamento de workspace por visitante.
- **Impactos e limitações:** Limpar cookies do navegador inicia uma nova sessão demonstrativa (os 3 restaurantes do seed continuam visíveis, mas registros criados na sessão anterior deixam de aparecer para o novo cookie).

---

## DEC-008 — Seed idempotente e validação automatizada de regras com Vitest

- **Data:** 2026-11-25
- **Status:** Confirmada
- **Dimensão (Slide):** Arquitetura / Riscos
- **Contexto e problema:** Reexecutar scripts de seed no Supabase pode duplicar restaurantes e distorcer métricas; além disso, regressões nas fórmulas financeiras determinísticas comprometeriam a segurança de margem.
- **Decisão tomada:** Utilizar UUIDs determinísticos com `ON CONFLICT (id) DO NOTHING` em `supabase/seed.sql` (sem fabricar registros falsos em `ai_runs`) e adicionar `vitest` para testar automaticamente `lib/business-rules.ts` e contratos `Zod`.
- **Alternativas consideradas:**
  - Seed com `gen_random_uuid()` sem controle de idempotência (descartado pelo risco de duplicação ao reexecutar o script).
  - Validação apenas manual pela interface (descartada pela menor cobertura de casos de borda financeiros).
- **Justificativa técnica e de negócio:** Garante reprodutibilidade do ambiente demonstrativo e evidência objetiva de funcionamento dos guardrails determinísticos.
- **Impactos e limitações:** Adiciona uma dependência de desenvolvimento (`vitest`), sem impacto no bundle de produção.

---

## DEC-009 — Clone-on-edit em restaurantes demo e normalização defensiva de `SUPABASE_URL`

- **Data:** 2026-11-25
- **Status:** Confirmada
- **Dimensão (Slide):** APIs / Riscos
- **Contexto e problema:** Durante a Etapa 2 surgiram dois riscos práticos: (1) se um visitante editar um dos 3 restaurantes demonstrativos do seed, sobrescrever o registro original afetaria outros avaliadores simultâneos; (2) ao copiar a URL da aba *Data API* do Supabase, o sufixo `/rest/v1/` faz o SDK `@supabase/supabase-js` falhar com `Invalid path specified in request URL`.
- **Decisão tomada:**
  1. No `PATCH /api/restaurants/[id]`, qualquer edição sobre um registro com `is_demo_seed = true` cria automaticamente uma cópia vinculada à `session_id` do visitante (`is_demo_seed = false`), retornando `cloned_from_demo: true` e preservando o seed global intacto.
  2. Em `src/lib/supabase/server.ts`, validar o protocolo `http(s)://` e normalizar `SUPABASE_URL` via `new URL(url).origin` antes de instanciar o cliente Supabase.
- **Alternativas consideradas:**
  - Bloquear edição nos restaurantes demo (descartada por reduzir a interatividade na avaliação ao vivo).
  - Exigir formato estrito da URL sem normalização (descartada por aumentar risco de erro de configuração em deploy).
- **Justificativa técnica e de negócio:** Garante experiência fluida para múltiplos avaliadores simultâneos no mesmo link público e aumenta a resiliência de configuração da API de banco de dados.
- **Impactos e limitações:** Cada edição em um restaurante demo gera um novo registro na sessão do visitante (isolado dos demais); recomenda-se ainda manter a `SUPABASE_URL` limpa (`https://<projeto>.supabase.co`) na Vercel.

---

## DEC-010 — Detecção automática de chave Gemini (`AIza` vs `AQ.`), sanitização de logs e transparência de fallback

- **Data:** 2026-11-25
- **Status:** Substituída por DEC-011 (mantida a sanitização de logs e transparência de fallback)
- **Dimensão (Slide):** APIs / Prompts / Riscos
- **Contexto e problema:** Chaves da Gemini API podem vir do Google AI Studio (`AIza...`) ou do Vertex AI Express Mode (`AQ....`), que exigem flags diferentes no SDK `@google/genai`. Além disso, falhas de API precisam ser registradas em `ai_runs` sem vazar credenciais e apresentadas com total transparência na UI (nunca mascarando fallback como saída real de IA).
- **Decisão tomada:**
  1. Em `src/lib/ai/client.ts`, detectar automaticamente `apiKey.startsWith("AQ.")` para passar `vertexai: true` quando aplicável, mantendo compatibilidade padrão com chaves `AIza...` do Google AI Studio.
  2. Em `src/lib/ai/orchestrator.ts`, sanitizar mensagens de erro antes de gravar em `ai_runs.error_message` (removendo qualquer padrão de chave) e marcar o `prompt_version` salvo em `diagnostics` com sufixo `-fallback` quando o fallback for acionado, exibindo alerta explícito na interface.
- **Alternativas consideradas:**
  - Suportar apenas chaves `AIza...` (descartada por reduzir flexibilidade caso o avaliador utilize chave GCP).
  - Ocultar na interface quando o fallback foi usado (descartada por violar a regra de transparência do projeto).
- **Justificativa técnica e de negócio:** Aumenta portabilidade entre contas Google, evita vazamento acidental de segredos em logs de observabilidade e preserva integridade técnica perante os gestores avaliadores.
- **Impactos e limitações:** Chaves `AQ....` exigem que a API `aiplatform.googleapis.com` esteja habilitada no projeto GCP correspondente; chaves `AIza...` do Google AI Studio funcionam imediatamente sem configuração extra de GCP.

---

## DEC-011 — Remoção de `vertexai: true` e cadeia de fallback entre modelos Gemini Flash ativos

- **Data:** 2026-11-25
- **Status:** Confirmada
- **Dimensão (Slide):** APIs / Prompts / Riscos
- **Contexto e problema:** Em validação real (`ISS-002`), descobrimos dois problemas críticos de disponibilidade de API: (1) forçar `vertexai: true` para chaves com prefixo `AQ.` redirecionava a chamada para `aiplatform.googleapis.com` (retornando HTTP `403`), enquanto a mesma chave funcionava diretamente na Gemini Developer API sem `vertexai: true`; (2) o modelo `gemini-2.5-flash` originalmente previsto no briefing retornou HTTP `404` (*no longer available to new users*), e `gemini-flash-latest` apresentou picos intermitentes de HTTP `503` (*high demand*).
- **Decisão tomada:**
  1. Remover `vertexai: true` em `src/lib/ai/client.ts`, instanciando sempre `new GoogleGenAI({ apiKey })`.
  2. Substituir o modelo fixo por uma cadeia resiliente de modelos Flash ativos verificados na chave (`gemini-flash-latest` → `gemini-flash-lite-latest` → `gemini-3-flash-preview`), com failover automático em erros recuperáveis (`503`, `429`, `404`, `500`, `504` ou timeout) e orçamento por tentativa de `7.5s` dentro do limite global de `15s`.
  3. Registrar em `ai_runs.model` o nome exato do modelo que respondeu com sucesso (em vez de um valor estático), preservando o fallback determinístico transparente caso toda a cadeia esteja indisponível.
- **Alternativas consideradas:**
  - Fixar apenas um único modelo (ex.: apenas `gemini-flash-latest`) — descartada pela vulnerabilidade comprovada a picos `503` durante apresentações ao vivo.
  - Aumentar o timeout global para 45–60s — descartada para evitar má experiência de usuário e risco de timeout em funções serverless da Vercel.
- **Justificativa técnica e de negócio:** Elimina o bloqueio de `403`/`404` e garante alta disponibilidade em tempo real mesmo sob picos de demanda `503`, mantendo rastreabilidade fiel na tabela `ai_runs` (evidência forte para as dimensões de **APIs** e **Riscos** no slide).
- **Impactos e limitações:** Quando o primeiro modelo da cadeia retorna `503` ou excede `7.5s`, a latência total percebida pode ficar entre `10s` e `14s` até o failover concluir no modelo seguinte.

---

## DEC-012 — Requisições paralelas *hedged* (`Promise.any`) na Gemini API e inputs decimais livres (`step="any"`)

- **Data:** 2026-11-25
- **Status:** Confirmada
- **Dimensão (Slide):** APIs / Riscos / UX
- **Contexto e problema:** Em testes reais no navegador, a telemetria de `ai_runs` revelou que o failover sequencial desperdiçava o orçamento de `15s` quando múltiplos modelos Flash enfrentavam picos simultâneos de `503 UNAVAILABLE` ou *thinking* longo no `gemini-3-flash-preview`. Adicionalmente, os inputs numéricos com `step="5"` / `step="0.5"` impediam a digitação de valores decimais válidos (ex.: `R$ 791,20` e `R$ 18,40`) no navegador em pt-BR.
- **Decisão tomada:**
  1. Substituir o loop sequencial por **requisições paralelas *hedged*** (`Promise.any`) em até 3 ondas curtas (`5.5s` por onda dentro do teto global de `15s`), competindo modelos Flash ativos (`gemini-flash-lite-latest`, `gemini-flash-latest`, `gemini-3-flash-preview` com `ThinkingLevel.MINIMAL`, `gemini-3.5-flash-lite`) e aceitando a primeira resposta JSON válida.
  2. Adicionar botão de 1 clique **"Tentar novamente com Gemini API"** no banner de fallback do Diagnóstico.
  3. Alterar todos os inputs monetários e percentuais de onboarding e planejamento para `step="any"`.
- **Alternativas consideradas:**
  - Manter failover sequencial com timeout maior (descartada por elevar a latência percebida e degradar a experiência em demonstrações ao vivo).
- **Justificativa técnica e de negócio:** Reduz drasticamente a latência de cauda (respostas observadas entre `1.5s` e `3.9s` no Agente 2) e maximiza a taxa de sucesso sob picos intermitentes de `503` do provedor externo, preservando o SLA de `15s` e o fallback determinístico transparente.
- **Impactos e limitações:** Dispara múltiplas requisições simultâneas por onda entre modelos distintos (maior consumo de RPM quando vários modelos estão saudáveis); se todos os endpoints Flash do Google estiverem simultaneamente em `503`, o fallback determinístico continua sendo acionado de forma transparente.

---

## DEC-013 — Proteção de campanha seed, validação HITL no servidor e Tent Card imprimível com QR Code real

- **Data:** 2026-11-25
- **Status:** Confirmada
- **Dimensão (Slide):** APIs / Riscos / UX
- **Contexto e problema:** Na Etapa 4 (revisão e ativação de campanhas), uma validação HITL apenas no frontend poderia ser contornada por chamadas diretas à API; além disso, campanhas demonstrativas iniciais (`session_id IS NULL`) não devem ser sobrescritas por visitantes, e o QR Code precisa funcionar tanto localmente quanto na URL pública da Vercel.
- **Decisão tomada:**
  1. Validar obrigatoriamente `approve_and_activate && !human_approved -> HTTP 400` diretamente em `PATCH /api/campaigns/[campaignId]`, além de confirmação explícita em 2 etapas na interface antes de ativar.
  2. Bloquear mutações sobre campanhas do seed global (`session_id IS NULL`) com HTTP `403`, mantendo-as navegáveis/testáveis em modo somente leitura.
  3. Renderizar prévia ao vivo do Display de Mesa (Tent Card) com `QRCodeSVG` (`qrcode.react`) apontando para `${origin}/r/${campaignId}` (com resolução dinâmica de `window.location.origin` quando `NEXT_PUBLIC_APP_URL` aponta para localhost) e suporte a impressão limpa (`@media print`).
  4. Disparar `N8N_WEBHOOK_URL` opcionalmente com timeout de `4s` em `try/catch` não bloqueante na ativação, retornando status transparente no payload.
- **Alternativas consideradas:**
  - Ativar sem confirmação server-side (descartada por fragilidade de governança HITL).
  - Gerar imagem de QR Code estática no servidor (descartada pela menor agilidade de atualização em tempo real e aumento de carga no backend).
- **Justificativa técnica e de negócio:** Garante governança real (nenhuma campanha sai de `draft` sem revisão humana registrada com `approved_at`), protege a demonstração compartilhada e entrega um artefato físico/visual imprimível pronto para o salão.
- **Impactos e limitações:** Para escaneamento real pelo celular durante testes locais, `NEXT_PUBLIC_APP_URL` precisa apontar para um endereço acessível na rede (ou para o link público na Vercel após o deploy).

---

## DEC-014 — Gateway Multi-Provider de IA (Groq gratuito `llama-3.3-70b-versatile` + failover Gemini + fallback determinístico)

- **Data:** 2026-11-25
- **Status:** Confirmada
- **Dimensão (Slide):** APIs / Prompts / Riscos
- **Contexto e problema:** Mesmo após otimizar o cliente Gemini (`DEC-011` e `DEC-012`), uma sonda direta em todos os modelos disponíveis na chave Gemini gratuita comprovou que todos os endpoints Flash/Gemma 4 sofriam rajadas recorrentes de HTTP `503 UNAVAILABLE` (*high demand*) e `429` (*quota exceeded*) do lado do Google, comprometendo a confiabilidade em demonstrações ao vivo.
- **Decisão tomada:** Evoluir `src/lib/ai/client.ts` para um **Gateway Multi-Provider** sem novas dependências npm (usando `fetch` nativo compatível com OpenAI REST para a **Groq API**, 100% gratuita e sem cartão de crédito):
  1. Se `GROQ_API_KEY` estiver configurada: prioriza **Groq** (`llama-3.3-70b-versatile` → failover `llama-3.1-8b-instant`) com `response_format: { type: "json_object" }`, latência típica sub-segundo e alta disponibilidade.
  2. Se Groq falhar ou não estiver configurada: aciona automaticamente a **Gemini API** (ondas *hedged* `gemini-flash-lite-latest`, `gemini-3.5-flash-lite`, `gemma-4-26b-a4b-it`).
  3. Se ambos os provedores falharem ou excederem `15s`: aciona o **fallback determinístico transparente** (`status = 'fallback'`).
  4. Evoluir os prompts para `v1.1` incluindo contrato JSON explícito e margens de segurança de tamanho (`55`/`150` chars) para garantir 100% de aderência ao Zod em qualquer provedor, registrando `groq:<modelo>` ou `gemini:<modelo>` em `ai_runs.model`.
- **Alternativas consideradas:**
  - Depender exclusivamente da camada gratuita da Gemini API (descartada devido à instabilidade comprovada de `503 UNAVAILABLE`).
  - Usar API paga (OpenAI/Anthropic) — descartada para manter custo zero conforme solicitado.
- **Justificativa técnica e de negócio:** Elimina ponto único de falha em provedor externo gratuito, entrega respostas reais de IA em ~1 segundo na demonstração ao vivo com gestores do iFood e mantém integridade contratual via Zod + guardrails determinísticos independentemente do modelo.
- **Impactos e limitações:** Requer a criação manual gratuita de uma `GROQ_API_KEY` em `console.groq.com/keys` e inserção em `.env.local` (e na Vercel). A sanitização de logs em `orchestrator.ts` foi estendida para redigir também prefixos `gsk_`.
- **Atualização (mesma data):** Após bloqueio de cadastro na Groq (`code=signup_blocked`) e confirmação em teste real de que o endpoint GitHub Models (`models.github.ai`) foi descontinuado em julho/2026 (retornando `200 text/plain OK`), o gateway em `src/lib/ai/client.ts` foi evoluído para **corrida paralela única multi-provider (`Promise.any`) com janela de `25s`, pré-validação Zod e normalização defensiva** (`normalizeDiagnosticCandidate` / `normalizeCreativeCandidate`), competindo simultaneamente **OpenRouter Free (`OPENROUTER_API_KEY`: `openrouter/free`, `baidu/ernie-5.5-flash-preview:free`)** e **Gemini API (`GEMINI_API_KEY`: `gemini-flash-lite-latest`, `gemini-3.5-flash-lite`)**. Isso eliminou o corte prematuro de `8.5s` que abortava respostas válidas de `11s–13s` do OpenRouter (`ISS-006`) e manteve respostas de `4s–5s` quando o Gemini está livre.

---

## DEC-015 — Bloqueio server-side de teto de cupons (`409`), opt-in anônimo sem PII e fórmula da NSM no Ecossistema

- **Data:** 2026-11-25
- **Status:** Confirmada
- **Dimensão (Slide):** APIs / Riscos / Arquitetura
- **Contexto e problema:** Na experiência pública mobile (`/r/[campaignId]`), qualquer cliente com acesso ao QR Code pode clicar repetidamente em resgatar. Sem controle rígido no servidor, uma campanha poderia ultrapassar `coupon_limit` e estourar o orçamento do restaurante. Além disso, o opt-in de Giftback não pode coletar dados pessoais (PII) e a aba *Visão Ecossistema iFood (NSM)* precisa calcular uma North Star Metric objetiva a partir do banco sem vazar registros de outras sessões.
- **Decisão tomada:**
  1. Em `POST /api/public/campaigns/[campaignId]/redeem`, verificar no servidor `status === 'active'` (`400` se `draft`) e consultar `count(redemption)` antes de emitir cupom `CF-XXXX`, bloqueando com **HTTP `409 Conflict`** (`exhausted: true`) quando `resgates_atuais >= coupon_limit`.
  2. Registrar `recurrence_opt_in` de forma 100% anônima (vinculado apenas ao `coupon_code` demonstrativo e `metadata.anonymous = true`, sem telefone/e-mail/nome).
  3. Definir e calcular em tempo real na aba *Visão Ecossistema iFood (NSM)* a **Taxa de Ativação Qualificada** (`restaurantes com campanha ativa aprovada via HITL e >= 1 resgate real / total de restaurantes acessíveis`), mantendo o escopo estritamente isolado ao seed + `session_id` atual, junto com as últimas 15 execuções reais de `ai_runs`.
- **Alternativas consideradas:**
  - Controlar estoque apenas no frontend com estado React (descartada por ser trivialmente contornável ao recarregar a página ou em múltiplos celulares).
  - Pedir telefone/WhatsApp no opt-in de Giftback (descartada por violar a regra de zero PII do case).
- **Justificativa técnica e de negócio:** Garante proteção financeira real ao restaurante parceiro, aderência total à LGPD/regras do case e traduz a entrega do produto para uma métrica executiva clara para gestores do iFood.
- **Impactos e limitações:** Em cenário de concorrência extrema de centenas de requisições simultâneas no mesmo milissegundo em produção real, evoluiríamos a checagem de teto para uma função RPC PostgreSQL com `SELECT ... FOR UPDATE` (documentado como evolução pós-MVP).

---

## DEC-016 — Refino visual SaaS iFood, logo oficial e separação de copy comercial vs. auditoria técnica

- **Data:** 2026-11-25
- **Status:** Confirmada
- **Dimensão (Slide):** UX / Marca
- **Contexto e problema:** A primeira versão da UI carregava excesso de elementos visuais associados a protótipos genéricos de IA (ícones `Sparkles`, pílulas pastéis, bordas `rounded-3xl`, caixa vermelha improvisada no lugar da logo) e expunha jargão técnico (*guardrails determinísticos*, *Agente 1*, *Supabase*) em telas destinadas ao dono de restaurante.
- **Decisão tomada:** Aplicar um passe exclusivo de UI/copy (sem alterar regras de negócio, schemas Zod, APIs ou banco): adotar a logo oficial `/ifood-logo.webp` e favicon `src/app/icon.png` + `/ifood-logo.png`, reestruturar o topo em faixa utilitária escura (`#1E1E1E`) + header branco único com abas horizontais (`border-b-2 border-[#EA1D2C]`), migrar para superfícies SaaS nítidas (`#F7F7F7` + cards `#FFFFFF` `rounded-xl`), criar hero institucional vermelho (`#EA1D2C`) na Home, remover todos os ícones `Sparkles` e concentrar a terminologia técnica (`ai_runs`, guardrails, HITL, NSM) na aba **Visão Ecossistema & Auditoria IA** (acessível diretamente pelo topo via `?tab=ecosystem`).
- **Alternativas consideradas:** Manter jargão técnico distribuído em todas as telas do parceiro (descartada por prejudicar a percepção de produto comercial real durante a avaliação).
- **Justificativa técnica e de negócio:** Eleva a maturidade visual ao padrão do Portal do Parceiro/iFood News e mantém transparência técnica completa para os gestores do iFood em um espaço dedicado de auditoria.
- **Impactos e limitações:** Nenhuma alteração de contrato de API ou persistência; exige que `/public/ifood-logo.webp` e `/public/ifood-logo.png` permaneçam no repositório no deploy da Vercel.

---

## DEC-017 — Páginas amigáveis de erro (`not-found`/`error`), ajuste responsivo `375px` e `maxDuration = 30` para Vercel

- **Data:** 2026-11-25
- **Status:** Confirmada
- **Dimensão (Slide):** UX / APIs / Riscos
- **Contexto e problema:** Na bateria final de QA e auditoria pré-Vercel (Etapa 6), foram identificados três pontos de endurecimento para produção: (1) rotas com IDs inválidos (`/restaurante/id-invalido/diagnostico`, `/r/inexistente`) caíam na tela 404 genérica em inglês do Next.js; (2) em viewports mobile estreitos (`375px`), o seletor de abas `role="tablist"` em Resultados (`inline-flex`) corria risco de overflow horizontal e a faixa utilitária superior ficava espremida; (3) o gateway de IA possui orçamento de `25s`, mas funções serverless padrão na Vercel sem `maxDuration` explícito podem sofrer corte em `10s`.
- **Decisão tomada:**
  1. Criar `src/app/not-found.tsx` e `src/app/error.tsx` em PT-BR na identidade visual iFood, com ação clara de retorno ao início/retry.
  2. Tornar o `tablist` de `ResultsDashboardClient.tsx` empilhável em `< sm` (`grid-cols-1 ... sm:inline-flex`) e compactar o rótulo da faixa utilitária em `AppHeader.tsx` no mobile (`Auditoria IA` em `< sm`).
  3. Exportar `export const maxDuration = 30` em `POST /api/ai/diagnose` e `POST /api/ai/generate-kit` para alinhar o timeout da Vercel ao orçamento de `25s` do gateway multi-provider.
- **Alternativas consideradas:**
  - Manter o 404 padrão do Next.js e o timeout default da Vercel (descartadas por prejudicarem resiliência e causarem risco de HTTP 504 em chamadas válidas de 11s–13s do OpenRouter em produção).
- **Justificativa técnica e de negócio:** Elimina telas quebradas ou em inglês para avaliadores, garante ergonomia em smartphones (`375px`) e protege a taxa de sucesso da IA no ambiente serverless da Vercel.
- **Impactos e limitações:** O `maxDuration = 30` é suportado nos planos atuais da Vercel (Hobby com Fluid Compute e Pro); se executado em ambiente restrito a 10s, o fallback determinístico continua garantindo resposta íntegra.

---

## DEC-018 — Governança de IA exclusivamente via Gemini API oficial + fallback determinístico local (remoção de OpenRouter/Baidu)

- **Data:** 2026-11-26
- **Status:** Confirmada (substitui `DEC-014`)
- **Dimensão (Slide):** APIs / Prompts / Riscos
- **Contexto e problema:** Na auditoria pré-entrega, a tabela `ai_runs` registrou queda para `openrouter:baidu/ernie-5.5-flash-preview:free`. Para um case corporativo do iFood, enviar dados operacionais de restaurantes parceiros a modelos gratuitos preview de terceiros (OpenRouter/Baidu) gera risco de governança, retenção de dados e instabilidade de qualidade, além de estender o orçamento de espera para `25s`.
- **Decisão tomada:**
  1. Remover completamente OpenRouter, Mistral, Cerebras e Groq de `src/lib/ai/client.ts`, `.env.example` e `README.md`.
  2. Manter a execução ativa governada **exclusivamente por modelos oficiais da Google Gemini API** (`@google/genai`, `GEMINI_API_KEY`): corrida paralela controlada entre `gemini-flash-lite-latest` e `gemini-3.5-flash-lite` com orçamento máximo de `15s` (`AI_TIMEOUT_MS = 15_000`).
  3. Caso ambos os modelos oficiais da Gemini falhem ou atinjam timeout, degradar diretamente para o **fallback determinístico local** (`src/lib/ai/fallbacks.ts`), validado pelo Zod e registrado com transparência em `ai_runs` (`status = 'fallback'`).
- **Alternativas consideradas:** Manter OpenRouter Free como contingência de 3º nível (descartada pelo risco de governança de dados e inconsistência de qualidade em avaliação executiva).
- **Justificativa técnica e de negócio:** Elimina exposição de dados a provedores terceiros não homologados, reduz o pior caso de latência de `25s` para `15s` e reforça a postura de segurança/governança para o iFood.
- **Impactos e limitações:** Requer `GEMINI_API_KEY` válida no ambiente; em indisponibilidade simultânea dos dois modelos Flash oficiais da Gemini, o fallback determinístico assume de forma transparente.

---

## DEC-019 — Integridade analítica do funil, isolamento de eventos em campanhas seed, rate limiting e transparência de KPIs/NSM

- **Data:** 2026-11-26
- **Status:** Confirmada
- **Dimensão (Slide):** APIs / Riscos / UX
- **Contexto e problema:** A auditoria técnica e de negócio identificou cinco pontos críticos para endurecimento pré-entrega: (1) `views = 1` e `redemptions = 2` (conversão de `200%`) ao simular um segundo cliente sem novo `/view` ou em chamadas diretas à API; (2) eventos em campanhas seed (`session_id IS NULL`, ex.: *Taco & Brasa*) podiam ser compartilhados/esgotados entre visitantes; (3) contradição aparente entre `"Limite seguro de cupons: 27 / mês"` no topo e `"35 cupons"` em planos com benefício unitário menor, além de exibir receita bruta sem descontar incentivos nem explicitar caráter demonstrativo; (4) ausência de rate limiting nas rotas públicas de IA e resgate; (5) mistura silenciosa de eventos `demo_seed` na North Star Metric sem filtro de escopo.
- **Decisão tomada:**
  1. **Integridade do funil (`src/lib/funnel-metrics.ts`, `MobileRedemptionClient.tsx`, `redeem/route.ts`, `results.ts`):** ao clicar em *"Simular outro cliente na mesa"*, disparar nova chamada real `POST /api/public/campaigns/[campaignId]/view`; no `POST /redeem`, registrar `view` automático se `views <= redemptions`; e aplicar `computeSafeFunnelMetrics` garantindo `Visualizações >= Resgates >= Opt-in` e taxas sempre em `[0%, 100%]`.
  2. **Proteção de seeds e anti-IDOR (`redeem/route.ts`, `view/route.ts`, `r/[campaignId]/page.tsx`, `restaurants/[id]/route.ts`, `campaigns/[campaignId]/route.ts`):** isolar eventos de visitantes em campanhas seed na `cfi_session_id` do visitante (sem alterar ou esgotar o baseline global `session_id IS NULL`), reforçar checagens explícitas de ownership (`HTTP 403`) em `PATCH` de restaurantes e campanhas não-seed e exibir o aviso de copy-on-write na UI (*"Criamos uma cópia na sua sessão para preservar o exemplo original."*).
  3. **Clareza financeira nos KPIs (`DiagnosticView.tsx`, `OnboardingWorkspace.tsx`):** renomear para *"Cupons no benefício máximo"* (explicando que sobe com benefício menor até o teto operacional) e *"Receita bruta estimada (demo)"* com subtexto exibindo *"Líquida após incentivos: R$ X • projeção demonstrativa (não incremental)"*.
  4. **Rate limiting server-side (`src/lib/rate-limit.ts`):** sliding window em memória aplicado em `/api/ai/diagnose` (`10 req/10 min` por sessão/IP), `/api/ai/generate-kit` (`10 req/10 min` por sessão/IP) e `/api/public/campaigns/[campaignId]/redeem` (`30 req/10 min` por IP), retornando `HTTP 429` com `Retry-After` e mensagem amigável em PT-BR.
  5. **Transparência da NSM (`results.ts`, `ResultsDashboardClient.tsx`):** expor `ecosystem_session_only` (excluindo `demo_seed` e seeds intocados) ao lado de `ecosystem` (base completa com exemplos), com seletor direto na aba *Visão Ecossistema & Auditoria IA*.
- **Alternativas consideradas:** Rate limiting distribuído com Redis externo (descartado para manter zero infraestrutura adicional no MVP; documentado como evolução de produção).
- **Justificativa técnica e de negócio:** Elimina distorções analíticas (conversão > 100%, NSM inflada por seed), protege a experiência concorrente de avaliadores no link público e aumenta a credibilidade executiva dos números exibidos ao dono do restaurante.
- **Impactos e limitações:** O rate limiter em memória atua por instância serverless (adequado para proteção leve do protótipo; em escala de produção evoluiria para Upstash/Redis).

---

## DEC-020 — Arquitetura de automação agnóstica (Campaign Pulse via Make.com), fail-closed por sessão controlada, 2 endpoints internos e `campaign_automation_logs`

- **Data:** 2026-11-27
- **Status:** Confirmada (substitui `DEC-006`)
- **Dimensão (Slide):** APIs / Arquitetura / Riscos
- **Contexto e problema:** A integração inicial prevista em `DEC-006` disparava apenas um webhook simples (`N8N_WEBHOOK_URL`) sem autenticação outgoing, sem proteção contra redisparo, sem endpoints de monitoramento periódico e acoplada a uma ferramenta específica (n8n) que exigiria servidor local/próprio. Para monitorar campanhas aprovadas na nuvem com Make.com preservando segurança, isolamento de sessão e controle de créditos, era necessário desacoplar a camada de automação.
- **Decisão tomada:**
  1. **Desacoplamento e remoção do fallback n8n (`src/lib/automation/webhook.ts`):** priorizar `MAKE_WEBHOOK_URL` (com alternativa genérica `AUTOMATION_WEBHOOK_URL`), removendo qualquer fallback automático para `N8N_WEBHOOK_URL` para evitar disparos acidentais. Adotar autenticação nativa por API Key do *Custom Webhook* do Make (`x-make-apikey` via `AUTOMATION_WEBHOOK_SECRET`), validação Zod do payload versionado (`contract_version: "1.0"`), disparo somente na transição para `active`, timeout de `4s` e tratamento não bloqueante.
  2. **Segurança fail-closed e isolamento por sessão controlada (`src/lib/automation/auth.ts`):** exigir `AUTOMATION_API_SECRET` (comparação em tempo constante via SHA-256 + `timingSafeEqual`) e `AUTOMATION_ALLOWED_SESSION_ID` (UUID da sessão demonstrativa controlada). A ausência de qualquer uma dessas variáveis bloqueia disparos e responde `503`. `session_id` é tratado exclusivamente como escopo, nunca como credencial; tentativas cross-session retornam `403`/`404`.
  3. **API enxuta com 2 endpoints internos (`/api/internal/campaign-monitor` e `/api/internal/campaign-monitor/alerts`):** eliminado o endpoint redundante `/register` (confirmações de ativação e alertas usam `/alerts` com `notification_channel` e `notification_status` validados estritamente: `recorded` | `sent` | `failed` | `skipped`). Nenhum endpoint interno altera `campaigns` (status, orçamento, desconto ou aprovação continuam sob guardrails determinísticos + HITL).
  4. **Tabela aditiva `campaign_automation_logs` (`supabase/migrations/20261127_campaign_automation_logs.sql`):** RLS *default-deny*, `idempotency_key` única contra duplicidade/replay, sem alterar tabelas existentes.
  5. **Motor determinístico e honestidade financeira (`src/lib/automation/campaign-pulse.ts`):** classifica `BUDGET_WARNING`, `NO_REDEMPTIONS`, `LOW_CONVERSION` e `HEALTHY` com thresholds configuráveis (`PULSE_*`, documentados como hipóteses de produto), excluindo eventos `source = 'demo_seed'`, usando nomenclatura explícita `estimated_budget_used` / `estimated_budget_utilization_pct` e expondo `campaign_monitor_state` + `should_untrack` para impedir limpeza indevida do Data Store do Make em falhas temporárias.
- **Alternativas consideradas:**
  - Manter n8n self-hosted com 3 endpoints (`register`, `GET`, `alerts`) — descartada pela dependência de infraestrutura local/própria e redundância do endpoint `register`.
  - Permitir consulta global de todas as sessões com um segredo compartilhado único — descartada pelo risco de vazamento cross-session.
- **Justificativa técnica e de negócio:** Viabiliza automação 100% cloud compatível com o plano gratuito do Make (iniciando com ciclo econômico de 12h), mantendo contratos HTTP independentes da ferramenta e proteção rigorosa contra vazamento de dados e alterações indevidas de campanhas.
- **Impactos e limitações:** No MVP, o segredo compartilhado fica restrito a uma única sessão demonstrativa (`AUTOMATION_ALLOWED_SESSION_ID`); em produção multi-tenant seria substituído por credenciais escopadas por conta/restaurante. A comprovação ponta a ponta depende da configuração e execução em uma instância real do Make.










