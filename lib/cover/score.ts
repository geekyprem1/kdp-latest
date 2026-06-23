/**
 * Cover scoring — a heuristic 0–100 estimate of legibility & visual quality from
 * the composited PNG. Not a taste judgement; it rewards readable titles (high
 * contrast behind the title), some visual interest, and completeness.
 */

import { PNG } from "pngjs";

export function scoreCover(
  pngBytes: Uint8Array,
  opts: { titleBand: [number, number]; hasSubtitle: boolean; hasAuthor: boolean; titleLen: number }
): number {
  let lumSum = 0;
  let lumSqSum = 0;
  let count = 0;
  let bandSum = 0;
  let bandCount = 0;

  try {
    const png = PNG.sync.read(Buffer.from(pngBytes));
    const { width, height, data } = png;
    const y0 = Math.floor(opts.titleBand[0] * height);
    const y1 = Math.floor(opts.titleBand[1] * height);
    const step = 2; // sample every 2px each axis
    for (let y = 0; y < height; y += step) {
      for (let x = 0; x < width; x += step) {
        const i = (width * y + x) << 2;
        const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        lumSum += lum;
        lumSqSum += lum * lum;
        count++;
        if (y >= y0 && y <= y1) {
          bandSum += lum;
          bandCount++;
        }
      }
    }
  } catch {
    return 70; // unreadable image → neutral
  }

  if (count === 0) return 70;
  const mean = lumSum / count;
  const std = Math.sqrt(Math.max(0, lumSqSum / count - mean * mean));
  const bandLum = bandCount ? bandSum / bandCount : mean;

  // White title → darker band = more contrast = better legibility.
  const legibility = Math.min(1, (255 - bandLum) / 200) * 28; // 0–28
  const interest = Math.min(1, std / 60) * 16; // 0–16
  const completeness = (opts.hasSubtitle ? 5 : 0) + (opts.hasAuthor ? 5 : 0); // 0–10
  const titlePenalty = opts.titleLen > 42 ? -8 : opts.titleLen > 28 ? -3 : 0;

  const score = 55 + legibility + interest + completeness + titlePenalty;
  return Math.max(0, Math.min(100, Math.round(score)));
}
