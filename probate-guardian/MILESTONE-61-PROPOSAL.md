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

**Evidence-trail gap, closed 2026-09-20.** The requester supplied five
original PDFs (two of them byte-identical copies of the Initial
Guardianship Plan) covering all four plan types. They are committed at
`reference/plan-forms/plan-{annual,initial,minor,simplified}-original.pdf`,
with `pdftotext -layout` extracts alongside as `.txt` files for citable
plain-text evidence — the same role MS 60's decode scripts played for the
accounting forms' embedded templates. This document was re-reviewed from
those four files rather than from memory of an earlier, uncommitted
verification pass. Two findings changed materially once checked against
the actual originals (61E, 61F below no longer say what they said before
the source existed in this repo) and one new defect surfaced (61H) that no
reading of this app's own code, however careful, could have found without
the original to compare against. Unlike the three Milestone 60 forms, none
of the four plan types has an embedded court `.xlsx` in this repo — they
are wet-signed narrative PDFs authored from scratch (Milestone 19-2) — but
the committed PDFs and text extracts now serve the same evidentiary
purpose the embedded templates served there.

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
- **Annual Q10 directives — not in the original evidence table (2026-09-20,
  Claude):** the same eight-field detail grid as Initial Q11, gated by the
  identical narrow predicate one line apart from Initial's:
  `plan-annual/pdf-model.js:411` (`d.q10Executed ? (d.q10Directives ||
  []).filter(r => r && (r.title || r.dateSigned || r.signedBy)) : []`).
  Missed in the first pass because the evidence table covered Q1/Q4 for
  Annual but not its Q10 directives collection, even though Initial's
  analogous Q11 was caught.
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

**Confidence: Confirmed for Annual's and Initial's "extras" (third-plus
guardian) pages. The Minor citation in the original draft pointed at the
wrong code and is corrected below (2026-09-20, Claude, verified directly
against source).**

Annual and Initial emit a third-or-later guardian only when name or
signature date is present. A partially completed extra guardian containing
only SSN/EIN, phone, address, or relationship disappears instead of
producing a validation issue.

Evidence: `plan-annual/pdf-model.js:539` (`extras = (g ||
[]).slice(1).filter(p => p && (p.name || p.signatureDate))`) and
`plan-initial/pdf-model.js:484` (`extras = (g ||
[]).slice(2).filter(p => p && (p.name || p.signatureDate))`).

**Correction: Plan Minor does not have this defect.** The original draft
cited `plan-minor/pdf-model.js:245-253` for the same "name or signature
date only" claim. Read directly, those lines are not an "extras" predicate
at all — Plan Minor supports only one co-guardian slot (`g[1]`, no
third-plus page), and its inclusion check is `[g1.name, g1.signatureDate,
g1.tin, g1.phone, g1.mailingStreet, g1.mailingCityStateZip].some(Boolean)`
(`plan-minor/pdf-model.js:245`) — six of the seven fields `guardianFields()`
renders, missing only `relationship` and `email`. A co-guardian row
containing only a relationship or only an email address would still
vanish, but that is a materially narrower edge case than "only when name
or signature date," and not what the original citation described. Plan
Initial's own second-guardian slot (`g[1]`, `plan-initial/pdf-model.js:477`)
uses the same wide six-field pattern, missing only `relationship` — likely
where Minor's predicate was copied from. Neither wide check is a confirmed
defect at the severity of the Annual/Initial "extras" predicates above;
they are noted here only because the original citation for Minor pointed
at the wrong kind of code, and a reviewer relying on it would look in the
wrong place.

The implementation must decide whether a relationship-only or email-only
second guardian counts as "started" (Initial, Minor) and whether an
SSN/phone/address-only third-plus guardian counts as "started" (Annual,
Initial) — and use that decision consistently in UI status, validation, and
PDF output.

### 61D — Original-form instructional content is absent from generated PDFs

**Confidence: Confirmed content divergences, verified against the committed
originals (`reference/plan-forms/*-original.pdf`); whether to add each is a
policy/legal call, not a code question.**

