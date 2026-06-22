# System Architecture

## Overview

```
Browser (Next.js · Shadcn · Tailwind)
        │ HTTPS
Next.js App (API routes + server components)
        ├── Supabase (Postgres + Auth)
        ├── Cloudflare R2 (asset/PDF storage)
        ├── Stripe (payments)         [later]
        └── Trigger.dev (background jobs)   [later]
                ├── OpenRouter (text: Gemini → DeepSeek)
                ├── Replicate FLUX (images, coloring phase)
                └── Puppeteer (PDF render)
```

## Key decisions (see DECISIONS.md)

- **Async generation** via Trigger.dev — a full book is minutes of work, too long
  for a request. DB-polling worker was rejected.
- **AI text via OpenRouter** behind a provider abstraction (Gemini primary,
  DeepSeek fallback). Claude removed. One key, many models, config-swappable.
- **Algorithmic generators first** (Word Search/Sudoku/Maze) — deterministic, no
  image cost/latency, solver-verifiable. Coloring (FLUX) deferred.
- **PDF Engine Gate** — proven against a real KDP upload before any breadth.

## PDF engine (built)

```
lib/pdf/
├─ kdp-specs.ts        # KDP math: trim, bleed, gutter-by-page-count, spine
├─ render.ts           # Puppeteer → PDF at exact physical size (browser reuse)
├─ templates/
│  ├─ interior.ts      # mirrored-margin interior pages
│  ├─ cover.ts         # wraparound back│spine│front
│  └─ word-search.ts   # puzzle + solution page templates  [Word Search phase]
└─ index.ts            # buildInteriorPdf / buildCoverPdf / buildGateSample
```

The engine is framework-agnostic TypeScript: callable from CLI scripts now and
from API routes / Trigger.dev tasks later.

## Generation pipeline (target)

```
Job created
 → reserve credits (atomic)
 → build content   (algorithmic puzzles, or FLUX images later)
 → generate metadata (OpenRouter)
 → assemble pages   (HTML templates per trim/margins)
 → render PDF       (Puppeteer → interior + cover)
 → store to R2, commit credits, mark complete
 (on failure → refund credits, mark failed)
```

For the current Word Search vertical slice this runs **synchronously inside an
API route** (fast, no images). It moves into Trigger.dev when image generation
and multi-minute jobs arrive.

## AI provider abstraction (planned, deferred)

```
lib/ai/
├─ types.ts        # LLMProvider interface
├─ openrouter.ts   # single OpenRouter client
├─ models.ts       # primary/fallback registry
└─ provider.ts     # primary → fallback, retry, schema-validate, log
```

## Folder structure

```
app/            # Next.js routes (UI + API)
components/      # UI (shadcn)
lib/
  pdf/           # PDF engine (built)
  generators/    # puzzle/coloring generators
  config/        # production defaults
  supabase/      # db/auth clients (built)
  storage/       # R2 client (built)
  ai/            # OpenRouter abstraction (later)
scripts/         # gate + generator CLIs
supabase/migrations/
trigger/         # Trigger.dev tasks (later)
output/          # generated PDFs (gitignored)
```

## Risks

KDP compliance (mitigated by the gate) · Puppeteer in production (dedicated
long-running host / Trigger.dev runtime) · FLUX cost+latency for big coloring
books · structured-output reliability of Gemini/DeepSeek (enforce schema +
fallback) · credit race conditions (atomic ledger) · webhook idempotency.
