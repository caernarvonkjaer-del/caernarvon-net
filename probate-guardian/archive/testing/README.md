# Archived testing: a catalogue, not a copy

TEST-REVIEW.md Delivery 7 (2026-10-15). This folder holds references, never
a second copy of any test, fixture or result. A reader can find and read
back a retired test or tool, run the comparisons against older builds that
still exist, and know what each recorded baseline is -- without mistaking
any of it for current coverage. What the suite covers today is
`TEST-INDEX.md` and the live specs; a green run of anything catalogued here
says nothing about today's suite.

`suite-reference.json` beside this file is the machine-readable form.
Both are written by `node scripts/archive-catalogue.mjs --write` from git
history (`git log --diff-filter=D` over `tests/` and `scripts/`), the
historical comparisons the script lists, and `tests/baseline/`; they need
no hand upkeep, and `tests/unit/archive-catalogue.spec.js` fails when the
files no longer say what the script would derive, name a file that still
exists, or cite a commit that does not.

## The suite before this remediation

The reference is the tree where the 2026-10-12 full regression passed, before TEST-REVIEW.md's deliveries changed the suite (Milestone 73Q's last fix): commit `a5833f5`
(`a5833f5f975b73ac481f0aa2a610c78b67fbba1a`, 2026-10-12), agreed by the
requester on 2026-10-15 as the stable reference. No tag was created and no
snapshot exists outside the repository (both decided the same day): the
commit is the reference.

- Without Git: browse it at https://github.com/caernarvonkjaer-del/caernarvon-net/tree/a5833f5f975b73ac481f0aa2a610c78b67fbba1a/probate-guardian/tests or download the
  whole tree at that commit from https://github.com/caernarvonkjaer-del/caernarvon-net/archive/a5833f5f975b73ac481f0aa2a610c78b67fbba1a.zip.
- With Git: git worktree add ../pg-a5833f5 a5833f5 (from D:/caernarvon-net, the git root), then npm ci in ../pg-a5833f5/probate-guardian; the archived tests need the matching source, which that worktree is. Toolchain: Node 24 and the lockfile at that commit (package-lock.json pins Playwright, Vitest and Vite); browsers as npx playwright install puts them.
  Ask before running its full regression (AGENTS.md section 2); a green run
  there says what the suite was, not what it is.
- What it holds: `probate-guardian/tests`, `probate-guardian/scripts`, `probate-guardian/playwright.config.ts`, `probate-guardian/vitest.config.ts`, `probate-guardian/package-lock.json`, `probate-guardian/TEST-INDEX.md`, `probate-guardian/AGENTS.md`.

## Retired tests and tools

Every test or tool file under `tests/` or `scripts/` that git records as
deleted and that does not exist today, with the commit that retired it and
the command that reads its last version back (run from `D:\caernarvon-net`,
the git root; a copy on C: cannot run git). The commit message says why.

