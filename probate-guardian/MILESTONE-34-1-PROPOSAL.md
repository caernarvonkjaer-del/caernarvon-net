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
