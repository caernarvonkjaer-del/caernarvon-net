# Milestone 43: Test-Suite Hygiene — Executable Delivery Index

## Status

**Index of independently approvable sub-deliveries.** Approving or landing
one does not authorize another — each still requires its own explicit
approval by name, per `AGENTS.md` §2, before implementation. All eight are
marked **Independent**: none blocks another, and none blocks Milestone 41
or anything else in flight.

**43A landed 2026-09-13** (`514d0c5`); a real bug found while verifying its
premise landed separately (`7794180`) — see 43A's own "What landed and
what was corrected" section. **43B also landed 2026-09-13**, in a smaller
form than originally proposed — see its own "What landed and what was
corrected" section. **43C landed 2026-09-13** — see its own "What landed"
section. **43D landed 2026-09-13**, with one premise correction (Decision 1)
— see its own "What landed and what was corrected" section. **43G landed
2026-09-13**, with Decision 3 scoped down from its recommended default —
see its own "What landed and what was corrected" section. **43H landed
2026-09-13** (option (a)) — see its own "What landed and what was
corrected" section, which also documents a genuine, unrelated regression
found and fixed while running its verification. **43E landed 2026-09-13**,
with Decision 1 deliberately scoped down — see its own "What landed and
what was scoped down" section. **43F landed 2026-09-13**, with Decision 1
substantially reworked after its own premise didn't hold up — see its own
"What landed and what was corrected" section, which also documents a
genuine, unrelated stale assertion found and fixed while implementing
Decision 2.

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
| 43B — Replace Source-Text Proxy Tests with Real Behavioral Tests | Correctness of the tests themselves | Medium | **Landed** |
| 43C — De-duplicate Redundant Cross-File Coverage | Redundancy | Small–medium | **Landed** |
| 43D — Split Poorly-Scoped Catch-All Files | Scoping/organization | Medium | **Landed** |
| 43E — PDF/Signature Cluster: Table-Driven Refactor + Fixture Dedup | Redundancy, largest by line count | Large | Draft |
| 43F — Close Real Coverage Gaps | Missing coverage | Medium | Draft |
| 43G — Test-Overhead & Granularity Fixes | Test performance/isolation | Small–medium | **Landed** |
| 43H — Adopt or Retire `window-api.ts` | Dead infrastructure from 42C | Small, decision-required | **Landed** |

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
whether replacement coverage exists. The gap was real but is now closed:
`tests/e2e/legacy-ward-data-normalization.spec.ts` (new, on explicit
follow-up instruction) covers both behaviors in a real browser —
`normalizeWardData()`'s full legacy-boolean-to-tri-state migration
(residence/income, restricted, both `inSafeDepositBox` sites,
`hasSafeDepositBox`, `safeDepositBoxFiled`, `amendedForm`) and
`window.calc`'s `restrictedCash`/`unrestrictedCash`/`restrictedIntang`/
`unrestrictedIntang` against the resulting data. Both new tests pass
against current code (this was a coverage gap, not a bug — `calc`'s four
functions already had correct `isRestricted` fallback logic built in,
confirmed by reading them directly).

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

**A second, related instance was found in this pass and fixed separately
on explicit follow-up instruction (`f7cf565`):** `legacy-app.js:4813-4829`'s
`convertGuardianSchedulesToAnnual()` (the Guardian Inventory → Annual
Accounting "Convert Ward" carryover) read `r.isRestricted` (`:4816, :4827`)
and `r.isPersonalResidence`/`r.isIncomeProperty` (`:4820`) with no
`restricted`/`residence`/`income` fallback at all — worse than
`pdf-model.js`'s bug, since there wasn't even a same-line OR. Confirmed via
a new e2e test (`tests/e2e/convert-ward.spec.ts`, no prior coverage of this
function existed — only `window.convertExistingWard()` reaches it, a
classic-script function with no unit-test path) that every Schedule
D-1/D-2/D-4 row converted from a current-schema Guardian Inventory ward
carried over as "No" regardless of the source data, confirmed failing
against pre-fix code first. Same fix as `pdf-model.js`: check the
tri-state field first, fall back to the legacy boolean only for genuinely
pre-migration data.

