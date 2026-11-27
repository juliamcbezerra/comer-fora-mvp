import { beforeEach, describe, expect, it, vi } from "vitest";
import { shouldUntrackFromOperationalIndex } from "@/lib/automation/campaign-pulse";
import { resetRateLimitStore } from "@/lib/rate-limit";

const ALLOWED_SESSION = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const OTHER_SESSION = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const ACTIVE_CAMPAIGN_ID = "11111111-1111-4111-8111-111111111111";
const PAUSED_CAMPAIGN_ID = "22222222-2222-4222-8222-222222222222";
const OTHER_SESSION_CAMPAIGN_ID = "33333333-3333-4333-8333-333333333333";
const RESTAURANT_ID = "44444444-4444-4444-8444-444444444444";
const API_SECRET = "automacao-segredo-teste-super-seguro-2026";

interface MockDbState {
  restaurants: Array<Record<string, unknown>>;
  campaigns: Array<Record<string, unknown>>;
  campaign_events: Array<Record<string, unknown>>;
  campaign_automation_logs: Array<Record<string, unknown>>;
  failNextSelectOn?: string | null;
  campaignMutationsAttempted: number;
}

let mockDb: MockDbState;

function createMockSupabaseClient() {
  return {
    from(table: keyof Omit<MockDbState, "failNextSelectOn" | "campaignMutationsAttempted">) {
      const filters: Array<(row: Record<string, unknown>) => boolean> = [];

      const applyFilters = (rows: Array<Record<string, unknown>>) =>
        rows.filter((row) => filters.every((fn) => fn(row)));

      const builder = {
        select() {
          return builder;
        },
        eq(col: string, val: unknown) {
          filters.push((row) => row[col] === val);
          return builder;
        },
        neq(col: string, val: unknown) {
          filters.push((row) => row[col] !== val);
          return builder;
        },
        in(col: string, vals: unknown[]) {
          filters.push((row) => vals.includes(row[col]));
          return builder;
        },
        order() {
          return builder;
        },
        maybeSingle: async () => {
          if (mockDb.failNextSelectOn === table) {
            mockDb.failNextSelectOn = null;
            return { data: null, error: { message: "Erro temporário de conexão" } };
          }
          const rows = applyFilters(mockDb[table]);
          return { data: rows[0] ?? null, error: null };
        },
        single: async () => {
          const rows = applyFilters(mockDb[table]);
          return { data: rows[0] ?? null, error: null };
        },
        insert(payload: Record<string, unknown>) {
          if (table === "campaigns") {
            mockDb.campaignMutationsAttempted += 1;
          }
          const created = {
            id: `99999999-9999-4999-8999-${String(mockDb[table].length + 1).padStart(12, "0")}`,
            created_at: "2026-11-27T18:00:00.000Z",
            ...payload,
          };
          const exists =
            table === "campaign_automation_logs" &&
            mockDb.campaign_automation_logs.some(
              (r) => r.idempotency_key === payload.idempotency_key
            );

          return {
            select() {
              return {
                single: async () => {
                  if (exists) {
                    return {
                      data: null,
                      error: { code: "23505", message: "duplicate key value" },
                    };
                  }
                  mockDb[table].push(created);
                  return { data: created, error: null };
                },
              };
            },
          };
        },
        update() {
          if (table === "campaigns") {
            mockDb.campaignMutationsAttempted += 1;
          }
          throw new Error("Mutação não permitida em campanhas pela automação.");
        },
        delete() {
          if (table === "campaigns") {
            mockDb.campaignMutationsAttempted += 1;
          }
          throw new Error("Exclusão não permitida em campanhas pela automação.");
        },
        then(resolve: (value: { data: Array<Record<string, unknown>> | null; error: { message: string } | null }) => void) {
          if (mockDb.failNextSelectOn === table) {
            mockDb.failNextSelectOn = null;
            resolve({ data: null, error: { message: "Erro temporário de conexão" } });
            return;
          }
          resolve({ data: applyFilters(mockDb[table]), error: null });
        },
      };

      return builder;
    },
  };
}

vi.mock("@/lib/supabase/server", () => ({
  getSupabaseAdmin: () => createMockSupabaseClient(),
  SupabaseConfigError: class SupabaseConfigError extends Error {},
}));

import { GET as getMonitor } from "./route";
import { POST as postAlert } from "./alerts/route";

