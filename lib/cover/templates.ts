/**
 * Cover Generator V2 — 3 genuinely different layout concepts.
 *
 * Concept A: fullImage       — cinematic full-bleed, floating text in safe zones
 * Concept B: typographyFirst — strong title block dominant, bestseller style
 * Concept C: modernCommercial— image lower half, design band upper half
 *
 * Safe zones: text is NEVER placed over the main subject area.
 * Genre-aware typography: each genre gets distinct font stack, weight, and color rules.
 */

import type { CoverGenre, ConceptLayout } from "./types";

const esc = (s: string): string =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// Wrap long titles: break at word boundary, max ~18 chars per line
function wrapTitle(title: string, maxLen = 18): string {
  const words = title.split(" ");
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    if (cur && (cur + " " + w).length > maxLen) {
      lines.push(cur);
      cur = w;
    } else {
      cur = cur ? cur + " " + w : w;
    }
  }
  if (cur) lines.push(cur);
  return lines.map(esc).join("<br>");
}

interface GenreTypography {
  titleFont: string;
  titleWeight: number;
  titleTransform: string;
  titleTracking: string;
  subtitleFont: string;
  authorFont: string;
  accentBar: string;   // CSS color for the decorative bar/accent
  overlayStrong: string; // strong scrim for text areas
  overlayLight: string;  // lighter scrim for image areas
}

const GENRE_TYPO: Record<CoverGenre, GenreTypography> = {
  business: {
    titleFont: "'Arial Black', 'Helvetica Neue', Arial, sans-serif",
    titleWeight: 900,
    titleTransform: "uppercase",
    titleTracking: "0.04em",
    subtitleFont: "Arial, Helvetica, sans-serif",
    authorFont: "Arial, Helvetica, sans-serif",
    accentBar: "#c9a84c",
    overlayStrong: "rgba(10,20,40,0.82)",
    overlayLight: "rgba(10,20,40,0.35)",
  },
  self_help: {
    titleFont: "Georgia, 'Times New Roman', serif",
    titleWeight: 700,
    titleTransform: "none",
    titleTracking: "0.01em",
    subtitleFont: "Georgia, serif",
    authorFont: "Arial, Helvetica, sans-serif",
    accentBar: "#e67e22",
    overlayStrong: "rgba(20,10,5,0.78)",
    overlayLight: "rgba(20,10,5,0.28)",
  },
  puzzle: {
    titleFont: "'Arial Black', Impact, Arial, sans-serif",
    titleWeight: 900,
    titleTransform: "uppercase",
    titleTracking: "0.06em",
    subtitleFont: "'Arial Black', Arial, sans-serif",
    authorFont: "Arial, Helvetica, sans-serif",
    accentBar: "#f39c12",
    overlayStrong: "rgba(0,30,80,0.85)",
    overlayLight: "rgba(0,30,80,0.40)",
  },
  kids: {
    titleFont: "'Trebuchet MS', 'Comic Sans MS', sans-serif",
    titleWeight: 800,
    titleTransform: "none",
    titleTracking: "0.02em",
    subtitleFont: "'Trebuchet MS', sans-serif",
    authorFont: "'Trebuchet MS', sans-serif",
    accentBar: "#9b59b6",
    overlayStrong: "rgba(30,0,60,0.75)",
    overlayLight: "rgba(30,0,60,0.28)",
  },
  coloring: {
    titleFont: "'Arial Black', Arial, sans-serif",
    titleWeight: 900,
    titleTransform: "none",
    titleTracking: "0.03em",
    subtitleFont: "Arial, sans-serif",
    authorFont: "Arial, sans-serif",
    accentBar: "#1abc9c",
    overlayStrong: "rgba(0,50,60,0.72)",
    overlayLight: "rgba(0,50,60,0.22)",
  },
  fiction: {
    titleFont: "Georgia, 'Palatino Linotype', 'Times New Roman', serif",
    titleWeight: 700,
    titleTransform: "none",
    titleTracking: "-0.01em",
    subtitleFont: "Georgia, serif",
    authorFont: "Georgia, serif",
    accentBar: "#c0392b",
    overlayStrong: "rgba(5,0,15,0.88)",
    overlayLight: "rgba(5,0,15,0.42)",
  },
};

export type CoverBg = { kind: "image"; dataUri: string } | { kind: "gradient"; c1: string; c2: string };

