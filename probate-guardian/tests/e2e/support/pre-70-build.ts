import type { AppDriver } from './app-driver';

// Milestone 70, 70T. A Guardian Forms build from before Milestone 70 has no
// GuardianForms namespace; the only way to drive one is through its own
// window globals. tests/e2e/mixed-version.characterization.spec.ts runs such
// a build beside this tree on purpose, so this file names those globals --
// the one place in the browser suite that does -- and
// tests/baseline/ms70-70T-progress.json exempts it, and only it, from the 70T
// guard with that reason. Nothing but the mixed-version characterization may
// use it. Once production runs a post-70 build, the characterization's old
// side is pinned to one (PG_MIXED_OLD_SHA) and this file goes.
export const pre70Build: AppDriver = {
  openAddFilingDialog: (page, type) => page.evaluate((t) => (window as any).showAddWardModalForType(t), type),
  navigate: (page, route) => page.evaluate((r) => (window as any).navigate(r), route),
  filings: (page) => page.evaluate(() => ((window as any).caseFile?.wards || [])
    .map((f: any) => ({ wardId: f.wardId, wardName: f.wardName }))),
  activeFilingId: (page) => page.evaluate(() => (window as any).caseFile?.activeWardId ?? null),
  openFiling: (page, filingId) => page.evaluate((id) => (window as any).switchWard(id), filingId),
  hasOpenedCaseBefore: (page) => page.evaluate(() => (window as any).hasOpenedCaseBefore()),
  saveRecoverySnapshot: (page) => page.evaluate(() => (window as any).saveSessionRestoreCache()),
  readRecoverySnapshot: (page) => page.evaluate(async () => {
    const w = window as any;
    const cache = await w._sessionCacheGet();
    const wards = [];
    for (const x of cache.wards) wards.push((await w.decryptJSONWithKey(x.enc, null)).wardName);
    const guardian = await w.decryptJSONWithKey(cache.guardian, null);
    return { securityMode: cache.securityMode, wards, guardianKeys: Object.keys(guardian).sort() };
  }),
};
