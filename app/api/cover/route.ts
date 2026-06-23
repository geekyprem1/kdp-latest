import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { putBytes, getBookSignedUrl, isStorageConfigured } from "@/lib/storage";
import { buildCovers, COVER_GENRES, type CoverGenre } from "@/lib/cover";
import { reserve, refund, recordUsage } from "@/lib/billing";
import { assertFeature, billingErrorResponse } from "@/lib/billing/guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 180;

const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");

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

  const title = str(body.title);
  if (!title) return NextResponse.json({ error: "Book title is required" }, { status: 400 });
  const genre: CoverGenre = COVER_GENRES.includes(body.genre as CoverGenre) ? (body.genre as CoverGenre) : "business";
  const trim = str(body.trim) || "6x9";

  const input = {
    title,
    subtitle: str(body.subtitle) || undefined,
    author: str(body.author) || undefined,
    genre,
    mood: str(body.mood) || undefined,
    artStyle: str(body.artStyle) || undefined,
    audience: str(body.audience) || undefined,
    trim,
  };

  const cost = 1; // Cover Studio
  try {
    await assertFeature(user.id, "cover");
    await reserve(user.id, cost, "cover");
  } catch (e) {
    const r = billingErrorResponse(e);
    if (r) return r;
    throw e;
  }

  const admin = getSupabaseAdminClient();
  try {
    const { brief, concepts } = await buildCovers(input);

    const { data: inserted, error: insErr } = await admin
      .from("covers")
      .insert({
        user_id: user.id,
        title,
        subtitle: input.subtitle ?? null,
        author: input.author ?? null,
        book_type: genre,
        genre,
        trim,
        mood: input.mood ?? null,
        art_style: input.artStyle ?? null,
        audience: input.audience ?? null,
        image_prompt: brief.imagePrompt,
        layout: brief.layout,
        typography: brief.typography,
        model: brief.model,
      })
      .select("id")
      .single();
    if (insErr || !inserted) throw new Error(insErr?.message ?? "insert failed");
    const coverId = inserted.id as string;

    const keys: string[] = [];
    const conceptMeta: Array<{ layout: string; seed: number; score: number }> = [];
    for (let i = 0; i < concepts.length; i++) {
      const key = `covers/${user.id}/${coverId}/${i}.png`;
      await putBytes(key, concepts[i].bytes, "image/png");
      keys.push(key);
      conceptMeta.push(concepts[i].concept);
    }
    await admin.from("covers").update({ variation_keys: keys, concepts: conceptMeta }).eq("id", coverId);

    await recordUsage(user.id, "cover", cost, "completed", coverId, { topic: title });
    const urls = await Promise.all(keys.map((k) => getBookSignedUrl(k, 600)));
    return NextResponse.json({
      id: coverId,
      brief: { layout: brief.layout, typography: brief.typography, model: brief.model },
      variations: keys.map((_, i) => ({ index: i, url: urls[i], score: conceptMeta[i].score, layout: conceptMeta[i].layout })),
    });
  } catch (err) {
    await refund(user.id, cost);
    await recordUsage(user.id, "cover", cost, "failed", undefined, { topic: title });
    console.error("cover generation failed:", err);
    return NextResponse.json({ error: "Cover generation failed. Please try again." }, { status: 500 });
  }
}
