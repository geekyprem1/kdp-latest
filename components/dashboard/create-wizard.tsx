"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  BAND_COLORS,
  BADGE_COLORS,
  BOOK_TYPE_LABELS,
  recommendationBadge,
  type BookType,
  type RecommendedType,
  type OpportunityBand,
} from "@/lib/opportunity";

interface Analysis {
  factors: { demand: number; competition: number; evergreen: number; monetization: number };
  opportunity: number;
  band: OpportunityBand;
  summary: string;
  types: RecommendedType[];
}

interface Result {
  comingSoon?: boolean;
  message?: string;
  id?: string;
  title?: string;
  bookType?: BookType;
  pageCount?: number;
  wordSource?: string | null;
  metadataBy?: string;
  chapterCount?: number; // ebook
  totalWords?: number; // ebook
}

const BUILDABLE: BookType[] = ["word_search", "sudoku", "maze", "coloring", "ebook"];
const DIFF3 = ["easy", "medium", "hard"];
const DIFF4 = ["easy", "medium", "hard", "expert"];
const AGE_GROUPS = ["toddlers", "kids", "adults"];
const STYLES = ["simple", "cute", "detailed"];
const TONES = ["friendly", "professional", "conversational", "expert", "concise"];

const field = "mt-1 w-full rounded border border-neutral-300 px-3 py-2 text-sm";
const label = "block text-sm font-medium text-neutral-700";
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

// Map the ?type= deep-link slug (from dedicated nav entries) to a BookType.
const TYPE_SLUGS: Record<string, BookType> = {
  "word-search": "word_search",
  word_search: "word_search",
  sudoku: "sudoku",
  maze: "maze",
  coloring: "coloring",
  "coloring-book": "coloring",
  ebook: "ebook",
};
const slugToType = (s: string | null): BookType | null => (s ? TYPE_SLUGS[s] ?? null : null);
const defaultCount = (t: BookType | null) =>
  t === "coloring" ? 24 : t === "word_search" ? 25 : t ? 30 : 25;

