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

/** Three distinct layout treatments → three distinct cover concepts. */
export type ConceptLayout = "centered" | "topBand" | "lowerThird";
export const CONCEPT_LAYOUTS: ConceptLayout[] = ["centered", "topBand", "lowerThird"];
export const CONCEPT_LABELS: Record<ConceptLayout, string> = {
  centered: "Centered Classic",
  topBand: "Top Banner",
  lowerThird: "Lower Third",
};

export interface CoverInput {
  title: string;
  subtitle?: string;
  author?: string;
  genre: CoverGenre;
  mood?: string;
  artStyle?: string;
  audience?: string;
  trim?: string; // e.g. 6x9
}

export interface CoverBrief {
  imagePrompt: string;
  layout: string;
  typography: string;
  model: string;
}

export interface CoverConcept {
  layout: ConceptLayout;
  seed: number;
  score: number; // 0-100 estimated quality/legibility
}

export interface BuiltConcept {
  concept: CoverConcept;
  bytes: Uint8Array;
}

export interface CoverResult {
  brief: CoverBrief;
  concepts: BuiltConcept[];
}
