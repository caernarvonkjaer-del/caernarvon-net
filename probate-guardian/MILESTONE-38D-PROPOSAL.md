# Milestone 38D: Affirmative Output-Validation Override

## Status

**Executable, independently deliverable specification.** Phase 1 establishes
canonical issue identity and must land before 38B. Phase 2 adds acknowledgement
and unified authorization after 38B. No further discovery or design approval is
required.

## Goal

Let a user explicitly bypass ordinary, user-correctable validation blocks and
use the filing's normal Preview, Print, Save as PDF, Save as Word, and Save as
Excel capabilities. The override does not change validation results or claim
that the filing is complete.

## Product Decision

After an affirmative acknowledgement, there is **no reduced output mode**:

- Preview, browser/OS Print, Save as PDF, Save as Word, and Save as Excel are
  available wherever that filing normally supports them.
- Generated output is the ordinary output. Do not add `DRAFT` text, a
  watermark, altered filename, PDF metadata flag, page decoration, or other
  draft marker.
- Do not describe the generated or printed document as a draft. The on-screen
  acknowledgement may state that validation requirements remain outstanding,
  but generated documents remain unmodified.
- The override does not mark checks passed, mutate filing data, persist an
  approval flag, or imply readiness for filing.
- The Florida e-filing portal link remains ordinary navigation and is not
  treated as an output generator or an endorsement of readiness.

This specification explicitly accepts that a user may save, print, or
distribute an incomplete but technically faithful court document with no
artifact-level indication that validation was bypassed. The application
warning and renewed acknowledgement reduce accidental use, but cannot travel
with an unmodified artifact after it leaves the application.

## Typed Preflight Boundary

Replace the current flat-message decision with structured issues carrying a
stable ID, message, route, category, and `bypassable` status.

Create one canonical validation-issue registry and shared issue constructors.
Migrate all nine filing validators, shared date and identity checks, field-draft
adapters, and readiness mappings that contribute blocking issues. Do not infer
identity from display strings. A blocking automatic readiness condition from
38B and its validator failure use the same canonical issue ID.

Bypassable issues are ordinary user-correctable filing/content validation
failures, including missing or invalid form answers and unresolved automatic
readiness requirements that already map to validation.

Non-bypassable issues are failures where faithful output cannot be produced or
would necessarily omit/corrupt data: generation errors, missing templates or
resources, corrupt/encrypted/unreadable supplemental files, unsupported browser
capabilities, security/permission failures, and format capacity overflow such
as too many populated rows for the official Excel template. A format-specific
technical issue blocks only that affected format when other formats remain
faithful.

The unresolved legacy/canonical guardian-address conflict introduced by 38A is
non-bypassable for every generated format. Producing output before the user
chooses the canonical value would require the application to select an
unconfirmed address and would violate 38A's no-silent-choice contract.

## Scope and Integration Boundary

This is a cross-cutting validator migration, not a narrow change to
`prepareFilingOutput()`. Existing validators commonly return bare strings from
local `req()` helpers, so every issue-producing path used by the nine filing
types must be inventoried and moved to the canonical typed contract or an
explicit typed adapter. The inventory is an implementation prerequisite and
part of the delivery estimate.

Excel capacity is currently checked independently inside feature export paths.
Keep feature-specific capacity calculations, but expose their results as typed,
format-specific preflight issues and route Excel through the same authorization
decision as Preview, Print, PDF, and Word. Remove the duplicate ad hoc Excel
gate only after parity tests prove that no capacity block was lost.

## Canonical Issue Contract

### Phase 1 registry

Create `src/core/validation/issue-registry.js`. It owns frozen definitions and
is the only place that assigns authorization semantics:

```js
getIssueDefinition(code)
createIssue(code, detail)
createRequiredIssue({ filingType, path, section, label, route, message })
assertRegisteredIssues(issues)
```

Every issue returned to preflight has this exact shape:

```js
{
   code, message, section, label, path, route,
   category, bypassable, capabilities, showInReadiness
}
```

`capabilities` is a non-empty subset of `preview`, `print`, `pdf`, `docx`, and
`excel`; unsupported descriptor capabilities are filtered later. Definitions
set defaults, while `detail` may supply message/location data but may not
override `category`, `bypassable`, or `capabilities`.

Use these fixed registry families:

