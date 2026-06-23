/**
 * Admin user management. Reuses the existing billing/credits system for all
 * money/credit movement (atomic RPCs) and only adds account-status flags on
 * profiles. Every mutating call records an admin_audit_log entry.
 */

import { getSupabaseAdminClient } from "../supabase/admin";
import { changePlan } from "../billing/subscription";
import { grant, removeCredits, refund } from "../billing/credits";
import type { PlanKey } from "../billing/plans";
import { logAdminAction } from "./audit";
import type { AdminIdentity, AccountStatus } from "./roles";

export interface AdminUserRow {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  account_status: string;
  created_at: string;
  plan_name: string | null;
  plan_type: string | null;
  credits_remaining: number | null;
  sub_status: string | null;
}

interface SubEmbed {
  plan_name: string;
  plan_type: string;
  credits_remaining: number;
  status: string;
}

/** List users with their subscription, newest first. Optional search/status filter. */
export async function listUsers(opts: { search?: string; status?: string; limit?: number } = {}): Promise<AdminUserRow[]> {
  const admin = getSupabaseAdminClient();
  let q = admin
    .from("profiles")
    .select("id, email, full_name, role, account_status, created_at, subscriptions(plan_name, plan_type, credits_remaining, status)")
    .order("created_at", { ascending: false })
    .limit(opts.limit ?? 100);

  if (opts.search?.trim()) q = q.ilike("email", `%${opts.search.trim()}%`);
  if (opts.status?.trim()) q = q.eq("account_status", opts.status.trim());

  const { data } = await q;
  return ((data ?? []) as unknown as Array<Record<string, unknown> & { subscriptions: SubEmbed[] | SubEmbed | null }>).map((r) => {
    const sub = Array.isArray(r.subscriptions) ? r.subscriptions[0] : r.subscriptions;
    return {
      id: r.id as string,
      email: r.email as string,
      full_name: (r.full_name as string) ?? null,
      role: (r.role as string) ?? "user",
      account_status: (r.account_status as string) ?? "active",
      created_at: r.created_at as string,
      plan_name: sub?.plan_name ?? null,
      plan_type: sub?.plan_type ?? null,
      credits_remaining: sub?.credits_remaining ?? null,
      sub_status: sub?.status ?? null,
    };
  });
}

export interface AdminUserDetail {
  profile: { id: string; email: string; full_name: string | null; role: string; account_status: string; status_reason: string | null; created_at: string };
  subscription: SubEmbed | null;
  bookCount: number;
  jobCount: number;
  recentBooks: Array<{ id: string; title: string; book_type: string; status: string; created_at: string }>;
  recentUsage: Array<{ id: string; action: string; credits: number; status: string; created_at: string }>;
  recentBilling: Array<{ id: string; action: string; detail: unknown; created_at: string }>;
  tickets: Array<{ id: string; subject: string; status: string; priority: string; created_at: string }>;
}

/** Full read-only "view-as" detail for one user. */
export async function getUserDetail(userId: string): Promise<AdminUserDetail | null> {
  const admin = getSupabaseAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("id, email, full_name, role, account_status, status_reason, created_at")
    .eq("id", userId)
    .single();
  if (!profile) return null;

  const [
    { data: sub },
    { count: bookCount },
    { count: jobCount },
    { data: recentBooks },
    { data: recentUsage },
    { data: recentBilling },
    { data: tickets },
  ] = await Promise.all([
    admin.from("subscriptions").select("plan_name, plan_type, credits_remaining, status").eq("user_id", userId).single(),
    admin.from("books").select("*", { count: "exact", head: true }).eq("user_id", userId),
    admin.from("generation_jobs").select("*", { count: "exact", head: true }).eq("user_id", userId),
    admin.from("books").select("id, title, book_type, status, created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(10),
    admin.from("usage_events").select("id, action, credits, status, created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(15),
    admin.from("billing_audit_log").select("id, action, detail, created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(15),
    admin.from("support_tickets").select("id, subject, status, priority, created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(10),
  ]);

  return {
    profile: profile as AdminUserDetail["profile"],
    subscription: (sub as SubEmbed) ?? null,
    bookCount: bookCount ?? 0,
    jobCount: jobCount ?? 0,
    recentBooks: (recentBooks ?? []) as AdminUserDetail["recentBooks"],
    recentUsage: (recentUsage ?? []) as AdminUserDetail["recentUsage"],
    recentBilling: (recentBilling ?? []) as AdminUserDetail["recentBilling"],
    tickets: (tickets ?? []) as AdminUserDetail["tickets"],
  };
}

// ── Account status (suspend / ban / soft-delete / restore) ──

async function setStatus(actor: AdminIdentity, userId: string, status: AccountStatus, reason: string | undefined, action: Parameters<typeof logAdminAction>[1]): Promise<void> {
  await getSupabaseAdminClient()
    .from("profiles")
    .update({ account_status: status, status_reason: reason ?? null, status_changed_at: new Date().toISOString() })
    .eq("id", userId);
  await logAdminAction(actor, action, { targetType: "user", targetId: userId, detail: { status, reason } });
}

export const suspendUser = (actor: AdminIdentity, userId: string, reason?: string) => setStatus(actor, userId, "suspended", reason, "suspend");
export const banUser = (actor: AdminIdentity, userId: string, reason?: string) => setStatus(actor, userId, "banned", reason, "ban");
export const softDeleteUser = (actor: AdminIdentity, userId: string, reason?: string) => setStatus(actor, userId, "deleted", reason, "soft_delete");
export const restoreUser = (actor: AdminIdentity, userId: string) => setStatus(actor, userId, "active", undefined, "restore_user");

/** Hard delete (super_admin only — enforced at the route). Cascades via auth.users FK. */
export async function hardDeleteUser(actor: AdminIdentity, userId: string): Promise<void> {
  await getSupabaseAdminClient().auth.admin.deleteUser(userId);
  await logAdminAction(actor, "soft_delete", { targetType: "user", targetId: userId, detail: { hard: true } });
}

// ── Credits / plan (reuse billing) ──

export async function adminGrantCredits(actor: AdminIdentity, userId: string, amount: number, reason = "admin_grant"): Promise<void> {
  await grant(userId, amount, reason);
  await logAdminAction(actor, "grant_credits", { targetType: "user", targetId: userId, detail: { amount, reason } });
}

export async function adminRemoveCredits(actor: AdminIdentity, userId: string, amount: number, reason = "admin_adjust"): Promise<void> {
  await removeCredits(userId, amount, reason);
  await logAdminAction(actor, "remove_credits", { targetType: "user", targetId: userId, detail: { amount, reason } });
}

export async function adminRefund(actor: AdminIdentity, userId: string, amount: number, note?: string): Promise<void> {
  await refund(userId, amount, note);
  await logAdminAction(actor, "refund", { targetType: "user", targetId: userId, detail: { amount, note } });
}

export async function adminChangePlan(actor: AdminIdentity, userId: string, planKey: PlanKey): Promise<void> {
  await changePlan(userId, planKey, { provider: "admin" });
  await logAdminAction(actor, "change_plan", { targetType: "user", targetId: userId, detail: { planKey } });
}
