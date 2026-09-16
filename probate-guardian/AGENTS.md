# Agent Directives & Operational Rules

This is the operating contract for anyone who commits to this repository —
AI agents (Claude, Codex, Antigravity, or others) and human GitHub
contributors alike. Probate Guardian produces Florida guardianship court
filings, so data integrity and legal accuracy outweigh speed. Verify claims
against the current codebase and authoritative sources rather than
assumptions, scope changes deliberately, and defer to the requester on
product, scope, and legal-interpretation calls. This document is the default
contract for all work here; Section 2 covers deviations.

## 0. Portfolio Archetype & Tech Stack Pinning (Approach A)

This organization organizes projects across three standardized archetypes:

- **Archetype 1 (Client-Side Static PWA)**: Vanilla ES Modules, Bootstrap, Web Crypto, client-side PDF/Excel generation.
- **Archetype 2 (Python Data & Document Pipeline)**: Python 3.11+, Streamlit, PyMuPDF, OCR/LLM entity extraction, local crypto.
- **Archetype 3 (Full-Stack Containerized Web App)**: React 19/TS/Vite/Tailwind frontend, FastAPI/SQLAlchemy/Alembic backend.

### Pinned Stack for this Repository: Archetype 1 (Client-Side Static PWA)

- **Runtime & Architecture**: Client-side transitional hybrid (classic script `legacy-app.js` + ES Modules in `src/main.js` and feature modules), native browser APIs.
- **UI & Layout**: Vanilla JS + Bootstrap 5 CSS + custom styles. **No React, Vue, Svelte, or JSX.**
- **Build & Dev Tooling**: Vite (dev server & bundle preview), Node.js (scripts & tooling).
- **Testing Engine**: Vitest (unit testing) + Playwright (browser e2e specs).
- **Security & Crypto**: Web Crypto API (`SubtleCrypto` AES-GCM / PBKDF2), zero unencrypted cloud transmission.
- **Document Generation**: `pdf-lib` / `pdfjs` client-side PDF compilation, `exceljs` spreadsheets.
- **Persistence**: Local `.sav` JSON blobs (user-selectable AES-GCM encryption with password, or optional plaintext), single-source-of-truth CSV data dictionary.

### Quick Command Reference

- **Build / Dev Server**: `npm run dev`
- **Lite Unit Test**: `npx vitest run tests/unit/<spec>.spec.js`
- **Targeted E2E**: `npx playwright test tests/e2e/<spec>.spec.ts`
- **Data Model Verification**: `npm run verify:data-model`
- **Full Regression (Ask First)**: `npm test`

---

## 1. Git & Execution Discipline