| ID/family | Category | Bypassable | Capabilities | Readiness |
| --- | --- | --- | --- | --- |
| `<filingType>.<path>.required`, `.invalid`, `.incomplete`, `.mismatch` | `validation` | yes | all supported | yes |
| `<filingType>.<condition>` for form-wide arithmetic/date-order/certification checks | `validation` | yes | all supported | yes |
| `field.date.invalid` | `validation` | yes | all supported | yes |
| `filing.identity.unknown`, `filing.identity.conflict` | `data-integrity` | no | all supported | no |
| `simplified.guardian.address-conflict` | `data-integrity` | no | all supported | yes |
| `supplemental.missing-data`, `.decode-failed`, `.not-pdf`, `.too-large`, `.checking`, `.not-ready`, `.page-limit`, `.blocked`, `.total-bytes`, `.total-pages` | `supplemental` | no | preview, print, pdf | no |
| `excel.capacity.guardian.<schedule>`, `excel.capacity.simplified.remuneration`, `excel.capacity.annual.<schedule>` | `capacity` | no | excel | no |
| `output.template.missing`, `output.resource.unavailable`, `output.generation.failed` | `technical` | no | capability supplied by caller | no |
| `output.capability.unsupported`, `output.security.denied` | `technical`/`security` | no | capability supplied by caller | no |

For required/invalid/incomplete/mismatch issues, `createRequiredIssue()` forms
the code from the explicit filing type and canonical state path. Array indexes
remain in `path` and are replaced with `[]` in `code`, so row insertion cannot
change issue identity. Non-field conditions use explicit registry constants;
never derive codes from display messages or hashes.

During Phase 1, change `adaptValidationErrors()` to reject unregistered strings
in tests. Runtime may retain a temporary `validation.legacy-unmapped` typed
issue only behind a development assertion; the Phase 1 completeness test must
prove no live validator emits it before 38B starts.

### Completed producer inventory

| Filing identity | Producer | Namespace and route owner |
| --- | --- | --- |
| `guardian` | `validateGuardian()` in `src/features/guardian-inventory/index.js` | `guardian.*`; preserve current section/path mapping in `validation-adapter.js`. |
| `simplified` | `validateSimplified()` in `src/features/simplified-accounting/index.js` | `simplified.*`; preserve current Part routes. |
| `annual` | `validateAnnual()` in `src/features/annual-accounting/index.js` | `annual.*`; preserve current Part/Schedule routes. |
| `finalAccounting` | Same `validateAnnual()` | `finalAccounting.*`; pass descriptor inventory type into constructors rather than emitting `annual.*`. |
| `trustAccounting` | Same `validateAnnual()` | `trustAccounting.*`; same rule. |
| `planSimplified` | `validatePlanSimplified()` | `planSimplified.*`; use its scoped route map. |
| `planAnnual` | `validatePlanAnnual()` | `planAnnual.*`; use its scoped route map. |
| `planInitial` | `validatePlanInitial()` | `planInitial.*`; use its scoped route map. |
| `planMinor` | `validatePlanMinor()` | `planMinor.*`; use its scoped route map. |

This is seven validator functions covering nine filing identities. Convert each
validator's local `req()`/row/date helper at its source so it pushes typed
issues; do not maintain a second message-to-code lookup. `commit-coordinator.js`
already owns `field.date.invalid`; construct it through the registry.
`filing-descriptor.js` retains its two existing stable identity codes through
the same constructor. `supplemental-pdf.js` maps its existing internal status
codes to the fixed `supplemental.*` IDs and returns issues, not strings.

38B consumes these IDs. Its readiness-only predicates keep their explicit IDs;
where a predicate represents a validator failure, replace the predicate with
the canonical issue rather than publishing two rows.

## Completed Output-Gate Inventory

There are **26 live `prepareFilingOutput()` calls in 11 files**:

| Owners | Calls | Current decisions to replace |
| --- | ---: | --- |
| `src/core/pdf/pdf-preview.js` | 2 | Preview mount and browser/OS Print recheck. |
| Seven `src/features/*/print.js` hosts | 21 (3 each) | Preview-page button state, Save PDF guard, and Save Word guard. Annual's host covers Annual, Final, and Trust. |
| Guardian, Simplified, and Annual `excel.js` | 3 (1 each) | Save Excel guard; Annual covers Final and Trust. |

Comments and the function declaration are not calls. Add a static inventory
test that counts these call sites before migration. After migration it must
find zero feature-level direct authorization decisions and exactly one shared
`authorizeFilingOutput()` call per action path.

The separate gates are fully assigned:

