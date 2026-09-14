# Milestone 50: Findings from a Live Application Walkthrough — Proposal Index

## Status

**Draft — not an authorization to implement anything below.** Per
`AGENTS.md` §2, this is a proposal only; nothing here should be started
until Alan explicitly approves a specific sub-delivery by name.

## Source and an important caveat on confidence

Every item below was observed during a manual, page-by-page walkthrough of
every form and feature in the deployed build (`probate-guardian-web-build.zip`,
current as of this session), conducted while producing the end-user help
guide — clicking through all nine filing types, the dashboard, signatures,
annotations, and shared-record flows with a browser automation tool. **This
was black-box UI testing, not a source-code review.** I did not read the
application's actual source tree in this session; the only source-level
evidence I have is a handful of incidental reads of minified production
JS bundles (cited where relevant) and cross-references against
`MILESTONE-42-PROPOSAL.md`, which Alan supplied as a style example and
which happens to document this same codebase's real file layout in detail.

Where I name a file below, I am either quoting something I directly read
in a bundle, or inferring a plausible location from `MILESTONE-42-PROPOSAL.md`'s
own file inventory and from `AGENTS.md`'s architecture description — every
such inference is flagged **(inferred, verify)**. Please have Claude Code
confirm root cause against the actual source before scoping any fix; several
of these may turn out to be the same underlying issue, already-fixed, or
testing artifacts rather than real defects, and I'd rather flag that
honestly than overstate certainty the way `AGENTS.md`'s own confidence
conventions ask for.

None of these were reproduced with a controlled regression harness — each
is a single observation (or, where noted, two). Treat "reproduced" below as
"observed once, following the steps given," not "confirmed reliably
reproducible."

## How this index is organized

Each sub-delivery states a **Category**, my **Confidence** that it's a real,
current defect (not a testing artifact or already-fixed), what was
**Observed**, a **Suspected area** (file/function, flagged inferred where
applicable), **Steps** structured as investigate → decide → fix → guard
(matching `MILESTONE-42-PROPOSAL.md`'s pattern for genuinely-unknown-root-cause
items), **Verification**, and **Cross-cutting notes** per `AGENTS.md` §8
where an axis is actually implicated — marked N/A elsewhere rather than
left silent.

| Sub-delivery | Category | Confidence this is a real, current defect |
| --- | --- | --- |
| 50A — Attorney name duplicated on Plan-to-Plan carryover | Data correctness | Medium-High — reproduced once; needs source confirmation of stored vs. display-only |
| 50B — Simplified Accounting eligibility "Load Ward Info From" not populating | Data correctness | Low-Medium — single observation, already flagged "questionable" at the time |
| 50C — City/State/Zip normalization regression risk | Data correctness / regression | Medium — Alan separately confirmed this exact bug class was fixed before; recurrence needs explanation |
| 50D — Highlight annotation renders solid black | Visual rendering, on court-facing PDF output | Medium — reproduced, but described as inconsistent across attempts |
| 50E — Annual Plan benefits schedule rows render oversized | Visual / layout | High that it's reproducible; may overlap already-planned work — see note |
| 50F — Typed-signature preview clips long names | Visual / possible output accuracy | High that the preview clips; unconfirmed whether the exported PDF is also affected |
| 50G — Native `window.confirm()` dialogs break app-modal consistency | Consistency / robustness | High — confirmed by direct observation and by reading the relevant bundle |
| 50H — County & Active-Filing combobox interaction pattern | Interaction robustness / possible accessibility gap | Medium — confirmed non-standard event handling; real-user impact unconfirmed |

---

## 50A — Attorney Name Duplicated on Plan-to-Plan Carryover

**Category:** Data correctness. **Confidence:** Medium-High.

### Observed