describe("Endpoints internos /api/internal/campaign-monitor*", () => {
  beforeEach(() => {
    resetRateLimitStore();
    process.env.AUTOMATION_API_SECRET = API_SECRET;
    process.env.AUTOMATION_ALLOWED_SESSION_ID = ALLOWED_SESSION;

    mockDb = {
      restaurants: [{ id: RESTAURANT_ID, name: "Brava Osteria" }],
      campaigns: [
        {
          id: ACTIVE_CAMPAIGN_ID,
          restaurant_id: RESTAURANT_ID,
          session_id: ALLOWED_SESSION,
          title: "Jantar de Terça",
          target_window: "Terça e Quarta, 19h às 21h",
          coupon_limit: 20,
          budget_limit: 300,
          estimated_cost_per_redemption: 15,
          status: "active",
          human_approved: true,
          approved_at: "2026-11-26T10:00:00.000Z",
          created_at: "2026-11-26T09:00:00.000Z",
        },
        {
          id: PAUSED_CAMPAIGN_ID,
          restaurant_id: RESTAURANT_ID,
          session_id: ALLOWED_SESSION,
          title: "Campanha Pausada",
          target_window: "Quinta",
          coupon_limit: 10,
          budget_limit: 150,
          estimated_cost_per_redemption: 15,
          status: "paused",
          human_approved: true,
          approved_at: "2026-11-25T10:00:00.000Z",
          created_at: "2026-11-25T09:00:00.000Z",
        },
        {
          id: OTHER_SESSION_CAMPAIGN_ID,
          restaurant_id: RESTAURANT_ID,
          session_id: OTHER_SESSION,
          title: "Campanha de Outra Sessão",
          target_window: "Sexta",
          coupon_limit: 15,
          budget_limit: 225,
          estimated_cost_per_redemption: 15,
          status: "active",
          human_approved: true,
          approved_at: "2026-11-26T10:00:00.000Z",
          created_at: "2026-11-26T09:00:00.000Z",
        },
      ],
      campaign_events: [
        // 10 views reais + 1 redemption real (conversão 10% -> LOW_CONVERSION)
        ...Array.from({ length: 10 }, (_, idx) => ({
          id: `ev-view-${idx}`,
          campaign_id: ACTIVE_CAMPAIGN_ID,
          session_id: ALLOWED_SESSION,
          event_type: "view",
          source: "qr_scan",
        })),
        {
          id: "ev-redeem-1",
          campaign_id: ACTIVE_CAMPAIGN_ID,
          session_id: ALLOWED_SESSION,
          event_type: "redemption",
          source: "qr_scan",
        },
        // Eventos demo_seed indevidos que DEVEM ser excluídos
        {
          id: "ev-demo-1",
          campaign_id: ACTIVE_CAMPAIGN_ID,
          session_id: ALLOWED_SESSION,
          event_type: "redemption",
          source: "demo_seed",
        },
        {
          id: "ev-demo-2",
          campaign_id: ACTIVE_CAMPAIGN_ID,
          session_id: ALLOWED_SESSION,
          event_type: "redemption",
          source: "demo_seed",
        },
      ],
      campaign_automation_logs: [],
      failNextSelectOn: null,
      campaignMutationsAttempted: 0,
    };
  });

  it("Cenários 6 e 8: GET retorna apenas campanhas ativas da sessão, excluindo eventos demo_seed e expondo estimated_budget_used", async () => {
    const req = new Request(
      `https://example.com/api/internal/campaign-monitor?session_id=${ALLOWED_SESSION}`,
      { headers: { "x-automation-secret": API_SECRET } }
    );

    const res = await getMonitor(req);
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.campaigns).toHaveLength(1);
    expect(body.campaigns[0].campaign_id).toBe(ACTIVE_CAMPAIGN_ID);
    // Deve contar apenas 1 resgate real (ignorando os 2 eventos demo_seed)
    expect(body.campaigns[0].metrics.views).toBe(10);
    expect(body.campaigns[0].metrics.redemptions).toBe(1);
    expect(body.campaigns[0].metrics.estimated_budget_used).toBe(15);
    expect(body.campaigns[0].metrics.estimated_budget_utilization_pct).toBe(5);
    expect(body.campaigns[0].pulse_evaluation.alert_type).toBe("LOW_CONVERSION");
  });

  it("Cenário 7: bloqueia tentativa de acesso cross-session via session_id ou campaign_id", async () => {
    // 1. Tentativa alterando session_id na query -> 403
    const crossSessionQuery = await getMonitor(
      new Request(
        `https://example.com/api/internal/campaign-monitor?session_id=${OTHER_SESSION}`,
        { headers: { "x-automation-secret": API_SECRET } }
      )
    );
    expect(crossSessionQuery.status).toBe(403);

    // 2. Tentativa consultando campaign_id de outra sessão -> not_found sem vazar dados
    const crossCampaignId = await getMonitor(
      new Request(
        `https://example.com/api/internal/campaign-monitor?session_id=${ALLOWED_SESSION}&campaign_id=${OTHER_SESSION_CAMPAIGN_ID}`,
        { headers: { "x-automation-secret": API_SECRET } }
      )
    );
    expect(crossCampaignId.status).toBe(200);
    const crossBody = await crossCampaignId.json();
    expect(crossBody.campaigns).toHaveLength(0);
    expect(crossBody.campaign_monitor_state).toBe("not_found");
    expect(crossBody.should_untrack).toBe(false);

    // 3. Tentativa gravando alerta na campanha de outra sessão -> 404
    const crossPost = await postAlert(
      new Request("https://example.com/api/internal/campaign-monitor/alerts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-automation-secret": API_SECRET,
        },
        body: JSON.stringify({
          session_id: ALLOWED_SESSION,
          campaign_id: OTHER_SESSION_CAMPAIGN_ID,
          restaurant_id: RESTAURANT_ID,
          alert_type: "LOW_CONVERSION",
          message: "Tentativa indevida cross-session",
          notification_channel: "none",
          notification_status: "recorded",
          idempotency_key: "pulse:cross-session-test-01",
        }),
      })
    );
    expect(crossPost.status).toBe(404);
  });

  it("Cenário 10: sinaliza should_untrack=true para campanha pausada no GET e rejeita 409 no POST /alerts", async () => {
    const getPaused = await getMonitor(
      new Request(
        `https://example.com/api/internal/campaign-monitor?session_id=${ALLOWED_SESSION}&campaign_id=${PAUSED_CAMPAIGN_ID}`,
        { headers: { "x-automation-secret": API_SECRET } }
      )
    );
    expect(getPaused.status).toBe(200);
    const pausedBody = await getPaused.json();
    expect(pausedBody.campaign_monitor_state).toBe("inactive");
    expect(pausedBody.should_untrack).toBe(true);
    expect(
      shouldUntrackFromOperationalIndex({ httpStatus: getPaused.status, body: pausedBody })
    ).toBe(true);

    const postPaused = await postAlert(
      new Request("https://example.com/api/internal/campaign-monitor/alerts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-automation-secret": API_SECRET,
        },
        body: JSON.stringify({
          session_id: ALLOWED_SESSION,
          campaign_id: PAUSED_CAMPAIGN_ID,
          restaurant_id: RESTAURANT_ID,
          alert_type: "NO_REDEMPTIONS",
          message: "Campanha pausada não deve receber alerta.",
          notification_channel: "none",
          notification_status: "recorded",
          idempotency_key: "pulse:paused-test-0001",
        }),
      })
    );
    expect(postPaused.status).toBe(409);
  });

  it("Cenário 11 (HTTP): falha temporária na consulta retorna 500 e nunca autoriza limpeza do Data Store", async () => {
    mockDb.failNextSelectOn = "campaigns";

    const res = await getMonitor(
      new Request(
        `https://example.com/api/internal/campaign-monitor?session_id=${ALLOWED_SESSION}&campaign_id=${ACTIVE_CAMPAIGN_ID}`,
        { headers: { "x-automation-secret": API_SECRET } }
      )
    );

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(
      shouldUntrackFromOperationalIndex({ httpStatus: res.status, body })
    ).toBe(false);
  });

  it("Cenários 9, 12 e 13: registra alerta válido, previne duplicidade, rejeita status incoerente e nunca altera campaigns", async () => {
    // Status incorreto ('sent' com channel 'none') -> 400
    const badStatus = await postAlert(
      new Request("https://example.com/api/internal/campaign-monitor/alerts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-automation-secret": API_SECRET,
        },
        body: JSON.stringify({
          session_id: ALLOWED_SESSION,
          campaign_id: ACTIVE_CAMPAIGN_ID,
          restaurant_id: RESTAURANT_ID,
          alert_type: "ACTIVATION_REGISTERED",
          message: "Registro de ativação sem canal externo.",
          notification_channel: "none",
          notification_status: "sent",
          idempotency_key: "activation:bad-status-01",
        }),
      })
    );
    expect(badStatus.status).toBe(400);

    const validPayload = {
      session_id: ALLOWED_SESSION,
      campaign_id: ACTIVE_CAMPAIGN_ID,
      restaurant_id: RESTAURANT_ID,
      alert_type: "LOW_CONVERSION",
      message: "Conversão de 10% com 10 visualizações reais.",
      recommendation: "Reforçar script de 15s da equipe.",
      metrics_snapshot: {
        views: 10,
        redemptions: 1,
        estimated_budget_used: 15,
        estimated_budget_utilization_pct: 5,
      },
      notification_channel: "email",
      notification_status: "sent",
      idempotency_key: `pulse:${ACTIVE_CAMPAIGN_ID}:LOW_CONVERSION:2026-11-27`,
    };

    // 1ª gravação -> 201 Created
    const first = await postAlert(
      new Request("https://example.com/api/internal/campaign-monitor/alerts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-automation-secret": API_SECRET,
        },
        body: JSON.stringify(validPayload),
      })
    );
    expect(first.status).toBe(201);
    const firstBody = await first.json();
    expect(firstBody.recorded).toBe(true);
    expect(firstBody.deduplicated).toBe(false);
    expect(mockDb.campaign_automation_logs).toHaveLength(1);

    // 2ª gravação com mesma idempotency_key -> 200 deduplicated
    const second = await postAlert(
      new Request("https://example.com/api/internal/campaign-monitor/alerts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-automation-secret": API_SECRET,
        },
        body: JSON.stringify(validPayload),
      })
    );
    expect(second.status).toBe(200);
    const secondBody = await second.json();
    expect(secondBody.recorded).toBe(false);
    expect(secondBody.deduplicated).toBe(true);
    expect(mockDb.campaign_automation_logs).toHaveLength(1);

    // Nenhuma mutação tentada em campaigns
    expect(mockDb.campaignMutationsAttempted).toBe(0);
  });
});
