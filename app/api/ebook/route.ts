import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isStorageConfigured } from "@/lib/storage";
import { enqueue } from "@/lib/jobs/job-queue";
import { costFor, reserve } from "@/lib/billing";
import { assertFeature, billingErrorResponse } from "@/lib/billing/guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Enqueue a background ebook generation job and return immediately. */
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

  const topic = typeof body.theme === "string" ? body.theme.trim() : typeof body.topic === "string" ? body.topic.trim() : "";
  if (!topic) return NextResponse.json({ error: "Topic is required" }, { status: 400 });
  const userTitle = typeof body.title === "string" ? body.title.trim() : "";

  const input = {
    theme: topic,
    title: userTitle || undefined,
    audience: typeof body.audience === "string" ? body.audience : undefined,
    tone: typeof body.tone === "string" ? body.tone : undefined,
    chapterCount: Number(body.chapterCount) || undefined,
    targetWords: Number(body.targetWords) || undefined,
    opportunity: body.opportunity && typeof body.opportunity === "object" ? body.opportunity : undefined,
  };

  const cost = costFor("ebook", { chapterCount: Number(body.chapterCount) || undefined });
  try {
    await assertFeature(user.id, "ebook");
    await reserve(user.id, cost, "job");
  } catch (e) {
    const r = billingErrorResponse(e);
    if (r) return r;
    throw e;
  }

  const jobId = await enqueue(user.id, {
    jobType: "ebook",
    bookType: "ebook",
    title: userTitle || topic,
    input: { ...input, _cost: cost, _action: "ebook" },
  });
  return NextResponse.json({ jobId, cost });
}
