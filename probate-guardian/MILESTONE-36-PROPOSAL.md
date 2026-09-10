# Milestone 36: Dashboard Consolidation, Responsive Form Alignment, and Output Corrections

## Status

**Proposed — not started.** Eleven requested changes plus seven validated defects
from an external QA pass, grouped into seven sequentially executable sub-milestones
(36-1 through 36-7). Every problem statement below was root-caused by direct code
read against `master` at `78ee85a`, not inferred from the request text; file and
line citations are current as of that commit. The QA-sourced items in 36-6 and 36-7
were additionally reproduced against a running build before being accepted — see
the QA Findings Triage appendix for what was accepted, rejected, and left open.

Two scope questions were resolved with the requester before drafting:

- **"Align the top and bottom buttons in the list"** means the **per-row action
  buttons inside the triage list** (Open / Backup / PDF / New year / Prior years /
  Archive / Delete), not the page-header or archived-section buttons.
- **Filing controls move entirely.** The sidebar's Ward Picker control block is
  removed, not duplicated. The sidebar keeps the active-filing name and the schedule
  list, which gains the vertical room.

---

## Requested Change Inventory

| # | Request | Sub-milestone |
|---|---|---|
| 1 | Dashboard column names sortable like Excel | 36-2 |
| 2 | Auto-fill judge name for filings sharing a case number | 36-2 |
| 3 | Dashboard: professional view only | 36-1 |
| 4 | Move Close Active Filing out of the header into the right-hand button group | 36-1 |
| 5 | Align per-row action buttons; make them responsive | 36-1 |
| 6 | Move filing controls onto the dashboard | 36-1 |
| 7 | Fix schedule form-field alignment at all screen sizes; tablet and small especially | 36-3 |
| 8 | PDF margins always 1 inch | 36-4 |
| 9 | Remove duplicated header titles from PDF output | 36-4 |
| 10 | Remove Pinellas-County-specific standards from descriptions | 36-5 |
| 11 | Part VIII "Required to continue" must read "I certify there are no trusts" | 36-5 |

Items 10 and 11 arrived after the initial list and are folded into 36-5.

Seven further defects came from an external QA pass and were independently
reproduced before acceptance:

| # | Defect | Sub-milestone |
|---|---|---|
| 12 | Initial Plan question F never persists and has no accessible name | 36-6 |
| 13 | Section checklist and export validator enforce different rules | 36-6 |
| 14 | Spaces stripped mid-typing in Annual/Final/Trust Accounting name fields | 36-6 |
| 15 | Bar number silently truncated to six digits | 36-6 |
| 16 | Sidebar Active Filing switcher never switches filings | 36-7 |
| 17 | Carryover picker offers only one source filing out of several | 36-7 |
| 18 | No warning when a minor-only form is created for an adult ward | 36-7 |

Four further QA claims were rejected or left unverified; the appendix records
each with its evidence.

---

## Milestone 36-1: Dashboard Shell Consolidation

### Problem Statement

The dashboard currently ships three mutually exclusive layouts behind a role
preference, and the filing controls live in a fourth place entirely.

- **Three roles, two renderers.** `preferences.js:4` defines
  `DASHBOARD_ROLES = new Set(['family', 'professional', 'assistant'])` with `family`
  as the persisted default (`DEFAULT_PREFERENCES.role`). `index.js:59`'s
  `isTriageRole()` routes `professional` and `assistant` to `renderTriageQueue()`
  and everything else to `renderFamilyDashboard()` (`index.js:553`). The two roles
  that share the triage renderer still differ: `triageControlsHTML()`
  (`index.js:97`) shows an Assignment filter for `professional` only, while
  `dashboardHeaderHTML()` (`index.js:150`) shows a "Working on behalf of"
  supervisor filter for `assistant` only. `renderDashboardWorklist()` hides the
  deadlines/recent panel entirely for both triage roles, so the family role is the
  only consumer of a whole rendering path.
- **The role chooser is unavoidable on first run.** `onboardingHTML()`
  (`index.js:176`) renders a three-button "Choose your dashboard view" banner until
  dismissed, and `roleControlHTML()` (`index.js:75`) renders a persistent `View`
  select in the page header.
- **Close Active Filing is grouped with page-level actions, not filing actions.**
  `index.js:158` builds `closeLoadedWardBtn` and `index.js:167` emits it as the
  first child of `.dashboard-header-actions`, ahead of Export All Filings, the View
  select, and New Filing from Existing. It is a filing control sitting in a row of
  dashboard controls.
- **Filing controls live in the sidebar.** `index.html:54-73` holds the Ward Picker
  section: the combobox, a `Hide filing controls` toggle, `Switch Filing`,
  `+ New Form`, and a `.ward-picker-actions` row of Close / Rename / Delete. Every
  one of these acts on a filing, and every one of them is invisible from the
  dashboard, which is where filings are chosen.
- **Row action buttons do not align column-to-column.** `triageActionButtons()`
  (`index.js:476`) emits a flat button list in which `Prior years` is conditional on
  `row.sourceWard.years?.length`. Two adjacent rows therefore carry six and seven
  buttons, and because `.dashboard-triage-actions` is a plain flex row, every button
  after the insertion point shifts horizontally relative to the row above it. At
  `@container triage-queue (max-width:1040px)` the grid collapses to two columns
  (`dashboard.css:236`) and the action cell inherits whatever width remains.

### Implementation Tasks

1. **Collapse to a single professional layout.** Delete `renderFamilyDashboard()`,
   `roleControlHTML()`, `onboardingHTML()`, and `isTriageRole()`; call
   `renderTriageQueue()` unconditionally from `renderDashboardGrid()`. Keep the
   archived/closed section, which both branches shared.
