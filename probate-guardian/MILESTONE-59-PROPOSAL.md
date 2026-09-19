# Milestone 59: Regression-Suite Integrity, Efficiency, and Runner Governance — Scoping & Execution Proposal

## Status

**59A and 59B landed 2026-09-19. 59C and 59D are not authorized and have not
been started.** Each was approved by name in the session that executed it;
this block records what landed, not the approval exchange.

| Delivery | Commit | Verification |
| --- | --- | --- |
| 59A | `224f8b4` | red-first fault injection on every repaired assertion; `check:types` 0 errors; unit 99 files / 1151 tests; targeted e2e 49 passed |
| 59B | `afb5069` | ordinary discovery 678 tests in 93 files with no capture/probe titles; capture discovery 3 in 1 file; unit guards 3 passed; `check:types` 0; dashboard-visual 17 passed writing 0 PNGs; capture smoke 3 passed with the 7 expected outputs |

Three follow-up commits correct defects found while verifying 59B, and are
part of its delivery rather than separate work:

| Commit | What it corrects |
| --- | --- |
| `af031c6` | A capture run that stalls now ends and reports what was held. The `process.exit(0)` recorded in `walkthrough.md` as the fix for that stall is not one, and the `reuseExistingServer` diagnosis offered with it was falsified by experiment. |
| `8d87482` | Tracks this document and the 59B plan, which were left untracked, and corrects the `walkthrough.md` note above in place. |
| `cb63898` | `playwright.capture.config.ts` did not pin its own target: run directly rather than through `npm run capture:guide`, it captured the `source` target while reporting three passing tests and writing seven correctly named files. |

**59A carried one production line.** `src/legacy-app.js`'s `planQ()` emits its
question title as `h2` instead of `h3`, closing the heading-level jump A2's
landmark contract tests for. The inline styling is unchanged, so nothing on
the Plan pages looks different — a filer sees the same question title at the
same size; only the heading level a screen reader announces changed. It is
recorded here because this milestone's own Purpose forbids changing
application behavior to make a test pass, and a production edit inside a
test-integrity milestone should be visible rather than buried in a diff.

**59C was split into 59C-0 … 59C-4 on 2026-09-19** after review, and a seventh
false-confidence case was found during that review — `pdf-structure-tags.spec.ts`'s
xref audit, which has never validated an offset. It is 59C-0 and is a
prerequisite for 59C-2. See the 59C section.

**59C and 59D remain subject to the original gate:** per `AGENTS.md` §3,
neither may be implemented until the requester explicitly approves that named
delivery, and approval of one delivery authorizes only that delivery. Before
either starts, sync with `master`, inspect the live diff, and revalidate every
count cited below — the baseline in the next section was measured at `e1228fd`
and 59A/59B have since changed it.

This proposal was scoped on **2026-09-19** against `master` at `e1228fd` while
other Milestone 57 work and a full Playwright run were active.

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
| PDF xref audit | Found 2026-09-19, after 59A closed. `pdf-structure-tags.spec.ts` locates the xref table with `lastIndexOf('xref')`, which matches the `xref` inside `startxref` — positioned after the trailer, so the slice runs backwards and is empty. The validation loop never executes and the assertion passes unconditionally. Measured: `sectionLen: 0`. | 59C-0 |

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
| **59C** | Split into 59C-0 … 59C-4; see the 59C section for the per-sub-delivery table | Low to Medium–high, per sub-delivery | After 59A/59B; the sub-deliveries are otherwise independent of each other except 59C-2 (needs 59C-0) and 59C-4 (needs 59C-1) |
| **59D** | Add non-overlapping command tiers and document their semantics | Medium — CI/developer workflow contract | Last; consumes the measured suite partition from **59C-4** specifically, not all of 59C |

59A and 59B have landed; see **Status** above for their commits. 59C and 59D
are unauthorized, so the "Relation" column below describes the remaining
sequence, not work in progress.

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
| 59C-0 | `tests/e2e/pdf-structure-tags.spec.ts` |
| 59C-1 | `playwright.config.ts`; `tests/baseline/milestone-59-runtime.json` |
| 59C-2 | `tests/e2e/support/pdf-extract.ts`; `tests/e2e/support/xlsx-extract.ts`; a shared stream/artifact helper; their direct unit specs; the Excel/PDF specs consuming duplicated helpers; `TEST-INDEX.md` |
| 59C-3 | `tests/e2e/signature-capture.contract.spec.ts` first, then the remaining wait-dependent annotation specs |
| 59C-4 | `playwright.config.ts`; a project partition if one is adopted |
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

