import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isStorageConfigured } from "@/lib/storage";
import { generateAndStoreBook, type PipelineBookType } from "@/lib/books/pipeline";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const TYPES: PipelineBookType[] = ["word_search", "sudoku", "maze", "coloring"];

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

  // Ebook ships via /api/ebook; the wizard routes it there. Guard here too.
  if (body.bookType === "ebook") {
    return NextResponse.json({ comingSoon: true, message: "Use the Ebook Creator for ebooks." });
  }

  const bookType: PipelineBookType = TYPES.includes(body.bookType as PipelineBookType)
    ? (body.bookType as PipelineBookType)
    : "word_search";
  const opportunity = body.opportunity && typeof body.opportunity === "object" ? body.opportunity : null;

  try {
    const result = await generateAndStoreBook(
      user.id,
      {
        bookType,
        theme: typeof body.theme === "string" ? body.theme : undefined,
        title: typeof body.title === "string" ? body.title : undefined,
        difficulty: typeof body.difficulty === "string" ? body.difficulty : undefined,
        count: Number(body.puzzleCount) || undefined,
        ageGroup: typeof body.ageGroup === "string" ? body.ageGroup : undefined,
        style: typeof body.style === "string" ? body.style : undefined,
      },
      { opportunity }
    );
    return NextResponse.json(result);
  } catch (err) {
    const msg = (err as Error).message;
    if (msg === "Theme is required") return NextResponse.json({ error: msg }, { status: 400 });
    console.error("book generation failed:", err);
    return NextResponse.json({ error: "Generation failed. Please try again." }, { status: 500 });
  }
}
