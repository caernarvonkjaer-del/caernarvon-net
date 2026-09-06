# Milestone 22: Global Signature Standardization and Responsive Record Cards

## Goal

Complete the unfinished global consistency work across all seven filing form families:

1. Remove every user-facing `Use /s/ format` / typed-versus-script signature control.
2. Standardize normal generated signatures to typed `/s/ Name` output.
3. Retain a narrowly scoped, internal wet-signature capability only where a filing workflow explicitly requires a blank physical signature line.
4. Convert repeatable record cards to Bootstrap responsive grids appropriate to each card's field density.
5. Prove desktop, mobile, PDF, accessibility, and saved-data compatibility with cross-form regression coverage.

## Why This Is Needed

Milestone 21 introduced card-level `/s/` switches. The product decision is now to remove that choice globally. The switches currently remain in all feature families and their PDF models, so the application can still vary output based on saved `useSlashS` values.

This milestone supersedes the card-level `/s/` switch requirements in Milestone 21, Slice 21C. The prior signature, address, attachment, and accessibility requirements remain in force unless this proposal explicitly replaces them.

The recent Guardian Inventory implementation correctly uses Bootstrap `row g-3` and `col-12 col-lg-6` wrappers for repeatable schedule cards. Other feature families still render repeated `.entry-card` elements as direct full-width siblings. A blanket half-width rule would make dense accounting records cramped; layout must be selected by field density, not by CSS coincidence.

## Non-Negotiables

1. **No visible signature-style setting**: no `Use /s/ format`, typed/script selector, or equivalent control remains in any form.
2. **Legacy saved files remain usable**: old `useSlashS` values may remain in stored data but must be ignored by UI and normal PDF rendering.
3. **Defined wet-signature authority**: only an explicit form/workflow-level `wetSignature: true` instruction, set outside legacy saved preferences, may produce a blank physical signature line. No UI control and no legacy `useSlashS` value may create or imply it.
4. **Bootstrap owns repeatable-card responsiveness**: use `.row` plus `.col-*` markup, not custom float, inline-block, or direct-card width rules.
5. **Readable at every breakpoint**: no horizontal overflow, clipped labels, or unusably narrow fields at the effective content width beside the application sidebar.
6. **Preserve structural accessibility**: wrappers must not create skipped headings, unnamed controls, broken label associations, or illogical tab order.
7. **Universal feature coverage**: Guardian Inventory, Annual Accounting, Simplified Accounting, Annual Plan, Initial Plan, Minor Plan, and Simplified Annual Plan are in scope.
8. **Dashboard exclusion**: shared `.schedule-page` styling or markup must not alter dashboard layout; dashboard cards are outside this rollout.

## Renderer Inventory and Layout Categories

Before each implementation slice, catalog every `.entry-card` renderer in the target feature and classify it. Do not apply a mechanical search-and-replace.

| Category | Required layout | Examples |
| --- | --- | --- |
| Compact repeated record | `row g-3` with `col-12 col-lg-6` per card | Guardian Inventory A-1 through C-5; short address or recipient records |
| Dense repeated accounting record | `row g-3` with `col-12 col-xxl-6` only after field-width validation; otherwise `col-12` | Annual Accounting schedules with five or more fields in a row |
| Narrative or directive record | Usually `col-12`; use two columns only if the expanded content remains readable | Advance directives, long descriptions, conditional question records |
| Intentional singleton | Constrained Bootstrap column or full width based on content; never treated as a repeated record | Surety Bond Details, totals, declarations, signature panels |
| Existing explicit grid | Retain and normalize only if necessary | Guardian attestation, witness, and service-recipient grids |

Every repeated-card wrapper must keep totals, supporting documents, and page navigation outside the grid.

The renderer inventory is a required implementation artifact. Before code conversion, record each renderer, route, category, chosen Bootstrap columns, justification, and regression test. The inventory must include each `.entry-card` owner across all seven form families and state why every excluded singleton remains excluded.

## Implementation Slices

### Slice 22A: Signature Compatibility Contract

1. Define the normal signature contract in `src/core/pdf/pdf-engine.js`:
   - Default filing signatures render `/s/ <typed name>`.
   - The presentation must not depend on `useSlashS`.
   - A blank physical line is rendered only when the model deliberately sends `wetSignature: true` for a workflow that requires it.
2. Do not remove legacy `useSlashS` properties from saved data during load or export. Treat them as obsolete input that has no effect.
3. Update every feature PDF model to stop deriving `wetSignature` or output style from `useSlashS`.
4. Document the compatibility behavior in the relevant PDF architecture documentation.
5. Identify and document the only permitted code paths that may set `wetSignature: true`; reject all others during code review.

### Slice 22B: Remove Signature-Style UI

Remove the switch markup and associated UI state from:

- `guardian-inventory`
- `annual-accounting`
- `simplified-accounting`
- `plan-annual`
- `plan-initial`
- `plan-minor`
- `plan-simplified`

Also remove dead local variables such as `slashSlider`, `useSlashS`, and `*_useSlashS` reads where they serve only the retired control. Do not remove fields required for a separate explicit wet-signature workflow without first identifying that workflow.

