/**
 * Cover HTML template.
 *
 * Produces a single full-bleed wraparound cover (back | spine | front) sized
 * exactly to the KDP cover spec. Text is kept inside a safe inset from every
 * trim/fold edge so nothing is clipped by KDP's trimming tolerance.
 */

import type { CoverSpec } from "../kdp-specs";

/** Safe inset (in) from trim edges and spine folds for any text/important art. */
const SAFE_INSET_IN = 0.25;

export interface CoverContent {
  title: string;
  subtitle: string;
  author: string;
  backText: string;
  /** Background color for the full cover (placeholder art for the gate). */
  background?: string;
  spineColor?: string;
}

export function renderCoverHtml(spec: CoverSpec, content: CoverContent): string {
  const bg = content.background ?? "#1f3a5f";
  const spineBg = content.spineColor ?? "#16293f";

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<style>
  @page { size: ${spec.fullWidthIn}in ${spec.fullHeightIn}in; margin: 0; }
  * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  html, body { margin: 0; padding: 0; }
  .cover {
    position: relative;
    width: ${spec.fullWidthIn}in;
    height: ${spec.fullHeightIn}in;
    background: ${bg};
    font-family: Georgia, "Times New Roman", serif;
    color: #fff;
    overflow: hidden;
  }
  .panel { position: absolute; top: 0; height: 100%; }

  /* BACK panel */
  .back {
    left: ${spec.backStartIn}in;
    width: ${spec.panelWidthIn}in;
    padding: ${SAFE_INSET_IN}in;
  }
  .back p { font-size: 11pt; line-height: 1.5; }

  /* SPINE */
  .spine {
    left: ${spec.spineStartIn}in;
    width: ${spec.spineWidthIn}in;
    background: ${spineBg};
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .spine .spine-text {
    transform: rotate(90deg);
    white-space: nowrap;
    font-size: 12pt;
    letter-spacing: 0.02in;
  }

  /* FRONT panel */
  .front {
    left: ${spec.frontStartIn}in;
    width: ${spec.panelWidthIn}in;
    padding: ${SAFE_INSET_IN}in;
    display: flex;
    flex-direction: column;
    justify-content: center;
    text-align: center;
  }
  .front h1 { font-size: 34pt; margin: 0 0 0.15in; }
  .front h2 { font-size: 16pt; font-weight: normal; opacity: 0.9; margin: 0 0 0.6in; }
  .front .author { font-size: 14pt; opacity: 0.95; }
</style>
</head>
<body>
  <div class="cover">
    <div class="panel back">
      <p>${content.backText}</p>
    </div>

    <div class="panel spine">
      ${
        spec.allowsSpineText
          ? `<div class="spine-text">${content.title} &nbsp;&middot;&nbsp; ${content.author}</div>`
          : ""
      }
    </div>

    <div class="panel front">
      <h1>${content.title}</h1>
      <h2>${content.subtitle}</h2>
      <div class="author">${content.author}</div>
    </div>
  </div>
</body>
</html>`;
}
