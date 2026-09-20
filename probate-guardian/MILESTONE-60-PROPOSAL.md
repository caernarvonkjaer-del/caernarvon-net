# Milestone 60: PDF Fidelity Fixes and Cross-Form Method Unification

## Status

**AUTHORIZED 2026-09-20 by the requester ("Start MS 60"). In progress.**
The authorization names every choice this document had left open, after two
rounds of independent critique of the execution plan (Codex, 2026-09-20):

- All ten deliveries 60A–60J, plus a new **60K** collecting three items the
  earlier passes had listed as out of scope: B-2/B-3's derived safe-deposit
  amount, Schedule C-2's missing city/state/ZIP capture, and B-4's Excel
  account-number line placement. Annual's B-3/B-4 field-naming drift stays
  out (no filed output changes).
- **60G: option 1** — finish wiring the existing remuneration `amount`.
- **60J: full Milestone 58D parity** — an explicit "none received"
  attestation with matching sidebar and export rules, not render-always.
- **Rounding: workbook-style raw aggregation** under the contract stated in
  60A (compute each ward-adjusted value at full precision; sum the unrounded
  values; round the aggregate to cents only when producing a monetary figure
  for display or output; never sum displayed row values).
- **Statutory text sourced from current §744.367(3)(a) itself**, not from a
  corrected transcription of either workbook.
- **Exactly $25,000 total inventory keeps today's `$0` audit fee**, recorded
  below as an unresolved authority gap — not as validated.
- **The final full `npm test` regression is authorized** (`AGENTS.md` §2).
- Session override per `AGENTS.md` §3: defects hit inside the surfaces this
  milestone already touches are fixed within it rather than deferred.
  Pre-existing or concurrent failures unrelated to this milestone are
  diagnosed, recorded in the Progress Log, and brought back to the requester.

