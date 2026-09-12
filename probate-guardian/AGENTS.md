# Agent Directives & Operational Rules

This is the operating contract for anyone who commits to this repository —
AI agents (Claude, Codex, Antigravity, or others) and human GitHub
contributors alike. Probate Guardian produces Florida guardianship court
filings, so data integrity and legal accuracy outweigh speed. Verify claims
against the current codebase and authoritative sources rather than
assumptions, scope changes deliberately, and defer to the requester on
product, scope, and legal-interpretation calls. This document is the default
contract for all work here; Section 2 covers deviations.

## 1. Git & Execution Discipline

- **Direct to Master**: Commit and push directly to `master`. Never create feature branches.
- **Concurrent Collaboration**: Multiple agents and collaborators may work this tree, or push to `master`, at the same time.
  - Sync with `master` before starting work.
  - Check `git status`/`git log` before editing — don't assume a change you didn't make is stale or safe to overwrite.
  - Commit only your own task's files; don't sweep in unrelated concurrent work unless asked.
  - On a rejected push, pull/merge and resolve — never force-push over someone else's work.
- **Test Execution Gate**:
  - **Lite by default**: run targeted specs selected from `TEST-INDEX.md` for what changed (e.g. `npx vitest run tests/unit/x.spec.js`, `npx playwright test tests/e2e/x.spec.ts`).
  - **Recommend, then ask, for complex changes**: before commit/push, recommend a full regression run (`npm test`) with reasons if the change is broad, cross-cutting, or touches shared/core modules — never run it without explicit go-ahead.
  - **Skip tests** for documentation-only changes.
- **Portable Paths**: Prefer repo-relative paths over absolute ones — contributors use different machines/OSes. On Windows, use forward slashes in tool/search arguments; backslashes can be misread as escapes.

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
- **Export/Import/Portability**: Does this interact with any existing export, import, or backup path (single-ward export, full case export, DOCX/Excel export)? Check that path's actual code rather than assuming it carries new data along for free.
- **Security & Sensitivity**: New stored data needs an explicit sensitivity classification and a stated threat model — what it actually protects against, and what it doesn't — never implying a stronger guarantee than the mechanism provides.
- **UI/UX Consistency**: Prefer this app's existing patterns (card layout, label conventions, accessibility structure) over inventing a new one, and name the pattern being reused.
- **Legal/Compliance Framing**: Never assert or resolve a legal-sufficiency question in a planning document — flag it for a qualified person to check, and be precise about what this app's own validation does and does not guarantee.