| Gate | Current owner | Required adapter/result |
| --- | --- | --- |
| Date drafts | `commit-coordinator.js` | Registered `field.date.invalid`; bypassable for all supported output. |
| Filing identity | `filing-descriptor.js` | Existing two IDs; non-bypassable for all supported output. |
| Supplemental PDF eligibility/totals | `supplemental-pdf.js` and `pdf-finalizer.js` | Fixed `supplemental.*` issues; non-bypassable for Preview, Print, and PDF only. Finalizer assertions remain as defensive backstops. |
| Guardian Excel capacity | `GUARDIAN_EXCEL_CAPS` (11 schedules) | `excel.capacity.guardian.<schedule>` issues, Excel only. |
| Simplified Excel capacity | `SIMPLIFIED_EXCEL_CAPS` (remuneration) | `excel.capacity.simplified.remuneration`, Excel only. |
| Annual/Final/Trust Excel capacity | `ANNUAL_EXCEL_CAPS` (15 sections) | `excel.capacity.<inventoryType>.<schedule>`, Excel only. |
| Missing Excel template | Three `excel.js` exporters/`ensureTemplate()` | `output.template.missing`, Excel only; do not acknowledge. |
| PDF/DOCX/Excel generation or loader failure | Existing action `try/catch` blocks, PDF engine/finalizer, DOCX builders, ExcelJS/template loaders | Convert to `output.resource.unavailable` or `output.generation.failed` for that action; retain caught error in console, show neutral user remedy. |
| Browser/API/security denial | Blob/window/save APIs, crypto/resource access | `output.capability.unsupported` or `output.security.denied` for the affected action; never acknowledge. |
| 38A guardian address conflict | Simplified compatibility module | `simplified.guardian.address-conflict`, every supported output capability. |

`checkExcelCapacity()` remains the one calculation helper. Add
`getExcelCapacityIssues(inventoryType, data, caps)` beside it (or move both to
`src/core/excel/excel-capacity.js`) and use the same result for panel rendering,
button state, and action authorization. Remove exporter-local alert gates only
after parity tests cover every cap key and exact count boundary.

## Shared Revision and Authorization Owner

Create `src/core/filing/output-authorization.js` and import it eagerly from
`src/main.js`. It owns a process-monotonic integer and at most one in-memory
acknowledgement record:

```js
{ wardId, inventoryType, revision }
```

Expose:

```js
getOutputRevision()
markFilingRevisionChanged(reason)
beginFreshPreview()
acknowledgeOutstandingRequirements(data)
clearOutputAcknowledgement()
authorizeFilingOutput(data, baseIssues, { capability, additionalIssues = [] })
```

`baseIssues` is the validator function or typed issue array currently supplied
to preflight; `additionalIssues` carries capability checks such as Excel
capacity. `markFilingRevisionChanged()` increments the integer and clears the record.
The integer never comes from a hash, timestamp, persisted state, or filing
contents. `acknowledgeOutstandingRequirements()` records the current ward ID,
descriptor inventory type, and revision only when all issues affecting at
least one supported output are bypassable. `authorizeFilingOutput()` reruns
`prepareFilingOutput()`, filters issues to the requested capability, and
returns one of:

```js
{ status: 'allowed', issues, advisories }
{ status: 'acknowledgement-required', issues, advisories }
{ status: 'blocked', issues, advisories }
```

An acknowledgement matches only all three record fields. It changes
authorization, never `issues`, `canExport`, readiness state, or filing data.
Manual/unsupported 38B reminders are not passed to authorization.

Call `markFilingRevisionChanged()` at the successful mutation boundaries:

- `finalizeFieldValue()` after a committed value changes, including checkbox,
   radio, select, text, and valid date commits;
- `recordDateDraft()` and `clearFieldDraft()` when the stored draft changes;
- successful add, duplicate, and remove in `schedule-definitions.js`, plus the
   existing Plan row/guardian wrappers that mutate arrays directly;
- `setPartyIdForSlot()`, party hydrate/dehydrate propagation, merge, and
   dismiss/link actions in `party-resolver.js` and their modal handlers;
- each successful Excel/backup import immediately after replacement state is
   installed;
- every 38A normalization or explicit conflict-resolution mutation;
- accounting filing-type change and ward/filing activation in
   `ward-lifecycle.js`/the canonical active-type bridge;
- `beginFreshPreview()` once when a new Preview route mount begins;
- reload/session end by module initialization and `pagehide` clearing the
   in-memory record.

Do not increment for render, autosave, validation, preflight, readiness-card
toggle, navigation within the same filing, or failed/no-op mutations.

## Interaction Contract

1. When only bypassable issues block an output, show their grouped count and
   routes plus an explicit action such as **Continue despite outstanding
   requirements**. There is no automatic fallback.
2. One acknowledgement applies to the current filing revision and enables all
   otherwise technically available output actions. Each action reruns preflight
   before generation.
3. Any committed field change, import, filing switch, fresh preview render,
   reload, or session end invalidates acknowledgement. If the same filing is
   still incomplete, another acknowledgement is required.
4. A new non-bypassable issue remains blocked even after acknowledgement and
   names the affected capability and remedy.
5. The UI continues to display outstanding requirements and must not change
   readiness labels to passed. It uses neutral language such as
   **Requirements remain outstanding** rather than draft terminology.

## Implementation

