import { describe, expect, it, vi } from "vitest";
import {
  isSessionAllowedForAutomation,
  verifyAutomationApiAuth,
} from "./auth";
import {
  buildPulseIdempotencyKey,
  calculateCampaignPulseMetrics,
  evaluateCampaignPulse,
  shouldUntrackFromOperationalIndex,
} from "./campaign-pulse";
import {
  activationWebhookPayloadSchema,
  campaignAlertInputSchema,
} from "./schemas";
import {
  dispatchCampaignActivationWebhook,
  resolveAutomationWebhookUrl,
} from "./webhook";
import type { CampaignRecord } from "@/lib/types";

const ALLOWED_SESSION = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const OTHER_SESSION = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const CAMPAIGN_ID = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const RESTAURANT_ID = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";

function makeCampaign(overrides: Partial<CampaignRecord> = {}): CampaignRecord {
  return {
    id: CAMPAIGN_ID,
    restaurant_id: RESTAURANT_ID,
    diagnostic_id: null,
    session_id: ALLOWED_SESSION,
    objective: "preencher_horarios_ociosos",
    title: "Jantar de Terça Especial",
    offer_description: "Sobremesa cortesia no Comer Fora",
    estimated_cost_per_redemption: 15,
    budget_limit: 375,
    coupon_limit: 25,
    target_window: "Terça e Quarta, 19h às 21h",
    promo_copy: "Aproveite o benefício exclusivo no salão.",
    table_tent_headline: "Ganhe sobremesa na mesa",
    table_tent_body: "Escaneie o QR Code e ative seu benefício demonstrativo.",
    staff_script: "Oi! Temos um benefício do iFood Comer Fora hoje na mesa.",
    cta_text: "Escaneie e ative",
    recurrence_hook: "Ative o lembrete anônimo para retorno.",
    status: "active",
    human_approved: true,
    approved_at: "2026-11-26T15:00:00.000Z",
    created_at: "2026-11-26T14:00:00.000Z",
    ...overrides,
  };
}

describe("Automation Auth (fail-closed & constant-time)", () => {
  it("bloqueia com 503 quando AUTOMATION_API_SECRET ou AUTOMATION_ALLOWED_SESSION_ID estão ausentes", () => {
    const req = new Request("https://example.com/api/internal/campaign-monitor", {
      headers: { "x-automation-secret": "segredo-super-forte" },
    });

    const missingSecret = verifyAutomationApiAuth(req, {
      env: { AUTOMATION_ALLOWED_SESSION_ID: ALLOWED_SESSION },
    });
    expect(missingSecret.ok).toBe(false);
    if (!missingSecret.ok) expect(missingSecret.status).toBe(503);

    const missingSession = verifyAutomationApiAuth(req, {
      env: { AUTOMATION_API_SECRET: "segredo-super-forte" },
    });
    expect(missingSession.ok).toBe(false);
    if (!missingSession.ok) expect(missingSession.status).toBe(503);
  });

  it("rejeita com 401 segredo ausente, incorreto ou timestamp expirado", () => {
    const env = {
      AUTOMATION_API_SECRET: "segredo-super-forte-123456",
      AUTOMATION_ALLOWED_SESSION_ID: ALLOWED_SESSION,
    };

    const noHeader = verifyAutomationApiAuth(
      new Request("https://example.com/api/internal/campaign-monitor"),
      { env }
    );
    expect(noHeader.ok).toBe(false);
    if (!noHeader.ok) expect(noHeader.status).toBe(401);

    const wrongSecret = verifyAutomationApiAuth(
      new Request("https://example.com/api/internal/campaign-monitor", {
        headers: { "x-automation-secret": "errado" },
      }),
      { env }
    );
    expect(wrongSecret.ok).toBe(false);
    if (!wrongSecret.ok) expect(wrongSecret.status).toBe(401);

    const nowMs = 1_700_000_000_000;
    const expiredTs = verifyAutomationApiAuth(
      new Request("https://example.com/api/internal/campaign-monitor", {
        headers: {
          "x-automation-secret": "segredo-super-forte-123456",
          "x-automation-timestamp": String(nowMs - 10 * 60 * 1000),
        },
      }),
      { env, nowMs }
    );
    expect(expiredTs.ok).toBe(false);
    if (!expiredTs.ok) expect(expiredTs.status).toBe(401);
  });

  it("aceita segredo válido via x-automation-secret ou Bearer e valida sessão permitida", () => {
    const env = {
      AUTOMATION_API_SECRET: "segredo-super-forte-123456",
      AUTOMATION_ALLOWED_SESSION_ID: ALLOWED_SESSION,
    };

    const ok = verifyAutomationApiAuth(
      new Request("https://example.com/api/internal/campaign-monitor", {
        headers: { Authorization: "Bearer segredo-super-forte-123456" },
      }),
      { env }
    );
    expect(ok).toEqual({ ok: true, allowedSessionId: ALLOWED_SESSION });
    expect(isSessionAllowedForAutomation(ALLOWED_SESSION, env)).toBe(true);
    expect(isSessionAllowedForAutomation(OTHER_SESSION, env)).toBe(false);
    expect(isSessionAllowedForAutomation(ALLOWED_SESSION, {})).toBe(false);
  });
});

