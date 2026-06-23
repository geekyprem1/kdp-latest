/**
 * KDF Mafia plans + feature gating. Plans and features are provider-agnostic —
 * payment processors never appear here.
 */

export type PlanKey = "free" | "starter" | "pro" | "publisher" | "factory" | "agency";

export type Feature =
  | "market_intelligence"
  | "word_search"
  | "sudoku"
  | "maze"
  | "launch_kit"
  | "coloring"
  | "cover"
  | "ebook"
  | "factory";

export interface Plan {
  key: PlanKey;
  name: string;
  price: number; // USD, 0 for free
  type: "free" | "one_time" | "subscription";
  monthlyCredits: number;
  tier: number; // higher unlocks more
  blurb: string;
}

export const PLANS: Record<PlanKey, Plan> = {
  free: { key: "free", name: "Free Trial", price: 0, type: "free", monthlyCredits: 10, tier: 1, blurb: "Try the core generators" },
  starter: { key: "starter", name: "KDF Mafia Starter", price: 15, type: "one_time", monthlyCredits: 50, tier: 1, blurb: "The fastest way to start a KDP business" },
  pro: { key: "pro", name: "KDF Mafia Pro", price: 37, type: "one_time", monthlyCredits: 300, tier: 2, blurb: "Coloring books + premium covers" },
  publisher: { key: "publisher", name: "KDF Mafia Publisher", price: 67, type: "one_time", monthlyCredits: 1000, tier: 3, blurb: "Ebooks + multi-format export" },
  factory: { key: "factory", name: "KDF Mafia Factory", price: 97, type: "one_time", monthlyCredits: 2500, tier: 4, blurb: "Bulk + bundle production" },
  agency: { key: "agency", name: "KDF Mafia Agency", price: 197, type: "one_time", monthlyCredits: 100000, tier: 5, blurb: "Unlimited projects, priority queue" },
};

export const PLAN_ORDER: PlanKey[] = ["free", "starter", "pro", "publisher", "factory", "agency"];

/** Minimum plan tier required to use each feature. */
export const FEATURE_TIER: Record<Feature, number> = {
  market_intelligence: 1,
  word_search: 1,
  sudoku: 1,
  maze: 1,
  launch_kit: 1,
  coloring: 2,
  cover: 2,
  ebook: 3,
  factory: 4,
};

export function planByKey(key: string | null | undefined): Plan {
  return PLANS[(key as PlanKey) ?? "free"] ?? PLANS.free;
}

/** Map a plan_name (as stored on a subscription) back to its key. */
export function planKeyFromName(name: string): PlanKey {
  const found = PLAN_ORDER.find((k) => PLANS[k].name === name);
  return found ?? "free";
}

export function canUseFeature(planKey: PlanKey, feature: Feature): boolean {
  return PLANS[planKey].tier >= FEATURE_TIER[feature];
}

/** The lowest plan that unlocks a feature (for upgrade prompts). */
export function requiredPlanFor(feature: Feature): Plan {
  const tier = FEATURE_TIER[feature];
  const key = PLAN_ORDER.find((k) => PLANS[k].tier >= tier && PLANS[k].type !== "free") ?? "pro";
  return PLANS[key];
}
