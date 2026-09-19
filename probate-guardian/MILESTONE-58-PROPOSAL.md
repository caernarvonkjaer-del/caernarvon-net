# Milestone 58: Party Integrity, Plan Fidelity, and Filing-Safety Cleanup — Scoping & Execution Proposal

## Status

**Draft — not authorization to implement.** Per `AGENTS.md` §3, nothing in
this proposal may be implemented until the requester explicitly approves the
named sub-delivery. Approval of one sub-delivery authorizes only that delivery.

This proposal was scoped on **2026-09-19** against `master` at `196e951` while
Milestone 57 work was still changing the shared worktree. The proposal itself
is the only file Milestone 58 scoping adds. Before executing any delivery,
sync with `master`, inspect the real diff, and re-derive the cited symbols and
tests. In particular, **58D must wait for Milestone 57's Annual Accounting
work to land, then revalidate `src/features/annual-accounting/excel.js` and its
tests against that landed state before implementation begins.**

---

## Purpose

Resolve the surviving, reproducible findings from a browser-level review of
all nine filing types without treating that review as authoritative by itself.
The milestone protects shared Party records from mixed-identity writeback,
corrects Annual Plan — Minors carry-over and PDF output, makes the Initial
Guardianship Plan attorney-email rule honest in both UI and validation,
repairs Part XI remuneration parity and output fidelity, and makes permanent
filing deletion identify its exact target.

The milestone does **not** claim that these changes establish legal
sufficiency. The source court forms are baselines for field identity and
layout, while validation and wording choices that go beyond them are stated as
product decisions made by the requester.

---

## Evidence and decision record

### Source-form baseline

The requester supplied four filed-plan PDFs for this review. They are review
evidence, not repository assets, and this milestone does not add them to the
application bundle:

| Filing type | Source-form filename | Relevant verified evidence |
| --- | --- | --- |
| Initial Guardianship Plan | `508_Initial Guardianship Plan 111722 (1).pdf` | The attorney-certification page has name, signature/date, bar number, phone, and address fields, but no email field. |
| Simplified Annual Plan | `508_Fillable Simplified Annual Plan - 2024.pdf` | Reviewed as the Simplified Plan baseline; it does not change a reported finding in this milestone. |
| Annual Plan — Minors | `Annual Plan - Minors.pdf` | The cover includes one set of Yes/No controls, a required Residence Name line, distinct UCN and REF fields, and “Taxpayer Identification #” on guardian/preparer signature pages. |
| Annual Guardianship Plan | `AnnualGuardianshipPlan (1).pdf` | Reviewed as the adult Annual Plan baseline; it does not change a reported finding in this milestone. |

The repository’s embedded `templates/annual-template.js` remains the baseline
for Annual/Final/Trust Accounting. Its `PART XI` sheet contains the statutory
declaration paragraph but no remuneration-entry grid. The defined print area
is `A1:G32`; current export code writes invented row data at `B/D/F/I`, rows
16–40, including column `I` outside that print area. This is an output-fidelity
defect, not evidence that the source form requires the app’s Description
field.

### Explicit requester decisions that override the literal source forms

1. **Initial Plan attorney email remains a required app field when an attorney
   certification is started.** A completely blank attorney block remains valid
   for pro se and Chapter 393 Guardian Advocate filings. The source PDF’s lack
   of an email line does not remove the app requirement.
2. **Annual Plan — Minors uses the label `SSN/EIN`.** This replaces the source
   form’s “Taxpayer Identification #” wording in both the editor and generated
   PDF. Persisted keys remain `tin` and `preparer_tin`; this is a presentation
   change, not a schema rename.
3. **Residence Name carries forward.** It is no more inherently stale than
   other deliberately carried filing data and remains editable by the filer.
4. **The redundant minor-plan Yes/No checklist is removed.** One clear answer
   per question remains.
5. **The minor-plan PDF uses one canonical case number.** UCN and REF remain
   separately editable on the cover, but they are never concatenated into a
   synthetic header value.

### Finding disposition

