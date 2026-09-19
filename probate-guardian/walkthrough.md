# Walkthrough - Milestone 59A: Test Integrity and False-Confidence Repairs

Milestone 59A repairs tests throughout the regression suite that previously provided false confidence through conditional assertions, incomplete route coverage, mock-only data checks, vacuous test setups, and hand-copied production strings.

---

## Refinements & Executed Fixes

### 1. `tests/e2e/page-structure.spec.ts` (Parameterized 9 Filing Tests)
- **Problem**: Previously evaluated all 9 filing types inside a single top-level `test(...)`, which would abort testing for subsequent filings if an early route failed.
- **Fix**: Parameterized into 9 distinct top-level `test(...)` blocks (`form pages preserve landmarks and heading structure: ${formType}`) with internal `test.step('route ...')` for per-route isolation and reporting.
- **Red Verification**: Artificially asserted `mainCount > 1` on `simplified`; only the `simplified` test failed, with clear route-level reporting, while other filing tests continued executing.

### 2. `tests/e2e/dashboard-backup.spec.ts` (Proved Ward ID Association)
- **Problem**: Verified that `WARD_A_EVENT` and `WARD_B_EVENT` were present in the audit log, but did not assert that `WARD_A_EVENT` carried `wardAId` and `WARD_B_EVENT` carried `wardBId`.
- **Fix**:
  - Asserted `unfilteredEntries.some(e => e.eventType === 'WARD_A_EVENT' && e.wardId === result.wardAId)` and `unfilteredEntries.some(e => e.eventType === 'WARD_B_EVENT' && e.wardId === result.wardBId)`.
  - Asserted `exportedEntries.every(e => e.wardId === result.wardAId)`.
  - Asserted `exportedEntries.some(e => e.eventType === 'WARD_B_EVENT' || e.wardId === result.wardBId)` is `false`.
- **Red Verification**: Artificially corrupted export logic to leak unassigned entries; Node assertions failed immediately.

### 3. `tests/e2e/dashboard-visual.spec.ts` (Strict Pointer Reachability & Title Precision)
- **Problem**: `hitElement.contains(el)` allowed a button to pass if hit-testing hit an ancestor container rather than the button itself. Also, the test title claimed a "scrollable triage row" when the contract proves viewport containment and un-obscured reachability.
- **Fix**:
  - Changed hit-testing predicate to strict `el === hitElement || el.contains(hitElement)`.
  - Renamed test title to `'mobile viewport collapses the sidebar and maintains triage control containment and reachability'`.
- **Red Verification**: Shifted hit coordinates outside the element bounds; `isHit` returned `false` and failed the contract assertion.

### 4. `tests/e2e/annotation-toolbar-containment.spec.ts` (Sliver Control Fault Injection)
- **Problem**: Needed explicit evidence of fault injection for missing controls and 6px sliver buttons.
- **Fix & Red Verification**:
  - Missing controls: `expect(controls.length).toBeGreaterThanOrEqual(2)` fails if 0 or 1 control renders.
  - Sliver detection: Injected a 16×6 button with `style="width: 16px !important; height: 6px !important; min-width: 16px !important; min-height: 6px !important; display: inline-block !important;"` into `.highlightEditor .editToolbar`. The test failed with:
    `Error: controls rendering as slivers: [{"cls":"injected-sliver-btn","w":16,"h":6}]`.

### 5. `src/legacy-app.js` (Authorized Side Fix for Heading Hierarchy)
- **Discovered Defect**: When `page-structure.spec.ts` ran against all form pages, `planAnnual /p3` failed because `planQ` rendered an `<h3>` immediately after an `<h1>` without an intervening `<h2>`, skipping heading levels.
- **Fix**: Changed `planQ` heading generation in [`src/legacy-app.js`](src/legacy-app.js#L5983) from `<h3>` to `<h2>`. Authorized and accepted to land with Milestone 59A.

### 6. `tests/e2e/support/case-file-shape.contract.ts` & `tests/unit/types-contract.spec.js`
- Compile-time type contract using TypeScript JSDoc types with `@ts-expect-error` on real schema constraints (`wardId`, `parties`, etc.).

### 7. `TEST-INDEX.md` & `tests/unit/test-index-guard.spec.js`
- Test index synchronized and guarded.

---

## Verification Results

### 1. Test Index Guard & Unit Suite
```
npx vitest run tests/unit/test-index-guard.spec.js tests/unit/types-contract.spec.js tests/unit/content-corrections.spec.js
  ✓ tests/unit/test-index-guard.spec.js (2 tests)
  ✓ tests/unit/types-contract.spec.js (1 test)
  ✓ tests/unit/content-corrections.spec.js (4 tests)
Test Files  3 passed (3)
Tests       7 passed (7)
```

### 2. TypeScript Static Type Check
```
npm run check:types
> tsc --noEmit
Exit code: 0 (No errors)
```

### 3. Playwright E2E Suite (49 Tests Across Modified Specs)
```
npx playwright test tests/e2e/page-structure.spec.ts tests/e2e/dashboard-backup.spec.ts tests/e2e/dashboard-visual.spec.ts tests/e2e/annotation-toolbar-containment.spec.ts tests/e2e/highlight-toolbar-style.spec.ts tests/e2e/schedule-docs-period-key.spec.ts tests/e2e/annual-schedule-consistency.spec.ts

  49 passed (1.7m)
```
- `tests/e2e/page-structure.spec.ts` (9 independent filing tests, all routes verified via `test.step`)
- `tests/e2e/dashboard-backup.spec.ts` (9 tests, including strict ward-isolated audit logs)
- `tests/e2e/dashboard-visual.spec.ts` (17 tests, including strict hit testing across 4 exact selectors on mobile 390×844)
- `tests/e2e/annotation-toolbar-containment.spec.ts` (3 tests, unconditional preconditions + sliver bounds)
- `tests/e2e/highlight-toolbar-style.spec.ts` (4 tests)
- `tests/e2e/schedule-docs-period-key.spec.ts` (4 tests)
- `tests/e2e/annual-schedule-consistency.spec.ts` (3 tests)

### 4. Git Diff Check
```
git diff --check -> clean (0 whitespace/formatting errors)
```
