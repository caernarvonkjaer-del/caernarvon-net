# Milestone 25: Filing Identity and Reliable Form Commits

## Status and Goal

Proposed implementation plan. This document does not implement application changes.

Establish one authoritative filing descriptor and one field-commit lifecycle
across all nine filing types. A filing must identify itself consistently on
screen and in generated documents, and accepted edits must survive navigation,
rerendering, saving, and export without depending on a conveniently timed blur.

Priorities:

1. Correct Final/Trust output identity as a high-priority output correctness defect.
2. Address rapid date loss as a high-priority shared persistence defect.
3. Complete shared identity and commit infrastructure before adding local exceptions.
4. Verify all nine filing types through an explicit coverage matrix.
5. Verify actual screen content and generated artifacts, not just model objects.

## Baseline and Evidence

Inspection on 2026-09-07 found the following starting points. Recheck these
symbols at implementation time because other work is active in the repository.

| Surface | Current observation | Implication |
| --- | --- | --- |
| `src/legacy-app.js`: `INVENTORY_TYPES`, `formEngine`, `formDisplayName` | Final and Trust share the annual engine but have separate display identities. | Extend this registry direction into a descriptor; avoid a second competing registry. |
| `src/core/state.js`: annual data factory | `filingType` defaults to `Annual`. | Audit creation, conversion, carryover, import, and reopen for contradictory defaults. |
| `src/features/annual-accounting/pdf-model.js` | Metadata, preparer text, and attorney text contain hard-coded annual wording. | The output mismatch extends beyond the running page title. |
| Annual `index.js` and `print.js` | Summary, selected Filing Type, filenames, and document model obtain identity separately. | PDF and DOCX can have a Final filename with Annual content. |
| `src/core/form/form-contract.js` | Date input writes a transient draft; focusout commits it. Invalid finalization currently clears the model field. | Date drafts and canonical data need explicit ownership and failure behavior. |
| `src/form-events.js`, annual local binder, legacy `bindForms()` | Shared and local event pipelines coexist. | Metadata alone does not prevent duplicate writes or competing formatting. |
| `navigate()`, `flushPendingSave()`, `autoSave()` | Navigation prunes rows; saving flushes persisted model state. | Neither operation alone proves that pending input has reached the model. |
| `src/core/status/section-status.js` | Guidance defaults to six items; status still adapts legacy results. | Complete the all-items requirement and unify draft/identity blockers with existing validation. |

The hard-coded output wording is confirmed by inspection, including the
preparer's compilation statement and the attorney's certification, not just
metadata. Part I already reads `d.filingType`; that correct field does not
correct the independent signed statements or running headers.

Invalid-date finalization actively deletes the previous model value by writing
an empty string. Pending date drafts can also be omitted from a save before
finalization. These are confirmed mechanisms requiring repair. They do not
establish which event sequence caused the reported B-2 failure.

Claude's B-2 report
is a reproduction lead, not proof that one particular event sequence caused
the loss. Record the application build and distinguish ordinary keyboard/paste
behavior from automation that changes a DOM value without dispatching supported
input events. Do not declare the timing defect fixed solely because parser
unit tests pass.

Milestone 24 already introduced parsing, field metadata, structured-error
adapters, section guidance, and a live-region utility. Extend these modules;
do not install parallel replacements. Where Milestone 24 prose conflicts with
its recorded decisions, the decisions below govern this milestone.

## Existing Decisions and Scope

- Reject two-digit years; successful dates remain canonical `YYYY-MM-DD`.
- Keep name/address auto-capitalization enabled by default, with preservation
  rules for identifiers, meaningful mixed case, acronyms, and legal text.
- Show every local missing-field item near disabled Next. No six-item truncation.
- Working field jump links are part of the first migrated implementation.
- Preserve filing calculations, eligibility, existing document capabilities,
  and existing supplemental-document placement behavior.
- Support hosted/PWA and portable distributions using the existing build system.
- Retain existing `.sav` reading compatibility and security boundaries. Any
  additive draft-recovery payload needs explicit versioning and compatibility tests.

