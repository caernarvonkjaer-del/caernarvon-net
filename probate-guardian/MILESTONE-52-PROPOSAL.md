# Milestone 52: Duplicated-Code Consolidation — Executable Delivery Index

## Status

**Draft — not an authorization to implement anything below.** Per
`AGENTS.md` §2, this is a proposal only; nothing here should be started
until Alan explicitly approves a specific sub-delivery by name. Approval of
one sub-delivery does not authorize the others.

**Numbering note.** 52 is confirmed free — checked against `src/`, `tests/`,
every `*.md`, and `git log --grep` before this document was written, and
independently re-confirmed by the agent that was then executing Milestone
51. **Milestone 51 has since landed in full**, including two sub-deliveries
(51H, 51I) added after its original seven for defects found during
execution — see `MILESTONE-51-PROPOSAL.md`. The sequencing constraint this
note originally described (52A blocked until 51 fully lands, because both
regenerate the same window-bridge governance files) is therefore satisfied;
52A is unblocked as of this update. See "Sequencing and concurrency" below,
which is otherwise unchanged from first publication.

## Execution status — 2026-09-16

Added by the Milestone 51 agent, resuming on this tree at 05:04 EDT after
confirming the agent that authored this document had stopped (clean tree,
in sync with `origin/master`, no commit for six hours; its last was
`e59a9bc`, 2026-09-15 22:24).

**Approval basis, stated plainly because `AGENTS.md` §2 matters here.**
This document is still marked **Draft**, and §2 says a Draft proposal is
not a work order and needs approval of a specific delivery *by name*.
Alan's instruction was "evaluate ms 52 for unfinished work and continue
with it" — which names the milestone, not its twelve sub-deliveries. That
was treated as approval to work MS52, with the scope drawn at risk: the
six **Low**-risk sub-deliveries whose verification gates can be met
unattended were executed; the six **Medium**-risk ones were not, because
their own Verification sections require manual keyboard testing, manual
click-throughs, and byte-comparison of a workbook filed with a Florida
probate court — none of which can be done while the requester is asleep,
and three of which (52A, 52B, 52F) deliberately change behavior.

| Sub-delivery | Status |
| --- | --- |
| 52C — IndexedDB store-opener | **Landed** `eefc242` |
| 52E — `escapeHtml()` | **Landed** `05b4159` |
| 52G — `checkSignatureState()` call shape | **Landed** `416017f` |
| 52I — PDF byte-decoding helpers | **Landed** `fd5d9bc` |
| 52L — Test-suite support helpers | **Landed** `9731296` |
| 52D — Window-backed getter/setter factory | **Landed** `c37f478` — Alan chose "apply to the 5 that match" (2026-09-16); see below |
| 52A — Continue-prompt banner (3 bridges) | **Landed** `cdbff52` — see below; also fixes a double-render bug this delivery found |
| 52K — Guardian Inventory Excel schedule layout | **Landed** `34f681e` — see below; found (did not fix) a real wardPercent round-trip bug |
| 52B — Ward-decode pipeline + encrypt/decrypt fan-out | **Landed** `ec83360` — see below; fixes session-restore's all-or-nothing corruption failure |
| 52F — `extractCarryIdentity()`, Decision 6 | **Landed** `beea47b` — see below; also found and resolved a fourth attorney-order divergence in `legacy-app.js` |
| 52H — `loadGlobalScript()` | **Landed** `05d1b75` — see below |
| 52J | **Not started** — Medium risk, awaiting explicit approval by name |

### 2026-09-16, live session — 52H landed

