# Decision Log

Architecture decisions, newest first. Each: context → decision → consequences.

## ADR-012 — Sudoku: dig-with-uniqueness-invariant generation
**Context:** Sudoku books must have valid puzzles, each with exactly one solution,
generated deterministically.
**Decision:** Build a full solved grid via seeded backtracking, then remove clues
one at a time, keeping a clue only if the puzzle still has exactly one solution
(`countSolutions(…, limit=2) === 1`, MRV solver). Difficulty = target clue count
(easy 40 → expert 26). The full grid is the guaranteed-unique solution.
Generation reuses the shared PRNG (`lib/util/prng.ts`) so seed → identical puzzle.
**Consequences:** Every emitted puzzle is valid + uniquely solvable by construction
(also asserted at generation time and in `npm run test:sudoku`). The PDF engine,
storage, download, and metadata layers are reused unchanged; `generateMetadata`
gained a `bookType` param and `/api/books` branches on type.

## ADR-011 — Niche scoring: AI estimates factors, app computes the score
**Context:** Niche Research needs a 0–100 opportunity score across several factors.
**Decision:** The AI returns only raw 0–100 factor estimates (demand, competition,
evergreen, expansion, KDP suitability) plus qualitative notes. The opportunity
SCORE and band (Low/Medium/High/Excellent) are computed **deterministically** in
`lib/niche/score.ts` (competition inverted, weighted sum), not by the model.
**Consequences:** Scores are consistent, explainable, and tunable in one place
without re-prompting. Ideas are re-sorted by the computed score before saving.
Reports are stored fully enriched in `niche_reports.ideas` (jsonb) so reopening
and PDF export need no recompute or re-call.

## ADR-010 — Storage: Supabase Storage for MVP, R2 later
**Context:** R2 has unlimited free egress but requires adding a payment method to
enable. For the MVP we want zero extra setup/cost.
**Decision:** Store book PDFs in a private **Supabase Storage** bucket (`books`)
via the service-role client, with short-lived signed download URLs. Put both
providers behind a provider-agnostic `lib/storage/` interface
(`isStorageConfigured` / `bookObjectKey` / `putBookPdf` / `getBookSignedUrl`);
`lib/storage/index.ts` selects the active one.
**Consequences:** No card needed now (Supabase free: 1 GB storage, 5 GB egress/mo).
Switching to R2 when customers arrive (unlimited free egress) is a one-line import
change in `index.ts` + `R2_*` env vars — no route changes.

## ADR-009 — MVP SaaS: synchronous generation, magic-link auth, optional AI
**Context:** Wrap the proven Word Search engine in a usable SaaS (auth →
create → download) before adding more book types.
**Decisions:**
- **Synchronous generation** in the `/api/books` route (no Trigger.dev yet).
  Word search has no image calls, so a book renders in seconds — async jobs add
  complexity we don't need until coloring books. `maxDuration` raised on the route.
- **Auth** via Supabase + `@supabase/ssr`: Google OAuth + **email magic link**
  (no password storage). `/dashboard` gated in `proxy.ts` (Next 16's renamed
  middleware) with a defense-in-depth check in the dashboard layout.
- **AI is optional**: OpenRouter (Gemini→DeepSeek) generates word lists + metadata
  when `OPENROUTER_API_KEY` is set; otherwise the app falls back to curated word
  banks + template metadata so the full flow still works with zero AI config.
- **Storage**: private R2 bucket; PDFs stored whole (no per-page rows yet) and
  served via short-lived signed URLs; downloads logged via service role.
**Consequences:** Fast to ship and testable without external keys. Revisit async
(Trigger.dev) when image generation lands.

