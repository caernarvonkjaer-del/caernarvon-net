# Milestone 34: Distribution-Target Failure-Mode Coverage

## Status

**Implemented; the added test is verified.** The web-mode
chunk-load-failure test has been written (`tests/e2e/feature-load-failure.spec.ts`)
and wired into `scripts/run-e2e-profile.mjs`'s `HOSTED_PARITY_SPECS`, per the
Proposed Approach and Acceptance Criteria below. On 2026-09-10, it was run
for real against a freshly built `dist/web` (`npm run build:web`):
`PG_TARGET=web PG_BROWSER=chromium npx playwright test
tests/e2e/feature-load-failure.spec.ts` passed (the `web`-mode test ran and
passed; the existing `source`-only test correctly skipped), and
`PG_TARGET=source PG_BROWSER=chromium npx playwright test
tests/e2e/feature-load-failure.spec.ts` also passed (the `source`-only test
unchanged and passing; the new `web`-mode test correctly skipped). That
confirms the added test itself is genuine and the existing test is
untouched, per this milestone's own Acceptance Criteria and Non-Negotiable
#3.

This was a targeted run of the one changed spec file against both targets,
not the full suites. Milestone 37-2 originally called for a full
`npm run test:e2e:web` (the whole `HOSTED_PARITY_SPECS` set) and a full
`npm run test:e2e:source` (the entire `tests/e2e/` suite) before recording
that milestone's own closeout; the requester explicitly accepted this
narrower, single-spec-file verification in place of that fuller run
(2026-09-10) and closed 37-2 on that basis — see
`MILESTONE-37-PROPOSAL.md`'s 37-2 section for that record. The full-suite
run itself has still never been performed. This document holds the first
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

1. **Chunk selection must be manifest-driven.** Do not treat the
   `dashboard-*.js` basename as a Vite/Rollup contract. Read the generated
   dashboard chunk URL from `dist/web/sw.js`'s `PRECACHE_MANIFEST` (or another
   generated build manifest with the same authoritative URL), assert that
   exactly one dashboard candidate is found, and register the route against
   that exact URL. A basename glob may be used only as a diagnostic fallback,
   never as the acceptance path; it must also assert exactly one candidate.
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
   fills in) rather than assumed. Before the dashboard import, the test must
   prove that the page is not already controlled by a service worker.
   Playwright routing is not assumed to intercept requests already handled by
   a controlling service worker, and page code cannot patch the service
   worker's global `fetch`. If a fresh uncontrolled page cannot provide a
   reliable interception point, use a separate Playwright context configured
   with `serviceWorkers: 'block'`, and document why that context still
   exercises the generated hosted `dist/web` build. Do not use an in-page
   service-worker-fetch interception fallback.

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
   the default state `freshStartNoPassword()` already produces), reads the
   dashboard chunk URL from the generated manifest, asserts exactly one
   dashboard candidate, routes that exact built URL to abort, then navigates
   to `/dashboard`.
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

## Related, Out-of-Scope Work

Two related planning documents were split out of this file on 2026-09-09 so
this document could stay scoped to the web-mode chunk-load-failure test
above — neither expands or gates Milestone 34's own scope:

- `MILESTONE-34-1-PROPOSAL.md` — a follow-on bug-correction plan (validation
  contracts, shared PDF rendering fixes, filing-specific output semantics,
  and supplemental-document/evidence-dependent findings) from a browser
  review, unrelated to distribution-target test coverage.
- `MILESTONE-34-2-PROPOSAL.md` — data-model documentation remediation
  (`DATA-MODEL-REMEDIATION-PLAN.md` / `probate-guardian-data-model.csv`
  harmonization), documentation-only, unrelated to this test.
