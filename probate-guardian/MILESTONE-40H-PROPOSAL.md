# Milestone 40H: Post-Deploy Browser QA and Test-Data-Generation Fixes (Boot/Readiness Crashes, Data-Loss and Carryover Gaps, Accessibility, Text and Totals Fidelity)

## Status

**Draft only — independently approved delivery.** This proposal authorizes
no runtime, test, or documentation change until the requester approves
Milestone 40H specifically. Approval of another Milestone 40 delivery does
not authorize this work.

### Independent review against current `master` (2026-09-13, after 40A–40G landed)

All four tasks re-verified directly. **Every one is still real and still
unfixed**; nothing in this proposal was resolved by the seven deliveries that
landed in the meantime. Three corrections, none of them to the substance:

- **Line numbers have all drifted** — 40F/40A/40C-1 deleted roughly 800 lines
  from `legacy-app.js` between them. Current locations: 40H-A's unguarded
  `return window.validateGuardian();` is at **`:8156`** (proposal says 7982-7984)
  and its guard precedent at **`:7616`** (says 7449); 40H-D's
  `planReadinessPanel()` is at **`:6574`** with the orphan `</summary>` at
  **`:6584-6590`** (says 6541-6567). 40H-B's `if (!val) D.safeDepositBoxFiled =
  null;` is at **`guardian-inventory/index.js:174`**. Re-derive rather than trust
  any line number here.
- **40H-C confirmed by absence:** `grep -c fieldset
  src/features/guardian-inventory/index.js` returns **0** — the whole file has no
  `fieldset` element, so both D-3 groups are unwrapped exactly as described.
  Note 40C-2 edited these same lines (the `sdbIsYes`/`sdbIsNo` predicates at
  `:1001`, `:1005`, `:1009`) without touching the markup structure, so the two
  changes are compatible.
- **40H-D: there is a second `<div class="validation-head">`, and it is
  correct.** `excelCapacityPanel()` (`legacy-app.js:6753`) uses the same class,
  but its wrapper is a plain `<div class="validation-panel excel-cap-panel">`,
  not a `<details>` — so `<div>` is right there and it has no orphan
  `</summary>`. Recorded so a later reader grepping for `validation-head`
  doesn't "fix" a second site that isn't broken. The bug is `planReadinessPanel()`
  only.

### Second pass (2026-09-13, later same day): the first pass's own citations had drifted too

Re-verified every line number in the task bodies below directly against
current `master`, not just the four this addendum originally corrected.
Three more were stale — the first pass fixed the *task-triggering* call
sites but not every citation around them:

- `computeNavChecks()`'s actual unguarded call to `validate()` is at
  **`:7241`** (`computeNavChecks()` itself starts `:7224`) — the body below
  said `:7086`, which today is unrelated code.
- `getWardProgress()`'s try/catch is at **`:7635-7643`** — the body said
  `:7468-7476`.
- `validationPanel()` is at **`:1657-1696`** — the body said `:1647-1686`,
  which today is a Roman-numeral route-matcher, not this function.

All citations in the task bodies and the File/Delivery Overlap Check below
have been corrected in place to match; they no longer need the "re-derive
rather than trust" caveat above. Recorded here rather than silently fixed,
per this repository's own convention for proposal-accuracy corrections.

### Third pass (2026-09-13, review for executability): one more commit, one more drift

A third-party commit landed after the second pass —
`3b8dadf` ("fix(sidebar): clear stale filing context/nav when returning to
dashboard"), unrelated to any Milestone 40 delivery — and added 13 net
lines to `legacy-app.js` starting at its original line 5187, shifting every
`legacy-app.js` citation below that point by the same +13. Re-verified
every function anchor directly rather than applying that offset by
arithmetic (the second pass already showed drift isn't always uniform):
`showConvertWardModal`'s dead legacy twin `:5272-5284` (was `:5259-5271`),
`convertExistingWard()`'s closing `alert()` at `:5586` (was `:5573`),
`doConvertWard()` at `:5589` (was `:5576`), `planReadinessChecks()`
`:6575-6585` (was `:6562-6572`), `planReadinessPanel()` `:6587-6613` with
its `<div class="validation-head">`/orphan `</summary>` at `:6596-6603`
(was `:6574-6600`/`:6583-6590`), `excelCapacityPanel()`'s validation-head at
`:6766` (was `:6753`), `computeNavChecks()` `:7237` with its `validate()`
call at `:7254` (was `:7224`/`:7241`), the guard precedent at `:7629` (was
`:7616`), `getWardProgress()` `:7644` with its try/catch at `:7648-7656`
(was `:7631`/`:7635-7643`), and `validate()` itself at `:8168-8170` (was
`:8155-8157`). `describeConversion()` (`:5348-5365`), `validationPanel()`
(`:1657-1696`), `sanitizeInput()`/`validateSecurityInput()`
(`:1109-1158`), `formatName()` (`:1538-1545`), and both
`carryOverAccountingToAccounting()`/`carryOverFields()` (`:3834-3950`) sit
above the insertion point and are unchanged. Every other cited file
(`guardian-inventory/index.js`, `form-contract.js`,
`features/annual-accounting/totals.js`, `core/modals/convert-ward-modal.js`,
`core/navigation/ward-lifecycle.js`, all seven `index.js` files Task 40H-E
touches) has no commit since the second pass (`git log` per-path,
confirmed) and needs no correction. All body citations below are now
updated to match.

One section is now **moot rather than wrong**: the "File/Delivery Overlap Check"
reasons about sequencing against Milestone 40C-1, which has since landed (along
with 40C-2). Its conclusion held — 40C-1 did not touch
`guardian-inventory/index.js` — but there is no longer an ordering question. Note
that **40C-2** did touch that file (the D-3 predicates above, and a new D-4
bond-period order check), so the overlap statement should not be read as "no
Milestone 40 delivery touched this file."

## Goal

*(Scope note added 2026-09-13: this proposal also now carries a record of six
open items found while implementing the rest of Milestone 40 — see "Open Items
Carried Forward" at the foot of this file. Those are **not** tasks in this
delivery; 40H remains the ten fixes below.)*

Fix ten defects: three surfaced by an exploratory browser QA pass against
production (2026-09-13, `Probate_Guardian_Exploratory_QA_BugReport.md`), one
surfaced by a follow-up audit of Print Preview rendering across all nine
filing types, one — Task 40H-E — added directly by the requester (2026-09-13,
later the same day), and five more (Tasks 40H-F through 40H-J) surfaced by a
same-day test-data-generation pass that completed one filing of every type
end to end (`Probate_Guardian_TestData_Findings.md`), one of which (40H-J)
was promoted from this proposal's own open-items register per requester
choice rather than sourced from that pass directly: a console exception
that fires on every dashboard render for every Guardian Inventory ward, a
Guardian Inventory conditional field that silently destroys data with no
restore path, two Yes/No radio groups missing the semantic markup this
repository's own `AGENTS.md` requires, a malformed `<details>`/`<summary>`
element on every Plan-type filing's Print Preview readiness panel, a missing
preparer-facing authorization note on every filing type's signature page, the
identical dangling-global crash pattern as the dashboard bug but in the four
Plan types' readiness routine, two free-text sanitization bugs that corrupt
stored data, three schedule totals that go stale after the first render, a
ward-selector default plus a filing-carryover gap in "New Filing from
Existing," and a second, symmetric carryover gap that drops the attorney's
bar number/phone/address on Plan/Accounting → Guardian Inventory conversions.
None of the ten touches persisted data shape in a way that changes the data
model, and none overlaps any file Milestone 40C-1 is editing. The Print
Preview audit also surfaced a larger architectural
inconsistency worth recording — two non-unified readiness-panel
implementations split across filing-type families — recommended as future
work, not scoped into this delivery (see "Recommended Standard" below).

## Background

The originating QA pass reported six items total; three were re-verified
directly against the code (not just the browser session) before writing
this proposal, and three others were separately resolved:

- **Two "dangling global" boot errors the report also flagged
  (`window.createFeatureBridge is not a function`,
  `_lastAutoSavedAt is not defined`) are NOT part of this delivery.**
  They were confirmed, via a same-day re-test with `deployment.json`
  checked before and after, to have fired against the previous deployed
  commit (`4834b61`) and to no longer reproduce on the current one
  (`ab8d2d16`, fixed by Milestone 40F/40G). No action needed.
- **The PDF table address-overflow audit Milestone 40E's own Decision 3
  called for was spot-checked and appears complete** — both
  `annual-accounting/pdf-model.js:971` and
  `simplified-accounting/pdf-model.js:272` already use the
  `[r.line2, r.line3, r.line4].filter(Boolean)` array form, and
  `plan-simplified/pdf-model.js:146,159`'s address fields are
  `type: 'signature-block'` fields whose label contains "address" — already
  covered by the pre-existing `formatMailingAddress()` path, not the
  table-cell bug 40E fixed. No gap found; not a task here.
- Three items from the report are recorded below as **open decisions**
  rather than tasks, because they need the requester's judgment, not a
  mechanical fix (see "Open Decisions" section).

### Task 40H-A — Dashboard throws `window.validateGuardian is not a function` on every render

`legacy-app.js:8168-8170`:

```js
function validate(){
  return window.validateGuardian();
}
```

This is called unguarded from `computeNavChecks()` at `legacy-app.js:7254`
(`activeInventoryType==='guardian'` branch), which `getWardProgress()`
wraps in a try/catch at `:7648-7656` — the exact source of the console
warning `progress calc failed for ward <id> TypeError: window.validateGuardian
is not a function`. The exception is swallowed, so the guardian dimension of
that ward's dashboard progress/readiness is silently computed from an
incomplete validation (`getWardProgress()` returns `null` for that ward
instead of a real `{complete,total,pct}`).

`window.validateGuardian` is assigned only once the Guardian Inventory
feature bundle lazy-loads (`guardian-inventory/index.js:1197`). The
dashboard computes progress for every ward on render, before that bundle is
guaranteed to have loaded this session — so any guardian-type ward shows
degraded progress on the dashboard until *something* has triggered the
guardian bundle to load. This is deterministic, not intermittent: it will
reproduce on the first dashboard paint of a session with a guardian-type
ward and no prior guardian-feature navigation.

The fix pattern already exists two call sites away, guarding the identical
call: `legacy-app.js:7629` —
`if(type==='guardian'&&typeof window.validateGuardian==='function')rawErrors=window.validateGuardian(window.D);`.
Line 8169 never received the same guard.

**Decision:** Guard the call in `validate()` the same way line 7449 does,
and have it degrade to an empty error array (not a thrown exception) when
`window.validateGuardian` is not yet a function, so `computeNavChecks()`
returns a real (if temporarily guardian-blind) result instead of `null`.
Confirm this doesn't mask the *real* underlying gap silently forever:
`getWardProgress()`'s dashboard consumer should still surface a way to
tell "this ward's guardian validation hasn't loaded yet" apart from "this
ward is 0% complete," if such a distinction is user-visible today — check
`dashboard-view-model.js`'s actual rendering of a `null` vs. degraded
result before deciding whether any UI text needs to change, since this is
a data-fidelity concern (per `AGENTS.md` Section 4's parity invariant: the
dashboard's displayed progress must reflect a complete validation, not a
partial one, once the guardian bundle *has* loaded).

### Task 40H-B — Safe Deposit Box parent toggle destroys the child answer with no restore

`guardian-inventory/index.js:171-178`:

```js
if (control.dataset.inventoryChange === 'set-sdb') {
  const val = control.value === 'true';
  D.hasSafeDepositBox = val;
  if (!val) D.safeDepositBoxFiled = null;
  autoSave();
  updateNavDots();
  window.navigate('/d3');
}
```

Setting the parent (`hasSafeDepositBox`) to `Yes`, then the child
(`safeDepositBoxFiled`) to `Yes`, then the parent back to `No` wipes the
child to `null` — and setting the parent back to `Yes` does **not** restore
it; the child radios render blank. This is exactly the anti-pattern
`AGENTS.md` Section 3 names explicitly: "Hiding a section or unchecking a
toggle... must never delete entered data — re-checking must restore it.
Deletions require an explicit user action." No explicit user action deletes
the child here — a plain parent-toggle round trip does.

The row is already conditionally hidden purely by CSS class at render time,
independent of the child's stored value —
`guardian-inventory/index.js:1009`:
`<div id="sdb-filed-row" class="${sdbIsYes(D.hasSafeDepositBox)?'':'d-none'}">`.
Export/readiness validation and the PDF model already gate on the parent
before reading the child (`index.js:1158-1160`;
`pdf-model.js:534`'s `...(d.hasSafeDepositBox === true ? [...] : [])`), so
a stale child value sitting in state while the parent is `No` is never
read, exported, or shown — it is already inert by construction.

**Note the tri-state shape here is boolean `null`/`true`/`false`, not the
`''`/`'Yes'`/`'No'` string convention `yesNoRadioHTML()` uses elsewhere in
this same file** — `tests/unit/guardian-inventory-yes-no-radio.spec.js:14-28`
documents why: Milestone 38E deliberately made `null` (not `''`) the
initial default for this exact field pair, after finding a narrow gap where
`pdf-model.js`'s strict `=== true`/`=== false` check and
`validateGuardian()`'s looser `=== null`/`=== undefined` check disagreed on
what `''` meant. Any fix here must preserve that boolean shape — do not
migrate these two fields to `yesNoRadioHTML`'s string convention as part of
this task; that would silently reintroduce the class of bug 38E already
closed.

**Decision:** Delete the `if (!val) D.safeDepositBoxFiled = null;` line.
The child's stored value persists while hidden (harmless, per the gating
above) and correctly reappears if the parent is set back to `Yes` — no
stash/restore mechanism is needed because nothing needs to be destroyed in
the first place. Confirm export of a filing where the parent is currently
`No` still never emits the child's stale value (already true structurally,
per `pdf-model.js:534` above, but assert it explicitly rather than assume).

### Task 40H-C — Inventory D-3 Yes/No radio pairs need semantic `fieldset`/`legend`

`guardian-inventory/index.js:999-1019`: both the `hasSafeDepositBox` group
(`:999-1008`, a bare `<p>` + `<div class="d-flex gap-4">`) and the
`safeDepositBoxFiled` group (`:1009-1019`, a `<label class="form-label">` +
`<div class="d-flex gap-4">`) are only *visually* paired — no `<fieldset>`,
no `<legend>`. This violates `AGENTS.md` Section 6: "Binary radio pairs
write string `'Yes'`/`'No'` and must be wrapped in semantic
`<fieldset>`/`<legend>`."

This is inconsistent with the rest of the same file: Schedule A-1, B-1,
B-2, and B-3's binary questions already go through `yesNoRadioHTML()`
(`legacy-app.js:6264-6277`), which emits
`<fieldset class="plan-yes-no mb-2" data-yes-no-group="...">` +
`<legend class="form-label mb-1">...</legend>` correctly —
`tests/unit/guardian-inventory-yes-no-radio.spec.js:36-44` already asserts
this for those four groups. The D-3 SDB pair is hand-rolled markup instead,
which is why it was missed.

**Decision:** Wrap each of the two existing radio groups in
`<fieldset>`/`<legend>`, keeping their current `data-inventory-change`
wiring, `id`s, and boolean `value="true"/"false"` attributes exactly as
they are — this is a markup-structure fix only, not a rewrite onto
`yesNoRadioHTML()` (which would force the string `'Yes'`/`'No'` convention
Task 40H-B's note above warns against reintroducing). Use the legend text
already present as plain text today (the `<p>` question text for the
parent group, the `<label>` text for the child group).

## Print Preview Warning/Error/Readiness Rendering — Audited Across All Nine Filing Types

Prompted by a live screenshot of Guardian Inventory's Print Preview page
showing three stacked panels with visibly different styling. Read all
seven `print.js` files plus their three shared dependencies
(`legacy-app.js`'s `validationPanel()`, `core/filing/readiness-card.js`'s
`filingReadinessCard()`, `legacy-app.js`'s `planReadinessPanel()`/
`planReadinessChecks()`) directly rather than inferring from the one
screenshot. The picture is bigger than wording: **two entirely separate,
non-unified readiness-panel architectures coexist**, split cleanly along
family lines.

### What's actually consistent

- **The top "missing fields" banner** (`validationPanel()`,
  `legacy-app.js:1657-1696` — "N required fields still missing / Across N
  sections... Go to section ↗") is a single shared function, called
  identically by all seven `print.js` files. No divergence here.
- **The "Preview blocked" override banner** (`blockedPanelHTML()` /
  `mountPdfPreview()`, `core/pdf/pdf-preview.js`) is likewise one shared
  implementation used by every filing type via `mountPreview()`. No
  divergence.

### What's not: two readiness-card implementations, split 5 vs. 4

| | **`filingReadinessCard()`** (`readiness-card.js`) | **`planReadinessPanel()`** (`legacy-app.js:6587-6613`) |
| --- | --- | --- |
| Used by | Guardian Inventory, Simplified Accounting, Annual/Final/Trust Accounting (5 filing types) | Plan Simplified, Plan Annual, Plan Initial, Plan Minor (4 filing types) |
| Source of the checklist | `preflight.structuredIssues` — the exact same structured issues `validateX()` uses to block export | A hand-maintained `{auto,manual}` array per filing type (`planReadinessChecksX()`, one per Plan type, each with its own hand-written `ok:` predicates) |
| Parity guarantee | **By construction** — an issue the validator raises automatically becomes a readiness-card row; cannot drift | **None** — a separate predicate must be kept in sync with the validator by hand. This is the exact architecture that produced the two real parity bugs Milestone 40C-E had to find and fix one at a time (Plan Annual's empty-provider gap, Plan Minor's missing case-identity/amended-form items) |
| Local-guidance title logic | `hasSixthCircuitLocalGuidance(data?.county)` — calls the shared helper | `['pinellas','pasco'].includes(String(window.D?.county\|\|'').trim().toLowerCase())` — **reimplements the same check inline** instead of calling `hasSixthCircuitLocalGuidance()`, a second place that must be kept in sync if the county list ever changes |
| "Checked from…" section label | "Checked from this filing" | "Checked from your plan" |
| Manual-review content | One fixed sentence per filing type, from a lookup object | A bulleted list of multiple items per filing type (Plan Simplified: 9 items; Plan Annual: 11), each citing the specific statute/requirement |
| Disclaimer subtitle | None | "Mirrors what the Clerk of Court looks for when reviewing a plan. Passing every check does not guarantee approval." |
| Icon | None | Shield icon (`ic('shield',17)`) |
| `<details>`/`<summary>` markup | Correct — `<summary>` wraps the head, closed with a matching `</summary>` | **Broken** — see Task 40H-D below |

### Task 40H-D — `planReadinessPanel()` emits a `<details>` with no matching `<summary>`

`legacy-app.js:6596-6603`:

```js
return `<details class="validation-panel readiness-panel no-print"${pending?' open':''}>
    <div class="validation-head">
      ${ic('shield',17)}
      <div>
        <div class="validation-title">...</div>
        <div class="validation-sub">...</div>
      </div>
    </summary>
```