---

## 43B — Replace Source-Text Proxy Tests with Real Behavioral Tests

**Status: Landed 2026-09-13** (`937d11f`). See "What landed and what was
corrected" below — the achievable scope turned out to be much smaller than
this section originally proposed, for the same reason Decision 1 in 43A
was wrong: most of the "proxy" functions named below have no ES-module
export, so there is no real alternative to a source-text check for them in
this Node-only suite. Where a real fix genuinely existed, it landed.

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

### What landed and what was corrected

**Steps 1 and 3 do not hold as written — verified by direct read before
touching either file.** `yesNoRadioHTML()` (`legacy-app.js:5771`),
`emptyDataGuardian()` (`:5517`), and every function
`yes-no-radio-migration.spec.js` checks (`yesNoRadioAnnualHTML`,
`yesNoCheckboxS`, `persistAnnualControl`) are classic-script functions with
no ES-module export — the same reachability gap 43A found for
`normalizeWardData()`/`window.calc`. There is no way to "import from its
real module and call it directly" for any of them in this Node-only suite;
a source-text check is the best available verification, not a shortcut
past a better one. **Step 1's own two targets split differently on closer
read:** `guardian-inventory-yes-no-radio.spec.js:10-34`'s three tests check
`emptyDataGuardian()`'s defaults (genuinely no better path, left as-is with
an explanatory comment) — but `:36-44`'s test checks something different:
whether `pageScheduleA1()`/`B1()`/`B2()`/`B3()` (also unexported) correctly
*wire* seven specific fields to `yesNoRadioHTML()`. That claim was real,
valuable, and had **zero** coverage anywhere else — worth closing for real
rather than leaving as a weak proxy. New
`tests/e2e/guardian-inventory-tri-state-radios.spec.ts` renders each page
in a real browser, clicks each of the seven radios, and confirms the state
write lands at the declared `data-form-path` — replacing the unit test's
`toContain()` check, which would have passed even if the field were
missing, mislabeled, or wired to the wrong path entirely. **Step 3
(`yes-no-radio-migration.spec.js`) has no equivalent fix available** — none
of its three tests name a function with an ES-module export, and two of
its three assertions are legitimate negative-existence checks ("no legacy
checkbox pattern remains anywhere," "this literal never appears") that
source-scanning is the *correct* tool for, not a workaround. Left
unchanged; documented in place rather than silently left unexplained.

**Step 2 landed as written**, converting the D-3 fieldset/legend ordering
check into a real stack-based tag-depth parser
(`findMatchingFieldsetClose()`) that finds each fieldset's true matching
close tag and confirms the legend and target radio both fall strictly
inside it — verified to catch a real defect (temporarily removed the child
`<fieldset>` tag, confirmed the new test fails, reverted).

**Step 4 landed for the one binding convention that's actually reachable.**
`writeDraftValue`/`finalizeFieldValue` (`data-form-path`) are exported from
`form-contract.js` — converted to real invocation using the same window
mock the file's first describe block already established, verified to
catch a real defect (temporarily removed the `runFieldWriteSideEffects`
call from `writeDraftValue`, confirmed the new test fails, reverted).
`persistAnnualControl` (`data-annual-path`, `annual-accounting/index.js`)
and `afterChange` (`data-bind`, `legacy-app.js`) are both module-private —
same reachability gap as Steps 1 and 3 — left as source-text checks with a
comment explaining why. The fourth test in that describe block
(`persistFormControl no longer exists anywhere`) was already a legitimate
negative-existence check, not a proxy; left untouched.

**Net result:** 2 of the 4 originally-cited fixes were achievable and
landed for real (D-3 nesting, the `data-form-path` binding path); 1 was
achievable in a different, more valuable form than proposed (a new e2e
test replacing a proxy that was checking the wrong layer entirely); the
rest were confirmed to have no better verification path available in this
suite and were left as-is with that reasoning recorded in place, not
silently dropped.

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

### What landed (2026-09-13)

All four decisions landed as written. Decision 2's diff step found
`form-contract.spec.js:294-317` did **not** already cover
`types-contract.spec.js`'s three pairs (`caseNumber`/`periodFrom`/`wardName`)
nor most of `field-kind-inference.spec.js`'s ten (only `guardian.ein` and
`committeeIncorporated` overlapped) — ported the missing pairs into two new
`it()` blocks in `form-contract.spec.js`'s existing `getControlKind &
boundary inference` describe before deleting either duplicate, per the
decision's own instruction not to silently drop coverage. One porting
mistake caught by actually running it: an initial `kindOf('periodFrom')`
call defaulted to `type: 'text'`, which `getControlKind()` correctly does
NOT classify as a date from the path alone (only `type==='date'` or a
`has('date')` word match trigger it) — removed the redundant/wrong
assertion, kept the correct one using an explicit `type: 'date'` mock,
matching `types-contract.spec.js`'s original. Full targeted run: 9 files,
206 tests, green. Full unit suite: 736/736 (739 minus 3 net — three
duplicate-block deletions minus two new consolidated tests). E2e
(`party-dedupe.spec.ts`, `party-resolver.spec.ts`): 22/22.
`test-index-guard.spec.js` and `TEST-INDEX.md` updated for every touched
file, including `plan-readiness-parity.js`'s new `createPlanTestWindowStub()`
export.

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

### What landed and what was corrected (2026-09-13)

**Decision 1's premise did not hold, found before touching it (the same
class of error 43A/43B's own reachability-gap findings already established
in this repo): there is no `isPart8Complete` function to import.** The rule
is inlined directly inside `legacy-app.js`'s `computeNavChecks()` object
literal (`'a-p8':verifiedEmpty('a-p8')||verifiedEmpty('p8')||(D.trusts||[]).some(t=>t.name)`),
a classic-script, module-private expression with no ES export — "import and
call the real function" was not an available fix. Confirmed no existing
test drove this rule through a real browser either (the closest sibling,
`annual-schedule-consistency.spec.ts`'s verify-none-checkbox test, doesn't
cover Part VIII, and doesn't cover the named-trust completion path at all).
Closed the real gap instead: a new `annual-schedule-consistency.spec.ts`
test drives both completion paths (verify-none checkbox, named trust row)
through the real UI in a real browser, confirmed to catch a regression
(temporarily removed the named-trust path, watched the new test fail,
restored it). The unit-level hand-reimplementation is deleted, not
repaired, since real coverage now exists elsewhere (same reasoning 43A used
for `milestone-38e.spec.js`).

**Decision 2's date-formatting redundancy was only half true.** The test
also hand-reimplemented an accounting-period note string built inside the
same `computeNavChecks()`-adjacent, module-private code
(`legacy-app.js:7439`) — another no-export function, so that half is kept
(documented as a sanity check, not a real-function proof) while only the
genuinely-redundant `formatDisplayDate()` assertions (already covered by
`date-parser.spec.js`) were removed. The AO-2024-025 guard, clerk-filing-
instructions, and Schedule C-2 placeholder concerns were left in
`content-corrections.spec.js` as one file, per the decision's own "lowest-
stakes, reviewer preference" framing — not worth inventing new files for.

Decisions 3, 5, and 6 landed exactly as written: `attestation-layout.spec.ts`
merged into `schedule-card-layout.spec.ts` (14/14 green); `verified-
inventory-workflow.spec.ts`'s six-concern mega-test split into six
independent tests (found and fixed one latent issue while splitting — a
button-text locator collision with Milestone 41B's relabeled Save Backup
button, and a dangling unawaited `page.evaluate()` listener that only
surfaced once the save-event-hook concern ran as its own test rather than
mid-chain); `amended-form-line.spec.js`'s Annual-family identity block moved
to `filing-descriptor.spec.js`.

Decision 4 (case-file.spec.js/routes.spec.ts): chose **option (b)** — scope
comments naming each file's actual concerns, plus a new
`assertNoInlineEventHandlers(scope, selectors)` helper in
`tests/e2e/support/target.ts` replacing `routes.spec.ts`'s four hand-written
`expect(locator(...)).toHaveCount(0)` call sites. The four were not
byte-identical (two are; the other two use their own distinct attribute/
target lists), so the helper factors the repeated shape (join list, locate,
assert empty) rather than collapsing to one fixed selector.

Full targeted run: unit (`content-corrections.spec.js`, `case-file.spec.js`,
`amended-form-line.spec.js`, `filing-descriptor.spec.js`, `date-parser.spec.js`)
46/46; e2e (`routes.spec.ts`, `schedule-card-layout.spec.ts`,
`verified-inventory-workflow.spec.ts`, `annual-schedule-consistency.spec.ts`)
43/43. Full unit suite: 732/732 (736 minus 4 — the deleted Part VIII unit
tests, with their real replacement living in e2e). `TEST-INDEX.md` updated
for every touched and moved file; `test-index-guard.spec.js` green.

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

### What landed and what was scoped down (2026-09-13)

**Decision 1 was deliberately not attempted as a full table-driven merge —
a scope decision, not a correctness finding.** Read the full 868-line file
(larger than this proposal's own "795 lines" estimate) before deciding:
the six filing-type blocks share two test *shapes* (a combined legacy/
Unsigned/incomplete test, and a Stamp draw-apply-paint test per role), but
diverge in ways that matter for correctness, not just presentation --
three genuinely different field-storage shapes (collection-row
`planGuardians[0]`/`guardians[0]`, nested-object `d.preparer.signatureState`,
scalar `d.attorney_signatureState`), 1-4 cards per type, and per-type-unique
flows a generic loop would have to special-case anyway (Guardian
Inventory's blank-canvas-rejection test has no equivalent elsewhere; Annual
Accounting's Attorney card is the only one proven through a blocked-then-
fixed two-step flow rather than a direct stamp+image set; Plan Simplified's
own pilot block is *more* granular than the other five, testing Unsigned
and the incomplete-"/s/" case as separate tests rather than one combined
test). A mechanical unification risks silently collapsing one of these
into the wrong shape in a currently 100%-passing, high-value PDF/signature
suite, for a decision whose own stated problem is redundancy, not a missed
bug. Left as-is; flagged here for a future pass with a dedicated design
review, per this repository's own precedent (43G's Decision 3 scoped
similarly, for the same reason: real behavioral divergence across the
files a generic factory would need to absorb).

Decisions 2, 3, 4, and 5 landed as written:

- **Decision 2**: `plan-pdf-wcag-compliance.spec.ts`'s four hand-duplicated
  bodies converted to one `CONFIGS`-driven loop, matching
  `pdf-preview-viewer.spec.ts`'s established pattern. Confirmed identical
  4/4 pass before and after via `git stash`.
- **Decision 3**: new `tests/e2e/support/supplemental-pdf-fixture.ts`
  exports `buildSupplementalAttachmentFixture()`, adopted at all four named
  call sites (`output-semantics.artifact.spec.ts`, all four tests in
  `supplemental-pdf-accounting.spec.ts`, `pdf-evidence-lab.spec.ts`, and
  both supplemental-PDF tests in `pdf-accessibility-and-signatures.spec.ts`)
  — more sites than the proposal's own "four call sites" since
  `supplemental-pdf-accounting.spec.ts` alone had four internally-duplicated
  tests, all converted. `createJsPdfInstance`/`digestDataUrl` are core
  modules, not feature-specific, confirmed by direct read — the helper
  imports them directly rather than reaching through any one feature's own
  `loadXPdf()` global the way every original call site happened to.
- **Decision 4**: `pdf-preview-viewer.spec.ts`'s `FEATURES` array gained a
  Trust Accounting entry — previously absent entirely, so this closes a
  real gap (Trust's own "Preview renders the real PDF" and "embedded
  preview blocked" coverage did not exist before), not just a dedupe.
  `pdf-evidence-lab.spec.ts`'s Trust toolbar/pager test is removed, folded
  into that loop. Its remaining test (supplemental PDF source/canvas/
  digest/finalized-packet evidence) is kept — proves real ink-pixel
  rendering and finalized-packet text containment that nothing else in the
  suite does.
- **Decision 5**: `pdf-evidence-lab.spec.ts`'s `nonWhitePixels > 0` raised
  to `> 500` and `pdf-annotate.spec.ts`'s `pdfBytes.length > 0` raised to
  `> 10000` — both still comfortably satisfied by real output (confirmed
  by running), but no longer satisfiable by a single stray byte/pixel.

Full targeted run: `plan-pdf-wcag-compliance.spec.ts` 4/4,
`pdf-preview-viewer.spec.ts` 20/20 (was 18, +2 for the new Trust entries),
`pdf-evidence-lab.spec.ts` 1/1 (was 2, -1 folded away),
`supplemental-pdf-accounting.spec.ts` 4/4,
`output-semantics.artifact.spec.ts` and `pdf-accessibility-and-signatures.spec.ts`
green, `pdf-annotate.spec.ts` green. Full unit suite unaffected: 747/747.

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

### What landed and what was corrected (2026-09-13)

**Decision 1 was substantially reworked.** Its own recommended default —
add real axe-core WCAG scans to `plan-pdf-wcag-compliance.spec.ts`, using
`pdf-form-specific.spec.ts:538` as the direct template — does not survive
direct inspection. That test is titled "Milestone 20 / axesCheck" but never
calls axe-core anywhere in its body (confirmed by reading the full test);
a repo-wide grep for `axe-core`/`AxeBuilder`/`from 'axe` across every
`.ts`/`.js`/`.json` file found zero matches — there is no axe-core
dependency or call site anywhere in this repo, so no such template exists.
axe-core is also architecturally the wrong tool for this file's actual job
regardless of any template: it inspects a live browser DOM for
accessibility violations, and this whole PDF-accessibility cluster never
renders anything to a DOM — jsPDF hands back raw PDF bytes directly via
`page.evaluate()`, which axe-core has no way to scan. What this cluster
tests everywhere else (StructTreeRoot, `/ColSpan`, `/Scope`, embedded
fonts, heading order) is PDF/UA-1 *tag* structure, verified by direct regex
assertions against the generated bytes — the actually-correct tool for the
job, already proven throughout this exact cluster. Applied that same
methodology to close the real, still-live gap: `plan-pdf-wcag-compliance
.spec.ts` checked `/MarkInfo` for only one of its four Plan types (Plan
Initial) — an asymmetry inherited unchanged through 43E's own table-driven
rewrite. `/MarkInfo` is now asserted for all four, plus a new
heading-order-never-skips-a-level check (the same computation
`pdf-form-specific.spec.ts`'s Milestone 20 test already uses) for all four.
Confirmed both checks pass for real (not vacuously) by running the file
after the change; confirmed `/MarkInfo` and `/StructTreeRoot` are coupled
outputs of jsPDF's own tagged-PDF mode (temporarily disabling
`doc.setLanguage('en-US')` in `pdf-engine.js` did not make `/MarkInfo`
disappear, so the two can't regress independently of each other — the
value of asserting `/MarkInfo` uniformly is closing the coverage asymmetry
itself, not guarding an independently-breakable code path).

