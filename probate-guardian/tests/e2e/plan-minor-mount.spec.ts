import { fillMinimalValidPlanMinorWard } from './support/target';
import { registerPlanMountTests } from './support/plan-fixture';

// Plan Minor is the fifth and last feature extraction (Milestone 6 of
// INDEX-SPLIT-PLAN.md) -- mirrors plan-initial-mount.spec.ts's shape.
// No Excel round-trip spec: this filing type has no Excel support at all
// (see the Milestone 6 plan's "Confirmed facts").

registerPlanMountTests({
  featureName: 'Plan Minor',
  filingType: 'planMinor',
  routes: ['/', '/summary', '/p2', '/p3', '/p4', '/p5', '/p6', '/p7', '/print'],
  fillValidWard: fillMinimalValidPlanMinorWard,
  triggerExport: (page) => page.evaluate(() => (window as any).doSavePdfPlanMinor()),
  triggerBlockedExport: (page) => page.evaluate(() => (window as any).doSavePdfPlanMinor()),
  // The guardian sibling ward created alongside the Plan Minor filing in the
  // remount-cycling test needs its own mount to settle before the switch
  // loop starts, or the first switchWard() races the guardian feature's
  // Excel-import wiring.
  waitForReady: (page) => page.locator('[data-inventory-change="import-excel"]').waitFor({ state: 'attached' }),
  navChecks: [
    { route: '/', key: 'pm-cover' },
    { route: '/p2', key: 'pm-p2' },
    { route: '/p3', key: 'pm-p3' },
    { route: '/p4', key: 'pm-p4' },
    { route: '/p5', key: 'pm-p5' },
    { route: '/p6', key: 'pm-p6' },
    { route: '/p7', key: 'pm-p7' },
  ],
});
