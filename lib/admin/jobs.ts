/**
 * Admin job monitoring. Reuses the existing in-process job queue (retryJob).
 */

import { getSupabaseAdminClient } from "../supabase/admin";
import { retryJob } from "../jobs/job-queue";
import { logAdminAction } from "./audit";
import type { AdminIdentity } from "./roles";

export interface AdminJobRow {
  id: string;
  user_id: string;
  user_email: string | null;
  job_type: string;
  status: string;
  progress: number;
  current_step: string | null;
  error_message: string | null;
  title: string | null;
  created_at: string;
}

export async function listJobs(opts: { status?: string; limit?: number } = {}): Promise<AdminJobRow[]> {
  const admin = getSupabaseAdminClient();
  let q = admin
    .from("generation_jobs")
    .select("id, user_id, job_type, status, progress, current_step, error_message, title, created_at, profiles(email)")
    .order("created_at", { ascending: false })
    .limit(opts.limit ?? 100);
  if (opts.status?.trim()) q = q.eq("status", opts.status.trim());

  const { data } = await q;
  return ((data ?? []) as unknown as Array<Record<string, unknown> & { profiles: { email: string } | { email: string }[] | null }>).map((r) => {
    const p = Array.isArray(r.profiles) ? r.profiles[0] : r.profiles;
    return {
      id: r.id as string,
      user_id: r.user_id as string,
      user_email: p?.email ?? null,
      job_type: r.job_type as string,
      status: r.status as string,
      progress: (r.progress as number) ?? 0,
      current_step: (r.current_step as string) ?? null,
      error_message: (r.error_message as string) ?? null,
      title: (r.title as string) ?? null,
      created_at: r.created_at as string,
    };
  });
}

export async function adminRetryJob(actor: AdminIdentity, jobId: string): Promise<void> {
  await retryJob(jobId);
  await logAdminAction(actor, "retry_job", { targetType: "job", targetId: jobId });
}

export async function adminDeleteJob(actor: AdminIdentity, jobId: string): Promise<void> {
  await getSupabaseAdminClient().from("generation_jobs").delete().eq("id", jobId);
  await logAdminAction(actor, "delete_job", { targetType: "job", targetId: jobId });
}
