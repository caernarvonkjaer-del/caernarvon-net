# Milestone 72 Proposal — What Milestone 71 found and left unfixed

## Status

**Draft. It authorizes no change.**
- 72A–72F were settled 2026-10-01.
- 72G–72J were added 2026-10-02 from the requester's browser review of
  Milestone 71.
- The whole plan was revised 2026-10-02 after an independent review
  (Codex) found 72G's premise false and gaps in 72A, 72B, 72C and 72H.
- It was revised again the same day after Codex's second review. That
  review covered the secondary attorney email on every form, certificate
  answers surviving conversions and New Year, a repeatable 72H migration,
  the Plans' differing "attorney entered" tests, and the guard's coverage.
- It was revised a third time the same day after Codex's third review.
  Workbooks exported before 72G and 72H now import without losing or
  misreading the certificate's boxes. Once an attorney detail is entered,
  every form that checks the attorney asks for the name. The Simplified
  Plan's certificate finds its attorney. The export guard catches swapped
  Yes/No and dropdown boxes and changed formulas. The migrations run where
  the app's migrations already run.
  See [Independent review](#independent-review-codex-2026-10-02).

Building any item still needs the requester's named approval of that item
(AGENTS.md §3).

The requester is a representative of the Clerk of the Circuit Court, Pinellas
County. Where an answer below is about what the Clerk's office accepts, it is
recorded as **Pinellas Clerk practice**, not as a reading of a statute or rule
(AGENTS.md §4 and §5). Practice is county-specific.

| # | Item | What a filer sees today | Decision | Build |
| --- | --- | --- | --- | --- |
| 1 | 72A | The Inventory's Excel Part III prints each guardian's date, SSN/EIN, street, phone and city **over the form's printed captions**, and leaves the boxes beneath them empty | **DECIDED.** Put each value in its box. Keep writing Guardian #1's name, with a warning when it is not among the Cover's Guardian Name(s). Guard every export: no caption overwritten and no formula changed, and **every box the exporters write** gets a typed test value checked in its expected cell, with a few extra exports so Yes/No and dropdown boxes can't swap unnoticed | Not started |
| 2 | 72B | A blank share on ten Inventory schedules silently counts as 0%, and a 0 share becomes blank when converted or when the Annual's Part VIII is exported. The Inventory attorney's primary email is marked required but never checked. **Six forms** collect a secondary attorney email that their models and the data model omit, and carry-over passes on only the primary | **DECIDED.** Require a share on every started row (0 allowed); keep 0 as 0 on every share path. Require the Inventory attorney's email once an attorney is entered. Every form's model, data model, carry-over and conversion keeps both attorney emails | Not started |
| 3 | 72C | The Inventory and the Initial Plan have no guardian email. The Annual, Annual Plan and Plan for Minors collect it but never check it. The Simplified Accounting and Simplified Plan block without it. The Plan for Minors never checks the attorney's email. The Annual family and Annual Plan accept an attorney with no name, and the Simplified Plan's certificate can't find its attorney's name | **DECIDED.** Add it where it's missing. On all three accountings and all four Plans, a missing guardian email **warns, never blocks**, and only when no attorney is entered. "Attorney entered" means any attorney field, by one shared definition per form, and then the Annual family and Annual Plan also require the attorney's name. The Plan for Minors requires the attorney's email once an attorney is entered. The Simplified Plan's attorney stays optional, and its warning shows until the attorney's name and email are both entered. Its certificate is fixed to find the attorney | Not started |
| 4 | 72D | With no attorney, the filed PDF prints an app-written sentence that no Clerk form has | **DECIDED.** Match the Clerk's forms: print the attorney block blank, as they do | Not started |
| 5 | 72E | On a phone, Schedule C's loss and Schedule E's transfer-out boxes offer a keypad with no minus key | No decision needed (a defect) | Not started |
| 6 | 72F | The nine-form summary-page browser test runs out of time on the D: drive | **DECIDED.** Split it into nine tests, one per form | Not started |
| 7 | 72G | Six of the seven certificates of service already have a free-text method box, labelled "Indicate if (e.g. hand-delivered, mailed)"; the Inventory has none. The Annual and Simplified **write that method into the workbook's ward-status box**, and the Simplified blocks without it | **DECIDED.** That box is the method of service, on all seven forms, printed on the PDF only. A missing method warns, never blocks. The Annual and Simplified get a separate ward-status dropdown (the workbook box's real meaning), required on all three accountings. On a new filing made from another, only recipients carry (the ward's status also carries within the same period). An older workbook imports by what its box holds: a ward-status answer as the ward's status, anything else as the method | Not started |
| 8 | 72H | The Inventory's D-5 and the Simplified's Part VI re-type the attorney's details, so one PDF can show two Bar Numbers for one attorney. The Inventory also has two attorney-name fields, which can differ between PDF and Excel | **DECIDED.** The certificate uses the filing's attorney details. Both name fields stay, with a warning when they differ that says which output prints which. Old typed values fill blank fields once (a saved marker stops repeats); any that differ show on the certificate page with a "Discard old details" button. An older workbook imports the same way: its certificate details fill the filing attorney's blanks, and any that differ are kept and shown | Not started |
| 9 | 72I | Choosing "Guardian Advocate" as the Type of Guardianship shows no hint at the reason question until the filer leaves the page and returns | No decision needed (a defect) | Not started |
| 10 | 72J | The missing-recipients issue reads "No recipients are required for this certificate (filer attestation …)", the checkbox's caption, not a question | No decision needed (reuse the Plans' wording) | Not started |
| — | — | The sidebar's NET ASSETS stays at $0.00 for a negative Starting Balance (browser review, H2) | **Not reproduced; dropped** (see "Reported, not reproduced") | — |

### Provenance

- Milestone 71's build and its full regression listed 72A–72F as "found,
  not fixed" (`MILESTONE-71-PROPOSAL.md`: the 71B, 71C and 71E Build
  records, and "Full regression — run 2026-09-29").
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
  code, the Clerk's workbooks and the rule text before being written up here.
  Where the review's account differed from what was found, that item says so.
