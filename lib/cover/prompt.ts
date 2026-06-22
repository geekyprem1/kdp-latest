/**
 * AI cover brief builder (OpenRouter: Gemini 2.5 Flash → DeepSeek). Produces a
 * FLUX background-art prompt plus human-readable layout & typography suggestions.
 * Smart per-book-type guidance is baked in. Falls back to a template brief.
 */

import { generateJson } from "../ai/provider";
import { isAiConfigured } from "../ai/models";
import { COVER_BOOK_TYPE_LABELS, type CoverBrief, type CoverInput } from "./types";

const TYPE_GUIDANCE: Record<string, string> = {
  ebook: "clean, professional business/non-fiction aesthetic; confident and trustworthy",
  word_search: "bold, bright, playful activity-book aesthetic with strong shapes",
  sudoku: "bold, clean puzzle-book aesthetic with a smart, orderly feel",
  maze: "bold, adventurous activity-book aesthetic with a sense of path/journey",
  coloring: "light, friendly line-art aesthetic with lots of white space, gentle outlines",
};

function fallbackBrief(input: CoverInput): CoverBrief {
  const g = TYPE_GUIDANCE[input.bookType];
  return {
    imagePrompt: `${input.artStyle || "modern"} book cover background artwork for a ${COVER_BOOK_TYPE_LABELS[input.bookType]} about ${input.genre || input.title}, ${input.mood || "inviting"} mood, ${g}, vertical composition, no text`,
    layout: "Title in the upper third, subtitle below it, author name at the bottom.",
    typography: "Large bold display title; smaller clean subtitle; understated author line.",
    model: "template",
  };
}

export async function generateCoverBrief(input: CoverInput): Promise<CoverBrief> {
  if (!isAiConfigured()) return fallbackBrief(input);
  const g = TYPE_GUIDANCE[input.bookType];

  try {
    const { data, model } = await generateJson<{ imagePrompt: unknown; layout: unknown; typography: unknown }>({
      system: "You are an art director for Amazon KDP book covers. Reply with JSON only.",
      prompt: `Design direction for a ${COVER_BOOK_TYPE_LABELS[input.bookType]} cover.
Title: "${input.title}". Subtitle: "${input.subtitle ?? ""}". Genre: ${input.genre ?? "n/a"}.
Mood: ${input.mood ?? "n/a"}. Art style: ${input.artStyle ?? "n/a"}. Audience: ${input.audience ?? "general"}.
Style guidance: ${g}.

Return JSON:
{
  "imagePrompt": string,   // a vivid prompt for the BACKGROUND ARTWORK only — NO text, letters, titles, or words in the image; vertical book-cover composition
  "layout": string,        // 1 sentence: where title/subtitle/author should sit
  "typography": string     // 1 sentence: font feel for title/subtitle/author
}`,
      temperature: 0.7,
      maxTokens: 500,
      validate: (raw) => {
        const o = raw as Record<string, unknown>;
        if (typeof o.imagePrompt !== "string" || !o.imagePrompt.trim()) throw new Error("imagePrompt");
        return o as { imagePrompt: unknown; layout: unknown; typography: unknown };
      },
    });
    return {
      imagePrompt: `${(data.imagePrompt as string).trim()}, no text, no letters, no title`,
      layout: typeof data.layout === "string" ? data.layout.trim() : fallbackBrief(input).layout,
      typography: typeof data.typography === "string" ? data.typography.trim() : fallbackBrief(input).typography,
      model,
    };
  } catch {
    return fallbackBrief(input);
  }
}
