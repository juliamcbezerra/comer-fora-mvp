import { roundCurrency } from "@/lib/utils";

export interface RawFunnelCounts {
  views: number;
  redemptions: number;
  optIns: number;
}

export interface SafeFunnelMetrics {
  views: number;
  redemptions: number;
  optIns: number;
  conversionRatePct: number;
  recurrenceOptInRatePct: number;
  optInPctOfViews: number;
}

/**
 * Garante integridade analítica absoluta no funil:
 * - Visualizações >= Resgates >= Opt-ins >= 0
 * - Taxas sempre travadas no intervalo [0%, 100%]
 */
export function computeSafeFunnelMetrics(
  counts: RawFunnelCounts
): SafeFunnelMetrics {
  const safeRedemptions = Math.max(0, Math.round(counts.redemptions));
  const rawViews = Math.max(0, Math.round(counts.views));
  const effectiveViews = Math.max(rawViews, safeRedemptions);
  const effectiveOptIns = Math.min(
    Math.max(0, Math.round(counts.optIns)),
    safeRedemptions
  );

  const conversionRatePct =
    effectiveViews > 0
      ? Math.min(100, roundCurrency((safeRedemptions / effectiveViews) * 100))
      : 0;

  const recurrenceOptInRatePct =
    safeRedemptions > 0
      ? Math.min(100, roundCurrency((effectiveOptIns / safeRedemptions) * 100))
      : 0;

  const optInPctOfViews =
    effectiveViews > 0
      ? Math.min(100, roundCurrency((effectiveOptIns / effectiveViews) * 100))
      : 0;

  return {
    views: effectiveViews,
    redemptions: safeRedemptions,
    optIns: effectiveOptIns,
    conversionRatePct,
    recurrenceOptInRatePct,
    optInPctOfViews,
  };
}