**Decision 2 landed as scoped: Annual Accounting only**, per the proposal's
own recommendation over all nine filing types. `pdf-table-semantics.spec.ts`
gained a new test building a 25-row Annual Schedule D-1 (forcing multi-page
continuation) and asserting the same `/ColSpan`/`/Summary`/`/Scope`
regularity checks the Guardian-only test already made — confirmed real via
the extracted PDF text containing both the first and last synthetic row.
`pdf-fonts-and-xmp.spec.ts` gained a matching Annual Accounting font/XMP
test (`/FontFile2`, `/FontDescriptor`, `/CIDFontType2`, `/ToUnicode`,
`pdfuaid:part 1`, `PGSans`) — all pass.

**Found and fixed a genuine, unrelated stale assertion while implementing
Decision 2**: running the existing Guardian-only `pdf-table-semantics
.spec.ts` test in isolation (confirmed independent of any 43F change via
`git stash`, i.e. already broken on unmodified `master` at `69644c2`)
failed on `expect(colSpanMatches).toContain(5)`. Root-caused by reading
`guardian-inventory/pdf-model.js`'s Schedule A-1 header array directly: it
now has 8 columns (`Personal Residence?`/`Income Property?` tri-state
columns were added at some point after this assertion was written), so
`pdf-engine.js`'s `labelColSpan = headers.length - totalValues.length`
computation for a single-value totals row is `8 - 1 = 7`, not `5` — the
actual array already contained `7`. This is a stale test value from a
6-column-era Schedule A-1, not a rendering regression. Fixed the assertion
to `toContain(7)` with a comment explaining the real current column count.

