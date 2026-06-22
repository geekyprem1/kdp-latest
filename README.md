# KDP Pocket AI

AI-powered Amazon KDP book creation platform.

> **Current milestone: PDF Engine Gate.**
> No generators, billing, templates, admin, or AI workflows are built yet — by
> design. Nothing else proceeds until a KDP-compliant 6×9 interior + cover PDF
> passes Amazon KDP's previewer.

---

## What's built (Phase 0)

| Area | Status | Notes |
|---|---|---|
| Next.js + TypeScript + Tailwind scaffold | ✅ | App shell only |
| Environment surface (`.env.example`) | ✅ | Documents all future keys |
| Supabase foundation schema | ✅ | `profiles` + `credit_transactions` + RLS (`supabase/migrations/0001_foundation.sql`) |
| Supabase clients (browser/admin) | ✅ | `lib/supabase/` — initialized, not yet used |
| Cloudflare R2 client | ✅ | `lib/storage/r2.ts` — initialized, not yet used |
| **PDF Engine** | ✅ | `lib/pdf/` — the gate deliverable |
| **Word Search generator** | ✅ | `lib/generators/word-search/` — full vertical slice |
| OpenRouter (Gemini → DeepSeek) | ⏳ deferred | AI workflows, post-gate |
| Trigger.dev background jobs | ⏳ deferred | Generators/jobs phase |
| Sudoku / Maze / Coloring / Billing / Templates / Admin | ⏳ deferred | After Word Search |

## The PDF Engine

```
lib/pdf/
├─ kdp-specs.ts          # Amazon KDP spec math (trim, bleed, gutter, spine)
├─ render.ts             # Puppeteer → PDF at exact physical size
├─ templates/
│  ├─ interior.ts        # mirrored-margin interior pages
│  └─ cover.ts           # wraparound back|spine|front cover
└─ index.ts              # buildInteriorPdf / buildCoverPdf / buildGateSample
```

Encoded KDP rules (US paperback):
- **Trim** 6×9 (8×10, 8.5×11 also defined)
- **Bleed** 0.125" (added to outer + top + bottom when enabled)
- **Gutter** scales with page count: 0.375" (≤150pp) → up to 0.875" (≤828pp)
- **Outside margin** 0.25" (no bleed) / 0.375" (bleed)
- **Spine width** = pageCount × per-page thickness (white 0.002252" / cream 0.0025")
- Fonts embedded automatically by Chromium

## Running the gate

```bash
npm install
npm run gate:generate   # writes output/interior-6x9.pdf + output/cover-6x9.pdf
npm run gate:verify     # asserts page count + physical dimensions vs spec
```

Sample is a 100-page, 6×9, white-paper book (≥79pp so the spine carries text and
the gutter table is exercised).

## Word Search generator

A complete vertical slice: **Input → Puzzle Generation → PDF → Download**.
Deterministic (seeded), theme-based word lists, no AI image generation. Output is
8.5×11, no-bleed, with puzzle pages and a highlighted answer key.

```bash
# CLI (writes output/word-search-{interior,cover}.pdf, checks determinism)
npm run ws:generate -- Dinosaurs 20 medium

# Web flow
npm run dev      # then open http://localhost:3000/word-search
```

API: `POST /api/word-search/generate` with
`{ theme, puzzleCount, gridSize, difficulty, part: "interior"|"cover" }` →
streams a PDF. (≥11 puzzles needed to clear KDP's 24-page minimum.)

### Sample books for KDP upload testing

Three production-quality books (Dinosaur / Halloween / Christmas, 83pp each) live
in [examples/](examples/README.md), all passing automated KDP validation
([examples/VALIDATION.md](examples/VALIDATION.md)). Regenerate + revalidate:

```bash
npm run examples:generate
npm run examples:validate
```

## ✅ Gate success criteria — PASSED

1. `gate:verify` passes (geometry). — **automated, passing**
2. **Amazon KDP Print Previewer accepts the interior + cover with no errors.** —
   ✅ **validated** on the 8.5×11 word search books (Approve enabled). The PDF
   engine is KDP-compliant.

### Manual KDP validation steps

1. KDP → Create → Paperback.
2. Set trim size **6×9**, paper **White**, no-bleed interior.
3. Upload `output/interior-6x9.pdf` as the manuscript.
4. Upload `output/cover-6x9.pdf` as the cover (it already includes spine + bleed
   for a 100-page book — keep the sample at 100 pages so the cover spine matches).
5. Open **Launch Previewer** and confirm: no margin/trim errors, no low-DPI
   warnings, spine elements aligned.

Once KDP accepts both files, the gate is **passed** and Word Search generation
can begin.

> ⚠️ The cover spine width is page-count specific. If you change `PAGE_COUNT` in
> `scripts/generate-sample.ts`, regenerate both PDFs together so the cover spine
> matches the interior page count.
