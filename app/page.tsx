export default function Home() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="text-3xl font-bold">KDP Pocket AI</h1>
      <p className="mt-2 text-neutral-600">
        Phase 0 foundation. The current milestone is the{" "}
        <strong>PDF Engine Gate</strong>.
      </p>

      <section className="mt-8 rounded-lg border border-neutral-200 p-5">
        <h2 className="font-semibold">Gate status</h2>
        <p className="mt-1 text-sm text-neutral-600">
          Generate sample PDFs locally and upload them to Amazon KDP to validate
          compliance:
        </p>
        <pre className="mt-3 overflow-x-auto rounded bg-neutral-900 p-3 text-xs text-neutral-100">
          npm run gate:generate{"\n"}npm run gate:verify
        </pre>
        <p className="mt-3 text-sm text-neutral-600">
          Output is written to <code>/output</code>: a 6&times;9 interior PDF and
          a matching wraparound cover PDF.
        </p>
      </section>
    </main>
  );
}
