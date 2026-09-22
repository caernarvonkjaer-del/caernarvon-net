# Milestone 64: Verified Initial Inventory — Form Fidelity — Proposal

## Status

**Draft — a proposal, not a work order. Authorizes no change** (`AGENTS.md` §3).
Nothing in this document has been implemented. Items 64A–64B are written up;
further items will be appended as they are raised.

| Item | Summary | Status |
| :-- | :-- | :-- |
| **64A** | Guardian Inventory: printed filing and validation corrected against the Sixth Circuit Verified Initial Inventory, Rev. 11/17/2022 | Proposed — **D1–D6 resolved**, **D12 decided** (no revision stamp); workbook cell references checked 2026-09-21; **not yet authorized**; 64A-3 has a render-baseline prerequisite (D14) |
| **64B** | Annual / Final / Trust Accounting: carrying-value totals, empty-schedule pages, trust columns, Part XI in Excel, against the Sixth Circuit Annual Accounting, Revision 11/17/2022 | Proposed — **D7–D11, D13, D15 decided** (workbook basis for D-4 restricted; always print E/F-1/F-2 first pages; keep 58D for Part XI; three-part delivery; release note only; fix the Part XI panel wording in 64B-2; workbook accepted by content); Part IX `H13` traced, trust-table widths measured; **not yet authorized** |

---

## 64A — Verified Initial Inventory: print and validation corrections

### Provenance

Raised 2026-09-21 from a Fable Chrome-extension session ("Guardian Forms —
Verified Initial Inventory: Correction Spec"). Its basis: a side-by-side review
of the workbook *Initial Inventory 111722 1.xlsx* (Rev. 11/17/2022) against
every Guardian Inventory entry page, the on-screen Summary, and all six pages
of the PDF, using test ward "Jane Garfield".

The spec is transcribed below with its own numbering (1.1 … 8) so the two
documents cross-reference. **Where a claim was checked against `master` and
found wrong or incomplete, a `Master check:` note follows the item; the
"Verification" table at the end summarizes.** Nothing in the spec was taken
on trust where the source was at hand.

### Ground rules — the spec's, mapped onto this repo's conventions

| Spec's rule | How it lands here |
| :-- | :-- |
| The workbook is the source of truth for headings, statutory wording and which fields exist | Agreed. The bundled template is `a_InitialInventory (3).xlsx` (`legacy-app.js:7948`, base64 in `templates/guardian-template.js`). **Confirmed 2026-09-21 (D6): it contains "Rev. 11/17/2022" and the Sixth Judicial Circuit heading** (40 sheets; file last modified 2023-04-13). |
| Never rename/remove `window.D` keys without a migration; missing keys read as unanswered, never "No" | `AGENTS.md` §4 tri-state rule and §8 #1–#2. Every new key gets a `probate-guardian-data-model.csv` row and `npm run verify:data-model` in the same commit. |
| Summary page and printed Part II computed from the same totals | Already the shape: `calc.*` in `guardian-inventory/index.js` feeds the on-screen Summary; the PDF (`pdf-model.js`) recomputes from `d.*`. 64A makes the PDF read the same calculator (MS 60A did this for schedule totals). |
| Every item has an acceptance check, run against the full test ward (§7) | Becomes a shared e2e fixture, `FULL_GUARDIAN_INVENTORY`, in `tests/e2e/support/fixtures.ts` — see Test plan. |
| Code locations: "`src/legacy-app.js` … guardian bundle in `assets/index-*.js`, exposed as `window.validateGuardian` …" | The spec read the deployed build. In source: nav/progress and `emptyDataGuardian()` in `src/legacy-app.js`; pages, `validateGuardian()` and the Summary in `src/features/guardian-inventory/index.js`; the PDF in `src/features/guardian-inventory/pdf-model.js`; Excel in `…/excel.js`; page-break behaviour in `src/core/pdf/pdf-engine.js`. The spec's `legacy-app.js` line numbers match `master` within a line or two. |

### 1. P1 — Wrong data on the printed filing

**1.1 Bond Amount prints as $0.00.** D-4 shows $25,000; page 5 "Bond Amount"
prints $0.00. `D.bondAmount` is the display string "$25,000"; schedule money
fields store numbers.
*Change:* D-4 Bond Amount uses the same numeric handler as schedule money
fields (strip `$` and `,`, store a number, format on display); one-time
normalization on load parses an existing string ("$25,000" → 25000). **Caution (review):** the stock decimal handler (`legacy-app.js:6583`) stores `parseFloat(val)||0`, so clearing the field would write 0, not `''` — 64A-1 must preserve blank (§4) and the validator must not read a real 0 as "unentered" differently from blank. Form
ref: PART V, B26.
*Accept:* enter `25,000` or `$25,000` → `D.bondAmount === 25000` → page 5
prints $25,000.00; a `.sav` saved before the fix reloads to the same.

> **Master check — confirmed, and wider than stated.** D-4 uses a plain
> `textInput('bondAmount','e.g., $50,000')` (`index.js:1137`); the PDF's
> `fmt()` is `parseFloat(v) || 0` (`pdf-model.js:30`), so `"$25,000"` → NaN
> → $0.00. Two more readers of the same string: **Excel export** writes the raw
> value to PART V!G26 (`excel.js:488`) and **import** reads G26 as text
> (`:631`) — both change with the store. And **Annual shares the key**
> (`bondAmount`; nav rule `a-p9`, `legacy-app.js:6828`), so the load-time
> normalization must be scoped to the Guardian family or verified safe for
> Annual first. The number-vs-string choice also touches `checklist-export-parity`
> (`req(d.bondAmount, …)` at `index.js:1277` treats `0` as blank — decide
> whether a bond of $0 is "unanswered" or "zero").

### 2. P2 — Form content missing from the print

**2.1 Summary I is collapsed to two rows.** Printed Part II shows only
"Schedule A" and "Schedule B" with Gross / Debts / Net. The form's SUMMARY I
(rows 30–39) lists: A-1 Real Estate / Real Property; A-2 Real Estate
Liabilities (negative); Real Estate Assets, Net of Liabilities; B-1 Cash
Assets / Cash Equivalent Assets; B-2 Personal Property Assets; B-3 Intangible
Assets; B-4 Liabilities / Secured and Unsecured Debt / Notes / Loans
(negative); Cash / Personal Property / Intangible Assets, Net of Liabilities;
VERIFIED INITIAL INVENTORY OF GUARDIAN (grand total).
*Change:* print the eight schedule rows, two net rows and the grand total in
the form's order and labels; reuse the on-screen Summary's data.
*Accept:* Part II lists A-1, A-2, net A, B-1, B-2, B-3, B-4, net B, total;
values match the on-screen Summary and the schedule totals.

> **Master check — confirmed** (`pdf-model.js:171–183`). Layout is D1.

**2.2 Summary II sign and labels.** C-2 prints positive; labels are the
app's. Form: SUMMARY II H9 = `-'C-2'!H50`; labels Income (Annualized);
Lawsuits Pending Against the Ward; Lawsuits Pending by the Ward; Value of
Trusts for the Ward; Joint Owners of Ward's Assets.
*Change:* C-2 negative on the printed Summary II; the form's labels.
*Accept:* C-2 of $1,000 prints as −$1,000.00 in the same accounting format
used for A-2/B-4.

> **Master check — confirmed** (`pdf-model.js:184–198`; `fmt()` already
> renders negatives as `-$…`).

**2.3 Part I safe-deposit-box questions are not printed.** Form: SUMMARY I
B26 "Does Ward have a Safe Deposit Box?" (D26) and E26 "If yes, has the Safe
Deposit Box Inventory been filed?" (H26). Keys exist: `hasSafeDepositBox`,
`safeDepositBoxFiled`.
*Change:* print both in Part I; keep the Part V repetition (the form repeats
it at B11/H11). Yes → print the "filed?" answer; No → "N/A" for the second.
*Accept:* SDB Yes / filed No → Part I prints both; SDB No → "No" and "N/A".

> **Master check — partly wrong observation, change stands.** The "filed?"
> line *does* print, under Part V, whenever SDB is Yes (`pdf-model.js:594–597`);
> the spec's ward had SDB = No, which is why it "never" printed. Part I has
> neither question — confirmed. Keys confirmed (`index.js:1110`, `pdf-model.js:594`).

**2.4 Certificate of Service lacks "Indicate if:" and the statutory cite.**
Form PART VI: B8 "Pursuant to the Florida Statute 744.362(1), I hereby
certify that a copy of this inventory has been furnished to:"; B24 "on this
date"; J24 "Indicate if:" with list (J25) *Ward is totally incapacitated /
Ward is under 14 years old / N/A*; B7 "The attorney may use an electronic
signature "/s/"."
*Change:* add `D.serviceIndicateIf` (tri-state `''` or one of the three
values); a required "Indicate if:" dropdown on D-5; restore the form's
sentence with the cite and "on this date"; print "Indicate if: [value]" after
the recipient list. The 57B "No recipients are required" attestation stays
as an app feature; it does not replace this field.
*Accept:* D-5 does not validate complete until answered; page 6 prints the
cite, the date, the recipients and the value.

> **Master check — confirmed.** No such key or control anywhere in `src/`,
> `tests/` or the CSV. Current sentence: *"I certify that a copy of this
> Verified Initial Inventory was served on [date] to the following persons:"*
> (`pdf-model.js:677`). Note the Annual and Simplified certificates already
> carry a free-text "Indicate if (e.g. hand-delivered, mailed)" (`certIndicator`)
> — a different field with a different meaning; do not reuse the key. The
> new required field sits beside 63B's attestation on the same page; 63B's
> visibility rule is unaffected. Requires: CSV row, `emptyDataGuardian()`,
> validator message prefixed `D-5 — ` so the nav bucket derives via
> `errorRoute()`, Excel export/import of J24, fixture audit (§8 #3: every
> guardian fixture that expects to be fileable must now set it).

**2.5 Attestation wording and structure diverge from the form.** Restore the
form's text verbatim.

- *Guardian oath (Part III, B6):* "UNDER PENALTIES OF PERJURY, I declare that
  I have read the foregoing, and the facts alleged are true, to the best of my
  knowledge and belief." (The form's own spelling is "PENALITIES"; use
  "PENALTIES".) Currently: "…read the foregoing Verified Initial Inventory and
  that the facts stated in it are true and complete to the best of my
  knowledge and belief."
