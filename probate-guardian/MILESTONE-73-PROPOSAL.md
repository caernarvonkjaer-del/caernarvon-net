# Milestone 73 Proposal — What the end-to-end browser test found

## Status

**Draft. Every decision is settled (2026-10-04 and 2026-10-05). Built so
far: 73U (2026-10-04, `5b8849b`), 73V (2026-10-05, `8b96aa3`), 73C
(2026-10-05, `861b6a9`, brought forward from its place in the build order at the
requester's choice) 73D (2026-10-05, `c8e84fe`, likewise), 73J part 1 (2026-10-05, `d819c4a`),
73F part 1 (2026-10-06, `5e9e17b`), 73A (2026-10-06, `83352d0`), 73F part 2 (2026-10-06, `d01edd4`), 73G part 1 (2026-10-06, `69a1b46`), 73E part 1 (2026-10-06, `8e02051`), 73F part 3 (2026-10-06, `67fc66c`), 73I (2026-10-06, `56a7c30`) and 73T part 1 (2026-10-07), each approved by name.**
**Approved and not yet built** (2026-10-07, one batch, built in this order
with a full regression midway and at the end): 73T parts 2–4, 73M (with
74C), 73B (then 74P), 73O part 2 (with 74F), 73G part 2 (with 74H), 73H and
73S. Nothing else is approved. Building any other item, or any part of a
split item, needs the requester's named approval of that item or part
(AGENTS.md §3).

How this document got here:

- Written 2026-10-04 from the requester's end-to-end browser test
  (`032e34b`); decisions settled the same day (`c529169`).
- Reviewed 2026-10-04 for accuracy, effectiveness and blast radius at the
  requester's request (`b83dcb4`): every design revised, 73T and 73U added.
  The findings are in [Appendix A](#appendix-a--review-of-2026-10-04-accuracy-effectiveness-blast-radius).
- Reviewed by Codex 2026-10-05; every point checked against the code
  ([Appendix B](#appendix-b--independent-review-codex-2026-10-05)).
- **Consolidated 2026-10-05**, as Codex recommended: each item below is now
  **one final specification**. Where this text and an earlier version
  disagree, this text governs. The text before consolidation is in git at
  `b83dcb4`. Every decision, with the options as they were asked, is in
  [Appendix C](#appendix-c--decisions-as-asked).
- Revised 2026-10-05 after **Codex's second round** on the consolidated
  text (Appendix B): 73V narrowed to a behaviour-preserving foundation plus the
  link fix, keyed by filing type and list, with transient row identity; 73E
  part 1 made workbook-independent; 73F part 1 given a compatibility contract
  that keeps each issue's outputs.
- Corrected 2026-10-05 after **Codex's third round**: the summary and
  build-order tables repaired (a scripted edit had swapped their rows), and
  73V's compatibility layer and the registry's direct users named.

The requester is a representative of the Clerk of the Circuit Court, Pinellas
County. Where an answer is about what the Clerk's office accepts, it is
recorded as **Pinellas Clerk practice**, not as a reading of a statute or rule
(AGENTS.md §4 and §5). Practice is county-specific.

| # | Item | What a filer sees today | Severity | Parts |
| --- | --- | --- | --- | --- |
| 1 | 73A | Choosing **Unsigned** prints "/s/ Name" and the electronic-signature caption on every form; a typed date makes it look signed; a Stamp never applied prints "/s/" | High | **Built** (2026-10-06) |
| 2 | 73B | The PDF says **"Plenary"** when no Type of Guardianship was chosen; a new Annual says **"Professional Guardian"**; rows, PDFs and the Inventory's workbook carry answers and shares the filer never gave | High | One |
| 3 | 73C | **"+ Add Co-Guardian" does nothing** on all four Plans | High | **Built** (2026-10-05) |
| 4 | 73D | Ticking and unticking **"This item is a vehicle"** erases the Description and the safe-deposit answer; hidden Plan "Explanation" text still prints | High | **Built** (2026-10-05) |
| 5 | 73E | **An Excel import replaces the filing unasked** (the Simplified's Cancel half-applies it), can turn a Trust into an Annual, and changes shared people's records in other filings unseen | High | Two (part 1 **built** 2026-10-06) |
| 6 | 73F | **A section shows ✓ and Print Preview then blocks it**; asterisks don't match what is enforced; a misspelled county passes everywhere | High | Three (all **built** 2026-10-06) |
| 7 | 73G | A loss typed positive is **added** unwarned; the Clerk's "(1000)" is stored as **+1000**; negatives are refused, shown as positive, or **zeroed on every page drawn**; "$1,234.56" in the Simplified's remuneration files as **$0.00** | High | Two (part 1 **built** 2026-10-06) |
| 8 | 73H | Dates print as **2025-01-01** on several screens; negative amounts appear **five ways**; Plan Q11 prints a bare number | Medium | One |
| 9 | 73I | The dashboard marks an annual accounting **overdue early: 0–3 days for a month-end period, 16–32 days for a mid-month one**; a Final gets a due date with no basis | Medium | One (**built** 2026-10-06) |
| 10 | 73J | Parts of a page stay **stale** after a change (eight cases) | Medium | Two (part 1 **built** 2026-10-05) |
| 11 | 73K | The page **jumps to the top**, and the cursor is lost, after a choice, Add, Remove and similar actions, on all nine forms | Medium | Two |
| 12 | 73L | **One Escape closes two dialogs**; a dialog stays **over the lock screen**; dialogs stack; a reminder fires for an empty row | Medium | One |
| 13 | 73M | Excel silently **doesn't carry** some answers, and one comes back wrong; Save as Excel can look enabled and do nothing | Medium | One |
| 14 | 73N | PDF headings can run **off the page** (the Simplified Plan's Q8 does); **sworn and certification wording is shortened on six forms** | Medium | Three |
| 15 | 73O | The Simplified's PDF and workbook print **different guardian names**; the Initial Plan keeps **two attorney names**; no **Print** button on four previews; recipients get three address lines on two forms; screen readers hear "startingBalance"; the **ward's name goes to the browser console** | Medium | Four |
| 16 | 73P | Small text and behaviour fixes | Low | One |
| 17 | 73Q | **The user guide** says things the app doesn't do — including that only the last four SSN digits are exported, when Excel writes them all | Medium | One |
| 18 | 73R | The requester's change requests: a shorter sidebar top, "GF" for "PG", fit-height and full-width in Print Preview | Requested | Three |
| 19 | 73S | The requester's change request: **the UCN** (starred, a reminder, never blocking) | Requested | One |
| 20 | 73T | **Exporting to Excel and importing back loses or changes data** on all three workbooks (Guardian #1's name, signature choices, Part VIII, rows, recipients) | High | Four |
| 21 | 73U | Opening a case file **cut the end off about 1 in 50 stored stamps and supporting PDFs** | High | **Built** (`5b8849b`) |
| 22 | 73V | Removing a guardian can **move the next guardian onto the removed one's shared record**; each form keeps its own row rules | High | **Built** (2026-10-05) |

### Provenance

- **The requester's end-to-end browser test of 2026-10-03** ("Guardian
  Forms — End-to-End UI Test Findings (combined)": the Milestone 71 retest
  plus a full pass over all nine filing types on the test system, browser
  only, no source access). It is not in the repository. Its numbers (P1–P12
  patterns, D1–D33 defects, R1–R4 requests) are kept in parentheses so each
  item traces back to it.
- **Checked against master at `7440c30`**, the build the test system served,
  by six read-only code reviews (2026-10-04), then **reviewed** by six more
  plus three field-by-field Excel inventories (Appendix A), then **by Codex**
  (Appendix B). They ran the real validators, sidebar rules, PDF models,
  parsers, formatters, importers and exporters from node, read the Clerk's
  workbooks with a parser (values, formulas, locking, validations), and
  measured PDF text with the app's own font metrics.
- **Every load-bearing claim was re-checked by hand**: code lines, workbook
  cells with a second parser, statute and rule text from
  `reference/legal/statutes/`. Reproduced in a browser: "+ Add Co-Guardian"
  on all four Plans; one Escape closing two dialogs; the reminder path.
  Claims marked "(needs a browser)" rest on code or node simulation.
- **What the test confirmed fixed:** the five Milestone 71 originals (H1
  method of service, H2 the sidebar's negative balance, M1 the Guardian
  Advocate hint, M2 caption text as a field name, M3 two Bar Numbers), 71C's
  percent fields and 71E's Trust carry-over.
- **Not tested by anyone here:** SSN/EIN entry and printing, a fully clean
  export, Open Backup and reopening, Lock and encrypted cases, Clear All
  Data, narrow windows, a second tab on the same filing, Excel row limits,
  Save Annotated PDF, signature upload, merging shared records, offline
  install, Firefox and Safari.

### Decisions at a glance

Each item lists its settled decisions; Appendix C has the options as asked.

- **Where the requester departed from the recommendation:** guardians no
  longer sign with "/s/" (73A); the UCN is starred, never blocks, in every
  county (73S); a blank or misspelled county can still be overridden (73F);
  "Ready to file" keeps today's meaning, 100% only (73F).
- **Named approvals:** 73U's fix; the Plan for Minors identified by its
  Case # first, changing AGENTS.md §6's rule (73S); the Clerk's Schedule B-4
  subtotal formula corrected in the embedded workbook (73T).
- **Recorded as Pinellas Clerk practice:** guardians sign by hand or stamp
  (73A); blank Inventory schedules are accepted (73F); an annual accounting
  is due the first day of the fourth month (73I); a Plan's period is the
  coming plan year (73I); on a trust accounting the guardian signs (73O);
  Part XI's lines carry remuneration entries (73T).
- **Flagged for a qualified person, not decided here:** whether a guardian
  may sign electronically at all (73A); whether §744.367(3)(a)'s declaration
  needs the amount (73F); whether an undated stamped signature suffices; the
  caption's "A MINOR" / "GUARDIAN ADVOCACY" (73N); weekend and holiday due
  dates under Rule 2.514 (73I).
- **Everything else:** the recommended option.

---

## Build order, parts and file overlap

Each row is one approval and one delivery: built, tested red-first, pushed,
and recorded in its item's build record before the next starts. Rows that
share files run in the order shown. **Foundations come first**, because the
fixes after them depend on them; each foundation part changes no filer-visible
behaviour on its own except where its row says so.

| Order | Item / part | Depends on | Main files | Tests and baselines |
| --- | --- | --- | --- | --- |
| 0 | 73U | — | `src/core/security/input-hardening.js` | **Built** `5b8849b` |
| 1 | 73V — row rules (behaviour-preserving; only the link fix is visible) | — | `src/core/form/schedule-definitions.js` (descriptions keyed by filing type and list; the three row actions keep their signatures; `SCHEDULE_SCHEMAS` kept as a read-only compatibility export), `src/core/form/plan-row-actions.js`, `prune-cards.js`, `src/core/filing/models/plan-rows.js`, the Inventory's row actions and `normalizeGuardians()`, the Annual importer's guardian filter | new `tests/unit/collection-descriptors.spec.js` (explicit expected inventory of every list; each form's behaviour unchanged); changed: `schedule-definitions.spec.js`, `output-revision-wiring.spec.js`, `prune-cards.spec.js`, `filing-registry.spec.js`; unchanged through the compatibility export: `types-contract.spec.js`, `remuneration-declaration.spec.js` — **Built** `8b96aa3` |
| 2 | 73J part 1 — one change event | — | `src/core/form/form-contract.js`, a new `src/core/model-change.js`, every committed mutation path (row actions, New Year, conversion, Sync, Link Person, Merge, year switch) | new `tests/unit/model-change-event.spec.js` — **Built** 2026-10-05 |
| 3 | 73K part 1 — why the page is drawn | 73V | `src/core/navigation/router.js` and its callers | `router.spec.js`; `npm run check:types` |
| 4 | 73G part 1 — the amount codec | — | `form-contract.js`, `form-fields.js`, `guardian-inventory/form-binding.js`, `form-runtime.js`, `share-cell.js`, the three importers' amount readers | new `tests/unit/amount-codec.spec.js`; the year-rollover and conversion goldens — **Built** 2026-10-06 |
| 5 | 73F part 1 — shared checks | — | the seven validators moved to `src/core/validation/engines/` with `evaluate<Engine>()`, a registry, `validate<Engine>()` kept as wrappers, `output-preflight.js` | the existing validator and export-gate units; a wrapper-equivalence test; completion golden unchanged — **Built** 2026-10-06 |
| 6 | 73E part 1 — the import transaction (no importer connected) | 73J p1 | new `src/core/excel/import-transaction.js`, `import-keep.js` (exact-name identity), `party-resolver.js`, the activity log | new `tests/unit/import-transaction.spec.js` (synthetic adapters) — **Built** 2026-10-06 |
| 7 | 73T part 1 — the workbook contract | 73E p1, 73G p1 | new `src/core/excel/workbook-contract/` (one per form, the importers' adapters), `excel-engine.js` | `excel-write-targets.spec.js`, `export-manifests.ts`, new round-trip and hand-filled specs |
| 8 | 73C | 73V | `plan-rows.js`, Inventory `index.js` (D-1) | new `tests/e2e/plan-add-co-guardian.spec.ts` — **Built** `861b6a9`, ahead of rows 2–7 at the requester's choice |
| 9 | 73D | — | Inventory `index.js` (B-2), `models/guardian.js`, `totals.js`, Inventory `pdf-model.js`, `excel.js`, `conversion.js`, `field-html.js`, three Plan `pdf-model.js` | new `tests/e2e/b2-vehicle-toggle.spec.ts`, Plan PDF units — **Built** `c8e84fe` |
| 10 | 73T part 2 — Inventory workbook, connected to the transaction | 73T p1, 73D | `guardian-inventory/excel.js` | Inventory round trip; `import-confirm.spec.ts` (Inventory); that form's import specs |
| 11 | 73T part 3 — Annual-family workbook, connected | 73T p1 | `annual-accounting/excel.js`, `templates/annual-template.js` (B-4 formula) | Annual round trip; Part VIII and Part XI placement; `import-confirm.spec.ts` (Annual); that form's import specs |
| 12 | 73T part 4 — Simplified workbook, connected | 73T p1 | `simplified-accounting/excel.js` | Simplified round trip; `import-confirm.spec.ts` (Simplified, the half-apply); that form's import specs |
| 13 | 73M | 73T p2–p4 | `bond-depository.js`, the three `print.js`, `pdf-preview.js` | `bond-depository.spec.js`, 18 specs that wait for Save as Excel |
| 14 | 73E part 2 — Link Person and Merge | 73E p1 | `pick-record-dialogs.js`, `party-management.js`, `party-resolver.js` | new e2e cases |
| 15 | 73A | 73F p1 | `pdf-engine.js`, `signature-state.js`, `signature-state-control.js`, nine `index.js` and `pdf-model.js`, the Plans' certificate, `normalize-filing.js`, `filing-years.js`, `party-resolver.js`, the dashboard's Mark Open, CSV | new signature units and e2e; every `MINIMAL_VALID_*` — **Built** 2026-10-06 |
| 16 | 73B | 73T p2–p3 | three accounting `pdf-model.js`, `models/annual.js`, `models/guardian.js`, `schedule-definitions.js`, Annual and Inventory `index.js`, `output-preflight.js`, CSV | new `tests/unit/no-invented-answers.spec.js`; three goldens |
| 17 | 73F part 2 — the screens use the shared checks | 73F p1, 73A | `completion.js` (retired rules), `nav-marks.js`, `section-status.js`, `readiness-config.js`, `dashboard/view-model.js`, `pdf-preview.js`, `validation-panel.js` | new `tests/unit/sidebar-export-parity.spec.js`; completion golden regenerated — **Built** 2026-10-06 |
| 18 | 73F part 3 — rules and asterisks | 73F p2 | every validator, `commit-coordinator.js` (draft clean-up), `ward-county.js`, `attorney-required-markers.js`, CSV | fixtures (§8.3), parity spec |
| 19 | 73G part 2 — warnings and boxes | 73G p1, 73F p2 | Annual `index.js` (C, E), Annual `pdf-model.js` (E totals), Simplified Part VII, `output-preflight.js`, `ward-share-advisories.js` | new `tests/unit/sign-advisories.spec.js` |
| 20 | 73H | 73G p1 | `money.js`, `date-parser.js`, `summary-renderer.js`, every `pdf-model.js`, Annual and Inventory `index.js` | new `tests/unit/display-formats.spec.js`; PDF text specs |
| 21 | 73I | — | `dashboard/view-model.js`, `dashboard/index.js`, `readiness-config.js`, the Plans' covers | `dashboard-view-model.spec.js` |
| 22 | 73J part 2 — live page parts | 73J p1 | `src/core/ui/live-parts.js` (new; `src/core/status/live-region.js` is the screen-reader announcer and is unrelated), the eight cases' pages, `sidebar.js`, `dashboard` | new `tests/e2e/live-page-parts.spec.ts` |
| 23 | 73K part 2 — keep the place | 73K p1 | `router.js`, seven `mount()`s, `dialogs.js`, `schedule-docs.js` | new `tests/e2e/redraw-keeps-scroll.spec.ts`; `check:types` |
| 24 | 73L | — | `dialogs.js`, `modal-events.js`, `filing-dialogs.js`, `schedule-doc-ack.js`, `app-lock.js`, `help-panel.js`, `shell.css` | new `tests/e2e/dialog-order.spec.ts`; `schedule-doc-ack.spec.ts` |
| 25 | 73N part 1 — line wrapping | 73A | `pdf-engine.js` | right-margin check, all nine forms; `pdf-engine-notice-title.spec.js` |
| 26 | 73N part 2 — court wording | 73N p1 | six forms' `pdf-model.js` and `index.js`, `filing-descriptor.js` | new text-parity spec |
| 27 | 73N part 3 — the Simplified Plan | 73N p1 | `plan-simplified/pdf-model.js`, `index.js`, `dashboard/view-model.js` | `pdf-form-specific.spec.ts`, `dashboard-view-model.spec.js` |
| 28 | 73O part 1 — names | 73J p2 | Simplified, Initial, Annual and Minors Plan `index.js`, models, `form-derived-fields.js`, `excel.js` (Simplified), CSV | `form-derived-fields.spec.js`; goldens |
| 29 | 73O part 2 — certificate shape | 73T p2–p4 | the shared recipient factory, three models, seven certificate pages, `plan-certificate-of-service.js`, three exporters and importers, `conversion.js`, CSV | three goldens; placement specs |
| 30 | 73O part 3 — accessibility and console | — | `simplified-accounting/index.js`, `form-runtime.js`, `schedule-docs.js`, `filing-dialogs.js`, `pdf-engine.js`, `pick-record-dialogs.js`, `start-new-form.js` | new `tests/e2e/accessible-names.spec.ts` |
| 31 | 73O part 4 — previews and labels | 73F p2 | the nine `print.js`, `field-html.js`, Inventory and Annual `index.js`, `cards.css`, `common-modals.html`, `filing-registry.js` | new `tests/e2e/preview-print-button.spec.ts` |
| 32 | 73P | 73V | `pick-record-dialogs.js`, `common-modals.html`, `year-dialogs.js`, `case-file.js`, `schedule-docs.js`, `filing-switcher.js`, `help-content.js` | small cases in existing specs; `check:types` (persistence) |
| 33 | 73R part 1 — sidebar height | — | `shell.css`, `index.html`, `sidebar.js` | eight save-control specs, `routes.spec.ts`, the tour specs |
| 34 | 73R part 2 — "GF" | — | `index.html`, `help/index.html`, `icons/` | `npm run test:e2e:portable` |
| 35 | 73R part 3 — preview zoom | — | `pdf-preview.js`, `print-pager.js`, `pdf-annotate.js`, `print.css` | new `tests/e2e/preview-zoom.spec.ts`, `pdf-annotate.spec.ts` |
| 36 | 73S | 73F p3 | five UCN box helpers, `output-preflight.js`, the Minors identity sites, AGENTS.md §6, CSV | `ucn-cover-field.spec.ts`, `ucn-header.spec.js` |
| 37 | 73Q | everything | `help/index.html`, `help-content.js`, `walkthrough.js`, `tests/capture/guide-screenshots.capture.ts` | `user-guide-drift-guard.spec.js`; figures re-shot |

Every delivery that adds or changes a test updates `TEST-INDEX.md`,
`file_index.md`, the 70T progress list and the assertion-count baseline in
its own commit. A delivery touching `src/core/navigation/`,
`src/core/persistence/`, `src/core/types/` or `tests/e2e/support/` runs
`npm run check:types`; one touching the CSV runs `npm run verify:data-model`.

---

## 73A — Unsigned prints a blank line; guardians sign by hand or by stamp (P4, D4)

### What a filer sees today

- On **all nine forms**, an Unsigned block prints "/s/ Name" above
  "Signature (Electronic /s/ pursuant to Fla. R. Gen. Prac. & Jud. Admin.
  2.515)", like "/s/" Signed. The guide promises *"No signature yet. The
  printed signature line is left blank for wet-ink signing."*
- A typed date makes an Unsigned block indistinguishable from a signed one.
  Typing a guardian's date also **pre-selects "/s/"** on screen.
- A block with no name prints a bare "/s/": the Annual family's preparer and
  attorney, the Simplified's Part V attorney, the Inventory's preparer,
  attorney and an unnamed D-1 guardian, every certificate of service, the
  Plans' guardian and attorney blocks, and the Plan for Minors' preparer.
- A Signature Stamp chosen but never applied prints "/s/ Name" with the
  caption.
- **New Year keeps last year's stamp** on every signer, so the new year's
  filing prints it, undated.

### Evidence

- `src/core/pdf/pdf-engine.js` near 1590: a blank pen line only when a block
  sets `wetSignatureExplicit`, which no model sets. Near 1697: `block.signature
  || '/s/ ' + block.signerName`, caption near 1710, date near 1640. A stamp
  with no image falls through to the "/s/" branch (near 1597).
- `src/core/validation/signature-state.js`: Unsigned always passes (near
  46–47); `inferLegacySignatureState()` turns a blank choice plus a date into
  "/s/" (near 70–73), and every screen passes its result to the control.
- `src/core/filing/filing-years.js`, `resetYearlyFieldsForNewYear()` (near
  63–65) clears dates only, although its comment says signatures are
  cleared.
- The Plans' certificate stores one `certSignatureState` for whichever signer
  `resolveCertSigner()` names (`plan-certificate-of-service.js` near 75–81),
  so the same stored choice changes owner when "Who is certifying service"
  changes.
- History: Milestone 22 (`e6568fc`) made "/s/ Name" standard and kept the
  blank line for "a workflow that explicitly requires it"
  (`MILESTONE-ARCHIVE.md` near 3798); Milestone 39-B added Unsigned for
  signing by hand (near 12365) without connecting it; the guide's promise
  came later (`fc05e55`).

### Authority

- Annual workbook: *"Only the guardian's signature must be original."*
  (`PART II, III`!B19); *"The attorney may use an electronic signature
  "/s/""* (`PART IV, V`!B21, `PART X`!B8); the Inventory workbook says the
  same of the attorney (`PART IV`!B19, `PART VI`!B7).
- All three workbooks pre-print "/s/" in both attorney signature cells:
  Annual `PART IV, V`!B31 and `PART X`!B25; Inventory `PART IV`!B26 and
  `PART VI`!B27; Simplified `PARTS V, VI`!B17 and B41.
- The original Initial and Annual Plans: *"Only reports with original
  signatures will be audited by the Clerk"* (`plan-initial-original.txt`
  near 402, `plan-annual-original.txt` near 519); the Simplified workbook has
  it too (`PARTS III, IV`!B13).

### Decisions (settled)

- **Unsigned** prints a blank line for wet ink (73A-1); a typed date still
  prints (73A-2); the Clerk's pre-printed "/s/" stays in all six cells
  (73A-3).
- **Guardians no longer sign with "/s/"** wherever a guardian signs — their
  own block on all nine forms and the certificate of service when a guardian
  signs it. They choose Unsigned or a Signature Stamp; attorneys and outside
  preparers keep all three choices. *The requester, 2026-10-04, as Pinellas
  Clerk practice resting on the workbook's text; still flagged for a
  qualified person.*
- A saved guardian "/s/" on a filing still being prepared is **asked again**,
  visibly. Filings **already filed** — a closed filing, or an archived year —
  **keep** their "/s/" so a reprint matches the filed copy (73A-N1). A closed
  filing **reopened** with Mark Open is asked again (2026-10-05).
- **New Year clears every signer's choice and stamp** (73A-N2). A Stamp never
  applied prints the **blank line for every role** (73A-N3).

### Design

1. **Print modes.** Each PDF model resolves every signature block from the
   signer's role — guardian, attorney or preparer; on the Plans' certificate,
   the signer `resolveCertSigner()` names at print time — and passes the
   engine one of three modes: *blank line* ("Signature of <name>", no
   caption), *"/s/"* ("/s/ Name" and the Rule 2.515 caption), or *stamp*
   (the image). The engine no longer infers anything.
   - Attorney and preparer: a blank choice with a date is "/s/", as today.
   - Guardian: a blank choice is Unsigned; "/s/" prints only under a legacy
     policy (step 3).
   - A stamp with no image, or any block with no name, prints the blank line.
2. **Role-aware shared pieces.** The signature control takes the signer's
   role; a guardian's control offers Unsigned and Signature Stamp.
   `checkSignatureState()`, `isSignatureComplete()` and
   `inferLegacySignatureState()` take the role too. The sidebar's guardian
   signature rule moves to this role-aware `isSignatureComplete()` here, so a
   guardian who signs by hand, undated, can reach ✓.
3. **A signature policy on each year's data** (Codex's design). Every year
   snapshot — the current one and each archived one — carries
   `signaturePolicy`: absent means 1 (legacy: a guardian's "/s/" is
   honoured); 2 means guardians sign by hand or stamp. New filings and New
   Year write 2.
   - **Applying policy 2** to a snapshot: every guardian block holding "/s/",
     or a blank choice with a date, becomes *not chosen*; it is listed as
     missing everywhere (the validators — including the Plans' co-guardians,
     which no validator checks today — the sidebar, the readiness card, the
     Plans' certificate advisory) and prints the blank line.
   - **When it is applied:** on opening a filing whose current year is not
     closed (`normalizeWardData()` through `setActiveFiling()`), and on Mark
     Open.
   - **When it is not:** a closed filing keeps policy 1 — its "/s/" prints and
     shows as chosen, but can't be newly chosen; an archived year keeps its
     own policy, because `switchWardYear()` copies the snapshot in without the
     open-time normalizer (`filing-years.js` near 256–271), so a reprint of a
     filed year matches the filed copy; an Excel import never changes the
     policy (73E's transaction preserves it).
   - The Plans' certificate is judged at read time from the current signer,
     so a later change of "Who is certifying service" can't slip a guardian
     "/s/" through.
4. **New Year** clears every signer's choice and stamp image.
5. **"Use my saved signature"** is offered on the certificate blocks a
   guardian signs (`certGuardian`, `serviceGuardian`, the Plans' `cert`);
   today it maps only `guardians.N`, `planGuardians.N`, `attorney` and
   `preparer` (`party-resolver.js` near 599–606).
6. **Wording:** the Plans' "The certificate is not signed" advisory and the
   readiness label "Signed and dated by a guardian" are reworded for signing
   by hand.

### Files

`pdf-engine.js`; `signature-state.js`; `signature-state-control.js`; the nine
forms' `index.js` (controls and validators) and `pdf-model.js`;
`plan-certificate-of-service.js` and its page; `completion.js`;
`readiness-config.js`; `normalize-filing.js`; `filing-years.js`;
`party-resolver.js`; the dashboard's Mark Open; the CSV.

### Tests

- New unit spec: every form × role × choice × policy resolves to the right
  print mode and completeness.
- New e2e: an Unsigned block prints a blank line (one accounting, one Plan);
  a guardian's choice offers no "/s/" on every form; a saved guardian "/s/"
  is listed as missing after opening; a closed filing reprints its "/s/";
  Mark Open asks again; switching to an archived year reprints its "/s/"; an
  Excel import keeps the policy; New Year clears stamps.
- Changed: `signature-capture.contract.spec.ts` (asserts a guardian's date
  pre-selects "/s/"), the four `plan-*-mount` snapshots,
  `plan-pdf-wcag-compliance.spec.ts` and `pdf-form-specific.spec.ts`
  (guardians printing "/s/"), `pdf-structure-tags.spec.ts` near 566, the
  signature-completeness, Plan-parity and readiness units.
- Red-first: each new test fails today for its stated reason.

### Checklist (AGENTS.md §8)

1. **Data model:** `signaturePolicy` on each year snapshot; the guardian
   signature-choice rows allow `none` and `stamp` under policy 2.
   `verify:data-model`.
2. **Legacy data:** a guardian "/s/" on a filing being prepared is asked
   again, visibly; filed filings and archived years are unchanged.
3. **Fixtures:** every `MINIMAL_VALID_*` in `tests/e2e/support/fixtures.ts`
   gives guardians a date and no choice, so all of them move to Unsigned or a
   Stamp; goldens `ms70-70C-filing-shapes.json` and `ms70-sav-corpus-golden`.
4. **Tests:** above.
5. **Export/import:** PDF only. Excel writes names and dates, never a choice;
   the import keeps the policy.
6. **Security:** none.
7. **UI/UX:** the shared control, with one choice fewer for guardians.
8. **Legal framing:** recorded as Clerk practice resting on the workbook's
   text, not as a reading of Rule 2.515; flagged for a qualified person.
9. **Cross-form:** one engine and one control serve all nine forms.

### Build record — BUILT 2026-10-06 (approved by name by the requester, 2026-10-06)

**What changed for a filer:**

- **Unsigned prints a blank line** with "Signature of <name>" beneath and no
  Rule 2.515 caption, on all nine forms. So does a Signature Stamp chosen but
  never applied, and any block with no name. A typed date still prints.
- **A guardian signs by hand or by stamp.** Wherever a guardian signs — their
  own block on all nine forms, and a certificate of service a guardian signs —
  the choices are Unsigned and Signature Stamp. "/s/" Signed is not offered,
  and typing the date no longer pre-selects anything. Attorneys and outside
  preparers keep all three choices; for them a blank choice with a date is
  still "/s/".
- **A guardian's "/s/" on a filing being prepared is asked again.** When the
  filing is opened, the block shows nothing chosen, with the note "A guardian
  no longer signs with "/s/"". It is listed as missing on the page, in the
  sidebar, on the readiness card and in Preview, and prints the blank line
  until the filer chooses.
- **Filed copies reprint as filed.** A closed filing, and an archived year
  switched back in, keep their guardian "/s/": it prints and shows as chosen,
  but can't be newly chosen. Mark Open asks again.
- **New Year clears every signer's choice and stamp** — guardians, preparers,
  attorneys and every certificate signer.
- **A guardian signing by hand reaches ✓ without a date.** The sidebar counts
  a guardian's signature by the export check's own rule, so a guardian's
  unreadable choice no longer shows ✓ either.
- **"Use my saved signature"** is offered on the certificate blocks a guardian
  signs: the accountings' and the Inventory's certificates, and a Plan's when
  the guardian certifies.
- **The Plans check each started co-guardian's signature choice.** No Plan
  checked a co-guardian before; the rest of the co-guardian rule is 74B's.
- **Wording:** the readiness row reads "Guardian's signature block complete
  (signed by hand or stamped)"; the Plans' certificate advisory says how a
  guardian signs it.

**How:**

- **A policy on each year's data** (`signaturePolicy`,
  `src/core/signature/signature-policy.js`): absent or 1 is the legacy rule, 2
  the guardian rule. New filings and New Year write 2. Opening a filing that
  isn't closed and has no policy upgrades it (`setActiveFiling()`, right after
  `normalizeWardData()` — the open, not every normalisation, so a filing only
  listed on the dashboard is untouched); Mark Open forces the upgrade; an
  archived year switched back in that never decided is marked 1; an Excel
  import writes no policy, so never changes it.
- **Asked again, not erased.** Under the guardian rule a blank choice means
  Unsigned, so a blank can't stand for "not chosen". The design said a
  guardian's "/s/" "becomes not chosen"; the build keeps the stored choice
  and reads it as not chosen — asked again, listed, printed blank. The upgrade
  first writes "/s/" where the legacy rule implied it (a blank choice with a
  date), so exactly those blocks are asked again. Nothing the filer entered is
  erased.
- **Role-aware shared pieces** (`signature-state.js`):
  `checkSignatureState()`, `isSignatureComplete()`,
  `inferLegacySignatureState()` and the new `signaturePrintMode()` take the
  signer's role and the year's policy. The signature control reads the stored
  choice and date itself, takes the role from its card's path
  (`signerRoleForPath()`) or from its caller where the signer varies (the
  Plans' certificate), and draws a guardian's two choices; a card with no role
  fails loudly.
- **Print modes.** Every PDF model names each block's signer role, and
  `src/core/pdf/signature-modes.js` resolves its mode — blank line, "/s/" or
  stamp — before the engine draws. The engine infers nothing; a block without
  a mode, or naming no role, fails loudly. The old `wetSignatureExplicit`
  switch, which no model set, is gone.
- **The checks:** the ten guardian signature checks across the seven engines
  pass the role and policy, and name the guardian's signature choice as the
  issue's field, so "Go to field" lands on the choice, not the date; each Plan
  checks every started co-guardian's choice (`rowStarted()`). On a Plan whose
  Guardian #1 is asked again, the readiness card shows the guardian row and,
  beneath it, the specific "choose Unsigned or Signature Stamp" line: the
  choice's field is deliberately not folded into the guardian row, because
  every row index shares one code and folding it in would hide a
  co-guardian's issue behind Guardian #1's row (the table's own rule: a
  duplicated row is cosmetic, a hidden blocker is not).
- **The sidebar** (`completion.js`) counts a guardian's signature by
  `isSignatureComplete()` with the role and policy, in place of "has a date";
  **the readiness card**'s four guardian rows likewise.
- **Saved stamps on certificate blocks:** `certificateSignerSlot()` in
  `party-resolver.js` finds the certificate signer's shared record
  (`certGuardian`, `serviceGuardian`, and the Plans' `cert` through
  `resolveCertSigner()`).
- **Data model:** a `signaturePolicy` row and a note on the ten guardian
  signature-choice rows; `verify:data-model` passes (1,056 rows).

**Tests:**

- New `tests/unit/signature-by-hand.spec.js` (36): the rules for every role
  under each policy; the policy functions; New Year's clearing on seven forms;
  the control's choices; signer roles; every form's print modes; the
  missing-role failure; every form's checks under each policy, the Plans'
  co-guardians included; the sidebar's undated Unsigned; the certificate's
  saved stamp. **Red-first:** with the source changes stashed
  (`signature-state.js` kept, so the spec loads), 24 fail for their stated
  reasons.
- New `tests/e2e/signature-by-hand.spec.ts` (7): the Annual's and the Annual
  Plan's PDFs print an Unsigned guardian as a blank line, the attorney's "/s/"
  intact; every form's guardian offers Unsigned and Signature Stamp only; an
  old "/s/" is asked again and Unsigned answers it; a closed filing reprints
  its "/s/" and Mark Open asks again; an archived year switched back in
  reprints its "/s/", also after reopening; New Year clears choices and
  stamps; an Excel export and re-import keeps the rule. **Red-first:** with
  every source change stashed, all 7 fail for their stated reasons — the
  Annual Plan printed "/s/ Sample Guardian" above the Rule 2.515 caption.
- **Goldens regenerated, each change checked by variant name** (the variant
  generator gained a "signaturePolicy cleared" variant per filing, which
  shifts every later index):
  - the completion golden: a guardian's signature counts only as the export
    check reads it. The saturated filings' unreadable guardian choice, which
    every validator already refused, now leaves the guardian page incomplete
    (a-p3, s-p4, pa-p11, pi-p9, pm-p6; on the Annual family a second
    guardian's too). A first Plan guardian signing by hand with only a name, or
    the date cleared, no longer leaves pa-p11 or ps-p3 incomplete. Each
    legacy-rule variant returns what its sibling does. Recorded in its note.
  - the validator golden: 8 changes of outcome. A certificate guardian's
    date alone, or the Inventory's D-5 guardian's, no longer asks for a
    printed name to apply "/s/" (5); the Annual, Initial and Minors' Plans
    check a started co-guardian's choice (3). And every guardian signature
    issue — asked again, or an unreadable choice — names the choice as its
    field (path and code) instead of the date (1,656 variants, no other
    change). Recorded in its note and the spec's.
  - `ms70-70C-filing-shapes.json`: every new filing carries
    `signaturePolicy: 2`.
  - `ms70-year-rollover-golden.json`: the archived year records
    `signaturePolicy: 2`; nothing else moves (no fixture fills a signature
    choice or stamp).
- **Changed browser specs**, each an intended change (the proposal named most
  of them): the four Plans' Signatures-page snapshots;
  `signature-capture.contract.spec.ts` (each form's guardian case proves the
  guardian rule through one helper, and the "/s/"-without-a-date message moved
  to the Annual Plan's attorney); the Inventory's two PDF text specs; the two
  `navigation-status` jump links and Print Preview's (they follow the
  guardian's asked-again choice to its own Unsigned choice); 73C's
  co-guardian redraw case (chooses Stamp); `pdf-structure-tags.spec.ts` (the
  hand-signed fixture names its role and mode).
- **Related browser specs:** 42 files, 535 tests — every spec printing,
  offering, checking or counting a signature, the sidebar and readiness
  contracts, the year rollover, the closed-filing and mixed-version specs. The
  first run: 507 passed, 28 failed, every failure one of the intended changes
  above. After the changes and the fix above, the 13 changed files: **198 passed, none failed** (19.2 minutes).
- Full unit suite passes; `npm run check:types` clean (`isSignatureComplete()`'s
  type gained the role and policy); `verify:data-model` passes.

**Found while building and fixed here:** the related browser run's two
jump-link tests showed the asked-again issue sending "Go to field" to the
guardian's date box on every form: the guardian checks named only the date's
field. Each now names the choice's (above). **Red-first:** the unit spec's
per-form check that every asked-again issue names a signature choice failed
on all seven forms, naming the date (`guardians.0.signatureDate`,
`planGuardians.0.signatureDate`); with the fix it passes.

**Found while building, recorded and not changed here:**

- **On the Annual and Simplified Plans the guardian page can now show ✓ while
  export still wants the guardian's phone, address or SSN** (only the name
  entered). The sidebar's Plan rules never checked those; the date requirement
  removed here happened to hide the gap. 73F part 2 makes the sidebar read the
  export checks themselves, which closes it.
- **The guardian's "Date Signed" is still starred** on the Plans' Signatures
  pages, though no rule requires it when a guardian signs by hand — and export
  never did. 73F part 3 draws the asterisks from the rules.
- **A filing saved before this and not opened since** is judged on the
  dashboard by the legacy rule until it is opened, so its guardian's "/s/"
  counts as signed there until opening asks again. Visible and one-time; 73F
  part 2, which puts the dashboard on the same checks, applies the open-time
  rule to what it judges.

**Full regression:** not run — the requester chose one full run after 73F part 2,
covering 73F part 1, 73A and 73F part 2 together (2026-10-06).

---

## 73B — No answer the filer didn't give (P3, D3)

### What a filer sees today

| Where | What happens |
| --- | --- |
| Inventory, Annual, Final, Trust and Simplified PDFs | A blank Type of Guardianship prints **"Plenary"**; the Annual family's export check doesn't even ask for one |
| Annual family, Part IX | **"Professional Guardian"** is chosen on every new filing; a blank one prints **"None"**, not one of the Clerk's choices; the restricted-depository receipt date prints "None" when blank |
| Annual family, "+ Add" on D-1, D-2, D-4 | "Restricted?", "Personal Residence?" and "Income Property?" arrive answered **No**; such a row, never touched, is never cleaned up |
| Inventory, every new row | **Ward's % = 100**; C-5's Joint Owner's % = 50 |
| Inventory, new rows and its workbook | Liability type "Mortgage" (A-2) or "Loan" (B-4), payment frequency "Monthly", trust type "Pooled" — and the **Excel export writes these four for a blank, and the import puts them back** |
| Annual Plan, Q11 | Left unanswered, it prints the sworn "I have received the monies … from …" |
| Inventory dropdowns | Have no "— select —" option |

### Evidence

- `d.typeOfGuardianship || 'Plenary'`: Annual `pdf-model.js` near 96,
  Simplified near 84, Inventory near 149. The Annual validator has no Type of
  Guardianship rule (near 1641–1654) though the field is starred (near 694).
- `models/annual.js` near 87; the Annual PDF near 1048 (`|| 'None'`) and near
  1049 (receipt date); a blank G8 keeps the default on import (`excel.js`
  near 910).
- `schedule-definitions.js` near 92, 98, 110 (`'No'`), against the CSV rows
  that say new rows start unanswered and `models/annual.js` near 15.
- `models/guardian.js` near 100–115 (shares), near 107 (`'Loan'`); C-4's
  trust type is a pre-filled text box (Inventory `index.js` near 1087).
- Inventory `excel.js` near 222, 314, 334, 424 (export) and near 712–736
  (import).
- `plan-annual/pdf-model.js` near 505–507 reads `q11NoRemuneration:false`
  as "received".
- Inventory `selectInput()` (near 551–558) has no blank option.
- None of these defaults has a recorded reason.

### Authority

The Clerk's workbooks pre-fill none of them; "Plenary" appears in none.
Type of Guardianship sits under "REQUIRED INFORMATION" on all three covers
(Annual `PART I`!D16, label B22; Simplified `PARTS I, II `!D11/B17;
Inventory `SUMMARY I `!D19/B25). Part IX's G8 is empty with a three-choice
list. The Inventory's share cells are blank; C-5's 50% is the printed
example row. The three dropdown cells are blank (the app's defaults are the
first item of each Clerk list).

### Decisions (settled)

Type of Guardianship is required on the Annual family, as on the Inventory
and Simplified (73B-1). A blank Part IX relationship prints blank, with a
Preview warning (73B-2). The Inventory's shares (73B-3) and dropdowns
(73B-4) start blank, and the liability type, payment frequency and trust
type are required on a started row (73B-N1). The Annual Plan's Q11 and Part
IX's "None" are fixed here (73B-N2).

### Design

1. The three PDF models print a blank Type of Guardianship as blank; the
   Annual family's validator and sidebar require it.
2. New Annual-family filings start with no relationship; a blank prints
   blank, never "None", with a Preview warning; a blank G8 imports as blank.
   Part IX's receipt date prints blank when blank.
3. The Annual factories start "Restricted?", "Personal Residence?" and
   "Income Property?" at `''` (AGENTS.md §4) — so an untouched row is cleaned
   up on leaving the page, as on every other schedule.
4. Inventory rows start with blank shares and blank type, frequency and
   trust type; the dropdowns gain "— select —"; the four are required on a
   started row.
5. The Inventory's export and import write and read those four as blank
   when blank.
6. An unanswered Annual Plan Q11 prints neither sentence.
7. The blank-row clean-up recognises the old Inventory row shape (100%,
   "Mortgage", 0) as untouched.

### Files

Three accounting `pdf-model.js`; `models/annual.js`; `models/guardian.js`;
`schedule-definitions.js` (through 73V's descriptors); Annual and Inventory
`index.js`; Inventory `excel.js`; Annual `excel.js` (G8); `plan-annual/pdf-model.js`;
`output-preflight.js`; `completion.js` (through 73F); the CSV
(`guardianRelationship` becomes a warning; the defaults).

### Tests

New `tests/unit/no-invented-answers.spec.js`: a new filing and every "+ Add"
row on every form carry no invented answer, and no PDF or workbook prints a
value for a blank. Changed: the Inventory row units (prune-cards,
percent-field, yes-no-radio, carried-balance, required-share),
`export-manifests.ts` (type, frequency and trust-type cells); goldens
`ms70-70C-filing-shapes.json` (also the Inventory row defaults),
`ms70-conversion-golden.json`, `ms70-year-rollover-golden.json`, regenerated
with the change stated. Red-first.

### Checklist (AGENTS.md §8)

1. **Data model:** defaults for the relationship, shares and the four
   Inventory fields; requiredness for Type of Guardianship and the four.
2. **Legacy data:** saved test-system filings keep "Professional Guardian"
   and 100% (they can't be told from a real choice; test-only data).
3. **Fixtures:** every Annual-family fixture gains a Type of Guardianship;
   every Inventory fixture that relied on 100% or "Mortgage" sets them.
4. **Tests:** above.
5. **Export/import:** PDFs; the Inventory workbook; the Annual's G8.
6. **Security:** none.
7. **UI/UX:** dropdowns show "— select —", as unanswered ones do elsewhere.
8. **Legal framing:** the workbook's own heading is cited; nothing decided.
9. **Cross-form:** the fallback was on three forms; the Plans have no field.

---

## 73C — "+ Add Co-Guardian" works on the Plans (D1)

### What a filer sees today

On the Initial, Annual, Simplified Annual and Minors Plans, "+ Add
Co-Guardian" does nothing (reproduced in a browser, 2026-10-04: one guardian
before the click and after, no page error). On Inventory D-1 a new
co-guardian card holding only a signature choice also disappears at the next
redraw (from the code; needs a browser).

### Evidence

- The click adds a blank row and redraws (`form-events.js` near 58 →
  `plan-row-actions.js` near 8); the redraw runs `normalizePlanGuardians()`
  (`plan-rows.js` near 24–29), which keeps the first guardian and only later
  rows holding data. In place since `4d0afd5` (Milestone 37); no test clicks
  the button.
- Inventory D-1's one-draw exception for a new card (`904c523`) lasts one
  redraw; a signature choice redraws the page, and a Signature Stamp with no
  image doesn't count as data (`index.js` near 106–136).

### Decisions (settled)

No decision for the Plans (a defect). Inventory D-1 follows the same model
(73C-N1).

### Design

Built on 73V's row rules: a blank co-guardian row stays until the filer
leaves the page, then the clean-up removes it (minimum one); row 0 is always
kept, never replaced by a co-guardian; the shared-record links move with
their rows; the caps stay 4, 3, 2 and 2. Inventory D-1 uses the same rules.

### Tests

New `tests/e2e/plan-add-co-guardian.spec.ts` (all four Plans, the real
button; red-first: one block after the click today) and an Inventory D-1 case
(a new card with only a signature choice survives a redraw).
`filing-registry.spec.js` near 130 pins today's dropping and changes.

### Checklist (AGENTS.md §8)

No data-model or export change. **Legacy:** carry-over seeds blank Plan
guardian rows, which now show on the Signatures page until the filer leaves
it (visible, harmless). The guide's "fixed blocks" is corrected in 73Q.

### Build record — BUILT 2026-10-05 in `861b6a9` (approved by name by the requester, 2026-10-05)

**What changed for a filer:**

- On all four Plans, **"+ Add Co-Guardian" adds a co-guardian block**, up to
  each Plan's limit (Initial 4, Annual 3, Simplified Annual 2, Minors 2); the
  button goes away at the limit. A block left untouched is removed when the
  filer leaves the page. The first guardian's block always stays, even
  empty, and a co-guardian is never moved into it — as before.
- On the Inventory's D-1, **a new co-guardian card no longer disappears at the
  next redraw**: choosing a signature method redraws the page, and the card
  and the choice stay. When the filer leaves the page, a card with none of
  the fields D-1 counts as entered (name, signature date, SSN/EIN, phone,
  email, address, stamp image, the preparer box) is removed, as it was one
  step later before; the PDF and the export checks already ignored such a
  card.
- A Plan carried into a new year with blank co-guardian blocks shows them on
  the Signatures page until the filer moves to another page (the legacy note
  above).

**How:** the two lists that dropped empty rows on every draw stop doing so.
`normalizePlanGuardians()` keeps every block up to the Plan's limit (over the
limit, which only older data can be, empty blocks go first, from the end);
D-1's `normalizeGuardians()` only makes sure there is one card, and D-1 draws
every card — the one-draw grace period for a new card (Milestone 51H) is
gone. The clean-up when the filer leaves a page (`prune-cards.js`) now covers
the Plans' guardian blocks, keeps the first (`keepFirst` in
`blank-rows.js`), and asks each list's rules (`collections.js`) what an
untouched card is: on the Inventory, D-1's own entered-fields rule
(`guardianHasData()`, moved unchanged from the feature to
`models/guardian.js`); on the Plans, a block holding nothing at all, as the
page counted it; every other list as before. Links move with the rows through
the clean-up (73V). 73V's inactive keep-until-leave policy is retired: it is
now the rule on every list.

**Changed:** `src/core/filing/models/plan-rows.js`,
`src/core/filing/models/guardian.js`, `src/core/form/blank-rows.js`,
`src/core/form/prune-cards.js`, `src/core/form/collections.js`,
`src/features/guardian-inventory/index.js`.

**Tests:**

- New `tests/e2e/plan-add-co-guardian.spec.ts` (5): each Plan through the real
  button — the block appears, a filled one survives leaving and returning, the
  button adds up to the limit and goes away, leaving removes untouched blocks
  and keeps the first guardian's empty one; D-1 — a new card keeps a
  signature choice through its redraw, and leaving removes it.
- `prune-cards.spec.js` (+3) and `collection-descriptors.spec.js` (+4, one
  rewritten, the policy test updated). `filing-registry.spec.js` needed no
  change: its over-the-limit case still gives `['A', 'B', 'C', 'D']`.
  `guardian-links-follow-rows.spec.ts`: comments only (its Plan and D-1 cases
  arrive from another page, so the clean-up now does the dropping).
  `guardian-inventory-collection-controls.spec.ts`: Milestone 51H's case
  pinned the old tidy-up (a second "+ Add Co-Guardian" with nothing typed
  left one card, the first blank one dropped); it now expects two cards, as on
  the Annual and the Simplified, and leaving the page to remove both. What it
  protects is kept: no card the button made vanishes, and what is shown and
  what is stored agree.
- **Red-first:** before the fix, all five browser cases failed for the stated
  reason (one block after the click on every Plan; the D-1 card gone after
  the choice); with the six source files stashed, the six new unit cases
  failed (the old draw dropped the empty block; the old clean-up removed
  nothing from either guardian list and did not keep the first block).
- Full unit suite 2,560 passed; `npm run check:types` clean. **Related browser
  specs: 33 files, 345 tests — every one passed in its final run.** The first run (stopped by its time limit at 322 of 345) failed one test, `guardian-inventory-collection-controls.spec.ts`'s Milestone 51H case, which pinned the old tidy-up and was updated (above). The rerun of that file and the three the stop cut short (`signature-capture.contract`, `signature-stamp-reuse`, `year-rollover.characterization`) passed 52 and failed the year-rollover record on the four Plans: their sample filings carry empty co-guardian blocks, which leaving the filing now removes, so the archived year holds the first guardian's block alone and the link list reads `[null]` instead of `[]`. Expected (the legacy note above); the record was regenerated, every changed entry checked to be a co-guardian block or the link list, the other five types unchanged; 9 of 9 then passed.
- **Full regression (`npm test`, approved 2026-10-05), run at `04e17cc`
  (73C plus the Milestone 74 proposal) from a copy on C::** all unit tests
  passed (2,560); browser 1,033 passed, 16 skipped, none failed, flaky or
  left unrun, of 1,049 (1.2 h).

**Found, not changed:**

- On the Inventory, the Annual family and the Simplified, if Guardian #1's
  card is empty and a co-guardian's is filled, leaving the page removes the
  empty first card and the co-guardian becomes Guardian #1. Unchanged; the
  Plans keep the first block. Now Milestone 74's 74A.
- The Inventory's PDF prints a co-guardian with a name, date, SSN/EIN, phone,
  email or address; D-1 also counts a stamp image or the preparer box as
  entered, so a co-guardian with only a stamp image is kept and checked but
  not printed. Unchanged; now Milestone 74's 74B, which found the Annual
  family and the Simplified drop such a card from everything, unchecked.

---

## 73D — Unticking a box never loses what was typed (D2)

### What a filer sees today

- Inventory B-2: ticking "This item is a vehicle" and unticking it empties
  the Description; tick, type 2019 as the Year, untick, and the Description
  is "2019". Ticking also clears "In Safe Deposit Box?", which doesn't come
  back. The guide promises un-ticking never deletes what was typed.
- On the Initial, Annual and Minors Plans, about 20 "Explanation" boxes are
  hidden when Other or None is unticked, but **still print**: a filer who
  ticks None files "None" and "Explanation: …".

### Evidence

- `toggleB2Vehicle()` (Inventory `index.js` near 961–971) clears the
  safe-deposit answer and runs `syncB2VehicleDescription()` (near 923–930),
  against the comment above it (near 931–942); every keystroke in a vehicle
  field re-syncs (near 331–342), and so does leaving Make or Model (near
  317–328).
- The vehicle description is read by the PDF (`pdf-model.js` near 383), the
  Excel export (`excel.js` near 259) and conversion to the Annual family's
  **Schedule D-3** (`conversion.js` near 137–139); validation reads the
  vehicle fields instead.
- The safe-deposit answer feeds `totals.js` (near 64, 116, 134), the PDF row
  and the B-2 safe-deposit total, and the workbook's own formula
  `=IF(H="Yes",G,0)`.
- Plans: `field-html.js` near 130–135 hides the boxes;
  `plan-initial/pdf-model.js` near 110, `plan-annual/pdf-model.js` near 53
  and `plan-minor/pdf-model.js` near 71 print them whenever they hold text.
  The Simplified Plan already doesn't (`plan-simplified/pdf-model.js` near
  102, 112).
- AGENTS.md §4: unticking never deletes entered data.

### Decisions (settled)

After unticking, the filer sees their own Description (73D-1); a vehicle's
safe-deposit answer is hidden and kept (73D-2); the Plans' hidden
"Explanation" text is kept and not printed (73D-N1).

### Design

1. The filer's Description is never written by the vehicle fields. A
   vehicle's description is built where it is read — the PDF, the Excel
   export and conversion — by one builder in core (`models/guardian.js`),
   because `conversion.js` can't import a feature module.
2. While a row is a vehicle, the safe-deposit question is hidden and its
   answer kept; totals, the PDF and the workbook ignore it (column H is
   written blank for a vehicle; "No" would be an answer never given).
3. A Plan "Explanation" prints only while its Other or None box is ticked.

### Tests

New `tests/e2e/b2-vehicle-toggle.spec.ts` (tick and untick keep the
Description and the answer); unit cases for the built description, the
totals and the three Plan models. Red-first.

### Checklist (AGENTS.md §8)

No shape change; the CSV notes say what a vehicle ignores. **Legacy:** saved
vehicle rows hold the joined text in `description`; unticking shows it
(visible); text already overwritten can't be recovered. The workbook has one
description cell, so a vehicle still exports its joined text and imports as
an ordinary item (73M's notice says so). Shares `models/guardian.js` with
73B.

### Build record — BUILT 2026-10-05 in `c8e84fe` (approved by name by the requester, 2026-10-05)

**What changed for a filer:**

- Inventory B-2: ticking "This item is a vehicle", typing into the vehicle
  fields and unticking it **leaves the Description as the filer typed it**
  (it used to be emptied, or become "2019"). "In Safe Deposit Box?" is
  hidden while the row is a vehicle and **comes back with its answer**
  (ticking used to erase it for good). The PDF, the workbook and conversion
  to an Annual's Schedule D-3 file a vehicle's description built from its
  Year, Make, Model, VIN and mileage — the same wording as before — and file
  no safe-deposit answer for it.
- Initial, Annual and Minors Plans: an "Explanation" is filed only while the
  page shows its box. A filer who ticks Other, explains, then changes the
  answer no longer files both; the text is kept and comes back with the box.
  **24 boxes** — the "about 20" check-group boxes (Initial 10, Annual 9,
  Minors 1), three shown by other answers (the Initial Plan's committee
  explanation, the Annual Plan's benefits explanation, the Minors Plan's Q4),
  and the Initial Plan's "Other" directive description, which printed beside
  an unticked "Other".
- No filed number changes: a vehicle never counted toward the safe-deposit
  total (its answer was erased on ticking); its kept answer now counts
  nowhere — totals, PDF and the workbook's column H (written blank, so the
  form's own `=IF(H="Yes",G,0)` agrees).

**How:** `vehicleDescription()` and `b2ItemDescription()` in
`models/guardian.js` (core, because `conversion.js` can't import the feature)
build what a B-2 row files; the page's `syncB2VehicleDescription()` — which
copied the vehicle fields into `description` on ticking and on every
keystroke — is gone, and `toggleB2Vehicle()` changes only `isVehicle`.
`isInSafeDepositBox()` (`totals.js`) is false for a vehicle. New
`src/core/filing/plan-explanations.js` holds one show rule per Plan
Explanation box; each page passes it where it used to write the condition
inline (24 places), and each PDF files a box's text only while its rule
holds. A box with no rule throws, so a new Explanation can't be filed without
one.

**Changed:** `models/guardian.js`, `conversion.js`, the Inventory's
`totals.js`, `pdf-model.js`, `excel.js` and `index.js`; the Initial, Annual
and Minors Plans' `index.js` and `pdf-model.js`; the CSV's notes on the B-2
description, safe-deposit answer and vehicle flag (`verify:data-model`
passes). New: `plan-explanations.js`.

**Tests:**

- New `tests/unit/unticked-boxes-keep-text.spec.js` (28): the B-2 PDF row,
  total, conversion and an empty vehicle; each of the 24 explanations hidden
  (kept, not filed) and shown (filed), listed by hand from the pages.
- New `tests/e2e/b2-vehicle-toggle.spec.ts`: through the real page — tick,
  type a Year, untick: Description and answer intact; the exported
  workbook's C33 holds the vehicle's description and H33 nothing.
- **Red-first:** all 28 unit cases failed against the old code before any
  change (the PDF and conversion filed the stored Description, the total
  counted a vehicle, every hidden explanation printed); with the B-2 source
  stashed, the browser case failed on the Description reading "2019".
- Full unit suite: all pass (bar the three bookkeeping checks, then fixed);
  `npm run check:types` clean. **Related browser specs: 39 files (every one
  touching B-2, vehicles, Plan explanations, conversion, the Inventory and
  Plan exports, plus the Plan page snapshots and the saved-file corpus) — 416
  passed, none failed.**

---

## 73E — An Excel import is one transaction (D6)

### What a filer sees today

- Inventory and Annual: choosing a workbook replaces every page, including
  the ward's name, with no confirmation.
- Simplified: the import writes the ward name, case number, period, type of
  guardianship, GID, county, amended answer, attorney, Part II and the first
  three guardians **before** asking "Replace the first three guardian slots…?";
  **Cancel leaves all of it** in the filing, unseen, with the status stuck at
  "Parsing Excel…", and the next save keeps it.
- "✓ Import complete" is written and erased by the redraw at once.
- A Trust or Final Accounting filled from the Clerk's blank workbook
  (`PART I`!H4 = "Annual") **silently becomes an Annual** (73T part 3).
- Imported people bypass the shared records: afterwards, correcting one
  field of a linked guardian puts back that guardian's old name, SSN and
  address; correcting the ward's name after importing another ward's
  workbook renames that ward on its other filings (node-confirmed).
- A guardian's signature choice and stamp are kept when the names merely
  contain one another ("Mary Smith" keeps "Mary J. Smith"'s stamp).
- No Activity Log entry is written.

### Evidence

Inventory `excel.js` near 607–663 and Annual near 590–975 (no confirmation;
the Annual writes into the live filing about 70 times and calls
`setAccountingFilingType()` and `requestSave()` mid-import); Simplified near
300–394; each importer writes the message (Inventory near 661, Annual near
972, Simplified near 514) and then redraws (near 663, 974, 516);
`party-resolver.js` near 658–681 (the refresh that restores old values);
`import-keep.js` near 19 (`samePerson()` by name containment). Opening a
`.sav` backup reads everything, confirms, then applies (`case-import.js`
near 135) — the model to follow.

### Decisions (settled)

- One confirmation before anything changes, and a notice afterwards (73E-1).
- **People linked to shared records:** before anything changes, the
  confirmation lists each linked person whose details differ and every other
  filing that shares them; for each, the filer chooses "update the shared
  record" or "this filing only" (unlink). Cancel changes nothing anywhere.
  *(Re-asked 2026-10-05 after Codex's review; supersedes 73E-N1's
  after-the-fact notice.)*
- **The same person** means the same name ignoring case, spaces and
  punctuation; a near match is listed in the confirmation for the filer to
  keep or clear (2026-10-05).
- A filing keeps its own type on import; the confirmation says when the
  workbook is marked differently (73E-N2).
- Link Person fills only blanks and asks before overwriting typed values;
  Merge names the filings it will change (73E-N3).

### Design — part 1: the import transaction (Codex's design)

**Part 1 is workbook-independent** (the arrangement Codex's second review
recommended, to remove a circular dependency: the draft text had part 1 use
73T's contract while 73T depended on part 1). It builds the transaction engine and its
confirmation, fed by an **adapter**: a function that turns some source into a
detached draft (a filing-shaped object plus the people it names). In part 1
the only adapters are synthetic ones in the tests; **no importer is connected
and a filer sees nothing new yet.** 73T part 1 then supplies the workbook
contract, and 73T parts 2–4 connect each form's importer through it — that is
where the confirmation, the safe Cancel and the notice reach filers, form by
form.

1. **Take a detached draft from the adapter.** (73T's adapters will run the
   name-casing and filtering passes only on the values read from the
   workbook — never on archived years, Part XI, document names or stamps —
   keep `"` (73T-3), and never re-case signature choices.)
2. **Diff** the draft against the filing (fields), the party links and the
   shared records.
3. **Find conflicts**, never resolving them by name alone: near-name
   matches, linked people whose details differ, a workbook filing type that
   differs from the filing's.
4. **Confirm** once, naming the filing replaced, the workbook's ward name
   when it differs, every shared person who would change and every other
   filing sharing them, and each conflict with its choice. The signature
   policy (73A) and everything the workbook can't carry are preserved.
5. **Commit together:** the filing and the party store in one step; a
   schedule the import fills has its "no items" tick cleared; migrations
   such as the bond answer run after the commit.
6. **One save, one Activity Log entry** (as a `.sav` import's), **one change
   event** (73J part 1).
7. **Cancel** leaves the filing and the party store byte-for-byte unchanged,
   with no save queued.
8. **After the redraw**, a notice: what was imported, what was kept, what the
   workbook doesn't carry (from 73T's contract).

No importer is touched in this part; each moves onto the transaction in its
73T part (the Inventory's first, since it already parses into a separate
object).

### Build record, part 1 — BUILT 2026-10-06 (approved by name by the requester, 2026-10-06)

**What changed for a filer:** nothing yet, as designed. No importer uses
the transaction until 73T parts 2–4, which is where the confirmation, the
safe Cancel and the notice reach filers, form by form.

**What was built:** `src/core/excel/import-transaction.js` takes an
adapter's detached draft -- the filing's fields as the source has them --
and works through the eight steps above:

- It reads the draft without touching the filing, diffs it against the
  filing, its shared-record links and the records, and finds the conflicts:
  a near-name match, a shared person whose details differ (with every other
  open filing sharing them), and a workbook marked as another type.
- It confirms once, then commits the filing and the records together in one
  synchronous step.
- It ends with one save, one Activity Log entry, one change event, and a
  notice after the redraw.

Cancel, or a confirmation that leaves a question unanswered, changes nothing
and queues no save. The settled decisions, as built:

- The same person is the same name ignoring case, spaces and punctuation
  (`sameName()`, in `import-keep.js`). A near match -- the shared-records
  review's rule, or the importers' containment rule ("Robert T. Nguyen,
  Esq.") -- is a question for the filer: the same person keeps their stamp
  and record, a different person starts afresh. The shared-record question
  is asked only for the same person.
- A linked person whose details differ: "Update the shared record" changes
  the record and every other open filing sharing it; "This filing only"
  stops sharing it here.
- A different person in a slot -- including another ward's workbook --
  stops sharing the old person's record here, so a later edit can't rename
  the ward, or rewrite a guardian, on other filings.
- The filing keeps its own type (73E-N2), its signature rule (73A), its
  years and identity. The same person's signature choice, stamp and
  certificate tick are kept. A schedule the import fills has its "no items"
  tick cleared (`src/core/form/no-items-keys.js`, which 73F part 3's
  "+ Add Entry" will read).
- The confirmation (`src/core/excel/import-confirm.js`) names what is
  replaced, a different ward or type, the people who stop sharing a record,
  and each question. It is shown by a new `choicesModal()` in `dialogs.js`:
  radio groups, a conditional question, and an Import button that waits for
  every answer shown.

**As built, beside the design:**

- The design names `import-keep.js` for exact-name identity. `sameName()` is
  there; the importers' own containment rule (`samePerson()`) is unchanged
  until each importer moves onto the transaction. Changing it now would drop
  a near-match's stamp with no confirmation to offer keeping it.
- The transaction is reachable through `GuardianForms.testing.importTransaction`
  (plan, confirm, run). That keeps the new modules loaded (the dependency
  ratchet forbids unreachable ones) and lets the browser tests run on every
  build. Nothing a filer can reach changed.

**Found while building, and handled here:** compared field by field, a
draft that doesn't carry a field read as a blank. "Update the shared
record" would then have blanked a guardian's email and address on every
filing sharing them, and a workbook that doesn't carry the attorney would
have unlinked the attorney. `readRoleFields()` gained `presentOnly`, and the
plan compares and writes only what the draft holds. **For 73T's adapters:** a
blank cell is a blank, but a field the workbook has no box for must be left
out of the draft. The flat roles' signature keys that belong to a person are
the adapter's to name (`unboxed`).

**Tests:**

- New `tests/unit/import-transaction.spec.js` (14 tests). It covers who is
  the same person; the plan; Cancel and an unanswered question changing
  nothing (byte for byte, no save, no log entry, no change event); the
  commit's four outcomes (update, this filing only, another ward, a near
  match either way), each with one save, one log entry and one change
  event; never blanking what the workbook doesn't carry; and the
  confirmation's wording.
- New `tests/e2e/import-transaction-dialog.spec.ts` (3 tests). It covers the
  confirmation's questions, its conditional question, Cancel and Escape,
  and the whole transaction on an Annual: Cancel changes and saves nothing;
  Import replaces, saves once, logs once, and gives its notice after the
  redraw.
- `model-change-event.spec.js` lists the transaction's one announcement.
- **Red-first:** with the change to `party-resolver.js` alone set aside,
  three cases fail for the stated reason: blanks are read as changes, the
  attorney is unlinked, and the confirmation lists the blanks. With all of
  73E part 1 set aside, the module doesn't exist and the adapter has no
  `importTransaction`.
- Full unit suite passes; `npm run check:types` clean. **Related browser specs:
  6 files (the new one, signatures kept through an import, shared-record
  write-through, links following rows, stamp reuse, startup) -- 25 passed.**

### Design — part 2: Link Person and Merge

Link Person fills only the slot's blank fields from the shared record and asks
before replacing a typed value (today it overwrites every field, blanks
included, through `partyToFlatFields`/`writeRoleFields`); the existing
`reconcileSlotWithParty()` already does "shared record wins only where it has
a value". Merge's confirmation names the open filings whose typed details
will change (`party-resolver.js` near 868).

### Tests

- **Part 1:** new `tests/unit/import-transaction.spec.js`, with synthetic
  adapters: the diff, conflicts, exact-name identity, the signature policy
  preserved, one save, one log entry, one change event, and Cancel leaving the
  filing and the party store byte-for-byte unchanged with no save queued.
- **73T parts 2–4** (one form each): new `tests/e2e/import-confirm.spec.ts`
  cases — the real Import control, then Cancel leaves everything unchanged and
  queues no save; red-first: no dialog on the Inventory and Annual today, a
  half-applied filing on the Simplified. **Fixtures:** only 5 of the 20 specs
  that import a workbook accept dialogs; the other 15 change in the part that
  connects their form, and three pass today only because the cover is written
  before the question they never answer (`simplified-mount.spec.ts` near
  85–97, `simplified-part1-identity-cells.spec.ts` near 200–205,
  `excel-import-cell-shapes.spec.ts` near 90–95).
- **Part 2:** e2e cases for Link Person and Merge.

### Checklist (AGENTS.md §8)

1. **Data model:** none. 2. **Legacy:** none. 3. **Fixtures:** above.
4. **Tests:** above. 5. **Export/import:** every import path. 6.
**Security:** the import filter is narrowed to imported values (73T-3); the
party store changes only on the filer's explicit choice. 7. **UI/UX:** the
`.sav` confirmation's pattern. 8. **Legal framing:** none. 9.
**Cross-form:** all three importers, one transaction.

---

## 73F — One answer to "is this section complete?" (P1, P2, D10, D13, D16, D17, D28)

### What a filer sees today

A section shows ✓, the page lists nothing missing, the dashboard says
"Ready to file", and Print Preview blocks it with something no page asked
for — or a page says "Complete the required items on this page" and names
nothing. The complete inventory (16,638 single-change variants of 20
complete filings, run through both engines) found:

| Class | Where |
| --- | --- |
| ✓ while export blocks | an impossible-date draft on any date field (all nine forms); "Amended Form?" blank (Annual family); a Signature Stamp with no image, or "/s/" with no date, on guardian, preparer, attorney and certificate blocks (Annual, Simplified, all four Plans; the Plan Annual attorney and Annual Part X attorney aren't checked at all); the Plans' guardian phone, address and SSN; the Simplified Part VI date order; Part VIII's stale-tick cases; **"+ Add Entry" after ticking "no items"** (the tick isn't cleared and hides the new row, about 890 variants per Annual-family form) |
| Incomplete, naming nothing, while export passes | Unsigned and undated signature blocks; **a blank row from "+ Add"** (Annual schedules); Part VIII "No" without the extra tick; the Initial Plan's Q7 benefits question |
| Not checked anywhere | an unrecognised county ("P", "Pinelas", "Zzyzx") on all nine forms — no court caption prints; the Annual family's Type of Guardianship |
| Readiness card | its automatic rows always agreed with export; its overview rows contradict it: "Cover information… complete" beside any Part I issue; "part v" matching "part viii"; the Simplified's certificate and signature rows |
| Preview | sections counted three ways (D16); "1 required items" read to screen readers (D17); "Ready to export" over "N items outstanding" after an override |
| Page lists | Inventory D-1/D-2 list "Phone", "SSN/EIN" twice with no owner (D28); "Date entry - gid must be a valid date" |
| Asterisks | about 30 mismatches: e.g. the Annual's Starting Balance and Schedule A Amount enforced but unstarred; every Plan question-level requirement unstarred; the Annual's Part III office address and B-1–B-3 court-order dates starred but unenforced |

### Evidence

- The page checklist is drawn only when the sidebar already says incomplete
  (`nav-marks.js` near 88).
- Six engines decide "complete": the seven export validators (lazily
  loaded, reading `getD()`), the hand-written sidebar rules in
  `completion.js` (the Inventory's derived from its validator; pinned by a
  5,003-row golden), the page checklist, the readiness card, Preview's three
  renderings and the asterisks. The dashboard never has an open filing
  (`leave-filing.js` near 42), so it always uses the sidebar rules.
- Export uses `checkSignatureState()`; the sidebar checks only that a date is
  filled (Annual near 168, 194, 200; Simplified near 115; the Plans near 301,
  382, 472, 559).
- County: every validator checks only for blank (Annual near 1652, Inventory
  near 1369, …); `getFloridaCircuitCourtCaption()` returns null for an
  unknown county (`circuit-lookup.js` near 99–103).
- Impossible dates stay as drafts (`form-contract.js` near 479–491), are
  added only at Preview (`output-preflight.js` near 55), are bypassable
  (`issue-registry.js` near 10, Milestone 38, `b0321dd`), and are never
  cleared or re-keyed when a row is removed or duplicated — Milestone 25
  required that and it was never built.
- "+ Add Entry" clears the tick under the key `schA`; the tick is stored as
  `scha` (Annual `index.js` near 413).
- The guide's "the sidebar and the check that blocks your export now apply
  the same rule" (`help/index.html` near 269) was written for 55B's
  date-order rule only; its line near 284 ("the verification is cleared
  automatically") is false for the 25 Annual and Inventory schedules.

### Decisions (settled)

- **One rule everywhere** (73F-N1; supersedes 73F-9): the dashboard, the
  sidebar, the page checklist and Preview read the same result, for every
  filing, open or not.
- **"Ready to file" keeps today's meaning: every page ✓, 100%**
  (2026-10-05; Codex had suggested "no export blockers").
- "Amended Form?" is required wherever the field exists, the Inventory
  included (73F-1).
- County must be a Florida county on all nine forms (73F-2); common variants
  are corrected to the official name (73F-N3); a blank or unrecognised county
  can still be overridden at Preview, as today (73F-N2, against the
  recommendation; the PDF then has no court heading).
- An impossible date can't be overridden (73F-3), once drafts are cleaned up
  on row removal.
- Blank Inventory schedules are a prompt, not a block, as on the Annual
  (73F-4; Pinellas Clerk practice).
- Part VIII: "No" completes it; the extra tick goes (73F-5). A trust created
  after the GID but answered otherwise gets a Preview warning (73F-6).
- The remuneration Amount is required on both accountings once a row is
  entered (73F-7; whether §744.367(3)(a) needs it is flagged).
- Transaction dates outside the period get a Preview warning (73F-8).
- The Initial Plan's Q7 is kept and named on its page (73F-N4).
- Next follows each form's existing rule once draft clean-up is built
  (73F-N5).

### The model

Each form's single check returns three kinds of result (Codex's design):

- **blockers** — stop court output (overridable, except the non-bypassable
  classes in AGENTS.md §4 and impossible dates);
- **advisories** — shown in "Review recommended", never block;
- **completion prompts** — an enumerated list of sidebar-only questions the
  Clerk accepts unanswered (the 14 Annual schedules' and, after 73F-4, the
  Inventory's 11 schedules' "no items" ticks; the bond question; the Plans'
  certificates; the Annual Plan's 3G; the Initial Plan's Q7), each with its
  `sidebarOnlyWants` wording.

A page shows ✓ when it has no blockers and its prompts are answered. **The
invariant is one-way:** a ✓ never hides a blocker; a page may stay
incomplete because of a prompt while export passes (AGENTS.md §4's intended
divergence). "Ready to file" is every page ✓; the percentage counts pages ✓.

### Design — part 1: the shared checks

The seven validators move into modules loaded at startup that take the
filing as an argument (as `totals.js` does; about 1,120 lines; their
dependencies are already core modules), registered statically by engine id.

**A compatibility contract lets this part land on its own** (added after
Codex's second review):

- A new `evaluate<Engine>(filing)` returns `{ blockers, advisories,
  prompts }`, including the impossible-date drafts, identity and
  supplemental issues Preview adds today. Each issue keeps everything today's
  issues carry — its code,
  section, label, path and route, whether it can be overridden, and **which
  outputs it blocks** (`issue-registry.js`'s capabilities: preview, print,
  PDF, Excel). A supporting-document problem still blocks only Preview, Print
  and the PDF; an Excel capacity problem only Excel. Grouping issues by kind
  never merges their outputs.
- The existing `validate<Engine>()` functions stay, as thin wrappers
  returning exactly the arrays they return today, so every current caller —
  the export gate, the page checklist, the readiness card, `completion.js` —
  is untouched. The prompts are produced as data but nothing reads them yet.
- Part 2 moves each caller onto `evaluate<Engine>()`; the wrappers and the
  validator naming convention, the lazy global publication and the injected
  completion dependencies retire when no caller remains.

**No behaviour change in this part**: the existing validator tests, the
export-gate tests and the completion golden pass unchanged, and a new test
proves each wrapper returns the same issues, in the same order, as before.

### Build record, part 1 — BUILT 2026-10-06 (approved by name by the requester, 2026-10-06)

**What changed for a filer:** nothing — by design. Every check, message,
order, page, sidebar mark and export decision is what it was; the proof is
below.

**How:**

- **The engines.** The seven export validators moved into
  `src/core/validation/engines/` (`guardian.js`, `annual.js`, `simplified.js`
  and the four Plans'), each as `collect<Engine>Issues(d)` taking the filing as
  an argument: the code unchanged but for its opening (checked against the
  committed originals with a parser, character for character, the Annual's one
  whitespace difference aside) and one call — the Annual's reconciliation
  check now reads the filing it is handed, where it read the open one through
  `annualReconcileState()`'s default. The few helpers they need moved with
  them and are imported back by the features. Each feature's
  `validate<Engine>()` is now a one-line wrapper, so every caller — the export
  gate, the page checklist, the readiness card, `completion.js` — is untouched.
- **Their dependencies in core.** Core may not import a feature, and three
  things they need lived in features: the Annual family's totals
  (`src/core/accounting/annual-totals.js`), the Simplified's guardian address
  reconciliation (`models/simplified.js`) and the three workbooks' capacity
  limits (`src/core/excel/excel-caps.js`). Each moved unchanged; the old
  modules re-export them. (The proposal's "their dependencies are already
  core modules" was true of all but these.)
- **`evaluate<Engine>(filing)`** (`engines/index.js`, registered by engine
  id) returns `{ blockers, advisories, prompts }`: the blockers are exactly
  what Preview, Print, the PDF and Save as Excel judge today — the form's
  checks, a supporting document's problems, a date still being typed, the
  filing's identity problems and the workbook's capacity — each issue with
  its code, section, label, path, route, whether it can be overridden and
  which outputs it blocks; the advisories are "Review recommended"'s; the
  prompts are the sidebar-only questions (each Annual-family schedule's "no
  items" box, the bond question, a Plan's certificate, the Annual Plan's 3G,
  the Initial Plan's Q7) with the words and paths the pages use. It works on a
  copy, with the stored date drafts committed into the copy as
  `prepareFilingOutput()` does for real, so the filing is never touched — to
  do that, `output-preflight.js`'s issue collection was split out of
  `prepareFilingOutput()` unchanged (`collectOutputIssues()`). Nothing in the
  app reads it yet; `GuardianForms.testing.validate.evaluate()` exposes it
  for part 2's tests.

**Tests:**

- New `tests/unit/validator-engines.spec.js` (6). **Same issues, same
  order:** every wrapper against `tests/baseline/ms73-validator-golden.json`,
  recorded from the pre-move validators over the completion golden's 5,003
  variants of all nine identities (the variants moved, unchanged, to
  `tests/unit/support/filing-variants.js`), the clock fixed; 721 distinct
  issues in 1,288 distinct results. **What the gates see:** over every
  variant, `evaluate`'s blockers for each output equal that output's gate
  today, the advisories match and the filing is untouched; a
  supporting-document problem blocks Preview, Print and the PDF only, a
  capacity problem only Excel; a date being typed is reported and the drafts
  kept; the prompts carry their words and go once answered; a wrong or
  unknown filing fails loudly.
- **Not vacuous:** one word changed in one engine's message fails the
  golden; the gate comparison found the Annual's reconciliation check still
  reading the open filing (fixed above).
- Changed: `checklist-export-parity.spec.js` reads the checks from the
  engines (same findings); `completion-parity.spec.js` imports the shared
  variants (its golden unchanged); `filing-type-enumeration-guard.spec.js`
  documents the engines registry.
- Full unit suite passes; `npm run check:types` clean. **Full regression: not run** — the
  requester chose to push on the unit proofs (2026-10-06); the next full
  regression covers this part.

### Design — part 2: the screens use them

The sidebar marks, the page checklist (it names every blocker and prompt for
the page, never the generic sentence), Next, the dashboard's percentage and
"Ready to file", the readiness card's overview rows (derived from issue
routes), and Preview's counts all read part 1's result. `completion.js`'s six
hand-written rule sets retire. One grouping helper counts sections (D16);
the screen-reader message pluralises (D17); the page list keeps the role
(D28); after an override the banner says "Continuing with N items
outstanding". The parity test proves the one-way invariant over every
variant and that every prompt is on the enumerated list with its wording;
`checklist-export-parity.spec.js` retires. The completion golden's variant
generator writes "Yes" into signature-choice fields; it is fixed first, then
the golden is regenerated with each change stated.

### Build record, part 2 — BUILT 2026-10-06 (approved by name by the requester, 2026-10-06)

**What changed for a filer:**

- **The sidebar's ✓ is the export checks' own answer.** A page shows ✓ only
  when nothing that would stop its Preview belongs to it and its sidebar-only
  questions are answered (an Annual schedule's "no items" box, the bond
  question, a Plan's certificate, the Annual Plan's 3G, the Initial Plan's
  Q7). So a page can no longer show ✓ while Print Preview blocks it. Pages
  that now show −, with the item named: a blank "Amended Form?" (Annual,
  Final, Trust Part I); Part X's attorney signature undated, a stamp with no
  image, or unreadable; the preparer's, the attorney's (Part IV, Part V, the
  Initial Plan's) stamp with no image; a Part XI line started under a ticked
  "no items" box; Part VIII's trusts question unanswered; the Annual and
  Simplified Plans' guardian phone, address or SSN (the gap 73A exposed); a
  date still being typed that can't be a date.
- **And ✓ where export passes:** an Unsigned preparer or attorney without a
  date; Part VIII answered without the extra tick (73F-5).
- **The page's "Complete these items" list** names exactly what holds the
  page back -- its own blockers and questions -- never the generic sentence,
  and each item keeps its owner ("Guardian #2 — Phone", where D-1 listed
  "Phone" twice).
- **The dashboard's percentage and "Ready to file"** read the same marks, for
  every filing, open or not; an unopened filing saved before 73A is judged as
  opening it will leave it (its guardian's "/s/" asked again), so it can't
  read "Ready to file" until then. The Initial Inventory's percentage no
  longer waits for its feature to load.
- **Print Preview:** both lists count sections by page, as the sidebar does
  ("Part I" and "Part III" were one "Part"); a screen reader hears "1 required
  item is still missing"; after "Continue despite outstanding requirements"
  the banner says "Continuing with N items outstanding" (it kept the count it
  was drawn with, and a later redraw said "Ready to export"), on every form,
  the Inventory included.
- **The readiness card's overview rows** are decided by the pages issues
  belong to (a Part I issue no longer sits beside "Cover information …
  complete"; "part v" no longer matches Part VIII; a Part XI line no longer
  fails the signatures row), with a "remuneration is declared" row on the
  Annual family (Part XI) and the Simplified (Part VII).

**How:**

- **`src/core/status/section-marks.js`** reads `evaluateFiling()` once and
  splits it by page: a blocker belongs to the page its route names, or its
  section's (as every "Go to field" link resolves it), and to each page that
  also shows its field (`pageAlsoOwns()`); one no page owns (none is known)
  holds the first page back. `judgeFiling()` gives the marks, the begun map
  and each page's list; `sectionMarks()` and `filingProgress()` replace the
  registry's `computeCompletion()` and `filingProgress()`. Only blockers that
  stop Preview count: an Excel-only capacity problem holds no page back, so a
  filing too big for the workbook can still read "Ready to file" and be
  filed as a PDF (as the app tells the filer) -- today's behaviour, kept.
- **`completion.js`'s six rule sets retired.** What stays is each engine's
  "begun" map, unchanged, which the Summary pages' "in progress" badge reads
  (a page reads begun only while incomplete). The design said the rule sets
  retire and said nothing of the badge; keeping its signal keeps the badges
  as they were.
- **One reading per refresh:** the sidebar's marks, Next and the page's list
  come from the same judgement (`nav-marks.js`); the Inventory's first render
  draws the same list. Every Summary page, the dashboard and the test adapter
  read `section-marks.js`; the completion inputs features handed out
  (`completionDeps()`) and the adapter's "validator not loaded" simulation
  retired with them.
- **One grouping helper** (`src/core/validation/issue-groups.js`) groups both
  Preview lists by page, named and ordered as the sidebar has them.
- **One banner status** (`previewStatusHtml()` in `output-preflight.js`) on
  all seven Preview pages; the override redraws it and announces it.
- **Made fast enough to run after every change.** The checks judge a copy
  that shares the filing's text (a JSON round trip copied every byte of every
  attachment), and the supporting-document check remembers each stored file's
  decoded facts: on a filing carrying 16MB of supporting PDFs one judgement
  fell from about 98ms to 4ms; an ordinary filing takes under 1ms.
- **Two modules split so the checks stay light:** the Yes/No helpers moved to
  `src/core/form/yes-no.js` (the checks imported them from the field-write
  path, which refreshes the sidebar -- an import cycle once the checks fed
  it), and the supporting-document checks to `src/core/pdf/supplemental-checks.js`
  (the old module loaded the PDF viewer); both old modules re-export them.
- **Type check:** the checks are now reached from the router, so the files
  never written with types gained `// @ts-nocheck` with the reason (AGENTS.md
  section 2); the three with my own small type gaps were fixed instead.

**Tests:**

- **The variants first.** `tests/unit/support/filing-variants.js` wrote 'Yes'
  into signature-choice fields, so the saturated filings were never complete
  on any signature block (the design: "it is fixed first"). They take Unsigned
  now, and each signature block gained '"/s/" undated' and 'stamp without
  image' variants (70 new). Both goldens were regenerated on unchanged code
  first: only variants built from the saturated filing changed.
- **Then the marks.** The completion golden regenerated again, every change
  diffed by variant name and stated in its note (the groups above, mirrored on
  the Annual, Final and Trust; the Initial Inventory unchanged). One group
  accepted as harmless: an emptied guardian list reads ✓ on Part III, as
  export finds no card to ask about -- not reachable through the pages, which
  keep one card, and the Cover still asks for the guardian.
- New `tests/unit/sidebar-export-parity.spec.js` (3): over every variant of
  all nine identities, a ✓ never hides a Preview blocker or a question
  (judged independently of the module's own bucketing), 100% means nothing
  outstanding and a − page always has something, and every sidebar-only
  question is an enumerated kind in the page's own words (each kind seen);
  Excel-only problems hold no page back; an old filing is judged as opened, a
  closed one as filed. **Red-first:** with the module reading the old
  per-type rules (completion.js at HEAD), it fails for the stated reasons --
  Part I ✓ over "Amended Form?", Part X ✓ over the attorney's undated "/s/",
  Part VIII ✓ over its question, pages − with nothing outstanding.
  `checklist-export-parity.spec.js` retired, as the design said.
- New `tests/e2e/section-marks-follow-export.spec.ts` (5): the Annual Plan's
  Signatures page names a missing guardian phone and completes when it is
  entered; an impossible GID marks Part I and the page lists it; the banner
  after an override; sections counted by page in both Preview lists; D-1's
  "Guardian #2 — Phone". **Red-first:** with the source changes stashed, all
  5 fail for their stated reasons (Signatures ✓ with the phone missing; Part I
  ✓ over the bad date; no banner status to update; "across 1 section"; a bare
  "Phone").
- Changed: the unit specs that called a retired per-type rule read
  `sectionMarks()` (their fixtures carry the guardian signature rule, and the
  Plans' guardian is complete as export reads it); `startup.spec.ts`'s 40H-A
  case now proves the Inventory's progress is read unopened, never a
  fabricated 100%.
- Full unit suite passes; `npm run check:types` clean.
- **Full regression:** `npm test` once, as approved, on a copy on C: at
  d01edd4 (2026-10-06, 1.7 h): 1,038 passed, 16 skipped, 11 failed. Ten were
  tests of behaviour this milestone changed on purpose, updated in 1a164c8:
  Part VIII's test still expected the "no trusts" box alone to complete it
  (73F-5: the question decides it); the dashboard test still expected the
  Initial Inventory's progress to wait for its form's code (the shared checks
  load with the app); the conversion record (8 of its 9 cases) predated 73A's
  signature rule on every new filing (24 added lines, one per conversion,
  nothing else). The eleventh, the Final Accounting route smoke test, failed
  inside Playwright ("Resulting promise was garbage collected" while creating
  the filing), not in the app; it passed on D: and on the rerun. The four
  specs rerun on the same copy with 1a164c8's files: 47 passed.

**Found while building, recorded and not changed here:** none beyond the
design gaps above (the "begun" signal kept; Excel-only problems kept out of
the marks).

### Design — part 3: rules and asterisks

The settled decisions above, plus: "+ Add Entry" clears the schedule's tick
(the key fixed); a blank row counts as no row; Part VIII's rule is the
validator's; the Plan Annual and Annual Part X attorneys' signatures are
checked; impossible-date drafts are cleared and re-keyed when a row is
removed or duplicated (the prerequisite for 73F-3); messages read
"Section — Label" (the Inventory's date inputs get labels); the Inventory's
empty-schedule export rule (near 1381–1396) becomes a prompt; the Plans'
readiness predicates follow the county rule. Asterisks are drawn from the
rules (`syncRequiredMarkers`), fixing the mismatches above; the UCN is the
one exception (73S).

### Tests

New `tests/unit/sidebar-export-parity.spec.js` (the variant harness, both
engines, every form; nested rows); the completion golden regenerated; e2e
for the impossible-date page list, the Plans' Signatures list, "+ Add Entry"
after "no items", and an orphaned draft after Remove. Red-first for each
part-3 rule. **`npm test` recommended after parts 1 and 2** (every page
reads these results).

### Checklist (AGENTS.md §8)

1. **Data model:** required-when text for Amended Form, County, the Plans'
   contact fields, the remuneration Amount; `verify:data-model`.
2. **Legacy data:** filings that showed ✓ may show − with the item named
   (visible); a saved misspelled county appears as a named issue.
3. **Fixtures:** every new requirement grepped across `fillMinimalValid*`,
   `MINIMAL_VALID_*` and the unit fixtures first (§8.3); the three Plans
   without a complete fixture get one.
4. **Tests:** above.
5. **Export/import:** the export gate changes only where a decision adds a
   rule.
6. **Security:** none.
7. **UI/UX:** the existing checklist, readiness card and advisory box.
8. **Legal framing:** 73F-4 recorded as practice; 73F-7 flagged.
9. **Cross-form:** all nine forms.

### Build record, part 3 — BUILT 2026-10-06 (approved by name by the requester, 2026-10-06)

**What changed for a filer:**

- **"Amended Form?" is required on the Inventory** (73F-1). Its Cover asked
  it and nothing checked it; Preview now names it, as on the other forms.
- **The county must be a Florida county, on all nine forms** (73F-2). A
  county that isn't one is named -- *County: "Pinelas" is not a Florida
  county, so the court heading can't be printed. Choose the county from the
  list.* -- and can still be passed at Preview (73F-N2), the PDF then
  printing no court heading. "St Lucie", "Saint Johns", "Miami Dade",
  "Dade", "De Soto" and "Pinellas County" are written as the list's name
  when the filing opens (73F-N3). The Plans' readiness rows follow the same
  rule.
- **An impossible date can't be overridden** (73F-3). Preview lists it and
  says "At least one of these can't be overridden: correct it to continue."
  where it showed "Continue despite outstanding requirements" -- a button
  that stayed on screen, and did nothing, for any issue that can't be
  overridden. Its message reads "Section — Label": the Inventory's date boxes
  carried no label, so its pages listed "gid" and Preview "Date entry — gid".
- **A date still being typed stays with its row.** Remove and Duplicate move
  it with its row, and it goes when its row goes. It stayed at its old
  position -- shown on whichever row moved there, or, past the end of the
  list, held unseen where nothing could clear it -- and with 73F-3 that
  would have blocked the filing for good. It is named by the line it is on
  now.
- **The Inventory's empty schedules are a prompt, not a block** (73F-4), as
  on the Annual: a schedule with no entries and no "none" tick is asked on
  its page and in the sidebar, and export no longer stops on it. This is
  Pinellas Clerk practice, recorded as such (AGENTS.md §4).
- **Part VIII has no "no trusts" tick** (73F-5); question #1 answers it, and
  is now a starred Yes/No.
- **Two Preview warnings on the Annual, Final and Trust**, never blocking: a
  transaction dated outside the accounting period (Schedules B-1 to B-4, C,
  E; 73F-8), and a trust whose creation date is after the GID but answered
  No to "created after the GID?" (73F-6).
- **The Simplified's remuneration Amount is required** once a line is
  entered, as on the Annual's Part XI; 0 is an answer (73F-7). Whether
  §744.367(3)(a) itself requires the amount remains flagged for a qualified
  person.
- **"+ Add" after "I verify there are no items to report" withdraws the
  tick** on every form. The Inventory's stayed ticked, so the filing said
  both "here is an entry" and "nothing to report". A row "+ Add" left
  untouched is no row.
- **Asterisks follow the checks.** About seventy labels across the nine
  forms disagreed with what Print stops on. Now starred: the Inventory's
  "Amended Form?"; the Annual's Filing Type, "Amended Form?", County,
  Starting Balance, Schedule A's amount, Part VIII's question and every
  certificate recipient's name; the Simplified's recipients' names and
  remuneration Amount; the Plans' questions, check-box groups and rating
  tables that need an answer (rights restored, disabilities, residence,
  medical, mental health, personal care, socialization, unmet needs,
  committee recommendations, the remuneration declaration, the Plan for
  Minors' Q5 A to D), the Plans' guardian SSN, phone and address, and the
  Plan for Minors' "Amended Form?". No longer starred: the Inventory's payer
  and claimant addresses, the Annual's guardian office address, Schedules
  B-1 and B-2's periods and B-1 to B-3's court-order dates. A signature date
  is starred only under "/s/" Signed -- the only choice under which it is
  required -- and follows the choice as it changes. The attorney's name and
  details on the Annual's Part X and the Simplified's Part VI, and the
  Initial Plan's attorney name, are starred once an attorney is entered, as
  the attorney block already was. The Annual's Explanation of Difference box
  had no accessible name; its starred heading now names it.
- **Kept starred by the requester's choice (2026-10-06):** four fields 73B
  will make required -- the Inventory's liability Type (A-2, B-4), payment
  Frequency (C-1) and Type of Trust (C-4), and the Annual family's Type of
  Guardianship -- keep their asterisks until 73B adds the checks. Also kept:
  the either-or pairs (Schedule C's gain or loss, Schedule E's transfer in or
  out) and, until 73S, the Plan for Minors' case number.

**How:**

- `src/core/validation/county-rule.js` (new) holds the county rule; all
  seven engines and `readiness-config.js` use it. `canonicalFloridaCounty()`
  in `circuit-lookup.js` reads the spellings; `normalize-filing.js` writes
  them on open; `ward-county.js` reads through it.
- `field.date.invalid` is not bypassable (`issue-registry.js`). Drafts:
  `row-links.js`'s `remapFieldDrafts()` moves them on Remove, Duplicate and
  the clean-up; a draft whose row is gone is dropped; the row is read from
  the path when the message is drawn, so a moved draft names its new line;
  judging a copy of the filing no longer marks the open filing changed.
- `appendRow()` clears the list's tick (`no-items-keys.js`) for every form;
  the forms' own clears went. The blank-row rule reads the shared
  descriptors, treating '', null and a missing value alike.
- The Inventory's schedule blocks became `inventoryNoItemsPrompts()` in the
  shared checks; the Simplified requires the remuneration Amount;
  `date-advisories.js` (new) holds the two warnings, wired in
  `output-preflight.js` for the Annual family.
- Asterisks: `REQ_MARK` (`field-html.js`) for headings drawn as raw HTML;
  `signatureDateRequired()` (`signature-state-control.js`) for signature
  dates; the existing live markers (`attorney-required-markers.js`) on the
  Annual's Part X and the Simplified's Part VI; the Initial Plan's own
  marker covers the attorney's name.
- `pdf-preview.js`: when an item can't be overridden, the blocked panel says
  so instead of drawing the button.
- `testing.validate.requiredPaths()`: which fields, cleared one at a time,
  block Preview -- what the asterisk test asks.

**Tests:**

- New `tests/unit/county-rule.spec.js` (13), `drafts-follow-rows.spec.js`
  (7), `rules-and-warnings.spec.js` (6). **Red-first** (with the app changes
  set aside, the county lookup kept so the spec loads): county-rule 12 of 13 fail -- the spellings read as no county, no form names "Pinelas", the Plans' readiness rows pass it (the green case asks that a name that isn't a county reads as none, as it did); drafts-follow-rows 6 of 7 -- each draft left at its old position, a gone row's valid draft written as five bare rows, no line named, the date bypassable ("+ Add" moving none is a guard); rules-and-warnings all 6. The changed specs fail for theirs: the tick kept after "+ Add" and a blank row counted (collection-descriptors), "Date entry — periodFrom" (form-contract), the date bypassable (issue-registry), a copy marking the open filing changed (output-revision-wiring), the Inventory's schedules not asked (sidebar-export-parity).
- New `tests/e2e/asterisks-follow-rules.spec.ts` (7, one per form): every
  page, a row added to every list, each asterisk compared with whether
  clearing that field blocks Preview, signature pages again under "/s/"
  Signed; its exceptions must each still disagree, so one that stops is
  removed. New `tests/e2e/rules-follow-rows.spec.ts` (5). **Red-first:**
  the asterisk test fails on all seven forms, listing each mismatch this part fixes (and the five kept for 73B); the rules spec fails 4 of 5 -- "gid" listed, the Inventory's and the Annual's ticks kept after "+ Add" (the Annual's own clear used the wrong key), the draft listed without its line. The Simplified's case passes -- its own clear worked -- and now guards the shared one.
- Changed: `collection-descriptors`, `form-contract`, `issue-registry`,
  `output-authorization` (its bypassable example is now an unreadable
  amount), `output-revision-wiring`, `sidebar-export-parity`; the variant
  builder answers a county with a Florida county and an amount with a
  number. Both goldens regenerated, every change stated in their notes:
  168 Inventory variants ("Amended Form?" gained, the empty-schedule blocks
  gone), three Annual-family reconciliation variants; the completion
  golden's placeholder-text amounts from 73G part 1 gone.
- Browser, on D:: the 23 specs touching what changed (274 tests). 256
  passed first time. The other 18 were this part's intended changes -- the
  Annual Cover's and three Plans' text snapshots (the new asterisks), Part
  VIII's box (gone), the Inventory's schedule pages counting their own
  question (11 cases), a B-4 layout test planting a row with nothing in it
  -- and two slips in the new rules spec (a notice not dismissed; Preview
  lists an item by its label, not its sentence). Updated, all 18 pass.
- The Plans' Signatures list named in this part's test plan was delivered
  with part 2 (`section-marks-follow-export.spec.ts`).
- Fixtures (§8.3): the Inventory's `MINIMAL_VALID_GUARDIAN` answers
  "Amended Form?"; every other fixture already did, used a Florida county,
  and had no remuneration line without an amount.
- Data model: County, "Amended Form?" and the Simplified's remuneration
  Amount; `verify:data-model` passes. Full unit suite passes;
  `check:types` clean.

**Found while building, fixed here:** the dead "Continue despite…" button
above. **Left as decided:** Next follows each form's existing rule (73F-N5);
the Initial Plan's Q7 and the Annual Plan's 3G stay prompts (part 2).

**Full regression:** not yet run; recommended once at the end of this batch
(with 74B, 73G part 1, 73E part 1 and 73I).

---

## 73G — Amounts: one way to read, keep and show them (P6, D5)

### What a filer sees today

- Annual family, Schedule C: a **positive** 250 in "Loss / Reduction" raises
  Net Capital Adjustments (1,033.33 → 1,283.33) and Line 20; −250 lowers it.
  A positive Schedule E "Transfer Out" changes only Schedule E's own total.
  Nothing warns.
- **The Clerk's own notation loses its sign:** the workbook says to use
  parentheses for a transfer out, and "(1000)" is stored as 1000; so are
  "−250" and "–250" pasted from Word or a PDF, and "$-5,000.00". A typed
  "(" is removed on the keystroke.
- Every other amount box silently refuses a minus — although **all three
  workbooks tell filers any amount may be negative**.
- A box holding a negative (imported, carried or converted) **shows it as
  positive, and tabbing through it stores it as positive**; the Inventory
  flips it on the first keystroke.
- Negative amounts on Schedules D-1 to D-4, the Simplified's four Part II
  lines and the Annual's Part XI are **set to 0 on every page drawn**, and a
  stored "1,234.56" becomes 1. An imported overdrawn −200 account moves Line
  30, the bond requirement and the audit fee ($20 → $85 in the worked
  example).
- **The Simplified's remuneration Amount is free text:** "$1,234.56" files as
  **$0.00**, "1,234.56" as **$1.00** (PDF and workbook), and the next page
  drawn stores 1.
- A share of 0.5 means 0.5%; the Annual warns at Preview for D-1 to D-5, the
  Inventory not at all. Excel text-cell amounts are truncated or zeroed on
  import.

### Evidence and authority

- **The arithmetic matches the Clerk's workbook, so no total formula
  changes.** `SCH C CAPITAL ADJ p1`!C17: *"IMPORTANT: Losses should be entered
  as negative numbers, e.g., -2500…"*; G56 adds gains and losses straight.
  `SCH E BANK TRANS p1`!C8: *"Transfers out should be entered as negative
  numbers. Use parentheses ( ) to indicate the amount is negative."*
  Schedule E's totals feed no other formula. The app's totals
  (`annual-accounting/totals.js` near 56–57, 92–93) follow the workbook.
- **All three workbooks:** *"Enter all amounts in this document in numbers,
  e.g., 2500.50 or -2500.50. Each entry will be automatically converted into
  dollars and cents: $2,500.50 or ($2,500.50)."* (Annual `PART I`!C11,
  Simplified `PARTS I, II `!C9, Inventory `SUMMARY I `!C15). No workbook sets
  numeric validation, and none zeroes a negative (Annual Part IX `H17
  =SUM(G14:G16)`).
- `sanitizeDecimal()` sees only a leading "-" (`form-contract.js` near
  704–713); `sanitizeNonNegativeDecimal()` strips it (near 618–625, typing
  near 411, leaving the box near 568–573); a stored negative displays
  positive (`form-fields.js` near 196–198; Inventory `form-binding.js` near
  77–78, 101–104; Simplified `index.js` near 501–526).
- `sanitizeNegativeAmounts()` (`form-runtime.js` near 40–56) runs from three
  mounts (Annual near 145, Inventory near 193, Simplified near 233), so on
  every page drawn.
- The Simplified's remuneration Amount (`index.js` near 742) carries a
  `data-form-format="currency"` nothing handles.
- The Loss and Transfer Out boxes are hand-written (Annual `index.js` near
  1092, 1307); the Schedule E PDF has no totals row (`pdf-model.js` near
  887–895).
- Recorded rules: the Starting Balance keeps its sign (71E, D12); shares keep
  theirs so the range check can flag them (71C, D7); the rounding contract
  (2026-09-20) sums unrounded and rounds for display.

### Decisions (settled)

A positive loss or transfer out gets a warning; the figure stays as typed
(73G-1). "(1000)", "−250", "–250" and "$-1,000" are read as negative
(73G-2). **A minus is accepted in every amount box**, as the workbooks
instruct, with a non-blocking note where a negative is unusual (a negative
asset or income) (73G-N1; supersedes 73G-3). The Simplified's remuneration
Amount becomes a real amount box (73G-N2).

### Design — part 1: the amount codec

One codec, used by every amount box, the three importers' amount readers,
conversion and carry-over, with four separate operations:

1. **Parse** typed, pasted or Excel-text input into a signed number, or
   "unreadable — kept and flagged" (as `share-cell.js` already does for
   shares). A leading "(" is kept until the box is left, then read with its
   ")" as negative; "−", "–" and "$-" are minus signs.
2. **Store** the signed number.
3. **Display** in the box as stored, minus included; an untouched box is
   never re-stored.
4. **Present** court-style (73H). Sign meanings — the Inventory's negated
   liabilities, Part VI's subtracted disbursements — live in each form's view
   model, not in the codec.

`sanitizeNegativeAmounts()` retires. The Simplified's remuneration Amount
becomes a codec box; saved text is converted when the filing opens, and
unreadable text is kept and flagged.

**The calculation effect, stated:** filings holding a negative D-1–D-4 or
Part II amount (or Part XI amount) change Line 30 (the Simplified's Line 8),
the bond requirement and possibly the fee tier — toward the Clerk's workbook,
which zeroes nothing. No formula changes.

### Build record, part 1 — BUILT 2026-10-06 (approved by name by the requester, 2026-10-06)

**What changed for a filer:**

- Every amount box accepts a minus, as all three of the Clerk's workbooks
  instruct (73G-N1), and the Clerk's "(1000)", a "−250" or "–250" pasted from
  Word or a PDF, and "$-5,000.00" are read as negative (73G-2). An ordinary
  box keeps its decimal keypad; the boxes where a negative is expected keep
  the text keyboard (72E).
- A box holding a negative -- imported, carried or converted -- shows it,
  minus included, and tabbing through a box changes nothing. A -50 used to
  show as 50 and be stored back positive.
- Negative D-1 to D-4, Simplified Part II and Part XI amounts are no longer
  set to 0 on every page drawn, and "1,234.56" saved as text is no longer cut
  to 1. **The effect on filed figures, as the design stated:** a filing
  holding such a negative changes Line 30 (the Simplified's Line 8), the bond
  requirement and possibly the fee tier, toward the Clerk's workbook, which
  zeroes nothing. No formula changed.
- The Simplified's remuneration Amount is an amount box (73G-N2):
  "$1,234.56" files as $1,234.56. It filed as $0.00, and "1,234.56" as
  $1.00. Text saved before is read when the filing opens.
- Text that isn't an amount -- "1.000,50", or "N/A" from a workbook -- is
  kept as typed, the box says it can't be read, and Print Preview and the
  page's list name it, on its own page. It can be overridden, as an
  impossible date can.
- Importing a workbook reads text amount cells the same way. "(1,000.00)"
  came in blank on the Annual and 0 on the Inventory, and "1,234.56" as 1. An
  Inventory B-4 row with a negative balance is kept (it was dropped), and a
  negative remuneration amount on the Simplified imports as an amount (it
  became the description).

**How:** a new `src/core/form/amount-codec.js` reads, keeps and shows every
amount: parse, store, show in the box (court-style presentation stays
73H's). Every amount box goes through it -- the shared write path
(`form-contract.js`: a live filter and value while typing, and
`finalizeAmountControl()` on leaving, which writes nothing for a box left as
it was drawn and keeps and marks unreadable text), the shared renderer, the
Inventory's own binding, and the hand-written Part II, remuneration, Loss and
Transfer Out boxes. So do the three importers' amount readers and the bond
cell reader. `sanitizeNegativeAmounts()` is retired from the three mounts.
In its place a new `src/core/filing/amount-fields.js` lists where each form
keeps an entered amount -- exactly the data model's entered currency fields,
held in step by a unit test. That list drives a lossless reading of amounts
saved as text when a filing opens (`normalizeWardData()`), and one export
check, `field.amount.unreadable` (bypassable), merged beside the impossible
dates. The router's post-draw hook, which enforced "no negatives" on number
inputs that no longer exist, now marks unreadable amounts. Data model: every
entered currency field "negative allowed", with notes. `verify:data-model`
passes.

**Found while building, recorded and not changed here:**

- The Inventory's own checks still require each schedule's Full Asset Value
  to be more than 0, so a negative there is still a (bypassable) Preview
  issue on the Inventory. Decision 73G-N1 makes a negative asset a
  non-blocking note; that change belongs to part 2 ("a negative where it is
  unusual: a non-blocking note").
- Two dead branches in the Inventory's binding still clamp `type="number"`
  inputs. No amount box renders as one, so they do nothing; left as found.

**Tests:**

- New `tests/unit/amount-codec.spec.js` (9) and `tests/unit/amount-fields.spec.js`
  (5): every notation, blank and unreadable; the amount list against the data
  model; the open-time reading, idempotent; the unreadable-amount issue in
  Preview and the page list. New `tests/e2e/amounts-keep-their-sign.spec.ts`
  (5): an imported -50 on Schedule A survives a tab-through; an imported -200
  D-1 survives a page change; "(1000)" in Transfer Out is -1000; "$1,234.56"
  in the Simplified's remuneration files as $1,234.56; "1.000,50" stays,
  is marked and is named. `form-contract.spec.js` (+4 cases),
  `signed-amount-keypad.spec.ts` (+1: an ordinary box keeps a minus).
- **Red-first:** with the app changes set aside, all six new browser cases
  fail for their stated reasons (-50 shown as 50; -200 zeroed; "(1000)"
  stored as 1000; "$1,234.56" kept as text; "1.000,50" cut as typed; the
  minus dropped), as do the seven amount cases in `form-contract.spec.js` and
  the open-time case in `carried-balance.spec.js`; the two new modules don't
  exist there.
- Changed to the new behaviour: `form-contract.spec.js`'s three typing cases,
  `percent-field.spec.js` and `carried-balance.spec.js` (the retired clamp),
  `annual-field-formatting.spec.ts`, `simplified-remuneration.spec.ts`.
  Goldens: the completion golden (400 variants whose amounts hold the variant
  builder's placeholder text are now unfinished, nothing else) and the
  year-rollover golden (17 entries where the fixtures' text amounts are the
  same figures as numbers, nothing else), each with its note; the conversion
  golden and the .sav corpus did not change.
- Full unit suite passes; `npm run check:types` clean; `npm run
  verify:data-model` OK. **Related browser specs: 41 files, 333 tests -- 329
  passed; the 4 failures were the year-rollover record above, regenerated (9/9).**

### Design — part 2: warnings and boxes

- A positive Loss or Transfer Out: a non-blocking warning on the page and in
  Preview, quoting the workbook's instruction.
- A negative where it is unusual (an asset, an income line): a non-blocking
  note.
- The 0.5% share warning reaches the Inventory and appears beside the box.
- The Loss and Transfer Out boxes use the shared renderer as signed amounts;
  Loss is not marked required (the rule is "Gain or Loss").
- The Schedule E PDF gets the totals row the screen and workbook have.

### Tests

New `tests/unit/amount-codec.spec.js` (every notation; unreadable kept; no
re-store of an untouched box); new `tests/unit/sign-advisories.spec.js`;
`signed-amount-keypad.spec.ts` extended; e2e: an imported −50 Schedule A
amount survives a tab-through, an imported −200 D-1 survives a page change,
"$1,234.56" in the Simplified remuneration files as $1,234.56. **Goldens and
units that change:** `ms70-year-rollover-golden.json` and
`ms70-conversion-golden.json` (they record the zeroing turning text into
numbers), `percent-field.spec.js`, `carried-balance.spec.js`. Red-first.

### Checklist (AGENTS.md §8)

1. **Data model:** amount kinds for the Loss, Transfer Out and remuneration
   Amount boxes. 2. **Legacy data:** an amount already zeroed stays zero
   (the original is gone); saved remuneration text is converted on open,
   unreadable text kept and flagged. 3. **Fixtures:** above. 4. **Tests:**
   above. 5. **Export/import:** the importers' amount readers. 6.
   **Security:** none. 7. **UI/UX:** inline field feedback and the advisory
   box. 8. **Legal framing:** the workbooks' instructions are followed. 9.
   **Cross-form:** all three accountings and the Inventory.

---

## 73H — One way to show dates and negative amounts (P9, D21)

### What a filer sees today

- Dates as **2025-01-01** on the summary pages, the Annual's Part III–V
  statements, the bond warning and the Inventory Summary's GID; the PDFs
  print MM/DD/YYYY. A blank date prints "for the period through ." on the
  PDFs, "[from date]" on one screen, "—" on another.
- Negative amounts five ways: "$-5,000.00" (Annual and Simplified PDFs),
  "($1,021.21)" hand-wrapped in the same Annual table, "-$1,089.89"
  (Inventory), "(5,000.00)" (Annual screens), "($5,000.00)" (Simplified
  screens, sidebar); hand-wrapping gives "((5,000.00))" or "($-50.00)" for a
  negative.
- The cover's Quick Summary and the Summary page show Total Disbursements
  positive; Part VI shows them in parentheses. The Inventory Summary screen
  shows liability totals positive; its PDF and workbook negate them.
- Annual Plan Q11: "monies 1259.59 from…". The Annual's fee line says "Total
  Assets: $3,118.17" for Line 30, which is net; the on-screen fee prints
  "20.00".

### Evidence and authority

- `formatDisplayDate()` (`date-parser.js` near 122) is bypassed by
  `formatSummaryDate()` (`summary-renderer.js` near 72), the Annual's
  on-screen date reader (near 18, used near 768, 795, 836), `asDay`
  (`form-derived-fields.js` near 53), the Inventory Summary (near 800),
  `starting-balance-carry.js` near 42, the dashboard (`toLocaleDateString`)
  and the shared-record merge date (browser locale); seven PDF models keep
  their own copies.
- `formatMoney()` (`money.js` near 73) has five styles; hand-wrapped
  parentheses at Annual `pdf-model.js` near 174–178, 203 and `index.js` near
  726, 1396–1410, 1425–1428, `starting-balance-carry.js` near 121; Q11 at
  `plan-annual/pdf-model.js` near 507.
- **Authority:** the workbooks' instruction quoted under 73G ("$2,500.50 or
  ($2,500.50)") and their dominant amount format `"$"#,##0.00_);("$"#,##0.00)`
  (a few columns differ: Schedule C's loss column shows red without a sign).
  Part VI holds disbursements negated (`H13 =-'SCH B-1…'!K34`). 71E's design
  step 8 said parentheses; its build chose "$-". The original Annual Plan
  reads "monies of $___________" (`plan-annual-original.txt` near 438). Line
  30 is *"Net Assets at End of Accounting Period"* (`PART VI, VII `!B30); the
  fee table has no base cell, and net versus gross stays with the Clerk
  (Milestone 71, Legal Q-03).
- The Simplified keeps disbursements positive because its workbook does
  (`H29 =SUM(G27:G28)`).

### Decisions (settled)

Negative amounts print **($5,000.00)** on every PDF and screen (73H-1). A
blank date prints a **blank underline** on the PDFs (73H-2) — **except the
bond lines' "[date]", approved word for word in Milestone 67D, which stays**
(2026-10-05).

### Design

1. Every displayed date goes through `formatDisplayDate()` (trimmed to ten
   characters first; "—" kept on screens). The importer's date normaliser
   (`cell-reader.js` near 36) and `asDay`'s comparisons stay ISO.
2. One negative style through the codec's presentation (73G part 1). Part
   VI, the Quick Summary and the Summary page format the **negated** value,
   as the workbook does, so a disbursement keeps its "subtracted" cue and a
   net refund prints positive. The Inventory Summary screen negates
   liabilities like its PDF. The Simplified's disbursements stay positive.
3. Q11 prints as currency; a blank Q11, and the other blank-to-$0.00 cases
   (Simplified `pdf-model.js` near 382, Annual near 1238), print blank.
4. Screen amounts in parentheses carry visually hidden "minus" text; the
   narrowest money columns (Schedule E, the Inventory tables) are checked for
   the extra character.
5. The fee line reads "Estate value (Net Assets, Line 30): $3,118.17"; the
   screen's fee gets its "$".
6. The Simplified's Part VII Excel text keeps its format unless its
   importer changes in the same commit.

### Tests

New `tests/unit/display-formats.spec.js`; the PDF text specs that pin
today's formats are updated with the change stated. No calculation change.

### Checklist (AGENTS.md §8)

Presentation only (§5 doesn't apply). No data model or legacy change. All
nine forms.

---

## 73I — Due dates that match the statute (D33)

### What a filer sees today

For an annual accounting the dashboard counts 90 days after Period To, so it
marks the filing overdue early: by 0–3 days for a period ending on a
month's last day (12/31/2025 → 03/31/2026, actually due 04/01/2026; 06/30 →
09/28), and by 16–32 days for a period ending mid-month. A Final Accounting
gets the same 90 days, with no basis.

### Evidence and authority

- `dashboard/view-model.js` near 94–98; pinned by
  `tests/unit/dashboard-view-model.spec.js` near 24–27. When there is no
  date, the basis text is blanked (near 168) and the dashboard draws "No
  deadline".
- **§744.367(2):** *"…an annual accounting on or before April 1 of each year
  … If the court authorizes or directs filing on a fiscal-year basis, the
  annual accounting must be filed on or before the first day of the fourth
  month after the end of the fiscal year."* The Clerk's Annual workbook
  (`PART I`!C7) and Simplified workbook say the same. Only the Clerk's work
  slips say "90 days" (the lowest authority).
- **§744.367(1):** the plan is due *"within 90 days after the last day of the
  anniversary month that the letters of guardianship were signed, and the
  plan must cover the coming fiscal year, ending on the last day in such
  anniversary month"*; April 1 for calendar-year filing. §744.3675: the plan
  says how needs *"are proposed to be met in the coming year."*
- **Final reports:** §744.527(1) *"promptly"*, or *"no later than 45 days
  after … letters of administration or letters of curatorship"* if the ward
  died; **§744.511**, within 20 days after a guardian's removal; Probate
  Rule 5.680(c).
- The Inventory and Initial Plan (GID or Letters + 60 days) match §744.362(1);
  the Inventory's basis text cites §744.365 and should cite §744.362(1).

### Decisions (settled)

- Annual, Trust and Simplified accountings: **the first day of the fourth
  month** after Period To (73I-1; Pinellas Clerk practice confirmed).
- Final: **no due date**, with its basis shown (73I-2).
- Annual and Minors Plans: "For the period" is **the coming plan year**
  (73I-N3, supersedes 73I-3; practice), counted from **the last day of the
  anniversary month** (73I-N2).
- A due date on a weekend or legal holiday shows a **note**, not a moved date
  (73I-N1).

### Design

1. **Accountings:** due on the first day of the month four months after
   Period To's month (`new Date(y, m + 4, 1)`), never "Period To plus three
   months and a day".
2. **Annual and Minors Plans:** the anniversary month is the month of the
   day before Period From; due 90 days after its last day; April 1 when the
   period starts January 1. Their covers say to enter the coming plan year.
   **The Simplified Plan** (its form looks back and has no period of its
   own) counts 90 days from the last day of Period To's month.
3. **Final:** no date; the dashboard draws the basis — "Due promptly; within
   45 days after letters of administration if the ward has died; within 20
   days after removal (§§744.527, 744.511)" — sorts it last and never counts
   it overdue.
4. A date on a Saturday, Sunday or legal holiday adds "check whether the next
   business day applies (Rule 2.514)".
5. The Inventory's basis cites §744.362(1).

### Files and tests

`dashboard/view-model.js`, `dashboard/index.js`, `readiness-config.js` near
180 and 301, `help-content.js` near 110, `help/index.html` near 717, the
Plans' covers. `dashboard-view-model.spec.js`: every month length, a leap
year, mid-month periods, a calendar-year Plan, a Final, a weekend date.

### Checklist (AGENTS.md §8)

Dashboard and cover text only; no data model or legacy change. Practice
answers recorded as practice; the weekend rule is flagged, not decided.

### Build record — BUILT 2026-10-06 (approved by name by the requester, 2026-10-06)

**What changed for a filer:**

- **Accountings** (Annual, Trust, Simplified) are due on the first day of the
  fourth month after the period ends -- April 1 for a calendar year -- as
  §744.367(2) says (73I-1). The dashboard counted 90 days, so a filing read
  overdue early: 12/31/2025 was due 03/31/2026 instead of 04/01/2026, and a
  period ending 06/15/2026 was due 09/13/2026 instead of 10/01/2026.
- **A Final Accounting** has no date the app can count from (73I-2). Its
  row now reads "Due promptly; within 45 days after being served with
  letters of administration or curatorship if the ward has died; within 20
  days after removal (F.S. 744.527(1), 744.511)" where it showed a 90-day
  date, is never overdue, and sorts after dated filings.
- **The Annual and Minors Plans** cover the coming plan year (73I-N3): due
  90 days after the last day of the anniversary month -- the month before
  Period From -- and April 1 for a plan year beginning January 1 (73I-N2,
  §744.367(1)). They counted 90 days from Period To. Their Covers now say to
  enter the coming plan year.
- **The Simplified Plan** looks back and has no plan year of its own: 90
  days after the last day of Period To's month, and **April 1 for a period
  ending December 31** -- the statute's calendar-year date, as on the other
  Plans (the requester, 2026-10-06; the design named April 1 for the Annual
  and Minors Plans only).
- **A due date on a weekend or legal holiday** keeps its date and gains
  "Falls on a weekend or legal holiday: check whether the next business day
  applies (Rule 2.514)." (73I-N1). The legal holidays are Rule
  2.514(a)(6)(A)'s nine -- the days §110.117 sets aside for New Year's Day,
  Martin Luther King, Jr.'s Birthday, Memorial Day, Independence Day, Labor
  Day, Veterans' Day, Thanksgiving Day, the Friday after it and Christmas
  Day -- plus the Friday before one on a Saturday and the Monday after one
  on a Sunday. Days only the clerk's office closes (Rule 2.514(a)(6)(B)) are
  not listed (the requester, 2026-10-06). §110.117 itself is not in
  `reference/`; flagging both the day and its weekday stand-in only asks the
  filer to check, and asserts no reading.
- The Inventory's basis cites §744.362(1); the Plans' readiness reminder and
  the Help add April 1 for calendar-year filing.

**Authority, read for this build:** §744.367(1)-(2), §744.362(1),
§744.527(1) and §744.511 from the Chapter 744 PDF in `reference/`; Rule
2.514(a)(6) from the Rules of General Practice PDF there.

**How:** `dashboard/view-model.js` (`deriveWardDeadline()`,
`isWeekendOrLegalHoliday()`, the projection's `deadlineNote` and a Final's
kept basis); `dashboard/index.js` (the deadline cell); `readiness-config.js`;
`help-content.js`; `help/index.html`; the Annual and Minors Plans' Covers.

**Tests:**

- `tests/unit/dashboard-view-model.spec.js`: every month length, a leap
  February, mid-month periods, calendar-year Plans (a leap year included),
  the Simplified Plan's look-back count, a Final, weekends and each legal
  holiday (Juneteenth, a possible clerk-only closure, not flagged); the
  triage metrics' "approaching" filing moved to a period due two days out.
  **Red-first:** with the app changes set aside, 49 of 61 fail for their stated reasons
  (the 90-day counts, no Plan date from Period From, a dated Final, no
  holiday check); the 12 that pass are unrelated cases and dates where both
  counts agree (January 31 plus 90 days is May 1).
- New `tests/e2e/dashboard-due-dates.spec.ts`: a Final's row shows its basis
  and is never overdue; a Saturday April 1 carries the note. **Red-first:**
  with the app changes set aside, it fails at the Final's row
  (a 90-day date, no basis).
- Changed: `dashboard-visual.spec.ts`'s "Deadline Approaching" row is an
  Inventory 8 days from its due date (an accounting now falls due on a
  month's first day, so it could no longer be placed 8 days out); the
  Annual and Minors Plans' Cover snapshots carry the plan-year hint.
- Browser: the dashboard, routes and both Plans' mount specs (74 tests) on D:: 72
  passed first time; two were setup slips, fixed -- the new spec added both
  filings in one step and navigated before the second opened, and
  `routes.spec.ts`'s "due today" Simplified Plan was placed by the old 90
  days (now an Initial Plan 60 days after its Letters, since a Simplified
  Plan's date can no longer always be put within two weeks); both pass.
- Full unit suite: 188 files, 2,795 tests pass; `check:types` clean.

**Full regression for the batch** (74B, 73G part 1, 73E part 1, 73F part 3
and 73I; `npm test` once, as approved, on a copy on C:, 2026-10-07): unit,
188 files and 2,795 tests, all passed; browser, 1,095 tests -- 1,065 passed,
16 skipped, 14 failed. All 14 were tests of behaviour this batch changed on
purpose, and are updated:

- `excel-form-field-placement.spec.ts` (8 cases): its manifest wrote the probe
  "V0010" into County, which 73F part 3 now names as not a Florida county, so
  every export after the first stopped for an override. The County box now
  holds "Pinellas" (`named()` in `export-manifests.ts`).
- `form-entry-ux.spec.ts`: an empty Inventory schedule is its page's question
  ("Schedule A-1: add an entry, or tick ..."), not the export block's wording.
- `legacy-ward-data-normalization.spec.ts`: two B-2 rows holding nothing are
  no rows; they now carry a description, and the test still reads their blank
  answers.
- `pdf-form-specific.spec.ts` (19C) and `pdf-structure-tags.spec.ts` (19D):
  their Simplified fixtures' remuneration line had no Amount, now required;
  each fixture's own completeness check named it. (The fixture audit missed
  these and the placement manifest.)
- `plan-simplified-mount.spec.ts`: the Signatures snapshot carries the
  guardian's Phone Number and Mailing Address asterisks.
- `year-rollover.characterization.spec.ts` (guardian): the fixture answers
  "Amended Form?", which a new year clears; only that moved in its record.

Rerun on D: all 14 pass (the 8 Excel cases again after the follow-up below was taken out). The run itself
finished its tests but hung at shutdown, as did the reruns: Windows'
management service stopped answering, so the `taskkill` Playwright uses to
close its browsers never returned; the results were read from the per-test
log and the processes stopped by hand.

**Found by the regression, left to 73M and 74C** (the requester,
2026-10-07): a filer who clicks "Continue despite outstanding requirements",
saves, leaves Preview and comes back without changing anything sees Save as
Excel enabled, and the click only redraws Preview, saving nothing. Recorded in
73M's tests and 74C's, whose settled design (clickable, says why) covers it.
A fix that greyed the buttons out was built and taken back out, as it
contradicts that design.

---

## 73J — Pages that keep up with a change (P5)

### What a filer sees today

| What stays stale | Today |
| --- | --- |
| Annual B-4's Category Summary and "Assign a bank account" note | Built only when the page is drawn (Annual `index.js` near 1023, 1042–1072) |
| B-4's per-row bank-account dropdowns | Keep "Bank Account 2" after the account is named (`bank-accounts.js` near 57) |
| "No attorney is entered, so this part is not required" (Inventory D-2, Annual family Part V, Simplified Part V) | The live watcher toggles only asterisks (`attorney-required-markers.js` near 31–57) |
| The cover's "Why is this guardian filing without an attorney?" question (Annual Part I, Inventory Cover) | Stays after an attorney is typed, though it says it "goes away" (Annual near 699, Inventory near 777) |
| The sidebar's "Guardian: —" and the filing picker's name | Not refreshed after an Excel import, Link Person or Sync (`sidebar.js` near 53) |
| Inventory Summary "→ Complete Bond & Surety Info (D-4)" | A fixed link that reads as a to-do when D-4 is done (near 845) |
| Dashboard status override's "Automatic (…)" | Shows the override instead of what Automatic would infer (`dashboard/index.js` near 216–218; `view-model.js` near 125–134) |

### Evidence

The one change signal, `pg:field-written`, is fired only by a typed field
write (`form-contract.js` near 381). Imports, row actions, Link Person, Merge,
Sync, New Year, conversion and the year switch change the filing without it.

### Design — part 1: one change event

Every committed change — a field write, a row action, an import's commit, Link
Person, Merge, Sync, New Year, conversion, a year switch — emits one event
naming the changed paths (`src/core/model-change.js`); `pg:field-written`
becomes one of its sources. No visible change on its own.

### Design — part 2: live page parts

A page part declares the paths it depends on and is redrawn when they change
(`src/core/ui/live-parts.js`; the existing screen-reader `live-region.js` is
unrelated). The seven rows above use it; the D-4 link is hidden once D-4 is
complete; the dashboard label shows what Automatic would infer.

### Tests and checklist

New `tests/unit/model-change-event.spec.js` (every mutation path emits);
new `tests/e2e/live-page-parts.spec.ts`, one case per row; red-first.
`npm run check:types` (the sidebar and router). No data or export change.

### Build record, part 1 — BUILT 2026-10-05 (approved by name by the requester, 2026-10-05)

**What changed for a filer:** nothing visible — by design. Every committed
change to a filing now announces itself once, when the action is complete,
naming what it changed; part 2's live page parts will listen. As a side
effect, the actions that didn't mark the filing as changed for Preview's
override now do (the Inventory's and Plans' row actions, the B-4 accounts,
the "no items" boxes on the Annual and Simplified, a signature stamp, a supporting document, New Year, a year switch, a conversion): an
override given before one of them no longer carries past it, as it already
didn't past a typed field. Opening Preview clears an override anyway, so a
filer sees no difference.

**How:** new `src/core/model-change.js`. `commitModelChange(reason, paths)`
marks the output revision, queues the save and dispatches
`pg:model-changed` with `{ reason, paths }` (`'*'` for the whole filing);
it replaces `requestSave()` at the end of each action.
`recordModelChange()` is for an action that saves by its own means (the
Inventory's import, New Year, a year switch, a conversion);
`announceModelChange()` closes the field write, after `pg:field-written`
and the page's refreshes; `onModelChange()` listens. The event is sent at the
end of an action, never inside a helper it calls: Link Person sets the link
and then fills the fields, and an event in between would show a listener the
half-filled slot. The helpers keep marking the revision as before.

**Where (55 announcements in 16 files):** the field write and a date draft
(`form-contract.js`); the Plans' five row actions; the clean-up on leaving
a page (naming the lists it emptied); Link Person and "+ New Shared Record";
a signature stamp; Sync (three), Merge, Dismiss, Unmerge; a supporting
document added, removed, or its comment; New Year and a year switch
(`filing-years.js`); a conversion; the three Excel imports; Annual / Final /
Trust; the Annual's rows, B-4 accounts and "no items"; the Inventory's rows,
guardians, recipients, witnesses, the B-2 vehicle box and fields and the old
D-5 details (the "no items" box already went through the field write, whose
extra save call went); the Simplified's guardians, recipients, remuneration,
"no items", address conflict and old certificate details. **Saves that
announce nothing, each with its reason** (14 files): app preferences and
templates; Preview's annotations (storing them must not undo the override
just given); a supporting document's background check finishing; the field
write's own save; the repairs forms make on opening; test hooks.

**Tests:**

- New `tests/unit/model-change-event.spec.js` (9): the event's shape and
  the three calls' effects; through the real entry points — the field write
  (once, naming the field, after `pg:field-written`), the clean-up (the lists
  it emptied; silent when nothing was untouched), a Plan's add, duplicate and
  remove (one event and one save each); and a structural guard over `src/`:
  every `requestSave()` is a listed save that announces nothing, the
  announcements per file are pinned, and only `model-change.js` dispatches the
  event — so a new way of changing a filing can't skip it.
- Changed: `form-write-side-effects.spec.js` (the tail's order now ends with
  the change event).
- **Red-first:** with the 16 call sites stashed and the module kept, the
  field write, the clean-up and the Plan row actions announce nothing and the
  guard finds 22 files saving without announcing against the 14 listed;
  with them, all pass.
- Full unit suite passes; `npm run check:types` clean. **Full regression (`npm test`,
  approved 2026-10-05) at this commit, which also carries 73D and 74A, from a
  copy on C::** all unit tests passed (2,606); browser 1,037 passed, 16
  skipped, none failed, flaky or left unrun, of 1,053 (1.2 h).

---

## 73K — The page stays where the filer was (D9)

### What a filer sees today

On every form, a signature choice, Add, Remove, Duplicate, the vehicle box,
the preparer and certifier boxes, and Yes/No answers that redraw the page all
scroll back to the top, and keyboard focus falls to the top of the document
(after a confirmation, focus returns to a button that no longer exists).
Background redraws (a supporting-document check finishing, Sync) redraw the
page the filer is typing on.

### Evidence

Seven `mount()`s set `container.scrollTop = 0` (Annual near 195, Inventory
near 227, Simplified near 253, the four Plans near 117, 182, 113, 117).
`renderPage(page)` (`router.js` near 134) is told only which page, never
why; the current page is set before it runs, so it can't tell a redraw from
a visit. `dialogs.js` near 83 returns focus to the clicked button.

### Decision (settled)

After "+ Add" or Duplicate, the new entry scrolls into view if it is
off-screen and its first box takes the cursor; every other redraw keeps the
filer's place (73K-N1).

### Design — part 1: why the page is drawn

`renderPage()` takes an explicit reason — navigation, a change on the same
page, a filing or year switch, a background refresh, Preview — and a logical
focus target (a field path, or a row by 73V's transient row identity, never an index).
Every caller passes them. No visible change on its own.

### Design — part 2: keep the place

- A change on the same page: the scroll position is saved before the old
  page is cleared and restored after drawing; focus returns to the logical
  target; after Add or Duplicate the new entry is brought into view and
  focused.
- Navigation, a filing switch, New Year and conversion: the top, as today.
- Preview: exempt (it draws in stages).
- A background refresh waits until the filer leaves the field being typed
  in.
- The seven `scrollTop = 0` lines go.

### Tests and checklist

New `tests/e2e/redraw-keeps-scroll.spec.ts` (one accounting, one Plan; Remove
when the page shortens; Add brings the entry into view; focus after a
confirmation); red-first. `npm run check:types`; **`npm test` recommended**
(every page redraw goes through the router). No data or export change.

---

## 73L — Dialogs that wait their turn (P10, P12)

### What a filer sees today

- **One Escape closes two dialogs** (reproduced: a "Please enter a ward
  name" notice over Add Form, one Escape, both gone).
- **A pop-up stays visible and clickable over the lock screen**, showing any
  names in its text, and acts on cleared data if clicked.
- Dialogs stack: the documents reminder over "Please confirm"; the
  Simplified eligibility dialog left open behind its "does not qualify",
  carry-over and "source not found" notices.
- "Supporting documentation — You have entered items on Schedule X" fires
  right after "+ Add Entry", before anything is typed. (Seen once inside Add
  Form during the review; the exact path isn't established.)
- The Help panel covers the dashboard's toolbar and Actions column.
- In a background tab, Preview and dialogs wait (they need animation frames).

### Evidence

- Pop-ups listen for Escape without stopping it (`dialogs.js` near 91–96);
  `modal-events.js` near 86–94 then closes the next dialog down.
- Pop-ups sit at layer 10010, the unlock screen at 10000 (`modals.css` near
  28, 53); `lockApp()` (`app-lock.js` near 319–328) doesn't close them.
- Each pop-up is its own layer with no queue (`dialogs.js` near 49–59) and
  shows on the next animation frame (near 98–107), which a hidden tab never
  runs; the frame was there for labelling and focus, neither of which needs
  it.
- A schedule counts as having items when it has any row
  (`schedule-doc-ack.js` near 86–92). After "Not now" the reminder already
  waits until the filer next arrives at the page, and a guard stops it
  stacking on itself (`0598150`, 2026-09-27; `schedule-doc-ack.spec.ts`).
- The eligibility dialog closes only after its awaited notices
  (`filing-dialogs.js` near 154, 165, 189–192). The Help panel is a fixed
  410px drawer (`shell.css` near 287).

### Decision (settled)

The Help panel pushes the page over, and overlays below about 1,000px wide,
where a push leaves too little room (73L-1).

### Design

1. **Reminder:** today's rule stays (asked again on the next arrival after
   "Not now"); it is not asked for rows that are still empty, nor while any
   dialog — including Add Form and the eligibility dialog — is open.
2. **Pop-ups show at once:** labelled as dialogs when built; focus set
   immediately.
3. **One pop-up at a time:** a first-in, first-out queue for pop-ups only
   (Add Form and the eligibility dialog wait on pop-ups while open, so
   queuing them would deadlock); focus return is recorded when a pop-up is
   shown; a queued reminder is dropped if the page or filing changed.
4. **Escape closes only the top dialog.**
5. **The eligibility dialog closes as soon as the filing exists**, before any
   notice.
6. **Locking closes every pop-up.**
7. **Background tab:** a browser check first (open Preview, switch tabs
   before it renders, wait, return). Preview's rendering changes only if it
   doesn't finish on its own on return.

### Tests and checklist

New `tests/e2e/dialog-order.spec.ts` (Escape, the eligibility notices, the
lock screen, one at a time); `schedule-doc-ack.spec.ts` extended (an empty
row asks nothing; nothing while a dialog is open); red-first. **`npm test`
recommended** (every dialog goes through `dialogs.js`). Files: `dialogs.js`,
`modal-events.js`, `filing-dialogs.js`, `schedule-doc-ack.js`, `app-lock.js`,
`help-panel.js`, `shell.css` (and `pdf-preview.js` only per step 7). Security:
step 6 stops names showing over the lock screen.

---

## 73M — What Excel doesn't carry, said plainly (D7, D12, D15)

### What a filer sees today

- **The bond answer.** Neither the Inventory's D-4 nor the Annual's Part IX
  has a workbook cell for the arrangement, so a workbook imported into a
  filing whose answer is blank has it guessed from the bond cells: "Bond and
  restricted depository" comes back as **"Bond only"**, "Depository only" as
  blank, and the PDF prints the guessed answer. Bond fields the chosen answer
  hides are still written to the workbook, so it can show a $50,000 bond
  beside a waiver, and an old waiver date can win the next guess.
- **Inventory A-2 Notes** appear on screen and in the PDF but never in Excel,
  and an import **erases notes already in the filing**.
- **The Annual's Parts VI & VII explanation** is required when Lines 20 and
  30 differ and prints on the PDF; the page says "This explanation is
  included on the exported document", but the Clerk's sheet has no box for
  it.
- **Save as Excel** can look enabled and do nothing: after an override and a
  return to Preview all three forms redraw silently; with Part XI entries the
  button is disabled with a tooltip that can't show and gives the wrong
  reason.

### Evidence

`bond-depository.js` near 124–134 (the guess; it also migrates old saved
files on open); Inventory `pdf-model.js` near 783–792; Inventory `excel.js`
near 536–543 and Annual near 519–523 (hidden bond fields written); Inventory
`excel.js` near 712 (`notes:''`, applied by `Object.assign`); Annual
`index.js` near 1439 and `excel.js` near 52–56 (`explanation: null`; I20 and
I30 are formulas, never written); the three `doSaveExcel()`s (Annual near
159–171, Inventory near 120–131, Simplified near 45–58); Annual `print.js`
near 56; the override's re-enable test keys on the tooltip's wording ("template
can hold", `pdf-preview.js` near 476–478).

### Decisions (settled)

A-2 Notes stay out of the workbook, are said at Save as Excel, and are kept on
import (73M-1). The Parts VI & VII explanation gets a warning at Save as
Excel, and the page's sentence says "PDF" (73M-2). The workbook's bond block
shows only the fields the chosen arrangement shows (73M-N1). Part XI entries
now go on Part XI's lines (73T-2), so its Excel block goes.

### Design

1. **The notices come from 73T's workbook contract**: one list per form of
   what the workbook doesn't carry, shown in Preview and at Save as Excel,
   and in 73E's after-import notice.
2. **The bond guess, on import only:** an answer the cells can't tell apart
   is left blank for the filer to choose; the old-file migration on open is
   unchanged. Both the Inventory's D-4 and the Annual's Part IX.
3. **The bond block** writes only the fields the chosen arrangement shows;
   the filing keeps the hidden values.
4. **A-2 Notes** are kept on import, matched by position and the same
   lender, as people are matched.
5. **Save as Excel** stays clickable and says why it can't proceed (a
   pending acknowledgement, a capacity limit); the override's re-enable test
   no longer depends on tooltip wording.

### Tests and checklist

`bond-depository.spec.js` (the import-only guess), `import-keep.spec.js`
(notes), e2e for the Save as Excel explanations -- including **coming back to
Preview**: a filer who clicked "Continue despite outstanding requirements", saved, left Preview and came back without changing anything sees Save as Excel enabled -- opening Preview clears the earlier override (`beginFreshPreview()` in `mountPdfPreview()`) after the page drew the button from it -- and the click only redraws Preview, saving nothing and saying nothing (`excel.js`'s acknowledgement-required branch calls `renderPage('/print')`). Found by the batch regression, 2026-10-07; a fix that greyed the buttons out was built and taken back out at the requester's choice, as it contradicts this design. **18 specs** wait for Save as
Excel to become enabled as a "ready" signal and change. No data-model change;
the workbook is never written in a cell the Clerk didn't define.

---

## 73N — The PDF: line wrapping and the court's wording (D19, D8)

### What a filer sees today

- **Headings can run off the page.** Every block title is drawn on one line.
  The Simplified Annual Plan's Question 8, once a box is ticked, is about
  625pt wide in a 468pt column: it runs into the margin after "…the
  following was" and off the paper after "…executed by or". Fixed text
  otherwise fits; typed text can overflow — a long ward name in the page-1
  caption, a long B-4 account title, a "Subtotal — …" label beside its
  amount. A table title can be stranded at a page's foot (D29).
- **Sworn and certification wording is shortened on six forms:**
  - Annual family: the guardian's declaration ends at the period; the
    workbook (`PART II, III`!B23) continues *"…and includes a statement of
    the ward's assets at the close of said period. I also certify that any and
    all annual investigatory forms and fees have been filed and paid, unless
    exempt…"*. The receipts certification drops *"and will upon request make
    available for inspection as the court may order (F.S. 744.3678(3))"*.
  - Annual family and Simplified: the attorney statement drops *"I have not
    audited the accompanying guardianship accounting"* (`PART IV, V`!B27;
    `PARTS V, VI`!B13).
  - Annual and Initial Plans: the "consulted" certification drops *"…or
    consistent with the rights retained by the Ward"* (the Annual Plan's
    screen paraphrases it differently again); Q2 drops the county-move
    wording; the directives question shortens *"(including but not limited
    to: …)"*; the Annual Plan's Q10 drops *"and I have taken the following
    steps to verify there are none"*; the certification preamble on changed
    capacity isn't printed; the Initial Plan prints Q11 between 10D and 10E.
  - Simplified Annual Plan: Questions 3 and 5–9 lose the original's
    parentheticals — Q9's *"this does NOT include payments … from a
    government benefits program such as Social Security, Medicaid…"* — so the
    guardian answers a narrower question on screen than the filed PDF asks;
    questions 7–9 are numbered "Q7.", "Q8.", "Q9.".
  - The Inventory and the Plan for Minors are faithful.
- The dashboard says "No filing contact" for every Simplified Annual Plan,
  and lists no preparer when a guardian or the attorney is ticked as having
  prepared any filing.
- The Simplified Annual Plan's preparer and attorney cards look like they
  print; the court's form has no place for them (Milestone 61E, decided
  2026-09-20), though the attorney's name does print on the certificate when
  the attorney certifies it.

### Evidence

`pdf-engine.js`: one-line titles at near 327 (caption), 750 (supporting
documents), 841/845 (sections), 901 (notices), 957 (key-value grids), 1149
(checklists), 1215 (tables), 1543 (totals label); checklist and table titles
reserve a flat 20pt (near 1137, 1203) though a table's header and first row
need 43pt (near 1424); the text column is 468pt (near 291–292).
`plan-simplified/pdf-model.js` near 101–111; `dashboard/view-model.js` near
39–67. Originals: `reference/plan-forms/*.txt`; workbooks read with a parser.

### Decisions (settled)

The original form's or workbook's wording is restored **on every form**,
with a text-parity test (73N-N1, extending 73N-1). A table's title is kept
with its table on the certificates' recipient tables (73O-6).

### Design — part 1: line wrapping

One wrap helper for every one-line title (the eight kinds above); every space
check uses the wrapped height; the certificate's recipient tables keep their
title with the table (opt-in, so the Inventory's page count is unchanged). A
"no ink past the right margin" check runs for all nine forms with long-text
fixtures (today only the Inventory's schedules have one);
`pdf-engine-notice-title.spec.js`, which reads the engine's source, changes.

### Design — part 2: the court's wording

Wherever a question or certification prints, it prints the original form's
or workbook's text, laid out as full-width wrapped headings above the answer,
as the originals are (in today's 98pt label column Q9 would be 16 lines
tall). The screen uses the same text. A text-parity test compares each
printed statement with `reference/plan-forms/*.txt` and the workbooks' text.
**For a qualified person:** no PDF says "A MINOR" or "GUARDIAN ADVOCACY" in
its caption, because no model sets the ward type the caption reads
(`circuit-lookup.js` near 114–125), though the Minors original's caption does.

### Design — part 3: the Simplified Annual Plan

Questions numbered 7, 8, 9. The dashboard reads this filing type's contacts,
and on every form honours "this person prepared this filing". The preparer
and attorney cards say: "The court's Simplified Plan has no place for this;
it is kept for your records. The attorney's name prints on the certificate of
service if the attorney certifies it."

### Tests and checklist

The right-margin check; the text-parity spec; `pdf-form-specific.spec.ts`
(numbering, full Q8 and Q9); `dashboard-view-model.spec.js` (contacts).
Red-first. No data change. Restoring court wording is matching the Clerk's
instruments (§5), not a legal reading.

---

## 73O — The same job done the same way on every form (P7, P8, P11, D18, D20, D29)

AGENTS.md §8.9: a difference is not a defect by default. Below are only the
ones classed as defects or decided.

### Decisions (settled)

- **Simplified guardian name** (Cover and Part IV): the workbook keeps the
  Clerk's link (`PARTS III, IV`!F15 `='PARTS I, II '!D16`); a warning says when
  the two differ — the workbook prints the Cover's, the PDF Part IV's; an
  import keeps Part IV's name, or takes the Cover's when Part IV is blank
  (73O-1).
- **Initial Plan attorney:** one field, as the Annual Plan does; a filing that
  holds two different names asks the filer which to keep (73O-2). **Guardian
  names** on the Initial, Annual and Minors Plans: the cover keeps its list,
  with a warning when a signer isn't among it, as 72A does for the Inventory
  (73O-N1, superseding 73O-2 for guardians).
- **Recipients:** a name and four address lines on every certificate, the
  Plans' included (73O-3, 73O-N2).
- **Footer:** the Inventory's "← Previous: … · Page n of N · Next: … →" on
  every form (73O-4).
- **Trust accounting:** the title stays "TRUST GUARDIANSHIP ACCOUNTING"; the
  guardian signs (73O-5; practice).
- **Table titles** kept with the certificate's recipient tables (73O-6, in
  73N part 1).

### Part 1 — names

The two Simplified names (warning in `form-derived-fields.js`, import rule);
the Initial Plan's attorney merged into one field (a migration asks which name
to keep; **visible side effect:** a filing whose cover alone named an attorney
now has a "started" attorney, so the certification — Bar number, signature,
email — becomes required); guardian-name warnings on three Plans. Files: the
four forms' `index.js` and models, `form-derived-fields.js`, Simplified
`excel.js`, `carry-over.js` near 156, `dashboard/view-model.js` near 57–61,
`plan-initial/pdf-model.js`, the CSV (rows 902 and 932; `attorneyName` is not
"cosmetic-only" — it prints).

### Part 2 — the certificate's shape

A name and four address lines on all seven certificates: the shared recipient
factory, `models/simplified.js` and `models/guardian.js`, the CSV, the pages,
the started-field lists, the PDF models and the Plans' certificate, the
exporters (Annual B15/I15/B21/I21; Simplified rows 30–31 and 36–37; Inventory
B/H 16–17 and 22–23 — none of them formulas), the importers, and five
conversion mappings (one folds lines 3 and 4 together). **The Simplified's
hidden line 4** — stored, printed and counted as "started" but with no box on
screen — gets its box. The Inventory's grey "U.S. Mail" placeholder, which
reads as an answer, goes. The Simplified's star on Recipient 3's name, with no
rule behind it, goes. Recipients beyond four on the accountings are a
workbook capacity issue (73T).

### Part 3 — accessibility and the console

- The Simplified's five Part II boxes get real labels (today a screen reader
  says "startingBalance"); the label fallback stops using internal names and
  asterisks (`form-runtime.js` near 138–150).
- Every Comments box and upload input is named from the page's title, not
  "Comments about schA" (`schedule-docs.js` near 255–259; 62 pages).
- **The ward's name is no longer written to the browser console** on Create
  Form (`src/core/modals/filing-dialogs.js` near 38).
- html2canvas's logging is turned off (each Preview logged 6–7 lines through
  the engine's empty-page render, `pdf-engine.js` near 145–148); caching the
  PDF constructor after the first build is tried, with a browser check.
- The Start New Form cards' accessible names stop saying "Create … ward";
  Link Person and Link to Case show "O'Brien", not "O&#39;Brien"
  (`pick-record-dialogs.js` near 29, 84).

### Part 4 — previews and labels

- A **Print** button on the Annual-family and Simplified previews (they never
  had one; the action is already registered, `annual-accounting/print.js`
  near 90, `simplified-accounting/print.js` near 89).
- "Generating PDF…" and "✓ Exported!" on every form; one banner wording.
- The Inventory's footer on every form; one checklist wording (with 73F).
- "($)" removed from twelve Inventory labels that already show "$".
- The Simplified's card says "Remaining Assets On Hand", as its workbook
  (`PARTS I, II `!C31).
- The Annual's D-2 and D-4 "Total Value" columns — the ward's share, not the
  whole — take the workbook's "Ward's Value of Ownership", on screen, in the
  PDF headers and on the Summary page.
- Filing-type names from one list ("Simplified Annual Accounting", as the
  registry, PDF title and workbook say); "inventory type" becomes "filing
  type" (`common-modals.html` near 29, `conversion.js` near 335,
  `help-content.js` near 20).
- The oversized "Supporting Documents" and "Comments" headings: the styles
  target the `h2` they became in `26a6a9f` (`cards.css` near 125–126) (D18).
- The trust import label says "the Annual workbook, Filing Type: Trust".

### Tests and checklist

`form-derived-fields.spec.js` (the warnings); the recipients' lines in PDF and
Excel on all three accountings and the Plans' certificate; new
`tests/e2e/accessible-names.spec.ts` (no internal names on any page); the
console holds no ward name after Create; new
`tests/e2e/preview-print-button.spec.ts`. Goldens:
`ms70-conversion-golden.json`, `ms70-year-rollover-golden.json`,
`ms70-completion-golden.json`, `ms70-70C-filing-shapes.json`. Red-first.
Security: the console line is the one privacy change.

---

## 73P — Small fixes (D14, D22–D27, D32, the Help panel)

| Finding | Today | Fix |
| --- | --- | --- |
| D14 | Removing a schedule entry, recipient or witness is immediate; the Inventory's co-guardian removal lacks the confirmation the other forms give | A confirmation when the card holds anything (73P-1), through 73V |
| D22 | Link to Case lists the ward's name once per filing (`pick-record-dialogs.js` near 88–91) | Each name once |
| D23 | Start New Year says "opens a new blank year" and then that it copies the schedules (`common-modals.html` near 107; `year-dialogs.js` near 19–21) | One accurate sentence |
| D24 | Export All Filings suggests the live file's name, and choosing a new name silently makes that file the live case file (`case-file.js` near 88–95, 425–457) | Renamed "Save case file as…", behaviour kept (73P-2) |
| D25 | "Encrypted with the rest of this ward's data" shown on a case with no password (`schedule-docs.js` near 254) — it overstates the protection (§8.6) | Said only when the case is encrypted |
| D26 | Filtering the Active Filing picker to one match and pressing Enter does nothing (`filing-switcher.js` near 71–90) | Enter opens the single match |
| D27 | Dashboard search box beside empty space | A browser check at 1280px and 2,000px+ first |
| D32 | The Simplified eligibility dialog says details carry over "from an existing Simplified Annual Plan" while the list offers every filing (`common-modals.html` near 213) | Match the list |
| Help panel | "Choose your inventory type (Initial, Simplified, or Annual)"; "the sun/moon button in the sidebar"; "Three Types of Inventory"; amounts "rounded to nearest dollar" (`help-content.js` near 10, 16, 19–27, 79) | Nine filing types; the toolbar; cents |

`npm run check:types` (`case-file.js` is persistence).

---

## 73Q — The user guide matches the app (done last)

Rewritten against the finished app, figures re-shot with
`npm run capture:guide` and checked one by one.

- **Misstatements of protection (fix even if nothing else lands, §8.6):** the
  guide says only the last four SSN digits appear on printed or exported
  documents (near 300 and 847); **Excel writes the full SSN/EIN** on all three
  workbooks. "Everything you type is kept on this device" (near 756) needs the
  recovery cache's limits. Supporting documents "encrypted with the rest of
  this ward's data" (near 319, 848) only when the case is encrypted.
- **Statements contradicted by the app:** Unsigned and who may use "/s/"
  (73A); "the sidebar and the check that blocks your export apply the same
  rule" and "the verification is cleared automatically" (73F); "never
  answered for you" (73B); "County is not free text" (73F); un-ticking (73D);
  the Plans' co-guardian blocks are added with a button (73C); the
  Simplified's Part IV has one block plus "+ Add Co-Guardian"; Inventory D-5
  has one card and the "no recipients" question is a Yes/No pair above it;
  the footer (73O); Next is left enabled on the Inventory's Cover and D-1 to
  D-5 and the Plans' certificates by design; Print (73O); the Simplified
  Plan's "x of 9 questions answered" is on its Summary page; the filing
  card's labels, none on the Plans; a blank Ward's % counts as 0% and is
  listed as missing; Comments do print; 0 is refused on Schedule A-1; Part
  XI's Excel (73T); the fee is Line 30, net; the Simplified Plan prints
  neither preparer nor attorney block (73N); "Pick a filing and press Enter"
  (73P); the UCN (73S).
- **Contradictions within the guide:** the quick reference's "+ New Form →
  pick a card"; the saving table's Firefox/Safari wording (the figure is
  right); the Print Preview figure's "2026-CP-000123" (re-shoot with
  26-001234-GD); the workspace figure's "Guardian: —" (73J).
- **The guided tour:** it says the Simplified has no Excel output
  (`walkthrough.js` near 28); its "Signatures" stop points at Part III; its
  second stop can highlight a hidden dialog field. Three help entries can
  never be shown (`help-content.js` near 151–191).
- **Also:** the cover-field lists add the UCN (near 379, 462, 496, 547, 570,
  597); the import paragraph (near 330) says D-2's attorney name comes from
  the Cover's by the Clerk's own formula.
- **Layout:** a text width of about 75 characters; figures at natural size,
  not two-across thumbnails.

`user-guide-drift-guard.spec.js` registers any new control the guide names.

---

## 73R — The requester's change requests R1–R3

### Part 1 — more room for the section list (R1)

The sidebar's fixed blocks take 577px with the save controls closed and 743px
open, so at a 768px-tall window the section list gets 182px (16px open) and
at 600px none; every `@media` rule is width-based (`shell.css` near 60, 66).

**Decisions (settled):** the Clerk's copyright line becomes one line with the
full text on hover (73R-1; no rule in `reference/` requires it visible, and the
full clause stays in the Terms of Use); the filing type shows once, on the
card (73R-2); the open save controls float over the list (73R-3).

**Design:** a `@media (max-height: …)` block, the label and total on one line,
the percent and count on one line, one save-status line with its toggle;
estimated about 250px more for the list, measured in a browser at build.

**Tests:** the save-controls toggle is used by `dashboard-backup`,
`backup-restore-sav`, `routes`, `case-file-damaged-open`,
`case-file-newer-format`, `case-file-protection`,
`lock-and-save-state.contract`, `ward-lock` and the guide's capture script;
the card's label and total by `annual-mount.spec.ts` and
`sidebar-total-follows-changes.spec.ts`; the tour's progress stop by
`guided-tour-navigation.spec.ts` and `guided-tour-content.spec.js`; the type
strip by `routes.spec.ts`.

### Part 2 — "GF" for "PG" (R2)

The sidebar shield (`index.html` near 41), the Terms of Use dialog (near 155),
the guide's header (`help/index.html` near 110), and two raster icons
(`icons/icon-192.png`, `icons/icon-512.png`: favicon, Apple touch icon,
installed-app icon). **Decision (settled):** new icons drawn to match today's
shield, approved by the requester before they ship (73R-4). The internal
`pg-` names stay (renaming the theme key would reset every filer's light/dark
choice once; Milestone 62 kept them). Installed apps may show the old icon
until they refresh. Every full-window guide figure is re-shot (73Q).
`npm run test:e2e:portable` (icons and manifest are packaging, §9).

### Part 3 — fit height and full width in Print Preview (R3)

Today every page renders at once, at a fixed 1.5 scale with no allowance for
high-resolution screens (`pdf-preview.js` near 231–260): a Letter page is
918px wide in a container capped at 912px (`print.css` near 6); there is no
zoom control; the Viewing bar (`print-pager.js` near 133–145) isn't drawn for
one page.

**Decisions (settled):** unsaved notes are kept and redrawn at the new size
(73R-5); the choice is remembered on this device; one-page previews get the
bar (73R-6).

**Design (Codex's requirements):**

1. "Fit height" and "Full width" beside Prev / Next, with `aria-pressed`.
2. **Lazy rendering:** only the visible page and one page either side are
   drawn; others are drawn as they scroll into view and released when far
   away.
3. **Caps:** scale × device-pixel ratio, limited so no canvas exceeds 16
   million pixels (below iOS Safari's canvas limit), lowering the
   device-pixel multiplier first.
4. **Cancellation:** a zoom change cancels renders still in progress
   (pdf.js render tasks) before starting new ones.
5. **Notes:** the annotation layer's unsaved state is serialized before a
   re-render and restored after (today it lives only in pdf.js's editor
   layer and is saved only by Save Annotated PDF;
   `pdf-annotate.js` near 205 reads the real render scale).
6. The 9.5in cap lifts for Full width; `--total-scale-factor` is set per page
   (`print.css` near 132).

**Acceptance test:** the 19-page Inventory at a 2,560px-wide viewport, at
device-pixel ratio 2 — canvas memory measured by summing live canvas areas;
proposed limits, confirmed against today's eager render at build: no more
canvas memory than today's render of all 19 pages at 1.5×, and a zoom change
settles within 2 seconds on the reference workstation.

**Tests:** new `tests/e2e/preview-zoom.spec.ts` (including the acceptance
test); `pdf-annotate.spec.ts` near 103–110.

---

## 73S — The UCN (request R4)

### Decisions (settled)

Milestone 63 (2026-09-21) made the UCN optional. Now: the UCN is **starred on
all nine covers, with a reminder in Preview's "Review recommended" box when it
is blank or not in the UCN's shape; it never blocks, never changes a ✓, in
every county** (73S-1, 73S-2, 73S-4; departing from the recommendation to
block in Pinellas only). The Plan for Minors' Case # becomes required (73S-3),
and the Plan for Minors is **identified by its Case # first** — the
requester's named approval to change AGENTS.md §6's rule ("Plan Minor always
falls back `ward.ucn || ward.ref || ''`") (73S-N2). The covers' sentence
"Fields marked with an asterisk (*) are required before export" is amended for
the UCN, which gets a screen-reader description and is exempt from 73F's
asterisk rules (73S-N1).

### What the sources say — flagged, not resolved

- **Rule 2.245(b)(1):** *"The clerk of the circuit court … shall use the
  Uniform Case Numbering System. The uniform case number shall appear upon the
  case file, the docket and minute books (or their electronic equivalent), and
  the complaint."* The duty is the clerk's.
- **Rule 2.525(f)(1)(A)** concerns a filing that *"lacks a correct case
  number"* — a case number, not the UCN. Probate Rule 5.020 and AO 2024-025
  say nothing of it; the work slips identify a case by "REF #".
- The original Plan for Minors is the only Clerk instrument here with a UCN
  line ("UCN: 52______GA00______XXGDXX"). No Clerk workbook has a UCN cell, so
  Excel never carries it. The Florida Courts Technology Standards and the
  portal's filer requirements aren't in `reference/`.

Recorded as the requester's decision, not as a rule.

### Design

1. The UCN box is drawn by five helpers (`case-caption-card.js` near 31 for
   three Plans; the Inventory near 762; the Annual near 675; the Simplified
   near 438; the Plan for Minors near 241); each stars it.
2. The reminder (in `output-preflight.js`, as the guardian-email reminder
   is) fires when the UCN is blank, or when, with hyphens and spaces removed,
   it isn't 20 characters; it never requires "GA" or "XXGD" (codes vary) and
   never reformats the stored value. The statewide format isn't sourced in
   `reference/`.
3. Preview's box also says the workbook has no UCN box, on the three forms
   with Excel (no Save as Excel path shows advisories).
4. The Plan for Minors: Case # required; identity `ref || ucn` in
   `case-resolver.js` near 35, `dashboard/view-model.js` near 162,
   `dashboard/index.js` near 452 and 472 (judge sharing),
   `delete-confirmation.js` near 47 and its PDF model near 27; AGENTS.md §6
   edited; the CSV row's label "Reference number" matches the screen's
   "Case #".

### Tests and checklist

`ucn-cover-field.spec.ts` (the star and reminder), `ucn-header.spec.js`
unchanged, a unit case for the shape check, the Plan for Minors' Case # rule
and identity. **Legacy:** no filing turns incomplete for a missing UCN; a
Plan for Minors saved with only a UCN now lists the Case # as missing
(visible). **Fixtures:** Plan for Minors fixtures that give only a UCN gain a
Case #. `verify:data-model`.

---

## 73T — The Excel round trip, field by field (added by the review)

### What a filer sees today

| # | Form | What happens | Established by |
| --- | --- | --- | --- |
| 1 | Simplified | **Re-importing its own workbook blanks Guardian #1's name** and drops that guardian's signature choice, stamp and "served the copies" tick: Part IV's name box (`PARTS III, IV`!F15) is the Clerk's formula from the cover, which the export leaves alone and ExcelJS writes back with no result, so the importer reads it as blank (`excel.js` near 31–37, 400) | Node simulation; needs a browser |
| 2 | Annual family, Simplified | **Every import scrambles the attorney's and the certificate guardian's signature choice**: the name-casing pass treats any key containing "attorney" or "guardian" as a name (`form-contract.js` near 832), so "typed" becomes "Typed"; Preview then says "signature selection is invalid" and a stamp stops printing | Code; the function run in node |
| 3 | Annual family | **Part VIII's answers are written beside the Clerk's boxes**: the boxes are `PART VIII`!H8 (with the Yes/No list), H17/H27/H37 and H18/H28/H38, unlocked on a protected sheet; the app writes D8, D17, D18…, locked leaders (`excel.js` near 474–497). A hand-filled workbook imports with question #1 and every share and amount lost. Today's placement is pinned by `export-manifests.ts` near 474–481 | Parser (locking, validation) |
| 4 | Annual family | A Trust or Final filled from the Clerk's blank workbook becomes an Annual (`PART I`!H4 = "Annual"; `excel.js` near 661–662); its own "Amended " option is unrecognised and blocks | Code, parser |
| 5 | All three | Imported people bypass the shared records (73E) | Node |
| 6 | Inventory | D-2's attorney name is replaced by the Cover's "Attorney for Guardian" (the workbook's I26 is the Clerk's link to D24); when they name different people, the attorney's emails, choice and stamp are dropped | Code |
| 7 | Inventory, Annual | Rows dropped: an Inventory B-4 creditor with a $0 or blank balance or no lender (`excel.js` near 716); an Annual B-1/B-2 row with only an amount (the "has data" test reads the date column, near 748) | Code |
| 8 | Annual, Simplified | Recipients 5 and later aren't exported, with no warning; the Annual's import rebuilds exactly four | Code |
| 9 | Inventory, Annual | A hidden outside-preparer block is erased by import while a guardian or the attorney is ticked as preparer (AGENTS.md §4) | Code |
| 10 | Simplified | Part V's attorney date never reaches its box (`PARTS V, VI`!H17); the certificate's box (H41) falls back to it; import copies H41 into both | Parser, code |
| 11 | All three | Import strips `"`, `<`, `>` and backticks from text: the Clerk's own example `30" Flat screen TV` returns as `30 Flat screen TV` | Code |
| 12 | Inventory | C-2 and C-3 text containing " / " splits back wrongly ("Foreclosure / Lien" → description "Foreclosure", case number "Lien") | Code |
| 13 | Annual family, Simplified | Blank amounts are written as 0: a blank Starting Balance returns as $0.00, silencing "required"; an untouched card returns as a $0.00 row with errors. The Simplified's five Part II amounts do the same (found building part 1; added to part 4 by the requester, 2026-10-07) | Code |
| 14 | Inventory, Simplified | The Inventory's "no recipients are required" answer is cleared by import; the Simplified's workbook lists recipients the PDF suppresses when it is Yes | Code |
| 15 | Inventory | Part V's own safe-deposit box (H12) is never written; "inventory filed?" (H26) is written when the ward has no box | Parser, code |
| 16 | Inventory, Annual | Bond fields hidden by the chosen arrangement are written (73M) | Code |
| 17 | All three | Text starting with = + - @ gains a leading apostrophe that comes back on import | Code |
| 18 | Simplified | Import clears old certificate attorney details never discarded, contrary to 72H | Code |
| 19 | Inventory | Names typed "as entered" are re-cased on import; a legacy free-text date imports blank; "this person prepared this filing" is carried by position, not person | Code |

**In the Clerk's own workbooks:**

- **Annual Schedule B-4:** one subtotal formula on every register page tests
  another row's date column — for example `SCH B-4 OTHER DISB p2`!L23 is
  `=IF(D21="Taxes: Intangible",H21,0)` — so an intangible-tax payment on the
  first register row (and a utilities payment on a block's first row) drops
  out of the SUMMARY sheet and so out of Part VI H16 and Line 20; the PDF
  counts it. This repo's page-copying script copied it into the added pages.
- **Annual Part XI** has 27 blank, unlocked lines (`PART XI`!A6:A32) under the
  statutory paragraph; the app blocks Save as Excel for any Part XI entry on
  the belief that the sheet has nothing to fill in (Milestone 58D;
  `excel.js` near 548–553; AGENTS.md).
- The Simplified's `PART VII`!F1 is a text cell holding the literal
  `='PARTS I, II '!H4`; all three county lists hold only Pinellas and Pasco
  under a fixed "SIXTH JUDICIAL CIRCUIT" caption.

### Decisions (settled)

The B-4 formula is **corrected in the embedded workbook** — the requester's
named approval as the Clerk's representative (AGENTS.md §5) — and the office
is told so its published copy is fixed too (73T-1). Remuneration entries go
**one per line on Part XI**, as the Simplified does on its Part VII, so a
filing with remuneration can be saved as Excel; Milestone 58D's Excel block
and the comments describing the sheet as empty retire (73T-2; practice).
Imported text keeps `"`, as typing does; `<`, `>` and backticks are still
removed (73T-3).

### Design — part 1: the workbook contract and its checks

A typed **workbook contract** per form replaces the "field → cell" list
(Codex's design). Each entry states:

- the field (or fields) and the **direction** — export, import or both;
- the **cells**: one or several; a repeating block's geometry and
  **capacity**; any **older cells** read as an import fallback;
- the **codec**: text, date, amount (73G's), share, Yes/No, list value; and
  how several fields combine into one cell and split back;
- the **formula policy**: never written, or written only under a named
  approval (the Annual's F25, 2026-09-19);
- the **absence policy**: a blank cell clears the field, or keeps it (the
  workbook has no say);
- the **preservation rule**: kept from the filing when the workbook carries
  nothing (signature choices, the policy of 73A, emails), and for whom (73E's
  exact-name identity);
- the **"not carried" note** shown in Preview, at Save as Excel and after an
  import (73M).

Exporters, importers and the notices all read the contract. **Checks:** the
existing ones stay — no target is a caption, a covered merge member or a
formula except under a named approval (`excel-write-targets.spec.js`), and the
exported file is read back to prove the formulas survived (72A's
workbook-versus-template guard), never a re-import alone; added: every target
is an unlocked input cell; a full round trip per form with a distinct value in
every field, compared field by field; an import of a workbook filled in by
hand on the Clerk's own form.

### Design — parts 2 to 4: each form

Each part moves that form's importer onto 73E's transaction and its mapping
onto the contract, fixing its rows above:

- **Part 2, the Inventory:** rows 6 (D-2 keeps its own name when it differs;
  the Clerk's I26 link stays), 7, 9, 11, 12, 14, 15, 16, 17, 19; with 73B's
  blank dropdowns, 73D's vehicles and 73M's notes.
- **Part 3, the Annual family:** rows 2, 3 (the boxes, with the old leader
  cells read as a fallback for workbooks exported before the fix), 4 (the
  filing keeps its type; "Amended " recognised), 7, 8 (a recipient capacity
  rule like the other capacity rules), 9, 13 (blank written blank), 16, 17;
  Part XI's lines (73T-2); the B-4 formula (73T-1).
- **Part 4, the Simplified:** rows 1 (Guardian #1 kept from the filing; the
  Clerk's F15 link stays), 2, 8, 10 (H17 written), 13 (Part II's blank
  amounts written blank; the requester, 2026-10-07), 14, 18; the
  remuneration Amount through 73G's codec.

### Tests and checklist

The three new checks; one red-first case per row; `export-manifests.ts`
changes for Part VIII and Simplified H17; the import specs from 73E.
**Legacy:** workbooks exported before the Part VIII fix import through the
fallback; values lost on an earlier import can't be recovered. **Data model:**
none (cells live in the contract). **Security:** the import filter matches
typing (73T-3). **Legal framing:** Part XI touches §744.367(3)(a)'s
declaration; recorded as practice.

### Build record, part 1 — BUILT 2026-10-07 (approved by name by the requester, 2026-10-07)

**What changed for a filer:** nothing yet. Part 1 writes down, form by form,
exactly where the app's workbooks put every field and how each comes back on
import, and checks that against the Clerk's own workbooks. Parts 2–4 move
each form's export and import onto it and fix the rows above.

**What it is** (`src/core/excel/workbook-contract/`): `codecs.js` (how a
value goes into a cell and comes back -- text, date, amount, share, Yes/No,
list -- in the variants each form uses today); `engine.js` (write a filing,
read a workbook into a detached draft, list every cell a contract names);
one contract per form -- `guardian.js`, `annual.js`, `simplified.js` --
describing today's exporter and importer exactly, each known defect marked
with its row above and the part that fixes it, with what the workbook doesn't
carry and what is kept for the same person; and `index.js`, the contract for
a filing type and the adapter 73E's transaction takes (not connected; browser
tests reach it as `GuardianForms.testing.importTransaction.readWorkbook()`,
as they reach 73E part 1's engine).

**Checks** (`tests/unit/workbook-contract.spec.js`), for each form:

1. The contract writes what the exporter writes: every box of the export
   guard's manifest (`export-manifests.ts`, which
   `excel-form-field-placement.spec.ts` holds the real exporter to), with
   the value it expects, and nothing else.
2. Every cell it writes is the Clerk's input box: no caption, no formula
   (except the recorded approvals, the Inventory's F8 and the Annual's F25),
   no covered merge member, and unlocked on a protected sheet.
3. A round trip through a saved workbook, a distinct value in every field,
   returns each field; the losses still open are listed with their row.
4. A workbook filled in by hand on the Clerk's own form imports field by
   field: typed as Excel stores typed values, in the boxes a person uses,
   nothing in a locked or formula box (a formula box holds what Excel
   computes).
5. The adapter's filing-type mapping and today's text passes.

Every listed loss, locked box and defect must still happen; the part that
fixes one removes it from the list.

**What the checks found**, beyond the table above:

- **Boxes locked in the Clerk's own workbooks.** On protected sheets the
  Clerk's Inventory leaves locked A-1's "Residence?" and "Income?" columns,
  A-2's and B-4's liability "Type", C-1's "Frequency", C-4's "Type of Trust",
  and C-5 page 3's relationship, value and share (page 2 unlocks the same
  three; the rows and borders match, so the app's placement is right). The
  Annual leaves D-5's "Type?" locked. A person completing the form by hand
  can't type there; the app's exports fill them, since protection doesn't
  stop a program. Recorded in the check, and the office told so its
  published copies can unlock them (the requester, 2026-10-07).
- **The Simplified's Part II writes a blank amount as $0**, as row 13 does
  for the Annual: added to row 13 and to part 4 (the requester, 2026-10-07).
- **Three of the Annual's date boxes are Text cells** in the Clerk's
  workbook -- the attorney's signature date (`PART IV, V`!H31) and the court
  order dates on B-1, B-2 (J) and B-3 (H). A date typed there by hand is
  stored as text ("1/5/2001"), which the importer reads; the app writes a
  real date.
- Confirmed in a hand-filled workbook: rows 3 (Part VIII's H boxes) and 10
  (the Simplified's H17); in the round trip: row 1 (the Simplified's
  Guardian #1 name).

**Seen failing while built:** the input-box check on the 160 Inventory
boxes and seven D-5 boxes locked in the Clerk's form before they were
recorded; the round trip on every date until the test harness shared its
Date with the vendored ExcelJS (`tests/unit/support/exceljs-node.js`, so a
date read from a saved file is a Date to the app's readers, as in the
browser); the hand-filled check on the Annual's Text-cell dates and its
`=Guardian` link until the simulation typed and computed them as Excel does.

**Not run:** the full regression (the batch's mid-batch run covers it);
`check:types` (no file in its scope); `verify:data-model` (no stored field
changed).

---

## 73U — Stored stamps and PDFs cut by the import filter (BUILT 2026-10-04)

Every time a case file was opened, a backup or the recovery snapshot
restored, or an Annual or Simplified workbook imported, the import filter
(`src/core/security/input-hardening.js`) ran over the drawn signature stamps
and attached supporting PDFs, stored as base64 data URLs; its `on…=` rule cut
the end off about 1 in 50 of them ("…onXk=", measured 1.95% of 20,000), and
the next save kept the damage: a stamp that doesn't display, or a PDF that
makes Save as PDF fail. **Decision:** fix it first (the requester,
2026-10-04).

**Build record (`5b8849b`):** `sanitizeInput()` returns a strict base64 data
URL (`data:<type>/<subtype>;base64,` then base64) unchanged — it can hold none
of the characters the filter removes, so no protection is lost — and every
caller inherits it. New `tests/unit/sanitize-keeps-stored-files.spec.js` (6):
red-first, the four stored-file tests fail against the old filter; the two
guard tests (valid payloads; non-strict data URLs and script text still
filtered) pass both ways. Related units and seven e2e specs, 130 passed;
`check:types` clean. Files already cut can't be repaired.

**Found while fixing, left for 73T:** on opening a case file the filter skips
text held directly in a list, while the in-place version used by imports
filters it; text is made safe where it is displayed, so this is a consistency
gap, not an exposure.

---

## 73V — One description per repeating list (a foundation; added 2026-10-05)

### What a filer sees today

- **Removing a guardian can move the next guardian onto the removed one's
  shared record**, so a later Sync copies one person's details onto another:
  the Plans (`normalizePlanGuardians()`, `plan-rows.js` near 24–29), the
  Inventory (`normalizeGuardians()`, `index.js` near 131) and the Annual's
  importer (its guardian filter, `excel.js` near 697) all drop rows without
  moving the links; only the accountings' clean-up re-indexes them
  (`prune-cards.js` near 125–128). AGENTS.md §6.
- New blank rows vanish on redraw (73C).
- Removing a card asks first on some forms and lists, not others (73P).
- "+ Add Entry" doesn't clear the schedule's "no items" tick (73F).
- After Add, the cursor is lost (73K).

### Evidence

`schedule-definitions.js`, `src/core/form/plan-row-actions.js`,
`prune-cards.js` and each form's row actions separately know the factories,
floors, limits, blank tests, linked-id arrays, removal and re-indexing. The
shared registry, `SCHEDULE_SCHEMAS` (`schedule-definitions.js` near 6), is
keyed by list name alone, although the same list differs by form: `guardians`
has different factories and limits on the Inventory, the Annual family and
the Simplified, and `planGuardians` on the four Plans, whose actions pick the
factory and maximum by filing type (`planGuardianBlank()`,
`planGuardianMax()`).

### Decision (settled)

Build one description per repeating list as a foundation, used by the items
that add, remove or clean up rows (the requester, 2026-10-05).

### Scope of this delivery (narrowed after Codex's second review)

**A behaviour-preserving foundation, plus prevention of future linked-id
shifting.** Every form keeps its current add, duplicate, remove and clean-up
behaviour; the only change a filer can observe is that removing or cleaning
up a row no longer moves the next person onto another's shared record. The
descriptions may already state the policies later deliveries switch on —
the removal confirmation (73P), clearing "no items" on add (73F part 3),
keeping blank rows until the filer leaves the page (73C), where the cursor
goes (73K part 2) — but those stay **inactive** until their own deliveries,
each of which is approved separately.

### Design

1. **Keyed by form and list.** A description is looked up by the pair
   (filing type, list key) — for example (planInitial, planGuardians) or
   (simplified, guardians). There is no generic fallback for lists whose
   shape differs between forms (AGENTS.md §4, §6: form-specific factories);
   lists that are genuinely identical may share one description object
   registered under each key.
2. **Each description gives** the factory, floor and maximum, the blank test,
   the linked-id array (if any), the duplicate rule, and the inactive policies
   above.
3. **One set of actions** — add, duplicate, remove, clean up, re-index —
   serves every form. Every linked-id array moves with its rows on remove and
   clean-up; a duplicated row starts unlinked (as today,
   `schedule-definitions.js` near 196).
4. **Row identity is transient.** A row's identity (used by 73K to put the
   cursor back on the right row) lives in memory only — a `WeakMap` keyed by
   the row object — and is never saved, exported, counted by the blank test,
   or copied when a row is duplicated: a duplicate gets a new identity. When
   rows are rebuilt (an import, a year switch's copy), the identities are new
   and the cursor falls back to the page's default.
5. **Missing descriptions fail loudly.** Every action resolves its
   description first and throws an error naming the missing (filing type,
   list key) if there is none — including for a filing that carries no
   filing type.
6. **The existing API stays, as an explicit compatibility layer.** The
   three row actions keep their signatures — `addCollectionRow(listKey,
   filing, factoryOverride?)`, `duplicateCollectionRow(listKey, index,
   filing)`, `removeCollectionRow(listKey, index, filing)` — and find the
   description by the filing's own `inventoryType` and the list key, so their
   callers (Annual `index.js` near 366, 414, 421; Simplified `index.js` near
   120–153, whose `createSimplifiedGuardian` override stays accepted) don't
   change. A filing with no type fails loudly (step 5). `SCHEDULE_SCHEMAS`
   stays exported, read-only and marked deprecated, holding exactly the
   descriptions it holds today; after 73V nothing in `src/` reads it, and new
   code must use the (filing type, list) lookup. The side-effect import in
   `src/form-events.js` near 9 stays.
7. **Existing misaligned links are not repaired.** Links already shifted in
   saved files can't be told apart from intended ones, so 73V neither guesses
   nor rewrites them. They stay as they are and visible in the shared-records
   list, which shows every filing and slot linked to each record
   (`party-management.js` near 50–57), for the filer to correct with Link
   Person or by unlinking.

### Tests and checklist

- New `tests/unit/collection-descriptors.spec.js`:
  - **an explicit expected inventory** of every (filing type, list key) the
    nine forms use — written out in the test, not derived from the registry —
    compared with the registry, so an unregistered list fails;
  - every action throws for an unregistered key;
  - for every registered list: links follow their rows through remove and
    clean-up; a duplicate is unlinked and gets a new identity; identities are
    absent from the saved filing and from exports; floors and maximums;
  - **each form's current behaviour unchanged** (what add, duplicate, remove
    and clean-up do today, apart from the links).
- **Direct users of today's registry, audited** (every file that imports
  `schedule-definitions.js`):
  - `tests/unit/schedule-definitions.spec.js` — **changes**: its sample
    filings carry no filing type, so they gain `inventoryType: 'annual'`
    where they call the three actions; its `SCHEDULE_SCHEMAS` assertions keep
    passing through the compatibility export.
  - `tests/unit/output-revision-wiring.spec.js` — **changes**: the filing it
    passes to the three actions gains `inventoryType: 'annual'`; its
    assertions are unchanged.
  - `tests/unit/types-contract.spec.js` (reads `SCHEDULE_SCHEMAS.schA` and
    `.schB1`) and `tests/unit/remuneration-declaration.spec.js` (reads
    `SCHEDULE_SCHEMAS.remuneration`) — **unchanged**, through the
    compatibility export.
  - `src/features/annual-accounting/index.js` and
    `src/features/simplified-accounting/index.js` — unchanged (same
    signatures); `src/core/filing/models/simplified.js` mentions the registry
    only in a comment; `src/form-events.js` keeps its side-effect import.
- `prune-cards.spec.js` and `filing-registry.spec.js` change only where they
  pin the shifted links. Red-first: removing a middle guardian on a Plan, on
  the Inventory, and through the Annual importer's filter moves the next
  guardian's link today.
- **Data model:** no change; the identity is never persisted.
- **Legacy data:** prevents future misalignment only (step 7).
- **Export/import:** none, except that the Annual importer's guardian filter
  keeps links with their rows.

### Build record — BUILT 2026-10-05 (approved by name by the requester, 2026-10-05)

**What changed for a filer:** removing or cleaning up a guardian row no longer
moves the next guardian onto the removed one's shared record, at **four**
places (one more than the specification named — found while building):

| Where | Before |
| --- | --- |
| A Plan's guardian list (`normalizePlanGuardians()`, every Signatures-page draw) | dropped blank co-guardians, links left in place |
| The Inventory's D-1 (`normalizeGuardians()`, every Inventory page draw) | dropped co-guardians with no details, links left in place |
| The Annual family's Excel import | dropped the workbook's empty guardian slots, links left in place |
| **The Inventory's Excel import** (found while building) | skipped a co-guardian slot with no name, links left in place |

Everything else each form does on add, duplicate, remove and clean-up is
unchanged. One invisible difference: adding a guardian on the Inventory or a
Plan now also adds an unlinked slot to `guardianPartyIds`, as the Annual and
Simplified always did, so the two arrays stay the same length.

**New files:** `src/core/form/collections.js` (the list rules for all nine
filing types, the shared actions, the in-memory row identity),
`src/core/form/row-links.js` (dependency-free: which lists carry links, and
keeping rows with their links), `src/core/form/blank-rows.js` and
`src/core/form/schedule-schemas.js` (moved unchanged from `prune-cards.js` and
`schedule-definitions.js` — both verified byte-identical — to avoid import
cycles; the old modules re-export them).

**Changed:** `schedule-definitions.js` (the three actions delegate, same
signatures); `prune-cards.js` (links for any list through `row-links.js`; a
typed filing's lists must have rules); `plan-row-actions.js`; `plan-rows.js`;
the Inventory's `index.js` (all its row actions) and `excel.js`; the Annual's
`index.js` (the B-4 accounts) and `excel.js`; `models/simplified.js` gains
`simplifiedGuardianRow()`, which the feature's `createSimplifiedGuardian()`
now returns (identical row).

**Tests:**

- New `tests/unit/collection-descriptors.spec.js` (20): the explicit
  inventory against the registry; loud failures; every form's rows, floors and
  limits as before (including the row each of the eleven Plan "+ Add" buttons
  names, read from the pages); inactive policies; links through remove,
  clean-up, duplicate and add on all nine guardian lists; transient identity.
- New `tests/e2e/guardian-links-follow-rows.spec.ts` (4): the four places,
  through the real pages and Import control.
- **Red-first:** with the four sites' old code restored, the unit Plans case
  and all four browser cases fail for the stated reason — the dropped row's
  link stays and the next guardian sits on it (`['party-ann', 'party-blank',
  'party-carol']`, and likewise); with the fix, all pass.
- Changed as specified: `schedule-definitions.spec.js` and
  `output-revision-wiring.spec.js` (sample filings name their type; a
  loud-failure case added); `types-contract.spec.js` and
  `remuneration-declaration.spec.js` unchanged.
  `filing-type-enumeration-guard.spec.js`: its documented exception for
  per-schema collection membership moved with the table to `blank-rows.js`,
  and `collections.js` joined it.
- Full unit suite: all pass. `npm run check:types` clean (the router reaches
  the new modules through the clean-up). **Related browser specs: the 24
  files that add, duplicate, remove or clean up rows on any form, plus the new
  one — 264 passed, 1 failed:** the Inventory's case-number test timed out
  waiting for the app's startup screen 32 minutes into the run, before any row
  action; rerun on its own, its file passed 7 of 7.
- **Full regression (`npm test`, approved 2026-10-05), run at `8b96aa3` from
  a copy on C::** all unit tests passed (2,554); browser 1,025 passed,
  16 skipped, 2 failed, 1 did not run (2.3 h). Neither failure involves rows:
  - `rollback.contract.spec.ts` never opened a page. It unpacks the pre-merge
    build with `git archive`, and the copy's git store lacked the index for
    one of its packs ("packfile … index unavailable"), so the extraction
    failed; its password twin did not run for the same reason. The
    repository on D: reads that commit normally.
  - `tab-and-update.spec.ts`'s update-banner test read from the page while
    "Reload now" was reloading it ("Execution context was destroyed").
  - Both files rerun from D: at the same commit: 7 of 7 passed.

**Found while building, not changed (outside 73V's behaviour-preserving
scope):**

- On the Annual family, an untouched Schedule **B-3** or **B-4** row is never
  cleaned up: "+ Add" makes a row whose fields differ from the clean-up's
  blank template (B-3 adds period dates; B-4 adds `bankAcct` and
  `description`). Same class as 73B's D-1, D-2 and D-4 mismatch; for 73B.
- The Inventory's import matches the kept "prepared this filing" ticks,
  emails and signatures to the earlier guardians by position in the shortened
  list, not by workbook slot; for 73T.

---

## Reported, not reproduced or by design

| Test finding | What was found |
| --- | --- |
| The supporting-documents reminder fires on unrelated pages | Partly explained; the exact path isn't established (73L) |
| The ward-creation console line repeats for earlier wards | Not reproduced: one line per click, one listener. The line itself goes (73O) |
| The Simplified's certificate has two recipient cards | Not reproduced: a new filing shows one |
| The Trust PDF's title and "the guardian" wording | Mostly by design: the Clerk's Annual workbook covers trust accountings; the title is kept and the guardian signs (73O) |
| Amount boxes accept letters | Only digits are stored |
| Three decimals stay in the box | By design: the rounding contract of 2026-09-20 |
| Annual schedules with no entries don't block | By design: AGENTS.md §4, Pinellas Clerk practice; extended to the Inventory (73F) |
| The Simplified Plan's PDF omits the preparer | By design: Milestone 61E (73N fixes the cards and the guide) |
| The Simplified Accounting's Excel has "/s/" in the attorney cells | The Clerk's workbooks pre-print it; the app doesn't write it (73A) |
| D-2's attorney comes back from Excel as the Cover's name | By design: the Clerk's formula (`PART IV`!I26), Milestone 72H; 73T keeps D-2's own name when it differs |
| The readiness panel's title changes for an unknown county | By design: Milestones 38B and 44C |
| A Signature Stamp needs no date | By design (Milestone 39-B); whether an undated stamp suffices is for a qualified person |
| The Simplified certificate cites §744.362(1) (round 2, N8) | Closed by the test itself: the Clerk's workbook carries it |

### For the Clerk (not app changes)

- "UNDER **PENALITIES** OF PERJURY": the Inventory's `PART III`!B6 and the
  Annual's `PART II, III`!B20, which also has "**l** have" with a lower-case
  L. The PDFs print the correct text; Excel keeps the Clerk's (§5).
- The Annual's Schedule B-4 subtotal formula error — corrected in the app's
  copy (73T); the office's published copy needs the same fix.
- The Simplified's `PART VII`!F1 prints its formula's text.
- All three workbooks carry an empty, very-hidden "Acerno_Cache_XXXXX" sheet
  (Milestone 71 left it: removing a sheet re-points print areas).
- The county lists hold only Pinellas and Pasco under "SIXTH JUDICIAL
  CIRCUIT".
- Still open from Milestone 71: whether the audit-fee base is net or gross
  (Legal Q-03).

---

## Verification plan

- Each delivery in the build order is approved, built, seen failing first for
  its stated reason, then passing, pushed, and recorded in its item.
- Targeted specs per delivery; `npm run check:types` and
  `npm run verify:data-model` when in scope (see the build order).
- **Full regression (`npm test`) is recommended** after 73F parts 1 and 2,
  73K part 2, 73L, 73E part 1 with 73T part 1, and once at the end; each needs
  the requester's go-ahead. `npm run test:e2e:portable` for 73R part 2.
- **Browser checks named in the items** run before their items are built: the
  Simplified Guardian #1 re-import; the Inventory D-1 card; Preview in a
  background tab; the Inventory's Save as Excel after an override; the
  dropdowns' blank option in Chromium, Firefox and WebKit; the dashboard
  search box; the html2canvas line count.

## Not in scope

- Changing a fee base or a sign rule against the Clerk's workbooks (§5). 73G
  changes how amounts are read and kept; filings holding a negative D-1–D-4,
  Part II or Part XI amount change their totals toward the workbooks, which
  zero nothing (stated in 73G). The audit-fee base stays with the Clerk's
  answer to Legal Q-03. The B-4 formula is corrected only under the
  requester's named approval (73T).
- What nobody tested (encrypted cases, Clear All Data, Firefox and Safari,
  narrow windows) beyond what the items touch.

---

## Appendix A — Review of 2026-10-04: accuracy, effectiveness, blast radius

*Recorded as written on 2026-10-04 (`b83dcb4`). The items above now incorporate it; where this record and an item differ, the item governs.*

At the requester's request ("review MS 73 for accuracy and effectiveness;
assume the problems may be global and determine each one's blast radius"),
six read-only reviews each re-checked a group of items against the code,
asked whether the design would fix the problem on every surface (screen,
PDF, Excel export and import, carry-over, conversion, New Year, dashboard),
and hunted the same class of defect across the whole app. Three more
reviews inventoried the Excel round trip field by field, one per workbook.
They ran the real validators, sidebar rules, PDF models, sanitizers,
formatters, importers and exporters from node, read the Clerk's workbooks
with a parser (cell values, formulas, locking, data validations), and
measured PDF text with the app's own font metrics.

**Every load-bearing claim below was re-checked by hand before it was
written here**: the code lines, the workbook cells with a separate parser,
and three behaviours in a browser (73C, the Escape double-close, and the
reminder path). Claims shown "(needs a browser)" are from code or node
simulation only.

### What the review found, in short

1. **A defect outside the milestone's scope, now fixed.** The import filter
   cut the end off about 1 in 50 stored signature stamps and supporting PDFs
   every time a case file was opened. Fixed first at the requester's choice
   (73U).
2. **The Excel round trip is the largest blast radius** (new item 73T).
   Re-importing a Simplified Accounting's own workbook blanks Guardian #1's
   name; every Annual or Simplified import scrambles the attorney's and the
   certificate's signature choices; the Annual writes Part VIII's answers
   beside the Clerk's boxes, not in them; and a dozen fields are lost or
   altered on the way back.
3. **Five designs would not have worked as written**: 73A (the guardian
   "/s/" rule), 73E (one confirmation over importers that write as they
   read), 73F Step 1 (the dashboard never has an open filing), 73G-3 (a kept
   negative is shown, and re-saved, as positive), and 73L step 1 (it would
   have replaced a newer, tested rule).
4. **Most items reach further than the browser test saw.** The shortened
   court wording is on six forms, not one; the stale-page pattern has three
   more cases; the "answers never given" pattern continues through the
   Inventory's Excel export and import; the complete sidebar-versus-export
   inventory has five more defect classes.
5. **Five settled decisions are re-asked** because their basis or cost
   changed (listed under "Decisions raised by the review").

### Item by item

| Item | Accuracy corrections | Design gaps (now in the item's revision) | Same defect elsewhere (blast radius) |
| --- | --- | --- | --- |
| 73A | The "workflow that explicitly requires it" quote is `MILESTONE-ARCHIVE.md` near 3798. **All three workbooks** pre-print "/s/" in both attorney cells (Annual `PART IV, V`!B31 and `PART X`!B25; Inventory `PART IV`!B26 and `PART VI`!B27; Simplified B17 and B41). The bare-"/s/" list also includes the Simplified's Part V attorney and the Inventory's unnamed D-1 guardian; "Plans' preparer" exists only on the Plan for Minors | Step 1 kept "a blank choice with a date is /s/", which contradicts the guardian rule (every screen pre-selects "/s/" once a guardian types a date). The control, validator and engine are role-blind. On the Plans one certificate field serves guardian and attorney, so the signer can flip after a one-time migration. A Stamp with no image prints "/s/". New Year keeps last year's stamp on every signer. A per-block marker is dropped by every Excel import. "Listed as missing" needs `completion.js`, `readiness-config.js` and the Plans' co-guardian validators. "Use my saved signature" isn't offered on certificate blocks a guardian signs | Every "/s/" path is the one engine branch; the extra instances are the stamp-without-image, New Year and the Plans' signer flip |
| 73B | B-4's `liabilityType:'Loan'` was missed; C-4's trust type is a pre-filled text box, not a dropdown. The Inventory's selects have no "— select —" option, so the checklist's UI line was wrong | The Inventory's Excel export writes "Mortgage", "Loan", "Monthly", "Pooled" for a blank (`excel.js` near 222, 314, 334, 424) and the import puts them back (near 712–736), so 73B-4 alone would make the PDF and workbook disagree. A blank G8 must import blank. 73B-2's warning needs `output-preflight.js` | Annual Part IX prints "None" for a blank receipt date; an unanswered Annual Plan Q11 prints the sworn "I have received the monies…" sentence; every PDF prints "Ward" for a blank ward name after an override |
| 73C | 51H fixed only the second click; the Inventory's one-draw exception is `904c523` | The Plans' clean-up must re-index `guardianPartyIds` (today removing a middle guardian shifts the next one onto the removed guardian's shared record) and must always keep row 0. `filing-registry.spec.js` near 130 pins today's dropping | Inventory D-1: a new co-guardian card also vanishes at the next redraw if it holds only a signature choice (needs a browser) |
| 73D | Also overwritten when leaving Make or Model (`index.js` near 317–328). Validation doesn't read the vehicle description; conversion does, into the Annual's **D-3** | The built description must live in core (conversion can't import a feature module); the safe-deposit exclusion must reach `totals.js` and the workbook (column H written blank for a vehicle, or the workbook's own formula counts it) | On the Initial, Annual and Minors Plans, about 20 "Explanation" boxes are hidden when Other or None is unticked but **still print** |
| 73E | The Simplified also writes type of guardianship, GID, county, amended and the guardians' details before its question. The "Import complete" message is written by each importer, not `input-hardening.js`. **Only 5 of 20 specs that import accept dialogs** | The Annual writes into the live filing about 70 times and calls `setAccountingFilingType()` mid-import: a Trust or Final filled from the Clerk's blank workbook (H4 = "Annual") silently becomes an Annual. The whole-filing title-casing and filtering passes must be limited to imported values. Imports bypass the shared-record layer | After an import, editing one field of a linked guardian restores the shared record's old name and address (node-confirmed); Link Person overwrites typed fields with blanks; Merge doesn't say which open filings change |
| 73F | The dashboard never has an open filing (`leave-filing.js` near 42), so Step 1's dashboard clause changed nothing. Export uses `checkSignatureState()`. The golden has 5,003 rows. The Simplified Plan asks no SSN. "Milestone 38", not 38D | Step 1 alone leaves the dashboard sidebar-only, so a filing can read 100% there and drop when opened. Moving the seven validators to modules loaded at startup is a moderate job (about 1,120 lines), not large, and closes it everywhere. 73F-3 needs impossible-date drafts cleared when a row is removed (never built; an orphaned draft would become an unclearable block) | Five more classes: the "no items" tick isn't cleared by "+ Add" (about 890 variants per Annual-family form); a blank row from "+ Add" marks the page incomplete naming nothing; Part VIII's other cases; the Initial Plan's Q7 benefits question is sidebar-only; the Plan Annual attorney's signature isn't checked by the sidebar. Plus about 30 asterisk mismatches (e.g. the Annual's Starting Balance and Schedule A Amount are enforced but not starred) |
| 73G | "Schedule E works the same way": a positive transfer out changes only Schedule E's own total. The negatives clamp runs from three mounts **on every page drawn**, also zeroes Part XI amounts, and turns "1,234.56" into 1. **All three workbooks tell filers any amount may be negative**: "Enter all amounts … e.g., 2500.50 or -2500.50 … ($2,500.50)" (Annual `PART I`!C11, Simplified `PARTS I, II `!C9, Inventory `SUMMARY I `!C15) | 73G-3's "keep and warn" can't work as written: the box shows a stored −50 as 50, and tabbing through it stores +50. A typed "(" is removed on the keystroke. The Simplified's remuneration Amount is a free-text box: "$1,234.56" files as $0.00 and "1,234.56" as $1.00. Stopping the clamp changes Line 30, the bond requirement and possibly the audit-fee tier for affected filings (toward the template) | Text-cell amounts in the importers are truncated or zeroed; paste "1.000,50" files as $1.00 |
| 73H | "Every amount cell" is the dominant format, not all: Schedule C's loss column shows red with no sign, and a few columns use −$x. The Inventory Summary screen shows liabilities as positive while its PDF and workbook negate them | Part VI must format the **negated** value, as the workbook does (`H13 =-…`), or disbursements lose their "subtracted" cue. Don't change the importer's date normaliser. A blank Q11 must print blank, not $0.00 | The Simplified correctly keeps disbursements positive (its workbook does); not to be harmonised |
| 73I | 0–3 days early for month-end periods; **16–32 days** for a period ending mid-month. The Final's 90 days has the work slip's (lowest) basis. **§744.511 was missed**: a removed guardian's final report is due within 20 days | No Design section; the formula must be "first day of Period To's month plus four months". The dashboard must draw the Final's basis text (today it is blanked) | April 1 falls on a weekend in 2028 and 2029 |
| 73J | Row 4 is a link that reads as a to-do, not stale content | A shared "redraw this region when these fields change" helper on the existing `pg:field-written` event, instead of five patches. `check:types` (router) | The cover's "Why is this guardian filing without an attorney?" stays after an attorney is typed; B-4's bank-account dropdowns keep old names; the sidebar header also goes stale after Link Person and Sync |
| 73K | Add, Remove and Duplicate redraw through `navigate()` to the same page too | Save the position before the old page is cleared; exempt Preview; keyboard focus is lost the same way (the cursor falls to the top of the document) | Background redraws (supporting-document checks, Sync) redraw the page the filer is typing on |
| 73L | **The reminder rule changed in `0598150` (2026-09-27)**: after "Not now" it waits until the filer next arrives at the page, and a guard stops it stacking; tested by `schedule-doc-ack.spec.ts`. Design step 1 would have replaced it | A queue must cover pop-ups only (the fixed form dialogs await pop-ups while open). The background-tab stall may be a test-tool artifact (frames resume on return; needs a browser) | **One Escape closes two dialogs** (reproduced in a browser: a notice over Add Form, one Escape, both gone). The eligibility dialog also stays behind two other notices. **A dialog stays visible and clickable over the lock screen**, showing names (code-confirmed: dialogs at layer 10010, the unlock screen at 10000, and locking doesn't close them) |
| 73M | "Bond and depository" returns as "Bond only" only into a filing whose answer is blank. The Annual's Part IX has the same guess. The Part XI explanation is reachable on the Preview page; the tooltip gives the wrong reason | The guess fix must be limited to imports (the same function migrates old saved files). Several items each add a Save as Excel note: one list per form of "what this workbook won't carry" should feed Preview and 73E's notice. Making Save as Excel clickable changes 18 specs that wait for it | Save as Excel can look enabled and do nothing after an override; bond fields hidden by the chosen answer are still written to the workbook |
| 73N | Q8 is about 625pt in a **468pt** column: it runs into the margin and off the paper. The attorney's name **does** print, in the certificate | Wrapping must cover every one-line title (eight kinds), with space checks using the wrapped height | **Court wording is shortened on six forms**: the Annual family's declaration drops the investigatory-fees certification; its receipts certification drops the §744.3678(3) inspection clause; the attorney statement drops "I have not audited the accompanying guardianship accounting" (Annual family and Simplified); the Annual and Initial Plans drop clauses from certifications, Q2 and Q10; the Initial Plan prints Q11 between 10D and 10E. Fixed text otherwise fits; typed text (a long ward name in the caption, a long B-4 account title) can overflow |
| 73O | The banner has three wordings, not four. The Annual Plan and Plan for Minors have the same unlinked guardian-name pattern as the Initial Plan. No Plan binds guardian names, so 73O-2's "one field each" had no precedent for guardians. **The Simplified has a hidden recipient line 4** that prints on the PDF but has no box on screen | 73O-3 touches all three accountings (and the Plans if included), the shared factory, five conversions and three goldens. 73O-2's merge makes the attorney "started" on filings whose Cover alone named one, so the certification becomes required (visible) | Link Person and Link to Case show "O&#39;Brien" for apostrophe names |
| 73P | — | — | The Simplified's Part VI stars Recipient 3's name with no rule behind it |
| 73Q | — | — | **The guide misstates protection:** it says only the last four SSN digits print or export, but Excel writes the full SSN/EIN (§8.6). It also says Comments don't print (they do), that 0 is allowed as a share (A-1 rejects it), and that the fee is from "total assets". The guided tour says the Simplified has no Excel output |
| 73R | — | "Full width" at high resolution would need about 1.4 GB of canvas for a 19-page Inventory: the design needs a scale cap or lazy page rendering. Keeping notes across a zoom needs a new save step. Eight more specs use the save-controls toggle | — |
| 73S | — | The covers say "Fields marked with an asterisk (*) are required before export", which a never-blocking star would make false. The UCN box is drawn by five helpers. The Plan for Minors identifies by UCN first on the dashboard and in file names. The shape check must strip separators and not require "GA" or "XXGD" | — |

### New items

- **73T — The Excel round trip, field by field.** See the item below.
- **73U — Stored stamps and PDFs cut by the import filter.** Fixed
  2026-10-04; see the item below.

### Decisions raised by the review (the requester, 2026-10-04)

Asked as choices. "Practice" marks Pinellas Clerk practice (AGENTS.md §4
and §5). Each item's "Revised after the review" section gives the options.

**Re-asked because the basis or cost changed — these supersede the earlier
answers:**

| Question | Answer |
| --- | --- |
| Minus signs in amount boxes (73G-N1; supersedes 73G-3) | **Accepted in every amount box**, as all three workbooks instruct ("e.g., 2500.50 or -2500.50"), with a non-blocking note where a negative is unusual (a negative asset or income). Screen, PDF and workbook agree. Filings that hold a negative D-1–D-4 or Part II amount change Line 30 (or the Simplified's Line 8), the bond requirement and possibly the fee tier — toward the workbook, which zeroes nothing |
| The Plans' "For the period" (73I-N3; supersedes 73I-3) | **The coming plan year**, following §744.367(1) ("must cover the coming fiscal year") and §744.3675, on the Annual and Minors Plans. The due date is 90 days after the end of the anniversary month — the month that ends the day before Period From — or April 1 when the period starts January 1. The covers say which year to enter. The Simplified Plan's form looks back and has no period of its own; it keeps today's count. Practice |
| Guardian names on the Initial, Annual and Minors Plans (73O-N1; supersedes 73O-2 for guardians) | **The cover keeps its list**, with a warning when a signer isn't among it, as 72A does for the Inventory. The Initial Plan's attorney still becomes one field |
| The dashboard and the single rule list (73F-N1; supersedes 73F-9) | **One rule everywhere**: the seven export checks move to modules loaded at startup, and the dashboard's percentage and "Ready to file", the sidebar and Print Preview all use it, for every filing, open or not |
| The supporting-documents reminder after "Not now" (73L) | Not a decision: the design is corrected to keep the existing, tested rule (`0598150`) |

**Needing the requester's named approval or Clerk practice:**

| Question | Answer |
| --- | --- |
| A blank or unrecognised county after "Continue despite…" (73F-N2) | **Departs from the recommendation: it can still be overridden, as today.** After an override the PDF prints with no court heading. 73F-2's check (a Florida county) is otherwise as decided, and stays overridable like other required fields |
| The Plan for Minors' identity (73S-N2) | **The Case # first.** The requester's named approval to change AGENTS.md §6's rule ("Plan Minor always falls back `ward.ucn \|\| ward.ref \|\| ''`") to `ref` first; the edit is made with 73S |
| The Clerk's Schedule B-4 subtotal formula (73T-1) | **Corrected in the embedded workbook**, with the requester's named approval as the Clerk's representative (AGENTS.md §5), so the filed workbook and the PDF agree; the office is told so its published copy is fixed too |
| Annual Part XI's blank lines (73T-2) | **Each remuneration entry is written on its own Part XI line**, as the Simplified does on its Part VII, so a filing with remuneration can be saved as Excel. This retires Milestone 58D's Excel block for Part XI and the AGENTS.md and code comments that describe the sheet as having nothing to fill in. Practice |
| Weekend and holiday due dates (73I-N1) | **The computed date, with a note** when it falls on a weekend or legal holiday: "check whether the next business day applies (Rule 2.514)". No legal reading is asserted |

**Every other decision the review raised: the recommended option** (the
requester, "take the recommendations"): 73A-N1 (filings already filed keep
their "/s/"), 73A-N2 (New Year clears every signer's choice and stamp),
73A-N3 (a Stamp never applied prints a blank line), 73B-N1 (the Inventory's
liability type, payment frequency and trust type are required on a started
row), 73B-N2 (the unanswered Q11 and Part IX's "None" are fixed here), 73C-N1
(Inventory D-1 keeps a blank card until the filer leaves the page), 73D-N1
(hidden Plan "Explanation" text is kept and not printed), 73E-N1 (an imported
person stays linked only when the workbook names the same person), 73E-N2 (a
filing keeps its type on import), 73E-N3 (Link Person fills only blanks and
asks first; Merge names the filings it changes), 73F-N3 (common county
spellings are corrected to the official name), 73F-N4 (the Initial Plan's Q7
is kept and named on its page), 73F-N5 (Next follows each form's existing
rule, once draft clean-up is built), 73G-N2 (the Simplified's remuneration
Amount becomes a real amount box), 73I-N2 (the Plans count from the last day
of the anniversary month), 73K-N1 (a new entry scrolls into view and takes
the cursor), 73M-N1 (the workbook's bond block shows only what the chosen
arrangement shows), 73N-N1 (court wording is restored on every form, with a
text-parity test), 73O-N2 (the Plans' certificates get the fourth address
line too), 73S-N1 (the UCN keeps its star and the covers' sentence is
amended), 73T-3 (quotation marks survive an import).

---

## Appendix B — Independent review (Codex, 2026-10-05)

Verdict as received: *the defect research is strong and most findings hold,
but don't approve it as one package yet*: contradictory final behaviour,
unresolved designs, and oversized deliveries. Every point was checked against
the code and this document before anything changed.

| # | Codex's point | Checked | What changed |
| --- | --- | --- | --- |
| 1 | **73F conflates "ready to file" with "finished the form".** A two-way parity test contradicts the intentional sidebar-only prompts. Use blockers, advisories and completion prompts; the invariant is one-way (a ✓ never hides a blocker); "Ready to file" should use blockers only | **Confirmed.** The design asked the screens to "agree in both directions" while keeping the prompts AGENTS.md §4 intends | The three-kind model and the one-way invariant adopted (73F, "The model"). **"Ready to file" was put to the requester, who kept today's meaning — every page ✓, 100%** — so it implies no blockers and also waits for the prompts |
| 2 | **73A contradicts its decision on filed signatures**, and one filing-level flag can't describe a multi-year filing; `switchWardYear()` bypasses the normalizer | **Confirmed.** The design said a guardian's "/s/" never prints; 73A-N1 keeps it on filed filings. `switchWardYear()` copies the snapshot in through `applyYearData()` with no open-time normalizer (`filing-years.js` near 256–271) | A signature policy on each year snapshot, with the behaviour for the current year, closed filings, archived years, New Year and Excel import stated (73A design step 3). The requester decided a reopened filing is asked again |
| 3 | **73E can change other filings without adequate confirmation**; name containment is not identity; the import should be a transaction | **Confirmed.** 73E-N1 named the other filings only after the import; `import-keep.js` near 19 matches people by one name containing the other | The seven-step transaction adopted (73E part 1). Re-asked: the confirmation lists linked people and the filings sharing them first, and the filer chooses for each; "the same person" is an exact name ignoring case, spaces and punctuation, a near match asked |
| 4 | **73T's carry list can't express the catalogued cases**; workbook safety isn't just "target is unlocked" | **Confirmed.** Rows 1–19 need several cells per field, combined fields, formula cells, fallbacks, capacity, and "keep when absent" | A typed workbook contract (73T part 1); the checks keep the existing caption, merge and formula checks and the read-back of the exported file, and add the unlocked-cell check |
| 5 | **73R is undesigned** (memory, annotations) | **Confirmed.** Every page renders eagerly at 1.5 (`pdf-preview.js` near 231–260); the revision named the problems without choosing | Lazy rendering, a pixel cap, cancellation, annotation save and restore, and an acceptance test with the 19-page Inventory at 2,560px (73R part 3) |
| 6 | **Consolidate**: superseded designs sit above their replacements; the file manifest and the summary are stale | **Confirmed.** 73A's manifest row listed two files; 73S's still listed `county-guidance.js`; the summary said "one to three days early" | This revision: one final specification per item; history in Appendices A and C; the pre-consolidation text in git at `b83dcb4` |

**Opportunities Codex raised, and what became of them:**

| Opportunity | Checked | Outcome |
| --- | --- | --- |
| A pure validation registry | Already the decided direction (73F-N1) | 73F part 1, registered by engine id |
| One description per repeating list | **Confirmed**: the shifted-link defect is in three places (`plan-rows.js`, Inventory `normalizeGuardians()`, the Annual importer) | **New item 73V**, a foundation (the requester, 2026-10-05) |
| A model-change event from every committed mutation | **Confirmed**: `pg:field-written` is fired only by the typed field write (`form-contract.js` near 381) | 73J part 1 |
| An explicit reason for each page draw | **Confirmed**: `renderPage(page)` takes no reason (`router.js` near 134) | 73K part 1, with a logical focus target |
| Amounts as a codec, not a formatter | Agreed | 73G part 1 (parse, store, display, present; sign meanings in view models) |
| Split the largest deliveries | Agreed | **Split** (the requester, 2026-10-05): 73E 2 parts, 73F 3, 73J 2, 73K 2, 73G 2, 73N 3, 73O 4, 73R 3, 73T 4 |

**Assumptions Codex checked:** the statutory premise of 73I (§744.367's
coming plan year and first-of-the-fourth-month rule; §§744.527 and 744.511
for final reports) — agreed. The stale "one to three days early" in the
summary — corrected.

### Second round (Codex, 2026-10-05, on the consolidated text)

Verdict as received: *the consolidated proposal genuinely resolves the six
earlier findings*; the per-year signature rule, the import transaction, the
one-way completeness rule, the workbook contract and the bounded preview are
coherent. Not yet 73V: its boundary was ambiguous. Every finding was checked:

| # | Codex's finding | Checked | What changed |
| --- | --- | --- | --- |
| 1 | 73V's "stable row identity" conflicts with "no data model change" unless it is transient | **Confirmed**: the text didn't say whether the identity is stored | Identity is a `WeakMap` keyed by the row object: never saved, exported, counted as data or copied on duplicate (73V step 4) |
| 2 | 73V would switch on behaviour that belongs to 73P, 73F and 73K | **Confirmed** | 73V is behaviour-preserving plus the link fix; the confirmation, "no items" and cursor policies stay inactive until their deliveries (73V scope) |
| 3 | Descriptions must be keyed by filing type and list, with no generic fallback | **Confirmed**: `SCHEDULE_SCHEMAS` is keyed by list alone (`schedule-definitions.js` near 6); the Plans pick factories and maximums by type (`src/core/form/plan-row-actions.js` — Codex's path under `src/features/plans/` doesn't exist; the substance holds) | Keyed by (filing type, list key) (73V step 1) |
| 4 | A test over "every registered list" can't find an unregistered one | **Confirmed** | An explicit expected inventory written in the test, and every action throws on a missing description (73V step 5, tests) |
| 5 | "Legacy: none" is too broad for links already shifted | **Confirmed**: shifted links in saved files can't be told from intended ones | 73V prevents future shifts only; existing links stay, visible in the shared-records list (each record's filings and slots, `party-management.js` near 50–57) for manual correction (73V step 7) |
| 6 | 73E part 1 used 73T's contract while 73T depended on 73E | **Confirmed**: a circular dependency in the text | Codex's recommended arrangement: 73E part 1 is a workbook-independent engine fed by adapters, tested with synthetic ones, no importer connected; 73T part 1 supplies the contract and 73T parts 2–4 connect each importer (and carry the per-form Cancel tests) |
| 7 | 73F part 1 needs a compatibility contract, and issues must keep which outputs they block | **Confirmed**: issues carry capabilities (`issue-registry.js`: supporting-document problems block Preview, Print and PDF only; Excel capacity blocks Excel only) | `evaluate<Engine>()` returns the three kinds with each issue's capabilities intact; `validate<Engine>()` stays as an unchanged wrapper until part 2 moves its callers; a wrapper-equivalence test |

Codex said that after this revision 73V would be a reasonable first approval
candidate — but only scoped as a behaviour-preserving foundation plus
prevention of future linked-id shifting, which is how it now reads.

### Third round (Codex, 2026-10-05)

Verdict as received: *the seven findings are substantively addressed and
73V's specification is now sound*, but three document errors introduced in
`b3d4726` had to be corrected first. All three were checked and held:

| # | Codex's finding | Checked | What changed |
| --- | --- | --- | --- |
| 1 | The opening summary table was corrupted: rows 1, 5–7 and 10–12 held build-order entries | **Confirmed — my error**: the script meant for the build-order table matched the first table in the file | Those rows restored from `e00c368`; the summary table is byte-identical to that version's |
| 2 | The build-order table was never updated, so it still gave 73E part 1 the real import tests | **Confirmed**, the same error | Rows 1, 5–7 and 10–12 of the build order now carry the revised entries; the per-form import tests sit in 73T parts 2–4 |
| 3 | 73V's manifest omitted the direct users of the registry it replaces | **Confirmed**: four tests import `schedule-definitions.js` directly | An explicit compatibility layer (73V step 6): the three row actions keep their signatures and resolve by the filing's type; `SCHEDULE_SCHEMAS` stays as a deprecated, read-only export. `schedule-definitions.spec.js` and `output-revision-wiring.spec.js` change (their sample filings gain a filing type); `types-contract.spec.js` and `remuneration-declaration.spec.js` don't. The two source callers keep the same calls |

Codex recommended approving 73V by name after these corrections, with exactly
its current scope: a behaviour-preserving consolidation plus prevention of
future guardian-link shifting.

---

## Appendix C — Decisions as asked

Every decision, with the options as they were put to the requester. Answers that were later re-asked are marked where they were superseded; the items above state the final answers.

### The first round (2026-10-04)

Asked as choices. "Practice" marks an answer about what the Pinellas Clerk's
office accepts (AGENTS.md §4 and §5).

| Question | Answer |
| --- | --- |
| Every decision not listed below (41 of 49) | **The recommended option**, as written in each item. Three were re-asked after the review and superseded: 73F-9, 73G-3, and 73O-2 for guardian names (see [the review's decisions](#decisions-raised-by-the-review-the-requester-2026-10-04)) |
| Who may sign with "/s/" (73A; the question flagged for a qualified person) | **Departs from the recommendation.** Guardians no longer choose "/s/" Signed **wherever a guardian signs**: their own signature block on all nine forms, and the certificate of service when a guardian signs it (71B). They choose Unsigned (a blank line for wet ink) or a Signature Stamp. Attorneys and outside preparers keep "/s/". The basis is the Clerk's workbook: *"Only the guardian's signature must be original"* and *"The attorney may use an electronic signature "/s/""*. Practice; still recorded for a qualified person's review |
| Saved filings where a guardian already chose "/s/" (73A) | **Asked again, visibly:** the choice shows as not made and is listed as missing until the guardian picks Unsigned or a Signature Stamp. Nothing changes unseen |
| The remuneration Amount (73F-7; flagged for a qualified person) | Required on both the Annual and the Simplified once a row is entered. Whether §744.367(3)(a) needs the amount stays recorded for review |
| Blank Inventory schedules (73F-4) | The office accepts them as it does Annual schedules: the Inventory's sidebar prompts, and export no longer demands an entry or the "no items" tick. Practice |
| An annual accounting's due date (73I-1) | The first day of the fourth month after Period To (April 1 for a calendar year), as §744.367(2) and the workbook say. Practice confirmed |
| The Plans' "For the period" (73I-3) | ~~The year just ended.~~ **Superseded after the review (73I-N3): the coming plan year**, following §744.367(1) |
| The trust accounting's signer when the trustee is not the guardian (73O-5) | The guardian, as today. Practice |
| The trust accounting's PDF title (73O-5) | Kept: "TRUST GUARDIANSHIP ACCOUNTING" |
| What "required" means for the UCN (73S-1) | **Departs from the recommendation:** starred, with a reminder in Preview's "Review recommended" box when blank. It never blocks |
| Which counties (73S-2) | **Departs from the recommendation:** every county. Because it never blocks, no filer anywhere is stopped by it |
| The Plan for Minors (73S-3) | The same rule as the other forms: the UCN as above, and the Case # always required |

### Each item's decisions, with their options

#### 73A

*Settled 2026-10-04: the recommended option for each, except where the [Decisions](#decisions-the-requester-2026-10-04) table says otherwise.*

- **73A-1. What Unsigned prints.** (1) *Recommended:* a blank line for wet
  ink, as the guide says and the "original signatures" sentences expect.
  (2) Keep "/s/" and correct the guide.
- **73A-2. An Unsigned block with a typed date.** (1) *Recommended:* print
  the date as entered; nothing the filer typed is dropped. (2) Leave the date
  line blank for dating by hand.
- **73A-3. The Simplified workbook's pre-printed "/s/".** (1) *Recommended:*
  leave it; it is the Clerk's text. (2) Blank those two cells when the
  attorney's block is Unsigned. This writes over the Clerk's template text.
- **For a qualified person:** whether a non-attorney guardian may sign with
  "/s/" and the Rule 2.515 caption at all, given the workbook's *"Only the
  guardian's signature must be original."*

**Decided 2026-10-04:** 73A-1, 73A-2 and 73A-3 as recommended. On the
qualified person's question, the requester decided, as Pinellas Clerk
practice, that guardians no longer sign with "/s/" (design steps 6 and 7);
the question stays recorded for review.

Raised by the review:

- **Decisions raised:**
  - **73A-N1. A filing already filed** (marked closed, or an earlier year)
    where a guardian used "/s/". (1) *Recommended:* left as filed; no re-ask,
    and a reprint matches the filed copy. (2) Asked again there too; a reprint
    shows a blank line where the filed copy had "/s/".
  - **73A-N2. New Year and last year's Signature Stamp.** (1) *Recommended:*
    New Year clears every signer's choice and stamp, as it already does for
    certificates; the guardian re-applies with "Use my saved signature".
    (2) Keep it; the new year's filing prints last year's stamp unless someone
    notices.
  - **73A-N3. A Stamp chosen but never applied, after "Continue despite…".**
    (1) *Recommended:* a blank line for every role. (2) Attorneys and
    preparers print "/s/"; guardians get the blank line.

#### 73B

*Settled 2026-10-04: the recommended option for each, except where the [Decisions](#decisions-the-requester-2026-10-04) table says otherwise.*

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

Raised by the review:

- **Decisions raised:**
  - **73B-N1. The Inventory's liability Type (A-2, B-4), payment Frequency
    (C-1) and Type of Trust (C-4), once they start blank.** (1)
    *Recommended:* required on a started row; they are already starred and
    the workbook's instructions say "Indicate…". A skipped one is listed and
    can be passed at Preview. (2) Optional, with the asterisks removed.
  - **73B-N2. Same-class findings added to this item:** an unanswered Annual
    Plan Q11 prints the sworn "I have received the monies … from …" sentence;
    Part IX's "None". (1) *Recommended:* fix both here. (2) Record them only.
    (Also found, recorded only: every PDF prints "Ward" for a blank ward name
    after an override; a blank B-4 related property prints "Unsecured".)

#### 73C

Raised by the review:

- **Decision raised:**
  - **73C-N1. Inventory D-1's new co-guardian card** disappears at the next
    redraw when all it holds is a signature choice (from the code; needs a
    browser). (1) *Recommended:* the Plans' model — a blank card stays until
    the filer leaves the page. (2) Leave it.

#### 73D

*Settled 2026-10-04: the recommended option for each, except where the [Decisions](#decisions-the-requester-2026-10-04) table says otherwise.*

- **73D-1.** After unticking, the filer sees: (1) *Recommended:* their
  original Description. (2) The vehicle text, as today.
- **73D-2.** A vehicle's safe-deposit answer: (1) *Recommended:* hidden and
  kept. (2) Cleared, as today.

Raised by the review:

- **Decision raised:**
  - **73D-N1. Hidden "Explanation" text that still prints on three Plans.**
    About 20 "Explanation" boxes on the Initial, Annual and Minors Plans are
    hidden when Other or None is unticked but still print
    (`field-html.js` near 130–135; `plan-initial/pdf-model.js` near 110,
    `plan-annual` near 53, `plan-minor` near 71). A filer who ticks None files
    "None" plus "Explanation: …". (1) *Recommended:* extend this item's rule
    to them — hidden, kept, not printed — as the Simplified Plan already does.
    (2) A separate item later.

#### 73E

*Settled 2026-10-04: the recommended option for each, except where the [Decisions](#decisions-the-requester-2026-10-04) table says otherwise.*

- **73E-1. The confirmation.** (1) *Recommended:* as in step 2, plus the
  after-import notice. (2) A confirmation only when the ward names differ.

Raised by the review:

- **Decisions raised:**
  - **73E-N1. Imported people linked to shared records.** Today, after an
    import, correcting one detail of a linked guardian puts back that
    guardian's old name, SSN and address. (1) *Recommended:* when the
    workbook names the same person, keep the link and update the shared
    record (the notice lists the other filings that change); when it names a
    different person, unlink that slot, and the notice says so. (2) Unlink
    every imported person; the filer re-links with Link Person.
  - **73E-N2. The workbook's Filing Type box** (Annual family). Today a Trust
    or Final Accounting filled from the Clerk's blank workbook silently
    becomes an Annual. (1) *Recommended:* the filing keeps its type, and the
    confirmation says when the workbook is marked differently. (2) The import
    changes the type, and the confirmation says so.
  - **73E-N3. Link Person and Merge** (found beside imports). Link Person
    overwrites every typed field in the slot with the shared record's,
    blanks included, so a typed SSN or phone is wiped; Merge doesn't say
    which open filings' details will change. (1) *Recommended:* fix both
    here — Link Person fills only blanks and asks before overwriting typed
    values; Merge names the filings. (2) Record them only.

#### 73F

*Settled 2026-10-04: the recommended option for each, except where the [Decisions](#decisions-the-requester-2026-10-04) table says otherwise.*

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

Raised by the review:

- **Decisions raised:**
  - **73F-N1. The dashboard** (73F-9 re-asked: the full rule list is a
    moderate job and the only way the dashboard agrees). (1)
    *Recommended:* the dashboard's percentage and "Ready to file" use the same
    rule as Preview, for every filing. (2) As first proposed: a filing can
    read "Ready to file" on the dashboard and drop below 100% when opened.
  - **73F-N2. A blank or unrecognised county after "Continue despite…".**
    (1) *Recommended:* it can't be passed, and the panel says why — this adds
    to AGENTS.md §4's list of issues that can't be overridden, so it needs the
    requester's named approval. (2) It can be passed; the PDF prints with no
    court heading.
  - **73F-N3. County spellings.** (1) *Recommended:* common variants are
    corrected to the official name ("St Lucie" → "St. Lucie", "Miami Dade" →
    "Miami-Dade", "De Soto" → "DeSoto", "Pinellas County" → "Pinellas").
    (2) They block as misspellings.
  - **73F-N4. The Initial Plan's Q7 (benefits).** (1) *Recommended:* keep
    asking, and name it on the page as the Annual Plan's 3G is. (2) Stop
    asking, matching export.
  - **73F-N5. Next on pages newly marked incomplete.** (1) *Recommended:*
    follow each form's existing rule (disabled on most pages; never on the
    Inventory's Cover and D-1 to D-5 or the Plans' certificates), once draft
    clean-up is built. (2) Explain only; never disable Next for an
    export-only issue.

#### 73G

*Settled 2026-10-04: the recommended option for each, except where the [Decisions](#decisions-the-requester-2026-10-04) table says otherwise.*

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

Raised by the review:

- **Decisions raised:**
  - **73G-N1 (73G-3 re-asked: the workbooks invite negatives everywhere,
    and "keep and warn" costs more).** (1) *Recommended:* accept a minus in
    every amount box, as the workbooks instruct, with a non-blocking note
    where a negative is unusual (a negative asset or income); screen, PDF and
    workbook agree. (2) Keep the decided option, with the display fixes: an
    imported −200 stays, but a minus can't be typed, and editing that box
    drops it with a note.
  - **73G-N2. The Simplified's remuneration Amount.** (1) *Recommended:* a
    real amount box; saved text is converted when the filing opens, and
    anything unreadable is kept and flagged. (2) Leave it as text, validated.

#### 73H

*Settled 2026-10-04: the recommended option for each, except where the [Decisions](#decisions-the-requester-2026-10-04) table says otherwise.*

- **73H-1. Negative amounts.** (1) *Recommended:* ($5,000.00) everywhere,
  the Clerk's workbook format. (2) Keep each surface's style and fix only
  the broken cases.
- **73H-2. A blank date on the PDF.** (1) *Recommended:* a blank underline,
  as on the paper forms. (2) "[date]". (3) "—".

#### 73I

*Settled 2026-10-04: the recommended option for each, except where the [Decisions](#decisions-the-requester-2026-10-04) table says otherwise.*

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

Raised by the review:

- **Decisions raised:**
  - **73I-N1. Weekend and holiday due dates** (April 1 falls on a Saturday
    in 2028 and a Sunday in 2029; Probate Rule 5.042(a) applies Rule 2.514).
    (1) *Recommended:* show the computed date, and when it falls on a weekend
    or legal holiday add "check whether the next business day applies (Rule
    2.514)". (2) Move it to the next business day, which needs a holiday
    table and asserts a legal reading.
  - **73I-N2. The Plans' 90 days.** (1) *Recommended:* count from the last
    day of Period To's month, as the statute counts "after the last day of
    the anniversary month". (2) Count from Period To exactly as entered.
  - **73I-N3 (73I-3 re-asked).** §744.367(1): the plan "must cover the coming
    fiscal year, ending on the last day in such anniversary month"; §744.3675:
    it "updates information" and says how needs "are proposed to be met in the
    coming year", and the Annual and Minors Plan forms "propose". The
    Simplified Plan's form looks back ("preceding year") and has no period
    field of its own. (1) *Recommended, following the statute:* on the Annual
    and Minors Plans, "For the period" is the coming plan year, and the due
    date is 90 days after the day before Period From. (2) The year just ended,
    as answered earlier: count from Period To.

#### 73K

Raised by the review:

- **Decision raised:**
  - **73K-N1. After "+ Add" or Duplicate.** (1) *Recommended:* the new entry
    scrolls into view if it is off-screen and its first box takes the cursor;
    every other redraw keeps the filer's place. (2) The page stays exactly
    where it was, and the new entry may be below the window.

#### 73L

*Settled 2026-10-04: the recommended option for each, except where the [Decisions](#decisions-the-requester-2026-10-04) table says otherwise.*

- **73L-1. The Help panel.** (1) *Recommended:* push the page over, so
  nothing is covered. (2) Keep it overlaying.

#### 73M

*Settled 2026-10-04: the recommended option for each, except where the [Decisions](#decisions-the-requester-2026-10-04) table says otherwise.*

- **73M-1. A-2 Notes in Excel.** (1) *Recommended:* leave them out of the
  workbook and say so at Save as Excel; don't write into a row the Clerk's
  form doesn't define. (2) Write them into each entry's unused fifth row.
- **73M-2. The Parts VI & VII explanation in Excel.** (1) *Recommended:* a
  warning at Save as Excel that the explanation must be filed separately or
  the PDF used. (2) Steer the filer to the PDF when out of balance, as Part
  XI does. (3) Ask the Clerk for a box.

Raised by the review:

- **Decision raised:**
  - **73M-N1. What the workbook's bond block shows.** (1) *Recommended:* only
    the fields the chosen arrangement shows, as the PDF does; the filing keeps
    the hidden values. (2) As today: everything typed, so a workbook can show
    a waiver date beside a bond.

#### 73N

*Settled 2026-10-04: the recommended option for each, except where the [Decisions](#decisions-the-requester-2026-10-04) table says otherwise.*

- **73N-1. The questions' wording on the PDF.** (1) *Recommended:* the
  original form's full text, parentheticals included. (2) Keep today's
  shortened text.

Raised by the review:

- **Decision raised:**
  - **73N-N1. Court wording on the other forms.** (1) *Recommended:* restore
    the original form's or workbook's wording wherever a question or
    certification prints, with a text-parity test against
    `reference/plan-forms/*.txt` and the workbooks' text. (2) The Simplified
    Plan only, as 73N-1 says.

#### 73O

*Settled 2026-10-04: the recommended option for each, except where the [Decisions](#decisions-the-requester-2026-10-04) table says otherwise.*

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

Raised by the review:

- **Decisions raised:**
  - **73O-N1 (73O-2 re-asked for guardian names).** (1) *Recommended:* the
    attorney becomes one field as decided; guardian names keep the cover list
    and warn when a signer isn't among it (as 72A does for the Inventory), on
    the Initial, Annual and Minors Plans. (2) Build the cover's list from the
    signature blocks.
  - **73O-N2. The fourth address line on the Plans' certificates.** (1)
    *Recommended:* yes, one shape and rule for every certificate. (2) The
    accountings only.

#### 73P

*Settled 2026-10-04: the recommended option for each, except where the [Decisions](#decisions-the-requester-2026-10-04) table says otherwise.*

- **73P-1. Removing a card.** (1) *Recommended:* confirm when the card holds
  anything, as co-guardians already do on most forms. (2) An Undo link
  instead. (3) Leave as is.
- **73P-2. Export All Filings.** (1) *Recommended:* call it "Save case file
  as…" and keep its current behaviour, so the name says what it does.
  (2) Keep the name and stop it becoming the live case file.

#### 73R

*Settled 2026-10-04: the recommended option for each, except where the [Decisions](#decisions-the-requester-2026-10-04) table says otherwise.*

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

#### 73S

*Settled 2026-10-04: the recommended option for each, except where the [Decisions](#decisions-the-requester-2026-10-04) table says otherwise.*

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

**Decided 2026-10-04:** 73S-1 (2), starred with a non-blocking reminder;
73S-2 (3), every county; 73S-3 (1); 73S-4 (1). So:

1. All nine covers star the UCN. A blank UCN adds a reminder to Preview's
   "Review recommended" box ("The UCN is blank. Enter it from the Clerk's
   case record."); it is not a missing item, never blocks, and doesn't
   change the sidebar's ✓.
2. A UCN that isn't in the 20-character shape gets the same kind of
   reminder.
3. The Plan for Minors requires the Case # always, as the other forms do;
   its UCN follows point 1.
4. Save as Excel notes that the Clerk's workbook has no UCN box.

Because the reminder never blocks, applying it in every county doesn't
present one office's practice as a statewide requirement (§5); it is
recorded as the requester's decision.

Raised by the review:

- **Decisions raised:**
  - **73S-N1. How the UCN is marked.** (1) *Recommended:* keep the star,
    amend the covers' sentence ("…required before export; the UCN is starred
    as a reminder and never blocks"), give it a screen-reader description,
    and exempt it from 73F's asterisk sync. (2) A "Recommended" tag instead
    of a star. (3) A star only, leaving the sentence false.
  - **73S-N2. The Plan for Minors' identity** (the dashboard's case-number
    column, judge propagation, the PDF title and file name). (1)
    *Recommended:* the Case # first, now that it is required. This changes
    AGENTS.md §6's rule ("Plan Minor always falls back `ward.ucn || ward.ref`"),
    so it needs the requester's named approval. (2) The UCN first: a Plan for
    Minors with a UCN never matches its sibling filings' "26-001234-GD".

#### 73T

*Settled 2026-10-04: option (1) for all three — 73T-1 with the requester's
named approval as the Clerk's representative.*

- **73T-1. The Clerk's B-4 subtotal formula.** (1) *Recommended:* correct
  it in the embedded workbook, with the requester's named approval as the
  Clerk's representative (AGENTS.md §5), and tell the office so its
  published copy is fixed too. (2) Leave the Clerk's formula and warn at
  Preview when a payment sits on an affected row.
- **73T-2. Part XI's lines.** (1) *Recommended:* write each remuneration
  entry on its own Part XI line, as the Simplified does on its Part VII, so a
  filing with remuneration can be saved as Excel. (2) Keep blocking Save as
  Excel when Part XI has entries.
- **73T-3. Quotation marks in imported text.** (1) *Recommended:* keep `"`
  as typing does (the screens already display typed quotation marks safely);
  keep stripping `<`, `>` and backticks. (2) Keep stripping all four.

### The review's decisions (2026-10-04)

Recorded in [Appendix A](#decisions-raised-by-the-review-the-requester-2026-10-04).

### After Codex's review (the requester, 2026-10-05)

| Question | Answer |
| --- | --- |
| Should "Ready to file" mean only that export would pass? | **No: only at 100%**, as today — against the recommendation (Codex's suggestion) |
| People linked to shared records on import (re-asked 73E-N1) | **List first; the filer chooses** for each person "update the shared record" or "this filing only"; Cancel changes nothing anywhere |
| When is an imported guardian "the same person"? | **The same name ignoring case, spaces and punctuation**; a near match is listed for the filer to keep or clear |
| A closed filing reopened with Mark Open | **Asked again**: the current signature rule applies; archived years stay as filed |
| One description per repeating list | **Built first, as a foundation** (73V) |
| Splitting the largest items | **Split**: each part approved, built, tested and pushed on its own |
| The bond lines' "[date]" under 73H-2 | **Kept as approved in Milestone 67D**; every other blank date gets the underline |
