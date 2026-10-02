# Milestone 72 Proposal — What Milestone 71 found and left unfixed

## Status

**Draft, 2026-10-01; items 72G–72J added 2026-10-02. It authorizes no
change.** Every decision below was settled by the requester on 2026-10-01 or
2026-10-02. Building any item still needs the requester's named approval of
that item (AGENTS.md §3).

The requester is a representative of the Clerk of the Circuit Court, Pinellas
County. Where an answer below is about what the Clerk's office accepts, it is
recorded as **Pinellas Clerk practice**, not as a reading of a statute or rule
(AGENTS.md §4 and §5). Practice is county-specific.

| # | Item | What a filer sees today | Decision | Build |
| --- | --- | --- | --- | --- |
| 1 | 72A | The Inventory's Excel Part III prints each guardian's date, SSN/EIN, street, phone and city **over the form's printed captions**, and leaves the boxes beneath them empty | **DECIDED.** Put each value in its box. Keep writing Guardian #1's name, and warn when it is not among the Cover's Guardian Name(s). Add a check of every export against the Clerk's templates, on all three forms | Not started |
| 2 | 72B | A blank share on ten Inventory schedules silently counts as 0%. The attorney's primary email is marked required but never checked | **DECIDED.** Require a share on every started row (0 allowed). Require the attorney's email once an attorney is entered | Not started |
| 3 | 72C | The Inventory has no guardian email. The Annual marks it required but never checks it. The Simplified blocks without it | **DECIDED.** Add it to the Inventory. On all three forms, a missing guardian email **warns, never blocks**, and only when no attorney is entered | Not started |
| 4 | 72D | With no attorney, the filed PDF prints an app-written sentence that no Clerk form has | **DECIDED.** Match the Clerk's forms: print the attorney block blank, as they do | Not started |
| 5 | 72E | On a phone, Schedule C's loss and Schedule E's transfer-out boxes offer a keypad with no minus key | No decision needed (a defect) | Not started |
| 6 | 72F | The nine-form summary-page browser test runs out of time on the D: drive | **DECIDED.** Split it into nine tests, one per form | Not started |
| 7 | 72G | No certificate of service says **how** the copies were served (Rule 2.516(f)(5)), on any of the seven forms that have one | **DECIDED.** Ask once per certificate; print it on the PDF; a missing method warns, never blocks. All seven certificates | Not started |
| 8 | 72H | The Inventory's and the Simplified's certificates re-type the attorney's details, so one PDF can show two Bar Numbers for one attorney | **DECIDED.** The certificate's attorney is the filing's attorney, as on the Annual and the Clerk's forms | Not started |
| 9 | 72I | Choosing "Guardian Advocate" as the Type of Guardianship shows no hint at the reason question until the filer leaves the page and returns | No decision needed (a defect) | Not started |
| 10 | 72J | The missing-recipients issue reads "No recipients are required for this certificate (filer attestation …)", the checkbox's caption, not a question | No decision needed (reuse the Plans' wording) | Not started |
| — | — | The sidebar's NET ASSETS stays at $0.00 for a negative Starting Balance (browser review, H2) | **Not reproduced; dropped** (see "Reported, not reproduced") | — |

### Provenance

- Milestone 71's build and its full regression listed these as "found, not
  fixed" (`MILESTONE-71-PROPOSAL.md`: 71B, 71C and 71E Build records, and
  "Full regression — run 2026-09-29").
- The research for this plan, 2026-09-30 to 10-01:
  - The Clerk's three workbooks were read with a parser.
  - Real Excel exports from the running app were read with ExcelJS and
    compared with the templates, using a throwaway browser probe that has
    since been deleted.
  - The Clerk's work slips were read with a parser.
  - The original Plan forms were read from their extracted text.
  - The July 2026 Florida Rules of General Practice and Judicial
    Administration were read from `reference/legal/statutes/`.
- **72G–72J** come from the requester's browser-only review of Milestone 71
  on the test system, reported 2026-10-02 (findings H1, M3, M1 and M2; H2 is
  under "Reported, not reproduced"). Each finding was checked against the
  code, the Clerk's workbooks and the rule text before being written up here,
  and where the review's account differed from what was found, the
  difference is stated in that item.

### Decisions already made (2026-10-01, the requester)

| Question | Answer |
| --- | --- |
| Inventory Part III, Guardian #1's name box | Keep writing the first guardian card's name over the form's link to the Cover; warn when that name is not among the Cover's Guardian Name(s). This is the 2026-09-19 Annual decision, applied to the Inventory |
| An export check against the templates | On all three forms, with every schedule filled |
| A blank share on Inventory A-2 to C-5 | Required on a started row, as on the Annual's Schedule D. 0 is allowed. A-1 keeps "must be > 0" |
| The Inventory attorney's primary email | Required once an attorney is entered, as on the Annual and Simplified |
| The guardian's email (Rule 2.515(c)) | Add it to the Inventory. A missing one warns, never blocks, and only when no attorney is entered. The same rule applies on the Annual family and the Simplified, so the Simplified's existing block becomes a warning. Recorded as Clerk practice |
| The no-attorney sentence on the PDF | Remove it. The PDF leaves the attorney block blank, as every Clerk form does. This supersedes 71B design step 6 and its open wording question. It also supersedes an earlier 2026-10-01 answer to reword one sentence: with no sentence printed, nothing remains to reword |
| The slow summary test | Split per form |
| Method of service on a certificate (2026-10-02) | Add it, once per certificate, on all seven certificates (the three accountings and the four Plans). PDF only. A missing method warns, never blocks. Recorded as Clerk practice |
| The certificate's attorney (2026-10-02) | The filing's attorney, as on the Annual and the Clerk's forms. The Inventory's and the Simplified's re-typed certificate attorney details are no longer printed |
| The sidebar's NET ASSETS finding (2026-10-02) | Not reproduced; dropped, with no test added |

---

## Build order and file overlap

Sequential, because the items share files:

