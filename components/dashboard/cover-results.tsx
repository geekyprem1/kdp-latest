"use client";

import { useState } from "react";

export interface CoverVariation {
  index: number;
  url: string;
  score?: number;
  layout?: string;
}

export interface BookOption {
  id: string;
  title: string;
}

const LAYOUT_LABELS: Record<string, string> = {
  centered: "Centered Classic",
  topBand: "Top Banner",
  lowerThird: "Lower Third",
};

function scoreColor(s: number): { bg: string; fg: string } {
  if (s >= 80) return { bg: "#dcfce7", fg: "#166534" };
  if (s >= 65) return { bg: "#dbeafe", fg: "#1e40af" };
  if (s >= 50) return { bg: "#fef9c3", fg: "#854d0e" };
  return { bg: "#fee2e2", fg: "#991b1b" };
}

export function CoverResults({
  coverId,
  variations: initial,
  books,
  brief,
}: {
  coverId: string;
  variations: CoverVariation[];
  books: BookOption[];
  brief?: { layout?: string; typography?: string };
}) {
  const [variations, setVariations] = useState<CoverVariation[]>(initial);
  const [bookId, setBookId] = useState("");
  const [applying, setApplying] = useState<number | null>(null);
  const [applied, setApplied] = useState<number | null>(null);
  const [regen, setRegen] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const labels = ["A", "B", "C", "D", "E", "F"];

  async function regenerate(index: number) {
    setError(null);
    setRegen(index);
    try {
      const res = await fetch(`/api/cover/${coverId}/regenerate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ index }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed");
      setVariations((prev) => prev.map((v) => (v.index === index ? { ...v, url: `${json.url}#${Date.now()}`, score: json.score } : v)));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setRegen(null);
    }
  }

  async function useForBook(index: number) {
    if (!bookId) {
      setError("Pick a book first.");
      return;
    }
    setError(null);
    setApplying(index);
    try {
      const res = await fetch(`/api/cover/${coverId}/use`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookId, variation: index }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed");
      setApplied(index);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setApplying(null);
    }
  }

  return (
    <div>
      {brief && (brief.layout || brief.typography) && (
        <div className="mb-4 rounded-lg border border-neutral-200 bg-neutral-50 p-3 text-xs text-neutral-600">
          {brief.layout && <div><b>Layout:</b> {brief.layout}</div>}
          {brief.typography && <div className="mt-0.5"><b>Typography:</b> {brief.typography}</div>}
        </div>
      )}

      {books.length > 0 && (
        <div className="mb-4 flex items-center gap-2 text-sm">
          <span className="text-neutral-600">Use for book:</span>
          <select value={bookId} onChange={(e) => setBookId(e.target.value)} className="rounded border border-neutral-300 px-2 py-1 text-sm">
            <option value="">Select a book…</option>
            {books.map((b) => (<option key={b.id} value={b.id}>{b.title}</option>))}
          </select>
        </div>
      )}
      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

      <div className="grid grid-cols-3 gap-4">
        {variations.map((v) => {
          const c = v.score != null ? scoreColor(v.score) : null;
          return (
            <div key={v.index} className="rounded-lg border border-neutral-200 p-2">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-semibold text-neutral-500">{v.layout ? LAYOUT_LABELS[v.layout] ?? `Concept ${labels[v.index]}` : `Concept ${labels[v.index]}`}</span>
                {c && <span className="rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ background: c.bg, color: c.fg }}>Score {v.score}</span>}
              </div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={v.url} alt={`Concept ${labels[v.index]}`} className="mt-1 w-full rounded" />
              <div className="mt-2 flex flex-col gap-1.5">
                <div className="flex gap-1.5">
                  <a href={`/api/cover/${coverId}/download?v=${v.index}`} className="flex-1 rounded bg-neutral-900 px-2 py-1.5 text-center text-xs font-medium text-white">PNG</a>
                  <a href={`/api/cover/${coverId}/download-pdf?v=${v.index}`} className="flex-1 rounded border border-neutral-900 px-2 py-1.5 text-center text-xs font-medium">PDF</a>
                </div>
                <button onClick={() => regenerate(v.index)} disabled={regen !== null} className="rounded border border-neutral-300 px-2 py-1.5 text-xs font-medium hover:bg-neutral-50 disabled:opacity-50">
                  {regen === v.index ? "Regenerating…" : "Regenerate"}
                </button>
                {books.length > 0 && (
                  <button onClick={() => useForBook(v.index)} disabled={applying !== null} className="rounded border border-neutral-300 px-2 py-1.5 text-xs font-medium hover:bg-neutral-50 disabled:opacity-50">
                    {applied === v.index ? "Applied ✓" : applying === v.index ? "Applying…" : "Use for Book"}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