The head is opened as a plain `<div class="validation-head">`, not
`<summary>` — but it's still closed with `</summary>`, an orphan closing
tag with nothing to match. Compare `filingReadinessCard()`
(`readiness-card.js:25`), which correctly opens `<summary>` and closes it
the same way. The practical effect on all four Plan types' Print Preview
pages: the `<details>` element gets no real `<summary>` child, so it loses
the browser's native disclosure semantics (default toggle marker, implicit
button role, keyboard activation) that `filingReadinessCard()`'s version
gets for free. Browsers silently drop the orphan `</summary>`, so this
doesn't crash anything — which is exactly why it went unnoticed.

**Decision:** Change `<div class="validation-head">` to
`<summary class="validation-head">`, matching `filingReadinessCard()`'s
structure. No other markup, styling, or behavior change.

### Recommended Standard — Not Scoped for 40H

The four wording/content/icon differences in the table above are cosmetic
and could be reconciled cheaply. The parity-guarantee difference is not
cosmetic — it's the same class of bug 40C-E already had to fix twice, and
the hand-maintained architecture can produce another one at any time a
Plan validator changes without its matching `planReadinessChecksX()`
predicate being updated in lockstep. **Recommendation: migrate all four
Plan types onto `filingReadinessCard()`**, carrying forward
`planReadinessPanel()`'s two genuinely better pieces of content (the
itemized, statute-cited manual-review list, and the "does not guarantee
approval" disclaimer) rather than losing them — `filingReadinessCard()`'s
`manual` lookup would need to accept an array of items instead of one
sentence to hold that content, and the disclaimer would need to become
universal rather than Plan-only.

