# Milestone 38A: Simplified Guardian Data Integrity and Excel Capacity

## Status

**Executable, independent delivery specification.** No runtime, data-model, or
test change is included in this documentation pass.

## Goal

Repair Simplified Accounting's guardian-row schema without losing legacy data,
keep guardian-party links aligned, and prevent the official three-slot Excel
template from silently omitting a populated guardian.

## Decisions

### Canonical row shape

Simplified Accounting guardians use `mailingStreet`,
`mailingCityStateZip`, `residenceStreet`, and
`residenceCityStateZip`. Annual/Final/Trust Accounting guardians continue to
use their existing `officeStreet` and `officeCityStateZip` fields.

Create a Simplified-specific guardian factory and route only Simplified's Add
Co-Guardian action through the existing collection engine. Extend
`addCollectionRow()` with the fixed per-call `factoryOverride` argument below,
while leaving maximum enforcement, array mutation, and
`syncPartyIds: 'guardianPartyIds'` inside that shared engine. Do not hand-roll
a Simplified-only push or duplicate its party-ID synchronization. Preserve the
current one-row initial state, `1..3` UI limit, autosave, and rerender behavior.

### Legacy normalization and conflicts

Normalization is scoped to Simplified Accounting and is idempotent:

1. If a canonical residence field is blank and its legacy office field is
   populated, copy the legacy value into the canonical field. Retain the legacy
   key until the normalized row has been successfully persisted.
2. If canonical and legacy values match, the redundant legacy key may be
   removed after successful persistence.
3. If both values are populated and differ, preserve both values and use
   neither normalization nor export to choose silently. Show a routed,
   export-blocking Part IV conflict notice displaying both values. The user
   must explicitly choose **Keep residence value** or **Use recovered legacy
   value**. Apply that choice to the canonical field, remove the resolved
   legacy key, persist, and clear the conflict.
4. Never create, remove, reorder, or merge guardian rows during normalization.
   Preserve all other fields and `guardianPartyIds` indexes.
5. An unresolved conflict is non-bypassable under Milestone 38D for every
   generated output. Until the user chooses the canonical value, output cannot
   faithfully select an address without making the prohibited silent choice.

This uses the already-present legacy `office*` keys as temporary compatibility
storage; it does not invent a second hidden copy or require an archive-format
version bump. The data-model CSV must document the compatibility behavior.

### Excel capacity and import

Add a guardians capacity of three to `SIMPLIFIED_EXCEL_CAPS`. Extend the shared
capacity contract to support a per-entry `isPopulated` predicate (or equivalent
count function) and use the same `guardianHasAnyData()` semantics as rendering
and export. Existing capacity entries retain their current counting behavior.

Excel import owns template slots 1–3 only. After an explicit import
confirmation, those three slots are replaced from the workbook, including
blank slots. Any pre-existing rows beyond slot 3 and their corresponding
`guardianPartyIds` are preserved unchanged. The UI must then report that the
official workbook cannot represent those overflow rows; a later Excel export
remains blocked until no more than three populated guardians remain.

## Implementation

1. Add the Simplified guardian factory and pass it through the shared
   `addCollectionRow()` override/resolver contract; keep limits, mutation, and
   party-ID synchronization in the existing engine.
2. Add load/import and pre-render/export normalization, plus the explicit
   conflict-resolution UI and routed validation issue.
3. Extend the capacity helper with populated-row semantics and add the
   three-guardian Excel cap before workbook loading or mutation.
4. Make Excel import's slot replacement and overflow preservation explicit,
   including `guardianPartyIds` lockstep.
5. Update `probate-guardian-data-model.csv`, the Milestone 35 backlog entry,
   and `TEST-INDEX.md`.

## Executable Code Map

The former readiness gate is closed by this map. These names and behaviors are
the implementation contract; do not choose a different factory API,
normalization time, conflict identity, or import-link policy while coding.

### Factory and shared collection engine

