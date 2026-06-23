/**
 * Premium cover generation: AI brief → 3 distinct layout concepts, each with its
 * own background (FLUX or gradient fallback), composited with crisp text and
 * scored. `buildOneConcept` regenerates a single concept.
 */

import { renderPng } from "../pdf/render";
import { fluxSchnell, isReplicateConfigured } from "../ai/replicate";
import { generateCoverBrief } from "./prompt";
import { coverHtml, titleBandFor, type CoverBg } from "./templates";
import { scoreCover } from "./score";
import {
  CONCEPT_LAYOUTS,
  type BuiltConcept,
  type CoverBrief,
  type CoverInput,
  type CoverResult,
  type ConceptLayout,
} from "./types";

const GRADIENTS: Array<[string, string]> = [
  ["#1e3a8a", "#3b82f6"],
  ["#7c2d12", "#ea580c"],
  ["#065f46", "#10b981"],
];

const dataUri = (b: Uint8Array) => `data:image/png;base64,${Buffer.from(b).toString("base64")}`;

function fullPrompt(brief: CoverBrief, input: CoverInput): string {
  return [brief.imagePrompt, input.artStyle, input.mood ? `${input.mood} mood` : ""].filter(Boolean).join(", ");
}

/** Build one concept (a layout + its own background) and score it. */
export async function buildOneConcept(
  input: CoverInput,
  brief: CoverBrief,
  layout: ConceptLayout,
  seed: number,
  gradientIdx = 0
): Promise<BuiltConcept> {
  let bg: CoverBg;
  if (isReplicateConfigured()) {
    try {
      const art = await fluxSchnell({ prompt: fullPrompt(brief, input), seed, aspectRatio: "2:3" });
      bg = { kind: "image", dataUri: dataUri(art) };
    } catch {
      const [c1, c2] = GRADIENTS[gradientIdx % GRADIENTS.length];
      bg = { kind: "gradient", c1, c2 };
    }
  } else {
    const [c1, c2] = GRADIENTS[gradientIdx % GRADIENTS.length];
    bg = { kind: "gradient", c1, c2 };
  }

  const html = coverHtml({ genre: input.genre, layout, title: input.title, subtitle: input.subtitle, author: input.author, bg });
  const bytes = await renderPng(html, { widthIn: 6, heightIn: 9, dpi: 200 });
  const score = scoreCover(bytes, {
    titleBand: titleBandFor(layout),
    hasSubtitle: Boolean(input.subtitle?.trim()),
    hasAuthor: Boolean(input.author?.trim()),
    titleLen: input.title.length,
  });
  return { concept: { layout, seed, score }, bytes };
}

export async function buildCovers(input: CoverInput): Promise<CoverResult> {
  const brief = await generateCoverBrief(input);
  const concepts = await Promise.all(
    CONCEPT_LAYOUTS.map((layout, i) => buildOneConcept(input, brief, layout, 100 * (i + 1) + 7, i))
  );
  return { brief, concepts };
}
