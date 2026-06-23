/**
 * Cover Generator V2 — each concept gets its own distinct AI brief + image prompt.
 * Safe-zone layouts, genre-aware typography, detailed scoring.
 *
 * Observability: gradient fallback is always logged via console.error.
 * Retry: character-required genres (kids, puzzle) get one automatic retry before
 * accepting a gradient fallback, to avoid silent compliance failures.
 */

import { renderPng } from "../pdf/render";
import { fluxSchnell, isReplicateConfigured } from "../ai/replicate";
import { generateConceptBrief, generateCoverBrief } from "./prompt";
import { coverHtml, titleBandFor, type CoverBg } from "./templates";
import { scoreCoverDetailed } from "./score";
import {
  CONCEPT_LAYOUTS,
  type BuiltConcept,
  type CoverBrief,
  type CoverInput,
  type CoverResult,
  type ConceptLayout,
} from "./types";

// Per-concept fallback gradients (richer than before)
const CONCEPT_GRADIENTS: Record<ConceptLayout, [[string, string], [string, string], [string, string]]> = {
  fullImage:         [["#0f172a","#1e3a5f"],["#7c2d12","#9a3412"],["#064e3b","#065f46"]],
  typographyFirst:   [["#1e1b4b","#312e81"],["#450a0a","#7f1d1d"],["#042f2e","#134e4a"]],
  modernCommercial:  [["#0c1445","#1a237e"],["#4a044e","#701a75"],["#052e16","#14532d"]],
};

/** Genres that require at least one character and get a retry on FLUX failure. */
const CHARACTER_GENRES = new Set(["kids", "puzzle"]);

const dataUri = (b: Uint8Array) => `data:image/png;base64,${Buffer.from(b).toString("base64")}`;

async function tryFluxWithRetry(
  brief: CoverBrief,
  seed: number,
  genre: string,
  layout: ConceptLayout,
  gradientIdx: number
): Promise<CoverBg> {
  if (!isReplicateConfigured()) {
    return { kind: "gradient", c1: CONCEPT_GRADIENTS[layout][gradientIdx % 3][0], c2: CONCEPT_GRADIENTS[layout][gradientIdx % 3][1] };
  }

  // First attempt
  try {
    const art = await fluxSchnell({ prompt: brief.imagePrompt, seed, aspectRatio: "2:3" });
    return { kind: "image", dataUri: dataUri(art) };
  } catch (err) {
    // Character-required genres get one retry with a shifted seed before accepting gradient
    if (CHARACTER_GENRES.has(genre)) {
      try {
        const art = await fluxSchnell({ prompt: brief.imagePrompt, seed: seed + 777, aspectRatio: "2:3" });
        console.error(`[cover] Replicate first attempt failed (genre=${genre} layout=${layout}), retry succeeded.`);
        return { kind: "image", dataUri: dataUri(art) };
      } catch (retryErr) {
        console.error(`[cover] Replicate retry also failed (genre=${genre} layout=${layout} seed=${seed}):`, retryErr);
      }
    } else {
      console.error(`[cover] Replicate fallback (genre=${genre} layout=${layout} seed=${seed}):`, err);
    }
  }

  const [c1, c2] = CONCEPT_GRADIENTS[layout][gradientIdx % 3];
  return { kind: "gradient", c1, c2 };
}

export async function buildOneConcept(
  input: CoverInput,
  brief: CoverBrief,
  layout: ConceptLayout,
  seed: number,
  gradientIdx = 0
): Promise<BuiltConcept> {
  const bg = await tryFluxWithRetry(brief, seed, input.genre, layout, gradientIdx);

  const html = coverHtml({
    genre: input.genre,
    layout,
    title: input.title,
    subtitle: input.subtitle,
    author: input.author,
    bg,
    accentColor: brief.accentColor,
  });
  const bytes = await renderPng(html, { widthIn: 6, heightIn: 9, dpi: 200 });

  const breakdown = scoreCoverDetailed(bytes, {
    titleBand: titleBandFor(layout),
    hasSubtitle: Boolean(input.subtitle?.trim()),
    hasAuthor: Boolean(input.author?.trim()),
    titleLen: input.title.length,
    layout,
    genre: input.genre,
  });

  return {
    concept: { layout, seed, score: breakdown.overall, breakdown },
    bytes,
  };
}

export async function buildCovers(input: CoverInput): Promise<CoverResult> {
  // Generate a DISTINCT AI brief for each concept in parallel
  const briefs = await Promise.all(
    CONCEPT_LAYOUTS.map((layout) => generateConceptBrief(input, layout))
  );

  const concepts = await Promise.all(
    CONCEPT_LAYOUTS.map((layout, i) =>
      buildOneConcept(input, briefs[i], layout, 100 * (i + 1) + 42, i)
    )
  );

  // Return the fullImage brief as the "cover brief" for the DB record
  const primaryBrief = await generateCoverBrief(input);
  return { brief: { ...primaryBrief, imagePrompt: briefs[0].imagePrompt }, concepts };
}
