# Milestone 59: Regression-Suite Integrity, Efficiency, and Runner Governance — Scoping & Execution Proposal

## Status

**Draft — not authorization to implement.** Per `AGENTS.md` §2, nothing in
this proposal may be implemented until the requester explicitly approves the
named delivery. Approval of one delivery authorizes only that delivery.

This proposal was scoped on **2026-09-19** against `master` at `e1228fd` while
other Milestone 57 work and a full Playwright run were active. Before any
delivery starts, sync with `master`, inspect the live diff, and revalidate every
cited test and count. The proposal itself is the only file Milestone 59
scoping adds.

---

## Purpose

Make the regression suite more trustworthy and less expensive without
weakening the independent evidence it provides. The milestone first repairs
tests that can pass without exercising the behavior named in their title,
then removes non-test work from the default discovery path, consolidates
repeated artifact generation and parsing, and finally defines explicit test
command tiers without changing the established meaning of `npm test`.

This is a **test-infrastructure milestone**, not authorization to change filing
rules, court-facing output, persisted data, or application behavior merely to
make a test easier to write. If a repaired test exposes a production defect,
stop and scope that defect separately unless it is already an explicitly
authorized milestone item.

---

## Verified baseline and evidence

The audit that produced this proposal inspected the current `package.json`,
Playwright configuration, profile runner, test index, all top-level unit and
E2E spec files, and the named helper modules. At `e1228fd`:

- `tests/unit/` contains **99** `*.spec.js` files.
- `tests/e2e/` contains **94** `*.spec.ts` files.
- `npx playwright test --list` discovers **671** browser tests.
- `npm test` means `npm run test:unit && npm run test:e2e`; the E2E half is the
  complete source-target Chromium suite.
- `playwright.config.ts` forces `workers: 1`, uses `fullyParallel: false`, and
  records `trace: 'retain-on-failure'`.
- During the concurrently running source suite, the temporary
  `test-results/.playwright-artifacts-0` tree was observed at approximately
  **1.38 GB across 32,299 files**. That is a point-in-time diagnostic, not a
  stable benchmark or a claim about the final retained report size.
- `guide-screenshots.spec.ts` intentionally registers zero tests unless
  `PG_CAPTURE=1`.
- No implementation change is required merely because two tests cover the
  same feature. A unit rule test, browser wiring contract, and final-artifact
  inspection are complementary when each proves a different boundary.

### Confirmed false-confidence cases

| Finding | Verified problem | Delivery |
| --- | --- | --- |
| Annotation toolbar containment | `annotation-toolbar-containment.spec.ts` conditionally asserts toolbar properties only when the queried toolbar exists; the FreeText branch has the same shape, and the sliver query accepts an empty control set. | 59A |
| Landmark coverage | `page-structure.spec.ts` says “all form pages” but checks only the initial route after creating each filing. | 59A |
| Mobile dashboard scrolling | The named test takes screenshots and calls `scrollIntoViewIfNeeded()` but contains no assertion of the claimed mobile behavior. | 59A |
| Single-filing audit filtering | Ward B creation and its audit event are inside `if (wardB)`; if Ward B does not exist, the exclusion assertion passes without establishing anything to exclude. | 59A |
| Type contracts | `expect(Types).toBeDefined()` is redundant with module import, while the local `CaseFile` object test asserts values it assigned itself. `tests/unit/` is outside `tsconfig.json`'s include set, so that JSDoc annotation is not a compile-time contract. | 59A |
| Accounting-period note | `content-corrections.spec.js` copies the production ternary and tests the copy. Production-driven coverage already exists in `schedule-docs-period-key.spec.ts`; the copied tests add false confidence. | 59A |

### Confirmed organization and runtime opportunities

