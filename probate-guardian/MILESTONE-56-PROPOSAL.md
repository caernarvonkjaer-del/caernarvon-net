# Milestone 56: The User Guide Catches Up With the App — Executable Delivery Index

## Status

**Draft — not an authorization to implement anything below.** Per
`AGENTS.md` §2, this is a proposal only; nothing here should be started until
Alan explicitly approves a specific sub-delivery by name. Approval of one
sub-delivery does not authorize the others. Every sub-delivery here is
independently approvable and independently revertible.

**They are not all independent of each other**, and an earlier draft of this
line wrongly said "none is a prerequisite for another" — the sub-deliveries
below contradict it in two places. The actual graph:

```text
56A ──────── independent (the only code change)

56B ─┐
56C ─┤
56D ─┼────── independent of each other
56E ─┤              │
56F ─┘              │
                    ↓
56G ──────── needs 56E + 56F (it re-shoots what they rewrite)
56H ──────── needs 56B + 56C + 56E (retired-term list seeded from their
             corrections) AND 56F (it annotates what E and F leave behind)
```

If a dependent sub-delivery is approved without its prerequisites, stop and say
so rather than working around it.

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
app's nine filing types have no Excel export at all. This milestone corrects the
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
| Attorney email enforcement, all four variants | `annual-accounting/index.js:1468` and `simplified-accounting/index.js:714` (unconditional); `plan-annual/index.js:785` (`if(d.attorney)`); `plan-initial/index.js:687-694` (gated on four specific fields -- NOT phone/email/address) |
| Annotation toolbar has note colour and delete | `src/core/pdf/pdf-annotate.js:100-106` — `aria-label`/`title` of "Note color" and "Delete note" |
| Sidebar completion now includes date order | Milestone 55B added date-order checks to `computeNavChecks()` via a local `datesOrdered()` helper written to mirror `checkDateOrder()`'s tolerance (`src/legacy-app.js:6738`, applied at `:6898, 6960`). It **mirrors** that rule rather than calling it — `legacy-app.js` never calls `checkDateOrder()`; its only two mentions of the name are comments |
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
| 56G — Refresh the stale screenshots | **Low** (doc) | Five images that show retired UI | Depends on 56E/56F landing first |
| 56H — Retired-term and declared-control sentinel | **Low** | A two-part static tripwire: a retired-term scan and a declared-control check | **Last.** Seeded from the corrections above, so it must not land before them |

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
3. **Four of the app's nine filing types have no Excel export at all.** The
   count matters and an earlier draft got it wrong by conflating filing types
   with feature modules. `src/core/filing/filing-descriptor.js` defines **nine**
   filing types — `guardian`, `simplified`, `annual`, `finalAccounting`,
   `trustAccounting`, `planSimplified`, `planAnnual`, `planInitial`,
   `planMinor` — implemented by **seven** feature modules, because
   `annual-accounting` serves the Annual/Final/Trust trio from one engine. Excel
   export exists for **five** types (Initial Inventory, Simplified, Annual,
   Final, Trust), via the three modules that ship an `excel.js`. Every Plan
   type — Initial, Annual, Minors, Simplified — has
   none. A Plan filer who reads `:769`, chooses the encrypted option because the
   guide told them they had a fallback, and then loses the password, has lost
   the case file with no recourse. The advice fails precisely when it is relied
   on.

**The privacy claim is absolute and the app is not.** `:768` — "your entire
case lives in the .sav file you choose; **the app keeps no hidden copy
elsewhere**." The `.sav` is the authoritative durable record, but the browser
also holds, on the device:

- An **unsaved-case** IndexedDB recovery snapshot (`pg-session-cache`) while
  changes are unsaved, written in the case's own encrypted-or-plain mode,
  normally cleared after a successful `.sav` write (Milestone 52B). Not
  "full-case": it deliberately omits `appState` fields, `selectedCircuit`
  among them, as `recovery-cache.js:138-142` records in place. The corrected
  guide text should not promise crash recovery restores everything.
- Launch preferences and a remembered file handle in IndexedDB
  (Milestone 52C).
- **Cross-tab coordination state in `localStorage`** — key
  `pg-tab-heartbeats-v1` (`src/tab-coordination.js:4,55`). This one was missing
  from the first draft of this list and is the most load-bearing omission,
  because of *what* it holds: `normalizeTabState()`
  (`src/tab-state.js:8-20`) puts the active **ward ID, ward name, case number
  and filing type** in it. It is short-lived coordination metadata rather than a
  backup — but "short-lived" describes **operational freshness, not guaranteed
  deletion**: entries older than the heartbeat TTL are filtered only when some
  other tab performs a write (`tab-coordination.js:50-56`), so after a crash a
  stale entry can physically remain in `localStorage` until that happens. It is
  case-identifying data stored outside the `.sav`, and
  unlike the recovery snapshot it is **plain `localStorage` regardless of the
  case's encryption mode**. A filer who chose the encrypted option still has a
  ward name and case number sitting in cleartext on the device. Any corrected
  privacy paragraph that inventories on-device storage and omits this is wrong
  in the same way the original was.
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
**every** source this sub-delivery's claims rest on — and the first draft's
list omitted the two that carry the finding it calls most important:

- the `excel.js` inventory across `src/features/*/` (which filings have an
  export), and `filing-descriptor.js` (how many filing types there are);
- `src/core/persistence/recovery-cache.js` — what the snapshot holds **and
  what it deliberately omits** (`:138-142`);
- `src/core/persistence/launch-preferences.js`;
- **`src/tab-coordination.js`** — the key, the write, and the TTL-on-write
  filtering (`:4, 50-56`);
- **`src/tab-state.js`** — `normalizeTabState()`'s payload fields (`:8-20`),
  which is where "ward name and case number" is actually established.

Plus confirming the corrected text does not claim a capability that `grep`
cannot find.

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
| Initial Plan | Required once **the attorney name, bar number, signature date, or a signature state other than Unsigned** is set. Phone, email and address alone do **not** trigger it, and a completely blank attorney card remains valid | `plan-initial/index.js:687-694` — gated on `attorney_name \|\| attorney_bar \|\| attorney_signatureDate \|\| signatureState!=='none'` |
| Simplified Annual Plan, Annual Plan — Minors | Unchanged | no `attorney_email` requirement |

The Initial Plan's conditionality is the one worth spelling out in the guide:
it is what keeps pro se and Guardian Advocate filings possible, and a filer who
reads "attorney email is required" flatly will think they need an attorney.

**Sidebar completion now includes date validity, not just presence (55B).**
`:257` currently frames the section indicators as tracking missing answers.
They also turn incomplete when reporting-period, GID, signature, preparer,
attorney or certification dates violate the same ordering rules that block the
export. This affects five filing families.

**State the mechanism accurately if the guide states it at all.**
`computeNavChecks()` does **not** call `checkDateOrder()`; `legacy-app.js`
never calls it, and the only two occurrences of that name in the file are
comments. 55B instead defines a local `datesOrdered()` helper
(`src/legacy-app.js:6738`) written to mirror `checkDateOrder()`'s blank-
tolerance, and applies it at the sites around `:6898` and `:6960`. The
**user-facing claim is still true** — the sidebar and the export blocker now
agree about date order — but the guide should describe the agreement, not the
plumbing, and this document should not assert a call that does not exist. An
earlier draft did.

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

**E8 — Correct the stale Playwright comment and close the coverage gap this
sub-delivery exposes.** `tests/e2e/user-guide-wiring.spec.ts:60-65` carries a
comment asserting the opposite of current behaviour:

> "No '/print' case: Print Preview renders its own toolbar … so there is **no
> '?' button on that page at all** — 'preview' stays in `USER_GUIDE_ANCHORS`
> as harmless, forward-compatible data, but **nothing currently triggers it**."

That was true when written and the Preview-banner side task made it false:
`legacy-app.js:1733` renders `id="help-toggle-btn"` into the Preview banner. So
the `/print` → `preview` anchor is now live **and untested**, and the spec
actively documents the wrong behaviour to the next reader.

56E updates the comment and adds the missing `['/print', 'preview']` case. If
the spec's documented scope changes as a result, its `TEST-INDEX.md` row goes
with it (`AGENTS.md` §7). This is the one place where a documentation
sub-delivery earns a test change, and it should not be deferred to 56H — 56H
is a source scan and would never have seen it.

**E9 — State the "?" rule by its actual predicate.** The branch is not
"dashboard versus filing" as a route concept. `src/shell-events.js:29-32`:

```js
case 'toggle-help':
  if (window.caseFile?.activeWardId) window.openUserGuideForCurrentPage?.();
  else window.toggleHelpPanel();
```

It turns on **whether a ward is active**. That is why Preview's "?" opens the
standalone guide (a ward is active there) and the dashboard's opens the panel
(none is). The guide's user-facing wording can stay in plain terms — "on the
dashboard… inside a filing…" — but it should be written from this rule, since
it is the one that predicts Preview correctly.

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
**F2 — Stop reproducing the county directory in the guide at all.** The first
draft offered a choice here: relabel the reproduced links as a "Sixth Circuit
example", or replace the enumeration with a description. **The choice is
resolved in favour of the second**, because the first recreates the very
problem this milestone exists to fix. A county directory copied into the guide
is a second source of truth that must be maintained in lockstep with
`RESOURCE_GROUPS` — and the Pinellas link in F3 is the proof that lockstep does
not hold: it drifted while nobody noticed, in a list of *four* counties. The
app now ships 88 groups and several hundred links. Keeping even a
"representative sample" guarantees the same divergence at a larger scale, and
56H cannot catch it (a URL is not a control marker).

