# Milestone 70 release packet

The merge gate's evidence for decision D8 -- the requester signs off before
`milestone-70` merges into `master` and deploys (MILESTONE-70-PROPOSAL.md,
"Reconstitution and merge"). Per D5 no tester pass follows: this packet and
the release gate are the whole check before production.

Prepared 2026-09-27 at branch head `1c3c281` (plus the port correction in the
commit that adds this file), against `master` at `44f46ec`. Updated the same
day with the release gate's result and the requester's answers, at branch
head `78de6c5`; `master` is still at `44f46ec`.

## The requester's decisions

1. **The release gate**, `npm run test:release`: approved and run
   2026-09-27. The result is in the merge gate table below.
2. **The D6 freeze** -- a short, announced pause on non-urgent `master`
   changes while the merge gate runs, so the ledger cannot grow under it: the
   requester announces it. Urgent fixes still land on `master` and join the
   ledger.
3. **The `master` defects**: `master` is left alone. The nine fixes below
   marked "also on `master`" reach production with the merge, rather than
   being made twice.
4. **The release sign-off (D8)**, on this packet and the release gate's
   result: **given 2026-09-27**, with the D6 freeze announced. Merged the
   same day; see "The merge, as done" at the end.
5. **The focus snag found at the gate** ("Found at the release gate"): fixed
   on `master` after the merge, as its own change.

## What a filer will see after the merge

The migration itself changes nothing a filer sees: every page, calculation,
PDF, workbook, file name and saved case file is the same (the output
comparison below reads the files). What reaches production with it are fixes
made along the way:

- **An edit can no longer land in the wrong filing** (70F). A field that
  still had focus when another filing opened wrote its value into the new
  filing -- the new filing took the old one's ward name. Also on `master`.
- **Help on the Start New Form page is the help written for it** (70H); it
  showed the dashboard's welcome.
- **A lock no longer throws away work the case file does not have yet**
  (70I). After a browser restart, edits made before the first Save Backup
  came back as the file's older contents when the 15-minute lock fired. Also
  on `master`.
- **Locking a case never saved to a file keeps its shared records** (70I):
  people and case records, "not the same person" decisions and the chosen
  circuit were lost at every lock. Also on `master`.
- **The auto-save setting is kept** (70I); every reopen went back to 10
  minutes. Also on `master`.
- **An opened case shows when it was last saved** (70I), not "Unsaved
  changes" or "No backup saved yet". Also on `master`.
- **Deleting a prior year no longer reports a failure** (70I) after
  succeeding. Also on `master`.
- **The start dialog says when the remembered case file is gone** (70I).
  Also on `master`.
- **A page the filer has moved on from is no longer drawn over the one they
  moved to** (70K) -- on a slow connection, a new filing's page could be drawn
  over the dashboard, empty. Also on `master`.
- **Each page is drawn once** (70K), not twice. Also on `master`.

Two regressions the branch itself introduced were found and fixed before this
packet, so production never has them: a Simplified Accounting "none to
report" mark that stayed red until the next page (70H, fixed in 70I), and the
PDF engine loading at every start (70K, fixed in `161e4ff`).

## The merge gate (Reconstitution and merge, step 3)

| Check | Result |
| --- | --- |
| Ledger guard | OK: 12 `master` commits since the branch point `a9c9930`, none unlisted, no row open (`MILESTONE-70-FIX-LEDGER.md`). |
| Release tier, `npm run test:release` | Run 2026-09-27 on `9847dcb`: types clean; data model OK (1,009 rows); unit 2070/2070; source on Chromium 951 passed, 7 skipped (1.2 h); hosted web 34 passed, 2 skipped; portable 20 passed, 12 skipped; portable-http 33 passed. The runner then stopped at Firefox: this workstation had no Firefox or WebKit installed. With both installed (`npx playwright install firefox webkit`), the three cross-browser profiles were run with the runner's own command, `npm run test:e2e:<browser>`: Firefox 117 passed, 2 skipped; Edge 119 passed; WebKit 115 passed, 2 skipped, **2 failed** -- both in the tests ("Found at the release gate", below). After the fix, `78de6c5`: WebKit in full, 117 passed, 2 skipped (11.2 min); Firefox and Edge on the two changed specs, 98/98 and 98/98; every spec using the changed save helper, on Chromium, 25/25; types clean. |
| 70L checkpoint gate (D2) | Green on the 70L candidate (its trial copy, before the port): unit 2067/2067; browser 940 passed, 7 skipped, 0 failed; web 34 passed; portable 20 passed; portable-http 33 passed; the `.sav` corpus's 66 (70L build record). |
| After `161e4ff` (PDF engine fix) | Unit 2070/2070; the specs that press Print or open Preview 71/71; web 34, portable 20, portable-http 33. |
| `portable-http` profile | 33 passed. |
| Literal `file://` portable smoke | The portable build double-clicked from disk: the terms, a new case, an Initial Inventory, Preview & Export drawn, the case saved through Save Backup Now (2,010 bytes) and reopened in a fresh tab on the same filing and page -- no console error, page error or failed request. |
| Rollback test | `tests/e2e/rollback.contract.spec.ts`, 2/2: a case with a complete filing of every type, saved by the branch without a password and with one, opens in the pre-merge build (`44f46ec`) holding every value the branch reads back from it, every filing opens for editing, no page error. Seen failing on an injected fault (a field only the branch could read). |
| Package inventory | Below. |
| Output comparison | Below: all nine filing types identical. |

