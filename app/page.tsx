import Link from "next/link";

const FEATURES: Array<{ title: string; desc: string }> = [
  { title: "Market Intelligence™", desc: "Discover profitable niches before creating books — demand, competition, evergreen & monetization scoring." },
  { title: "Publishing Studio", desc: "Create professional KDP books using guided workflows — print-ready and KDP-validated in minutes." },
  { title: "Publishing Factory™", desc: "Create complete publishing assets at scale — turn one niche into a full multi-book bundle." },
  { title: "Cover Studio", desc: "Generate multiple commercial-ready cover concepts, scored for impact, with KDP-ready PNG and PDF exports." },
  { title: "Launch Kit™", desc: "Every book ships with metadata, keywords, categories, description & a publish checklist — in one ZIP." },
  { title: "Production Queue", desc: "Start a book and walk away. It finishes in the background and lands in your Publishing Vault™ automatically." },
];

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-20">
        <div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="KDP Mafia" className="h-20 w-auto" />
        </div>
        <h1 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl">
          Build Your KDP Business Faster Than Ever
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-neutral-600">
          Research profitable niches, generate books, create covers, package everything for Amazon KDP,
          and scale your publishing workflow from a single platform.
        </p>

        <div className="mt-8 flex gap-3">
          <Link href="/login" className="rounded bg-neutral-900 px-6 py-3 text-sm font-medium text-white">
            Start Building
          </Link>
          <Link href="/dashboard" className="rounded border border-neutral-300 px-6 py-3 text-sm font-medium">
            Explore Features
          </Link>
        </div>

        <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="rounded-xl border border-neutral-200 p-5 hover:shadow-sm transition-shadow">
              <h2 className="font-semibold">{f.title}</h2>
              <p className="mt-1.5 text-sm text-neutral-600">{f.desc}</p>
            </div>
          ))}
        </div>
      </main>

      <footer className="border-t border-neutral-200 px-6 py-6 text-center text-xs text-neutral-400">
        KDP Mafia is an independent publishing software platform and is not affiliated with Amazon.
      </footer>
    </div>
  );
}
