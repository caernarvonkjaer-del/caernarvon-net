# Milestone 65: Wording and label corrections — Proposal

## Status

**Proposed — not authorized; nothing implemented.** Per `AGENTS.md` §3, this
document authorizes nothing on its own — a proposal is not execution.

| Item | Summary | Status |
| :-- | :-- | :-- |
| **65A** | D-5 Certificate of Service: "Indicate if" label names the Ward | **IMPLEMENTED 2026-09-22** — unit red-first, green after |
| **65B** | Helpful Resources disclaimer: carve out Pinellas Clerk sites from "not affiliated" | **IMPLEMENTED 2026-09-22** — unit red-first, green after |
| **65C** | Helpful Resources disclaimer: add a "provided free by the Clerk" line; shrink the section 1pt | **IMPLEMENTED 2026-09-22** — unit red-first, green after |
| **65D** | Hide the Comment Card link on the Start New Form page too (dashboard's own copy was hidden by Milestone 62; this one wasn't) | **IMPLEMENTED 2026-09-22** — unit red-first, green after; window-bridge allowlist + `.d.ts` regenerated |
| **65E** | "Report a Bug" button: border color `--brand` (`#820024`) | Proposed 2026-09-22; not yet built |

---

## 65A — "Indicate if" label names the Ward

### Provenance

Raised 2026-09-22 by Alan, from a screenshot of Guardian Inventory D-5
(Attorney Certification card): the label above the Ward-status dropdown reads
just **"Indicate if"**, with no object. Requested wording: **"Indicate if
Ward is..."**, applied "on any form or page where this question exists."

### Where this question exists — confirmed by reading the source

This exact question (Ward is totally incapacitated / Ward is under 14 years
old / N/A) was added in Milestone 64A-2, item 2.4, and it exists in **one
place only**: Guardian Inventory (Initial Inventory), D-5 Certificate of
Service. It does not exist on Annual, Simplified, or any Plan filing — those
have no Certificate of Service page with this question.

There's a second, unrelated label that also reads "Indicate if" on Annual and
Simplified accountings — `certIndicator`, "Indicate if (e.g. hand-delivered,
mailed)" (`annual-accounting/index.js:1443`, `simplified-accounting/index.js:602`).
That's a different question (method of service, free text, not the Ward's
status) with no "Ward" to name. **Out of scope** — renaming it "Indicate if
Ward is..." would misdescribe the question. Confirmed no such label exists
anywhere else in the app.

For the one question that does apply, "Indicate if" appears in three places,
each read directly:

| Site | File : line | Current text | Governed by |
| :-- | :-- | :-- | :-- |
| On-screen field label (the screenshot) | `guardian-inventory/index.js:1198` | `Indicate if` (bold, required `*`, above the dropdown) | App UI — ours to word |
| App-generated PDF, printed under the recipient list | `guardian-inventory/pdf-model.js:816` | `` `Indicate if: ${d.serviceIndicateIf \|\| '—'}` `` | App UI — ours to word |
| Internal export-blocking error message (shown in the "why can't I export" list when the field is blank) | `guardian-inventory/index.js:1363` | `'D-5 — Indicate if'` | App UI — ours to word |
| The official court workbook's own pre-printed caption, cell J24, with the answer written to J25 directly below it | `guardian-inventory/excel.js:530-532` | `Indicate if:` (pre-printed by the template; we only ever write the *answer* to J25, never the caption) | **The court's own template — `AGENTS.md` §5. Out of scope; not proposed for change.** |

