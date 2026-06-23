import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { BOOK_TYPE_LABELS, type BookType } from "@/lib/opportunity";
import { WorkflowBanner } from "@/components/dashboard/workflow-banner";

export const dynamic = "force-dynamic";

const GENERATORS: BookType[] = ["word_search", "sudoku", "maze", "coloring", "ebook"];

interface RecentBook {
  id: string;
  title: string;
  book_type: string;
  status: string;
  created_at: string;
}

export default async function DashboardHome() {
  const supabase = await createSupabaseServerClient();
  const weekAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
  const dayAgo = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const [
    { count: bookCount },
    { count: downloadCount },
    { count: inProgressCount },
    { count: completedWeek },
    { data: recentData },
    { data: readyData },
  ] = await Promise.all([
    supabase.from("books").select("*", { count: "exact", head: true }),
    supabase.from("downloads").select("*", { count: "exact", head: true }),
    supabase.from("generation_jobs").select("*", { count: "exact", head: true }).in("status", ["queued", "processing"]),
    supabase.from("generation_jobs").select("*", { count: "exact", head: true }).eq("status", "completed").gte("completed_at", weekAgo),
    supabase.from("books").select("id, title, book_type, status, created_at").order("created_at", { ascending: false }).limit(5),
    supabase.from("generation_jobs").select("id, title, book_id").eq("status", "completed").gte("completed_at", dayAgo).order("completed_at", { ascending: false }).limit(3),
  ]);
  const recent = (recentData ?? []) as RecentBook[];
  const ready = (readyData ?? []) as Array<{ id: string; title: string | null; book_id: string | null }>;

  const Stat = ({ value, label, href }: { value: number; label: string; href?: string }) => {
    const inner = (
      <div className="rounded-lg border border-neutral-200 p-5 hover:bg-neutral-50">
        <div className="text-3xl font-bold">{value}</div>
        <div className="text-sm text-neutral-500">{label}</div>
      </div>
    );
    return href ? <Link href={href}>{inner}</Link> : inner;
  };

  const typeLabel = (t: string) => BOOK_TYPE_LABELS[t as BookType] ?? t;
  const bookHref = (b: RecentBook) =>
    b.book_type === "ebook" ? `/dashboard/ebook/${b.id}` : "/dashboard/books";

  const firstTime = (bookCount ?? 0) === 0 && (inProgressCount ?? 0) === 0;

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-bold">Your publishing dashboard</h1>
      <p className="mt-1 text-sm text-neutral-600">
        One platform for the whole workflow — research, create, package, and launch
        Amazon KDP books.
      </p>

      {/* workflow */}
      <div className="mt-5">
        <WorkflowBanner />
      </div>

      {/* onboarding (first-time) */}
      {firstTime && (
        <div className="mt-5 rounded-xl border border-neutral-900 bg-neutral-900 p-5 text-white">
          <h2 className="text-base font-semibold">Welcome — let&apos;s publish your first book</h2>
          <ol className="mt-2 space-y-1 text-sm text-neutral-200">
            <li>1. <b>Research</b> a profitable niche in Market Intelligence™</li>
            <li>2. <b>Create</b> it in the Publishing Studio (or whole bundles in the Publishing Factory™)</li>
            <li>3. <b>Package</b> a Launch Kit™ — metadata, keywords, categories &amp; checklist</li>
            <li>4. <b>Publish</b> the KDP-ready PDFs to Amazon</li>
          </ol>
          <div className="mt-4 flex gap-3">
            <Link href="/dashboard/niche" className="rounded bg-white px-4 py-2 text-sm font-medium text-neutral-900">Start with research</Link>
            <Link href="/dashboard/create" className="rounded border border-neutral-600 px-4 py-2 text-sm font-medium text-white">Open Publishing Studio</Link>
          </div>
        </div>
      )}

      {/* completion notifications */}
      {ready.length > 0 && (
        <div className="mt-5 space-y-2">
          {ready.map((r) => (
            <Link
              key={r.id}
              href={r.book_id ? `/dashboard/books/${r.book_id}` : `/dashboard/in-progress/${r.id}`}
              className="block rounded-lg border border-green-300 bg-green-50 px-4 py-2.5 text-sm text-green-800 hover:bg-green-100"
            >
              ✓ Your “{r.title ?? "book"}” is ready.
            </Link>
          ))}
        </div>
      )}

      {/* stats */}
      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat value={bookCount ?? 0} label="Books created" />
        <Stat value={downloadCount ?? 0} label="Downloads" />
        <Stat value={inProgressCount ?? 0} label="Books in progress" href="/dashboard/in-progress" />
        <Stat value={completedWeek ?? 0} label="Completed this week" />
      </div>

      {/* primary actions */}
      <div className="mt-6 flex flex-wrap gap-3">
        <Link href="/dashboard/create" className="rounded bg-neutral-900 px-5 py-2.5 text-sm font-medium text-white">
          Open Publishing Studio
        </Link>
        <Link href="/dashboard/niche" className="rounded border border-neutral-300 px-5 py-2.5 text-sm font-medium">
          Market Intelligence™
        </Link>
        <Link href="/dashboard/bundle" className="rounded border border-neutral-300 px-5 py-2.5 text-sm font-medium">
          Publishing Factory™
        </Link>
      </div>

      {/* available generators */}
      <div className="mt-6 rounded-lg border border-neutral-200 p-5">
        <h2 className="text-sm font-semibold text-neutral-700">Book types in the Publishing Studio</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {GENERATORS.map((g) => (
            <Link
              key={g}
              href="/dashboard/create"
              className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-medium text-neutral-700 hover:bg-neutral-200"
            >
              {BOOK_TYPE_LABELS[g]}
            </Link>
          ))}
          <span className="rounded-full bg-neutral-50 px-3 py-1 text-xs font-medium text-neutral-400">
            Story Book (coming soon)
          </span>
        </div>
        <p className="mt-3 text-xs text-neutral-500">
          Created in the Publishing Studio: topic → Market Intelligence™ score &amp;
          recommended type → configure → generate (PDF, plus EPUB/DOCX for ebooks).
        </p>
      </div>

      {/* recent books */}
      <div className="mt-6">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-neutral-700">Recent from your Publishing Library</h2>
          <Link href="/dashboard/books" className="text-xs text-neutral-500 hover:underline">View all →</Link>
        </div>
        {recent.length === 0 ? (
          <p className="mt-3 text-sm text-neutral-500">
            No books yet. <Link href="/dashboard/create" className="underline">Create your first one</Link>.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-neutral-100 rounded-lg border border-neutral-200">
            {recent.map((b) => (
              <li key={b.id}>
                <Link href={bookHref(b)} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-neutral-50">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{b.title}</div>
                    <div className="text-xs text-neutral-500">
                      {typeLabel(b.book_type)} · {new Date(b.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${
                    b.status === "completed" ? "bg-green-100 text-green-800" : b.status === "failed" ? "bg-red-100 text-red-800" : "bg-amber-100 text-amber-800"
                  }`}>
                    {b.status}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
