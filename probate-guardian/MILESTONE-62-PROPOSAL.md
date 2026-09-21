# Milestone 62: Pre-Test State Checklist

## Status

**Proposed & implemented same session.** Ten small, low-risk dashboard/app
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
`simplified-mount.spec.ts`, `tab-and-update.spec.ts`.

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

## Verification

- `npm run test:unit`: full suite green, 1309/1309.
- e2e specs touched by hand for items 1-8 (`routes.spec.ts`,
  `guided-tour-navigation.spec.ts`); items 9-10's e2e specs were
  **deliberately left unupdated and unrun, on the requester's explicit
  authority** ("skip e2e, document on my authority" — any resulting
  failures are expected to surface and be fixed the next time a full suite
  runs for other work, not treated as a gap in this milestone). See each
  item's own section above for exactly which files are affected. Nothing
  was run against a real browser this session — see note in
  `MILESTONE-57-REVIEW-HANDOFF.md`
  about this environment's Playwright availability varying by session.
