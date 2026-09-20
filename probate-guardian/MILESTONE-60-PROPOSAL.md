# Milestone 60: PDF Fidelity Fixes and Cross-Form Method Unification

## Status

**PROPOSAL. Not started. Not authorized.** Per `AGENTS.md` §3, no item below may
be implemented until the requester approves that item by name; approval of one
item authorizes only that item.

This proposal was scoped on **2026-09-20** against `master` at `b8f1e2c`, by
reading all three forms' PDF generation code in full —
`src/features/guardian-inventory/pdf-model.js`,
`src/features/annual-accounting/{pdf-model.js,totals.js}`, and
`src/features/simplified-accounting/pdf-model.js` — plus the shared renderer
`src/core/pdf/pdf-engine.js`, and cross-checking every schedule's rendered
columns against (a) the fields each form's UI actually captures and (b) the
original clerk-of-court `.xlsx` requirements established earlier in this
session's template decode. This version supersedes the prior one (preserved
in git history at commit `b8f1e2c`) by adding everything found once the same
check was run against Annual and Simplified Accounting, and by treating two
of the findings as **architectural**, not per-schedule: where a fix can close
the gap that let the defect happen at all, this proposal fixes the gap, not
just the symptom.

## Purpose

Fix every place this audit found where the PDF a filer actually reviews and
files does not faithfully render a field the original court form requires and
the app's UI already captures — across all three inventory/accounting forms,
not just the one first checked — and close the two structural inconsistencies
between the three forms' code that made those defects possible in the first
place.

---

## Verified baseline and evidence

### Systemic finding #1: Guardian Inventory has no shared totals module; Annual Accounting does, and that is very likely why only Guardian Inventory has the ward-percentage defect

`src/features/annual-accounting/totals.js` is explicitly documented as "the
canonical statutory calculations... single source of truth shared between UI
forms, preview, Excel export, and accessible PDF generation." Every Schedule
D total in it applies `n(r.fullValue) * pct(r.wardPct)` uniformly (lines
29-39), and the bond and audit-fee calculations are derived from those same
ward-adjusted totals (lines 42-49). Because the math exists in one place, it
only had to be gotten right once.

`src/features/guardian-inventory/pdf-model.js` has no equivalent. Its totals
(lines 44-60) are computed inline, once per PDF build, with locally defined
`sum`/`sumWard` helpers, and nothing else in the app reuses them. Only 3 of
its 11 schedules (A-1, B-2, B-3) use the ward-adjusted `sumWard`; the other 8
use the plain `sum`, and — confirmed separately below — never display a
Ward's %/Share column either, so nothing on the page shows a reader that a
percentage was ever supposed to apply:

```js
const totalA1 = sumWard(d.scheduleA1, 'fullAssetValue', 'wardPercent');   // ward-adjusted
const totalA2 = sum(d.scheduleA2, 'fullDebtBalance');                     // NOT adjusted
const totalB1 = sum(d.scheduleB1, 'fullAssetAmount');                     // NOT adjusted
const totalB2 = sumWard(d.scheduleB2, 'fullAssetValue', 'wardPercent');   // ward-adjusted
const totalB3 = sumWard(d.scheduleB3, 'fullAssetValue', 'wardPercent');   // ward-adjusted
const totalB4 = sum(d.scheduleB4, 'fullLiabilityBalance');                // NOT adjusted
const totalC1 = sum(d.scheduleC1, 'annualIncomeAmount');                  // NOT adjusted
const totalC2 = sum(d.scheduleC2, 'amountOfClaim');                       // NOT adjusted
const totalC3 = sum(d.scheduleC3, 'estimatedSettlement');                 // NOT adjusted
const totalC4 = sum(d.scheduleC4, 'trustAmount');                         // NOT adjusted
const totalC5 = sum(d.scheduleC5, 'totalAssetValue');                     // NOT adjusted
```

