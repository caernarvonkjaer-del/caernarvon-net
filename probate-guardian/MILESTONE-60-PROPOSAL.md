# Milestone 60: Guardian Inventory PDF Fidelity — Ward's-Percentage and Missing-Column Fixes

## Status

**PROPOSAL. Not started. Not authorized.** Per `AGENTS.md` §3, no item below may
be implemented until the requester approves that item by name; approval of one
item authorizes only that item.

This proposal was scoped on **2026-09-20** against `master` at `3a001f1`, by
reading `src/features/guardian-inventory/pdf-model.js` in full and
cross-checking every schedule's rendered PDF columns against (a) the fields
the UI actually captures (`src/features/guardian-inventory/index.js`) and (b)
the columns the original clerk-of-court `.xlsx` requires (established in this
session's earlier decode of the embedded template). This is a **PDF-path**
audit — a different code path from the Excel export/import audit that
produced this document's previous contents (that work is preserved in git
history at commit `3a001f1` if it's needed again; it is not part of this
version of the proposal).

## Purpose

Verify and fix that the PDF this app generates — the document a filer
actually reviews and files with the court — faithfully renders every field
the original court form requires, at the value the filer actually entered.
This audit found that it currently does not, in one respect serious enough to
change the total dollar figures printed on the document.

## Verified baseline and evidence

### The headline defect: 8 of 11 schedules' PDF totals ignore Ward's percentage entirely

Every asset/liability/income/claim/trust schedule after A-1 asks the filer for
a required "Ward's %" (or, on C-5, "Joint Owner's %") and the original xlsx
prints a "Ward's Value" / "Ward's Share" column computed from it — the whole
point of the field is that not every listed item is 100% attributable to the
ward (jointly held accounts, shared trusts, partial settlements). In
`pdf-model.js` lines 44-60:

```js
const totalA1 = sumWard(d.scheduleA1, 'fullAssetValue', 'wardPercent');   // ward-adjusted
const totalA2 = sum(d.scheduleA2, 'fullDebtBalance');                     // NOT adjusted
const netA = Math.max(0, totalA1 - totalA2);

const totalB1 = sum(d.scheduleB1, 'fullAssetAmount');                     // NOT adjusted
const totalB2 = sumWard(d.scheduleB2, 'fullAssetValue', 'wardPercent');   // ward-adjusted
const totalB3 = sumWard(d.scheduleB3, 'fullAssetValue', 'wardPercent');   // ward-adjusted
const totalB4 = sum(d.scheduleB4, 'fullLiabilityBalance');                // NOT adjusted
const netB = Math.max(0, totalB1 + totalB2 + totalB3 - totalB4);

const totalC1 = sum(d.scheduleC1, 'annualIncomeAmount');                  // NOT adjusted
const totalC2 = sum(d.scheduleC2, 'amountOfClaim');                       // NOT adjusted
const totalC3 = sum(d.scheduleC3, 'estimatedSettlement');                 // NOT adjusted
const totalC4 = sum(d.scheduleC4, 'trustAmount');                         // NOT adjusted
const totalC5 = sum(d.scheduleC5, 'totalAssetValue');                     // NOT adjusted
```

Only A-1, B-2, and B-3 use `sumWard()`. The other eight schedules use the
plain, un-adjusted `sum()` — and, confirmed separately below, never display
the Ward's %/Share column on the page either, so nothing on the printed PDF
shows a reader that a percentage was supposed to apply at all.

