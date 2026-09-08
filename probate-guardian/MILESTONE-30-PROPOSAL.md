# Milestone 30: E2E Suite Consistency, Reliability & Safe Concurrency

## Status

**Proposal only.** No implementation, configuration change, or test-behaviour change is authorized until this plan is reviewed and approved.

## Goal

Reduce duplicated E2E coverage, remove a real asynchronous ward-switch race, make export assertions event-driven, and establish whether stateless tests can safely run with two workers. The work is deliberately ordered to produce useful maintenance gains without obscuring current coverage or changing product behaviour.

## Non-Negotiables

1. Preserve the existing assertions, test cases, test titles, and filing-specific edge cases unless a change is explicitly called out below.
2. Keep PDF byte-stream and semantic verification in browser Playwright; do not move it to Vitest.
3. Retain existing DOM geometric checks.
4. Do not reorganize the suite into new `journeys/` or `whitebox/` directories.
5. Do not introduce image snapshot assertions such as `toHaveScreenshot()`.
6. Do not alter `playwright.config.ts` until the worker-concurrency experiment has produced repeatable local evidence.

---

## Phase 1: Make Ward Switching Awaitable and Consolidate Plan-Mount Contracts

### 1. Repair the `switchWard()` mount race

In `src/core/navigation/ward-lifecycle.js`, update `switchWard()` so every invoked `mount*Feature('/')` call is awaited before the function runs its shared post-mount UI work and resolves. Each mount helper is already asynchronous, and the normal `navigate()` path already awaits the same helpers; ward switching should provide the same completion guarantee.

Two specific defects to correct:

- **Un-awaited mounts**: None of the `mount*Feature('/')` calls in the switch-case block are currently awaited.
- **`guardian` early-return**: The `guardian` case executes `return true` immediately after its mount call, bypassing the shared post-mount work (`linkLabelsToInputs`, `updateNavDots`, `updateHelpContext`, `closeMobileSidebar`) that every other case runs. Remove the early return so the guardian case falls through to the shared post-mount block, matching the behaviour of all other form engines.

In addition, audit callers of `switchWard()` that fire-and-forget the result. In particular, the dashboard click handler in `src/features/dashboard/index.js` (the `'open-ward'` action) calls `switchWard(wardId)` without `await`; it must be awaited so the mount completes before any subsequent UI interaction.

This is intentionally paired with the plan-spec refactor: those tests exercise remounting and should consume a deterministic, fully mounted application state rather than timing around the race.

### 2. Add a shared plan fixture

Create `tests/e2e/support/plan-fixture.ts` exporting a lightweight `registerPlanMountTests(config)` runner. Its configuration will include the feature identity and the genuine points of variation:

```ts
type PlanMountConfig = {
  featureName: string;
  filingType: string;
  routes: string[];
  fillValidWard: (page: Page) => Promise<void>;
  triggerExport: (page: Page) => Promise<void>;
  triggerBlockedExport: (page: Page) => Promise<void>;
  navChecks: Array<{ route: string; key: string }>;
  createFiling?: (page: Page) => Promise<void>;
  waitForReady?: (page: Page) => Promise<void>;
};
```

The runner will own the repeated contract presently shared by the four plan-mount specs:

1. Render each declared route and retain the existing rendering/error checks.
2. Verify that an incomplete filing blocks export.
3. Fill a valid ward and verify successful PDF export.
4. Exercise remount cycling.
5. Verify navigation and summary parity for the declared route/key pairs.

For the blocked-export case only, synchronize with the native dialog from the outset instead of using the current `waitForTimeout(500)` delay:

```ts
const [dialog] = await Promise.all([
  page.waitForEvent('dialog'),
  config.triggerBlockedExport(page),
]);
// Preserve the current message assertion and dialog dismissal.
```

The successful-export tests already use the event-driven `page.waitForEvent('download')` pattern and do not need this change.

Note that the four plan specs use two different export trigger mechanisms: `plan-annual`, `plan-initial`, and `plan-minor` trigger export via `page.evaluate(() => doSavePdf*())`, while `plan-simplified` locates a `[data-plan-simplified-action="save-pdf"]` button, programmatically enables it (it starts disabled on an incomplete filing), and clicks it. The `triggerExport` and `triggerBlockedExport` callbacks must each accommodate this divergence — the simplified spec's blocked-export callback in particular needs to include the button-enable step as behavioural setup, not just a trigger.

`createFiling` accommodates any feature that needs a nonstandard filing setup; `waitForReady` accommodates a feature-specific readiness condition without adding arbitrary global sleeps. Any assertion or setup unique to one filing remains in that filing's spec beside its call to the runner.

### 3. Refactor exactly four specs

Convert these specs to focused configuration plus any local edge-case tests:

- `plan-annual-mount.spec.ts`
- `plan-initial-mount.spec.ts`
- `plan-minor-mount.spec.ts`
- `plan-simplified-mount.spec.ts`

