# Milestone 35: Candidate Item List & Plan Readiness Reconciliation

## Status

**Draft — candidate list and proposed sub-milestone specifications.**
This document collects candidate items left flagged-but-unaddressed by the
Milestone 34 series (34, 34-1, 34-2), alongside a researched proposal for
reconciling Plan readiness checklists against 6th Judicial Circuit Court
Clerk review workslips.

---

## Candidate Items (Unscoped Backlog)

### 1. Simplified Accounting `guardians[]` schema drift + Excel hardcap (real bug)

Found during the Milestone 34-2 data-model audit, documented but explicitly
not fixed there (outside that milestone's documentation-only scope):

- Simplified Accounting's "Add Co-Guardian" button pushes a row shaped for
  Annual Accounting (`officeStreet`/`officeCityStateZip`) into a collection
  that Simplified's own rendering/validation code reads as
  `residenceStreet`/`residenceCityStateZip`.
- `simplified-accounting/excel.js` hardcodes exactly 3 guardian slots, so a
  4th+ co-guardian is invisible to Excel export/import even though it prints
  correctly in the PDF.
- Documented in `probate-guardian-data-model.csv`'s
  `simplified_accounting.guardians[]` row notes and in
  `MILESTONE-34-2-PROPOSAL.md`'s closing section.
- Source: the shared row factory vs. Simplified's own field-name
  expectations; needs a decision on whether to fix the factory output, fix
  Simplified's reader, or reconcile both, plus an Excel-export fix to
  support more than 3 guardians.

### 2. Close out 34-1C's pending full regression verification

`MILESTONE-34-1-PROPOSAL.md` records 34-1C (items 8-11: co-guardian
suppression, tri-state checkboxes, Trust/Final copy separation, cross-filing
county drift) as "implemented; focused verification complete, full
regression verification pending." This isn't new scope — it's finishing the
verification 34-1C itself calls for before that sub-milestone can be
considered fully closed.

### 3-9. Explicitly deferred product-decision items (from 34-1's "Explicitly Deferred Preferences")

None of these are bugs; each needs a product decision before it becomes
real milestone scope. Carried forward verbatim from
`MILESTONE-34-1-PROPOSAL.md`:

3. Masked preview mode for SSN/EIN fields.
4. Duplicate-name drift warnings (e.g., two wards/parties with the same
   name across filings).
5. `None reported` placeholder text in empty schedules, in place of a blank
   table.
6. Export button regrouping (layout/IA decision, not a defect).
7. Zoom/fit controls in the PDF preview (confirmed fully absent today —
   no scale state, no UI, hardcoded `scale = 1.5` in `pdf-preview.js`).
8. Wording polish such as "an Annual Accounting" grammar throughout.
9. Expanded `/s/` electronic-signature guidance/copy.

### 10. Downloads delivery-copy refresh for the data-model CSV (optional, low priority)

`DATA-MODEL-REMEDIATION-PLAN.md`'s checklist still has this unchecked: a
contributor's Downloads-directory copy of `probate-guardian-data-model.csv`
may be refreshed on request, but none has been requested. Not a repository
acceptance criterion either way. Only relevant if someone actually asks for
a refreshed copy.

### 11. Plan Minor Case Number Requirement (`ucn` vs. `ref` synchronization)

Flagged from a review of Plan Minor's cover page: "Case #" has no
required-marker, unlike "For the Period From" / "To" beside it, both of
which show the red required asterisk.

Confirmed directly against every validator: `validatePlanAnnual`,
`validatePlanSimplified`, `validateSimplified` (Simplified Accounting),
`validateGuardian` (Guardian Inventory), `validatePlanInitial`, and
`validateAnnual` (Annual/Final/Trust Accounting) all call
`req(d.caseNumber, ...)` — six of seven validators already require it.
`validatePlanMinor` (`src/features/plan-minor/index.js`) is the only one
that does not require either of Plan Minor's own two case-number-equivalent
fields, `d.ucn` and `d.ref` (per `case-resolver.js`: "planMinor alone stores
its case number as `ucn`"; the cover page also displays a separate `d.ref`
field labeled "Case #" — see `plan-minor/index.js:117-118`).

**Product & Architecture Consideration**:
Requiring both without a synchronization rule creates a new schema drift bug.
`case-resolver.js` already treats `ucn` as the canonical shared case number.
The UI and validator should synchronize `ref` and `ucn` so that entering a
Case Number populates both appropriately, and `validatePlanMinor` enforces
presence without creating conflicting requirements.

---

## Milestone 35-A: Plan Readiness Checklist Reconciliation

### Status
**Draft Proposal — Under Review.** Reconciles the four existing Plan readiness checklists (`planInitial`, `planAnnual`, `planSimplified`, `planMinor`) against 6th Judicial Circuit Clerk review workslips (`GD INIT WORK SLIP REVIEW.docx`, `GD ANN Work Slip Review.docx`, `GD ANN Work Slip Review Simplified Plan.docx`, and `GD ANN Work Slip Minor Review.docx`).

> [!NOTE]
> **Operational Context**: The Guardianship Division (`GD*.docx`) documents are internal court clerk audit workslips used by deputy clerks in the Sixth Judicial Circuit (Pinellas/Pasco). They reflect operational audit checklists rather than statutory enactments. Wording displayed to users must be reviewed to ensure statutory accuracy and avoid imposing unsupported restrictions.

---

### Source-Mapping Table (Clerk Workslips to Implementation)

| Form Type | Workslip Document | Section / Audit Item | Implementation Predicate | Type | Notes & Authority |
|---|---|---|---|---|---|
| **Initial Plan** | `GD INIT WORK SLIP REVIEW.docx` | Header / Case Info | `wardName`, `caseNumber`, `county` | `auto` | F.S. § 744.363 |
| **Initial Plan** | `GD INIT WORK SLIP REVIEW.docx` | Inception & Letters Dates | `inceptionDate`, `lettersSignedDate` | `auto` | F.S. § 744.363 |
| **Initial Plan** | `GD INIT WORK SLIP REVIEW.docx` | Guardian Identity & Signature | `g0.name`, `g0.signatureDate`, `g0.street`, `g0.phone`, `g0.ssn` | `auto` | Verified via Guardian 1 fields |
| **Initial Plan** | `GD INIT WORK SLIP REVIEW.docx` | Living Arrangement & Setting | `wardLiving`, `residenceAddress`, `q2Setting` | `auto` | Plan Question 1 & 2 |
| **Initial Plan** | `GD INIT WORK SLIP REVIEW.docx` | Services (Medical/Mental/Personal) | `q3Med*`, `q4Mental`, `q5Personal` | `auto` | Questions 3, 4, 5 |
| **Initial Plan** | `GD INIT WORK SLIP REVIEW.docx` | Providers & ADLs | `provs.length > 0`, `INITIAL_ADLS.every(...)` | `auto` | Questions 9 & 10A |
| **Initial Plan** | `GD INIT WORK SLIP REVIEW.docx` | Examining Committee | `has(d.committeeIncorporated)` | `auto` | Question 10F |
| **Initial Plan** | `GD INIT WORK SLIP REVIEW.docx` | Advance Directives | `has(d.q11Directives)` | `auto` | Question 11 answered |
| **Initial Plan** | `GD INIT WORK SLIP REVIEW.docx` | 60-Day Filing Rule | N/A (Filing deadline) | `manual` | Corrected citation: F.S. § 744.363 (was typo 744.632) |
| **Initial Plan** | `GD INIT WORK SLIP REVIEW.docx` | Disaster Plan Requirement | N/A (External filing) | `manual` | Local AO 2019-005 |
| **Initial Plan** | `GD INIT WORK SLIP REVIEW.docx` | Service of Process | N/A (Procedural step) | `manual` | Serve ward & interested persons |
| **Annual Plan** | `GD ANN Work Slip Review.docx` | Reporting Period & Inception | `periodFrom`, `periodTo`, `wardName`, `caseNumber`, `gid` | `auto` | F.S. § 744.3675 |
| **Annual Plan** | `GD ANN Work Slip Review.docx` | Guardian Signature & Contact | `g0.name`, `g0.signatureDate`, `g0.mailingStreet`, `g0.phone`, `g0.ssn` | `auto` | Guardian 1 contact info |
| **Annual Plan** | `GD ANN Work Slip Review.docx` | Residences & Living Arrangement | `res.length > 0`, `wardLiving`, `residenceAddress` | `auto` | Questions 1 & 2 |
| **Annual Plan** | `GD ANN Work Slip Review.docx` | Care, Providers, Social, Rights, ADLs | `q3*`, `provs.length > 0`, `q5*`, `PLAN_RIGHTS.every(...)`, `PLAN_ADLS.every(...)` | `auto` | Core substantive sections |
| **Annual Plan** | `GD ANN Work Slip Review.docx` | Advance Directives & Remuneration | `has(d.q10Directives)`, `has(d.q11Remuneration)` | `auto` | Questions 10 & 11 |
| **Annual Plan** | `GD ANN Work Slip Review.docx` | Physician Exam Window | N/A (Physical attachment) | `manual` | Exam within 90 days *before reporting period begins* (F.S. § 744.3675(1)(b)) |
| **Annual Plan** | `GD ANN Work Slip Review.docx` | APD DSHP Support Plan | N/A (Attachment) | `manual` | For APD / Ch. 393 clients |
| **Simplified Plan** | `GD ANN Work Slip Review Simplified Plan.docx` | Header & Reporting Period | `periodFrom`, `periodTo`, `wardName`, `caseNumber`, `county` | `auto` | Local court rules |
| **Simplified Plan** | `GD ANN Work Slip Review Simplified Plan.docx` | Guardian Details & Signature | `g0.name`, `g0.signatureDate`, `g0.phone`, `g0.mailingAddress` | `auto` | Simplified Guardian 1 fields |
| **Simplified Plan** | `GD ANN Work Slip Review Simplified Plan.docx` | Substantive Questions | `q1Residences`, `q3MedicalTreatment`, `q4Diagnosis`, `q7RestoreRights` | `auto` | Questions 1, 3, 4, 7, 8, 9 |
| **Simplified Plan** | `GD ANN Work Slip Review Simplified Plan.docx` | Certificate of Service | None | `manual` | Workslip notes certificate of service is **not required** |
| **Simplified Plan** | `GD ANN Work Slip Review Simplified Plan.docx` | Annual Financial Statement | N/A (Attachment) | `manual` | If required by local order |
| **Plan Minor** | `GD ANN Work Slip Minor Review.docx` | Header & Reporting Period | `wardName`, `county`, `periodFrom`, `periodTo` | `auto` | F.S. § 744.3675 |
| **Plan Minor** | `GD ANN Work Slip Minor Review.docx` | Guardian Info & Living Arrangement | `g0.name`, `g0.signatureDate`, `g0.mailingStreet`, `g0.phone`, `q1ResidenceName` | `auto` | Section 1 & 2 |
| **Plan Minor** | `GD ANN Work Slip Minor Review.docx` | Medical, School, Social, Providers | `q4MedDent`, `q5SchoolProg`, `q5SocialDev`, `provs.length > 0` | `auto` | Section 4 & 5 |
| **Plan Minor** | `GD ANN Work Slip Minor Review.docx` | Preparer Info | `preparer_name`, `preparer_signatureDate` | `auto` | If preparer is utilized |
| **Plan Minor** | `GD ANN Work Slip Minor Review.docx` | Physician Exam Window | N/A (Attachment) | `manual` | Exam within 180 days *before reporting period begins* |
| **Plan Minor** | `GD ANN Work Slip Minor Review.docx` | Sui Juris Transition | N/A (Procedural reminder) | `manual` | Minor reaching age 18 during period |

---

### Architectural Principles for Readiness Checklists

1. **Readiness / Export Consistency Invariant (Milestone 34-1 Principle)**:
   - Any machine-verifiable blocking item (`auto: false`) **must** also be an export validation error in `validatePlan*()`.
   - Conversely, any condition that passes export validation must not block the readiness panel.
   - **Pro Se Compatibility**: Fields that are optional for pro se filers (such as attorney signatures when no attorney of record is involved) must **not** be hard `auto` blockers. In Annual Plan and Simplified Plan, attorney validation only runs if attorney information is provided.
2. **Predicate vs. Label Precision**:
   - Labels in `auto` checks must accurately describe what the boolean predicate actually tests.
   - Example: Initial Plan Question 11 verifies that the boolean selection (`d.q11Directives`) is answered; the label should read `Question 11 — advance directives answered` rather than asserting complete itemized verification of row contents.
3. **Manual Reminders Separation**:
   - Reminders represent external filing actions, physical attachments, service obligations, and statutory deadlines that cannot be inspected via JSON state alone.
   - Manual reminders are strictly non-blocking and clearly styled as procedural checklists.

---

### Reconciled Plan Checklist Specifications

#### 1. Initial Guardianship Plan (`planInitial`)
*Statutory Authority: F.S. § 744.363, § 744.368*

- **Auto Checks (`auto`)**:
  - `Ward name, case number, and county on plan` (`has(d.wardName) && has(d.caseNumber) && has(d.county)`)
  - `Guardianship Inception Date and Letters signed date stated` (`has(d.inceptionDate) && has(d.lettersSignedDate)`)
  - `Signed and dated by a guardian` (`has(g0.name) && has(g0.signatureDate)`)
  - `Guardian street address, phone, and SSN/TIN provided` (`has(g0.street) && has(g0.phone) && has(g0.ssn)`)
  - `Ward's current living arrangement and residence address stated` (`has(d.wardLiving) && has(d.residenceAddress)`)
  - `Question 2 — best-suited residential setting selected` (`has(d.q2Setting)`)
  - `Question 3 — medical service provisions selected` (`has(d.q3MedFacility) && has(d.q3MedTreatment) && has(d.q3MedExaminations)`)
  - `Question 4 — mental health service provision selected` (`has(d.q4Mental)`)
  - `Question 5 — personal care provision selected` (`has(d.q5Personal)`)
  - `Question 9 — examining providers listed (at least 1 provider)` (`provs.length > 0`)
  - `Question 10A — all fifteen activities of daily living rated` (`INITIAL_ADLS.every(k => has(d[k]))`)
  - `Question 10B/C — mental and physical disabilities answered` (`has(d.q10Mental) && has(d.q10Physical)`)
  - `Question 10F — examining committee recommendations addressed` (`has(d.committeeIncorporated)`)
  - `Question 11 — advance directives answered` (`has(d.q11Directives)`)
  - `Attorney certification completed if represented` (`!has(d.attorney_name) || (has(d.attorney_name) && has(d.attorney_signatureDate))`)

- **Manual Reminders (`manual`)**:
  - `File within 60 days after the Letters of Guardianship are signed (F.S. § 744.363).`
  - `File a separate Disaster Plan alongside this report per 6th Judicial Circuit Administrative Order 2019-005.`
  - `Serve a copy on the ward (unless declared totally incapacitated or under 14) and all interested persons, then file proof of service.`
  - `Attach copies of any pre-existing advance directives described in Question 11.`
  - `Confirm guardian address on file with the Clerk matches this plan.`
  - `If you are a professional guardian, confirm OPPG registration is current.`

---

#### 2. Annual Guardianship Plan (`planAnnual`)
*Statutory Authority: F.S. § 744.3675, § 744.368*

- **Auto Checks (`auto`)**:
  - `Reporting period is stated (from / to)` (`has(d.periodFrom) && has(d.periodTo)`)
  - `Ward name, case number, and guardianship inception date stated` (`has(d.wardName) && has(d.caseNumber) && has(d.gid)`)
  - `Signed and dated by a guardian` (`has(g0.name) && has(g0.signatureDate)`)
  - `Guardian mailing address, phone, and SSN/TIN provided` (`has(g0.mailingStreet) && has(g0.phone) && has(g0.ssn)`)
  - `Ward's current residence and living arrangement stated` (`has(d.wardLiving) && has(d.residenceAddress)`)
  - `Residences for the reporting year listed (at least 1 residence)` (`res.length > 0`)
  - `Question 2 — residence change addressed` (`has(d.residenceChange)`)
  - `Question 3 — residential setting and care provisions selected` (`has(d.q3Setting) && has(d.q3Care)`)
  - `Question 4 — professional medical treatment providers listed (at least 1 provider)` (`provs.length > 0`)
  - `Question 5 — social skills and capacity-building activities described` (`has(d.q5SocialSkills) && has(d.q5Activities)`)
  - `Question 6 — all twelve rights assessed` (`PLAN_RIGHTS.every(k => has(d[k]))`)
  - `Question 8 — all sixteen activities of daily living rated` (`PLAN_ADLS.every(k => has(d[k]))`)
  - `Question 9 — mental and physical disabilities answered` (`has(d.q9Mental) && has(d.q9Physical)`)
  - `Question 10 — advance directives answered` (`has(d.q10Directives)`)
  - `Question 11 — remuneration declared` (`has(d.q11Remuneration)`)
  - `Attorney certification completed if represented` (`!has(d.attorney) || (has(d.attorney) && has(d.attorney_signatureDate))`)

- **Manual Reminders (`manual`)**:
  - `Attach the physician's report based on an examination conducted within 90 days prior to the beginning of the reporting period (F.S. § 744.3675(1)(b)).`
  - `File within 90 days after the last day of the anniversary month Letters were signed (F.S. § 744.367).`
  - `Serve a copy on the ward (unless declared totally incapacitated or minor under 14) and all interested persons, then file certificate of service.`
  - `If any right is marked capable of restoration, file a separate petition for restoration — the annual plan does not restore rights.`
  - `If the ward changed residence or a new guardian was appointed, file an updated Disaster Plan (AO 2019-005).`
  - `If ward is an APD client with a Developmental Services Habilitation Plan (DSHP / Chapter 393), attach the current support plan.`
  - `Attach copies of any advance directives listed in Question 10 unless already filed with the court.`
  - `Confirm the guardian address on file with the Clerk matches the address on this plan.`
  - `If you are a professional guardian, confirm OPPG registration is current.`

---

#### 3. Simplified Annual Plan (`planSimplified`)
*Statutory Authority: 6th Judicial Circuit Local Rules / F.S. § 744.3675*

- **Auto Checks (`auto`)**:
  - `Reporting period is stated` (`has(d.periodFrom) && has(d.periodTo)`)
  - `Ward name, case number, and county on plan` (`has(d.wardName) && has(d.caseNumber) && has(d.county)`)
  - `Signed and dated by a guardian` (`has(g0.name) && has(g0.signatureDate)`)
  - `Guardian contact details provided (phone, mailing address)` (`has(g0.phone) && has(g0.mailingAddress)`)
  - `Ward's residences for the year listed (Question 1)` (`has(d.q1Residences)`)
  - `Question 3 — professional medical / mental health treatment listed` (`has(d.q3MedicalTreatment)`)
  - `Question 4 — current diagnosis and continuing need for guardian stated` (`has(d.q4Diagnosis)`)
  - `Question 7 — rights-restoration question answered` (`has(d.q7RestoreRights)`)
  - `Question 8 — advance directives question answered` (`has(d.q8Directives)`)
  - `Question 9 — remuneration declared` (`has(d.q9Remuneration)`)
  - `Attorney certification completed if represented` (`!has(d.attorney_name) || (has(d.attorney_name) && has(d.attorney_signatureDate))`)

- **Manual Reminders (`manual`)**:
  - `Attach the physician's report / capacity statement (exam within 90 days before reporting period begins) unless waived by court order.`
  - `Attach the Annual Financial Statement / Affidavit if required for this case.`
  - `File within 90 days after the end of the reporting period.`
  - `Note: Certificate of service is not required for Simplified Plan under local court practice.`
  - `If any advance directives are listed in Question 8, attach copies unless already filed.`
  - `Confirm guardian address on file with the Clerk matches this plan.`
  - `If professional guardian, confirm active OPPG registration.`

---

#### 4. Annual Plan — Minors (`planMinor`)
*Statutory Authority: F.S. § 744.3675, § 744.368*

- **Auto Checks (`auto`)**:
  - `Minor's name, county, and reporting period on plan` (`has(d.wardName) && has(d.county) && has(d.periodFrom) && has(d.periodTo)`)
  - `Case Number (UCN / Ref) provided` (`has(d.ucn) || has(d.ref)`)
  - `Current residence and living arrangements stated` (`has(d.q1ResidenceName) && has(d.q1Street)`)
  - `Signed and dated by a guardian` (`has(g0.name) && has(g0.signatureDate)`)
  - `Guardian address, phone, and taxpayer ID provided` (`has(g0.mailingStreet) && has(g0.phone) && has(g0.tin)`)
  - `Question 4 — provision of medical and dental services selected` (`has(d.q4MedDent)`)
  - `Question 5 — school progress, social development, and communication completed` (`has(d.q5SchoolProg) && has(d.q5SocialDev)`)
  - `Question 5E — unmet social needs answered` (`has(d.q5UnmetSocial)`)
  - `Treatment providers listed (at least 1 provider)` (`provs.length > 0`)
  - `Preparer certification completed if preparer is used` (`!has(d.preparer_name) || (has(d.preparer_name) && has(d.preparer_signatureDate))`)
  - `Attorney certification completed if represented` (`!has(d.attorney_name) || (has(d.attorney_name) && has(d.attorney_signatureDate))`)

- **Manual Reminders (`manual`)**:
  - `File within 90 days after the last day of the anniversary month the Letters were signed (F.S. § 744.367).`
  - `If the minor reaches 18 years of age (sui juris) during the reporting period, prepare for final discharge under F.S. § 744.527.`
  - `Attach the physician's report based on an examination conducted within 180 days prior to the beginning of the reporting period if required by the court.`
  - `Serve a copy on parents, legal custodians, and the minor (if age 14 or older), then file certificate of service.`
  - `If case was transferred from another county, verify whether prior annual reports were waived.`
  - `Confirm guardian contact details on file with the Clerk match this plan.`
  - `If professional guardian, confirm current OPPG registration.`

---

### Implementation Plan

1. **`src/features/plan-initial/print.js`**:
   - Correct statutory citation in manual reminder from `F.S. 744.632` to `F.S. § 744.363`.
   - Add `d.county` to the header auto-check.
   - Align Question 10F (`d.committeeIncorporated`) and Question 11 (`d.q11Directives`) labels to match boolean predicate semantics.
2. **`src/features/plan-annual/print.js`**:
   - Ensure attorney check respects pro se filings (only requires `signatureDate` if `d.attorney` is populated).
   - Update physician report manual reminder to reflect exam window: within 90 days *before the reporting period begins*.
   - Add APD DSHP (Ch. 393) and Disaster Plan (AO 2019-005) manual reminders.
3. **`src/features/plan-simplified/print.js`**:
   - Add `d.county` to header auto-check.
   - Ensure attorney check respects pro se filings.
   - Update manual reminders: explicitly clarify that certificate of service is not required for Simplified Plan; add Annual Financial Statement reminder.
4. **`src/features/plan-minor/print.js`**:
   - Replace legacy disclaimer with official procedural reminders from `GD ANN Work Slip Minor Review.docx` (90-day filing rule, 180-day exam window before period begins, minor turning 18 / sui juris transition, inter-county transfer).
   - Support `has(d.ucn) || has(d.ref)` for case number check.
5. **Testing & Invariant Verification**:
   - **Contract Invariant Tests**: Verify that for all four plan types, `planReadinessChecks().auto.every(c => c.ok)` matches `validatePlan*().errors.length === 0`.
   - **Predicate Unit Tests**: Verify that individual fields correctly toggle their corresponding `auto` check between pass and fail.
   - **Manual Non-Blocking Tests**: Verify that all `manual` items are categorized strictly as non-blocking informational reminders.
