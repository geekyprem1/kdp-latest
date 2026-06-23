/**
 * V2 cover brief builder. Uses title, subtitle, audience, niche, genre, and
 * opportunity score to produce richer, concept-specific AI image prompts.
 * Each concept gets a DIFFERENT prompt so the three concepts feel genuinely distinct.
 */

import { generateJson } from "../ai/provider";
import { isAiConfigured } from "../ai/models";
import { COVER_GENRE_LABELS, type CoverBrief, type CoverInput, type ConceptLayout } from "./types";

// Per-genre: mood, color palette cue, visual motif, and design language
const GENRE_PROFILE: Record<string, {
  mood: string;
  palette: string;
  motif: string;
  designLanguage: string;
  accentColor: string;
}> = {
  business: {
    mood: "confident, authoritative, premium",
    palette: "deep navy, charcoal, gold accents",
    motif: "geometric abstraction, city skylines, upward trajectories, clean corporate shapes",
    designLanguage: "clean bold sans-serif, strong title dominance, restrained white space",
    accentColor: "#c9a84c",
  },
  self_help: {
    mood: "hopeful, uplifting, warm, transformational",
    palette: "warm amber, sunrise gold, soft teal",
    motif: "open roads, sunrise over mountains, blooming nature, person breaking free",
    designLanguage: "professional typography, high contrast, motivational energy",
    accentColor: "#e67e22",
  },
  puzzle: {
    mood: "energetic, playful, bright, fun",
    palette: "electric blue, bright yellow, vivid contrast",
    motif: "bold geometric puzzle pieces, brain icons, activity-book energy, pop art patterns",
    designLanguage: "large playful titles, uppercase, bright saturated colors, strong border elements",
    accentColor: "#f39c12",
  },
  kids: {
    mood: "cheerful, friendly, magical, safe",
    palette: "rainbow bright, soft pastels, high contrast",
    motif: "cute animal characters, cartoon landscapes, playful adventure scenes, friendly creatures",
    designLanguage: "rounded friendly typography, strong visual hierarchy, bold color blocking",
    accentColor: "#9b59b6",
  },
  coloring: {
    mood: "calm, creative, inviting, gentle",
    palette: "soft pastels, white space, gentle hues",
    motif: "intricate floral patterns, mandala-inspired art, nature scenes with detailed outlines",
    designLanguage: "bold outlined typography, light airy feel, lots of breathing room",
    accentColor: "#1abc9c",
  },
  fiction: {
    mood: "atmospheric, cinematic, mysterious, evocative",
    palette: "deep shadows, dramatic contrasts, moody tones",
    motif: "cinematic dramatic landscapes, silhouettes against dramatic skies, atmospheric fog and light",
    designLanguage: "cinematic typography, large impact title, dramatic atmosphere",
    accentColor: "#c0392b",
  },
};

// Per-concept: what makes THIS layout's image distinct
const CONCEPT_IMAGE_DIRECTION: Record<ConceptLayout, string> = {
  fullImage: "Full cinematic composition filling the entire frame. Subject centered or rule-of-thirds. Deep atmospheric background. The image should carry the full emotional weight of the cover.",
  typographyFirst: "Bold graphic background — strong color field, abstract texture, or atmospheric gradient. The top third and bottom third must have high contrast for text overlay. Subject if any is subtle, pushed to edges or abstract.",
  modernCommercial: "Clean commercial illustration style. Subject clearly visible in lower 60% of frame. Upper portion has a clean solid-color or gradient band for title placement. Modern, polished, Amazon bestseller aesthetic.",
};

function fallbackBrief(input: CoverInput, layout: ConceptLayout): CoverBrief {
  const gp = GENRE_PROFILE[input.genre] ?? GENRE_PROFILE.business;
  const audienceStr = input.audience ? `audience: ${input.audience}` : "";
  const nicheStr = input.niche ? `niche: ${input.niche}` : "";
  const context = [audienceStr, nicheStr].filter(Boolean).join(", ");
  return {
    imagePrompt: `${gp.motif}, ${gp.mood} mood, ${gp.palette}, ${CONCEPT_IMAGE_DIRECTION[layout]}, vertical book cover composition, professional publishing quality, no text, no letters, no words. ${context}`,
    accentColor: gp.accentColor,
    layout: "Title prominent, subtitle below, author at the bottom.",
    typography: `${gp.designLanguage}. Strong display title, clean subtitle, understated author line.`,
    model: "template",
  };
}

/**
 * Generate a SINGLE concept's image prompt — each concept gets a distinct AI call
 * so the three outputs are genuinely different compositions.
 */
export async function generateConceptBrief(
  input: CoverInput,
  layout: ConceptLayout
): Promise<CoverBrief> {
  const gp = GENRE_PROFILE[input.genre] ?? GENRE_PROFILE.business;
  if (!isAiConfigured()) return fallbackBrief(input, layout);

  const opportunityCtx = input.opportunityScore
    ? `Opportunity score: ${input.opportunityScore}/100 — this book has strong market demand.`
    : "";

  try {
    const { data, model } = await generateJson<{
      imagePrompt: unknown;
      accentColor: unknown;
      typography: unknown;
    }>({
      system: `You are an expert Amazon KDP book cover art director. You create image prompts that result in covers competitive with top-selling books. Reply with JSON only. Never include text, letters, or words in image prompts.`,
      prompt: `Create a cover image brief for this specific layout concept: "${layout}".

Book details:
- Title: "${input.title}"
- Subtitle: "${input.subtitle ?? "none"}"
- Genre: ${COVER_GENRE_LABELS[input.genre]}
- Audience: ${input.audience ?? "general"}
- Niche/topic: ${input.niche ?? input.title}
- Mood: ${input.mood ?? gp.mood}
${opportunityCtx}

Genre design language: ${gp.designLanguage}
Genre palette: ${gp.palette}
Genre motif: ${gp.motif}

Layout concept direction: ${CONCEPT_IMAGE_DIRECTION[layout]}

Return JSON:
{
  "imagePrompt": string,  // Vivid, specific 2-3 sentence prompt for BACKGROUND ARTWORK ONLY. No text. No letters. Vertical book cover. Professional publishing quality. Reference the specific mood, visual motif and palette for this genre. Make it unique to THIS layout concept.
  "accentColor": string,  // Best hex color for text/design accents on this cover (e.g. "#c9a84c")
  "typography": string    // 1 sentence on font and text treatment for this specific concept
}`,
      temperature: 0.8,
      maxTokens: 600,
      validate: (raw) => {
        const o = raw as Record<string, unknown>;
        if (typeof o.imagePrompt !== "string" || !o.imagePrompt.trim()) throw new Error("imagePrompt missing");
        return o as { imagePrompt: unknown; accentColor: unknown; typography: unknown };
      },
    });

    return {
      imagePrompt: `${(data.imagePrompt as string).trim()}, no text, no letters, no words, no title, professional book cover photography quality`,
      accentColor: typeof data.accentColor === "string" && /^#[0-9a-f]{6}$/i.test(data.accentColor)
        ? data.accentColor
        : gp.accentColor,
      layout: CONCEPT_IMAGE_DIRECTION[layout],
      typography: typeof data.typography === "string" ? data.typography.trim() : gp.designLanguage,
      model,
    };
  } catch {
    return fallbackBrief(input, layout);
  }
}

/** Shared brief for the cover record (uses the first concept's brief). */
export async function generateCoverBrief(input: CoverInput): Promise<CoverBrief> {
  return generateConceptBrief(input, "fullImage");
}
