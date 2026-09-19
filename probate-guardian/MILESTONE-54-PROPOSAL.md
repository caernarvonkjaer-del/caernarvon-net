# Milestone 54: Judicial Circuit Selector & Per-County Helpful Links Accordions — Scoping & Execution Proposal

## Status

**Landed 2026-09-16, approved by Alan.** Approval was given as "act on all of the remaining work" after direct review of the working-tree implementation (already fixed and fully green at that point — see this document's own "Appendix: change record" below for the code review that preceded it), confirmed explicitly for this milestone's code specifically before committing, per `AGENTS.md` §3. Landed as two commits rather than four sub-deliveries — 54D was never a real sub-delivery (its "test index & full suite" content is just §7's normal same-commit requirement) and 54B/54C share one commit since neither's diff is meaningfully separable from the other (the circuit engine and its UI wiring were authored and reviewed together).

**Moved here 2026-09-16** from `MILESTONE-53-PROPOSAL.md`, which had carried this milestone's change record as an appendix (recorded there originally only because Alan asked for it there specifically, while Milestone 53 was mid-draft on the same tree). A review of Milestone 53 flagged that arrangement as a scope-boundary hazard — a reader approving 53's sub-deliveries could mistake this unrelated content for part of 53's own approval surface — so it now lives in its proper home. Nothing about the content changed in the move; cross-references in `resources.js`, `content-corrections.spec.js`, and `dashboard-resources.spec.js` were updated to point here.

| Sub-delivery | Commit | Verification |
| --- | --- | --- |
| 54A — Data model & `.sav`/appState persistence | `2acab29` | `case-file-core-fields-roundtrip.spec.ts` 4/4 (incl. new merge-import regression test, red-first); full unit 78/78 files, 852/852 tests; `routes.spec.ts` 27/27 |
| 54B/54C — Resource directory, circuit engine, dashboard UI | `6cffd15` | `dashboard-resources.spec.js` unit tests; `routes.spec.ts` 27/27; `dashboard-visual.spec.ts` 17/17 (all viewport/theme combinations) |

**What changed from the design below, recorded rather than silently applied** — see this document's own "Appendix: change record" below for the full account: `selectedCircuit` persists via the encrypted `appState` blob, not the CSV row + dedicated `.enc` zip entry this document originally specified (§2's "Data Model Schema" and "State & `.sav` Serialization" below are superseded by that appendix); `groupsForCounties()`/Decision D4 was kept as the selector's *default* rather than being replaced outright by a pure manual selector, via a new `deriveDefaultCircuit()`; six defects in the original working-tree implementation (a merge-import circuit clobber, keyboard focus loss, a polymorphic function signature, loose county matching, a dead conditional, and unstyled empty accordions) were found and fixed before landing.

**Final-link reconciliation (2026-09-16):** The appendix now mirrors the links that actually shipped in `src/features/dashboard/resources.js`: 88 populated groups and 317 links covering all 67 counties, all 20 judicial circuits, and Florida statewide resources. Proposal-only candidates not present in the runtime catalog were removed. The runtime module remains the source of truth.

**Numbering note.** Milestone 54 is confirmed free — checked against `src/`, `tests/`, `TEST-INDEX.md`, every `*.md`, and `git log` before writing. Milestone 53 is being written concurrently by Claude per user prompt instructions.

---

## Executive Summary & Scope

Milestone 54 expands the **Helpful Resources / Links** panel in the **All Filings Dashboard** sidebar (`src/features/dashboard/resources.js` and `src/features/dashboard/index.js`).

Specifically, this milestone delivers:
1. **Judicial Circuit Selector Control**: A `<select>` control placed at the top of the sidebar links panel allowing the user to select and set their Florida Judicial Circuit (1st through 20th Judicial Circuit).
2. **State & `.sav` Persistence**: Setting or changing the circuit updates `caseFile.selectedCircuit` and marks state dirty (`markDirtySinceExport()`). The setting persists into exported/auto-saved `.sav` case files and hydrates synchronously when opening a `.sav` file.
3. **Dynamic Accordion Filtering**: Changing the circuit setting dynamically updates the link accordions to display **one expandable links section per county included in the selected circuit** (using Florida's official 20 Judicial Circuits mapping from `src/core/pdf/circuit-lookup.js`), plus the **"Florida" statewide links section** at the bottom.
4. **Complete County Coverage**: Every Florida county has a populated resource group. No empty county placeholders remain in the shipped catalog.

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
  │     └── Displays the final shipped links for every county
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
- A defensive fallback can construct a stub if a future county mapping has no matching group:
  ```js
  {
    id: `county-${county.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
    heading: `${county} County`,
    scope: county,
    links: []
  }
  ```
- No current Florida county uses that fallback; all 67 resolve to populated groups.
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
| **54B** | Resource Directory & Circuit Engine | Update `src/features/dashboard/resources.js` with `countiesForCircuit()`, `groupsForCircuit()`, and circuit `<select>` header rendering in `resourcesPanelHTML()`. | Low | Unit tests in `tests/unit/dashboard-resources.spec.js` covering circuit filtering, populated county groups, and Florida fallback. |
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
  - Matches each county to its populated entry in `RESOURCE_GROUPS`; an empty stub remains only as a defensive fallback for future mapping drift.
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
- Render populated county accordions for every county in the selected circuit. The renderer tolerates an empty list defensively, but the final catalog contains no placeholder or "Coming soon" destinations.

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

2. **County Coverage**:
   - *Final Behavior*: Every county has a populated final group. No empty county headers or invented placeholder destinations ship.

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
4. Expand Escambia County and verify its final Property Appraiser, Clerk, court-records, and Tax Collector links render.
5. Change circuit to "9th Judicial Circuit", click "Save Backup (.sav)", reload or open the backup in a clean session, and verify the 9th Judicial Circuit and its counties are restored automatically.

---

## Final Shipped Link Catalog

This catalog is generated from the final `RESOURCE_GROUPS` entries in `src/features/dashboard/resources.js`. It records only destinations present in the shipped project; superseded research candidates and proposed placeholders are intentionally omitted.

**Inventory:** 88 populated groups, 317 links, 20 judicial circuits, 67 counties, and 1 statewide group.

### Judicial Circuits

- **Eighteenth Judicial Circuit** — [Probate & guardianship information](https://flcourts18.org/); [Probate & guardianship administrative orders](https://flcourts18.org/administrative-orders/)
- **Eighth Judicial Circuit** — [Probate & guardianship information](https://circuit8.org/general-magistrates-hearing-officers/probate-judicial-practices-and-procedures/); [Probate & guardianship administrative orders](https://circuit8.org/)
- **Eleventh Judicial Circuit** — [Probate & guardianship information](https://www.jud11.flcourts.org/Guardianship)
- **Fifteenth Judicial Circuit** — [Probate & guardianship information](https://www.15thcircuit.com/); [Probate & guardianship administrative orders](https://www.15thcircuit.com/ao-search)
- **Fifth Judicial Circuit** — [Probate & guardianship information](https://www.circuit5.org/); [Probate & guardianship administrative orders](https://www.circuit5.org/administrative-orders/)
- **First Judicial Circuit** — [Probate & guardianship information](https://www.firstjudicialcircuit.org/)
- **Fourteenth Judicial Circuit** — [Probate & guardianship information](https://jud14.flcourts.org/)
- **Fourth Judicial Circuit** — [Probate & guardianship information](https://www.jud4.org/self-help/guardianship); [Probate & guardianship administrative orders](https://www.jud4.org/administrative-orders)
- **Nineteenth Judicial Circuit** — [Probate & guardianship information](https://www.circuit19.org/probate-guardianship-division/); [Probate & guardianship administrative orders](https://www.circuit19.org/administrative-orders/)
- **Ninth Judicial Circuit** — [Probate & guardianship information](https://ninthcircuit.org/divisions/probate-court); [Probate & guardianship administrative orders](https://ninthcircuit.org/administrative-orders-categories/probate-guardians)
- **Second Judicial Circuit** — [Probate & guardianship information](https://2ndcircuit.leoncountyfl.gov/); [Probate & guardianship administrative orders](https://2ndcircuit.leoncountyfl.gov/adminOrders.php)
- **Seventeenth Judicial Circuit** — [Probate & guardianship information](https://www.17th.flcourts.org/probate-and-guardianship/); [Probate & guardianship administrative orders](https://www.17th.flcourts.org/probate-administrative-orders-2/)
- **Seventh Judicial Circuit** — [Probate & guardianship information](https://circuit7.org/); [Probate & guardianship administrative orders](https://circuit7.org/orders_categories/probate-guardianship/)
- **Sixteenth Judicial Circuit** — [Probate & guardianship information](https://keyscourts.net/); [Probate & guardianship administrative orders](https://keyscourts.net/administrative-orders/)
- **Sixth Judicial Circuit** — [Guardianship information](https://www.jud6.org/guardianship-information/); [Probate & guardianship administrative orders](https://www.jud6.org/LegalCommunity/LegalPractice/AOSAndRules/aos/SubjectAO/Proguard/proguard.html)
- **Tenth Judicial Circuit** — [Probate & guardianship information](https://jud10.flcourts.org/sites/default/files/adminOrders/AO_4-3.2.pdf); [Probate & guardianship administrative orders](https://www.jud10.flcourts.org/administrative-orders/admin-4)
- **Third Judicial Circuit** — [Probate & guardianship information](https://thirdcircuitfl.org/general-magistrate/); [Probate & guardianship administrative orders](https://thirdcircuitfl.org/orders_categories/probate-guardianship/)
- **Thirteenth Judicial Circuit** — [Probate & guardianship information](https://www.fljud13.org/); [Probate & guardianship administrative orders](https://www.fljud13.org/Resources/Administrative-Orders)
- **Twelfth Judicial Circuit** — [Probate & guardianship information](https://www.jud12.flcourts.org/About-the-Court/Judges-Magistrates/Judge-Charles-E-Williams); [Probate & guardianship administrative orders](https://www.jud12.flcourts.org/Documents/Administrative-Orders)
- **Twentieth Judicial Circuit** — [Probate & guardianship information](https://www.ca.cjis20.org/); [Probate & guardianship administrative orders](https://www.ca.cjis20.org/Documents/admin-orders.aspx)

### Counties

- **Alachua County** — [Property Appraiser](https://www.acpafl.org/); [Clerk — Probate & Guardianship](https://alachuacounty.us/Depts/Clerk/Pages/Guardianship.aspx); [Clerk of Court Records](https://www.alachuaclerk.org/court_records/); [Tax Collector](https://www.alachuacollector.com/)
- **Baker County** — [Property Appraiser](https://www.bakerpa.com/); [Clerk — Probate & Guardianship](https://bakerclerk.com/); [Clerk of Court Records](https://www.civitekflorida.com/ocrs/county/02/); [Tax Collector](https://www.mybakertc.com/)
- **Bay County** — [Property Appraiser](https://baypa.net/); [Clerk — Probate & Guardianship](https://www.baycoclerk.com/court-divisions/probate/); [Clerk of Court Records](https://court.baycoclerk.com/); [Tax Collector](https://www.baytaxcollector.com/)
- **Bradford County** — [Property Appraiser](https://www.bradfordappraiser.com/); [Clerk — Probate & Guardianship](https://bradfordclerk.com/); [Clerk of Court Records](https://www.civitekflorida.com/ocrs/county/04/); [Tax Collector](https://www.bradfordtaxcollector.com/)
- **Brevard County** — [Property Appraiser](https://www.bcpao.us/); [Clerk — Probate & Guardianship](https://www.brevardclerk.us/guardianship-handbook-and-forms); [Clerk of Court Records](https://public.brevardclerk.com/BMWebLatest/Home.aspx/Search); [Tax Collector](https://www.brevardtaxcollector.com/)
- **Broward County** — [Property Appraiser](https://bcpa.net/); [Clerk — Probate & Guardianship](https://www.browardclerk.org/Divisions/ProbateAndGuardianship); [Clerk of Court Records](https://www.browardclerk.org/Web2); [Tax Collector](https://browardtax.org/)
- **Calhoun County** — [Property Appraiser](https://calhounpa.net/); [Clerk — Probate & Guardianship](https://www.calhounclerk.com/); [Clerk of Court Records](https://www.civitekflorida.com/ocrs/county/07/); [Tax Collector](https://www.calhountc.com/)
- **Charlotte County** — [Property Appraiser](https://www.ccappraiser.com/); [Clerk — Probate & Guardianship](https://charlotteclerk.com/courts/probate); [Clerk of Court Records](https://courts.charlotteclerk.com/Benchmark/Home.aspx/Search); [Tax Collector](https://taxcollector.charlottecountyfl.gov/)
- **Citrus County** — [Property Appraiser](https://www.citruspa.org/); [Clerk — Probate & Guardianship](https://www.citrusclerk.org/226/Guardianship); [Clerk of Court Records](https://scorss.citrusclerk.org/); [Tax Collector](https://www.citrustc.us/)
- **Clay County** — [Property Appraiser](https://ccpao.com/); [Clerk — Probate & Guardianship](https://clayclerk.com/departments/civil-court-services/guardianship/); [Clerk of Court Records](https://inquiry.clayclerk.com/); [Tax Collector](https://www.claycountytax.com/)
- **Collier County** — [Property Appraiser](https://www.collierappraiser.com/); [Clerk — Probate & Guardianship](https://www.collierclerk.com/court-divisions/court-guardianship/); [Clerk of Court Records](https://cms.collierclerk.com/cmsweb#!/); [Tax Collector](https://www.colliertax.com/)
- **Columbia County** — [Property Appraiser](https://columbia.floridapa.com/); [Clerk — Probate & Guardianship](https://columbiaclerk.com/court-services/probate/); [Clerk of Court Records](https://www.civitekflorida.com/ocrs/county/12/); [Tax Collector](https://www.columbiataxcollector.com/)
- **DeSoto County** — [Property Appraiser](https://www.desotopa.com/); [Clerk — Probate & Guardianship](https://www.desotoclerk.com/court-services/probate-guardianship/); [Clerk of Court Records](https://www.civitekflorida.com/ocrs/county/14/); [Tax Collector](https://www.desototaxcollector.com/)
- **Dixie County** — [Property Appraiser](https://www.qpublic.net/fl/dixie/); [Clerk — Probate & Guardianship](https://dixieclerk.com/departments-services/court-services/); [Clerk of Court Records](https://www.civitekflorida.com/ocrs/county/15/); [Tax Collector](https://dixiecountytaxcollector.com/)
- **Duval County** — [Property Appraiser](https://www.coj.net/departments/property-appraiser.aspx); [Clerk — Probate & Guardianship](https://www.duvalclerk.com/departments/civil-court-services/probate); [Clerk of Court Records](https://core.duvalclerk.com/); [Tax Collector](https://taxcollector.jacksonville.gov/)
- **Escambia County** — [Property Appraiser](https://www.escpa.org/); [Clerk — Probate & Guardianship](https://www.escambiaclerk.com/323/Probate-Guardianship-Mental-Health); [Clerk of Court Records](https://public.escambiaclerk.com/BMWebLatest/Home.aspx/Search); [Tax Collector](https://www.escambiataxcollector.com/)
- **Flagler County** — [Property Appraiser](https://flaglerpa.com/); [Clerk — Probate & Guardianship](https://flaglerclerk.gov/courts/guardianship/); [Clerk of Court Records](https://records.flaglerclerk.gov/); [Tax Collector](https://www.flaglertax.com/)
- **Franklin County** — [Property Appraiser](https://franklincountypa.net/); [Clerk — Probate & Guardianship](https://www.franklinclerk.com/courts/probate-guardianship/); [Clerk of Court Records](https://www.civitekflorida.com/ocrs/county/19/); [Tax Collector](https://www.franklintaxcollector.com/)
- **Gadsden County** — [Property Appraiser](https://gadsdenpa.com/); [Clerk — Probate & Guardianship](https://www.gadsdenclerk.com/); [Clerk of Court Records](https://www.gadsdenclerk.com/CourtScribePublicInquiry/); [Tax Collector](https://www.gadsdentaxcollector.com/)
- **Gilchrist County** — [Property Appraiser](https://www.qpublic.net/fl/gilchrist/); [Clerk — Probate & Guardianship](https://gilchristclerk.com/probate/); [Clerk of Court Records](https://www.civitekflorida.com/ocrs/county/21/); [Tax Collector](https://fl-gilchrist-taxcollector.publicaccessnow.com/)
- **Glades County** — [Property Appraiser](https://qpublic.net/fl/glades/); [Clerk — Probate & Guardianship](https://gladesclerk.com/court-services/probate/); [Clerk of Court Records](https://www.civitekflorida.com/ocrs/county/22/); [Tax Collector](https://www.gladestc.com/)
- **Gulf County** — [Property Appraiser](https://gulfpa.com/); [Clerk — Probate & Guardianship](https://www.gulfclerk.com/courts/probate/guardianship/); [Clerk of Court Records](https://www.civitekflorida.com/ocrs/county/23/); [Tax Collector](https://www.gulftaxcollector.com/)
- **Hamilton County** — [Property Appraiser](https://hamiltonpa.com/); [Clerk — Probate & Guardianship](https://hamiltonclerk.com/courts/); [Clerk of Court Records](https://www.civitekflorida.com/ocrs/county/24/); [Tax Collector](https://www.hamiltontaxcollector.com/)
- **Hardee County** — [Property Appraiser](https://hardeepa.com/); [Clerk — Probate & Guardianship](https://www.hardeeclerk.com/departments/courts/probate-division/); [Clerk of Court Records](https://www.civitekflorida.com/ocrs/county/25/); [Tax Collector](https://www.hardeetaxcollector.com/)
- **Hendry County** — [Property Appraiser](https://hendryprop.com/); [Clerk — Probate & Guardianship](https://www.hendryclerk.org/courts/); [Clerk of Court Records](https://www.civitekflorida.com/ocrs/county/26/); [Tax Collector](https://www.hendrycountytc.com/)
- **Hernando County** — [Property Appraiser](https://www.hernandopa-fl.us/PAWEBSITE/Default.aspx); [Clerk — Probate & Guardianship](https://hernandoclerk.com/court-services/probate-guardianship/); [Clerk of Court Records](https://www.civitekflorida.com/ocrs/county/27/); [Tax Collector](https://www.hernandocounty.us/tc)
- **Highlands County** — [Property Appraiser](https://www.hcpao.org/); [Clerk — Probate & Guardianship](https://www.hcclerk.org/); [Clerk of Court Records](https://www.civitekflorida.com/ocrs/county/28/); [Tax Collector](https://www.hctaxcollector.com/)
- **Hillsborough County** — [Property Appraiser](https://www.hcpafl.org/); [Clerk — Probate & Guardianship](https://www.hillsclerk.com/court-services/probate-guardianship-and-trust); [Clerk of Court Records](https://hover.hillsclerk.com/html/home.html); [Tax Collector](https://www.hillstax.org/)
- **Holmes County** — [Property Appraiser](https://www.qpublic.net/fl/holmes/); [Clerk — Probate & Guardianship](https://www.holmesclerk.com/); [Clerk of Court Records](https://www.civitekflorida.com/ocrs/county/30/); [Tax Collector](https://www.holmestax.com/)
- **Indian River County** — [Property Appraiser](https://www.ircpa.org/); [Clerk — Probate & Guardianship](https://indianriverclerk.com/court-services/probate-and-guardianship/); [Clerk of Court Records](https://indianriverclerk.com/court-records/online-case-view/); [Tax Collector](https://www.irctax.com/)
- **Jackson County** — [Property Appraiser](https://www.qpublic.net/fl/jackson/); [Clerk — Probate & Guardianship](https://www.jacksonclerk.com/court-services/probate/); [Clerk of Court Records](https://www.civitekflorida.com/ocrs/county/32/); [Tax Collector](https://www.jacksontc.com/)
- **Jefferson County** — [Property Appraiser](https://jeffersonpa.net/); [Clerk — Probate & Guardianship](https://www.jeffersonclerk.com/); [Clerk of Court Records](https://www.civitekflorida.com/ocrs/county/33/); [Tax Collector](https://jeffersontc.com/)
- **Lafayette County** — [Property Appraiser](https://www.lafayettepa.com/); [Clerk — Probate & Guardianship](https://www.lafayetteclerk.com/); [Clerk of Court Records](https://www.civitekflorida.com/ocrs/county/34/); [Tax Collector](https://www.lafayettetc.com/)
- **Lake County** — [Property Appraiser](https://www.lakecopropappr.com/); [Clerk — Probate & Guardianship](https://www.lakecountyclerkfl.gov/?s=guardianship); [Clerk of Court Records](https://www.lakecountyclerkfl.gov/departments/courts-management/court-data-records-division/search-online-court-records/); [Tax Collector](https://www.laketax.com/)
- **Lee County** — [Property Appraiser](https://www.leepa.org/); [Clerk — Probate & Guardianship](https://www.leeclerk.org/departments/courts/guardianship); [Clerk of Court Records](https://matrix.leeclerk.org/); [Tax Collector](https://www.leetc.com/)
- **Leon County** — [Property Appraiser](https://www.leonpa.gov/); [Clerk — Probate & Guardianship](https://leonclerk.com/divisions/guardianship/); [Clerk of Court Records](https://cvweb.leonclerk.com/public/online_services/search_courts_hc/search_by_name_hc.asp); [Tax Collector](https://www.leontaxcollector.net/)
- **Levy County** — [Property Appraiser](https://www.qpublic.net/fl/levy/); [Clerk — Probate & Guardianship](https://www.levyclerk.com/); [Clerk of Court Records](https://www.civitekflorida.com/ocrs/county/38/); [Tax Collector](https://levytaxcollector.com/)
- **Liberty County** — [Property Appraiser](https://libertypa.org/); [Clerk — Probate & Guardianship](https://libertyclerk.com/courts/); [Clerk of Court Records](https://www.civitekflorida.com/ocrs/county/39/); [Tax Collector](https://www.libertytaxcollector.com/)
- **Madison County** — [Property Appraiser](https://madisonpa.com/); [Clerk — Probate & Guardianship](https://www.madisonclerk.com/); [Clerk of Court Records](https://www.civitekflorida.com/ocrs/county/40/); [Tax Collector](https://www.madisontc.com/)
- **Manatee County** — [Property Appraiser](https://www.manateepao.gov/); [Clerk — Probate & Guardianship](https://www.manateeclerk.com/departments/probate-and-guardianship/); [Clerk of Court Records](https://records.manateeclerk.com/CourtRecords/Search); [Tax Collector](https://www.taxcollector.com/)
- **Marion County** — [Property Appraiser](https://www.pa.marion.fl.us/); [Clerk — Probate & Guardianship](https://www.marioncountyclerk.org/departments/civil-courts/guardianship/); [Clerk of Court Records](https://www.civitekflorida.com/ocrs/county/42/); [Tax Collector](https://www.mariontax.com/)
- **Martin County** — [Property Appraiser](https://www.pa.martin.fl.us/); [Clerk — Probate & Guardianship](https://www.martinclerk.com/199/Probate-Guardianship); [Clerk of Court Records](https://www.civitekflorida.com/ocrs/county/43/); [Tax Collector](https://taxcol.martin.fl.us/)
- **Miami-Dade County** — [Property Appraiser](https://www.miamidade.gov/pa/); [Clerk — Probate & Guardianship](https://www.miamidadeclerk.gov/clerk/mental-health-court.page); [Clerk of Court Records — Civil, Family & Probate](https://www2.miamidadeclerk.gov/ocs/); [Clerk of Court Records — Criminal](https://www2.miamidadeclerk.gov/cjis/); [Tax Collector](https://www.miamidade.gov/global/taxcollector/home.page)
- **Monroe County** — [Property Appraiser](https://mcpafl.org/); [Clerk — Probate & Guardianship](https://www.monroe-clerk.com/probate-and-guardianship); [Clerk of Court Records](https://www.monroe-clerk.com/disclaimer/court-records-link); [Tax Collector](https://www.monroetaxcollector.com/)
- **Nassau County** — [Property Appraiser](https://www.nassauflpa.com/); [Clerk — Probate & Guardianship](https://www.nassauclerk.com/230/2257/Guardianship); [Clerk of Court Records](https://www.civitekflorida.com/ocrs/county/45/); [Tax Collector](https://nassautaxes.com/)
- **Okaloosa County** — [Property Appraiser](https://okaloosapa.com/); [Clerk — Probate & Guardianship](https://okaloosaclerk.com/customer-service/guardianship-mental-health/); [Clerk of Court Records](https://clerkapps.okaloosaclerk.com/ClerkQuest/); [Tax Collector](https://www.okaloosatax.com/)
- **Okeechobee County** — [Property Appraiser](https://www.okeechobeepa.com/); [Clerk — Probate & Guardianship](https://myokeeclerk.com/index.asp?SEC=37D8D7F9-A3A9-43E2-A74B-B6B2AE3B6323); [Clerk of Court Records](https://www.civitekflorida.com/ocrs/county/47/); [Tax Collector](https://www.okeechobeetc.com/)
- **Orange County** — [Property Appraiser](https://ocpaweb.ocpafl.org/); [Clerk — Probate & Guardianship](https://www.myorangeclerk.com/Divisions/Probate/Guardianship-FAQs); [Clerk of Court Records](https://myeclerk.myorangeclerk.com/); [Tax Collector](https://www.octaxcol.com/)
- **Osceola County** — [Property Appraiser](https://www.property-appraiser.org/); [Clerk — Probate & Guardianship](https://osceolaclerk.com/guardianship/); [Clerk of Court Records](https://courts.osceolaclerk.com/BenchmarkWeb/Home.aspx/Search); [Tax Collector](https://www.osceolataxcollector.org/)
- **Palm Beach County** — [Property Appraiser](https://pbcpao.gov/index.htm); [Clerk — Probate & Guardianship](https://www.mypalmbeachclerk.com/departments/courts/guardianship); [Clerk of Court Records](https://appsgp.mypalmbeachclerk.com/ecaseview); [Tax Collector](https://www.pbctax.gov/)
- **Pasco County** — [Property Appraiser](https://pascopa.com/); [Clerk — Guardianships](https://www.pascoclerk.com/272/Guardianships); [Search Clerk of Court Records](https://www.civitekflorida.com/ocrs/county/51/); [Tax Collector](https://www.pascotaxes.com/)
- **Pinellas County** — [Property Appraiser](https://www.pcpao.gov/); [Clerk — Guardianships](https://www.mypinellasclerk.gov/Guardianship); [Clerk of Court Records](https://courtrecords.mypinellasclerk.gov/MyCr/Cases/Search); [Guardian Association of Pinellas County](https://guardianassociation.org/); [Tax Collector](https://pinellastaxcollector.gov/)
- **Polk County** — [Property Appraiser](https://www.polkpa.org/); [Clerk — Probate & Guardianship](https://www.polkclerkfl.gov/170/Guardianships); [Clerk of Court Records](https://pro.polkcountyclerk.net/PRO); [Tax Collector](https://www.polktaxes.com/)
- **Putnam County** — [Property Appraiser](https://pa.putnam-fl.com/); [Clerk — Probate & Guardianship](https://putnamclerk.com/); [Clerk of Court Records](https://www.civitekflorida.com/ocrs/county/54/); [Tax Collector](https://www.putnamcountytaxcollector.com/)
- **Santa Rosa County** — [Property Appraiser](https://srcpa.gov/); [Clerk — Probate & Guardianship](https://santarosaclerk.com/links/online-forms/probate/); [Clerk of Court Records](https://www.civitekflorida.com/ocrs/county/57/); [Tax Collector](https://www.srctc.com/)
- **Sarasota County** — [Property Appraiser](https://www.sc-pa.com/); [Clerk — Probate & Guardianship](https://www.sarasotaclerk.com/Courts/Wills-Probate-and-Guardianship/Guardianship); [Clerk of Court Records](https://secure.sarasotaclerk.com/AnonLanding.aspx); [Tax Collector](https://www.sarasotataxcollector.gov/)
- **Seminole County** — [Property Appraiser](https://www.scpafl.org/); [Clerk — Probate & Guardianship](https://www.seminoleclerkfl.gov/guardianship/); [Clerk of Court Records — Civil, Family & Probate](https://courtrecords.seminoleclerk.org/civil/); [Clerk of Court Records — Criminal](https://courtrecords.seminoleclerk.org/criminal/default.aspx); [Tax Collector](https://seminolecounty.tax/)
- **St. Johns County** — [Property Appraiser](https://www.sjcpa.gov/); [Clerk — Probate & Guardianship](https://stjohnsclerk.com/courts/guardianships/); [Clerk of Court Records](https://apps.stjohnsclerk.com/Benchmark/Home.aspx/Search); [Tax Collector](https://www.sjctax.us/)
- **St. Lucie County** — [Property Appraiser](https://www.paslc.gov/); [Clerk — Probate & Guardianship](https://stlucieclerk.gov/departments-top-menu/guardianship); [Clerk of Court Records](https://courtcasesearch.stlucieclerk.gov/BenchmarkWebExternal/Home.aspx/Search); [Tax Collector](https://www.tcslc.com/)
- **Sumter County** — [Property Appraiser](https://www.sumterpa.com/); [Clerk — Probate & Guardianship](https://www.sumterclerk.com/courts/civil/probate/); [Clerk of Court Records](https://www.civitekflorida.com/ocrs/county/60/); [Tax Collector](https://www.sumtertaxcollector.com/)
- **Suwannee County** — [Property Appraiser](https://suwanneepa.com/); [Clerk — Probate & Guardianship](https://www.suwgov.org/); [Clerk of Court Records](https://www.civitekflorida.com/ocrs/county/61/); [Tax Collector](https://fl-suwannee-taxcollector.manatron.com/)
- **Taylor County** — [Property Appraiser](https://qpublic.net/fl/taylor/); [Clerk — Probate & Guardianship](https://www.taylorclerk.com/); [Clerk of Court Records](https://pubrecords.taylorclerk.com/); [Tax Collector](https://www.taylorcountytaxcollector.com/)
- **Union County** — [Property Appraiser](https://union.floridapa.com/); [Clerk — Probate & Guardianship](https://unionclerk.com/departments-services/court-services/probate/); [Clerk of Court Records](https://www.civitekflorida.com/ocrs/county/63/); [Tax Collector](https://www.unioncountytaxcollector.com/)
- **Volusia County** — [Property Appraiser](https://vcpa.vcgov.org/); [Clerk — Probate & Guardianship](https://www.clerk.org/probate.aspx); [Clerk of Court Records](https://app02.clerk.org/cm_evt/inquiry.aspx); [Tax Collector](https://vctaxcollector.org/)
- **Wakulla County** — [Property Appraiser](https://mywakullapa.com/); [Clerk — Probate & Guardianship](https://wakullaclerk.org/courts/guardianship.php); [Clerk of Court Records](https://www.civitekflorida.com/ocrs/county/65/); [Tax Collector](https://www.wakullatax.com/)
- **Walton County** — [Property Appraiser](https://waltonpa.com/); [Clerk — Probate & Guardianship](https://waltonclerkfl.gov/will); [Clerk of Court Records](https://waltonclerkfl.gov/courtrecords); [Tax Collector](https://www.waltontaxcollector.com/)
- **Washington County** — [Property Appraiser](https://www.qpublic.net/fl/washington/); [Clerk — Probate & Guardianship](https://www.washingtonclerk.com/court-information/probate/); [Clerk of Court Records](https://www.civitekflorida.com/ocrs/county/67/); [Tax Collector](https://www.washingtoncountytaxcollector.com/)

### Statewide

- **Florida** — [Florida Courts E-Filing Portal](https://www.myflcourtaccess.com/); [Florida Statutes, Chapter 744](https://www.leg.state.fl.us/statutes/index.cfm?App_mode=Display_Statute&URL=0700-0799/0744/0744ContentsIndex.html); [Florida Probate Rules](https://www.floridabar.org/rules/ctproc/); [Florida Courts — Guardianship](https://www.flcourts.gov/Services/Family-Courts/domestic-relations-court-resources/guardianship); [Office of Public & Professional Guardians](https://elderaffairs.org/programs-and-services/office-of-public-professional-guardians-oppg/); [Florida Abuse Hotline](https://www.myflfamilies.com/services/abuse/abuse-hotline); [Florida Treasure Hunt](https://www.fltreasurehunt.gov/); [SSA Representative Payee](https://www.ssa.gov/payee/); [VA Fiduciary Program](https://www.benefits.va.gov/fiduciary/)

## Appendix: Change record — pre-landing code review, design decisions, and the helpful-links wiring task

**Moved here 2026-09-16 from `MILESTONE-53-PROPOSAL.md`** (see this document's
Status section for why). Originally recorded in Milestone 53's document only
because Alan asked for it there specifically, while Milestone 53 was mid-draft
on the same tree — this content has always been Milestone 54's own change
record, not Milestone 53's. Nothing below was reworded in the move beyond
this note and the heading; the content is otherwise exactly what landed in
`MILESTONE-53-PROPOSAL.md`'s commit history.

### Defects found in Milestone 54's working-tree implementation and fixed

Found during code review of the (uncommitted, then-unapproved) 54A–54C
implementation Antigravity staged in the working tree; fixed directly since
they were unambiguous bugs, not scope decisions. All six are in files
Milestone 54 already owns; none touch anything Milestone 53 does.

1. **Merge-import clobbered the selected circuit (`src/core/persistence/case-file.js`,
   `decryptCaseFileCore()`).** Defaulted a missing/unreadable
   `selectedCircuit` to `6` unconditionally, so `importSavArchiveOrWard()` —
   which **merges** into the current `caseFile` rather than replacing it —
   overwrote an already-selected circuit to `6` on every import of an
   archive that predates this milestone, including a plain backup restore.
   **First fix (superseded within this same pass — see design decision 8
   below):** the decode returned `null` for absent/invalid instead, so the
   caller's own `if (importedSelectedCircuit)` guard actually guarded.
   **Verified red-first**, not just asserted: temporarily reverted the
   one-line fix and re-ran the new e2e test — `Expected: 12, Received: 6`
   (the first attempt at this confirmation showed a false pass, traced to a
   leftover `vite preview` server reused across two back-to-back
   `playwright test` invocations rather than the fix itself; a second run
   against a verified cold server reproduced the failure). Green after
   restoring the fix. **Then superseded, same day:** decision 8 moved
   `selectedCircuit` out of `encryptCaseFileCore()`/`decryptCaseFileCore()`
   entirely, into the `appState` blob, which the merge-import path never
   reads for anything — removing the write path this bug depended on
   rather than gating it. The regression test below was simplified to match
   (no more zip-stripping needed; the guarantee is now unconditional).
   Recorded both because the *finding* (a merge path must not clobber this
   field) and the *first fix* were both real and red-first-verified, even
   though the code that fix touched was later deleted outright.
2. **Keyboard focus lost on circuit change (`src/features/dashboard/index.js`,
   `renderSidebarResources()`).** The `change` handler replaced
   `sidebarResources.innerHTML` synchronously, destroying the `<select>` the
   user was mid-interaction with — a closed `<select>` fires `change` on
   every arrow-key press in Chromium, so keyboard selection worked for
   exactly one keystroke. Fixed: re-focus `#sidebar-circuit-select` after
   the re-render (same node re-queried from the still-attached
   `sidebarResources` container). Not separately covered by a new automated
   test in this pass — flagged below as the one item still worth a
   dedicated e2e case.
3. **Polymorphic `resourcesPanelHTML()` signature (`src/features/dashboard/resources.js`).**
   The function type-sniffed its second argument
   (`selectedCircuitOrHelpers`) to distinguish a Milestone 47B-style helpers
   object from a Milestone 54-style circuit number, so any call could be
   silently coerced into the wrong branch by a wrong-shaped second argument.
   Fixed: one signature, `resourcesPanelHTML(groups, { selectedCircuit, esc,
   ic })`. Every call site (`index.js`, both spec files) updated in the same
   change; one new unit test added confirming `groups === undefined` still
   derives from `selectedCircuit` via `groupsForCircuit()`.
4. **Loose county-to-group matching (`resources.js`, `groupsForCircuit()`).**
   Matched `g.scope === county || g.heading.startsWith(county)` — the
   `startsWith` half was unneeded (every real group's `scope` already equals
   its `FL_COUNTY_CIRCUIT` key) and could in principle match a county whose
   name prefixes another's. Fixed: `scope` match only.
5. **Always-true guard writing the zip entry (`case-file.js`,
   `buildCaseFileBlob()`).** `if (core.selectedCircuit) zip.file(...)` —
   `core.selectedCircuit` is always a populated encrypted string at that
   point (produced by `encryptCaseFileCore()`'s own `|| 6` default), so the
   condition could never be false. Fixed: write unconditionally, matching
   the three sibling `zip.file(...)` calls immediately above it.
6. **Empty accordion rendered no content (`resources.js`,
   `resourcesPanelHTML()`).** A county with no defined links rendered a bare
   `<div class="sidebar-resource-empty"></div>` even though the CSS styles
   that class as visible italic copy — expanding it showed nothing. Fixed:
   the div now carries "No county-specific links yet — see Florida below."
   Existing spec assertion for the old empty markup updated to match.

**Verification after all six fixes:** full unit suite `npx vitest run` —
78 files / 851 tests, all passing (one net new test, item 1's regression
case). `tests/e2e/case-file-core-fields-roundtrip.spec.ts` — 4/4 passing,
including the new case. `tests/e2e/routes.spec.ts` — run separately;
confirm and record its result before this appendix's fixes are considered
verified, per this repository's own rule that a claimed pass is not
verification until it has actually been run in this session.

### Design decisions — asked, answered, and implemented (2026-09-16)

Three questions were put to Alan as choices; all three were answered and
then implemented in the working tree, not merely recorded. Superseding the
"still open" framing this section originally had.

**8. Where `caseFile.selectedCircuit` persists — moved to the `appState`
blob.** Chosen over the original CSV-row + dedicated `.enc` zip-entry
design (which widened the four-field `encryptCaseFileCore()`/
`decryptCaseFileCore()` fan-out Milestone 52B had just consolidated) and
over `localStorage` (which would not travel with an exported `.sav`).
Implemented:

- `encryptCaseFileCore()`/`decryptCaseFileCore()` (`case-file.js`) reverted
  to their pre-54 four-field shape — `selectedCircuit` removed from both.
- `buildCaseFileBlob()`'s `appStateBlob` object gained
  `selectedCircuit: caseFile.selectedCircuit || 6` alongside
  `walkthroughCompleted`/`recentWards`/etc. (case-scoped, not launch-scoped,
  hence sourced from `caseFile` rather than `loadAppState()` like its
  siblings — commented in place).
- `legacy-app.js`'s `loadCaseFileFromZip()` (the **full .sav open** path)
  reads it back inside the existing `if(manifest.appState)` block and sets
  `caseFile.selectedCircuit`, clamped to 1–20 with a fallback to 6.
- `importSavArchiveOrWard()` (the **merge** path — Open Backup/Restore/
  Import) does not read `manifest.appState` for anything, including this,
  and now never did for `selectedCircuit` either — this is what makes the
  original clobber bug (defect 1, above) structurally impossible rather
  than patched: there is no longer a write path from a merge-import to
  `caseFile.selectedCircuit` at all.
- `recovery-cache.js`'s `saveSessionRestoreCache()`/
  `checkSessionRestoreCacheAtLaunch()` (crash recovery) likewise no longer
  carry it, matching every other `appState` field — none of which survive
  crash recovery either.
- The `probate-guardian-data-model.csv` row added for 54A was removed
  (`npm run verify:data-model`: back to 914 rows, clean) — `appState` blob
  fields have never had CSV rows, matching `walkthroughCompleted` etc.
- `tests/e2e/case-file-core-fields-roundtrip.spec.ts`'s regression test
  (defect 1, above) was simplified accordingly: it no longer needs to
  strip a zip entry to prove the point, since the guarantee is now
  unconditional — importing *any* archive, regardless of what circuit data
  it itself carries, must never change the current session's selection.

**9. Decision D4's fate — its intent survives as the selector's *default*,
not as a filter.** `groupsForCounties()` (which filtered which of a fixed
four groups to show, based on the filing's county) is deleted. In its
place, `resources.js` exports `deriveDefaultCircuit(counties)`: tallies the
circuits implied by the user's filings' counties (via the existing
`circuitForCounty()` in `circuit-lookup.js`) and returns the most common one
(ties broken toward the lower circuit number), or `null` if no filing has a
resolvable county. `dashboard/index.js`'s `renderSidebarResources()` now
computes `cf?.selectedCircuit ?? deriveDefaultCircuit(counties) ?? 6` —
a manual selection (a concrete number on `caseFile.selectedCircuit`, set
only by the `<select>`'s `change` handler) always wins; absent one, the
default tracks the filings live rather than sitting at a fixed 6. This also
resolves the dead-code item the original punch list flagged: there is no
longer an unused `groupsForCounties()` sitting next to its replacement.
`tests/unit/dashboard-resources.spec.js`'s old "groupsForCounties policy
(Decision D4)" block was replaced with a `deriveDefaultCircuit` block
covering the empty/no-match case, single-county resolution, multi-filing
plurality, and the tie-break rule.

**A gating mechanism this deletion touched, found and fixed in the same
pass.** `groupsForCounties()` was also the AO 2024-025 compliance gate
`tests/unit/content-corrections.spec.js` pins (Milestone 36-5/47B, per
`AGENTS.md` §5's county-gating rule: a circuit-specific administrative
order must never be shown as a statewide requirement). Deleting it without
adjustment would have left the Sixth Circuit's resource group — and the AO
2024-025 link inside it — rendering unconditionally. It does not: the group
is included only when its own `scope` (`'circuit-6'`) matches the
*selected* circuit, generalized in `groupsForCircuit()` from a hardcoded
`cNum === 6` check to a `RESOURCE_GROUPS.find(g => g.scope === \`circuit-${cNum}\`)`
lookup — which also means a future circuit-level group (the helpful-links
task below) is picked up automatically. The content-corrections test was
updated to check for this new mechanism rather than the deleted function's
name. **Flagged, then reviewed and accepted by Alan (2026-09-16):** this is
a *different* exposure than 47B's, not merely a mechanical substitute —
47B gated the group by the counties on the user's own filings (a filer
outside Pinellas/Pasco never saw it); the circuit selector gates it by the
user's own *browsing choice*, so a filer whose filings are entirely in,
say, the 13th Circuit can see the AO 2024-025 link by manually selecting
the Sixth Circuit from the dropdown. Nothing in the UI asserts the order
applies to their filing, and it remains inside the panel's own third-party
disclaimer either way. Raised per `AGENTS.md` §8's "flag for a qualified
person" rule; Alan reviewed it and confirmed this is acceptable as shipped
— not an open item. The code comment (`resources.js`) and the test comment
(`content-corrections.spec.js`) have been updated to match.

**10. County ordering — kept alphabetical everywhere.** No code change:
this was already the implementation (`countiesForCircuit()`'s
`.sort((a, b) => a.localeCompare(b))`), so Pasco sorting before Pinellas in
the Sixth Circuit is confirmed deliberate, not an oversight.

**Verification after all three decisions' implementation:** full unit
suite `npx vitest run` — 78 files / 852 tests, all passing (one net new
test versus the six-defects pass: the import-clobber regression stayed at
one test, simplified; the `deriveDefaultCircuit` block added six covering
the old `groupsForCounties` block's five). `npm run verify:data-model` —
914 rows, clean (back to the pre-54A count). `npx tsc --noEmit` — no new
errors in any touched file (the pre-existing failures elsewhere are
unrelated to Milestone 54 and predate this session).
`tests/e2e/case-file-core-fields-roundtrip.spec.ts` — 4/4.
`tests/e2e/routes.spec.ts` — 23/23, including "helpful resources panel is
visible on dashboard, hidden inside filings, and restored on return," which
exercises `resourcesPanelHTML()`/`groupsForCircuit()`/`deriveDefaultCircuit()`
end to end through a real browser. All commands actually run in this
session; none of these numbers are asserted from memory.

**Net effect on the working tree versus what Antigravity staged.** Every
fix and decision above was applied directly to the same uncommitted
working-tree files Milestone 54's implementation already occupied — nothing
here has been committed, and the whole tree remains gated on Alan's
approval per `AGENTS.md` §3, same as before this appendix. One file ended up net-unchanged from `origin/master` despite being edited
along the way: `probate-guardian-data-model.csv` (54A added the
`selectedCircuit` row, decision 8 removed it again once the field moved to
the `appState` blob). `git status` reflects only files that still differ
from `origin/master`.

### New task: wire `MILESTONE-54-HELPFUL-LINKS.md` into `RESOURCE_GROUPS` — Landed `3e38f78`, 2026-09-16

Added at Alan's direction, **gated on Milestone 54's circuit-selector
structure landing and working first** — this task assumes `groupsForCircuit()`,
the stub-group shape (`{ id, heading, scope, links: [] }` for a county with
no data), and the fixes above are already in place and approved, since it
is meaningless to wire real link data into stub groups that might still
change shape.

`MILESTONE-54-HELPFUL-LINKS.md` (Alan's own research, confirmed not
AI-fabricated) is a county-by-county and circuit-by-circuit link catalog
covering all 67 Florida counties and all 20 judicial circuits, prepared as
the data source for populating every county's accordion beyond the
currently-hardcoded Pinellas/Pasco/Sixth-Circuit/Florida groups in
`RESOURCE_GROUPS`.

**What "wiring it in" means concretely:**

- Parse `MILESTONE-54-HELPFUL-LINKS.md`'s circuit map and per-county link
  tables into `RESOURCE_GROUPS` entries matching the existing shape (`id`,
  `heading`, `scope`, `links: [{ id, label, description, url }]`), reusing
  its own "Suggested standard county/circuit descriptions" where a
  county-specific description wasn't given.
- Every added `url` must be `https:` and added to
  `dashboard-resources.spec.js`'s `EXPECTED_HOSTS` allowlist — that spec
  already asserts every `RESOURCE_GROUPS` link's host is on the allowlist,
  so this is not optional scaffolding, it is the existing test gate.
  67 counties' worth of new hostnames is a large, mechanical addition to
  that Set; generate it from the same source rather than retyping it by
  hand, so the two lists can't drift.
- `RESOURCE_GROUPS`'s existing `Object.freeze()` wrapping (group and link
  level) must cover every newly-added group and link the same way the
  current ones are covered — `dashboard-resources.spec.js`'s "RESOURCE_GROUPS
  and link collections are frozen" test already checks this and will catch
  an unfrozen addition.
- Circuit-level groups (the "Sixth Judicial Circuit" pattern, `scope:
  'circuit-N'`) should be added for every circuit `MILESTONE-54-HELPFUL-LINKS.md`
  gives one for, not only the Sixth. **Already generalized, not still
  needed:** `groupsForCircuit()`'s circuit-level lookup no longer hardcodes
  `cNum === 6` — fixed during this appendix's own defect/decision pass
  (it was also the AO 2024-025 compliance gate, see decision 9 above) to
  `RESOURCE_GROUPS.find(g => g.scope === \`circuit-${cNum}\`)`. A new
  `scope: 'circuit-N'` group is picked up automatically; no `resources.js`
  change needed for this part.
- Once real data exists for a county, `countiesForCircuit()` /
  `groupsForCircuit()` should no longer need the empty-stub fallback for
  that county — a good acceptance check is that the number of stub
  (`links: []`) groups an expanded circuit's `groupsForCircuit()` call
  produces drops to zero.
- Update `TEST-INDEX.md`'s row for `dashboard-resources.spec.js` and add
  whatever new assertions make sense for the expanded catalog (at minimum:
  link-id uniqueness and the host allowlist, both already generic over
  `RESOURCE_GROUPS` and needing no new test code — just the data).

**Not scoped here:** deciding *which* circuits/counties to prioritize if
not all 67 land in one pass, or resolving `MILESTONE-54-HELPFUL-LINKS.md`'s
own noted placeholder choices (e.g. pointing both "Clerk — Guardianships"
and "Court Records" at the same landing page where no deep link was found)
— those are content decisions for whoever executes this task, working from
that document's own stated research notes.

**Landed, all 67/20 in one pass.** All 67 counties and all 20 circuits went
in together — the source document had complete coverage, so there was no
partial-rollout decision to make. `MILESTONE-54-HELPFUL-LINKS.md`'s
placeholder note (single combined Clerk link rather than separate
Guardianships/Court-Records items, except where the source gave a verified
deep link) was taken as written: one combined "Clerk — Probate &
Guardianship" link per generic county, matching the source table's own
single Clerk column; Pasco's verified separate Court Records link was added
as its own item, matching Pinellas's existing pattern. Three circuits (1,
11, 14) got only their probate/guardianship-information link, not an
administrative-orders one, because the source document explicitly found no
stable AO index for those rather than inventing a URL — taken as-is, per its
own instruction. See `3e38f78`'s commit message for full verification
detail — figures superseded by the "Final Shipped Link Catalog" section
above, which reflects what actually shipped after the later link
reconciliation pass, not this task's original landing.

---

## Explicitly Authorized Side Edit — Preview & Export Navigation Controls

**Authorized directly by Alan on 2026-09-16.** The shared Preview & Export banner now includes **All Filings**, **Light/Dark mode**, and **Help** controls for every filing type. The controls had already been defined in the shared preview-pager path, but were mounted only after confirming that a preview contained at least two pages. Moving their mounting ahead of that early return makes them available on single-page and multi-page previews alike without duplicating the controls across the seven print modules. `tests/e2e/readiness-card.contract.spec.ts` verifies the controls across all nine filing types, and `TEST-INDEX.md` records the expanded contract.