**Why this is more than cosmetic.** `totalRealPersonal = netA + netB` feeds
the very first table in the PDF ("Summary I") and directly selects the
printed **Audit Fee** tier at [pdf-model.js:552](src/features/guardian-inventory/pdf-model.js#L552)
(`$0 / $85 / $170 / $250` at the `$25k` / `$100k` / `$500k` thresholds). A
filing with any jointly-owned account, shared trust, or partial claim can
have its estate value overstated on the face of the filed document, and in
principle push the printed audit fee to the wrong tier.

### Verified per-schedule: which UI-captured fields never reach the PDF

| Schedule | UI field (captured, several required) | PDF column? | Evidence |
| --- | --- | --- | --- |
| A-2 | `liabilityType` (required select) | **Missing** | [pdf-model.js:274-281](src/features/guardian-inventory/pdf-model.js#L274-L281) — 4 columns only |
| A-2 | `accountNumber` | **Missing** | same |
| A-2 | `wardPercent` (required) / computed `wardDebt` | **Missing** | same |
| A-2 | `notes` ("Notes (related property, etc.)") | **Missing** — column instead reads `r.relatedProperty`, a field that does not exist on `scheduleA2` (it belongs to B-4); always renders blank | [pdf-model.js:275](src/features/guardian-inventory/pdf-model.js#L275); confirmed absent from `index.js`'s `scheduleA2` fields and from `probate-guardian-data-model.csv` |
| B-1 | `wardPercent` (required) / computed `wardAmt` | **Missing** | [pdf-model.js:297-298](src/features/guardian-inventory/pdf-model.js#L297-L298) — 6 columns, no Ward's %/Amount |
| B-4 | `liabilityType` (required select) | **Missing** | [pdf-model.js:340-347](src/features/guardian-inventory/pdf-model.js#L340-L347) — 4 columns only |
| B-4 | `accountNumber` | **Missing** | same |
| B-4 | `wardPercent` (required) / computed `wardB4` | **Missing** | same |
| C-1 | `payerAddress` / `payerCityStateZip` | **Missing** | [pdf-model.js:356-357](src/features/guardian-inventory/pdf-model.js#L356-L357) — payer address not rendered at all |
| C-1 | `wardPercent` (required) / computed `wardC` | **Missing** | same |
| C-2 | `wardPercent` (required) / computed `wardC` | **Missing** | [pdf-model.js:370](src/features/guardian-inventory/pdf-model.js#L370) |
| C-3 | `wardPercent` (required) / computed `wardC` | **Missing** | [pdf-model.js:387](src/features/guardian-inventory/pdf-model.js#L387) |
| C-4 | `accountNumber`, `trustType` (required select), `wardPercent` (required) / computed `wardC` | **Missing** | [pdf-model.js:401](src/features/guardian-inventory/pdf-model.js#L401) — 4 columns only |
| C-5 | `jointOwnerPercent` (required) / computed `wardC` | **Missing** | [pdf-model.js:419](src/features/guardian-inventory/pdf-model.js#L419) — 4 columns only |

**Checked and found correct — do not touch:** A-1 (Ward's %/Value both shown
and used in totals), B-2, B-3 (same). A-1's `notes` field is deliberately
rendered as an italic sub-line under the description rather than its own
column ([pdf-model.js:259](src/features/guardian-inventory/pdf-model.js#L259)) — that is a
reasonable, faithful design choice, not a defect, and 60D below follows the
same pattern for A-2.

### A cosmetic defect found in the same pass

A-1's PDF table renders a "Valuation Method" column
([pdf-model.js:258](src/features/guardian-inventory/pdf-model.js#L258), reading
`r.valuationMethod`) that is always blank: `scheduleA1` entries have no such
field (it belongs to B-2/B-3), and the original xlsx's Schedule A-1 has no
such column either. Lower severity than the items above — it does not hide
required information, it just prints an empty column on every Schedule A-1
table.

---

## Delivery index

| Delivery | Scope | Risk |
| --- | --- | --- |
| **60A** | Apply ward-percentage math to the 8 affected schedules' totals and net calculations | Medium — changes printed dollar totals |
| **60B** | Add the Ward's %/Ward's Share (or Joint Owner's %) column to those same 8 schedules' PDF row tables | Low — additive column, no calculation change beyond 60A |
| **60C** | Add Type and Account Number columns to A-2 and B-4 | Low — additive columns |
| **60D** | A-2: replace the phantom `relatedProperty` column with the real, captured `notes` field | Low |
| **60E** | A-1: remove the phantom, always-blank "Valuation Method" column | Low |

60A and 60B should land together — a total that is now correctly
ward-adjusted but still has no visible percentage column on the page would
leave a filer unable to see why the number changed. 60C, 60D, and 60E are
independent of 60A/60B and of each other.

---

## 60A — Ward-percentage-adjusted totals

Change `totalA2`, `totalB1`, `totalB4`, `totalC1`, `totalC2`, `totalC3`,
`totalC4`, `totalC5` in `pdf-model.js` (lines 45, 48, 51, 56-60) from
`sum(arr, fullKey)` to `sumWard(arr, fullKey, pctKey)`, using each schedule's
existing percentage field:

| Total | Full-value key | Percentage key |
| --- | --- | --- |
| `totalA2` | `fullDebtBalance` | `wardPercent` |
| `totalB1` | `fullAssetAmount` | `wardPercent` |
| `totalB4` | `fullLiabilityBalance` | `wardPercent` |
| `totalC1` | `annualIncomeAmount` | `wardPercent` |
| `totalC2` | `amountOfClaim` | `wardPercent` |
| `totalC3` | `estimatedSettlement` | `wardPercent` |
| `totalC4` | `trustAmount` | `wardPercent` |
| `totalC5` | `totalAssetValue` | `jointOwnerPercent` |

`netA` and `netB` need no separate change — they are simple sums/differences
of the totals above, so correcting `totalA2` and `totalB4` (the liability
sides) automatically corrects `netA` and `netB`. `totalRealPersonal`,
"Summary I"/"Summary II", and the Audit Fee determination all consume these
totals downstream and need no direct edit.

**Confirm before implementing, not after:** verify each schedule's original
xlsx column is genuinely "Ward's Value/Share of the full figure" and not some
other relationship — this audit read the header label on each schedule
(`"Ward's Debt Balance"`, `"Ward's Asset Amount"`, `"Ward's Annual Income
Amount"`, `"Ward's Share of Claim"`, `"Ward's Share of the Estimated
Settlement Amount"`, `"Ward's Share of Trust Amount"`, `"Joint Owner's
Value"`) and confirmed each is `full × percent`, matching `sumWard()`'s
existing formula and the pattern already proven correct for A-1/B-2/B-3 — but
re-confirm against the live template before changing the math, per
`AGENTS.md` §5.

**Red-first proof:** for each of the 8 schedules, create one entry with
`wardPercent` (or `jointOwnerPercent`) set below 100 and a nonzero full
value; generate the PDF before the fix and confirm the relevant total in
Summary I/II equals the *full* value (proving the defect); apply the fix;
regenerate and confirm the total equals `full × percent / 100`. Repeat with a
mix of schedules populated together to confirm `netA`/`netB`/`totalRealPersonal`
and the Audit Fee tier respond correctly at a boundary (e.g., an estate that
only crosses $100,000 when counted at full value, not at the ward-adjusted
value).

**Expected file surface:** `src/features/guardian-inventory/pdf-model.js`;
`tests/unit/guardian-inventory-pdf-model.spec.js`;
`tests/unit/pdf-model-column-integrity.spec.js`; `TEST-INDEX.md`.

---

## 60B — Display the Ward's %/Share column on the 8 affected schedules

Add a Ward's % (or Joint Owner's %) column and a Ward's Value/Share column to
each affected schedule's PDF table, in the same style already used by A-1
(`` `${r.wardPercent || 100}%` ``) and its computed value
(`fmt(calcWard(r.fullAssetValue, r.wardPercent))`), substituting each
schedule's own full-value key per the table in 60A. Column headers should
match the original form's own labels where practical (e.g., "Ward's Debt
Balance" for A-2, "Ward's Annual Income Amount" for C-1, "Joint Owner's
Value" for C-5) so the printed document reads as the same concept the court's
own workbook names.

This delivery also closes C-1's separate address gap: add the payer's address
(`composePdfAddressLines(r.payerAddress, r.payerCityStateZip)`) as its own
column, matching how every other schedule's address is rendered.

**Depends on 60A only for the *value* shown; the column can be added and
tested independently with the pre-60A full-value math if sequencing requires
it** — but land them together per the Delivery index note above.

**Red-first proof:** for each schedule, confirm the new column is absent
before the change and present with the correct computed value after, using
the same fixture data as 60A's proof.

**Expected file surface:** `src/features/guardian-inventory/pdf-model.js`;
`tests/unit/guardian-inventory-pdf-model.spec.js`;
`tests/e2e/pdf-form-specific.spec.ts` or the relevant PDF content-assertion
spec; `TEST-INDEX.md`.

---

## 60C — A-2 and B-4: add Type and Account Number columns

Add two columns to each of A-2's and B-4's PDF tables: `liabilityType`
(header "Type") and `accountNumber` (header "Account Number"), matching the
original form's own column set for these two liability schedules. Both
fields are already captured by the UI (`scheduleA2.${i}.liabilityType` /
`.accountNumber`; `scheduleB4.${i}.liabilityType` / `.accountNumber`) and
already written to the Excel export path — only the PDF path is missing them.

**Red-first proof:** populate an entry with a non-default `liabilityType`
(e.g., "Other Debt") and an `accountNumber`; confirm neither appears on the
generated PDF before the fix and both appear after.

**Expected file surface:** `src/features/guardian-inventory/pdf-model.js`;
`tests/unit/guardian-inventory-pdf-model.spec.js`; `TEST-INDEX.md`.

---

## 60D — A-2: replace the phantom `relatedProperty` column with the real `notes` field

[pdf-model.js:275](src/features/guardian-inventory/pdf-model.js#L275) reads
`r.relatedProperty`, which does not exist on `scheduleA2` entries (confirmed
absent from `index.js` and `probate-guardian-data-model.csv`) — the column
is always blank. `scheduleA2` does have a real, UI-captured `notes` field
("Notes (related property, etc.)", [index.js:785](src/features/guardian-inventory/index.js#L785))
that is currently never rendered anywhere in the PDF. Render it the same way
A-1 already renders its own `notes` field — as an italic sub-line under the
lender name/description — rather than as its own always-mostly-empty column,
for consistency with the one schedule that already does this correctly.

**Red-first proof:** populate `scheduleA2.notes` with text and confirm it is
absent from the generated PDF before the fix and appears as a sub-line after.

**Expected file surface:** `src/features/guardian-inventory/pdf-model.js`;
`tests/unit/guardian-inventory-pdf-model.spec.js`; `TEST-INDEX.md`.

---

## 60E — A-1: remove the phantom "Valuation Method" column

[pdf-model.js:258](src/features/guardian-inventory/pdf-model.js#L258) renders a
"Valuation Method" column reading `r.valuationMethod`, a field `scheduleA1`
entries do not have and the original xlsx's Schedule A-1 does not ask for.
Remove the column and its header, and adjust `colWidths`/`colAlign` for the
remaining columns accordingly.

**Red-first proof:** confirm the column renders empty for every A-1 row
before the fix (proving it is dead, not merely untested) and that the table
has one fewer column, with widths re-summing to the same total, after.

**Expected file surface:** `src/features/guardian-inventory/pdf-model.js`;
`tests/unit/guardian-inventory-pdf-model.spec.js`;
`tests/unit/pdf-model-column-integrity.spec.js`; `TEST-INDEX.md`.

---

## Out of scope

- Annual Accounting's and Simplified Accounting's PDF paths — the requester
  chose to pilot this audit method on Guardian Inventory first; extending it
  is a separate, later decision.
- Any change to `src/features/guardian-inventory/excel.js` or the Excel
  export/import path. That audit's findings are preserved in this file's git
  history at commit `3a001f1` and are not reproduced here.
- Any change to what counts as "Ward's %" versus "Joint Owner's %" as a
  concept, or to the underlying `calcWard()` formula (`full × percent / 100`)
  — 60A only asks that the already-correct formula be applied consistently.
- Re-litigating A-1/B-2/B-3, which this audit confirmed are already correct.

## Completion criteria

Milestone 60 is complete only when, for each item the requester has
individually authorized:

1. A red-first test demonstrates the defect against the pre-fix code (wrong
   total, missing column, or phantom column, as applicable) and passes after
   the fix.
2. Every dollar total on the generated PDF (per-schedule totals, Summary I,
   Summary II, Audit Fee Determination) is verified by hand-computing the
   expected ward-adjusted figure from the same fixture data, not merely by
   confirming the code runs without error.
3. `TEST-INDEX.md` reflects every added or materially changed test.
4. No item outside the requester's explicit approval is touched in the same
   change, per `AGENTS.md` §3.
