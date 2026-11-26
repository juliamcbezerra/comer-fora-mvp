-- ============================================================================
-- COMER FORA IMPULSO — SEED DEMONSTRATIVO IDEMPOTENTE
-- Protótipo Conceitual • Dados 100% Fictícios (Zero PII / Zero dados reais)
-- ============================================================================

-- 1. RESTAURANTES DEMONSTRATIVOS (3 perfis do briefing)
insert into public.restaurants (
  id,
  session_id,
  name,
  category,
  neighborhood,
  city,
  avg_ticket,
  seating_capacity,
  opening_hours,
  low_demand_slots,
  current_salon_promotion,
  uses_totem,
  monthly_promo_budget,
  max_discount_pct,
  primary_goal,
  is_demo_seed,
  onboarding_completed
)
values
  (
    '11111111-1111-4111-8111-111111111101',
    null,
    'Brava Osteria',
    'Italiana',
    'Pinheiros',
    'São Paulo',
    115.00,
    60,
    'Ter a Dom, 12h às 23h',
    array['Terça jantar', 'Quarta jantar'],
    'nenhuma',
    false,
    800.00,
    20.00,
    'preencher_horarios_ociosos',
    true,
    true
  ),
  (
    '11111111-1111-4111-8111-111111111102',
    null,
    'Taco & Brasa',
    'Mexicana Casual',
    'Vila Madalena',
    'São Paulo',
    72.00,
    48,
    'Seg a Dom, 11h30 às 23h30',
    array['Segunda almoço', 'Terça almoço', 'Quarta almoço', 'Quinta almoço'],
    'apenas_redes_sociais',
    false,
    500.00,
    25.00,
    'aumentar_divulgacao_salao',
    true,
    true
  ),
  (
    '11111111-1111-4111-8111-111111111103',
    null,
    'Dona Nena Café & Bistrô',
    'Cafeteria & Brunch',
    'Moema',
    'São Paulo',
    54.00,
    32,
    'Ter a Dom, 08h30 às 19h30',
    array['Terça tarde', 'Quarta tarde', 'Quinta tarde'],
    'placa_simples_caixa',
    false,
    350.00,
    15.00,
    'gerar_recorrencia_giftback',
    true,
    true
  )
on conflict (id) do nothing;

-- 2. DIAGNÓSTICO DEMONSTRATIVO INICIAL PARA "TACO & BRASA"
insert into public.diagnostics (
  id,
  restaurant_id,
  session_id,
  readiness_score,
  deterministic_metrics,
  ai_output,
  prompt_version
)
values (
  '22222222-2222-4222-8222-222222222202',
  '11111111-1111-4111-8111-111111111102',
  null,
  55,
  '{
    "readiness_score": 55,
    "max_safe_cost_per_redemption": 18,
    "recommended_coupon_cap": 27,
    "operational_coupon_ceiling": 115,
    "idle_capacity_estimate": 384,
    "potential_monthly_capture": 1944
  }'::jsonb,
  '{
    "executive_summary": "Na Vila Madalena, o Taco & Brasa (Mexicana Casual, ticket de R$ 72) divulga o iFood Comer Fora só no Instagram e deixa o almoço de segunda a quinta subaproveitado. Com benefício seguro de até R$ 18 por cliente, o melhor caminho imediato é oferecer Nachos da Casa via display de mesa no almoço e puxar retorno com churros no Giftback.",
    "bottlenecks": [
      {
        "title": "Ausência de sinalização física no salão",
        "impact": "alto",
        "explanation": "A divulgação restrita às redes sociais desperdiça o fluxo diário de clientes que já estão sentados na mesa."
      },
      {
        "title": "Ociosidade concentrada no almoço de segunda a quinta",
        "impact": "alto",
        "explanation": "Quatro turnos consecutivos com baixa ocupação reduzem a diluição de custos fixos da cozinha."
      },
      {
        "title": "Sem captura estruturada para retorno",
        "impact": "medio",
        "explanation": "Sem totem ou mecânica de Giftback no fechamento da conta, o restaurante depende de mídia paga para reativar visitantes."
      }
    ],
    "opportunities": [
      {
        "title": "Display de mesa com QR Code no almoço",
        "priority": 1,
        "rationale": "Ativa o benefício do Comer Fora no momento de maior atenção do cliente sentado.",
        "expected_lever": "Conversão de clientes presenciais em usuários ativos do Comer Fora"
      },
      {
        "title": "Combo promocional protegido por margem",
        "priority": 2,
        "rationale": "Com custo máximo seguro de R$ 18 por resgate, uma cortesia de entrada ou sobremesa preserva o ticket médio de R$ 72.",
        "expected_lever": "Aumento de ocupação de seg a qui sem guerra de desconto"
      },
      {
        "title": "Gancho de Giftback para retorno em 15 dias",
        "priority": 3,
        "rationale": "Estimula a segunda visita com opt-in simples após o resgate no salão.",
        "expected_lever": "Crescimento da recorrência orgânica"
      }
    ],
    "recommended_plans": [
      {
        "objective": "aumentar_divulgacao_salao",
        "title": "Almoço na Brasa — Cortesia no Comer Fora",
        "target_window": "Segunda a Quinta, 11h30 às 15h",
        "mechanic_summary": "Cliente escaneia o QR Code na mesa e libera Nachos da Casa (custo estimado R$ 15) em pedidos de almoço.",
        "suggested_cost_per_redemption": 15,
        "suggested_coupon_limit": 27,
        "why_it_fits": "Respeita o teto seguro de R$ 18/resgate e utiliza R$ 405 dos R$ 500 de orçamento mensal."
      },
      {
        "objective": "preencher_horarios_ociosos",
        "title": "Quinta do Taco em Dobro Controlado",
        "target_window": "Terça e Quinta, 12h às 14h30",
        "mechanic_summary": "Benefício de R$ 16 no segundo taco artesanal mediante ativação via Comer Fora na chegada.",
        "suggested_cost_per_redemption": 16,
        "suggested_coupon_limit": 25,
        "why_it_fits": "Foca os dias de maior ociosidade com desembolso máximo travado em R$ 400."
      },
      {
        "objective": "gerar_recorrencia_giftback",
        "title": "Volte na Brasa — Giftback de Sobremesa",
        "target_window": "Segunda a Quinta, almoço",
        "mechanic_summary": "Resgate de churros artesanais (custo estimado R$ 12) + convite de retorno para a semana seguinte.",
        "suggested_cost_per_redemption": 12,
        "suggested_coupon_limit": 35,
        "why_it_fits": "Baixo custo unitário que permite alcançar até 35 mesas mantendo margem protegida."
      }
    ]
  }'::jsonb,
  'seed-demo-v1.0'
)
on conflict (id) do nothing;

