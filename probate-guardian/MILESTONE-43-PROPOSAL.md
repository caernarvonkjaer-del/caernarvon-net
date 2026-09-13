# Milestone 43: Test-Suite Hygiene — Executable Delivery Index

## Status

**Index of independently approvable sub-deliveries.** Approving or landing
one does not authorize another — each still requires its own explicit
approval by name, per `AGENTS.md` §2, before implementation. All eight are
marked **Independent**: none blocks another, and none blocks Milestone 41
or anything else in flight.

**43A landed 2026-09-13** (`514d0c5`); a real bug found while verifying its
premise landed separately (`7794180`) — see 43A's own "What landed and
what was corrected" section. **43B–43H remain Draft**, not yet approved.

**Source:** two read-only test-suite audits run this session (2026-09-13),
via parallel read-only research passes (no edits made in either): the
first covering all 123 spec files (`tests/unit/*.spec.js`,
`tests/e2e/*.spec.ts`) before Milestone 42 landed; the second re-verifying
every finding from the first against `master` at `3890669` (Milestone 42
fully landed: 42A–42H) and auditing the ~1,900 lines of new/changed test
code 42 itself introduced. **Of the 31 findings from the first pass, zero
were incidentally resolved by Milestone 42** — 42 touched validators, the
`window.*` bridge, form-write paths, and dead-code deletion, none of which
overlapped the specific files this milestone targets. All 31 are
re-confirmed below at current line numbers; four new findings from
Milestone 42's own new test code are folded in alongside them (43A, 43B,
43H).