Landed as documented: `src/core/vendor-loader.js`'s `loadGlobalScript(src,
{ check })` owns the script-injection/promise-cache/retry-on-error logic
internally, keyed by `src`, so neither `html2pdf-loader.js` nor
`exceljs-loader.js` needs its own module-level promise variable anymore.
`pdfjs-loader.js` stayed out of scope exactly as the doc specified — a
different loading mechanism (`import()`, not a `<script>` tag) with its
own separate, unfixed bug.

One small behavioral widening, folded in deliberately: `check()` now
checks both `window.X` and `globalThis.X` for both loaders uniformly —
previously only `exceljs-loader.js` had the `globalThis` fallback.
Real browser sessions are unaffected (`window` is always defined
there).

New coverage, `tests/e2e/vendor-loader-retry.spec.ts`, closes a real gap
neither loader had before: blocks the first `lib/exceljs.min.js`
request, confirms the rejection is caught and surfaced as status text
with no uncaught page error, then lets the second request through and
confirms the export succeeds — proving the shared cache entry actually
clears on failure rather than staying poisoned. Full unit suite:
846/846. e2e: the new spec plus 36 more across every PDF/Excel export
path in guardian-inventory-mount/annual-mount/simplified-mount.

### 2026-09-16, live session — 52F landed

Landed as documented, including F3's investigation of `legacy-app.js`'s
third copy (`carryOverAccountingToAccounting()`), which the doc
suspected "may have a fourth, undiscovered order." It did:
`attorneyForGuardian||srcAttyFlat||srcAtty.name`, cosmetic-first, and it
never checked the flat `attorney_name`/`attorneyName` fields the other
two functions do. Converted to call `extractCarryIdentity()` for the
guardian-name and attorney fields (gName's chain there is a strict
superset of this function's own, so no behavior narrowing);
`caseNumber` was left alone since the extra `ucn`/`ref` fallbacks only
matter for Plan Minor sources, which never reach this
accounting-to-accounting-only function.

`extractCarryIdentity()` is now bridged onto `window`
(`window.extractCarryIdentity`) so `legacy-app.js` can reach it —
governance files regenerated and diffed to confirm exactly that one
new name.

One more divergence found while writing the shared extractor, beyond
what the doc's Background section named: `gName`'s fallback order also
differed between the two `ward-lifecycle.js` functions
(`guardianName`-then-`guardianNames` vs. the reverse;
`guardians[]`-then-`planGuardians[]` vs. the reverse). Verified
harmless before unifying it, the same way F1 verified Decision 6's
divergence was real: `guardianName` belongs to
`guardian_inventory`/`plan_minor` and `guardianNames` to `plan_initial`
alone (per `probate-guardian-data-model.csv`), never both on one
source ward; `guardians[]`/`planGuardians[]` are exclusive to the
Accounting/Plan families respectively. Check order never changes the
result for any real ward shape.

`tests/unit/ward-carryover.spec.js`'s existing "still prefers an
explicit flat attorney name over the nested one" test asserted the
**old**, pre-Decision-6 behavior — rewritten to assert the new one, and
a second test added for the `plan_initial`-flat divergent shape
(`attorneyName` vs `attorney_name`), Decision 6's other documented real
case. Full unit suite: 846/846. e2e: `carryover-workflow.spec.ts` (5/5)
and `convert-ward.spec.ts` (6/6), including the guardian→annual
accounting-to-accounting path F3's change touches directly.

### 2026-09-16, live session — 52B landed

Landed as documented: `decodeWardRecord()`, `encryptCaseFileCore()`, and
`decryptCaseFileCore()` now live in `case-file.js`, and
`recovery-cache.js` imports all three instead of maintaining its own
copies. Per the doc's own scoping, guardian-info decrypt was left out of
`decryptCaseFileCore()` entirely — both files already treated a corrupted
guardian blob as fatal, so there was no asymmetry to resolve there, only
in the three non-ward fields (parties/cases/dismissedPartyPairs).

The behavior change (B3) landed as specified: `recovery-cache.js` gained
the per-field try/catch-and-fall-back-to-`[]` guard `case-file.js`
already had, so a corrupted `parties`/`cases`/`partyDismissals` blob in
the session-restore cache no longer aborts the whole restore. Verified
red-first per the doc's own convention — stashed both source files back
to pre-52B, reran the new corruption test, confirmed it failed with the
old all-or-nothing message, then restored and reran green.

New coverage, `tests/e2e/case-file-core-fields-roundtrip.spec.ts` (3
tests), also closes a real pre-existing gap: neither
`case-file-roundtrip.spec.ts` nor `backup-restore-sav.spec.ts` populated
`parties`/`cases`/`dismissedPartyPairs` at all, so nothing proved those
fields survived a full `.sav` export/reimport or a session-restore
cache save/restore before this delivery. Full unit suite: 845/845. e2e:
the new spec plus 50 more across every spec file touching the
encrypt/decrypt and party paths (backup-restore-sav,
case-file-roundtrip, recovery-cache, persistence-recovery.contract,
party-dedupe, party-resolver, closed-filing-sync) — 53/53.

### 2026-09-16, live session — 52K landed, plus a found-not-fixed defect

Landed as documented: all 11 schedules' page/sheet-name + row-number
layout now live in one `SCHEDULE_XX_PAGES` constant each, read by both
the writer and `readRows()` (which now destructures `name` instead of
`sheet` — the two keys had no other consumer, so this eliminates the
mapping rather than reconciling it). New coverage,
`tests/e2e/guardian-inventory-excel-schedule-layout.spec.ts`, goes
further than the doc's own Verification asked: every row of all 11
schedules at exact page-template capacity round-trips through
export/import, not just the last row of the last page, since a
writer/reader page-advance off-by-one would typically shift every row
after the seam.

Building that fixture surfaced a real, pre-existing defect, out of
52K's scope and left unfixed: **`wardPercent`/`jointOwnerPercent`
never round-trip correctly through Excel.** The writer stores the
plain 0-100 number the form's "Ward's % (0-100)" input and its own
`>0` validation use (`src/features/guardian-inventory/index.js:1208`
and its per-schedule siblings); the reader's `pct()` helper
(`excel.js`, in `parseInitialInventoryWorkbook()`) multiplies the raw
cell value by 100, as if the cell held a 0-1 fraction. A value entered
as `50` is written as `50`, then read back as `5000` on any Excel
re-import. This affects every one of the 11 schedules' percent field
and is unrelated to the page/row layout 52K consolidated — it predates
this delivery and predates this document. Not a scoping call: this is
a real bug in a value a Florida probate court receives, and belongs to
whoever picks it up next as its own fix, not a silent side effect of
52K.

### 2026-09-16, live session — 52A landed, plus a bug this document didn't anticipate

The three bridges (A1–A7) landed as documented. But wiring them wasn't
enough to actually see a banner: `navigate('/dashboard')` sets
`window.location.hash`, which asynchronously fires the app's own
`hashchange` listener (`handleHash()`) *in addition to* the render
`navigate()` already did directly — a second, redundant render of
whatever page it navigated to. That's harmless for an ordinary
idempotent render, but `showContinuePromptIfNeeded()` marks itself shown
on its first run and unconditionally clears its container on every run,
so the second render silently wiped the banner the instant after the
first one drew it. This is not what the doc's Verification section 3
would have caught by manual click-through alone — it was caught here by
instrumenting `continue-prompt-container`'s `innerHTML` setter and
capturing both call stacks, which showed one from `navigate()`'s direct
`renderPage()` call and one from the `hashchange` echo of that same
navigation, both landing in `mountDashboardFeature`. Fixed by having
`handleHash()` skip its own render when `currentPage` already equals the
incoming hash — true exactly when `navigate()` (or `renderPage()`'s own
`/dashboard`-with-no-wards redirect) already rendered for it. This is a
pre-existing router quirk, not something 52A introduced; it was invisible
before because nothing else on `/dashboard`'s render path was a one-shot
gated on its own prior output.

New coverage: `tests/e2e/continue-prompt-banner.spec.ts` (4 tests) —
ward-switch reaches `getRecentlyOpenedWards()`, the banner renders with a
real relative time and the rest of the dashboard renders below it, it
does not reappear on a later same-session visit, and the flag survives a
`.sav` export/reopen for the same ward pairing. Full unit suite:
845/845. e2e: the new spec plus 61 more across
routes/startup/dashboard-backup/convert-ward/ward-lock/unlock/
case-file-roundtrip/persistence-recovery/closed-filing-sync/party-dedupe
— chosen to cover every route the `handleHash()` change touches, not
just the ones 52A's own files list named.

### 2026-09-16, live session — 52D resolved and landed

Alan reviewed the "why it was not executed" analysis below and chose to
apply `windowBackedRef` to the 5 pairs that genuinely match the shape
(`getCryptoKey`/`setCryptoKey`, `getSecurityMode`/`setSecurityMode` in
`crypto.js`; `getCaseFileHandle`/`setCaseFileHandle`,
`isDirtySinceExport`/`setDirtySinceExport`,
`getLastExportAt`/`setLastExportAt` in `case-file.js`), leaving the other 4
hand-written. Landed as `c37f478`.

One placement change from the original D1 spec: the factory lives in a new
`src/core/persistence/window-backed-ref.js` leaf, not in `state.js`. None
of `state.js`'s own pairs qualify for the factory under this narrowed
scope, so routing `crypto.js` through `state.js` — the "legacy state
adapter" cost this document's own blocking note flagged — would have been
a real new dependency for no shared benefit; a small leaf module both
`crypto.js` and `case-file.js` can import avoids it.

One implementation trap worth recording for future window-bridge work:
the first pass wrote each `write` closure as
`(v) => { if (typeof window !== 'undefined') window._x = v; }` — one line.
`scripts/audit-window-bridge.mjs`'s assignment regex requires
`window.` to start its own line (only leading whitespace before it), so
collapsing the `if`-guard onto one line silently dropped 5 assignments
from the governance files without any test failing (nothing in the
existing suite asserts the *count* stays put, only that entries present
are consistent). Caught by the Verification step 1 diff this section
specifies, not by the unit suite. Fixed by keeping each assignment on its
own line, matching the multi-line `if { }` shape the original hand-written
setters already used. `node scripts/audit-window-bridge.mjs --json` diffs
byte-identical before/after in the corrected version. Full unit suite:
845/845 (unchanged).

Unit suite after the five: 845 passing across 78 files, the same count as
before, since 52L changed how ten specs are scaffolded and not what they
assert.

### Corrections this execution made to this document

Each was found by reading the code rather than the write-up, and each is
recorded in full in its own commit message:

1. **52I named one dead local; there are three.** `isPdfBytes` in
   `pdf-engine.js` has zero call sites, so the instruction to add it to
   the `supplemental-pdf.js` import would have created an unused import
   for dead code. Its siblings `isPngBytes` and `isJpegBytes` are equally
   dead. All three deleted; only `dataUrlToBytes` was a real duplicate.
2. **52G's proposed signature names three parameters no call site
   passes.** None of the eight sites passes `filingType`, `datePath` or
   `imagePath`. They are also not uniform — one passes `name`, and the
   attorney/preparer sites have no `person` object at all, reading flat
   `attorney_*`/`preparer_*` keys.
3. **52E's recommended home rests on a false premise.** The proposal put
   the shared `escapeHtml` in `output-advisories.js` because
   "readiness-card.js already imports from it." It does not. A leaf module
   was used instead, avoiding a new card-renderer→advisories edge.

### 52D — why it was not executed

52D's premise is that "nine pairs share one shape." Five do. The other
four do not, and the proposed factory would silently change behavior on
two of them and cannot express the other two at all:

- **`getCaseFile`/`setCaseFile` and `getD`/`setD` guard on truthiness**,
  not `!== undefined`. Decision 3 flags this for `getD` only;
  `getCaseFile` has it too. Under the proposed factory's `w !== undefined`
  test, a `window.caseFile` or `window.D` of `null` would start being
  returned instead of falling back to the module value.
- **`setD` is not a plain setter.** It calls
  `window.normalizeWardData(d)` before storing, which the factory has no
  place for.
- **`getAppState(key)`/`setAppState(key, val)` is a keyed map accessor**,
  not a single-value ref — different arity, and it returns `null` rather
  than the module value for a missing key.
- **`getTemplateCache()`/`setTemplateCache(type, b64)` is asymmetric** —
  the getter returns the whole cache, the setter writes one entry by key.

There is also a cost the document does not account for: **`crypto.js`
imports nothing today.** It is a deliberate leaf holding the AES key
material. Putting `windowBackedRef` in `state.js` as D1 specifies would
make the crypto module depend on the legacy state adapter to borrow a
five-line utility.

So the honest options are to apply the factory to the five that genuinely
match (leaving the file with both styles), or to drop 52D. Either is a
scoping call that belongs to Alan, not to an unattended agent — the
sub-delivery cannot be delivered as written.

## Source and verification status

The twelve findings below came from the "Duplicated code (beyond the two big
items above)" section of an external audit Alan handed over, itself produced
from a broader dead-code/duplication sweep of this codebase. Every item was
re-derived against current `master` before this document was written, not
copied from the audit text. Two corrections and one new finding came out of
that process, plus a second new finding (item 4) added after first
publication, once the Milestone 51 agent reported an observation from
probing this document's original 52A fix rather than claiming it as a
conclusion:

1. **Finding 1 is a live bug, not just a triple duplication.** The audit
   correctly found `formatRelativeTime()` copied byte-for-byte into
   `src/core/persistence/case-file.js:306-314`,
   `src/core/persistence/recovery-cache.js:105-113`, and
   `src/legacy-app.js:2947-2954`. What it did not report: **none of the three
   is ever exposed as `window.formatRelativeTime`**, yet
   `src/features/dashboard/index.js:18` destructures `formatRelativeTime`
   from `window` and calls it at `:177` inside `showContinuePromptIfNeeded()`
   — the "Continue where you left off" banner shown whenever a user's most
   recently opened ward differs from the currently active one
   (`dashboard/index.js:160-181`, reached from every `renderDashboardPage()`
   call, `:594`). Calling `undefined(...)` throws a `TypeError`, uncaught,
   inside `mount()` (`dashboard/index.js:617-621`) — which is called with no
   `try`/`catch` by `feature-bridge.js`'s `mountPage()`
   (`await mod.mount(container, page)`, no wrapper around that line). The
   result: `renderDashboardSummary()`, `renderDashboardGrid()` and
   `renderSidebarResources()`, the three calls immediately after
   `showContinuePromptIfNeeded()` in `renderDashboardPage()`
   (`dashboard/index.js:594-598`), never run. **A user with more than one
   ward/filing who navigates in a way that trips the continue-prompt gate
   gets a dashboard with no summary strip, no ward grid, and no sidebar
   resources — a silent, uncaught crash, not a cosmetic gap.** No unit or
   e2e spec covers `showContinuePromptIfNeeded()` or the continue-prompt
   banner at all (verified by grep across `tests/`), which is presumably how
   this survived. See 52A.

2. **Finding 12's file count is stale by one.** `tests/unit/combobox-controller.spec.js`
   was deleted by Milestone 51A (it shipped with `combobox-controller.js`,
   the dead class it tested). The "3 files hand-roll fake-DOM-element mocks"
   claim is now 2 files: `tests/unit/form-contract.spec.js` and
   `tests/unit/live-region.spec.js`. See 52L.

3. **Two of the twelve are not safe mechanical merges, and this document
   does not treat them as one.** `carryOverFieldsForPlan()` and
   `carryOverFieldsForAccounting()` (Finding 6) build `attyName` from the
   same five candidate fields **in a different priority order** —
   `ward-lifecycle.js:92` tries `attorneyForGuardian` first,
   `ward-lifecycle.js:224` tries `attorneyName` first. A source ward with
   more than one of those fields populated with different values would carry
   over a different attorney name depending on which function ran — today,
   silently, by design or by accident, nobody has recorded which. **Now
   resolved** — the reachability check came back positive against real
   `probate-guardian-data-model.csv` shapes, and Alan has decided the
   order; see 52F's Decision 6.
   Separately, the IndexedDB "boilerplate" in Finding 3
   (`launch-preferences.js` vs. `recovery-cache.js`) is identical only for
   the database-opening step; the get/put/delete wrappers differ in a way
   that matters (explicit multi-key access with no error-swallowing vs. a
   fixed single `'current'` key with every call wrapped in try/catch). See
   52C for why only the opener is consolidated.

4. **The continue-prompt banner turns out to have three independent missing
   bridges, not one — and two of them sit chronologically *before* item 1's
   crash, in the same function.** The Milestone 51 agent, probing this
   document's original 52A fix, reported the banner not rendering at all —
   container present, emptied, no thrown error — and correctly declined to
   call that a finding on its own, since it is equally consistent with
   normal gating. Tracing `showContinuePromptIfNeeded()`
   (`dashboard/index.js:160-181`) line by line against what is and is not
   actually bridged:

   - **`getRecentlyOpenedWards` — never bridged.** Confirmed by an
     exhaustive literal search of `legacy-app.js` for the identifier: it
     matches exactly once, its own definition (`:3925-3931`). No
     `window.getRecentlyOpenedWards = ...` exists anywhere, in any form —
     not the standard assignment convention, not an `Object.assign(window,
     ...)` block (the file has none), not dynamic `window[...]` assignment
     (the file has none). `dashboard/index.js:14` destructures it from
     `window` at module load and gets `undefined` permanently. Calling it
     at `dashboard/index.js:165` throws `TypeError: getRecentlyOpenedWards
     is not a function` — **before** the `formatRelativeTime` line in item
     1 is ever reached.
   - **`addToRecentlyOpened` — never bridged.** Same exhaustive-search
     method, same result: one match, its own definition
     (`legacy-app.js:3915-3919`). Its only call site is a one-time
     legacy-`.sav`-migration seed (`legacy-app.js:3421`) that fires at most
     once per archive. The **normal**, ongoing call site — every time a
     user actually switches wards — is
     `src/core/navigation/ward-lifecycle.js:395-397`, which guards the call
     behind `typeof window.addToRecentlyOpened === 'function'`; that guard
     has never once been true since the call site was introduced (Milestone
     27, 2026-09-07, `f4a92e8` — legacy-monolith decomposition; the bridge
     was evidently never carried over when this call was extracted from
     legacy-app.js). Even if `getRecentlyOpenedWards` above were fixed in
     isolation, it would have nothing to return for any case created under
     current code, because nothing ever adds to the list it reads.
   - **`formatRelativeTime` — item 1's finding, reachable only past both of
     the above.**

   **Why the Milestone 51 agent saw no error, traced rather than guessed:**
   `showContinuePromptIfNeeded()` checks `isContinuePromptShown()` (`:164`)
   — reading `legacy-app.js`'s own closure variable `_appState.continuePromptShown`
   (`:936`, `:2902`) — before it ever reaches the broken
   `getRecentlyOpenedWards()` call. That variable can become `true` through
   exactly one working path today: importing a `.sav` file whose appState
   blob already carries `continuePromptShown: true`, hydrated verbatim at
   `legacy-app.js:3412` (`_appState.continuePromptShown=a.continuePromptShown;`).
   It **cannot** currently become `true` any other way — its only other
   writer, `markContinuePromptShown()` (`:2904-2907`), is called from
   exactly one place, `dashboard/index.js:169`, which sits **after** the
   `getRecentlyOpenedWards()` crash in the same function and is therefore
   unreachable. (This also means there is no lurking export/import
   asymmetry to worry about: `markContinuePromptShown()` writes both its
   own variable and, via the correctly-bridged `saveAppState()`
   (`launch-preferences.js:151`), `window._appState` — the same object
   `buildCaseFileBlob()` reads via `loadAppState()` when exporting. The two
   sides agree; the variable simply never gets set in the first place.) A
   reused test fixture `.sav` that happened to be exported with this flag
   already `true` — plausible for any repeatedly-reused multi-ward test
   archive — would short-circuit `showContinuePromptIfNeeded()` at `:164`
   on every load, container emptied by the line above, no error: exactly
   the observation reported. This is inference about the Milestone 51
   agent's specific test fixture, not something directly observed in it —
   flagged as such rather than asserted as certain, in the same spirit the
   agent flagged its own observation rather than overclaiming it.

   **Net effect:** the feature has been non-functional since Milestone 27
   (2026-09-07) for any case whose `.sav` doesn't already carry this one
   flag true, and even a case that does carry it hits one of two further
   crashes the moment that flag is ever false again (a fresh case, a
   different ward's history, or the flag never having been true to begin
   with). All three bridges are fixed together in 52A below — fixing any
   subset would leave the feature still broken.

Everything else on the original list reproduced as described, with current
line numbers re-confirmed below.

## Why this is one milestone and not twelve commits

Unlike Milestone 51, most of these twelve findings do not share a single
governance surface — they are spread across persistence, PDF, Excel, the
legacy combobox code, and the test suite, with little file overlap between
them. They are grouped here because they are one *kind* of finding
(duplication the original audit surfaced in one pass) and because a few of
them genuinely do collide with each other or with Milestone 51's remaining
work — see "Sequencing and concurrency." This index exists so those
collisions are visible before anyone starts, not discovered mid-edit.

## How this index is organized

Each sub-delivery states **Risk**, **Files**, numbered **Steps**, a
**Verification** block, and — per `AGENTS.md` §8 — cross-cutting
ramifications, marked **N/A** where genuinely inert rather than left silent.

| Sub-delivery | What | Risk | Size |
| --- | --- | --- | --- |
| 52A — The continue-prompt banner: three missing bridges, one feature | 3 `formatRelativeTime` duplicates + 3 missing bridges (3 compounding live bugs) | **Medium** | Small |
| 52B — Ward-record decode pipeline and encrypt/decrypt fan-out | 2 pairs of near-duplicate functions | **Medium** | Small–medium |
| 52C — IndexedDB store-opener: one function, not two | 1 consolidation (opener only) | Low | Trivial |
| 52D — Window-backed getter/setter pattern: one factory | 9 pairs across 3 modules | Low | Small |
| 52E — `escapeHtml()`: two duplicates merged, one divergent variant documented | 2 consolidated, 1 left alone | Low | Trivial |
| 52F — Attorney-fallback carry-over: one helper, one resolved divergence | 3 near-duplicates, 1 behavior change (resolved, Decision 6) | **Medium** | Small |
| 52G — `checkSignatureState()` call shape, `readiness-config.js` | 8 repeats, 1 file | Low | Trivial |
| 52H — Vendor-script loader pattern: one `loadGlobalScript()` | 2 loaders consolidated | Low | Small |
| 52I — PDF byte-decoding helpers: import, don't reimplement | 3 functions, 2 files | Low | Trivial |
| 52J — Legacy combobox keyboard navigation: one shared handler | 4 comboboxes, 2 gain new behavior | **Medium** | Small–medium |
| 52K — Guardian Inventory Excel schedule layout: one page/row map | 11 schedules, write+read paths | **Medium** | Small–medium |
| 52L — Test-suite duplication: three shared support helpers | 3+5+2 files → 3 new support modules | Low | Small |

## Decisions taken during scoping

**Decision 1 — `formatRelativeTime` moves to `case-file.js` and gains a real
`window` bridge.** Not a new module: `case-file.js` already owns the
convention this needs (a "Global bridge for legacy scripts and test
harnesses" block at `:908-948` that bridges dozens of its exports), and it
already exports the one other consumer of relative-time formatting,
`updateLastSavedIndicator()`. `recovery-cache.js` and `dashboard/index.js`
are both ES modules and could import it directly instead of going through
`window` — but `dashboard/index.js` already destructures its entire
`case-file.js`-originated surface from `window` in one block (`:12-19`), and
changing just this one name to an ES import while leaving the other dozen as
`window` destructures would be a smaller, riskier, and *less* consistent
change than adding one more name to the existing block. `recovery-cache.js`
switches to an ES import (it does not currently destructure anything from
`window` at module scope for a same-layer sibling, and already imports
several things from `crypto.js` and `state.js` this way). `legacy-app.js`
deletes its copy and calls `window.formatRelativeTime`, matching every other
case-file.js-owned helper it already calls that way.

**Decision 1b — `getRecentlyOpenedWards` and `addToRecentlyOpened` both get
the same treatment: real `window` bridges, added in `legacy-app.js`
alongside their neighbors.** Per Source note 4, neither has ever been
assigned to `window`, despite `dashboard/index.js` destructuring the former
and `ward-lifecycle.js:395-397` guarding a call to the latter behind
`typeof window.addToRecentlyOpened === 'function'` — a guard clearly
written expecting the bridge to exist. Both fixes are one line each, in the
same "Global bridge" style already used throughout `legacy-app.js` for
dozens of other functions in this exact neighborhood (`isContinuePromptShown`,
`markContinuePromptShown`, and — once Decision 1 lands —
`formatRelativeTime`). This is not a new architectural decision so much as
finishing two that were already half-made.

**Decision 2 — the IndexedDB consolidation is the opener only.**
`_launchPrefDb()`/`_sessionCacheDb()` are genuinely identical modulo the two
exported constants they pass to `indexedDB.open()`. The get/put/delete pairs
are not: `launch-preferences.js`'s take an explicit `key` and let a failure
reject (its callers handle that); `recovery-cache.js`'s hardcode the key
`'current'` and swallow every failure into a no-op, because a broken
crash-recovery cache must never block the app from loading. Merging those
two error-handling contracts to save a few more lines is not this
sub-delivery's job and is **not attempted**.

**Decision 3 — the window-backed getter/setter factory must not change what
`scripts/audit-window-bridge.mjs` sees.** The nine pairs (Finding 4) all
follow the shape `if (typeof window !== 'undefined' && window._x !==
undefined) return window._x; return _x;` for the getter, `_x = v; if
(window) window._x = v;` for the setter. The naive fix — a factory keyed by
a string property name using `window[key]` — would replace nine
static, single-line `window._x = ...` assignments (which the audit script's
`^\s*window\.([A-Za-z_$][\w$]*)\s*=` regex finds) with dynamic bracket
assignments the regex cannot see, silently shrinking the assignments list
`node scripts/audit-window-bridge.mjs` reports and leaving `window.D` (the
one bridged name in this group with real legacy-app.js consumers) looking
like it has zero assignment sites. **The factory instead takes explicit
`read`/`write` closures per call site**, so each module keeps its own
literal `window._x = v;` line (see 52D) — the audit script's view of the
`window` surface does not change at all, and neither does the actual set of
names, so this sub-delivery needs no governance-file regeneration.

**Decision 4 — the combobox consolidation closes the keyboard-navigation gap
rather than merely documenting it.** Milestone 51's "Deliberately out of
scope" section named this as its own future milestone; this is that
milestone, for the one aspect the original audit actually flagged (keyboard
completeness — the ARIA-attribute work is already done, per 51's Source
note 2). Two of the four comboboxes (`initWardNameCombobox`'s dropdown and
the convert-source dropdown) currently have no arrow-key navigation at all —
Escape only, plus Enter on the convert-source one. This is a real,
user-facing capability gap: a keyboard-only or screen-reader user cannot
select a suggestion from either dropdown without a mouse. Given `role="combobox"`/
`aria-expanded`/`role="listbox"` are already present (Milestone 50H) but
arrow-key handling is not, shipping the ARIA attributes without the keyboard
behavior they promise is arguably worse than shipping neither — so 52J
extracts `onWardSelectorKeydown()`'s complete implementation (the one with
full Up/Down/Home/End/Enter support) into a shared handler and wires all
four comboboxes to it, rather than deduplicating only the parts that were
already identical. This is flagged **Medium** risk and needs manual
keyboard-only testing, not just a code-shape review, because it changes what
a user can do, not just how the code is organized.

**Decision 5 — Guardian Inventory's schedule layout consolidation waits for
`guardian-inventory/excel.js` to go quiet.** The line ranges 52K touches
(`:99-326`, `:456-494` as of this writing) do not overlap the lines
Milestone 51D is currently editing in the same file (`:10-90`, confirmed by
diff), so there is no literal merge conflict today. But 51D's edit is
uncommitted, and per `AGENTS.md` §1, sub-delivery dependencies are about
real file-level proximity, not just current line numbers — an uncommitted
diff can still move. 52K should not start until 51D lands (see
"Sequencing"). **Update: 51D landed as `5328954`; 52K is unblocked.**

**Decision 6 — attorney-fallback priority: the authoritative field wins over
the cosmetic one, added after F1's reachability check came back positive.**
Full reasoning and the resolved fallback order are in 52F's own section
below, not repeated here, since it is long enough to need its own
worked example. In brief: `probate-guardian-data-model.csv` documents
`attorneyForGuardian`/`attorneyName` as explicitly cosmetic and
`attorney.name`/`attorney_name` as the validated/certification fields on
the same ward types, so `extractCarryIdentity()` checks the authoritative
pair first.

---

## 52A — The Continue-Prompt Banner: Three Missing Bridges, One Feature

**Risk: Medium.** This is the one sub-delivery in this milestone that both
fixes a live defect and adds new `window.*` names, which means it shares
Milestone 51's governance-file collision surface (see "Sequencing"). It
grew from one confirmed bug (`formatRelativeTime`) to three during scoping
— see Source note 4 — after the Milestone 51 agent reported an observation
from probing the original, narrower version of this fix without claiming
more than it had established.

### Files

`src/core/persistence/case-file.js`, `src/core/persistence/recovery-cache.js`,
`src/legacy-app.js`, `src/features/dashboard/index.js`,
`tests/unit/fixtures/window-bridge-allowlist.json`,
`src/core/types/window-bridge.d.ts`.

### Steps

**A1. Bridge `getRecentlyOpenedWards`.** Add
`window.getRecentlyOpenedWards = getRecentlyOpenedWards;` to `legacy-app.js`'s
existing dashboard-adjacent bridge assignments (near `:3925-3931`'s
definition, or grouped with the other dashboard-consumed globals — match
whatever grouping convention the surrounding code already uses). No logic
change to the function itself.

**A2. Bridge `addToRecentlyOpened`.** Add `window.addToRecentlyOpened =
addToRecentlyOpened;` alongside it. This makes
`ward-lifecycle.js:395-397`'s existing guarded call — unreachable since
Milestone 27 — start firing on every real ward switch. No change needed in
`ward-lifecycle.js` itself; the guard was already written correctly.

**A3. Keep `formatRelativeTime()` in `case-file.js` (already there,
`:306-314`), export it, and add `window.formatRelativeTime =
formatRelativeTime;` to the existing bridge block at `:908-948`.** No
logic changes to the function itself — it is already correct and is what
all three copies agree on.

**A4. `recovery-cache.js`: delete the local `formatRelativeTime` copy
(`:105-113`) and import it from `./case-file.js`.** Confirm this does not
create a circular import — `recovery-cache.js` already imports
`getCaseFile`, `setAppState` from `../state.js` and several things from
`./crypto.js`, and `case-file.js` imports neither `recovery-cache.js` nor
anything that chains back to it (verify with a quick import-graph check
before landing, not after).

**A5. `legacy-app.js`: delete its local `formatRelativeTime` copy
(`:2947-2954`)** — its call site at `:2387` keeps working unqualified,
resolving through the global scope the same way `window.formatRelativeTime`
would, since it is a classic script.

**A6. `dashboard/index.js`: no code change required** at either call site
(`:165`, `:177`) or the destructure (`:13-19`) — this is the one file in
the whole sub-delivery that starts working correctly instead of throwing,
once A1–A3 land. Add regression coverage for it (see Verification) so it
stays working.

**A7. Regenerate the bridge governance files.**
`node scripts/audit-window-bridge.mjs --declare` for `window-bridge.d.ts`;
regenerate the allowlist from the script's `--json` output. Three new
names this time, not one — confirm the diff shows exactly
`getRecentlyOpenedWards`, `addToRecentlyOpened`, and `formatRelativeTime`,
nothing else.

### Verification

1. **New coverage for the actual defect chain, not just the dedup.** No
   spec exercises `showContinuePromptIfNeeded()`, `addToRecentlyOpened()`,
   or the ward-switch call site that should invoke it today. Add:
   - A unit or e2e test that switches between two wards and confirms
     `getRecentlyOpenedWards()` gains an entry each time (closing A1/A2's
     gap — this is the one that would have caught Milestone 27's
     regression).
   - A test that then loads the dashboard with that state (recently
     opened ward differing from active, prompt not yet shown) and asserts
     the continue-prompt banner renders with a real "... ago" string
     instead of throwing (closing A3's gap).
   - A test confirming `markContinuePromptShown()` becomes reachable and
     persists — dismiss or trigger the banner once, then confirm
     `isContinuePromptShown()` is `true` on a subsequent render in the same
     session, so the banner does not reappear every time.
2. `npx vitest run tests/unit/window-bridge.spec.js` — allowlist and `.d.ts`
   back in sync.
3. `npx playwright test tests/e2e/routes.spec.ts` (dashboard mount) plus a
   manual repro end to end: open the app with two wards, switch to one,
   switch to the other, return to the dashboard, and confirm the banner
   appears with a real relative time and the ward grid/summary/sidebar
   still render below it — then confirm it does *not* reappear on a second
   visit without switching wards again.
4. Confirm `src/legacy-app.js:2387`'s "last saved ..." indicator still
   renders correctly (the other live caller of `formatRelativeTime`).
5. **Export/import round-trip for the flag itself:** trigger the banner,
   let it mark itself shown, export a `.sav`, re-import it (or open it in a
   second profile), and confirm the imported case does not re-show the
   banner for the same ward pairing — this is what proves A1/A2 didn't just
   move the crash further down the same broken chain.

### Cross-cutting ramifications (`AGENTS.md` §8)

- **Data Model:** N/A — no persisted shape change. `continuePromptShown`
  and `recentWards` are already part of the `.sav`-persisted app state
  (`case-file.js:220-222`, carried on import at `legacy-app.js:3412`) and
  are untouched in shape here — this sub-delivery makes the existing
  read/write paths reachable, it does not add new fields.
- **Legacy Data Migration:** N/A for the fix itself. Worth noting for
  context: any `.sav` file exported since Milestone 27 has an accurate but
  perpetually-empty `recentWards` list and a `continuePromptShown` that is
  `true` only if it happened to be seeded by the one-time legacy-migration
  path (`legacy-app.js:3421`) before that file was last exported. Nothing
  needs to migrate — an empty list is valid input, and the feature simply
  starts working correctly for activity going forward.
- **Test Coverage & Index:** new tests per Verification step 1 above (new
  spec file or additions to existing ones — decide during implementation
  which, and update `TEST-INDEX.md` accordingly either way, per §7).
- **Export/Import/Portability:** touched indirectly — `recentWards` and
  `continuePromptShown` both round-trip through `.sav` export/import
  (`buildCaseFileBlob()`/import-hydration), and Verification step 5 is the
  gate proving that round-trip still works once these three functions are
  reachable rather than dead.
- **Security & Sensitivity:** N/A — three net new `window` names, each
  replacing a function that already existed and was already meant to be
  reachable this way, per the guard code already written to expect them.
- **UI/UX Consistency:** **directly implicated — this is a UI bug fix,
  larger in practice than it first looked.** Before this lands, the
  "Continue where you left off" banner cannot appear for any case created
  since Milestone 27 (2026-09-07) except through an accidental legacy-seed
  path, and on the rare case where it can appear, it crashes instead of
  rendering, taking the rest of the dashboard down with it. After this
  lands, it works as designed on every ward switch.
- **Legal/Compliance:** N/A.

---

## 52B — Ward-Record Decode Pipeline and Encrypt/Decrypt Fan-Out

**Risk: Medium.** Both functions sit on the case-load and session-restore
paths — the two places a user's actual case data passes through this code.
Consolidating them is safe only if the two callers' actual differences
(there are some) survive the merge.

### Files

`src/core/persistence/case-file.js`, `src/core/persistence/recovery-cache.js`.

### Background

Two duplicated shapes, confirmed at current line numbers:

- **The decode wrapper + pipeline.** `sanitizeObjectData(obj)` — delegate to
  `window.sanitizeObjectData` if present, else pass through — is defined
  identically at `case-file.js:654-659` and `recovery-cache.js:115-120`. The
  pipeline that uses it, `migratePlanTriState(sanitizeObjectData(await
  decryptJSONWithKey(...)))`, appears at `case-file.js:710` (inside
  `importSavArchiveOrWard()`'s per-ward loop) and `recovery-cache.js:147`
  (inside `checkSessionRestoreCacheAtLaunch()`'s per-ward loop).
- **The encrypt/decrypt fan-out.** `buildCaseFileBlob()`
  (`case-file.js:192-...`) and `saveSessionRestoreCache()`
  (`recovery-cache.js:64-...`) each independently `encryptJSON()` the
  guardian info, parties, cases, and dismissed-party-pairs arrays as four
  separate calls. The two importer-side functions
  (`importSavArchiveOrWard()`, `checkSessionRestoreCacheAtLaunch()`) each
  independently decrypt the same four with an empty-array fallback on
  failure — except `case-file.js` wraps each of the three non-ward fields in
  its own try/catch (a bad blob logs and falls back to `[]`), while
  `recovery-cache.js`'s equivalent has no per-field guard, so a corrupt
  field there throws and is only caught by the function's outer catch,
  turning a partial-recovery case into a full "could not restore" failure.

### Steps

**B1. Extract the decode wrapper and pipeline into one function,
`decodeWardRecord(encoded, key)`, in `case-file.js`,** returning
`migratePlanTriState(sanitizeObjectData(await decryptJSONWithKey(encoded,
key)))`. Export it; `recovery-cache.js` imports it and deletes its own
`sanitizeObjectData()` and inlined pipeline.

**B2. Extract the four-field encrypt fan-out into
`encryptCaseFileCore({ guardianInfo, parties, cases, dismissedPartyPairs
}, key)`,** returning the four ciphertext strings (or whatever shape
`buildCaseFileBlob()`'s manifest currently expects — match its existing
output exactly, do not redesign the manifest). `saveSessionRestoreCache()`
calls the same function.

**B3. Extract the matching decrypt side as
`decryptCaseFileCore(manifestFields, key)`,** and **resolve the
try/catch asymmetry explicitly rather than picking one side's behavior by
accident.** Recommendation: keep `case-file.js`'s per-field try/catch
(partial recovery is strictly better for a `.sav` **import** — the "The
file's data for ... has been modified" error already exists per-ward, so a
per-field version for the case-wide arrays is consistent) and bring
`recovery-cache.js` up to the same standard, rather than the reverse. This
is a **behavior change for `checkSessionRestoreCacheAtLaunch()`** — say so
explicitly in the commit message, since Decision-quality changes buried in
a "consolidation" commit are exactly what this repo's audit history keeps
finding.

**B4. Update both callers** (`importSavArchiveOrWard()`,
`checkSessionRestoreCacheAtLaunch()`, `buildCaseFileBlob()`,
`saveSessionRestoreCache()`) to call the four shared functions in place of
their inlined logic.

### Verification

1. `npx vitest run tests/unit/case-file.spec.js` (confirm this file exists
   and covers `buildCaseFileBlob`/`importSavArchiveOrWard`; if coverage is
   thin, that is itself a finding worth a comment in the PR, not a blocker
   for this milestone) plus any recovery-cache-specific spec.
2. **Round-trip test, both paths:** export a `.sav` with a populated case
   (guardian info, 2+ parties, 2+ wards, a dismissed-party pair), re-import
   it, and diff the result against the pre-export state. Do the same for
   the session-restore cache (save, then restore).
3. **Corruption test for B3's behavior change:** deliberately corrupt one
   non-ward field (e.g. truncate the `parties` ciphertext) in a saved
   session-restore cache and confirm `checkSessionRestoreCacheAtLaunch()`
   now recovers the rest instead of failing outright — this is the
   regression gate for the behavior change, and it must be written and
   shown red against the pre-B3 code before B3 lands, per this repo's
   red-first convention.

### Cross-cutting ramifications (`AGENTS.md` §8)

- **Data Model:** N/A — no field shape changes.
- **Legacy Data Migration:** **Not N/A.** B3 changes what happens when an
  existing session-restore cache (created before this change) has a
  corrupted non-ward field — verify against a cache blob shaped by the
  *old* code, not only newly-created ones.
- **Test Coverage & Index:** the corruption-recovery test in Verification
  step 3 is new coverage; add it to whichever spec file already covers
  `recovery-cache.js`, or create one and add a `TEST-INDEX.md` row.
- **Export/Import/Portability:** directly implicated — this is the `.sav`
  export/import and session-restore-cache path.
- **Security & Sensitivity:** N/A — no change to what gets encrypted, with
  what key, or under what security mode.
- **UI/UX Consistency:** B3 changes the session-restore-cache failure mode
  from "all-or-nothing" to "partial recovery" for one class of corruption —
  a user sees more of their data survive a corrupted cache than before,
  never less.
- **Legal/Compliance:** N/A.

---

## 52C — IndexedDB Store-Opener: One Function, Not Two

**Risk: Low.** Per Decision 2, this is deliberately narrow.

### Files

`src/core/persistence/launch-preferences.js`, `src/core/persistence/recovery-cache.js`.

### Steps

**C1. Extract `openIndexedDbStore(dbName, storeName)`** — the
`new Promise((resolve, reject) => { ... indexedDB.open ... onupgradeneeded
... onsuccess ... onerror ... })` body shared identically by
`_launchPrefDb()` (`launch-preferences.js:19-27`) and `_sessionCacheDb()`
(`recovery-cache.js:10-18`) — into `launch-preferences.js` (it is already
the lower-level of the two; `recovery-cache.js` already imports from it).
Export it.

**C2. `_launchPrefDb()` becomes `() => openIndexedDbStore(LAUNCH_PREF_DB,
LAUNCH_PREF_STORE)`; `_sessionCacheDb()` becomes `() =>
openIndexedDbStore(SESSION_CACHE_DB, SESSION_CACHE_STORE)`.** Both keep
their existing names and export signatures — only the body changes — so no
caller anywhere needs to change.

**C3. Leave every get/put/delete/clear wrapper exactly as-is**, per
Decision 2.

### Verification

`npx vitest run` on whichever specs cover `launch-preferences.js` and
`recovery-cache.js` (confirm which via `TEST-INDEX.md` before assuming
none do), plus a manual check: clear IndexedDB in a dev profile, reload,
confirm "has opened before" and remembered-file-handle behavior still work,
and confirm a session-restore cache still round-trips.

### Cross-cutting ramifications (`AGENTS.md` §8)

- **Data Model / Legacy Data Migration / Export / Security / UI / Legal:**
  N/A across the board — pure internal refactor, zero behavior change, two
  different database names and store names untouched.
- **Test Coverage & Index:** no new tests needed; existing coverage of both
  files' public functions already exercises the opener indirectly.

---

## 52D — Window-Backed Getter/Setter Pattern: One Factory, Same Assignments

**Risk: Low**, contingent on Decision 3's design actually being followed —
see Verification for the check that proves it was.

### Files

`src/core/persistence/crypto.js`, `src/core/persistence/case-file.js`,
`src/core/state.js`.

### Background

Nine pairs share one shape: a module-private variable, a getter that
prefers `window._x` when defined, a setter that writes both.

| Module | Pairs |
| --- | --- |
| `crypto.js` | `getCryptoKey`/`setCryptoKey` (`:10-22`), `getSecurityMode`/`setSecurityMode` (`:24-...`) |
| `case-file.js` | `getCaseFileHandle`/`setCaseFileHandle` (`:33-45`), `isDirtySinceExport`/`setDirtySinceExport`, `getLastExportAt`/`setLastExportAt` |
| `state.js` | `getCaseFile`/`setCaseFile`, `getD`/`setD` (`window.D` — the one name in this group with real `legacy-app.js` consumers), `getAppState`/`setAppState`, `getTemplateCache`/`setTemplateCache` |

### Steps

**D1. Add a factory to `src/core/state.js`** (the lowest-level of the three
modules, already imported by both others):

```js
export function windowBackedRef(read, write, initial) {
  let _value = initial;
  return {
    get: () => { const w = read(); return w !== undefined ? w : _value; },
    set: (v) => { _value = v; write(v); },
  };
}
```

**D2. Convert each pair to call the factory, keeping each module's own
literal `window._x = ...` line inside its `write` closure** — per Decision
3, this is the whole point of passing closures instead of a key string.
Example (`crypto.js`):

```js
const _cryptoKeyRef = windowBackedRef(
  () => (typeof window !== 'undefined' ? window._cryptoKey : undefined),
  (v) => { if (typeof window !== 'undefined') window._cryptoKey = v; },
  null,
);
export const getCryptoKey = _cryptoKeyRef.get;
export const setCryptoKey = _cryptoKeyRef.set;
```

Repeat for all nine pairs across the three files, preserving each pair's
existing exported function names (so no caller changes).

**D3. `getD`/`setD` keep their extra `window.D` truthiness check** (`state.js:49`:
`if (typeof window !== 'undefined' && window.D)`, not `!== undefined` —
`window.D` is checked for truthiness, not mere definition, unlike the other
eight). Do not silently normalize this to match the other eight; if it
should change, that is a separate decision with its own reasoning, not a
side effect of deduplication.

### Verification

1. **The governance-file check that proves Decision 3 held:** run
   `node scripts/audit-window-bridge.mjs` before and after, and diff the
   output. The assignment count and the `D` entry's file list must be
   **identical** before and after. If they are not, the factory design
   leaked bracket-notation somewhere and needs to be fixed before this
   lands, not accepted as an acceptable side effect.
2. `npx vitest run` on whichever specs cover `crypto.js`, `case-file.js`,
   `state.js` directly (check `TEST-INDEX.md`), plus
   `tests/unit/window-bridge.spec.js` (should need no regeneration at all,
   per the point above).
3. A full app smoke pass: unlock with a password (exercises
   `getCryptoKey`/`setCryptoKey`), switch wards (`getCaseFile`/`setCaseFile`,
   `getD`/`setD`), reload with an active case (`getAppState`/`setAppState`,
   `getTemplateCache`/`setTemplateCache` via template loading).

### Cross-cutting ramifications (`AGENTS.md` §8)

- **Data Model / Legacy Data Migration / Export / Legal:** N/A.
- **Test Coverage & Index:** no new spec files; existing coverage of the
  nine functions' public behavior is unchanged and should still pass
  unmodified.
- **Security & Sensitivity:** `getCryptoKey`/`setCryptoKey` are the one pair
  in this group holding actual key material. The factory does not change
  where that material lives (still `window._cryptoKey` plus a module
  closure, exactly as today) — only how the getter/setter bodies are
  generated. No new exposure.
- **UI/UX Consistency:** N/A — no behavior change, verified by step 1 above
  in the most literal sense available (byte-identical tool output).

---

## 52E — `escapeHtml()`: Two Duplicates Merged, One Divergent Variant Documented

**Risk: Low.**

### Files

`src/core/filing/readiness-card.js`, `src/core/filing/output-advisories.js`,
`src/core/form/form-fields.js` (documented, not changed).

### Background

`readiness-card.js:22-26` and `output-advisories.js:3-7` are behaviorally
identical (`&<>"'` all escaped), implemented two different ways — a chained
`.replace()` in one, a single regex with a character map in the other.
`form-fields.js:6-13`'s `esc()` escapes `&<>"` but **not** apostrophe — a
real, not cosmetic, difference. But `esc()` has **zero external
callers** (verified: not exported to `window`, not imported by any other
file — every one of its ~25 call sites is inside `form-fields.js` itself,
building Tier 1 field-primitive HTML where every attribute is
double-quoted, so an unescaped apostrophe is not a syntactic hazard today).
It is a real inconsistency in the abstract, but not one causing any
cross-module divergence in practice, and its ~25 call sites give it far
more blast radius to touch than the other two combined.

