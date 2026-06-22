"use client";

import { useState } from "react";

export interface CoverVariation {
  index: number;
  url: string;
}

export interface BookOption {
  id: string;
  title: string;
}

export function CoverResults({
  coverId,
  variations,
  books,
  brief,
}: {
  coverId: string;
  variations: CoverVariation[];
  books: BookOption[];
  brief?: { layout?: string; typography?: string };
}) {
  const [bookId, setBookId] = useState("");
  const [applying, setApplying] = useState<number | null>(null);
  const [applied, setApplied] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const labels = ["A", "B", "C", "D", "E", "F"];

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
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed");
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
            {books.map((b) => (
              <option key={b.id} value={b.id}>{b.title}</option>
            ))}
          </select>
        </div>
      )}
      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

      <div className="grid grid-cols-3 gap-4">
        {variations.map((v) => (
          <div key={v.index} className="rounded-lg border border-neutral-200 p-2">
            <div className="text-center text-xs font-semibold text-neutral-500">Cover {labels[v.index]}</div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={v.url} alt={`Cover ${labels[v.index]}`} className="mt-1 w-full rounded" />
            <div className="mt-2 flex flex-col gap-1.5">
              <a href={`/api/cover/${coverId}/download?v=${v.index}`} className="rounded bg-neutral-900 px-2 py-1.5 text-center text-xs font-medium text-white">
                Download PNG
              </a>
              {books.length > 0 && (
                <button
                  onClick={() => useForBook(v.index)}
                  disabled={applying !== null}
                  className="rounded border border-neutral-300 px-2 py-1.5 text-xs font-medium hover:bg-neutral-50 disabled:opacity-50"
                >
                  {applied === v.index ? "Applied ✓" : applying === v.index ? "Applying…" : "Use for Book"}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