This work includes all field binding paths and all filing output entry points.
It does not add a new component framework, new export formats, new legal rules,
or a redesigned accounting workflow. Formatting and validation exceptions must
be explicit field policies rather than further label-based guesses.

## Deliverable 1: Authoritative Filing Descriptor

Add a small, pure module such as `src/core/filing/filing-descriptor.js`.
Consolidate the current filing registry into it, exposing legacy wrappers only
where the classic entry point still requires them. Resolving identity must not
import every feature, inspect the DOM, or temporarily replace `window.D`.

Illustrative descriptor shape:

```js
{
  id: 'final-accounting',
  family: 'accounting',
  engineId: 'annual',
  inventoryType: 'finalAccounting',
  filingTypeValue: 'Final',
  displayName: 'Final Accounting',
  documentTitle: 'FINAL GUARDIANSHIP ACCOUNTING',
  filenameStem: 'Final-Accounting',
  legalCopyKey: 'final-accounting',
  validationProfileId: 'annual-accounting',
  sectionMapId: 'annual-accounting',
  capabilities: { pdf: true, docx: true, excel: true }
}
```

The example title is provisional until the wording review below is completed.
Capabilities describe supported formats; they do not imply that the current
filing is valid or fits an Excel template. Keep actual required-field rules in
existing validation profiles, not a duplicate `requiredSections` checklist.

The resolver should return `{ descriptor, issues }`. Unknown or contradictory
identity produces a structured issue, never an unnoticed fallback to Annual.
Descriptors are derived values, not another mutable identity stored in `.sav`.

### Identity Reconciliation

Implement one small identity mutation service as the counterpart to the pure
resolver. Creation, Filing Type changes, conversion, import, and carryover must
use it to update the legacy identity fields atomically.

Recommended rules for implementation:

- New Annual, Final, and Trust filings initialize matching `inventoryType` and
  `filingType` values. Copied source data must not overwrite the target identity.
- An explicit Filing Type selection within the accounting family updates both
  fields together and refreshes every identity consumer. It does not reset data.
- Recognize documented legacy aliases such as `Annual Accounting` through an
  explicit lookup table. Avoid substring-based identity inference.
- For older files, one recognized identity with the other field absent can
  determine the descriptor without modifying the source archive on load.
- Two recognized but inconsistent fields create `filing.identity.conflict`.
  Keep the file editable and saveable; show the existing values in Part I and
  require an explicit Filing Type selection before final output. Do not infer
  whether a stale default or an intentional selection caused the conflict.
- An unknown value is preserved for correction. Missing/unknown identity must
  not enable a default export profile or silently reclassify a filing.
- Keep amendment status separate from filing identity and retain the existing
  explicit Yes/No rendering contract.

### Consumer Migration and Wording

Use the descriptor for form-selection labels, sidebar/dashboard, Summary,
Part I identity controls, preview labels, running document headers/footers,
PDF title/subject/keywords, DOCX properties, and suggested export filenames.
Use filename-specific sanitation at the filename boundary; preserve case and
ward identifiers in stored data.

Create filing-specific copy entries for preparer and attorney statements.
Reuse each entry for the interactive form and the document model. Review all
other filing references in certification/service text and applicable workbook
cells; do not stop at the two strings Claude reported.

During stage 25B, record a wording table with each phrase,
its source template and revision, whether it is filing-specific or fixed, and
the expected wording for Annual/Final/Trust. Inspect checked-in court templates
first, then authoritative source forms where necessary. Unresolved wording is
a specific content decision to report, not a reason to guess legal language.
Fixed fee-table or statutory wording must not undergo blanket replacement.

PDF/DOCX builders receive a descriptor resolved from the same filing snapshot
as their data. Retain compatibility wrappers for existing callers while routing
them through the resolver. Final output entry points reject identity issues;
the print page can still show guidance explaining why generation is blocked.

Add targeted guards against new hard-coded filing identity in migrated output
consumers, with explicit exceptions for approved fixed copy and fixture text.

## Deliverable 2: Shared Field Metadata and Commit Coordinator

