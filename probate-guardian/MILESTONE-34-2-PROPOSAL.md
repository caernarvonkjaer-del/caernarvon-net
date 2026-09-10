# Milestone 34-2: Data Model Documentation Remediation

## Status

**Proposal only, documentation scope.** No product-code, test-code, or
runtime change is authorized by this document. Split out of
`MILESTONE-34-PROPOSAL.md` (2026-09-09) so that document could stay scoped
to its actual, ready-to-implement web-mode chunk-load-failure test; this is
long-term field-naming/schema documentation harmonization work tracked
alongside `DATA-MODEL-REMEDIATION-PLAN.md` and
`probate-guardian-data-model.csv`, unrelated to distribution-target test
coverage.

**Known open inconsistency:** `DATA-MODEL-REMEDIATION-PLAN.md`'s canonical
CSV column contract (`scope,storage_root,field_path,field_label,data_type,
format,requiredness,required_when,allowed_values,sensitive,
persistence_status,derived_or_input,collection_min,collection_max,
initial_item_count,sync_party_ids,source_file,source_symbol,source_line,
notes` — 20 columns) does not yet match the columns actually present in the
committed `probate-guardian/probate-guardian-data-model.csv`
(`scope,field_name,field_label,data_type,requiredness,sensitive,persisted,
derived_or_input,notes,source`). The migration to the canonical contract
below is exactly what closes that gap; until it lands, treat the CSV as a
partial inventory, not the canonical artifact its own plan describes.

## Documentation Status Addendum (2026-09-09)

This addendum tracks planning artifacts only; it does not change any
product-code or test-code scope.

- Completed: Plan Annual wildcard dictionary rows expanded to exact
  `rights.*`, `adls.*`, and `benefits.*` field entries in
  `probate-guardian-data-model.csv`.
- Completed: Plan Initial wildcard dictionary rows expanded to exact `q3`,
  `q6`, `q7`, `adls`, `mental*`, `phys*`, `uses*`, `needs*`, `q9Providers[]`,
  `q11Directives[]`, and `planGuardians[]` field entries in
  `probate-guardian-data-model.csv`.
- A delivery copy may be refreshed from the canonical CSV on request. Its
  location is deliberately environment-local (for example,
  `~/Downloads/probate-guardian-data-model.csv`) and is not a repository
  artifact or acceptance criterion.
- Still pending (separate documentation scope): migration of the CSV to the
  canonical 20-column contract and implementation/execution of the stricter
  `(scope, storage_root, field_path, persistence_status)` uniqueness checker.

## Documentation-Only Data-Model Remediation

This section records the remaining schema work requested during the review.
It is documentation work only: it authorizes no product-code, test-code, or
runtime changes.

### Current Findings

- Initial Inventory is now represented through its scalar fields, collection
  references, and expanded A-1 through C-5 row fields in the companion CSV.
- Plan Annual and Plan Initial wildcard entries have been expanded into exact
  persisted paths in the current inventory. The canonical-schema migration
  must preserve that granularity for checkbox fields, conditional
  explanations, certification fields, rights/ADL maps, directive rows,
  provider rows, and guardian signature rows; it must not reintroduce pattern
  rows as substitutes for concrete paths.
- The same collection name does not imply the same row shape. In particular,
  Plan Annual and Plan Initial `planGuardians[]` rows differ, and the plan
  provider/directive collections must remain filing-specific.
- Common-looking names in the CSV are not always canonical storage paths.
  Filing scope must remain separate from the actual `D.*` or `caseFile.*`
  path.
- Annual calculation outputs are runtime-derived values, not persisted fields.
  The CSV must use the actual names returned by `calcTotalsAnnual()` and
  `annualReconcileState()`.

### Documentation Tasks

1. Expand Plan Annual wildcards into exact fields: cover fields; Q2 movement
   choices; Q3 setting, medical, mental-health, personal-care, and social
   groups; benefits; Q5 narrative fields; rights; ADLs; Q9 disability/device
   groups; Q10 directives; Q11 remuneration; certification; guardians; and
   attorney fields.
2. Expand Plan Initial wildcards into exact fields: cover fields; Q2-Q7
   choices and explanations; provider rows; ADLs; mental/physical/device
   groups; committee recommendations; directives; certification; guardian
   rows; and attorney fields.
3. Add collection metadata for every repeatable group: canonical path,
   minimum rows, maximum rows, initial row count, row factory, and party-ID
   synchronization behavior.
4. Add type metadata: boolean versus Yes/No enum, nullable date, currency,
   percentage, phone, ZIP, identifier, free text, and keyed enum values.
5. Add conditional metadata such as `required_when` for amended forms,
   vehicle details, "Other" explanations, rights restoration, directive
   details, remuneration, and certification choices.
6. Correct source attribution so each row points to its actual factory,
   renderer, validator, or calculation function.
7. Add provenance columns for `source_file`, `source_symbol`, optional
   `source_line`, `storage_root`, and `persistence_status` (`persisted`,
   `derived`, `runtime`, or `export-only`). `source_file` plus
   `source_symbol` are the durable provenance contract; populate
   `source_line` only when it materially helps a reviewer locate a stable
   declaration, and leave it blank otherwise.
8. Add a zero-dependency Node verifier at `scripts/verify-data-model.mjs` and
   a documented package-script entry. It must parse the canonical CSV and
   reject wrong column order/count, blank `field_path` values, wildcard paths,
   invalid metadata-domain values, and duplicate
   `(scope, storage_root, field_path, persistence_status)` keys. It is
   documentation-quality tooling only and must not alter application behavior.

### Documentation Acceptance Criteria

- No wildcard field names remain in the canonical field table.
- Every persisted property in each `emptyData*()` factory has an explicit
  field or collection-row entry.
- Plan Annual and Plan Initial collections are documented separately even
  where their collection names match.
- Every derived field names an actual returned calculation property or is
  removed from the persisted-field table.
- Every row has a filing scope, canonical storage path, data type, requiredness
  rule, sensitivity classification, persistence status, and source symbol.
- `scripts/verify-data-model.mjs` is committed, documented, and run against
  the canonical CSV, including
  its duplicate-key, wildcard-path, blank-path, and metadata-domain checks.
- The canonical CSV is `probate-guardian/probate-guardian-data-model.csv`.
  A delivery copy may be written to a contributor's Downloads directory, but
  the external copy is not part of repository acceptance; when present, it
  should be refreshed from the canonical workspace CSV.