| Finding | Verified evidence | Delivery |
| --- | --- | --- |
| Capture harness in regression tree | `guide-screenshots.spec.ts` is useful tooling but deliberately is not a regression test. | 59B |
| Source audit in Playwright | `skip-classification-audit.spec.ts` uses only Node filesystem operations and no browser fixture. | 59B |
| Uncompared screenshots | `dashboard-visual.spec.ts` writes 15 PNGs during ordinary successful runs and has no `toHaveScreenshot()` baseline. | 59B |
| Repeated immutable exports | The same Annual workbook is generated four times in `excel-defined-names.spec.ts`, the same Simplified workbook about six times in `simplified-part1-identity-cells.spec.ts`, and baseline pruning workbooks are regenerated across sibling tests. | 59C |
| Repeated test parsers | `readAll()` exists independently in nine E2E files; XML/formula readers and PDF xref/content-stream auditors are duplicated as well. | 59C |
| Double PDF loading | `inspectPdf()` calls `extractPdfText()` and `getPdfMetadata()` in parallel, and each performs its own `pdfjsLib.getDocument()`. | 59C |
| Fixed sleeps | Annotation and signature specs contain repeated `waitForTimeout()` calls even where an observable DOM/model condition exists. | 59C |
| Global serialization | All 671 E2E tests run through one worker because concurrent contexts previously overloaded the shared Vite server. The constraint is real history, but has not been re-measured against a safe light/heavy partition. | 59C |
| Runner ambiguity | `npm test` omits `check:types`, `verify:data-model`, builds, distribution profiles, and cross-browser smoke tests; those remain separate commands with no named verification tiers. | 59D |

---

## Delivery index and dependencies

| Delivery | Scope | Risk | Relation |
| --- | --- | --- | --- |
| **59A** | Repair six false-confidence tests | Medium — test failures may reveal real product defects | First |
| **59B** | Move non-regression tooling/audits and remove successful-run screenshot noise | Low | After 59A because both touch `dashboard-visual.spec.ts` and test-index descriptions |
| **59C** | Consolidate artifact generation/parsers; remove avoidable waits; tune trace policy; benchmark parallelism | Medium–high — broad test-infrastructure surface | After 59A/59B |
| **59D** | Add non-overlapping command tiers and document their semantics | Medium — CI/developer workflow contract | Last; consumes the measured suite partition from 59C |

The deliveries are sequential by default. Sub-parts of 59C may be split only
after checking actual file overlap; parser consolidation and artifact caching
touch many of the same Excel/PDF specs.

### Expected file surface

This table is a boundary to re-check before implementation, not permission to
edit early.

| Delivery | Expected files |
| --- | --- |
| 59A | `tests/e2e/annotation-toolbar-containment.spec.ts`; `tests/e2e/highlight-toolbar-style.spec.ts`; `tests/e2e/page-structure.spec.ts`; `tests/e2e/dashboard-visual.spec.ts`; `tests/e2e/dashboard-backup.spec.ts`; `tests/unit/types-contract.spec.js`; a compile-time fixture under `tests/e2e/support/`; `tests/unit/content-corrections.spec.js`; `tests/e2e/schedule-docs-period-key.spec.ts` only if its existing focused assertions need strengthening; `TEST-INDEX.md` |
| 59B | `tests/e2e/guide-screenshots.spec.ts` moved to `tests/capture/guide-screenshots.capture.ts`; a dedicated capture Playwright config/runner; `package.json`; `tests/e2e/skip-classification-audit.spec.ts` moved to `tests/unit/skip-classification-audit.spec.js`; `tests/e2e/dashboard-visual.spec.ts`; `tests/unit/test-index-guard.spec.js` if classification requires it; `TEST-INDEX.md` |
| 59C | `tests/e2e/support/pdf-extract.ts`; `tests/e2e/support/xlsx-extract.ts`; a shared stream/artifact helper; their direct unit specs; the Excel/PDF specs consuming duplicated helpers; annotation/signature specs with fixed waits; `playwright.config.ts`; `TEST-INDEX.md` |
| 59D | `package.json`; `scripts/run-e2e-profile.mjs` or a narrowly scoped tier runner if needed; `AGENTS.md` command reference; `TEST-INDEX.md` only if tests move or are rescoped |

---

## 59A — Test Integrity and False-Confidence Repairs

### A1. Annotation toolbar preconditions