The dropdown's three option strings (`Ward is totally incapacitated`, `Ward
is under 14 years old`, `N/A`) are what gets written to the exported Excel
line and the printed PDF sentence — they read as complete answers on their
own (e.g. the PDF prints "Indicate if: Ward is totally incapacitated"), so
**they are not proposed for change**, only the label that precedes the
dropdown on screen (and, if decision D1 says so, the two other app-authored
copies of the question above).

### Decision needed — D1 — **DECIDED 2026-09-22: option 1 (all three), wording "Indicate if Ward is:"**

The on-screen label is confirmed in scope. Two more copies of the same
question exist, both app-authored (not the court template), both currently
also just "Indicate if":

1. The PDF's printed sentence (`pdf-model.js:816`) — a filer or reviewer
   reading the exported PDF sees the same bare "Indicate if:" this item is
   fixing on screen.
2. The export-blocking error message (`index.js:1363`) — shown in the
   sidebar/summary list of what's stopping export; currently "D-5 — Indicate
   if" would become "D-5 — Indicate if Ward is:".

Decided: all three are reworded together, for consistency — a filer sees the
same wording everywhere the question is asked or referenced. Exact wording:
**"Indicate if Ward is:"** (with the colon, closer to the court form's own
J24 caption style), not the recommended no-colon form and not a literal
ellipsis.

### Proposed change

| Site | File : line | Becomes |
| :-- | :-- | :-- |
| On-screen field label | `guardian-inventory/index.js:1198` | `reqLabel('Indicate if')` → `reqLabel('Indicate if Ward is:')` |
| PDF printed sentence | `guardian-inventory/pdf-model.js:816` | `` `Indicate if: ${...}` `` → `` `Indicate if Ward is: ${...}` `` |
| Export-blocking error message | `guardian-inventory/index.js:1363` | `'D-5 — Indicate if'` → `'D-5 — Indicate if Ward is:'` |

No other change to any of the three lines — the select, its three options,
and the surrounding markup are untouched.

**Implementation note for the build:** `reqLabel()` appends the required
asterisk directly after the label text with no separating space
(`<strong>${text}</strong><span class="req">*</span>`); with a trailing colon
that reads "...Ward is:*". Worth a visual check when this is built — every
other `reqLabel()` call in this file ends in a bare word, so a colon
immediately before the asterisk is a new shape for this label, not an
existing pattern to match.

Cosmetic only: no `window.D` key changes, no export-format change, no
migration. Existing `.sav` files are unaffected. `AGENTS.md` §5 is not
engaged — the workbook's own J24 caption is never touched, and the three
option strings written to the export are unchanged.

---

## 65B — Helpful Resources disclaimer: carve out Pinellas Clerk sites

### Provenance

Raised 2026-09-22 by Alan: the "not affiliated" disclaimer under the
Helpful Resources panel's link list should read, after fixing an apparent
typo ("thank" → "than", confirmed with Alan): "These are independent
government and third-party sites. **Other than Pinellas Clerk sites**,
Guardian Forms is not affiliated with them and does not control their
content."

**Factual basis, read directly rather than assumed:** the app already says
elsewhere that it *is* the Clerk's own — `index.html:162`, the Terms of Use
intro: "Guardian Forms is provided by the **Pinellas County Clerk of the
Circuit Court and Comptroller** (the "Clerk")"; the footer stamps
"© Copyright {year} Pinellas County Clerk of the Circuit Court and
Comptroller" on every page (`legacy-app.js:8058`). So a blanket "not
affiliated with them" is inaccurate for the two Pinellas Clerk links the
same panel lists — `pinellas-clerk-guardianships` (mypinellasclerk.gov/
Guardianship) and `pinellas-court-records` (courtrecords.mypinellasclerk.gov),
both `resources.js:20-34`. This item only records the wording change and the
two facts above that motivate it — per `AGENTS.md` §8 item 8, whether that
carve-out is legally sufficient (e.g. does it need to name the two Pinellas
Clerk links specifically, or say more about what "affiliated" means) is not
resolved here and isn't this app's call to make.

### Where this text exists — confirmed by reading the source

The identical sentence appears in **two rendered places** plus one test
asserting it verbatim:

| Site | File : line |
| :-- | :-- |
| Live app — Helpful Resources panel, dashboard sidebar (every filing type, every circuit) | `src/features/dashboard/resources.js:2706` |
| Static user guide's copy of the same disclaimer, under "Other resources" | `help/index.html:849` |
| Unit test asserting the sentence verbatim | `tests/unit/dashboard-resources.spec.js:403` |

Confirmed no other copy exists (searched the whole repo for the closing
clause "does not control their content" — exactly these three hits).

### Decision needed — D2 — **DECIDED 2026-09-22**

Two sub-decisions, both settled directly with Alan when this item was
raised:

1. **Typo**: "thank" → "than". Decided: yes, fix it; document the corrected
   wording, not the literal typed string.
2. **Scope**: reword both rendered copies (`resources.js` and
   `help/index.html`), not just the live app panel. Decided: **both** — same
   sentence, same fix, for consistency between the app and its own guide.
   `dashboard-resources.spec.js:403`'s assertion updates to match, in the
   same commit (§7).

### Proposed change

`resources.js:2706` and `help/index.html:849` both become:

> These are independent government and third-party sites. Other than
> Pinellas Clerk sites, Guardian Forms is not affiliated with them and does
> not control their content.

No change to which links are listed, their URLs, or anything else on either
page — wording only. `dashboard-resources.spec.js:403`'s expected string
updates in the same commit; grep confirms no other test asserts the old
wording.

Cosmetic only: no `window.D` key changes, no export/import path touched, no
`probate-guardian-data-model.csv` change, no migration.

---

## 65C — "Provided free by the Clerk" line; shrink the disclaimer section 1pt

### Provenance

Raised 2026-09-22 by Alan: add a third sentence to the same
`.sidebar-resource-disclaimer` block 65B edits, below the sentence "This
application is tuned for local requirements for the 6th Judicial Circuit.
Please review requirements for other Florida Judicial Circuits before
using." — **and** reduce the font size of everything in that section by
1pt.

### Where this section exists — confirmed by reading the source

The anchor sentence ("tuned for local requirements…") exists in **one place
only**: `resources.js:2707`, inside the live app's Helpful Resources panel.
Unlike 65B's sentence, it has no copy in `help/index.html` — that file's
"Other resources" section has only the "not affiliated" disclaimer (see
65B), not this one. So there is no matching anchor to attach a third
sentence to there; **this item touches `resources.js` only.**

```html
<div class="sidebar-resource-disclaimer">
  <p>[65B's sentence]</p>
  <p>This application is tuned for local requirements for the 6th Judicial
  Circuit. Please review requirements for other Florida Judicial Circuits
  before using.</p>
  <!-- new third <p> goes here -->
</div>
```

Styling for the whole block is one rule, so "reduce everything in that
section" is a one-line change: `src/styles/shell.css:112`,
`.sidebar-resource-disclaimer{font-size:.875rem; …}` — both existing `<p>`s
and the new third one all inherit it; no per-paragraph font-size override
exists (`:113`/`:114` only set margins).

`.875rem` is 14px at this app's unstyled root (no `html{font-size}`
override anywhere in `src/styles/` — confirmed by search — so `1rem` is the
browser default 16px; `body{font-size:14px}`, `shell.css:9`, is a separate,
non-root value that `rem` does not key off). **Worth noting:** at 14px this
disclaimer is currently the *largest* text in the whole resources panel —
bigger than the resource link labels themselves (`.sidebar-resource-link`,
`.8rem`/12.8px, `:109`) and nearly double the link descriptions
(`.sidebar-resource-desc`, `.72rem`/11.52px, `:111`). Shrinking it 1pt
brings it in line with the rest of the panel's sizing rather than standing
out as the largest line in a footnote-style block.

### Decision needed — D3 — **DECIDED 2026-09-22**

1. **Entity name.** The sentence as given used the short form "Pinellas
   Clerk of Court & Comptroller." Decided: use the **full legal name**,
   matching the footer (`legacy-app.js:8058`) and Terms of Use intro
   (`index.html:162`) verbatim — "Pinellas County Clerk of the Circuit Court
   and Comptroller" — so the app never names the Clerk two different ways.
2. **"1pt" in a rem-based stylesheet.** CSS's `pt` is a real absolute unit
   (1pt = 1.333px, fixed, not relative to anything) and is valid inside
   `calc()` mixed with `rem`. Decided: write it as
   `calc(.875rem - 1pt)` rather than hand-rounding to a decimal `rem` value
   — it says exactly what was asked, is exact (12.667px, not an approximation),
   and keeps the "why this number" visible in the rule itself rather than a
   magic constant.

### Proposed change

`resources.js:2705-2708`, third paragraph added inside the existing
`sidebar-resource-disclaimer` div:

> This service is provided, Free to Use, by the Pinellas County Clerk of the
> Circuit Court and Comptroller.

`shell.css:112`:

```diff
-.sidebar-resource-disclaimer{margin:.85rem .75rem .5rem;padding:.65rem .75rem;font-size:.875rem;color:var(--ink-4);line-height:1.35;border-top:1px solid var(--line);}
+.sidebar-resource-disclaimer{margin:.85rem .75rem .5rem;padding:.65rem .75rem;font-size:calc(.875rem - 1pt);color:var(--ink-4);line-height:1.35;border-top:1px solid var(--line);}
```

`dashboard-resources.spec.js:394-408`'s existing test ("renders section with
aria-labelledby and footer disclaimer") gets a third assertion for the new
sentence, alongside its two existing `toContain(...)` checks (§7).

Cosmetic only: no `window.D` key changes, no export/import path touched, no
`probate-guardian-data-model.csv` change, no migration, no change to
`help/index.html` (no anchor sentence exists there — see above).

---

## 65D — Hide the Comment Card link on the Start New Form page too

### Provenance

Raised 2026-09-22 by Alan: "There's a comment card link still on the Forms
Selection page, please hide that until reactivated, just like what was done
for the dashboard, previously."

### Where this exists — confirmed by reading the source, and the history

Milestone 62 item 1 hid the Comment Card link on the **dashboard toolbar**
only — `dashboardToolbarActionsHTML()`, `src/features/dashboard/index.js`,
behind a module-level `const SHOW_COMMENT_CARD_LINK = false;` (`:64`), with
the markup kept in source and only its inclusion in the rendered string
gated (`:69-71`), specifically so reinstating later is a one-line flip.

What 62's own scope note ("Hide the 'Comment Card' **dashboard toolbar**
link") didn't cover: the identical link, same URL, same label, also renders
**unconditionally** on the "Forms Selection" page — `pageInventorySelector()`
in `src/legacy-app.js:5570`, the app's own name for it is "Start New Form"
(the `<h1>` at `:5572`) — `:5576`, inside the same `feedback-entry-actions`
block as that page's "Report a Bug" button.

This isn't a new discovery: Milestone 56H's drift-guard construction already
found and recorded both surfaces ("`data-feedback-open="bug"` and the GovQA
link render on **two** surfaces — the dashboard toolbar *and*
`legacy-app.js`'s Start New Form page — not one," `MILESTONE-ARCHIVE.md`
~L32132), and `user-guide-drift-guard.spec.js`'s (now-removed — see below)
`dashboard-comment-card` registry entry named both files as required
evidence for the GovQA URL. 62 hid one of the two surfaces it already knew
about; the second was left as-is, which is the gap this item closes.

### Decision needed — D4 — **DECIDED 2026-09-22: one shared flag**

`dashboard/index.js` is an ES module, dynamically imported only when the
dashboard route mounts; `legacy-app.js` is the classic script loaded up
front, and defines `pageInventorySelector()` directly. They can't share a
plain module-level `const` the way two ES modules could. Two ways to gate
both surfaces:

1. Two independent `SHOW_COMMENT_CARD_LINK` consts, one per file (matches
   62's pattern exactly, no new coupling) — but a future reinstate needs two
   edits, and nothing stops them drifting (one flipped back, one forgotten).
2. **One shared flag**, `window.SHOW_COMMENT_CARD_LINK`, set once in
   `legacy-app.js` (the classic script that loads first) and read by both
   `pageInventorySelector()` (same script, direct read) and
   `dashboard/index.js`'s `dashboardToolbarActionsHTML()` (via `window.*`,
   the same pattern the file already uses for everything else it needs from
   `legacy-app.js` — see its top-of-file destructure from `window`, `:12-20`).
   A future reinstate is one flip, both surfaces update together.

Decided: **option 2**, a single shared flag.

### Proposed change

`legacy-app.js`, near the other `window.<CONST>=<CONST>;` bridge exports
(e.g. `:151` `window.INVENTORY_TYPES=INVENTORY_TYPES;`) — add:

```js
// Milestone 62 hid this on the dashboard toolbar; Milestone 65D extends the
// same hide to the Start New Form page, and unifies both behind one flag so
// reinstating is one flip instead of two. Flip to true to bring both back.
const SHOW_COMMENT_CARD_LINK = false;
window.SHOW_COMMENT_CARD_LINK = SHOW_COMMENT_CARD_LINK;
```

`pageInventorySelector()` (`:5570-5577`) — the unconditional `<a>` becomes
the same ternary shape as the dashboard's:

```js
${SHOW_COMMENT_CARD_LINK ? `<a class="topnav-btn" href="https://pinellascountyfl.govqa.us/...">${ic('message',16)} Comment Card<span class="visually-hidden"> (opens in a new tab)</span></a>` : ''}
```

`dashboard/index.js:64` — the local `const SHOW_COMMENT_CARD_LINK = false;`
is deleted; `:69` reads `window.SHOW_COMMENT_CARD_LINK` instead (destructured
alongside the file's existing `window` read, `:12-20`, or read inline — a
build-time detail, not a decision).

**Window-bridge governance applies** (this repo's own gate, not optional):
`window.SHOW_COMMENT_CARD_LINK` is a new `window.*` assignment, so it needs a
row in `tests/unit/fixtures/window-bridge-allowlist.json` (sorted by file,
then name) and `window-bridge.d.ts` regenerated via
`node scripts/audit-window-bridge.mjs --declare`, or `window-bridge.spec.js`
fails.

**Tests.** No existing test asserts either surface's Comment Card markup
today — confirmed by search (`user-guide-drift-guard.spec.js`'s own comment,
`:26`: "Report a Bug and Comment Card have no direct browser coverage
today"), and the `dashboard-comment-card` guard entry that once checked the
GovQA URL's presence in both files was removed in `d51fddd` when the guide
stopped mentioning the (already-hidden) control — correctly not re-added
here, since the guide still won't mention it. So this item's own build
supplies the first direct coverage: a red-first Playwright check that
neither surface's rendered page contains the GovQA URL or "Comment Card"
text, red against current source (Start New Form page only — the dashboard
side is already hidden), green after.

Cosmetic only: no `window.D` key changes, no export/import path touched, no
`probate-guardian-data-model.csv` change, no migration. The link's markup —
URL included — stays in source on both surfaces, exactly as 62 intended;
only its rendering is gated, and by one flag now instead of one-and-a-half.

---

## 65E — "Report a Bug" border color

### Provenance

Raised 2026-09-22 by Alan: "Make the border around 'Report a Bug' button
color #820024."

### Where this exists — confirmed by reading the source

Same two surfaces as 65D's link, sharing the same markup shape and the same
`.topnav-btn` class: `src/features/dashboard/index.js:73` and
`src/legacy-app.js:5575`, each `<button type="button" class="topnav-btn"
data-feedback-open="bug">`.

`.topnav-btn` (`src/styles/shell.css:143`) already draws a 1px border on
every button sharing the class — Report a Bug, Comment Card, theme toggle,
Help — in the neutral `var(--line)` color, with a lighter brand tint on
hover (`:144`, `var(--brand-200)`). Report a Bug is the only one of these
whose border this item changes; the others are untouched.

**`#820024` is not a new color** — it's the exact value of this app's `--brand`
token (`src/styles/tokens.css:20`: `--brand:#820024;`), used for the header,
primary buttons, and (per Milestone 62 item 2) the dashboard's "TEST SYSTEM"
label. It has one definition, not redefined for dark mode, so `var(--brand)`
is `#820024` in both themes — confirmed by reading `tokens.css`'s dark-mode
block, which redefines `--brand-050`/`-100`/`-text` but not `--brand` itself.

`AGENTS.md` §6 requires the semantic token, not a literal hex, in an
ordinary component rule (a token definition, vendor style, print style, or
embedded SVG are the only exceptions) — so the new rule reads `var(--brand)`,
which **is** `#820024`, not the literal hex repeated a fourth time.
(Aside, not in this item's scope: `src/styles/forms.css:63` already has this
exact color hardcoded as a literal `#820024` rather than the token — a
pre-existing instance of what §6 warns against, older than this milestone
and not touched here.)

### Proposed change

`src/styles/shell.css`, new rule scoped to just this button by its action
attribute (so the other `.topnav-btn` buttons are unaffected):

```css
.topnav-btn[data-feedback-open="bug"]{border-color:var(--brand);}
```

One rule, both surfaces (`shell.css` is loaded globally) — no change to
either file's markup. The existing shared `:hover` rule
(`.topnav-btn:hover{border-color:var(--brand-200);...}`) is untouched and
still applies on hover; this item only changes the resting-state border.

Cosmetic only: no `window.D` key changes, no export/import path touched, no
`probate-guardian-data-model.csv` change, no migration, no test impact
(no existing test asserts `.topnav-btn` border color).