export function CreateWizard() {
  const params = useSearchParams();
  // Dedicated generator entries deep-link with ?type= → preselect + jump to config.
  const presetType = slugToType(params.get("type"));
  const [step, setStep] = useState(presetType ? 4 : 1);

  // Step 1
  const [topic, setTopic] = useState(params.get("theme") ?? "");
  const [audience, setAudience] = useState("");
  const [category, setCategory] = useState("");
  const [country, setCountry] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);

  // Step 3/4
  const [bookType, setBookType] = useState<BookType | null>(presetType);
  const [title, setTitle] = useState("");
  const [difficulty, setDifficulty] = useState("medium");
  const [count, setCount] = useState(defaultCount(presetType));
  const [ageGroup, setAgeGroup] = useState("kids");
  const [style, setStyle] = useState("cute");
  const [tone, setTone] = useState("friendly");
  const [chapterCount, setChapterCount] = useState(10);
  const [targetWords, setTargetWords] = useState(8000);

  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);

  // ── actions ──
  async function analyze() {
    setError(null);
    setAnalyzing(true);
    try {
      const res = await fetch("/api/opportunity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, audience: audience || undefined, category: category || undefined, country: country || undefined }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Analysis failed");
      setAnalysis(json);
      setStep(2);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Analysis failed");
    } finally {
      setAnalyzing(false);
    }
  }

  function pickType(t: BookType) {
    setBookType(t);
    setDifficulty("medium");
    setCount(t === "coloring" ? 24 : t === "word_search" ? 25 : 30);
    setStep(4);
  }

  async function generate() {
    if (!bookType) return;
    setError(null);
    setBusy(true);
    setResult(null);
    try {
      const opportunity = analysis ? { ...analysis, topic, audience, category, country } : undefined;
      const payload: Record<string, unknown> = { bookType, title: title || undefined, opportunity };
      if (bookType === "word_search") Object.assign(payload, { theme: topic, difficulty, puzzleCount: count });
      else if (bookType === "sudoku" || bookType === "maze") Object.assign(payload, { difficulty, puzzleCount: count });
      else if (bookType === "coloring") Object.assign(payload, { theme: topic, ageGroup, style, puzzleCount: count });
      else if (bookType === "ebook") Object.assign(payload, { theme: topic, audience, tone, chapterCount, targetWords });

      const endpoint = bookType === "ebook" ? "/api/ebook" : "/api/books";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? `Failed (${res.status})`);
      setResult(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Generation failed");
    } finally {
      setBusy(false);
    }
  }

  // ── result screen ──
  if (result) {
    if (result.chapterCount !== undefined) {
      return (
        <Shell step={4}>
          <div className="rounded-lg border border-green-300 bg-green-50 p-6">
            <h2 className="text-lg font-semibold text-green-900">✓ Ebook created</h2>
            <p className="mt-1 text-sm text-green-800">
              <strong>{result.title}</strong> — {result.chapterCount} chapters
              {result.totalWords ? `, ~${result.totalWords.toLocaleString()} words` : ""}.
            </p>
            <p className="mt-1 text-xs text-green-700">Edit chapters and export PDF / EPUB / DOCX in the editor.</p>
            <div className="mt-4">
              <Link href={`/dashboard/ebook/${result.id}`} className="rounded bg-neutral-900 px-4 py-2 text-sm font-medium text-white">
                Open Editor →
              </Link>
            </div>
          </div>
          <button onClick={() => { setResult(null); setStep(1); setAnalysis(null); setBookType(null); }} className="mt-4 text-sm underline">
            Start over
          </button>
        </Shell>
      );
    }
    if (result.comingSoon) {
      return (
        <Shell step={4}>
          <div className="rounded-lg border border-amber-300 bg-amber-50 p-6">
            <h2 className="text-lg font-semibold text-amber-900">Ebook Creator — coming next</h2>
            <p className="mt-1 text-sm text-amber-800">{result.message}</p>
          </div>
          <button onClick={() => { setResult(null); setStep(3); }} className="mt-4 text-sm underline">
            ← Choose another type
          </button>
        </Shell>
      );
    }
    return (
      <Shell step={4}>
        <div className="rounded-lg border border-green-300 bg-green-50 p-6">
          <h2 className="text-lg font-semibold text-green-900">✓ {result.bookType ? BOOK_TYPE_LABELS[result.bookType] : "Book"} generated</h2>
          <p className="mt-1 text-sm text-green-800"><strong>{result.title}</strong> — {result.pageCount} pages · 8.5×11, KDP-ready.</p>
          <div className="mt-4 flex gap-3">
            <a href={`/api/books/${result.id}/download?part=interior`} className="rounded bg-neutral-900 px-4 py-2 text-sm font-medium text-white">Download Interior PDF</a>
            <a href={`/api/books/${result.id}/download?part=cover`} className="rounded border border-neutral-900 px-4 py-2 text-sm font-medium">Download Cover PDF</a>
          </div>
        </div>
        <div className="mt-4 flex gap-4 text-sm">
          <button onClick={() => { setResult(null); setStep(1); setAnalysis(null); setBookType(null); }} className="underline">Start over</button>
          <Link href="/dashboard/books" className="underline">View My Books</Link>
        </div>
      </Shell>
    );
  }

  return (
    <Shell step={step}>
      {/* STEP 1 */}
      {step === 1 && (
        <div>
          <h2 className="text-lg font-semibold">1. Topic / niche</h2>
          <p className="mt-1 text-sm text-neutral-600">Enter a topic — we'll score the opportunity and recommend the best book type.</p>
          <div className="mt-4 space-y-4">
            <div><label className={label}>Topic / niche *</label>
              <input className={field} value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g. Dinosaurs, Productivity, Mindfulness" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className={label}>Audience</label><input className={field} value={audience} onChange={(e) => setAudience(e.target.value)} placeholder="kids, adults, professionals" /></div>
              <div><label className={label}>Category</label><input className={field} value={category} onChange={(e) => setCategory(e.target.value)} placeholder="puzzles, self-help" /></div>
            </div>
            <div><label className={label}>Country (optional)</label><input className={field} value={country} onChange={(e) => setCountry(e.target.value)} placeholder="United States" /></div>
          </div>
          <div className="mt-5 flex items-center gap-4">
            <button onClick={analyze} disabled={!topic.trim() || analyzing} className="rounded bg-neutral-900 px-5 py-2.5 text-sm font-medium text-white disabled:opacity-50">
              {analyzing ? "Analyzing…" : "Analyze Opportunity →"}
            </button>
            <button onClick={() => { setAnalysis(null); setStep(3); }} disabled={!topic.trim()} className="text-sm text-neutral-500 underline disabled:opacity-40">Skip analysis</button>
          </div>
        </div>
      )}

      {/* STEP 2 */}
      {step === 2 && analysis && (
        <div>
          <h2 className="text-lg font-semibold">2. Opportunity analysis</h2>
          <p className="mt-1 text-sm text-neutral-600">{analysis.summary}</p>

          <div className="mt-4 flex items-center gap-4 rounded-lg border border-neutral-200 p-4">
            <div className="flex h-20 w-20 flex-col items-center justify-center rounded-full text-center" style={{ background: BAND_COLORS[analysis.band].bg, color: BAND_COLORS[analysis.band].fg }}>
              <div className="text-2xl font-bold">{analysis.opportunity}</div>
              <div className="text-[10px] font-semibold uppercase">{analysis.band}</div>
            </div>
            <div className="grid flex-1 grid-cols-4 gap-2 text-center">
              {([["Demand", analysis.factors.demand], ["Competition", analysis.factors.competition], ["Evergreen", analysis.factors.evergreen], ["Monetization", analysis.factors.monetization]] as Array<[string, number]>).map(([l, v]) => (
                <div key={l} className="rounded bg-neutral-50 py-2"><div className="text-[10px] uppercase text-neutral-400">{l}</div><div className="text-lg font-bold">{v}</div></div>
              ))}
            </div>
          </div>

          <h3 className="mt-5 text-sm font-semibold">Recommended book types</h3>
          <ul className="mt-2 space-y-1.5">
            {analysis.types.filter((t) => t.type !== "story").map((t) => {
              const badge = recommendationBadge(t.fit);
              const c = BADGE_COLORS[badge];
              return (
                <li key={t.type} className="flex items-center justify-between gap-3 rounded border border-neutral-200 px-3 py-2 text-sm">
                  <span><b>{BOOK_TYPE_LABELS[t.type]}</b> <span className="text-neutral-500">— {t.why}</span></span>
                  <span className="shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold" style={{ background: c.bg, color: c.fg }}>{t.fit} · {badge}</span>
                </li>
              );
            })}
          </ul>

          <div className="mt-5 flex gap-3">
            <button onClick={() => setStep(1)} className="rounded border border-neutral-300 px-4 py-2 text-sm">← Back</button>
            <button onClick={() => setStep(3)} className="rounded bg-neutral-900 px-5 py-2.5 text-sm font-medium text-white">Choose Book Type →</button>
          </div>
        </div>
      )}

      {/* STEP 3 */}
      {step === 3 && (
        <div>
          <h2 className="text-lg font-semibold">3. Choose book type</h2>
          <div className="mt-4 grid grid-cols-2 gap-3">
            {orderedTypes(analysis).map((t) => {
              const fit = analysis?.types.find((x) => x.type === t)?.fit;
              const badge = fit !== undefined ? recommendationBadge(fit) : null;
              const c = badge ? BADGE_COLORS[badge] : null;
              return (
                <button key={t} onClick={() => pickType(t)} className="rounded-lg border border-neutral-300 p-4 text-left hover:border-neutral-900 hover:bg-neutral-50">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{BOOK_TYPE_LABELS[t]}</span>
                    {badge && c && <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ background: c.bg, color: c.fg }}>{badge}</span>}
                  </div>
                  {fit !== undefined && <div className="mt-1 text-xs text-neutral-500">Fit {fit}/100</div>}
                </button>
              );
            })}
            {/* Storybook — coming soon */}
            <div className="rounded-lg border border-dashed border-neutral-300 p-4 text-left opacity-60">
              <div className="flex items-center justify-between">
                <span className="font-medium">Story Book</span>
                <span className="rounded-full bg-neutral-200 px-2 py-0.5 text-[10px] font-semibold text-neutral-600">Coming Soon</span>
              </div>
              <div className="mt-1 text-xs text-neutral-500">AI illustrated kids' stories</div>
            </div>
          </div>
          <button onClick={() => setStep(analysis ? 2 : 1)} className="mt-5 rounded border border-neutral-300 px-4 py-2 text-sm">← Back</button>
        </div>
      )}

      {/* STEP 4 */}
      {step === 4 && bookType && (
        <div>
          <h2 className="text-lg font-semibold">4. Configure — {BOOK_TYPE_LABELS[bookType]}</h2>
          <div className="mt-4 space-y-4">
            {/* Theme is needed for word search & coloring (used as the puzzle/art theme). */}
            {(bookType === "word_search" || bookType === "coloring") && (
              <div>
                <label className={label}>Theme / topic</label>
                <input className={field} value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g. Dinosaurs, Space, Gardening" required />
              </div>
            )}

            <div><label className={label}>Book title (optional)</label><input className={field} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Leave blank to auto-generate" /></div>

            {(bookType === "word_search" || bookType === "sudoku" || bookType === "maze") && (
              <div className="grid grid-cols-2 gap-4">
                <div><label className={label}>Difficulty</label>
                  <select className={field} value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
                    {(bookType === "word_search" ? DIFF3 : DIFF4).map((d) => <option key={d} value={d}>{cap(d)}</option>)}
                  </select></div>
                <div><label className={label}>{bookType === "maze" ? "Mazes" : "Puzzles"}</label>
                  <input type="number" className={field} value={count} min={bookType === "word_search" ? 11 : 10} max={bookType === "word_search" ? 50 : 100} onChange={(e) => setCount(Number(e.target.value))} /></div>
              </div>
            )}

            {bookType === "coloring" && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className={label}>Age group</label><select className={field} value={ageGroup} onChange={(e) => setAgeGroup(e.target.value)}>{AGE_GROUPS.map((a) => <option key={a} value={a}>{cap(a)}</option>)}</select></div>
                  <div><label className={label}>Style</label><select className={field} value={style} onChange={(e) => setStyle(e.target.value)}>{STYLES.map((s) => <option key={s} value={s}>{cap(s)}</option>)}</select></div>
                </div>
                <div><label className={label}>Pages</label><input type="number" className={field} value={count} min={22} max={40} onChange={(e) => setCount(Number(e.target.value))} /></div>
                <p className="text-xs text-amber-700">Coloring books use AI image generation (Replicate) — can take a couple minutes.</p>
              </>
            )}

            {bookType === "ebook" && (
              <>
                <div><label className={label}>Topic</label><input className={field} value={topic} onChange={(e) => setTopic(e.target.value)} /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className={label}>Audience</label><input className={field} value={audience} onChange={(e) => setAudience(e.target.value)} placeholder="busy professionals" /></div>
                  <div><label className={label}>Writing tone</label><select className={field} value={tone} onChange={(e) => setTone(e.target.value)}>{TONES.map((t) => <option key={t} value={t}>{cap(t)}</option>)}</select></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className={label}>Chapter count</label><input type="number" className={field} value={chapterCount} min={3} max={30} onChange={(e) => setChapterCount(Number(e.target.value))} /></div>
                  <div><label className={label}>Target word count</label><input type="number" className={field} value={targetWords} min={2000} max={50000} step={500} onChange={(e) => setTargetWords(Number(e.target.value))} /></div>
                </div>
              </>
            )}
          </div>

          <div className="mt-5 flex gap-3">
            <button onClick={() => setStep(analysis ? 3 : 1)} className="rounded border border-neutral-300 px-4 py-2 text-sm">← Back</button>
            <button
              onClick={generate}
              disabled={busy || ((bookType === "word_search" || bookType === "coloring" || bookType === "ebook") && !topic.trim())}
              className="rounded bg-neutral-900 px-5 py-2.5 text-sm font-medium text-white disabled:opacity-50"
            >
              {busy ? "Generating… (up to a few minutes)" : "Generate Book"}
            </button>
          </div>
        </div>
      )}

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
    </Shell>
  );
}

function orderedTypes(analysis: Analysis | null): BookType[] {
  if (!analysis) return BUILDABLE;
  const fit = (t: BookType) => analysis.types.find((x) => x.type === t)?.fit ?? 0;
  return [...BUILDABLE].sort((a, b) => fit(b) - fit(a));
}

function Shell({ step, children }: { step: number; children: React.ReactNode }) {
  const steps = ["Topic", "Opportunity", "Type", "Configure"];
  return (
    <div className="mx-auto max-w-xl">
      <h1 className="text-2xl font-bold">Create a Book</h1>
      <ol className="mt-3 flex gap-2 text-xs">
        {steps.map((s, i) => (
          <li key={s} className={`flex-1 rounded px-2 py-1 text-center ${i + 1 === step ? "bg-neutral-900 text-white" : i + 1 < step ? "bg-neutral-200 text-neutral-700" : "bg-neutral-100 text-neutral-400"}`}>
            {i + 1}. {s}
          </li>
        ))}
      </ol>
      <div className="mt-6">{children}</div>
    </div>
  );
}