- *Preparer (Part IV, B6–B11)* — currently placed under the guardian's oath
  with no compilation statement. Form: heading PREPARER SIGNATURE; "I have
  compiled the accompanying Verified Initial Inventory of assets and
  liabilities arising from cash transactions, current market valuation, and
  current estimated market valuation of the guardianship of [Ward's Name] as
  of [Date]."; "This compilation is limited to presenting information in the
  form of a Verified Initial Inventory information and is the representation
  of the Guardian. I have not audited or reviewed the accompanying Verified
  Initial Inventory and, accordingly, do not express an opinion or any other
  form of assurance on it."; "If you are the Guardian, Co-Guardian, or
  Guardian Attorney - DO NOT SIGN HERE." Two preparer dates: "as of" (H8)
  and signature (G12); D-2 has one. Add `D.preparer.asOfDate` (defaults to
  the signature date when blank) and print both. Move the preparer into its
  own Part IV block with this text; print the ward's name and as-of date in
  the sentence.
- *Attorney (Part IV, B18–B23):* heading GUARDIAN ATTORNEY SIGNATURE; "The
  attorney may use an electronic signature "/s/"."; "The undersigned Attorney
  hereby notifies the Court of the filing of the Verified Initial Inventory
  as of [Date]."; "This Verified Initial Inventory is the representation of
  the Guardian. I have not audited the accompanying Verified Initial
  Inventory. The undersigned Attorney represents that he/she has examined the
  contents of the Inventory and that it conforms to the requirements of the
  Florida Guardianship Law and the standards for inventories in [County]
  County, Florida." Currently: "The undersigned attorney certifies that this
  Verified Initial Inventory complies with the applicable Florida Statutes
  and Florida Probate Rules." "as of [Date]" = `D.attorney.filingDate` (D-2
  "Filing Date (as of)"); County = `D.county`.
- *Part headings.* Currently "Part III — ASSETS OF THE WARD", "Part III & IV
  — ATTESTATIONS & OATHS OF GUARDIAN & PREPARER", "Part III-B — ATTORNEY
  ATTESTATION", "Part V — AUDIT FEE, BOND & SAFE DEPOSIT BOX" with sub-heads
  "Schedule D-3" / "Schedule D-4". Form: Part I REQUIRED INFORMATION; Part II
  SUMMARY I; SUMMARY II; Part III GUARDIAN(S) ATTESTATION(S); Part IV
  PREPARER & GUARDIAN ATTORNEY ATTESTATIONS; Part V OTHER INFORMATION
  (sub-heads AUDIT FEE SCHEDULE; SURETY BOND REQUIREMENT; Bond Calculation;
  Bond Requirement); Part VI GUARDIAN ATTORNEY CERTIFICATE OF SERVICE.
  Schedules carry their own "SCHEDULE X-N: [title]" headings and no "Part"
  heading. Remove "D-3"/"D-4" from the print — app nav labels, not form
  terms.

*Accept:* printed headings match; the preparer block is not under the perjury
oath; page 5 has no "Schedule D-3" / "Schedule D-4".

> **Master check — confirmed** for every quoted current string
> (`pdf-model.js:521`, `:530`, `:550`, `:559`, `:583`, `:592`) and the
> preparer's placement (`:519–535`). `attorney.filingDate` exists
> (`legacy-app.js:5683`; D-2 at `index.js:1076`). `preparer.asOfDate` does
> not: CSV row + `emptyDataGuardian()` + Excel H8. The PDF bookmark tree
> ("Part IV - Attestations & Oaths", `:523`/`:552`) is pinned by
> `pdf-accessibility-and-signatures.spec.ts` and `pdf-structure-tags.spec.ts`
> and changes with the headings. Legal framing (§8 #8): these are the court's
> own words; the app asserts nothing new by printing them.

**2.6 Schedule titles renamed on the print.** Use the form's titles on the
print (the entry pages already have them):

| Schedule | Print currently | Form title |
| :-- | :-- | :-- |
| A-1 | Real Property Assets | Real Estate / Real Property |
| A-2 | Debts on Real Property | Real Estate Liabilities (Mortgages / Notes / Loans) |
| B-1 | Cash & Financial Accounts | Cash Assets / Cash Equivalent Assets |
| B-2 | Personal Property Assets | (already correct) |
| B-3 | Intangible & Other Personal Property | Intangible Assets |
| B-4 | Debts on Personal Property | Liabilities / Secured and Unsecured Debts / Notes / Loans |
| C-1 | Periodic Income | Income (Annualized) |
| C-2 | Claims and Lawsuits Against the Ward | Lawsuits Pending Against the Ward |
| C-3 | Claims and Lawsuits by the Ward | Lawsuits Pending by the Ward |
| C-4 | Trusts | Value of Trusts for the Ward |
| C-5 | Joint / Other Property | Joint Owners of Ward's Assets |
| Summary II | Other Assets & Sources of Income | Other Financial Information |

Also apply the form's sense to the "verified none" sentences (e.g. "no real
estate / real property to report").

> **Master check — confirmed.** Entry pages `index.js:770–1002` already
> carry the form titles; the PDF's differ (`pdf-model.js:177`, `:187`,
> `:190–194`, `:270` ff.). Titles are asserted in
> `tests/unit/guardian-inventory-pdf-model.spec.js`, `guardian-inventory-schedule-layout.spec.ts`,
> `pdf-table-semantics.spec.ts`, `pdf-form-specific.spec.ts`, `verified-inventory-workflow.spec.ts`
> — expected-string updates, same commit.