So: `:800-832` describes the circuit selector and directs the reader to the
app's live panel as the authoritative directory.

**The statewide group goes too, and an earlier draft was wrong to keep it.**
"Does not vary by circuit" is not "does not change" — portal, agency and
statutory URLs drift like any others, and a nine-link statewide list is the
same duplicate-maintenance liability at smaller scale, with the same absence of
any gate to catch it. Describe the statewide *categories* in prose and point at
the live panel. **The only links that stay inline are those serving as
authoritative citations for a substantive statement the guide makes** — the
kind of reference a reader needs in order to verify a claim, not a directory
they could browse in the app.

**F3.** Correct the Pinellas clerk link **if it survives F2.** If F2 removes
the reproduced county list as specified, this correction disappears with it —
which is the point. Verify it is gone rather than fixing it in place.
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

**G0 — Triage before capture: keep, replace, or delete.** Recapturing every
stale image is the obvious move and is probably not the right one. Each figure
gets an explicit decision first, recorded with its reason:

- **Delete** where prose is clearer and more durable. A screenshot of a
  toolbar is a picture of a row of labels — it goes stale every time a button
  moves, and this milestone is the second time that has happened. Toolbars are
  exactly the content that should be described, not photographed.
- **Replace, tightly cropped** where the image genuinely carries information
  prose cannot — a signature panel's layout, an annotation toolbar attached to
  a selected note. Crop to the control in question rather than re-shooting a
  full page.
- **Keep** where the figure is still accurate; not every image is stale, and
  re-shooting a correct one adds bytes and risk for nothing.

Two things follow from doing this first. It attacks the 11.8 MB problem from
the only direction that helps — fewer and smaller images, rather than the same
number re-encoded — and it shrinks the recurring drift surface permanently
instead of resetting it. The out-of-scope note about file size stands, but
deleting a figure nobody needs is not a packaging decision; it is just
removing a maintenance liability.

**G1 — Capture conditions, pinned** (for whatever survives G0). "Capture
against the current build" was self-contradictory in the first draft: the
`source` target is `vite preview --outDir .`, which serves **raw source from
disk**, not a build. A later draft left the choice to the executor, which is
the same deferral in a different place.

**Pinned: a fresh `npm run build:web`, served through the `web` target.** The
guide shows a filer what *they* will see, and what they receive is the built
app — so build-time differences (bundling, asset rewriting, the single-file
inlining this project does) belong in the picture. The `source` target is right
for the e2e suite, which is testing behaviour, and wrong here.

Each replacement image is reproducible only if these are fixed and written
down alongside it:

| Dimension | Requirement |
| --- | --- |
| Browser / target | Chromium, and which Playwright target (`source` or `web`) — stated, not implied |
| Viewport | **1280x800, deviceScaleFactor 1**, for every image — one fixed size so figures do not shift scale between sections. A cropped figure is cropped from this, not captured at a different size |
| Theme | **Light**, unless the figure is specifically about dark mode; the guide should not mix without reason |
| Route + UI state | The exact route and the interaction state (panel open, note selected, accordion expanded) per image |
| Fixture data | Synthetic ward names, case numbers and dates, named in the commit so a re-shoot reproduces them |
| Personal data | **Confirm no real ward, case, attorney or filer data appears in any captured pixel.** These are court filings; a screenshot is a disclosure |
| Format / size | **PNG, and no single embedded image over 150 KB** after encoding. These become `data:` URIs in an already-11.8 MB file, and base64 adds roughly a third. An image that cannot meet the cap should be cropped harder (G0) rather than shipped large |
| Supersession | Which existing figure each new image replaces, so none is orphaned and no caption points at a removed one |

**G2.** Replace the images and update every caption that names a removed
control.

**G3.** Check the file size after replacement. The guide is already 11.8 MB
with images embedded; if the refresh grows it materially, say so rather than
letting it drift silently.

**G4.** Render the guide after embedding and look at it. A `data:` URI can be
syntactically valid, correctly referenced, and still display as a broken image
or at the wrong scale; nothing in this milestone's tooling would notice.

### Verification

Each new image against the live UI it depicts, and each caption against the
text corrected in 56E/56F.

### Cross-cutting ramifications (`AGENTS.md` §8)

- **UI/UX Consistency:** screenshots are the part of a guide filers trust most
  and re-read least carefully; a stale one outlives the prose correction.
- Everything else: N/A.

---

## 56H — Guide Retired-Term and Declared-Control Sentinel

**Risk: Low.** Test-only; no application code, no guide prose beyond
annotations. **Lands last** — see Sequencing.

### Files