### Slice 22C: Responsive Card Conversion by Feature Family

1. **Guardian Inventory**
   - Retain the current Bootstrap schedule grid for A-1 through C-5.
   - Audit D-section repeaters and preserve the intentional Surety Bond Details singleton width.
2. **Annual Accounting**
   - Inventory Schedule A, B-1 through B-4, C, D-1 through D-5, E, F-1, F-2, remuneration, recipients, and signature records.
   - Start dense schedule cards at `col-12`; promote to `col-xxl-6` only where the card's widest field rows remain usable.
3. **Simplified Accounting**
   - Convert repeatable remuneration and recipient records where not already wrapped in a Bootstrap row.
4. **Annual Plan**
   - Convert repeatable residence, provider, and directive cards.
   - Keep long directive and conditional-question content full-width unless screenshot validation proves a two-column layout is clear.
5. **Initial Plan**
   - Convert provider and advance-directive repeaters using the same density decision.
6. **Minor Plan**
   - Convert residence and provider repeaters.
7. **Simplified Annual Plan**
   - Inventory every repeated record before modifying it; convert only records that satisfy the compact or dense categories.

For every affected renderer, use a local helper or consistent template shape such as:

```html
<div class="row g-3 schedule-entry-grid">
  <div class="col-12 col-lg-6">
    <div class="entry-card h-100">...</div>
  </div>
</div>
```

Use `col-xxl-6` rather than `col-lg-6` when a dense card needs the full main-content width at ordinary desktop sizes.

Choose breakpoints from measured usable content width, not viewport width alone. Validate at the supported desktop viewport sizes with the application sidebar present; a card may move to two columns only when its longest labels, action buttons, and practical input fields remain readable without overflow. Record the resulting breakpoint choice in the renderer inventory.

### Slice 22D: Selector and Event-Flow Audit

1. Search for selectors that assume direct-card structure, especially `.schedule-page > .entry-card`.
2. Update tests and CSS to target stable wrappers such as `.schedule-entry-grid > [class*="col-"] > .entry-card` where needed.
3. Verify event delegation still reaches add, duplicate, remove, conditional-field, and auto-save controls after the wrapper is inserted.
4. Check that empty-state, totals, supporting-documents, and page-navigation markup remain outside the card grid and in logical DOM order.

### Slice 22E: Cross-Form Regression Coverage

Create a cross-form layout regression suite with two populated records for every grid-eligible renderer. It must assert:

1. **Desktop geometry**: eligible two-column cards have two distinct horizontal positions at their chosen breakpoint.
2. **Mobile geometry**: the same cards share a single horizontal position below their chosen breakpoint.
3. **Field usability**: no horizontal page overflow; labels, fields, and action buttons remain inside their card bounds; dense cards meet a defined minimum practical field width.
4. **Intentional full-width records**: dense and narrative cards that remain `col-12` do not regress to an arbitrary half-width layout.
6. **Signature UI absence**: every form route has zero controls or visible text for `Use /s/ format`.
7. **Legacy file behavior**: a fixture containing `useSlashS: false` still renders the normal typed `/s/` signature in UI-derived PDFs.
8. **Explicit wet signature**: the documented permitted `wetSignature: true` fixture still renders a blank signature line and `Signature of <typed name>` label.
9. **Accessibility**: rerun accessible-name, landmark, heading-hierarchy, and keyboard-navigation checks after structural wrappers are introduced.

### Slice 22F: Visual and Release Validation

1. Capture desktop and mobile screenshots for representative compact, dense, narrative, and singleton card categories.
2. Run focused feature tests after each family conversion before moving to the next family.
3. Run the complete mount suite for all seven forms.
4. Run PDF/accessibility/signature suites and all unit tests.
5. Run production builds and inspect `git diff --check` before release.
6. Commit in logical units:
   - signature contract and UI removal;
   - accounting-card conversion;
   - plan-card conversion;
   - regression coverage and final documentation.

## Acceptance Criteria

1. Repository search finds no visible signature-style controls or PDF-model decisions driven by `useSlashS`.
2. A legacy fixture with `useSlashS: false` produces the same normal typed-signature PDF as a fixture without that property.
3. Only documented workflow-level code paths can produce `wetSignature: true`; legacy values and UI state cannot affect it.
4. Each repeated-card renderer is cataloged in the completed renderer inventory and assigned an intentional Bootstrap layout category, columns, route, and regression test.
5. Every grid-eligible renderer uses Bootstrap rows and responsive columns, with no global direct-card sizing workaround or dashboard regression.
6. All seven form families have responsive layout coverage, not just mount coverage.
7. Representative desktop and mobile screenshots have no overflow, clipping, overlapping content, or cramped field controls at measured content widths.
8. Existing PDF attachment, signature-label, address-format, accessibility, and form-mount regression suites remain green.

## Out of Scope

- Redesigning field labels or changing court-form data requirements.
- Migrating or rewriting existing saved ward data solely to remove obsolete `useSlashS` keys.
- Converting single-purpose summaries, declarations, totals, or signature panels into two-column cards without a separate usability decision.