| Finding | Disposition | Delivery |
| --- | --- | --- |
| H1 — linked attorney block can write stale fields into a Party | **Confirmed and generalized.** The whole-slot writeback affects every mapped Party role, not only Trust Accounting attorneys. | 58A |
| H2 — duplicated minor-plan PDF case number | **Confirmed.** Current code concatenates `ucn` and `ref`. | 58B |
| H3a — Initial Plan attorney-email asterisk | **Confirmed, reframed.** Email stays required once the attorney block starts; the marker must use that same condition. | 58C |
| H3b — remuneration has no “none” state and Description is unvalidated | **Partly false, partly a discoverability defect.** `scheduleNoItems.remuneration` can already record an explicit none declaration, but the default blank row prevents the empty-state control from appearing until that row is removed. The remaining gaps are parity, the false Description asterisk, PDF omission, and unsafe Excel placement. | 58D |
| H4 — minor residence name is not carried | **Confirmed; policy decided by requester.** Carry the latest source value and leave it editable. | 58B |
| M1 — minor Yes/No answers render twice | **Confirmed.** | 58B |
| M2 — automatic blockers disagree with 100% progress | **Rejected as written.** H3a currently has validator/nav parity; H3b’s reported direction is wrong. Any real parity repair is specified concretely in 58C/58D rather than retained as an “all forms” task. | None |
| M3 — delete confirmation does not identify the filing | **Confirmed.** | 58E |
| L1 — Taxpayer ID vs. SSN/EIN | **Requester-directed presentation change.** The source form uses Taxpayer Identification, but the product will standardize on SSN/EIN. | 58B |

---

## Delivery index and dependencies

| Delivery | Scope | Risk | Relation |
| --- | --- | --- | --- |
| **58A** | Field-granular Party write-through and canonical linked-slot reconciliation | High — shared identity integrity | Independent |
| **58B** | Annual Plan — Minors carry-over, case number, duplicate answers, and SSN/EIN wording | Medium — persisted carry-over and court-facing PDF | Independent |
| **58C** | Initial Plan conditional attorney-email required state | Medium — export blocker/pro se protection | Independent |
| **58D** | Annual-family Part XI remuneration parity and safe output | High — court-facing PDF/Excel | Wait for MS 57’s `annual-accounting/excel.js` work to land |
| **58E** | Filing-specific permanent-delete confirmation | Low–medium — destructive-action safety | Independent |

58A–58C and 58E touch separate primary code paths and may be executed in any
order after checking the live tree. 58D is deliberately last if Milestone 57
still touches Annual Accounting Excel output.

### Expected file surface

This is the implementation boundary to re-check against the live tree before
each approved delivery; it is not permission to edit the files early.

| Delivery | Expected production/data files | Existing tests to change |
| --- | --- | --- |
| 58A | `src/core/party-resolver.js`; `src/core/form/form-contract.js` | `tests/e2e/party-resolver.spec.ts`; `tests/e2e/party-write-through.spec.ts`; `tests/unit/form-write-side-effects.spec.js` |
| 58B | `src/core/navigation/ward-lifecycle.js`; `src/legacy-app.js`; `src/features/plan-minor/index.js`; `src/features/plan-minor/pdf-model.js`; `probate-guardian-data-model.csv` | `tests/unit/ward-carryover.spec.js`; `tests/unit/plan-tristate.spec.js`; `tests/unit/ssn-format.spec.js`; `tests/e2e/plan-minor-mount.spec.ts`; `tests/e2e/pdf-form-specific.spec.ts` |
| 58C | `src/features/plan-initial/index.js`; `src/legacy-app.js`; a narrowly scoped core validation helper; `src/core/types/window-bridge.d.ts`; `tests/unit/fixtures/window-bridge-allowlist.json` | `tests/unit/plan-initial-parity.spec.js`; `tests/unit/window-bridge.spec.js`; `tests/e2e/navigation-status.contract.spec.ts`; `tests/e2e/plan-initial-mount.spec.ts` |
| 58D | `src/core/state.js`; `src/legacy-app.js`; `src/features/annual-accounting/index.js`; `src/features/annual-accounting/pdf-model.js`; `src/features/annual-accounting/print.js`; `src/features/annual-accounting/excel.js`; `probate-guardian-data-model.csv` | `tests/e2e/annual-mount.spec.ts`; `tests/e2e/annual-schedule-consistency.spec.ts`; `tests/e2e/excel-form-field-placement.spec.ts`; `tests/unit/annual-accounting-pdf-model.spec.js`; `tests/unit/excel-write-targets.spec.js`; relevant capacity/parity specs |
| 58E | `src/legacy-app.js` | `tests/e2e/routes.spec.ts` |

