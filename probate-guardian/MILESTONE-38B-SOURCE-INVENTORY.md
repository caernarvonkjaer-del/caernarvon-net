# Milestone 38B Source and Condition Inventory

## Status and Reading Rule

This is the completed source-classification artifact for Milestone 38B. It is
an implementation input, not legal advice. The ten DOCX files are operational
Sixth Judicial Circuit/Pinellas clerk workslips. They show clerk audit practice;
they do not independently establish statewide law or authorize the app to
claim court approval.

Use these classifications:

- `automatic`: the condition is determinable from current filing state and is
  represented by a canonical typed issue or a named readiness predicate.
- `manual`: the filer can act or confirm the fact, but the app cannot prove it.
- `unsupported`: the fact belongs to clerk/court systems, another filing, or a
  case classification not represented in current state. Do not render it as a
  pass/fail row. Render only the concise filer-facing reminder named below when
  one exists.

For automatic blocking rows, the canonical issue ID produced by 38D Phase 1 is
the readiness ID. The configuration must not duplicate its predicate or text.
Existing Plan readiness-only IDs listed below remain stable. Repetitive
Yes/No/comment/auditor-action rows are intentionally grouped by source section;
they are not separate app conditions.

## Shared Disposition Rules

Apply these rules to every filing:

| Source condition family | Disposition |
| --- | --- |
| Current form identity, period, required selections, populated required fields, row completeness, arithmetic/reconciliation, and signatures represented in app state | `automatic`; consume canonical validation issues and routes. |
| Attachment existence, original signatures, service, notice, filing deadline, payment, professional registration, address on clerk file, prior court approval, separate petition/report, and facts outside the generated filing | `manual`; display a concise action/confirmation reminder. |
| Audit level, docket/event history, letters/rights removed, case flags, clerk task notes, estate-value/audit-tab entries, judicial review instructions, bond/fee approval, objections, sanctions, and other clerk-only records/actions | `unsupported`; omit unless a concise filer action is expressly listed below. |
| Statute/rule citation found only in a workslip | label as local-practice context without a legal citation. Retain a citation only when the repository already records its authoritative verification. |

## Filing Inventories

### Guardian Inventory

Source: `GD INIT Work Slip Inventory.docx`, grouped as case/letters review,
verified-inventory form review, schedules/assets/liabilities/income, guardian
and attorney/signature review, support documentation, and clerk audit actions.

| ID family | Source group | Class | Card content/owner |
| --- | --- | --- | --- |
| `guardian.*` | Caption, filing identity, reporting/as-of date, guardian/preparer/attorney signatures, and Schedules A-F field/row completeness | `automatic` | Canonical `validateGuardian()` issues from `src/features/guardian-inventory/index.js`; use issue message and route. |
| `guardian.readiness.supporting-records` | Statements, appraisals, proof of ownership/value, restricted-account evidence, and other supporting documents | `manual` | “Confirm required statements, appraisals, and supporting records are filed or retained as directed by the court.” |
| `guardian.readiness.service-and-deadline` | Filing timing, notice/service, and separate court requirements | `manual` | “Confirm the inventory was filed on time and that any required notice or service is complete.” |
| `guardian.unsupported.case-record` | Letters, removed rights, docket history, case flags, audit level, prior filings, bond/fee/court actions | `unsupported` | No card row; the app has no authoritative case-system state. |

### Simplified Accounting

Source: `GD ANN Work slip Simplified 02272020.docx`, grouped as case/letters
review, reporting period, simplified-account form and schedules, guardians and
signatures, transactions/supporting records, and clerk audit actions.

| ID family | Source group | Class | Card content/owner |
| --- | --- | --- | --- |
| `simplified.*` | Caption, period, Part I-III values/reconciliation, Part IV guardians/signatures, preparer and attorney data | `automatic` | Canonical `validateSimplified()` issues from `src/features/simplified-accounting/index.js`; use issue message and route. |
| `simplified.readiness.supporting-records` | Statements, receipts, explanations, and other transaction support | `manual` | “Confirm statements, receipts, and explanations required for this accounting are available or filed.” |
| `simplified.readiness.filing-steps` | Deadline, service, fees, and separate plan/financial-statement obligations | `manual` | “Confirm filing deadline, service, fees, and any separate plan or financial statement required for this case.” |
| `simplified.unsupported.case-record` | SSN on file, letters/rights, waiver status, case flags, audit level/tab, clerk notes and review actions | `unsupported` | No card row. |

### Annual Accounting

