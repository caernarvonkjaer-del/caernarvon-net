# Milestone 57: Bond Waiver, Certificate-of-Service Defaults, Schedule Attachments, B-4 Bank Grouping, Trust-Aware Audit Fee, Excel/PDF Output Fixes, and Plan Supporting-Documents Labeling — Scoping Proposal

## Status

**Draft — not an authorization to implement.** Per `AGENTS.md` §2, this
document is a proposal only. Nothing below should be started until Alan
explicitly approves a named sub-delivery by name. Approval of one
sub-delivery authorizes only that one; every other sub-delivery, including
ones listed after it here, requires its own explicit approval.

**Numbering note.** Milestone 57 confirmed unused on 2026-09-18 — repo-wide
grep for `milestone.?57`, `57[A-Z]`, and `git log --all --grep` for
"Milestone 57" / "MS57" / "MS 57" all return nothing.

**Source.** Nine items of live user feedback (Alan, 2026-09-18), covering
Guardian Inventory, Annual Accounting, the Excel exporter, and the shared
PDF engine — quoted verbatim under each item below. This is a container for
nine independent fixes across four different filing-type modules and one
shared engine, not one coherent piece of work: read "the order listed" as
reporting order, not a required execution sequence. File-level overlaps that
do create real sequencing constraints are called out explicitly in
**Sequencing and concurrency**, not implied by list order.

**How this proposal was built.** Every diagnosis below was independently
verified against the current `master` working tree (file:line citations
throughout), not inferred from the feedback text alone. Two items (57G-i,
57G-iii) could not be reproduced from a static read of the source and are
scoped as "needs reproduction" rather than as a fix, per this repo's own
prior finding (Milestone 34's Phase D) that a product fix must not be built
on a screenshot or an unreproduced report alone.

---

## Ordered Issue Register

| # | Area | User's words (paraphrased where combined across two messages) | Sub-delivery |
| --- | --- | --- | --- |
| 1 | Guardian Inventory | "Requirement for bond information – box to check if bond was waived or box to check if there is a restricted depository." | 57A |
| 2 | Guardian Inventory | "Certificate of Service – only one recipient necessary." | 57B |
| 3 | Guardian Inventory | "Schedules – if anything is added to a schedule, not allowing them to go forward without uploading supporting documentation." | 57C |
| 4 | Annual Accounting | "Schedule B-4 bank information — a way to add bank name and account number once and then all the disbursements for that account, and another bank account once, then its disbursements." | 57D |
| 5 | Annual Accounting | "Certificate of service – box to check if none." | 57E |
| 6 | Annual Accounting | "Can it ask whether there is a trust accounting and the value of the trust assets for determining the audit fee?" | 57F |
| 7 | Excel export | "Does not populate the ward's name and case number on each page... has the date format as year/month/day... will not let you adjust the disbursement amount column to show the true value." | 57G |
| 8 | PDF export | "The PDF output cuts off the year for the period end." | 57H |
| 9 | Plan Annual | "Annual Plan shows accounting instead of plan." | 57I |

---

## 57A — Guardian Inventory: Bond Waiver / Restricted-Depository Relief

### User-observed defect

> Requirement for bond information – box to check if bond was waived or box
> to check if there is a restricted depository.

Every Guardian Inventory filing is currently forced to enter a Bond Amount,
Bond Period (From/To), and Bonding Company — even when the bond was legally
waived, or when every asset is already in a court-supervised restricted
account that makes a bond unnecessary.

### Confirmed diagnosis

- **A free-text waiver date field already exists but is inert.**
  `emptyDataGuardian()` (`src/legacy-app.js:5533`) carries `bondWaivedDate`,
  rendered at `src/features/guardian-inventory/index.js:1122` as
  `optLabel('If bond waived – date of order')+textInput('bondWaivedDate')`.
  It is never read by the validator, never read by any readiness check, and
  — confirmed by grep across every `pdf-model.js` — **never rendered in the
  generated PDF at all** (Schedule D-4's block, `pdf-model.js:549-558`, emits
  only Bond Amount / Bond Period / Bonding Company). A filer who fills in a
  waiver date gets no credit for it anywhere and the fact is invisible in the
  filed document.
- **All four bond fields are unconditionally required.**
  `src/features/guardian-inventory/index.js:1243`:
  ```js
  req(d.bondAmount,'D-4 — Bond Amount','bondAmount');
  if(!d.bondPeriodFrom)push('D-4 — Bond Period From is required.','bondPeriodFrom');
  if(!d.bondPeriodTo)push('D-4 — Bond Period To is required.','bondPeriodTo');
  req(d.bondingCompany,'D-4 — Bonding Company','bondingCompany');
  ```
  No branch relaxes this when `bondWaivedDate` is filled.
- **A restricted-depository concept already exists, but only per asset row,
  and it already feeds the bond calculation — the validator just doesn't
  consult the result.** Schedule B-1 (`index.js:783`) and Schedule B-3
  (`index.js:894`) each carry a per-row `restricted` tri-state
  (`scheduleB1[i].restricted` / `scheduleB3[i].restricted`), with the
  in-app instruction "Mark Restricted if funds are in a court-supervised
  restricted depository. This affects the bond calculation." Those flags
  already drive `calc.bondRequired()` (`legacy-app.js:6237`ff, consumed at
  `index.js:1110-1115`) — when every liquid asset is restricted, the
  *calculated* bond requirement can already legitimately be `$0`. But the
  required-field check above never looks at that calculated value; the form
  still demands a Bond Amount and Bonding Company even when the app's own
  math says no bond is owed.
- **The court template's own label treats waiver as a date-of-order, not a
  checkbox.** Decoding `templates/guardian-template.js`'s `PART V` sheet
  confirms the official form's own instruction text: `B15`="If the surety
  bond has been waived, note the date of the order…", and `B25`="Guardianship
  bond amount should be the amount of all liquid assets less those in a
  restricted depository or frozen account." So the court form already
  expects both concepts (a waiver *date*, and restricted assets reducing the
  bond number) — the app just doesn't act on either.
- **CSV disagrees with the validator today, independent of this fix.**
  `probate-guardian-data-model.csv` L298-301 marks `bondAmount` /
  `bondPeriodFrom` / `bondPeriodTo` / `bondingCompany` as `optional`, while
  the validator (above) treats all four as hard-required. This existing
  drift should be resolved as part of 57A rather than left to compound.

### Decision needed

Two independent relief conditions are candidates, and they are not the same
thing legally: a **waived** bond (an order says no bond is required at all)
vs. a **calculated-zero** bond (a bond is still legally contemplated, but the
math against restricted/unrestricted assets comes out to $0). Recommend:

- Add a real boolean `bondWaived` (not just a date string) next to the
  existing `bondWaivedDate`, and relax Bond Amount / Bonding Company /
  Period to optional when `bondWaived` is checked.
- Separately, when `calc.bondRequired() === 0` (all qualifying assets are
  restricted), relax the same fields — the amount is legitimately `$0` and
  there is no bonding company to name.
- Render `bondWaivedDate` (and the fact of waiver) in the PDF's Schedule D-4
  block, which currently omits it entirely.

This changes what Florida Probate Rule 5.415 filings can validly export
without erroring — a legal-consequence decision, not a pure UI one. **Needs
Alan's explicit sign-off on the two relief conditions above (and their exact
wording) before implementation**, not just "approved as scoped."

