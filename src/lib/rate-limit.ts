export interface RateLimitConfig {
  limit: number;
  windowMs: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

const MAX_STORE_ENTRIES = 2_000;
const timestampsByKey = new Map<string, number[]>();

function pruneStaleKeys(now: number, maxWindowMs: number) {
  if (timestampsByKey.size < MAX_STORE_ENTRIES) return;
  for (const [key, list] of timestampsByKey.entries()) {
    const valid = list.filter((ts) => now - ts < maxWindowMs);
    if (valid.length === 0) {
      timestampsByKey.delete(key);
    } else {
      timestampsByKey.set(key, valid);
    }
  }
}

/**
 * Rate limiter leve em memória (sliding window) para proteção de rotas públicas.
 */
export function checkRateLimit(
  key: string,
  config: RateLimitConfig,
  now: number = Date.now()
): RateLimitResult {
  const { limit, windowMs } = config;
  pruneStaleKeys(now, windowMs);

  const cutoff = now - windowMs;
  const existing = (timestampsByKey.get(key) ?? []).filter((ts) => ts > cutoff);

  if (existing.length >= limit) {
    const oldest = existing[0] ?? now;
    const retryAfterMs = Math.max(1_000, oldest + windowMs - now);
    timestampsByKey.set(key, existing);
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.ceil(retryAfterMs / 1_000),
    };
  }

  existing.push(now);
  timestampsByKey.set(key, existing);

  return {
    allowed: true,
    remaining: Math.max(0, limit - existing.length),
    retryAfterSeconds: 0,
  };
}

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  const realIp = request.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;
  return "unknown";
}

export function formatRetryAfterPtBr(seconds: number): string {
  if (seconds < 60) {
    return `${seconds} segundo${seconds === 1 ? "" : "s"}`;
  }
  const minutes = Math.ceil(seconds / 60);
  return `${minutes} minuto${minutes === 1 ? "" : "s"}`;
}

export function resetRateLimitStore(): void {
  timestampsByKey.clear();
}
