# Milestone 51: Dead Code, Dead Bridges, and Parallel Implementations — Executable Delivery Index

## Status

**All seven sub-deliveries landed 2026-09-15.** Alan approved 51G + 51C by
name, then authorized the remainder in this document's recommended order.
Executed in that order — 51G, 51C, 51A, 51B, 51E, 51D, 51F — with each
sub-delivery's own verification block run before its commit:

| Sub-delivery | Commit | Verification |
| --- | --- | --- |
| 51G | `6e04d30` | routes.spec.ts 22 passed |
| 51C | `6521e1a` | unit 853/853 (+6 new guards); e2e 30 + 68 passed |
| 51A | `374dcb1` | unit 842/842; e2e 28 + 7 passed |
| 51B | `09ac96b` | unit 839/839; e2e 46 passed |
| 51E | `4eba207` | unit 839/839; new spec 7/7; e2e 27 passed |
| 51D | `5328954` | 14,704-cell workbook gate at 0 diffs; **full regression** 562 passed |
| 51F | `851d17b` | 336-row panel-identity gate at 0 diffs; e2e 84 passed |
| 51H | (below) | red-first regression test; collection-controls 8/8, guardian e2e 60 passed |
| 51I | (below) | the label audit that had been red all along now passes; terms gate 8/8 |

Two commits sit alongside these: `dc5d1ad` repaired a pre-existing
`routes.spec.ts` failure that was shadowing 51's gates (7e9596e had moved the
dashboard resource links into collapsed `<details>` accordions without
updating the e2e assertions), and `cbe5558` moved this document's out-of-scope
list to carry the defects found during execution.

**What changed from the plan, recorded rather than silently applied:**

- **51C's guard discipline was stated wrongly in this document.** It said both
  C1's and C2's guards should "pass against current `master`." That is right
  for C2 (a precondition guard) but wrong for C1 — a dead-code *detector* must
  go red before the fix or it is detecting nothing. C1's went red on all three
  branches, then green.
- **51C's destructure count was 10, not 12 — and the real number was 12.**
  `toggleSsnReveal` turned out to be dead in **five** feature modules, not
  three; its only real call site is `form-events.js`'s delegated `toggle-ssn`
  handler.
- **51A needed a justification this document did not have.**
  `eligibility-modal.js` has a second export, `checkSimplifiedEligibility()`,
  which is also dead — the rule is reimplemented inline in three places. Worth
  recording that the dead version treated an *unanswered* field as ineligible
  where the live banner only warns on an explicit `'No'`; the live code is the
  one that respects `AGENTS.md` §3.
- **51D's `setCell` was duplicated three times, not once**, and adopting core's
  left `sanitizeForExcel` unused in all three files, so that went too.
- **51E's verification improved on the plan.** This document asked for a manual
  click-through. Checking first showed five of the eleven handlers had *no* e2e
  coverage at all, so the manual pass became
  `guardian-inventory-collection-controls.spec.ts` (7 tests), which also pins
  the bridge decision itself.
- **Two of the verification gates were vacuous on first attempt**, and both are
  recorded in their commits: 51D's workbook gate reported "identical" with
  `percentValue` deliberately broken (the fixture populated no Schedule D rows),
  and 51F's panel gate missed a `>` → `>=` flip (a fixture overflowing by
  exactly cap+1 satisfies both). Both were corrected until an injected fault
  produced a real diff. A gate that cannot fail is not evidence.

**The original Draft text is left below as the historical proposal.** Per
`AGENTS.md` §2 it authorized nothing on its own; approvals are recorded by the
commits above.

---

**Original status (historical):** Draft — not an authorization to implement
anything below. Per `AGENTS.md` §2, this is a proposal only; nothing here
should be started until Alan explicitly approves a specific sub-delivery by
name. Approval of one sub-delivery does not authorize the others.

**Numbering note.** This work was originally handed over as "Milestone 49."
That number is already taken: Milestone 49 and 49B landed 2026-09-14
(`f4a87ec` — two-record Compare, unmerge with one-level tracking, near-name
matches; `ec0b5cf` — ward identity as a shared role, closed filings cut off
until synced) and are referenced from live code in `src/core/party-resolver.js`,
`src/core/navigation/ward-county.js:277`, `src/legacy-app.js:3703`,
`src/core/types/parties.js:26`, two e2e specs, three `TEST-INDEX.md` rows, and
four places in `MILESTONE-50-PROPOSAL.md`. Like 47 and 48, Milestone 49 landed
without a proposal document; a separate backfill (`MILESTONE-49-PROPOSAL.md`)
reconstructs it. This document takes 51, which nothing in the repository
references.

## Source and verification status

The finding list came from an external audit pass handed over by Alan, then
was checked item by item against current `master` (`958da78`) before this
document was written — every claim below was re-derived from the source, not
copied. Per this repository's convention, the corrections that pass produced
are recorded in place rather than silently applied:

1. **"Features reimplement the excel-engine helpers locally" was right for
   some and wrong for others, in both directions.** `setCell`, `numValue`
   (`nv`) and `percentValue` (`pv`) do have byte-equivalent local copies —
   and `setCell`'s is duplicated three times, which the original list did not
   have. But `protectSheet` and `autoFitColumns` have **no** local
   counterpart anywhere in `src/`: `sheet.protect(` and any column-width
   assignment appear only inside `excel-engine.js` itself. Nothing in this
   app has ever protected a worksheet or auto-fitted a column, so "wire these
   up" is not consolidation — it is new formatting and protection behavior
   reaching a filed court workbook. They are handled separately below
   (Decision 2). `readCellNumber`/`readCellDate` have local counterparts that
   **diverge** (Decision 3), so they are not mechanical swaps either.

2. **The combobox accessibility framing was outdated.** The original list
   described the live comboboxes as "a separate non-accessible hand-rolled
   implementation." Milestone 50H (landed 2026-09-14) gave the county
   combobox a full WAI-ARIA contract — `role="combobox"`,
   `aria-autocomplete="list"`, `aria-controls`, `aria-expanded`,
   `aria-activedescendant`, `role="listbox"`/`"option"`, and keyboard
   navigation (`src/legacy-app.js:1405-1500`) — and the ward selector carries
   the same attributes (`~3986-4057`). `ComboboxController` is still dead
   code; it is just not the accessible-versus-inaccessible choice the list
   implied. Per Alan, Codex reports the ward-name modal comboboxes and the
   Guardian-specific county markup remain incomplete; that is a **separate**
   accessibility item and is explicitly **out of scope here** (see
   "Deliberately out of scope").

3. **The Guardian Inventory bridge count was 13 of 14 dead, not 12.**
   `window.pageNav` has zero consumers in `src/` or `tests/` —
   `guardian-inventory/print.js:12` imports `pageNav` as an ES module export,
   never through `window`. The bridge assignment is dead even though the
   function is alive. Only `window.validateGuardian` has real consumers
   (three call sites in `src/legacy-app.js`: `:6675`, `:7068`, `:7589`).

4. **`checkExcelCapacity`'s "sibling excel.js files call the core version"
   is true but indirect** — they call `getExcelCapacityIssues()`, which wraps
   it. Both implementations are live, on two different paths. A second
   instance of the same pattern was found that the list did not have: core
   `readCellText` (`excel-engine.js:163`) delegates to `window.readCellText`
   when present, while all three feature `excel.js` files destructure
   `readCellText` off `window` directly.

5. **One addition to the plan-file findings:** `plan-simplified/index.js`
   also destructures `countyInputS` without using it. The original list named
   only `plan-annual`, `plan-initial` and `plan-minor`.

6. **One nuance confirmed on the eligibility modal:** `src/main.js:30` does
   side-effect import it, so the module loads. It calls
   `showModal('eligibilityModal')`; the only such id in the app is
   `simplifiedEligibilityModal` (`src/legacy-app.js:4457`), and no
   `eligibilityModal` id exists in `index.html`. The module loads and is
   functionally inert.

Everything else on the original list reproduced exactly as described.

## Why this is one milestone and not fourteen commits