---

## 58A — Field-Granular Party Write-Through

### Confirmed defect

`runFieldWriteSideEffects()` resolves a changed identity field to only a
`{ role, index }` slot. `syncIdentityField()` then calls
`dehydrateIntoParty()`, which copies the **entire** filing-side role block into
the linked Party before fanning that Party out to other open filings.

If one field is current and neighboring fields are stale—for example a changed
attorney name beside an old bar number and email—editing any mapped field can
promote the whole mixed block into the canonical Party and distribute it to
every linked open filing. Names, bar numbers, and emails are not unique enough
to infer that two records are different people, so the suggested cross-record
matching heuristic is rejected.

### Implementation

1. Extend the existing reverse mapping in `party-resolver.js` so an identity
   path resolves to `{ role, index, fieldKey }`, where `fieldKey` is the flat
   Party key (`name`, `barNumber`, `email`, `street`, etc.). Joined and split
   address shapes must map to their canonical address field without inventing
   a second mapping table.
2. Change `syncIdentityField()` to accept the changed `fieldKey` and merge only
   that field’s finalized value into the linked Party. It must never dehydrate
   untouched neighbors as a side effect of one edit.
3. After the single-field merge, hydrate the Party’s complete canonical block
   back into **all open linked slots, including the edited slot**. This removes
   stale neighboring values rather than letting a mixed block remain visible.
   Closed filings retain their historical snapshots and continue using the
   existing explicit “Sync with Current” workflow.
4. Preserve atomic link/relink behavior: choosing an existing Party still
   hydrates every mapped field from that Party at once; creating a new Party
   still seeds it from the complete local block once.
5. Treat an edit to a linked name as a rename of that linked Party. Replacing
   the person uses the existing **Link Person** workflow; do not guess identity
   from name, bar number, email, or other content.
6. Keep the existing autosave, dirty-state, sidebar-name, and
   `pg:field-written` ordering. The Party update still occurs before autosave.

### Data and compatibility

- No persisted fields are added or renamed; no CSV row or `.sav` migration is
  required.
- Existing linked open filings adopt the canonical Party values when a mapped
  field is next edited or the link is explicitly selected. Closed filings are
  never rewritten automatically.
- Party data remains sensitivity-classified exactly as today; the change
  prevents unintended propagation but does not add encryption or access
  control.

### Verification

Extend `tests/e2e/party-resolver.spec.ts`,
`tests/e2e/party-write-through.spec.ts`, and
`tests/unit/form-write-side-effects.spec.js`:

- Start with a linked attorney slot whose local name/contact block differs from
  the Party. Editing email changes only canonical email; it does not overwrite
  canonical name, bar number, phone, or address.
- After that edit, the current open slot and another open linked filing contain
  the Party’s complete canonical block.
- Editing a linked name renames that Party but preserves its other canonical
  fields.
- Linking a different Party atomically replaces the entire role block.
- A closed linked filing remains unchanged until its explicit sync action.
- Unlinked fields and non-identity paths behave exactly as before.

---

## 58B — Annual Plan — Minors Fidelity and Carry-Over

### B1 — Canonical PDF case number

- Import and use the canonical `caseNumberOf()` rule in the Plan Minor PDF
  model for metadata and repeated page headers. Pass an explicit Plan Minor
  identity when a narrow unit fixture omits `inventoryType`; do not re-create
  the `ucn || ref` fallback locally.
- Preserve the source form’s separately labeled UCN and REF values on the
  cover; only the synthetic combined header value changes.
- Precedence is exactly `ucn || ref || ''`. If both are equal or both are
  populated, the PDF header still prints only the canonical value once.

### B2 — Carry Residence Name

- Add `q1ResidenceName: src.q1ResidenceName || ''` to the Plan Minor carry
  mapping. A source filing without that field produces blank, never an invented
  facility name.
