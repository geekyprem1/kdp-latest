import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { retryJob } from "@/lib/jobs/job-queue";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function ownedJob(id: string) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: "Not authenticated" }, { status: 401 }) };
  // RLS scopes the read to the owner.
  const { data: job } = await supabase
    .from("generation_jobs")
    .select("id, book_id, job_type, book_type, title, status, progress, current_step, error_message, created_at, completed_at")
    .eq("id", id)
    .single();
  if (!job) return { error: NextResponse.json({ error: "Job not found" }, { status: 404 }) };
  return { user, job };
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const r = await ownedJob(id);
  if (r.error) return r.error;
  return NextResponse.json(r.job);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const r = await ownedJob(id);
  if (r.error) return r.error;

  let action = "";
  try {
    action = (await req.json()).action;
  } catch {
    /* no body */
  }

  if (action === "retry") {
    await retryJob(id);
    return NextResponse.json({ ok: true, status: "queued" });
  }
  if (action === "cancel") {
    if (["queued", "processing"].includes(r.job.status)) {
      await getSupabaseAdminClient()
        .from("generation_jobs")
        .update({ status: "cancelled", current_step: "Cancelled", updated_at: new Date().toISOString() })
        .eq("id", id);
    }
    return NextResponse.json({ ok: true, status: "cancelled" });
  }
  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const r = await ownedJob(id);
  if (r.error) return r.error;
  await getSupabaseAdminClient().from("generation_jobs").delete().eq("id", id);
  return NextResponse.json({ ok: true });
}
