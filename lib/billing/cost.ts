/**
 * Dynamic, usage-based credit costs. Pure functions — no DB, no provider.
 */

export type CostableAction =
  | "market_intelligence"
  | "cover"
  | "word_search"
  | "sudoku"
  | "maze"
  | "coloring"
  | "ebook";

export interface CostInput {
  count?: number; // puzzles / pages
  chapterCount?: number; // ebook
}

export function costFor(action: CostableAction, input: CostInput = {}): number {
  switch (action) {
    case "market_intelligence":
    case "cover":
      return 1;
    case "word_search":
    case "sudoku":
      return 1 + Math.ceil((input.count ?? 25) / 25);
    case "maze":
      return 1 + Math.ceil((input.count ?? 30) / 25);
    case "coloring":
      return 2 + Math.ceil((input.count ?? 24) / 5); // 1 credit / 5 images
    case "ebook":
      return 2 + (input.chapterCount ?? 10); // 1 credit / chapter
    default:
      return 1;
  }
}

/** Bundle cost = sum of each component book's cost (default counts). */
export function bundleCost(types: CostableAction[]): number {
  const DEFAULT: Record<string, CostInput> = {
    word_search: { count: 25 },
    sudoku: { count: 30 },
    maze: { count: 30 },
    coloring: { count: 24 },
  };
  return types.reduce((sum, t) => sum + costFor(t, DEFAULT[t] ?? {}), 0);
}