This is a real migration, not a copy-edit: each Plan type's readiness
items would need to be re-derived from `structuredIssues` at matching
granularity (`planReadinessChecksAnnual()` alone has 17 hand-written
conditions), and `tests/unit/plan-annual-parity.spec.js` /
`plan-simplified-readiness-parity.spec.js` / the equivalent Initial/Minor
suites would need rework rather than deletion, since they're the existing
regression guard against exactly this drift. That's out of proportion to
40H's other three small, independent fixes — recommend scoping it as its
own future milestone rather than folding it in here. Task 40H-D above
(the `<summary>` fix) stands on its own regardless of whether or when that
larger migration happens.

### Task 40H-E — Add a preparer-authorization note above each signing page's perjury attestation

Added directly by the requester (2026-09-13), not sourced from the QA
report or the Print Preview audit above. Every filing type's guardian/party
signature page pairs a sworn statement ("Under penalties of perjury...")
with the actual signature capture, but nothing on that page tells the
*preparer* — the person operating this app, who is not necessarily the same
person signing — that attaching a signature on someone else's behalf
requires that person's actual authorization.

Confirmed by grep, not assumption: exactly seven sites carry this
statement, one per feature module, together covering all nine filing types
(`annual-accounting`'s single site serves Annual, Final, and Trust
Accounting):

- `guardian-inventory/index.js:929-932` — `<h1>Part III: Guardian(s)
  Attestation</h1>` immediately followed by a
  `<div class="schedule-instructions">` wrapping the statement.
- `simplified-accounting/index.js:452-453` — `<h1>Part III — Guardian(s)
  Declaration</h1>` immediately followed by `<div class="attestation-text">`.
- `annual-accounting/index.js:648-649` — `<h1>Part III — Guardian(s)
  Signature &amp; Declaration</h1>` immediately followed by
  `<div class="attestation-text">`.
- `plan-simplified/index.js:268-269` — `<h1>Signatures</h1>` immediately
  followed by `<div class="attestation-text mb-3">`.
- `plan-minor/index.js:352` — no heading immediately above; the statement is
  an inline-styled `<p class="mt-2 mb-3" style="font-size:.85rem;...">`
  following a block of certification checkboxes, deeper in the same page.
- `plan-initial/index.js:514` — same shape as `plan-minor`.
- `plan-annual/index.js:607` — same shape as `plan-minor`/`plan-initial`,
  but using the shared `attestation-text` class.

No shared renderer produces any of this markup — each site is hand-rolled
per file, using three different, inconsistent class conventions
(`attestation-text`, `schedule-instructions`, an inline-styled `<p>` with no
class at all). A repo-wide grep for `attestation-text`, `Attestation`, and
`preparerNote`/`renderPreparerNote` confirms there is nothing to extend:
only the CSS class definition (`styles/cards.css`) and these seven call
sites exist — no JS render function to add a parameter to.

**Decision:** Insert one line of preparer-facing text immediately above the
sworn statement at all seven sites, in a single new shared CSS class
(`.preparer-note`, defined once in `styles/cards.css`) rather than matching
each site's own inconsistent existing class — so the note looks and reads
identically everywhere regardless of which of the three markup patterns its
page uses today. Proposed text, open to wording adjustment at
implementation:

> Preparer's note: Before attaching any signature on this page, confirm you
> have that party's actual legal authorization to sign on their behalf. Do
> not sign for a party you have not been authorized to sign for.

