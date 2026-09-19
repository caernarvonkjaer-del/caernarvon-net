# Milestone 57: Filing Fidelity, Evidence Gates, and Durable Encrypted Restore — Scoping & Execution Proposal

## Status

**Active Execution & Staged Delivery.** The requester selected a PDF-or-explicit-override gate for populated financial schedules and durable encrypted local resume. Working-tree implementations now cover 57A, 57B, 57C, 57D, 57E-1, 57F, 57G, and 57H. 57E-2 remains deferred pending an approved fee formula. Browser tests and visual output review remain outstanding by requester instruction. The original proposal/decision ledger below records the pre-implementation scope; the current implementation decisions are recorded here.

Current delivery decisions: 57C applies to populated Inventory and Annual Accounting financial schedules and requires an eligible PDF or a per-period filer override; it does not assert a legal duty to file every receipt. 57D uses stable account IDs and a sorted PDF register with bank/account on each row. The bundled Excel B-4 register has one bank/account header, so Excel export is stopped when disbursements use multiple accounts; PDF remains available. 57E-1 captures trust-accounting choice/value without changing the existing fee calculation. 57F writes the repeated workbook ward/case headers directly, formats dates as MM/DD/YYYY, widens/formats B-4 amounts, and separates PDF period dates. 57G corrects the Plan attachment heading. 57H retains a neutral encrypted local-resume action while continuing to recommend a separate `.sav` backup.

### Delivery & Verification Ledger

| Sub-delivery | Scope & Purpose                                                                                      | Status                                | Verification Record                                                                                                                     | Remaining Gating Decision                                                                  |
| :----------- | :--------------------------------------------------------------------------------------------------- | :------------------------------------ | :-------------------------------------------------------------------------------------------------------------------------------------- | :----------------------------------------------------------------------------------------- |
| **57A**      | Explicit bond-waived and restricted-depository tri-states                                            | **Implemented in working tree**       | Syntax clean; data-model verified (957 rows); targeted unit & parity contracts verified; browser e2e deferred per requester instruction | Confirm court-form wording and official Excel/PDF placement across all target county forms |
| **57B**      | Certificate of Service: single recipient, optional cards, filer "none" attestation, conversion reset | **Implemented in working tree**       | Syntax clean; data-model verified; conversion reset implemented; browser tests intentionally deferred per requester instruction         | Production release confirmation                                                            |
| **57C**      | Supporting-document evidence gate for populated financial schedules                                  | **Implemented in working tree**       | Syntax clean; case-insensitive 1:1 parity with nav checks verified; unit contract added; browser tests deferred                         | Policy matrix review for future circuits                                                   |
| **57D**      | Schedule B-4 Bank Accounts collection, non-destructive deletion, alphanumeric sort                   | **Implemented in working tree**       | Syntax clean; data-model verified; unit contract added; multi-account Excel safety guard in place; browser tests deferred               | Court template multi-page capacity audit                                                   |
| **57E**      | Trust accounting capture (57E-1) and authority-backed audit fee (57E-2)                              | **57E-1 Implemented; 57E-2 Deferred** | Syntax clean; data-model verified; 57E-1 nonnegative validation & manual fee notice active; formula deferred                            | Await statutory/circuit consensus for 57E-2                                                |
| **57F**      | Export fidelity repairs (Excel headers, MM/DD/YYYY dates, B-4 widths, PDF period split)              | **Implemented in working tree**       | Syntax clean; annual & guardian Excel visual dates/headers updated; PDF period date split verified; visual review deferred              | Visual export inspection on target viewers                                                 |
| **57G**      | Annual Plan terminology audit across all UI, preview, and output surfaces                            | **Implemented in working tree**       | Syntax clean; schedule docs period label conditioned on plan vs. accounting; educational comparisons preserved                          | Production release confirmation                                                            |
| **57H**      | Durable encrypted session restore, neutral resume entry point, and persistence lifecycle             | **Implemented in working tree**       | Syntax clean; neutral resume action in place; cache persistence on export/import active; security review staged                         | Ongoing threat-model review for public/shared devices                                      |

