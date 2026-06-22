import Link from "next/link";

const FEATURES: Array<{ title: string; desc: string }> = [
  { title: "Niche Research", desc: "Find profitable KDP niches with AI-backed demand & competition estimates." },
  { title: "Opportunity Score", desc: "0–100 score from demand, competition, evergreen & monetization — plus the recommended book type." },
  { title: "Puzzle Books", desc: "Word Search, Sudoku & Maze — deterministic, print-ready, with answer keys." },
  { title: "Coloring Books", desc: "AI line-art coloring pages — full-bleed and printable." },
  { title: "Ebook Creator", desc: "AI outline → editable chapters → a polished non-fiction ebook." },
  { title: "Multi-format Export", desc: "KDP-ready print PDFs, plus EPUB & DOCX for ebooks." },
];

export default function Home() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-20">
      <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
        AI-Powered KDP Publishing Suite
      </h1>
      <p className="mt-4 max-w-2xl text-lg text-neutral-600">
        Research niches, discover profitable opportunities, and generate Word
        Search, Sudoku, Maze, Coloring Books, and Ebooks in minutes.
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
          <div key={f.title} className="rounded-lg border border-neutral-200 p-5">
            <h2 className="font-semibold">{f.title}</h2>
            <p className="mt-1.5 text-sm text-neutral-600">{f.desc}</p>
          </div>
        ))}
      </div>
    </main>
  );
}
