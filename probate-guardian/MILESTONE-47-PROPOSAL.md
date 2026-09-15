# Milestone 47: Dashboard Header Button Unification & Helpful Resources Panel

## Status

**Landed 2026-09-14 as 47A + 47B. This document is a backfill, written
2026-09-15 at Alan's request.**

Unlike every other numbered milestone in this repo, 47A and 47B were
implemented and committed straight to `master` with no
`MILESTONE-47-PROPOSAL.md` ever existing first — confirmed exhaustively:
no file by that name (or any close variant) appears anywhere in this
repo's git history, on any branch (`master`, `standardize-completion-badges`,
`unified-case-file-rewrite`, all corresponding remotes), or in any of the
135 dangling/unreachable commits still sitting in the local object
database from old rebases. It was never written, not lost or deleted.

Both commits were authored by `egarrett021` (Garrett, a GitHub collaborator
on this project) with `Co-Authored-By: Claude Opus 5`:

- `31f3396` — 2026-09-14 15:50:16 — "feat: unify the three dashboard header
  buttons (Milestone 47A)"
- `e7cab87` — 2026-09-14 15:50:30 — "feat: Helpful Resources panel in the
  dashboard sidebar (Milestone 47B)"

This document reconstructs what shipped from those two commits' diffs and
messages, in the format this repo's other milestone docs use, so 47 has
the same paper trail. It does not represent a plan that was reviewed and
authorized before the fact — that step didn't happen here.

**Open provenance question:** 47B's commit message references "Decision
D4" and "the proposal's draft wording, which Q2 flag 2 still has open" —
phrasing that matches this repo's own lettered-decision/flagged-question
convention (see `MILESTONE-42-PROPOSAL.md`'s "Q2" numbering, `39-D`-style
gate items). That strongly suggests a real proposal document existed
somewhere — a local file, a chat transcript, notes — that guided the
implementation but was never committed to the repo. If Garrett still has
it, it should replace or supplement this backfill rather than be treated
as lost; this document reverse-engineers the same ground from code alone
and cannot recover whatever "Q2 flag 2" actually asked.

---

## 47A: Dashboard Header Button Unification

### Observed (pre-47A)

The dashboard header's three action buttons — New Form, Export All
Filings, New Filing from Existing — used three different Bootstrap button
styles (`btn-outline-primary`, `btn-outline-secondary`, `btn-primary`
respectively), and New Form sat inside its own `.dashboard-filing-controls`
wrapper with a right border, visually separating it from the other two.
That wrapper's own code comment said it existed because the controls it
originally held (Close/Rename/Delete, moved here in Milestone 36-1) "act
on the active filing" — but Close and Delete had since moved again into
each row's own Actions cell (per that same comment, still present
pre-47A), leaving only New Form in a divider wrapper built for three
buttons that were never inconsistent with each other in the first place.

### Fix

`src/features/dashboard/index.js`'s `dashboardHeaderHTML()`: all three
buttons now render `btn-primary` plus a new shared `.dashboard-header-btn`
class; the `.dashboard-filing-controls` wrapper around New Form is removed
entirely (button renders inline with its siblings). `src/styles/dashboard.css`:
the wrapper's border-right/padding rules and its mobile-breakpoint override
are deleted; `.dashboard-header-btn{white-space:nowrap;min-height:31px;}`
replaces `.dashboard-new-existing`'s equivalent single-selector rule so all
three buttons share it, not just one.

### Verification

`tests/e2e/routes.spec.ts` (extended, not new): asserts
`.dashboard-filing-controls` no longer exists, all three header buttons
are `btn-primary` (and explicitly not `btn-outline`), and that background
color, border color, text color, and height are identical across all three
in both light and dark themes (read via `getComputedStyle`, with CSS
transitions disabled during the read to avoid a mid-fade false negative,
and a theme-token check confirming the dark-mode read actually ran under
dark mode). Re-run 2026-09-15 against current `master`: passes.

---

## 47B: Helpful Resources Panel in the Dashboard Sidebar

### Observed (pre-47B)

On the Dashboard — one of `SPECIAL_PAGES`, with no `activeInventoryType`
and therefore no filing-specific nav checklist to show — the sidebar's
`#nav-sections` container rendered empty, leaving a blank gap between the
ward picker and the Save Controls section at the bottom.

### Design