- **Annual** omits two notes entirely: "Note 1" (the physician-report
  rights must match the Order Determining Incapacity/Appointing Guardian,
  or the guardian must petition to remove/restore rights or explain why
  not) and "Note 2" (Administrative Order 2019-005's requirement to file an
  updated Disaster Plan when the ward has changed residence or a new
  guardian was appointed) — `plan-annual-original.txt:46-49` and `:54-55`;
  confirmed absent by grep against `plan-annual/pdf-model.js` (no match for
  "Note", "petition to remove", "Administrative Order", or "Disaster
  Plan"). The model does include the physician's-report notice (`:96`) and
  the `certPhysicianAttached`/`certRecognizeRights` certification checkboxes
  (`:525-526`), which do have source counterparts — only the two standalone
  notes are missing.
- **Initial** omits a disaster-plan instruction on page 8
  (`plan-initial-original.txt:346-350`, the same Administrative Order
  2019-005): "you must file a separate Disaster Plan when filing an initial
  guardianship plan... An updated Disaster Plan will be required if the
  ward is moved to a new residence." Confirmed absent from
  `plan-initial/pdf-model.js` by the same grep.

  **The AO both of these cite has since been rescinded — verified from a
  copy the requester supplied, 2026-09-20.** Administrative Order No.
  PA/PI-CIR 2024-025 (6th Judicial Circuit, signed August 1, 2024;
  committed at `reference/administrative-orders/
  AO-2024-025-guardianship-procedures.pdf`) states at its close: "Administrative
  Order No. PA/PI-CIR 2019-005 is hereby rescinded" (`:267`). The
  requirement itself survives under the new order's Section E ("DISASTER
  PLAN", `:203-214`) with the same substance the source PDFs describe — but
  with one addition neither source PDF's text carries: "If the ward is a
  minor child residing with their parent or other relative who is serving
  as guardian, that guardian is exempt from the requirement of filing a
  disaster plan" (`:212-214`). If 61D's Annual/Initial disaster-plan content
  is authorized, it must cite the current order (2024-025) and include this
  exemption, not reproduce the source PDFs' now-superseded "AO 2019-005"
  citation verbatim — copying the source text as written would file a
  citation to a rescinded order and omit an exemption the ward may actually
  be entitled to. This is the reverse risk from 61H: there, the source PDF
  looks wrong and the app looks right; here, the source PDFs' *content* is
  still substantively right but their *citation* has gone stale since
  whichever printing was used to prepare them.
- **Simplified** omits county-specific filing addresses, phone numbers,
  emails, and procedural-assistance contacts for both counties this form
  names — Pinellas (Clerk of the Circuit Court, 315 Court Street Room 106,
  Clearwater, (727) 464-3321, `Probate@mypinellasclerk.gov`) and Pasco (Clerk
  & Comptroller Nikki Alvarez Sowles, P.O. Box 338, New Port Richey, (727)
  847-8031) — `plan-simplified-original.txt:120-135`. The model emits one
  generic sentence instead (`plan-simplified/pdf-model.js:191-193`). Note
  also that this form's own caption names only Pinellas/Pasco County
  (`plan-simplified-original.txt:1-2`), unlike Annual/Initial, where the
  county reads as a fillable field (the garbled "Select County" /
  "PSineelllaesct County" text at `plan-initial-original.txt:7` is a
  flattened dropdown control, not free text). Any fix that reproduces
  county-specific instructions must branch on `d.county` rather than print
  Pinellas/Pasco detail unconditionally — or the requester should confirm
  this filing type really is restricted to those two counties before the
  fix is written as a static block.

The proposal must not assume that every source-form instruction belongs in the
filed PDF. Each item needs a product/legal decision: filed-document content,
in-app guidance, or intentionally omitted current practice.

### 61E — Supplemental certification pages differ from the originals

**Confidence: Confirmed for Plan Simplified only — the original draft's
inclusion of Plan Minor here was wrong and is corrected below (2026-09-20,
Claude, verified directly against the committed original).**

Plan Simplified's source form ends after two side-by-side guardian /
guardian-advocate signature blocks (Signature, Printed Name, Email, Phone,
Mailing Address — no SSN/TIN field) followed by Filing Instructions and
Procedural Assistance (`plan-simplified-original.txt:97-137`). The app
additionally emits conditional Preparer and Attorney certification blocks
whenever `d.preparer_name`/`d.attorney_name` are populated
(`plan-simplified/pdf-model.js:180-189`). This is not a missing-field
defect — it is content with no counterpart anywhere in this form's own
original. The product must not describe Plan Simplified's output as an
exact source-form reproduction unless this addition is explicitly accepted
as a supplemental extension.

**Correction: Plan Minor's preparer and attorney certification blocks are
not an extension — they mirror the original form exactly.** The Minor
original contains all three certification sections, in this order:
"CERTIFICATION AND SIGNATURE OF GUARDIAN(S)" (`plan-minor-original.txt:213`),
"CERTIFICATION AND SIGNATURE OF PREPARER" (`:276`), and "CERTIFICATION AND
SIGNATURE OF GUARDIAN'S ATTORNEY" (`:304`) — the same three sections, in
the same order, that `plan-minor/pdf-model.js:220-281` emits. There is no
61E finding for Plan Minor; it is struck from this item's scope. (The
original draft's claim here rested on an assumption about the Minor
original's structure, made before any original was available to check —
exactly the gap the evidence-trail note above flagged as unresolved.)

