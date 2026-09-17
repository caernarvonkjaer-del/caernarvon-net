# Milestone 56: The User Guide Catches Up With the App — Executable Delivery Index

## Status

**Draft — not an authorization to implement anything below.** Per
`AGENTS.md` §2, this is a proposal only; nothing here should be started until
Alan explicitly approves a specific sub-delivery by name. Approval of one
sub-delivery does not authorize the others. Every sub-delivery here is
independently approvable and independently revertible; none is a prerequisite
for another.

**Numbering note — 26 was checked and is NOT free.** This work was initially
asked for as "MS 26"; Alan corrected it to 56 in the same session. Recorded
because the check found a real collision, not a hypothetical one: **Milestone
26 is "Unified Form Engine, Field Centralization & Accessible Combobox
Controller"** — landed, archived at `MILESTONE-ARCHIVE.md:5357`, and still
cited in two live source headers (`src/core/form/form-fields.js:1`,
`src/core/form/schedule-definitions.js:1`). Reusing it would have repeated the
Milestone 49 collision this repository already paid for once. **56 is free** —
checked against `src/`, `tests/`, every `*.md`, and the archive on
2026-09-17. Milestones 50–55 are the live documents; 55 is the most recent.

---

## What this milestone is, in one paragraph

`help/index.html` is the standalone user guide the app opens from the "?"
button and from the Help panel's "View User Guide" button. It has drifted
behind the app across Milestones 54 and 55 and one authorized side task, and
the drift is not cosmetic: the guide currently instructs filers to use a
signature tab that no longer exists, describes a resources panel that was
replaced wholesale, mis-states what the "?" button does, understates which
fields block an export, names a superseded administrative order, overstates
the app's privacy guarantee, and — most seriously — tells filers to keep an
Excel export as their fallback against a lost master password when four of the
seven filing types have no Excel export at all. This milestone corrects the
guide against the shipped app, and deletes one orphaned function found while
verifying it.

---

## Source and verification status

The findings below came from a review Codex ran against the deployed guide,
which Alan then asked to have verified rather than applied on faith. **Every
one of the eleven was independently re-derived against current `master`
(`bcaeb5f`, 2026-09-17) before being written down here.** All eleven held; none
was a false positive. The verification added three things Codex's list did not
have:

1. **Finding 8 is stronger than reported.** The app's own in-app Help panel
   (`src/features/help/help-content.js:123`) already describes the Disaster
   Plan requirement as a "Local Sixth Judicial Circuit requirement
   (Administrative Order)" with **no number**, and
   `src/core/filing/county-guidance.js:20` explicitly calls 2019-005
   "unavailable". So the standalone guide does not merely cite a superseded
   order — it contradicts the app's own help text, which already made this
   decision. **Alan has confirmed: AO 2019-005 is superseded by AO 2024-025.**
2. **One orphan Codex did not find.** `exportHelpGuideAsPDF()`
   (`src/legacy-app.js:642`, roughly 200 lines that build a complete HTML user
   guide and render it through html2pdf) has **zero callers** — no invocation,
   no `window` bridge entry, no dynamic dispatch, and it does not appear in the
   generated `window-bridge.d.ts`. Its only other mention in the repository is
   a stray comment in `src/styles/tokens.css:13`. Codex was right that the app
   no longer offers a PDF guide; it did not notice that the implementation is
   still sitting in the classic script. See 56A.
