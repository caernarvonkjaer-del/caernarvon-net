# Milestone 40C: Validated Browser QA/UX Remediation

## Status

**Draft only — split into two independently approvable deliveries
(2026-09-12).** This proposal authorizes no runtime, data-model, test, or
documentation change until the requester approves a named delivery below.
Approving one does **not** authorize the other, and approval of any other
Milestone 40 delivery authorizes neither.

The original single-gate 40C bundled eight unrelated tasks behind one
approval — the largest blast radius in Milestone 40 (a data-model
expansion, seventeen fallback sites, nine filing types, twelve test files)
sharing a gate with a one-predicate validation bug fixable in an
afternoon. That defeated the "independently reviewable and approvable"
premise that split Milestone 40 in the first place. The two deliveries
below divide on a real fault line: whether the work touches persisted data.

| Delivery | Tasks | Touches persisted data / CSV | Open decisions | Approve independently |
| --- | --- | --- | --- | --- |
| **40C-1 — County Establishment, Hydration, and Carryover** | 40C-A, 40C-F, 40C-G2 | **Yes** — new `caseFile.parties[].county`, `caseFile.parties[]` row expansion, `common,D,county` note rewrite, legacy migration rule | **None** — the unknown-circuit representation (Task 40C-A item 7) was resolved 2026-09-12: option (a), `null`/`''`/`null` | Yes |
| **40C-2 — Form-Entry, Readiness, and Validation Corrections** | 40C-B, 40C-C, 40C-D, 40C-E, 40C-G1, 40C-H | **No** — no field added, renamed, or reshaped; no `verify:data-model` run required | None | Yes |

**Both deliveries are implementable on approval.** Neither has an open
decision. Nothing in 40C-2 depends on 40C-1, so either can land first.
The only file both touch is `tests/unit/content-corrections.spec.js`
(Task 40C-G's two halves) — whichever lands second extends it rather than
rewriting it. Before implementing 40C-2, confirm 40C-B's and 40C-D's
browser-observed premises (see "Verification of Claims" below); they are
the only claims in this proposal a code read could not settle.

## Verification of Claims (2026-09-12, pre-approval)

Every load-bearing code claim in this proposal was re-checked directly
against `master` before asking for approval, because most of them were
written from a browser-QA session rather than from the source. Results:

| Claim | Result |
| --- | --- |
| 40C-A item 3: seven `county: src.county \|\| 'Pinellas'` sites in `ward-lifecycle.js` at lines 84, 115, 132, 156, 201, 231, 256 | **Confirmed exactly**, all seven at the stated lines |
| 40C-A item 3: eight in `legacy-app.js` at 4369, 4385, 4394, 4411, 4458, 4479, 4494, 4524 | **Confirmed exactly** |
| 40C-A item 3: two `attorney_county` fallbacks at 6127, 6209 | **Confirmed exactly** |
| 40C-A item 5: Pinellas fallbacks in both Excel importers | **Confirmed** — `simplified-accounting/excel.js:222`, `annual-accounting/excel.js:446` |
| 40C-A item 6: shared engine fallbacks at `pdf-engine.js:166`, `docx-engine.js:350` | **Confirmed exactly** (identical `(metadata.county \|\| 'Pinellas').toUpperCase()` in both) |
| 40C-A item 6: seven per-feature `pdf-model.js` sites | **Confirmed exactly**, all seven at the stated lines |
| 40C-A item 7: three layered circuit fallbacks in `circuit-lookup.js` (`:58`/`:65`, `:75`, `:83`) | **Confirmed** — and this is why a partial fix still prints "SIXTH" |
| 40C-A item 7: `circuit-lookup.spec.js:38-41` asserts the fallback being removed | **Confirmed** — test name is literally "falls back gracefully to Sixth Judicial Circuit for unknown or empty counties" |
| 40C-C: `wireDateRangePair()` / `enforceDateRanges()` exist and are the mutating path | **Confirmed** — `legacy-app.js:9178` and `:9153`; called from `router.js:225`, `guardian-inventory/index.js:118`, `legacy-app.js:5743` |
| 40C-E: an empty `q4Providers` is reachable | **Confirmed** — seeded with one row (`state.js:231`) but prunable to zero (`prune-cards.js:11`, `min: 0`) |
| 40C-F item 2: carryover reads nonexistent flat attorney fields | **Confirmed, and narrowed to one function** — see the note under that item. Two sibling converters are already correct and must not be changed. |
| 40C-G1: sidebar D4 label is the only stale one | **Confirmed** — `annual-accounting/index.js:357`; editor and Excel map already say "Intangible Assets." Two false-positive rename targets found; see that task. |
| 40C-H: `validatePlanInitial()` uses a truthiness predicate on tri-state values | **Confirmed** — `plan-initial/index.js:581`. The editor (`:293`) and PDF model (`:206`) already use correct affirmative checks, so **three** predicates exist and only the validator is wrong. Defaults are legacy boolean `false` (`state.js:313`), confirming item 1's requirement to accept both `'No'` and `false`. |

Two claims were **not** independently verified and are carried on the
browser-QA session's authority: 40C-D's assertion that the Supporting
Documents heading currently loses focus/state on period commit, and
40C-B's audit of which root pages are presented as a Cover (the audit
table above). Both are observational UI claims that a code read can't
settle; confirm them in the browser at implementation time, and treat a
mismatch as a scope change rather than proceeding.

