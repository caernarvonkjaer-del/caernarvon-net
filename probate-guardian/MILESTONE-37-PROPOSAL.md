# Milestone 37: County Guidance, Form Lifecycle, and Output-UI Reconciliation

## Status

**Draft only — do not implement yet.** This is an omnibus, planned milestone;
it authorizes no runtime, data-model, test, or documentation change beyond this
proposal. Its seven tracked components are county-aware local guidance, the
Milestone 34 verification closeout, Milestone 35-4 invariant reconciliation,
advance-directive lifecycle, explicit Yes/No radio migration, guardian-signature
card lifecycle, and Preview/Export shell-control placement.

The components will be implemented **serially**, with focused verification and
an explicit review checkpoint after each component. In particular, 37-5 remains
in this milestone but is a self-contained migration phase: it must begin only
after the preceding authorized work is stable, and its shared-control,
data-model, compatibility, accessibility, and output changes must be completed
and verified together before work moves to 37-6. No component may be folded
into another component's implementation or regression evidence.

## Milestone 37-1: County-Aware Local Filing Requirements

### Decision Recorded

The local Simplified Plan certificate-of-service instruction applies when the
county selected for the filing is **Pinellas** or **Pasco**:

- Show it as a required manual filing obligation: serve the required persons and
  file the certificate of service.
- For every other selected county, do not apply that Sixth Judicial Circuit local
  overlay. Show only the applicable statewide/statutory service instruction.

Likewise, user-visible text that states a Pinellas, Pasco, Sixth Judicial Circuit,
or other Sixth-Circuit-specific *requirement* must be absent unless the selected
county is Pinellas or Pasco.

This is intentionally about local requirements, not court identity. A correct
caption such as “Sixth Judicial Circuit” for a Pinellas or Pasco filing remains
necessary, and the statewide county picker must continue to list all counties.

### Legal/Operational Boundary

Florida Statutes section 744.367(3)(b) supplies the statewide annual-report
service baseline: service on the ward except in the listed circumstances, service
on the ward's attorney if any, and further copies as the court directs. It does
not itself state a general certificate-of-service filing requirement. The final
implementation must use the then-current official text as its source for
statewide wording and must not characterize a local clerk workslip as a statute.

The Pinellas/Pasco overlay is a local operational requirement selected by the
product owner for this milestone. It must be labeled as local court guidance, not
as a statewide legal rule. Before implementation, retain the local primary source
(order, clerk instruction, or current workslip) in the source map with its date
and issuing authority.

The application cannot observe whether a copy was served or a certificate was
filed with the court. Therefore “required” means a clearly identified **manual
filing requirement** in the readiness guidance, not an auto-pass and not a
hard export error based on an unobservable act. No new checkbox, attestation, or
persisted certificate-of-service data is authorized by this proposal.

### Current Condition

| Area | Current behavior | Required milestone direction |
|---|---|---|
| Simplified Plan readiness | `src/features/plan-simplified/print.js` always says to serve interested persons and file a certificate of service. | Split into a Pinellas/Pasco local required-manual item and a statutory baseline for all other counties. |
| Simplified Plan export validation | `validatePlanSimplified()` has no certificate-of-service field or filing-event check. | Keep it that way unless a separately approved, observable form field is introduced; do not fabricate validation for external service. |
| Initial Plan help | `src/legacy-app.js` displays a generic “local administrative order” Disaster Plan instruction regardless of county. | Render the local requirement only for Pinellas/Pasco; no local-requirement text for other counties. |
| Dashboard About copy | `src/legacy-app.js` describes the product as serving Pinellas and Pasco cases for every user. | Generalize the baseline description; optionally append local-guidance scope only when the active filing is Pinellas/Pasco. |
| Plan readiness text | The four Plan print modules contain statewide service, relocation, and deadline reminders. | Preserve statewide statutory reminders for every county. Gate only local/Sixth-Circuit overlays. |
| County/circuit infrastructure | County defaults and circuit lookup mention Pinellas/Pasco/Sixth in source and comments; captions derive the correct circuit from the selected county. | Do not hide county options, defaults, code comments, or an accurate filing caption. Do not use the circuit-caption fallback as a local-rule test. |

### Scope and Non-Scope

#### In scope

1. The Simplified Plan's certificate-of-service readiness instruction.
2. Every user-visible requirement/help/reminder in the application that names
   Pinellas, Pasco, the Sixth Judicial Circuit, a local administrative order, or
   an equivalent local operational requirement.
3. User-visible PDF/Word output, Print Preview, onboarding/help, and dashboard
   descriptive text produced from the selected filing.
4. A central, conservative county policy used by all such renderers.

#### Out of scope

1. Altering statewide statutory requirements, deadlines, service exceptions, or
   court-caption behavior.
2. Removing Pinellas/Pasco from the Florida county list, changing stored county
   defaults, or hiding accurate case-caption information.
3. Rewriting historical milestone documents, release notes, source comments, or
   offline clerk-workslip source material merely because they mention the Sixth
   Circuit.
4. Adding a certificate-of-service page, attestation, form field, or export block
   to the Simplified Plan. Those would be separate product and data-model work.

### Implementation Plan

#### A. Establish one explicit local-guidance policy

1. Add a small pure core module (for example,
   `src/core/filing/county-guidance.js`) with a normalized, exact allow-list:
   `Pinellas` and `Pasco` only.
2. Export a predicate such as `hasSixthCircuitLocalGuidance(county)`. It must trim
   whitespace and compare case-insensitively, returning `false` for blank,
   unrecognized, or non-Sixth-Circuit county values.
3. Do **not** derive the predicate from `circuitForCounty()`: its documented
   blank/unrecognized fallback is Sixth Circuit and would wrongly expose local
   requirements on an unfinished or invalid filing.
