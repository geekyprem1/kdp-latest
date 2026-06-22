import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const GENERATORS = [
  "Word Search",
  "Sudoku",
  "Maze",
  "Coloring Book",
  "Ebook",
];

export default async function DashboardHome() {
  const supabase = await createSupabaseServerClient();
  const [{ count: bookCount }, { count: downloadCount }] = await Promise.all([
    supabase.from("books").select("*", { count: "exact", head: true }),
    supabase.from("downloads").select("*", { count: "exact", head: true }),
  ]);

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-bold">Welcome back</h1>
      <p className="mt-1 text-sm text-neutral-600">
        Research a niche, then generate KDP-ready books in minutes — all from one
        guided wizard.
      </p>

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

      <div className="mt-6 rounded-lg border border-neutral-200 p-5">
        <h2 className="text-sm font-semibold text-neutral-700">Available book types</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {GENERATORS.map((g) => (
            <span key={g} className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-medium text-neutral-700">
              {g}
            </span>
          ))}
          <span className="rounded-full bg-neutral-50 px-3 py-1 text-xs font-medium text-neutral-400">
            Story Book (coming soon)
          </span>
        </div>
        <p className="mt-3 text-xs text-neutral-500">
          Every type is created through the Create Book wizard: enter a topic →
          see its Opportunity Score &amp; recommended type → configure → generate.
        </p>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <Link
          href="/dashboard/create"
          className="inline-block rounded bg-neutral-900 px-5 py-2.5 text-sm font-medium text-white"
        >
          + Create a Book
        </Link>
        <Link
          href="/dashboard/niche"
          className="inline-block rounded border border-neutral-300 px-5 py-2.5 text-sm font-medium"
        >
          Research a Niche
        </Link>
      </div>
    </div>
  );
}
