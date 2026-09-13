# Milestone 40D: Move Theme/UI-Only Preferences to `localStorage`

## Status

**Draft only — independently approved delivery.** This proposal authorizes
no runtime, data-model, test, or documentation change until the requester
approves Milestone 40D specifically. Approval of another Milestone 40
delivery does not authorize this work.

## Goal

Eliminate the theme-flash gap on reload, and stop coupling a trivial UI
preference to case-data persistence, by storing theme (and any other
confirmed pure UI-only display preference) in `localStorage` instead of
the `.sav` file's app state.

## Background

Surfaced while reviewing the portfolio `templates/ui-starter/` kit against
this app's own code. That kit's `theme.js`/`prepaint.snippet.js` already
do this correctly — `localStorage` is synchronously readable before first
paint and needs no decryption. This app's actual `src/prepaint.js` cannot
do the same today because `legacy-app.js`'s `applyTheme()` persists the
chosen theme into `.sav` app state via `saveAppState('theme', theme)`
(`legacy-app.js:60`), which is only readable after the `.sav` file
loads — for an encrypted save, only after the master password is entered.

Confirmed call sites:

- `legacy-app.js:57-69` — `applyTheme(theme, persist)`: writes to `.sav`
  app state when `persist` is true.
- `legacy-app.js:4014` — `if(_appState.theme) applyTheme(_appState.theme,
  false);`: restores the saved theme only after `.sav` load completes —
  the actual, current cause of the flash.
- `legacy-app.js:4085` — `_appState.theme = a.theme;`: theme restore
  inside a full-state import/restore path; needs an equivalent under the
  new mechanism.
- `legacy-app.js:3066` — `theme: await loadAppState('theme')`: theme read
  into a bundled/exported state object.
- `src/prepaint.js`: currently samples only `prefers-color-scheme`; needs
  the `localStorage`-first, `matchMedia`-fallback logic already proven in
  `templates/ui-starter/prepaint.snippet.js`.

There's existing precedent for keeping state outside `.sav`:
`src/core/persistence/launch-preferences.js` already stores pre-case
"launch preferences" (e.g. `hasOpenedCaseBefore`, a remembered file
handle) in a separate IndexedDB store (`pg-launch-pref`). That's the right
category for theme conceptually, but the wrong mechanism for this specific
need — IndexedDB access is asynchronous, so it can't be read inside a
synchronous inline `<head>` script any more than `.sav` can. `localStorage`
is the only browser storage synchronously readable at that point, which is
why the starter kit uses it and why this migration should too.

## Decisions / Implementation

1. `applyTheme()` writes to `localStorage` (a fixed key, value validated
   against an explicit `['light','dark']` enum) instead of calling
   `saveAppState('theme', theme)`.
2. `src/prepaint.js` gains the same `localStorage`-first /
   `matchMedia`-fallback logic as
   `templates/ui-starter/prepaint.snippet.js`, so the correct theme
   paints immediately, before `.sav` ever loads.
3. **One-time migration, not a silent reset:** on first load after this
   ships, if `localStorage` has no stored theme yet but the loaded
   `.sav`'s app state still has `_appState.theme`, seed `localStorage`
   from that value once. Existing users must not see their theme
   silently revert to OS-default.