## Found at the release gate

Neither WebKit failure is something a filer would see. Both were in the
tests, both fail on the pre-merge build as well, and both are fixed in
`78de6c5`:

- **A case file the test had just saved could not be reopened in WebKit**
  (`case-file-roundtrip.spec.ts`, the encrypted case). This workstation's D:
  drive, where the branch is checked out, is FAT32, which keeps a file's time
  only to the even second. Playwright's WebKit on Windows misreads such a
  time on some reads and refuses the file as changed since it was chosen.
  The same bytes handed over directly opened every time, and a filer choosing
  a file in Safari never goes through Playwright's handover. The test's save
  helper now writes a new file. Behind that was an older gap in the same
  test: it looked for the reopened filing while an encrypted case was still
  decrypting -- about half a second after the password dialog closes, in
  WebKit. It now waits for the filing. The pre-merge build, run from an NTFS
  drive, fails on that gap 3 times in 3.
- **After "Go" to a Schedule B-1 field, the field did not have the cursor**
  (`navigation-status.contract.spec.ts`: 4 of 10 WebKit runs on the branch, 4
  of 10 on the pre-merge build). The test adds a B-1 entry and opens the
  page, which raises the "Supporting documentation" notice (Milestone 57C-R).
  The test never answered it, and the notice took the cursor whenever it
  opened after the jump -- as a dialog should. The test now dismisses it
  first, as the Guardian Inventory tests in the same file already did. Driven
  the way a filer's "Go" from another page works, the notice keeps the cursor
  in both browsers: a filer never types into a field hidden behind it.

**Found on the way, not fixed -- recommended for `master`:** after "Go" to a
field on a schedule whose notice has not been answered yet, pressing "I
understand" leaves the cursor nowhere. The page is scrolled to the field, but
a keyboard user has to Tab down to it from the top. Once the schedule has been
acknowledged, "Go" puts the cursor in the field. `master` behaves the same, in
both browsers. The fix belongs in the dialog code every dialog in the app
shares, so it is not being made at the release gate.

## Package inventory

`dist/portable` -- what is zipped and deployed (AGENTS.md section 9) -- built
from the branch and from `44f46ec`, file lists compared with the build's
content hashes set aside:

| | Pre-merge (`44f46ec`) | Branch |
| --- | --- | --- |
| Files | 24 | 23 |
| Total | 23,780,331 bytes | 23,490,366 bytes |

- `src/legacy-app.js` is gone (the delivery).
- `index.html` is 170,569 bytes larger: the monolith's code is bundled into
  it now.
- `fragments/common-modals.html` is 725 bytes smaller: the Rename Ward dialog,
  which nothing on the page could open since Milestone 36, was deleted in 70B.
- Nothing else is added, removed or changed in size. The package still holds
  `lib/`, `icons/`, `fragments/`, `help/` and `src/`, with `index.html` at its
  root.

## Court output, side by side

`tests/e2e/pre-merge-output.characterization.spec.ts`: one case file with a
complete filing of each type, opened by the pre-merge build and by the
branch; each filing's PDF and workbook saved through Preview & Export's own
buttons in both, and compared -- every PDF text run and where it sits, the
page count, title, subject, keywords and author; every workbook sheet, each
cell's value or formula, the merged ranges and defined names (read with
ExcelJS, never re-imported); the file names. **All nine types agree** (9/9).
Byte for byte, each PDF pair differs only where it records when it was made
-- its creation and modification times and the file ID built from them --
and each workbook pair only in the zip's entry times;
the comparison was seen failing on a changed Plan for Minors heading and on a
changed workbook cell.

