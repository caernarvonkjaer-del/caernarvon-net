# Milestone 40G: Fix the Dashboard Feature-Bridge Boot Crash

## Status

**Landed 2026-09-13 via option (a).** The requester chose option (a) from
Decision 2: `initApp()` is now called from `src/main.js` as its last
statement, after every import has evaluated, instead of from
`legacy-app.js`'s classic-script top level. This also unblocks Milestone
40F's Steps 4 and 6, which were the reason option (a) was preferred over
the two narrower fixes.

### Step 1 findings — what was actually lost

Answered before choosing a fix, as this proposal required. The dashboard
**did** recover, and nothing was permanently lost:

`initApp()` sets the hash to `/dashboard` (`legacy-app.js:9084`) and then
calls `handleHash()` (`:9085`), which calls `renderPage()` **without
awaiting it** — so the bridge failure surfaced as a floating unhandled
rejection rather than aborting startup. Assigning the hash queues a
`hashchange` event that fires after the current task, by which point the
deferred modules have evaluated, so `_dashboardFeatureBridge ??=` succeeds
on that second pass. That is the multi-second "Loading…" stall the browser
session reported: one failed mount, then a silent retry.

Two caveats that made the fix worth doing properly rather than narrowly:

- **The retry is not guaranteed.** If the hash is *already* `#/dashboard` —
  a reload while on the dashboard, which is the common case for a returning
  user — assigning the same value fires no `hashchange`, so there is no
  second pass to recover on.
- **It is effectively unreproducible in e2e.** Every path that reaches the
  failing code first awaits a prompt (session-restore, open-or-start,
  unlock), and that await gives deferred modules far more time than they
  need, so the race always resolves harmlessly under test. The live site hit
  it because it auto-opens a remembered case with no prompt at all. This is
  why `startup.spec.ts`'s long-standing clean-console assertion never caught
  either exception: it only covers the fresh-install path, which stops at the
  startup-choice overlay and never mounts a feature.

### Verification

Because the defect cannot be reliably reproduced behaviourally, the
regression guard is structural: `tests/unit/boot-ordering.spec.js` asserts
that `legacy-app.js` does not call `initApp()` at top level, that `main.js`
does and does so after its last import, and that the module publishing
`window.createFeatureBridge` is still imported and still publishes it.
Verified to fail when the self-start is reinstated. `startup.spec.ts` gains
the behavioural half it was missing — a clean-console assertion on a path
that actually mounts the dashboard.

## Goal

Stop `window.createFeatureBridge is not a function` from throwing on every
fresh page load, so the dashboard feature mounts on first paint instead of
after a multi-second "Loading…" stall.

## Background

Found by browser verification of the live deployment (`caernarvon.net/
probate-guardian`, build `4834b61`, 2026-09-13). **Two** uncaught
exceptions fire on every fresh load. The other one belongs to Milestone
40F; this proposal covers only this one:

```text
TypeError: window.createFeatureBridge is not a function
    at getDashboardFeatureBridge (src/legacy-app.js:6919:43)
    at mountDashboardFeature (src/legacy-app.js:6922:9)
    at renderPage (src/legacy-app.js:5684:11)
    at handleHash (src/legacy-app.js:8949:5)
    at initApp (src/legacy-app.js:9085:3)
```

**Root cause — a hazard this codebase already documents, applied
inconsistently.** `createFeatureBridge` is defined in
`src/core/feature-bridge.js:22` and published at `:82` — an ES module.
`initApp()` is invoked at `legacy-app.js:9259`, top level in the
**classic** script, which runs before any `type="module"` script
evaluates. So `window.createFeatureBridge` genuinely does not exist yet
when `initApp` runs.

`legacy-app.js:6837-6847` explains this precisely and prescribes the
workaround — construct the bridge lazily so that "first actual call …
only happens later, in response to user navigation, long after the
deferred module scripts have run." `getSimplifiedFeatureBridge()`
(`:6849-6851`) follows it and is fine.

`getDashboardFeatureBridge()` (`:6918-6920`) uses the **same lazy `??=`
pattern** — and still crashes, because the comment's load-bearing
assumption is false for the dashboard specifically: **the dashboard is the
landing page.** `initApp` forces `window.location.hash='/dashboard'`
(`:9084`) whenever an existing case is opened, then calls `handleHash()`
(`:9085`) → `renderPage()` (`:5684`) → `mountDashboardFeature()`. The
dashboard's "first actual call" is therefore during boot, not later in
response to user navigation. Laziness cannot help a feature that is
mounted immediately.