-- 3. CAMPANHA ATIVA DEMONSTRATIVA PARA "TACO & BRASA"
insert into public.campaigns (
  id,
  restaurant_id,
  diagnostic_id,
  session_id,
  objective,
  title,
  offer_description,
  estimated_cost_per_redemption,
  budget_limit,
  coupon_limit,
  target_window,
  promo_copy,
  table_tent_headline,
  table_tent_body,
  staff_script,
  cta_text,
  recurrence_hook,
  status,
  human_approved,
  approved_at
)
values (
  '33333333-3333-4333-8333-333333333302',
  '11111111-1111-4111-8111-111111111102',
  '22222222-2222-4222-8222-222222222202',
  null,
  'aumentar_divulgacao_salao',
  'Almoço na Brasa — Cortesia no Comer Fora',
  'Porção de Nachos da Casa (benefício demonstrativo de até R$ 15) para quem ativar o iFood Comer Fora no almoço de segunda a quinta.',
  15.00,
  405.00,
  27,
  'Segunda a Quinta, 11h30 às 15h',
  'Almoço na Vila Madalena com sabor de brasa! De seg a qui (11h30–15h), ative o benefício do iFood Comer Fora direto na sua mesa no Taco & Brasa e ganhe Nachos da Casa. Estoque limitado a 27 cupons demonstrativos.',
  'Ganhe Nachos da Casa no Comer Fora',
  'Aponte a câmera para o QR Code, ative seu benefício demonstrativo do iFood Comer Fora no almoço (seg a qui) e mostre o código ao atendente.',
  'Oi! Tudo bem? Só passando para avisar que hoje no almoço temos um benefício do iFood Comer Fora direto aqui na mesa: escaneando esse QR Code você libera uma porção de Nachos da Casa na hora.',
  'Escaneie e ative seu benefício',
  'Ative o lembrete anônimo de retorno para destravar um Giftback de sobremesa na sua próxima visita de segunda a quinta.',
  'active',
  true,
  now() - interval '2 days'
)
on conflict (id) do nothing;

