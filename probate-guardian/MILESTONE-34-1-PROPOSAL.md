# Milestone 34-1: Follow-On Bug-Correction Plan

## Status

**Proposal only.** No product-code or test-code change is authorized until
this plan is reviewed and approved. Split out of `MILESTONE-34-PROPOSAL.md`
(2026-09-09) so that document could stay scoped to its actual, ready-to-
implement web-mode chunk-load-failure test; this plan is a separate, larger,
speculative initiative and was never part of Milestone 34's own scope even
before the split — Milestone 34's own text says explicitly that these items
"do not expand Milestone 34's implementation scope" and "require a later
milestone or an explicitly approved scope change."

## Background

Recorded here for sequencing after a browser review identified additional
print-preview and filing-quality issues, separate from the distribution-
target test-coverage work in `MILESTONE-34-PROPOSAL.md`.

## Follow-On Bug-Correction Plan

Split into five lettered sub-milestones so each can be scoped, executed, and
marked complete independently rather than as one 14+ item omnibus — see
"Recommended Order and Dependencies" below for how they sequence against
each other. Still one document; these are not separate proposal files.

### Milestone 34-1A: Validation & Export Gating

**Status: Proposal only, not started.**

1. **Make readiness status reflect export eligibility.**
   Audit the shared `prepareFilingOutput()` boundary and each plan readiness
   panel. The preview banner must not say `Ready to export` while an automatic
   readiness check is outstanding or while a required manual filing action is
   still unresolved. Keep manual reminders visibly distinct from machine-
   verifiable blockers, but use unambiguous status text and button gating.
   Add contract tests for: no issues, automatic issue, supplemental issue,
   and manual-only reminder.
   *Implementation note:* export gating must stay scoped to genuine
   machine-verifiable blockers. Preparers routinely share draft PDFs for
   interim review (with attorneys, clients, banks) before every manual
   filing action is resolved — hard-blocking export on an unresolved manual
   reminder (e.g. "attach the physician's statement") would break that
   workflow. The distinct-manual-vs-blocking language above already reflects
   this; don't let the eventual fix collapse the two into one blocking list.

2. **Validate annual filing periods and related dates.**
   Add shared date rules for ordering, one-day annual periods, and dates that
   fall outside the relevant accounting/reporting period. Apply them to
   Annual, Final, Trust, Simplified Annual Accounting, and the annual Plan
   variants where the rule is applicable. Add boundary tests for same-day,
   reversed, just-under-one-year, valid annual, and out-of-period service
   dates. Ensure errors flow through the existing field-path/highlight system.
   *Implementation note:* Final/Trust/first-year accountings can legitimately
   cover irregular, non-annual-length periods (e.g. a short final period
   between a ward's death and discharge, or a partial first year from
   inception). The rule must check *ordering* (period-to on/after period-
   from) and *exact same-day rejection*, never a fixed "~365 days" duration
   requirement, or every legitimate short period gets falsely flagged.
   (This session's own research and draft implementation plan for this item
   already scope it this way — noted here so a future implementer doesn't
   accidentally tighten it further.)

3. **Audit validation-to-field mapping.**
   Verify that every new semantic error identifies the correct form field and
   does not regress the existing required-field contract. Test both live
   preview navigation and export blocking, including rapid date entry followed
   immediately by navigation.

### Milestone 34-1B: Shared PDF Engine Polish

**Status: Proposal only, not started.**

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
   *Implementation note:* assembling a multi-megabyte finalized PDF
   synchronously on every preview navigation risks frame drops or pager race
   conditions. Debounce/cache the finalized-PDF generation behind a single
   promise boundary, and test rapid tab-switching between form pages and
   print preview specifically.

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

### Milestone 34-1C: Filing & Form Semantics

**Status: Proposal only, not started.**

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
   *Implementation note:* existing `.sav` files store these as plain
   boolean `false`/`undefined`. Migrating to a real tri-state model must
   explicitly distinguish "legacy `false`" from "genuinely unanswered" on
   load via a schema-version-aware deserialization rule — a silent
   reinterpretation would surface a flood of new validation errors on
   previously-complete filings the moment an old save file is reopened.

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
    *Implementation note:* the authoritative source when filings disagree
    (ward record vs. case-file root vs. attorney record) isn't decided yet —
    needs an explicit precedence rule before implementation. Drift should
    surface as an advisory warning, never a silent overwrite of one filing's
    data from another's.

### Milestone 34-1D: Supplemental PDF Evidence Lab

**Status: Proposal only, not started.**

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

### Milestone 34-1E: Dashboard and Presentation Polish

**Status: Proposal only, not started.** Reported during this same review
round but orthogonal to 34-1A-D — these are UI/CSS presentation bugs in the
dashboard, print-preview chrome, and shared form-entry layout, not filing
validation or PDF-content correctness, so they carry no dependency on the
other four sub-milestones (see sequencing note below).

15. **Fix the dashboard triage table's responsive dead zone (~1101px-1380px)
    with container queries.** Root cause, confirmed directly against the
    code: `src/styles/dashboard.css`'s `@media (max-width: 1100px)` collapse
    breakpoint doesn't account for the fixed 272px sidebar + padding actually
    consuming viewport width — between ~1101px and ~1380px, the 8-column
    desktop grid (needing ~1042px minimum) overflows the ~765-1030px actually
    available, silently clipping the Assignment and Actions columns off-screen
    behind horizontal scroll. Fix: make `.dashboard-triage-queue` a CSS
    container (`container-type: inline-size; container-name: triage-queue`)
    and convert the two existing viewport-based collapse breakpoints to
    `@container triage-queue (max-width: 1040px)` (2-column card mode) and
    `@container triage-queue (max-width: 540px)` (1-column mobile mode), so
    the table responds to its own real rendered width regardless of sidebar
    state. Add `1280×800` and `1150×800` viewports to
    `dashboard-visual.spec.ts`'s existing viewport matrix, with assertions
    that `.dashboard-triage-assignee` and `.dashboard-triage-actions` stay
    fully visible and `scrollWidth <= clientWidth + 1` (no unintended
    horizontal scroll) at every viewport including the two new ones.