const GENRE_GRADIENTS: Record<CoverGenre, [string, string]> = {
  business: ["#0f172a", "#1e3a5f"],
  self_help: ["#7c3a00", "#c05a00"],
  puzzle:    ["#1a237e", "#0d47a1"],
  kids:      ["#4a148c", "#c62828"],
  coloring:  ["#004d40", "#00796b"],
  fiction:   ["#1a0a2e", "#6a1a3a"],
};

/** Y-range (fraction of height) where the title text sits — used by scorer. */
export function titleBandFor(layout: ConceptLayout): [number, number] {
  if (layout === "fullImage") return [0.06, 0.28];          // title floats top-safe-zone
  if (layout === "typographyFirst") return [0.08, 0.52];   // title block is dominant
  return [0.05, 0.32];                                      // modernCommercial: upper band
}

// ─── Concept A: Full Image Premium ───────────────────────────────────────────
// Cinematic full-bleed image, safe zones top + bottom, subject in middle 50%
function layoutFullImage(opts: {
  g: GenreTypography;
  genre: CoverGenre;
  title: string;
  subtitle?: string;
  author?: string;
  bg: CoverBg;
  accentColor: string;
}): string {
  const { g, genre, title, subtitle, author, bg, accentColor } = opts;
  const [gc1, gc2] = GENRE_GRADIENTS[genre];
  const bgLayer = bg.kind === "image"
    ? `<img src="${bg.dataUri}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:center">`
    : `<div style="position:absolute;inset:0;background:linear-gradient(160deg,${gc1},${gc2})"></div>`;

  const fontSize = title.length > 20 ? "38pt" : title.length > 14 ? "46pt" : "54pt";

  return `<!doctype html><html><head><meta charset="utf-8"><style>
    *{margin:0;padding:0;box-sizing:border-box}
    html,body{width:100%;height:100%;overflow:hidden}
    .cover{position:relative;width:100vw;height:100vh;overflow:hidden;font-family:${g.titleFont}}

    /* Safe zone scrims: top 30% and bottom 25% darken for legibility */
    .scrim-top{position:absolute;left:0;right:0;top:0;height:35%;background:linear-gradient(180deg,${g.overlayStrong} 0%,rgba(0,0,0,0) 100%)}
    .scrim-bottom{position:absolute;left:0;right:0;bottom:0;height:30%;background:linear-gradient(0deg,${g.overlayStrong} 0%,rgba(0,0,0,0) 100%)}

    /* Title block sits in the TOP safe zone */
    .title-block{position:absolute;left:0;right:0;top:0;padding:0.55in 0.5in 0.3in}
    .accent-bar{width:2.2in;height:4px;background:${accentColor};margin-bottom:0.16in;border-radius:2px}
    .title{font-size:${fontSize};font-weight:${g.titleWeight};line-height:1.05;letter-spacing:${g.titleTracking};text-transform:${g.titleTransform};color:#fff;text-shadow:0 2px 16px rgba(0,0,0,0.7),0 1px 3px rgba(0,0,0,0.9)}
    .subtitle{margin-top:0.13in;font-size:14pt;font-weight:400;font-family:${g.subtitleFont};color:rgba(255,255,255,0.92);text-shadow:0 1px 8px rgba(0,0,0,0.8);letter-spacing:0.02em}

    /* Author block in the BOTTOM safe zone */
    .author-block{position:absolute;left:0;right:0;bottom:0;padding:0 0.5in 0.55in}
    .author-line{width:1.5in;height:2px;background:${accentColor};opacity:0.8;margin-bottom:0.12in;border-radius:1px}
    .author{font-size:13pt;font-weight:600;font-family:${g.authorFont};color:rgba(255,255,255,0.95);text-shadow:0 1px 8px rgba(0,0,0,0.8);letter-spacing:0.08em;text-transform:uppercase}
  </style></head><body>
    <div class="cover">
      ${bgLayer}
      <div class="scrim-top"></div>
      <div class="scrim-bottom"></div>
      <div class="title-block">
        <div class="accent-bar"></div>
        <h1 class="title">${wrapTitle(title, 18)}</h1>
        ${subtitle ? `<p class="subtitle">${esc(subtitle)}</p>` : ""}
      </div>
      ${author ? `<div class="author-block"><div class="author-line"></div><div class="author">${esc(author)}</div></div>` : ""}
    </div>
  </body></html>`;
}

