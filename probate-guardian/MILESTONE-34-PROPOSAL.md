# Milestone 34: Distribution-Target Failure-Mode Coverage

## Status

**Proposal only.** No test-file change or product-code change is authorized
until this plan is reviewed and approved. This document holds the first
piece of what may grow into a small set of distribution-target-specific
failure-mode tests; only the piece below is scoped so far.

## Goal

Add the web-mode (`dist/web`, `PG_TARGET=web`) equivalent of
`feature-load-failure.spec.ts`'s chunk-load-failure test, closing the one
gap Milestone 33's Phase 5 flagged rather than papered over: the "hosted
parity" execution profile's own scope table names "chunk-load failure," but
no test for that exists under the `web` target today — only under `source`.

## Background

`feature-load-failure.spec.ts` (landed under an earlier milestone) proves
that a feature chunk failing to load shows a "This section could not be
loaded" message with a working Reload action, instead of a silent blank
view. It works by intercepting a literal, stable path:
```js
await page.route('**/src/features/dashboard/index.js', async route => {
  await route.abort('failed');
});
```
This is explicitly `source`-only
(`skipEnvironmentLimitation(!sourceTarget, 'The source target exposes a
stable unbundled chunk URL for failure injection')`) because `source` serves
unbundled ES modules directly by their real path. `dist/web`'s Vite build
hashes every chunk filename (confirmed: the dashboard chunk built as
`assets/dashboard-lbmMcAnk.js` in a recent build; the hash changes on every
rebuild), so the same literal route glob cannot survive past the build that
produced it.

Two things were confirmed while scoping this milestone, so implementation
doesn't have to rediscover them:

1. **The route glob must be hash-agnostic or manifest-driven.** Either
   `page.route('**/assets/dashboard-*.js', ...)` (a glob tolerant of the
   hash) or reading the actual built filename out of `dist/web`'s output
   (or its own precache manifest, see next point) before registering the
   route. The former is simpler; the latter is more precise if multiple
   chunks could match a loose glob.
2. **The dashboard chunk is precached at `"offline"` tier, not `"critical"`**
   — confirmed directly by inspecting `dist/web/sw.js`'s generated
   `PRECACHE_MANIFEST` (built by `scripts/generate-service-worker.mjs`):
   `{"url":"./assets/dashboard-lbmMcAnk.js", ..., "tier":"offline", ...}`.
   The "critical" tier is installed synchronously on first load
   (`offline.spec.ts`'s "first load installs the atomic critical shell"
   test); "offline" tier entries are only fetched into the cache when the
   user explicitly triggers `DOWNLOAD_OFFLINE_PACK` (`offline.spec.ts`'s
   "ready offline pack" tests). That means on a **fresh session that has
   never downloaded the offline pack**, a request for the dashboard chunk
   should still be a genuine network request Playwright can intercept — the
   same shape as the `source` test, just against a hashed URL. This needs to
   be verified against the service worker's actual fetch handler (the
   generated `dist/web/sw.js`, and the template `generate-service-worker.mjs`
   fills in) rather than assumed: if the fetch handler unconditionally
   consults the cache for anything present in the manifest regardless of
   whether it's actually been fetched yet, the interception point would need
   to move (e.g. intercepting at the SW's own `fetch` inside the page
   instead of at Playwright's network layer, or asserting after confirming
   via `caches.keys()`/`caches.match()` that the entry isn't yet cached).

## Non-Negotiables

Carried forward from Milestone 33, since this is the same test suite under
the same constraints:

1. Preserve existing product behavior — this milestone strengthens test
   coverage, it does not change the chunk-load-failure UX itself.
2. Keep `workers: 1`.
3. Retain `feature-load-failure.spec.ts`'s existing `source`-only test
   unchanged; this adds a `web`-mode sibling, it does not replace or rename
   the existing spec.
4. No image-snapshot testing as a substitute for the semantic assertion
   (the "could not be loaded" message and Reload action, same as the
   existing test).

## Proposed Approach

Add a new test to `feature-load-failure.spec.ts` (or a `web`-scoped sibling
file, if keeping the two target-specific tests in one `describe` makes the
skip/target split clearer — decide at implementation time by which reads
better once both are written) that:

1. Skips via `skipExpectedTargetExclusion(currentTarget !== 'web', ...)`
   (the mirror image of the existing test's `source`-only guard).
2. Creates a ward and, on a **fresh session** (no offline pack downloaded —
   the default state `freshStartNoPassword()` already produces), routes the
   hash-agnostic dashboard chunk glob to abort, then navigates to
   `/dashboard`.
3. Asserts the same "This section could not be loaded" message and working
   Reload action the `source` test already asserts, proving the failure-mode
   UX itself is shared/target-agnostic product code (per the two-phase
   commit / shared-mechanism pattern this whole test suite already leans on
   for `web`/`source`/`portable` parity elsewhere) — this test is about
   proving the *test infrastructure* can inject the failure under `web`,
   not about the UX differing by target.
4. If point 2 above (offline-tier caching interaction) turns out to block
   simple network-level interception, document the actual mechanism found
   and adjust the interception approach accordingly — do not weaken the
   assertion to something that would pass regardless of whether the failure
   was genuinely injected.

## Acceptance Criteria

- A `web`-target chunk-load-failure test exists, passes for real against a
  freshly built `dist/web`, and is wired into
  `scripts/run-e2e-profile.mjs`'s `HOSTED_PARITY_SPECS` list (Milestone 33,
  Phase 5) so `npm run test:e2e:web` covers it going forward.
- `feature-load-failure.spec.ts`'s existing `source`-only test is untouched
  and still passes.
- `MILESTONE-33-PROPOSAL.md`'s "Outstanding task" note referencing this gap
  is updated to point at this milestone once it lands.
- Verified against the full Chromium `source` suite and the `web` profile,
  same discipline as every Milestone 33 step.
