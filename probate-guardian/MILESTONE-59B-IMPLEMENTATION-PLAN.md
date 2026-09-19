# Milestone 59B Implementation Plan: Suite Reorganization and Noise Reduction

## Status and authorization

**Executed. 59B landed 2026-09-19 as `afb5069`**, on top of 59A at `224f8b4`.
This document is now a record of what was planned and carried out, not a
pending work order. Everything below is left as written at planning time; the
corrections that verification produced are listed here rather than edited into
the plan, so the difference between what was expected and what was found stays
readable.

Three follow-up commits belong to this delivery:

| Commit | Correction |
| --- | --- |
| `af031c6` | A stalled capture run now ends and reports what was held. The `process.exit(0)` this plan's runner section produced was recorded in `walkthrough.md` as the fix for such a stall; it is not one, and the `reuseExistingServer` diagnosis offered with it was falsified by recreating that state. |
| `8d87482` | Tracks this plan and `MILESTONE-59-PROPOSAL.md`, which the delivery left untracked, and corrects the `walkthrough.md` note in place. |
| `cb63898` | Fixes a defect in this plan's own design decision 3 — see below. |

**Design decision 3 was wrong as written.** It states that "because the runner
sets the target before the config process starts, the inherited `baseURL` and
web server will point at `dist/web`." That holds only when the harness is
invoked through `npm run capture:guide`. Invoked the way this plan's own
verification sequence does it —
`npx playwright test --config=playwright.capture.config.ts` — `PG_TARGET` is
unset, `playwright.config.ts` falls back to `source`, and the harness captured
raw source served off disk while reporting three passing tests and writing
seven correctly named files. `tests/capture/pin-web-target.ts` now pins the
target in the config itself, so the pinned capture table holds however the
harness is invoked.

This plan was refreshed on 2026-09-19 against `master` at `224f8b4`. Counts and
line numbers throughout remain evidence from planning time, not current values.

## Outcome

59B separates intentional screenshot-generation tooling from the regression
suite, moves a filesystem-only policy audit to the unit-test runner that fits
it, and stops successful dashboard tests from writing unverified screenshots.
It does not change application behavior, filing rules, court output, persisted
data, or visual styling.

## Resolved design decisions

1. The guide capture harness will live at
   `tests/capture/guide-screenshots.capture.ts`. It will not use a `.spec.ts`
   suffix and will be outside the default `tests/e2e` Playwright `testDir`.
2. `npm run capture:guide` will be the only documented entry point. A small
   cross-platform Node runner will build `dist/web`, set `PG_TARGET=web` and
   `PG_BROWSER=chromium` for its child process, and invoke a dedicated
   Playwright config. Do not add POSIX-only environment assignments to
   `package.json`.
3. `playwright.capture.config.ts` will import and narrowly override the normal
   Playwright configuration. Because the runner sets the target before the
   config process starts, the inherited `baseURL` and web server will point at
   `dist/web`. The capture config will replace only discovery and the pinned
   capture conditions; it must not become a second independent copy of browser
   path, server, timeout, or reporter logic.
4. Moving the capture file removes the `PG_CAPTURE` registration trick. The
   dedicated config discovers the capture cases normally; the ordinary config
   cannot discover them.
5. The skip-classification audit will become a Vitest spec. Its scanner still
   inspects Playwright E2E source; only its runner changes.
6. No screenshot in `dashboard-visual.spec.ts` will be converted to a visual
   baseline in this delivery. That would require a separate baseline-review
   policy. Existing behavioral assertions remain the evidence.

## Dependency gate and preflight

Before editing:

1. Confirm 59A is committed and inspect its actual diff, especially
   `dashboard-visual.spec.ts`, `TEST-INDEX.md`, and
   `tests/unit/test-index-guard.spec.js`.
2. Record `git status --short` and do not include unrelated collaborator
   changes in the 59B commit.
