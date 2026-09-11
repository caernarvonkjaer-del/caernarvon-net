# Milestone 38: Guardian-Row Integrity, Filing Readiness, and Dashboard Clarity

## Status

**Draft only — do not implement yet.** This proposal authorizes no runtime,
data-model, test, or documentation change beyond this plan. It corrects the
Simplified Accounting guardian-row schema and makes the official three-slot
Excel-template boundary explicit and non-lossy. It also plans a shared,
source-mapped readiness-card framework for every filing Preview & Export page;
the components will be serially implemented and verified.

## Decision Recorded

Simplified Accounting's canonical guardian row uses these address properties:

- `mailingStreet` and `mailingCityStateZip`; and
- `residenceStreet` and `residenceCityStateZip`.

`officeStreet` and `officeCityStateZip` belong to Annual/Final/Trust Accounting
guardian rows and are not valid Simplified Accounting fields. The Simplified
Accounting factory, add/remove lifecycle, UI, validation, party linking, PDF,
Excel, save-file handling, and data-model CSV must agree on that distinction.

The court's Simplified Accounting Excel template has exactly three guardian
slots. Simplified Accounting will retain a maximum of **three** guardians; this
milestone does not attempt to invent a fourth spreadsheet slot or expand the
form beyond the supplied court template. A legacy save that contains more than
three populated guardians remains eligible for PDF/Word review, but an Excel
export must give a clear capacity error instead of silently omitting guardian
four or later.

## Current Condition

1. `emptyDataSimplified()` correctly seeds Simplified rows with `residence*`
   address keys, but currently seeds three blank rows.
2. `pagePart4()` permits at most three guardian cards, and the supplied Excel
   workbook maps guardian slots 1–3 only. Thus the visible UI and template
   already agree on a three-guardian ceiling.
3. The shared `SCHEDULE_SCHEMAS.guardians.factory()` instead emits
   `officeStreet` and `officeCityStateZip`. If a user removes a blank
   co-guardian and then adds one back, `addCollectionRow('guardians', …)` uses
   that Annual Accounting-shaped factory. The Simplified UI renders
   `residence*`, leaving the added row's persisted `office*` keys dead and its
   canonical address inputs initially blank.
4. The Excel writer/exporter has no guardian capacity entry in
   `SIMPLIFIED_EXCEL_CAPS`. A legacy or externally imported case with a fourth
   populated guardian would therefore export only the first three without an
   explicit warning.

The earlier MS 35 backlog wording that the normal Simplified UI could create a
fourth guardian was imprecise. The three-item UI cap prevents that ordinary
path; the schema-factory drift and legacy-data omission boundary are the work
to correct.

## Scope and Implementation Plan

### 38-1: Establish Feature-Correct Guardian Factories

1. Introduce an explicit Simplified Accounting guardian-row factory with the
   exact canonical keys listed above. Do not repurpose a generic factory in a
   way that changes Annual/Final/Trust Accounting rows from their valid
   `office*` shape.
2. Route Simplified Accounting's Add Co-Guardian action through that factory
   while retaining the existing collection floor, maximum of three, positional
   `guardianPartyIds` synchronization, autosave, and rerender behavior.
3. Keep a newly created Simplified filing's initial guardian-card count aligned
   with the then-current MS 37-6 decision. If MS 37-6 has been implemented,
   seed one primary guardian and add co-guardians only by user action; if it has
   not, do not silently broaden MS 38 into that lifecycle change. In either
   condition, every newly added Simplified row must use the canonical
   `residence*` shape.
4. Do not modify guardian fields, limits, or factories for Guardian Inventory,
   Annual Accounting, Final Accounting, Trust Accounting, or any Plan filing.

### 38-2: Normalize Legacy Simplified Rows Without Data Loss

1. Add a narrowly scoped Simplified Accounting normalization step at a stable
   lifecycle boundary (load/import and before render/export), not a global
   rewrite of every `guardians[]` collection.
2. For a Simplified row with a blank canonical residence field and a populated
   corresponding legacy office field, copy the legacy value into the canonical
   residence field. Never overwrite a populated canonical value.
3. When both a canonical and legacy value are populated but disagree, preserve
   the canonical value and retain enough information for a non-destructive,
   visible remediation path; do not choose a value silently. The implementation
   must document and test the chosen handling before deleting any legacy key.
