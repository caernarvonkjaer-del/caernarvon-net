# Agent Directives & Operational Rules

Operating contract for anyone who commits here — AI agents (Claude, Codex,
Antigravity, others) and human contributors alike. Probate Guardian produces
Florida guardianship court filings: **data integrity and legal accuracy
outweigh speed.** Verify claims against the current codebase and
authoritative sources, never assumptions — including a subagent's or
reviewer's findings, and your own prior conclusions once new information
surfaces. Scope changes deliberately; defer to the requester on product,
scope, and legal-interpretation calls. This is the default contract; §3
covers deviations.

---

## 1. Quick Command & Tech Stack Reference

| Task | Command |
| --- | --- |
| Dev server | `npm run dev` |
| Targeted unit spec | `npx vitest run tests/unit/<spec>.spec.js` |
| Targeted e2e spec | `npx playwright test tests/e2e/<spec>.spec.ts` |
| Type check (scoped — see §2) | `npm run check:types` |
| Data model verification | `npm run verify:data-model` |
| Portable-build e2e (packaging changes, §9) | `npm run test:e2e:portable` |
| **Full regression — ask first (§2)** | `npm test` |

### Verification tiers (Milestone 59D)

Four non-overlapping tiers. Each stops at the first failed step and exits
non-zero, so a later stage never runs against a broken prerequisite.

| Tier | Runs | Target / browser | Cost | Gate? |
| --- | --- | --- | --- | --- |
| `npm run test:quick` | all unit specs + 4 browser smoke specs (startup, form-entry.contract, routes, readiness-card.contract) | source / chromium | ~2.2 min | **No** — convenience only |
| `npm test` | all unit specs + the complete source E2E suite | source / chromium | ~25.7 min | Full regression — **ask first (§2)** |
| `npm run test:verify` | `check:types` → `verify:data-model` → `npm test` | source / chromium | ~26 min | Full regression — **ask first (§2)** |
| `npm run test:release` | `check:types` → `verify:data-model` → unit → `test:e2e:all-profiles` | source, web, portable / chromium + firefox, webkit, edge | longest | **Yes** — release gate |

- **`npm test` is unchanged and stays unchanged.** It is the full regression
  §2 governs. `test:quick` is not a substitute for it and is not a merge gate:
  it runs 60 of the suite's 678 browser tests.
- **`test:release` deliberately does not compose `test:verify` or `npm test`.**
  `test:e2e:all-profiles` already runs the complete source profile, so
  composing either would run the entire source suite twice. It also builds web
  and portable inside their own profile steps — do not prepend `npm run build`.
- Both full-regression tiers (`npm test`, `npm run test:verify`) need explicit
  go-ahead per §2. `test:quick` does not.
- Timings are from `tests/baseline/milestone-59-runtime.json`, measured
  2026-09-19 on one workstation; re-measure rather than trusting them.

**Stack (Archetype 1 — Client-Side Static PWA, pinned for this repo):**
Vanilla ES Modules + classic script hybrid (`legacy-app.js` + `src/main.js`
and feature modules) · Bootstrap 5 CSS, no framework (**no React/Vue/Svelte/
JSX**) · Vite (dev/build) · Vitest (unit) + Playwright (e2e) · TypeScript
(`tsc --noEmit`, checked scope only — §2) · Web Crypto (`SubtleCrypto`
AES-GCM/PBKDF2), zero unencrypted cloud transmission · `pdf-lib`/`pdfjs` and
`exceljs` for court output · local `.sav` JSON persistence (optional
password encryption), `probate-guardian-data-model.csv` as schema
single-source-of-truth.

### Verified executable paths

Windows workstation, verified **2026-09-19**. Every path below was confirmed
to exist on disk, not inferred from configuration. Browser resolution was
confirmed by evaluating `playwright.config.ts` itself
(`node --input-type=module -e "(await import('./playwright.config.ts')).default"`)
and cross-checked against `npx playwright install --dry-run`, which reports
Playwright's own expected install locations.

**Toolchain:**

