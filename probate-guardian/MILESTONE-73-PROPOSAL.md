# Milestone 73 Proposal — What the end-to-end browser test found

## Status

**Draft, 2026-10-04. This proposal authorizes no change.** Building any
item needs the requester's named approval of that item (AGENTS.md §3).
Each item's open decisions are listed with a recommended option. They are
asked as choices and recorded here once answered.

The requester is a representative of the Clerk of the Circuit Court, Pinellas
County. Where an answer below is about what the Clerk's office accepts, it is
recorded as **Pinellas Clerk practice**, not as a reading of a statute or rule
(AGENTS.md §4 and §5). Practice is county-specific.

| # | Item | What a filer sees today | Severity | Decisions |
| --- | --- | --- | --- | --- |
| 1 | 73A | Choosing **Unsigned** still prints "/s/ Name" and the electronic-signature caption on every form, contrary to the guide | High | 73A-1 to 73A-3; one question for a qualified person |
| 2 | 73B | The filed PDF says **"Plenary"** when no Type of Guardianship was chosen; a new Annual says **"Professional Guardian"**; new rows arrive with answers and shares the filer never gave | High | 73B-1 to 73B-4 |
| 3 | 73C | **"+ Add Co-Guardian" does nothing** on all four Plans | High | None (a defect) |
| 4 | 73D | Ticking and unticking **"This item is a vehicle"** on Inventory B-2 erases the Description and the safe-deposit answer | High | 73D-1, 73D-2 |
| 5 | 73E | **Importing an Excel workbook replaces the filing with no confirmation**; on the Simplified, Cancel leaves the filing half-replaced and the next save keeps it | High | 73E-1 |
| 6 | 73F | **A section shows ✓ and Print Preview then blocks it.** The page checklist, the sidebar, the dashboard's "Ready to file" and the export check use different rules; asterisks don't match what is enforced; a misspelled county passes everywhere | High | 73F-1 to 73F-9 |
| 7 | 73G | A loss typed as a positive number is **added**, with no warning; the Clerk's own "(1000)" notation for a transfer out is stored as **+1000**; a minus is silently refused or silently zeroed elsewhere | High | 73G-1 to 73G-3 |
| 8 | 73H | Dates print as **2025-01-01** on several screens; negative amounts appear **five different ways**, two of them in one PDF table; Plan Q11 prints a bare number | Medium | 73H-1, 73H-2 |
| 9 | 73I | The dashboard marks an annual accounting **overdue one to three days early** | Medium | 73I-1 to 73I-3 |
| 10 | 73J | Parts of a page stay **stale** after a change until the filer leaves and returns | Medium | None |
| 11 | 73K | The page **jumps to the top** after a signature choice, Add, Remove and similar actions, on all nine forms | Medium | None |
| 12 | 73L | Dialogs **stack**, a reminder fires for a row that is still empty, and Preview and its dialogs **stall in a background tab** | Medium | 73L-1 |
| 13 | 73M | Excel silently **doesn't carry** some answers (and one comes back wrong); Save as Excel can look enabled and do nothing | Medium | 73M-1, 73M-2 |
| 14 | 73N | The Simplified Annual Plan's PDF numbers "Q7.–Q9.", **cuts off Q8**, and prints narrower questions than the screen asks; the dashboard says "No filing contact" | Medium | 73N-1 |
| 15 | 73O | The Simplified's PDF and workbook print **different guardian names** with no warning; the Initial Plan keeps **two attorney names**; the Annual and Simplified previews have **no Print button**; recipients get three address lines on two forms and four on the third; screen readers hear "startingBalance"; the **ward's name is written to the browser console** | Medium | 73O-1 to 73O-6 |
| 16 | 73P | Small text and behaviour fixes (removing a card, Link to Case, Start New Year, Export All Filings, encryption wording, Enter in the filing picker, help panel) | Low | 73P-1, 73P-2 |
| 17 | 73Q | **The user guide** says things the app doesn't do, contradicts itself in four places, and runs the full width of a wide window | Medium | None beyond the items it follows |
| 18 | 73R | The requester's change requests: a shorter sidebar top (R1), "GF" for "PG" (R2), fit-height and full-width in Print Preview (R3) | Requested | 73R-1 to 73R-6 |
| 19 | 73S | The requester's change request R4: **treat the UCN as required.** Reverses the Milestone 63 decision | Requested | 73S-1 to 73S-4 |

### Provenance

- **The requester's end-to-end browser test of 2026-10-03** ("Guardian
  Forms — End-to-End UI Test Findings (combined)": the Milestone 71 retest
  plus a full pass over all nine filing types on the test system, browser
  only, no source access). It is not in the repository. Its finding numbers
  (P1–P12 patterns, D1–D33 defects, R1–R4 requests) are kept below in
  parentheses so each item can be traced back to it.
- **Checked 2026-10-04 against master at `7440c30`**, the build the test
  system serves:
  - Six read-only reviews of the code, each covering one group of findings.
    They ran the real validators, sidebar evaluators, PDF models, number
    parsers and deadline code from node, and read the Clerk's three workbooks
    and the legal sources with parsers. One also confirmed its findings in a
    headless browser.
  - Each review's load-bearing claims were then re-checked by hand: the
    lines quoted below, the workbook cells (read again with a separate
    parser), and the statute and rule text from `reference/legal/statutes/`.
  - **73C was reproduced in a browser** on all four Plans: one guardian
    before the click, one after, and no page error.
- **Where the test's account differed from what was found, the item says
  so.** Findings that did not hold, or are by design, are under
  [Reported, not reproduced or by design](#reported-not-reproduced-or-by-design).
- **What the test confirmed is fixed:** all five Milestone 71 originals (H1
  method of service, H2 the sidebar's negative balance, M1 the Guardian
  Advocate hint, M2 caption text as a field name, M3 two Bar Numbers), plus
  71C's percent fields and 71E's Trust carry-over.

### What the test did not cover

SSN/EIN entry and printing, a fully clean export, Open Backup and reopening,
Lock and encrypted cases, Clear All Data, narrow windows, a second tab on the
same filing, Excel row limits, Save Annotated PDF, signature upload, merging
shared records, offline install, Firefox and Safari. Nothing in this proposal
claims to have tested them either.

---

## Build order and file overlap

Proposed order, safest and most independent first:

1. **73C, 73D, 73E** — data safety; each touches its own files.
2. **73A** — the PDF engine's signature block (73N's heading wrap also edits
   `pdf-engine.js`, so 73A goes first).
3. **73B, then 73G, then 73F** — all three change rules and defaults that
   73F's parity test must then agree with. 73F is the largest item.
4. **73J, then 73K** — both edit `router.js`'s `renderPage()`.
5. **73L, 73M, 73N, 73H, 73I, 73O, 73P** — independent of one another
   except where noted.
6. **73R, 73S** — the requested changes.
7. **73Q last** — the guide, rewritten against the finished app, with its
   figures re-shot.

| Item | Main source files | Tests and baselines |
| --- | --- | --- |
| 73A | `src/core/pdf/pdf-engine.js` (signature block), `src/core/validation/signature-state.js` (shared state resolution) | new `tests/unit/signature-print-state.spec.js`, new `tests/e2e/unsigned-prints-blank.spec.ts`, `pdf-structure-tags.spec.ts`, `pdf-accessibility-and-signatures.spec.ts` |
| 73B | the three accountings' `pdf-model.js`, `src/core/filing/models/annual.js`, `models/guardian.js`, `src/core/form/schedule-definitions.js`, Annual `index.js` (validator), Annual `excel.js` (import of G8), `completion.js`, CSV | new `tests/unit/no-invented-answers.spec.js`; goldens `ms70-70C-filing-shapes.json`, `ms70-conversion-golden.json`, `ms70-year-rollover-golden.json`, `ms70-completion-golden.json`; fixture audit |
| 73C | `src/core/filing/models/plan-rows.js`, `src/core/form/prune-cards.js` | new `tests/e2e/plan-add-co-guardian.spec.ts` |
| 73D | `src/features/guardian-inventory/index.js` (B-2), Inventory `pdf-model.js`, `excel.js`, validator | new `tests/e2e/b2-vehicle-toggle.spec.ts`, `tests/unit/` case for the output description |
| 73E | the three importers (`excel.js` in `guardian-inventory/`, `annual-accounting/`, `simplified-accounting/`), `src/core/excel/import-keep.js`, `input-hardening.js` | new `tests/e2e/import-confirm.spec.ts`; every spec that imports a workbook (dialog handling) |
| 73F | `src/core/status/nav-marks.js`, `completion.js`, `src/core/filing/readiness-config.js`, `output-preflight.js`, `src/core/pdf/pdf-preview.js`, `validation-panel.js`, `validation-issue.js`, `section-status.js`, `commit-coordinator.js`, every validator, `ward-county.js`, `attorney-required-markers.js`, `dashboard/view-model.js` | new `tests/unit/sidebar-export-parity.spec.js`; `checklist-export-parity.spec.js` (KNOWN_GAPS emptied); `ms70-completion-golden.json`; fixture audit |
| 73G | `src/core/form/form-contract.js` (`sanitizeDecimal`), `form-runtime.js` (`sanitizeNegativeAmounts`), Annual `index.js` (Schedules C and E), Annual `pdf-model.js` (Schedule E totals), `output-preflight.js`, `ward-share-advisories.js` | new `tests/unit/signed-amount-reading.spec.js`, new `tests/unit/sign-advisories.spec.js`, `tests/e2e/signed-amount-keypad.spec.ts` |
| 73H | `src/core/format/money.js`, `date-parser.js`, `summary-renderer.js`, every `pdf-model.js`, Annual `index.js`, `form-derived-fields.js`, `bond-depository.js`, `plan-annual/pdf-model.js` | new `tests/unit/display-formats.spec.js`; PDF text specs that pin today's formats |
| 73I | `src/features/dashboard/view-model.js` | `tests/unit/dashboard-view-model.spec.js` |
| 73J | Annual `index.js` (B-4), `attorney-required-markers.js`, `router.js`, `sidebar.js`, Inventory summary, `dashboard/index.js` | new `tests/e2e/live-page-parts.spec.ts` |
| 73K | `src/core/navigation/router.js`, the seven `mount()`s | new `tests/e2e/redraw-keeps-scroll.spec.ts` |
| 73L | `src/core/filing/schedule-doc-ack.js`, `src/core/ui/dialogs.js`, `filing-dialogs.js`, `pdf-preview.js`, `shell.css` | new `tests/e2e/dialog-order.spec.ts`, `schedule-doc-ack.spec.ts` |
| 73M | `bond-depository.js`, Inventory `excel.js` (A-2 notes), Annual `index.js`/`print.js`/`excel.js` (explanation, Save as Excel), `output-preflight.js` | `tests/unit/bond-depository.spec.js`, `import-keep.spec.js`, new e2e case |
| 73N | `plan-simplified/pdf-model.js`, `pdf-engine.js` (checklist heading wrap), `plan-simplified/index.js`, `dashboard/view-model.js` | `pdf-form-specific.spec.ts`, `dashboard-view-model.spec.js` |
| 73O | Simplified `index.js`/`excel.js`/`form-derived-fields.js` (guardian name), `plan-initial/index.js` and its model (attorney and guardian names), `annual-accounting/print.js`, `simplified-accounting/print.js` (Print, "✓ Exported!"), the three certificate pages, exporters and importers (address lines), `form-runtime.js` (label fallback), `schedule-docs.js`, `cards.css`, `filing-dialogs.js` (console line), `pdf-engine.js` (html2canvas logging; table titles, after 73A and 73N), `common-modals.html`, CSV | new `tests/e2e/preview-print-button.spec.ts`, new `tests/e2e/accessible-names.spec.ts`, `tests/unit/form-derived-fields.spec.js`, `excel-form-field-placement.spec.ts`, `pdf-form-specific.spec.ts`, `ms70-70C-filing-shapes.json` |
| 73P | `pick-record-dialogs.js`, `fragments/common-modals.html`, `year-dialogs.js`, `case-file.js`, `schedule-docs.js`, `filing-switcher.js`, `help-content.js`, the remove actions | small cases in existing specs |
| 73Q | `help/index.html`, `tests/capture/guide-screenshots.capture.ts` | `user-guide-drift-guard.spec.js` |
| 73R | `src/styles/shell.css`, `index.html`, `icons/`, `manifest.json`, `help/index.html`, `src/core/pdf/pdf-preview.js`, `print-pager.js`, `pdf-annotate.js`, `print.css` | `routes.spec.ts`, `lock-and-save-state.contract.spec.ts`, `pdf-annotate.spec.ts`, new `tests/e2e/preview-zoom.spec.ts`; `npm run test:e2e:portable` (icons and manifest are packaging) |
| 73S | the nine covers, every validator, `completion.js`, `readiness-config.js`, `county-guidance.js`, CSV, `help-content.js` | `ucn-cover-field.spec.ts` (rewritten), `ucn-header.spec.js`, fixtures |