// ─── Concept B: Typography-First Bestseller ───────────────────────────────────
// Strong title block upper 55%, image pushes to lower 45%, high thumbnail readability
function layoutTypographyFirst(opts: {
  g: GenreTypography;
  genre: CoverGenre;
  title: string;
  subtitle?: string;
  author?: string;
  bg: CoverBg;
  accentColor: string;
}): string {
  const { g, genre, title, subtitle, author, bg, accentColor } = opts;
  const [gc1, gc2] = GENRE_GRADIENTS[genre];
  const bgLayer = bg.kind === "image"
    ? `<img src="${bg.dataUri}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:center bottom">`
    : `<div style="position:absolute;inset:0;background:linear-gradient(160deg,${gc1},${gc2})"></div>`;

  const fontSize = title.length > 20 ? "42pt" : title.length > 12 ? "52pt" : "64pt";

  return `<!doctype html><html><head><meta charset="utf-8"><style>
    *{margin:0;padding:0;box-sizing:border-box}
    html,body{width:100%;height:100%;overflow:hidden}
    .cover{position:relative;width:100vw;height:100vh;overflow:hidden;font-family:${g.titleFont}}

    /* Upper solid band — fully opaque so title is 100% legible at thumbnail size */
    .upper-band{position:absolute;left:0;right:0;top:0;height:58%;background:${gc1};z-index:1}
    .upper-band-gradient{position:absolute;left:0;right:0;top:55%;height:10%;background:linear-gradient(180deg,${gc1},transparent);z-index:2}

    /* Image bleeds behind the lower portion */
    .image-layer{position:absolute;left:0;right:0;top:0;bottom:0}

    /* Text block inside the upper band */
    .title-block{position:absolute;left:0;right:0;top:0;padding:0.5in 0.5in 0;z-index:3}
    .genre-label{font-size:9pt;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:${accentColor};margin-bottom:0.14in;font-family:${g.authorFont}}
    .title{font-size:${fontSize};font-weight:${g.titleWeight};line-height:1.02;letter-spacing:${g.titleTracking};text-transform:${g.titleTransform};color:#fff;text-shadow:none}
    .accent-rule{width:100%;height:3px;background:linear-gradient(90deg,${accentColor},transparent);margin:0.18in 0 0.14in;border-radius:2px}
    .subtitle{font-size:13pt;font-weight:400;font-family:${g.subtitleFont};color:rgba(255,255,255,0.88);letter-spacing:0.01em;line-height:1.4}

    /* Author bottom of upper band */
    .author-block{position:absolute;left:0.5in;right:0.5in;top:52%;transform:translateY(-100%);z-index:3;padding-bottom:0.18in}
    .author{font-size:11pt;font-weight:700;font-family:${g.authorFont};color:${accentColor};letter-spacing:0.12em;text-transform:uppercase}

    /* Gradient fade over image lower section */
    .image-fade{position:absolute;left:0;right:0;bottom:0;height:40%;background:linear-gradient(0deg,rgba(0,0,0,0.55),transparent);z-index:2}
  </style></head><body>
    <div class="cover">
      <div class="image-layer">${bgLayer}</div>
      <div class="upper-band"></div>
      <div class="upper-band-gradient"></div>
      <div class="image-fade"></div>
      <div class="title-block">
        ${subtitle ? `<div class="genre-label">${esc(subtitle)}</div>` : ""}
        <h1 class="title">${wrapTitle(title, 16)}</h1>
        <div class="accent-rule"></div>
        ${subtitle && subtitle.length > 40 ? "" : subtitle ? `<p class="subtitle">${esc(subtitle)}</p>` : ""}
      </div>
      ${author ? `<div class="author-block"><div class="author">${esc(author)}</div></div>` : ""}
    </div>
  </body></html>`;
}

