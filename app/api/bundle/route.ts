import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { isStorageConfigured } from "@/lib/storage";
import { analyzeTopic } from "@/lib/ai";
import { generateAndStoreBook, type PipelineBookType } from "@/lib/books/pipeline";
import { costFor, reserve, refund, recordUsage } from "@/lib/billing";
import { assertFeature, billingErrorResponse } from "@/lib/billing/guard";
import { rateLimit, rateLimitResponse } from "@/lib/util/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const PUZZLE_TYPES: PipelineBookType[] = ["word_search", "sudoku", "maze", "coloring"];
const DEFAULT_COUNT: Record<PipelineBookType, number> = { word_search: 25, sudoku: 30, maze: 30, coloring: 24 };

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const rl = rateLimit(`bundle:${user.id}`, 4);
  if (!rl.ok) return rateLimitResponse(rl.retryAfterSec);
  if (!isStorageConfigured()) return NextResponse.json({ error: "Storage is not configured." }, { status: 503 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const topic = typeof body.topic === "string" ? body.topic.trim() : "";
  if (!topic) return NextResponse.json({ error: "Topic is required" }, { status: 400 });
  const audience = typeof body.audience === "string" ? body.audience.trim() : undefined;
  const difficulty = typeof body.difficulty === "string" ? body.difficulty : "medium";
  const bundleSize = Math.min(4, Math.max(2, Number(body.bundleSize) || 4));

  const costOf = (t: PipelineBookType) => costFor(t, { count: DEFAULT_COUNT[t] });
  const explicitTypes = Array.isArray(body.types) && body.types.length
    ? (body.types as string[]).filter((t): t is PipelineBookType => PUZZLE_TYPES.includes(t as PipelineBookType))
    : null;

  // ── PAYWALL BEFORE ANY AI (M1) ──
  // Gate the feature and reserve credits BEFORE calling the Opportunity Engine, so a
  // user can never trigger an OpenRouter call without paying first. For auto-selection
  // we don't yet know the exact mix, so we reserve the worst-case cost for the bundle
  // size and refund the unused difference once the real composition is chosen.
  const provisionalCost = explicitTypes && explicitTypes.length
    ? explicitTypes.reduce((s, t) => s + costOf(t), 0)
    : [...PUZZLE_TYPES].map(costOf).sort((a, b) => b - a).slice(0, bundleSize).reduce((s, c) => s + c, 0);
  try {
    await assertFeature(user.id, "factory");
    await reserve(user.id, provisionalCost, "bundle");
  } catch (e) {
    const r = billingErrorResponse(e);
    if (r) return r;
    throw e;
  }

  // ── now safe to call the Opportunity Engine ──
  const analysis = await analyzeTopic({ topic, audience });
  const fitOf = (t: PipelineBookType) => analysis.types.find((x) => x.type === t)?.fit ?? 0;

  let selected: PipelineBookType[];
  if (explicitTypes && explicitTypes.length) {
    selected = explicitTypes;
  } else {
    selected = [...PUZZLE_TYPES].sort((a, b) => fitOf(b) - fitOf(a)).slice(0, bundleSize);
  }
  if (selected.length === 0) selected = PUZZLE_TYPES.slice(0, bundleSize);

  const costByType = Object.fromEntries(selected.map((t) => [t, costOf(t)])) as Record<PipelineBookType, number>;
  const plannedCost = selected.reduce((s, t) => s + costByType[t], 0);
  // Refund any over-reservation (auto-selection chose a cheaper mix than worst-case).
  if (provisionalCost > plannedCost) await refund(user.id, provisionalCost - plannedCost, "bundle");

  const admin = getSupabaseAdminClient();
  const { data: bundle, error: bErr } = await admin
    .from("bundles")
    .insert({ user_id: user.id, topic, audience: audience ?? null, difficulty, book_types: selected, opportunity: analysis, status: "generating" })
    .select("id")
    .single();
  if (bErr || !bundle) return NextResponse.json({ error: "Could not create bundle" }, { status: 500 });
  const bundleId = bundle.id as string;

  // ── generate each book via the shared pipeline (existing generators) ──
  const books: Array<{ type: PipelineBookType; id?: string; title?: string; status: "completed" | "failed"; error?: string }> = [];
  for (const type of selected) {
    try {
      const r = await generateAndStoreBook(
        user.id,
        { bookType: type, theme: topic, difficulty, count: DEFAULT_COUNT[type] },
        { opportunity: analysis, bundleId }
      );
      books.push({ type, id: r.id, title: r.title, status: "completed" });
      await recordUsage(user.id, type, costByType[type], "completed", r.id, { topic });
    } catch (err) {
      console.error(`bundle book ${type} failed:`, err);
      books.push({ type, status: "failed", error: (err as Error).message });
      await refund(user.id, costByType[type]); // give back the failed book's credits
      await recordUsage(user.id, type, costByType[type], "failed", undefined, { topic });
    }
  }

  const okCount = books.filter((b) => b.status === "completed").length;
  const status = okCount === books.length ? "completed" : okCount === 0 ? "failed" : "partial";
  await admin.from("bundles").update({ status }).eq("id", bundleId);

  const recommendedOrder = [...selected].sort((a, b) => fitOf(b) - fitOf(a));

  return NextResponse.json({
    id: bundleId,
    topic,
    status,
    books,
    recommendedOrder,
    opportunity: { opportunity: analysis.opportunity, band: analysis.band, factors: analysis.factors },
  });
}