- Starting a new Plan Minor year preserves the prior `q1ResidenceName` while
  continuing to reset reporting-period answers, prior-residence rows,
  providers, signatures, and all other year-specific declarations under the
  existing rules.
- The carried value remains editable and remains required by the existing
  validator/readiness rules.

### B3 — Render each Yes/No fact once

- Remove the duplicate checklist for Amended Form, Professional Guardian, and
  Public Guardian from the PDF model.
- Retain one explicit labeled value for each question in the cover summary.
  Keep the amended-version notice when Amended Form is Yes.
- Do not change tri-state storage or treat unanswered as No.

### B4 — Standardize the displayed label to SSN/EIN

- Change the Plan Minor guardian and preparer editor labels, generated-PDF
  labels, validation messages, readiness copy, and user-facing help/tests from
  “Taxpayer ID” to **“SSN/EIN.”**
- Keep persisted paths `planGuardians[].tin` and `preparer_tin` unchanged so
  existing `.sav` files require no migration.
- Update the two data-model row descriptions to say SSN/EIN while retaining
  their `ssn-ein` format and `government-id` sensitivity classification.
- Continue masking the value in the editor and formatting it through the
  existing SSN/EIN output helper. This terminology change does not broaden the
  app’s protection against someone who can access an unlocked filing or its
  exported court document.

### Verification

Extend the existing Plan Minor tests rather than creating a new test file:

- `tests/unit/ward-carryover.spec.js`: Plan Minor → Plan Minor carry and new
  year preserve `q1ResidenceName`; non-Plan-Minor sources leave it blank.
- `tests/e2e/plan-minor-mount.spec.ts`: editor labels show SSN/EIN and no
  Taxpayer ID label.
- `tests/unit/ssn-format.spec.js`: guardian and preparer PDF fields are labeled
  SSN/EIN and remain masked/formatted correctly.
- `tests/unit/plan-tristate.spec.js`: all three cover answers appear once and
  retain true Yes/No/unanswered semantics.
- `tests/e2e/pdf-form-specific.spec.ts`: with equal `ucn`/`ref`, and with two
  different populated values, the repeated PDF case header contains the
  canonical case number exactly once.
- Run `npm run verify:data-model` after the label-description edits.

### Acceptance criteria

- A carried Plan Minor filing opens with the prior Residence Name populated and
  editable.
- No generated page contains `UCN + REF` concatenation.
- The cover output does not repeat Amended/Professional/Public Guardian in a
  second checklist.
- “Taxpayer ID” does not remain on Plan Minor editor, readiness, validation, or
  PDF surfaces; persisted `tin` data continues to load unchanged.

---

## 58C — Initial Plan Attorney Email: Required Only When the Block Starts

### Decision

The Initial Guardianship Plan’s attorney certification is optional as a whole
for pro se and Chapter 393 Guardian Advocate filings. Once any attorney
information is entered, Primary Email (e-filing) is required. This is an
explicit product rule even though the supplied source PDF has no attorney
email line.

### Implementation

1. Define one shared pure `isPlanInitialAttorneyStarted(d)` predicate covering
   **all** attorney-entry fields: name, bar number, primary/secondary email,
   street, city/state/ZIP, phone, signature date, and any signature state other
   than `none`/blank. Put it in a small core validation module, import it in the
   Plan Initial feature, and expose the same function through the established
   `window` bridge for `legacy-app.js`'s classic-script sidebar calculation.
   Update `window-bridge.d.ts`, the bridge allowlist, and their existing guard
   tests in the same delivery; do not create a second predicate in legacy code.
2. Use the predicate for the email required marker, `aria-required` state,
   export validation, and the Initial Plan sidebar completion rule. Do not
   maintain narrower, separately evolving predicates.
3. Update the marker live after an attorney field write without rebuilding the
   field and losing focus or caret position.
4. A completely blank block has no required marker and creates no issue. A
   started block requires attorney name, primary email, and a valid signature
   state under the existing signature rules.
5. Keep the stored `attorney_email` field and its existing conditional row in
   `probate-guardian-data-model.csv`; update its note only if necessary to list
   the finalized start predicate.

