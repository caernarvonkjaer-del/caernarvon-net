# Milestone 62: Pre-Test State Checklist

## Status

**Proposed & implemented same session.** Four small, low-risk dashboard
changes requested ahead of an upcoming test session (ticket #820024). None
touch persisted case data, validation, or export logic.

## Items

| # | Change | Reversibility |
| :-- | :-- | :-- |
| 1 | Hide the "Comment Card" dashboard toolbar link | Flag-gated — flip one constant to reinstate |
| 2 | Label the dashboard as a test system (#820024) | One line to remove |
| 3 | Rename the "Compliance Overview" kicker to "Status - Overview" | One line to revert |
| 4 | Remove the "Pending Court Review" summary card | Markup deleted; underlying metric computation left intact |
| 5 | Swap "Export All Filings" and "New Form" button order | Two lines to revert |
| 6 | Remove contractions + increase font size in the sidebar resources disclaimer | CSS value + text |
| 7 | Add a Sixth Circuit tuning notice below the disclaimer | New paragraph |
| 8 | Sixth Judicial Circuit as the first-use default, user-changeable, stored in localStorage | New module-level preference, additive |

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

Appended `#820024 TEST SYSTEM` to the end of the dashboard `<h1>` ("All
Filings — Dashboard"), so anyone in the test session sees at a glance that
this is not the production instance.

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

## Verification

- `npm run test:unit`: full suite green, 1308/1308.
- e2e specs touched (`routes.spec.ts`, `guided-tour-navigation.spec.ts`)
  updated by hand to match; not run in this session — see note in
  `MILESTONE-57-REVIEW-HANDOFF.md` about this environment's Playwright
  availability varying by session.
