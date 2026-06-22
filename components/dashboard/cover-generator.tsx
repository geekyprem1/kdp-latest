"use client";

import { useState } from "react";
import { CoverResults, type BookOption, type CoverVariation } from "./cover-results";

const BOOK_TYPES: Array<{ value: string; label: string }> = [
  { value: "ebook", label: "Ebook" },
  { value: "word_search", label: "Word Search" },
  { value: "sudoku", label: "Sudoku" },
  { value: "maze", label: "Maze" },
  { value: "coloring", label: "Coloring Book" },
];
const MOODS = ["Calm", "Bold", "Playful", "Elegant", "Dark", "Bright", "Minimal"];
const ART_STYLES = ["Modern", "Watercolor", "Flat vector", "Photographic", "Hand-drawn", "Vintage"];

const field = "mt-1 w-full rounded border border-neutral-300 px-3 py-2 text-sm";
const label = "block text-sm font-medium text-neutral-700";

interface Result {
  id: string;
  brief: { layout?: string; typography?: string };
  variations: CoverVariation[];
}

export function CoverGenerator({ books }: { books: BookOption[] }) {
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [author, setAuthor] = useState("");
  const [bookType, setBookType] = useState("ebook");
  const [genre, setGenre] = useState("");
  const [mood, setMood] = useState("Bold");
  const [artStyle, setArtStyle] = useState("Modern");
  const [audience, setAudience] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function generate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    setResult(null);
    try {
      const res = await fetch("/api/cover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, subtitle, author, bookType, genre, mood, artStyle, audience }),
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

  return (
    <div>
      <form onSubmit={generate} className="grid grid-cols-2 gap-4 rounded-lg border border-neutral-200 p-5">
        <div className="col-span-2">
          <label className={label}>Book title *</label>
          <input className={field} value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="e.g. The Productive Morning" />
        </div>
        <div><label className={label}>Subtitle</label><input className={field} value={subtitle} onChange={(e) => setSubtitle(e.target.value)} /></div>
        <div><label className={label}>Author name</label><input className={field} value={author} onChange={(e) => setAuthor(e.target.value)} /></div>
        <div>
          <label className={label}>Book type</label>
          <select className={field} value={bookType} onChange={(e) => setBookType(e.target.value)}>
            {BOOK_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
        <div><label className={label}>Genre</label><input className={field} value={genre} onChange={(e) => setGenre(e.target.value)} placeholder="self-help, kids, puzzles…" /></div>
        <div>
          <label className={label}>Mood</label>
          <select className={field} value={mood} onChange={(e) => setMood(e.target.value)}>
            {MOODS.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        <div>
          <label className={label}>Art style</label>
          <select className={field} value={artStyle} onChange={(e) => setArtStyle(e.target.value)}>
            {ART_STYLES.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
        <div className="col-span-2"><label className={label}>Target audience</label><input className={field} value={audience} onChange={(e) => setAudience(e.target.value)} placeholder="busy professionals, kids 6–10…" /></div>

        <div className="col-span-2">
          <button type="submit" disabled={busy || !title.trim()} className="w-full rounded bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50">
            {busy ? "Generating 3 covers… (up to a minute)" : "Generate Covers"}
          </button>
          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        </div>
      </form>

      {result && (
        <div className="mt-6">
          <h2 className="mb-3 text-lg font-semibold">Your covers <span className="text-xs font-normal text-green-700">· saved to library</span></h2>
          <CoverResults coverId={result.id} variations={result.variations} books={books} brief={result.brief} />
        </div>
      )}
    </div>
  );
}