The execution plan and Progress Log are at the end of this document.

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
[legacy-app.js:7396-7403](src/legacy-app.js#L7396-L7403)). It applies the
ward percentage everywhere the PDF does not, and its audit-fee rule matches
the template — but it is **not** fully correct, see the rounding note after
the code:

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

**Rounding — verified against the template 2026-09-20, and the legacy
calculator is wrong here.** Every Ward's Value cell in the workbook is a
bare product (`A-1-REAL ESTATE pg 1`!I17 `=G17*H17`, `B-2 PER PROP pg 1`!G18
`=E18*F18`, and so on — no `ROUND()`), and each schedule total sums those
raw products. `calc` rounds every row to cents (`r2(...)`) *before* summing.
With fractional percentages the two disagree by a cent. Adversarial fixture,
computed 2026-09-20: rows `$1,000.05 × 33.33%`, `$2,500.55 × 66.67%`,
`$333.33 × 12.5%` — raw products `333.316665 + 1667.116685 + 41.66625`;
workbook method (sum raw, round the aggregate) **`$2,042.10`**; legacy
method (sum rounded rows) **`$2,042.11`**. The template wins (`AGENTS.md`
§5), so the totals module follows the workbook and the UI adopts it by
delegation. That fixture is 60A's rounding-contract proof.

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
| C-4 | `accountNumber`, `trustType` (required select), `wardPercent` (required) / computed `wardC` | **Missing** — Type and Account Number are 60C's scope, the percentage 60B's (the earlier pass listed them here and then assigned them to no delivery) | [pdf-model.js:406](src/features/guardian-inventory/pdf-model.js#L406) |
| C-4 | `trusteeCityStateZip` | **Missing** — `composePdfAddressLines(r.trusteeName, r.trusteeAddress)` is called with 2 args, dropping the third | same |
| C-5 | `jointOwnerPercent` (required) / computed `wardC` | **Missing** | [pdf-model.js:422](src/features/guardian-inventory/pdf-model.js#L422) |
| C-5 | `ownerCityStateZip` | **Missing** — same 2-arg `composePdfAddressLines` pattern as C-4 | same |

**B-2/B-3's `amountInSDB` is a derived figure, not a missing input —
corrected 2026-09-20 from the template.** `B-2 PER PROP pg 1`!I18 is
`=IF(H18="Yes",G18,0)`: the ward-adjusted value when the safe-deposit-box
answer is Yes, else zero; B-3 has the same shape. The UI already captures
that Yes/No answer (`inSafeDepositBox`). So nothing is missing upstream —
the amount is computable from data the app already holds, exactly like
`restrictedCash`. What is wrong today: `probate-guardian-data-model.csv`
declares `amountInSDB` as a *persisted* field for both schedules (lines 210,
224) and `parseInitialInventoryWorkbook()` writes a literal `0` into it on
import ([excel.js:568](src/features/guardian-inventory/excel.js#L568)) — a
stored copy that can only ever be stale. **60K** computes it in the totals
module, renders it on the PDF, removes the persisted rows, and stops the
importer emitting it.

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
  workbook's `PART V` rows 18-23 (re-read 2026-09-20) are five lines and a
  total: row 18 Schedule B-1 cash in a RESTRICTED depository
  (`='B-1 CASH pg 1'!J56`); row 19 Schedule B-3 intangibles RESTRICTED
  (`='B-3 INTANGIBLE pg 1;'!I68`); row 20 Schedule B-1 cash NOT restricted
  (`='SUMMARY I '!G34-H18`); row 21 **Schedule B-2 personal property assets**
  (`='SUMMARY I '!G35`); row 22 Schedule B-3 intangibles NOT restricted
  (`='SUMMARY I '!G36-H19`); row 23 Total for BOND REQUIREMENT `=G20+G21+G22`.
  The live UI already computes each via `calc.restrictedCash()`/
  `unrestrictedCash()`/`totalB2()`/`restrictedIntang()`/`unrestrictedIntang()`/
  `bondRequired()`; the PDF's Part V section shows only the final Bond
  Amount/Period/Company the filer typed, not the court's own supporting
  breakdown.

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

**Neither app's text is the workbook's, either — re-read 2026-09-20.**
Simplified's `PART VII`!A5 actually reads: "Per 744.367(3)(a), the annual
guardianship report of a guardian of the poperty and the annual guardianship
report of a guardian of the person must both include a declaration of all
remuneration received by the guardian from any source for services rendered
to or on behalf of the ward. As used in this paragraph, the term
'remuneration' means any payment or other benefit made directly or
indirectly, overtly or covertly, or in case or in kind to the guardian."
Both apps drop the "guardian of the property … guardian of the person …
both" clause, and the clerk's transcription carries two typos ("poperty",
"in case"). Decision (requester, 2026-09-20): the paragraph both forms print
is sourced from the **current text of §744.367(3)(a) itself**, which
outranks the clerk's instrument (`AGENTS.md` §5), held in one shared
constant that names the statute as its source; the workbooks establish only
*where* the paragraph belongs. If the statute cannot be retrieved and
verified at execution time, work stops and the requester is told — an
editorially repaired transcription is not substituted silently.

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

| Delivery | Scope | Risk | Depends on | Shares a file/region with |
| --- | --- | --- | --- | --- |
| **60A** | Connect Guardian Inventory's PDF to its existing correct calculator; fix the audit-fee tiers and the unadjusted `restrictedCash` subtotal along the way | Medium — changes printed dollar totals | — | `guardian-inventory/pdf-model.js` (broadly) |
| **60B** | Display Ward's %/Share (+ the newly found C-1 address, C-3 date, C-4/C-5 city-state-zip) on the PDF | Low | **60A**, hard (needs `calcTotalsGuardian()` for the values) | 60C, 60D on A-2's row; 60C on B-4's and C-4's rows |
| **60C** | Add Type and Account Number to A-2, B-4 **and C-4** (trust type / trust account number — omitted from every earlier draft's delivery list despite being in the evidence table) | Low | — | 60B, 60D on A-2's row; 60B on B-4's and C-4's rows |
| **60D** | A-2: replace the phantom `relatedProperty` column with the real `notes` field | Low | — | 60B, 60C on A-2's row |
| **60E** | A-1: remove the phantom, always-blank "Valuation Method" column | Low | — | none (A-1's row is untouched by any other delivery) |
| **60F** | Migrate Annual's and Simplified's PDF signature blocks from `details` to `fields`, with explicit per-block row grouping and a wrapping check; update the colon-dependent regression test; retire `details` from `pdf-engine.js` | Medium | — | 60I (same file, different section, `annual-accounting/pdf-model.js`); 60G, 60J (same file, different section, `simplified-accounting/pdf-model.js`) |
| **60G** | Reconcile Simplified's remuneration `amount`: already in the schema and shared factory, missing from Simplified's own factory and UI | Low–Medium (schema-adjacent) | — | 60J, directly — both edit Simplified's Part VII block |
| **60H** | Guardian Part V: render the bond-waiver answer/date and the bond-requirement breakdown table | Low | **60A**, hard, for the breakdown table only — the bond-waiver half is independent | none beyond the shared file |
| **60I** | Annual: restore the full two-sentence remuneration statutory paragraph | Low | — | 60F (same file, different section) |
| **60J** | Simplified: full Milestone 58D parity — explicit "none received" attestation, sidebar and export rules, and the Part VII declaration printed on every filing | Medium (new export rule, fixture sweep) | — | 60G, directly — both edit Simplified's Part VII block; 60F (same file, different section) |
| **60K** | Newly authorized cross-path items: derived B-2/B-3 safe-deposit amounts; C-2 city/state/ZIP capture; B-4 Excel account-number line | Medium (schema + Excel path) | **60A** for the derived amounts | 60B–60E on B-2/B-3/C-2 rows in `pdf-model.js`; `guardian-inventory/excel.js` alone otherwise |

**Reading the table:** "Depends on" is a real logical dependency — implementing
out of that order produces something that has to be redone. "Shares a
file/region with" is not a dependency — either order works — but is a real
merge-conflict/rework risk if the two are picked up separately (`AGENTS.md`
§2: a shared file is worth checking before assuming safe to parallelize,
independent of whether either document calls the other a prerequisite).
The concentration point is **A-2's row-mapping array**, touched by three
separate deliveries (60B, 60C, 60D) — if more than one of those three is
approved, doing them together avoids diffing the same handful of lines three
times. **Simplified's Part VII block** (60G, 60J) is the other tight pairing.
60E stands alone: nothing else in this document touches A-1.

**The three items earlier passes set aside — B-2/B-3's safe-deposit amount,
Schedule C-2's city/state/ZIP capture, and B-4's Excel account-number line
(first found in the Excel-path audit at commit `3a001f1`) — were pulled into
scope by the requester on 2026-09-20 as delivery 60K**, so that they are
authorized, logged and tested under a name rather than "folded in."

---

## 60A — Connect the PDF to Guardian Inventory's existing correct calculator

1. Extract `legacy-app.js`'s `calc` object into
   `src/features/guardian-inventory/totals.js` as an exported
   `calcTotalsGuardian(customD)`, following `annual-accounting/totals.js`'s
   established shape (`const d = customD || window.D || {}`) — keeping its
   per-schedule field mapping and the bare `/100` (not Annual's
   fraction-or-percent `pct()`; Guardian's UI only ever produces 0-100
   values, and a blank `wardPercent` keeps meaning 0), but **replacing its
   per-row rounding with the workbook's rule**. **Rounding contract
   (approved by the requester 2026-09-20):** compute each ward-adjusted
   value at full precision; sum those unrounded values; round the aggregate
   to cents only when producing a monetary figure for display or output;
   never sum already-rounded row displays. The per-row helpers
   (`wardVal(e)` etc.) return the full-precision product; callers round for
   display.
2. Refactor `legacy-app.js`'s `calc` to a thin adapter over the module, so
   the live UI and the PDF consume the *same* implementation. Every existing
   `calc.xxx()` call site in `legacy-app.js` and
   `guardian-inventory/index.js` keeps its current call shape.
3. Update `pdf-model.js` to import `calcTotalsGuardian()` and use its
   outputs in place of its own local `sum`/`sumWard`/`calcWard` and the
   four-tier audit-fee ladder at
   [pdf-model.js:552](src/features/guardian-inventory/pdf-model.js#L552).
4. **Bridge files the earlier draft omitted:** eager-load the module from
   `src/features-loader.js` (the Annual totals precedent at line 26) and
   publish `window.calcTotalsGuardian`; regenerate
   `src/core/types/window-bridge.d.ts` and
   `tests/unit/fixtures/window-bridge-allowlist.json` with
   `node scripts/audit-window-bridge.mjs --declare` so
   `tests/unit/window-bridge.spec.js` stays green by a deliberate edit, not
   an accident.

**Exactly $25,000 is an unresolved authority gap, preserved as-is.** The
template's own labels are "in excess of $25,000" → `$85` (`PART V`!G8) and
"below $25,000" → `$0` (G9); a total of exactly `$25,000` matches neither
label. `calc.auditFee` uses `> 25000`, so exactly `$25,000` prints `$0`.
This milestone keeps that behavior unchanged and does **not** treat it as
validated; a boundary test pins the current behavior so a future change is
deliberate. Resolving it needs the Clerk or a qualified person (`AGENTS.md`
§8.8).

**Confirm before implementing, not after:** re-verify `calc.auditFee`'s
`$85`-over-`$25,000` rule against the live decoded template's `PART V!G8`/`G9`
one more time immediately before changing `pdf-model.js` — this document's
evidence is strong (an existing, UI-trusted implementation agrees with the
template) but `AGENTS.md` §5 still asks for a direct check before any
calculation change ships.

**Red-first proofs — four independent tests, because one fixture can turn
`$170` into `$85` through either bug:**

1. **Fee rule alone:** a filing totalling `$120,000` at **100%** ownership.
   Pre-fix PDF prints `$170.00 ($100k-$500k)` (Annual's third tier, wrong
   for this form); post-fix prints `$85.00`. A filing in `($25,000, $100,000]`
   does **not** expose this — both ladders say `$85` there (a live run on
   2026-09-20 confirmed it). Above `$500,000` also exposes it (`$250` vs
   `$85`) and is a second fixture.
2. **Apportionment alone:** one row per changed schedule with a percentage
   below 100 and a nonzero full value; pre-fix PDF total equals the full
   value; post-fix equals the hand-computed ward value exactly.
3. **Boundaries:** exactly `$25,000` → `$0` (the preserved gap), `$25,000.01`
   → `$85`, `$100,000` → `$85`, `$500,000.01` → `$85`.
4. **Rounding contract:** the three-row fixture from the evidence section —
   displayed rows `$333.32 + $1,667.12 + $41.67 = $2,042.11`, displayed
   aggregate **`$2,042.10`**; the module must produce the latter.

**Parity proof (completion criterion 3):** one fixture with mixed
percentages run through `calcTotalsGuardian()`, `window.calc` (via the
adapter), and `buildVerifiedInventoryModel()`; every schedule total, both
summaries, every bond line and the audit fee must be identical. A source
scan that the formulas no longer live in `legacy-app.js` is secondary
evidence only.

**Expected file surface:** `src/features/guardian-inventory/totals.js` (new);
`src/legacy-app.js` (the `calc` definition only); `src/features/guardian-inventory/pdf-model.js`;
`src/features-loader.js`; `src/core/types/window-bridge.d.ts`;
`tests/unit/fixtures/window-bridge-allowlist.json`;
`tests/unit/guardian-inventory-pdf-model.spec.js`;
`tests/unit/guardian-inventory-totals.spec.js` (new); `TEST-INDEX.md`.

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

**Layout proof (60B–60E together, per the 2026-09-20 plan review):** adding
two or three columns to already-wide schedules can render every value and
still be unreadable. Three layers, because extracted PDF text widths are not
reliable physical ink widths (an existing test documents this): (a) unit
assertions on the model for column count, width reconciliation and field
mapping (`pdf-model-column-integrity.spec.js` plus targeted cases);
(b) extracted-text e2e assertions for content and reading order only;
(c) rendered-canvas inspection — the technique
`tests/e2e/signature-block-address-margin.spec.ts` already uses — for the
real concerns on A-2, C-1, C-3 and C-4 with long realistic values: no ink
past the content box, rows growing with wrapped content, no row split
across a page break.

**Expected file surface:** `src/features/guardian-inventory/pdf-model.js`;
`tests/unit/guardian-inventory-pdf-model.spec.js`;
`tests/e2e/pdf-accessibility-and-signatures.spec.ts` (its fixture seeds the
phantom `relatedProperty`/A-1 `valuationMethod` fields and must seed real
ones); a new e2e layout spec for the widened schedules; `TEST-INDEX.md`.

---

## 60C — A-2, B-4 and C-4: add Type and Account Number

Add `liabilityType` (header "Type") to A-2's and B-4's PDF tables, and
`trustType` (header "Type") to C-4's. Add `accountNumber` to all three,
rendered as a sub-line under the lender/trustee name (matching 60D's pattern
below) rather than as an independent table header — the workbook itself
carries the account number on a stacked detail line, not a distinct column,
so a literal new header would be less faithful to the original form than
the sub-line rendering already used elsewhere in this model. C-4 was in
every earlier draft's evidence table and in none of their deliveries; the
2026-09-20 plan review caught it.

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
4. **Engine first (decided in the 2026-09-20 plan):** rather than testing
   around `fields`' fixed 28pt row height, make each `fields` row as tall as
   its tallest wrapped label or value across every column (minimum 28pt),
   and include that height in the block's page-space reservation. This
   changes the shared renderer for Guardian Inventory's existing `fields`
   blocks too, so it carries regression coverage for those, plus a
   three-or-more-line value case, canvas margin/overlap checks, and
   text-order/tag assertions.
5. Remove the `details`/`planDetailStack()` branch from
   `src/core/pdf/pdf-engine.js` only after **both** a static search finds no
   `details:` on any `signature-block` and a runtime pass building all nine
   PDF models (the `pdf-model-column-integrity.spec.js` builder list)
   confirms no block carries one.

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

**Decided 2026-09-20 by the requester: option 1.** Implementation note from
the plan review: `emptyDataSimplified()` gains `amount: ''` directly rather
than importing `schedule-definitions.js` into `core/state.js` for one row
literal — that import direction is an initialization coupling nobody asked
for. A drift-guard unit test asserts the hand-rolled row's keys equal
`SCHEDULE_SCHEMAS.remuneration.factory()`'s keys instead.

**Expected file surface:** `src/core/state.js`;
`src/features/simplified-accounting/{index.js,pdf-model.js}`;
`tests/unit/*` and `tests/e2e/*` fixtures touching Simplified's
remuneration; `TEST-INDEX.md`.

---

## 60H — Guardian Part V: render the bond-waiver answer and the bond-requirement breakdown

1. Add a key-value item for the bond-waiver answer (`d.bondWaived`) and,
   when affirmative, its date (`d.bondWaivedDate`), to the existing "Schedule
   D-4: Guardian Bond" block.
2. Add a table with exactly the workbook's `PART V` rows 18-23, in order:
   B-1 cash in a restricted depository; B-3 intangibles restricted; B-1 cash
   not restricted; **B-2 personal property assets**; B-3 intangibles not
   restricted; Total for Bond Requirement (the sum of the last three).
   Sourced from 60A's `calcTotalsGuardian()` (`restrictedCash`,
   `restrictedIntang`, `unrestrictedCash`, `totalB2`, `unrestrictedIntang`,
   `bondRequired`).

**Depends on 60A** for the breakdown figures; the bond-waiver item does not.

**Red-first proof:** confirm both are absent from the current PDF; confirm
both appear after. Verify each printed line **by recomputing it by hand from
the fixture against the workbook's formulas** (rows 18-23 above), not
against the live UI — the shared module means the UI and the PDF could agree
on the same mistake.

**Expected file surface:** `src/features/guardian-inventory/pdf-model.js`;
`tests/unit/guardian-inventory-pdf-model.spec.js`; `TEST-INDEX.md`.

---

## 60I — Annual: restore the full remuneration statutory paragraph

[pdf-model.js:1145](src/features/annual-accounting/pdf-model.js#L1145) prints
only the first sentence of `PART XI!A5`'s statutory text, and (see the
evidence section) even that sentence is not the paragraph the court form
carries. Replace it with a shared constant in `src/core/` holding the
current text of **§744.367(3)(a)** itself, retrieved and verified at
execution time and cited as its source in a comment; Simplified (60J) prints
the same constant. If the statute cannot be retrieved, stop and report.

**Red-first proof:** confirm the generated PDF's Part XI text is missing the
second sentence before the fix and equals the shared constant after.

**Expected file surface:** `src/core/filing/statutory-text.js` (new, or the
nearest existing home for shared court copy);
`src/features/annual-accounting/pdf-model.js`;
`tests/unit/annual-accounting-pdf-model.spec.js`; `TEST-INDEX.md`.

---

## 60J — Simplified: full Milestone 58D parity for the Part VII declaration

Simplified has no "I verify nothing to report" flag today (confirmed: zero
`scheduleNoItems` references under `src/features/simplified-accounting/`).
The requester chose full parity over render-always on 2026-09-20, because
render-always would let a filer who never opened Part VII file a PDF that
affirmatively declares no remuneration was received. Full surface, mirroring
Annual's 58D:

1. **Persisted state:** `scheduleNoItems.remuneration` (boolean) for the
   `simplified` filing type, with a `probate-guardian-data-model.csv` row.
2. **UI:** an "I verify there is no remuneration to report" checkbox on
   Part VII, using the same control Annual's Part XI uses.
3. **Normalization:** `normalizeWardData()` clears the flag when any
   remuneration row is populated (Annual's rule at
   [legacy-app.js:6442](src/legacy-app.js#L6442) extended to `simplified`);
   the two blank placeholder rows `emptyDataSimplified()` seeds are never
   treated as entries.
4. **Sidebar rule:** `s-p7` is complete when a complete row exists *or* the
   flag is set (Annual's `a-p11`/`verifiedEmpty('remuneration')` shape).
5. **Export rule:** `validateSimplified()` blocks export until Part VII is
   answered, with Annual's issue text
   ([annual-accounting/index.js:1668-1670](src/features/annual-accounting/index.js#L1668-L1670)).
   `checklist-export-parity.spec.js` must stay green with no new
   `KNOWN_GAPS` entry.
6. **PDF:** Part VII prints on every filing — the statutory paragraph (60I's
   shared constant) plus either the entries table (with 60G's Amount column)
   or "No remuneration reported for this period."
7. **Fixture sweep (`AGENTS.md` §8.3):** every `fillMinimalValid*` /
   baseline fixture for Simplified gains the attestation or an entry.
8. **Portability:** a `.sav` saved before this change loads with the flag
   unanswered (never coerced), so an old filing is prompted, not blocked
   silently or passed silently.

**Red-first proof:** (a) a Simplified PDF with no remuneration entries has
no Part VII before and has it after, with the "none reported" text when the
flag is set; (b) a nav/export truth table — no rows + no flag → sidebar
incomplete and export blocked; flag set → both satisfied; a populated row →
both satisfied and the flag cleared.

**Expected file surface:** `src/features/simplified-accounting/{index.js,pdf-model.js}`;
`src/legacy-app.js` (`normalizeWardData`, `computeNavChecks` `s-p7`);
`probate-guardian-data-model.csv`; `tests/unit/*` and `tests/e2e/*`
Simplified fixtures; a new truth-table spec; `TEST-INDEX.md`.

---

## 60K — Newly authorized cross-path items (added 2026-09-20)

Three items earlier passes set aside, pulled in by the requester so they are
fixed under a name. Each has its own red-first test.

1. **B-2/B-3 safe-deposit amount, derived — never stored.** The totals
   module computes per row `inSafeDepositBox === 'Yes' ? wardValue : 0`
   (the workbook's `=IF(H18="Yes",G18,0)`) and a per-schedule total; the
   PDF's B-2 and B-3 tables gain an "Amount in Safe Deposit Box" column and
   total. The persisted `amountInSDB` rows come out of
   `probate-guardian-data-model.csv` (lines 210, 224), the importer stops
   emitting the field (`excel.js:568-569`), and normalization ignores it on
   old saves. Cached workbook formula results are never read for it.
   Depends on 60A.
2. **Schedule C-2 city/state/ZIP capture.** New `scheduleC2[].claimantCityStateZip`
   (data-model row, `mk.c2()` factory, UI input beside the existing address
   line, Excel write to the form's own city/state/ZIP line and matching
   read, PDF sub-line via `composePdfAddressLines`'s third argument). Legacy
   fallback: a save holding only the single `claimantAddress` line prints and
   exports exactly as it does today.
3. **B-4 Excel account-number line.** The exporter writes the account number
   to the line the form labels for it (one line later than today, per the
   `3a001f1` audit); the importer reads the correct line first and falls
   back to the old wrong line so workbooks exported before this fix still
   round-trip. Verified by reading the exported file, never by re-import
   alone (`AGENTS.md` §5).

**Expected file surface:** `src/features/guardian-inventory/{totals.js,pdf-model.js,excel.js,index.js}`;
`src/legacy-app.js` (`mk.c2` factory, normalization);
`probate-guardian-data-model.csv`; `tests/unit/guardian-inventory-*.spec.js`;
`tests/e2e/guardian-inventory-excel-schedule-layout.spec.ts`; `TEST-INDEX.md`.

---

## Out of scope

- Any change to the Excel export/import path for any of the three forms
  **other than 60K's two named Guardian items**.
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
8. Every phase's verification ran and passed **before** that phase's commit
   and Progress Log entry; the full `npm test` regression passed **before**
   the status line above changed to Landed.

---

## Execution plan (approved 2026-09-20 after two rounds of independent critique)

One commit per phase, direct to master, each carrying its Progress Log entry
below. The full unit suite runs after every phase; targeted e2e wherever
rendered PDF text changes; the full regression once, in Phase 6.

| Phase | Deliveries | Why this order |
| --- | --- | --- |
| 0 | Authorization, choices, rounding fixture, baseline specs | Settles the summation rule before any calculation code exists |
| 1 | 60A | Everything downstream reads the totals module |
| 2A | 60B, 60C, 60D, 60E | All edit the same schedule row arrays — one pass, one diff |
| 2B | 60K | Cross-path (schema/Excel) work kept separate from the pure-PDF pass |
| 3 | 60H | Needs 60A's bond lines |
| 4 | 60G, 60I, 60J | The remuneration cluster; 60G and 60J share Simplified's Part VII block; lands before 60F so 60F's diff is signature blocks only |
| 5 | 60F | Broadest engine change, last, so anything it disturbs is isolated from the fidelity fixes already landed |
| 6 | Full regression → Landed | Regressions caused by this milestone are fixed before landing; unrelated failures are diagnosed, logged, and brought back to the requester |

## Progress Log

- **2026-09-20 — Phase 0.** Authorization recorded (see Status). Rounding
  fixture computed three ways (evidence section) — workbook `$2,042.10` vs
  legacy `$2,042.11`; module follows the workbook. Baseline specs green
  before any change: `guardian-inventory-pdf-model`,
  `pdf-model-column-integrity`, `annual-accounting-pdf-model`,
  `simplified-no-blank-pages`, `boot-ordering`, `test-index-guard`,
  `checklist-export-parity`, `plan-simplified-parity` — 8 files, 59 tests.
  Template re-read for `PART V` rows 7-9 and 18-23, `A-1`/`B-2` value
  formulas, and Simplified `PART VII`!A5 (all quoted above). No code
  changed in this phase. Commit `42fe2c7`.
- **2026-09-20 — Phase 1, 60A. Landed.** New
  `src/features/guardian-inventory/totals.js` (`makeGuardianCalc`,
  `calcTotalsGuardian`, `wardShare`, `isRestrictedAnswer`, `auditFeeFor`;
  unrounded throughout, per the rounding contract); eager import in
  `features-loader.js`; `window.calcTotalsGuardian`/`window.makeGuardianCalc`
  added to the allow-list and `window-bridge.d.ts` regenerated with the audit
  script; `legacy-app.js`'s `calc` is now a fixed-name adapter forwarding to
  the module (its private `isRestrictedAnswer` moved into the module); the
  PDF model imports the module for every figure, prints the two-tier fee with
  its base, formats a negative net as `-$4,000.00`, and prints a blank Ward's
  % as `—` rather than `100%`. **Red-first:** six new PDF-model tests failed
  on the unfixed model for the stated reasons — `$170.00 ($100k-$500k)`,
  `$250.00 (> $500k)`, `$1,000.00` where the 50% share is `$500.00`, `100%`
  printed for a blank percentage, `$0.00` where the clamped net is
  `-$4,000.00`; the legacy `calc` source, evaluated as shipped, gave
  `2042.11` on the rounding fixture. **Green:** targeted 6 files / 72 tests;
  full unit suite 104 files / 1222 tests; live e2e
  `pdf-accessibility-and-signatures` + `guardian-inventory-mount`, 17
  passed (proves the adapter finds the module at runtime, which unit tests
  cannot). **Fixture correction (§8.3):** two pre-existing PDF-model
  fixtures had B-1 rows with no `wardPercent` and expected the full figure;
  they now say `100`, because a blank percentage is 0% (as in the workbook)
  and the old expectation only held while the PDF ignored the percentage.
  **Folded in (session override):** Summary I's `Math.max(0, …)` clamp on
  both nets — the workbook's `SUMMARY I`!H32/H38 do not clamp, so a filing
  whose debts exceed its assets printed `$0.00` where the court form shows
  the negative figure. **Printed-number changes a filer will see:** every
  ward-apportioned schedule total, both summaries, the audit fee above
  `$100,000`, the B-1 restricted amounts, negative nets, and cent-level
  rounding on fractional percentages — all now match the workbook. Commit
  `d8b4f74`.
- **2026-09-20 — Phase 2A, 60B + 60C + 60D + 60E. Landed.** One pass over the
  schedule arrays in `guardian-inventory/pdf-model.js`, with the court form's
  column labels. **Red-first — 17 new PDF-model tests failed on the unfixed
  model, each for one intended defect (no fixture cascade; the 14
  pre-existing tests stayed green):**
  - 60E ×1: A-1 headers contained `'Valuation Method'`.
  - 60D ×1: A-2 headers contained `'Related Property Description'` (the
    phantom `relatedProperty` column) and no notes sub-line.
  - 60C ×3: A-2 and B-4 headers lacked `'Type'`; C-4 headers lacked
    `'Type'`/`'Account Number'`.
  - 60B ×7 (one per schedule A-2, B-1, B-4, C-1, C-2, C-3, C-4): headers
    lacked `"Ward's %"` and the share column.
  - 60B ×1: C-5 headers lacked `"Joint Owner's %"`/`"Joint Owner's Value"`.
  - 60B ×4: C-1 row lacked the payer's street/city-state-ZIP; C-3 headers
    lacked `'Action Date'`; C-4 row lacked `trusteeCityStateZip`; C-5 row
    lacked `ownerCityStateZip` (the two-argument `composePdfAddressLines`
    calls — its real signature is variadic, one line per argument, so the
    three-argument calls are within contract).
  **B-1's column order is now the form's** (`'B-1 CASH pg 1'` row 17:
  description block, Restricted?, Type?, Full Asset Amount, Ward's %, Ward's
  Asset Amount, Restricted Asset Amount), which also puts both totals in the
  last two columns where the engine places multi-value totals; the two
  pre-existing B-1 tests were re-pointed and now assert the exact header
  sequence, so the change is grounded in the authority, not in the output.
  **C-4 gets literal Type and Account Number columns** (its form has them);
  A-2/B-4 get the account number as a sub-line (their form stacks it).
  **Layout defect found while writing the new e2e spec, and fixed in the
  same pass (session override):** the first cut gave dates 9% columns
  (42pt); a date is ~45pt at 8pt, and with no space to break on the engine's
  word-wrapper split `02/14/2026` character-wise onto two lines — the
  filed PDF read `02/14/20` over `26`. The boundary trace (fixture → `window.D`
  after autosave/flush → preflight date-draft commit → `normalizeWardData`
  → `buildVerifiedInventoryModel` → engine) showed the value intact at every
  boundary through the model; the engine's `measureCell` was the point of
  loss. B-2's pre-existing 8% Ward's Value column (37pt) did the same to any
  seven-figure amount. Two fixes: every date/percent/currency column is
  sized for its widest realistic token (dates ≥ 11%, percentages ≥ 9%,
  currency ≥ 13%, B-2 re-proportioned), and `pdf-engine.js`'s `measureCell`
  now shrinks a single whitespace-free token that exceeds its column to fit
  (6pt floor) instead of splitting it — scoped to plain table cells, so prose,
  addresses and mixed cells wrap exactly as before.
  **Fault-injection record (each: inject → red → restore → green):**
  (1) A-2 `colWidths` inflated to sum 130 → the margin test failed with ink
  42pt past the right edge; restored → green. Neither engine version
  overflows on its own, so this proves the assertion detects a violation,
  not that a production overflow was fixed. (2) `pdf-engine.js`'s change
  stashed → the intact-token test on the live fixture **still passed**,
  because the widened columns alone hold the fixture's tokens; so the engine
  change has its own proof: an engine-level case that starves C-3's date
  column to 5% and reads the generated PDF's text items back — red with the
  engine change stashed (`02/14/20` + `26`), green with it.
  **Green:** `guardian-inventory-pdf-model` 31 tests + `pdf-model-column-integrity`
  3; new `tests/e2e/guardian-inventory-schedule-layout.spec.ts` 5/5 (canvas
  ink for the margin, span positions for row growth / page membership /
  header-value association / reading order, PDF text items for the engine
  case); the e2e fixture in `pdf-accessibility-and-signatures.spec.ts` now
  seeds real fields (no A-1 `valuationMethod`, A-2 `notes` not
  `relatedProperty`, `wardPercent` on every apportioned row).
  **Pre-commit record:** `npx vitest run` → 104 files, 1239 tests passed;
  `npm run check:types` → clean; `git diff --check` → exit 0;
  `npx playwright test tests/e2e/pdf-accessibility-and-signatures.spec.ts tests/e2e/guardian-inventory-mount.spec.ts tests/e2e/guardian-inventory-schedule-layout.spec.ts`
  → 22 passed; `git stash list` → empty (both injections restored, confirmed
  by re-reading the restored lines); `git status --short` → exactly the seven
  Phase 2A files (`MILESTONE-60-PROPOSAL.md`, `TEST-INDEX.md`,
  `src/core/pdf/pdf-engine.js`, `src/features/guardian-inventory/pdf-model.js`,
  `tests/e2e/pdf-accessibility-and-signatures.spec.ts`,
  `tests/unit/guardian-inventory-pdf-model.spec.js`, new
  `tests/e2e/guardian-inventory-schedule-layout.spec.ts`), no generated PDFs
  or test artifacts, nothing from 60K or Phase 3; the temporary boundary-trace
  spec was deleted before staging.