Every sub-delivery below touches at least one of three shared governance
surfaces: `tests/unit/fixtures/window-bridge-allowlist.json`,
`src/core/types/window-bridge.d.ts`, and `TEST-INDEX.md`. The first two are
generated (`node scripts/audit-window-bridge.mjs --json` / `--declare`) and
checked by `tests/unit/window-bridge.spec.js`. Two agents editing those
concurrently produces a guaranteed conflict on files where a merge resolution
is not obviously correct. See "Sequencing and concurrency" below — the
short version is that this milestone is **sequential, not parallelisable**,
which is the opposite of the usual advice for a cleanup sweep.

## How this index is organized

Each sub-delivery states **Risk**, **Files**, numbered **Steps**, a
**Verification** block, and — per `AGENTS.md` §8 — cross-cutting
ramifications, marked **N/A** where genuinely inert rather than left silent.

| Sub-delivery | What | Risk | Size |
| --- | --- | --- | --- |
| 51A — Dead whole-module deletions | 4 files, ~359 lines, zero production importers | Low | Small |
| 51B — Dead exports inside live modules | 9 exports across 6 modules | Low | Small |
| 51C — Dead branches, dead data, dead locals | 5 unreachable branches, 1 unused key, 7 unused closures, 10 unused destructures | Low | Small |
| 51D — `excel-engine.js`: consolidate real duplicates, remove never-wired capability | 5 consolidations, 7 removals | **Medium** | Medium |
| 51E — Dead `window.*` bridges over live functions | 13 assignments | Low | Small |
| 51F — `checkExcelCapacity`: one implementation | Rewire 3 features, delete legacy twin | **Medium** | Small–medium |
| 51G — `renderDashboardWorklist()` and its container | A confirmed complete no-op | Low | Trivial |
| 51H — The disappearing co-guardian card | **A correctness fix, not cleanup** — added after the original seven | Low | Trivial |
| 51I — Redundant label association on the terms checkbox | **A correctness fix, not cleanup** — added after the original seven | Low | Trivial |

**51H and 51I were not in the original scope.** Both are defects this milestone
*found* while executing, recorded first in its out-of-scope list, then fixed
inside 51 at Alan's direction rather than deferred. They are the only two
sub-deliveries here that change behavior a user can see.

## Decisions taken during scoping

These were put to Alan as choices before this document was written, and are
recorded here as settled. They are decisions about *what the plan is*; the
`AGENTS.md` §2 gate on *executing* it still applies.

**Decision 1 — Excel helpers: consolidate only the true duplicates.**
Replace the local copies of `setCell`, `numValue`/`nv` and
`percentValue`/`pv` with the core exports, because those are logically
identical and the swap is provably behavior-neutral. Do **not** mechanically
swap the readers (Decision 3) and do **not** wire up the never-used
capability (Decision 2).

**Decision 2 — `protectSheet` and `autoFitColumns` are removed, and that is
not a product judgment.** Neither has ever been called. Enabling them would
ship court workbooks that are cell-protected and column-resized — visible in
a document a clerk receives, and in sheet protection's case something a clerk
may need to defeat in order to do their own work. This milestone removes
unbuilt capability so the tree stops implying a behavior it does not have. It
takes **no position** on whether either would be desirable. If sheet
protection or auto-fit is wanted, it is a new feature with its own proposal,
its own clerk-facing review, and its own acceptance criteria — not a cleanup
side effect. The code is recoverable from git history at `958da78`.

**Decision 3 — the cell readers are documented, not swapped.** `readCellNumber`
returns `0` for an unparseable cell; the features' local `gcNum`
(`annual-accounting/excel.js:433`) returns `''`. In an accounting schedule
that is not a cosmetic difference — `0` is a stated zero the court reads as
an assertion, `''` is a blank the readiness card flags as missing. The
feature readers also route through `unwrapCellValue` for formula cells, which
the core readers do not. `readCellNumber` and `readCellDate` are therefore
removed as unused rather than adopted, and the divergence is recorded in
`excel-engine.js` so a future consolidation attempt starts from the known
semantics rather than rediscovering them.

**Decision 4 — `ComboboxController` is deleted.** With the accessibility
premise corrected (see Source note 2), nothing distinguishes it from any
other unused module. Consolidating the app onto one combobox implementation
may still be worth doing; it is a separate milestone, and deleting this class
does not foreclose it — the class is recoverable from git history, and the
live implementations are the ones any consolidation would have to converge
on anyway.

**Decision 5 — `checkExcelCapacity`: the core module survives.** The three
feature `index.js` files stop destructuring it from `window` and import the
core version; the legacy twin is deleted. The core version is a strict
superset (accepts explicit `sourceData`, emits an extra `key` field) and
`excelCapacityPanel()` reads only `label`/`route`/`cap`/`count`, so the swap
should be behavior-identical. This also matches the direction of travel set by
42C and 42E rather than making a core module depend on a legacy global.

**Decision 6 — Guardian Inventory bridges: delete 11, keep 3.** Delete
`addGuardian`, `removeGuardian`, `addRecipient`, `removeRecipient`,
`addWitness`, `removeWitness`, `syncB2VehicleDescription`, `toggleB2Vehicle`,
`setScheduleNoItems`, `removeEntry`, and `pageNav`. Keep `addEntry` and
`duplicateEntry` — two e2e specs drive them through the bridge deliberately,
and rewriting working tests to click UI is not this milestone's job. Keep
`validateGuardian` — `legacy-app.js`'s production `validate()` flow depends
on the global directly.

---

## 51A — Dead Whole-Module Deletions

**Risk:** Low — four modules with zero production importers. The only
non-trivial part is that two of them are side-effect imported, so the import
sites must go with them.

### Files

`src/core/persistence.js` (delete, 26 lines),
`src/features/dashboard/preferences.js` (delete, 65 lines),
`src/core/modals/eligibility-modal.js` (delete, 30 lines),
`src/core/form/combobox-controller.js` (delete, 238 lines),
`tests/unit/dashboard-preferences.spec.js` (delete),
`tests/unit/combobox-controller.spec.js` (delete),
`src/main.js` (two import lines), `src/form-events.js` (one import line),
`tests/unit/fixtures/window-bridge-allowlist.json`,
`src/core/types/window-bridge.d.ts`, `TEST-INDEX.md`.

### Steps

**A1. Delete `src/core/persistence.js`.** Its four re-exports (`autoSave`,
`flushPendingSave`, `saveWardToState`, `navigate`) have zero importers —
every real caller reaches `window.*` directly, which is what the file's own
header says it exists to avoid. No import site to clean up; nothing imports
it. Verify with a search for `core/persistence.js` that returns only hits
under `src/core/persistence/` (the unrelated directory) before deleting.

**A2. Delete `src/features/dashboard/preferences.js` and its spec.** Never
imported by `dashboard/index.js` or anything else; a leftover from the
pre-Milestone-36-1 multi-role dashboard, as its own comments say. Note it
owns `localStorage` key `pg-dashboard-preferences-v1` — see Legacy Data
Migration below.

**A3. Delete `src/core/modals/eligibility-modal.js`, its `src/main.js:30`
import, and its `window.showEligibilityModal` bridge.** The live Simplified
Accounting eligibility flow is a separate implementation in `legacy-app.js`
(`showSimplifiedEligibilityModal`, `:4441`). The dead module targets
`showModal('eligibilityModal')`; no element with that id exists in
`index.html`, so calling it would open nothing.

**A4. Delete `src/core/form/combobox-controller.js`, its spec, its
`window.ComboboxController` bridge, and the `src/main.js:9` /
`src/form-events.js:7` imports.** Per Decision 4. Record in the commit
message that the deletion is a dead-code removal and explicitly **not** a
judgment that the live comboboxes are preferable, so a future reader does
not mistake it for a rejected consolidation.

**A5. Regenerate the bridge governance files and update `TEST-INDEX.md`.**
`node scripts/audit-window-bridge.mjs --declare` rewrites
`window-bridge.d.ts`; regenerate the allowlist from the same script's
`--json` output. Remove the `combobox-controller.spec.js` and
`dashboard-preferences.spec.js` rows, and their mentions in the `form-data`
and `app-shell / misc` coverage-axis rows (`TEST-INDEX.md:221`, `:225`,
`:226`).

### Verification

