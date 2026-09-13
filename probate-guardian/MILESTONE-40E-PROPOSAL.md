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
33701`) each fully inside the cell.

**This exact problem already has a working, shipped solution elsewhere in
the same file — the bug is that table cells never got it.** In
`src/core/pdf/pdf-engine.js`:

- `formatMailingAddress()` (line 437) takes a comma-joined address string
  and heuristically splits it back into sensible display lines (street
  [, suite], city, "state zip" — grouping the last two comma-segments
  together). It exists specifically to fix this class of overflow: the
  code comment right above its call site says so outright — "Wrap value
  text within the column so long addresses... don't overflow into the
  right margin."
- It's wired into the **signature-block field renderer** (line
  1503-1506): any `{label, value}` field whose label contains "address"
  gets `formatMailingAddress(value).flatMap(line =>
  doc.splitTextToSize(line, fieldMaxW))` instead of a single
  `splitTextToSize` call on the whole string. That's what correctly wraps
  the Attorney/Preparer/Guardian "Address:" line shown in the corrected
  example — this path is not the bug.
- **Table cells never received the equivalent treatment.** The table-cell
  measurer, `measureCell()` (line 1143), has no array/multi-line branch
  at all for a plain cell — its only two branches are `isMixedCell()`
  (an object with `main`/`sub`, used for a different two-tier text style)
  and a single-string fallback: `doc.splitTextToSize(String(cellData),
  usableW)` (line 1162). A cell value built by joining several address
  lines into one string, then handed to that single-string branch, gets
  exactly one pass of generic word-wrap — which is what's producing the
  overflow, not a width-calculation bug. (`colWidths` are percentages of
  content width, `pdf-engine.js:1016` — the renderer isn't starved for
  width; it's just never told where the real line breaks are.)

Two independently-implemented, inconsistent joins currently feed that
single-string branch:

- `src/features/annual-accounting/pdf-model.js:964` —
  `[r.line2, r.line3, r.line4].filter(Boolean).join(', ')`: comma-joins
  all three optional address lines into one string.
- `src/features/simplified-accounting/pdf-model.js:261` —
  `` `${r.line2 || ''} ${r.line3 || ''}`.trim() ``: space-joins only two
  of the three lines and **silently drops `line4` entirely** — a
  data-loss bug in the rendered output, separate from and worse than the
  wrapping bug, for any Simplified Accounting recipient whose address
  actually needs a fourth line.

Unlike the signature-block case, the certificate-of-service rows already
have their address in **discrete fields** (`r.line2`, `r.line3`,
`r.line4`) — there's no comma-string to reverse-engineer. That makes the
table-cell fix simpler than `formatMailingAddress()`'s own heuristic, not
harder: pass the already-known lines straight through as an array, and let
the renderer wrap each one to the column width, the same way
`formatMailingAddress()`'s output already does.

`drawCell()` (line 1166) needs no change to support this: its non-mixed
branch already does `doc.text(measured.lines, textX, yTop + 11, {
align })`, and jsPDF's `doc.text()` natively renders an array of strings
as one line each. Only `measureCell()`'s plain-cell branch needs to learn
that a cell value can be an array of pre-split lines, not only a single
string.

## Decisions / Implementation

1. In `pdf-engine.js`'s `measureCell()` (line ~1160-1163), add an array
   branch alongside the existing `isMixedCell()` and plain-string cases:
   when `Array.isArray(cellData)`, treat each element as one address
   line and compute `lines = cellData.flatMap(line =>
   doc.splitTextToSize(String(line), usableW))` — the same
   flatMap-over-pre-split-lines pattern `formatMailingAddress()`'s caller
   already uses, just inside the table-cell path instead of the
   signature-block path. No change needed to `drawCell()`.
2. Change both call sites to pass an array instead of a joined string:
   - `annual-accounting/pdf-model.js:964` →
     `[r.line2, r.line3, r.line4].filter(Boolean)` (drop the
     `.join(', ')`).
   - `simplified-accounting/pdf-model.js:261` →
     `[r.line2, r.line3, r.line4].filter(Boolean)` (drop the
     template-string join **and** add the currently-missing `r.line4`
     at the same time — this fixes the data-loss bug and the wrapping
     bug in one change).
   No new shared helper (e.g. a `composePdfAddressLines()` in
   `address-format.js`) is needed for this — these are already-discrete
   fields, and `.filter(Boolean)` is the entire transformation. Don't add
   one just for symmetry with `composePdfAddress()`; that function solves
   a different problem (reconstructing lines from an already-joined
   string) that doesn't apply here.
3. **Audit, don't assume, the rest of the surface.** Search every
   `pdf-model.js` for a `type: 'table'` cell built from more than one
   address-like field. Two categories to distinguish:
   - A cell already built from discrete fields, comma/space-joined into
     one string (this milestone's exact bug shape) — fix the same way:
     pass the array, drop the join.
   - A cell built from a single already-combined address string with no
     discrete fields available — that's `formatMailingAddress()`'s
     situation, not this one; if such a cell exists inside a table (not
     a signature-block field), it needs `formatMailingAddress(value)`
     applied before array-ifying, not a plain `.filter(Boolean)`.
   Confirm each one found is already correct or gets the matching fix.
   Do not declare this done after the two confirmed call sites above
   without checking the rest.
4. Confirm the fix at more than one column width and content length —
   including a recipient name/address long enough to need wrapping in
   the *other* columns of the same table, and a case with only one
   address line (no regression to the common, short-address case).
5. Confirm no other caller of `measureCell()`/the table renderer ever
   passes an array today expecting it to be stringified — grep for
   existing `type: 'table'` `rows` construction across every
   `pdf-model.js` before assuming the array branch is purely additive.

## Acceptance Criteria

| Scenario | Expected result |
| --- | --- |
| Annual Accounting Certificate of Service, 3-line recipient address | Renders as three separate lines, fully inside the column, no overflow into the margin. |
| Simplified Accounting Certificate of Service, 3-line recipient address | Same — and `line4` is no longer silently dropped. |
| Recipient with only one address line | Renders on one line, unchanged from today's short-address behavior. |
| A table cell elsewhere still passed as a plain string | Renders exactly as before — the array branch is additive, not a behavior change for existing string cells. |
| Any other `pdf-model.js` table cell built from multiple address-like fields (found during the audit) | Either already correct, or fixed the same way — not left inconsistent. |
| Long recipient name in the adjacent column, same row | Still wraps correctly; the address-line fix doesn't regress other columns. |

## Verification

Add or extend a unit test around `measureCell()`'s new array branch (or
the smallest testable seam around it) covering: an array of 1-3
non-blank lines wraps as expected; an existing plain-string cell is
unaffected; a line still too long for the column word-wraps within
itself via `splitTextToSize`, on top of the forced per-component break.
Add or extend PDF-output coverage (existing
`tests/e2e/pdf-structure-tags.spec.ts` / `pdf-form-specific.spec.ts`
style) asserting a multi-line recipient address renders as separate
lines fully inside the column, for both Annual and Simplified Accounting,
and that Simplified no longer drops `line4`. This is a narrow,
self-contained rendering fix; it does not need a full-regression
recommendation on its own.
