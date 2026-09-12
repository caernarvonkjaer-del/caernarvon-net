# Test Index

One line per spec file: what it covers. Grouped by directory. Keep this in
sync per the instruction in `CLAUDE.md` — any change that adds, removes,
renames, or repurposes a test file should update the matching row here in
the same commit.

## tests/unit (vitest, `npm run test:unit`)

| File                                 | Covers                                                                                                                    |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------- |
| amended-form-line.spec.js            | "Amended Form?" prints the filer's actual answer; Annual-family identity and single-source footer subtitle                |
| annual-accounting-pdf-model.spec.js  | Trust Accounting PDF-model table layout for percentage and currency columns                                               |
| annual-accounting-pdf-model.spec.js  | Trust/Annual Accounting PDF-model table layout, Part VIII trust disclosure, and duplicate title suppression               |
| bar-number.spec.js                   | Florida Bar-number normalization: eight digits preserved, shorter values left-padded, and non-digits removed               |
| case-file.spec.js                    | Persistence crypto services (key derivation, salt); .sav packaging and filename helpers                                   |
| case-county-drift.spec.js            | Case-authoritative county mismatch advisory detection                                                                     |
| checklist-export-parity.spec.js      | Milestone 36-6: section checklist vs export validation rule parity; Milestone 39-C's new signatureState/Image fields added to the known-gaps allow-list |
| circuit-lookup.spec.js               | FL county → judicial circuit lookup helpers                                                                               |
| combobox-controller.spec.js          | ComboboxController widget behavior                                                                                        |
| content-corrections.spec.js          | Sub-milestone 36-5: content corrections (AO removal guard, Part VIII no-trust certification, date format, clerk guidance) |
| county-guidance.spec.js              | Milestone 37-1: hasSixthCircuitLocalGuidance() Pinellas/Pasco allow-list, case/whitespace, no blank-county default        |
| dashboard-preferences.spec.js        | Dashboard preference load/save/reset                                                                                      |
| dashboard-view-model.spec.js         | Dashboard priority ordering, filing contacts, ward deadline derivation                                                    |
| date-parser.spec.js                  | Flexible date parsing, display formatting, leap-year/days-in-month helpers                                                |
| date-rules.spec.js                   | Milestone 34-1A: checkDateOrder() shared date-ordering validation rule                                                    |
| docx-engine.spec.js                  | Court-form DOCX generation from PDF models                                                                                |
| excel-engine.spec.js                 | Excel cell-writing helpers (setCell, fmtDate, numValue, etc.)                                                             |
| filing-descriptor.spec.js            | Filing type → descriptor/copy resolution                                                                                  |
| form-contract.spec.js                | Stored-text sanitization, safe title-casing, form contract helpers                                                        |
| field-kind-inference.spec.js         | Milestone 36-6: whole-word field-kind inference; no shipped path collides mid-word; no text formatter on checkbox/radio   |
| form-fields.spec.js                  | inferFieldKind, renderFormField, renderSelectField, renderTextareaField                                                   |
| guardianship-options.spec.js         | GD-derived guardianship type/lifecycle option lists and legacy-value select preservation                                  |
| guardian-inventory-pdf-model.spec.js | Verified Guardian Inventory PDF model output                                                                              |
| live-region.spec.js                  | ARIA live-region announcer helper                                                                                         |
| plan-annual-parity.spec.js           | Milestone 37-3: readiness-checklist/export-validator parity proof for all 18 auto conditions, incl. 3 newly mapped; Milestone 39-C's Guardian/Attorney tri-state signature parity |
| plan-annual-pdf-model.spec.js        | Plan Annual PDF model output (incl. attorney email fields)                                                                |
| plan-co-guardian-pdf.spec.js         | All four Plan PDF models omit blank optional co-guardian signatures and retain populated co-guardians                     |
| plan-directive-cards.spec.js         | Milestone 37-4: directive-collection factory defaults and PDF/Word model gating on q10Executed/q11Executed                |
| plan-initial-parity.spec.js          | Milestone 37-3: readiness-checklist/export-validator parity proof for all 19 auto conditions, incl. 6 newly mapped; Milestone 39-C's Guardian/Attorney tri-state signature parity |
| plan-minor-parity.spec.js            | Milestone 37-3: readiness-checklist/export-validator parity proof for all 14 auto conditions, incl. 3 newly mapped; Milestone 39-C's Guardian/Preparer/Attorney tri-state signature parity |
| plan-readiness-county.spec.js        | Milestone 37-1: all four Plans certificate-of-service readiness wording gated on Pinellas/Pasco vs. other counties        |
| plan-simplified-parity.spec.js       | Milestone 37-3 pilot: readiness-checklist/export-validator parity proof for all 13 auto conditions, incl. 4 newly mapped  |
| plan-tristate.spec.js                | Schema-aware legacy Plan Yes/No migration and tri-state PDF rendering                                                     |
| pdf-address-format.spec.js           | Canonical PDF address composition and punctuation/whitespace cleanup                                                      |
| print-annotation-persistence.spec.js | Milestone 39-A: content-fingerprint drift detection and the MiniEventBus pdf.js collaborator shim                         |
| prune-cards.spec.js                  | Blank-card/blank-schedule-entry detection for pruning                                                                     |
| router.spec.js                       | Navigation router services (navigate, registerRoute, getCurrentPage)                                                      |
| schedule-definitions.spec.js         | SCHEDULE_SCHEMAS and collection row helpers                                                                               |
| section-status.spec.js               | Section completion status computation and local guidance text                                                             |
| signature-capture.spec.js            | Milestone 39-B: signature-pad PNG validation/dimensions, checkSignatureState() tri-state rule, legacy-migration inference |
| supplemental-pdf.spec.js             | Active supplemental doc period resolution; supplemental filing eligibility                                                |
| tab-state.spec.js                    | Cross-tab peer-state normalization and risky-peer detection                                                               |
| types-contract.spec.js               | Milestone 29: static type contract validation against schema/control policy                                               |
| validation-adapter.spec.js           | Validation error adaptation and route resolution from section                                                             |
| ward-carryover.spec.js               | Milestone 36-7: Ward carryover sources and multi-plan mapping fidelity                                                    |
| ward-lock.spec.js                    | Ward lock acquire/release/current-lock services                                                                           |
| xlsx-extract.spec.js                 | Milestone 33 Phase 3.1: xlsx-extract helper (reads support/xlsx-extract.ts)                                               |
| yes-no-radio-migration.spec.js      | Milestone 37-5: shared explicit Yes/No radio renderer and bespoke checkbox/select migration guards                       |