1. Require the selected Highlight editor, its `.editToolbar`, and the expected
   controls to exist and be visible before checking position, size, font, or
   slivers.
2. Require the selected FreeText editor and toolbar to exist and be visible;
   remove the `if (tb)` pass-through.
3. The sliver assertion must not accept an empty toolbar/control set as proof
   of correct rendering.
4. Keep containment and styling as distinct assertions, but share setup rather
   than independently reproducing the same PDF-preview/highlight sequence.

**Red-first proof:** temporarily suppress each toolbar after editor creation.
The repaired test must fail on the missing-toolbar precondition, not pass with
zero inspected controls.

### A2. Landmark coverage across real routes

1. Enumerate the live routes for every filing type, using the same production
   route/menu surface the other form contracts use rather than a second
   hand-maintained route list where practical.
2. Parameterize at least by filing type—preferably by filing type and route—so
   a failure on `/p2` does not hide `/p3`, `/print`, or another filing.
3. On every route, assert one `main#main-content`, one application-navigation
   landmark, an `h1` as the first visible main heading, and no upward heading
   jump greater than one level.
4. Give each generated case a stable test title naming the filing and route.

**Red-first proof:** introduce a temporary heading-level skip on a non-cover
route and show the corresponding parameterized case fails.

### A3. Mobile dashboard contract

Replace the screenshot-only test with assertions against the behavior the
layout actually intends:

- the sidebar is collapsed at the mobile breakpoint;
- the triage row exists and remains within the main content horizontally;
- its actions remain reachable and visible after scrolling into view;
- the document and triage container do not acquire unintended horizontal
  overflow.

If the product does not intend a separately scrollable triage region, rename
the test to the contract it really proves rather than manufacturing a scroll
requirement. Screenshots are not acceptance evidence unless compared to an
approved baseline.

**Red-first proof:** temporarily remove the relevant mobile containment rule
and show a bounding/overflow assertion fails.

### A4. Non-vacuous single-filing audit filtering

1. Assert Ward B was created and has a different ID from Ward A.
2. Write the Ward B event unconditionally after that assertion.
3. Prove the complete case audit contains `WARD_B_EVENT` before building the
   Ward A-only export.
4. Then prove the single-filing archive contains Ward A entries and excludes
   the already-proven Ward B event.

**Red-first proof:** temporarily omit Ward B creation or its event; the new
precondition must fail before the exclusion assertion.

### A5. Real type-contract evidence

1. Delete the redundant `expect(Types).toBeDefined()` case.
2. Delete the local-object assertions that only verify JavaScript assignment.
3. Add a compile-time CaseFile fixture inside the current `tsconfig.json`
   include surface (for example under `tests/e2e/support/`) with:
   - one representative valid CaseFile shape; and
   - narrowly chosen `@ts-expect-error` negative cases for incompatible field
     types, so an accidental loosening also fails compilation.
4. Keep the live `SCHEDULE_SCHEMAS` factory assertions in
   `types-contract.spec.js`; those are runtime behavior, not dead type checks.

**Red-first proof:** give a required typed field an incompatible value and
show `npm run check:types` fails for the intended reason.

### A6. Remove the copied accounting-period rule

Delete the two locally reconstructed `periodNote` tests from
`content-corrections.spec.js`. Production-driven coverage already exists in
`schedule-docs-period-key.spec.ts`, including formatted dates, period changes,
and the blank-period fallback through `renderScheduleDocsSection()` and the
real UI. Strengthen that focused E2E spec only if revalidation finds a branch
the copied tests covered and the production-driven tests do not.

**Red-first proof:** temporarily change the production heading formatter and
show the production-driven test fails while the copied unit test would have
remained green.

### 59A acceptance

- No assertion remains conditional on the existence of the element whose
  existence is part of the contract.
- Every named route receives independent landmark evidence.
- The mobile test contains behavioral assertions and writes no diagnostic-only
  screenshot as its proof.
- Ward B and its event are positively established before exclusion is tested.
- `check:types` owns the CaseFile shape contract; Vitest no longer tests a
  local literal.