Extend `form-contract.js` and add a coordinator such as
`src/core/form/commit-coordinator.js`. Keep `date-parser.js` as the parsing
authority. Adapt `data-form-path`, `data-annual-path`, and `data-bind` into one
metadata convention before retiring their write handlers.

Metadata must supply kind, format policy, label, section/route, model path,
focus target, and conditional validation association. Required status must
agree with the validator. Audit B-1/B-2 Period From/To and Court Order Date,
which are shown as required but omitted from current row completeness checks.
Resolve mismatches against the established form requirements before migrating.

Use stable row identity for drafts and focus targets. Array index paths can
remain serialization addresses, but insertion, deletion, duplication, pruning,
or sorting must remap them without moving one row's draft into another row.

Suggested responsibilities:

- `recordDraft(context, field, rawValue, event)`: capture the edit and revision.
- `commitPendingFields(context, { reason, scope })`: synchronously reconcile
  eligible drafts and return changed paths, structured issues, and revision.
- `captureFilingSnapshot(context)`: capture canonical values and identity for
  one output operation after commit and validation.

`context` binds case/session, ward/filing, period, and view lifetime. Delayed
callbacks must not resolve their target through whichever `window.D` happens
to be active later. Scope drafts by those identities and stable row/field ID,
not merely a path such as `periodFrom`.

### Field Lifecycle

1. Input/paste records current text immediately. Valid dates may update the
   canonical model without changing the focused control's display. Partial or
   invalid date text stays in the draft layer.
2. Blur or an explicit operation boundary commits the latest draft through the
   same pure field conversion. Repeated commits of an unchanged revision have
   no duplicate dirty, audit, party-sync, or save side effects.
3. Finalization applies permitted display formatting and updates status without
   rebuilding the focused field or moving its caret unexpectedly.
4. IME composition records text but defers normalization until composition ends.
   An output request during composition reports pending input; it does not
   force a blur, discard composition, or export an older value silently.

Name/address capitalization remains the default on finalization. Give the
formatter policies precise semantics: `normalize` may change canonical storage;
`display-only` never writes its presentation back into the model; `preserve`
allows only the agreed non-destructive sanitizer. Audit current exceptions
that write despite a preserve/display-only declaration.

Retest the existing unpunctuated-date masking with character-by-character entry,
not just a full-value paste. A seven-digit interpretation must not rewrite the
control before an eighth intended digit is entered. Avoid broadening accepted
formats or changing year limits as an incidental timing fix.

### Invalid Drafts and Recovery

An invalid replacement date preserves both the visible draft and the last valid
canonical value. It creates a structured blocker even when the old canonical
value satisfies the validator. Export must never use that old value while the
user sees an invalid replacement. Intentionally clearing a field commits an
empty value and applies its normal required/optional rule.

Rehydrate drafts on rerender and return navigation. A row containing a draft
is not blank and must not be pruned. Explicit row deletion removes its drafts;
duplication uses only committed values or reports an unresolved draft first.

Extend the existing protected recovery payload to include versioned draft
records, separated from canonical form fields. Draft-only edits must mark
recovery dirty. They must follow the selected encryption mode and lock cleanup;
do not introduce plaintext localStorage or log raw case values.

For `.sav` round trips, implement an optional versioned draft payload through
the archive's existing extensibility mechanism after inspecting its reader.
Test old archives without the payload, new archives with it, and older-reader
handling of the added data. New readers restore draft text and blockers; older
readers retain their canonical data. Document any older-reader loss of draft
support. Do not claim unchanged byte/schema structure when adding recovery data.
If the existing format cannot support this additively, record the concrete
versioning decision before implementing an incompatible archive change.

Successful saves must distinguish canonical data plus recovered drafts from
filing readiness. Invalid drafts may be saved as work in progress. Reuse the
shared status utility for meaningful failures and completion, without a spoken
announcement on every keystroke.

## Deliverable 3: Operation Boundaries and Persistence Ordering

