# Milestone 61: Plan-Form Source-to-PDF Fidelity

## Status

**AUTHORIZED 2026-09-20 by the requester. In progress.** The authorization,
verbatim: *"Execute on Phases 0–2 (61A schema, 61B/61C started-row) and
Phase 5 (61G notice titles), plus Phase 3's other three items — Annual's
Note 1, Simplified's Help content, and removing Simplified's
preparer/attorney pages."*

That authorizes Phases 0, 1, 2, 5 and three of Phase 3's four items. Phase
3 item 2 (the Disaster Plan note) is closed with no code change and is not
part of this run. Phases 4 and 6 are likewise closed. The full `npm test`
regression at completion was authorized separately the same day.

Progress Log is at the end of this document.

The requester answered every open content question on 2026-09-20; the
decisions are recorded inline at each finding and consolidated here. One
answer — the Disaster Plan item — was given, found to conflict with a
deliberate prior decision this document had misdescribed as an open gap,
put back to the requester with the conflict explained, and re-decided the
same day. It is now closed with no code change. **Nothing in this document
is awaiting a decision.** What remains is the authorization itself.

**Decisions recorded 2026-09-20:**

- **61D, Annual's "Note 1" (rights-consistency):** add to the filed PDF, as
  a standalone note matching the source form's own placement.
- **61D, Annual's and Initial's Disaster Plan note: CLOSED, no code
  change** (re-decided 2026-09-20, after the first answer was found to
  conflict with Milestone 36-5). The content is already delivered where
  this app's own policy says it belongs: county-gated in Help
  (`help-content.js:113-123`, `help/index.html:516`) with the AO's
  substance and effective date in `county-guidance.js:10-12`. It stays out
  of generated PDFs, and the guard at
  `tests/unit/content-corrections.spec.js:43` stays as it is. This is not
  an accepted gap — it is a requirement already met by a different, and
  deliberate, delivery mechanism.
- **61D, Simplified's county-specific filing/procedural-assistance
  content:** **not** filed-PDF content. Write it into in-app Help instead,
  pointing filers at the clerk's own current contact information.
- **61E, Simplified's preparer/attorney certification pages:** **remove**
  them from the filed PDF, so Simplified's output matches its own source
  form exactly.
- **61E follow-on, Simplified's preparer/attorney UI capture:** **keep** the
  UI fields. Only the PDF rendering comes out. 61A's schema/factory fix is
  therefore still required — for internal data integrity, not for filed
  output (see the note added to 61A).