**Scope is the seven in-app editor pages only** — explicitly **not** the
corresponding `pdf-model.js` sites that render the same sworn statement into
the exported PDF/DOCX (`guardian-inventory/pdf-model.js:472`,
`simplified-accounting/pdf-model.js:154`, `annual-accounting/pdf-model.js:266`,
`plan-simplified/pdf-model.js:176`, `plan-minor/pdf-model.js:233`,
`plan-initial/pdf-model.js:469`, `plan-annual/pdf-model.js:532`). This note
is instructional text aimed at whoever is operating the app, not part of
the document filed with the court — it has no reason to appear in the
exported filing itself, and putting non-statutory text into a court-filed
document is a different and much larger question than this task is scoped
to answer. If the requester wants it in the export too, that should be its
own explicit decision, not a side effect of this task.

## Tasks Added From the Test-Data-Generation Pass (2026-09-13)

A separate same-day session completed one filing of every type end to end
with realistic data and recorded findings in
`Probate_Guardian_TestData_Findings.md`. Every claim below was re-verified
directly against current `master` — not taken on the report's word — and
two of the report's nine findings turned out to describe the same
underlying gap rather than two separate ones (see Task 40H-I). Two more
needed no action: the report's own **F-8** ("New Form type silently
resets") was already downgraded by that same session to a synthetic-event
testing artifact, not a real bug — confirmed correct, no task here. Its
**Section 4** note that the Verified Initial Inventory briefly showed
"Automatic (Draft)" before settling on "Ready" independently corroborates
Task 40H-A above (both are `getWardProgress()` symptoms of the same
unguarded `validateGuardian` call) — recorded as supporting evidence, not a
new task.

### Task 40H-F — `planReadinessChecksX()` is a dangling global for all four Plan types, not just Minor

The report's **F-1**: calling the plan readiness routine for Plan Minor
throws `planReadinessChecksMinor is not a function`. Confirmed the
mechanism exactly: `plan-minor/index.js:53` assigns
`window.planReadinessChecksMinor` only inside `ensurePrintModule()`'s
`import('./print.js').then(...)` callback — a real `window` property that
exists only after that lazy module has resolved. `planReadinessChecks()`
(`legacy-app.js:6575-6585`) calls whichever of the four
`window.planReadinessChecksX()` globals matches `activeInventoryType`
**unguarded** — no `typeof ... === 'function'` check, unlike 40H-A's
guarded sibling call. All four Plan types share this identical unguarded
dispatch, not just Minor; `planReadinessChecksMinor` is simply the one the
report happened to hit.

**Could not confirm the report's exact trigger path.** `planReadinessPanel()`
(`:6587-6613`) — the only caller of `planReadinessChecks()` — is itself only
reached from inside each Plan type's own `pagePrintPlanX()`, which every
`mount()` calls *after* `await ensurePrintModule()` resolves
(`plan-minor/index.js:62-64`, same shape in the other three). That ordering
guarantees the global exists by the time `planReadinessPanel()` runs during
ordinary navigation to `/print` — the report's own Method section describes
calling the app's functions directly (`getActiveWard()`, `computeNavChecks()`,
etc.) as part of its verification approach, and the most likely trigger is a
direct `window.planReadinessChecks()`/`window.planReadinessChecksMinor()`
console call made before that ward's Print Preview had been opened this
session, not a path an ordinarily-navigating filer would hit. Recorded
honestly rather than claimed as a reproduced UI bug — but the underlying
architecture (four unguarded dangling globals, identical to 40H-A's fixed
pattern) is real regardless of trigger, and worth the same defensive fix.

**Decision:** Guard all four branches of `planReadinessChecks()`
(`legacy-app.js:6581-6584`) the same way `:7629` already guards
`validateGuardian`, returning a safe empty `{auto:[],manual:[]}` (matching
what `planReadinessPanel()` at `:6588` destructures) instead of throwing
when the relevant global isn't yet a function. Apply the same guard to all
four dispatch branches, not just `planMinor` — fixing only the one the
report reproduced would leave the identical gap live for the other three.

### Task 40H-G — Free-text fields corrupt stored data: minor words get title-cased, apostrophes get stripped

The report's **F-4** and **F-5**, both confirmed at their exact root cause
— two different formatters, both reached from ordinary text-field blur:

- **F-4 (title-casing):** `formatSafeTitleCase()`
  (`src/core/form/form-contract.js:85-100`) capitalizes *every* purely
  lowercase word with no exception list for minor words ("of", "and",
  "the") — so `formatName()`/`formatAddress()`
  (`legacy-app.js:1538-1545`), which every field `inferFieldKind()`
  classifies as `name` or `address` runs through on blur, turns "Sunrise
  Assisted Living of Clearwater" into "...Living **Of** Clearwater." This
  contradicts the function's own docstring promise to leave "mixed-case
  names... 100% untouched" — it keeps that promise for surnames but never
  extended it to connecting words in longer phrases.
