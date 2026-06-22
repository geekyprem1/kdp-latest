/** Book types the engine can recommend for a niche. */
export type NicheBookType =
  | "word_search"
  | "sudoku"
  | "maze"
  | "planner"
  | "coloring"
  | "story";

export const BOOK_TYPE_LABELS: Record<NicheBookType, string> = {
  word_search: "Word Search",
  sudoku: "Sudoku",
  maze: "Maze",
  planner: "Planner",
  coloring: "Coloring Book",
  story: "Story Book",
};

export const ALL_BOOK_TYPES: NicheBookType[] = [
  "word_search",
  "sudoku",
  "maze",
  "planner",
  "coloring",
  "story",
];

/** Raw 0–100 factor estimates (from the AI), used by the scoring engine. */
export interface NicheFactors {
  searchDemand: number;
  competition: number; // higher = more competition = worse
  evergreen: number;
  expansion: number;
  kdpSuitability: number;
}

export type OpportunityBand = "Low" | "Medium" | "High" | "Excellent";

export interface NicheIdea {
  niche: string;
  factors: NicheFactors;
  seasonal: string;
  monetization: string;
  recommendedBookType: NicheBookType;
  bookTypes: NicheBookType[];
  /** Computed locally by the scoring engine. */
  opportunityScore: number;
  band: OpportunityBand;
}

export interface NicheReportInput {
  keyword: string;
  audience?: string;
  category?: string;
  country?: string;
}

export interface NicheReport extends NicheReportInput {
  id: string;
  model: string | null;
  ideas: NicheIdea[];
  created_at: string;
}