### Steps

**E1. Extract one shared `escapeHtml(value)`** — behaviorally the union of
the two identical versions (unchanged) — into a small shared module.
`src/core/filing/` has no existing "shared utility" file at this level;
recommend `src/core/filing/output-advisories.js` keeps owning and exporting
it (it is already imported by `readiness-card.js` for
`renderOutputAdvisories`-adjacent reasons — confirm the actual import graph
before finalizing, since `readiness-card.js` importing from
`output-advisories.js` should not create a cycle) rather than inventing a
new file for one four-line function.

**E2. `readiness-card.js` deletes its copy and imports the shared one.**

**E3. Leave `form-fields.js`'s `esc()` alone**, per the background above.
Add a one-line comment at its definition noting the apostrophe difference is
known and intentional-by-inaction, so it stops looking like an oversight to
the next auditor.

### Verification

`npx vitest run` on whichever specs cover `readiness-card.js` and
`output-advisories.js`'s rendered HTML (check `TEST-INDEX.md`), confirming
output is byte-identical before/after for a label containing all five
special characters (`&<>"'`).

### Cross-cutting ramifications (`AGENTS.md` §8)

- **Data Model / Legacy Data Migration / Export / Security / Legal:** N/A.
- **Test Coverage & Index:** no new spec; existing readiness-card/
  output-advisories coverage should be sufficient — extend it with one
  all-five-characters case if it does not already have one.