describe("Webhook de Ativação (Make native API Key, fail-closed e não bloqueante)", () => {
  it("prioriza MAKE_WEBHOOK_URL e NÃO faz fallback para N8N_WEBHOOK_URL", () => {
    expect(
      resolveAutomationWebhookUrl({
        N8N_WEBHOOK_URL: "https://old-n8n.example.com/hook",
      })
    ).toBeNull();

    expect(
      resolveAutomationWebhookUrl({
        MAKE_WEBHOOK_URL: "https://hook.us2.make.com/abc123",
        AUTOMATION_WEBHOOK_URL: "https://generic.example.com/hook",
        N8N_WEBHOOK_URL: "https://old-n8n.example.com/hook",
      })
    ).toBe("https://hook.us2.make.com/abc123");
  });

  it("Cenário 1: envia payload válido com x-make-apikey, X-Idempotency-Key e X-Automation-Timestamp", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("Accepted", { status: 200 }));
    const now = new Date("2026-11-27T15:00:00.000Z");

    const result = await dispatchCampaignActivationWebhook(makeCampaign(), {
      env: {
        MAKE_WEBHOOK_URL: "https://hook.us2.make.com/abc123",
        AUTOMATION_WEBHOOK_SECRET: "make-api-key-secreta",
        AUTOMATION_ALLOWED_SESSION_ID: ALLOWED_SESSION,
      },
      fetchImpl: fetchMock as unknown as typeof fetch,
      now,
    });

    expect(result.configured).toBe(true);
    expect(result.delivered).toBe(true);
    expect(result.http_status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://hook.us2.make.com/abc123");
    const headers = init.headers as Record<string, string>;
    expect(headers["x-make-apikey"]).toBe("make-api-key-secreta");
    expect(headers["X-Idempotency-Key"]).toContain(`activation:${CAMPAIGN_ID}:`);
    expect(headers["X-Automation-Timestamp"]).toBe(String(now.getTime()));

    const parsedBody = activationWebhookPayloadSchema.safeParse(
      JSON.parse(String(init.body))
    );
    expect(parsedBody.success).toBe(true);
  });

  it("Cenário 2: trata autenticação inválida (HTTP 401 do Make) sem bloquear a ativação", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("Unauthorized", { status: 401 }));

    const result = await dispatchCampaignActivationWebhook(makeCampaign(), {
      env: {
        MAKE_WEBHOOK_URL: "https://hook.us2.make.com/abc123",
        AUTOMATION_WEBHOOK_SECRET: "chave-invalida",
        AUTOMATION_ALLOWED_SESSION_ID: ALLOWED_SESSION,
      },
      fetchImpl: fetchMock as unknown as typeof fetch,
    });

    expect(result.configured).toBe(true);
    expect(result.delivered).toBe(false);
    expect(result.http_status).toBe(401);
    expect(result.note).toContain("401");
  });

  it("Cenário 3: bloqueia disparo (fail-closed) se AUTOMATION_ALLOWED_SESSION_ID estiver ausente ou payload for inválido", async () => {
    const fetchMock = vi.fn();

    const noAllowedSession = await dispatchCampaignActivationWebhook(makeCampaign(), {
      env: {
        MAKE_WEBHOOK_URL: "https://hook.us2.make.com/abc123",
      },
      fetchImpl: fetchMock as unknown as typeof fetch,
    });
    expect(noAllowedSession.delivered).toBe(false);
    expect(noAllowedSession.skipped).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();

    const invalidPayload = await dispatchCampaignActivationWebhook(
      makeCampaign({ coupon_limit: 0 }),
      {
        env: {
          MAKE_WEBHOOK_URL: "https://hook.us2.make.com/abc123",
          AUTOMATION_ALLOWED_SESSION_ID: ALLOWED_SESSION,
        },
        fetchImpl: fetchMock as unknown as typeof fetch,
      }
    );
    expect(invalidPayload.delivered).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("Cenário 5: absorve falha de rede e timeout sem lançar exceção", async () => {
    const fetchTimeout = vi.fn().mockRejectedValue(new DOMException("Aborted", "AbortError"));

    const result = await dispatchCampaignActivationWebhook(makeCampaign(), {
      env: {
        MAKE_WEBHOOK_URL: "https://hook.us2.make.com/abc123",
        AUTOMATION_ALLOWED_SESSION_ID: ALLOWED_SESSION,
      },
      fetchImpl: fetchTimeout as unknown as typeof fetch,
    });

    expect(result.configured).toBe(true);
    expect(result.delivered).toBe(false);
    expect(result.http_status).toBeNull();
    expect(result.note).toContain("timeout");
  });
});

