# Milestone 68¾: Test-System Warning on Every Filing Page

## Status

**68¾A — LANDED 2026-09-24.** Approved by the requester on 2026-09-24 ("roll
the MS 68.75 work into your current task list"), built after Milestone 68 so
the page snapshots it changes were not being edited concurrently. See the
build record at the end of this document.

## What a tester will see

Every page inside every filing will begin its visible title area with:

> TEST SYSTEM - Do not use for filing

The warning comes before the page's existing title, separated by a plain hyphen.
For example:

> TEST SYSTEM - Do not use for filing - Verified Initial Inventory — Case Information

The dashboard will use the same order instead of showing the warning after
"All Filings — Dashboard." The Preview & Export page has no visible page-title
heading today, so its visible preview banner will begin with the same warning.

This is a test-environment label in the live app only. It will **not** be added
to a filed PDF, an Excel workbook, a `.sav` archive, PDF metadata, filenames,
the browser-tab title, or data saved for a filing.

---

## 68¾A — One centrally controlled title prefix

### Scope

The delivery covers:

- the dashboard title;
- all routes for all nine filing types in the canonical filing matrix:
  Initial Inventory; Simplified Annual Accounting; Annual Accounting; Final
  Accounting; Trust Accounting; Simplified Annual Plan; Annual Guardianship
  Plan; Initial Guardianship Plan; and Annual Plan — Minors;
- Cover, Summary, every Part/Question/Schedule page, signatures and
  certificates of service; and
- Preview & Export, through its visible banner rather than the generated court
  document beneath it.

It does not cover Start New Form / the filing picker, Activity Log, Manage
Shared Records, Help, dialogs, sidebar labels, buttons, validation messages, or
other utility copy. Those are application surfaces, not pages inside a filing.

### Recommended design

Extend the router's existing central post-render title decoration. Every filing
feature already mounts into `#main-content`, then the shared navigation path
calls `attachFormHeaderActions()` in `src/core/navigation/router.js`. That
helper already finds the page's principal heading and appends the common All
Filings, theme and Help controls. It is the narrowest verified integration
point for this warning.

Add one small shared decorator, with one message constant and one enabled
switch, and call it from that post-render path. The decorator will:

1. find the visible page-title content;
2. preserve the existing title byte-for-byte after the new prefix;
3. wrap the warning and original title together so the existing flex layout
   can wrap them without separating the warning, title and header controls;
4. mark its inserted node and do nothing when called again, so same-route
   re-renders and the existing mutation observer cannot double-prefix a title;
5. decorate the dashboard before the router's dashboard early return; and
6. use the visible Preview & Export banner when the route's only `<h1>` is the
   intentionally hidden "Print Preview" accessibility heading.

The current dashboard-only
`<span class="dashboard-test-system-label">...</span>` will be removed. The
dashboard will consume the shared decorator like the filing pages, leaving one
source for the wording and one source for whether it is shown.

The warning must be real DOM text, not CSS `content`. That keeps it in the
heading's accessible name, makes it copyable, and lets tests prove the exact
words a tester sees. CSS owns color, spacing, wrapping and print suppression
only.

### The removal switch

The recommended control is a code-level boolean beside the shared warning
constant, enabled for this test:

```js
const TEST_SYSTEM_TITLE_WARNING_ENABLED = true;
const TEST_SYSTEM_TITLE_WARNING = 'TEST SYSTEM - Do not use for filing';
```

Changing the boolean to `false` makes the decorator insert nothing everywhere,
including the dashboard and Preview & Export. This is preferable to making the
label a user preference: a tester must not be able to turn off the environment
warning accidentally, and deployment status is not filing data.

Keep a dedicated CSS class on the prefix. That permits an emergency stylesheet
hide if needed, but the boolean is the normal removal path because disabled
copy should not remain in the DOM or accessible name. If the feature is kept
for future test deployments, the switch and decorator stay; if it is discarded,
the shared call, helper and styles can be removed without editing any form page.

### Styling and accessibility

- Reuse the dashboard warning's existing brand/danger emphasis through a
  semantic class and existing design tokens; do not add a new arbitrary color.
- Keep the exact requested capitalization and punctuation. The inserted title
  prefix is `TEST SYSTEM - Do not use for filing - `; existing em dashes inside
  page titles remain unchanged.
- Allow the combined title to wrap at narrow widths without covering or
  displacing the All Filings, theme and Help controls.
- Present the warning once in the title's accessible text. Do not rely on color
  alone and do not create a second visually-hidden copy.
- Hide only the UI prefix in print CSS. Browser printing and generated filing
  outputs must retain their existing court-facing content.

### Acceptance criteria

1. On every filing route, the visible page title or Preview & Export banner
   starts with exactly `TEST SYSTEM - Do not use for filing - `.
2. The remainder of each existing title is unchanged. For the reported example,
   the complete result is exactly:
   `TEST SYSTEM - Do not use for filing - Verified Initial Inventory — Case Information`.
3. The dashboard begins `TEST SYSTEM - Do not use for filing - All Filings — Dashboard`
   and contains the warning exactly once.
4. Re-rendering a page, changing a field on a conditionally rendered page,
   changing theme, and navigating away and back never duplicates the prefix.
5. The header action buttons remain visible, named and clickable at desktop and
   mobile widths.
6. Preview & Export shows the warning in its visible banner, while the rendered
   PDF preview and downloaded PDF/Excel contain no added warning.
7. With the central enabled switch off, no covered title or preview banner
   contains the warning and every original title is restored unchanged.
8. No filing state, `.sav` shape, validation result, readiness result, export
   gate, or court-output calculation changes.

### Proposed files

| File | Proposed change |
| --- | --- |
| `src/core/navigation/router.js` | Invoke the shared, idempotent title decorator from the existing post-render header path, including the dashboard and preview exception. |
| `src/core/ui/test-system-title.js` | Hold the exact warning, the one enabled switch and the DOM decorator. Keeping this separate makes future removal or reuse a one-place decision. |
| `src/features/dashboard/index.js` | Remove the dashboard's one-off trailing warning span; retain only the normal dashboard title. |
| `src/styles/shell.css` | Style/wrap the shared prefix and suppress it in print. |
| `src/styles/dashboard.css` | Remove the obsolete dashboard-only warning rule. |
| `tests/e2e/test-system-title-prefix.spec.ts` | Exhaustive route/type contract, idempotence, switch-off, dashboard, preview/output exclusion and narrow-width behavior. |
| `TEST-INDEX.md` | Add the new test's exact scope in the same implementation commit. |
| `file_index.md` | Index the new source and test files in the same implementation commit. |

Names may be adjusted during implementation if the helper fits cleanly in an
existing shared UI module; the central behavior and one-switch contract may not
be replaced with per-form title edits.

### Verification plan

Add one browser contract driven from the canonical `FILING_MATRIX`, rather than
copying a second hand-maintained list of forms or routes. It will visit every
declared route for every filing type and assert that the relevant visible title
surface starts with the exact prefix once. This deliberately includes the
Annual engine under Annual, Final and Trust identities even though they share
page code.

The contract will also:

- preserve and compare the original title portion;
- trigger a same-page re-render and navigate away/back to prove idempotence;
- cover the dashboard's former one-off label;
- cover Preview & Export separately because its `<h1>` is visually hidden;
- inspect generated/downloaded output text to prove the warning did not leak
  into a court artifact;
- run one narrow viewport check that the warning, title and header actions do
  not overlap; and
- exercise the disabled switch through an exported test seam or dependency,
  without storing a preference in browser or filing state.

Because this delivery changes behavior, red-first verification is required:
run the new targeted spec before the implementation and confirm it fails
because filing pages lack the prefix and the dashboard has it in the wrong
position; then run it again after the change and confirm green. Also run the
existing route smoke spec because the central router/header seam serves every
filing. Update `TEST-INDEX.md` with the new spec in the same commit.

Recommended targeted commands:

```text
npx playwright test tests/e2e/test-system-title-prefix.spec.ts
npx playwright test tests/e2e/routes.spec.ts
```

No full regression is required by this small UI-only change unless the central
decorator exposes broader route/render instability during implementation.
`npm run test:quick` is a useful optional neighbor check and does not require
the full-regression approval gate. No type check is required by the proposed
file set unless implementation also touches a checked TypeScript support file.

### Cross-cutting checklist (AGENTS.md §8)

1. **Data model.** No persisted field, default, enum or collection changes;
   `probate-guardian-data-model.csv` is untouched.
2. **Legacy data migration.** None. The warning is derived entirely from the
   application build, not from saved filing data.
3. **Fixture and factory audit.** No fixture shape changes. The filing matrix
   supplies the exhaustive type/route list for the test.
4. **Test coverage and index.** One new e2e contract plus the mandatory
   `TEST-INDEX.md` row; red-first proof as described above.
5. **Export/import/portability.** `.sav`, PDF and Excel import/export are
   unchanged. The decorator runs in the portable build because it is ordinary
   shared client code; no host path or network dependency is added.
6. **Security and sensitivity.** The fixed warning contains no filing data and
   stores nothing. The switch does not claim to prevent filing or technically
   disable exports; it communicates that the deployment is for testing.
7. **UI/UX consistency.** Reuse the existing page heading, dashboard warning
   emphasis and shared header-decoration lifecycle. Verify responsive wrapping,
   focusable header controls, light/dark themes and accessible text.
8. **Legal/compliance framing.** "Do not use for filing" describes the system's
   test status; it is not a legal-sufficiency determination. Court outputs stay
   faithful and unwatermarked.
9. **Cross-form method consistency.** All nine filing types and all routes flow
   through one decorator. No form owns its own copy, and the Annual/Final/Trust
   aliases receive identical behavior from their shared engine.

### Non-goals

- disabling Save as PDF, Save as Excel, Print or the court-portal button;
- watermarking or degrading court output;
- adding a persistent setting or a per-user dismissal;
- changing filing titles in the sidebar, dashboard cards, metadata or files;
- refactoring page templates or the router beyond the existing title-decoration
  seam; or
- making the warning a general-purpose announcement/banner system.

---

## Build record — 68¾A LANDED 2026-09-24

**What a tester now sees.** Every page inside every filing — all nine filing
types, every route, Annual/Final/Trust included — the dashboard, and the
Preview & Export banner begin their visible title with
**TEST SYSTEM - Do not use for filing - **, once, in the brand color. The
reported example reads exactly "TEST SYSTEM - Do not use for filing -
Verified Initial Inventory — Case Information"; the dashboard reads "TEST
SYSTEM - Do not use for filing - All Filings — Dashboard" (its old trailing
label is gone). Nothing is added to a PDF, workbook, `.sav` file, metadata,
filename or the browser-tab title, and print CSS hides the warning.