A new `#sidebar-resources` panel fills that gap on the Dashboard only,
with static links: Florida statewide resources always, plus Pinellas,
Pasco, and Sixth Judicial Circuit links when relevant. County-scoping
policy ("Decision D4", per the commit message): show a county's group
if any filing in the case has that county; show **both** Pinellas and
Pasco (and, transitively, the Sixth Circuit group) when no filing has a
county set yet, rather than showing neither. The Sixth Circuit group
additionally shows if `hasSixthCircuitLocalGuidance()` matches any present
county (existing helper from `src/core/filing/county-guidance.js`,
Milestone 37-1).

### Implementation

- **`src/features/dashboard/resources.js`** (new, pure module, no `window`
  dependency at import time): `RESOURCE_GROUPS` — a frozen directory of
  four groups (Pinellas, Pasco, Sixth Circuit, Florida), each a frozen list
  of frozen `{id, label, description, url}` links, all `https:` URLs on an
  explicit host allowlist enforced by its own test. `groupsForCounties(counties)`
  implements Decision D4's filter. `resourcesPanelHTML(groups, {esc, ic})`
  renders the markup; every link is `target="_blank" rel="noopener noreferrer"`
  with a visually-hidden "(opens in a new tab)" suffix, and the panel ends
  with a fixed disclaimer: "These are independent government and
  third-party sites. Probate Guardian isn't affiliated with them and
  doesn't control their content." (per the commit message, this wording
  came from the uncommitted proposal and was still open under "Q2 flag 2"
  at landing time — treat it as provisional, not necessarily final, until
  that flag's resolution is known).
- **`index.html`**: new `<div class="nav-section sidebar-scroll
  sidebar-resources" id="sidebar-resources" hidden></div>`, sitting between
  `#nav-sections` and the Save Controls section.
- **`src/features/dashboard/index.js`**: `renderSidebarResources()` reads
  the case's wards' counties (via `countyOf()` + `normalizeCountyName()`),
  computes the group list, and renders it into `#sidebar-resources`,
  unhiding it. Called from both `renderDashboardPage()` (re-renders while
  already mounted) and the feature's `mount()` (first render). `dispose()`
  empties and re-hides the panel, so leaving the Dashboard for a filing
  doesn't leave stale resource links mounted underneath that filing's real
  nav checklist.
- **`src/styles/shell.css`**: `#nav-sections:empty{display:none;}` stops
  the now-usually-empty filing-nav container from claiming flex space of
  its own; `#sidebar-resources[hidden]{display:none;}` plus new
  `.sidebar-resource-link`/`.sidebar-resource-desc`/`.sidebar-resource-disclaimer`
  rules style the panel using the sidebar's existing nav-section visual
  language (`.nav-section-label` reused directly for group headings).

### Verification

- **`tests/unit/dashboard-resources.spec.js`** (new, 12 tests): every group/link
  object is frozen; link ids are unique across all groups; every URL is
  `https:` with a hostname on an explicit allowlist; `groupsForCounties()`
  matches Decision D4 for `[]`, a non-Pinellas/Pasco county, `['pinellas']`,
  `['pasco']`, and a mixed/duplicate/blank input; `resourcesPanelHTML()`
  escapes heading/label/description text, returns `''` for no groups,
  gives every anchor both `noopener` and `noreferrer`, and includes the
  `aria-labelledby` pairing and disclaimer text. Re-run 2026-09-15 against
  current `master`: **12/12 passing.**
- **`tests/e2e/routes.spec.ts`** (extended): panel shows on the Dashboard,
  hides when a filing is opened, and reappears on return. Re-run
  2026-09-15 against current `master` inside the full `routes.spec.ts`
  file: the 47A/47B-specific assertions pass; one unrelated test in the
  same file (`all 9 form types render a standardized summary page at
  /summary`) timed out waiting on the startup overlay. Neither 47A's nor
  47B's diff touches `/summary` or the startup-overlay flow, and the
  working tree had a large, unrelated set of uncommitted changes in
  progress elsewhere in the app at the time of this re-run (a separate,
  concurrent session's work) — the timeout is attributed to that transient
  state, not to anything in this milestone, but wasn't re-confirmed against
  a clean tree.

### Cross-cutting notes (`AGENTS.md` §8)

**Legal/Compliance:** the panel links to government and third-party sites
by design; the disclaimer's exact wording was still an open flag ("Q2 flag
2") at landing time per the commit message — worth closing that out
explicitly with Garrett rather than assuming the shipped wording is final.
**UI/UX Consistency:** reuses `.nav-section-label` and the sidebar's
existing visual language rather than inventing new panel chrome — consistent
with this repo's stated preference for extending existing patterns.
