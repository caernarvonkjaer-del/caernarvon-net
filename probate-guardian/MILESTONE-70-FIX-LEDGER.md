# Milestone 70 -- master-fix ledger

Branch point: `a9c993011c4b3081b004637bf21752b95698f85b` (master at `a9c9930`,
"docs(agents): scoped branch exception for Milestone 70 (decision D1)",
2026-09-24)

This file lives on the `milestone-70` branch only. Milestone 70 is built here
while production fixes keep landing on `master` (decision D1 in
`MILESTONE-70-PROPOSAL.md`). Every `master` commit made after the branch point
must be carried into the migrated code before the branch merges; this ledger
is the record of each one, and `scripts/ms70-ledger-guard.mjs` fails whenever
a `master` commit is missing from it.

## How to use it

- **Whoever starts or finishes a delivery** runs
  `node scripts/ms70-ledger-guard.mjs` from `probate-guardian/` and adds a row
  for every `master` commit it reports. Agents working on `master` need do
  nothing; the delivery owner keeps this file current.
- **Disposition** (column 5) is one of:
  - `merges-cleanly` -- the change touches nothing the branch has moved or
    deleted, so the merge carries it as is;
  - `re-implement` -- the change must be rebuilt in the migrated code (the
    usual case for anything touching `src/legacy-app.js`);
  - `not-applicable` -- documentation only, or superseded by the migration.
- **Proving test(s)** (column 6) names the test that proved the fix on
  `master`. A re-implemented fix is proven the same way on the branch: that
  test, converted to the 70T adapter if it reached into globals, fails on the
  branch without the port and passes with it.
- **Status** (column 8) is `open`, `carried` (done, with the branch commit in
  column 7) or `n/a`.
- **Decision D7:** at the 70I checkpoint, if 10 or more rows are marked
  `re-implement`, `master` is merged into the branch there. The guard prints
  the current count.
- **At the merge**, `node scripts/ms70-ledger-guard.mjs --merge` must pass: no
  unlisted commit and no `open` row.

## Working setup

- The branch is checked out as a separate git worktree at
  `D:\caernarvon-net-ms70`; the main folder `D:\caernarvon-net` stays on
  `master`, so an agent committing a production fix there never lands it on
  this branch. Do not switch the main folder to `milestone-70`.
- The worktree has its own `npm ci` install (the drive is not NTFS, so its
  `node_modules` cannot be a junction to the main folder's).

## Delivery owners

| Delivery | Owner | Started | Finished |
| --- | --- | --- | --- |
| 70A | Claude | 2026-09-24 | -- |

## Branch-only settings to undo at the merge

| Setting | Where | Why | Undo at the merge |
| --- | --- | --- | --- |
| Scoped exception note in section 2 | `AGENTS.md` (committed on `master`, `a9c9930`) | Tells agents that MS 70 work goes to this branch and everything else stays direct-to-master | Remove the note |
| Test-server ports 4331 / 4183 / 5183 | `playwright.config.ts` | Master's worktree serves tests on 4321 / 4173 / 5173 and reuses a server already listening there; distinct ports stop either worktree from silently testing the other's files | Restore 4321 / 4173 / 5173 |

## Master commits since the branch point

| SHA | Date | Summary | Files touched | Disposition | Proving test(s) | Branch commit | Status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `945b5a8e0eb3290bac3ce345a4910c81208392e4` | 2026-09-24 | Annual import no longer stops at the first Schedule D ward percentage (a local r2 in annual-accounting/excel.js; found by this milestone's audit) | `src/features/annual-accounting/excel.js`, `src/core/types/window-bridge.d.ts`, `tests/e2e/annual-import-ward-percentage.spec.ts`, `TEST-INDEX.md`, `file_index.md` | merges-cleanly | `tests/e2e/annual-import-ward-percentage.spec.ts` | -- | open |

Notes on open rows:

- `945b5a8`: the branch has not touched the Annual importer, so the change merges
  as is (the two index files need an ordinary textual merge). When it lands on
  the branch, the dependency ratchet's `windowReads` and
  `lexicalOnlyWindowReads` sets lose `src/features/annual-accounting/excel.js::r2`:
  regenerate the baseline with `node scripts/ms70-dependency-audit.mjs
  --write-baseline` in the same commit, and the assertion counts for the new
  spec.
