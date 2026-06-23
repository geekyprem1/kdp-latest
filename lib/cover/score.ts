/**
 * V2 cover scoring — detailed 5-dimension breakdown.
 * Returns ScoreBreakdown with individual scores and an overall 0–100.
 */

import { PNG } from "pngjs";
import type { ConceptLayout, ScoreBreakdown } from "./types";

interface ScoreOpts {
  titleBand: [number, number];
  hasSubtitle: boolean;
  hasAuthor: boolean;
  titleLen: number;
  layout: ConceptLayout;
}

function sampleBand(
  data: Buffer, width: number, height: number,
  y0frac: number, y1frac: number, step = 3
): { mean: number; contrast: number } {
  const y0 = Math.floor(y0frac * height);
  const y1 = Math.floor(y1frac * height);
  let sum = 0; let sqSum = 0; let n = 0;
  for (let y = Math.max(0, y0); y < Math.min(height, y1); y += step) {
    for (let x = 0; x < width; x += step) {
      const i = (width * y + x) << 2;
      const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      sum += lum; sqSum += lum * lum; n++;
    }
  }
  if (n === 0) return { mean: 128, contrast: 0 };
  const mean = sum / n;
  const contrast = Math.sqrt(Math.max(0, sqSum / n - mean * mean));
  return { mean, contrast };
}

export function scoreCoverDetailed(pngBytes: Uint8Array, opts: ScoreOpts): ScoreBreakdown {
  try {
    const png = PNG.sync.read(Buffer.from(pngBytes));
    const { width, height, data } = png;

    // ── Title readability (0–25) ─────────────────────────────────────────────
    // White text on dark background = high score. Check contrast behind title band.
    const titleBand = sampleBand(data, width, height, opts.titleBand[0], opts.titleBand[1]);
    // darkBand → white title is legible
    const darkness = Math.max(0, (200 - titleBand.mean) / 200); // 0=white,1=black
    const titleSharpness = opts.titleLen <= 20 ? 1 : opts.titleLen <= 32 ? 0.8 : 0.6;
    const titleReadability = Math.round(darkness * 20 * titleSharpness + 5);

    // ── Subtitle readability (0–20) ──────────────────────────────────────────
    let subtitleReadability = 0;
    if (opts.hasSubtitle) {
      // subtitle typically just below title band
      const subBand = sampleBand(data, width, height, opts.titleBand[1], Math.min(1, opts.titleBand[1] + 0.15));
      const subDark = Math.max(0, (210 - subBand.mean) / 210);
      subtitleReadability = Math.round(subDark * 15 + 5);
    } else {
      subtitleReadability = 8; // no subtitle — neutral
    }

    // ── Author visibility (0–15) ─────────────────────────────────────────────
    let authorVisibility = 0;
    if (opts.hasAuthor) {
      const authorBand = sampleBand(data, width, height, 0.82, 1.0);
      const authorDark = Math.max(0, (200 - authorBand.mean) / 200);
      authorVisibility = Math.round(authorDark * 10 + 5);
    } else {
      authorVisibility = 6;
    }

    // ── Visual balance (0–20) ────────────────────────────────────────────────
    // Good cover: visual variety throughout + not too uniform
    const fullImg = sampleBand(data, width, height, 0, 1);
    const topThird = sampleBand(data, width, height, 0, 0.33);
    const midThird = sampleBand(data, width, height, 0.33, 0.66);
    const botThird = sampleBand(data, width, height, 0.66, 1);
    const variance = Math.abs(topThird.mean - midThird.mean) + Math.abs(midThird.mean - botThird.mean);
    const interest = Math.min(1, fullImg.contrast / 55);
    const balance = Math.min(1, variance / 100);
    const visualBalance = Math.round(interest * 12 + balance * 8);

    // ── Genre match + commercial potential (layout-based heuristics) ─────────
    const genreMatch = opts.layout === "typographyFirst" ? 10
      : opts.layout === "modernCommercial" ? 9 : 8;

    const hasContent = opts.hasSubtitle && opts.hasAuthor;
    const commercialPotential = hasContent ? 10 : opts.hasSubtitle || opts.hasAuthor ? 7 : 5;

    const overall = Math.min(100, Math.max(0,
      titleReadability + subtitleReadability + authorVisibility + visualBalance + genreMatch + commercialPotential
    ));

    return {
      titleReadability: Math.min(25, titleReadability),
      subtitleReadability: Math.min(20, subtitleReadability),
      authorVisibility: Math.min(15, authorVisibility),
      visualBalance: Math.min(20, visualBalance),
      genreMatch,
      commercialPotential,
      overall,
    };
  } catch {
    // Can't parse PNG — return conservative defaults
    return {
      titleReadability: 16,
      subtitleReadability: 12,
      authorVisibility: 9,
      visualBalance: 12,
      genreMatch: 8,
      commercialPotential: 7,
      overall: 64,
    };
  }
}

/** Legacy single-number score for backward compat. */
export function scoreCover(
  pngBytes: Uint8Array,
  opts: { titleBand: [number, number]; hasSubtitle: boolean; hasAuthor: boolean; titleLen: number }
): number {
  return scoreCoverDetailed(pngBytes, { ...opts, layout: "fullImage" }).overall;
}
