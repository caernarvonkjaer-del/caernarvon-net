import { test } from '@playwright/test';

// The single source of truth for distribution-target names and their
// properties (Milestone 31, Phase 0). playwright.config.ts, target.ts, and
// every target-sensitive spec derive from this instead of each redeclaring
// `process.env.PG_TARGET || 'source'` and comparing against ad-hoc strings.
//
// `dev` (a live Vite dev server, PG_TARGET=dev) is a local convenience mode
// documented in playwright.config.ts and accepted by legacy code, but it is
// not one of the three shipped distribution targets and is intentionally out
// of scope for this vocabulary -- a test must not rely on PG_TARGET=dev being
// classified here.
export type DistributionTarget = 'source' | 'web' | 'portable';

export type TargetProfile = {
  id: DistributionTarget;
  isHosted: boolean;
  supportsServiceWorker: boolean;
  // Whether the real browser/target combination can use the File System
  // Access API's native save/open pickers at all -- independent of the fact
  // that every Playwright project in this suite also force-disables
  // window.showSaveFilePicker/showOpenFilePicker via an init script (see
  // target.ts) so automation always takes the download/upload fallback path.
  // `portable` is false because file:// origins do not get FSA pickers
  // regardless of automation; `source`/`web` are true because they're served
  // over http, even though the test harness disables the API either way.
  supportsFileSystemAccessAutomation: boolean;
};

const PROFILES: Record<DistributionTarget, TargetProfile> = {
  source: { id: 'source', isHosted: false, supportsServiceWorker: false, supportsFileSystemAccessAutomation: true },
  web: { id: 'web', isHosted: true, supportsServiceWorker: true, supportsFileSystemAccessAutomation: true },
  portable: { id: 'portable', isHosted: false, supportsServiceWorker: false, supportsFileSystemAccessAutomation: false },
};

const RAW_TARGET = process.env.PG_TARGET || 'source';

function isDistributionTarget(value: string): value is DistributionTarget {
  return value === 'source' || value === 'web' || value === 'portable';
}

// The resolved current target, or null if PG_TARGET is 'dev' or an
// unrecognized value -- callers that need a profile must handle null
// explicitly rather than silently falling back to 'source'.
export const currentTarget: DistributionTarget | null = isDistributionTarget(RAW_TARGET) ? RAW_TARGET : null;

export const currentTargetProfile: TargetProfile | null = currentTarget ? PROFILES[currentTarget] : null;

export function targetProfile(target: DistributionTarget): TargetProfile {
  return PROFILES[target];
}

// ---------------------------------------------------------------------------
// Skip classification (Phase 0.3). Every dynamic test.skip() in the E2E
// suite must go through one of these three, so the reason is both visible in
// the test name/output and machine-classifiable. A static audit
// (skip-classification-audit.spec.ts) rejects bare test.skip() calls in
// tests/e2e/*.spec.ts outside this module.

/** A capability cannot exist on the given target -- e.g. service-worker
 * testing on a file:// portable build. Not a gap; nothing to fix. */
export function skipExpectedTargetExclusion(condition: boolean, detail: string): void {
  test.skip(condition, `[expected-target-exclusion] ${detail}`);
}

/** A browser or CI limitation prevents a valid product behavior from being
 * automated -- the product works; the test harness can't exercise it here. */
export function skipEnvironmentLimitation(condition: boolean, detail: string): void {
  test.skip(condition, `[environment-limitation] ${detail}`);
}

/** Intentionally deferred coverage. `owningMilestone` must name an existing
 * MILESTONE-N-PROPOSAL.md in this repository -- that document's own
 * acceptance criteria is what un-skips this test, not a separate issue
 * tracker this project doesn't use. */
export function skipTemporaryGap(condition: boolean, owningMilestone: string, detail: string): void {
  test.skip(condition, `[temporary-gap: ${owningMilestone}] ${detail}`);
}