2. **Retire the role preference with a migration, not a deletion.**
   `validateDashboardPreferences()` must keep accepting the old key so an existing
   `pg-dashboard-preferences-v1` payload does not throw, and must normalize any
   stored `family`/`assistant` value to the single supported layout. Drop
   `onboardingDismissed`. Preserve `supervisingProfessionalFilter`, which is real
   filter state rather than layout state.
3. **Decide the two role-conditional filters.** With `assistant` gone, the
   "Working on behalf of" supervisor filter (`dashboardHeaderHTML()`) has no role
   that shows it. Keep the Assignment filter from `triageControlsHTML()` and remove
   the supervisor variant, or merge them into one control — this is a product call
   and should be settled before coding, not during.
4. **Move filing controls onto the dashboard.** Relocate Switch Filing, New Form,
   Close, Rename, and Delete from `index.html`'s Ward Picker section into one
   right-aligned filing-controls cluster in the dashboard header, and delete the
   `Hide filing controls` toggle along with the `.ward-collapsible` machinery that
   only existed to reclaim sidebar space. Close Active Filing (item 4) is one of
   these controls and joins the same cluster, which resolves items 4 and 6 as a
   single layout change rather than two competing ones.
5. **Audit every consumer of the removed sidebar markup before deleting it.**
   `applyWardControlsCollapsedState()` and the `toggle-ward-controls` shell action
   become dead code; `#close-ward-btn`, `#rename-ward-btn`, and `#delete-ward-btn`
   are referenced by id elsewhere in `legacy-app.js` and by the guided walkthrough.
   Grep for each id and each `data-shell-action` value and update or remove the
   handler — do not leave orphaned listeners.
6. **Make the action cell a grid, not a flex row.** Give
   `.dashboard-triage-actions` a fixed column template so each action lands in the
   same column on every row, and render `Prior years` as an always-present cell that
   is empty (not absent) when the filing has no prior years. This is what makes the
   buttons line up; hiding the button without reserving its cell does not.
7. **Give the action cell its own responsive rules.** Add container-query
   breakpoints under the existing `triage-queue` container so the action grid drops
   from one row to two rows to a single column as the queue narrows, rather than
   inheriting the two-column row collapse.

### Blast Radius

Removing the role select breaks four E2E specs that drive `#dashboard-role`
directly: `dashboard-visual.spec.ts:43,96`, `dashboard-backup.spec.ts:25,93`,
`routes.spec.ts:119-185`, and `case-file-protection.spec.ts:204`. `routes.spec.ts`
additionally asserts `.dashboard-family-row` counts and priority attributes, which
disappear with the family renderer. `tests/unit/dashboard-preferences.spec.js`
covers role validation and must be rewritten around the migration rather than
deleted. Every one of these is an intentional contract change, and each should be
updated in the same commit as the code so the suite never sits red.

---

## Milestone 36-2: Sortable Columns and Judge Auto-Fill

### Problem Statement

- **The header row is inert text.** `renderTriageQueue()` (`index.js:548`) emits
  `<div class="dashboard-triage-header"><span>Ward</span>…</div>` — eight plain
  spans with no controls, no `aria-sort`, and no click target. Sorting is available
  only through the separate `Sort` select in `triageControlsHTML()`
  (`index.js:118`), which offers four of the eight columns (Priority, Deadline, Last
  modified, Ward name) and is keyed to module state `_dashboardTriageSort`
  (`index.js:32`). `getTriageRows()` (`index.js:490`) applies it.
- **Judge is free text with no propagation.** The Judge column renders
  `assignmentControl()` (`index.js:472`), a bare text input bound to
  `data-dashboard-change="assignee"`. `updateDashboardWorkflow()` (`index.js:658`)
  writes the value to that one ward's `dashboardWorkflow.assigneeName` and stops.
  Three filings on the same case number therefore require the judge's name to be
  typed three times, with three chances to spell it differently — and the
  Assignment filter keys off `normalizeFilterKey(assigneeName)`, so a single typo
  silently splits one judge into two filter entries.

### Implementation Tasks

1. **Make each sortable header a button.** Replace the spans with
   `<button type="button" data-dashboard-sort="<key>">`, carrying `aria-sort` of
   `ascending`, `descending`, or `none`, and a visible direction indicator. Ward,
   Form Type, Case #, Status, Deadline, and Judge sort; Actions does not. Contacts
   is a multi-valued cell — either sort on the first contact's name and say so in
   the column's `title`, or leave it unsortable. Pick one deliberately.
2. **Extend the sort state to carry a direction.** `_dashboardTriageSort` is
   currently a bare key with hardcoded directions inside `getTriageRows()`.
   Replace it with `{ key, direction }` and make each comparator direction-aware.
   Clicking the active column flips direction; clicking a new column selects it at
   that column's natural default (name ascending, deadline ascending, last-modified
   descending).
3. **Keep the Sort select and the headers in sync, or remove the select.** Two
   independent controls writing one piece of state is a defect generator. The
   cleaner outcome is to delete the `Sort` select once every one of its options is
   reachable from a header, keeping only `Priority` — which is not a column — as a
   named default. Decide before coding.
4. **Preserve Priority as the default ordering.** `compareDashboardPriority()`
   (`view-model.js:181`) is the current default and encodes real triage semantics.
   An explicit column sort replaces it for that render only; it must not become
   unreachable.
5. **Propagate the judge across a case, on commit, with an undo path.** On
   `assignee` commit, find sibling filings by case number and offer to apply the
   same judge to them. Use `caseNumberOf()` from `core/case-resolver.js:32`, not
   `row.caseNumber` — the projected field (`view-model.js:161`) collapses
   `caseNumber || ucn || ref`, and only `caseNumberOf()` implements the documented
   planMinor `ucn || ref` precedence.