**Decision 3 landed, without the literal "collapse" check** — reading
`renderScheduleDocsSection()` (`legacy-app.js`) directly confirms it has no
collapse/accordion behavior at all (a plain always-visible `<div
class="schedule-docs-section no-print">`), matching this file's own header
comment that "nothing collapses" — there is no real collapse behavior to
assert against. What real UI interaction could check, and nothing did: a
new test in `schedule-docs-period-key.spec.ts` drives the actual Cover-page
period inputs and real page navigation (`window.navigate()`), confirms the
Supporting Documents heading updates via a real `.schedule-docs-section h2`
locator (not a `page.evaluate` return value), and confirms the Comments
textarea never loses focus while typing (`toBeFocused()`) and survives
navigating away and back. Confirmed as a real regression guard: temporarily
adding a `renderPage(currentPage)` call to `updateScheduleComment()`
(reintroducing the historical "lost focus" bug shape) made the new test
fail with the textarea value stuck at a single typed character and focus
`inactive`; reverted with zero residual diff.

**Decision 4 landed**, broadened slightly beyond the single Plan-Minor-only
case the proposal named: `convert-ward.spec.ts` gained a test asserting the
real `#convert-target-type` modal `<select>`'s rendered `<option>` values
equal the live `convertTargetsFor()` output for a normal source (Guardian,
confirming `planMinor` is correctly absent from its otherwise-nonempty
target list) and for Plan Minor as source (the fully-ineligible case
`tests/unit/convert-targets.spec.js` already pins at `[]`), including that
the modal shows the "can't be converted" note rather than stale options.
Confirmed as a real regression guard: temporarily removing the `target !==
'planMinor'` filter from `convertTargetsFor()` made the test fail with
`planMinor` appearing in the rendered Guardian-source option list; reverted
with zero residual diff.