**As designed, one place.** `src/core/ui/test-system-title.js` holds the one
constant, the one switch (`TEST_SYSTEM_TITLE_WARNING_ENABLED`) and the
decorator; `router.js`'s existing post-render header path calls it — first
thing in `attachFormHeaderActions()`, so before the dashboard and
hidden-heading early returns, and once more after the dashboard mounts. It
wraps the warning and the original title in one span, so they wrap together
beside the header buttons, and marks it so the router's mutation observer
can call it any number of times without doubling it. The warning is real
DOM text: in the heading's accessible name, copyable, testable.

**One finding during the build.** The Initial Inventory's Preview & Export
banner opens with a `<span>`, where the other forms' open with a `<div>`; the
first design targeted `div:first-child` and missed it (the matrix test
caught it: "guardian /print has a visible title surface"). The decorator
now takes the banner's first child, whatever the element.

**Switch-off seam.** `setTestSystemTitleWarningEnabledForTest(false)` flips
the switch for the current page load only — nothing stored — and restores
every title on screen node for node; a reload returns to the constant. It is
a deliberate `window.*` global (allowlisted, declarations regenerated), used
only by the spec. The normal removal path remains the constant.

**Tests.** `tests/e2e/test-system-title-prefix.spec.ts` (new, driven from
`FILING_MATRIX`): every route of every type starts with the warning once; the
reported example exactly; re-render, field write, theme change and
navigate-away-and-back never duplicate it; header buttons visible and named;
the dashboard; Preview & Export's banner, with the downloaded PDF and
workbook carrying no warning; the seam switched off restoring every title;
no overlap at 390px. **Red first: 14/14 failed** before the decorator was
wired, the nine type cases on the bare titles. First green run 79/91: eleven
byte-exact page snapshots (`annual-mount`, `simplified-mount`, the four
`plan-*-mount`) differing only in their title line gaining the prefix —
the expected change, applied to exactly those eleven lines — and the
Inventory banner above. Then **91/91** with `routes.spec.ts` (10.5 min).
Unit 126 files / 1,792 green; `check:types` clean (the router is in the
checked set). The guide's dashboard sentence now describes the warning on
every title, and the drift guard's `dashboard-test-system-label` control
points at the shared constant and the router call.
