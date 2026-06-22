import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Apply a generated cover variation to one of the user's existing books. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
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
  const v = Number(body.variation ?? 0);
  if (!bookId) return NextResponse.json({ error: "bookId is required" }, { status: 400 });

  // verify ownership of both the cover and the book (RLS-scoped reads)
  const [{ data: cover }, { data: book }] = await Promise.all([
    supabase.from("covers").select("variation_keys").eq("id", id).single(),
    supabase.from("books").select("id").eq("id", bookId).single(),
  ]);
  if (!book) return NextResponse.json({ error: "Book not found" }, { status: 404 });
  const keys = (cover?.variation_keys as string[] | undefined) ?? [];
  const key = keys[Number.isInteger(v) ? v : 0];
  if (!key) return NextResponse.json({ error: "Cover not found" }, { status: 404 });

  const { error } = await getSupabaseAdminClient()
    .from("books")
    .update({ cover_key: key, updated_at: new Date().toISOString() })
    .eq("id", bookId)
    .eq("user_id", user.id);
  if (error) return NextResponse.json({ error: "Could not apply cover" }, { status: 500 });

  return NextResponse.json({ ok: true });
}