- No test carries a second implementation of the accounting-period note.
- `TEST-INDEX.md` accurately describes the revised scopes.

---

## 59B — Suite Reorganization and Noise Reduction

### B1. Isolate the guide capture harness

Move the harness out of `tests/e2e/` to a non-regression pattern such as
`tests/capture/guide-screenshots.capture.ts`. Do not merely rename it and lose
its controlled environment.

Provide a dedicated capture command/config that preserves:

- the built `web` target rather than raw source;
- Chromium;
- 1280×800 viewport and device scale factor 1;
- light theme and stable fixture names;
- the existing state assertions before each capture; and
- the output-directory and JPEG-size expectations.

The ordinary Playwright configuration must not discover the capture file.
`npm run capture:guide` must be the explicit entry point. Because the file is
tooling rather than a regression spec, record it in a capture/tooling section
of `TEST-INDEX.md`; do not leave a stale regression-spec row.

### B2. Move the skip-classification audit to Vitest

Move the pure filesystem audit to `tests/unit/skip-classification-audit.spec.js`
and preserve its rule that direct `test.skip()` calls are forbidden outside
the classified helper module. Update its path handling and allowlist so it
continues scanning every E2E spec. This is an architectural cleanup; do not
claim that it removes a full browser launch, because the current test does not
request Playwright's browser fixtures.

### B3. Remove successful-run screenshot noise

Remove the 15 unconditional screenshots from `dashboard-visual.spec.ts` unless
a specific image is converted to an approved `toHaveScreenshot()` baseline.
Use Playwright trace/failure artifacts for diagnostics. This delivery does not
authorize creating or approving new visual baselines.

### 59B acceptance

- Default `npx playwright test --list` no longer discovers the guide capture
  harness and still discovers every real E2E test.
- `npm run capture:guide` can reproduce the harness under its pinned web-build
  conditions.
- The skip audit runs in Vitest and catches a deliberately inserted bare
  `test.skip()` during red-first verification.
- Passing dashboard visual tests write no unasserted PNGs.
- `TEST-INDEX.md` and its guard pass after every move/rename.

---

## 59C — Runtime Performance, Shared Parsers, and Diagnostics

### C1. Measure before changing

Capture a clean baseline from the same machine and commit:

- unit and E2E test/pass/skip counts;
- wall time for `npm run test:unit` and the complete source E2E suite;
- peak `test-results` size and file count during the E2E run;
- the slowest specs/tests available from Playwright reporting; and
- retry/flaky outcomes.

Do not use the audit's 1.38 GB point-in-time observation as the formal
baseline. Store only the compact measurements, never trace trees or generated
court artifacts.

### C2. Consolidate immutable artifact generation

For sibling assertions that inspect byte-identical output, generate the
artifact once:

- Annual defined-name/formula/custom-view/Part XI inspections;
- Simplified Part I identity/formula/SSN/heading inspections;
- baseline Annual and Guardian blank-page pruning inspections; and
- any PDF inspection group proven to use identical inputs and options.

`test.step()` shares nothing between separate `test()` declarations. Use it
only when related inspections are deliberately combined into one generated
artifact test. Otherwise use a custom worker-scoped fixture that creates and
owns its own browser context and returns immutable bytes. Keep round-trip or
mutation cases separate when they require a live page or different data.

Do not cache across commits, targets, browsers, or differing fixtures. A cache
key that can serve stale output is worse than the current runtime cost.

### C3. Deduplicate and test the parsers

1. Provide one shared readable-stream-to-`Buffer` helper.
2. Extend `xlsx-extract.ts` (or a sibling support module) to own XML entity
   decoding, sheet relationship resolution, formulas, defined names, and raw
   sheet access needed by the current specs.
3. Provide one PDF structural-audit helper for xref offsets and marked-content
   text operators instead of maintaining copies in `pdf-form-specific` and
   `pdf-structure-tags`.
4. Add direct tests for each helper using small fixtures that cover
   self-closing cells, attribute-order variation, shared strings, multiple
   xref subsections where supported, malformed input, and absent parts.
