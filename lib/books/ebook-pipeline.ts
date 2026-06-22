/**
 * Shared ebook generate-and-store pipeline (used by the job runner). Reuses the
 * existing ebook generator + storage + DB; no generator changes.
 */

import { getSupabaseAdminClient } from "../supabase/admin";
import { putBytes, bookObjectKey } from "../storage";
import { buildEbook } from "../generators/ebook";
import { loadPublishingProfile, profileAuthor } from "../publishing/profile";

export interface EbookGenInput {
  topic: string;
  audience?: string;
  tone?: string;
  chapterCount?: number;
  targetWords?: number;
  title?: string;
}

export interface StoredEbook {
  id: string;
  title: string;
  chapterCount: number;
}

export async function generateAndStoreEbook(
  userId: string,
  input: EbookGenInput,
  opts?: { opportunity?: unknown; onProgress?: (step: string, percent: number) => void | Promise<void> }
): Promise<StoredEbook> {
  const admin = getSupabaseAdminClient();
  const progress = async (step: string, pct: number) => {
    try { await opts?.onProgress?.(step, pct); } catch { /* best-effort */ }
  };

  const author = profileAuthor(await loadPublishingProfile(userId));
  await progress("Outline & chapters", 20);
  const built = await buildEbook({
    topic: input.topic,
    audience: input.audience,
    tone: input.tone,
    chapterCount: input.chapterCount,
    targetWords: input.targetWords,
    title: input.title,
    author,
  });
  await progress("Saving", 75);

  const { data: inserted, error: insErr } = await admin
    .from("books")
    .insert({
      user_id: userId,
      book_type: "ebook",
      theme: input.topic,
      title: built.title,
      status: "generating",
      difficulty: built.audience,
      puzzle_count: built.chapters.length,
      trim_size: "6x9",
      config: { audience: built.audience, tone: built.tone, author: built.author },
      opportunity: opts?.opportunity ?? null,
    })
    .select("id")
    .single();
  if (insErr || !inserted) throw new Error(insErr?.message ?? "insert failed");
  const bookId = inserted.id as string;

  try {
    const coverKey = bookObjectKey(userId, bookId, "cover");
    await putBytes(coverKey, built.coverBytes, "image/png");

    await admin.from("ebook_chapters").insert(
      built.chapters.map((c) => ({
        book_id: bookId, idx: c.idx, title: c.title, summary: c.summary,
        content_md: c.contentMd, word_count: c.wordCount, status: c.status,
      }))
    );
    await admin.from("book_metadata").upsert({
      book_id: bookId, title: built.title, subtitle: built.subtitle,
      description: built.description, keywords: built.keywords, generated_by: built.metadataBy,
    });
    await progress("Finalizing", 95);
    await admin.from("books").update({
      status: "completed", cover_key: coverKey, page_count: built.chapters.length, updated_at: new Date().toISOString(),
    }).eq("id", bookId);

    return { id: bookId, title: built.title, chapterCount: built.chapters.length };
  } catch (err) {
    await admin.from("books").update({ status: "failed", error: (err as Error).message }).eq("id", bookId);
    throw err;
  }
}