`npx vitest run tests/unit/window-bridge.spec.js` (the allowlist and `.d.ts`
must be back in sync), plus `npx tsc --noEmit` if the repo's type check is
wired, since `window-bridge.d.ts` changes. Then a targeted e2e pass on the
surfaces these modules were adjacent to even though they were inert:
`npx playwright test tests/e2e/carryover-workflow.spec.ts` (exercises the
real `simplifiedEligibilityModal` flow, confirming A3 removed the dead twin
and not the live path) and `tests/e2e/routes.spec.ts` (dashboard mount, for
A2). A grep for each deleted symbol returning zero hits is the acceptance
gate for A1–A4.

### Cross-cutting ramifications (`AGENTS.md` §8)

- **Data Model:** N/A — no persisted case data. No `probate-guardian-data-model.csv`
  row changes.
- **Legacy Data Migration:** **Not N/A, and worth stating.** A2 orphans the
  `localStorage` key `pg-dashboard-preferences-v1` in the browsers of anyone
  who used the app before Milestone 36-1. Nothing reads it today, so deleting
  the module changes no behavior — but the key is not cleaned up either. The
  recommendation is to **leave it**: per `AGENTS.md` §10 this is a pure UI
  preference carrying nothing sensitive, it is a few dozen bytes, and adding
  removal code means shipping a migration whose only purpose is to delete
  something already inert. State this in the commit message so it is a
  recorded decision rather than an oversight.
- **Test Coverage & Index:** two spec files deleted, `TEST-INDEX.md` updated
  in the same commit per §7.
- **Export/Import/Portability:** N/A — none of the four participate in any
  export, import or backup path. `src/core/persistence.js` is named like it
  might; it does not (it is four one-line pass-throughs nothing calls).
- **Security & Sensitivity:** N/A — no new stored data. Net reduction in
  `window` surface area.
- **UI/UX Consistency:** no user-visible change. A4's note above is the
  relevant record.
- **Legal/Compliance:** N/A.

---

## 51B — Dead Exports Inside Live Modules

**Risk:** Low. Each is a single-export deletion from a module that stays.
One item (B6) needs its rationale recorded rather than just its deletion.

### Files

`src/core/form/date-parser.js`, `src/core/form/guardianship-options.js`,
`src/core/state.js`, `src/tab-state.js`, `src/core/navigation/router.js`,
`src/core/navigation/ward-county.js`, `src/core/navigation/ward-lifecycle.js`,
`tests/unit/tab-state.spec.js`, `tests/unit/router.spec.js`,
`tests/unit/filing-county-defaults.spec.js`,
`tests/e2e/party-resolver.spec.ts`, plus the bridge governance files and
`TEST-INDEX.md`.

### Steps

**B1. `dateInputHTML` — `date-parser.js:134`.** Zero references anywhere,
including its own spec. `date-parser.spec.js` imports `parseFlexibleDate`,
`formatDisplayDate`, `isLeapYear` and `getDaysInMonth` only, and the rest of
the module is heavily used, so this is a single-function deletion with no
spec change. Its `data-field-kind="date"` / `data-field-format-policy`
markup belongs to the Tier 1 field-primitive design that `form-fields.js`
actually implements (`form-fields.js:25`, `:116`), so it is superseded, not
merely unused — say so in the commit message per `AGENTS.md` §9.

**B2. `GUARDIAN_CLASSIFICATION_OPTIONS` — `guardianship-options.js:19`.**
Unreferenced, and — unlike the original list's framing — not referenced by
its own spec either; `guardianship-options.spec.js` imports the other four
exports. Straight deletion, no spec change. `GUARDIANSHIP_TYPE_OPTIONS` and
`GUARDIANSHIP_LIFECYCLE_OPTIONS` in the same file are live in four features
and stay.

**B3. `getAllAppState` (`state.js:80`) and `getActiveInventoryType`
(`state.js:118`).** Zero references, specs included. Note the sibling
`getTemplateCache`/`setTemplateCache`/`getActiveWard` in the same file are
live — delete only the two named.

**B4. `isRiskyPeer` — `tab-state.js:41`.** `summarizePeerTabs` inlines the
identical predicate at `:54` (`normalized.dirty || normalized.hasActiveCase`)
rather than calling it. Delete the export and its four assertions in
`tab-state.spec.js:34-37`. **Considered and rejected:** having
`summarizePeerTabs` call `isRiskyPeer` instead would re-run
`normalizeTabState` and `isFreshPeer` for every peer, both of which the loop
has already done — the inline form is the better code, and the export is
what is redundant. If a reviewer prefers to keep one named predicate, the
right shape is extracting a private `isRisky(normalized)` helper, not
exporting the public one; that is a reviewer's call, not a default.

**B5. Router hooks — `router.js:27`, `:35`, `:43`
(`addBeforeNavigateHook`, `addAfterNavigateHook`, `registerRoute`).**
Referenced only by `router.spec.js`. Deleting them removes that spec's three
hook/route tests; the file survives for `navigate`, `getCurrentPage` and
`setCurrentPage`, which are live. Check whether the hook-dispatch code inside
`navigate()`/`renderPage()` becomes dead once the registration functions are
gone — if so it goes in the same commit, and if not, say why in the commit
message. Update the `router.spec.js` row in `TEST-INDEX.md:73`, which
currently advertises `registerRoute`.

**B6. `linkDestinationToSourceWardParty` — `ward-county.js:197` — and the
stale comment at `ward-lifecycle.js:3-12`.** The comment states that
`legacy-app.js`'s `carryOverFields()` "calls [it] as the single entry point
for every carry-over surface." It does not; `legacy-app.js` contains no
reference to the function at all.

  **This one was investigated before being listed as safe**, because deleting
  an intended-but-unwired correctness fix would be a real defect rather than
  a cleanup. `carryOverFields()` (`legacy-app.js:3680-3717`) reimplements the
  same intent inline and reaches the same end state by a different route: it
  blanks `county`, carries `wardPartyId` on the returned field bag, runs
  `window.reconcileSlotWithParty()` against a filing-shaped probe to hydrate
  ward identity, and then sets `county` from the resolved Party via
  `window.normalizeCountyName(party.county)`. The module version instead
  calls `setPartyIdForSlot` and `hydrateCountyFromWardParty` on a destination
  that already exists. The difference is the shape of the caller, not the
  policy — Milestone 40C-A item 3's rule (county comes from the Party, never
  from an arbitrary source filing) is enforced by both. So deleting the
  module version loses no behavior.

  Delete the function, its `window.linkDestinationToSourceWardParty` bridge
  (`ward-county.js:308`), its two unit tests
  (`filing-county-defaults.spec.js:199`, `:213`) and the e2e call at
  `party-resolver.spec.ts:540`, and **rewrite** `ward-lifecycle.js:3-12`'s
  comment to point at `carryOverFields()` instead. Record the paragraph above
  in the commit message. A stale pointer that survives the thing it points at
  is how this finding arose in the first place; leaving a corrected one is
  most of this step's value.

  **Before deleting, confirm the e2e assertion at `party-resolver.spec.ts:540`
  is not the only coverage of the Party-linking rule on a carry-over.** If it
  is, port the assertion to drive `carryOverFields()` rather than dropping
  it — the rule is a Milestone 40C-A decision and must keep a test, even
  though the function under test changes.

### Verification

`npx vitest run tests/unit/tab-state.spec.js tests/unit/router.spec.js
tests/unit/filing-county-defaults.spec.js tests/unit/date-parser.spec.js
tests/unit/guardianship-options.spec.js tests/unit/window-bridge.spec.js`,
then `npx playwright test tests/e2e/party-resolver.spec.ts` for B6. A grep
for each deleted symbol returning zero hits is the gate.

### Cross-cutting ramifications (`AGENTS.md` §8)

- **Data Model:** N/A — no persisted shape changes. B6 touches code that
  *reads* the Party model but changes no field.
- **Legacy Data Migration:** N/A for B1–B5. For B6, explicitly nothing: the
  carry-over path that actually runs is untouched, so no `.sav` file's
  behavior changes on load or on carry-over.
- **Test Coverage & Index:** three specs lose tests, one e2e spec loses a
  call, `TEST-INDEX.md:73` needs its `router.spec.js` description corrected.
  B6's "port the assertion first" step is the coverage-protection gate.