- **Three rounds of independent review of this proposal by Codex,
  2026-10-02.** Every point was checked against the code before the plan
  changed. See [Independent review](#independent-review-codex-2026-10-02).

### Decisions already made (the requester)

| Question | Answer |
| --- | --- |
| Inventory Part III, Guardian #1's name box (10-01) | Keep writing the first guardian card's name over the form's link to the Cover; warn when that name is not among the Cover's Guardian Name(s). This is the 2026-09-19 Annual decision, applied to the Inventory |
| An export check against the templates (10-01) | On all three forms, with every schedule filled |
| A blank share on Inventory A-2 to C-5 (10-01) | Required on a started row, as on the Annual's Schedule D. 0 is allowed. A-1 keeps "must be > 0" |
| Zero shares elsewhere (10-02) | Fix every share read, write and conversion so 0 stays 0 and blank stays blank, including the Annual's Part VIII export |
| The Inventory attorney's primary email (10-01) | Required once an attorney is entered, as on the Annual and Simplified |
| The guardian's email, Rule 2.515(c) (10-01, extended 10-02) | Add it where it is missing. A missing one warns, never blocks, and only when no attorney is entered. This applies on the Inventory, the Annual family, the Simplified **and the four Plans**, so the Simplified's and the Simplified Plan's blocks become warnings. Recorded as Clerk practice |
| The Plan for Minors attorney email (10-02) | Required once an attorney is entered, as on the Annual and Initial Plans |
| The secondary attorney email (10-02, second review) | Every form that collects it (the Inventory, Annual family, Simplified, Initial Plan, Annual Plan and Plan for Minors) keeps it in its model and data model, and carry-over and conversion move it with the primary |
| When a Plan "has an attorney" (10-02, second review; narrowed at the third) | On the Annual Plan and the Plan for Minors, any attorney field counts, by one shared definition per Plan in `attorney-block.js`, as the accountings and the Initial Plan already work. The Simplified Plan, which asks nothing of its attorney, counts one only once the name and primary email are both entered (below) |
| Email classification (10-02) | Every email row in the data model is `personal`, matching the Party record. Documentation only |
| The no-attorney sentence on the PDF (10-01) | Remove it. The PDF leaves the attorney block blank, as every Clerk form does. This supersedes 71B design step 6 and its open wording question, and an earlier 10-01 answer to reword one sentence |
| The slow summary test (10-01) | Split per form |
| Method of service (10-02, re-asked) | Use the existing free-text box, relabelled "How were the copies served?", on all seven certificates, with one new box on the Inventory. PDF only. A missing method warns, never blocks, so the Simplified's block goes. **This supersedes the first 10-02 answer** (a new choice field), which was given on 72G's false premise that no method field existed |
| The ward's status, "Indicate if:" (10-02) | A separate dropdown on the Annual and Simplified, like the Inventory's (totally incapacitated / under 14 / N/A); it, not the method, goes to the workbook box. **Required on all three accountings: the requester's decision, recorded as Pinellas Clerk practice**, not something the form's having the box proves |
| The certificate on a new filing (10-02, second review) | On any conversion, New Filing from Existing or New Year, **only the recipients carry**. The service date, method, "no recipients required" answer, signer choice and every certificate signature start blank. The ward's status carries only on a same-period conversion (Annual family ↔ Simplified) and starts blank otherwise |
| The attorney's own Part V signature date on conversion (10-02) | Starts blank when a filing is converted between the Annual family and the Simplified (either direction), as Inventory → Annual already does: the attorney signs the new filing. Part of 72G |
| The certificate's attorney (10-02) | The filing's attorney details (D-2 / Part V), as on the Annual and the Clerk's forms |
| The Inventory's two attorney names (10-02) | Keep both, the Cover's "Attorney for Guardian" and D-2's name. Warn when they differ, saying the workbook prints the Cover's and the PDF prints D-2's |
| Old certificate attorney details (10-02; changed at the second review) | Once, marked by a saved migration marker: each fills the matching D-2 / Part V field only where that field is blank, and the Activity Log records which fields, never their values. Old values that differ are shown on the certificate page under the "Signed by" line with a **"Discard old details"** button (an explicit deletion). **This replaces the earlier dismissible Preview & Export note**, which would have needed clickable-warning machinery the app doesn't have. Conversions stop writing them |
| The export guard's coverage (10-02, second review) | Every box the exporters write: each one-off box on every page, and every column of one row on every page of every schedule, each with a value of its own type and its expected cell |
| Yes/No and dropdown boxes in the export guard (10-02, third review; re-asked at its added cost) | A few extra exports per form, so that every Yes/No and dropdown box on a sheet has its own pattern of answers and a swap is caught. Estimated to add 1–3 minutes on D: (about half on C:), measured at build. Checking one box at a time (hundreds of exports) was ruled out |
| The attorney's name on the Annual family and the Annual Plan (10-02, third review) | Required once any attorney detail is entered, as on the other five forms. The Annual Plan keeps requiring the primary email |
| The Simplified Plan's attorney (10-02, third review) | Optional, as today: the court's Simplified Plan has no attorney section, and the app prints none (Milestone 61E). The guardian-email warning keeps showing until the attorney's name and primary email are both entered. Nothing new blocks export |
| The Simplified Plan certificate's attorney name (10-02, third review) | Fixed in 72C: the certificate reads the form's own attorney name. A certificate already signed while it defaulted to the guardian stays the guardian's (that choice is saved once) |
| The sidebar's NET ASSETS finding (10-02) | Not reproduced; dropped, with no test added |

---

## Independent review (Codex, 2026-10-02)

Verdict as received: *not build-ready*. 72G rests on a false premise, and
72B, 72C and 72H miss related data paths. Every point was checked against
the code before anything here changed:

| # | Codex's point | Checked | What changed |
| --- | --- | --- | --- |
| 1 | **72G: a method field already exists.** The Annual, Simplified and four Plans have `certIndicator`, labelled "Indicate if (e.g. hand-delivered, mailed)". The Plans print it as the method. The Simplified blocks without it and its sidebar requires it. The Annual and Simplified write it into the workbook's ward-status box, so one field means two things. | **Confirmed**, and the original 72G was wrong: its search looked for "method" and missed a field labelled "Indicate if". Annual `index.js` near 1559; Simplified near 681, validator near 846; `completion.js` near 137; `plan-certificate-of-service-page.js` near 45; `plan-certificate-of-service.js` near 174; Annual `excel.js` near 513 (`PART X`!K23); Simplified `excel.js` near 211 (J39). The Inventory alone keeps them apart: `serviceIndicateIf` is its ward-status dropdown, and it has no method. | 72G rewritten as a field-by-field matrix. The method decision was re-asked with the facts (free text, warning on all seven), and a ward-status decision was added |
| 2 | **72H: two Inventory attorney names; an unclearable warning; conversions.** | **Confirmed.** The Cover's `attorneyForGuardian` feeds the workbook (`'SUMMARY I '!D24`, linked from Parts IV and VI); D-2's `attorney.name` feeds the PDF signature block (`pdf-model.js` near 690). Conversions write the retiring fields (`conversion.js` near 167, 211–219 and 238–242). | Two decisions added: keep both names with a warning; old values fill blanks, then a once-only note. The conversions are in scope |
| 3 | **72B: 0 is erased elsewhere; the attorney emails are missing from the model.** | **Confirmed.** `convertGuardianSchedulesToAnnual()` maps every share with `wardPercent\|\|''` (`conversion.js` near 122–143); the Annual's Part VIII export writes `t.wardPct\|\|''` (`excel.js` near 468). `mk`/`emptyDataGuardian()`'s `attorney` has neither `email` nor `secondaryEmail` (`models/guardian.js` near 28) although D-2 collects both (`index.js` near 1177); the CSV has no Inventory `attorney.secondaryEmail` row. Also found: `convertGuardianExtrasToAnnual()` and the Inventory → Simplified mapping drop the attorney's email, and carry-over *into* an Inventory drops it, under a stale comment saying the Inventory has no attorney email (`carry-over.js` near 260). | 72B covers every share path (decision added), and the attorney emails in the model, the schema, carry-over and conversions |
| 4 | **72C: pruning, carry-over, the Plans, email classification.** | **Confirmed.** Three hand-kept "guardian has data" lists omit email (Inventory `index.js` near 95, 1105, 1421), and carry-over into an Inventory omits guardian email (`carry-over.js` near 235). On the Plans: the Simplified Plan blocks without Guardian 1's email (`plan-simplified/index.js` near 395); the Annual Plan and Plan for Minors collect it unchecked; the Initial Plan has no field; the Plan for Minors prints the attorney's email but never checks it. Party emails are classed `personal`, form emails `none` (a label nothing reads). | 72C covers the lists, carry-over and all four Plans (decision added); every email row is relabelled `personal` (decision added) |
| 5 | **72A's test** fills only the first page plus one row, checks only captions and formulas (a value in the wrong empty box passes), and splits names at commas. | **Confirmed** (the earlier design). The Annual's Schedule B-4 alone has 51 pages. | 72A's test now puts a marked value on every template page, each checked against its expected cell; captions and formulas are checked separately; it extends `excel-form-field-placement.spec.ts`; and the name rule is a conservative containment test with named hard cases |
| 6 | **The file and test inventory is incomplete**; "grep at build" is not enough. | **Confirmed.** | Each item now names its files and tests (Build order below, and each checklist) |
| — | 72A's defect, 72D's scope, 72E's two controls, 72F's explanation, 72I's two engines and 72J's scope are sound; 72F's sentence "it passed 60 s" should read "it exceeded the 60-second limit". | Agreed. | 72F's sentence corrected |

### Second review (same day)

Verdict as received: the factual errors are fixed, but the plan is still
not build-ready, because the same concepts weren't checked across
conversions, New Year and the other forms. Every point was checked:

| # | Codex's point | Checked | What changed |
| --- | --- | --- | --- |
| 1 | **The secondary attorney email is lost on six forms, not one.** | **Confirmed.** It is collected by the Annual (`attorney_secondaryEmail`, `index.js` near 826), the Simplified (same name, near 601), the Initial Plan (near 667), the Annual Plan (`attorney_secondary_email`, near 642), the Plan for Minors (near 432) and the Inventory (`attorney.secondaryEmail`). Only the Simplified Plan's model and data-model row include it. `extractCarryIdentity()` returns only the primary (`carry-over.js` near 110). | 72B covers every form's secondary email in its model, data model, carry-over and conversion (decision added) |
| 2 | **Certificate answers survive conversions and New Year.** | **Confirmed, and wider than reported.** New Year (`filing-years.js`, `resetYearlyFieldsForNewYear()`): the Inventory keeps its ward status, "no recipients required" answer and certificate signature date; the Annual and Simplified keep the method, the attestation and the certificate signature state and image; the four Plans keep every certificate field, the date included. Same-period conversions between the Annual family and the Simplified carry the service date, the method and both signature dates (`conversion.js` near 236–238 and 290–293), against the rule written above the Inventory → Annual mapping: *"Signature dates are never carried — the new filing is signed and served on its own date."* | 72G gets a certificate lifecycle matrix (two decisions added), and the year-rollover golden gets a stated expected behavior before it is regenerated |
| 3 | **72H's "first open" migration could repeat**: clearing a filled field would let the retained value fill it again. | **Confirmed** by the design as written. | A saved migration marker, set when the migration runs; tests for idempotence and for a cleared field staying clear |
| 4 | **The dismissible warning had no UI path.** `renderOutputAdvisories()` escapes plain text and has no actions (`output-advisories.js` near 5). | **Confirmed.** | The decision was re-asked at its true cost: the note moves to the certificate page, with a "Discard old details" button using that page's existing action dispatch |
| 5 | **The Plans' "attorney entered" tests differ**: the Annual Plan uses only `d.attorney` (near 788); the Plan for Minors uses name, signature date or signature state (near 525); the Initial Plan uses the shared table. | **Confirmed.** `attorney-block.js`'s `ATTORNEY_ENTRY` already defines every attorney field for the Inventory, Annual, Simplified and Initial Plan. | One shared definition per Plan (decision added); every attorney field is tested on its own |
| 6 | **72A's guard was underspecified**: text markers can't pass through money, percent, date or Yes/No cells, and one row per page misses each page's one-off boxes. | **Confirmed.** | Typed values, and a manifest of every box the exporters write (decision added) |
| 7 | **File inventories still incomplete** (`output-preflight.js`, `output-advisories.js`, `form-events.js`, `filing-years.js`, the models). | **Confirmed**, except where the redesign removes the need: no Preview & Export button is built, so `output-advisories.js` and `form-events.js` are untouched. | Listed below |
| 8 | **Framing.** The workbook having a ward-status box doesn't prove answering it is required; and "Security: None" is too strong where free text or migration logs can carry contact details. | **Agreed.** | Ward status recorded as the requester's decision (Pinellas practice); the method box and migration logs get explicit security notes, and the logs record field names, never values |

### Third review (same day)

Verdict as received: substantially stronger, but three gaps block the
build, with several smaller corrections. Codex confirmed everything raised
at the second review as addressed. Every point was checked:

| # | Codex's point | Checked | What changed |
| --- | --- | --- | --- |
| 1 | **72G doesn't migrate older workbooks.** Annual and Simplified workbooks exported before 72G hold the method in the box that becomes the ward's status, so the revised importer would read "mailed" as a ward status and lose the method. The saved marker can't help, because a workbook can be imported into a filing that is already marked. | **Confirmed.** Today the importers read that box into the method (Annual `excel.js` near 883, `PART X`!K23; Simplified near 401, J39). All three importers write into the open filing (`Object.assign(getD(), …)`, `getD().x = …`), so a marker set earlier stays set. | 72G design step 2: the importer reads the box by what it holds. Pre-72 workbook imports are tested on both forms |
| 2 | **72H would drop differing certificate details from older workbooks.** | **Confirmed.** The Inventory's importer reads `PART VI` into `serviceAttorney.*` (`excel.js` near 702); the Simplified's reads B43–J45 into `certAtty…` (near 409). Also found: the Simplified importer already fills a blank Part V from the certificate's boxes (`gc56('B19')` or else `gc56('B43')`, near 396), and the Simplified exporter writes Part V's values into a blank certificate (near 230), so most older Simplified workbooks hold the same values in both. Codex's "let the once-only migration fill the blanks" can't work at import, for point 1's reason, so the importer fills them itself. | 72H design step 8: importing compares the two blocks. Tests for "filing attorney blank", "both filled, different", and a 72H round trip with nothing to note |
| 3 | **72C: an incomplete attorney can silence the guardian-email warning.** Once its shared test is true, the Annual Plan would require only the email, not the name; the Simplified Plan has no attorney checks, so a lone phone number would silence the warning. | **Confirmed.** Annual Plan `index.js` near 774–788: the name is required only through the "/s/" signature check. **Also found (mine):** the Annual family has the same gap (`index.js` near 1697–1718: Bar number, phone, email and address required, the name only through "/s/"); its sidebar `a-p5` and the Annual Plan's `pa-p11` follow their validators and need the same change. | Three decisions (the requester, 10-02): the Annual family and the Annual Plan require the name; the Simplified Plan's attorney stays optional and counts only with name and email. 72C steps 7 and 9 |
| — | **Mine, found while checking point 3: the Simplified Plan's certificate can't find its attorney.** | Its certificate configuration reads `d.attorney` (`plan-simplified/index.js` near 414), but the form stores `attorney_name` (`models/plan-simplified.js` near 32). With an attorney entered, the certificate still defaults to the guardian (`resolveCertSigner()`, `plan-certificate-of-service.js` near 74). Choosing "Attorney" prints "Certified by (Attorney)" over a blank name, and the page's hint says the name will come "from the plan once it is entered there". In place since Milestone 68C (`0bd355d`). | Decision (the requester, 10-02): fixed in 72C, step 10 |
| 4 | **72A's Yes/No and dropdown values can't prove placement in one export**: two boxes both holding "Yes" can swap unnoticed. | **Confirmed**, by the design as written ("neighbouring entries using different members wherever the list allows"). | Re-asked at its added cost; decided: extra exports giving each such box on a sheet its own sequence of answers (72A step 4) |
| 5 | **The formula check should compare formulas**, not only confirm that a formula remains. | **Confirmed.** Blank-page pruning is the only code that writes formulas (`sheet-pruning.js`), and a filing at capacity prunes nothing. | Exact comparison, with an explicit expected-formula map for any intended rewrite (72A step 4) |
| 6 | **The migration hook's location is wrong**: `form-runtime.js` holds generic DOM and form helpers, not on-open passes. | **Confirmed.** Opening a filing runs `normalizeWardData()` (`normalize-filing.js`, from `state.js`'s `setActiveFiling()`). Form-specific migrations run in each feature's `mount()`, as `migrateBondDepository()` does (Inventory `index.js` near 181, Annual near 144), and again after an Excel import (Inventory `excel.js` near 615, Annual near 906). | A new pure module, `src/core/filing/certificate-migrations.js`, called from the affected `mount()`s once the filing is active (Build order; 72C step 10, 72G step 5, 72H step 6) |
| 7 | **`file_index.md` describes 72A's older coverage** ("a marked value on every template page"). | **Confirmed.** | Row rewritten |