Using "Create New Form for Existing Ward" (dashboard toolbar, per
`AGENTS.md`'s vocabulary this is the "New Filing from Existing" carryover
flow) to start an **Annual Guardianship Plan** from an existing **Initial
Guardianship Plan**, the attorney name field on the new form's cover/signature
area showed the attorney's name duplicated — appearing twice rather than
once. I did not capture whether the underlying stored value was actually
doubled (e.g. `"Daniel R. Okafor, Esq.Daniel R. Okafor, Esq."`) or whether
this was a display-only rendering issue (e.g. the field's value concatenated
with a label that itself repeats the name). That distinction matters a lot
for severity and needs to be resolved first.

### Suspected area (inferred, verify)

`MILESTONE-42-PROPOSAL.md` §42E (Tranche 4) names
`src/core/navigation/ward-lifecycle.js` as the live home of
`carryOverFieldsForPlan()` and `carryOverFieldsForAccounting()`, and notes
Milestone 40H-J recently touched nested attorney-object carryover in that
same function. That recency makes it a strong first place to look — this
may be a related or reopened edge of that same fix, not a fresh bug.

### Steps

1. **Reproduce deliberately with instrumented data.** Create an Initial
   Guardianship Plan with a distinctive, single-occurrence attorney name;
   use "Create New Form for Existing Ward" → Annual Guardianship Plan;
   inspect both the rendered field and the underlying stored value (e.g. via
   the app's own data inspection, or `window.D`/`getD()` per the app's
   bridge pattern) before assuming which layer is wrong.
2. **Decision branch, resolved by what's found, not pre-decided here:**
   - If the *stored* value is duplicated: this is a data-correctness bug in
     the carryover field-mapping logic (likely a concatenation instead of
     an assignment, or the carryover function running twice against the
     same target). Fix at the source; check whether any already-saved `.sav`
     files could have already picked up a duplicated value and whether a
     migration note is needed per `AGENTS.md` §8's Legacy Data Migration
     axis.
   - If only the *display* is duplicated (e.g. a template or label rendering
     the same bound field twice): fix the rendering, no data-model or
     migration concern.
3. **Fix** per the branch above, scoped to the mapping/render logic
   specifically implicated — this should not require touching the rest of
   `carryOverFieldsForPlan()`'s other field mappings, which appeared correct
   in this walkthrough.
