# Milestone 31: E2E Baseline Accuracy and Filing Capability Matrix

## Status

**Proposal only.** No test-file migration, Playwright configuration change, CI
change, or product-code change is authorized until this plan is reviewed and
approved.

This is the first of two milestones covering the original "Change-Surface E2E
Contracts, Artifact Semantics, and Distribution Parity" proposal, split for
review and risk reasons: this milestone (target-naming accuracy, skip
classification, and a declared filing capability matrix) is low-risk and
mostly mechanical. The larger, higher-risk work — the actual contract-group
rewrite, semantic artifact inspection, wait replacement, and CI distribution
profiles — is proposed separately as **Milestone 33**, which depends on this
milestone's output (the target vocabulary and filing matrix) and should not
begin until this one is approved and landed.

## Goal

Give the E2E suite an accurate, reproducible baseline and a single source of
truth for which of the app's nine filing types support which surfaces and
outputs — the foundation Milestone 33's contract groups will consume. Fix two
concrete, verified defects along the way: a dead target-name check that can
never fire, and the absence of any declared distinction between Final/Trust
and their shared Annual form code.

## Background

The existing suite has 45 spec files.

**Baseline history (both figures verified directly by this reviewer, not
taken on report):**

- A Chromium `source` run at commit `fbd8fd5` (Milestone 30's implementation
  commit, before Milestone 32 began) produced **202 passes, five intentional
  target skips, and zero failures**, confirmed by two independent runs. An
  earlier draft of this proposal claimed "200 passes... two stale PDF-title
  expectation failures" at this point; that figure did not reproduce and has
  been superseded. There is no known PDF-title drift failure in the suite.
- **Current baseline:** Milestone 32 (responsive breakpoint standardization)
  has since been executed, verified, committed, and pushed to `origin/master`
  at commit `b21bd24`, modifying `tests/e2e/attestation-layout.spec.ts` and
  `tests/e2e/schedule-card-layout.spec.ts` as expected. A fresh Chromium
  `source` run at `b21bd24` produced **202 passes, five intentional target
  skips, and zero failures**, independently confirmed and matching the
  pre-Milestone-32 totals exactly. This is the baseline this milestone and
  Milestone 33 should build from. Re-verify again immediately before this
  milestone's own implementation begins, since other work may land in the
  interim.

**Target naming is inconsistent with the actual configuration.**
`playwright.config.ts` defines exactly three distribution targets —
`source`, `web`, `portable` — plus a `dev` convenience mode that isn't a
distribution target at all. `tests/e2e/ward-lock.spec.ts:9` checks
`target === 'file'`, a string that does not exist anywhere in the configured
target vocabulary (confirmed by direct inspection). This skip condition can
never evaluate true under any real configuration, so whatever behavior it
was meant to guard against is currently unverified in every target, silently.

**Filing-family coverage differs materially, and Final/Trust is the sharpest
case.** Final and Trust Accountings share Annual's form code and receive
route-smoke and supplemental-document coverage, but have no explicit
feature-contract test of their own the way Annual does (`annual-mount.spec.ts`
has no `final-accounting-mount.spec.ts`/`trust-accounting-mount.spec.ts`
counterpart, confirmed by direct inspection) — despite Final and Trust having
legally distinct required titles and attestation language from Annual. There
is currently no single place that declares, for all nine filing types, which
outputs (PDF/DOCX/XLSX), routes, and identity requirements each one actually
supports — coverage gaps and intentional omissions are indistinguishable from
each other without reading every spec file.

## Non-Negotiables

1. Preserve existing product behavior. This milestone strengthens test
   infrastructure; it does not redesign filing, persistence, PDF, or PWA
   behavior.
2. Keep `workers: 1`. The suite shares an origin, IndexedDB, service workers,
   browser locks, BroadcastChannel state, and cross-tab tests; concurrency is
   not a safe default and is out of scope here regardless.
3. Retain all existing feature-specific tests unchanged. This milestone adds
   a target-vocabulary module and a capability matrix; it does not migrate,
   rename, or retire any existing spec.

---

## Phase 0: Establish an Accurate Baseline and Target Vocabulary

### 1. Reconcile the current source-target baseline

Before structural test changes, run the full Chromium suite at
`PG_TARGET=source` and record:

- total, passed, skipped, failed, and elapsed time;
- the target and browser in the report title;
- every skip and its reason; and
- any stale expectations corrected solely because a known, intentional output
  contract changed.

Do not count a result from a prior working tree after test expectations have
changed. The baseline must be reproducible from the current tree — see
Background above for what happens when it isn't.

### 2. Centralize target facts

Add one E2E support module, for example
`tests/e2e/support/target-profile.ts`, that owns the valid target names and
their properties:

```ts
type DistributionTarget = 'source' | 'web' | 'portable';

type TargetProfile = {
  id: DistributionTarget;
  isHosted: boolean;
  supportsServiceWorker: boolean;
  supportsFileSystemAccessAutomation: boolean;
};
```

`DistributionTarget` intentionally covers only the three shipped distribution
targets; `dev` (the live Vite dev server `tests/e2e/support/target.ts` also
accepts via `PG_TARGET=dev`, per its own "four parity targets" comment) is a
local convenience mode, not a distribution target, and is deliberately out of
scope for this vocabulary.