---

## Purpose

Address reported Guardian Inventory, Annual Accounting, Annual Plan, Excel/PDF output, and encrypted-save restore defects. The objective is to make entered filing data faithfully represent the filer’s choices, keep required supporting evidence visible before export, prevent court output misattribution, and make the password-protected save choice reliably survivable across a browser close and re-open.

This milestone does **not** decide what Florida law or a judicial circuit requires. Where an item touches court-facing options, recipient rules, audit-fee calculations, or attachment mandates, implementation must adhere to the legal hierarchy defined in `AGENTS.md` §5 (Florida Statutes & Probate Rules > Circuit Administrative Orders > Clerk Workslips) before it becomes a hard export blocker.

---

## Reported Issue Register

| Delivery | Reported Need                                                                                     | Filing Scope                                          | Risk                                                |
| :------- | :------------------------------------------------------------------------------------------------ | :---------------------------------------------------- | :-------------------------------------------------- |
| **57A**  | Explicit bond-waived and restricted-depository choices                                            | Guardian Inventory; Annual Accounting where supported | High — court-facing data                            |
| **57B**  | Certificate of Service: permit a single recipient and an explicit “none” selection                | Guardian Inventory and Annual Accounting              | High — legal-policy gating                          |
| **57C**  | Require supporting-document upload when a schedule has entered items                              | Populated financial schedules                         | Medium — validation/export parity                   |
| **57D**  | Add bank name/account once, then associate B-4 disbursements to that account                      | Annual Accounting Schedule B-4                        | High — persisted financial data & template mapping  |
| **57E**  | Ask whether trust accounting exists and capture trust-asset value for audit-fee determination     | Annual Accounting                                     | High — statutory audit calculation                  |
| **57F**  | Correct Excel headers, dates, and amount-cell display; correct PDF period-end clipping            | Guardian Inventory and Annual Accounting exports      | Medium — court output fidelity                      |
| **57G**  | Ensure Annual Plan never renders Accounting terminology                                           | Annual Plan shell, preview, and output                | Low — user-facing copy                              |
| **57H**  | Restore an encrypted save after browser close/reopen when the filer returns and supplies password | App shell / persistence / crypto                      | High — data-loss perception & security threat model |

---

## 57A — Bond and Restricted Depository Choices

### Status: REVERTED. Design settled, not authorized (2026-09-19)

The "Implemented in working tree" state this section described was reverted
with the rest of Milestone 57. **Neither `bondWaived` nor `restrictedDepository`
exists in `src/` today** — though both are still documented in
`probate-guardian-data-model.csv`, which the revert left ahead of the code.
Decision **D6** and the executable design are in `MILESTONE-57-RESCOPE.md`;
the scope below records what was originally asked for.

### Implemented Scope

- Explicit tri-state choices (`''` unanswered, `'Yes'`, `'No'`) for whether bond was waived and whether a restricted depository applies.
  - Guardian Inventory: `bondWaived`, `bondWaivedDate`, `restrictedDepository`, `restrictedDepositoryName`, `restrictedDepositoryReceiptDate`.
  - Annual Accounting: `bondWaived`, `restrictedDepository`, `restrictedDepositoryName`, `restrictedDepositoryReceiptDate`.
- Non-destructive UI toggling: Dependent detail inputs are displayed only when affirmative (`'Yes'`), but toggling away never deletes entered data.
- Readiness and export validation parity: Unanswered fields or missing dependent details are validated 1:1 between sidebar status and export validation.
- Data dictionary updated in `probate-guardian-data-model.csv` (957 verified rows).

### Acceptance Criteria

- A filer can select bond waived and/or restricted depository without contradictory fields or missing labels.
- Reopening a saved legacy or new `.sav` preserves all values without defaulting unanswered fields to `'No'`.
- Excel and PDF exports reflect entered choices without inventing data.

