import { defineConfig } from 'vitest/config';

// Unit tests only -- tests/e2e/ is Playwright's (@playwright/test globals
// conflict with vitest's). Milestone 1 has zero unit specs by design: there
// is nothing importable to unit-test until Milestone 2+ extracts code out
// of index.html's single inline script. tests/unit/ doesn't exist yet and
// that's expected; this config just keeps `npm run test:unit` from trying
// to run the e2e specs and failing on the import mismatch.
export default defineConfig({
  test: {
    include: ['tests/unit/**/*.spec.ts'],
    passWithNoTests: true, // expected to be empty through Milestone 1 -- see comment above
  },
});
