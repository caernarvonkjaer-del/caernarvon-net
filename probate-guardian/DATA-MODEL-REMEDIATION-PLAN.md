# Data Model Remediation Plan

## Purpose

Define the documentation contract for the filing data dictionary. Scope is the CSV itself and the tooling that checks it (`scripts/verify-data-model.mjs`); it does not extend to changing application runtime behavior. The existing CSV remains the inventory artifact; this document defines how it should be completed and checked.

## Canonical CSV Columns

The completed field table should use these columns, in this order:

```text
scope,storage_root,field_path,field_label,data_type,format,requiredness,required_when,allowed_values,sensitive,persistence_status,derived_or_input,collection_min,collection_max,initial_item_count,sync_party_ids,source_file,source_symbol,source_line,notes
```

## Column Contract

| Column | Meaning |
|---|---|
| `scope` | Filing or storage scope, such as `case_file`, `guardian`, `plan_annual`, or `annual_accounting`. |
| `storage_root` | Strictly the top-level identifier: `caseFile`, `D`, a named runtime-calculation object, or export metadata. Never put a nested object here. |
| `field_path` | The complete dot/bracket path below `storage_root`, such as `guardians[].ssnEin`, `q3Setting.facilityName`, or `rights.<rightKey>`. |
| `field_label` | User-facing label, not an internal variable name. |
| `data_type` | `string`, `boolean`, `enum`, `date`, `decimal`, `integer`, `object`, or `array<object>`. |
| `format` | More specific format such as `currency`, `percentage`, `phone`, `zip`, `ssn-ein`, `bar-number`, or `iso-date`. |
| `requiredness` | `required`, `optional`, or `conditional`; or `n/a` when (and only when) `persistence_status` is not `persisted` -- a derived/runtime/export-only value is never user-entered, so requiredness doesn't apply to it. |
| `required_when` | Machine-readable condition or a clear expression describing when a conditional field is required. Blank for `n/a` rows. |
| `allowed_values` | Enum values or a reference to a keyed domain such as `PLAN_RIGHTS` or `PLAN_ADLS`. |
| `sensitive` | `none`, `personal`, `financial`, `government-id`, `legal-id`, or `document-content`. |
| `persistence_status` | `persisted`, `derived`, `runtime`, or `export-only`. |
| `derived_or_input` | `input` or `derived`; do not mark calculated results as persisted input. |
| `collection_min` / `collection_max` | Collection constraints. Use `unbounded` where the code uses `Infinity`. |
| `initial_item_count` | Number of rows created by the empty-data factory. |
| `sync_party_ids` | Party-ID collection synchronized with the row collection, or blank. |
| `source_file` / `source_symbol` / `source_line` | Provenance for the factory, renderer, validator, or calculation. `source_file` and `source_symbol` are required; `source_line` is optional because line numbers are inherently volatile. |
| `notes` | Clarifying information, compatibility notes, or migration warnings. |

## Required Normalization Rules