---

## Build order and file overlap

Sequential, because the items share files. **Order: 72A, 72B, 72C, 72D,
72H, 72G, 72I, 72J, then 72E and 72F** (those two share nothing and can run
at any point).

| Item | Source | Tests and baselines |
| --- | --- | --- |
| 72A | `src/features/guardian-inventory/excel.js` (Part III writes, importer), `src/core/filing/form-derived-fields.js`, `src/core/excel/excel-engine.js` (the test-only write recorder), `src/core/testing/testing-adapter.js` (switching it on) | `tests/e2e/excel-form-field-placement.spec.ts` (extended), new `tests/e2e/support/workbook-vs-template.ts`, `tests/e2e/carry-balance-matches-prior.spec.ts`, `tests/unit/form-derived-fields.spec.js`, `tests/unit/excel-write-targets.spec.js` (header) |
| 72B | `src/features/guardian-inventory/index.js` (validator), every model in `src/core/filing/models/` with an attorney (`guardian.js`, `annual.js`, `simplified.js`, `plan-initial.js`, `plan-annual.js`, `plan-minor.js`), `src/core/filing/conversion.js` (share mappings, both attorney emails), `src/core/filing/carry-over.js` (`extractCarryIdentity()` and every destination), `src/features/annual-accounting/excel.js` (Part VIII), CSV | new `tests/unit/inventory-required-share-and-email.spec.js`, new `tests/unit/share-zero-paths.spec.js`, new `tests/unit/attorney-emails-carry.spec.js`, `tests/baseline/ms70-conversion-golden.json`, `ms70-70C-filing-shapes.json` |
| 72C | Inventory `index.js` (D-1 field, the three lists), `models/guardian.js`, `models/plan-initial.js`, `models/plan-simplified.js` (the signer marker), Inventory `pdf-model.js`, `src/core/filing/unrepresented-filing.js`, `src/core/filing/output-preflight.js` (the Plans' warnings), `src/core/validation/attorney-block.js` (Plan entries, the Simplified Plan's represented test), Simplified `index.js`, Annual `index.js` (the attorney's name), `src/core/status/completion.js` (`a-p5`, `pa-p11`, `pm-p7`), `src/core/filing/readiness-config.js` (re-read), `carry-over.js`, `conversion.js`, the four `plan-*/index.js` (incl. the Simplified Plan's certificate configuration) and `pdf-model.js`, new `src/core/filing/certificate-migrations.js` (the signer pin; 72H and 72G add theirs), CSV | new `tests/unit/guardian-email-advisory.spec.js`, new `tests/unit/plan-attorney-started.spec.js`, new `tests/e2e/guardian-email-advisory.spec.ts`, `tests/unit/attorney-block.spec.js`, `tests/unit/plan-certificate-of-service.spec.js`, `tests/e2e/plan-certificate-of-service.spec.ts`, `tests/unit/plan-annual-parity.spec.js`, `tests/unit/checklist-export-parity.spec.js`, `ms70-completion-golden.json`, `ms70-70C-filing-shapes.json` |
| 72D | `unrepresented-filing.js`, the three accounting `pdf-model.js` files | `tests/unit/attorney-optional.spec.js`, `tests/e2e/attorney-optional-export.spec.ts` |
| 72H | Inventory `index.js` (D-5 page, its "Discard old details" action), `pdf-model.js`, `excel.js` (`PART VI`, importer); Simplified `index.js` (Part VI page and action), `pdf-model.js`, `excel.js`; `models/guardian.js` and `models/simplified.js` (the migration marker); `src/core/filing/certificate-migrations.js` (the once-only fill and the import comparison), called from the Inventory's and the Simplified's `mount()` and used by their importers; `conversion.js` (near 167, 211–219, 238–242); `src/core/validation/attorney-block.js`; `form-derived-fields.js` (the name warning); `output-preflight.js`; CSV | new `tests/unit/certificate-attorney.spec.js`, new `tests/e2e/certificate-old-details.spec.ts`; every spec that names `serviceAttorney` or `certAtty…` today: `tests/e2e/attorney-optional-export.spec.ts`, `excel-form-field-placement.spec.ts`, `navigation-status.contract.spec.ts`, `pdf-accessibility-and-signatures.spec.ts`, `pdf-form-specific.spec.ts`, `pdf-structure-tags.spec.ts`, `signature-capture.contract.spec.ts`, `tests/e2e/support/fixtures.ts`, `tests/unit/attorney-optional.spec.js`, `pdf-model-column-integrity.spec.js`, `signature-block-fields.spec.js`, `tests/capture/guide-screenshots.capture.ts`; `ms70-conversion-golden.json` |
| 72G | the three accountings' `index.js`, `pdf-model.js` and `excel.js` (Annual `PART X`!K23, Simplified J39, importers), `src/core/filing/plan-certificate-of-service.js`, `src/core/form/plan-certificate-of-service-page.js`, `completion.js`, `conversion.js` (every certificate mapping), `carry-over.js` (certificate fields into a new filing), **`src/core/filing/filing-years.js`** (`resetYearlyFieldsForNewYear()`, all seven branches), `output-preflight.js` (the method warning), `certificate-migrations.js` (the ward-status move and the import reading of the box), called from the Annual's and the Simplified's `mount()` and used by their importers, the models (`guardian.js`, `annual.js`, `simplified.js`, the four Plan models), CSV | `tests/unit/plan-certificate-of-service.spec.js`, `tests/e2e/plan-certificate-of-service.spec.ts`, `excel-form-field-placement.spec.ts`, `pdf-form-specific.spec.ts`, `pdf-structure-tags.spec.ts`, `tests/unit/guardian-inventory-64a1-validation.spec.js`, `guardian-inventory-pdf-model.spec.js`, `field-kind-inference.spec.js`, `tests/e2e/support/fixtures.ts`, `guide-screenshots.capture.ts`; the goldens `ms70-70C-filing-shapes.json`, `ms70-completion-golden.json`, `ms70-conversion-golden.json`, `ms70-year-rollover-golden.json`; new `tests/unit/service-method.spec.js`, `tests/e2e/certificate-service-method.spec.ts` |
| 72I | `unrepresented-filing.js`, the Inventory's and the Annual's Cover wiring | new `tests/e2e/guardian-advocate-hint.spec.ts` |
| 72J | the three accountings' validators | a unit case per engine |
| 72E | Annual `index.js` | new `tests/e2e/signed-amount-keypad.spec.ts` |
| 72F | — | `tests/e2e/routes.spec.ts` |

- 72B and 72C both edit the Inventory's `index.js`, its model, `carry-over.js`
  and `conversion.js`.
- 72C and 72D both edit `unrepresented-filing.js` and the Inventory PDF
  model.
- 72H and 72G both reshape every accounting's certificate page, PDF and
  Excel. 72H goes first, so the method lands on the certificate's final
  shape.
- 72C, 72E and 72G all edit the Annual's `index.js`.
- Every item that adds or retires a field updates `TEST-INDEX.md`,
  `file_index.md`, the 70T progress list and the assertion-count baseline in
  its own commit.

---

## 72A — Inventory Part III, and a guard on every export

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

**What that check could not see:** a value written into the wrong *empty*
box, and anything on later pages (Independent review, point 5). The guard
below covers both.

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
   both are filled and Guardian #1's name is not found in the Cover's
   Guardian Name(s), Preview & Export shows a warning that never blocks:
   *"D-1 — Guardian #1 (NAME) is not among the Guardian Name(s) on the
   Cover (NAMES). The court's form fills Guardian #1's name from the Cover;
   this filing will be exported with Guardian #1's name as entered. Confirm
   which is right before filing."*

   **"Found in" is a conservative containment test, not a split.**
   - Both texts are normalized: case folded; runs of spaces and the
     punctuation `. , ; & /` reduced to single spaces.
   - Guardian #1's whole name must appear in the Cover's text as a run of
     whole words.
   - The Cover is never split at commas, so *"Smith, Jr."* and *"Acme
     Trust Co., Inc."* match themselves, and an "and" inside a name
     matches.
   - Any doubt resolves to **no** warning: a missed warning costs the
     filer nothing they wouldn't see on the printed form; a false one
     teaches them to ignore it.

   The file's header comment ("Annual family only") is updated. The same
   containment test is used by 72H's attorney-name warning.
4. **The guard.** It extends `tests/e2e/excel-form-field-placement.spec.ts`,
   the spec that already owns this class of defect. A new helper,
   `tests/e2e/support/workbook-vs-template.ts`, loads the exported file and
   the Clerk's template with ExcelJS. For each of the Inventory, the Annual
   and the Simplified, two separate checks run:
   - **Integrity.** It builds a filing with every schedule filled to
     capacity, so that no page is pruned. On every sheet the export keeps,
     the guard fails on any template caption whose text changed, and on any
     template formula whose exported expression differs from the
     template's (third review, point 5). Each failure names the cell.
     - Formulas are compared as ExcelJS reads them (`cell.formula`), which
       translates a shared formula into each cell's own expression (checked
       in the vendored `lib/exceljs.min.js`). The same formula saved in
       another form is therefore not a difference.
     - Allowed: cells carrying data validation (the dropdown defaults), and
       an exact list of decided overwrites: Annual `'PART II, III'!F25`
       (2026-09-19) and Inventory `'PART III'!F8` (2026-10-01).
     - Blank-page pruning is the only code that writes a formula
       (`sheet-pruning.js`), and a filing at capacity prunes nothing. Any
       intended rewrite goes in an explicit map from cell to expected
       formula, which starts empty, so a changed formula is never simply
       tolerated.
   - **Placement: every box the exporters write** (decided at the second
     review). The spec keeps a **manifest**, one entry per writable box:
     - each **one-off box** on every page (cover fields, signature blocks,
       Part III's 18, the bond block, each certificate's boxes);
     - **every column of one row on every page** of every schedule,
       including each of the Annual's 51 Schedule B-4 pages.

     Each entry gives the filing path, the expected sheet and cell, and a
     **typed test value** that survives its exporter unchanged and cannot
     be mistaken for another entry's:
     - money: a unique amount (e.g. 1,001.07, then 1,002.07);
     - percentages: a unique share that is a valid percent;
     - dates: a unique valid date;
     - choices and Yes/No: a valid member (see *Swaps between Yes/No and
       dropdown boxes*, below);
     - text: a unique string.

     The guard fills the filing from the manifest, exports, and reads each
     expected cell back. A value in the wrong box fails by name, even when
     no caption or formula was touched.

     **Swaps between Yes/No and dropdown boxes** (third review, point 4;
     decided at its added cost). A box with a short list of answers can't
     hold a value of its own, so two boxes both holding "Yes" could swap
     unnoticed in one export. The guard therefore runs a few more exports
     per form, changing only these boxes:
     - across the exports, every such box on the same sheet gets its own
       sequence of answers, never blank (Yes, No, Yes; No, Yes, Yes; …), so
       two swapped boxes read each other's sequence and fail;
     - every sequence includes at least one answer that differs from what
       the template's own cell holds, so a box left unwritten fails too;
     - a box written onto another sheet leaves its own box unwritten, or
       writes a cell the manifest doesn't list, which the completeness
       check below catches.

     About 2–3 extra exports per form are expected. The count follows from
     the sheet with the most such boxes, and is recorded in the Build
     record.

     **Completeness is checked too.** Every `setCell()`/`setDateCell()`
     target the exporters write must appear in the manifest. Literal
     addresses are compared by `excel-write-targets.spec.js`'s existing
     static reader. Run-time addresses are recorded by a test-only
     recorder in `src/core/excel/excel-engine.js`'s shared `setCell()` and
     `setDateCell()`, switched on through `GuardianForms.testing` for the
     guard's own export. The exporters import those writers as ES modules,
     which a test cannot patch from outside. A write the
     manifest doesn't know fails the guard, so a new field can't slip past
     it.

   A pre-72 workbook (values moved back onto the captions with ExcelJS) is
   imported through the real Import from Excel control, and the guardian
   details must arrive.

   **Cost.** The existing capacity round trip for all 11 Inventory schedules
   takes 16.5 s on D:. The three forms together are estimated at 2–3
   minutes on D:, plus 1–3 minutes for the extra Yes/No and dropdown
   exports (about half of both on C:), to be measured at build and recorded
   in the Build record.
   The manifest is the larger cost: several hundred entries, kept current
   whenever an exporter changes. The completeness check makes a stale
   manifest fail loudly rather than quietly.
