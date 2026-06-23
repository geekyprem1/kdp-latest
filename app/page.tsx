import Link from "next/link";

const FEATURES: Array<{ title: string; desc: string }> = [
  { title: "Market Intelligence™", desc: "Find profitable KDP niches with demand, competition, evergreen & monetization scoring — before you create." },
  { title: "Publishing Studio", desc: "Generate Word Search, Sudoku, Maze, Coloring Books & Ebooks in minutes — print-ready and KDP-validated." },
  { title: "Publishing Factory™", desc: "Turn one niche into a full multi-book bundle, with a recommended publishing order." },
  { title: "Cover Studio", desc: "Genre-aware cover concepts, scored for impact, with KDP-ready PNG and PDF exports." },
  { title: "Launch Kit™", desc: "Every book ships with metadata, keywords, categories, description & a publish checklist — in one ZIP." },
  { title: "Always-on generation", desc: "Start a book and walk away. It finishes in the background and lands in your Publishing Library." },
];

export default function Home() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-20">
      <span className="inline-block rounded-full border border-neutral-300 px-3 py-1 text-xs font-medium text-neutral-600">
        AI Publishing Platform
      </span>
      <h1 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl">
        Research, create, and launch Amazon KDP books — end to end.
      </h1>
      <p className="mt-4 max-w-2xl text-lg text-neutral-600">
        KDP Pocket AI turns a single idea into a validated, print-ready book with a
        complete launch kit. One platform for the whole workflow:
        <span className="font-medium text-neutral-800"> Research → Create → Package → Publish.</span>
      </p>

      <div className="mt-8 flex gap-3">
        <Link href="/login" className="rounded bg-neutral-900 px-6 py-3 text-sm font-medium text-white">
          Get started
        </Link>
        <Link href="/dashboard" className="rounded border border-neutral-300 px-6 py-3 text-sm font-medium">
          Go to dashboard
        </Link>
      </div>

      <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((f) => (
          <div key={f.title} className="rounded-xl border border-neutral-200 p-5">
            <h2 className="font-semibold">{f.title}</h2>
            <p className="mt-1.5 text-sm text-neutral-600">{f.desc}</p>
          </div>
        ))}
      </div>
    </main>
  );
}