**2.7 Small print omissions.**
- Print the two-line audit fee schedule (PART V B8–B9: "Property Value in
  Excess of $25,000 … $85.00" / "below $25,000 … $0.00") above the
  determination line.
- Add the revision stamp "Rev. 11/17/2022" to the page footer (SUMMARY I B40).
- When `bondWaived === 'Yes'`, print "Surety bond waived by court order? Yes
  — Order dated [bondWaivedDate]" (PART V B15).

> **Master check.** Fee schedule: only the base and the determination print
> today (`pdf-model.js:598–605`) — confirmed; PART V B8/B9 read from the
> bundled workbook and match (the $85.00 / $0.00 amounts live in other cells,
> not read). **Rev stamp — differs from the spec: it is a cell, not a footer.**
> SUMMARY I B40 holds "Rev. 11/17/2022" as ordinary cell text at the foot of
> that one sheet, and the sheet has no header/footer definition at all. The
> engine's shared footer is "form subtitle — ward name" on the left and "Page N
> of M" on the right (`pdf-engine.js:394–407`). **D12 (decided 2026-09-21):
> leave the stamp off**, so nothing is added and no Guardian-only branch enters
> the shared footer; the printed filing then carries no revision identification
> of the court form — recorded so that is a choice, not an omission. **Waiver —
> already printed** ("Date of the order waiving the bond" when Yes,
> `pdf-model.js:653–656`) **and the spec's proposed sentence is not the form's.**
> PART V B15 reads *"If the surety bond has been waived, note the date of the
> order……"*; template wins (§5), so use that wording, not "Surety bond waived
> by court order? Yes — Order dated".

### 3. P3 — Validation stricter than the form

**3.1 C-3 requires Action Date and Case Number.** Form C-3: C6 "Include those
lawsuits that are intended to be brought, even if not yet filed"; C8 "If an
Action has been filed by the Ward, indicate the Date"; C11 "Case number, if
filed."
*Change:* make `actionDate` and `caseNumber` optional; keep Defendant, Type
of Action, Status, Court/Jurisdiction, Estimated Settlement > 0 required.
Print "Not yet filed" in the date and case-number cells when blank.
*Accept:* a C-3 row with neither validates; C-3 goes green; print shows "Not
yet filed".

> **Master check — half right.** `validateGuardian()` requires
> `actionDate` (`index.js:1243`) but **never requires `caseNumber`** on C-3;
> the entry page merely *labels* Case Number as required (`reqLabel`,
> `index.js:968`). So: the validator changes for `actionDate` only; the label
> changes for both (`optLabel`). Readiness derives from the validator via
> `errorRoute()`, so no nav edit; `checklist-export-parity.spec.js` proves it.

**3.2 B-4 requires "Related Personal Property Asset (if secured)".** Form
B-4 C6 lists unsecured debts (credit cards, medical and facility bills, notes,
tax and judgment liens); C7 orders secured first.
*Change:* make it optional; keep the "(if secured)" label; print "Unsecured"
when blank.
*Accept:* a B-4 row with lender, type, balance and address but no related
asset validates.

> **Master check — confirmed; key is `relatedProperty`**, not the spec's
> `relatedAsset` (`index.js:1240`, message "Related Property").

**3.3 D-1 through D-5 never show "what's missing" and never disable Next.**

> **This is Milestone 63A, already written up in `MILESTONE-63-PROPOSAL.md`
> with a corrected diagnosis. Not part of 64A.** The snippet the spec
> proposes (`guardianTrackedKeys = [...SCHEDULE_NAV_KEYS,'d1'..'d5']`) is the
> one 63A rejects: it blocks Next on the D pages (63A's D1 recommends
> explain-only), omits Cover (also marked with no explanation), and patches
> one of the two copies of `isScheduleIncomplete()` — the live patch would
> still clear the box on the next edit. Decide it in MS 63.

**3.4 Minor field additions.** C-2: form C7 asks for "Name of
claimant/petitioner and their attorney" — add optional
`scheduleC2[].claimantAttorney`, printed on the name line. D-2: `preparer.asOfDate`
(2.5).

> **Master check:** neither key exists; CSV rows + Excel mapping for each.

### 4. P3 — On-screen defect

**4.1 Summary page: "Personal Property (B-2)" row is blank** in the Part V
block; D-4 and the print show $6,500.00.
*Change:* bind the row to `calc.totalB2()`.
*Accept:* the row shows $6,500.00 for the test ward.

> **Master check — confirmed:** hard-coded `value:''` at `index.js:736`; D-4
> renders `calc.totalB2()` at `:1129`. One-line fix.

### 5. P4 — Print layout

- Orphaned headings: "Schedule A-2" alone at the foot of page 1; the Part IV
  attorney heading and statement on page 4 with the signature block on page
  5. Spec's remedy: `break-after: avoid` on headings, `break-inside: avoid`
  on heading + first block and on each signature block.
- Page 3 mostly blank (C-3/C-4/C-5 verification lines only) — acceptable if
  it results from the orphan fix.
- B-1 header wraps as "Restrict ed?" — widen or `nowrap`.
- Header table on pages 2–6 is fine; keep.

> **Master check — the remedy does not apply.** The PDF is drawn by the
> vector engine (`src/core/pdf/pdf-engine.js`), not by CSS. The engine's only
> break control is `pageBreakBefore` per section (`pdf-engine.js:728`); it
> has no keep-with-next or keep-together. Fixing orphans means an **engine
> feature** (e.g. `keepWithNext` on headings and `keepTogether` on signature
> blocks), which reaches every filing type's PDF and their layout specs.
> Scoped as its own delivery — D4.

### 6. Confirmed matching the form (no change)

Row-level fields on A-1 through C-5 (Personal Residence? / Income Property?;
Type lists M/N/L/O and N/L/O; Restricted? and Restricted Asset Amount; In
Safe Deposit Box? and Amount in SDB; Frequency list; Trust type/date/account;
Relationship to Ward); B-2 vehicle sub-fields (an improvement over the form's
free text); bond calculation matches PART V H18–H23; audit fee rule;
co-guardians; SSN/EIN masked (correct under Fla. R. Gen. Prac. & Jud. Admin.
2.425 — keep); per-schedule Supporting Documents and Comments (additions —
keep).

### 7. Test fixture and acceptance run

One ward, "Test Full Inventory": County **Pasco**; Amended = Yes; two
witnesses. A-1: 2 properties (one 50%). A-2: 2 liabilities. B-1: 3 accounts,
one Restricted. B-2: 3 items, one vehicle, one In SDB. B-3: 2, one Restricted,
one In SDB. B-4: 2, one secured with related asset, one unsecured blank. C-1:
2 sources, different frequencies. C-2: 1. C-3: 2, one with no date/case
number. C-4: 1. C-5: 1. D-1: 3 guardians. D-2: preparer with distinct as-of
and signature dates. D-3: SDB Yes, filed No. D-4: Bond 30,000; waived Yes with
order date. D-5: 4 recipients; Indicate if = "Ward is totally incapacitated".
A Comment on at least one schedule.

Verify on the print: 1.1; 2.1 rows; 2.2 sign; 2.3 both SDB lines in Part I;
2.4 cite and value; 2.5 texts and headings; 2.6 titles; 2.7 fee schedule, rev
stamp, waiver; every schedule's columns with populated rows; all three
guardians; no orphaned headings; "Restricted?" on one line. On screen: 3.1,
3.2 validate; 4.1. And: a `.sav` from before these changes loads with no
previously-unanswered field reading as "No".

### 8. The spec's open questions, plus those this review adds

**D1 — Summary I/II layout. DECIDED 2026-09-21: option 1; REOPENED and CHANGED to option 2 the same day.** Reopened
because 2.1's eight schedule rows each carry one meaningful amount, so a Gross / Debts / Net table would
print mostly empty cells (§3: cost changed). **Final: the form's single Amount column** — headers
Schedule | Title | Amount; A-2 and B-4 print negative; the two net rows and the grand total print bold.
Original options: (1) Keep the app's Gross / Debts / Net table
but with the form's rows and labels (recommended: 2.1 asks only for the row
breakdown; the table reads better than the form's single column, and the
PDF is a filing, not a facsimile). (2) The form's single-column layout.

**D2 — Warn on D-4 when Bond Amount < calculated requirement. DECIDED 2026-09-21: option 1 (defer).** Not on the
form. (1) Defer (recommended for 64A — keep this milestone to fidelity).
(2) Add as a readiness *note*, never a validator block.

**D3 — The form's numbering quirk. DECIDED 2026-09-21: option 1.** (SUMMARY II and the Guardian Attestation
are both labelled "Part III"). (1) Summary II under Part II; Part III starts
at the guardian attestation (recommended, per the spec). (2) Reproduce the
form's labels exactly.

**D4 — Print orphans (item 5) need an engine feature. DECIDED 2026-09-21: option 1 (own delivery, 64A-3).** (1) Own delivery,
64A-3, after the content work; touches all seven types' layout specs.
(2) Fold into 64A-2. (3) Drop; accept the orphans. Recommend (1).

**D5 — Delivery split. DECIDED 2026-09-21: the three-part split below.**
- **64A-1, small and independent:** 1.1 (with the Excel and Annual-key
  notes), 4.1, 3.1, 3.2. Each unit-testable; no print restructure.
- **64A-2, the print:** 2.1–2.7 and 3.4 (new keys, CSV, Excel), D1/D3
  applied. One `pdf-model.js` rewrite of Parts I–VI with the shared
  calculator; the tests that pin titles and bookmarks updated with it.
- **64A-3, layout:** item 5 via the engine (D4).
- 3.3 stays in MS 63.

