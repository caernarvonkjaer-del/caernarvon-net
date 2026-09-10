# Milestone 35: Plan Readiness Reconciliation & Backlog Execution

## Status

**35-1, 35-2, and 35-3 implemented; 35-4 not started.** This document organizes candidate items and clerk workslip audit requirements into four concrete, sequentially executable sub-milestones (35-1 through 35-4), alongside an unscoped candidate backlog carried forward from the Milestone 34 series.

**Implementation status (2026-09-10):**
- **35-1 (Statutory Citations):** Implemented for all four Plan types' manual checklists and the three
  shipped strings that cited the wrong deadline statute (see the Initial Plan correction above). One item
  intentionally **not** added: Simplified Plan's proposed "certificate of service not required" reminder
  contradicts existing shipped copy and could not be verified against an authoritative source — left as-is,
  flagged above. Plan Minor's "inter-county transfer check" reminder was too vague to give concrete text
  for without the source workslip's exact wording — not added.
- **35-2 (Case Number):** Implemented via the narrower, safer fix found during review —
  `case-resolver.js`'s `caseNumberOf()` now falls back to `ref` when `ucn` is blank (matching
  `dashboard/view-model.js`'s existing precedence), plus the validator and readiness-check additions. No UI
  synchronization was added — the two cover inputs stay independently editable, since they may legitimately
  hold different values.
- **35-3 (Pro Se Decoupling):** Implemented for Plan Initial and Plan Minor's attorney/preparer validation
  and readiness checks, conditional on the filer having started entering that role. Plan Annual and Plan
  Simplified were confirmed (not modified) to already handle this correctly.
- **35-4 (Exact Invariant Reconciliation):** Not started. The mapping tables below were used as the source
  of truth for 35-1/35-2/35-3's edits and are believed current, but the planned
  `tests/unit/plan-readiness-invariants.spec.js` fixture suite has not been written, and no test run
  (unit or e2e) has confirmed any of the above changes are correct in practice — only `node --check` syntax
  validation. Per `AGENTS.md`, a full regression run needs explicit permission before it happens; this is
  product-code (export-gating) behavior, not a documentation-only change, so it should not skip that gate.

**Review history (2026-09-10):** independent review (Codex, then a second AI reviewer) found and fixed two
high-severity statute-subsection reversals (F.S. § 744.1098(1)/(2), F.S. § 744.3145(2)/(3)/(4)) and several
fabricated field names in the 35-4 mapping tables — both now verified correct against the actual source and,
for the statute citations, the official Florida Statutes text directly. A further independent pass found two
things the above review missed, both corrected in this document: a broken file link (`src/core/case-resolver.js`
has no `data/` subdirectory) and a real gap in 35-2's original fix (see that section) — and one more statute
error in this document's own proposed correction: the Initial Plan's 60-day deadline citation should be
F.S. § 744.362(1), not § 744.363 as first proposed here (§ 744.363 defines the plan's contents, not its
deadline). All statute citations in this document have now been checked against the official Florida
Statutes text, not carried forward from clerk worksheet shorthand or an earlier draft without verification.

---

## Candidate Items (Unscoped Backlog)