- **UI/UX Consistency:** zero rendered-output change (the two merged
  functions already agreed).

---

## 52F — Attorney-Fallback Carry-Over: One Helper, One Resolved Divergence

**Risk: Medium.** Per Source note 3, the two functions do not agree on
fallback order today. **This is no longer an open question** — F1's
reachability check came back positive against real data-model shapes, and
Alan has decided the order. Both are recorded below as Decision 6.

### Files

`src/core/navigation/ward-lifecycle.js`, `src/legacy-app.js`.

### Background

`carryOverFieldsForPlan()` (`ward-lifecycle.js:88-...`) and
`carryOverFieldsForAccounting()` (`:218-...`) each independently destructure
`caseNum`, `gName`, and five `atty*` fields from an arbitrary source ward,
both carrying inline comments recording that the same Milestone 40C-F item 2
bug (Guardian Inventory's nested `src.attorney.{name,...}` shape not being
read by the flat-only chains) had to be found and fixed in both places
separately — direct evidence the duplication has already cost real
debugging time once. `legacy-app.js:3604-3618`'s `carryOverFields()` has a
third, similarly-shaped inline block for the same intent, reached from a
different call site.

**The divergence that must be resolved, not merged over:** `attyName`'s
fallback order differs between the two —
`src.attorneyForGuardian || attyFlat || src.attorney_name ||
src.attorneyName || atty.name` in the Plan version vs.
`src.attorneyName || src.attorney_name || src.attorneyForGuardian ||
atty.name || attyFlat` in the Accounting version. Every other field
(`caseNum`, `gName`, the other four `atty*` fields) uses the same order in
both.

