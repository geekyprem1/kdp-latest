/**
 * Job runner — executes one generation job by dispatching to the existing
 * pipelines (generators unchanged) with progress + error handling. Loads the job
 * from the DB so it works for fresh runs, retries, and recovery alike.
 */

import { getSupabaseAdminClient } from "../supabase/admin";
import { generateAndStoreBook, type PipelineBookType } from "../books/pipeline";
import { generateAndStoreEbook } from "../books/ebook-pipeline";
import { claimJob, markCompleted, markFailed, progressUpdater } from "./job-progress";

interface JobRow {
  id: string;
  user_id: string;
  job_type: string;
  status: string;
  input: Record<string, unknown> | null;
}

export async function runJob(jobId: string): Promise<void> {
  const { data: job } = await getSupabaseAdminClient()
    .from("generation_jobs")
    .select("id, user_id, job_type, status, input")
    .eq("id", jobId)
    .single();
  const j = job as JobRow | null;
  if (!j) return;

  // Atomic claim: only the winner (web process OR worker) proceeds.
  if (!(await claimJob(jobId))) return;
  const onProgress = progressUpdater(jobId);
  const input = (j.input ?? {}) as Record<string, unknown>;

  try {
    let bookId: string;
    if (j.job_type === "ebook") {
      const r = await generateAndStoreEbook(
        j.user_id,
        {
          topic: (input.theme as string) ?? (input.topic as string),
          audience: input.audience as string | undefined,
          tone: input.tone as string | undefined,
          chapterCount: input.chapterCount as number | undefined,
          targetWords: input.targetWords as number | undefined,
          title: input.title as string | undefined,
        },
        { opportunity: input.opportunity, onProgress }
      );
      bookId = r.id;
    } else {
      const r = await generateAndStoreBook(
        j.user_id,
        {
          bookType: j.job_type as PipelineBookType,
          theme: input.theme as string | undefined,
          title: input.title as string | undefined,
          difficulty: input.difficulty as string | undefined,
          count: input.count as number | undefined,
          ageGroup: input.ageGroup as string | undefined,
          style: input.style as string | undefined,
        },
        { opportunity: input.opportunity, onProgress }
      );
      bookId = r.id;
    }
    await markCompleted(jobId, bookId);
  } catch (err) {
    await markFailed(jobId, (err as Error).message);
  }
}