16. **Rename the triage table's "Assignment" column header to "Judge."**
    Copy-only change; check for any test asserting the literal old header
    text before renaming.

17. **Reorganize the Print Preview toolbar's navigation controls.** Move the
    Prev/Next buttons next to the page-count control (currently on a
    separate part of the toolbar), and group "All Filings," the theme
    toggle, and the help button together, flush right, on the same row.

18. **Simplify the date-field format hint text globally.** Every date input
    currently shows "Use MM/DD/YYYY or YYYY-MM-DD" beneath it. Drop the "or
    YYYY-MM-DD" half so the hint just reads "Use MM/DD/YYYY," across every
    date field in every filing type — almost certainly one shared render
    helper per feature (each `dateInput()`-style function), not a per-field
    edit.

19. **Fix required-field asterisk wrapping, inconsistent label spacing, and
    row misalignment in multi-column schedule rows, app-wide.** Root-caused
    via direct code read, not guessed:
    - The asterisk wrap is caused by `forms.css:178-180`'s
      `.row.g-2:has(> [class*="col-"] ~ [class*="col-"]) > [class*="col-"] .form-label{min-height:2.15em;display:inline-flex;align-items:flex-start;flex-wrap:wrap;}`
      — a prior fix attempt (commit `b3a7489`) that turns each label's text
      and its `<span class="req">*</span>` into two separate flex items with
      no `white-space:nowrap` on `.req` (`forms.css:18`) and no shared
      wrapper keeping them together, so flexbox's line-wrapping (decided on
      each item's un-shrunk max-content width, before any text reflow) can
      push the bare `*` to its own line even when there's visible room,
      since the label text itself isn't allowed to wrap first.
    - The inconsistent label/input spacing comes from that same rule's
      blanket `min-height:2.15em` applying to every label in any row with
      2+ Bootstrap columns (regardless of whether that label's text actually
      needs two lines) while single-column rows in the same card skip the
      rule entirely — short labels get padded with dead space up to the
      reserved height, while the one-column row sits flush.
    - Row misalignment has two causes: (a) when a label's real rendered
      height exceeds the guessed `2.15em` (long text, or the asterisk-wrap
      bug above), rows grow unevenly since the rule isn't applied uniformly
      to every row in a card to begin with; (b) `numInput()`'s `$`/`%`-
      wrapped fields use Bootstrap's `.input-group`, whose `.input-group-text`
      affix keeps Bootstrap's default `1rem` font-size while `forms.css:21`
      overrides only `.form-control` to `.88rem` — the taller affix
      stretches the whole `.input-group` (via `align-items:stretch`)
      noticeably taller than an adjacent bare `textInput()`/`calcInput()`
      column in the same row.
    - **Blast radius: app-wide, not Guardian-specific.** The identical
      `class="form-label"` + glued `<span class="req">` markup is
      reproduced by the shared `src/core/form/form-fields.js` renderer used
      by all 9 filing types, and hand-rolled directly (bypassing every
      helper) in at least one spot (`plan-annual/index.js:218`). Because the
      CSS rule keys off the shared `class="form-label"`/`.row.g-2` markup
      regardless of which code path produced it, a CSS-level fix (rather
      than touching each JS helper individually) reaches every filing type
      in one pass; `tests/e2e/schedule-card-layout.spec.ts` already
      exercises this shared `entry-card`/`.row.g-2` scaffold across
      Guardian, Annual, and the Plan types and is the natural place to
      extend for a visual-regression check.
    - Proposed fix direction: keep label text and its required-marker in
      one non-splitting unit (e.g. `${text}${reqMark}` inside a single inner
      span, or `white-space:nowrap` scoped to just the tail), size row label
      height to the tallest *actual* rendered label rather than a fixed
      guess, and align `.input-group-text`'s font-size with
      `.form-control`'s `.88rem` override.

## Explicitly Deferred Preferences

The following are useful product ideas, but are not bugs to implement in the
correction plan without a product decision: masked preview mode for SSN/EIN,
duplicate-name drift warnings, `None reported` in empty schedules, export
button regrouping, zoom/fit controls, wording polish such as `an Annual
Accounting`, and expanded `/s/` signature guidance. They may become separate
UX proposals after the defect work is prioritized.

## Recommended Order and Dependencies

Implement 34-1A first because its validation and export-status contracts
control whether later PDF and filing-specific fixes can be trusted. Implement
34-1B next because the footer, pagination, header, and address helpers are
shared across all filing families. Implement 34-1C after the shared
contracts stabilize. 34-1D begins with evidence collection and should not
be converted into product changes until the affected artifacts are available.
34-1E (dashboard/print-preview-chrome/form-CSS presentation) has no
dependency on the other four — it touches neither filing validation nor
PDF-content generation — so it can be sequenced independently, whenever it's
convenient, rather than waiting in the A→D chain.

Each follow-on sub-milestone should include focused unit/contract tests, the
affected filing-specific E2E coverage, and a final `source` plus `web`
execution-profile run where the changed surface is exercised.
