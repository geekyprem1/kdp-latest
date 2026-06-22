"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

type BookType = "word_search" | "sudoku" | "maze" | "coloring";

const DIFFICULTIES: Record<Exclude<BookType, "coloring">, string[]> = {
  word_search: ["easy", "medium", "hard"],
  sudoku: ["easy", "medium", "hard", "expert"],
  maze: ["easy", "medium", "hard", "expert"],
};
const MIN_PUZZLES: Record<BookType, number> = {
  word_search: 11,
  sudoku: 10,
  maze: 10,
  coloring: 22,
};
const MAX_PUZZLES: Record<BookType, number> = {
  word_search: 50,
  sudoku: 100,
  maze: 100,
  coloring: 40,
};
const TYPE_LABELS: Record<BookType, string> = {
  word_search: "Word Search",
  sudoku: "Sudoku",
  maze: "Maze",
  coloring: "Coloring Book",
};
const COUNT_LABELS: Record<BookType, string> = {
  word_search: "Puzzles",
  sudoku: "Puzzles",
  maze: "Mazes",
  coloring: "Pages",
};
const AGE_GROUPS = ["toddlers", "kids", "adults"];
const STYLES = ["simple", "cute", "detailed"];

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
  const [ageGroup, setAgeGroup] = useState("kids");
  const [style, setStyle] = useState("cute");
  const [puzzleCount, setPuzzleCount] = useState(25);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);

  const usesTheme = bookType === "word_search" || bookType === "coloring";
  const approxPages =
    bookType === "coloring"
      ? puzzleCount + 2
      : bookType === "word_search"
        ? 2 * puzzleCount + 3
        : 2 * puzzleCount + 4;

  const field = "mt-1 w-full rounded border border-neutral-300 px-3 py-2 text-sm";
  const label = "block text-sm font-medium text-neutral-700";

  function changeType(t: BookType) {
    setBookType(t);
    setDifficulty("medium");
    setPuzzleCount((p) => Math.min(MAX_PUZZLES[t], Math.max(MIN_PUZZLES[t], p)));
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
          theme: usesTheme ? theme : undefined,
          title: title || undefined,
          difficulty: bookType === "coloring" ? undefined : difficulty,
          ageGroup: bookType === "coloring" ? ageGroup : undefined,
          style: bookType === "coloring" ? style : undefined,
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
    return (
      <div className="mx-auto max-w-xl">
        <div className="rounded-lg border border-green-300 bg-green-50 p-6">
          <h2 className="text-lg font-semibold text-green-900">
            ✓ {TYPE_LABELS[result.bookType] ?? "Book"} generated
          </h2>
          <p className="mt-1 text-sm text-green-800">
            <strong>{result.title}</strong> — {result.pageCount} pages · 8.5×11, KDP-ready.
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
        Choose a book type and generate a KDP-ready PDF.
      </p>

      {/* Book type toggle */}
      <div className="mt-5 grid grid-cols-2 gap-3">
        {(["word_search", "sudoku", "maze", "coloring"] as BookType[]).map((t) => (
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
            {TYPE_LABELS[t]}
          </button>
        ))}
      </div>

      <form onSubmit={submit} className="mt-6 space-y-4">
        {usesTheme && (
          <div>
            <label className={label}>Theme / niche</label>
            <input
              className={field}
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              placeholder="e.g. Dinosaurs, Unicorns, Space, Gardening"
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

        {bookType === "coloring" ? (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={label}>Age group</label>
              <select className={field} value={ageGroup} onChange={(e) => setAgeGroup(e.target.value)}>
                {AGE_GROUPS.map((a) => (
                  <option key={a} value={a}>
                    {a.charAt(0).toUpperCase() + a.slice(1)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={label}>Style</label>
              <select className={field} value={style} onChange={(e) => setStyle(e.target.value)}>
                {STYLES.map((s) => (
                  <option key={s} value={s}>
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </option>
                ))}
              </select>
            </div>
          </div>
        ) : (
          <div>
            <label className={label}>Difficulty</label>
            <select className={field} value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
              {DIFFICULTIES[bookType as Exclude<BookType, "coloring">].map((d) => (
                <option key={d} value={d}>
                  {d.charAt(0).toUpperCase() + d.slice(1)}
                </option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className={label}>
            {COUNT_LABELS[bookType]} ({approxPages} pages)
          </label>
          <input
            type="number"
            min={MIN_PUZZLES[bookType]}
            max={MAX_PUZZLES[bookType]}
            className={field}
            value={puzzleCount}
            onChange={(e) => setPuzzleCount(Number(e.target.value))}
          />
        </div>

        {bookType === "coloring" && (
          <p className="text-xs text-amber-700">
            Coloring books use AI image generation (Replicate) — this can take a couple
            of minutes and uses image credits.
          </p>
        )}

        <button
          type="submit"
          disabled={busy}
          className="w-full rounded bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"
        >
          {busy ? "Generating… (up to a few minutes)" : "Generate Book"}
        </button>
      </form>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
    </div>
  );
}
