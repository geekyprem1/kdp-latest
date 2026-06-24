import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { recoverQueuedJobs } from "@/lib/jobs/job-queue";
import { BOOK_TYPE_LABELS, type BookType } from "@/lib/opportunity";
import { AutoRefresh } from "@/components/dashboard/auto-refresh";
import { ActiveProgress } from "@/components/dashboard/active-progress";
import { JobActions } from "@/components/dashboard/job-actions";

export const dynamic = "force-dynamic";

interface JobRow {
  id: string;
  book_id: string | null;
  job_type: string;
  status: string;
  progress: number;
  current_step: string | null;
  error_message: string | null;
  title: string | null;
  created_at: string;
}

const BADGE: Record<string, string> = {
  completed: "bg-green-100 text-green-800",
  processing: "bg-blue-100 text-blue-800",
  queued: "bg-neutral-100 text-neutral-700",
  failed: "bg-amber-100 text-amber-800",
  cancelled: "bg-neutral-100 text-neutral-600",
};

const BADGE_LABEL: Record<string, string> = {
  failed: "Needs Attention",
};

export default async function InProgressPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) await recoverQueuedJobs(user.id); // best-effort restart recovery

  const { data } = await supabase
    .from("generation_jobs")
    .select("id, book_id, job_type, status, progress, current_step, error_message, title, created_at")
    .order("created_at", { ascending: false })
    .limit(50);
  const jobs = (data ?? []) as JobRow[];
  const active = jobs.some((j) => j.status === "queued" || j.status === "processing");

  return (
    <div className="mx-auto max-w-3xl">
      <AutoRefresh active={active} />
      <h1 className="text-2xl font-bold">Production Queue</h1>
      <p className="mt-1 text-sm text-neutral-600">
        Track books being generated in the background — you can leave and come back.
        Completed books appear in your Publishing Vault™ automatically.
      </p>

      {jobs.length === 0 ? (
        <p className="mt-8 text-sm text-neutral-500">
          No jobs yet. <Link href="/dashboard/create" className="underline">Create a book</Link>.
        </p>
      ) : (
        <ul className="mt-6 space-y-3">
          {jobs.map((j) => (
            <li key={j.id} className="rounded-lg border border-neutral-200 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <Link href={`/dashboard/in-progress/${j.id}`} className="font-medium hover:underline">
                    {j.title || "Untitled"}
                  </Link>
                  <div className="text-xs text-neutral-500">
                    {BOOK_TYPE_LABELS[j.job_type as BookType] ?? j.job_type} · {new Date(j.created_at).toLocaleString()}
                  </div>
                </div>
                <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${BADGE[j.status] ?? ""}`}>{BADGE_LABEL[j.status] ?? j.status}</span>
              </div>

              {(j.status === "queued" || j.status === "processing") && (
                <ActiveProgress progress={j.progress} currentStep={j.current_step} />
              )}
              {j.status === "failed" && j.error_message && (
                <p className="mt-2 text-xs text-red-600">{j.error_message}</p>
              )}

              <div className="mt-3">
                <JobActions jobId={j.id} status={j.status} bookId={j.book_id} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
