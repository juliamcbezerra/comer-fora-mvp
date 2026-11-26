import { beforeEach, describe, expect, it } from "vitest";
import { checkRateLimit, resetRateLimitStore } from "./rate-limit";

describe("checkRateLimit", () => {
  beforeEach(() => {
    resetRateLimitStore();
  });

  it("permite requisições até o limite e bloqueia a próxima com retryAfterSeconds", () => {
    const config = { limit: 3, windowMs: 60_000 };
    const t0 = 1_000_000;

    expect(checkRateLimit("diagnose:sess-1", config, t0).allowed).toBe(true);
    expect(checkRateLimit("diagnose:sess-1", config, t0 + 1_000).allowed).toBe(true);
    const third = checkRateLimit("diagnose:sess-1", config, t0 + 2_000);
    expect(third.allowed).toBe(true);
    expect(third.remaining).toBe(0);

    const fourth = checkRateLimit("diagnose:sess-1", config, t0 + 3_000);
    expect(fourth.allowed).toBe(false);
    expect(fourth.remaining).toBe(0);
    expect(fourth.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("libera novamente após a janela deslizante expirar e isola chaves diferentes", () => {
    const config = { limit: 2, windowMs: 10_000 };
    const t0 = 2_000_000;

    expect(checkRateLimit("redeem:ip-1", config, t0).allowed).toBe(true);
    expect(checkRateLimit("redeem:ip-1", config, t0 + 1_000).allowed).toBe(true);
    expect(checkRateLimit("redeem:ip-1", config, t0 + 2_000).allowed).toBe(false);

    // Chave distinta não é afetada
    expect(checkRateLimit("redeem:ip-2", config, t0 + 2_000).allowed).toBe(true);

    // Após janela expirar para o primeiro timestamp (t0 + 10_001)
    expect(checkRateLimit("redeem:ip-1", config, t0 + 10_001).allowed).toBe(true);
  });
});
