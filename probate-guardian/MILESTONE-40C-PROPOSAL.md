# Milestone 40C: Validated Browser QA/UX Remediation

## Status

**Draft only — independently approved delivery.** This proposal authorizes
no runtime, data-model, test, or documentation change until the requester
approves Milestone 40C specifically. Approval of another Milestone 40
delivery does not authorize this work.

## Goal

Turn the September 2026 browser re-review into executable tasks: eight
concrete, named fixes across county defaulting, Cover-page labeling, date
entry, readiness/export parity, carryover, and one tri-state validation
bug.

## Resolved Product Decision: County Defaulting

**A ward has no default county until the user selects County on that
ward's first filing Cover.** That first explicit selection is then stored
as `county` on the canonical ward Party record. Later filings linked to
the same ward Party start with that persisted county, while still exposing
it on their own Cover. No global, form-type, Pinellas, case-registry, or
unrelated-source default may precede the first explicit choice. This
decision governs Tasks 40C-A and 40C-F below.

## Cover-Section Audit (All Nine Filing Types)

All nine filing types have a root case-information page and all nine
expose the filing-level `D.county` control there. Six are explicitly
presented as a Cover today; the three full-accounting variants share a
functionally equivalent Part I page that is not currently named Cover.

| Filing type | Current root label | County on root page | Disposition |
| --- | --- | --- | --- |
| Verified Initial Inventory | Cover | Yes | Keep |
| Simplified Annual Accounting | Cover & Part I | Yes | Keep |
| Annual Accounting | Part I - Case Info | Yes | Relabel to **Cover & Part I - Case Info** |
| Final Accounting | Part I - Case Info | Yes, shared Annual engine | Relabel to **Cover & Part I - Case Info** |
| Trust Accounting | Part I - Case Info | Yes, shared Annual engine | Relabel to **Cover & Part I - Case Info** |
| Simplified Annual Plan | Cover | Yes | Keep |
| Annual Guardianship Plan | Cover | Yes | Keep |
| Initial Guardianship Plan | Cover | Yes | Keep |
| Annual Plan - Minors | Cover | Yes | Keep |

The relabeling is UI navigation and heading copy only. It retains the
underlying form's Part I designation and does not rename a persisted
field, change a court-form caption, or claim that a filing is legally
sufficient.

## Task 40C-A — Establish County Once, Then Hydrate It From the Ward Party

1. Change all seven blank-data factories (the Annual factory also serves
   Final and Trust Accounting) so `D.county` starts as `''`, not
   `Pinellas`: `emptyDataGuardian()` in `src/legacy-app.js`, plus
   `emptyDataSimplified()`, `emptyDataPlanSimplified()`,
   `emptyDataPlanAnnual()`, `emptyDataPlanInitial()`,
   `emptyDataPlanMinor()`, and `emptyDataAnnual()` in `src/core/state.js`.
   Remove the separate `attorney_county: 'Pinellas'` default as well; no
   county field may silently acquire Pinellas.
2. Add nullable `county` to the canonical Party shape in
   `src/core/party-resolver.js` and `src/core/types/parties.js`. It has
   meaning only for a Party with the `ward` role. The first nonblank
   County committed on a filing Cover must resolve (or create and link)
   that filing's ward Party without name-based guessing, write the same
   value to `party.county`, and retain the filing's own `D.county`
   snapshot. Implement this through dedicated ward-county lifecycle
   helpers, not by adding County to the general identity hydration
   fan-out: the existing `syncIdentityField()` updates every linked slot,
   which would improperly rewrite historical sibling filings.
