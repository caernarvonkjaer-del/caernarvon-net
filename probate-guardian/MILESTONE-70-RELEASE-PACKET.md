# Milestone 70 release packet

The merge gate's evidence for decision D8 -- the requester signs off before
`milestone-70` merges into `master` and deploys (MILESTONE-70-PROPOSAL.md,
"Reconstitution and merge"). Per D5 no tester pass follows: this packet and
the release gate are the whole check before production.

Prepared 2026-09-27 at branch head `1c3c281` (plus the port correction in the
commit that adds this file), against `master` at `44f46ec`.

## What is needed from the requester

1. **Approval to run the release gate**, `npm run test:release` -- types, the
   data model, the unit suite, and the browser suite on every profile
   (source, hosted web, portable, portable-http; Chromium, Firefox, WebKit and
   Edge). It is the plan's release tier and needs approval when it runs. It
   has not been run.
2. **The D6 freeze**: a short, announced pause on non-urgent `master` changes
   while the merge gate runs, so the ledger cannot grow under it. Urgent fixes
   still land on `master` and join the ledger.
3. **An answer on the `master` defects**: nine of the fixes below correct
   defects that are also on `master` today (marked "also on `master`"; each
   build record says so). They reach production with the merge. The
   recommendation stands: leave `master` alone and let the merge carry them,
   rather than fix each twice.
4. **The release sign-off (D8)**, on this packet and the release gate's
   result.

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
| Release tier, `npm run test:release` | **Not run -- awaiting approval** (question 1). |
| 70L checkpoint gate (D2) | Green on the 70L candidate (its trial copy, before the port): unit 2067/2067; browser 940 passed, 7 skipped, 0 failed; web 34 passed; portable 20 passed; portable-http 33 passed; the `.sav` corpus's 66 (70L build record). |
| After `161e4ff` (PDF engine fix) | Unit 2070/2070; the specs that press Print or open Preview 71/71; web 34, portable 20, portable-http 33. |
| `portable-http` profile | 33 passed. |
| Literal `file://` portable smoke | The portable build double-clicked from disk: the terms, a new case, an Initial Inventory, Preview & Export drawn, the case saved through Save Backup Now (2,010 bytes) and reopened in a fresh tab on the same filing and page -- no console error, page error or failed request. |
| Rollback test | `tests/e2e/rollback.contract.spec.ts`, 2/2: a case with a complete filing of every type, saved by the branch without a password and with one, opens in the pre-merge build (`44f46ec`) holding every value the branch reads back from it, every filing opens for editing, no page error. Seen failing on an injected fault (a field only the branch could read). |
| Package inventory | Below. |
| Output comparison | Below: all nine filing types identical. |

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

1. Announce the D6 freeze; re-run the ledger guard and carry any new row.
2. Run the release gate (question 1) on the branch head.
3. Build and keep the rollback zip (runbook step 1).
4. Merge `milestone-70` into `master` with a merge commit, not a squash. Git
   reports a modify/delete conflict on `src/legacy-app.js` for each `master`
   change to it; each resolves as the deletion, because its ledger row is
   closed (the guard proves it).
5. In the merge, undo the branch-only settings (the ledger's table): remove
   the AGENTS.md section 2 note; restore the test ports 4321 / 4173 / 5173 in
   `playwright.config.ts` and the measurement ports 4322 / 4323.
6. Build the deployment zip from the merged `master` and deploy it.
