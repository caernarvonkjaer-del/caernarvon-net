// Milestone 59B follow-up. Side-effect module with no exports: it exists to
// run one assignment before playwright.config.ts is evaluated.
//
// What went wrong without it: `npx playwright test --config=playwright.capture.config.ts`
// -- the form the 59B plan's own verification sequence uses -- captured the
// `source` target instead of the built `dist/web`, and reported three passing
// tests while doing it. The seven output files appeared with the right names
// and plausible contents, so nothing on screen said the guide's figures had
// been shot against raw source served off disk rather than the bundle a filer
// actually receives. Confirmed by watching the bound port: a direct run bound
// 4321 (source), never 4173 (web).
//
// Why it has to be a separate module: playwright.config.ts resolves `target`,
// `baseURL` and `webServer` from process.env.PG_TARGET at module-evaluation
// time. ESM hoists imports and evaluates them in source order, so an
// assignment written in the body of playwright.capture.config.ts would run
// AFTER the base config had already chosen its target. Importing this first is
// the last point where the value can still be set.
//
// tests/e2e/support/target-profile.ts reads the same variable inside each
// worker process. Workers are spawned after the config is loaded, so they
// inherit what is pinned here.
//
// The capture table in guide-screenshots.capture.ts pins both of these values,
// naming `web` explicitly as "NOT the `source` target".
const PINNED = { PG_TARGET: 'web', PG_BROWSER: 'chromium' };

for (const [name, required] of Object.entries(PINNED)) {
  const supplied = process.env[name];
  // A conflicting value is an error rather than something to silently
  // override: someone who exported PG_TARGET=portable and ran the capture
  // harness meant something, and quietly ignoring it is how the original
  // defect read to anyone looking at the output.
  if (supplied && supplied !== required) {
    throw new Error(
      `The guide capture harness is pinned to ${name}=${required}, but ${name}=${supplied} was set. `
      + 'The captured figures must match the build filers receive; re-run with `npm run capture:guide`, '
      + `or unset ${name}.`,
    );
  }
  process.env[name] = required;
}

export {};
