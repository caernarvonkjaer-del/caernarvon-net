# Milestone 19-1: Render Unification — Phase 1 (Immediate Fixes, Engine Vocabulary, Data-Integrity Audit)

## Goal

Fix two reported rendering bugs, then use what they revealed to close a larger, pre-existing gap: **Preview, Save as PDF, and Print are not the same document today.** This is Phase 1 of a five-part continuation of Milestone 19's PDF engine work (19-1 through 19-5); it's the one recommended to start with, since it's self-contained, lowest-risk, and fixes real content defects in a legal-filing tool independent of whether the later phases happen.

> [!IMPORTANT]
> **How this relates to 19-2 through 19-5**: this document covers 19-1 only. It is the first of five siblings, each its own standalone proposal: `MILESTONE-19-2-PROPOSAL.md` (plan-* features onto the vector engine), `MILESTONE-19-3-PROPOSAL.md` (unify Preview/Print onto the generated PDF), `MILESTONE-19-4-PROPOSAL.md` (cleanup), and `MILESTONE-19-5-PROPOSAL.md` (PDF/UA-1 font embedding). All five continue Milestone 19's PDF engine work; 19-1 is the recommended starting point since it's self-contained, lowest-risk, and fixes real content defects independent of whether the later ones happen.

---

## How This Started

Two bugs were reported: a fixed `.mobile-topbar` header bleeding onto every printed page, and long labels overlapping their values in the vector PDF engine's key-value-grid renderer. When asked whether fixing them would keep Preview, Save-as-PDF, and Print in sync going forward, the honest answer was no — there isn't one renderer to keep in sync. There are **three independent ones**:

1. Every feature's `print.js` has a `buildPrintHTML()` that drives both the on-screen Print Preview and `window.print()`.
2. `guardian-inventory`, `annual-accounting`, and `simplified-accounting` also have a `pdf-model.js` feeding the shared tagged/vector engine (`src/core/pdf/pdf-engine.js`) for "Save as PDF."
3. The four `plan-*` features (`plan-initial`, `plan-annual`, `plan-minor`, `plan-simplified`) have **no vector path at all** — their "Save as PDF" goes through `html2pdf`/`html2canvas`, producing a raster, untagged, non-accessible PDF, entirely outside the Milestone 17-19 accessibility work.

---

## Findings

- **The two renderers that already coexist (HTML vs. vector) don't even agree on content today**, independent of any unification effort. In guardian-inventory alone: property notes, a Schedule C-1 "Frequency" column, and Schedule C-2 claimant addresses are rendered in the HTML preview but silently **never read** by `pdf-model.js` — they don't appear in the filed PDF. Schedule B-1's second total column (restricted-amount) is dropped the same way. The Certificate of Service section is worse: the vector PDF invents a "Method of Service: Electronic / Portal" field that doesn't exist in the HTML version, and drops the per-recipient date-served field that does. **This is a real defect in a legal-filing tool** — worth fixing on its own regardless of how the bigger unification project is sequenced.
- **The vector engine's block vocabulary (`notice`/`key-value-grid`/`table`/`signature-block`) has structural gaps**, not just missing data wiring: table cells support one font run only (no bold-label/small-address/italic-notes mixing), totals rows support exactly one numeric value (several schedules need two), and `signature-block` hardcodes an electronic `/s/` text render with no mode for a blank wet-ink signature line.
- **The four `plan-*` forms are structurally different from the other three** — dominated by `☒`/`☐` checklist rows (a `boxes()` helper repeated verbatim in all four files, called 10-15× per form) with no equivalent block type today, rather than numeric schedules. Porting them onto the vector engine (Milestone 19-2) is new block-type work, not a refinement of existing types — but since all four share one HTML vocabulary, building the block type once here and applying it four times later is mechanical.
- **No PDF-viewing library is vendored** (only `html2pdf.bundle.min.js`, which *generates* raster PDFs, not views arbitrary ones) — relevant to Milestone 19-3, not this phase.
- **Good news**: for guardian-inventory (checked in detail), every interactive control on the Print Preview page (Save PDF/Excel/Print buttons, signature-style radio, validation panel) already lives *outside* `buildPrintHTML()`'s returned markup — favorable for the eventual Milestone 19-3 viewer swap, since no control needs to be relocated.

---

## Scope of This Phase (19-1)