6. **Do not infer silently.** `case-resolver.js`'s header comment states the rule
   this codebase already committed to: *"Case linking is always an explicit user
   action … never inferred automatically from two filings happening to share typed
   text."* Auto-filling a judge across every filing with a matching case number on
   keystroke would violate that rule. Two designs respect it: fill only filings
   already linked to the same `caseId` (strongest, and free of the string-matching
   fragility the Case entity exists to fix), or prompt with an explicit
   "Also set this judge on N other filings for case X?" confirmation. **The
   caseId-linked design is recommended**; if case-number matching is chosen anyway,
   it must be confirmed rather than automatic.
7. **Write through the existing path.** Each affected sibling must go through
   `saveWardToState()` plus `markDirtySinceExport()`, exactly as
   `updateDashboardWorkflow()` does now, so a multi-filing update cannot leave the
   case file half-saved.

---

## Milestone 36-3: Schedule Form-Field Alignment Across Screen Sizes

### Problem Statement

Commit `056be3c` fixed this class of bug for `col-md-*` by making each field row an
inline-size container, and measured the result: columns narrower than 118px went
from 666 to 0, and labels wrapping to three or more lines went from 76 to 1. The fix
was scoped to one Bootstrap tier, and the remaining tier still has the original bug.

- **The container only exists on rows that contain a `col-md-*` child.**
  `cards.css:20` selects `.schedule-page .row:has(>[class*="col-md-"])`. A row built
  entirely from `col-lg-*` never becomes a container at all, so none of the
  container queries below it can ever match.
- **The rules inside only reset `col-md-*` widths.** `cards.css:25-38` lists
  `col-md-1` through `col-md-11` explicitly. Even inside a row that *is* a
  container, a `col-lg-*` sibling keeps its viewport-keyed Bootstrap width and
  falls out of alignment with the `col-md-*` columns beside it.
- **53 `col-lg-*` usages remain**, against 312 `col-md-*`, spread across all seven
  filing features. These are exactly the columns that still reason about the
  viewport rather than the card, which is the defect `056be3c` set out to fix.
- **Tablet is the worst case and is untested.** No E2E spec asserts field-row
  layout at tablet width; `dashboard-visual.spec.ts` covers a viewport matrix for
  the dashboard only. The 768–991px band is where `col-lg-*` sits at full desktop
  proportions inside a card that has already dropped to full width.

### Implementation Tasks

1. **Widen the container selector** to any `.schedule-page .row` carrying Bootstrap
   column children, not only `col-md-*`.
2. **Extend the container-query rules to `col-lg-*`** at the same three breakpoints
   (820px, 520px, 340px), matching each `col-lg-N` to the behavior its `col-md-N`
   counterpart already has.
3. **Re-measure, do not eyeball.** Reuse `056be3c`'s own harness — 16 viewport
   widths across the schedule pages — and report the same two numbers it reported:
   columns under 118px, and labels wrapping to three or more lines. A fix that does
   not move those numbers is not a fix.
4. **Add a tablet-band assertion to `schedule-card-layout.spec.ts`.** At minimum
   768×1024 and 1024×768, assert no field row scrolls horizontally
   (`scrollWidth <= clientWidth + 1`) and no column renders narrower than the 118px
   floor `056be3c` established.
5. **Check the known 360px exception.** `056be3c` left one label wrapping to three
   lines at 360px. Confirm whether the `col-lg-*` work resolves it or whether it
   needs the `340px` breakpoint tightened.

---

## Milestone 36-4: PDF Margin and Duplicate-Title Corrections

### Problem Statement

**Margins.** The body layout is already correct: `pdf-engine.js:255-260` sets
`margin = 72` with an explicit Rule 2.520 citation, and the DOCX engine matches at
1440 twips (`docx-engine.js:47-51`). One path escapes it.
`getSupportingDocumentImageLayout()` (`pdf-engine.js:441`) computes
`maxWidth = fullPage ? pageWidth : contentWidth` and
`maxHeight = fullPage ? pageHeight : pageBottom - curY`, then centers the image at
`(pageWidth - width) / 2`. In full-page mode the bounds are the **paper**
(612 × 792), not the content box (468 × 648), so a scanned exhibit scales edge to
edge with a zero-inch margin on all four sides. `startNewAttachmentPage()`
(`pdf-engine.js:377`) reinforces this by setting `curY = 0`.

**Duplicate titles.** A section's `title` renders as an H1 or H2 at
`pdf-engine.js:663-667`, then the first block's `title` renders again as a
sub-heading 16pt below — at `:728` for tables, `:897` for checklists, and the
equivalent site for key-value grids. When the two strings match, the same heading
prints twice on consecutive lines. **15 exact adjacent duplicates exist** across the
shared PDF models:

| Model | Count |
|---|---|
| `annual-accounting/pdf-model.js` | 9 |
| `plan-annual/pdf-model.js` | 2 |
| `plan-minor/pdf-model.js` | 2 |
| `plan-initial/pdf-model.js` | 1 |
| `plan-simplified/pdf-model.js` | 1 |

The clearest example is `annual-accounting/pdf-model.js:341` and `:350` — section
`'SCHEDULE A: Income Received During Period'` immediately followed by table block
`'Schedule A: Income Received During Period'`.

**The fix already exists in the sibling engine.** `docx-engine.js:447-448` computes
`shouldRenderTitle` as the block title differing case-insensitively from the section
title, and suppresses the duplicate; `:573-574` repeats it for checklists. The DOCX
output is already clean. Only the PDF engine lacks the guard.