3. Later filing creation, conversion, yearly creation, and
   eligibility-modal completion must hydrate `D.county` from the linked
   ward Party when that Party already has a nonblank county. If the Party
   county is blank, the new filing remains blank until its Cover supplies
   the first choice. Remove all Pinellas fallbacks from these flows and
   from both plan/accounting lifecycle implementations (`src/legacy-app.js`
   and `src/core/navigation/ward-lifecycle.js`). Confirmed exhaustively
   (as of this writing — treat as a minimum checklist, not a ceiling,
   since line numbers will shift):
   - `ward-lifecycle.js`, seven `county: src.county || 'Pinellas'` sites:
     lines 84, 115, 132, 156, 201, 231, 256 (one per filing-type
     creation/conversion path).
   - `legacy-app.js`, eight matching `county:src.county||'Pinellas'`
     sites: lines 4369, 4385, 4394, 4411, 4458, 4479, 4494, 4524 (the
     legacy equivalents of the same creation/conversion paths).
   - `legacy-app.js`, two separate `attorney_county` fallbacks not
     currently named anywhere else in this task:
     `dest.attorney_county=src.county||dest.attorney_county||'Pinellas';`
     at lines 6127 and 6209. These silently inject Pinellas into
     `attorney_county` — a distinct field from `county` — whenever both
     the source and destination are blank; they must go the same way as
     the `county` fallbacks even though the field name differs.

   Verify every one of these seventeen confirmed sites is gone, not just
   however many a partial pass happens to catch. Do not use an unrelated
   source filing's county when its ward Party cannot be resolved.
4. A later Cover edit changes that filing's snapshot and the ward Party's
   canonical county for filings created afterward. It must not silently
   rewrite already-existing sibling filings or already-generated output;
   those remain auditable snapshots and may surface the existing
   county-drift advisory. Party merge must never silently choose between
   two different nonblank ward counties: require explicit conflict
   resolution. Keep a linked `caseFile.cases[].county` synchronized when
   the user edits the Cover for that same case, but do not treat a stale
   case record as a stronger default than an explicitly stored ward-Party
   county. Update `src/core/case-county-drift.js` copy/rules so it
   describes the actual snapshot mismatch without claiming the case
   registry is unconditionally authoritative.
5. Preserve an explicitly stored county when loading an existing `.sav`,
   importing an Excel workbook, or restoring a filing. If imported data
   has no county, leave it blank; specifically remove the Pinellas
   fallback in `src/features/simplified-accounting/excel.js` and
   `src/features/annual-accounting/excel.js`.
6. Remove output-only Pinellas substitution from every filing PDF model
   and from shared PDF/DOCX caption helpers. Confirmed exhaustively (as
   of this writing):
   - Shared engines, each with `const county = (metadata.county ||
     'Pinellas').toUpperCase();` — `src/core/pdf/pdf-engine.js:166` and
     `src/core/docx/docx-engine.js:350`. These run for every filing
     type's output, so fixing only the per-feature `pdf-model.js` files
     without these two leaves the shared fallback in place. (If
     Milestone 40A has already removed `docx-engine.js` by the time this
     is implemented, that half is moot — confirm which order actually
     landed rather than assuming.)
   - Seven per-feature `pdf-model.js` files, each with `const county =
     d.county || 'Pinellas';`: `plan-annual/pdf-model.js:14`,
     `annual-accounting/pdf-model.js:35`,
     `guardian-inventory/pdf-model.js:15`,
     `simplified-accounting/pdf-model.js:13`,
     `plan-initial/pdf-model.js:16`, `plan-minor/pdf-model.js:15`,
     `plan-simplified/pdf-model.js:15`.

   A blank county must never print a Pinellas/Sixth Circuit caption.
   Export remains blocked by the existing per-form County validation
   until the user makes a valid choice.
7. Make `src/core/pdf/circuit-lookup.js` and the legacy duplicate return
   an explicitly unknown/blank result for a blank or unrecognized county,
   rather than Sixth Circuit. Two distinct fallbacks confirmed in
   `circuit-lookup.js`, not one:
   - `circuitForCounty()`'s own doc comment currently states "Defaults to
     6 (Sixth Judicial Circuit / Pinellas & Pasco) if empty or
     unrecognized" — this is a real, documented default, not an
     incidental side effect, so removing it needs an explicit decision
     about what an unknown/blank circuit result looks like to every
     caller (a caption helper, a workslip lookup, etc.), not just
     deleting the fallback line.
   - A separate line defaults the *county name itself* before that
     lookup even runs: `circuit-lookup.js:83` —
     `const c = (county || 'Pinellas').trim() || 'Pinellas';`. Fixing
     only the circuit-number default and missing this one still prints
     a Pinellas-derived caption for a blank county.
   - The "legacy duplicate" is `src/legacy-app.js:1432` — the same
     `const c=(county||'Pinellas').trim()||'Pinellas';` pattern,
     confirmed present there too.

   Retain `src/core/filing/county-guidance.js`'s existing exact
   Pinellas/Pasco gating.
