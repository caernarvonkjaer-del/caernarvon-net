import { fillMinimalValidPlanAnnualWard } from './support/target';
import { registerPlanMountTests } from './support/plan-fixture';

// Plan Annual is the third feature extraction (Milestone 4 of
// INDEX-SPLIT-PLAN.md) -- mirrors plan-simplified-mount.spec.ts's shape.
// No Excel round-trip spec: this filing type has no Excel support at all
// (see the Milestone 4 plan's "Confirmed facts").

registerPlanMountTests({
  featureName: 'Plan Annual',
  filingType: 'planAnnual',
  routes: ['/', '/summary', '/p2', '/p3', '/p4', '/p5', '/p6', '/p7', '/p8', '/p9', '/p10', '/p11', '/print'],
  fillValidWard: fillMinimalValidPlanAnnualWard,
  triggerExport: (page) => page.evaluate(() => (window as any).doSavePdfPlanAnnual()),
  triggerBlockedExport: (page) => page.evaluate(() => (window as any).doSavePdfPlanAnnual()),
  navChecks: [
    { route: '/', key: 'pa-cover' },
    { route: '/p2', key: 'pa-p2' },
    { route: '/p3', key: 'pa-p3' },
    { route: '/p4', key: 'pa-p4' },
    { route: '/p5', key: 'pa-p5' },
    { route: '/p6', key: 'pa-p6' },
    { route: '/p7', key: 'pa-p7' },
    { route: '/p8', key: 'pa-p8' },
    { route: '/p9', key: 'pa-p9' },
    { route: '/p10', key: 'pa-p10' },
    { route: '/p11', key: 'pa-p11' },
  ],
});
