/**
 * Admin audit log — records every privileged admin action. Append-only; read in
 * /admin/audit. Inserts use the service-role client (RLS allows admin read only).
 */

import { getSupabaseAdminClient } from "../supabase/admin";
import type { AdminIdentity } from "./roles";

export type AdminAction =
  | "grant_credits"
  | "remove_credits"
  | "change_plan"
  | "refund"
  | "suspend"
  | "ban"
  | "unban"
  | "soft_delete"
  | "restore_user"
  | "set_role"
  | "retry_job"
  | "delete_job"
  | "delete_book"
  | "ticket_reply"
  | "ticket_status";

export type AdminTargetType = "user" | "job" | "book" | "ticket" | "subscription";

export async function logAdminAction(
  actor: AdminIdentity,
  action: AdminAction,
  opts: { targetType?: AdminTargetType; targetId?: string; detail?: Record<string, unknown> } = {}
): Promise<void> {
  try {
    await getSupabaseAdminClient().from("admin_audit_log").insert({
      actor_id: actor.userId,
      actor_email: actor.email,
      action,
      target_type: opts.targetType ?? null,
      target_id: opts.targetId ?? null,
      detail: opts.detail ?? {},
    });
  } catch (e) {
    // Auditing must never break the action it records — log and continue.
    console.error("[admin] audit log failed:", e);
  }
}