4. **Regression guard.** Add or extend an e2e/unit spec exercising this
   exact carryover path (Initial Plan → Annual Plan via "New Filing from
   Existing") asserting the attorney name field's value equals the source
   filing's value exactly once, not a duplicate or concatenation. If a
   carryover-workflow spec already exists (per §42D's "Verification"
   section referencing `carryover-workflow.spec.ts`), extend it there rather
   than starting a new file.

### Verification

Targeted spec above, green. If the carryover function is shared across
other Plan-type source/target pairs (Plan Minor → Annual, Plan Simplified →
Annual, etc.), spot-check at least one more pair to confirm this isn't
broader than the one path observed.

### Cross-cutting notes (`AGENTS.md` §8)

**Data Model:** only implicated if the stored value (not just the display)
is duplicated — confirm before assuming a `probate-guardian-data-model.csv`
change is needed; a display bug needs none. **Legacy Data Migration:** same
conditional — if stored duplication is confirmed, existing `.sav` files
created via this carryover path may already carry the bad value; decide
whether to detect-and-clean on load or leave existing files alone (state
the choice explicitly, per §8). **Legal/Compliance:** an attorney name field
that renders wrong on a document intended for court filing is exactly the
kind of accuracy issue `AGENTS.md`'s opening line calls out — worth treating
this at higher priority than its cosmetic-seeming symptom suggests until the
stored-vs-display question is answered.

---

## 50B — Simplified Accounting Eligibility "Load Ward Info From" Not Populating

**Category:** Data correctness. **Confidence:** Low-Medium — I flagged this
as "questionable" during the walkthrough itself, meaning I wasn't fully
confident in the observation even at the time.

### Observed

In the Simplified Accounting eligibility dialog, using the **Load Ward Info
From** picker to select an existing ward did not appear to carry that
ward's information into the new form's cover fields — the cover page
appeared to load with fields still blank after confirming eligibility and
selecting a source ward. I did not rule out timing (the picker may need an
explicit confirm step I missed) or that I was looking at the wrong filing
instance afterward.

### Suspected area (inferred, verify)

Same family as 50A — likely `carrySourcesFor()`/`carryWardsFor()` in
`src/core/navigation/ward-lifecycle.js` per `MILESTONE-42-PROPOSAL.md` §42E
Tranche 4, or a separate code path specific to the eligibility-dialog
picker rather than the dashboard's "New Filing from Existing" flow — worth
checking whether these are actually the same underlying function or two
independently-maintained carryover implementations, since if they're
separate, that's itself worth flagging as a duplication risk similar to
what `MILESTONE-42-PROPOSAL.md` §42D found for the three form-write paths.

### Steps

1. **Re-test deliberately before assuming a defect exists.** Create a ward
   with fully populated cover-page fields (name, case number, county,
   guardian, attorney). Start a new Simplified Accounting filing, trigger
   the eligibility dialog, use "Load Ward Info From" to select that ward,
   confirm, and check the resulting cover page immediately and after a
   reload. If fields populate correctly, this finding is unconfirmed/stale
   and can be closed with no code change — say so plainly rather than
   forcing a fix onto a non-reproducing report.
2. **If it reproduces:** trace whether the eligibility dialog's picker calls
   the same carryover function the dashboard's "New Filing from Existing"
   uses, or a separate implementation. Fix whichever is actually broken;
   if two implementations exist and diverge, consider unifying them (small
   version of the pattern `MILESTONE-42-PROPOSAL.md` §42D applied to the
   three form-write tails) rather than patching one in isolation.
3. **Regression guard**, only once reproduced and understood: an e2e spec
   covering the eligibility-dialog "Load Ward Info From" path specifically,
   since the existing carryover-workflow coverage (referenced in §50A) may
   only exercise the dashboard flow.

### Verification

Either a clean re-test closing this as not-reproducing, or a green targeted
spec confirming the fix.

### Cross-cutting notes

Same as 50A's Data Model / Legacy Data Migration conditionals, contingent
on confirming a real defect first. Export/Import/Portability: N/A unless
the fix touches the shared carryover function used elsewhere.

---

## 50C — City/State/Zip Normalization Regression Risk

**Category:** Data correctness / regression. **Confidence:** Medium.

### Observed

During this session, entering certain address strings caused city/state
into the ZIP field incorrectly on blur — e.g. a city/state pair typed as
`"St.Petersburg,FL33704"` and a city string `"MAlvern"` were each folded
into the ZIP field rather than parsed correctly. Alan separately confirmed
this exact bug class had already been fixed roughly a week prior, and
raised the same question I'd raise: how a previously-fixed bug reappeared
in what was represented as the current build. Two explanations are equally
plausible and neither is confirmed: (a) a genuine regression (the fix was
reverted or never fully merged to `master`), or (b) the build tested was
stale relative to the fix (the uploaded zip predated it). Given Alan later
supplied a fresh build specifically because an earlier zip "was a stale dev
copy," (b) is plausible — but that makes it more, not less, important to
confirm the fix is actually present in current `master` rather than assume
either way.

### Suspected area

`MILESTONE-42-PROPOSAL.md` §42E (Tranche 5) directly names
`formatCityStateZip()` in `src/core/form/form-contract.js` as a real,
current function in this codebase — a strong, non-inferred candidate for
where this normalization logic lives (or where its dead legacy twin was,
per that tranche; confirm which copy is now the live one before editing).

### Steps

1. **Confirm presence and correctness directly against current `master`,
   not against either zip I tested.** Read `formatCityStateZip()` (or
   wherever the actual city/state/zip blur-normalization logic lives) and
   trace what it does with an input containing no separating space before
   the state code, and with a lone city string with no comma/state/zip at
   all.
2. **Reproduce with a minimal unit test first**, independent of any UI
   walkthrough: call the normalization function directly with `"St.Petersburg,FL33704"`
   and `"MAlvern"` as inputs (or whatever field(s) these values actually
   landed in — re-derive the exact field boundaries and expected split from
   the UI, since I did not capture which literal field each string was
   typed into). If the unit-level call already produces the wrong result on
   current `master`, this is a confirmed live regression, not a stale-build
   artifact.
3. **Fix and guard.** If confirmed broken: fix the parsing logic (likely a
   missing space/format-tolerance case in whatever splits city from state
   from zip), and add the two exact failing inputs above as permanent unit
   test cases in whatever spec already covers this function (or a new one,
   added to `TEST-INDEX.md` per `AGENTS.md` §7) — this is exactly the kind
   of "we said we'd fixed X" claim `MILESTONE-42-PROPOSAL.md`'s own closing
   note warns should be checked against reality, not assumed, given it's
   apparently already recurred once.
4. **If not confirmed broken** on current `master`: close this as a
   stale-build artifact, but still add the two inputs as regression test
   cases anyway, since a fix with no permanent test coverage is exactly how
   this could have silently regressed (or appeared to) in the first place.

### Verification

New/extended unit spec passing with both literal inputs above as permanent
cases.

### Cross-cutting notes

**Test Coverage & Index:** this is the core deliverable here — a
previously-fixed bug with no apparent regression guard is a testing-index
gap on its own, independent of whether the code itself is currently broken.
**Legal/Compliance:** an address that ends up wrong on a filed document
(guardian or ward residence, in particular) is a real-world accuracy
concern for court paperwork, not merely cosmetic.

---

## 50D — Highlight Annotation Renders Solid Black

**Category:** Visual rendering, on court-facing PDF output. **Confidence:**
Medium.

### Observed

Using the PDF annotation toolbar's Highlight tool (in Print Preview /
output review), marks made with the Highlight tool rendered as solid black
rather than a translucent color as expected of a highlight. This appeared
inconsistent across attempts — I did not get a clean, repeatable minimal
reproduction, so "unreliable" is the most honest characterization rather
than a fixed rule like "always renders black."