8. Update the shared `common,D,county` row in
   `probate-guardian-data-model.csv`: replace the note "Florida county;
   default Pinellas" with "Filing snapshot; first value selected on
   Cover; later new filings hydrate from the linked ward Party." Add the
   exact `caseFile.parties[].county` row as a nullable Florida-county
   enum, applicable to the ward role. Because `caseFile.parties[]`
   currently has only a summary row, this same delivery must expand its
   existing fields (`id`, `roles`, `name`, identifier fields,
   contact/address fields, timestamps, notes, and merge pointer) into
   canonical rows rather than adding another wildcard-only field. Review
   the `annual_accounting,D,attorney_county` row in the same change and
   record its blank initial value. Run `npm run verify:data-model`.

**Legacy migration rule:** existing nonblank filing and attorney counties
remain exactly as stored. For a ward Party with no `county`, infer it only
when all linked filings with a nonblank county agree on one normalized
Florida county; persist that unanimous value. If linked filings conflict,
or none has a county, leave `party.county` blank and require the user to
resolve/select it on a Cover. Never infer it from attorney county, a
filing belonging to another ward Party, or the historical Pinellas
fallback.

## Task 40C-B — Make Every Root Case-Information Page Visibly a Cover

Relabel the shared Annual/Final/Trust sidebar entry, page heading, Summary
entry, tour/help copy, and route metadata from "Part I - Case Info" (or
"Part I - Required Information") to "Cover & Part I - Case Info." Keep the
same `/` route and fields. Verify through all nine filing descriptors that
the root route is visible, named as a Cover, contains the filing-level
County control, and marks County required.

## Task 40C-C — Stop Date-Range Entry From Changing Another Field

Remove `wireDateRangePair()` / `enforceDateRanges()` behavior that
compares displayed `MM/DD/YYYY` strings and overwrites the opposite
endpoint. A user editing From or To must never mutate the other stored or
displayed value. Keep the shared `checkDateOrder()` export/readiness
validation as the one place that reports an end-before-start error. Cover
both a genuinely reversed range and a valid cross-year range such as
05/10/2026 through 05/09/2027.

## Task 40C-D — Keep Reporting-Period-Dependent Headings Live

When `periodFrom` or `periodTo` commits, refresh the Supporting Documents
heading/period label without losing focus, collapsing the section,
clearing uploads/comments, or rerendering unrelated form state. Reuse the
existing schedule-document renderer and period-key resolution; do not
create a second date-formatting rule.

## Task 40C-E — Enforce Sidebar/Readiness/Export Parity

1. Annual Plan providers: an empty `q4Providers` collection must leave the
   applicable sidebar section incomplete, matching export validation's
   requirement for at least one complete provider.
2. Minor Plan Cover: include case identity (`ucn || ref`) and
   amended-form completion in the sidebar rule exactly when the export
   validator requires them.
3. Extend the parity contract so every `auto` readiness/export blocker is
   represented in the matching navigation/Summary status. Manual
   procedural reminders remain nonblocking under the repository
   invariant.

## Task 40C-F — Repair Selected-Source Carryover and Ward-Party County Hydration

1. Preserve and resolve the user's selected source through Simplified
   Accounting's eligibility-modal redirect; do not fall back to a fresh
   blank filing while reporting that carryover occurred.
2. Carry the source ward name, case identity, guardian identity/contact
   details, and attorney identity/contact details into their destination
   shapes. In particular, map Initial Inventory's nested `attorney`
   object rather than reading nonexistent top-level attorney-contact
   fields.
3. Link the destination to the same canonical ward Party where the user
   has selected that ward as the carryover source. Hydrate destination
   `county` from `party.county` when present; otherwise leave it blank
   for the first explicit Cover selection. Never obtain the county merely
   from an arbitrary source filing. `attorney_county` remains a separate
   field and must not be populated from the ward's county.