`playwright.config.ts`, `tests/e2e/support/target.ts`, and target-sensitive
specs import or derive their behavior from this one vocabulary. Eliminate
ad-hoc string checks such as `target === 'file'`.

Correct the Ward Lock exclusion to test `target === 'portable'`, if its
underlying Web Locks limitation is confirmed for the portable `file://` build.
The correction must be tested in both directions: it skips in `portable` and
still runs in `source`/`web`.

### 3. Classify all skips

Introduce a small helper for target-sensitive test declarations. It must make
the reason visible in the test name/output and use one of three categories:

- `expected-target-exclusion`: a capability cannot exist on that target, such
  as service-worker testing in a `file://` portable build.
- `environment-limitation`: a browser or CI limitation prevents a valid
  product behavior from being automated.
- `temporary-gap`: intentionally deferred coverage, with an owning milestone
  reference (an existing `MILESTONE-N-PROPOSAL.md` in this repository, since
  that is how this project tracks planned work — not an external issue
  tracker).

The helper must not conceal skips. A static audit test or a lightweight source
scan should reject bare `test.skip(...)` calls outside the helper, except for
a documented, reviewed allowlist. Existing `offline.spec.ts`,
`feature-load-failure.spec.ts`, `tab-and-update.spec.ts`, and `ward-lock.spec.ts`
are the first migration candidates.

### Phase 0 acceptance criteria

- All target names come from a single typed vocabulary.
- No E2E test checks for an undefined target name.
- Every dynamic skip reports one of the three classifications and a readable
  reason.
- A fresh Chromium source baseline is recorded before migration begins, and
  matches on re-verification immediately before implementation.

---

## Phase 1: Create a Filing Capability Matrix

### 1. Declare capabilities instead of inferring them from absent tests

Add `tests/e2e/support/filing-matrix.ts`. It is test-owned metadata, not a
second product filing descriptor. It lists all nine filing types:

```ts
type FilingCapabilities = {
  id: FilingType;
  family: 'inventory' | 'accounting' | 'plan';
  displayName: string;
  documentTitle: string;
  routeSet: readonly string[];
  exports: { pdf: boolean; docx: boolean; xlsx: boolean };
  preview: boolean;
  supplementalDocuments: boolean;
  needsDistinctLegalCopy: boolean;
};
```

The matrix must cover `guardian`, `simplified`, `annual`, `finalAccounting`,
`trustAccounting`, `planSimplified`, `planAnnual`, `planInitial`, and
`planMinor`.

Populate output capabilities from actual product support, not assumptions. If
a form has no Excel or DOCX export, the matrix says `false`. If an output is
supported, it is a candidate for a future contract test in Milestone 33. This
phase declares the matrix; it does not yet enforce or consume it beyond the
audit in step 3.

### 2. Make Annual aliases first-class entries

`annual`, `finalAccounting`, and `trustAccounting` may share form code and
fixture shape, but the matrix marks Final and Trust as
`needsDistinctLegalCopy: true`. This is a declaration only in this milestone —
Milestone 33's identity contract is what actually tests it.

### 3. Add a capability audit

Add a small contract spec that iterates the matrix and confirms:

- each filing type has a declared route set and one smoke route; and
- each declared output capability is a boolean, not absent/undefined.

This audit tests the matrix's own completeness. It does not test the
product's real output behavior — that is Milestone 33's job.

### Phase 1 acceptance criteria

- One matrix declares the supported surfaces of all nine filing types.
- Final and Trust are explicit entries, not implicit Annual aliases.
- Adding a filing type to the matrix without every required field fails the
  capability audit.

---

## Acceptance Criteria

- All target names come from a single typed vocabulary; no E2E test checks
  for an undefined target name (fixes the confirmed `target === 'file'` bug).
- Every dynamic skip reports one of three classifications
  (`expected-target-exclusion` / `environment-limitation` / `temporary-gap`)
  and a readable reason.
- One matrix declares the supported surfaces of all nine filing types, with
  Final and Trust as explicit, distinct entries.
- A fresh, reproducible Chromium source baseline is recorded immediately
  before implementation begins.
- No existing spec file is renamed, retired, or rewritten into a new format
  by this milestone. Phase 0.2–0.3's required migration of the 6 files that
  derive `PG_TARGET` or call `test.skip()` directly (`target.ts`,
  `ward-lock.spec.ts`, `offline.spec.ts`, `feature-load-failure.spec.ts`,
  `tab-and-update.spec.ts`, `pwa-registration.spec.ts`) is a surgical import
  and call-site swap in each — same tests, same titles, same behavior except
  the one confirmed bug fix (`ward-lock.spec.ts` now actually skips on
  `portable`, which the old `target === 'file'` check never did) — not the
  wholesale rewrite this bullet originally read as prohibiting entirely.

## Verification

- Run the capability audit and the target-vocabulary checks in isolation
  first, then the full suite (`npm test`).
- Confirm `ward-lock.spec.ts`'s corrected skip condition actually skips on
  `portable` and still runs on `source`/`web`.
- Record the resulting baseline in this document before considering the
  milestone complete, the same way the two prior baselines above were
  recorded and independently verified.
