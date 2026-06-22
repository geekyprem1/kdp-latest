/**
 * Opportunity scoring engine.
 *
 * The AI supplies raw 0–100 factor estimates; the SCORE is computed here so it's
 * deterministic and tunable in one place. Competition is inverted (more
 * competition lowers the opportunity).
 *
 *   score = 30% demand + 25% (100 − competition)
 *         + 15% evergreen + 15% expansion + 15% KDP suitability
 */

import type { NicheFactors, OpportunityBand } from "./types";

const WEIGHTS = {
  searchDemand: 0.3,
  competition: 0.25, // applied to (100 - competition)
  evergreen: 0.15,
  expansion: 0.15,
  kdpSuitability: 0.15,
} as const;

const clamp = (n: number): number => Math.max(0, Math.min(100, Math.round(n)));

export function computeOpportunity(f: NicheFactors): number {
  const raw =
    WEIGHTS.searchDemand * f.searchDemand +
    WEIGHTS.competition * (100 - f.competition) +
    WEIGHTS.evergreen * f.evergreen +
    WEIGHTS.expansion * f.expansion +
    WEIGHTS.kdpSuitability * f.kdpSuitability;
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

/** Tailwind-ish color per band, reused by UI + PDF. */
export const BAND_COLORS: Record<OpportunityBand, { bg: string; fg: string }> = {
  Excellent: { bg: "#dcfce7", fg: "#166534" },
  High: { bg: "#dbeafe", fg: "#1e40af" },
  Medium: { bg: "#fef9c3", fg: "#854d0e" },
  Low: { bg: "#fee2e2", fg: "#991b1b" },
};