3. Run `npx playwright test --list` and record the post-59A default test count.
   Confirm no title beginning `capture:` or `probe:` appears. The current
   harness registers zero tests unless `PG_CAPTURE=1`, so preserving the count
   is the discovery invariant; merely observing no title is not evidence that
   the old file was never scanned.
4. Run the post-59A dashboard visual spec and index guard once before editing.
   Any existing failure is a prerequisite problem, not a 59B regression to
   absorb.

## B1. Isolate the guide capture harness

### File operations

- Move `tests/e2e/guide-screenshots.spec.ts` to
  `tests/capture/guide-screenshots.capture.ts` with history preserved.
- Add `playwright.capture.config.ts`.
- Add `scripts/run-guide-capture.mjs`.
- Add `capture:guide` to `package.json`:

  ```json
  "capture:guide": "node scripts/run-guide-capture.mjs"
  ```

- No dependency or lockfile change is expected.

### Capture-file changes

1. Change the support import to `../e2e/support/target`.
2. Remove `CAPTURING`, the conditional `capture` alias, and the surrounding
   `if (CAPTURING)` block. Use ordinary `test`, `test.use`, and `test.beforeAll`
   calls because only the dedicated config can discover this file.
3. Preserve these pinned conditions:
   - built `web` target;
   - Chromium;
   - 1280 × 800 viewport;
   - device scale factor 1;
   - light color scheme;
   - ward name `Eleanor Marie Whitfield`;
   - existing output names and JPEG quality settings; and
   - `PG_CAPTURE_DIR`, defaulting to the already-ignored `.guide-shots`.
4. Preserve the state checks that prevent captures of the wrong UI: two
   signature tabs, Report a Bug visibility, resources-panel visibility, Help
   panel visibility and label, dismissed PWA toast, and the blocked-preview
   shell-action probe.
5. Remove the canvas `if (box)` pass-through. Require the canvas to be visible
   and its bounding box to be non-null before drawing; a missing drawing surface
   must fail rather than produce a plausible but false “applied” image.
6. After capture, verify the exact expected output inventory exists:
   - `signature-draw.jpg`
   - `signature-applied.jpg`
   - `dashboard.jpg`
   - `resources.jpg`
   - `help-panel.jpg`
   - `preview-blocked.jpg`
   - `blocked-preview-probe.json`
7. For every generated JPEG, assert a nonzero size no greater than 150 KiB.
   If an image exceeds the limit, adjust only its JPEG quality or capture crop
   deliberately and visually inspect the result; do not weaken or delete the
   size rule. Do not delete unrelated files from a user-supplied
   `PG_CAPTURE_DIR`.

### Dedicated configuration

`playwright.capture.config.ts` should import the default config from
`playwright.config.ts` and use `defineConfig` to override:

- `testDir: 'tests/capture'`;
- `testMatch: '**/*.capture.ts'`;
- `fullyParallel: false`, `workers: 1`, and `retries: 0`;
- a list reporter; and
- capture `use` values for viewport, device scale factor, and light color
  scheme while retaining the inherited web `baseURL`, tracing choice, server,
  Chromium project, and executable-path resolution.

Do not broaden the ordinary Playwright `testDir` or add the capture directory
to the normal suite's match patterns.

### Cross-platform runner

`scripts/run-guide-capture.mjs` should follow the spawning pattern already used
by `scripts/run-e2e-profile.mjs`:

1. resolve the repository root from `import.meta.url`;
2. run `npm run build:web` and stop on failure;
3. spawn `npx playwright test --config=playwright.capture.config.ts` with
   inherited environment plus `PG_TARGET=web` and `PG_BROWSER=chromium`;
4. preserve `PG_CAPTURE_DIR` if the caller supplied it; and
5. propagate a nonzero child exit code.

The runner must not set or require `PG_CAPTURE`; that gate no longer exists.

### B1 proof

- Before implementation, `npm run capture:guide` does not exist.
- After the move, ordinary `npx playwright test --list` retains the exact
  post-59A count and contains no capture/probe titles.