### Implementation Tasks

1. **Bound full-page attachments to the content box.** Change
   `getSupportingDocumentImageLayout()`'s full-page branch to `contentWidth` and
   `pageHeight - (margin * 2)`, and center within the content box rather than the
   page. Exhibits shrink slightly; that is the requested behavior and the rule's
   requirement.
2. **Confirm every other page-relative coordinate.** `startNewPage()`
   (`pdf-engine.js:370`) sets `curY = 140` on continuation pages, which is header
   clearance rather than a margin violation, and the footer draws at
   `pageHeight - margin - 4` (`:365`), inside the bottom margin where page numbers
   are permitted. Verify rather than assume, and record the finding either way.
3. **Port the DOCX guard into the PDF engine** at all three block-title draw sites,
   using the same case-insensitive trimmed comparison so the two engines stay
   behaviorally identical.
4. **Suppress the draw, never the data.** `block.title` also feeds the accessibility
   structure tree: `pdf-engine.js:735-737` uses it for the table element's `title`
   and builds its `summary` from the same string, falling back to
   `'Case Information Summary Table'` when absent. Clearing `block.title` in the
   models would silently degrade every tagged table's summary to that generic
   string. The guard must gate only the `doc.text(...)` call.
5. **Guard the regression with the existing suites.**
   `tests/e2e/pdf-structure-tags.spec.ts` and `pdf-table-semantics.spec.ts` already
   assert tag structure and table semantics; extend them to assert that a section
   title and its first block title never both appear as visible headings, and that
   the table `summary` still resolves from `block.title`.

---

## Milestone 36-5: Content Corrections

### 10. Remove circuit-specific standards from descriptions

Three distinct classes of Sixth-Circuit-specific content are presented as if they
were statewide requirements:

- **`Administrative Order 2024-025` — 7 occurrences** in `plan-annual/print.js:73`,
  `plan-initial/index.js:163`, `plan-initial/print.js:59`, `plan-minor/print.js:52`,
  `plan-simplified/print.js`, and `legacy-app.js`. This is a Sixth Judicial Circuit
  administrative order governing Disaster Plan filing. It is stated unconditionally,
  including in on-screen guidance at `plan-initial/index.js:163`, so a Broward or
  Orange County filer is told to comply with an order that does not bind them.
- **Hardcoded clerk addresses** at `plan-simplified/pdf-model.js:182`: Pinellas at
  315 Court Street Room 106 Clearwater, and Pasco at P.O. Box 338 New Port Richey,
  printed into the PDF regardless of the filing's actual county.
- **A Sixth-Circuit placeholder** at `guardian-inventory/index.js:805`:
  `'e.g., 6th Judicial / Pinellas'` on the Schedule C-2 Court / Jurisdiction field.

This matters because the county field is already statewide.
`legacy-app.js:1376` lists all 67 Florida counties, `circuit-lookup.js` maps every
one to its circuit, and `legacy-app.js:1367`'s own comment records that the field
was widened from a Pinellas/Pasco pair specifically to support any county. The
descriptions were never updated to match.

**Tasks.** Remove the Administrative Order sentence from all seven sites. Replace
the hardcoded clerk block with either county-conditional text driven by the existing
`county` field or generic "file with the Clerk of the Circuit Court in the county of
jurisdiction" guidance — generic is recommended, since maintaining 67 clerk
addresses is a liability the app should not take on. Generalize the C-2 placeholder
to a form-shaped example without a county name. **No test asserts any of these
strings**, so the removal is low-risk; add a guard test asserting no circuit-specific
administrative order number appears in shipped copy.

### 11. Part VIII must accept a no-trusts certification

**Root cause.** `legacy-app.js:7831` defines the Annual Accounting Part VIII
completeness check as `'a-p8': D.trusts.some(t => t.name)`. Part VIII is therefore
completable **only** by naming at least one trust. A ward with no trusts leaves the
section permanently incomplete, its sidebar marker permanently un-green, and the
"Required to continue:" block (`core/status/section-status.js:43`) permanently on
screen. The page itself already knows the answer — `annual-accounting/index.js:1222`
asks "#1. Does the Ward have one or more Trusts?" and defaults it to `No` — but
`index.js:1224` renders the resulting empty state as inert prose:
`"No trusts indicated. Check the box above if the ward has one or more trusts."`

**The pattern to follow already exists.** `legacy-app.js:7819` defines
`verifiedEmpty` over `D.scheduleNoItems`, and five other Annual checks already use
it: `a-p11`, `a-schc`, `a-sche`, and every `rowsComplete()` caller. Its UI is
`scheduleEmptyHTMLAnnual()` (`annual-accounting/index.js:659`), which renders a
checkbox reading *"I verify there are no {noun} to report for this schedule."*
Part VIII is the outlier that never adopted it.

**Tasks.** Replace `index.js:1224`'s prose empty state with a certification checkbox
reading **"I certify there are no trusts"** — the requested wording, which
deliberately differs from the shared helper's "I verify there are no … to report for
this schedule" phrasing. Either parameterize `scheduleEmptyHTMLAnnual()` to accept
custom text or render a bespoke control writing the same `D.scheduleNoItems` key;
parameterizing is preferred so one handler keeps persisting the value. Then extend
`legacy-app.js:7831` so a checked certification satisfies the check alongside the
existing named-trust condition. Confirm the certification flows into
`annual-accounting/pdf-model.js:839-847`, which already computes `hasAnyTrust`, so
the printed answer and the certification agree. Add a unit test asserting Part VIII
reports complete with zero trusts and the box checked, and incomplete with zero
trusts and the box clear.