3. **One correction to how finding 1 should be applied.** The guide's
   *"three states"* sentence (Unsigned / "/s/" Signed / Signature Stamp) is
   **still correct** and must not be swept up in the same edit. Only the
   capture-method wording ("one of three ways", "three tabs", "Draw / Type /
   Upload") is stale. Flagged because the two sentences sit close together and
   a careless fix breaks a true one.

**What was verified, and how.** Each finding was checked against the shipped
source, not against the milestone documents that produced it:

| Claim | Confirmed by |
| --- | --- |
| Signature widget has two tabs, Draw preselected | `src/core/signature/signature-pad.js:187-188` — `data-sig-tab="draw"` (`aria-selected="true"`) and `"upload"`; no third tab anywhere |
| Resources panel is circuit-based, not county-scoped | Milestone 54 replaced `groupsForCounties()` with the selector plus `deriveDefaultCircuit()`; the guide still says "both Pinellas and Pasco show until a filing names a county" |
| "?" behaves differently inside a filing | `openUserGuideForCurrentPage()`'s own doc comment: *"'?' while a filing is open: skip the Help panel, jump straight to the manual page for wherever the filer actually is"*; `openUserGuide()` uses `window.open(url,'_blank','noopener')` |
| The panel button is "View User Guide" | `src/legacy-app.js:296` |
| Preview carries All Filings / theme / Help | `src/legacy-app.js:1721` — *"previews lose All Filings, theme, and Help entirely"* is the comment on the code that prevents exactly that |
| Attorney email enforcement, all four variants | `annual-accounting/index.js:1468` and `simplified-accounting/index.js:714` (unconditional); `plan-annual/index.js:785` (`if(d.attorney)`); `plan-initial/index.js:687-694` (gated on any attorney field being started) |
| Annotation toolbar has note colour and delete | `src/core/pdf/pdf-annotate.js:100-106` — `aria-label`/`title` of "Note color" and "Delete note" |
| Sidebar completion now includes date order | Milestone 55B threaded `checkDateOrder()` into `computeNavChecks()` at four sites (`src/legacy-app.js:6731, 6898, 6960`) |
| Dashboard has Report a Bug and Comment Card | `src/features/dashboard/index.js:64-65` |
| Plans have no Excel export | Only `annual-accounting`, `guardian-inventory` and `simplified-accounting` have an `excel.js`; all four `plan-*` features have none |
| Pinellas clerk link is stale | Guide: `mypinellasclerk.gov/Home/Probate-Mental-Health#49273-guardianships`; app: `mypinellasclerk.gov/Guardianship` |

**Not a finding, recorded so it is not re-raised:** the guide file
`Probate-Guardian-User-Manual.html` named in the original review request does
not exist and is referenced nowhere (0 hits repo-wide). The app opens
`help/` — `USER_GUIDE_URL` at `src/legacy-app.js:304`.

**Environment note.** Codex's own verification ran 22 Playwright tests against
Edge because its configured Chromium executable was missing. That does not
affect the findings, but it is worth knowing that its browser evidence came
from a different engine than this project's configured default; the Chromium
path is healthy here (580 e2e tests passed on it on 2026-09-16).

---

## How this index is organized

Every sub-delivery except 56A is a documentation edit to a single file, so
"risk" in the usual sense (of the change breaking something) is uniformly low.
They are ordered instead by **the cost of leaving them wrong**, which is the
axis that matters for a document a filer follows while preparing a court
filing.

| Sub-delivery | Risk | What it is | Why it is ordered here |
| --- | --- | --- | --- |
| 56A — Delete dead `exportHelpGuideAsPDF()` | **Low** | The only code change in this milestone | Independent of every doc edit; isolated deletion with a red-first detector, 53A's shape |
| 56B — Correct the two claims that could cost a filer data | **Low** (doc) | Excel-as-backup, and the "no hidden copy" privacy claim | Highest cost if left wrong: one is advice that fails at the moment it is relied on |
| 56C — Correct the court-facing administrative order | **Low** (doc) | AO 2019-005 → the current order | Legal/compliance framing; the app already made this call |
| 56D — Correct what blocks an export | **Low** (doc) | Attorney email enforcement; sidebar completion includes date order | A filer who believes the guide plans the wrong work |
| 56E — Correct the controls that changed | **Low** (doc) | Signature tabs, "?" behaviour, Preview banner, annotation toolbar, dashboard toolbar | Everyday friction; the filer discovers the truth immediately |
| 56F — Rewrite Helpful Resources | **Low** (doc) | The largest single rewrite: circuit selector, 67 counties, accordion behaviour, stale link | Large but self-contained; wrong rather than dangerous |
| 56G — Refresh the stale screenshots | **Low** (doc) | Five images that show retired UI | Last: several depend on 56E/56F landing first |

---

## Decisions taken during scoping

**Decision 1 — The guide is corrected, not rewritten.** Every item below is a
targeted edit against a named line range. The guide is 11.8 MB (screenshots
are embedded), and a wholesale rewrite would make review impossible and lose
prose that is still accurate. Where a section needs substantial replacement
(56F), the replacement is scoped to that section.

**Decision 2 — The administrative order is named by role, not by number.**
56C follows what the app already does: refer to "the current Sixth Judicial
Circuit guardianship administrative order" and link the circuit's orders
index, rather than embedding a number that can be superseded again. The number
2019-005 is not simply swapped for 2024-025 in prose, because that is the
failure mode this milestone is fixing. The **link target** points at the
current orders list; AO 2024-025 may be named once as the current order, in the
same place the app names it.

**Decision 3 — 56A deletes rather than re-wires.** `exportHelpGuideAsPDF()`
could in principle be reconnected to a button. It is not, for the same reason
51D gave for `protectSheet`/`autoFitColumns`: re-wiring a dead feature changes
what the product does and is a feature decision with its own review, not a
cleanup side effect. It is recoverable from git history. If a PDF guide is
wanted later, that is its own milestone — and it would want to generate from
`help/index.html` rather than from the second, divergent copy of the guide
prose that this function carries inside `legacy-app.js`.

**Decision 4 — Screenshots are refreshed last and captured, not edited.**
56G's images come from a real browser against the current build, using the
same target the e2e suite uses, so they cannot show a state the app cannot
actually produce.

---

## 56A — Delete Dead `exportHelpGuideAsPDF()`

**Risk: Low.** Pure deletion of an unreferenced function. The only code change
in this milestone.

### Files

`src/legacy-app.js` (`:642` and its body), `src/styles/tokens.css` (`:13`, the
stale comment reference), `tests/unit/` (one detector), `TEST-INDEX.md`.

### Background

`exportHelpGuideAsPDF()` builds a complete HTML user guide — cover, table of
contents, section prose, Q&A — and renders it through `html2pdf`, ending with
a page-footer loop that stamps "Probate Guardian — User Guide" and a page
count. It is approximately 200 lines, and it is dead:

- No call site anywhere in `src/`, `fragments/`, or `index.html`.
- No `window.exportHelpGuideAsPDF = …` bridge, so `legacy-app.js`'s own
  classic-script global is the only exposure, and nothing reads it.
- It does not appear in `src/core/types/window-bridge.d.ts`, which means the
  audit sees no consumer either.
- The only other mention in the repository is a comment in
  `src/styles/tokens.css:13`.

It also matters to this milestone specifically: the guide currently documents a
**"Download PDF guide"** button (`help/index.html:738`) that this function
would have implemented. 56E corrects that text. Deleting the orphan means the
guide and the code agree that the feature is gone, rather than the code
half-preserving it.

**Second copy of the prose.** Worth stating plainly because it is the strongest
argument for deletion: this function contains its own hand-maintained copy of
guide content. Every correction in 56B–56F would, if this were live, need
making twice. It is not live, so they do not — but leaving it there invites
exactly that trap for whoever revives it.

### Steps

**A1.** Write a red-first detector in `tests/unit/` asserting
`legacy-app.js` declares no top-level `exportHelpGuideAsPDF`, in the shape
`tests/unit/cell-reader.spec.js` established for 53A. Confirm it is **red**
against the current tree, naming the function.

**A2.** Delete the function and its enclosing comment block. Re-derive the
line range at execution time rather than trusting `:642`.

**A3.** Update `src/styles/tokens.css:13`'s comment so it no longer names a
function that does not exist.

**A4.** Confirm the detector is green, and that `npm run build` still
succeeds — `html2pdf` is loaded on demand by `src/core/pdf/html2pdf-loader.js`
and is still used by the real PDF export path, so the build must show the
loader is still reachable and only this consumer went.

**A5.** `TEST-INDEX.md` row per `AGENTS.md` §7; `test-index-guard` green.

### Verification

The detector red → green is the gate. Additionally: `npm run build` clean, and
`grep -rn "exportHelpGuideAsPDF"` returns nothing outside git history.

### Cross-cutting ramifications (`AGENTS.md` §8)

- **Data Model / Legacy Data Migration / Export-Import / Security / Legal:**
  N/A — dead code, no persisted shape, no output path.
- **UI/UX Consistency:** nothing rendered changes; there is no control that
  reaches this.
- **Test Coverage & Index:** one new detector plus its row.

---

## 56B — Correct the Two Claims That Could Cost a Filer Data

**Risk: Low** (documentation), **highest cost if left wrong.**

### Files

`help/index.html` (`:167-173`, `:628`, `:768`, `:769`).

### Background

**Excel is documented as a backup. It is not one.** The guide says, twice,
that an Excel export is a fallback against a lost master password:

- `:173` — "(You can still export the data to Excel as a separate safeguard.)"
- `:769` — "Keep an Excel export as an unencrypted fallback if you need one."

Three things are wrong with that, in ascending order of seriousness:

1. Excel contains only the fields a particular court workbook supports — not
   shared party records, dashboard state, annotations, supporting documents, or
   the activity log.
2. It is not restorable. Nothing in the app reconstructs a case from an
   `.xlsx`; the import path fills a filing's fields, which is not the same
   thing.
3. **Four of the seven filing types have no Excel export at all.** Only
   `annual-accounting`, `guardian-inventory` and `simplified-accounting` ship an
   `excel.js`. Every Plan type — Initial, Annual, Minors, Simplified — has
   none. A Plan filer who reads `:769`, chooses the encrypted option because the
   guide told them they had a fallback, and then loses the password, has lost
   the case file with no recourse. The advice fails precisely when it is relied
   on.

**The privacy claim is absolute and the app is not.** `:768` — "your entire
case lives in the .sav file you choose; **the app keeps no hidden copy
elsewhere**." The `.sav` is the authoritative durable record, but the browser
also holds, on the device:

- A full-case IndexedDB recovery snapshot (`pg-session-cache`) while changes
  are unsaved, written in the case's own encrypted-or-plain mode, normally
  cleared after a successful `.sav` write (Milestone 52B).
- Launch preferences and a remembered file handle in IndexedDB
  (Milestone 52C).
- The theme preference in `localStorage`.

The claim worth making — and the one that is actually true — is that this
storage stays on the device and no case data is transmitted to a server.

### Steps

**B1.** Rewrite `:173` and `:769` to describe Excel as a **readable secondary
record of the values a supported court workbook holds**, explicitly not a
restorable case backup, and explicitly noting that the Plan filings have no
Excel export.

**B2.** Rewrite `:768` to keep the true guarantee (nothing leaves the device;
no server) while naming the on-device stores above and what clears them.

**B3.** Extend "Excel export details" (`:628`) with the same scope statement,
and name the three filing families that have an export.

**B4.** Re-read the encrypted-option copy at `:167-173` as a whole afterwards:
the "permanent choice" warning is correct and must survive, but it currently
leans on the Excel fallback as its mitigation, and after B1 it has none. The
honest mitigation is saving the `.sav` and keeping the password safe.

### Verification

No automated gate covers guide prose. Verification is a read-through against
the three source facts (the `excel.js` inventory, `recovery-cache.js`,
`launch-preferences.js`), plus confirming the corrected text does not claim a
capability that `grep` cannot find.

### Cross-cutting ramifications (`AGENTS.md` §8)

- **Security & Sensitivity:** this sub-delivery *narrows* a privacy claim to
  what the code supports. It should be read by someone who can confirm the
  on-device inventory is complete — if another store exists that this list
  misses, the corrected text is wrong in the same way the original was.
- **Legal/Compliance:** the encrypted-option warning is the closest thing in
  the guide to advice with consequences. Its corrected form should not
  overstate recoverability in either direction.
- Everything else: N/A.

---

## 56C — Correct the Court-Facing Administrative Order

**Risk: Low** (documentation), **court-facing.**

### Files

`help/index.html` (`:514`).

### Background

`:514`, in the Initial Plan section, tells Pinellas and Pasco filers that a
separate Disaster Plan "must also be filed under **Administrative Order
2019-005**". **Alan has confirmed AO 2019-005 is superseded by AO 2024-025.**

The app has already moved on, in two places and in two different ways:

- `src/features/help/help-content.js:123` — the in-app Help panel states the
  requirement as a "Local Sixth Judicial Circuit requirement (Administrative
  Order)", naming **no number at all**.
