# Milestone 16: Ward-Level Tab Lock

## Goal

Prevent two browser tabs from editing the same ward at the same time.

A user who accidentally (or intentionally) opens the application in a second tab and then opens the same ward creates a silent data-loss risk: whichever tab saves last wins, and the other tab's changes are overwritten with no warning. This milestone eliminates that risk by acquiring an exclusive, per-ward lock the moment a ward is opened for editing, and hard-blocking any second tab that attempts to open the same ward while the lock is held.

Multiple tabs may coexist. A professional legal assistant or secretary can legitimately have Ward A open in tab 1 and Ward B open in tab 2; this milestone allows that. What it prevents is two tabs editing the **same** ward simultaneously.

## Non-Negotiables

- Do not change `.sav` schema or `SAV_FORMAT_VERSION`. The lock is entirely in-memory/session — it is not written to any persisted file.
- Do not change archive hydration, ward factories, or workflow persistence rules.
- Do not use mock data in production rendering.
- Preserve CSP: no source-authored executable inline scripts or inline event handlers.
- Preserve `mount()`/`dispose()` lifecycle safety for all features.
- Web and portable builds must remain valid.
- The portable (`file://` double-click) build is explicitly out of scope for the lock. The Web Locks API is unavailable on `file://` origins in most browsers. The portable build must detect this and skip locking silently, with no user-visible error.

## Locking Mechanism

Use the browser's **Web Locks API** (`navigator.locks`) — the correct tool for cross-tab coordination in a client-side app.

Key properties:
- **Automatic release on tab close or crash.** No stale lock possible. If the tab holding the lock is force-killed, the browser releases the lock immediately. No heartbeat, timestamp, or cleanup logic is needed.
- **Exclusive mode.** `navigator.locks.request(name, { mode: 'exclusive', ifAvailable: true }, callback)` — if the lock is unavailable, `callback` is called with `null` (not the lock object) and the acquire fails immediately. No waiting, no queue.
- **Same-origin only.** The lock is scoped to `caernarvon.net`. Two different origins cannot interfere.
- **No persistent side effects.** Nothing written to `localStorage`, IndexedDB, or any `.sav` file.

### Lock name

```
pg-ward-{wardId}
```

Where `wardId` is the existing stable identifier already present on every ward object and used throughout the dashboard (e.g. `data-ward-id` attributes, `switchWard(wardId)` calls).

### Lock lifecycle

| Event | Lock action |
|---|---|
| User opens a ward (`switchWard`) | Acquire `pg-ward-{wardId}` exclusively, `ifAvailable: true` |
| Lock acquired | Ward opens normally; lock held for tab lifetime or until ward is closed |
| Lock not available | Hard block — show the blocked-tab modal; ward does not open |
| User navigates back to dashboard (ward closed) | Release lock by resolving the lock-holder callback |
| Tab closed or crashes | Browser releases lock automatically |
| Portable build / `file://` origin | Skip lock silently; app behaves as today |

## Hard Block UX

When a second tab attempts `switchWard` on a locked ward, it receives `null` from the lock request. It must not open the ward. Instead it shows a modal:

> **This ward is already open in another tab**
>
> Close the other tab or navigate away from this ward there, then try again here.
>
> [ OK ]

Design constraints:
- Use the existing modal infrastructure (`showModal` / overlay pattern already in the app).
- Plain, calm language. This is not an error — it is a deliberate guard. Do not use error/danger styling.
- Single dismissal action: **OK** (closes the modal and returns the user to the dashboard).
- No "force open anyway" escape hatch. The hard block is intentional.
- Accessible: focus moves to the modal on open; `Escape` closes it; focus returns to the triggering element on close.

## Implementation Slices

Work in slices and checkpoint after each with: files touched, visible behavior changed, tests run and results, any deferrals.

### 16A: Ward lock service (`src/core/ward-lock.js`)

Create a new module that owns all locking logic:

- `acquireWardLock(wardId)` — `Promise<boolean>` — attempts `navigator.locks.request('pg-ward-{wardId}', { mode: 'exclusive', ifAvailable: true }, ...)`. Returns `true` if acquired, `false` if unavailable. Returns `true` immediately (no-op) if `navigator.locks` is not available (portable/`file://` path).
- `releaseWardLock()` — releases the currently held lock, if any, by resolving the lock-holder callback. Idempotent.
- One lock held at a time per tab. Opening a second ward in the same tab (tab navigates from Ward A to Ward B) releases the previous lock before acquiring the new one.
- No public state exported — the held lock is module-private.

### 16B: Wire into `switchWard`

`switchWard` in `legacy-app.js` is the single call site where a ward is activated. The lock sequence must be **atomic**: release the old lock, acquire the new one, and only then allow the ward open to proceed. If the acquire fails, the app must leave the current ward intact and return the user to dashboard state — it must never end up in a half-open state with no lock held and no ward rendered.