`totalRealPersonal` (built from these) feeds "Summary I" and directly selects
the printed Audit Fee tier at [pdf-model.js:552](src/features/guardian-inventory/pdf-model.js#L552).
A filing with any jointly-owned account, shared trust, or partial claim can
have its estate value overstated on the face of the filed document, and can
push the printed audit fee to the wrong tier.

### Systemic finding #2: two competing PDF signature-block layouts, one documented by the shared engine itself as inferior, inconsistently assigned across forms

`src/core/pdf/pdf-engine.js` supports two shapes for a `signature-block`:
`fields` (an ordered array of `[{label, value}, ...]` rows) and `details` (a
flat object). The engine's own comments (lines 1445-1448) state the newer
`fields` layout replaced `details`, which "lost the source HTML's grouping
and ordering by rendering `Object.keys()` in a single column." A second
comment block (lines 433-463) records a real, already-fixed bug from
2026-09-18 — a guardian's address running past the right margin into its own
label — and states plainly that it hit "exactly the filing types that print a
guardian address through `details`": Annual, Final, and Trust Accounting (all
three share `annual-accounting/pdf-model.js`) plus Simplified Accounting.
Guardian Inventory does not appear in that list because it had already been
migrated to `fields`.

**Confirmed: Annual Accounting's and Simplified Accounting's `pdf-model.js`
still use `details` in every signature block** — guardian(s), preparer,
attorney, and certificate-of-service attorney, in both files. Guardian
Inventory uses `fields` throughout. Nothing prevents a future engine change to
one layout from silently not reaching the other, which is exactly the
mechanism that produced the 2026-09-18 bug.

### Per-schedule findings: fields the UI captures that never reach Guardian Inventory's PDF