- `src/features/dashboard/resources.js:95` — the Sixth Circuit resource group
  links "Local orders, including AO 2024-025".

`src/core/filing/county-guidance.js:20` records the reasoning in passing,
describing 2019-005 as "unavailable".

So this is not only a stale citation: the standalone guide currently
contradicts the app's own help text about the same requirement.

### Steps

**C1.** Replace the embedded number at `:514` with the role-based phrasing the
app already uses — "under the current Sixth Judicial Circuit guardianship
administrative order" — and link the circuit's **current orders index**, the
same destination `resources.js` points at, rather than a deep link to one
order.

**C2.** If a number is named at all, name AO 2024-025 as *the current order*
in the same breath as the link, so a future supersession makes the sentence
out of date rather than wrong.

**C3.** Leave the substance untouched: the requirement itself, the
Pinellas/Pasco scoping, the minor-ward-residing-with-parent exemption, and
"the app does not produce that document" are all still accurate — confirm each
against `help-content.js:122-123` rather than assuming.

### Verification

Read against `help-content.js` and `resources.js`; the guide and the in-app
panel must agree on the requirement and on how the order is identified.
`tests/unit/content-corrections.spec.js`'s "AO 2024-025 removal guard" governs
`src/` only and is unaffected by a `help/` edit — confirm it still passes
rather than assuming the boundary.