## ADR-008 — Page-number footer must sit inside the safe margin
**Context:** Amazon KDP's Print Previewer rejected the first sample-book upload
with "text outside the margins" and "object outside the margins" on the interior
puzzle pages.
**Decision:** The page-number footer (folio) was absolutely positioned in the
bottom margin (bottom = ½ the margin) and spanned the full width past the gutter
margin on recto pages. Reposition it inside the safe area: bottom = margin + 0.15in,
and left/right bound to the page's actual (mirrored) margins. Verified with a
debug overlay (`scripts/debug-margins.ts`) that draws the KDP safe box over a
rendered page.
**Consequences:** Folio is comfortably inside the margins on both recto and verso.
The grid, title, and word list were already well within margins. Re-validate any
KDP rejection visually with the overlay before re-uploading.

## ADR-007 — Production defaults: 8.5×11, no-bleed, puzzle types
**Context:** Moving from the gate sample (6×9) toward production generation.
**Decision:** Default trim **8.5×11**, **no bleed**, book types Word Search /
Sudoku / Maze. Bleed support stays fully implemented but OFF by default.
**Consequences:** Puzzle books get the roomy large format buyers expect. Bleed is
enabled per-book only in the Coloring phase. Gate sample remains 6×9 (already
validated) and is independent of production defaults.

## ADR-006 — PDF Engine Gate before any generator
**Context:** KDP rejects non-compliant PDFs; this is the single biggest risk.
**Decision:** Build and validate a KDP-compliant PDF engine (interior + cover)
against a real KDP upload before building generators/billing/etc.
**Consequences:** `lib/pdf` shipped + verified first. Tagged `v0.1-pdf-gate`.
Final sign-off is the manual KDP previewer check.

## ADR-005 — Word Search first; synchronous for now
**Context:** Need a complete, shippable vertical slice with lowest risk.
**Decision:** Build Word Search first (deterministic, no images), running
synchronously inside an API route. Defer Sudoku/Maze/Coloring/billing/etc.
**Consequences:** Fast, reliable end-to-end path. Moves into Trigger.dev when
image generation / long jobs arrive.

## ADR-004 — Theme word lists: curated banks, not AI (for now)
**Context:** Word Search must be deterministic and must not depend on AI image
generation; we also want the slice to run without external API keys.
**Decision:** Generate theme word lists from curated, built-in word banks with a
seeded fallback. OpenRouter can supply arbitrary-theme words later.
**Consequences:** Fully deterministic and offline-capable. Theme coverage limited
to the bundled banks until AI text is wired in (Phase 7).

## ADR-003 — Trigger.dev for background jobs (not DB polling)
**Context:** A full book is minutes of work; needs durable, retryable, long-running
execution. Puppeteer needs a real Node runtime.
**Decision:** Use Trigger.dev for the generation pipeline. `generation_jobs`
becomes thin bookkeeping (`trigger_run_id`), not a queue.
**Consequences:** Built-in retries/checkpoints; likely removes the need for a
separate worker host (verify Puppeteer support on the runtime). Deferred until
generators need async.

## ADR-002 — AI text via OpenRouter behind a provider abstraction
**Context:** Need swappable text models; want one integration surface.
**Decision:** Route all text generation through **OpenRouter** — primary
`google/gemini-2.5-flash`, fallback `deepseek/deepseek-v4-flash` — behind an
`LLMProvider` interface with primary→fallback, retry, and schema validation.
**Consequences:** Model swaps are config-only. Enforce Zod schema on every call;
schema failure triggers fallback.

## ADR-001 — Remove Claude
**Context:** Original PRD specified Claude Sonnet for text.
**Decision:** Remove all Claude/Anthropic dependencies; replace with OpenRouter
(see ADR-002).
**Consequences:** No `@anthropic-ai/sdk`, no `ANTHROPIC_API_KEY`. PRD text updated.

---

## Open items

- **Credit pricing conflict** — PRD lists both per-page (1/page) and fixed bundles
  (e.g. 25/full coloring book). Resolve before billing: treat per-page as atomic
  cost, "full book" as a discounted bundle. *(unresolved — billing phase)*
- **OpenRouter model slugs** — confirm exact `deepseek/deepseek-v4-flash` slug in
  the OpenRouter catalog at integration time.
- **Whitelabel (OTO4) scope** — define narrowly (logo + name) for MVP.
