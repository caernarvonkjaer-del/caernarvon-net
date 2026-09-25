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
| 70A | Claude | 2026-09-24 | 2026-09-24 |
| 70T | Claude | 2026-09-24 | 2026-09-25 |
| 70B | Claude | 2026-09-25 | 2026-09-25 |
| 70C | Claude | 2026-09-25 | 2026-09-25 |

## Branch-only settings to undo at the merge

| Setting | Where | Why | Undo at the merge |
| --- | --- | --- | --- |
| Scoped exception note in section 2 | `AGENTS.md` (committed on `master`, `a9c9930`) | Tells agents that MS 70 work goes to this branch and everything else stays direct-to-master | Remove the note |
| Test-server ports 4331 / 4183 / 5183 | `playwright.config.ts` | Master's worktree serves tests on 4321 / 4173 / 5173 and reuses a server already listening there; distinct ports stop either worktree from silently testing the other's files | Restore 4321 / 4173 / 5173 |
| Measurement-server ports 4332 / 4333 / 4334 / 4335 | `scripts/measure-baseline.mjs`, `scripts/measure-lifecycle.mjs` | Both scripts accept any server answering on their port; master's use 4322 / 4323 | Restore 4322 / 4323 (4334 serves the new `portable-http` target and can stay) |
| Corpus-generator port 4336 | `scripts/ms70-sav-corpus.mjs` | Serves each checkpoint's extracted tree; kept off every port either worktree's tests or measurements use | None: the script is new on this branch, and 4336 can stay |
| Mixed-version server port 4337 | `tests/e2e/mixed-version.characterization.spec.ts` | Serves the old build and this tree on one origin; kept off every port either worktree's tests or measurements use | None: new on this branch, and 4337 can stay |
| Unit-test server port 4338 | `tests/unit/serve-portable-http.spec.js` | Starts a real two-mount server for a moment | None: 4338 can stay |

## Master commits since the branch point

