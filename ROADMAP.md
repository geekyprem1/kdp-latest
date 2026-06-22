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

## Phase 2 — Word Search Generator 🚧 IN PROGRESS

Complete vertical slice: **Input → Puzzle Generation → PDF → Download**.

- [ ] Deterministic (seeded) word-search algorithm
- [ ] Theme-based word lists (no AI image generation)
- [ ] Puzzle pages + solution pages
- [ ] PDF export through the existing KDP engine
- [ ] Input form + download (end-to-end)

No Sudoku, Maze, Coloring, Billing, Stripe, Templates, or Admin until Word Search
works end-to-end.

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