### 61F — Plan Minor's attorney certification: a source-form defect the app already half-corrected

**Confidence: Confirmed as a defect in the source form itself, and as a
pre-existing app deviation that already addresses it. Not a code defect
requiring a fix in the sense the rest of this document uses that word.**
Substantially rewritten 2026-09-20 (Claude) once the committed original made
the actual cause visible. The prior version of this section — written
before any original PDF existed in this repo, and restated once more after
Antigravity's live-verification attempt — called this "Plan Minor's
attorney certification names the wrong form" and implied the app had
introduced the error. Reading the committed original shows the opposite:
the error originates in the state's own form template, and the app already
deviates from it, in the direction of fixing it.

**What the original Minor form actually says.** Its attorney-certification
paragraph (`plan-minor-original.txt:307-311`) reads: "The undersigned
hereby notifies the Court of the filing of **the initial guardianship
plan** of the guardian of the person. **This initial plan** is the
representation of the guardian. I have not audited **the accompanying
initial guardianship plan**. The undersigned attorney represents that
he/she has examined the contents of this plan and that it conforms to the
requirements of the Florida Guardianship Law." This is the Minor form —
titled "ANNUAL GUARDIANSHIP PLAN ... FOR THE MINOR" at the top of the same
document (`:19,22-23`) — calling itself "the initial guardianship plan"
three times in its own attorney certification. That sentence is otherwise
identical in shape to the Initial Guardianship Plan's own attorney
paragraph (`plan-initial-original.txt:412-416`), which strongly suggests
the Minor template was cloned from the Initial template and this one
clause was never updated to match.

**What the app already does about it.** `plan-minor/pdf-model.js:273` does
not reproduce that text. It reads: "The undersigned hereby notifies the
Court of the filing of this **Annual Guardianship Plan**. This plan is the
representation of the guardian. I have not audited the accompanying plan.
The undersigned attorney represents that he/she has examined the contents
of this plan and that it conforms to the requirements of the Florida
Guardianship Law." — the source's erroneous "initial guardianship plan" has
already been replaced with a correct name, by whoever wrote this file,
independent of and prior to this review. It also drops "of the guardian of
the person" and softens "the accompanying initial guardianship plan" to
"the accompanying plan." Unlike what the prior version of this section
assumed, there is no missing period-date or county parameterization to add
here to match Plan Annual's/Initial's longer version of the same paragraph
(`plan-annual-original.txt:528-535`, `plan-initial-original.txt:409-416`)
— Plan Minor's own source sentence has no period-date or county clause
either; it really is this short in the original.

**What is actually left to decide, if anything.** The only open question is
whether "this Annual Guardianship Plan" is the best available wording,
given the form's corrected display name is "Annual Plan — Minors"
(Milestone 33, `src/core/filing/filing-descriptor.js:66`) — a wording
preference, not a code defect, and not something this document should
resolve by inference. Do not carry forward the prior framing of Plan Minor
as "the only one of the four with this defect" into any implementation —
the defect is the state's, and the app already addressed it before this
review began.