### Phase 1: issue identity

1. Add the registry and constructors, then migrate shared date, identity, and
   supplemental producers.
2. Migrate the seven validators in the producer table, passing the resolved
   inventory type into Annual's shared validator path.
3. Update `prepareFilingOutput()` to return typed `issues`, while retaining a
   derived `messages` array only for temporary UI compatibility. `canExport`
   remains `issues.length === 0`; acknowledgement is not part of preflight.
4. Land registry completeness, validator parity, and route tests. This closes
   the dependency needed by 38B.

### Phase 2: authorization and acknowledgement

1. Add the revision/authorization owner and mutation hooks above.
2. Adapt all three Excel capacity families and all 26 live preflight call
   sites to capability-aware authorization.
3. In `pdf-preview.js`, replace **Preview anyway** and all draft wording with
   one grouped panel titled **Requirements remain outstanding** and the button
   **Continue despite outstanding requirements**. The button invokes the
   shared acknowledgement API and reruns Preview authorization.
4. Preview-page buttons derive enabled state from authorization per capability.
   Clicking any action reruns authorization; `acknowledgement-required` focuses
   the shared panel, while `blocked` lists only non-bypassable issues affecting
   that capability and its remedy.
5. Keep current PDF, DOCX, Excel, and browser Print generation functions and
   ordinary filename builders unchanged. Remove `draft` parameters/notices and
   independent boolean decisions after E2E parity passes.
6. Update help, live regions, and accessible descriptions using neutral
   outstanding-requirements language.

## Acceptance Criteria

| Scenario | Expected result |
| --- | --- |
| Ordinary unmet validation requirements | Grouped issues and routes are shown; no output proceeds without affirmative acknowledgement. |
| User declines | Preview and output remain blocked; filing state is unchanged. |
| User acknowledges | Normal Preview, Print, PDF, Word, and Excel actions are enabled wherever technically supported. |
| Generated or printed output after acknowledgement | Uses the normal document content and filename with no draft text, watermark, metadata marker, or reduced functionality. |
| Readiness/validation state | Outstanding checks remain outstanding and visible; acknowledgement does not create a pass. |
| Format-specific capacity failure | Only the unfaithful format remains blocked; faithful supported formats remain available after any required acknowledgement. |
| Unresolved 38A guardian-address conflict | Every generated format remains blocked until the user explicitly chooses the canonical value. |
| Technical generation/resource/security failure | Affected output remains non-bypassable and explains why. |
| Filing data changes, refreshes, switches, or reloads | Prior acknowledgement is invalid; preflight reruns before the next output. |
| Manual/unsupported readiness reminder alone | Requires no override because it is not an export-validation failure. |

## Verification

Add registry-completeness and typed-preflight tests across all nine filing
validators for bypassable, non-bypassable, and format-specific issues. Add
parity tests proving each migrated Excel capacity gate still blocks the same
overflow before the old ad hoc gate is removed. Add E2E coverage for
accept/decline, all supported output actions, revision invalidation, filing
switching, unchanged readiness results, the 38A conflict, and technical
failures. Inspect generated PDF, DOCX, and XLSX artifacts to prove ordinary
content and filenames are retained and no marker is introduced.

## Files and Catalogue Outcomes

| Outcome | Required files/result |
| --- | --- |
| Phase 1 code | Add `issue-registry.js`; update seven validators, validation adapter, commit coordinator, filing descriptor, supplemental PDF, output preflight, and their existing consumers/types. |
| Phase 2 code | Add `output-authorization.js`; update `main.js`, mutation owners listed above, three Excel modules/capacity helper, seven print hosts, and `pdf-preview.js`. |
| Persistence | Acknowledgement and revision are memory-only. Add no persisted field and record `No data-model catalogue update required`; `npm run verify:data-model` must remain clean because existing runtime state shapes still change in 38A/38C, not here. |
| Unit tests | Add `issue-registry.spec.js`, `output-preflight-typed.spec.js`, `output-gate-inventory.spec.js`, `output-authorization.spec.js`, and `excel-capacity-issues.spec.js`; extend all seven validator specs and supplemental/identity/date tests. |
| E2E/artifacts | Extend focused Preview/export tests for accept/decline, five capabilities, nine identities, mutation invalidation, filing switch/reload, technical blocks, 38A conflict, and unchanged validation. Inspect generated PDF/DOCX/XLSX names and contents for absence of draft/watermark/metadata changes. |
| `TEST-INDEX.md` | Add every new test file under the Milestone 38D behavior area and append 38D to existing test rows whose scope is extended. Do not create duplicate rows for existing files. |
| Documentation | Update output help and accessibility copy; document that acknowledgement is temporary and artifacts are ordinary, without suggesting completion or court approval. |
