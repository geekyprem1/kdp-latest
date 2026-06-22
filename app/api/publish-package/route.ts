import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { generatePackageData, type PublishContext } from "@/lib/publishing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const bookId = typeof body.bookId === "string" ? body.bookId : "";
  if (!bookId) return NextResponse.json({ error: "bookId is required" }, { status: 400 });

  // RLS scopes the book to the owner.
  const { data: book } = await supabase
    .from("books")
    .select("id, title, theme, book_type, trim_size, difficulty, page_count, config, opportunity, book_metadata(subtitle, description, keywords)")
    .eq("id", bookId)
    .single();
  if (!book) return NextResponse.json({ error: "Book not found" }, { status: 404 });

  const metaArr = book.book_metadata as unknown as { subtitle: string | null; description: string | null; keywords: string[] | null }[] | null;
  const meta = metaArr?.[0] ?? null;
  const cfg = (book.config ?? {}) as { author?: string; audience?: string; ageGroup?: string };
  const opp = (book.opportunity ?? null) as { opportunity?: number } | null;

  const ctx: PublishContext = {
    title: book.title,
    subtitle: meta?.subtitle ?? undefined,
    author: cfg.author ?? "KDP Pocket AI",
    bookType: book.book_type,
    trim: book.trim_size ?? "8.5x11",
    theme: book.theme,
    difficulty: book.difficulty,
    audience: cfg.audience ?? cfg.ageGroup ?? undefined,
    pageCount: book.page_count ?? undefined,
    opportunityScore: opp?.opportunity ?? null,
    existingDescription: meta?.description ?? undefined,
    existingKeywords: meta?.keywords ?? undefined,
    bleed: book.book_type === "coloring",
  };

  try {
    const data = await generatePackageData(ctx);
    const { data: pkg, error } = await getSupabaseAdminClient()
      .from("book_publish_packages")
      .upsert(
        {
          book_id: bookId,
          user_id: user.id,
          metadata_json: data.metadataJson,
          keywords: data.keywords,
          description: data.description,
          categories: data.categories,
          alternative_titles: data.alternativeTitles,
        },
        { onConflict: "book_id" }
      )
      .select("id")
      .single();
    if (error || !pkg) throw new Error(error?.message ?? "save failed");

    return NextResponse.json({
      id: pkg.id,
      keywordCount: data.keywords.primary.length + data.keywords.longTail.length,
      categoryCount: data.categories.length,
      titleCount: data.alternativeTitles.length,
    });
  } catch (err) {
    console.error("publish package failed:", err);
    return NextResponse.json({ error: "Could not generate package. Please try again." }, { status: 500 });
  }
}