Add `createSimplifiedGuardian()` in
`src/features/simplified-accounting/guardian-compatibility.js`. It returns only
the nine canonical Simplified fields listed above, all initialized to `''`.

Change the shared signature in
`src/core/form/schedule-definitions.js` to:

```js
addCollectionRow(collectionKey, data = window.D, factoryOverride = null)
```

The function selects `factoryOverride || schema.factory`, verifies it is a
function, and pushes its result. Maximum enforcement, list initialization, and
`syncPartyIds` remain exactly where they are. Existing callers pass no third
argument and therefore retain their current factories. The only new caller is
Simplified's `add-guardian` action in
`src/features/simplified-accounting/index.js`, which passes
`createSimplifiedGuardian`. Do not change
`SCHEDULE_SCHEMAS.guardians`, `removeCollectionRow()`, or
`duplicateCollectionRow()` for this delivery.

### Compatibility helper and invocation boundaries

The same new module exports:

```js
normalizeSimplifiedGuardianCompatibility(data, { persistedSource = false } = {})
getSimplifiedGuardianAddressConflicts(data)
resolveSimplifiedGuardianAddressConflict(data, rowIndex, field, choice)
```

`normalizeSimplifiedGuardianCompatibility()` is the only mutating normalizer.
It visits existing rows without changing length/order. For each
`officeStreet`/`residenceStreet` and
`officeCityStateZip`/`residenceCityStateZip` pair it applies this fixed rule:

- canonical blank + legacy populated: copy to canonical and retain legacy;
- values already equal when the call began and `persistedSource` is true:
   delete the redundant legacy key;
- conflicting populated values: retain both and report no implicit choice;
- every other field and `guardianPartyIds` remain untouched.

The “already equal when the call began” condition prevents a legacy-only value
from being copied and deleted in one pass. A later save/reopen proves the
canonical copy was persisted; the next persisted-source pass may clean it.
The helper returns `{ changed, conflicts }` and is idempotent.

Invoke it with `persistedSource: true` immediately after a Simplified ward is
decoded/sanitized and before it becomes `window.D` in both active persistence
paths:

- `.sav` import/load in `src/core/persistence/case-file.js` and its classic
   bootstrap counterpart in `src/legacy-app.js`;
- session recovery in `src/core/persistence/recovery-cache.js` and the classic
   bootstrap counterpart in `src/legacy-app.js`.

Invoke it with `persistedSource: false` after any legacy object-to-Simplified
conversion and after Excel import. New empty data already has the correct
shape and needs no normalization. Do not mutate from validators, PDF/DOCX
model builders, the readiness renderer, or `prepareFilingOutput()`.

`getSimplifiedGuardianAddressConflicts()` is pure and is called by Part IV and
the Simplified issue producer before Preview/PDF/DOCX/Excel. Each conflict is
`simplified.guardian.address-conflict`, route `/p4`, category `data-integrity`,
`bypassable: false`, with the row index and field pair in issue detail.
Part IV displays both escaped values and exactly two controls: **Keep residence
value** and **Use recovered legacy value**.

`resolveSimplifiedGuardianAddressConflict()` accepts only field
`residenceStreet` or `residenceCityStateZip` and choice `canonical` or
`legacy`. It writes the selected value to canonical, deletes that pair's
legacy key, calls the existing party write-through for that guardian row,
calls `autoSave()`, and rerenders `/p4`. An invalid row/field/choice is a no-op
returning `false`; a successful resolution returns `true`. Explicit user
choice authorizes removal of the unselected value, so this path does not wait
for a second reopen.

`pruneBlankCards()` and `party-resolver.js` require no algorithm change: their
current kept-index and positional-link behavior remains the invariant. Add
regression assertions rather than a second synchronization path.

### Excel capacity and import algorithm

Extend each capacity entry accepted by `checkExcelCapacity(caps)` with optional
`isPopulated(row)`. Count with that callback when supplied, retain the special
remuneration behavior for existing callers, and otherwise retain raw
`list.length`. Add:

```js
guardians: {
   cap: 3,
   label: 'Part IV — Guardians',
   route: '/p4',
   isPopulated: guardianHasAnyData,
}
```

to `SIMPLIFIED_EXCEL_CAPS`. The existing print-page panel, button-disable path,
and `doSaveExcel()` backstop all consume this one result.

In `importExcel()`, parse all three workbook slots into three fresh
`createSimplifiedGuardian()` rows before mutating live state. Prompt once after
successful parse and before assignment. On confirmation:

```text
overflowRows = old guardians.slice(3)
overflowPartyIds = old guardianPartyIds.slice(3)
guardians = [slot1, slot2, slot3, ...overflowRows]
guardianPartyIds = [null, null, null, ...overflowPartyIds]
```

All three official slots are replaced, including blank slots. Their links are
cleared because workbook identities cannot prove they are the previously
linked parties. Indexes 3+ remain byte-for-byte/order-for-order unchanged. On
cancel or parse failure, neither array changes. Sanitize, normalize with
`persistedSource: false`, autosave, and rerender only after assignment.

### Files and outcomes

| Outcome | Required files/result |
| --- | --- |
| Code | New `guardian-compatibility.js`; update `schedule-definitions.js`, Simplified `index.js`, `excel.js`, Part IV validation/output integration, and the active modular/classic load and recovery boundaries named above. |
| Persistence | Update `probate-guardian-data-model.csv` for canonical Simplified row fields, temporary legacy keys, conflict behavior, and unchanged `guardianPartyIds` positional semantics; run `npm run verify:data-model`. No archive version bump. |
| Tests | Extend `schedule-definitions.spec.js`, `prune-cards.spec.js`, `party-resolver.spec.ts`, `simplified-mount.spec.ts`, `case-file-roundtrip.spec.ts`, `recovery-cache.spec.ts`, and output/Excel coverage. Add a focused compatibility unit spec only if those files cannot express the pure helper cases. |
| Catalogue | Update `TEST-INDEX.md` only for a new/renamed/repurposed test file or changed scope. Record the actual disposition in the delivery report. |
| Documentation | Update the Milestone 35 backlog entry to point to the completed 38A behavior; no user help text is required unless conflict controls need explanation beyond their labels. |

## Acceptance Criteria

| Scenario | Expected result |
| --- | --- |
| Remove and re-add a Simplified co-guardian | The new row has the canonical `residence*` shape and no Annual `office*` shape. |
| Annual/Final/Trust add-row behavior | Existing `office*` factories and limits are unchanged. |
| Legacy office-only value | It is copied to the blank canonical field without losing any row or party-link data. |
| Matching legacy and canonical values | The canonical value remains and redundant compatibility data is safely removed after persistence. |
| Conflicting values | Both remain intact until the user chooses one; all generated output is non-bypassably blocked and routed to the visible Part IV resolution control. |
| Repeated normalization | No duplicate rows, repeated prompts after resolution, reorder, or party-link drift occurs. |
| One to three populated guardians | PDF, Word, and Excel preserve every populated guardian. |
| Four or more populated legacy guardians | PDF and Word retain them; Excel is blocked before workbook mutation with a three-slot explanation. |
| Blank compatibility padding | It does not cause a false Excel-capacity failure. |
| Excel import into a filing with overflow rows | Slots 1–3 follow the confirmed workbook import; rows 4+ and matching party IDs remain unchanged and visible. |

## Verification

Add focused unit tests for factory shape, normalization, explicit conflict
resolution, idempotence, populated-row counting, and party-ID synchronization.
Add Simplified Accounting E2E coverage for add/remove, save/reopen, conflict
routing, one-to-three guardian Excel output, blocked four-guardian output, and
three-slot import with preserved overflow. Run `npm run verify:data-model` and
the smallest unit/E2E set selected through `TEST-INDEX.md`.