### Decision 6 — F1 resolved positive; authoritative fields win

**F1's answer: yes, reachable, on two real shapes, not a hypothetical.**
`probate-guardian-data-model.csv` documents both pairs as independently-set
fields on the *same* ward type:

- `guardian_inventory` row 158: `attorneyForGuardian` — "Initial Inventory
  cover field; distinct from accounting attorney." Row 284:
  `attorney.name` (i.e. `atty.name` in the code above) — "Party field,"
  required. Two separate inputs on the same ward.
- `plan_initial` row 806: `attorneyName` — **in the CSV's own words**,
  "Cosmetic-only cover display field, distinct from the validated
  `attorney_name` certification field." Row 836: `attorney_name` itself,
  required.

Neither existing function actually implements a consistent policy once this
is known: the Plan version checks the cosmetic `attorneyForGuardian` before
the authoritative `atty.name`; the Accounting version checks the cosmetic
`attorneyName` before the authoritative `attorney_name`. Both get the
Guardian Inventory pair, the Plan Initial pair, or both backwards.

**Alan's decision: the authoritative field wins.** `extractCarryIdentity()`
(F2 below) uses the order

```js
const attyName = src.attorney_name || atty.name || src.attorneyForGuardian
  || src.attorneyName || attyFlat || '';
```