### 11b. Supporting Documents heading prints raw ISO dates

Found while checking a QA claim, not requested. The heading built at
`legacy-app.js:8605` splits `scheduleDocPeriodKey()` (`:6567`) and renders both ends
verbatim, producing "Supporting Documents — accounting period 2027-01-01 to
2027-12-31". Every other date surface uses MM/DD/YYYY, a convention Milestone 34-1E
item 18 set deliberately. Run both ends through the existing display formatter. The
heading is on nearly every schedule page, so the inconsistency is visible constantly.

---

## Milestone 36-6: Data-Entry Correctness Defects

These four were reproduced against a running build. Each corrupts or discards data
the user actually typed, so they outrank every layout item in this milestone.

### 12. Initial Plan question F silently discards its own answer

**Reproduced.** On Initial Guardianship Plan route `/p8` ("11. Advance Directives"),
question F is `#committeeIncorporated`. Clicking it visibly checks the box, but
`D.committeeIncorporated` stays `""` — before the click, after the click, and after
an explicitly dispatched change event. Writing the same path with `setPath()`
directly works, which rules out the path and the model.

**Root cause — a substring collision in field-kind inference.**
`getControlKind()` (`core/form/form-contract.js:141`) classifies a control by
searching its lowercased path for a list of needles. One of them is `'ein'`, meant
to catch a taxpayer EIN field. The path `committeeIncorporated` lowercases to
`committeeincorporated`, which contains `ein` at "committ**ein**corporated". The
checkbox is therefore classified as kind `ssn`. `finalizeFieldValue()`
(`form-contract.js:257`) then runs its SSN branch, `formatSSN('Yes')` strips every
non-digit, and the empty string is written to the model — erasing the answer on the
same event that recorded it.

**Second, independent defect on the same control.**
`plan-initial/index.js:438` calls `yesNoCheckboxS('committeeIncorporated','',…)`
with an empty label. `yesNoCheckboxHTML()` (`legacy-app.js:6966`) renders
`<label for=…></label>` with nothing inside, so the checkbox has **no accessible
name at all** — confirmed: `labelText: ""`, `aria-label: null`. A screen reader
announces an unnamed checkbox, and there is no visible text beside it either.

**Scope is exactly one field.** A static scan of all 210 literal control paths in
`src/` for accidental mid-word matches against the full needle list returned two
hits: `committeeIncorporated` (this defect) and `guardianNames` matching `name`,
which is the intended classification. No other field is affected today.

**Tasks.** Give question F its real label text. Then fix the classifier, not just
this one path: substring matching over a bare path string will keep producing this
failure as fields are added. Two options — require word or camelCase boundaries in
`getControlKind()`'s needle matching, or make `renderFormField`-style explicit
`data-field-kind` mandatory for every control that any formatter can rewrite. The
boundary fix is smaller; the explicit-kind fix is the one that ends the class. Also
add a guard so `finalizeFieldValue()` never applies a text formatter to a checkbox
or radio, whatever kind was inferred — a yes/no control has no text to format.
Extend `tests/unit/form-contract.spec.js` with the boundary cases and
`tests/unit/plan-tristate.spec.js` with a question F round-trip.

### 13. The section checklist and the export validator enforce different rules

**Reproduced on Initial Plan.** `legacy-app.js:7994` defines
`'pi-p8': (!!D.q11NoDirectives !== !!D.q11Executed)` — the section turns green on
the two directive checkboxes alone and never consults `committeeIncorporated`.
`plan-initial/print.js:54` nonetheless requires
`has(d.committeeIncorporated)` before export. A filer can therefore satisfy the
sidebar completely and still be refused at Print Preview, with no indication on the
page of what is missing.

**This is a general class, not one field.** `computeNavChecks()` in `legacy-app.js`
and each feature's `print.js` readiness list are two hand-maintained rule sets over
the same data, with no mechanism keeping them in agreement. Milestone 35-4 was
scoped to reconcile exactly these invariants and was never started.

**Tasks.** Treat this as 35-4's unfinished work rather than a new investigation.
Derive both surfaces from one declaration per section, or, if that is too large a
change for this milestone, add a test that asserts for every filing type and every
section that the export validator requires nothing the section check ignores. That
test is the deliverable even if the reconciliation itself lands later — it converts
an invisible class of bug into a visible list.

**Note on the "answered vs. blank" pattern.** Several of these fields are yes/no
checkboxes whose model value starts as `''` and only becomes `'No'` once the user
checks and unchecks them. Any readiness rule written as `has(field)` therefore
treats "the user means No" and "the user never looked" as the same state, and can
only be satisfied by a check-then-uncheck gesture no one would guess. Fix the
representation — an explicit tri-state, or a default of `'No'` written at ward
creation — rather than the individual rules.

### 14. Spaces stripped mid-typing in Annual, Final, and Trust Accounting

**Reproduced.** Typing `Morgan Reyes` character by character into the Annual
Accounting preparer name field yields `MorganReyes`, both on screen and in the
model. The same typing into Initial Inventory's `guardianName` and Initial Plan's
`guardianNames` yields the correct `Morgan Reyes`.

**Root cause.** `persistAnnualControl()` (`annual-accounting/index.js:154`) is bound
to the container's `input` event (`:205`) and applies its formatter map on every
keystroke, writing the result back with `control.value = value` (`:181`). For a
name or address field the formatter is `formatName` → `formatSafeTitleCase` →
`sanitizeStoredText`, which calls `.trim()`. The trailing space is removed the
instant it is typed, and the next character lands flush against the previous word.
Assigning `control.value` also moves the caret to the end, which is why text can
only be entered reliably in reverse word order.