Full unit suite unaffected throughout: 747/747. No source files carry any
persisted change from this sub-delivery — every temporary revert used to
prove a red/green pair was restored to zero diff before moving on.

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

### What landed and what was corrected (2026-09-13)

Decisions 1 and 2 landed exactly as written. `filing-capability-matrix.spec.ts`
(whole file, not just the 3 named tests — every test in it was page-less)
moved to `tests/unit/filing-capability-matrix.spec.js`, importing the same
`tests/e2e/support/filing-matrix.ts` module several real, page-driven e2e
specs also depend on (that module stays under `tests/e2e/support/`; only
the audit-of-itself tests moved). `security.spec.ts`'s 3 page-less tests
moved to a new `tests/unit/security-source-audit.spec.js` alongside the
helpers only they need (`sourceFiles`, `withoutJsComments`,
`EVENT_ATTRIBUTE_PATTERN`) — confirmed the 3 remaining page-driven tests
use none of them. `dashboard-visual.spec.ts`'s 12-combination mega-test
split into 12 per-combination tests plus the 2 tail assertions already
written as their own tests, sharing a `setUpDashboard()` helper (full ward
setup now repeats per test — the isolation/redundancy tradeoff this
decision explicitly accepts). `guided-tour-navigation.spec.ts`'s 7-type
loop split into 7 per-type tests.