## Goal

Turn the September 2026 browser re-review into executable tasks: eight
concrete, named fixes across county defaulting, Cover-page labeling, date
entry, readiness/export parity, carryover, and one tri-state validation
bug — delivered as the two gates above rather than one.

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

*Delivery 40C-1. Touches persisted data. Item 7's decision is resolved (option (a), 2026-09-12) — no open decisions remain.*

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
   rather than Sixth Circuit. **Three** distinct fallbacks confirmed in
   `circuit-lookup.js` (review pass 2026-09-12 — an earlier version of
   this task named two), and they are *layered*, so removing one or two
   still yields a Pinellas/Sixth caption:
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
   - **A third, previously unnamed fallback:** `getCircuitOrdinal()` at
     `circuit-lookup.js:75` — `const ord = CIRCUIT_ORDINALS[circuitNum] || 'Sixth';`.
     Even with both defaults above removed, an unresolved circuit number
     still renders the word "SIXTH" in the caption's first line through
     this one.
   - The "legacy duplicate" is `src/legacy-app.js:1421-1433`: its own
     `circuitForCounty()` (`:1421`) **plus** the same two patterns at
     `:1432-1433` —
     `const c=(county||'Pinellas').trim()||'Pinellas';` and
     `const ord=(CIRCUIT_ORDINALS[circuitForCounty(c)]||'Sixth').toUpperCase();`.
     All of it must change together. Note the comment at `:1438-1439`
     already warns that this duplicate exists *and* that
     `county-guidance.js` deliberately avoids depending on
     `circuitForCounty()` precisely because of its fallback — read it
     before editing, it explains why the two must not be unified here.

   **RESOLVED 2026-09-12 (requester approved option (a)).**
   `circuitForCounty()` returns **`null`** for blank or unrecognized,
   `getCircuitOrdinal()` returns **`''`**, and
   `getFloridaCircuitCourtCaption()` returns **`null`** rather than a
   caption object. Each caller then decides explicitly what to draw with
   no caption, which is the honest outcome: export is already blocked by
   County validation (item 6), so the only path that reaches a
   blank-county caption is a draft/preview override, and a draft should
   show a visible gap, not a confident wrong court. Callers to update:
   `pdf-engine.js:22`, `docx-engine.js:9` (moot if 40A landed first), and
   `legacy-app.js`'s duplicate.

   Rejected alternatives, recorded so this isn't relitigated: **(b)** a
   caption object with blank or placeholder slots (e.g.
   `IN AND FOR ______ COUNTY, FLORIDA`) — less invasive for callers, but
   risks a placeholder reaching a filed document if the validation gate is
   ever bypassed; **(c)** throwing on unknown — this is a rendering-path
   lookup, and an exception would take down preview generation for a
   recoverable data state.

   **This makes `circuit-lookup.js` consistent with a pattern the codebase
   already proved works.** `src/core/filing/county-guidance.js` deliberately
   does *not* derive from `circuitForCounty()` — precisely because of that
   fallback — and `tests/unit/plan-readiness-county.spec.js:70` already
   asserts "a blank county is treated as non-local, not defaulted to Sixth
   Circuit," passing today. Option (a) brings the circuit lookup in line
   with the guidance module rather than inventing a new convention; that
   spec is a working reference for the behavior, and it needs no change
   under this delivery.

   Whichever is chosen, `tests/unit/circuit-lookup.spec.js:38-41` —
   currently the test **"falls back gracefully to Sixth Judicial Circuit
   for unknown or empty counties,"** asserting `circuitForCounty('')`,
   `circuitForCounty(null)`, and `circuitForCounty('Atlantis')` all return
   `6` — encodes exactly the behavior being removed and must be inverted
   in the same change. This spec is not currently named in the
   verification plan below; add it.

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

