# Milestone 60: PDF Fidelity Fixes and Cross-Form Method Unification

## Status

**PROPOSAL. Not started. Not authorized.** Per `AGENTS.md` §3, no item below may
be implemented until the requester approves that item by name; approval of one
item authorizes only that item.

**This is the third pass on this document, and each pass changed the
recommended fix, not just the finding list — that pattern is itself part of
the evidence for `AGENTS.md` §8.9.** The first version audited only the Excel
export path (preserved at commit `3a001f1`). The second version audited only
Guardian Inventory's PDF path (commit `b8f1e2c`). This version incorporates
an independent review of that second pass, which — checking the sibling
forms and this app's own pre-existing code rather than trusting the prior
document's file list — found that:

- Guardian Inventory already has a fully correct, ward-adjusted calculator
  (`legacy-app.js`'s `calc` object, lines 6378-6409), which the PDF path
  simply never uses. This changes 60A's fix from "create a new totals
  module" to "connect the PDF to the module that already gets this right,"
  and it exposed that the PDF's audit-fee tiers are *also* wrong — borrowed
  from Annual's four-tier schedule instead of Guardian's real two-tier one.
- Several more UI-captured, court-required fields never reach Guardian's PDF
  (C-3 Action Date, C-4/C-5 city-state-zip, B-2/B-3's safe-deposit-box
  amount) beyond the eight schedules the second pass named.
- Annual's and Simplified's remuneration sections, which quote the same
  statute, are not in fact textually identical (Annual truncates it), and
  Simplified independently has the same "declaration silently absent when
  empty" defect Milestone 58D already fixed for Annual — nobody had checked
  whether Simplified needed the same fix.
- The `details`→`fields` PDF signature-block migration (60F) has real
  mechanical differences (fixed-width/fixed-height layout, not
  widest-label sizing; explicit row grouping required; one colon-dependent
  regression test) that the prior version's "should be straightforward"
  framing understated.

Every claim above was independently re-verified against current source in
this pass, not accepted from the review that raised it — see each
delivery's evidence.

## Purpose

Fix every place this audit found where the PDF a filer actually reviews and
files does not faithfully render a field the original court form requires,
the app's UI already captures, or — in three cases — a calculation this app
*already gets right somewhere else* — across all three inventory/accounting
forms. Close the structural gaps that let these defects happen and go
unnoticed, rather than only patching each symptom.

---

## Verified baseline and evidence

### 60A's real story: a correct calculator already exists and the PDF doesn't use it

`src/legacy-app.js` (lines 6378-6409) defines `window.calc`, consumed
throughout the live UI (sidebar totals, live-updating calculated fields —
[legacy-app.js:7396-7403](src/legacy-app.js#L7396-L7403)). It is already
correct:

```js
const calc={
  wardVal:(e)=>r2((e.fullAssetValue||0)*((e.wardPercent||0)/100)),
  // ... one such helper per schedule ...
  totalA1:()=>r2(D.scheduleA1.reduce((s,e)=>s+calc.wardVal(e),0)),
  totalA2:()=>r2(D.scheduleA2.reduce((s,e)=>s+calc.wardDebt(e),0)),
  netA:()=>calc.totalA1()-calc.totalA2(),
  // totalB1..totalC5, netB, total() similarly, all ward-adjusted
  restrictedCash:()=>r2(D.scheduleB1.filter(e=>isRestrictedAnswer(e)).reduce((s,e)=>s+calc.wardAmt(e),0)),
  unrestrictedCash:()=>r2(D.scheduleB1.filter(e=>!isRestrictedAnswer(e)).reduce((s,e)=>s+calc.wardAmt(e),0)),
  restrictedIntang:()=>r2(D.scheduleB3.filter(e=>isRestrictedAnswer(e)).reduce((s,e)=>s+calc.wardB3(e),0)),
  unrestrictedIntang:()=>r2(D.scheduleB3.filter(e=>!isRestrictedAnswer(e)).reduce((s,e)=>s+calc.wardB3(e),0)),
  bondRequired:()=>calc.unrestrictedCash()+calc.totalB2()+calc.unrestrictedIntang(),
  auditFee:()=>calc.total()>25000?85:0,
};
```

This directly contradicts two things the prior version of this document
assumed:

1. **Guardian's real audit-fee rule is two-tier: `$85` if total inventory
   value exceeds `$25,000`, otherwise `$0`.** [pdf-model.js:552](src/features/guardian-inventory/pdf-model.js#L552)
   currently runs a *four*-tier ladder (`$0`/`$85`/`$170`/`$250` at
   `$25k`/`$100k`/`$500k`) — Annual Accounting's rule, not Guardian's. This
   is a second, independent defect beyond the missing ward-adjustment, and
   it means even a fixed `totalRealPersonal` would still print the wrong
   fee for any estate over `$100,000`.
2. **`pdf-model.js`'s own `restrictedCash` subtotal (used in its B-1 table,
   [pdf-model.js:292](src/features/guardian-inventory/pdf-model.js#L292)) is
   itself unadjusted** — `.reduce((s, r) => s + (parseFloat(r.fullAssetAmount) || 0), 0)`,
   not the ward-adjusted `wardAmt` the legacy calculator uses for the same
   figure. A second, more localized instance of the same bug class.

**The fix is therefore not "write a new calculation module."** A prior
draft of this delivery proposed exactly that, and an independent review
correctly objected: a module the PDF alone consumes, sitting beside a
different-but-equivalent implementation the live UI already trusts, is a
*third* implementation of the same math, not the "one place to get it right"
this milestone is trying to create. The fix is to make the PDF consume the
implementation that already works.

### Per-schedule findings: fields the UI captures that never reach Guardian Inventory's PDF

| Schedule | UI field (captured, several required) | PDF column? | Evidence |
| --- | --- | --- | --- |
| A-2 | `liabilityType` (required select) | **Missing** | [pdf-model.js:274-281](src/features/guardian-inventory/pdf-model.js#L274-L281) |
| A-2 | `accountNumber` | **Missing** | same |
| A-2 | `wardPercent` (required) / computed `wardDebt` | **Missing** | same |
| A-2 | `notes` | **Missing** — column instead reads nonexistent `r.relatedProperty`, always blank | [pdf-model.js:275](src/features/guardian-inventory/pdf-model.js#L275) |
| B-1 | `wardPercent` (required) / computed `wardAmt` | **Missing** | [pdf-model.js:297-298](src/features/guardian-inventory/pdf-model.js#L297-L298) |
| B-2 | `amountInSDB` | **Missing everywhere, not just the PDF** — see below | [excel.js:568](src/features/guardian-inventory/excel.js#L568) |
| B-3 | ward-adjusted restricted amount; `amountInSDB` | **Missing everywhere, not just the PDF** — see below | same pattern |
| B-4 | `liabilityType` (required select) | **Missing** | [pdf-model.js:340-347](src/features/guardian-inventory/pdf-model.js#L340-L347) |
| B-4 | `accountNumber` | **Missing** | same |
| B-4 | `wardPercent` (required) / computed `wardB4` | **Missing** | same |
| C-1 | `payerAddress` / `payerCityStateZip` | **Missing** | [pdf-model.js:356-357](src/features/guardian-inventory/pdf-model.js#L356-L357) |
| C-1 | `wardPercent` (required) / computed `wardC` | **Missing** | same |
| C-2 | `wardPercent` (required) / computed `wardC` | **Missing** | [pdf-model.js:370](src/features/guardian-inventory/pdf-model.js#L370) |
| C-3 | `wardPercent` (required) / computed `wardC` | **Missing** | [pdf-model.js:388](src/features/guardian-inventory/pdf-model.js#L388) |
| C-3 | `actionDate` (required, validated at [index.js:1243](src/features/guardian-inventory/index.js#L1243)) | **Missing** | same row mapping has no date column at all |
| C-4 | `accountNumber`, `trustType` (required select), `wardPercent` (required) / computed `wardC` | **Missing** | [pdf-model.js:406](src/features/guardian-inventory/pdf-model.js#L406) |
| C-4 | `trusteeCityStateZip` | **Missing** — `composePdfAddressLines(r.trusteeName, r.trusteeAddress)` is called with 2 args, dropping the third | same |
| C-5 | `jointOwnerPercent` (required) / computed `wardC` | **Missing** | [pdf-model.js:422](src/features/guardian-inventory/pdf-model.js#L422) |
| C-5 | `ownerCityStateZip` | **Missing** — same 2-arg `composePdfAddressLines` pattern as C-4 | same |

**B-2/B-3's `amountInSDB` is a cross-path gap, not a PDF-only one.** The
workbook computes it as a formula (value in the safe-deposit box, derived
from the asset's ward-adjusted value and the Yes/No safe-deposit-box
answer); `probate-guardian-data-model.csv` declares `amountInSDB` for both
schedules (lines 210, 224); but no UI input ever sets it, and
`parseInitialInventoryWorkbook()` hardcodes it to `0` on import
([excel.js:568](src/features/guardian-inventory/excel.js#L568)). There is
nothing correct to render on the PDF yet — this needs the same UI/Excel
attention as a genuine input before a PDF column means anything, unlike the
other rows in this table where the value already exists and only the PDF
is missing it.

**Checked and found genuinely correct — do not touch:** A-1's Ward's
%/Value; B-2's and B-3's own Ward's %/Value (their omission above is
specifically `amountInSDB`, not the percentage math).

**Cosmetic, confirmed:** A-1's PDF table renders a "Valuation Method" column
([pdf-model.js:258](src/features/guardian-inventory/pdf-model.js#L258), reading
`r.valuationMethod`) that is always blank — that field belongs to **B-2
only** (not B-2/B-3; B-3's schema and factory have no such field either, so
the distinction matters for anyone searching for it later).

### Guardian Part V: two more display gaps once the totals module exists

- **Bond-waiver answer/date are captured and validated but never printed.**
  [index.js:1268](src/features/guardian-inventory/index.js#L1268) requires
  `bondWaived` (and conditionally `bondWaivedDate`); the workbook records
  them at `PART V!B15`/`G15`; [pdf-model.js:534-566](src/features/guardian-inventory/pdf-model.js#L534-L566)'s
  Part V section has no key-value item for either.
- **The bond-requirement breakdown is calculated but never printed.** The
  workbook's `PART V` rows 18-23 itemize restricted/unrestricted cash and
  intangible assets and the calculated bond requirement; the live UI already
  computes exactly this via `calc.restrictedCash()`/`unrestrictedCash()`/
  `restrictedIntang()`/`unrestrictedIntang()`/`bondRequired()`; the PDF's
  Part V section shows only the final Bond Amount/Period/Company the filer
  typed, not the court's own supporting breakdown.

### Cross-form finding: Simplified Accounting's remuneration `amount` is a disconnected field, not an absent one

This corrects the prior version's claim that "no amount field exists
anywhere in the form." It is more precisely wrong than that:

- `probate-guardian-data-model.csv` **line 99** already declares
  `remuneration[].amount` for `simplified_accounting`, sourced to
  `src/core/form/schedule-definitions.js`.
- The **shared** schedule factory there already includes it:
  `remuneration: { factory: () => ({ guardian: '', type: '', description: '', amount: '' }) }`
  ([schedule-definitions.js:32-33](src/core/form/schedule-definitions.js#L32-L33)).
- But Simplified's **own** `emptyDataSimplified()` in `src/core/state.js`
  (line 173) hand-rolls its initial rows as `{guardian:'',type:'',description:''}`
  — bypassing the shared factory and omitting `amount`.
- The UI never renders an `amount` input ([index.js:625-627](src/features/simplified-accounting/index.js#L625-L627)).
- Excel export/import are **not** dead code for this field, contrary to the
  prior version's characterization — export writes it and import reconstructs
  it ([excel.js:235](src/features/simplified-accounting/excel.js#L235), 455)
  — they are simply unreachable today because nothing upstream ever sets it.

So this is an existing three-way disagreement between the schema (has it),
the shared factory (has it), and Simplified's own factory/UI (don't) —
already partially wired for it on the Excel side. The fix is reconciliation,
not "decide whether to add a new field."

### Cross-form finding: Annual's remuneration statutory text is truncated; Simplified's is not

The prior version claimed both forms print the "identical" 744.367(3)(a)
paragraph. They don't:

- **Annual** ([pdf-model.js:1145](src/features/annual-accounting/pdf-model.js#L1145)) prints only:
  "Per 744.367(3)(a), the annual guardianship report must include a
  declaration of all remuneration received by the guardian from any source
  for services rendered to or on behalf of the ward."
- **Simplified** ([pdf-model.js:323](src/features/simplified-accounting/pdf-model.js#L323)) prints
  the same sentence *plus* the workbook's second sentence: "As used in this
  paragraph, the term 'remuneration' means any payment or other benefit made
  directly or indirectly, overtly or covertly, or in cash or in kind to the
  guardian."
- Both original templates carry the full two-sentence paragraph verbatim
  (`PART XI!A5` in Annual's workbook, `PART VII!A5` in Simplified's).

**Annual is the one missing text**, not Simplified — the opposite of what
the prior draft implied by calling them identical.

### Cross-form finding: Simplified Accounting omits its remuneration declaration entirely when empty — the same defect Milestone 58D already fixed for Annual

Annual's remuneration section explicitly guards against this
([pdf-model.js:1124-1133](src/features/annual-accounting/pdf-model.js#L1124-L1133)):

```js
const remDeclaredNone = !!(d.scheduleNoItems && d.scheduleNoItems.remuneration);
if (remList.length > 0 || remDeclaredNone) {
  sections.push({ /* ... always prints the statutory paragraph, plus either
                      the table or "No remuneration reported for this period." */ });
}
```

The comment above it states the reasoning plainly: "744.367(3)(a) requires
the report to INCLUDE a declaration of remuneration, and 'no section at
all' is not a declaration." Simplified's own remuneration section
([pdf-model.js:310-311](src/features/simplified-accounting/pdf-model.js#L310-L311))
has no such guard:

```js
const remList = (d.remuneration || []).filter(r => r && (r.guardian || r.type || r.description));
if (remList.length > 0) {
  sections.push({ /* ... */ });
}
```

If `remList` is empty, **Part VII does not appear in Simplified's PDF at
all** — no paragraph, no "none reported" statement, nothing. Simplified is
subject to the identical statute Milestone 58D was written for, and nobody
checked whether the fix needed to be applied there too — exactly the
failure mode `AGENTS.md` §8.9 now exists to catch.

### 60F's mechanics, corrected

The prior version understated what the `fields`/`details` migration
actually involves:

- **`fields` does not size columns from the widest label present** — that
  behavior belongs to `details`'s `planDetailStack()`
  ([pdf-engine.js:487](src/core/pdf/pdf-engine.js#L487)). `fields` divides
  the block's full width evenly across the fields in each row and uses a
  fixed 28pt row height ([pdf-engine.js:1458](src/core/pdf/pdf-engine.js#L1458)).
- **Grouping cannot be mechanically "preserved."** `details` renders a
  single right-hand vertical stack; `fields` renders explicit full-width
  grouped rows. Converting a block means deciding, row by row, which labels
  belong together — a design decision for each of Annual's four blocks and
  Simplified's three, not a structural transform.
- **One existing regression test hard-codes the `details` label format.**
  `tests/e2e/signature-block-address-margin.spec.ts` (line 164) searches
  rendered text for `'Residence Address:'` — with a trailing colon, which is
  how `details` renders a label. `fields` renders labels without one. This
  test needs an explicit update as part of the migration, not just a
  re-run.
- **Fixed row height needs a wrapping check.** `details`'s height comes from
  `planDetailStack()` measuring the actual wrapped content in advance;
  `fields`'s fixed 28pt-per-row does not expand for a value wrapping to
  three or more lines. Confirm this against the longest real address/label
  combination in each form before treating the migration as visually safe,
  not only against the ordinary one- or two-line case.

---

## Delivery index

| Delivery | Scope | Risk | Depends on |
| --- | --- | --- | --- |
| **60A** | Connect Guardian Inventory's PDF to its existing correct calculator; fix the audit-fee tiers and the unadjusted `restrictedCash` subtotal along the way | Medium — changes printed dollar totals | — |
| **60B** | Display Ward's %/Share (+ the newly found C-1 address, C-3 date, C-4/C-5 city-state-zip) on the PDF | Low | 60A (for the % values) |
| **60C** | Add Type and Account Number columns to A-2 and B-4 | Low | — |
| **60D** | A-2: replace the phantom `relatedProperty` column with the real `notes` field | Low | — |
| **60E** | A-1: remove the phantom, always-blank "Valuation Method" column | Low | — |
| **60F** | Migrate Annual's and Simplified's PDF signature blocks from `details` to `fields`, with explicit per-block row grouping and a wrapping check; update the colon-dependent regression test; retire `details` from `pdf-engine.js` | Medium | — |
| **60G** | Reconcile Simplified's remuneration `amount`: already in the schema and shared factory, missing from Simplified's own factory and UI | Low–Medium (schema-adjacent) | — |
| **60H** | Guardian Part V: render the bond-waiver answer/date and the bond-requirement breakdown table | Low | 60A (for the breakdown figures) |
| **60I** | Annual: restore the full two-sentence remuneration statutory paragraph | Low | — |
| **60J** | Simplified: always render the Part VII remuneration declaration (with a "none reported" fallback), matching Annual's Milestone 58D fix | Low | — |

**B-2/B-3's `amountInSDB` is deliberately not a delivery here.** It's a
missing input, not a missing render — scoping the UI/Excel/PDF work it
actually needs is a separate decision from this document's PDF-fidelity
focus, flagged in the evidence above so it isn't lost.

**Guardian Schedule C-2's missing city/state/zip capture is deliberately not
repeated here either** — it was already identified as a data-model gap in
this document's first version (Excel-path audit, preserved at commit
`3a001f1`) and remains tracked there rather than duplicated.

**B-4's Excel account-number placement (written one line early, per the
first version of this document) is related context for 60C** — both are
about B-4's Account Number — **but is an Excel-path defect, out of scope for
this PDF-focused version.**

---

## 60A — Connect the PDF to Guardian Inventory's existing correct calculator

1. Extract `legacy-app.js`'s `calc` object into
   `src/features/guardian-inventory/totals.js` as an exported
   `calcTotalsGuardian(customD)`, following `annual-accounting/totals.js`'s
   established shape (`const d = customD || window.D || {}`) — reproducing
   its existing formulas exactly (including the bare `/100`, not Annual's
   defensive fraction-or-percent `pct()` — Guardian's UI only ever produces
   0-100 values today, and adopting Annual's convention without checking
   what a *blank* `wardPercent` currently means in each caller is a
   semantic change, not a free defensive improvement; leave that alone
   unless a specific case demonstrates it's needed).
2. Refactor `legacy-app.js`'s `calc` to delegate to the new module (e.g.
   `const calc = makeGuardianCalcAdapter(() => window.D)` or equivalent),
   so the live UI and the PDF consume the *same* implementation rather than
   two that happen to agree today. Every existing `calc.xxx()` call site in
   `legacy-app.js` keeps its current call shape — this is an internal
   refactor of `calc`'s definition, not a rename of its call sites.
3. Update `pdf-model.js` to import `calcTotalsGuardian()` and use its
   `totalA1`…`totalC5`, `netA`, `netB`, `total`, `restrictedCash`,
   `unrestrictedCash`, `restrictedIntang`, `unrestrictedIntang`,
   `bondRequired`, and `auditFee` outputs in place of its own local `sum`/
   `sumWard`/`calcWard` and the four-tier audit-fee ladder at
   [pdf-model.js:552](src/features/guardian-inventory/pdf-model.js#L552).

**Confirm before implementing, not after:** re-verify `calc.auditFee`'s
`$85`-over-`$25,000` rule against the live decoded template's `PART V!G8`/`G9`
one more time immediately before changing `pdf-model.js` — this document's
evidence is strong (an existing, UI-trusted implementation agrees with the
template) but `AGENTS.md` §5 still asks for a direct check before any
calculation change ships.

**Red-first proof:** for each of the schedules whose total changes, create
one entry with a percentage below 100 and a nonzero full value; confirm the
pre-fix PDF total equals the full value; confirm the post-fix PDF total
equals `calcTotalsGuardian()`'s figure exactly (not just "different from
before").

**Audit-fee tier proof — corrected 2026-09-20 after a live run reproduced
the wrong bracket.** A filing whose `total()` lands in `($25,000, $100,000]`
does **not** expose this bug: Annual's borrowed four-tier ladder and
Guardian's real two-tier rule happen to agree there (`$85` either way). The
tiers only diverge above `$100,000`. Use a filing whose `total()` is between
`$100,000` and `$500,000` (e.g. `$120,000`) — confirm the pre-fix PDF prints
`$170.00 ($100k-$500k)` (Annual's third tier, wrong for this form) and the
post-fix PDF prints `$85.00` (Guardian's actual rule, per `PART V!G8`: `$85`
flat for any total over `$25,000`, no upper bound). A total above `$500,000`
also exposes it (pre-fix `$250`, correct `$85`) and is worth a second
fixture for the same reason.

**Expected file surface:** `src/features/guardian-inventory/totals.js` (new);
`src/legacy-app.js` (the `calc` definition only); `src/features/guardian-inventory/pdf-model.js`;
`tests/unit/guardian-inventory-pdf-model.spec.js`; a new or extended unit
spec for `totals.js` itself; `TEST-INDEX.md`.

---

## 60B — Display the missing columns this audit found, once 60A supplies correct figures

Add, per schedule:

- **A-2, B-1, B-4, C-1, C-2, C-3, C-4, C-5**: Ward's % (or Joint Owner's %)
  and Ward's Value/Share columns, sourced from `calcTotalsGuardian()`'s
  per-row helpers, headed to match the original form's own labels where
  practical.
- **C-1**: the payer's address (`composePdfAddressLines(r.payerAddress, r.payerCityStateZip)`).
- **C-3**: an Action Date column (`fmtDate(r.actionDate)`).
- **C-4**: pass `r.trusteeCityStateZip` as `composePdfAddressLines`'s third
  argument so it prints beneath the trustee's name and street address, not
  just the two.
- **C-5**: the same third-argument fix for `r.ownerCityStateZip`.

**Red-first proof:** for each addition, confirm the field is absent from the
generated PDF before the change and present with the correct value after,
using the same fixtures as 60A's proof for the percentage/share columns.

**Expected file surface:** `src/features/guardian-inventory/pdf-model.js`;
`tests/unit/guardian-inventory-pdf-model.spec.js`;
`tests/e2e/pdf-form-specific.spec.ts` or the relevant PDF content-assertion
spec; `TEST-INDEX.md`.

---

## 60C — A-2 and B-4: add Type and Account Number

Add `liabilityType` (header "Type") to both schedules' PDF tables. Add
`accountNumber` as well, rendered as a sub-line under the lender name/address
(matching 60D's pattern below) rather than as an independent table header —
the workbook itself carries the account number on a stacked detail line, not
a distinct column, so a literal new header would be less faithful to the
original form than the sub-line rendering already used elsewhere in this
model.

**Related but out of scope:** the first version of this document (Excel
path, commit `3a001f1`) found B-4's Account Number is written to the wrong
line of its five-line entry block on the *Excel* export. That defect and
this PDF-rendering gap are both about B-4's Account Number but are
independent fixes in independent code paths — resolving this delivery does
not resolve that one.

**Red-first proof:** populate an entry with a non-default `liabilityType`
and an `accountNumber`; confirm neither appears on the generated PDF before
the fix and both appear after.

**Expected file surface:** `src/features/guardian-inventory/pdf-model.js`;
`tests/unit/guardian-inventory-pdf-model.spec.js`; `TEST-INDEX.md`.

---

## 60D — A-2: replace the phantom `relatedProperty` column with the real `notes` field

[pdf-model.js:275](src/features/guardian-inventory/pdf-model.js#L275) reads
`r.relatedProperty`, which does not exist on `scheduleA2` entries — the
column is always blank. Render `scheduleA2`'s real, UI-captured `notes`
field instead, as an italic sub-line under the lender name, matching how
A-1 already renders its own `notes` field. This is a PDF presentation
choice, not a literal transcription of a workbook column — the original
xlsx has no separate "Notes" header for A-2 either.

**Red-first proof:** populate `scheduleA2.notes` with text and confirm it is
absent from the generated PDF before the fix and appears as a sub-line
after.

**Expected file surface:** `src/features/guardian-inventory/pdf-model.js`;
`tests/unit/guardian-inventory-pdf-model.spec.js`; `TEST-INDEX.md`.

---

## 60E — A-1: remove the phantom "Valuation Method" column

[pdf-model.js:258](src/features/guardian-inventory/pdf-model.js#L258) renders a
"Valuation Method" column reading `r.valuationMethod` — a field that belongs
to **B-2 only** (B-3 has neither the field nor the column). `scheduleA1` has
no such field, and the original xlsx's Schedule A-1 has no such column.
Remove the column and header; adjust `colWidths`/`colAlign` accordingly.

**Red-first proof:** confirm the column renders empty for every A-1 row
before the fix and that the table has one fewer column, widths re-summing
correctly, after.

**Expected file surface:** `src/features/guardian-inventory/pdf-model.js`;
`tests/unit/guardian-inventory-pdf-model.spec.js`;
`tests/unit/pdf-model-column-integrity.spec.js`; `TEST-INDEX.md`.

---

## 60F — Retire the legacy `details` signature-block layout

1. Convert Annual Accounting's four `details` blocks (guardians/Part III,
   preparer/Part IV, attorney/Part V, cert attorney/Part X) to `fields`.
   For each, specify the row grouping explicitly rather than assuming a
   1:1 mapping from `Object.keys()` order — decide, per block, which labels
   share a row (Guardian Inventory's own `fields` blocks are the reference
   for reasonable grouping, e.g. Phone + SSN/EIN together, Address alone).
2. Do the same for Simplified Accounting's three `details` blocks
   (guardians/Part IV, attorney/Part V, cert attorney/Part VI).
3. Update `tests/e2e/signature-block-address-margin.spec.ts`'s label lookup
   (currently `'Residence Address:'` with a colon) to match `fields`'
   colon-less label rendering.
4. Test the longest realistic wrapped value in each converted block (a long
   address or a long combined name) against `fields`' fixed 28pt row height,
   not only the ordinary one- or two-line case — `details`' height came from
   measuring the actual content in advance; `fields`' does not.
5. Once nothing sets `details` on a `signature-block` object anywhere in the
   repo (grep to confirm), remove the `details`/`planDetailStack()` branch
   from `src/core/pdf/pdf-engine.js`.

**Red-first proof:** before conversion, confirm the existing address-margin
test passes (establishing the current-format baseline). After conversion,
confirm the updated test passes against the new colon-less format, and
separately confirm field order/grouping matches what was specified in step
1-2 exactly — not merely "looks plausible" — by asserting the rendered text
sequence, not just presence.

**Expected file surface:** `src/features/annual-accounting/pdf-model.js`;
`src/features/simplified-accounting/pdf-model.js`;
`src/core/pdf/pdf-engine.js`;
`tests/e2e/signature-block-address-margin.spec.ts`;
`tests/e2e/pdf-accessibility-and-signatures.spec.ts` or the relevant
signature-block content spec for both forms; `TEST-INDEX.md`.

---

## 60G — Reconcile Simplified Accounting's disconnected remuneration `amount`

**Decision, not an assumed fix.** The field already exists in
`probate-guardian-data-model.csv` and the shared row factory; it is
Simplified's own initial-data factory and UI that never adopted it. Options:

1. **Finish wiring it up**: change `emptyDataSimplified()`
   ([state.js:173](src/core/state.js#L173)) to use the shared
   `SCHEDULE_SCHEMAS.remuneration.factory()` (or otherwise include `amount`),
   add a UI input beside Type, and add the PDF column — Excel already
   handles it on both sides, so this delivery would be UI + factory + PDF
   only.
2. **Confirm the omission is deliberate** and remove `amount` from the CSV
   and shared factory instead, so the schema stops asserting a field
   Simplified never actually uses, and record why here.

**Expected file surface, if option 1:** `src/core/state.js`;
`src/features/simplified-accounting/{index.js,pdf-model.js}`;
`tests/unit/*` and `tests/e2e/*` fixtures touching Simplified's
remuneration; `TEST-INDEX.md`.
**Expected file surface, if option 2:** `probate-guardian-data-model.csv`;
`src/core/form/schedule-definitions.js`; any test asserting the removed
field.

---

## 60H — Guardian Part V: render the bond-waiver answer and the bond-requirement breakdown

1. Add a key-value item for the bond-waiver answer (`d.bondWaived`) and,
   when affirmative, its date (`d.bondWaivedDate`), to the existing "Schedule
   D-4: Guardian Bond" block.
2. Add a table itemizing restricted/unrestricted cash and intangible assets
   and the calculated bond requirement, sourced from 60A's
   `calcTotalsGuardian()` (`restrictedCash`, `unrestrictedCash`,
   `restrictedIntang`, `unrestrictedIntang`, `bondRequired`), matching the
   workbook's `PART V` rows 18-23.

**Depends on 60A** for the breakdown figures; the bond-waiver item does not.

**Red-first proof:** confirm both are absent from the current PDF; confirm
both appear, with figures matching the live UI's own sidebar/calculated
display for the same fixture, after.

**Expected file surface:** `src/features/guardian-inventory/pdf-model.js`;
`tests/unit/guardian-inventory-pdf-model.spec.js`; `TEST-INDEX.md`.

---

## 60I — Annual: restore the full remuneration statutory paragraph

[pdf-model.js:1145](src/features/annual-accounting/pdf-model.js#L1145) prints
only the first sentence of `PART XI!A5`'s statutory text. Add the workbook's
second sentence ("As used in this paragraph, the term 'remuneration' means
any payment or other benefit made directly or indirectly, overtly or
covertly, or in cash or in kind to the guardian.") — Simplified's equivalent
text is the reference for the exact wording already in use elsewhere in this
app.

**Red-first proof:** confirm the generated PDF's Part XI text is missing the
second sentence before the fix and matches the workbook's full paragraph
after.

**Expected file surface:** `src/features/annual-accounting/pdf-model.js`;
`tests/unit/*` covering Annual's PDF text content if one exists, or a new
targeted assertion; `TEST-INDEX.md`.

---

## 60J — Simplified: always render the Part VII remuneration declaration

Mirror Annual's Milestone 58D fix: change
[pdf-model.js:310-311](src/features/simplified-accounting/pdf-model.js#L310-L311)'s
guard so the section renders whenever there are entries *or* whenever the
filer has otherwise reached export (i.e., always, unless this form has no
equivalent of Annual's `scheduleNoItems.remuneration` attestation — confirm
whether Simplified has an analogous "I verify nothing to report" flag before
choosing the empty-state condition; if it does not, render unconditionally
with a "No remuneration reported for this period." fallback, matching
Annual's text).

**Red-first proof:** generate a Simplified PDF for a filing with no
remuneration entries; confirm Part VII is entirely absent before the fix and
present with the statutory paragraph (and appropriate empty-state or table)
after.

**Expected file surface:** `src/features/simplified-accounting/pdf-model.js`;
`tests/unit/*` or `tests/e2e/*` covering Simplified's PDF section presence;
`TEST-INDEX.md`.

---

## Out of scope

- Any change to the Excel export/import path for any of the three forms,
  including B-4's account-number line placement referenced under 60C
  (preserved at commit `3a001f1`).
- B-2/B-3's `amountInSDB` UI/Excel wiring — flagged in the evidence above,
  not scoped as a delivery here; it needs its own UI/data-capture decision
  before a PDF column would mean anything.
- Guardian Schedule C-2's missing city/state/zip capture — tracked from the
  first version of this document, not duplicated here.
- Annual's Schedule B-3 period fields and B-4 description-field naming
  drift relative to the court workbook, checked during this audit and found
  to be schema cleanup candidates, not missing filed output.
- Any change to what counts as "Ward's %" versus "Joint Owner's %" as a
  concept, or to the underlying `full × percent` formula.
- Re-litigating Annual's or Simplified's Schedule A/B-1–B-4/D-1–D-5/E/F-1/F-2
  handling, checked in this and the prior pass and found correct.

## Completion criteria

Milestone 60 is complete only when, for each item the requester has
individually authorized:

1. A red-first test demonstrates the defect against the pre-fix code and
   passes after the fix.
2. Every dollar total on the generated PDF (per-schedule totals, Summary
   I/II, Audit Fee, Bond Requirement) is verified by hand-computing the
   expected figure from the same fixture data against `calcTotalsGuardian()`
   directly, not merely by confirming the code runs without error.
3. For 60A, `legacy-app.js`'s live UI totals and the PDF's totals are
   confirmed to agree exactly for the same fixture, proving genuine
   sharing rather than two implementations that happen to match today.
4. For 60F, no `signature-block` object anywhere in the codebase still sets
   `details` unless a deliberate decision was made to keep it for a stated
   reason, recorded in this document, and the address-margin regression
   test passes against the new format.
5. `probate-guardian-data-model.csv` is updated for any changed persisted
   field (60G).
6. `TEST-INDEX.md` reflects every added or materially changed test.
7. No item outside the requester's explicit approval is touched in the same
   change, per `AGENTS.md` §3.
