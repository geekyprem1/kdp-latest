/**
 * AI KDP metadata generation (title, subtitle, description, keywords).
 * Falls back to a deterministic template when AI is unavailable or fails.
 */

import { generateJson } from "./provider";
import { isAiConfigured } from "./models";

export interface BookMetadata {
  title: string;
  subtitle: string;
  description: string;
  keywords: string[];
  generatedBy: string; // model id or 'template'
}

function templateMetadata(opts: {
  theme: string;
  puzzleCount: number;
  difficulty: string;
}): BookMetadata {
  const t = opts.theme;
  return {
    title: `${t} Word Search`,
    subtitle: `${opts.puzzleCount} ${opts.difficulty} Puzzles with Complete Answer Key`,
    description: `Enjoy ${opts.puzzleCount} ${t.toLowerCase()}-themed word search puzzles, each with a full answer key at the back. A relaxing, screen-free activity book for adults and kids who love word puzzles. Large print, ${opts.difficulty} difficulty, and hours of fun on every page.`,
    keywords: [
      `${t.toLowerCase()} word search`,
      "word search puzzle book",
      "word search for adults",
      "word search for kids",
      "large print word search",
      "activity book",
      "puzzle book gift",
    ],
    generatedBy: "template",
  };
}

export async function generateMetadata(opts: {
  theme: string;
  puzzleCount: number;
  difficulty: string;
}): Promise<BookMetadata> {
  if (!isAiConfigured()) return templateMetadata(opts);

  try {
    const { data, model } = await generateJson<Omit<BookMetadata, "generatedBy">>({
      system:
        "You are an Amazon KDP metadata expert for low-content puzzle books. Reply with JSON only.",
      prompt: `Write Amazon KDP metadata for a word search puzzle book.
Theme: "${opts.theme}". Puzzle count: ${opts.puzzleCount}. Difficulty: ${opts.difficulty}.
Return JSON of the exact shape:
{
  "title": string,           // catchy, includes the theme
  "subtitle": string,        // mentions puzzle count and answer key
  "description": string,     // 2 short paragraphs, benefit-driven, no markdown
  "keywords": string[]       // exactly 7 KDP search keyword phrases
}`,
      temperature: 0.7,
      maxTokens: 700,
      validate: (raw) => {
        const o = raw as Record<string, unknown>;
        if (typeof o.title !== "string" || !o.title.trim()) throw new Error("title");
        if (typeof o.subtitle !== "string") throw new Error("subtitle");
        if (typeof o.description !== "string" || !o.description.trim())
          throw new Error("description");
        const keywords = Array.isArray(o.keywords)
          ? (o.keywords.filter((k) => typeof k === "string") as string[])
          : [];
        return {
          title: o.title.trim(),
          subtitle: String(o.subtitle).trim(),
          description: o.description.trim(),
          keywords: keywords.slice(0, 7),
        };
      },
    });

    return {
      ...data,
      keywords: data.keywords.length ? data.keywords : templateMetadata(opts).keywords,
      generatedBy: model,
    };
  } catch (err) {
    console.warn("[ai] metadata generation failed, using template:", (err as Error).message);
    return templateMetadata(opts);
  }
}
