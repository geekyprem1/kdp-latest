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
  { href: "/dashboard/in-progress", label: "Production Queue" },
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
  { href: "/dashboard/books", label: "Publishing Vault™" },
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
    `rounded px-3 py-2 text-sm ${active ? "bg-white/15 text-white font-medium" : "text-white/60 hover:bg-white/10 hover:text-white"}`;

  const mainActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    if (href === "/dashboard/create") return pathname === "/dashboard/create" && !activeType;
    return pathname.startsWith(href);
  };

  const genActive = (g: { href: string; type: string }) =>
    pathname === g.href || activeType === g.type;

  return (
    <aside className="flex w-56 shrink-0 flex-col bg-black p-4">
      <Link href="/dashboard" className="block px-2 py-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="KDP Mafia" className="h-16 w-auto" />
      </Link>

      <nav className="mt-4 flex flex-1 flex-col gap-0.5">
        {MAIN.map((l) => (
          <Link key={l.href} href={l.href} className={cls(mainActive(l.href))}>
            {l.label}
          </Link>
        ))}

        <div className="mt-4 px-3 text-[10px] font-semibold uppercase tracking-wide text-white/30">
          Generators
        </div>
        {GENERATORS.map((g) => (
          <Link key={g.href} href={g.href} className={cls(genActive(g))}>
            {g.label}
          </Link>
        ))}

        <div className="mt-4 px-3 text-[10px] font-semibold uppercase tracking-wide text-white/30">
          Vault
        </div>
        {LIBRARY.map((l) => (
          <Link key={l.href} href={l.href} className={cls(pathname.startsWith(l.href))}>
            {l.label}
          </Link>
        ))}
      </nav>

      <div className="mt-4 border-t border-white/10 pt-3">
        {email && <p className="truncate px-3 text-xs text-white/30">{email}</p>}
        <button onClick={signOut} className="mt-2 w-full rounded px-3 py-2 text-left text-sm text-white/50 hover:bg-white/10 hover:text-white">
          Sign out
        </button>
      </div>
    </aside>
  );
}