**Split into five independently approvable deliveries (2026-09-19).** As
originally written, 59C bundled artifact caching, parser consolidation, PDF
loading, fixed waits, trace policy, and a parallelism experiment under one
risk rating and one acceptance list. Those have different file surfaces and
very different risk: the runner-policy work touches `playwright.config.ts` and
nothing else, while the parser work touches most of the Excel and PDF specs.
Bundling them delayed the cheap, low-risk half behind the expensive half for
no reason. Each sub-delivery below is approved and executed on its own.

| Sub-delivery | Scope | Risk | File surface | Depends on |
| --- | --- | --- | --- | --- |
| **59C-0** | Repair the vacuous xref audit | Low | `tests/e2e/pdf-structure-tags.spec.ts` | — |
| **59C-1** | Baseline measurement + trace policy (C1, C6) | Low | `playwright.config.ts`; one committed measurements file | — |
| **59C-2** | Artifact reuse, shared parsers, single PDF load (C2, C3, C4) | Medium–high | `tests/e2e/support/*`, the Excel/PDF specs consuming them | 59C-0 |
| **59C-3** | Replace observable fixed waits (C5) | Medium | signature + annotation specs | — |
| **59C-4** | Parallelism experiment (C7) | Medium | `playwright.config.ts`, possibly a project partition | 59C-1 |

59C-0, 59C-1 and 59C-3 have no file overlap with each other and may run in any
order, or concurrently across agents. 59C-2 must not start before 59C-0 — see
below. 59C-4 needs 59C-1's baseline to have anything to compare against.

The C1–C7 sections below keep their original numbering and sequence so that
existing cross-references still resolve; each heading names the sub-delivery it
belongs to. Two consequences: 59C-1 appears twice (C1 and C6) and 59C-2 three
times (C2, C3, C4), and the sub-delivery numbers therefore do not read in order
down the page. The table above is the authoritative grouping.

### 59C-0. Repair the xref audit before consolidating anything onto it

**This is a false-confidence repair of the kind 59A was created for, found
after 59A closed. It is a prerequisite for 59C-2, not part of it.**

`tests/e2e/pdf-structure-tags.spec.ts` claims to verify that "every xref offset
must point to exact object header." It verifies nothing. It locates the table
with:

```js
const xrefIndex = rawPdfString.lastIndexOf('xref');
const trailerIndex = rawPdfString.lastIndexOf('trailer');
const xrefSection = rawPdfString.slice(xrefIndex, trailerIndex);
```

`lastIndexOf('xref')` matches the `xref` inside the word `startxref`, which in
a generated PDF sits *after* the trailer. The slice therefore runs backwards
and returns empty. Measured on a real run of this spec:

```text
XREF_PROBE {"xrefIndex":172522,"trailerIndex":172387,"sectionLen":0,"lineCount":1}
```

An empty section yields one empty line; the validation loop starts at `i = 2`
and never executes; `xrefErrors` is always `[]`; and `expect(xrefErrors)
.toEqual([])` passes unconditionally. A corrupt xref table in a filed court
PDF would not be caught by the test whose stated job is to catch it.

`tests/e2e/pdf-form-specific.spec.ts` does it correctly — it follows the
`startxref` pointer and asserts that the pointer lands on `xref`. That is the
implementation to keep.

**Why it must land before 59C-2:** C3 proposes replacing both copies with one
shared PDF structural-audit helper. Do that first and one of two things
happens — the broken copy is silently repaired by a refactor scoped as
cleanup, leaving no record that xref integrity went unverified, or the dead
implementation is chosen as the shared base and its vacuity is propagated to
every caller behind a helper that looks authoritative. Repair it first, with
its own red-first evidence, so the consolidation is a genuine no-op.