Separate committing edits to the model from awaiting disk/recovery writes.
Do not make each input event flush disk storage or recursively call `autoSave()`
from a save-time commit. The save entry point requests a commit with save
scheduling suppressed, then saves the captured revision through the existing
persistence services.

| Operation | Required boundary behavior |
| --- | --- |
| Blur / Tab | Finalize the field once; retain invalid draft and inline error. |
| Next | Commit current section before checking status; block on its local issues. |
| Back / sidebar / browser history | Capture edits before detachment; retain invalid drafts and restore them on return. |
| Same-page rerender / add / duplicate / prune | Commit or retain drafts before changing DOM or row indices; never prune draft-only rows. |
| Switch ward / period / convert / open another case | Capture the outgoing context and flush its recovery before replacing it. Reject late commits to a superseded context. |
| Autosave / manual `.sav` save | Capture canonical values and drafts at a revision; allow incomplete work to save. |
| Preview / print / PDF / DOCX / Excel | Commit, resolve descriptor, validate, and capture one coherent snapshot before building output. |
| Lock / unload | Use existing security lifecycle; persist drafts while keys are available and clear sensitive memory on lock. |

Serialize writes or otherwise enforce revision ordering so a slow older save
cannot overwrite a newer one or clear its dirty flag. Clear saved state only
through the successfully written revision. Surface write failures and retain
dirty state. `await autoSave()` currently schedules a timer; it is not evidence
that a write has completed. Adapt `flushPendingSave()` accordingly.

Do not promise that asynchronous work finishes during tab/process termination.
Persist incrementally and retain existing unsaved-change protection. Verify
reload recovery after a confirmed recovery write and separately test the
best-effort unload behavior.

Output generation consumes one immutable operation snapshot for descriptor,
data, validation, metadata, filename, and supplemental files. Capture only the
needed filing data and avoid copying large attachment payloads unnecessarily.
Preview caches must include filing/period and data revision. A later edit or
ward switch invalidates an older preview's right to replace current content or
announce readiness. Saved artifacts must not combine two revisions.

Keep native file-picker/print user activation working when adding asynchronous
boundaries. Test those UI actions directly. A filing export needs a coherent
snapshot, not a writable `.sav` handle; lack of autosave permission must not
create a new dependency for PDF/DOCX/Excel generation.

## Deliverable 4: One Validation and Guidance Result

Extend the existing validation adapter and section-status helper to combine:

- established form validation;
- invalid/pending draft issues;
- unresolved filing identity;
- supplemental-document checks;
- format-specific limits such as Excel capacity.

Use stable error codes, field/row identity, route, section, message, and blocking
scope. Map legacy strings through explicit adapters while changed rules emit
structured errors directly. Deduplicate by issue identity, not message text.

Sidebar, Summary, Next, print-page guidance, and export controls consume the
same result for the same revision. All local blockers appear near disabled
Next with functional jump links; unresolved legacy targets use an honest
section link instead of a dead field button. Do not announce the full list
on every input event or steal focus on ordinary validation updates.

Keep local navigation and output eligibility distinct. An Excel capacity issue
blocks Excel, not PDF. An unrelated incomplete section does not block Back or
valid local Next. A retained invalid date draft must prevent a false green
check for its section and block final output even if the model holds an old date.
Revalidate in command handlers so direct calls cannot bypass disabled buttons.

## Implementation Stages

The first two stages are independently shippable slices. The date repair uses
the existing shared contract that the coordinator will extend. Full binding
migration and durable draft recovery follow in 25C; neither is a prerequisite
for correcting the confirmed date writes. Release notes must distinguish an
early repair's verified scope from completion of the whole milestone.

### 25A: Baseline and Shared Date Repair

- Record the tested commit/build and active worktree changes. Reproduce B-2
  entry using keyboard/paste and automation; record event ordering without PII.
- Inventory date commit handlers, navigation/save boundaries, output entry
  points, and supported formats before changing the shared contract.
- Repair `form-contract.js` so invalid finalization retains the previous
  canonical value and visible invalid draft. Intentional clearing remains a
  separate operation governed by the field's required/optional rule.
