import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getBookSignedUrl } from "@/lib/storage";
import { rateLimit, rateLimitResponse } from "@/lib/util/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const v = Number(req.nextUrl.searchParams.get("v") ?? "0");

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const rl = rateLimit(`dl-cover:${user.id}`, 60);
  if (!rl.ok) return rateLimitResponse(rl.retryAfterSec);

  // RLS scopes the cover to the owner.
  const { data: cover } = await supabase.from("covers").select("variation_keys").eq("id", id).single();
  const keys = (cover?.variation_keys as string[] | undefined) ?? [];
  const key = keys[Number.isInteger(v) ? v : 0];
  if (!key) return NextResponse.json({ error: "Cover not found" }, { status: 404 });

  return NextResponse.redirect(await getBookSignedUrl(key, 300));
}