**D6 — Confirm the bundled template is Rev. 11/17/2022. CLOSED 2026-09-21 — confirmed.** The decoded `templates/guardian-template.js` contains the shared strings "Rev. 11/17/2022" and "IN THE CIRCUIT COURT, SIXTH JUDICIAL CIRCUIT, FLORIDA"; SUMMARY I is present. (Its cell references were then read — see 64A's "Workbook cell check" below.) The repo bundles
`a_InitialInventory (3).xlsx`; the spec reviewed *Initial Inventory 111722
1.xlsx*. Decode `templates/guardian-template.js` and read SUMMARY I!B40 before
64A-2 starts; if they differ, the spec's cell references need re-checking
against the bundled file.

### Milestone checklist (`AGENTS.md` §8)

1. **Data model** — new: `serviceIndicateIf`, `preparer.asOfDate`,
   `scheduleC2[].claimantAttorney`; `bondAmount` changes runtime type (string →
   number, Guardian only) but **the CSV already declares it `decimal,currency`
   (rows 136, 302), so no type row changes**. CSV rows and `verify:data-model` in the same
   commit as each.
2. **Legacy data migration** — `bondAmount` string → number on load
   (Guardian-scoped; §4: a blank stays blank, never 0). New keys missing
   from an old `.sav` read as `''`/unanswered; `serviceIndicateIf` unanswered
   makes an old inventory *incomplete* until answered — a deliberate
   consequence of a required form field, to be stated in the release note.
3. **Fixture & factory audit** — `MINIMAL_VALID_GUARDIAN` and every fixture
   that expects a fileable Guardian ward gain `serviceIndicateIf`;
   `expectFileableFixture()` is the check. New `FULL_GUARDIAN_INVENTORY`
   fixture per §7.
4. **Test coverage & index** — below.
5. **Export / import / portability** — Excel: PART V!G26 numeric (1.1); PART
   VI J24, PART IV H8, C-2 attorney (2.4, 2.5, 3.4) — the workbook has **no separate attorney column**: C7 is only the instruction and the attorney would share cell C(r+2) with the claimant name, so how import splits it (e.g. on `/ Atty:`, risking misparse of a name containing a slash) is an open design choice, not settled;
   `guardian-inventory-excel-schedule-layout.spec.ts` and the date-roundtrip
   unit spec extended. PDF: Parts I–VI restructured; bookmarks renamed.
   Conversions Guardian → Annual/Simplified: the new keys do not map
   (no counterpart) — confirm the mappers ignore them rather than throw.
   Readiness/export parity holds automatically for the Inventory
   (`errorRoute()`), proven by `checklist-export-parity.spec.js`.
6. **Security & sensitivity** — none new; SSN/EIN masking unchanged.
7. **UI/UX consistency** — one new dropdown (D-5) and one date (D-2) using
   the existing primitives; labels A-1…C-5 unchanged on screen.
8. **Legal / compliance** — the printed attestations become the court's
   verbatim text; the statutory cite (744.362(1)) is the form's, printed as
   given. The app still makes no assertion of its own; it stops paraphrasing
   the court's.
9. **Cross-form consistency** — Guardian only. Annual's `bondAmount` sharing
   (1.1) and the engine change (D4) are the two places the other types are
   touched; each is called out where it arises.

### Test plan

Red-first (`AGENTS.md` §7) per item; `TEST-INDEX.md` rows in each commit.

- **Unit, `guardian-inventory-pdf-model.spec.js`** (exists, 6 title
  assertions today): 2.1 rows/labels/order and grand total from the shared
  calculator; 2.2 C-2 negative; 2.3 Part I SDB lines (Yes/No → N/A); 2.4
  sentence, cite, Indicate-if line; 2.5 three attestation texts and Part
  headings, preparer block placement; 2.6 titles; 2.7 fee schedule lines and
  waiver label. Each red today against the quoted current strings.
- **Unit, new `guardian-bond-amount.spec.js`**: input normalization
  ("$25,000", "25,000", "25000.50", "" → 25000 / 25000 / 25000.5 / ''); load
  normalization from a string; Annual untouched. Red today.
- **Unit, validator**: 3.1 (C-3 without date validates; message gone), 3.2
  (B-4 without `relatedProperty` validates), 2.4 (D-5 without
  `serviceIndicateIf` does not). Red today.
- **Unit, Summary**: 4.1 the Part V block's B-2 row equals `calc.totalB2()`.
- **e2e, `verified-inventory-workflow.spec.ts` / `pdf-form-specific.spec.ts`**:
  the §7 acceptance run against `FULL_GUARDIAN_INVENTORY` — extract PDF text
  and assert the items above in one pass; `pdf-structure-tags.spec.ts` and
  `pdf-accessibility-and-signatures.spec.ts` bookmark expectations updated.
- **e2e, layout (64A-3)**: no heading is the last text on a page; each
  signature block's fields are on one page; "Restricted?" header unbroken.
- **Legacy `.sav`**: a fixture saved before 64A loads with every tri-state
  still `''` and `bondAmount` parsed — unit, against the migration.
- **e2e cost**: the full source suite is ~26 min at baseline; 64A-2's PDF
  specs add seconds each.

### Files expected to change

`src/features/guardian-inventory/index.js` (D-2, D-4, D-5 controls;
validator; Summary row; labels), `pdf-model.js` (Parts I–VI), `excel.js`
(G26, H8, J24, C-2 column); `src/legacy-app.js` (`emptyDataGuardian()`,
bond normalization on load); `src/core/pdf/pdf-engine.js` (64A-3 only);
`probate-guardian-data-model.csv`; `tests/e2e/support/fixtures.ts`; the
unit and e2e specs named above; `TEST-INDEX.md`; `help-content.js` /
`help/index.html` if they describe the certificate page.

### Verification of this write-up — what was and wasn't checked

Checked on `master` (2026-09-21, at `fbefc3e`): every "current print" string
the spec quotes; `fmt()`; the D-4 input; the C-3 and B-4 validator lines; the
Summary Part V block; the SDB and attorney keys; the absence of the three
proposed keys; the entry-page titles; the engine's break support; the Excel
bond cell; which tests assert the affected strings (match counts:
`guardian-inventory-pdf-model.spec.js` 6, `guardian-inventory-schedule-layout` 2,
`pdf-table-semantics` 2, `pdf-form-specific` 1, `verified-inventory-workflow` 1,
`guardian-inventory-totals` 1).

**Workbook cell check (2026-09-21).** The bundled Guardian workbook was decoded
and every cell the spec cites was read with an address-safe parser:

| Spec item | Cells | Result |
| :-- | :-- | :-- |
| 2.3 SDB in Part I | SUMMARY I B26 / D26 / E26 / H26 | ✓ text as quoted; D26 and H26 are the Yes/No inputs |
| 2.1 Summary I rows | SUMMARY I B30–B39 | ✓ eight schedule rows (A-1, A-2, B-1…B-4 in B30/31/34–37), two net rows (B32, B38), grand total B39; **B33 is a sub-header** ("SCHEDULE B: Cash / Personal Property / Intangible Assets / Liabilities"). The descriptive titles are not in column B. |
| 2.2 C-2 negative | SUMMARY II H9 | ✓ `=-'C-2 LAWSUIT AGAINST 1'!H50` |
| 2.5 oath | PART III B6 | ✓ verbatim, with "PENALITIES" |
| 2.5 preparer | PART IV B6–B11, H8, G12 | ✓ heading B6; sentence B7 (the spec said B6–B11); "Ward's Name" B8; as-of "Date" H8; signature "Date" G12 |
| 2.5 attorney | PART IV B18–B23 | ✓ heading, /s/ note, "notifies the Court … as of ………" (B20), "Date:" (B21), the representation (B22), **B23 = "Select County"** (the county slot) |
| 2.4 certificate | PART VI B7, B8, B24, J24, J25 | ✓ 744.362(1) sentence; "on this date"; "Indicate if:"; **J25's validation list is exactly** "Ward is totally incapacitated, Ward is under 14 years old, N/A" |
| 2.7 waiver / bond | PART V B15, B26, H18–H23 | ✓ B15 wording above; "Bond Amount" B26 with G26 an empty input; H18 `='B-1 CASH pg 1'!J56`, H23 `=G20+G21+G22` |
| 3.1 / 3.2 / 3.4 | C-3 C6/C8/C11; B-4 C6/C7; C-2 C7 | ✓ quoted instructions match; C-2 C7 is "Name of claimant/petitioner **and their attorney** in suit/description of lawsuit" |

**Two things the reading adds to 2.5.** The form itself contains typos the app
must not copy: "PENALITIES" (the spec noted it) **and a lowercase-L "l have
compiled" (PART IV B7) and "l have not audited" (B22) where "I" is meant** — use
"I". And the preparer sentence is one run with the ward's name and the as-of
date as blank slots (B7 → B8 → H8), which supports printing them inline.

Not checked: the spec's rendered-PDF observations (orphaned headings, the
mostly-blank page 3, the "Restrict ed?" wrap) — **decided 2026-09-21 (D14): render
and inspect a baseline ourselves as a prerequisite to 64A-3**, when the full
fixture exists; and item 6's "confirmed matching" list, which is the spec's own
review.

---

## 64B — Annual Accounting: totals, print and export corrections

### Provenance

Raised 2026-09-21 from the same Fable Chrome-extension session as 64A
("Correction Spec: Verified Initial Inventory & Annual Accounting"). It has two
parts. **Part A (Initial Inventory) is the text already recorded above as 64A**;
it was not re-transcribed, and no difference in item numbering, quoted strings
or fixture was noticed. **Part B (Annual Accounting) is transcribed here** with
its own numbering (§9–§14), which continues 64A's so the two cross-reference.
Its basis: a side-by-side review of *Annual Accounting 111722.xlsx* (Rev.
11/17/2022) against every entry page, the on-screen Summary (Parts VI/VII), the
Print Preview readiness panel and all 16 printed pages, using ward "Harold
Everett Brennan" (Case 24-003117-GD, Pasco — test data), built out to 24 of 24
sections.

**One engine, three filings.** Annual, Final Accounting and Trust Accounting
share `annual-accounting/` (its `pdf-model.js`, `totals.js`, `excel.js`), so
every item below applies to all three unless stated.

### Ground rules — the spec's, mapped, plus this repo's rule that decides two items

The spec cites three minified deployed chunks by hash. In source they are
`src/features/annual-accounting/totals.js`, `pdf-model.js` and `excel.js`; the
quoted literals in the spec all match `master`.

