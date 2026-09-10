# Claude Handoff Notes

## Git: work on master, do not create branches

Commit and push directly to `master`. Do not create feature branches for
this project, and do not stage work on a branch "pending approval" to merge
later — that just adds a merge step the user has to ask for.

`master` is what deploys to caernarvon.net, so the bar for committing is a
green suite, not a branch: run `npm test` (unit + e2e) and only commit once
it passes.

## Local Playwright Chromium Path

This Windows machine has Playwright's bundled Chromium browser installed at:

```text
C:\Users\No Name\AppData\Local\ms-playwright\chromium-1234\chrome-win64\chrome.exe
```

Use this path if Playwright tries to launch the missing headless-shell path:

```text
C:\Users\No Name\AppData\Local\ms-playwright\chromium_headless_shell-1234\chrome-headless-shell-win64\chrome-headless-shell.exe
```

The path was confirmed by querying the bundled Playwright package's
`chromium.executablePath()`.

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
committing.

## Test index

`TEST-INDEX.md` lists every file under `tests/unit` and `tests/e2e` with a
one-line summary of what it covers, plus a category/scope breakdown and
instructions for running a lite, changed-files-targeted subset during local
iteration. Whenever you add, remove, rename, or meaningfully repurpose a
test file (unit spec, e2e spec, or e2e support helper) — or change what
category/filing-type scope it covers — update the matching row(s) in
`TEST-INDEX.md` in the same commit. The lite subset is for fast iteration
only; still run the full `npm test` before committing.

Ask permission before running the full regression suite.
