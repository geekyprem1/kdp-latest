import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { BOOK_TYPE_LABELS, type BookType } from "@/lib/opportunity";

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
  const [{ count: bookCount }, { count: downloadCount }, { data: recentData }] = await Promise.all([
    supabase.from("books").select("*", { count: "exact", head: true }),
    supabase.from("downloads").select("*", { count: "exact", head: true }),
    supabase
      .from("books")
      .select("id, title, book_type, status, created_at")
      .order("created_at", { ascending: false })
      .limit(5),
  ]);
  const recent = (recentData ?? []) as RecentBook[];

  const typeLabel = (t: string) => BOOK_TYPE_LABELS[t as BookType] ?? t;
  const bookHref = (b: RecentBook) =>
    b.book_type === "ebook" ? `/dashboard/ebook/${b.id}` : "/dashboard/books";

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-bold">Welcome back</h1>
      <p className="mt-1 text-sm text-neutral-600">
        Your AI KDP publishing suite — research niches, then generate puzzle books,
        coloring books, and ebooks in minutes.
      </p>

      {/* stats */}
      <div className="mt-6 grid grid-cols-2 gap-4">
        <div className="rounded-lg border border-neutral-200 p-5">
          <div className="text-3xl font-bold">{bookCount ?? 0}</div>
          <div className="text-sm text-neutral-500">Books created</div>
        </div>
        <div className="rounded-lg border border-neutral-200 p-5">
          <div className="text-3xl font-bold">{downloadCount ?? 0}</div>
          <div className="text-sm text-neutral-500">Downloads</div>
        </div>
      </div>

      {/* primary actions */}
      <div className="mt-6 flex flex-wrap gap-3">
        <Link href="/dashboard/create" className="rounded bg-neutral-900 px-5 py-2.5 text-sm font-medium text-white">
          + Create a Book
        </Link>
        <Link href="/dashboard/niche" className="rounded border border-neutral-300 px-5 py-2.5 text-sm font-medium">
          Niche Research &amp; Opportunity Engine
        </Link>
      </div>

      {/* available generators */}
      <div className="mt-6 rounded-lg border border-neutral-200 p-5">
        <h2 className="text-sm font-semibold text-neutral-700">Available book types</h2>
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
          Every type is created through the Create Book wizard: topic → Opportunity
          Score &amp; recommended type → configure → generate (PDF, plus EPUB/DOCX
          for ebooks).
        </p>
      </div>

      {/* recent books */}
      <div className="mt-6">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-neutral-700">Recent books</h2>
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
