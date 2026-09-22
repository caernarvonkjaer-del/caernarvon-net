# Milestone 65: Wording and label corrections — Proposal

## Status

**Proposed — not authorized; nothing implemented.** Per `AGENTS.md` §3, this
document authorizes nothing on its own — a proposal is not execution.

| Item | Summary | Status |
| :-- | :-- | :-- |
| **65A** | D-5 Certificate of Service: "Indicate if" label names the Ward | Proposed 2026-09-22; D1 decided; not yet built |

---

## 65A — "Indicate if" label names the Ward

### Provenance

Raised 2026-09-22 by Alan, from a screenshot of Guardian Inventory D-5
(Attorney Certification card): the label above the Ward-status dropdown reads
just **"Indicate if"**, with no object. Requested wording: **"Indicate if
Ward is..."**, applied "on any form or page where this question exists."

### Where this question exists — confirmed by reading the source

This exact question (Ward is totally incapacitated / Ward is under 14 years
old / N/A) was added in Milestone 64A-2, item 2.4, and it exists in **one
place only**: Guardian Inventory (Initial Inventory), D-5 Certificate of
Service. It does not exist on Annual, Simplified, or any Plan filing — those
have no Certificate of Service page with this question.

There's a second, unrelated label that also reads "Indicate if" on Annual and
Simplified accountings — `certIndicator`, "Indicate if (e.g. hand-delivered,
mailed)" (`annual-accounting/index.js:1443`, `simplified-accounting/index.js:602`).
That's a different question (method of service, free text, not the Ward's
status) with no "Ward" to name. **Out of scope** — renaming it "Indicate if
Ward is..." would misdescribe the question. Confirmed no such label exists
anywhere else in the app.

For the one question that does apply, "Indicate if" appears in three places,
each read directly:

| Site | File : line | Current text | Governed by |
| :-- | :-- | :-- | :-- |
| On-screen field label (the screenshot) | `guardian-inventory/index.js:1198` | `Indicate if` (bold, required `*`, above the dropdown) | App UI — ours to word |
| App-generated PDF, printed under the recipient list | `guardian-inventory/pdf-model.js:816` | `` `Indicate if: ${d.serviceIndicateIf \|\| '—'}` `` | App UI — ours to word |
| Internal export-blocking error message (shown in the "why can't I export" list when the field is blank) | `guardian-inventory/index.js:1363` | `'D-5 — Indicate if'` | App UI — ours to word |
| The official court workbook's own pre-printed caption, cell J24, with the answer written to J25 directly below it | `guardian-inventory/excel.js:530-532` | `Indicate if:` (pre-printed by the template; we only ever write the *answer* to J25, never the caption) | **The court's own template — `AGENTS.md` §5. Out of scope; not proposed for change.** |

The dropdown's three option strings (`Ward is totally incapacitated`, `Ward
is under 14 years old`, `N/A`) are what gets written to the exported Excel
line and the printed PDF sentence — they read as complete answers on their
own (e.g. the PDF prints "Indicate if: Ward is totally incapacitated"), so
**they are not proposed for change**, only the label that precedes the
dropdown on screen (and, if decision D1 says so, the two other app-authored
copies of the question above).

### Decision needed — D1 — **DECIDED 2026-09-22: option 1 (all three), wording "Indicate if Ward is:"**

The on-screen label is confirmed in scope. Two more copies of the same
question exist, both app-authored (not the court template), both currently
also just "Indicate if":

1. The PDF's printed sentence (`pdf-model.js:816`) — a filer or reviewer
   reading the exported PDF sees the same bare "Indicate if:" this item is
   fixing on screen.
2. The export-blocking error message (`index.js:1363`) — shown in the
   sidebar/summary list of what's stopping export; currently "D-5 — Indicate
   if" would become "D-5 — Indicate if Ward is:".

Decided: all three are reworded together, for consistency — a filer sees the
same wording everywhere the question is asked or referenced. Exact wording:
**"Indicate if Ward is:"** (with the colon, closer to the court form's own
J24 caption style), not the recommended no-colon form and not a literal
ellipsis.

### Proposed change

| Site | File : line | Becomes |
| :-- | :-- | :-- |
| On-screen field label | `guardian-inventory/index.js:1198` | `reqLabel('Indicate if')` → `reqLabel('Indicate if Ward is:')` |
| PDF printed sentence | `guardian-inventory/pdf-model.js:816` | `` `Indicate if: ${...}` `` → `` `Indicate if Ward is: ${...}` `` |
| Export-blocking error message | `guardian-inventory/index.js:1363` | `'D-5 — Indicate if'` → `'D-5 — Indicate if Ward is:'` |

No other change to any of the three lines — the select, its three options,
and the surrounding markup are untouched.

**Implementation note for the build:** `reqLabel()` appends the required
asterisk directly after the label text with no separating space
(`<strong>${text}</strong><span class="req">*</span>`); with a trailing colon
that reads "...Ward is:*". Worth a visual check when this is built — every
other `reqLabel()` call in this file ends in a bare word, so a colon
immediately before the asterisk is a new shape for this label, not an
existing pattern to match.

Cosmetic only: no `window.D` key changes, no export-format change, no
migration. Existing `.sav` files are unaffected. `AGENTS.md` §5 is not
engaged — the workbook's own J24 caption is never touched, and the three
option strings written to the export are unchanged.