5. Migrate consumers only after the helper tests are green; do not weaken
   their filing-specific assertions during consolidation.

### C4. Load each PDF once per inspection

Refactor `inspectPdf()` so input decoding and `pdfjsLib.getDocument()` happen
once, then derive text and metadata from the same loaded document. Destroy or
clean up the PDF.js document/loading task in `finally` where the API permits.
Update `filing-identity.contract.spec.ts` and other callers that separately
request text and metadata from identical bytes.

### C5. Replace observable fixed waits

Replace `waitForTimeout()` only where there is an observable completion
condition: editor creation/selection, toolbar visibility, highlight SVG
creation, route re-render, model update, or dropdown closure. Preserve a fixed
delay only when the product contract itself is time-based and document why.
The replacement must wait for the actual state, not a new arbitrary timeout.

### C6. Trace policy

Use an explicit policy such as:

- CI: `on-first-retry` while CI retains one retry;
- local default: `off`; and
- local diagnostic opt-in: `retain-on-failure` through a named environment
  switch or script.

Do not describe Playwright trace data as standalone video; no video option is
currently configured. Measure the disk effect after the policy change.

### C7. Parallelism experiment, not assumed outcome

Keep PDF, Excel, service-worker, cross-tab, file-download, and other proven
heavy/shared-resource specs serial. Trial 2–4 workers only for a measured
lightweight UI/DOM project or partition.

No higher worker count becomes the default unless:

- the partition is explicit and maintainable;
- three consecutive complete source runs pass with zero new flakes;
- the shared Vite server shows no overload/timeouts;
- wall time materially improves; and
- failure artifacts remain attributable.

If those gates fail, retain `workers: 1` and record that result; the experiment
is still complete.

### 59C acceptance

- Identical court artifacts are not regenerated for sibling read-only
  inspections.
- Shared parsers have direct tests and no filing-specific assertion is lost.
- `inspectPdf()` performs one PDF.js load for combined text/metadata work.
- Avoidable sleeps are replaced by observable waits.
- Passing local runs do not build gigabyte-scale trace trees by default.
- Before/after measurements quantify wall-time and disk changes.
- Parallelism changes land only if the repeat-run gate passes.

---

## 59D — Runner Tiering and Verification Governance

### Preserve `npm test`

`AGENTS.md` defines `npm test` as the full regression command. It must remain:

```text
all Vitest unit specs + the complete source-target Chromium E2E suite
```

Do not silently turn it into a targeted smoke run.

### Add explicit non-overlapping tiers

1. **`npm run test:quick`** — all fast unit tests plus a documented, measured
   browser smoke set. Initial candidates are `startup.spec.ts`,
   `form-entry.contract.spec.ts`, `routes.spec.ts`, and
   `readiness-card.contract.spec.ts`; retain only files that meet the measured
   quick-run budget established during 59C. This is convenience, not a merge or
   release gate.
2. **`npm test`** — unchanged full unit + complete source Chromium regression.
3. **`npm run test:verify`** — `check:types`, `verify:data-model`, then
   `npm test`.
4. **`npm run test:release`** — `check:types`, `verify:data-model`, the unit
   suite once, then `test:e2e:all-profiles` once. Do **not** compose
   `test:verify` here, because `all-profiles` already runs the complete source
   E2E profile and composing the two would run all 671 source tests twice.

`test:e2e:all-profiles` already builds the web and portable targets in their
own profile steps. Do not prepend a second unconditional `npm run build` unless
the runner is first changed so those builds are no longer duplicated.

### Documentation and failure semantics

- Update the `AGENTS.md` quick-command reference with the new tiers while
  preserving its “ask first” rule for full regression runs.
- Each tier must stop on the first failed prerequisite and return a nonzero
  exit code.
- Keep environment-variable handling cross-platform through Node runners or
  existing npm-script conventions; do not add POSIX-only assignments.
- Document which target/browser each tier runs and which tiers are release
  gates.

### 59D acceptance

