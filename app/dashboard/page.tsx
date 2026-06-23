import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getOrCreateSubscription } from "@/lib/billing";
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

interface ReadyJob {
  id: string;
  title: string | null;
  book_id: string | null;
  job_type: string;
}

export default async function DashboardHome() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  const dayAgo = new Date(Date.now() - 24 * 3600 * 1000).toISOString();

  const [
    sub,
    { count: bookCount },
    { count: downloadCount },
    { count: inProgressCount },
    { count: readyCount },
    { count: needsAttentionCount },
    { data: recentData },
    { data: readyData },
  ] = await Promise.all([
    user ? getOrCreateSubscription(user.id) : Promise.resolve(null),
    supabase.from("books").select("*", { count: "exact", head: true }),
    supabase.from("downloads").select("*", { count: "exact", head: true }),
    supabase.from("generation_jobs").select("*", { count: "exact", head: true }).in("status", ["queued", "processing"]),
    supabase.from("books").select("*", { count: "exact", head: true }).eq("status", "completed"),
    supabase.from("books").select("*", { count: "exact", head: true }).eq("status", "failed"),
    supabase.from("books").select("id, title, book_type, status, created_at").order("created_at", { ascending: false }).limit(5),
    supabase.from("generation_jobs").select("id, title, book_id, job_type").eq("status", "completed").gte("completed_at", dayAgo).order("completed_at", { ascending: false }).limit(3),
  ]);

  const recent = (recentData ?? []) as RecentBook[];
  const ready = (readyData ?? []) as ReadyJob[];

  const creditsRemaining = sub?.credits_remaining ?? 0;
  const planName = sub?.plan_name ?? "Free Trial";

  const isOnboarding = (bookCount ?? 0) < 3;

  const estWordSearch = creditsRemaining;
  const estEbookChapters = Math.floor(creditsRemaining / 2);
  const estColoring = Math.floor(creditsRemaining / 7);

  const typeLabel = (t: string) => BOOK_TYPE_LABELS[t as BookType] ?? t;
  const bookHref = (b: RecentBook) =>
    b.book_type === "ebook" ? `/dashboard/ebook/${b.id}` : `/dashboard/books/${b.id}`;

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-10">

      {/* ── Status bar ── */}
      <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-2 gap-y-3 gap-x-4 sm:grid-cols-4">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wide text-neutral-400">Current Plan</div>
            <div className="mt-0.5 text-sm font-bold text-neutral-900">{planName}</div>
          </div>
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wide text-neutral-400">Credits Remaining</div>
            <div className="mt-0.5 text-sm font-bold text-neutral-900">{creditsRemaining.toLocaleString()}</div>
          </div>
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wide text-neutral-400">Books Created</div>
            <div className="mt-0.5 text-sm font-bold text-neutral-900">{(bookCount ?? 0).toLocaleString()}</div>
          </div>
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wide text-neutral-400">Active Jobs</div>
            <div className="mt-0.5 text-sm font-bold text-neutral-900">{(inProgressCount ?? 0).toLocaleString()}</div>
          </div>
        </div>
      </div>

      {/* ── Title ── */}
      <div>
        <h1 className="text-2xl font-bold">KDP Mafia Command Center</h1>
        <p className="mt-1 text-sm text-neutral-600">
          Research niches, create books, package them, and launch faster on Amazon KDP.
        </p>
      </div>

      {/* ── Workflow strip ── */}
      <WorkflowBanner />

      {/* ── Success notifications ── */}
      {ready.length > 0 && (
        <div className="space-y-2">
          {ready.map((r) => (
            <div key={r.id} className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 shadow-sm">
              <div className="text-sm font-semibold text-green-800">
                🎉 Your book is ready — {r.title ?? "Untitled"}
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {r.book_id && r.job_type !== "ebook" && (
                  <a
                    href={`/api/books/${r.book_id}/download?part=interior`}
                    className="rounded bg-green-700 px-3 py-1 text-xs font-medium text-white hover:bg-green-800"
                  >
                    Download PDF
                  </a>
                )}
                <Link
                  href={r.book_id ? `/dashboard/books/${r.book_id}` : "/dashboard/books"}
                  className="rounded border border-green-600 px-3 py-1 text-xs font-medium text-green-800 hover:bg-green-100"
                >
                  Open Publishing Vault™
                </Link>
                {r.book_id && (
                  <Link
                    href={`/dashboard/books/${r.book_id}`}
                    className="rounded border border-green-600 px-3 py-1 text-xs font-medium text-green-800 hover:bg-green-100"
                  >
                    Generate Launch Kit™
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Onboarding steps (< 3 books) ── */}
      {isOnboarding && (
        <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h2 className="text-sm font-bold text-neutral-900">Getting Started</h2>
              <p className="mt-0.5 text-xs text-neutral-500">
                Follow these steps to build your first KDP publishing operation.
              </p>
            </div>
            <span className="shrink-0 rounded-full bg-neutral-100 px-2.5 py-0.5 text-[10px] font-semibold text-neutral-500">
              {[true, (bookCount ?? 0) > 0, (downloadCount ?? 0) > 0, false].filter(Boolean).length} / 4 complete
            </span>
          </div>
          <ol className="mt-4 space-y-2">
            {[
              {
                n: 1,
                label: "Research a profitable niche",
                sub: "Use Market Intelligence™ to find demand before you build",
                href: "/dashboard/niche",
                done: false,
              },
              {
                n: 2,
                label: "Create your first book",
                sub: "Word Search, Sudoku, Maze, Coloring Book, or Ebook",
                href: "/dashboard/create",
                done: (bookCount ?? 0) > 0,
              },
              {
                n: 3,
                label: "Generate a Launch Kit™",
                sub: "Metadata, keywords, categories & a KDP publish checklist",
                href: "/dashboard/books",
                done: (downloadCount ?? 0) > 0,
              },
              {
                n: 4,
                label: "Publish on Amazon KDP",
                sub: "Upload your KDP-ready PDFs to your KDP Bookshelf",
                href: "/dashboard/books",
                done: false,
              },
            ].map((step) => (
              <li key={step.n}>
                <Link href={step.href} className="flex items-start gap-3 rounded-lg px-2 py-2 hover:bg-neutral-50">
                  <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${step.done ? "bg-green-100 text-green-700" : "bg-neutral-900 text-white"}`}>
                    {step.done ? "✓" : step.n}
                  </span>
                  <div>
                    <div className={`text-sm font-medium leading-tight ${step.done ? "text-neutral-400 line-through" : "text-neutral-900"}`}>
                      {step.label}
                    </div>
                    <div className="text-xs text-neutral-400">{step.sub}</div>
                  </div>
                </Link>
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* ── Book Health + Credit Capacity ── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-neutral-700">Publishing Health</h2>
          <div className="mt-3 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-green-500" />
                <span className="text-xs text-neutral-600">Ready to Publish</span>
              </div>
              <span className="text-sm font-bold text-neutral-900">{readyCount ?? 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-amber-400" />
                <span className="text-xs text-neutral-600">Needs Attention</span>
              </div>
              <span className="text-sm font-bold text-neutral-900">{needsAttentionCount ?? 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-blue-400" />
                <span className="text-xs text-neutral-600">Processing</span>
              </div>
              <span className="text-sm font-bold text-neutral-900">{inProgressCount ?? 0}</span>
            </div>
          </div>
          <Link href="/dashboard/books" className="mt-4 block text-xs text-neutral-400 hover:text-neutral-600 hover:underline">
            Open Publishing Vault™ →
          </Link>
        </div>

        <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-neutral-700">Credit Capacity</h2>
          <div className="mt-1 text-2xl font-bold text-neutral-900">{creditsRemaining.toLocaleString()}</div>
          <div className="text-[11px] text-neutral-400">credits remaining on {planName}</div>
          {creditsRemaining > 0 ? (
            <div className="mt-3 space-y-1">
              <div className="text-[10px] font-semibold uppercase tracking-wide text-neutral-400">Approx. capacity</div>
              <div className="text-xs text-neutral-600">~{estWordSearch.toLocaleString()} Word Search books</div>
              <div className="text-xs text-neutral-600">~{estEbookChapters.toLocaleString()} Ebook chapters</div>
              <div className="text-xs text-neutral-600">~{estColoring.toLocaleString()} Coloring books</div>
            </div>
          ) : (
            <p className="mt-3 text-xs text-neutral-500">Upgrade your plan to generate more books.</p>
          )}
          <Link href="/dashboard/billing" className="mt-4 block text-xs text-neutral-400 hover:text-neutral-600 hover:underline">
            Manage plan →
          </Link>
        </div>
      </div>

      {/* ── Quick Actions ── */}
      <div>
        <h2 className="text-sm font-semibold text-neutral-700">Quick Actions</h2>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {[
            {
              title: "Launch Publishing Studio",
              desc: "Create KDP-ready books from your niche — Word Search, Sudoku, Maze, Coloring Book, or Ebook.",
              href: "/dashboard/create",
              cta: "Launch Studio",
              primary: true,
            },
            {
              title: "Open Market Intelligence™",
              desc: "Discover profitable niches before you build — scored for demand, competition & evergreen potential.",
              href: "/dashboard/niche",
              cta: "Research Niches",
              primary: false,
            },
            {
              title: "Generate a Cover",
              desc: "Create commercial-ready cover concepts with genre-aware AI scoring and KDP-ready exports.",
              href: "/dashboard/cover",
              cta: "Open Cover Studio",
              primary: false,
            },
            {
              title: "Create a Launch Kit™",
              desc: "Package metadata, keywords, categories & publish checklist into a KDP-ready ZIP file.",
              href: "/dashboard/books",
              cta: "Open Publishing Vault™",
              primary: false,
            },
          ].map((a) => (
            <div key={a.title} className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md">
              <div className="text-sm font-semibold text-neutral-900">{a.title}</div>
              <p className="mt-1 text-xs text-neutral-500 leading-relaxed">{a.desc}</p>
              <Link
                href={a.href}
                className={`mt-3 inline-block rounded px-4 py-1.5 text-xs font-medium transition-colors ${
                  a.primary
                    ? "bg-neutral-900 text-white hover:bg-neutral-700"
                    : "border border-neutral-300 text-neutral-700 hover:bg-neutral-50"
                }`}
              >
                {a.cta}
              </Link>
            </div>
          ))}
        </div>
      </div>

      {/* ── Recent Publishing Assets ── */}
      <div>
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-neutral-700">Recent Publishing Assets</h2>
          <Link href="/dashboard/books" className="text-xs text-neutral-400 hover:underline">
            Open Publishing Vault™ →
          </Link>
        </div>
        {recent.length === 0 ? (
          <p className="mt-3 text-sm text-neutral-500">
            No books yet.{" "}
            <Link href="/dashboard/create" className="underline">
              Launch Publishing Studio
            </Link>
            .
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-neutral-100 rounded-xl border border-neutral-200 shadow-sm">
            {recent.map((b) => (
              <li key={b.id}>
                <Link
                  href={bookHref(b)}
                  className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-neutral-50"
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{b.title}</div>
                    <div className="text-xs text-neutral-500">
                      {typeLabel(b.book_type)} · {new Date(b.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${
                    b.status === "completed"
                      ? "bg-green-100 text-green-800"
                      : b.status === "failed"
                      ? "bg-amber-100 text-amber-800"
                      : "bg-blue-100 text-blue-800"
                  }`}>
                    {b.status === "failed" ? "Needs Attention" : b.status}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* ── Book types in Publishing Studio ── */}
      <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-neutral-700">Publishing Studio — Available Book Types</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {GENERATORS.map((g) => (
            <Link
              key={g}
              href="/dashboard/create"
              className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-medium text-neutral-700 transition-colors hover:bg-neutral-200"
            >
              {BOOK_TYPE_LABELS[g]}
            </Link>
          ))}
          <span className="rounded-full bg-neutral-50 px-3 py-1 text-xs font-medium text-neutral-400">
            Story Book — coming soon
          </span>
        </div>
        <p className="mt-3 text-xs text-neutral-500">
          Every book includes an Opportunity Score, Launch Kit™ with metadata &amp; keywords, and KDP-ready PDF exports.
        </p>
      </div>
    </div>
  );
}
