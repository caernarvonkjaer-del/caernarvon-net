import type { Page } from '@playwright/test';

// Milestone 70, 70T. The handful of app operations the mixed-version
// characterization (tests/e2e/mixed-version.characterization.spec.ts) needs
// from each tab, for either build it is running:
//
//   currentBuild -- this tree, through GuardianForms.testing (the page must
//                   have been opened with the runner's test-mode flag set);
//   pre70Build   -- a build from before Milestone 70, which has no
//                   GuardianForms at all and can be driven only through its
//                   own window globals.
//
// pre70Build lives in its own file, ./pre-70-build.ts, the one place a
// browser spec names a pre-70 build's globals: the 70T guard exempts that
// file alone (tests/baseline/ms70-70T-progress.json), and checks this one.

/** What the characterization asks of a tab. Every member runs in the page. */
export type AppDriver = {
  /** Open the Add Filing dialog for `type`; the spec then drives the dialog itself. */
  openAddFilingDialog(page: Page, type: string): Promise<void>;
  navigate(page: Page, route: string): Promise<void>;
  /** The case's filings, in order: id and name only. */
  filings(page: Page): Promise<Array<{ wardId: string; wardName: string }>>;
  activeFilingId(page: Page): Promise<string | null>;
  /** Open a filing; false when the app refused (a lock held elsewhere). */
  openFiling(page: Page, filingId: string): Promise<unknown>;
  /** The launch preference "this browser has opened a case before". */
  hasOpenedCaseBefore(page: Page): Promise<boolean>;
  /** Write the recovery snapshot now; true when it was written. */
  saveRecoverySnapshot(page: Page): Promise<boolean>;
  /** Read the stored recovery snapshot through this build's own decryption (no key: a case saved without a password). */
  readRecoverySnapshot(page: Page): Promise<{ securityMode: string; wards: string[]; guardianKeys: string[] }>;
};

export const currentBuild: AppDriver = {
  openAddFilingDialog: (page, type) => page.evaluate((t) => (window as any).GuardianForms.testing.createFiling.openDialog(t), type),
  navigate: (page, route) => page.evaluate((r) => (window as any).GuardianForms.testing.navigate(r), route),
  filings: (page) => page.evaluate(() => ((window as any).GuardianForms.testing.snapshot().caseFile?.wards || [])
    .map((f: any) => ({ wardId: f.wardId, wardName: f.wardName }))),
  activeFilingId: (page) => page.evaluate(() => (window as any).GuardianForms.testing.snapshot().caseFile?.activeWardId ?? null),
  openFiling: (page, filingId) => page.evaluate((id) => (window as any).GuardianForms.testing.activateFiling.open(id), filingId),
  hasOpenedCaseBefore: (page) => page.evaluate(() => (window as any).GuardianForms.testing.persistenceState.hasOpenedBefore()),
  saveRecoverySnapshot: (page) => page.evaluate(() => (window as any).GuardianForms.testing.recoveryCache.save()),
  readRecoverySnapshot: (page) => page.evaluate(async () => {
    const state = (window as any).GuardianForms.testing.persistenceState;
    const cache = await state.sessionCache();
    const wards = [];
    for (const x of cache.wards) wards.push((await state.decrypt(x.enc)).wardName);
    const guardian = await state.decrypt(cache.guardian);
    return { securityMode: cache.securityMode, wards, guardianKeys: Object.keys(guardian).sort() };
  }),
};