- Each command's observed test/profile count matches its documented scope.
- Source Chromium runs exactly once in `test:release`.
- Web and portable builds run exactly once in `test:release` unless an
  explicitly documented cache makes a repeat harmless and necessary.
- `npm test` remains backward-compatible.
- `AGENTS.md`, `package.json`, and the profile runner agree.

---

## Cross-cutting ramifications

### Data model and legacy migration

No persisted field, default, collection size, or enum changes. No
`probate-guardian-data-model.csv` edit or `.sav` migration is expected.
`verify:data-model` is included as a runner prerequisite, not because this
milestone changes the schema.

### Export, import, and portability

The milestone exercises PDF/XLSX and `.sav` paths but must not change their
production semantics. Artifact caching is test-only and must be isolated by
target, browser, fixture, and options. Portable/web profile coverage remains
in the release tier.

### Security and sensitivity

No new user data is stored. Test fixtures remain synthetic. Generated court
artifacts, screenshots, traces, and `.sav` files must stay in ignored temporary
locations and must not be committed. Reduced default tracing decreases the
amount of synthetic filing data retained locally but is not presented as a
security boundary.

### UI/UX and accessibility

No product UI change is authorized. Landmark, mobile-layout, and annotation
tests are strengthened to observe the existing intended UI. A newly exposed
accessibility or layout defect is reported and separately scoped rather than
silently changing production CSS under this milestone.

### Legal/compliance framing

This milestone makes no legal-sufficiency determination. Final-artifact tests
remain valuable because they inspect what would be filed, but test cleanup may
not alter court-form content or filing requirements.

### Test-index governance

Every added, deleted, moved, renamed, or materially rescoped spec requires the
matching `TEST-INDEX.md` change in the same commit. The index guard must be
updated deliberately for the non-regression `.capture.ts` classification; it
must not be weakened so ordinary specs can escape the index.

---

## Verification strategy

Each delivery begins with targeted red-first evidence and ends with the
smallest relevant green set. Suggested minimums:

| Delivery | Targeted verification |
| --- | --- |
| 59A | repaired annotation, page-structure, dashboard-visual, dashboard-backup, schedule-doc-period, type-check, and test-index specs |
| 59B | capture command smoke; moved skip audit; dashboard-visual; test-index guard; `playwright test --list` inventory |
| 59C | direct parser/helper specs; every migrated Excel/PDF consumer; annotation/signature wait-dependent specs; repeated measured source runs for any worker change |
| 59D | invoke each new command tier and record counts; verify the release runner's profile/build sequence without duplicated source execution |

Because 59C and 59D are broad and cross-cutting, recommend a complete
`npm test` run after their targeted checks. Per `AGENTS.md`, do not run that
full regression without the requester's explicit approval at execution time.
The release tier is still a separate, longer authorization.

---

## Out of scope

- Deleting complementary coverage merely because two tests mention the same
  feature.
- Changing filing validators, readiness rules, PDF/XLSX contents, or persisted
  data to satisfy a repaired test.
- Introducing a visual-baseline approval process.
- Making parallel execution mandatory when repeat-run evidence does not
  support it.
- Committing generated PDFs, XLSX files, screenshots, traces, reports, or
  capture output.
- Folding unresolved Milestone 57 or Milestone 58 product work into this test
  cleanup.

---

## Completion criteria

Milestone 59 is complete only when:

1. All six false-confidence findings have non-vacuous, production-connected
   evidence with recorded red-first demonstrations.
2. Capture tooling and filesystem-only audits live in the appropriate runner
   without disappearing from documentation.
3. Successful default runs stop writing uncompared screenshots and
   gigabyte-scale trace trees.
4. Identical immutable artifacts and duplicated parsers are consolidated
   without losing filing-specific assertions.
5. Any parallelism change passes the three-run stability gate—or the measured
   decision to remain serial is recorded.
6. The four command tiers are accurate, cross-platform, non-overlapping, and
   preserve `npm test` semantics.
7. `TEST-INDEX.md`, `AGENTS.md`, package scripts, and runner behavior agree.
8. No product behavior, schema, or legal rule changed under cover of test
   maintenance.