describe("Motor determinístico Campaign Pulse, contratos e proteção do Data Store", () => {
  it("calcula estimated_budget_used e classifica BUDGET_WARNING, NO_REDEMPTIONS, LOW_CONVERSION e HEALTHY", () => {
    const now = new Date("2026-11-27T18:00:00.000Z");

    const budgetMetrics = calculateCampaignPulseMetrics({
      views: 30,
      redemptions: 21,
      optIns: 10,
      couponLimit: 25,
      budgetLimit: 375,
      estimatedCostPerRedemption: 15,
      activatedAtIso: "2026-11-26T15:00:00.000Z",
      now,
    });
    expect(budgetMetrics.estimated_budget_used).toBe(315);
    expect(budgetMetrics.estimated_budget_utilization_pct).toBe(84);
    expect(
      evaluateCampaignPulse({ campaignId: CAMPAIGN_ID, metrics: budgetMetrics, now }).alert_type
    ).toBe("BUDGET_WARNING");

    const noRedemptionsMetrics = calculateCampaignPulseMetrics({
      views: 6,
      redemptions: 0,
      optIns: 0,
      couponLimit: 25,
      budgetLimit: 375,
      estimatedCostPerRedemption: 15,
      activatedAtIso: "2026-11-27T12:00:00.000Z",
      now,
    });
    expect(
      evaluateCampaignPulse({ campaignId: CAMPAIGN_ID, metrics: noRedemptionsMetrics, now })
        .alert_type
    ).toBe("NO_REDEMPTIONS");

    const lowConvMetrics = calculateCampaignPulseMetrics({
      views: 20,
      redemptions: 2,
      optIns: 1,
      couponLimit: 25,
      budgetLimit: 375,
      estimatedCostPerRedemption: 15,
      activatedAtIso: "2026-11-26T15:00:00.000Z",
      now,
    });
    const lowConvEval = evaluateCampaignPulse({
      campaignId: CAMPAIGN_ID,
      metrics: lowConvMetrics,
      now,
    });
    expect(lowConvEval.alert_type).toBe("LOW_CONVERSION");
    expect(lowConvEval.should_alert).toBe(true);

    // Deduplicação na janela impede novo alerta
    const dedupEval = evaluateCampaignPulse({
      campaignId: CAMPAIGN_ID,
      metrics: lowConvMetrics,
      existingIdempotencyKeys: new Set([
        buildPulseIdempotencyKey(CAMPAIGN_ID, "LOW_CONVERSION", now),
      ]),
      now,
    });
    expect(dedupEval.already_logged_in_window).toBe(true);
    expect(dedupEval.should_alert).toBe(false);

    const healthyMetrics = calculateCampaignPulseMetrics({
      views: 15,
      redemptions: 5,
      optIns: 3,
      couponLimit: 25,
      budgetLimit: 375,
      estimatedCostPerRedemption: 15,
      activatedAtIso: "2026-11-27T10:00:00.000Z",
      now,
    });
    const healthyEval = evaluateCampaignPulse({
      campaignId: CAMPAIGN_ID,
      metrics: healthyMetrics,
      now,
    });
    expect(healthyEval.alert_type).toBe("HEALTHY");
    expect(healthyEval.should_alert).toBe(false);
  });

  it("Cenário 11: impede limpeza indevida do Data Store em falhas temporárias ou respostas não-200", () => {
    expect(shouldUntrackFromOperationalIndex({ httpStatus: 500, body: null })).toBe(false);
    expect(shouldUntrackFromOperationalIndex({ httpStatus: 503, body: { should_untrack: true, campaign_monitor_state: "inactive" } })).toBe(false);
    expect(shouldUntrackFromOperationalIndex({ httpStatus: null, body: null })).toBe(false);
    expect(shouldUntrackFromOperationalIndex({ httpStatus: 200, body: { should_untrack: false, campaign_monitor_state: "active" } })).toBe(false);
    expect(shouldUntrackFromOperationalIndex({ httpStatus: 200, body: { should_untrack: false, campaign_monitor_state: "not_found" } })).toBe(false);
    expect(
      shouldUntrackFromOperationalIndex({
        httpStatus: 200,
        body: { should_untrack: true, campaign_monitor_state: "inactive" },
      })
    ).toBe(true);
  });

  it("Cenário 12: rejeita notification_status 'sent' ou 'failed' quando notification_channel é 'none'", () => {
    const invalidSent = campaignAlertInputSchema.safeParse({
      session_id: ALLOWED_SESSION,
      campaign_id: CAMPAIGN_ID,
      restaurant_id: RESTAURANT_ID,
      alert_type: "ACTIVATION_REGISTERED",
      message: "Campanha registrada para monitoramento.",
      notification_channel: "none",
      notification_status: "sent",
      idempotency_key: `activation:${CAMPAIGN_ID}:2026-11-27`,
    });
    expect(invalidSent.success).toBe(false);

    const validRecorded = campaignAlertInputSchema.safeParse({
      session_id: ALLOWED_SESSION,
      campaign_id: CAMPAIGN_ID,
      restaurant_id: RESTAURANT_ID,
      alert_type: "ACTIVATION_REGISTERED",
      message: "Campanha registrada para monitoramento.",
      notification_channel: "none",
      notification_status: "recorded",
      idempotency_key: `activation:${CAMPAIGN_ID}:2026-11-27`,
    });
    expect(validRecorded.success).toBe(true);
  });
});