4. Update confirmation/helper copy so it accurately names the selected
   source type and explains whether County was restored from the ward
   record or still needs to be selected on the new filing's Cover.
5. Keep the operation non-destructive: source data is never changed, and
   hiding/canceling the eligibility flow creates no partial destination.

## Task 40C-G — Correct Remaining Labels and Copy

1. Change the Annual-family sidebar's Schedule D4 label from "Restricted
   Assets" to "Intangible Assets," matching the editor and PDF model.
2. Replace the eligibility modal's hardcoded "existing Simplified Annual
   Plan" text with selected-source-aware wording, including the
   conditional County behavior above.

## Task 40C-H — Fix Plan Initial Q7 Explicit-No Validation

`validatePlanInitial()` currently uses
`if (d.q7Trusts || d.q7PendingBenefits || d.q7Other)` to decide whether
the Question 7 explanation is required. `q7Trusts` and `q7PendingBenefits`
are tri-state values (`''`, `'Yes'`, or `'No'`), so the non-empty string
`'No'` is truthy and incorrectly blocks an otherwise complete filing. The
edit UI already expresses the intended condition correctly: show/require
the explanation only when Trusts is explicitly Yes, Pending Benefits is
explicitly Yes, or the boolean Other option is selected.

1. Replace the truthiness predicate with an explicit affirmative check
   that accepts canonical `'Yes'` and legacy boolean `true`, while
   treating canonical `'No'`, legacy boolean `false`, blank, null, and
   missing values as non-affirmative. Do not coerce unanswered values to
   No.
2. Use the same predicate for the editor's conditional explanation,
   `validatePlanInitial()`, `computeNavChecks()`, and Plan Initial
   readiness. Add a distinct automatic readiness condition for the
   conditional Q7 explanation (or otherwise provide a demonstrable
   1-to-1 mapping) so an export blocker cannot be absent from the
   readiness panel.
3. Confirm these cases independently: both fields No with no explanation
   passes; Trusts Yes with no explanation blocks; Pending Benefits Yes
   with no explanation blocks; Other checked with no explanation blocks;
   each affirmative case passes once an explanation is supplied;
   unanswered remains unanswered and is never silently stored as No.
4. Remove the temporary Q7 blanking workaround from
   `tests/e2e/signature-capture.contract.spec.ts`; the ordinary
   `fillMinimalValidPlanInitialWard()` fixture must again pass the real
   export path without test-only data manipulation.

This is a validation/readiness correction only. It adds no persisted
field, changes no enum domain, and requires no data migration or
`probate-guardian-data-model.csv` edit. Existing `'Yes'`/`'No'`/blank and
legacy boolean values remain stored exactly as they are. It also makes no
legal determination about what an adequate explanation contains; the app
only enforces that some text is present when the filer selects an option
whose existing form copy calls for an explanation.

Browser-only rows such as a Pasco test filing containing "Pinellas County
Clerk" are persisted QA data, not shipped repository seed data. Cleaning a
test browser profile is therefore not an implementation task in this
delivery unless the value can be reproduced from a fresh profile.

## Data, Portability, Security, and Legal Scope

- **Persisted model:** Task 40C-A changes the canonical default for
  existing filing county fields and adds `caseFile.parties[].county`, so
  the Party collection expansion and the two existing CSV rows named
  above must land in the same commit. No other field is added, renamed,
  or reshaped by Tasks 40C-B through 40C-G.
- **Export/import/backup:** `.sav` and single-ward round trips preserve
  an explicitly selected filing county. Full-case export already carries
  Party records. Single-ward export does not, so import must seed the
  reconstructed ward Party's county from that exported filing's explicit
  `D.county`; it must not create a dangling dependency. Excel imports
  preserve an explicit workbook county and, after resolving the ward
  Party, establish its county only under the same first-value/conflict
  rules. PDF/DOCX generation must never invent a county.
- **Sensitivity/threat model:** this adds one persisted county value to a
  ward Party but no new external data flow. Classify it consistently
  with the existing filing/case county fields. It improves consistency,
  not access control, confidentiality, or proof of venue.
