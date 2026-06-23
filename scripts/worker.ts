/**
 * Optional background job worker (future resilience).
 *
 *   npm run worker
 *
 * The web server already runs jobs in-process (Option 1). Running this separate
 * worker ADDS restart resilience: it reclaims jobs stuck in 'processing' (e.g.
 * after a web restart) and picks up any 'queued' jobs. Job claiming is atomic
 * (queued → processing), so the worker and the web server never double-run a job.
 * Safe to run zero or one instance.
 */

import { getSupabaseAdminClient } from "../lib/supabase/admin";
import { runJob } from "../lib/jobs/job-runner";
import { reclaimStaleJobs } from "../lib/jobs/job-progress";

const POLL_MS = Number(process.env.WORKER_POLL_MS) || 5000;
const STALE_MIN = Number(process.env.WORKER_STALE_MIN) || 10;
const MAX_CONCURRENT = Number(process.env.WORKER_CONCURRENCY) || 2;

let active = 0;

async function tick(): Promise<void> {
  const stale = await reclaimStaleJobs(STALE_MIN);
  if (stale.length) console.log(`[worker] recovered ${stale.length} stale job(s)`);

  const slots = MAX_CONCURRENT - active;
  if (slots <= 0) return;

  const { data } = await getSupabaseAdminClient()
    .from("generation_jobs")
    .select("id, title")
    .eq("status", "queued")
    .order("created_at", { ascending: true })
    .limit(slots);

  for (const row of (data ?? []) as Array<{ id: string; title: string | null }>) {
    active++;
    console.log(`[worker] running job ${row.id} (${row.title ?? "?"})`);
    void runJob(row.id)
      .catch((e) => console.error(`[worker] job ${row.id} failed:`, e))
      .finally(() => {
        active--;
      });
  }
}

async function main(): Promise<void> {
  console.log(`[worker] started — poll ${POLL_MS}ms, concurrency ${MAX_CONCURRENT}, stale ${STALE_MIN}min`);
  await tick().catch((e) => console.error("[worker] tick error:", e));
  setInterval(() => {
    tick().catch((e) => console.error("[worker] tick error:", e));
  }, POLL_MS);
}

main();