5. `carry-balance-matches-prior.spec.ts` keeps its own formula check but
   takes the decided list from the new helper. Its comment calling F8 "not
   decided" is corrected.
6. `excel-write-targets.spec.js`'s header names its blind spot (addresses
   built at run time) and points to the guard.

### Cross-cutting checklist (AGENTS.md §8)

1. **Data model.** No new or changed field. Excel cell addresses live in the
   exporter, not the CSV.
2. **Legacy data.** Inventory workbooks exported before 72A import correctly
   through step 2's fallback. Nothing stored in a `.sav` changes.
3. **Fixtures.** None changed. The guard builds its own filings.
4. **Tests.**
   - Extended: `tests/e2e/excel-form-field-placement.spec.ts`.
   - New: the helper `tests/e2e/support/workbook-vs-template.ts`.
   - Extended: `tests/unit/form-derived-fields.spec.js`. The Inventory rule
     with named cases: an exact match; a co-guardian Cover (*"Jane Doe and
     John Doe"*); *"Smith, Jr."*; *"Acme Trust Co., Inc."*; a name
     containing "and"; extra spaces and punctuation; and a real mismatch
     that must warn.
   - Changed: `carry-balance-matches-prior.spec.ts` and the header of
     `excel-write-targets.spec.js`.
   - **Red-first:** against today's exporter, the integrity check names the
     15 Part III captions, and the placement check names the 15 misplaced
     values. A deliberately unlisted write fails the completeness check.
     Two checks have no defect in today's code to catch, so each is proven
     against a deliberate change that is never committed: two Yes/No writes
     swapped in one exporter fail the swap check by name, and one template
     formula replaced by another fails the integrity check.
   - `TEST-INDEX.md` and `file_index.md` rows, the 70T progress list and
     the assertion-count baseline, all in the same commit.
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

## 72B — Shares that mean what was entered, and the attorney's emails on every form

### What a filer observes

- **Blank shares.** On Inventory schedules A-2, B-1 to B-4 and C-1 to C-4
  (Ward's %), and C-5 (Joint Owner's %), the box is marked required, but a
  blank passes Preview & Export. A blank counts as 0%, so that asset's ward
  amount is $0. It silently drops out of the ward's totals, the bond and the
  audit-fee base. Only A-1 is checked ("Ward's % must be > 0").
- **Zero shares.** A share of exactly 0 turns into a blank in two places.
  Once 0 is an answer, a converted 0% share would show up as "required":
  - when an Initial Inventory is converted into an Annual;
  - when the Annual's Part VIII trust share is saved as Excel.
- **The attorney's emails.**
  - On D-2, "Primary Email (e-filing)" is marked required, but an
    Inventory with an attorney is exported without one. The Annual and
    Simplified require it once an attorney is entered.
  - Both D-2 emails, primary and secondary, are collected but missing from
    the Inventory's data model.
  - The email is lost when an Inventory is converted into an Annual or
    Simplified, and when a new Inventory is created from another filing.
  - **On every form**, the attorney's *secondary* email is typed on screen
    but missing from the form's data model, and it is never passed on when
    a new filing is made from an old one (second review, point 1).

### Evidence

- **Blank shares.** `validateGuardian()` (`guardian-inventory/index.js`,
  near lines 1375–1411).
  - A-1: `if(e.wardPercent<=0)` reports "must be > 0". A blank coerces to 0
    and is caught.
  - The other ten shares go only through 71C's range check,
    `percentProblem()`, which passes a blank.
  - `wardShare()` (`src/core/format/money.js`) counts a blank as 0%, as the
    Clerk's workbook does (`full × share`).
  - The Annual family's `checkRows()` requires `wardPct` on every started
    Schedule D row ("Ward's % is required"; 0 allowed), and so does its
    sidebar.
- **Zero shares**, each written `x||''`:
  - `convertGuardianSchedulesToAnnual()`, `src/core/filing/conversion.js`,
    near lines 122, 126, 129, 133, 136, 137 and 143: every Inventory share
    mapped into a Schedule D;
  - the Annual's Part VIII export, `annual-accounting/excel.js`, near line
    468: `t.wardPct||''`.

  No other share path in the features uses the pattern. The readers (71C's
  `shareFromWorkbookCell()`, the exporters' percent-cell helpers,
  `displayDecimal()`) are covered by the new test below rather than assumed.
- **The attorney's emails.**
  - The model: `emptyDataGuardian()`'s `attorney` has neither `email` nor
    `secondaryEmail` (`models/guardian.js` near line 28). D-2 renders both
    (`index.js` near 1177), and the PDF prints both. The CSV has
    `attorney.email` but no `attorney.secondaryEmail`.
  - D-2's check: `if(attorneyStarted){…}` requires the name, bar number,
    phone, street and city/state/zip, not the email.
  - Carry-over *into* an Inventory: `carryOverFieldsForAccounting()`
    computes the attorney's email and then discards it. Its comment says
    the Inventory has no attorney email (`carry-over.js` near 260), which
    is stale.
  - Conversion *out of* an Inventory: `convertGuardianExtrasToAnnual()`
    (near 167) and the Inventory → Simplified branch (near 211) copy the
    bar number, phone and address but not the email.
- **The secondary email, form by form:**

  | Form | Field | Collected on screen | In the model / data model |
  | --- | --- | --- | --- |
  | Inventory | `attorney.secondaryEmail` | D-2 (near 1177) | no / no |
  | Annual family | `attorney_secondaryEmail` | Part V (near 826) | no / no |
  | Simplified | `attorney_secondaryEmail` | Part V (near 601) | no / no |
  | Initial Plan | `attorney_secondaryEmail` | near 667 | no / no |
  | Annual Plan | `attorney_secondary_email` | near 642 | no / no |
  | Plan for Minors | `attorney_secondary_email` | near 432 | no / no |
  | Simplified Plan | `attorney_secondary_email` | yes | **yes / yes** |

  `extractCarryIdentity()` returns only the primary (`carry-over.js` near
  110), so carry-over never passes the secondary on. The conversions don't
  map it either.
- None of the Clerk's three workbooks has an attorney email box (searched
  with a parser). The emails appear on the app's PDFs only.

### Authority

- **Shares.** The Annual family's existing rule. The Clerk's workbook would
  compute a blank as 0%; the rule asks the filer to say so rather than
  assume it.
- **Email.** Fla. R. Gen. Prac. & Jud. Admin. 2.515(c) (July 1, 2026): *"A
  document signed under this rule must include a signature block containing
  the filer and each signer's name, electronic signature indicator, mailing
  address, telephone number, and e-mail address for service of court
  documents (if the document is filed or served electronically). If the
  signer is an attorney, the signature block must also include the signer's
  Florida Bar number and the party the signer represents."*

### Design

1. **Blank shares.** In `validateGuardian()`'s share loop, any schedule
   except A-1 reports a blank as an ordinary, overridable issue: *"B-1 row
   2 — Ward's % is required."*, or *"Joint Owner's %"* on C-5.
   - Blank means `''`, `null` or `undefined`. **0 is an answer.**
   - A-1 is unchanged.
   - The Inventory's sidebar is built from this validator, so the mark
     follows automatically.
2. **Zero shares.** The eight `x||''` sites become a blank test (`x === '' ||
   x == null ? '' : x`), so 0 stays 0 and a blank stays blank.
3. **The attorney's emails.**
   - `emptyDataGuardian()`'s `attorney` gains `email: ''` and
     `secondaryEmail: ''`, and the CSV gains `attorney.secondaryEmail`.
   - D-2's check gains
     `req(d.attorney.email,'D-2 Attorney — Primary Email','attorney.email')`
     inside the existing `if(attorneyStarted)` block. The D-2 marker already
     follows the attorney rule (71B). A filing with no attorney is
     untouched (AGENTS.md §4, the pro se and Guardian Advocate protection).
   - Carry-over into an Inventory carries both emails into `attorney`, and
     the stale comment is replaced.
   - Conversion out of an Inventory carries `attorney.email` to the
     destination's `attorney_email`.
4. **The secondary email on every form** (second review). Each form keeps
   its existing spelling; no field is renamed, so no stored value moves.
   - Each model's factory gains it: `guardian.js` (`attorney.secondaryEmail`),
     `annual.js` and `simplified.js` (`attorney_secondaryEmail`),
     `plan-initial.js` (`attorney_secondaryEmail`), `plan-annual.js` and
     `plan-minor.js` (`attorney_secondary_email`).
   - Each gets a data-model row.
   - `extractCarryIdentity()` returns `attySecondaryEmail`, read from any
     of the three spellings. Every carry-over destination writes it under
     its own spelling.
   - Every conversion that maps the primary email maps the secondary
     beside it.
5. Re-read `src/core/filing/readiness-config.js` and confirm it has no
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
     isAttorneyStarted())". The source becomes `emptyDataGuardian()`.
   - New secondary-email rows, optional: `guardian_inventory
     attorney.secondaryEmail`; `annual_accounting` and
     `simplified_accounting attorney_secondaryEmail`; `plan_initial
     attorney_secondaryEmail`; `plan_annual` and `plan_minor
     attorney_secondary_email`. The existing `plan_simplified` row stays.
   - Every email row is `sensitive` `personal` (the 10-02 decision; see
     72C).
   - `npm run verify:data-model`.
2. **Legacy data.**
   - Inventory filings on the test system with a blank share, or an
     attorney without an email, show an issue the filer can see and
     correct. No migration (AGENTS.md §8 item 2).
   - Existing attorney emails already sit on the stored `attorney` object,
     since the UI wrote them there. The factory change only gives new
     filings the keys.
3. **Fixtures.**
   - The 28 test files that build Inventory schedule rows are listed in the
     Build record as each is checked. Any row with no share gets one where
     a sibling required field already appears.
   - `fillMinimalValidGuardianWard()` is checked first, as is any Inventory
     fixture that starts an attorney without an email.
   - `ms70-conversion-golden.json` and `ms70-70C-filing-shapes.json` are
     regenerated by their own instructions, each with its note extended.
4. **Tests.**
   - New: `tests/unit/inventory-required-share-and-email.spec.js`. It
     covers:
     - each of the ten schedules, blank versus 0 versus 50;
     - A-1 unchanged;
     - an attorney with no email reported, and no attorney not reported;
     - the sidebar mark for one schedule and for D-2.
   - New: `tests/unit/share-zero-paths.spec.js`. A 0 share and a blank
     share go through each path and come out unchanged:
     - every conversion mapping;
     - the Annual's Part VIII export;
     - each importer's share reader.
   - New: `tests/unit/attorney-emails-carry.spec.js`. For every form, both
     attorney emails survive saving and reopening, every carry-over
     destination and every conversion, under each form's own spelling.
   - **Red-first:**
     - a blank share and a missing email pass;
     - a 0 share comes out blank;
     - the secondary email is missing after a carry-over.
   - `TEST-INDEX.md`.
