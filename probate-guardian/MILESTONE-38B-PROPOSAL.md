# Milestone 38B: Universal Filing and Clerk Review Readiness Cards

## Status

**Executable, independent delivery specification.** 38D Phase 1 is its named
code prerequisite. No runtime or test change is included in this documentation
pass.

## Goal

Give every one of the nine filing types exactly one accessible readiness card
on Preview & Export, using filing-specific, source-mapped automatic checks and
manual or unsupported review items.

## Decisions

- Pinellas and Pasco cards are titled **Clerk's Review Readiness** and may show
  mapped Sixth Judicial Circuit workslip context.
- Every other county uses **Filing Readiness** and omits Pinellas, Pasco, Sixth
  Circuit, and local-clerk requirement claims.
- Automatic failures open the card by default. When automatic checks pass, the
  collapsed summary says **Automated checks passed; manual review remains**
  whenever manual or unsupported items exist. It must not say or imply that
  the filing as a whole passed.
- Manual and unsupported items never become automatic passes or export gates.
- Readiness guidance remains outside PDF, Word, Excel, and printed court-form
  content.
- Migrating the four existing Plan panels is a visible UI change for current
  users: today's always-expanded, county-agnostic **Clerk's review readiness**
  panel becomes an accordion, and outside Pinellas/Pasco its title becomes
  **Filing Readiness**. Only the proven predicates and export behavior remain
  unchanged.

## Completed Source Inventory

`MILESTONE-38B-SOURCE-INVENTORY.md` is the completed implementation artifact
for these sources:

| Filing | Local workslip |
| --- | --- |
| Guardian Inventory | `GD INIT Work Slip Inventory.docx` |
| Simplified Accounting | `GD ANN Work slip Simplified 02272020.docx` |
| Annual Accounting | `GD ANN WORK SLIP AUDIT.docx` |
| Final/Discharge Accounting | `GD DISC Work Slip 02272020.docx` |
| Trust Accounting | `GD ANN Work Slip TRUST.docx` |
| Simplified Plan | `GD ANN Work Slip Review Simplified Plan.docx` |
| Annual Plan | `GD ANN Work Slip Review.docx` |
| Initial Plan | `GD INIT WORK SLIP REVIEW.docx` |
| Minor Plan | `GD ANN Work Slip Minor Review.docx` |

Conditions are grouped by source section rather than by repeated auditor
Yes/No/comment cells. Automatic conditions are limited to facts represented in
filing state; manual and unsupported clerk/court facts stay distinct.

`GD ANN Work Slip Review DSHP.docx` is resolved as an unsupported Annual Plan
developmental-services/guardian-advocate overlay, not a tenth filing type. The
app has no reliable DSHP discriminator. Create no DSHP runtime configuration;
retain only Annual Plan's existing conditional manual reminder. This decision
does not block any of the nine ordinary filing configurations.

For every blocking automatic check, the source map must reference the canonical
validator issue ID shared with Milestone 38D. Do not create separate readiness
and preflight IDs for the same failure. A readiness-only condition may use its
own ID when it has no validator counterpart.

## Executable Code Map

38D Phase 1 is the only implementation prerequisite. It supplies canonical
typed issues; 38B consumes them and does not create validation identities.

Create `src/core/filing/readiness-config.js` with:

```js
getFilingReadiness(inventoryType, data, validationIssues)
```

It is the single configuration source for the nine descriptor `inventoryType`
keys. It returns
`{ automatic, manual, unsupportedCount }` where every row has stable `id`,
`label`, `route`, `classification`, and `blocking`. Automatic blocking rows
are selected directly from `validationIssues` when their registry category is
`validation` or `data-integrity` and their issue definition has
`showInReadiness: true`; do not recompute those predicates. Move the four Plan
arrays and their current predicates from `src/features/plan-*/print.js` into
this module for readiness-only automatic rows, preserving every existing ID,
label, and predicate. Add grouped manual rows exactly as specified in the
source inventory.

Create `src/core/filing/readiness-card.js` with:

```js
renderReadinessCard({ filingType, data, validationIssues, expanded })
bindReadinessCard(container)
resetReadinessCardState()
```

The renderer uses one native `<details id="filing-readiness-card">` with one
`<summary>`. It escapes all text and renders no inline handlers. Pending
automatic checks set `open`; otherwise a fresh render is collapsed. A user's
toggle is retained in module memory only for rerenders of the same
`wardId + filingType`; `resetReadinessCardState()` runs on filing/ward switch
and fresh Preview entry. When no automatic item is pending and a manual or
unsupported item remains, summary text is exactly **Automated checks passed;
manual review remains.** Manual and unsupported rows never receive pass marks.

