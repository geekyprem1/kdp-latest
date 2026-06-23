import Link from "next/link";

const FEATURES = [
  { title: "Market Intelligence™", desc: "Discover profitable niches before creating books — demand, competition, evergreen & monetization scoring." },
  { title: "Publishing Studio", desc: "Create professional KDP books using guided workflows — print-ready and KDP-validated in minutes." },
  { title: "Publishing Factory™", desc: "Create complete publishing assets at scale — turn one niche into a full multi-book bundle." },
  { title: "Cover Studio", desc: "Generate multiple commercial-ready cover concepts, scored for impact, with KDP-ready PNG and PDF exports." },
  { title: "Launch Kit™", desc: "Every book ships with metadata, keywords, categories, description & a publish checklist — in one ZIP." },
  { title: "Production Queue", desc: "Start a book and walk away. It finishes in the background and lands in your Publishing Vault™ automatically." },
];

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-black text-white">

      {/* ── Nav ── */}
      <nav className="flex items-center justify-between px-8 py-5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="KDP Mafia" className="h-14 w-auto" />
        <div className="flex items-center gap-4">
          <Link href="/login" className="text-sm text-white/60 hover:text-white transition-colors">
            Sign in
          </Link>
          <Link
            href="/login"
            className="rounded-lg bg-[#C9A84C] px-5 py-2 text-sm font-semibold text-black hover:bg-[#b8962f] transition-colors"
          >
            Start Building
          </Link>
        </div>
      </nav>

      {/* ── Hero ── */}
      <main className="flex-1">
        <section className="mx-auto max-w-4xl px-8 pb-24 pt-20 text-center">
          <div className="inline-block rounded-full border border-[#C9A84C]/40 bg-[#C9A84C]/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-[#C9A84C]">
            The Publishing OS for Amazon KDP
          </div>

          <h1 className="mt-6 text-5xl font-bold leading-tight tracking-tight sm:text-6xl">
            Build Your KDP Business
            <br />
            <span className="text-[#C9A84C]">Faster Than Ever</span>
          </h1>

          <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-white/50">
            Research profitable niches, generate books, create covers, package everything
            for Amazon KDP, and scale your publishing workflow from a single platform.
          </p>

          <div className="mt-8 flex items-center justify-center gap-4">
            <Link
              href="/login"
              className="rounded-lg bg-[#C9A84C] px-8 py-3 text-sm font-bold text-black hover:bg-[#b8962f] transition-colors"
            >
              Start Building
            </Link>
            <Link
              href="/dashboard"
              className="rounded-lg border border-white/20 px-8 py-3 text-sm font-medium text-white/70 hover:border-white/40 hover:text-white transition-colors"
            >
              Explore Features
            </Link>
          </div>

          {/* Workflow strip */}
          <div className="mt-14 flex items-center justify-center gap-2 text-xs text-white/30">
            {["Research", "Create", "Package", "Publish"].map((s, i, arr) => (
              <span key={s} className="flex items-center gap-2">
                <span className="font-semibold text-white/60">{s}</span>
                {i < arr.length - 1 && <span className="text-[#C9A84C]">→</span>}
              </span>
            ))}
          </div>
        </section>

        {/* ── Features ── */}
        <section className="border-t border-white/10 bg-white/[0.02] px-8 py-20">
          <div className="mx-auto max-w-4xl">
            <p className="mb-10 text-center text-xs font-semibold uppercase tracking-widest text-[#C9A84C]">
              Everything in one platform
            </p>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((f) => (
                <div
                  key={f.title}
                  className="rounded-xl border border-white/10 bg-white/5 p-5 transition-all hover:border-[#C9A84C]/40 hover:bg-white/[0.08]"
                >
                  <div className="mb-2 h-1.5 w-6 rounded-full bg-[#C9A84C]" />
                  <h2 className="font-semibold text-white">{f.title}</h2>
                  <p className="mt-1.5 text-sm leading-relaxed text-white/40">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA ── */}
        <section className="px-8 py-24 text-center">
          <div className="mx-auto max-w-xl">
            <h2 className="text-3xl font-bold text-white">
              Ready to scale your<br />
              <span className="text-[#C9A84C]">publishing operation?</span>
            </h2>
            <p className="mt-4 text-sm text-white/40">
              Join publishers using KDP Mafia to research, create, and launch faster.
            </p>
            <Link
              href="/login"
              className="mt-8 inline-block rounded-lg bg-[#C9A84C] px-10 py-3.5 text-sm font-bold text-black hover:bg-[#b8962f] transition-colors"
            >
              Get Started Free
            </Link>
          </div>
        </section>
      </main>

      {/* ── Footer ── */}
      <footer className="border-t border-white/10 px-8 py-6 text-center text-xs text-white/20">
        KDP Mafia is an independent publishing software platform and is not affiliated with Amazon.
      </footer>

    </div>
  );
}
