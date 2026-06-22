/**
 * Shared single-book generation pipeline.
 *
 * The one place that turns a typed request into a stored book (generate via the
 * EXISTING generators → upload PDFs → insert rows). Used by both `/api/books`
 * (Create wizard) and the Bundle Generator, so there's no duplicate generator
 * or orchestration code.
 */

import { getSupabaseAdminClient } from "../supabase/admin";
import { putBookPdf, bookObjectKey } from "../storage";
import { buildWordSearchBook, resolveConfig, type Difficulty } from "../generators/word-search";
import { buildSudokuBook, MIN_SUDOKU_PUZZLES, SUDOKU_DIFFICULTIES, type SudokuDifficulty } from "../generators/sudoku";
import { buildMazeBook, MIN_MAZES, MAZE_DIFFICULTIES, type MazeDifficulty } from "../generators/maze";
import { buildColoringBook, MIN_COLORING_PAGES, COLORING_AGE_GROUPS, COLORING_STYLES, type ColoringAgeGroup, type ColoringStyle } from "../generators/coloring";
import { generateWordList, generateMetadata } from "../ai";
import { loadPublishingProfile, profileAuthor } from "../publishing/profile";
import type { InteriorResult, CoverResult } from "../pdf";

export type PipelineBookType = "word_search" | "sudoku" | "maze" | "coloring";
const WS_DIFFICULTIES: Difficulty[] = ["easy", "medium", "hard"];

export function clampCount(n: unknown, min: number, max: number, fallback: number): number {
  const v = Number(n);
  if (!Number.isFinite(v)) return fallback;
  return Math.min(max, Math.max(min, Math.round(v)));
}

export interface BookGenInput {
  bookType: PipelineBookType;
  theme?: string; // required for word_search & coloring
  title?: string;
  difficulty?: string;
  count?: number; // puzzle/page count
  ageGroup?: string; // coloring
  style?: string; // coloring
  author?: string; // from the Publishing Profile (passed to the generator's author option)
}

interface BuildPlan {
  bookType: PipelineBookType;
  theme: string;
  title: string;
  difficulty: string;
  puzzleCount: number;
  wordSource: "ai" | "bank" | null;
  config: Record<string, unknown>;
  metadata: { subtitle: string; description: string; keywords: string[]; generatedBy: string };
  build: () => Promise<{ interior: InteriorResult; cover: CoverResult; pageCount: number }>;
}

/** Plan one book: validate inputs, generate metadata (+ word list), prepare a build closure. */
export async function planBook(input: BookGenInput): Promise<BuildPlan> {
  const userTitle = (input.title ?? "").trim();

  if (input.bookType === "coloring") {
    const theme = (input.theme ?? "").trim();
    if (!theme) throw new Error("Theme is required");
    const ageGroup: ColoringAgeGroup = COLORING_AGE_GROUPS.includes(input.ageGroup as ColoringAgeGroup) ? (input.ageGroup as ColoringAgeGroup) : "kids";
    const style: ColoringStyle = COLORING_STYLES.includes(input.style as ColoringStyle) ? (input.style as ColoringStyle) : "cute";
    const pageCount = clampCount(input.count, MIN_COLORING_PAGES, 40, 24);
    const metadata = await generateMetadata({ bookType: "coloring", theme, puzzleCount: pageCount, difficulty: ageGroup });
    const title = userTitle || metadata.title;
    return {
      bookType: "coloring", theme, title, difficulty: ageGroup, puzzleCount: pageCount, wordSource: null,
      config: { ageGroup, style }, metadata,
      build: () => buildColoringBook({ theme, title, subtitle: metadata.subtitle, ageGroup, style, pageCount, backText: metadata.description, author: input.author }),
    };
  }

  if (input.bookType === "maze") {
    const difficulty: MazeDifficulty = MAZE_DIFFICULTIES.includes(input.difficulty as MazeDifficulty) ? (input.difficulty as MazeDifficulty) : "medium";
    const mazeCount = clampCount(input.count, MIN_MAZES, 100, 30);
    const metadata = await generateMetadata({ bookType: "maze", puzzleCount: mazeCount, difficulty });
    const title = userTitle || metadata.title;
    return {
      bookType: "maze", theme: input.theme?.trim() || "Maze", title, difficulty, puzzleCount: mazeCount, wordSource: null,
      config: {}, metadata,
      build: () => buildMazeBook({ title, subtitle: metadata.subtitle, difficulty, mazeCount, backText: metadata.description, author: input.author }),
    };
  }

  if (input.bookType === "sudoku") {
    const difficulty: SudokuDifficulty = SUDOKU_DIFFICULTIES.includes(input.difficulty as SudokuDifficulty) ? (input.difficulty as SudokuDifficulty) : "medium";
    const puzzleCount = clampCount(input.count, MIN_SUDOKU_PUZZLES, 100, 30);
    const metadata = await generateMetadata({ bookType: "sudoku", puzzleCount, difficulty });
    const title = userTitle || metadata.title;
    return {
      bookType: "sudoku", theme: input.theme?.trim() || "Sudoku", title, difficulty, puzzleCount, wordSource: null,
      config: {}, metadata,
      build: () => buildSudokuBook({ title, subtitle: metadata.subtitle, difficulty, puzzleCount, backText: metadata.description, author: input.author }),
    };
  }

  // word_search
  const theme = (input.theme ?? "").trim();
  if (!theme) throw new Error("Theme is required");
  const difficulty: Difficulty = WS_DIFFICULTIES.includes(input.difficulty as Difficulty) ? (input.difficulty as Difficulty) : "medium";
  const puzzleCount = clampCount(input.count, 11, 50, 25);
  let words: string[] | undefined;
  let wordSource: "ai" | "bank" = "bank";
  try {
    words = (await generateWordList({ niche: theme, count: 30 })).words;
    wordSource = "ai";
  } catch {
    wordSource = "bank";
  }
  const metadata = await generateMetadata({ bookType: "word_search", theme, puzzleCount, difficulty });
  const title = userTitle || metadata.title;
  const cfg = resolveConfig({ theme, title, subtitle: metadata.subtitle, puzzleCount, difficulty });
  return {
    bookType: "word_search", theme, title, difficulty, puzzleCount, wordSource,
    config: { gridSize: cfg.gridSize, wordsPerPuzzle: cfg.wordsPerPuzzle }, metadata,
    build: () => buildWordSearchBook({ theme, title, subtitle: metadata.subtitle, puzzleCount, difficulty, words, backText: metadata.description, author: input.author }),
  };
}

