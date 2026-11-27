-- ============================================================================
-- COMER FORA IMPULSO — SCHEMA SUPABASE (POSTGRESQL)
-- Protótipo Conceitual • Dados Demonstrativos
-- ============================================================================
-- Segurança:
-- - Row Level Security (RLS) habilitado em todas as tabelas com política
--   default-deny para acesso direto via chave pública (anon/authenticated).
-- - Toda leitura e escrita ocorre via Next.js Route Handlers server-side
--   com SUPABASE_SERVICE_ROLE_KEY e isolamento por session_id (cookie HttpOnly).
-- ============================================================================

create extension if not exists pgcrypto;

-- 1. RESTAURANTS
create table if not exists public.restaurants (
  id uuid primary key default gen_random_uuid(),
  session_id text,
  name text not null,
  category text not null,
  neighborhood text not null,
  city text not null default 'São Paulo',
  avg_ticket numeric(10, 2) not null check (avg_ticket > 0),
  seating_capacity integer not null check (seating_capacity > 0),
  opening_hours text not null,
  low_demand_slots text[] not null default '{}',
  current_salon_promotion text not null,
  uses_totem boolean not null default false,
  monthly_promo_budget numeric(10, 2) not null check (monthly_promo_budget >= 0),
  max_discount_pct numeric(5, 2) not null check (max_discount_pct > 0 and max_discount_pct <= 50),
  primary_goal text not null,
  is_demo_seed boolean not null default false,
  onboarding_completed boolean not null default true,
  created_at timestamptz not null default now()
);

-- 2. DIAGNOSTICS
create table if not exists public.diagnostics (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  session_id text,
  readiness_score integer not null check (readiness_score >= 0 and readiness_score <= 100),
  deterministic_metrics jsonb not null,
  ai_output jsonb not null,
  prompt_version text not null default 'v1.0',
  created_at timestamptz not null default now()
);

-- 3. CAMPAIGNS
create table if not exists public.campaigns (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  diagnostic_id uuid references public.diagnostics(id) on delete set null,
  session_id text,
  objective text not null,
  title text not null,
  offer_description text not null,
  estimated_cost_per_redemption numeric(10, 2) not null check (estimated_cost_per_redemption > 0),
  budget_limit numeric(10, 2) not null check (budget_limit > 0),
  coupon_limit integer not null check (coupon_limit > 0),
  target_window text not null,
  promo_copy text not null,
  table_tent_headline text not null,
  table_tent_body text not null,
  staff_script text not null,
  cta_text text not null,
  recurrence_hook text not null,
  status text not null default 'draft' check (status in ('draft', 'active', 'paused', 'completed')),
  human_approved boolean not null default false,
  approved_at timestamptz,
  created_at timestamptz not null default now()
);

-- 4. CAMPAIGN EVENTS
create table if not exists public.campaign_events (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  session_id text,
  event_type text not null check (event_type in ('view', 'redemption', 'recurrence_opt_in')),
  coupon_code text,
  source text not null default 'qr_scan' check (source in ('qr_scan', 'simulator', 'demo_seed')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- 5. AI RUNS (Observabilidade dos agentes)
create table if not exists public.ai_runs (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid references public.restaurants(id) on delete set null,
  session_id text,
  agent_name text not null check (agent_name in ('diagnostic_strategist', 'creative_activator')),
  model text not null,
  prompt_version text not null,
  latency_ms integer not null check (latency_ms >= 0),
  status text not null check (status in ('success', 'fallback', 'error')),
  error_message text,
  created_at timestamptz not null default now()
);

-- 6. CAMPAIGN AUTOMATION LOGS (Trilha auditável do Campaign Pulse)
create table if not exists public.campaign_automation_logs (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  session_id text not null,
  alert_type text not null check (
    alert_type in (
      'ACTIVATION_REGISTERED',
      'NO_REDEMPTIONS',
      'LOW_CONVERSION',
      'BUDGET_WARNING',
      'HEALTHY'
    )
  ),
  message text not null,
  recommendation text,
  metrics_snapshot jsonb not null default '{}'::jsonb,
  notification_channel text not null default 'none' check (
    notification_channel in ('none', 'email', 'slack', 'discord', 'webhook')
  ),
  notification_status text not null default 'recorded' check (
    notification_status in ('recorded', 'sent', 'failed', 'skipped')
  ),
  idempotency_key text not null unique,
  created_at timestamptz not null default now()
);

-- ============================================================================
-- ÍNDICES
-- ============================================================================
create index if not exists idx_restaurants_session_id on public.restaurants (session_id);
create index if not exists idx_restaurants_is_demo_seed on public.restaurants (is_demo_seed);
create index if not exists idx_diagnostics_restaurant_created on public.diagnostics (restaurant_id, created_at desc);
create index if not exists idx_diagnostics_session_id on public.diagnostics (session_id);
create index if not exists idx_campaigns_restaurant_created on public.campaigns (restaurant_id, created_at desc);
create index if not exists idx_campaigns_session_id on public.campaigns (session_id);
create index if not exists idx_campaign_events_campaign_type on public.campaign_events (campaign_id, event_type);
create index if not exists idx_campaign_events_restaurant_created on public.campaign_events (restaurant_id, created_at desc);
create index if not exists idx_ai_runs_created on public.ai_runs (created_at desc);
create index if not exists idx_ai_runs_restaurant_id on public.ai_runs (restaurant_id);
create index if not exists idx_campaign_automation_logs_campaign_created on public.campaign_automation_logs (campaign_id, created_at desc);
create index if not exists idx_campaign_automation_logs_session_created on public.campaign_automation_logs (session_id, created_at desc);
create index if not exists idx_campaign_automation_logs_alert_created on public.campaign_automation_logs (alert_type, created_at desc);

-- ============================================================================
-- ROW LEVEL SECURITY (DEFAULT-DENY PARA CLIENTE PÚBLICO)
-- ============================================================================
alter table public.restaurants enable row level security;
alter table public.diagnostics enable row level security;
alter table public.campaigns enable row level security;
alter table public.campaign_events enable row level security;
alter table public.ai_runs enable row level security;
alter table public.campaign_automation_logs enable row level security;

-- Nenhuma policy permissiva para anon/authenticated é criada intencionalmente.
-- Apenas a service_role (usada exclusivamente no servidor Next.js) opera nas tabelas.