### Suspected area

`MILESTONE-42-PROPOSAL.md` §42B (Step B2) directly confirms
`src/core/pdf/pdf-annotate.js` as the real, current file implementing PDF
annotation event handling in this codebase (it's where that proposal found
the `onAbort` false-positive). The highlight tool's fill-color/opacity or
blend-mode handling is a reasonable first place to look in that same file
or its drawing/canvas layer.

### Steps

1. **Get a clean, minimal repro first** — this is the priority before any
   fix, since the behavior was inconsistent in my own testing. Try the
   Highlight tool against a freshly opened Print Preview, in isolation from
   any other annotation type, and note whether it's consistently black,
   intermittently black, or dependent on some other state (e.g. annotating
   over an already-annotated area, browser zoom level, or which PDF page).
2. **Once reproduced:** read the highlight tool's drawing code for its
   fill-color and alpha/opacity handling — a common bug shape here is an
   opacity value being dropped or overwritten (e.g. a hex color set without
   its alpha channel, or a canvas `globalAlpha` reset between draw calls).
   Compare directly against another annotation type (e.g. underline or a
   colored box, if present) that is rendering correctly, to isolate what's
   different about the highlight tool's own code path specifically.
3. **Fix and guard** with a rendered-output check if the test suite has a
   pattern for asserting canvas/PDF pixel or color output (check for an
   existing visual-regression pattern before inventing one); otherwise, a
   unit test asserting the highlight tool's constructed fill/style value is
   the intended translucent color is a reasonable minimum guard even
   without full pixel-level verification.

### Verification

Clean, repeatable manual confirmation that the Highlight tool now renders
translucent, plus whatever automated guard Step 3 lands on.

### Cross-cutting notes

