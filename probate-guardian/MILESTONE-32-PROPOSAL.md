# Milestone 32: Responsive Breakpoint Standardization

## Status

Proposed implementation plan. This document does not implement application changes.

## Goal

Converge the app's responsive layout onto one coordinated breakpoint scale.
The sidebar's collapse point and the "pair of cards side by side" pattern
used across all 7 filing-type modules currently trigger at different,
uncoordinated pixel values, producing dead zones where a window is wide
enough for two-column cards but the breakpoint hasn't fired yet. Fix by
anchoring everything on Bootstrap's own stock scale (confirmed unmodified
in the vendored build) rather than inventing new one-off values or a custom
Bootstrap breakpoint rebuild.

This was evaluated against two alternatives — adopting more Bootstrap
components generally, and replacing Bootstrap with USWDS or Tailwind — and
scoped down to breakpoint standardization specifically, since the drift is
a discipline problem within the existing framework, not a framework
limitation. Bootstrap is already fully vendored offline (`lib/bootstrap.min.css`,
`lib/bootstrap.bundle.min.js`, both precached by the service worker, the JS
bundle at critical tier), already drives 300+ layout instances, and a
framework replacement would require re-implementing every JS-driven
interactive component (modals, off-canvas drawer) and re-verifying the
WCAG 2.1 AA / PDF/UA-1 accessibility work already completed, for no
functional gain specific to this app's dense, multi-field, print-to-PDF
form pattern.

## Baseline and Evidence

Inspection found the following. Recheck at implementation time since other
work may be active in the repository.

| Surface | Current observation | Implication |
| --- | --- | --- |
| `src/styles/shell.css:60` | Sidebar (fixed `272px`) collapses to an off-canvas drawer at a custom `900px`, a value invented only for the sidebar. | Anchor point for the whole scale; nothing else is coordinated with it. |
| `src/features/{guardian-inventory,annual-accounting,simplified-accounting,plan-simplified,plan-minor,plan-annual,plan-initial}/index.js` | The repeated "pair of cards" pattern (`.card-grid-2col` for party/guardian/witness cards, `.schedule-entry-grid` for financial schedule entries) pairs at three different breakpoints depending on module: `col-md-6` (768px), `col-lg-6` (992px, already fixed in Annual Accounting's schedules and parts of Guardian Inventory), `col-xl-6` (1200px, in 4 modules: plan-annual, plan-initial, plan-minor, and simplified-accounting). 30 occurrences need conversion (24 `col-md-6` + 6 `col-xl-6`); 23 additional instances are already at the target `col-lg-6` state. Guardian Inventory is partially migrated: 5 instances still at `col-md-6` (L451, L878, L901, L916, L1016) and 5 already at `col-lg-6` (L342, L940, L953, L990, L1002). | Same visual pattern, three different real-world trigger widths depending on which filing type a user is in. Guardian Inventory's mixed state means implementers must sweep only the `col-md-6` instances, not assume the file is uniformly unconverted. |
| `src/styles/cards.css:6` | `@media (min-width:768px) and (max-width:900px){.card-grid-2col>.col-md-6{width:100%;}}` — a hand-written compensating hack that exists only to force `md-6` cards back to single-column while the sidebar still occupies its 272px. | Direct, already-committed evidence the sidebar/card-breakpoint mismatch is a known, previously-patched pain point, not a new theory. |
| `src/styles/cards.css:5,10` | `.attorney-certification-card{width:calc(50% - .5rem);}` plus `@media (max-width: 900px){.attorney-certification-card{width:100%;}}`. | This card's width comes from its own standalone rule, not a Bootstrap `col-*` class — it needs its breakpoint value updated, not removed, since it is unaffected by the `col-md-6`→`col-lg-6` conversion elsewhere. |
| `src/styles/dashboard.css:24,27,232,239,244`, `src/styles/shell.css:66,249` | Seven more one-off custom pixel breakpoints (900 ×4, 1100, 620, 520, 640), uncoordinated with each other or with Bootstrap's scale. | Same class of drift, smaller blast radius. |
| `lib/bootstrap.min.css` | Confirmed stock/unmodified: default `sm/md/lg/xl/xxl` = `576/768/992/1200/1400`, and its own compiled `max-width` queries use `575.98px`/`991.98px` (verified directly in the vendored file, not assumed). | No custom Bootstrap build exists or is needed; use its own subpixel convention rather than inventing a different one. |
| `tests/e2e/attestation-layout.spec.ts` | Test selectors use two distinct `col-md-6` patterns: (a) bare `.col-md-6` selectors in the first test block (L23, L24, L40, L48, L63, L73, L91, L100) — these target Guardian Inventory cards whose markup uses `col-12 col-md-6`; (b) `.col-12.col-md-6` selectors in the accounting/plan test blocks (L124, L125, L130, L137, L144, L171, L172, L177, L184, L198, L207, L210, L219, L222, L233) — these target accounting and plan module cards. Both groups must change to `col-lg-6`. Separately, 6 selectors use `.cover-info-row > .col-md-6 > .summary-box` (L110, L157, L195, L204, L216, L230) and must **not** be touched — that pattern is intentionally out of scope. If M31 rewrites these tests into contract specs before M32 executes, the selector sweep becomes smaller or unnecessary. | Test-selector sweep must be scoped by container class, not a blind find-and-replace on the string `col-md-6`. |
| `tests/e2e/schedule-card-layout.spec.ts` | Already asserts `col-lg-6` pairing for Annual Accounting's schedules. Also contains 6 `.col-12.col-xl-6` selectors (L131, L132, L141, L150, L151, L165) for plan-annual, plan-initial, and plan-minor cards, plus 1 `.col-12.col-md-6` selector (L164) for simplified-accounting guardian cards — all must change to `.col-12.col-lg-6`. | Same verification pattern as prior work, not a new risk. |

## Existing Decisions and Scope

- Standardize on three purpose-based tiers, all stock Bootstrap values — no
  custom Bootstrap breakpoint rebuild:
  - `sm` (576px / `575.98px` max-width) — phone-only polish.
  - `md` (768px) — in-card field grouping ("City / State / Zip" rows).
    Already consistent everywhere via bare `col-md-N`; **not touched**.
  - `lg` (992px / `991.98px` max-width) — the "real estate" tier: sidebar
    collapse, all repeated card-pairing, dashboard stacking.
  - `xl`/`xxl` (1200/1400) stay reserved and unused for layout, as today.
- `cover-info-row`'s `col-md-6` pairs (bare, no `col-12` prefix — two short
  summary boxes on the cover page) are explicitly out of scope. They are a
  different, smaller pattern with no evidence of cramping, and must not be
  changed by either the markup sweep or the test-selector sweep.
