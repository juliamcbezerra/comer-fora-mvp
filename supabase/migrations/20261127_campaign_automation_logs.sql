-- ============================================================================
-- MIGRATION: CAMPAIGN AUTOMATION LOGS (CAMPAIGN PULSE)
-- Data: 2026-11-27
-- Aditiva: não modifica nenhuma tabela existente.
-- Segurança: RLS habilitado (default-deny para anon/authenticated).
-- Acesso exclusivo server-side via SUPABASE_SERVICE_ROLE_KEY.
-- ============================================================================

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

create index if not exists idx_campaign_automation_logs_campaign_created
  on public.campaign_automation_logs (campaign_id, created_at desc);

create index if not exists idx_campaign_automation_logs_session_created
  on public.campaign_automation_logs (session_id, created_at desc);

create index if not exists idx_campaign_automation_logs_alert_created
  on public.campaign_automation_logs (alert_type, created_at desc);

alter table public.campaign_automation_logs enable row level security;

-- Nenhuma policy permissiva para anon/authenticated é criada intencionalmente.
-- Apenas a service_role (usada exclusivamente no servidor Next.js) opera nesta tabela.