- **Export/Import/Portability:** N/A.
- **Security & Sensitivity:** N/A. B6 slightly reduces `window` surface.
- **UI/UX Consistency:** N/A — nothing rendered changes.
- **Legal/Compliance:** B6 sits next to a county-determination rule with
  legal consequence (which county a filing is captioned for). This document
  asserts only that the two implementations enforce the same rule *as
  written in the code*; it makes no claim about whether that rule is legally
  correct, which is Milestone 40C-A's question, already settled there.

---

## 51C — Dead Branches, Dead Data, and Dead Locals

**Risk:** Low, with one caveat: unreachable-branch removals are only safe if
the reachability argument is right, so each carries its proof below and each
should be committed with a test that would have caught the mistake.

### Files

`src/core/validation/issue-registry.js`, `src/legacy-app.js`,
`src/features/plan-annual/index.js`, `src/features/plan-initial/index.js`,
`src/features/plan-minor/index.js`, `src/features/plan-simplified/index.js`.

### Steps

**C1. `issue-registry.js:38-46` — three unreachable regex branches.**
`getIssueDefinition()` starts with `if (definitions[code]) return
definitions[code];` (`:34`). Every code the three later regexes match is
already a literal key in `definitions`:

  - the `supplemental\.(...)` alternation lists exactly the ten
    `'supplemental.*'` keys at `:15-24`;
  - the `output\.(...)` alternation lists exactly the four `'output.*'` keys
    at `:26-29`;
  - `code === 'output.security.denied'` is the key at `:30`.

  The literal lookup therefore always wins and none of the three can execute.
  Delete them. **The `excel.capacity.*` regex immediately above them is
  genuinely reachable and must stay** — its filing-type-plus-schedule suffix
  is built at runtime (`excel-capacity.js:35`) and is not a literal key. The
  final `(guardian|simplified|...)\.` fall-through to
  `validation.legacy-unmapped` is also live and must stay.

  Guard: add an assertion to `issue-registry`'s spec that every alternative
  named in a surviving regex is *not* a literal key, so re-adding a
  literal-plus-regex pair fails a test instead of silently creating dead code
  again.

**C2. `yesNoCheckboxD()` — `legacy-app.js:5941-5942` — two unreachable
parsing branches.** The function has exactly three call sites, all in
`annual-accounting/index.js` (`:518`, `:1227`, `:1244`), and all three pass a
plain dot path as `setter` (`'amendedForm'`,
`` `trusts.${i}.createdAfterGID` ``, `'trusts.0.hasTrust'`). Therefore:

  - `setter.includes('=')` is always false, so the
    `/D(?:\[['"]...['"]\]|\.(...))\s*=/` match on `:5941` never runs;
  - no call site passes a `navigate('...')` string, so the
    `/navigate\(['"]([^'"]+)['"]\)/` match on `:5942` never runs.

  Simplify to `const path = setter || ''`, and keep the `reqOrRoute`
  string-route branch — `:1244` passes `'/p8'` and that path is live.
  `explicitRoute` becomes unused and goes with them. Add a targeted unit
  assertion covering all three real call shapes before simplifying.

**C3. `TOOLTIPS['ward_percent']` — `legacy-app.js:365`.** Every call site
passes `'ward_pct'` (six sites in `annual-accounting/index.js`), which is a
separate key at `:374` with its own, shorter wording. Delete the
`ward_percent` entry. Note the two strings differ — the dead one gives a
worked example ("if the ward owns 50% of a property, enter 50"), the live one
does not. **Before deleting, decide whether the live tooltip should inherit
the worked example**; that is a content improvement, not a cleanup, so the
default is to delete as-is and raise the wording separately if wanted.

**C4. Seven unused `const set = f => ...` closures.**
`plan-annual/index.js:250`, `:369`, `:500`; `plan-initial/index.js:335`,
`:433`; `plan-minor/index.js:224`, `:256`. Each builds an inline
`D.collection[i].field=this.value;autoSave();updateNavDots()` string and is
never invoked — the rows around them bind through `data-form-path` instead.
Confirmed by search: the only `set(` calls in those three files are
`signatureHandles.set(...)` on a `Map`. `plan-simplified/index.js` has no
such closure.

**C5. Ten destructured-but-unused `window` globals.** Verified by excluding
comment lines and the destructure block itself:

  | File | Unused |
  | --- | --- |
  | `plan-annual/index.js` | `countyInputS`, `toggleSsnReveal` |
  | `plan-initial/index.js` | `countyInputS`, `toggleSsnReveal`, `formatName`, `formatPhone` |
  | `plan-minor/index.js` | `toggleSsnReveal`, `formatName`, `formatPhone` |
  | `plan-simplified/index.js` | `countyInputS` |

  `plan-annual` (Milestone 41-3, comment at `:44`) and `plan-simplified`
  (Milestone 41-2, comment at `:40`) already had `formatName`/`formatPhone`
  removed in an earlier pass and carry a comment saying so; `plan-initial`
  and `plan-minor` never got that pass. Extend the same comment convention to
  all four files so the next reader knows the omission is deliberate rather
  than an oversight — that is what stopped `plan-annual` from being re-flagged
  and what will stop the other three.

### Verification

`npx vitest run tests/unit/issue-registry.spec.js tests/unit/validation-issue.spec.js`,
plus the four `plan-*-parity.spec.js` specs and
`tests/unit/readiness-predicate-coverage.spec.js`, which between them assert
the exact issue codes each Plan emits and would fail loudly if C1 removed a
reachable branch. For C2, `npx playwright test
tests/e2e/form-entry.contract.spec.ts` plus a manual check of Annual
Accounting's "Amended Form?" and the two Trust questions, since those are the
three real call sites. C4/C5 are compile-level: the app must still build
(`npm run dev` or a Vite build) and the Plan pages must still render.

**Red-first discipline:** C1 and C2 both delete code on a reachability
argument. Before deleting, add the guard assertions described in each step
and confirm they pass against current `master` — a guard that only passes
after the deletion proves nothing.

### Cross-cutting ramifications (`AGENTS.md` §8)

- **Data Model:** N/A.
- **Legacy Data Migration:** N/A — C2 changes how a `setter` argument is
  parsed, not how any value is stored. The tri-state contract (`AGENTS.md`
  §3) is enforced downstream in `yesNoRadioHTML`, which is untouched.
- **Test Coverage & Index:** two new guard assertions (C1, C2) added to
  existing specs; no new spec files, so no `TEST-INDEX.md` row is added,
  though C1's and C2's host-spec descriptions should be updated if the new
  assertions change what the file is *for*.
- **Export/Import/Portability:** N/A.
- **Security & Sensitivity:** N/A.
- **UI/UX Consistency:** C3 touches user-visible tooltip content. The
  decision recorded there — delete the dead key, do not silently upgrade the
  live wording — keeps this a cleanup rather than an unreviewed copy change.
- **Legal/Compliance:** C1 removes branches from the typed-issue registry,
  which governs what blocks an export. The reachability proof above is the
  safety argument, and the parity specs are the check. No issue's category,
  bypassability, or capability set changes.

---

## 51D — `excel-engine.js`: Consolidate Real Duplicates, Remove Never-Wired Capability

**Risk: Medium — the highest in this milestone.** Every step here touches
the code path that produces a filed court workbook. The consolidations are
behavior-neutral by construction, but "by construction" needs proving, not
asserting.

### What is actually true about this module

Of `excel-engine.js`'s fourteen exports, **two are used in production**:
`getExcelJS` and `saveWorkbookFile`. The rest break down as:

| Export | Status |
| --- | --- |
| `setCell` | **Duplicated three times** — identical local closure in all three feature `excel.js` files (`annual:81`, `simplified:58`, `guardian:74`) |
| `numValue` | **Duplicated** — `const nv=v=>parseFloat(v)\|\|0` (`annual:83`) |
| `percentValue` | **Duplicated** — `const pv=...` (`annual:84`), logic identical |
| `sanitizeCellValue` | Unused directly; becomes live once `setCell` is adopted (it is `setCell`'s sanitizer) |
| `fmtDate` | Unused; a **divergent** twin exists at `legacy-app.js:961` (`substring(0,10)` unconditionally vs. core's `length>=10` guard) |
| `yesNo` | Unused — and **must not be wired up**; see D4 |
| `yesNoTristate` | Unused; `guardian-inventory/excel.js:73` hand-rolls a **superset** (accepts `'Yes'`/`'No'` strings, not just booleans) |
| `readCellText` | Not a duplicate — a passthrough that delegates to `window.readCellText` (`:165`) while all three features call the legacy global directly |
| `readCellNumber`, `readCellDate` | Unused; **divergent** local counterparts (Decision 3) |
| `protectSheet`, `autoFitColumns` | Unused, **no counterpart anywhere** (Decision 2) |
| `createWorkbook`, `loadWorkbookFromBuffer` | Unused; features use `ensureTemplate` (legacy global) plus `getExcelJS` |
| `window.ExcelEngine` bridge (`:263-281`) | Assigned, never read — see 51E |

### Steps

**D1. Adopt core `setCell` in all three feature `excel.js` files.** Add it to
each file's existing `import { getExcelJS, saveWorkbookFile } from
'../../core/excel/excel-engine.js'` and delete the local closure. The two
implementations differ only in that core's adds an `if (!sheet) return null`
guard and returns the cell; no call site uses the return value, and no call
site passes a null sheet on a path that currently works. Core routes text
through `sanitizeCellValue()`, which delegates to `window.sanitizeForExcel`
when present — the same function the local closures call directly — so the
browser result is identical.

**D2. Adopt core `numValue` and `percentValue` in
`annual-accounting/excel.js`;** delete `nv` and `pv`. Logic is
character-equivalent in both cases.

**D3. Record the divergences instead of resolving them.** Add a comment
block to `excel-engine.js` covering, for each of `readCellNumber`,
`readCellDate` and `fmtDate`, what the local/legacy counterpart does
differently and why a swap is not mechanical (Decision 3). This is the step
that stops the next audit from re-raising these as trivial duplicates. Then
delete `readCellNumber` and `readCellDate` as unused, keeping the comment.

**D4. Delete `yesNo`, and say why in the commit message.** It is not merely
unused — `yesNo(bool)` returns `'No'` for `''`, `null` and `undefined`, which
is precisely what `AGENTS.md` §3 forbids: "Never default or coerce an
unanswered field to `'No'`, at any stage." Anyone "consolidating"
`guardian-inventory/excel.js:73`'s local `yesNo` onto this export would
silently convert every unanswered binary in the Initial Inventory workbook
into an affirmative `'No'` on a filed document. Deleting it removes a
name-collision trap, not just a dead function.

**D5. Decide `yesNoTristate` explicitly rather than by omission.** Core's
version handles only boolean `true`/`false`; `guardian-inventory/excel.js:73`
accepts `'Yes'`/`'No'` strings as well, which is what this app's tri-state
fields actually store (`AGENTS.md` §3). The local one is the correct
superset. **Recommendation: delete core's and leave the local one**, with a
comment on the local one noting it is the canonical tri-state Excel writer.
Promoting it to `excel-engine.js` is defensible but is a move, not a
deletion, and only one of three feature files needs it today.

**D6. Delete `protectSheet` and `autoFitColumns`** per Decision 2, with that
decision's reasoning in the commit message.

**D7. Delete `createWorkbook` and `loadWorkbookFromBuffer`,** or keep them
with a comment saying they are the intended replacement for the legacy
`ensureTemplate` path. **Recommendation: delete.** Keeping an unused
"intended replacement" with no scheduled adoption is how this module reached
its present state.

**D8. Leave `readCellText`'s passthrough in place, documented.** Unwinding it
means changing the import path in all three features and deciding whether the
legacy `legacy-app.js:1190` implementation or a core one is canonical — the
same question 51F answers for `checkExcelCapacity`, but with a larger blast
radius (every import-path cell read in the app). Out of scope here; record it
as a known follow-up so it is not rediscovered.

**D9. Rewrite `tests/unit/excel-engine.spec.js`** to cover only the surviving
exports, and update its `TEST-INDEX.md` row (`:33`), whose current
description ("setCell, fmtDate, numValue, etc.") will no longer match.

### Verification

This is the sub-delivery that warrants more than a lite run. Required:

1. `npx vitest run tests/unit/excel-engine.spec.js tests/unit/excel-capacity-issues.spec.js tests/unit/xlsx-extract.spec.js`
2. `npx playwright test` on every Excel export/import e2e spec — identify
   them from `TEST-INDEX.md`'s `xlsx-export` coverage axis (`:223`) rather
   than guessing.
3. **A byte-comparison acceptance gate.** Before D1/D2, generate an Excel
   export from each of the three filing types with a fully populated fixture
   and keep the files. After, regenerate from the same fixture and compare
   cell-by-cell. "The tests pass" is not sufficient evidence that a workbook
   destined for a court file is unchanged; a diff of the actual output is.
   This is the single most important check in the milestone.
4. Re-run an Excel **import** on each type as well — `setCell` is on the
   export path, but the same files own import, and D3's deletions sit in that
   neighbourhood.

Per `AGENTS.md`'s Test Execution Gate, recommend a full `npm test` to Alan
before committing 51D and wait for the go-ahead: it is a change to shared
core modules on a court-output path, which is exactly the "broad,
cross-cutting, touches shared/core modules" case that rule names.

### Cross-cutting ramifications (`AGENTS.md` §8)

- **Data Model:** N/A — no persisted shape changes. No CSV rows.
- **Legacy Data Migration:** N/A for export. For **import**, D3's deletions
  must not perturb the reader path that populates `D` from an uploaded
  workbook — an imported `.xlsx` is a source of case data, and a reader that
  starts returning `0` where it returned `''` would write a false zero into a
  saved filing. The verification step 4 above is the guard, and Decision 3 is
  the reason nothing is swapped there.
- **Test Coverage & Index:** `excel-engine.spec.js` substantially rewritten;
  `TEST-INDEX.md:33` updated in the same commit.
- **Export/Import/Portability:** **Directly implicated — this is the whole
  sub-delivery.** Every step touches `.xlsx` generation or reading for
  Initial Inventory, Simplified Accounting, and Annual/Final/Trust
  Accounting. PDF output is untouched.
- **Security & Sensitivity:** `sanitizeCellValue`/`sanitizeForExcel` is a
  formula-injection guard (`^[=+\-@\t\r]` prefixed with `'`). D1 moves three
  call sites from calling `window.sanitizeForExcel` directly to calling it
  through core's wrapper. **The wrapper's fallback path must be checked:**
  when `window.sanitizeForExcel` is absent, core applies its own regex — so
  the protection holds in both cases, but confirm the two regexes match
  before adopting, and add a unit assertion pinning them together if they do.
  This is the one place in 51D where a mistake has a security consequence
  rather than a formatting one.
- **UI/UX Consistency:** N/A — no UI.
- **Legal/Compliance:** the output of this path is filed with a Florida
  probate court. Decision 2 is framed to keep this milestone from changing
  what a clerk receives. The byte-comparison gate is what makes that claim
  checkable rather than asserted. This document makes no judgment about
  whether protected or auto-fitted workbooks would be acceptable to any
  clerk's office — that question is deliberately left open for a qualified
  person if the capability is ever wanted.

---

## 51E — Dead `window.*` Bridges Over Live Functions

**Risk:** Low, but the failure mode is silent — a bridge deleted while an
inline `onclick` or a `data-*` dispatcher still resolves it by name fails at
runtime, not at build time. Each deletion below was verified by searching
`src/`, `tests/` and `index.html`, not by reading the module.

### Files

`src/core/excel/excel-engine.js`, `src/core/excel/exceljs-loader.js`,
`src/features/guardian-inventory/index.js`,
`tests/unit/fixtures/window-bridge-allowlist.json`,
`src/core/types/window-bridge.d.ts`.

### Steps

**E1. Delete `window.ExcelEngine` (`excel-engine.js:263-281`).** The object
is assigned and never read; the only other references are the `.d.ts`
declaration and the allowlist entry. Note it re-exports several functions
51D deletes, so E1 and 51D must land together or E1 must land first.

**E2. Delete `window.getExcelJS` (`exceljs-loader.js:63`).** The ES export
`getExcelJS` is live — all three feature `excel.js` files import it — but no
code reads the global.

**E3. Delete 11 of Guardian Inventory's 14 bridge assignments**
(`guardian-inventory/index.js:1243-1256`), per Decision 6:
`setScheduleNoItems`, `addGuardian`, `removeGuardian`, `addRecipient`,
`removeRecipient`, `addWitness`, `removeWitness`,
`syncB2VehicleDescription`, `toggleB2Vehicle`, `removeEntry`, `pageNav`.

  All eleven functions stay — they are dispatched internally through the
  feature's own `data-form-action` / `data-inventory-change` handlers
  (`:151-195`). Two specifics worth recording because they look like
  counter-examples and are not:

  - **`removeEntry`** appears in `tests/e2e/startup.spec.ts:81` as
    `root.removeEntry(...)` — that is a file-system directory handle's
    method, not this global. Unrelated.
  - **`pageNav`** is consumed by `guardian-inventory/print.js:69`, but
    through the static ES import at `print.js:12`, never through `window`.
    The function is alive; the bridge is dead.

  **Keep** `addEntry` and `duplicateEntry` — `guardian-inventory-mount.spec.ts:168`
  and `:111` and `guardian-inventory-tri-state-radios.spec.ts:38` drive them
  through the bridge on purpose. **Keep** `validateGuardian`:
  `legacy-app.js:6675`, `:7068` and `:7589` call the global directly, and
  `:6661-6665`'s comment records a Milestone 40H-A bug caused by calling it
  before assignment — that history is a reason to leave the bridge alone, and
  to leave that comment intact.

**E4. Regenerate `window-bridge.d.ts` and the allowlist, and run
`window-bridge.spec.js`.**

### Verification

`npx vitest run tests/unit/window-bridge.spec.js`, then `npx playwright test
tests/e2e/guardian-inventory-mount.spec.ts
tests/e2e/guardian-inventory-tri-state-radios.spec.ts` — the two specs that
exercise the surviving bridges — plus a manual pass through the Initial
Inventory form adding and removing a guardian, a service recipient, a
witness, and a schedule row, and toggling the B2 vehicle checkbox. The
manual pass matters because these are exactly the handlers whose failure
would be a silent no-op on a button click rather than a test failure.

Also re-run `node scripts/audit-window-bridge.mjs` and confirm the
**shadowed-twin count stays at 0** — it has been 0 since Milestone 42E, and
this milestone must not reintroduce one.

### Cross-cutting ramifications (`AGENTS.md` §8)

- **Data Model / Legacy Data Migration / Export / Legal:** N/A.
- **Test Coverage & Index:** no spec files added or removed; the allowlist
  fixture row in `TEST-INDEX.md:98` already describes regeneration and needs
  no change.
- **Security & Sensitivity:** a net reduction of 13 names on the global
  surface. No behavior change.
- **UI/UX Consistency:** no visible change intended — which is exactly why
  the manual click-through is listed as a required check rather than a
  nicety.

---

## 51F — `checkExcelCapacity`: One Implementation

**Risk: Medium.** Unlike the rest of this milestone, this changes which code
runs in production. It is small, but it is not a deletion.

### Background

Two live implementations of one rule:

- `src/core/excel/excel-capacity.js:4` — takes `(caps, sourceData)`, emits
  `{key, label, route, cap, count}`. Reached by all three feature
  `excel.js` files via `getExcelCapacityIssues()` on the **export
  authorization** path.
- `src/legacy-app.js:6225-6243` — takes `(caps)`, reads `window.D`
  implicitly, emits `{label, route, cap, count}` (no `key`). Reached by all
  three feature `index.js` files, destructured off `window`, on the
  **print-page capacity panel** path (`annual:114`, `simplified:172`,
  `guardian:98`).

The remuneration-filtering comment is duplicated verbatim in both, which is
the tell that one was copied from the other. They agree today; nothing
enforces that they keep agreeing, and a capacity rule that disagrees between
the readiness panel and the export gate is exactly the class of defect
`AGENTS.md` §4's parity invariant exists to prevent.

### Steps

**F1. Change the three feature `index.js` files** to
`import { checkExcelCapacity } from '../../core/excel/excel-capacity.js'`
and remove `checkExcelCapacity` from each file's `window` destructure block
(`annual:58`, `simplified:53`, `guardian:21`).

**F2. Pass `window.D` explicitly** at each of the three call sites —
`checkExcelCapacity(_excelModule.X_EXCEL_CAPS, window.D)` — rather than
relying on the core version's implicit `window.D` fallback. The fallback
exists for the legacy call shape; new call sites should be explicit.

**F3. Delete `legacy-app.js:6225-6243`.** Confirm `excelCapacityPanel()`
(`:6245`) and every other consumer reads only `label`, `route`, `cap` and
`count` — the extra `key` field the core version adds is additive and
inert — and confirm `checkExcelCapacity` is not also assigned to `window`
anywhere that a fourth caller could be reaching.

**F4. Update `legacy-app.js:5811`'s comment,** which currently names
`checkExcelCapacity()` among the shared helpers living in that file.

### Verification

1. `npx vitest run tests/unit/excel-capacity-issues.spec.js` — the existing
   spec covers all three cap sets and both functions.
2. **Behavior-identity check, all three types:** build a fixture that
   overflows each capped schedule by exactly one row, and confirm the print
   page's capacity panel renders the same labels, routes, counts and caps
   before and after. Then confirm a non-overflowing fixture still renders no
   panel. The remuneration special case (`isPopulated` filtering, so blank
   rows do not consume a slot) needs its own case in both directions —
   that is the one branch where the two implementations could have silently
   diverged.
3. `npx playwright test` on the Excel capacity e2e coverage named in
   `TEST-INDEX.md`, plus the readiness contract specs, since 51F sits on the
   boundary `AGENTS.md` §4 governs.

### Cross-cutting ramifications (`AGENTS.md` §8)

- **Data Model:** N/A.
- **Legacy Data Migration:** N/A — reads existing data, writes none.
- **Test Coverage & Index:** no new spec file. If the behavior-identity check
  above is worth keeping (it is — it is the only thing that would catch a
  future re-divergence), it belongs as new cases in
  `excel-capacity-issues.spec.js`, and that file's `TEST-INDEX.md:32`
  description should be extended to say it now also pins the print-panel
  path.
- **Export/Import/Portability:** the export-authorization path is untouched
  (it already used the core version); the print-panel path changes
  implementation. Both must produce identical overflow decisions.
- **Security & Sensitivity:** N/A.
- **UI/UX Consistency:** the capacity panel's rendered output must be
  identical. Verification step 2 is the gate.
- **Legal/Compliance:** this rule decides whether a filer is warned that
  entries will be silently dropped from a workbook filed with the court —
  the failure mode `legacy-app.js:6205-6212`'s own comment describes. Any
  divergence found during F3 must be resolved deliberately and recorded, not
  smoothed over by picking whichever implementation the tests happen to
  prefer.

---

## 51G — `renderDashboardWorklist()` and Its Container

**Risk:** Low — verified to be a complete no-op, not merely a small one.

### Background

`dashboard/index.js:185-195` sets `container.hidden = true`,
`container.innerHTML = ''`, and adds `single-col` to `#dashboard-top-row`.
The template at `:589-590` already renders
`<div class="dashboard-top-row single-col" id="dashboard-top-row">` with
`<div id="dashboard-worklist-container" hidden></div>` inside it. Every one
of the three operations is therefore applied to an element that already has
that state. The function's own comment says the panel it served belonged to
the pre-Milestone-36-1 family layout.

### Steps

**G1.** Delete `renderDashboardWorklist()` and its two call sites (`:417`,
`:603`).
**G2.** Delete the now-purposeless `<div id="dashboard-worklist-container"
hidden></div>` at `:590`, keeping the `dashboard-top-row single-col` wrapper
— `.dashboard-top-row` still carries the grid and margin rules
(`dashboard.css:23-26`).
**G3.** Leave `legacy-app.js:3895`, which emits its own
`dashboard-top-row single-col` markup for a different surface, alone.
**G4.** Check whether `.dashboard-top-row`'s two-column default and its
`991.98px` breakpoint override are still meaningful once no dashboard surface
renders two columns. If not, that CSS is a further cleanup — **but raise it
rather than folding it in**, since `legacy-app.js:3895` also uses the class
and this milestone should not quietly change a second surface's layout.

### Verification

`npx playwright test tests/e2e/routes.spec.ts` (dashboard mount, and the
Milestone 47A/47B header and sidebar assertions live there), plus a visual
check of the dashboard at desktop and mobile widths in both themes.

### Cross-cutting ramifications (`AGENTS.md` §8)

- **Data Model / Migration / Export / Security / Legal:** N/A.
- **Test Coverage & Index:** no spec changes needed — confirmed that no file
  under `tests/` references `dashboard-worklist-container` at all, which is
  itself part of why this function survived so long unnoticed.
- **UI/UX Consistency:** the rendered dashboard must be pixel-identical. G4's
  deferral is deliberate: this sub-delivery removes a no-op, it does not
  redesign a grid.

---

## 51H — The Disappearing Co-Guardian Card

**Added after the original seven sub-deliveries, at Alan's direction.** Found
while writing 51E's new e2e coverage; not predicted by this document's original
scope. **Risk:** Low, and confined to one function — but it is a correctness
fix, not cleanup, so it was done red-first rather than as a behavior-neutral
swap.

### Observed

On Initial Inventory's Guardian Attestation page (`/d1`), clicking
"+ Add Co-Guardian" a second time without typing anything into the first one
made the co-guardian card **disappear**. No error, no console warning — the
button appeared to delete the card it had just created. Reproduced reliably.

### Root cause

`addGuardian()` records `pendingGuardianIndex` as the pre-push array length,
then pushes a blank guardian and re-renders. `normalizeGuardians()` then prunes
every co-guardian row with no data (keeping index 0 and the pending index), and
that prune **reindexes** `D.guardians`. The pending row survives the filter but
lands at a different position, while `visiblePendingGuardianIndex` was assigned
the *pre-prune* index verbatim. `pageD1()`'s render filter matches
`i === visiblePendingGuardianIndex`, so it matched no row at all — often an
index past the end of the shortened array.

Concretely: `[g0(data), g1(blank)]` + Add → pending 2, array `[g0, g1, g2]` →
the prune drops `g1` → `[g0, g2]` with `g2` now at index 1, while
`visiblePendingGuardianIndex` is still 2. Only Guardian #1 renders.
`D.guardians.length` is 2, so the Add button keeps rendering and the store
silently holds a row the UI never shows.

### Fix

Hold the pending row by **identity** rather than by index, and resolve its
position *after* the prune:

```js
const pendingRow = pendingGuardianIndex == null ? null : guardians[pendingGuardianIndex];
const normalized = guardians.filter(...);
const pendingAfterPrune = pendingRow ? normalized.indexOf(pendingRow) : -1;
visiblePendingGuardianIndex = pendingAfterPrune >= 0 ? pendingAfterPrune : null;
```

The pruning behavior itself is deliberately unchanged — blank co-guardian rows
still do not persist, which is the existing design, and Milestone 39-C's
`signatureImage` carve-out in `guardianHasData()` still protects a drawn
signature from being pruned before a name is typed.

### Verification

New test in `tests/e2e/guardian-inventory-collection-controls.spec.ts`, written
**red first**: it failed with "expected 1, received 0" against the unfixed code,
confirming the defect reproduces, then passed after the fix. It asserts both
that the card survives the second add *and* that `D.guardians.length` matches
the rendered card count — the silent store/UI divergence was half the defect, so
asserting only the visible card would have left it possible to "fix" the render
while still accumulating hidden blank rows.

The whole spec runs 8/8, including 51E's existing "adding accumulates rows once
each is given data, up to the maximum of three", which is what proves the prune
still works and the fix did not simply disable it. Wider: guardian-inventory
mount, tri-state radios, schedule-card-layout, startup and routes — 60 passed.
Unit suite 836/836, Vite build clean.

### Cross-cutting ramifications (`AGENTS.md` §8)

- **Data Model:** no shape change. But this defect *was* a data-integrity issue
  in effect: `D.guardians` accumulated blank rows the filer could neither see
  nor remove. The fix makes stored and rendered rows agree again, which the new
  assertion pins.
- **Legacy Data Migration:** an existing `.sav` saved while the defect was live
  may already carry a stray blank co-guardian row. Nothing is needed:
  `normalizeGuardians()` prunes exactly that row on the next render of `/d1`,
  since it has no data and is no longer pending. No migration code, and no
  filing loses a row that had content — `guardianHasData()` decides that,
  unchanged.
- **Test Coverage & Index:** one new test in an existing spec; `TEST-INDEX.md`
  row extended per §7.
- **Export/Import/Portability:** a hidden blank row would have been written to
  the workbook's guardian slots as empty cells. Fixing the divergence removes
  that; no export code changed.
- **Security & Sensitivity:** N/A.
- **UI/UX Consistency:** restores the obvious expectation that Add adds.
- **Legal/Compliance:** co-guardian identity appears on a filed court document,
  and a blank row silently retained in stored data is the kind of thing that
  can reach an export. This makes what is stored match what the filer sees. No
  judgment about statutory co-guardian requirements is made or implied.

---

## 51I — Redundant Label Association on the Terms Checkbox

**Added after the original seven sub-deliveries, at Alan's direction.**
**Risk:** Low — one attribute, on markup already guarded by an existing test.

### Observed

`tests/e2e/verified-inventory-workflow.spec.ts`'s "label associations …" test
had been failing on `master` (`duplicateLabels` expected 0, received 1)
throughout Milestone 51's execution. It shadowed several of 51's gates: every
run that touched that spec produced a failure which had to be re-checked
against a stashed-clean tree before it could be attributed. Confirmed
pre-existing, then diagnosed.

### Root cause

The Milestone 48 terms-acceptance checkbox in `index.html` both **wrapped** its
input and carried `for="pg-terms-agree"`:

```html
<label class="pg-terms-check" for="pg-terms-agree"><input type="checkbox" id="pg-terms-agree">…</label>
```

That is a redundant double association — implicit (wrapping) and explicit
(`for`) at once. The audit counts any `label[for]` that also wraps a control,
and this was the only one in the app.

### Fix, and the decision behind it

Dropped the `for` attribute and kept the wrapping association. Clicking the
label still toggles the checkbox.

**Considered and rejected: refining the guard** so it only flags a label whose
`for` points at a control *other* than one it wraps. That is arguably the more
precise rule — a label wrapping its own target is redundant rather than
ambiguous — but weakening an accessibility guard to accommodate markup is the
wrong default here, and the redundancy is worth removing on its own merits:
some screen readers announce an implicitly-and-explicitly associated pair
twice. Milestone 36-5's AO-2024-025 precedent is the shape to follow when a
guard genuinely must yield — a narrow, documented exception — and this did not
warrant one.

### Verification

`verified-inventory-workflow.spec.ts` now passes in full (8/8 together with
`terms-acceptance.spec.ts`), including the label audit that had been red.
`terms-acceptance.spec.ts`'s two tests matter most here, because that checkbox
gates startup: both pass, so the implicit association still drives the gate.
Nothing selects the label by `for` — `src/terms-acceptance.js` uses
`getElementById('pg-terms-agree')` and the e2e test uses `#pg-terms-agree`.

### Cross-cutting ramifications (`AGENTS.md` §8)

- **Data Model / Legacy Data Migration / Export / Security:** N/A.
- **Test Coverage & Index:** no new or renamed spec, so no `TEST-INDEX.md`
  change. The guard that catches this already existed — it was simply red.
- **UI/UX Consistency:** no visual change; the label behaves identically.
- **Accessibility:** removes a duplicate announcement on the one control a user
  must interact with before the app will start.
- **Legal/Compliance:** the control acknowledges the Clerk's Terms of Use. Its
  wording and the acknowledgement flow are untouched — only the redundant
  attribute is gone.

---

## Sequencing and concurrency

**This milestone is sequential.** Every sub-delivery except 51G touches
`tests/unit/fixtures/window-bridge-allowlist.json` and/or
`src/core/types/window-bridge.d.ts`. Both are generated artifacts checked by
`tests/unit/window-bridge.spec.js`, and a merge conflict in a generated file
has no obviously correct resolution — the right fix is always "regenerate
from the merged source," which means the second agent's work is blocked on
the first landing anyway. Per `AGENTS.md` §1's sub-delivery rule, verify the
actual file overlap before assuming any two of these can run in parallel; the
answer here is that they cannot.

**Suggested order, by risk ascending:**

1. **51G** — trivial, isolated, touches no governance file. Good warm-up that
   proves the verification loop works.
2. **51C** — no shared-file contention beyond the four Plan features; the
   two reachability guards are worth landing early because they are the
   pattern the rest of the milestone leans on.
3. **51A**, then **51B** — the bulk of the deletions. 51A first because it
   removes whole modules (and therefore whole allowlist entries), which makes
   51B's regeneration smaller.
4. **51E** — after 51A and 51D, since both remove bridges of their own.
5. **51D** — medium risk, court-output path, needs the byte-comparison gate
   and a full-regression recommendation to Alan.
6. **51F** — last, because it is the only sub-delivery that changes which
   implementation runs in production, and it should land against an otherwise
   quiet tree.

**Multi-agent note.** Other agents and a human collaborator push to `master`
concurrently on this repo. Before starting any sub-delivery, sync and
re-check `git log` — and after any pull, run the **full** unit suite rather
than targeted specs. The two regressions found on 2026-09-15 (a content-guard
violation and a hardcoded filing-type enumeration, both in pulled work) were
caught only because the full suite ran after a pull that looked unrelated.

## Acceptance criteria

| Scenario | Expected result |
| --- | --- |
| Search for every symbol named in 51A/51B/51C | Zero hits outside git history |
| `node scripts/audit-window-bridge.mjs` | Shadowed-twin count still **0**; assignment count down by 13 plus the bridges removed with their modules |
| `npx vitest run tests/unit/window-bridge.spec.js` | Passes — allowlist and `.d.ts` in sync with source |
| Excel export, all three accounting types, populated fixture | **Byte-identical** to the pre-51D export from the same fixture |
| Excel import, all three types | Same resulting `D` as before 51D, including blank-vs-zero for unparseable cells |
| Print-page capacity panel, each type, overflow by one row | Same labels, routes, counts, caps as before 51F |
| Print-page capacity panel, remuneration with blank rows | Blank rows still do not consume a slot (both directions) |
| Initial Inventory: add/remove guardian, recipient, witness, schedule row; toggle B2 vehicle | All still work (51E's silent-failure class) |
| Dashboard at desktop and mobile width, both themes | Pixel-identical to before 51G |
| Annual Accounting "Amended Form?" and both Trust questions | Unchanged behavior after 51C's `yesNoCheckboxD` simplification |
| `MILESTONE-51-PROPOSAL.md` | Amended in place with a dated "Landed" note per sub-delivery, per repo convention |

## Verification plan

Per sub-delivery, the targeted specs named in each **Verification** block are
the lite gate (`AGENTS.md` §1). Two sub-deliveries warrant more:

- **51D** — recommend a full `npm test` to Alan before committing, and do not
  run it without the go-ahead. The byte-comparison of generated workbooks is
  a manual gate that no spec covers and is the single most important check in
  this milestone.
- **51F** — recommend a full run as well, or at minimum the complete
  readiness and export-authorization e2e set, because it changes which
  implementation of a court-output gate executes.

For the reachability-based deletions (51C's C1 and C2) and for 51F's
behavior-identity check, follow this repository's red-first convention: add
the guard, confirm it passes on current `master`, then make the change. A
guard written after the fact proves only that the new code is
self-consistent.

## Deliberately out of scope

Named here so they are not rediscovered as omissions. **Anyone scoping a later
milestone should read this list first** — the two defects at the top were found
while executing 51 and are real, reproducible, and unfixed. They are recorded
here rather than only in the commit messages that found them, because a commit
message is not where the next person looks.

### Found during 51's execution — fixed as 51H and 51I

Both were originally parked here as out of scope. Alan asked for them to be
fixed inside Milestone 51 rather than deferred to a later one, so they are
now sub-deliveries in their own right — see "51H" and "51I" below. Milestone
52's own out-of-scope list still describes them as deferred; that entry is
now stale, and 52 does not need to carry them.

### Resolved after 51 closed (`6f0967f`, `c3c087e`)

Four entries below were parked as out of scope, then decided by Alan and handled
in follow-up commits. Kept here with their outcomes rather than deleted, because
the reasoning is the part worth finding later.

- **`fmtDate` divergent twins → audited, Group B consolidated only.** The entry
  below described "two twins". The audit found **thirteen** date-truncating
  copies in four groups, and the divergences are load-bearing. Only Group B —
  six character-identical `fd` closures returning the `'—'` display placeholder —
  was consolidated, into `summary-renderer.js`'s `formatSummaryDate()`.
  **A1 (`fmtDate`, `annual/index.js`'s `fmtD`) and A2 (the three `excel.js`
  `fD`/`fmtD` copies) were deliberately left as two implementations**: A2's
  `length >= 10` guard returns the *original* value for short input, preserving
  its type, so `fD(46023)` is the number `46023` where `fmtDate(46023)` is the
  string `"46023"` — and 46023 is an Excel serial date. `setCell()` branches on
  `typeof value === 'number'`, so merging them could flip a date cell between
  numeric and text in a filed workbook. Measured, not reasoned.
  **The `Date` hazard the audit turned up is now FIXED** (`656cccf`). All five
  Group A copies used to mangle a real `Date` —
  `String(new Date('2026-05-20T00:00:00Z')).substring(0,10)` is `"Tue May 19"`,
  wrong format *and* off by a day — and `annual-accounting/index.js`'s `fmtD`
  feeds `pdf-model.js`'s period line, every signature date, and the
  under-penalties-of-perjury attestation, so the failure mode was a wrong date
  inside a sworn statement. Each copy now normalizes via `toISOString()` before
  stringifying; the A2 copies' `length >= 10` type-preservation branch is
  untouched. It was never reachable (both import readers normalize to strings,
  and the fields come from date inputs), which is why it is recorded as
  hardening — but it was reproduced against the shipped function before the fix,
  and `tests/unit/date-truncation-helpers.spec.js` now pins the guard in all five
  including that it precedes the first `String()` call.
- **`readCellText` passthrough → left in place, blocker documented in
  `excel-engine.js`.** It cannot move alone: its body calls `unwrapCellValue()`
  *and* `fmtDate()`, both legacy globals, and `legacy-app.js` is a classic script
  that cannot `import`. So the options are a three-function cluster move (every
  import-path cell read, needing its own gate on the IMPORT direction) or
  nothing. Nothing, for now — there is exactly one implementation, so no
  duplication cost and nothing can drift.
- **`ward_pct` tooltip → worked example adopted**, per Alan.
- **Formula-injection sanitizer → widened to OWASP's complete set** (`= + - @`
  TAB CR LF) in both the production rule and the Node fallback. **Hardening, not
  a fix:** the app writes only `.xlsx`, never CSV, and never a `{formula:…}`
  cell, so ExcelJS stores every value as a typed string Excel does not evaluate;
  `sanitizeStoredText()`'s `.trim()` already strips leading tab/CR/LF. The real
  vector is secondary (a clerk re-saving as CSV, or copying cells out), which is
  why completing the set was worth it. Note **both** previous versions were
  wrong: production was `/^[=+\-@]/` and the fallback `/^[=+\-@\t\r]/`, so
  neither matched OWASP — both missed LF. Full-width variants excluded
  deliberately.
- **`TEST-INDEX.md`'s duplicate `app-shell / misc` row → removed** (`c3c087e`).

### Known, deliberately not actioned by 51

- **Combobox consolidation — now Milestone 52's 52J, not a future milestone.**
  This entry originally called for its own milestone. MS52 covers it, and scoped
  it more accurately: the ARIA attributes are **already complete** on all four
  comboboxes (Milestone 50H), and the real gap is **arrow-key navigation**, absent
  on exactly two (`initWardNameCombobox` and the convert-source dropdown). 52J
  extracts one shared handler from the ward selector's working implementation.
  Left to 52 on Alan's instruction — both would edit the same region of
  `legacy-app.js`.
- **`.dashboard-top-row`'s two-column CSS** (51G, G4) — shared with a
  `legacy-app.js` surface, so changing it would quietly affect a second
  surface.
- **The orphaned `pg-dashboard-preferences-v1` localStorage key** (51A) —
  inert, deliberately left rather than shipping a migration whose only purpose
  is to delete something already inert.
