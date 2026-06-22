# Decision Log

Architecture decisions, newest first. Each: context → decision → consequences.

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