### Cross-cutting ramifications (`AGENTS.md` §8)

- **Legal/Compliance:** this is the one sub-delivery whose text states a
  filing obligation. `AGENTS.md` §5's county-gating rule applies: the Disaster
  Plan requirement is Sixth Circuit, and the corrected text must not read as a
  statewide requirement. It should be reviewed by someone qualified to confirm
  the current order actually carries the requirement in its Disaster Plan
  section.
- Everything else: N/A.

---

## 56D — Correct What Blocks an Export

**Risk: Low** (documentation).

### Files

`help/index.html` (`:257`, `:452`, `:476`, `:526`, `:549`).

### Background

Two corrections, both from Milestone 55.

**Attorney Primary Email is now genuinely enforced (55D), and the rule differs
by filing type.** Verified per family, at the validator, not from the
milestone text:

| Filing | Rule | Source |
| --- | --- | --- |
| Annual / Final / Trust Accounting | **Unconditional** | `annual-accounting/index.js:1468` |
| Simplified Accounting | **Unconditional** | `simplified-accounting/index.js:714` |
| Annual Plan | Required **when an attorney name is entered** | `plan-annual/index.js:785` — `if(d.attorney)` |
| Initial Plan | Required **once any attorney field is started**; a completely blank attorney card remains valid | `plan-initial/index.js:687-694` — gated on `attorney_name \|\| attorney_bar \|\| attorney_signatureDate \|\| signatureState!=='none'` |
| Simplified Annual Plan, Annual Plan — Minors | Unchanged | no `attorney_email` requirement |