Every item that adds or changes a test updates `TEST-INDEX.md`,
`file_index.md`, the 70T progress list and the assertion-count baseline in
its own commit.

---

## 73A — Unsigned prints a blank line, as the guide says (P4, D4)

### What a filer observes

The guide's Signatures table promises: Unsigned — *"No signature yet. The
printed signature line is left blank for wet-ink signing."* On **every one of
the nine forms**, an Unsigned block instead prints "/s/ Name" above
"Signature (Electronic /s/ pursuant to Fla. R. Gen. Prac. & Jud. Admin.
2.515)", the same as "/s/" Signed. If a date is typed, the date prints too,
and the block is indistinguishable from a signed one. With no name entered, a
bare "/s/" prints: the Annual family's preparer and attorney blocks, the
Inventory's preparer and attorney, every certificate of service, and the
Plans' guardian, attorney and preparer blocks.

A guardian who chose Unsigned so they could sign by hand files a page that
already claims an electronic signature.

### Evidence

- `src/core/pdf/pdf-engine.js` near 1590 draws a blank pen line only when a
  block sets `wetSignatureExplicit`. **No PDF model sets it anywhere.**
- Near 1697, every other block prints `block.signature || '/s/ ' +
  block.signerName`, with the Rule 2.515 caption under it (near 1710). The
  date prints whenever one is entered (near 1640).
- Validation lets Unsigned pass (`signature-state.js` near 47), and a block
  whose state was never chosen but has a date is treated as "/s/" Signed
  (`inferLegacySignatureState`).
- History: Milestone 22 (`e6568fc`) made "/s/ Name" the standard output and
  kept the blank line for "a workflow that explicitly requires it", none ever
  named (`docs/pdf-architecture-and-signatures.md` near 93). Milestone 39-B
  added Unsigned so a filer could print and sign by hand
  (`MILESTONE-ARCHIVE.md` near 12365) but never connected it to the blank
  line. The guide's promise came later (`fc05e55`).

### Authority

- The Clerk's Annual workbook: *"Only the guardian's signature must be
  original."* (`PART II, III`!B19) and *"The attorney may use an electronic
  signature "/s/""* (`PART IV, V`!B21; `PART X`!B8). The Inventory workbook
  says the same of the attorney (`PART IV`!B19, `PART VI`!B7).
- The original Initial and Annual Plan forms: *"Only reports with original
  signatures will be audited by the Clerk"*
  (`reference/plan-forms/plan-initial-original.txt` near 401;
  `plan-annual-original.txt` near 517). The Simplified workbook has the same
  sentence (`PARTS III, IV`!B13), and the Simplified Accounting's PDF prints
  it beside today's "/s/".
- The Simplified Accounting workbook ships with "/s/" **pre-printed** in its
  attorney cells (`PARTS V, VI`!B17 and B41). The app does not write it.

### Design

1. The engine resolves each block's state the way validation does (a blank
   state with a date counts as "/s/" Signed, as today).
2. **Unsigned** prints a blank signature line with "Signature of <name>"
   beneath it and **no** Rule 2.515 caption.
3. "/s/" is never printed without a name: a nameless block prints the blank
   line.
4. "/s/" Signed and Signature Stamp print as today.
5. The Clerk's pre-printed "/s/" in the Simplified workbook stays (§5).

### Decisions

- **73A-1. What Unsigned prints.** (1) *Recommended:* a blank line for wet
  ink, as the guide says and the "original signatures" sentences expect.
  (2) Keep "/s/" and correct the guide.
- **73A-2. An Unsigned block with a typed date.** (1) *Recommended:* print
  the date as entered; nothing the filer typed is dropped. (2) Leave the date
  line blank for dating by hand.
- **73A-3. The Simplified workbook's pre-printed "/s/".** (1) *Recommended:*
  leave it; it is the Clerk's text. (2) Blank those two cells when the
  attorney's block is Unsigned. This writes over the Clerk's template text.
- **For a qualified person, not decided here:** whether the Rule 2.515
  electronic-signature caption belongs under a guardian's (non-attorney)
  signature at all, given the workbook's *"Only the guardian's signature must
  be original."*

### Cross-cutting checklist (AGENTS.md §8)

1. **Data model.** No field changes.
2. **Legacy data.** None. Saved filings keep their state; only what prints
   changes, and the filer sees it in Preview.
3. **Fixtures.** Plan PDF tests carry a date and no state, so they keep
   printing "/s/". The blank-line fixture at `pdf-structure-tags.spec.ts`
   near 566 covers the new branch.
4. **Tests.** New unit spec over the block resolution for every form; new
   e2e reading an Unsigned block's PDF text on one accounting and one Plan.
   Red-first: both fail today on the printed "/s/".
5. **Export/import.** PDF only. Excel writes names and dates, never a
   signature state, on every form.
6. **Security.** None.
7. **UI/UX.** The Signatures table in the guide becomes true.
8. **Legal framing.** The caption question above is flagged, not resolved.
9. **Cross-form.** One engine serves all nine forms.

---

## 73B — No answer the filer didn't give (P3, D3)

### What a filer observes

The guide says Yes/No questions "are never answered for you". Today:

| Where | What happens | Risk |
| --- | --- | --- |
| Inventory, Annual, Final, Trust and Simplified PDFs | A blank Type of Guardianship prints **"Plenary"** (the test saw only the Annual and Simplified) | A Limited or Guardian Advocate filing goes out mislabelled |
| Annual, Final and Trust, Part IX | **"Professional Guardian"** is chosen on every new filing; a blank one prints **"None"**, which is not one of the Clerk's choices | A family guardian who skips the question files as a professional |
| Annual family, "+ Add" on Schedules D-1 and D-4 | **"Restricted?" = No** | The "Restricted? is required" check can never fire, and Excel exports "No" |
| Annual family, "+ Add" on Schedule D-2 | **"Personal Residence?" and "Income Property?" = No** | Same |
| Inventory, every new schedule row | **Ward's % = 100**; C-5's Joint Owner's % = 50 | A skipped share can't be told from a deliberate 100%; the guide's "a blank share is listed as missing" never happens |
| Inventory, new rows | Liability type "Mortgage", payment frequency "Monthly", trust type "Pooled" | Same class |

### Evidence

- `d.typeOfGuardianship || 'Plenary'`: `annual-accounting/pdf-model.js` near
  96, `simplified-accounting/pdf-model.js` near 84,
  `guardian-inventory/pdf-model.js` near 149. The Plans have no such field.
- The Annual family's validator has **no** Type of Guardianship rule (near
  1641–1654) although the field is starred (near 694). The Inventory (near
  1379) and the Simplified (near 801) require it. The Annual's Excel writes
  a blank as blank, so its workbook and PDF disagree.
- `src/core/filing/models/annual.js` near 87:
  `guardianRelationship:'Professional Guardian'`, shared by Final and Trust.
  The PDF prints `|| 'None'` (`pdf-model.js` near 1048); an import with a
  blank G8 keeps the default (`excel.js` near 910). The CSV calls the field
  required; nothing enforces it.
- `src/core/form/schedule-definitions.js` near 92, 98 and 110 set
  `restricted:'No'`, `residence:'No'`, `income:'No'`. The CSV rows for those
  fields say new rows begin unanswered, and the Annual's other factory
  (`models/annual.js` near 15) uses `''`.
- `models/guardian.js` near 100–115: `wardPercent:100` on every row,
  `jointOwnerPercent:50` on C-5.
- None of these defaults has a recorded reason; all date from the original
  single-file app.

### Authority

- The Clerk's workbooks have **no default** for any of them, and "Plenary"
  appears nowhere in the three. Type of Guardianship sits under **"REQUIRED
  INFORMATION"** on all three covers (Annual `PART I`!D16, label B22;
  Simplified `PARTS I, II`; Inventory `SUMMARY I`).
- Part IX's relationship cell `PART IX`!G8 is empty; its dropdown lists only
  the three choices.
- The Inventory's share cells are blank; C-5's 50% is the workbook's printed
  **example** row, not an input default.

### Design

1. The three PDF models print a blank Type of Guardianship as blank.
2. New Annual-family filings start with no relationship; a blank prints
   blank, never "None".
3. The three Annual factories start their Yes/No answers at `''` (no
   decision: AGENTS.md §4 forbids the default).
4. Per 73B-3 and 73B-4, the Inventory's shares and dropdowns start blank.

### Decisions

- **73B-1. Type of Guardianship on the Annual, Final and Trust.**
  (1) *Recommended:* required, as on the Inventory and Simplified and as the
  workbook's "REQUIRED INFORMATION" heading places it. A filer can still
  continue past it at Preview, as with every required field. (2) A Preview
  warning only.
- **73B-2. An unanswered Part IX relationship.** (1) *Recommended:* prints
  blank, with a Preview warning. (2) Blocks export like other required
  fields.
- **73B-3. Inventory shares on new rows.** (1) *Recommended:* start blank,
  as the workbook and the Annual do; 72B already requires a share on every
  started row, so a skipped share is listed as missing and its row's ward
  amount shows $0 until entered. (2) Keep 100 and 50.
- **73B-4. The Inventory's other pre-chosen dropdowns** (liability type,
  payment frequency, trust type). (1) *Recommended:* start blank too.
  (2) Leave them.