4. Normalization must preserve name, SSN/EIN, phone, email, mailing address,
   signature date, guardian order, and `guardianPartyIds` lockstep. It must be
   idempotent and must not create or remove guardian cards.
5. Existing valid Simplified save files and all non-Simplified filing types are
   unchanged. No archive-format or schema-version bump is warranted solely for
   this compatible field repair.

### 38-3: Make the Excel Boundary Explicit

1. Add a `guardians` capacity of three to `SIMPLIFIED_EXCEL_CAPS`, using the
   existing `checkExcelCapacity()` export gate and a user-facing label that
   identifies Part IV — Guardian(s) Information.
2. Count only populated guardian rows. Blank compatibility padding must not
   block Excel export.
3. When a save contains more than three populated guardians, prevent Excel
   export before workbook mutation/download and explain that the official
   template holds three; direct the filer to the output format that retains all
   recorded guardians. Never silently omit a populated row.
4. Retain the existing three-slot Excel import/export mapping. On Excel import,
   read only the three template slots and do not fabricate a fourth guardian.
   Import behavior must not silently delete an already-loaded fourth legacy row;
   surface or preserve it according to the established import semantics and
   cover that decision with a fixture.

### 38-4: Reconcile Contracts and Documentation

1. Update every Simplified Accounting `guardians[]` row in
   `probate-guardian-data-model.csv` to identify the canonical row factory,
   exact `1..3` bounds, actual initial-item count at implementation time, and
   the Excel three-slot boundary. Remove the stale “known schema drift” claim
   after the repair is in place.
2. Update the MS 35 candidate-backlog entry to mark this issue superseded by
   MS 38, correcting its statement about ordinary UI creation of a fourth row.
3. Update `TEST-INDEX.md` for each new or materially repurposed unit/E2E test.
4. Run `npm run verify:data-model` after the CSV change.

## Acceptance Criteria

| Scenario | Expected result |
|---|---|
| Remove then re-add a Simplified co-guardian | The new row has blank `residenceStreet`/`residenceCityStateZip` fields, no Annual Accounting address shape, and renders/persists correctly. |
| Annual/Final/Trust add-row behavior | Their `office*` address schema is unchanged. |
| Existing Simplified row with only legacy `office*` address data | The corresponding blank `residence*` value is recovered without losing other row data. |
| Conflicting legacy and canonical address values | Canonical data is not silently overwritten or discarded; the documented remediation behavior is available. |
| Simplified guardian party links | Add, remove, normalize, save, reopen, and export preserve positional `guardianPartyIds` synchronization. |
| One to three populated Simplified guardians | PDF/Word and Excel preserve all populated rows that the template supports. |
| Four or more populated legacy guardians | PDF/Word retains them; Excel export is blocked with a clear three-slot template-capacity message, with no workbook download. |
| Blank guardian padding | It does not produce a false Excel capacity failure. |
| Excel import | The three template slots round-trip accurately; no fourth row is invented or silently erased. |
| New and existing `.sav` files | Valid data reopens without data loss or cross-filing schema mutation. |

## Verification Plan (for the later implementation)

1. Add unit tests for the Simplified row factory, add/remove lifecycle, exact
   row shape, maximum/floor enforcement, and `guardianPartyIds` lockstep.
2. Add normalization fixtures for canonical-only, legacy-office-only,
   conflicting, blank, and repeated-normalization cases; assert that Annual
   Accounting rows are untouched.
3. Add Excel tests for one, two, and three guardians; blank padding; and four
   populated legacy guardians rejected before export. Add a three-slot import
   round-trip fixture, including preservation of preexisting legacy data per the
   selected import behavior.
4. Add focused Simplified Accounting UI/E2E coverage for remove-then-add,
   rendered residence fields, party linking, save/reopen, and export messaging.
5. Update `TEST-INDEX.md`, run focused tests and `npm run verify:data-model`,
   then request permission before the full `npm test` suite.

## 38-5: Universal Filing / Clerk Review Readiness Cards

### Decision Recorded

Every filing type will display one readiness card on its Preview & Export page.
For a filing whose selected county is **Pinellas** or **Pasco**, the card is
named **Clerk's Review Readiness** and may present the applicable Sixth Judicial
Circuit workslip as an operational clerk-audit source. For every other county,
the card is named **Filing Readiness**; it may present statewide validation and
manual filing reminders, but must not claim to represent that county clerk's
review process.