— the two validated/Party fields (`attorney_name` for Plan- and
Accounting-shaped sources, `atty.name` for Guardian-Inventory-shaped ones)
checked first, in either order relative to each other since a given source
ward's own shape populates at most one of the two; the three cosmetic
fields (`attorneyForGuardian`, `attorneyName`, `attyFlat`) as fallback,
also mutually exclusive by ward shape in practice, so their relative order
does not matter the way the authoritative-vs-cosmetic split does. This is a
real behavior change from both existing functions for the two documented
divergent cases, and is a genuine improvement, not a coin flip: a
certification field is what makes the filing legally accurate, and a
cover-page label is exactly what the data model already calls it —
cosmetic.

### Steps

**F2. Extract `extractCarryIdentity(sourceWard)`** returning `{ caseNum,
gName, attyName, attyBar, attyPhone, attyEmail, attyStreet,
attyCityStateZip }`, using Decision 6's order for `attyName`, into
`ward-lifecycle.js`. Both `carryOverFieldsForPlan()` and
`carryOverFieldsForAccounting()` call it and use the result for the fields
that were previously duplicated inline, keeping whatever plan-specific or
accounting-specific logic follows in each function untouched.

**F3. Investigate `legacy-app.js:3604-3618`'s copy before touching it** —
its own comment ("the same defect... in three" places) suggests it may
already be aligned with one of the two `ward-lifecycle.js` orderings, or it
may have a fourth, undiscovered order. If it reaches the same end state via
`extractCarryIdentity()`'s output shape, convert it to call the shared
function (it can, per Milestone 51's Decision 6-adjacent precedent for
similar carry-over inlining — `carryOverFields()` already calls into
`ward-lifecycle.js`-owned logic elsewhere for county/party resolution). If
it does not fit cleanly, document why in the commit message rather than
forcing it.

### Verification

1. **A fixture explicitly designed to exercise Decision 6:** a source ward
   with `attorneyForGuardian` (or `attorneyName`) **and** `atty.name` (or
   `attorney_name`) both set to different non-empty strings. Confirm the
   pre-change functions each produce their old, differing result, and the
   post-change shared helper produces the authoritative field's value for
   both — this is the regression gate proving Decision 6 actually landed,
   not just that the two functions now agree with each other.
2. `npx vitest run` on whichever specs cover carry-over (check
   `TEST-INDEX.md` for `ward-lifecycle` coverage) plus
   `tests/e2e/carryover-workflow.spec.ts` if it exists.
3. Manual carry-over test, Guardian Inventory → each of the four Plan types
   and → each of the three Accounting types, confirming attorney fields
   populate as expected in both directions, with particular attention to
   any existing test fixture or manual case that has both an authoritative
   and a cosmetic attorney field populated — Decision 6 changes its result.

### Cross-cutting ramifications (`AGENTS.md` §8)

- **Data Model:** N/A — reads existing fields, writes no new shape. Decision
  6 is grounded directly in `probate-guardian-data-model.csv`'s existing
  field descriptions; no CSV change needed.
- **Legacy Data Migration:** N/A — a carry-over is a point-in-time copy
  operation, not a stored-data migration; no existing `.sav` file's stored
  shape is affected.
- **Test Coverage & Index:** the distinguishing fixture in Verification
  step 1 is new, targeted coverage — add it to the carry-over spec (or
  create one) with a `TEST-INDEX.md` row.
- **Export/Import/Portability:** N/A.
- **Security & Sensitivity:** N/A.
- **UI/UX Consistency:** **directly implicated.** For any source ward with
  both an authoritative and a cosmetic attorney field populated, the
  attorney name that appears after a carry-over changes from whichever this
  document's inconsistent status quo happened to produce to the
  authoritative field's value, on both carry-over directions. This is the
  intended effect of Decision 6, not a side effect to be minimized.
- **Legal/Compliance:** an attorney's name on a filing is not a
  form-validation nicety. Decision 6 was made with that weight — the choice
  favors the field the data model itself calls validated/certification over
  the one it calls cosmetic — but it remains a product decision made by
  Alan, not a legal-sufficiency determination; this document does not
  assert that the certification field is always the one that should appear
  on every filing type, only that it is the more defensible default absent
  a type-specific reason otherwise.

---

## 52G — `checkSignatureState()` Call Shape, `readiness-config.js`

**Risk: Low.** Single file, mechanical.

### Files

`src/core/filing/readiness-config.js`.

### Background

The call shape `checkSignatureState({ state: inferLegacySignatureState(
person.signatureState, person.signatureDate), date: person.signatureDate,
image: person.signatureImage, sectionLabel, roleLabel, filingType,
datePath, imagePath }).length === 0` (parameter names vary slightly by call
site) is repeated 8 times across the four Plan `*Automatic()` functions
(confirmed at current line numbers: `:57`, `:109`, `:116`, `:171`, `:194`,
`:233`, `:244`, `:250`), varying only the person object, `sectionLabel`,
`roleLabel`, and (for guardian calls) whether the result also gates on
`has(g0.name)`.

### Steps

**G1. Extract `signedAndDated(person, { sectionLabel, roleLabel,
filingType, datePath, imagePath })`** returning the boolean, wrapping the
existing `checkSignatureState(...).length === 0` shape exactly. Keep
`inferLegacySignatureState()` called the same way inside it.

**G2. Replace all 8 call sites.** For the 4 guardian-signature call sites
that also check `has(g0.name)`, keep that check at the call site (it is
about a different field, not part of the signature-state shape) — do not
fold it into the helper.

### Verification

`npx vitest run` on the four `plan-*-parity.spec.js` files plus
`tests/unit/readiness-predicate-coverage.spec.js` — between them these
assert the exact issue codes/readiness items each Plan type emits and
would catch any accidental change to which fields gate readiness.

### Cross-cutting ramifications (`AGENTS.md` §8)

- **Data Model / Legacy Data Migration / Export / Security / UI / Legal:**
  N/A — pure internal refactor within one file, identical boolean output
  for identical input.
- **Test Coverage & Index:** no new spec needed; existing parity specs are
  the gate.

---

## 52H — Vendor-Script Loader Pattern: One `loadGlobalScript()`

**Risk: Low**, with one behavioral improvement folded in deliberately.

### Files

`src/core/pdf/html2pdf-loader.js`, `src/core/excel/exceljs-loader.js`.

### Background

