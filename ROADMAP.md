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

## Phase 2.6 — Niche Research Engine ✅ COMPLETE

Find profitable KDP niches before generating books.

- [x] Sidebar **Niche Research** + research form (keyword, audience, category, country)
- [x] OpenRouter (Gemini → DeepSeek) → 20 niche ideas with demand/competition
  estimates, seasonal + monetization notes, recommended book type
- [x] **Opportunity scoring engine** (0–100, deterministic): 30% demand +
  25% (100−competition) + 15% evergreen + 15% expansion + 15% KDP fit →
  Low / Medium / High / Excellent
- [x] Per-niche book recommendations (Word Search / Sudoku / Maze / Planner /
  Coloring / Story)
- [x] One-click **Create Word Search Book** (prefills the generator)
- [x] Saved reports (`niche_reports`, RLS) — reopen any past research
- [x] **Export report as PDF** (multi-page, via the existing PDF engine)

DB: `0004_niche_reports.sql`. Verified live: Gemini returned 20 scored, sorted
ideas in ~14s.

## Phase 3 — Sudoku Generator ✅ COMPLETE

Second generator, matching Word Search quality, reusing the KDP PDF engine.

- [x] "Sudoku" added to Create Book flow (Word Search unchanged)
- [x] 4 difficulties (Easy/Medium/Hard/Expert) by clue count
- [x] Deterministic (seed → identical puzzle) + **guaranteed unique solution**
  (clues removed only while uniqueness holds; solver-verified)
- [x] Book structure: title → instructions → puzzles → solutions → end page
- [x] Solution pages (givens bold, answers gray)
- [x] Metadata via OpenRouter (generalized for book type)
- [x] Storage + download flow reused (Supabase / R2-ready)
- [x] Validation suite: `npm run test:sudoku` (determinism, uniqueness, solution
  correctness, min page count, PDF generation) — 6/6 passing

No new DB migration (reuses `books`/`book_metadata`/`downloads`).

## Phase 4 — Maze Generator ✅ COMPLETE

Third generator, matching Word Search / Sudoku quality, reusing the KDP PDF engine.

- [x] "Maze" added to Create Book flow (Word Search + Sudoku unchanged)
- [x] 4 difficulties (Easy/Medium/Hard/Expert) by grid size (12→30)
- [x] Deterministic recursive-backtracking ("perfect maze" → exactly one path)
- [x] Solvable by construction; BFS-verified solution; START (top-left) /
  FINISH (bottom-right) openings clearly marked
- [x] Book structure: title → instructions → mazes → solutions → end page
- [x] Solution pages overlay the solved path (SVG)
- [x] Metadata via OpenRouter (book-type aware); storage + download reused
- [x] Validation suite: `npm run test:maze` (determinism, solvability, path
  correctness, min page count, PDF generation) — 5/5 passing

No new DB migration (reuses `books`/`book_metadata`/`downloads`).

## Phase 5 — Coloring Book Generator ✅ COMPLETE

First AI-image book type. Bleed-enabled (edge-to-edge art).

- [x] "Coloring Book" added to Create Book flow (other types unchanged)
- [x] Inputs: theme, age group, page count, style
- [x] AI image pipeline: **Replicate FLUX Schnell** (`lib/generators/coloring/image.ts`),
  deterministic by seed; offline placeholder fallback when no token
- [x] Prompt builder bakes in line-art constraints (B/W, thick outlines, no
  shading/grayscale, white background, printable)
- [x] Image validation: rejects gray backgrounds, filled-black regions, color,
  and shading (pixel analysis via pngjs), with retry
- [x] Full-bleed coloring pages (`fullBleed` interior pages, bleed = on)
- [x] Book structure: title → coloring pages → end page
- [x] Metadata via OpenRouter; storage + download reused
- [x] Validation suite: `npm run test:coloring` — 8/8 passing (offline)

