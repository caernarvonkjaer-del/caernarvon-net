# Milestone 63: Navigation & Status Fixes — Proposal

## Status

**Draft — a proposal, not a work order. Authorizes no change** (`AGENTS.md` §3).
Nothing in this document has been implemented. Item 63A is written up; further
items will be appended as they are raised.

| Item | Summary | Status |
| :-- | :-- | :-- |
| **63A** | Guardian Inventory marks six pages incomplete but never says why | Proposed — one decision needed (D1) |

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
| R3 | The disabled-Next tooltip and the fallback banner use schedule-only wording — *"Add at least one item, or check the box verifying there are none, before continuing."* — on **every** page of **every** type (`legacy-app.js:7209, 7223`; `guardian-inventory/index.js:301, 306`). | On a signature or bond page, hovering a disabled Next says to add an item or tick "none" — wrong advice. Today reachable on the non-schedule pages of the other types (e.g. Annual Part III). The list of real missing fields beneath is correct; only the tooltip/fallback text is wrong. | Read; not exercised in a browser | **In scope for 63A only as far as the six pages** (so D-4 doesn't inherit schedule wording). Wider fix — decision D2. |
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

### Decision needed — D1: should Next also be blocked on Cover and D-1..D-5?

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

### Decision needed — D2: wider tooltip/fallback wording (R3)

1. **Six Guardian pages only (recommended)** — ships with 63A; D-4 doesn't get
   schedule advice.
2. **All pages, all filing types** — fixes the wrong tooltip on the other
   types' non-schedule pages too. Touches every filing type's disabled-Next
   text; small, but a broader change than the reported problem.

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
new unit specs, `TEST-INDEX.md`, and — for D1 option 2 only —
`window-bridge` allow-list if a bridge name is added.

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

Not checked: R3 (wrong tooltip wording on the other types' non-schedule
pages) is from reading the code, not from exercising those pages.

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

Cost note: tests 1-3 are e2e, so they carry the ~25-minute full-regression
cost only when run as a suite; each new test is seconds.