| SHA | Date | Summary | Files touched | Disposition | Proving test(s) | Branch commit | Status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `945b5a8e0eb3290bac3ce345a4910c81208392e4` | 2026-09-24 | Annual import no longer stops at the first Schedule D ward percentage (a local r2 in annual-accounting/excel.js; found by this milestone's audit) | `src/features/annual-accounting/excel.js`, `src/core/types/window-bridge.d.ts`, `tests/e2e/annual-import-ward-percentage.spec.ts`, `TEST-INDEX.md`, `file_index.md` | merges-cleanly | `tests/e2e/annual-import-ward-percentage.spec.ts` | `299e17a` | carried |
| `b28bf2516bd5100741bdfff9db759ce87f52672b` | 2026-09-24 | Restore blank-card clean-up (main.js imports prune-cards.js; legacy-app.js publishes BLANK_SCHEDULE_ENTRY); tests that assumed untouched cards survive updated | `src/main.js`, `src/legacy-app.js`, `tests/unit/fixtures/window-bridge-allowlist.json`, `tests/e2e/blank-card-pruning.spec.ts`, `tests/e2e/guardian-inventory-collection-controls.spec.ts`, `tests/e2e/plan-certificate-of-service.spec.ts`, `tests/e2e/schedule-doc-ack.spec.ts`, `TEST-INDEX.md`, `file_index.md` | re-implement | `tests/e2e/blank-card-pruning.spec.ts` | -- | open |
| `dbee60fb2ac3fc376e9f5999602c7282efb9a89a` | 2026-09-24 | Annual Ward's % always a percentage (1% no longer filed as 100%); Preview & Export notes Schedule D shares of 1% or less | `src/features/annual-accounting/totals.js`, `src/core/excel/excel-engine.js`, `src/core/filing/output-preflight.js`, `src/core/filing/ward-share-advisories.js`, `tests/e2e/annual-ward-share-export.spec.ts`, `tests/e2e/annual-import-ward-percentage.spec.ts`, `tests/unit/annual-ward-percentage.spec.js`, `tests/unit/ward-share-advisories.spec.js`, `tests/unit/excel-engine.spec.js`, `TEST-INDEX.md`, `file_index.md` | merges-cleanly | `tests/e2e/annual-ward-share-export.spec.ts`, `tests/unit/annual-ward-percentage.spec.js` | -- | open |
| `c62f89002c30272ad4555c749b24a28ee1468d59` | 2026-09-24 | Completes dbee60f: each Schedule D line's ward amount (Annual pages; PDF D-1 and D-5 columns) follows the 1% rule; the Annual pages import pct from totals.js and legacy-app.js's stale pct() is deleted (the branch's declaration dispositions list it) | `src/features/annual-accounting/index.js`, `src/features/annual-accounting/pdf-model.js`, `src/legacy-app.js`, `src/core/types/window-bridge.d.ts`, `tests/e2e/annual-ward-share-export.spec.ts`, `tests/unit/annual-ward-percentage.spec.js`, `TEST-INDEX.md` | re-implement | `tests/e2e/annual-ward-share-export.spec.ts`, `tests/unit/annual-ward-percentage.spec.js` | -- | open |
| `b2d97f52212f3a8735d606aa49a7069872f48656` | 2026-09-24 | A case file with a part that cannot be read now tells the filer exactly what was not read and is never saved over (startup Open, Open backup, re-read after unlock); found by this milestone's .sav corpus | `src/legacy-app.js`, `src/core/persistence/case-file.js`, `src/core/types/window-bridge.d.ts`, `tests/unit/fixtures/window-bridge-allowlist.json`, `tests/e2e/case-file-damaged-open.spec.ts`, `TEST-INDEX.md`, `file_index.md` | re-implement | `tests/e2e/case-file-damaged-open.spec.ts`; carrying it deliberately changes `tests/baseline/ms70-sav-corpus-golden.json`'s damaged-file outcomes (a-listed-filing-missing, unreadable-filing, tampered-encrypted-filing then show the warning): regenerate those with the port, recorded | -- | open |
| `2ad4a63336c7568d50e06ca57d712fec4d560ccf` | 2026-09-24 | file_index.md: real descriptions for the fifteen files changed on master today | `file_index.md` | not-applicable | -- (documentation only; merges with the branch's own file_index.md rows, and rows for files the migration moves are rewritten when they move) | -- | n/a |
| `5de3707a24819f6db055391e27d9002663a89d7e` | 2026-09-25 | A password-protected case file no longer lists ward names in its plaintext manifest; a case file of a newer format version is refused (startup Open, Open Backup, the re-read after unlock) | `src/core/persistence/case-file.js`, `src/legacy-app.js`, `src/core/types/window-bridge.d.ts`, `tests/unit/fixtures/window-bridge-allowlist.json`, `tests/e2e/case-file-manifest-privacy.spec.ts`, `tests/e2e/case-file-newer-format.spec.ts`, `TEST-INDEX.md`, `file_index.md` | re-implement | `tests/e2e/case-file-manifest-privacy.spec.ts`, `tests/e2e/case-file-newer-format.spec.ts` | -- | open |
| `ae9ecdcbf8159048832fe6aa85756e3453a1be70` | 2026-09-25 | Inside a filing "?" is announced as opening the user guide (new tab) and claims no disclosure state; the dashboard's "?" keeps the Help panel's | `src/core/navigation/router.js`, `src/legacy-app.js`, `src/core/types/window-bridge.d.ts`, `tests/e2e/user-guide-wiring.spec.ts`, `TEST-INDEX.md`, `file_index.md` | re-implement | `tests/e2e/user-guide-wiring.spec.ts` ("announces what it does") | -- | open |
| `6a8224d4b9baea47299eafb95a1d9bd5c8e420f3` | 2026-09-25 | vite.config.js comment: the fragments/ copy is needed in dist/portable too (served over http(s) in production) | `vite.config.js`, `file_index.md` | not-applicable | -- (a comment; merges as text) | -- | n/a |
| `56ff26aeca419bbe47f12ed7207ab77db343bb82` | 2026-09-25 | MINIMAL_VALID_GUARDIAN answers the safe-deposit questions 'No', the stored tri-state, instead of the legacy false | `tests/e2e/support/fixtures.ts`, `file_index.md` | merges-cleanly | the specs built on the fixture (e.g. `tests/e2e/bond-depository.spec.ts`, `tests/e2e/pdf-form-specific.spec.ts`) | -- | open |
| `8f5a163906ee758fffcc52302ebf03961a3bdd09` | 2026-09-25 | Seven sidebar "turned green" checks anchored to the class `complete` (`/complete/` also matched `incomplete`, so they could not fail) | `tests/e2e/annual-schedule-consistency.spec.ts`, `tests/e2e/bond-depository.spec.ts`, `tests/e2e/sidebar-only-wants.spec.ts`, `TEST-INDEX.md`, `file_index.md` | merges-cleanly | the same three specs | `e9b8251` | carried |

Notes on open rows:

- `5de3707`: re-implement. Its `legacy-app.js` hunks (`loadCaseFileAtLaunch()` and
  the re-read in `lockApp()`) land in code the branch moves, and it publishes
  `window.newerCaseFileFormatMessage`, a new global the branch's ratchet
  forbids: carried, the check is imported by whatever owns those load paths.
  Its two specs reach the app through `window` and are converted to
  `GuardianForms.testing` as they are carried (70T's guard would refuse them).
- `ae9ecdc`: re-implement. It edits the Print Preview header in
  `legacy-app.js` and `attachFormHeaderActions()` in `router.js`; its new test
  navigates through `window.navigate`, converted to the adapter when carried.
- `8f5a163`: made on the branch too, word for word (found there during 70T's
  conversion, fixed on `master` as a production-suite defect), so the merge
  sees one change on both sides.

- `945b5a8`: carried in `299e17a` (cherry-picked; the new spec converted to
  `GuardianForms.testing`, seen failing on the branch without the fix with
  "r2 is not a function"). 70B then replaced the importer's local `r2` with
  `src/core/format/money.js`'s, the same formula for the numbers it passes, so
  at the merge the importer's side of this commit is superseded: keep the
  branch's import.
- `b28bf25`: re-implement, although it would merge textually today. It edits
  `legacy-app.js`, which the branch deletes, and it adds a `window` global
  (`BLANK_SCHEDULE_ENTRY`) the ratchet forbids on the branch. Carried over,
  the schedule table belongs with the clean-up in `prune-cards.js` (or the
  70C registry), imported rather than read off `window`, and the composition
  root keeps loading the module. The dependency baseline then loses
  `prune-cards.js` from `unreachableModules` and `pruneBlankCards` from
  `unownedWindowReads` -- regenerate it in the same commit.