-- 4. EVENTOS DEMONSTRATIVOS (source = 'demo_seed') PARA FUNIL REAL NO DASHBOARD
-- 18 visualizações, 9 resgates (50% conversão), 5 opt-ins de recorrência (~55.6%)
insert into public.campaign_events (id, campaign_id, restaurant_id, session_id, event_type, coupon_code, source, metadata, created_at)
values
  ('44444444-4444-4444-8444-444444440001', '33333333-3333-4333-8333-333333333302', '11111111-1111-4111-8111-111111111102', null, 'view', null, 'demo_seed', '{"slot":"seg_almoco"}'::jsonb, now() - interval '46 hours'),
  ('44444444-4444-4444-8444-444444440002', '33333333-3333-4333-8333-333333333302', '11111111-1111-4111-8111-111111111102', null, 'view', null, 'demo_seed', '{"slot":"seg_almoco"}'::jsonb, now() - interval '45 hours'),
  ('44444444-4444-4444-8444-444444440003', '33333333-3333-4333-8333-333333333302', '11111111-1111-4111-8111-111111111102', null, 'view', null, 'demo_seed', '{"slot":"seg_almoco"}'::jsonb, now() - interval '44 hours'),
  ('44444444-4444-4444-8444-444444440004', '33333333-3333-4333-8333-333333333302', '11111111-1111-4111-8111-111111111102', null, 'view', null, 'demo_seed', '{"slot":"seg_almoco"}'::jsonb, now() - interval '43 hours'),
  ('44444444-4444-4444-8444-444444440005', '33333333-3333-4333-8333-333333333302', '11111111-1111-4111-8111-111111111102', null, 'view', null, 'demo_seed', '{"slot":"ter_almoco"}'::jsonb, now() - interval '36 hours'),
  ('44444444-4444-4444-8444-444444440006', '33333333-3333-4333-8333-333333333302', '11111111-1111-4111-8111-111111111102', null, 'view', null, 'demo_seed', '{"slot":"ter_almoco"}'::jsonb, now() - interval '35 hours'),
  ('44444444-4444-4444-8444-444444440007', '33333333-3333-4333-8333-333333333302', '11111111-1111-4111-8111-111111111102', null, 'view', null, 'demo_seed', '{"slot":"ter_almoco"}'::jsonb, now() - interval '34 hours'),
  ('44444444-4444-4444-8444-444444440008', '33333333-3333-4333-8333-333333333302', '11111111-1111-4111-8111-111111111102', null, 'view', null, 'demo_seed', '{"slot":"ter_almoco"}'::jsonb, now() - interval '33 hours'),
  ('44444444-4444-4444-8444-444444440009', '33333333-3333-4333-8333-333333333302', '11111111-1111-4111-8111-111111111102', null, 'view', null, 'demo_seed', '{"slot":"ter_almoco"}'::jsonb, now() - interval '32 hours'),
  ('44444444-4444-4444-8444-444444440010', '33333333-3333-4333-8333-333333333302', '11111111-1111-4111-8111-111111111102', null, 'view', null, 'demo_seed', '{"slot":"qua_almoco"}'::jsonb, now() - interval '24 hours'),
  ('44444444-4444-4444-8444-444444440011', '33333333-3333-4333-8333-333333333302', '11111111-1111-4111-8111-111111111102', null, 'view', null, 'demo_seed', '{"slot":"qua_almoco"}'::jsonb, now() - interval '23 hours'),
  ('44444444-4444-4444-8444-444444440012', '33333333-3333-4333-8333-333333333302', '11111111-1111-4111-8111-111111111102', null, 'view', null, 'demo_seed', '{"slot":"qua_almoco"}'::jsonb, now() - interval '22 hours'),
  ('44444444-4444-4444-8444-444444440013', '33333333-3333-4333-8333-333333333302', '11111111-1111-4111-8111-111111111102', null, 'view', null, 'demo_seed', '{"slot":"qua_almoco"}'::jsonb, now() - interval '20 hours'),
  ('44444444-4444-4444-8444-444444440014', '33333333-3333-4333-8333-333333333302', '11111111-1111-4111-8111-111111111102', null, 'view', null, 'demo_seed', '{"slot":"qui_almoco"}'::jsonb, now() - interval '12 hours'),
  ('44444444-4444-4444-8444-444444440015', '33333333-3333-4333-8333-333333333302', '11111111-1111-4111-8111-111111111102', null, 'view', null, 'demo_seed', '{"slot":"qui_almoco"}'::jsonb, now() - interval '11 hours'),
  ('44444444-4444-4444-8444-444444440016', '33333333-3333-4333-8333-333333333302', '11111111-1111-4111-8111-111111111102', null, 'view', null, 'demo_seed', '{"slot":"qui_almoco"}'::jsonb, now() - interval '10 hours'),
  ('44444444-4444-4444-8444-444444440017', '33333333-3333-4333-8333-333333333302', '11111111-1111-4111-8111-111111111102', null, 'view', null, 'demo_seed', '{"slot":"qui_almoco"}'::jsonb, now() - interval '8 hours'),
  ('44444444-4444-4444-8444-444444440018', '33333333-3333-4333-8333-333333333302', '11111111-1111-4111-8111-111111111102', null, 'view', null, 'demo_seed', '{"slot":"qui_almoco"}'::jsonb, now() - interval '6 hours'),

  ('44444444-4444-4444-8444-444444440101', '33333333-3333-4333-8333-333333333302', '11111111-1111-4111-8111-111111111102', null, 'redemption', 'CF-TB01', 'demo_seed', '{"slot":"seg_almoco"}'::jsonb, now() - interval '45 hours'),
  ('44444444-4444-4444-8444-444444440102', '33333333-3333-4333-8333-333333333302', '11111111-1111-4111-8111-111111111102', null, 'redemption', 'CF-TB02', 'demo_seed', '{"slot":"seg_almoco"}'::jsonb, now() - interval '43 hours'),
  ('44444444-4444-4444-8444-444444440103', '33333333-3333-4333-8333-333333333302', '11111111-1111-4111-8111-111111111102', null, 'redemption', 'CF-TB03', 'demo_seed', '{"slot":"ter_almoco"}'::jsonb, now() - interval '35 hours'),
  ('44444444-4444-4444-8444-444444440104', '33333333-3333-4333-8333-333333333302', '11111111-1111-4111-8111-111111111102', null, 'redemption', 'CF-TB04', 'demo_seed', '{"slot":"ter_almoco"}'::jsonb, now() - interval '33 hours'),
  ('44444444-4444-4444-8444-444444440105', '33333333-3333-4333-8333-333333333302', '11111111-1111-4111-8111-111111111102', null, 'redemption', 'CF-TB05', 'demo_seed', '{"slot":"qua_almoco"}'::jsonb, now() - interval '23 hours'),
  ('44444444-4444-4444-8444-444444440106', '33333333-3333-4333-8333-333333333302', '11111111-1111-4111-8111-111111111102', null, 'redemption', 'CF-TB06', 'demo_seed', '{"slot":"qua_almoco"}'::jsonb, now() - interval '21 hours'),
  ('44444444-4444-4444-8444-444444440107', '33333333-3333-4333-8333-333333333302', '11111111-1111-4111-8111-111111111102', null, 'redemption', 'CF-TB07', 'demo_seed', '{"slot":"qui_almoco"}'::jsonb, now() - interval '11 hours'),
  ('44444444-4444-4444-8444-444444440108', '33333333-3333-4333-8333-333333333302', '11111111-1111-4111-8111-111111111102', null, 'redemption', 'CF-TB08', 'demo_seed', '{"slot":"qui_almoco"}'::jsonb, now() - interval '9 hours'),
  ('44444444-4444-4444-8444-444444440109', '33333333-3333-4333-8333-333333333302', '11111111-1111-4111-8111-111111111102', null, 'redemption', 'CF-TB09', 'demo_seed', '{"slot":"qui_almoco"}'::jsonb, now() - interval '6 hours'),

  ('44444444-4444-4444-8444-444444440201', '33333333-3333-4333-8333-333333333302', '11111111-1111-4111-8111-111111111102', null, 'recurrence_opt_in', 'CF-TB01', 'demo_seed', '{"anonymous":true}'::jsonb, now() - interval '45 hours'),
  ('44444444-4444-4444-8444-444444440202', '33333333-3333-4333-8333-333333333302', '11111111-1111-4111-8111-111111111102', null, 'recurrence_opt_in', 'CF-TB03', 'demo_seed', '{"anonymous":true}'::jsonb, now() - interval '35 hours'),
  ('44444444-4444-4444-8444-444444440203', '33333333-3333-4333-8333-333333333302', '11111111-1111-4111-8111-111111111102', null, 'recurrence_opt_in', 'CF-TB05', 'demo_seed', '{"anonymous":true}'::jsonb, now() - interval '23 hours'),
  ('44444444-4444-4444-8444-444444440204', '33333333-3333-4333-8333-333333333302', '11111111-1111-4111-8111-111111111102', null, 'recurrence_opt_in', 'CF-TB07', 'demo_seed', '{"anonymous":true}'::jsonb, now() - interval '11 hours'),
  ('44444444-4444-4444-8444-444444440205', '33333333-3333-4333-8333-333333333302', '11111111-1111-4111-8111-111111111102', null, 'recurrence_opt_in', 'CF-TB09', 'demo_seed', '{"anonymous":true}'::jsonb, now() - interval '6 hours')
on conflict (id) do nothing;