- Add a shared draft-aware validation check in the same slice. Any unresolved
  invalid date draft blocks print/PDF/DOCX/supported Excel commands, including
  direct calls, even if the retained canonical date passes existing validation.
  The print page remains reachable to display actionable guidance.
- Capture eligible pending dates before saving, navigation, rerendering, and
  pruning. Do not depend solely on blur or create another feature-local handler.
  Retain invalid drafts across in-session rerenders and prevent draft-only rows
  from being pruned; bind retained drafts to their outgoing filing/row context.
- Integrate local draft errors, all-item guidance, and working jump links in
  the first migrated path. Preserve save-as-work-in-progress behavior.
- Add focused tests for invalid replacement, intentional clear, valid unblurred
  save, rapid B-2 entry/navigation, and stale-value export rejection. Exercise
  the same shared path on Inventory and Initial Plan date controls.
- Keep durable invalid-draft recovery and broad non-date binder migration in
  25C. State the early slice's reload/termination limitations explicitly; do not
  claim unpersisted invalid drafts survive reload or that the milestone is done.

25A acceptance requires both unit evidence for the confirmed mechanisms and
browser regression evidence for the reported workflow. Confirmed mechanisms
can be repaired while investigation continues, but B-2 remains an open finding
until its actual workflow is reproduced and verified after repair. Tests that
only exercise the parser or add verification pauses do not close it.

### 25B: Independent Filing Identity and Wording Delivery

- Inventory identity readers/writers and legal wording sources; complete the
  wording table for metadata, headers, preparer and attorney statements, and
  approved fixed references.
- Add the descriptor, identity mutation service, legacy compatibility mappings,
  and conflict tests. Correct new Final/Trust defaults and explicit type changes.
- Migrate Annual/Final/Trust UI and PDF/DOCX/Excel identity consumers, including
  both attestation passages and filenames. Verify approved wording in artifacts.
- Route identity issues into output gating while retaining existing validation
  and 25A's draft blockers. Do not defer those blockers to the later preflight.
- Ship this bounded identity correction independently of the full coordinator
  and recovery rollout. Unresolved source wording is reported specifically.

### 25C: Coordinator, Recovery, and All-Form Integration

- Extend the repaired shared commit API with complete context ownership,
  revision ordering, durable draft recovery, composition handling, and the
  operation boundaries specified above. Reuse 25A's implementation and tests.
- Route accounting B-1/B-2 and the common date helper through the coordinator;
  remove any remaining competing write/format handlers in the same change.
- Prove shared behavior on Guardian Inventory and Initial Plan date fields.
- Verify row pruning, same-page rerender, ward/period switching, and save races
  with controlled deferred operations rather than arbitrary timing sleeps.
- Migrate remaining accounting, Simplified, Inventory, and all Plan bindings.
- Route all identity consumers through the descriptor, retaining lazy feature
  imports and feature-owned validation/template logic.
- Add shared output preflight and snapshot handling to preview, print, PDF,
  DOCX, and supported Excel paths; consolidate the earlier gates and integrate
  every status consumer without dropping draft or identity blockers.
- Remove obsolete alternate writers only after each migrated path passes.
- Record any genuine special fields as explicit policies with tests.

### 25D: Cross-Form Acceptance and Release

- Complete the matrix below and report measured results, including manual AT
  checks. Automated focus/event simulation is not a screen-reader audit.
- Run the full unit/E2E suite and both builds; verify deployed-build behavior
  and portable `file://` workflows with no server dependency.
- Record remaining limitations, archive compatibility results, and wording
  decisions before marking the milestone complete.

## Cross-Form Verification Matrix

Every row requires identity, rapid input, persistence/recovery, guidance, and
artifact checks. Determine existing format support from code in 25A and record
each capability explicitly; mark unsupported formats N/A with evidence.

