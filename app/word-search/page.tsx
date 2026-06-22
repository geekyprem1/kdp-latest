"use client";

import { useState } from "react";

type Difficulty = "easy" | "medium" | "hard";

export default function WordSearchPage() {
  const [theme, setTheme] = useState("Dinosaurs");
  const [puzzleCount, setPuzzleCount] = useState(20);
  const [gridSize, setGridSize] = useState(15);
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [busy, setBusy] = useState<"interior" | "cover" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function download(part: "interior" | "cover") {
    setBusy(part);
    setError(null);
    try {
      const res = await fetch("/api/word-search/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ theme, puzzleCount, gridSize, difficulty, part }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? `Request failed (${res.status})`);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const slug = theme.toLowerCase().replace(/[^a-z0-9]+/g, "-");
      a.download = `${slug}-word-search-${part}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(null);
    }
  }

  const field = "mt-1 w-full rounded border border-neutral-300 px-3 py-2 text-sm";
  const label = "block text-sm font-medium text-neutral-700";

  return (
    <main className="mx-auto max-w-xl px-6 py-12">
      <h1 className="text-2xl font-bold">Word Search Generator</h1>
      <p className="mt-1 text-sm text-neutral-600">
        8.5&times;11, no-bleed, KDP-ready. Generates a deterministic puzzle book
        with a full answer key.
      </p>

      <div className="mt-8 space-y-4">
        <div>
          <label className={label}>Theme</label>
          <input
            className={field}
            value={theme}
            onChange={(e) => setTheme(e.target.value)}
            placeholder="e.g. Dinosaurs, Space, Ocean, Animals"
          />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className={label}>Puzzles</label>
            <input
              type="number"
              min={1}
              max={50}
              className={field}
              value={puzzleCount}
              onChange={(e) => setPuzzleCount(Number(e.target.value))}
            />
          </div>
          <div>
            <label className={label}>Grid size</label>
            <input
              type="number"
              min={8}
              max={20}
              className={field}
              value={gridSize}
              onChange={(e) => setGridSize(Number(e.target.value))}
            />
          </div>
          <div>
            <label className={label}>Difficulty</label>
            <select
              className={field}
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value as Difficulty)}
            >
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            onClick={() => download("interior")}
            disabled={busy !== null}
            className="rounded bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {busy === "interior" ? "Generating…" : "Download Interior PDF"}
          </button>
          <button
            onClick={() => download("cover")}
            disabled={busy !== null}
            className="rounded border border-neutral-900 px-4 py-2 text-sm font-medium disabled:opacity-50"
          >
            {busy === "cover" ? "Generating…" : "Download Cover PDF"}
          </button>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <p className="pt-2 text-xs text-neutral-500">
          Tip: keep puzzle count high enough that the interior reaches KDP&apos;s
          24-page minimum (20 puzzles ≈ 43 pages).
        </p>
      </div>
    </main>
  );
}