The Initial Plan's conditionality is the one worth spelling out in the guide:
it is what keeps pro se and Guardian Advocate filings possible, and a filer who
reads "attorney email is required" flatly will think they need an attorney.

**Sidebar completion now includes date validity, not just presence (55B).**
`:257` currently frames the section indicators as tracking missing answers.
They also turn incomplete when reporting-period, GID, signature, preparer,
attorney or certification dates violate the same ordering rules that block the
export — `computeNavChecks()` calls `checkDateOrder()` directly
(`src/legacy-app.js:6731, 6898, 6960`). This affects five filing families.

### Steps

**D1.** At `:257`, state that a section can be incomplete because an answer is
missing **or because a date is out of order**, and that the sidebar and the
export blocker now apply the same rule — which is the point of 55B.

**D2.** At `:452` (Simplified Part V), `:476` (Annual Part V), `:526` (Initial
Plan Attorney Certification) and `:549` (Annual Plan Signatures), state the
per-filing rule from the table above. Do not generalise across filings; the
four rules genuinely differ.

**D3.** Re-verify each rule at the validator before writing it. These four
lines are the kind that get copied between filing sections and quietly
generalised.

### Verification

Cross-read against the four validators. Optionally, exercise each rule once in
a browser — enter an attorney name on an Annual Plan and confirm the email
becomes required; leave the Initial Plan's attorney card blank and confirm the
filing still exports.

### Cross-cutting ramifications (`AGENTS.md` §8)

