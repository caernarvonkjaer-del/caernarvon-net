# Milestone 40E: Fix PDF Table Address Wrapping

## Status

**Landed 2026-09-12.** Approved and implemented as specified, with two
additions the implementation pass found and the proposal had not
anticipated — both documented under "What landed" below.

### What landed

The fix itself is as designed: an array branch in `measureCell()`
(`pdf-engine.js`), and both certificate-of-service call sites passing
`[r.line2, r.line3, r.line4].filter(Boolean)` instead of a joined string.
`drawCell()` needed no change, as predicted.

The audit in step 3 confirmed the proposal's claim that these are the only
two such call sites — no third table cell anywhere builds an address from
multiple discrete fields.

**Superseded note (2026-09-13): Addition 1 below was deleted by Milestone 40A**,
which removed DOCX export entirely one commit later, taking `docx-engine.js` and
the two unit tests covering this fix with it. The fix was correct when made and
the reasoning still explains why a model change has to be checked against every
consumer — but it should not have been needed. `MILESTONE-40-PROPOSAL.md`'s
shared-file table listed `docx-engine.js` under 40A and 40C-1 only, giving no
signal that the file was about to be deleted; that row is now corrected. The PDF
half of this milestone is what actually fixed the reported overflow and stands
unchanged.

**Addition 1: `docx-engine.js` consumes the same model and had to be fixed
too.** This proposal only considered the PDF renderer, but
`docx-engine.js:710` reads the identical `block.rows` and its cell branch
ended in `xmlEscape(cell)`. `xmlEscape()` calls `String()`, and
`Array.prototype.toString` joins with **bare commas and no spaces** — so
array-ifying the cell would have silently made Word output *worse* than the
`', '` join it replaced (`100 2nd Ave S,Suite 400,St. Petersburg, FL 33701`).
The cell now emits one `<w:p>` per component, mirroring the PDF, with an
empty cell still emitting a single paragraph because a `<w:tc>` containing
no `<w:p>` is invalid OOXML and would make the file unopenable in Word
rather than merely look wrong. A grep confirmed `pdf-engine.js` and
`docx-engine.js` are the only two consumers of `block.rows`.

**Addition 2: Simplified Accounting dropped `line4` in two places, not
one.** This proposal identified the join at
`simplified-accounting/pdf-model.js:261`. The recipient *filter* at `:235`
omitted `line4` as well, so a recipient whose only populated field was
`line4` was dropped from the certificate of service **entirely** — no row at
all, rather than a truncated address. Annual's equivalent filter already
counted it. Both are fixed. Practical reach is narrow, since a recipient
almost always has a name and so survives the filter, but this is a court
filing's certification of who was served, so both halves are worth
correcting.

### How this was verified

`tests/unit/pdf-cert-service-address.spec.js` (9 tests) covers the model
side for both forms: the array shape, a one-line address, blank-component
filtering, `line4`'s presence, the only-`line4` recipient surviving the
filter, and the two models agreeing on cell shape for identical input.
Verified to fail 9/9 against the pre-fix models.

`tests/unit/docx-engine.spec.js` gains two tests for the array cell and the
empty-cell OOXML floor; the multi-line one was verified to fail with the
DOCX fix reverted.

`tests/e2e/pdf-form-specific.spec.ts` gains two tests asserting the rendered
PDF, using a new `extractPdfTextItems()` helper in
`tests/e2e/support/pdf-extract.ts`. That helper exists because
`extractPdfText()` space-joins every run on a page, so it **cannot
distinguish three lines inside the column from one line off the page** — the
characters are identical either way, which is exactly what the proposal's
own "assert structurally, not visually" note warned about. The new tests
assert each component is its own text run and that none of the three
possible joined forms reappears. Both verified to fail with the
`measureCell()` branch removed.

Existing fixtures behaved as the proposal predicted: `pdf-form-specific`'s
`:245` and `:467` rows assert per-field sentinels, not joined strings, and
kept passing unchanged. Confirmed `Room 100` (a `line4` value) was asserted
nowhere before this work — the coverage gap that let the data loss through.

Full unit suite 474 passed; PDF/DOCX e2e sweep of 8 specs green.

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

**Existing fixtures and coverage gap (review pass 2026-09-12).** Checked
the current specs directly rather than assuming what's there:

- **Annual already has usable fixtures.**
  `tests/e2e/pdf-form-specific.spec.ts:245` supplies
  `{ name: 'Clerk of Court', line2: '315 Court St', line3: 'Clearwater, FL 33756', line4: 'Room 100' }`
  — all four fields populated, which is exactly the shape this fix
  changes. `:467` supplies a `DRIFT_GUARD_*` sentinel row with
  `line4: ''`. Both assert per-field sentinels rather than a joined
  string, so **they should keep passing unchanged** — confirm that early,
  because if either one *does* break, it means something asserts the
  comma-joined form and the blast radius is wider than this proposal
  assumes.
- **Simplified has no equivalent fixture at all**, which is why the
  dropped `line4` went unnoticed. The data-loss half of this fix is
  therefore **completely unasserted today**, and adding the array branch
  alone would not prove it fixed. Add a Simplified Certificate of Service
  fixture with all of `line2`/`line3`/`line4` populated and assert
  `line4`'s text is present in the extracted output. Treat that assertion,
  not the wrapping one, as the regression guard for the data-loss bug —
  wrapping is visually obvious on inspection, a silently missing address
  line is not.
- **Assert absence-of-overflow structurally, not visually.** "Fully inside
  the column" is not directly observable from extracted text. Either
  assert the expected line count for the cell (three text runs where one
  used to be), or assert each component string appears as its own
  extracted line — not merely that the characters exist somewhere on the
  page, which was already true when it was overflowing.