- `npx playwright test --config=playwright.capture.config.ts --list` discovers
  exactly three cases: the two capture workflows and the blocked-preview
  probe.
- `npm run capture:guide` builds the web target, runs those three cases, and
  produces the verified seven-file inventory without placing outputs in Git.

## B2. Move the skip-classification audit to Vitest

### File operations and conversion

- Move `tests/e2e/skip-classification-audit.spec.ts` to
  `tests/unit/skip-classification-audit.spec.js` with history preserved.
- Replace `@playwright/test` imports with Vitest imports.
- Remove TypeScript-only syntax while preserving `withoutJsComments()` and the
  current source-scanning semantics.
- Resolve the repository root from `import.meta.url`, then scan
  `tests/e2e/*.spec.ts`. The scan target remains the E2E suite even though the
  audit itself moves to `tests/unit`.
- Remove the self-allowlist entry. Once the audit is outside `tests/e2e`, it is
  not among the files being scanned, and comments in the scanned files are
  already stripped. Do not replace it with a general exemption.
- Update the introductory cross-reference in
  `tests/unit/test-index-guard.spec.js` so it names the audit's new path. No
  discovery-rule change should be necessary: that guard already enumerates
  top-level unit `.spec.js` and E2E `.spec.ts` files.

### B2 red-first proof

Temporarily add a uniquely named E2E spec containing a real bare
`test.skip(...)` call, run only the moved Vitest audit, and confirm the failure
names that file. Remove the temporary file, rerun the audit, and confirm green.
Do not use a comment or string as the fault injection because the audit is
specifically designed to ignore those.

Also confirm one representative classified helper call remains accepted. Do
not weaken the regex or add an allowlist entry to make the injected violation
pass.

## B3. Remove successful-run dashboard screenshot noise

After 59A lands, re-read the final `dashboard-visual.spec.ts`; do not apply a
precomputed patch to the in-flight version.

1. Remove every unconditional `page.screenshot()` call from the file. The
   post-59A source contains one call inside the twelve-case viewport/theme
   matrix, one desktop screenshot, and one mobile screenshot—14 generated
   PNGs per successful run. Milestone 59A removed the second mobile capture.
   The acceptance test is zero calls, not a stale line or count.
2. Remove `testInfo` parameters that become unused.
3. Preserve all behavioral assertions added or strengthened by 59A, including
   the mobile geometry, visibility, hit-testing, overflow, landmark, and
   alignment contracts.
4. Do not add `toHaveScreenshot()`, commit snapshots, or change production CSS.
5. Confirm a successful targeted run creates no PNG beneath that test's output
   directory. Normal failure traces/screenshots produced by Playwright policy
   are diagnostic artifacts and are outside B3.

## B4. Test-index and documentation synchronization

Update `TEST-INDEX.md` in the same commit:

1. remove `guide-screenshots.spec.ts` from the E2E-spec table;
2. add a dedicated `tests/capture` tooling section for
   `guide-screenshots.capture.ts`, documenting the explicit command, pinned
   web/Chromium conditions, seven outputs, state assertions, and 150 KiB JPEG
   ceiling;
3. move `skip-classification-audit.spec.ts` from the E2E table/category to the
   unit-spec table as `skip-classification-audit.spec.js`, while keeping its
   policy description accurate;
4. update the `dashboard-visual.spec.ts` description to state that its evidence
   is behavioral and successful runs intentionally write no screenshots; and
5. retain the 59A descriptions exactly where they remain accurate—do not
   overwrite concurrent detail with an older summary.

The index guard does not need to treat `.capture.ts` as a regression spec. Its
purpose is to enforce one row for each runnable unit/E2E spec; the capture file
is documented separately as tooling.

## Exact expected file surface

