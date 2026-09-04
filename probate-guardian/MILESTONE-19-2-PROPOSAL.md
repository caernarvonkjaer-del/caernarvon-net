# Milestone 19-2: Bring the Four `plan-*` Features Onto the Vector Engine

## Goal

Give `plan-initial`, `plan-annual`, `plan-minor`, and `plan-simplified` a `pdf-model.js` and route their "Save as PDF" through the shared tagged/vector engine (`src/core/pdf/pdf-engine.js`), retiring `html2pdf`/`html2canvas` raster generation for these four forms entirely. Today they're the only filings in the app that fall outside the Milestone 17-19 accessibility work — their PDFs are raster screenshots, untagged, and not WCAG 2.1 AA / PDF/UA-1 compliant, unlike `guardian-inventory`, `annual-accounting`, and `simplified-accounting`.

> [!IMPORTANT]
> **Sequencing**: depends on `MILESTONE-19-1-PROPOSAL.md`, which builds the two new block types this milestone needs (`checklist` and the blank wet-ink-signature `signature-block` variant). Start this only after 19-1 lands.

---

## Findings

- All four `plan-*` features are raster today, confirmed via each `print.js`: `plan-annual/print.js` (`data-form-action="save-pdf-plan-annual"`, calls `html2pdf().set({...}).from(container).save()`), and the same pattern in `plan-initial`, `plan-minor`, `plan-simplified` with their own action-attribute names. None has a `pdf-model.js` today.
- The four forms share one HTML content vocabulary, structurally different from the other three features' numeric-schedule-heavy forms. Each defines an identical `boxes()` helper verbatim:
  ```js
  const y=v=>v?'☒':'☐';
  const boxes=(items)=>`<div class="doc-checklist">${items.map(([on,label])=>`<div class="doc-check-row">${y(on)} ${esc(label)}</div>`).join('')}</div>`;
  ```
  `plan-initial` alone calls `boxes([...])` 13 times (residential setting, medical services, mental-health services, personal care, socialization, insurance/benefits, mental/physical disabilities, assistive devices, pre-existing-directives verification, executed-directives type, certification statements). `plan-annual`/`plan-minor` show the same density via grep (~10-15 `boxes(`/`doc-checklist` hits each). **Checklists are the dominant content type in these forms**, the way numeric schedule tables dominate guardian-inventory/annual-accounting.
- They also use a `doc-table-div`/`.tr`/`.td` 2-column key/value pattern equivalent to the existing `key-value-grid` block, and plain `<table class="doc-table">` for a handful of repeating-row sections (e.g. examining-providers, ADL ratings) — both map cleanly onto existing block types.
- Signature blocks use the same 3-row Bootstrap-grid layout as guardian-inventory's attestations, but the signature field itself is deliberately left **blank** (`fld('Signature','')`) — these are wet-signed (pen), not electronic `/s/`. The current `signature-block` renderer hardcodes an electronic `/s/` text draw plus a "pursuant to Fla. R. Gen. Prac. & Jud. Admin. 2.515" legal notice; it has no mode for a blank line. (This variant is built in 19-1, consumed here.)
- No currency/numeric schedules, no `total-row`/colspan totals anywhere in the plan-* family (confirmed via grep — zero hits) — purely narrative/checklist forms. None of 19-1's multi-value-totals or mixed-style-table-cell work is needed here; only the checklist and wet-signature primitives are.

**Estimate**: since all four files share the identical `boxes()`/`doc-checklist` helper verbatim, this is: build one `pdf-model.js` pattern once (against `plan-initial`, the richest of the four), then replicate mechanically against the other three. Net-new engine consumption, not a refinement — but low-risk since the block types themselves were already built and tested in 19-1.

---

## Scope

1. For each of the four features, write `src/features/plan-*/pdf-model.js`:
   - Map every `boxes([...])` call to the new `checklist` block type.
   - Map `doc-table-div` key/value sections to `key-value-grid`.
   - Map plain `<table class="doc-table">` sections to `table`.
   - Map `sigBlock()` attestations to the blank wet-ink `signature-block` variant.