**Blast radius is narrower than Milestone 40F's.** `handleHash()` is
called without `await` at `:9085`, so this rejection floats and does not
abort `initApp`; the next statement still runs (and then throws 40F's
error, which does abort it). The dashboard does eventually render — the
browser session reported several seconds stuck on "Loading…" before it
appeared — so something later re-drives the mount successfully. **What is
actually lost on that first attempt has not been determined**: the browser
session could not tell from the UI which widget or panel failed to attach,
and this proposal should not guess. Establishing that is the first
implementation step, not an assumption baked into the fix.

## Decisions / Implementation

1. **Determine the real user-visible impact before choosing a fix.** Load
   the app with the console open, note what the dashboard looks like
   during the "Loading…" stall versus after it resolves, and identify what
   re-drives the successful mount (a later `renderPage`, a navigation, a
   re-render triggered elsewhere). If nothing is actually lost and the only
   symptom is the delay, the fix is smaller and the priority is lower than
   if a panel silently never attaches. Do not proceed on the assumption
   that the dashboard is fully healthy just because it eventually paints.
2. **DECISION — how to order boot against module readiness.** Four shapes,
   recommendation first:
   - **(a) Recommended: drive `initApp()` from the module side.** Move the
     `initApp()` call out of `legacy-app.js:9259` and invoke it from
     `src/main.js` after its imports have evaluated. Modules are
     guaranteed to have run by then, so every `window.*` the classic
     script needs is present, and this fixes the *entire class* of
     ordering bug rather than this one instance. Highest value, but it
     changes app startup ordering — the riskiest single line in the app —
     so it needs its own careful regression pass across launch flows
     (fresh start, opened `.sav`, session-restore, locked/encrypted).
   - **(b) Gate only the dashboard mount** on a module-ready promise that
     `feature-bridge.js` resolves, leaving `initApp`'s position alone.
     Narrower and safer, but leaves the underlying trap in place for the
     next feature that gets mounted at boot.
   - **(c) Defer the initial `handleHash()`** to a microtask/`DOMContentLoaded`
     so it runs after module evaluation. Cheapest, but timing-dependent
     and easy to regress silently — it would fix the symptom without
     making the ordering guarantee explicit anywhere.
   - **(d) Duplicate `createFeatureBridge` into `legacy-app.js`.**
     Rejected — this repo already has one duplicated-implementation
     problem (Milestone 40F) that took a browser session to surface.
3. **Do not simply wrap the call in a `typeof` guard.** Making
   `getDashboardFeatureBridge()` silently no-op when
   `window.createFeatureBridge` is missing converts a loud crash into a
   quiet missing dashboard. The current exception is the only reason this
   was ever found.
4. Update the comment at `legacy-app.js:6837-6847` once the fix lands. It
   currently states an assumption ("first actual call only happens later,
   in response to user navigation") that is false for any boot-mounted
   feature, and a future author following it will land in the same trap.

## Acceptance Criteria

| Scenario | Expected result |
| --- | --- |
| Fresh load of the app with an existing case | No `createFeatureBridge` exception in the console — no uncaught exception at all during `initApp` |
| Fresh load, dashboard route | The dashboard feature mounts on first attempt; no multi-second "Loading…" stall attributable to a failed mount and retry |
| Whatever was found missing in step 1 | Present on first paint, not only after the stall resolves |
| Every launch flow — fresh start, opened `.sav`, session-restore, locked/encrypted unlock | Unchanged behavior; this is the risk surface if option (a) is chosen |
| `getSimplifiedFeatureBridge()` and other lazy bridges | Still work; the fix must not regress the features that were already correct |

## Verification Plan (as originally scoped)

Add an e2e assertion that **first load produces a clean console** — no
uncaught exception during startup. This single check would have caught both
this bug and Milestone 40F's, and its absence is why two exceptions shipped
unnoticed; it is the highest-value test in either delivery. Then run the
launch-flow suite (`tests/e2e/startup.spec.ts`, `routes.spec.ts`,
`case-file-roundtrip.spec.ts`, `unlock.spec.ts`, `recovery-cache.spec.ts`)
plus the dashboard specs. If option (a) is chosen, this is a startup-ordering
change touching every launch path — recommend the full `npm test` regression
before commit/push, per `AGENTS.md`.

## Relationship to Milestone 40F

Same class of defect (classic-script code depending on ES-module state that
has not evaluated yet), different location and different cause, and neither
fix resolves the other:

- **40F's** crash is an undeclared variable in `legacy-app.js`'s duplicate
  `updateLastSavedIndicator()`, reachable only during boot because that is
  the one window where the legacy copy still wins.
- **40G's** crash is a genuinely absent module export at boot time.

Both fire on every load, and 40F's aborts the remainder of `initApp` while
40G's does not. They can be implemented in either order. If option (a)
above is chosen, do 40F first — its deletions shrink the surface that a
startup-ordering change has to be regression-tested against.