The current four Plan readiness panels and all new Accounting/Inventory cards
will be accessible accordions. A card is expanded by default when one or more
machine-verifiable readiness conditions is flagged. It is collapsed by default
when every machine-verifiable condition passes. Manual reminders do not count
as failures and must not force expansion merely because they await human
confirmation. A user may always expand or collapse a card, independent of the
default state.

### Source Coverage and Boundaries

The repository contains workslips corresponding to each shipping filing family:

| Filing family | Local workslip source | Card configuration required |
|---|---|---|
| Guardian Inventory | `GD INIT Work Slip Inventory.docx` | Inventory-specific source map |
| Simplified Accounting | `GD ANN Work slip Simplified 02272020.docx` | Simplified Accounting source map |
| Annual Accounting | `GD ANN WORK SLIP AUDIT.docx` | Annual Accounting source map |
| Final/Discharge Accounting | `GD DISC Work Slip 02272020.docx` | Final/Discharge source map |
| Trust Accounting | `GD ANN Work Slip TRUST.docx` | Trust Accounting source map |
| Simplified Plan | `GD ANN Work Slip Review Simplified Plan.docx` | Simplified Plan source map |
| Annual Plan | `GD ANN Work Slip Review.docx` | Annual Plan source map |
| Initial Plan | `GD INIT WORK SLIP REVIEW.docx` | Initial Plan source map |
| Minor Plan | `GD ANN Work Slip Minor Review.docx` | Minor Plan source map |

`GD ANN Work Slip Review DSHP.docx` is a distinct Disaster/Storm/Hurricane
Plan source. It must not be presented as a tenth filing type; determine its
precise relationship to the existing forms before any of its requirements are
shown in a filing card.

Workslips are operational deputy-clerk audit sheets, not statutory enactments.
Before implementation, re-verify each proposed statutory or local-rule item
against its authoritative source. The source map for each condition must record
the workslip document/section, predicate or manual reminder, classification,
and any statute, rule, administrative order, or local-practice context.

### Implementation Plan

1. Inventory each workslip condition before writing UI code. Classify it as:
   **automatic** (a deterministic state predicate can prove it), **manual**
   (the filer/clerk must verify it), or **unsupported** (the application lacks
   reliable information and must not imply a pass/fail result). Do not invent
   conditions merely to make cards uniform.
2. Create one shared, accessible readiness-card renderer/controller rather than
   nine copy-pasted panels. It must accept filing-specific source-mapped items,
   preserve stable condition IDs, and render automatic, manual, and unsupported
   items with distinct language and status treatment.
3. Migrate the four existing Plan readiness panels to that shared component
   without changing their proven predicates or their export behavior. Preserve
   the 35-4 semantic mapping contract: each failed automatic condition maps to
   its corresponding export-validation issue where it is an export gate; manual
   items remain non-blocking.
4. Add the five Accounting/Inventory configurations: Guardian Inventory,
   Simplified Accounting, Annual Accounting, Final/Discharge Accounting, and
   Trust Accounting. Reuse the ordinary validator and output-preflight facts
   only where their meaning exactly matches the mapped condition.
5. Use the county-policy mechanism established by MS 37-1 for title, local
   source visibility, and Sixth Circuit-only reminders. A Pinellas/Pasco card
   may show its mapped workslip provenance; another county's card must omit
   Pinellas, Pasco, Sixth Judicial Circuit, and local-clerk requirement text.
   Statewide items continue to display for every county.
6. Implement accordion semantics with a native `details`/`summary` element or
   an equivalently accessible button/panel relationship. The control must expose
   its expanded state, have a clear accessible name including current status,
   retain visible keyboard focus, and use stable IDs without duplicate IDs on
   rerender or filing switches.
7. At initial Preview & Export render, expand only when at least one automatic
   item is failed; otherwise collapse. Keep a user's explicit expand/collapse
   choice for the current preview render while the page is live. A filing switch
   or a fresh preview render may recompute the documented default from current
   data. Manual and unsupported items do not alter that default.
8. The card is advisory UI, not a new generic export gate. Existing validation
   and preflight remain authoritative; adding a source-mapped automatic item
   must either reuse its exact validation rule or be labeled non-blocking until
   a separately approved validation change is made.
