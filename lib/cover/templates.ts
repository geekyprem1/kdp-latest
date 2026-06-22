/**
 * Cover composite templates — AI background art + crisp typeset overlay
 * (so titles are sharp, not garbled AI text). Smart per-book-type styling.
 */

import type { CoverBookType } from "./types";

export type CoverCategory = "puzzle" | "ebook" | "coloring";

export function categoryOf(bookType: CoverBookType): CoverCategory {
  if (bookType === "ebook") return "ebook";
  if (bookType === "coloring") return "coloring";
  return "puzzle";
}

export type CoverBg = { kind: "image"; dataUri: string } | { kind: "gradient"; c1: string; c2: string };

const esc = (s: string): string =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

interface CategoryStyle {
  font: string;
  titleSize: string;
  titleWeight: number;
  titleTransform: string;
  justify: string; // flex justify-content
  scrim: string;
  titleColor: string;
  titleShadow: string;
  band: boolean; // colored band behind title (activity-book look)
}

const STYLES: Record<CoverCategory, CategoryStyle> = {
  ebook: {
    font: "Georgia, 'Times New Roman', serif",
    titleSize: "44pt",
    titleWeight: 700,
    titleTransform: "none",
    justify: "center",
    scrim: "linear-gradient(180deg, rgba(0,0,0,0.45), rgba(0,0,0,0.15) 35%, rgba(0,0,0,0.55))",
    titleColor: "#ffffff",
    titleShadow: "0 2px 8px rgba(0,0,0,0.5)",
    band: false,
  },
  puzzle: {
    font: "'Arial Black', Arial, sans-serif",
    titleSize: "50pt",
    titleWeight: 900,
    titleTransform: "uppercase",
    justify: "flex-start",
    scrim: "linear-gradient(180deg, rgba(0,0,0,0.25), rgba(0,0,0,0.0) 45%, rgba(0,0,0,0.45))",
    titleColor: "#ffffff",
    titleShadow: "0 3px 0 rgba(0,0,0,0.35)",
    band: true,
  },
  coloring: {
    font: "'Trebuchet MS', 'Comic Sans MS', sans-serif",
    titleSize: "46pt",
    titleWeight: 800,
    titleTransform: "none",
    justify: "flex-start",
    scrim: "linear-gradient(180deg, rgba(255,255,255,0.25), rgba(255,255,255,0.0) 40%, rgba(0,0,0,0.25))",
    titleColor: "#ffffff",
    titleShadow: "0 2px 0 rgba(0,0,0,0.45)",
    band: false,
  },
};

export function coverHtml(opts: {
  category: CoverCategory;
  title: string;
  subtitle?: string;
  author?: string;
  bg: CoverBg;
}): string {
  const s = STYLES[opts.category];
  const bgLayer =
    opts.bg.kind === "image"
      ? `<img src="${opts.bg.dataUri}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover"/>`
      : `<div style="position:absolute;inset:0;background:linear-gradient(150deg, ${opts.bg.c1}, ${opts.bg.c2})"></div>`;

  const titleBand = s.band
    ? "background:rgba(0,0,0,0.45);padding:0.18in 0.1in;border-radius:8px;"
    : "";

  return `<!doctype html><html><head><style>
    html,body{margin:0;padding:0}
    .cover{position:relative;width:100vw;height:100vh;overflow:hidden;font-family:${s.font}}
    .scrim{position:absolute;inset:0;background:${s.scrim}}
    .content{position:absolute;inset:0;display:flex;flex-direction:column;justify-content:${s.justify};
      padding:0.7in 0.6in;text-align:center;color:#fff}
    .title{${titleBand}font-size:${s.titleSize};font-weight:${s.titleWeight};line-height:1.05;
      text-transform:${s.titleTransform};color:${s.titleColor};text-shadow:${s.titleShadow};margin:0}
    .subtitle{margin:0.18in 0 0;font-size:17pt;font-weight:600;opacity:0.95;text-shadow:0 2px 6px rgba(0,0,0,0.5)}
    .author{position:absolute;left:0;right:0;bottom:0.7in;font-size:16pt;font-weight:600;
      text-align:center;color:#fff;text-shadow:0 2px 6px rgba(0,0,0,0.6)}
    .top{margin-top:${opts.category === "ebook" ? "0" : "0.4in"}}
  </style></head><body>
    <div class="cover">
      ${bgLayer}
      <div class="scrim"></div>
      <div class="content">
        <div class="top">
          <h1 class="title">${esc(opts.title)}</h1>
          ${opts.subtitle ? `<p class="subtitle">${esc(opts.subtitle)}</p>` : ""}
        </div>
      </div>
      ${opts.author ? `<div class="author">${esc(opts.author)}</div>` : ""}
    </div>
  </body></html>`;
}
