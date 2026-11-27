import {
  getAllowedAutomationSessionId,
  isSessionAllowedForAutomation,
} from "@/lib/automation/auth";
import {
  AUTOMATION_CONTRACT_VERSION,
  activationWebhookPayloadSchema,
  type ActivationWebhookPayload,
} from "@/lib/automation/schemas";
import type { CampaignRecord } from "@/lib/types";

export const WEBHOOK_TIMEOUT_MS = 4_000;
const DEFAULT_WEBHOOK_AUTH_HEADER = "x-make-apikey";

export interface WebhookDispatchResult {
  configured: boolean;
  delivered: boolean;
  skipped: boolean;
  http_status: number | null;
  idempotency_key: string | null;
  note: string;
}

/**
 * Resolve a URL do webhook de automação priorizando MAKE_WEBHOOK_URL.
 * Permite AUTOMATION_WEBHOOK_URL como alternativa genérica agnóstica.
 * NÃO usa N8N_WEBHOOK_URL como fallback para evitar disparos acidentais para integrações antigas.
 */
export function resolveAutomationWebhookUrl(
  env: Record<string, string | undefined> = process.env
): string | null {
  const makeUrl = env.MAKE_WEBHOOK_URL?.trim();
  if (makeUrl) return makeUrl;

  const genericUrl = env.AUTOMATION_WEBHOOK_URL?.trim();
  if (genericUrl) return genericUrl;

  return null;
}

export function resolveWebhookAuthHeaderName(
  env: Record<string, string | undefined> = process.env
): string {
  const custom = env.AUTOMATION_WEBHOOK_AUTH_HEADER?.trim().toLowerCase();
  if (custom && /^[a-z0-9-]+$/.test(custom)) {
    return custom;
  }
  return DEFAULT_WEBHOOK_AUTH_HEADER;
}

export function buildActivationWebhookPayload(
  campaign: CampaignRecord,
  now: Date = new Date()
): ActivationWebhookPayload {
  const rawApprovedAt = campaign.approved_at ?? now.toISOString();
  const parsedApprovedMs = Date.parse(rawApprovedAt);
  const approvedAt = Number.isFinite(parsedApprovedMs)
    ? new Date(parsedApprovedMs).toISOString()
    : now.toISOString();
  const idempotencyKey = `activation:${campaign.id}:${approvedAt}`;

  return {
    contract_version: AUTOMATION_CONTRACT_VERSION,
    event: "campaign_activated",
    mode: "demonstrativo",
    idempotency_key: idempotencyKey,
    sent_at: now.toISOString(),
    session_id: campaign.session_id ?? "",
    campaign: {
      id: campaign.id,
      restaurant_id: campaign.restaurant_id,
      title: campaign.title,
      objective: campaign.objective,
      target_window: campaign.target_window,
      coupon_limit: campaign.coupon_limit,
      budget_limit: campaign.budget_limit,
      estimated_cost_per_redemption: campaign.estimated_cost_per_redemption,
      approved_at: approvedAt,
    },
  };
}

/**
 * Dispara o webhook de ativação de forma não bloqueante e isolada.
 * - Fail-closed: exige AUTOMATION_ALLOWED_SESSION_ID configurada e correspondente à sessão da campanha.
 * - Usa autenticação nativa por API Key do Custom Webhook do Make (x-make-apikey).
 * - Valida o payload com Zod antes do envio.
 * - Timeout curto (4s) e try/catch isolado: falhas nunca bloqueiam a ativação da campanha.
 */
export async function dispatchCampaignActivationWebhook(
  campaign: CampaignRecord,
  options?: {
    env?: Record<string, string | undefined>;
    fetchImpl?: typeof fetch;
    now?: Date;
    timeoutMs?: number;
  }
): Promise<WebhookDispatchResult> {
  const env = options?.env ?? process.env;
  const webhookUrl = resolveAutomationWebhookUrl(env);

  if (!webhookUrl) {
    return {
      configured: false,
      delivered: false,
      skipped: true,
      http_status: null,
      idempotency_key: null,
      note: "MAKE_WEBHOOK_URL não configurada — ativação concluída localmente em modo demonstrativo.",
    };
  }

  // Princípio fail-closed: sem AUTOMATION_ALLOWED_SESSION_ID válida, nenhum disparo ocorre.
  const allowedSessionId = getAllowedAutomationSessionId(env);
  if (!allowedSessionId) {
    return {
      configured: true,
      delivered: false,
      skipped: true,
      http_status: null,
      idempotency_key: null,
      note: "Automação bloqueada (fail-closed): AUTOMATION_ALLOWED_SESSION_ID não configurada no servidor.",
    };
  }

  if (!isSessionAllowedForAutomation(campaign.session_id, env)) {
    return {
      configured: true,
      delivered: false,
      skipped: true,
      http_status: null,
      idempotency_key: null,
      note: "Sessão fora do escopo demonstrativo autorizado para automação — ativação concluída localmente.",
    };
  }

  const now = options?.now ?? new Date();
  const rawPayload = buildActivationWebhookPayload(campaign, now);
  const parsedPayload = activationWebhookPayloadSchema.safeParse(rawPayload);

  if (!parsedPayload.success) {
    return {
      configured: true,
      delivered: false,
      skipped: false,
      http_status: null,
      idempotency_key: null,
      note: "Payload de ativação rejeitado pela validação de contrato (ativação preservada sem bloqueio).",
    };
  }

  const payload = parsedPayload.data;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-Idempotency-Key": payload.idempotency_key,
    "X-Automation-Timestamp": String(now.getTime()),
  };

  const webhookSecret = env.AUTOMATION_WEBHOOK_SECRET?.trim();
  if (webhookSecret) {
    headers[resolveWebhookAuthHeaderName(env)] = webhookSecret;
  }

  const fetchFn = options?.fetchImpl ?? fetch;
  const timeoutMs = options?.timeoutMs ?? WEBHOOK_TIMEOUT_MS;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetchFn(webhookUrl, {
        method: "POST",
        headers,
        signal: controller.signal,
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const authHint =
          res.status === 401 || res.status === 403
            ? "Verifique a API Key (AUTOMATION_WEBHOOK_SECRET) no Custom Webhook."
            : "Ativação preservada sem bloqueio.";

        return {
          configured: true,
          delivered: false,
          skipped: false,
          http_status: res.status,
          idempotency_key: payload.idempotency_key,
          note: `Webhook respondeu HTTP ${res.status}. ${authHint}`,
        };
      }

      return {
        configured: true,
        delivered: true,
        skipped: false,
        http_status: res.status,
        idempotency_key: payload.idempotency_key,
        note: "Webhook de ativação entregue com sucesso.",
      };
    } finally {
      clearTimeout(timer);
    }
  } catch {
    return {
      configured: true,
      delivered: false,
      skipped: false,
      http_status: null,
      idempotency_key: payload.idempotency_key,
      note: "Webhook indisponível ou timeout (ativação preservada sem bloqueio).",
    };
  }
}
