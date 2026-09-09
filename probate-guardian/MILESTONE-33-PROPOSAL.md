# Milestone 33: Change-Surface E2E Contracts, Artifact Semantics, and Distribution Parity

## Status

**Proposal only.** No test-file migration, Playwright configuration change, CI
change, or product-code change is authorized until this plan is reviewed and
approved.

**Depends on Milestone 31.** This milestone's contract groups consume the
target vocabulary (`tests/e2e/support/target-profile.ts`) and filing
capability matrix (`tests/e2e/support/filing-matrix.ts`) Milestone 31 builds.
Do not begin this milestone until Milestone 31 is approved and landed, and
re-verify the baseline below against the tree as it stands after Milestone 31,
not the figures recorded here.

**Progress.** Milestone 31 landed (commit `c1c50c1`). Per this document's own
Migration Sequence ("begin with Annual/Final/Trust... do not combine all
phases in one change"), Phase 2.1's filing-identity contract has been
implemented and verified for its Annual/Final/Trust pilot scope only
(`tests/e2e/filing-identity.contract.spec.ts`, plus new helpers
`getPdfMetadata()` in `tests/e2e/support/pdf-extract.ts` and
`tests/e2e/support/docx-extract.ts`). Guardian, Simplified, and Phases 2.2
(form entry), 2.4 (persistence/recovery), 3, 4, and 5 remain proposal-only.

Migration Sequence step 2 ("Shared navigation/status pilot") has also landed,
for its Plan-family pilot scope only: `tests/e2e/navigation-status.contract.spec.ts`
covers, for all four Plan types, three checks `plan-fixture.ts`'s existing
mount tests don't touch — disabled-Next guidance itemizing every missing
field, a jump link actually moving focus, and Print Preview's banner agreeing
with the blocked-export alert on how many issues remain. Guardian, Annual,
and Simplified are not yet migrated into this contract.

**Real gap found and fixed during this pilot, not assumed away:** the
itemized guidance panel this section's own Phase 2.3 language describes
("disabled Next guidance identifies every local missing item") did not
actually work for eight of the app's nine filing types before this pilot.
`renderLocalSectionGuidance()` (`src/core/status/section-status.js`) was
previously imported only by `guardian-inventory/index.js` and
`annual-accounting/index.js`, so `window.renderLocalSectionGuidance` existed
only by session load-order accident for every other type, and only
`guardian-inventory/index.js` ever exposed its validator as
`window.validateGuardian` — the one binding
`legacy-app.js`'s `updateCurrentScheduleNextButton()` actually reads per
filing type. Annual, Simplified, and all four Plan types therefore always
fell back to one generic "Add at least one item..." message with no per-field
jump links, regardless of how many fields were actually missing. Fixed by
(1) importing `section-status.js` eagerly in `src/main.js` rather than
depending on which feature happens to mount first, and (2) exposing each
type's own validator on `window` (`validateAnnual`, `validateSimplified`,
`validatePlanAnnual`, `validatePlanInitial`, `validatePlanMinor`,
`validatePlanSimplified`), mirroring guardian-inventory's existing pattern
exactly. Verified with the full existing Chromium `source` suite plus the
new contract file, all passing, before this was considered landed.

**Resolved (follow-up fix, landed after the pilot above).** The limitation
this section originally recorded — `resolveRouteFromSection()` bucketing
every unrecognized section label onto Cover — turned out to affect Annual
and Simplified too, not just the four Plan types, once actually verified
against all six validators' real section labels (not assumed from the
Plan-only pilot's own scope): Annual/Simplified label sections with Roman
numerals ("Part II", "Parts VI & VII"), which the legacy Arabic-digit table
(`'part 1'`, `'part 2'`, ...) never matched either — only each type's literal
"Cover" and Annual's "Part I" (which defaults to the same route it needs, by
accident) resolved correctly; everything else fell through to `/`, and
several Plan labels containing "signature"/"guardian"/"preparer"/"attorney"
were actively misrouted to Guardian-Inventory's own `/d1`/`/d2`/`/d4` pages.

