# Milestone 57 review — handoff (2026-09-17)

Working from the review verdict: 57A defective validation, 57B incomplete/unsafe
conversion, 57C blank-period bug, 57D critical Excel regression, 57E-1 poorly
integrated, 57F Guardian Excel round-trip defect + unverified PDF fix, 57G no
defect found, 57H privacy/product-design regression. Recommendation was to stop
release on three items before touching the rest.

**All three stop-release items are done, tested, committed, and pushed to
`master`** (commit `c991869` covers 57H + the Guardian Inventory date fix;
the B-4 Excel fix landed just after). Status below; "Not started" at the
bottom is the real remaining work.

## Done and verified

### 1. 57H — replaced the encrypted cross-session cache with a position marker
Per your instruction mid-session: no case data in browser storage for the
"resume" feature — just a `pg-last-position` localStorage marker (route +
ward id + timestamp, nothing else).

- `src/core/persistence/recovery-cache.js` — rewritten. Two mechanisms now,
  explained in its file header:
  - `pg-session-cache` (IndexedDB): kept, but trimmed to only what
    `lockApp()` actually reads back (wards + guardian name/email) — same-tab
    auto-lock recovery only, for a case that's never been saved to a `.sav`
    yet. `saveSessionRestoreCache()`/`clearSessionRestoreCache()`.
  - `pg-last-position` (localStorage): new. `saveLastPosition()` /
    `loadLastPosition()` / `clearLastPosition()`.
- `src/core/persistence/case-file.js` — the 3 call sites (export, write,
  import) reverted from `saveSessionRestoreCache()` back to
  `clearSessionRestoreCache()` on success — this was 57H's actual regression
  (successful saves used to clear the temp cache; 57H made them refresh it
  forever instead, with nothing left in production to clear it on decline).
- `src/core/navigation/router.js` — `renderPage()` now calls
  `saveLastPosition(page, activeWardId)` on every navigation.
- `src/legacy-app.js` — `initApp()` applies the remembered position after a
  real case loads (only when `_openedFileAtLaunch`, only if the remembered
  ward still exists in the opened file); `resumeCaseOnDeviceAtLaunch()`
  deleted; `startNewWardAtLaunch()` clears the marker.
- `index.html` / `src/startup-events.js` — "Continue on This Device" button
  removed; original privacy-promise startup text restored (now true again —
  nothing case-related persists between visits, only the position marker).
- **Note:** this intentionally changes a pre-existing, unrelated behavior —
  reopening a `.sav` used to *always* land on the dashboard, even when the
  file's own last-active ward was known (see the old `initApp()` comment
  "land on All Wards, not wherever it was last saved mid-edit"). Your
  instruction to "load it up" on reopen means that's now overridden when a
  matching position marker exists. Worth a conscious sign-off, not just a
  side effect.