1. **Fix `.mobile-topbar`/`.sidebar-backdrop` missing from the `@media print` hide-list** (`index.html` ~L905) — a fixed-position mobile nav header that isn't hidden by the print stylesheet, so Chromium-based print/print-to-PDF stamps it onto every page.
2. **Fix the key-value-grid fixed-offset label/value collision** in `pdf-engine.js` — labels are drawn at a fixed `x = margin + 4` and values at a fixed `x = margin + 115` with no text measurement, so any label wider than ~111pt (e.g. "Guardianship Inception Date (GID)") overflows into the value text.
3. **Extend the block vocabulary** to close the structural gaps found above:
   - Multi-line/mixed-style table cells (bold main line + small sub-lines, e.g. address/notes).
   - Multi-value totals rows (2+ numeric columns).
   - A flexible signature/attestation field-grid primitive (replaces the fixed vertical `details` stack, preserves the HTML version's deliberate column grouping/order).
   - A blank wet-ink-signature variant of `signature-block` (no `/s/` text, no electronic-signature legal notice) — needed by Milestone 19-2's plan-* forms.
   - A new `checklist` block type (`☒`/`☐` rows, wrapping + page-break aware) — needed by Milestone 19-2, built here since it's pure engine work with no feature-specific wiring.
4. **Data-integrity audit**: go through every existing `pdf-model.js` against its sibling `buildPrintHTML()` line-by-line and re-add every currently-dropped field, and remove the invented field — tracked as individual acceptance criteria below, not one combined line, so a partial fix can't get checked off as done.
5. **Synthetic validation for the two new block types added here with no consumer yet**: `checklist` and the wet-ink `signature-block` variant aren't used by any feature until Milestone 19-2 lands. Rather than deferring their first real exercise to 19-2 (where a bug in the block type itself would be hard to distinguish from a bug in 19-2's new `pdf-model.js` wiring), add a minimal unit test or synthetic fixture in this milestone that calls `generateCourtFormPdf()` directly with a hand-built model exercising both new block types, and asserts on the raw PDF output (tagged structure present, glyphs render, page-break handling works for a checklist long enough to span pages).

---

## See Also

- `MILESTONE-19-2-PROPOSAL.md` — bring the four `plan-*` features onto the vector engine.
- `MILESTONE-19-3-PROPOSAL.md` — unify Preview and Print onto the generated PDF.
- `MILESTONE-19-4-PROPOSAL.md` — cleanup of dead render-path code.
- `MILESTONE-19-5-PROPOSAL.md` — full PDF/UA-1 font embedding.

---

## Acceptance Criteria

- [x] `.mobile-topbar` and `.sidebar-backdrop` added to the `@media print` hide-list (`index.html`, both the `@media print` block and the `.pdf-export-mode` parallel rule). **Manual verification still pending**: a real browser Print/Print-to-PDF at a narrow window width hasn't been run — the CSS fix is in, but nobody has confirmed it visually yet.
- [x] Key-value-grid renderer measures/wraps labels and values instead of using a fixed offset; row height grows to fit. Verified via the existing `pdf-wcag-compliance.spec.ts` suite (which exercises "Guardianship Inception Date (GID)" and other long labels) plus a regression caught and fixed during implementation (see note below).
- [x] Multi-line/mixed-style table cell support added to `pdf-engine.js` (`measureCell`/`drawCell`).
- [x] Multi-value totals row support added (`totals.values` array, backward-compatible with the original single-`value` shape).
- [x] Flexible signature/attestation field-grid primitive added (`block.fields`, full-width row/column layout), alongside the legacy `details` stack for backward compatibility.
- [x] Blank wet-ink-signature `signature-block` variant added (`block.wetSignature`).
- [x] New `checklist` block type added — vector-drawn checkbox glyph (not a Unicode ballot-box character, which isn't in WinAnsiEncoding) plus a "Yes —"/"No —" text prefix carrying the actual accessible state.
- [x] Synthetic fixture/unit test added (`pdf-wcag-compliance.spec.ts`, "Milestone 19-1: checklist and wet-ink signature-block synthetic fixture") exercising both new block types directly, asserting tagged structure, page-break behavior (70-item checklist forces multi-page), and correct wet-ink vs. electronic-signature content.
- [x] Guardian-inventory Schedule A-1 property `notes` field re-added (mixed-cell italic sub-line under the description).
- [x] Guardian-inventory Schedule C-1 `Frequency` column re-added.
- [x] Guardian-inventory Schedule C-2 `claimantAddress` field re-added (mixed-cell sub-line under claimant name).
- [x] Guardian-inventory Schedule B-1 second total column (restricted-amount) re-added, plus the previously-missing `Restricted?`/`Restricted Amt` per-row columns.
- [x] Guardian-inventory Certificate of Service per-recipient `dateServed` field re-added.
- [x] Guardian-inventory Certificate of Service invented "Method of Service: Electronic / Portal" field removed.
- [x] `npx playwright test tests/e2e/pdf-wcag-compliance.spec.ts` and the guardian-inventory/annual-accounting/simplified mount specs pass (25/25 relevant tests; 1 pre-existing flaky "repeated entry/exit" test confirmed failing identically on unmodified `master`, unrelated to this work).

> [!NOTE]
> **Regression caught during implementation**: the initial key-value-grid fix measured every value against a fixed ~148pt width, but when an item has no paired second column its value cell actually gets `ColSpan: 3` (much wider). This force-wrapped values that had plenty of room and broke the annual-accounting drift-guard test's sentinel-string search. Fixed by measuring lone (`ColSpan: 3`) values against the true available width instead of the paired-column width. Caught by the existing test suite, not by manual inspection — exactly the kind of regression the "run the tests" step in this milestone's plan was for.

## Verification

- `npx playwright test tests/e2e/pdf-wcag-compliance.spec.ts` and the guardian-inventory/annual-accounting/simplified mount specs — must keep passing after block-vocabulary changes.
- Manual diff: for each field re-added per the data-integrity audit, generate a PDF before/after and confirm it now matches the HTML preview's content.
- Visual check of the key-value-grid fix and the print-CSS fix (generate + browser-print a form with a known long label, e.g. "Guardianship Inception Date (GID)").