| Schedule | UI field (captured, several required) | PDF column? | Evidence |
| --- | --- | --- | --- |
| A-2 | `liabilityType` (required select) | **Missing** | [pdf-model.js:274-281](src/features/guardian-inventory/pdf-model.js#L274-L281) — 4 columns only |
| A-2 | `accountNumber` | **Missing** | same |
| A-2 | `wardPercent` (required) / computed `wardDebt` | **Missing** | same |
| A-2 | `notes` ("Notes (related property, etc.)") | **Missing** — column instead reads `r.relatedProperty`, a field that does not exist on `scheduleA2` (it belongs to B-4); always renders blank | [pdf-model.js:275](src/features/guardian-inventory/pdf-model.js#L275); absent from `index.js` and `probate-guardian-data-model.csv` |
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

**Checked and found correct — do not touch:** A-1, B-2, B-3 (Ward's %/Value
both shown and used in totals). A-1's `notes` field is rendered as an italic
sub-line under the description ([pdf-model.js:259](src/features/guardian-inventory/pdf-model.js#L259)) rather
than its own column — a reasonable, faithful choice, and the pattern 60D
below extends to A-2.

**Cosmetic:** A-1's PDF table renders a "Valuation Method" column
([pdf-model.js:258](src/features/guardian-inventory/pdf-model.js#L258), reading
`r.valuationMethod`) that is always blank — `scheduleA1` has no such field
(it belongs to B-2/B-3) and the original xlsx's Schedule A-1 has no such
column either.

### Cross-form finding: Simplified Accounting's remuneration declaration has no way to record an amount, unlike Annual's

Both forms' PDF models quote the **identical** statutory paragraph
(744.367(3)(a), "a declaration of all remuneration received... any payment or
other benefit made directly or indirectly, overtly or covertly, or in cash or
in kind") word for word — [annual pdf-model.js:1145](src/features/annual-accounting/pdf-model.js#L1145),
[simplified pdf-model.js:323](src/features/simplified-accounting/pdf-model.js#L323).
Annual's remuneration table has a Guardian Name / Type / Description /
**Amount** column set and captures `amount` in its UI. Simplified's
remuneration UI ([index.js:625-627](src/features/simplified-accounting/index.js#L625-L627))
only asks for Guardian Name, Type, and Description — no amount field exists
anywhere in the form, so its PDF table ([pdf-model.js:329](src/features/simplified-accounting/pdf-model.js#L329))
correctly has nothing to render. `simplified-accounting/excel.js` already
contains defensive code for an `r.amount` that nothing ever sets, which reads
like an abandoned partial implementation rather than a deliberate design
choice.

---

## Delivery index

| Delivery | Scope | Risk | Kind |
| --- | --- | --- | --- |
| **60A** | Create `guardian-inventory/totals.js`; fix ward-percentage math for all 8 affected schedules | Medium — changes printed dollar totals | Systemic fix |
| **60B** | Add Ward's %/Share column (+ C-1 payer address) to those same 8 schedules' PDF tables | Low | Per-schedule |
| **60C** | Add Type and Account Number columns to A-2 and B-4 | Low | Per-schedule |
| **60D** | A-2: replace the phantom `relatedProperty` column with the real `notes` field | Low | Per-schedule |
| **60E** | A-1: remove the phantom, always-blank "Valuation Method" column | Low | Per-schedule |
| **60F** | Migrate Annual's and Simplified's PDF signature blocks from `details` to `fields`; retire `details` from `pdf-engine.js` | Medium — touches the shared renderer | Systemic fix |
| **60G** | Decide whether Simplified Accounting's remuneration should capture an Amount, matching Annual | N/A until decided | Decision + fix |

60A and 60B land together, for the same reason as before: a total that is
newly correct but still has no visible percentage column would leave a filer
unable to see why the number changed. 60C, 60D, 60E, 60F, and 60G are each
independent of the others and of 60A/60B.

---

## 60A — Guardian Inventory: a shared `totals.js`, fixing the ward-percentage math

**This delivery exists instead of a smaller patch on purpose.** A one-line
fix (`sum` → `sumWard` at each of the 8 call sites) would repair today's
symptom without changing the condition that produced it — the calculation
would still live nowhere but `pdf-model.js`, available to nothing else, and
exactly as easy to get wrong again the next time a schedule is added or a
total is needed elsewhere (Excel export, a future UI live-total display).
Per the new `AGENTS.md` §8.9, the fix is architectural: bring Guardian
Inventory's totals into the same shape Annual Accounting's already proved
out.

1. Create `src/features/guardian-inventory/totals.js`, following
   `annual-accounting/totals.js`'s shape: a single exported
   `calcTotalsGuardian(customD)` returning every schedule total and the
   headline aggregates (`totalA1` … `totalC5`, `netA`, `netB`,
   `totalRealPersonal`, `auditFee`), each computed with the same `full ×
   percent` rule already proven correct for A-1/B-2/B-3.
2. Adopt Annual's defensive `pct()` convention (`p > 1 ? p / 100 : p`) rather
   than Guardian's current bare `/100` in `calcWard()` — Guardian's UI only
   ever asks for 0-100 values today, but the defensive form costs nothing and
   removes a silent-wrong-answer mode if that ever changes (e.g. a future
   Excel import path that stores a fraction).
3. Update `pdf-model.js` to import and use `calcTotalsGuardian()` in place of
   its local `sum`/`sumWard`/`calcWard` definitions.
4. **Do not** share code between `guardian-inventory/totals.js` and
   `annual-accounting/totals.js` beyond the pattern — the two forms' schedules
   are not the same shape, and the codebase's existing convention keeps
   feature-specific business logic local to each feature (compare how
   `core/excel/excel-engine.js` centralizes only the genuinely
   feature-independent helpers, e.g. `setCell`, date formatting). If `n()`
   and `pct()` end up byte-identical between the two new/existing files,
   extracting *only those two pure functions* to
   `src/core/accounting/percent-math.js` is in scope for this delivery and
   removes the duplication without coupling the two forms' totals logic.

**Confirm before implementing, not after:** re-verify each schedule's
original xlsx column label (`"Ward's Debt Balance"`, `"Ward's Asset
Amount"`, `"Ward's Annual Income Amount"`, `"Ward's Share of Claim"`,
`"Ward's Share of the Estimated Settlement Amount"`, `"Ward's Share of Trust
Amount"`, `"Joint Owner's Value"`) confirms `full × percent`, matching the
pattern already proven for A-1/B-2/B-3 — per `AGENTS.md` §5, re-confirm
against the live template before changing the math, not from this table
alone.

**Red-first proof:** for each of the 8 schedules, create one entry with
`wardPercent` (or `jointOwnerPercent`) below 100 and a nonzero full value;
generate the PDF before the fix and confirm the relevant total equals the
*full* value; apply the fix; regenerate and confirm the total equals `full ×
percent / 100`. Repeat with several schedules populated together to confirm
`netA`/`netB`/`totalRealPersonal` and the Audit Fee tier respond correctly at
a boundary case.

**Expected file surface:** `src/features/guardian-inventory/totals.js` (new);
`src/features/guardian-inventory/pdf-model.js`;
possibly `src/core/accounting/percent-math.js` (new, only if step 4 applies);
`tests/unit/guardian-inventory-pdf-model.spec.js`;
`tests/unit/pdf-model-column-integrity.spec.js`; `TEST-INDEX.md`.

---

## 60B — Display the Ward's %/Share column on the 8 affected schedules

Add a Ward's % (or Joint Owner's %) column and a Ward's Value/Share column to
each affected schedule's PDF table, sourced from 60A's `calcTotalsGuardian()`
per-row helper rather than re-deriving the math inline — this is the second
half of why 60A is structured as a shared module rather than eight local
patches. Column headers should match the original form's own labels where
practical (e.g., "Ward's Debt Balance" for A-2, "Ward's Annual Income Amount"
for C-1, "Joint Owner's Value" for C-5).

This delivery also closes C-1's separate address gap: add the payer's address
(`composePdfAddressLines(r.payerAddress, r.payerCityStateZip)`) as its own
column, matching how every other schedule's address is rendered.

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
fields are already captured by the UI and already written to the Excel export
path — only the PDF path is missing them.

**Red-first proof:** populate an entry with a non-default `liabilityType`
(e.g., "Other Debt") and an `accountNumber`; confirm neither appears on the
generated PDF before the fix and both appear after.

**Expected file surface:** `src/features/guardian-inventory/pdf-model.js`;
`tests/unit/guardian-inventory-pdf-model.spec.js`; `TEST-INDEX.md`.

---

## 60D — A-2: replace the phantom `relatedProperty` column with the real `notes` field

[pdf-model.js:275](src/features/guardian-inventory/pdf-model.js#L275) reads
`r.relatedProperty`, which does not exist on `scheduleA2` entries — the
column is always blank. `scheduleA2` does have a real, UI-captured `notes`
field ("Notes (related property, etc.)", [index.js:785](src/features/guardian-inventory/index.js#L785))
that is currently never rendered anywhere in the PDF. Render it the same way
A-1 already renders its own `notes` field — as an italic sub-line under the
lender name — for consistency with the one schedule that already does this
correctly.

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

## 60F — Retire the legacy `details` signature-block layout

**Systemic fix, addressing the second root cause found in this audit.**

1. In `src/features/annual-accounting/pdf-model.js`, convert every
   `signature-block`'s `details: {...}` to the `fields: [[...], [...]]`
   layout Guardian Inventory already uses — four call sites: the guardian(s)
   loop (Part III), the preparer block (Part IV), the attorney block (Part
   V), and the certificate-of-service attorney block (Part X). Preserve the
   existing label text and grouping exactly; `fields` is an array of rows,
   so group labels the same way Guardian Inventory's own blocks already do
   (e.g. Phone and SSN/EIN on one row, Address alone on the next).
2. Do the same in `src/features/simplified-accounting/pdf-model.js` — three
   call sites: guardian(s) (Part IV), attorney (Part V), and
   certificate-of-service attorney (Part VI).
3. After both are converted, grep the whole repo for `details:` inside a
   `signature-block` object literal. If nothing remains, remove the
   `details`/`planDetailStack()` branch from `src/core/pdf/pdf-engine.js`
   entirely (the code at and around lines 1439-1466 that this audit already
   read) — leaving it in place after nothing uses it recreates exactly the
   dual-maintenance risk this delivery exists to close.

**Verify no visual regression, not just no crash.** The `fields` layout
reserves column width based on the widest label actually present in the
block (per the engine's own 2026-09-18 fix); confirm each converted block's
longest label ("Guardianship Inception Date (GID)"-length text, if any font
metrics differ between the two forms) does not reintroduce the overflow the
`details` fix was written to prevent.

**Red-first proof:** before conversion, confirm (or reconfirm) the addresses
in Annual's and Simplified's signature blocks render without overflowing
their labels — this is the same case the 2026-09-18 fix already covers, so
this should already pass; the point of testing it here is to prove the
conversion doesn't reintroduce it. After conversion, diff the rendered field
order and grouping against the pre-conversion output field-by-field to
confirm nothing was silently reordered by the move away from `Object.keys()`
ordering.

**Expected file surface:** `src/features/annual-accounting/pdf-model.js`;
`src/features/simplified-accounting/pdf-model.js`;
`src/core/pdf/pdf-engine.js`;
`tests/e2e/pdf-accessibility-and-signatures.spec.ts` or the relevant
signature-block content spec for both forms; `TEST-INDEX.md`.

---

## 60G — Simplified Accounting: decide whether remuneration should capture an Amount

**This is a decision, not an assumed fix — do not implement without an
explicit answer.** Two forms print the identical statutory declaration text;
one asks for a dollar amount and one does not. Options:

1. **Add an Amount field to Simplified**, matching Annual's structure
   (`probate-guardian-data-model.csv` row, a UI input beside Type in
   `simplified-accounting/index.js`, a PDF column, and wiring the already-
   present-but-dead `r.amount` handling in `simplified-accounting/excel.js`
   so it is no longer dead code); or
2. **Confirm the omission is deliberate** (e.g., a Simplified filer's
   remuneration is expected to be described in prose in the Description
   field, or the smaller-estate audience this form serves doesn't warrant
   the extra field) and record why in this document, so a future audit does
   not re-raise it as an open question.

**Expected file surface, if option 1 is chosen:**
`probate-guardian-data-model.csv`; `src/features/simplified-accounting/{index.js,pdf-model.js,excel.js}`;
`tests/unit/*` and `tests/e2e/*` fixtures touching Simplified's remuneration;
`TEST-INDEX.md`.

---

## Out of scope

- Any change to the Excel export/import path for any of the three forms
  (that audit's findings are preserved in this file's earlier git history,
  commit `3a001f1`, and are not reproduced here).
- Any change to what counts as "Ward's %" versus "Joint Owner's %" as a
  concept, or to the underlying `full × percent` formula — 60A only asks
  that the already-correct formula be applied consistently and from one
  place.
- Re-litigating A-1/B-2/B-3, D-1 through D-5, or Schedule E/B-1 through B-4,
  which this audit confirmed are already correct in both forms.
- Deleting or restructuring Annual Accounting's B-4 multi-account PDF
  handling (the per-account register blocks and recap), which this audit
  read in full and found to be a deliberately reasoned design (see its own
  in-line comments on why unassigned rows are printed rather than dropped)
  and not a defect.

## Completion criteria

Milestone 60 is complete only when, for each item the requester has
individually authorized:

1. A red-first test demonstrates the defect against the pre-fix code (wrong
   total, missing column, phantom column, or reordered/overflowing signature
   field, as applicable) and passes after the fix.
2. Every dollar total on the generated PDF (per-schedule totals, Summary I,
   Summary II, Audit Fee Determination) is verified by hand-computing the
   expected ward-adjusted figure from the same fixture data, not merely by
   confirming the code runs without error.
3. For 60F, no `signature-block` object anywhere in the codebase still sets
   `details` unless a deliberate decision was made to keep the legacy path
   for a stated reason, recorded in this document.
4. `probate-guardian-data-model.csv` is updated for any new or changed
   persisted field (60G, if option 1 is chosen).
5. `TEST-INDEX.md` reflects every added or materially changed test.
6. No item outside the requester's explicit approval is touched in the same
   change, per `AGENTS.md` §3.
