# Walkthrough - Milestone 59B: Suite Reorganization and Noise Reduction

Milestone 59B separates intentional documentation screenshot tooling from the regression suite, moves a static policy audit to Vitest, and removes unconditional successful-run screenshot generation from dashboard tests without altering application behavior, court output, data models, or visual styling.

---

## Executed Changes

### B1. Guide Capture Harness Isolation
- Moved `tests/e2e/guide-screenshots.spec.ts` to `tests/capture/guide-screenshots.capture.ts` preserving Git history.
- Created `playwright.capture.config.ts` importing `playwright.config.ts`, targeting `tests/capture/**/*.capture.ts`, and pinning single-worker execution at 1280×800, `deviceScaleFactor: 1`, and light theme.
- Created cross-platform runner `scripts/run-guide-capture.mjs` that builds `dist/web`, sets `PG_TARGET=web` and `PG_BROWSER=chromium`, and invokes `playwright.capture.config.ts`.
- Added `"capture:guide": "node scripts/run-guide-capture.mjs"` to `package.json`.
- In `tests/capture/guide-screenshots.capture.ts`:
  - Removed `CAPTURING` gate and alias.
  - Added non-null bounding box assertion on visible canvas before drawing.
  - Added `test.afterAll` verification asserting exact directory file inventory (no extraneous or stale files in `OUT`), all 7 output files exist with non-zero size <= 150 KiB (153,600 bytes), and the four shell-action keys in `blocked-preview-probe.json`.
- In `scripts/run-guide-capture.mjs`, calls `process.exit(0)` on successful completion. **This was recorded here as the fix for a capture run that printed three passing tests and then never exited. It is not that fix.** The script terminates without the line (verified by running a copy with it removed), and it cannot address a stall inside Playwright, because the `await` preceding it only returns once the child has already exited. The stall did not reproduce in seven configurations, and the `reuseExistingServer` explanation offered alongside this delivery was falsified by recreating that state exactly — a run reusing an existing server still exited in 9.2s. See `af031c6`, which keeps the line as a cheap backstop and adds the watchdog that actually bounds and diagnoses a stall.

### B2. Skip-Classification Audit Vitest Migration
- Moved `tests/e2e/skip-classification-audit.spec.ts` to `tests/unit/skip-classification-audit.spec.js` preserving Git history.
- Converted from `@playwright/test` to Vitest syntax, scanning `tests/e2e/*.spec.ts`.
- Removed the self-allowlist entry (the audit file is now outside `tests/e2e`).
- Updated the introductory reference comment in `tests/unit/test-index-guard.spec.js`.
- Red-first verification: Injected a temporary bare `test.skip(...)` in `tests/e2e/temp-skip-check.spec.ts`, verified the audit failed naming the file, verified classified helper `skipTemporaryGap` passed, and cleaned up the temporary file.

### B3. Dashboard Screenshot Noise Elimination
- Removed all 14 unconditional `page.screenshot()` calls from `tests/e2e/dashboard-visual.spec.ts` (12 in the viewport/theme matrix, 1 desktop, 1 mobile).
- Removed unused `testInfo` arguments.
- Preserved all 59A geometry, containment, and `elementFromPoint` hit-testing assertions across all viewports.
- Verified `test-results/` contains 0 PNG files on successful run.

### B4. Test-Index and Documentation Synchronization
- Updated `TEST-INDEX.md`:
  - Moved `skip-classification-audit.spec.js` into the `## tests/unit` table and category.
  - Removed `guide-screenshots.spec.ts` and `skip-classification-audit.spec.ts` from `## tests/e2e`.
  - Added dedicated `## tests/capture (tooling, npm run capture:guide)` section documenting the command, pinned conditions, 7 outputs, and 150 KiB limit.
  - Updated `dashboard-visual.spec.ts` description to state evidence is behavioral and writes no screenshots on success.

---

## Exact File Surface

| Operation | File |
| --- | --- |
| Rename | `tests/e2e/guide-screenshots.spec.ts` → `tests/capture/guide-screenshots.capture.ts` |
| Add | `playwright.capture.config.ts` |
| Add | `scripts/run-guide-capture.mjs` |
| Modify | `package.json` |
| Rename/Convert | `tests/e2e/skip-classification-audit.spec.ts` → `tests/unit/skip-classification-audit.spec.js` |
| Modify | `tests/e2e/dashboard-visual.spec.ts` |
| Modify | `tests/unit/test-index-guard.spec.js` |
| Modify | `TEST-INDEX.md` |
| Modify | `walkthrough.md` |

---

## Verification Results

### 1. Unit & Index Guard Verification
```
npx vitest run tests/unit/skip-classification-audit.spec.js tests/unit/test-index-guard.spec.js
 ✓ tests/unit/test-index-guard.spec.js (2 tests)
 ✓ tests/unit/skip-classification-audit.spec.js (1 test)
Test Files  2 passed (2)
Tests       3 passed (3)
```

### 2. Discovery Boundary Invariants
- Ordinary suite discovery:
  ```
  npx playwright test --list
  Total: 678 tests in 93 files
  ```
  - Post-59A baseline was 679 tests in 94 files. Exactly 1 test moved to Vitest (`skip-classification-audit`).
  - Zero titles matching `capture:` or `probe:`.
- Capture suite discovery:
  ```
  npx playwright test --config=playwright.capture.config.ts --list
  Total: 3 tests in 1 file
  ```
  - Exactly 3 tests discovered: 2 capture workflows and 1 blocked-preview probe.

### 3. Dashboard Visual Regression Verification
```
npx playwright test tests/e2e/dashboard-visual.spec.ts
17 passed (27.7s)
```
- Verified `test-results/` contains 0 PNG files on success.

### 4. Guide Capture Smoke Run
```
npm run capture:guide
```
- Built `dist/web` successfully.
- Ran all 3 capture tests under Chromium with `playwright.capture.config.ts` in 10.0s.
- Output inventory in `.guide-shots/`:
  - `signature-draw.jpg`: 27,029 bytes
  - `signature-applied.jpg`: 28,340 bytes
  - `dashboard.jpg`: 91,506 bytes
  - `resources.jpg`: 11,965 bytes
  - `help-panel.jpg`: 47,177 bytes
  - `preview-blocked.jpg`: 56,815 bytes
  - `blocked-preview-probe.json`: 119 bytes (verified 4 shell-action keys)
- All JPEG sizes are strictly <= 150 KiB (153,600 bytes).

### 5. Type Integrity
```
npm run check:types
Exit code: 0 (0 errors)
```

### 6. Patch Hygiene
```
git diff --check
Exit code: 0 (clean, no trailing whitespace or format issues)
```
- No generated artifacts (`.guide-shots`, `dist`, `test-results`, `playwright-report`) are tracked or staged.
- Planning documents (`MILESTONE-59-PROPOSAL.md`, `MILESTONE-59B-IMPLEMENTATION-PLAN.md`) are now tracked, matching every milestone proposal from 50 through 58. They were untracked when this walkthrough was written, which left it describing a milestone whose proposal and plan were absent from the repository.
