/**
 * Book Opportunity scoring engine.
 *
 * AI supplies raw 0–100 factors; the composite Opportunity score is computed
 * here so it's deterministic, explainable, and tunable in one place.
 *
 *   Opportunity = 30% Demand + 25% (100 − Competition)
 *               + 15% Evergreen + 30% Monetization
 */

import type { OpportunityFactors, OpportunityBand } from "./types";

const WEIGHTS = {
  demand: 0.3,
  competition: 0.25, // applied to (100 − competition)
  evergreen: 0.15,
  monetization: 0.3,
} as const;

const clamp = (n: number): number => Math.max(0, Math.min(100, Math.round(n)));

export function computeOpportunity(f: OpportunityFactors): number {
  const raw =
    WEIGHTS.demand * f.demand +
    WEIGHTS.competition * (100 - f.competition) +
    WEIGHTS.evergreen * f.evergreen +
    WEIGHTS.monetization * f.monetization;
  return clamp(raw);
}

export function opportunityBand(score: number): OpportunityBand {
  if (score >= 80) return "Excellent";
  if (score >= 60) return "High";
  if (score >= 40) return "Medium";
  return "Low";
}

/** Low / Medium / High label for an individual 0–100 factor. */
export function factorLabel(value: number): "Low" | "Medium" | "High" {
  if (value >= 67) return "High";
  if (value >= 34) return "Medium";
  return "Low";
}

/** Band colors reused by UI + PDF. */
export const BAND_COLORS: Record<OpportunityBand, { bg: string; fg: string }> = {
  Excellent: { bg: "#dcfce7", fg: "#166534" },
  High: { bg: "#dbeafe", fg: "#1e40af" },
  Medium: { bg: "#fef9c3", fg: "#854d0e" },
  Low: { bg: "#fee2e2", fg: "#991b1b" },
};