| Tool | Path | Version |
| --- | --- | --- |
| node | `E:\Program Files\nodejs\node.exe` | 24.16.0 |
| npm / npx | `E:\Program Files\nodejs\npm.ps1`, `npx.ps1` | 11.13.0 |
| git | `D:\Program Files\Git\cmd\git.exe` | 2.55.0.windows.3 |
| playwright | `node_modules\.bin\playwright.cmd` | 1.62.1 |
| vite | `node_modules\.bin\vite.cmd` | 8.2.2 |
| vitest | `node_modules\.bin\vitest.cmd` | 4.1.11 |
| tsc | `node_modules\.bin\tsc.cmd` | 7.0.2 |

`vite`, `vitest` and `tsc` are **project-local only** — none is on `PATH`, so
they are reachable through `npx`/`npm run`, never as a bare command.

**Browsers** — bundled ones all under
`C:\Users\No Name\AppData\Local\ms-playwright\` (`PLAYWRIGHT_BROWSERS_PATH` is
unset, so this is the `%LOCALAPPDATA%` default):

| Project | Executable | Version |
| --- | --- | --- |
| `chromium` (default) | `chromium_headless_shell-1234\chrome-headless-shell-win64\chrome-headless-shell.exe` | 151.0.7922.34 |
| — full Chromium | `chromium-1234\chrome-win64\chrome.exe` | 151.0.7922.34 |
| `firefox` | `firefox-1538\firefox\firefox.exe` | 153.0 |
| `webkit` | `webkit-2336\Playwright.exe` | 26.5 |
| `edge` (`channel: 'msedge'`) | `C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe` | 153.0.4234.32 |
| system Chrome (no project uses it by default) | `C:\Program Files\Google\Chrome\Application\chrome.exe` | 151.0.7922.176 |

The default `chromium` project resolves to the **headless shell**, not
`chrome.exe` — `defaultChromiumExecutablePath()` lists the headless shell
first and returns the first candidate that exists. A stack trace or crash
naming `chrome-headless-shell.exe` is therefore the normal e2e browser, not a
misconfiguration. The `edge` project carries no `executablePath`; `channel:
'msedge'` means Playwright launches the **system** Edge above, so an Edge
upgrade changes the browser under test without any repo change.

Both system browsers are confirmed **launchable**, not merely present:
Playwright drove system Chrome through the 41 targeted Milestone 59A browser
tests, and launched system Edge in a headless smoke check.

**Corrections — three earlier claims in this section were wrong and were
removed. Do not reinstate them:**

- *"None of the bundled Chromium/Firefox/WebKit files exists."* They all
  exist, and have since **2026-08-30** (install-directory creation and write
  times) — three weeks before the claim was written, so this was never a
  case of the tree changing underneath it.
- *"An unqualified `npx playwright test` fails with `ENOENT`, so
  `PG_CHROMIUM_EXECUTABLE_PATH` must be set."* It does not. The 2026-09-19
  full `npm test` (665 e2e passed, 6 skipped, 25.6m) ran with no `PG_*`
  variable set at all. The override still exists in `playwright.config.ts` and
  still works — it is an escape hatch for pinning a different browser, not a
  prerequisite.
- *"PowerShell execution policy blocks the `npm.ps1`/`npx.ps1` shims."* It
  does not. Verified under the machine's own policy
  (`pwsh -NoProfile -ExecutionPolicy RemoteSigned`); `CurrentUser` and
  `LocalMachine` are both `RemoteSigned`. `npm.cmd`/`npx.cmd` remain harmless
  as a fallback but are not required.

General lesson, and the reason each correction above cites its evidence: a
path printed by a resolver is a *prediction* of where a file would be, not
proof that it is there. `chromium.executablePath()` returns its path whether
or not the binary was ever downloaded. Confirm with an existence check.

**Test-time network:** none. Every browser library is vendored in `lib/`
(`exceljs.min.js`, `html2pdf.bundle.min.js`, `pdf-lib.esm.js`, `jszip.min.js`,
`bootstrap.bundle.min.js`), and the e2e web server is local
(`npx vite preview --outDir . --port 4321 --strictPort` → `http://localhost:4321/index.html`).