1. Use actual storage paths. Filing scope is metadata and must not be prefixed into `field_path`. `storage_root` is only the top-level identifier; every nested segment belongs in `field_path` (for example, `storage_root=D`, `field_path=q3Setting.facilityName`, never `storage_root=D.q3Setting`).
2. Keep similarly named collections separate when their row shapes differ. For example, Plan Annual and Plan Initial `planGuardians[]` are different schemas.
3. Expand wildcard entries such as `q3Med*`, `q9Mental*`, `rights.*`, and `adls.*` into explicit rows. A separate pattern/domain row may document the key set, but it cannot replace the individual fields.
4. Record nullable dates as `data_type=date` with `format=iso-date` and document null/empty initialization in `notes`.
5. Distinguish boolean controls from Yes/No string enums. `false`, `''`, `No`, and `null` are not interchangeable.
6. Record conditional requirements explicitly, including vehicle details, `Other` explanations, amended versions, rights restoration, directive details, and remuneration.
7. Keep derived calculations in the same dictionary only when `persistence_status=derived` and the name matches an actual returned property.
8. Treat SSN/EIN, account numbers, VINs, bar numbers, case identifiers, phones, email addresses, and uploaded document content as sensitive according to their data class.
9. Attribute each field to the actual owning factory or implementation. Do not cite `state.js` for fields defined by a legacy factory or a schedule schema.
10. Treat `probate-guardian/probate-guardian-data-model.csv` as canonical. A delivery copy may be written to a contributor's Downloads directory when requested, but external-copy equality is not a repository acceptance criterion.

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
- [x] Expand Plan Minor's `q4*`/`q5*` wildcard rows into exact fields (found during this migration; the CSV's own header row hadn't flagged them as wildcards since the Plan Annual/Initial addendum, but they were `q4*`/`q5*` verbatim in `field_name`).
- [x] Add the canonical metadata columns. The CSV is migrated to the full 20-column contract (836 rows, up from 595). The increase is real completeness gained during migration, cross-checked field-by-field against every `emptyData*()` factory's actual literal keys (not estimated): 15 previously-undocumented `calcTotalsAnnual()` return fields; 3 collections that were single-object/array summary rows only (`witnesses[]`, `serviceRecipients[]`, `serviceAttorney.*`) expanded into their real per-field rows; Plan Minor's `q4*`/`q5*` literal wildcard rows expanded into their 21 real fields; and — the largest gap found — roughly 190 scalar/collection fields across Plan Annual (mainly its entire Q2/Q3/Q9/Q10/Q11/certification surface and `q10Directives[]`, which the old CSV never documented at all despite documenting the type's `rights`/`adls`/`benefits`/`q1Residences`/`q4Providers`/`planGuardians` fields), Plan Initial (its Q2/Q4/Q5/Q11/certification/attorney fields), Plan Minor (certification fields), and one-off gaps in Annual Accounting (`certRecipients[]` was undocumented for Annual despite being documented for Simplified) and Guardian Inventory (`bondWaivedDate`).
- [x] Add collection constraints and row-factory provenance. `collection_min`/`collection_max`/`initial_item_count`/`sync_party_ids` are filled for all ~25 repeatable collections, verified directly against `SCHEDULE_SCHEMAS` (`src/core/form/schedule-definitions.js`), each `emptyData*()` factory (`src/core/state.js`), and the legacy row-factory/add-remove functions in `src/legacy-app.js` and `src/features/guardian-inventory/index.js` -- not estimated.
- [x] Add enum domains and conditional requirement expressions. `allowed_values` references named domains (`PLAN_RIGHT_STATES`, `PLAN_ADL_RATINGS`, `FL_COUNTY_CIRCUIT` keys) where the contract's own example endorses referencing a domain rather than spelling out every value; explicit `Yes; No` etc. otherwise. `required_when` is filled for every `conditional` row (a handful of the old CSV's `conditional` rows had non-condition text in `notes` -- e.g. "Yes/No", "Repeatable row" -- as a literal fallback; corrected with real trigger conditions verified against each type's validator).
- [x] Correct all storage-root and source-symbol inconsistencies. `storage_root` is now always the bare top-level identifier (`D`, `caseFile`, or a named calculation function/object) per Normalization Rule 1 -- the old CSV's `annual.`/`simplified.`/`guardian.` prefixes are gone from `field_path` and now drive `scope` (split into `annual_accounting`/`simplified_accounting`/`guardian_inventory`) instead.
- [x] Confirm all derived names against implementation return values. Read `src/features/annual-accounting/totals.js` directly; found and added the 15 `calcTotalsAnnual()` return keys the old CSV never documented (`schC_gains/losses/net`, all Schedule D sub-totals, `bondReq`, `auditFee`).
- [x] Add `scripts/verify-data-model.mjs`, a zero-dependency Node checker, and expose it through a documented package script (`npm run verify:data-model`). It verifies exact header/order and row column counts; rejects blank `field_path` values and wildcard paths in canonical rows; rejects invalid enum values in `data_type`, `requiredness`, `sensitive`, `persistence_status`, and `derived_or_input` (including the `persistence_status`/`requiredness`-`n/a` pairing rule); and rejects duplicate keys on `(scope, storage_root, field_path, persistence_status)`.
- [x] Run the committed checker against the canonical CSV during remediation and retain a passing command in the milestone handoff: `npm run verify:data-model` → `verify-data-model: OK -- 836 rows, header and all constraints valid.` Repository-wide CI automation remains a separate approval decision -- not added here.
- [ ] Refresh a requested Downloads delivery copy from the canonical workspace CSV; do not use delivery-copy equality as repository acceptance. (No delivery copy has been requested yet.)
- [ ] Update every affected unit and E2E test in the same milestone as any runtime data-structure change. Not applicable to this pass -- this migration changed only the documentation CSV and added the verifier script; it made no runtime/application-code changes. One real, pre-existing data-model bug was found during the audit (see `probate-guardian-data-model.csv`'s `simplified_accounting.guardians[]` notes: the shared co-guardian row factory produces `officeStreet`/`officeCityStateZip` while Simplified's own rendering/validation/Excel code expects `residenceStreet`/`residenceCityStateZip`, and Excel export/import hard-caps at 3 guardians) -- documented, not fixed; fixing it is a separate, explicitly-scoped runtime milestone if the product owner wants it.