Source: `GD ANN WORK SLIP AUDIT.docx`, grouped as case authority and audit
scope, opening/closing balances, receipts/disbursements, Schedules A-E and F,
reconciliation, supporting records, guardian/signature/fee review, and clerk or
judicial audit actions.

| ID family | Source group | Class | Card content/owner |
| --- | --- | --- | --- |
| `annual.*` | Caption, period, certification/signatures, opening and closing balances, schedule values/rows, totals, and reconciliation represented on the form | `automatic` | Canonical `validateAnnual()` issues from `src/features/annual-accounting/index.js`; Final and Trust use scoped aliases below rather than this filing ID. |
| `annual.readiness.supporting-records` | Bank/custodian statements, receipts, invoices, appraisals, tax records, and transaction explanations | `manual` | “Confirm required statements and supporting records reconcile to the accounting and are filed or retained as directed.” |
| `annual.readiness.external-approvals` | Filing/service timing, guardian/attorney/accountant fees, restricted accounts, sales, investments, court approval, and objections | `manual` | “Confirm required service, approvals, fee petitions, and other case-specific filing steps are complete.” |
| `annual.unsupported.audit-record` | Rights/letters, docket comparison, prior balances from court records, audit level, flags, sanctions, objections, audit-tab/task-note/judicial actions | `unsupported` | No card row. |

### Final/Discharge Accounting

Source: `GD DISC Work Slip 02272020.docx`, grouped as petition for discharge,
notice and objections, final accounting, distribution/receipts, fees/costs,
closing documents, and clerk/court discharge actions.

| ID family | Source group | Class | Card content/owner |
| --- | --- | --- | --- |
| `finalAccounting.*` | Final-accounting caption, period, schedules, values, reconciliation, certifications, and signatures represented in app state | `automatic` | `validateAnnual()` with `finalAccounting` registry scope; use canonical issue message and route. |
| `finalAccounting.readiness.petition-notice` | Petition reason/statements, notice language/service, objection period, and separate closing papers | `manual` | “Confirm the petition for discharge, required notice/service, objection period, and closing papers are complete.” |
| `finalAccounting.readiness.distribution` | Final distributions, receipts/releases, unpaid or anticipated fees/costs, and court approval | `manual` | “Confirm final distributions, receipts or releases, and any fee/cost approvals required by the court.” |
| `finalAccounting.unsupported.case-record` | Docketed notice/proof, objections, event expiration, clerk notes, audit tab, and discharge-order actions | `unsupported` | No card row. |

### Trust Accounting

Source: `GD ANN Work Slip TRUST.docx`, grouped as case/trust authority, trust
account form and schedules, opening/closing balances, transactions,
reconciliation, supporting records, signatures/fees, and clerk audit actions.

| ID family | Source group | Class | Card content/owner |
| --- | --- | --- | --- |
| `trustAccounting.*` | Trust-accounting caption, period, schedules, values, reconciliation, certifications, and signatures represented in app state | `automatic` | `validateAnnual()` with `trustAccounting` registry scope; use canonical issue message and route. |
| `trustAccounting.readiness.trust-records` | Trust instrument, statements, receipts/invoices, asset support, and transaction explanations | `manual` | “Confirm the trust instrument and required statements and transaction support are available or filed.” |
| `trustAccounting.readiness.external-approvals` | Filing/service timing, compensation/fees, distributions, investment or sale approval, and other court-directed steps | `manual` | “Confirm required service, compensation or fee approval, distributions, and other court-directed steps.” |
| `trustAccounting.unsupported.audit-record` | Letters/rights, docket and prior-audit facts, case flags, audit level/tab, clerk notes, and judicial actions | `unsupported` | No card row. |

### Simplified Plan

Source: `GD ANN Work Slip Review Simplified Plan.docx`, grouped as case status
and financial statement, plan cover/questions, guardian contact/signatures,
advance directives and attachments, service/filing steps, and clerk actions.

| ID family | Source group | Class | Card content/owner |
| --- | --- | --- | --- |
| Existing `cover.*`, `plan.*`, and `signatures.*` IDs | Cover, Questions 1-9, guardian contact/signature | `automatic` | Preserve predicates and labels in `planReadinessChecksSimplified()`; map matching blockers to canonical `planSimplified.*` issue IDs during 38D Phase 1. |
| `planSimplified.readiness.attachments-and-service` | Advance directives, financial statement, physician report, service, relocation, fee, registration, and address-on-file facts | `manual` | Preserve the current concise manual reminders, subject to county policy. |
| `planSimplified.unsupported.case-record` | Incapacity/advocacy status, case flags, letters, audit tab, task notes, and clerk comparisons | `unsupported` | No card row. |

