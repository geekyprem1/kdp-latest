/**
 * Premium cover composites — genre-aware styling × 3 distinct layout concepts,
 * with crisp typeset text over AI/gradient background art.
 */

import type { CoverGenre, ConceptLayout } from "./types";

const esc = (s: string): string =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

interface GenreStyle {
  font: string;
  weight: number;
  transform: string;
  c1: string; // gradient fallback
  c2: string;
  scrim: string;
  titleColor: string;
}

const GENRE: Record<CoverGenre, GenreStyle> = {
  business: { font: "Arial, Helvetica, sans-serif", weight: 800, transform: "none", c1: "#0f172a", c2: "#334155", scrim: "linear-gradient(180deg,rgba(0,0,0,.5),rgba(0,0,0,.1) 40%,rgba(0,0,0,.6))", titleColor: "#ffffff" },
  self_help: { font: "Georgia, serif", weight: 700, transform: "none", c1: "#0e7490", c2: "#f59e0b", scrim: "linear-gradient(180deg,rgba(0,0,0,.35),rgba(0,0,0,.05) 40%,rgba(0,0,0,.5))", titleColor: "#ffffff" },
  puzzle: { font: "'Arial Black', Arial, sans-serif", weight: 900, transform: "uppercase", c1: "#1d4ed8", c2: "#22d3ee", scrim: "linear-gradient(180deg,rgba(0,0,0,.3),rgba(0,0,0,0) 45%,rgba(0,0,0,.45))", titleColor: "#ffffff" },
  kids: { font: "'Trebuchet MS', sans-serif", weight: 800, transform: "none", c1: "#7c3aed", c2: "#f472b6", scrim: "linear-gradient(180deg,rgba(0,0,0,.25),rgba(0,0,0,0) 45%,rgba(0,0,0,.4))", titleColor: "#ffffff" },
  coloring: { font: "'Trebuchet MS', sans-serif", weight: 800, transform: "none", c1: "#64748b", c2: "#e2e8f0", scrim: "linear-gradient(180deg,rgba(255,255,255,.25),rgba(255,255,255,0) 40%,rgba(0,0,0,.3))", titleColor: "#ffffff" },
  fiction: { font: "Georgia, 'Times New Roman', serif", weight: 700, transform: "none", c1: "#111827", c2: "#7f1d1d", scrim: "linear-gradient(180deg,rgba(0,0,0,.55),rgba(0,0,0,.15) 45%,rgba(0,0,0,.65))", titleColor: "#ffffff" },
};

export type CoverBg = { kind: "image"; dataUri: string } | { kind: "gradient"; c1: string; c2: string };

/** Vertical band (fractions of height) where the title sits — used by the scorer. */
export function titleBandFor(layout: ConceptLayout): [number, number] {
  if (layout === "topBand") return [0.05, 0.28];
  if (layout === "lowerThird") return [0.6, 0.82];
  return [0.34, 0.56];
}

export function coverHtml(opts: {
  genre: CoverGenre;
  layout: ConceptLayout;
  title: string;
  subtitle?: string;
  author?: string;
  bg: CoverBg;
}): string {
  const g = GENRE[opts.genre];
  const bgLayer =
    opts.bg.kind === "image"
      ? `<img src="${opts.bg.dataUri}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover"/>`
      : `<div style="position:absolute;inset:0;background:linear-gradient(150deg,${opts.bg.c1},${opts.bg.c2})"></div>`;

  // layout-specific positioning of the title block
  const pos =
    opts.layout === "topBand"
      ? "justify-content:flex-start;padding-top:0.7in"
      : opts.layout === "lowerThird"
        ? "justify-content:flex-end;padding-bottom:1.4in"
        : "justify-content:center";

  const band = opts.layout === "topBand" ? "background:rgba(0,0,0,0.5);padding:0.22in 0.15in;border-radius:8px;" : "";

  return `<!doctype html><html><head><style>
    html,body{margin:0;padding:0}
    .cover{position:relative;width:100vw;height:100vh;overflow:hidden;font-family:${g.font}}
    .scrim{position:absolute;inset:0;background:${g.scrim}}
    .content{position:absolute;inset:0;display:flex;flex-direction:column;${pos};align-items:center;padding-left:0.6in;padding-right:0.6in;text-align:center;color:#fff}
    .title{${band}font-size:44pt;font-weight:${g.weight};line-height:1.06;text-transform:${g.transform};color:${g.titleColor};text-shadow:0 2px 10px rgba(0,0,0,.55);margin:0}
    .subtitle{margin:0.18in 0 0;font-size:17pt;font-weight:600;opacity:.95;text-shadow:0 2px 6px rgba(0,0,0,.5)}
    .author{position:absolute;left:0;right:0;bottom:0.7in;font-size:16pt;font-weight:600;text-align:center;text-shadow:0 2px 6px rgba(0,0,0,.6)}
  </style></head><body>
    <div class="cover">
      ${bgLayer}
      <div class="scrim"></div>
      <div class="content">
        <h1 class="title">${esc(opts.title)}</h1>
        ${opts.subtitle ? `<p class="subtitle">${esc(opts.subtitle)}</p>` : ""}
      </div>
      ${opts.author ? `<div class="author">${esc(opts.author)}</div>` : ""}
    </div>
  </body></html>`;
}