| Item | Files |
| --- | --- |
| 72A | `src/features/guardian-inventory/excel.js`, `src/core/filing/form-derived-fields.js`, new `tests/e2e/support/workbook-vs-template.ts`, new `tests/e2e/excel-template-integrity.spec.ts`, `tests/e2e/carry-balance-matches-prior.spec.ts` |
| 72B | `src/features/guardian-inventory/index.js` (validator), `probate-guardian-data-model.csv` |
| 72C | `src/features/guardian-inventory/index.js` (D-1), `src/core/filing/models/guardian.js`, `src/features/guardian-inventory/pdf-model.js`, `src/core/filing/unrepresented-filing.js`, `src/features/simplified-accounting/index.js`, `src/features/annual-accounting/index.js`, `src/core/status/completion.js`, CSV |
| 72D | `src/core/filing/unrepresented-filing.js`, the three `pdf-model.js` files |
| 72E | `src/features/annual-accounting/index.js` |
| 72F | `tests/e2e/routes.spec.ts` |
| 72G | the three accountings' `index.js` and `pdf-model.js`, `src/core/filing/plan-certificate-of-service.js`, a new `src/core/filing/service-method.js`, `src/core/filing/output-preflight.js`, the models, CSV |
| 72H | `src/features/guardian-inventory/index.js` (D-5), `pdf-model.js` and `excel.js`; `src/features/simplified-accounting/index.js` (Part VI) and `pdf-model.js`; CSV |
| 72I | `src/core/filing/unrepresented-filing.js`, the Inventory's and the Annual's Cover wiring |
| 72J | the three accountings' validators |

- 72B and 72C both edit the Inventory's `index.js`.
- 72C and 72D both edit `unrepresented-filing.js` and the Inventory PDF
  model.
- 72C and 72E both edit the Annual's `index.js`.
- 72G and 72H both edit every accounting's certificate page and PDF; build
  72H first, so the method is added to the certificate's final shape.
- 72F touches no source and can run at any point.
- **Order:** 72A, 72B, 72C, 72D, 72H, 72G, 72I, 72J, then 72E and 72F.

---

## 72A — Inventory Part III, and a check of every export against the Clerk's templates

### What a filer observes

An Inventory saved as Excel and filed has, on Part III, for each of up to three
guardians:

- the date signed where the form prints **"Date"**;
- the SSN/EIN where it prints **"Guardian #1's SSN / EIN"**;
- the street address over **"Guardian #1's Street Address"**;
- the phone number over **"Guardian #1's Phone Number"**;
- the city/state/zip over **"Guardian #1's City / State / Zip Code"**.

The boxes under those captions stay empty. A reviewer reading the filed
workbook sees values where labels should be, and blank boxes. Fifteen
captions are overwritten (five per guardian).

The name is the one field that lands in its box. It replaces the form's own
link there, `='SUMMARY I '!D23` (the Cover's Guardian Name(s)).

### Evidence

**The template** (`templates/guardian-template.js`, `PART III`, read with
`xml.etree`). Each block puts captions on one row and the box on the row
beneath:

| Field | Caption cell (guardian 1 / 2 / 3) | Box (guardian 1 / 2 / 3) |
| --- | --- | --- |
| Date signed | D7 / D13 / D19 ("Date") | D8 / D14 / D20 (merged D:E, empty) |
| Name | F7 / F13 / F19 | F8 (`='SUMMARY I '!D23`) / F14 / F20 (empty) |
| SSN / EIN | B9 / B15 / B21 | B10 / B16 / B22 (merged B:C, empty) |
| Street address | F9 / F15 / F21 | F10 / F16 / F22 (merged F:H, empty) |
| Phone | B11 / B17 / B23 | B12 / B18 / B24 (merged B:C, empty) |
| City / State / Zip | F11 / F17 / F23 | F12 / F18 / F24 (merged F:H, empty) |

**The exporter** (`guardian-inventory/excel.js`, the `PART III` loop,
`b = 7 + i*6`) writes `D${b}`, `F${b+1}`, `B${b+2}`, `F${b+2}`, `B${b+4}` and
`F${b+4}`. Every field except the name lands on a caption row.

**A real export, read with ExcelJS.** Three guardians were filled in and the
workbook saved. The captions had been replaced: `'PART III'!B9` read
`"SSN-1"`, not `"Guardian #1's SSN / EIN"`, and so on for all 15 caption
cells. B10, F10, B12 and F12 were empty. F8 held the literal name.

**Why nothing caught it:**
- The importer (the `guardians:` reader, `excel.js` near line 679) reads the
  same caption cells, so an export-then-import round trip agrees perfectly
  with the broken export. This is AGENTS.md §10 P1.
- `tests/unit/excel-write-targets.spec.js` checks only write addresses
  typed literally in the code. This loop builds its addresses at run time
  (`` `F${b+2}` ``), so the check skips it. About 140 write addresses
  across the three exporters are built at run time.

**Nothing else has this problem, as far as checked.** The same probe filled
one row of every schedule on all three forms, with Part VIII trusts, four
Simplified certificate recipients and a remuneration line. It found no
other value written over a caption or a formula. The only other changes:
- the dropdown defaults the app is meant to replace (cells with data
  validation);
- the Annual's `'PART II, III'!F25`, allowed with a warning by the
  2026-09-19 decision.

Later rows and later pages were not probed. The check below covers them.

### Authority

- The Clerk's workbook is authoritative for where each value goes
  (AGENTS.md §5).
- Milestone 64A-2 fixed the same defect on the Inventory's `PART IV`.
- The 2026-09-19 decision for the Annual's Guardian #1 name is recorded in
  `tests/unit/excel-write-targets.spec.js` and
  `src/core/filing/form-derived-fields.js`. It applies here by the
  requester's 2026-10-01 answer.

### Design

1. **The exporter writes each value into its box.** Date `D${b+1}`, name
   `F${b+1}` (unchanged), SSN/EIN `B${b+3}`, street `F${b+3}`, phone
   `B${b+5}`, city/state/zip `F${b+5}`.
2. **The importer reads the boxes.** It also reads Excel files the app
   exported before this fix: when a box is empty and its caption cell holds
   anything other than the template's own caption, it reads the caption
   cell. Under AGENTS.md §8 item 2, a cheap migration is written.
3. **Guardian #1's name box, with a warning.** The exporter keeps writing
   `guardians[0].name` to F8.

   `form-derived-fields.js` adds an Inventory rule beside the Annual's. When
   both are filled and Guardian #1's name is not among the Cover's Guardian
   Name(s), Preview & Export shows a warning that never blocks:
   *"D-1 — Guardian #1 (NAME) is not among the Guardian Name(s) on the
   Cover (NAMES). The court's form fills Guardian #1's name from the Cover;
   this filing will be exported with Guardian #1's name as entered. Confirm
   which is right before filing."*

   "Among" means the Cover's text, split at commas, semicolons, "&", "/" and
   the word "and", contains the name, ignoring case and extra spaces. A
   Cover listing two co-guardians therefore does not warn. The file's header
   comment ("Annual family only") is updated.
4. **The export check.** A new browser spec,
   `tests/e2e/excel-template-integrity.spec.ts`, and its helper
   `tests/e2e/support/workbook-vs-template.ts`.
   - It builds a filing of each type: the Inventory, the Annual and the
     Simplified. Every schedule is filled through its first page and one row
     onto the next. Every field is filled, including three guardians, Part
     VIII trusts, four certificate recipients and remuneration lines.
   - It saves each as Excel and loads the exported file and the Clerk's
     template with ExcelJS.
   - On every sheet the export keeps, it fails on any template caption whose
     text changed and any template formula that is no longer a formula. Each
     failure names the cell.
   - Allowed:
     - cells carrying data validation (the dropdown defaults);
     - an exact list of decided overwrites: Annual `'PART II, III'!F25`
       (2026-09-19) and Inventory `'PART III'!F8` (2026-10-01).
   - A formula that blank-page pruning rewrote is not counted. Pruning
     drops removed pages from page totals by design, and its own specs cover
     it.

   It also asserts that Part III's 18 values sit in their boxes. Finally, a
   workbook built the old way (values moved back onto the captions with
   ExcelJS) is imported through the real Import from Excel control, and the
   guardian details must arrive.
5. `carry-balance-matches-prior.spec.ts` keeps its own formula check but
   takes the decided list from the new helper. Its comment calling F8 "not
   decided" is corrected.
6. `excel-write-targets.spec.js`'s header names its blind spot (addresses
   built at run time) and points to the new spec.

