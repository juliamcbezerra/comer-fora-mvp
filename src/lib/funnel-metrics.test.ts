import { describe, expect, it } from "vitest";
import { computeSafeFunnelMetrics } from "./funnel-metrics";

describe("computeSafeFunnelMetrics", () => {
  it("impede redemptions > views e trava conversão em no máximo 100%", () => {
    const result = computeSafeFunnelMetrics({
      views: 1,
      redemptions: 2,
      optIns: 1,
    });

    expect(result.views).toBe(2);
    expect(result.redemptions).toBe(2);
    expect(result.optIns).toBe(1);
    expect(result.conversionRatePct).toBe(100);
    expect(result.recurrenceOptInRatePct).toBe(50);
    expect(result.views).toBeGreaterThanOrEqual(result.redemptions);
    expect(result.redemptions).toBeGreaterThanOrEqual(result.optIns);
  });

  it("impede optIns > redemptions e trava taxa de opt-in em 100%", () => {
    const result = computeSafeFunnelMetrics({
      views: 5,
      redemptions: 2,
      optIns: 4,
    });

    expect(result.views).toBe(5);
    expect(result.redemptions).toBe(2);
    expect(result.optIns).toBe(2);
    expect(result.conversionRatePct).toBe(40);
    expect(result.recurrenceOptInRatePct).toBe(100);
  });

  it("retorna 0% sem NaN no estado vazio (0 visualizações e 0 resgates)", () => {
    const result = computeSafeFunnelMetrics({
      views: 0,
      redemptions: 0,
      optIns: 0,
    });

    expect(result.views).toBe(0);
    expect(result.redemptions).toBe(0);
    expect(result.optIns).toBe(0);
    expect(result.conversionRatePct).toBe(0);
    expect(result.recurrenceOptInRatePct).toBe(0);
    expect(result.optInPctOfViews).toBe(0);
  });

  it("calcula corretamente funil saudável (18 views, 9 resgates, 5 opt-ins)", () => {
    const result = computeSafeFunnelMetrics({
      views: 18,
      redemptions: 9,
      optIns: 5,
    });

    expect(result.views).toBe(18);
    expect(result.redemptions).toBe(9);
    expect(result.optIns).toBe(5);
    expect(result.conversionRatePct).toBe(50);
    expect(result.recurrenceOptInRatePct).toBe(55.56);
    expect(result.optInPctOfViews).toBe(27.78);
  });
});