**The rest of the app already fixed this.** `bindForms()` in `legacy-app.js:7741`
carries the comment "formatName()/formatAddress() title-case a complete value and
trim it, which … eats a just-typed trailing space" and made name and address
finalize-only. Commit `d115205` did the same for City/State/Zip. The Annual
Accounting feature binds its own inputs via `data-annual-path` and was never
brought along.

**Tasks.** Make `persistAnnualControl` finalize-only for every formatter that
rewrites what was typed — `name`, `address`, `zip`, and `security` — moving them to
the existing `focusout` listener (`:222`) beside the case-number finalizer. Leave
`decimal`, `signed-decimal`, and digit-count limiting live, since those behave like
`maxlength` rather than rewriting words. **Audit existing saved data**: values
already stored with their spaces eaten are still wrong after the code is fixed, and
the dashboard Contacts column is where they surface.

### 15. Bar number truncated to six digits

**Reproduced.** Typing `0089214` into the attorney bar number field stores
`008921`. `formatBarNumber()` (`legacy-app.js:1478`) is
`String(s||'').replace(/\D/g,'').slice(0,6)`. Florida Bar numbers run up to seven
digits, so any seven-digit number loses its last digit with no warning, no length
indicator, and no validation error. The truncated value then prints onto filed
documents as a different attorney's number.

**Tasks.** Raise the cap to seven digits. Decide whether to keep silent truncation
at the new cap or surface a validation error on over-length input; an error is
better, since a silently altered bar number is worse than a rejected one. Add a unit
test for six- and seven-digit values.

---

## Milestone 36-7: Filing Navigation and Creation Defects

### 16. The sidebar Active Filing switcher never switches filings

**Reproduced, both input paths.** With two filings open, typing into `#ward-selector`
filters the dropdown correctly and shows the right entry. Clicking that entry leaves
`caseFile.activeWardId` unchanged. Selecting it with ArrowDown then Enter also
leaves it unchanged.

**Root cause.** The `onPick` callback passed to `comboboxRenderDropdown()`
(`legacy-app.js:4882-4888`) does four things: set the input's text, stash
`input.dataset.wardId`, clear the active-descendant state, and hide the dropdown. It
never calls `handleSwitchWardClick()` or `switchWard()`. Picking an item only
*stages* a choice that the separate "Switch Filing" button later consumes. The
keyboard path is the same code — Enter on a highlighted option dispatches
`mousedown` into that identical callback (`:4941`). Enter with **no** option
highlighted does call `handleSwitchWardClick()` (`:4944`), which is why the control
appears to work intermittently.

**Tasks.** Call the switch directly from `onPick`. Note the interaction with 36-1:
that sub-milestone removes the sidebar's filing controls, including the "Switch
Filing" button this combobox currently depends on. Decide together whether the
combobox moves to the dashboard, stays in the sidebar as a self-contained switcher,
or is replaced by the dashboard's Open action. Whatever survives must switch on
selection, with no second confirming click.

### 17. The carryover picker offers only one source filing

**Reproduced.** With three filings for the same ward — Initial Inventory, Annual
Accounting, and Initial Guardianship Plan — opening Add New Form for Annual Plan
(Minors) offered exactly two options: "Start Blank" and "Carry Ward (Initial
Inventory)". The other two existing filings were not listed.

**Tasks.** Find the eligibility rule behind `#carry-source-ward` and establish
whether the restriction is deliberate (some source/target type pairs genuinely
cannot carry) or accidental. If deliberate, say so in the picker rather than
silently omitting rows. Separately, verify what actually gets copied: the QA pass
reported case number and guardian names arriving blank on Annual Plan (Minors), and
attorney certification fields never carrying over on Initial Plan, against a
description promising ward name, case number, county, and guardian contact details.
Both claims are plausible and specific but were not independently reproduced here —
confirm each before writing code.

### 18. No warning when a minor-only form is created for an adult ward

**Reproduced.** An Annual Plan (Minors) filing was created and accepted for a ward
carrying an adult guardianship inception date and an existing adult-type filing. No
dialog, no prompt, no blocked field. This is an absent guard rather than a broken
one, which makes it an enhancement, not a defect — but the form's own copy describes
itself as "used when the ward is a minor," so the software contradicts itself.

**Tasks.** Add a soft, dismissible warning at form-creation time when a
minor-specific type is chosen for a ward whose existing data indicates an adult.
Soft is the right strength: the app cannot know the ward's age directly, only infer
it, and a hard block on an inference would be worse than the current silence.

### 19. The blocked Print Preview banner is an unreadable wall of text

**Reproduced on Initial Inventory.** A filing with nothing filled in yields 47
preflight messages, and `pdf-preview.js` joined all of them with a space into a
single paragraph: "Preview is blocked: Cover — Case Number is required. Cover —
Guardianship Inception Date (GID) is required. ..." for roughly forty lines. The
same list went into an `alert()` on Print. Fourteen of those messages are the
identical sentence about verifying a schedule has no entries, repeated once per
schedule. Nothing about the presentation helps a filer decide what to do next, and
the assertive live region read the whole thing aloud.

**There is also no way past it.** The gate is all or nothing, so a filer cannot see
the document taking shape while filling it in, which is exactly when looking at it
is most useful. Every message is shaped `<section> — <detail>`, so the data needed
to group and count it is already there and merely discarded.

**Tasks.** Replace the paragraph with a count, a grouped and collapsed breakdown,
and an override. Group by the leading token of the section prefix so "D-2 Preparer"
and "D-2 Attorney" collapse onto the one schedule the filer would navigate to.
Announce the count rather than the list. Add a "Preview anyway" button that renders
the draft with a persistent notice explaining what it is.