### Cross-cutting checklist (AGENTS.md §8)

1. **Data model.** No new or changed field. Excel cell addresses live in the
   exporter, not the CSV.
2. **Legacy data.** Inventory workbooks exported before 72A import correctly
   through step 2's fallback. Nothing stored in a `.sav` changes.
3. **Fixtures.** None changed. The new spec builds its own filings.
4. **Tests.**
   - New: `tests/e2e/excel-template-integrity.spec.ts` and
     `tests/e2e/support/workbook-vs-template.ts`.
   - Extended: `tests/unit/form-derived-fields.spec.js`, for the Inventory
     rule, including the co-guardian Cover that must not warn.
   - Changed: `carry-balance-matches-prior.spec.ts` and the header of
     `excel-write-targets.spec.js`.
   - **Red-first:** the new spec, run against today's exporter, must fail
     with the 15 Part III captions named.
   - `TEST-INDEX.md` rows and `file_index.md` rows, the 70T progress list
     and the assertion-count baseline, all in the same commit.
   - `npm run check:types`, because a `tests/e2e/support/*.ts` file is
     added.
5. **Export/import.** The Inventory exporter and importer both change. The
   PDF does not.
6. **Security.** The SSN/EIN moves from a caption cell to its box in the
   same file. No exposure changes, and nothing is newly stored.
7. **UI/UX.** The warning uses the existing Preview & Export advisory
   channel (`output-preflight.js`), as the Annual's does.
8. **Legal framing.** None. This is placement on the Clerk's own form.
9. **Cross-form.** The Annual's and the Simplified's guardian blocks were
   probed: neither overwrites a caption. The Annual's F25 is the decided
   precedent for the name.

### Build record — NOT STARTED

---

## 72B — Inventory: a blank share, and the attorney's email

### What a filer observes

- **Shares.** On Inventory schedules A-2, B-1 to B-4 and C-1 to C-4
  (Ward's %), and C-5 (Joint Owner's %), the box is marked required, but a
  blank passes Preview & Export. A blank counts as 0%, so that asset's ward
  amount is $0. It silently drops out of the ward's totals, the bond and the
  audit-fee base. Only A-1 is checked ("Ward's % must be > 0").
- **Attorney's email.** On D-2, "Primary Email (e-filing)" is marked
  required, but an Inventory with an attorney is exported without one. The
  Annual and Simplified require it once an attorney is entered.

### Evidence

- `validateGuardian()` (`guardian-inventory/index.js`, near lines 1375–1411).
  - A-1: `if(e.wardPercent<=0)` reports "must be > 0". A blank coerces to 0
    and is caught.
  - The other ten shares go only through Milestone 71C's range check,
    `percentProblem()`, which passes a blank.
- `wardShare()` (`src/core/format/money.js`) counts a blank as 0%. The
  Clerk's workbook computes the same (`full × share`).
- The Annual family: `checkRows()` requires `wardPct` on every started
  Schedule D row ("Ward's % is required"; 0 allowed). Its sidebar requires
  it too.
- D-2: `if(attorneyStarted){…}` requires the name, bar number, phone, street
  and city/state/zip, but not `attorney.email`. The Annual (`'Part V —
  Attorney Email'`) and the Simplified require it under the same
  condition.
- None of the Clerk's three workbooks has an attorney email box (searched
  with a parser). The email appears on the app's PDF only.

### Authority

- **Shares.** Matching the Annual family's existing rule. The Clerk's
  workbook would compute a blank as 0%; the rule asks the filer to say so
  rather than assume it.
- **Email.** Fla. R. Gen. Prac. & Jud. Admin. 2.515(c) (July 1, 2026): *"A
  document signed under this rule must include a signature block containing
  the filer and each signer's name, electronic signature indicator, mailing
  address, telephone number, and e-mail address for service of court
  documents (if the document is filed or served electronically). If the
  signer is an attorney, the signature block must also include the signer's
  Florida Bar number and the party the signer represents."*

### Design

1. **Shares.** In `validateGuardian()`'s share loop, any schedule except A-1
   reports a blank as an ordinary, overridable issue: *"B-1 row 2 — Ward's %
   is required."*, or *"Joint Owner's %"* on C-5.
   - Blank means `''`, `null` or `undefined`. **0 is an answer.**
   - A-1 is unchanged.
   - The Inventory's sidebar is built from this validator, so the schedule's
     mark follows automatically.
2. **Email.** Inside the existing `if(attorneyStarted)` block:
   `req(d.attorney.email,'D-2 Attorney — Primary Email','attorney.email')`.
   - The D-2 marker already follows the attorney rule (Milestone 71B).
   - A filing with no attorney is untouched (AGENTS.md §4, the pro se and
     Guardian Advocate protection).