A handful of the highest-stakes citations (the dead `milestone-38e.spec.js`
file, the `window-bridge.spec.js` vacuous assertion, the
`party-dedupe.spec.ts`/`party-resolver.spec.ts` duplicate describe title,
`window-api.ts`'s zero import count) were independently re-verified a third
time, directly, while drafting this document — not just carried over from
the audit passes.

## How this index is organized

Each sub-delivery states: **Relation** (to other in-flight milestones),
**Risk**, **Files**, **Decisions Required** (with a recommended default
where one is warranted), numbered **Steps**, and a **Verification** block.
Sizing and format deliberately mirror `MILESTONE-42-PROPOSAL.md`'s index
structure, since this is the same kind of work — independently-landable
hygiene, not a single all-or-nothing delivery.

| Sub-delivery | Theme | Size | Status |
| --- | --- | --- | --- |
| 43A — Delete or Fix Vacuous/Dead Tests | Correctness of the tests themselves | Small | **Landed** |
| 43B — Replace Source-Text Proxy Tests with Real Behavioral Tests | Correctness of the tests themselves | Medium | Draft |
| 43C — De-duplicate Redundant Cross-File Coverage | Redundancy | Small–medium | Draft |
| 43D — Split Poorly-Scoped Catch-All Files | Scoping/organization | Medium | Draft |
| 43E — PDF/Signature Cluster: Table-Driven Refactor + Fixture Dedup | Redundancy, largest by line count | Large | Draft |
| 43F — Close Real Coverage Gaps | Missing coverage | Medium | Draft |
| 43G — Test-Overhead & Granularity Fixes | Test performance/isolation | Small–medium | Draft |
| 43H — Adopt or Retire `window-api.ts` | Dead infrastructure from 42C | Small, decision-required | Draft |

**Sequencing:** none required. Every sub-delivery names its own file set;
the only overlap between any two is 43E and 43F both touching
`plan-pdf-wcag-compliance.spec.ts` (43E's table-driven refactor, 43F's new
axe checks) — land 43E first so 43F's new per-type axe assertions are
added to the refactored loop rather than duplicated four more times, but
either can be approved alone; a solo 43F would just mean writing the axe
checks four times and collapsing them when/if 43E lands later.

---

## 43A — Delete or Fix Vacuous/Dead Tests

**Status: Landed 2026-09-13** (`514d0c5`, plus a real bug fix found while
verifying this section's own premise, `7794180`). See "What landed and
what was corrected" below.

**Relation:** Independent. **Risk:** Low — deletes or rewords tests that
verify nothing today; no behavior change to `src/`.

### Files

`tests/unit/milestone-38e.spec.js` (deleted), `tests/unit/window-bridge.spec.js`.

### Decisions Required

1. **DECISION (recommended default): delete `milestone-38e.spec.js`
   entirely**, rather than fix its guard. Confirmed by direct read and by
   running it: all 3 tests wrap every `expect()` in
   `if (win && win.normalizeWardData)` / `if (win.calc)`, using
   `typeof window !== 'undefined' ? window : globalThis`. This suite runs
   in Node with no jsdom (`vitest.config.ts`), so `window` is never
   defined and `globalThis.normalizeWardData`/`.calc` are never set —
   every guard is always false and zero assertions ever execute (3/3
   "pass" with nothing asserted). The three behaviors it claims to cover
   are already exercised for real elsewhere: tri-state normalization in
   `tests/unit/guardian-inventory-yes-no-radio.spec.js` and
   `tests/unit/plan-tristate.spec.js`; restricted/unrestricted asset math
   in `tests/unit/annual-accounting-totals.spec.js`. Fixing the guard
   instead (e.g. importing the real functions and calling them directly)
   would just turn this into a fourth copy of coverage that already
   exists cleanly elsewhere — delete, don't repair.
2. **DECISION (recommended default): keep `window-bridge.spec.js`'s
   "stale allow-list entries" check informational, but stop shaping it as
   an assertion.** Its second test (`:32-37`) ends in
   `expect(true).toBe(true)` — confirmed present verbatim. This is
   deliberate design from Milestone 42C (a removed global must never fail
   the spec, "that is progress"), not a bug to silently "fix" into a real
   assertion — respect that intent. The actual problem is presentation:
   wrapping a no-op in `it(...)` makes it count as a passing test in any
   suite-wide test-count summary despite verifying nothing. Move the
   `console.info` diagnostic into a `beforeAll`/reporter hook instead of
   its own `it()` block, so the file's 4 real assertions (undeclared
   globals, `.d.ts` sync, triple-shadow guard, plus whichever this
   collapses into) aren't undercounted by a phantom fourth.

### Steps

1. `git rm tests/unit/milestone-38e.spec.js`. Remove its `TEST-INDEX.md`
   row (line number TBD at implementation time — re-grep, do not assume).
2. In `window-bridge.spec.js`, move the stale-entry diagnostic out of
   `it('reports stale allow-list entries as a hint, never a failure', ...)`
   into a `beforeAll(() => { ... console.info(...) ... })` at the top of
   the `describe` block; delete the now-orphaned `it()` wrapper and its
   `expect(true).toBe(true)`.

### Verification

`npx vitest run tests/unit/window-bridge.spec.js` — 3 real assertions,
green, diagnostic still prints when the allow-list has stale entries
(verify by temporarily adding a fake stale entry to a throwaway copy of
the allow-list fixture, confirming the message still prints, then
discarding the copy — do not touch the real fixture). Full unit suite
green after `milestone-38e.spec.js`'s removal (nothing else imports it —
confirm via `grep -rn "milestone-38e" tests/` returning only
`TEST-INDEX.md`'s own row before this step, nothing after).

### What landed and what was corrected

Both decisions landed as written. **Decision 1's stated justification was
wrong, and was not silently fixed** — recorded here per this repo's
convention: the claim that tri-state normalization and restricted/
unrestricted asset math are "already exercised for real elsewhere" does
not hold. Direct grep before deleting found `normalizeWardData` and
`calc.restrictedCash`/`unrestrictedCash`/`restrictedIntang`/
`unrestrictedIntang` are defined *only* in `legacy-app.js` as classic-script
`window.*` functions (`:6353`, `:6318`) with no ES-module counterpart and
no other test file referencing them by name — `guardian-inventory-yes-no-radio.spec.js`
and `plan-tristate.spec.js` don't call `normalizeWardData`;
`annual-accounting-totals.spec.js` tests a wholly different (Annual
Accounting, not Guardian Inventory) calculation. Since this suite runs in
Node with no jsdom, there is no unit-test path to these functions at all —
real coverage would require e2e (a real browser/`window`). **Deleted
anyway**, since the guards genuinely never execute today regardless of
whether replacement coverage exists — but the coverage gap for
`normalizeWardData()`/`window.calc`'s four asset-math functions is real
and open, not closed by this deletion. Worth a small follow-up: an e2e
test creating a Guardian Inventory ward with legacy boolean-shaped
schedule data (`isRestricted: true` etc.) and confirming both the
on-screen totals and `normalizeWardData`'s conversion behave correctly.

**Tracing why led to a live, unrelated bug, fixed separately
(`7794180`):** `src/features/guardian-inventory/pdf-model.js`'s Schedule
B-1 "Restricted?"/"Restricted Amt" PDF columns and subtotal read
`r.isRestricted` — the same legacy boolean field `normalizeWardData()`
migrates *from* but never clears. Since the current UI's radio writes only
`r.restricted` ('Yes'/'No'/''), `isRestricted` is `undefined` on every row
entered through the current UI, so this column and subtotal always showed
"No"/"—"/$0.00 in the actual exported PDF regardless of what the filer
selected. `window.calc`'s on-screen totals (`legacy-app.js:6344-6347`) and
`excel.js`'s export (`:147, :187`) already read `restricted` correctly
(with a same-line `isRestricted` fallback for genuinely pre-migration
data) — `pdf-model.js` now matches that pattern. New regression test
confirmed failing against pre-fix code first.

**A second, related instance was found but not fixed in this pass** — out
of scope for 43A, flagged here rather than silently left for a future
reader to rediscover: `legacy-app.js:4813-4829`'s
`convertGuardianSchedulesToAnnual()` (the Guardian Inventory → Annual
Accounting "Convert Ward" carryover) reads `r.isRestricted` (`:4816,
:4827`) and `r.isPersonalResidence`/`r.isIncomeProperty` (`:4820`) with no
`restricted`/`residence`/`income` fallback at all — worse than
`pdf-model.js`'s bug, since there isn't even a same-line OR. A conversion
from a current-schema Guardian Inventory ward likely carries every
Schedule D-1/D-2/D-4 row into the new Annual Accounting filing as
"No"/blank for these fields regardless of the source data. Not verified
end-to-end and not fixed here — this needs its own red/green test and its
own commit, scoped separately since it touches the ward-conversion path
`MILESTONE-40H-PROPOSAL.md` Task 40H-I and `MILESTONE-41B-PROPOSAL.md`
already both touch, and deserves that same care rather than being bundled
into a test-hygiene delivery.

---

## 43B — Replace Source-Text Proxy Tests with Real Behavioral Tests

**Relation:** Independent. **Risk:** Low-medium — rewrites test bodies
only; no `src/` change. The risk is entirely in getting the *replacement*
assertions right, not in touching production code.

### Files

`tests/unit/guardian-inventory-yes-no-radio.spec.js`,
`tests/unit/yes-no-radio-migration.spec.js`,
`tests/unit/form-write-side-effects.spec.js`.

### Background

Four tests across three files check `sourceCode.toContain('literal
string')` or slice a function's source text with string
`indexOf`/`lastIndexOf`, instead of invoking the real function and
asserting on its output. These are fragile in the specific way that
matters: a harmless reformat (whitespace, quote style, argument order in
an unrelated part of the same line) breaks the test with zero behavior
change, while a real behavioral regression that happens to preserve the
matched substring sails through green. `tests/unit/bar-number.spec.js:11-26`
already shows the correct pattern in this repo — it extracts
`formatBarNumber` from its source and calls it directly rather than
grepping for a literal — use that as the template for all four rewrites
below.

### Decisions Required

None — this is a mechanical correctness fix with an established in-repo
pattern to follow; no judgment call needed on approach, only on individual
assertion wording during implementation.

### Steps

1. **`guardian-inventory-yes-no-radio.spec.js:10-49`** — replace
   `legacyCode.toContain(...)`/`inventoryCode.toContain(...)` checks with
   direct calls to `yesNoRadioHTML(name, ...)` (import from its real
   module), asserting on the returned HTML string's actual attributes
   (`name=`, `value=`, checked state) rather than matching a hand-typed
   literal snippet against raw source.
2. **`guardian-inventory-yes-no-radio.spec.js:57-73`** — replace the
   `indexOf`/`lastIndexOf` ordering check (which would pass even if
   `<fieldset>`/`<legend>` were merely sequenced, not nested) with a real
   nesting check: parse the rendered markup with a minimal stack-based tag
   matcher (no jsdom available in this Node-only suite — a small
   hand-rolled open/close-tag stack over the returned HTML string is
   sufficient and does not require adding jsdom as a dependency) and
   assert the `<legend>` for each pair is a direct child of its
   `<fieldset>`, not just textually between an open and a later close tag.
3. **`yes-no-radio-migration.spec.js:14-40`** — same fix as Step 1, applied
   across the legacy/annual/initial call sites this file checks.
4. **`form-write-side-effects.spec.js:79-113`** (new in Milestone 42D,
   never previously reviewed) — its `bodyOf()` helper slices a function's
   source text and checks for `runFieldWriteSideEffects(path, control)`
   textually. Replace with the pattern the file's *own first* describe
   block already uses (confirmed present in the same file): mock
   `window.autoSave`/`updateNavDots`/`refreshWardInfoCard`/
   `identitySlotForPath`/`syncIdentityField`, trigger a real write through
   each of the three binding conventions
   (`data-form-path`/`data-annual-path`/`data-bind`), and assert all four
   mocks fire exactly once. This makes the second describe block consistent
   with the first instead of the one source-text outlier in an otherwise
   behavioral file.

### Verification

`npx vitest run tests/unit/guardian-inventory-yes-no-radio.spec.js
tests/unit/yes-no-radio-migration.spec.js
tests/unit/form-write-side-effects.spec.js` green. For each rewritten
test, confirm it would have caught a real regression: temporarily
`git stash` a one-character change to the relevant `src/` function (e.g.
flip a `checked` attribute, break the fieldset nesting, remove one
`runFieldWriteSideEffects` call site) and confirm the new test fails, then
`git stash pop` — this repo's standard red/green discipline, not
optional for a "these tests were lying" fix.

---

## 43C — De-duplicate Redundant Cross-File Coverage

**Relation:** Independent. **Risk:** Low — removes duplicate assertions
only after confirming the surviving copy covers the same ground.

### Files

`tests/unit/circuit-lookup.spec.js`, `tests/unit/filing-county-defaults.spec.js`,
`tests/unit/types-contract.spec.js`, `tests/unit/field-kind-inference.spec.js`,
`tests/unit/form-contract.spec.js`, `tests/e2e/party-dedupe.spec.ts`,
`tests/e2e/party-resolver.spec.ts`, `tests/unit/plan-annual-parity.spec.js`,
`tests/unit/plan-initial-parity.spec.js`, `tests/unit/plan-minor-parity.spec.js`,
`tests/unit/plan-simplified-parity.spec.js`,
`tests/unit/support/plan-readiness-parity.js`.

### Decisions Required

1. **DECISION (recommended default): `circuit-lookup.spec.js` is the
   canonical home for blank-input null-safety on `circuitForCounty()`/
   `getCircuitOrdinal()`/`getFloridaCircuitCourtCaption()`.** All three
   functions are defined in `src/core/pdf/circuit-lookup.js` — confirmed
   by direct read — matching that spec file's own name. Remove the
   duplicate blank-county re-verification from
   `filing-county-defaults.spec.js:93-108`, keeping that file's genuinely
   distinct concern (county *default assignment* behavior) intact.
2. **DECISION (recommended default): `form-contract.spec.js` is the
   canonical home for `getControlKind()`.** Defined in
   `src/core/form/form-contract.js:202` — confirmed by direct read —
   matching that spec file's name. Remove the duplicate coverage from
   `types-contract.spec.js:43-51` and `field-kind-inference.spec.js:91-103`,
   confirming first that `form-contract.spec.js:294-317`'s existing
   coverage already includes every path/kind pair the other two test
   (diff the three assertion sets before deleting either copy; add any
   pair the other two had that `form-contract.spec.js` doesn't, rather
   than silently dropping coverage).
3. **DECISION (recommended default): disambiguate, don't dedupe, the
   `party-dedupe.spec.ts`/`party-resolver.spec.ts` describe-title
   collision.** Confirmed by direct read: both
   `party-dedupe.spec.ts:10` and `party-resolver.spec.ts:337` declare
   `test.describe('party de-duplication (Milestone 7)', ...)` verbatim.
   Unlike the two pairs above, this is not true duplicate coverage — the
   two files test complementary things (per the original audit) — so the
   fix is renaming one title, not removing tests. Rename
   `party-resolver.spec.ts:337`'s block to
   `'party de-duplication via resolver (Milestone 7)'` (it already has an
   unrelated sibling describe at `:11`, so this is a within-file second
   block, not a whole-file rename) so grep/reporter output disambiguates
   the two.
4. **DECISION (recommended default): extract the four `plan-*-parity.spec.js`
   files' duplicated `global.window` stub into
   `tests/unit/support/plan-readiness-parity.js`.** That shared module
   already exists (from Milestone 37) and already exports
   `withOverrides`/`autoById`, but never absorbed the ~30-40 line
   `PLAN_RIGHTS`/`PLAN_ADLS`/`PLAN_BENEFITS`/formatter window-stub
   boilerplate each of the four files still hand-copies
   (`plan-annual-parity.spec.js:9-49`, `plan-initial-parity.spec.js:14-45`,
   `plan-minor-parity.spec.js:10-31`, `plan-simplified-parity.spec.js:15-33`
   — confirmed present at these ranges in current `master`). Add a
   `createPlanTestWindowStub()` export there; have all four import and
   call it in their `beforeEach`, deleting their local copies. This also
   removes the risk the original audit flagged: the four copies can
   silently drift (a rights/ADL list changing in one but not the other
   three) since nothing currently enforces they stay identical.

### Steps

1. Diff `form-contract.spec.js:294-317`'s `getControlKind` assertions
   against `types-contract.spec.js:41-53`'s and
   `field-kind-inference.spec.js:91-103`'s; port over any path/kind pair
   missing from `form-contract.spec.js`, then delete the two duplicate
   blocks.
2. Delete `filing-county-defaults.spec.js:93-108`'s blank-county
   re-verification (keep `circuit-lookup.spec.js:47-95`'s as canonical);
   confirm no other assertion in `filing-county-defaults.spec.js` depended
   on that block running first (e.g. shared mutable fixture state).
3. Rename `party-resolver.spec.ts:337`'s describe title as above.
4. Add `createPlanTestWindowStub()` to
   `tests/unit/support/plan-readiness-parity.js`; update all four
   `plan-*-parity.spec.js` files to use it; delete their local stub
   blocks.

### Verification

`npx vitest run tests/unit/circuit-lookup.spec.js
tests/unit/filing-county-defaults.spec.js tests/unit/types-contract.spec.js
tests/unit/field-kind-inference.spec.js tests/unit/form-contract.spec.js
tests/unit/plan-annual-parity.spec.js tests/unit/plan-initial-parity.spec.js
tests/unit/plan-minor-parity.spec.js tests/unit/plan-simplified-parity.spec.js`
and `npx playwright test tests/e2e/party-dedupe.spec.ts
tests/e2e/party-resolver.spec.ts` — all green, same assertion count or
higher (never lower) per file after consolidation.

---

## 43D — Split Poorly-Scoped Catch-All Files

**Relation:** Independent. **Risk:** Low for the reorganization itself;
**medium** specifically for Step 1 (the `isPart8Complete` reimplementation)
since it's a real test-integrity gap, not just organization — treat it
with the same care as any test that currently can't catch a real
regression.

### Files

`tests/unit/content-corrections.spec.js`, `tests/unit/case-file.spec.js`,
`tests/e2e/routes.spec.ts`, `tests/e2e/attestation-layout.spec.ts`,
`tests/e2e/schedule-card-layout.spec.ts`,
`tests/e2e/verified-inventory-workflow.spec.ts`,
`tests/unit/amended-form-line.spec.js`, `tests/unit/filing-descriptor.spec.js`.

### Decisions Required

1. **DECISION (recommended default, highest-priority item in this
   sub-delivery): fix `content-corrections.spec.js:35-38`'s hand-reimplementation
   of `isPart8Complete` before splitting the file.** Confirmed present:
   the test reimplements the completeness check locally rather than
   importing the real function, meaning it verifies a copy of the logic,
   not the shipped code — it cannot catch a regression in the actual
   `isPart8Complete`. Import and call the real function instead. This is
   worth doing regardless of whether the rest of the file gets split.
2. **DECISION (recommended default): split `content-corrections.spec.js`**
   into its five actually-unrelated concerns (AO-2024-025 source-grep,
   Part 8 completeness — now fixed per Decision 1, date formatting, PDF
   clerk-instructions text, Schedule C-2 placeholder string) — fold each
   into the spec file that already owns that concern where one exists
   (date formatting duplicates `date-parser.spec.js`'s coverage of
   `formatDisplayDate` already — consolidate there per the same
   reasoning as 43C, don't just relocate the duplicate) rather than
   inventing new files for a five-line concern.
3. **DECISION (recommended default): merge `attestation-layout.spec.ts`
   into `schedule-card-layout.spec.ts`.** Confirmed: `TEST-INDEX.md`
   still files it under `pdf-export`, but it never touches a PDF or print
   route — it's pure responsive-CSS-grid column counting, using the
   identical bounding-rect-X-coordinate technique
   `schedule-card-layout.spec.ts` already uses against a different card
   class. One file, one technique, correctly categorized.
4. **DECISION NEEDED (genuinely open): how far to split `case-file.spec.js`
   and `routes.spec.ts`.** Both bundle multiple concerns but neither has a
   Decision-1-style correctness defect — this is pure organization, lower
   priority than Decisions 1-3. Two options:
   - (a) Split each into multiple files matching their actual concerns
     (`case-file.spec.js` → crypto/ZIP-packaging/save-timestamp/legacy-syntax-guard;
     `routes.spec.ts` → routing-proper + a renamed
     `dashboard-shell-ui.spec.ts` for the triage/modal/accordion/dark-mode
     tests it actually mostly contains).
   - (b) Leave the files as-is but add a one-line comment at the top of
     each naming its actual scope, and factor `routes.spec.ts`'s
     4x-copy-pasted inline-event-handler DOM audit
     (`:87, :113, :255, :323` — confirmed present at these lines) into one
     shared helper regardless.
   **No recommended default** — (a) is more correct long-term but touches
   `TEST-INDEX.md` categorization non-trivially for two files with real
   history; (b) is cheaper and fixes the one concrete duplication
   (the copy-pasted locator string) without a file-identity churn. Pick
   at implementation-approval time.
5. **DECISION (recommended default): split `verified-inventory-workflow.spec.ts`'s
   single mega-`test()`** (label associations, guided-tour-absence,
   case-number normalization, a save-event hook, Schedule B-2 DOM
   stability, D-3 radio flow — six unrelated concerns in one test body,
   confirmed present) into six independently-reportable tests, so one
   failure doesn't mask the other five's results.
6. **DECISION (recommended default): move `amended-form-line.spec.js`'s
   second describe block** ("Annual-family filing identity in generated
   output," Final/Trust header/attestation/footer copy — confirmed
   unrelated to the file's own "'Amended Form?' prints..." focus) into
   `filing-descriptor.spec.js`, which already owns filing-identity
   concerns.

### Steps

1. Fix `content-corrections.spec.js:35-38` to import and call the real
   `isPart8Complete` (locate its module — likely
   `src/core/filing/output-preflight.js` or a validation module; confirm
   exact export path before writing the import).
2. Per Decision 2, relocate `content-corrections.spec.js`'s date-formatting
   assertions into `date-parser.spec.js` (after confirming they're truly
   redundant, not testing a distinct edge case); leave the remaining three
   concerns in `content-corrections.spec.js` or split further per
   reviewer preference — this file's five-way split is the lowest-stakes
   item in this sub-delivery.
3. Merge `attestation-layout.spec.ts`'s tests into
   `schedule-card-layout.spec.ts`; delete the empty former file; update
   `TEST-INDEX.md`.
4. Resolve Decision 4 (case-file.spec.js / routes.spec.ts split-or-comment)
   per whichever option is approved; if (b), factor the 4x-copied
   inline-handler locator into one `assertNoInlineEventHandlers(page,
   selector)` helper in `tests/e2e/support/`.
5. Split `verified-inventory-workflow.spec.ts`'s one test into six.
6. Move `amended-form-line.spec.js:71-105` into `filing-descriptor.spec.js`.

### Verification

Full targeted run of every touched file, green, with equal or greater
assertion count per concern than before the split (a split must not
silently drop coverage). Update `TEST-INDEX.md` in the same commit(s) per
`AGENTS.md` §7 — `tests/unit/test-index-guard.spec.js` (Milestone 42A) will
catch a missed row automatically.

---

## 43E — PDF/Signature Cluster: Table-Driven Refactor + Fixture Dedup

**Relation:** Independent, but land before 43F if both are approved (see
Sequencing above). **Risk:** Medium — the largest sub-delivery by line
count; mitigated by converting proven-identical hand-repeated bodies into
a loop (mechanical, low behavioral risk) rather than rewriting assertions.

### Files

`tests/e2e/signature-capture.contract.spec.ts`,
`tests/e2e/plan-pdf-wcag-compliance.spec.ts`,
`tests/e2e/output-semantics.artifact.spec.ts`,
`tests/e2e/supplemental-pdf-accounting.spec.ts`,
`tests/e2e/pdf-evidence-lab.spec.ts`,
`tests/e2e/pdf-accessibility-and-signatures.spec.ts`,
`tests/e2e/pdf-preview-viewer.spec.ts`, `tests/e2e/pdf-annotate.spec.ts`.

### Decisions Required

1. **DECISION (recommended default): convert `signature-capture.contract.spec.ts`'s
   795 lines / 6 hand-repeated describe blocks** (Plan Simplified, Plan
   Annual, Plan Initial, Plan Minor, Simplified Accounting, Annual
   Accounting, Guardian Inventory — confirmed unchanged since the original
   audit) **into one `CONFIGS`-driven loop**, following
   `output-semantics.artifact.spec.ts`'s existing pattern in the same
   directory. Each block currently reimplements "legacy migration /
   Unsigned passes / incomplete blocks / Stamp draws+paints" near-identically
   by hand; this is the single largest de-duplication opportunity in the
   whole suite by line count.
2. **DECISION (recommended default): convert `plan-pdf-wcag-compliance.spec.ts`'s
   4 hand-duplicated per-Plan-type bodies into a `FEATURES`-style loop**,
   matching the pattern `pdf-preview-viewer.spec.ts` already established
   for the same four types. Land this before 43F's new axe assertions
   (Decision in 43F) so they're added once to the loop, not four times.
3. **DECISION (recommended default): consolidate the 4-file
   supplemental-PDF-insertion fixture duplication.** Confirmed unchanged:
   `output-semantics.artifact.spec.ts:213-283`,
   `supplemental-pdf-accounting.spec.ts`, `pdf-evidence-lab.spec.ts:12-69`,
   and `pdf-accessibility-and-signatures.spec.ts:237-353` each independently
   build a mock `createJsPdfInstance()` attachment and assert it surfaces
   after its schedule heading — two files even share the identical ward
   name/case number/dates (a copy-paste tell). Extract one shared fixture
   builder (`buildSupplementalAttachmentFixture(scheduleKey, filingType)`)
   into `tests/e2e/support/`, used by all four call sites, rather than
   four independent near-identical blocks.
4. **DECISION (recommended default): fold `pdf-evidence-lab.spec.ts`'s
   pager test into `pdf-preview-viewer.spec.ts`'s existing `FEATURES`
   loop** (confirmed still duplicated: both assert `#pv-count` reads
   `Page 1 of N` and preview/finalized page counts agree). After folding,
   evaluate whether `pdf-evidence-lab.spec.ts`'s one remaining distinct
   contribution (a canvas non-white-pixel count plus screenshot/JSON
   `testInfo.attach()` dumps) is worth keeping as a standalone file or
   should be deleted as debugging-session scaffolding rather than a
   durable regression guard — **no recommended default on deletion**,
   flag for reviewer judgment once the pager-test overlap is gone and the
   file's remaining size/value is visible in isolation.
5. **DECISION (recommended default): strengthen two confirmed-still-weak
   assertions.** `pdf-evidence-lab.spec.ts:66`
   (`nonWhitePixels > 0`, satisfied by a single stray dark pixel anywhere)
   and `pdf-annotate.spec.ts:132` (`pdfBytes.length > 0`, a transport-only
   check) — for the evidence-lab one, replace or augment with the same
   real text-extraction check `pdf-annotate.spec.ts` already uses
   *later in the same test* (per the original audit's own note that this
   file already has a stronger re-parsed-annotation check elsewhere) —
   use that existing stronger pattern as the template rather than
   inventing a new verification method.

### Steps

1. Refactor `signature-capture.contract.spec.ts` per Decision 1.
2. Refactor `plan-pdf-wcag-compliance.spec.ts` per Decision 2.
3. Extract and adopt the shared supplemental-attachment fixture per
   Decision 3, across all four call sites.
4. Fold the pager test per Decision 4; resolve `pdf-evidence-lab.spec.ts`'s
   remaining-file question at that point, not before (its actual residual
   size after Step 4 is the deciding factor).
5. Strengthen the two weak assertions per Decision 5.

### Verification

Full targeted run of every touched file. For the two table-driven
conversions (Steps 1-2): confirm identical pass/fail behavior per filing
type before and after — run once on the pre-refactor code, capture the
per-type results, refactor, re-run, diff. Full `npm test` recommended
before commit given this touches the PDF/signature path across every
filing type (per `AGENTS.md`'s cross-cutting-change rule).

---

## 43F — Close Real Coverage Gaps

**Relation:** Independent; sequence after 43E if both approved (see
Sequencing above). **Risk:** Low — additive coverage only, no existing
test's behavior changes.

### Files

`tests/e2e/plan-pdf-wcag-compliance.spec.ts`,
`tests/e2e/pdf-table-semantics.spec.ts`, `tests/e2e/pdf-fonts-and-xmp.spec.ts`,
`tests/e2e/schedule-docs-period-key.spec.ts`, `tests/e2e/convert-ward.spec.ts`.

### Decisions Required

1. **DECISION (recommended default): add real axe-core WCAG scans to
   `plan-pdf-wcag-compliance.spec.ts`** for all four Plan types. Confirmed
   unchanged: the file has no axe-core scan today, only a `StructTreeRoot`
   regex and a few text-contains checks, despite its name. The only real
   axe check anywhere in this cluster is Guardian-Inventory-only
   (`pdf-form-specific.spec.ts:538`) — use that call site as the template.
   If 43E lands first, add this once to the refactored loop; if not, write
   it four times and note the near-term duplication in the commit message
   for 43E to later collapse.
2. **DECISION (recommended default): extend deep structural PDF checks
   (`/ColSpan`, embedded fonts, PDF-UA/XMP metadata) beyond
   Guardian-Inventory to at least Annual Accounting and one Plan type.**
   Confirmed unchanged: `pdf-table-semantics.spec.ts` and
   `pdf-fonts-and-xmp.spec.ts` exclusively call
   `buildVerifiedInventoryModel` (Guardian-only). A regression in
   Annual/Trust/Final or any Plan type's table/font/PDF-UA output would
   ship undetected today. Scope this to Annual Accounting first (highest
   real-world usage after Guardian Inventory) rather than all nine types
   at once.
3. **DECISION (recommended default): add real DOM/focus/collapse
   assertions to `schedule-docs-period-key.spec.ts`.** Confirmed
   unchanged: its own header comment describes the original bug concern
   as a stale heading, a collapsing section, and lost focus in the UI, but
   all three of its tests call `getScheduleDocSlot`/`scheduleDocPeriodKey`/
   `renderScheduleDocsSection` directly via `page.evaluate` — no locator
   interaction, no focus check, no collapse check. Add at least one test
   per concern using real Playwright locator interaction rather than
   direct state-function calls.
4. **DECISION (recommended default): add a UI-level negative-conversion
   test to `convert-ward.spec.ts`.** Confirmed: still no test exercising
   an ineligible target through the actual modal `<select>`. Note this is
   now lower-severity than the original audit rated it —
   `tests/unit/convert-targets.spec.js` (new in Milestone 42E/42G)
   already pins per-source eligibility exhaustively at the data level —
   but the UI-level question (does the modal's `<select>` actually filter
   out ineligible options when rendered for an ineligible source, not just
   "does the eligibility table say so") is still unverified end-to-end.
   Add one test confirming the rendered `<option>` list matches
   `convertTargetsFor()`'s output for at least one ineligible-heavy source
   type (e.g. Plan Minor, which `convert-targets.spec.js` already
   confirms is excluded from certain targets).

### Steps

1. Add axe-core scans per Decision 1 (using `pdf-form-specific.spec.ts:538`
   as the direct template for setup/teardown).
2. Extend table/font/XMP structural checks to Annual Accounting (and
   optionally one Plan type) per Decision 2.
3. Add DOM/focus/collapse tests to `schedule-docs-period-key.spec.ts` per
   Decision 3.
4. Add the negative-conversion UI test to `convert-ward.spec.ts` per
   Decision 4.

### Verification

Each new test must be confirmed failing against a deliberately-reverted
version of the relevant fix/behavior first (this repo's standard
red/green discipline) — these are net-new regression guards, so there is
no "pre-fix" code to compare against; instead, confirm each new assertion
by temporarily breaking the thing it checks (e.g. stub a font-embedding
step to skip, or remove one `<option>` filter) and watching the new test
fail, then restoring.

---

## 43G — Test-Overhead & Granularity Fixes

**Relation:** Independent. **Risk:** Low — moves and splits tests without
changing what they assert.

### Files

`tests/e2e/filing-capability-matrix.spec.ts`, `tests/e2e/security.spec.ts`,
`tests/e2e/dashboard-visual.spec.ts`, `tests/e2e/guided-tour-navigation.spec.ts`,
`tests/e2e/annual-mount.spec.ts`, `tests/e2e/simplified-mount.spec.ts`,
`tests/e2e/guardian-inventory-mount.spec.ts`, `tests/e2e/support/plan-fixture.ts`.

### Decisions Required

1. **DECISION (recommended default): move `filing-capability-matrix.spec.ts`'s
   3 tests and `security.spec.ts`'s 3 page-less tests into `tests/unit/`.**
   Confirmed: `filing-capability-matrix.spec.ts:14,34,46` never touch
   `page`, and — worth flagging as a regression rather than an
   improvement — `security.spec.ts` now has **3 of 6** page-less tests
   (`:61, :69, :108`), the same 50% proportion as before Milestone 42, with
   one *more* such test added by 42B's own new `event-attribute detector`
   unit-shaped test. All 6 are pure data/regex/fs assertions paying full
   Playwright browser-launch overhead for no reason.
2. **DECISION (recommended default): split `dashboard-visual.spec.ts`'s
   single 6-viewport-x-2-theme test and `guided-tour-navigation.spec.ts`'s
   single 7-filing-type test into per-combination tests.** Both confirmed
   unchanged — one early failure currently masks every other combination
   in the same run.
3. **DECISION (recommended default): build a shared mount-test factory for
   `annual-mount.spec.ts`/`simplified-mount.spec.ts`/`guardian-inventory-mount.spec.ts`**,
   extending `tests/e2e/support/plan-fixture.ts`'s existing
   `registerPlanMountTests` pattern (currently Plan-only) to cover these
   three non-Plan filing families. Confirmed the drift the original audit
   flagged is real and specific: `simplified-mount.spec.ts:138`
   (`staleDelegateCalls`) checks for stale delegate-click handlers;
   `annual-mount.spec.ts:115` and `guardian-inventory-mount.spec.ts:158`
   have differently-worded versions of "the same" test that omit that
   check entirely — a shared factory closes this gap for all three at
   once instead of patching two files by hand.

### Steps

1. Move the 6 page-less tests (3 from `filing-capability-matrix.spec.ts`,
   3 from `security.spec.ts`) into new or existing `tests/unit/` files —
   check first whether a natural home already exists (e.g. a
   `filing-descriptor.spec.js` extension for the capability-matrix tests)
   before creating new files.
2. Split the two mega-tests into per-combination tests; keep a single
   `describe`/parametrization so the intent (systematic coverage across a
   matrix) stays visible even though each combination now reports
   independently.
3. Extend `plan-fixture.ts`'s factory (or extract a sibling factory if the
   Plan-specific and non-Plan-specific setup diverge too much to share
   directly — determine this by reading `registerPlanMountTests` fully
   before deciding) to cover Annual, Simplified, and Guardian Inventory;
   migrate the three mount specs onto it, folding in the
   `staleDelegateCalls` check for all three.

### Verification

Targeted run of every touched/new file, green, equal or greater assertion
count than before. Confirm the 6 relocated tests still catch what they
did before by running them via `npx vitest run` post-move (they should
require no `page`/browser context at all — if one does, it wasn't a clean
move candidate and should stay in `tests/e2e/`).

---

## 43H — Adopt or Retire `window-api.ts`

**Relation:** Independent. **Risk:** Low. **Decision-required** — this
sub-delivery is genuinely a fork, not a default-plus-details.

### Files

`tests/e2e/support/window-api.ts`, `tests/e2e/navigation-status.contract.spec.ts`,
`tests/e2e/date-validation.contract.spec.ts`.

### Background

Milestone 42C added `tests/e2e/support/window-api.ts` (69 lines) — a typed
interface over the ~83 test-facing `window.*` globals e2e specs reach via
bare `(window as any).X`, explicitly scoped in 42C's own proposal text to
establish the typed surface "for new and touched tests to use going
forward," not to convert every existing call site. Confirmed by direct
grep: **zero files under `tests/e2e/` import it**, including the very next
test file Milestone 42F itself added
(`validation-structured-paths.spec.ts`, which hand-rolls
`(window as any).addWard(...)` and reinvents its own issue-row shape
instead). Three sub-deliveries landed after 42C without adopting it.

Separately (found during this audit, not previously known): 42F's own
issue-shape conversion left **10 near-identical
`(m: any) => String(m).includes(...)` casts** scattered across
`navigation-status.contract.spec.ts` (9 sites: `:849, :869, :886-887, :898,
:909, :921, :931, :942`) and `date-validation.contract.spec.ts` (1 site,
`:401`) — each working around validators now returning `{message, path}`
objects instead of bare strings, by re-stringifying and substring-matching
instead of reading `.message`/`.path` directly. This is exactly the
pattern a typed `window-api.ts` helper would collapse into one call.

### Decisions Required

1. **DECISION NEEDED, no recommended default — genuinely a fork:**
   - **(a) Adopt `window-api.ts`, starting with the 10
     `String(m).includes(...)` sites above as the first real consumer.**
     Add an `issueMessages(page, validatorCall)` (or similarly-shaped)
     helper to `window-api.ts` that returns the structured `.message`/
     `.path` fields directly; convert all 10 sites to use it. This gives
     42C's infrastructure its first real payoff and stops the pattern from
     spreading further (a fourth sub-delivery already shipped without
     adopting it).
   - **(b) Delete `window-api.ts`** as dead-on-arrival infrastructure — no
     consumer materialized across four subsequent sub-deliveries, and
     maintaining a typed surface nothing uses is its own small ongoing
     cost (it must stay in sync with the real globals it wraps, per its
     own design, with nothing enforcing that beyond code review).
   - This document recommends **(a)** — the 10-site pattern above is a
     concrete, already-existing use case that fits `window-api.ts`'s
     stated purpose exactly, not a hypothetical future one — but flags it
     as a real decision since (b) is a legitimate, lower-effort answer if
     there's no appetite for expanding e2e test infrastructure further
     right now.

### Steps (if (a) is chosen)

1. Add a typed `issueMessages()`/`AdaptedIssue`-consuming helper to
   `window-api.ts` (its existing `AdaptedIssue` type, `:30-38`, already
   shapes the data these 10 sites need — confirm its fields match what
   `navigation-status.contract.spec.ts`'s casts currently extract before
   assuming no gap).
2. Convert the 9 sites in `navigation-status.contract.spec.ts` and the 1
   in `date-validation.contract.spec.ts` to use it.

### Steps (if (b) is chosen)

1. `git rm tests/e2e/support/window-api.ts`; confirm no other file
   references it (already confirmed zero at proposal time; re-confirm at
   implementation time since this doc's citations may have drifted).

### Verification

If (a): `npx playwright test tests/e2e/navigation-status.contract.spec.ts
tests/e2e/date-validation.contract.spec.ts` green, same assertions, now
reading `.message`/`.path` directly instead of substring-matching a
stringified form. If (b): full e2e suite unaffected (confirms it was
truly unreferenced).

---

## Full-milestone verification, once all eight sub-deliveries have landed

`npm test` — full green, matching Milestone 42's own closing exit
criterion. Re-run both of this session's audit techniques (grep every
spec file's `describe`/`it`/`test` titles for a fresh inventory, spot-read
any file whose title or line count looks newly suspicious) and record the
result as a short closing note appended to this file — the same
convention `MILESTONE-42-PROPOSAL.md` calls for and
`MILESTONE-40H-PROPOSAL.md` established: check "we said we'd fix X"
against "X is actually fixed," not assumed.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
