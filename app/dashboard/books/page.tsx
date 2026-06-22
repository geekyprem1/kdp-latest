import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

interface BookRow {
  id: string;
  title: string;
  theme: string;
  book_type: string;
  status: string;
  difficulty: string;
  puzzle_count: number;
  page_count: number | null;
  word_source: string | null;
  created_at: string;
  book_metadata: { subtitle: string | null; keywords: string[] | null } | null;
}

export default async function MyBooksPage() {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("books")
    .select("*, book_metadata(subtitle, keywords)")
    .order("created_at", { ascending: false });

  const books = (data ?? []) as unknown as BookRow[];

  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">My Books</h1>
        <Link href="/dashboard/create" className="rounded bg-neutral-900 px-4 py-2 text-sm font-medium text-white">
          + Create Book
        </Link>
      </div>

      {books.length === 0 ? (
        <p className="mt-8 text-sm text-neutral-500">
          No books yet. <Link href="/dashboard/create" className="underline">Create your first one</Link>.
        </p>
      ) : (
        <ul className="mt-6 space-y-3">
          {books.map((b) => (
            <li key={b.id} className="rounded-lg border border-neutral-200 p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="font-semibold">{b.title}</h2>
                  {b.book_metadata?.subtitle && (
                    <p className="text-sm text-neutral-600">{b.book_metadata.subtitle}</p>
                  )}
                  <p className="mt-1 text-xs text-neutral-500">
                    {b.theme} · {b.difficulty} · {b.puzzle_count} puzzles
                    {b.page_count ? ` · ${b.page_count} pages` : ""} ·{" "}
                    {new Date(b.created_at).toLocaleDateString()}
                    {b.word_source === "ai" ? " · AI words" : ""}
                  </p>
                </div>
                <StatusBadge status={b.status} />
              </div>

              {b.status === "completed" && b.book_type === "ebook" && (
                <div className="mt-3 flex flex-wrap gap-2">
                  <Link
                    href={`/dashboard/ebook/${b.id}`}
                    className="rounded bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white"
                  >
                    Open Editor
                  </Link>
                  <a href={`/api/ebook/${b.id}/export?format=pdf`} className="rounded border border-neutral-900 px-3 py-1.5 text-xs font-medium">PDF</a>
                  <a href={`/api/ebook/${b.id}/export?format=epub`} className="rounded border border-neutral-900 px-3 py-1.5 text-xs font-medium">EPUB</a>
                  <a href={`/api/ebook/${b.id}/export?format=docx`} className="rounded border border-neutral-900 px-3 py-1.5 text-xs font-medium">DOCX</a>
                </div>
              )}

              {b.status === "completed" && b.book_type !== "ebook" && (
                <div className="mt-3 flex gap-3">
                  <a
                    href={`/api/books/${b.id}/download?part=interior`}
                    className="rounded bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white"
                  >
                    Interior PDF
                  </a>
                  <a
                    href={`/api/books/${b.id}/download?part=cover`}
                    className="rounded border border-neutral-900 px-3 py-1.5 text-xs font-medium"
                  >
                    Cover PDF
                  </a>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    completed: "bg-green-100 text-green-800",
    generating: "bg-amber-100 text-amber-800",
    failed: "bg-red-100 text-red-800",
  };
  return (
    <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${styles[status] ?? "bg-neutral-100 text-neutral-700"}`}>
      {status}
    </span>
  );
}
