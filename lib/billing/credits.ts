/**
 * Credit ledger — reserve / refund / grant + usage recording. Balance lives on
 * subscriptions.credits_remaining; credit_transactions is the audit ledger.
 */

import { getSupabaseAdminClient } from "../supabase/admin";
import { getOrCreateSubscription } from "./subscription";

export class InsufficientCreditsError extends Error {
  required: number;
  current: number;
  constructor(required: number, current: number) {
    super("Insufficient credits");
    this.name = "InsufficientCreditsError";
    this.required = required;
    this.current = current;
  }
}

export async function getBalance(userId: string): Promise<number> {
  return (await getOrCreateSubscription(userId)).credits_remaining;
}

async function adjust(
  userId: string,
  delta: number,
  reason: string,
  ref?: { type?: string; id?: string }
): Promise<number> {
  const admin = getSupabaseAdminClient();
  const sub = await getOrCreateSubscription(userId);
  const next = sub.credits_remaining + delta;
  await admin.from("subscriptions").update({ credits_remaining: next, updated_at: new Date().toISOString() }).eq("user_id", userId);
  await admin.from("credit_transactions").insert({
    user_id: userId, amount: delta, reason, balance_after: next, ref_type: ref?.type ?? null, ref_id: ref?.id ?? null,
  });
  return next;
}

/** Hold credits before a generation. Throws InsufficientCreditsError. */
export async function reserve(userId: string, cost: number, refType: string, refId?: string): Promise<void> {
  const balance = await getBalance(userId);
  if (balance < cost) throw new InsufficientCreditsError(cost, balance);
  await adjust(userId, -cost, "reserve", { type: refType, id: refId });
  await getSupabaseAdminClient().from("billing_audit_log").insert({ user_id: userId, action: "reserve", detail: { cost, refType, refId } });
}

/** Give reserved credits back (generation failed/partial). */
export async function refund(userId: string, cost: number, refId?: string): Promise<void> {
  if (cost <= 0) return;
  await adjust(userId, cost, "refund", { type: "refund", id: refId });
  await getSupabaseAdminClient().from("billing_audit_log").insert({ user_id: userId, action: "refund", detail: { cost, refId } });
}

/** Grant credits (launch bonus, promo, JVZoo bonus, manual). */
export async function grant(userId: string, amount: number, reason = "bonus"): Promise<void> {
  if (amount <= 0) return;
  await adjust(userId, amount, reason);
  await getSupabaseAdminClient().from("billing_audit_log").insert({ user_id: userId, action: "grant", detail: { amount, reason } });
}

/** Remove credits (admin/correction). */
export async function removeCredits(userId: string, amount: number, reason = "admin_adjust"): Promise<void> {
  if (amount <= 0) return;
  await adjust(userId, -amount, reason);
  await getSupabaseAdminClient().from("billing_audit_log").insert({ user_id: userId, action: "remove", detail: { amount, reason } });
}

/** Record a usage event (analytics + history). */
export async function recordUsage(
  userId: string,
  action: string,
  credits: number,
  status: "completed" | "failed" | "refunded",
  refId?: string,
  meta?: Record<string, unknown>
): Promise<void> {
  await getSupabaseAdminClient().from("usage_events").insert({
    user_id: userId, action, credits, status, ref_id: refId ?? null, meta: meta ?? {},
  });
}
