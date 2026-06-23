"use client";

import Link from "next/link";
import { usePathname, useSearchParams, useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

const MAIN = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/niche", label: "Market Intelligence™" },
  { href: "/dashboard/create", label: "Publishing Studio" },
  { href: "/dashboard/bundle", label: "Publishing Factory™" },
  { href: "/dashboard/cover", label: "Cover Studio" },
  { href: "/dashboard/in-progress", label: "Book In Progress" },
];

// Dedicated generator entries → unified Create wizard with the type preselected.
const GENERATORS = [
  { href: "/dashboard/word-search", label: "Word Search", type: "word-search" },
  { href: "/dashboard/sudoku", label: "Sudoku", type: "sudoku" },
  { href: "/dashboard/maze", label: "Maze", type: "maze" },
  { href: "/dashboard/coloring", label: "Coloring Book", type: "coloring" },
  { href: "/dashboard/ebook-creator", label: "Ebook Creator", type: "ebook" },
];

const LIBRARY = [
  { href: "/dashboard/books", label: "Publishing Library" },
  { href: "/dashboard/downloads", label: "Asset Vault" },
  { href: "/dashboard/billing", label: "Billing" },
  { href: "/dashboard/settings", label: "Settings" },
];

export function DashboardNav({ email }: { email?: string | null }) {
  const pathname = usePathname();
  const params = useSearchParams();
  const router = useRouter();
  const activeType = pathname === "/dashboard/create" ? params.get("type") : null;

  async function signOut() {
    try {
      await createSupabaseBrowserClient().auth.signOut();
    } catch {
      /* ignore */
    }
    router.push("/login");
    router.refresh();
  }

  const cls = (active: boolean) =>
    `rounded px-3 py-2 text-sm ${active ? "bg-neutral-900 text-white" : "text-neutral-700 hover:bg-neutral-100"}`;

  const mainActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    if (href === "/dashboard/create") return pathname === "/dashboard/create" && !activeType;
    return pathname.startsWith(href);
  };

  const genActive = (g: { href: string; type: string }) =>
    pathname === g.href || activeType === g.type;

  return (
    <aside className="flex w-56 shrink-0 flex-col border-r border-neutral-200 p-4">
      <Link href="/dashboard" className="block px-2">
        <span className="text-lg font-bold">KDF Mafia</span>
        <span className="block text-[10px] font-medium uppercase tracking-wide text-neutral-400">
          AI Publishing Platform
        </span>
      </Link>

      <nav className="mt-6 flex flex-1 flex-col gap-1">
        {MAIN.map((l) => (
          <Link key={l.href} href={l.href} className={cls(mainActive(l.href))}>
            {l.label}
          </Link>
        ))}

        <div className="mt-4 px-3 text-[10px] font-semibold uppercase tracking-wide text-neutral-400">
          Generators
        </div>
        {GENERATORS.map((g) => (
          <Link key={g.href} href={g.href} className={cls(genActive(g))}>
            {g.label}
          </Link>
        ))}

        <div className="mt-4 px-3 text-[10px] font-semibold uppercase tracking-wide text-neutral-400">
          Library
        </div>
        {LIBRARY.map((l) => (
          <Link key={l.href} href={l.href} className={cls(pathname.startsWith(l.href))}>
            {l.label}
          </Link>
        ))}
      </nav>

      <div className="mt-4 border-t border-neutral-200 pt-3">
        {email && <p className="truncate px-3 text-xs text-neutral-500">{email}</p>}
        <button onClick={signOut} className="mt-2 w-full rounded px-3 py-2 text-left text-sm text-neutral-700 hover:bg-neutral-100">
          Sign out
        </button>
      </div>
    </aside>
  );
}