---

## 57B — Certificate of Service Recipient Rules & Portability

### Status: REVERTED. Design settled, not authorized (2026-09-19)

Reverted with the rest of Milestone 57. `certNoRecipients` and
`serviceNoRecipients` exist nowhere in `src/` or in the data model. Decision
**D7** (a service attestation does not survive a filing conversion) and the
executable design are in `MILESTONE-57-RESCOPE.md`. The filer-attestation
wording below is load bearing and should be carried across verbatim.

### Scope and Filer-Attestation Policy

- **Filer Attestation:** The selection `"No recipients are required for this certificate (filer attestation — app does not determine legal necessity)"` records the filer's legal assertion; the app does not provide legal advice or certify service sufficiency.
- **Recipient Constraints:**
  - When "No recipients" is selected (`certNoRecipients = 'Yes'` or `serviceNoRecipients = 'Yes'`), recipient cards are hidden without deleting entered data. Export validation and readiness ignore empty recipient cards.
  - When "No recipients" is not selected, exactly **one** complete recipient (Recipient 1) satisfies validation. Additional recipient cards (2+) are optional, but if partially filled, validation blocks export until either completed or cleared.
- **Excel Import Asymmetry:** A blank recipient section in an imported Excel file remains unanswered (`''`); it intentionally does **not** infer "No recipients required."
- **Filing Conversion Portability Rule:** When converting an Initial Inventory to an Annual Accounting (via `convertGuardianExtrasToAnnual`) or Simplified Accounting (`convertToSimplified`), service attestations do **not** silently carry over:
  - `serviceNoRecipients` does **not** map automatically to `certNoRecipients`.
  - Service attestations reset to unanswered (`''`), requiring the filer to consciously attest to service requirements for the new accounting period. Recipient address cards are safely migrated.

### Acceptance Criteria

- One complete recipient passes export validation where service is required.
- Selecting "None" clears recipient blockers and suppresses recipient printing in court outputs.
- Conversion between filing types resets the service attestation to unanswered, flagging a review notice on the new form.
- Readiness and export validation remain strictly 1:1.

---

## 57C — Supporting-Document Evidence Gate

### Status: Implemented in working tree

### Scope & Schedule Policy Matrix

The evidence gate applies to schedules populated with financial entries. It does not apply to non-evidentiary narrative pages or Plan forms that merely reuse the attachment UI.

The app uses the established storage structure: `D.scheduleDocs[scheduleKey][periodKey].files`.

Before implementation, every schedule must be classified into one of four policy tiers:

| Tier  | Policy Category               | Description                                                                                                              | Validation Impact                                                                     | Technical Document Rule                                                                                                                   |
| :---- | :---------------------------- | :----------------------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------ | :---------------------------------------------------------------------------------------------------------------------------------------- |
| **1** | **None**                      | No document required (e.g. Schedule B-1 Court-Approved Fees).                                                            | None                                                                                  | None                                                                                                                                      |
| **2** | **Manual Reminder**           | Procedural reminder for unobservable duties.                                                                             | Non-blocking guidance; never halts export.                                            | Visible checklist item in readiness panel.                                                                                                |
| **3** | **Auto Blocker (Attached)**   | Machine-verifiable requirement for documents merged into the court filing packet.                                        | Blocks export (bypassable with affirmative filer acknowledgement per `AGENTS.md` §4). | At least one file satisfying `isFilingEligibleSupplement(file).eligible === true` (byte verified, valid pages, uncorrupted, unencrypted). |
| **4** | **Record Retention Advisory** | Statutory duty to retain records (e.g. canceled checks, vouchers) for clerk audit upon request, but not filed on docket. | Non-blocking advisory notice.                                                         | Document guidance displayed in schedule footer.                                                                                           |

### Document Health & Clearing Rules

