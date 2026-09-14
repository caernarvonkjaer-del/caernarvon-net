# Test Index

One line per spec file: what it covers. Grouped by directory. Keep this in
sync per `AGENTS.md` §7 — any change that adds, removes, renames, or
repurposes a test file should update the matching row here in the same
commit. `tests/unit/test-index-guard.spec.js` fails when a spec file has no
row here, has more than one, or a row names a file that no longer exists.

## tests/unit (vitest, `npm run test:unit`)

| File                                 | Covers                                                                                                                    |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------- |
| amended-form-line.spec.js            | "Amended Form?" prints the filer's actual answer; single-source footer subtitle (Annual-family filing-identity output moved to filing-descriptor.spec.js, Milestone 43D) |
| annual-accounting-totals.spec.js     | Milestone 40H-H: calcTotalsAnnual()'s schE_in/schE_out/schF1/schF2 keys, the three schedule totals that had none before   |
| annual-accounting-pdf-model.spec.js  | Trust/Annual Accounting PDF-model table layout, Part VIII trust disclosure, and duplicate title suppression               |
| boot-ordering.spec.js                | Milestone 40G: app startup is driven from main.js after module evaluation, not from legacy-app.js's classic-script top level |
| bar-number.spec.js                   | Florida Bar-number normalization: eight digits preserved, shorter values left-padded, and non-digits removed               |
| case-file.spec.js                    | Persistence crypto services (key derivation, salt); .sav packaging and filename helpers; Milestone 40F single save-clock invariant and legacy-app.js parse guard (Milestone 43D: three distinct concerns, scope noted in-file rather than split) | 
| case-county-drift.spec.js            | Case-vs-filing county mismatch advisory; Milestone 40C-A wording no longer claims the case registry is authoritative      |
| checklist-export-parity.spec.js      | Milestone 36-6: section checklist vs export validation rule parity; Milestone 39-C's new signatureState/Image fields (Plan family + Annual Accounting) added to the known-gaps allow-list |
| circuit-lookup.spec.js               | FL county to judicial circuit lookup; Milestone 40C-A: blank/unknown yields null circuit, empty ordinal and no caption; Milestone 43C: canonical home for this null-safety, de-duped from filing-county-defaults.spec.js |
| combobox-controller.spec.js          | ComboboxController widget behavior                                                                                        |
| content-corrections.spec.js          | Sub-milestone 36-5: content corrections (AO removal guard, accounting-period note string, clerk guidance, Schedule C-2 placeholder); Part VIII no-trusts certification moved to a real e2e test (annual-schedule-consistency.spec.ts, Milestone 43D) since no importable function existed to fix the unit-level hand-reimplementation |
| convert-targets.spec.js              | Milestone 42E: Convert Ward target eligibility keyed to the narrow CONVERT_SOURCE_TYPE table (36-7 intent), not the creation-time carry table |
| county-guidance.spec.js              | Milestone 37-1: hasSixthCircuitLocalGuidance() Pinellas/Pasco allow-list, case/whitespace, no blank-county default        |
| dashboard-preferences.spec.js        | Dashboard preference load/save/reset                                                                                      |
| dashboard-view-model.spec.js         | Dashboard priority ordering, filing contacts, ward deadline derivation                                                    |
| date-parser.spec.js                  | Flexible date parsing, display formatting, leap-year/days-in-month helpers                                                |
| date-rules.spec.js                   | Milestone 34-1A: checkDateOrder() shared date-ordering validation rule                                                    |
| date-range-no-mutation.spec.js       | Milestone 40C-C: date ranges are validated by checkDateOrder(), never rewritten; D-4 bond-period order + field mapping    |
| excel-capacity-issues.spec.js         | Milestone 44B: checkExcelCapacity and getExcelCapacityIssues emit typed excel.capacity.* issues across Simplified, Guardian, and Annual/Final/Trust templates |
| excel-engine.spec.js                 | Excel cell-writing helpers (setCell, fmtDate, numValue, etc.)                                                             |
| filing-capability-matrix.spec.js     | Filing capability matrix audit (moved from tests/e2e, Milestone 43G -- none of these tests ever touched `page`) |
| filing-descriptor.spec.js            | Filing type → descriptor/copy resolution; Annual-family filing identity in generated output (moved from amended-form-line.spec.js, Milestone 43D) |
| filing-type-enumeration-guard.spec.js | Milestone 42G: no file outside filing-descriptor.js (plus documented exceptions) lists 4+ distinct filing-type keys |
| filing-county-defaults.spec.js       | Milestone 40C-A: no filing defaults to a county; ward-Party establish/hydrate, legacy unanimity backfill, merge conflict (blank/unrecognized circuit-lookup null-safety itself lives in circuit-lookup.spec.js, Milestone 43C) |
| feature-exports.spec.js              | Every filing feature module keeps its public `validate*` export (guards an edit wedging a declaration between `export` and `function`) |
| form-cards.spec.js                   | Milestone 41-2/41-3: Tier 2 card templates (renderCaseCaptionFields, renderWardIdentityFields, renderReportingPeriodFields, renderPartyNameField incl. label override, renderPartyContactFields, renderResidenceFields incl. per-type label overrides) bind to data-form-path and render required elements, optional fields omitted when not passed |
| form-contract.spec.js                | Stored-text sanitization, safe title-casing, form contract helpers; canonical home for getControlKind()/getControlPolicy() path/kind pairs (Milestone 43C, consolidated from types-contract.spec.js and field-kind-inference.spec.js) |
| field-kind-inference.spec.js         | Milestone 36-6: whole-word field-kind inference; no shipped path collides mid-word; no text formatter on checkbox/radio (further path/kind pairs consolidated into form-contract.spec.js, Milestone 43C) |
| form-fields.spec.js                  | inferFieldKind, renderFormField, renderSelectField, renderTextareaField; Milestone 41-1: renderYesNoField, renderRadioGroupField, renderCheckboxField |
| form-fields-legacy-delegation.spec.js | Milestone 41-1: txtP()/radioP()/chkP()/yesNoRadioHTML() delegate to their Tier 1 primitive with equivalent arguments; yesNoCheckboxS()/yesNoCheckboxD()/yesNoRadioAnnualHTML() remain thin yesNoRadioHTML() wrappers, not independent checkboxes |
| form-write-side-effects.spec.js      | Milestone 42D: runFieldWriteSideEffects() is the one post-write tail (county commit, Party write-through, autosave, nav dots, ward card, name sync) and all three binding paths call it |
| guardianship-options.spec.js         | GD-derived guardianship type/lifecycle option lists and legacy-value select preservation                                  |
| guardian-inventory-pdf-model.spec.js | Verified Guardian Inventory PDF model output                                                                              |
| guardian-inventory-yes-no-radio.spec.js | Milestone 38E: unanswered string defaults and shared fieldset-backed Guardian Inventory radio controls |
| issue-registry.spec.js                | Milestone 44B: definitions for core validation, data integrity, supplemental (10 codes), capacity, and technical/security output issues; caller-override prevention; assertRegisteredIssues() assertion |
| live-region.spec.js                  | ARIA live-region announcer helper                                                                                         |
| output-authorization.spec.js         | Milestone 44B: authorizeFilingOutput() revision-bound acknowledgements, capability filtering, and non-bypassable enforcement; markFilingRevisionChanged()/beginFreshPreview()'s OWN invalidation logic in isolation -- see output-revision-wiring.spec.js for proof real app mutations actually call them |
| output-gate-inventory.spec.js        | Milestone 44B: static (source-text) inventory verifying all 3 Excel exporters, 7 PDF exporters, PDF preview, and browser print route through authorizeFilingOutput() for their save/export action; does not cover Preview-page button disabled-state (see the 7 pagePrint*() functions' own authorizeFilingOutput() calls, fixed under 44B follow-up) |
| output-preflight-typed.spec.js        | Milestone 44B: prepareFilingOutput() structured issue passthrough, bypassable vs non-bypassable status, acknowledgement clearing bypassable issues but never non-bypassable supplemental or identity issues |
| output-revision-wiring.spec.js       | Milestone 44B follow-up: proves markFilingRevisionChanged() is actually called at real mutation boundaries (field write, date draft record/clear, collection row add/duplicate/remove, party-slot link, 38A conflict resolution) and invalidates a standing acknowledgement; a no-op mutation must not spuriously invalidate |
| plan-annual-parity.spec.js           | Milestone 37-3: readiness-checklist/export-validator parity proof for all 18 auto conditions, incl. 3 newly mapped; Milestone 39-C's Guardian/Attorney tri-state signature parity |
| plan-annual-pdf-model.spec.js        | Plan Annual PDF model output (incl. attorney email fields)                                                                |
| plan-co-guardian-pdf.spec.js         | All four Plan PDF models omit blank optional co-guardian signatures and retain populated co-guardians                     |
| plan-directive-cards.spec.js         | Milestone 37-4: directive-collection factory defaults and PDF model gating on q10Executed/q11Executed                |
| plan-initial-parity.spec.js          | Milestone 37-3: readiness-checklist/export-validator parity proof for all 20 auto conditions (19 + Milestone 40C-H's plan.q7explain), incl. 6 newly mapped; Milestone 39-C's Guardian/Attorney tri-state signature parity |
| plan-minor-parity.spec.js            | Milestone 37-3: readiness-checklist/export-validator parity proof for all 14 auto conditions, incl. 3 newly mapped; Milestone 39-C's Guardian/Preparer/Attorney tri-state signature parity |
| plan-readiness-county.spec.js        | Milestone 37-1: all four Plans certificate-of-service readiness wording gated on Pinellas/Pasco vs. other counties; Milestone 44C: read from readiness-config.js, plus no local text for the five accounting/inventory filings |
| plan-simplified-parity.spec.js       | Milestone 37-3 pilot: readiness-checklist/export-validator parity proof for all 13 auto conditions, incl. 4 newly mapped  |
| readiness-card.spec.js               | Milestone 38B/44C: shared readiness card renderer -- one `<details>`/`<summary>`, county-policy title, open-by-default and exact manual-review summary rule, escaping, jump-link routing, retained toggle + resetReadinessCardState() |
| readiness-source-map.spec.js         | Milestone 38B/44C: source-inventory completeness contract -- nine filing keys, automatic/manual/unsupported dispositions, bidirectional blocking-issue mapping with the explicit out-of-card allow-list, DSHP non-filing |
| plan-tristate.spec.js                | Legacy Plan boolean migration; Plan Annual Q8 and Initial Q7 tri-state PDF output                                           |
| preparer-note.spec.js                | Milestone 40H-E: .preparer-note precedes the sworn statement on all 7 signing pages; absent from every pdf-model.js output |
| pdf-address-format.spec.js           | Canonical PDF address composition and punctuation/whitespace cleanup                                                      |
| pdf-cert-service-address.spec.js     | Milestone 40E: certificate-of-service address cells are discrete lines; Simplified's dropped line4 restored               |
| print-annotation-persistence.spec.js | Milestone 39-A: content-fingerprint drift detection and the MiniEventBus pdf.js collaborator shim                         |
| prune-cards.spec.js                  | Blank-card/blank-schedule-entry detection for pruning                                                                     |
| router.spec.js                       | Navigation router services (navigate, registerRoute, getCurrentPage)                                                      |
| schedule-definitions.spec.js         | SCHEDULE_SCHEMAS and collection row helpers                                                                               |
| section-status.spec.js               | Section completion status computation and local guidance text                                                             |
| security-source-audit.spec.js        | Milestone 43G: page-less source-text audits moved from tests/e2e/security.spec.ts -- event-attribute detector, no executable inline handlers/scripts anywhere in src, service-worker redirect guard |
| signature-capture.spec.js            | Milestone 39-B: signature-pad PNG validation/dimensions, checkSignatureState() tri-state rule, legacy-migration inference; Milestone 39-C: removeLightBackground() luminance-threshold Upload transparency fix, incl. documented degraded-case limits; hasVisibleContent() blank-signature-content guard (2026-09-13 bug fix) |
| signature-stamp-history.spec.js      | Milestone 46A: party.signatureImages append-only store -- prior entries survive a new active stamp, at most one active at a time, ids scoped per party (so a filing reference must be compound), next id derived from max not length, and no delete path exists |
| ssn-format.spec.js                   | maskSSN() for SSN/EIN/TIN inputs and its integration in every PDF model identifier output                                |
| supplemental-pdf.spec.js             | Active supplemental doc period resolution; Milestone 44B: supplemental filing eligibility emitting typed non-bypassable issues (page-limit, total-bytes, etc.) |
| tab-state.spec.js                    | Cross-tab peer-state normalization and risky-peer detection                                                               |
| test-index-guard.spec.js             | Milestone 42A: every spec file has exactly one row in this file and every row names an existing file                     |
| theme-persistence.spec.js            | Milestone 40D: theme stored per device in localStorage, one-time legacy .sav seed, pre-paint resolution, prepaint.js key parity |
| types-contract.spec.js               | Milestone 29: static type contract validation against schema/control policy (getControlKind()/getControlPolicy() pairs consolidated into form-contract.spec.js, Milestone 43C) |
| validation-adapter.spec.js           | Validation error adaptation and route resolution from section                                                             |
| validation-issue.spec.js             | Milestone 42F: validationIssue()/issueFactory() build registry-backed issues from the "Section — detail" convention; toString() is the message; Milestone 44A: non-bypassable simplified.guardian.address-conflict code on Part IV address conflict, and that prepareFilingOutput()'s acknowledgement clears bypassable issues but never that one |
| window-bridge.spec.js                | Milestone 42C: every window.X = site in src/ is in fixtures/window-bridge-allowlist.json (scripts/audit-window-bridge.mjs); window-bridge.d.ts in sync; no new triple definitions |
| ward-carryover.spec.js               | Carry-over field mapping between filing types; Milestone 40C-F nested Initial-Inventory attorney shape; county never taken from the source snapshot; Milestone 40H-J: Plan/Accounting -> Guardian Inventory attorney block writes the nested shape, not dropped flat keys |
| ward-lock.spec.js                    | Ward lock acquire/release/current-lock services                                                                           |
| xlsx-extract.spec.js                 | Milestone 33 Phase 3.1: xlsx-extract helper (reads support/xlsx-extract.ts)                                               |
| yes-no-radio-migration.spec.js      | Milestone 37-5: shared explicit Yes/No radio renderer and bespoke checkbox/select migration guards                       |

## tests/unit/support (helpers, not runnable specs)

| File                      | Purpose                                                                            |
| ------------------------- | ---------------------------------------------------------------------------------- |
| plan-readiness-parity.js  | Milestone 37-3: withOverrides()/autoById() shared by each Plan-type parity spec; Milestone 43C: createPlanTestWindowStub() consolidates the four specs' duplicated global.window boilerplate |
| fixtures/window-bridge-allowlist.json | Milestone 42C: the declared `window.X =` surface; regenerate with `node scripts/audit-window-bridge.mjs --json` |

## tests/e2e (Playwright, `npm run test:e2e`)

| File                                     | Covers                                                                                                                                                                                   |
| ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| annual-field-formatting.spec.ts          | Annual Accounting field formatting                                                                                                                                                       |
| annual-mount.spec.ts                     | annual-accounting feature module mount/dispose/routing; Milestone 43G: stale data-annual-action click delegate does not survive dispose; Milestone 41-3: byte-identical Cover snapshot pin plus Final/Trust alias checks for the reporting-period Tier 2 card |
| annual-schedule-consistency.spec.ts      | Annual accounting schedule consistency across pages; Milestone 43D: Part VIII (Trusts) completes via verify-none or a named trust row, matching computeNavChecks() in a real browser     |
| backup-restore-sav.spec.ts               | Milestone 18: multi-ward backup & save-controls restore (`@origin-state`); Milestone 41B: consolidated two-button (Save Backup/Open Backup) surface, handle-reuse silent rewrite on a second save |
| case-file-protection.spec.ts             | preWriteValidator, multi-ward isolation, auto-save                                                                                                                                       |
| case-file-roundtrip.spec.ts              | .sav round-trip: unencrypted, encrypted, corrupted paths                                                                                                                                 |
| case-resolver.spec.ts                    | case-resolver behavior                                                                                                                                                                   |
| carryover-workflow.spec.ts               | Milestone 40C-F/G2: the real Initial Inventory → Simplified Accounting carry-over through the eligibility modal (and its Annual redirect); nested attorney fields, selected-source copy, ward-Party county hydration |
| case-write-through.spec.ts               | Milestone 6: case write-through                                                                                                                                                          |
| convert-ward.spec.ts                     | Milestone 40H-I: Convert Ward ("New Filing from Existing") ward-selector default, same-family accounting-to-accounting starting-balance/cert-recipient carryover, and the confirmation message; Milestone 43F: real modal `<select>` renders exactly convertTargetsFor()'s eligible list, incl. Plan Minor's fully-ineligible case |
| cover-county.spec.ts                     | Milestone 40C-A: the real Cover county combobox establishes the ward Party county, hydrates later filings, and never prints a Sixth Circuit caption when blank                           |
| dashboard-backup.spec.ts                 | Dashboard preference isolation, single-ward backup/export, and Milestone 40C-1 single-ward export/reopen reconstructs ward-Party county under unanimity rule |
| dashboard-visual.spec.ts                 | Milestone 15: dashboard coherence across viewports/themes -- one test per viewport/theme combination (Milestone 43G, split from one 12-combination mega-test)                           |
| date-validation.contract.spec.ts         | Milestone 34-1A date-order validation across filing types; Milestone 40C-C no-mutation on entry and the D-4 bond period; Milestone 43H: reads ValidatorIssue.message directly (window-api.ts) instead of substring-matching a stringified issue |
| feature-load-failure.spec.ts             | Failed feature chunk shows reload action instead of blank view                                                                                                                           |
| filing-identity.contract.spec.ts         | Filing-identity contract across all 9 filing types                                                                                                                                       |
| form-entry-ux.spec.ts                    | Milestone 24: form entry UX, dates, preservation, guidance                                                                                                                               |
| form-entry.contract.spec.ts              | Form entry contract                                                                                                                                                                      |
| form-field-labels.spec.ts                | All visible form controls have accessible names, across form types                                                                                                                       |
| guardian-inventory-mount.spec.ts         | guardian-inventory feature module mount/dispose/routing; Milestone 43G: stale data-inventory-action click delegate does not survive dispose; Milestone 41-3: textInput() Tier 1 delegation still writes via bindForms, repaints live totals, and is claimed by exactly one listener (data-bind present, data-form-path absent)                                              |
| guardian-inventory-tri-state-radios.spec.ts | Milestone 38E/43B: Amended Form, Schedules A-1/B-1/B-2/B-3 and D-3 radios render unanswered, write Yes, and preserve the D-3 child answer when hidden |
| guided-tour-navigation.spec.ts           | Guided-tour filing steps stay attached to active sidebar navigation -- one test per filing type (Milestone 43G, split from one 7-type mega-test)                                        |
| guardianship-selection-controls.spec.ts  | Existing guardianship type/lifecycle fields expose GD-derived select options                                                                                                             |
| legacy-ward-data-normalization.spec.ts   | Milestone 43A: normalizeWardData() legacy-boolean -> tri-state migration and window.calc restricted/unrestricted totals for Guardian Inventory (real browser coverage; replaces the always-passing dead tests/unit/milestone-38e.spec.js) |
| navigation-status.contract.spec.ts       | Navigation/status contract: guidance, jump-link focus, issue-count agreement; Milestone 40C-E sidebar-vs-export-blocker parity; Milestone 43H: reads ValidatorIssue.message directly (window-api.ts); Guardian Print Preview issue-count test disambiguated from Milestone 44C's readiness card sharing its classes |
| offline.spec.ts                          | Hosted offline cache (`@origin-state`)                                                                                                                                                   |
| output-semantics.artifact.spec.ts        | Milestone 33 Phase 3: output semantics artifact contract; Milestone 43E: supplemental-attachment fixture via buildSupplementalAttachmentFixture()                                        |
| page-structure.spec.ts                   | All form pages preserve landmarks and heading structure                                                                                                                                  |
| party-dedupe.spec.ts                     | Milestone 7: party de-duplication; Milestone 40C-1: ward county merge conflict warning, cancellation, and resolution                                                                    |
| party-resolver.spec.ts                   | party-resolver hydration/dehydration core; party de-duplication via resolver (Milestone 43C: retitled describe block to disambiguate from party-dedupe.spec.ts's identical title); Milestone 40C-1: single-ward import reconstruction under unanimity rule, legacy backfill and merge conflict handling    |
| party-write-through.spec.ts              | Milestone 4: party write-through (planInitial + annual)                                                                                                                                  |
| pdf-accessibility-and-signatures.spec.ts | Non-raster PDF generation, signatures & bookmarks; Milestone 43E: supplemental-attachment fixtures via buildSupplementalAttachmentFixture()                                              |
| pdf-annotate.spec.ts                     | Milestone 39-A: pdf.js AnnotationEditorLayer toolbar (FreeText/Highlight/Undo/Clear); persisted-annotation save/reopen round trip; Milestone 43E: strengthened saved-bytes size floor; Milestone 45A: gzip storage compression and 39-A-pilot backwards compatibility; Milestone 45B: toolbar mounts on all nine filing keys (replaces the pilot-gating test) |
| pdf-fonts-and-xmp.spec.ts                | Embedded fonts & PDF/UA-1 XMP metadata (Guardian Inventory); Milestone 43F: same checks extended to Annual Accounting |
| pdf-evidence-lab.spec.ts                 | Milestone 34-1D source/PDF.js/canvas/final-packet evidence capture; Milestone 43E: Trust preview/pager evidence folded into pdf-preview-viewer.spec.ts's FEATURES loop, strengthened non-white-pixel floor |
| pdf-form-specific.spec.ts                | PDF accessibility: accounting & inventory filing-specific coverage; Milestone 40E certificate-of-service address line breaks                                                             |
| pdf-preview-viewer.spec.ts               | Shared PDF preview/print viewer; M34-1A export-gating parity across all 7 features; M34-1B finalized-PDF pager refresh; Milestone 43E: FEATURES gained a Trust Accounting entry (previously untested), folded from pdf-evidence-lab.spec.ts |
| pdf-structure-tags.spec.ts               | Tagged structure, StructTreeRoot & marked content                                                                                                                                        |
| pdf-table-semantics.spec.ts              | Table semantics, colspan & multi-page continuation (Guardian Inventory); Milestone 43F: same checks extended to Annual Accounting; a pre-existing stale ColSpan-count assertion (Schedule A-1 gained columns since it was written) fixed along the way |
| persistence-recovery.contract.spec.ts    | Persistence and recovery contract                                                                                                                                                        |
| plan-annual-mount.spec.ts                | Plan Annual feature module (via registerPlanMountTests); Milestone 41-3: Cover and Signatures page snapshot pins, both byte-identical through the Tier 2/1 field migration |
| plan-benefits-tristate.spec.ts            | Milestone 38E: Plan Annual Q8 and Plan Initial Q7 unanswered/Yes/No radio behavior and string persistence                                                                              |
| plan-directive-cards.spec.ts             | Milestone 37-4: directive-card checkbox check/uncheck/recheck (create, hide-not-delete, restore), Add/Remove, for Plan Initial and Plan Annual                                           |
| plan-initial-mount.spec.ts               | Plan Initial feature module (via registerPlanMountTests); Milestone 41-3: Cover (byte-identical) and Signatures page text-content-snapshot pins for the Tier 2/1 field migration |
| plan-minor-mount.spec.ts                 | Plan Minor feature module (via registerPlanMountTests); Milestone 41-3: Cover and Signatures page text-content-snapshot pins for the Tier 2/1 field migration |
| plan-pdf-wcag-compliance.spec.ts         | Milestone 19-2: Plan-\* features on the shared vector PDF engine; Milestone 43E: CONFIGS-driven loop across the four Plan types, replacing four hand-duplicated bodies; Milestone 43F: MarkInfo and heading-order-no-skip now asserted uniformly across all four (axe-core was considered and rejected -- no such dependency/call exists anywhere in this repo, and it can't inspect generated PDF bytes anyway) |
| plan-readiness.contract.spec.ts          | Milestone 34-1A item 1: readiness panel and export-gating agreement across all 4 Plan types; certPhysicianAttached manual-reminder DECISION; Milestone 40H-D: real `<summary>` disclosure markup; Milestone 44C: legacy dispatcher/bridges gone, one shared card per Plan |
| readiness-card.contract.spec.ts          | Milestone 38B/44C: all nine filing types render exactly one shared readiness card -- Pinellas/Pasco vs. other title, collapsed manual-review default, keyboard toggle retained across rerender and reset on fresh Preview entry, issue-row jump routing, predicate rows unlinked, card absent from the generated PDF |
| plan-simplified-mount.spec.ts            | Plan Simplified feature module (via registerPlanMountTests); Milestone 41-2: Cover page and Signatures page text-content-snapshot pins proving 0 visual diff through the Tier 2 card pilot |
| print-preview-signature-jump.spec.ts     | Milestone 39-E: Print Preview's blocked panel resolves a real jump-to-field link via adaptValidationErrors()/focusFieldByPath(), for Plan Simplified's scalar/collection-row shape and Guardian Inventory's section-embedded roleLabel: '' shape; fixed a cross-route data-field-path/data-jump-path collision found along the way |
| pwa-registration.spec.ts                 | PWA/service-worker registration                                                                                                                                                          |
| recovery-cache.spec.ts                   | Crash recovery cache                                                                                                                                                                     |
| save-pipeline-boot.spec.ts               | Milestone 40F: startup completes with an existing case; no false "Last backup" claim before a real write                                                                                 |
| routes.spec.ts                           | Route table behavior; sidebar nav accordion forgets a hand-opened section on navigation (Milestone 40F); returning to the dashboard clears the previous filing's sidebar context strip and nav checklist; mostly dashboard shell UI in practice (Milestone 43D: scope noted in-file rather than split) |
| schedule-docs-period-key.spec.ts         | Milestone 40C-D: supporting-document comments and uploads re-key per accounting period and survive a change-and-change-back round trip; Milestone 43F: real navigation/locator/focus coverage added (heading updates on-screen, Comments textarea never loses focus while typing) |
| schedule-card-layout.spec.ts             | Responsive schedule/Plan card grids; shared multi-column label and input-group alignment; Milestone 40I: hand-rolled fields align with their primitive-built row-mates (Schedule B-4 Category), no forced min-height on a single-line label; residual both-hand-rolled two-line-label pair (Plan Initial Q11); merged from attestation-layout.spec.ts (Milestone 43D): attestation/co-guardian card grid responsiveness across Guardian Inventory, Annual/Simplified Accounting and all four Plan types |
| security.spec.ts                         | Milestone 11: security boundaries (page-driven: CSP header, fragment-name rejection, hosted script MIME types -- page-less source-text audits moved to security-source-audit.spec.js, Milestone 43G) |
| signature-capture.contract.spec.ts       | Milestone 39-B: three-state signature control (Unsigned/"/s/"/Stamp) on Plan Simplified's Guardian card (pilot); Milestone 39-C: rolled out to Plan Annual/Initial/Minor, Simplified Accounting, Annual/Final/Trust Accounting, and Guardian Inventory's Guardian, Attorney, Preparer, and Certificate-of-Service Attorney cards, incl. per-card stamp-image-paint proof via pdf.js's operator list -- completing the rollout across every filing type; the Upload background-transparency luminance-threshold fix proved once through a real file upload |
| signature-stamp-reuse.spec.ts            | Milestone 46B: capturing a stamp records it on the linked party and a second filing reuses it (bytes copied, not referenced); every apply is confirmed; declining applies nothing; an unlinked slot offers nothing but still signs; an already-signed filing keeps its exact mark after the party captures a newer stamp |
| signature-style-removal.spec.ts          | Signature-style controls/legacy bindings absent from every form route                                                                                                                    |
| simplified-mount.spec.ts                 | simplified-accounting feature module mount/dispose/routing; Milestone 41-3: Cover and Part III Declaration snapshot pins, both byte-identical through the reporting-period Tier 2 card |
| skip-classification-audit.spec.ts        | Milestone 31 Phase 0.3: static audit that every test.skip() is classified via target-profile.ts helpers                                                                                  |
| startup.spec.ts                          | App startup (`@origin-state`); Milestone 40G: reaching the dashboard mounts it with no uncaught exception; Milestone 40H-A: a guardian-type ward's dashboard progress calc degrades to null (no console warning, no fabricated pass) before window.validateGuardian loads |
| supplemental-pdf-accounting.spec.ts      | Supplemental PDF inline rendering for Accounting forms (Annual, Trust, Final); Milestone 43E: all four tests share buildSupplementalAttachmentFixture()                                  |
| tab-and-update.spec.ts                   | Cross-tab detection/notice, incl. app-update flow                                                                                                                                        |
| theme-prepaint.spec.ts                   | Milestone 40D: stored theme beats the OS preference before first paint, both theme attributes track the toggle, and no theme reaches app state                                           |
| unlock.spec.ts                           | Unlock flow                                                                                                                                                                              |
| validation-structured-paths.spec.ts      | Milestone 42F: for every filing type, every validator issue is a structured object with a section and (for field issues) an explicit path; no bare strings; was the migration oracle against the deleted text-matching chain |
| verified-inventory-workflow.spec.ts      | Verified Initial Inventory workflow & usability improvements: label associations, no auto-tour, case-number normalization, save-event hook, Schedule B-2 DOM stability, D-3 tri-state flow -- six independent tests (Milestone 43D, split from one mega-test) |
| ward-lock.spec.ts                        | Ward-level tab locks (`@origin-state`)                                                                                                                                                   |

## tests/e2e/support (helpers, not runnable specs)

| File              | Purpose                                                                                                                             |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| filing-matrix.ts  | Shared filing-type capability matrix data used by matrix/contract specs                                                             |
| pdf-extract.ts    | Extracts text/structure/tags from generated PDFs for assertions                                                                     |
| supplemental-pdf-fixture.ts | Milestone 43E: buildSupplementalAttachmentFixture() -- shared createJsPdfInstance/digestDataUrl/files[]-entry builder for supplemental-PDF-insertion tests |
| plan-fixture.ts   | `registerPlanMountTests` — shared mount/dispose/routing test suite factory for the four Plan-\* filing types                        |
| target-profile.ts | Current run target detection + classified skip helpers (skipExpectedTargetExclusion / skipEnvironmentLimitation / skipTemporaryGap) |
| target.ts         | Page-object-style helpers (gotoApp, freshStartNoPassword, createWard, fillMinimalValid\*Ward, etc.); assertNoInlineEventHandlers() (Milestone 43D); extractFormContentSnapshot() (Milestone 41-2, 0-visual-diff proof technique; Milestone 41-3: keys checkboxes/radios on stable binding attributes and rejects auto_ nonce ids, which previously made the snapshot differ between two runs of identical code) |
| window-api.ts     | Milestone 42C: `PgWindow` type for the app globals specs reach through page.evaluate(), plus navigateTo/addFiling/activeFiling wrappers; Milestone 43H: `ValidatorIssue` type (raw validateX() issue shape) adopted by navigation-status.contract.spec.ts and date-validation.contract.spec.ts |
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
| xlsx-export      | Generated .xlsx content                                                                  |
| persistence      | .sav save/load, encryption, backup/restore, crash recovery, ward locks                   |
| data-model       | Party/case resolvers, write-through, de-dupe — the in-memory data layer                  |
| app-shell        | Cross-cutting shell behavior: security, offline/PWA, cross-tab, startup, feature loading |
| meta             | Audits the test suite itself, not the app                                                |

### tests/unit by category

| Category            | Files                                                                                                                                                                                                                                                                            |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| persistence         | case-file.spec.js, ward-lock.spec.js, boot-ordering.spec.js                                                                                                                                                                                                                                             |
| form-data           | form-contract.spec.js, form-fields.spec.js, guardianship-options.spec.js, validation-adapter.spec.js, date-parser.spec.js, date-rules.spec.js, combobox-controller.spec.js, prune-cards.spec.js, section-status.spec.js, schedule-definitions.spec.js, amended-form-line.spec.js, plan-simplified-parity.spec.js (planSimplified), plan-initial-parity.spec.js (planInitial), plan-annual-parity.spec.js (planAnnual), plan-minor-parity.spec.js (planMinor), signature-capture.spec.js (planSimplified, Milestone 39-B), plan-readiness-county.spec.js, readiness-card.spec.js, readiness-source-map.spec.js (Milestone 38B/44C, all nine filings) |
| pdf-export (models) | guardian-inventory-pdf-model.spec.js (guardian), plan-annual-pdf-model.spec.js (planAnnual), supplemental-pdf.spec.js (annual/finalAccounting/trustAccounting), print-annotation-persistence.spec.js (planSimplified, Milestone 39-A)                                            |
| xlsx-export         | excel-engine.spec.js, xlsx-extract.spec.js                                                                                                                                                                                                                                       |
| navigation          | router.spec.js, tab-state.spec.js                                                                                                                                                                                                                                                |
| app-shell / misc    | dashboard-view-model.spec.js, dashboard-preferences.spec.js, circuit-lookup.spec.js, live-region.spec.js, filing-descriptor.spec.js, types-contract.spec.js                                                                                                                      |
| app-shell / misc    | dashboard-view-model.spec.js, dashboard-preferences.spec.js, circuit-lookup.spec.js, live-region.spec.js, filing-descriptor.spec.js, types-contract.spec.js, field-kind-inference.spec.js, bar-number.spec.js, filing-capability-matrix.spec.js, security-source-audit.spec.js                                                                                                                      |

### tests/e2e by category and scope

| Category    | Scope                                             | Files                                                                                                                                                                                                                   |
| ----------- | ------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ui-visual   | all forms                                         | dashboard-visual.spec.ts, schedule-card-layout.spec.ts, page-structure.spec.ts, form-field-labels.spec.ts, signature-style-removal.spec.ts, guided-tour-navigation.spec.ts                                              |
| form-data   | guardian                                          | guardian-inventory-mount.spec.ts, verified-inventory-workflow.spec.ts                                                                                                                                                   |
| form-data   | simplified                                        | simplified-mount.spec.ts                                                                                                                                                                                                |
| form-data   | annual                                            | annual-mount.spec.ts, annual-field-formatting.spec.ts, annual-schedule-consistency.spec.ts                                                                                                                              |
| form-data   | planSimplified                                    | plan-simplified-mount.spec.ts                                                                                                                                                                                           |
| form-data   | planSimplified/planAnnual/planInitial/planMinor/simplified/annual | signature-capture.contract.spec.ts (Milestone 39-B pilot, Milestone 39-C rollout)                                                                                                                              |
| form-data   | planAnnual                                        | plan-annual-mount.spec.ts                                                                                                                                                                                               |
| form-data   | planInitial                                       | plan-initial-mount.spec.ts                                                                                                                                                                                              |
| form-data   | planAnnual/planInitial                            | plan-benefits-tristate.spec.ts                                                                                                                                                                                          |
| form-data   | planMinor                                         | plan-minor-mount.spec.ts                                                                                                                                                                                                |
| form-data   | all forms                                         | form-entry-ux.spec.ts, form-entry.contract.spec.ts, guardianship-selection-controls.spec.ts, date-validation.contract.spec.ts (filing-capability-matrix.spec.ts moved to tests/unit, Milestone 43G)                     |
| form-data   | planSimplified/planAnnual/planInitial/planMinor   | plan-readiness.contract.spec.ts                                                                                                                                                                                         |
| form-data   | all forms                                         | readiness-card.contract.spec.ts (Milestone 38B/44C, nine filing keys)                                                                                                                                                  |
| navigation  | all forms                                         | navigation-status.contract.spec.ts, filing-identity.contract.spec.ts, routes.spec.ts                                                                                                                                    |
| pdf-export  | all forms                                         | pdf-accessibility-and-signatures.spec.ts, pdf-fonts-and-xmp.spec.ts, pdf-structure-tags.spec.ts, pdf-table-semantics.spec.ts, pdf-preview-viewer.spec.ts, attestation-layout.spec.ts, output-semantics.artifact.spec.ts |
| pdf-export  | guardian + annual/finalAccounting/trustAccounting | pdf-form-specific.spec.ts, supplemental-pdf-accounting.spec.ts                                                                                                                                                          |
| pdf-export  | planSimplified/planAnnual/planInitial/planMinor   | plan-pdf-wcag-compliance.spec.ts                                                                                                                                                                                        |
| pdf-export  | planSimplified                                    | pdf-annotate.spec.ts (Milestone 39-A pilot)                                                                                                                                                                             |
| persistence | app-shell                                         | case-file-protection.spec.ts, case-file-roundtrip.spec.ts, backup-restore-sav.spec.ts, dashboard-backup.spec.ts, recovery-cache.spec.ts, persistence-recovery.contract.spec.ts, ward-lock.spec.ts, save-pipeline-boot.spec.ts |
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