3. Re-read `src/core/filing/readiness-config.js` and confirm it has no
   Inventory item for either field, keeping the readiness panel and the
   export checks one-to-one.

### Cross-cutting checklist (AGENTS.md §8)

1. **Data model.**
   - The ten share rows (`scheduleA2[].wardPercent` … `scheduleC4[]`, and
     `scheduleC5[].jointOwnerPercent`): `requiredness` changes from
     `optional` to `conditional`, with `required_when` "on a started row
     (validateGuardian(), Milestone 72B); 0 is an answer".
   - `attorney.email`: from `optional` to `conditional`, with
     `required_when` "an attorney is started (attorney-block.js
     isAttorneyStarted())". These are the Annual's and Simplified's words.
   - `npm run verify:data-model` must pass.
2. **Legacy data.** Inventory filings on the test system with a blank share,
   or an attorney without an email, now show an issue the filer can see and
   correct. Visible and one-time, so no migration (AGENTS.md §8 item 2).
3. **Fixtures.**
   - 28 test files build Inventory schedule rows. Grep each for a row with
     no share, and for an Inventory attorney without an email. Add the
     missing value wherever a sibling required field already appears.
   - Check `fillMinimalValidGuardianWard()` first.
4. **Tests.**
   - New: `tests/unit/inventory-required-share-and-email.spec.js`. It
     covers:
     - each of the ten schedules, blank versus 0 versus 50;
     - A-1 unchanged;
     - an attorney with no email reported, and no attorney not reported;
     - the sidebar mark for one schedule and for D-2.
   - **Red-first** with the validator stashed: the blank share and the
     missing email pass.
   - `TEST-INDEX.md`.
5. **Export/import.** None. Validation only.
6. **Security.** No new data.
7. **UI/UX.** The existing markers become true; the messages use the
   validator's existing wording.
8. **Legal framing.** Rule 2.515(c) is quoted, not interpreted. Whether a
   given filing is "filed or served electronically" is the filer's matter.
9. **Cross-form.** This brings the Inventory to the Annual's existing rules.
   The Simplified has no shares.

### Build record — NOT STARTED

---

## 72C — The guardian's email: on the Inventory, and the same warning on every form

### What a filer observes

- **Inventory.** There is no place to enter a guardian's email.
- **Annual, Final, Trust.** Each guardian's email is marked required, but
  nothing checks it.
- **Simplified.** Export is blocked until every guardian has an email.

Three forms, three behaviors, for one requirement.

### Evidence

- **Inventory.**
  - `mk.guardian()` has no `email`.
  - D-1 renders none, and the PDF prints none.
  - The data model nonetheless lists `guardian_inventory,
    guardians[].email` as optional, citing `mk.guardian()`: a row for a
    field that does not exist.
  - The Clerk's Inventory workbook has no guardian email box.
- **Annual.**
  - The Part III guardian email field (`index.js` near line 728) is drawn with the
    required marker.
  - `validateAnnual()`'s guardian checks (near line 1639) do not include
    it, and neither does the sidebar's `guardianComplete`.
  - The Clerk's Annual workbook has a box (`'PART II, III'!B30` caption,
    B31 box). The exporter writes it.
- **Simplified.**
  - `validateSimplified()` blocks: `req(g.email,'Part IV — … — Email
    Address',…)`.
  - Its sidebar's `guardianComplete` requires it too.
  - The Clerk's Simplified workbook has a box.
- The data model lists both siblings' `guardians[].email` as
  `conditional, active guardian`.

### Decision (the requester, 2026-10-01; Clerk practice)

- Add the guardian's email to the Inventory.
- On all three forms, a missing guardian email **warns and never blocks**,
  and only when **no attorney is entered**. When the attorney also signs,
  Rule 2.515(c) asks only for the attorney's details.
- The Simplified's existing block becomes this warning.

### Design

1. **Inventory field.**
   - `mk.guardian()` gains `email: ''`.
   - D-1 shows "Email Address (for e-service)" with no required marker,
     beside the phone.
   - The PDF's Part III prints it with each guardian's details.
   - The workbook has no box for it, so it is not written to Excel and not
     imported.
2. **One warning, three forms.** `unrepresentedAdvisories()`
   (`unrepresented-filing.js`, already called by `output-preflight.js` for
   the three engines) adds, for each guardian in play with no email, when no
   attorney is started:
   *"D-1 — Guardian #2 has no email address. With no attorney, the court's
   rules expect each signer's e-mail address for service in the signature
   block when a document is filed electronically (Fla. R. Gen. Prac. & Jud.
   Admin. 2.515(c))."*

   The section label follows each form: D-1 on the Inventory, Part III on
   the Annual, Part IV on the Simplified. The warning is advisory only.
3. **Simplified.**
   - Remove `req(g.email,…)` from `validateSimplified()`.
   - Remove `filled(g.email)` from its sidebar's `guardianComplete`. A
     warning-only field does not hold back the sidebar, so a filer without
     an attorney can still reach 100%.
4. **Annual.** The guardian email field drops its required marker. The
   warning now speaks for it.
5. **Completion golden.** Regenerate `tests/baseline/ms70-completion-golden.json`
   by its own instruction (`PG_UPDATE_GOLDEN=1`), with the Simplified change
   stated in its note.

### Cross-cutting checklist (AGENTS.md §8)

1. **Data model.**
   - `guardian_inventory guardians[].email`: the source is now true;
     `required_when` reads "advisory only, when no attorney is started
     (Milestone 72C)".
   - The Annual and Simplified `guardians[].email` rows: `requiredness`
     changes from `conditional` to `optional`, with the same advisory note.
   - `npm run verify:data-model`.
2. **Legacy data.** Inventory filings on the test system have no `email`
   key; a missing key reads as blank, so the warning shows. Simplified
   filings that were blocked can now export. No migration.
3. **Fixtures.**
   - Grep for Simplified specs that expect the blocking "Email Address"
     issue, and for completion-parity cases that fill a guardian email to
     reach complete.
   - Each is updated with the reason stated.