**Red-first proof:** corrupt one xref offset in the generated PDF (or assert
against a fixture with a known-bad offset). The repaired check must fail
naming the object whose offset is wrong. The current check cannot fail at all,
so confirm it passes against that same corrupted input *before* the repair —
that is the evidence the test was vacuous rather than merely untested.

### 59C-1 / C1. Measure before changing

Capture a clean baseline from the same machine and commit:

- unit and E2E test/pass/skip counts;
- wall time for `npm run test:unit` and the complete source E2E suite;
- peak `test-results` size and file count during the E2E run;
- the slowest specs/tests available from Playwright reporting; and
- retry/flaky outcomes.

Do not use the audit's 1.38 GB point-in-time observation as the formal
baseline. Store only the compact measurements, never trace trees or generated
court artifacts.

**Commit them to `tests/baseline/milestone-59-runtime.json`**, beside the
existing `tests/baseline/milestone-13-*.json` files. The original text said
"commit" without naming a destination, which leaves the executing agent to
invent one or to record the numbers only in a commit message, where 59C-4
cannot read them back.

### 59C-2 / C2. Consolidate immutable artifact generation

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

**Accept the isolation cost explicitly.** Sharing one generated workbook
across four tests means a single generation failure fails all four as a block
rather than one, and the per-test independence that makes a failure easy to
localize is gone. That is judged an acceptable trade for the four regenerations
it removes, but it is a decision, not a side effect: if a shared-artifact group
starts failing as a unit and the cause is hard to attribute, split it back.

Verified call counts at the time of the split (each is a separate `test()`
re-running the same export helper): `exportAnnual()` ×4 in
`excel-defined-names.spec.ts`, `exportSimplified()` ×6 in
`simplified-part1-identity-cells.spec.ts`, ×4 in
`excel-blank-page-pruning.spec.ts`, ×6 in `guardian-blank-page-pruning.spec.ts`.
Counting `waitForEvent('download')` instead gives a much lower number and is
wrong — the download happens inside the helper.

### 59C-2 / C3. Deduplicate and test the parsers

1. Provide one shared readable-stream-to-`Buffer` helper.
2. Extend `xlsx-extract.ts` (or a sibling support module) to own XML entity
   decoding, sheet relationship resolution, formulas, defined names, and raw
   sheet access needed by the current specs.
3. Provide one PDF structural-audit helper for xref offsets and marked-content
   text operators instead of maintaining copies in `pdf-form-specific` and
   `pdf-structure-tags`. **Requires 59C-0 first.** The two copies are not
   equivalent: `pdf-structure-tags`'s xref check is vacuous and must be
   repaired on its own before either is used as the basis for a shared helper.
   Build the helper from `pdf-form-specific`'s implementation, which follows
   the `startxref` pointer.

   `readAll()` is genuinely nine independent copies of the same
   stream-to-`Buffer` helper (`excel-b4-multi-account`, `excel-blank-page-pruning`,
   `excel-defined-names`, `excel-form-field-placement`, `excel-pruned-roundtrip`,
   `filing-identity.contract`, `guardian-blank-page-pruning`,
   `output-semantics.artifact`, `simplified-part1-identity-cells`) with nothing
   in `support/`. That one is a true duplicate and consolidating it carries no
   behavioral risk — do not let it inherit the PDF helper's precondition.
4. Add direct tests for each helper using small fixtures that cover
   self-closing cells, attribute-order variation, shared strings, multiple
   xref subsections where supported, malformed input, and absent parts.
5. Migrate consumers only after the helper tests are green; do not weaken
   their filing-specific assertions during consolidation.

### 59C-2 / C4. Load each PDF once per inspection

Refactor `inspectPdf()` so input decoding and `pdfjsLib.getDocument()` happen
once, then derive text and metadata from the same loaded document. Destroy or
clean up the PDF.js document/loading task in `finally` where the API permits.
Update `filing-identity.contract.spec.ts` and other callers that separately
request text and metadata from identical bytes.

### 59C-3 / C5. Replace observable fixed waits

Replace `waitForTimeout()` only where there is an observable completion
condition: editor creation/selection, toolbar visibility, highlight SVG
creation, route re-render, model update, or dropdown closure. Preserve a fixed
delay only when the product contract itself is time-based and document why.
The replacement must wait for the actual state, not a new arbitrary timeout.

