# Milestone 35: Candidate Item List

## Status

**Draft — candidate list only, not yet scoped or approved for execution.**
This document collects everything left flagged-but-unaddressed by the
Milestone 34 series (34, 34-1, 34-2) so it isn't lost. None of these items
have been researched against the current codebase the way 34-1's items were
before that plan became execute-ready — treat every item below as a
starting point for scoping, not a ready-to-implement spec. Nothing here is
authorized for implementation until an item (or subset) is pulled out,
researched, and explicitly approved the way 34-1 was.

This list does not include a sweep of older milestones (14-33) for
still-open deferred items — those were each closed out in their own era and
are out of scope for this pass unless requested separately.

## Candidate Items

### 1. Simplified Accounting `guardians[]` schema drift + Excel hardcap (real bug)

Found during the Milestone 34-2 data-model audit, documented but explicitly
not fixed there (outside that milestone's documentation-only scope):

- Simplified Accounting's "Add Co-Guardian" button pushes a row shaped for
  Annual Accounting (`officeStreet`/`officeCityStateZip`) into a collection
  that Simplified's own rendering/validation code reads as
  `residenceStreet`/`residenceCityStateZip`.
- `simplified-accounting/excel.js` hardcodes exactly 3 guardian slots, so a
  4th+ co-guardian is invisible to Excel export/import even though it prints
  correctly in the PDF.
- Documented in `probate-guardian-data-model.csv`'s
  `simplified_accounting.guardians[]` row notes and in
  `MILESTONE-34-2-PROPOSAL.md`'s closing section.
- Source: the shared row factory vs. Simplified's own field-name
  expectations; needs a decision on whether to fix the factory output, fix
  Simplified's reader, or reconcile both, plus an Excel-export fix to
  support more than 3 guardians.

### 2. Close out 34-1C's pending full regression verification

`MILESTONE-34-1-PROPOSAL.md` records 34-1C (items 8-11: co-guardian
suppression, tri-state checkboxes, Trust/Final copy separation, cross-filing
county drift) as "implemented; focused verification complete, full
regression verification pending." This isn't new scope — it's finishing the
verification 34-1C itself calls for before that sub-milestone can be
considered fully closed.

### 3-9. Explicitly deferred product-decision items (from 34-1's "Explicitly Deferred Preferences")

None of these are bugs; each needs a product decision before it becomes
real milestone scope. Carried forward verbatim from
`MILESTONE-34-1-PROPOSAL.md`:

3. Masked preview mode for SSN/EIN fields.
4. Duplicate-name drift warnings (e.g., two wards/parties with the same
   name across filings).
5. `None reported` placeholder text in empty schedules, in place of a blank
   table.
6. Export button regrouping (layout/IA decision, not a defect).
7. Zoom/fit controls in the PDF preview (confirmed fully absent today —
   no scale state, no UI, hardcoded `scale = 1.5` in `pdf-preview.js`).
8. Wording polish such as "an Annual Accounting" grammar throughout.
9. Expanded `/s/` electronic-signature guidance/copy.

### 10. Downloads delivery-copy refresh for the data-model CSV (optional, low priority)

`DATA-MODEL-REMEDIATION-PLAN.md`'s checklist still has this unchecked: a
contributor's Downloads-directory copy of `probate-guardian-data-model.csv`
may be refreshed on request, but none has been requested. Not a repository
acceptance criterion either way. Only relevant if someone actually asks for
a refreshed copy.

## Next Step

Pick which of the above (if any) should become this milestone's real scope,
then research each chosen item against the current codebase before writing
an execute-ready plan — the same discipline `MILESTONE-34-1-PROPOSAL.md`
went through before it was approved.
