# Milestone 76 Proposal — What the whole-app review found

## Status

**Draft, Revision 2 (2026-10-19). 76A, 76B, 76C and 76D approved to build
(the requester, 2026-10-19, on Revision 2: "76A–76D, data loss"), in that
order -- built 2026-10-19. 76E, 76G item 1 and 76H items 1, 2, 4 and 5
approved to build (the requester, 2026-10-20: "76E, 76G-1, 76H 1/2/4/5") --
76E, 76G item 1 and 76H items 1, 2, 4 and 5 built 2026-10-20. 76F and 76J
approved to build, in that order (the requester, 2026-10-20: "76F, then
76J") -- both built 2026-10-20. 76I, then the rest of 76G (items 2-8)
and of 76H (items 3 and 6-14), approved to build in that order (the
requester, 2026-10-20: "76I, then rest of 76G and 76H"); 76K and 76L
authorize no change.** Every decision is settled (Appendix
A). Building any other delivery, or any part of one, needs the requester's
named approval of that delivery (AGENTS.md §3).

**What Revision 2 is.** Revision 1 (`b44e2cc0`) wrote up the whole-app
review of 2026-10-18. The requester settled its 23 decisions on 2026-10-19,
each as recommended (`4ac0e13b`), approved 76A–76D, then asked to review the
proposal first and put it on hold (`c50ba5c1`), and asked for it to be
reviewed critically: "Verify all", and "double check prior documentation to
see if any of the ms findings are by design or choice from previous work
done." Six independent reviewers re-verified every finding against the code,
most by running the app's own code; four more searched the milestone
archive, AGENTS.md, the code's decision notes, the tests that pin today's
behavior and the git history for earlier decisions. The author checked a
sample of each one's key claims, and then every commit, archive line and
code line this revision cites. Revision 2 records what they found:

- **Nearly every finding is real**; most were reproduced. One headline was
  wrong (76I item 1: the Clerk's own Annual workbook imports; the refused
  90-sheet template is the app's own extension) and a dozen details were
  wrong; each is corrected below and listed in Appendix D.
- **Missed defects as serious as the listed ones** are added (marked
  *Added in Revision 2*), among them: saves don't run one at a time, so an
  older save can land last and be marked saved; a tab or carriage return
  pasted into an answer cuts off the rest of that line on the filed PDF; a
  crafted case file can put markup on the page today.
- **Earlier decisions.** Every item now says what earlier work it touches.
  Several fixes would reverse a recorded decision -- of the requester, or of
  a milestone's design -- that Revision 1 did not cite.
- **Decisions.** 13 of the 23 settled decisions are **reopened** because the
  answer reverses an earlier recorded decision the question didn't mention,
  or rested on a premise now known to be wrong (AGENTS.md §3: "Re-ask an
  already-answered decision if its cost changed"). 10 stand as settled, some
  with design detail added. 14 **new** decisions are added -- two of them
  (76A-3, 76A-4) for parts of 76A that Revision 1 proposed without asking
  them. Appendix A lists all 37. The 27 reopened and new ones were put to
  the requester one at a time on 2026-10-19 and are settled: 25 as
  recommended, 76K-4 in the requester's own words, and 76I-7 (a question of
  Clerk practice) answered "both, or not sure".
- **Approval.** The approval of 76A–76D (2026-10-19) was given against
  Revision 1. 76A and 76D change substantially here, so that approval was
  **set aside**; the requester approved 76A–76D again on Revision 2 the
  same day, after every decision was settled.

## Where these came from

On 2026-10-18 the requester asked for a code review of the entire app, "not
related to a specific commit". Seven reviewers read it in parallel, one area
each (the court workbooks, the PDFs, the export checks and readiness, saving
and security, the filing model and its lifecycle, the money calculations
against the Clerk's templates, the pages and dashboard); every finding was
checked against the code before it was reported, and the requester asked for
it to be written up as the next milestone (2026-10-19). Revision 2 adds the
independent verification and the search of earlier decisions described in
the Status.

### How each finding was checked

Each finding carries a label saying how much of it has been seen working,
not how serious it is:

- **Confirmed** -- read in the code and reproduced by running the app's own
  code on a test filing (by the original reviewers, the Revision 2
  verifiers, or the author).
- **Reproduced** -- a reviewer ran the app's own code and showed the
  behavior; the line-by-line reading is the reviewer's.
- **Read** -- found by reading the code; not executed. To be reproduced
  before it is fixed (AGENTS.md §2, red-first).

Timings and sizes measured in Node (not a browser) are marked so. Line
numbers were checked on 2026-10-19 and may drift; function names are the
durable reference. "Archive:N" is a line of `MILESTONE-ARCHIVE.md`.

### Four shared designs

Several deliveries rest on the same new piece. Each is built once, with the
first delivery that needs it.

1. **"In use": shown by the page, or carried by an output.** Whether an
   answer behind another answer counts -- for a check, a date draft, an
   amount -- is decided by one rule per field: the page shows the box, *or*
   the court output carries its value. This is the rule the requester chose
   for the amount checks on 2026-10-17 (`b161fed0`, `amount-fields.js`'s
   `inUse`). It matters: the Inventory's D-4 bond period is hidden while the
   bond question is unanswered, yet printed then, so "not shown" alone would
   let a date nobody checked reach the filed document (the hazard decision
   73F-3 exists to stop). Used by 76E item 1, 76J item 2 and 76H item 14.
2. **One encrypted copy of unsaved work per tab, in memory.** Today a lock
   empties memory and relies on a recovery copy in browser storage that every
   tab of the app shares, so another tab's save can wipe it (76A item 4).
   Holding this tab's unsaved work encrypted, in its own memory, while
   locked keeps the 70A rule that the case is cleared from memory while
   locked (nothing readable remains) and needs no shared slot. Used by 76A
   and 76K (it retires the browser-storage copy).
3. **Excel-only blocks that can't be overridden.** A problem the court's
   workbook cannot file faithfully blocks Save as Excel only, never the PDF
   (Milestone 38D: "A format-specific technical issue blocks only that
   affected format", Archive:11436). Each needs its own issue code (the
   existing codes are bypassable on every output) and must land with or
   after 76J item 1, or Preview's Continue button silently does nothing
   (the Milestone 73F part 3 defect returning). AGENTS.md §4's list of
   non-bypassable classes is amended in the same commit. Used by 76I items 3
   and 4.
4. **Each filing's last-edited time.** Today's `lastModified` is restamped
   on every save, edited or not, so the app can't tell which copy of a
   filing is newer (76D item 5). A new stored field, set only when the filer
   edits that filing, lets two tabs merge their saves filing by filing
   (76A-2) and lets Open Backup show which copy is newer (76D-1).

### Recommended order

| Order | Delivery | Why |
| --- | --- | --- |
| 1 | [76A](#76a--saving-never-loses-a-case) Saving never loses a case | A filer can lose a whole case file today, with no warning |
| 2 | [76B](#76b--text-is-kept-as-typed) Text is kept as typed | Typed text is silently erased or altered, and a crafted file can inject markup |
| 3 | [76C](#76c--large-case-files) Large case files | A saved case can become impossible to open |
| 4 | [76D](#76d--open-backup) Open Backup | Can remove a password and roll back work |
| 5 | [76E](#76e--a-date-the-filer-can-always-fix) Dates the filer can always fix | A hidden bad date blocks every output, with nothing to fix |
| 6 | [76H](#76h--the-pdfs) items 1, 2, 4 and 5 | The filed PDF silently loses text, a trust, or letters of a name |
| 7 | [76G](#76g--conversions-and-case-links) item 1 | A filed figure is wrong and nothing says so |
| 8 | [76F](#76f--years-and-links) Years and links | Wrong starting balance; lost links, duplicate ward records, lost documents |
| 9 | [76J](#76j--the-export-checks) The export checks | Must precede 76I's Excel-only blocks |
| 10 | [76I](#76i--the-court-workbooks), the rest of 76G and 76H | Narrower, or visible to the filer |
| 11 | [76K](#76k--security-hardening), [76L](#76l--pages-and-smaller-fixes) | Lower risk |

**Dependencies:** 76A, 76C and 76D all change the save and open code in
`src/core/persistence/` (76A the lock in `src/core/security/app-lock.js`
too), so they are built in that order, not in parallel (AGENTS.md §2). 76B
shares `input-hardening.js` with 76C and 76I. 76E's rule (design 1) comes
before 76J item 2 and 76H item 14. 76J item 1 comes before 76I items 3–4
(design 3). 76A-2 and 76D-1 share design 4. 76K-2 follows 76A (design 2).
76F-2's data-model rows and 76L item 7 are written together. 76I item 1
stands alone and can be built early (76I-7).

---

## 76A — Saving never loses a case

### What a filer sees today

A guardian using a password works for a while, steps away, and the app
locks itself after 15 minutes. They type the password and carry on. If the
case holds attached statements, the case file on disk may by then hold **no
filings at all** -- and the app shows nothing wrong, because what is on the
screen came back from the file a moment before the file was overwritten.
Closing the tab gives no "unsaved changes" warning. The file stays empty
until the next edit, tab switch or lock rewrites it -- and for good if the
browser is closed first, or the file is copied or emailed first.

Other ways the same kind of loss happens: two saves overlapping, with the
older one landing last; a second tab writing its copy over newer work; a
lock losing work that was in no file; an edit made during a long save marked
as saved; and Open Backup marking the case saved when nothing was written.

### Verified

1. **Unlocking can write an empty case over the case file.** *Confirmed.*
   On a successful unlock `submitUnlockForm()` (`app-lock.js:219`) saves the
   unlock state (`saveUnlockFailState()` → `saveAppState()`,
   `launch-preferences.js:144` → `requestSave()` → `autoSave()`,
   `case-file.js:785`), which queues a full save one second later. `lockApp()`
   has already replaced the case in memory with a blank one (`:330`) and is
   re-reading the file (`:335-356`). If the re-read and decryption take
   longer than a second, `saveData()` writes the blank case. Reproduced
   twice in Node: a case with 24 MB of attachments (a 32 MB file) took about
   1.45 s; the file ended with 0 filings while the screen showed 2, and the
   unsaved flag was off. (Chrome makes a `File` object unreadable once its
   file has changed; a new read of the same handle works. The variant where
   the re-read itself fails needs a read slower than a second -- a network,
   OneDrive or USB drive -- and is speculative.)
2. **Saves don't run one at a time.** *Reproduced; added in Revision 2.*
   The debounced save, the save on hiding, the lock's save and an import's
   save can overlap and finish in any order; the last to finish wins. On
   today's code an older save landed last: the file held the older content,
   and the case was marked saved.
3. **A tab with nothing changed still writes; an older tab writes over a
   newer file.** *Confirmed.* `saveData()` writes on every hide, lock or
   unload whether or not anything changed (`case-file.js:855-865`) and never
   checks whether the file changed on disk. A second tab re-opens the same
   remembered file (`launch.js:23-40`). In the probe an idle second tab,
   when hidden, reverted the other tab's newer filing. Filing locks stop two
   tabs editing the *same* filing only, and are skipped when the app runs
   from disk or the browser lacks `navigator.locks` (`ward-lock.js:48, 53`;
   Milestone 16 chose to "skip lock silently" from disk, Archive:2280). Any
   ordinary save from an older cached tab also writes over a file a newer
   version saved, against
   `5de3707`'s stated intent ("so the older tab does not autosave over it").
   Note: `src/tab-coordination.js` already shows "Another tab is active …"
   -- it warns of the second tab, not of the overwrite.
4. **A lock can lose work that is in no file.** *Reproduced.* When there is
   no case file the app can write to -- a case never saved, or Firefox and
   Safari, which have none -- the lock empties memory and, on unlock,
   restores this tab's recovery copy from browser storage. That copy is one
   slot shared by every tab of the app (`recovery-cache.js`; since 70I a tab
   restores only its own), and a failed write of it is deliberately
   swallowed (`case-file.js:846-851`). The work disappears from the app,
   with no message, when the copy is missing at unlock: it could not be
   written (storage full with large attachments); another tab saved or
   edited while this one was locked (a save clears the shared slot); or, in
   Firefox/Safari, a Save Backup download was the last thing before the lock
   (a download clears the copy and marks the case saved; the work is then
   only in the downloaded file).
5. **An edit made during a save is marked as saved.** *Confirmed.*
   `writeCaseToHandle()` clears the unsaved flag and the recovery copy after
   writing (`case-file.js:499-503`; the manual export the same at `:449-450`),
   even when an edit arrived while it wrote. The edit's own save follows
   about a second later, so the loss needs the tab to close before that
   finishes -- several seconds for a large case (17.6 s for 51.7 MB, a Node
   figure).
6. **Open Backup and drop-import mark the case saved even when nothing was
   written.** *Reproduced; added in Revision 2.* `case-import.js:203-204`
   clears the unsaved flag and the recovery copy unconditionally, even when
   there was no handle, no permission, or the write failed. Unsaved work in
   another filing lost its leave-page warning and its recovery copy.
7. *Seen in passing (not data loss):* after any unlock the reloaded case has
   no open filing, so the filer lands on the form-type selector instead of
   where they were.

### Earlier work this touches

- **The lock's design** -- save, clear memory, reload after unlock -- is
  `f23e5d2c` (2026-08-27) and Milestone 70I (the requester approved every 70
  delivery, 2026-09-25); pinned by `security-contract.spec.ts:58` ("the case
  is cleared from memory while locked", 70A). Decision 76A-1 keeps it; 76A-3
  keeps it too (design 2).
- **Two tabs on different filings is a decided workflow:** Milestone 16
  (Archive:2241): "A professional legal assistant or secretary can
  legitimately have Ward A open in tab 1 and Ward B open in tab 2; this
  milestone allows that"; pinned by `ward-lock.spec.ts:60`; the user guide
  says "open a different filing there" (`help/index.html:778`). Since the
  single-file rewrite (`a517d73d`, 2026-09-07) both tabs write the whole
  case to one file, so that workflow already loses data silently; that
  conflict was never recorded.
- **The recovery copy's design** (one shared slot, cleared when a save,
  export or import succeeds) is the Milestone 57 review (Archive:35814-35818)
  and the user guide (`help/index.html:845`). The Firefox/Safari 15-minute
  "Save Your Work" reminder relies on a download clearing the unsaved flag
  (`case-file.js:674-685`).

### Proposed

- **One save at a time.** Saves queue; a save that starts while another
  runs waits, and the last request always reflects the latest state.
- **No save while a lock is being undone** (decision 76A-1), guarded at the
  single write point, `writeCaseToHandle()`, so every caller is covered
  (`saveBackupNow()` calls it directly). A reload that fails leaves the file
  untouched, detaches auto-save, and says so -- pointing the filer to reload
  the page (Open Case File is only on the start screen).
- **Two tabs** (decision 76A-2).
- **Work that is in no file survives a lock** (decision 76A-3).
- **"Saved" only for what was written:** a save clears the unsaved flag
  only when no edit arrived while it wrote; Open Backup and drop-import mark
  the case saved only when they wrote it. Downloads: decision 76A-4.
- **Writes only when there are changes** -- but the direct `saveData()`
  callers that never mark the case changed must mark it first:
  `doGuardianSetup` (`guardian-setup.js:13`, the guardian's name),
  `clearAllData` (`shell-events.js:106`), and the Inventory's on-open
  migrations (`guardian-inventory/index.js:171, 177`).
- After unlocking, the filer returns to the filing they had open.

### Decisions

**76A-1 — How an unlock reloads the case.** *Settled 2026-10-19; stands.*
No save runs until the reload has finished; a failed reload leaves the file
as it was and tells the filer.

**76A-2 — Two tabs and one case file.** *Reopened: the settled answer
("refuse to write whenever the file changed") would end Milestone 16's
decided two-tab workflow -- every save in one tab would make the other stale.*
Each option includes "writes only when there are changes" (Proposed).
1. **(Recommended)** **Merge by filing.** Before writing, a tab re-reads the
   file and keeps the file's copy of every filing it didn't change; a filing
   both tabs changed since they last read the file (told apart by design 4's
   last-edited time) is not written, and the filer is asked. The shared
   people and case records merge record by record, and the Activity Log
   keeps both tabs' entries. *What a filer sees:* Ward A in one tab and Ward
   B in another both save safely, as Milestone 16 intends; two tabs on the
   *same* filing are already kept apart by the filing lock (from disk, or
   without `navigator.locks`, the filer is asked instead).
2. **Refuse when the file changed.** *What a filer sees:* a tab that is
   behind says so and doesn't write; working in two tabs at once stops being
   practical.
3. **Nothing more.** *What a filer sees:* an idle tab no longer overwrites
   anything; two busy tabs still overwrite each other.

**Settled 2026-10-19 by the requester (put again one at a time): option 1.**

**76A-3 — Work in no file when the app locks.** *New: Revision 1's
"keep the work in memory behind the lock screen" was a parenthetical, never
asked, and would reverse 70A's "cleared from memory while locked".*
1. **(Recommended)** **An encrypted copy in this tab's memory** (design 2):
   before the key is dropped, the unsaved work is encrypted into this tab's
   own memory; nothing readable remains; on unlock it is decrypted and
   restored. *What a filer sees:* no lost work after a lock, in any browser,
   with or without another tab; the lock still clears the case.
2. **Keep the work in memory, unencrypted, behind the lock screen.** *What a
   filer sees:* the same, but the case stays readable in memory while locked
   -- reversing 70A.
3. **As today** (the shared browser-storage copy). *What a filer sees:* the
   losses in item 4 remain.

**Settled 2026-10-19 by the requester (put again one at a time): option 1.**

**76A-4 — Firefox/Safari: does a download mark the case saved?** *New:
Revision 1 listed "a download marks nothing saved" inside 76A without asking
it. That would make the 15-minute "Save Your Work" reminder fire forever and
the leave-page prompt appear on every close, and reverses the Milestone 57
rule.*
1. **(Recommended)** **As today: a download marks the case saved.** With
   76A-3 option 1 a lock no longer needs the recovery copy, so the loss that
   motivated the change is gone. *What a filer sees:* no change.
2. **A download marks nothing saved.** *What a filer sees:* the reminder and
   the leave-page prompt after every download.

**Settled 2026-10-19 by the requester (put again one at a time): option 1.**

### Checklist (AGENTS.md §8)

| # | Answer |
| --- | --- |
| 1 Data model | 76A-2 option 1 uses design 4's last-edited time (a data-model row, shared with 76D-1). Otherwise none. |
| 2 Legacy data | A filing without a last-edited time counts as unchanged since it was opened; its first edit stamps it. Files are otherwise read as today. |
| 3 Fixtures | If a change on disk is told by the file's timestamp (76A-2 option 2), six browser specs' fake file handles -- whose `getFile()` returns a new `File`, with a new timestamp, on every call -- must return a stable file between writes. |
| 4 Tests | Unit, red first: the unlock race (with a working stand-in for browser storage -- Node has none, which made one earlier test red for the wrong reason), overlapping saves, two tabs on different filings and on the same filing, the lock with work in no file (each trigger in item 4), an edit during a save, Open Backup with nothing written. Browser: lock and unlock on a case with attachments. Update: the "control" tests that call `saveData()` on an unchanged case expecting a write (`case-file-damaged-open`, `case-file-newer-format`); the recovery-copy cases in `lock-and-save-state.contract`; two source guards (`case-file.spec.js`'s recovery-cache rule, `persistence-owners.spec.js`'s `clearCryptoKey()` position). `TEST-INDEX.md` rows. |
| 5 Export/import | The `.sav` save path, Open Backup and drop-import. |
| 6 Security | 76A-3 option 1 keeps the 70A rule (nothing readable while locked) and removes the shared browser-storage copy. Option 2 would weaken the lock: with 76K item 5 unfixed, Escape plus a Back navigation could show the case. |
| 7 UI | Messages use the existing save banner; the stale-tab notice reuses `tab-coordination.js`'s toast. |
| 8 Legal | None. |
| 9 Cross-form | Not form-specific. |

### Build record — BUILT 2026-10-19

Approved by name on Revision 2 (2026-10-19). What a filer now sees:

- **A lock never loses or empties the case.** No save runs while a lock is
  being undone (`holdSaves()`); a file that can't be read again after the
  unlock is left as it was, auto-save is detached, and the filer is told to
  reload the page. Work the file doesn't hold is sealed with the key into the
  tab's own memory before the key goes, and comes back at the unlock (76A-3);
  the recovery snapshot in browser storage is no longer read (76K-2 retires
  it). The filing that was open opens again.
- **Saves run one at a time**, a save writes only a case with changes, and the
  case is marked saved only up to the change the save began with. Open Backup
  and drop-import no longer mark it saved unless their save wrote it.
- **Two tabs merge filing by filing** (76A-2). A record changed both here and
  in another tab is asked about ("Changed in another tab too"); until the
  filer chooses, the file keeps the other tab's copy and this tab its own.
- Downloads mark the case saved as before (76A-4).

**One mechanism differs from the design above, with the same result.** A
save compares each record with the copy this tab last read from or wrote to
the file (a SHA-256 fingerprint of each filing, person and case record, kept
in memory -- `src/core/persistence/case-merge.js`), not with a stored
last-edited time, so 76A adds **no stored field and no data-model row**.
Design 4's last-edited time is still needed for 76D-1's dates and lands with
76D. Other tabs announce their saves on a broadcast channel (the file name
only); the file's size and time are checked as well.

**Decided while building (the requester, 2026-10-19):** after an unlock the
filer returns to the filing they had open, as approved here. Two tests
(`unlock.spec.ts`, `persistence-recovery.contract.spec.ts`) had been updated
in Milestone 38C to expect no filing open after an unlock; 38C's rule -- no
editor opens from a saved file or an import -- is unchanged, and the two
tests now expect the filing.

Not changed: the snapshot is still written as before (retired by 76K-2,
not approved yet); the appState preferences are this tab's on a merge;
Activity Log entries from both tabs are kept.

Tests: `tests/unit/save-safety.spec.js` (14; the ten flow cases red first on
the code before 76A, each for its stated reason); `lock-and-save-state.contract`
gains the shared-slot case (red first: the work was gone); the
`persistence-owners` lock guard reads the whole lock. Targeted browser run of
the 17 saving, locking, backup and tab specs: 134 cases, all passing after the
two unlock tests were updated.

---

## 76B — Text is kept as typed

### What a filer sees today

On an Annual, Final or Trust Accounting, a guardian types "Pension (monthly
= $1,200)" in a description box and moves on. The box is now empty. The same
happens to "12 months = $14,400", "Donation=500 to church" and "See ../2024
statement". Leaving any of those boxes also strips every quote mark: `30"
Flat screen TV` becomes `30 Flat screen TV` the moment the filer tabs away.
On every form, opening a case file strips quote marks and angle brackets from
every filing's text and cuts words: "Donation=500 to church" becomes "D500 to
church". About one saved annotated print preview in fifty is damaged so that
the filing's whole Print Preview fails every time.

### Verified

1. **Annual-family boxes are emptied or stripped when the filer leaves
   them.** *Confirmed.* Every plain free-text box on the Annual, Final and
   Trust Accountings is marked `data-field-sanitize="security"`
   (`annual-accounting/index.js`, `inpD()`); on blur `form-contract.js:520`
   runs `validateSecurityInput()` (`input-hardening.js:78`), which returns
   `''` when `detectXSSPayload()` or `detectPathTraversal()` matches. The
   pattern `/on\w+\s*=/i` matches "m**onthly =**", "m**onths =**",
   "D**onation=**"; path traversal matches "../2024"; `eval(` matches
   "Re-eval(2024)". When nothing matches, the box still goes through
   `sanitizeInput()`, which removes `"`, `<`, `>` and backtick.
2. **Every open filters every filing's text.** *Confirmed.*
   `sanitizeObjectData()` → `sanitizeInput()` (`input-hardening.js:51-58`)
   removes `"`, `<`, `>`, backtick, `javascript:` and `on<word>=` from the
   filings' strings on every open (`case-reader.js:66`), backup or drop
   import (`case-file.js:690-691` via `case-import.js:90`) and lock recovery
   (`app-lock.js:379`). "Donation=500 to church" becomes "D500 to church" on
   every form. It skips strings that sit directly in arrays, and never
   touches the shared people and case records, the guardian's name, app
   state or the Activity Log -- so a closed filing linked to `John "Jack"
   Smith` drifts from its own person record after every open, raising a
   false "changed since it was closed" note.
3. **Saved annotated previews are damaged.** *Confirmed.* They are stored as
   raw base64 (`pdf-preview.js:184`), not as a `data:` URL, so the stored-file
   exemption (73U) doesn't cover them; base64 that happens to contain `on` +
   letters + `=` is cut. About 2% (1 in 50) of samples were damaged. All
   seven print screens mount the preview with annotation on; the damaged
   copy is kept while its fingerprint matches, and decoding it throws -- so
   the whole Print Preview for that filing fails ("Preview failed to
   render") every time until the filing's content changes.
4. **Filing text reaches the page unescaped.** *Confirmed; list completed in
   Revision 2.*
   - Reachable by typing today: the "This page still needs" list
     (`status/section-status.js:89`, all nine forms), which quotes typed
     county, e-mail and amount text.
   - Reachable by typing once item 1's stripping stops: the Annual D-1 card
     heading (`annual-accounting/index.js:1160`).
   - Reachable through a crafted or edited case file -- **today**, because
     the shared records are never filtered: party and case ids in the
     record pickers (`pick-record-dialogs.js:35, 112`).
   - Reachable through a crafted file once open-time stripping stops: the
     supporting document's Download link (`schedule-docs.js:306`,
     `href="${f.dataUrl}"`, and its page count at `:303`); unparseable dates
     printed raw (the Summary "Period" row on eight forms, the Initial Plan's
     inception date, the Annual Part III declaration, the documents heading);
     `carry-over.js:627`.
   - The content-security policy (`index.html:5`, `script-src 'self'`)
     blocks scripts and inline handlers, but not injected markup carrying the
     app's own `data-*-action` attributes, a link or redirect to another
     site, or a style overlay.

### Earlier work this touches

- **The stripping was deliberate.** `32711165` (2026-08-27) found a real
  stored-script hole -- a script in an imported workbook's County cell ran
  on Print Preview -- and closed it both ways: escaping on display, and
  stripping imported text as one importer already did. Milestone 40H-G
  (Archive:16778-16784) narrowed the stripping, keeping `<`, `>`, `"` and
  backtick as "the actual HTML/script-injection vectors". `825a4e7d` kept the
  blur check on the premise that it matches "tag/URI syntax, not English
  words" -- disproved by item 1. `451afea9` (2026-09-14) kept the blur check
  on the Annual family's boxes only, deliberately not extending it to the
  other eight forms.
- **The requester's 73T-3** (2026-10-04): imported workbook text "keep `"` as
  typing does …; keep stripping `<`, `>` and backticks" (Archive:62204-62206).
  Its premise that typing keeps `"` everywhere is false for the Annual
  family (item 1).
- **73U** exempted stored files only (`sanitize-keeps-stored-files.spec.js`
  pins that everything else is still filtered).
- **Milestone 24, slice 24B** (Archive:4502) supports the fix: "Do not call
  validateSecurityInput() … can strip punctuation or blank values that may
  be meaningful in legal text."
- 39-A and 45A chose raw, compressed base64 for annotations.

### Proposed

Keep every value exactly as typed, opened or imported, and make text safe
where it is shown: every place in item 4 escapes it, in the same change and
before any stripping stops. Annotations are no longer filtered, and one that
can't be decoded is discarded with a notice, as annotations already are when
their filing has changed, so a damaged preview recovers. The dead code
(`detectXSSPayload`,
`detectPathTraversal`, `sanitizeObjectDataInPlace`, `securitySanitize`) is
removed.

### Decisions

**76B-1 — How text is made safe.** *Reopened: the settled answer ("nothing
they type or import is ever changed") reverses the requester's 73T-3 choice
for imported workbooks, which Revision 1 cited only for the quote mark.*
1. **(Recommended)** **Keep everything as typed, opened or imported; escape
   wherever it is shown.** Reverses 73T-3's "keep stripping `<`, `>` and
   backticks" for imports, and 40H-G's retained set: once every display
   escapes, stripping protects nothing and only alters filed text. *What a
   filer sees:* their text exactly, on screen, PDF and workbook.
2. **Keep typed and opened text; imports keep 73T-3's stripping of `<`, `>`
   and backtick only** (dropping the `on…=` and `javascript:` cuts that turn
   "Donation=500" into "D500"). *What a filer sees:* imported text loses
   those three characters, typed text doesn't.

**Settled 2026-10-19 by the requester (put again one at a time): option 1.**

### Checklist (AGENTS.md §8)

| # | Answer |
| --- | --- |
| 1 Data model | None. |
| 2 Legacy data | Text already stripped in a saved file stays as saved (visible: the filer sees their own text). A damaged annotation is discarded with a notice. |
| 3 Fixtures | None. |
| 4 Tests | A render-time check, not a source scan: mark every filing string and shared record with markup, render every page of all nine forms, the "still needs" list and the dialogs, and assert the marker never appears unescaped (red first: the list and the pickers fail today). Unit: the blur and open examples above survive (red first); a damaged annotation is discarded. Update the tests that encode the old rule: `sanitize-keeps-stored-files.spec.js`, `form-contract.spec.js:551-559`, `form-fields.spec.js:133-149`, `annual-field-formatting.spec.ts:178-180`, `annual-mount.spec.ts:256-260`, and their `TEST-INDEX.md` rows. |
| 5 Export/import | `.sav` open, backup import, and the Excel import's `sanitizeImportedText` (`workbook-contract/index.js:60`), per 76B-1. PDFs draw text, ExcelJS escapes XML, and file names are already reduced -- unaffected. |
| 6 Security | Threat: a case file or workbook crafted to run script or inject controls when shown. Protection moves from stripping input -- which also destroyed legitimate text and still missed the shared records -- to escaping every display, backed by the content-security policy. Residual risk: a new display that forgets to escape; the render-time check exists to catch it. |
| 7 UI | None, beyond text no longer changing. |
| 8 Legal | Filed text becomes exactly what the filer entered. |
| 9 Cross-form | All nine forms; only the Annual family strips on blur, every form on open. |

### Build record — BUILT 2026-10-19

Approved by name on Revision 2. What a filer now sees: text stays exactly as
typed, opened or imported -- "Pension (monthly = $1,200)" and "See ../2024
statement" no longer empty their box, quote marks stay, "Donation=500 to
church" no longer opens as "D500 to church", and an imported workbook keeps
< > and backticks (decision 76B-1, reversing 73T-3's import stripping by
name). Text is escaped where it is shown instead.

How the displays were found: `tests/e2e/escaped-text.spec.ts` opens a case
file crafted with markup in every text of all nine forms' complete filings
and in the people's and cases' names and ids, draws every page, picker and
list, and names each place markup reached the page. On the code before 76B
it found the record pickers (people's and cases' ids -- injectable through a
crafted file today). With the stripping removed it found four more: the
"This page still needs" list, the supporting-documents heading (a period
that can't be read), the Annual Part III declaration and the Summary's period
row. All are escaped; so are two it could not reach with the fixtures' data
-- the Annual schedule cards' headings (D-1's description) and the Load Ward
Info From list's ids -- and a supporting document's page count and Download
link (drawn only for a data: URL). Its coverage is what the fixtures fill: a
schedule with no fixture row is not drawn.

Saved annotations that can't be read (a pre-76B open cut about 1 in 50) are
discarded with a notice, said again with "Preview ready." (the status line is
for screen readers, as the existing notice is), and the preview draws.

Removed: `validateSecurityInput`, `detectXSSPayload`, `detectPathTraversal`,
`sanitizeInput`, `sanitizeImportedText`, `sanitizeObjectData(InPlace)` and the
`securitySanitize` option. The import gates (size, ZIP signature, sheet
limits) stay.

Tests: `escaped-text.spec.ts` (new); `sanitize-keeps-stored-files.spec.js`
renamed `text-kept-as-typed.spec.js` and rewritten (opening keeps text,
stamps, PDFs and annotation bytes); `form-contract`, `form-fields`,
`workbook-contract`, `annual-field-formatting`, `annual-mount` updated to keep
text; a `pdf-annotate` case for unreadable annotations. Each new or changed
case red first on the code before 76B.

---

## 76C — Large case files

### What a filer sees today

A guardian with a password attaches a year of bank statements to an Annual
Accounting -- twelve 3.2 MB PDFs. The case saves normally. Next time:
"That file is 51.7 MB, which is over the 50 MB limit for this kind of
import." Every filing in the case is out of reach in the app; the file
itself is intact.

### Verified

*Confirmed and reproduced (Node).* The open limit is 50 MB
(`input-hardening.js:95`), checked on every open (`launch.js:165`,
`case-import.js:40`). Uploads are capped at 15 MB each
(`schedule-docs.js:27`); the export already caps supporting documents at 40
MB per filing and period (Milestone 23, `supplemental-checks.js:11-17,
200-209`), but nothing caps the whole case, and archived years keep their
documents (by design). With a password a case file is about 1.35 times its
attachments, so about 37 MB of uploads crosses the limit; without one about
1.01 times (about 49 MB).

### Earlier work this touches

- The 50 MB limit came with `32711165` (2026-08-27) as hardening, unmeasured;
  no requester decision.
- **Milestone 23** set the per-file and per-filing limits and the rule
  "adjust only with measurement"; its aggregate limits "protect the portable
  build and browser memory" (Archive:4113-4125).

### Proposed

Measure, then make "every case the app saves opens again" true: find the
largest case that saves and re-opens in Chrome, Firefox and Safari; set the
open limit at that measured ceiling; refuse to save a case above it (never
write what can't be opened); and warn once, with a banner (not a dialog --
saves run automatically after every edit), as a case approaches it, naming
the largest attachments.

### Decisions

**76C-1 — Large case files.** *Reopened: the settled 500 MB was never
measured, and by arithmetic one filing's encrypted entry passes Chrome's
largest string at roughly 300 MB of attachments, so saving fails before 500;
Milestone 23 also asks for measurement.*
1. **(Recommended)** **Measure, then set the open limit to the measured
   ceiling, refuse saves above it, and warn by banner as a case nears it.**
   *What a filer sees:* every saved case opens; a warning while there is
   still room; a clear refusal instead of a file that can't be opened.
2. **Cap all attachments per case** (sized to stay under the open limit
   with a password's 1.35×). *What a filer sees:* a refusal when attaching
   the statement that crosses the cap.

**Settled 2026-10-19 by the requester (put again one at a time): option 1.**

### Checklist (AGENTS.md §8)

| # | Answer |
| --- | --- |
| 1 Data model | None. |
| 2 Legacy data | Cases saved over 50 MB, unopenable today, open again (if under the measured ceiling). |
| 3 Fixtures | None. |
| 4 Tests | Unit: a case over 50 MB opens; a save above the ceiling is refused; the banner shows once (red first). The measurement itself is recorded with its browser and machine. `TEST-INDEX.md` rows. |
| 5 Export/import | `.sav` open and save. |
| 6 Security | The limit checks the compressed size only; it never stopped a zip bomb, and isn't claimed to. |
| 7 UI | The existing save banner. |
| 8 Legal | None. |
| 9 Cross-form | Not form-specific. |

### Build record — BUILT 2026-10-19

Approved by name on Revision 2. **Measured first, as decided.** A
password-protected case with one filing's attached statements, saved and
reopened through the app's own code in each browser on this workstation:

| Statements | File | Chrome save / open | Firefox | WebKit (Windows build) |
| --- | --- | --- | --- | --- |
| 120 MB | 162 MB | 22 s / 7 s | 26 s / 5 s | 3.5 / 2.7 min |
| 200 MB | 283 MB | 38 s / 12 s | 47 s / 10 s | 6.2 / 4.8 min |
| 280 MB | 384 MB | -- | 68 s / 22 s | 8.4 / 6.6 min |
| 400 MB | 545 MB | -- | 92 s / 19 s | -- |

Each column's last row is the last step taken; the next stopped in the
measuring script itself, not in the app. The first measurement found that
Chrome and Firefox **hung past an hour at a 220 MB file**, and
profiling a save found why most of its time went: `crypto.js` built every
encrypted part's base64 one character per byte (18-38 s of each save for 60
MB of statements, in Node; the whole filing's encryption 33.5 s, now 1.06 s).
The requester weighed storing each attachment as its own encrypted zip entry
(a file-format change) against fixing that one function, and chose the fix,
inside 76C, with no format change, keeping compression (2026-10-19).
WebKit here is Playwright's Windows build, much slower than Safari on a Mac;
its figures bound the ceiling, not the timings a Mac filer sees.

**The limit is 250 MB** (it was an unmeasured 50 MB): every size up to 283
MB saved and reopened in all three, and about 10% is kept back for computers
with less memory. A case above it is never written -- the file stays as it
was, the case stays unsaved, and the filer is told, with its three largest
supporting documents; Save Backup and Save As say so in a dialog. A case past
200 MB (80%) is warned about once a session by a banner.

Still true, and worth knowing: every save writes the whole case, so a case
with 200 MB of statements takes 30-50 s to save in Chrome and Firefox.

Tests: `save-safety.spec.js` gains four 76C cases (three red first for the
stated reasons; the fourth's warning did not exist); `base64-chunks.spec.js`
(new; red first: 1,048,576 calls for a megabyte).

---

## 76D — Open Backup

### What a filer sees today

A guardian opens an older password-protected backup to recover one filing.
The prompt says only how many filings "will be updated". A filing in both is
replaced by the backup's older copy (three weeks of edits gone in the
probe). Filings the guardian deleted come back. From then on the app treats
the backup as the case's file: it is remembered for the next launch, and in
Chrome/Edge auto-save stops ("click Save Backup once to re-enable
(backup.sav)") until the next Save Backup writes to it. And if the open case
has no password, that Save Backup rewrites the backup **unencrypted**, SSNs
readable; between two password-protected cases it is silently re-locked under
the open case's password.

### Verified

1. **An older copy replaces newer work.** *Confirmed.* `case-import.js:155`
   replaces the filing; the prompt (`:127`) gives only "• 1 existing ward(s)
   will be updated", with no dates; the main file is written at once (`:183`).
2. **The backup becomes the case's file.** *Confirmed.* The backup's handle is
   remembered (`:195`) and reopened at the next launch; a picker handle is
   read-only in Chrome/Edge, so auto-save stops until Save Backup asks for
   write permission and writes the backup.
3. **The password is removed or swapped.** *Confirmed, both halves.*
4. **Deleted filings come back; a protected backup merged into a
   no-password case writes its filings (SSNs included) into the main file in
   plain text, without a warning.** *Reproduced; added in Revision 2.*
5. **"Newer" can't be told today.** *Read; added in Revision 2.* A filing's
   `lastModified` is restamped on every save of the open filing, edited or
   not (`case-file.js:839`), and on every imported filing
   (`saveWardToState()`, `:768`).

### Earlier work this touches

- **This is the designed behavior.** Milestone 18 (in-session restore:
  "existing ward(s) will be updated/replaced", Archive:2698-2720); 41B
  decision 3 ("Leave Open Backup (.sav) exactly as it is today",
  Archive:18913-18915); `a517d73d` ("opening/restoring a file this way makes
  it the case's ongoing save target"); the user guide (`help/index.html:768`:
  "replacing what is currently loaded, and re-arms auto-save to that file
  (Chrome and Edge)" -- though the code merges, not replaces); pinned by
  `backup-restore-sav.spec.ts:257`.
- Mid-session, Open Backup is the **only** way to open a different case file
  (Open Case File is on the start screen only).
- The guide's "Encryption is optional but the choice is permanent … applies
  to that case for good" supports item 3's fix.

### Proposed

Never write any file with a weaker password than it had; never merge a
protected backup's filings into an unprotected case without saying so. The
rest is decision 76D-1.

### Decisions

**76D-1 — What Open Backup does.** *Reopened: the settled answer removes the
designed and documented behavior (Milestone 18, 41B, the user guide) and the
only mid-session way to open another case file; and "keep the newer copy"
needs a reliable date the app doesn't store today.*
1. **(Recommended)** **Two actions.** "Open Case File…" switches to another
   case file, which becomes the case's file -- today's documented behavior,
   now explicit. "Restore from Backup…" merges into the open case: each
   filing in both is shown with both copies' last-edited dates (design 4)
   and the filer chooses; filings absent
   from the open case are offered, not silently added; the open case's file
   and password never change. *What a filer sees:* two clearly named
   choices.
2. **Keep one Open Backup, as documented, but safer:** a per-filing choice
   with dates instead of a count, never a weaker password, and a warning
   before a protected backup's filings join an unprotected case. *What a
   filer sees:* today's action, with the choices shown.
3. **As Revision 1:** merge only, never change the case's file. *What a
   filer sees:* no mid-session way to switch case files.

**Settled 2026-10-19 by the requester (put again one at a time): option 1.**

### Checklist (AGENTS.md §8)

| # | Answer |
| --- | --- |
| 1 Data model | Design 4's last-edited time (shared with 76A-2), for options 1 and 2. |
| 2 Legacy data | Filings without it show "last saved" dates, marked approximate. |
| 3 Fixtures | None. |
| 4 Tests | Unit and browser: an older copy never replaces newer work unasked; deleted filings are offered; no file is written with a weaker password; the plain-text merge warns (red first). Update `backup-restore-sav.spec.ts:257`. `TEST-INDEX.md` rows. |
| 5 Export/import | Open Backup and drop-import (whose prompt has the same problem). |
| 6 Security | Removes the path that writes a protected file unencrypted, and the silent plain-text merge. |
| 7 UI | The existing confirm dialogs; `help/index.html`'s Open Backup row rewritten. |
| 8 Legal | None. |
| 9 Cross-form | Not form-specific. |

### Build record — BUILT 2026-10-19

Approved by name on Revision 2. What a filer now sees in Save Controls: **Open
Case File (.sav)** and **Restore from Backup (.sav)** in place of Open Backup.

- **Restore from Backup** merges into the open case as the filer chooses. Each
  filing in both that differs is asked about -- "Keep this case's copy
  (edited …)" or "Use the backup's copy (edited …)"; filings only the backup
  has (a filing deleted since, say) are offered, never added unasked; people
  and case records the case lacks are added, as before; the guardian's name
  stays (a blank one is filled). The case's file and password never change,
  so no file is ever rewritten with a weaker password this way. A protected
  backup restored into a case with no password is said so, in the question,
  before anything is restored. A case with no filings yet confirms once and
  takes them all. A file dropped on the window does the same.
- **Open Case File** saves the open case first; if it can't (no file it can
  write, or a refused or failed save) it asks before the changes are lost.
  It then closes the case to the start screen, where the other file is
  chosen and opens with its own password -- the launch path, already tested,
  rather than a second copy of it mid-session.
- **Last-edited dates (design 4):** a stored `lastEdited` on each filing, set
  as a save finds the filing changed since its file last held it (76A's
  fingerprints, which leave both stamps out). A filing saved before 76D shows
  its last save, marked approximate. Data-model row `wards[].lastEdited`.
- **Save As** from a case with no password onto a password-protected case
  file asks first ("Replace a password-protected file?").
- A different-password backup's password is now typed into a hidden box.

Tests: six 76D cases in `save-safety.spec.js` (each red first on the code
before 76D: replaced, added, remembered or not warned unasked; no
last-edited date; no Open Case File); `backup-restore-sav` (the two buttons;
Open Case File asking, then the start screen); `case-file-damaged-open` and
`case-file-newer-format` through Restore from Backup; `case-file-protection`'s
Open Backup test reversed (the backup never becomes the case's file); the
`autoAcceptDynDialogs()` helper answers the new per-filing questions.

---

## 76E — A date the filer can always fix

### What a filer sees today

A guardian types an impossible date (02/30/2026) in a box that is later
hidden -- an attorney-waiver order date, then they enter an attorney; or a
date in Schedule B-1, then they start a new year. Every output is now
blocked by "… must be a valid date", marked "can't be overridden", and the
box is nowhere on the page (it comes back only if they reverse the answer
that hid it, and nothing tells them that). Leaving a schedule page can move
an unfinished date onto a different line -- or delete the row holding it.
A date from an imported workbook that can't be read is reported only as
"Imported from Excel — Line 1" (or with a raw field name such as
"attorney.signatureDate").

### Verified

All come from one store, the filing's unfinished-date drafts
(`__fieldDrafts`, `src/core/form/commit-coordinator.js`):

1. **A hidden box's draft still blocks.** *Confirmed.*
   `getFieldDraftIssues()` (`:58-69`) reports every unreadable draft, never
   asking whether its box is in use; the issue can't be overridden
   (`issue-registry.js:13`). Reproduced for the attorney-waiver order date,
   a Part VIII trust date under No, and the Inventory's bond period.
2. **Start New Year keeps the drafts.** *Confirmed.*
   `resetYearlyFieldsForNewYear()` never touches `__fieldDrafts`, and
   `commitStoredDateDrafts()` checks whether a draft can be read (`:77-78`)
   before whether its row still exists (`:81-82`), so an impossible orphan is
   never dropped.
3. **Leaving a schedule page moves or deletes a draft.** *Confirmed; worse
   than Revision 1 said.* `pruneBlankCards()` (`prune-cards.js:36-45`)
   removes untouched schedule rows with `data[key] = kept` and never remaps
   drafts (its card pass at `:68` does, through `keepRows()`). And because
   the untouched-row tests ignore drafts, a row whose only content is an
   unfinished date counts as untouched and is removed itself, leaving the
   draft blocking a line that no longer exists. (The existing clean-up test
   calls `keepRowsAt`, not `pruneBlankCards`, which is why this survived.)
4. **An imported date that can't be read names nothing.** *Confirmed.* The
   three importers record drafts with no route or label
   (`annual-accounting/excel.js:215`, `guardian-inventory/excel.js:152`,
   `simplified-accounting/excel.js:126`); the issue falls back to Part I
   (Annual family) or the Cover.
5. **An Excel import keeps old drafts.** *Read; added in Revision 2.* Import
   keeps the drafts (`import-transaction.js:49-50`) while replacing
   schedules wholesale (`:229-240`), so an old impossible draft can sit over
   an imported row, and correcting it overwrites the imported date.
6. **Draft labels don't match the pages.** *Read; added in Revision 2.* A
   trust's draft reads "Part VIII — Line 2" where the page says "Trust 2";
   Inventory drafts read "Line N" where its checks say "A-1 row N"
   (`commit-coordinator.js:50-56`).

### Earlier work this touches

- **Milestone 25** designed the drafts: "Any unresolved invalid date draft
  blocks print/PDF/DOCX/supported Excel commands" (Archive:5204-5205), so
  that "export must never use that old value while the user sees an invalid
  replacement" (Archive:5092). It also required that "insertion, deletion,
  duplication, pruning, or sorting must remap them" (Archive:5046-5049) and
  ruled "never prune draft-only rows" (Archive:5132).
- **73F part 3** claimed the clean-up was built (Archive:58171); only the
  card pass got it. **Decision 73F-3** made the issue non-bypassable "once
  drafts are cleaned up on row removal" (Archive:57775); its review warned
  that "an orphaned draft would become an unclearable block" (Archive:61544).
- **73T** intended an unreadable imported date to be "shown in its box and
  named at Preview" (the importers' own comments).
- **Decision 73F-N5** ("Next follows each form's existing rule once draft
  clean-up is built") also depends on this delivery.

### Proposed

- A draft blocks only while its box is in use (design 1: shown, or carried
  by an output). A draft whose box is not in use is kept (hiding never
  deletes, AGENTS.md §4) and comes back in its box if the box is shown
  again. A box the page hides but an output still prints (the Inventory's
  bond period while the bond question is unanswered) keeps blocking, and its
  issue names the answer that shows the box.
- A row holding a draft counts as touched (decision 76E-1); removing rows
  moves drafts with them, as the card pass already does.
- An impossible draft whose row is gone is dropped, like a readable one.
- Start New Year clears the drafts of exactly the fields it resets, and
  keeps those on fields it carries (the 2026-10-17 rule).
- Imported drafts name their schedule, line, field and page; an import
  clears drafts on the rows it replaces.
- Draft labels use each page's own words ("Trust 2", "A-1 row 2").

### Decisions

**76E-1 — A row holding only an unfinished date.** *New.*
1. **(Recommended)** **It counts as touched and is kept** (Milestone 25's
   rule). *What a filer sees:* the date they half-typed stays on its row to
   finish.
2. **It is removed with its draft.** *What a filer sees:* the half-typed date
   disappears when they leave the page.

**Settled 2026-10-19 by the requester (put again one at a time): option 1.**

### Checklist (AGENTS.md §8)

| # | Answer |
| --- | --- |
| 1 Data model | None (`__fieldDrafts` is internal and already saved). |
| 2 Legacy data | Impossible drafts orphaned in saved files are dropped on open (invisible typing, not filed data); drafts already misplaced by the old clean-up can't be detected. |
| 3 Fixtures | None. |
| 4 Tests | Unit, red first, calling `pruneBlankCards()` itself: each item above. Browser: a hidden box's bad date doesn't block; a draft-only row survives leaving the page. Update `drafts-follow-rows.spec.js`; also `rules-follow-rows.spec.ts`, `hidden-answers.spec.js`, `conditional-reveal-routes.spec.ts`. `TEST-INDEX.md` rows. |
| 5 Export/import | The three Excel importers. |
| 6 Security | None. |
| 7 UI | Issues name their page and box like every other. |
| 8 Legal | None. |
| 9 Cross-form | All forms share the store. |

### Build record — BUILT 2026-10-20

Approved by name (the requester, 2026-10-20: "76E, 76G-1, 76H 1/2/4/5"). What a
filer now sees: a date they can't see never blocks a filing, and every
impossible date names the page, line and box where it can be corrected.

- **In use (design 1).** `src/core/filing/date-fields.js` lists every date box
  of the three forms that import workbooks, and the Plans' advance-directive
  dates, with the page, the section and row words the forms' own checks use,
  and the answer that hides each conditional box: 11 on the Annual family, 2
  on the Simplified, 9 on the Inventory, 4 on the Plans (read from each page,
  its PDF and its workbook contract). An impossible date blocks only while its
  box is shown or printed; a hidden one is kept and blocks again, in its box,
  when the answer shows it. The bond period, hidden yet printed while the bond
  question is unanswered (Inventory and Annual family), still blocks and says
  "Its box shows once the bond question is answered with a bond". The Trust
  Accounting's trust dates follow the same rule (shown by the Filing Type,
  printed by the filing's type; the two differ only on a filing the export
  checks already refuse).
- **Rows.** Leaving a page keeps a row or card whose only content is a date
  still being typed (decision 76E-1), and the schedule clean-up moves dates
  with their rows, as the card clean-up did. An impossible date whose row is
  gone blocks nothing and is dropped.
- **Start New Year** clears the dates still being typed on exactly the fields
  it resets (found by running the reset on a marked copy, so the list is not
  kept twice) and keeps those on fields it carries.
- **Imports.** A workbook date that can't be read is named by its page, line
  and box, and quotes the workbook's text ("Schedule B-1 — Line 2 — Court
  Order Date … The imported workbook has "3rd of May" here."). An import drops
  the dates still being typed on the fields it fills.
- **Names.** "Trust 2" (was "Line 2"), the Inventory's "C-2 row 2" (was
  "Line 2" under the page's heading), "Directive 1" on the Plans. A date typed
  on a page was named by the page's whole heading, which carried the test
  system's warning and the header's buttons ("TEST SYSTEM - Do not use for
  filing - Cover & Part I — Required Information All Filings? — …"); it is now
  the heading's own words, and the checks' section words for the dates the
  list names.
- **Found while testing, fixed with it:** the Plans' 11 hand-drawn date boxes
  showed the last good date, or nothing, after a redraw while the half-typed
  date still blocked; they now show it, as every other date box does.

Tests: `date-fields.spec.js` (new: each hidden box, the bond period's note,
the names, an imported date; every workbook-contract date field has a place
in the list) and `drafts-follow-rows.spec.js`'s 76E cases, calling
`pruneBlankCards()` and the new-year reset themselves; `import-transaction.spec.js`
(an import's dates still being typed). All red first on the code before 76E
for the stated reasons. Browser: `hidden-date-drafts.spec.ts` (new) checks each
conditional box against its page for five forms (every condition seen both
ways), and drives a hidden box's bad date, a date-only row leaving the page and
a Plan's box redrawn -- red first on the old code (the heading's words, the row
removed, the box empty).


---

## 76F — Years and links

### What a filer sees today

A guardian opens last year's filing from Prior Years to fix a typo, then
clicks New Year. The new year repeats a period that already exists and
starts from the older year's ending balance. Setting the county while an
older year is open creates a second ward record for the same person. An
Initial Inventory's documents disappear after its first New Year. Two years
with the same period dates show each other's documents, and deleting one
deletes the other's.

### Verified

1. **A new year is built from whichever year is open.** *Confirmed.*
   `startNewWardYear()` snapshots the active year. With 2024 open and 2025
   archived, Year 3 got Period From 2025-01-01, 2024's ending balance and
   2024's Schedule D; no note fired.
2. **The case and shared-record links belong to each year.** *Confirmed.*
   `WARD_SYSTEM_KEYS` (`filing-years.js:27`) leaves out `caseId`,
   `wardPartyId`, `guardianPartyIds`, `attorneyPartyId` and
   `preparerPartyId`. Link in Year 2, open Year 1: `caseId` and `wardPartyId`
   are null. Then: the filing leaves its case group; **setting the county in
   that year creates a second ward record for the same person**
   (`ensureWardPartyForFiling()`, `ward-county.js:63-72`); the Judge copy
   falls back to its typed-case-number confirmation; New Filing from Existing
   made from Year 1 creates a second case and writes it onto the older year.
   An unmerge made while an earlier year is open leaves the later year
   linked to the merged record (`party-resolver.js:1051-1056`).
3. **An Initial Inventory's first-year documents disappear.** *Confirmed.*
   Before any new year, uploads are filed under `'initial'` (`doc-period.js`;
   a deliberate compatibility key, `schedule-docs.js:38-42`);
   `checkInActiveYear()` names that year "Year 1" and every lookup then uses
   "Year 1". Deleting Year 1 leaves the `'initial'` files in the case file.
4. **Two years with the same period share one documents folder.**
   *Confirmed; broader than Revision 1 said.* Documents are kept by period;
   two years with the same period (both blank, or item 1's repeat) show each
   other's uploads all the time, and deleting either deletes both.
5. **The year dialogs ignore another tab's lock.** *Confirmed.* New Year and
   Edit Prior Year go ahead after `switchTo()` fails
   (`year-dialogs.js:40-41, 71-72`); Delete Year never tries to take the
   lock (`:88-108`).

### Earlier work this touches

- Building from the open year was never decided for an earlier open year:
  the records describe New Year as archiving "the current year's data"
  (Milestone 74, Archive:64400). 74K-2 (the requester: the new period starts
  the day after the last, Archive:64518) and the rule Milestone 71's D6
  rests on support the fix: Fla. Prob. R. 5.696(b)(1), as Milestone 71
  quoted it, makes an accounting's starting balance "the ending balance of
  the preceding accounting" (Archive:52887; it notes the rule excludes the
  Simplified).
- The links' place predates them (they were added on 2026-09-07 with no
  thought of years). But **guardian, attorney and preparer links pair
  row-by-row with each year's own guardian, attorney and preparer**
  (`row-links.js`) -- a successor guardian is normal -- so those can't move
  to the filing. 40C-A: a merge "must never silently choose" between
  differing values (Archive:14341); Milestone 49: "reopening never silently
  rewrites a filing the user hasn't touched" (Archive:23340). The county
  stays per year (40C-A item 4).
- Documents by period are by design (40C-D, 75A-1); the `'initial'` key was
  meant to keep first-year uploads where they were.
- Milestone 16: "No 'force open anyway' escape hatch. The hard block is
  intentional" (Archive:2296); 38C: proceed "only when it returns true".

### Proposed

- New Year builds from the latest year (decision 76F-1, settled), defined as
  the highest "Year N" that exists; the dialog's note and the unfiled-year
  note (`dashboard/index.js` ~222) describe that year.
- The case and ward links move to the filing; the others stay per year and
  merges reach every year (decision 76F-2).
- The Inventory's `'initial'` and "Year 1" documents are merged into one
  folder, and found under either.
- Documents: decision 76F-3.
- All three year dialogs stop when the filing can't be locked.

### Decisions

**76F-1 — New Year while an earlier year is open.** *Settled 2026-10-19;
stands.* Always build from the latest year (defined above).

**76F-2 — Where the links live.** *Reopened: the settled answer ("all links
on the filing") would tie an older year's guardian to a successor guardian's
shared record -- reproduced: an edit to Year 1's guardian Alice was written
into Year 2's guardian Carol's record.*
1. **(Recommended)** **The case link and the ward link on the filing;
   guardian, attorney and preparer links stay with each year's rows, and
   merges and unmerges reach archived years. A link that differs between
   years is shown and asked about, never resolved silently** (40C-A). The
   old per-year copies are removed from every archived year's snapshot.
   *What a filer sees:* a case link holds in every year; an older year that
   was in a different case (a change of venue) is shown, not overwritten.
2. **All links on the filing** (as settled). *What a filer sees:* the same,
   but an older year's guardian can be linked to the wrong person.

**Settled 2026-10-19 by the requester (put again one at a time): option 1.**

**76F-3 — Two years with the same period.** *New.*
1. **(Recommended)** **Keep documents by period; never delete a folder
   another year still uses, and say so.** 76F-1 removes the usual way a
   period repeats. *What a filer sees:* deleting a year never deletes
   another year's documents.
2. **Keep documents by year and period** (a migration of every saved case's
   documents). *What a filer sees:* each year's documents fully separate.

**Settled 2026-10-19 by the requester (put again one at a time): option 1.**

**76F-4 — Editing an older year and the shared records.** *New.*
1. **(Recommended)** **An older year opened for correction behaves like a
   closed filing:** its edits don't update the shared ward, guardian or
   attorney records; differences are shown as drift (Milestone 49). *What a
   filer sees:* fixing a typo in last year's filing can't change this year's.
2. **As today:** an edit in an older year updates the shared records and the
   other filings.

**Settled 2026-10-19 by the requester (put again one at a time): option 1.**

### Checklist (AGENTS.md §8)

| # | Answer |
| --- | --- |
| 1 Data model | `caseId` and `wardPartyId` become filing-level, gaining the data-model rows they lack (with 76L item 7); the other link rows stay per year. |
| 2 Legacy data | On open: the latest year's case and ward links become the filing's; a differing older link is kept on its year and shown (not silently resolved); the keys are removed from archived snapshots so they can't return. `'initial'` and "Year 1" documents merged. |
| 3 Fixtures | The year-rollover golden regenerated with a stated note. |
| 4 Tests | Unit per item (red first). Browser: `new-year-keeps-overdue.spec.ts`, `prior-year-delete.spec.ts`, the year-rollover characterization. `TEST-INDEX.md` rows. |
| 5 Export/import | `.sav` save/open (where the links live). |
| 6 Security | None. |
| 7 UI | The existing year dialogs and lock notice. |
| 8 Legal | None. |
| 9 Cross-form | All filing types have years; the documents key differs on the Inventory. |

### Build record — BUILT 2026-10-20

Approved by name (the requester, 2026-10-20: "76F, then 76J"; to proceed once
the regression of the batch before passed, which it did: 3,404 unit and 1,053
browser tests). What a filer now sees:

- **New Year follows the latest year** (decision 76F-1), whichever is open:
  with 2023-2024 open for a correction and 2024-2025 the latest, the new year
  starts 07/01/2025 from 2024-2025's ending balance, and the dialog says "The
  new year follows 2024-2025, the latest year -- not 2023-2024, which is open
  now." The dashboard's unfiled-year note describes the latest year too.
- **The case and ward links are the filing's** (decision 76F-2): opening an
  older year keeps the filing in its case group, its county no longer makes a
  second ward record, and a New Filing from Existing made from it joins the
  case. A case file saved before 76F moves them on open (the latest year's,
  `year-links.js`); a year that was linked to another case or ward record
  keeps that link as its own and Prior Years says so. Merges and unmerges
  reach the archived years' guardian, attorney and preparer links (the
  merge record names each year).
- **An earlier year open for correction behaves like a closed filing**
  (decision 76F-4): its edits stay in that year, and its Cover says so ("This
  is an earlier year, open for correction."), with any drift and its Sync
  buttons.
- **The Initial Inventory's first-year documents stay** (item 3): "Year 1"
  is its 'initial' folder; documents already filed under "Year 1" join it on
  open, and deleting Year 1 takes them.
- **Deleting a year keeps a folder another year uses** (decision 76F-3) and
  the confirmation says so.
- **The year dialogs stop while another tab has the filing open** (item 5):
  New Year and Edit this year when the filing can't be opened; Delete Year
  shows the lock notice (it never asked).

Data model: `wards[].caseId`, `wards[].wardPartyId`, `wards[].yearCaseId`,
`wards[].yearWardPartyId`, `parties[].mergeRecord.repointedSlots[].yearKey`.

Tests: `years-and-links.spec.js` (new; red first: seven of ten on the old
code -- links carried with a year's data, the Inventory's "Year 1" folder,
both years' documents deleted, an older year not closed, an archived year's
guardian left on the merged record) and `years-and-links.spec.ts` (new; red
first: the dialog named no latest year, Year 1 lost the case link, Delete
Year went ahead past the lock); `party-resolver.spec.js` reads the merge
record's year.

---

## 76G — Conversions and case links

### What a filer sees today

A guardian starts an Annual Accounting for 2025, then makes a Simplified
from it for the same year. The Simplified's Starting Balance is the Annual's
ending balance, so once the year's interest and charges are entered again
the year is counted twice -- and converting back adds it again. Nothing
flags it. Other conversions drop the guardian's address or co-guardians,
answer a question the filer never answered, or quietly drop trusts.

### Verified

1. **A same-period conversion starts from the ending balance.** *Confirmed.*
   Annual → Simplified (`conversion.js:239` with `:259`) and Simplified →
   Annual (`:307` with `:308`) carry the source's ending balance through
   `applyCarriedStartingBalance()` and copy the source's period. The Clerk's
   Simplified Line 1 is "Starting Balance [Net Assets per the Prior Report]"
   (`'PARTS I, II '!C19`; Line 8 is `H31 =H19+H24-H29`); the Annual's reads
   "Starting Balance [Net Assets at End of Accounting Period, per the Prior
   Period Report]"; and Fla. Prob. R. 5.696(b)(1), as Milestone 71 quoted it,
   makes an accounting's starting balance "the ending balance of the
   preceding accounting" (Archive:52887; it notes the rule excludes the
   Simplified). An Annual for 2025 starting at $10,000 with
   $50 in and $20 out ends at $10,030; the Simplified starts at $10,030 and,
   once the same $50/$20 are entered, Line 8 is $10,060; converting back
   starts the Annual at $10,060. Because the period is always copied, "same
   period" is always true for these two pairs. **Simplified → Final** (added
   in Revision 2) also copies the period and carries the ending balance; its
   notice says "the new Annual Accounting".
2. **Initial Inventory → Annual.** *Confirmed* (`conversion.js:168`,
   `:169-175`). Schedule A gets each C-1 source's full projected amount,
   ignoring the ward's share ($24,000 at 50% arrives as $24,000), against the
   function's own comment. Every trust is answered "Created after the GID?
   No" instead of being left unanswered -- a question that decides whether a
   separate trust accounting is required (the Clerk's Part VIII: "If the
   answers to questions #1 and #2 for Each trust are both ‘YES’ you MUST file
   a separate trust accounting for Each trust"). Trusts beyond three are
   dropped without a word (the template has three slots).
3. **Carries drop the guardian's address and co-guardians.** *Confirmed.*
   Annual or Annual Plan ↔ Simplified: the Annual's office address and the
   Simplified's residence address are the same box on the Clerk's forms, but
   the carry writes blank (`carry-over.js:377-378, 487`); the Simplified then
   asks for it. A guardian with "same as mailing" ticked arrives blank too.
   Into an Initial Inventory only Guardian 1 carries (the form takes three);
   into an Initial Plan only Guardian 1 carries, padded with blank rows (the
   form takes four).
4. **Annual → Final.** *Confirmed; corrected in Revision 2.* The notice says
   "The accounting period and every schedule start blank" (`conversion.js:73`),
   but Period From has been filled since 74K, and it says the county comes
   from the "case record" (it comes from the ward's record). The Final starts
   without Schedule D, Part VIII's trusts, Part IX's bond, the guardian's
   relationship and the B-4 bank accounts, which Start New Year keeps.
   (Revision 1 also listed the ward's status: wrong -- Start New Year clears
   it.)
5. **"+ New Case" can't split a filing off its case.** *Confirmed.*
   `doCreateCaseFromWard()` calls `getOrCreateCaseForWard()`, which returns
   the case the filing already has.
6. **A linked case's county is looked up through a field that doesn't
   exist** (`filing.casePartyId`, `ward-county.js:162`); the lookup always
   falls back to matching typed case numbers. *Confirmed.*
7. **Add Form links to a same-named ward.** *Confirmed in mechanism.* When
   exactly one filing has the typed name it is pre-selected, with an
   "Auto-filling from …" note; what goes unsaid is that accepting links the
   new filing to that person's ward record and case. The Simplified
   eligibility dialog does the same.
8. **Convert does nothing when the source name is typed.** *Confirmed.*

### Earlier work this touches

- **Milestone 71, decision D6** (the requester, 2026-09-29) listed these
  carry paths and tested them (Archive:52856-52857, 53095-53097;
  `carried-balance.spec.js:119-132`); D6 asked only "which prior figure".
  72G already called these pairs "same-period conversions" (Archive:55378),
  and the code says "Same ward, same period, smaller form"
  (`conversion.js:258`).
- **72B** fixed exactly item 2's class of fault ("Unanswered Yes/No became
  'No' on conversion… AGENTS.md §4 forbids it", Archive:54434) but missed
  this one; 72B only made a $0 stay $0 (`share-zero-paths.spec.js:74`).
- **40H-I** (the requester, 2026-09-13) chose the Annual → Final carry: the
  starting balance and the certificate recipients; period and schedule lines
  "correctly absent -- a new accounting period must not start pre-filled
  with the prior period's dates or transactions" (Archive:16862-16880).
- **72G**'s certificate design ("decided at the second review"): the ward's
  status carries only on a same-period conversion; a later filing starts it
  blank (Archive:55375-55380).
- **37-6**: carry an actually populated co-guardian; "do not create blank
  padding to a maximum" (Archive:10098). **74P-3** (settled: a "Same as"
  box): ticked, the second address "is hidden and filed as the first"
  (Archive:65406).
- **Milestone 36** and `case-resolver.js`: a case-number match "must be
  confirmed rather than automatic" (Archive:8733) -- item 6's fallback is
  forbidden.

### Proposed

Each conversion carries what the source holds, in the right place, and
nothing the filer didn't answer; its notice says exactly what it carried.
Item 2's trust question stays unanswered (one export issue per carried
trust, which the filer answers) and dropped trusts are named. Item 3's
address carries (a "same as mailing" guardian arrives with the mailing
address), and populated co-guardians carry without padding. Item 5: "+ New
Case" makes a new case (`createCase()`). Item 6: the lookup reads `caseId`
and the typed-number fallback is removed. Item 8: Convert says what it needs.
Simplified → Final follows 74K: the day after the source's period, its
ending balance, and a correct notice. The rest are decisions.

### Decisions

**76G-1 — A same-period conversion's Starting Balance.** *Reopened: the
settled answer ("carry the source's own Starting Balance") reverses D6 for
paths D6 deliberately named, and -- because the period is always copied --
would also apply to "last year's Annual into this year's Simplified", making
both its period and its balance wrong.*
1. **(Recommended)** **Convert asks: "the same period, or the next?"** Same
   period: the source's own Starting Balance and its carry record (so D6's
   notes still describe the true prior filing). Next period: the day after
   the source's period and its ending balance, as D6 intends. Annual ↔
   Simplified only. *What a filer sees:* one question; both uses come out
   right.
2. **Always the source's own Starting Balance** (as settled). *What a filer
   sees:* the same-year case right; the next-year case wrong in period and
   balance.
3. **As today.** *What a filer sees:* the same-year case counted twice.

**Settled 2026-10-19 by the requester (put again one at a time): option 1.**

**76G-2 — Initial Inventory → Annual, Schedule A.** *Settled 2026-10-19;
stands:* leave Schedule A blank. (`describeConversion()` and
`share-zero-paths.spec.js:74` change with it.)

**76G-3 — Annual → Final.** *Reopened: the settled answer carried the ward's
status (reversing 72G, on the false premise that Start New Year keeps it)
and widens 40H-I's "schedules correctly absent" without citing it.*
1. **(Recommended)** **Carry Schedule D's holdings, the B-4 bank accounts,
   Part VIII's trusts, Part IX's bond and the guardian's relationship -- not
   the ward's status, not the transaction schedules -- and correct the
   notice.** 40H-I's reason (no prior *transactions or dates*) holds:
   holdings are not transactions, and Start New Year already carries them.
   Built in `carryOverFields()`, so Add Form's "Load Ward Info From" agrees.
   *What a filer sees:* the Final starts from the last Annual's holdings.
2. **Today's carry, corrected notice only.**

**Settled 2026-10-19 by the requester (put again one at a time): option 1.**

**76G-4 — Add Form and a same-named ward.** *Settled 2026-10-19; stands,
extended to the Simplified eligibility dialog:* ask before linking, showing
the case number.

### Checklist (AGENTS.md §8)

| # | Answer |
| --- | --- |
| 1 Data model | 76G-1 option 1 copies the source's `startingBalanceCarry` record (its `used` values stay as defined); no new field. |
| 2 Legacy data | None: conversions run once; existing filings are unchanged. |
| 3 Fixtures | The conversion golden regenerated with a stated note. |
| 4 Tests | Unit per item (red first); update `carried-balance.spec.js` (its pinned paths), `share-zero-paths.spec.js:74`; `convert-ward.spec.ts` for the notices. `TEST-INDEX.md` rows. |
| 5 Export/import | None directly. |
| 6 Security | None. |
| 7 UI | The Convert dialog gains 76G-1's question; existing notice pattern. |
| 8 Legal | 76G-1 follows the Clerk's own definition of Line 1; item 2's trust answer decides whether a trust accounting is required, so it is left to the filer. |
| 9 Cross-form | Every conversion pair checked; 76G-3 follows Start New Year's carry, without the ward's status (72G). |

### Build record — item 1 BUILT 2026-10-20

Approved by name (the requester, 2026-10-20: "76E, 76G-1, 76H 1/2/4/5"); the
other items of 76G are not approved. What a filer now sees: making a
Simplified from an Annual, Final or Trust Accounting, or an Annual or Trust
Accounting from a Simplified, asks **Which period the new form covers** --
"The same period (01/01/2025 – 12/31/2025)" or "The next period (from
01/01/2026)" -- with nothing chosen; Create Form refuses until one is.

- **The same period** (decision 76G-1): the source's own Starting Balance and
  its carry record, its period, its amendment answer, the ward's status and
  any remuneration. The 2025 Annual of $10,000 + $50 - $20 now makes a 2025
  Simplified starting at $10,000 (it started at $10,030, so the year counted
  twice).
- **The next period:** the day after the source's period ends (Period To
  left for the filer) and its ending balance (decision D6); the amendment
  answer, the ward's status and remuneration start blank, as Start New Year
  and Milestone 72G begin a later filing.
- **Simplified -> Final** is always the next period (Rule 5.680(c), as 74K
  reads it for an Annual) and its notice names the Final Accounting (it
  said "the new Annual Accounting" and copied the Simplified's period).
- Across the trust boundary the Starting Balance stays blank either way
  (decision D9).
- The pairs are the Annual family's three types, not the Annual alone: the
  Final -> Simplified pair carried the ending balance into the same period
  exactly as the Annual did.

Tests: `carried-balance.spec.js`'s 76G-1 cases (red first: $10,030 where
$10,000; the old period kept; no question); `convert-ward.spec.ts`'s two
(the dialog asks, refuses unanswered, carries what each answer says; none
for Annual -> Final -- red first: no question); the five specs that carry
the certificate, status, remuneration and attorney convert for the same
period; `filing-conversion.characterization.spec.ts` records the same
period, its golden record changed in exactly the Starting Balances above and
Simplified -> Final's period.

---

## 76H — The PDFs

### What a filer sees today

A guardian writes a full answer to the Plan for Minors' Question 5 -- about
300 words. The filed PDF stops mid-sentence; the rest is drawn off the page.
Text pasted from Word or Excel that contains a tab loses the rest of that
line. A ward named Dvořák prints as "Dvoák". A trust entered on Part VIII
without its name disappears from the PDF with its $50,000, and export
doesn't flag it. The Annual's attorney statement can name the attorney's
county instead of the filing's.

### Verified

1. **Long text runs off the page.** *Confirmed (the app's own PDF library).*
   Tables, key-value grids and checklists already continue *between* rows;
   what nothing but the question block can do is split a single row or box
   taller than the space left: notices (`pdf-engine.js:939`), key-value rows
   (`:1080`), checklist rows (`:1289`), table rows (`:1572`), totals
   (`:1637`), signature blocks (`:1743`) and document comments (`:802`).
   Plan for Minors 5A–D sits in columns 115 pt wide: about 1,800 characters
   (roughly 300 words) crosses the footer, and 2,700 runs to y≈1,017 on a
   792 pt page; the lost lines are missing from the PDF's text too. Also
   reproduced: a 450-word Inventory A-1 note and a 300-word B-4 payee. A
   notice's *text* fits up to about 5,300 characters (only its frame
   overruns earlier). The heading above a long row is left alone on the
   previous page.
2. **A trust without a name drops out.** *Confirmed.* The PDF prints only
   named trusts (`annual-accounting/pdf-model.js:1016`); the export check asks
   for a name only when no card is described (`validation/engines/annual.js:342`).
   A card with trustee, account, type and $50,000 but no name passes export;
   the PDF prints only "Yes"; the workbook writes the trust. The same check
   also numbers cards by their position among described ones (`:343-345`):
   card 1 blank, card 2 filled → "Trust 1", pointing at card 1.
3. **The attorney statement names the attorney's county.** *Confirmed.*
   `d.attorney_county || county` (`pdf-model.js:379`; the screen's copy of the
   statement at `index.js:886` too). The Clerk's workbook fills it from the
   filing's county (`'PART IV, V'!B29 ='PART I'!H2`); `attorney_county` is
   never written there. The Simplified and Inventory use the filing's county.
4. **Letters outside Latin-1 are deleted.** *Confirmed (the app's PDF
   library; corrected in Revision 2).* The embedded font holds 203 code
   points (ASCII, Latin-1, a few symbols); for any letter it lacks, the PDF
   library drops the character: "Dvořák" prints "Dvoák", "Łukasz Żółć"
   prints "ukasz ó", "≥ 10 →" prints " 10 ". Nothing on screen warns.
5. **A tab or lone carriage return cuts off the rest of the line.**
   *Confirmed; added in Revision 2.* The PDF library stops drawing a line at
   a tab or `\r`, which typed and pasted text keeps (`form-contract.js:69-73`).
   "Reads well.\tCol two text…" printed only "Reads well."
6. **Part XI (Part VII) vanishes after an override.** *Confirmed on both
   forms.* The Annual family prints Part XI only with entries or the "none"
   declaration (`pdf-model.js:1269`); the Simplified's Part VII the same
   (`simplified-accounting/pdf-model.js:378`). The unanswered declaration can
   be overridden, and then the Part is left out entirely.
7. **An overridden unreadable amount prints as a figure never typed.**
   *Confirmed.* `presentAmount()` reads with `parseFloat`: "1.500,00" prints
   $1.50 and totals $1.50; "approx 900" prints $0.00. A share of "50%" prints
   "—" while the amount is figured at 50%. (Latent: readable text such as
   "(50)" or "$1,234.56" would print $0.00 too; opening converts it first.)
8. **Schedule B-4's category summary hides a negative category.**
   *Confirmed.* `catTotals[c] > 0 ? … : '—'` (`pdf-model.js:544`; screen
   `index.js:839`): a Medical refund of –$50 prints "—", the lines don't add
   up. The workbook's summary shows ($50.00). (Its total also counts rows
   with no category, which the summary lines leave out -- see 76I item 3.)
9. **Part IX's bond table doesn't add up and cites a statute the workbook
   doesn't.** *Confirmed.* All five lines share one Amount column
   (`pdf-model.js:1110-1121`) while the total adds only the three bonded
   ones; the workbook keeps the restricted figures (H12–H13) apart from the
   bonded lines (G14–G16; H17 `=SUM(G14:G16)`), labelled "Total for BOND
   REQUIREMENT". The PDF's label adds "(§ 744.351)".
10. **Checklists print "Yes — " or "No — " before every item.** *Confirmed.*
    `pdf-engine.js:1283`. An unticked certification reads "No — The guardian
    has consulted with the Ward…"; the Initial Plan's 10F answered No prints
    "☐ No — Yes" and "☒ Yes — No".
11. **The Plan for Minors caption omits "Minor".** *Confirmed.* The court's
    original form (`reference/plan-forms/plan-minor-original.pdf`) reads "IN RE:
    The Guardianship of / [name] / Minor"; the app prints "IN RE: THE
    GUARDIANSHIP OF JANE Q WARD" (its unused ", A MINOR" branch adds an "A"
    the form doesn't have).
12. **The Simplified Plan can print no signature line** (Guardian 1's card
    untouched, exported by override). *Confirmed.*
13. **Plan co-guardians are labelled by position.** *Confirmed.* Annual Plan
    card 3 with card 2 blank prints "Co-Guardian 2"; the export checks
    already number by card.
14. **The Initial Plan prints a revoking order after "No".** *Confirmed.*
    `plan-initial/pdf-model.js:406`; the page shows those boxes always.

### Earlier work this touches

- Item 1: Milestone 73N part 2 built continuation for the question block
  only (Archive:59775).
- Item 2: 57E-1 deliberately narrowed the check; **decision D9** (2026-09-19):
  the gap "offers a clearable acknowledgement at output rather than
  hard-blocking" (Archive:34822). The data model already says a trust's name
  is "Required when trust exists".
- Item 4: Milestone 19-5A chose "Basic Latin + Latin-1 Supplement (covers
  accented names common in Florida filings)" (Archive:3455).
- Item 6: 58D and **60J** (the requester, 2026-09-20, "full parity over
  render-always", because render-always "would let a filer who never opened
  Part VII file a PDF that affirmatively declares no remuneration was
  received", Archive:38663).
- Item 7: 73G part 1 (unreadable amounts kept as typed, overridable); 73H
  design 3 (the Annual Plan's Q11 prints them as typed); **71D**: an
  unreadable share counts as 0% with a validation error and prints "—"
  (Archive:51648, 52718).
- Item 8: 73G-N1 (negatives agree on screen, PDF and workbook), 73H-1.
- Item 9: 60H's Inventory table is the precedent; the "(§ 744.351)" label
  dates from 19E and was never discussed.
- Item 10: **Milestone 19-1** (`1c3c0a1d`): the box is drawn, because no
  ballot-box character exists in the PDF's encoding, and the "Yes —/No —"
  prefix carries "the actual accessible state" (Archive:3160); pinned by
  `plan-initial-multiselect.spec.ts:51-64` and `pdf-structure-tags.spec.ts`.
  Milestone 20: "Zero Regression in WCAG 2.1 AA / PDF/UA-1 Conformance"
  (Archive:3520).
- Item 11: Milestone 21A designed ", A MINOR"; **73N flagged the caption for
  a qualified person** (Archive:56616-56620).
- Item 12: 61E (the Simplified Plan's PDF matches its form). Item 13: 74B's
  rule "never by its position". Item 14: the 2026-10-17 choice (`3b177f33`).

### Proposed

- **Item 1:** a block moves to a new page as today, and is split only when
  it is taller than a whole page; measuring and drawing use one line height
  (today every block reserves more or less than it draws); a split element
  becomes one tagged element per page; a heading stays with the first line
  of its row.
- **Item 2:** a described trust needs a name (an issue the filer can
  override, per D9); the PDF prints every described trust, using the export
  check's own "described" rule; cards are named by their real number.
- **Item 3:** the statement uses the filing's county, on the PDF and the
  screen (the template wins, AGENTS.md §5). Decision 76H-8.
- **Item 5:** tabs become spaces and lone carriage returns line breaks in the
  PDF's text (the stored text is unchanged).
- **Items 8, 12, 13, 14:** the summary prints negative categories; the
  Simplified Plan prints a signature line; co-guardians keep their card's
  number; the revoking order prints only under Yes, and the page shows those
  boxes only under Yes (a reveal covered by 76E's rule).
- Items 4, 6, 7, 9, 10, 11: decisions.

### Decisions

**76H-1 — Letters the PDF can't print.** *Reopened: letters are deleted, not
left as gaps, and Latin Extended-A doesn't cover Vietnamese, the correct
Romanian ș ț, or symbols such as ≥ →.*
1. **(Recommended)** **Embed Latin Extended-A and -B, and warn on screen when
   a name still holds a letter the PDF can't print.** Each PDF grows by a
   few hundred bytes (only used letters are embedded); the app by an
   estimated 60–100 KB. *What a filer sees:* most European names print
   correctly; anything else is flagged before filing, never silently
   misspelled.
2. **Warn only.** *What a filer sees:* a prompt to type the name another way.

**Settled 2026-10-19 by the requester (put again one at a time): option 1.**

**76H-2 — The checklists' "Yes — / No — ".** *Reopened: the settled answer
removes Milestone 19-1's accessibility design without saying what replaces
it.*
1. **(Recommended)** **Remove the visible prefix and carry the ticked state in
   the PDF's accessibility tags** (each row's "actual text", which the app's
   PDF code doesn't write yet), proven by the accessibility tests -- no
   WCAG/PDF-UA regression -- and fix 10F separately by printing its answer. *What a filer sees:* "☐ The guardian
   has consulted with the Ward…", as the court's form reads; screen readers
   still hear the state.
2. **Keep the prefix** (19-1's design); fix 10F's doubled wording only.
3. **Remove the prefix with nothing in its place.** *What a filer sees:* the
   same page; screen readers lose the state.

**Settled 2026-10-19 by the requester (put again one at a time): option 1.**

**76H-3 — Overridden unreadable amounts and shares.** *Reopened: "out of
totals" changes the shared calculators (screen, PDF, bond, audit fee --
AGENTS.md §5), and shares conflict with 71D's rule.*
1. **(Recommended)** **An unreadable amount or share counts as 0 everywhere
   -- screen, PDF and totals -- (71D's rule for shares, extended to amounts)
   and prints as typed with a note** "not counted: can't be read".
   (`presentAmount` reads through the app's amount codec.) *What a filer
   sees:* the filed PDF never shows a figure they didn't type, and every
   total agrees.
2. **Print as typed only; totals unchanged.** *What a filer sees:* the text
   as typed beside totals that still count a guessed figure.

**Settled 2026-10-19 by the requester (put again one at a time): option 1** --
a calculation change accepted by name (AGENTS.md §5), for the reason given:
the filed PDF never shows a figure the filer didn't type, and every total
agrees. The court's workbook never holds such an amount (76I-3).

**76H-4 — Part IX's bond table.** *Settled 2026-10-19; stands:* the
workbook's layout and words.

**76H-5 — The Plan for Minors caption.** *Settled 2026-10-19; stands, now
answerable:* match the original form exactly -- "IN RE: The Guardianship of
/ [name] / Minor" (no "A"). 73N's flag stays: whether the caption is legally
sufficient is for a qualified person; the Guardian Advocacy caption is not
addressed.

**76H-6 — The Inventory's bond total.** *New: the same kind of mismatch on
a sibling form (AGENTS.md §8 item 9).* The Inventory's PDF labels the total
"Total for BOND REQUIREMENT (liquid assets)"
(`guardian-inventory/pdf-model.js:789`); its workbook's Part V says "Total
for BOND REQUIREMENT".
1. **(Recommended)** **Match the workbook.** *What a filer sees:* the PDF's
   label reads as the Clerk's form does.
2. **Leave it.**

**Settled 2026-10-19 by the requester (put again one at a time): option 1.**

**76H-7 — Part XI / Part VII after an override.** *New.*
1. **(Recommended)** **Always print the Part: entries, or the "none"
   declaration, or -- unanswered -- the statutory paragraph with blank lines
   to complete by hand, never "none received"** (60J's reason). *What a
   filer sees:* the Part is always on the filed PDF.
2. **Make the unanswered declaration impossible to override.** *What a filer
   sees:* the PDF can't be made until Part XI/VII is answered. (A legal
   reading of §744.367(3)(a); for a qualified person.)

**Settled 2026-10-19 by the requester (put again one at a time): option 1.**

**76H-8 — The attorney's "County" box.** *New: once the statement uses the
filing's county, the box prints nowhere.*
1. **(Recommended)** **Remove it from the page (the stored value is kept).**
2. **Keep it, labelled "not printed".**

**Settled 2026-10-19 by the requester (put again one at a time): option 1.**

### Checklist (AGENTS.md §8)

| # | Answer |
| --- | --- |
| 1 Data model | Item 2: the `trusts[].name` row's requiredness is enforced (it already says so). 76H-8 option 1: the `attorney_county` row noted "not shown". |
| 2 Legacy data | Saved filings print correctly on their next export; filings with a nameless trust newly show an issue the filer can override; filings with an attorney's county print the filing's county (visible). |
| 3 Fixtures | Grep the fixtures with a described trust for a name (AGENTS.md §8 item 3). |
| 4 Tests | Item 1 needs a browser test with a synthetic model asserting the last sentence of a long answer is in the PDF's text (red today: off-page text is missing); no unit test runs the engine. Update `plan-initial-multiselect.spec.ts`, `pdf-structure-tags.spec.ts`, `guardian-inventory-schedule-layout.spec.ts` (no row split), `pdf-table-semantics`, `plan-pdf-wcag-compliance`, `pdf-form-specific`. The font (76H-1): recommend `npm run test:e2e:portable`. `TEST-INDEX.md` rows. |
| 5 Export/import | PDF; the screens for items 3, 8 and 14; item 2's export check. |
| 6 Security | None. |
| 7 UI | Item 14's page uses the routed-reveal pattern (67F). |
| 8 Legal | Items 3 and 9 follow the Clerk's workbook; 76H-5 the court's form, still flagged for a qualified person (73N); 76H-2 changes how certifications read; 76H-7 option 2 is a legal reading. |
| 9 Cross-form | Items 3, 6, 9, 12, 13 and 14 checked across the sibling forms. |

### Build records

Items 1, 2, 4 and 5 approved by name (the requester, 2026-10-20: "76E, 76G-1,
76H 1/2/4/5"); the other items are not approved.

**Item 2 — BUILT 2026-10-20.** What a filer now sees: a Part VIII trust card
with a trustee, account or amount but no name is named at Preview ("Part VIII
— Trust 2 — Name", an issue they can override, per D9), and the PDF prints it
with its amount, under its own card number. Before, export passed it and the
PDF dropped it with its $50,000 while the workbook wrote it; and a blank card
1 with a filled card 2 was reported as "Trust 1". One rule decides "describes
a trust" for both (`describesATrust()`, `trust-identity.js`). Tests:
`annual-trust-and-remuneration-rules.spec.js` and
`annual-accounting-pdf-model.spec.js`, each red first (no issue for card 2;
no trust table printed).

**Items 4 and 5 — BUILT 2026-10-20.** What a filer now sees: "Dvořák",
"Łukasz Żółć" and "Ştefan" print as typed (they printed "Dvoák", "ukasz ó"
and "tefan"); a letter the PDF still can't print -- "ễ", "≥" -- gets a note
beside its box as the filer leaves it and whenever the page is drawn ("The
filed PDF can't print "ễ": it would be left out. Type it another way."); a
tab or a lone carriage return in pasted text no longer stops its line ("Reads
well.<tab>Col two text" printed "Reads well."), and a letter typed as a
letter plus a separate accent prints as the one letter.

- **Font (decision 76H-1):** Latin Extended-A and -B (U+0100–U+024F)
  added to the three Liberation Sans faces; Liberation covers every one of
  them, so the PDF now prints 539 characters (203 before). Regenerated by
  `npm run generate:fonts` from the pinned Liberation Sans 2.1.5, checked
  first to reproduce the old font byte for byte with the old list. Measured
  cost: the font module 159 KB → 305 KB (92 KB → 170 KB compressed, +79 KB,
  inside the 60–100 KB estimate), loaded only with the PDF code; one Annual
  PDF 301,824 → 310,448 bytes (+8.6 KB, the PDF library embedding only the
  letters used -- more than the "few hundred bytes" estimated, still under
  3%).
- **The note** reads the fonts' own character maps (`printable-chars.js`,
  generated with them and held to them by `printable-chars.spec.js`), so it
  never disagrees with the PDF. Every text box on all nine forms; amount,
  share and date boxes keep their own notes.
- **Item 5:** one wrapper on the PDF document (`pdfText()`) for every line
  drawn, wrapped or measured; the stored text is unchanged.

Tests: `printable-chars.spec.js` (new; red first against the old font: the
list and Latin Extended missing) and `pdf-letters-and-tabs.spec.ts` (new;
reads the generated PDF; red first: "Dvoák", "ukasz ó", "tefan", "Reads
well." and "Line one" cut short, no note).

**Item 1 — BUILT 2026-10-20.** What a filer now sees: a Plan for Minors
Question 5 answer of 300 words or more, a long Schedule B-4 payee, a long
explanation or comment prints in full -- the part that doesn't fit continues
on the next page (under the table's repeated header for a table row) instead
of running past the footer and off the paper, where its lines were lost from
the PDF's text too.

- One rule for notices, key-value rows, checklist rows, table rows and
  document comments (`drawRowAcrossPages()`, `pdf-engine.js`): a row that
  fits a page moves to a new page as before; only one taller than a page is
  split, as many lines as fit and at least two a page, each page's part its
  own tagged element (a `P`, or a table row).
- Each of those blocks now draws its lines at the height it measures them at
  (they drew at the PDF library's default, closer than measured), so every
  row keeps its height and every page break stays where it was: multi-line
  text inside a row is spaced to fill the row it always reserved.
- A heading stays with its first row: a key-value grid's or a checklist's
  heading, and a table's header, reserve the whole first row (or, for a row
  taller than a page, its first lines); they reserved only themselves, or the
  header and 25pt, and were left alone at the foot of a page.
- Not split: a table's totals row and a signature block. Their text is a
  total's label and a signer's details, never a page tall; they still move
  to a new page whole.

Tests: `pdf-long-text.spec.ts` (new; reads the generated PDFs: every word of a
430-word Question 5 answer, a 300-word B-4 payee and an 800-word explanation
on the paper and above the footer, on more than one page) -- red first on the
old engine (81 of the answer's words never reached the paper; 11 of the
payee's at or below the footer). `pdf-engine-notice-title.spec.js` reads the
notice's new keep-together rule. The PDF browser specs (geometry, margins,
tags, tables, fonts, notices) pass unchanged.

---

## 76I — The court workbooks

### What a filer sees today

Importing another form's workbook -- or any unrelated spreadsheet -- into a
filing empties its schedules with no "wrong form" warning. A Schedule B-4
disbursement with no category is counted on the PDF but not in the
workbook's totals, so the two filed documents disagree. Text starting with a
dash or plus ("-Refund", "+1 727 555 0100") is filed with a visible
apostrophe.

### Verified

1. **The import's 60-sheet limit refuses a very large app export.**
   *Confirmed; corrected in Revision 2.* `assertWorkbookWithinLimits()`
   (`input-hardening.js:148-149`) refuses more than 60 sheets, on every
   import (`workbook-contract/index.js:136`) -- **after** ExcelJS has read the
   whole file (`:135`), so it protects nothing. **The Clerk's original
   Annual workbook has 58 sheets and imports.** The app's own template has 90
   because Milestone 57D extended it to twelve bank accounts (`6c434afb`,
   2026-09-19); exports drop unused register pages, so only a filing keeping
   more than about 36 B-4 register pages (nine or more full bank accounts)
   exports a workbook its own import refuses. (Revision 1 said the Clerk's
   own workbook was refused; it isn't. A test that fills the 90-sheet
   template skips the limit by calling `readWorkbookDraft()` directly.)
2. **Another form's workbook, or any spreadsheet, empties the filing.**
   *Confirmed.* Missing sheets reset each always-read schedule to `[]`
   (`engine.js:244`); the B-4 reader empties the rows and accounts
   (`annual.js:137`); the Inventory blanks the guardian and recipients
   (`guardian.js:340-341`). The form check reads only the Annual family's
   filing-type box (`index.js:117, 120`), so no "different form" notice
   appears; the prompt says only "replaces … in N place(s)".
3. **A B-4 row with no category: on the PDF, not in the workbook's totals.**
   *Confirmed (read from the exported file).* The app sums every B-4 row
   (`annual-totals.js:58`); the workbook totals by category through a hidden
   grid of `IF(E20="Accounting",I20,0)` formulas (K8:AK25 on each register
   page; all 24,876 use the app's 18 categories), and Part VI `H16 =
   -I28`. A $500 row with no category: the PDF's Line 20 is $400, the
   workbook's $900 -- and the register page's own total (`I45`) still counts
   it, so the workbook contradicts itself. "Category is required" can be
   overridden; a category outside the 18 brought by an import raises no
   issue at all (the check looks only for blanks). Excel's comparison ignores
   case but not a trailing space.
4. **An overridden unreadable amount is filed differently on each output.**
   *Confirmed.* The Inventory writes the text (`codecs.js:59`), so `=G27*H27`
   becomes #VALUE!, spreading to the A-1 total and Summary I's H39 (and Part
   V's bond table from B-1/B-3); the PDF prints $1.23. The Annual and
   Simplified write `parseFloat(…) || 0` (`excel-engine.js:280`): "1.234,56"
   files as 1.234, "about 200" as 0.
5. **Text starting with -, +, = or @ shows a leading apostrophe.**
   *Confirmed.* `sanitizeCellValue()` (`excel-engine.js:125-131`) stores the
   apostrophe as part of the text; Excel shows it.
6. **A blank, untouched B-4 row blocks Save as Excel** once bank accounts
   exist (`b4-export-plan.js`), with a refusal worded as a capacity problem
   ("Save as PDF instead"); with no accounts it files a blank numbered line.
   *Confirmed.*
7. **Part XI / Part VII lines are garbled on re-import, and on the filed
   form.** *Confirmed.* An entry with no guardian is filed as
   "  —    —  $500.00" (`remuneration-line.js`) and reads back as guardian
   "—", type "$500.00"; "Fee $250" reads back as guardian "— Fee". A numeric
   description with no amount comes back as the amount. (Needs an overridden
   required field.)
8. **Re-import replaces a hidden office address; a C-3 row is dropped.**
   *Confirmed.* With "same as mailing" ticked, the export files the mailing
   address in the office boxes, and re-import writes it over the office
   address the filer had typed. An Inventory C-3 row is kept only if its
   first line has text: one with status, court, case number and amount is
   dropped entirely.
9. **The audit fee goes up a tier at an exact boundary.** *Confirmed.* The
   Annual compares the unrounded Line 30 with the tiers
   (`annual-totals.js:82-86`): three D-1 rows summing to
   25000.000000000004 give $85.00 beside a printed "$25,000.00" (the tier is
   "$25,000 or less" = $20). The Inventory and the bond check already compare
   rounded figures.

### Earlier work this touches

- Item 1: the 60-sheet and 10 MB limits are `32711165`'s hardening, the
  sheet count checked after loading as "a stand-in" (when the Clerk's
  template had 58 sheets); **57D** (the requester authorized extending the
  template to twelve accounts) never considered the import limit. Milestone
  64's D15 (2026-09-21) describes the bundled 90-sheet file as the Clerk's
  "Revision 11/17/2022" (Archive:43213-43214).
- Item 2: 73T part 3 decided a Trust or Final keeps its type whatever the
  workbook says -- the Annual family shares one Clerk instrument.
- Item 3: 38D/44 (Archive:11431-11437): a missing answer is overridable;
  "format capacity … where faithful output cannot be produced" is not, and
  "blocks only that affected format". 57D's B-4 planner "refuses rather than
  guesses".
- Item 4: **73G part 1** (requester-approved): unreadable amounts "can be
  overridden, as an impossible date can"; pinned in
  `output-authorization.spec.js:53-63`.
- Item 5: **Milestone 51** (`6f0967f0`): ExcelJS strings are already inert in
  Excel; the guard's real purpose is "a clerk re-saving as CSV, or copying
  cells out" (Archive:26604-26613). 73T row 17 strips the apostrophe on
  import.
- Item 6: 57D's refusal is deliberate; 73F part 3's "a row '+ Add' left
  untouched is no row" was never applied to it.
- Item 7: 73T-2 decided one entry per line; the line format's own aim is
  "a filed line never reads '—    —'".
- Item 8: **74P-3** -- with "same as" ticked, "what was typed there is kept
  and returns when unticked" (Archive:65406-65407); 73T row 7 (a row holding
  only an amount comes back) supports keeping C-3 rows.
- Item 9: the workbook's fee schedule is a printed table with no formula,
  its tiers in cents; the Inventory's rounded comparison is 60A, under the
  requester's rounding contract (2026-09-20, Archive:38361).

### Proposed

- **Item 1:** the limit becomes at least the app's own largest workbook (90
  sheets) plus margin -- it guards nothing after the full read anyway -- with
  a test through `workbookAdapter()` that every embedded template imports. A
  real size guard (checking the zip's uncompressed sizes before reading) is
  a separate item, not proposed here.
- **Item 2:** decision 76I-1.
- **Item 3:** decision 76I-2; imports normalise category case and spacing.
- **Item 4:** decision 76I-3.
- **Item 6:** untouched rows are no rows; the refusal for an unassigned row
  says "assign a bank account", not "capacity".
- **Item 7:** decision 76I-6.
- **Item 8:** re-import keeps a typed office address while "same as mailing"
  is ticked; any started C-3 row is kept.
- **Item 9:** compare the rounded Line 30, per the rounding contract.

### Decisions

**76I-1 — Another form's workbook.** *Settled 2026-10-19; stands:* refuse
another form's workbook, naming it. Design detail: the Annual, Final and
Trust Accountings count as **one** form (they share one Clerk instrument;
73T part 3 keeps the filing's own type), recognised from sheets every
version has, tolerating removed blank pages.

**76I-2 — A B-4 row the workbook can't total.** *Settled 2026-10-19; stands,
with design 3:* its own Excel-only code that can't be overridden, only for
started rows; the PDF stays overridable.

**76I-3 — An unreadable amount and Save as Excel.** *Settled 2026-10-19;
stands, with design 3* -- a knowing, partial reversal of 73G part 1 for the
workbook only (the PDF stays overridable); only amounts the workbook writes
and that are in use.

**76I-4 — The apostrophe.** *Reopened: the settled "quote-prefix style"
can't be written by the app's Excel library (no quote-prefix support in the
vendored ExcelJS; it would need editing the saved file's XML, AGENTS.md §10
P1/P2), and a display flag would lose the guard's real purpose -- a re-save
as CSV drops it.*
1. **(Recommended)** **Keep the guard as it is** (Milestone 51). *What a filer
   sees:* "'-Refund" and "'+1 727…" on the court's form, as today.
2. **Remove the guard for the cells the court reads.** *What a filer sees:*
   "-Refund"; a clerk who re-saves as CSV loses the protection.

**Settled 2026-10-19 by the requester (put again one at a time): option 1.**

**76I-5 — A workbook that matches no form.** *New: an unrelated spreadsheet
empties an Annual-family filing's schedules today (item 2).*
1. **(Recommended)** **Refuse it:** "This isn't a court workbook this app can
   read." *What a filer sees:* nothing in the filing changes.
2. **Import it after a warning naming what will be emptied.**

**Settled 2026-10-19 by the requester (put again one at a time): option 1.**

**76I-6 — Part XI / Part VII lines.** *New.*
1. **(Recommended)** **Write each line so it reads back and never shows
   empty dashes** (blank segments left out, each segment recognisable).
   Changes the filed wording of affected lines -- accepted by name.
2. **Fix only how lines read back.** *What a filer sees:* the court's form
   keeps "  —    —  $500.00".

**Settled 2026-10-19 by the requester (put again one at a time): option 1.**

**76I-7 — Which Annual workbook do guardians fill by hand?** *New; a
question of Clerk practice.*
1. The Clerk's 58-sheet original (then item 1 is minor).
2. The twelve-account 90-sheet version.

**Answered 2026-10-19 by the requester (Clerk practice): both, or not
sure.** The fix is cheap either way (a limit that covers the app's own 90
sheets), so item 1 stands alone and can be built early, ahead of the rest
of 76I.

### Checklist (AGENTS.md §8)

| # | Answer |
| --- | --- |
| 1 Data model | None. |
| 2 Legacy data | Office addresses already overwritten by an earlier import can't be restored. Filings holding blank or unknown categories, or unreadable amounts, are newly refused for Excel (visible, with the reason). |
| 3 Fixtures | B-4 fixtures carry categories (to be confirmed by grep). |
| 4 Tests | Read the exported workbook itself, never a re-import (AGENTS.md §5, §10): every embedded template imports through `workbookAdapter()`; another form's workbook and an unrelated spreadsheet are refused; the B-4, amount, remuneration (blank guardian with a type) and C-3 cases (red first). Browser: the `excel-*` specs, `export-helper.contract`. `TEST-INDEX.md` rows. |
| 5 Export/import | The three workbook contracts and the import adapter. |
| 6 Security | The sheet limit never protected anything (it runs after the full read); a real pre-read guard is out of scope. The apostrophe guard is kept (76I-4 option 1). |
| 7 UI | The existing import dialog and export reason line. |
| 8 Legal | Items 3 and 9 follow the Clerk's workbook and the requester's rounding contract. |
| 9 Cross-form | Items 4, 5, 7 and 9 compared across the three workbooks; item 7's code writes the Annual's Part XI and the Simplified's Part VII; "same as mailing" exists only on the Annual family. |

### Build records

Approved by name (the requester, 2026-10-20: "76I, then rest of 76G and
76H"). Item 5 needs no change (decision 76I-4: the apostrophe guard stays).

**Part 1 (items 1, 2, 6, 8, 9) — BUILT 2026-10-20.** What a filer now sees:

- **Item 1:** any workbook the app exports imports again -- the sheet limit is
  120, above the app's own 90-sheet Annual workbook (it was 60).
- **Item 2 (decisions 76I-1, 76I-5):** another form's workbook is refused,
  naming both forms ("This is the court's workbook for an Initial Inventory,
  and this filing is an Annual, Final or Trust Accounting. Nothing in the
  filing was changed ..."), and a spreadsheet that is no court workbook is
  refused ("This isn't a court workbook this app can read."), before
  anything is read; the Annual family counts as one form, recognised from
  sheets every version has.
- **Item 6:** a Schedule B-4 row "+ Add" added and never touched is no row --
  it no longer blocks Save as Excel once bank accounts exist, nor files a
  blank numbered line; a disbursement with no bank account is refused as
  "need a bank account", not as a capacity problem.
- **Item 8:** with "same as mailing" ticked, re-import keeps the office
  address the filer typed (74P-3); an Inventory C-3 row is kept when any of
  its own boxes holds something.
- **Item 9:** the audit-fee tier is read from Line 30 in cents, as it prints
  (the requester's rounding contract): a Line 30 that floats to
  25000.000000000004 and prints $25,000.00 takes the $20 tier, not $85.

Tests: `court-workbooks-76i.spec.js` (new; the templates through
`workbookAdapter()`, the wrong form and an unrelated spreadsheet refused,
the B-4 plan, the office address and the C-3 row read from saved workbooks,
the fee tier) -- all eight red first.

---

## 76J — The export checks

### What a filer sees today

A guardian has a blank Type of Guardianship (an ordinary item they can
override) and a supporting statement that is a damaged or password-protected
PDF. Save as Excel says to choose "Continue despite outstanding
requirements" -- but Preview offers no Continue button, because the
statement problem can't be overridden, though the workbook never contains
statements. A recipient listed only on card 2 is reported as "no recipient",
steering the filer to answer "no one needs to be served".

### Verified

1. **Save as Excel can't be overridden because of a PDF-only problem.**
   *Confirmed.* `acknowledgeOutstandingRequirements()`
   (`output-authorization.js:11-13`) refuses if any issue is non-bypassable,
   whatever output it affects; supporting-document problems affect only the
   PDF outputs (`issue-registry.js:5, 29-38`). Uploads already refuse files
   that aren't PDFs; the realistic cases are an encrypted, damaged or
   over-50-page PDF, or one still being checked. The Continue button exists
   only in Preview's blocked panel and is withheld whenever Preview is
   blocked (`pdf-preview.js:478`); the message list also ignores which output
   an issue affects (`output-preflight.js:194`).
2. **Ordinary checks fire on boxes not in use.** *Confirmed.* Part VIII's
   ward % on every trust card under No or unanswered (`engines/annual.js:307-310`);
   the Inventory's D-4 bond period under a waived bond or depository-only
   (`guardian.js:178-183`); the Annual Plan's Q10 and the Initial Plan's Q11
   "Other" directive when "executed" is unticked (`plan-annual.js:108`,
   `plan-initial.js:99`).
3. **Supporting-document problems land on Part I.** *Confirmed; corrected in
   Revision 2.* The issue has no route (`supplemental-checks.js:189-194`), so
   the sidebar marks Part I (or the Cover) and Preview's Go-to goes there.
   The schedule page's own document row does show "Blocked" and the reason;
   what's missing is that schedule's mark and the Go-to.
4. **Part VIII's "created after the GID?" points at the wrong card.**
   *Confirmed* (`engines/annual.js:343-345`); the Annual Plan's residences and
   providers do the same.
5. **A recipient on card 2 counts as none.** *Confirmed.*
   `service-recipients.js:99-101` looks only at card 1 -- the Annual,
   Simplified and Inventory, and the four Plans (`plan-certificate-of-service.js:93`).
   Leaving the page removes a blank card 1, so card 2 moves up; but while the
   filer is on the page, the "no one needs to be served?" question appears,
   and answering Yes hides the cards and files "No service recipients are
   required".
6. **The certificate attorney's signature date isn't checked against the
   period.** *Confirmed* (`engines/annual.js:207-214`, `simplified.js:159-166`).

### Earlier work this touches

- Item 1: **38D** (landed under 44B): "A format-specific technical issue
  blocks only that affected format" (Archive:11436); acceptance: "faithful
  supported formats remain available after any required acknowledgement"
  (Archive:11695). Its acknowledgement sentence (Archive:11599-11601) is what
  the code implements, and `output-authorization.spec.js:78` pins today's
  refusal -- to be changed deliberately.
- Item 2 extends the requester's choice of 2026-10-17 (the amount checks,
  `b161fed0`); 67B kept the D-4 bond-period check (the code's note: "a
  reversed range is an error, not a blank", `engines/guardian.js:170`) but
  never discussed visibility; 37-4 hides the Plans' directive section until
  "executed" is ticked.
- Item 3: the Part I landing is **73F part 2's deliberate safety net** (a
  blocker no page owns holds back the first page, so the sidebar never shows
  100% over it) -- kept; only the missing route is added.
- Item 4: **57E-1 decision D9** -- "Trust 1 — Name" stays overridable when
  every card is blank -- kept. Milestone 33 recorded the Plans' row numbering
  as a known gap.
- Item 5: **D17** (Milestone 57; kept by the requester on 2026-09-21 under
  63B): "Recipient 1 complete satisfies validation; cards 2+ are optional"
  (Archive:35366); **63B decision D3** (the requester) adopted the card-1
  test; pinned by `service-recipients.spec.js:111`. But **D16**'s own words
  support the change: "A filer who lists at least one recipient never sees
  the question" (Archive:35359).
- Item 6: 34-1A applied the "on or after Period To" rule to "signature /
  preparer / attorney / certification dates"; this date was never wired
  (39-C recorded it unvalidated); 68A kept the rule on the accountings ("is
  correct and stays"); 71B added the guardian certifier. It is the app's own
  consistency rule, not a court rule.

### Proposed

- **Item 1:** an acknowledgement covers the outputs it can (Excel stays
  available when only a PDF-only problem can't be overridden); Save as Excel
  gets its own Continue (the Excel reason line's button), and the message
  list shows which outputs each issue blocks.
- **Item 2:** each check runs only while its box is in use (design 1) -- so
  the D-4 bond period stays checked while the bond question is unanswered
  (it prints then).
- **Item 3:** the issue carries its schedule's route; the safety net stays.
- **Item 4:** cards are named by their real number; D9's blank-card case
  stays overridable.
- **Item 6:** the certificate attorney's date follows the same 34-1A rule
  (an overridable issue).
- Item 5: decision 76J-5.

### Decisions

**76J-5 — A recipient on a later card.** *New: reverses D17 and 63B D3.*
1. **(Recommended)** **Any listed recipient answers the question** (D16's
   words), on every form with a certificate of service (the accountings,
   the Inventory and the four Plans). *What a filer sees:* the
   "no one needs to be served?" question never appears while a recipient is
   listed.
2. **Keep "Recipient 1 only"** (D17). *What a filer sees:* as today.

**Settled 2026-10-19 by the requester (put again one at a time): option 1.**

### Checklist (AGENTS.md §8)

| # | Answer |
| --- | --- |
| 1 Data model | None. |
| 2 Legacy data | None. |
| 3 Fixtures | Item 6's new check: grep the fixtures that carry a certificate attorney's date (AGENTS.md §8 item 3). The validator golden regenerated with a stated note if any variant changes. |
| 4 Tests | Unit per item (red first). Update `output-authorization.spec.js:78` (deliberately), `output-reasons`, `output-revision-wiring`, `pdf-preview-print`, `output-buttons-after-override.spec.ts`, `export-helper.contract`, `service-recipients.spec.js`, `certificate-recipients.spec.js`, `service-attestation-visibility.spec.ts`, `sidebar-export-parity`, `validator-engines`, `navigation-status.contract`, `hidden-answers.spec.js`, `conditional-reveal-routes.spec.ts`. `TEST-INDEX.md` rows. |
| 5 Export/import | The output gate. |
| 6 Security | None. |
| 7 UI | Save as Excel's own Continue; issues route like every other. |
| 8 Legal | Item 6 extends the app's own rule; no new legal reading. |
| 9 Cross-form | Items 2, 4 and 5 checked on every form that has the field. |

### Build record — BUILT 2026-10-20

Approved by name (the requester, 2026-10-20: "76F, then 76J"). What a filer
now sees:

- **Item 1:** a supporting document that can't be used (a damaged or
  password-protected PDF) stops only the PDF. The Preview's list says "PDF
  only" beside it, and when the workbook only waits for an acknowledgement,
  Save as Excel's reason line gets its own "Continue despite outstanding
  requirements"; after it, Save as Excel saves. An acknowledgement now covers
  every output it can (`acknowledgeOutstandingRequirements()`); each output
  is still blocked by its own unoverridable problems.
- **Item 2 (design 1):** a check runs only while its box is in use -- Part
  VIII's Ward's % only under Yes; the Inventory's bond-period order under a
  bond or while the question is unanswered (it prints then), not under a
  waived bond or a depository alone; the Plans' "Other" directive
  description only while directives are ticked as executed.
- **Item 3:** a supporting-document problem is named on the page the
  document is attached on (its route): that page's sidebar mark and
  Preview's Go-to. The Part I safety net stays for the packet-wide limits.
- **Item 4:** the Annual Plan's residences and providers are named by their
  own row number (Part VIII's trusts were, with 76H item 2).
- **Item 5 (decision 76J-5):** any listed recipient answers the "no one
  needs to be served?" question, on every certificate (the accountings, the
  Inventory and the four Plans); a blank card 1 above a listed recipient is
  left alone.
- **Item 6:** the certificate attorney's signature date before the
  accounting period ends is named (an error the filer can override), on the
  Annual family and the Simplified, as every other signature date is.

Tests: `export-checks-76j.spec.js` (new: items 2, 3, 4, 6) and
`output-authorization.spec.js`'s and `service-recipients.spec.js`'s 76J cases
(items 1 and 5; the latter's card-1 test reversed deliberately) -- all red
first. `excel-continue-pdf-only.spec.ts` (new, the real Preview and Save as
Excel) -- red first. `output-reasons.spec.js` reads the reason line's outputs;
the validator golden regenerated with its note -- 890 of 5,738 outcomes each
lost one issue (item 2's hidden boxes), nothing added.

---

## 76K — Security hardening

### What a filer sees today

Nothing, day to day. These protections are weaker than they should be: a
password-protected file accepts parts saved without a password, so someone
who edits an emailed file can plant figures that open as genuine; the
password prompt shown when opening a file allows unlimited guesses; the open
filing's ward name and case number sit unencrypted in browser storage; and
Escape dismisses the lock screen, stranding the filer on a blank "Locked"
page whose only way out -- reloading -- can lose unsaved work.

### Verified

1. **Unprotected parts are accepted in a protected file.** *Confirmed.*
   `decryptJSONWithKey()` accepts the `PLAIN:` prefix whatever the file says
   (`crypto.js:96-99`): a plain verifier let any password through; a plain
   filing with an altered balance opened as authentic; parts can be swapped
   between places. The file's own "protected" flag is itself unauthenticated:
   a file flipped to "none" opens without a prompt and is saved unencrypted
   from then on.
2. **Key strengthening and lockout.** *Confirmed.* PBKDF2-SHA-256 at 210,000
   rounds (`crypto.js:3`); OWASP's figure for PBKDF2-HMAC-SHA256 is 600,000.
   The count isn't recorded in the file, so raising it would break every
   existing file. The 5-attempt lockout applies to unlocking; the prompt when
   opening a file counts no attempts at all (`app-lock.js:293-299`).
   Failed-unlock log entries are dropped when the lock reloads the file.
3. **Names in browser storage.** *Read.* `src/tab-coordination.js` writes the
   open filing's ward name and case number to `localStorage`
   (`pg-tab-heartbeats-v1`) every 4 seconds, unencrypted even with a password.
4. **Leftovers.** *Read.* In no-password mode each unsaved change writes a
   plain copy of the case to browser storage (`recovery-cache.js`), which no
   lock uses (there is no lock without a password). The lock screen hides the
   sidebar but leaves the ward's name and info card in the page, and the
   pop-up dialogs built into the page (the filing switcher's list of names)
   stay open behind it.
5. **Escape dismisses the lock screen.** *Confirmed.* The lock screen is a
   `.modal-overlay` (`index.html:258`) and `modal-events.js:85-95` closes the
   topmost one on Escape. The case is already cleared from memory, so
   nothing shows; but the only way out is reloading, which loses work since
   the last save. The start and security-choice screens are overlays too and
   probably dismiss the same way (read, not run).
6. **The Plan yes/no migration runs on only some opens.** *Confirmed;
   corrected in Revision 2.* It runs on Open Backup and drop-import, not on a
   normal open or lock recovery. An old Plan's explicit "No" stored as `false`
   shows unanswered on the page, while the export check and the PDF treat it
   as "No" -- the screen and the filing disagree, and nothing asks the filer.

### Earlier work this touches

- Item 1: `PLAIN:` dates from the first version; Milestone 70's contract kept
  it for 70. No encrypted fixture contains a plain part (checked), so
  refusing them breaks no saved file. `case-reader.js:18-19` must keep
  reading a no-password file without a key.
- Item 2: 210,000 was never chosen (first version; pinned by
  `crypto-contract.spec.js`). **40D decision 6**: the lockout count travels in
  the case file (Archive:14913) -- the open-file prompt was simply never
  covered. **5de3707**'s newer-format refusal works off the format version.
- Item 3: **deliberate and disclosed.** Added in `ff371a88` ("Other tab:
  <ward name>"); Milestone 56B chose to disclose rather than remove it; the
  guide says it is "kept as ordinary readable text whether or not the case is
  encrypted" (`help/index.html:849`); pinned by
  `ms70-shared-storage-golden.json`. Against it: the requester's Milestone 57
  instruction, "no case data in browser storage for the 'resume' feature".
- Item 4: the recovery copy exists for the lock (Milestone 57 review); 73L
  step 6 stopped names showing over the lock screen.
- Item 5: 48E's terms dialog has "no Escape-key or backdrop dismissal path"
  (`terms-acceptance.js:41-48`) -- the precedent.
- Item 6: **37-5** requires the migration wherever a legacy boolean can
  arrive, and "Import must preserve a deliberate legacy `No`"
  (Archive:10032).

### Proposed

- **Item 1:** a file marked protected refuses unprotected parts (keyed to the
  file's own mark, so importing a no-password backup into a protected case
  still works). Binding each part to its place, and authenticating the
  "protected" mark, are a further format change -- listed as residual risk,
  not proposed here.
- **Item 2:** decision 76K-1 (settled); the open-file prompt gets a lockout
  (decision 76K-4).
- **Item 3:** decision 76K-3.
- **Item 4:** the browser-storage copy is retired with 76A-3 (decision 76K-2);
  the lock screen clears the names from the page and closes every dialog.
- **Item 5:** the lock, start and security-choice screens ignore Escape
  (48E's guard).
- **Item 6:** the migration runs on every open.

### Decisions

**76K-1 — Key strengthening.** *Settled 2026-10-19; stands, with design
detail:* record the setting in each file; new saves use 600,000; older files
open with their own. This **raises the case-file format version** (so an
older cached tab or a rolled-back build says "made by a newer version", not
"Incorrect password"); re-keying happens only at an unlock, followed by a
full rewrite; every key path carries the count (the unlock, app state, the
single-filing export, and the backup import's same-salt shortcut); only
known counts are accepted.

**76K-2 — The browser-storage recovery copy.** *Reopened: its settled first
half ("clear it once saved") is already what the app does, and "clear it at
startup" would wipe a live tab's copy (the slot is shared).*
1. **(Recommended)** **Retire it:** the no-password copy at once (no lock
   reads it), and the protected copy once 76A-3's option 1 keeps unsaved
   work encrypted in each tab's memory. Then no case data goes to browser
   storage.
2. **Keep it** as today.

**Settled 2026-10-19 by the requester (put again one at a time): option 1.**

**76K-3 — Ward names in browser storage.** *New: a disclosed design (56B)
against the requester's Milestone 57 instruction.*
1. **(Recommended)** **Stop storing names; send them only over the tabs'
   message channel** (nothing stored), so the "Other tab: <ward name>"
   warning still names the other tab's ward. The guide and the shared-storage
   golden change as a recorded decision.
2. **Keep it disclosed** (56B).

**Settled 2026-10-19 by the requester (put again one at a time): option 1.**

**76K-4 — The open-file password prompt.** *New: the lockout design (40D)
never covered it.*
1. **(Recommended)** **Apply the same lockout.**
2. **Leave it.**

**Settled 2026-10-19 by the requester, in their own words: "5 wrong
triggers a 1 minute lockout".** Five wrong passwords at the open-file
prompt start a flat one-minute lockout. Confirmed the same day: the unlock
screen keeps its own lockout (30 seconds at the fifth wrong password,
doubling with each further one, up to 5 minutes; `app-lock.js:201-203`).

### Checklist (AGENTS.md §8)

| # | Answer |
| --- | --- |
| 1 Data model | The case file's manifest records the strengthening setting, with a raised format version (the `.sav` format notes updated). |
| 2 Legacy data | Files without the setting open at 210,000 and are re-keyed at the next unlock. A protected file holding a plain part is refused with a message (visible). |
| 3 Fixtures | `tests/fixtures/sav` must **not** be re-saved -- it is the proof that old files still open; a new fixture saved at 600,000 is added. |
| 4 Tests | Unit: plain parts refused; the count read and written; the format version; the open-file lockout (red first). Browser: Escape on the lock screen with a real key press (AGENTS.md §6); `security-contract.spec.ts`'s storage scan extended to ward names. `TEST-INDEX.md` rows. |
| 5 Export/import | `.sav` save/open; single-filing export; backup import. |
| 6 Security | Threat: someone who can edit a saved or emailed file, or read this browser's storage. Protects against plain parts and stored names. Does **not** protect against swapped or rolled-back parts, a flipped "protected" mark, malware on the guardian's computer, or a weak password -- listed as residual risk. |
| 7 UI | None visible. |
| 8 Legal | None. |
| 9 Cross-form | Not form-specific. |

---

## 76L — Pages and smaller fixes

### What a filer sees today

Small frictions: the dashboard's status menu saves -- and logs -- a change on
every arrow key, and the whole dashboard redraws, losing keyboard focus;
correcting a middle digit of a phone number on the Initial Inventory
scrambles it; Escape in a suggestion list closes the whole dialog and loses
what was typed.

### Verified

1. **The dashboard redraws the whole page on every status or Judge change**
   (`dashboard/index.js:535`), and a status change writes an Activity Log
   entry each time (`:487-490`). *Confirmed.*
2. **Inventory phone, SSN and case boxes reformat on every keystroke**
   (`guardian-inventory/form-binding.js:148-168`): fixing 555 to 556 in
   (727) 555-1234 gives (727) 551-2346; account and check numbers trim a
   typed space at once. *Confirmed.*
3. **Escape in a suggestion list closes the dialog.** *Confirmed.* In Add
   Form the list's own Escape runs, then the dialog's; in the Convert
   source picker the dialog's runs first and the list never sees it.
4. **The C-1 yearly-total helper rounds the retired way**
   (`entry-helpers.js:42`). *Confirmed.* Every two-decimal payment matches the
   app's rounding at all frequencies; only sub-cent payments differ (1,147 of
   800,004 three-decimal amounts).
5. **The Initial Plan's new year clears the ward's residence**, mailing
   address, inception date and Letters date (`filing-years.js:184-187`).
   *Confirmed.*
6. **The Simplified Plan keeps last year's attorney signature date** (not
   printed; the page marks it "kept for your records"). *Confirmed.*
7. **The data model has drifted from the forms' defaults.** *Confirmed.* The
   Simplified's `remuneration[]` has `initial_item_count` 2 but starts empty
   (60J decided empty); `caseId` and the party ids have no rows; the
   Simplified Plan's first guardian row lacks `signatureState` and
   `signatureImage`; the Inventory's `preparer.email` and
   `serviceAttorney.signatureDate` have rows but no default.

### Earlier work this touches

- Item 1: 14C ("persist only after explicit workflow or assignment
  changes", Archive:1843); 74S-4 (status changes are logged -- kept).
- Item 2: **Milestone 24**: a formatter "must not re-run on every input event
  while typing" (Archive:4521); the Inventory is the exception the shared
  contract avoids.
- Item 3: 52J decision 4 knowingly recorded the limitation.
- Item 4: Milestone 71's D2 rounding rule.
- Item 5: the Initial Plan's reset was designed for "a one-time filing";
  74J-3 made the Annual Plan its next filing (which carries the residence);
  74P clears its "same as residence" with the addresses.
- Item 7: 60J decided the Simplified's remuneration starts empty; 44D is the
  precedent for correcting the CSV as documentation.

### Proposed

- **Item 1:** the status and Judge boxes save and log once, on commit, and
  redraw only their row; focus stays (as the circuit select already does).
- **Item 2:** the Inventory's phone, SSN, case, account and check boxes
  format when the filer leaves them, like every other form.
- **Item 3:** Escape closes the suggestion list first, then (on a second
  Escape) the dialog.
- **Item 4:** the helper uses the app's rounding.
- **Item 5:** decision 76L-1.
- **Item 6:** the Simplified Plan's new year clears the attorney signature
  date, as every other.
- **Item 7:** the data model is corrected (documentation), with 76F-2's rows.

### Decisions

**76L-1 — The Initial Plan's new year.** *Reopened: the settled answer left
out four details of the same kind (where the ward lives, the residence
phone, "mailing same as residence", the successor answer), and there is a
further option: no New Year on the Initial Plan.*
1. **(Recommended)** **Keep the ward's details** -- residence, mailing
   address, where the ward lives, residence phone and "mailing same as
   residence" -- and the guardianship's facts (inception date, Letters date,
   successor answer); clear the rest. *What a filer sees:* the same rule as
   the other Plans.
2. **Don't offer New Year on the Initial Plan;** point the filer to the
   Annual Plan, its next filing.
3. **As today.**

**Settled 2026-10-19 by the requester (put again one at a time): option 1.**

### Checklist (AGENTS.md §8)

| # | Answer |
| --- | --- |
| 1 Data model | Item 7 corrects the data model; `verify:data-model` passes. |
| 2 Legacy data | None. |
| 3 Fixtures | The year-rollover golden for 76L-1, with a stated note. |
| 4 Tests | Unit for items 4–6 (red first; `new-year-reset.spec.js`); browser for items 1–3 with real keys (AGENTS.md §6). `TEST-INDEX.md` rows. |
| 5 Export/import | None. |
| 6 Security | None. |
| 7 UI | The dashboard keeps focus like the circuit select. |
| 8 Legal | None. |
| 9 Cross-form | 76L-1 follows the other Plans' rule. |

---

## Appendix A — Every decision

Settled = answered 2026-10-19 on Revision 1 and still standing (76G-4 is
also applied to the Simplified eligibility dialog, which works the same
way). Re-asked = reopened by Revision 2 (the reason is in its section). New
= first asked in Revision 2. Every re-asked and new decision was put to the
requester one at a time on 2026-10-19. 37 in all: 10 settled, 13 re-asked,
14 new -- all now answered.

| Decision | Status | Answer (2026-10-19) |
| --- | --- | --- |
| 76A-1 How an unlock reloads | Settled | No save until the reload finishes |
| 76A-2 Two tabs and one file | Re-asked, settled | Merge by filing |
| 76A-3 Work in no file at a lock | New, settled | An encrypted copy in this tab's memory |
| 76A-4 Firefox/Safari downloads | New, settled | As today: a download marks the case saved |
| 76B-1 How text is made safe | Re-asked, settled | Keep everything; escape on display (reverses 73T-3's import stripping) |
| 76C-1 Large case files | Re-asked, settled | Measure; limit at the ceiling; refuse saves above it; banner |
| 76D-1 Open Backup | Re-asked, settled | Two actions: Open Case File / Restore from Backup |
| 76E-1 A row holding only a draft | New, settled | Counts as touched (Milestone 25) |
| 76F-1 New Year from an earlier year | Settled | Build from the latest year |
| 76F-2 Where links live | Re-asked, settled | Case and ward links on the filing; others per year |
| 76F-3 Two years, one period | New, settled | Never delete a folder another year uses |
| 76F-4 Editing an older year | New, settled | Behaves like a closed filing |
| 76G-1 Same-period Starting Balance | Re-asked, settled | Convert asks "same period or next?" |
| 76G-2 Inventory → Annual Schedule A | Settled | Leave blank |
| 76G-3 Annual → Final | Re-asked, settled | Carry holdings, accounts, trusts, bond, relationship -- not the ward's status |
| 76G-4 A same-named ward | Settled | Ask before linking (with the eligibility dialog) |
| 76H-1 Letters the PDF can't print | Re-asked, settled | Embed Latin Extended-A and -B, and warn |
| 76H-2 Checklist prefix | Re-asked, settled | State in the accessibility tags, no visible prefix |
| 76H-3 Unreadable amounts and shares | Re-asked, settled | Count as 0 everywhere; print as typed with a note |
| 76H-4 Part IX bond table | Settled | The workbook's layout and words |
| 76H-5 Plan for Minors caption | Settled | The original form's words; still flagged for a qualified person |
| 76H-6 The Inventory's bond total | New, settled | Match its workbook |
| 76H-7 Part XI/VII after an override | New, settled | Always print the Part; blank lines when unanswered |
| 76H-8 The attorney's County box | New, settled | Remove from the page (value kept) |
| 76I-1 Another form's workbook | Settled | Refuse, naming it (the Annual family as one form) |
| 76I-2 A B-4 row the workbook can't total | Settled | Excel-only block for started rows |
| 76I-3 Unreadable amounts and Excel | Settled | Excel-only block for written amounts in use |
| 76I-4 The apostrophe | Re-asked, settled | Keep the guard as it is |
| 76I-5 A workbook that matches no form | New, settled | Refuse it |
| 76I-6 Part XI/VII lines | New, settled | Write lines that read back and never show empty dashes |
| 76I-7 Which Annual workbook guardians fill | New, answered | Both, or not sure (Clerk practice); item 1 can go early |
| 76J-5 A recipient on a later card | New, settled | Any listed recipient answers (D16; reverses D17) |
| 76K-1 Key strengthening | Settled | Record it; 600,000; raise the format version |
| 76K-2 Browser-storage recovery copy | Re-asked, settled | Retire it with 76A-3 |
| 76K-3 Ward names in browser storage | New, settled | Stop storing; the message channel only |
| 76K-4 The open-file password prompt | New, settled | 5 wrong passwords, then a flat 1-minute lockout (the requester's words); unlock unchanged |
| 76L-1 Initial Plan new year | Re-asked, settled | Keep the ward's details and the guardianship's facts |

## Appendix B — Checked and found sound

- **Calculations against the Clerk's templates** (read with a parser): the
  Annual's Line 20 (`I8+I11+I17+I19`) and Line 30 (`SUM(H25:H29)`), every
  schedule total and sign, the restricted and bond formulas (`SUM(G14:G16)`),
  Schedules E and F; the Inventory's Summary I (`H39 = H32 + H38`) and its
  bond; the Simplified's Line 8 (`H31 = H19+H24-H29`); every workbook row map;
  the 18 B-4 categories against all 50 register pages; ward's % stored 0–100
  and written as a fraction; `roundCents()` and `formatMoney()`; the Line
  20/30 comparison as printed. Only the audit-fee boundary (76I item 9) and
  the same-period carry (76G item 1) differ.
- **Workbook structure:** only the two approved formula overwrites
  (`'PART II, III'!F25`, `'PART III'!F8`) remove a formula; every total
  rebuilt after page pruning and every defined name refers only to existing
  sheets; print areas, dropdowns, merges and protection survive; negatives,
  shares, dates and B-4 accounts round-trip.
- **Nothing leaves the device:** no fetch, beacon or telemetry carries case
  data; the content-security policy limits connections to the app's origin;
  the service worker caches only the app's own files.
- **Encryption basics:** a fresh random IV per encryption, a random salt per
  case, a key that can't be extracted, cleared on lock; the encrypted
  manifest holds no names; a failed write leaves the original file intact.
  (76K lists what these don't cover.)
- **The testing adapter** can't be enabled from a web address or a stored
  setting.
- **The readiness card agrees with the export checks** in both directions;
  no attorney requirement fires on an unrepresented filing (pro se / Ch. 393);
  the export checks coerce no unanswered yes/no; every issue route exists;
  impossible dates are rejected and leap years pass. (Revision 1 also said
  "no tri-state is coerced" in conversion; 76G item 2 shows one is.)
- **Signature modes, certificates of service, apportionment, signs and
  rounding on the PDFs**; every saved input reaches its PDF or is left out by
  a recorded decision.
- **Pages:** every `href="#"` action calls `preventDefault()`; 587 unrouted
  answers flipped with no hidden reveal; no two boxes share a path; Add,
  Remove and Duplicate move links and drafts correctly (apart from 76E item
  3); late blurs land on the right filing.
- **Filing model:** the Starting Balance carry into a new period; row removal
  and guardian links; party merge and unmerge (apart from 76F item 2's older
  year); the 2026-10-17 new-year rule; in-place Filing Type change.

## Appendix C — Not part of this milestone

- The pending decision on a UI framework (AGENTS.md §1).
- Consolidating every form's "started row" tests onto one rule (the
  accountings' Summary badges were fixed on 2026-10-18, `87f8a904`).
- A pre-read size guard for imported workbooks (76I item 1), binding
  encrypted parts to their places and authenticating the "protected" mark
  (76K item 1): each a separate, larger change.
- Noticed in passing: three unused functions in `pdf-engine.js:631-756`
  (`getSupportingDocumentImageLayout`, `renderSupportingDocumentImage`,
  `renderSupportingDocumentText`); the stale "Helvetica" comment beside the
  checklists (`pdf-engine.js:1249`); and `issue-registry.js`'s note that an
  unreadable amount is "bypassable, like an impossible date" (an impossible
  date hasn't been overridable since 73F part 3).

## Appendix D — What Revision 2 corrected

| Where | Revision 1 said | Revision 2 |
| --- | --- | --- |
| 76I item 1 | The Clerk's own 90-sheet Annual workbook is refused on import | The Clerk's original has 58 sheets and imports; the 90-sheet template is the app's own (57D); only a very large export is refused; the limit runs after the full read |
| 76I order | Fifth in the recommended order | Moved with the rest of 76I |
| 76H item 4 | Letters print as gaps | Letters are deleted ("Dvoák"); label was overclaimed |
| 76H item 1 | ~250 words; 4,800-character notices; "only the question block paginates" | ~300 words (1,800 characters); notice text fits to ~5,300; what can't split is a single row or box |
| 76G-3 | The ward's status is among what Start New Year keeps | Start New Year clears it; 72G |
| 76B item 1 | Typing keeps `"` on every form | Not on the Annual family: blur strips it |
| 76B item 2 | Every string of every filing | Filings only, not array elements; shared records never filtered |
| 76B item 3 | Annotations lost | The whole Print Preview fails for that filing |
| 76B checklist | The source-audit test catches a forgotten escape; `security-source-audit.spec.js` | A render-time check; the five specs that encode the old rule |
| 76A item 3 | "Exposed: a new case never saved, and every Firefox/Safari user" | The three real triggers; the earlier test was red only for lack of browser storage in Node |
| 76A item 1 | "can no longer be read from the old handle" | The `File` object becomes unreadable; the handle can be read again |
| 76A checklist | Fixtures: none; security: no change | Six browser specs' fake handles; keeping work in memory weakens the lock |
| 76C | 1.35×; "twelve 3 MB PDFs"; "no total"; 500 MB | 1.35× with a password (1.01× without); twelve 3.2 MB with a password; Milestone 23's per-filing 40 MB export total; unmeasured |
| 76D | "Without asking"; "the backup becomes the auto-save target" | Asked only as a count; auto-save stops until Save Backup writes the backup; documented behavior |
| 76E item 3 | A draft moves to the wrong line | Or the row holding it is deleted |
| 76E item 4 | Under Part I | Part I on the Annual family, the Cover elsewhere |
| 76F item 2 | County sync stops; Judge copy stops | A second ward record is created; the Judge copy falls back to a prompt |
| 76F item 4 | Deleting a year deletes another's documents | Two years with one period share one folder all the time |
| 76G item 1 | D6's same-period case "was never asked" | D6 named and tested these paths; "same period" is always true here |
| 76G item 2 | `conversion.js:160-176` | `:168` and `:169-175` |
| 76G item 7 | "Unasked" | Pre-selected with a visible note; the link is what goes unsaid |
| 76J item 1 | Cited AGENTS.md §4; non-PDF uploads | Cites 38D; uploads already refuse non-PDFs -- damaged or protected PDFs; the Continue button is withheld |
| 76J item 3 | "The schedule … shows nothing" | Its document row shows "Blocked"; its mark and Go-to are missing |
| 76J item 6 | Implied a filing rule | The app's own 34-1A consistency rule |
| 76K item 3 | Against the app's design | A disclosed design (56B), against the Milestone 57 instruction |
| 76K item 6 | The filer sees it and re-answers | The page shows unanswered while the filing treats it as "No" |
| 76K-2 | "Clear it once saved" | Already today's behavior; "at startup" would wipe a live tab's copy |
| 76K checklist | Encrypted fixtures re-saved | Never re-saved; a new fixture added |
| 76L item 1 | Redraws the grid | Redraws the whole page and logs each arrow key |
| 76L item 4 | Rounding defect | Only sub-cent payments are affected |
| 76L | No "Proposed" section | Added |
| Appendix B | "No tri-state is coerced" | Not in conversion (76G item 2) |
| 76A, 76H-4, 76I-1 | "A download marks nothing saved", the Inventory's label and unrecognised workbooks sat inside a delivery or a settled answer | Put as their own decisions: 76A-4, 76H-6, 76I-5 |
| 76G item 1 | Cited the Clerk's labels only | Also Fla. Prob. R. 5.696(b)(1), as Milestone 71 quoted it (the rule excludes the Simplified) |