**`AGENTS.md` §5 governs this part more than 64A: the court's bundled workbook
is authoritative; "when a proposal and the template disagree, the template
wins — say so plainly and correct the document"; matching the template needs no
permission, diverging from it is "a legal-accuracy defect by default"; changes
to bond bases need Alan's named acceptance.** That rule corrects the spec in two
places (9.1's D-4 restricted amount, and 10.1's remedy) and reframes a third
(§11). Each is marked **Master check — differs**.

### 9. P1 — Wrong data on the printed filing and on-screen totals

**9.1 Carrying Value is silently reduced by Ward's % on Schedules D-2, D-3, D-4.**
On a 50%-owned asset, Carrying Value typed as $82,500 prints as $41,250; D-3
$3,000 prints $1,500. Storage is fine (`D.schD2[1].carryingValue === 82500`); the
reduction is introduced independently in two places, both multiplying Carrying
Value by Ward's %:
- **Print** — the D-2/D-3/D-4 row builders (`pdf-model.js`): `cv = carry × wardFraction`,
  printed as the Carrying Value cell; D-4 also derives "Restricted Amt" from it.
- **On-screen totals** — the aggregator (`totals.js`): `schD2_carrying`,
  `schD3_carrying`, `schD4_carrying` and `schD4_restricted` each multiply by
  `pct(r.wardPct)`. `schD4_restricted` feeds Part IX's "Schedule D-4 —
  Intangible Assets RESTRICTED" bond line.

The "Ward's Amount / Total Value" figures (Full × %) are correct. The Excel
export writes Carrying Value unscaled and is the reference. Form ref: SCH D-2
column I "Carrying Value" is a plain entered number; column J "Ward's Value of
Ownership" is `=G*H`; the page total `I52` is a plain `SUM`; D-3 and D-4 follow
the same pattern.
*Change (spec):* drop the `× Ward's %` from the printed Carrying Value cell for
D-2/D-3/D-4 and from the four `totals.js` reducers; derive D-4's Restricted Amt
from the unscaled value.
*Accept (spec):* D-2 line 2 (Full 190,000 / 50% / Carrying 82,500) and D-3 line
2 (Full 6,000 / 50% / Carrying 3,000) print $82,500.00 and $3,000.00; D-2 Totals
(Carrying) $242,500.00 (was $201,250.00); D-3 Totals (Carrying) $24,300.00 (was
$22,800.00); Part VII matches; a D-4 line with Ward's % < 100 and Restricted =
Yes prints Carrying and Restricted Amt unscaled, and Part IX's D-4 RESTRICTED
line follows.