4. **Tests.**
   - New: `tests/unit/guardian-email-advisory.spec.js`. It covers the three
     engines:
     - no attorney and no email: a warning;
     - an attorney and no email: none;
     - an email entered: none;
     - never an export error;
     - the Simplified sidebar complete without one.
   - New: `tests/e2e/guardian-email-advisory.spec.ts`. With real keystrokes
     on the Inventory's D-1, the email is saved, printed on the PDF, survives
     reopening, and clears the warning.
   - Changed: the Simplified specs found in item 3.
   - **Red-first:** the Simplified blocks, and the Inventory has no field.
   - `TEST-INDEX.md`.
5. **Export/import.** The Inventory's PDF changes; its workbook does not (no
   box). The Annual and Simplified keep writing their boxes.
6. **Security.** A guardian's email address is newly stored on the
   Inventory. It is the same class as the Annual's and Simplified's (the
   CSV's `sensitive` is `none`). It is encrypted in the `.sav` when a
   password is set, printed on the filed PDF, and never sent anywhere.
7. **UI/UX.** It is the same field, label and placement as the Annual's Part III
   email, and the warning uses the existing advisory channel.
8. **Legal framing.** Rule 2.515(c) is quoted. That the office does not need
   the email to accept a filing, and that a warning is enough, is **Pinellas
   Clerk practice** (2026-10-01), not a reading of the rule. Another county
   may differ.
9. **Cross-form.** This item is the cross-form fix, authorized by the
   requester's "warn on all three".

### Build record — NOT STARTED

---

## 72D — With no attorney, the PDF matches the Clerk's forms

### What a filer observes

With no attorney entered, the filed PDF replaces the attorney attestation
and signature block with one app-written line. An example: *"The guardian
is not represented by counsel: guardian advocate (Fla. Prob. R.
5.030(a))."* No Clerk form has such a line.

### Evidence: how the original forms handle it

- **The Clerk's three workbooks** (searched with a parser). They have
  attorney-only blocks, for example *"SIGNATURE of GUARDIAN ATTORNEY … The
  undersigned Attorney hereby notifies the Court of the filing…"*, followed
  by name, bar number, address and phone. They have no wording for a filing
  without an attorney. With no attorney, the block is left blank.
- **The original Plan forms** (`reference/plan-forms/`). They have the same
  attorney certification blocks and no alternative wording. The Simplified
  Plan form has no attorney block at all.
- **The Clerk's work slips** (`reference/legal/workslips/`). The reviewer
  checks the reason from the court file:
  - *"Guardian must be represented by an attorney pursuant to Florida
    Probate Rule 5.030"* (the Inventory slips);
  - *"…except for Guardian Advocate"* (the Annual review slip);
  - *"Date of court order waiving representation of attorney"* and
    *"'Waiver' may be in either the Order Appointing or in the Report and
    Recommendation of Magistrate which was approved by the Order"* (the
    audit and trust slips).

### Decision (the requester, 2026-10-01)

Match the forms. The PDF prints the attorney block blank. The app keeps
asking the reason on screen, as a check for the filer, but files nothing.

### Design

1. **The three PDF models** (Inventory D-2, Annual Part V, Simplified Part
   V). With no attorney, render the attorney attestation and an empty
   signature block, exactly as with an attorney whose fields are blank.
   This is the pre-71B rendering.
2. **`unrepresentedStatement()` is deleted**, and its imports are removed.
3. **Kept:**
   - the on-screen reason question and its hints;
   - the guardian-signed certificate of service (71B), which the filer
     needs in order to certify service without an attorney;
   - the Excel advisory about the workbook's attorney-only certificate line.

   None of these is part of this decision.