| Path (as it was) | Retired | Why (the commit) | Read it back |
| --- | --- | --- | --- |
| `scripts/ms70-ledger-guard.mjs` | 2026-10-14 `cc66ae4` | test(protocol 2): the three governance guards read the suite as syntax trees and paths; the pre-merge comparison moves to tests/historical;  | `git show cc66ae4^:probate-guardian/scripts/ms70-ledger-guard.mjs` |
| `tests/unit/ms70-ledger-guard.spec.js` | 2026-10-14 `cc66ae4` | test(protocol 2): the three governance guards read the suite as syntax trees and paths; the pre-merge comparison moves to tests/historical;  | `git show cc66ae4^:probate-guardian/tests/unit/ms70-ledger-guard.spec.js` |
| `tests/unit/checklist-export-parity.spec.js` | 2026-10-06 `d01edd4` | feat(73F part 2): the sidebar, dashboard and Preview read the export checks | `git show d01edd4^:probate-guardian/tests/unit/checklist-export-parity.spec.js` |
| `tests/baseline/ms70-70D-nav-checks-before.js.txt` | 2026-09-27 `2c171d5` | MS 70 70L: the classic monolith is deleted, and nothing loads, copies, caches, reads or records it | `git show 2c171d5^:probate-guardian/tests/baseline/ms70-70D-nav-checks-before.js.txt` |
| `tests/unit/fixtures/window-bridge-allowlist.json` | 2026-09-27 `2c171d5` | MS 70 70L: the classic monolith is deleted, and nothing loads, copies, caches, reads or records it | `git show 2c171d5^:probate-guardian/tests/unit/fixtures/window-bridge-allowlist.json` |
| `tests/unit/support/legacy-source-extract.js` | 2026-09-27 `2c171d5` | MS 70 70L: the classic monolith is deleted, and nothing loads, copies, caches, reads or records it | `git show 2c171d5^:probate-guardian/tests/unit/support/legacy-source-extract.js` |
| `tests/unit/legacy-bridge.spec.js` | 2026-09-27 `cc532e8` | MS 70 70K: the router owns navigation, the features are a service, and the only global is window.GuardianForms | `git show cc532e8^:probate-guardian/tests/unit/legacy-bridge.spec.js` |
| `tests/unit/monolith-services.spec.js` | 2026-09-27 `cc532e8` | MS 70 70K: the router owns navigation, the features are a service, and the only global is window.GuardianForms | `git show cc532e8^:probate-guardian/tests/unit/monolith-services.spec.js` |
| `tests/e2e/case-resolver.spec.ts` | 2026-09-25 `e9b8251` | feat(ms70-70T): the browser suite reaches the app only through GuardianForms.testing | `git show e9b8251^:probate-guardian/tests/e2e/case-resolver.spec.ts` |
| `tests/e2e/dependent-question-gate.spec.ts` | 2026-09-23 `1b69806` | fix(milestone-67B): a waived bond or a restricted depository no longer blocks filing; one four-state question replaces the bond block's gate | `git show 1b69806^:probate-guardian/tests/e2e/dependent-question-gate.spec.ts` |
| `tests/unit/dependent-question.spec.js` | 2026-09-23 `1b69806` | fix(milestone-67B): a waived bond or a restricted depository no longer blocks filing; one four-state question replaces the bond block's gate | `git show 1b69806^:probate-guardian/tests/unit/dependent-question.spec.js` |
| `tests/e2e/b4-register-page-pruning.spec.ts` | 2026-09-19 `26ea82d` | feat(excel): prune blank pages across every schedule, not just B-4 | `git show 26ea82d^:probate-guardian/tests/e2e/b4-register-page-pruning.spec.ts` |
| `tests/unit/schb4-account-contract.spec.js` | 2026-09-17 `ecabe69` | Revert Milestone 57's implementation, keeping its documents and three fixes | `git show ecabe69^:probate-guardian/tests/unit/schb4-account-contract.spec.js` |
| `tests/unit/schb4-account-export-plan.spec.js` | 2026-09-17 `ecabe69` | Revert Milestone 57's implementation, keeping its documents and three fixes | `git show ecabe69^:probate-guardian/tests/unit/schb4-account-export-plan.spec.js` |
| `tests/unit/schedule-evidence-contract.spec.js` | 2026-09-17 `ecabe69` | Revert Milestone 57's implementation, keeping its documents and three fixes | `git show ecabe69^:probate-guardian/tests/unit/schedule-evidence-contract.spec.js` |
| `tests/unit/combobox-controller.spec.js` | 2026-09-15 `374dcb1` | refactor: delete four dead modules and their specs (Milestone 51A) | `git show 374dcb1^:probate-guardian/tests/unit/combobox-controller.spec.js` |
| `tests/unit/dashboard-preferences.spec.js` | 2026-09-15 `374dcb1` | refactor: delete four dead modules and their specs (Milestone 51A) | `git show 374dcb1^:probate-guardian/tests/unit/dashboard-preferences.spec.js` |
| `tests/e2e/attestation-layout.spec.ts` | 2026-09-13 `889c959` | Land Milestone 43D: split poorly-scoped catch-all test files | `git show 889c959^:probate-guardian/tests/e2e/attestation-layout.spec.ts` |
| `tests/unit/milestone-38e.spec.js` | 2026-09-13 `514d0c5` | test(milestone-43a): delete a dead spec file, stop a diagnostic masquerading as a test | `git show 514d0c5^:probate-guardian/tests/unit/milestone-38e.spec.js` |
| `tests/e2e/support/docx-extract.ts` | 2026-09-13 `ab8d2d1` | feat(milestone-40A)!: remove DOCX export entirely | `git show ab8d2d1^:probate-guardian/tests/e2e/support/docx-extract.ts` |
| `tests/unit/docx-engine.spec.js` | 2026-09-13 `ab8d2d1` | feat(milestone-40A)!: remove DOCX export entirely | `git show ab8d2d1^:probate-guardian/tests/unit/docx-engine.spec.js` |
| `tests/e2e/save-open-sav.spec.ts` | 2026-09-08 `fbd8fd5` | feat(milestone-30): fix switchWard() mount race, split monolithic e2e specs, tag origin-state suites | `git show fbd8fd5^:probate-guardian/tests/e2e/save-open-sav.spec.ts` |
| `tests/e2e/legacy-migration.spec.ts` | 2026-09-07 `a517d73` | Replace per-ward-file model with a unified single case file (Milestone 1) | `git show a517d73^:probate-guardian/tests/e2e/legacy-migration.spec.ts` |
| `tests/e2e/excel-export-import.spec.ts` | 2026-08-29 `8c70777` | Extract Guardian Inventory's print/PDF and Excel import/export (Milestone 8, Phase B) | `git show 8c70777^:probate-guardian/tests/e2e/excel-export-import.spec.ts` |
| `tests/e2e/pdf-export.spec.ts` | 2026-08-29 `8c70777` | Extract Guardian Inventory's print/PDF and Excel import/export (Milestone 8, Phase B) | `git show 8c70777^:probate-guardian/tests/e2e/pdf-export.spec.ts` |