**Scope the override to the screen.** It unblocks the embedded preview only. Save
and Print stay gated, because an incomplete court form that has left the app is a
different kind of mistake from one displayed on the filer's own monitor, and the
draft notice cannot follow the file. The Print alert is shortened to a count and a
pointer to the preview rather than carrying the list itself.

---

## Verification & Acceptance Plan

### Unit tests

- `dashboard-preferences.spec.js` — rewritten for the single-layout migration:
  a stored `family` or `assistant` value normalizes without throwing, and
  `supervisingProfessionalFilter` survives.
- `dashboard-view-model.spec.js` — direction-aware comparators for every sortable
  column; `compareDashboardPriority()` unchanged as the default.
- New coverage for judge propagation: siblings resolved by `caseNumberOf()`, the
  planMinor `ucn || ref` precedence honored, and no write to unlinked filings.
- New coverage for Part VIII completeness in both certification states.
- `annual-accounting-pdf-model.spec.js` and the plan model specs — assert no section
  title equals its own first block title, case-insensitively.

### E2E tests

- Update the four specs that drive `#dashboard-role`; delete the
  `.dashboard-family-row` assertions in `routes.spec.ts` and replace them with
  triage-row equivalents.
- New: clicking each sortable header reorders rows and sets `aria-sort` correctly,
  and a second click reverses it.
- New: per-row action buttons occupy identical columns across rows whose
  `Prior years` presence differs.
- `schedule-card-layout.spec.ts` — tablet-band assertions per 36-3.
- `pdf-structure-tags.spec.ts` and `pdf-table-semantics.spec.ts` — extended per
  36-4, plus a full-page attachment assertion that the image bounds sit inside the
  1-inch content box.
- New: no shipped copy contains a circuit-specific administrative order number.
- New (36-6): typing a two-word name into an Annual Accounting name field keeps its
  space, asserted per keystroke rather than only after blur.
- New (36-6): Initial Plan question F round-trips through check, uncheck, save, and
  reload, and carries a non-empty accessible name.
- New (36-6): a seven-digit bar number survives entry and export intact.
- New (36-7): selecting a filing in the sidebar combobox switches the active filing,
  by mouse and by keyboard, with no second click.

### Cross-cutting guard tests

Two of 36-6's defects are instances of classes rather than one-offs, and each
deserves a test that fails on the next instance, not just this one:

- **Field-kind inference** — assert that no control path in any filing type infers a
  kind by an accidental mid-word substring match, and that no text formatter is ever
  applied to a checkbox or radio.
- **Checklist versus export validator** — assert for every filing type and section
  that the export validator requires nothing the section completeness check ignores.
  Expect this to fail on more than the one field found here; that list is the
  finding.

### Review gate

**36-6 lands first, ahead of every layout item.** Its four defects corrupt or discard
data the user typed; a misaligned column does not. 36-1 lands next: it deletes a
rendering path and moves markup that later work builds on, and every other
sub-milestone touching the dashboard would otherwise be written twice. 36-2 depends
on 36-1's consolidated header. 36-7's switcher fix must be sequenced with 36-1,
which removes the button that switcher currently depends on. 36-3, 36-4, and 36-5
are independent of each other and of the dashboard work, and may proceed in parallel.

No sub-milestone is complete while its own tests are red. Where a change is an
intentional contract break — the role select, the family renderer, the sidebar
filing controls — the spec update ships in the same commit as the code.

---

## Open Decisions

These need a product answer before the affected task starts; none blocks the others.

1. **36-1, task 3** — with `assistant` removed, does the "Working on behalf of"
   supervisor filter stay, merge with the Assignment filter, or go?
2. **36-2, task 1** — is Contacts sortable on its first contact, or not sortable?
3. **36-2, task 3** — does the `Sort` select survive alongside clickable headers?
4. **36-2, task 6** — judge propagation across `caseId`-linked filings
   (recommended) or across matching case-number text with confirmation?
5. **36-5, item 10** — generic clerk guidance (recommended) or county-conditional
   text driven by the existing `county` field?
6. **36-6, item 12** — fix the classifier by requiring word boundaries (smaller) or
   by making an explicit `data-field-kind` mandatory on every formattable control
   (ends the class)?
7. **36-6, item 13** — does the checklist/validator reconciliation land here, or
   does this milestone ship only the test that exposes the gaps, with the
   reconciliation deferred to a revived 35-4?
8. **36-6, item 15** — silently cap bar numbers at seven digits, or reject
   over-length input with a validation error (recommended)?
9. **36-7, item 16** — after 36-1 removes the sidebar filing controls, does the
   filing combobox move to the dashboard, stay in the sidebar as a self-contained
   switcher, or disappear in favor of the dashboard's Open action?

---

## Appendix: QA Findings Triage

An external QA pass submitted 15 findings. Each was checked against the code and,
where behavior was in question, reproduced against a running build with Playwright
driving real UI events. Verdicts below.

### Confirmed — accepted into this milestone

| QA § | Finding | Evidence |
|---|---|---|
| 2.2 | Initial Plan question F cannot be satisfied; checkbox has no accessible name | Reproduced. Model stays `""` through check and uncheck. Root cause is narrower and different from the report's: an `'ein'` substring match inside `committeeIncorporated`. See 36-6 item 12 |
| 3.1 | Checklist and export validator enforce different rules | Confirmed structurally on Initial Plan. See 36-6 item 13 |
| 3.2 | Text fields strip spaces while typing | Reproduced, producing the report's own `MorganReyes` string. **Scope is narrower than claimed** — see below. 36-6 item 14 |
| 4.1 | Carryover picker offers too few sources | Reproduced. Three sibling filings existed; one was offered |
| 4.4 | No minor/adult mismatch warning | Reproduced. No warning of any kind |
| 4.6 | Sidebar switcher does not switch filings | Reproduced on both mouse and keyboard paths |
| 5 | Bar number truncates to six digits | Reproduced. `0089214` stored as `008921` |