### Cross-cutting checklist (AGENTS.md §8)

1. **Data model.** Default column changes for `guardianRelationship`, the
   Inventory shares and the three dropdowns; `verify:data-model`.
2. **Legacy data.** Saved test-system filings keep "Professional Guardian"
   and 100%; they can't be told apart from a real choice. Recommended to
   leave them (§8.2: test-only data, nothing silently changed).
3. **Fixtures.** 73B-1 adds a requirement: every Annual-family
   `fillMinimalValid*` and `MINIMAL_VALID_*` gains a Type of Guardianship
   (§8.3). Starting shares blank touches every Inventory fixture that relies
   on the 100 default.
4. **Tests.** New unit spec: a new filing and every "+ Add" row on every
   form carry no invented answer, and no PDF prints a value for a blank
   answer. Three goldens pin "Professional Guardian" and are regenerated with
   the expected change stated.
5. **Export/import.** PDFs and the Annual's G8 import.
6. **Security.** None.
7. **UI/UX.** Dropdowns show "— select —", as every other unanswered one does.
8. **Legal framing.** None decided; the workbook's own heading is cited.
9. **Cross-form.** The fallback is on three forms; the Plans have no field.

---

## 73C — "+ Add Co-Guardian" works on the Plans (D1)

### What a filer observes

On the Initial, Annual, Simplified and Minors Plans, "+ Add Co-Guardian"
does nothing: no second guardian's block appears, so co-guardians cannot
sign a Plan. The same button works on the accountings. Reproduced in a
browser 2026-10-04 on all four Plans: one guardian before the click, one
after, no page error.

### Evidence

- The click reaches its handler (`form-events.js` near 58 →
  `plan-row-actions.js` near 8), which adds a blank row and redraws the page.
- The redraw calls `normalizePlanGuardians()`
  (`src/core/filing/models/plan-rows.js` near 24–29), which keeps the first
  guardian plus **only later rows that hold data**, so the new blank row is
  removed before it is drawn.
- In place since `4d0afd5` (Milestone 37). No test clicks the button.
- The Inventory met and fixed the same problem in Milestone 51H.

### Design

1. `normalizePlanGuardians()` keeps blank rows (it still caps the count at
   4, 3, 2 and 2).
2. The four Plans' `planGuardians` join the blank-card clean-up in
   `prune-cards.js` (minimum 1), so an untouched blank block is removed when
   the filer leaves the page, as on the other forms.

### Checklist

No data-model, legacy, export or security change. New
`tests/e2e/plan-add-co-guardian.spec.ts` clicks the real button on all four
Plans; red-first, it fails today with one block after the click. The guide's
"fixed blocks for up to three or four guardians" is corrected in 73Q.

---

## 73D — Unticking "This item is a vehicle" never loses what was typed (D2)

### What a filer observes

On Inventory B-2, ticking "This item is a vehicle" and unticking it empties
the Description. Tick, type a Year of 2019, untick: the Description is now
"2019". Ticking also clears the "In Safe Deposit Box?" answer, which does
not come back. The guide says *"Un-ticking a box never deletes what you
typed underneath — tick it again and your text is back."*

### Evidence

- `toggleB2Vehicle()` (`guardian-inventory/index.js` near 961–971) runs
  `e.inSafeDepositBox = ''` and `syncB2VehicleDescription(i)` on tick. The
  sync (near 923–930) overwrites `description` with Year, Make, Model and
  VIN — all blank on a fresh tick. Every keystroke in a vehicle field
  re-syncs it (near 331–341).
- The comment directly above (near 935–942) says the toggle *"Deliberately
  does NOT call syncB2VehicleDescription()"*. The code and its comment
  disagree.
- AGENTS.md §4: unticking never deletes entered data.

### Design

1. The filer's Description is never written by the vehicle fields. A
   vehicle's description is built from Year, Make, Model, VIN and mileage
   where it is read (validation, PDF, Excel).
2. While a row is a vehicle, the safe-deposit question is hidden and its
   answer kept; output ignores it.

### Decisions

- **73D-1.** After unticking, the filer sees: (1) *Recommended:* their
  original Description. (2) The vehicle text, as today.
- **73D-2.** A vehicle's safe-deposit answer: (1) *Recommended:* hidden and
  kept. (2) Cleared, as today.

### Checklist

1. **Data model.** None: a vehicle's description is built when it is
   printed or exported, and the filer's Description is left alone.
2. **Legacy data.** Saved vehicle rows hold the joined text in
   `description`; unticking shows it, which is visible.
3. **Fixtures.** None.
4. **Tests.** New `tests/e2e/b2-vehicle-toggle.spec.ts` (tick and untick
   keep the Description and the answer); a unit case for the output text.
   Red-first: both fail today.
5. **Export/import.** The workbook has one description cell: a vehicle
   still exports its joined text, and comes back from a workbook as an
   ordinary item (73M's notice says so).
6. **Security, UI, legal, cross-form.** No change; only the Inventory has
   this box.

---

## 73E — An Excel import asks first and never half-applies (D6)

### What a filer observes

- **Inventory and Annual:** choosing a workbook replaces every page of the
  open filing, including its ward name, with no confirmation.
- **Simplified Accounting:** the import writes the ward name, case number,
  period, attorney and Part II **before** asking *"Replace the first three
  guardian slots with the values from this workbook?"*. **Cancel leaves those
  changes in the filing** without redrawing the page and with the status
  stuck at "Parsing Excel…": the screen shows the old values, and the next
  save keeps the workbook's.
- On every form, "✓ Import complete" is written and then immediately erased
  by the page redraw, so the filer never sees it.

### Evidence

- Inventory `excel.js` near 607–663 and Annual `excel.js` near 590–975: no
  confirmation.
- Simplified `excel.js` near 300–333 (cover and Part II), near 343–385
  (guardians edited in place), near 394 (the confirmation, after them).
- `input-hardening.js` near 105–108 writes the message; the redraw replaces
  the panel.
- Opening a `.sav` backup does confirm (`case-import.js` near 135).

### Design

1. The importer reads the workbook into a copy of the filing.
2. One confirmation, before anything changes: which filing is replaced, the
   workbook's ward name (said plainly when it differs from the filing's),
   and that every page is replaced except what the workbook has no box for.