### Verification

Extend `tests/e2e/navigation-status.contract.spec.ts`,
`tests/e2e/plan-initial-mount.spec.ts`, and
`tests/unit/plan-initial-parity.spec.js`:

- Blank attorney block: no email asterisk, section complete, no export issue.
- Starting with phone, address, bar number, secondary email, name, signature
  date, or an active signature state: email marker appears and validator/nav
  both report incomplete while primary email is blank.
- Adding a valid primary email clears the email issue but does not bypass
  missing name/signature requirements.
- Clearing the whole block restores the pro se state without coercing or
  deleting unrelated filing data.

---

## 58D — Part XI Remuneration: Honest Completion and Safe Output

### Corrections to the reported finding

- The app already has an explicit `scheduleNoItems.remuneration` checkbox:
  “I verify there are no remuneration entries to report for this schedule.” No
  new persisted “none declared” field is needed. However, Annual-family state
  starts with one blank remuneration row, and the checkbox renders only when
  the array is empty. The declaration therefore exists but is hidden behind
  removing a meaningless placeholder row.
- Description is optional in `probate-guardian-data-model.csv`, and the source
  workbook provides no structured remuneration fields at all. The UI’s red
  Description asterisk is therefore the error; adding a new Description
  blocker would invent unsupported requiredness.
- Current sidebar logic requires either the explicit no-items declaration or
  complete rows, while `validateAnnual()` does not require either. The browser
  report’s claimed direction was wrong, but a real parity defect exists in the
  opposite direction.

### Implementation

1. Make the existing none declaration directly reachable:
   - new Annual/Final/Trust filings start `remuneration` at `[]`, not one blank
     placeholder row;
   - loading a legacy array containing only wholly blank placeholder rows
     normalizes it to `[]` without changing meaningful entries;
   - **Add Entry** clears `scheduleNoItems.remuneration` before adding the row;
     removing the last row exposes the none-declaration control again; and
   - meaningful rows take precedence over a stale contradictory no-items flag,
     which is normalized to false without deleting row data.
2. Require Part XI to be affirmatively resolved before export:
   - either `scheduleNoItems.remuneration === true`, or
   - at least one populated remuneration row, with every populated row carrying
     Guardian Name, Type, and Amount.
3. Make Description visibly optional and keep it out of both validation and
   sidebar-required field lists.
4. Update the annual-accounting data-model remuneration rows so their initial
   count is `0`, and change `remuneration[].amount` from optional to conditional
   when a row is populated. No field is added, and a missing legacy
   `scheduleNoItems.remuneration` remains false/unanswered rather than being
   inferred as “none.”
5. Generated PDF output always includes Part XI:
   - confirmed none: print the statutory declaration heading/text plus a clear
     “No remuneration reported for this period” statement;
   - rows present: print the existing table, including optional Description;
   - unresolved blank: export validation blocks before output.
6. Do not write remuneration rows into unlabeled cells on the official Excel
   template. When populated rows exist, treat Excel as incapable of faithfully
   representing Part XI and disable/block Excel export with a specific,
   non-bypassable fidelity message directing the filer to PDF output. When
   “none” is affirmatively selected, Excel export may retain the source sheet’s
   declaration paragraph without inventing a grid or a new court-form field.
7. Leave Excel import asymmetry explicit: the official workbook has no entry
   range to import, so it must not infer remuneration rows or a no-items
   declaration from blank cells.

### Data, migration, and portability

- Existing remuneration rows and `scheduleNoItems` values already travel in
  `.sav`. The only migration is shape normalization: an array containing no
  meaningful row data becomes `[]`; populated rows are preserved byte-for-byte.
- Legacy files missing the no-items key open as unresolved, requiring the filer
  to declare none or enter rows. They must not silently become “none.” A stale
  true flag beside meaningful rows becomes false so the stored rows cannot be
  hidden behind a contradictory declaration.
- Remuneration Amount retains its existing financial sensitivity; Description
  remains ordinary free text but may contain sensitive content entered by the
  filer.
- PDF and Excel capabilities diverge only where the official Excel template
  cannot faithfully carry populated details; the UI must state that reason
  before the user attempts download.