5. **Export/import.** The Annual's Part VIII export changes for a 0 share.
   Validation, conversion and carry-over change.
6. **Security.** No new kind of data. The attorney's secondary email is
   already collected.
7. **UI/UX.** The existing markers become true; the messages use the
   validator's existing wording.
8. **Legal framing.** Rule 2.515(c) is quoted, not interpreted. Whether a
   given filing is "filed or served electronically" is the filer's matter.
9. **Cross-form.** The shares bring the Inventory to the Annual's rules
   (the Simplified has no shares). The secondary email covers all seven
   forms.

### Build record — NOT STARTED

---

## 72C — The guardian's email: the same warning on every form

### What a filer observes

Seven forms, four behaviors, for one rule:

| Form | Guardian email today |
| --- | --- |
| Initial Inventory | no field |
| Annual, Final, Trust | collected, marked required, never checked |
| Simplified Accounting | export blocked without it |
| Initial Plan | no field |
| Annual Plan, Plan for Minors | collected, not checked |
| Simplified Plan | export blocked without Guardian 1's |

The Plan for Minors also prints the attorney's email but never checks it,
while the Annual and Initial Plans require it once an attorney is entered.

**"Attorney entered" means different things on different Plans** (second
review, point 5). A half-entered attorney, say only a bar number, can count
as "no attorney" on one Plan. That raises the guardian-email warning
instead of asking the filer to finish the attorney.

**Two more gaps, from the third review:**
- **An attorney with no name.** On the Annual, Final and Trust accountings
  and on the Annual Plan, typing any attorney detail asks for the
  attorney's email (and on the accountings, the Bar number, phone and
  address), but not the name, unless the attorney signs with "/s/". The
  filed form can carry an attorney's Bar number and email under a blank
  name. The other five forms require the name.
- **The Simplified Plan's certificate can't find its attorney.** With an
  attorney entered, the certificate still defaults to the guardian as
  signer. If the filer picks "Attorney", the page says the name will come
  "from the plan once it is entered there", though it has been, and the
  PDF prints "Certified by (Attorney)" over a blank name.

### Evidence

- **Inventory.**
  - `mk.guardian()` has no `email`; D-1 renders none; the PDF prints none.
  - The data model nonetheless lists `guardian_inventory,
    guardians[].email` as optional, citing `mk.guardian()`: a row for a
    field that does not exist.
  - Three hand-kept "does this co-guardian have data?" lists, all without
    email:
    - `guardianHasData()` (`index.js` near line 95), used when cleaning up
      blank cards;
    - D-1's render filter (near 1105);
    - the validator's skip test (near 1421).
  - Carry-over into an Inventory builds its guardians without email
    (`carry-over.js` near 235).
  - The Clerk's Inventory workbook has no guardian email box.
- **Annual family.**
  - The Part III email field (`index.js` near 728) is drawn with the
    required marker.
  - `validateAnnual()`'s guardian checks (near 1639) don't include it, and
    neither does the sidebar's `guardianComplete`.
  - The workbook has a box (`'PART II, III'!B31`), and the exporter writes
    it.
- **Simplified.** `validateSimplified()` blocks (`req(g.email,'Part IV — … —
  Email Address',…)`), and its sidebar's `guardianComplete` requires it
  (`completion.js` near 113). The workbook has a box.
- **Plans.**
  - The Simplified Plan blocks: `req(g.email,'Signatures — Guardian 1 email
    is required',…)` (`plan-simplified/index.js` near 395).
  - The Annual Plan and the Plan for Minors render `planGuardians[].email`
    and never check it.
  - The Initial Plan's `planGuardians[]` has no email (`models/plan-initial.js`
    near 91; `plan-initial/index.js` near 617–624).
  - The Plan for Minors prints `attorney_email` (`pdf-model.js` near 292)
    but `validatePlanMinor()` never checks it. The Annual Plan (near 788)
    and Initial Plan (near 810) require it once an attorney is entered.
- **"Attorney entered", per form:**
  - `attorney-block.js`'s `ATTORNEY_ENTRY` lists every attorney field for
    the Inventory, the Annual, the Simplified and the Initial Plan
    (`isAttorneyStarted()`).
  - The Annual Plan tests only `d.attorney`, the name (`index.js` near
    788).
  - The Plan for Minors tests the name, signature date or signature state
    (`index.js` near 525). Its sidebar `pm-p7` (Milestone 71B) mirrors that.
  - The Simplified Plan has no started test.
- **The attorney's name, once an attorney is entered.**
  - The Annual family requires the Bar number, phone, email, street and
    city/state/zip (`index.js` near 1697–1706), and the name only through
    `checkSignatureState()`'s "/s/" check: Part V near 1712–1718, and the
    certificate near 1755–1762. Its sidebar `a-p5` (`completion.js` near
    194) also omits the name.
  - The Annual Plan requires the email (near 788), and the name only
    through the same "/s/" check (near 774–780). Its sidebar `pa-p11`
    (`completion.js` near 374) tests the bare name, matching its
    validator.
  - The Inventory (`attorneyForGuardian`, near 1353), the Simplified
    (`attorney`, near 770), the Initial Plan (near 802) and the Plan for
    Minors (near 526) require the name once an attorney is started.
- **The Simplified Plan's certificate.** Its configuration reads
  `d.attorney` (`plan-simplified/index.js` near 414), but the form stores
  `attorney_name` (`models/plan-simplified.js` near 32). The Annual Plan's
  reads `d.attorney`, its own field; the Initial Plan's and the Plan for
  Minors' read `attorney_name`. `resolveCertSigner()`
  (`plan-certificate-of-service.js` near 74) defaults to the attorney only
  when that name is found. In place since Milestone 68C (`0bd355d`).
- **Classification.** The Party record's emails are `personal`; every
  form-level email row is `none`. Only `verify-data-model.mjs` reads the
  label (to check it is one of six allowed values).

### Decision (the requester; Clerk practice)

- **10-01:** add the guardian's email to the Inventory. A missing one
  **warns, never blocks**, and only when **no attorney is entered**, on the
  Inventory, the Annual family and the Simplified. The Simplified's block
  becomes this warning.
- **10-02, extended:**
  - the same rule applies on all four Plans (the Simplified Plan's block
    becomes the warning, and the Initial Plan gains the field);
  - the Plan for Minors requires the attorney's email once an attorney is
    entered;
  - every email row is classed `personal`.
- **10-02, third review:**
  - once an attorney is entered, the Annual family and the Annual Plan
    require the attorney's name, as the other five forms do (the Annual
    Plan keeps requiring the email);
  - the Simplified Plan's attorney stays optional: the court's Simplified
    Plan has no attorney section, and the app prints none (Milestone 61E).
    Its guardian-email warning shows until the attorney's name and primary
    email are both entered;
  - the Simplified Plan's certificate is fixed to read its attorney's
    name.

### Design

1. **The fields.**
   - The Inventory: `mk.guardian()` gains `email: ''`. D-1 shows *"Email
     Address (for e-service)"* with no required marker, beside the phone.
     The PDF's Part III prints it with each guardian's details. No workbook
     box exists, so it is not written to Excel or imported.
   - The Initial Plan: `planGuardians[]` gains `email: ''`, the same label
     on its signature page, printed on its PDF.
