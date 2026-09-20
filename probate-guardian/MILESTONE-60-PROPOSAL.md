# Milestone 60: Court-Template Field-Coverage Audit — Cross-Form Fix List

## Status

**PROPOSAL. Not started. Not authorized.** Per `AGENTS.md` §3, no item below may
be implemented until the requester approves that item by name; approval of one
item authorizes only that item. This document records findings and proposed
fixes, not an execution log.

This proposal was scoped on **2026-09-20** against `master` at `f517df9` by
decoding all three embedded court templates directly from their base64 payload
in `templates/*.js`, unzipping them, and reading `xl/workbook.xml`,
`xl/sharedStrings.xml`, and each worksheet's raw XML (cell values, `<f>`
formulas, and `<mergeCell>` ranges) with a purpose-built parser, rather than
trusting either the template's own prose instructions or either side's
existing code. Findings below cite the confirming evidence — a literal cell
value, a formula, or a merge range — not just a written instruction, because
this audit's own experience (see 60C-5, 60C-7 below) is that this workbook
family's written instructions sometimes disagree with its own worked examples.

## Methodology

For each of the three embedded workbooks —

| Template | Filing(s) | Sheets | Prior audit depth (inline comments found in its `excel.js`) |
| --- | --- | --- | --- |
| `templates/guardian-template.js` | Initial Inventory | 40 | Partial — several schedules corrected (Milestones 52K, 57D/F, D10); several never re-verified |
| `templates/annual-template.js` | Annual / Final / Trust Accounting | 90 | Extensive — nearly every writer carries a comment naming the exact prior miswrite and its confirming merge/formula evidence |
| `templates/simplified-template.js` | Simplified Accounting | 7 | Most extensive — every cell in every writer/reader pair carries a forensic comment from a full-form row-shift correction |

— the same four checks were applied to every schedule/part with a
`fillScheduleXX`-style writer:

1. **Does the writer target a cell the template shows is a formula?** (violates
   `AGENTS.md` §5 — a computed cell must never be overwritten).
2. **Does the writer target a cell that is not the anchor of its own merge
   range?** (ExcelJS silently redirects such a write to the merge's master
   cell, which is usually a printed caption, not a blank box).
3. **Does the writer address every row/line a real entry's merge structure
   provides**, or does the worked example populate lines the writer never
   touches?
4. **Does a literal, non-formula value in the un-filled template (a pre-printed
   line number, a static list entry) sit in a cell the writer targets?**

Guardian Inventory's schedules were audited to this depth in full during this
session (see the prior review, reconciled below). Annual Accounting and
Simplified Accounting were audited the same way; because both already carry
extensive in-line forensic documentation from prior corrections, the audit
concentrated on schedules **without** an existing correction comment, since
those are the ones nobody has re-verified against the raw template.

---

## A. Global issues (all three forms)

### 60A. Schedule/part "layout" tests prove writer/reader agreement, not agreement with the court's template

