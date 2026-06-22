# Roadmap

## Phase 0 — Foundations ✅ COMPLETE

- Next.js + TypeScript + Tailwind scaffold
- Environment surface documented (`.env.example`)
- Supabase foundation schema (`profiles`, `credit_transactions`, RLS, signup trigger)
- Supabase clients + Cloudflare R2 client
- Production defaults (`lib/config/defaults.ts`)

## PDF Engine Gate ✅ COMPLETE — KDP-VALIDATED

- KDP spec engine (`lib/pdf/kdp-specs.ts`): trim, bleed, gutter, spine
- Interior + cover templates, Puppeteer renderer
- `npm run gate:generate` + `npm run gate:verify`
- Geometry verification: **passing**; fonts embedded
- ✅ **Validated on Amazon KDP Print Previewer** (8.5×11 word search books):
  cover + interior accepted with no errors, **Approve** enabled. The earlier
  "text/object outside the margins" rejection was fixed (footer position, ADR-008).

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

> ✅ KDP-validated: generated word-search interiors + covers pass the KDP Print
> Previewer with no errors.

**Sample books** — 3 production-quality books (Dinosaur / Halloween / Christmas,
83pp, 8.5×11, no-bleed) in `examples/`, passing automated checks **and the live
KDP Print Previewer** (Approve enabled). `npm run examples:generate` /
`examples:validate`.

## Phase 2.5 — MVP SaaS around Word Search ✅ COMPLETE

The end-to-end product flow: **Login → Create Word Search Book → Download KDP PDF.**

- [x] **Auth** — Supabase Auth (Google OAuth + email magic link), session via
  `@supabase/ssr`, `/dashboard` gated by `proxy.ts`
- [x] **Dashboard** — Overview, Create Book, My Books, Download History
- [x] **Generator UI** — theme, difficulty, page/puzzle count, book title, generate
- [x] **Book storage** — books + metadata in Supabase, PDFs in Cloudflare R2
  (private bucket, signed download URLs, download logging)
- [x] **OpenRouter** — Gemini 2.5 Flash primary → DeepSeek fallback, custom word
  lists for any niche (graceful fallback to curated banks if unconfigured)
- [x] **Metadata generator** — title, subtitle, description, 7 keywords (AI, with
  deterministic template fallback)

DB: `supabase/migrations/0002_books.sql` (`books`, `book_metadata`, `downloads`, RLS).
Generation runs **synchronously** in the API route (no images → fast enough);
Trigger.dev async jobs remain deferred until heavier book types (ADR-009).

## Later

- Phase 3 — Sudoku generator (reuse pipeline; solver-verified)
- Phase 4 — Maze generator
- Phase 5 — Planners
- Phase 6 — Coloring Books (Replicate FLUX; **enables bleed by default for this type**)
- Phase 7 — Trigger.dev async jobs (for image-heavy generation)
- Phase 8 — Billing (Stripe + JVZoo/W+), credits, OTO gating
- Phase 9 — Templates (OTO3), Admin dashboard, hardening

## Production defaults (current)

- No bleed = **true** (bleed kept in engine, off until Coloring)
- Trim = **8.5×11**
- Book types = Word Search / Sudoku / Maze