9. Keep readiness cards out of printed/PDF/Word/Excel court output unless a
   distinct filing-document requirement explicitly calls for a checklist. They
   are Preview & Export shell guidance, not part of the court form.

### Acceptance Criteria

| Scenario | Expected result |
|---|---|
| Any of the nine filing previews | Exactly one readiness card is present and configured for that filing type. |
| Pinellas or Pasco selected | Card is titled Clerk's Review Readiness and may show the mapped Sixth Circuit workslip context. |
| Any other county selected | Card is titled Filing Readiness; no Pinellas/Pasco/Sixth Circuit local requirement text appears. |
| One or more automatic items fail | The card is expanded by default, identifies the flagged items, and gives the user its normal route/remediation context. |
| All automatic items pass | The card is collapsed by default, with a concise pass status remaining visible in its summary. |
| Manual or unsupported item remains | It is clearly distinguished from an automatic failure and does not force the card open or make a false pass claim. |
| User operates the accordion | Mouse and keyboard can expand/collapse it; expanded state and focus semantics are correctly exposed to assistive technology. |
| Existing Plan export validation | Readiness migration neither adds a manual export block nor breaks the mapped automatic-condition/validator contract. |
| Preview/output | No duplicate card or IDs after rerender/switching; card content does not appear in court PDF, Word, Excel, or print output. |

### Verification Plan (for the later implementation)

1. Add source-map/configuration tests covering all nine filing types and the
   automatic/manual/unsupported classification of every rendered condition.
2. Add county-policy tests proving local titles/provenance and Sixth Circuit
   text appear only for Pinellas/Pasco, while statewide readiness remains
   available for all counties.
3. Add component/E2E tests for default-open failures, default-closed passes,
   manual-only/unsupported cases, keyboard interaction, ARIA state, rerender,
   and filing switching.
4. Extend the Plan invariant fixtures from MS 37-3 to prove that migrated
   automatic Plan conditions still map to validation issues without relying on
   brittle total-error counts. Add corresponding output/preflight tests for the
   five Accounting/Inventory cards.
5. Update `TEST-INDEX.md`, run focused tests and `npm run verify:data-model` if
   a source-map/data-model row changes, then request permission before the full
   `npm test` suite.

## 38-6: Dashboard Edit, Editor-Session, and Filing-Lifecycle Terminology

### Decision Recorded

The filing dashboard has three deliberately separate actions that currently
overload the words “Open” and “Close.” Their labels must communicate their
different scopes without changing their behavior:

| Current label | New label | Meaning | Data effect |
|---|---|---|---|
| `Open` | **Edit** | Select the filing and enter its form editor. | Changes the active editing target only. |
| `Close` (shown only for the active filing) | **Close Editor** | Leave the active editor and release its editing lock/session. | Does not change the filing's lifecycle flag. |
| `Mark Closed` / `Reopen` | **Mark Closed** / **Mark Open** | Toggle whether the filing belongs in the active or Closed Filings queue. | Toggles the persisted `archived` lifecycle flag. |

Editing a filing that is marked closed does **not** implicitly mark it open.
Likewise, closing the editor does **not** mark its filing closed. A lifecycle
change remains an explicit user decision through **Mark Closed** or **Mark
Open**.

### Current Condition

Every dashboard row renders an `Open` action that calls `switchWard()`. The
currently active row additionally renders `Close`, which closes the editing
session and releases its lock. Every row also renders the lifecycle toggle,
which reads `Mark Closed` for an active-queue filing and `Reopen` for a closed
one. On the active row, those three adjacent labels can read as contradictory
instructions even though they operate on different state.

### Implementation Plan

1. Change dashboard-row and continue-work prompt `Open` labels to **Edit**
   while retaining their existing `open-ward` action and `switchWard()`
   behavior. Update accessible names, tooltip/title text, help copy, and any
   tests that assert visible wording.
2. Change the active-row `Close` label to **Close Editor**. Retain its existing
   `close-ward` behavior and lock-release semantics; its accessible description
   must state that it ends the editing session and does not change filing
   status.