The fixture must not become a generic abstraction for unrelated form families. Before and after the refactor, compare the four specs' test names and coverage paths to ensure the helper has removed duplication rather than removed tests.

### Phase 1 acceptance criteria

- `switchWard()` does not resolve before its selected feature has mounted.
- The `guardian` case no longer early-returns before shared post-mount work.
- All callers of `switchWard()` (including the dashboard `'open-ward'` handler) await the result.
- The four plan specs use the shared fixture and retain filing-specific tests locally.
- Blocked export waits on, asserts, and dismisses the native dialog without the replaced fixed wait.
- Targeted runs for all four plan specs pass, followed by the full E2E suite.

---

## Phase 2: Split the Two Monolithic Specs Without Behavioural Change

This phase is a file-boundary refactor only. Move existing tests, fixtures, helpers, and imports into the destination files without changing assertions, test data, test titles, execution mode, or coverage.

### PDF/WCAG suite

Split `tests/e2e/pdf-wcag-compliance.spec.ts` (approximately 1,583 lines) into:

- `pdf-structure-tags.spec.ts` — tagged PDF, `/StructTreeRoot`, and marked-content coverage.
- `pdf-table-semantics.spec.ts` — table headers, colspans, and multi-page split coverage.
- `pdf-fonts-and-xmp.spec.ts` — embedded-font and PDF/UA/XMP identifier coverage.
- `pdf-form-specific.spec.ts` — accounting- and inventory-filing-specific coverage.

### Case-file and backup suite

Split `tests/e2e/save-open-sav.spec.ts` (approximately 756 lines) into:

- `case-file-roundtrip.spec.ts` — unencrypted, encrypted, and corrupted-file paths.
- `case-file-protection.spec.ts` — `preWriteValidator`, multi-ward isolation, and auto-save protection.
- `dashboard-backup.spec.ts` — preference isolation and single-ward export.

Shared helper code may be placed in an existing appropriate E2E support location only when required to preserve the original behaviour exactly. Do not use this phase to broaden abstractions or rewrite test logic.

### Phase 2 acceptance criteria

- Each original test appears once in exactly one replacement spec, with its title and assertions unchanged.
- Old monolithic specs are removed only after their replacements are present and discoverable.
- The affected suites pass independently and as part of the full E2E run.

---

## Phase 3: Classify Origin-Sensitive Tests and Trial Two Workers

### 1. Mark tests that need origin isolation

Audit and tag the suites that use shared-origin facilities or cross-tab coordination. The initial candidates are:

- `ward-lock.spec.ts`
- `backup-restore-sav.spec.ts`
- `pwa-registration.spec.ts`
- `offline.spec.ts`
- `tab-and-update.spec.ts`

Use a clear Playwright tag or annotation (for example, `@origin-state`) at the appropriate describe/spec level. The audit must also check their imported helpers so that the classification reflects actual shared state, including `navigator.locks`, Service Workers, and `BroadcastChannel`.

Critically, the audit scope must extend beyond the five suites listed above. Any spec that writes to IndexedDB via the case-file persistence layer (which includes every spec that calls `freshStartNoPassword` followed by `createWard`) is implicitly origin-coupled. Two workers running such specs concurrently against the same origin will collide on the same IDB database. The audit must determine whether a meaningful "stateless" subset actually exists. If it does not — or is too small to produce a material speedup — that is a valid outcome and the trial should be recorded as such rather than forced.

### 2. Measure a bounded parallel run

Against a local Vite preview build, run the untagged/stateless E2E tests with `--workers=2`. Repeat the trial enough to compare:

- pass/fail stability and any origin collision symptoms;
- elapsed time relative to the current worker count;
- CPU and memory pressure; and
- whether preview-server startup/teardown is reliable under concurrency.

Do not edit `playwright.config.ts` during this trial. If results are stable and materially beneficial, a subsequent reviewed change may define the permanent serial/parallel execution strategy. If the stateless subset is empty or near-empty, skip the trial, record the IDB coupling evidence, and retain the existing single-worker configuration.

### Phase 3 acceptance criteria

- Every known origin-sensitive suite is explicitly classified, with any newly discovered dependencies added to the same category.
- The two-worker command excludes the classified tests and produces recorded, repeatable measurements.
- No permanent parallelization or Playwright-project split is made without the trial evidence and a separate review.

---

## Verification and Review Gates

After each phase, review the diff for assertion and title parity, run the affected specs, then run the full E2E suite. Phase boundaries should be independently reviewable and revertible:

1. Ward-switch await plus plan fixture.
2. PDF/WCAG and case-file spec splits.
3. Origin-state tagging and the non-config-changing worker trial.

The proposed sequence intentionally does **not** add a separate navigation lifecycle hook: the concrete inconsistency is the un-awaited feature mounting in `switchWard()`, while normal `navigate()` already awaits those mounts. It also defers any worker project/config design until the measurement phase supplies evidence.
