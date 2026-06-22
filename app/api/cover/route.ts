import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { putBytes, getBookSignedUrl, isStorageConfigured } from "@/lib/storage";
import { buildCovers, COVER_BOOK_TYPES, type CoverBookType } from "@/lib/cover";

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
  const bookType: CoverBookType = COVER_BOOK_TYPES.includes(body.bookType as CoverBookType)
    ? (body.bookType as CoverBookType)
    : "ebook";

  const input = {
    title,
    subtitle: str(body.subtitle) || undefined,
    author: str(body.author) || undefined,
    bookType,
    genre: str(body.genre) || undefined,
    mood: str(body.mood) || undefined,
    artStyle: str(body.artStyle) || undefined,
    audience: str(body.audience) || undefined,
  };

  const admin = getSupabaseAdminClient();
  try {
    const { brief, variations } = await buildCovers(input);

    const { data: inserted, error: insErr } = await admin
      .from("covers")
      .insert({
        user_id: user.id,
        title,
        subtitle: input.subtitle ?? null,
        author: input.author ?? null,
        book_type: bookType,
        genre: input.genre ?? null,
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
    for (let i = 0; i < variations.length; i++) {
      const key = `covers/${user.id}/${coverId}/${i}.png`;
      await putBytes(key, variations[i], "image/png");
      keys.push(key);
    }
    await admin.from("covers").update({ variation_keys: keys }).eq("id", coverId);

    const urls = await Promise.all(keys.map((k) => getBookSignedUrl(k, 600)));
    return NextResponse.json({
      id: coverId,
      brief: { layout: brief.layout, typography: brief.typography, model: brief.model },
      variations: keys.map((k, i) => ({ index: i, url: urls[i] })),
    });
  } catch (err) {
    console.error("cover generation failed:", err);
    return NextResponse.json({ error: "Cover generation failed. Please try again." }, { status: 500 });
  }
}