3. Replace the lifecycle toggle's closed-state `Reopen` label with **Mark Open**.
   Preserve `Mark Closed` for an active filing, the existing `archive` action,
   `aria-pressed` state, queue movement, persistence, and dashboard refresh.
   Use a title/accessible name that states the destination queue, such as “Move
   this filing to Closed Filings” or “Move this filing to Active Filings.”
4. Audit dashboard empty states, modal confirmations, activity/status messages,
   keyboard shortcuts, guidance/tour text, and tests for language that treats
   editor-session state as lifecycle status. Do not rename unrelated actions
   such as **Open Case File (.sav)**, which accurately means opening a file.
5. Preserve the existing workflow-status selector as a separate concept from
   the persisted open/closed lifecycle flag. This change must not add “closed”
   to its selectable workflow statuses or conflate it with `archived`.

### Acceptance Criteria

| Scenario | Expected result |
|---|---|
| Any active dashboard row | Primary action reads Edit; it enters the selected filing editor without changing lifecycle status. |
| Currently edited filing row | The additional action reads Close Editor; it ends the edit session/releases its lock without marking the filing closed. |
| Open lifecycle filing | Toggle reads Mark Closed and moves it to Closed Filings without changing editor-session meaning. |
| Closed lifecycle filing | Toggle reads Mark Open and returns it to the active queue without using the ambiguous word Reopen. |
| Edit a closed filing | The filing remains marked closed until the user explicitly selects Mark Open. |
| Assistive technology | Labels and tooltips distinguish editing, closing the editor, and changing the lifecycle queue. |
| Workflow selector | Existing workflow choices and automatic workflow derivation are unchanged. |

### Verification Plan (for the later implementation)

1. Add focused dashboard unit/E2E coverage for Edit, Close Editor, Mark Closed,
   and Mark Open, including active versus non-active rows and closed-queue rows.
2. Assert each action's data effect independently: active target/session lock,
   persisted `archived` flag, queue placement, and workflow status must not
   leak into one another.
3. Add accessible-name/title assertions and a visual/regression check for the
   active-row action group, where all three actions may appear together.
4. Update `TEST-INDEX.md`, run focused tests, then request permission before
   the full `npm test` suite.

## 38-7: Neutral Dashboard Context and Explicit Editing Focus

### Decision Recorded

The All Filings Dashboard is a meta-level review and work-selection screen. It
is not an editing surface for any particular filing. Entering `/dashboard` must
clear the application's actual editing focus after any pending filing changes
have safely been persisted.

While the dashboard is displayed, the sidebar must be neutral:

- no selected ward in the filing selector;
- no guardian name;
- no filing type, filing-progress value, or filing-specific completion state;
- no filing navigation tree or filing-specific output actions; and
- no action that implies an editor is open, including Close Editor.

The neutral sidebar must plainly state that no filing is selected and direct the
user to choose **Edit** from the dashboard to begin work. Selecting Edit on a
dashboard row establishes an editing focus and restores that filing's normal
sidebar, navigation, guardian information, and progress indicators.

“Last edited filing” may remain available as history for an explicit Continue
Editing prompt, but it is not a current editing focus and must never populate
dashboard sidebar content or cause an active editor-session action to appear.

### Current Condition

The dashboard currently retains `activeWardId` and renders the selected filing's
name, type, guardian context, progress, and navigation in the sidebar while the
user is reviewing all filings. This makes “Active Filing” ambiguous: it can
mean either the filing currently loaded for editing or the lifecycle set of
filings not marked closed. It also contributes to the adjacent Open/Close/Mark
Closed terminology conflict addressed in 38-6.

### Implementation Plan

1. Define one explicit dashboard-entry transition that first flushes any pending
   edit/autosave work, then clears the active editing selection (`activeWardId`)
   and updates dependent app/tab state. Do not implement the neutral dashboard
   as a CSS-only concealment of a still-active filing.
2. Ensure every route into `/dashboard` uses that transition: Home/All Filings
   controls, direct navigation, browser navigation where applicable, startup
   routing, and a filing's Close Editor action. Re-entering the dashboard must
   be idempotent when no filing is selected.
3. Render an intentional sidebar dashboard state: neutral heading such as
   **No filing selected**, an empty/placeholder filing selector, no guardian
   display, no filing-progress card, no form-type content, and no filing
   navigation/output sections. Provide one concise instruction to select Edit
   from All Filings Dashboard.
