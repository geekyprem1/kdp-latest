/**
 * Storybook POC image generation.
 *
 * - Reference image: FLUX Schnell (text-to-image), the locked character anchor.
 * - Scene images: FLUX Kontext (image-to-image), conditioned on the reference so
 *   the SAME character appears in each new scene.
 *
 * Offline (no REPLICATE_API_TOKEN): deterministic colored placeholders so the
 * harness/report runs — but this is NOT a real consistency proof.
 */

import { renderPng } from "../../pdf/render";

const SCHNELL = "black-forest-labs/flux-schnell";
const KONTEXT = process.env.STORY_KONTEXT_MODEL || "black-forest-labs/flux-kontext-pro";

export function isReplicateConfigured(): boolean {
  return Boolean(process.env.REPLICATE_API_TOKEN);
}

export const KONTEXT_MODEL = KONTEXT;

interface Prediction {
  status: string;
  output?: string[] | string;
  error?: string;
  urls?: { get?: string };
}

async function replicateRun(model: string, input: Record<string, unknown>): Promise<Uint8Array> {
  const token = process.env.REPLICATE_API_TOKEN!;
  const res = await fetch(`https://api.replicate.com/v1/models/${model}/predictions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Prefer: "wait",
    },
    body: JSON.stringify({ input }),
  });
  if (!res.ok) throw new Error(`Replicate ${model} ${res.status}: ${(await res.text()).slice(0, 200)}`);

  let pred = (await res.json()) as Prediction;
  for (let i = 0; pred.status !== "succeeded" && pred.urls?.get && i < 60; i++) {
    if (pred.status === "failed" || pred.status === "canceled") break;
    await new Promise((r) => setTimeout(r, 1500));
    pred = (await (await fetch(pred.urls.get, { headers: { Authorization: `Bearer ${token}` } })).json()) as Prediction;
  }
  if (pred.status !== "succeeded") throw new Error(`Replicate ${model} failed: ${pred.error ?? pred.status}`);

  const url = Array.isArray(pred.output) ? pred.output[0] : pred.output;
  if (!url) throw new Error(`Replicate ${model} returned no image`);
  return new Uint8Array(await (await fetch(url)).arrayBuffer());
}

export function toDataUri(bytes: Uint8Array): string {
  return `data:image/png;base64,${Buffer.from(bytes).toString("base64")}`;
}

/** Master character reference (text-to-image). */
export async function generateReference(opts: { prompt: string; seed: number }): Promise<Uint8Array> {
  if (!isReplicateConfigured()) return placeholder(opts.seed, "reference");
  return replicateRun(SCHNELL, {
    prompt: opts.prompt,
    aspect_ratio: "1:1",
    output_format: "png",
    megapixels: "1",
    seed: opts.seed,
  });
}

/** Scene image conditioned on the reference (FLUX Kontext image-to-image). */
export async function generateScene(opts: {
  prompt: string;
  referenceDataUri: string;
  seed: number;
}): Promise<Uint8Array> {
  if (!isReplicateConfigured()) return placeholder(opts.seed, "scene");
  return replicateRun(KONTEXT, {
    prompt: opts.prompt,
    input_image: opts.referenceDataUri,
    aspect_ratio: "1:1",
    output_format: "png",
    seed: opts.seed,
  });
}

/** Deterministic colored dragon placeholder (green body, yellow belly, red scarf). */
async function placeholder(seed: number, kind: string): Promise<Uint8Array> {
  const sky = kind === "scene" ? `hsl(${(seed * 37) % 360} 60% 88%)` : "#ffffff";
  const html = `<!doctype html><html><head><style>html,body{margin:0}svg{display:block;width:100vw;height:100vh}</style></head><body>
    <svg viewBox="0 0 600 600" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">
      <rect width="600" height="600" fill="${sky}"/>
      <ellipse cx="300" cy="340" rx="150" ry="170" fill="#2e8b57" stroke="#14532d" stroke-width="6"/>
      <ellipse cx="300" cy="380" rx="80" ry="110" fill="#ffe066" stroke="#caa000" stroke-width="4"/>
      <rect x="210" y="250" width="180" height="34" rx="16" fill="#e23b3b" stroke="#9b1c1c" stroke-width="4"/>
      <circle cx="265" cy="210" r="18" fill="#fff" stroke="#14532d" stroke-width="4"/>
      <circle cx="335" cy="210" r="18" fill="#fff" stroke="#14532d" stroke-width="4"/>
      <circle cx="265" cy="212" r="7" fill="#111"/><circle cx="335" cy="212" r="7" fill="#111"/>
      <text x="300" y="560" font-family="Arial" font-size="20" text-anchor="middle" fill="#333">PLACEHOLDER · ${kind}</text>
    </svg></body></html>`;
  return renderPng(html, { widthIn: 6, heightIn: 6, dpi: 96 });
}