**Start with `signature-capture.contract.spec.ts`.** The suite holds 27
`waitForTimeout()` calls and **19 of them are in that one file** — 70% of the
problem in a single spec. The rest are thinly spread:
`highlight-toolbar-style` and `annotation-toolbar-containment` at 3 each
(already reduced by 59A/59B), then `verified-inventory-workflow` and
`schedule-doc-ack` at 1 each. The original text named "annotation and signature
specs" without that distribution, which invites spreading effort evenly across
files where the return is not remotely even. If only one file is done, it is
this one.

### 59C-1 / C6. Trace policy

Use an explicit policy such as:

- CI: `on-first-retry` while CI retains one retry;
- local default: `off`; and
- local diagnostic opt-in: `retain-on-failure` through a named environment
  switch or script.

Do not describe Playwright trace data as standalone video; no video option is
currently configured. Measure the disk effect after the policy change.

### 59C-4 / C7. Parallelism experiment, not assumed outcome

**Know the price before authorizing this.** The three-run stability gate below
is the right bar, and it is expensive. Measured 2026-09-19: the E2E half alone
is 25.6 minutes and a full `npm test` is roughly 72 minutes wall. Three
consecutive complete source runs, plus 59C-1's baseline run, is on the order of
four hours of machine time — spent on a question whose honest answer may well
be "stay at `workers: 1`." That outcome is a valid result, not a failure, but
it should be a priced decision rather than a surprise. This is the single most
expensive item in Milestone 59 and the easiest to defer.

The suite is currently **678 tests in 93 files**, all through one worker. (The
"671" figure in the baseline section above was measured at `e1228fd`, before
59A and 59B.)

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

### 59C acceptance, per sub-delivery

Each list below is the acceptance bar for that sub-delivery alone. None of
them waits on the others.

#### 59C-0

- The xref check fails against a PDF with a deliberately corrupted offset, and
  names the object whose offset is wrong.
- The same corrupted input is shown to PASS before the repair, proving the
  check was vacuous rather than merely untested.
- `pdf-structure-tags.spec.ts` still passes against a well-formed PDF.

#### 59C-1

- `tests/baseline/milestone-59-runtime.json` exists and holds the measurements
  C1 lists, in a form 59C-4 can read back.
- Passing local runs no longer build gigabyte-scale trace trees by default.
- The disk effect of the trace-policy change is measured, not asserted.

#### 59C-2

- 59C-0 has landed.
- Identical court artifacts are not regenerated for sibling read-only
  inspections.
- Shared parsers have direct tests and no filing-specific assertion is lost.
- `inspectPdf()` performs one PDF.js load for combined text/metadata work.
- The shared PDF structural helper is built on the implementation that follows
  `startxref`, and each migrated caller's assertions are unchanged.

#### 59C-3

- `signature-capture.contract.spec.ts` is addressed first.
- Every removed `waitForTimeout()` is replaced by a wait on an observable
  state, not a shorter arbitrary delay.
- Any retained fixed delay carries a written reason naming the time-based
  product contract that justifies it.

#### 59C-4

- 59C-1's baseline exists.
- A higher worker count becomes the default only if the three-run gate passes
  in full; otherwise `workers: 1` is retained and the measured result recorded.
- Either outcome closes the sub-delivery. "Stay serial, and here is the
  evidence" is a completed 59C-4, not an abandoned one.

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
| 59C-0 | `pdf-structure-tags.spec.ts`, red-first against a corrupted xref offset — including the pre-repair pass that proves the check was vacuous |
| 59C-1 | one measured source run for the baseline; targeted reruns to confirm the trace policy took effect |
| 59C-2 | direct parser/helper specs; every migrated Excel/PDF consumer |
| 59C-3 | the signature and annotation specs whose waits changed |
| 59C-4 | three consecutive complete source runs (≈4 hours with the baseline; see 59C-4) |
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

1. All **seven** false-confidence findings have non-vacuous,
   production-connected evidence with recorded red-first demonstrations. Six
   were repaired by 59A; the seventh (the xref audit) was found after 59A
   closed and is 59C-0.
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

