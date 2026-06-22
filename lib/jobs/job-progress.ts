/**
 * Job progress + status helpers (service role). The single place that mutates a
 * generation_jobs row, plus the per-type step definitions used by the timeline UI.
 */

import { getSupabaseAdminClient } from "../supabase/admin";

export interface JobStep {
  label: string;
  at: number; // progress % at which this step is considered done
}

export const JOB_STEPS: Record<string, JobStep[]> = {
  word_search: [
    { label: "Metadata", at: 15 },
    { label: "Generating puzzles", at: 40 },
    { label: "Rendering PDF", at: 80 },
    { label: "Uploading assets", at: 95 },
    { label: "Complete", at: 100 },
  ],
  sudoku: [
    { label: "Metadata", at: 15 },
    { label: "Generating puzzles", at: 40 },
    { label: "Rendering PDF", at: 80 },
    { label: "Uploading assets", at: 95 },
    { label: "Complete", at: 100 },
  ],
  maze: [
    { label: "Metadata", at: 15 },
    { label: "Generating mazes", at: 40 },
    { label: "Rendering PDF", at: 80 },
    { label: "Uploading assets", at: 95 },
    { label: "Complete", at: 100 },
  ],
  coloring: [
    { label: "Metadata", at: 15 },
    { label: "Generating line art", at: 40 },
    { label: "Rendering PDF", at: 80 },
    { label: "Uploading assets", at: 95 },
    { label: "Complete", at: 100 },
  ],
  ebook: [
    { label: "Outline & chapters", at: 20 },
    { label: "Saving chapters", at: 75 },
    { label: "Finalizing", at: 95 },
    { label: "Complete", at: 100 },
  ],
  storybook: [
    { label: "Outline", at: 10 },
    { label: "Character bible", at: 20 },
    { label: "Illustrations", at: 60 },
    { label: "Render PDF", at: 85 },
    { label: "Upload assets", at: 95 },
    { label: "Complete", at: 100 },
  ],
};

export const ACTIVE_STATUSES = ["queued", "processing"] as const;

type JobPatch = {
  status?: string;
  progress?: number;
  current_step?: string;
  error_message?: string | null;
  book_id?: string | null;
  started_at?: string;
  completed_at?: string;
};

export async function updateJob(jobId: string, patch: JobPatch): Promise<void> {
  await getSupabaseAdminClient()
    .from("generation_jobs")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", jobId);
}

export async function markProcessing(jobId: string): Promise<void> {
  await updateJob(jobId, { status: "processing", progress: 5, current_step: "Starting", started_at: new Date().toISOString(), error_message: null });
}

export async function markCompleted(jobId: string, bookId: string): Promise<void> {
  await updateJob(jobId, { status: "completed", progress: 100, current_step: "Complete", book_id: bookId, completed_at: new Date().toISOString() });
}

export async function markFailed(jobId: string, message: string): Promise<void> {
  await updateJob(jobId, { status: "failed", current_step: "Failed", error_message: message.slice(0, 500) });
}

/** A progress callback bound to a job, passed into the pipelines. */
export function progressUpdater(jobId: string) {
  return (step: string, percent: number) => updateJob(jobId, { current_step: step, progress: percent });
}
