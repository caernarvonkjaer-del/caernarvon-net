# Milestone 61: Plan-Form Source-to-PDF Fidelity

## Status

**DRAFT — findings and proposed fixes only. No implementation is authorized.**

Baseline: MS 60 completion tree, including the four plan features:

- `plan-simplified`
- `plan-annual`
- `plan-initial`
- `plan-minor`

## Purpose

Audit and repair the path from plan-form UI input to persisted state, export
validation, and generated PDF. The review uses the same model as MS 60:

```text
court source/template → UI field → state/schema → validator → PDF model → output
```

The supplied original PDFs were independently text-extracted. Findings below
are separated into confirmed defects and policy/template decisions.

**Evidence-trail gap, noted 2026-09-20 (Claude), unresolved.** Unlike the
three Milestone 60 forms, none of the four plan types has an embedded
court `.xlsx` in this repo — they are wet-signed narrative PDFs authored
from scratch (Milestone 19-2), so there is no template artifact a later
reviewer can decode to re-derive 61D's/61E's authority. Whatever "original
PDFs" were used for those two findings, and whatever text was extracted
from them, exist outside this repo and outside this document. Before 61D
or 61E is authorized, either the source PDFs or their extracted text should
be committed as citable evidence — the way MS 60 kept its decode scripts
and exact cell citations — so a reviewer can check the claim without
re-obtaining the same PDFs from whoever originally supplied them. 61A, 61B,
61C, 61F, and 61G do not have this problem: every citation in those
sections resolves to a line in this repo.

## Verified findings

### 61A — Simplified certification schema coverage

**Confidence: Confirmed.**

The Simplified Plan UI captures preparer and attorney certification fields in
`src/features/plan-simplified/index.js:303-326`, and the PDF model consumes
them in `src/features/plan-simplified/pdf-model.js:137-163`. However:

- `emptyDataPlanSimplified()` does not initialize those scalar fields
  (`src/core/state.js:198-208`).
- `probate-guardian-data-model.csv` has no `plan_simplified` rows for the
  preparer or attorney certification fields; its plan-specific rows end with
  the guardian fields (`probate-guardian-data-model.csv:306-332`).

This is a schema, blank-factory, verification, and legacy-data migration gap.
It is not currently proof that same-session values fail to reach the PDF.