`tests/unit/user-guide-drift-guard.spec.js` (new), `help/index.html`
(annotations only, in the sections 56E/56F already touch), `TEST-INDEX.md`.

### Background

Eleven simultaneous staleness findings is not eleven mistakes; it is one
missing gate. `test-index-guard.spec.js` polices the test index,
`window-bridge.spec.js` polices the bridge, `native-dialog-guard.spec.js`
polices native dialogs — and nothing at all fails when `help/index.html`
describes a control the app does not have. Milestones 54 and 55 each shipped
correctly and each left the guide behind, because nothing in either one's gate
could notice.

**Why this was originally scoped out, and what changed.** The first draft of
this document put a drift guard under "Deliberately out of scope", on the
grounds that matching prose to UI is fuzzy and a naive scan over an 11.8 MB
document would produce false positives faster than anyone would tolerate. That
objection is correct **about the naive design** and is what the design below
avoids. It is included at Alan's direction, with the fuzzy half deliberately
left out rather than attempted badly.

**The scope decision that makes this tractable: one direction only.** The
guard addresses **the guide claiming a control the app lacks**. It does *not*
assert the converse — that every app control is documented. The first has a
decidable answer against named evidence; the second is a completeness
judgment with no mechanical answer, and building a gate on it is how you get a
test nobody can keep green.

**Do not assign finding counts to this category at all.** Two earlier drafts
tried — "every one of the eleven", then "ten of the eleven" — and both were
wrong, the second incoherently so, since the same section concedes six of the
eleven are undetectable here. The findings are not one shape: some are missing
controls, some are wrong behavioural descriptions, some are false factual
claims about privacy or Excel, one (finding 9) is the reverse direction
entirely. **What 56H provides is two narrow checks, stated without reference to
the eleven:** exact-match regression on five retired terms, and existence
evidence for controls someone explicitly annotated. Everything else in this
milestone is hand-verified, and stays that way.

**What this guard is, stated precisely, because the first draft overstated
it.** 56H is a **source-markup sentinel**, not proof that a control renders.
It checks that the guide's claims still correspond to identifiable markup in
the source it names. Runtime evidence — that a control actually appears and
works — comes from the Playwright contracts, which already exist and are not
replaced by this. The first draft of H2 claimed the guard proved "a control
the guide names and the app no longer renders fails the test." It did not and
could not, for the reason 56H's own design section now records.

### Steps

**H1 — Part 1: the retired-term scan (zero-tolerance).** Model:
`native-dialog-guard.spec.js` (50G-3) — a plain content scan with no fixture
file, because the target is "this string must not appear", not "these
occurrences are permitted". Seed it from this milestone's own corrections:

| Retired term | Retired by | Would have caught |
| --- | --- | --- |
| `Download PDF guide` | 56E / 56A | Finding 3 |
| `2019-005` | 56C | Finding 8 |
| `unencrypted fallback` | 56B | Finding 11 |
| `Draw / Type / Upload` | 56E | Finding 1 |
| `no hidden copy elsewhere` | 56B | Finding 10 |

Each entry carries a one-line comment naming the milestone that retired it, so
the list reads as a history rather than as a pile of magic strings. **It
ratchets:** a future milestone that retires a control adds its string here in
the same commit, and the guide can never quietly reacquire it.

**Five** of the eleven findings would have been caught on the day they
appeared — 1, 3, 8, 10 and 11, one per row above — by roughly twenty lines of
test. (An earlier draft said four; the table has always had five rows.)

**H2 — Part 2: the declared-control check, keyed on stable IDs and exact
evidence.** Model: `window-bridge-allowlist.json` (42C) — a declared surface,
policed.

**Why the first design of this step was unsound, recorded so it is not
retried.** It annotated the guide with the control's *visible label*
(`data-app-control="Report a Bug"`) and asserted that label appeared "as a
literal string somewhere in `src/`". A label can be present in `src/` for
reasons that have nothing to do with a control rendering — and this repository
supplies a verified example of exactly that.

**The worked example: prose keeps a label alive after its control is gone.**
`src/features/help/help-content.js:175` and `:179` contain, as ordinary
sentences inside the in-app Help panel:

> "Use the **Save Backup (.sav)** button to download an encrypted backup…"
> "Use **Open Backup (.sav)** to restore from a backup file…"

Those strings live in help *prose*, not in the buttons' own markup. If the Save
Backup control were removed from the toolbar tomorrow, `help-content.js:175`
alone would keep the literal text "Save Backup" in `src/`, and a label scan
would pass while the control no longer existed. The same hole swallows
comments, dead code (this milestone deletes ~200 lines of it in 56A, prose
included), an unrelated control sharing a word, and a constant no longer
rendered.