Both files: check whether the vendor global already exists → return it if
so → otherwise cache a loading `Promise` → inject a `<script>` tag →
resolve on load, **null out the cached promise and reject on error** (so a
later call can retry). Confirmed identical shape at current line counts (53
and 64 lines respectively). `src/core/pdf/pdfjs-loader.js` uses a different
mechanism (dynamic `import()`, not a `<script>` tag) and has no `window.*`
bridge, and its own `ensurePdfjs()` does **not** null out its cached promise
on failure — a known, separate issue, out of scope here (see "Deliberately
out of scope") since fixing it is a one-line change to a different loading
strategy, not a consolidation.

### Steps

**H1. Extract `loadGlobalScript(src, { check })`** — `check` is a
zero-arg function returning the already-loaded global if present, `src` is
the script URL — returning a cached `Promise` that resolves to `check()`'s
result once the script loads, nulls itself on error, and injects the
`<script>` tag with the same attributes (`async`, etc. — match whichever of
the two currently sets what and keep the union) into a shared module.
`src/core/pdf/` or a new `src/core/vendor-loader.js` are both reasonable
homes; recommend the latter since neither `pdf/` nor `excel/` should own a
utility the other imports from.

**H2. `html2pdf-loader.js` and `exceljs-loader.js` both call it,** keeping
their own exported function names (`getHtml2Pdf`, `getExcelJS`) and their
own `window.*` bridges exactly as today (per Milestone 51's finding that
`window.getExcelJS` is itself unused — **do not re-litigate that here**;
51E already deleted it, and this sub-delivery must not resurrect it as a
side effect of moving code around).

### Verification

`npx vitest run` on whichever specs cover PDF/Excel loading (check
`TEST-INDEX.md`), plus a manual pass: generate a PDF and an Excel export in
the same session (exercises both loaders), and force one script load to
fail (block the request in devtools) to confirm the retry-after-failure
behavior both files already have is preserved by the shared helper.

### Cross-cutting ramifications (`AGENTS.md` §8)

- **Data Model / Legacy Data Migration / Export / Security / Legal:** N/A.
- **Test Coverage & Index:** no new spec required if existing coverage
  already exercises both loaders' success and failure paths; if it does
  not, add a failure-path case for at least one and note it in
  `TEST-INDEX.md`.
- **UI/UX Consistency:** N/A — both loaders keep their exact current
  behavior, including the retry-on-failure semantics.

---

## 52I — PDF Byte-Decoding Helpers: Import, Don't Reimplement

**Risk: Low.** Confirmed byte-identical or logically-equivalent in every
case.

### Files

`src/core/pdf/pdf-engine.js`, `src/core/pdf/supplemental-pdf.js`,
`src/core/pdf/pdf-preview.js`, `src/core/images/png-dimensions.js`.

### Background

- `pdf-engine.js:424-430`'s local `dataUrlToBytes` closure is byte-identical
  in logic to `supplemental-pdf.js:14-20`'s exported `dataUrlToBytes`;
  `pdf-engine.js:27` already imports other functions from
  `supplemental-pdf.js` in the same `import { ... } from
  './supplemental-pdf.js'` statement.
- `pdf-engine.js:432-437`'s local `isPdfBytes` checks the same four-byte
  `%PDF` header as `supplemental-pdf.js:22-24`'s exported `isPdfBytes`, via
  an explicit `bytes[0]===0x25 && ...` chain instead of
  `PDF_HEADER.every(...)` — logically equivalent, including for
  too-short-input, since an out-of-range array index reads `undefined`,
  which fails the `=== value` check the same way an explicit length guard
  would.
- `pdf-preview.js:43-48`'s local `base64ToBytes` is byte-identical to
  `png-dimensions.js:13-18`'s exported version, which `pdf-engine.js` and
  `signature-pad.js` already import correctly.

### Steps

**I1. `pdf-engine.js`: delete the local `dataUrlToBytes`/`isPdfBytes`
closures, add both names to its existing `supplemental-pdf.js` import.**

**I2. `pdf-preview.js`: delete the local `base64ToBytes`, import it from
`../images/png-dimensions.js`.**

### Verification

`npx vitest run` on whichever specs cover `pdf-engine.js`, `pdf-preview.js`,
`supplemental-pdf.js` (check `TEST-INDEX.md`), plus a manual PDF-preview and
supplemental-PDF-attachment pass — these three functions sit on the
annotation/attachment path, not the primary court-form generation path, so
the blast radius is narrower than Milestone 51D's Excel work, but still
worth a real click-through rather than unit tests alone.

### Cross-cutting ramifications (`AGENTS.md` §8)

- **Data Model / Legacy Data Migration / Security / Legal:** N/A.
- **Test Coverage & Index:** no new spec needed.
- **Export/Import/Portability:** touches the supplemental-PDF-attachment and
  PDF-preview paths; the primary court-form PDF path (`pdf-engine.js`'s main
  export functions) is unaffected beyond these two helper swaps.
- **UI/UX Consistency:** N/A — identical output for identical input.

---

## 52J — Legacy Combobox Keyboard Navigation: One Shared Handler

**Risk: Medium**, per Decision 4 — this closes a real capability gap, not
just code shape.

### Files

`src/legacy-app.js`.

### Background

Four hand-rolled comboboxes, all already sharing `comboboxFilterItems()`
(`:3948`), `comboboxRenderDropdown()` (`:3953`), and `comboboxHide()`
(`:3968`):

| Combobox | Keydown handler | Arrow-key nav |
| --- | --- | --- |
| Ward selector | `onWardSelectorKeydown` (`:4016`) | **Full** — Up/Down/Home/End/Enter/Escape, `aria-activedescendant`/`aria-selected` kept in sync |
| County (per Milestone 50H) | inline, near `:1414-1479` | Full (confirmed during Milestone 51's scoping) |
| Ward-name modal | inline in `initWardNameCombobox` (`:4359`) | **None** — Escape only |
| Convert-source | `onConvertSourceKeydown` (`:4901`) | **None** — Escape and Enter (`preventDefault` only) only |

### Steps

**J1. Extract `bindComboboxKeyboardNav(input, dropdown, { onSelect })`**
from `onWardSelectorKeydown()`'s complete implementation (Up/Down/Home/End/
Enter/Escape, `aria-activedescendant`/`aria-selected` maintenance), generalized
over which option gets "picked" on Enter (each combobox's existing pick
callback).

**J2. Ward selector and the county combobox call the shared handler**
(replacing their own inline implementations with a call to the shared one —
confirm the county combobox's existing behavior is a strict match before
switching it, since it was implemented separately during Milestone 50H and
may have small differences worth preserving intentionally rather than
overwriting).

**J3. `initWardNameCombobox()` and the convert-source dropdown adopt the
shared handler,** gaining Up/Down/Home/End navigation they do not have
today.

**J4. Do not touch `comboboxFilterItems()`/`comboboxRenderDropdown()`/
`comboboxHide()`** — already shared, not part of this finding.

### Verification

1. **Keyboard-only manual pass, all four surfaces:** open each combobox
   without a mouse, navigate with arrow keys, confirm Home/End jump to the
   first/last option, confirm Enter selects the highlighted option and
   Escape closes without selecting, and confirm a screen reader (or the
   accessibility tree in devtools) announces the active option via
   `aria-activedescendant` for all four, not just the two that already had
   it.
2. `npx playwright test` on whichever e2e specs exercise ward switching,
   ward-name entry, and case-type conversion (check `TEST-INDEX.md`) — add
   a keyboard-navigation assertion to each if none exists, since this is
   new behavior with no regression coverage today.
3. Confirm the existing mouse/click interaction with all four is unchanged
   — this sub-delivery adds a capability, it does not remove or alter the
   pointer path.

### Cross-cutting ramifications (`AGENTS.md` §8)

- **Data Model / Legacy Data Migration / Export / Security / Legal:** N/A.
- **Test Coverage & Index:** new keyboard-navigation assertions needed for
  the ward-name and convert-source e2e coverage; update `TEST-INDEX.md`
  descriptions to mention keyboard coverage if the rows don't already.
- **UI/UX Consistency:** **directly implicated, positively** — all four
  comboboxes behave the same way for keyboard users after this lands,
  where two currently do not.

---

## 52K — Guardian Inventory Excel Schedule Layout: One Page/Row Map

**Risk: Medium.** Sits on the Excel import/export path for the Verified
Initial Inventory, same caution class as Milestone 51D/51F. Per Decision 5,
wait for Milestone 51D to land before starting (see "Sequencing").

### Files

`src/features/guardian-inventory/excel.js`.

### Background

Each of the 11 schedules' page/row layout is hand-typed twice: once inside
its `fillScheduleXX()` writer (e.g. Schedule A-1's `pages=[{name:'A-1-REAL
ESTATE pg 1',rows:[27,32,37,42]},...]` at `:116`) and again inline in the
`readRows([{sheet:'A-1-REAL ESTATE pg 1',rows:[27,32,37,42]},...], ...)`
call inside `parseInitialInventoryWorkbook()` (`:473` and following, one
call per schedule through roughly `:494` as of this writing — confirm exact
end line at implementation time given 51D's in-flight edits to this file's
top). The two copies use different key names for the same field (`name` on
the writer side, `sheet` on the reader side) but otherwise identical
sheet-name strings and row-number arrays. A template renumbering fixed on
one side and not the other would silently desync export and import for
that schedule.

### Steps

**K1. For each of the 11 schedules, hoist its `{ sheet, rows }` array (or
array-of-arrays, for the multi-page ones) to one module-level constant** —
e.g. `SCHEDULE_A1_PAGES`, matching the existing per-schedule naming already
implicit in the function names (`fillScheduleA1`, `scheduleA1`).

**K2. `fillScheduleXX()` writers reference `SCHEDULE_XX_PAGES.map(p =>
({ name: p.sheet, rows: p.rows }))` or, if the `name`/`sheet` key
difference has no actual consumer that cares about the property name
(check: is `name` vs `sheet` read anywhere by generic code, or only by
each function's own destructuring?), standardize on one key name and update
both sides to use it directly with no mapping needed.**

**K3. `parseInitialInventoryWorkbook()`'s `readRows(...)` calls reference
the same 11 constants.**

### Verification

This is the sub-delivery in this milestone closest in shape to Milestone
51D/51F, and should be held to the same standard:

1. `npx vitest run tests/unit/xlsx-extract.spec.js` (and any other spec
   covering Guardian Inventory Excel import/export — check `TEST-INDEX.md`).
2. **Byte-comparison export gate:** generate a Verified Initial Inventory
   Excel export from a fully-populated fixture (all 11 schedules with
   multiple rows, enough to span every page) before and after this change,
   and diff cell-by-cell. Passing tests are not sufficient evidence a
   filed-with-the-court workbook is unchanged.
3. **Round-trip import gate:** import the export from step 2 and confirm
   the resulting `D.scheduleXX` arrays are identical to the fixture that
   produced it, for all 11 schedules, including the last row on the last
   page of each (the boundary most likely to reveal an off-by-one between
   the writer and reader maps if K1/K2 introduced one).

### Cross-cutting ramifications (`AGENTS.md` §8)

- **Data Model:** N/A — no persisted shape change.
- **Legacy Data Migration:** N/A for export. For import, this is precisely
  the path that populates `D` from an uploaded workbook — the round-trip
  gate above is the safeguard.
- **Test Coverage & Index:** the round-trip gate in Verification step 3 is
  new coverage if it does not already exist at this granularity; add it and
  update `TEST-INDEX.md`.
- **Export/Import/Portability:** directly implicated — this is the whole
  sub-delivery.
- **Security & Sensitivity:** N/A.
- **UI/UX Consistency:** N/A — no UI, workbook layout must be byte-identical
  per the verification gate.
- **Legal/Compliance:** this workbook is filed with a Florida probate
  court. The byte-comparison and round-trip gates are what make "unchanged"
  a checked claim rather than an assumption, consistent with how Milestone
  51D treated the same class of risk.

---

## 52L — Test-Suite Duplication: Three Shared Support Helpers

**Risk: Low.** Test-only changes; no production code touched.

### Files

`tests/unit/bar-number.spec.js`, `tests/unit/checklist-export-parity.spec.js`,
`tests/unit/form-fields-legacy-delegation.spec.js`,
`tests/unit/field-kind-inference.spec.js`,
`tests/unit/filing-type-enumeration-guard.spec.js`,
`tests/unit/content-corrections.spec.js`,
`tests/unit/native-dialog-guard.spec.js`,
`tests/unit/security-source-audit.spec.js`,
`tests/unit/form-contract.spec.js`, `tests/unit/live-region.spec.js`,
new files under `tests/unit/support/`, `TEST-INDEX.md`.

### Background, re-verified against current `master`

- **Brace-slicing "extract a function out of legacy-app.js" algorithm**,
  reimplemented three times: `bar-number.spec.js:11`'s `loadFormatBarNumber()`,
  `checklist-export-parity.spec.js:177`'s `sliceFunction()`,
  `form-fields-legacy-delegation.spec.js:27`'s `extractFunction()` — the
  third's own comment says it is copying "the technique
  tests/unit/bar-number.spec.js already established," i.e. by hand, not by
  import.
- **Source-tree file walker**, reimplemented five times with two shapes:
  `field-kind-inference.spec.js:20` and
  `filing-type-enumeration-guard.spec.js:55` both define an identical
  `walk(dir, out=[])`; `content-corrections.spec.js:28` and
  `native-dialog-guard.spec.js:22` both define a near-identical `scanDir(dir)`;
  `security-source-audit.spec.js:23` does the same job with Node's
  `{ recursive: true }` `readdirSync` option instead of manual recursion.
- **Fake-DOM-element mocks**, reimplemented independently — **corrected
  count: 2 files, not 3** (Source note 2 above):
  `form-contract.spec.js`'s `createMockInput()` and `live-region.spec.js`'s
  `createMockDocument()` both rebuild an attrs-`Map`-backed
  `getAttribute`/`setAttribute`/`hasAttribute`/`removeAttribute`, and (one
  of the two) a `classList` Set-backed add/remove/contains.
  `tests/unit/combobox-controller.spec.js`, the third file the original
  audit named, no longer exists (deleted by Milestone 51A along with the
  dead class it tested).

### Steps

**L1. `tests/unit/support/legacy-source-extract.js`** — export
`extractLegacyFunction(name, { from = 'src/legacy-app.js' } = {})`,
generalizing the three brace-counting implementations (confirm they are
actually identical in brace-matching logic, not just intent, before
collapsing them — a subtle difference in how one handles a brace inside a
template-literal or comment would be a real regression, not a style
nit). `bar-number.spec.js`, `checklist-export-parity.spec.js`, and
`form-fields-legacy-delegation.spec.js` import it and delete their local
copies.

**L2. `tests/unit/support/source-scan.js`** — export
`walkSourceFiles(dir, { extensions } = {})`, generalizing the five
walkers (the `{ recursive: true }` version in `security-source-audit.spec.js`
is functionally equivalent to manual recursion but only correct on a Node
version that supports the option — check the repo's `engines`/`@types/node`
version already assumes it, since `package.json` pins `@types/node: ^26.5.1`,
which should be recent enough; confirm rather than assume). All five files
import it and delete their local walker.

**L3. `tests/unit/support/dom-mocks.js`** — export a `createMockElement()`
primitive covering the attrs-`Map` and `classList`-`Set` behavior both
`form-contract.spec.js` and `live-region.spec.js` need. Each file's
existing `createMockInput()`/`createMockDocument()` becomes a thin wrapper
around the shared primitive if their specific needs diverge, or a direct
alias if they don't — check both before assuming one shape fits.

**L4. Update `TEST-INDEX.md`** for the three new support files (matching
`support/plan-readiness-parity.js`'s existing row, if it has one — if it
doesn't, this is a good place to add rows for all four support files at
once) and confirm the ten affected spec files' descriptions still match
what they test (none of this changes what they test, only how, so
descriptions should be unaffected — verify rather than assume for the same
reason `AGENTS.md` §7 exists).

### Verification

`npx vitest run tests/unit/bar-number.spec.js tests/unit/checklist-export-parity.spec.js tests/unit/form-fields-legacy-delegation.spec.js tests/unit/field-kind-inference.spec.js tests/unit/filing-type-enumeration-guard.spec.js tests/unit/content-corrections.spec.js tests/unit/native-dialog-guard.spec.js tests/unit/security-source-audit.spec.js tests/unit/form-contract.spec.js tests/unit/live-region.spec.js` —
all ten must pass unchanged (same assertions, same pass/fail outcomes) after
switching to the shared helpers. A test that only passes because the shared
helper is subtly more permissive than the original is a hidden coverage
loss, not a successful consolidation — check what each spec is actually
asserting before and after, not just that it stays green.

### Cross-cutting ramifications (`AGENTS.md` §8)

- **Data Model / Legacy Data Migration / Export / Security / UI/UX / Legal:**
  N/A — test-only.
- **Test Coverage & Index:** three new support files, `TEST-INDEX.md`
  updated in the same commit per §7. No spec's actual coverage changes;
  only its implementation does.

---

## Sequencing and concurrency

**Multi-agent note.** As of this writing, another agent is executing
Milestone 51 on this same tree: 51A/51B/51C/51E landed, 51D staged
uncommitted pending a full regression run, 51F not yet started (touches
`legacy-app.js` plus the three feature `index.js` files). That agent has
confirmed it will not touch source while its regression is in flight and
will sync before each remaining step. Before starting **any** sub-delivery
below, sync with `master` and re-check `git log` — per `AGENTS.md` §1, a
proposal's "safe to parallelize" call must be verified against actual file
overlap at the time work starts, not assumed from this document's snapshot
of the tree.

**The collision this section originally warned about no longer applies —
recorded here for anyone reading this document's history rather than its
current state.** 52A is the only sub-delivery in this document that adds
`window.*` names, which means it regenerates
`tests/unit/fixtures/window-bridge-allowlist.json` and
`src/core/types/window-bridge.d.ts` — the same two generated files every
Milestone 51 sub-delivery also touched. Per Milestone 51's own "Sequencing
and concurrency" section, a conflict in a generated file has no correct
manual resolution; the fix is always "regenerate from merged source." At
first publication, Milestone 51 was still in flight (51D staged, 51F not
started) and this section blocked 52A until it landed in full. **Milestone
51 has since landed completely, including 51H and 51I**
(`MILESTONE-51-PROPOSAL.md`), so 52A carries no live collision risk as of
this update — before starting it, still run
`node scripts/audit-window-bridge.mjs` first to confirm the tree is quiet,
per the general sync-before-starting rule above, but no other milestone's
work is known to be pending against these two files.

**52K similarly waited on Milestone 51D specifically** (not all of 51),
per Decision 5 — 51D was actively editing `guardian-inventory/excel.js`,
uncommitted, at first publication. 51D landed as `5328954`; 52K is
unblocked.

**Everything else in this document (52B, 52C, 52D, 52E, 52F, 52G, 52H, 52I,
52J, 52L) touches no file Milestone 51 touched and adds no `window.*` name**
(52D by explicit design — see Decision 3 and its verification gate) **and
was never blocked by Milestone 51's work in the first place.**

**Suggested order, by risk ascending, now that nothing in this document is
blocked:**

1. **52L** — test-only, zero production risk, and its shared helpers make
   writing 52A's new regression tests (which need a `window` stub) and
   52K's round-trip test slightly easier if landed first.
2. **52C, 52E, 52G, 52I** — low risk, single-purpose, no shared-file
   contention with each other.
3. **52D** — low risk but should land as its own reviewable commit given
   the governance-file verification gate in its own Verification section.
4. **52A** — medium risk; no longer needs to wait on anything, but still
   deserves its own commit given the scope grew from one bridge to three
   during scoping (Source note 4) and touches the same governance files as
   52D just above it — land them as separate commits, not combined, so a
   governance-file regeneration mistake in one is easy to isolate from the
   other.
5. **52K** — medium risk, Excel export/import correctness path; unblocked
   now that 51D is committed.
6. **52B** — medium risk, case-load/session-restore path; land with the
   corruption-recovery test written first (red, per this repo's
   convention), then green.
7. **52F** — medium risk. F1's reachability question is answered and
   Decision 6 is settled, so F2 is no longer gated — sequenced here on risk
   alone, not on a pending answer.
8. **52J** — medium risk, user-facing keyboard behavior change; land last,
   so it is reviewed against an otherwise quiet tree, matching Milestone
   51's own reasoning for sequencing 51F last.

## Acceptance criteria

| Scenario | Expected result |
| --- | --- |
| `node scripts/audit-window-bridge.mjs`, before vs. after 52D | Assignment list and `D`'s file entries byte-identical |
| `node scripts/audit-window-bridge.mjs`, before vs. after 52A | Exactly three new assignments, all in `legacy-app.js` or `case-file.js`: `getRecentlyOpenedWards`, `addToRecentlyOpened`, `formatRelativeTime` |
| Switch between two wards, then open the dashboard | `getRecentlyOpenedWards()` reflects the switch; the continue-prompt banner appears once with a real relative-time string, does not crash, and does not reappear on a second visit without switching again (52A) |
| `.sav` export → import round-trip, populated case | Identical case data before and after |
| Session-restore cache save → restore round-trip | Identical case data before and after |
| Session-restore cache with one corrupted non-ward field | Restores the other fields instead of failing outright (52B) |
| Carry-over fixture with divergent attorney-name candidates, Guardian → each Plan and Accounting type | Both functions produce the authoritative field's value, not just the same value as each other (52F, Decision 6) |
| All four legacy comboboxes, keyboard-only | Arrow-key navigation, Home/End, Enter-to-select, Escape-to-close all work identically on all four (52J) |
| Verified Initial Inventory Excel export, fully populated, all 11 schedules | Byte-identical to the pre-52K export from the same fixture |
| Verified Initial Inventory Excel import of that export | Identical resulting `D.scheduleXX` arrays, including last-page/last-row boundaries |
| PDF preview and supplemental-PDF attachment flows | Unchanged behavior after 52I |
| Ten affected unit specs (52L) | Same assertions pass/fail identically after switching to shared support helpers |
| `MILESTONE-52-PROPOSAL.md` | Amended in place with a dated "Landed" note per sub-delivery, per repo convention |

## Verification plan

Per sub-delivery, the targeted specs named in each **Verification** block
are the lite gate (`AGENTS.md` §1). Three sub-deliveries warrant more:

- **52B** — recommend a full `npm test` to Alan before committing: it
  changes the case-load and session-restore paths, which is exactly the
  "broad, cross-cutting, touches shared/core modules" case that rule names.
- **52K** — same recommendation, for the same reason Milestone 51D got one:
  it is an Excel export/import path for a document filed with a Florida
  probate court, and the byte-comparison/round-trip gates in its
  Verification section are manual checks no spec covers on its own.
- **52F** — not a full-suite case on its own. F1's question is answered and
  Decision 6 is settled, but do not treat "the code compiles and tests
  pass" as sufficient evidence Decision 6 actually landed — Verification
  step 1's distinguishing fixture is the only check that proves the
  authoritative field wins rather than merely proving the two functions
  agree with each other.

For 52A's regression test and 52B's corruption-recovery test, follow this
repository's red-first convention: write the test, confirm it fails against
current `master` for the reason this document describes (an uncaught
`TypeError`, or an all-or-nothing recovery failure), then make the change
and confirm it turns green.

## Deliberately out of scope

Named here so they are not rediscovered as omissions:

- **`pdfjs-loader.js`'s missing retry-on-failure reset** (mentioned in 52H's
  Background) — a genuine small bug (one cached-promise failure poisons all
  future calls in that session), but it is a fix to a *different* loading
  strategy (dynamic `import()`, no `<script>` tag, no `window` bridge), not
  a consolidation with the two files 52H actually touches. Worth a
  one-line follow-up commit on its own.
- **Unifying `launch-preferences.js`'s and `recovery-cache.js`'s
  get/put/delete error-handling contracts** (52C, Decision 2) — the
  multi-key/throw vs. fixed-key/swallow difference is load-bearing for each
  file's actual use case and merging it is a behavior change with its own
  question to answer, not a byproduct of sharing the opener.
- **`form-fields.js`'s `esc()` apostrophe gap** (52E) — real, but
  self-contained and zero-blast-radius today; documented rather than
  changed.
- **The county combobox's exact keyboard-nav implementation vs. the ward
  selector's** (52J, J2) — both are believed equivalent but were built in
  separate milestones (50H vs. earlier); confirm before overwriting rather
  than assuming.
- **The two defects the Milestone 51 agent found while executing 51 — landed,
  not deferred.** The disappearing co-guardian card (a stale
  `visiblePendingGuardianIndex` surviving a `normalizeGuardians()` reindex)
  and the redundant `label`/`for` pairing on the terms checkbox that had
  been shadowing 51's test gates both landed as **Milestone 51H and 51I**
  (`0db1258`, 2026-09-15), inside Milestone 51 itself, at Alan's direction —
  not deferred to a future milestone as this entry previously said. Neither
  was ever one of the twelve findings this document covers, so nothing else
  in MS52 changes as a result; this note exists only so a reader who
  remembers the earlier "future milestone" wording doesn't go looking for
  them here or elsewhere. See `MILESTONE-51-PROPOSAL.md`'s 51H/51I sections
  for the fix, root cause, and verification.
- **The formula-injection sanitizer tab/CR gap** Milestone 51 also parked —
  a security judgment for a qualified reviewer, unrelated to duplication,
  and explicitly not decided by either milestone document.