4. Stop writing new theme values into `.sav` app state going forward.
   Whether to actively delete the old `_appState.theme` key or leave it
   inert is an implementation choice; either is fine as long as it's
   never read again.

   **Every theme-persistence site, enumerated (review pass 2026-09-12).**
   Steps 1-2 named only `applyTheme()` and `prepaint.js`; there are five
   more, and missing any one leaves theme half-migrated. Confirmed
   exhaustively (minimum checklist — line numbers will shift):
   - `legacy-app.js:57-60` — `applyTheme(theme, persist)`, whose
     `saveAppState('theme', theme)` call is the write this delivery
     redirects. Its trailing comment ("lands in the .sav file's appState
     section on the next write") becomes wrong and must be updated.
   - `legacy-app.js:71` — the toggle (`applyTheme(..., true)`), the only
     caller that passes `persist: true`.
   - `legacy-app.js:78` — `applyTheme(currentTheme(), false)` at script
     load. Reconcile this against the new `prepaint.js` logic so the theme
     isn't computed twice by two different rules; whichever one wins must
     agree with what already painted.
   - `legacy-app.js:4014` — `if(_appState.theme)applyTheme(_appState.theme,false);`
     after a `.sav` loads. **This is the flash this delivery is meant to
     eliminate** and the exact point where a file's stored theme could
     still override the user's device choice. Deciding what happens here
     is the substance of step 3's migration rule, not an afterthought.
   - `legacy-app.js:4085` — `_appState.theme=a.theme;` inside
     `loadCaseFileFromZip()`, which is where the legacy value arrives from
     the file and therefore where the one-time seed in step 3 is most
     naturally hooked.
   - `case-file.js:189` — `theme: await loadAppState('theme')` inside
     `buildCaseFileBlob()`'s `appStateBlob`: the live serializer that puts
     theme *into* every new `.sav`. Removing the write in `applyTheme()`
     alone does not stop this — it re-reads persisted app state directly.
     **This function is also edited by Milestone 40F**; see the dependency
     table in `MILESTONE-40-PROPOSAL.md`.
   - `legacy-app.js:3066` — the same `theme:await loadAppState('theme')`
     line in `legacy-app.js`'s own dead duplicate of `buildCaseFileBlob()`.
     Milestone 40F deletes that entire function, so **if 40F lands first
     this site disappears on its own**; if this delivery lands first, edit
     it anyway rather than leaving one copy migrated and one not.
   - `src/styles/tokens.css:51` — a comment stating "applyTheme() restores
     the .sav file's setting after the file loads." Documentation of the
     behavior being removed; update it.
5. **State the behavioral change explicitly, because it is a real one:**
   theme moves from *per-case* (travels inside the `.sav`, so opening a
   colleague's file could change your appearance) to *per-device*
   (`localStorage`, so it follows the browser and is identical across
   every case opened on it). That is the intended improvement, but it
   means a user who deliberately themed one case differently loses that,
   and a `.sav` moved to a new machine no longer carries its theme. Both
   are acceptable — theme is a display preference, not case data — but say
   so in the delivery notes rather than letting a filer discover it.
6. **Scope of "UI choices" beyond theme:** theme is the concrete,
   confirmed case. Before broadening the change to other settings,
   inventory what else currently lives in `.sav` app state (`_appState`
   in `legacy-app.js`/`core/state.js`) that is genuinely UI-only, rather
   than assuming more exist — extend the same treatment only to what's
   actually found.
7. **Data model: no CSV change needed.** Re-confirmed directly against
   the current file — `probate-guardian-data-model.csv` has no `theme`
   or `appState` row of any kind. The CSV tracks persisted case/filing
   data, not app-level UI preferences, and this migration doesn't change
   that scope. No `npm run verify:data-model` update is required as part
   of this delivery.

## Acceptance Criteria

| Scenario | Expected result |
| --- | --- |
| First page load, no prior theme choice | Paints OS `prefers-color-scheme` immediately, no flash. |
| First page load, prior explicit theme choice | Paints the stored `localStorage` theme immediately, before `.sav` loads. |
| Existing user upgrading from a `.sav` with a legacy `_appState.theme` | `localStorage` is seeded once from that value; the visible theme does not change on upgrade. |
| Theme toggled in-app | Writes to `localStorage`, not `.sav`; no `.sav`-file change is required to persist the choice. |
| `.sav` full-state import/restore | Theme restore still works via the new mechanism; no dangling reference to the old `_appState.theme` path remains uncorrected. |
| A case file finishes loading mid-session | No visible theme change and no flash at that moment — the `legacy-app.js:4014` post-load apply no longer overrides what already painted. |
| A `.sav` written after this lands, inspected directly | Its appState section carries no new `theme` value (`buildCaseFileBlob()` no longer serializes one). |
| A `.sav` themed dark on machine A, opened on machine B whose stored choice is light | Machine B stays light — the file's contents never change appearance. This is the intended per-device behavior from Decision 5, and the test should assert it deliberately rather than treating it as incidental. |

## Verification

Add `tests/unit/theme-persistence.spec.js` covering: theme write goes to
`localStorage`, not `.sav`; loading a `.sav` with a legacy
`_appState.theme` seeds `localStorage` exactly once and never overwrites
an existing `localStorage` value; `src/prepaint.js` prefers a stored
`localStorage` value over `matchMedia` and falls back correctly when none
is stored. Add or extend an e2e spec that reloads after an explicit theme
choice and asserts the correct theme on first paint, not just after JS
settles. Update `TEST-INDEX.md` for any new/changed file. This is a
narrow, self-contained change; it does not need a full-regression
recommendation on its own.