> **A correction to this section's own first draft, kept because the mistake is
> instructive.** It cited `Print Preview` as occurring "nine times across
> `src/`, every one of them inside a comment." **That is false.** It occurs
> **51 times across 22 files in `src/`** — 50 of them in `.js` (21 files) plus
> one in `src/styles/print.css`. A first correction said "50" without stating
> that it had filtered to `--include=*.js`, which is how the same string
> produced two different counts in two reviews; the scope is now stated so it
> cannot happen a third time. Many occurrences are live markup — nav-link labels
> (`annual-accounting/index.js:339`, `guardian-inventory/index.js:263`),
> a visually-hidden `<h1>` (`guardian-inventory/print.js:52`), alert copy
> (`pdf-preview.js:464`). The claim came from running `grep … | head -4`,
> seeing four comment hits, and generalising from a truncated sample — the
> precise error this milestone exists to correct in a document, committed while
> correcting one. `Print Preview` is in fact a *poor* example, because it is a
> real live label that would legitimately pass. The `Save Backup` case above is
> verified and actually demonstrates the failure.

It also fails in the other direction — a control that
genuinely exists can be icon-only with its label in an `aria-label`,
assembled by interpolation, HTML-entity encoded, produced by a shared helper,
or visually renamed while keeping a stable action attribute. **Label equality
is the wrong contract in both directions.**

**The contract instead: a stable ID, plus the exact marker that renders it.**
The guide annotates with an identifier, not a label:

```html
<span class="ui" data-app-control="signature-tab-upload">Upload</span>
```

and the spec carries a registry mapping each ID to the precise evidence:

```js
const GUIDE_CONTROLS = {
  'signature-tab-upload': {
    file: 'src/core/signature/signature-pad.js',
    pattern: /data-sig-tab="upload"/,
    label: 'Upload',
  },
  'dashboard-report-bug': {
    file: 'src/features/dashboard/index.js',
    pattern: /data-feedback-open="bug"/,
    label: 'Report a Bug',
  },
};
```

The guard asserts, per entry:

1. Every `data-app-control` value in the guide resolves to a **registered** ID.
2. Every registered ID is **annotated at least once** in the guide — a registry
   entry no claim references is dead weight and should be deleted.
3. **Annotations may repeat; registry keys cannot.** The same control is often
   documented in more than one place (a section and the Quick Reference), so
   repeated `data-app-control` values are expected and legal. "IDs are unique"
   in the first draft was ambiguous between these two and is replaced by this
   pair: object keys are unique by construction, and the guard asserts nothing
   about annotation multiplicity beyond "at least one".
4. The named `file` **exists**.
5. The evidence — an action attribute, control marker or selector, *never* a
   prose label — is found **at every surface the guide claims the control
   appears on**. An entry names a single `pattern` only when the control
   renders in exactly one place; otherwise it names an
   `evidence: [{ file, pattern }, …]` list with **one entry per rendering
   surface**, and **every listed entry must match** (at least once in its own
   file). A missing entry fails the test and names the surface.

   **"One canonical site" is not acceptable, and an earlier draft wrongly
   offered it as an alternative to the list.** The failure it permits is
   exactly the recurrence this guard exists for: if the Preview banner's Help
   button disappeared while the dashboard's remained, an at-least-one-source
   check stays green and the guide keeps promising a control that is gone from
   the page it is documented on. That is not hypothetical — the Preview banner
   controls are the newest and least-settled markup in this set, added days
   before this milestone was written, which makes them the likeliest to
   regress and the least useful to cover loosely.

   The first draft's *"exactly once unless documented otherwise"* stays
   dropped, for the reason it was dropped: it is brittle for a control rendered
   from a shared helper and turns an ordinary refactor red for no safety gain.
   The rule is per-file at-least-once, across a complete list of files. Where a
   genuinely unique marker exists, an entry may still opt into `expectCount: 1`.

   **Known limit, named rather than papered over:** the list catches a surface
   that *disappears*, not a surface that is *added*. If a fourth place starts
   rendering the Help button, nothing here notices. Registering a control
   freezes the surfaces known at registration time; keeping the list current is
   a human obligation, the same one `window-bridge-allowlist.json` carries.
6. `label` is **advisory metadata, not an assertion** — it exists so a human
   reading the registry knows which control an ID refers to. The first draft
   said the label should appear "in proximity to the marker, where practical",
   which is not mechanically testable and would have been either unenforced or
   arbitrarily enforced. An entry that genuinely wants label coverage may add
   an explicit `labelPattern` matched against the same file; absent that, the
   guard makes no claim about the label at all.

That is what makes the ID indirection load-bearing rather than decorative: the
guide is free to call the control whatever reads best, and the guard still
tracks the thing that actually renders it.

