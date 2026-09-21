# Milestone 63: Navigation & Status Fixes — Proposal

## Status

**Draft — a proposal, not a work order. Authorizes no change** (`AGENTS.md` §3).
Nothing in this document has been implemented. Items 63A–63E are written up;
further items will be appended as they are raised.

| Item | Summary | Status |
| :-- | :-- | :-- |
| **63A** | Guardian Inventory marks six pages incomplete but never says why | **IMPLEMENTED 2026-09-21** (D1: explain, don't block; D2: wording for all filing types; D11's R5 bound **triggered — split to 63F**) — unit 1614/1614; 199 affected e2e passed, 0 failed; see the implementation record under 63A |
| **63B** | Certificate of Service: the "no recipients" Yes/No (57B) is shown to every filer, not only when it applies | **IMPLEMENTED 2026-09-21** (D3: shown only while it applies; D4: 57B recorded as landed without a recorded authorization) — unit 1353/1353; 151 affected e2e passed, 0 failed; see the implementation record under 63B |
| **63C** | Hosted build: a failed feature chunk reloads the page instead of showing the "could not be loaded" panel | **IMPLEMENTED 2026-09-21** (D5 + D12: panel, no auto-reload, with Amendment A) — unit 1340/1340; hosted-build profile 34 passed, 0 failed; see the implementation record under 63C |
| **63D** | The preparer's signature-authorization note is on 6 of the 16 pages that capture a signature, and on one page that doesn't | **IMPLEMENTED 2026-09-21** (D6: the note on all 16 signing pages, none elsewhere; Simplified Part III's copy moved to Part IV) — unit 1587/1587; 80 affected e2e passed, 0 failed; see the implementation record under 63D |
| **63E** | UCN on the printed filing, on the Case # line of the header, all forms | **IMPLEMENTED 2026-09-21** (D7: page 1 one line, running header UCN over Case #; D8: optional, omitted when blank; D9: Plan - Minors prints UCN and Case # separately; D10: Excel does not carry it) — unit 1631/1631; 245 affected e2e passed, 0 failed; see the implementation record under 63E |
| **63F** | Three pages the sidebar marks incomplete that the validators cannot list (Simplified Part III, Plan-Annual 3G, Plan-Minor Preparer & Attorney) — split from 63A's R5 | **IMPLEMENTED 2026-09-21** (D13: option 1) — unit 1637/1637; the invariant walk is strict again (no exemptions); see the implementation record under 63F |

---

## 63A — Guardian Inventory: six pages show "incomplete" with no explanation

### What a filer sees

On a Guardian Inventory (Initial Inventory), the sidebar shows a red **−**
next to a section until it is complete, and the filing-progress card counts it
("16 of 17 sections complete"). On most pages, a yellow box under the page
lists exactly what is missing, each item a link that jumps to the field.

**On six pages that box never appears, so the filer is told something is
wrong and not what:**

| Page | Sidebar mark | Explanation on the page |
| :-- | :-- | :-- |
| Cover | yes | **never** |
| D-1 Guardian Attestation | yes | **never** |
| D-2 Preparer & Attorney | yes | **never** |
| D-3 Audit Fee & Safe Deposit | yes | **never** |
| D-4 Bond & Surety Info | yes | **never** |
| D-5 Certificate of Service | yes | **never** |

The reported case: D-4 shows a red **−** and "16 of 17 sections complete", the
page has every visible field filled in, and the only thing missing is the
*"Has the surety bond been waived by court order?"* Yes/No answer. Nothing on
the page points at it.

This is not limited to D-4 (which is how it was first reported): it is those
six pages — Cover and all five D pages.

### Why it happens

Three separate decisions are made for a page, and they are coupled by
accident:

1. **Is the section incomplete?** (drives the sidebar mark and the progress
   count) — `computeNavChecks()` in `src/legacy-app.js`. For Guardian it
   tracks 17 keys: Cover, the 11 schedules, D-1 to D-5.
2. **Does incompleteness block the Next button?** — `isScheduleIncomplete()`.
   For Guardian it consults a hand-written list, `SCHEDULE_NAV_KEYS`
   (`legacy-app.js:6483`), containing only the 11 schedule keys, and returns
   "not incomplete" for anything else.
3. **Show the explanation?** — the yellow box is rendered **only when
   decision 2 says the page is blocked**.

So the explanation is tied to the Next-button gate, and the gate's list is
narrower than the sidebar's. Cover and D-1..D-5 fall in the gap: marked
incomplete by (1), invisible to (2), therefore never explained by (3).

The explanation machinery itself works. Checked directly: the D-4 validator
emits `"D-4 — Please indicate whether the surety bond has been waived (Yes or
No)."` (`guardian-inventory/index.js:1270`); `renderLocalSectionGuidance()`
given that error for `/d4` produces the correct list item with a working
`/d4` jump link. It simply is never called for these pages.

### Is this the same bug elsewhere? — findings

**On other filing types: no.** Checked mechanically (see Verification): for
every filing type, every page that carries a sidebar completeness mark is also
explained.

| Filing type | Pages with a mark | Pages explained | Gap |
| :-- | --: | --: | :-- |
| **Guardian Inventory** | 17 | 11 | **Cover, D-1..D-5** |
| Simplified Accounting | 7 | 7 | none |
| Annual / Final / Trust Accounting (one engine) | 24 | 24 | none |
| Plan — Simplified | 3 | 3 | none |
| Plan — Annual | 11 | 11 | none |
| Plan — Initial | 10 | 10 | none |
| Plan — Minor | 7 | 7 | none |

The other six engines cannot drift this way because their Next gate is
*derived from* the same completeness map the sidebar reads (`fullKey in
r.checks`) — there is no second list to fall out of date. Guardian is the only
type with a separate hand-maintained list, which is the root cause, not the
missing D-page keys.

(Annual has had two smaller cases of this same family fixed already — its
Cover looked up the wrong key `'a-cover'` instead of `'a-p1'`, and
Final/Trust Accounting had no gate at all; both recorded in
`MILESTONE-ARCHIVE.md` around line 6478. Same class: a page's gate lookup
missing its own completeness key.)

**Related problems found on the same surface** — different symptoms, listed
so scope can be decided (per `AGENTS.md` §8.9, reported here rather than
silently folded in):

| # | Finding | Filer impact | Verified by | Suggested disposition |
| :-- | :-- | :-- | :-- | :-- |
| R1 | **`isScheduleIncomplete()` exists twice** — `legacy-app.js:7165` (used on every edit, to live-patch the Next button and box) and `guardian-inventory/index.js:288` (used when the page first renders). | A fix applied to only one would make the box appear on page load and vanish on the first keystroke, or the reverse. | Read both | **In scope for 63A** — must be one implementation. |
| R2 | The live patch **clears** the explanation box whenever the page is not blocked (`legacy-app.js:7223`, `...:''`). | Same as R1: any explanation rendered on load is wiped by the next edit unless this changes too. | Read | **In scope for 63A.** |
| R3 | The disabled-Next tooltip and the fallback banner use schedule-only wording — *"Add at least one item, or check the box verifying there are none, before continuing."* — on **every** page of **every** type (`legacy-app.js:7209, 7223`; `guardian-inventory/index.js:301, 306`). | On a signature or bond page, hovering a disabled Next says to add an item or tick "none" — wrong advice. Today reachable on the non-schedule pages of the other types (e.g. Annual Part III). The list of real missing fields beneath is correct; only the tooltip/fallback text is wrong. | Read; **since reproduced in a browser on all six non-Guardian engines** (readiness review, below) | Originally scoped to the six Guardian pages; **widened to all filing types by D2 (decided 2026-09-21).** |
| R4 | `computeSectionStatus()` (`core/status/section-status.js`) looks up an unprefixed key, but non-Guardian completeness keys are prefixed (`a-p3`, `pi-p2` …). | None today — nothing in production calls it (only its own unit test). Would misreport every non-Guardian page as incomplete if wired up. | Read; grep for callers | **Out of scope** — dormant; noted so it isn't wired up unaware. |

### Correcting the diagnosis that prompted this

The problem was first diagnosed by the Claude Chrome extension reading the
deployed `legacy-app.js`. Its mechanism is right. Four things in its proposed
fix should not be carried over:

1. **It changes more than the reporter complained about.** Adding `d1..d5` to
   `isScheduleIncomplete()`'s list also **disables the Next button** on those
   pages. The complaint was "no indication of why it's marked incomplete" — the
   button was never mentioned. Whether Next should block is a separate
   product decision (D1), and the current behavior is documented as
   deliberate (below).
2. **It misses Cover**, which has the identical gap.
3. **It patches one of two copies** (R1), so the box would flicker in and out.
4. **It would put schedule wording on D-4's disabled Next** (R3): *"Add at
   least one item, or check the box verifying there are none"* on a page whose
   missing item is a Yes/No bond question.

### On "by design"

The current behavior is recorded as intentional in three places —
`guardian-inventory/index.js:284-287` ("Cover, Summary, D-1..D-5, and Print
are never gated this way"), `MILESTONE-ARCHIVE.md:6468`, and
`tests/e2e/navigation-status.contract.spec.ts` (lines 15-16, 263-270,
363-371). Reading them, what is recorded is *that* those pages aren't gated
and, in the test file, that Guardian "doesn't fit the shared loop" — not *why*
a filer should be left without an explanation. Milestone 24's stated goal was
"a shared section-status/guidance helper used by sidebar, Summary, Next, Print
Preview, and export gates" (`MILESTONE-ARCHIVE.md:4302`) — one status, shown
consistently. The test file itself concedes the consequence: *"#page-local-guidance
never actually renders a jump link for them in the live product — there is no
on-page UI surface to click through here."*

So: **not gating Next on these pages may well be intended; leaving the filer
without an explanation is not something any document argues for.** 63A treats
the two separately.

### Proposed change

**Split the conflated predicate** into two, both defined once, both used by the
initial render and the live patch:

- `is this section incomplete?` — derived from the same completeness map the
  sidebar uses, for **every** filing type. Drives the explanation box.
- `does incompleteness block Next here?` — a per-type policy. Every type except
  Guardian: all pages (unchanged). Guardian: the 11 schedule pages (unchanged,
  **pending D1**).

Effect: on Cover and D-1..D-5, when the section is incomplete, the same yellow
*"Complete these items before continuing"* box appears, listing what is
missing with jump links. Whether Next is also disabled is whatever the policy
says. For the six pages the box heading and any tooltip use wording that fits
a required-field page, not the schedule wording (R3).

Retire `SCHEDULE_NAV_KEYS` as a *gate* list (it stays where it genuinely means
"the 11 schedule pages": the schedule-empty validation at
`guardian-inventory/index.js:1219`).

### Decision needed — D1: should Next also be blocked on Cover and D-1..D-5? — **DECIDED 2026-09-21: option 1** (explain, don't block)

Per `AGENTS.md` §3: numbered options, one recommended, each stated by what the
filer observes.

1. **Explain, but don't block (recommended).** On D-4 with the bond question
   unanswered, the filer sees the yellow box naming it, with a link that jumps
   to the Yes/No. Next still works; the red **−** stays until it's answered.
   Nothing that could be navigated before is now stuck; solves exactly what was
   reported; matches the current, documented "never gated". Cost: Guardian
   remains different from the other six filing types, where an incomplete page
   also blocks Next.
2. **Explain and block.** Same box, and Next is greyed out on those six pages
   until they're complete — including Cover on a brand-new inventory, which
   would need every Cover field before the filer can press Next (Simplified,
   Annual and the Plans already work this way). Full consistency across forms.
   Cost: a filer waiting on a document (say, the bond paperwork) can no longer
   page forward with Next from D-4 to D-5 — they'd have to use the sidebar —
   and it reverses documented behavior. Needs a decision on Cover separately,
   since a blocked Cover Next is the most noticeable change.
3. **Block D-1..D-5 only** (the extension's proposal). Not recommended: leaves
   Cover inconsistent with everything else, for no stated reason.

**Recommendation: option 1 for 63A. If cross-form consistency of blocking is
wanted, do it as a follow-up 63B** — with the predicate split, that is a
one-line policy change, and it can be decided on its own.

### Decision needed — D2: wider tooltip/fallback wording (R3) — **DECIDED 2026-09-21: option 2** (all pages, all filing types)

1. **Six Guardian pages only (recommended)** — ships with 63A; D-4 doesn't get
   schedule advice.
2. **All pages, all filing types** — fixes the wrong tooltip on the other
   types' non-schedule pages too. Touches every filing type's disabled-Next
   text; small, but a broader change than the reported problem.

**Consequence of the D2 decision (option 2) for scope:** 63A now also rewrites the
disabled-Next tooltip and fallback banner for **all seven engines** — the two
sites in `legacy-app.js` (`:7209`, `:7223`, shared by six of them) and the two
in `guardian-inventory/index.js` (`:301`, `:306`). Wording rule: a **schedule**
page keeps *"Add at least one item, or check the box verifying there are
none, before continuing."*; every **other** page says *"Complete the required
items on this page before continuing."* (working text — to be confirmed at
implementation, not a decision). The wrong-tooltip finding (R3) was not
exercised in a browser for the other types, so the implementation starts by
reproducing it on one non-schedule page per type, and the invariant walk
gains an assertion that no non-schedule page shows schedule wording.

### Milestone checklist (`AGENTS.md` §8)

1. **Data model** — none. No persisted field is added or changed;
   `probate-guardian-data-model.csv` untouched.
2. **Legacy data migration** — none; nothing stored.
3. **Fixture & factory audit** — none: no new required field.
4. **Test coverage & index** — see below.
5. **Export / import / portability** — none. This is on-screen guidance only.
   Export validation (`validateGuardian()`), readiness, and the sidebar rules
   are unchanged, so the readiness-vs-export invariant is untouched.
6. **Security & sensitivity** — none; no new stored data.
7. **UI/UX consistency** — reuses the existing `.section-local-guidance`
   yellow box and jump-link pattern from `renderLocalSectionGuidance()`; no
   new component.
8. **Legal / compliance** — none asserted. The box repeats what
   `validateGuardian()` already reports; it does not say a filing is or isn't
   legally sufficient.
9. **Cross-form consistency** — done above: the other six engines were read and
   mechanically compared. Classification: **defective** for Guardian (no
   authority — the court's forms have no notion of a Next button, so nothing
   requires the divergence), **consistent** for the rest.

### Test plan

Red-first (`AGENTS.md` §7): each new test must be shown failing against
current code before the fix.

- **Structural guard (unit) — the class-level protection.** For every filing
  type, every page that gets a completeness mark must also get an
  explanation. This is the check used to produce the table above; committed as
  a source-scan spec (the same technique `date-truncation-helpers.spec.js`
  and others use for classic-script code), so a future page or filing type
  can't reintroduce the gap unnoticed. Proposed: `tests/unit/section-guidance-coverage.spec.js`.
- **Predicate behavior (unit)** — the split predicates as pure functions:
  incomplete-but-not-gated (Guardian D-4) → explained, Next enabled;
  incomplete-and-gated (Guardian A-1) → explained, Next disabled; complete →
  neither. Proposed alongside the extracted module.
- **`TEST-INDEX.md`** rows for each new spec, same commit.
- **e2e — named, deferred under the standing hold:** `navigation-status.contract.spec.ts`
  needs a Guardian D-4 / Cover case (box appears, jump link lands on the
  bond-waived radio) and its header and comments at lines 15-16, 263-270 and
  363-371 rewritten, since they state the box "never renders" for these pages.
  Not run or edited until the hold is lifted.

### Files expected to change

`src/legacy-app.js` (`isScheduleIncomplete`, `updateCurrentScheduleNextButton`),
`src/features/guardian-inventory/index.js` (`isScheduleIncomplete`, `pageNav`),
one new small module for the shared predicates (pure, unit-testable), the two
new unit specs, `TEST-INDEX.md`. (D1 is decided as explain-only, so no
`window-bridge` allow-list change is expected.) Per D2 (all filing types),
the tooltip/fallback text sites listed above change in all seven engines.

### Verification of this write-up — what was and wasn't checked

Checked, by me:
- Read both copies of `isScheduleIncomplete()`, `SCHEDULE_NAV_KEYS`,
  `trackedKeys`, `computeNavChecks()`, `updateCurrentScheduleNextButton()`,
  `pageNav()`, and `renderLocalSectionGuidance()`.
- **Coverage table**: an ad-hoc script compared each type's `PAGES_*` route
  list with the completeness keys `computeNavChecks()` produces and with what
  the Next gate can see. Result reproduced in the table above.
- Fed the D-4 validator's message to the real `renderLocalSectionGuidance()`:
  it returns the correct list item and `/d4` jump link, so the explanation
  would appear if called.
- **Reproduced in a browser** (one-off Playwright probe on the source build,
  since deleted), after the full-suite run:

  | Filing, page | Sidebar mark | Next | Explanation box |
  | :-- | :-- | :-- | :-- |
  | Guardian, Schedules A-1 / B-1 / C-5 (blank) | red | disabled | shown |
  | **Guardian, Cover** (blank) | red | enabled | **none** |
  | **Guardian, D-1 … D-5** (blank) | red | enabled | **none** |
  | **Guardian, D-4, only the bond question blank** | red | enabled | **none** |
  | Annual, Part I / Part III / Part IX (blank) | red | disabled | shown (7 / 5 / 3 items) |

  The D-4 case reproduced the reporter's screenshot exactly: sidebar card
  "FILING PROGRESS 94% — 16 of 17 sections complete — Jump to D-4 Bond & Surety
  Info −". Calling `renderLocalSectionGuidance('/d4', …)` directly in that
  state returns *"Complete these items before continuing: Please indicate
  whether the surety bond has been waived (Yes or No)."*; answering **No**
  turns the mark green. So the extension's remedy for the *mark* is right; the
  missing piece is only that the box is never asked to render.

**Readiness review, 2026-09-21 — R3 reproduced; one new finding (R5).** A
blank filing of each type was driven in a browser (source build). On every
non-schedule page of Annual (Cover/Part I, II, III, IV, V, IX, X), Simplified
(Cover, II–VI), Plan-Simplified, Plan-Initial (Cover, /p9), Plan-Annual
(Cover, Signatures) and Plan-Minor (Cover, /p6, /p7) the disabled Next's
tooltip reads *"Add at least one item, or check the box verifying there are
none, before continuing."* — R3 is real on all six non-Guardian engines, not
only from reading. Guardian is unaffected today because its D pages never
disable Next.

**R5 (new).** On a blank **Simplified Part III** and a blank **Plan-Minor
Preparer & Attorney** page the yellow box shows *only* the fallback sentence —
"Required to continue: Add at least one item, or check the box verifying there
are none…" — and lists no items. The filer is given advice that does not apply
and is not told what is missing: the same symptom as 63A's headline bug, on
two more pages, from a different cause (the validators' messages for those
pages are not routed to them; cause not isolated). Also observed:
Plan-Initial's attorney page is blank-complete (Next enabled, no box) —
consistent, not a defect. Disposition of R5: **in scope for 63A (D11, decided
2026-09-21).** The implementation starts by isolating why those two validators'
messages do not route to their pages, and fixes it there; the invariant walk
then asserts "lists ≥ 1 linked item" on every marked page, as in the pinned test
mapping.

**Bound on R5 (added after a second review).** Authorizing 63A authorizes a
time-boxed investigation of those two pages and the correction of their routing
**only if the cause is confined to those two validators' messages or their route
mapping.** If it needs a change to shared code beyond what D1/D2 already touch
(`adaptValidationErrors`, `errorRoute`, `renderLocalSectionGuidance`), or reaches
a third page, **stop and split it to 63F**: 63A then ships with those two pages
named as an explicit, commented exemption in the invariant walk ("box present"
only), and 63F is written up before anything further is built.

### What the existing tests say about this — effectiveness review

The full regression run after Milestone 62 (`npm test`: unit 1324/1324, e2e 696
passed / 14 failed / 6 skipped; the 14 are all the app rename, not this bug)
is itself evidence: **every test on this surface passed while the bug was
present**, including all 15 Guardian tests in `navigation-status.contract.spec.ts`,
all 13 in `guardian-inventory-mount.spec.ts`, and all 11 in
`dependent-question-gate.spec.ts`. None can detect it. Why:

| What is tested | Where | Covers the gap? |
| :-- | :-- | :-- |
| The sidebar/Summary **mark** is right for D-1..D-5 and Cover | `guardian-inventory-mount.spec.ts` (Summary badges vs sidebar vs `computeNavChecks()`); `dependent-question-gate.spec.ts` (Part IX mark) | No — tests the *red −*, which was never broken |
| The D-4 bond rule's **validator output** | `dependent-question-gate.spec.ts` | No — it navigates to `/d4` with the question blank (the reporter's exact state) and then asserts on `gateIssues()`, never on the page |
| The **explanation box** on Guardian | `navigation-status.contract.spec.ts` — 9 tests, **schedule pages only** (A-1, B-2 … C-5) | No — the six affected pages are outside it |
| D-1..D-5 **jump links** | same file, lines 372-497 | No — they call `focusFieldByPath()` directly *because* the box doesn't render there; their own comment says "there is no on-page UI surface to click through here" |
| The explanation box on the **other** types | same file, config-driven loop | Partly — one Cover page and one other page per type (~14 pages of ~64). The rest is correct **by construction**, not by test |

Three consequences:

1. **The tests document the gap rather than guard against it.** The file
   header (lines 15-16) and two comments (263-270, 363-371) state the six
   pages are "never gated, by design". A fix must rewrite those comments; no
   test asserts Next is *enabled* on those pages (only three `#page-next-btn`
   references exist), so a fix won't break an existing assertion.
2. **The invariant that matters was never a test:** *whenever the sidebar
   shows a section as incomplete, the page explains why.* Each half was
   tested; the link between them was not.
3. **My original proposal's structural guard is the weaker choice.** It was a
   source scan of the current mechanism (a page list vs a key list), so it
   would need rewriting the moment the mechanism changes — which 63A does. A
   browser walk tests the invariant itself.

### Revised test plan (replaces the "Test plan" above where they differ)

Red-first for each; the first two would have been red before this milestone.

1. **Invariant walk (e2e), one test per filing type — the class-level guard.**
   Create a blank filing, visit every page that has a sidebar mark, and assert:
   *mark is incomplete ⇒ the explanation box is present.* The probe above
   did exactly this for 17 Guardian pages plus 4 Annual pages in about 12
   seconds of navigation; per type it is a single short test with no data
   entry. **Today it fails for exactly six pages** (Cover, D-1..D-5), which is
   the red-first proof. It protects the seven filing engines against a future
   page or type reintroducing the gap, regardless of how the mechanism is
   implemented.
2. **Reporter's case (e2e), in `dependent-question-gate.spec.ts`** — it already
   arrives at D-4 with only the bond question blank. Add: the box lists the
   bond question, and its jump link focuses the Yes/No radios; answering
   clears the box and turns the mark green.
3. **Live-patch persistence (e2e)** — the R1/R2 regression: on a D page with an
   explanation showing, edit an unrelated field and assert the box is still
   there (a fix applied to one of the two `isScheduleIncomplete()` copies
   would pass the page-load check and fail this).
4. **Predicate behavior (unit)** — the split "is incomplete" / "blocks Next"
   predicates as pure functions, unchanged from the original plan.
5. **Source-scan guard (unit) — optional now.** Kept only as a fast pre-commit
   tripwire if wanted; no longer the primary guard.
6. `TEST-INDEX.md` rows for every new spec (same commit, `AGENTS.md` §7); the
   `navigation-status.contract.spec.ts` header and comments rewritten.

**Pinned test mapping** (added by the readiness review; supersedes the loose
names above). `tests/unit/test-index-guard.spec.js` fails the commit if an
index row is missing.

| # | Test | File | Kind | `TEST-INDEX.md` |
| :-- | :-- | :-- | :-- | :-- |
| 1 | Invariant walk: one test per filing type (7). Routes come from each type's sidebar `[data-nav]` links, not a hand list. Asserts, per page: mark incomplete ⇒ box present and lists ≥ 1 linked item (not the fallback sentence — R5); and no non-schedule page shows the schedule sentence (R3/D2). | **new** `tests/e2e/section-guidance-invariant.spec.ts` | e2e, source target | new row |
| 2 | Reporter's case: D-4 with only the bond question blank → box lists it, jump link focuses the radios, answering clears box and turns the mark green | `tests/e2e/dependent-question-gate.spec.ts` (11 → 13 cases with #3) | e2e | row updated |
| 3 | Live-patch persistence: on a D page, edit an unrelated field; the box stays (R1/R2) | same file | e2e | (same row) |
| 4 | Predicates and wording: "is incomplete" / "blocks Next" split; schedule vs non-schedule tooltip text | **new** `tests/unit/section-guidance-predicates.spec.js` | unit | new row |
| 5 | Comment rewrite only (they state the box "never renders" for these pages) | `tests/e2e/navigation-status.contract.spec.ts` header and the comment blocks at lines 15–16, 263–270, 363–371 | none | row note updated |

Tests 1–3 are red today (six Guardian pages; the D-4 case; the two-copy
problem); test 4 is red because the split does not exist. Run: `npx playwright
test tests/e2e/section-guidance-invariant.spec.ts tests/e2e/dependent-question-gate.spec.ts`
and `npx vitest run tests/unit/section-guidance-predicates.spec.js`.

Cost note: tests 1-3 are e2e, so they carry the ~25-minute full-regression
cost only when run as a suite; each new test is seconds.

### 63A — implementation record (2026-09-21)

**Changed.**
- New `src/core/status/section-guidance-policy.js` — the three questions, pure:
  `sectionCheckKey()` (route → `computeNavChecks()` key, every filing type; Annual's
  Cover stays `a-p1`), `isSectionIncomplete()` (the sidebar's own map),
  `blocksNext()` (per-type: the 11 Guardian schedule pages gate; Guardian Cover and
  D-1..D-5 explain but **never block Next** — D1; every other type gates every page it
  marks, unchanged) and `guidanceAdvice()`. Bridged as `window.sectionGuidancePolicy`
  (one new name, added to the window-bridge allow-list deliberately) and imported by
  `main.js`.
- `legacy-app.js`: `isScheduleIncomplete()` and `updateCurrentScheduleNextButton()`
  rewritten over the policy. The box is shown whenever the section is **incomplete**,
  not only when Next is blocked — clearing it whenever Next was unblocked is what would
  have wiped the explanation on the first edit (R2). `isScheduleIncomplete` keeps its
  name and meaning ("does incompleteness block Next on this route"); `SCHEDULE_NAV_KEYS`
  stays where it is and is passed in, so there is still exactly one list of the 11.
- `guardian-inventory/index.js`: the module's own copy of the gate is **deleted** (R1);
  `pageNav()` reads the same policy for the first render.
- **D2 wording**: the "Add at least one item, or check the box verifying there are none…"
  sentence is now shown only on a page that has that checkbox (the 11 Guardian schedules,
  Annual's schedules, Part VIII and Part XI, Simplified Part VII). Every other page says
  **"Complete the required items on this page before continuing."** Decided by the
  presence of the checkbox on the page, not by a list of page names.

**The bounded R5 investigation ran and triggered the stop-and-split rule.** Probed in a
browser on a blank filing, three pages (not two) show only the generic sentence:

| Page | Sidebar rule | Why the box has nothing to list |
| :-- | :-- | :-- |
| Simplified Part III (`/p3`) | period from and to filled, in order | the validator files those two fields under the **Cover** (`/`); the same fields are rendered on Part III, so a route mapping would need an alias in shared code |
| Plan-Annual 3G Insurance & Benefits (`/p4`) | a benefit chosen, or "none", or "other" (`legacy-app.js`) | **no validator rule exists** — nothing to list |
| Plan-Minor Preparer & Attorney (`/p7`) | preparer name, attorney name, attorney signature date | **no validator rule exists** for them |

That is not "confined to those two validators' messages or their route mapping": two of
the three need a new "what this page still wants" mechanism, one needs an alias in shared
code, and it reaches a third page. So per the bound recorded under R5, **63A did not
expand**: those three pages are named, commented exemptions from the invariant walk's
"lists an item" clause *only* (the box must still be present and its advice must still fit;
the exemption fails the test once a page starts listing items). Written up as **63F** below
— and then built, on the requester's instruction; see its implementation record.

**Tests (red first).** New `tests/unit/section-guidance-policy.spec.js` (27 cases; the
module did not exist). New `tests/e2e/section-guidance-invariant.spec.ts` (7, one per type):
before the change, Guardian failed on exactly Cover and D-1..D-5, Annual on every
non-schedule page (wrong tooltip, "tick a box that is not there"), and the others on
their non-schedule pages. Two cases added to `dependent-question-gate.spec.ts`: the
reporter's D-4 case (mark, box, jump link focuses the Yes/No, Next enabled, answering
clears the box and turns the mark green) and the live-patch case (the box survives an
unrelated edit) — both red before. One refinement made while writing the walk: on a blank
schedule the generic sentence *is* the right and only advice (there is nothing to jump
to), so the "lists an item" clause applies only where the page has no "none" checkbox.
`navigation-status.contract.spec.ts`: the header and two comment blocks that said the D
pages are "never gated / never render a jump link" rewritten; no assertion changed.
`TEST-INDEX.md` updated.

**One existing test broke because of this change, and was fixed.** `form-entry-ux.spec.ts`
("forgiving date normalization") located the Guardian Cover's date field by the bare
selector `[data-field-path="gid"]`. A blank Guardian Cover now shows its explanation box,
and the box's jump link to that field carries the same attribute, so the selector matched
two elements (Playwright strict-mode violation). Expectation-only fix: the selector is
scoped to `input[data-field-path="gid"]`, in that spec and in the three other places that
used the same bare form on the Guardian Cover (`form-entry.contract`, and two in
`persistence-recovery.contract` — which were not in the first run but would have failed
identically). Searched every e2e spec for other bare `data-field-path` selectors; the
remaining ones are on schedule pages that already had the box before 63A.

**Verification.** Full unit suite **1614/1614**; `npm run check:types` clean; window-bridge
and index guards pass. Source-target e2e — the invariant walk, `dependent-question-gate`,
`form-entry-ux`, `navigation-status.contract`, `print-preview-signature-jump` and the
seven per-type mount specs: **199 passed, 0 failed**. The full `npm test`
regression was **not** run here (once, after 63E).

---

## 63B — Certificate of Service: the "no recipients" question is shown to every filer

Raised 2026-09-21 from a screenshot of Simplified Part VI: *"I don't recall
requiring a yes/no check for signatures."*

### What a filer sees

On the Certificate of Service page of all three forms that have one — Initial
Inventory **D-5** ("Part VI"), Annual **Part X**, Simplified **Part VI** — a
Yes/No sits at the top of the Recipients section:

> No recipients are required for this certificate (filer attestation - app
> does not determine legal necessity)

It is there on every filing, whether or not recipients are listed. A filer who
has already listed someone sees a question they never need to answer, placed
where a required control would be. Only the Annual page carries a hint ("*
Recipient 1 name is required unless you attest below that none are required",
`annual-accounting/index.js:1432`); the other two have none.

What it does: **Yes** = "I have no one to serve" — the recipient cards hide
(their data is kept). **No** = "someone must be served" — Recipient 1 becomes
required. Validation asks for an answer **only** when Recipient 1 is blank; a
filer who lists a recipient is never asked.

### How it got here

Milestone 57B, commit `f517df9` (2026-09-20 03:57), fixture follow-up
`b16c931` (04:32). It implements decisions D7, D16 and D17 of
`MILESTONE-57-RESCOPE.md`. **D16 says: "A filer who lists at least one
recipient never sees the question; listing someone already answers it."** The
build honours that for *validation* — `serviceRecipientIssues()`
(`src/core/validation/service-recipients.js:66`) asks only when Recipient 1 is
not started — but not for *visibility*: all three render sites emit the control
unconditionally (`guardian-inventory/index.js:1165`,
`annual-accounting/index.js:1436`, `simplified-accounting/index.js:595`). The
rule is right; the page diverged from its own decision.

Separately, the milestone docs never recorded it landing: `MILESTONE-57-RESCOPE.md:16`
and `:1136` still say "Execution-ready. **Not authorized**";
`MILESTONE-57-PROPOSAL.md:77` still says "REVERTED … not authorized" and `:79`
says the fields "exist nowhere in `src/`". The commit touched no milestone doc.
Every other item landed that night (57A, D10, D11, D13–D15) carries
"authorized by Alan by name"; 57B carries nothing. Whether it was cleared
verbally is not recoverable from the repo — see D4.

### What 57B does that should stay, whatever D3 decides

- **D17, one recipient rule for three families**: Recipient 1 complete
  satisfies; cards 2+ optional; a started card must be finished or cleared.
  This closed two real defects — a second recipient with a name and no address
  exported silently on both accountings, and an accidental empty card blocked
  the Inventory.
- A filer with genuinely nobody to serve can say so (the reason the control
  exists).
- D7 conversion resets (four mappers, `legacy-app.js:4922`–`5081`), PDF
  suppression of the recipient block on Yes (three `pdf-model.js`), the Excel
  import asymmetry, tri-state discipline (§4).
- Its tests: `tests/unit/service-recipients.spec.js`; four e2e tests at
  `navigation-status.contract.spec.ts:1410–1503`; fixtures in
  `pdf-table-semantics.spec.ts:162` and `pdf-form-specific.spec.ts:1005` that
  rely on the rule.

### Proposed change

Show the question only when it applies — exactly D16 — and change nothing else.

**One relevance predicate**, defined in `service-recipients.js` next to the rule
it mirrors, so the page and the validator never read the data two ways (the
drift 57B's own comment warns about):

```
attestationRelevant({ rows, attestation, startedFields })
  = attestation === 'Yes' || !recipientRowStarted(rows[0], startedFields)
```

- Recipient 1 blank → **shown** (the only state that needs an answer).
- Recipient 1 started, answer `''` or `'No'` → **hidden**. A stale `'No'` stays
  in the data: it is consistent ("recipients are required", and one is listed)
  and the validator already ignores it.
- Answer `'Yes'` → **always shown**, even if a recipient was typed before
  attesting, because the cards are hidden and the control is the only way back
  (§4 non-destructive toggling). Unchanged from today.

**On the page**: the three feature modules import the predicate directly (they
are ES modules; no bridge name, no allow-list change). On render, the fieldset
gets `d-none` when not relevant — the same dependent-row pattern D-4 already
uses for `#bond-waived-row` (`guardian-inventory/index.js:1140`). On `change`
of any Recipient 1 field, toggle the class in place — no re-render, no lost
focus; clearing Recipient 1 brings the question back. The Yes/No itself keeps
its `data-form-route` re-render (`src/form-events.js:117`), which is what
shows/hides the cards today.

**Hints**: the Annual-only hint at `:1432` is dropped (recommended) or copied to
all three. Dropped, because when the question is visible it *is* the hint, and
when Recipient 1 is blank the sidebar and readiness panel name it through the
validator message.

**Wording**: untouched, verbatim (§8 #8; 57B's "load bearing" note).

### Decision needed — D3: what to do with the control — **DECIDED 2026-09-21: option 1** (show only when it applies)

Per `AGENTS.md` §3: numbered options, one recommended, each by what the filer
observes.

1. **Show it only when it applies (recommended).** A filer with a recipient
   listed no longer sees the question at all. A filer with Recipient 1 blank
   sees it, answers Yes, and the cards go away; answers No, and Recipient 1 is
   required. No data-model, validation, export or conversion change. Cost: a
   `change` listener per family; Annual's inline-setter cards need one on the
   recipients container.
2. **Keep it always visible, but move it below the cards** with a lead-in
   heading ("If there is no one to serve:") — the attestation sentence itself
   stays verbatim under it. Every filer still sees it; it stops reading as a
   required question at the top. Cheapest. It is the shape D16 explicitly
   rejected ("a mandatory Yes/No in front of the majority of filers").
3. **Remove the attestation entirely** — the two fields, the control, the CSV
   rows, the conversion resets, the PDF suppression, and its tests — keeping
   only D17's row rule. A filer with nobody to serve is blocked again, which is
   the defect 57B set out to fix. Not recommended.

### Decision needed — D4: what the Milestone 57 documents should say — **DECIDED 2026-09-21: (b)** — it was not cleared; keep it, record it as landed without a recorded authorization

The 57B status lines are wrong under every D3 option. Only you can say which
of these is true:

- **(a)** It was cleared verbally on 2026-09-20 → record *"LANDED 2026-09-20
  in `f517df9`, authorized by Alan; visibility corrected in 63B"*.
- **(b)** It was not → record *"LANDED 2026-09-20 in `f517df9` without a
  recorded authorization; kept on review 2026-09-21, corrected in 63B"* (or
  reverted, if D3 is option 3).

Edits either way: `MILESTONE-57-RESCOPE.md:16` and `:1134–1136`,
`MILESTONE-57-PROPOSAL.md:77–80`. Made as part of the 63B delivery, once it is
authorized — **neither 57 document has been edited yet.**

### Milestone checklist (`AGENTS.md` §8)

1. **Data model** — none. Both fields stay; `probate-guardian-data-model.csv`
   untouched.
2. **Legacy data migration** — none. A `.sav` with `''` and a listed recipient
   simply renders with the question hidden.
3. **Fixture & factory audit** — no change needed: `MINIMAL_VALID_GUARDIAN` /
   `_ANNUAL` / `_SIMPLIFIED` each list a complete Recipient 1, so the question
   hides for them; fixtures that set `serviceNoRecipients: 'Yes'`
   (`pdf-table-semantics.spec.ts:162`) still show it. `expectFileableFixture()`
   re-run as the check.
4. **Test coverage & index** — below.
5. **Export / import / portability** — none. PDF suppression, Excel import,
   the four conversion resets are untouched; readiness (`recipientsSettled`,
   `legacy-app.js:6683`) and the export validators keep reading the same rule.
6. **Security & sensitivity** — none.
7. **UI/UX consistency** — reuses the `d-none` dependent-row pattern; no new
   component. All three pages change identically, and the Annual-only hint
   stops being the odd one out.
8. **Legal / compliance** — the attestation wording is verbatim and the app
   still neither makes nor checks the assertion. Hiding the question when a
   recipient is listed changes nothing about what the filer is asked to swear
   to; it removes a question that had no bearing on them.
9. **Cross-form consistency** — the three families with a certificate of
   service change together; the four Plans have none (verified:
   `certRecipients` / `serviceRecipients` occur only under those three
   features). Classification: **defective** — the build diverged from its own
   recorded decision.

### Test plan

Red-first (`AGENTS.md` §7).

1. **Unit — `tests/unit/service-recipients.spec.js`**: `attestationRelevant`
   — blank Recipient 1 → true; started + `''` → false; started + `'No'` →
   false; started + `'Yes'` → true; empty/missing rows → true. Red today (no
   such function).
2. **e2e — new `tests/e2e/service-attestation-visibility.spec.ts`**, one test
   per family (`/d5`, `/p10`, `/p6`): blank → fieldset visible; type Recipient
   1's name and blur → hidden, same DOM element (no reload); clear the name →
   visible; select Yes → cards hidden, fieldset visible; select No → cards
   back. Red today on "hidden after typing".
3. The four 57B e2e tests and the two PDF fixtures stay green untouched — they
   set data directly and have no visibility dependency.
4. `TEST-INDEX.md`: new row; `service-recipients.spec.js` row extended. Same
   commit.

### Files expected to change

`src/core/validation/service-recipients.js`; `src/features/guardian-inventory/index.js`,
`src/features/annual-accounting/index.js`, `src/features/simplified-accounting/index.js`
(render + `change` delegate); `tests/unit/service-recipients.spec.js`; the new
e2e spec; `TEST-INDEX.md`; `MILESTONE-57-RESCOPE.md` and
`MILESTONE-57-PROPOSAL.md` per D4. No `window-bridge` change.

### Verification of this write-up

Checked: the three render sites; the three validators
(`guardian-inventory/index.js:1300–1312`, `annual-accounting/index.js:1618–1624`,
`simplified-accounting/index.js:775–783`); the nav rules (`s-p6` :6772,
`a-p10` :6831, Inventory via `errorRoute()`); the PDF suppression in all three
`pdf-model.js`; the four conversion resets; `git log -S ATTESTATION_57B`; the
docs' status lines. The screenshot's "Part VI: Certificate of Service" heading
matches Simplified (`:587`) and the Inventory's D-5 (`:1163`). **Browser check (readiness
review, 2026-09-21):** on all three pages — Guardian D-5, Annual Part X,
Simplified Part VI — typing in Recipient 1 updates `D` **without re-rendering
the page** (same `#main-content`, same attestation fieldset element before and
after), so the in-place `d-none` toggle the design depends on is feasible.
**Accepted verification boundary:** the toggle itself is a design; it is proved
by the new e2e (Test plan #2) after implementation, not before.

### 63B — implementation record (2026-09-21)

**Changed.**
- `src/core/validation/service-recipients.js`: new `attestationRelevant()` —
  shown when Recipient 1 is not started, and always when 'Yes' is selected.
- New `src/core/form/service-attestation-visibility.js` — the page half, shared
  by the three certificate pages: `renderServiceAttestationRow()` wraps the
  existing Yes/No in a row that is always rendered and hidden with `d-none`, and
  carries what the toggle needs on its own data attributes;
  `syncServiceAttestationVisibility()` re-evaluates it from the live model. It
  subscribes once to the `pg:field-written` event the shared write path already
  dispatches, so no page binds anything and nothing outlives a page, and no name
  was added to `window`. *Deviation from the write-up:* the plan had each page
  call the predicate itself; three identical copies of the toggle would have been
  the drift 57B's own comments warn about, so the helper is shared.
- The three pages (`guardian-inventory` D-5, `annual-accounting` Part X,
  `simplified-accounting` Part VI) render through it, and each now has one
  `RECIPIENT_STARTED_FIELDS` list used by **both** its validator and its page.
- The Annual-only hint ("* Recipient 1 name is required unless you attest below…")
  is removed, as recommended in the write-up: when the question is visible it *is*
  the hint, and when it is hidden the hint would point at nothing. Nothing
  referenced it.
- **The toggle happens on change/blur, not per keystroke** — a filer typing
  Recipient 1's first character would otherwise see the question above it vanish
  and the field jump up under their cursor.
- Wording untouched, verbatim (`ATTESTATION_57B`).
- **D4:** `MILESTONE-57-RESCOPE.md` (the status row and the 57B section header and
  opening) and `MILESTONE-57-PROPOSAL.md` (the 57B status) now say *landed
  2026-09-20 in `f517df9` without a recorded authorization; kept on review
  2026-09-21*, with the "exist nowhere" statement marked as history.

**Tests (red first).** `service-recipients.spec.js` +6 cases (`attestationRelevant`,
incl. agreement with `serviceRecipientIssues()`) and new
`service-attestation-visibility.spec.js` (7): both failed before the change
(function and module missing). New `tests/e2e/service-attestation-visibility.spec.ts`
(9 cases, three per page): before the change the six "hides once it doesn't
apply" cases failed with `Expected: hidden / Received: visible` and the two
Yes/No cases per page passed as regression guards; after, all nine pass,
including the same-`#main-content` assertion that proves typing does not
re-render the page. `TEST-INDEX.md`: two new rows, one extended.

**Verification.** Unit **1353/1353** (1,340 + 13); `npm run check:types` clean;
`window-bridge`, `checklist-export-parity` and the index guard pass. Existing
specs that exercise these pages, on the source target — `navigation-status.contract`,
`pdf-table-semantics`, `pdf-form-specific`, `annual-mount`, `simplified-mount`,
`guardian-inventory-mount`, `dependent-question-gate`, `checklist-export-parity`:
**151 passed, 0 failed**. The full `npm test` regression was **not** run.

---

## 63C — Hosted build: a failed feature chunk reloads the page instead of explaining

Found 2026-09-21 by the first `npm run test:e2e:web` run since 2026-09-11 (see
`MILESTONE-62-PROPOSAL.md`, Verification follow-up).

### What a filer sees

On the hosted (web) build only, when a feature's code chunk fails to load — the
filer is offline before the offline pack is downloaded, the connection drops,
or their tab is from before a new deployment — **the page reloads itself**,
with no message. Console: *"Vite asset chunk preload error detected (stale
deployment). Reloading page..."*. Then:

- With unsaved edits, the browser's native "Leave site?" prompt appears
  (`warnBeforeUnloadIfDirty`, `legacy-app.js:7939`). *Leave* discards the
  edits; *Cancel* leaves them on the page, where the red panel below is by then
  showing.
- Without a remembered file handle — every Firefox/Safari session, and any
  Chrome session where the `.sav` came in through the fallback picker — the
  reload **closes the case**: the startup screen comes back and they must
  reopen the file.
- If the chunk keeps failing (offline, no pack) *and* Chrome silently reopens
  the remembered file at the last position (`initApp`, `legacy-app.js:8037`,
  MS 57 review's `pg-last-position`), the same chunk fails again → another
  reload. **Loop not verified in a browser**; stated as a risk from reading the
  code. Nothing in the loader bounds it.

The panel built for exactly this — *"This section could not be loaded. Check
your connection or finish downloading offline access, then reload this page.
[Reload]"* (`src/core/feature-bridge.js:27–44`) — cannot stay on screen on the
hosted build. And the app's own update flow already asks the filer to save
first (`pwa-ui.js:128`: *"A new version of Guardian Forms is available. Save or
export your work, then reload."*); the loader's reload bypasses that.

On the source target (unbundled modules) the panel shows as designed, which is
why `npm test` is green and only the web profile catches this.

### Why it happens

`60b0133` (2026-09-11, "resolve stale asset chunk loading…") added two
listeners to `src/features-loader.js:159–170`: `vite:preloadError` → reload;
`unhandledrejection` whose message matches "Failed to fetch dynamically
imported module" → reload. Vite's preload helper dispatches `vite:preloadError`
for the failed chunk itself and then rethrows, so the reload is already
scheduled by the time the bridge's `catch` renders the panel. There is no
once-guard, no unsaved-work check, and no distinction between a 404 (stale
deployment — a reload helps) and a network failure (offline — it does not).

`tests/e2e/feature-load-failure.spec.ts:62` (hashed build) asserts the panel.
It was written 2026-09-09 (`390e165`), two days before the listeners, runs only
on the web profile, and fails identically on the pre-MS 62 baseline
(`f60265d`). The profile was not run between the two dates.

### Decision needed — D5: which behaviour is wanted — **DECIDED 2026-09-21: option 1** (show the panel; no auto-reload)

1. **Explain, and let the filer reload (recommended).** Remove the two
   automatic-reload listeners (60b0133's loader hunk only; its XLSX
   header-validation in `legacy-app.js` is unrelated and stays). The bridge's
   panel shows; its copy gains one sentence for the deployment case: *"This can
   also happen after Guardian Forms has been updated."* Filer-observable:
   after a deployment, a filer mid-session sees the panel and clicks Reload —
   one click, with the unsaved-work prompt protecting them; offline without
   the pack, they are told to finish downloading it; nothing reloads on its
   own. Consistent with the update notice's "save first". Cost: the deployment
   case is no longer hands-free. (Its stale-deployment prerequisite is now
   done — see the readiness findings below; **it also needs the amendment
   there to be safe.**)
2. **Reload once, then explain.** Keep the automatic reload for the stale
   deployment case but bound it: at most once per failing chunk per session
   (`sessionStorage` marker keyed by chunk URL, cleared on success), and never
   when `isDirtySinceExport()` — otherwise fall through to the panel.
   Filer-observable: deployments still self-heal when nothing is at risk;
   offline shows the panel on the second failure; the app never discards
   unsaved edits on its own. Cost: more code, two states to test. Take this if
   hands-free deployment recovery matters more than the extra reload.
3. **Keep the reload; rewrite the test to assert it.** Cheapest. Leaves the
   case-closing reload and the unbounded-loop risk in place. Not recommended.

#### Readiness review, 2026-09-21 — what was checked, and an amendment to option 1

1. **Stale deployment, reproduced.** A copy of the hosted build was served by a
   plain static server returning real 404s; with a tab open, the dashboard
   chunk was "redeployed" under a new hash (every referrer and `index.html`
   updated). *Today:* 404 → the listener reloads within ~130 ms → the new build
   loads. *Option 1 (listeners neutralised in the probe):* the "This section
   could not be loaded" panel appears; one click on Reload → the same end state.
   Both recover; option 1 costs one click.
   **Service-worker interplay, checked in a second probe** (workers allowed; the
   tab reloaded once so the active worker controlled it; then the same
   "deployment"): with **no offline pack**, today's auto-reload recovers and,
   with the listeners removed, the panel appears and one Reload click recovers —
   the same end state. With the **offline pack downloaded**, the old tab keeps
   working: the dashboard opens from the worker's cache, so no failure, no panel,
   no reload. This matches the worker's code (`sw.js`): navigations are
   network-first (the cached shell is only the fallback when the network fails),
   and URLs missing from the old worker's manifest pass through to the network.
   **Not exercised, and accepted as out of scope:** the *new* worker's own install
   and activation after a redeploy (the probe left `sw.js`'s manifest
   inconsistent, so it could not install) and the offline navigation fallback —
   both belong to the update flow (`pwa-ui.js`), which 63C does not change.
2. **The panel does not cover every chunk — this changes option 1.**
   `feature-bridge.js` catches only a failure to load the *feature's own
   module*. Chunks imported *while the page mounts* are outside it, and every
   feature does that: the accounting families load their print and Excel
   modules at the start of `mount()` (`ensureLazyModules()`), and the Plans
   load theirs when the Print page opens. Probed with the print module blocked
   on the source build: *today* the rejection is unhandled and the
   `unhandledrejection` listener reloads; **with both listeners removed, as
   option 1 is written, the result is an uncaught `TypeError`, the page stays
   where it was showing no message, and every later navigation rejects the same
   way.** So option 1 *as drafted* trades a silent reload for a silent dead end
   for these chunks.
   **Amendment A (needed to make option 1 safe):** `mountPage` also catches
   chunk-load errors thrown by `mod.mount()` — the same test PDF preview
   already uses, `/dynamically imported module|Failed to fetch/i` — and shows
   the same panel; then the two listeners are removed. Same panel, same Reload.
   **D12 (decided 2026-09-21): Amendment A is part of 63C.**
3. **Export callers, read.** Because of (2), a print/Excel chunk failure
   surfaces at page mount (Amendment A covers it), not mid-export. The export
   handlers wrap generation in try/catch with an alert ("PDF export failed:
   …"). PDF preview already has its own chunk-error panel with a Reload button
   (`pdf-preview.js:412–434`), which today races the auto-reload. The
   `window.load*Pdf()` helpers have **no production callers** (tests only).
   The earlier claim that the `unhandledrejection` reload "fires when a PDF
   loader import fails mid-export" was overstated and is corrected in the
   checklist below.

### Milestone checklist (`AGENTS.md` §8)

1–3. **Data model, migration, fixtures** — none.
4. **Test coverage & index** — below.
5. **Export / import / portability** — checked (finding 3 above): export
   handlers already catch and message failures; print/Excel chunks load at
   mount, where Amendment A puts them under the panel; PDF preview has its own
   panel. Offline pack and service worker untouched.
6. **Security & sensitivity** — none.
7. **UI/UX** — the panel exists; one sentence of copy.
8. **Legal / compliance** — none.
9. **Cross-form consistency** — applies to every feature chunk equally.

### Test plan

- `feature-load-failure.spec.ts:62` (web): red today, green as written under
  option 1; under option 2 it splits into a clean first failure (one `load`
  event, then the panel if the failure persists) and a dirty session (panel,
  no reload).
- Both the source and web tests gain a `page.on('load')` counter asserting
  **zero unprompted reloads** before the filer clicks Reload — the assertion
  that would have caught 60b0133 on the source target too.
- Option 2 only: the once-guard as a pure function, unit-tested.
- **Amendment A:** a new case in `tests/e2e/feature-load-failure.spec.ts` (source
  target): block `**/src/features/guardian-inventory/print.js`, add a Guardian
  ward → the panel shows, zero `load` events, and after `unroute` the Reload
  button recovers. Red today (it reloads instead of showing the panel).
- `TEST-INDEX.md`: `feature-load-failure.spec.ts` row updated (2 → 3 cases).
- **Process, not code**: this went unseen for ten days because only `npm test`
  (source profile) was being run. `test:release` already runs
  `test:e2e:all-profiles`; the gap is that no intermediate milestone ran the
  web profile. Worth a line in `AGENTS.md`'s verification tiers if the
  requester agrees.

### Files expected to change

`src/features-loader.js`; `src/core/feature-bridge.js` (copy, and — with
Amendment A — the `mod.mount()` catch); `tests/e2e/feature-load-failure.spec.ts`; `TEST-INDEX.md`; option 2 also a
small guard module and its unit spec.

### Verification of this write-up

Checked: reproduced on this build with a one-off probe (one aborted chunk
request → the loader's warning → full page reload → "Loading…"); the `f60265d`
web build fails the test identically; read the loader, the bridge, the
`beforeunload` guard, `initApp`'s last-position use, and 60b0133's diff; and,
in the readiness review, the stale-deployment recovery, the sub-chunk failure
with and without the listeners, and the export callers (findings above). Not
checked: the reload loop with a remembered handle (needs the File System Access
API, unavailable to a headless probe); 60b0133's original production symptom;
the new worker's install/activation after a redeploy and the offline navigation
fallback (accepted out of scope — unchanged by 63C).

### 63C — implementation record (2026-09-21)

**Changed.** `src/features-loader.js`: the two automatic-reload listeners
(`vite:preloadError`, and the `unhandledrejection` match) are gone; a comment
records why. `src/core/feature-bridge.js`: new exported `isChunkLoadError()`
(Chrome, Firefox, Safari and Vite-CSS wordings; a bare "Failed to fetch" is
deliberately **not** matched, so an application `fetch()` failing is not
mistaken for a missing chunk); `mountPage()` now also catches a chunk-load
error thrown by `mod.mount()` and shows the same panel — any other error
still propagates; the panel gains "This can also happen after Guardian Forms
has been updated." Not touched: `pdf-preview.js`'s own chunk-error panel, the
service worker, `pwa-ui.js`, and 60b0133's unrelated XLSX validation.

**Tests (red first).** New `tests/unit/feature-bridge.spec.js` (16 cases): run
before the change, 13 failed — the missing `isChunkLoadError`, the mount-time
chunk failure that rejected instead of showing the panel, the missing copy, and
the reload listeners. New e2e case in `feature-load-failure.spec.ts` (blocks
the Guardian print module, then adds a Guardian ward): failed before the change
with the same `Failed to fetch dynamically imported module` rejection.
`countLoads()` and a 1.5 s observation window now also assert, in both existing
cases, that nothing reloads the page before the filer clicks Reload.
`TEST-INDEX.md`: new unit row; the e2e row updated (3 cases).

**Verification.** `npx vitest run` on the new spec and the guards it could
affect (index, window-bridge, boot-ordering): 43/43. Full unit suite: **1340/1340**
(1,324 + 16). `npm run check:types`: clean. Source-target e2e for
`feature-load-failure`, `startup` and `plan-simplified-mount`: 16 passed, 1
skipped (the web-only case). **Hosted-build profile (`npm run test:e2e:web`):
34 passed, 2 skipped, 0 failed** — including the hashed-build case that failed
identically on the pre-MS 62 baseline and on `master` before this change.
The full `npm test` regression was **not** run.

**Observed, not changed (out of 63C's scope).** Each feature caches its
lazy-module promise (e.g. `ensureLazyModules()` in `guardian-inventory/index.js`),
and a rejected promise is never cleared. After the panel appears, navigating
elsewhere *without* pressing Reload keeps failing the same way until the page is
reloaded. The panel's Reload is therefore the recovery, as designed; making a
failed import retryable in place would be a separate change.

---

## 63D — The preparer's signature-authorization note is missing from most signing pages

Raised 2026-09-21: *"This should be at the top of any page where a signature
can be applied, all forms. It seems to be only on some."*

### What a filer sees

The note reads: *"Preparer's note: Before attaching any signature on this
page, confirm you have that party's actual legal authorization to sign on
their behalf. Do not sign for a party you have not been authorized to sign
for."* It is meant for the person operating the app, who may not be the
signer. Today, across the seven feature modules (nine filing types):

| Form | Page (signatures captured) | Note | Where |
| :-- | :-- | :-- | :-- |
| Initial Inventory | D-1 Part III Guardian(s) Attestation | yes | top |
| Initial Inventory | D-2 Part IV Preparer & Guardian Attorney | **no** | — |
| Initial Inventory | D-5 Part VI Certificate of Service (attorney) | **no** | — |
| Annual / Final / Trust | Part III Guardian(s) Signature & Declaration | yes | top |
| Annual / Final / Trust | Part IV Preparer Attestation | **no** | — |
| Annual / Final / Trust | Part V Guardian Attorney Signature | **no** | — |
| Annual / Final / Trust | Part X Certificate of Service (attorney) | **no** | — |
| Simplified | Part IV Guardian(s) Information | **no** | — |
| Simplified | Part V Guardian Attorney Signature | **no** | — |
| Simplified | Part VI Certificate of Service (attorney) | **no** | — |
| Plan — Simplified | Signatures | yes | top |
| Plan — Initial | Certification and Signature of Guardian(s) | yes | **mid-page**, below the certification checkboxes |
| Plan — Initial | Certification and Signature of Guardian's Attorney | **no** | — |
| Plan — Annual | Signatures (guardians and attorney) | yes | **mid-page**, below the checkboxes and the explanation box |
| Plan — Minor | Certification and Signature of Guardian(s) | yes | **mid-page**, below the checkboxes |
| Plan — Minor | Certification of Preparer & Attorney | **no** | — |

**16 pages capture a signature; 6 carry the note, 3 of those below the fold;
10 have none.** And one page carries it that captures no signature at all:
**Simplified Part III — Guardian(s) Declaration** (`simplified-accounting/index.js:493`)
has the sworn statement and the period dates, while the guardians actually
sign on Part IV. There the note's "on this page" is untrue.

### Why it happens

Milestone 40H-E (`fd279d4`, 2026-09-13) added the note *"immediately above
the existing sworn statement"* — one hand-placed copy per module, seven in
all, and a source-scan test (`tests/unit/preparer-note.spec.js`) that pins
exactly that: one note per file, adjacent to one named perjury sentence. So
the rule that was built is "next to the oath", not "where a signature is
attached". The two differ on every attorney, preparer and certificate page
(which have no oath), on the Plan pages (where checkboxes sit between the
heading and the oath), and on Simplified (where the oath and the signatures
are on different pages). The test cannot see any of this: it never looks at
where `renderSignatureStateControl()` is called.

### Proposed change

**Rule: every page that renders a signature control shows the note as the
first thing under its `<h1>`. No other page shows it.**

- One shared `preparerNoteHTML()` in `src/core/signature/signature-state-control.js`
  — the module every signing page already imports for the control itself —
  replaces the seven copied strings. One string, one place.
- The 10 pages without it get it; the 3 mid-page copies move to the top; the
  Simplified Part III copy moves to Part IV (D6). The sworn statements stay
  where they are.
- The PDF never carries it (unchanged; the existing negative test stays).

### Decision needed — D6 — **DECIDED 2026-09-21: option 1** (the rule in full; the Simplified Part III copy moves to Part IV)

1. **The rule above, in full (recommended).** Filer-observable: the note is
   the first line on all 16 signing pages and nowhere else. Cost: five
   byte-identical text snapshots change (below). Nothing else.
2. **Add it to the 10 missing pages only.** Leaves three notes below the
   fold on the Plan pages and the stray one on Simplified Part III, whose
   "on this page" stays wrong. Cheapest, and three fewer snapshot edits.
3. **Option 1, but also keep the Simplified Part III copy** beside its oath.
   Only if you want the note to follow the oath as well as the signature; the
   text would need a second wording for that page ("on Part IV").

### Milestone checklist (`AGENTS.md` §8)

1–3. **Data model, migration, fixtures** — none; nothing stored.
4. **Test coverage & index** — below.
5. **Export / import / portability** — none. The note is on-screen only;
   `preparer-note.spec.js` already asserts no `pdf-model.js` emits it.
6. **Security & sensitivity** — none.
7. **UI/UX consistency** — one placement rule for all nine filing types;
   one helper; `.preparer-note` in `cards.css` unchanged.
8. **Legal / compliance** — the note asserts nothing about the filing; it
   warns the operator. Putting it where the signature is attached is the
   whole point of 40H-E, finished.
9. **Cross-form consistency** — this *is* the cross-form fix. Classification:
   **defective** — 40H-E's own rationale ("attaching a signature on someone
   else's behalf") names the signature, not the oath, as the trigger.

### Test plan

Red-first (`AGENTS.md` §7).

1. **Rewrite `tests/unit/preparer-note.spec.js`** so the page set is derived,
   not listed: for each feature `index.js`, split into page functions; every
   function that contains `renderSignatureStateControl(` must have the note
   (via the helper) as the first rendered element after its `<h1>`; no other
   function may contain it. Red today on 10 missing, 3 misplaced, 1 stray —
   14 failures, which is the proof the old test could not fail. The seven
   hand-listed oath needles go; the CSS-once and PDF-never tests stay.
2. **Snapshots to update** (expected-text changes only, after the fix):
   `plan-initial-mount.spec.ts:53`, `plan-annual-mount.spec.ts:53`,
   `plan-minor-mount.spec.ts:56` (note moves to the top),
   `simplified-mount.spec.ts:205` (Part III loses it);
   `plan-simplified-mount.spec.ts:66` unchanged. Guardian D-1 and Annual
   Part III have no text snapshot.
3. **Rendered placement (e2e) — new `tests/e2e/preparer-note-placement.spec.ts`**,
   one test per filing type (7): on every page that renders a
   `.signature-state-control`, `.preparer-note` is the first element after the
   `<h1>`; on every page that does not, there is none. This is the browser
   proof the source-scan test cannot give (the two agree today only by accident
   of where the strings sit); it is the check run by hand above, made permanent.
   Red today on the same 14 pages. The source-scan rewrite (#1) stays as the
   fast tripwire; this is the **accepted verification boundary** for placement.
4. **`TEST-INDEX.md`**: `preparer-note.spec.js` row rewritten to state the
   derived rule; new row for `preparer-note-placement.spec.ts`.

### Files expected to change

`src/core/signature/signature-state-control.js` (helper); the seven feature
`index.js` files (16 call sites, seven strings removed);
`tests/unit/preparer-note.spec.js`; the new `tests/e2e/preparer-note-placement.spec.ts`;
the four snapshot specs; `TEST-INDEX.md`.
No `window-bridge` change (all seven modules are ES modules importing the
helper directly).

### Verification of this write-up

Checked on `master`: every `renderSignatureStateControl(` call site (20, on
16 page functions) and every `preparer-note` string (7), mapped to their page
functions by a one-off script; the note's position read in each of the six
pages that have it; Simplified Part III and Part IV read in full;
`preparer-note.spec.js` read; `fd279d4` located. **Rendered check (readiness
review, 2026-09-21):** all 16 signing pages and each type's Cover were loaded
in a browser on a blank filing; the note's presence, whether it is the first
element after the `<h1>`, and the signature-control count matched the table on
all 16 pages (Simplified Part III: note present, zero signature controls).

### 63D — implementation record (2026-09-21)

**Changed.** New `src/core/signature/preparer-note.js` — the one text
(`PREPARER_NOTE_TEXT`) and `preparerNoteHTML()`. *Deviation from the write-up:* it
proposed the helper inside `signature-state-control.js`; that module imports the
party resolver and the dialogs, which a plain unit test cannot load, so the helper
is a separate dependency-free module. All seven feature modules now render
`${preparerNoteHTML()}` as the first element under the `<h1>` of **all 16** pages
that render a signature control, and the seven hand-typed copies are gone:
Initial Inventory D-1, D-2, D-5; Annual Part III, IV, V, X; Simplified Part IV, V,
VI; Plan-Simplified Signatures; Plan-Initial guardians and attorney; Plan-Annual
Signatures; Plan-Minor guardians and preparer/attorney. **D6:** Simplified Part III
(a declaration with no signature control) loses the note; Part IV, where the
guardians sign, gains it. The three Plan pages that had it below the checkboxes
now have it at the top. The PDF still never carries it.

**Tests (red first).**
- `tests/unit/preparer-note.spec.js` **rewritten**: the page set is *derived* from
  source (every top-level page function in `src/features/*/index.js` that calls
  `renderSignatureStateControl()`), not listed. Against the untouched pages all 16
  signing pages failed and all seven files failed the no-hand-typed-copy check.
  249 cases now (parametrized over the derived pages).
- New `tests/e2e/preparer-note-placement.spec.ts` (7 cases, one per filing type; the
  page list comes from the sidebar). Against the pre-63D pages, **six of seven
  failed** — Plan-Simplified passed because its single signing page already had
  the note first — naming exactly the diagnosed pages: D-2, Annual Part IV,
  Simplified Part III (stray), and Plan-Initial /p9, Plan-Annual /p11 and
  Plan-Minor /p6 (below the fold). After: all seven pass. This is the accepted
  verification boundary for placement.
- Four byte-identical text snapshots updated, expected strings only:
  `plan-initial-mount`, `plan-annual-mount`, `plan-minor-mount` (the note moves to
  directly under the heading) and `simplified-mount` (Part III loses it).
  `plan-simplified-mount` was already correct.
- `TEST-INDEX.md`: the `preparer-note.spec.js` row rewritten; new row for the placement spec.

**Verification.** Full unit suite **1587/1587**; `npm run check:types` clean;
window-bridge and index guards pass (no new `window` name). Source-target e2e —
the four snapshot specs, `plan-simplified-mount`, `annual-mount`,
`guardian-inventory-mount`, `guided-tour-navigation` and the new placement spec:
**80 passed, 0 failed**. The full `npm test` regression was **not** run here (it
runs once, after 63E, as instructed).

---

## 63E — UCN on the printed filing, beside Case # in the header

Raised 2026-09-21: *"add UCN field to final print — same line and formatting
as Case # in the header."*

### What a filer sees today

Every exported PDF prints the case number twice: in the pleading block on
page 1 — **`CASE #: 26-002487-GD`**, bold 10 pt, centred under the division
line (`src/core/pdf/pdf-engine.js:318`) — and in the right cell of the
continuation header on every later page — **`Case #: 26-002487-GD`**, 8 pt,
right-aligned (`:381`). No Uniform Case Number appears anywhere on any
printed form.

Only one filing type can even hold one: **Plan — Minors** has `ucn` ("UCN")
and `ref` ("Case #") on its cover (`plan-minor/index.js:196–197`), and its
PDF prints `ucn || ref` in the *Case #* slot (`plan-minor/pdf-model.js:26`,
via `caseNumberOf()`), so a Minor plan with both filled shows its UCN
labelled as the case number. The other six types have `caseNumber` only
(`probate-guardian-data-model.csv` row 45 `common`; `ucn` is row 538,
`plan_minor`).

### Proposed change

1. **One optional `ucn` field on every filing type**, entered on the Cover
   beside Case Number, label "UCN" (Plan Minor's existing label). Guardian,
   Annual and Simplified covers have their own Case Number input
   (`guardian-inventory/index.js:658`, `annual-accounting/index.js:598`,
   `simplified-accounting/index.js:372`); the three Plans share
   `renderCaseCaptionFields()` (`core/form/cards/case-caption-card.js:26`), so
   the input lands in four places, not six. Minor keeps its own.
2. **Each PDF model passes `ucn` in its metadata** next to `caseNumber` —
   there is no shared metadata builder; all seven set `caseNumber` themselves
   (e.g. `guardian-inventory/pdf-model.js:74`, `annual-accounting/pdf-model.js:78`).
3. **The engine prints it in both header sites, same font, size, weight and
   colour as Case #** — layout per D7. When `ucn` is blank the UCN label is
   omitted (D8), so every existing filing prints exactly as it does now.
4. **Conversion carry-over**: `extractCarryIdentity()` (`ward-lifecycle.js:119`)
   today folds `caseNumber || ucn || ref` into one value, and the Minor
   branch writes that into `ucn` (`:222`) — i.e. a Case # carried into a
   Minor plan becomes its UCN. With a real UCN everywhere, `ucn` carries to
   `ucn` and Case # to Case # (`ref` on Minor) on every path.
   `caseNumberOf()` and the dashboard's `caseNumber || ucn || ref` identity
   rule are unchanged (`AGENTS.md` §"Case resolution").

**Fit — measured** (readiness review, 2026-09-21), with the app's embedded
Liberation Sans through the engine's own jsPDF instance, not estimated:

| String | Style | Width | Room |
| :-- | :-- | --: | :-- |
| `CASE #: 26-002487-GD` (today, page 1) | bold 10 pt | 108.4 pt | 468 pt |
| `UCN: 50-2026-CP-001234-XXXX-MB   CASE #: 26-002487-GD` | bold 10 pt | 284.0 pt | 468 pt — fits |
| same with a 20-character UCN, no hyphens | bold 10 pt | 267–268 pt | fits |
| `UCN: 50-2026-CP-001234-XXXX-MB` (continuation, own line) | 8 pt | 132.9 pt | 146 pt cell text width — fits, 13 pt spare |
| `Case #: 26-002487-GD` / `Case #: 2026-CP-000789-AAAA` | 8 pt | 82.7 / 114.7 pt | fits |
| both on **one** continuation line | 8 pt | 209–222 pt | 146 pt — **does not fit** |

The header bar is 24 pt high; two 8 pt lines (baselines at +10 and +18 pt) fit.
So D7 option 1 (UCN over Case #, page 1 on one line) fits with margin, and the
"same line everywhere" alternative would have needed the cell widened by
about 76 pt. A UCN longer than 146 pt at 8 pt falls to the existing
wrap-then-ellipsize rule (`:367–376`).

### Decision needed — D7: where the UCN sits in the two headers — **DECIDED 2026-09-21: option 1**

1. **Page 1: same line as CASE #. Continuation pages: same cell, UCN on the
   first line, Case # on the second, same 8 pt formatting (recommended).**
   Filer sees `UCN: … CASE #: …` centred under the division on page 1, and
   the running header's right cell reads UCN over Case # on every later
   page. Uses the cell's existing two-line design; nothing else on the page
   moves.
2. **Same line everywhere.** Widen the right cell (shrinking the centred
   section-title cell) so both fit at 8 pt on one line. Long section titles
   then wrap or ellipsize sooner on every filing type.
3. **Page 1 only.** Continuation pages keep Case # alone.

### Decision needed — D8: required, or optional and silent when blank — **DECIDED 2026-09-21: option 1**

1. **Optional; omitted from the print when blank (recommended).** No
   "Pending" placeholder — Case # is the form's required identity, UCN is
   additional. A filing without a UCN prints byte-identically to today, and
   no existing `.sav` or fixture becomes incomplete.
2. **Required on every Cover, like Case Number.** Blocks export until
   entered; every guardian/annual/simplified/plan fixture and
   `MINIMAL_VALID_*` gains it; readiness rows added.
3. **Optional, prints `UCN: Pending` when blank**, mirroring Case #.

### Decision needed — D9: Plan Minor's header — **DECIDED 2026-09-21: option 1**

1. **UCN slot = `ucn`, Case # slot = `ref` (recommended).** Matches the
   Minor cover's own labels. Filer-visible change: a Minor plan with both
   filled stops printing its UCN as the Case #; one with only a UCN prints
   `UCN: …` and `Case #: Pending`.
2. **Leave Minor as is** (`ucn || ref` in the Case # slot, and the UCN slot
   shows `ucn` too — the same number twice when only `ucn` is filled).

### Milestone checklist (`AGENTS.md` §8)

1. **Data model** — `ucn` becomes a `common` optional string (CSV row 538
   moves from `plan_minor` to `common`); `emptyData*()` factories in
   `src/core/state.js` gain `ucn: ''`; `npm run verify:data-model`.
2. **Legacy data migration** — none to run, but stated precisely: a `.sav`
   written before this has **no `ucn` key** on Guardian, Annual and Simplified
   wards (it reads `undefined`, not `''`; on Plan Minor the key exists). Every
   reader uses `d.ucn || ''`, so it prints as today (D8 option 1). Proved by a
   named test, not assumed: new `tests/unit/ucn-header.spec.js` builds each of
   the seven PDF models from a ward object *with no `ucn` key* and asserts
   `metadata.ucn === ''` and no `UCN` text in the header lines.
3. **Fixture & factory audit** — none under D8 option 1; full audit under
   option 2.
4. **Test coverage & index** — below.
5. **Export / import / portability** — PDF: both header sites. **Excel —
   audited 2026-09-21: none of the three bundled workbooks has a UCN cell.**
   Every shared string in each was searched for "UCN" / "Uniform Case": no hits
   in the Guardian workbook (40 sheets), the Annual workbook or the Simplified
   workbook. Each has exactly one case-number input — Guardian SUMMARY I!H7
   (`guardian-inventory/excel.js:172`), Annual PART I!I5
   (`annual-accounting/excel.js:187`), Simplified H4
   (`simplified-accounting/excel.js:96`) — which fills every page header. The
   four Plans have no Excel path at all. So **an Excel export cannot carry the
   UCN and an Excel import cannot restore it**; the field is on-screen, PDF and
   `.sav` only. **D10 (decided 2026-09-21): leave it there** — the help guide
   (`help-content.js` and `help/index.html`, in the section describing Excel
   export) and the release note state that an Excel round-trip does not carry the
   UCN, and the export status text is unchanged. Conversions: `ucn`
   carries to `ucn` on all paths (item 4).
6. **Security & sensitivity** — none; a public court identifier.
7. **UI/UX consistency** — one input beside Case Number on every Cover; one
   label; the header formatting rule is "identical to Case #".
8. **Legal / compliance** — none asserted; the UCN is printed as entered.
9. **Cross-form consistency** — all seven engines; Minor already has the
   field, so this is the other six catching up plus the header.

### Test plan

Red-first.

0. **New pure helper, unit-tested:** `headerIdentityLines({ caseNumber, ucn })` in
   a new `src/core/pdf/header-identity.js`, used by both engine draw sites, so
   the label text, the omit-when-blank rule (D8) and the line order are defined
   once. Test: new `tests/unit/ucn-header.spec.js` (also the legacy-`.sav` test
   in checklist item 2).
1. **e2e, `pdf-form-specific.spec.ts`** (already extracts page text and pins
   `CASE #: 26-002487-GD` at `:845`): with a UCN set, page 1's text contains
   `UCN: <value>` and `CASE #: <value>` on one line; a later page's header
   contains both; with UCN blank, no `UCN:` text anywhere. Red today.
2. **Unit, `ward-carryover.spec.js`**: `ucn` carries to `ucn` and is never
   written from `caseNumber`, on every conversion path (today the Minor path
   does exactly that — red).
3. **Minor**: `plan-pdf-wcag-compliance.spec.ts` and `plan-minor-parity.spec.js`
   updated for D9.
4. **Unit, data model**: `verify:data-model` passes with the row moved.
5. `TEST-INDEX.md` rows updated in the same commit.

### Files expected to change

`src/core/pdf/pdf-engine.js` (two draw sites); new `src/core/pdf/header-identity.js`
and `tests/unit/ucn-header.spec.js`; the seven `pdf-model.js`
metadata blocks; `src/core/state.js`; `probate-guardian-data-model.csv`;
`src/core/form/cards/case-caption-card.js`, `guardian-inventory/index.js`,
`annual-accounting/index.js`, `simplified-accounting/index.js` (inputs);
`src/core/navigation/ward-lifecycle.js`; the specs above; `TEST-INDEX.md`;
no `excel.js` change (no workbook has a UCN cell — D10); the help guide's Excel
section gains one sentence.

### Verification of this write-up

Checked on `master`: both engine draw sites and their geometry; all seven
metadata sites; the four cover-input sites; Minor's `ucn`/`ref` labels and
`caseNumberOf()`; the carry-over function; the CSV rows; which tests
reference the header or `ucn`. **Readiness review (2026-09-21):** the three
Excel templates decoded and searched (no UCN cell); the header widths measured
with the embedded font (table above). Not checked: a generated PDF with a UCN
(the field does not exist yet — the measured strings stand in for it).

### 63E — implementation record (2026-09-21)

**Changed.**
- **Header.** New `src/core/pdf/header-identity.js` — `headerIdentityLines()` decides the
  text once for both draw sites in `pdf-engine.js`, which keep drawing it in the existing
  Case # style. No UCN: exactly what printed before (`CASE #: …` / `Case #: …`, "Pending" kept
  for a blank Case #). With one: page 1 is `UCN: …   CASE #: …` on one line; the running
  header's right cell is two lines, UCN over Case #, each cut with an ellipsis rather than
  wrapped into a third line.
- **Models.** All seven `pdf-model.js` pass `ucn` (trimmed) next to `caseNumber`. **Plan -
  Minors (D9):** the Case # slot is `ref` and the UCN slot is `ucn`; the document *title* keeps
  the app's one identity rule (`ucn || ref`), so file names are unchanged.
- **Data model.** `ucn:''` added to the Guardian, Annual, Simplified and three Plan factories
  (Plan Minor already had it). `probate-guardian-data-model.csv`: the row moved from
  `plan_minor` to `common` (`verify:data-model` OK, 942 rows). No migration: a `.sav` saved
  before this has no `ucn` key on any type but Plan Minor, every reader uses `d.ucn || ''`,
  and it prints as before.
- **Covers.** An optional **UCN** input beside Case Number on the Initial Inventory, Annual
  (and Final/Trust, which share the page) and Simplified covers, and on the three Plan covers
  through `renderCaseCaptionFields({ ucn })` — an opt-in, so a caller that does not pass it is
  unchanged. Kept exactly as typed: the Initial Inventory uses the `text` field kind, not the
  Case Number formatter, which would reshape a UCN.
- **Conversions.** `extractCarryIdentity()` no longer folds `caseNumber || ucn || ref` into one
  value that the Minor branch wrote into `ucn`. The Case # (`caseNumber`, or `ref` on a Minor
  plan) and the UCN carry separately on every path — the six plan/accounting targets, the
  Minor target, and the two live sites in `legacy-app.js`. **Filer-observable:** converting a
  Minor plan whose only number was its "UCN" now pre-fills the new filing's UCN, not its Case
  Number (which is required, so the filer is asked for it).
- **Help (D10).** The in-app Help panel lists the UCN with the cover fields and says it is not
  carried in Excel; the standalone guide says the same in its Excel section and describes the
  field under automatic formatting. No workbook has a UCN cell, so `excel.js` is untouched.

**Filer-observable changes, stated plainly.** (1) A Plan - Minors filing that has only a UCN
now prints `UCN: …` and `CASE #: Pending` — it no longer prints the UCN as the Case # (D9,
decided). (2) Every cover has one more optional field. (3) The conversion change above.

**Tests (red first).**
- `tests/unit/ucn-header.spec.js` (12): the helper, and every model including a ward with *no*
  `ucn` key. Red until the helper existed.
- `tests/unit/ward-carryover.spec.js`: two expectations updated (they pinned the old
  Case #→UCN behaviour) and five cases added; 7 red before the change.
- `tests/e2e/pdf-form-specific.spec.ts` +1: in a real PDF, page 1 shows `UCN` and `CASE #` on
  one baseline in that order; every later page shows UCN directly above Case # in the running
  header; no UCN prints no "UCN" anywhere; Plan - Minors per D9. **Failed against the pre-63E
  source** (stashed to prove it), passes after.
- New `tests/e2e/ucn-cover-field.spec.ts` (7, one per type): the field is there, blank by
  default and never reported missing, kept exactly as typed (lower-case, hyphens), and persists
  across navigation. **Six of seven failed before** (Plan - Minors already had the field).
- Five byte-identical cover text snapshots updated (`annual-mount`, `simplified-mount`,
  `plan-annual-mount`, `plan-initial-mount`, `plan-simplified-mount`): each gained exactly a
  `UCN` label and one empty input — a consequence of the new field, not a regression.
- `TEST-INDEX.md`: two new rows, three extended.

**The write-up's open caveat is now closed.** It said the header widths were measured but "a
generated PDF with a UCN" was not. A real PDF with a 25-character UCN was rendered to images
and looked at (pages 1 and 2): page 1 carries `UCN: …   CASE #: …` centred on one line in the
same bold style as before; the running header's right cell shows UCN over Case # cleanly inside
the cell, with no clipping or overlap.

**Verification.** Full unit suite **1631/1631**; `npm run check:types` clean;
`verify:data-model`, window-bridge and index guards pass. Source-target e2e — the cover, convert,
PDF and navigation specs plus the two new ones: **245 passed, 0 failed** (after the five
snapshot updates). The full `npm test` regression and the hosted profile run next, once, as
instructed.

---

## 63F — Pages the sidebar marks incomplete that the validators cannot list

Raised 2026-09-21 by 63A's bounded R5 investigation, under the stop-and-split rule
recorded there. **Built the same day, on the requester's instruction** ("I thought I said to
do the rest of 63"): decision D11 had already said to fix these pages, and the split was
my own bound, not a scope limit he set. See the implementation record at the end of this item.

### What a filer sees

On three pages the sidebar shows a red mark, the page shows the yellow box, and the box
can say only *"Complete the required items on this page before continuing."* — no list,
no links, so the filer is told the page is unfinished and not what is missing:

| Page | What the sidebar wants | Why the box has nothing to list |
| :-- | :-- | :-- |
| Simplified Part III | the two period dates | the validator files them under the **Cover**; the same fields are on Part III |
| Plan-Annual 3G Insurance & Benefits | one benefit chosen, or "none", or "other" | no validator rule |
| Plan-Minor Preparer & Attorney | preparer name, attorney name, attorney signature date | no validator rule |

### Why it happens — two different causes

1. **Route ownership.** A field rendered on two pages (Simplified's period dates: Cover and
   Part III) has one validator message with one route. The page that does not own the route
   cannot explain a mark that depends on that field.
2. **Sidebar-only rules.** The sidebar asks "have you finished with this page?"; the export
   gate asks "does this satisfy the court?" — and `AGENTS.md` §4 deliberately lets them
   differ, so that a filer is prompted for things the court's form does not require. Where
   the sidebar has a rule the validator lacks, there is no message anywhere to list.

### Decision needed — D13 — **DECIDED 2026-09-21: option 1**

1. **A small "what this page still wants" descriptor (recommended).** For a sidebar rule
   with no validator counterpart, a table entry (key → the items, each a label and a field
   path) that the box uses when the validator yields nothing for the route; plus a way for a
   page to claim an error for a field it renders (Simplified Part III). Filer-observable:
   the three pages list what is missing, each item a link. Cost: a table to keep in step with
   the sidebar rules — guarded by a parity unit test (every sidebar-only key has an entry;
   there is precedent in `tests/unit/support/plan-readiness-parity.js`) — and a change to
   `adaptValidationErrors()` / `renderLocalSectionGuidance()`.
2. **Turn the sidebar-only rules into validators.** Not recommended: it makes the *export*
   demand what the court's form does not (`AGENTS.md` §4).
3. **Leave the generic sentence.** Honest, and now correctly worded, but says nothing specific.

**Related, not part of D13:** under the non-Guardian policy Next is *blocked* on these pages
even though the export does not require the items. That is existing behaviour, unchanged by
63A; whether those pages should block at all is the same cross-form question D1 answered for
the Guardian pages, and is noted here so it is decided deliberately, not by accident.

### If authorized

Files: `src/core/status/section-guidance-policy.js` or a sibling for the descriptor;
`src/core/status/section-status.js` / `adaptValidationErrors()`; the three validators or the
descriptor table; the invariant walk (**delete** `NO_LISTABLE_ITEMS_YET`, so the walk becomes
strict); `TEST-INDEX.md`. Red-first: the walk's exemptions are the failing tests.

### 63F — implementation record (2026-09-21)

**Changed.** In `src/core/status/section-guidance-policy.js`: `pageAlsoOwns(type, route)` — a field
rendered on two pages can be explained on either (Simplified Part III owns `periodFrom` and
`periodTo`, whose validator messages are filed under the Cover) — and `sidebarOnlyWants(type,
route, data)` — what a sidebar-only rule still wants, as items the box can link to: Plan-Annual 3G's
"answer a benefit, or None, or Other" (jumps to the None checkbox) and Plan-Minors Preparer &
Attorney's blank ones of preparer name / attorney name / attorney signature date. Both are on
`window.sectionGuidancePolicy` (no new `window` name). `renderLocalSectionGuidance()` claims the
aliased errors (rewriting their jump route to the current page, so the link stays on Part III rather
than sending the filer to the Cover) and appends the wants that no validator message already names.
`legacy-app.js`'s live patch passes the wants for a page the sidebar marks incomplete. **The export
validators are unchanged** — option 2 of D13 (make the export demand these) was rejected for the
reason recorded above (`AGENTS.md` §4): the box only tells the filer what the sidebar is waiting for.

**Tests (red first).** The invariant walk's three named exemptions are **removed**, so it is strict for
all seven filing types; against the pre-63F source it failed on exactly `/p3`, `/p4` and `/p7`.
New `tests/e2e/sidebar-only-wants.spec.ts` (5) proves **parity**: doing exactly what a list says turns
the sidebar mark green and clears the box (Simplified: the two dates, only the missing one listed, links
land on Part III; Plan-Annual: the None checkbox, and answering any benefit also satisfies it;
Plan-Minors: the three blanks shrinking as each is supplied) — 4 of 5 failed before. Unit: 6 cases for the
two functions in `section-guidance-policy.spec.js` (blank and satisfied pages, no rule elsewhere, missing
data never throws) and the bridge-keys assertion. `TEST-INDEX.md` updated.

**Verification of this item.** Unit **1637/1637**; `npm run check:types` clean; window-bridge and index
guards pass. The full regression is re-run after this change (it touches shared guidance code) — result
in the section below.

---

## Readiness review, 2026-09-21 — decisions opened by it

A second-reader review of this document found it not yet execution-ready.
Everything it named that could be checked without implementing was checked
(above). The three points that needed a decision were **decided 2026-09-21**,
each as the recommended option. A second review then agreed 63A–63E can move to
authorization review, and asked that the remaining risks be stated rather than
implied. What remains is **the authorization itself, plus three accepted,
stated risks**: (1) R5's cause is not yet isolated — bounded by the
stop-and-split rule under R5 in 63A; (2) 63C's new-worker install/activation and
the offline navigation fallback are untested and unchanged by it; (3) 63E's PDF
is not generated until it is implemented, which is where that test belongs.

- **D10 — UCN and Excel (63E). DECIDED: option 1.** No workbook has a UCN cell.
  1. Leave UCN out of Excel; say so in the help guide and release note
     (recommended). 2. Write it into the single Case Number cell as
     "UCN / Case #" (changes what the court's form receives). 3. Add a UCN cell
     to each workbook (edits the court's templates).
- **D11 — R5 (63A). DECIDED: option 1.** Two pages show only the schedule sentence and no item
  list. 1. Fix the routing in 63A, so the invariant walk can assert "lists ≥ 1
  item" (recommended). 2. Split to 63F; 63A's walk asserts only "box present".
  3. Leave; D2's new wording still stops the wrong advice.
- **D12 — Amendment A (63C). DECIDED: option 1.** 1. Adopt it: the bridge also catches
  `mod.mount()` chunk errors, then remove the listeners (recommended). 2. Keep
  option 1 as drafted (silent dead end for print/Excel chunks). 3. Take D5
  option 2 instead (bounded reload).

Working tree (checked 2026-09-21 with `git status`): **modified** — this file;
**new** — `MILESTONE-64-PROPOSAL.md`; **deleted** —
`Harold_Thomas_Bennett_TrustAccounting.pdf` (deleted by you); **untracked and not
part of this work, ownership unconfirmed, leave alone** —
`../probate-guardian-test-server.zip`, `WCAG_2.1_AA_regex-structural.md`,
`help.md`. Commit **only** `MILESTONE-63-PROPOSAL.md` and
`MILESTONE-64-PROPOSAL.md`, by explicit path — never `git add -A`. Implementation
starts from that commit.

---

## Authorization record and execution order

**"Ready for authorization" is not approval** (`AGENTS.md` §3). Approval is
recorded here with the requester's name and the date. On 2026-09-21 the
requester authorized all five items, to be executed **in the order below, one at
a time, each with its own commit and test run**; execution of the next item does
not begin until the previous one is committed and green.

| Item | Authorized? | When / by | Notes |
| :-- | :-- | :-- | :-- |
| 63A | **AUTHORIZED — IMPLEMENTED** | 2026-09-21, Alan (requester) — all five, in the order below | the bounded R5 investigation ran and triggered the stop-and-split rule → 63F; committed locally |
| 63B | **AUTHORIZED — IMPLEMENTED** | 2026-09-21, Alan (requester) | D4's 57-doc edits made in the same commit; committed locally, not pushed |
| 63C | **AUTHORIZED — IMPLEMENTED** | 2026-09-21, Alan (requester) | includes Amendment A; committed locally, not pushed |
| 63D | **AUTHORIZED — IMPLEMENTED** | 2026-09-21, Alan (requester) | committed locally; pushed with the rest of MS 63 after the final e2e |
| 63E | **AUTHORIZED — IMPLEMENTED** | 2026-09-21, Alan (requester) | D10: Excel does not carry UCN; help-guide sentence included; committed locally |
| 63F | **AUTHORIZED — IMPLEMENTED** | 2026-09-21, Alan (requester): "do the rest of 63" | D13 decided: option 1 (the recommended one). Split out of 63A by its own stop-and-split bound, then built on the requester's instruction that D11 meant "fix it" |

**Recommended execution order** (from the second review; adopted here as a
recommendation, not a decision):

1. **63C** — removes the silent reload; contained to the hosted build's loader
   and bridge.
2. **63B** — a localized visibility predicate and its certificate-of-service tests.
3. **63D** — one shared signature-note helper and placement coverage.
4. **63A** — the broadest navigation/guidance change, including the bounded R5
   investigation.
5. **63E** — last: it changes the common data model, the conversions, seven PDF
   models, PDF geometry and the help guide.

**Sequencing against Milestone 64.** 63E (header identity in all seven
`pdf-model.js` and the engine header) and 64A-2 / 64B-2 (large edits to the
Guardian and Annual `pdf-model.js`) touch the same files and the same PDF text
assertions. Do not run them in parallel; land one, re-run the PDF specs, then
start the next. 63E after 64B-2 and 64A-2 would avoid re-touching the same
expected strings twice, but that ordering is yours to set.

### Final regression, and the push (2026-09-21)

Run once, after 63E, as instructed. Nothing failed, so nothing was fixed or left alone.

| Gate | Result |
| :-- | :-- |
| `npm test` — unit | **1631 / 1631** |
| `npm test` — full source e2e | **744 passed, 6 skipped, 0 failed** (58 min). The 6 skips are the cases that run only on the hosted target (`offline.spec.ts` and the hashed-chunk case). |
| `npm run test:e2e:web` — hosted profile | **34 passed, 2 skipped, 0 failed** (5.2 min). The 2 skips are the source-only cases. Includes the hashed-build chunk-failure test that was red before 63C. |
| `npm run check:types`, `verify:data-model`, window-bridge and `TEST-INDEX.md` guards | clean / OK (942 data-model rows) |

**For your attention** (none of these blocked the push):
- **63F is written up and not authorized.** Three pages (Simplified Part III, Plan-Annual 3G,
  Plan-Minor Preparer & Attorney) still show a correctly worded but generic explanation with no
  items to list; the invariant walk names them as commented exemptions and fails if that goes
  stale. Decision D13 is yours.
- **Filer-observable changes worth a release note:** the Guardian Cover and D-1..D-5 now explain
  what is missing (Next still works); non-schedule pages no longer tell the filer to "check the box
  verifying there are none"; the "no recipients" question is hidden once Recipient 1 is listed; a
  failed feature chunk shows the "could not be loaded" panel instead of reloading the page; the
  preparer note is on all 16 signing pages; every Cover has an optional UCN which prints in the
  page header; a Plan - Minors filing with only a UCN now prints `CASE #: Pending`; converting a
  Minor plan whose only number was its "UCN" pre-fills the new filing's UCN, not its Case Number.
- **Not run:** Milestone 64 (nothing in it is authorized) and the Firefox/WebKit/Edge/portable profiles.
- Files left alone: `probate-guardian-test-server.zip`, `WCAG_2.1_AA_regex-structural.md`, `help.md`
  (untracked, ownership unconfirmed) and the deleted `Harold_Thomas_Bennett_TrustAccounting.pdf`.