**Correction to 3.2's scope.** The report describes the space bug as affecting "most
text fields" app-wide and "any name, address, or note typed the normal way." It does
not. The same typing into Initial Inventory and Initial Guardianship Plan name
fields produced correct text. The bug is confined to the Annual Accounting feature
module, which also serves Final Accounting and Trust Accounting — three of nine
filing types. The rest of the app was fixed earlier and carries comments explaining
the fix. The report's dashboard evidence is still genuine: a preparer name saved
from one of those three forms is exactly how `MorganReyes` reaches the Contacts
column.

### Not reproduced

**2.1 — "Period From / Period To silently mirror each other."** This is the report's
headline finding, called "the most consequential bug found" and the sole basis for
its conclusion that only two of nine filings can be exported. **It did not
reproduce.** Typing `01/01/2027` into Period From and `12/31/2027` into Period To on
Annual Accounting, then blurring, left the model holding two distinct dates. Editing
From last did not pull To along; the dates stayed independent in both directions.
The date pipeline contains no mirroring mechanism: input keeps a per-path draft
(`commit-coordinator.js`), blur canonicalizes that one path, and the two fields
resolve to distinct paths through `setterPath()`. The same-day validation the report
cites is real and correct — it just was not triggered here.

Because the report's summary table marks seven of nine filings "Blocked — Period sync
bug only," and that bug did not reproduce, **the claim that only two filings are
exportable is unsupported.** Something did happen in that session; a data-entry
sequence, a carryover path, or a specific form not covered here could still produce
it. It needs a reproduction before any code is written, and no fix should be
scheduled against it as stated.

**4.2 — "Escape in Add New Form silently changes the Inventory Type dropdown."** Not
reproduced. Typing a ward name and pressing Escape closed the modal. The type
dropdown held its value and the name field was not cleared. Neither half of the
claim held.

### Incorrect

**3.4 — "Trust Accounting Net Assets didn't reconcile until the trust's cash was
itemized."** Working as designed, and the design is right. `calcTotalsAnnual()`
computes `netAssets` from the transaction ledger (starting balance plus income minus
disbursements plus capital adjustments) and `netAssetsFromD` from the asset-schedule
itemization. Declaring a $25,000 starting balance while marking every asset schedule
"none" asserts that $25,000 both exists and does not exist. `annualReconcileState()`
flags the difference and requires either an itemization or a written explanation.
The reporter's resolution — itemizing the $25,000 as a Schedule D-1 cash asset — is
precisely what the form was asking for. The two panels are not "supposed to agree
regardless"; the whole point of the pair is to catch the case where they don't.

There is a fair UX complaint buried in it: nothing on screen explains *why* the
panels disagree or that an explanation is an accepted alternative. Worth a sentence
of inline guidance, not a code change to the arithmetic.

**4.5 — "Supporting Documents header shows the end date in both positions."** Not
reproduced. With a period of 2027-01-01 to 2027-12-31 the heading rendered
"Supporting Documents — accounting period 2027-01-01 to 2027-12-31", the true range.
The heading reads both ends from `scheduleDocPeriodKey()` (`legacy-app.js:6567`),
which is a straightforward `from__to` join. A heading showing the same date twice
means the two stored dates *were* the same — a symptom of whatever produced the 2.1
observation, not an independent display bug.

**A real defect is adjacent to it, and the report missed it.** That heading prints
raw ISO dates (`2027-01-01`) while every other date surface in the app uses
MM/DD/YYYY, a convention Milestone 34-1E item 18 standardized deliberately. Worth
fixing as a one-line change; folded into 36-5 rather than given its own item.

### Unverified — insufficient information

- **3.3, court document text clipped in Print Preview.** Not reproduced, and the
  mechanism argues against it: the PDF key-value grid measures both label and value
  with `splitTextToSize` and grows the row to fit (`pdf-engine.js:747-760`), with a
  comment recording that fixed-offset drawing was removed for this exact reason.
  Text should wrap, not clip. Needs the screenshot and the filing that produced it.
- **4.3, transient "This section could not be loaded."** A one-off with no
  reproduction steps. The banner is a real, intentional surface for a failed dynamic
  import (`tests/e2e/feature-load-failure.spec.ts` covers it). The reported blank
  interim state on reload is plausible during startup and worth a look, but there is
  nothing actionable without a trigger.
- **5, inconsistent SSN/EIN masking.** Too vague to act on. Needs specific fields.
- **5, the four "flagged earlier, not re-verified" items** — audit-fee
  recalculation, a Schedule D-4 label mismatch, Next skipping a schedule section,
  and subtotal sums. The report itself declines to stand behind these. One note:
  `calcTotalsAnnual()` recomputes the audit fee from `netAssetsFromD` on every call,
  so a stale fee would be a render-timing issue rather than a calculation error.

### Assessment of the report as a whole

Roughly half the findings are real, and the strongest of them — the space-stripping
bug and the dead question F checkbox — are worth having. The testing method was
sound: real UI events only, every form pushed to completion, Print Preview opened
rather than trusting the checklist.

Two cautions for the next pass. First, the headline finding did not reproduce, and
because the report's bottom-line conclusion rests entirely on it, that conclusion
should not be quoted onward. Second, several findings generalize from one form to
the whole application without checking a second one; 3.2 was real but three times
narrower than stated, and a fix scoped to the report's description would have
touched code that was already correct.