3. On OK, the copy is applied and saved; on Cancel, the filing is untouched.
4. After the redraw, a short notice: what was imported, what was kept from
   the filing (the 72 follow-up's `import-keep.js` rules), and what the
   workbook does not carry (73M).

### Decisions

- **73E-1. The confirmation.** (1) *Recommended:* as in step 2, plus the
  after-import notice. (2) A confirmation only when the ward names differ.

### Checklist

1. **Data model.** None.
2. **Legacy data.** None.
3. **Fixtures.** Every e2e spec that imports a workbook must accept the new
   confirmation (`autoAcceptDynDialogs` already does in most).
4. **Tests.** New `tests/e2e/import-confirm.spec.ts`: Cancel leaves the
   filing identical (a snapshot before and after) on all three forms.
   Red-first: it fails today on all three (no dialog on two, a half-applied
   filing on the Simplified).
5. **Export/import.** All three importers.
6. **Security.** None.
7. **UI/UX.** The same confirmation dialog the `.sav` open uses.
8. **Legal framing.** None.
9. **Cross-form.** All three importers get the same flow.

---

## 73F — One answer to "is this section complete?" (P1, P2, D10, D13, D16, D17, D28)

### What a filer observes

A section shows ✓ in the sidebar, the page lists nothing missing, the
dashboard says "Ready to file", and Print Preview then blocks it with
something no page asked for. The reverse also happens: a page says "Complete
the required items on this page" and names nothing.

| Where | Page | Sidebar | Print Preview |
| --- | --- | --- | --- |
| Annual/Final/Trust cover, "Amended Form?" unanswered | Nothing listed | ✓ | Blocks: "Part I — Amended Form?" |
| Annual cover, Type of Guardianship blank | Not listed | ✓ | Not listed; PDF prints "Plenary" (73B) |
| Any cover, County "P", "Pinelas" or "Zzyzx" (**all nine forms**) | Not listed | ✓ | Not listed |
| Inventory cover, GID 02/30/2026 | Field red, list empty | ✓ | Blocks: "Date entry - gid must be a valid date…"; after "Continue despite…" the PDF prints the **previous** date |
| All four Plans' Signatures page, guardian phone/address/SSN blank | List vanishes once one box is ticked | ✓ | Blocks: "Guardian SSN/EIN" |
| Annual Part V, attorney entered, Unsigned, no date | "Complete the required items on this page", nothing named | − | Not listed (correctly) |
| Annual Part V, Signature Stamp with a date and no image | Nothing | ✓ | Blocks |
| Annual Part X, "/s/" with no date | Nothing | ✓ | Blocks |
| Simplified Part VI, no attorney, signature dated before the period end | Nothing | ✓ | Blocks |
| Annual Part VIII, "No" to trusts | "Add at least one item…" | − | Not listed |
| Readiness panel, Annual | — | — | "Passed: Cover information… complete" beside "Outstanding: Part I — Amended Form?" |
| Preview banner after "Continue despite…" | — | — | "Ready to export" above "N items outstanding" |

Also: the starred and enforced fields disagree (P2); Preview counts sections
three ways on one page (D16); the screen-reader message says "1 required
items" (D17); Inventory D-1 and D-2 list "Street Address", "Phone" and
"SSN/EIN" twice with no owner (D28).

### Evidence

- **The page checklist is drawn only when the sidebar already says the page
  is incomplete:** `nav-marks.js` near 88,
  `guidanceContainer.innerHTML=incomplete?…:''`. Wherever the sidebar's
  hand-written rule is looser than the export check, the page stays silent.
  Where it is stricter, the page falls back to the generic sentence.
- The dashboard's "Ready to file" is the sidebar reaching 100%
  (`dashboard/view-model.js` near 131).
- The Annual cover's sidebar rule (`completion.js` near 185–186) omits
  Amended Form; the validator requires it (`annual-accounting/index.js` near
  1654). The sidebar's signature rules check only that a date is filled
  (Annual near 168, 194, 200; Simplified near 115; all four Plans' guardian
  #1; Initial Plan attorney near 492), while export uses
  `isSignatureComplete()` (Milestones 39-B and 39-C), which already serves
  four other pages. The Plans' Signatures keys omit the contact fields their
  validators require (`completion.js` near 301, 382, 472, 559).
- Every validator checks only that County is not empty (Annual near 1652,
  Inventory near 1369, the Plans and the Simplified likewise); an unknown
  county gives no court caption on the PDF
  (`circuit-lookup.js` near 99–103), although every PDF model's comment says
  "export is already blocked by this form's County validation". The CSV
  declares County a list of Florida counties.
- An impossible date stays as a draft and the old valid date is kept
  (`form-contract.js` near 479–491, Milestone 25); the issue is added only at
  Preview (`output-preflight.js` near 55), and is bypassable
  (`issue-registry.js` near 10, Milestone 38D), contradicting Milestone 25's
  "Export must never use that old value". The Inventory's date inputs pass an
  empty label, hence "gid"; nothing emits `data-field-section`, hence "Date
  entry -".
- Part VIII's sidebar rule ignores the trusts answer (`completion.js` near
  207) and the "I certify there are no trusts" box shows whenever the answer
  is not Yes (Annual `index.js` near 1474). The box was added in Milestone
  36-5 when the question defaulted to No; it is now a real required answer.
- The parity test (`checklist-export-parity.spec.js` near 235) sees only
  top-level field names and checks one direction, so nested requirements are
  invisible to it; several of the cases above are in its `KNOWN_GAPS`.
- The guide's sentence *"the sidebar and the check that blocks your export
  now apply the same rule, so a section showing ✓ will not surprise you at
  export time"* (`help/index.html` near 269) was written for Milestone 55B's
  **date-order** rule only (`728d556`). Its closing clause reads as a general
  promise, which the cases above break.

### What exists to build on

Six separate engines decide "complete": the export validators (one per
engine); the sidebar evaluators in `completion.js` (the Inventory's derived
from its validator, the other six hand-written, pinned by a 4,803-case
golden); the page checklist (gated on the sidebar); the readiness card (for
the Plans, a fourth hand-written rule set); Preview's three renderings; and
the asterisks (set per call site). Nothing reads `data-field-required`.
Milestone 25 specified a shared field contract (`MILESTONE-ARCHIVE.md` near
5011–5021); only half was built. Shared pieces already exist:
`isSignatureComplete`, `isAttorneyStarted`, `serviceRecipientIssues`,
`percent-range`, `row-started`, `errorRoute`, `syncRequiredMarkers`.

**Why the test's "one central checklist" is larger than it looks.** The
dashboard computes progress for filings that are not open, without loading
their page modules — that is why `completion.js` is pure. Making the export
validators the single source means turning seven of them into pure modules
that take a filing as an argument: a large change. And the sidebar
legitimately asks for things export must never demand (the 14 Annual
schedules' "no items" prompt, AGENTS.md §4; the bond question; the Plans'
certificates), so a central list needs a third kind of rule, "asked, never
required", as well as blocking and advisory.

### Design — staged

**Step 1 (no decisions).**
1. A page's checklist shows whenever the page has export issues, including
   impossible dates, not only when the sidebar says incomplete.
2. For the open filing, a page is ✓ only if its sidebar rule passes **and**
   no export issue belongs to it (the Inventory's pattern). The dashboard's
   "Ready to file" for the open filing follows the same result.
3. A new behavioural parity test runs every form's fixtures — complete,
   and deliberately incomplete in each of the cases above — through the
   sidebar, the page checklist and the export check, and requires them to
   agree in **both** directions, nested rows included. This is the acceptance
   test the browser test proposed.

**Step 2 (already decided elsewhere; no new decision).**
1. Sidebar signature rules use `isSignatureComplete()` on every form (39-B
   and 39-C).
2. The Plans' Signatures pages: phone, address and SSN/EIN join the sidebar
   rule and get asterisks (the validators already require them; the original
   Annual Plan form says *"All guardians of person must sign and provide the
   most current mailing address, telephone number, social security
   number…"*, `plan-annual-original.txt` near 517).
3. The Simplified Part VI's date-order rule joins its sidebar.
4. The readiness card's cover row recognises the Annual family's "Part I".
5. After "Continue despite…", the banner says "Continuing with N items
   outstanding", not "Ready to export".
6. One grouping helper counts sections for the header, the blocked box and
   the readiness card (D16); the screen-reader message pluralises (D17); the
   page list keeps the role ("D-2 Preparer — Street Address") (D28).
7. Impossible-date messages read "Section — Label" ("Cover — Guardianship
   Inception Date (GID) must be a real date"), never "Date entry - gid".

**Step 3 (the decisions below).**

**Step 4.** Asterisks follow the rules (`syncRequiredMarkers`): Annual County
and Amended Form; the Annual's Part VIII (only the question #2 the validator
enforces, per its own workbook note *"If the answer to question #2 is "No",
we request that you voluntarily provide the trust information"*,
`PART VIII`!B11); Schedule C's Gain or Loss (either one); signature-date
stars that follow the signature choice; the Plans' contact fields.

### Decisions

- **73F-1. "Amended Form?"** The workbooks label it *"Amended Form? [Place
  'Yes' in this box.]"* and the Annual template's answer box holds "No".
  Today the Simplified and the Plan for Minors require it on the page, in
  the sidebar and at export; the Annual family only at export; and the
  Inventory, which asks it on its cover, never. (1) *Recommended:* required
  wherever the field exists, the Inventory included, with sidebar and
  asterisk. (2) Required as today on the Annual family, Simplified and Minors
  Plan only, with sidebar and asterisk brought in line. (3) Optional
  everywhere: blank means not amended.
- **73F-2. County must be a Florida county, on all nine forms.**
  (1) *Recommended:* blocks, like a blank county does today (a misspelled
  county gives no court caption on the PDF). (2) A Preview warning.
- **73F-3. An impossible date after "Continue despite…".** (1)
  *Recommended:* it can't be bypassed (Milestone 25: export must never use
  the previous date). (2) Stays bypassable, and the PDF prints the date blank
  rather than the previous one.
- **73F-4. Inventory schedules with no entries and no "none" tick.** The
  Annual's are a sidebar prompt only (AGENTS.md §4, Pinellas Clerk practice
  of 2026-09-20: the office accepts blank schedules). The Inventory blocks
  export on the same thing, though its workbook has the same wording and no
  "none" declaration either. (1) *Recommended:* the Inventory follows the
  Annual — a prompt, not a block — if the office accepts a blank Inventory
  schedule as it does an Annual one. (2) Keep blocking.
- **73F-5. Part VIII, "No" to trusts.** (1) *Recommended:* answering "No"
  completes Part VIII; the separate "I certify there are no trusts" box goes.
  (2) Keep both.
- **73F-6. A trust "created after the GID?" answered No with a creation
  date after the GID** (no workbook formula checks this). (1) *Recommended:*
  a Preview warning. (2) No check.
- **73F-7. The remuneration Amount.** Required on the Annual's Part XI once
  a row is entered; optional on the Simplified's Part VII (Milestone 60G);
  neither workbook has an Amount column. (1) *Recommended:* the same on
  both, required once a row is entered. (2) Leave them different. Whether
  §744.367(3)(a)'s "declaration of all remuneration" needs the amount is for
  a qualified person.
- **73F-8. Transaction dates outside the accounting period (D11).**
  Disbursements, adjustments and sales dated 2026 on a 2025 accounting
  produce no warning. (1) *Recommended:* a Preview warning on the Annual
  family and the Simplified. (2) No check.
- **73F-9. The full single rule list.** (1) *Recommended:* build Steps 1–4
  in this milestone; take on the full list (pure validators that also serve
  unopened filings) only if the parity test keeps finding drift. (2) Build the
  full list now.

### Cross-cutting checklist (AGENTS.md §8)

1. **Data model.** Required-when text for Amended Form (73F-1), County's
   validity, the Plans' contact fields, the remuneration Amount (73F-7);
   `verify:data-model`.
2. **Legacy data.** Filings that showed ✓ may now show − with the item
   named; visible, and the point of the change (§8.2). A saved misspelled
   county appears as a named issue.
3. **Fixtures.** Every new requirement is grepped across `fillMinimalValid*`,
   `MINIMAL_VALID_*` and the unit fixtures before it lands (§8.3, P6).
4. **Tests.** New `tests/unit/sidebar-export-parity.spec.js`;
   `checklist-export-parity.spec.js`'s `KNOWN_GAPS` emptied; the completion
   golden regenerated with each change stated; e2e for the GID case and the
   Plans' Signatures list. Red-first for each step-2 fix. `npm test`
   recommended after Step 1 (the sidebar and checklist are on every page).
5. **Export/import.** The export gate is unchanged except where a decision
   adds a rule.
6. **Security.** None.
7. **UI/UX.** Uses the existing checklist, readiness card and advisory box.
8. **Legal framing.** 73F-4 is asked as Clerk practice; 73F-7 is flagged.
9. **Cross-form.** Every step applies to all nine forms.

---

## 73G — Signs in amount boxes (P6, D5)

### What a filer observes

- On the Annual family's Schedule C, a **positive** 250 in "Loss /
  Reduction" raises Net Capital Adjustments from 1,033.33 to 1,283.33; -250
  lowers it to 783.33. Schedule E's "Transfer Out Amt (negative)" works the
  same way. Nothing warns.
- **The Clerk's own notation loses its sign.** The workbook tells filers to
  use parentheses for a transfer out; "(1000)" is stored as **1000**. So are
  "−250" and "–250" pasted from Word or a PDF, and "$-5,000.00".
- In every other amount box a typed minus is refused without a word, so
  "-77" in Schedule C's Gain (meaning a loss) is filed as +77.
- A workbook imported with a negative amount on Schedules D-1 to D-4 (an
  overdrawn account) is **set to 0 every time the filing opens**, silently
  changing Line 30.
- A share of "0.5" is read as 0.5%; the Annual warns at Preview for D-1 to
  D-5, the Inventory not at all.

### Evidence and authority

- **The arithmetic matches the Clerk's workbook, so no total changes.** The
  Annual workbook's `SCH C CAPITAL ADJ p1`!C17: *"IMPORTANT: Losses should
  be entered as negative numbers, e.g., -2500. They will appear with dollar
  signs in RED."* Its net, G56, adds gains and losses straight
  (`=F55+G55+…`). `SCH E BANK TRANS p1`!C8: *"Transfers out should be
  entered as negative numbers. Use parentheses ( ) to indicate the amount is
  negative."* Schedule E's totals feed no other formula. The app's totals
  (`annual-accounting/totals.js` near 56–57, 92–93) follow the same rule.
- `sanitizeDecimal()` (`form-contract.js` near 704–713) treats only a
  leading "-" as negative. `sanitizeNonNegativeDecimal()` (near 618–625)
  strips "-" while typing and on leaving the box.
