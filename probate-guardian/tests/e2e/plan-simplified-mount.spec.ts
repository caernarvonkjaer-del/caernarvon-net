import { fillMinimalValidPlanSimplifiedWard } from './support/target';
import { registerPlanMountTests } from './support/plan-fixture';

// Plan Simplified is the second feature extraction (Milestone 3 of
// INDEX-SPLIT-PLAN.md) -- mirrors simplified-mount.spec.ts's shape, since
// this is the module whose mount()/dispose()/dynamic-import wiring proves
// the generalized src/core/feature-bridge.js factory (Milestone 3, Phase A)
// against a second real feature. No Excel round-trip spec: this filing type
// has no Excel support at all (see the Milestone 3 plan's "Confirmed facts").

registerPlanMountTests({
  featureName: 'Plan Simplified',
  filingType: 'planSimplified',
  routes: ['/', '/summary', '/p2', '/p3', '/print'],
  fillValidWard: fillMinimalValidPlanSimplifiedWard,
  triggerExport: (page) => page.locator('[data-plan-simplified-action="save-pdf"]').click(),
  // Unlike the other three plan types, Plan Simplified's export button is
  // driven by disabled/enabled state rather than an alert-only guard -- an
  // incomplete filing leaves the button disabled, so exercising the blocked
  // path has to force it enabled before clicking, not just trigger the click.
  triggerBlockedExport: (page) => page.locator('[data-plan-simplified-action="save-pdf"]').evaluate((button: HTMLButtonElement) => {
    button.disabled = false;
    button.click();
  }),
  navChecks: [
    { route: '/', key: 'ps-cover' },
    { route: '/p2', key: 'ps-p2' },
    { route: '/p3', key: 'ps-p3' },
  ],
});
