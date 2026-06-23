/**
 * AI cover brief builder (OpenRouter: Gemini → DeepSeek). Genre-aware background
 * art prompt + layout/typography suggestions. Falls back to a template brief.
 */

import { generateJson } from "../ai/provider";
import { isAiConfigured } from "../ai/models";
import { COVER_GENRE_LABELS, type CoverBrief, type CoverInput } from "./types";

const GENRE_GUIDANCE: Record<string, string> = {
  business: "clean, confident, professional; abstract shapes, restrained palette, trustworthy",
  self_help: "warm, uplifting, calm; soft gradients or nature, hopeful and approachable",
  puzzle: "bold, bright, playful activity-book energy; strong geometric shapes",
  kids: "cheerful, colorful, cute and friendly; simple bold illustration",
  coloring: "light, airy, gentle line-art feel with lots of white space",
  fiction: "evocative, atmospheric, cinematic; mood and intrigue",
};

function fallbackBrief(input: CoverInput): CoverBrief {
  return {
    imagePrompt: `${input.artStyle || "modern"} book cover background artwork for a ${COVER_GENRE_LABELS[input.genre]} book about ${input.title}, ${input.mood || "inviting"} mood, ${GENRE_GUIDANCE[input.genre]}, vertical composition, no text`,
    layout: "Title prominent, subtitle below, author at the bottom.",
    typography: "Strong display title, clean subtitle, understated author line.",
    model: "template",
  };
}

export async function generateCoverBrief(input: CoverInput): Promise<CoverBrief> {
  if (!isAiConfigured()) return fallbackBrief(input);
  try {
    const { data, model } = await generateJson<{ imagePrompt: unknown; layout: unknown; typography: unknown }>({
      system: "You are an art director for Amazon KDP book covers. Reply with JSON only.",
      prompt: `Design direction for a ${COVER_GENRE_LABELS[input.genre]} cover.
Title: "${input.title}". Subtitle: "${input.subtitle ?? ""}". Mood: ${input.mood ?? "n/a"}.
Art style: ${input.artStyle ?? "n/a"}. Audience: ${input.audience ?? "general"}.
Genre feel: ${GENRE_GUIDANCE[input.genre]}.

Return JSON:
{
  "imagePrompt": string,   // vivid prompt for the BACKGROUND ARTWORK only — NO text/letters/words; vertical book-cover composition
  "layout": string,        // 1 sentence on title/subtitle/author placement
  "typography": string     // 1 sentence on font feel
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
