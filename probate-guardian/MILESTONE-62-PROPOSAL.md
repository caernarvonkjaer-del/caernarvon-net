# Milestone 62: Pre-Test State Checklist

## Status

**Proposed & implemented same session.** Twelve small, low-risk dashboard/app
changes requested ahead of an upcoming test session. None touch persisted
case data, validation, or export logic.

## Items

| # | Change | Reversibility |
| :-- | :-- | :-- |
| 1 | Hide the "Comment Card" dashboard toolbar link | Flag-gated — flip one constant to reinstate |
| 2 | Label the dashboard as a test system, "TEST SYSTEM" in `#820024` | One line to remove |
| 3 | Rename the "Compliance Overview" kicker to "Status - Overview" | One line to revert |
| 4 | Remove the "Pending Court Review" summary card | Markup deleted; underlying metric computation left intact |
| 5 | Swap "Export All Filings" and "New Form" button order | Two lines to revert |
| 6 | Remove contractions + increase font size in the sidebar resources disclaimer | CSS value + text |
| 7 | Add a Sixth Circuit tuning notice below the disclaimer | New paragraph |
| 8 | Sixth Judicial Circuit as the first-use default, user-changeable, stored in localStorage | New module-level preference, additive |
| 9 | Rename "Probate Guardian" → "Guardian Forms" everywhere it's a descriptive label | ~74 text replacements across 24 files; two items flagged, not changed — see below |
| 10 | Add Total/Open/Closed Filings cards to the dashboard summary strip, six-across responsive layout | Three new cards + one new metrics field each; CSS grid change |
| 11 | Remember (localStorage) that the "Offline access available" notice was answered; don't show it again | One new module + two call-site changes in pwa-ui.js |
| 12 | Activity Log: do not log automatic saves; update its description card and help text to say only manual saves are logged | One option on beginRecordingExport + one call site; existing log entries untouched |

### 1. Hide "Comment Card"

`dashboardToolbarActionsHTML()` (`src/features/dashboard/index.js`) links out
to the Pinellas Clerk's GovQA comment-card form. Requester wants it hidden
for the initial test rollout, with an explicit intent to reinstate later.
Implemented as a module-level `SHOW_COMMENT_CARD_LINK` flag rather than
deleting the markup, so:
- Reinstating is a one-line flip, not a re-write.
- `tests/unit/user-guide-drift-guard.spec.js`'s `dashboard-comment-card`
  entry (a static source-text scan for the GovQA URL, not a DOM check)
  keeps passing either way, since the link markup — including the URL —
  stays in the source; only its inclusion in the rendered string is gated.

### 2. Test-system label

