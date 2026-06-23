import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isStorageConfigured } from "@/lib/storage";
import { type PipelineBookType } from "@/lib/books/pipeline";
import { enqueue } from "@/lib/jobs/job-queue";
import { costFor, reserve, type Feature } from "@/lib/billing";
import { assertFeature, billingErrorResponse } from "@/lib/billing/guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TYPES: PipelineBookType[] = ["word_search", "sudoku", "maze", "coloring"];
const LABEL: Record<PipelineBookType, string> = {
  word_search: "Word Search",
  sudoku: "Sudoku Puzzle Book",
  maze: "Maze Puzzle Book",
  coloring: "Coloring Book",
};

/** Enqueue a background generation job and return immediately. */
export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (!isStorageConfigured()) return NextResponse.json({ error: "Storage is not configured." }, { status: 503 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (body.bookType === "ebook") return NextResponse.json({ error: "Use /api/ebook for ebooks." }, { status: 400 });

  const bookType: PipelineBookType = TYPES.includes(body.bookType as PipelineBookType)
    ? (body.bookType as PipelineBookType)
    : "word_search";
  const theme = typeof body.theme === "string" ? body.theme.trim() : "";
  if ((bookType === "word_search" || bookType === "coloring") && !theme) {
    return NextResponse.json({ error: "Theme is required" }, { status: 400 });
  }
  const userTitle = typeof body.title === "string" ? body.title.trim() : "";
  const displayTitle = userTitle || (theme ? theme : LABEL[bookType]);

  const input = {
    theme: theme || undefined,
    title: userTitle || undefined,
    difficulty: typeof body.difficulty === "string" ? body.difficulty : undefined,
    count: Number(body.puzzleCount) || undefined,
    ageGroup: typeof body.ageGroup === "string" ? body.ageGroup : undefined,
    style: typeof body.style === "string" ? body.style : undefined,
    opportunity: body.opportunity && typeof body.opportunity === "object" ? body.opportunity : undefined,
  };

  const cost = costFor(bookType, { count: Number(body.puzzleCount) || undefined });
  try {
    await assertFeature(user.id, bookType as Feature);
    await reserve(user.id, cost, "job");
  } catch (e) {
    const r = billingErrorResponse(e);
    if (r) return r;
    throw e;
  }

  const jobId = await enqueue(user.id, {
    jobType: bookType,
    bookType,
    title: displayTitle,
    input: { ...input, _cost: cost, _action: bookType },
  });
  return NextResponse.json({ jobId, cost });
}
