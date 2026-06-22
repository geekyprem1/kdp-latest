/**
 * AI niche research via OpenRouter (Gemini → DeepSeek). The model returns niche
 * ideas with raw 0–100 factor estimates + qualitative notes; the opportunity
 * SCORE and band are computed locally by the scoring engine.
 */

import { generateJson } from "./provider";
import { isAiConfigured } from "./models";
import {
  ALL_BOOK_TYPES,
  type NicheBookType,
  type NicheIdea,
  type NicheReportInput,
} from "../niche/types";
import { computeOpportunity, opportunityBand } from "../niche/score";

const clamp = (n: unknown): number => {
  const v = Number(n);
  if (!Number.isFinite(v)) return 50;
  return Math.max(0, Math.min(100, Math.round(v)));
};

const str = (s: unknown, max = 200): string =>
  typeof s === "string" ? s.trim().slice(0, max) : "";

function coerceBookType(v: unknown): NicheBookType | null {
  if (typeof v !== "string") return null;
  const key = v.toLowerCase().replace(/[\s-]+/g, "_");
  return (ALL_BOOK_TYPES as string[]).includes(key) ? (key as NicheBookType) : null;
}

interface RawIdea {
  niche?: unknown;
  searchDemand?: unknown;
  competition?: unknown;
  evergreen?: unknown;
  expansion?: unknown;
  kdpSuitability?: unknown;
  seasonal?: unknown;
  monetization?: unknown;
  recommendedBookType?: unknown;
  bookTypes?: unknown;
}

export interface NicheResearchResult {
  ideas: NicheIdea[];
  model: string;
}

export async function generateNicheResearch(
  input: NicheReportInput
): Promise<NicheResearchResult> {
  if (!isAiConfigured()) {
    throw new Error("Niche research requires OpenRouter (set OPENROUTER_API_KEY).");
  }

  const audience = input.audience?.trim() || "any audience";
  const category = input.category?.trim() || "low-content / puzzle & activity books";
  const country = input.country?.trim() || "the United States";

  const { data, model } = await generateJson<RawIdea[]>({
    system:
      "You are an Amazon KDP market research analyst specializing in low-content and " +
      "puzzle/activity books. You give realistic, grounded estimates. Reply with JSON only.",
    prompt: `Generate exactly 20 distinct, profitable Amazon KDP niche ideas.

Seed topic/keyword: "${input.keyword}"
Target audience: ${audience}
Category focus: ${category}
Market/country: ${country}

For EACH niche, estimate these as integers 0–100 (be realistic and differentiate them):
- searchDemand: how many shoppers search for this
- competition: how saturated it is (higher = more competition)
- evergreen: year-round vs. one-off demand
- expansion: potential for a series / many sub-niches
- kdpSuitability: how well it fits a low-content puzzle/activity book

Also give:
- seasonal: ≤120 char note on seasonality/trend timing
- monetization: ≤120 char note on monetization potential
- recommendedBookType: the single best fit, one of:
  word_search | sudoku | maze | planner | coloring | story
- bookTypes: array of ALL suitable types from that same list (2–4 items)

Return JSON of EXACTLY this shape:
{"ideas":[{"niche":"...","searchDemand":0,"competition":0,"evergreen":0,"expansion":0,"kdpSuitability":0,"seasonal":"...","monetization":"...","recommendedBookType":"word_search","bookTypes":["word_search","coloring"]}]}`,
    temperature: 0.8,
    maxTokens: 4000,
    validate: (raw) => {
      const obj = raw as { ideas?: unknown };
      const list = Array.isArray(obj?.ideas) ? obj.ideas : Array.isArray(raw) ? raw : null;
      if (!list || list.length === 0) throw new Error("no ideas returned");
      return list as RawIdea[];
    },
  });

  const ideas: NicheIdea[] = data
    .map((r): NicheIdea | null => {
      const niche = str(r.niche, 120);
      if (!niche) return null;
      const factors = {
        searchDemand: clamp(r.searchDemand),
        competition: clamp(r.competition),
        evergreen: clamp(r.evergreen),
        expansion: clamp(r.expansion),
        kdpSuitability: clamp(r.kdpSuitability),
      };
      const recommended = coerceBookType(r.recommendedBookType) ?? "word_search";
      const bookTypes = Array.isArray(r.bookTypes)
        ? Array.from(
            new Set(
              r.bookTypes
                .map(coerceBookType)
                .filter((t): t is NicheBookType => t !== null)
            )
          )
        : [];
      if (!bookTypes.includes(recommended)) bookTypes.unshift(recommended);

      const opportunityScore = computeOpportunity(factors);
      return {
        niche,
        factors,
        seasonal: str(r.seasonal, 160) || "—",
        monetization: str(r.monetization, 160) || "—",
        recommendedBookType: recommended,
        bookTypes,
        opportunityScore,
        band: opportunityBand(opportunityScore),
      };
    })
    .filter((x): x is NicheIdea => x !== null)
    .sort((a, b) => b.opportunityScore - a.opportunityScore);

  if (ideas.length === 0) throw new Error("no usable niche ideas");
  return { ideas, model };
}
