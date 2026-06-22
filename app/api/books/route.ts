import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { uploadObject, bookObjectKey, isR2Configured } from "@/lib/storage/r2";
import { buildWordSearchBook, resolveConfig, type Difficulty } from "@/lib/generators/word-search";
import { generateWordList, generateMetadata } from "@/lib/ai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const DIFFICULTIES: Difficulty[] = ["easy", "medium", "hard"];

function clamp(n: unknown, min: number, max: number, fallback: number): number {
  const v = Number(n);
  if (!Number.isFinite(v)) return fallback;
  return Math.min(max, Math.max(min, Math.round(v)));
}

export async function POST(req: NextRequest) {
  // ── auth ──
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  if (!isR2Configured()) {
    return NextResponse.json(
      { error: "Storage (Cloudflare R2) is not configured on the server." },
      { status: 503 }
    );
  }

  // ── input ──
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const theme = typeof body.theme === "string" ? body.theme.trim() : "";
  if (!theme) return NextResponse.json({ error: "Theme is required" }, { status: 400 });

  const difficulty: Difficulty = DIFFICULTIES.includes(body.difficulty as Difficulty)
    ? (body.difficulty as Difficulty)
    : "medium";
  const puzzleCount = clamp(body.puzzleCount, 11, 50, 25); // ≥11 clears KDP's 24-page minimum
  const userTitle = typeof body.title === "string" ? body.title.trim() : "";

  const admin = getSupabaseAdminClient();
  let bookId: string | null = null;

  try {
    // ── AI word list (falls back to curated bank) ──
    let words: string[] | undefined;
    let wordSource: "ai" | "bank" = "bank";
    try {
      const wl = await generateWordList({ niche: theme, count: 30 });
      words = wl.words;
      wordSource = "ai";
    } catch {
      wordSource = "bank"; // generator uses the curated bank for `theme`
    }

    // ── metadata (AI or template) ──
    const metadata = await generateMetadata({ theme, puzzleCount, difficulty });
    const title = userTitle || metadata.title;
    const cfg = resolveConfig({ theme, title, subtitle: metadata.subtitle, puzzleCount, difficulty });

    // ── insert book row (generating) ──
    const { data: inserted, error: insErr } = await admin
      .from("books")
      .insert({
        user_id: user.id,
        book_type: "word_search",
        theme,
        title,
        status: "generating",
        difficulty,
        puzzle_count: puzzleCount,
        trim_size: "8.5x11",
        word_source: wordSource,
        config: { gridSize: cfg.gridSize, wordsPerPuzzle: cfg.wordsPerPuzzle },
      })
      .select("id")
      .single();
    if (insErr || !inserted) throw new Error(insErr?.message ?? "insert failed");
    bookId = inserted.id;

    // ── generate PDFs ──
    const book = await buildWordSearchBook({
      theme,
      title,
      subtitle: metadata.subtitle,
      puzzleCount,
      difficulty,
      words,
      backText: metadata.description,
    });

    // ── upload to R2 ──
    const interiorKey = bookObjectKey(user.id, bookId!, "interior");
    const coverKey = bookObjectKey(user.id, bookId!, "cover");
    await uploadObject(interiorKey, Buffer.from(book.interior.pdf), "application/pdf");
    await uploadObject(coverKey, Buffer.from(book.cover.pdf), "application/pdf");

    // ── finalize ──
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
      title,
      subtitle: metadata.subtitle,
      description: metadata.description,
      keywords: metadata.keywords,
      generated_by: metadata.generatedBy,
    });

    return NextResponse.json({
      id: bookId,
      title,
      pageCount: book.pageCount,
      wordSource,
      metadataBy: metadata.generatedBy,
    });
  } catch (err) {
    console.error("book generation failed:", err);
    if (bookId) {
      await admin
        .from("books")
        .update({ status: "failed", error: (err as Error).message })
        .eq("id", bookId);
    }
    return NextResponse.json({ error: "Generation failed. Please try again." }, { status: 500 });
  }
}