2. **"Has data" includes the email.** The three Inventory lists (and the
   Initial Plan's equivalent, if it keeps one) count `email`, so a
   co-guardian who enters only an email is not treated as blank, hidden or
   cleaned up. Where a list exists only to repeat the field set, it becomes
   one shared list.
3. **Carry-over and conversion.** Guardian emails carry into an Inventory
   (`carry-over.js` near 235), and out of one through the conversions
   (`conversion.js`). The Plans' carry already maps `g.email`.
4. **One warning, seven forms.** For each guardian in play with no email,
   when no attorney is started:
   *"<section> — Guardian #2 has no email address. With no attorney, the
   court's rules expect each signer's e-mail address for service in the
   signature block when a document is filed electronically (Fla. R. Gen.
   Prac. & Jud. Admin. 2.515(c))."*
   - The accountings use `unrepresentedAdvisories()` (already called by
     `output-preflight.js`). The Plans use their own advisory channel.
   - "Attorney started" is **one shared definition per form**:
     `isAttorneyStarted(d, engine)`. See step 7, which also gives the
     Simplified Plan's own test.
   - The section label follows each form (D-1, Part III, Part IV, each
     Plan's signature page).
5. **Blocks and markers go.**
   - Remove `req(g.email,…)` from `validateSimplified()` and
     `validatePlanSimplified()`.
   - Remove `filled(g.email)` from the Simplified's sidebar
     `guardianComplete`, and the equivalent from the Simplified Plan's
     sidebar if present. A warning-only field never holds back a sidebar
     mark.
   - The Annual's guardian email field drops its required marker.
6. **The Plan for Minors' attorney email.** Inside `validatePlanMinor()`'s
   attorney-started block (step 7's predicate):
   `req(d.attorney_email,'Preparer & Attorney — Attorney email is
   required','attorney_email')`. Its field's marker follows the same rule.
7. **One "attorney entered" definition per Plan** (decided at the second
   review; the Simplified Plan's narrowed at the third).
   - `ATTORNEY_ENTRY` gains `planAnnual` and `planMinor` entries listing
     every attorney field each of those Plans has: name, Bar number, phone,
     street, city/state/zip, both emails, and the signature state and date.
   - Their validators wrap their attorney checks in
     `isAttorneyStarted(d, '<plan>')`: the Annual Plan in place of
     `if(d.attorney)`, the Plan for Minors in place of its three-field test.
   - **The Annual Plan then requires the name and the primary email**:
     `req(d.attorney,'Signatures — Attorney name is required','attorney')`
     beside the existing email rule. Its "/s/" check stops passing the name,
     which would only repeat that message (the convention
     `checkSignatureState()` documents, and the guardian's call follows).
     Its sidebar `pa-p11` uses the same predicate and requires both.
   - The Plan for Minors' sidebar `pm-p7` uses the same predicate for the
     attorney role. The preparer role keeps its own test.
   - **The Simplified Plan** gets no attorney checks.
     `isPlanSimplifiedRepresented(d)`, in `attorney-block.js`, is true only
     when `attorney_name` and `attorney_email` are both entered, and it
     alone decides whether the Simplified Plan's guardian-email warning
     shows.
   - `readiness-config.js`'s attorney items for these Plans are re-read so
     each still maps to an export error (AGENTS.md §4).
   - *What a filer sees:* on the Annual Plan and the Plan for Minors, typing
     any attorney detail asks for the attorney's name and email, and stops
     the guardian-email warning; a lone phone number is an unfinished
     attorney. On the Simplified Plan nothing new is asked, and the warning
     stays until the attorney's name and email are both entered.
8. **Completion golden.** Regenerate `tests/baseline/ms70-completion-golden.json`
   by its own instruction (`PG_UPDATE_GOLDEN=1`), with the Simplified and
   Simplified Plan changes, and `a-p5`'s and `pa-p11`'s attorney name,
   stated in its note.
9. **The Annual family's attorney name** (third review). Inside
   `validateAnnual()`'s `attorneyStarted` block:
   `req(d.attorney,'Part V — Attorney Name','attorney')`, in that block's
   own message style.
   - The issue's field path is `attorney`, as the existing "/s/" name
     issue's is (near 1718), so "Go to field" goes where that issue goes
     today.
   - The field is shared by Part I's "Attorney for Guardian" and Part V's
     "Attorney Name (linked to Part I)". Its required marker follows
     `isAttorneyStarted()` live, as Part V's other attorney fields do
     (`watchAttorneyRequiredMarkers()`).
   - The two "/s/" checks that pass the name (Part V near 1712, the
     certificate near 1756) stop passing it, so a blank name is reported
     once.
   - The sidebar `a-p5` adds `filled(D.attorney)`.
   - `readiness-config.js`'s Annual attorney items are re-read so each
     still maps to an export error (AGENTS.md §4).
10. **The Simplified Plan's certificate finds its attorney** (third review;
    decided).
    - Its certificate configuration reads `d.attorney_name`, as the
      Initial Plan's and the Plan for Minors' do.
    - *Existing filings.* A Simplified Plan certificate signed while the
      signer defaulted to the guardian would otherwise switch to the
      attorney, putting the guardian's signature under the attorney's
      name. So once, on a Simplified Plan's first open after 72C, a blank
      `certSigner` on a certificate carrying any signature (a date, an
      applied signature state, or an image) is saved as `guardian`: what
      it printed.
    - This runs from the new `src/core/filing/certificate-migrations.js`,
      called by the Simplified Plan's `mount()` once the filing is active.
      A saved marker, `certSignerMigrated`, stops it running again, so a
      certificate the attorney later signs under the default is never
      re-pinned. Nothing a filer sees changes, so nothing is logged.
    - An unsigned certificate defaults to the attorney once one is named,
      as on the other Plans.

### Cross-cutting checklist (AGENTS.md §8)

1. **Data model.**
   - `guardian_inventory guardians[].email`: the source becomes true,
     `required_when` "advisory only, when no attorney is started
     (Milestone 72C)".
   - The Annual's, Simplified's, Simplified Plan's, Annual Plan's and Plan
     for Minors' guardian email rows: `requiredness` `optional`, with the
     same advisory note.
   - A new `plan_initial planGuardians[].email` row.
   - `plan_minor attorney_email`: `conditional`, "an attorney is started".
   - `annual attorney` and `plan_annual attorney`: `conditional`, "an
     attorney is started (Milestone 72C)".
   - New: `plan_simplified certSignerMigrated`, boolean, factory default
     `false` (`models/plan-simplified.js`).
   - Every Plan attorney row whose requiredness says "an attorney is
     started" names `isAttorneyStarted()` as the test.
   - **Every email row in the CSV** (guardian, attorney, preparer,
     certificate attorney, party) has `sensitive` `personal`.
   - `npm run verify:data-model`.
2. **Legacy data.**
   - Inventory and Initial Plan filings have no `email` key; a missing key
     reads as blank, so the warning shows.
   - Simplified and Simplified Plan filings that were blocked can now
     export.
   - Annual-family and Annual Plan filings with attorney details and no
     name now show a required issue the filer can see and answer, so no
     migration for it (AGENTS.md §8 item 2).
   - Simplified Plan certificates already signed keep printing the
     guardian, by step 10's once-only pin. No other migration.
3. **Fixtures.**
   - Simplified and Simplified Plan specs that expect the blocking email
     issue: each found spec is named in the Build record and updated with
     its reason.
   - Completion-parity cases that fill an email to reach complete.
   - Plan fixtures that enter part of an attorney (for example a phone
     only): under step 7 they now need the attorney's remaining fields, or
     none.
   - For the name rule, checked 10-02: the Annual baseline in
     `tests/e2e/support/fixtures.ts` names its attorney (near 121), and the
     Annual Plan's `BASELINE` enters no attorney. `plan-annual-parity.spec.js`'s
     "/s/ with no name" case (near 195) still expects the attorney item to
     fail, now under the name rule as well.
   - Any `fillMinimalValid*` that fills a guardian email only to satisfy
     the old block.
4. **Tests.**
   - New: `tests/unit/guardian-email-advisory.spec.js`. It covers the seven
     forms:
     - no attorney and no email: a warning;
     - an attorney and no email: none;
     - an email entered: none;
     - never an export error;
     - the sidebars complete without one.
     - It also covers the three Inventory lists with an email-only
       co-guardian, the carry-over, and the Plan for Minors' attorney email
       required with an attorney.
   - New: `tests/unit/plan-attorney-started.spec.js`. On the Annual Plan
     and the Plan for Minors, **each attorney field on its own** counts as
     entered: it raises the attorney's name and email requirements and
     silences the guardian-email warning. An empty attorney counts as not
     entered. `pa-p11` and `pm-p7` follow the same predicate. On the
     Simplified Plan, a phone alone or a name alone leaves the warning, the
     name and email together silence it, and no attorney field ever raises
     an error.
   - Extended: `tests/unit/attorney-block.spec.js`. The Annual family with
     only a Bar number asks for the attorney's name, once (no second "/s/"
     message), and `a-p5` stays incomplete until the name is entered.
   - Extended: `tests/unit/plan-certificate-of-service.spec.js`. On a
     Simplified Plan with an attorney named, the signer defaults to the
     attorney and the PDF section prints the name. The pin saves `guardian`
     for a certificate signed under the default, never for an unsigned
     one, and runs once.
   - Extended: `tests/e2e/plan-certificate-of-service.spec.ts`. On a
     Simplified Plan, with real keystrokes, the attorney's name typed on the
     signature page is the certifier's printed name on the PDF.
   - New: `tests/e2e/guardian-email-advisory.spec.ts`. With real keystrokes
     on the Inventory's D-1 and the Initial Plan's signature page, the email
     is saved, printed on the PDF, survives reopening, and clears the
     warning.
   - **Red-first:**
     - the Simplified and Simplified Plan block;
     - the Inventory and Initial Plan have no field;
     - an email-only co-guardian is dropped;
     - the Plan for Minors passes with an attorney and no email;
     - an Annual Plan or Plan for Minors with only an attorney's bar number
       counts as "no attorney";
     - an Annual or Annual Plan with an attorney's Bar number and no name
       raises no name issue;
     - a Simplified Plan with its attorney named prints "Certified by
       (Attorney)" over a blank name.
   - `TEST-INDEX.md`.
5. **Export/import.** The Inventory and Initial Plan PDFs change; their
   workbooks have no box. The Annual and Simplified keep writing theirs.
   The Simplified Plan's certificate prints its attorney's name.
6. **Security.** A guardian's email is newly stored on the Inventory and
   the Initial Plan. It is classed `personal` like every email, encrypted in
   the `.sav` when a password is set, printed on the filed PDF, and never
   sent anywhere.
7. **UI/UX.** The same field, label and placement as the Annual's Part III
   email. The warning uses the existing advisory channels.
8. **Legal framing.** Rule 2.515(c) is quoted. That the office does not need
   the email to accept a filing, and that a warning is enough, is
   **Pinellas Clerk practice** (2026-10-01/02), not a reading of the rule.
   Another county may differ.
9. **Cross-form.** This item is the cross-form fix, authorized by the
   requester's answers.

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
  which is FAT32. Under full-suite load on D:, it exceeded the 60-second limit.
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

## 72G — The method of service and the ward's status, kept apart

*From the browser review, finding H1. **Rewritten 2026-10-02** after the
independent review: the first version said no certificate captured a method,
which was false (Independent review, point 1).*

### What a filer observes

- **The method exists, but it is mislabelled and goes to the wrong place.**
  - The Annual family, the Simplified and the four Plans have a free-text
    box labelled *"Indicate if (e.g. hand-delivered, mailed)"*. Filers type
    a method of service there.
  - On the Annual and Simplified, that text is written into the Clerk's
    workbook box "Indicate if:". On the Clerk's form, that box is the
    **ward's status**, a dropdown: *"Ward is totally incapacitated, Ward is
    under 14 years old, N/A"*.
  - So a filed Annual can carry "mailed" in the ward-status box, and
    neither form has anywhere to state the ward's status.
- **The Simplified blocks** export until that box is filled, and its
  sidebar requires it.
- **The Inventory keeps the two apart, but has no method at all.**
  - Its D-5 has a proper ward-status dropdown, "Indicate if Ward is:"
    (`serviceIndicateIf`), which is required and written to the workbook.
  - It has nowhere to say how the copies were served.
- **On the PDF**, the method is tacked onto the date line: *"on this date:
  09/30/2026 | mailed"*, or on the Simplified *"… | Indicate if: mailed"*.
- **Last filing's certificate answers carry into the next** (second review,
  point 2). A New Year, and some conversions, keep the old method, the
  "no recipients required" answer, the signer and signatures; on the Plans,
  even the service date. The next filing's certificate can look answered
  when it was never served.

### Evidence

- **Rule 2.516(f)** (July 1, 2026): *"A person establishes prima facie proof
  of service by including the following: (1) certification; (2) date of
  service; (3) name(s) of person(s) served (4) service address(es); and (5)
  method of service."* Probate Rule 5.041 sends service to Rule 2.516.
- **The Clerk's workbooks** (parsed):
  - the certificate sentence has no method (Inventory `PART VI`!B8, Annual
    `PART X`!B9, Simplified `PARTS V, VI `!B25);
  - each has "Indicate if:" with the ward-status dropdown (Inventory J25,
    Annual K23, Simplified J39).
- **The app**, field by field:

| Form | Method box | Ward-status box | Excel "Indicate if:" gets | Required today |
| --- | --- | --- | --- | --- |
| Inventory | none | `serviceIndicateIf` dropdown (`index.js` near 1263) | ward status (J25) ✓ | ward status (near 1489) |
| Annual family | `certIndicator`, "Indicate if (e.g. hand-delivered, mailed)" (`index.js` near 1559) | none | **the method** (`excel.js` near 513, K23; read back near 883) | neither |
| Simplified | `certIndicator`, same label (`index.js` near 681) | none | **the method** (`excel.js` near 211, J39; read back near 401) | the method (`index.js` near 846; `completion.js` near 137) |
| Four Plans | `certIndicator`, same label (`plan-certificate-of-service-page.js` near 45); data model: "method of service" | none (no Plan form has one) | — | neither |

- The PDFs print the method on the date line: the Annual
  `pdf-model.js` near 1142; the Simplified near 251 and 313;
  `plan-certificate-of-service.js` near 174. The Inventory prints *"Indicate
  if Ward is: …"* (near 860).
- **What carries today.**
  - Same-period conversions between the Annual family and the Simplified
    copy the service date, `certIndicator` and the certificate signature
    date (`conversion.js` near 236–238 and 290–293). They also copy the
    attorney's own Part V signature date, `attorney_signatureDate` (near
    235 and 285). That contradicts the
    rule written above the Inventory → Annual mapping (near 149–151):
    *"Signature dates are never carried — the new filing is signed and
    served on its own date."*
  - New Year (`filing-years.js`, `resetYearlyFieldsForNewYear()`):

    | Form | Cleared | Carried into the next year |
    | --- | --- | --- |
    | Inventory | `serviceDate` | `serviceIndicateIf`, `serviceNoRecipients`, the certificate's signature date, state and image, recipients |
    | Annual family | `certDate`, `certAttySignDate` | `certIndicator`, `certNoRecipients`, the signature state and image, recipients |
    | Simplified | `certServiceDate`, `certAttySignDate` | `certIndicator`, `certNoRecipients`, the signature state and image, recipients |
    | Four Plans | nothing on the certificate | `certDate`, `certIndicator`, `certNoRecipients`, `certSigner`, `certSignatureDate`/`State`/`Image`, recipients |

  - `tests/baseline/ms70-year-rollover-golden.json` records today's
    behavior without saying what is intended, so regenerating it blindly
    would bless the stale certificate.
- **Milestone 71's record.** 71B's design (step 5) said the guardian's
  certificate reused the attorney certificate's *"method fields"*. A method
  box did exist on the Annual and Simplified, but under a ward-status label
  and wired to the ward-status cell, and the Inventory had none. The claim
  was half right, for the wrong reason.

### Decisions (the requester, 2026-10-02)

- **The method:** use the existing free-text box, relabelled, on all seven
  certificates, adding one to the Inventory. PDF only. A missing method
  **warns, never blocks**, so the Simplified's block goes.
- **The ward's status:** a separate dropdown on the Annual and Simplified,
  like the Inventory's. It, not the method, fills the workbook's "Indicate
  if:" box. **Required** on all three accountings.

### Design

1. **The method box.**
   - `certIndicator` on the Annual family, the Simplified and the Plans
     stays the method. It is relabelled *"How were the copies served?
     (e.g. U.S. Mail; e-mail to the attorney, mail to the ward)"*.
   - The Inventory gains `serviceMethod` with the same label on D-5.
   - It is one box per certificate. Mixed service is written out in it;
     there are no per-recipient methods. That is a stated limitation.
2. **The ward-status dropdown.**
   - The Annual family and the Simplified gain `certWardStatus`, a select
     with the workbook's three values, like the Inventory's
     `serviceIndicateIf`.
   - It is written to the workbook box (Annual K23, Simplified J39). The
     method is no longer written there.
   - **Importing a workbook reads that box by what it holds** (third
     review, point 1). Workbooks exported before 72G hold the method
     there. An import writes into the open filing, whose migration marker
     may already be set, so the marker can't catch them:
     - one of the three ward-status values (case and spacing ignored) →
       `certWardStatus`;
     - any other text → the method, `certIndicator`. The ward's status is
       left as the filing has it, since that workbook carries none;
     - blank → the ward's status is unanswered.
     - The filing's method is otherwise left as it is. A workbook exported
       after 72G carries no method, and an absence must not erase what the
       filer typed (Milestone 67A's rule for the preparer on import).
     - It uses the same classification as the on-open move (step 5), from
       `certificate-migrations.js`.
   - **Required**, as an ordinary, overridable issue: *"Part X — Indicate if
     Ward is: is required"* (and the Simplified's Part VI equivalent). The
     Inventory's existing requirement is unchanged.
   - That it is required is **the requester's decision, recorded as Pinellas
     Clerk practice** (2026-10-02). The workbook having the box does not by
     itself establish that answering it is required.
   - The Annual's (`a-p10`) and Simplified's (`s-p6`) sidebar marks check
     `certWardStatus` in place of `certIndicator`.
3. **On the PDF**, every certificate prints the method on its own line,
   after the recipients and date: *"Method of service: U.S. Mail"*. With no
   method, the line is omitted. The ward's status prints as the Inventory's
   does: *"Indicate if Ward is: Ward is under 14 years old"*.
4. **The warning.** In Preview & Export, when the certificate lists at least
   one recipient and the method box is empty: *"<section> — How the copies
   were served is not stated. Rule 2.516(f) lists the method of service
   among what a certificate of service includes."*
   - It is not shown when the filer affirms that no recipients are
     required.
   - It never blocks, and the sidebar is unaffected.
   - The Plans' warning goes through `planCertificateAdvisories()`.
   - The Simplified's `req(d.certIndicator,…)` and its sidebar requirement
     are removed.
5. **Existing data (visible inference).** On the Annual family and the
   Simplified, `certIndicator` holds whatever filers typed under the old
   label.
   - When the Annual or Simplified opens, a value that exactly matches one
     of the three ward-status values (case and spacing ignored) moves to
     `certWardStatus`, and `certIndicator` is cleared. This runs from
     `certificate-migrations.js`, called by each form's `mount()` once the
     filing is active, as `migrateBondDepository()` is today, so the
     Activity Log entry names the right filing and the change is saved.
   - A saved marker, `certIndicatorMigrated`, is set at once, so the move
     never runs twice.
   - The Activity Log records that the move happened and which field it
     went to. It records the field name, not the value.
   - The page shows both fields as they now stand.
   - Every other value stays as the method, since the label always asked
     for one ("hand-delivered, mailed").
   - A blank ward status then shows its required issue, so the filer sees
     and answers it.
   - Nothing is guessed from free text beyond an exact match.
6. **The certificate's lifecycle** (decided at the second review). A
   certificate describes one filing being served:

   | Event | Recipients | Service date | Method | "No recipients required" | Signer choice | Certificate signatures | Ward's status |
   | --- | --- | --- | --- | --- | --- | --- | --- |
   | Reopening the same filing | kept | kept | kept | kept | kept | kept | kept |
   | Same-period conversion (Annual family ↔ Simplified) | carried | blank | blank | blank | blank | blank | **carried** |
   | A later filing: Inventory → accounting, New Filing from Existing | carried | blank | blank | blank | blank | blank | blank |
   | New Year (all seven forms) | kept for review | blank | blank | blank | blank | blank | blank |

   - "Signer choice" means the Plans' `certSigner` and each guardian's
     `certifiesService` flag (71B).
   - "Certificate signatures" means every certificate signature date,
     state and image, whether attorney- or guardian-signed.
   - **The attorney's own Part V signature date** (`attorney_signatureDate`)
     also starts blank on an Annual family ↔ Simplified conversion, in both
     directions (`conversion.js` near 235 and 285). This was decided
     2026-10-02 as an addition to the certificate decision. Inventory →
     Annual already leaves it blank.
   - Mapped across forms, where they carry: `serviceIndicateIf` ↔
     `certWardStatus`, and the recipients by each form's existing mapping.
   - A blank ward status shows its required issue, and a blank method shows
     the warning (when recipients are listed). The filer re-answers both for
     the new filing.
   - Implementation: `conversion.js` (every certificate mapping),
     `carry-over.js` (certificate fields into a new filing), and all seven
     branches of `filing-years.js`'s `resetYearlyFieldsForNewYear()`.
   - **The year-rollover golden's note first states the intended behavior**:
     after New Year, every certificate field except the recipients is
     blank. The golden is then regenerated, and its diff reviewed against
     that statement.
7. **`MILESTONE-71-PROPOSAL.md`.** 71B step 5 gets a correction note
   pointing here.

### Cross-cutting checklist (AGENTS.md §8)

1. **Data model.**
   - New: `guardian_inventory serviceMethod`, and `certWardStatus` and the
     boolean `certIndicatorMigrated` for the annual and simplified scopes
     (`certWardStatus`: `enum`, the three values).
   - Changed: the annual, simplified and four Plan `certIndicator` rows get
     the label "Method of service" and become optional with the advisory
     note (the Simplified's was required).
   - The Annual and Simplified `certWardStatus` rows are `conditional`,
     "required (Milestone 72G)".
   - `npm run verify:data-model`.
2. **Legacy data.** Step 5's exact-match move is visible and logged; every
   other value keeps its meaning. A blank ward status is a visible issue.
   Workbooks exported before 72G import by step 2's reading of the box, so
   "mailed" arrives as the method, never as a ward status.
3. **Fixtures and baselines.**
   - Known references, to update with reasons:
     - `tests/e2e/support/fixtures.ts`, `tests/capture/guide-screenshots.capture.ts`;
     - `tests/unit/field-kind-inference.spec.js`,
       `guardian-inventory-64a1-validation.spec.js`,
       `guardian-inventory-pdf-model.spec.js`,
       `plan-certificate-of-service.spec.js`;
     - `tests/e2e/excel-form-field-placement.spec.ts`,
       `pdf-form-specific.spec.ts`, `pdf-structure-tags.spec.ts`,
       `plan-certificate-of-service.spec.ts`.
   - Each `fillMinimalValid*` for the Annual and Simplified gains a ward
     status.
   - The goldens `ms70-70C-filing-shapes.json`, `ms70-completion-golden.json`
     and `ms70-conversion-golden.json` are regenerated by their own
     instructions, with notes. `ms70-year-rollover-golden.json`'s note
     first states the intended certificate behavior (step 6), and its
     regenerated diff is checked against that statement.
4. **Tests.**
   - New: `tests/unit/service-method.spec.js`. It covers:
     - each form's PDF method line, with and without a method;
     - the ward-status line;
     - the warning (only with recipients and no method, never an export
       error);
     - the ward-status requirement on all three accountings;
     - the exact-match migration (a ward-status value moves; "mailed"
       stays; a second open changes nothing; the log entry holds no value);
     - **every cell of the lifecycle table**, for each conversion path and
       for each of the seven New Year branches;
     - the import reading of the box: each ward-status value, "mailed",
       blank, and the filing's method surviving the import of a workbook
       exported after 72G.
   - New: `tests/e2e/certificate-service-method.spec.ts`. With real clicks
     and keystrokes on the Inventory's D-5, the Annual's Part X, the
     Simplified's Part VI and one Plan, the method prints on the PDF, the
     ward's status lands in the exported workbook box (read with ExcelJS),
     and the method is not in that box. Both survive reopening.
     - **Workbooks exported before 72G** (third review): an Annual and a
       Simplified export, with "mailed" then put into K23 or J39 with
       ExcelJS, are imported through the real Import from Excel control
       into a filing whose `certIndicatorMigrated` is already set. The
       method reads "mailed", and the ward's status is unchanged. With "Ward
       is under 14 years old" in the box, it lands in the ward's status.
   - **Red-first:**
     - "mailed" lands in Annual K23;
     - the Inventory has no method;
     - the Simplified blocks without one;
     - a Plan's New Year keeps last year's service date and method;
     - an Annual → Simplified conversion carries the service date and the
       attorney's Part V signature date;
     - with the box read straight into the ward's status (the design as
       first written), an imported "mailed" arrives as the ward's
       status.
   - `TEST-INDEX.md`.
5. **Export/import.** The Annual and Simplified workbook boxes change
   meaning (ward status), along with their readers, which also read
   workbooks exported before 72G (step 2). The PDFs gain a method
   line.
6. **Security.**
   - The method box is free text, and filers may type names or e-mail
     addresses into it ("e-mail to jane@…"). `certIndicator` and
     `serviceMethod` are therefore classed `personal`, like the emails.
   - It is stored in the `.sav` (encrypted when a password is set), printed
     on the filed PDF, and never written to Excel.
   - The migration's Activity Log entry records field names and the action
     taken, never the value moved.
7. **UI/UX.** The ward status uses the Inventory's existing dropdown. The
   method box keeps its place, with a clearer label.
8. **Legal framing.** Rule 2.516(f) is quoted, not interpreted. Whether it
   governs the copies furnished under §744.362(1) and §744.367(4) is not
   decided here. That a missing method is a warning, not a block, is
   Pinellas Clerk practice (2026-10-02). That the ward's status is required
   is the requester's decision, recorded as Pinellas Clerk practice. The
   form's having the box is not offered as proof of it.
9. **Cross-form.** All seven certificates change together, and the three
   accountings now treat the ward's status alike.

### Build record — NOT STARTED

---

## 72H — The certificate's attorney is the filing's attorney

*From the browser review, finding M3. **Revised 2026-10-02** after the
independent review (point 2).*

### What a filer observes

- **Two Bar Numbers.**
  - On the Inventory's D-5, an attorney-signed certificate asks again for
    the attorney's name, Florida Bar number, phone and address, and prints
    those.
  - On the Simplified's Part VI, it asks again for the Bar number, phone
    and address.
  - A typo, or a later correction on D-2 or Part V, leaves the certificate
    printing different details for the same attorney. The review saw a
    seeded Inventory print Bar # 00123456 in Part IV and 01234567 in Part
    VI.
- **Two attorney names on the Inventory.**
  - The Cover's *"Attorney for Guardian"* fills the workbook: Summary I,
    and through the form's own links, Parts IV and VI.
  - D-2's *"Attorney's Name"* fills the PDF's signature block.
  - Nothing compares them, so the PDF and the Excel can name different
    attorneys.

### Evidence

**The Clerk's forms tie the certificate to the filing's attorney** (parsed):

| Form | Certificate attorney's name | Bar number, address, phone |
| --- | --- | --- |
| Inventory `PART VI` | J27 `='SUMMARY I '!D24` (Attorney for Guardian), as is `PART IV`'s I26 | separate boxes (B29, J29, B31, J31) |
| Annual `PART X` | K25 `=Attorney` | **linked**: B27 `=Attorney_Bar_No`, K27 `=Attorney_Address` |
| Simplified `PARTS V, VI ` | J41 `='PARTS I, II '!D15` | separate boxes |

**The app:**

- **Annual:** one attorney name (Part I). The certificate keeps only its
  own signature and date (`certAttySignDate`, `certAttySignatureState`,
  `certAttySignatureImage`). This matches the form.
- **Simplified:** re-typed `certAttyBarNumber`, `certAttyPhone`,
  `certAttyStreet` and `certAttyCityStateZip` (`index.js` near 648–651).
  - The PDF (near 327–329) and Excel (`excel.js` near 230–233) print them,
    falling back to Part V when blank.
  - The importer reads them back (near 409–411).
- **Inventory:** `serviceAttorney.name`, `barNumber`, `phone`,
  `streetAddress` and `cityStateZip` (`index.js` near 1268–1270).
  - The validator requires `serviceAttorney.name` (near 1491).
  - The PDF prints them (near 866–874); only the email falls back to D-2's.
    D-5 never had an email input, so that fallback reads a field nothing
    collects.
  - Excel writes them to `PART VI` B29, J29, B31 and J31 (`excel.js` near
    547–550).
  - The Inventory's names: the Cover's `attorneyForGuardian` goes to
    `'SUMMARY I '!D24` (`excel.js` near 177) and the PDF cover; D-2's
    `attorney.name` goes to the PDF signature block (`pdf-model.js` near
    690).
- **Conversions write the fields being retired:**
  - `conversion.js` near 167 reads `serviceAttorney` into the Annual's
    attorney;
  - near 211–219, Inventory → Simplified writes `certAtty…` from
    `serviceAttorney`, then `attorney`;
  - near 238–242, Annual → Simplified writes `certAtty…` from the Annual's
    attorney.

### Decisions (the requester, 2026-10-02)

- The certificate's attorney is the filing's attorney.
- The Inventory keeps both name fields. Preview & Export warns when they
  differ, saying which output prints which.
- Old certificate details fill blanks, then are noted once.
- **Changed at the second review:** the note moves from a dismissible
  Preview & Export warning to the certificate page, with a "Discard old
  details" button. The app's warnings are plain text with no buttons
  (`output-advisories.js`), so a Dismiss there would have needed new
  machinery: clickable warnings, wiring, saving, and a browser test.

### Design

1. **Inventory D-5 with an attorney.**
   - It shows *"Signed by NAME, Florida Bar # … — name and contact details
     come from D-2"*, read-only, like 71B's guardian-certifier line.
   - It keeps its own signature control and date
     (`serviceAttorney.signatureDate`, `signatureState`, `signatureImage`).
   - The name, Bar number, phone and address inputs go, and so does the
     D-5 attorney name check. D-2 already validates the attorney.
   - `attorney-block.js` already leaves `serviceAttorney` out of "attorney
     started", and that stays.
2. **The Inventory PDF's Part VI** prints D-2's attorney (`attorney.*`,
   including both emails), and the signature and date from
   `serviceAttorney.*`.
3. **The Inventory Excel's `PART VI`.**
   - B29, J29, B31 and J31 get D-2's Bar number, street, phone and
     city/state/zip.
   - G27 keeps the certificate's signature date.
   - J27 stays the form's link to the Cover's name.
   - The importer reads `PART IV` into D-2's fields and compares the
     certificate's boxes with them (step 8).
4. **Simplified Part VI.**
   - The four re-typed inputs go; its own signature and date stay.
   - The PDF and Excel use Part V's `attorney_*`.
   - The importer reads Part V's boxes into `attorney_*` and compares the
     certificate's (B43, J43, B45, J45) with them (step 8).
5. **The Inventory's two names.** `form-derived-fields.js` adds a rule,
   using 72A's containment test. When the Cover's `attorneyForGuardian` and
   D-2's `attorney.name` are both filled and neither contains the other,
   Preview & Export warns without blocking:
   *"D-2 — The attorney's name (NAME) differs from the Cover's Attorney for
   Guardian (NAME). The Excel workbook prints the Cover's name in Summary I
   and Parts IV and VI; the PDF prints D-2's name in its signature blocks.
   Confirm which is right before filing."*
   - "Robert T. Nguyen" against "Robert T. Nguyen, Esq." does not warn.
6. **Old certificate details** (decided; revised at the second review):
   - **Fill blanks, once.**
     - The first time a filing opens after 72H, each old D-5 or Simplified
       Part VI detail fills the matching D-2 or Part V field **only where
       that field is blank**. This runs from `certificate-migrations.js`,
       called by the Inventory's and the Simplified's `mount()` once the
       filing is active.
     - A saved marker, `certAttorneyMigrated: true`, is written in the same
       save, so the migration never runs again. A field the filer later
       clears stays clear; nothing resurrects it.
     - The Activity Log records which fields were filled. It records field
       names, never values: no Bar number or contact detail is copied into
       the log.
   - **Shown where they matter.** Old values that still differ from the
     filing's attorney appear on the certificate page, under the read-only
     "Signed by" line. For example: *"Entered on this certificate before:
     Florida Bar # 01234567. The certificate now prints D-2's (00123456)."*
     - A **"Discard old details"** button deletes them. That is an explicit
       deletion, as AGENTS.md §4 requires, through the page's existing
       action handling (`data-inventory-action` / `data-simplified-action`).
     - The note also disappears on its own once the values no longer
       differ.
     - Preview & Export does not show it.
   - **Kept until discarded.** The old values stay in the file, unused,
     until the filer discards them (AGENTS.md §4, non-destructive).
   - **Conversions stop writing them.** `conversion.js` near 167, 211–219
     and 238–242 map only the filing attorney's fields, so a converted
     filing starts with nothing to note.
7. **No attorney** (a guardian certifies): unchanged from 71B.
8. **Importing a workbook** (third review, point 2). A workbook exported
   before 72H can hold certificate details that differ from the filing
   attorney's. For each of the Bar number, street, phone and
   city/state/zip, the importer compares the filing attorney's box
   (Inventory `PART IV` B28, I28, B30, I30; Simplified `PARTS V, VI ` B19,
   J19, B21, J21) with the certificate's (Inventory `PART VI` B29, J29,
   B31, J31; Simplified B43, J43, B45, J45):
   - **the same, or the certificate's blank:** nothing is kept for the
     certificate. Its old-detail field is cleared, as today's import
     replaces it.
   - **the filing attorney's blank, the certificate's filled:** the
     certificate's value fills the filing attorney's field at import. The
     Simplified's importer already does this (near 396); the Inventory's
     gains it. It can't wait for the once-only migration, because the
     import writes into the open filing, whose marker may already be set.
   - **both filled and different:** the certificate's value is kept in its
     old-detail field (`serviceAttorney.*` or `certAtty…`), so the
     certificate page shows it with "Discard old details".
   - A workbook exported after 72H holds the same values in both, so it
     imports with nothing to note.
   - Values are compared after trimming spaces and nothing else, so a real
     difference is never hidden.
   - Names are not compared: on both workbooks, the certificate's name is
     a formula linking to the Cover's.

### Cross-cutting checklist (AGENTS.md §8)

1. **Data model.**
   - The Inventory's `serviceAttorney.name`, `barNumber`, `phone`,
     `streetAddress` and `cityStateZip` rows, and the Simplified's four
     `certAtty…` rows: the notes read "retained; no longer entered or
     printed; filled into the filing attorney's blank fields on first open
     (Milestone 72H)".
   - The `serviceAttorney.email` row describes a field no model or form
     has; it is removed.
   - New: `certAttorneyMigrated`, boolean, on both scopes. Its factory
     default is `false` (`models/guardian.js`, `models/simplified.js`).
   - `npm run verify:data-model`.
2. **Legacy data.** The fill runs once and is logged by field name.
   Differences stay visible on the certificate page until the filer
   discards them or makes them match. Nothing is deleted without the
   filer's click. Older workbooks import by step 8: a blank filing-attorney
   field is filled, and a differing certificate value is kept and shown.
3. **Fixtures.** Every spec that names `serviceAttorney` or `certAtty…`
   today, listed under Build order, is updated with its reason. So is
   `tests/e2e/support/fixtures.ts`'s D-5 fill, and any `fillMinimalValid*`
   that fills the D-5 name for its old requirement.
4. **Tests.**
   - New: `tests/unit/certificate-attorney.spec.js`. It covers:
     - both engines' PDF models printing D-2's or Part V's details;
     - the name warning, including "Esq." against no "Esq.", and a real
       difference;
     - the migration:
       - the first open fills blanks only;
       - a second open changes nothing;
       - a canonical field the filer clears after the migration stays
         clear;
       - the marker is independent of the note;
       - the log entry holds field names, no values;
     - the note: shown on a difference, gone when the values match;
     - the import comparison (step 8): the same, the certificate blank, the
       filing attorney blank, both different, and a difference in spaces
       only;
     - the conversions writing no `certAtty…` or `serviceAttorney` detail.
   - Extended: `tests/e2e/excel-form-field-placement.spec.ts`. A Bar number
     typed on D-2 appears in the PDF certificate and in the exported `PART
     VI`!B29, read with ExcelJS.
   - New: `tests/e2e/certificate-old-details.spec.ts`. A filing saved with
     differing D-5 details is opened: the note shows; the **real "Discard
     old details" button** is clicked; the filing is reloaded; the note
     stays gone and the old values are absent from the saved filing.
     - **Workbooks exported before 72H** (third review), on the Inventory
       and the Simplified, each imported through the real Import from Excel
       control into a filing whose `certAttorneyMigrated` is already set:
       - filing-attorney boxes emptied and the certificate's filled (edited
         with ExcelJS): the filing attorney's fields arrive filled, with no
         note;
       - both filled and different: the note shows the certificate's
         values, with "Discard old details";
       - a workbook exported after 72H: no note.
   - **Red-first:** D-5's own value prints, and the conversion writes
     `certAtty…`. With the importer reading only the filing attorney's
     boxes (the design as first written), a differing certificate value is
     lost, and the Inventory's blank D-2 Bar number stays blank.
   - `ms70-conversion-golden.json` is regenerated with a note.
   - `TEST-INDEX.md`.
5. **Export/import.** The Inventory's `PART VI` and the Simplified's
   certificate boxes change in both directions; older workbooks import by
   step 8. The conversions change.
6. **Security.** The old certificate details are contact details and a
   Bar number. The migration copies them only into the filing's own
   attorney fields, never into the Activity Log, and the Discard button
   removes them from the file.
7. **UI/UX.** Reuses 71B's read-only "Signed by … — details come from …"
   line, the page's existing action buttons, and the existing advisory
   channel for the name warning.
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
  validation on all three accountings and all four Plans, 72D, 72G and 72H
  change every accounting's PDF, and 72G changes the four Plans'
  certificates. **Recommend `npm test` after the last item**, to be run
  only with the requester's go-ahead. On D: it takes about 1.7 h.

---

## Not in scope

- **Part VIII's trust amount prints as a date in Excel.** `D16`–`D18` carry
  the Clerk's date format. Confirmed by Milestone 71A; still open.
- **Activity-log entries tagged with the wrong filing.** Listed in
  `MILESTONE-71-PROPOSAL.md`; still open.
