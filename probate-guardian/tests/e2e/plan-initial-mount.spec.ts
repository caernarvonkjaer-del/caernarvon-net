import { fillMinimalValidPlanInitialWard } from './support/target';
import { registerPlanMountTests } from './support/plan-fixture';

// Plan Initial is the fourth feature extraction (Milestone 5 of
// INDEX-SPLIT-PLAN.md) -- mirrors plan-annual-mount.spec.ts's shape.
// No Excel round-trip spec: this filing type has no Excel support at all
// (see the Milestone 5 plan's "Confirmed facts").

registerPlanMountTests({
  featureName: 'Plan Initial',
  filingType: 'planInitial',
  routes: ['/', '/summary', '/p2', '/p3', '/p4', '/p5', '/p6', '/p7', '/p8', '/p9', '/p10', '/print'],
  fillValidWard: fillMinimalValidPlanInitialWard,
  triggerExport: (page) => page.evaluate(() => (window as any).doSavePdfPlanInitial()),
  triggerBlockedExport: (page) => page.evaluate(() => (window as any).doSavePdfPlanInitial()),
  navChecks: [
    { route: '/', key: 'pi-cover' },
    { route: '/p2', key: 'pi-p2' },
    { route: '/p3', key: 'pi-p3' },
    { route: '/p4', key: 'pi-p4' },
    { route: '/p5', key: 'pi-p5' },
    { route: '/p6', key: 'pi-p6' },
    { route: '/p7', key: 'pi-p7' },
    { route: '/p8', key: 'pi-p8' },
    { route: '/p9', key: 'pi-p9' },
    { route: '/p10', key: 'pi-p10' },
  ],
});