| Filing | Legacy identity | Representative date workflow | Required output coverage |
| --- | --- | --- | --- |
| Annual Accounting | `annual` | B-1/B-2 four-date batch, period, signature | Preview, print, PDF, DOCX, Excel |
| Final Accounting | `finalAccounting` | B-2, final period, signature | Preview, print, PDF, DOCX, Excel |
| Trust Accounting | `trustAccounting` | B-2, period, court order | Preview, print, PDF, DOCX, Excel |
| Simplified Accounting | `simplified` | Period and multiple guardian signatures | Preview, print, PDF, DOCX, Excel |
| Guardian Inventory | `guardian` | Schedule dates, signatures, year switching | Preview, print, PDF, DOCX, Excel |
| Initial Plan | `planInitial` | Exams, directives, signatures | Preview, print, PDF, DOCX; other formats only if supported |
| Annual Plan | `planAnnual` | Residence periods, directives, signatures | Preview, print, PDF, DOCX; other formats only if supported |
| Minor Plan | `planMinor` | Period and signatures | Preview, print, PDF, DOCX; other formats only if supported |
| Simplified Plan | `planSimplified` | Period and signatures | Preview, print, PDF, DOCX; other formats only if supported |

### Required Scenarios and Assertions

- Create through the UI, then check identity before manually selecting Filing
  Type. Test type changes, conversion/carryover, Excel import, old `.sav` reopen,
  unknown values, and deliberate identity conflicts.
- Compare independent expected titles/copy against sidebar, Summary, preview
  text, PDF metadata/running headers, DOCX properties/body/header/footer XML,
  Excel identity cells where supported, and downloaded filenames. Expected
  values must not be generated from the descriptor being tested.
- Assert Final/Trust filing-specific text, while allowing approved fixed Annual
  references. Visually inspect representative long headers and attestation
  paragraphs after wording changes; no clipped text or overlap.
- Enter dates consecutively without verification pauses; cover full paste,
  character entry, Tab/Shift+Tab, editing in the middle, clear, undo, IME,
  invalid/leap dates, two-digit years, and supported unpunctuated input.
- Trigger navigation, rerender, save, and export while a date still has focus.
  Check visible values, canonical values, recovered drafts, and actual output.
- Test invalid replacement of a valid date: retain old canonical data and new
  visible draft, block output, retain across save/reload, then clear the blocker
  only after correction or explicit clearing under the field's normal rules.
- Test identical paths across two wards/periods, deleted and shifted rows,
  draft-only rows, repeated mounts, and late callbacks from detached views.
- Delay older writes and output generation deliberately. Verify newer edits
  remain dirty, cannot be overwritten, and cannot appear in another filing.
- Assert section-status parity, all blockers visible beyond six items, every
  jump target functional, and command-level export gates enforced.
- Inspect generated PDF/DOCX contents and supported Excel export/import round
  trips; direct state seeding alone does not test the input lifecycle.
- Include supplemental Schedule A insertion/order regression for accounting
  aliases and multi-year Inventory to protect the shared output pipeline.
- Run keyboard/mobile focus and layout checks. Manually check representative
  Windows screen-reader/browser behavior and Safari/VoiceOver where available;
  record unavailable combinations rather than claim they passed.

Suggested test additions: descriptor/commit unit specs and shared E2E suites
for filing identity, field lifecycle, and artifact parity. Extend existing
parser, form-contract, preview, supplemental, and status tests where practical.
Use focused tests per stage, then `npm.cmd test` and `npm.cmd run build` for
release. Follow `CLAUDE.md` for local browser setup and repository commit rules.

## Acceptance and Decisions

The milestone is complete when all nine filing types use the shared identity
and commit contracts, Final/Trust artifacts carry approved consistent wording,
and reproduced rapid-entry defects pass without artificial pauses. Invalid
drafts must remain recoverable and actionable; committed values and output
snapshots must not drift between revisions or filings. All-item guidance and
first-release jump links are required across migrated forms.

No user decision is needed to begin the baseline and shared infrastructure.
This proposal recommends explicit correction for conflicting legacy identity,
atomic identity updates when Filing Type changes, and additive draft recovery.
Any court wording that cannot be established from source forms, or archive
compatibility that requires a breaking change, must be reported with concrete
evidence and alternatives before implementing that dependent part.