Extend `src/core/filing/county-guidance.js` with:

```js
getReadinessJurisdiction(county)
```

It returns `{ local: true, title: "Clerk's Review Readiness" }` only for the
existing normalized Pinellas/Pasco allow-list and `{ local: false, title:
"Filing Readiness" }` otherwise. Workslip-derived local-practice text is
filtered out for all non-local results. Do not infer a circuit from blank or
unknown county.

### Preview hosts

In each host, call `prepareFilingOutput()` first, then render exactly one card
from `preflight.issues` before court-output markup:

- `src/features/guardian-inventory/print.js` for `guardianInventory`;
- `src/features/simplified-accounting/print.js` for `simplifiedAccounting`;
- `src/features/annual-accounting/print.js` for `annualAccounting`,
  `finalAccounting`, and `trustAccounting` selected by the active filing type;
- `src/features/plan-simplified/print.js`;
- `src/features/plan-annual/print.js`;
- `src/features/plan-initial/print.js`;
- `src/features/plan-minor/print.js`.

Delete the classic `planReadinessChecks()` and `planReadinessPanel()` from
`src/legacy-app.js` after all four Plan hosts import the shared modules. Remove
their `window.planReadinessChecks*` bridges from the Plan feature indexes.
Keep `.no-print` on the card and never call the renderer from `pdf-model.js`,
DOCX builders, Excel modules, `buildPrintHTML*()`, or generated-PDF builders.
Card routing delegates to the existing validation jump-link handler using the
canonical issue route; readiness-only rows without a route render no link.

## Implementation

1. Create one shared readiness-card renderer/controller with stable IDs and
   native `details`/`summary` semantics or an equivalent accessible control.
2. Migrate the four existing Plan panels, explicitly applying the new
  county-sensitive title and accordion behavior without changing their proven
  predicates or export behavior.
3. Add configurations for Guardian Inventory, Simplified Accounting, Annual,
   Final/Discharge, and Trust Accounting.
4. Use the county-guidance policy for title, provenance, and local text.
5. Preserve a user's expanded/collapsed choice during the current preview
   render; recompute the default on a fresh render or filing switch.
6. Keep preflight authoritative. Every blocking validator issue must either map
   to an automatic readiness condition or carry an explicit documented reason
   why it is outside card scope. Every automatic blocking condition must map
   back to its validation issue. Non-blocking automatic items must be labeled
   as such.

## Acceptance Criteria

| Scenario | Expected result |
| --- | --- |
| Any of nine filing previews | Exactly one card uses the correct filing configuration. |
| Pinellas/Pasco | Clerk title and only verified local context are shown. |
| Other or blank county | Filing title is used and no Sixth Circuit local requirement appears. |
| Automatic failure | Card opens by default, identifies the item, and provides normal routing/remediation. |
| Automatic checks pass; manual/unsupported items remain | Card collapses by default and says “Automated checks passed; manual review remains.” |
| No remaining item of any class | Summary may state that all configured checks pass without claiming court approval. |
| Manual/unsupported item | It is visually and semantically distinct, non-blocking, and never displayed as an automatic pass. |
| Rerender or filing switch | No duplicate cards or IDs; state follows the documented reset rule. |
| Court outputs | Card content is absent from PDF, Word, Excel, and print. |

## Verification

Add source-map completeness tests for all nine filings, bidirectional mapping
tests for blocking automatic conditions, explicit exceptions for out-of-card
preflight rules, county-policy tests, and component/E2E coverage for accordion
defaults, manual-only wording, keyboard operation, focus, rerender, and filing
switching. Extend the existing Plan parity fixtures rather than replacing them.

## Files and Outcomes

| Outcome | Required files/result |
| --- | --- |
| Code | Add the two shared filing modules; update county guidance, the seven preview host files, four Plan feature bridges, and remove the classic renderer/dispatcher. |
| Persistence | No persisted data-model change. Expanded state is runtime-only and is reset by ward/filing/preview identity. Record `No data-model catalogue update required`. |
| Tests | Add `tests/unit/readiness-source-map.spec.js` and `tests/unit/readiness-card.spec.js`; extend all four existing Plan parity specs and focused Preview E2E coverage for nine keys, county title/filtering, keyboard/toggle/reset, routing, and output exclusion. |
| Catalogue | Add the two new unit files and any new E2E file to `TEST-INDEX.md`; do not edit the catalogue if existing E2E files are only extended within their present scope. |
| Documentation | Keep the completed inventory with the proposal. Update user help only if it currently describes the old always-expanded Plan panel; otherwise record no additional documentation change. |