**Legal/Compliance:** annotations here are being made on documents destined
for actual court filings or internal review of those filings — a highlight
that obscures the underlying text in solid black rather than tinting it is
a real functional defect for that use case, not just an aesthetic one.

---

## 50E — Annual Guardianship Plan Benefits Schedule: Oversized Rows

**Category:** Visual / layout. **Confidence:** High that the visual effect
is reproducible; genuinely uncertain whether this needs new work or is
already covered — see the note below.

### Observed

On the Annual Guardianship Plan's benefits schedule page, entered rows
rendered with unusually tall vertical space relative to their actual
content — noticeably taller and more scroll-heavy than comparably-dense
row/card components elsewhere in the same form family (e.g. the asset
schedules in Annual Accounting).

### Important overlap to check before scoping any work

`MILESTONE-42-PROPOSAL.md` §42B's concurrency note and its Step B4 both
describe **Milestone 40I** as in-flight work specifically on a
`min-height`/label-alignment rule affecting multi-column schedule-card
layout, tracked by `schedule-card-layout.spec.ts:177` and touching
`src/styles/forms.css`. That is a strong enough match in symptom
(oversized/misaligned schedule rows) that this finding may simply be the
same defect 40I was already scoped to fix, observed from a different form.
**Before scoping any new work here, confirm whether Milestone 40I has
landed and whether its fix already resolves this specific page** — per
`AGENTS.md` §10, `src/styles/cards.css` is the authoritative home for
`.entry-card`/`.summary-box` sizing generally, so also check whether this
page's benefits rows use those standard classes or a bespoke layout that
40I's fix wouldn't have touched.

### Steps

1. **Check Milestone 40I's landing status and diff** against this specific
   page first. If 40I already fixes it, close this item with a note, no
   new work.
2. **If not already covered:** identify whether the benefits schedule rows
   use the standard `.entry-card` pattern (`cards.css`) or a separate,
   form-specific layout. If standard: the oversizing is likely a
   content-specific issue (e.g. an unusually tall field inside the card
   forcing `min-height` upward) rather than a systemic `cards.css` bug —
   scope narrowly to this page's specific fields. If bespoke: consider
   whether migrating to the standard card pattern is in scope here or a
   separate, larger decision (per `AGENTS.md` §9's Tier 2 card-template
   guidance) — flag rather than deciding unilaterally.
3. **Fix and verify visually** against at least one comparable, correctly-sized
   schedule page in the same form to confirm consistency, not just that the
   benefits page alone looks better in isolation.

### Verification

Visual check (side-by-side against a correctly-sized comparable schedule);
existing `schedule-card-layout.spec.ts` (or equivalent) remains green if
this page is in that spec's scope, or gets extended to cover it if not.

### Cross-cutting notes

**UI/UX Consistency:** this is exactly the axis `AGENTS.md` §8 asks a plan
to address — prefer the existing card pattern over a new one, and name
which pattern is actually being reused once Step 2 above is answered.

---

## 50F — Typed-Signature Preview Clips Long Names

**Category:** Visual / possible output accuracy. **Confidence:** High that
the on-screen preview clips; genuinely unconfirmed whether the exported
PDF signature stamp is also affected — this distinction matters a lot for
severity and should be resolved before scoping a fix.

### Observed

In the Signature Stamp control's "Type" tab, typing a sufficiently long
name caused the rendered preview text to clip/cut off at the container's
edge rather than shrinking to fit or wrapping to a second line.

### Steps

1. **First and most important: determine whether this is preview-only or
   also present in the applied stamp and the final exported PDF.** Apply a
   clipped-looking typed signature to a real field, then check the applied
   stamp's rendering on the form page itself, and generate a PDF via Print
   Preview to check the signature block there too. If the exported PDF
   signature is correct despite a clipped live preview, this is a low-severity
   cosmetic issue in the preview component only. If the clipping carries
   through to the applied stamp or the exported PDF, this becomes a
   legal-document accuracy issue — a signature that's visibly truncated on
   a filed court document — and should be treated with correspondingly
   higher priority.