4. Keep dashboard-wide shell actions and data controls that are meaningful with
   no editing focus (for example, security, theme, help, backup/save controls,
   and the dashboard itself). Do not hide them merely because the filing
   navigation is absent.
5. Separate persisted/current editing state from “last edited” history. A
   Continue Editing prompt may offer the most recently edited filing, but it
   must use its own history record and only call the Edit/switch transition when
   the user explicitly chooses it. Dismissing or viewing the dashboard must not
   reopen a filing implicitly.
6. Make Dashboard actions resilient to `activeWardId === null`: row-level Edit,
   Mark Open/Closed, Backup, PDF, New Year, and other filing actions must still
   resolve their target from their `wardId`. Close Editor must be absent when no
   editor is active.
7. Audit routing, sidebar/tab-state publishing, unsaved-change prompts, lock
   coordination, and accessibility focus after the transition. Leaving a filing
   for the dashboard must not lose unsaved work, retain a stale lock, announce
   the wrong active filing to another tab, or focus a removed filing control.

### Acceptance Criteria

| Scenario | Expected result |
|---|---|
| User enters All Filings Dashboard from an edited filing | Pending changes are safely retained; no filing is the current editing focus. |
| Dashboard sidebar | Shows a neutral no-filing-selected state with no ward, guardian, type, progress, filing navigation, output navigation, or Close Editor action. |
| Dashboard metric “Open Filings” | Continues to mean lifecycle-open/not-marked-closed filings, not a selected editor. |
| Dashboard row Edit | Explicitly selects that row's filing, enters its form editor, and restores its normal filing sidebar. |
| Dashboard row actions without a selected filing | Operate on their own row `wardId`; no action accidentally targets a stale former selection. |
| Continue Editing prompt | Offers prior history only; it does not populate the sidebar or open a filing until chosen. |
| Cross-tab/session state | Dashboard presence is reported as no active editing session; stale editor locks and active-filing announcements are cleared. |
| Direct/back/forward route transitions | Preserve the neutral/dashboard versus selected/editor distinction without data loss or focus errors. |

### Verification Plan (for the later implementation)

1. Add router/state unit tests for dashboard entry with an active filing, no
   active filing, unsaved data, and repeated dashboard entry. Assert the
   selected-editing state, last-edited history, and lifecycle `archived` flag
   are independent.
2. Add dashboard E2E coverage that edits a filing, returns to All Filings,
   verifies the neutral sidebar and absence of Close Editor, then uses Edit to
   restore the correct filing context. Cover row actions while no filing is
   selected.
3. Add tab/lock and browser-navigation coverage to prove dashboard entry clears
   stale editing-session state without losing saved changes or interfering with
   another tab.
4. Add accessibility checks for the neutral sidebar announcement, focus after
   transition, and the restored filing sidebar after Edit.
5. Update `TEST-INDEX.md`, run focused tests, then request permission before
   the full `npm test` suite.

## 38-8: Affirmative Incomplete-Draft Preview and Print Override

### Decision Recorded

A filer may deliberately Preview and Print an incomplete filing after an
affirmative acknowledgement. This supports working copies, supervisor review,
manual completion, and other legitimate draft workflows. It does not convert
an incomplete filing into a ready-to-file filing and does not suppress the
missing-requirements information.

Milestone 36 already provides a screen-scoped **Preview anyway** override when
ordinary validation blocks Preview. This objective extends that path to the
browser **Print** action for the same draft preview. It does **not** make Save
as PDF, Save as Word, Save as Excel, or court-portal actions available while
export-gating requirements remain unmet. Those final/distributable output paths
stay gated unless separately authorized.

### Override Boundary

1. The override applies only to ordinary, user-correctable filing validation or
   readiness failures. It cannot bypass a technical generation failure, missing
   required template/resource, corrupted data, unsupported browser capability,
   security/permission failure, or another condition for which no faithful
   preview can be rendered.
2. The user must take an explicit action such as **Preview and Print Draft**;
   there is no automatic fallback from a blocked output action. Before the first
   draft-preview/print action for that render, show a concise acknowledgement
   that identifies the number of unmet automatic requirements, provides access
   to their grouped list, and states that the result is not ready for filing.
3. Manual or unsupported Clerk/Filing Readiness reminders do not themselves
   require the override. They remain advisory, consistent with 38-5 and the
   existing validation/readiness distinction.
