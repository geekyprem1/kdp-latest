import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center px-6">
      <h1 className="text-4xl font-bold tracking-tight">KDP Pocket AI</h1>
      <p className="mt-3 text-lg text-neutral-600">
        Create and download Amazon KDP-ready word search books in minutes. Enter a
        niche, pick a difficulty, and get a print-ready interior + cover PDF.
      </p>

      <div className="mt-8 flex gap-3">
        <Link
          href="/login"
          className="rounded bg-neutral-900 px-6 py-3 text-sm font-medium text-white"
        >
          Get started
        </Link>
        <Link
          href="/dashboard"
          className="rounded border border-neutral-300 px-6 py-3 text-sm font-medium"
        >
          Go to dashboard
        </Link>
      </div>

      <ul className="mt-10 space-y-2 text-sm text-neutral-600">
        <li>• Any niche — AI-generated themed word lists</li>
        <li>• Puzzle pages + complete answer key</li>
        <li>• KDP-validated 8.5×11 interior &amp; cover PDFs</li>
        <li>• Auto-generated KDP metadata (title, subtitle, description, keywords)</li>
      </ul>
    </main>
  );
}