> Real AI sample books need `REPLICATE_API_TOKEN`: `npm run coloring:samples`
> generates Dinosaur / Unicorn / Halloween. (Image DPI is bounded by FLUX
> Schnell's ~1MP output — fine for line art; upscaling is a future enhancement.)

## Storybook POC ✅ COMPLETE (proof harness)

Character-consistency proof harness (`npm run story:poc`): character bible +
locked reference (FLUX Schnell) + 6 scenes (FLUX Kontext, reference-conditioned)
+ Gemini vision consistency judge + visual report + cost/time. Verified offline;
real proof needs `REPLICATE_API_TOKEN`. Full Storybook **paused** pending the
proof. Design: [STORYBOOK_ARCHITECTURE.md](STORYBOOK_ARCHITECTURE.md).

## Next — Ebook & Opportunity blueprint (design done)

See [EBOOK_BLUEPRINT.md](EBOOK_BLUEPRINT.md). Re-sequenced to differentiate from
"KDP Master" (opportunity-first, quality-gated, multi-format):

- **Phase 6 — Book Opportunity Engine** ✅ COMPLETE — shared `lib/opportunity`
  (Demand/Competition/Evergreen/Monetization → Opportunity composite + band +
  recommended book types incl. ebook); Niche Research repointed to it;
  `books.opportunity` snapshot column (migration `0005`); `npm run test:opportunity`
  (6/6). Inline-in-Create wiring lands with Phase 7.
- **Phase 7 — Unified Create wizard** ✅ COMPLETE — one 4-step flow (Topic →
  Opportunity analysis → Choose Type w/ Recommended/Good/Not-Recommended badges →
  dynamic Configure → Generate). New `POST /api/opportunity` (single-topic
  analysis via `lib/ai/analyzeTopic`); opportunity snapshot saved on every book
  (`books.opportunity`); Ebook selectable + configurable (generation returns
  "coming next"); Storybook shown as Coming Soon. Reuses all generators + engine.
- **Phase 8 — Async infra** ⏳ deferred — Ebook runs **synchronously**
  (concurrency-limited chapter writes, ~1–3 min) which is fine for text-only
  generation; revisit Trigger.dev when image-heavy types (Storybook) need it.
- **Phase 9 — Ebook Creator** ✅ COMPLETE — opportunity-first, editable:
  - outline (`lib/ai/outline`) → voice/outline-locked chapter writer
    (`lib/ai/chapter`, bounded concurrency) → per-chapter **rewrite / expand /
    shorten** in an editor
  - metadata (ebook-aware) + **typographic cover** (`lib/generators/ebook/cover`,
    no image model needed)
  - exports: **PDF** (reflowable 6×9 + TOC), **EPUB3** (JSZip), **DOCX** (docx) —
    all built on demand from stored chapters (`lib/export/*`)
  - DB: `ebook_chapters` (migration `0006`); chapters stored, opportunity snapshot
    saved; routes `POST /api/ebook`, `POST /api/ebook/[id]/chapter`,
    `GET /api/ebook/[id]/export`; editor at `/dashboard/ebook/[id]`
  - Verified live: 3-chapter ebook in ~19s, valid PDF/EPUB/DOCX + cover, rewrite works
- **Background generation (Book In Progress)** ✅ COMPLETE — `generation_jobs`
  (migration `0011`) + `lib/jobs/` (runner/queue/progress). `/api/books` &
  `/api/ebook` enqueue + return immediately; wizard → `/dashboard/in-progress`.
  Progress bar, per-type timeline, Resume/Retry/Cancel/Delete, queued-job
  recovery, dashboard widgets + completion notifications. Option 1 (same-server
  async) with **atomic job claim** + optional polling worker (`npm run worker`)
  for restart resilience (no Trigger.dev). Generators untouched; Storybook-ready
  via a new job_type.
- **Author & Publishing Profile** ✅ COMPLETE — per-user defaults
  (author/pen/publisher/language/trim/price/AI-disclosure/copyright) on `profiles`
  (migration `0010`); `/dashboard/settings`. Inherited by every book (author via
  the generator's existing option) and its publish package (publisher, language,
  copyright, price, disclosure). Generators untouched. Cover Generator already
  shipped.
- **KDP Publish Package** ✅ COMPLETE — `lib/publishing/`: per book →
  metadata.json, keywords.txt (7 primary + 20 long-tail), description.txt,
  categories.txt, book_titles.txt (10), publish_checklist.txt + interior/cover →
  downloadable ZIP. `book_publish_packages` (migration `0009`); section on the
  book detail page. Works for all 5 book types. Generators untouched.
- **Bundle Generator** ✅ COMPLETE — one topic → multi-book bundle. Opportunity
  Engine recommends the mix; the shared book pipeline (`lib/books/pipeline.ts`,
  also now used by `/api/books`) generates each via the existing generators;
  bundles (`bundles` + `books.bundle_id`, migration `0008`); ZIP + individual
  export; data-driven recommended publishing order. No duplicate generator code.
- **Premium Cover Generator** ✅ COMPLETE — genre-aware (6 genres) layouts, 3
  distinct scored concepts, AI brief + FLUX background, per-concept regenerate,
  cover history, use-for-book, PNG + KDP cover PDF (`covers` migration `0012`).
- **Cover Generator** ✅ COMPLETE (standalone) — `lib/cover/`: AI brief
  (OpenRouter) + FLUX background + crisp typeset overlay → 3 variations; smart
  per-type templates; library (`covers`, migration `0007`); Download PNG / Use
  for Book. Existing generators untouched.
- **Phase 10 — Storybook** (resume; reuses cover + Opportunity; needs async) ⏳
- **Later** — Series planner, A+ content, Planners, Billing/Credits, Admin, Agency

## Production defaults (current)

- No bleed = **true** (bleed kept in engine, off until Coloring)
- Trim = **8.5×11**
- Book types = Word Search / Sudoku / Maze