### Verification

Extend `tests/e2e/annual-mount.spec.ts`,
`tests/e2e/annual-schedule-consistency.spec.ts`,
`tests/e2e/excel-form-field-placement.spec.ts`,
`tests/unit/annual-accounting-pdf-model.spec.js`,
`tests/unit/excel-write-targets.spec.js`, and the relevant capacity/parity
specs after Milestone 57 lands:

- A new Annual/Final/Trust filing starts with no placeholder row and displays
  the explicit none-declaration choice immediately.
- A legacy blank-only array normalizes to `[]`; a meaningful legacy row is
  preserved, and a stale true no-items flag beside it is cleared.
- Blank rows plus no declaration: sidebar incomplete and export blocked by the
  same structured issue.
- Explicit none: sidebar complete, validation green, PDF includes the none
  statement, and Excel export remains available.
- A partial row: Guardian/Type/Amount omissions block both sidebar and export;
  blank Description does not.
- A complete row: PDF table contains all entered fields; Excel export is
  blocked with the Part XI fidelity message.
- Workbook inspection proves no remuneration values are written to the
  invented `B/D/F/I16:40` targets and nothing is written outside `A:G` on
  `PART XI`.
- `npm run verify:data-model` passes.

---

## 58E — Filing-Specific Permanent-Delete Confirmation

### Implementation

Build the confirmation from canonical filing information rather than
hand-written per-type branches:

- Filing name: `resolveDescriptorForInventoryType(ward.inventoryType)` and its
  `displayName`, with a safe fallback for an unknown legacy type.
- Subject: ward/person display name.
- Case number: `caseNumberOf(ward)`.
- Period: formatted `periodFrom` through `periodTo` when present; omit the
  period clause for Initial Inventory or an incomplete legacy record rather
  than displaying blanks.
- Preserve the existing prior-year count warning and the final “This action
  cannot be undone.” sentence.

Example:

> Delete Trust Accounting for “Dorothy Jean Ashford” — case 26-001203-GD,
> 03/14/2025 through 03/13/2026? This action cannot be undone.

The confirmation still targets the captured `_pendingDeleteWardId`; changing
the message must not change which filing is deleted.

### Verification

Extend the existing delete route/dashboard coverage in
`tests/e2e/routes.spec.ts`:

- Two filings for the same ward but different type/period produce distinct
  confirmation messages.
- Plan Minor resolves its case number using UCN then REF fallback.
- Initial Inventory omits an empty period cleanly.
- Archived-year count remains visible when applicable.
- Confirm deletes exactly the selected dashboard card; cancel deletes nothing.

---

## Cross-cutting ramifications

### Data model and legacy `.sav` files

- No persisted path is added, removed, or renamed. 58D changes the normalized
  empty shape of one existing collection from one blank row to an empty array.
- 58B updates human-readable descriptions for `tin`/`preparer_tin`; the keys
  remain for backward compatibility.
- 58D changes the four annual `remuneration[]` data-model rows to an initial
  count of zero, corrects `remuneration[].amount` requiredness metadata, and
  uses the existing `scheduleNoItems` object. Missing legacy declarations
  remain unanswered.
- Run `npm run verify:data-model` for 58B and 58D.

### Export, import, and portability

- 58B changes Plan Minor PDF composition only; Plan forms have no Excel path.
- 58D deliberately prevents a populated declaration from being silently placed
  outside the official Excel form’s supported area. PDF remains the faithful
  output path for those entries.
- Full-case `.sav` export/import needs no migration because every affected
  persisted key already exists.

### Security and sensitivity

- 58A reduces unintended disclosure/corruption propagation across linked Party
  records but does not claim to protect data on an unlocked device.
- 58B continues to treat `tin`/`preparer_tin` as government identifiers despite
  the presentation rename to SSN/EIN.
- 58D remuneration amounts remain financial data. No new cloud transmission or
  storage mechanism is introduced.

### UI/UX and accessibility

- Reuse existing form-field primitives, entry cards, modal, and semantic theme
  tokens; no new framework or one-off visual system.
- Conditional required state in 58C must update visible marker,
  `aria-required`, validator, and sidebar together.