// ─── Concept C: Modern Commercial KDP ────────────────────────────────────────
// Clean design band top, full image lower, bestseller border/badge elements
function layoutModernCommercial(opts: {
  g: GenreTypography;
  genre: CoverGenre;
  title: string;
  subtitle?: string;
  author?: string;
  bg: CoverBg;
  accentColor: string;
}): string {
  const { g, genre, title, subtitle, author, bg, accentColor } = opts;
  const [gc1, gc2] = GENRE_GRADIENTS[genre];
  const bgLayer = bg.kind === "image"
    ? `<img src="${bg.dataUri}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:center 60%">`
    : `<div style="position:absolute;inset:0;background:linear-gradient(160deg,${gc1},${gc2})"></div>`;

  const fontSize = title.length > 22 ? "36pt" : title.length > 14 ? "44pt" : "54pt";

  return `<!doctype html><html><head><meta charset="utf-8"><style>
    *{margin:0;padding:0;box-sizing:border-box}
    html,body{width:100%;height:100%;overflow:hidden}
    .cover{position:relative;width:100vw;height:100vh;overflow:hidden;font-family:${g.titleFont}}

    /* Full bleed image */
    .image-layer{position:absolute;inset:0}

    /* Thick top band for title */
    .top-band{position:absolute;left:0;right:0;top:0;height:38%;background:${gc1};z-index:2}
    .top-band-fade{position:absolute;left:0;right:0;top:35%;height:12%;background:linear-gradient(180deg,${gc1},transparent);z-index:2}

    /* Thick bottom band for author */
    .bottom-band{position:absolute;left:0;right:0;bottom:0;height:14%;background:${gc1};z-index:2}
    .bottom-band-fade{position:absolute;left:0;right:0;bottom:13%;height:8%;background:linear-gradient(0deg,${gc1},transparent);z-index:2}

    /* Accent stripe — bold color line between band and image */
    .accent-stripe{position:absolute;left:0;right:0;top:37%;height:5px;background:${accentColor};z-index:3}
    .accent-stripe-bottom{position:absolute;left:0;right:0;bottom:13.5%;height:3px;background:${accentColor};z-index:3}

    /* Title inside top band */
    .title-block{position:absolute;left:0;right:0;top:0;height:38%;display:flex;flex-direction:column;justify-content:center;padding:0.2in 0.45in;z-index:4}
    .title{font-size:${fontSize};font-weight:${g.titleWeight};line-height:1.04;letter-spacing:${g.titleTracking};text-transform:${g.titleTransform};color:#fff}
    .subtitle{margin-top:0.1in;font-size:12pt;font-weight:400;font-family:${g.subtitleFont};color:rgba(255,255,255,0.85);letter-spacing:0.01em}

    /* Author inside bottom band */
    .author-block{position:absolute;left:0;right:0;bottom:0;height:14%;display:flex;align-items:center;padding:0 0.45in;z-index:4}
    .author-dot{width:6px;height:6px;border-radius:50%;background:${accentColor};margin-right:0.12in;flex-shrink:0}
    .author{font-size:12pt;font-weight:700;font-family:${g.authorFont};color:rgba(255,255,255,0.95);letter-spacing:0.1em;text-transform:uppercase}

    /* Middle image fade for depth */
    .mid-fade{position:absolute;left:0;right:0;top:38%;height:20%;background:linear-gradient(180deg,rgba(0,0,0,0.3),transparent);z-index:1}
  </style></head><body>
    <div class="cover">
      <div class="image-layer">${bgLayer}</div>
      <div class="top-band"></div>
      <div class="top-band-fade"></div>
      <div class="bottom-band"></div>
      <div class="bottom-band-fade"></div>
      <div class="accent-stripe"></div>
      <div class="accent-stripe-bottom"></div>
      <div class="mid-fade"></div>
      <div class="title-block">
        <h1 class="title">${wrapTitle(title, 18)}</h1>
        ${subtitle ? `<p class="subtitle">${esc(subtitle)}</p>` : ""}
      </div>
      ${author ? `<div class="author-block"><div class="author-dot"></div><div class="author">${esc(author)}</div></div>` : ""}
    </div>
  </body></html>`;
}

export function coverHtml(opts: {
  genre: CoverGenre;
  layout: ConceptLayout;
  title: string;
  subtitle?: string;
  author?: string;
  bg: CoverBg;
  accentColor?: string;
}): string {
  const g = GENRE_TYPO[opts.genre];
  const accentColor = opts.accentColor ?? g.accentBar;
  const shared = { g, genre: opts.genre, title: opts.title, subtitle: opts.subtitle, author: opts.author, bg: opts.bg, accentColor };

  switch (opts.layout) {
    case "typographyFirst":  return layoutTypographyFirst(shared);
    case "modernCommercial": return layoutModernCommercial(shared);
    default:                 return layoutFullImage(shared);
  }
}