Appended "TEST SYSTEM" to the end of the dashboard `<h1>` ("All Filings —
Dashboard"), styled in `#820024` (a dark red) via a new
`.dashboard-test-system-label` class in `dashboard.css`, so anyone in the
test session sees at a glance that this is not the production instance.
(`#820024` was a color spec, not literal heading text — an earlier pass of
this milestone printed it as text; corrected.)

### 3. "Compliance Overview" → "Status - Overview"

`.dashboard-page-kicker` renders its text uppercase via CSS
(`text-transform:uppercase`), so the source string changes from "Compliance
overview" to "Status - overview" to produce "STATUS - OVERVIEW" on screen.

The guided-tour step that targets the same strip (`WALKTHROUGH_DASHBOARD`,
`src/legacy-app.js`) is renamed to match ("Status Overview", no hyphen —
consistent with that list's other plain-phrase titles) and its description
no longer claims to track "filings pending court review" (see #4).
`tests/e2e/guided-tour-navigation.spec.ts`'s step-title assertion is updated
to match.

### 4. Remove "Pending Court Review" card

Removed the fourth stat card from `renderDashboardSummary()`'s primary
metric strip. `getDashboardMetrics()` (`view-model.js`) still computes
`pendingCourtReview` — it's cheap, semantically real (a ward's
`workflowStatus`), and removing it would also require rewriting
`dashboard-view-model.spec.js`'s exact-shape assertion for no functional
gain, since nothing else currently reads that unused field either way.
`tests/e2e/routes.spec.ts`'s primary-metric-strip count/assertions are
updated (3 cards → 2; the "Pending Court Review" containment check removed).

### 5. Button order swap

`dashboardHeaderHTML()` (`src/features/dashboard/index.js`) rendered New
Form, Export All Filings, New Filing from Existing. Swapped the first two:
Export All Filings, New Form, New Filing from Existing.

### 6-7. Sidebar resources disclaimer: wording, size, and a circuit notice

`resourcesPanelHTML()` (`src/features/dashboard/resources.js`):
- Contractions removed: "isn't affiliated" → "is not affiliated", "doesn't
  control" → "does not control".
- `.sidebar-resource-disclaimer`'s font-size raised from `.71rem` to
  `.875rem` (+2pt equivalent at a 16px root).
- A second paragraph added, same container/style: "This application is
  tuned for local requirements for the 6th Judicial Circuit. Please review
  requirements for other Florida Judicial Circuits before using." The
  disclaimer text is now two `<p>` elements inside the one bordered
  container (not two separate boxes), so `shell.css` gained two small rules
  for inter-paragraph spacing.
- `tests/unit/dashboard-resources.spec.js` and
  `tests/unit/content-corrections.spec.js` (a source-text scan) updated for
  the corrected wording.

### 8. Sixth Circuit as the first-use default (localStorage preference)

Before this, "6" was a bare fallback constant repeated across
`resourcesPanelHTML()`'s default parameter/clamp and
`renderSidebarResources()`'s derivation chain — correct in effect (first-use
already showed circuit 6) but not an explicit, user-adjustable preference.

Added `getDefaultCircuitPreference()` / `setDefaultCircuitPreference()` to
`resources.js`, backed by a new `pg-default-circuit` localStorage key
(plain, non-sensitive UI default — deliberately not the IndexedDB
`pg-launch-pref` store other launch preferences use, and deliberately
separate from `caseFile.selectedCircuit`, which stays per-case, persisted in
the `.sav` file's appState). Defaults to 6 with nothing stored, out of
range, or if localStorage is unavailable.

Wired in two places:
- Every "no case-specific/derivable circuit" fallback (`resourcesPanelHTML`,
  `renderSidebarResources`) now ends in `getDefaultCircuitPreference()`
  instead of a bare `6`.
- The circuit `<select>`'s change handler now also calls
  `setDefaultCircuitPreference(newCircuit)` alongside its existing
  `caseFile.selectedCircuit` write, so an explicit pick becomes this
  device's remembered default for future cases too.

New tests in `tests/unit/dashboard-resources.spec.js`: defaults to 6 with
nothing stored; set/get round-trip; out-of-range values ignored on both
write and read; `resourcesPanelHTML()` falls back to the stored preference
when `selectedCircuit` is omitted.

### 9. Rename "Probate Guardian" → "Guardian Forms" throughout the app

Full-repo search for the literal string "Probate Guardian", then every
in-scope hit categorized before any file was touched. Scope: user-facing UI
text, PDF metadata, the standalone help guide, and the PWA manifest —
**not** developer-facing source comments or repo docs (README, AGENTS.md,
MILESTONE-\*.md, `docs/`), which describe the codebase to contributors, not
the app to a filer.

**Changed (22 source files + `help/index.html` + `manifest.json`, 74 literal
occurrences):**
- `index.html`: page `<title>`, sidebar brand heading, mobile top-bar title,
  Help panel subtitle, Terms of Use modal (x2), startup-choice modal title,
  unlock modal title (8).
- `help/index.html`: guide `<title>`, TOC brand, intro heading/lead
  paragraph, start-dialog description and screenshot alt text, unlock
  screenshot alt text, Report-a-Bug description, Helpful Resources
  disclaimer (x2, including a contraction fix item 6 had missed on this
  file specifically), "nothing leaves your device" privacy note, guide
  footer note (15).
- `manifest.json`: `name` and `short_name` (2) — the installed PWA's name
  and home-screen label.
- `src/legacy-app.js`: unlock modal title (JS-set, mirrors the HTML
  default), exported Activity Log header, native file-picker description,
  three "not a valid file" error messages, drag-and-drop error, in-app
  "About" section heading + description (9).
- `src/core/persistence/case-file.js`: three native file-picker
  descriptions (open/case/backup), two "not a valid file" error messages
  (5).
- PDF metadata (`author`/`creator` fields) in all six filing types'
  `pdf-model.js` (guardian-inventory, annual-accounting,
  simplified-accounting, plan-annual, plan-initial, plan-minor,
  plan-simplified) — 12 occurrences. This is invisible on the printed
  page/court form itself (confirmed — no filing type prints the app name in
  visible body text), but does change what a PDF viewer's Document
  Properties reports as Author/Creator on every exported filing going
  forward.
- `src/core/pdf/pdf-accessibility.js`: the same default author, plus the
  embedded XMP `<pdf:Producer>` tag PDF/UA accessibility metadata carries
  (2).
- One occurrence each in: `src/features/dashboard/resources.js` (sidebar
  disclaimer), `src/features/help/help-content.js` (in-app Help panel
  welcome, 2 occurrences), `src/core/filing/schedule-doc-ack.js`,
  `src/core/pdf/pdf-preview.js` (new-version-deployed reload prompt),
  `src/tab-state.js` (multi-tab warning), `src/tab-coordination.js`
  (multi-tab toast), `src/pwa-ui.js` (PWA update notice),
  `src/core/feedback/feedback-message.js` (bug/comment email subjects+
  bodies, 4), `src/core/feedback/feedback-modal.js` (feedback modal intro),
  `fragments/common-modals.html` (feedback rating question), `sw.js`
  (offline fallback page), `src/main.js` (boot console log).

**Deliberately not changed — code identifiers, confirmed clean:** no class
name, field name, variable, or function identifier anywhere in `src/`
literally contains "Probate Guardian" (JS identifiers can't contain the
space, so the closest candidates were checked by hand):
- `'probate-guardian-case'` — the archive-format tag every exported `.sav`
  file's `manifest.json` carries (`case-file.js`, written; `legacy-app.js`
  and `case-file.js`, checked on import). **Left unchanged on purpose** —
  it is a lowercase-hyphenated persisted compatibility value, not a display
  label, and changing it would make every `.sav` file exported before this
  change unreadable ("Not a Guardian Forms data file") the moment it's
  reopened. This is exactly the kind of thing your "tell me if it seems
  like that might be the case" was watching for — flagging it even though
  it didn't literally match "Probate Guardian" and so wasn't itself in
  scope.
- `pg-`-prefixed element ids/classes (`pg-terms-title`, `pg-terms-intro`,
  `pg-terms-logo`, etc.) are an abbreviation convention, not the literal
  phrase, and unaffected.

**Flagged, not changed — a design decision, not a text match:** two
decorative, `aria-hidden` "PG" monogram/logo marks (`index.html`'s sidebar
brand icon and the Terms of Use modal header) are a two-letter initial
derived from the old name. They don't literally contain "Probate Guardian"
so they were out of the search's scope, but they'll read oddly next to
"Guardian Forms" elsewhere in the UI. Left alone pending your call on
whether/how to re-mark them (e.g. "GF").

**Excluded on purpose (developer-facing, not the app):** source code
comments (`excel-engine.js`, `crypto.js`, `src/core/types/index.js`,
`app.css`) and repo docs (`README.md`, `AGENTS.md`, `MILESTONE-*.md`,
`docs/*`, `HOW-TO-RUN.txt`, `lib/VENDORED-LIBRARIES.md`). Also excluded:
`help.md` and `WCAG_2.1_AA_regex-structural.md`, two untracked files in the
repo root that predate this session and aren't part of the shipped app.

**Tests:** `tests/unit/dashboard-resources.spec.js` updated (one assertion
carried the old disclaimer text). Nine e2e specs still assert the old name
and were **not** touched, per instruction to hold e2e work — the next
session's e2e pass needs to update:
`pdf-accessibility-and-signatures.spec.ts`, `pdf-structure-tags.spec.ts`,
`plan-initial-mount.spec.ts`, `plan-minor-mount.spec.ts`, `offline.spec.ts`,
`plan-annual-mount.spec.ts`, `plan-simplified-mount.spec.ts`,
`simplified-mount.spec.ts`, `tab-and-update.spec.ts`. (Done in the
Verification follow-up pass below.)

Verification: full-repo re-scan for `Probate Guardian` after the change
matches only the excluded comment/doc files above (and gitignored `dist/`
build output, which regenerates from source). `npm run test:unit`:
1308/1308 green.

### 10. Three new dashboard summary cards, six-across even layout

Added Total Filings, Total Open Filings, and Total Closed Filings to the
dashboard's summary strip, alongside the existing Action Items / Exceptions,
Approaching Deadlines, and Active Filings — six cards total.

- `src/features/dashboard/view-model.js`'s `getDashboardMetrics()` now takes
  every projected ward (previously only the pre-filtered active ones — safe,
  since it already excluded archived wards internally for the other three
  fields) and returns three more counts: `totalFilings` (all wards),
  `totalOpenFilings` (not archived — the same value the existing "Active
  Filings" card already showed), `totalClosedFilings` (archived). "Closed"
  here is `ward.isArchived`, the same flag `dashboardPriority()` and the
  Mark Closed/Mark Open toggle already use — not a new status.
- `src/features/dashboard/index.js`'s `renderDashboardSummary()` now calls
  `getDashboardMetrics()` once with every ward and reads all six values from
  it, instead of separately computing `activeWards.length` inline.
- **Note:** "Active Filings" and "Total Open Filings" are now two cards
  showing the identical number (both = not-archived count). Added as
  literally requested rather than merged — flagging in case that overlap
  wasn't intended once you see it live.
- `src/styles/dashboard.css`: `.dashboard-summary-strip` changed from three
  equal columns plus one narrow one (`repeat(3,1fr) minmax(110px,.55fr)`,
  sized for the old 4-card layout) to six even columns
  (`repeat(6,minmax(0,1fr))`) on one line at full desktop width. The
  dashboard's responsive rules key off the dashboard panel's own container
  width, not the viewport (documented in-file: the sidebar eats a fixed
  slice of window width, so viewport breakpoints see the wrong number) —
  added a new step at 900px container width down to 3 columns (2 rows)
  before the existing 780px step to 2 columns (3 rows), sized for six
  ~130px cards rather than the four the scale was originally tuned for.

New/updated tests in `tests/unit/dashboard-view-model.spec.js`: the existing
`getDashboardMetrics()` shape assertion extended for the three new fields;
a new case with a mix of open and closed wards, including a closed ward
that would otherwise count as an overdue action item, proving the three new
counts include closed wards while the three existing metrics still exclude
them correctly (not just a coincidental zero).

`renderDashboardSummary()` itself isn't exported and manipulates the DOM
directly (`document.getElementById`), so — matching how this file's other
render functions are covered — its own rendering is e2e territory; the unit
coverage above is for the computation it depends on
(`getDashboardMetrics()`), same split as the pre-existing "Active Filings"
number always had. `tests/e2e/routes.spec.ts`'s existing primary-metric-strip
assertion (`:not(.dashboard-stat-secondary)` count) still holds unmodified,
since all three new cards use the same `.dashboard-stat-secondary` class as
Active Filings; `dashboard-visual.spec.ts` has a layout-overflow check that
would exercise the new breakpoints if run. Neither was touched or run, per
instruction to hold e2e work this session.

### 11. "Offline access" notice asked once per device

**Status: implemented; unit-tested; e2e held.**

The hosted PWA build offers "Offline access available" (`pwa-ui.js`,
`offerOfflinePack()`) on every load until the offline pack is downloaded, so a
filer who clicked Dismiss saw it again next visit.

- New `src/core/offline-access-preference.js` (modeled on
  `theme-preference.js`): a per-device flag, localStorage key
  `pg-offline-access-answered`, value `'accepted'` (clicked Download) or
  `'dismissed'` (clicked Dismiss on the offer). Reads/writes are guarded for
  storage that throws or is absent. Kept out of `pwa-ui.js` because that file
  has top-level side effects that need a live `document`, so its decision
  logic couldn't be unit-tested there.
- `shouldOfferOfflineAccess(status)` decides whether to show the offer:
  nothing to offer when offline access is unavailable or already ready; first
  use -> ask; `'dismissed'` -> stay quiet; **flag absent -> ask** (cleared
  local cache, as requested); `'accepted'` -> ask again.
- **"Unless it becomes relevant" is my interpretation, not spelled out:** I
  read it as "the filer said yes but this version's pack isn't downloaded" --
  a new version shipped (the pack is per-version) or the earlier download
  didn't finish -- so an `'accepted'` answer with the pack not ready
  re-offers, while `'dismissed'` stays quiet even across versions. If you
  meant something narrower or wider (e.g. also re-ask a dismisser after a new
  version), it's a one-line change in `shouldOfferOfflineAccess()`.
- The other PWA notices (Update ready, Preparing/ready/incomplete, unavailable)
  are separate and unaffected. The download-failure notice's Retry/Dismiss
  doesn't change the answer, so a filer who accepted and hit a failed download
  is offered it again next load.
- `help/index.html`'s "Offline access" paragraph updated to say the notice
  isn't shown again unless site data is cleared or a later version's files
  haven't been downloaded.

Tests: new `tests/unit/offline-access-preference.spec.js` (10 tests) --
round-trip, invalid/throwing/absent storage, first-use offer, dismissed stays
quiet, flag-cleared re-offers, accepted-but-not-ready re-offers, ready/
unavailable never offer. `pwa-ui.js`'s wiring (two click handlers) is not
unit-reachable; `tests/e2e/offline.spec.ts` covers the notice in a browser
and was not run or edited, per the standing hold on e2e.

### 12. Activity Log: automatic saves are no longer logged

**Status: implemented; unit-tested; e2e held.**

Every save to the open `.sav` file wrote a "Backup saved" entry
(`DATA_EXPORT`) to the Activity Log — including the debounced save after
each edit and the interval sweep — so a working session filled the log with
"Auto-saved N form(s) in the background" and pushed out the entries that
matter (unlocks, failed attempts, manual backups, restores). The log also
rides inside every save, so it grew the file each time.

- `writeCaseToHandle(handle, viaTimer)` (`src/core/persistence/case-file.js`)
  no longer logs when `viaTimer` is true. That flag is set by both automatic
  paths — `silentAutoExport()` (interval) and `saveData()` in `legacy-app.js`
  (per-edit debounce) — so both are covered by the one change. Manual saves
  (`saveBackupNow()` → `viaTimer=false`, and `exportCaseFileZip()`) still log.
- `beginRecordingExport(message, wardId, { log = true })` gained a `log`
  option. With `log:false` it still advances the save clock, so the "Last
  backup" indicator and the auto-save status are unchanged, but writes no
  entry and its rollback doesn't truncate the log.
- The old "Auto-saved N form(s) in the background" message no longer exists.
- Failed automatic writes were never logged (only the manual export path logs
  failures), so nothing changes there.
- **Existing entries are not removed.** A `.sav` saved before this change may
  still hold a run of "Auto-saved…" rows; they'll keep showing in its Activity
  Log. Hiding or purging them is a separate decision — say if you want it.

Descriptions updated to say only manual saves are logged:
- The Activity Log page's description card (`pageActivityLog()` in
  `legacy-app.js`): "…and every backup you save manually or restore.
  Automatic saves are not logged."
- In-app Help panel (`help-content.js`, two places) and the standalone user
  guide (`help/index.html`: the Activity Log paragraph and the privacy bullet).

Tests (`tests/unit/case-file.spec.js`, new "activity log: automatic saves are
not logged" block, 5 tests): `log:false` advances the clock with no entry and
its rollback leaves other entries alone; the default still logs; an automatic
`writeCaseToHandle` writes nothing to the log but still sets the last-backup
time; a manual one logs "Saved N form(s) to existing backup file"; a failed
automatic write leaves both the log and the clock untouched. The debounced
`saveData()` call site itself lives in the classic script `legacy-app.js`, so
it's covered through `writeCaseToHandle` rather than directly. No e2e was run
or edited, per the standing hold; `dashboard-backup.spec.ts` and
`backup-restore-sav.spec.ts` read `auditLog.enc` but only assert on entries
their own tests add or on manual exports.

## Verification

- `npm run test:unit`: full suite green, 1324/1324.
- **Full regression (`npm test`, run on the requester's go-ahead): unit
  1324/1324; e2e 696 passed, 6 skipped, 14 failed (1.0 h).** All 14 failures
  are stale expectations of the old app name; the app is emitting "Guardian
  Forms" as item 9 intends. Each was read, not assumed: the nine snapshot
  failures (`plan-annual`/`plan-initial`/`plan-minor`/`plan-simplified`-mount
  x2 each, `simplified-mount` x1) differ from the expected text by exactly one
  line — the supporting-documents hint — and only in the app name, so the
  byte-for-byte snapshots hid no unintended change. The rest: two PDF-metadata
  specs (`pdf-accessibility-and-signatures` expects Author "Probate Guardian";
  `pdf-structure-tags` expects it in the XMP) and three `tab-and-update`
  assertions (multi-tab warning x2, update-ready notice). Fixed in the
  follow-up pass below.
- **No other e2e failure**, so nothing else in items 1-12 broke a browser test.
  The specs covering the dashboard surfaces items 3-5 and 10 changed
  (`routes.spec.ts`, `guided-tour-navigation.spec.ts`, `dashboard-visual.spec.ts`,
  incl. its overflow check at the new six-card layout) and the backup/restore
  specs that read the Activity Log (item 12) all passed. Items 1, 8 and 12's
  *new behavior* is covered by unit tests only — no e2e asserts the Comment
  Card is hidden, the circuit preference persists, or that automatic saves
  aren't logged. Item 11's once-per-device flag is likewise unit-only; the
  notice itself is exercised by the web profile below.
- `offline.spec.ts` (5 tests) and `feature-load-failure.spec.ts`'s hashed-build
  case run only on the built hosted target, so `npm test` (source target)
  skipped them — the 6 skips.

### Follow-up pass (same session, on the requester's go-ahead)

- **The 14 stale assertions updated to "Guardian Forms"** — only the expected
  strings changed — across nine specs: the eight above plus `offline.spec.ts`'s
  page title (`toHaveTitle('Guardian Forms App')`). The eight source-target
  specs re-run together: 49/49 green.
- **`npm run test:e2e:web`: 27 passed, 1 skipped, 3 failed, 4 did not run**
  (first web-profile run since at least 2026-09-11, see below). The profile
  covers item 11's notice and the built-output side of item 9 (manifest name,
  `sw.js` recovery page, page title). The three failures:
  - `offline.spec.ts` "first load installs the atomic critical shell" (whose
    failure left the other four un-run) and `pwa-registration.spec.ts` —
    **a broken wait in the tests, not an app failure.** Both waited with
    `page.waitForFunction(async () => …?.active)`. Playwright (1.62) does not
    await an async predicate: the returned Promise is truthy, so the wait
    resolved on the first poll, and the tests passed until now only because
    the worker happened to be active by `networkidle`. Verified against the
    pre-MS 62 baseline (f60265d, built in a scratch worktree): there the worker
    is active at `networkidle` in 12/12 loads; on this build it is still
    installing in 11/12. The difference is real (ports swapped, same result):
    registration starts ~130 ms later and the install runs ~150 ms longer, with
    the same 30 critical entries and the same byte count. The cause was not
    isolated — the worker still activates in ~1.3 s and nothing is filer-
    visible — so it is noted here, not chased. Fix: both waits now use
    `navigator.serviceWorker.ready` (`offline.spec.ts` `waitForActiveWorker`,
    `pwa-registration.spec.ts` line 11). Re-run with the fix: `offline.spec.ts`
    5/5 and `pwa-registration.spec.ts` 1/1 green, which also proves item 11's
    notice and the rename in the built output.
  - `feature-load-failure.spec.ts` "(web, hashed build)" — **pre-existing;
    fails identically on the f60265d baseline.** The test expects a failed
    dashboard chunk to show "This section could not be loaded." with a Reload
    button. Since 60b0133 (2026-09-11) `src/features-loader.js` listens for
    `vite:preloadError` and reloads the page instead; reproduced in a probe
    against this build (one aborted chunk request → the loader's "Reloading
    page..." warning → full reload → "Loading…"). The test was written two days
    earlier (390e165) and this profile has evidently not been run since. Which
    behavior is wanted — reload, or the error view the test describes — is a
    decision not made here; the test is left as is.
- The web-profile fixes and the pre-existing failure are outside the twelve
  items; they are recorded here because this is where the run happened.