- **Legal/compliance framing:** County remains machine-required because
  it controls the court caption and local guidance. This app-level
  validation does not determine venue or legal sufficiency; the filer is
  responsible for selecting the correct county.

## Verification Plan and Named Test Changes

1. Add `tests/unit/filing-county-defaults.spec.js`: all seven factories
   are blank; a first Cover choice establishes `party.county`;
   subsequent filing creation hydrates it; an unresolved ward stays
   blank; blank circuit/caption helpers do not resolve to Pinellas or
   Sixth Circuit; all nine validators continue to reject blank county.
   **Coverage gap to close, confirmed by reading it directly:**
   `tests/e2e/support/target.ts`'s `fillMinimalValid*Ward()` helpers
   (used across most of the e2e suite) inject a complete, valid ward —
   including `county: 'Pinellas'` — directly onto `window.D` via
   `page.evaluate()`, bypassing the Cover page entirely. That means no
   existing e2e test actually exercises "select County on the Cover, then
   it lands on the ward Party" through the real UI; it's only ever
   asserted at the unit level or via the new carryover spec below. Add at
   least one e2e test that drives the real Cover county selector for a
   fresh ward (not the `evaluate()` shortcut) and confirms the resulting
   ward Party carries it, so the feature's actual entry point has direct
   coverage.
2. Update `tests/unit/ward-carryover.spec.js`: use the real nested
   Initial Inventory attorney shape, prove selected-source field
   fidelity and ward-Party linking, assert the canonical ward county
   hydrates the destination, and assert a ward Party without county
   leaves it blank.
3. Update `tests/unit/checklist-export-parity.spec.js` and the four Plan
   parity specs so empty provider collections and Minor case/amended
   fields preserve the readiness/export/navigation invariant.
4. Update `tests/e2e/form-entry-ux.spec.ts`: valid cross-year and
   reversed date entry never changes the opposite field, while invalid
   ordering is reported rather than repaired destructively.
5. Update `tests/e2e/supplemental-pdf-accounting.spec.ts`: changing
   either reporting-period endpoint updates the visible Supporting
   Documents period and preserves already entered document state.
6. Add `tests/e2e/carryover-workflow.spec.ts`: exercise the real
   Initial-Inventory-to-Simplified-Accounting eligibility-modal path,
   including nested attorney fields, selected-source copy, linked
   ward-Party county hydration, first-filing blank behavior, accurate
   helper copy, and cancellation atomicity.
7. Update `tests/e2e/filing-identity.contract.spec.ts`: all nine filing
   types expose a root Cover label and required County control; Annual,
   Final, and Trust retain their distinct filing identities while
   sharing "Cover & Part I" UI.
8. Update `tests/unit/content-corrections.spec.js` for the D4 and
   eligibility copy corrections. Update every changed/new test
   description and add both new files in `TEST-INDEX.md` in the same
   commit.
9. Update `tests/e2e/party-resolver.spec.ts` and the relevant `.sav`
   round-trip specs: unanimous legacy backfill, conflicting linked
   counties, Party merge conflict handling, future-filing hydration
   without retroactively rewriting sibling filings, and single-ward
   import reconstruction. Update `tests/unit/case-county-drift.spec.js`
   for the ward-Party/case/filing snapshot semantics and revised
   advisory copy.
10. Update `tests/unit/plan-initial-parity.spec.js` with the complete Q7
    affirmative/negative/blank matrix and its readiness-to-export
    mapping. Update `tests/e2e/plan-readiness.contract.spec.ts` and
    `tests/e2e/plan-initial-mount.spec.ts` so the normal fully completed
    Plan Initial fixture reaches Ready to export and PDF generation
    without a Q7 explanation when Trusts and Pending Benefits are
    explicitly No. Remove the workaround and retain Plan Initial
    signature coverage in `tests/e2e/signature-capture.contract.spec.ts`.
    Update the descriptions of all four rescoped files in
    `TEST-INDEX.md`.

Run the targeted files above plus `npm run verify:data-model`. Because
this delivery changes creation, carryover, import, navigation,
validation, and all filing output captions, recommend the full `npm test`
regression before commit/push and run it only with the requester's
explicit approval, per `AGENTS.md`.