### Files in scope

`src/legacy-app.js` (`emptyDataGuardian`), `src/features/guardian-inventory/index.js`
(D-4 render + `validateGuardian()`), `src/features/guardian-inventory/pdf-model.js`
(Schedule D-4 block), `src/features/guardian-inventory/excel.js` (D-4 read/write —
already has a cell for `bondWaivedDate`, `excel.js:423`/`:521`, so no template
change needed there), `probate-guardian-data-model.csv`.

### Required tests

Unit: bond-required-relaxed-by-waiver, bond-required-relaxed-by-restricted-total,
bond-still-required-when-neither-applies (existing validator specs extended).
E2E: waived bond exports cleanly with all four fields blank; PDF text
assertion that the waiver date now appears in Schedule D-4 output.

---

## 57B — Guardian Inventory: Certificate of Service Defaults to One Recipient

### User-observed defect

> Certificate of Service – only one recipient necessary.

A new Guardian Inventory filing starts with **two** blank, fully-required
Certificate of Service recipient cards, forcing the filer to either fill in
a second real recipient or manually delete the untouched one before they can
export.

### Confirmed diagnosis

- Default array literal, `emptyDataGuardian()` (`src/legacy-app.js:5534`):
  ```js
  serviceRecipients:[{name:'',address:'',cityStateZip:''},{name:'',address:'',cityStateZip:''}],
  ```
- The UI floor is 1 (Remove is hidden once one card remains,
  `src/features/guardian-inventory/index.js:1131`), and blank-card pruning
  (`src/core/form/prune-cards.js:5`, `min: 1`) only removes a **completely
  untouched** second row on navigation — the moment a filer starts typing
  in either card, both become permanently required by
  `src/features/guardian-inventory/index.js:1257`, which requires every
  element currently in the array.
- The PDF model already supports zero populated recipients gracefully — a
  `'None listed.'` notice block (`pdf-model.js:586-592`) — so nothing about
  the output format is what's forcing two rows; it is purely the default
  array length.

### Scope (narrow, no design decision needed)

Change the default array to a single blank recipient. The existing floor of
1 (`prune-cards.js:5`, the hidden-Remove-button rule at `index.js:1131`) is
untouched — a filer can still add up to the existing cap of 4
(`index.js:1141`) if they have more than one recipient; they're just no
longer forced to either fill in or delete a second one by default.

### Files in scope

`src/legacy-app.js:5534` only. (Excel's 4-cell template and its blank-fallback
import logic at `excel.js:427-428`/`:522` already tolerate any count from 1-4
and need no change.)

### Required tests

Unit: `emptyDataGuardian().serviceRecipients` has length 1. E2E: a fresh
Guardian Inventory ward reaches D-5 with exactly one recipient card and no
pre-existing validation error for a second, untouched one.

---

## 57C — Schedule Rows Require an Uploaded Supporting Document

### User-observed defect

> Schedules – if anything is added to a schedule, not allowing them to go
> forward without uploading supporting documentation.

### Confirmed diagnosis

- Supporting-document upload is **entirely optional today, everywhere**.
  Confirmed by grep: `scheduleDocs` (the attachment store,
  `src/legacy-app.js:7233-7478`) is never referenced by `validateGuardian()`
  or `validateAnnual()`, and `src/core/filing/readiness-config.js:39`
  explicitly places the whole `supplemental` category **outside** the
  readiness card (`OUT_OF_CARD_CATEGORIES`). Every one of the ten
  `supplemental.*` issue codes in `src/core/validation/issue-registry.js:15-24`
  carries `showInReadiness: false`, and every one of them is about a file
  *already uploaded* being unusable (too large, not a PDF, still checking,
  etc.) — none of the ten means "you didn't upload one."
- Readiness rows are built by regex-matching validator issue *text*
  (`readiness-config.js:356,358,365,386,388`); since no validator emits an
  "attachment missing" issue today, no readiness row for it can exist without
  a new validator issue backing it.
- The schedule-to-attachment linkage that *does* exist is purely structural
  (one `renderScheduleDocsSection(scheduleKey)` call per schedule page — 11
  call sites in Guardian Inventory, 14 in Annual Accounting, 11 in Plan
  Annual) with no row-count condition anywhere.

