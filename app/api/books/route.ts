import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { putBookPdf, bookObjectKey, isStorageConfigured } from "@/lib/storage";
import {
  buildWordSearchBook,
  resolveConfig,
  type Difficulty,
} from "@/lib/generators/word-search";
import {
  buildSudokuBook,
  MIN_SUDOKU_PUZZLES,
  SUDOKU_DIFFICULTIES,
  type SudokuDifficulty,
} from "@/lib/generators/sudoku";
import { generateWordList, generateMetadata } from "@/lib/ai";
import type { InteriorResult, CoverResult } from "@/lib/pdf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const WS_DIFFICULTIES: Difficulty[] = ["easy", "medium", "hard"];

function clamp(n: unknown, min: number, max: number, fallback: number): number {
  const v = Number(n);
  if (!Number.isFinite(v)) return fallback;
  return Math.min(max, Math.max(min, Math.round(v)));
}

interface BuildPlan {
  bookType: "word_search" | "sudoku";
  theme: string;
  title: string;
  difficulty: string;
  puzzleCount: number;
  wordSource: "ai" | "bank" | null;
  config: Record<string, unknown>;
  metadata: { subtitle: string; description: string; keywords: string[]; generatedBy: string };
  build: () => Promise<{ interior: InteriorResult; cover: CoverResult; pageCount: number }>;
}

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  if (!isStorageConfigured()) {
    return NextResponse.json({ error: "Storage is not configured on the server." }, { status: 503 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const bookType = body.bookType === "sudoku" ? "sudoku" : "word_search";
  const userTitle = typeof body.title === "string" ? body.title.trim() : "";

  // ── plan the build per type ──
  let plan: BuildPlan;

  if (bookType === "sudoku") {
    const difficulty: SudokuDifficulty = SUDOKU_DIFFICULTIES.includes(
      body.difficulty as SudokuDifficulty
    )
      ? (body.difficulty as SudokuDifficulty)
      : "medium";
    const puzzleCount = clamp(body.puzzleCount, MIN_SUDOKU_PUZZLES, 100, 30);
    const metadata = await generateMetadata({ bookType: "sudoku", puzzleCount, difficulty });
    const title = userTitle || metadata.title;
    plan = {
      bookType,
      theme: "Sudoku",
      title,
      difficulty,
      puzzleCount,
      wordSource: null,
      config: {},
      metadata,
      build: () =>
        buildSudokuBook({
          title,
          subtitle: metadata.subtitle,
          difficulty,
          puzzleCount,
          backText: metadata.description,
        }),
    };
  } else {
    const theme = typeof body.theme === "string" ? body.theme.trim() : "";
    if (!theme) return NextResponse.json({ error: "Theme is required" }, { status: 400 });

    const difficulty: Difficulty = WS_DIFFICULTIES.includes(body.difficulty as Difficulty)
      ? (body.difficulty as Difficulty)
      : "medium";
    const puzzleCount = clamp(body.puzzleCount, 11, 50, 25);

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
    plan = {
      bookType,
      theme,
      title,
      difficulty,
      puzzleCount,
      wordSource,
      config: { gridSize: cfg.gridSize, wordsPerPuzzle: cfg.wordsPerPuzzle },
      metadata,
      build: () =>
        buildWordSearchBook({
          theme,
          title,
          subtitle: metadata.subtitle,
          puzzleCount,
          difficulty,
          words,
          backText: metadata.description,
        }),
    };
  }

  const admin = getSupabaseAdminClient();
  let bookId: string | null = null;

  try {
    const { data: inserted, error: insErr } = await admin
      .from("books")
      .insert({
        user_id: user.id,
        book_type: plan.bookType,
        theme: plan.theme,
        title: plan.title,
        status: "generating",
        difficulty: plan.difficulty,
        puzzle_count: plan.puzzleCount,
        trim_size: "8.5x11",
        word_source: plan.wordSource,
        config: plan.config,
      })
      .select("id")
      .single();
    if (insErr || !inserted) throw new Error(insErr?.message ?? "insert failed");
    bookId = inserted.id;

    const book = await plan.build();

    const interiorKey = bookObjectKey(user.id, bookId!, "interior");
    const coverKey = bookObjectKey(user.id, bookId!, "cover");
    await putBookPdf(interiorKey, book.interior.pdf);
    await putBookPdf(coverKey, book.cover.pdf);

    await admin
      .from("books")
      .update({
        status: "completed",
        page_count: book.pageCount,
        interior_key: interiorKey,
        cover_key: coverKey,
        updated_at: new Date().toISOString(),
      })
      .eq("id", bookId);

    await admin.from("book_metadata").upsert({
      book_id: bookId,
      title: plan.title,
      subtitle: plan.metadata.subtitle,
      description: plan.metadata.description,
      keywords: plan.metadata.keywords,
      generated_by: plan.metadata.generatedBy,
    });

    return NextResponse.json({
      id: bookId,
      title: plan.title,
      bookType: plan.bookType,
      pageCount: book.pageCount,
      wordSource: plan.wordSource,
      metadataBy: plan.metadata.generatedBy,
    });
  } catch (err) {
    console.error("book generation failed:", err);
    if (bookId) {
      await admin.from("books").update({ status: "failed", error: (err as Error).message }).eq("id", bookId);
    }
    return NextResponse.json({ error: "Generation failed. Please try again." }, { status: 500 });
  }
}
