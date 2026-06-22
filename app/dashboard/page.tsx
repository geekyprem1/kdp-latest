import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

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
        Generate KDP-ready word search books in minutes.
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

      <Link
        href="/dashboard/create"
        className="mt-6 inline-block rounded bg-neutral-900 px-5 py-2.5 text-sm font-medium text-white"
      >
        + Create a Word Search Book
      </Link>
    </div>
  );
}