## tests/unit/support (helpers, not runnable specs)

| File                      | Purpose                                                                            |
| ------------------------- | ---------------------------------------------------------------------------------- |
| plan-readiness-parity.js  | Milestone 37-3: withOverrides()/autoById() shared by each Plan-type parity spec    |

## tests/e2e (Playwright, `npm run test:e2e`)

| File                                     | Covers                                                                                                                                                                                   |
| ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| annual-field-formatting.spec.ts          | Annual Accounting field formatting                                                                                                                                                       |
| annual-mount.spec.ts                     | annual-accounting feature module mount/dispose/routing                                                                                                                                   |
| annual-schedule-consistency.spec.ts      | Annual accounting schedule consistency across pages                                                                                                                                      |
| attestation-layout.spec.ts               | Attestation block layout                                                                                                                                                                 |
| backup-restore-sav.spec.ts               | Milestone 18: multi-ward backup & save-controls restore (`@origin-state`)                                                                                                                |
| case-file-protection.spec.ts             | preWriteValidator, multi-ward isolation, auto-save                                                                                                                                       |
| case-file-roundtrip.spec.ts              | .sav round-trip: unencrypted, encrypted, corrupted paths                                                                                                                                 |
| case-resolver.spec.ts                    | case-resolver behavior                                                                                                                                                                   |
| case-write-through.spec.ts               | Milestone 6: case write-through                                                                                                                                                          |
| dashboard-backup.spec.ts                 | Dashboard preference isolation and single-ward backup/export                                                                                                                             |
| dashboard-visual.spec.ts                 | Milestone 15: dashboard coherence across viewports/themes                                                                                                                                |
| date-validation.contract.spec.ts         | Milestone 34-1A item 2: date-order validation (period ordering, GID, signature dates) for Annual/Simplified/Plan Annual/Plan Minor/Plan Simplified, incl. field-path routing regressions |
| feature-load-failure.spec.ts             | Failed feature chunk shows reload action instead of blank view                                                                                                                           |
| filing-capability-matrix.spec.ts         | Filing capability matrix audit                                                                                                                                                           |
| filing-identity.contract.spec.ts         | Filing-identity contract across all 9 filing types                                                                                                                                       |
| form-entry-ux.spec.ts                    | Milestone 24: form entry UX, dates, preservation, guidance                                                                                                                               |
| form-entry.contract.spec.ts              | Form entry contract                                                                                                                                                                      |
| form-field-labels.spec.ts                | All visible form controls have accessible names, across form types                                                                                                                       |
| guardian-inventory-mount.spec.ts         | guardian-inventory feature module mount/dispose/routing                                                                                                                                  |
| guided-tour-navigation.spec.ts           | Guided-tour filing steps stay attached to active sidebar navigation                                                                                                                      |
| guardianship-selection-controls.spec.ts  | Existing guardianship type/lifecycle fields expose GD-derived select options                                                                                                             |
| navigation-status.contract.spec.ts       | Guardian Inventory nav/status contract; Annual/Final/Trust, Simplified, and Plan-type field-path accuracy (Milestone 33 item 3, sub-phases 3b/3c/3d)                                     |
| offline.spec.ts                          | Hosted offline cache (`@origin-state`)                                                                                                                                                   |
| output-semantics.artifact.spec.ts        | Milestone 33 Phase 3: output semantics artifact contract                                                                                                                                 |
| page-structure.spec.ts                   | All form pages preserve landmarks and heading structure                                                                                                                                  |
| party-dedupe.spec.ts                     | Milestone 7: party de-duplication                                                                                                                                                        |
| party-resolver.spec.ts                   | party-resolver hydration/dehydration core; party de-duplication                                                                                                                          |
| party-write-through.spec.ts              | Milestone 4: party write-through (planInitial + annual)                                                                                                                                  |
| pdf-accessibility-and-signatures.spec.ts | Non-raster PDF generation, signatures & bookmarks                                                                                                                                        |
| pdf-annotate.spec.ts                     | Milestone 39-A spike: pdf.js AnnotationEditorLayer toolbar (FreeText/Highlight/Undo/Clear), pilot-gated to Plan Simplified; persisted-annotation save/reopen round trip                  |
| pdf-fonts-and-xmp.spec.ts                | Embedded fonts & PDF/UA-1 XMP metadata                                                                                                                                                   |
| pdf-evidence-lab.spec.ts                 | Milestone 34-1D source/PDF.js/canvas/final-packet and Trust preview evidence capture                                                                                                     |
| pdf-form-specific.spec.ts                | PDF accessibility: accounting & inventory filing-specific coverage                                                                                                                       |
| pdf-preview-viewer.spec.ts               | Shared PDF preview/print viewer; M34-1A export-gating parity across all 7 features; M34-1B finalized-PDF pager refresh                                                                   |
| pdf-structure-tags.spec.ts               | Tagged structure, StructTreeRoot & marked content                                                                                                                                        |
| pdf-table-semantics.spec.ts              | Table semantics, colspan & multi-page continuation                                                                                                                                       |
| persistence-recovery.contract.spec.ts    | Persistence and recovery contract                                                                                                                                                        |
| plan-annual-mount.spec.ts                | Plan Annual feature module (via registerPlanMountTests)                                                                                                                                  |
| plan-directive-cards.spec.ts             | Milestone 37-4: directive-card checkbox check/uncheck/recheck (create, hide-not-delete, restore), Add/Remove, for Plan Initial and Plan Annual                                           |
| plan-initial-mount.spec.ts               | Plan Initial feature module (via registerPlanMountTests)                                                                                                                                 |
| plan-minor-mount.spec.ts                 | Plan Minor feature module (via registerPlanMountTests)                                                                                                                                   |
| plan-pdf-wcag-compliance.spec.ts         | Milestone 19-2: Plan-\* features on the shared vector PDF engine                                                                                                                         |
| plan-readiness.contract.spec.ts          | Milestone 34-1A item 1: readiness panel and export-gating agreement across all 4 Plan types; certPhysicianAttached manual-reminder DECISION                                              |
| plan-simplified-mount.spec.ts            | Plan Simplified feature module (via registerPlanMountTests)                                                                                                                              |
| pwa-registration.spec.ts                 | PWA/service-worker registration                                                                                                                                                          |
| recovery-cache.spec.ts                   | Crash recovery cache                                                                                                                                                                     |
| routes.spec.ts                           | Route table behavior                                                                                                                                                                     |
| schedule-card-layout.spec.ts             | Responsive schedule/Plan card grids; shared multi-column label and input-group alignment                                                                                                 |
| security.spec.ts                         | Milestone 11: security boundaries                                                                                                                                                        |
| signature-capture.contract.spec.ts       | Milestone 39-B: three-state signature control (Unsigned/"/s/"/Stamp) on Plan Simplified's Guardian card (pilot); Milestone 39-C: rolled out to Plan Annual/Initial/Minor's Guardian, Attorney, and (Minor) Preparer cards, incl. per-card stamp-image-paint proof via pdf.js's operator list |
| signature-style-removal.spec.ts          | Signature-style controls/legacy bindings absent from every form route                                                                                                                    |
| simplified-mount.spec.ts                 | simplified-accounting feature module mount/dispose/routing                                                                                                                               |
| skip-classification-audit.spec.ts        | Milestone 31 Phase 0.3: static audit that every test.skip() is classified via target-profile.ts helpers                                                                                  |
| startup.spec.ts                          | App startup (`@origin-state`)                                                                                                                                                            |
| supplemental-pdf-accounting.spec.ts      | Supplemental PDF inline rendering for Accounting forms (Annual, Trust, Final)                                                                                                            |
| tab-and-update.spec.ts                   | Cross-tab detection/notice, incl. app-update flow                                                                                                                                        |
| unlock.spec.ts                           | Unlock flow                                                                                                                                                                              |
| verified-inventory-workflow.spec.ts      | Verified Initial Inventory workflow & usability improvements                                                                                                                             |
| ward-lock.spec.ts                        | Ward-level tab locks (`@origin-state`)                                                                                                                                                   |

