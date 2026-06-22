export type CoverBookType = "ebook" | "word_search" | "sudoku" | "maze" | "coloring";

export const COVER_BOOK_TYPES: CoverBookType[] = ["ebook", "word_search", "sudoku", "maze", "coloring"];

export const COVER_BOOK_TYPE_LABELS: Record<CoverBookType, string> = {
  ebook: "Ebook",
  word_search: "Word Search",
  sudoku: "Sudoku",
  maze: "Maze",
  coloring: "Coloring Book",
};

export interface CoverInput {
  title: string;
  subtitle?: string;
  author?: string;
  bookType: CoverBookType;
  genre?: string;
  mood?: string;
  artStyle?: string;
  audience?: string;
}

export interface CoverBrief {
  imagePrompt: string; // background ARTWORK prompt (no text)
  layout: string; // human-readable layout suggestion
  typography: string; // human-readable typography suggestion
  model: string;
}

export interface CoverResult {
  brief: CoverBrief;
  variations: Uint8Array[]; // 3 composited cover PNGs
}