- `sanitizeNegativeAmounts()` (`form-runtime.js` near 40–55, called from
  the Annual's mount near 145) clamps D-1 to D-4 amounts, and four
  Simplified Part II lines, to 0 on every open with no notice. AGENTS.md
  §8.2: never change data silently.
- The Loss and Transfer Out boxes are hand-written (Annual `index.js` near
  1092 and 1307), with no field metadata; the Loss box is starred but not
  marked required.
- The Schedule E PDF has no totals row (`pdf-model.js` near 887–895); the
  screen and the workbook both have one.
- Which amounts keep a minus, and why: the Starting Balance (71E, decision
  D12), Schedule C losses and Schedule E transfers out (the workbook), and
  every share (71C, decision D7). No decision makes the other amounts
  non-negative; 71C and 71E left them "exactly as today". The workbooks set
  no numeric validation at all.

### Design

1. **No calculation changes.** A positive loss or transfer out gets a
   non-blocking warning, on the page and at Preview, quoting the Clerk's
   instruction.
2. The signed boxes read "(1000)", "−250", "–250" and "$-1,000" as negative.
   This changes how input is read, not a formula.
3. Where a minus is refused, a short note says why and where a loss belongs
   ("This amount can't be negative; enter a loss under Loss / Reduction").
4. The Loss and Transfer Out boxes are drawn by the shared field renderer as
   signed amounts, like the Starting Balance.
5. The Schedule E PDF gets the totals row the screen and the workbook have.
6. The 0.5% share warning reaches the Inventory and appears beside the box.

### Decisions

- **73G-1. A positive loss or transfer out.** (1) *Recommended:* a warning;
  the figure stays as typed, as in the Clerk's workbook. (2) Turn it negative
  automatically: this departs from the workbook and needs the requester's
  named approval (AGENTS.md §5).
- **73G-2. Parentheses and pasted minus signs.** (1) *Recommended:* read as
  negative, as the Schedule E instruction asks. (2) Refuse them with a note.
- **73G-3. Negative amounts on Schedules D-1 to D-4 and the Simplified's
  Part II** (an overdrawn account; an imported negative). (1)
  *Recommended:* keep the amount and show a visible warning, instead of
  zeroing it unseen. (2) Allow negatives in every amount box, as the
  workbooks do.

### Checklist

1. **Data model.** Field kind for the two boxes; `verify:data-model`.
2. **Legacy data.** 73G-3 stops the silent zeroing; a filing whose amount
   was already zeroed stays zero (the original value is gone).
3. **Fixtures.** None.
4. **Tests.** New unit specs for input reading (every notation above) and
   the warnings; `signed-amount-keypad.spec.ts` extended; an e2e import of a
   negative D-1 amount. Red-first for each defect.
5. **Export/import.** The Schedule E PDF totals row; the import path of
   73G-3.
6. **Security.** None.
7. **UI/UX.** The existing advisory box and inline field feedback.
8. **Legal framing.** None: the workbook's own instructions are followed.
9. **Cross-form.** Only the Annual family has signed schedules; the
   Inventory negates liabilities in its own formulas, and the Simplified has
   no loss column.

---

## 73H — One way to show dates and negative amounts (P9, D21)

### What a filer observes

- Dates appear as **2025-01-01** on the summary pages, the Annual's Part
  III–V statements ("from 2025-01-01 through 2025-12-31"), the bond warning
  and the Inventory Summary's GID. The PDFs print MM/DD/YYYY.
- A blank date prints "for the period through ." on the PDFs, "[from date]"
  on one screen, "—" on another and "[date]" in the bond lines.
- Negative amounts appear five ways: "$-5,000.00" (Annual and Simplified
  PDFs), "($1,021.21)" (hand-wrapped in the same Annual PDF table), "-$1,089.89"
  (Inventory), "(5,000.00)" (Annual screens), "($5,000.00)" (Simplified
  screens and the sidebar). Hand-wrapping produces "((5,000.00))" and
  "($-50.00)" when the value is itself negative.
- The cover's Quick Summary shows Total Disbursements as a positive figure;
  Part VI shows it in parentheses.
- The Annual Plan PDF's Question 11 prints "monies 1259.59 from…".
- The Annual's audit fee says "Total Assets: $3,118.17" for a figure that
  is net of Schedule D-5 (Line 30); the on-screen fee prints "20.00" with no
  dollar sign.

### Evidence and authority

- One shared date formatter (`formatDisplayDate`, `date-parser.js` near 122)
  is bypassed by `formatSummaryDate` (`summary-renderer.js` near 72), the
  Annual's on-screen `fmtDate` (near 18), the bond warning's `asDay`
  (`form-derived-fields.js` near 53) and the Inventory Summary's raw GID
  (near 800); seven PDF models keep near-duplicate private formatters.
- One money formatter (`formatMoney`, `money.js` near 73) with five styles,
  bypassed by hand-wrapped parentheses (Annual `pdf-model.js` near 174–178
  and 203; Annual `index.js` near 1396–1410, 1425–1428;
  `starting-balance-carry.js` near 121) and by Q11
  (`plan-annual/pdf-model.js` near 507).
- **Every amount cell in all three Clerk workbooks is formatted
  `"$"#,##0.00_);("$"#,##0.00)`, i.e. ($1,234.56).** 71E's design step 8
  said negatives would print in parentheses "matching the workbook"; its
  build chose "$-1,234.50" for both PDFs. The recorded design and the build
  disagree.
- The original Annual Plan reads "monies of $___________"
  (`plan-annual-original.txt` near 438).
- The Annual workbook's fee table (`PART II, III` rows 13–17) has no base
  cell; its Line 30 is labelled *"Net Assets at End of Accounting Period"*
  (`PART VI, VII`!B30). Whether the fee base should be net or gross is
  already an open question for the Clerk (Milestone 71, Legal Q-03); this
  item changes only the label.

### Design

1. Every displayed date goes through `formatDisplayDate`.
2. One blank-date placeholder (73H-2).
3. One negative style on every PDF and screen (73H-1); hand-wrapped
   parentheses are replaced by the formatter's own style, and the Quick
   Summary matches Part VI.
4. Q11 prints as currency.
5. The Annual's fee line reads "Estate value (Net Assets, Line 30):
   $3,118.17"; the on-screen fee gets its dollar sign.

### Decisions

- **73H-1. Negative amounts.** (1) *Recommended:* ($5,000.00) everywhere,
  the Clerk's workbook format. (2) Keep each surface's style and fix only
  the broken cases.
- **73H-2. A blank date on the PDF.** (1) *Recommended:* a blank underline,
  as on the paper forms. (2) "[date]". (3) "—".

### Checklist

Presentation only; no calculation changes (§5 does not apply). No data-model
or legacy change. New `tests/unit/display-formats.spec.js`; the PDF text
specs that pin today's formats are updated with the change stated. All nine
forms.

---

## 73I — Due dates that match the statute (D33)

### What a filer observes

For an annual accounting whose period ends 12/31/2025, the dashboard says it
is due 03/31/2026 and marks it overdue on 04/01/2026, the actual due date.
The gap is one to three days depending on the month (12/31/2027 → 03/30/2028;
06/30/2026 → 09/28/2026).

### Evidence and authority

- `dashboard/view-model.js` near 94–98: period end + 90 days, "90 days after
  the end of the accounting period (F.S. 744.367)"; pinned by
  `tests/unit/dashboard-view-model.spec.js` near 24–27.
- **§744.367(2):** *"each guardian of the property shall file with the court
  an annual accounting on or before April 1 of each year … If the court
  authorizes or directs filing on a fiscal-year basis, the annual accounting
  must be filed on or before the first day of the fourth month after the end
  of the fiscal year."* The 90-day rule is §744.367(1), for the **plans**.
- The Clerk's Annual workbook (`PART I`!C7): *"This signed Annual Accounting
  is DUE on the FIRST Day of the FOURTH month after the ward's Fiscal
  Year-end, pursuant to FS 744.367."* The Simplified workbook says the same.
- The only support for 90 days is the Clerk's work slips ("Report timely
  filed (90 days)"), the lowest authority in AGENTS.md §5.
- **Final Accounting:** the app also uses + 90 days, which has no basis.
  §744.527(1): the guardian "shall promptly file his or her final report",
  or "no later than 45 days after he or she has been served with letters of
  administration or letters of curatorship" if the ward has died.
- **Plans:** §744.367(1): within 90 days after the last day of the
  anniversary month, or by April 1 for calendar-year filing, and the plan
  "must cover the coming fiscal year". The original Annual Plan form says the
  same and asks "For the period: ___ through ___" without saying which year
  it means. The app counts 90 days from Period To: right if filers enter the
  year just ended, about a year late if they enter the coming year, and a day
  or two early for a calendar year.
- The Inventory and Initial Plan (GID or Letters + 60) match §744.362(1).
  The Inventory's unused `deadlineBasis` text cites §744.365; it should cite
  §744.362(1).

### Decisions

- **73I-1. Annual, Trust and Simplified accountings.** (1) *Recommended:*
  the first day of the fourth month after Period To, as the statute and the
  workbook say. (2) Keep the work slip's 90 days (recorded as Pinellas Clerk
  practice if so).
- **73I-2. Final Accounting.** (1) *Recommended:* show no due date, with
  "Due promptly; 45 days after letters of administration if the ward has
  died (§744.527)". (2) Ask the filer for the triggering date and count from
  it.
- **73I-3. Plans: which year "For the period" is (Clerk practice).**
  (1) *Recommended, if filers enter the year just ended:* keep counting 90
  days from Period To, use April 1 when Period To is December 31, and say on
  the Plans' covers which year to enter. (2) If filers enter the coming year:
  count 90 days from the day before Period From.

### Checklist

No data model or legacy change; dashboard display only. The four pinned rows
in `dashboard-view-model.spec.js` change, with cases for each month length
and a leap year.

---

## 73J — Pages that keep up with a change (P5)

### What a filer observes and why

| What stays stale | Cause | Fix |
| --- | --- | --- |
| Annual Schedule B-4's Category Summary and "Assign a bank account" note, after a category, amount or account change (the total updates) | Built only when the page is drawn (Annual `index.js` near 1023, 1042–1072); the live refresher updates only tagged totals (near 271–296) | Refresh them on each change |
| "No attorney is entered, so this part is not required" on Inventory D-2, the Annual family's Part V **and the Simplified's Part V**, after an attorney is entered | The live watcher toggles only the asterisks (`attorney-required-markers.js` near 31–57) | The watcher shows and hides the note too |
| The sidebar's "Guardian: —" and the Active Filing name after an Excel import | The router refreshes the filing card (`3645819`) but not the header (`syncGuardianNameDisplay()`, `sidebar.js` near 53) | Refresh both with the card |
| Inventory Summary's "→ Complete Bond & Surety Info (D-4)" while D-4 is ✓ | A fixed link (near 845) that reads as a to-do | Hide it once D-4 is complete |
| Dashboard status override: "Automatic (Pending court review)" after choosing that override | The label shows the effective status (`dashboard/index.js` near 216–218), not the inferred one | Show what Automatic would infer |

### Checklist

No decision, data model, legacy or export change. New
`tests/e2e/live-page-parts.spec.ts`, one case per row; red-first.

---

## 73K — The page stays where the filer was (D9)

### What a filer observes

On every form, choosing a signature option, Add, Remove or Duplicate on a
row, the vehicle box, the preparer and certifier boxes, and Yes/No answers
that change the page all scroll the page back to the top. The next click
lands on a different control.

### Evidence

Every form's `mount()` sets `container.scrollTop = 0` (Annual near 195,
Inventory near 227, Simplified near 253, the four Plans near 117, 182, 113
and 117), and those actions redraw the same page through `renderPage()`
(`form-events.js` near 155–157).

### Design

`renderPage()` keeps the scroll position when it redraws the page already
shown, and resets to the top only when the page changes.

### Checklist

No decision, data or export change. New
`tests/e2e/redraw-keeps-scroll.spec.ts` on one accounting and one Plan;
red-first. `npm test` recommended: every page redraw goes through the router.

---

