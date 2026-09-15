# Milestone 44: Close the Verified Milestone 38/37 Status-Text Gaps

## Status

**44A-44D landed 2026-09-13; full-milestone verification run and recorded
2026-09-14 (see closing note below). 44E is superseded — see its own
section — and fully closed as of 2026-09-15.** Approving or landing one
sub-delivery never authorized another — each required its own explicit
approval by name, per `AGENTS.md` §2, before implementation.

**Source:** a 2026-09-13 cross-milestone review (a "Milestones 39-43 sweep"
run by Codex, at the user's direction) found that Milestones 36, 37, and 39
are substantially complete or intentionally/correctly incomplete, but
**Milestone 38 — specifically 38A, 38B, 38D, and 38E — is not complete as
specified despite "Landed 2026-09-11 (`b0321dd`)" status text** in
`MILESTONE-38A/B/D-PROPOSAL.md`. This session independently re-verified
every material claim directly against current `master` before accepting
it — not just trusted the review's citations — and confirmed all six
findings accurate at the cited files/lines. That verification is not
repeated in full here; see the session transcript for the line-by-line
confirmation. Of the six original findings:

- **Finding 4 (38E's split-schema/tri-state migration) is explicitly
  excluded from this document.** The user separately assigned it to
  Codex ("Finish the 38E work"), which is in progress at the time of this
  writing. See `MILESTONE-38E-PROPOSAL.md` for that work's own tracking.
  Do not duplicate it here.
- **Findings 1, 2, 3, and 5 are compiled below as 44A-44D** — each is a
  confirmed, verifiable gap between a milestone's own "Landed" claim and
  its actual code state, not a matter of opinion or scope creep.
- **Finding 6 (Milestone 39's remaining scope) is not a status-text
  defect** — 39-D is correctly unapproved and unimplemented, and 39-A
  correctly documents itself as a Plan-Simplified-only pilot with named
  follow-ons. It is included as **44E** purely as a scope-decision
  placeholder, not a fix.

| Sub-delivery | Theme | Size | Status |
| --- | --- | --- | --- |
| 44A — Make 38A's Guardian-Address Conflict Actually Non-Bypassable | Data integrity, live bypass | Small | Landed 2026-09-13 |
| 44B — Resume 38D's Typed, Non-Bypassable Output Boundary | Cross-cutting validator/output migration | Large | Landed 2026-09-13 |
| 44C — Land 38B's Universal Readiness-Card Architecture | Architecture, four Plan types | Medium-large | Landed 2026-09-13 |
| 44D — Correct 37-6 Data-Model Catalogue Drift | Documentation-only | Small | Landed 2026-09-13 |
| 44E — Milestone 39 Follow-On Scope Decision | Not a defect; decision only | N/A | Superseded/Closed 2026-09-15 |

**Sequencing:** 44A is independent and the highest-urgency item (a live,
confirmed bypass of a requirement its own spec calls non-bypassable) — it
does not need to wait for 44B. 44B (38D Phase 1: typed issue identity) is
the named prerequisite for 44C (38B's own text: *"38D Phase 1 is the only
implementation prerequisite [for 38B]"*) — land 44B's Phase 1 before or
alongside 44C, not after. 44A's fix is a small, self-contained instance of
what 44B does at full scope; landing 44A first does not conflict with 44B
landing later — 44B's broader migration will simply confirm 44A's call
site already matches the target pattern. **44D touches
`probate-guardian-data-model.csv`, which Codex's concurrent 38E work is
also editing (D-3/benefits/Q7 type corrections)** — coordinate before
starting 44D so both land without fighting each other's edits to the same
file; confirm 38E's CSV changes are in before writing 44D's guardian-count
corrections, or scope 44D's diff narrowly to the specific rows named below.

---

## 44A — Make 38A's Guardian-Address Conflict Actually Non-Bypassable

**Relation:** Independent, highest urgency. **Risk:** Low — the fix is a
single call-site change to how one issue is constructed; no behavior
change to the conflict-detection logic itself, only to its bypassability.

### Files

`src/features/simplified-accounting/index.js` (the bug), plus new/extended
test coverage — no existing test exercises this path at all (confirmed via
grep: zero references to `address-conflict` anywhere under `tests/`).

### Background

`MILESTONE-38D-PROPOSAL.md`'s own acceptance criteria state: *"Unresolved
38A guardian-address conflict: Every generated format remains blocked
until the user explicitly chooses the canonical value"* — and
`issue-registry.js` already has the correct definition:
`'simplified.guardian.address-conflict': { category: 'data-integrity',
bypassable: false, capabilities: ALL, showInReadiness: true }`
([issue-registry.js:10](src/core/validation/issue-registry.js#L10)).

But `validateSimplified()` never emits that code. It calls
`getSimplifiedGuardianAddressConflicts(d)` and pushes each conflict through
`issue = issueFactory('simplified')`
([index.js:623-624](src/features/simplified-accounting/index.js#L623-L624)),
which builds a code via `createRequiredIssue()` from the field path (e.g.
`simplified.guardians[].residenceStreet.required`). That code isn't in the
registry's five explicit definitions, so `getIssueDefinition()`'s regex
fallback ([issue-registry.js:15](src/core/validation/issue-registry.js#L15))
resolves it to `validation.legacy-unmapped`, `bypassable: true`. Concretely:
a filer with two guardians whose canonical (`residenceStreet`) and legacy
(`officeStreet`) addresses disagree can click **Continue despite
outstanding requirements** in the Preview-blocked panel
([pdf-preview.js:388-400](src/core/pdf/pdf-preview.js#L388-L400)) and
generate output while the conflict is still unresolved — the exact outcome
38A/38D's own specs say must never happen, because the app would then be
making a silent, unconfirmed choice between two addresses on a real filed
document.

### Decisions Required

None — this is a corrective bug fix restoring an already-agreed contract,
not a new design choice.

### Steps

1. Import `createIssue` from `../../core/validation/issue-registry.js` in
   `simplified-accounting/index.js`.
2. Replace the `issue(...)` call at
   [index.js:624](src/features/simplified-accounting/index.js#L624) with a
   direct `createIssue('simplified.guardian.address-conflict', { section:
   'Part IV', label: \`Guardian #${conflict.rowIndex+1} address conflict\`,
   path: \`guardians.${conflict.rowIndex}.residenceStreet\`, route: '/p4',
   message: \`Part IV — Guardian #${conflict.rowIndex+1} — resolve
   conflicting residence address before export\` })` call, so the emitted
   issue carries the registered code (and therefore `bypassable: false`)
   instead of falling through the generic per-field factory.
3. Confirm no other call site relies on this issue's old (bypassable) code
   shape — grep `address-conflict` and `getSimplifiedGuardianAddressConflicts`
   for consumers beyond `index.js:469` (the inline conflict-notice renderer,
   which reads `conflicts` directly, not the validator's issue array) before
   changing the shape.

### Verification

New test first, confirmed failing against current code: seed a Simplified
Accounting ward with one guardian whose `residenceStreet` and `officeStreet`
disagree, run `validateSimplified()`, assert the returned issue's `.code`
is exactly `'simplified.guardian.address-conflict'` (not a
`.required`-suffixed code) and that `getIssueDefinition(issue.code).bypassable
=== false`. Extend with an e2e test: create the same conflicting-address
scenario, navigate to Preview, click **Continue despite outstanding
requirements**, and assert Preview/Print/Save PDF/Save Excel remain blocked
with the conflict message still shown — not silently allowed through. Then
apply the fix and confirm both go green.

### What landed and what was corrected

**Landed 2026-09-13** (`2219d6d`, by Antigravity). Steps 1-3 landed exactly
as written: `createIssue('simplified.guardian.address-conflict', {...})`
replaces the generic `issueFactory(T)` call at the conflict site, and a new
`tests/unit/validation-issue.spec.js` test confirms the emitted issue's
code, section, label, path, route, category, and `bypassable: false` on a
real conflicting-guardian fixture run through `validateSimplified()` —
confirmed by this session to fail against the pre-fix call site (reverted
the one line, watched the assertion fail, restored it) and pass against
the fix.

**The Verification section's second half — the e2e acknowledgement check —
did not land, and was closed differently than specified, not silently
dropped.** No file changed `isOutputAcknowledgedFor`/
`acknowledgeOutstandingRequirements`, and grep confirmed neither is
referenced anywhere in the test suite, before or after this fix — the
acknowledgement-override mechanism itself has no test coverage of any
kind, for any issue, not just this one. Rather than add a full e2e
click-through (which would be the first test of that mechanism at all, a
larger undertaking than this fix's own scope), this session added a
narrower unit test to the same file
(`tests/unit/validation-issue.spec.js`, "acknowledgement clears bypassable
issues but never the address-conflict") that runs the real
`validateSimplified()` conflict output through `prepareFilingOutput()`
with `window.isOutputAcknowledgedFor` mocked to return `true`, and asserts
`canExport` stays `false` — proving the actual composition the fix
depends on (a non-bypassable issue survives acknowledgement) rather than
only the issue object's shape in isolation. Confirmed this test also fails
against the pre-fix call site (same revert/restore check) and passes
against the fix. A full e2e click-through of the **Continue despite
outstanding requirements** button remains open and is more properly
44B/44C's concern, since `authorizeFilingOutput()`'s UI-level wiring has
no coverage today for any issue type.

---

## 44B — Resume 38D's Typed, Non-Bypassable Output Boundary

**Relation:** Prerequisite for 44C (per 38B's own stated dependency).
**Risk:** Medium-high — cross-cutting across all nine filing identities and
every output action; `MILESTONE-38D-PROPOSAL.md` itself calls this "a
cross-cutting validator migration, not a narrow change," and its own text
warns the call-site inventory is "an implementation prerequisite and part
of the delivery estimate," not something to skip.

### Files

This is not a fixed file list — `MILESTONE-38D-PROPOSAL.md`'s own inventory
names 7 validator functions across 9 filing identities, 26
`prepareFilingOutput()` call sites across 11 files, plus new
`src/core/filing/output-authorization.js`. Re-run that inventory at
implementation time rather than assuming it is unchanged since
2026-09-11 — treat the counts in `MILESTONE-38D-PROPOSAL.md` as a starting
point to re-verify, not a final list.

### Background

`MILESTONE-38D-PROPOSAL.md` is marked "Landed 2026-09-11," but this
session confirmed the migration it describes did not actually happen:

1. `getSupplementalFilingIssues()`
   ([supplemental-pdf.js:146-158](src/core/pdf/supplemental-pdf.js#L146-L158))
   still returns plain strings (`issues.push(result.message)`,
   `issues.push('Supplemental PDFs exceed...')`), not the `supplemental.*`
   typed issues the spec names (`supplemental.missing-data`,
   `.decode-failed`, `.not-pdf`, `.too-large`, `.checking`, `.not-ready`,
   `.page-limit`, `.blocked`, `.total-bytes`, `.total-pages`). Every one of
   these strings is normalized by `output-preflight.js`'s `normalizeIssue()`
   ([output-preflight.js:14-18](src/core/filing/output-preflight.js#L14-L18))
   into `validation.legacy-unmapped` — bypassable, not the non-bypassable
   category the spec requires ("corrupt/encrypted/unreadable supplemental
   files" is explicitly listed as non-bypassable).
2. `issue-registry.js` has exactly the five definitions confirmed in 44A's
   background, plus the one blanket regex fallback. None of `supplemental.*`,
   `excel.capacity.*`, `output.template.missing`, `output.resource.unavailable`,
   `output.generation.failed`, `output.capability.unsupported`, or
   `output.security.denied` exist.
3. Excel capacity remains exactly the "current" state the spec describes as
   the thing to replace: `checkExcelCapacity()` gates
   ([excel.js:30-40](src/features/simplified-accounting/excel.js#L30-L40)
   and its Guardian/Annual siblings) are still local `alert()` calls, not
   typed, format-specific preflight issues routed through
   `authorizeFilingOutput()`.
4. `src/core/filing/output-authorization.js` does not exist. There is no
   `acknowledgeOutstandingRequirements`/`authorizeFilingOutput`/revision
   owner as specified — `output-preflight.js`'s
   `window.isOutputAcknowledgedFor()` check
   ([output-preflight.js:36-39](src/core/filing/output-preflight.js#L36-L39))
   is a different, simpler mechanism than the spec's `{wardId,
   inventoryType, revision}` record and monotonic revision counter.
5. None of the five named unit test files exist: `issue-registry.spec.js`,
   `output-preflight-typed.spec.js`, `output-gate-inventory.spec.js`,
   `output-authorization.spec.js`, `excel-capacity-issues.spec.js`
   (confirmed via glob — zero matches for any of the five).

### Decisions Required

1. **DECISION (recommended default): correct `MILESTONE-38D-PROPOSAL.md`'s
   status line to reflect partial completion** (its `authorizeFilingOutput`/
   acknowledgement mechanism and the `filing.identity.*`/
   `simplified.guardian.address-conflict` registry entries did land; the
   typed migration of the seven validators, supplemental issues, Excel
   capacity, and the five test files did not) before resuming work, so the
   proposal document itself stops asserting something false — matching this
   repo's existing convention (`MILESTONE-38A/B-PROPOSAL.md`'s "Status line
   corrected 2026-09-13 under Milestone 42A" precedent).
2. **DECISION NEEDED: sequence Phase 1 (typed issue identity across all
   nine filing identities) as its own landable slice before Phase 2
   (`output-authorization.js` and all 26 call sites), or accept 44B as one
   large delivery.** `MILESTONE-38D-PROPOSAL.md` itself is written in two
   phases for exactly this reason. Recommended default: **split** — a 44B-1
   (registry completion: `supplemental.*`, `excel.capacity.*`, `output.*`
   definitions, plus migrating the seven validators' remaining bare-string/
   generic-factory issue sites to typed codes) landable independently of a
   44B-2 (Excel capacity as typed preflight issues, replacing the
   exporter-local `alert()` gates only after parity tests prove no capacity
   check is lost, per the original spec's own explicit caution). 44A's fix
   is a preview of exactly this pattern at one call site.

### Steps

1. Correct `MILESTONE-38D-PROPOSAL.md`'s status text per Decision 1.
2. Re-run the call-site and validator inventory `MILESTONE-38D-PROPOSAL.md`
   already describes (7 validators / 9 identities / 26
   `prepareFilingOutput()` calls across 11 files) against current `master`;
   do not assume the 2026-09-11 counts are still exact.
3. Add the missing registry definitions (`supplemental.*`, `excel.capacity.*`,
   `output.*` families) per the table already specified in
   `MILESTONE-38D-PROPOSAL.md`'s "Phase 1 registry" section.
4. Convert `supplemental-pdf.js`'s `getSupplementalFilingIssues()` to return
   typed issues via the new `supplemental.*` codes instead of strings.
5. Convert Excel capacity checks (Guardian/Simplified/Annual) to typed,
   format-scoped issues per 44B-2, replacing the `alert()` gates only once
   parity tests confirm no capacity boundary regresses.
6. Add the five named test files; extend the seven validators' existing
   specs for typed-issue coverage.

### Verification

Per `MILESTONE-38D-PROPOSAL.md`'s own "Verification" section: registry-
completeness and typed-preflight tests across all nine filing validators
for bypassable, non-bypassable, and format-specific issues; parity tests
proving each migrated Excel capacity gate still blocks the same overflow
before its old ad hoc gate is removed; e2e coverage for accept/decline,
all supported output actions, and the 38A conflict (now closed by 44A).
Full `npm test` recommended before commit given the cross-cutting scope,
per `AGENTS.md`'s cross-cutting-change rule.

### What landed and what was corrected

**Phase 44B-1 Landed 2026-09-13** (by Antigravity):
- Corrected `MILESTONE-38D-PROPOSAL.md`'s status text per Decision 1.
- Expanded `src/core/validation/issue-registry.js` with all specified families: `supplemental.*` (10 codes, `category: 'supplemental'`, `bypassable: false`, `capabilities: ['preview', 'print', 'pdf']`), `excel.capacity.*` (`category: 'capacity'`, `bypassable: false`, `capabilities: ['excel']`), and `output.*` technical and security codes (`output.template.missing`, `output.resource.unavailable`, `output.generation.failed`, `output.capability.unsupported`, `output.security.denied`).
- Migrated `src/core/pdf/supplemental-pdf.js`: `getSupplementalFilingIssues()` now constructs typed `supplemental.*` issues with non-bypassable status and retains `.toString()` returning `.message` for backwards compatibility with existing consumers.
- Added dedicated unit test suites: `tests/unit/issue-registry.spec.js` (12 tests) and `tests/unit/output-preflight-typed.spec.js` (5 tests), and updated `tests/unit/supplemental-pdf.spec.js` (10 tests). All 43 targeted tests passing.

**Phase 44B-2 Landed 2026-09-13** (by Antigravity):
- Created `src/core/excel/excel-capacity.js` with shared `checkExcelCapacity()` and `getExcelCapacityIssues()` emitting typed `excel.capacity.*` non-bypassable issues scoped to the `excel` capability.
- Migrated all 3 Excel export call sites (`src/features/simplified-accounting/excel.js`, `src/features/guardian-inventory/excel.js`, `src/features/annual-accounting/excel.js`) to route through `authorizeFilingOutput(..., { capability: 'excel', additionalIssues: getExcelCapacityIssues(...) })`.
- Migrated all 7 PDF export call sites (`doSavePdf` across `simplified-accounting`, `guardian-inventory`, `annual-accounting`, `plan-simplified`, `plan-annual`, `plan-initial`, `plan-minor`) to route through `authorizeFilingOutput(..., { capability: 'pdf' })`.
- Migrated shared PDF print in `src/core/pdf/pdf-preview.js` to route through `authorizeFilingOutput(..., { capability: 'print' })`.
- Added `tests/unit/excel-capacity-issues.spec.js` (7 tests), `tests/unit/output-authorization.spec.js` (10 tests), and `tests/unit/output-gate-inventory.spec.js` (12 tests).
- Synchronized `TEST-INDEX.md` and verified `test-index-guard.spec.js` and `verify:data-model` pass cleanly. All 67 targeted tests passing.

**Follow-up correction, 2026-09-13 (same day, this session):** a direct
re-verification against `MILESTONE-38D-PROPOSAL.md`'s own spec text found
Phase 44B-2's "Fully landed" claim overstated it in two ways, both now
fixed — see that document's own "What was found incomplete, and fixed,
after 44B's own 'Fully landed' claim" section for the full account. In
short: `markFilingRevisionChanged()` was wired at only 3 of ~9 named
mutation boundaries (now 7 of 9, the remaining 2 backed by existing e2e
coverage instead of a new unit test), and all 7 Preview pages' Save-as-PDF
buttons derived their disabled state from a capability-agnostic boolean
instead of `authorizeFilingOutput()` per capability (now fixed in all 7).
New `tests/unit/output-revision-wiring.spec.js` (9 tests) proves the
mutation-boundary fix with real red/green verification. One related gap
found but deliberately left open: the Save-as-Excel button in the three
accounting-family hosts still uses the legacy, untyped
`checkExcelCapacity()` global rather than the typed `excel.capacity.*`
issues 44B-2 itself introduced — flagged, not fixed, in the same
follow-up note.

**Second follow-up, same day: a real bug, not just a gap.** Troubleshooting
why `tests/e2e/annual-mount.spec.ts`'s Excel round-trip test timed out
waiting for a download event found that 44B-2's own rename from
`prepareFilingOutput()`/`preflight` to `authorizeFilingOutput()`/
`authorization` in `annual-accounting/excel.js`'s `doSaveExcel()` missed one
usage: `setCell(p1,'H4',preflight.descriptor?.filingTypeValue||inv.filingType)`
still referenced the deleted `preflight` variable, throwing
`ReferenceError: preflight is not defined` inside the function's own `try`
block on every real Excel export — silently swallowed by the surrounding
`catch(err){alert('Excel export failed: '+err.message)}`, so the failure
was an alert dialog, not a crash, and easy to miss without exercising the
actual button. Fixed by capturing `resolveFilingDescriptor(window.D).descriptor`
once at the top of the function and reusing it for both the capacity-issue
lookup and the cell write. Confirmed the e2e test passes after the fix (it
was timing out before, on unmodified 44B-2 code, confirmed via
`git stash`). This was Annual Accounting's Excel export specifically —
Simplified and Guardian Inventory's equivalent functions were checked and
have no analogous leftover reference.

While investigating this, also ran the full unit suite and several
adjacent e2e suites and found three unrelated, pre-existing failures from
the Milestone 38E landing (not 44B) that had never been caught because
that milestone's own landing didn't run `npm test` first — a stale test
expectation in `amended-form-line.spec.js`, and two stale element-id/tri-
state-value assumptions in `navigation-status.contract.spec.ts` and
`guardian-inventory-mount.spec.ts`'s D-3 coverage. All three were confirmed
via `git stash` to predate this session's own changes, then fixed; see
`MILESTONE-38E-PROPOSAL.md`'s own "What was found broken, and fixed, in
follow-up test-suite regression checks" section for the full account. In
every one of these four cases the underlying product code was already
correct (except the `preflight` ReferenceError, which was a real bug) —
the tests were describing stale, pre-migration behavior.

---

## 44C — Land 38B's Universal Readiness-Card Architecture

**Relation:** Depends on 44B (38D Phase 1) per 38B's own stated
prerequisite. **Risk:** Medium — touches all four Plan types' Preview
pages, a user-visible UI change 38B's own spec already anticipates and
accepts ("Migrating the four existing Plan panels is a visible UI change
for current users").

### Files

`src/core/filing/readiness-card.js` (exists, incomplete), new
`src/core/filing/readiness-config.js` (does not exist),
`src/features/plan-annual/print.js`, `src/features/plan-initial/print.js`,
`src/features/plan-minor/print.js`, `src/features/plan-simplified/print.js`
(each still defines and calls its own `planReadinessChecks*()`), plus their
`index.js` siblings.

### Background

`MILESTONE-38B-PROPOSAL.md` specifies `readiness-config.js` exporting
`getFilingReadiness(inventoryType, data, validationIssues)` as "the single
configuration source for the nine descriptor `inventoryType` keys,"
explicitly requiring the four Plan arrays and their predicates to move out
of `plan-*/print.js` into that module. Confirmed on `master`:

- `readiness-config.js` does not exist anywhere in the repo.
- `readiness-card.js` is a small renderer
  ([readiness-card.js:17-26](src/core/filing/readiness-card.js#L17-L26))
  taking `(data, issues)` directly — no stable row IDs, no
  `{automatic, manual, unsupportedCount}` shape, no retained disclosure
  state, no reset behavior, nothing resembling the spec's configuration
  source.
- `filingReadinessCard()` is called from exactly three feature `print.js`
  files (Guardian Inventory, Simplified Accounting, Annual/Final/Trust
  Accounting — e.g.
  [annual-accounting/print.js:70](src/features/annual-accounting/print.js#L70)).
  All four Plan types still call their own `planReadinessChecks*()`
  (e.g. `planReadinessChecksAnnual()` at
  [plan-annual/print.js:33-104](src/features/plan-annual/print.js#L33-L104),
  returning `{auto, manual}` locally) — the exact legacy panels 38B's own
  spec says must be migrated and removed, not left running alongside the
  new card.
- Neither `readiness-source-map.spec.js` nor `readiness-card.spec.js`
  (both named in the original scope) exist.

### Decisions Required

None beyond what `MILESTONE-38B-PROPOSAL.md` and
`MILESTONE-38B-SOURCE-INVENTORY.md` already settled — those documents
already resolved the Pinellas/Pasco title logic, the DSHP
non-discriminator decision, and the per-filing-type source workslip
mapping. This sub-delivery is completion of an already-approved design,
not a new one. Re-confirm `MILESTONE-38B-SOURCE-INVENTORY.md`'s per-type
condition tables are still accurate against current validators before
using them as the migration source (they were written against the same
2026-09-11 commit whose "landed" claim this document is correcting).

### Steps

1. Create `readiness-config.js` with `getFilingReadiness()` per 38B's
   spec, sourcing automatic blocking rows from typed issues with
   `showInReadiness: true` (available after 44B lands).
2. Move the four Plan types' `auto`/`manual` arrays and predicates out of
   `plan-*/print.js` into `readiness-config.js`, preserving every existing
   ID, label, and predicate per the spec's explicit instruction not to lose
   any.
3. Replace each Plan type's `planReadinessChecks*()` call with
   `filingReadinessCard()` fed by `getFilingReadiness()`, matching the
   pattern the three already-migrated feature families use.
4. Delete the now-dead `planReadinessChecks*()` functions and their
   legacy always-expanded panel markup.
5. Add `readiness-config.js`'s and `readiness-card.js`'s named unit specs.

### Verification

For each of the four Plan types: confirm the new card's automatic-check
set matches the old panel's `auto` array exactly (same predicates, same
pass/fail per existing fixture ward), via a before/after diff run — 38B's
own spec requires "Only the proven predicates and export behavior remain
unchanged." New e2e coverage confirming Pinellas/Pasco title logic and the
accordion collapse/expand behavior work identically across all nine
filing types, not just the three already migrated.

### What landed (2026-09-13)

- **`src/core/filing/readiness-config.js` (new)** — `getFilingReadiness(inventoryType, data, validationIssues)`
  returning `{ key, automatic, manual, unsupportedCount }`, every row with a
  stable `id`, `label`, `route`, `classification`, `blocking`. The key list
  is `FILING_TYPE_KEYS` from the filing registry (Milestone 42G's
  enumeration guard rejected a hand-listed copy). Automatic blocking rows are
  taken from typed issues with category `validation`/`data-integrity` and
  `showInReadiness: true` — never recomputed. The four Plan predicate tables
  moved here **verbatim** (only `window.D` became the `data` argument);
  all four parity suites pass through the new module unchanged, which is
  the "same predicates, same pass/fail per fixture" diff the Verification
  section asked for. Manual rows for all nine filings come from
  `MILESTONE-38B-SOURCE-INVENTORY.md`'s tables word-for-word; each
  filing's unsupported family is counted, never rendered.
- **One documented design point, not in 38B's text:** 38B assumed 38D
  Phase 1 would map each Plan predicate onto a canonical issue id; it did
  not (Plan validators now emit typed `planX.<path>.required` issues, but
  nothing links them to predicate ids), so a Plan's predicate row and its
  typed twin would both render. The rule landed: while any predicate is
  pending, the filing's own validator issues (typed `planX.*` or plain
  strings) are represented by the predicate rows, which the parity suites
  prove cover them; once every predicate passes, any validator issue still
  outstanding — the conditional "explanation required when…" rules the
  parity suites record as `autoStaysTrue` — is listed itself, routed via the
  Print Preview resolver, so the card can never report "Automated checks
  passed" while export is blocked (the old panel could). Typed date-draft
  and data-integrity issues add rows on every filing regardless. Issue rows
  that carry a path but no route get theirs from `resolveRouteFromSection()`,
  the same resolver the Preview jump links use.
  - **Superseded 2026-09-15 — the missing mapping now exists.** The blanket
    rule described above ("while any predicate is pending, suppress all of
    this filing's own validator issues") was always a stand-in for the
    predicate→issue-id link 38D Phase 1 never delivered, and it over-reached:
    an issue *no* predicate checks (the conditional `autoStaysTrue` rules)
    stayed hidden until every unrelated predicate passed, so a filer met
    their blockers one at a time. `readiness-config.js` now carries
    `PLAN_PREDICATE_ISSUE_PATHS` — each Plan predicate row mapped to the
    validator `path`s it actually covers, taken from what the four
    `plan-*-parity.spec.js` suites already prove — and suppresses per issue
    code instead. Plain-string issues keep the blanket rule, since
    `validation.legacy-unmapped` carries no path to match on. Guarded by
    `tests/unit/readiness-predicate-coverage.spec.js`. **Naming caveat:** the
    original `MILESTONE-38D-PROPOSAL.md` assigned this mapping to *Phase 1*
    and used "Phase 2" for revision-bound acknowledgement and output-gate
    unification; "38D Phase 2" as used in this section and since is the
    informal label for the leftover mapping work only.
- **`src/core/filing/readiness-card.js` (rewritten)** — `renderReadinessCard({ filingType, data, validationIssues, expanded })`,
  `bindReadinessCard(container)`, `resetReadinessCardState()`. One native
  `<details id="filing-readiness-card">` with one `<summary>`; escapes all
  text; no inline handlers; pending automatic checks open it, otherwise a
  fresh render is collapsed; a hand toggle is remembered per
  `wardId + filingType` for same-route rerenders (the `toggle` listener is
  capture-phase on `document`, bound once from `main.js`; note the event is
  dispatched on a later task, so an e2e test that rerenders in the same
  tick as the click must first await the `toggle` — the new contract spec
  does, after a parallel-worker run showed the race); the router calls
  `resetReadinessCardState()` whenever navigation leaves `/print`. Summary
  wording when automatic checks pass and manual/unsupported items remain
  is exactly **Automated checks passed; manual review remains.** Issue rows
  with a route delegate to the existing `jump-to-field` handler;
  readiness-only rows render no link. `filingReadinessCard()` (the old
  `(data, issues)` renderer) is gone; the three already-migrated hosts now
  call `renderReadinessCard()` like the four Plans.
- **`county-guidance.js`** — `getReadinessJurisdiction(county)` per spec.
- **Removed:** `planReadinessChecks()`/`planReadinessPanel()` from
  `legacy-app.js`, the four `planReadinessChecksX()` functions from
  `plan-*/print.js`, and their four `window.*` bridges from `plan-*/index.js`
  (allow-list and `window-bridge.d.ts` regenerated). The Plan hosts no
  longer import `county-guidance.js`, `signature-state.js`, or the
  `PLAN_RIGHTS`/`PLAN_ADLS`/`INITIAL_ADLS` globals — `readiness-config.js`
  reads those three legacy globals lazily at call time.
- **Tests:** new `tests/unit/readiness-card.spec.js` (15) and
  `tests/unit/readiness-source-map.spec.js` (the inventory's five-point
  completeness contract, 49); `plan-*-parity.spec.js` ×4 and
  `plan-readiness-county.spec.js` re-pointed at `readiness-config.js`
  (the county spec lost all its PDF-pipeline stubs, and gained a
  no-local-text check for the five accounting/inventory filings); new
  `tests/e2e/readiness-card.contract.spec.ts` covering all nine filing keys
  (one card, Pinellas/Pasco vs. other title, collapsed manual-review
  default, keyboard toggle retained across rerender and reset on fresh
  entry, jump routing on Guardian Inventory, unlinked predicate rows on
  Plan Annual, card absent from the generated PDF);
  `plan-readiness.contract.spec.ts`'s 40H-F dangling-global test replaced
  by a "dispatcher and bridges are gone; exactly one card" test.
  Full unit suite 738/738. `TEST-INDEX.md` updated (and Plan Initial's
  stale "19 auto conditions" corrected to 20, which 40C-H had made true).
- **Persistence:** no data-model catalogue update required — expanded
  state is runtime-only.
- **Documentation:** no user help describes the old always-expanded Plan
  panel, so no additional documentation change.
- **Deliberately not done:** no predicate was rewritten to a typed issue
  (that is 38D Phase 2's migration of the Plan validators, not 38B's), and
  no visual redesign beyond what the shared card already renders.
- **Gap found later, same day, while unrelated work (Milestone 43H)
  incidentally exercised this page:** `navigation-status.contract.spec.ts`'s
  Guardian Inventory "Print Preview panel and the blocked-export alert
  agree" test started failing on a strict-mode locator violation — the
  shared readiness card reuses the exact `.validation-panel
  .validation-title` classes the classic error panel (`validationPanel()`)
  already used on the same Guardian Inventory print page, and this one test
  site had no disambiguating filter (`pdf-preview-viewer.spec.ts` already
  did). 44C's own verification pass never ran this file. Fixed with the
  same `.filter({ hasText: /required field/ })` technique already
  established elsewhere; confirmed via `git stash` that no other
  `.validation-panel .validation-title` site in `tests/e2e/` was similarly
  exposed.

---

## 44D — Correct 37-6 Data-Model Catalogue Drift

**Relation:** Independent; documentation-only. **Coordinate with Codex's
concurrent 38E work before starting** — see Sequencing note above; both
touch `probate-guardian-data-model.csv`. **Risk:** Low — no runtime code
changes, only the CSV catalogue and its prose notes.

### Files

`probate-guardian-data-model.csv` only.

### Background

Milestone 37-6 (Guardian and Co-Guardian Signature Cards) rolled out
Add/Remove Co-Guardian controls and reduced the runtime seed count to one
guardian row across all four Plan types — confirmed still true on current
`master`:

- All four Plan types' `emptyDataPlan*()` factories in `src/core/state.js`
  seed exactly one `planGuardians` row
  ([state.js:192, :281, :357](src/core/state.js#L192)).
- All four `plan-*/index.js` files have working
  `data-form-action="add-plan-guardian"`/`"remove-plan-guardian"` controls
  (e.g.
  [plan-annual/index.js:576,613](src/features/plan-annual/index.js#L576)),
  gated at caps of 2 (Simplified), 3 (Annual), 2 (Minor), 4 (Initial).

But `probate-guardian-data-model.csv` still states the pre-37-6 seed
counts (e.g. row 305, Plan Simplified: seed count 2) and, for at least
Plan Simplified's row, explicitly and now-incorrectly says *"every Plan
type hard-seeds a fixed-length array with no add/remove UI (only a
per-row 'Link Person' button)"* — flatly wrong since the `remove-plan-guardian`/
`add-plan-guardian` actions exist and work. `npm run verify:data-model`
passes regardless, since it checks CSV structural validity, not
correspondence with the runtime factories it documents — this is exactly
the single-source-of-truth violation `AGENTS.md` warns against.

### Decisions Required

None — this is a factual correction to bring documentation in line with
already-shipped, already-tested runtime behavior.

### Steps

1. Re-grep every Plan-type guardian-collection row in
   `probate-guardian-data-model.csv` (Simplified/Annual/Initial/Minor Plan,
   plus the Simplified/Annual Accounting `guardians[]` rows the same
   review flagged) for stale seed-count and floor/cap columns; correct each
   to match its `state.js` factory and its `index.js` add/remove-button
   gate exactly.
2. Rewrite or remove every note claiming Plan types have no add/remove UI.
3. Re-run `npm run verify:data-model` (structural check only — does not
   itself catch these drifts, but must still stay green).

### Verification

Manual cross-check: for each corrected row, read the actual `state.js`
factory and the actual `index.js` gate condition (`g.length<N`) side by
side with the new CSV text, confirming they agree. No automated test
exists for CSV-to-runtime correspondence today; if this recurs, that gap
is worth a future milestone of its own (a lint script comparing seed
counts is straightforward but out of scope here).

---

## 44E — Milestone 39 Follow-On Scope Decision (informational, not a defect) — SUPERSEDED

**Relation:** Independent, no forced action. **Risk:** N/A.

**Status: superseded before this document's own closing note was written.**
This section originally reported 39-D and 39-A's follow-ons as an open,
undecided scope question. That was already stale the moment it was
recorded: `MILESTONE-45-PROPOSAL.md` (39-A's rollout) and
`MILESTONE-46-PROPOSAL.md` (39-D's promotion) were both scoped in `8cc6d8f`
on 2026-09-13 at 23:27 — hours **before** this document's "Full-milestone
verification" closing note (`d2a1029`, 2026-09-14 05:49). Nobody had
cross-referenced them at the time, so the decision this section asked for
sat here looking open when it had already been made and largely executed.
Left in place below for the record, with the correction up front rather
than rewritten silently.

Current state, checked directly against `master`:

- **39-D**: promoted and mostly landed. `MILESTONE-46-PROPOSAL.md` —
  46A (append-only per-party signature store) and 46B (apply-by-copy) are
  **landed** (`a457bbd`, `e1f1aaf`). 46C (an export/import fix for a
  reference-based design) was **cancelled outright**, not deferred, once
  46B's copy-on-apply design made the dangling-reference problem it existed
  to fix moot.
- **39-A**: rolled out. `MILESTONE-45-PROPOSAL.md` — 45A (storage/
  compression pass) and 45B (rollout from the Plan-Simplified-only pilot to
  all nine filing keys) are **landed** (`508d09e`). 45C (making a reopened
  annotation re-editable, not just visible) is **declined as of 2026-09-15**
  (see its own section's closing note) — no filer has reported needing it,
  and current preview-only behavior remains sufficient. Both of 39-A's
  named follow-ons are now fully disposed of, closing this section's last
  remaining thread.

### Original text (for the record)

The review's sixth finding is not a status-text/reality mismatch — it is a
confirmation that Milestone 39's own documented scope boundaries are still
accurate:

- **39-D** (reusable, versioned per-party signature stamp) remains
  unapproved and unimplemented, exactly as `MILESTONE-39-PROPOSAL.md`
  itself states at its design (line 1205) and implementation-gate (line
  1478) sections. Its open decisions (compound party/image references,
  single-filing export/import portability, `caseFile.parties[]` schema
  expansion, unbounded-vs-capped per-party storage) are real and
  unresolved.
- **39-A** (in-place PDF annotation) remains a Plan-Simplified-only pilot
  — confirmed via grep: `{ annotate: true }` is passed only from
  [plan-simplified/print.js:122](src/features/plan-simplified/print.js#L122),
  nowhere else. Its named follow-ons (wider filing coverage, storage
  compression, live-editor rehydration on reopen, external-viewer visual
  verification beyond the current pdf.js re-parse test) remain open by the
  proposal's own design, not by omission.

**DECISION NEEDED, no recommended default** (as originally written; already
answered by 45/46 above): whether to formally scope any of 39-D or 39-A's
named follow-ons as a new milestone now, or leave them deferred
indefinitely as already-documented future work. Nothing here blocks
44A-44D; this section exists only so the review's sixth finding has a
recorded disposition rather than silently dropping out of the compiled
list.

---

## Full-milestone verification, once 44A-44D have landed

`npm test` full green. Re-verify `MILESTONE-38A/B/D-PROPOSAL.md`'s status
lines actually match shipped code at that point — not assumed from this
document's own claims — the same "check 'we said we'd fix X' against 'X is
actually fixed'" discipline `MILESTONE-42-PROPOSAL.md` and
`MILESTONE-43-PROPOSAL.md` both closed with. Re-run this milestone's source
review technique (direct grep/read of every cited file:line above) rather
than trusting this document's citations to still be accurate at
implementation time — `master` will have moved, including via Codex's
concurrent 38E work.

### Closing note (2026-09-14)

**38A/B/D status lines re-verified against shipped code, not just read.**
All three now live in `MILESTONE-ARCHIVE.md` (36-40I were archived
2026-09-14); their status text already reads as corrected (38A "Landed
2026-09-11, together with 38B, 38C and 38D"; 38B "Landed 2026-09-13 under
Milestone 44C" with the overstated `b0321dd` claim called out; 38D "Landed
2026-09-13 under Milestone 44B") rather than the stale text this
milestone was opened to fix. Spot-verified the underlying code directly,
not just the prose:

- **44A** — `issue-registry.js:13` still defines
  `'simplified.guardian.address-conflict'` with `bypassable: false`;
  `simplified-accounting/index.js:639` still calls `createIssue()` with
  that code at the conflict site.
- **44B** — `issue-registry.js` still carries all 10 `supplemental.*`
  codes and the 5 `output.*` technical/security codes; `excel.capacity.*`
  is resolved via `getIssueDefinition()`'s regex branch (`:35-36`,
  `category: 'capacity'`, `bypassable: false`, `capabilities: ['excel']`),
  not a literal registry entry — confirmed by reading the function rather
  than grepping for a string that was never meant to exist there.
  `src/core/excel/excel-capacity.js` exists and constructs exactly that
  code shape. `authorizeFilingOutput` is wired into all 7 `print.js`
  hosts. The doc's own "flagged, not fixed" gap — the three accounting
  hosts' Print-page capacity display (`index.js`'s `capOver =
  checkExcelCapacity(...)` feeding `pagePrint()`) still reads the legacy
  untyped global instead of `getExcelCapacityIssues()` — is still
  accurate; not silently closed by later work.
- **44C** — `src/core/filing/readiness-config.js` and `readiness-card.js`
  exist as described; `grep -c 'function planReadinessChecks\b'
  src/legacy-app.js` returns 0, confirming the old panel is actually gone,
  not just superseded.
- **44D** — re-confirmed in the prior session turn against `git show
  9e65cba`; no change since.

**`npm test` full green** — 786/786 unit, 517/523 e2e (6 intentionally
skipped, 0 failed). This is the number *after* fixing a real regression
the first run of this closing pass found; see below.

**The verification did catch a real "milestone landed without running the
full suite" gap — just not in 44A-44D, in 38E.** The first `npm test` run
during this closing pass (before any fix) had 2 failing e2e tests:
`ward-lock.spec.ts` ("entering the dashboard releases the ward lock") and
`backup-restore-sav.spec.ts` ("Open Backup replacing actively open ward").
Root cause: Milestone 38E's own `setD()` change (`src/core/state.js`,
`48b39b77`, 2026-09-11) unconditionally runs `normalizeWardData(d)`
whenever `d` is truthy, and the "no active ward" sentinel `{}` is truthy —
`normalizeWardData()`'s field-backfill logic then silently grows that
sentinel to 16 blank-string keys every time `enterDashboardEditingFocus()`
clears it, which is every `/dashboard` navigation. This is the same
pattern 44B's own "Second follow-up" section above already documented
once for 38E (three stale test expectations caught only because this
session happened to run `npm test`, "that milestone's own landing didn't
run `npm test` first") — a second, independent instance of it, this time
a real product defect rather than a stale test. Fixed with a one-line
guard in `normalizeWardData()`; pinned with a new direct regression test
in `tests/e2e/legacy-ward-data-normalization.spec.ts` (confirmed failing
before, passing after); both originally-failing tests confirmed passing
after the fix. Landed as `e4b6d23`, outside 44A-44D since it is a defect
in 38E's own code, not a gap in any of this milestone's four sub-deliveries.
See `MILESTONE-42-PROPOSAL.md`'s closing note for the same finding, since
this same `npm test` run served both milestones' closing verification at
once.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