- **Legal/Compliance:** the Initial Plan statement must preserve the pro se /
  Guardian Advocate path. Getting this wrong tells an unrepresented filer they
  need a lawyer.
- Everything else: N/A.

---

## 56E — Correct the Controls That Changed

**Risk: Low** (documentation).

### Files

`help/index.html` (`:203-208`, `:320-342`, `:591`, `:616`, `:635`, `:731-740`,
`:846`, `:851`).

### Background

Five surfaces changed and the guide describes all five as they used to be.

**1. The Signature Stamp "Type" tab is gone (55C).** The widget has exactly two
tabs, `draw` and `upload`, with Draw preselected
(`signature-pad.js:187-188`). The guide says "Capture it one of three ways",
"opens a small panel with three tabs", documents Type, and its Quick Reference
at `:846` reads "Draw / Type / Upload".

> **Do not over-correct.** The *"three states"* sentence immediately above —
> Unsigned, "/s/" Signed, Signature Stamp — is still **correct**. Only the
> capture-method wording changes. These two sentences sit within a few lines of
> each other.

**2. The "?" button does two different things.** Verified at the source:
`openUserGuideForCurrentPage()`'s own comment reads *"'?' while a filing is
open: skip the Help panel, jump straight to the manual page for wherever the
filer actually is"*, and `openUserGuide()` opens a new tab. So:

- On the **dashboard**, "?" opens the Help & Guidance panel.
- **Inside a filing, including Preview**, "?" opens this standalone guide in a
  new tab, deep-linked to the section for the current page
  (`USER_GUIDE_ANCHORS`, including `'/print':'preview'`).

The guide's `:203-208` and `:851` both describe the panel as the universal
behaviour.

**3. The Help panel's button is "View User Guide".** `:738` calls it "Download
PDF guide" and says it "exports the help content as a standalone PDF". The app
does not generate a PDF guide; the button opens this document
(`src/legacy-app.js:296`). 56A deletes the orphaned implementation that once
backed the old label.

**4. Preview carries the global controls.** All Filings, the theme toggle and
Help now appear in the Preview & Export banner for every filing type, including
single-page previews — `src/legacy-app.js:1715-1740`, whose comment states the
early return "must run before" the single-page path "otherwise those previews
lose All Filings, theme, and Help entirely". "The export toolbar" (`:591`) does
not mention them.

**5. The annotation toolbar has controls.** Selecting a note shows a contained
toolbar with **Note color** and **Delete note**
(`src/core/pdf/pdf-annotate.js:100-106`), which disappears when the note is
deselected. "Annotating the preview" (`:616`) omits both. The guide should also
say plainly that this toolbar is application chrome and not part of the court
document.