**Python** (§2's rule, with its reason confirmed): `py` → `C:\Windows\py.exe`
and `python` → `C:\Program Files\Python314\python.exe`, both Python 3.14.5.
`python3` resolves to `...\WindowsApps\python3.exe`, a **0-byte Microsoft
Store alias stub** — exactly why `python3` must never be used on this machine.

These paths and versions are machine-specific evidence, not portable
repository defaults; re-verify them after any browser, Node, or Playwright
upgrade, and confirm each path on disk rather than trusting this table.

This org also runs Archetype 2 (Python 3.11+/Streamlit/PyMuPDF data
pipelines) and Archetype 3 (React/FastAPI full-stack) projects elsewhere —
irrelevant to this repo's code, but relevant to §2's Python note if you ever
touch Archetype 2 tooling from this machine.

---

## 2. Git, Concurrency & Execution Discipline

- **Direct to master.** Commit and push directly; never create feature branches.
- **Concurrent tree.** Multiple agents/collaborators may edit or push at the same time.
  - Sync with `master` before starting; `git status`/`git log` before editing — a change you didn't make is not stale by default.
  - Commit **only your own task's files**; never sweep in unrelated concurrent work.
  - Rejected push → pull/merge and resolve; never force-push over someone else's work.
  - **A stated sub-delivery prerequisite usually means real file overlap, not doc-ordering** — verify the actual file lists before assuming "safe to parallelize." (Precedent: Milestone 44's 44C was genuinely blocked on 44B because both touched the same `plan-*/print.js` files and 44C consumed 44B's typed issue categories directly.)
  - A "Landed" status line in a proposal doc is a claim, not proof — re-read the diff and re-run its tests before building on it.
- **Test execution gate:**
  - **Lite by default** — targeted specs from `TEST-INDEX.md` for what changed.
  - **Type check when in scope** — run `check:types` if the change touches `src/core/types/`, `src/core/persistence/`, `src/core/navigation/`, or any `tests/e2e/support/*.ts` file (`tsconfig.json`'s real `include` list — not the whole repo). A file outside that list can still get pulled in transitively (an included file importing it); if so and it was never written with types in mind, add `// @ts-nocheck` with a one-line reason rather than retrofitting JSDoc nobody asked for (see §10, P5).
  - **Red-first verification, required for bug fixes** — `git stash push -- <changed file(s)>`, rerun the new/target test, confirm it fails for the *stated* reason (not just "fails"), `git stash pop`, rerun and confirm green. A test never seen failing for the right reason is unverified — it can't tell a real fix from a vacuous assertion.
  - **Full regression needs explicit go-ahead** — recommend `npm test` (with reasons) for broad/cross-cutting/shared-module changes; never run it unprompted. Packaging-relevant changes (§9) should specifically recommend `npm run test:e2e:portable`, which the default targeted pass never exercises.
  - **Skip tests** for documentation-only changes.
- **Portable paths.** Prefer repo-relative paths. On Windows, forward slashes in tool/search args — backslashes can be misread as escapes.
- **Python on Windows: use `python` or `py`, never `python3`.** `python3` resolves to a Microsoft Store alias stub — a real file, so `PATH` lookups (`shutil.which`, `where`) report it as found, but running it just prints an install nag and exits non-zero (see §10, P4). Doesn't apply to Linux/macOS end-user docs (`HOW-TO-RUN.txt`), where `python3` is correct. General lesson: a `PATH` hit is never proof an executable works — applies to any future interpreter-detection logic too.
- **Commit messages** state what changed, the observable reason (§3's "lead with impact" rule applies here too), and the verification evidence (tests run, red-first result) — not just a summary of the diff.
- **Verify commit citations** — never cite a SHA without checking it via `git log`/`git rev-parse` first.

---

## 3. Decision Gating & Communication Rules

**Choice-driven prompts.** For trade-offs, scope ambiguity, test-suite scope, schema migrations, or any deviation from baseline: numbered options, one recommended, each with its concrete implication stated as what the requester/filer would *observe* (see "Lead with impact," below) — not as a mechanism.

- **Ask the instant a decision surfaces — mid-execution counts.** Don't carry it to a summary, bury it in prose, or silently pick the plausible option. A decision surfaced late has usually already been made by the work built on top of it.
- **Re-ask an already-answered decision if its cost changed.** An answer was only ever valid against the trade-off it was given for.
- **Blocking → stop and say so.** Non-blocking → keep working, but still ask immediately.
- Prose describing options is not a choice-prompt; use the numbered/recommended/consequence form.

**Milestone & proposal draft gating.**

- A `MILESTONE-*-PROPOSAL.md` marked **Draft**, or stating it authorizes no change, is a proposal — not a work order.
- Never implement any part without the requester's explicit named approval of that specific delivery.
- Approving one sub-delivery of a split proposal (e.g. 38A/B/C/D) authorizes only that one.
- Approval status unclear (including from another session/agent) → ask before implementing.

**User-approved overrides** apply for that task/session only; baseline resumes immediately after.

**Explaining defects, fixes & decisions — lead with what a filer observes, then the mechanism.** A fix described only in property/selector/function names doesn't tell the reader whether it matters or what it costs a real user. This is not a request for *less* detail — for depth, keep going; just put the stakes first.

> **Badly formed:** "`.highlightEditor` sets `pointer-events: none` so a highlight doesn't intercept clicks on the page beneath it — and a child toolbar inherits that. Added `pointer-events: auto`."
> The requester's actual response: *"this means almost nothing to me"* — correctly; every noun is an implementation detail.
>
> **Correctly formed:** "When you select a highlight, a small toolbar appears beside it with a color swatch and a delete button. Highlights ignore mouse clicks so that clicking highlighted text still reaches the page underneath — the toolbar inherits that. The toolbar would have looked right and done nothing when clicked: a delete button that doesn't delete."

In practice: open with one sentence a non-engineer could act on (*what breaks, for whom, when*). A verdict ("incomplete/unsafe conversion") is not an explanation — name the symptom. An invariant ("this must never gate export") is not an explanation either — say "a guardian who entered a bank account but hasn't attached a statement can still file." Prefer numbers to adjectives ("~450px" beats "a layout problem"). If a sentence would read identically to someone who's never used this app, it's mechanism-only — rewrite it.

---

## 4. Data Model, Tri-State & Schema Governance

- **Single source of truth**: any persisted-shape change (new/renamed field, min/max count, default, enum domain) updates `probate-guardian-data-model.csv` in the same commit and passes `npm run verify:data-model`.
- **Non-destructive toggling**: hiding a section / unchecking a toggle never deletes entered data — re-checking restores it. Deletion requires an explicit user action.
- **Tri-state, never coerced**: binary fields store `''` (unanswered) / `'Yes'` / `'No'`. Never default or coerce unanswered → `'No'`, at any stage.
- **Collection factories**: guardian cards default to 1 (`initial_item_count: 1`, explicit Add/Remove for co-guardians); advance-directive cards default to 0, rendering only when the execution toggle is active. Always form-specific row factories — never share generic ones across forms with differing schemas.

**Readiness vs. export validation invariant:**

- Every `auto` readiness item maps 1-to-1 to a real export validation error; a filing that passes export must never show blocked in the readiness panel.
- `auto` = machine-verifiable blockers (missing fields, bad date order, incomplete grids). `manual` = unobservable procedural duties (attaching reports, serving parties, paying fees) — non-blocking, must never flip `auto: false` or halt export.
- **Pro se / Ch. 393 Guardian Advocate protection**: never make attorney-certification fields mandatory blockers on an unrepresented filing — skip attorney validation entirely if no attorney is entered.
- **Bypassable output acknowledgement**: after an affirmative override, court output still generates faithfully (no watermark/filename/formatting degradation); issues stay visible in the UI. Non-bypassable issues (data-integrity conflicts, format-capacity overflow, generation failures) are never overridable.

**The sidebar is not the export gate, and on 14 Annual schedules it is
deliberately stricter. Do not "fix" that by tightening export.**

The invariant above governs the **readiness panel** (`readiness-config.js`).
The **sidebar nav dots** (`computeNavChecks()` in `legacy-app.js`) are a
different surface with a different job, and the two must not be conflated —
`readiness-config.js` has no per-schedule Annual items at all.

On Schedules A, B-1–B-4, C, D-1–D-5, E, F-1 and F-2, `computeNavChecks()`
marks a schedule incomplete until the filer either enters a complete row or
ticks "I verify there are no items to report". `validateAnnual()`'s
`checkRows()` requires neither: it skips rows with no data and validates only
populated ones. Twelve of those schedules go through `rowsComplete()`; `a-schc`
and `a-sche` inline the identical `length > 0 && every(...)` test, so a search
for `rowsComplete(` finds only twelve of the fourteen.

**This divergence is intentional and export is the side that is correct.** The
court's own Annual workbook contains no "no items to report" declaration
anywhere — verified by reading `templates/annual-template.js`'s shared strings,
zero matches. `scheduleNoItems` is an affordance this app invented to
distinguish "genuinely empty" from "not got to it yet". That distinction is
worth prompting for, which is why the sidebar asks; it is not something the
court requires, so export must never demand it. Requiring it to file would
block filings that are complete and valid under the court's own form.

**Part XI is the one exception, and only because a statute names it.**
§744.367(3)(a) requires the annual report to *include* a declaration of
remuneration, so Milestone 58D made both the sidebar and the export gate
require Part XI to be answered.

Before extending 58D's rule to any other schedule, find the statute or the
workbook field that demands it — and if there is none, the answer is no.

**Settled 2026-09-20 by the requester, and settled on practice rather than on
statute. The distinction is the point — do not collapse it.**

The question was whether §744.3678 requires an annual accounting to
affirmatively state that a schedule has nothing to report, or only requires
that whatever receipts, disbursements, assets and transfers exist be shown —
the same distinction §744.367(3)(a) settles for Part XI by saying the report
**must include** a declaration of remuneration.

The answer from the Clerk of the Circuit Court, Pinellas County: **the statute
is ambiguous on the point, and the office accepts blank schedules.**

So export must not demand a declaration, and the sidebar's prompt stays as a
prompt. But record why, accurately:

- **This is not "the statute permits blank schedules."** Nobody has established
  that, and this repository cannot — it holds statute *citations* (§744.3678,
  §744.3679, §744.367(3)(a)), never statutory text. Writing the permissive
  reading into a commit or comment would manufacture a legal conclusion out of
  an operational one.
- **It is county practice, and practice is county-specific.** §5 already
  forbids presenting Pinellas/Pasco circuit rules as mandatory statewide; the
  mirror applies here. A county that reads §744.3678 the other way would need
  this revisited, so do not generalise it into "blank schedules are fine" for
  every filer everywhere.
- **The ambiguity is the durable fact.** If this is ever challenged, what the
  app relies on is an accepting clerk, not a settled reading. That is worth
  knowing before anyone builds further on it.

The workbook half was independently verified and still stands on its own:
`templates/annual-template.js`'s shared strings contain no "no items to
report" declaration for any schedule, checked with a parser. The Clerk's own
instrument does not collect the thing, which is consistent with the practice
above.

So the rule above is deliberately framed as a burden of proof rather than a
finding: it does not assert that no such requirement exists, only that nobody
may act as though one does until they produce it.

In short: the sidebar asks "have you finished with this schedule?", the export
gate asks "does this satisfy the court?". Those are allowed to differ, and
here they should.

---

## 5. Court Form Authority & Calculation Rules

**Authority hierarchy**: Florida Statutes & Probate Rules > Circuit Administrative Orders > Clerk Workslips (`GD*.docx`). Circuit-specific rules (e.g. 6th Circuit AO 2024-025, local service rules) gate through `src/core/filing/county-guidance.js` (Pinellas/Pasco only) — never presented as mandatory statewide for other counties.

**The three embedded workbooks in `templates/` are not an export target — they are the Pinellas County Clerk's own instruments.** Where they define a calculation, threshold, fee, or which schedules roll into a total, that is **authoritative**. Not to be improved on, inferred around, or re-derived from statute.

- **Read the template before proposing/designing/changing any calculation.** Base64 in `templates/{annual,guardian,simplified}-template.js`; unzip and read `xl/workbook.xml`, `xl/sharedStrings.xml`, sheet XML (with a real parser — §10, P2). Milestone 57 lost hours holding items open for authority already sitting in the file: **57E-2** was deferred "pending a fee formula" that was already printed in the workbook (annual `PART II/III` rows 13-17; guardian `PART V` rows 7-9). **"Does Schedule C belong in the audit-fee base?"** — `SUMMARY I` B39 answers it directly (`=H32+H38`, Schedules A/B only). **57F** proposed writing ward name/case number onto 54 worksheets that already pull them by formula from defined names `Name_of_Ward`/`Case_Number` — the "fix" would have destroyed the propagation it meant to create.
- **Push back on, don't defer, any change that alters a calculation** — fee tiers/thresholds, which schedules feed a total (and each one's sign), bond/audit-fee bases, rounding/percentage/apportionment, anything that changes a number a filer submits. Refuse to build it until checked against the template and any divergence is disproved or consciously accepted by Alan, by name, with the reason recorded. Matching the template needs no permission; diverging from it is a **legal-accuracy defect by default**.
- **Never write into a formula cell.** The app writes inputs; the template's formulas compute totals. Overwriting one with a literal is silent — the file still opens, the number is just wrong forever after (this is how Milestone 57D became a critical regression).
- **Verify a formula survived by reading the exported file, never by re-importing it** — the importer reads by address and evaluates nothing, so it agrees with a broken exporter perfectly (§10, P2 — this is exactly how two real corruptions survived a full test suite for their entire lives).
- **When a proposal and the template disagree, the template wins** — say so plainly and correct the document.

---

## 6. UI Component Tiers, DOM & Event Handling

**3-tier form architecture** (scaffolding new forms / authorized refactors only):

```text
Tier 1  Atomic Field Primitives (types, masks, formatting, validation attrs)
   ↓
Tier 2  Centrally Managed Card Templates (identity, case header, attorney, demographics)
   ↓
Tier 3  Declarative Form Composition (pages assemble sequences of cards)
```

- **Tier 1**: centralize in `src/core/form/form-fields.js` (text, date, currency, phone, masked SSN/EIN, tri-state radios) — prefer these over raw `<input>`.
- **Tier 2**: reusable card components (Case Caption, Ward Demographics, Guardian & Attorney) consuming Tier 1. Collection cards with divergent statutory schemas (accounting schedules vs. plan residence logs) use **form-specific row factories** (§4) — never cross-form generic ones.
- **Tier 3**: pages orchestrate cards; lifecycle (mount/dispose/nav) stays separate from markup generation.
- **Legacy scope**: `Plan Annual`/`Guardian Inventory` and similar carry legacy markup — a localized fix must not be blocked by, or forced into, an unauthorized whole-form 3-tier refactor.

**DOM & event handling:**

- `data-form-path` inputs: text/date/select read `event.target.value`; checkboxes read boolean `event.target.checked` (or tri-state string); binary radio pairs write `'Yes'`/`'No'` inside a semantic `<fieldset>`/`<legend>`.
- **`data-form-action` controls should be `<button>`, not `<a href="#">`.** A real incident (§10, P3): Summary-page links rendered as anchors, the shared dispatcher called `window.navigate()` without `event.preventDefault()`, and the anchor's own `href="#"` default action fired right behind it — silently bouncing every click back to Cover. Rule: use `<button type="button">` unless the control genuinely needs to be an openable/copyable link, in which case the dispatcher must call `preventDefault()`. Corollary: a UI-affordance e2e test must drive the real click, never call the underlying `window.*` function directly — that's the only way this bug class gets caught.
- **Dynamic array re-indexing**: deleting an item needs a full re-render of the card container (stale `data-form-path` indices otherwise, e.g. `guardians.2.name` → `guardians.1.name`); deleting a guardian must cleanly unlink its `partyId`.
- **Case resolution**: centralize through `src/core/case-resolver.js`; Plan Minor always falls back `ward.ucn || ward.ref || ''`.
- **Vocabulary — `ward` means filing.** `caseFile.wards[]`, `wardId`, `activeWardId`, `activateWard`, `switchWard`, `unloadWard` all mean **one filing instance** (historical, predates the Party model). The person is a `Party` (`src/core/party-resolver.js`; canonical county lives there per Milestone 40C-1). Prefer `filing` terminology in new code without renaming untouched existing identifiers.

**Design system:**

- `src/styles/` (`tokens.css`, `cards.css`, `shell.css`) is authoritative. Semantic CSS variables (`--brand`, `--ink`, `--surface`, `--line`, `--field`) — no arbitrary hex in component stylesheets, except token definitions themselves, vendor styles, print/court-output styles (hardcoded for print fidelity), embedded SVGs, and high-contrast overrides.
- Light/Dark via `tokens.css` + a synchronous pre-paint script (`src/prepaint.js`) to avoid FOUC.
- UI-only preferences (theme, display) live in `localStorage`, never `.sav`/case state (nothing sensitive; must be synchronously readable pre-paint, which encrypted/async case state can't guarantee) — see `src/core/theme-preference.js` (`pg-theme-v1`).
- Icons via `icons.js`/`ic(name, size)`; any icon inside `<button>`/`<a>` needs an accessible name (`aria-label`, `title`, or visible text).
- `.entry-card`/`.summary-box` with `cards.css`'s container queries for consistent multi-column layout.

---

## 7. Test Suite & TEST-INDEX Governance

- **`TEST-INDEX.md` sync is mandatory, same commit**: any test file add/delete/rename/repurpose/rescope updates its row. `tests/unit/test-index-guard.spec.js` enforces this mechanically — it fails on a spec with zero rows, more than one row, or a row naming a file that no longer exists.
- **Red-first verification** (§2) is the required proof standard for any test claiming to catch a regression — a green test alone is not evidence.

---

## 8. Milestone Scoping & Cross-Cutting Checklist

A `MILESTONE-*-PROPOSAL.md` (or any feature plan) must answer these during
scoping — a plan silent on one of these isn't finished, and implementation or
review discovering the gap costs more than asking would have:

1. **Data model** — exact `probate-guardian-data-model.csv` rows needed (§4); check the collection is already fully expanded (one summary row ≠ expanded).
2. **Legacy data migration** — does this touch data that could exist in a `.sav` already? State the migration/inference rule explicitly; a missing new field must never silently resolve less complete than today's rules already produce.
3. **Fixture & factory audit** — the test-fixture analog of #2: grep every `fillMinimalValid*Ward()`, `BASELINE`, and fixture factory for the touched filing type(s), and add any new required field wherever a sibling required field already appears. (Milestone 55D added one new field across four filing types and needed three separate discovery rounds — two e2e fixtures, two unit fixtures, two more e2e cases found only by the full suite — because this wasn't done up front.)
4. **Test coverage & index** — name the actual new/changed test files, and track the `TEST-INDEX.md` update (§7) as part of the plan itself.
5. **Export/import/portability** — does this touch any existing export/import/backup path? Check that path's real code; don't assume new data rides along for free.
6. **Security & sensitivity** — explicit classification and threat model for new stored data — what it protects against, and what it doesn't, never implying more than the mechanism guarantees.
7. **UI/UX consistency** — reuse this app's existing patterns (card layout, labels, a11y structure); name the pattern being reused.
8. **Legal/compliance framing** — never assert or resolve a legal-sufficiency question in a planning doc; flag it for a qualified person, and be precise about what this app's validation does and doesn't guarantee.
9. **Cross-form method consistency** — Guardian Inventory, Annual/Final/Trust Accounting, and Simplified Accounting each implement the same recurring concepts (ward-percentage apportionment, signature blocks, schedule totals, address rendering) independently, in their own `excel.js`/`pdf-model.js`/`index.js`. Before changing how any one of them computes, renders, or captures one of these, grep the other two forms' equivalent files for the same pattern. A divergence you find is itself a finding to report — never silently leave it alone, and never silently fix it in only the form you were already touching. (Milestone 60: Guardian Inventory's PDF forgot to ward-adjust 8 of 11 schedules' totals because, unlike Annual Accounting's single shared `totals.js`, it computes every total inline with no shared module to get right once; Annual's and Simplified's PDF signature blocks still use `pdf-engine.js`'s `details` layout, which the engine's own code comments call legacy and blame for a real shipped bug, while Guardian Inventory alone had already been migrated to the newer `fields` layout.)

---

## 9. Packaging & Portable Build Protocols

For an installable package on a site this repo doesn't host (DNN/DotNetNuke, or any host serving from an arbitrary subfolder): use **`dist/portable`**, never `dist/web` (`vite.config.js` hardcodes `dist/web`'s base to `/probate-guardian/`; `dist/portable` uses relative `base: './'`). Treat `vite.config.js`'s top-of-file comment as authoritative if this section and the code disagree.

1. **Build**: `npm run build` (both outputs; `build:portable` alone if only the package is needed).
2. **Never hand-pick files.** Vite content-hashes several filenames and `STATIC_COPY_TARGETS` can gain/lose entries as the app evolves — always zip whatever `dist/portable` actually contains after a fresh build.
3. **Zip the folder's contents, not the folder** — `index.html` must sit at the package root. On Windows, PowerShell's `Compress-Archive` beats whatever `zip`/`7z` is on `PATH` (this machine's `zip` is a broken legacy build — verify any tool actually recursed into subdirectories):

   ```powershell
   Compress-Archive -Path "dist\portable\*" -DestinationPath "<output>.zip" -Force
   ```

4. **Verify before delivering.** Smoke-test `dist/portable/index.html` via `file://` for console/page errors (a throwaway Playwright script checking `page.on('pageerror'/'console')` is enough — delete it after). Confirm the zip contains `lib/`, `icons/`, `fragments/`, `help/`, `src/`, not just top-level files. Packaging-relevant changes should also recommend `npm run test:e2e:portable` (§2).

---

## 10. Technical Anti-Patterns & Post-Mortem Archive

Quick-reference — full detail follows the table for P1/P2; P3–P6 are fully
documented in their operational section (linked) and archived here only as
an index entry, to avoid restating the same rule twice.

| # | Failure Mode | Trigger | Full Detail |
| --- | --- | --- | --- |
| P1 | Excel formula silently overwritten via a merged cell, a defined name, or a positional (`localSheetId`) index | Any write into the court-output workbooks | Below |
| P2 | A regex over XML swallows a self-closing tag and attaches its attributes to the wrong element | Any XML/`.xlsx`/`.docx` inspection done with regex instead of a parser | Below |
| P3 | `<a href="#">`'s native default action races a JS `navigate()` call and silently reverts it | Any `data-form-action` control rendered as a real anchor | §6 |
| P4 | `python3` on Windows resolves to a Microsoft Store alias stub, not the real interpreter, even though `PATH` lookup finds it | Any subprocess Python invocation on this org's Windows machines | §2 |
| P5 | `npm run check:types` rotted silently (10 uncaught errors, none real bugs) because it was never wired into the documented workflow | Any dormant, undocumented tooling script | §2 |
| P6 | A new required/blocking validator rule breaks stale test fixtures in 2-3 unrelated locations, caught only by luck or a full-suite run | Any new requiredness rule added without a fixture grep | §8 |

**P1 — Excel corruption, three mechanisms, none a direct write.** Check all three before touching an export:

- **Merge.** ExcelJS redirects a write on any member of a merged range to the range's master cell. Simplified's period dates, written to `E14`/`H14` (both inside merged `D14:I14`), destroyed the `=H4` the Case Number box depended on.
- **Defined name.** These workbooks propagate headers by *name* (`'SCH A INCOME p1'!D2` is literally `=Name_of_Ward`). Dropping the names on save left ~270 Annual cells reading `#NAME?`.
- **Positional index.** `localSheetId` on a print area/custom view is a sheet *index*. Inserting sheets re-points it silently; 57D's twelve-account extension moved `PART XI`'s print area onto a register page, which then printed clipped.

Both the merge and defined-name corruptions survived a full test suite for their **entire lives**, because the importer reads cells by address and evaluates nothing — it agrees with a broken exporter perfectly. Verify a formula survived by reading the *exported file*, never by re-importing it (§5).

**P2 — the self-closing-tag trap.** Given

```xml
<c r="C14" s="5"/><c r="D14"><f>H4</f><v>0</v></c>
```

the natural-looking `<c[^>]*r="([A-Z]+\d+)"[^>]*>(.*?)</c>` matches `r="C14"`,
swallows the rest of that self-closing tag as an opening tag, then scans to
the *next* `</c>` — reporting D14's formula as living in C14. This produced
two wrong findings in one session here: a set of Schedule B-4 total
addresses off by a column (caught only because an e2e assertion failed
against the real file), and a reported Simplified cover-page defect that
didn't exist at all — the template was correct, and the real defect was
elsewhere and would have been missed.

**Rule**: use a real parser for anything with a grammar — `xml.etree.ElementTree`, `JSZip` + a DOM in a browser test, ExcelJS's own object model. A regex-derived finding is **provisional** until re-derived with a parser or confirmed against the real exported artifact — say so when reporting it, and never write it into a milestone document as established. Regex is fine for coarse, non-load-bearing work (counting sheets, checking a name appears at all); never fine for anything resolving to a cell address, formula, or filed value. Prefer confirming against the **generated file** over the template where the question is what a filer receives — the two diverge, and that divergence is where defects live.