**H2a — Sentinel only. Decision made; the two-way contract is rejected, not
deferred.** An earlier draft left this open for Alan to choose between the
source-scan sentinel and adding a matching `data-guide-control="<id>"` to the
application's own markup, calling the latter a "genuine two-way contract".
**That framing was wrong and the option is dropped.** An attribute in app
markup is still only *markup*: dead or unreachable markup carrying the ID
passes exactly as dead source carrying a `pattern` does. It would add
permanent coupling to production templates — and move 56H out of test-only,
with the `AGENTS.md` §8 consequences that brings — **without removing the
limitation it was supposed to remove.** Paying app surface for no additional
guarantee is the wrong trade.

The limitation is instead handled by naming it (H2b) and by leaving runtime
proof where it already lives: the Playwright contracts, which actually render
the app and can see whether a control exists. 56H is a cheap static tripwire in
front of them, not a replacement for them.

**But do not overstate that backstop, as an earlier draft did.** Runtime
coverage exists for some registered controls (signature tabs, the Preview
banner controls, the annotation toolbar) and **not** for others — Report a Bug
and Comment Card have no direct browser coverage today. So the honest statement
is: where a Playwright contract exists, it is the runtime evidence and 56H is
redundant to it; where none exists, **nothing proves the control renders**, and
56H's passing says only that the marker is still in the source. Registering a
control does not create runtime coverage for it.

With this resolved, 56H has no open decisions and is execution-ready on the
same terms as its siblings — approval by name.

**H2b — What 56H does NOT detect.** Stated plainly so the guard is not trusted
past its evidence:

- A control the app has and the guide never mentions (finding 9's direction).
- A behavioural explanation that is wrong while the control exists.
- A conditional validation rule described incorrectly (56D's whole subject).
- A stale screenshot.
- A legal or privacy statement that is false but syntactically plausible
  (56B and 56C's whole subject).
- Dead application markup that still carries a matching identifier.

Six of the eleven findings sit outside what 56H can ever catch. That is not an
argument against it; it is the reason 56B–56G are hand-verified and the reason
the Verification plan says the reading *is* the gate for them.

**H3 — 56H adds its own annotations, after 56E/56F land.** The first draft
split this — listing the annotations under 56H's Files while instructing
56E/56F to add them — which is incoherent under a model where each
sub-delivery is separately approved and separately revertible: approving 56E
would not authorize 56H's markup, and reverting 56H would strand attributes in
sections it never owned. 56H alone adds the attributes.

**H3a — The required initial coverage set, enumerated. This is not optional.**
Saying 56H annotates "whatever 56E/56F have by then corrected" defines no
scope at all: an executor could annotate the two controls used as examples in
this document, watch every assertion pass, and truthfully report the
sub-delivery complete. A guard whose coverage is chosen by whoever implements
it is a guard that certifies its own convenience. **56H is not done until
every row below is registered and annotated, or explicitly excluded with a
reason.**

| ID | Control | Expected evidence (re-derive at execution time) |
| --- | --- | --- |
| `signature-tab-draw` | Signature Stamp → Draw tab | `data-sig-tab="draw"` in `src/core/signature/signature-pad.js` |
| `signature-tab-upload` | Signature Stamp → Upload tab | `data-sig-tab="upload"`, same file |
| `shell-all-filings` | All Filings (filing shell + Preview banner) | `data-shell-action="dashboard"` in **both** `src/core/navigation/router.js` and `src/legacy-app.js` (Preview banner). **Two sites, not three** — the dashboard has no All Filings button because it *is* All Filings |
| `shell-theme-toggle` | Theme toggle | `data-shell-action="toggle-theme"` in **all three**: `router.js`, `src/features/dashboard/index.js`, `legacy-app.js` (Preview banner) |
| `shell-help` | "?" Help button | `data-shell-action="toggle-help"` in **all three**: `router.js`, `dashboard/index.js`, `legacy-app.js` (Preview banner) |
| `dashboard-report-bug` | Report a Bug | `data-feedback-open="bug"` in `src/features/dashboard/index.js` |
| `dashboard-comment-card` | Comment Card | the Pinellas GovQA `href` in `src/features/dashboard/index.js` |
| `annotation-note-color` | Note color | `'Note color'` as an `aria-label`/`title` in `src/core/pdf/pdf-annotate.js` |
| `annotation-note-delete` | Delete note | `'Delete note'`, same file |
| `sidebar-circuit-select` | Judicial Circuit selector | `id="sidebar-circuit-select"` / `data-action="change-circuit"` |

**Two entries that need a judgement call, named rather than left to be
discovered:**

- **"View User Guide"** (the Help panel's button) — 56E corrects its label, so
  it belongs in scope, but its markup should be located before a registry entry
  is written; if it has no stable attribute, it is an **exclusion**, not a
  label match.
- **Preview's banner controls** are the *same three IDs* as the shell's
  (`shell-all-filings`, `shell-theme-toggle`, `shell-help`), because
  `legacy-app.js:1733` renders the identical `data-shell-action` attributes.
  They are not separate controls and must not get separate IDs.

**Exclusions are a first-class outcome.** A control with no stable marker is
**excluded and listed as excluded, with the reason** — per H5, adding a marker
to application code is out of scope for this test-only sub-delivery. An honest
"excluded: no stable selector" is worth more than a label match that passes for
the wrong reason.

Annotating guide sections *beyond* this set is not required and should not be
attempted here.

**H4 — Strip embedded images before scanning.** `help/index.html` is 11.8 MB
almost entirely because screenshots are embedded as `data:` URIs. Strip those
payloads before either scan: it keeps the test fast and stops a base64 blob
from coincidentally matching a retired term.

**H5 — Use a narrow regex for the annotation extraction, deliberately; the
source-side evidence is a different matter.** Milestone 53D replaced a regex
with an AST parser, so the contrast is worth stating rather than looking like a
lapse. Extracting `data-app-control="…"` is a regex over **one attribute this
milestone defines**, on a fixed shape, in a document this repository controls —
the right tool. The registry's `pattern` side is *not* the same thing: it
matches markup inside real source files, so it inherits the weakness 53D
documented. That is precisely why H2 requires an **action attribute or control
marker**, rather than a label: a distinctive `data-sig-tab="upload"` is
checkable by text in a way that the word "Upload" is not. (An earlier draft
said "with an exact occurrence count" here, which contradicts H2's revised
at-least-once rule and its opt-in `expectCount`. H2 governs.) Where a control
has no such marker, the only option in this sub-delivery is to **leave it
excluded and say so** — adding a marker to application code is a code change
outside 56H's test-only scope and would need separate approval, and falling
back to matching its label is what this whole step exists to prevent.

**H6 — Non-vacuity comes from fault injection, not from a historical red
run.** The first draft required the Part 1 scan to be run red against the
uncorrected guide before 56B/56C/56E landed. That conflicts with this
milestone's own approval model: 56H lands last and is separately approved, so
requiring its test to exist and run during 56B means doing unapproved 56H work
inside another sub-delivery. Dropped. Two things replace it, and together they
are stronger:

- **The red evidence is already captured, at proposal time.** Every seeded
  term was confirmed present in the current guide before this document was
  written: `Download PDF guide` ×1, `2019-005` ×1, `unencrypted fallback` ×1,
  `Draw / Type / Upload` ×2, `no hidden copy elsewhere` ×1. That is the
  "it would have caught these" claim, evidenced, with no sequencing
  entanglement. Re-run the counts at execution time rather than trusting them.
- **The fault injections below are the live gate**, and unlike a historical red
  run they remain repeatable forever.

**H7 — `TEST-INDEX.md`** row per `AGENTS.md` §7; `test-index-guard` green.

### Verification

`npx vitest run tests/unit/user-guide-drift-guard.spec.js`, plus
`test-index-guard`. Both halves must be shown to fail on purpose before they
count, per this repository's fault-injection convention (51D, 53B's B12) —
four injections, because the registry design has more ways to be vacuous than
the first draft did:

1. **Part 1:** add a retired term back to the guide in a scratch edit → red,
   naming the term. Revert.
2. **Part 2, marker removed:** delete or alter the real control marker in the
   app (e.g. change `data-sig-tab="upload"`) → red, naming the ID and the file.
   Revert. **This is the injection that matters most**: it is the one the first
   draft's label-matching design would have survived, because the word "Upload"
   would still have been somewhere in `src/`.
3. **Part 2, unregistered annotation:** add `data-app-control="not-a-real-id"`
   to the guide → red. Revert.
4. **Part 2, orphaned registry entry:** add a registry entry no annotation
   references → red. Revert.
5. **Part 2, one surface of a multi-surface control:** remove
   `data-shell-action="toggle-help"` from **the Preview banner only**
   (`legacy-app.js:1733`), leaving the dashboard and filing-shell copies
   intact → red, naming `shell-help` **and the specific file**. Revert. This is
   the injection that distinguishes the required-evidence-list rule from the
   "one canonical site" version that preceded it: under the old rule this
   change was green, and the guide would have gone on documenting a Help button
   that no longer rendered on the page it describes.

A gate that cannot fail is not evidence — and a gate that only fails on the
easy case is worse, because it reads as evidence while proving less than it
appears to.

### Cross-cutting ramifications (`AGENTS.md` §8)

- **Test Coverage & Index:** one new unit spec plus its row. No fixture file,
  matching 50G-3's reasoning — the retired list is small, self-documenting, and
  belongs next to the assertion that uses it.
- **Data Model / Export-Import / Security / Legal:** N/A — test-only.
- **UI/UX Consistency:** the annotations are invisible to readers; they add an
  attribute to existing markup and change no rendered text.
- **Sequencing:** see below. This is 50G-3's lesson repeated: a guard seeded
  before the corrections it describes would need editing on every commit of
  them.

---

## Sequencing and concurrency

- **56A is independent of everything else** and can land first or last. It is
  the only sub-delivery touching `src/`.
- **56E before 56G** — four of the five screenshots illustrate text 56E
  rewrites.
- **56F before 56G** — the resources screenshot depends on it.
- **56B, 56C, 56D are independent** of each other and of everything else.
- **56H lands last, after every correction it is seeded from.** Not a
  preference: its retired-term list is drawn from 56B/56C/56E, so seeding it
  first would make it red against the uncorrected guide and force an edit to
  the guard on every one of those commits. This is the same sequencing note
  Milestone 50G recorded for its own guard ("land 50G-3's guard **last**, not
  first"). **No exception:** an earlier draft carved one out for a red-first
  run before the corrections landed, which H6 has since dropped as
  incompatible with this milestone's own approval model. The red evidence was
  captured at proposal time instead, and the fault injections are the live
  gate.
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
| Guide's county-directory URLs after 56F | **Absent.** Neither the stale Pinellas URL nor its current replacement should appear — 56F removes the reproduced directory rather than correcting it in place |
| Every URL the guide reproduces, after 56F | Matches the app's entry for the same destination |
| `tests/unit/content-corrections.spec.js` | Passes throughout — it governs `src/`, not `help/`, and nothing here should change that |
| 56H Part 1 | Green after 56B/56C/56E; red under injection 1 (a retired term added back), naming the term |
| 56H Part 2 | Every annotation resolves to a registered ID, every registered ID is annotated, each entry's evidence pattern matches in its named file; red under injections 2-4, of which **removing the real control marker** is the one the rejected label design would have survived |
| Test runs | Per the table in the Verification plan — **not** a full unit suite per sub-delivery, which an earlier draft wrongly required |
| `MILESTONE-56-PROPOSAL.md` | Amended in place with a dated "Landed" note per sub-delivery, per repo convention |

---

## Verification plan

Per sub-delivery, the **Verification** block is the lite gate (`AGENTS.md`
§1). No sub-delivery here warrants a full regression on its own: 56A is an
isolated deletion with a detector, and 56B–56G do not touch `src/` at all.

**What to actually run, per sub-delivery.** An earlier draft's acceptance
criteria demanded the full unit suite at every sub-delivery, which contradicts
both this section and the standing preference for targeted runs — and would
mean running 914 unit tests to certify a paragraph of prose:

| Sub-delivery | Run |
| --- | --- |
| 56A | Its dead-code detector (red→green) plus `npm run build` |
| 56B–56F | No test run. These touch `help/` only; the gate is reading the source each claim describes, plus viewing the rendered guide |
| 56G | Rendered-guide inspection; the targeted spec for any behaviour a new screenshot depicts, where one exists |
| 56H | The new drift-guard spec, its four fault injections, and `test-index-guard` |
| Milestone close | One full unit run, if wanted, to confirm the accumulated state — not per sub-delivery |

**The limitation this milestone starts closing.** Until 56H, there is no
automated gate on guide prose at all: `test-index-guard` polices the test
index and `content-corrections.spec.js` polices `src/` for the AO string, but
nothing fails when `help/index.html` describes a control that no longer
exists — which is precisely how eleven of these accumulated at once. So
56B–56G are each verified by reading the shipped source they describe, and
that reading is the whole gate for them.

56H then makes the *next* eleven cheaper to catch, without pretending to solve
the general problem: its retired-term scan would have caught five of these on
the day they appeared, and its declared-control check ratchets over whatever
the guide chooses to annotate. What it deliberately does not do is assert that
the app's controls are all documented — see 56H's scope note, and the
out-of-scope entry below for the half that remains genuinely unsolved.

---

## Deliberately out of scope

Named here so they are not rediscovered as omissions:

- **The reverse drift direction: app controls the guide never documents.**
  56H asserts the guide does not claim controls the app lacks. The converse —
  every control the app ships is described somewhere — is not gated and is not
  attempted. It has no decidable mechanical answer (what counts as
  "documented"? a mention, a section, a screenshot?), and a gate built on it
  would be either trivially satisfiable or permanently red. Finding 9 (the
  dashboard toolbar's four undocumented controls) is in this category, which is
  why it was found by a human review rather than by a scan, and why a future
  recurrence of *that* shape will be too.
- **Annotating the whole guide.** 56H's declared-control check covers what
  56H annotates after 56E/56F land -- see H3, which owns that markup. Sweeping the
  remaining sections is a mechanical follow-up someone can do incrementally; it
  is not required for the guard to earn its place and would balloon this
  milestone's diff for no additional guarantee.
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