**6. The dashboard toolbar has four undocumented controls.** `:635` lists New
Form, Export All Filings, New Filing from Existing and Search. It omits
**Report a Bug** (opens the in-app feedback dialog), **Comment Card** (opens the
Pinellas Clerk's official external form in a new tab), the **theme toggle**, and
**Help** — `src/features/dashboard/index.js:64-65`.

### Steps

**E1.** `:320-342` — two tabs, remove the Type instructions, correct the
capture count, leave the three *states* alone.
**E2.** `:846` — "Draw / Upload".
**E3.** `:203-208` and `:851` — document the dashboard-versus-filing split for
"?", including that it opens in a new tab and lands on the current section.
**E4.** `:738` — rename to "View User Guide" and describe what it does; drop
the PDF claim.
**E5.** `:591` — add All Filings, theme toggle and Help to the export toolbar
description, noting they appear for every filing type including single-page
previews.
**E6.** `:616` — document Note color and Delete note, when the toolbar appears
and disappears, and that it is not part of the document.
**E7.** `:635` — add Report a Bug, Comment Card (external, new tab), theme
toggle and Help.

### Verification

Each of the seven against its named source line. E3 and E5 are worth
exercising in a browser rather than reading: open a filing, press "?", confirm
a new tab on the right anchor; open Preview on a single-page filing type and
confirm all three controls are present.

### Cross-cutting ramifications (`AGENTS.md` §8)

- **UI/UX Consistency:** E7 documents an external link (Comment Card) that
  leaves the app; the guide should say so, matching how it treats other
  third-party destinations.
- Everything else: N/A.

---

## 56F — Rewrite Helpful Resources

**Risk: Low** (documentation). The largest single rewrite here.

### Files

`help/index.html` (`:685-687`, `:800-832`).

### Background

Milestone 54 replaced the county-scoped resources panel wholesale, and both
guide sections still describe the old one.

What the guide says now: links are "automatically scoped to whichever counties
appear on your filings — both Pinellas and Pasco show until a filing names a
county", plus the Sixth Circuit and a statewide group; and the short
Pinellas/Pasco list reproduced at `:800-832` is "the same list" as the app's.

What the app does now:

- A **Judicial Circuit selector** offers all 20 circuits.
- With no saved selection, the default is **derived from the counties on the
  filings** (`deriveDefaultCircuit()`, plurality, ties toward the lower
  circuit), falling back to the Sixth.
- A **manual selection is saved with the case** and always wins.
- The panel shows **every county in the selected circuit**, the circuit-level
  group where one exists, and the Florida statewide group.
- **All 67 counties carry real data** — property appraiser, clerk
  guardianship, clerk of court records, tax collector, with extras for some
  counties. No empty placeholder groups remain.
- **Opening one accordion closes the previously open one** (commit `ba66083`).

Two specific staleness items inside `:800-832`:

- The claim that the reproduced list is "the same list" as the app's is now
  false by two orders of magnitude — the app ships 88 groups and several
  hundred links.
- The Pinellas clerk guardianship link is stale: the guide points at
  `mypinellasclerk.gov/Home/Probate-Mental-Health#49273-guardianships`; the app
  uses `mypinellasclerk.gov/Guardianship`.

### Steps

**F1.** Rewrite `:685-687` around the selector: what it is, the derived
default and its fallback, that a manual choice persists with the case, and
what the panel then shows.
**F2.** Rewrite `:800-832` so it no longer claims to mirror the app's
directory. Either present the reproduced links explicitly as a **Sixth Circuit
example** — stating that every other circuit's counties are available in the
app — or replace the enumeration with a description plus the statewide list,
which is the part that genuinely does not vary.
**F3.** Correct the Pinellas clerk link.
**F4.** Document the mutually-exclusive accordion behaviour.
**F5.** Keep the third-party disclaimer statement; it is still accurate and
still matters.

### Verification

Against `src/features/dashboard/resources.js` and
`MILESTONE-54-PROPOSAL.md`'s final shipped catalogue. Every URL the guide
reproduces should be checked to still match the app's entry for the same
destination, not only the Pinellas one — that is the failure this sub-delivery
is fixing, and fixing one instance of it is not fixing it.

### Cross-cutting ramifications (`AGENTS.md` §8)

- **Legal/Compliance:** `AGENTS.md` §5's county-gating rule is live here. The
  rewritten text must not present the Sixth Circuit's administrative orders as
  statewide requirements, and should note that selecting a circuit is a
  browsing choice rather than an assertion about where the filer's case sits —
  the same distinction recorded and accepted in `MILESTONE-54-PROPOSAL.md`'s
  Appendix.
- Everything else: N/A.

---

## 56G — Refresh the Stale Screenshots

**Risk: Low** (documentation). Sequenced last.

### Files

`help/index.html` — the embedded images and their captions.

### Background

At least five images show retired UI:

1. The Signature **Type** tab, and the applied-stamp caption reading "Draw /
   Type / Upload".
2. The old Helpful Resources panel — Pinellas, Pasco and the Sixth Circuit
   only, with no circuit selector.
3. Preview **without** All Filings / theme / Help in its banner.
4. The Help panel showing the old **Download PDF guide** button label.
5. The annotation area, if it predates 55A's contained toolbar — the stray
   colour swatch or blank mark.

### Steps

**G1.** Capture against the current build in a real browser, using the same
target the e2e suite uses (`vite preview`, the `source` target), so no image
can show a state the app cannot produce.
**G2.** Replace the images and update every caption that names a removed
control.
**G3.** Check the file size after replacement. The guide is already 11.8 MB
with images embedded; if the refresh grows it materially, say so rather than
letting it drift silently.

### Verification

Each new image against the live UI it depicts, and each caption against the
text corrected in 56E/56F.

### Cross-cutting ramifications (`AGENTS.md` §8)

- **UI/UX Consistency:** screenshots are the part of a guide filers trust most
  and re-read least carefully; a stale one outlives the prose correction.
- Everything else: N/A.

---

## Sequencing and concurrency

- **56A is independent of everything else** and can land first or last. It is
  the only sub-delivery touching `src/`.
- **56E before 56G** — four of the five screenshots illustrate text 56E
  rewrites.
- **56F before 56G** — the resources screenshot depends on it.
- **56B, 56C, 56D are independent** of each other and of everything else.
- All doc sub-deliveries edit **the same file**, `help/index.html`. Landing two
  of them concurrently from different sessions will conflict. They are line-
  scoped and far apart, so a conflict is resolvable, but the cheaper rule is to
  land them one at a time.
- Per `AGENTS.md` §1, sync and re-check `git log`/`git status` immediately
  before each sub-delivery: this repository takes concurrent pushes, and line
  numbers in an 11.8 MB single-file document are exactly the kind of citation
  that goes stale. **Re-derive every line number at execution time.**

---

## Acceptance criteria

| Scenario | Expected result |
| --- | --- |
| `grep -rn "exportHelpGuideAsPDF" src/` after 56A | No output |
| 56A's detector | Red before the deletion, green after |
| `npm run build` after 56A | Clean; `html2pdf-loader.js` still reachable from the real PDF export path |
| `grep -c "Type" ` within the signature section after 56E | No occurrence describing a capture tab; the three *states* sentence intact |
| `grep -n "Download PDF guide" help/index.html` after 56E | No output |
| `grep -n "2019-005" help/index.html` after 56C | No output |
| `grep -n "unencrypted fallback" help/index.html` after 56B | No output |
| Guide's Pinellas clerk URL after 56F | Matches `resources.js`'s entry exactly |
| Every URL the guide reproduces, after 56F | Matches the app's entry for the same destination |
| `tests/unit/content-corrections.spec.js` | Passes throughout — it governs `src/`, not `help/`, and nothing here should change that |
| Full unit suite | Green at each sub-delivery |
| `MILESTONE-56-PROPOSAL.md` | Amended in place with a dated "Landed" note per sub-delivery, per repo convention |

---

## Verification plan

Per sub-delivery, the **Verification** block is the lite gate (`AGENTS.md`
§1). No sub-delivery here warrants a full regression on its own: 56A is an
isolated deletion with a detector, and 56B–56G do not touch `src/` at all.

**The honest limitation, stated rather than papered over:** there is no
automated gate on guide prose. `test-index-guard` polices the test index and
`content-corrections.spec.js` polices `src/` for the AO string, but nothing
fails when `help/index.html` describes a control that no longer exists — which
is precisely how eleven of these accumulated. Every correction here is verified
by reading the shipped source it describes, and that is the whole gate. If this
recurs, the thing worth building is a guard that extracts the control names the
guide claims and checks them against the source — noted under out of scope
below, because it is a real milestone, not a step in this one.

---

## Deliberately out of scope

Named here so they are not rediscovered as omissions:

- **A guide-versus-app drift guard.** The obvious response to eleven
  simultaneous staleness findings is a test that fails when the guide describes
  a control the app does not have. It is genuinely worth doing and it is not
  this milestone: matching prose to UI is a fuzzy problem, a naive string scan
  over an 11.8 MB document will produce false positives faster than anyone will
  tolerate, and designing it properly is its own scoping exercise.
- **Re-wiring a PDF guide.** See Decision 3. If wanted, it should generate from
  `help/index.html`, not from a second copy of the prose.
- **The guide's own structure, tone, or completeness.** This milestone corrects
  what is *wrong*. Whether the guide should also cover things it has never
  covered is a separate question.
- **Milestone 53's refactors.** Internal; no user-visible behaviour changed, so
  no guide text is affected. Confirmed rather than assumed.
- **The Summary-link navigation fix** (`bcaeb5f`). It restored the behaviour the
  guide already describes, so the guide is correct as written.
- **`help/index.html`'s file size.** 11.8 MB of embedded screenshots is worth
  revisiting, but it is a packaging decision affecting load time and the
  portable build, not a correctness one. 56G notes the size rather than
  addressing it.
