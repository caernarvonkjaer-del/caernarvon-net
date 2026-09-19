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

- `index.html` — the shell (sidebar, overlays, CSP). Loads `src/legacy-app.js`
  as a classic script, then `src/main.js` as the ES-module entry.
- `src/legacy-app.js` — the remaining classic-script core (help system,
  validation summary, ward lifecycle glue, the Guardian Inventory form
  engine, init). It publishes functions on `window`; modules reach it the
  same way. Milestone 42's `scripts/audit-window-bridge.mjs` inventories
  that bridge.
- `src/core/` — ES modules: state, persistence (`case-file.js`, crypto,
  recovery cache), navigation (router, ward lifecycle, ward county), form
  contract and field primitives, validation, PDF engine and preview, Excel
  engine, filing descriptors and readiness.
- `src/features/<filing>/` — one lazily-loaded module per filing type
  (`index.js` pages/nav/validate, `pdf-model.js`, `print.js`, `excel.js`
  where applicable), loaded through `src/features-loader.js`.
- `src/styles/` — design tokens and component styles (`tokens.css` is the
  source of truth for colors).
- `lib/` — vendored runtime libraries; see `lib/VENDORED-LIBRARIES.md`.
- `probate-guardian-data-model.csv` — the persisted-field dictionary,
  checked by `npm run verify:data-model`.
- `MILESTONE-*-PROPOSAL.md` — planning and delivery records; `TEST-INDEX.md`
  — one row per spec file.

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
npm test             # full unit + e2e regression -- ask before running
```

Playwright runs against one of four targets (`PG_TARGET=source|dev|web|portable`);
`playwright.config.ts` explains each. CI runs the source suite plus a
security/route matrix across the release targets.