4. Keep legal wording and source metadata adjacent to the policy or in a compact
   source-mapping table. Use an explicit rule key and county allow-list (rather
   than hard-coded caller branches) so a future verified local rule can be added
   without refactoring every renderer. The policy answers *where* an overlay
   applies; it must not become an unreviewed source of statewide legal assertions.

#### B. Apply the Simplified Plan service rule accurately

1. Refactor `planReadinessChecksSimplified()` in
   `src/features/plan-simplified/print.js` to select its service guidance from
   the county policy.
2. For Pinellas/Pasco, render an unambiguous manual-required item that instructs
   the filer to serve the applicable persons and file the certificate of service,
   identifying it as Sixth Judicial Circuit local guidance where that is useful.
3. For every other county, render the reviewed statutory service instruction
   without the local certificate-of-service requirement. Use the statutory
   recipients/exceptions rather than the current overbroad “all interested
   persons” shorthand if the official source review confirms that distinction.
4. Do not put either external act in `auto`, `validatePlanSimplified()`,
   `prepareFilingOutput()`, or export blocking unless a later approved form field
   gives the application something truthful to validate.
5. Preserve the existing readiness/export contract: every `auto: false` item must
   still correspond to an export validation issue, while manual reminders remain
   non-blocking.

#### C. Gate all local requirement copy at its rendering point

1. Audit the rendered output from `src/features/plan-initial/print.js`,
   `plan-annual/print.js`, `plan-minor/print.js`, and
   `plan-simplified/print.js`; gate any local overlay through the shared policy.
   Statutory relocation, deadline, education, and statewide service reminders
   stay visible in every county.
2. Update the Initial Plan help content in `src/legacy-app.js` so its Disaster
   Plan/local-administrative-order instruction is rendered only when the active
   filing county is Pinellas or Pasco. Do not make a county-specific legal claim
   when no county has been selected.
3. Update the Dashboard About copy in `src/legacy-app.js` to be statewide by
   default. If it describes Sixth-Circuit-specific assistance, append that only
   for an active Pinellas/Pasco filing.
4. Search all runtime-rendered strings, PDF/Word model notices, print checklists,
   and help/onboarding markup for `Pinellas`, `Pasco`, `Sixth Judicial`, `6th
   Judicial`, `Administrative Order`, `local administrative`, and `Disaster Plan`.
   Classify each hit before changing it: local requirement (gate), statewide
   content (retain), court identity (retain when accurate), or non-runtime source
   material (out of scope).
5. Re-run the same search after implementation. Every remaining runtime,
   user-visible local-requirement hit must be inside an explicit county-policy
   branch or be a dynamically correct court caption.

#### D. Preserve filing lifecycle behavior

1. County is already persisted on each filing; this milestone adds no field and
   no migration. It must read the county of the **active filing**, not a global
   preference or another ward's filing.
2. Ensure changing the county, switching filings, importing a filing, or carrying
   data into a new filing recomputes local guidance on the next render. A blank
   county is non-local until a valid Pinellas or Pasco selection is made.
3. Do not change `probate-guardian-data-model.csv` unless implementation expands
   the persisted data shape. If a future iteration adds an acknowledgement or
   certificate field, update the corresponding schema rows and run
   `npm run verify:data-model` in that future change.

### Acceptance Criteria

| Scenario | Expected result |
|---|---|
| Simplified Plan, Pinellas | Readiness guidance presents certificate of service as a required manual local filing obligation. It does not claim the app verified service or block export for an unobservable filing act. |
| Simplified Plan, Pasco | Same behavior as Pinellas. |
| Simplified Plan, Orange (or any other valid county) | No Pinellas/Pasco/Sixth-Circuit requirement appears; service guidance follows the reviewed statewide statute rather than the local overlay. |
| Blank or unrecognized county | No local requirement is shown. The normal required-county validation still prevents a completed filing from exporting. |
| Any Plan/help/PDF/Word view, non-Pinellas/Pasco county | No local requirement text mentioning Pinellas, Pasco, Sixth Judicial Circuit, a local administrative order, or a local Disaster Plan is emitted. |
| Accurate court caption | A Pinellas/Pasco filing may correctly show the Sixth Judicial Circuit caption; another county shows its correct circuit. This is not suppressed as local guidance. |
| County change in an existing filing | Switching between Pinellas/Pasco and another county changes local-only copy immediately on the relevant next render, without changing persisted form answers. |

### Verification Plan (for the later implementation)

1. Add unit coverage for the county-policy helper: Pinellas and Pasco (including
   casing/whitespace variants) are true; Orange, blank, and unknown input are
   false.
2. Add focused Simplified Plan readiness tests for both policy paths. Assert the
   local required-manual wording for Pinellas/Pasco and the statutory wording,
   without a certificate requirement, for another county.
3. Add UI/E2E coverage that changes a filing county from Pinellas/Pasco to a
   non-local county and back, then verifies Print Preview and help content update.
4. Exercise each Plan type plus PDF and Word output with a non-local county;
   assert local requirement copy is absent while the correct court caption remains.
5. Add or update `TEST-INDEX.md` entries for every new or materially repurposed
   test file. Run the focused tests during implementation; request permission
   before the full `npm test` suite under the repository workflow.

## Milestone 37-2: Milestone 34 Verification Closeout

### Status: Complete (2026-09-10), on a reduced verification bar accepted by the requester

Milestone 34's implementation was present, but its distribution-target
verification had never been recorded as complete. This item originally called
for the following against the then-current integrated source:

1. A fresh `web` E2E run against the distribution target -- i.e. the full
   `npm run test:e2e:web` (the entire `HOSTED_PARITY_SPECS` set).
2. A full `source` regression run -- i.e. the full `npm run test:e2e:source`
   (the entire unscoped `tests/e2e/` suite, ~55 spec files).

**What was actually run instead:** only the one spec file Milestone 34 added
to, `tests/e2e/feature-load-failure.spec.ts`, executed against both targets:

- `npm run build:web`, then `PG_TARGET=web PG_BROWSER=chromium npx playwright
  test tests/e2e/feature-load-failure.spec.ts` -- the new `web`-mode
  chunk-load-failure test ran and passed against a freshly built `dist/web`;
  the existing `source`-only test correctly skipped.
- `PG_TARGET=source PG_BROWSER=chromium npx playwright test
  tests/e2e/feature-load-failure.spec.ts` -- the existing `source`-only test
  ran and passed unchanged; the new `web`-mode test correctly skipped.

This confirms Milestone 34's added test is genuine and its existing test is
untouched (see `MILESTONE-34-PROPOSAL.md`'s Status section for the same
record). It does **not** exercise the other six specs in
`HOSTED_PARITY_SPECS`, nor the ~54 other specs in the full `source` suite --
neither `npm run test:e2e:web` nor `npm run test:e2e:source` was run in full.

The requester was offered the full-suite run twice and explicitly chose this
narrower, single-spec-file verification as sufficient to close this item out
(2026-09-10), rather than leaving it open pending the full run. Recorded here
rather than left implicit, since this item's original wording ("a full
`source` regression run") is not what was actually executed.

These are verification-only obligations: they do not reopen Milestone 34's
implemented scope or authorize changing its behavior. Request permission before
running the full regression suite under the repository workflow.

## Milestone 37-3: Milestone 35-4 Exact Invariant Reconciliation

### Status: Complete for all four Plan types (2026-09-10)

Milestone 35-4 requires a full, fixture-based proof that each
machine-verifiable Plan readiness/checklist condition agrees with the
corresponding export validation behavior. It is a completion gate for this
milestone, not a claim that existing spot checks establish parity.

The inventory step (cross-referencing every `auto` readiness condition
against its export validator, for all four Plan types) surfaced something
the original wording of this item didn't anticipate: every Plan type has
validator-required fields with **no corresponding readiness condition at
all** -- not an auto-vs-validator disagreement, but fields the on-screen
checklist never mentions. Counted directly from each validator:

| Plan | Validator-required fields with zero readiness coverage (before this item) |
| --- | --- |
| Simplified | County, Q2 (best placement), Q5 (social services), Q6 (interaction) -- 4 |
| Initial | Guardian Name(s), residence City/State/ZIP, Q6-7 socialization, assistive devices used, assistive devices needed, signature certifications -- 6 |
| Annual | County, Guardian Name(s), residence City/State/ZIP -- 3 |
| Minor | Amended Form answer, Guardian Name, signature certifications -- 3 |