2. **Fix, scoped by Step 1's finding.** A common, low-risk fix for this
   shape of bug is auto-scaling the font size down to fit the container
   width (either iteratively reduce `font-size` until the rendered text
   width fits, or use a CSS approach appropriate to whatever rendering
   method — canvas vs. DOM text — the "Type" tab actually uses; confirm
   which before assuming a CSS fix is even applicable, since a canvas-drawn
   signature needs a different technique than a styled `<div>`).
3. **Guard.** A unit or e2e test typing a long name (e.g. a full
   hyphenated name plus suffix, 30+ characters) and asserting the rendered
   signature — preview and, if Step 1 found it necessary, the applied
   stamp/exported output — is not visually truncated.

### Verification

Per Step 1's finding: either a preview-only fix confirmed visually, or a
fix confirmed through to the applied stamp and an exported PDF sample.

### Cross-cutting notes

**Legal/Compliance:** contingent entirely on Step 1's finding — flag for
Alan's own judgment on priority once it's known whether this reaches the
actual filed document, per `AGENTS.md` §8's instruction not to resolve
legal-sufficiency questions in a planning document.

---

## 50G — Native `window.confirm()` Dialogs Break App-Modal Consistency

**Category:** Consistency / robustness. **Confidence:** High — confirmed
both by direct observation and by reading the relevant bundle.

### Observed

Two destructive/consequential actions used the browser's native
`confirm()` dialog rather than the app's own custom modal system
(`.modal-overlay`/`.modal-box`, used consistently everywhere else observed
in the app — e.g. `#addWardModal`, `#simplifiedEligibilityModal`):

- **"Clear Annotations"** in the PDF annotation toolbar triggered a native
  confirm dialog. In this session, that native dialog froze the browser
  automation tooling being used for testing for an extended period until
  manually dismissed — which is itself informative: a native dialog is
  modal at the *browser* level, not just the page level, and behaves
  differently from the app's own modals in embedded contexts, some
  extensions, and any future automated-testing or accessibility tooling
  that expects consistent in-page modal behavior.
- **"Use my saved signature"** reuse — confirmed directly by reading
  `signature-state-control-<hash>.js` in the built bundle — calls
  `window.confirm('Apply your saved signature to this filing?')` before
  copying a saved stamp onto a new signature block.

### Suspected area

The Clear-Annotations confirm is most likely in the same file
`MILESTONE-42-PROPOSAL.md` §42B already confirms as real and current,
`src/core/pdf/pdf-annotate.js`, or its associated toolbar component. The
saved-signature confirm is in whatever source file compiles to the bundle
named `signature-state-control-*.js` **(inferred filename; the built bundle
confirms the code exists, not its source path — likely something under
`src/core/form/` or a shared UI component directory, given the naming
convention of other files `MILESTONE-42-PROPOSAL.md` references)**.

### Steps

1. **Audit all `window.confirm`/`window.alert`/`window.prompt` call sites**
   across `src/` (a simple grep, similar in spirit to the pattern
   `MILESTONE-42-PROPOSAL.md` §42C used for `window.*` bridge assignments)
   to get a complete list rather than assuming these two are the only ones.
2. **Convert each to the app's existing modal pattern**, reusing whatever
   shared confirm/modal component already exists (the app clearly has one,
   given `#addWardModal`/`#simplifiedEligibilityModal`) rather than building
   a new one-off. Preserve the exact same trigger condition and message
   text per site — this should be a mechanical replacement of the dialog
   mechanism, not a UX redesign of when confirmation is asked for.
