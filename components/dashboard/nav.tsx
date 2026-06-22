"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

const LINKS = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/niche", label: "Niche Research" },
  { href: "/dashboard/create", label: "Create Book" },
  { href: "/dashboard/books", label: "My Books" },
  { href: "/dashboard/downloads", label: "Download History" },
];

export function DashboardNav({ email }: { email?: string | null }) {
  const pathname = usePathname();
  const router = useRouter();

  async function signOut() {
    try {
      await createSupabaseBrowserClient().auth.signOut();
    } catch {
      /* ignore */
    }
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className="flex w-56 shrink-0 flex-col border-r border-neutral-200 p-4">
      <Link href="/dashboard" className="px-2 text-lg font-bold">
        KDP Pocket AI
      </Link>
      <nav className="mt-6 flex flex-1 flex-col gap-1">
        {LINKS.map((l) => {
          const active = l.href === "/dashboard" ? pathname === l.href : pathname.startsWith(l.href);
          return (
            <Link
              key={l.href}
              href={l.href}
              className={`rounded px-3 py-2 text-sm ${
                active ? "bg-neutral-900 text-white" : "text-neutral-700 hover:bg-neutral-100"
              }`}
            >
              {l.label}
            </Link>
          );
        })}
      </nav>
      <div className="mt-4 border-t border-neutral-200 pt-3">
        {email && <p className="truncate px-3 text-xs text-neutral-500">{email}</p>}
        <button
          onClick={signOut}
          className="mt-2 w-full rounded px-3 py-2 text-left text-sm text-neutral-700 hover:bg-neutral-100"
        >
          Sign out
        </button>
      </div>
    </aside>
  );
}