*Delivery 40C-2. No persisted-data change.*

Relabel the shared Annual/Final/Trust sidebar entry, page heading, Summary
entry, tour/help copy, and route metadata from "Part I - Case Info" (or
"Part I - Required Information") to "Cover & Part I - Case Info." Keep the
same `/` route and fields. Verify through all nine filing descriptors that
the root route is visible, named as a Cover, contains the filing-level
County control, and marks County required.

## Task 40C-C — Stop Date-Range Entry From Changing Another Field

*Delivery 40C-2. No persisted-data change.*

Remove `wireDateRangePair()` / `enforceDateRanges()` behavior that
compares displayed `MM/DD/YYYY` strings and overwrites the opposite
endpoint. A user editing From or To must never mutate the other stored or
displayed value. Keep the shared `checkDateOrder()` export/readiness
validation as the one place that reports an end-before-start error. Cover
both a genuinely reversed range and a valid cross-year range such as
05/10/2026 through 05/09/2027.

## Task 40C-D — Keep Reporting-Period-Dependent Headings Live

*Delivery 40C-2. No persisted-data change.*

When `periodFrom` or `periodTo` commits, refresh the Supporting Documents
heading/period label without losing focus, collapsing the section,
clearing uploads/comments, or rerendering unrelated form state. Reuse the
existing schedule-document renderer and period-key resolution; do not
create a second date-formatting rule.

## Task 40C-E — Enforce Sidebar/Readiness/Export Parity

*Delivery 40C-2. No persisted-data change.*

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

*Delivery 40C-1. Touches persisted data (ward-Party linking and county hydration).*

1. Preserve and resolve the user's selected source through Simplified
   Accounting's eligibility-modal redirect; do not fall back to a fresh
   blank filing while reporting that carryover occurred.
2. Carry the source ward name, case identity, guardian identity/contact
   details, and attorney identity/contact details into their destination
   shapes. In particular, map Initial Inventory's nested `attorney`
   object rather than reading nonexistent top-level attorney-contact
   fields.

   **Verified and narrowed 2026-09-12 — the bug is in exactly one
   function, not the carryover layer generally.** The offending reads are
   `carryOverFieldsForAccounting()`, `src/legacy-app.js:4448-4452`:
   `attyBar`/`attyPhone`/`attyEmail`/`attyStreet`/`attyCityStateZip` each
   resolve only flat keys (`src.attorneyBar || src.attorney_bar`, and so
   on). A Guardian Inventory source keeps that data nested at
   `src.attorney.{barNumber,phone,streetAddress,cityStateZip}`
   (`legacy-app.js:6782`), which none of those chains reach — so all five
   silently carry over blank. Add the nested reads to each chain.

   **A latent second defect in the same block, not previously named:**
   `attyName` at `:4447` is
   `src.attorneyName || src.attorney_name || src.attorneyForGuardian || src.attorney || ''`.
   For a Guardian Inventory source whose `attorneyForGuardian` is blank,
   the final `src.attorney` fallback resolves to the **nested object**,
   which is then assigned into string fields (`attorneyForGuardian`,
   `attorney`) on the destination. Read `src.attorney?.name` there rather
   than `src.attorney`.

   **Do not "fix" the two sibling converters — they are already correct.**
   `convertGuardianExtrasToAnnual()` (`:6121-6126`) reads
   `const a = src.attorney || {}` and then `a.barNumber`/`a.phone`/etc.
   properly, and `convertSimplifiedToAnnual()` (`:6204-6207`) correctly
   reads a Simplified source's genuinely flat `attorney_*` fields. An
   earlier reading of this task as "carryover reads attorney wrong"
   would have led to changing both of those unnecessarily.
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

## Task 40C-G1 — Correct the Schedule D4 Label

*Delivery 40C-2. No persisted-data change. Formerly 40C-G item 1 — split
from 40C-G2 because that half depends on 40C-1's carryover behavior while
this half is a standalone one-line copy fix.*

Change the Annual-family sidebar's Schedule D4 label from "Restricted
Assets" to "Intangible Assets," matching the editor and PDF model.

**Verified 2026-09-12.** The sidebar is the only place that is wrong:
`src/features/annual-accounting/index.js:357` renders
`Sch D4 — Restricted Assets`, while the editor heading (`:1035`, `:1058`)
and the Excel schedule map (`excel.js:44`) already read "Intangible
Assets." Two cautions found while confirming it:

- **Do not do this as a find-and-replace.**
  `annual-accounting/index.js:1063` contains a legitimate subtotal row
  labeled "Restricted Intangible Assets" — a real distinction within the
  D-4 schedule, not a stale label. Renaming it would be a regression.
- `src/legacy-app.js:367` has a help-section title "Restricted Assets."
  Determine whether that help topic is about Schedule D-4 (rename it) or
  about restricted assets/depository generally (leave it). This is a
  judgment call about help content, not a mechanical rename.

## Task 40C-G2 — Make the Eligibility Modal Copy Source- and County-Aware

*Delivery 40C-1. Depends on 40C-F's carryover behavior — the copy
describes whether County was restored from the ward record, which only
exists once 40C-F lands. Formerly 40C-G item 2.*

Replace the eligibility modal's hardcoded "existing Simplified Annual
Plan" text with selected-source-aware wording, including the conditional
County behavior above.

## Task 40C-H — Fix Plan Initial Q7 Explicit-No Validation

*Delivery 40C-2. No persisted-data change (stated explicitly at the end of this task).*

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

- **Persisted model — 40C-1 only.** Task 40C-A changes the canonical
  default for existing filing county fields and adds
  `caseFile.parties[].county`, so the Party collection expansion and the
  two existing CSV rows named above must land in the same commit. Task
  40C-F adds no field of its own but writes to `party.county` and to the
  ward-Party link. **Delivery 40C-2 (Tasks 40C-B, 40C-C, 40C-D, 40C-E,
  40C-G1, 40C-H) adds, renames, or reshapes nothing** — that is the fault
  line the two deliveries split on, and it is why 40C-2 carries no
  `verify:data-model` obligation. Everything in the rest of this section
  applies to 40C-1.
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

## Acceptance Criteria

Added in the review pass of 2026-09-12: this was the only Milestone 40
delivery with no acceptance-criteria table, which made "done" a matter of
reading eight task narratives and inferring the observable outcome. One
row per task, stated as something a person or a test can check.

**Read by delivery.** Rows for 40C-A, 40C-F, and 40C-G2 gate **40C-1**;
rows for 40C-B, 40C-C, 40C-D, 40C-E, 40C-G1, and 40C-H gate **40C-2**.
The final `verify:data-model` row belongs to 40C-1 only — 40C-2 makes no
data-model change and must not run a CSV update as part of its commit.

| Task | Scenario | Expected result |
| --- | --- | --- |
| 40C-A | A brand-new filing of each of the nine types, before any Cover entry | County is blank. No filing, PDF, Excel, or caption anywhere resolves to Pinellas/Sixth Circuit by default. |
| 40C-A | First county selected on a Cover | It lands on both the filing snapshot and the linked ward Party; a later new filing for that ward hydrates from the Party without re-asking. |
| 40C-A | A later Cover edit to an existing filing | Changes that filing and the Party's canonical value for *future* filings only; existing sibling filings and already-generated output are untouched. |
| 40C-A | Legacy `.sav` whose linked filings disagree on county | `party.county` stays blank and the user is asked; no value is inferred from attorney county or another ward's filing. |
| 40C-A | Blank county reaching a draft preview | Renders per the resolved option in item 7 — never a Pinellas or Sixth Circuit caption. Export stays blocked by existing County validation. |
| 40C-B | Root page of all nine filing types | Sidebar entry, page heading, Summary entry, and help copy all identify it as a Cover; the route itself is unchanged. |
| 40C-C | Editing either endpoint of a date range, valid or reversed (incl. 05/10/2026–05/09/2027) | The opposite endpoint's stored and displayed value never changes. A genuinely reversed range is *reported* by `checkDateOrder()`, not silently repaired. |
| 40C-D | Committing `periodFrom`/`periodTo` with Supporting Documents open | Heading/period label refreshes in place; focus is kept, the section stays expanded, and uploads/comments survive. |
| 40C-E | Annual Plan with an empty `q4Providers`; Minor Plan missing `ucn`/`ref` or amended-form completion | The sidebar section reads incomplete, matching export validation exactly. Every `auto` blocker has a matching navigation/Summary status; manual reminders stay nonblocking. |
| 40C-F | Carryover through Simplified Accounting's eligibility-modal redirect | The user's selected source is preserved (never silently swapped for a blank filing); nested Initial-Inventory `attorney` fields map correctly; the destination links to the same ward Party; `county` hydrates from `party.county` or stays blank; `attorney_county` is never populated from it. |
| 40C-F | Cancelling or hiding the eligibility flow | No partial destination filing exists and no source data changed. |
| 40C-G1 | Annual-family sidebar | Schedule D4 reads "Intangible Assets" — and the "Restricted Intangible Assets" subtotal row is untouched. |
| 40C-G2 | The eligibility modal | Names the actual selected source type and states whether County was restored from the ward record or still needs selecting. |
| 40C-H | Plan Initial Q7: both tri-states explicitly `'No'`, no explanation | Filing passes — this is the bug being fixed. |
| 40C-H | Q7 Trusts `'Yes'` / Pending Benefits `'Yes'` / Other checked, each with no explanation | Each blocks export, and the blocker is visible in the readiness panel (1-to-1 with the export gate, not export-only). |
| 40C-H | Q7 left unanswered | Stays unanswered — never silently stored or reported as `'No'`. |
| 40C-H | `tests/e2e/signature-capture.contract.spec.ts` | The temporary Q7 blanking workaround is gone and `fillMinimalValidPlanInitialWard()` passes the real export path unmodified. |
| All | `npm run verify:data-model` | Clean, with the `common,D,county` note rewritten, `caseFile.parties[]` expanded into canonical rows, and `annual_accounting,D,attorney_county`'s blank initial value recorded. |

