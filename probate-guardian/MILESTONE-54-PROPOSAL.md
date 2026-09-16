# Milestone 54: Judicial Circuit Selector & Per-County Helpful Links Accordions — Scoping & Execution Proposal

## Status

**Landed 2026-09-16, approved by Alan.** Approval was given as "act on all of the remaining work" after direct review of the working-tree implementation (already fixed and fully green at that point — see `MILESTONE-53-PROPOSAL.md`'s Milestone 54 appendix for the code review that preceded it), confirmed explicitly for this milestone's code specifically before committing, per `AGENTS.md` §2. Landed as two commits rather than four sub-deliveries — 54D was never a real sub-delivery (its "test index & full suite" content is just §7's normal same-commit requirement) and 54B/54C share one commit since neither's diff is meaningfully separable from the other (the circuit engine and its UI wiring were authored and reviewed together).

| Sub-delivery | Commit | Verification |
| --- | --- | --- |
| 54A — Data model & `.sav`/appState persistence | `2acab29` | `case-file-core-fields-roundtrip.spec.ts` 4/4 (incl. new merge-import regression test, red-first); full unit 78/78 files, 852/852 tests; `routes.spec.ts` 27/27 |
| 54B/54C — Resource directory, circuit engine, dashboard UI | `6cffd15` | `dashboard-resources.spec.js` unit tests; `routes.spec.ts` 27/27; `dashboard-visual.spec.ts` 17/17 (all viewport/theme combinations) |

**What changed from the design below, recorded rather than silently applied** — see `MILESTONE-53-PROPOSAL.md`'s Milestone 54 appendix for the full account: `selectedCircuit` persists via the encrypted `appState` blob, not the CSV row + dedicated `.enc` zip entry this document originally specified (§2's "Data Model Schema" and "State & `.sav` Serialization" below are superseded by that appendix); `groupsForCounties()`/Decision D4 was kept as the selector's *default* rather than being replaced outright by a pure manual selector, via a new `deriveDefaultCircuit()`; six defects in the original working-tree implementation (a merge-import circuit clobber, keyboard focus loss, a polymorphic function signature, loose county matching, a dead conditional, and unstyled empty accordions) were found and fixed before landing.

**Numbering note.** Milestone 54 is confirmed free — checked against `src/`, `tests/`, `TEST-INDEX.md`, every `*.md`, and `git log` before writing. Milestone 53 is being written concurrently by Claude per user prompt instructions.

---

## Executive Summary & Scope

Milestone 54 expands the **Helpful Resources / Links** panel in the **All Filings Dashboard** sidebar (`src/features/dashboard/resources.js` and `src/features/dashboard/index.js`).

Specifically, this milestone delivers:
1. **Judicial Circuit Selector Control**: A `<select>` control placed at the top of the sidebar links panel allowing the user to select and set their Florida Judicial Circuit (1st through 20th Judicial Circuit).
2. **State & `.sav` Persistence**: Setting or changing the circuit updates `caseFile.selectedCircuit` and marks state dirty (`markDirtySinceExport()`). The setting persists into exported/auto-saved `.sav` case files and hydrates synchronously when opening a `.sav` file.
3. **Dynamic Accordion Filtering**: Changing the circuit setting dynamically updates the link accordions to display **one expandable links section per county included in the selected circuit** (using Florida's official 20 Judicial Circuits mapping from `src/core/pdf/circuit-lookup.js`), plus the **"Florida" statewide links section** at the bottom.
4. **Empty County Header Support**: If no links are currently defined in `RESOURCE_GROUPS` for a county in the selected circuit, the accordion header for that county is still displayed. Expanding the accordion displays an empty container (ready for county-specific links to be added in a future update).

---

## Technical Architecture & Design

```text
[ Dashboard Sidebar: Helpful Resources Panel ]
  ├── [1] Circuit Selector Control (<select id="sidebar-circuit-select">)
  │     ├── User selects circuit (1-20)
  │     ├── Updates caseFile.selectedCircuit & marks state dirty
  │     └── Triggers sidebar resources re-render
  │
  ├── [2] County Accordions (<details class="sidebar-resource-group">)
  │     ├── Derived from FL_COUNTY_CIRCUIT for selected circuit
  │     ├── 1 accordion per county in circuit (alphabetical order)
  │     └── Displays links if defined, or empty container if unpopulated
  │
  └── [3] Florida Statewide Accordion & Disclaimer
        ├── "Florida" group always rendered at the bottom
        └── Standard third-party disclaimer
```

### 1. Circuit Map & County Group Generator

Florida has 67 counties grouped across 20 Judicial Circuits (defined in `src/core/pdf/circuit-lookup.js` as `FL_COUNTY_CIRCUIT` and `CIRCUIT_ORDINALS`).

```js
// In src/features/dashboard/resources.js
export function countiesForCircuit(circuitNum) {
  const num = Number(circuitNum);
  if (!num || num < 1 || num > 20) return ['Pasco', 'Pinellas']; // Fallback to 6th Circuit
  return Object.entries(FL_COUNTY_CIRCUIT)
    .filter(([_, cNum]) => cNum === num)
    .map(([county, _]) => county)
    .sort((a, b) => a.localeCompare(b));
}
```

When building groups for a circuit via `groupsForCircuit(circuitNum)`:
- Look up all counties for `circuitNum`.
- For each county, match against existing `RESOURCE_GROUPS` (e.g., `pinellas`, `pasco`, etc.).
- If a county has no matching group in `RESOURCE_GROUPS`, construct a stub group:
  ```js
  {
    id: `county-${county.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
    heading: `${county} County`,
    scope: county,
    links: []
  }
  ```
- Append the statewide `florida` group at the bottom.

### 2. State Model & `.sav` Serialization

- **Data Model Schema**: Add `caseFile.selectedCircuit` to `probate-guardian-data-model.csv` under scope `case_file`, storage root `caseFile`, allowed values `1..20`, default `6` (Sixth Judicial Circuit: Pinellas & Pasco).
- **In-Memory State**: `_caseFile.selectedCircuit` in `src/core/state.js` defaults to `6` to ensure backward compatibility for existing case files.
- **Persistence Packaging**:
  - `src/core/persistence/case-file.js`: Update `encryptCaseFileCore()` / `buildCaseFileBlob()` to serialize `selectedCircuit: caseFile.selectedCircuit`.
  - `decryptCaseFileCore()` / `importSavArchiveOrWard()`: Unpack `selectedCircuit` and hydrate `caseFile.selectedCircuit`. If absent in an older `.sav` file, default to `6`.

---

## Sub-Delivery Plan

| Sub-delivery | Component / Surface | Description | Risk | Verification Gate |
| --- | --- | --- | --- | --- |
| **54A** | Data Model & `.sav` Persistence | Add `selectedCircuit` to `probate-guardian-data-model.csv`, `src/core/state.js`, and `src/core/persistence/case-file.js` serialization/deserialization. | Low | `npm run verify:data-model` passes; unit test for `.sav` round-trip persistence of `selectedCircuit`. |
| **54B** | Resource Directory & Circuit Engine | Update `src/features/dashboard/resources.js` with `countiesForCircuit()`, `groupsForCircuit()`, and circuit `<select>` header rendering in `resourcesPanelHTML()`. | Low | Unit tests in `tests/unit/dashboard-resources.spec.js` covering circuit filtering, empty county accordions, and Florida fallback. |
| **54C** | Dashboard UI & Event Wiring | Update `src/features/dashboard/index.js` to render circuit selector, bind `change-circuit` listener, update `caseFile.selectedCircuit`, mark dirty, and re-render. | Low | E2E specs in `tests/e2e/routes.spec.ts` verifying circuit dropdown selection and accordion updates. |
| **54D** | Test Index & Full Suite Verification | Update `TEST-INDEX.md` and run targeted unit & e2e regression tests. | Low | Full unit suite pass (`npx vitest run`) and targeted e2e suite pass (`npx playwright test`). |

---

## Detailed Sub-Delivery Specifications

### 54A: Data Model & `.sav` Persistence

#### Data Model Update (`probate-guardian-data-model.csv`)
Add the following entry to `probate-guardian-data-model.csv`:
```csv
case_file,caseFile,selectedCircuit,Selected judicial circuit,integer,,optional,,1;2;3;4;5;6;7;8;9;10;11;12;13;14;15;16;17;18;19;20,none,persisted,input,,,,,,src/core/state.js,state.js module-level _caseFile,,Milestone 54: User-selected Florida Judicial Circuit (1-20) for filtering Helpful Links accordions; defaults to 6 (Sixth Judicial Circuit)
```

#### State & Persistence Modifications
- `src/core/state.js`: Include `selectedCircuit: 6` in `_caseFile` initial state.
- `src/core/persistence/case-file.js`:
  - `encryptCaseFileCore()`: Include `selectedCircuit: caseFile.selectedCircuit || 6`.
  - `decryptCaseFileCore()` / `importSavArchiveOrWard()`: Restore `caseFile.selectedCircuit = importedCore.selectedCircuit || 6`.

---

### 54B: Resource Directory & Circuit Accordion Engine

#### Helper Functions (`src/features/dashboard/resources.js`)
- Import `FL_COUNTY_CIRCUIT` and `CIRCUIT_ORDINALS` from `../../core/pdf/circuit-lookup.js`.
- Export `groupsForCircuit(circuitNum)`:
  - Resolves all counties belonging to `circuitNum` (1 to 20).
  - Matches each county to entries in `RESOURCE_GROUPS` or creates a stub group with `links: []`.
  - Always appends the `'florida'` resource group at the end.

#### UI Markup Generator (`resourcesPanelHTML`)
- Update signature to `resourcesPanelHTML(groups = [], selectedCircuit = 6, helpers = {})`.
- Render Circuit Selector control at top of section:
  ```html
  <div class="sidebar-circuit-selector-wrap">
    <label for="sidebar-circuit-select" class="nav-section-label sidebar-circuit-label">Judicial Circuit</label>
    <select id="sidebar-circuit-select" class="form-select form-select-sm sidebar-circuit-select" data-action="change-circuit">
      <!-- Options for 1st through 20th Judicial Circuit -->
    </select>
  </div>
  ```
- Render county accordions:
  - If `group.links` is empty, render details summary header, with empty content container:
    ```html
    <details class="sidebar-resource-group">
      <summary class="nav-section-label sidebar-resource-summary">${esc(group.heading)}</summary>
      <div class="sidebar-resource-empty"></div>
    </details>
    ```

---

### 54C: Dashboard Integration & Event Binding

#### Dashboard Sidebar View (`src/features/dashboard/index.js`)
- In `renderSidebarResources()`:
  - Read `const selectedCircuit = getCaseFile()?.selectedCircuit || 6;`
  - Generate groups via `groupsForCircuit(selectedCircuit)`.
  - Pass `selectedCircuit` to `resourcesPanelHTML(groups, selectedCircuit, { esc, ic })`.
- In `bindDashboardEvents(container)`:
  - Listen for `change` events on `#sidebar-circuit-select` (or `[data-action="change-circuit"]`).
  - Update `getCaseFile().selectedCircuit = Number(event.target.value)`.
  - Call `markDirtySinceExport()`.
  - Re-render `renderSidebarResources()`.

---

### 54D: Test Suite Governance & `TEST-INDEX.md` Update

- Update `TEST-INDEX.md` with:
  - Unit test update in `tests/unit/dashboard-resources.spec.js` covering `groupsForCircuit` and circuit selector HTML generation.
  - E2E spec update in `tests/e2e/routes.spec.ts` (or `tests/e2e/dashboard-circuit-resources.spec.ts`) testing circuit selection and persistence across reload.
- Run `npm run verify:data-model` to verify data model integrity.

---

## Cross-Cutting Ramifications Analysis (AGENTS.md §8)

1. **Data Model**: Adds `caseFile.selectedCircuit` to `probate-guardian-data-model.csv`. Passes `npm run verify:data-model`.
2. **Legacy Data Migration**: Older `.sav` files missing `selectedCircuit` cleanly default to `6` (Sixth Judicial Circuit), maintaining seamless continuity for existing Pasco/Pinellas filings without data loss or exceptions.
3. **Test Coverage & Index**: Updates `TEST-INDEX.md` and modifies `tests/unit/dashboard-resources.spec.js` and `tests/e2e/routes.spec.ts`.
4. **Export/Import/Portability**: Included in `buildCaseFileBlob()` / `encryptCaseFileCore()` so `.sav` backup/restore carries the user's selected circuit.
5. **Security & Sensitivity**: `selectedCircuit` is non-sensitive operational UI state (stored in encrypted `.sav` along with other case metadata).
6. **UI/UX Consistency**: Reuses Bootstrap 5 form select styles (`form-select-sm`) and existing sidebar details accordions (`.sidebar-resource-group`).
7. **Legal/Compliance Framing**: Circuits match Florida's statutory 20 Judicial Circuits defined in `src/core/pdf/circuit-lookup.js`.

---

## Scoping & Open Questions for User Review

1. **Default Circuit Selection for New/Unset Cases**:
   - *Proposed*: Default to **6th Judicial Circuit** (Pasco & Pinellas) when `selectedCircuit` is unset, matching the existing primary jurisdiction of the app.
   - *Alternative*: Require explicit selection or default to unselected (showing all or none until chosen).
   - *Recommendation*: Approve Option A (6th Circuit default) to prevent blank sidebars on initial launch.

2. **County Accordion Header Display for Empty Counties**:
   - *Confirmed Behavior*: As specified in your prompt, counties in the selected circuit without defined links will still display their accordion header (e.g. "Escambia County"), expansion of which shows an empty container.

---

## Verification Plan

### Automated Verification
```bash
# 1. Verify data model CSV single source of truth
npm run verify:data-model

# 2. Run targeted unit specs for dashboard resources and circuit lookup
npx vitest run tests/unit/dashboard-resources.spec.js

# 3. Run targeted E2E specs for sidebar resources & routing
npx playwright test tests/e2e/routes.spec.ts
```

### Manual Verification
1. Open the dashboard view. Verify the "Judicial Circuit" selector appears at the top of the Helpful Resources sidebar panel.
2. Select "6th Judicial Circuit". Verify Pasco County, Pinellas County, and Florida accordions are displayed.
3. Select "1st Judicial Circuit". Verify Escambia, Okaloosa, Santa Rosa, Walton, and Florida accordions appear.
4. Expand an empty county accordion (e.g. Escambia). Verify header expands smoothly with no errors.
5. Change circuit to "9th Judicial Circuit", click "Save Backup (.sav)", reload or open the backup in a clean session, and verify the 9th Judicial Circuit and its counties are restored automatically.