3. **Regression guard.** A unit test (matching 42C's allow-list pattern) that
   fails if a new `window.confirm`/`alert`/`prompt` call site appears
   anywhere in `src/` going forward, so this can't silently reappear as new
   destructive actions get added.

### Verification

Grep-based guard test passes with zero remaining native-dialog call sites;
manual confirmation that both flows above now show the app's own modal and
behave identically otherwise (same trigger, same effect on confirm/cancel).

### Cross-cutting notes

**UI/UX Consistency:** directly the axis in question — the app already has
an established modal pattern; this brings two outliers into line with it,
per `AGENTS.md` §8's preference for reusing existing patterns over
inventing new ones (here, the reverse: eliminating a non-conforming
pattern).

---

## 50H — County & Active-Filing Combobox Interaction Pattern

**Category:** Interaction robustness / possible accessibility gap.
**Confidence:** Medium — the non-standard event handling is confirmed;
whether it actually affects real users (as opposed to only the automation
tooling used for this testing) is not.

### Observed

Two combobox-style controls required interaction patterns that a plain
click did not satisfy:

- The **county autocomplete** (on filing cover pages) required a
  `mousedown` event on the dropdown option specifically — a plain `click`
  did not reliably select an entry, and blurring the field (e.g. via Tab)
  closed the dropdown without committing whatever was highlighted.
- The **Active Filing** picker in the sidebar (the ward/filing switcher)
  similarly required `mousedown` on the target entry, followed by either
  pressing Enter or clicking a separate "Switch Filing" affirmative action
  to actually commit the selection — a plain click-and-release on the
  option did not commit it by itself.

I want to be direct about the limits of this observation: I encountered
this through browser-automation tooling, which does not always replicate
real mouse/keyboard event sequences identically to a human using a trackpad,
touchscreen, or physical mouse. It's possible these controls work perfectly
normally for ordinary point-and-click use and this is purely an automation
quirk. What makes it worth flagging anyway is that this specific event
pattern (requiring `mousedown` rather than `click`, and requiring a
secondary commit step rather than treating the initial selection as final)
is also exactly the pattern that tends to fail for keyboard-only navigation
and some assistive technology, which follow standard combobox interaction
expectations (arrow keys to move, Enter or a single unambiguous action to
commit) rather than a `mousedown`-specific handler.

### Suspected area

`MILESTONE-42-PROPOSAL.md` §42D (Step D4) confirms
`src/core/navigation/ward-county.js` as a real, current file — a solid
candidate for the county autocomplete specifically. The Active Filing
sidebar picker's source location is **not confirmed** by anything I've
read directly; it's plausibly in the same `src/core/navigation/` area
given the file-organization pattern, but that's a guess.

### Steps

1. **Confirm with a real-input test, not just automation**, before assuming
   this needs fixing: have a person click through both controls normally
   (mouse and, separately, keyboard-only — Tab to the control, type to
   filter, arrow keys, Enter) and note where each one does or doesn't
   behave as expected.
2. **If keyboard-only or standard click interaction is confirmed broken**
   (not just an automation artifact): bring both controls' event handling
   in line with the standard combobox interaction pattern — listening for
   `click`, not only `mousedown`, on options, and supporting keyboard
   selection (arrow keys + Enter) without requiring a mouse at all. The
   WAI-ARIA combobox pattern is a reasonable reference for the expected
   event/keyboard contract if a from-scratch redesign is in scope; if not,
   the minimal fix is just adding the missing `click` handler and keyboard
   support alongside the existing `mousedown` handler rather than replacing
   it, to avoid regressing whatever the current handler is relied on for.
3. **If real-input testing shows no problem:** close this as an automation-tooling
   artifact, but consider whether e2e test coverage for these two controls
   should itself be updated to use the same `mousedown`-then-commit sequence
   documented here, so future test authors don't hit the same confusion
   this walkthrough did.

### Verification

Manual confirmation (mouse and keyboard-only) that both controls select and
commit correctly; if changed, existing e2e specs touching either control
(county selection, ward switching) re-run and stay green.

### Cross-cutting notes

**UI/UX Consistency:** if a genuine keyboard-accessibility gap is confirmed,
this is worth treating as more than cosmetic — court-facing professional
software should support keyboard-only operation as a baseline, independent
of whether any specific user has requested it.
