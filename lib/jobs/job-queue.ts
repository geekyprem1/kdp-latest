/**
 * In-process job queue (Option 1: same-server background execution).
 *
 * `enqueue` creates the job row and kicks off `runJob` fire-and-forget — the API
 * returns immediately while generation continues in the server process. State
 * lives in the DB so the user can leave/refresh/log out and come back. A
 * `running` set prevents double-execution within one process; `recoverQueuedJobs`
 * re-kicks jobs that were queued but never started (e.g. just before a restart).
 *
 * To move to a durable worker / Trigger.dev later, only this file changes.
 */

import { getSupabaseAdminClient } from "../supabase/admin";
import { reserve, InsufficientCreditsError } from "../billing";
import { runJob } from "./job-runner";

const running = new Set<string>();

export interface CreateJobInput {
  jobType: string;
  bookType: string;
  title: string;
  input: Record<string, unknown>;
}

export async function createJob(userId: string, opts: CreateJobInput): Promise<string> {
  const { data, error } = await getSupabaseAdminClient()
    .from("generation_jobs")
    .insert({
      user_id: userId,
      job_type: opts.jobType,
      book_type: opts.bookType,
      title: opts.title,
      input: opts.input,
      status: "queued",
      progress: 0,
    })
    .select("id")
    .single();
  if (error || !data) throw new Error(error?.message ?? "could not create job");
  return data.id as string;
}

export function startJob(jobId: string): void {
  if (running.has(jobId)) return;
  running.add(jobId);
  void runJob(jobId)
    .catch((e) => console.error(`job ${jobId} crashed:`, e))
    .finally(() => running.delete(jobId));
}

export async function enqueue(userId: string, opts: CreateJobInput): Promise<string> {
  const jobId = await createJob(userId, opts);
  startJob(jobId);
  return jobId;
}

export function isRunning(jobId: string): boolean {
  return running.has(jobId);
}

/** Re-kick queued jobs that aren't currently running (best-effort recovery). */
export async function recoverQueuedJobs(userId: string): Promise<void> {
  const { data } = await getSupabaseAdminClient()
    .from("generation_jobs")
    .select("id")
    .eq("user_id", userId)
    .eq("status", "queued");
  for (const row of (data ?? []) as Array<{ id: string }>) {
    if (!running.has(row.id)) startJob(row.id);
  }
}

export interface RetryResult {
  ok: boolean;
  error?: "not_found" | "already_active" | "insufficient_credits";
}

/**
 * Reset a job to queued and run it again (retry).
 * A retry is a fresh generation attempt, so it MUST reserve credits again (H1) and
 * reset the idempotent refund guard so this attempt can refund exactly once on
 * failure. Without this, repeated failed retries would refund credits with no
 * matching reserve (credit inflation), and a fail→retry→success could yield a free
 * book.
 */
export async function retryJob(jobId: string): Promise<RetryResult> {
  const admin = getSupabaseAdminClient();
  const { data: job } = await admin
    .from("generation_jobs")
    .select("id, user_id, status, input")
    .eq("id", jobId)
    .single();
  if (!job) return { ok: false, error: "not_found" };
  if (job.status === "queued" || job.status === "processing") return { ok: false, error: "already_active" };

  const cost = Number((job.input as Record<string, unknown> | null)?._cost) || 0;
  if (cost > 0) {
    try {
      await reserve(job.user_id as string, cost, "job", jobId);
    } catch (e) {
      if (e instanceof InsufficientCreditsError) return { ok: false, error: "insufficient_credits" };
      throw e;
    }
  }

  await admin
    .from("generation_jobs")
    .update({ status: "queued", progress: 0, current_step: null, error_message: null, credits_refunded: false, updated_at: new Date().toISOString() })
    .eq("id", jobId);
  startJob(jobId);
  return { ok: true };
}