### Decision needed — this is the widest-scope item in this milestone

The feedback text is unambiguous about *mechanism* ("not allowing them to go
forward") but leaves several real policy questions open that materially
change both the legal exposure and the implementation size:

1. **Which filing types/schedules?** Guardian Inventory's itemized asset/
   income schedules (A-1, A-2, B-1..B-4, C-1..C-5) and Annual/Simplified
   Accounting's itemized schedules (schA, B1-B4, C, D1-D5, E, F1-F2) are
   row-based in the same sense the feedback describes. Plan Annual/Initial/
   Minor/Simplified's "schedules" (`planACover`, `planAResidences`, etc.) are
   narrative sections, not itemized rows with a meaningful "has anything been
   added" test — **recommend excluding the Plan family from 57C's scope**
   unless Alan says otherwise.
2. **Blocking (`auto`, export-blocking) or a manual reminder?** The feedback
   says "not allowing them to go forward," which reads as a hard export
   block. That is achievable — whether a file exists is fully
   machine-verifiable, satisfying the `auto` bar in `AGENTS.md` §4's
   Readiness vs. Export Validation Invariant — but it is also a real policy
   change: filings that export cleanly today, with schedule rows but no
   attachment, would stop exporting. **This needs Alan's explicit
   confirmation, not an implementation-only judgment call.**
3. **What counts as "anything added"?** A single populated row, or the
   schedule's `scheduleNoItems`-style verified-empty checkbox left unchecked?
   Recommend: any schedule with ≥1 row that is not itself
   flagged-and-passed as blank (mirroring the existing "Add at least one
   entry, or check the box verifying there are none" pattern at
   `guardian-inventory/index.js:1198-1204`) requires ≥1 uploaded file in that
   schedule's `scheduleDocs` bucket.

**Recommend, for approval:** blocking (`auto`), scoped to Guardian
Inventory's and Annual/Simplified Accounting's itemized schedules only, with
the "≥1 row → ≥1 file" rule above. **Do not implement any part of 57C until
Alan confirms scope and strictness explicitly** — of everything in this
milestone, this is the one most likely to surprise a filer who has never
needed to attach anything before.

### Files in scope (once approved)

`src/core/validation/issue-registry.js` (new `supplemental.schedule-missing-attachment`
code, `showInReadiness: true`), `src/core/pdf/supplemental-pdf.js` or a new
shared check consulted from `validateGuardian()`/`validateAnnual()`,
`src/core/filing/readiness-config.js` (new regex-matched row, kept out of
`OUT_OF_CARD_CATEGORIES`), each affected feature's validator.

### Required tests

Unit: a populated schedule with zero files blocks export; the same schedule
with ≥1 file (any size/status) does not; an empty schedule never requires a
file regardless of the `scheduleNoItems` checkbox state. E2E: readiness card
surfaces the new item with a working jump link to the schedule's upload
control.

---

## 57D — Annual Accounting Schedule B-4: Group Disbursements by Bank Account

### User-observed defect

> Schedule B-4 bank information – if there is a way to add bank name and
> account number along once and then all the disbursements for that
> account. And then someway to add another bank account information once,
> and then all the disbursements from that account.

### Confirmed diagnosis

- **The court template is already designed exactly this way, and the app
  ignores it.** Decoding `templates/annual-template.js`, Schedule B-4's own
  worksheets (`SCH B-4 OTHER DISB p2` through `p19`, one page per bank
  account, 25 disbursement lines each) each carry a literal, currently-blank
  header pair: `"BANK:"` (merged `B6:C6`, value cell `D6:F6`) and
  `"ACCOUNT NUMBER #:"` (merged `G6:H6`, value cell `H6:I6`). `excel.js`
  never writes to either value cell, and never writes past sheet `p2`.
- **A `bankAcct` field already exists in the schema and is completely
  dead.** `SCHEDULE_SCHEMAS.schB4.factory`
  (`src/core/form/schedule-definitions.js:64-76`) — the factory the UI's own
  `+ Add Entry` button uses — already produces
  `{ bankAcct:'', checkNo:'', datePaid:'', payee:'', description:'', category:'', amount:'' }`.
  It is documented in `probate-guardian-data-model.csv:589` ("Disbursement
  bank/account") but: not rendered in the web form
  (`src/features/annual-accounting/index.js:850-876` renders only Check #/
  Date/Category/Payee/Amount — contrast B-1/B-2/B-3, which *do* render a
  `Bank Account #` input at `index.js:756,788,820`); not validated
  (`index.js:1523`'s `checkRows()` call omits it, unlike B-1/B-2/B-3's calls
  at `index.js:1520-1522`); not in the PDF (`pdf-model.js:499-518`'s check
  register has no bank column, unlike B-1/B-2's `pdf-model.js:397,430` and
  B-3's `:461`); dropped entirely on Excel import
  (`excel.js:552-557` reconstructs rows as the 5-field legacy shape).
- **Two other factories for the same schedule disagree with the schema
  factory** — `emptyRowAnnual('schB4')` (`legacy-app.js:3921`) and
  `BLANK_SCHEDULE_ENTRY.schB4` (`legacy-app.js:6161`) both use the 5-field
  shape with no `bankAcct`. Because blank-row pruning
  (`isBlankScheduleEntry()`, `prune-cards.js:36-46`) compares a row's keys
  against `BLANK_SCHEDULE_ENTRY.schB4`, a UI-added row (which *does* have
  `bankAcct:''`) never matches "blank" and is therefore **never pruned** —
  the one schedule where an untouched row silently survives navigation,
  unlike every other schedule.
- Excel export caps Schedule B-4 at 25 rows total
  (`excel.js:43`, `cap:25`) and writes only to sheet `p2` — a filing with
  more than 25 disbursements across all banks combined is already
  hard-blocked from exporting today, regardless of how many bank accounts
  are involved.

### Decision needed

The feedback describes a genuinely two-level structure (bank accounts, each
containing its own disbursement lines) — not just "add a bank field to each
row." Two implementation shapes are possible:

- **Option 1 (minimal):** Keep `schB4` as one flat array; finish wiring the
  already-existing `bankAcct` field per row (render it in the UI like
  B-1/B-2/B-3 already do, validate it, add it to the PDF check-register
  columns, write it to the Excel template's per-page header when rows are
  grouped by value). Rows are still entered and stored flat; grouping only
  happens at render/export time (sort rows by `bankAcct`, break onto a new
  template page — or a new PDF sub-table — whenever the value changes).
- **Option 2 (structural):** Restructure `schB4` into a true nested shape —
  an array of bank-account groups, each with its own `bankAcct`/name and its
  own nested disbursement array — matching the template's one-page-per-bank
  design and the user's literal description ("add bank name and account
  number... once, then all the disbursements for that account") most
  faithfully. This is a real data-model shape change: it touches the
  collection-row helpers in `schedule-definitions.js`, `totals.js`'s sum
  (`totals.js:21`), the Excel cap/write logic, PDF rendering, and the
  import/export round-trip, and needs its own `probate-guardian-data-model.csv`
  entries (cardinality of a nested collection, not a flat one).

**Recommend Option 2** as the more correct fix — it's what the court
template and the user's own description both actually describe, and Option
1 would leave the underlying per-row/no-grouping data shape in place while
only changing how it displays, which doesn't structurally prevent someone
re-entering the same bank name on every row by hand. **This is the largest
single change in this milestone and needs explicit approval of the Option 2
data shape before implementation**, not just "approved as scoped" — recommend
scoping it as its own sub-milestone execution once the shape is confirmed,
given the number of consumers (UI, validator, PDF, Excel export, Excel
import, totals, pruning, data-model CSV) it touches.

### Files in scope (Option 2)

`src/core/form/schedule-definitions.js`, `src/legacy-app.js` (`emptyRowAnnual`,
`BLANK_SCHEDULE_ENTRY`), `src/features/annual-accounting/index.js` (B-4
render + validator), `src/features/annual-accounting/pdf-model.js` (B-4
block), `src/features/annual-accounting/excel.js` (B-4 write/read, including
writing the `D6:F6`/`H6:I6` header cells and spilling onto `p3`+ once a
group's own 25-line cap is reached), `src/features/annual-accounting/totals.js`,
`probate-guardian-data-model.csv`.

### Required tests

Unit: nested-group factory shape; totals sum across all groups' disbursements;
25-line-per-group cap (not 25 total) enforced correctly. E2E: two bank
groups each render their own header and disbursement rows in the UI; PDF
output shows two bank-labeled sub-tables; Excel output writes group 1 to
`p2` and group 2 to `p3` with each page's `BANK:`/`ACCOUNT NUMBER #:` cells
populated; import round-trips both groups without collapsing them.

---

## 57E — Annual Accounting: Certificate of Service "None" Checkbox

### User-observed defect

> Certificate of service – box to check if none.

### Confirmed diagnosis

- Default is **four** blank recipient rows
  (`src/core/state.js:458`, `emptyDataAnnual()`).
- The collection floor is 1, not 0:
  `src/core/form/schedule-definitions.js:26-31` — `certRecipients: { ...,
  floor: 1, max: Infinity }`; `removeCollectionRow()`
  (`schedule-definitions.js:220-244`) refuses to delete below `floor`.
- Row 0's Remove button is suppressed entirely
  (`src/features/annual-accounting/index.js:1316`,
  `const removeBtn = i===0 ? '' : ...`), and a hardcoded note reads "*
  Recipient 1 name is required" (`index.js:1334`).
- The validator hard-requires `certRecipients[0].name`
  (`index.js:1495`) with no bypass.
- `certIndicator` (`state.js:454`) is a free-text delivery-method note (e.g.
  "hand-delivered, mailed"), **not** a count/none flag — there is no boolean
  anywhere in the Annual data shape meaning "there are zero service
  recipients."
- The PDF model already tolerates an empty list gracefully — it simply omits
  the recipients table when the filtered list is empty
  (`pdf-model.js:949-964`) — so nothing in the output format blocks this;
  it's purely the floor-of-1 + required-row-0 combination in the form layer.

### Scope

Add a `certNoRecipients` boolean (or equivalent) to `emptyDataAnnual()` (and
Simplified Accounting's equivalent — same UI/validator pattern,
`src/features/simplified-accounting/`). When checked: hide/skip the
recipient cards, lower the effective floor to 0 for that filing, and have
the validator require `certNoRecipients === true` **or** recipient 0's name,
not recipient 0's name unconditionally. Reduce the default row count from 4
to 1 at the same time, matching 57B's Guardian Inventory fix for the same
overcorrected default — one recipient by default, with an explicit path to
zero.

### Files in scope

`src/core/state.js` (`emptyDataAnnual`, and Simplified Accounting's
equivalent), `src/core/form/schedule-definitions.js` (`certRecipients` floor
logic, gated on the new flag), `src/features/annual-accounting/index.js`
(Part X render + validator, `~1312-1345` and `~1495`),
`src/features/simplified-accounting/index.js` (equivalent section),
`src/features/annual-accounting/pdf-model.js` (~`949-964`, no change needed
if the filtered-empty-list omission already covers this — confirm during
implementation), `src/features/annual-accounting/excel.js` (`certIndicator`/
recipient cells), `probate-guardian-data-model.csv`.

### Required tests

Unit: `certNoRecipients` true bypasses recipient-0 requirement; false with a
blank recipient 0 still blocks. E2E: checking "None" hides the recipient
cards and the filing still exports; PDF output has no recipients table when
none apply.

---

## 57F — Trust Status and Trust Asset Value in the Audit Fee Calculation

### User-observed defect

> Can it ask whether there is a trust accounting and the value of the trust
> assets for determining the audit fee?

### Confirmed diagnosis

- **"Is there a trust?" already exists.** `trusts[0].hasTrust`
  (`src/core/state.js:443-448`, rendered at
  `src/features/annual-accounting/index.js:1268` as "#1. Does the Ward have
  one or more Trusts?"), a single global Yes/No stored on row 0 of the
  `trusts` array (confirmed explicitly by the Excel import comment at
  `excel.js:636-645`: "'Has any trust' is a single global answer").
- **"Value of the trust assets" already exists per trust**, just not
  surfaced as a total. Each populated trust row carries `wardAmount`
  ("Amount (Ward's Interest)", rendered at `index.js:1258`, optional) and
  `wardPct` (`index.js:1257`). Neither is summed anywhere —
  `calcTotalsAnnual()` (`src/features/annual-accounting/totals.js`) has no
  `trust` token in the entire file (confirmed by direct grep).
- **The audit fee ignores both, entirely.** `totals.js:44-49`:
  ```js
  let auditFee = 0;
  if (netAssetsFromD > 500000) auditFee = 250;
  else if (netAssetsFromD > 100000) auditFee = 170;
  else if (netAssetsFromD > 25000) auditFee = 85;
  else auditFee = 20;
  ```
  `netAssetsFromD` (`totals.js:39`) is composed **only** of Schedules D-1
  through D-5. Trust status and value have zero influence on the tier
  computed here, or on the PDF's printed fee (`pdf-model.js:143`).
- **Pre-existing, unrelated inconsistency worth fixing alongside this** (not
  itself part of the feedback, but touches the same fee logic): Guardian
  Inventory's on-screen audit-fee text uses a **2-tier** rule ($0/$85 at the
  $25k line — `legacy-app.js:6250`, UI text `guardian-inventory/index.js:1078-1086`)
  while its own **PDF** independently computes a **4-tier** rule
  ($0/$85/$170/$250 — `guardian-inventory/pdf-model.js:546`) that disagrees
  with the screen above $100k. Recommend folding a fix for this into 57F
  since both are "what counts toward the audit fee" bugs in the same area,
  but flagging it separately in the acceptance criteria so it can be
  descoped without blocking the trust question if Alan wants them decided
  independently.

### Decision needed — this is a legal-interpretation question, not a code one

Whether Florida guardianship audit-fee schedules are meant to be computed
against the ward's total assets **including** trust assets the ward has a
beneficial interest in, or against the accounting's own net-assets figure
only, is a legal question this document cannot answer by reading source
code. **Needs Alan's explicit confirmation of the correct formula before
implementation** — specifically: should `netAssetsFromD` (or a
new `netAssetsWithTrusts`) add `sum(trusts[].wardAmount)` for trusts where
`hasTrust === 'Yes'`? A recommended default (add trust ward-interest total
to the audit-fee basis, displayed as its own line so the two components
stay visible/auditable rather than silently merged) is offered for
approval, not assumed correct.

### Files in scope

`src/features/annual-accounting/totals.js` (`calcTotalsAnnual`),
`src/features/annual-accounting/index.js` (Part II fee display,
`~575-584`), `src/features/annual-accounting/pdf-model.js` (`~143`), and —
if the Guardian Inventory tier-mismatch fix is approved alongside —
`src/legacy-app.js:6250` and `src/features/guardian-inventory/pdf-model.js:546`.

### Required tests

Unit: audit fee tier shifts correctly when trust `wardAmount` pushes the
combined basis across a tier boundary; unaffected when `hasTrust !== 'Yes'`.
E2E: Part II displays the trust contribution as its own line, and the PDF's
printed fee matches.

---

## 57G — Excel Export: Ward/Case Header Propagation, Date Format, Amount Column

Three distinct sub-items under one export surface; each has a different
confidence level and is scoped separately below.

### 57G-i — Ward name / case number missing on later sheets (high confidence — real, reproducible-on-paper bug)

> The Excel output does not populate the ward's name and case number on each
> page (not a huge deal)

**Confirmed diagnosis.** The app writes the ward name and case number
exactly once, to `PART I` (`excel.js:107`: `setCell(p1,'C5',...)`,
`setCell(p1,'I5',...)`). Every other schedule sheet gets its own copy via
**workbook-level defined-name formulas** baked into the template — confirmed
by decoding `templates/annual-template.js`: `xl/workbook.xml` defines
`Name_of_Ward` → `'PART I'!$C$5` and `Case_Number` → `'PART I'!$I$5`, and
(for example) `SCH B-4 OTHER DISB p2`'s own row 2 header cells contain
literal formulas `<f>Name_of_Ward</f>` / `<f>Case_Number</f>`.

**But the shared save path deletes every defined name before writing the
file, independently re-verified directly (not just taking the research
agent's word for it):**
```js
// src/core/excel/excel-engine.js:154-158, saveWorkbookFile()
try {
  if (workbook.definedNames) {
    workbook.definedNames.model = [];
  }
} catch (e) {}
```
This runs for all three exporters (Guardian, Annual, Simplified) since they
all call the same shared `saveWorkbookFile()`. **No comment, commit message,
or milestone doc anywhere in the repo explains why this line exists** —
confirmed via `git log -S"definedNames.model"` (introduced in the original
Milestone 28 export-engine commit, `b3a7489`, whose message gives no
rationale) and a repo-wide grep for `definedNames` in every `.md` file
(zero hits). It is plausible this was a defensive workaround for an
ExcelJS defined-name serialization bug in some prior library version rather
than dead code — **this needs to be reproduced against a real generated
file before removing the line outright**, not just deleted on the strength
of this analysis.

**Scope.** Reproduce first: generate a real Annual Accounting `.xlsx` from
current `master`, open a schedule sheet other than `PART I`, and confirm the
`Name of Ward:`/`Case Number:` header cells are actually blank (this
document's static-analysis confidence is high but unverified against a real
file). If confirmed, either (a) remove the `definedNames.model = []` clear
entirely, or (b) narrow it to exclude `Name_of_Ward`/`Case_Number`/any other
name schedule sheets rely on, whichever a working-file test shows is safe.

### 57G-ii — Date format (medium confidence — real, but the correct fix is an architecture question)

> it has the date format as year/month/day

**Confirmed diagnosis.** Every Annual Accounting date is formatted by
`src/features/annual-accounting/excel.js:95`:
```js
const fD=s=>{const v=s instanceof Date?s.toISOString():s;return (v&&String(v).length>=10)?String(v).substring(0,10):(v||'');};
```
This produces an ISO `yyyy-mm-dd` **string**, written via `setCell()`
(`excel-engine.js:116-127`), whose `typeof value === 'number'` branch never
fires for a string — so the value lands as sanitized **text**, not a native
Excel date. Any `numFmt` already present on those template cells (e.g. the
template's own `m/d/yyyy` style, confirmed present in `xl/styles.xml`) is
therefore inert, because Excel only applies a number format to numeric
values.

**Decision needed.** Two fix shapes, meaningfully different in cost:
- **Minimal:** reformat the text string to `mm/dd/yyyy` (or similar) instead
  of ISO. Cheap, but keeps dates as text — no native Excel date behavior
  (sorting, date arithmetic, the template's own `numFmt` still inert) — and
  requires checking that the import-side reader (`src/core/excel/cell-reader.js`)
  still parses whatever format is chosen on round-trip.
- **Correct:** write real numeric Excel date serials via `setCell()`'s
  numeric path (which does exist, `excel-engine.js`'s `typeof value ===
  'number'` branch) so the template's own `numFmt` finally applies natively.
  `excel-engine.js:23-28`'s own header comment records that column-width/
  numFmt-setting capability (`autoFitColumns`, `protectSheet`) was
  deliberately removed as "never-wired" — reintroducing any numFmt-setting
  capability is a bigger architectural call than a one-line format-string
  edit and should be scoped as such.

**Recommend the minimal fix** (reformat to `mm/dd/yyyy` text) for 57G-ii,
with the "write real date serials" option flagged as a larger follow-up
outside this milestone's scope unless Alan wants it folded in now.

### 57G-iii — Disbursement amount column ("will not let you adjust... to show the true value") — **not reproduced, not actionable yet**

Direct inspection of `templates/annual-template.js`'s Schedule B-4 sheet
(`SCH B-4 OTHER DISB p2`) found the Amount column (`I`) at width 16.33
characters with `numFmt` id 7 (`"$"#,##0.00_);("$"#,##0.00)` — two-decimal
currency, no rounding, comfortably wide enough for values into the
millions. No hardcoded narrow width or truncating format was found anywhere
on the B-4 amount path in `excel.js`, `excel-engine.js`, or the template
itself. `src/core/excel/excel-engine.js:23-28` confirms no code in this repo
has ever set a column width — "adjust the column" isn't blocked by app code
because the app never touches column width in either direction; it's
whatever the template ships with.

**This sub-item needs reproduction before it can be scoped at all** —
specifically: which sheet/view (in-app preview vs. the actual downloaded
`.xlsx` opened in Excel), and what "will not let you adjust" means in
practice (column resize is grayed out? typed values get silently
reformatted/rounded on re-entry? the cell shows `####`?). Per this repo's
own prior finding on evidence-dependent UI reports (Milestone 34, Phase D),
recommend **not** speculating a fix here — ask for a screenshot of the
actual `.xlsx` opened in Excel (not the in-app preview) with the specific
value that displays wrong.

### Files in scope

`src/core/excel/excel-engine.js` (57G-i), `src/features/annual-accounting/excel.js`
(57G-ii, and equivalent `fD`-style helpers in
`src/features/guardian-inventory/excel.js` / `src/features/simplified-accounting/excel.js`
if the date-format fix is applied consistently across all three exporters).
57G-iii: none, pending reproduction.

### Required tests

57G-i: an e2e test that generates a real `.xlsx`, unzips it, and asserts a
non-`PART I` sheet's `Name_of_Ward`/`Case_Number` formula cells resolve to
the real ward name/case number (not blank) — this is the kind of check that
can only be proven by actually building and reading the file, matching this
repo's `pdf-structure-tags.spec.ts` xref-integrity pattern applied to
`.xlsx` instead of `.pdf`. 57G-ii: unit test on the date-formatting helper's
output string shape; e2e confirms the formatted string round-trips through
Excel import unchanged.

---

## 57H — PDF Key-Value Grid: "For the Period" (and Every Other Right-Column Value) Clips at ~119pt, Not the 148pt It's Measured Against

### User-observed defect

> The PDF output cuts off the year for the period end.

Screenshot confirms: `Part I — Required Information`'s "For the Period" row
renders `To: 08/31/202` — the final digit of the year is missing, cut off
mid-character rather than wrapped to a second line.

### Confirmed diagnosis — independently re-derived, not just taken from research

`src/features/annual-accounting/pdf-model.js:84-94` builds the cell:
```js
{ label: 'For the Period', value: `From: ${fmtD(d.periodFrom)}   To: ${fmtD(d.periodTo)}` },
```
rendered as a `key-value-grid` block. The renderer
(`src/core/pdf/pdf-engine.js`) sets page geometry at lines 276-279:
```js
const pageWidth = 612;
const margin = 72;
const contentWidth = pageWidth - (margin * 2); // 468
```
and measures/wraps every value against a fixed constant, lines 782-783:
```js
const KV_LABEL_MAX_W = 98;
const KV_VALUE_MAX_W = 148; // usable width inside each ~155pt value column
```
"For the Period" is the left cell of a paired row (its neighbor is
"Guardian"), so it is measured against the full `KV_VALUE_MAX_W = 148`
(line 807: `item1ValueMaxW = item2 ? KV_VALUE_MAX_W : ...`). But the actual
drawable width before the **next column's opaque background fill** paints
over it is smaller:

- Column-1 value text starts at `margin + 115 = 187` (line 855:
  `doc.text(m1.valueLines, margin + 115, curY + 12)`).
- Column 2's background fill starts at `col2X = margin + contentWidth/2 =
  72 + 234 = 306` (lines 860-863: `writeArtifactStart` /
  `doc.setFillColor(241,243,246)` / `doc.rect(col2X, curY, 110, rowHeight,
  'F')` — an **opaque** rectangle).
- Real available width: `306 − 187 = 119pt`. Measured-against width: `148pt`
  — a **29pt overshoot**.

A value whose rendered width falls in the 119-148pt gap is kept on one line
by `splitTextToSize()` (since it fits under 148), drawn starting at x=187,
and its tail (anything past x=306) is silently painted over by column 2's
own background rectangle a few draw calls later — producing exactly the
"cut off mid-character" symptom in the screenshot, not a clean wrap. The
same 29pt overshoot applies symmetrically to column 2's own value
(`col2X + 115 = 421` to the right margin at `540` = 119pt, also measured
against 148pt).

**This is not specific to Annual Accounting's cover page.** `key-value-grid`
is the shared block type `pdf-engine.js` uses for every Cover/Part-I-style
page across Guardian Inventory, Annual/Simplified Accounting, and all four
Plan types (confirmed: `simplified-accounting/pdf-model.js:78` and
`plan-simplified/pdf-model.js:66` use the identical
`From: X   To: Y`-with-three-spaces pattern). Any paired-column value
between 119 and 148pt wide is at risk anywhere in the app, not just here —
this happened to surface on the Annual cover because `From:`/`To:` combined
with two full dates is a common width to land in that gap.

### Fix

Correct `KV_VALUE_MAX_W` (and the untouched constant `782-783` comment
calling it "~155pt", also wrong against the real 119pt) to the real
available width, with a small safety margin — e.g. `110` rather than `148`
— or compute it dynamically as `(contentWidth / 2) - 115 - <margin>` so a
future change to `margin`/`contentWidth`/the `115` offset can't silently
reopen the same gap. Values that no longer fit on one line will wrap to a
second line (the row-height calculation, line 810, already grows to fit
multi-line content) rather than clip.

### Scope and blast radius

Low-risk, mechanically simple fix — **but wide blast radius**, because it
changes wrapping behavior in every `key-value-grid` cell in every filing
type's PDF output. **Recommend landing this last in the milestone and
running the full PDF-output regression afterward** (every filing type's
Cover/Part-I page, plus any PDF text-content-snapshot test that pins exact
line counts or exact wrap points for a paired-column value), since a
previously-single-line value that now wraps to two lines will grow that
row's height and could shift anything below it on the page.

### Files in scope

`src/core/pdf/pdf-engine.js` (~lines 782-783 and the comment above them).

### Required tests

Unit/e2e: a synthetic value string sized to land in the old 119-148pt gap
(the "For the Period" `From:...To:...` string itself is a real repro) now
either wraps cleanly to two lines or is fully visible on one, with no glyph
drawn past `col2X`/the right margin — verified by extracting text via
`extractPdfText()` and confirming the full, untruncated value string is
present, plus the existing full regression suite for every filing type's
PDF output.

---

## 57I — Plan Filing Types: "Supporting Documents" Heading Says "accounting period," Not a Plan-Appropriate Label

### User-observed defect

> Annual Plan shows accounting instead of plan.

Screenshot confirms: Plan Annual's Supporting Documents section reads
"Supporting Documents — accounting period 10/01/2026 to 09/30/2027" even
though this is a *plan*, not an accounting.

### Confirmed diagnosis

One shared renderer, `renderScheduleDocsSection(scheduleKey)`
(`src/legacy-app.js:7442-7450`), takes exactly one parameter — no
label/filing-type argument exists, and none of its 36 call sites across
Guardian Inventory (11), Annual Accounting (14), and Plan Annual (11) pass
one. The heading text is a single hardcoded binary branch:
```js
const periodNote=activeInventoryType==='guardian'?''
  :(fmtPf||fmtPt?` — accounting period ${fmtPf||'?'} to ${fmtPt||'?'}`:' — set the accounting period on the Cover page to file these by year');
```
Every `activeInventoryType` that isn't literally `'guardian'` — all four
Plan types, both Accounting types, and the `annual`/`finalAccounting`/
`trustAccounting` family — falls into the "accounting period" branch. The
same `'guardian'`-only test also governs the empty-state string one line
below it (`legacy-app.js:7467`, "No supporting documents uploaded... for
this period."). This is not a value being passed incorrectly; there was
never a third branch for the Plan family.

Plan Annual does have a real period concept and its own wording for it
already, elsewhere in the same filing — `plan-annual/pdf-model.js:69`:
`{ label: 'For the period', value: `${fmtDate(d.periodFrom)} through
${fmtDate(d.periodTo)}` }` — so the dates themselves are correct in the
heading; only the noun is wrong.

### Fix

Add a third branch keyed off the same discrimination pattern already used
elsewhere in this exact file (e.g. `updateHelpContext()`,
`legacy-app.js:270-289`: `activeInventoryType==='guardian'` /
`formEngine(activeInventoryType)==='annual'` / `activeInventoryType===
'simplified'` / `activeInventoryType.startsWith('plan')`-style checks) so
the Plan family gets its own noun — recommend "reporting period," matching
neither "accounting period" nor duplicating the Cover page's own "for the
period" phrasing, or simply "plan period" if Alan prefers exact symmetry
with the existing Cover-page wording. Low-risk wording decision, approvable
as scoped either way.

### Files in scope

`src/legacy-app.js:7442-7467` only.

### Required tests

Unit/e2e: Plan Annual's (and Plan Initial's/Minor's/Simplified's, which
share the same non-`'guardian'` branch today and would otherwise remain
wrong) Supporting Documents heading no longer contains the string
"accounting period"; Guardian Inventory and both Accounting types'
headings are unchanged.

---

## Sequencing and concurrency

No sub-delivery in this milestone has a hard prerequisite on another, but
several share files closely enough to warrant coordination rather than
blind parallelism:

- **57D and 57F** both touch `annual-accounting/index.js` and
  `annual-accounting/pdf-model.js`, but in disjoint sections (B-4 render
  `~850-876` vs. trust render `~1244-1270`; B-4 PDF block `~470-528` vs.
  trust PDF block `~852-864`). Low collision risk; land either order.
- **57E** also touches `annual-accounting/index.js` (Part X, `~1312-1345`)
  and `pdf-model.js` (`~949-964`) — again disjoint from 57D/57F's sections.
- **57G-i** touches the shared `excel-engine.js` save path used by **all
  three** exporters (Guardian, Annual, Simplified) — verify it against all
  three, not just Annual, even though the user's report was Annual-specific.
- **57H** touches the shared `pdf-engine.js` rendering core used by
  **every** filing type. Recommend landing it **last**, after every other
  sub-delivery that touches a `pdf-model.js` file (57A, 57D, 57F), so its
  full-suite regression run reflects the final state of every filing type's
  PDF content rather than needing to be re-run after each subsequent
  PDF-touching change.
- **57A and 57C** both touch `guardian-inventory/index.js`'s validator
  region but at different rule sets (bond fields vs. new schedule-attachment
  rule); low collision risk.
- 57B, 57I are each fully self-contained to one small region of
  `src/legacy-app.js` and can land independently of everything else at any
  point.

---

## Acceptance criteria

Per sub-delivery, in addition to each section's own "Required tests" above:

- 57A: A waived-bond or fully-restricted filing exports with no bond-field
  errors; the waiver date appears in the generated PDF; the data-model CSV's
  required/optional markings agree with the validator.
- 57B: A fresh Guardian Inventory ward's D-5 page shows exactly one
  recipient card with no pre-populated validation error.
- 57C: Scope (filing types, blocking vs. reminder) explicitly confirmed by
  Alan before any code lands; once confirmed, a populated schedule with no
  uploaded file blocks export with a readiness-card entry and working jump
  link.
- 57D: Data shape (Option 1 vs. 2) explicitly confirmed by Alan before any
  code lands; once confirmed, multiple bank groups render, validate, print,
  and export/import correctly, each within its own 25-line cap.
- 57E: A filing with "None" checked for service recipients exports cleanly
  with no recipients table in the PDF.
- 57F: Audit-fee formula explicitly confirmed by Alan before any code lands;
  once confirmed, the fee display and PDF agree and reflect trust value
  correctly.
- 57G-i: Reproduced against a real generated `.xlsx` first; once confirmed,
  every schedule sheet shows the correct ward name/case number, verified by
  unzipping and reading the generated file's formula-resolved values, not
  just the app's own in-memory model.
- 57G-ii: Dates render in the agreed format across every date cell in the
  Annual Accounting export (and, if extended, Guardian Inventory/Simplified
  Accounting) and still round-trip through import unchanged.
- 57G-iii: Not attempted until reproduced with a specific file/value/context
  from Alan.
- 57H: No PDF value in any filing type's generated output is visually
  clipped or has characters overpainted by an adjacent cell's background,
  verified by extracting full text via `extractPdfText()` for every affected
  page across the full regression suite (§3 methodology, `WCAG_2.1_AA_regex-structural.md`,
  applies directly here for verifying full/untruncated text content).
- 57I: No filing type's Supporting Documents heading contains the string
  "accounting period" unless the filing genuinely is an Accounting type.

## Verification plan

Lite regression per sub-delivery on landing (`npx vitest run
tests/unit/<affected>.spec.js`, targeted e2e per `TEST-INDEX.md`), a full
`npm test` recommended (per `AGENTS.md` §1) before closing the milestone
given the number of shared-engine touches (57G-i, 57H) and cross-cutting
validator changes (57A, 57C, 57E, 57F) — ask before running it, per
standing policy, rather than running it unprompted.

## Deliberately out of scope

- **57G-ii's "write real Excel date serials" option** — flagged as a larger
  architectural follow-up (reintroducing numFmt-setting capability this repo
  deliberately removed) rather than folded into this milestone's minimal
  text-reformat fix, unless Alan wants it pulled in now.
- **57F's Guardian Inventory 2-tier-vs-4-tier audit fee mismatch** — offered
  as a fold-in, not required; can be descoped to its own follow-up without
  blocking the trust-value question.
- **A general "every schedule requires an attachment" policy beyond what
  57C scopes** (e.g. Plan-family narrative sections) — no schedule concept
  exists there in the same countable sense; would need its own proposal if
  wanted.
