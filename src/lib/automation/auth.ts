import { createHash, timingSafeEqual } from "node:crypto";
import { isValidUuid } from "@/lib/session";

const MAX_TIMESTAMP_DRIFT_MS = 5 * 60 * 1000; // 5 minutos

export interface AutomationAuthSuccess {
  ok: true;
  allowedSessionId: string;
}

export interface AutomationAuthFailure {
  ok: false;
  status: 401 | 503;
  error: string;
}

export type AutomationAuthResult = AutomationAuthSuccess | AutomationAuthFailure;

function sha256Buffer(value: string): Buffer {
  return createHash("sha256").update(value, "utf8").digest();
}

/**
 * Comparação em tempo constante usando digest SHA-256 para evitar
 * vazamento de tamanho e ataques de timing.
 */
export function secureCompareSecrets(provided: string, expected: string): boolean {
  if (!provided || !expected) return false;
  const a = sha256Buffer(provided);
  const b = sha256Buffer(expected);
  return timingSafeEqual(a, b);
}

export type EnvMap = Record<string, string | undefined>;

/**
 * Retorna o UUID da sessão demonstrativa controlada autorizada para automação.
 * Princípio fail-closed: retorna null se ausente ou malformado.
 */
export function getAllowedAutomationSessionId(
  env: EnvMap = process.env
): string | null {
  const raw = env.AUTOMATION_ALLOWED_SESSION_ID?.trim();
  return isValidUuid(raw) ? raw : null;
}

/**
 * Verifica se uma sessão específica está autorizada a interagir com a automação.
 * Fail-closed: retorna false sempre que AUTOMATION_ALLOWED_SESSION_ID não estiver configurada.
 */
export function isSessionAllowedForAutomation(
  sessionId: string | null | undefined,
  env: EnvMap = process.env
): boolean {
  const allowed = getAllowedAutomationSessionId(env);
  if (!allowed || !isValidUuid(sessionId)) {
    return false;
  }
  return sessionId === allowed;
}

function extractProvidedSecret(request: Request): string | null {
  const directHeader = request.headers.get("x-automation-secret")?.trim();
  if (directHeader) {
    return directHeader;
  }

  const authHeader = request.headers.get("authorization")?.trim();
  if (authHeader && authHeader.toLowerCase().startsWith("bearer ")) {
    const token = authHeader.slice(7).trim();
    return token || null;
  }

  return null;
}

/**
 * Autentica requisições recebidas nos endpoints internos /api/internal/campaign-monitor*.
 * - Exige AUTOMATION_API_SECRET e AUTOMATION_ALLOWED_SESSION_ID configuradas (fail-closed -> 503).
 * - Compara segredo em tempo constante (401 se ausente ou incorreto).
 * - Se X-Automation-Timestamp for enviado, valida janela anti-replay de +-5 minutos.
 */
export function verifyAutomationApiAuth(
  request: Request,
  options?: { env?: EnvMap; nowMs?: number }
): AutomationAuthResult {
  const env = options?.env ?? process.env;
  const expectedSecret = env.AUTOMATION_API_SECRET?.trim();

  if (!expectedSecret) {
    return {
      ok: false,
      status: 503,
      error:
        "Integração de automação indisponível: AUTOMATION_API_SECRET não configurada no servidor.",
    };
  }

  const allowedSessionId = getAllowedAutomationSessionId(env);
  if (!allowedSessionId) {
    return {
      ok: false,
      status: 503,
      error:
        "Integração de automação indisponível: AUTOMATION_ALLOWED_SESSION_ID não configurada ou inválida.",
    };
  }

  const providedSecret = extractProvidedSecret(request);
  if (!providedSecret || !secureCompareSecrets(providedSecret, expectedSecret)) {
    return {
      ok: false,
      status: 401,
      error: "Credencial de automação ausente ou inválida.",
    };
  }

  const rawTimestamp = request.headers.get("x-automation-timestamp")?.trim();
  if (rawTimestamp) {
    const parsedTs = Number(rawTimestamp);
    const nowMs = options?.nowMs ?? Date.now();
    if (!Number.isFinite(parsedTs) || Math.abs(nowMs - parsedTs) > MAX_TIMESTAMP_DRIFT_MS) {
      return {
        ok: false,
        status: 401,
        error: "Timestamp da requisição de automação inválido ou expirado.",
      };
    }
  }

  return {
    ok: true,
    allowedSessionId,
  };
}