| Filing type | PDF | Workbook |
| --- | --- | --- |
| Initial Inventory | same, 171,493 bytes | same, 244,395 bytes |
| Annual Accounting | same, 299,781 bytes | same, 328,268 bytes |
| Final Accounting | same, 299,909 bytes | same, 328,262 bytes |
| Trust Accounting | same, 299,891 bytes | same, 328,263 bytes |
| Simplified Annual Accounting | same, 120,598 bytes | same, 179,593 bytes |
| Annual Guardianship Plan | same, 245,778 bytes | -- (no workbook) |
| Initial Guardianship Plan | same, 195,957 bytes | -- |
| Annual Plan -- Minors | same, 122,744 bytes | -- |
| Simplified Annual Plan | same, 89,473 bytes | -- |

To open the pairs side by side, write them to a folder of your choosing:

```
PG_RELEASE_PACKET_DIR=<folder> npx playwright test tests/e2e/pre-merge-output.characterization.spec.ts
```

Each type gets `<folder>/<type>/pre-merge.pdf` and `branch.pdf` (and `.xlsx`
where the form has a workbook).

## Performance

Measured on `161e4ff` with the commands 70A used, against 70A's records
(70L build record, "Measurements"): startup script bytes are at or below the
pre-migration build's on every target (hosted -6.7%, portable -3.9%); script
time and page load are at the pre-migration figures or better, apart from one
outlier run on the portable targets whose repeats matched; no page or console
error anywhere. No speed-up is claimed.

## Rollback runbook

Written before the merge, as the plan requires.

1. **Before merging**, build the deployment zip from `master` exactly as a
   normal deployment does (AGENTS.md section 9) and keep it with the SHA it
   was built from. This is the rollback zip. Re-run the rollback test against
   that SHA (`PG_PREMERGE_SHA=<sha> npx playwright test
   tests/e2e/rollback.contract.spec.ts`) if it is not `44f46ec`.
2. **To roll back**, redeploy that zip to the production folder exactly as a
   normal deployment.
3. **Then revert the merge on `master`**: `git revert -m 1 <merge-commit>`,
   so the next zip built from `master` is the pre-merge code. Never
   force-push.
4. **What filers keep**: every case file saved on the migrated version opens
   in the rolled-back version with nothing lost (the rollback test), and a
   recovery snapshot the migrated version wrote is read by the old one
   (`tests/e2e/mixed-version.characterization.spec.ts`). A tab left open on
   either version keeps working beside the other (the same spec).

## The merge, after sign-off

1. The requester announces the D6 freeze; re-run the ledger guard and carry
   any new row.
2. If anything other than documentation has landed on the branch since
   `78de6c5`, run the release gate again on the new head. (Firefox and WebKit
   are now installed on this workstation, so `npm run test:release` runs
   through.)
3. Build and keep the rollback zip (runbook step 1).
4. Merge `milestone-70` into `master` with a merge commit, not a squash. Git
   reports a modify/delete conflict on `src/legacy-app.js` for each `master`
   change to it; each resolves as the deletion, because its ledger row is
   closed (the guard proves it).
5. In the merge, undo the branch-only settings (the ledger's table): remove
   the AGENTS.md section 2 note; restore the test ports 4321 / 4173 / 5173 in
   `playwright.config.ts` and the measurement ports 4322 / 4323.
6. Build the deployment zip from the merged `master` and deploy it.

## The merge, as done (2026-09-27)

1. Ledger guard re-run: OK, 12 `master` commits since `a9c9930`, none
   unlisted, no row open; `master` at `44f46ec`.
2. The release gate had run on the branch (above); nothing but documentation
   landed after `78de6c5`.
3. Rollback zip built from `master` at `44f46ec` before the merge:
   `probate-forms-portable-2026-09-27-rollback-44f46ec.zip` (24 files, as
   the package inventory above), kept in the `master` worktree's root with
   the earlier deployment zips.
4. Merged with a merge commit, `f3ca078` (parents `44f46ec`, `c58ea8b`).
   Each conflict resolved to the branch's version -- every `master` change
   was already carried -- and the staged tree was checked identical to
   `milestone-70` before step 5.
5. Branch-only settings undone in the merge: the AGENTS.md section 2 note
   removed; test ports 4321 / 4173 / 5173 and measurement ports 4322 / 4323
   restored. On the merged tree: types clean, data model OK (1,009 rows),
   `npm run test:quick` unit 2070/2070 and browser 61/61.
6. Deployment zip built from the merged `master` (`f3ca078`):
   `probate-forms-portable-2026-09-27.zip`, 23 files, as the inventory
   predicts, with no `legacy-app.js`. Opened from disk (`file://`): the
   terms, a new case, an Initial Inventory from the Start New Form picker and
   Print Preview, with no page error, console error or failed request.
   Deploying it to the production site is the requester's step.