4. **`MILESTONE-71-PROPOSAL.md`.** Its Status line and 71B step 6 ("OPEN
   (wording only)") are updated to say the open wording question closed on
   2026-10-01: no sentence is printed (Milestone 72D).

### Cross-cutting checklist (AGENTS.md §8)

1. **Data model.** None. `attorneyWaiverBasis` and `attorneyWaiverOrderDate`
   stay. They are still asked, and their notes change to "asked on screen,
   not printed (Milestone 72D)".
2. **Legacy data.** None. The sentence was produced at print time and never
   stored.
3. **Fixtures.** None.
4. **Tests.**
   - Changed: `tests/unit/attorney-optional.spec.js`. Its
     `unrepresentedStatement()` cases go; each engine's PDF model with no
     attorney has the attestation block with blank fields and no "not
     represented by counsel".
   - Changed: `tests/e2e/attorney-optional-export.spec.ts`, so the PDF text
     no longer contains the sentence.
   - **Red-first:** today's PDF prints it.
   - `TEST-INDEX.md`.
5. **Export/import.** The PDF only. Excel was never affected.
6. **Security.** None.
7. **UI/UX.** None on screen.
8. **Legal framing.** The decision avoids app-authored filed text. The
   reviewer's check of the court file is the Clerk's own process.
9. **Cross-form.** All three engines change together.

### Build record — NOT STARTED

---

## 72E — The phone keypad for negative amounts on Schedules C and E

### What a filer observes

On a phone or tablet, two boxes that expect a negative number show a numeric
keypad with no minus key:

- Annual Schedule C, *"Loss / Reduction (enter as negative)"*;
- Schedule E, *"Transfer Out Amt (negative)"*.

The filer cannot type the minus sign.

### Evidence

- `annual-accounting/index.js` near lines 1062 and 1274. Both are
  hand-written inputs with `inputmode="decimal"` and
  `data-annual-format="signed-decimal"`.
- The shared field builder (`form-fields.js` line 212) already gives signed
  kinds `inputmode="text"`. So did 71E's Starting Balance boxes.

### Design

- Both inputs use `inputmode="text"`.
- New spec, `tests/e2e/signed-amount-keypad.spec.ts`. On every page with a
  signed amount (Annual Schedule C, Schedule E, the Annual and Simplified
  Starting Balance), every input whose format is signed has `inputmode`
  `text` (or none). Then `-50` typed with the keyboard is stored as −50.
- **Red-first:** the two boxes report `decimal`.
- Playwright cannot show a phone keyboard. `inputmode` is the attribute the
  phone uses to choose one, so the test checks that.

### Cross-cutting checklist (AGENTS.md §8)

- No data, legacy, fixture, export, security or legal effect.
- **Cross-form.** The Simplified's non-negative boxes rightly keep
  `decimal`. Its Starting Balance already uses `text`.
- **Tests.** The new spec, its `TEST-INDEX.md` row and the registries.

### Build record — NOT STARTED

---

## 72F — Split the summary-page browser test

### What a filer observes

Nothing. This is test reliability. The full regression of 2026-09-29 failed
on this test's 60-second limit, not on a defect.

### Evidence

- `tests/e2e/routes.spec.ts`, "all 9 form types render a standardized
  summary page", walks all nine form types in one test.
- It takes 22–24 s from a C: copy of the repository and 47–49 s from D:,
  which is FAT32. Under full-suite load on D:, it passed 60 s.
- No other browser test came within 25 s of its limit in that run.

### Design

- One test per form type, generated from the same `INVENTORY_TYPES` list,
  each with the same assertions (main content, summary box, "Summary"
  heading, no page or console errors).
- Each test gets a fresh browser context. The save-flush and
  recovery-cache workaround between iterations (Milestone 50G) is then
  unnecessary and is removed, with a comment saying why.
- `TEST-INDEX.md`'s row for `routes.spec.ts` and the assertion-count
  baseline are updated (eight more test declarations).
- **Recorded in AGENTS.md §1**, beside the tier timings: the repository on
  this workstation is on a FAT32 drive, and the browser suite runs about
  twice as slowly there. The 2026-09-29 full `npm test` took 1.7 h for 980
  tests. Re-measure from an NTFS copy before trusting either figure.

### Build record — NOT STARTED

---

## 72G — Every certificate of service says how the copies were served

*From the browser review, finding H1.*

### What a filer observes

No certificate of service in the app asks how service was made, and no
filed PDF says it. This applies to both kinds of certificate:

- signed by an attorney: the Inventory, the Annual family and the
  Simplified;
- signed by a guardian when there is no attorney (Milestone 71B).

It also applies to the four Plans' certificates (Milestone 68C). An
Inventory's prints, for example: *"Pursuant to the Florida Statute
744.362(1), I hereby certify that a copy of this inventory has been
furnished to the following persons on this date, 09/30/2026:"* There is no
"by mail", "by e-mail" or similar.

### Evidence

- **Rule 2.516(f)** (July 1, 2026): *"A person establishes prima facie proof
  of service by including the following: (1) certification; (2) date of
  service; (3) name(s) of person(s) served (4) service address(es); and (5)
  method of service."* The rule's sample certificate reads *"…furnished to
  (here insert name(s) and service address(es) by (here insert method of
  service such as portal, e-mail, delivery, or mail)."* Probate Rule 5.041
  sends service to Rule 2.516 (`reference/README.md`).
- **The Clerk's workbooks** (parsed) do not ask for a method. Each has only
  the certificate sentence (Inventory `PART VI`!B8, Annual `PART X`!B9,
  Simplified `PARTS V, VI `!B25: *"…I hereby certify that a copy of this …
  has been furnished to:"*), the recipients, a date, and "Indicate if:"
  (*"Ward is totally incapacitated, Ward is under 14 years old, N/A"*).
- **The app**:
  - No form, model or PDF has a method field. `serviceMethod` exists only
    in a type comment (`src/core/types/parties.js`, `ServiceRecipient`).
  - The certificate sentences are in the Inventory PDF model (near line
    837), the Annual's (near 1104), the Simplified's (near 284) and
    `plan-certificate-of-service.js` (near 162).
- **Milestone 71's record.** 71B's design (step 5) said the guardian's
  certificate *"uses the same recipient list, addresses and method fields
  the attorney certificate already uses"*. There were no method fields.
  The review attributes the claim to 71B's build record; it is in the
  design, and the build record makes no such claim.

### Decision (the requester, 2026-10-02)

- Ask once per certificate, on all seven certificates.
- Print it on the PDF only.
- A missing method warns, never blocks. Recorded as Clerk practice.

### Design

1. **A new `src/core/filing/service-method.js`.**
   - The choices, each with its label and the phrase the PDF prints:

     | Label | Prints as |
     | --- | --- |
     | Florida Courts E-Filing Portal | "the Florida Courts E-Filing Portal" |
     | E-mail | "e-mail" |
     | Hand delivery | "hand delivery" |
     | U.S. Mail | "U.S. Mail" |
     | Other | the filer's own words |

   - `serviceMethodPhrase()` returns `''` when nothing is chosen, or when
     Other has no text.
   - It also builds the warning.
2. **Fields**, in each form's existing naming: the Inventory gets
   `serviceMethod` and `serviceMethodOther`; the Annual family, the
   Simplified and the Plans get `certMethod` and `certMethodOther`. Both
   default to `''`.
3. **On screen.** Each certificate page gets a fieldset, *"How were the
   copies served?"*, beside the service date: five radios, and a text box
   when Other is chosen. It is the same whoever signs. The Plans get it
   through the shared certificate section.
4. **On the PDF**, the certificate sentence takes the method, as in the
   rule's sample:
   - Inventory: *"…has been furnished to the following persons by U.S. Mail
     on this date, 09/30/2026:"*;
   - the others: *"…has been furnished by U.S. Mail to:"*.

   With no method chosen, the sentence is today's, unchanged.
5. **Excel.** Not written: the workbooks have no box for it, and writing it
   into the certificate sentence's cell would overwrite the Clerk's text.
   Not imported.
6. **The warning.** Preview & Export, when the certificate lists at least
   one recipient and no method is stated: *"<section> — How the copies were
   served is not stated. Rule 2.516(f) lists the method of service among
   what a certificate of service includes."*
   - It does not appear when the filer affirms that no recipients are
     required.
   - It never blocks, and the sidebar is unaffected.
   - The Plans' warning goes through `planCertificateAdvisories()`.
7. **`MILESTONE-71-PROPOSAL.md`.** 71B step 5's claim gets a correction
   note pointing here.

### Cross-cutting checklist (AGENTS.md §8)

1. **Data model.** Fourteen new rows: `serviceMethod` and
   `serviceMethodOther` for `guardian_inventory`, and `certMethod` and
   `certMethodOther` for the annual, simplified and four plan scopes.
   - `serviceMethod` and `certMethod`: `string`, `enum`, optional, allowed
     `portal`, `email`, `hand`, `mail`, `other`.
   - The `…Other` fields: `string`, `text`, optional.
   - Each is `sensitive` `none`, `persisted`, `input`.
   - `npm run verify:data-model`.
2. **Legacy data.** An older filing has no method, so it reads as `''` and
   the warning shows: visible, no migration. The Plans'
   `migratePlanCertificateOfService()` adds the two fields on mount, as it
   does the others.
3. **Fixtures.** Nothing new is required (it is a warning). Grep for specs
   pinning a certificate sentence (`has been furnished`); each still passes
   with no method chosen.
4. **Tests.**
   - New: `tests/unit/service-method.spec.js`. It covers:
     - each method's phrase;
     - each engine's and each Plan's PDF sentence, with and without a
       method;
     - the warning: only with recipients and no method, never an export
       error.
   - New: `tests/e2e/certificate-service-method.spec.ts`. With real clicks,
     on the Inventory's D-5 (attorney- and guardian-signed), the Annual's
     Part X and one Plan, the chosen method prints on the PDF and survives
     reopening. Other prints the typed words.
   - **Red-first:** no field, and no method in the sentence.
   - `TEST-INDEX.md`.
5. **Export/import.** The PDF only.
6. **Security.** No sensitive data.
7. **UI/UX.** The app's existing radio-choice fieldset pattern
   (`<fieldset>`/`<legend>`), beside the service date.
8. **Legal framing.** Rule 2.516(f) is quoted, not interpreted. Whether it
   governs the copies furnished under §744.362(1) and §744.367(4) is not
   decided here. That a missing method is a warning, not a block, is
   Pinellas Clerk practice (2026-10-02).
9. **Cross-form.** All seven certificates change together. The Clerk's
   workbooks keep their own wording.

### Build record — NOT STARTED

---

## 72H — The certificate's attorney is the filing's attorney

*From the browser review, finding M3.*

### What a filer observes

- On the Inventory's D-5, an attorney-signed certificate asks again for the
  attorney's name, Florida Bar number, phone and address, and prints those.
- On the Simplified's Part VI, it asks again for the Bar number, phone and
  address.

A typo, or a later correction on D-2 or Part V, leaves the certificate
printing different details for the same attorney. The review saw a seeded
Inventory print Bar # 00123456 in Part IV and 01234567 in Part VI. The code
cannot tell whether that filing was typed that way, but the app allows it
either way, and nothing warns.

### Evidence

**The Clerk's forms tie the certificate to the filing's attorney** (parsed):

| Form | Certificate attorney's name | Bar number, address, phone |
| --- | --- | --- |
| Inventory `PART VI` | J27 `='SUMMARY I '!D24` (Attorney for Guardian), as is `PART IV`'s I26 | separate boxes (B29, J29, B31, J31) |
| Annual `PART X` | K25 `=Attorney` | **linked**: B27 `=Attorney_Bar_No`, K27 `=Attorney_Address` |
| Simplified `PARTS V, VI ` | J41 `='PARTS I, II '!D15` | separate boxes |

**The app has three variants:**

- **Annual:** the certificate keeps only its own signature and date
  (`certAttySignDate`, `certAttySignatureState`, `certAttySignatureImage`)
  and uses Part V's attorney. This matches the form.
- **Simplified:** re-typed `certAttyBarNumber`, `certAttyPhone`,
  `certAttyStreet` and `certAttyCityStateZip` (`index.js` near 648–651).
  The PDF (near 327–329) and Excel print them, falling back to Part V when
  blank.
- **Inventory:** `serviceAttorney.name`, `barNumber`, `phone`,
  `streetAddress` and `cityStateZip` (`index.js` near 1268–1270).
  - The validator requires `serviceAttorney.name` (near 1491).
  - The PDF prints them (near 866–874); only the email falls back to D-2's.
  - Excel writes them to `PART VI` B29, J29, B31 and J31 (`excel.js` near
    547–550).

### Decision (the requester, 2026-10-02)

The certificate's attorney is the filing's attorney, as on the Annual and
the Clerk's forms.

### Design

1. **Inventory D-5 with an attorney.**
   - It shows *"Signed by NAME, Florida Bar # … — name and contact details
     come from D-2"*, read-only, like 71B's guardian-certifier line.
   - It keeps its own signature control and date
     (`serviceAttorney.signatureDate`, `signatureState`, `signatureImage`).
   - The name, Bar number, phone and address inputs go, and so does the D-5
     attorney name check. D-2 already validates the attorney. (D-5 never had
     an email input; the PDF's fallback to D-2's email read a field nothing
     collects.)
2. **The Inventory PDF's Part VI** prints the attorney from D-2
   (`attorney.*`), and the signature and date from `serviceAttorney.*`.
3. **The Inventory Excel's `PART VI`.**
   - B29, J29, B31 and J31 get D-2's Bar number, street, phone and
     city/state/zip.
   - G27 keeps the certificate's signature date.
   - J27 stays the form's link.
   - The importer stops reading those boxes into `serviceAttorney.*`. Check
     at build that `PART IV` still supplies D-2's.
4. **Simplified Part VI.** The four re-typed inputs go. The PDF and Excel
   use Part V's `attorney_*`. Its own signature and date stay. The importer
   stops reading `PARTS V, VI ` B43, J43 and their neighbours into
   `certAtty…` (`excel.js` near 409-411); Part V's own cells supply the
   attorney.
5. **Typed data is kept, not printed.**
   - Values already stored stay in the `.sav` (AGENTS.md §4,
     non-destructive).
   - When any non-blank one differs from the filing's attorney, Preview &
     Export notes it once, for example: *"D-5 — Attorney details entered on
     this certificate earlier (Florida Bar # 01234567) differ from D-2
     (00123456). The certificate now prints D-2's; confirm D-2 is right."*
   - The same applies on the Simplified, against Part V.
6. **No attorney** (a guardian certifies): unchanged from 71B.

### Cross-cutting checklist (AGENTS.md §8)

1. **Data model.**
   - The Inventory's `serviceAttorney.name`, `barNumber`, `phone`,
     `streetAddress` and `cityStateZip` rows, and the Simplified's four
     `certAtty…` rows: the notes read "retained; no longer entered or
     printed (Milestone 72H)".
   - The `serviceAttorney.email` row describes a field no model or form
     has; it is removed.
   - `npm run verify:data-model`.
2. **Legacy data.** Kept, and noted when they differ: visible. No
   migration.
3. **Fixtures.** Grep for specs filling `serviceAttorney.*` or `certAtty…`,
   and for any `fillMinimalValid*` that fills the D-5 name to satisfy its
   old requirement.
4. **Tests.**
   - New: `tests/unit/certificate-attorney.spec.js`. Both engines' PDF
     models print D-2's or Part V's details. The difference note fires only
     when a stored value differs.
   - New: an e2e case in which a Bar number typed on D-2 appears in the PDF
     certificate and in the exported `PART VI`!B29, read with ExcelJS.
   - **Red-first:** D-5's own value prints.
   - `TEST-INDEX.md`.
5. **Export/import.** The Inventory's `PART VI` writes and reads change, and
   so do the Simplified's certificate boxes.
6. **Security.** None.
7. **UI/UX.** Reuses 71B's read-only "Signed by … — details come from …"
   line.
8. **Legal framing.** None. The Clerk's forms link the two.
9. **Cross-form.** The Annual already works this way and is unchanged.

### Build record — NOT STARTED

---

## 72I — The Guardian Advocate hint appears as soon as it's chosen

*From the browser review, finding M1.*

### What a filer observes

On the Inventory's and the Annual's Cover, the question *"No attorney is
entered. Why is this guardian filing without one?"* sits on the same page as
Type of Guardianship. A filer who chooses "Guardian Advocate" there sees no
hint pointing at the matching answer. The hint appears only after they leave
the Cover and come back.

### Evidence

- `waiverBasisQuestionHTML()` (`unrepresented-filing.js`, near line 160)
  builds the hint (`[data-waiver-advocate-hint]`) only when the page is
  drawn.
- The question is drawn on the Cover (`'/'`) of the Annual (`index.js` near
  672) and of the Inventory (near 757).
- **Reproduced on the Annual**, with the real dropdown: no hint right after
  choosing Guardian Advocate; the hint is present after leaving and
  returning.
- The Inventory draws the same block the same way. It was not separately
  driven: the probe's own selector failed there, not the app.
- The review confirmed the other half: choosing Guardian Advocate does not
  auto-answer the question.
- The Simplified asks no reason; its basis is fixed by §744.3679(3).

### Design

- When Type of Guardianship changes, redraw the reason block. This is the
  same refresh the reason radios already trigger, which is why the chosen
  reason's caption updates live.
- The hint shows only while the type is Guardian Advocate and no reason is
  chosen.

### Tests and checklist

- New: `tests/e2e/guardian-advocate-hint.spec.ts`, on both engines, with the
  real dropdown:
  - the hint is visible at once;
  - changing to Plenary removes it;
  - choosing a reason removes it.
- **Red-first:** the hint is absent until the filer navigates away and
  back.
- `TEST-INDEX.md`.
- No data, legacy, export, security or legal effect. Cross-form: the
  Simplified has no such question.

### Build record — NOT STARTED

---

## 72J — The missing-recipients issue names what to do

*From the browser review, finding M2.*

### What a filer observes

On an accounting with an empty certificate, Preview & Export's missing list
and the Clerk's Review Readiness list both show: *"Part X — No recipients
are required for this certificate (filer attestation - app does not
determine legal necessity)"*. That is the caption of the checkbox, read as
if it were the missing item. The Inventory (D-5) and the Simplified
(Part VI) show the same.

### Evidence

- The validators push `` `<section> — ${ATTESTATION_57B}` ``: the Annual's
  near line 1745, the Inventory's near 1479, the Simplified's near 855.
- The Plans already word the same condition as *"List at least one
  recipient who was served, or state that no recipients are required"*
  (`section-guidance-policy.js`).
- No spec pins the old text.

### Design

- The message becomes *"<section> — List at least one recipient who was
  served, or state that no recipients are required"*.
- The field path is unchanged, so "Go to field" still lands on the
  checkbox.
- Re-read `readiness-config.js`. If an auto item matches the old text,
  update it, so each auto item still maps to its export error one-to-one.

### Tests and checklist

- Extended: a unit case per engine for an empty certificate's message.
- **Red-first:** the caption text appears.
- `TEST-INDEX.md` for any spec touched.
- No data, legacy, export, security or legal effect. Cross-form: brings the
  accountings to the Plans' wording.

### Build record — NOT STARTED

---

## Reported, not reproduced

### The sidebar's NET ASSETS with a negative Starting Balance (browser review, H2)

**Reported.** On a new Annual Accounting, with −5000 typed as the Starting
Balance and nothing else entered, the left sidebar's NET ASSETS stayed at
$0.00. This persisted after leaving the page and returning, on Summary and
Print Preview, and after a browser reload. Meanwhile the Summary page and the
PDF showed the negative correctly.

**Checked 2026-10-02.**

- The sidebar uses `headlineTotal()`, which for a filing with no Schedule D
  figure returns Line 20 (−5,000 here).
- Two throwaway browser probes, run on the source and on a fresh web
  build, typed −5000 with the keyboard. The sidebar read "($5,000.00)":
  - right after typing;
  - after leaving and returning;
  - with two filings in the case, switching between them;
  - on Summary and on Print.
- The test system serves the same main bundle as that fresh build
  (`assets/index-ZGEyU5dO-v2.js`).
- After a reload, the probe landed on the start screen, so that last step
  was not compared.

**Decision (the requester, 2026-10-02).** Dropped, with no test added. If
it is seen again, the exact steps are needed, especially how the filing was
reopened.

### Also from the review

The review's "Confirmed working" list matches the build records. It also
confirmed that 71B's printed no-attorney sentence appears as designed; 72D
removes that sentence by decision.

---

## Verification plan for the milestone

Per AGENTS.md §2:

- **Each item:** its targeted specs, red-first for every test that claims to
  catch a defect.
- **Type check:** after 72A (a new `tests/e2e/support/*.ts`), and after any
  item that touches a file in `tsconfig.json`'s scope.
- **Data model:** `npm run verify:data-model` after 72B, 72C, 72G and 72H.
- **Full regression:** 72A changes an exporter and importer, 72C changes
  three engines' validation, 72D, 72G and 72H change every accounting's
  PDF, and 72G changes the four Plans' certificates. **Recommend `npm test`
  after the last item**, to be run only with the requester's go-ahead. On D:
  it takes about 1.7 h.

---

## Not in scope

- **Part VIII's trust amount prints as a date in Excel.** `D16`–`D18` carry
  the Clerk's date format. Confirmed by Milestone 71A; still open.
- **Activity-log entries tagged with the wrong filing.** Listed in
  `MILESTONE-71-PROPOSAL.md`; still open.
