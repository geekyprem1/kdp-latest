/**
 * Provider orchestration: try the primary model, fall back to the next on error,
 * timeout, or schema-validation failure. All text generation goes through here.
 */

import { openRouterChat } from "./openrouter";
import { modelChain } from "./models";
import type { GenerateOptions, GenerateResult, JsonResult } from "./types";

const DEFAULT_TIMEOUT_MS = 30_000;

export async function generateText(opts: GenerateOptions): Promise<GenerateResult> {
  let lastErr: unknown;
  for (const model of modelChain()) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);
    try {
      const text = await openRouterChat({
        model,
        messages: [
          ...(opts.system ? [{ role: "system" as const, content: opts.system }] : []),
          { role: "user" as const, content: opts.prompt },
        ],
        temperature: opts.temperature,
        maxTokens: opts.maxTokens,
        signal: controller.signal,
      });
      return { text, model };
    } catch (err) {
      lastErr = err;
      console.warn(`[ai] model ${model} failed, trying next:`, (err as Error).message);
    } finally {
      clearTimeout(timer);
    }
  }
  throw new Error(`All models failed: ${(lastErr as Error)?.message ?? "unknown"}`);
}

/** Extract the first JSON object/array from a model response. */
function extractJson(text: string): unknown {
  const trimmed = text.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const match = trimmed.match(/[[{][\s\S]*[\]}]/);
    if (!match) throw new Error("No JSON found in model response");
    return JSON.parse(match[0]);
  }
}

/**
 * Generate structured JSON. `validate` must return the typed value or throw;
 * a validation failure triggers the fallback model (same as a network error).
 */
export async function generateJson<T>(opts: {
  system?: string;
  prompt: string;
  validate: (raw: unknown) => T;
  temperature?: number;
  maxTokens?: number;
}): Promise<JsonResult<T>> {
  let lastErr: unknown;
  for (const model of modelChain()) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);
    try {
      const text = await openRouterChat({
        model,
        messages: [
          ...(opts.system ? [{ role: "system" as const, content: opts.system }] : []),
          { role: "user" as const, content: opts.prompt },
        ],
        temperature: opts.temperature ?? 0.6,
        maxTokens: opts.maxTokens ?? 1024,
        signal: controller.signal,
      });
      const data = opts.validate(extractJson(text));
      return { data, model };
    } catch (err) {
      lastErr = err;
      console.warn(`[ai] json via ${model} failed, trying next:`, (err as Error).message);
    } finally {
      clearTimeout(timer);
    }
  }
  throw new Error(`All models failed (json): ${(lastErr as Error)?.message ?? "unknown"}`);
}