## Verification Plan and Named Test Changes

**Split by delivery (2026-09-12).** Run only the items belonging to the
delivery being implemented; running the other half's tests against
unchanged code proves nothing and invites a false failure.

- **40C-1 (county/carryover):** items 1, 2, 6, 9, 11, and the
  `verify:data-model` run. Item 8's eligibility-copy half (40C-G2) also
  belongs here.
- **40C-2 (form-entry/readiness/validation):** items 3, 4, 5, 7, 10, and
  item 8's D4-label half (40C-G1). No `verify:data-model` run.
- **Item 12** is a cross-delivery conflict note and applies to whichever
  lands alongside Milestone 40A.

Item 8 is the one item that genuinely spans both deliveries, because
`tests/unit/content-corrections.spec.js` covers both halves of the former
40C-G. Whichever delivery lands second should extend that spec rather than
rewrite it.

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
11. **Invert `tests/unit/circuit-lookup.spec.js:38-41`** (added in the
    review pass of 2026-09-12 — this spec was missing from the plan
    entirely). Its test "falls back gracefully to Sixth Judicial Circuit
    for unknown or empty counties" asserts `circuitForCounty('')`,
    `circuitForCounty(null)`, and `circuitForCounty('Atlantis')` all
    return `6`; that is the exact behavior Task 40C-A item 7 removes, so
    the spec fails the moment the fix lands. Rewrite it to assert the
    unknown-result representation chosen in item 7, and add coverage for
    all three layered fallbacks (`circuitForCounty`, `getCircuitOrdinal`,
    `getFloridaCircuitCourtCaption`) so a future partial revert can't
    reintroduce a Sixth Circuit default through whichever one wasn't
    tested. Also assert `getFloridaCircuitCourtCaption('Pinellas')` still
    produces the correct real caption — removing a fallback must not
    disturb the 67 genuine county mappings.
12. **Cross-delivery note, corrected 2026-09-12.** An earlier version of
    this item claimed `tests/unit/plan-readiness-county.spec.js` is edited
    by this proposal's readiness work as well as by Milestone 40A. It is
    **not** edited here: it passes `county` explicitly into every case
    (`:48-49`) and already asserts that a blank county is treated as
    non-local rather than defaulted to Sixth Circuit (`:70`), which is the
    behavior 40C-A item 7 now adopts elsewhere. Milestone 40A is the only
    delivery that touches it, and only to drop its `vi.mock` of the
    deleted DOCX engine (`:25`). **Leave this spec alone** — and treat its
    continued passing as a regression check that item 7 didn't disturb
    `county-guidance.js`'s Pinellas/Pasco gating.

    The genuine cross-delivery files are `docx-engine.js` (40A ↔ 40C-1),
    `pdf-engine.js` (40E ↔ 40C-1), and
    `tests/unit/content-corrections.spec.js` (40C-1 ↔ 40C-2). See the
    dependency table in `MILESTONE-40-PROPOSAL.md`.

**40C-1 only:** run its targeted files above plus
`npm run verify:data-model`. Because 40C-1 changes creation, carryover,
import, navigation, validation, and all filing output captions, recommend
the full `npm test` regression before commit/push, run only with the
requester's explicit approval, per `AGENTS.md`.

**40C-2:** run its targeted files above. No `verify:data-model` run. Its
scope is form-entry behavior, sidebar/readiness parity, copy, and one
validator predicate — a targeted unit+e2e set is the appropriate gate, and
a full regression is not warranted on its own.
