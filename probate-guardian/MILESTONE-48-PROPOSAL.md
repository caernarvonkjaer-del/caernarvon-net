# Milestone 48: Help Content Modularization, Manual Figure Spacing, Ward Dashboard Column Alignment, Guided Tour Fix, and Terms Acknowledgement Gate

## Status

**Landed 2026-09-15, all five sub-deliveries. This section is a backfill,
written 2026-09-15 after the fact** — unlike this repo's other milestones,
this document and its implementation were committed together in one pass
rather than drafted, approved, and landed as separate steps; no separate
draft-then-implement paper trail exists to point to.

All primary work is `104f9b7` ("feat: implement Milestone 48 guidance and
startup terms", `egarrett021`/Garrett, 2026-09-15 14:51:42), which created
this document itself alongside `help-content.js` (48A), the
`Probate-Guardian-User-Manual.html` float-class removal (48B),
`terms-acceptance.js` (48E), the guided-tour dashboard sequence (48D), and
an initial `dashboard.css` pass. Two follow-ups the same afternoon completed
or refined that work:

- `d5478b8` ("fix: balance dashboard triage columns", Garrett, 15:34:35) —
  the `dashboard.css` grid-template-columns rebalance that actually delivers
  48C's "normalize action-slot widths across Annual and non-Annual rows"
  claim; `104f9b7`'s own dashboard.css touch was not yet this fix.
- `fc05e55` ("feat: add dedicated help page", Garrett, 15:56:12) — renamed
  `Probate-Guardian-User-Manual.html` to `help/index.html` and updated its
  two references (`legacy-app.js`, `vite.config.js`), a routing refinement
  beyond 48A/48B's original text but consistent with their intent.

**Additional, out-of-scope-for-48B work landed the same evening:** `b91542a`
("fix: let user manual text use full viewport width", this account +
Claude Sonnet 5, 17:20:17) removed `ch`-based max-width caps that were
leaving large dead margins on wide screens — a real improvement to the same
page, but not part of 48B's own described fix (float-class removal) and not
mentioned in this document's original text below.

**Verified 2026-09-15, after the fact, against current `master`** (not
assumed from the commits' own messages):

- **48A** — `legacy-app.js`'s `HELP_CONTENT` is a `Proxy` delegating to
  `window.HELP_CONTENT` exactly as described; `user-guide-wiring.spec.ts`
  (6/6) passes, confirming the "?" help button still routes correctly for
  every filing type through the extracted content.
- **48B** — no `float-r`, `float-l`, or `float:` rule remains anywhere in
  `help/index.html`, confirmed by direct grep.
- **48C** — `dashboard-visual.spec.ts`'s "dashboard action buttons share
  identical horizontal positions on rows with and without prior years" test
  passes, the exact claim 48C makes.
- **48D** — `guided-tour-navigation.spec.ts` (8/8) passes, including the
  dashboard-sequence and active-sidebar-navigation coverage 48D's own text
  describes.
- **48E** — `terms-acceptance.spec.ts` (2/2) passes: startup is blocked
  until acknowledgement, and a stale stored version re-triggers it.

Full unit suite green (819/819) at the same commit. No gap found between
this document's description and shipped behavior — the missing piece was
purely this status note, not the work itself.

## Overview

Milestone 48 addresses five core UI, layout, modularization, and launch-flow requirements:

1. **48A: Help Content HTML Separation**: Extract the inline HTML help text dictionary out of `legacy-app.js` into its own dedicated feature module (`src/features/help/help-content.js`) so help text can be maintained and modified without touching core app logic.
2. **48B: Help Manual Screenshot & Figure Spacing Fix**: Resolve severe layout breakage in `Probate-Guardian-User-Manual.html` caused by floating figures (`float-r`, `float-l`) overlapping surrounding copy and callout blocks, restoring clean document flow.
3. **48C: Ward Dashboard Column Alignment**: Align header and row column definitions in `src/styles/dashboard.css` and normalize action-slot widths across Annual and non-Annual rows to ensure consistent column spacing and rigid vertical alignment.
4. **48D: Guided Tour Button Activation**: Repair the non-functional "Start guided tour" button in the Help & Guidance panel when invoked on the main dashboard, adding a dashboard tour sequence and auto-closing the help panel.
5. **48E: First-Access Terms Acknowledgement**: Present the supplied Probate Guardian terms before the startup choice, and block all app startup actions until the user explicitly checks acknowledgement and continues.

---

## 48A: Help Content HTML Separation

### Background & Problem

Prior to Milestone 48, all contextual help topics and their associated HTML markup were defined as an inlined JavaScript object (`HELP_CONTENT`) spanning ~180 lines inside `src/legacy-app.js`. This made updating help documentation risky and convoluted, coupling content authoring to core app lifecycle scripts.

### Solution

- Created `src/features/help/help-content.js` as an ES module exporting `HELP_CONTENT` and exposing it on `window.HELP_CONTENT`.
- Appropriately imported `hasSixthCircuitLocalGuidance` from `../../core/filing/county-guidance.js` for dynamic plan guidance generation.
- Froze the dictionary (`Object.freeze`) to protect against runtime mutations.
- In `src/main.js`, imported `./features/help/help-content.js` to ensure the module is evaluated during application boot.
- In `src/legacy-app.js`, replaced the monolithic static object with a lightweight `Proxy` delegating to `window.HELP_CONTENT`, preventing classic-script vs. deferred-module load-order timing issues.
- Updated `src/core/types/window-bridge.d.ts` and `tests/unit/fixtures/window-bridge-allowlist.json` to keep window bridge typing and safety audits fully synchronized.

---

## 48B: Help Manual Screenshot & Figure Spacing Repair

### Background & Problem

In `Probate-Guardian-User-Manual.html`, custom float rules (`float-r`, `float-l`, `clear: both`) caused screenshots and figures to detach from their text flow, colliding with subsequent paragraphs, callout boxes, and subheadings.

### Solution

- Removed the problematic float utility classes from `Probate-Guardian-User-Manual.html`'s internal style sheet.
- Reverted all 9 floated figures back to standard block-flow figures (`<figure class="narrow">` and `<figure class="close">`), allowing diagrams and screenshots to sit centered or inline within their respective sections without overlapping surrounding copy.

---

## 48C: Ward Dashboard Column Alignment

### Background & Problem

On `/dashboard`, the triage table rows displayed inconsistent column alignment between different filing types. Specifically:

- `.dashboard-triage-header` and `.dashboard-triage-row` lacked unified fractional column tracks.
- Annual Accounting rows render an extra "Prior years" button, whereas non-Annual rows rendered an unconstrained empty slot (`.dashboard-action-empty`), causing subsequent action buttons ("Edit", "Preview", "Delete") to shift horizontally row-by-row.

### Solution

- Updated `src/styles/dashboard.css` to unify the grid track definitions across headers and data rows:
  ```css
  .dashboard-triage-header,
  .dashboard-triage-row {
    display: grid;
    grid-template-columns: minmax(130px, 1.2fr) minmax(
        160px,
        1.3fr
      ) 110px 140px 100px minmax(160px, 1.3fr) 120px 430px;
    gap: 10px;
    align-items: center;
  }
  ```
- Gave `.dashboard-action-empty` an explicit inline width (`66px`) equal to the "Prior years" button, guaranteeing identical column boundaries and button positions across all records.

---

## 48D: Guided Tour Button Activation

### Background & Problem

When users clicked "Start guided tour" in the Help & Guidance slide-out drawer on the dashboard, nothing happened. Inspection revealed two causes:

1. `startWalkthrough()` had an early exit `if (!activeInventoryType) return;` — meaning the walkthrough only worked when viewing an active filing.
2. The Help drawer (`#help-panel`) remained open, visually obscuring the screen and walkthrough tooltip dialogs.

### Solution

- In `src/legacy-app.js`, added `WALKTHROUGH_DASHBOARD` defining 6 interactive tour steps for the dashboard:
  1. `#help-toggle-btn`: Help & Guidance panel toggle
  2. `#new-ward-btn`: New Filing / New Ward creation
  3. `.dashboard-summary-strip`: Summary metrics strip
  4. `#dashboard-search`: Dashboard case & ward search
  5. `#theme-toggle-btn`: Dark / Light theme toggle
  6. `.dashboard-triage-queue, .dashboard-empty`: Filings list and actions
- Updated `startWalkthrough()`:
  - If the Help drawer is open (`helpPanelOpen`), automatically calls `toggleHelpPanel()` to close it before initiating the tour.
  - Falls back to `WALKTHROUGH_DASHBOARD` when `!activeInventoryType`.

---

## 48E: First-Access Terms Acknowledgement Gate

### Background & Problem

The app currently exposes the startup choice (open an existing file or start a new one) immediately. The supplied `probate-guardian-terms-modal.html` defines terms acknowledgement content and a checked acknowledgement control, but it is not part of the application startup sequence. A user accessing the app on a new browser profile must see and accept those terms before reaching any startup action.

### Solution

- Add a startup terms overlay using the supplied content and the application’s existing modal styles. It will be present in the initial document so it can appear before the normal startup choice and cannot flash behind asynchronous app initialization.
- On the first visit for the current browser storage, show the terms overlay above the startup choice. Keep the startup choice inaccessible and hidden from assistive technology until acknowledgement succeeds.
- Keep **Continue** disabled until the user checks the acknowledgement checkbox. On acceptance, persist a versioned UI preference (for example, `pg.termsAccepted` with the supplied `2026-09-15` version) in `localStorage`, dismiss the terms overlay, and then reveal the existing open-file/start-new choice.
- Treat a cleared browser profile, unavailable persistence, or a future terms-version change as a fresh acknowledgement requirement. The acknowledgement value is UI-only device preference data: it must not be written to, restored from, or exported with a `.sav` case file.
- Make the overlay a true blocking dialog: use `role="dialog"`, `aria-modal="true"`, a labelled title, initial focus inside the dialog, focus trapping, and no Escape-key or backdrop dismissal path. Terms and privacy-policy links remain usable in a separate browser tab.
- Preserve the supplied Clerk terms and privacy links and acknowledgement wording, while integrating the markup with the existing visual system. This gate records an in-app acknowledgement only; legal review remains responsible for the wording and enforceability of the terms.

### Startup Ordering

1. Browser loads the initial app shell.
2. If the versioned acknowledgement is missing or stale, the terms overlay is the only interactive startup surface.
3. The user checks acknowledgement and selects **Continue**.
4. The app records acknowledgement and presents the normal **Open a saved case** / **Start a new case** startup choice.
5. Returning users with the current acknowledgement proceed directly to that existing startup choice.

### Implementation Areas

- `index.html` and the early startup/prepaint path: render and prioritize the terms overlay before the existing startup-choice overlay.
- A dedicated terms-acceptance module (or the existing startup module where that produces less duplicated startup logic): read and write the versioned local preference, coordinate the transition to the startup choice, and contain keyboard focus behavior.
- `src/styles/modals.css`: add responsive terms-dialog sizing, scroll behavior, and the stacking order required to block the startup choice.
- `src/core/types/window-bridge.d.ts` and allowlist fixtures only if a new global bridge is necessary; prefer module-local behavior.

### Verification

- Add a focused Playwright test covering a fresh browser profile: terms appear before the startup choice, **Continue** is disabled until the checkbox is checked, and acceptance reveals the startup choice.
- Verify Escape and backdrop clicks cannot dismiss the dialog, focus remains inside it while it is open, and the external terms/privacy links are reachable.
- Verify a returning browser profile with the current stored version bypasses the terms dialog, while a stale version requires acknowledgement again.
- Add the new test to `TEST-INDEX.md` and run its targeted suite, along with the relevant startup-flow tests.
