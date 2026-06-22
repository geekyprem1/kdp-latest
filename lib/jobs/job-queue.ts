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

/** Reset a job to queued and run it again (retry). */
export async function retryJob(jobId: string): Promise<void> {
  await getSupabaseAdminClient()
    .from("generation_jobs")
    .update({ status: "queued", progress: 0, current_step: null, error_message: null, updated_at: new Date().toISOString() })
    .eq("id", jobId);
  startJob(jobId);
}