- `cards.css:19`'s `768px–1279.98px` band (narrows `.schedule-page`'s
  `col-md-1/2/3` to a fixed third-width on tablets) is out of scope. It
  serves a different purpose — keeping already-narrow schedule columns
  usable, not sidebar-related — and has no evidence of miscalibration.
  Do not fold it into this milestone without separately verifying it first.
- The dashboard triage table's `1100px` collapse point is a candidate for
  folding into the `991.98px` tier, but only after visual verification that
  the table doesn't genuinely need the extra ~108px of room. Do not fold it
  on assumption alone.

## Implementation

### 1. Move the sidebar's collapse point onto the scale

`src/styles/shell.css:60` — change `@media (max-width:900px)` to
`@media (max-width:991.98px)`. This is the change that actually closes the
dead zone: once the sidebar and the card-pairing tier share the same
trigger, there is no window width where the sidebar has vacated its space
but cards still haven't paired.

### 2. Converge every repeated-card pairing onto `col-lg-6`

For each of the 7 feature files, find every `col-12 col-md-6` and
`col-12 col-xl-6` that appears inside a `.card-grid-2col` or
`.schedule-entry-grid` row and change it to `col-12 col-lg-6`. 30
instances need conversion: 24 `col-md-6` across all 7 modules plus 6
`col-xl-6` across 4 modules (plan-annual, plan-initial, plan-minor, and
simplified-accounting's remuneration cards). 23 instances in Annual
Accounting and Guardian Inventory are already at the target `col-lg-6`
state and should be left unchanged.

Guardian Inventory is partially migrated — its schedule cards (L342,
L940, L953, L990, L1002) already use `col-lg-6`, while its party and
witness cards (L451, L878, L901, L916, L1016) still use `col-md-6`.
Convert only the latter group.

Stay scoped to the literal `col-12 col-{md,xl}-6` pattern to avoid
touching `cover-info-row`'s bare `col-md-6` pairs, which are out of scope.

### 3. Remove the dead hack; fix the one that isn't dead

`cards.css:6` becomes dead code once `.card-grid-2col`'s cards are
`col-lg-6` everywhere — its selector (`.card-grid-2col>.col-md-6`) will
never match. Remove it.

`cards.css:10` is not dead — `.attorney-certification-card` gets its width
from its own standalone rule (`cards.css:5`), independent of the
`col-md-6`→`col-lg-6` conversion in step 2. Update its breakpoint to
`991.98px` rather than removing it.

### 4. Fold the remaining one-off custom breakpoints onto the scale

- `dashboard.css:24,27,239` and the sidebar (already covered in step 1) →
  `991.98px`.
- `dashboard.css:232`'s `1100px` triage-table collapse → fold into
  `991.98px` too, for one consistent "below lg" tier across the dashboard,
  unless visual verification shows the triage table needs the extra room
  (see Scope above — verify before folding).
- `dashboard.css:244`'s `620px`, `shell.css:66`'s `520px`, and
  `shell.css:249`'s `640px` → converge on `575.98px`. The `620px` block
  contains multiple rules (flex-direction, grid-template-columns,
  onboarding layout) — verify that all of them are still appropriate at
  the narrower `575.98px` trigger rather than assuming uniform suitability.

## Acceptance Criteria

- Cards in every one of the 7 filing-type modules pair up starting at
  exactly the same viewport width the sidebar collapses at (`991.98px`),
  with no dead zone at any width between them.
- No `col-md-6`/`col-xl-6` remains on a `.card-grid-2col`- or
  `.schedule-entry-grid`-wrapped card; `cover-info-row` is unchanged.
- `cards.css:6` is removed; `cards.css:10` is updated, not removed.
- All one-off `900`/`1100`/`620`/`520`/`640` custom breakpoints are
  replaced by `991.98px` or `575.98px`, except `cards.css:19`'s
  `768–1279.98px` band, which is explicitly untouched.
- `tests/e2e/schedule-card-layout.spec.ts` and
  `tests/e2e/attestation-layout.spec.ts` pass with assertions updated to
  match the new breakpoint, and the 6 `cover-info-row`-scoped assertions in
  `attestation-layout.spec.ts` are verified unchanged.
- Full suite (`npm test`) green before commit, per `CLAUDE.md`'s standing
  rule — the bar for committing to master is a green suite, not a branch.

## Verification

- Load each of the 7 modules' schedule/party pages at 900px, 992px,
  1100px, and 1200px viewport widths and confirm cards pair up starting
  exactly at 992px, with no gap between the sidebar's collapse and the
  cards' pairing.
- Visually confirm the dashboard triage table, header, and mobile
  single-column view still look correct at the folded breakpoints.
- Run the full unit + e2e suite (`npm test`) and both builds before
  committing.
