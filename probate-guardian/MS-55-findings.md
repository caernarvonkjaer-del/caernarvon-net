# Findings from Executing Milestone 56

**What this covers.** Milestone 56 corrected `help/index.html` against the
shipped app after Milestones 54 and 55 and one authorized side task left it
behind. This document records what the execution *found* — the failures, the
places the proposal was wrong, the gates that turned out weaker than they
looked, and the questions it answered that had been guesses. It is not a
summary of what shipped; `MILESTONE-56-PROPOSAL.md` carries that, marked
Landed with per-sub-delivery SHAs.

**Why it is worth reading even if you did not work on 56.** Most of what
follows is not about the user guide. It is about how a claim written in a
proposal becomes a claim nobody re-checks, and about gates that pass without
proving anything. Both recurred here after four rounds of review, which is the
reason to write them down rather than fix them quietly.

Executed 2026-09-17, commits `e3556e1` … `2def658`.

**Closing verification.** Unit: 935/935 across 81 files. E2E: **599 passed, 6
skipped, 0 failed** (20.8 min, chromium, `source` target), with Playwright's
own exit code read directly rather than through a pipe — see §2 for why that
distinction is in this document at all. The earlier run of the same suite
failed; §1 is what it caught.

---

## 1. One hard failure: a guard nobody in the loop knew about

The closing full-suite run failed
`tests/e2e/skip-classification-audit.spec.ts`:

> no spec calls `test.skip()` directly outside the classified skip helpers

56G added `tests/e2e/guide-screenshots.spec.ts`, a capture harness for the
guide's figures, and gated it with `test.skip(process.env.PG_CAPTURE !== '1')`.
That is exactly the pattern Milestone 31 Phase 0.3 banned: every dynamic skip
must go through `support/target-profile.ts`'s three classified helpers
(`skipExpectedTargetExclusion` / `skipEnvironmentLimitation` /
`skipTemporaryGap`) so a skip reason is always machine-classifiable as well as
human-readable.

**Fixed in `2def658`, and deliberately not by an allowlist entry.** The audit's
own comment says to add one *"only with a documented reason a classified helper
genuinely cannot express — not as a migration shortcut."* This is not a target
exclusion, an environment limitation, or a temporary gap. It is a capture
harness that is not a test. So the file now **registers no tests at all**
unless `PG_CAPTURE=1`, rather than three unclassifiable skips.

That turned out to be the better answer on its own merits, not just a way past
the audit: a plain run reports `0 tests in 0 files` for that spec instead of
three skips, and three skips would have implied three tests waiting to be
enabled, which was never true.

**The transferable point.** A repository this old accumulates guards that
encode decisions the current work has no reason to know about. Grepping
`tests/` for existing audits before adding a spec would have caught this in
seconds. The audit did its job; the cost was only that it fired at the end of a
21-minute run instead of at the start.

---

## 2. A reporting error worse than the failure

The first full e2e run was invoked as:

```bash
npx playwright test 2>&1 | tail -40
```

The pipeline's exit status is `tail`'s, not Playwright's, so the run reported
**exit code 0 while Playwright had failed**. The failure was in the captured
output the whole time; it was summarized rather than read, and reported upward
as a pass.

This is the more serious of the two problems in this section, because the first
one is a mistake and this one is a *method* that makes mistakes invisible.

**The rule that follows:** when a command's exit status is the thing being
relied on, do not put it in a pipeline. Redirect and check explicitly:

```bash
npx playwright test > run.log 2>&1; echo "EXIT: $?"; tail -6 run.log
```

Anywhere a long run's result is reported to a human, the pass/fail line must
come from the runner's own summary or its exit code, never from the absence of
visible errors in a truncated tail.

---

## 3. Two gates that passed without proving anything

### 3a. Fault injections that were silent no-ops

56H's design calls for five fault injections, because a gate that cannot fail
is not evidence. On the first run, **two of the five did not go red — and
neither was a guard failure.** Both injections silently failed to inject:

| Injection | Why it did nothing |
| --- | --- |
| 1 — add a retired term back to the guide | Anchored on `<h3>Excel export details</h3>`, which 56B had since changed to `<h3 id="excel-scope">…</h3>`. The string replace matched nothing. |
| 5 — remove one surface of a multi-surface control | Asserted `>= 2` occurrences of `id="help-toggle-btn"` in `legacy-app.js`; there is exactly one. The script bailed before mutating. |

Both were corrected and both then went red naming their target. But a
no-op injection and a working gate produce *the same green result*. Nothing in
the output distinguishes "the guard correctly tolerated this" from "nothing was
actually changed."

**The rule that follows:** an injection script must assert that it mutated
something — compare the file before and after, or count the marker and require
the count to change — and fail loudly if it did not. An injection that cannot
prove it injected is not evidence either.

### 3b. A test that is vacuous by construction

56H's spec ends with:

```js
it('records its exclusions rather than silently omitting them', () => {
  for (const [id, reason] of Object.entries(EXCLUSIONS)) { … }
});
```

`EXCLUSIONS` is empty — every control in 56H's mandatory coverage set turned
out to have a stable marker, including "View User Guide", which the proposal
had flagged as probably needing exclusion. So the loop iterates zero times and
the test passes trivially. It was nonetheless counted in the reported "19
passed" as though it were evidence.

