# Roadmap

## Phase 0 — Foundations ✅ COMPLETE

- Next.js + TypeScript + Tailwind scaffold
- Environment surface documented (`.env.example`)
- Supabase foundation schema (`profiles`, `credit_transactions`, RLS, signup trigger)
- Supabase clients + Cloudflare R2 client
- Production defaults (`lib/config/defaults.ts`)

## PDF Engine Gate ✅ COMPLETE (pending Amazon KDP validation)

- KDP spec engine (`lib/pdf/kdp-specs.ts`): trim, bleed, gutter, spine
- Interior + cover templates, Puppeteer renderer
- `npm run gate:generate` + `npm run gate:verify`
- Geometry verification: **passing** (6×9, 100pp; fonts embedded)
- ⏳ **Remaining:** human uploads `output/interior-6x9.pdf` + `output/cover-6x9.pdf`
  to KDP and confirms Launch Previewer acceptance. This is the authoritative
  sign-off; everything below assumes it passes.

Milestone tag: **`v0.1-pdf-gate`**

## Phase 2 — Word Search Generator ✅ COMPLETE (end-to-end)

Complete vertical slice: **Input → Puzzle Generation → PDF → Download**.

- [x] Deterministic (seeded) word-search algorithm — `lib/generators/word-search/`
- [x] Theme-based word lists, no AI image generation — curated word banks
- [x] Puzzle pages + solution pages (answer key with highlighted grid)
- [x] PDF export through the existing KDP engine (8.5×11, no-bleed)
- [x] Input form + download — `/word-search` + `/api/word-search/generate`

Validated: deterministic across runs, 0 skipped placements (longest-first),
interior exactly 8.5×11, fonts embedded, real HTTP path renders via Puppeteer in
the Next server. Run `npm run ws:generate` for the CLI check.

> ⏳ As with all printed output, the authoritative final check is a KDP previewer
> upload of a generated word-search interior + cover.

No Sudoku, Maze, Coloring, Billing, Stripe, Templates, or Admin was started —
Word Search first, as instructed.

## Later (locked until Word Search ships)

- Phase 3 — Sudoku generator (reuse pipeline; solver-verified)
- Phase 4 — Maze generator
- Phase 5 — Planners
- Phase 6 — Coloring Books (Replicate FLUX; **enables bleed by default for this type**)
- Phase 7 — AI text via OpenRouter (metadata) + Trigger.dev async jobs
- Phase 8 — Billing (Stripe + JVZoo/W+), credits, OTO gating
- Phase 9 — Templates (OTO3), Admin dashboard, hardening

## Production defaults (current)

- No bleed = **true** (bleed kept in engine, off until Coloring)
- Trim = **8.5×11**
- Book types = Word Search / Sudoku / Maze
