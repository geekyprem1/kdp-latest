"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

type BookType = "word_search" | "sudoku";

const DIFFICULTIES: Record<BookType, string[]> = {
  word_search: ["easy", "medium", "hard"],
  sudoku: ["easy", "medium", "hard", "expert"],
};
const MIN_PUZZLES: Record<BookType, number> = { word_search: 11, sudoku: 10 };

interface Result {
  id: string;
  title: string;
  bookType: BookType;
  pageCount: number;
  wordSource: string | null;
  metadataBy: string;
}

export function CreateBookForm() {
  const params = useSearchParams();
  const [bookType, setBookType] = useState<BookType>("word_search");
  // Prefill from Niche Research one-click ("Create Word Search Book").
  const [theme, setTheme] = useState(params.get("theme") ?? "");
  const [title, setTitle] = useState(params.get("title") ?? "");
  const [difficulty, setDifficulty] = useState("medium");
  const [puzzleCount, setPuzzleCount] = useState(25);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);

  // pages: word search = 2N+3, sudoku = 2N+4
  const approxPages = bookType === "sudoku" ? 2 * puzzleCount + 4 : 2 * puzzleCount + 3;

  const field = "mt-1 w-full rounded border border-neutral-300 px-3 py-2 text-sm";
  const label = "block text-sm font-medium text-neutral-700";

  function changeType(t: BookType) {
    setBookType(t);
    setDifficulty("medium");
    setPuzzleCount((p) => Math.max(MIN_PUZZLES[t], p));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResult(null);
    setBusy(true);
    try {
      const res = await fetch("/api/books", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookType,
          theme: bookType === "word_search" ? theme : undefined,
          title: title || undefined,
          difficulty,
          puzzleCount,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? `Failed (${res.status})`);
      setResult(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  if (result) {
    const typeLabel = result.bookType === "sudoku" ? "Sudoku" : "Word Search";
    return (
      <div className="mx-auto max-w-xl">
        <div className="rounded-lg border border-green-300 bg-green-50 p-6">
          <h2 className="text-lg font-semibold text-green-900">✓ {typeLabel} book generated</h2>
          <p className="mt-1 text-sm text-green-800">
            <strong>{result.title}</strong> — {result.pageCount} pages · 8.5×11, no-bleed,
            KDP-ready.
          </p>
          <p className="mt-1 text-xs text-green-700">
            {result.wordSource
              ? `Word list: ${result.wordSource === "ai" ? "AI-generated" : "curated bank"} · `
              : ""}
            Metadata: {result.metadataBy === "template" ? "template" : result.metadataBy}
          </p>
          <div className="mt-4 flex gap-3">
            <a
              href={`/api/books/${result.id}/download?part=interior`}
              className="rounded bg-neutral-900 px-4 py-2 text-sm font-medium text-white"
            >
              Download Interior PDF
            </a>
            <a
              href={`/api/books/${result.id}/download?part=cover`}
              className="rounded border border-neutral-900 px-4 py-2 text-sm font-medium"
            >
              Download Cover PDF
            </a>
          </div>
        </div>
        <div className="mt-4 flex gap-4 text-sm">
          <button onClick={() => setResult(null)} className="text-neutral-700 underline">
            Create another
          </button>
          <Link href="/dashboard/books" className="text-neutral-700 underline">
            View My Books
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="text-2xl font-bold">Create a Book</h1>
      <p className="mt-1 text-sm text-neutral-600">
        Choose a book type and generate a KDP-ready PDF with a full answer key.
      </p>

      {/* Book type toggle */}
      <div className="mt-5 grid grid-cols-2 gap-3">
        {(["word_search", "sudoku"] as BookType[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => changeType(t)}
            className={`rounded-lg border px-4 py-3 text-sm font-medium ${
              bookType === t
                ? "border-neutral-900 bg-neutral-900 text-white"
                : "border-neutral-300 text-neutral-700 hover:bg-neutral-50"
            }`}
          >
            {t === "word_search" ? "Word Search" : "Sudoku"}
          </button>
        ))}
      </div>

      <form onSubmit={submit} className="mt-6 space-y-4">
        {bookType === "word_search" && (
          <div>
            <label className={label}>Theme / niche</label>
            <input
              className={field}
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              placeholder="e.g. Coffee Lovers, Space, Gardening, Dinosaurs"
              required
            />
          </div>
        )}

        <div>
          <label className={label}>Book title (optional)</label>
          <input
            className={field}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Leave blank to auto-generate"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={label}>Difficulty</label>
            <select
              className={field}
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value)}
            >
              {DIFFICULTIES[bookType].map((d) => (
                <option key={d} value={d}>
                  {d.charAt(0).toUpperCase() + d.slice(1)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={label}>Puzzles ({approxPages} pages)</label>
            <input
              type="number"
              min={MIN_PUZZLES[bookType]}
              max={bookType === "sudoku" ? 100 : 50}
              className={field}
              value={puzzleCount}
              onChange={(e) => setPuzzleCount(Number(e.target.value))}
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={busy}
          className="w-full rounded bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"
        >
          {busy ? "Generating… (up to a minute)" : "Generate Book"}
        </button>
      </form>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
    </div>
  );
}