- **F-5 (apostrophe stripping):** `sanitizeInput()` (`legacy-app.js:1109-1116`),
  specifically `` cleaned.replace(/[<>\"'`]/g,'') `` at `:1112`, strips a
  straight apostrophe entirely (no replacement character), turning "ward's"
  into "wards." Reached via `validateSecurityInput()` (`:1151-1158`) →
  `format === 'security'`, the format every field `inferFieldKind()`
  classifies as plain `text` gets (`form-fields.js:93`), on blur
  (`annual-accounting/index.js:286-287`, and the equivalent blur handler in
  every other feature module using the same `data-*-format="security"`
  convention). Not limited to Annual Accounting — this is the generic
  free-text sanitizer used app-wide.

**Decision:**

1. Add a small stop-word set (`of`, `and`, `the`, `a`, `an`, `for`, `in`,
   `on`, `at`, `to`, `by`) to `formatSafeTitleCase()` that stays lowercase
   *unless* it's the first word — standard title-case convention, and
   consistent with the function's own stated intent. Confirm this doesn't
   regress `TITLE_CASE_CITY_PREFIXES`-style short words that should stay
   capitalized (`St`, `Mt`, `Ft` are already 100%-uppercase words, not
   affected by a lowercase-only stop list).
2. Remove `'` from `sanitizeInput()`'s stripped-character set at `:1112` —
   keep `<`, `>`, `"`, and `` ` `` stripped (the actual HTML/script-injection
   vectors); a straight apostrophe in ordinary text is not one. Confirm
   `detectXSSPayload()`/`detectSQLInjection()` (`:1091-1100`) don't rely on
   apostrophe-stripping to catch anything — both match on keywords/tag
   syntax, not quote characters, so this narrowing doesn't reopen either
   check.

### Task 40H-H — Schedule E, F-1, and F-2 totals go stale after the first render

The report's **F-6** ("Schedule F-1 Total shows $0.00 after a $402,000 sale
is entered") — confirmed, and confirmed to also affect two schedules the
report didn't test. Root cause: every other Annual Accounting schedule's
total cell carries `data-annual-total="<key>"`
(`annual-accounting/index.js:766` through `:1109`, nine sites) so
`refreshAnnualTotals()` (`:155-161`) can update it live on every
input/blur, reading the key from `calcTotalsAnnual()`
(`features/annual-accounting/totals.js:15-60`) — the single source of
truth every other total goes through. Schedule E (`:1140-1143`, Transfers
In/Out), Schedule F-1 (`:1173`, Sales of Real Property), and Schedule F-2
(`:1203`, Sales of Personal Property) are the only three schedule totals in
this file that **don't** follow that pattern: each computes its own local
total once at render time (`pageSchF1Annual()`'s `const total=(d.schF1||[])
.reduce(...)` at `:1152`, same shape for E and F-2) with no
`data-annual-total` attribute and no entry in `calcTotalsAnnual()` at all —
so the figure is only ever correct at the instant the page first renders,
and never again. Confirmed `totals.js` has no `schE`/`schF1`/`schF2` key of
any kind (`grep` returns zero matches).

**Decision:** Add `schF1`, `schF2`, and `schE_in`/`schE_out` to
`calcTotalsAnnual()`'s return object (`totals.js`), each summing its
schedule the same way the existing entries do
(`.reduce((s,r)=>s+n(r.salePrice),0)` for F-1, matching the local
computation already in `index.js` so the numeric result doesn't change —
only where it's computed and whether it refreshes). Add the matching
`data-annual-total="..."` attribute to each of the three schedules' total
cells (`:1140-1143`, `:1173`, `:1203`) and switch their interpolation from
the local variable to `t.<key>`, matching the established pattern exactly.

### Task 40H-I — "New Filing from Existing": ward-selector default and same-family carryover gap

Two of the report's findings — **F-7** and the combination of **F-2**/**F-3**
— both confirmed, with one correction to how F-2 was characterized.

**F-7 (ward selector defaults wrong):** `core/modals/convert-ward-modal.js:32`
— `const first = caseFile.wards[0];` — unconditionally defaults the "New
Filing from Existing" modal's ward field to the first ward ever created in
the case file, never the currently active one. (A dead legacy twin at
`legacy-app.js:5272-5284` has the identical bug — shadowed and unreachable
per the Milestone 40F catalog in "Open Items" below, so it's not a second
site to fix, just confirmation this bug predates the module extraction.)
**Decision:** Default to the active ward (`getActiveWard()`), falling back
to `caseFile.wards[0]` only when there is no active ward.

**F-2/F-3 (carryover gap — corrected and combined):** The report describes
two findings — an empty-named cert recipient, and County/period/starting
balance/schedules not carrying — but tracing both through
`carryOverAccountingToAccounting()`'s "annual family" branch
(`legacy-app.js:3902-3913`, reached for e.g. Annual → Final/Trust Accounting,
which is what the report actually exercised) shows they're the same gap,
not two: that branch's returned object carries only
`{wardName, caseNumber, county:'', typeOfGuardianship, gid, guardian,
attorney, attorney_bar, attorney_phone, attorney_street,
attorney_cityStateZip, guardians[]}` — no `certRecipients`, `periodFrom`,
`periodTo`, `startingBalance`, or any schedule key at all. **The report's
"empty-named cert recipient" is not a corrupted carryover — nothing carries
into `certRecipients`; the new filing's ordinary blank-seed default (from
`initializeEmptyData()`) is what the report saw**, indistinguishable from
any brand-new filing. Worth correcting precisely since it changes the fix:
there's no "recipient carried with a blank name" to repair, only an absent
carry to add.

County is the one field here that's carried **deliberately**:
`carryOverFields()` (`legacy-app.js:3920-3949`) explicitly blanks it
(`:3940`) then restores it from the source ward's canonical Party record
(`wardPartyId`/`resolveParty()`), not from the source filing's own
snapshot — a named Milestone 40C-A/40C-F decision, with its own comment
explaining why. **This part of the report needs re-verification, not a
code change**: county should have come back correctly as long as the test
ward had an established `wardPartyId`. Whether it didn't in this specific
test run, or came back correctly and the report's wording just didn't
distinguish "restored from Party" from "carried from the source filing," is
unconfirmed — flagged for the requester rather than guessed at.

Period (`periodFrom`/`periodTo`) and schedule line items (`schA`
through `schF2`) are correctly absent — a new accounting period must not
start pre-filled with the prior period's dates or transactions, so the
report's expectation there does not describe a bug.

**Decision (per requester choice, 2026-09-13): auto-carry starting balance
and certificate-of-service recipients.** Starting balance should equal the
prior filing's ending net assets — that is the actual statutory
continuity, not an editorial choice — computed via
`calcTotalsAnnual(sourceWard).netAssetsFromD` at the moment of conversion
(same function Task 40H-H extends) and written to `newWard.startingBalance`
in `carryOverAccountingToAccounting()`'s annual-family branch. Certificate
recipients carry via a shallow copy of `sourceWard.certRecipients`, since
the interested parties entitled to service are typically the same people
across a ward's filings. Both land only in the annual-family branch
(`:3902-3913`) where the gap was confirmed — the guardian/simplified
branches above it were not audited for the same gap and are out of scope
here.

**Decision (per requester choice, 2026-09-13): correct `describeConversion()`'s
confirmation message rather than add new signposting from scratch.** The
report characterized Convert Ward as having no explanation of what
carries — checked, and that's not quite right: `describeConversion()`
(`legacy-app.js:5348-5365`) already builds the explanatory text
`convertExistingWard()`'s closing `alert()` (`:5586`) shows. The problem is
accuracy, not absence. An Annual → Final/Trust conversion hits this
function's generic fallback branch (`:5361-5362`,
`carrySourcesFor(destType).includes(srcType)`): *"The ward's name, case
number, county, and guardian contact details are carried over exactly as
entered... Everything specific to this new filing (residence and care
details, schedules, signatures, etc.) starts blank."* Three inaccuracies,
confirmed against the code above: it omits that the attorney block already
carries (`carryOverAccountingToAccounting()`'s annual-family branch,
`attorney`/`attorney_bar`/`attorney_phone`/`attorney_street`/
`attorney_cityStateZip` at `:3903-3905`); it claims county is carried
"exactly as entered," when it's actually restored from the ward's Party
record and could in principle differ from the source filing's own value;
and once this task's starting-balance/cert-recipients decision above lands,
it will be flatly wrong to say those "start blank" too.

**Fix:** add a same-family accounting-to-accounting branch to
`describeConversion()` (checked ahead of the generic fallback, mirroring
how the existing `annual`↔`simplified` branches at `:5355-5360` are
ordered) stating plainly that ward/case/guardian/attorney identity, the
starting balance (as the prior filing's ending net assets), and
certificate-of-service recipients carry over; that county is restored from
the ward's Party record rather than copied from the source filing; and that
the accounting period and every schedule start blank. This is a
same-session pairing with the auto-carry decision above — the message must
describe the code's actual post-fix behavior, not the reverse.

### Task 40H-J — Plan/Accounting → Guardian Inventory carryover writes attorney fields nothing reads

Promoted from the Open Items register (previously "item 5") — a scoped,
already-diagnosed defect, not a judgment call, added per requester choice
(2026-09-13).

`ward-lifecycle.js`'s `carryOverFieldsForAccounting()` guardian branch
(`:233-258`) writes the source's attorney bar number, phone, and address
into **flat** keys on the returned object:
`attorneyBar:attyBar, attorneyPhone:attyPhone, attorneyEmail:attyEmail,
attorneyAddress:attyStreet, attorneyCityStateZip:attyCityStateZip`
(`:242-246`). Confirmed `emptyDataGuardian()` (`legacy-app.js:6089-6113`)
has no such flat keys at all — its only attorney fields are
`attorneyForGuardian` (a flat name string, which this branch does carry
correctly via `attorneyForGuardian: attyName` at `:241`) and a **nested**
`attorney:{name,barNumber,phone,streetAddress,cityStateZip,signatureDate,
filingDate,signatureState,signatureImage}` object (`:6103`) — no flat
`attorneyBar`/`attorneyPhone`/`attorneyAddress`/`attorneyCityStateZip` at
all, and **no `email` field of any kind**, nested or flat.
`validateGuardian()`/`pdf-model.js` read only the nested object. So a
Plan or Accounting → Guardian Inventory carryover computes the bar number,
phone, street, and city/state/zip correctly, then writes all four (plus a
phantom email with nowhere to go) to keys the destination's editor,
validator, and PDF model never look at — the values are silently dropped,
every time, for every filing type that can carry into Guardian Inventory.

The identical defect, on the opposite direction and already fixed, is the
pattern to mirror: `legacy-app.js`'s `carryOverAccountingToAccounting()`
guardian branch (`:3878-3889`) builds
`attorney:{name:attorneyName,barNumber:attyBar,phone:attyPhone,
streetAddress:attyStreet,cityStateZip:attyCityStateZip,signatureDate:null,
filingDate:null,signatureState:'',signatureImage:''}` — note it also has no
`email` key, confirming Guardian Inventory's attorney block genuinely has
no email field app-wide, not just a gap in `emptyDataGuardian()`; `attyEmail`
is correctly computed by both functions and correctly has nowhere to go.

**Decision:** In `carryOverFieldsForAccounting()`'s guardian branch
(`ward-lifecycle.js:233-258`), replace the five flat `attorneyBar`/
`attorneyPhone`/`attorneyEmail`/`attorneyAddress`/`attorneyCityStateZip`
keys with a nested `attorney:{name:attyName,barNumber:attyBar,
phone:attyPhone,streetAddress:attyStreet,cityStateZip:attyCityStateZip,
signatureDate:null,filingDate:null,signatureState:'',signatureImage:''}`
object, matching `emptyDataGuardian()`'s shape exactly (dropping
`attyEmail` — already unused by the mirrored fix, and confirmed to have no
destination field to occupy).

**Noted, not scoped — F-9 (native `alert()` on filing conversion):**
Confirmed `alert()` is this app's standard, uniform notification idiom —
not a "New Filing from Existing"-specific choice. A repo-wide grep finds
it at 50+ call sites across every feature module and both persistence
paths, used identically for confirmations, warnings, and errors
throughout. Replacing it in this one flow only would make that flow
inconsistent with the rest of the app rather than better; replacing it
everywhere is a real UX redesign, not a small independent fix in 40H's
style. Recorded so it isn't lost, not scoped into this delivery.

## Decisions Recorded — Resolved 2026-09-13, No Code Change

Four items needed the requester's judgment rather than a mechanical fix.
All four were presented as explicit choices and resolved the same way:
current behavior is correct as-is. None is a task in this delivery;
recorded here so they aren't re-litigated later.

1. **Signature tri-state default "Unsigned" stores as `''`, not a distinct
   token.** `pdf-model.js:436,453,511,595` all read
   `signatureState: g.signatureState || ''`. **RESOLVED — leave as-is.**
   Functionally inert (unsigned behaves correctly either way); the
   ambiguity between "not yet answered" and "explicitly marked unsigned"
   is real but nothing currently depends on distinguishing them. No code
   change.
2. **SSN/EIN stored unmasked in ward state / `.sav`.** Display masks to
   dots; the underlying value is plaintext. **RESOLVED — confirmed
   intentional.** This is a fully client-side app and `.sav` is optionally
   AES-GCM encrypted at rest; plaintext-in-memory is standard for an
   editable field. Conscious design choice, not a defect. No code change.
3. **D-5 "Service Date" is a hard export blocker.**
   `guardian-inventory/index.js:1177`:
   `if(!d.serviceDate)errors.push('D-5 — Service Date is required.');` —
   confirmed a genuine `errors.push`, not a warning. **RESOLVED — keep
   required/blocking.** Treated as data entry (recording a known fact —
   the date service occurred) rather than the procedural act of service
   itself, so it does not violate `AGENTS.md` Section 4's manual/auto
   distinction after all. No code change.
4. **Three `_appState` keys (`walkthroughCompleted`, `firstLaunchSeen`,
   `continuePromptShown`) are per-device onboarding-flag candidates.**
   Milestone 40D moved `theme` to `localStorage` and its Decision 6
   inventory flagged these three as the only other genuinely UI-only keys,
   left as an explicit open decision rather than migrated. **RESOLVED —
   keep in `.sav`, case-coupled.** Matches current behavior: every new case
   re-shows onboarding regardless of what a device has already seen, which
   is the safer default for a filer who may not be the same person who
   last used this device. No code change.

## Data, Portability, Security, and Legal Scope

No persisted field is added, renamed, or reshaped; no `probate-guardian-data-model.csv`
change; no `verify:data-model` run required. No export/import/backup path
changes shape. No new sensitivity classification is introduced. Task 40H-E
adds advisory text reminding the preparer to obtain authorization before
signing on a party's behalf — it is a UI reminder, not a legal-sufficiency
determination by the app itself, and it does not gate, block, or validate
anything; a preparer can still proceed without acknowledging it, exactly as
today. Task 40H-I writes `startingBalance` and `certRecipients` — both
already-existing fields on every accounting-family ward — during carryover
instead of leaving them at their empty-seed default; no new field, no
schema change, no `verify:data-model` impact. Task 40H-J changes *where*
four already-existing attorney values land on a Guardian Inventory ward
(from unread flat keys to the nested `attorney` object every reader
already expects) — no new field, no schema change. No legal-sufficiency
determination is made or implied by any of the ten fixes.

## File/Delivery Overlap Check

Confirmed no file this delivery touches (`legacy-app.js` around
`:1657-1696`, `:6587-6613`, and `:7629-8170`; `guardian-inventory/index.js`
around `:171-180`, `:929-932`, and `:995-1020`) intersects any file
Milestone 40C-1 is editing (its `legacy-app.js` sites are the
Pinellas-fallback creation/conversion paths at `:4369-4524` and
`:6127-6209`, and it does not touch `guardian-inventory/index.js` at all).
No required ordering between the two; sequencing 40H after 40C-1 is a
scheduling choice, not a dependency.

Task 40H-E adds six further files, all new to this delivery and touched by
no other open or landed Milestone 40 delivery: `simplified-accounting/index.js`
(`:452-453`), `annual-accounting/index.js` (`:648-649`),
`plan-simplified/index.js` (`:268-269`), `plan-minor/index.js` (`:352`),
`plan-initial/index.js` (`:514`), `plan-annual/index.js` (`:607`), plus one
new shared class in `styles/cards.css`.

Tasks 40H-F through 40H-J add five more, none touched by any other open or
landed Milestone 40 delivery: `form-contract.js` (`:85-100`, 40H-G's
stop-word list), `features/annual-accounting/totals.js` (`:15-60`, 40H-H's
three new total keys), `core/navigation/ward-lifecycle.js` (`:233-258`,
40H-J's nested-attorney fix), and `legacy-app.js` at three ranges not
already covered above — `:1109-1158` (40H-G's `sanitizeInput()`),
`:3834-3950` and `:5348-5365` (40H-I's carryover fix and
`describeConversion()` correction), and `:6575-6613` (40H-F's guard,
overlapping the range already listed above for 40H-D — same function,
different lines within it) — plus `core/modals/convert-ward-modal.js`
(`:21-42`, 40H-I's ward-selector default).

## Implementation Order and Dependencies

**No task blocks another.** All ten are independent bug fixes confirmed at
disjoint files or non-overlapping line ranges within a shared file — any
one, or any subset, can be implemented and landed alone in any order. Three
pairs share a file or a function neighborhood, which makes doing them
together *convenient*, not *required*:

- **40H-B + 40H-C** — both in `guardian-inventory/index.js`'s D-3 section
  (`:171-178` vs. `:999-1019`), disjoint ranges. Same page a implementer
  would already have open.
- **40H-D + 40H-F** — `planReadinessPanel()` (`:6587-6613`) calls
  `planReadinessChecks()` (`:6575-6585`); 40H-F guards the callee, 40H-D
  fixes the caller's markup. Neither's fix depends on the other landing
  first — 40H-F's guard doesn't change what `planReadinessPanel()` returns
  when the global *is* defined (the normal case), and 40H-D's markup fix
  doesn't touch `planReadinessChecks()` at all.
- **40H-I + 40H-J** — both fix a carryover gap, but in different functions
  in different files (`legacy-app.js`'s `carryOverAccountingToAccounting()`
  vs. `ward-lifecycle.js`'s `carryOverFieldsForAccounting()`) handling
  different conversion directions (accounting-to-accounting vs.
  any-to-Guardian-Inventory). No shared code.

**No dependency on any other Milestone 40 delivery.** 40A, 40B (withdrawn),
40C-1, 40C-2, 40D, 40E, 40F, and 40G have all landed — 40H and 40I are the
only two deliveries left open, per `MILESTONE-40-PROPOSAL.md`'s own index.
Confirmed via `git log` that the one commit to land since this proposal's
last citation pass (`3b8dadf`, a sidebar-context fix unrelated to any
Milestone 40 delivery) touches only `legacy-app.js`, and only the line
ranges already re-verified in the "Third pass" addendum above.

**Relationship to `MILESTONE-40I-PROPOSAL.md`:** none. Confirmed zero file
overlap in both directions (40I touches only `src/styles/forms.css`; no
40H task touches that file). Either can be approved, implemented, and
landed independently and in any order relative to the other.

**Relationship to `MILESTONE-41-PROPOSAL.md`** (Draft, unscheduled,
architectural — centralizing field rendering into Tier 1
primitives/Tier 2 cards/Tier 3 declarative pages): not a blocking
dependency in either direction, since 41 is not approved or scheduled, but
three of 40H's tasks touch territory 41's own text explicitly assumes is
already fixed, which is worth landing 40H ahead of any future 41 work
rather than after:

- 41's Section 2.6 states as a compliance fact that **"all radio pairs
  [are] rendered in `<fieldset>` with `<legend>` tags."** That is only
  true once Task 40H-C lands — today it is not (`grep -c fieldset
  guardian-inventory/index.js` returns 0). If 41 is implemented before
  40H-C, its own stated compliance claim would be false on arrival for the
  one gap 40H-C closes.
- 41's Tier 2 "Guardian & Attorney Details" card would read from the same
  nested `attorney` object Task 40H-J fixes `carryOverFieldsForAccounting()`
  to actually populate. Landing 40H-J first means that card inherits
  correct carried-over data from day one, rather than inheriting — and
  then needing to independently rediscover — the silent-drop bug.
- 41's Tier 1 primitives are meant to become the canonical implementation
  other code delegates to (Section 2.2: "legacy helpers will delegate
  directly to Tier 1"). Task 40H-G fixes the two low-level text formatters
  (`formatSafeTitleCase()`, `sanitizeInput()`) every text/name field
  already runs through. Landing 40H-G first means Tier 1 canonicalizes the
  *fixed* behavior; landing it after risks the reverse — the bug getting
  copied into the new shared primitive as "how it's always worked."
- Task 40H-E hand-inserts a `.preparer-note` element into all seven
  currently hand-rolled signature pages. If 41's Tier 3 restructuring of
  those same pages happens later, its implementer needs to carry that
  element forward into whatever declarative structure replaces the
  hand-rolled markup — noted here so it isn't dropped as incidental
  cruft during that future migration.

None of this blocks 40H on 41, or 41 on 40H — 41 is Draft and not queued
for implementation. It is recorded because the requester asked whether any
up/downstream dependency exists, and this is the one found.

## Acceptance Criteria

| Task | Scenario | Expected result |
| --- | --- | --- |
| 40H-A | Fresh session, dashboard renders a guardian-type ward before any Guardian Inventory page has been visited | No console exception; `getWardProgress()` returns a real result, not `null`, even if the guardian dimension is temporarily degraded |
| 40H-A | Guardian Inventory feature bundle already loaded this session | Dashboard progress for that ward reflects full guardian validation, unchanged from today's eventual-consistency behavior |
| 40H-B | Parent = Yes, child = Yes, parent → No, parent → Yes again | Child radios show Yes again — not blank |
| 40H-B | Parent = No throughout, export attempted | Child's value (whatever it is in state) is never read or emitted, exactly as today |
| 40H-C | D-3 Safe Deposit Box question, read via the DOM | Wrapped in `<fieldset>` with a `<legend>` containing the question text |
| 40H-C | D-3 "Filed with Court?" sub-question, read via the DOM | Same — `<fieldset>`/`<legend>`, hidden/shown exactly as before |
| 40H-D | Any Plan-type Print Preview page's readiness panel, read via the DOM | `<details>` contains a real `<summary>` element wrapping the head (title, subtitle, icon); no orphan closing tag |
| 40H-D | Clicking/keyboard-activating the readiness panel's head on any Plan type | Native disclosure toggle behavior, matching `filingReadinessCard()`'s panel on the other five filing types |
| 40H-E | Any of the seven signing pages (all nine filing types), read via the DOM | A `.preparer-note` element appears immediately above the perjury/attestation statement, containing the note text from Task 40H-E's Decision |
| 40H-E | Exported PDF/DOCX for any filing type | Unchanged — no preparer-note text appears anywhere in the exported document |
| 40H-F | `window.planReadinessChecksX` deliberately left undefined for each of the four Plan types, `planReadinessChecks()` called | Returns `{auto:[],manual:[]}`, does not throw |
| 40H-F | Global defined (normal `/print` navigation) | Unchanged from current behavior for all four Plan types |
| 40H-G | Payee/description field containing "Sunrise Assisted Living of Clearwater" or similar, blurred | Stored and displayed with "of" lowercase, matching standard title case |
| 40H-G | Free-text field containing `ward's`, blurred | Apostrophe preserved; `<`, `>`, `"`, `` ` `` still stripped |
| 40H-H | Schedule E, F-1, or F-2 row's amount field edited and blurred, no navigation | Schedule total updates immediately, matching the sum of entered rows |
| 40H-I | "New Filing from Existing" opened while a non-first ward is active | Ward selector defaults to the active ward, not `caseFile.wards[0]` |
| 40H-I | Annual Accounting → Final/Trust Accounting via "New Filing from Existing" | New filing's `startingBalance` equals the source's `netAssetsFromD`; `certRecipients` matches the source's list |
| 40H-I | Confirmation message for that same conversion | States that starting balance, cert recipients, and attorney details carried, county was restored from the Party record, and period/schedules start blank — not the old generic "everything specific starts blank" text |
| 40H-J | Plan or Accounting ward converted/carried into Guardian Inventory, source has an attorney bar number/phone/address | New ward's `attorney.barNumber`/`.phone`/`.streetAddress`/`.cityStateZip` are populated; D-2 page and exported PDF show them |
| All | `npm run test:unit` | Green |

## Verification Plan

- **40H-A:** Add a new `tests/unit/dashboard-guardian-progress-guard.spec.js`
  (or extend `dashboard-view-model.spec.js` if that's the more natural
  home — check its current scope before choosing) asserting: with
  `window.validateGuardian` deliberately left undefined, `computeNavChecks()`
  /`getWardProgress()` do not throw and return a valid degraded result; with
  it defined, results are unchanged from current behavior. Confirm this
  test fails against the current unguarded code before the fix, per this
  repository's own verification convention.
- **40H-B:** Extend `tests/unit/guardian-inventory-yes-no-radio.spec.js`
  with the parent-off-then-on round trip described in the Acceptance
  Criteria table, plus an assertion that a `No`-parent filing's export
  path never emits the child's value regardless of what it holds.
- **40H-C:** Extend the same spec file with a DOM-level (or source-text,
  matching that file's existing string-assertion style) check that both
  D-3 groups are wrapped in `fieldset`/`legend`, mirroring the existing
  `yesNoRadioHTML` assertions at `:36-44`.
- **40H-D:** Add a source-text or DOM-level assertion (new or extended
  spec — check whether an existing Plan-family print/readiness spec is the
  natural home before creating one) that `planReadinessPanel()`'s returned
  markup contains a `<summary>` opening tag matching its `</summary>`
  close, for all four Plan types. Confirm this test fails against the
  current markup before the fix.
- **40H-E:** Add or extend a unit spec (check whether an existing
  per-feature page-render spec is the natural home before creating a new
  file — one spec covering all seven sites, or seven small assertions added
  to each feature's existing render spec, either is acceptable) asserting a
  `.preparer-note` element is present and precedes the attestation/perjury
  text in DOM order, for all seven sites, and that no `.preparer-note`
  element or equivalent text appears in the corresponding `pdf-model.js`
  output for any of the nine filing types. Confirm the DOM assertion fails
  against current markup before the fix, per this repository's own
  verification convention.
- **40H-F:** Extend `tests/unit/plan-readiness-county.spec.js` or add a new
  spec (check current scope first — this file already exercises
  `planReadinessChecks()`-family behavior per its own name) asserting each
  of the four `window.planReadinessChecksX` globals being undefined does
  not throw and returns the safe empty result. Confirm each fails against
  current code before the fix.
- **40H-G:** Add unit coverage in `tests/unit/` for `formatSafeTitleCase()`
  (stop words stay lowercase mid-phrase, first word still capitalizes) and
  `sanitizeInput()` (apostrophe preserved, `<>"` `` ` `` still stripped,
  `detectXSSPayload`/`detectSQLInjection` still catch their existing test
  cases). Confirm both fail against current code before the fix.
- **40H-H:** Extend or add a unit spec for `calcTotalsAnnual()` asserting
  `schF1`/`schF2`/`schE_in`/`schE_out` sum their schedules correctly, plus
  a DOM/e2e-level assertion that editing a Schedule E/F-1/F-2 row updates
  its total without navigation. Confirm the live-update assertion fails
  against current code before the fix.
- **40H-I:** Add unit coverage for `convertTargetsFor`-adjacent modal logic
  asserting the ward selector defaults to the active ward, and extend
  `tests/unit/ward-carryover.spec.js` (or add to it if same-family
  accounting-to-accounting carryover isn't yet covered there) asserting
  `startingBalance` and `certRecipients` carry correctly for an
  Annual → Final/Trust conversion, while `periodFrom`/`periodTo`/every
  schedule key remain blank. Add a source-text or unit assertion that
  `describeConversion()`'s same-family branch mentions starting balance,
  cert recipients, and the Party-record county restoration. Confirm all
  three fail against current code before the fix.
- **40H-J:** Extend `tests/unit/ward-carryover.spec.js`'s nested-shape
  describe block (the home item 5 already named before being promoted)
  asserting a Plan/Accounting → Guardian Inventory carryover writes the
  source's attorney bar number, phone, street, and city/state/zip into the
  destination's *nested* `attorney` object, and that no flat
  `attorneyBar`/`attorneyPhone`/`attorneyAddress`/`attorneyCityStateZip`
  key is present on the result. Confirm this fails against current code
  before the fix.
- Update `TEST-INDEX.md` for any new file or materially rescoped
  description, per `AGENTS.md` Section 7.
- This is ten small, independent fixes touching thirteen files — none
  reshape persisted data. Targeted `npm run test:unit` (plus the specific
  extended specs, plus 40H-H's DOM/e2e assertion) is the appropriate gate;
  a full regression is not warranted on its own, per `AGENTS.md`'s Test
  Execution Gate.

## Open Items Carried Forward from the Milestone 40 Implementation Session (2026-09-13)

Recorded here because 40H is the last open Milestone 40 proposal, so this is
where a reader will look for "what is still outstanding." **None of these is a
task in this delivery** — they are findings from implementing 40A, 40C-1, 40C-2,
40D, 40E, 40F and 40G that were deliberately not fixed, so they are written down
rather than lost. Each says plainly whether it is a defect, a decision, or
cosmetic, and what verifying it would cost. *(Originally eight items; two were
resolved 2026-09-13 — the per-device onboarding-flag decision moved to
"Decisions Recorded" above, and the Plan/Accounting → Guardian Inventory
attorney-carryover defect was promoted to Task 40H-J — leaving the six below.)*

### 1. Nine pre-existing full-suite e2e failures on `master` (defect — unowned)

The full `npm test` regression run at the end of 40D: **401 passed, 6 skipped,
9 failed.** The nine were confirmed pre-existing during 40A — the entire change
set was stashed, the three spec files re-run against untouched `HEAD`, and the
identical nine failures reproduced — so they belong to no Milestone 40 delivery:

- `pdf-preview-viewer.spec.ts:114` — "an incomplete filing's embedded preview is
  blocked, not silently rendered," failing for **seven** filing types (Guardian
  Inventory, Annual, Simplified, Plan Initial, Plan Annual, Plan Minor, Plan
  Simplified). One test, parameterised; likely one root cause, not seven.
- `schedule-card-layout.spec.ts:177` — "multi-column labels retain their required
  marker and natural height." **Resolved by proposal, not yet by code:** this
  is exactly item 19's territory, and `MILESTONE-40I-PROPOSAL.md` (drafted
  the same day, after this note was first written) confirms it directly —
  the test's `minHeight` assertion is this failure, two of item 19's three
  original causes are already fixed on current `master`, and the third
  (`forms.css:219-231`'s direct-child `min-height` rule) is 40I's entire
  scope. See that proposal rather than re-deriving this independently.
- `security.spec.ts:53` — "source markup has no executable event attributes or
  inline scripts," reporting `src/core/pdf/pdf-annotate.js` and
  `src/core/pdf/pdf-preview.js`. A security-boundary assertion, so worth reading
  before the cosmetic ones.

**These make `master` red on the full suite**, which matters beyond the three
tests: it means a future full regression cannot be read as pass/fail without
first knowing this baseline. Whoever picks them up should re-confirm the baseline
first — they were last verified on 2026-09-13.

### 2. Forty-five shadowed classic-script/module function pairs (latent, catalogued)

Catalogued in `MILESTONE-40F-PROPOSAL.md` under "The router duplicate pair."
`legacy-app.js` declares a top-level `function X` while a module also does
`window.X = X`; because a top-level `function` in a classic script *is* the
global property, the module's assignment overwrites it and the legacy copy
becomes unreachable — including from bare calls inside `legacy-app.js` itself.

Distribution: `ward-lifecycle.js` (11), `launch-preferences.js` (10),
`crypto.js` (8), `convert-ward-modal.js` (4), `recovery-cache.js` (3),
`prune-cards.js` (3), plus `form-contract.js`, `templates.js`,
`annual-accounting/index.js` and `main.js`'s two re-exports.

**These are dead weight, not live bugs** — `main.js` imports every one of those
modules eagerly, so the module version wins from boot. The one lazily-loaded case
(`duplicateAnnualRow`) is only reachable from UI its own mount creates. The risk
is future-facing, and 40F demonstrated it is not theoretical: deleting the router
pair revealed that legacy `navigate()`'s `_navSectionExpandedKey` reset had
silently stopped running, leaving a hand-opened sidebar section stuck open for the
rest of the session. Each pair is a place where someone edits a function that has
not run in years and sees nothing happen. Removing them needs the same per-pair
superset check 40F used, one at a time.

### 3. Milestone 40C-1 verification item 9 — two e2e paths never covered (gap)

40C-1's plan calls for `party-resolver.spec.ts` and `.sav` round-trip additions
covering **Party-merge conflict handling** and **single-ward import
reconstruction** of the ward-Party county. Both behaviours are implemented and
unit-tested (`wardCountyMergeConflict()`, `backfillWardPartyCounties()` in
`tests/unit/filing-county-defaults.spec.js`); what is missing is the e2e layer
that drives them through the real merge UI and a real single-ward `.sav` import.

Worth doing because the single-ward path is the one with no Party records in the
archive at all — the reconstructed ward Party is seeded from the exported
filing's own county under the unanimity rule, which is the least-exercised branch
of the migration.

### 4. One flaky e2e test (flake — unexplained)

`dashboard-backup.spec.ts:99` ("explicit dashboard status and assignment
round-trip through .sav") failed once during 38C verification and then passed
3/3 — in isolation, with its whole file, and in the full cross-file sweep. Most
likely download/file-write timing in `exportAndCapture()`. Left as-is because a
single unreproducible failure is not enough to diagnose; if it recurs, the fix is
an explicit wait on the saved file rather than another re-run. Recorded so a
second occurrence is recognised as the second, not the first.

### 5. Duplicated header comment blocks in six `print.js` files (cosmetic)

`guardian-inventory`, `plan-annual`, `plan-initial`, `plan-minor`,
`plan-simplified` and `simplified-accounting`'s `print.js` each open with their
entire file-header comment **twice**, verbatim. Pre-existing and harmless, but it
briefly read as damage during 40A's deletions — worth removing so it cannot
misdirect a future reader mid-change. Verify against `git show HEAD:<file>` first;
that is how it was established as pre-existing rather than introduced.

### 6. `TEST-INDEX.md` has a duplicate row (cosmetic)

`annual-accounting-pdf-model.spec.js` appears twice in the unit table with
different descriptions ("Trust Accounting PDF-model table layout for percentage
and currency columns" and "Trust/Annual Accounting PDF-model table layout, Part
VIII trust disclosure, and duplicate title suppression"). The second looks like
the current scope; the first looks like a stale row never removed when it was
extended. One should be deleted, not merged.
