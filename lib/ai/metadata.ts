/**
 * AI KDP metadata generation (title, subtitle, description, keywords).
 * Falls back to a deterministic template when AI is unavailable or fails.
 * Supports multiple book types (word search, sudoku).
 */

import { generateJson } from "./provider";
import { isAiConfigured } from "./models";

export type MetadataBookType = "word_search" | "sudoku";

export interface BookMetadata {
  title: string;
  subtitle: string;
  description: string;
  keywords: string[];
  generatedBy: string; // model id or 'template'
}

export interface MetadataInput {
  bookType?: MetadataBookType;
  /** Required for word_search; ignored for sudoku. */
  theme?: string;
  puzzleCount: number;
  difficulty: string;
}

const cap = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);

function templateMetadata(opts: MetadataInput): BookMetadata {
  if (opts.bookType === "sudoku") {
    return {
      title: "Sudoku Puzzle Book",
      subtitle: `${opts.puzzleCount} ${cap(opts.difficulty)} Puzzles with Complete Solutions`,
      description: `Sharpen your mind with ${opts.puzzleCount} ${opts.difficulty} sudoku puzzles, each with one unique solution and a full answer key at the back. A relaxing, screen-free activity book for adults — solvable by logic alone, with large, easy-to-read grids.`,
      keywords: [
        "sudoku puzzle book",
        `${opts.difficulty} sudoku`,
        "sudoku for adults",
        "large print sudoku",
        "sudoku puzzles with answers",
        "brain games",
        "puzzle book gift",
      ],
      generatedBy: "template",
    };
  }

  const t = opts.theme ?? "Themed";
  return {
    title: `${t} Word Search`,
    subtitle: `${opts.puzzleCount} ${cap(opts.difficulty)} Puzzles with Complete Answer Key`,
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

function promptFor(opts: MetadataInput): string {
  if (opts.bookType === "sudoku") {
    return `Write Amazon KDP metadata for a sudoku puzzle book.
Difficulty: ${opts.difficulty}. Puzzle count: ${opts.puzzleCount}. Every puzzle has one unique solution and a full answer key.
Return JSON of the exact shape:
{
  "title": string,           // catchy sudoku book title
  "subtitle": string,        // mentions puzzle count, difficulty, and solutions
  "description": string,     // 2 short paragraphs, benefit-driven, no markdown
  "keywords": string[]       // exactly 7 KDP search keyword phrases
}`;
  }
  return `Write Amazon KDP metadata for a word search puzzle book.
Theme: "${opts.theme}". Puzzle count: ${opts.puzzleCount}. Difficulty: ${opts.difficulty}.
Return JSON of the exact shape:
{
  "title": string,           // catchy, includes the theme
  "subtitle": string,        // mentions puzzle count and answer key
  "description": string,     // 2 short paragraphs, benefit-driven, no markdown
  "keywords": string[]       // exactly 7 KDP search keyword phrases
}`;
}

export async function generateMetadata(opts: MetadataInput): Promise<BookMetadata> {
  if (!isAiConfigured()) return templateMetadata(opts);

  try {
    const { data, model } = await generateJson<Omit<BookMetadata, "generatedBy">>({
      system:
        "You are an Amazon KDP metadata expert for low-content puzzle books. Reply with JSON only.",
      prompt: promptFor(opts),
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