- **61F (Plan Minor's certification wording):** no action — the app already
  corrects a defect in its own source form. Recorded as accepted, not as an
  open gap.
- **61H (Initial's statute citation):** no code change — the evidence points
  to a typo in the supplied source PDF, not in this app.
- **Full `npm test` regression at completion: authorized** (`AGENTS.md` §2).

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

**Still required after 61E's removal decision (2026-09-20).** The requester
decided that Simplified's preparer/attorney certification *pages* come out
of the filed PDF (61E) while the *UI capture* stays. That makes these
fields app-internal rather than filed content, which changes their purpose
but not the fix: the factory must still initialize them, or values a filer
enters this session still vanish from the saved case file on reload. Record
them in `probate-guardian-data-model.csv` as captured-but-not-filed for
`plan_simplified`, so the next reviewer does not read their absence from
the PDF as the schema bug being back. Note that after 61E, the pdf-model
citations above (`plan-simplified/pdf-model.js:137-163`) describe code that
will no longer exist — the field list itself is derived from
`index.js:298-326`, which is unaffected.

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

  **Decided 2026-09-20 — Note 1: add to the filed PDF**, as a standalone
  notice in the position the source form uses (near the top, ahead of Q1),
  not folded into the certification page. Citrus County's version of the
  same form places the identical sentence as a lead-in above its
  certification checklist instead; that is a different circuit's layout
  choice, and this app follows its own circuit's source.
- **Initial** omits a disaster-plan instruction on page 8
  (`plan-initial-original.txt:346-350`, the same Administrative Order
  2019-005): "you must file a separate Disaster Plan when filing an initial
  guardianship plan... An updated Disaster Plan will be required if the
  ward is moved to a new residence." Confirmed absent from
  `plan-initial/pdf-model.js` by the same grep.

  **The AO both of these cite has since been rescinded.** Administrative
  Order No. PA/PI-CIR 2024-025 (6th Judicial Circuit, signed August 1,
  2024) has been in this repo at `AO-2024-025-guardianship-procedures.pdf`
  since Milestone 37 (`10d90dd`) — it was not newly supplied for this
  review, and an earlier draft of this section wrongly implied it was. A
  text extract is committed alongside at
  `reference/administrative-orders/AO-2024-025-guardianship-procedures.txt`.
  The order states at its close: "Administrative
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

  **CLOSED — no code change (re-decided 2026-09-20).** This item is not a
  gap. The requirement is already delivered, county-gated, in Help; the
  filed PDFs deliberately do not carry it; and this document was wrong to
  list it as missing. Recorded in full below because the reasoning matters
  more than the outcome — a future reviewer running the same grep will
  reach the same wrong conclusion unless they find this.

  The requester's first answer, given while this document still described
  the item as an open gap, was "add to the filed PDF for both Annual and
  Initial, citing AO 2024-025 with its minor-parent-guardian exemption."
  That could not be implemented as stated:

  - **It would break a test that exists to prevent exactly this.**
    `tests/unit/content-corrections.spec.js:43` scans every `.js`/`.html`/
    `.css` file under `src/` for the strings `2024-025` or `Administrative
    Order 2024` and fails if either appears outside one allow-listed file
    (`features/dashboard/resources.js`). Adding the note to
    `plan-annual/pdf-model.js` and `plan-initial/pdf-model.js` puts the
    string in two more.
  - **The guard is not incidental — it is the fix from a prior milestone.**
    Its own comment (`:10-20`) describes the Milestone 36-5 defect it
    catches: the AO "stated unconditionally, as a filing requirement,
    on-screen and in printed documents, regardless of the filer's actual
    county." Printing this note on every Annual and Initial PDF is that
    defect, restored.
  - **It conflicts with `AGENTS.md`'s authority hierarchy** (`:300`):
    circuit-specific rules "gate through `src/core/filing/
    county-guidance.js` (Pinellas/Pasco only) — never presented as
    mandatory statewide for other counties." The app serves all twenty
    Florida circuits (Milestone 54's circuit selector); these plan forms
    are the 6th Circuit's, but nothing stops a filer elsewhere generating
    one.
  - **The content is already shipped, county-gated.**
    `src/features/help/help-content.js:113-123` renders a "Don't Forget the
    Disaster Plan" section behind `hasSixthCircuitLocalGuidance(county)`,
    stating the requirement, that the app does not produce that document,
    and the minor-ward exemption. `help/index.html:516` carries a fuller
    version naming AO 2024-025, linking the circuit's orders index, and
    warning that a local order can be superseded.
    `src/core/filing/county-guidance.js:10-12` already encodes the order's
    substance and effective date, deliberately without the AO number so the
    guard passes.

  So 61D's framing of this item was wrong, and the error is mine: the grep
  behind "confirmed absent from `plan-initial/pdf-model.js`" proved only
  that the PDF model does not contain it. It does not, and this document
  claimed it did, establish that the content is *missing from the app* —
  it was deliberately relocated to Help by Milestone 36-5 and fenced off by
  a test. An open gap was presented where there was a closed decision, and
  the requester answered a question that should never have been asked in
  that form.

  **Re-decided the same day, with the conflict on the table: close it.** No
  change to `plan-annual/pdf-model.js`, `plan-initial/pdf-model.js`,
  `county-guidance.js`, the Help content, or the guard test. The
  requirement is met by the existing county-gated Help delivery, which
  reaches only the filers it applies to — something a note printed on every
  Annual and Initial PDF could not do.

  **For anyone who finds this again:** absence of disaster-plan text from
  the plan PDF models is the intended state, not a defect. Before
  proposing to add circuit-specific content to any generated document,
  read `AGENTS.md`'s authority hierarchy (`:300`) and
  `tests/unit/content-corrections.spec.js`'s guard comment first — the
  design question was settled in Milestone 36-5 and re-confirmed here. If
  a future milestone ever does revisit it, the shape question is already
  answered too: a standalone note, not a numbered question — the 6th
  Circuit's own Initial form deleted its numbered disaster-preparedness
  question (leaving the orphaned Q7→Q9 gap that Citrus County's form still
  fills with a numbered "8. Disaster Preparedness"). Do not renumber to
  close that gap; it is the source form's, and closing it would make this
  app's output disagree with the court's.
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

  **Decided 2026-09-20 — this is not filed-PDF content.** Put the filing and
  procedural-assistance guidance into in-app Help
  (`src/features/help/help-content.js`, where this app already keeps
  filing-deadline and procedure guidance), pointing filers at the clerk's
  own current contact information rather than hardcoding street addresses,
  phone numbers and email addresses into a generated court document where
  they would silently go stale. The PDF keeps its existing generic filing
  sentence (`plan-simplified/pdf-model.js:191-193`); no county branching is
  needed in the PDF path, and the open question about whether this filing
  type is restricted to Pinellas/Pasco no longer blocks anything.

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

**Decided 2026-09-20 — remove them.** Plan Simplified's filed PDF will
match its own source form: guardian / guardian-advocate signature blocks,
then the filing notice, and nothing else. Delete the two `notice` +
`signature-block` pairs at `plan-simplified/pdf-model.js:180-189` (the
`prep` and `atty` blocks built at `:138-163` become unreferenced and go
with them). **The UI capture stays** — `plan-simplified/index.js:298-326`
is unchanged, and 61A's schema/factory fix still lands, because the app
continues to record who prepared and reviewed the filing even though that
no longer prints on the filed document. Anyone reading the two files
together afterwards will see fields captured and persisted but never
rendered; that is the intended end state, recorded here so it is not
"fixed" back later by someone who finds it surprising.

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

### Phase 3 — 61D/61E content, as decided 2026-09-20

The content questions are settled (see Status). This phase implements those
answers; it does not reopen them. Four separate changes:

1. **Annual — add "Note 1"** (rights-consistency) to
   `plan-annual/pdf-model.js` as a standalone `notice` on the cover
   section, positioned ahead of Q1 as the source form has it. Text follows
   `plan-annual-original.txt:46-49`.
2. **Annual and Initial — the Disaster Plan note: nothing to do.** Closed
   2026-09-20 with no code change (see 61D). The requirement is already
   met by county-gated Help content. Do not add disaster-plan text to any
   pdf-model, do not touch `county-guidance.js`, and do not widen the
   allow-list in `tests/unit/content-corrections.spec.js`.
3. **Simplified — move filing/procedural guidance to Help.** Add the
   clerk-contact and procedural-assistance guidance to
   `src/features/help/help-content.js`, pointing at the clerk's current
   published contact information rather than transcribing addresses and
   phone numbers. The PDF's existing generic filing sentence is unchanged.
4. **Simplified — remove the preparer/attorney certification pages** from
   `plan-simplified/pdf-model.js` (`:180-189`, plus the now-unreferenced
   `prep`/`atty` builders at `:138-163`). Leave
   `plan-simplified/index.js:298-326` alone: the UI keeps capturing this
   data, and Phase 1's schema fix still applies to it.

Red-first proof for each: extracted PDF text asserts the new notes are
present where they were absent (items 1–2), that the preparer/attorney
certification headings and signature blocks are *gone* from Simplified's
output where they were present (item 4), and that Simplified's
preparer/attorney values still round-trip through save/reload with nothing
rendered in the PDF (items 3–4 together with Phase 1).

Legal sufficiency of the wording is not resolved in code; the text is
transcribed from the source form and the current Administrative Order,
both committed under `reference/`.

### Phase 4 — 61F Plan Minor certification wording: closed, no action

**Decided 2026-09-20: no change.** The source form's own
attorney-certification paragraph misnames itself; this app already
corrects it. Nothing to implement. This phase exists only so the numbering
matches the findings, and so a future reviewer who rediscovers the wording
difference finds the decision rather than re-litigating it.

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

**Interaction with Phase 3 — the count of thirteen is about to change.**
Phase 3 item 4 deletes Simplified's preparer and attorney certification
blocks, which carry two of the thirteen titled notices 61G enumerates
(`plan-simplified/pdf-model.js:182` and `:187`). If Phase 3 lands first,
61G reaches **eleven** call sites, not thirteen — and Phase 3 items 1–2 add
new notices of their own, which may or may not carry titles depending on
how they are written. Do not hardcode "thirteen" in a test or a commit
message; re-run the grep against the tree as it stands when this phase
starts, and take the count from that.

### Phase 6 — 61H statute citation: closed, no action

**Decided 2026-09-20: no code change.** The evidence in 61H points to a
digit transposition in the supplied source PDF (744.632 for 744.362), not
to an error in this app's five citations. Nothing to implement. If the
requester's own review of the statute ever contradicts this, 61H says what
reopening it would involve — all five locations changed together, in one
commit.

## Required tests and index updates

Expected test surface:

- New unit contract tests for Simplified schema/factory coverage.
- Unit tests for every collection’s started-row predicate, run against the
  PDF model, the validator, **and `computeNavChecks()`** for the same
  fixture — not just the first two.
- PDF-model tests for secondary-only rows and optional co-guardians.
- Extracted-text assertion that Annual's Note 1 appears in the filed PDF
  (Phase 3 item 1).
- No test for disaster-plan content in any PDF — the item is closed with no
  code change (61D). `tests/unit/content-corrections.spec.js`'s existing
  guard already covers the invariant that matters here, and stays as it is.
- Extracted-text assertion that Simplified's output no longer contains the
  preparer or attorney certification headings or signature blocks (Phase 3
  item 4), paired with a save/reload test proving those same
  `preparer_*`/`attorney_*` values still persist in state (Phase 1) — the
  two together are the whole point of the "capture but do not file"
  decision, and a test for either alone would miss a regression in the
  other.
- Extracted-text assertions that a `notice` block's `title` prints, covering
  at least one certification heading and one empty-state heading (61G).
  Take the affected-call-site count from a fresh grep, not from this
  document — Phase 3 changes it (see Phase 5).
- Existing plan PDF/e2e specs for all four filing types.
- `TEST-INDEX.md` updates for every added, moved, or repurposed spec.
- `npm run verify:data-model` and `npm run check:types`.

No tests are needed for 61F or 61H: both are closed with no code change.

**A full `npm test` regression at completion is authorized** (requester,
2026-09-20), as MS 60 had.

## Scope boundaries

Included: plan-form UI-to-state-to-validator-to-PDF fidelity (61A), schema
coverage (61A), row omission (61B), optional co-guardian handling (61C),
the four decided content changes in Phase 3 (61D/61E), and the PDF engine's
dropped notice-block titles (61G).

Excluded:

- **61F and 61H** — both closed with no code change (Phases 4 and 6);
- redesign of the plan forms;
- removing Simplified's preparer/attorney **UI** fields — the decision was
  to drop the PDF pages only, and the capture stays;
- renumbering Initial's questions to close the Q7→Q9 gap, or adding a
  numbered disaster-preparedness question in the style of another
  circuit's form;
- transcribing clerk street addresses, phone numbers or email addresses
  into any generated PDF — that content goes to Help;
- changes to accounting/inventory forms already addressed by MS 60;
- unrelated readiness or legacy-app refactors.

## Acceptance criteria

MS 61 is complete only when:

1. Every UI-captured plan field is either represented in the canonical schema
   and PDF output, or explicitly documented as captured-but-not-filed —
   Simplified's `preparer_*`/`attorney_*` fields being the deliberate case
   of the latter.
2. Secondary-only collection data cannot silently disappear.
3. Optional guardian rows have one documented started-row rule across
   validation and PDF output.
4. Every source-form content divergence is either corrected or recorded as an
   intentional, authorized product decision — including the three this
   document closes with no code change (61E's Minor half, 61F, 61H).
5. Legacy saves preserve existing data and initialize new fields safely.
6. Annual carries Note 1 in its filed PDF. No generated plan PDF references
   any Administrative Order — neither the rescinded 2019-005 nor the
   current 2024-025 — and `tests/unit/content-corrections.spec.js` still
   passes unmodified.
7. Simplified's filed PDF contains no preparer or attorney certification
   content, while the same values still survive a save/reload round trip.
8. Every `notice` block's `title` prints wherever a PDF model sets one
   (61G), with no other filing type found to share the gap at
   implementation time.
9. Targeted tests, data-model verification, type checks, and documentation
   pass, and the authorized full `npm test` regression is green.

## Authorization

No delivery in this document is authorized by its creation. Approval must name
the specific phases/deliveries, any source-content decisions, and whether a
full `npm test` regression is authorized.

**As of 2026-09-20 the content decisions and the regression question are
answered** (see Status) — every one of them by the requester, none inferred
here. What is still missing is the instruction to begin. Nothing in
`src/` may be touched until that arrives.

Phases 0, 1, 2, 3 and 5 are the executable set. Phases 4 and 6 are closed
with no action. A complete authorization is therefore as short as: *start
MS 61, phases 0–3 and 5, per the decisions recorded in the Status
section.* Anything narrower — a subset of phases, or a phase held back —
authorizes only what it names (`AGENTS.md` §3).

## Progress Log

- **2026-09-20 — Phase 0.** Authorization recorded (see Status). Baseline
  commit and clean-tree state captured below; field inventory and red tests
  precede every later phase.
