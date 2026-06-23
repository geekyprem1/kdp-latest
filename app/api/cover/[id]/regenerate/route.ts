import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { putBytes, getBookSignedUrl } from "@/lib/storage";
import { buildOneConcept, type CoverGenre, type ConceptLayout } from "@/lib/cover";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

interface Concept { layout: ConceptLayout; seed: number; score: number; breakdown?: unknown }

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  let index = 0;
  try {
    index = Number((await req.json()).index) || 0;
  } catch {
    /* default 0 */
  }

  // RLS scopes the cover to the owner.
  const { data: cover } = await supabase
    .from("covers")
    .select("id, title, subtitle, author, genre, mood, art_style, audience, trim, image_prompt, layout, typography, model, concepts, variation_keys")
    .eq("id", id)
    .single();
  if (!cover) return NextResponse.json({ error: "Cover not found" }, { status: 404 });

  const concepts = (cover.concepts as Concept[]) ?? [];
  const keys = (cover.variation_keys as string[]) ?? [];
  if (index < 0 || index >= keys.length) return NextResponse.json({ error: "Invalid concept" }, { status: 400 });
  const layout = concepts[index]?.layout ?? "centered";

  const input = {
    title: cover.title as string,
    subtitle: (cover.subtitle as string) ?? undefined,
    author: (cover.author as string) ?? undefined,
    genre: ((cover.genre as CoverGenre) ?? "business") as CoverGenre,
    mood: (cover.mood as string) ?? undefined,
    artStyle: (cover.art_style as string) ?? undefined,
    audience: (cover.audience as string) ?? undefined,
    trim: (cover.trim as string) ?? "6x9",
  };
  const brief = {
    imagePrompt: (cover.image_prompt as string) ?? input.title,
    accentColor: "#c9a84c",
    layout: (cover.layout as string) ?? "",
    typography: (cover.typography as string) ?? "",
    model: (cover.model as string) ?? "template",
  };

  try {
    const seed = Date.now() % 1_000_000;
    const built = await buildOneConcept(input, brief, layout, seed, index);
    const key = keys[index]; // overwrite same key
    await putBytes(key, built.bytes, "image/png");

    concepts[index] = built.concept;
    await getSupabaseAdminClient().from("covers").update({ concepts }).eq("id", id);

    const url = await getBookSignedUrl(key, 600);
    return NextResponse.json({ index, url, score: built.concept.score, layout, breakdown: built.concept.breakdown ?? null });
  } catch (err) {
    console.error("regenerate failed:", err);
    return NextResponse.json({ error: "Regenerate failed. Please try again." }, { status: 500 });
  }
}