**Decision 3 landed in a smaller form than proposed, a deliberate scope
choice, not a correctness finding.** Read `registerPlanMountTests` in full
per the decision's own instruction before deciding: the four Plan types and
the three non-Plan types (`annual-mount.spec.ts`, `simplified-mount.spec.ts`,
`guardian-inventory-mount.spec.ts`) share five test *shapes*, but the three
non-Plan files are each substantially larger (330-370 lines vs. Plan's
shared ~135-line factory) and each carries multiple filing-specific tests
of its own (Excel round-trip, Part VIII trust checkbox, rapid schedule
entry, D-3 tri-state lifecycle, etc.) interleaved with the shared shapes.
Building and migrating onto a generalized factory for three large,
currently-green files is real, higher-blast-radius work in its own right,
weighed here against the concrete, specific problem the decision actually
named: `annual-mount.spec.ts` and `guardian-inventory-mount.spec.ts`'s own
"repeated entry/exit" tests omit the stale-delegate-listener check
`simplified-mount.spec.ts:138` already has. Closed that gap directly instead
— each file's own delegate attribute (`data-annual-action`,
`data-inventory-action`) has no `open-court-portal`-equivalent no-op action
the way Simplified's own delegate does, so the probe instead monkey-patches
`window.showPickPartyModal` (present in both switches as `case 'link-party'`)
and fires a synthetic `link-party` probe element. Confirmed to catch a real
regression: temporarily removed `dispose()`'s `eventControllers.get(container)?.abort()`
call in `annual-accounting/index.js`, watched the new assertion fail (47
stale calls after 15 mount/dispose cycles, expected 0), restored it. The
generalized factory remains open future work if these three files' own
shape ever needs to change for other reasons; not pursued here given the
gap it would close beyond the concrete defect is organizational, not a
second correctness finding.

