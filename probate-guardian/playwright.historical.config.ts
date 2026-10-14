// TEST-REVIEW.md Delivery 2 (T6, 2026-10-14): the historical comparisons --
// today the Milestone 70 merge gate's output comparison,
// tests/historical/pre-merge-output.characterization.spec.ts -- run on
// demand against a build pinned on purpose (PG_PREMERGE_SHA, or the spec's
// own default), never as part of `npm test` or the release's `all`: the base
// config's testDir is tests/e2e, so nothing under tests/historical is found
// unless this config is named. The runner's `historical` profile names it
// (scripts/run-e2e-profile.mjs); so does
//   npx playwright test --config=playwright.historical.config.ts
// The spec serves both builds itself (port 4339), so no webServer here.
import base from './playwright.config';

export default {
  ...base,
  testDir: 'tests/historical',
  webServer: undefined,
};