**Caution retained from the prior draft, still accurate:** Antigravity's
live-verification pass reported the same underlying observation but
supported it with fabricated quotes attributed to Plan Annual and Plan
Simplified (verbatim copies of Plan Minor's own sentence, mislabeled) and
unrelated `legacy-app.js` citations. Every quote in this section is
transcribed directly from the four committed PDFs' extracted text, not
from that report.

**Proposed action:** none required. If the requester wants Plan Minor's
wording to name itself with the same precision Annual's/Initial's
paragraphs do, or to match the corrected display name, that is a one-line
content change with a simple extracted-text check — but it is optional
polish, not a fidelity fix.

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

### 61H — The supplied Plan Initial original appears to have a typo in its own statute citation; this app is likely already correct

**Confidence: Textual mismatch confirmed; likely resolved in the app's
favor by outside corroboration, not by this repo alone — treat as
strong-but-not-legal-certainty pending the requester's own confirmation.**
Found 2026-09-20 (Claude) by comparing the committed original to this
app's code; the resolution below was added the same day after a web check,
prompted by the requester asking what to recommend authorizing next — this
finding was the one open item without a clear recommendation.

The committed Initial Guardianship Plan original (6th Judicial Circuit,
Pinellas/Pasco) cites its 60-day filing deadline to **F.S. 744.632**
(`plan-initial-original.txt:3`: "Pursuant to F.S. 744.632, this Report with
Original Signatures is due within 60 days after the Letters of Guardianship
are signed"). This app cites that same deadline to **F.S. 744.362(1)**
instead, consistently, in five places: `plan-initial/pdf-model.js:62` (the
filed PDF's own cover notice), `help-content.js:121`, `dashboard/
view-model.js:103`, and `readiness-config.js:234`.
(`simplified-accounting/pdf-model.js:257` and `simplified-accounting/
index.js:588` also say `744.362(1)`, but for an unrelated certification on
a different filing type — not part of this mismatch, named only so it is
not confused with it.)

**Outside corroboration, not just this repo's two documents:** F.S. 744.362
is titled "Initial guardianship report" in the current Florida Statutes and
its text matches this exact requirement — a report due 60 days after
letters of guardianship are signed, for a guardian of the person consisting
of an initial guardianship plan (Justia's 2019 Florida Statutes mirror,
`law.justia.com/codes/florida/2019/title-xliii/chapter-744/part-vi/
section-744-362/`; Florida Senate's statute pages confirm 744.362 exists
and is titled correctly in every year checked, 2011–2024). No search or
direct page request for **744.632** turned up a real, current statute
section under that number at all — not on the Florida Senate's site, not
on Justia, nowhere; a neighboring real section (744.634) exists and
resolves fine, but 744.632 does not. More directly: Citrus County's own
Initial Guardianship Plan form (5th Judicial Circuit — a different county,
different circuit, same form type, fetched and text-extracted directly,
`citrusclerk.org/DocumentCenter/View/1935/Initial-Guardianship-Plan-PDF`)
carries the nearly identical parenthetical — "Pursuant to F.S. 744.362 the
Report with Original Signatures is due within 60 days after his or her
Letters of Guardianship were signed" — citing **744.362**, not 744.632.

Put together: two independent circuits' versions of the same state form
agree on 744.362, an independent statute database confirms 744.362 is a
real, correctly-titled, currently-in-force section covering exactly this
requirement, and no evidence anywhere supports 744.632 existing at all.
The most likely explanation is a simple digit transposition (362 → 632) in
whichever copy of the 6th Circuit's template was used to produce the PDF
supplied for this review — a defect in that one document, not in this app.

**Proposed action:** no code change to this app's five locations is
recommended. This is now the mirror image of 61F: a source-document defect
this app does not share. The one action worth taking is confirming with
the 6th Circuit clerk's office (or counsel) that their live form has since
been corrected, or flagging the typo to them if not — outside this
document's scope. If the requester's own review of the statute disagrees
with this conclusion, say so and this finding reopens; absent that, treat
744.632 as the error and close this item without a fix.

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
Plan Simplified's preparer/attorney pages are approved supplemental output
(61E is now Simplified-only). If Annual's/Initial's disaster-plan content is
approved, cite Administrative Order 2024-025, not the source PDFs' "AO
2019-005" — that order is rescinded — and include the minor-parent-guardian
exemption 2024-025 added that the source PDFs' own text does not carry (see
61D). Do not resolve legal sufficiency in code or in this proposal.

### Phase 4 — 61F Plan Minor certification wording (optional; likely no action)

61F is not a fidelity defect this app introduced — the source form's own
attorney-certification paragraph misnames itself, and the app already
corrected the name before this review found the issue. No action is
proposed unless the requester specifically wants Plan Minor's wording
brought into line with the corrected display name ("Annual Plan —
Minors") or with the level of detail Annual's/Initial's equivalent
paragraphs carry. If so: change the literal text at
`plan-minor/pdf-model.js:273`, and add a red-first extracted-text check for
whatever exact string is chosen — there is no wrong string to detect this
against, only the requester's preferred one.

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

### Phase 6 — 61H statute-citation correction (blocked on a legal ruling, not a code question)

Only after the requester or counsel names the correct statute for the
Initial Guardianship Plan's 60-day deadline, update all five locations 61H
lists to agree with it and with each other. Red-first proof: confirm the
extracted PDF text and the three UI-text locations all carry the old,
incorrect citation before the change and the confirmed one after, in a
single commit — a fix that corrects the PDF model but not Help/dashboard/
readiness (or vice versa) reintroduces the same inconsistency 61H
documents.

## Required tests and index updates

Expected test surface:

- New unit contract tests for Simplified schema/factory coverage.
- Unit tests for every collection’s started-row predicate, run against the
  PDF model, the validator, **and `computeNavChecks()`** for the same
  fixture — not just the first two.
- PDF-model tests for secondary-only rows and optional co-guardians.
- Extracted-text assertions for any approved instructional content.
- Extracted-text assertion for Plan Minor's certification wording (61F),
  matching whatever wording the requester chooses — only if 61F is
  authorized at all; the current text is not a defect requiring a test to
  fail against.
- Extracted-text assertions that a `notice` block's `title` prints, covering
  at least one certification heading and one empty-state heading (61G).
- Extracted-text / UI-text assertion that all five 61H locations cite the
  same, requester-confirmed statute, once that statute is named.
- Existing plan PDF/e2e specs for all four filing types.
- `TEST-INDEX.md` updates for every added, moved, or repurposed spec.
- `npm run verify:data-model` and `npm run check:types`.

A full `npm test` regression requires explicit authorization under `AGENTS.md`.

## Scope boundaries

Included: plan-form UI-to-state-to-validator-to-PDF fidelity, schema coverage,
row omission, optional co-guardian handling, explicitly approved source
instructions/supplemental blocks, the PDF engine's dropped notice-block
titles (61G), and the Initial Plan's statute-citation consistency (61H).
Plan Minor's certification wording (61F) is included only if the requester
separately asks for the optional wording change described in Phase 4 — the
default outcome of 61F is no code change.

Excluded unless separately authorized:

- redesign of the plan forms;
- any change to Plan Minor's certification wording without the requester
  explicitly choosing the replacement (61F is optional to begin with);
- resolving which Florida Statute currently governs the Initial Plan's
  60-day deadline (61H) — a legal question this document does not answer,
  not something to infer from the source PDF alone;
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
6. Plan Minor's certification wording is either left as-is (it already
   corrects a defect in its own source form, per 61F) or changed to
   wording the requester has explicitly chosen — never inferred.
7. Every `notice` block's `title` prints wherever a PDF model sets one
   (61G), with no other filing type found to share the gap at
   implementation time.
8. The Initial Guardianship Plan's 60-day-deadline statute citation is
   consistent across all five locations 61H lists, using whichever
   citation the requester or counsel confirms is correct.
9. Targeted tests, data-model verification, type checks, and documentation
   pass; the full regression is run only if authorized.

## Authorization

No delivery in this document is authorized by its creation. Approval must name
the specific phases/deliveries, any source-content decisions, and whether a
full `npm test` regression is authorized.