## 73L — Dialogs that wait their turn (P10, P12)

### What a filer observes

- "Supporting documentation — You have entered items on Schedule X" pops up
  right after "+ Add Entry", before anything is typed.
- Dialogs stack: the reminder on top of "Please confirm", or three deep with
  the Simplified eligibility dialog and its "does not qualify" Notice. The
  eligibility dialog stays open behind the Notice after the filing exists.
- The Help panel covers the dashboard's toolbar and Actions column.
- With the tab in the background, Preview sits at "Generating preview…" and
  every dialog waits — including "Continue despite outstanding
  requirements", the only thing that re-enables Save on an incomplete
  filing, which is why Save as Excel "stayed disabled".

### Evidence

- A schedule counts as having items when it has any row at all
  (`schedule-doc-ack.js` near 86–92).
- Each dialog is its own layer with no queue (`dialogs.js` near 49–59) and
  becomes visible on the next animation frame (near 99–107), which a hidden
  tab never runs.
- The eligibility dialog closes only after the awaited Notice
  (`filing-dialogs.js` near 189–192).
- Preview renders with pdf.js's display intent, which advances on animation
  frames (`pdf-preview.js` near 257).
- The Help panel is a fixed 410px drawer (`shell.css` near 287).
- **The reminder on other pages: partly explained.** It is asked on every
  redraw of a schedule page that has rows, until acknowledged (Cancel records
  nothing, by design, Milestone 57C-R). So anything that redraws that page
  re-asks it over whatever the filer is doing, and a dialog created in a
  hidden tab appears later on whatever page is open. One of the checks saw
  the Inventory's A-1 reminder appear inside the Add Form dialog while an
  Annual was being created; a direct attempt (A-1, then Add New Form, then
  Create) did not reproduce it. The exact path is not established.

### Design

1. A schedule counts as having items only when a row holds something. After
   Cancel, the reminder is not asked again for that schedule until the filer
   adds or changes a row, and never while another dialog is open.
2. Dialogs show at once, without waiting for a frame, and one at a time.
3. The eligibility dialog closes before its Notice.
4. Preview finishes rendering when the tab returns, rather than stalling.

### Decisions

- **73L-1. The Help panel.** (1) *Recommended:* push the page over, so
  nothing is covered. (2) Keep it overlaying.

### Checklist

No data or export change. New `tests/e2e/dialog-order.spec.ts`;
`schedule-doc-ack.spec.ts` extended (an empty row asks nothing). `npm test`
recommended: every dialog goes through `dialogs.js`.

---

## 73M — Excel: what it doesn't carry, said plainly (D7, D12, D15)

### What a filer observes and the facts

- **Inventory D-4's bond answer.** The Clerk's workbook has no box for the
  arrangement (Milestone 67B), so a workbook imported into another filing has
  it guessed from the bond cells. "Bond and restricted depository" comes back
  as **"Bond only"** — a different answer, which the PDF then prints
  (`bond-depository.js` near 124–136; `pdf-model.js` near 785–792).
- **Inventory A-2 Notes** appear on screen and in the PDF but never in Excel,
  and an import **erases notes already in the filing** (the importer sets
  `notes:''`, `excel.js` near 712). Each A-2 entry in the workbook spans five
  rows; the fifth is unused and undefined by the Clerk.
- **B-2 vehicle details** come back as an ordinary item with the joined text
  (the workbook has one description cell).
