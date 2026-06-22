import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { putBytes, bookObjectKey, isStorageConfigured } from "@/lib/storage";
import { buildEbook } from "@/lib/generators/ebook";
import { loadPublishingProfile, profileAuthor } from "@/lib/publishing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (!isStorageConfigured()) {
    return NextResponse.json({ error: "Storage is not configured." }, { status: 503 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const topic = typeof body.theme === "string" ? body.theme.trim() : typeof body.topic === "string" ? body.topic.trim() : "";
  if (!topic) return NextResponse.json({ error: "Topic is required" }, { status: 400 });

  const opportunity = body.opportunity && typeof body.opportunity === "object" ? body.opportunity : null;
  const admin = getSupabaseAdminClient();
  let bookId: string | null = null;

  try {
    const author = profileAuthor(await loadPublishingProfile(user.id));
    const built = await buildEbook({
      topic,
      audience: typeof body.audience === "string" ? body.audience : undefined,
      tone: typeof body.tone === "string" ? body.tone : undefined,
      chapterCount: Number(body.chapterCount) || undefined,
      targetWords: Number(body.targetWords) || undefined,
      title: typeof body.title === "string" ? body.title : undefined,
      author,
    });

    const { data: inserted, error: insErr } = await admin
      .from("books")
      .insert({
        user_id: user.id,
        book_type: "ebook",
        theme: topic,
        title: built.title,
        status: "generating",
        difficulty: built.audience,
        puzzle_count: built.chapters.length,
        trim_size: "6x9",
        config: { audience: built.audience, tone: built.tone, author: built.author },
        opportunity,
      })
      .select("id")
      .single();
    if (insErr || !inserted) throw new Error(insErr?.message ?? "insert failed");
    bookId = inserted.id;

    // cover image
    const coverKey = bookObjectKey(user.id, bookId!, "cover");
    await putBytes(coverKey, built.coverBytes, "image/png");

    // chapters
    const rows = built.chapters.map((c) => ({
      book_id: bookId,
      idx: c.idx,
      title: c.title,
      summary: c.summary,
      content_md: c.contentMd,
      word_count: c.wordCount,
      status: c.status,
    }));
    const { error: chErr } = await admin.from("ebook_chapters").insert(rows);
    if (chErr) throw new Error(chErr.message);

    await admin.from("book_metadata").upsert({
      book_id: bookId,
      title: built.title,
      subtitle: built.subtitle,
      description: built.description,
      keywords: built.keywords,
      generated_by: built.metadataBy,
    });

    await admin
      .from("books")
      .update({ status: "completed", cover_key: coverKey, page_count: built.chapters.length, updated_at: new Date().toISOString() })
      .eq("id", bookId);

    const totalWords = built.chapters.reduce((a, c) => a + c.wordCount, 0);
    return NextResponse.json({
      id: bookId,
      title: built.title,
      chapterCount: built.chapters.length,
      totalWords,
      metadataBy: built.metadataBy,
    });
  } catch (err) {
    console.error("ebook generation failed:", err);
    if (bookId) {
      await admin.from("books").update({ status: "failed", error: (err as Error).message }).eq("id", bookId);
    }
    return NextResponse.json({ error: "Ebook generation failed. Please try again." }, { status: 500 });
  }
}