Full targeted run: unit (`filing-capability-matrix.spec.js`,
`security-source-audit.spec.js`) 15/15; e2e (`security.spec.ts`,
`dashboard-visual.spec.ts`, `guided-tour-navigation.spec.ts`,
`annual-mount.spec.ts`, `guardian-inventory-mount.spec.ts`,
`simplified-mount.spec.ts`) 3+14+7+28 = 52/52. Full unit suite: 747/747
(732 plus 15 relocated). `TEST-INDEX.md` updated for every touched, moved,
and new file.

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

### What landed and what was corrected (2026-09-13)

**Chose (a).** Added `ValidatorIssue` to `window-api.ts` rather than reusing
the existing `AdaptedIssue` type the proposal named: confirmed by direct
read of `issue-registry.js`'s `createIssue()` that a raw `validateX()`
issue has no `severity` field at all (not merely blank) — `severity` is
added later by `adaptValidationErrors()`. Casting these 10 sites' raw,
pre-adapt output to `AdaptedIssue` (which declares `severity: string` as
required) would claim a field that isn't there; `ValidatorIssue` matches
`createIssue()`'s real shape (`code`, `message`, `section`, `label`, `path`,
`route`) instead. All 10 `(m: any) => String(m).includes(...)` sites now
read `(m: ValidatorIssue) => m.message.includes(...)` directly.

**Found and fixed a genuine, unrelated regression while running this
sub-delivery's own verification, not caught by Milestone 44C's own
verification pass:** `navigation-status.contract.spec.ts`'s "Print Preview
panel and the blocked-export alert agree on how many issues remain" test
started failing with a strict-mode locator violation — 44C's shared
readiness card reuses the exact `.validation-panel .validation-title`
classes the classic error panel already used, and Guardian Inventory's
print page renders both side by side. Confirmed via `git stash` against
the pre-43H commit that this already failed before any 43H edit (a 44C
gap, not something this sub-delivery introduced). `pdf-preview-viewer.spec.ts`
already guarded the identical collision with a `.filter({ hasText: /required
field/ })`; applied the same fix here. Grepped for every other
`.validation-panel .validation-title` site in `tests/e2e/` to confirm no
third unguarded instance exists.

Full targeted run: `navigation-status.contract.spec.ts` +
`date-validation.contract.spec.ts` 78/78 (was 77/78 before the readiness-card
fix). Full unit suite unaffected: 747/747.

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
