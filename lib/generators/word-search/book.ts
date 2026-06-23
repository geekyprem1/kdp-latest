/**
 * Word Search book assembly.
 *
 * Turns an input config into a deterministic set of puzzles, lays them out as
 * interior pages (title → instructions → puzzles → solutions), and renders both
 * the interior and cover PDFs through the existing KDP PDF engine.
 */

import { buildInteriorPdf, buildCoverPdf, type InteriorResult, type CoverResult } from "../../pdf";
import type { InteriorPageContent } from "../../pdf/templates/interior";
import { PRODUCTION_DEFAULTS } from "../../config/defaults";
import { hashSeed } from "../../util/prng";
import { generatePuzzle } from "./generate";
import { renderPuzzleBody, renderSolutionBody } from "./render";
import { resolveBank } from "./word-banks";
import type { Difficulty, WordSearchInput, WordSearchPuzzle } from "./types";

export interface WordSearchBookOptions extends Partial<WordSearchInput> {
  theme: string;
  /** Optional overrides for production books; sensible defaults otherwise. */
  title?: string;
  subtitle?: string;
  author?: string;
  /** Optional word pool (e.g. AI-generated). Defaults to the theme's bank. */
  words?: string[];
  /** Optional back-cover blurb override. */
  backText?: string;
}

export interface ResolvedBookConfig {
  theme: string; // display-cased
  puzzleCount: number;
  gridSize: number;
  difficulty: Difficulty;
  wordsPerPuzzle: number;
  seed: number;
  title: string;
  subtitle: string;
  author: string;
}

const DEFAULTS = {
  puzzleCount: 20,
  gridSize: 15,
  difficulty: "medium" as Difficulty,
  wordsPerPuzzle: 12,
  author: "KDF Mafia",
};

export function resolveConfig(opts: WordSearchBookOptions): ResolvedBookConfig {
  const theme = resolveBank(opts.theme).theme;
  const puzzleCount = opts.puzzleCount ?? DEFAULTS.puzzleCount;
  const gridSize = opts.gridSize ?? DEFAULTS.gridSize;
  const difficulty = opts.difficulty ?? DEFAULTS.difficulty;
  const wordsPerPuzzle = opts.wordsPerPuzzle ?? DEFAULTS.wordsPerPuzzle;
  const seed = opts.seed ?? hashSeed(`${theme}|${difficulty}|${gridSize}`);
  return {
    theme,
    puzzleCount,
    gridSize,
    difficulty,
    wordsPerPuzzle,
    seed,
    title: opts.title ?? `${theme} Word Search`,
    subtitle: opts.subtitle ?? `${puzzleCount} Puzzles · ${difficulty} level`,
    author: opts.author ?? DEFAULTS.author,
  };
}

/**
 * Generate the deterministic puzzle set for a config. An optional `words` pool
 * (e.g. AI-generated for an arbitrary niche) overrides the curated bank.
 */
export function generatePuzzles(
  cfg: ResolvedBookConfig,
  words?: string[]
): WordSearchPuzzle[] {
  return Array.from({ length: cfg.puzzleCount }, (_, i) =>
    generatePuzzle({
      theme: cfg.theme,
      size: cfg.gridSize,
      difficulty: cfg.difficulty,
      wordCount: cfg.wordsPerPuzzle,
      seed: cfg.seed + i,
      words,
    })
  );
}

/** Lay puzzles out into interior pages. */
export function buildInteriorPages(
  cfg: ResolvedBookConfig,
  puzzles: WordSearchPuzzle[]
): InteriorPageContent[] {
  const pages: InteriorPageContent[] = [];

  // Title page
  pages.push({
    showPageNumber: false,
    html: `
      <div style="display:flex;flex-direction:column;height:100%;justify-content:center;align-items:center;text-align:center">
        <div style="font-size:12pt;letter-spacing:0.25em;text-transform:uppercase;color:#999">${cfg.theme}</div>
        <h1 style="font-size:40pt;margin:0.2in 0 0.1in;line-height:1.1">${cfg.title}</h1>
        <div style="width:2.4in;border-top:2px solid #222;margin:0.18in 0"></div>
        <h2 style="font-weight:normal;color:#444;margin:0;font-size:15pt">${cfg.subtitle}</h2>
        <div style="margin-top:0.7in;font-size:13pt;color:#222">${cfg.author}</div>
      </div>`,
  });

  // Instructions page
  pages.push({
    showPageNumber: false,
    html: `
      <h2>How to play</h2>
      <p>Each puzzle hides a list of words in a grid of letters. Words may run
      horizontally, vertically, or diagonally${cfg.difficulty === "hard" ? ", forwards or backwards" : ""}.</p>
      <p>Circle each word as you find it. When you are stuck, the full answer key
      is at the back of the book.</p>
      <p class="muted">Theme: ${cfg.theme} &middot; Difficulty: ${cfg.difficulty}</p>`,
  });

  // Puzzle pages
  puzzles.forEach((p, i) => pages.push({ html: renderPuzzleBody(p, i) }));

  // Solutions divider
  pages.push({
    html: `
      <div style="display:flex;flex-direction:column;height:100%;justify-content:center;text-align:center">
        <h1>Solutions</h1>
        <p class="muted">Answer key for all ${puzzles.length} puzzles</p>
      </div>`,
  });

  // Solution pages
  puzzles.forEach((p, i) => pages.push({ html: renderSolutionBody(p, i) }));

  return pages;
}

export interface WordSearchBookResult {
  config: ResolvedBookConfig;
  puzzles: WordSearchPuzzle[];
  pageCount: number;
  interior: InteriorResult;
  cover: CoverResult;
}

/** Full pipeline: config → puzzles → interior + cover PDFs. */
export async function buildWordSearchBook(
  opts: WordSearchBookOptions
): Promise<WordSearchBookResult> {
  const config = resolveConfig(opts);
  const puzzles = generatePuzzles(config, opts.words);
  const pages = buildInteriorPages(config, puzzles);
  const pageCount = pages.length;

  const trim = PRODUCTION_DEFAULTS.trim;
  const bleed = PRODUCTION_DEFAULTS.bleed; // false for puzzle books

  const interior = await buildInteriorPdf({ trim, pageCount, bleed }, pages);

  const cover = await buildCoverPdf({
    trim,
    pageCount,
    paper: PRODUCTION_DEFAULTS.paper,
    content: {
      title: config.title,
      subtitle: config.subtitle,
      author: config.author,
      backText:
        opts.backText ??
        `${config.puzzleCount} ${config.theme.toLowerCase()} word search puzzles with a complete answer key. ${config.difficulty.charAt(0).toUpperCase() + config.difficulty.slice(1)} difficulty — great for relaxing, sharpening focus, and passing the time.`,
    },
  });

  return { config, puzzles, pageCount, interior, cover };
}