## Comparisons against older builds that still run

- **Milestone 70's merge-gate output comparison: every filing type's PDF and court workbook from this tree against a pinned pre-merge build, served side by side** -- `tests/historical/pre-merge-output.characterization.spec.ts`, `tests/e2e/support/pre-merge-case.ts`, `tests/e2e/support/pre-70-build.ts`; run with: npm run test:e2e:historical (playwright.historical.config.ts); PG_PREMERGE_SHA pins the build, the default is in tests/e2e/support/pre-merge-case.ts; pinned build: 44f46ec; TEST-REVIEW.md Delivery 2, cc66ae4 (2026-10-14); in tests/e2e behind a skip before that
- **The mixed-version and rollback characterizations: an old tab beside a new one; a file saved by the migrated version opened in the pre-merge one** -- `tests/e2e/mixed-version.characterization.spec.ts`, `tests/e2e/rollback.contract.spec.ts`, `scripts/ms70-sav-corpus.mjs`; run with: part of npm test (the source profile); the old build is extracted once with git archive into the temp folder ms70-sav-corpus/<sha> (scripts/ms70-sav-corpus.mjs, extract()); a copy on C: cannot run git, so extract from D: first; pinned build: b28bf25 and 44f46ec
- **The .sav corpus -- every archive version this app has written -- and its golden** -- `tests/fixtures/sav`, `tests/baseline/ms70-sav-corpus-golden.json`, `tests/e2e/sav-corpus.characterization.spec.ts`; run with: tests/e2e/sav-corpus.characterization.spec.ts in npm test

## Recorded baselines (`tests/baseline/`)

Measurements and goldens the live specs compare against, each with its own
note inside the file (listed in `suite-reference.json`). They are evidence
of a run on a day and a machine, re-measured rather than trusted (AGENTS.md
section 1): `runtime-2026-10-12.json` (before TEST-REVIEW.md Delivery 1M)
and `runtime-2026-10-14.json` (after) record the cut in `npm test`'s time;
the `ms70-*` files are Milestone 70's migration goldens and inventories;
`milestone-*` and `20*-*` are older lifecycle and startup measurements.

## What is deliberately not here

- No in-repository snapshot of the suite at any date: git holds every
  version (`git show <commit>:<path>`), and the table above says which
  commit to ask.
- No tag and no external snapshot: the requester decided both on
  2026-10-15; the commit above and GitHub's view of it are the reference.
  No moved tool: each would need the requester's explicit approval (the
  plan's Delivery 7).
- No retired tool reachable from active discovery: the test-index guard and
  the profile membership check read only `tests/unit`, `tests/e2e` and
  `tests/historical`, and the catalogue check above holds this folder to
  naming only files that are gone.