- A technical attachment check must verify real PDF bytes via `isFilingEligibleSupplement(file)` in `src/core/pdf/supplemental-pdf.js`; checking file extension or MIME type alone is insufficient.
- Non-destructive behavior: Removing a row from a schedule clears that schedule's evidence blocker, but never deletes previously uploaded files.
- Uploads remain locally stored and period/schedule scoped across reporting periods.

### Acceptance Criteria

- Populating a row on a Tier 3 schedule triggers an `auto` blocker in both readiness and export validation.
- Uploading an eligible PDF clears the issue; removing schedule entries clears the issue while retaining the uploaded file.
- Tier 2 and Tier 4 schedules display advisory guidance without blocking PDF/Excel generation.

---

## 57D — Annual Accounting Schedule B-4 Bank Accounts & Disbursements

### Status: REVERTED. Template scoping pass complete, scope not yet decided (2026-09-19)

Reverted. Master writes Schedule B-4 to `SCH B-4 OTHER DISB p2` only, rows
20-44, capped at 25 entries. The template's real capacity was re-verified
against the embedded workbook on 2026-09-19 — see the scoping results in
`MILESTONE-57-REVIEW-HANDOFF.md`. Scope is Alan's to set from those numbers.

### Scope & Data Contract

Introduce a multi-account organization system for Annual Accounting Schedule B-4 disbursements while safeguarding official court template fidelity.

- **Account Collection:** Add `schB4Accounts[]` to state and `probate-guardian-data-model.csv` (Bank Name, Account Number, and stable Identifier). Classified as `financial` sensitivity.
- **Account Identity Lifecycle:**
  - Account IDs must be opaque, immutable strings generated once upon creation using `crypto.randomUUID()` with timestamp/random fallback (matching `createSupplementalFileId()`).
  - IDs are never derived from array index, account name, or account number.
  - Renaming an account updates all assigned disbursements because they reference the immutable ID.
- **Non-Destructive Deletion:** Deleting an account prompts the filer to reassign or unassign linked transactions. Deleting an account **unassigns** linked disbursements (`bankAccountId: ''`); it must **never** delete disbursement entries.
- **Legacy Migration:** Existing B-4 rows with legacy `bankAcct` strings map to a matching migrated account if an exact match exists; otherwise, rows remain explicitly "unassigned" for filer resolution.
- **Deterministic Alphanumeric Ordering:**
  - Court output ordering must support real-world alphanumeric identifiers (`CHK-104A`, `ACH`, `EFT-Debit`, `Wire`) without collapsing or producing `NaN`.
  - Disbursements are sorted deterministically using natural alphanumeric comparison with stable tie-breakers:
    1. Primary sort: Alphanumeric check number via `localeCompare(..., { numeric: true, sensitivity: 'base' })`.
    2. Secondary tie-breaker: `datePaid`.
    3. Tertiary tie-breaker: Stable row ID.
- **Court Output Template Mapping:**
  - **Single Account:** The account number and bank name populate the existing Bank/Account header in the official court template.
  - **Multiple Accounts:** The output must use a verified template-supported multi-page or sub-schedule layout. If the official template does not accommodate multiple accounts on a single page, multi-account attribution remains an internal entry convenience in the app/model. The app must **never** mislabel transactions by placing an arbitrary "primary account" in the court header.

### Acceptance Criteria

- A filer can define bank accounts once and assign B-4 disbursements to them via dropdown.
- Natural alphanumeric sorting correctly orders checks and electronic payments.
- Deleting an account unassigns transactions without deleting financial entries.
- Court outputs never misattribute disbursements to the wrong bank account.
- `npm run verify:data-model` passes with all new fields documented.

---

## 57E — Trust Accounting and Audit Fee Inputs

### Status: REVERTED (57E-1). 57E-2 CLOSED 2026-09-19 — premise incorrect

57E-1 was reverted and is unscoped.

**57E-2 is closed, not deferred.** An earlier version of this note said it was
blocked on three undocumented unknowns — the fee basis, the tier thresholds,
and the rounding rule. That was wrong on all three counts. The audit fee
schedules are defined in the court's own workbooks, and the app already
implements them exactly:

| Filing type | Tiers | Template location | Implemented at |
| --- | --- | --- | --- |
| Annual / Final / Trust Accounting (shared `engineId: 'annual'`) | ≤ $25,000 → $20; $25,000.01–$100,000 → $85; $100,000.01–$500,000 → $170; over $500,000 → $250 | `PART II, III` rows 13–17, amounts in column G | `src/features/annual-accounting/totals.js:45-49` |
| Verified Initial Inventory | over $25,000 → $85; below → $0 | `PART V` rows 7–9, amounts in column G | `src/legacy-app.js:6341` |
| Simplified Accounting | none — its workbook has no audit fee schedule | — | — |
| The four plan types | none — not accountings | — | — |

Both are rendered in the app and printed in the PDF; the Annual PDF prints the
tier table alongside the applicable fee. There is no rounding rule to document
because the tiers are flat dollar amounts, not a rate.

**There is no separate trust-asset audit fee**, which is why no one could find
its formula. Neither workbook has such a row; the tiers key on estate or
inventory value. That was 57E-2's premise and it does not hold.

**The one real question this surfaced is also answered: no.** Schedule C does
not belong in the Verified Initial Inventory's audit-fee base, so a ward with
trusts is not being under-charged. The court's own workslips settle it —
`SUMMARY I` B39, labelled "VERIFIED INITIAL INVENTORY OF GUARDIAN", computes
`H39 = H32 + H38`, i.e. Schedule A plus Schedule B and nothing else, while
`SUMMARY II` presents Schedule C under the heading "SCHEDULE C: Other
Financial Information" with a per-schedule total, no grand total, and no
formula rolling any of it back into H39. `calc.total() = calc.netA() +
calc.netB()` matches the workbook exactly.

### Scope Split

Because statutory and circuit-level authority on trust-asset audit fees varies under Fla. Stat. § 744.3678 and § 28.24(25), 57E is split into capture vs. computation:

#### Stage 57E-1: Capture-Only & Manual Fee Guidance

- Add tri-state question: `"Is a trust accounting being filed/required for this ward?"` (`''`, `'Yes'`, `'No'`).
- If `'Yes'`, reveal a non-negative currency input for `trustAssetsValue`.
- Validation: Answering `'Yes'` with a blank value is treated as an incomplete affirmative entry, creating a machine-verifiable `auto` blocker (1:1 with readiness) to ensure the filer supplies the asset total.
- Fee calculation: Present a transparent manual fee advisory notice explaining that clerk audit fees on trust assets depend on local circuit practice; do not calculate an automated fee.

#### Stage 57E-2: Automated Formula Execution (Deferred)

- Deferred until statutory consensus, circuit Administrative Orders, and clerk fee calculation bases (e.g. principal vs. distributions, threshold tiers, rounding) are formally documented and approved by Alan / the requester.

### Acceptance Criteria

- 57E-1 captures the trust accounting choice and asset value without altering estate audit-fee formulas.
- Toggling `'No'` preserves entered trust asset values non-destructively.
- Manual fee reminder clearly guides the filer on checking with the local clerk of court.

---

## 57F — Export Fidelity Repairs

### Status: REVERTED. Two unrelated pieces, neither authorized (2026-09-19)

Reverted. This section bundles two independent jobs: the **PDF period-end
clipping** claim, which was never render-tested (source-read only) and so is
not known to be a real defect on master; and **Excel header propagation** —
ward name and case number onto every schedule sheet rather than `PART I`
alone — which is substantive work needing its own design. The Guardian date
round-trip fix from this item survived the revert as defensive robustness.

### Scope & Fixture-Level Targets

Address confirmed Excel and PDF formatting defects against exact reproduction fixtures:

- **Excel Header Multi-Sheet Propagation:**
  - Ward name and case number are currently written only to worksheet `'PART I'` (`C5`, `I5`).
  - Extend header writing to all subsequent schedule worksheets (e.g. `'PART II, III'`, `'SCH B-4 OTHER DISB p2'`, `'SCH D-1 CASH p1'`) using template-verified cell coordinates or print-title rows.
- **Date Presentation Normalization:**
  - Ensure dates exported to Excel cells render in standard court visual format (`MM/DD/YYYY`) while internal storage preserves normalized ISO format.
- **Disbursement Formatting & Column Width:**
  - Ensure Schedule B-4 amount cells use numeric currency formatting (`$#,##0.00`) and verify column widths prevent text truncation (`###` display).
- **PDF Period-End Clipping:**
  - Identify exact clipping box on the Annual Accounting PDF preview/export where the year in the period-end date is truncated. Adjust text-box width and font scaling to guarantee full visibility.
- **Template Integrity:** Preserve official formulas, cell merges, and protected regions without corruption.

### Acceptance Criteria

- Representative Excel exports display ward name and case number across all printed schedule pages.
- Dates render as `MM/DD/YYYY` and amounts display full currency values without truncation.
- PDF preview and exported PDF cleanly display the four-digit year in period-end values.

---

## 57G — Annual Plan Terminology

### Status: CLOSED 2026-09-19 — no defect, re-verified against master

### Scope & Identity Audit

Conduct an identity audit across nine distinct application surfaces to eliminate erroneous references to "Accounting" on Annual Plan filings:

1. Filing descriptor (`filing-types.js`)
2. Sidebar navigation labels
3. Application route headers / breadcrumbs
4. Review & Summary page
5. PDF document header models
6. Excel worksheet titles (where applicable)
7. Dashboard ward card
8. Browser tab document title
9. Plan-specific help and guidance panels

_Boundary Rule:_ Prohibit the term "Annual Accounting" only where it refers to the Annual Plan itself. Do not alter legitimate educational help text comparing plan requirements to accounting duties.

### Acceptance Criteria

- Creating, navigating, previewing, and exporting an Annual Plan displays consistent "Annual Plan" terminology across all nine audited surfaces.

---

## 57H — Encrypted Save Restore & Session Recovery

### Status: Implemented in working tree

### Scope & Threat Model

Resolve the product expectation mismatch between local browser session recovery and authoritative `.sav` backup files. 57H is isolated as an independent, security-reviewed sub-delivery.

- **Threat Model & Shared-Device Privacy:**
  - Avoid leaking the existence of confidential guardianship proceedings on shared, family, or public library computers.
  - The return path must use a **neutral entry point** (e.g. standard "Open / Unlock Filing" action) rather than an unsolicited prominent banner broadcasting that an encrypted filing exists on the machine.
- **Product Promise Decision (Alan / Requester Sign-off Required):**
  - _Option 1 (Durable Encrypted Local Resume):_ App stores an encrypted session cache in IndexedDB via Web Crypto `AES-GCM` / `PBKDF2`. On return, filer supplies password to decrypt and resume.
  - _Option 2 (Explicit File Authority):_ App UI copy clearly explains: _"Password-protected filings are not stored in your browser. Download your .sav file and re-open it when you return."_
  - _Option 3 (File System Access API):_ Direct file-handle synchronization where supported by the browser, with graceful fallback to Option 1 or 2.
- **Security Invariants:**
  - Zero raw passwords in `localStorage`, `sessionStorage`, IndexedDB, cookies, URLs, or browser caches.
  - Graceful failure handling for quota exhaustion, browser private-mode eviction, corrupted data, and incorrect passwords.

### Acceptance Criteria

- Filer can reliably resume an encrypted filing using the selected product promise.
- Incorrect password fails cleanly without revealing decrypted contents.
- Zero raw passwords or sensitive credentials are persisted in unencrypted browser storage.

---

## Universal Completion Gates

### 1. The Readiness vs. Export Parity Invariant (`AGENTS.md` §4)

