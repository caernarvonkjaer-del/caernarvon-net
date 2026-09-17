# Milestone 57 review — handoff (session paused 2026-09-17 evening)

Working from the review verdict: 57A defective validation, 57B incomplete/unsafe
conversion, 57C blank-period bug, 57D critical Excel regression, 57E-1 poorly
integrated, 57F Guardian Excel round-trip defect + unverified PDF fix, 57G no
defect found, 57H privacy/product-design regression. Recommendation was to stop
release on three items before touching the rest. Status below.

## Done and verified (safe to leave as-is, or commit)

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

Full unit suite: **956/956 passing**. `npm run verify:data-model`: clean.
Nothing committed yet — all changes are in the working tree.

## In progress — 3. Annual Accounting Schedule B-4 multi-account Excel export

This is the one still open. Current code (`src/features/annual-accounting/excel.js`
`doSaveExcel()`) blocks the *entire* Excel export — every schedule, not just
B-4 — whenever a filer has assigned disbursements to more than one bank
account, forcing PDF-only. Before 57D, B-4 had no per-row bank field at all,
so Excel export always worked; this is a real regression for anyone paying
from more than one account.

**What I confirmed by unzipping the real embedded template**
(`templates/annual-template.js`, decoded and inspected directly — not
guessed): the workbook has 18 check-register pages for B-4, not one —
`SCH B-4 OTHER DISB p2` through `p19` (only `p2` is currently written to).
Each page has its own `BANK:` / `ACCOUNT NUMBER #:` header at C6/H6 (shared
strings 280 and 535 — verified). The item numbering across pages groups into
**4 blocks with resets**: p2–p7 (6 pages), p8–p11 (4 pages), p12–p15 (4
pages), p16–p19 (4 pages) — i.e. the template supports up to **4 accounts**,
with page 2's account getting the largest allocation.

**What's NOT nailed down yet**: the exact row capacity per page/account
(my per-page item-count scan hit a bug — it was reading raw `<v>` shared-string
*indices* off unrelated cells as if they were item counts on some rows, so
the final numbers I had were wrong; needs a redo that filters to numeric
(non-`t="s"`) cells only), and the precise row ranges to write to on the
"non-p2" first-page-of-a-group layouts (p8/p12/p16 use a taller register
starting at row 8, not row 20 like p2 — confirmed — but I hadn't finished
mapping exact last-row per page when I stopped).

**Suggested implementation shape**, once capacities are confirmed: group
`inv.schB4` rows by `bankAccountId`, assign each account to its own
page-block in account order (1st account → p2-block, 2nd → p8-block, etc.),
write that account's bank name/number into every page of its block, error
only if there are more than 4 distinct accounts *or* one account's row count
exceeds its block's total capacity (matching the existing capacity-issue
pattern in `ANNUAL_EXCEL_CAPS`/`getExcelCapacityIssues`, not a hard block).
Needs a `sortedSchB4Rows` grouping change and a rewritten `ANNUAL_EXCEL_CAPS.schB4`
entry (currently `cap:25`, which is only p2's count).

**Next step**: redo the per-page row-capacity scan correctly, confirm the
last usable row on each of the 4 "block-start" layouts (p2, p8, p12, p16)
and each "continuation" layout (p3-p7, p9-p11, p13-p15, p17-p19), then
implement + add a unit test proving the multi-account write no longer
blocks export and attributes each page's rows to the right account.

## Not started
57A (defective validation), 57B (unsafe conversion), 57C (blank-period
override bug), 57E-1 (poor integration), 57F's PDF period-date claim
(unverified — render-test needed, not just source read), trust-question
consistency. These come after the three release-blockers per the review's
own ordering.
