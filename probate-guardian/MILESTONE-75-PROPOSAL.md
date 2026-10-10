# Milestone 75 Proposal — Supporting documents and the dates; four things Milestone 73 found

## Status

**Draft. Authorizes no change.** Building any item, or any part of one, needs
the requester's named approval of that item (AGENTS.md §3). **Every decision
is settled (the requester, 2026-10-10), each as recommended:** 75A-1 join and
offer, 75B-1 after Question 11's detail, 75D-1 the workbook's headings, 75E-1
correct and pin. **Approved to build, all five** (the requester, 2026-10-10:
"Do them all. Light unit testing between sections, full regression at the
end.") Built so far: 75A, 75B, 75C, 75D (2026-10-10).

**Already built, ahead of this proposal** (2026-10-10, `fe2f9fc`, at the
requester's named approval: "Fix the dropped docs now"; for the Plan for
Minors, "Right section"): supporting documents now reach the PDF on the Plan
for Minors, the Simplified Accounting and the Initial Plan's Attorney screen.
Recorded in [Appendix A](#appendix-a--built-ahead-of-this-proposal-documents-that-never-reached-the-pdf);
not part of what this proposal asks.

## Where these came from

The requester asked, at the end of Milestone 73's 2026-10-08 batch, for the
four things that batch found and left alone to be written up for approval:
the Initial Plan's documents printing one section late (73N part 2), the
Simplified Accounting's Part II heading (73O part 4), the Annual Plan's
missing VA row (73N part 2), and the Annual's D-2 to D-5 list labels (73P).

Checking the first against real PDFs turned up worse. At the requester's
request ("Check to see if other filing types have any similar issues") every
filing type was then checked by uploading a real PDF through each screen's own
documents control and generating the PDF from the stored filing. That found
the documents that never reached the PDF (built, Appendix A) and **75A**
below. Checking the fourth item against the Clerk's workbook found five more
wrong labels (**75E**).

Every claim here was checked against the code at `fe2f9fc` and, for the
workbooks, read with an XML parser (AGENTS.md §10, P2).

| # | Item | What a filer sees today | Size |
| --- | --- | --- | --- |
| 75A | Documents and the reporting dates | A document attached before the dates are typed, or before they're corrected, disappears from the screen and from the PDF | Medium |
| 75B | The Initial Plan's documents | From Questions 4–5 on, each screen's documents print after the next section | Small |
| 75C | The Annual Plan's Question 3G | No VA row, though the court's form has one | Small (one new answer) |
| 75D | The Simplified's Part II | "Assets On Hand" heads the Starting Balance, not Line 8 | Small |
| 75E | Nine schedule list labels | Nothing visible today; nine labels name the wrong schedule | Small |

Suggested order: 75A, 75B, then 75C–75E in any order. 75A and 75B touch the
supporting-documents code; nothing else here shares a file.

---

## 75A — Documents and the reporting dates

### What a filer sees today

A filer opens the Annual Guardianship Plan's Cover, attaches the ward's
physician's letter in its Supporting Documents section, then types the
reporting period on the same page. The letter vanishes from the section ("No
supporting documents uploaded for this period") and is not in the Preview,
Save as PDF or Print. It is still in the case file. It comes back only if the
dates are cleared again.

The same happens to every document on the page when a filer corrects a date
already typed -- 12/31/2025 for 12/31/2026, say: everything attached under
the old dates drops out of every screen and the PDF, and comes back only if
the old dates are typed back exactly. Nothing tells the filer where it went.

**Affected:** every form whose documents are filed by reporting dates -- the
Annual, Final and Trust Accountings, the Simplified Accounting and the four
Plans. **Not affected:** the Initial Inventory, which files its documents by
year.

### Verified

- Observed in a browser, 2026-10-10: on the Annual Plan's Cover and on the
  Annual Accounting's Schedule A, a document attached with no dates set was
  listed; after the dates were typed it was not listed, was stored under the
  empty period (`__`), and was not in the generated PDF.
- `scheduleDocPeriodKey()` (`src/core/filing/schedule-docs.js`) files each
  upload and comment under `${periodFrom}__${periodTo}` -- the dates in force at
  that moment -- and the PDF reads the same key
  (`resolveActiveDocPeriod()`, `src/core/filing/doc-period.js`). Nothing moves
  stored documents when the dates change.
- **This is a settled design, partly.** Milestone 40C-D found the per-period
  buckets deliberate and pinned them in
  `tests/e2e/schedule-docs-period-key.spec.ts`: "changing the period correctly
  presents an empty slot, and changing it back must bring the original content
  back intact." That is what lets each accounting year keep its own
  documents. Any option below that moves documents changes that decision for
  date *edits*; none changes it for a new year.

### Proposed

Documents attached with no dates set join the dates once they're typed --
there's nothing else the filer could have meant. After a date change, a
section whose documents are now filed under other dates says so and offers to
bring them here; nothing moves without that click. A new year (Start New
Year) still starts every section empty, as now.

The section would read, under its usual "No supporting documents uploaded for
this period":

> 2 documents are attached under 01/01/2026 to 12/31/2025. **Move them to these dates**

### Decision 75A-1 — how documents follow the dates

**Settled 2026-10-10 (the requester): option 1, join and offer.** This changes
Milestone 40C-D's settled behaviour for documents attached before any dates
(they now join the dates); for a date correction 40C-D's round trip still
holds, with the offer added. The options as asked:

1. *Recommended:* **join and offer.** No-dates documents join the first dates
   typed; after a correction, each section offers to move documents filed
   under the earlier dates, one click, nothing moved without it. 40C-D's round
   trip still holds: a changed period shows its own (empty) slot until the
   filer moves them.
2. **Always follow.** Any change to the current year's dates on the Cover moves
   every document with it, automatically. Simplest for a filer correcting a
   typo, but a filer who meant to start a different period gets last period's
   documents in it, and 40C-D's pinned round trip changes.
3. **Offer only.** Nothing moves automatically, the no-dates case included;
   each section offers to move documents filed under other dates.

### Checklist (AGENTS.md §8)

1. **Data model:** no new field; `scheduleDocs` and `scheduleDocsAck` keep
   their shape (a bucket per period). No CSV row changes.
2. **Legacy data:** older files can hold documents under `__` or under
   superseded dates. Option 1 joins a `__` bucket on load when the filing
   has dates and their own bucket is empty, else offers it -- never merges two
   filled buckets silently. Nothing is deleted.
3. **Fixtures:** none add documents before dates; the 40C-D spec's fixture is
   unaffected under options 1 and 3.
4. **Tests:** new `tests/e2e/supporting-documents-follow-dates.spec.ts`
   (attach before dates on a Cover and a schedule, type the dates, see the
   document listed and in the saved PDF; correct a date, see the offer, take
   it, see the document back in the PDF; a new year still starts empty).
   `schedule-docs-period-key.spec.ts` keeps its round trip (options 1 and 3);
   option 2 rewrites it. TEST-INDEX rows for both.
5. **Export/import:** a workbook import (73T) that changes the dates follows
   the same rule as a typed change. The `.sav` and backup paths carry
   `scheduleDocs` as they are.
6. **Security:** no new stored data. Moving a bucket keeps each file's
   encryption and digest as stored.
7. **UI:** the offer is the documents section's own note style
   (`.sched-doc-empty`), a `<button type="button">` (AGENTS.md §6).
8. **Legal framing:** none; this decides where the app keeps a filer's own
   uploads, not what a filing must contain.
9. **Cross-form:** the Initial Inventory keys by year and is unaffected; the
   acknowledgement records (`scheduleDocsAck`, Milestone 57C-R) are keyed the
   same way as the documents and move with them.

### Build record — BUILT 2026-10-10 (approved by name by the requester, 2026-10-10)

**What changed for a filer:** a document attached before the reporting
dates are typed stays where it is when they are -- listed, filed under the
dates, in the Preview and the saved PDF. After a date is corrected, each
documents section holding nothing for the new dates says what is filed
under the old ones, "1 document is attached under 01/01/2026 to 12/31/2026.
**Move it to these dates**", and moves it -- files, comment and the documents
reminder's "I understand" -- only on that click. The section's heading and
list follow the dates at once, on the page where they are typed (a Plan's
Cover holds both). A new year still starts every section empty and offers
nothing of the year before.

**How:** new `src/core/filing/doc-dates.js` (the join, the offer and the
move, pure); `schedule-docs.js` (the section is a live part redrawn when
`periodFrom`/`periodTo` change; the offer; `moveScheduleDocs()`;
`installDocumentsFollowDates()`, installed in `main.js` before the live parts
so they redraw with what joined); `normalize-filing.js` (older files join
when opened); `form-events.js` (the Move action); `cards.css`.

**Found while building, fixed in its own commit first** (`b9fb068`, the
requester's named approval): from a filing's second year on, the Accountings'
and Plans' documents never reached the PDF -- recorded in Appendix A.

**Tests:** new `tests/e2e/supporting-documents-follow-dates.spec.ts` (3) and
`tests/unit/doc-dates.spec.js` (14). **Red-first:** on the previous source
the first browser test fails with the document left under no dates and the
second finds no offer; the third guards what was already true (a new year
starts empty). 40C-D's `schedule-docs-period-key.spec.ts` passes unchanged
-- its change and change back still restores everything. In a browser on a C:
copy: the new spec, 40C-D's, the documents-reach and the reminder specs -- 25
passed. Unit suite 3,101 passed; `check:types` clean.

---

## 75B — The Initial Plan's documents, one section late

### What a filer sees today

On the Initial Guardianship Plan, documents attached on the Questions 4–5
screen print in the PDF after Questions 6–7; the Questions 6–7 screen's after
Question 9; Question 9's after 10A; 10A's after 10B–F; 10B–D's after Question
11. A reader of the filed plan finds each document under the wrong question.
The Cover, Questions 2–3, Advance Directives, Signatures and (since
`fe2f9fc`) Attorney screens are right.

### Verified

Observed in a browser, 2026-10-10, by attaching a document on each screen and
reading the generated PDF. The table that sends each screen's documents to a
PDF section (`src/core/pdf/document-sections.js`, `planInitial`) is shifted by
one from the Questions 4–5 screen on; the PDF's sections are Cover,
Questions 2–5, 6–7, 9, 10A, 10B–F, 11, Advance Directive Detail,
Certification, Attorney Certification (`src/features/plan-initial/pdf-model.js`).
Two screens -- Questions 2–3 and 4–5 -- belong in one PDF section; since
`fe2f9fc` two screens sharing a section both print there, in screen order.

### Proposed

| Screen | Today | Proposed |
| --- | --- | --- |
| 2–3. Residential Setting & Medical Services | Questions 2–5 | Questions 2–5 (unchanged) |
| 4–5. Mental Health & Personal Care | Questions 6–7 | **Questions 2–5**, after 2–3's |
| 6–7. Socialization & Benefits | Question 9 | **Questions 6–7** |
| 9. Examining Providers | Question 10A | **Question 9** |
| 10A. Activities of Daily Living | Question 10B–F | **Question 10A** |
| 10B–D. Disabilities & Assistive Devices | Question 11 | **Question 10B–F** |
| 11. Advance Directives (with 10E–F) | Advance Directive Detail | see 75B-1 |

### Decision 75B-1 — the Advance Directives screen

**Settled 2026-10-10 (the requester): option 1, after Question 11's Advance
Directive Detail.** The options as asked:

That screen holds Question 11 and also 10E–F, which the PDF prints under
"Question 10B–F".

1. *Recommended:* **after Question 11's Advance Directive Detail**, as today --
   the screen is titled "11. Advance Directives", and what a filer attaches
   there is most likely the directives themselves.
2. **After Question 10B–F**, beside 10E–F.

### Checklist (AGENTS.md §8)

1. **Data model:** no change.
2. **Legacy data:** documents already attached print in their right sections
   from then on -- visible, nothing stored changes.
3. **Fixtures:** none.
4. **Tests:** `tests/e2e/supporting-documents-reach-pdf.spec.ts` gains every
   Initial Plan screen (each document after its own bookmarked section; 2–3's
   before 4–5's); `tests/unit/document-sections.spec.js` unchanged. TEST-INDEX
   row updated.
5. **Export/import:** the PDF only (Preview, Save as PDF, Print).
6. **Security:** none.
7. **UI:** none on screen.
8. **Legal framing:** none.
9. **Cross-form:** checked 2026-10-10 -- the Annual Plan, Simplified Plan,
   Plan for Minors (since `fe2f9fc`), the Accountings and the Inventory place
   every screen's documents after their own section.

### Build record — BUILT 2026-10-10 (approved by name by the requester, 2026-10-10)

**What changed for a filer:** every Initial Plan screen's supporting
documents print after its own question -- Questions 4–5's with 2–3's under
"Questions 2–5" (2–3's first), 6–7's under "Questions 6–7", 9's under
"Question 9", 10A's under "Question 10A", 10B–D's under "Question 10B–F" -- and
the Advance Directives screen's after Question 11's detail, as before
(decision 75B-1).

**How:** `src/core/pdf/document-sections.js`'s `planInitial` entries, as the
table above proposed.

**Tests:** `tests/e2e/supporting-documents-reach-pdf.spec.ts`'s Initial
Plan case covers every screen, and every case now requires a screen's
attached pages to come before the next section begins (after attached pages
the next section always starts a page of its own) -- the looser check let a
document listed on the next section's first page pass. **Red-first:** on the
previous table, Questions 4–5's pages come after "Questions 6–7" begins. In a
browser on a C: copy: the spec's five cases passed. Unit suite 3,101 passed.

---

## 75C — The Annual Plan's Question 3G: VA

### What a filer sees today

Question 3G of the Annual Guardianship Plan asks which benefits the ward is
eligible for or has applied for. The court's form lists VA, between Medicaid
and Trusts; the app's list has no VA row, so a guardian cannot report VA
benefits there except under "Other". The Initial Plan's matching question
(Question 7) has VA.

### Verified

- The court's Annual Plan (`reference/plan-forms/plan-annual-original.txt`,
  Question 3G): Social Security, SSDI, HMO, SSI, Optional State Supplement,
  Institutional Care Program, Supplemental Insurance, Pension, Medicare,
  Medicaid, **VA**, Trusts, None, Other -- each with "Eligible" and "Applied
  For".
- The app's list (`PLAN_BENEFITS`, `src/core/filing/models/plan-annual.js`)
  has every one of those but VA. The Initial Plan has `q7Va`
  (`src/core/filing/court-text/plan-initial.js`).
- The Plan for Minors' form has no benefits list; the Simplified Plan's asks
  one yes/no question naming programs. Neither changes.

### Proposed

A VA row between Medicaid and Trusts, on the 3G screen and in the PDF's 3G
table, with the same two unanswered-until-answered choices (Eligible?,
Applied for?), labelled "VA" as the court's form has it.

### Checklist (AGENTS.md §8)

1. **Data model:** two new rows, `benefits.va.eligible` and
   `benefits.va.appliedFor` (`plan_annual`, enum `Yes; No`, optional,
   persisted, tri-state).
2. **Legacy data:** a plan saved before has no `benefits.va`; the screen and
   the PDF already read a missing benefit as unanswered (`b[k] || {}`), so it
   shows a blank VA row -- never "No" (AGENTS.md §4). The sidebar counts 3G
   answered when any benefit is, so no saved plan turns incomplete. No
   migration.
3. **Fixtures:** `fillMinimalValidPlanAnnualWard()` needs nothing (VA is
   optional). The Milestone 70 goldens that list a new Annual Plan's shape
   (`ms70-70C-filing-shapes.json`, `ms70-completion-golden.json`,
   `ms70-conversion-golden.json`, `ms70-year-rollover-golden.json`,
   `ms73-validator-golden.json`, `ms70-declaration-review.json`) gain the two
   fields -- each regenerated by its own script, the diffs read before
   committing.
4. **Tests:** a unit test that the Annual Plan's 3G list is the court form's
   list, in its order; `tests/unit/plan-tristate.spec.js` and
   `filing-registry.spec.js` as their lists require; an e2e check that the VA
   row is on the screen and in the saved PDF.
5. **Export/import:** the Plans have no workbook; the PDF and the `.sav`
   only. Carrying an Initial Plan into an Annual Plan does not carry benefits
   today, and this doesn't start to.
6. **Security:** none beyond the plan's existing classification.
7. **UI:** the existing 3G row (`yesNoRadioHTML`, a fieldset per answer).
8. **Legal framing:** this adds a box the court's own form has; it decides
   nothing about benefits.
9. **Cross-form:** the Initial Plan already has VA; the Minors' and
   Simplified Plan's forms have no list.

### Build record — BUILT 2026-10-10 (approved by name by the requester, 2026-10-10)

**What changed for a filer:** Question 3G of the Annual Guardianship Plan
has a VA row between Medicaid and Trusts, with "Eligible?" and "Applied
for?", unanswered until answered; the answer prints in the PDF's 3G table. A
plan saved before shows the VA row unanswered.

**How:** `PLAN_BENEFITS` (`src/core/filing/models/plan-annual.js`) -- the
screen, the blank filing and the PDF all read it; two rows in
`probate-guardian-data-model.csv` (`verify:data-model` OK, 1,069 rows).

**Records regenerated, each diff read:** `ms70-70C-filing-shapes.json` (the
blank and normalized Annual Plan's `benefits.va` and the list -- added by hand,
in the file's layout, with a note), `ms70-completion-golden.json` and
`ms73-validator-golden.json` (five VA variants each, results as their
neighbours'), `ms70-year-rollover-golden.json` (the two fields) and
`ms70-conversion-golden.json` (the two fields, and -- from 75A -- the empty
documents slots a converted filing's Cover now leaves when its section
redraws for the new filing's dates; they hold nothing).

**Tests:** new `tests/e2e/plan-annual-benefits.spec.ts` (1) and
`tests/unit/plan-annual-benefits.spec.js` (3). **Red-first:** on the previous
list the screen has no VA row, and the unit VA case fails. In a browser on a
C: copy: the new spec and the two characterization specs passed. Unit suite
3,104 passed.

---

## 75D — The Simplified Accounting's Part II heading

### What a filer sees today

On the Simplified Accounting's Part II screen, the first card is headed
**"Assets On Hand"** and holds Line 1, the Starting Balance. Line 8, the
Remaining Assets On Hand, sits below the Disbursements card with no heading.
The Clerk's workbook has it the other way round: Line 1 sits directly under
Part II's own heading, and "Assets On Hand" heads Line 8.

### Verified (the Clerk's workbook, read with a parser)

`templates/simplified-template.js`, sheet `PARTS I, II `:

| Row | Column B | Column C |
| --- | --- | --- |
| 18 | Part II -- ACCOUNTING SUMMARY and REMAINING ASSETS ON HAND | |
| 19 | Line 1 | Starting Balance [Net Assets per the Prior Report] |
| 20 | Income | |
| 21 | (Only the following receipts qualify) | |
| 22–24 | Lines 2–4 | Interest Income; Deposits pursuant to Settlement; Total Income (`=SUM(G22:G23)`) |
| 25 | Less Disbursements | |
| 26 | (Only the following receipts qualify) | |
| 27–29 | Lines 5–7 | Financial Institution Service Charges; Federal Income Tax; Total Disbursements (`=SUM(G27:G28)`) |
| 30 | **Assets On Hand** (merged B30:I30) | |
| 31 | Line 8 | Remaining Assets On Hand (`=H19+H24-H29`) |

The screen (`src/features/simplified-accounting/index.js`, Part II) heads
its cards "Assets On Hand" (Line 1), "Income — Only the following receipts
qualify" (Lines 2–4) and "Disbursements — Only the following qualify" (Lines
5–7). The PDF prints Part II as one table with no group headings and is not
affected. No figure, formula or stored value changes.

### Decision 75D-1 — Part II's headings

**Settled 2026-10-10 (the requester): option 1, the workbook's.** The options
as asked:

1. *Recommended:* **the workbook's.** Line 1's card headed "Starting Balance",
   directly under Part II's heading; "Income — Only the following receipts
   qualify" as now; "Less Disbursements — Only the following qualify";
   Line 8 in its own card headed "Assets On Hand". (Under Less Disbursements
   the workbook repeats "(Only the following receipts qualify)" -- the screen
   keeps its "Only the following qualify", which says the same without the
   slip.)
2. **Only the misplaced heading.** Line 1's card headed "Starting Balance",
   Line 8's headed "Assets On Hand"; the Disbursements wording unchanged.

### Checklist (AGENTS.md §8)

1. **Data model:** none. 2. **Legacy data:** none. 3. **Fixtures:** none.
4. **Tests:** `tests/e2e/form-wording.spec.ts` gains the Part II headings in
   order, each with its lines. No existing test reads them (the card's
   "Remaining Assets On Hand" label, which does, doesn't change).
5. **Export/import:** none -- the workbook and PDF are untouched.
6. **Security:** none. 7. **UI:** the existing `.entry-card-header`.
8. **Legal framing:** wording only, matched to the Clerk's own instrument (§5).
9. **Cross-form:** the Annual family's summary pages are laid out by their own
   workbooks' parts and are not this pattern.

### Build record — BUILT 2026-10-10 (approved by name by the requester, 2026-10-10)

**What changed for a filer:** the Simplified Accounting's Part II reads as
the Clerk's workbook does: Line 1 in a card headed "Starting Balance";
"Income — Only the following receipts qualify" (Lines 2–4); "Less
Disbursements — Only the following qualify" (Lines 5–7); and Line 8, the
Remaining Assets On Hand, in its own card headed "Assets On Hand". No figure,
stored value, workbook cell or PDF line changed.

**How:** `src/features/simplified-accounting/index.js`'s Part II page; Line
8 keeps its `line8` box, which the totals refresh writes.

**Found while building, fixed in its own commit next** (the requester's
named approval): Part II's Lines 4, 7 and 8 lag one edit behind what the
filer types -- recorded with that commit.

**Tests:** `tests/e2e/form-wording.spec.ts` gains the Part II headings, in
order, each over its own lines. **Red-first:** on the previous page Line 1
sits under "Assets On Hand", the card says "Disbursements", and Line 8 has no
card. In a browser on a C: copy: `form-wording` and `simplified-mount` passed.

---

## 75E — Nine schedule list labels

### What a filer sees today

Nothing. The Annual Accounting family's lists each carry a label
(`src/core/form/schedule-schemas.js`), and nine name the wrong schedule. The
one place that could show them -- the "Remove this card?" question
(Milestone 73P) -- deliberately says "this entry" for every schedule, so no
filer sees them. A future dialog, message or log that used them would name
the wrong schedule.

### Verified (against the Clerk's Annual workbook's sheet names, read with a parser, and each screen's own heading)

| List | Label today | The schedule |
| --- | --- | --- |
| schB1 | Schedule B-1 Guardian Fee | B-1 — Attorney Fees (`SCH B-1 ATTORNEY FEES`) |
| schB2 | Schedule B-2 Attorney Fee | B-2 — Guardian Fees (`SCH B-2 GUARDIAN FEES`) |
| schB3 | Schedule B-3 Other Professional Fee | B-3 — Other Court-Ordered Disbursements (`SCH B-3 OTHER CO DISB`) |
| schD2 | Schedule D-2 Securities Entry | D-2 — Real Estate (`SCH D-2 REAL ESTATE`) |
| schD3 | Schedule D-3 Real Estate Entry | D-3 — Personal Property (`SCH D-3 PERSONAL PROP`) |
| schD4 | Schedule D-4 Personal Property Entry | D-4 — Intangible Assets (`SCH D-4 INTANGIBLE`) |
| schD5 | Schedule D-5 Other Asset Entry | D-5 — Mortgages / Loans / Liabilities (`SCH D-5 MORTGAGES`) |
| schF1 | Schedule F-1 Outstanding Claim | F-1 — Sales of Real Property (`SCH F-1 SALES REAL PROP`) |
| schF2 | Schedule F-2 Contingent Liability | F-2 — Sales of Personal Property (`SCH F-2 SALES PERSONAL PROP`) |

Schedules A, B-4, C, D-1 and E are right. The screens, the workbook
capacity table (`src/core/excel/excel-caps.js`) and the Clerk's sheets agree
with each other; only these labels are wrong.

### Decision 75E-1 — the labels

**Settled 2026-10-10 (the requester): option 1, correct all nine and pin
them.** The options as asked:

1. *Recommended:* **correct all nine**, and pin every Annual schedule's label to
   its screen's own heading in a unit test, so they can't drift apart again.
2. **Remove the labels** from the schedule lists, since nothing shows them.

### Checklist (AGENTS.md §8)

1–3. None. 4. **Tests:** a unit test reading every Annual schedule's label
against `excel-caps.js`'s schedule names. 5–8. None. 9. **Cross-form:** the
Initial Inventory's lists are labelled from their own schedule keys
("Schedule A1 entry", `src/core/form/collections.js`), and the Plans' and
shared lists' labels in `schedule-schemas.js` ("Co-Guardian", "Plan
Residence", "Service Recipient" and the rest) name what they hold -- checked
2026-10-10.

---

## Appendix A — built ahead of this proposal: documents that never reached the PDF

**Built 2026-10-10, `fe2f9fc`**, at the requester's named approval ("Fix the
dropped docs now"; for the Plan for Minors, "Right section").

**What a filer sees now:** a document attached on any screen of the Plan for
Minors, on the Simplified Accounting's Parts II–VII, or on the Initial Plan's
Attorney screen prints in the PDF after its own section. Before, none of them
reached the PDF at all, though each screen says "Supplemental PDFs are
inserted as uploaded". On the Plan for Minors, Questions 2 and 3 share
"Questions 2–3"; their documents print there together, Question 2's first.

**Why it happened:** the PDF engine chose each form's screen-to-section table
by the PDF's title. The Plan for Minors' table said "ANNUAL GUARDIANSHIP PLAN
— MINOR" (a dash); since `32626d3` (2026-09-07) the title comes from the
filing registry, "ANNUAL GUARDIANSHIP PLAN - MINOR" (a hyphen), so its table
was never found. The Simplified Accounting never had a table; the Initial
Plan's had no Attorney entry. Found while fixing: a second documents block in
one section was drawn onto the placeholder page the finalizer replaces with
the attachment, and lost with it.

**Checked on all nine types** (real uploads through each screen's control):
the Initial Inventory (11 schedules), the Annual, Final and Trust Accountings
(14 each), the Annual Plan and the Simplified Plan already placed every
document correctly.

**Tests:** `tests/e2e/supporting-documents-reach-pdf.spec.ts` (3) and
`tests/unit/document-sections.spec.js` (13); red-first, both. Light
regression: 28 specs, 201 tests, all passed; unit suite 3,084 passed.

### Found starting 75A, built at the requester's named approval (2026-10-10: "Fix now, own commit")

**What a filer sees now:** a supporting document attached on an Accounting or
a Plan in its second year or later reaches the PDF. Before, it showed on its
screen and never reached the PDF -- nor did the export checks look at it, so a
broken one didn't stop the export either.

**Why it happened:** Start New Year gives every filing type a year key
("Year 2"). The PDF's lookup (`resolveActiveDocPeriod()`,
`src/core/filing/doc-period.js`) read that key first for every type, while the
screen files the Accountings' and Plans' documents by the year's dates. The
lookup now follows the filing's type: the Initial Inventory by its year, every
other filing by its dates -- the empty "no dates yet" bucket included, which
the old lookup also missed. Older at least than `1db1882` (2026-08-29).

**On the test system:** a year-2 filing's "I understand" answers to the
documents reminder were recorded under the year key and will be asked once
more (AGENTS.md §8.2: visible, one-time, not worth a migration).

**Tests:** `supporting-documents-reach-pdf.spec.ts` gains the Annual
Accounting's and the Annual Plan's second years; `supplemental-pdf.spec.js`
the typed cases. Red-first: both browser cases and both new unit cases fail on
the year-first lookup.
