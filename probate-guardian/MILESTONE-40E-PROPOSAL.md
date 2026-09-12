# Milestone 40E: Fix PDF Table Address Wrapping

## Status

**Draft only — independently approved delivery.** This proposal authorizes
no runtime, data-model, test, or documentation change until the requester
approves Milestone 40E specifically. Approval of another Milestone 40
delivery does not authorize this work.

## Goal

Stop Certificate of Service recipient addresses (and any other multi-part
address rendered inside a PDF table cell) from overflowing into the page
margin. Each address component should fall on its own line inside the
cell, not spill past the column boundary.

## Background

Reported directly against a live Annual Accounting export (Part X —
Guardian Attorney Certificate of Service): the "Address Details" column
renders `100 2nd Ave S, Suite 400, St. Petersburg, FL 33701` as one
unwrapped line that runs off the right edge of the page, instead of three
separate lines (`100 2nd Ave S,` / `Suite 400,` / `St. Petersburg, FL
33701`) each fully inside the cell. The requester reports this same shape
of bug recurring, and checking the code confirms it: this is not one bad
cell, it's at least two independently-implemented, inconsistent join
patterns feeding the same PDF table renderer:

- `src/features/annual-accounting/pdf-model.js:964` —
  `[r.line2, r.line3, r.line4].filter(Boolean).join(', ')`: comma-joins
  all three optional address lines into a single string before it ever
  reaches the table cell.
- `src/features/simplified-accounting/pdf-model.js:261` —
  `` `${r.line2 || ''} ${r.line3 || ''}`.trim() ``: space-joins only two
  of the three lines and **silently drops `line4` entirely** — a
  data-loss bug in the rendered output, separate from and worse than the
  wrapping bug, for any Simplified Accounting recipient whose address
  actually needs a fourth line.

The table cell renderer itself (`src/core/pdf/pdf-engine.js`, around line
1162) already calls `doc.splitTextToSize(String(cellData), usableW)` to
wrap cell text to the column's available width, and `colWidths` are
percentages of content width (`pdf-engine.js:1016`), not fixed points — so
the renderer is not obviously starved for width. The most likely fix is
structural, not cosmetic: build the cell value as one line per address
component (newline-joined) rather than one comma/space-joined string, so
each entered line reflows independently and matches the corrected example
the requester provided — but confirm this against the renderer's actual
newline handling before assuming it, rather than guessing at the exact
mechanism here.

## Decisions / Implementation

1. Add a multi-line counterpart to `composePdfAddress()` in
   `src/core/pdf/address-format.js` (e.g. `composePdfAddressLines()`)
   that returns one line per non-blank component instead of a single
   comma-joined string, and confirm exactly how `pdf-engine.js`'s table
   cell rendering must receive it (a `\n`-joined string, or an array of
   lines) to actually produce one address component per rendered line.
2. Replace both ad hoc joins above with the shared helper. Fix Simplified
   Accounting's dropped `line4` as part of the same change, not as a
   separate follow-up.
3. **Audit, don't assume, the rest of the surface.** Search every
   `pdf-model.js` for a table cell built from more than one address-like
   field (street/suite/city-state-zip, or any `line2`/`line3`/`line4`
   pattern) and confirm each one either already wraps correctly or gets
   the same fix. Do not declare this done after fixing only the two
   confirmed call sites above without checking the rest.
4. Confirm the fix at more than one column width and content length —
   including a recipient name/address long enough to need wrapping in the
   *other* columns of the same table, and a case with only one address
   line (no regression to the common, short-address case).

## Acceptance Criteria

| Scenario | Expected result |
| --- | --- |
| Annual Accounting Certificate of Service, 3-line recipient address | Renders as three separate lines, fully inside the column, no overflow into the margin. |
| Simplified Accounting Certificate of Service, 3-line recipient address | Same — and `line4` is no longer silently dropped. |
| Recipient with only one address line | Renders on one line, unchanged from today's short-address behavior. |
| Any other `pdf-model.js` table cell built from multiple address-like fields (found during the audit) | Either already correct, or fixed the same way — not left inconsistent. |
| Long recipient name in the adjacent column, same row | Still wraps correctly; the address-line fix doesn't regress other columns. |

## Verification

Add or extend a unit test for `composePdfAddressLines()` covering
blank/partial components and the exact reported case (3 lines, none
dropped). Add or extend PDF-output coverage (existing
`tests/e2e/pdf-structure-tags.spec.ts` / `pdf-form-specific.spec.ts`
style) asserting a multi-line recipient address renders as separate lines
fully inside the column, for both Annual and Simplified Accounting. This
is a narrow, self-contained rendering fix; it does not need a
full-regression recommendation on its own.
