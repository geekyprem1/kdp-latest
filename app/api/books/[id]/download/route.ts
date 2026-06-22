import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { getBookSignedUrl } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const part = req.nextUrl.searchParams.get("part") === "cover" ? "cover" : "interior";

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  // RLS ensures the user can only read their own book.
  const { data: book } = await supabase
    .from("books")
    .select("id, interior_key, cover_key, status")
    .eq("id", id)
    .single();

  if (!book) return NextResponse.json({ error: "Book not found" }, { status: 404 });
  if (book.status !== "completed") {
    return NextResponse.json({ error: "Book is not ready yet" }, { status: 409 });
  }

  const key = part === "cover" ? book.cover_key : book.interior_key;
  if (!key) return NextResponse.json({ error: "File unavailable" }, { status: 404 });

  // Record the download (service role — RLS blocks client writes).
  await getSupabaseAdminClient()
    .from("downloads")
    .insert({ user_id: user.id, book_id: id, part });

  const url = await getBookSignedUrl(key, 300);
  return NextResponse.redirect(url);
}