- **Direct to Master**: Commit and push directly to `master`. Never create feature branches.
- **Concurrent Collaboration**: Multiple agents and collaborators may work this tree, or push to `master`, at the same time.
  - Sync with `master` before starting work.
  - Check `git status`/`git log` before editing — don't assume a change you didn't make is stale or safe to overwrite.
  - Commit only your own task's files; don't sweep in unrelated concurrent work unless asked.
  - On a rejected push, pull/merge and resolve — never force-push over someone else's work.
  - **Sub-delivery dependencies block parallelization, not just approval.** When a milestone proposal splits work across concurrent agents, check each sub-delivery's own **Relation** field before starting it alongside another agent's in-flight work — a stated prerequisite (e.g. "38D Phase 1 is the only implementation prerequisite" for 38B) usually means real file-level overlap, not just doc-ordering. Concrete precedent: Milestone 44 split 44A/44D/44B to Antigravity and 44C to Claude; 44C was confirmed blocked on 44B landing first because both touch the same four `plan-*/print.js` files in close proximity (44B converts `prepareFilingOutput()` calls, 44C removes the adjacent `planReadinessChecks*()` functions in the same render path) and 44C's design consumes 44B's typed issue categories directly. Verify the actual file lists overlap (or don't) before assuming a "wait" or "safe to parallelize" call — don't guess from the proposal text alone.
  - After another agent's sub-delivery lands, re-verify it directly (read the real diff, re-run its tests, check red/green discipline) before building on top of it or marking it done — a "Landed" status line in a proposal doc is a claim, not proof.
- **Test Execution Gate**:
  - **Lite by default**: run targeted specs selected from `TEST-INDEX.md` for what changed (e.g. `npx vitest run tests/unit/x.spec.js`, `npx playwright test tests/e2e/x.spec.ts`).
  - **Recommend, then ask, for complex changes**: before commit/push, recommend a full regression run (`npm test`) with reasons if the change is broad, cross-cutting, or touches shared/core modules — never run it without explicit go-ahead.
  - **Skip tests** for documentation-only changes.
- **Portable Paths**: Prefer repo-relative paths over absolute ones — contributors use different machines/OSes. On Windows, use forward slashes in tool/search arguments; backslashes can be misread as escapes.
- **Verify Commit Citations**: Never cite a commit SHA or reference without directly checking it via `git log`/`git rev-parse` in tool output first.

---

## 2. Choice-Driven Prompts & Case-by-Case Overrides

- **Choice-Driven Prompts**: For trade-offs, scope ambiguities, test-suite runs, schema migrations, or other deviations from baseline, present clear choice-driven options (numbered, with a recommended one) and each option's concrete implications.
- **User-Approved Overrides**: An explicit user selection overrides baseline rules for that task/session only — baseline resumes immediately after.
- **Proposal & Milestone Gating**:
  - A `MILESTONE-*-PROPOSAL.md` marked **Draft**, or stating it authorizes no change, is a proposal, not a work order.
  - Don't implement any part of it until the requester explicitly approves that specific delivery by name.
  - Approval of one sub-delivery in a split proposal (e.g. 38A/38B/38C/38D) does not authorize the others.
  - If approval status is unclear — including from another session or agent — ask before implementing.

---

## 3. Data Model & Schema Governance

- **Data Model Single Source of Truth**: Any change to persisted data shape (new/renamed field, min/max count, default, enum domain) must update `probate-guardian-data-model.csv` in the same commit, and pass `npm run verify:data-model`.
- **Non-Destructive Toggling**: Hiding a section or unchecking a toggle (e.g. advance directives, co-guardians) must never delete entered data — re-checking must restore it. Deletions require an explicit user action.
- **Explicit Tristate Binary Values**: Binary fields store `''` (unanswered), `'Yes'`, or `'No'`. Never default or coerce an unanswered field to `'No'`, at any stage.
- **Collection Sizing & Shape Factories**:
  - Guardian signature cards default to 1 (`initial_item_count: 1`) with explicit Add/Remove for co-guardians.
  - Advance directive detail cards default to 0 (`initial_item_count: 0`), rendering only when the execution toggle is active.
  - Always use form-specific row factories; never share generic factories across forms with differing schemas.

---

## 4. Readiness vs. Export Validation Invariant

- **The Parity Invariant**:
  - Every `auto` readiness item must map 1-to-1 to an export validation error.
  - A filing that passes export validation must never be blocked in the readiness panel.
- **Strict `auto` vs. `manual` Separation**:
  - `auto`: machine-verifiable data blockers (missing required fields, bad date order, incomplete grids).
  - `manual`: unobservable procedural duties (attaching physical reports, serving parties, paying fees) — non-blocking, must never trigger `auto: false` or halt export.
- **Pro Se Protection**: Never make attorney certification fields mandatory blockers on unrepresented or Chapter 393 Guardian Advocate filings. Skip attorney validation if no attorney is entered.
- **Bypassable Output Acknowledgement**:
  - After an affirmative override, court output generates faithfully — no draft watermarks, filename changes, or degraded formatting. Validation issues stay visible in the UI.
  - Non-bypassable issues (data-integrity conflicts, format-capacity overflow, generation failures) are never overridden.

---

## 5. Legal Hierarchy & County Policy Gating

- **Authority Hierarchy**: Florida Statutes & Probate Rules > Circuit Administrative Orders > Clerk Workslips (`GD*.docx` internal audit guidelines).
- **County Gating**: Circuit-specific requirements (e.g. 6th Circuit AO 2024-025 Disaster Plan, local service rules) gate via `src/core/filing/county-guidance.js` (Pinellas/Pasco only) — never shown as mandatory statewide requirements for other counties.

---

## 6. UI, DOM & Event Handling

- **Form Event Binding (`data-form-path`)**:
  - Text/date/select inputs read `event.target.value`; checkboxes read boolean `event.target.checked` (or tri-state string).
  - Binary radio pairs write string `'Yes'`/`'No'` and must be wrapped in semantic `<fieldset>`/`<legend>`.
- **Dynamic Array Re-indexing**: Deleting an item requires a full DOM re-render of the card container to prevent stale `data-form-path` index bindings (e.g. `guardians.2.name` shifting to `guardians.1.name`). Deleting a guardian must cleanly unlink its `partyId`.
- **Case Resolution Fallback**: Centralize case identification through `src/core/case-resolver.js`. For Plan Minor, always fall back across `ward.ucn || ward.ref || ''`.
- **Vocabulary — `ward` means filing**: in code, `caseFile.wards[]`, `wardId`, `activeWardId`, `activateWard`, `switchWard`, `unloadWard` and the like refer to **one filing instance**, for historical reasons predating the Party model. The person is a `Party` (`src/core/party-resolver.js`; the ward's canonical county lives on that Party per Milestone 40C-1). New code should prefer `filing` terminology where practical (a new `filingId` parameter over a new `wardId` one; a Tier 2 "Ward Demographics Card" describes the Party) without renaming existing identifiers at sites not otherwise being touched.

---

## 7. Test Suite & Index Governance

- **Test Index Sync (`TEST-INDEX.md`)**: Whenever you add, delete, rename, repurpose, or rescope a test file, update `TEST-INDEX.md` in the same commit.

---

## 8. Milestone & Feature Planning: Cross-Cutting Ramifications

A `MILESTONE-*-PROPOSAL.md` (or any feature plan) must address the items
below before it's treated as ready to execute — a plan silent on these
isn't finished; find the answer while scoping, don't leave it for
implementation or review to discover.

- **Data Model**: Does this add, rename, or reshape persisted data? Name the exact `probate-guardian-data-model.csv` rows needed (Section 3), and check whether the collection they belong to is already fully expanded — one summary row does not mean it is.
- **Legacy Data Migration**: Does this touch data that could already exist in a `.sav` file? State the migration/inference rule explicitly — a missing new field must never silently resolve to a value less complete than what already existed under today's rules.
- **Test Coverage & Index**: Name the actual new or changed test files the plan implies, not just "add coverage," and track the resulting `TEST-INDEX.md` update (Section 7) as part of the plan itself.
- **Export/Import/Portability**: Does this interact with any existing export, import, or backup path (single-ward export, full case export, PDF/Excel export)? Check that path's actual code rather than assuming it carries new data along for free.
- **Security & Sensitivity**: New stored data needs an explicit sensitivity classification and a stated threat model — what it actually protects against, and what it doesn't — never implying a stronger guarantee than the mechanism provides.
- **UI/UX Consistency**: Prefer this app's existing patterns (card layout, label conventions, accessibility structure) over inventing a new one, and name the pattern being reused.
- **Legal/Compliance Framing**: Never assert or resolve a legal-sufficiency question in a planning document — flag it for a qualified person to check, and be precise about what this app's own validation does and does not guarantee.

---

## 9. Form Architecture & 3-Tier Target Composition

When scaffolding new forms or executing authorized milestone refactors, adhere to a 3-tier hierarchical component target:

```text
Tier 1: Atomic Field Primitives (types, masks, formatting, validation attributes)
   ↓
Tier 2: Centrally Managed Card Templates (identity, case header, attorney, demographics)
   ↓
Tier 3: Declarative Form Composition (pages assemble sequences of cards)
```

- **Tier 1 (Field Primitives)**: Centralize atomic field renderers (text, date, currency, phone, masked SSN/EIN, tri-state radios) in `src/core/form/form-fields.js`. Prefer canonical primitives for new fields over writing raw, unadorned `<input>` tags.
- **Tier 2 (Card Templates)**: Centralize common structural sections (e.g. Case Caption, Ward Demographics, Guardian & Attorney Information) as reusable card components consuming Tier 1 primitives.
  - *Collection Grid Boundary*: Collection cards with divergent statutory schemas (e.g. accounting asset schedules vs. plan residence logs) must use **form-specific row factories** (Section 3) to prevent cross-form schema bleeding.
- **Tier 3 (Form Composition)**: Form pages act as declarative orchestrators composing card templates and form-specific collections, keeping lifecycle logic (mount/dispose/nav) separate from DOM markup generation.
- **Scope & Legacy Maintenance**: Existing forms contain legacy markup and specialized controls (e.g. `Plan Annual`, `Guardian Inventory`). Localized bug fixes and maintenance tasks to existing form views must not be blocked by, nor forced into, an unauthorized whole-form 3-tier refactor.

---

## 10. UI Styling & Design System Governance

- **Authoritative Styles**: `src/styles/` (`tokens.css`, `cards.css`, `shell.css`) is the authoritative source of truth for this repository's design system. (The `templates/ui-starter/` greenfield-starter kit this line used to point to was removed in Milestone 42H -- it had no runtime reference and was shipping in every build for no reason. Reach for another portfolio project's starter kit directly if one is needed again.)
- **Design Tokens**: Standardize UI colors on semantic CSS variables (`--brand`, `--ink`, `--surface`, `--line`, `--field`). Avoid arbitrary hardcoded hex values in component stylesheets.
  - *Allowed Exceptions*: Token definitions themselves, vendor styles, print/court-document output styles (which remain intentionally hardcoded for print fidelity), embedded SVG assets, and high-contrast accessibility overrides.
- **Dark/Light Theme Engine**: Support both Light and Dark modes using `tokens.css`. Use a synchronous `<head>` pre-paint script (`src/prepaint.js`) to avoid theme flash (FOUC) on startup.
- **UI Preference Persistence**: Theme and other pure UI-only display preferences (not case/filing data) belong in `localStorage`, never in `.sav`/case state — they carry nothing sensitive and must be readable synchronously before first paint, which an encrypted or async-loaded case file cannot guarantee. Theme follows this since Milestone 40D (`src/core/theme-preference.js`, key `pg-theme-v1`, read by `src/prepaint.js`).
- **Iconography**: Use the lightweight SVG icon system (`icons.js` / `ic(name, size)`). When using icons inside interactive controls (`<button>`, `<a>`), always supply an accessible name via `aria-label`, `title`, or visible text.
- **Card & Summary Anatomy**: Use standardized `.entry-card` and `.summary-box` classes with scoped container queries (`cards.css`) for consistent multi-column responsive layout across screens.

## 11. Packaging for External Hosting (DNN & Similar)

When the requester needs an installable package for a site they control
outside this repo's own hosting (e.g. uploading to a DNN/DotNetNuke portal,
or any host that serves this app from an arbitrary subfolder rather than its
own domain root), use the **portable** build, not the web build:

1. **Build it**: `npm run build` (builds both `dist/web` and `dist/portable`;
   `npm run build:portable` alone is enough if only the package is needed).
   `dist/web` is unsuitable for this purpose — `vite.config.js` hardcodes its
   `base` to `/probate-guardian/`, so it only works mounted at exactly that
   path. `dist/portable` uses a relative `base: './'`, so it works from any
   folder a host puts it in. See `vite.config.js`'s top-of-file comment for
   the full web-vs-portable rationale; treat that file as authoritative if
   this section and the code ever disagree.
2. **Don't hand-pick files.** `dist/portable`'s contents are not fixed — Vite
   content-hashes several filenames (`icon-192-<hash>.png`,
   `manifest-<hash>.json`, the inlined bundle, etc.) and `vite.config.js`'s
   `STATIC_COPY_TARGETS` list (what gets copied verbatim: `lib/`, `icons/`,
   `fragments/`, `help/`, `src/legacy-app.js`, `src/prepaint.js`, manifest,
   service worker) can gain or lose entries as the app evolves. Always zip
   whatever `dist/portable` actually contains after a fresh build — never
   reuse a file list or hashed filename from a previous package.
3. **Zip the folder's *contents*, not the folder itself** — DNN (and most
   static hosts) expect `index.html` at the root of the uploaded package, not
   nested inside a `portable/` subfolder. On Windows, PowerShell's
   `Compress-Archive` is more reliable for this than whatever `zip`/`7z`
   happens to be on `PATH` (this machine's `zip` is a broken legacy build —
   verify any zip tool actually recursed into subdirectories before trusting
   it):
   ```powershell
   Compress-Archive -Path "dist\portable\*" -DestinationPath "<output>.zip" -Force
   ```
4. **Verify before delivering.** Smoke-test the freshly built
   `dist/portable/index.html` (it's designed to run via `file://`, matching
   how a static host serves it) for console/page errors before zipping —
   a throwaway Playwright script opening the file and checking
   `page.on('pageerror'/'console')` for errors is enough; delete it after.
   Confirm the zip actually contains the subdirectories (`lib/`, `icons/`,
   `fragments/`, `help/`, `src/`), not just top-level files, before treating
   the package as done.