| Operation | File |
| --- | --- |
| Move | `tests/e2e/guide-screenshots.spec.ts` → `tests/capture/guide-screenshots.capture.ts` |
| Add | `playwright.capture.config.ts` |
| Add | `scripts/run-guide-capture.mjs` |
| Modify | `package.json` |
| Move/convert | `tests/e2e/skip-classification-audit.spec.ts` → `tests/unit/skip-classification-audit.spec.js` |
| Modify | `tests/e2e/dashboard-visual.spec.ts` |
| Modify | `tests/unit/test-index-guard.spec.js` |
| Modify | `TEST-INDEX.md` |

No production file, data-model file, lockfile, user-guide asset, generated
image, build output, Playwright report, or test-results artifact belongs in the
59B commit.

## Verification sequence

Run in this order:

```text
# Static inventory and moved audit
npx vitest run tests/unit/skip-classification-audit.spec.js tests/unit/test-index-guard.spec.js

# Dashboard behavior after screenshot removal
npx playwright test tests/e2e/dashboard-visual.spec.ts

# Normal-vs-capture discovery boundary
npx playwright test --list
npx playwright test --config=playwright.capture.config.ts --list

# Real capture smoke; includes build:web
npm run capture:guide

# Preserve the repository's existing typed-source baseline
npm run check:types

# Patch hygiene
git diff --check
git status --short
```

Additionally:

- compare the ordinary Playwright list count with the recorded post-59A count;
- confirm the dedicated list contains exactly three cases;
- inspect all six JPEGs for correct visible state and readability;
- verify all six JPEG sizes are `1..153600` bytes;
- inspect `blocked-preview-probe.json` for the expected four keys;
- treat the dedicated Playwright list and capture runs as the compile/load
  checks for `playwright.capture.config.ts` and the `.capture.ts` file, because
  the repository's current `tsconfig.json` does not include `tests/capture` or
  root-level Playwright config files;
- confirm `.guide-shots`, `dist`, `test-results`, and `playwright-report` remain
  ignored and absent from the staged diff; and
- inspect the staged diff by file before committing.

The targeted suite is proportionate for 59B. A full `npm test` is not required
by this delivery unless the implementation expands beyond the file surface or
the discovery/count checks expose an unexpected runner change. If that occurs,
recommend the full regression and obtain explicit approval before running it.

## Acceptance criteria

59B is complete only when:

1. 59A is landed and no 59A change was overwritten.
2. The default Playwright test count is unchanged from the post-59A baseline,
   with no capture/probe titles in ordinary discovery.
3. The dedicated capture config discovers exactly three cases and
   `npm run capture:guide` succeeds against a freshly built `dist/web` in
   Chromium at the pinned viewport/theme.
4. The capture run produces the exact seven expected files; every JPEG is
   readable, nonempty, and at most 150 KiB.
5. The skip-classification audit runs under Vitest and the temporary bare-skip
   fault injection proves it fails for the intended reason.
6. No broad skip allowlist or weakened scan is introduced.
7. `dashboard-visual.spec.ts` contains no screenshot call, retains its 59A
   behavioral assertions, passes, and writes no PNG on success.
8. `TEST-INDEX.md` has no stale old-path rows and accurately separates unit,
   E2E, and capture-tooling responsibilities.
9. Only the expected 59B files are staged; no generated artifact is committed.

## Cross-cutting and out-of-scope checks

- **Data model / migration:** none. Do not edit
  `probate-guardian-data-model.csv`; no `.sav` shape changes.
- **Export/import/portability:** the capture harness deliberately exercises a
  fresh web build, but 59B does not change production packaging or output.
- **Security:** all fixture data remains synthetic. Capture output stays in an
  ignored local directory and is not a security boundary.
- **UI/accessibility/legal:** no product UI, accessibility behavior, validation
  rule, or legal content change is authorized. If the stronger capture state
  checks or preserved dashboard assertions reveal a product defect, stop and
  scope it separately.
- **59C boundaries:** do not replace fixed waits, change trace policy,
  consolidate parsers/artifacts, or alter Playwright worker counts here.
- **59D boundaries:** do not add general quick/verify/release test tiers here;
  `capture:guide` is a tooling command, not a regression tier.