## tests/e2e/support (helpers, not runnable specs)

| File              | Purpose                                                                                                                             |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| docx-extract.ts   | Extracts text/structure from generated .docx for assertions                                                                         |
| filing-matrix.ts  | Shared filing-type capability matrix data used by matrix/contract specs                                                             |
| pdf-extract.ts    | Extracts text/structure/tags from generated PDFs for assertions                                                                     |
| plan-fixture.ts   | `registerPlanMountTests` — shared mount/dispose/routing test suite factory for the four Plan-\* filing types                        |
| target-profile.ts | Current run target detection + classified skip helpers (skipExpectedTargetExclusion / skipEnvironmentLimitation / skipTemporaryGap) |
| target.ts         | Page-object-style helpers (gotoApp, freshStartNoPassword, createWard, fillMinimalValid\*Ward, etc.)                                 |
| xlsx-extract.ts   | Extracts cell data from generated .xlsx for assertions                                                                              |

## Categories and scope

Every file above also falls into one **category** (what kind of thing it
verifies) and one **scope** (which filing type(s) it touches, or `app-shell`
/ `all forms` if it isn't form-specific). Use this to build a lite subset —
see "Running a lite subset" below.

Filing types: `guardian` (Verified Guardian Inventory), `simplified`,
`annual`, `finalAccounting`, `trustAccounting`, `planSimplified`,
`planAnnual`, `planInitial`, `planMinor`.

### Categories

| Category         | Meaning                                                                                  |
| ---------------- | ---------------------------------------------------------------------------------------- |
| ui-visual        | Layout, viewport/theme rendering, visual coherence — no data correctness                 |
| form-data        | Field entry, formatting, validation, field-to-model mapping                              |
| navigation       | Routing, tab/section status, guided tour, page structure/landmarks                       |
| pdf-export       | Generated PDF content, tagging, fonts, accessibility, WCAG                               |
| docx-xlsx-export | Generated .docx / .xlsx content                                                          |
| persistence      | .sav save/load, encryption, backup/restore, crash recovery, ward locks                   |
| data-model       | Party/case resolvers, write-through, de-dupe — the in-memory data layer                  |
| app-shell        | Cross-cutting shell behavior: security, offline/PWA, cross-tab, startup, feature loading |
| meta             | Audits the test suite itself, not the app                                                |

### tests/unit by category

| Category            | Files                                                                                                                                                                                                                                                                            |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| persistence         | case-file.spec.js, ward-lock.spec.js                                                                                                                                                                                                                                             |
| form-data           | form-contract.spec.js, form-fields.spec.js, guardianship-options.spec.js, validation-adapter.spec.js, date-parser.spec.js, date-rules.spec.js, combobox-controller.spec.js, prune-cards.spec.js, section-status.spec.js, schedule-definitions.spec.js, amended-form-line.spec.js, plan-simplified-parity.spec.js (planSimplified), plan-initial-parity.spec.js (planInitial), plan-annual-parity.spec.js (planAnnual), plan-minor-parity.spec.js (planMinor), signature-capture.spec.js (planSimplified, Milestone 39-B) |
| pdf-export (models) | guardian-inventory-pdf-model.spec.js (guardian), plan-annual-pdf-model.spec.js (planAnnual), supplemental-pdf.spec.js (annual/finalAccounting/trustAccounting), print-annotation-persistence.spec.js (planSimplified, Milestone 39-A)                                            |
| docx-xlsx-export    | docx-engine.spec.js, excel-engine.spec.js, xlsx-extract.spec.js                                                                                                                                                                                                                  |
| navigation          | router.spec.js, tab-state.spec.js                                                                                                                                                                                                                                                |
| app-shell / misc    | dashboard-view-model.spec.js, dashboard-preferences.spec.js, circuit-lookup.spec.js, live-region.spec.js, filing-descriptor.spec.js, types-contract.spec.js                                                                                                                      |
| app-shell / misc    | dashboard-view-model.spec.js, dashboard-preferences.spec.js, circuit-lookup.spec.js, live-region.spec.js, filing-descriptor.spec.js, types-contract.spec.js, field-kind-inference.spec.js, bar-number.spec.js                                                                                                                      |

### tests/e2e by category and scope

| Category    | Scope                                             | Files                                                                                                                                                                                                                   |
| ----------- | ------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ui-visual   | all forms                                         | dashboard-visual.spec.ts, schedule-card-layout.spec.ts, page-structure.spec.ts, form-field-labels.spec.ts, signature-style-removal.spec.ts, guided-tour-navigation.spec.ts                                              |
| form-data   | guardian                                          | guardian-inventory-mount.spec.ts, verified-inventory-workflow.spec.ts                                                                                                                                                   |
| form-data   | simplified                                        | simplified-mount.spec.ts                                                                                                                                                                                                |
| form-data   | annual                                            | annual-mount.spec.ts, annual-field-formatting.spec.ts, annual-schedule-consistency.spec.ts                                                                                                                              |
| form-data   | planSimplified                                    | plan-simplified-mount.spec.ts                                                                                                                                                                                           |
| form-data   | planSimplified/planAnnual/planInitial/planMinor   | signature-capture.contract.spec.ts (Milestone 39-B pilot, Milestone 39-C rollout)                                                                                                                                       |
| form-data   | planAnnual                                        | plan-annual-mount.spec.ts                                                                                                                                                                                               |
| form-data   | planInitial                                       | plan-initial-mount.spec.ts                                                                                                                                                                                              |
| form-data   | planMinor                                         | plan-minor-mount.spec.ts                                                                                                                                                                                                |
| form-data   | all forms                                         | form-entry-ux.spec.ts, form-entry.contract.spec.ts, filing-capability-matrix.spec.ts, guardianship-selection-controls.spec.ts, date-validation.contract.spec.ts                                                         |
| form-data   | planSimplified/planAnnual/planInitial/planMinor   | plan-readiness.contract.spec.ts                                                                                                                                                                                         |
| navigation  | all forms                                         | navigation-status.contract.spec.ts, filing-identity.contract.spec.ts, routes.spec.ts                                                                                                                                    |
| pdf-export  | all forms                                         | pdf-accessibility-and-signatures.spec.ts, pdf-fonts-and-xmp.spec.ts, pdf-structure-tags.spec.ts, pdf-table-semantics.spec.ts, pdf-preview-viewer.spec.ts, attestation-layout.spec.ts, output-semantics.artifact.spec.ts |
| pdf-export  | guardian + annual/finalAccounting/trustAccounting | pdf-form-specific.spec.ts, supplemental-pdf-accounting.spec.ts                                                                                                                                                          |
| pdf-export  | planSimplified/planAnnual/planInitial/planMinor   | plan-pdf-wcag-compliance.spec.ts                                                                                                                                                                                        |
| pdf-export  | planSimplified                                    | pdf-annotate.spec.ts (Milestone 39-A pilot)                                                                                                                                                                             |
| persistence | app-shell                                         | case-file-protection.spec.ts, case-file-roundtrip.spec.ts, backup-restore-sav.spec.ts, dashboard-backup.spec.ts, recovery-cache.spec.ts, persistence-recovery.contract.spec.ts, ward-lock.spec.ts                       |
| data-model  | app-shell                                         | party-resolver.spec.ts, party-dedupe.spec.ts, party-write-through.spec.ts, case-write-through.spec.ts, case-resolver.spec.ts                                                                                            |
| app-shell   | app-shell                                         | security.spec.ts, offline.spec.ts, pwa-registration.spec.ts, startup.spec.ts, unlock.spec.ts, tab-and-update.spec.ts, feature-load-failure.spec.ts                                                                      |
| meta        | —                                                 | skip-classification-audit.spec.ts                                                                                                                                                                                       |

## Running a lite subset

`npm test` (full unit + e2e) is still the required bar before committing to
`master` — see the rule above. The commands below are for fast local
iteration on a change _before_ that final run, not a replacement for it.

1. **Identify what changed.** `git diff --name-only` against `src/`. Map the
   touched files to a category/scope using the tables above (e.g. a change
   under `src/features/annual-accounting/` is scope `annual`; a change to
   `src/core/pdf/` is category `pdf-export`, scope `all forms`).
2. **Run the matching unit specs**, e.g.:
   ```powershell
   npx vitest run tests/unit/form-fields.spec.js tests/unit/validation-adapter.spec.js
   ```
3. **Run the matching e2e specs by file**, e.g. a UI-only change to the
   dashboard:
   ```powershell
   npx playwright test tests/e2e/dashboard-visual.spec.ts tests/e2e/dashboard-backup.spec.ts
   ```
   A data-field change scoped to one form (e.g. Plan Annual) only needs that
   form's mount spec plus the cross-cutting contracts that touch every form:
   ```powershell
   npx playwright test tests/e2e/plan-annual-mount.spec.ts tests/e2e/navigation-status.contract.spec.ts tests/e2e/filing-identity.contract.spec.ts
   ```
4. **When in doubt, widen rather than narrow.** Any change to
   `src/core/persistence/`, `src/core/pdf/`, `src/core/form/`,
   `src/core/types/`, or `src/tab-state.js` is cross-cutting — treat it as
   `all forms` / `app-shell` and skip the lite subset in favor of the full
   category (e.g. every `pdf-export` file, not one).
5. **Before committing**, run the full `npm test`. The lite subset only
   exists to catch obvious breaks faster during iteration; it is not a
   substitute for the green-suite requirement above, since this project has
   no automated changed-file → test mapping (no such tooling exists in
   `scripts/` today) and the category/scope tables above are maintained by
   hand alongside the file list — keep them in sync per the same rule.

## tests/baseline

Captured measurement snapshots used by `npm run measure:baseline` /
`measure:lifecycle` (`scripts/measure-baseline.mjs`,
`scripts/measure-lifecycle.mjs`), not Playwright/vitest specs.