2. Wire each feature's "Save as PDF" action (`data-form-action="save-pdf-plan-annual"` etc.) to `generateCourtFormPdf()` instead of `html2pdf()`.
3. Remove the `html2pdf` import/usage from each feature's `print.js` once its vector path is verified equivalent.
4. Content-integrity check (same discipline as 19-1's audit): confirm nothing present in each feature's `buildPrintHTML()` is silently dropped in the new `pdf-model.js`.

**Explicit non-goal**: the `boxes()`/`doc-checklist` HTML helper duplicated verbatim across all four features' `print.js` files is left alone, not deduplicated. It's still the live renderer for Preview and Print until `MILESTONE-19-3-PROPOSAL.md` replaces those surfaces with the generated-PDF viewer — deduplicating it now would mean touching the still-load-bearing HTML path for no benefit, since the whole point of 19-3 is to delete it outright rather than maintain it. Revisit only if 19-3 is deferred indefinitely.

---

## Non-Negotiables

- No visual/content regression vs. the current raster PDF's information content (even though raster output itself is being retired, the *information* on it is the baseline to preserve).
- Same offline/CSP/no-`.sav`-schema-change constraints as every other PDF-engine milestone.

---

## Acceptance Criteria

- [x] `pdf-model.js` added for `plan-initial`, `plan-annual`, `plan-minor`, `plan-simplified`.
- [x] All four features' "Save as PDF" routed through `generateCourtFormPdf()`; `html2pdf`/`pvShowAll`/`pdf-export-mode` usage removed from each `print.js`'s `doSavePdf()`.
- [x] Every `boxes()`/checklist section reproduced via the `checklist` block type with no dropped items.
- [x] Every attestation/signature section reproduced via the blank wet-ink `signature-block` variant, with `signerName` surfaced as an explicit "Printed Name" field (wet-ink mode has no other place to render it, unlike electronic `/s/` mode which draws it on the signature line itself).
- [x] Content-integrity check completed for all four: every field read by each feature's `buildPrintHTML()` has a corresponding read in its new `pdf-model.js` (multi-line provider/residence addresses via mixed-cell sub-lines; `PLAN_RIGHTS`/`PLAN_BENEFITS`/`PLAN_ADLS`/`INITIAL_ADLS` grid questions reproduced as plain data tables rather than the original checkbox-grid layout — same information, different presentation, since the block vocabulary doesn't have a per-cell-glyph table primitive).
- [x] New E2E PDF spec added (`tests/e2e/plan-pdf-wcag-compliance.spec.ts`, one test per feature) confirming tagged, non-raster output and correct wet-ink (no electronic `/s/` notice) content for all four.

> [!NOTE]
> **Pre-existing race condition surfaced, not fixed here**: bringing these four features onto the vector engine made each `print.js`'s dynamic `import()` noticeably heavier (now pulling in `pdf-model.js` + the shared `pdf-engine.js` graph), which reliably exposes a pre-existing bug in `legacy-app.js`'s `navigate()` — it calls `renderPage(page)` without `await`, and `renderPage()` itself doesn't return the promise from whichever feature's `mount()` it calls, so nothing in the chain actually waits for an async feature mount to finish. This made 3 of the 4 features' pre-existing UI-driven "exports a real PDF" mount-spec tests fail more reliably than before. Verified via `git stash` that the same tests already fail on unmodified `master` (just less consistently, since `master`'s lighter `html2pdf`-only import sometimes won the race by chance) — so this is a latent defect this milestone made more visible, not one it introduced. Not fixed here: the real fix (making `renderPage()` return the mount promise, and `navigate()` await it) touches the single dispatch function every page in the app goes through, which is real scope beyond "wire four PDF models" and deserves its own change, reviewed on its own. The new `plan-pdf-wcag-compliance.spec.ts` specs sidestep it entirely by calling the engine directly, the same pattern the other three features' PDF specs already use.

## Verification

- `npx playwright test tests/e2e/plan-pdf-wcag-compliance.spec.ts` — 4/4 passing.
- `npx playwright test tests/e2e/plan-initial-mount.spec.ts tests/e2e/plan-annual-mount.spec.ts tests/e2e/plan-minor-mount.spec.ts tests/e2e/plan-simplified-mount.spec.ts` — passes for the non-PDF-export tests; the UI-driven PDF-export tests are subject to the pre-existing race noted above (confirmed present on unmodified `master` too).
- Confirmed zero `/Subtype /Image` / `/Filter /DCTDecode` (raster image) operators in all four new PDFs — same audit style as the existing `pdf-wcag-compliance.spec.ts` assertions for the other three features.
- Full regression pass across `pdf-wcag-compliance.spec.ts`, `plan-pdf-wcag-compliance.spec.ts`, `guardian-inventory-mount.spec.ts`, `annual-mount.spec.ts`, `simplified-mount.spec.ts`, `pdf-accessibility-and-signatures.spec.ts`: 30/31 passing, the one failure being the pre-existing "repeated entry/exit" flake documented in Milestone 19-1.
