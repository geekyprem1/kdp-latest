import { NextRequest, NextResponse } from "next/server";
import { buildInteriorPdf, buildCoverPdf } from "@/lib/pdf";
import { PRODUCTION_DEFAULTS } from "@/lib/config/defaults";
import {
  resolveConfig,
  generatePuzzles,
  buildInteriorPages,
  type Difficulty,
} from "@/lib/generators/word-search";

// Puppeteer needs the Node runtime (not edge).
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

const DIFFICULTIES: Difficulty[] = ["easy", "medium", "hard"];

function clamp(n: unknown, min: number, max: number, fallback: number): number {
  const v = Number(n);
  if (!Number.isFinite(v)) return fallback;
  return Math.min(max, Math.max(min, Math.round(v)));
}

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const theme = typeof body.theme === "string" ? body.theme.trim() : "";
  if (!theme) {
    return NextResponse.json({ error: "theme is required" }, { status: 400 });
  }

  const part = body.part === "cover" ? "cover" : "interior";
  const difficulty: Difficulty = DIFFICULTIES.includes(body.difficulty as Difficulty)
    ? (body.difficulty as Difficulty)
    : "medium";

  const cfg = resolveConfig({
    theme,
    difficulty,
    puzzleCount: clamp(body.puzzleCount, 1, 50, 20),
    gridSize: clamp(body.gridSize, 8, 20, 15),
    wordsPerPuzzle: clamp(body.wordsPerPuzzle, 4, 20, 12),
  });

  // Interior layout = title + instructions + N puzzles + divider + N solutions.
  // KDP rejects books under 24 pages, so guard before doing any rendering work.
  const projectedPages = 2 * cfg.puzzleCount + 3;
  if (projectedPages < 24) {
    const minPuzzles = Math.ceil((24 - 3) / 2);
    return NextResponse.json(
      {
        error: `This would produce ${projectedPages} pages; Amazon KDP requires at least 24. Use at least ${minPuzzles} puzzles.`,
      },
      { status: 400 }
    );
  }

  try {
    const puzzles = generatePuzzles(cfg);
    const pages = buildInteriorPages(cfg, puzzles);
    const pageCount = pages.length;

    const trim = PRODUCTION_DEFAULTS.trim;
    const bleed = PRODUCTION_DEFAULTS.bleed;

    let pdf: Uint8Array;
    let filename: string;
    const slug = cfg.theme.toLowerCase().replace(/[^a-z0-9]+/g, "-");

    if (part === "cover") {
      const cover = await buildCoverPdf({
        trim,
        pageCount,
        paper: PRODUCTION_DEFAULTS.paper,
        content: {
          title: cfg.title,
          subtitle: cfg.subtitle,
          author: cfg.author,
          backText: `${cfg.puzzleCount} ${cfg.theme.toLowerCase()} word search puzzles with a complete answer key.`,
        },
      });
      pdf = cover.pdf;
      filename = `${slug}-word-search-cover.pdf`;
    } else {
      const interior = await buildInteriorPdf({ trim, pageCount, bleed }, pages);
      pdf = interior.pdf;
      filename = `${slug}-word-search-interior.pdf`;
    }

    return new NextResponse(Buffer.from(pdf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("word-search generation failed:", err);
    return NextResponse.json({ error: "Generation failed" }, { status: 500 });
  }
}
