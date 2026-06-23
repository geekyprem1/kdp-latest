import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { changePlan, getProvider, PLANS, type PlanKey } from "@/lib/billing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Simulated plan activation. Real checkout is wired through a payment provider
 * later; today it runs the provider's (stub) validatePurchase then assigns the
 * plan + grants its credits. Provider-agnostic by design.
 */
export async function POST(req: NextRequest) {
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

  const plan = body.plan as PlanKey;
  if (!plan || !(plan in PLANS) || plan === "free") {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }

  const providerName = typeof body.provider === "string" ? body.provider : "none";
  const provider = getProvider(providerName);
  const check = await provider.validatePurchase({ userId: user.id, payload: { plan } });
  // Stub providers accept the plan from payload; live providers verify the receipt.
  const resolvedPlan = (check.plan ?? plan) as PlanKey;

  const sub = await changePlan(user.id, resolvedPlan, {
    provider: providerName,
    providerCustomerId: check.providerCustomerId,
    providerTransactionId: check.providerTransactionId,
  });

  return NextResponse.json({ ok: true, plan: sub.plan_name, creditsRemaining: sub.credits_remaining });
}