export interface StoredBook {
  id: string;
  title: string;
  bookType: PipelineBookType;
  pageCount: number;
  wordSource: "ai" | "bank" | null;
  metadataBy: string;
}

/** Plan → insert → build → upload → finalize. Marks the book failed and rethrows on error. */
export async function generateAndStoreBook(
  userId: string,
  input: BookGenInput,
  opts?: { opportunity?: unknown; bundleId?: string | null }
): Promise<StoredBook> {
  const admin = getSupabaseAdminClient();
  // Inherit the author from the Publishing Profile (passed to the generator's
  // existing author option — no generator changes).
  const author = input.author ?? profileAuthor(await loadPublishingProfile(userId));
  const plan = await planBook({ ...input, author });

  const { data: inserted, error: insErr } = await admin
    .from("books")
    .insert({
      user_id: userId,
      book_type: plan.bookType,
      theme: plan.theme,
      title: plan.title,
      status: "generating",
      difficulty: plan.difficulty,
      puzzle_count: plan.puzzleCount,
      trim_size: "8.5x11",
      word_source: plan.wordSource,
      config: { ...plan.config, author },
      opportunity: opts?.opportunity ?? null,
      bundle_id: opts?.bundleId ?? null,
    })
    .select("id")
    .single();
  if (insErr || !inserted) throw new Error(insErr?.message ?? "insert failed");
  const bookId = inserted.id as string;

  try {
    const book = await plan.build();
    const interiorKey = bookObjectKey(userId, bookId, "interior");
    const coverKey = bookObjectKey(userId, bookId, "cover");
    await putBookPdf(interiorKey, book.interior.pdf);
    await putBookPdf(coverKey, book.cover.pdf);

    await admin.from("books").update({
      status: "completed", page_count: book.pageCount,
      interior_key: interiorKey, cover_key: coverKey, updated_at: new Date().toISOString(),
    }).eq("id", bookId);

    await admin.from("book_metadata").upsert({
      book_id: bookId, title: plan.title, subtitle: plan.metadata.subtitle,
      description: plan.metadata.description, keywords: plan.metadata.keywords, generated_by: plan.metadata.generatedBy,
    });

    return { id: bookId, title: plan.title, bookType: plan.bookType, pageCount: book.pageCount, wordSource: plan.wordSource, metadataBy: plan.metadata.generatedBy };
  } catch (err) {
    await admin.from("books").update({ status: "failed", error: (err as Error).message }).eq("id", bookId);
    throw err;
  }
}