- 58E keeps the existing accessible confirmation modal and improves only its
  identifying text.

### Legal/compliance framing

- Source forms establish the baseline but do not themselves prove legal
  sufficiency.
- Attorney email and SSN/EIN wording are explicit requester product decisions
  that differ from at least one supplied source form; the app must not describe
  them as court-mandated without separate authority.
- The Part XI rule records the filer’s declaration and prevents unsupported
  Excel placement; it does not advise whether remuneration is legally proper.

### Test index

This proposal extends existing specs and adds no test file, so
`TEST-INDEX.md` does not need an entry solely for Milestone 58. If execution
creates, renames, or materially repurposes a spec instead, update
`TEST-INDEX.md` in that same sub-delivery and run its guard.

---

## Acceptance matrix

| Scenario | Required result |
| --- | --- |
| Edit one field in a stale linked attorney block | Only that canonical Party field changes; stale neighbors cannot overwrite the Party |
| Relink an attorney | All mapped fields hydrate atomically from the selected Party |
| Generate Plan Minor PDF with equal UCN and REF | Case number appears once in metadata/header text |
| Carry a prior Plan Minor filing | Residence Name carries and remains editable |
| Inspect Plan Minor cover output | Amended/Professional/Public Guardian answers appear once each |
| Inspect Plan Minor identity labels | SSN/EIN appears; Taxpayer ID does not |
| Leave Initial Plan attorney block blank | No email asterisk and no attorney blocker |
| Start Initial Plan attorney block without email | Email becomes visibly required; sidebar and export agree |
| Leave Part XI unresolved | Sidebar incomplete and export blocked |
| Declare no remuneration | PDF says none; Excel remains available |
| Enter remuneration rows | PDF includes them; Excel refuses unsupported placement with an actionable message |
| Delete among multiple filings for one ward | Modal names the precise filing type, case, and period before deletion |

---

## Verification plan

Use targeted tests per sub-delivery, selected from `TEST-INDEX.md`:

| Delivery | Minimum verification |
| --- | --- |
| 58A | `tests/unit/form-write-side-effects.spec.js`; `tests/e2e/party-resolver.spec.ts`; `tests/e2e/party-write-through.spec.ts` |
| 58B | `tests/unit/ward-carryover.spec.js`, `plan-tristate.spec.js`, `ssn-format.spec.js`; `tests/e2e/plan-minor-mount.spec.ts`, `pdf-form-specific.spec.ts`; `npm run verify:data-model` |
| 58C | `tests/unit/plan-initial-parity.spec.js`; `tests/e2e/navigation-status.contract.spec.ts`; `tests/e2e/plan-initial-mount.spec.ts`; bridge guard coverage |
| 58D | `tests/e2e/annual-mount.spec.ts`; `tests/e2e/annual-schedule-consistency.spec.ts`; `tests/e2e/excel-form-field-placement.spec.ts`; `tests/unit/annual-accounting-pdf-model.spec.js`; `tests/unit/excel-write-targets.spec.js`; relevant capacity/parity specs; `npm run verify:data-model` |
| 58E | Delete scenarios in `tests/e2e/routes.spec.ts` |

Because 58A changes shared identity propagation and 58D changes both validation
and two export paths, recommend a full `npm test` after all approved deliveries
land. Per `AGENTS.md` §2, obtain the requester’s approval immediately before
running that full regression; targeted tests do not require a separate gate.

---

## Deliberately out of scope

- Inferring that two Parties are the same or different from name, email, bar
  number, or other content.
- Renaming persisted Plan Minor keys `tin` or `preparer_tin`.
- Adding a second remuneration-none field when `scheduleNoItems.remuneration`
  already exists.
- Inventing an Excel remuneration grid or expanding the official workbook’s
  print area without a replacement court template that actually defines one.
- Treating manual Clerk’s Review reminders as automatic export blockers.
- Reworking the four Plan forms into a new rendering architecture; these are
  localized maintenance fixes under `AGENTS.md` §6.
- Committing the requester-supplied baseline PDFs or shipping them in the
  application bundle.
- Correcting unrelated Milestone 57 work or committing another contributor's
  active working-tree changes.