4. An override is ephemeral to the current preview render/session. It is not a
   persisted filing flag, does not change readiness status, does not rewrite
   data, and does not silently carry to another filing, browser session, or
   later freshly rendered preview.

### Implementation Plan

1. Audit the existing blocked-preview and `Preview anyway` implementation from
   MS 36 across all nine filing types. Consolidate the decision in a shared
   preflight/preview-state contract so Preview and Print cannot disagree about
   whether an acknowledgement is needed.
2. When ordinary export validation fails, render the grouped outstanding-items
   summary and the existing actionable routes. Offer **Preview and Print Draft**
   as the affirmative path. On acknowledgement, render the preview and enable
   its Print action for this draft session only.
3. Keep a persistent, high-contrast, non-dismissible on-screen draft notice in
   the preview: **Draft — requirements outstanding; not ready for filing.** It
   must include the outstanding count and a way to return to the grouped
   requirements list.
4. Ensure a document printed through the override bears a clear, print-visible
   draft notice or watermark identifying it as incomplete and not ready for
   filing. The marker must be confined to this override path and must never
   appear on a compliant normal output. It must not obscure required court-form
   content, signatures, or filled values.
5. Continue to disable/gate PDF, Word, Excel, and e-filing actions while the
   normal export validator reports errors. Their disabled/blocked explanations
   must distinguish “you may print a draft after acknowledgement” from “this
   filing is ready to submit.”
6. Recompute draft eligibility whenever the preview is refreshed or editing
   changes its validation result. If all export-gating requirements become
   satisfied, remove the draft warning and restore normal Print/output behavior;
   if new failures arise, require a new acknowledgement before printing again.
7. Maintain the existing Plan automatic-condition-to-export-validator invariant.
   The override changes only the user's ability to inspect/print an incomplete
   representation, never an automatic condition's status or an export-gate
   outcome.
8. Update help, walkthrough, button text, error announcements, and accessibility
   descriptions to distinguish a draft print from a completed filing. Do not
   describe it as a court-ready export.

### Acceptance Criteria

| Scenario | Expected result |
|---|---|
| Filing has ordinary unmet export requirements | User sees count/grouped details and must affirmatively select Preview and Print Draft before preview/print is enabled. |
| User declines acknowledgement | Preview remains blocked; no draft print begins and no filing state changes. |
| User affirms acknowledgement | An incomplete preview renders; Print is available for that preview session. |
| Printed draft | Carries a clear, non-obscuring printed draft/incomplete notice. |
| Normal compliant filing | Uses ordinary Preview/Print/output behavior with no draft marker or acknowledgement. |
| Draft preview with unmet requirements | PDF, Word, Excel, and court-portal actions remain blocked; their status cannot imply readiness. |
| Manual-only/unsupported readiness reminder | Does not require the draft override or create a false failure. |
| Technical rendering/preflight failure | Remains non-bypassable and explains why no faithful preview/print can be produced. |
| Edit or refresh after acknowledgement | Revalidates; a changed incomplete state requires a new acknowledgement, while a compliant state clears draft mode. |
| Switching filings | Does not transfer acknowledgement, draft mode, outstanding count, or print entitlement to the next filing. |

### Verification Plan (for the later implementation)

1. Add shared preflight/preview-state tests for valid, ordinary-invalid,
   manual-only, and non-bypassable technical-failure cases across all filing
   families.
2. Add focused E2E coverage for acknowledgement acceptance and refusal, preview
   rendering, Print availability, on-screen and print-visible draft markers,
   output-button gating, refresh/edit revalidation, and filing switching.
3. Test the actual print stylesheet/rendered DOM to confirm the draft marker is
   present only for override prints and does not cover court-form content.
4. Extend the 37-3 Plan invariant coverage to prove an override never mutates
   validator results or readiness condition outcomes.
5. Update `TEST-INDEX.md`, run focused tests, then request permission before
   the full `npm test` suite.

## Implementation Gate

Do not start Milestone 38 implementation until the requester explicitly
authorizes it. At implementation time, reconcile the initial guardian-card
count with the actual completion state of MS 37-6 before changing any factory
default. Do not begin 38-5 until MS 37-1's county-policy mechanism and MS
37-3's readiness/validation invariant work are complete, or until their
equivalent behavior has been separately verified.