### 1. Simplified Accounting `guardians[]` Schema Drift + Excel Hardcap
Found during the Milestone 34-2 data-model audit, documented in [`probate-guardian-data-model.csv`](file:///d:/caernarvon-net/probate-guardian/probate-guardian-data-model.csv) and [`MILESTONE-34-2-PROPOSAL.md`](file:///d:/caernarvon-net/probate-guardian/MILESTONE-34-2-PROPOSAL.md):
- Simplified Accounting's "Add Co-Guardian" button pushes a row shaped for Annual Accounting (`officeStreet`/`officeCityStateZip`) into a collection that Simplified's own rendering/validation code reads as `residenceStreet`/`residenceCityStateZip`.
- [`simplified-accounting/excel.js`](file:///d:/caernarvon-net/probate-guardian/src/features/simplified-accounting/excel.js) hardcodes exactly 3 guardian slots, so a 4th+ co-guardian is invisible to Excel export/import even though it prints correctly in the PDF.
- Needs a dedicated accounting-family milestone to fix the row factory/reader and expand Excel export support.

### 2. Close Out 34-1C's Pending Full Regression Verification
[`MILESTONE-34-1-PROPOSAL.md`](file:///d:/caernarvon-net/probate-guardian/MILESTONE-34-1-PROPOSAL.md) records 34-1C (items 8–11: co-guardian suppression, tri-state checkboxes, Trust/Final copy separation, cross-filing county drift) as implemented with focused tests complete. Broader multi-profile regression verification is carried over here.

### 3–9. Explicitly Deferred Product Decisions
Carried forward verbatim from [`MILESTONE-34-1-PROPOSAL.md`](file:///d:/caernarvon-net/probate-guardian/MILESTONE-34-1-PROPOSAL.md):
3. Masked preview mode for SSN/EIN fields.
4. Duplicate-name drift warnings (e.g., two wards/parties with the same name across filings).
5. `None reported` placeholder text in empty schedules, in place of a blank table.
6. Export button regrouping (layout/IA decision, not a defect).
7. Zoom/fit controls in the PDF preview (currently hardcoded `scale = 1.5` in [`pdf-preview.js`](file:///d:/caernarvon-net/probate-guardian/src/core/pdf/pdf-preview.js)).
8. Wording polish such as "an Annual Accounting" grammar throughout.
9. Expanded `/s/` electronic-signature guidance/copy.

### 10. Downloads Delivery-Copy Refresh for Data Model CSV (Optional)
A contributor's Downloads-directory copy of [`probate-guardian-data-model.csv`](file:///d:/caernarvon-net/probate-guardian/probate-guardian-data-model.csv) may be refreshed from the workspace on request.

---

## Operational & Legal Context (6th Judicial Circuit Audit Workslips)

The Guardianship Division (`GD*.docx`) documents in this repository represent operational audit checklists used by deputy clerks in the Sixth Judicial Circuit (Pinellas and Pasco Counties). Reconciling our Plan features against these workslips requires adhering to authoritative statutory enactments:

1. **Ward Relocation Standards (F.S. § 744.1098)**:
   - **F.S. § 744.1098(1)**: A guardian *must obtain court approval prior to* relocating a ward to another state or to a non-adjacent county.
   - **F.S. § 744.1098(2)**: For relocations within the same county or to an adjacent county, prior approval is not required, but the guardian *must file a Notice of Change of Residence with the court within 15 days* after the move, stating compelling reasons and expected duration.
   - **Disaster Plan (AO 2024-025)**: Sixth Judicial Circuit Administrative Order 2024-025 (superseding legacy AO 2019-005 and AO 06-79) requires an updated Guardianship Emergency Disaster Plan upon any relocation of the ward, unless the ward resides with the guardian.

2. **Guardian Instruction & Education (F.S. § 744.3145)**:
   - **F.S. § 744.3145(2)**: Requires 8 hours of training for non-professional guardians of an adult ward.
   - **F.S. § 744.3145(3)**: Requires 4 hours of training for guardians of the property of a minor.
   - **F.S. § 744.3145(4)**: All required training must be completed and proof filed **within 4 months after appointment** (the clerk's "125 days" is an operational tick window).

3. **Background Investigation Fee ($27.50)**:
   - Clerk audit rules explicitly mandate that the $27.50 background investigation fee must be paid by the guardian individually and **cannot be paid from the ward's assets**.

4. **Advance Directives One-Time Filing**:
   - Pre-existing advance directives (DNR, Living Will, Healthcare Surrogate, POA) only need to be filed with the court once, not re-filed with every annual report unless modified or newly executed.

5. **Physician Examination Timing**:
   - **Adult Annual Plan (F.S. § 744.3675(1)(b))**: Physician examination must occur within **90 days before the beginning of the reporting period**.
   - **Minor Annual Plan**: Examination must occur within **180 days before the beginning of the reporting period**.

6. **Representation & Pro Se / Guardian Advocate Rules (Florida Probate Rule 5.030)**:
   - Plenary and limited guardians generally must be represented by an attorney unless representation is waived by court order.
   - Per Florida Probate Rule 5.030, **Guardian Advocates (Chapter 393) are not required to have an attorney**.
   - App validation must allow unrepresented filers to file without blocking on optional attorney certification fields.

---

## Sub-Milestone Execution Plan

### Milestone 35-1: Statutory Citations & Procedural Guidance Reconciliation

#### Scope
Update all user-facing procedural reminders in [`src/features/plan-*/print.js`](file:///d:/caernarvon-net/probate-guardian/src/features/plan-initial/print.js), [`src/features/plan-initial/index.js`](file:///d:/caernarvon-net/probate-guardian/src/features/plan-initial/index.js), [`src/legacy-app.js`](file:///d:/caernarvon-net/probate-guardian/src/legacy-app.js), and [`HOW-TO-RUN.txt`](file:///d:/caernarvon-net/probate-guardian/HOW-TO-RUN.txt) to reflect exact statutory subsections and clerk audit reminders:

1. **Initial Plan (`planInitial`)**:
   - Correct Initial Plan filing deadline citation to **F.S. § 744.362(1)** (60 days after Letters signed) —
     verified directly against statute text: § 744.362(1) is "Each guardian shall file with the court an
     initial guardianship report within 60 days after her or his letters of guardianship are signed";
     § 744.363 only defines the plan's *contents*, with no deadline language, and the currently-shipped
     citation, § 744.632, is Part VIII (Veterans' Guardianship) — an unrelated chapter. Three shipped strings
     cite the wrong section today: `plan-initial/print.js`'s manual reminder, `plan-initial/index.js`'s cover
     instructions, and `legacy-app.js`'s help content and walkthrough text.
   - Relocation reminder: `"If the ward relocated: file a Notice of Change of Residence within 15 days for moves to an adjacent county (F.S. § 744.1098(2)), obtain a prior court order for moves to non-adjacent counties or out of state (F.S. § 744.1098(1)), and file an updated Disaster Plan (AO 2024-025)."`
   - Education reminder: `"Non-professional guardians must complete the 8-hour education course and file proof within 4 months after appointment (F.S. § 744.3145(2), (4))."`
   - Background check reminder: `"The $27.50 background investigation fee must be paid by the guardian individually and cannot be paid from the ward's assets."`
   - Advance directives reminder: `"Attach copies of any pre-existing advance directives described in Question 11 unless already filed with the court (advance directives need only be filed once)."`

2. **Annual Plan (`planAnnual`)**:
   - Relocation reminder: `"If the ward relocated: file a Notice of Change of Residence within 15 days for moves to an adjacent county (F.S. § 744.1098(2)), obtain a prior court order for moves to non-adjacent counties or out of state (F.S. § 744.1098(1)), and file an updated Disaster Plan (AO 2024-025)."`
   - Physician exam reminder: `"Attach the physician's report based on an examination conducted within 90 days prior to the beginning of the reporting period (F.S. § 744.3675(1)(b))."`
   - DSHP reminder: `"If ward is an APD client with a Developmental Services Habilitation Plan (DSHP / Chapter 393), attach the current support plan (F.S. § 393.0651)."`
   - Advance directives reminder: `"Attach copies of any advance directives listed in Question 10 unless already filed with the court (advance directives need only be filed once)."`
   - Background check reminder: `"The $27.50 background investigation fee must be paid by the guardian individually and cannot be paid from the ward's assets."`

3. **Simplified Plan (`planSimplified`)**:
   - Relocation reminder: `"If the ward relocated: file a Notice of Change of Residence within 15 days for moves to an adjacent county (F.S. § 744.1098(2)), obtain a prior court order for moves to non-adjacent counties or out of state (F.S. § 744.1098(1)), and file an updated Disaster Plan (AO 2024-025)."`
   - Financial Statement reminder: `"Attach the Annual Financial Statement / Affidavit if required for this case (mandatory if guardian has property delegation and annual accountings were waived)."`
   - Background check reminder: `"The $27.50 background investigation fee must be paid by the guardian individually and cannot be paid from the ward's assets."`
   - **Not added, needs resolution first:** a proposed "Note: Certificate of service is not required for Simplified Plan under local Sixth Circuit court practice" reminder directly contradicts the shipped copy, which has said "Serve a copy on all interested persons, and file the certificate of service" since before this milestone. This is a local-practice claim from the `GD*.docx` workslips, not a statute I can verify against official text the way the F.S. citations above were checked. Left the existing text in place rather than resolve a legal contradiction from an unverified source — confirm against the actual clerk workslip (or ask the Clerk's office) before changing shipped guidance either direction.

4. **Plan Minor (`planMinor`)**:
   - Replace generic disclaimers with official procedural reminders from `GD ANN Work Slip Minor Review.docx`:
     - 90-day anniversary filing deadline (F.S. § 744.367).
     - 180-day physician examination window prior to reporting period start.
     - Sui juris transition: `"If the minor reaches 18 years of age (sui juris) during the reporting period, prepare for final discharge under F.S. § 744.527."`
     - Inter-county transfer check.
     - Relocation reminder under F.S. § 744.1098(1)/(2) and AO 2024-025.
     - Background check fee reminder ($27.50 not from minor's assets).

---

### Milestone 35-2: Plan Minor Case Number Enforcement

#### Problem Statement
In Plan Minor, no case number is enforced by [`validatePlanMinor`](file:///d:/caernarvon-net/probate-guardian/src/features/plan-minor/index.js#L393).
The cover page already has **two separate, independently-editable inputs** — "UCN" (bound to `d.ucn`) and
"Case #" (bound to `d.ref`) — not one input mistakenly bound to the wrong field, as an earlier draft of this
section claimed. `pdf-model.js` already prints both together
(`` `${d.ucn||''} ${d.ref||''}`.trim() ``), and `dashboard/view-model.js` already falls back through
`caseNumber || ucn || ref`. The real gap is narrower and lower-risk than "synchronize two fields the user
may intend to keep distinct" (Florida's standardized UCN and a local docket reference are legitimately
different values, and forcibly overwriting one when the other is edited would destroy that distinction):
[`case-resolver.js`](file:///d:/caernarvon-net/probate-guardian/src/core/case-resolver.js)'s `caseNumberOf()`
reads **only** `ward.ucn` for `planMinor`, with no fallback to `ward.ref` — so a filer who fills only "Case #"
would satisfy a naive `req(d.ucn || d.ref, ...)` validator while Case-grouping still treats the filing as
having no case number at all. Fix the resolver to match the fallback pattern already used elsewhere, instead
of adding UI synchronization.

#### Implementation Tasks
1. **Resolver fallback in [`src/core/case-resolver.js`](file:///d:/caernarvon-net/probate-guardian/src/core/case-resolver.js)`:caseNumberOf()`**:
   - Change the `planMinor` branch from `ward.ucn || ''` to `ward.ucn || ward.ref || ''`, matching
     `dashboard/view-model.js`'s existing `caseNumber || ucn || ref` fallback pattern. No UI change needed —
     both cover inputs stay independently editable.
2. **Validator Enforcement**:
   - Update [`validatePlanMinor`](file:///d:/caernarvon-net/probate-guardian/src/features/plan-minor/index.js#L393) to include:
     ```js
     req(d.ucn || d.ref, "Cover — Case Number is required");
     ```
3. **Readiness Check**:
   - Update [`planReadinessChecksMinor`](file:///d:/caernarvon-net/probate-guardian/src/features/plan-minor/print.js) auto-check to verify `has(d.ucn) || has(d.ref)`.

---

### Milestone 35-3: Plan Pro Se & Attorney Certification Decoupling

#### Problem Statement
[`validatePlanInitial`](file:///d:/caernarvon-net/probate-guardian/src/features/plan-initial/index.js#L587) and [`validatePlanMinor`](file:///d:/caernarvon-net/probate-guardian/src/features/plan-minor/index.js#L441) hard-require attorney name and signature unconditionally, preventing unrepresented filers and Guardian Advocates (who are exempt from attorney representation under Florida Probate Rule 5.030) from passing export validation.

#### Implementation Tasks
1. **Initial Plan (`planInitial`)**:
   - Make attorney validation in [`validatePlanInitial`](file:///d:/caernarvon-net/probate-guardian/src/features/plan-initial/index.js#L587) conditional:
     ```js
     if (d.attorney_name || d.attorney_bar || d.attorney_signatureDate) {
       req(d.attorney_name, 'Attorney Certification — Attorney name is required');
       req(d.attorney_signatureDate, 'Attorney Certification — Attorney signature date is required');
     }
     ```
   - Mirror the same condition in [`planReadinessChecksInitial`](file:///d:/caernarvon-net/probate-guardian/src/features/plan-initial/print.js).
2. **Plan Minor (`planMinor`)**:
   - Make preparer and attorney validation in [`validatePlanMinor`](file:///d:/caernarvon-net/probate-guardian/src/features/plan-minor/index.js#L441) conditional:
     ```js
     if (d.preparer_name || d.preparer_signatureDate) {
       req(d.preparer_name, 'Preparer & Attorney — Preparer name is required');
       req(d.preparer_signatureDate, 'Preparer & Attorney — Preparer signature date is required');
     }
     if (d.attorney_name || d.attorney_signatureDate) {
       req(d.attorney_name, 'Preparer & Attorney — Attorney name is required');
       req(d.attorney_signatureDate, 'Preparer & Attorney — Attorney signature date is required');
     }
     ```
   - Mirror the same condition in [`planReadinessChecksMinor`](file:///d:/caernarvon-net/probate-guardian/src/features/plan-minor/print.js).
3. **Annual Plan & Simplified Plan Verification**:
   - Confirm [`validatePlanAnnual`](file:///d:/caernarvon-net/probate-guardian/src/features/plan-annual/index.js#L686) and [`validatePlanSimplified`](file:///d:/caernarvon-net/probate-guardian/src/features/plan-simplified/index.js#L336) maintain their existing non-blocking pro se handling.

---

### Milestone 35-4: Exact Plan Readiness & Export Validator Invariant Reconciliation

#### Objective
Establish a strict 1:1 invariant between `planReadinessChecks().auto.every(c => c.ok)` and `validatePlan*().errors.length === 0` across all four Plan filing types, using exact canonical data model field keys.

#### Exact Field Mapping Matrix

##### 1. Initial Plan (`planInitial`)
| Section | Validator Requirement ([`plan-initial/index.js:520`](file:///d:/caernarvon-net/probate-guardian/src/features/plan-initial/index.js#L520)) | Readiness Predicate ([`plan-initial/print.js`](file:///d:/caernarvon-net/probate-guardian/src/features/plan-initial/print.js)) | Canonical Keys |
| :--- | :--- | :--- | :--- |
| **Cover Header** | `wardName`, `caseNumber`, `county`, `inceptionDate`, `lettersSignedDate` | `has(d.wardName) && has(d.caseNumber) && has(d.county) && has(d.inceptionDate) && has(d.lettersSignedDate)` | `wardName`, `caseNumber`, `county`, `inceptionDate`, `lettersSignedDate` |
| **Cover Ward Info** | `guardianNames`, `wardLiving`, `residenceAddress`, `residenceCityStateZip` | `has(d.guardianNames) && has(d.wardLiving) && has(d.residenceAddress) && has(d.residenceCityStateZip)` | `guardianNames`, `wardLiving`, `residenceAddress`, `residenceCityStateZip` |
| **Setting & Medical** | `q2Setting` (+ `q2Explain` if Other), any medical checkbox (+ `q3MedSpecialistArea` / `q3MedExplain`) | `has(d.q2Setting) && (d.q2Setting !== 'Other' || has(d.q2Explain)) && (d.q3MedPrimary || d.q3MedDentist || d.q3MedOphthalmologist || d.q3MedSpecialist || d.q3MedPT || d.q3MedST || d.q3MedOT || d.q3MedWardDecides || d.q3MedOther) && (!d.q3MedSpecialist || has(d.q3MedSpecialistArea)) && (!d.q3MedOther || has(d.q3MedExplain))` | `q2Setting`, `q2Explain`, `q3Med*` |
| **Mental & Personal** | `q4Mental` (+ `q4Explain`), `q5Personal` (+ `q5Explain`) | `has(d.q4Mental) && (d.q4Mental !== 'Other' && d.q4Mental !== 'None' || has(d.q4Explain)) && has(d.q5Personal) && (d.q5Personal !== 'Other' || has(d.q5Explain))` | `q4Mental`, `q4Explain`, `q5Personal`, `q5Explain` |
| **Social & Benefits** | any social checkbox (+ `q6Explain`), `q7Explain` if trusts/pending/other | `(d.q6CareFacility || d.q6NursesAides || d.q6FamilyFriends || d.q6DayProgram || d.q6WardDecides || d.q6Other) && (!d.q6Other || has(d.q6Explain)) && (!(d.q7Trusts || d.q7PendingBenefits || d.q7Other) || has(d.q7Explain))` | `q6*`, `q7*` |
| **Providers** | `(d.q9Providers||[]).some(r => r && r.name)` and no partial rows missing name | `(d.q9Providers||[]).filter(r => r && r.name).length > 0 && (d.q9Providers||[]).every(r => !r || !((r.providerType||r.examDate||r.street||r.cityStateZip||r.phone) && !r.name))` | `q9Providers[]` |
| **ADLs (10A)** | All 15 rated | `INITIAL_ADLS.every(([k]) => d.adls && d.adls[k])` | `adls.*` |
| **Disabilities (10B–D)** | At least one mental, physical, and used device (+ explains) | `(d.mentalAlzheimers||d.mentalAutism||d.mentalClosedHeadInjury||d.mentalDementia||d.mentalDepression||d.mentalDevelopmental||d.mentalSubstance||d.mentalSchizophrenia||d.mentalOther) && (!d.mentalOther||has(d.mentalExplain)) && (d.physMobility||d.physBlindness||d.physDeafness||d.physDiabetic||d.physParkinsons||d.physArthritis||d.physOther) && (!d.physOther||has(d.physExplain)) && (d.usesDentures||d.usesHearingAid||d.usesWheelchair||d.usesWalker||d.usesCrutches||d.usesProsthetics||d.usesGlasses||d.usesNone||d.usesOther) && (!d.usesOther||has(d.usesExplain))` | `mental*`, `phys*`, `uses*` |
| **Directives & Committee** | `q11NoDirectives !== q11Executed`, needed devices, committee recommendation (+ explain) | `(!!d.q11NoDirectives !== !!d.q11Executed) && (!d.q11ExecOther||has(d.q11ExecOtherText)) && (d.needsDentures||d.needsHearingAid||d.needsWheelchair||d.needsWalker||d.needsCrutches||d.needsProsthetics||d.needsGlasses||d.needsNone||d.needsOther) && (!d.needsOther||has(d.needsExplain)) && has(d.committeeIncorporated) && (d.committeeIncorporated !== 'No'||has(d.committeeExplain))` | `q11*`, `needs*`, `committee*` |
| **Guardian Signatures** | At least one cert checkbox + Guardian 1 contact & signature | `(d.certIncapacitatedNoCopy||d.certMinorNoCopy||d.certConsulted||d.certRecognizeRights||d.certNoRestriction||d.certProvidesCare) && has(g0.name) && has(g0.signatureDate) && has(g0.street) && has(g0.phone) && has(g0.ssn)` | `cert*`, `planGuardians[0]` |
| **Attorney Signatures** | Represented attorney name and date | `!(d.attorney_name||d.attorney_bar||d.attorney_signatureDate) || (has(d.attorney_name) && has(d.attorney_signatureDate))` | `attorney_name`, `attorney_signatureDate` |

##### 2. Annual Plan (`planAnnual`)
| Section | Validator Requirement ([`plan-annual/index.js:600`](file:///d:/caernarvon-net/probate-guardian/src/features/plan-annual/index.js#L600)) | Readiness Predicate ([`plan-annual/print.js`](file:///d:/caernarvon-net/probate-guardian/src/features/plan-annual/print.js)) | Canonical Keys |
| :--- | :--- | :--- | :--- |
| **Cover** | `wardName`, `caseNumber`, `county`, `gid`, `periodFrom`, `periodTo`, `guardian`, `wardLiving`, `residenceAddress`, `residenceCityStateZip` | `has(d.wardName) && has(d.caseNumber) && has(d.county) && has(d.gid) && has(d.periodFrom) && has(d.periodTo) && d.periodFrom < d.periodTo && d.gid <= d.periodFrom && has(d.guardian) && has(d.wardLiving) && has(d.residenceAddress) && has(d.residenceCityStateZip)` | `wardName`, `caseNumber`, `county`, `gid`, `periodFrom`, `periodTo`, `guardian`, `wardLiving`, `residenceAddress`, `residenceCityStateZip` |
| **Residences (Q1)** | At least one residence with name | `(d.q1Residences||[]).filter(r => r && (r.name||r.street||r.cityStateZip)).length > 0 && (d.q1Residences||[]).every(r => !r || !((r.street||r.cityStateZip) && !r.name))` | `q1Residences[]` |
| **Residence & Care (Q2-3)** | Q2 address change box checked + Q3 setting selected (+ explain) + specialist area if specialist | `(d.q2NoMove||d.q2WithinCounty||d.q2WithinCircuit||d.q2OutsideApproved||d.q2OutsideVenuePetition) && (d.q3SettingALF||d.q3SettingGroupHome||d.q3SettingIntermediate||d.q3SettingPrivate||d.q3SettingSkilled||d.q3SettingSpecialized||d.q3SettingStateHospital||d.q3SettingOther) && (!d.q3SettingOther||has(d.q3SettingExplain)) && (!d.q3MedSpecialist||has(d.q3MedSpecialistArea))` | `q2NoMove`, `q2Within*`, `q2Outside*`, `q3Setting*`, `q3MedSpecialistArea` |
| **Providers (Q4)** | At least one provider with name | `(d.q4Providers||[]).filter(r => r && (r.name||r.providerType||r.visits)).length > 0 && (d.q4Providers||[]).every(r => !r || !((r.providerType||r.visits) && !r.name))` | `q4Providers[]` |
| **Skills & Rights (Q5-6)** | `q5SocialSkills`, `q5Activities`, all 12 rights answered | `has(d.q5SocialSkills) && has(d.q5Activities) && PLAN_RIGHTS.every(([k]) => d.rights && d.rights[k])` | `q5SocialSkills`, `q5Activities`, `rights.*` |
| **ADLs (Q8)** | All 16 ADLs rated | `PLAN_ADLS.every(([k]) => d.adls && d.adls[k])` | `adls.*` |
| **Disabilities (Q9)** | Mental disabilities answered + Physical disabilities answered (+ explains) | `(d.q9MentalNone||d.q9MentalDementia||d.q9MentalAlzheimers||d.q9MentalAutism||d.q9MentalHeadInjury||d.q9MentalDevelopmental||d.q9MentalIntellectual||d.q9MentalSchizophrenia||d.q9MentalDepression||d.q9MentalSubstance||d.q9MentalOther) && (!d.q9MentalOther||has(d.q9MentalExplain)) && (d.q9PhysNone||d.q9PhysMobility||d.q9PhysBlindness||d.q9PhysDeafness||d.q9PhysDiabetic||d.q9PhysParkinsons||d.q9PhysArthritis||d.q9PhysOther) && (!d.q9PhysOther||has(d.q9PhysExplain))` | `q9Mental*`, `q9Phys*` |
| **Directives & Remuneration (Q10-11)** | Directives answered (not both none & executed) + Remuneration answered (+ name/details) | `(d.q10NoDirectives !== d.q10Executed) && (!d.q10ExecOther||has(d.q10ExecOtherText)) && ((d.q11NoRemuneration && has(d.q11NoRemunerationName)) || (!d.q11NoRemuneration && (has(d.q11ReceivedName)||has(d.q11Amount)||has(d.q11From))))` | `q10*`, `q11*` |
| **Signatures** | Guardian 1 contact, name, date, date order after periodTo | `has(g0.name) && has(g0.signatureDate) && has(g0.mailingStreet) && has(g0.phone) && has(g0.ssn) && (!d.periodTo || !g0.signatureDate || g0.signatureDate >= d.periodTo)` | `planGuardians[0]` |
| **Attorney** | Pro se safe: if signature date present, must be on/after periodTo | `!d.attorney_signatureDate || !d.periodTo || d.attorney_signatureDate >= d.periodTo` | `attorney_signatureDate` |

##### 3. Simplified Plan (`planSimplified`)
| Section | Validator Requirement ([`plan-simplified/index.js:293`](file:///d:/caernarvon-net/probate-guardian/src/features/plan-simplified/index.js#L293)) | Readiness Predicate ([`plan-simplified/print.js`](file:///d:/caernarvon-net/probate-guardian/src/features/plan-simplified/print.js)) | Canonical Keys |
| :--- | :--- | :--- | :--- |
| **Cover** | `wardName`, `caseNumber`, `county`, `periodFrom`, `periodTo`, period date order | `has(d.wardName) && has(d.caseNumber) && has(d.county) && has(d.periodFrom) && has(d.periodTo) && d.periodFrom < d.periodTo` | `wardName`, `caseNumber`, `county`, `periodFrom`, `periodTo` |
| **The Plan (Q1–Q6)** | `q1Residences`, `q2BestPlacement`, `q3MedicalTreatment`, `q4Diagnosis`, `q5SocialServices`, `q6Interaction` | `has(d.q1Residences) && has(d.q2BestPlacement) && has(d.q3MedicalTreatment) && has(d.q4Diagnosis) && has(d.q5SocialServices) && has(d.q6Interaction)` | `q1Residences` through `q6Interaction` |
| **Rights & Directives (Q7–Q8)** | `q7RestoreRights` (+ explain if Yes) + Q8 directives box (+ text if Other, not None with others) | `has(d.q7RestoreRights) && (d.q7RestoreRights !== 'Yes'||has(d.q7RestoreExplain)) && (d.q8DNR||d.q8LivingWill||d.q8Surrogate||d.q8POA||d.q8Other||d.q8None) && (!d.q8Other||has(d.q8OtherText)) && (!d.q8None||!(d.q8DNR||d.q8LivingWill||d.q8Surrogate||d.q8POA||d.q8Other))` | `q7RestoreRights`, `q7RestoreExplain`, `q8*` |
| **Remuneration (Q9)** | `q9Remuneration` (+ explain if Yes) | `has(d.q9Remuneration) && (d.q9Remuneration !== 'Yes'||has(d.q9RemunerationExplain))` | `q9Remuneration`, `q9RemunerationExplain` |
| **Signatures** | Guardian 1 name, date, email, phone, mailing address, date order | `has(g.name) && has(g.signatureDate) && has(g.email) && has(g.phone) && has(g.mailingAddress) && (!d.periodTo || !g.signatureDate || g.signatureDate >= d.periodTo)` | `planGuardians[0]` |
| **Preparer & Attorney** | If present, signature date on/after periodTo | `(!d.preparer_signatureDate || !d.periodTo || d.preparer_signatureDate >= d.periodTo) && (!d.attorney_signatureDate || !d.periodTo || d.attorney_signatureDate >= d.periodTo)` | `preparer_signatureDate`, `attorney_signatureDate` |

##### 4. Minor Plan (`planMinor`)
| Section | Validator Requirement ([`plan-minor/index.js:393`](file:///d:/caernarvon-net/probate-guardian/src/features/plan-minor/index.js#L393)) | Readiness Predicate ([`plan-minor/print.js`](file:///d:/caernarvon-net/probate-guardian/src/features/plan-minor/print.js)) | Canonical Keys |
| :--- | :--- | :--- | :--- |
| **Cover** | `amendedForm` tri-state, `wardName`, `caseNumber` (`ucn||ref`), `county`, `periodFrom`, `periodTo`, period order, `guardianName`, `q1ResidenceName`, `q1Street`, `amendedVersion` if Yes | `isTriStateAnswer(d.amendedForm) && has(d.wardName) && (has(d.ucn)||has(d.ref)) && has(d.county) && has(d.periodFrom) && has(d.periodTo) && d.periodFrom < d.periodTo && has(d.guardianName) && has(d.q1ResidenceName) && has(d.q1Street) && (d.amendedForm !== 'Yes'||has(d.amendedVersion))` | `amendedForm`, `wardName`, `ucn`, `ref`, `county`, `periodFrom`, `periodTo`, `guardianName`, `q1ResidenceName`, `q1Street`, `amendedVersion` |
| **Providers (Q3)** | At least one provider with last name, no partial rows missing last name | `(d.q3Providers||[]).filter(r => r && r.last).length > 0 && (d.q3Providers||[]).every(r => !r || !((r.first||r.providerType||r.street||r.city||r.phone) && !r.last))` | `q3Providers[]` |
| **Medical (Q4)** | At least one medical option (+ explain if Other) | `(d.q4Primary||d.q4Dentist||d.q4Specialist||d.q4PT||d.q4ST||d.q4OT||d.q4MinorDecides||d.q4Other) && (!d.q4Other||has(d.q4Explain))` | `q4Primary`, `q4*`, `q4Explain` |
| **Education & Social (Q5)** | `q5SchoolProgress`, `q5SocialDevelopment`, `q5Communicates`, `q5Interpersonal`, unmet needs option (+ explain if Other) | `has(d.q5SchoolProgress) && has(d.q5SocialDevelopment) && has(d.q5Communicates) && has(d.q5Interpersonal) && (d.q5NoUnmetNeeds||d.q5DoesNotCareToSocialize||d.q5UnmetNeeds||d.q5Other) && (!d.q5Other||has(d.q5Explain))` | `q5SchoolProgress`, `q5SocialDevelopment`, `q5Communicates`, `q5Interpersonal`, `q5NoUnmetNeeds`, `q5*` |
| **Signatures** | At least one cert box + Guardian 1 contact, name, date, date order | `(d.certIncapacitated||d.certMinor||d.certConsulted||d.certNoRestriction||d.certProvidesCare||d.certPhysicianAttached) && has(g0.name) && has(g0.signatureDate) && has(g0.mailingStreet) && has(g0.phone) && has(g0.tin) && (!d.periodTo || !g0.signatureDate || g0.signatureDate >= d.periodTo)` | `cert*`, `planGuardians[0]` |
| **Preparer & Attorney** | Pro se safe: if populated, must have name and signature date on/after periodTo | `(!(d.preparer_name||d.preparer_signatureDate) || (has(d.preparer_name) && has(d.preparer_signatureDate) && (!d.periodTo||d.preparer_signatureDate >= d.periodTo))) && (!(d.attorney_name||d.attorney_signatureDate) || (has(d.attorney_name) && has(d.attorney_signatureDate) && (!d.periodTo||d.attorney_signatureDate >= d.periodTo)))` | `preparer_name`, `preparer_signatureDate`, `attorney_name`, `attorney_signatureDate` |

---

## Verification & Acceptance Plan

### 1. Unit Tests
- Create [`tests/unit/plan-readiness-invariants.spec.js`](file:///d:/caernarvon-net/probate-guardian/tests/unit/plan-readiness-invariants.spec.js):
  - Validates all four plan types against empty, minimal valid, pro se, and fully populated fixture models.
  - Asserts that for every state, `planReadinessChecks().auto.every(c => c.ok)` strictly equals `validatePlan*().errors.length === 0`.
  - Asserts that every single `auto` check has a test demonstrating failure when its specific field is blank/invalid.
  - Asserts that all `manual` reminders are present and purely non-blocking strings.

### 2. E2E Tests
- Run `tests/e2e/navigation-status.contract.spec.ts` to ensure print preview banner and blocked-export alerts agree with the updated readiness items.
- Run `npm run test:e2e:source` to ensure zero regression across the entire E2E suite.

### 3. Review Gate
- Complete each sub-milestone (35-1, 35-2, 35-3, 35-4) sequentially, committing only after unit and contract tests pass.

---

## Milestone 35-5: Existing Guardianship-Type Selection Controls

### Objective
Replace clearly existing free-text or incomplete guardianship-type controls with
the option values found in the `GD*.docx` workslip templates, without adding any
new fields to any form.

### Scope Guardrails
- Do **not** add new fields to Plan, Accounting, Inventory, Trust, or Discharge
  forms.
- Do **not** add a new global guardianship-type field to Plan forms.
- Only update fields that already exist in the data model and UI.
- Preserve existing persisted values on load/export; if an older value does not
  match the new option list, display it safely until the user chooses a
  supported value.
- Do not change export validators in this sub-milestone except where required
  to keep the existing field control functional.

### Source Option Sets From GD Workslips

#### Primary Guardianship Type Options
Use this set for existing `typeOfGuardianship` controls:
- `Plenary`
- `Limited`
- `Guardian Advocate`
- `Voluntary`
- `Minor - Person`
- `Minor - Property`
- `Minor - Person - Property`

#### Guardian Classification Options
Use this set only where an existing field already captures guardian
professional/public/family status:
- `Professional`
- `Public`
- `Family`
- `Non-professional`

#### Appointment/Lifecycle Options
Use this set only where an existing field already captures successor/standby/
surrogate status:
- `Successor`
- `Standby`
- `Surrogate`
- `Emergency Temporary Guardianship`
- `None`

### Implementation Plan

1. **Shared constants**
   - Add canonical option arrays in an existing shared form/constants module, or
     a narrowly named new constants module if no suitable module exists:
     - `GUARDIANSHIP_TYPE_OPTIONS`
     - `GUARDIAN_CLASSIFICATION_OPTIONS`
     - `GUARDIANSHIP_LIFECYCLE_OPTIONS`
   - Use display labels that match the GD templates while keeping stable stored
     string values.
   - Add a small helper for legacy-safe selection rendering. If the stored
     value is non-empty and is not present in the canonical option list, inject
     it as an additional selected option labeled as the existing saved value
     rather than rendering a blank select. This protects previously persisted
     free-text values from becoming invisible or being clobbered on the next
     save.
   - Do not normalize or rewrite legacy values automatically; only change the
     stored value when the user actively chooses a supported option.

2. **Guardian Inventory**
   - Existing field: `typeOfGuardianship`.
   - Current UI already uses a select in
     [`guardian-inventory/index.js`](file:///d:/caernarvon-net/probate-guardian/src/features/guardian-inventory/index.js#L528).
   - Update the option list to include `Guardian Advocate`.
   - Keep existing options for `Plenary`, `Limited`, `Voluntary`,
     `Minor - Person`, `Minor - Property`, and
     `Minor - Person - Property`.
   - Use the legacy-safe selection helper so any previously saved free-text
     `typeOfGuardianship` value remains visible and selected.

3. **Annual Accounting**
   - Existing field: `typeOfGuardianship`.
   - Current UI is free text in
     [`annual-accounting/index.js`](file:///d:/caernarvon-net/probate-guardian/src/features/annual-accounting/index.js#L507).
   - Replace the free-text input with a select/autocomplete using
     `GUARDIANSHIP_TYPE_OPTIONS`.
   - Use the legacy-safe selection helper so any previously saved free-text
     `typeOfGuardianship` value remains visible and selected.
   - Verify PDF and Excel import/export continue to round-trip
     `typeOfGuardianship` unchanged.

4. **Simplified Accounting**
   - Existing field: `typeOfGuardianship`.
   - Current UI is free text in
     [`simplified-accounting/index.js`](file:///d:/caernarvon-net/probate-guardian/src/features/simplified-accounting/index.js#L328).
   - Replace the free-text input with a select/autocomplete using
     `GUARDIANSHIP_TYPE_OPTIONS`.
   - Use the legacy-safe selection helper so any previously saved free-text
     `typeOfGuardianship` value remains visible and selected.
   - Verify PDF and Excel import/export continue to round-trip
     `typeOfGuardianship` unchanged.

5. **Initial Plan**
   - Existing field: `successorGuardianship`.
   - Current UI is free text in
     [`plan-initial/index.js`](file:///d:/caernarvon-net/probate-guardian/src/features/plan-initial/index.js#L170).
   - Replace it with a select/autocomplete using
     `GUARDIANSHIP_LIFECYCLE_OPTIONS`.
   - Use the legacy-safe selection helper so any previously saved free-text
     `successorGuardianship` value remains visible and selected.
   - Do not add a separate guardianship-type field to Initial Plan.

6. **Plan Minor**
   - Existing fields: `professionalGuardian`, `publicGuardian`.
   - Current UI uses two Yes/No controls in
     [`plan-minor/index.js`](file:///d:/caernarvon-net/probate-guardian/src/features/plan-minor/index.js#L169).
   - Do not add a new guardian-classification field in this milestone.
   - Leave these as-is unless a later product decision explicitly authorizes a
     schema change. The GD-derived classification list cannot be represented
     cleanly by the two existing Yes/No fields without changing the model.

### Known Follow-On Gap
- Adding `Guardian Advocate` as an existing `typeOfGuardianship` option makes
  the filing label more accurate, but it does not by itself reconcile Guardian
  Inventory's attorney-required export validation. Guardian Inventory currently
  requires `attorneyForGuardian` and the Schedule D-2 attorney fields even
  though the GD workslips note the Florida Probate Rule 5.030 guardian-advocate
  exception. That validator change is intentionally outside 35-5's narrow
  "existing selection controls only" scope and should be tracked as a separate
  follow-on if Guardian Advocate support is implemented beyond labeling.

### Data Model Updates
- Update `probate-guardian-data-model.csv` for existing fields whose input
  control changes from string/free text to enum/select:
  - `common.D.typeOfGuardianship`
  - `plan_initial.D.successorGuardianship`
- Do not add rows for new fields.
- Run `npm run verify:data-model`.

### Verification
- Add or update focused unit tests for the option arrays and field rendering
  where comparable UI helpers already have coverage.
- Add a legacy-value rendering test: a stored non-empty value outside the
  canonical option list remains visible and selected, and is not rewritten
  unless the user chooses a different option.
- Add E2E smoke coverage for selecting:
  - `Guardian Advocate` on Guardian Inventory.
  - `Limited` on Annual Accounting.
  - `Minor - Person - Property` on Simplified Accounting.
  - `Successor` on Initial Plan.
- Run targeted E2E tests for the changed filing types, then request permission
  before running the full `npm test` suite.