Both of its branches have since been fault-injected (an exclusion with an empty
reason; an ID both registered and excluded) and both fire correctly, so the
test is **latent rather than broken** — it will police the first exclusion
anyone adds. But today it polices nothing, and reporting it inside a green
count overstated the coverage.

**The rule that follows:** a test that iterates a collection proves nothing
while the collection is empty. Either say so where the count is reported, or
give it a fixture that guarantees at least one case.

---

## 4. Three things the proposal asserted that execution found false

All three had survived four rounds of critical review. All three were found by
re-deriving the claim against the source rather than reading the document.

### 4a. The stale-screenshot list was wrong in both directions

56G named five figures as showing retired UI. Opening the images rather than
trusting their `alt` text gave a different list:

- **"Signature radio buttons and the Draw tab"** and **"An applied signature
  stamp"** both showed the retired **Type** tab in the strip. Three stale
  signature figures, not one. Their `alt` text mentions no tab, so a
  text-driven triage would have shipped two stale figures.
- **"Print Preview page with toolbar"** — named in the proposal as the figure
  lacking All Filings / theme / Help — **already showed all three** and was
  kept. Re-shooting it would have added bytes and risk for nothing.
- The figure that actually demonstrated that claim was **"Print Preview showing
  required fields still missing"**, which the proposal never named.

### 4b. H3a's coverage table under-counted two controls

`data-feedback-open="bug"` and the Pinellas GovQA link render on **two**
surfaces, not one: the dashboard toolbar (`features/dashboard/index.js`) *and*
the Start New Form page (`legacy-app.js`'s `pageInventorySelector()`).

This is precisely the limitation 56H names and says nothing detects — *"the
list catches a surface that disappears, not one that is added"* — and it
surfaced during 56H's own construction, in the table meant to be its ground
truth.

### 4c. `data-shell-action="toggle-help"` is in four files, not three

`index.html:117` carries it on the Help panel's own close **×**. Same action,
different control. So `shell-help`'s registry evidence keys on
`id="help-toggle-btn"`, which matches exactly the three "?" buttons — filing
shell, dashboard, Preview banner — and excludes the close button.

Worth keeping in view: an *action* attribute is not always a *control*
identifier. Where several controls share an action, the marker has to be
narrower than the action.

---

## 5. Guesses replaced by evidence

**Does a blocked Print Preview carry the shell controls?** One existing figure
showed a blocked preview whose banner had none of All Filings / theme / Help,
which would have meant 56E's "every filing type" wording was overstated.

Rather than reason about it, `guide-screenshots.spec.ts` navigates to a
deliberately blocked `/print` and counts the markers:

```json
{ "blockedBannerHasAllFilings": 1, "blockedBannerHasTheme": 1,
  "blockedBannerHasHelp": 1, "previewBlocked": 2 }
```

All three present while genuinely blocked. The old image predates the change.
56E's wording holds for the blocked state, and now says so as a verified fact.

**"View User Guide" has a stable marker.** The proposal flagged it as possibly
needing exclusion from 56H for lack of one. It has `data-shell-action=
"export-help"` at `index.html:124`, so it registers.

**The e2e baseline moved for reasons unrelated to 56.** The suite went from 586
tests to 608. Only 3 of those are 56's. The rest are Milestones 55A–55D and the
Preview-banner side task, which landed after the last full run. Checked rather
than assumed, because an unexplained count change is the kind of thing that
gets waved through.

---

## 6. Left undone, deliberately

- **Four pre-existing figures exceed the 150 KB cap** G1 pins. They are
  accurate, and re-encoding an accurate figure is the churn G0 argues against.
  The cap governs the six images 56G captured; all six are well under it.
- **`help/index.html` is still 11.4 MB** (down from 11.8). Scoped out as a
  packaging question, not a correctness one.
- **The reverse drift direction** — app controls the guide never documents —
  remains ungated, as 56H's scope note says. Finding 9 of the original eleven
  was in that category and was found by a human, and the next one will be too.
- **Annotating the whole guide.** 56H covers its mandatory coverage set; the
  rest of the guide carries no `data-app-control` markers.

---

## 7. What to carry forward

1. **Grep `tests/` for existing audits before adding a spec.** Guards encode
   decisions from milestones you have no reason to have read.
2. **Never read a run's result through a pipe.** `cmd | tail` discards the exit
   code. Redirect, echo `$?`, then tail.
3. **Make fault injections prove they injected.** Otherwise a no-op is
   indistinguishable from a passing gate.
4. **Do not count a vacuous test in a green tally.** An empty collection makes
   its test unfalsifiable.
5. **Re-derive a document's factual claims at execution time.** Every one of
   §4's three errors survived four rounds of review and died the moment
   someone ran a `grep` against current `master`. The proposal says
   "re-derive every line number at execution time"; the same applies to every
   file list, count, and table in it.
6. **Look at the artifact, not its metadata.** Three stale screenshots were
   invisible in `alt` text and obvious on sight.

---

*Companion documents: `MILESTONE-56-PROPOSAL.md` (what shipped, with SHAs),
`MILESTONE-55-PROPOSAL.md` (the work whose drift 56 corrected),
`TEST-INDEX.md` (the two new specs and the one whose scope changed).*