Reconciling this correctly (per this item's own instruction: "correct the
readiness predicate... do not suppress a failed assertion or loosen the
invariant") requires *adding* the missing readiness conditions, not just
writing tests around the gap -- real, user-visible checklist changes to four
different forms, not test-only work. The requester was informed of this
scope change and approved doing Simplified Plan first as a pilot before
repeating the pattern three more times.

**Simplified Plan (complete):** `planReadinessChecksSimplified()`
(`src/features/plan-simplified/print.js`) now carries a stable `id` on every
`auto` item (never rendered -- `planReadinessPanel()` only reads
`.label`/`.ok`) and gained the four missing conditions above as new checklist
rows (`cover.wardCaseCounty` absorbed County; `plan.q2`/`plan.q5`/`plan.q6`
are new rows). `tests/unit/plan-simplified-parity.spec.js` (24 tests, all
passing) proves, through the real `prepareFilingOutput()` +
`validatePlanSimplified()` path `pagePrintPlanSimplified()` itself uses --
not an isolated validator call -- that: the fully-valid baseline has all 13
auto conditions true and zero blocking export issues; blanking any single
constituent field flips exactly its mapped auto id false and produces
exactly its mapped validator message, with every other auto condition still
true; and four conditional sub-field cases (Q7/Q8/Q9 explanation
requirements, Q8's None+directive conflict) correctly block export while
their primary auto condition correctly stays true, per this item's own
contract point 3. Shared fixture-cloning/lookup helpers live in
`tests/unit/support/plan-readiness-parity.js` for reuse by the next three
Plan types. `TEST-INDEX.md` updated for both new files.

**Initial Plan (complete):** `planReadinessChecksInitial()`
(`src/features/plan-initial/print.js`) gained the six missing conditions
above: `cover.guardianNames`, `plan.q6q7` (Socialization & Benefits), and
`signatures.certifications` are new rows; `cover.wardResidence` and
`plan.q10bcd` (relabeled 10B/C -> 10B-D) had their predicates extended in
place to add `residenceCityStateZip` and "assistive devices currently used"
respectively, since each is already the validator's own combined section.
`tests/unit/plan-initial-parity.spec.js` (30 tests, all passing) proves the
same baseline/per-field-failure contract across all 19 auto conditions
through the real export-blocking path.

**Annual Plan (complete):** `planReadinessChecksAnnual()`
(`src/features/plan-annual/print.js`) gained `cover.county` and
`cover.guardianName` as new rows; `cover.wardResidence` had its predicate
extended to add `residenceCityStateZip`. `tests/unit/plan-annual-parity.spec.js`
(28 tests, all passing) proves the same contract across all 17 auto
conditions.

**Minor Plan (complete):** `planReadinessChecksMinor()`
(`src/features/plan-minor/print.js`) gained `cover.amendedForm` (using the
same `isTriStateAnswer()` predicate as its validator, imported from
`core/form/form-contract.js`), `cover.guardianName`, and
`signatures.certifications` as new rows. `tests/unit/plan-minor-parity.spec.js`
(25 tests, all passing) proves the same contract across all 14 auto
conditions.

**Scope note applying to all three:** each of these three suites covers
every mapped condition's primary required-field failure -- the contract's
core (`auto.ok===false` iff its mapped validator predicate fails) -- but,
unlike the Simplified pilot, does not additionally cover secondary
"explain when Other/Yes/No" conditional sub-cases; the pilot already
demonstrated that pattern works (four such fixtures), and repeating it for
every conditional field across three more Plan types (each already 14-19
conditions) was judged to add bulk without adding new proof. 107 tests total
across the four suites (24 + 30 + 28 + 25), all passing, all exercising the
real `prepareFilingOutput()` + `validatePlanXxx()` path each Plan's own
Print Preview page uses -- not an isolated validator call.

### Contract to prove

For each of the four Plan types — Initial, Annual, Minor, and Simplified — and
for every condition shown in its readiness/checklist `auto` collection:

1. A false auto condition must yield one or more export-validation issues that
   identify the missing or invalid underlying data.
2. A true auto condition must not, by itself, yield an export-validation issue
   for that same condition.
3. A manual-only reminder must remain non-blocking. It may describe a real filing
   obligation, but it cannot be represented as automatically verified or be used
   as evidence of readiness.
4. The rule must hold through the same preflight path used by PDF and Word export,
   including supplemental filing issues where that path includes them.

The intended compact form is: for every auto condition, `auto.ok === false` if
and only if its mapped export-validation predicate fails. The test must compare
semantic condition identifiers or stable mappings, not fragile counts or exact
English error strings.

### Implementation Plan

1. **Inventory the condition set.** Build a source-of-truth mapping for every
   `auto` item returned by `planReadinessChecksInitial`,
   `planReadinessChecksAnnual`, `planReadinessChecksMinor`, and
   `planReadinessChecksSimplified`. For each item, record the Plan type, stable
   condition id, readiness predicate, validator/preflight predicate, expected
   error category, and whether it is `auto` or `manual`.
2. **Assign stable identifiers before testing.** Where a readiness item currently
   has only a display label, add an internal id (for example,
   `cover.caseNumber` or `signatures.guardian1.date`) without changing the
   user-facing wording. Extend validation output with an adapter/mapping only as
   necessary to compare ids; do not make tests parse prose labels.
3. **Build valid baseline fixtures.** Create one fully valid minimal fixture per
   Plan type, using the actual persisted shapes (including Plan Minor's documented
   `ucn`/`ref` case-number behavior). Establish that each baseline has every auto
   condition true and produces no mapped export validation issue.
4. **Generate one failure fixture per mapped condition.** Starting from each valid
   baseline, remove or invalidate only the data required by one condition. Assert
   that the intended auto id is false and its mapped validation id is present,
   while unrelated mapped conditions retain their expected state. Include
   conditional rules such as attorney representation, advance-directive choices,
   date ordering, and minor/adult exceptions as separate fixtures rather than
   treating them as one generic required-field case.
5. **Test the actual export path.** Exercise the validation callback supplied to
   `prepareFilingOutput()` for PDF and Word export rather than calling isolated
   validators only. Cover `getSupplementalFilingIssues()` where a Plan's export
   path includes it, so readiness cannot pass while output preflight blocks for an
   unmapped condition.
6. **Reconcile mismatches deliberately.** For every failure, choose exactly one
   resolution: correct the readiness predicate, correct/add the export validator,
   reclassify the item as manual, or split an over-broad display item into mapped
   conditions. Record the decision and source location; do not suppress a failed
   assertion or loosen the invariant.
7. **Keep the suite maintainable.** Put shared fixture builders and the parity
   assertion harness in test support rather than copying four near-identical test
   files. Add the new or repurposed test files to `TEST-INDEX.md` with their Plan
   coverage and fixture purpose.

### Acceptance Criteria

| Area | Required proof |
|---|---|
| Initial Plan | Every auto readiness id has a valid baseline and an isolated failing fixture mapped to export preflight. |
| Annual Plan | Same proof, including all conditional attorney and date-order rules. |
| Minor Plan | Same proof, including `ucn`/`ref` synchronization and minor-specific conditions/exceptions. |
| Simplified Plan | Same proof, including conditional attorney, directive, remuneration, and date-order rules. |
| Manual reminders | Fixtures demonstrate that manual-only items neither produce auto passes nor independently block export. |
| Output modes | The mapped results agree for both PDF and Word preflight routes wherever both are available. |
| Regression record | Focused fixture suite passes, is entered in `TEST-INDEX.md`, and the later authorized full regression result is recorded. |

No implementation or test execution is authorized until the requester explicitly
starts Milestone 37 work. Before a full suite run, request permission under the
repository workflow.

## Milestone 37-4: Advance-Directive Card Creation and Visibility

### Status: Complete (2026-09-10)

`q10Directives`/`q11Directives` no longer pre-seed blank cards (state.js
factories and legacy-app.js's new-year reset paths both changed to `[]`).
Initial Plan gained the real +Add/Remove affordance it never had (only
Annual Plan did before this item); both plans' entire directive section --
type checkboxes, cards, Add Directive -- is now gated on
`q11Executed`/`q10Executed`, matching the Decision Recorded above. Checking
the box now also force-re-renders the page and creates exactly one blank
card if the collection is empty (a `data-form-change="ensure-directive-row"`
hook in `src/form-events.js`, since the plain `chkP()` checkbox this app
uses elsewhere has no `data-form-route` and so does not otherwise trigger a
live re-render) -- preserving the pre-37-4 UX of a card appearing
immediately on check, now without the pre-seeding bug. Unchecking hides
without deleting; rechecking restores the same records; a second check
after data already exists does not append a duplicate blank card.

PDF/Word output (`buildPlanInitialModel`/`buildPlanAnnualModel`, shared by
both formats) now gates the detail-card section on the executed flag, not
just on populated rows -- legacy/imported data that has records while
execution is unchecked no longer leaks into generated output.

Found and fixed one real regression while verifying: `schedule-card-layout.
spec.ts`'s Initial Plan fixture set `q11Directives` directly without ever
setting `q11Executed`, which only worked because cards rendered
unconditionally before this milestone -- exactly the bug being fixed. Fixed
by adding the flag to the fixture, matching the Annual Plan fixture beside
it that already had it.

Also found while implementing: the `BLANK_CARD_COLLECTIONS` config and
`pruneBlankCards()` in `src/legacy-app.js` are dead code, silently shadowed
at runtime by `src/core/form/prune-cards.js`'s module version (`window.
BLANK_CARD_COLLECTIONS = ...` / `window.pruneBlankCards = ...` on module
load overwrites the classic-script globals). `q11Directives` was added to
the real (module) config; the legacy-app.js copy was left alone with a note
explaining the shadowing, not edited, since editing it would have been
inert.

Verification: `tests/unit/plan-directive-cards.spec.js` (factory defaults +
PDF model gating, 7 tests), two new cases in `tests/unit/prune-cards.spec.js`,
`tests/e2e/plan-directive-cards.spec.ts` (2 tests, live checkbox/Add/Remove
interaction for both plans) -- all new, all passing. Regression: 164 unit
tests and 27 e2e tests (including both Plan types' full mount/export-PDF
suites, the readiness/export-gating contract, and schedule-card-layout.spec.ts
after its fixture fix), all passing. `npm run verify:data-model` passing
after updating `q10Directives`/`q11Directives`'s collection_min/max/
initial_item_count rows.

### Decision Recorded

On every form that uses repeatable advance-directive detail cards, those cards
must be created and displayed only after the filer checks **“The ward executed
advance directives (complete below)”** (or the form's semantically identical
executed-directives control). An unchecked execution control must not present a
wall of empty directive-detail cards.

This applies to the card-based controls currently identified in:

| Form | Execution control | Detail collection | Current condition |
|---|---|---|---|
| Initial Plan, Question 11B | `q11Executed` | `q11Directives` | Two blank cards are seeded and rendered even when the control is unchecked. |
| Annual Plan, Question 10 | `q10Executed` | `q10Directives` | Detail UI is already conditionally rendered, but a blank directive is seeded in state; retain and test the rule. |

The Simplified Plan's Question 8 is a set of directive-type checkboxes, not a
repeatable directive-card form, and is not changed by this item. Plan Minor has
no corresponding directive-card collection in the current implementation.

### Data-Preservation Rule

Unchecking the execution control hides the directive type controls, detail cards,
and Add Directive action; it does **not** silently delete already-entered
directive records. Rechecking restores those records. Deleting a populated
record remains an explicit per-card action with its normal affordance.

For a new or reset filing with the execution control unchecked, the directive
collection must be empty rather than pre-seeded. The first blank card is created
only when the user checks the execution control (or presses Add Directive while
that conditional section is visible). This changes the persisted collection's
default/minimum shape, so implementation must update the matching
`probate-guardian-data-model.csv` rows and run `npm run verify:data-model`.

### Implementation Plan

1. **Inventory and centralize the activation rule.** Use the executed-directives
   boolean as the sole gate for the corresponding repeatable card collection.
   Keep it independent of directive-type choices (DNR, healthcare, power of
   attorney, Other): selecting a type must not create or reveal cards before the
   executed control is true.
2. **Correct Initial Plan rendering.** In
   `src/features/plan-initial/index.js` `pagePlanIDirectives()`, conditionally
   render the Q11B type controls, `q11Directives` cards, and any card-creation
   control within `q11Executed`. Preserve the no-directives verification branch
   and all unrelated Questions 11E/11F behavior.
3. **Harden Annual Plan parity.** Retain the existing `q10Executed` conditional
   block in `src/features/plan-annual/index.js` and verify it controls every
   card-related element (heading, cards, remove controls, and Add Directive
   button). Align its empty-collection behavior with Initial Plan.
4. **Change factories and reset paths.** Replace the pre-seeded
   `q10Directives`/`q11Directives` blank cards in `src/core/state.js` and the
   relevant new-year/reset logic in `src/legacy-app.js` with empty collections.
   When the executed control transitions false → true, create exactly one
   `emptyPlanDirective()` record if the collection is empty, then re-render and
   persist through the normal form-event path. Do not append another blank card
   when records already exist.
5. **Review lifecycle boundaries.** Confirm imports, carryovers, prior-year
   creation, direct navigation, and pruning preserve populated directive records.
   `pruneBlankCards()` may remove untouched cards on navigation; that is correct
   only if the activated section continues to offer Add Directive and can create
   a new blank card without turning the execution checkbox off. The page renderer
   itself must handle `executed === true` with an empty collection: render the Add
   Directive affordance immediately, and create one blank row only when the user
   invokes it. Do not depend solely on the prior checkbox-change event.
6. **Maintain validation/output semantics.** Existing validations still require
   a coherent answer to the no-directives/executed-directives question. Do not
   require a card merely because the execution control is checked unless that
   requirement is separately verified and intentionally added. PDF/Word models
   must omit detail-card output when execution is unchecked, even if legacy data
   contains hidden records, and must restore it when execution is rechecked.
7. **Update the data-model contract.** Document the zero-card default and the
   conditional creation predicate for both collections in
   `probate-guardian-data-model.csv`, following the canonical schema contract.

### Acceptance Criteria

| Scenario | Expected result |
|---|---|
| New Initial Plan | With `q11Executed` unchecked, no Advance Directive cards, card fields, or card action are in the DOM. |
| New Annual Plan | With `q10Executed` unchecked, no Directive cards, card fields, or Add Directive action are in the DOM. |
| Check execution control | The relevant type controls and exactly one blank directive card appear for an empty collection. |
| Add directive | Adds a card only while the execution section is active. |
| Uncheck after entering data | Cards are hidden without loss; rechecking restores the same directive records. |
| Legacy/imported populated collection while unchecked | No detail card is displayed or emitted to PDF/Word until the execution control is checked. |
| Navigation/reset/carryover | No untouched directive cards are reintroduced before execution is selected; populated records are preserved according to the data-preservation rule. |
| Validation and export | The existing answer-required rule remains correct; hiding an inactive collection creates no unrelated validation error or export mismatch. |

### Verification Plan (for the later implementation)

1. Add focused unit tests for Initial and Annual default factories and yearly-reset
   paths: directive collections begin empty when execution is false.
2. Add UI/E2E tests for both forms covering false → true creation, true → false
   hiding with preservation, recheck restoration, and Add Directive behavior.
3. Add PDF/Word model tests for unchecked legacy populated data and checked
   populated data, verifying the detail section's presence is controlled by the
   execution predicate rather than collection contents alone.
4. Extend the existing card/pruning coverage for an activated-but-untouched
   directive card, then update `TEST-INDEX.md` for every added or repurposed test
   file.
5. Run `npm run verify:data-model` and focused tests during the later
   implementation; request permission before the full `npm test` run.

## Milestone 37-5: Explicit Yes/No Radio-Pair Migration

### Execution Boundary

This is the broadest implementation phase in Milestone 37. It deliberately
remains here, rather than being deferred to a new milestone, but must be
executed as one carefully bounded serial phase. Do not combine it with county
guidance, directive-card, signature-card, or Preview/Export UI changes in the
same implementation batch. Complete its shared renderer, all 18 migrations,
data-model reconciliation, save/import compatibility, and focused verification
before proceeding to the next component.

### Decision Recorded

Replace each identified single-checkbox or select implementation of an explicit
binary answer with an accessible **Yes / No radio pair** whose initial state is
unselected. The persisted representation remains `'' | 'Yes' | 'No'`:

- `''` means not yet answered;
- `'Yes'` and `'No'` are deliberate answers;
- existing saved `'Yes'`/`'No'` values select the matching radio on reopen.

This is a control and default-state migration, not an inference rule. It must
never turn an unselected answer into `No`, and it does not apply to independent
attestations, check-all-that-apply lists, directive-type lists, or other genuine
boolean flags.

### Candidate Inventory and Scope

The following 18 rendered controls are in scope. The canonical data model has
13 `Yes; No` rows; `common.amendedForm` is rendered in three filing contexts,
and three runtime fields require data-model correction described below.

| Filing / area | Field or control | Count |
|---|---|---:|
| Annual Accounting | `amendedForm`; `trusts[].hasTrust`; `trusts[].createdAfterGID`; `schD1[].restricted`; `schD2[].residence`; `schD2[].income`; `schD4[].restricted` | 7 |
| Simplified Accounting | `amendedForm`; `eligDepository`; `eligOnlyTransactions` | 3 |
| Simplified Plan | `q7RestoreRights`; `q9Remuneration` | 2 |
| Initial Plan | `committeeIncorporated`; `q11Directives[].courtRevoked` | 2 |
| Annual Plan | `q10Directives[].courtRevoked` | 1 |
| Minor Plan | `amendedForm`; `professionalGuardian`; `publicGuardian` | 3 |

`q10Directives[].courtRevoked` already uses a blank/Yes/No select; migrate it
to an initially-unselected radio pair for consistency. The Initial Plan version
is currently a single checkbox and must gain an explicit `No` answer.

The following are deliberately outside this 18-control migration:

1. The Initial and Annual Plan “no directives” versus “directives executed”
   checkbox pairs. They are semantically binary but currently use two booleans;
   converting them safely requires a separate boolean-pair-to-enum data-model
   migration and product wording decision.
2. Guardian Inventory's real booleans (`isAmended`, restricted/residence/income
   flags, and safe-deposit flags). These have boolean storage and optional,
   independent-flag semantics; converting them would be a separate schema change.
3. Certifications, directive types, `Other` flags, benefits, diagnosis/device
   lists, and every other multi-select or attestation checkbox.

### Required Cross-System Changes

1. **Shared rendering and accessibility.** Replace the legacy
   `yesNoCheckboxHTML()` path in `src/legacy-app.js` with a shared radio-pair
   renderer or a compatible successor. Each pair must use one shared `name`,
   visible Yes and No labels, an accessible group label (`fieldset`/`legend` or
   equivalent), stable ids, and the existing `data-form-path` event contract.
   Preserve the existing string values rather than introducing booleans. Update
   delegated input/change handling so radio controls write `event.target.value`
   (`'Yes'` or `'No'`), never checkbox-style `event.target.checked`.
2. **Feature migration.** Move every helper-based control in the inventory to
   that renderer. Replace the four bespoke Annual Accounting schedule controls
   in `src/features/annual-accounting/index.js` and both directive-record
   controls in the Plan feature modules so they use the same behavior and are
   not left as one-off checkbox/select implementations.
3. **Default and lifecycle reconciliation.** New factories, row factories, and
   add-row paths must initialize the 18 fields to `''`, not `'No'`. Remove
   display fallbacks that manufacture `No` (including trust and PDF/Excel
   consumers) when the model is unanswered. Existing save files with explicit
   `'No'` retain that answer; no save-file rewrite or schema-version migration is
   needed solely to preserve values already stored as strings.
4. **Validation and output audit.** Required binary fields must block output when
   `''` and accept either explicit answer. Optional fields may remain blank. Audit
   validators, readiness checks, PDF/Word models, Excel import/export, carryover,
   and output advisories so `''`, `'Yes'`, and `'No'` are never conflated by a
   truthiness test or an `|| 'No'` fallback.
5. **Plan tri-state compatibility.** Retain and extend the existing
   `plan-tristate` migration only where a Plan field can still arrive as legacy
   boolean `true`/`false`. It must keep converting those values to the matching
   strings while leaving omitted values unselected.
6. **Data-model corrections.** Update `probate-guardian-data-model.csv` in the
   same implementation:
   - add the missing `Yes; No` enum domain and tri-state/default notes for
     `plan_simplified.q9Remuneration`;
   - change `plan_initial.q11Directives[].courtRevoked` and
     `plan_annual.q10Directives[].courtRevoked` from unconstrained strings to
     the documented nullable Yes/No enum, with their conditional court-order
     details recorded accurately;
   - revise every affected `required_when`, default, and source-reference note.
   Run `npm run verify:data-model` after the CSV update.
7. **Save/import compatibility.** Add fixtures for current `.sav` archives,
   legacy Plan booleans, Excel Yes/No cells, blank values, and newly created
   records. Import must preserve a deliberate legacy `No`; a missing value must
   remain unanswered rather than becoming `No` during deserialization or export.

### Acceptance Criteria

| Scenario | Expected result |
|---|---|
| New in-scope field | Neither radio is selected; model value is `''`. |
| User selects Yes or No | Exactly one radio is selected and the model stores the matching string. |
| Required binary field left blank | The established validator/readiness/export path reports it as unanswered. |
| Existing saved Yes/No value | Reopens with the matching radio selected and preserves the same output. |
| Existing omitted value | Reopens with neither radio selected; it is never silently shown/exported as No. |
| Optional binary field | May remain unselected without creating a false validation failure. |
| PDF, Word, and Excel | Each emits the actual answer; it never invents No for an unanswered field. |

### Verification Plan (for the later implementation)

1. Add shared-renderer and event-contract unit tests for blank, Yes, No,
   keyboard operation, and accessible group naming.
2. Add one focused UI/E2E test for every inventory group, including the four
   bespoke Annual Accounting schedule fields and both directive-record controls.
3. Test factory defaults, row-add defaults, existing `.sav`/Excel import values,
   and generated PDF/Word/Excel output for blank, Yes, and No.
4. Update `TEST-INDEX.md` for every added or materially repurposed test and run
   `npm run verify:data-model`; request permission before full `npm test`.

## Milestone 37-6: Guardian and Co-Guardian Signature Cards

### Decision Recorded

Every filing's guardian-signature collection has exactly one primary Guardian
card by default. A co-guardian card appears only after the user explicitly
chooses **Add Co-Guardian**. Every card beyond index 0 has a visible **Remove**
action; the primary card cannot be removed.

Removing a blank co-guardian is immediate. Removing a populated co-guardian
requires a confirmation that identifies the guardian, because it deletes
persisted filing and linked-party data. Existing populated co-guardian records
from saves, imports, or an intentional carryover remain visible and are never
silently discarded just because they exceed the new one-card default. Entirely
blank, non-primary legacy padding is normalized away under an explicit
blank-row predicate, so reopening an old filing does not perpetuate unused
signature cards.

### Current Coverage

| Filing | Current initial guardian cards | Add/remove behavior | Required change |
|---|---:|---|---|
| Guardian Inventory | 1 | Add and non-primary Remove already available. | Retain; regression-test as the reference behavior. |
| Simplified Accounting | 3 | Add and non-primary Remove exist. | Change default to 1; retain actions. |
| Annual / Final / Trust Accounting | 3 | Add and non-primary Remove exist. | Change default to 1; retain actions. |
| Simplified Plan | 2 | Both cards always render; no add/remove. | Default/render 1; add explicit add/remove. |
| Annual Plan | 3 | All cards always render; no add/remove. | Default/render 1; add explicit add/remove. |
| Initial Plan | 4 | All cards always render; no add/remove. | Default/render 1; add explicit add/remove. |
| Minor Plan | 2 | Both cards always render; no add/remove. | Default/render 1; add explicit add/remove. |

### Implementation Plan

1. **Set the collection contract.** Keep `collection_min = 1` and each form's
   current maximum (Inventory/Accounting and Annual Plan: 3; Simplified Plan:
   2; Initial Plan: 4; Minor Plan: 2) unless a later court-form review changes a
   maximum. Change `initial_item_count` to 1 for every signature collection.
2. **Correct all factories and creation paths.** Update the factories in
   `src/core/state.js`, `emptyDataGuardian()` in `src/legacy-app.js`, and every
   carryover/conversion/new-year path that currently pads guardian or
   `planGuardians` arrays to two, three, or four blank rows. Carry forward an
   actually populated co-guardian; do not create blank padding to a maximum.
   On load, import, or the next safe lifecycle boundary, prune only wholly blank
   non-primary legacy padding with the same row-shape-aware definition used by
   the collection contract; never prune a partially entered record.
3. **Use shape-correct factories.** Do not reuse the generic
   `SCHEDULE_SCHEMAS.planGuardians` factory for every Plan: Initial, Annual,
   Minor, and Simplified Plan guardian rows have different stored shapes. Add a
   small per-filing guardian-row factory/operation layer that preserves each
   type's fields, max, party-id synchronization, save behavior, and route
   rerendering.
4. **Render from the collection, not fixed indexes.** Replace fixed
   `block(0)…block(n)` / `g(0)…g(n)` signature markup in all four Plan features
   with collection iteration. Render the primary card first, Add Co-Guardian
   beneath the collection while under its maximum, and a Remove button in every
   non-primary card header alongside Link Person.
5. **Align existing Accounting and Inventory behavior.** Retain their current
   explicit Add Co-Guardian and non-primary Remove controls, but route all
   removal through one floor-aware operation and add populated-card confirmation.
   Ensure party IDs remain lockstep with their guardian row when a card is
   removed. After removal is confirmed, fully rerender the signature-card list
   before accepting another field edit; array indices shift, so no retained DOM
   control may keep a stale `guardians.2.*` or `planGuardians.2.*` path.
6. **Preserve output and validation rules.** Guardian 1 stays required; an added
   co-guardian becomes conditionally required only when it has meaningful data.
   PDF/Word/Excel output must include every populated guardian and suppress only
   genuinely empty optional cards. The existing `guardianHasAnyData()` behavior
   is the minimum preservation threshold, not a reason to erase partial rows.
7. **Update data and save-file documentation.** Update every affected guardian
   and `planGuardians[]` collection row in `probate-guardian-data-model.csv` with
   `collection_min=1`, `initial_item_count=1`, actual maximum, correct row
   factory, and party-ID synchronization. Record that older files may contain
   additional blank rows, which are safely normalized out only when wholly
   blank; no populated guardian data may be destructively migrated. Run
   `npm run verify:data-model`.

### Acceptance Criteria

| Scenario | Expected result |
|---|---|
| New filing, all seven filing types | Exactly one guardian signature card appears. |
| Add Co-Guardian | Adds one blank, type-correct card; no more than the form maximum. |
| Remove blank co-guardian | Removes it and returns to the preceding collection size; primary remains. |
| Remove populated co-guardian | Requires confirmation, then removes its row and matching party-id entry only after confirmation. |
| Existing populated co-guardian | Displays after reopening/import/carryover and appears in output. |
| Existing blank pre-seeded card | Is normalized out under the blank-row predicate and is not displayed as a new co-guardian decision. |
| Primary guardian | Cannot be removed and continues to satisfy the existing required signature validation. |
| New-year/carryover conversion | Carries actual guardian data without manufacturing blank co-guardian cards. |

### Verification Plan (for the later implementation)

1. Add factory and collection-operation unit tests for every signature-row shape,
   min/max enforcement, party-id lockstep, and populated-card confirmation.
2. Add E2E coverage for all seven signature pages: one default card, add,
   remove, cancel removal, confirm removal, reopen, and output preservation.
3. Add conversion/carryover/new-year fixtures containing zero, one, and multiple
   populated guardians plus legacy blank padding.
4. Update `TEST-INDEX.md`, run `npm run verify:data-model` and focused tests,
   then request permission before the full suite.

## Milestone 37-7: Preview and Export Shell-Control Placement

### Decision Recorded

On every Print Preview / Preview & Export page, move the **All Filings (home)**,
**theme**, and **help** controls out of the `Viewing` pager bar and into the
`Preview & Export` banner. They must appear on the export-controls line,
immediately after the final export action — normally **Save as Word**, **Save as
PDF**, **Print**, and **Florida E-Filing Portal** (and after **Save as Excel** on
filings that offer it).

The controls remain non-printing shell controls and retain their current actions,
labels, keyboard behavior, theme state, and help-panel `aria-expanded` state.
Only their placement changes.

### Current Condition

`initPrintPager()` in `src/legacy-app.js` creates `#pv-bar` and appends
`.pv-shell-actions` to it, placing home/theme/help alongside the `Viewing` page
selector and pager navigation. Each of the seven print modules independently
renders a `.print-preview-banner` with its own export-button row. The two groups
are therefore structurally separate today.

### Implementation Plan

1. Add one explicit, non-printing shell-action destination to each of the seven
   print banners: Guardian Inventory, Simplified Accounting, Annual/Final/Trust
   Accounting, Simplified Plan, Annual Plan, Initial Plan, and Minor Plan. Use a
   shared marker/class rather than selecting a generic flex container by position.
2. In `initPrintPager()`, continue to obtain the existing header actions
   when available (or create the same fallback home/theme/help controls), but
   append them to that destination rather than to `#pv-bar`. Remove the pager-bar
   fallback placement once every print surface provides the destination.
3. Preserve visual ordering: the export status and Save/Print/Portal buttons stay
   in their present order; shell actions follow the last action on the same
   wrapping flex row. On narrow screens, they may wrap as a group beneath the
   export buttons, never back into the Viewing row.
4. Keep `#pv-bar` focused only on preview selection, page count, and Prev/Next.
   It must not render an empty shell-action spacer after the move.
5. Update responsive CSS for the banner action row and `.pv-shell-actions` so
   icon-only theme/help controls and the labeled home control retain adequate
   target size, spacing, focus outlines, and an unambiguous reading/tab order.
6. Preserve the pager's current sticky/docked navigation behavior while moving
   only shell controls. Verify the banner remains discoverable without making
   page selection or Prev/Next less convenient during long-document review.
7. Do not change print/PDF/Word/Excel output or persistent data. This is a DOM
   and CSS-only layout change; no data-model or save-file update is needed.

### Acceptance Criteria

| Scenario | Expected result |
|---|---|
| Any print preview | Home, theme, and help are absent from the `Viewing` pager bar. |
| Export banner | The same controls immediately follow the final available export action on the Preview & Export action line. |
| Accounting with Excel | Shell controls follow Florida E-Filing Portal, which follows the Excel action where available. |
| Plan-only PDF/Word output | Shell controls follow Florida E-Filing Portal after Word, PDF, and Print. |
| Responsive layout | At narrow widths the controls wrap cleanly with export controls and do not obscure pager selection/navigation. |
| Long-document navigation | The pager remains docked/sticky as before; moving shell controls does not make page selection or Prev/Next less convenient. |
| Interaction/accessibility | Home still returns to All Filings; theme changes persist; help opens/closes with correct ARIA state; keyboard order follows visible order. |
| Print | None of the moved shell controls appear in printed or exported court output. |

### Verification Plan (for the later implementation)

1. Add focused DOM/E2E assertions across all seven print surfaces for the action
   container, ordering, absence from `#pv-bar`, and no duplicate ids.
2. Exercise home, theme, and help from the new location, including a rerender,
   page selection change, and filing switch.
3. Add desktop and narrow-width layout checks for wrapping, focus visibility, and
   pager usability; update `TEST-INDEX.md` for added or repurposed tests.
4. Run focused tests during implementation and request permission before the full
   `npm test` suite.

## Implementation Gate

Do not start 37-1 through 37-7 until the requester finishes adding Milestone 37
items and explicitly authorizes execution. At that time, confirm the exact local
source and current statutory text before finalizing user-facing legal wording.