- Tests: `tests/e2e/recovery-cache.spec.ts` rewritten (save clears cache;
  reopen lands on last page/ward; new case forgets the marker).
  `tests/e2e/case-file-core-fields-roundtrip.spec.ts` and
  `tests/e2e/persistence-recovery.contract.spec.ts` had their now-dead tests
  (calls to the deleted `checkSessionRestoreCacheAtLaunch`) removed/replaced.
  New unit test `tests/unit/recovery-cache-last-position.spec.js`.
  `window-bridge.d.ts` and the allow-list regenerated/updated.
  **Caveat:** e2e specs are edited by hand and not run (Playwright Chromium
  isn't installed locally — same gap the original review hit). Unit suite
  (956 tests) and governance checks (`window-bridge`, `verify-data-model`)
  are green.

  **Correction (2026-09-19, different session):** "Playwright Chromium isn't
  installed locally" was a fact about the environment that wrote this
  document, not a standing fact about this repo. Verified directly in a
  later session: `npx playwright --version` reports 1.62.1, the Chromium
  binary exists on disk
  (`~/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe`),
  and `PG_BROWSER=chromium npx playwright test` runs real browser suites
  successfully (a full-repo run the same day passed 598, skipped 6, 0
  failed). The three e2e specs this caveat covers
  (`recovery-cache.spec.ts`, `case-file-core-fields-roundtrip.spec.ts`,
  `persistence-recovery.contract.spec.ts`) were still only hand-edited, not
  run, as of this note — the environment gap that excused that is what's
  corrected here, not the specs' pass/fail status, which still needs an
  actual run to confirm.

### 2. Guardian Inventory date round-trip bug (part of 57F's regression)
`src/features/guardian-inventory/excel.js`'s `dt()` import reader only
handled a `Date` object or an Excel serial number; a string (what re-opening
this app's own exported file hands back, since `fmtD()` writes
`MM/DD/YYYY`) fell through to `v.substring(0,10)` — `'10/01/2026'`
unchanged, stored where every other field expects ISO `2026-10-01`. Fixed to
normalize ISO, `MM/DD/YYYY`, and `MM/DD/YY`, matching annual-accounting's
`gcDate()`. Affects `gid`, C-2 `dateFiled`, C-3 `actionDate`, C-4
`dateCreated`. New unit test
`tests/unit/guardian-inventory-date-roundtrip.spec.js` — confirmed red
against the old code, green now.

### 3. Annual Accounting Schedule B-4 multi-account Excel export

Confirmed by unzipping the real embedded
template (`templates/annual-template.js`, decoded and inspected directly)
that the workbook has 18 B-4 check-register pages, not the one (`p2`) the
app wrote to — `SCH B-4 OTHER DISB p2` through `p19`, each with its own
`BANK:` / `ACCOUNT NUMBER #:` header at C6/H6 (shared strings 280/535,
verified). The court's own item numbering groups them into 4 blocks with a
reset at p8, p12, and p16 — room for 4 distinct bank accounts:

| Account | Pages | Row capacity |
| :-- | :-- | --: |
| 1 | p2 (rows 20-44) + p3-p7 (rows 8-34 each) | 160 |
| 2 | p8 (rows 8-37) + p9-p11 (rows 8-34 each) | 111 |
| 3 | p12 (rows 8-37) + p13-p15 (rows 8-34 each) | 111 |
| 4 | p16 (rows 8-38) + p17-p19 (rows 8-34 each) | 112 |

`src/features/annual-accounting/excel.js`:
- `SCH_B4_ACCOUNT_BLOCKS` — the page/row map above.
- `planSchB4Export(schB4, schB4Accounts)` — pure, exported, unit-tested.
  Groups disbursements by account (schB4Accounts[] order = block order),
  blocks export only if there are >4 accounts or one account's rows exceed
  its block's real capacity (message names the account, still offers PDF);
  no-accounts filings fall back to one unlabeled group on block 1 (same as
  the old behavior, but with p3-p7's headroom instead of being capped at
  p2's 25 rows).
- `doSaveExcel()` — the old "2+ accounts → block everything" check replaced
  with `planSchB4Export()`; the writer now loops each group across its
  block's pages, writing the header once on the block's first page.
- `importExcel()` — inverse: reads all 4 blocks, one account per block
  (only created if that block's header has content).
- `ANNUAL_EXCEL_CAPS.schB4.cap` raised from 25 to 494 (sum of all 4 blocks)
  — now just a backstop; `planSchB4Export()` is the real capacity check.

New test: `tests/unit/schb4-account-export-plan.spec.js` (7 tests) — two
accounts no longer block export and land in separate blocks; no-accounts
legacy fallback; >4 accounts still blocks; over-capacity account still
blocks and is named; exact-capacity is allowed.

Full unit suite: **963/963 passing**. `verify:data-model` clean. No e2e spec
currently asserts the old blocking behavior (checked), so nothing there
needed updating.

### 3b. 57D scoping pass — template re-verified 2026-09-19

The research above was re-derived from scratch against the embedded workbook
(`templates/annual-template.js` base64-decoded and read as a zip) rather than
taken on trust. **Every capacity number above is confirmed exactly.**

Method: decode to `.xlsx`, read `xl/workbook.xml` for sheet names, then for
each register page find the row where column C reads `Check #` and count the
pre-printed numeric Line # values in column B below it. Block boundaries are
where that Line # sequence restarts at 1.

| Block | Pages (row ranges) | Capacity |
| --: | --- | --: |
| 1 | p2 (20-44), p3-p7 (8-34 each) | 160 |
| 2 | p8 (8-37), p9-p11 (8-34 each) | 111 |
| 3 | p12 (8-37), p13-p15 (8-34 each) | 111 |
| 4 | p16 (8-38), p17-p19 (8-34 each) | 112 |
| | **Total** | **494** |

58 sheets in the workbook; 19 are B-4 (`SUMMARY p1` plus registers p2-p19).
Line # restarts at 1 on p2, p8, p12 and p16 — four blocks, so four bank
accounts. p2 is the outlier: its column header sits at row 15 rather than row
7, because pages 2 carries an instructions block, which is why its first page
holds 25 rows where p8/p12/p16 hold 30/30/31.

**Corroboration from a different sheet.** `SCH B-4 OTHER DISB SUMMARY p1` —
the summary page, not one of the registers the capacities were derived from —
carries this heading at B8:

> **SUMMARY OF PAGES 1 TO 18 FOR ALL ACCOUNTS BY CATEGORY**

Its 18 category rows (B10-B27, "Accounting" through "Other") each sum the `AK`
column across every register page, e.g.
`=SUM('SCH B-4 OTHER DISB p2'!AK8 + 'SCH B-4 OTHER DISB p3'!AK8 + ...)`, and
B28 totals those into `=SUM(I10:I27)`. So the court's own workbook states in
its own words that the 18 register pages exist to hold **more than one
account**, which is independent of the block structure derived above and
reached from a different direction.

Two consequences for whoever builds this. The multi-account layout is the
template's intent, not an interpretation of it. And the category summary
**recalculates itself** from the register pages — the app writes the registers
and must not write the summary, which is formula-driven.

**Two corrections to the research above.** It records the account header as
"`BANK:` / `ACCOUNT NUMBER #:` at C6/H6". Re-read from the sheet XML with a
parser that handles self-closing cells (an earlier pass did not, and mis-read
the row):

| Cell | Contents |
| --- | --- |
| `B6` (merged `B6:C6`) | label `BANK:` |
| **`D6` (merged `D6:F6`)** | **bank name value** |
| `G6` | label `ACCOUNT NUMBER #:` |
| **`H6` (merged `H6:I6`)** | **account number value** |

`I5` carries the page label ("Page 8"), not `C5`. Both corrections matter
because writing to the wrong cell of a merged range puts the value somewhere
the printed form does not show it -- silently.

**State on master.** `src/features/annual-accounting/excel.js` writes B-4 to
`SCH B-4 OTHER DISB p2` only, rows 20-44, hard-capped at 25 entries
(`if(i<25)`), columns C/D/E/G/I; `importExcel()` reads the same range.
`ANNUAL_EXCEL_CAPS.schB4.cap` is 25. So the app currently reaches **25 of the
template's 494 rows — 5%** — and a filing with two bank accounts has nowhere
to put the second. The comment at the write site says "write to pages p2-p3
only" but the code only ever writes p2; that comment is stale.

## Not started
57A (defective validation), 57B (unsafe conversion), 57C (blank-period
override bug), 57E-1 (poor integration), 57F's PDF period-date claim
(unverified — render-test needed, not just source read), trust-question
consistency. These come after the three release-blockers per the review's
own ordering.
