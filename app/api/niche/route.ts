import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { generateNicheResearch } from "@/lib/ai";
import { isAiConfigured } from "@/lib/ai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  if (!isAiConfigured()) {
    return NextResponse.json(
      { error: "Niche research needs OpenRouter — set OPENROUTER_API_KEY on the server." },
      { status: 503 }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const keyword = typeof body.keyword === "string" ? body.keyword.trim() : "";
  if (!keyword) return NextResponse.json({ error: "Keyword is required" }, { status: 400 });

  const input = {
    keyword,
    audience: typeof body.audience === "string" ? body.audience.trim() : undefined,
    category: typeof body.category === "string" ? body.category.trim() : undefined,
    country: typeof body.country === "string" ? body.country.trim() : undefined,
  };

  try {
    const { ideas, model } = await generateNicheResearch(input);

    const { data: inserted, error } = await getSupabaseAdminClient()
      .from("niche_reports")
      .insert({
        user_id: user.id,
        keyword: input.keyword,
        audience: input.audience ?? null,
        category: input.category ?? null,
        country: input.country ?? null,
        model,
        ideas,
      })
      .select("id")
      .single();
    if (error || !inserted) throw new Error(error?.message ?? "insert failed");

    return NextResponse.json({ id: inserted.id, count: ideas.length });
  } catch (err) {
    console.error("niche research failed:", err);
    return NextResponse.json(
      { error: "Research failed. Please try again." },
      { status: 500 }
    );
  }
}