Fixed by reusing `legacy-app.js`'s existing `errorRoute()` — a regex-based
resolver already driving Print Preview's "Go to section" links, verified
correct for every real Guardian/Annual/Simplified label — as
`resolveRouteFromSection()`'s first resolution step, and adding a small
type-scoped exact-match table for the four Plan types' narrative headings
(which have no shared pattern a regex can generalize, and reuse labels like
bare "Signatures" across types for different pages — it resolves to `/p11`
for Plan Annual, `/p9` for Plan Initial, `/p3` for Plan Simplified). `filingType`
now threads from `legacy-app.js`'s `updateCurrentScheduleNextButton()`
through `renderLocalSectionGuidance()`/`adaptValidationErrors()` to
`resolveRouteFromSection()`. Verified: 5 new unit tests (the three-way
"Signatures" collision is the clearest proof type-scoping was actually
necessary), new e2e regression tests per Plan type plus one each for Annual
and Simplified proving a jump link now lands on the field's real page while
standing on it (not just that the item count matched, which the prior pilot
test could not distinguish from a wrong route), and the full Chromium
`source` suite, all passing. Field-path accuracy (a related but distinct gap
in the same file's keyword-based `path` inference) remains unaddressed —
out of scope for this fix, which is scoped to routing, not field focus.

## Goal

Make the E2E suite a reliable safety net for actual application changes rather
than a historical collection of feature and milestone tests. The strengthened
suite will express shared contracts once, test every declared filing
capability from Milestone 31's matrix, inspect generated artifacts
semantically, and report distribution-target coverage honestly without
turning every CI run into a 40- to 60-minute matrix.

The primary outcome is simple: a change to filing identity, field entry,
navigation/status, output generation, persistence, or distribution behavior
must have an obvious, focused E2E contract that fails if an affected surface
drifts.

## Background

At the time of writing, Milestone 30 (`fbd8fd5`) and Milestone 32 (`b21bd24`)
have both landed; a Chromium `source` run at `b21bd24` produced **202 passes,
five intentional target skips, zero failures**, independently verified — see
Milestone 31 for the full baseline history and how an earlier, inaccurate
"two stale PDF-title failures" claim was corrected. Re-verify this figure
again once Milestone 31 lands, since its Phase 0 work touches skip
declarations directly.

Current coverage differs materially by filing family:

- The four Plan features share `tests/e2e/support/plan-fixture.ts` for route,
  blocked-export, PDF-export, lifecycle, and status checks.
- Annual, Simplified, and Guardian Inventory carry similar contracts in three
  independently maintained styles.
- Final and Trust Accountings receive route smoke and supplemental-document
  tests but lack the same explicit feature-contract coverage as the Annual
  base type, despite legally distinct titles and attestation language (see
  Milestone 31's capability matrix, which declares this gap explicitly).
- Most successful-export tests establish only that a download has an expected
  extension, nontrivial size, and (for PDFs) a `%PDF-` header. They do not
  consistently prove the output says what the user saw in the application.

The suite also supports three materially different distribution targets:
`source`, `web`, and `portable`. Its default is `source`; PWA/offline tests
are intentionally skipped outside `web`, while `portable` has no service
worker. Those exclusions are valid, but a source-only result must not be
reported as full distribution parity.

Finally, around fifteen fixed waits remain. Some are harmless historical test
delays, but others cover download, import, backup, or cross-tab timing that
should be synchronized on observable application state.

## Non-Negotiables

1. Preserve the existing product behavior and use this milestone to strengthen
   tests, not to redesign filing, persistence, PDF, or PWA behavior.
2. Keep `workers: 1`. The suite shares an origin, IndexedDB, service workers,
   browser locks, BroadcastChannel state, and cross-tab tests; concurrency is
   not a safe default.
3. Retain existing feature-specific tests until a replacement contract covers
   their behavior. Do not do a wholesale rename or directory migration.
4. Continue using browser Playwright for real PDF, DOCX, Excel, download, and
   service-worker integration. Unit tests may cover pure parsing helpers, but
   they do not replace artifact generation tests.
5. Do not introduce image-snapshot testing as a substitute for semantic
   assertions. Existing geometric/layout assertions remain in scope.
6. Do not run the entire suite for every target and browser combination. Use
   the bounded execution profiles in this plan.
7. A test may use controlled `window.D` state for model- and artifact-focused
   setup, but user-entry behavior must be tested through actual controls and
   events in a separate workflow contract.

---

## Phase 2: Add Change-Surface Contract Groups

Create contract specs alongside existing feature specs. Do not move every
legacy test at once. Each group takes matrix entries (from Milestone 31) and
focused setup helpers, then is introduced incrementally. A legacy test is
retired only when the new contract provides equal or stronger coverage.

### 1. Filing identity contract

Add `tests/e2e/filing-identity.contract.spec.ts`. For each filing type, it
asserts that the authoritative filing identity agrees across relevant surfaces:

- visible form and sidebar labels;
- Summary title and filing-type row;
- print-preview/court-document heading;
- PDF metadata title, subject, keywords, and filing identifier where present;
- PDF and DOCX visible legal wording where supported;
- generated filename; and
- allowed or blocked output actions.

For Final and Trust, assert their own court heading plus preparer and attorney
attestation language. The test must prove they are not emitted as Annual
Accountings.

**M25 sequencing decision — superseded, corrected during Phase 2.1
execution:** this section originally assumed Milestone 25 (filing-descriptor/
identity work) was not yet implemented, and planned to write the Final/Trust
portion of this assertion as a `temporary-gap` skip referencing it. By the
time this pilot was executed, Milestone 25 had already landed (commit
`32626d3`, "feat: unify filing identity and field commits") — verified
directly, not taken on report: `src/core/filing/filing-descriptor.js` already
declares fully distinct `documentTitle`/`displayName`/`filenameStem` per
alias, `pdf-model.js` and `print.js` both resolve identity through
`resolveFilingDescriptor()`/`filingCopy()` rather than a hard-coded string,
and `annual-mount.spec.ts` already had a passing model-level identity test
predating this milestone. The Final/Trust portion of this contract was
therefore written and verified as a real, currently-passing assertion against
the actual generated PDF/DOCX bytes (`tests/e2e/filing-identity.contract.spec.ts`)
— not skipped. No further Milestone 25 dependency remains for this milestone.

### 2. Form entry contract

Add `tests/e2e/form-entry.contract.spec.ts`, organized by field behavior,
not page ownership. It covers representative controls from every applicable
family:

- normal typing and paste;
- IME/composition completion where supported by the browser automation layer;
- tab, blur, and immediate navigation;
- rapid multi-field entry;
- valid and invalid dates, including required four-digit years;
- identifier preservation for case, account, check, and legal reference data;
- name/address display formatting; and
- auto-save, reopen, and output blocking for unresolved invalid drafts.

Every test that verifies an entry behavior must interact through the UI and
assert both the control display and persisted/reopened state. Direct state
setup is not an acceptable substitute for this group.

### 3. Navigation and status contract

Add `tests/e2e/navigation-status.contract.spec.ts`. For each matrix route set
it verifies, as applicable:

- route mounts with no page or console error;
- sidebar completion, Summary status, and the underlying completion function
  agree;
- disabled Next guidance identifies every local missing item;
- field jump links move focus to the expected field; and
- print preview and every supported export gate report the same blocking
  reasons.

This generalizes the valuable Plan fixture and the existing Annual, Guardian,
and Simplified summary parity tests. It must preserve filing-specific route
and status cases locally when they do not fit a shared contract.

### 4. Persistence and recovery contract

Add `tests/e2e/persistence-recovery.contract.spec.ts` for common behavior
across supported targets:

- normal save/open and encrypted save/open;
- auto-save and pending valid input commits;
- invalid input preservation and output blocking;
- recovery cache restore/decline/clear behavior;
- legacy migration fixtures; and
- multi-tab lock contention where the target supports it.

Continue to keep specialized archive/security tests in their existing specs;
the contract checks cross-surface consistency rather than replacing detailed
format and cryptography cases.

### Phase 2 acceptance criteria

- Each change surface has a named, discoverable contract group.
- The four Plan forms, Guardian, Simplified, Annual, Final, and Trust all
  participate in the relevant shared contracts.
- Existing feature-specific tests remain until equivalent contract coverage is
  demonstrated in review.

---

## Phase 3: Make Output Tests Semantic

### 1. Reuse focused artifact helpers

Build on existing PDF extraction helpers (`tests/e2e/support/pdf-extract.ts`)
and add narrowly scoped helpers for DOCX and XLSX inspection. Helpers should
return structured observations, not make hidden assertions:

```ts
const pdf = await inspectPdf(download);
expect(pdf.metadata.title).toContain(expected.documentTitle);
expect(pdf.text).toContain(expected.attestationText);
```

For DOCX, inspect the generated package/document XML for required text and
headings. For XLSX, use the same technique: there is no XLSX-parsing
dependency available to Playwright's Node-side test code (`exceljs` is
vendored only for the browser, at `lib/exceljs.min.js`, and is not an
installed devDependency). `jszip` *is* already a devDependency — DOCX and
XLSX are both zip archives of XML parts, so XLSX inspection should unzip and
read `xl/workbook.xml` / the relevant sheet XML for declared identity cells
and expected sheets, the same approach as DOCX, not a new parsing library.
Do not assert incidental styling, package ordering, timestamps, or
byte-for-byte output.

### 2. Define output assertions by capability

Every supported output receives these layers:

- **Transport:** download event, expected extension, nonempty bytes, and basic
  file signature.
- **Identity:** filing title, ward/case identity where appropriate, metadata,
  and filename stem.
- **Meaning:** required section heading, filing-specific legal copy, and one
  meaningful case value.
- **Accessibility/structure:** preserve existing PDF/UA, selectable-text,
  signature, bookmark, and supplemental-document tests for PDFs that support
  them.

PDF page placement for supporting documents remains a semantic test: the
uploaded Schedule A document must occur immediately after its Schedule A
content, not merely be detected in the source data.

### 3. Consolidate duplicate metadata expectations

Move repeated known-document title construction into one test helper fed by
Milestone 31's filing matrix. Individual PDF structural specs may continue to
assert the raw stream, but they call the same expected-title function. This
prevents a single intentional title-format change from leaving multiple stale
literals.

### Phase 3 acceptance criteria

- A successful export cannot pass solely because its file downloaded.
- Every supported PDF asserts document meaning; DOCX/XLSX do so where
  supported, using `jszip`-based raw-part inspection for both.
- Final and Trust artifacts assert their distinct legal language.
- Existing deep PDF accessibility coverage remains present and independent of
  the new transport/identity checks.

---

## Phase 4: Normalize Synchronization and Test Layers

### 1. Replace arbitrary waits carefully

Inventory every `waitForTimeout()` call. Replace it with the event or state
that actually signals completion:

- exports: `page.waitForEvent('download')` plus completion status where needed;
- imports: model state, status text, or a file-processing completion marker;
- navigation: heading/route/mount readiness;
- recovery: visible restore prompt or cache state;
- cross-tab/locks: `window.getLockState()`-style observable state, a
  BroadcastChannel-visible state transition, local-storage state, or the
  contention dialog itself.

Do not replace a delay with an aggressive poll that races a genuine
BroadcastChannel or storage propagation boundary. Lock and backup tests must
wait for their actual state transition and verify both tabs' observed state.

Leave a fixed delay only for a behavior whose requirement is itself temporal.
Such a delay needs a comment naming that behavior and why no deterministic
event exists.

### 2. Label test layers in filenames and describes

New tests use behavior-first naming:

- `*.workflow.spec.ts` for real UI entry;
- `*.contract.spec.ts` for cross-form expectations;
- `*.artifact.spec.ts` for generated-file inspection; and
- `*.integration.spec.ts` for persistence, locks, PWA, and distribution.

Do not rename all 45 existing files. Rename only a file that is materially
rewritten during this milestone, and retain a short comment mapping a legacy
milestone name when it helps maintenance history.

### 3. Centralize common observability helpers

Provide small helpers for console/page-error capture, route readiness,
download capture, and assertions that a test is using workflow versus fixture
setup. Helpers must remain transparent: a failure message names the filing,
route, output, and expected state.

### Phase 4 acceptance criteria

- Every replaced delay waits on an observable product/event condition.
- Cross-tab lock tests wait for real lock state or visible contention, not a
  shorter arbitrary timeout.
- New or substantially rewritten specs identify their test layer.
- Shared helpers improve failure messages rather than hiding assertions.

---

## Phase 5: Distribution and Browser Execution Profiles

### 1. Keep the full run bounded

The current serial Chromium source run is approximately 7.6–8.8 minutes
(varies run to run; see Background). Running the full suite across three
targets and four browser engines would create an unacceptably slow and noisy
gate. Use these profiles instead:

| Profile | Target / Browser | Scope |
| --- | --- | --- |
| Core full | `source` / Chromium | Full workflow, contract, artifact, persistence, and security suite. |
| Hosted parity | `web` / Chromium | PWA registration, offline cache, chunk-load failure, hosted output/save-open smoke, and bootstrap. |
| Portable parity | `portable` / Chromium | File bootstrap, portable save/open/export smoke, fallback behavior, and explicit service-worker exclusions. |
| Cross-browser smoke | Firefox, WebKit, and Edge where available | Form entry/date behavior, download fallback, output-gate, and startup/unlock smoke. |

The hosted and portable profiles run all distribution-sensitive specs, not the
whole source suite. A pull request that changes a target-sensitive subsystem
must select the corresponding profile. Scheduled or release validation runs
all profiles.

### 2. Report profile-specific results

CI and local documentation report results as, for example,
`source/chromium: 202 passed`, `web/chromium: ...`, and
`portable/chromium: ...`. Skips are counted separately with their classified
reason (from Milestone 31's three-category scheme). No aggregate result may
imply that skipped hosted/portable behavior was executed.

### 3. Retain serial execution

Keep `workers: 1` in `playwright.config.ts`. This milestone does not attempt
parallel execution. If a later effort considers workers greater than one, it
must first isolate storage/origin state and demonstrate repeatable concurrency
measurements in a separate proposal.

### Phase 5 acceptance criteria

- `source`, `web`, and `portable` each have a documented, executable profile.
- Hosted PWA tests run in the `web` profile and are explicitly excluded from
  `portable`.
- Browser smoke coverage exercises fallback behavior rather than only Chromium
  happy paths.
- The documented full-matrix policy is bounded and practical.

---

## Migration Sequence and Review Gates

This is additive and incremental. Do not combine all phases in one change.

1. **Identity plus artifact pilot:** begin with Annual/Final/Trust because it
   proves alias-specific legal output and semantic artifact inspection.
2. **Shared navigation/status pilot:** extend the existing Plan fixture or a
   narrow successor; then migrate Guardian, Simplified, and Annual only after
   parity is demonstrated.
3. **Form entry and persistence contracts:** replace timing delays while
   preserving specialized backup, lock, and migration tests.
4. **Distribution profiles:** add target/browser commands and release gates
   after target-sensitive specs are correctly classified (Milestone 31).

At each gate:

- run the affected tests first;
- compare retained and replacement test titles/coverage paths;
- run the appropriate target profile; and
- run the full Chromium source suite before merging a phase.

No legacy spec is deleted merely because a new group exists. Deletion requires
a review note showing which contract case superseded every meaningful
assertion.

## Acceptance Criteria

- Every supported filing/output pair (per Milestone 31's matrix) has a
  declared artifact test; every unsupported pair is explicitly declared
  unavailable.
- Final and Trust prove their own UI, summary, print, metadata, filename, and
  legal-attestation output rather than inheriting Annual expectations. (The
  Milestone 25 dependency originally anticipated here was already resolved
  before this pilot ran — see the corrected sequencing note above — so this
  is a real passing assertion, not a `temporary-gap` skip.)
- Navigation/status contracts prove sidebar, Summary, Next guidance, jump
  links, print preview, and export gates agree.
- Form-entry workflow tests cover typing, paste, blur/tab, rapid entry,
  invalid drafts, persistence, and reopening for shared field behavior.
- Successful-output tests verify artifact identity and meaning, not just a
  download's extension or header bytes.
- Fixed waits are either replaced by observable conditions or explicitly
  documented as temporal requirements.
- Source, web, and portable results are reported separately; Chromium remains
  the full-suite gate and other engines run the bounded smoke profile.
- `workers: 1` remains until a separate, measured origin-isolation proposal
  establishes safe parallelism.
