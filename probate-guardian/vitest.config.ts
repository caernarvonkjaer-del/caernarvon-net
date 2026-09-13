import { defineConfig } from 'vitest/config';

// Unit tests only -- tests/e2e/ is Playwright's (@playwright/test globals
// conflict with vitest's), so the include glob must never widen to it.
// tests/unit/ holds the Vitest specs (see TEST-INDEX.md); a run that
// discovers zero of them is a broken glob, not an empty suite, and must
// fail loudly rather than pass.
export default defineConfig({
  test: {
    include: ['tests/unit/**/*.spec.{js,ts}'],
    passWithNoTests: false,
  },
});
