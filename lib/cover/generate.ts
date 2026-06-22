/**
 * Cover generation orchestrator: AI brief → 3 FLUX background variations →
 * crisp typeset composite. Without a Replicate token, falls back to gradient
 * backgrounds so the module still works (and still produces real covers).
 */

import { renderPng } from "../pdf/render";
import { fluxSchnell, isReplicateConfigured } from "../ai/replicate";
import { generateCoverBrief } from "./prompt";
import { coverHtml, categoryOf, type CoverBg } from "./templates";
import type { CoverInput, CoverResult } from "./types";

const GRADIENTS: Array<[string, string]> = [
  ["#1e3a8a", "#3b82f6"],
  ["#7c2d12", "#ea580c"],
  ["#065f46", "#10b981"],
  ["#581c87", "#a855f7"],
  ["#831843", "#ec4899"],
];

const SEEDS = [101, 202, 303];

const dataUri = (b: Uint8Array) => `data:image/png;base64,${Buffer.from(b).toString("base64")}`;

export async function buildCovers(input: CoverInput): Promise<CoverResult> {
  const brief = await generateCoverBrief(input);
  const category = categoryOf(input.bookType);
  const live = isReplicateConfigured();

  const fullPrompt = [brief.imagePrompt, input.artStyle, input.mood ? `${input.mood} mood` : ""]
    .filter(Boolean)
    .join(", ");

  const variations = await Promise.all(
    SEEDS.map(async (seed, i): Promise<Uint8Array> => {
      let bg: CoverBg;
      if (live) {
        try {
          const art = await fluxSchnell({ prompt: fullPrompt, seed, aspectRatio: "2:3" });
          bg = { kind: "image", dataUri: dataUri(art) };
        } catch {
          const [c1, c2] = GRADIENTS[i % GRADIENTS.length];
          bg = { kind: "gradient", c1, c2 };
        }
      } else {
        const [c1, c2] = GRADIENTS[i % GRADIENTS.length];
        bg = { kind: "gradient", c1, c2 };
      }
      const html = coverHtml({
        category,
        title: input.title,
        subtitle: input.subtitle,
        author: input.author,
        bg,
      });
      return renderPng(html, { widthIn: 6, heightIn: 9, dpi: 200 });
    })
  );

  return { brief, variations };
}