**Correction to the proposed fix (2026-09-20, Claude, verified against the
three sibling factories):** Phase 1 says to add these fields "using the
existing plan-minor/plan-initial naming conventions." That is imprecise
enough to cause an over-broad fix. `emptyDataPlanMinor()`
(`src/core/state.js:415-423`) is the nearest sibling — it is the only other
plan type with *both* a preparer and an attorney role — but it also carries
`preparer_tin` and per-role `preparer_signatureState`/`preparer_signatureImage`
and `attorney_signatureState`/`attorney_signatureImage`. Plan Simplified's own
UI (`src/features/plan-simplified/index.js:298-326`) and PDF model
(`src/features/plan-simplified/pdf-model.js:137-163`) use neither a TIN field
nor per-role signature-stamp state for preparer/attorney — Milestone 39-C's
signature-stamp control is confirmed absent from those two blocks in this
form (only the guardian role has it, per the pdf-model's own "Milestone 39-B
pilot: only the Guardian role carries these yet" comment at line 127). The
fix must add exactly the fields Plan Simplified's own files already read and
write: `preparer_name`, `preparer_phone`, `preparer_email`,
`preparer_mailingStreet`, `preparer_cityStateZip`, `preparer_signatureDate`,
`attorney_name`, `attorney_bar`, `attorney_phone`, `attorney_signatureDate`,
`attorney_email`, `attorney_secondary_email`, `attorney_street`,
`attorney_cityStateZip` — no TIN field, no signature-stamp state for either
role. Adding fields nothing reads would itself be an unrequested schema
change.

### 61B — Partial collection rows can disappear from output

**Confidence: Confirmed.** The PDF models and validators use narrower
population predicates than the UI exposes. A row containing only secondary
fields can pass validation and be omitted from the PDF.

- **Annual Q1:** UI captures dates and phone, while PDF/validator inclusion
  checks only name, street, or city/state/ZIP
  (`plan-annual/pdf-model.js:102-104`; `plan-annual/index.js:684-686`).
- **Annual Q4:** UI captures address and phone, while inclusion checks only
  name, provider type, or visits (`plan-annual/pdf-model.js:267-269`;
  `plan-annual/index.js:698-700`).
- **Initial Q9:** UI captures address and phone, while PDF inclusion checks
  only name, provider type, or exam date
  (`plan-initial/pdf-model.js:222-224`).
- **Initial Q11 directives:** UI captures agents, alternates, relationship,
  contact, order date, and county, while PDF inclusion checks only title,
  signed date, or signer (`plan-initial/pdf-model.js:407-408`).
- **Minor Q2:** UI captures state, ZIP, and phone, while PDF inclusion checks
  only name, street, or city (`plan-minor/pdf-model.js:104`).
- **Minor Q3:** UI captures visits, address, and phone, while PDF inclusion
  checks only first name, last name, or provider type
  (`plan-minor/pdf-model.js:105`).

The same rule must drive row-start detection, validation, and PDF emission;
otherwise entered data can be silently discarded.

**The evidence table above is incomplete — the same predicate exists a
third time, in a file neither cited (2026-09-20, Claude, verified directly
against source, exact line numbers, not from any live-execution report):**
`computeNavChecks()` in `src/legacy-app.js` builds its own local copy of each
narrow predicate to decide the "complete" (green) state for the identical
sidebar section:

- Plan Annual Q1/Q4 — `src/legacy-app.js:6917-6918`, feeding `pa-p2`
  (`:6927`) and `pa-p5` (`:6943`).
- Plan Initial Q9 — `src/legacy-app.js:7001`, feeding `pi-p5` (`:7031`).
- Plan Minor Q3 — `src/legacy-app.js:7098`, feeding `pm-p3` (`:7117`).

Each of these three sections already has a *second*, wider predicate a few
lines below (the section's `incomplete`/amber check — e.g. `:6975`, `:6980`
for Plan Annual) that does include the secondary fields, so the sidebar does
not currently claim a page is complete when a secondary-only row is the only
content — it more likely shows the page as still in progress, never green,
never fully "started." That is a real, separate inconsistency from 61B's
core claim (the PDF/validator silently dropping the row), but it means a
fix aimed only at `pdf-model.js` and the validator files named above will
leave the sidebar's own "complete" computation still built from the old
narrow list. Phase 2 must edit these three `legacy-app.js` locations too, or
name explicitly why it is choosing not to.

### 61C — Optional co-guardian rows use incomplete inclusion predicates

**Confidence: Confirmed edge case.** Annual, Initial, and Minor emit an
additional guardian only when name or signature date is present. A partially
completed optional guardian containing only SSN/EIN, phone, address, or
relationship can therefore disappear instead of producing a validation issue.

Evidence: `plan-annual/pdf-model.js:539-550`,
`plan-initial/pdf-model.js:484-500`, and
`plan-minor/pdf-model.js:245-253`.

The implementation must decide whether such a row is “started” and then use
that decision consistently in UI status, validation, and PDF output.

### 61D — Original-form instructional content is absent from generated PDFs

**Confidence: Confirmed content divergences; policy placement requires a
ruling.** Comparison with the supplied originals found:

- Annual’s original includes the rights-consistency note and the
  Administrative Order/disaster-plan note. The model includes the physician
  report notice but not those notes (`plan-annual/pdf-model.js:45-95`).
- Initial’s original includes the disaster-plan instruction on page 8; the
  model has no corresponding output (`plan-initial/pdf-model.js:395-430`).
- Simplified’s original includes Pinellas/Pasco filing addresses, phone
  numbers, emails, and procedural assistance. The model emits only a generic
  filing notice (`plan-simplified/pdf-model.js:188-192`).

The proposal must not assume that every source-form instruction belongs in the
filed PDF. Each item needs a product/legal decision: filed-document content,
in-app guidance, or intentionally omitted current practice.

### 61E — Supplemental certification pages differ from the originals

**Confidence: Plausible-but-needs-a-ruling.** The Simplified and Minor source
forms contain guardian signature blocks, while the app additionally emits
preparer and attorney certification blocks:

- Simplified: `plan-simplified/pdf-model.js:166-187`
- Minor: `plan-minor/pdf-model.js:255-287`

These are not missing-field defects. They may be an approved application
extension, but the product must not describe the output as an exact source-form
reproduction unless the additions are explicitly accepted as supplemental.

### 61F — Plan Minor's attorney certification names the wrong form

**Confidence: Confirmed content defect, independent of any source-PDF
comparison.** Added 2026-09-20 by Claude, following an attempted live
verification pass by Antigravity whose specific quotes for this item did
not survive independent re-checking against source (see the note at the end
of this section) — the underlying claim was right, so it is restated here
against text read directly from the four files, character for character.

Plan Minor's attorney-certification notice
(`src/features/plan-minor/pdf-model.js:273`) reads:

> "The undersigned hereby notifies the Court of the filing of this **Annual
> Guardianship Plan**. This plan is the representation of the guardian. I
> have not audited the accompanying plan. The undersigned attorney
> represents that he/she has examined the contents of this plan and that it
> conforms to the requirements of the Florida Guardianship Law."

This document is Plan Minor. Its own corrected display name (Milestone 33,
`src/core/filing/filing-descriptor.js:66`) is "Annual Plan — Minors," and
that correction is already applied everywhere the PDF's *metadata* is set
(`plan-minor/pdf-model.js:52-57` overrides `title`/`subject`/`formName`
from the descriptor). The certification sentence above is body text in a
`text:` field, which nothing overrides — whatever is in source prints
verbatim.

**This is not a guess at a shared template default.** The other three plan
types were read at the same three call sites and do not share this pattern:

- Plan Annual (`plan-annual/pdf-model.js:566`) — a long, correctly
  parameterized paragraph: "...the filing of **the annual guardianship
  plan** for the period `${periodFrom}` through `${periodTo}`. **This
  annual guardianship plan** is the representation of the guardian. I have
  not audited **the accompanying annual plan**. ...examined the contents of
  **the annual guardianship plan**... and the standards for plans in
  `${county}` County." Correctly named throughout; no defect.
- Plan Initial (`plan-initial/pdf-model.js:511`) — the identical template
  shape, correctly substituted to "**the initial guardianship plan**" /
  "**this initial guardianship plan**" / "**the accompanying initial
  plan**" / "**the initial guardianship plan**" throughout, plus its own
  `${county}` clause. Correctly named; no defect. **This is the fix
  pattern**: Plan Initial already proves the long paragraph can name itself
  correctly with the plan type as a substitution, not a hardcoded word.
- Plan Simplified (`plan-simplified/pdf-model.js:187`) — a short, generic
  sentence with no plan-type name at all: "The undersigned notifies the
  Court of the filing of this plan and represents that it conforms to the
  requirements of Florida Guardianship Law." No naming defect is possible
  here; this form simply never names itself in this sentence.

So Plan Minor is the only one of the four with this defect, and it is not
because the other three share some acceptable generic wording it deviated
from — Annual and Initial both correctly name themselves via the long
paragraph's own established substitution pattern, and Simplified avoids the
question entirely. Plan Minor's shorter paragraph reads as a trimmed copy of
Annual's/Simplified's sentence shape that never had its own plan name
substituted in.

**Caution for whoever authorizes and implements this:** a first attempt at
verifying this finding live (Antigravity, tasked with generating real PDFs
and extracting text) reported the *same* corrected conclusion but supported
it with quotes attributed to Plan Annual and Plan Simplified that were, on
inspection, verbatim copies of Plan Minor's own sentence — not those two
forms' actual text — plus several `legacy-app.js` line citations elsewhere
in its report that pointed at unrelated code. The quotes and line numbers
in this section were re-derived directly from the four source files rather
than taken from that report. Do not reuse figures from a live-verification
pass without checking them against source first, even when the tool's
underlying conclusion turns out to be right.

**Proposed fix:** parameterize Plan Minor's certification sentence the way
Plan Initial already does — substitute this form's own name in place of
"Annual Guardianship Plan." What exact name to substitute (the corrected
descriptor's "Annual Plan — Minors," or wording specific to a minor ward)
is a product/content decision like 61D's, not something to infer.

### 61G — The PDF engine drops every notice block's title

**Confidence: Confirmed, from source, scope fully enumerated by a
repo-wide grep — not assumed.** `src/core/pdf/pdf-engine.js`'s
`notice`-block renderer (`:803-830`) draws `block.text` only; it never reads
or renders `block.title`. An earlier draft of this finding claimed Plan
Annual and Plan Initial were unaffected because their *numbered-question*
section headings live on the section object rather than the notice block.
That is true for the numbered-question sections, but wrong as a claim about
these two forms overall — a grep of every `type: 'notice'` block across all
four plan `pdf-model.js` files (`grep -n -A1 "type: 'notice'," …`) found
titled notices being dropped in every one of them, and a matching grep
against the three Milestone 60 forms' `pdf-model.js` files found none — this
is confined to the four plan types:

- **Plan Annual** — `'3G. Insurance and Benefits'` (`:241`), `'11.
  Declaration of Remuneration'` (`:477`), the co-guardian page's
  `'Additional Guardian Signatures'` (`:549`), and two empty-state fallback
  notices: `'1. Places the Ward Has Resided During the Prior 12 Months'`
  (`:121`) and `'4. Professional Medical Treatment During the Prior 12
  Months'` (`:286`), each printed with no heading when the collection is
  empty.
- **Plan Initial** — `'9. Examinations to Determine Treatment Needs'`
  (`:248`) and the co-guardian page's `'Additional Guardian Signatures'`
  (`:494`), whose accompanying body text ("All guardians of person must
  sign...") then prints as an unheaded paragraph.
- **Plan Minor** — the two empty-state fallbacks `'2. Residences During the
  Preceding 12 Months'` (`:126`) and `'3. Medical & Mental Health Treatment
  Providers'` (`:138`), plus `'Certification and Signature of Preparer'`
  (`:262`) and `'Certification and Signature of Guardian\'s Attorney'`
  (`:272`).
- **Plan Simplified** — `'CERTIFICATION AND SIGNATURE OF GUARDIAN(S) /
  GUARDIAN ADVOCATE(S)'` (`:175`), `'CERTIFICATION AND SIGNATURE OF
  PREPARER'` (`:182`), and `'CERTIFICATION AND SIGNATURE OF GUARDIAN\'S
  ATTORNEY'` (`:187`).

So this reaches two different kinds of content, not one: certification
headers (all four forms), where the filer loses the label distinguishing
whose certification they are reading on a page carrying more than one; and
numbered-question headings and empty-state captions (Annual, Initial,
Minor), where a page with no entries prints an unlabeled sentence with no
indication of which question it is answering. This is a rendering-engine
gap, not a plan-content question — the model authors clearly intended every
one of these to print, and the fix belongs in the engine, once, not in each
form.

**Proposed fix:** render a `notice` block's `title` as a heading above its
text, matching how `key-value-grid` and `table` blocks already render
theirs, with red-first proof — for at least one certification title and one
empty-state title — that the heading is present in extracted PDF text where
it was previously absent.

## Proposed execution plan

### Phase 0 — Baseline and fixture inventory

Before editing source:

1. Record the current commit and clean-tree state.
2. Build a field inventory for all four plan UIs, factories, validators, and
   PDF models.
3. Preserve text extracts from all four supplied originals as review evidence.
4. Add red tests before changing predicates or schema.

### Phase 1 — 61A schema and migration

Add exactly the fields 61A's correction lists — the ones Plan Simplified's
own `index.js`/`pdf-model.js` already read and write, no TIN field, no
signature-stamp state for either role — to
`probate-guardian-data-model.csv` and `emptyDataPlanSimplified()`. Define
the legacy rule: missing fields in existing saves become blank/unanswered;
existing entered values are preserved; no inferred signature or
certification is manufactured.

Run `npm run verify:data-model`.

### Phase 2 — 61B/61C shared “started row” semantics

Define form-specific predicates for each collection. Do not introduce one
generic row factory across forms with divergent schemas (`AGENTS.md` §6) —
but check `rowHasAnyData` (`src/legacy-app.js`, used by Annual Accounting's
own row validation) before writing eight new bespoke ones from scratch; a
generic "does this row have any data" test does not need to enumerate
field names the way `r.name||r.street||r.cityStateZip` does, and can't miss
a field by omission. Row *shape* stays form-specific; the *predicate* for
"is this row started" does not have to be reinvented per form.

Apply the resulting predicate consistently to:

- validator population and required-name errors;
- PDF row inclusion;
- optional guardian inclusion;
- readiness/sidebar status — **including the three `computeNavChecks()`
  locations in `src/legacy-app.js` this document's 61B correction names by
  line number** (`:6917-6918`/`:6927`/`:6943` for Plan Annual,
  `:7001`/`:7031` for Plan Initial, `:7098`/`:7117` for Plan Minor); these
  were not in the original evidence table and are easy to miss if the fix
  is scoped only to the files first cited.

Red tests must populate only secondary fields and prove that the export
either renders them or blocks with a field-specific error, **and that the
sidebar's own "complete" check does not disagree with the validator for the
same state** — it must never silently omit the row from any of the three.

### Phase 3 — 61D/61E content decisions and implementation

Only after requester/legal review, add approved source instructions to the
filed PDF models or move them into Help/guidance content. Document whether
preparer/attorney pages are approved supplemental output. Do not resolve legal
sufficiency in code or in this proposal.

### Phase 4 — 61F Plan Minor certification wording

Parameterize Plan Minor's attorney-certification sentence
(`plan-minor/pdf-model.js:273`) the way Plan Initial's equivalent sentence
already does, substituting this form's own name rather than the literal
"Annual Guardianship Plan." The exact replacement wording is a
product/content decision, made by the requester, not inferred by whoever
implements this — record the decision and its reasoning here before
touching the file. Red-first proof: extract the generated Plan Minor PDF's
certification text before and after, confirming the literal string "Annual
Guardianship Plan" is gone and the replacement matches the decision
recorded above verbatim.

### Phase 5 — 61G notice-block titles

In `src/core/pdf/pdf-engine.js`, render a `notice` block's `title` (when
present) as a heading above its text, matching how `key-value-grid` and
`table` blocks already render theirs. This is a single engine change
reaching all thirteen call sites 61G enumerates across the four plan forms;
it is not a per-form fix. Confirm no other filing type sets `title` on a
`type: 'notice'` block expecting it to print silently broken today (61G's
grep found none in the three Milestone 60 forms, but re-run it against the
tree at implementation time rather than trusting this document's count).
Red-first proof: pick one certification title and one empty-state title,
confirm both are absent from extracted PDF text before the fix and present
after, for the exact strings 61G cites.

## Required tests and index updates

Expected test surface:

- New unit contract tests for Simplified schema/factory coverage.
- Unit tests for every collection’s started-row predicate, run against the
  PDF model, the validator, **and `computeNavChecks()`** for the same
  fixture — not just the first two.
- PDF-model tests for secondary-only rows and optional co-guardians.
- Extracted-text assertions for any approved instructional content.
- Extracted-text assertion that Plan Minor's certification no longer
  contains the literal string "Annual Guardianship Plan" (61F).
- Extracted-text assertions that a `notice` block's `title` prints, covering
  at least one certification heading and one empty-state heading (61G).
- Existing plan PDF/e2e specs for all four filing types.
- `TEST-INDEX.md` updates for every added, moved, or repurposed spec.
- `npm run verify:data-model` and `npm run check:types`.

A full `npm test` regression requires explicit authorization under `AGENTS.md`.

## Scope boundaries

Included: plan-form UI-to-state-to-validator-to-PDF fidelity, schema coverage,
row omission, optional co-guardian handling, explicitly approved source
instructions/supplemental blocks, Plan Minor's certification wording (61F),
and the PDF engine's dropped notice-block titles (61G).

Excluded unless separately authorized:

- redesign of the plan forms;
- changes to court wording based on interpretation rather than source evidence
  (61F's specific replacement wording still needs that ruling, even though
  the defect itself is confirmed);
- changes to accounting/inventory forms already addressed by MS 60;
- unrelated readiness or legacy-app refactors;
- a full regression run without explicit approval.

## Acceptance criteria

MS 61 is complete only when:

1. Every UI-captured plan field is either represented in the canonical schema
   and PDF output, or explicitly documented as UI-only.
2. Secondary-only collection data cannot silently disappear.
3. Optional guardian rows have one documented started-row rule across
   validation and PDF output.
4. Every source-form content divergence is either corrected or recorded as an
   intentional, authorized product decision.
5. Legacy saves preserve existing data and initialize new fields safely.
6. Plan Minor's certification no longer misnames the document, using
   wording the requester has approved (61F).
7. Every `notice` block's `title` prints wherever a PDF model sets one
   (61G), with no other filing type found to share the gap at
   implementation time.
8. Targeted tests, data-model verification, type checks, and documentation
   pass; the full regression is run only if authorized.

## Authorization

No delivery in this document is authorized by its creation. Approval must name
the specific phases/deliveries, any source-content decisions, and whether a
full `npm test` regression is authorized.