Every newly introduced machine-verifiable `auto` condition (in 57A, 57B, 57C, 57D, 57E) must map **1:1** between readiness indicators and export validation errors. Manual legal/procedural reminders must never block navigation or export. Purely presentational deliveries (57F, 57G) are exempt.

### 2. Data Model Governance (`AGENTS.md` §3)

Any change to persisted fields, collections, defaults, or cardinalities (57A, 57B, 57D, 57E) must be updated in `probate-guardian-data-model.csv` in the same commit and pass `npm run verify:data-model`.

---

## Required Test and Verification Work

| Sub-delivery | Verification Strategy                        | Target Specifications                                                                                                                |
| :----------- | :------------------------------------------- | :----------------------------------------------------------------------------------------------------------------------------------- |
| **57A**      | Unit, contract, and browser e2e              | `tests/unit/form-contract.spec.js`, `tests/unit/validation-adapter.spec.js`, `tests/e2e/guardian-inventory-tri-state-radios.spec.ts` |
| **57B**      | Static review, unit, and browser regression  | `tests/unit/checklist-export-parity.spec.js`, `tests/e2e/annual-mount.spec.ts`, conversion contract spec                             |
| **57C**      | Schedule evidence validation & upload health | `tests/e2e/schedule-docs-period-key.spec.ts`, `tests/unit/supplemental-pdf.spec.js`, new evidence-gate spec                          |
| **57D**      | B-4 account lifecycle, migration, & sorting  | New `tests/unit/schb4-account-contract.spec.js`, `tests/e2e/annual-schedule-consistency.spec.ts`                                     |
| **57E**      | Trust input validation & fee advisory        | New `tests/unit/trust-accounting-contract.spec.js`                                                                                   |
| **57F**      | Excel layout & PDF visual extraction         | `tests/unit/excel-engine.spec.js`, `tests/e2e/guardian-inventory-excel-schedule-layout.spec.ts`, PDF text extraction                 |
| **57G**      | 9-surface identity audit                     | `tests/e2e/plan-annual-mount.spec.ts`, `tests/e2e/filing-identity.contract.spec.ts`                                                  |
| **57H**      | Cryptographic restore & session lifecycle    | `tests/e2e/unlock.spec.ts`, `tests/e2e/backup-restore-sav.spec.ts`, `tests/e2e/persistence-recovery.contract.spec.ts`                |

_Execution Rule:_ Per requester instruction, browser tests are currently deferred. All verification commands must follow `AGENTS.md` §1 (lite targeted runs during development; full `npm test` only with explicit requester approval).

---

## Sequencing

1. **Verify 57A and 57B** in the working tree: execute targeted specs and confirm attestation reset behavior upon filing conversion.
2. **Approve 57C and 57D Policy Matrices:** Formalize schedule tiers for 57C and output layout for 57D.
3. **Implement 57D Data Foundation & Sorting:** Update `schB4Accounts[]` in data model, implement alphanumeric sorting, and wire entry UI.
4. **Implement 57C Evidence Gate:** Wire `isFilingEligibleSupplement(file)` checks for Tier 3 schedules with 1:1 parity.
5. **Implement 57E-1:** Wire trust accounting tri-state and manual clerk fee advisory.
6. **Implement 57F & 57G:** Apply fixture-level Excel/PDF repairs and complete the Annual Plan terminology audit.
7. **Isolate & Execute 57H:** Conduct dedicated security review for durable encrypted resume.

---

## Deliberately Out of Scope

- Retaining raw passwords in unencrypted storage or claiming client-side encryption protects an already-open browser window.
- Fabricating statewide or circuit-level audit fee formulas for trust accounting without statutory or Administrative Order authority.
- Forcing physical PDF uploads for schedules where Florida probate rules merely require records to be retained for clerk audit upon request.
- Misrepresenting multi-account disbursements by writing a single "primary account" in official court headers.
- Redesigning accounting schedules or templates beyond the explicit defect items above.