State machine — implement exactly this sequence, no shortcuts:

| Step | Action | On success | On failure |
|---|---|---|---|
| 1 | Remember `previousWardId` (current active ward, may be `null`) | → step 2 | — |
| 2 | `releaseWardLock()` (release previous ward's lock) | → step 3 | → step 3 (release is idempotent, never throws) |
| 3 | `acquireWardLock(wardId)` (try new ward's lock) | → step 5 (proceed) | → step 4 |
| 4 | If `previousWardId` is set, try `acquireWardLock(previousWardId)` to restore | Lock restored → show blocked modal, leave previous ward open | Lock not restored → show blocked modal, navigate to dashboard, no active ward |
| 5 | Proceed with ward open normally | Ward is open, new lock held | — |

In prose: **remember → release → try new → if blocked, try restore → if restore fails, land on dashboard.**

Because `legacy-app.js` is a classic non-module script that cannot `import`, the bridge pattern already used by the dashboard and other features applies: `legacy-app.js` calls `window.acquireWardLock` and `window.releaseWardLock`, which `src/core/ward-lock.js` assigns to `window` during startup via the same `createFeatureBridge` / startup pattern already in use.


### 16C: Blocked-tab modal

Add the modal markup and its show/hide logic:

- Markup goes in the appropriate shell fragment (inline in `index.html` alongside the other always-needed overlays: `startup-choice-overlay`, `security-choice-overlay`, `unlock-overlay`).
- Controlled by a new `showWardLockedModal()` function, following the same pattern as existing modal functions in `legacy-app.js`.
- No new inline event handlers. Use the existing delegated event system or a `data-` attribute hook consistent with the rest of the shell.

### 16D: Dashboard lock-state indicator (optional, deferred)

Decide whether the dashboard should show a visual indicator on ward cards that are locked open in another tab.

This requires querying `navigator.locks.query()` to list held locks, then matching against `pg-ward-{wardId}` names. It is useful — a user with two tabs open can see at a glance which wards are busy — but it is not required for the safety guarantee. Defer to a follow-up if it adds meaningful implementation complexity to this milestone.

### 16E: Tests and documentation

- **Unit test (`tests/unit/ward-lock.spec.js`):** Test `acquireWardLock` / `releaseWardLock` logic with a mock `navigator.locks`. Verify: acquire returns true when lock available; returns false when unavailable; release is idempotent; no-op path taken when `navigator.locks` absent.
- **E2E two-tab test (`tests/e2e/ward-lock.spec.ts`):** Use two Playwright browser contexts (same origin) to simulate two tabs. Verify: tab 1 opens ward successfully; tab 2 is blocked (modal appears); tab 1 navigates to dashboard (lock released); tab 2 can now open the ward.
- **E2E same-tab lifecycle test:** In a single browser context, exercise the full same-tab lock transition sequence:
  1. Open Ward A → assert Ward A lock is held.
  2. Switch to Ward B → assert Ward A lock is released and Ward B lock is acquired.
  3. Switch back to Ward A → assert Ward B lock is released and Ward A lock is re-acquired with no stale lock remaining.
  This case is the most likely source of subtle lifecycle bugs (a stale lock left behind on same-tab navigation) and must be covered before the feature ships.
- **Security matrix:** Add the `web` target to the existing security spec run; confirm no new CSP violations.
- Update `INDEX-SPLIT-PLAN.md` with completion notes.

## Decided

**16D (dashboard lock indicator):** Deferred. A lock badge is a useful nicety for professionals with multiple tabs, but it is not required for the data-safety guarantee and adds `navigator.locks.query()` complexity without reducing risk. Revisit in a later milestone.

**Portable build behavior:** Silent no-op only. A startup informational note would be noisy and user-hostile. The portable build skips locking with no user-visible message.

## Acceptance Criteria

- Opening Ward A in tab 1 succeeds normally.
- Attempting to open Ward A in tab 2 while tab 1 holds it shows the blocked-tab modal and does not open the ward.
- Closing tab 1 (or navigating tab 1 back to the dashboard) releases the lock; tab 2 can then open Ward A.
- Opening Ward A in tab 1 and Ward B in tab 2 simultaneously both succeed — different wards do not block each other.
- Navigating within the same tab from Ward A to Ward B releases the Ward A lock before acquiring Ward B.
- No stale locks. Force-killing a tab releases its lock automatically; no manual recovery or "break lock" affordance is needed.
- The portable (`file://`) build skips locking silently. No error is shown, no user-visible change from today.
- Blocked-tab modal is accessible: focus managed on open/close, dismissible with Escape, single OK action.
- No `.sav` schema changes.
- No new inline event handlers or CSP violations.
- Unit and E2E tests pass for all described scenarios.
- Web and portable builds remain valid.
