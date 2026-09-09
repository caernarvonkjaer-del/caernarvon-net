# Data Model Remediation Plan

## Purpose

Define the documentation contract for the filing data dictionary. This plan does not authorize application-code, test-code, or runtime changes. The existing CSV remains the inventory artifact; this document defines how it should be completed and checked.

## Canonical CSV Columns

The completed field table should use these columns, in this order:

```text
scope,storage_root,field_path,field_label,data_type,format,requiredness,required_when,allowed_values,sensitive,persistence_status,derived_or_input,collection_min,collection_max,initial_item_count,sync_party_ids,source_file,source_symbol,source_line,notes
```

## Column Contract

| Column | Meaning |
|---|---|
| `scope` | Filing or storage scope, such as `case_file`, `guardian`, `plan_annual`, or `annual_accounting`. |
| `storage_root` | Actual root object: `caseFile`, `D`, runtime calculation object, or export metadata. |
| `field_path` | Canonical path below the root, such as `guardians[].ssnEin` or `rights.<rightKey>`. |
| `field_label` | User-facing label, not an internal variable name. |
| `data_type` | `string`, `boolean`, `enum`, `date`, `decimal`, `integer`, `object`, or `array<object>`. |
| `format` | More specific format such as `currency`, `percentage`, `phone`, `zip`, `ssn-ein`, `bar-number`, or `iso-date`. |
| `requiredness` | `required`, `optional`, or `conditional`. |
| `required_when` | Machine-readable condition or a clear expression describing when a conditional field is required. |
| `allowed_values` | Enum values or a reference to a keyed domain such as `PLAN_RIGHTS` or `PLAN_ADLS`. |
| `sensitive` | `none`, `personal`, `financial`, `government-id`, `legal-id`, or `document-content`. |
| `persistence_status` | `persisted`, `derived`, `runtime`, or `export-only`. |
| `derived_or_input` | `input` or `derived`; do not mark calculated results as persisted input. |
| `collection_min` / `collection_max` | Collection constraints. Use `unbounded` where the code uses `Infinity`. |
| `initial_item_count` | Number of rows created by the empty-data factory. |
| `sync_party_ids` | Party-ID collection synchronized with the row collection, or blank. |
| `source_file` / `source_symbol` / `source_line` | Provenance for the factory, renderer, validator, or calculation. |
| `notes` | Clarifying information, compatibility notes, or migration warnings. |

## Required Normalization Rules

1. Use actual storage paths. Filing scope is metadata and must not be prefixed into `field_path`.
2. Keep similarly named collections separate when their row shapes differ. For example, Plan Annual and Plan Initial `planGuardians[]` are different schemas.
3. Expand wildcard entries such as `q3Med*`, `q9Mental*`, `rights.*`, and `adls.*` into explicit rows. A separate pattern/domain row may document the key set, but it cannot replace the individual fields.
4. Record nullable dates as `data_type=date` with `format=iso-date` and document null/empty initialization in `notes`.
5. Distinguish boolean controls from Yes/No string enums. `false`, `''`, `No`, and `null` are not interchangeable.
6. Record conditional requirements explicitly, including vehicle details, `Other` explanations, amended versions, rights restoration, directive details, and remuneration.
7. Keep derived calculations in the same dictionary only when `persistence_status=derived` and the name matches an actual returned property.
8. Treat SSN/EIN, account numbers, VINs, bar numbers, case identifiers, phones, email addresses, and uploaded document content as sensitive according to their data class.
9. Attribute each field to the actual owning factory or implementation. Do not cite `state.js` for fields defined by a legacy factory or a schedule schema.
10. Treat `probate-guardian/probate-guardian-data-model.csv` as canonical. A delivery copy may be written to `C:\Users\clkmt07\Downloads\probate-guardian-data-model.csv`, but external-copy equality is not a repository acceptance criterion.

## Collection Inventory To Complete

| Scope | Collection | Row-shape source | Constraint work |
|---|---|---|---|
| Guardian Inventory | `scheduleA1[]` through `scheduleC5[]` | `emptyDataGuardian()` plus Guardian feature renderers | Document row fields, sensitivity, and default/min/max behavior. |
| Guardian Inventory | `serviceRecipients[]` | Guardian feature/state | Document recipient row fields and service-date override. |
| Guardian Inventory | `witnesses[]` | Guardian feature/state | Document optional witness row fields. |
| Simplified Accounting | `guardians[]`, `certRecipients[]`, `remuneration[]` | `emptyDataSimplified()` and schedule schemas | Record initial rows and floors. |
| Annual Accounting | `guardians[]`, `trusts[]`, `certRecipients[]`, `remuneration[]`, `schA[]` through `schF2[]` | `emptyDataAnnual()` and schedule schemas | Keep Annual, Final, and Trust aliases documented as shared storage with distinct filing descriptors. |
| Plan Simplified | `planGuardians[]` | `emptyDataPlanSimplified()` | Record combined `mailingAddress` shape and maximum rows. |
| Plan Annual | `q1Residences[]`, `q4Providers[]`, `q10Directives[]`, `planGuardians[]` | `emptyDataPlanAnnual()` and legacy factories | Keep rights/ADL/benefit key domains explicit. |
| Plan Initial | `q9Providers[]`, `q11Directives[]`, `planGuardians[]` | `emptyDataPlanInitial()` and legacy factories | Do not reuse Plan Annual guardian or provider row definitions. |
| Plan Minor | `q2Residences[]`, `q3Providers[]`, `planGuardians[]` | `emptyDataPlanMinor()` and legacy factories | Record guardian taxpayer ID and certification rows separately. |

## Derived-Field Rule

Annual calculations must use the actual outputs of `calcTotalsAnnual()`:

- `schA`, `schB1`, `schB2`, `schB3`, `schB4`
- `totalDisb`
- `schC_gains`, `schC_losses`, `schC_net`
- `netAssets`
- Schedule D totals
- `netAssetsFromD`, `bondReq`, and `auditFee`

Reconciliation must use the actual outputs of `annualReconcileState()`:

- `diff`
- `outOfBalance`
- `explanation`
- `explained`

Simplified Accounting calculations are runtime values, not persisted fields:

- `totalIncome`
- `totalDisbursements`
- `remaining`

## Completion Checklist

- [x] Expand every Plan Annual wildcard into exact fields.
- [x] Expand every Plan Initial wildcard into exact fields.
- [ ] Add the canonical metadata columns.
- [ ] Add collection constraints and row-factory provenance.
- [ ] Add enum domains and conditional requirement expressions.
- [ ] Correct all storage-root and source-symbol inconsistencies.
- [ ] Confirm all derived names against implementation return values.
- [ ] Validate the canonical CSV with an executable checker: parse it with a CSV parser; reject blank `field_path` values; reject wildcard paths in canonical rows; reject invalid enum values in `data_type`, `requiredness`, `sensitive`, `persistence_status`, and `derived_or_input`; and reject duplicate keys on `(scope, storage_root, field_path, persistence_status)`.
- [ ] Run the checker as a documented one-off PowerShell/Node command during remediation; promote it to a committed docs-check only if the project later approves repository automation.
- [ ] Refresh the Downloads delivery copy from the canonical workspace CSV when a delivery copy is requested; do not use Downloads-copy equality as repository acceptance.
- [ ] Update every affected unit and E2E test in the same milestone as any runtime data-structure change. Cover exact field names, collection row shapes, boolean versus Yes/No enum behavior, nullable dates, tri-state answers, identity-party mappings, minimal-valid fixtures, validation counts, jump-link field paths, PDF/export fixtures, and any compatibility aliases or migrations introduced to preserve existing saved data.
