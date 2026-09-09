# Milestone 34: Distribution-Target Failure-Mode Coverage

## Status

**Proposal only.** No test-file change or product-code change is authorized
until this plan is reviewed and approved. This document holds the first
piece of what may grow into a small set of distribution-target-specific
failure-mode tests; only the piece below is scoped so far.

## Goal

Add the web-mode (`dist/web`, `PG_TARGET=web`) equivalent of
`feature-load-failure.spec.ts`'s chunk-load-failure test, closing the one
gap Milestone 33's Phase 5 flagged rather than papered over: the "hosted
parity" execution profile's own scope table names "chunk-load failure," but
no test for that exists under the `web` target today — only under `source`.

## Background

`feature-load-failure.spec.ts` (landed under an earlier milestone) proves
that a feature chunk failing to load shows a "This section could not be
loaded" message with a working Reload action, instead of a silent blank
view. It works by intercepting a literal, stable path:
```js
await page.route('**/src/features/dashboard/index.js', async route => {
  await route.abort('failed');
});
```
This is explicitly `source`-only
(`skipEnvironmentLimitation(!sourceTarget, 'The source target exposes a
stable unbundled chunk URL for failure injection')`) because `source` serves
unbundled ES modules directly by their real path. `dist/web`'s Vite build
hashes every chunk filename (confirmed: the dashboard chunk built as
`assets/dashboard-lbmMcAnk.js` in a recent build; the hash changes on every
rebuild), so the same literal route glob cannot survive past the build that
produced it.

Two things were confirmed while scoping this milestone, so implementation
doesn't have to rediscover them:

1. **Chunk selection must be manifest-driven.** Do not treat the
   `dashboard-*.js` basename as a Vite/Rollup contract. Read the generated
   dashboard chunk URL from `dist/web/sw.js`'s `PRECACHE_MANIFEST` (or another
   generated build manifest with the same authoritative URL), assert that
   exactly one dashboard candidate is found, and register the route against
   that exact URL. A basename glob may be used only as a diagnostic fallback,
   never as the acceptance path; it must also assert exactly one candidate.
2. **The dashboard chunk is precached at `"offline"` tier, not `"critical"`**
   — confirmed directly by inspecting `dist/web/sw.js`'s generated
   `PRECACHE_MANIFEST` (built by `scripts/generate-service-worker.mjs`):
   `{"url":"./assets/dashboard-lbmMcAnk.js", ..., "tier":"offline", ...}`.
   The "critical" tier is installed synchronously on first load
   (`offline.spec.ts`'s "first load installs the atomic critical shell"
   test); "offline" tier entries are only fetched into the cache when the
   user explicitly triggers `DOWNLOAD_OFFLINE_PACK` (`offline.spec.ts`'s
   "ready offline pack" tests). That means on a **fresh session that has
   never downloaded the offline pack**, a request for the dashboard chunk
   should still be a genuine network request Playwright can intercept — the
   same shape as the `source` test, just against a hashed URL. This needs to
   be verified against the service worker's actual fetch handler (the
   generated `dist/web/sw.js`, and the template `generate-service-worker.mjs`
   fills in) rather than assumed. Before the dashboard import, the test must
   prove that the page is not already controlled by a service worker.
   Playwright routing is not assumed to intercept requests already handled by
   a controlling service worker, and page code cannot patch the service
   worker's global `fetch`. If a fresh uncontrolled page cannot provide a
   reliable interception point, use a separate Playwright context configured
   with `serviceWorkers: 'block'`, and document why that context still
   exercises the generated hosted `dist/web` build. Do not use an in-page
   service-worker-fetch interception fallback.

## Non-Negotiables

Carried forward from Milestone 33, since this is the same test suite under
the same constraints:

1. Preserve existing product behavior — this milestone strengthens test
   coverage, it does not change the chunk-load-failure UX itself.
2. Keep `workers: 1`.
3. Retain `feature-load-failure.spec.ts`'s existing `source`-only test
   unchanged; this adds a `web`-mode sibling, it does not replace or rename
   the existing spec.
4. No image-snapshot testing as a substitute for the semantic assertion
   (the "could not be loaded" message and Reload action, same as the
   existing test).

## Proposed Approach

Add a new test to `feature-load-failure.spec.ts` (or a `web`-scoped sibling
file, if keeping the two target-specific tests in one `describe` makes the
skip/target split clearer — decide at implementation time by which reads
better once both are written) that:

1. Skips via `skipExpectedTargetExclusion(currentTarget !== 'web', ...)`
   (the mirror image of the existing test's `source`-only guard).
2. Creates a ward and, on a **fresh session** (no offline pack downloaded —
   the default state `freshStartNoPassword()` already produces), reads the
   dashboard chunk URL from the generated manifest, asserts exactly one
   dashboard candidate, routes that exact built URL to abort, then navigates
   to `/dashboard`.
3. Asserts the same "This section could not be loaded" message and working
   Reload action the `source` test already asserts, proving the failure-mode
   UX itself is shared/target-agnostic product code (per the two-phase
   commit / shared-mechanism pattern this whole test suite already leans on
   for `web`/`source`/`portable` parity elsewhere) — this test is about
   proving the *test infrastructure* can inject the failure under `web`,
   not about the UX differing by target.
4. If point 2 above (offline-tier caching interaction) turns out to block
   simple network-level interception, document the actual mechanism found
   and adjust the interception approach accordingly — do not weaken the
   assertion to something that would pass regardless of whether the failure
   was genuinely injected.

## Acceptance Criteria

- A `web`-target chunk-load-failure test exists, passes for real against a
  freshly built `dist/web`, and is wired into
  `scripts/run-e2e-profile.mjs`'s `HOSTED_PARITY_SPECS` list (Milestone 33,
  Phase 5) so `npm run test:e2e:web` covers it going forward.
- `feature-load-failure.spec.ts`'s existing `source`-only test is untouched
  and still passes.
- `MILESTONE-33-PROPOSAL.md`'s "Outstanding task" note referencing this gap
  is updated to point at this milestone once it lands.
- Verified against the full Chromium `source` suite and the `web` profile,
  same discipline as every Milestone 33 step.

## Follow-On Bug-Correction Plan

The browser review identified additional print-preview and filing-quality
issues. They are recorded here for sequencing, but they do not expand
Milestone 34's implementation scope: Milestone 34 remains the web-target
chunk-load-failure test only. Product-code changes below require a later
milestone or an explicitly approved scope change.

### Phase A: Shared export and validation contracts

1. **Make readiness status reflect export eligibility.**
   Audit the shared `prepareFilingOutput()` boundary and each plan readiness
   panel. The preview banner must not say `Ready to export` while an automatic
   readiness check is outstanding or while a required manual filing action is
   still unresolved. Keep manual reminders visibly distinct from machine-
   verifiable blockers, but use unambiguous status text and button gating.
   Add contract tests for: no issues, automatic issue, supplemental issue,
   and manual-only reminder.

2. **Validate annual filing periods and related dates.**
   Add shared date rules for ordering, one-day annual periods, and dates that
   fall outside the relevant accounting/reporting period. Apply them to
   Annual, Final, Trust, Simplified Annual Accounting, and the annual Plan
   variants where the rule is applicable. Add boundary tests for same-day,
   reversed, just-under-one-year, valid annual, and out-of-period service
   dates. Ensure errors flow through the existing field-path/highlight system.

3. **Audit validation-to-field mapping.**
   Verify that every new semantic error identifies the correct form field and
   does not regress the existing required-field contract. Test both live
   preview navigation and export blocking, including rapid date entry followed
   immediately by navigation.

### Phase B: Shared PDF rendering correctness

4. **Remove duplicate accounting footer identity text.**
   Define one source of truth for the footer subtitle and ward name, then make
   the shared footer render each exactly once for Annual, Final, Trust, and
   Simplified Accounting. Add PDF text assertions for one, two, and three
   guardians and for every accounting filing descriptor.

5. **Make preview pagination derive from the finalized PDF.**
   Compare the page count rendered by pdf.js with the finalized PDF's page
   count and expose one shared count to the toolbar and footer contract. Add
   regression tests with and without supplemental pages. Include a test that
   re-renders the preview after navigation so stale pager DOM cannot survive a
   new PDF.

6. **Handle continuation-header titles without silent truncation.**
   Replace the current first-line-only behavior with a bounded, intentional
   layout: wrap within the header cell, shorten through a documented title
   policy, or move the full section title to a second line. Add a generated-PDF
   text/layout test using the longest section titles and long ward/case names.

7. **Normalize address composition at the PDF model boundary.**
   Centralize street/city-state-ZIP joining and whitespace/comma cleanup, then
   use it in all PDF models instead of ad hoc template interpolation. Preserve
   user-entered apartment/unit text and avoid changing unrelated free-form
   notes. Add unit tests for missing components, existing commas, compact
   `City FL ZIP` input, and multi-line addresses.

### Phase C: Filing-specific output and form semantics

8. **Suppress empty optional co-guardian/signature blocks.**
   Render optional co-guardian blocks only when the corresponding party has
   meaningful data; retain the required primary guardian block. Cover Initial,
   Annual, Minor, and Simplified Plans, with tests for zero, one, and multiple
   co-guardians.

9. **Make binary and multi-choice answers explicitly tri-state.**
   Audit plan checkboxes and validators so an unanswered question is distinct
   from `No`, and mutually exclusive choices cannot silently accept an
   incomplete answer. Update PDF output and readiness checks together. Add
   tests for unanswered, explicit No/none, one selected option, and conflicting
   options.