> **Master check — the carrying-value diagnosis is confirmed; the D-4
> Restricted Amt remedy differs from the workbook.**
>
> *Confirmed in source:* `pdf-model.js:700–717` (D-2), `:744` (D-3), `:778–796`
> (D-4); `totals.js:31, 33, 35, 36`; Part IX prints the restricted line from
> `t.schD4_restricted` (`pdf-model.js:1025`) and the unrestricted line as
> `t.schD4_ward − t.schD4_restricted` (`:1028`). The workbook matches the spec
> for carrying: D-2 `I` unformulated, `J20 = G20*H20`, `I52` a plain `SUM`; D-3
> `H` carrying plain, `I31 = F31*G31`; Part VI/VII pull `F26 = D-2!I53`, `F27 =
> D-3!H48`, `F28 = D-4!I55` (carrying) and `H26/H27/H28 = D-2!J53 / D-3!I48 /
> D-4!J55` (ward value) — the carrying ones are plain sums of Carrying Value. **No new
> permission is needed for the carrying fix** (§5: matching the template).
>
> *Differs — D-4 Restricted Amt and the bond line.* The workbook's D-4 sheet has
> `J = G*H` (Full Amount × Ward's %) and **`K = IF(F="Yes", J, 0)`** — the
> restricted amount is the **Ward's Value of the restricted lines, not Carrying
> Value at all**, scaled or not. **Part IX, fully traced (2026-09-21):** `H13 = D-4!K55` (the sum of that column,
> pages 1 and 2); `G16 = D-4!J55 − H13`; `G14 = D-1!K59 − D-1!J59`; `G15 =
> D-3!I48`; **`H17 = SUM(G14:G16)`** — the bond requirement. That is exactly the
> app's `bondReq = (schD1_total − schD1_restricted) + schD3_ward + (schD4_ward −
> schD4_restricted)` (`totals.js:42`) term for term, so the *only* place the app
> departs from the workbook is the D-4 restricted base. *(Record correction: an
> earlier audit pass of mine labelled some of these formulas with the wrong cell
> addresses — `D13`/`D16`, and `D26–D28` on Part VI/VII — because its regex could
> attribute a formula to the preceding self-closed cell. The formulas were right;
> the addresses above are from a re-run with an address-safe parser.)* So:
>
> | Line: Full $100,000, Ward's 50%, Carrying $80,000, Restricted = Yes | Restricted | "Unrestricted" (D-4 ward − restricted) |
> | :-- | --: | --: |
> | **Workbook** (`K = IF(F="Yes", G*H, 0)`) | $50,000 | $0 |
> | App today (`carrying × %`) | $40,000 | $10,000 — bond too high |
> | **The spec's fix** (unscaled carrying) | $80,000 | **−$30,000** — bond too low, a negative line prints |
>
> The spec's fix would replace an overstated bond with an understated one and
> print a negative "Unrestricted" figure. The correct change is to derive D-4's
> Restricted Amt and `schD4_restricted` from **Full Amount × Ward's %** on
> restricted lines — the same pattern D-1 already uses (`totals.js:29`). This is
> a change to a bond base, so under §5 it needs your named acceptance: **D7 —
> accepted 2026-09-21 (option 1).** Effect on a submitted number: the D-4
> Restricted Amt and Part IX's RESTRICTED and Unrestricted lines (and so the bond
> requirement) change for any filing with a partly-owned or carrying-≠-full
> restricted intangible; for a fully-owned line whose Carrying Value equals Full
> Amount they do not move.
>
> *Also:* the print computes each row locally (`pdf-model.js`) while its totals
> and the on-screen Summary come from `totals.js` — two calculators, the
> drift 64A's ground rule 3 warns about (MS 60A merged the Guardian pair).
> Recommend one shared row helper exported from `totals.js`.
>
> *Why no test caught it:* every existing e2e fixture sets `wardPct: 100`
> (`pdf-form-specific.spec.ts:224–230`), so the scaling is invisible, and no unit
> spec asserts `schD2/3/4_carrying` (`annual-accounting-totals.spec.js` has no
> reference). The acceptance fixture must use a partial ownership (§13).

### 10. P2 — Form content missing from the print

**10.1 Schedule F-1, when verified empty, prints no page.** F-1 marked "I verify
there are none" does not appear in the 16-page PDF, not even a first page. Form
PART I C9: *"The first page of each schedule of this Annual Accounting is to be
submitted, even if there are NO assets/liabilities listed on the schedule."*
Cause: F-1's section is gated on entry count alone; Part XI checks
`scheduleNoItems` and prints when `length > 0 || declaredNone`.
*Change (spec):* apply Part XI's `length > 0 || scheduleNoItems.<key>` gate to
F-1, audit every other `length > 0` gate, and print a verified-none statement
("No sales to report").
*Accept (spec):* with F-1 verified empty the page count grows by 1 and a
verified-none page prints; a second verified-empty schedule (e.g. E) also prints.

> **Master check — differs: the diagnosis is right, the remedy is tied to the
> wrong signal.**
>
> *Confirmed:* `pdf-model.js:887` gates F-1 on `d.schF1.length > 0`; the flag
> key is `schf1` (`index.js:1235`); `scheduleNoItems` is read only for Part XI
> (`pdf-model.js:1134`). The workbook's C9 text is verbatim as quoted.
>
> *The audit the spec asks for:* exactly **three** schedules are gated —
> **E** (`:856`), **F-1** (`:887`), **F-2** (`:921`) — all tagged "(Conditional)"
> since the 19E migration (`f2229d6`), with no recorded reason. Schedules A, B-1
> to B-4, C and D-1 to D-5 always print, showing a "No entries" row when empty
> (`:402`, `:435`, `:466`, `:653`, `:691`, `:731`, `:769` …), **regardless of the checkbox**.
>
> *Why the spec's remedy is the wrong shape:* (1) `AGENTS.md` §4 records that
> `scheduleNoItems` is **an affordance this app invented** — "the court's own
> Annual workbook contains no 'no items to report' declaration anywhere" — and
> that export "must never demand it"; the Clerk "accepts blank schedules".
> Making a court page appear only when the filer ticked an app-invented box
> leaves the filers the Clerk accepts (blank, unticked) *without* the first page
> that C9 requires. (2) A "No sales to report" sentence is app-invented wording
> on a court filing. (3) The Excel path already ships every schedule's first
> page (`unusedAnnualContinuationSheets()` removes only continuation pages,
> `excel.js:76–80`, and its comment at `:507`), so for the same filing the
> workbook has F-1's first page and the PDF does not.
>
> *Filer-observable effect:* under the spec's remedy, only filings that ticked
> the box gain a page. Under the form-faithful remedy every Annual/Final/Trust
> PDF without E, F-1 or F-2 rows — the common case — **gains up to three pages**.
> Existing fixtures with all three empty (`pdf-form-specific.spec.ts:509–511`,
> `pdf-table-semantics.spec.ts:54`) will change page counts and bookmarks. **D8 — decided 2026-09-21: option 1 (always print the first page).** With
D8 option 1 there is no new statement and no dependence on `scheduleNoItems`;
the pages use the existing "No entries" row form.

**10.2 Part VIII trust table omits "Date Trust Created" and "Type of Trust".**
Both are captured (`trusts[n].dateCreated`, `.trustType`) but never printed.
Form PART VIII B15 "Date Trust created:", B16 "Type of Trust:" — required per
trust. The row mapper and header list skip them.
*Change:* add both, in the form's order Name → Trustee → Account # → Date Created
→ Type of Trust → Ward's % → Amount; keep "After GID?" (an app addition), placed
after Type of Trust.
*Accept:* the printed "Trust Accounts Details" table has "Date Created"
(06/12/2009, 09/15/2024) and "Type of Trust" (Revocable Living, Special Needs).

> **Master check — confirmed.** `pdf-model.js:966–988`: the row array and the
> seven headers omit both fields. The workbook labels are verbatim (PART VIII
> B15, B16). **The Excel export already writes both** (`excel.js:447–448`, read
> back at `:800–801`), so today the PDF and the workbook disagree for the same
> trust. Layout: seven columns become nine;
> `tests/unit/pdf-model-column-integrity.spec.js` fails unless `colWidths` and
> `colAlign` match the headers and sum to 100, and the existing comment
> (`:982–984`) records that an earlier 10/10 split collided headers and wrapped a
> `$49,075.00`. **Measured (2026-09-21)** with the embedded Liberation Sans at the
> engine's table sizes — headers bold 8 pt with 6 pt of padding, body 8 pt
> regular with 10 pt, a token that cannot wrap (a date, an amount, an account
> number) must fit its column, worst-case tokens chosen deliberately:
>
> | Column | Driven by | Minimum width | % of 468 pt |
> | :-- | :-- | --: | --: |
> | # | body "1" | 14.4 pt | 3.1 |
> | Name of Trust | "Supplemental" | 58.9 | 12.6 |
> | Trustee | "Fiduciary" | 42.5 | 9.1 |
> | Account # | a 16-digit number | 81.2 | 17.4 |
> | Date Created | "06/12/2009" | 50.0 | 10.7 |
> | Type of Trust | "Testamentary" | 58.9 | 12.6 |
> | After GID? | header | 25.1 | 5.4 |
> | Ward's % | "33.33%" | 37.1 | 7.9 |
> | Ward's Amount | "$12,345,678.00" | 65.6 | 14.0 |
>
> The minimums sum to **92.8 %**, so nine columns fit with 7.2 % to spare. A
> workable set is `[4, 14, 10, 18, 11, 13, 6, 8, 16]` (sums to 100; every column
> at or above its minimum). To be confirmed in a generated PDF at
> implementation — the margins on Ward's % (8 vs 7.9) are thin. **Side finding:**
> today's 14 % Account # column is 65.5 pt, which cannot hold a 16-digit account
> number unbroken (81.2 pt needed), so the current table already overflows for
> long numbers; the new set fixes that incidentally.

### 11. Excel export: Part XI has no data rows

Print Preview's Clerk's Review Readiness panel reports Part XI remuneration
entries "would be left out of the Excel file"; only Save as PDF carries them.
The spec's diagnosis: a gap in the workbook, not the app — the PART XI sheet
(A1:G80) is a header block and the s. 744.367(3)(a) paragraph, with no data-row
grid.
*Change (spec, flagged as Alan's design call):* build a PART XI data table on
that sheet — numbered rows (Guardian Name / Type / Description / Amount), a
totals row in the other schedules' style, a "(continued)" page if needed, 7–11
rows — and wire the Remuneration export/import to it.
*Accept (spec):* a filing with 2+ Remuneration entries exports with all entries
on the new tab; the warning no longer fires at typical counts; re-import
round-trips them into `D.remuneration`.

> **Master check — the fact is confirmed; the app already made a deliberate,
> opposite decision.** Read from the bundled workbook: PART XI is `A1:G80` with
> 34 merged cells, header block and the statutory paragraph only, no data
> validation — as the spec says. But this is not an unnoticed gap: **Milestone
> 58D (`b1aafcf`) chose to stop the export instead.** `ANNUAL_EXCEL_CAPS.remuneration`
> is `cap: 0` with an `unsupported` message telling the filer to "File this
> accounting as PDF, where Part XI prints in full" (`excel.js:100–106`), and the
> writer's comment (`:487–505`) records why: an earlier version wrote entries to
> cells that are merged statute text or outside the print area, so a filer who
> filed the workbook filed Part XI *without* the declaration, unannounced;
> "Inventing a grid where the court published none is exactly what AGENTS.md
> section 5 forbids." The importer also skips Part XI deliberately (`:831`).
> The spec's change reverses that reasoning, so this is a decision, not a
> defect: **D9 — decided 2026-09-21: keep 58D.** Part XI stays PDF-only for
> Excel; the workbook, `ANNUAL_EXCEL_CAPS.remuneration` and the importer are
> untouched. **64B-3 is therefore not needed** unless this is reopened. One
> leftover to consider at implementation, not decided here: the readiness
> panel's wording (the spec quotes "2 entries would be left out") against the
> existing `unsupported` sentence in `excel.js:105–106`.

> **Wording found while checking D9 (a reviewer's open point).** The Excel-limit
> panel (`excelCapacityPanel()`, `legacy-app.js:6247–6266`) renders `${count} of
> ${cap}` and "${count − cap} entries would be left out of the Excel file", under
> a heading that says the court's form "has a fixed number of rows per schedule,
> and these have more entries than will fit". For Part XI (`cap: 0`) that reads
> "2 of 0 … 2 entries would be left out" — wrong for a sheet with **no grid**. The
> right sentence exists (`ANNUAL_EXCEL_CAPS.remuneration.unsupported`, and
> `excel-capacity.js` uses it in the issue message) but the panel row ignores
> `o.unsupported`. **D13 (decided 2026-09-21): fix it in 64B-2** — the row shows
> the `unsupported` sentence and drops the "N of 0" count when it is present.
> No test covers this panel today (`excel-cap-panel` appears in no spec).

### 12. Confirmed matching the form (spec's own list — no change)

Part X recipients 3 and 4 have the same fields as 1 and 2; "Date of Most Recent
Receipt" works once "Restricted depository?" is answered; Parts I–VII,
Schedules A, B-1 to B-4, C, D-1, D-5, E, F-2 and Part IX's bond math reconcile
to the cent ($412,850.00 → $389,093.30); the Excel carrying value for D-2/D-3/D-4
is unscaled. *This review adds:* the D-2/D-3/D-4 column formulas and the Part
VI/VII and Part IX links are as quoted above; Part IX's bond math
reconciling "exactly" was tested on a filing whose restricted intangible was
100% owned (per the spec, so unmoved by the bug); **that would not have exposed
the D-4 restricted basis if Carrying Value equalled Full Amount on that line**
(9.1).

### 13. Test fixture and acceptance run

The extension's ward is not in the repo. The acceptance fixture becomes
`FULL_ANNUAL_ACCOUNTING` in `tests/e2e/support/fixtures.ts` (also usable as a
unit fixture), with: D-2 and D-3 each with one line at **Ward's % = 50** and a
Carrying Value distinct from Full Value/Amount; **a D-4 line with Ward's % < 100,
Carrying ≠ Full and Restricted = Yes** (the case 9.1's bond line needs); F-1 and
at least one more schedule (E) verified empty and unticked variants of each
(D8); two trusts with distinct Date Created and Type of Trust; two Part XI
remuneration entries (D9).

Verify on the print: 9.1 unscaled Carrying Value on every D-2/D-3/D-4 row and
totals row, D-4 Restricted Amt = Full × % (D7), Part IX's RESTRICTED and
Unrestricted lines against the workbook's `K55`/`J55`; 10.1 first pages of E,
F-1, F-2 per D8; 10.2 the two new columns. On export: 11 per D9. On screen: the
Part VII Summary's Carrying column equals the print's.

### 14. Out of scope / for Alan to decide

Rows for a new Excel Part XI tab (only if D9 chooses one). The top-level "#1.
Does the Ward have one or more Trusts?" is read for print from
`trusts[0].hasTrust` (`pdf-model.js:962`) and validated on `trusts.0.hasTrust`
(`index.js:1693`): confirmed, consistent, and it round-trips; only worth
knowing if Trust 1 is ever deleted while 2 and 3 remain.

### Decisions (64B)

Numbered from D7 to continue 64A's D1–D6. Each is put to you as a choice;
recommended first.

- **D7 — D-4 Restricted Amt and the bond line (9.1). DECIDED 2026-09-21: option 1, with your named acceptance under `AGENTS.md` §5 of the resulting bond-base change** (Full Amount × Ward's % on restricted D-4 lines, as the workbook's `K = IF(F="Yes", G*H, 0)`; recorded here as required by §5). 1. Full Amount × Ward's
  % on restricted lines, as the workbook's `K = IF(F="Yes", G*H, 0)`
  (recommended). 2. The spec's unscaled Carrying Value (diverges from the
  workbook; can print a negative "Unrestricted"). 3. Leave `carrying × %`
  (knowingly diverges from the workbook).
- **D8 — Empty schedule pages (10.1). DECIDED 2026-09-21: option 1.** 1. Always print the first page of E,
  F-1 and F-2, in the "No entries" form D-1 to D-5 use — per the form's C9, no
  invented wording, independent of the checkbox (recommended). 2. The spec's:
  print only when populated or ticked, with a "No sales to report" statement.
  3. Leave as is.
- **D9 — Part XI in Excel (11). DECIDED 2026-09-21: option 1 — keep 58D.** 1. Keep 58D: Excel blocked with the existing
  message, PDF carries Part XI (recommended — the spec's own change reverses 58D
  and §5's rule against inventing a grid). 2. Add a clearly labelled
  app-supplied supplementary sheet and leave the court's PART XI untouched.
  3. Build the grid into the court's PART XI sheet, as the spec proposes.
- **D10 — Delivery. DECIDED 2026-09-21: option 1 (three parts).** 1. Three parts (recommended): **64B-1** carrying value and
  the D-4 restricted basis, with the shared row helper and partial-ownership
  fixture (small, unit-testable, the only item that changes a submitted number);
  **64B-2** the print content (10.1, 10.2); **64B-3** Excel Part XI, only if D9
  ≠ 1. 2. Two parts. 3. One delivery.
- **D11 — Filings already exported (9.1). DECIDED 2026-09-21: option 1 (release note only).** A PDF exported before this fix
  carries scaled Carrying Values and, for a partly-owned restricted intangible,
  a different bond figure; the app cannot know which were filed. 1. Release
  note only (recommended). 2. Release note plus a one-time notice on any
  filing with a D-2/D-3/D-4 line where Ward's % < 100 and Carrying Value is
  entered (new detection and UI work). 3. Neither.

- **D12 (64A, item 2.7) — revision stamp. DECIDED 2026-09-21: leave it off**
  (options were: once at the foot of Summary I, as the workbook has it —
  recommended; every page footer, the spec's; leave off). The recommended option
  was not taken; recorded as your decision.
- **D13 — Part XI panel wording. DECIDED 2026-09-21: option 1 — fix in 64B-2.**
- **D14 — render baseline (64A-3). DECIDED 2026-09-21: prerequisite to 64A-3
  only.** Before the engine's layout is touched, render the post-64A-2 full
  fixture, inspect the pages the spec names (the A-2 heading at a page foot, the
  Part IV attorney split, the near-empty page 3, the "Restricted?" header wrap),
  and record what was seen here. If they do not reproduce, 64A-3 shrinks to match.
  Content items are proven by PDF text extraction, not by eye.

  **BASELINE MEASURED 2026-09-22, after 64A-2 landed.** Rendered the full
  fixture (every one of the eleven schedules populated, not the
  all-verified-empty minimal one) through `generateVerifiedInventoryPdf()` and
  read back every text run's page and x/y with `extractPdfTextRuns()`. The
  document is **7 pages**. Two of the spec's four claims do not reproduce, one
  reproduces with different instances, and one is worse than described. A first
  pass of this measurement was itself wrong and was redone: it sorted runs by y
  and took the lowest as "the end of the page", which is the running footer, so
  every page looked like it ended mid-caption. The numbers below exclude the
  caption and footer bands.

  | Spec claim | Measured |
  | :-- | :-- |
  | "Schedule A-2" orphaned at the foot of page 1 | **Does not reproduce.** A-2 sits mid-page at p2 y=549/480. But orphaned headings are real, with two *different* instances: **"Part III — ASSETS OF THE WARD"** is the entire lowest content of p1 (y=119) while Schedule A-1 starts p2 — it is a heading-only section (`blocks: []`), so it strands by nature; and **"Schedule C-5: Joint Owners of Ward's Assets"** is the lowest content of p3 (y=120) with its table on p4. |
  | Part IV attorney heading + statement on one page, signature block on the next | **Does not reproduce.** "GUARDIAN ATTORNEY SIGNATURE" (p6 y=642), both attorney statements (p6 y=591, y=535) and the attorney signature block (p6 y=474) are all on page 6 together. Part IV as a *section* spans p5→p6, but no signature block is split from its own statements. |
  | Page 3 mostly blank | **Does not reproduce.** p3 is the second-densest page (129 content runs vs p2's 136). The light page is **p4 — 27 runs, lowest content at y=572**, so roughly three-quarters of its content area is empty. Cause is visible and deliberate: p4 carries only Schedule C-5's tail, because Part III sets `pageBreakBefore: true`. Not an orphan-control problem. |
  | B-1 header wraps as "Restrict ed?" | **Confirmed, and in two schedules, not one.** Schedule B-1 (p2 y=438.5): `x216="Restrict"` with `x224="ed?"` on the line below — a mid-word break. Schedule B-3 (p2 y=219.0): `x296="Restrict"` / `x304="ed?"`, the same break, which the spec did not name. Neighbouring headers that wrap at word boundaries ("Restricted Asset Amount" → "Restricted" / "Asset Amount"; "Restricted (not bonded)") are fine and are not this defect. |

  **So 64A-3 shrinks to two items of very different cost**, and they should not
  be bundled:
  1. The mid-word `Restrict|ed?` break in the B-1 and B-3 column headers. A
     column-width or header-text change in `pdf-model.js` — no engine change,
     small and self-contained.
  2. Orphan control for the two real instances. Per item 5's master check the
     engine has only `pageBreakBefore` per section and no keep-with-next, so
     the class fix is an **engine feature** reaching all seven filing types'
     PDFs and their layout specs (D4 already scoped it separately).

     **DECIDED 2026-09-22: targeted fix, no engine change.** Set
     `pageBreakBefore` on the `assets` section (the heading-only "Part III —
     ASSETS OF THE WARD" divider). Measured after: the divider heads page 2
     with Schedule A-1 beneath it, **and the C-5 orphan clears as a side
     effect of the reflow** — C-5 lands mid-page 4 with its own table under
     it, the document stays 7 pages, and the single sparse page becomes *less*
     sparse (40 content runs against 27 before any fix).

     Forcing a break on C-5 as well was tried and measured **worse** — 8
     pages, and two sparse pages (17 and 26 runs) instead of one — so it was
     dropped. One line is the whole fix.

     **What this does not do:** C-5 is un-stranded by where the content
     happens to fall on this fixture, not by a rule. A filing with a
     different data shape can strand C-5 or another heading again. Only
     keep-with-next fixes the class, and that remains unbuilt and unauthorized.

     **SUPERSEDED 2026-09-22 by D4, built.** Keep-with-next now exists in the
     shared engine (`src/core/pdf/pdf-engine.js`), and the forced break above
     is retired -- the engine keeps both headings by rule.

- **D4 built 2026-09-22 -- engine keep-with-next, section headings, all seven
  filing types.** Decisions, in order: reach **automatic for every filing type**
  (not opt-in); then, once the cost was measured, **section headings only**, not
  table/grid/checklist sub-headings.

  A section heading reserves its own 30pt plus the one-line minimum of its first
  block (table 38, grid/checklist/signature-block/supporting-docs 20, notice 14);
  a heading-only section reserves the next section's heading and first unit.

  | Measured | Before | After |
  | :-- | --: | --: |
  | Guardian (standard fixture) pages | 6 | 6 |
  | Guardian (all 11 schedules) pages | 7 | 7 |
  | Annual / Plan Annual / Plan Minor / Plan Initial / Plan Simplified pages | 13 / 14 / 6 / 10 / 3 | 13 / 14 / 6 / 10 / 3 |
  | Guardian section headings stranded (full fixture) | 2 | 0 |

  **Page count changed for no filing type.** Final and Trust Accounting render
  through the Annual model and are covered by it.

  **Not done, by decision:** sub-heading keep-with-next. It would also fix one
  real orphan -- Guardian's "Surety Bond Requirement (calculated)" table title
  at a page foot -- but the reflow adds a page to every Verified Initial
  Inventory, even at the smallest reservation that fixes it (tried at 38pt and
  24pt: 6 -> 7 and 7 -> 8 pages either way). That orphan remains, recorded here.
  A first, more generous set of section reservations also cost a page and left
  a 5-run page; the one-line minimums above replaced it.

  The temporary spec that produced this (`tests/e2e/zz-d14-render-baseline.spec.ts`)
  is deleted in the same commit; the figures above are the record.
- **D15 — workbook identity. DECIDED 2026-09-21: accept the content match.**
- **D16 — Waived bond and D-4's required fields. DECIDED 2026-09-21: when the bond is waived, Bond Amount, Bond Period From, Bond Period To and Bonding Company are all not required; built inside 64A-1.**
  Raised by the review of this milestone: `validateGuardian()` requires all four
  even after the filer answers that the court waived the bond (`index.js:1289`,
  was `:1282` before MS 63 — see the staleness note under Authorization record),
  so a guardian with a waiver order cannot file without inventing a surety and
  dates. **Not authorized** until 64A-1 is (§3). Conditions: the readiness item
  and the validator error change together (§4 readiness invariant); a blank
  stays `''`, never 0; an unanswered waiver question keeps the four required
  (tri-state, §4); un-waiving restores the requirement without deleting entered
  values; the PDF Bond lines (`pdf-model.js:644–645`) must print sensibly with a
  waiver and no bond details (what prints is a 64A-2 decision, not yet made);
  add to 64A-1's fixture audit.

### Milestone checklist (`AGENTS.md` §8)

1. **Data model** — none new: `trusts[].dateCreated/trustType` and the schedule
   fields already exist (CSV rows 157–158, 633–643). `verify:data-model` unchanged.
2. **Legacy data migration** — none; nothing stored changes. **A saved filing's
   printed numbers change on re-print** (9.1) — see D11.
3. **Fixture & factory audit** — `MINIMAL_VALID_ANNUAL` and the e2e fixtures at
   `pdf-form-specific.spec.ts:224–230` use `wardPct: 100`, which is why 9.1 was
   invisible; add the partial-ownership fixture (§13) without changing the
   existing ones. 10.1 (D8) changes expected page counts wherever E, F-1 and
   F-2 are all empty.
4. **Test coverage & index** — below.
5. **Export / import / portability** — Excel already correct for carrying and
   trust fields; PDF and totals now match it. Formula cells are never written
   (`excel.js` writes `C/F/G/H/I` on D-4, not `J/K`) — unchanged. D9 decides Part
   XI. Conversions between Annual, Final and Trust are unaffected (same fields).
6. **Security & sensitivity** — none.
7. **UI/UX consistency** — the on-screen Part VII Summary changes with `totals.js`;
   labels unchanged.
8. **Legal / compliance** — §5: carrying totals move to match the Clerk's
   workbook; the D-4 restricted/bond basis needs your named acceptance (D7); no
   app-invented wording is added to a court page under D8 option 1.
9. **Cross-form consistency** — Annual, Final and Trust share the engine; Guardian
   Inventory and Simplified have no D-2/D-3/D-4 carrying columns (checked); the
   Guardian's bond calculation is separate (64A).

### Test plan

Red-first (`AGENTS.md` §7); `TEST-INDEX.md` rows in each commit.

- **Unit, `annual-accounting-totals.spec.js`** (no carrying assertion today): with
  D-2/D-3/D-4 lines at 50%, `schD2_carrying`, `schD3_carrying`, `schD4_carrying`
  equal the unscaled sums; `schD4_restricted` equals Σ Full × % over restricted
  lines (D7); `bondReq` follows. Red today.
- **Unit, `annual-accounting-pdf-model.spec.js`**: D-2/D-3/D-4 printed Carrying
  cells unscaled; D-4 Restricted Amt per D7; the row helper and `totals.js`
  agree; E/F-1/F-2 first pages per D8; the trust table's nine columns and their
  values. Red today (the trust columns and gates do not exist).
- **Unit, `pdf-model-column-integrity.spec.js`**: passes with the nine-column
  trust table (widths sum to 100).
- **e2e, `annual-schedule-consistency.spec.ts`** (screen vs print): add the
  partial-ownership case — the Part VII Carrying column equals the print's.
- **e2e, `pdf-form-specific.spec.ts` / `pdf-table-semantics.spec.ts`**: the §13
  acceptance run against `FULL_ANNUAL_ACCOUNTING`; page-count and bookmark
  expectations updated for D8.
- **Excel**: no new test unless D9 ≠ 1; then read the exported file, never
  re-import it (`AGENTS.md` §5).
- **e2e cost**: seconds each; the full source suite is ~26 min at baseline.

### Files expected to change

`src/features/annual-accounting/totals.js` (reducers; shared row helper),
`pdf-model.js` (D-2/D-3/D-4 rows, E/F-1/F-2 gates, trust table),
`excel.js` only if D9 ≠ 1 (and the bundled `templates/annual-template.js` only
under D9 option 3); the unit and e2e specs named above;
`tests/e2e/support/fixtures.ts`; `TEST-INDEX.md`; a release-note line per D11.

### Verification of this write-up

Checked on `master` (2026-09-21, at `fbefc3e`): every source location cited;
the carrying reducers and row builders; Part IX's print lines; the three
conditional gates and the always-printing schedules; the trust table and its
column-integrity guard; the Excel caps, the 58D comment block and the
continuation-sheet pruning; which fixtures use `wardPct: 100`; and — by decoding
`templates/annual-template.js` — the workbook's "Revision 11/17/2022" and
Sixth Circuit heading, PART I C9, the D-2/D-3/D-4 column formulas and page
totals, Part VI/VII and Part IX's cross-sheet links, PART VIII B14–B17, and
PART XI's extent (A1:G80, 34 merged cells, no validation). **Added 2026-09-21:**
Part IX traced through `H17`; the Part VI/VII addresses re-read with an
address-safe parser; the trust-table column minimums measured; the panel wording
read. **Workbook identity (D15, decided: accept by content).** The bundled Annual
workbook is "Revision 11/17/2022", 90 sheets, created 2015-09-04, last modified
2022-12-27; every fact the spec quotes from its file matches it (PART I C9
verbatim, D-2 C14, the D-2 formulas and page total, PART VIII B15/B16, PART XI's
extent). That is agreement by content, **not proof of the same file**; the bundled
workbook is authoritative under §5 in any case. Not checked: a generated PDF from
the corrected code; the spec's rendered-PDF observations (64A-3's prerequisite,
D14); §12's "confirmed" list, which is the spec's own review.

---

## Authorization record and execution order (Milestone 64)

**Line-number staleness (2026-09-22).** MS 63 landed after this proposal's line
references were checked (`git pull` to `69caf61`). It added the UCN field and a
`preparer-note.js` refactor to `guardian-inventory/index.js` (+37/−) and one line
each to `guardian-inventory/pdf-model.js` and `annual-accounting/pdf-model.js`
— exactly the files most of this proposal's citations point into. A diff of
`6b0384c..69caf61` confirms the cited content is unchanged (only shifted down
~6-7 lines by the new UCN row and imports); the `bondAmount` validator line
noted above moved `:1282`→`:1289` as the one example checked directly. Every
other `index.js`/`pdf-model.js` line citation in this document should be
treated as approximate and re-confirmed against current master before it is
used to edit code, per AGENTS.md's "a path printed by a resolver is a
prediction, not proof" rule (§1) applied to line numbers.

**Nothing in Milestone 64 is authorized** (`AGENTS.md` §3). On 2026-09-21 you
answered "None yet" to authorizing any delivery, and set MS 63 as the next work.
D7's bond-base acceptance is recorded but is not a delivery authorization.

| Delivery | Authorized? | Notes |
| :-- | :-- | :-- |
| 64A-1 — bond amount (numeric; blank stays blank; Excel import numeric), waived-bond validation (D16), Summary B-2 row, C-3 and B-4 validation | not yet | small, independent |
| 64B-1 — carrying totals and the D-4 restricted basis (D7), shared row helper, partial-ownership fixture | not yet | the only item that changes a submitted number |
| 64A-2 — Verified Initial Inventory print rewrite, new fields, fixture | not yet | |
| 64B-2 — E/F-1/F-2 first pages (D8), trust columns, Part XI panel wording (D13) | not yet | |
| 64A-3 — layout / orphans | done 2026-09-22 | B-1/B-3 `Restricted?` header widened; orphan control built into the engine as D4 (section headings, all seven types, no page-count change); table sub-heading keep-with-next declined on its measured page cost |
| ~~64B-3~~ — Excel Part XI | dropped | D9 keeps 58D |

**Recommended order:** 64A-1 → 64B-1 → 64A-2 and 64B-2 (not in parallel) → 64A-3
last, once every content change has settled. **Against MS 63:** 63E is
authorized (2026-09-21) and MS 64 is not, so **63E lands first**; 64A-2 / 64B-2
then build their expected-string baselines on 63E's UCN headers.
64A-1 (guardian files) and 64B-1 (annual `totals.js` and its callers) appear to
share no files and can be reviewed in either order — confirm with a file-list
check when authorized (§2).

**Open before you authorize** — nothing that can be checked without
implementing. What remains is the authorization itself and three stated
boundaries: the Annual workbook is accepted by content, not file identity (D15);
the spec's rendered-PDF observations are unverified until 64A-3's prerequisite
(D14 -- measured 2026-09-22, recorded under D14); and the generated PDFs do not exist until the print work is built.
Working tree: commit only `MILESTONE-64-PROPOSAL.md` (and any other file a step
names); the zip, `WCAG_2.1_AA_regex-structural.md`, `help.md` and the PDF
deletion are not part of this work.