**Finding.** Each form has (or, for Guardian Inventory, should have) a
round-trip test that fills every schedule to capacity, exports to Excel,
re-imports, and asserts the re-imported data equals what was written
(`tests/e2e/guardian-inventory-excel-schedule-layout.spec.ts` is the Guardian
Inventory instance). This class of test is valuable and should stay, but it
structurally **cannot** catch a bug where the writer and reader agree with each
other while disagreeing with the printed form — which is exactly the shape of
60C-1 and 60C-2/60C-3 below: `parseInitialInventoryWorkbook()` reads back the
same cell `fillScheduleC3()` corrupts, so the round trip is clean and the
defect is invisible to it. This is not hypothetical for this codebase — it is
the exact mechanism the Simplified Accounting header comments describe for
the row-shift bug that shipped there previously ("Nothing caught it because
`importExcel()` below read the same wrong cells, so the app round-tripped its
own output perfectly while disagreeing with the court's form on every field").

**Verified evidence.** `tests/e2e/guardian-inventory-excel-schedule-layout.spec.ts`
line 79 seeds `scheduleC3` fixture data including `defendantName`, and the test
only asserts the re-imported row equals the seeded row — it does not assert
against a fixed cell address or against the template's own pre-printed Line #
values. The same shape was confirmed present in Annual Accounting's analogous
tests (`excel-defined-names.spec.ts`, `excel-blank-page-pruning.spec.ts`,
`guardian-blank-page-pruning.spec.ts` per Milestone 59's audit) and Simplified
Accounting's (`simplified-part1-identity-cells.spec.ts`) — all assert
round-trip equality, not template-semantic placement.

**Proposed fix.** Add one template-semantic assertion per schedule/part to each
form's existing layout test, alongside the round-trip assertion already there:
after export, open the generated workbook directly (not through the app's own
reader) and assert specific values landed at the cell address the template's
own header/merge structure says they should, and that any pre-printed literal
(a Line #, a static label) the writer must not touch is still present
unchanged. This is additive — it does not replace the existing round-trip
coverage — and should be written using the same raw-XML-or-ExcelJS-direct
technique this audit used, not through the app's own `parseXxxWorkbook()`
functions, since using the app's own reader to check the app's own writer is
the blind spot being closed.

**Risk:** Low — test-only, no production code path changes.

**Expected file surface:** `tests/e2e/guardian-inventory-excel-schedule-layout.spec.ts`;
`tests/e2e/excel-defined-names.spec.ts`; `tests/e2e/simplified-part1-identity-cells.spec.ts`;
`tests/e2e/excel-form-field-placement.spec.ts` if template-anchor assertions
belong there instead; `TEST-INDEX.md`.

---

## B. Partial issues (more than one form, fewer than all)

### 60B. Multi-line entry schedules: the app captures only the first printed line, never the continuation lines the template provides and the court's own worked examples use

**Forms affected: Guardian Inventory and Annual Accounting. Not Simplified
Accounting**, which has no itemized asset/income/disbursement schedules at all
(its 7 sheets are cover, financial summary, guardian/attorney/service-of-process
signature blocks, and a single-free-text-cell remuneration list — see 60F).

**Pattern.** A schedule's entry occupies several pre-printed rows (confirmed
via `<mergeCell>` ranges: each row is its own separate 1-row `C:D`-style merge,
not one tall merged cell), and the court's own worked example fills more than
one of those rows with real, distinct content — a street address, a
cross-reference to another schedule, a buyer/agent name, a prior year's
carrying value. Each affected schedule's data model and UI expose only a
single-line `description` field, and its writer/reader touch only the entry's
first row. The remaining printed lines are always blank on export and are
never read back on import.

**Verified per schedule:**

| Form | Schedule | Extra lines the example populates (row offset from entry start) | App's only field | Evidence |
| --- | --- | --- | --- | --- |
| Guardian Inventory | Schedule C-2 (Lawsuits Against Ward) | Claimant City/State/Zip (r+4) | `claimantAddress` (single field, written to r+3 only) | Worked example: "St Petersburg, FL 33710" at the row directly below the claimant's street address; no `claimantCityStateZip` in the UI, `excel.js`, or `probate-guardian-data-model.csv` line 240 |
| Annual Accounting | Schedule C (Capital Adjustments) | Item detail, cross-reference to originating schedule, prior accounting value (r+1, r+2, r+3) | `description` (single-line `<input type="text">`, [index.js:984](src/features/annual-accounting/index.js#L984)) | Example: "1,000 shares Publix stock" / "Schedule D-4, item 1" / "Previous accounting value; $13,500.00" on three separate confirmed 1-row merges below the description row; writer only sets row `r` ([excel.js:350](src/features/annual-accounting/excel.js#L350)) |
| Annual Accounting | Schedule D-2 (Real Estate) | Street address, city/state/zip (r+1, r+2) | `description`, UI label "Description / Address / Owners" ([index.js:1055](src/features/annual-accounting/index.js#L1055)) | Example: "1 Longleaf Lane" / "Palm Harbor FL 34634"; writer only sets row `r` ([excel.js:369](src/features/annual-accounting/excel.js#L369)) |
| Annual Accounting | Schedule D-3 (Personal Property) | VIN/serial number, joint-ownership note (r+1, r+2) | `description`, UI label "Description / Location / Owners" ([index.js:1092](src/features/annual-accounting/index.js#L1092)) | Example: "VIN 123456789" / "Jointly owned with Spouse, Jane Doe"; writer only sets row `r` ([excel.js:377](src/features/annual-accounting/excel.js#L377)) |
| Annual Accounting | Schedule D-5 (Mortgages/Loans/Liabilities) | Cross-reference to the related asset schedule (r+1) | `description`, UI label "Description / Lender / Related Asset" ([index.js:1164](src/features/annual-accounting/index.js#L1164)) | Example: "Home listed on Schedule D-2, item 1"; writer only sets row `r` ([excel.js:394](src/features/annual-accounting/excel.js#L394)) |
| Annual Accounting | Schedule F-1 (Sales of Real Property) | Property address, buyer name, agent contact, prior accounting value (r+1 … r+4 — four lines) | `description`, UI label "Description of Sale / Address / Parties" ([index.js:1227](src/features/annual-accounting/index.js#L1227)) | Example: "123 Pine Cone Way, Ocala Florida 32789" / "Sold to : Bob Smith" / "Agent: Jane Doe 727-123-4567" / "Previous accounting value: $125,000.00"; writer only sets row `r` ([excel.js:416](src/features/annual-accounting/excel.js#L416)) |
| Annual Accounting | Schedule F-2 (Sales of Personal Property) | Property address, buyer/agent, prior accounting value (r+1, r+2, r+3) | `description`, UI label "Description of Sale / Purchaser / Agent" ([index.js:1256](src/features/annual-accounting/index.js#L1256)) | Example: "123 Pine Cone Way Ocala, FL 32765" / "Sold to: Bill Jones, Agent: None" / "Previous accounting value: $22,500.00"; writer only sets row `r` ([excel.js:424](src/features/annual-accounting/excel.js#L424)) |

**Checked and found clean (same row-block shape, no extra populated lines in
the example — do not touch):** Annual's Schedule D-1 (Cash), D-4 (Intangibles),
and Schedule E (Bank Transfers); Guardian Inventory's Schedule C-4 (Trusts) and
A-1/A-2 (which already have a dedicated `notes` field — see Out of scope).

**Why this is a schema decision, not a pure cell-mapping fix.** Unlike a wrong
cell address (Section C below), there is currently no persisted field to write
even if the cell address is known. Two fix shapes are available and the choice
affects `probate-guardian-data-model.csv`, so it needs a decision before
implementation, not just a code change:

- **(a) One structured field per printed line** (e.g. `streetAddress`,
  `cityStateZip`, `notes` as separate persisted fields, matching how Guardian
  Inventory's A-1/A-2 already do it), written to their own row; or
- **(b) One multi-line field** (`<textarea>` instead of `<input type="text">`)
  whose value is split on newlines and distributed one line per row at export,
  and rejoined on import — closer to the "Description / Address / Owners"
  UI labels already in place, but requires the split/rejoin logic to handle a
  user typing more lines than the schedule has boxes for.

**Proposed fix (pending the (a)/(b) decision above):** add the missing
field(s) to the data model, the UI, `fillScheduleXX()`, and
`parseXxxWorkbook()` for each schedule in the table, following whichever
shape is chosen. Guardian Inventory's C-2 (a single missing line) is the
smallest instance and the reasonable first delivery if this is split.

**Risk:** Medium — touches the persisted schema (`probate-guardian-data-model.csv`)
for every schedule involved, per `AGENTS.md` §4.

**Expected file surface:** `probate-guardian-data-model.csv`;
`src/features/annual-accounting/{index.js,excel.js}`;
`src/features/guardian-inventory/{index.js,excel.js}`;
`tests/unit/*` and `tests/e2e/*` fixtures for each touched schedule;
`TEST-INDEX.md`.

---

## C. Unique to one form (per-form contradictions)

### Guardian Inventory

*(Carried forward from this session's prior review of this form, reconciled
against a second independent review; see that review's confidence labels,
reproduced here.)*

**60C-1. Schedule C-3 — Defendant Name overwrites the form's own pre-printed
Line #.** [excel.js:326](src/features/guardian-inventory/excel.js#L326) writes
`e.defendantName` to column B, which the template's un-filled state shows
holds a literal, non-formula sequential number (`1`, `2`, `3…`) inside a
5-row merge (e.g. `B20:B24`). This is the only schedule writer in the feature
that targets column B. **Confirmed.**

**60C-2. Schedule C-3 — Case Number has its own printed line that is never
used.** [excel.js:325](src/features/guardian-inventory/excel.js#L325) builds
`desc = actionDescription + ' / ' + caseNumber` and writes it to the entry's
first line; the template's fourth line is dedicated to the case number
(confirmed by the worked example: "Case # 12-3456CI-24" on its own line) and
is never written or read. **Confirmed.**

**60C-3. Schedule C-2 — the same case-number folding bug as C-3.**
[excel.js:304](src/features/guardian-inventory/excel.js#L304) builds
`desc = lawsuitDescription + ' / ' + caseNumber` for the same reason; the
template's third line is dedicated to the case number and `claimantName` is
written there instead ([excel.js:307](src/features/guardian-inventory/excel.js#L307)).
**Confirmed** — found during reconciliation with a second review; missed in
the first pass of this schedule.

**60C-4. PART V's second safe-deposit-box question is answered but never
printed.** The UI already asks the FS 744.365(4) joint/other-person
safe-deposit-box question once and stores it as `hasSafeDepositBox`, which
[excel.js:145](src/features/guardian-inventory/excel.js#L145) writes to
Summary I `D26`. The same question is asked a second time on PART V, whose
input box is `H12` (confirmed blank with a Yes/No data-validation list in the
un-filled template); [excel.js:442](src/features/guardian-inventory/excel.js#L442)'s
PART V block never writes it. **Confirmed.**

**60C-5. Schedule B-4 — Account Number lands one line early, and the
template's instructions conflict with its own worked example.** The worked
example's five lines read: lender name, address, related property, a
free-text note ("Jointly owned with spouse"), then the account number ("Acct
#112358132134") on the fifth line.
[excel.js:266](src/features/guardian-inventory/excel.js#L266) writes
`accountNumber` to the fourth line and never touches the fifth. **However**,
the template's own written instructions say "Third line: Account Number" and
do not describe either the lender-address or notes lines the example actually
uses — the instructions and the worked example disagree with each other, not
just with the code. The worked example is the stronger evidence (it is what a
real filer sees and the instructions have already been shown, in 60C-1/2/3
above, to be an unreliable narrator for this workbook), but this should be
recorded as an explicit interpretation decision before the cell address is
changed, not asserted as a simple typo fix.

**60C-6. Schedule C-2 — no `claimantCityStateZip` field.** Documented under
60B above as part of the cross-form partial pattern; Guardian Inventory's
instance of it.

**60C-7. Schedule C-5 — Owner Name/Address order is genuinely ambiguous;
do not change without a ruling.** The template's instructions say "Second
line: Joint Owner's Name, Third line: Street Address, Fourth line:
City/State/Zip," but [excel.js:369-371](src/features/guardian-inventory/excel.js#L369-L371)
write address on the second line and name on the third — reversed from the
instructions. The worked example itself is loose, narrative prose ("Jointly
owned by spouse, Mrs. Jane E. Miller" on the fourth line; "Schedule A-1, item
1" — a cross-reference, not a name — on the third), so unlike 60C-1 through
60C-4 there is no clean structural evidence to prefer one convention over the
other. **Provisional — leave as-is until someone rules on which convention
governs**, ideally by checking a real clerk-filled example of this schedule
outside this app.

### Annual Accounting

No live defect was found beyond this form's contribution to 60B. Every
previously-identified wrong-cell/wrong-merge-member defect this audit checked
in Schedule A, B-1 (and by declared construction B-2/B-3), the Schedule B-4
multi-account block, D-1, D-2 (address writer aside — see 60B), Schedule E,
and F-1 already carries an in-line comment naming the prior defect and the
merge/formula evidence that fixed it, and this audit's independent re-decode
of the template confirmed each of those cells against the raw XML rather than
taking the comment on trust. Part XI's remuneration grid is correctly
recognized as not existing in the template (Milestone 58D) rather than guessed
at. No further action proposed for this form beyond 60A and 60B.

### Simplified Accounting

No live defect was found. This is the most thoroughly pre-audited of the three
templates — every writer and reader cell pair in
`src/features/simplified-accounting/excel.js` carries a comment naming the
specific row-shift corruption a prior full-form audit found and fixed (every
Part I/II/III/IV/V/VI field was one row low, confirmed by this audit's
independent re-decode of `PARTS I, II ` and `PARTS III, IV`), and this form
has no itemized asset/income/disbursement schedules, so the entire 60B defect
class does not apply to it (its only list-shaped section, Part VII
remuneration, was independently confirmed to use one genuine full-width
merged cell per row, matching the code's "single free-text column" design
exactly — not a bug). No further action proposed for this form beyond 60A.

---

## Out of scope

- Guardian Inventory's Schedule A-1/A-2, which already have a dedicated
  `notes` field distinct from `description` — cited above only as a
  contrast, not a defect.
- Any change to Annual Accounting's Part XI remuneration handling
  (Milestone 58D's decision to block Excel export there is correct per this
  audit's independent read of that sheet, and is unrelated to 60B).
- Re-deriving Annual Accounting's Schedule B-4 multi-account block layout,
  which Milestone 57D already verified cell-exact against the decoded
  template on 2026-09-19 (see `MILESTONE-57-REVIEW-HANDOFF.md` §3b).
- Deciding 60B's (a)-vs-(b) schema shape, 60C-5's cell-address ruling, or
  60C-7's ordering ruling — those decisions are prerequisites this proposal
  surfaces, not something this document resolves.

## Completion criteria

Milestone 60 is complete only when, for each item the requester has
individually authorized:

1. The fix is verified against the raw decoded template (this audit's
   method), not only against the app's own re-import.
2. A red-first test demonstrates the defect against the pre-fix code and
   passes after the fix, using the template-semantic assertion style 60A
   adds — not a round-trip-only assertion.
3. `probate-guardian-data-model.csv` is updated for any new or changed
   persisted field (60B, 60C-6).
4. `TEST-INDEX.md` reflects every added or materially changed test.
5. No item outside the requester's explicit approval is touched in the same
   change, per `AGENTS.md` §3.