### Annual Plan

Source: `GD ANN Work Slip Review.docx`, grouped as case/letters and financial
statement, plan cover/Questions 1-11, guardian contact/signatures, physician
statement/report and directives, service/filing steps, and clerk actions.

| ID family | Source group | Class | Card content/owner |
| --- | --- | --- | --- |
| Existing `cover.*`, `plan.*`, and `signatures.*` IDs | Cover, Questions 1-11, guardian contact/signature | `automatic` | Preserve predicates and labels in `planReadinessChecksAnnual()`; map matching blockers to canonical `planAnnual.*` issue IDs during 38D Phase 1. |
| `planAnnual.readiness.attachments-and-service` | Physician statement/report, directives, financial statement, service, relocation, fee, registration, and address-on-file facts | `manual` | Preserve current concise manual reminders, subject to county policy. |
| `planAnnual.unsupported.case-record` | Incapacity/type, rights/letters, flags, audit tab, prior-plan comparison, task notes, and clerk review | `unsupported` | No card row. |

### Initial Plan

Source: `GD INIT WORK SLIP REVIEW.docx`, grouped as case authority/letters,
initial-plan cover and Questions 1-11, guardian/attorney certifications and
signatures, directives and external education/service/filing steps, and clerk
actions.

| ID family | Source group | Class | Card content/owner |
| --- | --- | --- | --- |
| Existing `cover.*`, `plan.*`, and `signatures.*` IDs | Cover, Questions 1-11, guardian/preparer/attorney certifications and signatures | `automatic` | Preserve predicates and labels in `planReadinessChecksInitial()`; map matching blockers to canonical `planInitial.*` issue IDs during 38D Phase 1. |
| `planInitial.readiness.external-steps` | Directives, service, relocation, education proof, fee, registration, original signatures, address-on-file, and locally verified disaster-plan reminder | `manual` | Preserve current concise reminders; show local items only through county policy. |
| `planInitial.unsupported.case-record` | Ward-death/case status, rights/letters, flags, estate audit value, docket/task notes, and clerk review | `unsupported` | No card row. |

### Minor Plan

Source: `GD ANN Work Slip Minor Review.docx`, grouped as case/letters and
reporting period, annual-minor-plan cover/questions, guardian/preparer/attorney
signatures, physician statement, service/filing/age-of-majority steps, and
clerk actions.

| ID family | Source group | Class | Card content/owner |
| --- | --- | --- | --- |
| Existing `cover.*`, `plan.*`, and `signatures.*` IDs | Cover, residence/providers, Questions 4-5, guardian/preparer/attorney certifications and signatures | `automatic` | Preserve predicates and labels in `planReadinessChecksMinor()`; map matching blockers to canonical `planMinor.*` issue IDs during 38D Phase 1. |
| `planMinor.readiness.external-steps` | Physician statement, service, relocation, deadline, majority/discharge planning, fee, registration, and address-on-file | `manual` | Preserve current concise reminders, subject to county policy. |
| `planMinor.unsupported.case-record` | SSN, person-only status, rights/letters, transfer/history, audit values, flags, task notes, and clerk review | `unsupported` | No card row. |

## DSHP Disposition

Source: `GD ANN Work Slip Review DSHP.docx`. Its title is **Clerk's Review of
Annual Guardianship Plan [DSHP]**, it cites Chapter 393 context, and its body
contains advocate-case/incapacity and developmental-services review prompts.
It is therefore an Annual Plan overlay for developmental-services/guardian-
advocate cases, not a tenth filing.

The current state model has no verified discriminator proving that a ward is a
DSHP/Chapter 393 or guardian-advocate case. Classify the entire overlay as
`unsupported` for Milestone 38B and create no runtime configuration or hidden
predicate. Keep Annual Plan's existing manual reminder to attach a current
support plan when the filer knows it applies. A future data-model proposal may
add an explicit case classification and then scope this overlay; that future
work is not a 38B prerequisite and does not block the nine configurations.

## Completeness Test Contract

A source-map fixture must enumerate exactly these nine filing keys and assert:

1. each has at least one automatic family and a manual or unsupported
   disposition;
2. every rendered automatic blocking row references a canonical registry ID;
3. every bypassable validation issue for that filing appears exactly once in
   the automatic card or in an explicit `outOfCard` allow-list limited to
   technical/security/output-capability categories;
4. no `unsupported` group is rendered as checked/passed;
5. the DSHP overlay creates no tenth filing key and no automatic row.
