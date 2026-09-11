# Repository Agent Instructions

## Git and delivery

Commit and push directly to `master`. Do not create feature branches for
this project, and do not stage work on a branch "pending approval" to merge
later — that just adds a merge step the user has to ask for.

`master` deploys to caernarvon.net. Before a non-documentation commit, select
and run the relevant focused tests under the policy below; do not commit or
push if those selected tests fail. Include the test commands and results in the
handoff/commit report.

Do not run the full `npm test` regression suite by default. It commonly takes
an hour or more on this machine. Run it only when the requester explicitly
asks, or recommend it and obtain permission when a change is unusually broad,
cross-cutting, or high risk.

For documentation-only changes, do not run application tests. Run
`git diff --check` instead. A documentation-only commit/push is permitted
without focused tests or the full regression suite.

## Targeted test-selection policy

`TEST-INDEX.md` is the test catalogue. Before a non-documentation commit, read
it and select the smallest sufficient set of tests that covers the changed:

- filing type(s) and feature module(s);
- shared subsystem or contract (for example, persistence, routing, PDF/Word/
  Excel output, dashboard, or accessibility); and
- changed behavior, including regression coverage for the reported defect.

Run both unit and E2E tests when the change crosses those layers. Focused tests
are the ordinary commit gate; they are not a substitute for a full suite the
requester has expressly required. State why the selected suite covers the
change, list its command(s), and report pass/fail results before committing.

## Local Playwright Chromium Path

This Windows machine's currently installed Playwright Chromium executable is:

```text
C:\Users\No Name\AppData\Local\ms-playwright\chromium-1234\chrome-win64\chrome.exe
```

Some Playwright runs may instead try the following headless-shell path, which
may be missing after a Playwright browser update:

```text
C:\Users\No Name\AppData\Local\ms-playwright\chromium_headless_shell-1234\chrome-headless-shell-win64\chrome-headless-shell.exe
```

The Chromium path was confirmed by querying the bundled Playwright package's
`chromium.executablePath()`. These versioned paths can change after a browser
update; verify them rather than assuming `1234` remains current.

For local E2E runs, Edge is also available through the project config:

```powershell
$env:PG_BROWSER='edge'
npx.cmd playwright test --reporter=list
```

For any change to a filing's persisted data shape (a new field, a renamed
field, a changed collection's min/max/row shape, a new derived calculation),
update the matching row(s) in `probate-guardian-data-model.csv` in the same
commit, following the canonical column contract in
`DATA-MODEL-REMEDIATION-PLAN.md`. Run `npm run verify:data-model` before
committing, and select focused save/import/carryover tests that prove backward
compatibility or an intentional migration. Do not silently rewrite existing
saved data without an explicitly documented migration/normalization policy.

## Test index

`TEST-INDEX.md` lists every file under `tests/unit` and `tests/e2e` with a
one-line summary of what it covers, plus a category/scope breakdown and
instructions for running a lite, changed-files-targeted subset during local
iteration. Whenever you add, remove, rename, or meaningfully repurpose a
test file (unit spec, e2e spec, or e2e support helper) — or change what
category/filing-type scope it covers — update the matching row(s) in
`TEST-INDEX.md` in the same commit. Keep its scope/category descriptions
accurate enough that the next agent can select a defensible targeted suite.
