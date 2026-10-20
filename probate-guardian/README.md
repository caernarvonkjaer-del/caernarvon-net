# Probate Guardian

A client-side web app that prepares Florida guardianship court filings —
Verified Initial Inventory, Annual/Final/Trust Accounting, Simplified Annual
Accounting, and the Initial, Annual, Simplified, and Minor guardianship
plans — as court-ready PDFs and, where the clerk provides one, the official
Excel template. Everything runs in the browser: case data is saved to a
local `.sav` file (AES-GCM encrypted with a password, or optionally plain),
and nothing is transmitted anywhere.

`AGENTS.md` is the operating contract for anyone committing here — read it
first. This file is only orientation.

## Layout

- `index.html` — the shell (sidebar, overlays, CSP). Loads `src/prepaint.js`,
  a classic script that sets the theme before the first paint, then
  `src/main.js` as the ES-module entry.
- `src/main.js` — the composition root: installs `window.GuardianForms` (the
  one global the app owns: `version`, and `testing` only when the browser
  suite asks for it before startup), wires the page's listeners, and hands the
  feature services to `startGuardianForms()` (`src/core/startup/bootstrap.js`).
  Modules reach each other by import; nothing else of the app is on `window`,
  and `scripts/audit-window-bridge.mjs` holds it there. (Milestone 70 moved
  the last of the classic `legacy-app.js` into modules and deleted it.)
- `src/core/` — ES modules: the case store (`state.js`), persistence
  (`case-file.js`, `case-reader.js`, crypto, recovery cache), navigation
  (router, ward lifecycle, ward county), startup, form contract and field
  primitives, validation, completion (`status/`), the filing registry and
  blank filings (`filing/`), PDF engine and preview, Excel engine, help,
  shell, icons (`ui/icons.js`), money formatting (`format/money.js`) and
  import hardening (`security/input-hardening.js`).
- `src/features/<filing>/` — one lazily-loaded module per filing type
  (`index.js` pages/nav/validate, `pdf-model.js`, `print.js`, `excel.js`
  where applicable), loaded through `src/features-loader.js`'s feature
  services only when one of its pages is shown.
- `src/styles/` — design tokens and component styles (`tokens.css` is the
  source of truth for colors).
- `lib/` — vendored runtime libraries; see `lib/VENDORED-LIBRARIES.md`.
- `probate-guardian-data-model.csv` — the persisted-field dictionary,
  checked by `npm run verify:data-model`.
- `MILESTONE-*-PROPOSAL.md` — planning and delivery records; once past, each
  moves verbatim into `MILESTONE-ARCHIVE.md` (through Milestone 76, with the
  test-suite review `TEST-SCRIPT-REVIEW.md` and its remediation plan
  `TEST-REVIEW.md`); `TEST-INDEX.md` — one row per spec file.

## Run

```sh
npm install
npm run dev          # Vite dev server
npm run build        # dist/web (hosted, chunked, PWA) and dist/portable (file://)
```

## Test

Lite by default (see `AGENTS.md` §2):

```sh
npx vitest run tests/unit/<spec>.spec.js
npx playwright test tests/e2e/<spec>.spec.ts
npm run verify:data-model
npm run test:quick   # unit + four browser smoke specs, source/Chromium
npm test             # full unit + e2e regression -- ask before running
```

Playwright runs against one of five targets
(`PG_TARGET=source|dev|web|portable|portable-http`); `playwright.config.ts`
explains each. `npm test`, `test:quick` and the `test:e2e:*` profiles set the
target and browser themselves (`scripts/run-e2e-profile.mjs`), so a value left
in the shell cannot change what they run, and each refuses to start while the
port its server needs is held by another process. The profiles' values
(target, browser, build, which curated list, the release's order) are
`scripts/test-profiles.mjs`'s and the curated spec lists
`tests/profile-manifest.json`'s (TEST-REVIEW.md Delivery 4); the source
profile is the whole suite and lists nothing.

Every push to master that touches `probate-guardian/` runs a lightweight
check on GitHub Actions (`.github/workflows/probate-guardian-tests.yml` at
the repository root; TEST-REVIEW.md Delivery 5, 2026-10-15): type check,
data model, the unit suite, both builds with the Cloudflare assembly, and
`test:quick`'s browser tier on Linux Chromium, within 15 minutes, with the
Playwright report and `test-results` kept 14 days as an artifact. The whole
source suite runs there only when someone with write access starts it from
the Actions tab (choose `source`; 120-minute limit). The release gate
(`npm run test:release`) runs on the workstation only. A green check is
Linux Chromium on GitHub's runner, not the full regression `AGENTS.md` §2
governs. The first run (2026-10-15) took 5 min 24 s.