- **The Annual's Parts VI & VII explanation** is required when Line 20 and
  Line 30 differ, prints on the PDF, and the page says *"This explanation is
  included on the exported document"* (Annual `index.js` near 1439), but the
  Clerk's sheet has no box for it (`excel.js` near 52–56: `explanation:
  null`; I20 and I30 are formulas and must never be written).
- **Save as Excel with Part XI entries** is disabled (Milestone 58D: the
  court's Part XI sheet has no place for them), but the disabled button
  can't show its tooltip and the explanatory alert is unreachable
  (`print.js` near 56; `excel.js` near 160–166).

### Design

1. The D-4 guess leaves the answer blank when the cells can't tell the
   arrangements apart, so the filer answers it, instead of a wrong answer.
2. An import keeps A-2 Notes already in the filing (`import-keep.js`).
3. Save as Excel stays clickable and explains why it can't proceed.
4. The Parts VI & VII sentence says "PDF", per 73M-2.
5. 73E's after-import notice lists what the workbook doesn't carry.

### Decisions

- **73M-1. A-2 Notes in Excel.** (1) *Recommended:* leave them out of the
  workbook and say so at Save as Excel; don't write into a row the Clerk's
  form doesn't define. (2) Write them into each entry's unused fifth row.
- **73M-2. The Parts VI & VII explanation in Excel.** (1) *Recommended:* a
  warning at Save as Excel that the explanation must be filed separately or
  the PDF used. (2) Steer the filer to the PDF when out of balance, as Part
  XI does. (3) Ask the Clerk for a box.

### Checklist

No data model change. `bond-depository.spec.js` (the ambiguous guess),
`import-keep.spec.js` (notes kept), an e2e case for the Save as Excel
explanation. The workbook is never written in an undefined cell unless
73M-1 (2) is chosen.

---

## 73N — The Simplified Annual Plan's PDF (D19, D8)

### What a filer observes

- Questions are numbered "1."–"6.", then "Q7.", "Q8.", "Q9."
  (`plan-simplified/pdf-model.js` near 101, 106, 111).
- With a box ticked, Question 8's heading is cut off at "…the following was
  executed by or on": the engine draws checklist headings on one line
  (`pdf-engine.js` near 1149). Measured: 622pt of text in 540pt. No other
  heading on the nine forms overflows.
- The PDF drops the original form's parentheticals on Questions 3 and 5–9.
  Q9's is substantive: *"this does NOT include payments … from a government
  benefits program such as Social Security, Medicaid…"*. The guardian answers
  a narrower question on screen than the one the filed PDF shows, under
  penalty of perjury.
- The dashboard shows "No filing contact": `deriveFilingContacts()`
  (`dashboard/view-model.js` near 39–67) has no branch for this filing type.
- **Not a defect:** the PDF omits the preparer and attorney blocks because
  the court's original form has neither (Milestone 61E, decided 2026-09-20).
  But the page titles both cards "Certification and Signature of …" without
  saying they don't print, and the guide mentions only the attorney.

### Design

1. Number 7, 8, 9.
2. The engine wraps long checklist headings (all forms benefit).
3. Restore the original's wording on the PDF, per 73N-1.
4. The dashboard reads this filing type's preparer and attorney.
5. The two cards say "Kept for your records; the court's Simplified Plan has
   no place for it, so it is not printed."

### Decisions

- **73N-1. The questions' wording on the PDF.** (1) *Recommended:* the
  original form's full text, parentheticals included. (2) Keep today's
  shortened text.

### Checklist

No data change. `pdf-form-specific.spec.ts` (numbering, full Q8 and Q9
text), `dashboard-view-model.spec.js` (the contact). Red-first for each.

---

## 73O — Cross-form differences (P7, P8, P11, D18, D20, D29)

AGENTS.md §8.9: a difference between forms is not automatically a defect.
Each one below is classed as **by design** (the Clerk's forms differ, or the
requester decided), **defect**, or **open**.

### The same fact typed in two places (P7)

| Fact | Today | Class |
| --- | --- | --- |
| Attorney name, Annual family and Simplified (Cover and Part V) | One field, edited from both pages; the Simplified workbook links them too (`PARTS V, VI`!J17 and J41 `='PARTS I, II '!D15`) | By design |
| Attorney name, Inventory (Cover and D-2) | Two fields, with a warning when they differ | By design (72H, 2026-10-02) |
| Guardian name, Annual (Cover and Part III) | Two fields; the exporter writes Part III's name over the workbook's link, with a warning | By design (2026-09-19) |
| **Guardian name, Simplified (Cover and Part IV)** | Two fields, **no warning**. The Clerk's workbook links Part IV to the cover (`PARTS III, IV`!F15 `='PARTS I, II '!D16`), so **Excel shows the Cover's name in Part IV while the PDF shows Part IV's**. An import replaces Part IV's name with the Cover's, unseen (`excel.js` near 351) | Open (73O-1) |
| **Attorney name, Initial Plan (Cover and Attorney Certification)** | Two fields (`attorneyName`, printed on the PDF's cover; `attorney_name`, the certification), no warning; the dashboard lists two attorneys when they differ. The Annual Plan binds both places to one field (`plan-annual/index.js` near 248 and 653), and the two original forms are laid out the same way (`plan-initial-original.txt` near 19 and 418). The CSV calls `attorneyName` "cosmetic-only", but it prints | Defect (73O-2) |
| Guardian names, Initial Plan (Cover and Signatures) | The same unlinked, unwarned pattern | Defect (with 73O-2) |

### The engines doing the same job differently (P8)

| Difference | Finding | Class and fix |
| --- | --- | --- |
| **No Print button** on the Annual, Final, Trust and Simplified previews | They never had one (first commit `e117ac8`); no decision recorded. The print action is already registered on both (`annual-accounting/print.js` near 90, `simplified-accounting/print.js` near 89); only the button is missing. The guide says Print exists | Defect. Add it, with a test that clicks it |
| "✓ Exported!" | Only the Inventory writes it (`guardian-inventory/excel.js` near 597); the others leave their status line empty | Defect. The same message on every form |
| Page footer | Inventory: "← Previous: … · Page n of 19 · Next: … →"; every other form "← Back / Next →" | Open (73O-4) |
| Next on an incomplete page | Left enabled on the Inventory's Cover and D-1 to D-5 and on the Plans' certificates | By design (2026-09-21; 68C). Guide only (73Q) |
| Preview banner | Four wordings; the Inventory's shows no count or status | Defect. One banner |
| Checklist wording | "X is required." / "X" / "X is required" | Defect. One wording, with 73F's "Section — Label" |
| **Certificate recipients' address lines** | All three Clerk workbooks give each of four recipients a name row and four address rows (Annual `PART X` rows 11–15, 17–21; Inventory `PART VI` rows 13–17, 19–23; Simplified `PARTS V, VI` rows 27–31, 33–37). The app collects four lines on the Annual but three on the Inventory and Simplified, so a "c/o" or suite line fits on one form only. (The test's "two cards" on the Simplified did not reproduce: a new filing shows one) | Defect (73O-3) |
| Method-of-service placeholder | Only the Inventory's box shows grey "U.S. Mail" (`index.js` near 1284), which reads as an answer while the PDF omits the line and Preview says it is missing | Defect. Remove it; the label already gives examples |
| Schedule totals' format | Only the Simplified's screens match the workbooks' "($1,234.56)" | With 73H-1 |
| "($)" in money labels | Twelve Inventory labels say "($)" beside a box that already shows "$" | Defect. Remove "($)" |
| Sidebar card's figure | Total Value / Net Assets / Ending Balance; none on the Plans, deliberately (a "$0.00" on a report about the ward's person would mislead, `filing-registry.js` near 113–117) | By design. The Simplified's "Ending Balance" becomes the workbook's "Remaining Assets On Hand" (`PARTS I, II`!C31) |
| Annual Schedule D column names | "Ward's Amount" (D-1, D-3), "Total Value" (D-2, D-4), "Ward's Balance Due" (D-5). The variation is the Clerk's, but **"Total Value" is wrong**: the figure is full value × the ward's share (workbook `J16 =G16*H16`), which the workbook calls "Ward's Value of Ownership" | Defect. Use the workbook's labels |
| Add New Form's names | "Simplified Annual Accounting", "Annual Accounting (Full)"; the cards say "Simplified Accounting", "Annual Accounting" (`common-modals.html` near 154–155) | Defect. One list of names |
| "inventory type" | The New Filing from Existing dialog (`common-modals.html` near 29) and the help panel (73P) | Defect. "filing type" |

### Internal names reaching screen readers and the console (P11)

- **Simplified Part II's five boxes have no label.** A screen reader
  announces "startingBalance", "interestIncome"… because the visible "Line 1
  Starting Balance…" is a plain `<span>` (`simplified-accounting/index.js` near
  488–527) and the shared fallback names a box by its internal path
  (`form-runtime.js` near 138–150). A sweep of every page of all seven
  engines found no other such box. Fix: real labels, and the fallback stops
  using internal names, so a missing label shows up in testing.
- **Every Comments box is named "Comments about schA", "Comments about
  planICover"…** (`schedule-docs.js` near 259; the hidden upload input near
  255), on 62 pages. Fix: name it from the page's title.
- **"Date entry - gid must be a valid date…"**: fixed in 73F, Step 2.
- **The ward's name is written to the browser console** on every Create Form
  (`src/core/modals/filing-dialogs.js` near 38). In an app that holds
  guardianship records, that line goes. (The test's "several times per
  click, including earlier wards" did not reproduce: one line per click, and
  there is one listener. The test's console reader most likely returned the
  whole session's log each time.)
- **About 2,000 debug lines** come from html2canvas, not pdf.js: the PDF
  engine creates its PDF object by rendering an empty page through html2pdf
  (`pdf-engine.js` near 145–148), and html2canvas logs by default. Fix: turn
  its logging off.

### Rendering (D18, D20, D29)

- **D18. Oversized "Supporting Documents" and "Comments" headings** — on
  every form, not only the Plans: 32px, larger than the page's own 21px
  title. Commit `26a6a9f` changed them from `h4` to `h2`
  (`schedule-docs.js` near 253 and 258); the styles still target `h4`
  (`cards.css` near 125–126). Fix: style the `h2`.
- **D20. The Trust accounting's title and wording — mostly by design.** The
  Clerk's Annual workbook covers trust accountings: its `PART I`!H3 "Indicate
  Filing Type:" offers Annual, Final and Trust, every schedule prints the
  filing type, and `PART VIII`!B7 says a separate trust accounting is filed
  for each trust. "The guardian" is the workbook's and the trust work slip's
  wording. The PDF title "TRUST GUARDIANSHIP ACCOUNTING" is the app's own;
  the workbook prints "ANNUAL ACCOUNTING" with Filing Type "Trust", and the
  work slip says "Clerk's Audit of TRUST Accounting". The cover's "Import
  Excel File (existing annual accounting template)" is accurate and can say
  "the Annual workbook, Filing Type: Trust". The trust work slip also asks
  "Is the trustee and the guardian the same person?", which raises who signs
  when they are not: a Clerk-practice question (73O-5).
- **D29. "Service Recipients" stranded at the foot of a Simplified PDF
  page.** A table's title reserves 20pt, but its header and first row need
  43pt (`pdf-engine.js` near 1203 and 1424). Keeping table titles with their
  tables was left out by the requester's decision of 2026-09-22
  (`MILESTONE-64-PROPOSAL.md`, D4), because doing it for every table added a
  page to every Initial Inventory; the Simplified was not measured then.

### Decisions

- **73O-1. The Simplified's guardian name, Cover and Part IV.**
  (1) *Recommended:* keep the Clerk's link in Excel; warn when the two names
  differ, saying the workbook prints the Cover's and the PDF prints Part
  IV's (as 72H does for the Inventory's attorney); an import keeps Part IV's
  name. (2) Write Part IV's name over the link, as the Annual does. That
  writes into a formula cell and needs the requester's named approval (§5).
  (3) Make it one field, typed once.
- **73O-2. The Initial Plan's attorney and guardian names, Cover and
  inside.** (1) *Recommended:* one field each, as the Annual Plan does; a
  filing that already holds two different names asks the filer which to
  keep. (2) Keep two fields and warn when they differ.
- **73O-3. Recipients' address lines.** (1) *Recommended:* a name and four
  address lines on every form, as all three workbooks allow. (2) Leave them
  as they are.
- **73O-4. The page footer.** (1) *Recommended:* the Inventory's footer
  ("← Previous: … · Page n of N · Next: … →") on every form. (2) Leave the
  footers and correct the guide.
- **73O-5. The trust accounting (Clerk practice).** The PDF title: (1)
  *Recommended:* keep "TRUST GUARDIANSHIP ACCOUNTING", parallel to the other
  two titles. (2) "TRUST ACCOUNTING", as the work slip says. (3) "ANNUAL
  ACCOUNTING" with Filing Type: Trust, as the workbook prints. And who signs
  when the trustee is not the guardian: asked as Clerk practice, not decided
  here.
- **73O-6. Keeping a table's title with its table.** (1) *Recommended:* on
  the certificate's recipient tables only, on every form; the Inventory's
  page count is unchanged, and some filings may move the recipients to the
  next page. (2) Leave the 2026-09-22 decision as it is.

### Checklist

1. **Data model.** 73O-1 (3) and 73O-2 merge fields; 73O-3 adds an address
   line on two forms; `verify:data-model`.
2. **Legacy data.** 73O-2: a filing with two different names asks which to
   keep (visible). 73O-3: existing addresses keep their lines; the new one
   starts blank.
3. **Fixtures.** Recipient fixtures on the Inventory and Simplified gain the
   new line only where a test needs it.
4. **Tests.** A click on Print on every preview; the recipients' lines in
   PDF and Excel on all three accountings; an accessible-name sweep of every
   page (no internal names); the console has no ward name after Create;
   red-first for each defect.
5. **Export/import.** 73O-1 (2) would write a formula cell; 73O-3 changes
   three exporters and importers.
6. **Security.** The console line removed is the one privacy change.
7. **UI/UX.** Each fix adopts the pattern already used on the other forms.
8. **Legal framing.** 73O-5 is asked as Clerk practice.
9. **Cross-form.** This item is the cross-form pass.

---

## 73P — Small fixes (D14, D22–D27, D32, the Help panel)

| Finding | What a filer sees | Fix |
| --- | --- | --- |
| D14 | Removing a schedule entry, recipient or witness is immediate, with no confirmation or undo, on every form; the Inventory's co-guardian removal also lacks the confirmation the other forms give | Per 73P-1 |
| D22 | Link to Case lists the ward's name once per filing (`pick-record-dialogs.js` near 88–91) | List each name once |
| D23 | Start New Year (Inventory) says "opens a new blank year" and then that it copies this year's schedules (`common-modals.html` near 107; `year-dialogs.js` near 19–21) | One accurate sentence |
| D24 | Export All Filings suggests the live case file's name; choosing a **new** name silently makes that file the live case file, so auto-save follows it (`case-file.js` near 88–95, 425–457) | Per 73P-2 |
| D25 | "Encrypted with the rest of this ward's data" on a case with no password (`schedule-docs.js` near 254; guide near 319 and 848) — this overstates the protection (§8.6) | Say so only when the case is encrypted |
| D26 | Typing in the Active Filing picker until one filing is left and pressing Enter does nothing (`filing-switcher.js` near 71–90) | Enter opens the single remaining match |
| D27 | Dashboard search box beside empty space | Needs a browser check at 1280px and 2000px+ wide before any change |
| D32 | The Simplified eligibility dialog says ward details carry over "from an existing Simplified Annual Plan" while the list offers every filing (`common-modals.html` near 213) | Match the list |
| Help panel | "Choose your inventory type (Initial, Simplified, or Annual)"; "Use the sun/moon button in the sidebar" (it's in the toolbar); the Start New Form help says "Three Types of Inventory" (`help-content.js` near 10, 16, 19–27) | Nine filing types; the toolbar |

### Decisions

- **73P-1. Removing a card.** (1) *Recommended:* confirm when the card holds
  anything, as co-guardians already do on most forms. (2) An Undo link
  instead. (3) Leave as is.
- **73P-2. Export All Filings.** (1) *Recommended:* call it "Save case file
  as…" and keep its current behaviour, so the name says what it does.
  (2) Keep the name and stop it becoming the live case file.

---

## 73Q — The user guide matches the app (section 6 of the test)

Done last, against the finished app, with the figures re-shot through
`npm run capture:guide` and checked one by one.

**Statements to correct** (the app is right, or will be after the items
above): Unsigned (73A); "the sidebar and the check that blocks your export
now apply the same rule" (73F); "never answered for you" (73B); "County is
not free text" (73F-2); un-ticking (73D); the Plans' co-guardian blocks,
which are added with a button, not fixed (73C); the Simplified's Part IV has
one block plus "+ Add Co-Guardian", not three; Inventory D-5 has one card,
and the "no recipients required" question is a Yes/No pair shown above it;
the page footer with "Page x of y" is the Inventory's only; the Next button
is left enabled on the Inventory's Cover and D-1 to D-5 by design
(2026-09-21) and on the Plans' certificates; Print exists only on the
Inventory and the Plans (or 73O adds it); the Simplified Plan's "x of 9
questions answered" is on its Summary page, while the sidebar counts
sections; the filing card's labels are Total Value, Net Assets and Ending
Balance, and the Plans have none; "a blank Ward's % counts as 0%" is true
and also listed as missing (71D); the Simplified Plan prints neither the
attorney nor the preparer (73N); "Pick a filing and press Enter" (73P); the
UCN (73S).

**Contradictions within the guide:** the quick reference's "+ New Form →
pick a card" (it opens the dialog directly); the saving table's Firefox and
Safari wording (the figure is right: they say "not available in this
browser"); the Print Preview figure's "2026-CP-000123" (the harness loaded
the case number without formatting; re-shoot with 26-001234-GD); the
workspace figure's "Guardian: —" (fixed by 73J, then re-shot).

**Also:** the cover-field lists omit the UCN on six of seven forms
(`help/index.html` near 379, 462, 496, 547, 570, 597); the import paragraph
(near 330) should say that D-2's attorney name comes back from the Cover's,
by the Clerk's own formula (72H).

**Layout.** The text column has no maximum width (about 2,100px lines at a
2,560px window), and figures shrink into two-across thumbnails. A text width
of about 75 characters, with figures shown at natural size, fixes both.

---

## 73R — The requester's change requests R1–R3

### R1 — More room for the section list on a short window

**Measured by the test:** the sidebar's fixed blocks take 577px with the
save controls closed and 743px open, so at a 768px-tall window the section
list gets 182px (16px with the controls open) and at 600px none at all.
**Confirmed in the code:** every `@media` rule is width-based; nothing
responds to height (`shell.css` near 60 and 66, and the other stylesheets).

| Block | What it does | Could become |
| --- | --- | --- |
| Header (65px) | App name and "Guardian: <name>" | Less padding on short windows |
| Filing-type strip (33px) | The filing's type — **which the card just below already shows** | Dropped while the card is shown (73R-2) |
| Active Filing picker and card (304px) | Picker; type, total, "Filing Progress", bar, "x of y sections complete", "Jump to…" | Label and total on one line; % and count on one line (about 50–70px) |
| Save area (128px closed, 294px open) | Last backup, auto-save status, Show/Hide; then interval, Save, Open, Lock, Clear | One status line with the toggle beside it (about 60px); the open controls as a pop-over (73R-3) |
| Copyright (47px) | "© Copyright <year> Pinellas County Clerk…", about three lines | Per 73R-1 |

A `@media (max-height: …)` block does most of it. Estimated gain: about
250px for the section list, to be measured in a browser.

### R2 — "GF" for "PG"

The mark appears in the sidebar's shield (`index.html` near 41), the Terms
of Use dialog (near 155), the guide's header (`help/index.html` near 110),
**and two raster icons the test didn't list**: `icons/icon-192.png` and
`icons/icon-512.png` (favicon, Apple touch icon and installed-app icon,
through `index.html` and `manifest.json`). Every full-window guide figure
shows the shield. The app's name is already "Guardian Forms" everywhere,
and no PDF, workbook or test carries "PG". Internal `pg-` names (the theme
setting `pg-theme-v1`, the service-worker cache prefix, font constants) stay:
renaming the theme key would reset every filer's light/dark choice once, and
Milestone 62 kept them for that reason. Filers who installed the app may see
the old icon until it refreshes.

### R3 — Fit height and full width in Print Preview

The preview renders at a fixed scale of 1.5 (`pdf-preview.js` near 235), so a
Letter page is 918px wide inside a container capped at 912px (`print.css`
near 6), and there is no zoom control. The Viewing bar (`print-pager.js` near
133–145) holds the page selector, "Page x of y" and Prev / Next, and is not
drawn for a one-page preview.

Design: "Fit height" and "Full width" buttons beside Prev / Next; the page is
re-rendered at the chosen scale (sharp on high-resolution screens); the
annotation layer is rebuilt at the new scale (`pdf-annotate.js` near 205); the
choice is kept on this device, with the other display settings (AGENTS.md
§6).

### Decisions

- **73R-1. The Clerk's copyright line.** (1) *Recommended:* one line,
  shortened with the full text on hover. (2) Moved to the bottom of the
  scrolling section list. (3) Fully visible, as today.
- **73R-2. The filing type shown twice.** (1) *Recommended:* once, on the
  card. (2) Keep both.
- **73R-3. The open save controls.** (1) *Recommended:* open over the
  section list as a pop-over, so they never push it away. (2) Push it, as
  today.
- **73R-4. The new icons.** (1) *Recommended:* drawn to match today's shield
  with "GF", for the requester's approval before they ship. (2) The
  requester supplies the artwork.
- **73R-5. Changing zoom while annotating.** (1) *Recommended:* the notes
  are kept and redrawn at the new size. (2) A warning that unsaved notes
  will be cleared.
- **73R-6. One-page previews.** (1) *Recommended:* get the bar too, so the
  zoom buttons are always there. (2) No bar, as today.

### Checklist

- **Data model and legacy data.** None; the zoom choice lives in
  `localStorage`.
- **Fixtures.** None.
- **Tests.** `routes.spec.ts` (copyright, type strip),
  `lock-and-save-state.contract.spec.ts`, `pdf-annotate.spec.ts`, new
  `tests/e2e/preview-zoom.spec.ts`; the guided tour's progress stop.
  `npm run test:e2e:portable`: icons and the manifest are packaging (§9).
- **Export/import, security, legal framing.** None.
- **UI/UX and cross-form.** All nine forms share the sidebar and the
  preview.

---

## 73S — The UCN (request R4)

### What the request changes

**Milestone 63 decided, 2026-09-21:** the UCN is optional and omitted from
the print when blank (`MILESTONE-63-PROPOSAL.md`, decision D8, option 1).
R4 reverses that.

### Today

- The UCN box is on all nine covers with **no asterisk**; it is kept exactly
  as typed. The Minors Plan requires the UCN **or** the Case #, and stars
  neither.
- Every PDF prints "UCN: …" beside the case number when it is filled in
  (`header-identity.js` near 30–40).
- **No Clerk workbook has a UCN cell** (a parser over every part of all
  three found none), so the Excel route can never carry it.
- The guide (`help/index.html` near 298) and the in-app help (`help-content.js`
  near 13) call it optional.

### What the sources say — flagged, not resolved

- **Rule 2.245(b)(1)**, Fla. R. Gen. Prac. & Jud. Admin.: *"The clerk of the
  circuit court and the clerk of the county court, where that separate office
  exists, shall use the Uniform Case Numbering System. The uniform case number
  shall appear upon the case file, the docket and minute books (or their
  electronic equivalent), and the complaint."* The duty is the clerk's.
- **Rule 2.525(f)(1)(A)** sends a filing to the correction queue when it
  "lacks a correct case number and the correct case number cannot be reliably
  and easily identified" — a case number, not the UCN.
- **Probate Rule 5.020** and **AO 2024-025** say nothing of captions or the
  UCN. The Clerk's work slips identify a case as "REF #: <case number> -
  <court location>".
- **The original Plan for Minors is the only Clerk instrument here with a
  UCN line:** "UCN: 52______GA00______XXGDXX / REF #: ______-________-GD-3 or
  4" (`reference/plan-forms/plan-minor-original.txt` near 3–4).
- Not available in `reference/`: the Florida Courts Technology Standards and
  the e-filing portal's filer requirements, either of which could require it.

So requiring the UCN is a policy the Clerk can adopt; the rules found here
don't compel it of filers. It is recorded as Pinellas Clerk practice if
adopted. Deriving it from the case number is only partly possible: the last
six characters (county use and courthouse) are not in the app's case number.

### Decisions

- **73S-1. What "required" means.** (1) *Recommended:* required like the
  Case Number: starred, listed as missing, and blocking at Preview (a filer
  can still continue past it, as with every required field). (2) Starred,
  with a non-blocking reminder. (3) Leave it optional.
- **73S-2. Which counties.** (1) *Recommended:* Pinellas, through
  `county-guidance.js`, optional elsewhere (§5: one office's practice isn't
  presented as statewide). (2) The Sixth Circuit (Pinellas and Pasco).
  (3) Every county.
- **73S-3. The Plan for Minors.** (1) *Recommended:* the same rule as the
  other forms, with the Case # required too. (2) Keep "UCN or Case #".
- **73S-4. Checking its form.** (1) *Recommended:* a warning when it isn't
  20 characters in the UCN's shape. (2) No check.

### Checklist

1. **Data model.** The UCN row's requiredness; `verify:data-model`.
2. **Legacy data.** Every existing filing without a UCN turns incomplete, with
   the item named: visible, and allowed (§8.2), but every test-system filing
   is affected.
3. **Fixtures.** Every `MINIMAL_VALID_*`, `fillMinimalValid*` and unit
   fixture gains a UCN (§8.3).
4. **Tests.** `ucn-cover-field.spec.ts` (which asserts it is optional) is
   rewritten; `ucn-header.spec.js`; the completion golden.
5. **Export/import.** The workbook has no UCN box: a Save as Excel note says
   so.
6. **Security.** None.
7. **UI/UX.** The Case Number's pattern.
8. **Legal framing.** Above; recorded as Clerk practice, not as a rule.
9. **Cross-form.** All nine covers.

---

## Reported, not reproduced or by design

| Test finding | What was found |
| --- | --- |
| The supporting-documents reminder fires on unrelated pages | Partly explained; the exact path is not established (73L) |
| The ward-creation console line repeats for earlier wards | Not reproduced: one line per click, one listener. The line itself goes (73O) |
| The Simplified's certificate has two recipient cards | Not reproduced: a new filing shows one |
| The Trust PDF's title and "the guardian" wording | Mostly by design: the Clerk's Annual workbook covers trust accountings (73O-5 asks about the title and the signer) |
| Amount boxes accept letters | Only digits are stored; letters never reach the filing |
| Three decimals stay in the box | By design: the rounding contract of 2026-09-20 sums unrounded and rounds for display, as the workbook does |
| Annual schedules with no entries don't block | By design: AGENTS.md §4, Pinellas Clerk practice (73F-4 asks about the Inventory) |
| The Simplified Plan's PDF omits the preparer | By design: Milestone 61E, the court's original has no such section (73N fixes the page and guide) |
| The Simplified Accounting's Excel has "/s/" in the attorney cells | The Clerk's workbook ships with it pre-printed; the app doesn't write it (73A-3) |
| D-2's attorney comes back from Excel as the Cover's name | By design: the Clerk's formula (`PART IV`!I26 `='SUMMARY I '!D24`), Milestone 72H, with a Preview warning when they differ |
| The readiness panel's title changes for an unknown county | By design: Milestones 38B and 44C don't infer a circuit from an unknown county; 73F-2 stops the county being unknown |
| A Signature Stamp needs no date | By design (Milestone 39-B). Whether an undated stamped signature is sufficient has not been reviewed: for a qualified person |
| The Simplified certificate cites §744.362(1) (round 2, N8) | Closed by the test itself: the Clerk's workbook carries the same citation |

### For the Clerk (not app changes)

- The Inventory workbook's `PART III`!B6 and the Annual workbook's `PART II,
  III`!B20 read "UNDER **PENALITIES** OF PERJURY"; the Annual's also has
  "**l** have" with a lower-case L. The app's PDFs print the correct text;
  Excel keeps the Clerk's (§5).
- All three workbooks carry an empty, very-hidden sheet named
  "Acerno_Cache_XXXXX". Milestone 71 left it for the Clerk: removing a sheet
  would re-point print areas by position.
- Already open from Milestone 71: whether the audit-fee base is net or gross
  (Legal Q-03).

---

## Verification plan for the milestone

- Every defect fix is seen failing first for the stated reason (AGENTS.md
  §2), then passing.
- Targeted specs per item; `npm run check:types` when an item touches
  `src/core/navigation/`, `src/core/persistence/`, `src/core/types/` or
  `tests/e2e/support/`; `npm run verify:data-model` when the CSV changes.
- **Full regression (`npm test`) is recommended** after 73F's Step 1 and
  73K (the checklist, sidebar and router are on every page), and once at the
  end. It needs the requester's go-ahead each time.
- `npm run test:e2e:portable` for 73R (icons and the manifest).

## Not in scope

- Changing any total, sign rule or fee base (§5). 73G and 73H change
  warnings and presentation only; the audit-fee base stays with the Clerk's
  answer to Legal Q-03.
- The four things the test could not exercise (encrypted cases, Clear All
  Data, Firefox/Safari, narrow windows) beyond what the items above touch.
