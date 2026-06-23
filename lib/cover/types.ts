export type CoverGenre =
  | "business"
  | "self_help"
  | "puzzle"
  | "kids"
  | "coloring"
  | "fiction";

export const COVER_GENRES: CoverGenre[] = ["business", "self_help", "puzzle", "kids", "coloring", "fiction"];

export const COVER_GENRE_LABELS: Record<CoverGenre, string> = {
  business: "Business",
  self_help: "Self Help",
  puzzle: "Puzzle Book",
  kids: "Kids Book",
  coloring: "Coloring Book",
  fiction: "Fiction",
};

/**
 * V2 — three genuinely different cover concepts:
 *  fullImage   : cinematic full-bleed image, large title, professional hierarchy
 *  typographyFirst : bestseller title-block dominant, minimal image, thumbnail-readable
 *  modernCommercial: image + strong design band — modern KDP commercial style
 */
export type ConceptLayout = "fullImage" | "typographyFirst" | "modernCommercial";
export const CONCEPT_LAYOUTS: ConceptLayout[] = ["fullImage", "typographyFirst", "modernCommercial"];
export const CONCEPT_LABELS: Record<ConceptLayout, string> = {
  fullImage: "Premium Full Image",
  typographyFirst: "Bestseller Typography",
  modernCommercial: "Modern Commercial",
};

export interface CoverInput {
  title: string;
  subtitle?: string;
  author?: string;
  genre: CoverGenre;
  mood?: string;
  artStyle?: string;
  audience?: string;
  niche?: string;
  opportunityScore?: number;
  trim?: string;
}

export interface CoverBrief {
  imagePrompt: string;
  accentColor: string;   // hex, pulled from genre palette
  layout: string;
  typography: string;
  model: string;
}

/** Detailed breakdown returned alongside the overall score. */
export interface ScoreBreakdown {
  titleReadability: number;    // 0–25
  subtitleReadability: number; // 0–20
  authorVisibility: number;    // 0–15
  visualBalance: number;       // 0–20
  genreMatch: number;          // 0–10
  commercialPotential: number; // 0–10
  overall: number;             // 0–100
}

export interface CoverConcept {
  layout: ConceptLayout;
  seed: number;
  score: number;           // overall 0-100 for backward compat
  breakdown: ScoreBreakdown;
}

export interface BuiltConcept {
  concept: CoverConcept;
  bytes: Uint8Array;
}

export interface CoverResult {
  brief: CoverBrief;
  concepts: BuiltConcept[];
}