10. **Separate Trust and Final Accounting copy from Annual Accounting copy.**
    Audit descriptor-driven titles, audit-fee language, attorney
    certifications, headings, and metadata. Preserve shared calculations and
    rendering while supplying filing-specific copy where required. Add PDF
    text/metadata assertions proving Trust and Final output does not contain
    Annual-only wording.

11. **Detect cross-filing county drift.**
    Define the case-level source of truth for county and compare filings that
    share a case number. Report a warning or blocker according to filing
    policy, including attorney-county overrides. Add a multi-filing contract
    test covering matching counties, mismatched counties, and missing county
    data.

### Phase D: Supplemental documents and evidence-dependent UI findings

12. **Reproduce and classify garbled supplemental-document output.**
    Preserve the original affected PDF as a fixture if available, then compare
    source bytes, pdf.js extracted text, canvas rendering, and the finalized
    packet. Only after the failure boundary is known should validation reject
    the file, warn about OCR/encoding quality, or change rendering. Add a
    regression fixture test for the confirmed failure mode.

13. **Investigate Trust Accounting toolbar absence and page-count reports.**
    Capture the exact build, generated PDF, and preview DOM for each affected
    filing. Verify whether the issue is stale DOM, an async pager race, a
    finalized-PDF difference, or an older deployed build before changing the
    shared pager. Do not add a product fix based only on a screenshot or text
    extraction report.

14. **Collect layout evidence before changing visual behavior.**
    Dates splitting across lines, cramped Schedule B cells, clipped Question 5
    content, narrow labels, and missing zoom controls need representative PDFs,
    viewport dimensions, and an agreed layout threshold. After that evidence
    exists, add targeted PDF/layout tests rather than broad visual rewrites.

## Explicitly Deferred Preferences

The following are useful product ideas, but are not bugs to implement in the
correction plan without a product decision: masked preview mode for SSN/EIN,
duplicate-name drift warnings, `None reported` in empty schedules, export
button regrouping, zoom/fit controls, wording polish such as `an Annual
Accounting`, and expanded `/s/` signature guidance. They may become separate
UX proposals after the defect work is prioritized.

## Recommended Order and Dependencies

Implement Phase A first because its validation and export-status contracts
control whether later PDF and filing-specific fixes can be trusted. Implement
Phase B next because the footer, pagination, header, and address helpers are
shared across all filing families. Implement Phase C after the shared
contracts stabilize. Phase D begins with evidence collection and should not
be converted into product changes until the affected artifacts are available.

Each follow-on milestone should include focused unit/contract tests, the
affected filing-specific E2E coverage, and a final `source` plus `web`
execution-profile run where the changed surface is exercised.

## Documentation Status Addendum (2026-09-09)

This addendum tracks planning artifacts only; it does not change Milestone
34 implementation scope.

- Completed: Plan Annual wildcard dictionary rows expanded to exact
   `rights.*`, `adls.*`, and `benefits.*` field entries in
   `probate-guardian-data-model.csv`.
- Completed: Plan Initial wildcard dictionary rows expanded to exact `q3`,
   `q6`, `q7`, `adls`, `mental*`, `phys*`, `uses*`, `needs*`, `q9Providers[]`,
   `q11Directives[]`, and `planGuardians[]` field entries in
   `probate-guardian-data-model.csv`.
- Completed: Delivery copy refreshed to
   `C:\Users\clkmt07\Downloads\probate-guardian-data-model.csv`.
- Still pending (separate documentation scope): migration of the CSV to the
   canonical 20-column contract and execution of the stricter
   `(scope, storage_root, field_path, persistence_status)` uniqueness checker.

## Documentation-Only Data-Model Remediation

This section records the remaining schema work requested during the review.
It is documentation work only: it authorizes no product-code, test-code, or
runtime changes.

### Current Findings

- Initial Inventory is now represented through its scalar fields, collection
   references, and expanded A-1 through C-5 row fields in the companion CSV.
- Annual Plan and Initial Plan still need their wildcard entries expanded into
   exact persisted paths. The affected groups include checkbox fields,
   conditional explanations, certification fields, rights/ADL maps, directive
   rows, provider rows, and guardian signature rows.
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
7. Add provenance columns for `source_symbol`, `source_line`, `storage_root`,
   and `persistence_status` (`persisted`, `derived`, `runtime`, or
   `export-only`).

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
- The executable CSV checker defined in
   `DATA-MODEL-REMEDIATION-PLAN.md` is run against the canonical CSV, including
   its duplicate-key, wildcard-path, blank-path, and metadata-domain checks.
- The canonical CSV is `probate-guardian/probate-guardian-data-model.csv`.
   A delivery copy may be written to
   `C:\Users\clkmt07\Downloads\probate-guardian-data-model.csv`, but the
   external copy is not part of repository acceptance; when present, it should
   be refreshed from the canonical workspace CSV.
