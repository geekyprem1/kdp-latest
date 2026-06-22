import Link from "next/link";
import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { JOB_STEPS } from "@/lib/jobs/job-progress";
import { BOOK_TYPE_LABELS, type BookType } from "@/lib/opportunity";
import { AutoRefresh } from "@/components/dashboard/auto-refresh";
import { JobActions } from "@/components/dashboard/job-actions";

export const dynamic = "force-dynamic";

export default async function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const { data: job } = await supabase
    .from("generation_jobs")
    .select("id, book_id, job_type, status, progress, current_step, error_message, title, created_at, completed_at")
    .eq("id", id)
    .single();
  if (!job) notFound();

  const steps = JOB_STEPS[job.job_type] ?? [];
  const active = job.status === "queued" || job.status === "processing";
  const failed = job.status === "failed";

  return (
    <div className="mx-auto max-w-2xl">
      <AutoRefresh active={active} />
      <Link href="/dashboard/in-progress" className="text-sm text-neutral-500 hover:underline">← Book In Progress</Link>
      <h1 className="mt-1 text-2xl font-bold">{job.title || "Untitled"}</h1>
      <p className="text-sm text-neutral-500">
        {BOOK_TYPE_LABELS[job.job_type as BookType] ?? job.job_type} · {job.status} · {new Date(job.created_at).toLocaleString()}
      </p>

      {active && (
        <div className="mt-5">
          <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-100">
            <div className="h-full bg-neutral-900 transition-all" style={{ width: `${job.progress}%` }} />
          </div>
          <div className="mt-1 text-xs text-neutral-500">{job.current_step ?? "Working…"} · {job.progress}%</div>
        </div>
      )}
      {failed && job.error_message && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{job.error_message}</div>
      )}

      <h2 className="mt-6 text-sm font-semibold text-neutral-700">Timeline</h2>
      <ol className="mt-3 space-y-2">
        {steps.map((s) => {
          const done = job.status === "completed" || job.progress >= s.at;
          const current = !done && active && job.progress < s.at;
          return (
            <li key={s.label} className="flex items-center gap-2 text-sm">
              <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[11px] ${done ? "bg-green-600 text-white" : current ? "bg-amber-400 text-white" : "bg-neutral-200 text-neutral-500"}`}>
                {done ? "✓" : ""}
              </span>
              <span className={done ? "text-neutral-800" : "text-neutral-500"}>{s.label}</span>
            </li>
          );
        })}
      </ol>

      <div className="mt-6">
        <JobActions jobId={job.id} status={job.status} bookId={job.book_id} />
      </div>
    </div>
  );
}
