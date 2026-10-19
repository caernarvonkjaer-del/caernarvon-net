# Milestone 76 Proposal — What the whole-app review found

## Status

**Draft.** Building any delivery, or any part of one, needs the requester's
named approval of that delivery (AGENTS.md §3). Approving one delivery
authorizes only that one.

**Every decision is settled** (the requester, 2026-10-19, asked one at a
time), each as recommended -- including the two accepted by name because
they change a filed figure or filed wording: 76G-1 (a same-period
conversion carries the source's own Starting Balance) and 76H-2 (the
checklists print just the box and the text). See Appendix A.

**On hold for the requester's review** (2026-10-19). Nothing in this
milestone may be built until the requester says to go ahead, although
76A–76D were approved earlier the same day ("76A–76D, data loss"), in that
order, each with red-first tests and a full regression only on the
requester's go-ahead. Every other delivery stays Draft. Nothing has been
built.

## Where these came from

On 2026-10-18 the requester asked for a code review of the entire app, "not
related to a specific commit". Seven reviewers read it in parallel, one area
each: the court workbooks, the PDFs, the export checks and readiness, saving
and security, the filing model and its lifecycle, the money calculations
against the Clerk's templates, and the pages and dashboard. None of them
changed anything. Every finding was then checked against the code before it
was reported to the requester, and the requester asked for it all to be
written up as the next milestone (2026-10-19).

This document is that write-up: about seventy findings, grouped into twelve
deliveries by what they touch, most severe first. Nothing here has been
built.

### How each finding was checked

Each finding carries one of three labels. They say how much of it has been
seen working, not how serious it is.

- **Confirmed** -- read in the code by the author of this proposal, and in
  most cases also reproduced by running the app's own code on a test filing.
- **Reproduced** -- a reviewer ran the app's own code and showed the
  behavior; the author has not re-read every line behind it.
- **Read** -- found by reading the code; not executed. To be reproduced
  before it is fixed (AGENTS.md §2, red-first).

Line numbers are given where they were checked on 2026-10-19 and may drift;
the function names are the durable reference.

### Recommended order

| Order | Delivery | Why first |
| --- | --- | --- |
| 1 | [76A](#76a--saving-never-loses-a-case) Saving never loses a case | A filer can lose a whole case file today, with no warning |
| 2 | [76B](#76b--text-is-kept-as-typed) Text is kept as typed | Typed text is silently erased or altered |
| 3 | [76C](#76c--large-case-files-open-again) Large case files open again | A saved case can become impossible to open |
| 4 | [76D](#76d--open-backup-keeps-the-newer-work-and-the-password) Open Backup | Can remove a password and roll back work |
| 5 | [76I](#76i--the-court-workbooks) part 1: the Clerk's Annual workbook is refused on import | Import from Excel does not work on a hand-filled Annual workbook |
| 6 | [76E](#76e--a-date-the-filer-can-always-fix) Dates the filer can always fix | A hidden bad date blocks every output, with nothing to fix |
| 7 | [76G](#76g--conversions-and-case-links) part 1: a same-period conversion counts the year twice | A filed figure is wrong and nothing says so |
| 8 | [76H](#76h--the-pdfs) parts 1–2: long text and nameless trusts lost from the PDF | The filed PDF silently omits what the filer entered |
| 9 | [76F](#76f--years-and-links) Years and links | Wrong starting balance; lost case links and documents |
| 10 | [76J](#76j--the-export-checks) The export checks | Wrong pages, wrong cards, an override that can't be given |
| 11 | the rest of 76G, 76H and 76I | Narrower, or visible to the filer |
| 12 | [76K](#76k--security-hardening) Security hardening, [76L](#76l--pages-and-smaller-fixes) Pages and smaller fixes | Lower risk |

Deliveries 76A, 76C and 76D share `src/core/persistence/` and
`src/core/security/app-lock.js`; 76B shares `input-hardening.js` with 76C's
size limit and 76I's sheet limit. They are separate for approval, but built
in that order on one branch of work, not in parallel (AGENTS.md §2: a stated
prerequisite usually means real file overlap).

---

## 76A — Saving never loses a case

### What a filer sees today

A guardian using a password works for a while, steps away, and the app locks
itself after 15 minutes. They type the password and carry on. If the case
holds attached statements, the case file on disk may by then hold **no
filings at all** -- and the app shows nothing wrong, because what is on the
screen came back from the file a moment before the file was overwritten.
Closing the tab gives no "unsaved changes" warning. Every filing is lost from
the file until something triggers another save.

Three other ways the same kind of loss happens: a second tab with nothing
changed writes its old copy over the first tab's work; a lock wipes work that
was never saved to a file; and an edit made while a long save is running is
marked as saved.

### Verified

1. **Unlocking can write an empty case over the case file.** *Confirmed and
   reproduced.* On a successful unlock, `submitUnlockForm()`
   (`src/core/security/app-lock.js`) saves the unlock state through
   `saveUnlockFailState()` → `saveAppState()`
   (`src/core/persistence/launch-preferences.js:144`) → `requestSave()` →
   `autoSave()` (`case-file.js:785`), which queues a full save one second
   later. Meanwhile `lockApp()` has already replaced the case in memory with a
   blank one (`replaceCaseFile(blankCaseFile())`) and is re-reading the file.
   If the re-read takes longer than a second, `saveData()` writes the blank
   case to the file. The reviewer's probe: a case with 24 MB of attachments
   (a 32 MB file) took 1.44 s to re-read; the file ended with 0 filings while
   the screen showed 2, and the unsaved-changes flag was off. In Chrome, a
   file changed after it was opened can no longer be read from the old
   handle, so the re-read can then fail too and memory stays blank (emulated,
   not tested in Chrome).
2. **An idle second tab overwrites the shared file.** *Reproduced.*
   `saveData()` writes on every hide, lock or unload even when nothing
   changed (`installSaveListeners()`), and never checks whether the file
   changed on disk. A second tab re-opens the same remembered file. In the
   probe, an idle second tab, when hidden, reverted a filing from the other
   tab's afternoon of work to its morning copy. Filing locks stop two tabs
   editing the same filing only, and are skipped when the app runs from disk
   (`ward-lock.js:48`). An older cached tab can likewise overwrite a file a
   newer version saved: the lock's own save runs before the newer-format
   check in `lockApp()`.
3. **A lock can wipe unsaved work when there is no case file.** *Reproduced.*
   `lockApp()` clears memory without checking that the work is in a file or
   in this tab's recovery snapshot. All tabs share one snapshot slot
   (`recovery-cache.js`), and a failed snapshot write (storage full with
   large attachments) is swallowed. Exposed: a new case never saved to a
   file, and every Firefox/Safari user. In Firefox/Safari, Save Backup (a
   download) clears the snapshot, so a later auto-lock with no edits since
   leaves an empty case and nothing says to reopen the downloaded file.
4. **An edit made during a save is marked as saved.** *Reproduced.*
   `writeCaseToHandle()` clears the unsaved-changes flag and the recovery
   snapshot after writing (`case-file.js`), even when edits arrived after the
   save began collecting data. A save with attachments takes many seconds
   (17.6 s for 51.7 MB in a probe); closing the tab in that window loses the
   edit with no warning. The Firefox/Safari download fallback marks the case
   saved as soon as the download starts.

### Proposed

- No save runs while a lock is being undone; the reload finishes first, and
  a reload that fails leaves the file untouched and says so on screen.
- A tab writes only when it has changes, and before writing checks that the
  file has not changed since this tab last read or wrote it. If it has, the
  tab does not write; it says so and offers to reload.
- A lock never clears work that is not safely in a file or in this tab's own
  snapshot; if it can't keep it, it says so before locking (or keeps the work
  in memory behind the lock screen).
- The unsaved-changes flag is cleared only for the edits a save actually
  wrote; a download marks nothing saved.

### Decisions

**Settled 2026-10-19 by the requester: each as recommended.**

**76A-1 — How an unlock reloads the case.**
1. **(Recommended)** No save runs until the reload has finished; a failed
   reload leaves the file as it was and tells the filer. *What a filer
   sees:* nothing different, except a clear message if the file can't be
   re-read.
2. Re-read the file before the lock screen closes. *What a filer sees:* the
   lock screen stays up a moment longer on a large case; a bigger change to
   the unlock flow.

**76A-2 — A second tab and the case file.**
1. **(Recommended)** Before writing, check the file hasn't changed since this
   tab read or wrote it; if it has, don't write, and offer to reload. *What a
   filer sees:* a tab left open in the background can no longer undo work
   done in another tab; a stale tab says so instead.
2. Only write when this tab has changes. *What a filer sees:* an idle tab no
   longer overwrites anything, but two tabs that both have changes still
   overwrite each other.

### Checklist (AGENTS.md §8)

| # | Answer |
| --- | --- |
| 1 Data model | None. |
| 2 Legacy data | None; files are read as today. |
| 3 Fixtures | None. |
| 4 Tests | New unit specs for the unlock reload, the stale-tab check, the lock-without-file case and the save/edit race (each red first); `TEST-INDEX.md` rows. A browser test of lock → unlock on a case with attachments. |
| 5 Export/import | The `.sav` save path only. |
| 6 Security | No change to encryption. The fix keeps data that is today lost; it stores nothing new. |
| 7 UI | Messages use the existing save-error banner and `alertModal()`. |
| 8 Legal | None. |
| 9 Cross-form | Not form-specific. |

---

## 76B — Text is kept as typed

### What a filer sees today

On an Annual, Final or Trust Accounting, a guardian types "Pension (monthly
= $1,200)" in a description box and moves on. The box is now empty. The same
happens to "12 months = $14,400" and "Donation=500 to church". On every form,
opening a case file removes every quote mark and angle bracket from all
text: `30" Flat screen TV` becomes `30 Flat screen TV`, and `John "Jack"
Smith` becomes `John Jack Smith`. The next save makes the change permanent.
About one saved annotated PDF in fifty is damaged the same way and can no
longer be shown.

### Verified

1. **Annual-family text boxes are emptied when the filer leaves them.**
   *Confirmed and reproduced.* Every plain free-text box on the Annual, Final
   and Trust Accountings carries `data-field-sanitize="security"`
   (`annual-accounting/index.js`, `inpD()` with `securitySanitize: true`).
   On blur, `form-contract.js:520` runs `validateSecurityInput()`
   (`src/core/security/input-hardening.js:80`), which returns `''` whenever
   `detectXSSPayload()` matches. One of its patterns, `/on\w+\s*=/i`, matches
   ordinary words: "m**onthly =**", "m**onths =**", "D**onation=**". The
   whole value is erased, with no message; an optional box is simply blank.
2. **Every open strips characters from all text.** *Confirmed and
   reproduced.* `sanitizeObjectData()` → `sanitizeInput()`
   (`input-hardening.js:51-58`) removes every `"`, `<`, `>` and backtick,
   plus any `javascript:` and `on<word>=`, from every string of every filing,
   on every open (`case-reader.js`), every backup or drop import
   (`case-file.js`), and every lock recovery (`app-lock.js`). Decision
   73T-3 keeps the Clerk's own example `30" Flat screen TV`, and typing
   keeps it on every form; opening the file then removes it.
3. **Saved annotated PDFs are damaged.** *Reproduced.* They are stored as raw
   base64 (`pdf-preview.js`), not as a `data:` URL, so the `data:` exemption
   doesn't cover them; base64 that happens to contain `on` + letters + `=`
   is cut. The reviewer's probe: 430 of 20,000 random samples (2.15%) were
   damaged. An affected filing's annotated preview then fails every time and
   its annotations are lost.
4. **Typed text reaches the page unescaped in two places.** *Reproduced.*
   The "This page still needs" list (`status/section-status.js`, drawn
   through `nav-marks.js` and `guardian-inventory/index.js`) quotes raw typed
   text from the county, e-mail and amount checks; the Annual D-1 card
   heading does the same. Pasting `John Doe <john@x.com>` into an e-mail box
   makes the address vanish from the message. (The content-security policy
   blocks inline scripts, so this corrupts the display, not the app.)

### Proposed

Keep every value exactly as the filer typed or imported it, and make text
safe where it is shown instead: every place that puts filing text into the
page escapes it (most already do, through `esc()`). The open-time stripping
and the blur-time erasing stop; annotated PDFs are left as stored.

### Decisions

**Settled 2026-10-19 by the requester: each as recommended.**

**76B-1 — How text is made safe.**
1. **(Recommended)** Keep what's typed; escape it wherever it is displayed.
   *What a filer sees:* nothing they type or import is ever changed or erased.
   Text already stripped from an older file can't be restored.
2. Keep filtering input, with narrower patterns (only real tags and script
   URLs). *What a filer sees:* "monthly = $1,200" survives, but quote marks
   are still removed on every open.

### Checklist (AGENTS.md §8)

| # | Answer |
| --- | --- |
| 1 Data model | None. |
| 2 Legacy data | Text already stripped in a saved file stays as saved (visible, not silent: the filer sees their own text). Annotated PDFs already damaged stay damaged; nothing further is damaged. |
| 3 Fixtures | None. |
| 4 Tests | Unit: the three examples above survive blur and a save/open round trip; annotated base64 survives open (red first). A source audit test that every `innerHTML` built from filing data goes through `esc()`. `TEST-INDEX.md` rows; the existing `security-source-audit.spec.js` updated to the new rule. |
| 5 Export/import | `.sav` open, backup import, Excel import (already escapes on display; unchanged). |
| 6 Security | Threat model: a case file or workbook crafted to run script when shown. Protection moves from stripping input (which also destroyed legitimate text) to escaping output plus the existing content-security policy. Residual risk: a renderer that forgets `esc()` -- the source audit test exists to catch that. |
| 7 UI | None visible beyond text no longer changing. |
| 8 Legal | Filed text becomes exactly what the filer entered (decision 73T-3's quote mark included). |
| 9 Cross-form | All nine forms; today only the Annual family erases on blur, but every form is stripped on open. |

---

## 76C — Large case files open again

### What a filer sees today

A guardian attaches a year of bank statements to an Annual Accounting --
twelve 3 MB PDFs. The case saves normally. The next time they open it: "That
file is 51.7 MB, which is over the 50 MB limit." Every filing in the case is
now out of reach in the app; the file itself is intact.

### Verified

*Confirmed and reproduced.* `IMPORT_SIZE_LIMITS.sav` is 50 MB
(`input-hardening.js:95`), checked on every way a case file is opened.
Uploads are capped only per file (`SCHEDULE_DOC_MAX_FILE_BYTES`, 15 MB,
`src/core/filing/schedule-docs.js:27`), with no total, and archived years
keep their documents. A case file comes out at about 1.35 times its
attachments, so roughly 37 MB of uploads across a case is enough. The
reviewer's probe saved a 51.7 MB case (17.6 s) and then could not open it.

### Proposed

The app opens any case file it could have saved itself, and tells the filer
before a case grows too large to handle comfortably.

### Decisions

**Settled 2026-10-19 by the requester: each as recommended.**

**76C-1 — Large case files.**
1. **(Recommended)** Raise the open limit well above what the app can save
   (500 MB) and warn on Save once a case passes 40 MB, naming the largest
   attachments. *What a filer sees:* every saved case opens; a warning
   before a case gets slow.
2. Cap total attachments per case at 40 MB and refuse uploads past it.
   *What a filer sees:* a refusal when attaching the statement that crosses
   the cap.
3. Raise the open limit only. *What a filer sees:* every case opens; no
   warning as it grows.

### Checklist (AGENTS.md §8)

| # | Answer |
| --- | --- |
| 1 Data model | None. |
| 2 Legacy data | Cases saved over 50 MB, unopenable today, open again. |
| 3 Fixtures | None. |
| 4 Tests | Unit: a case over 50 MB opens (red first); the warning threshold. `TEST-INDEX.md` row. |
| 5 Export/import | `.sav` open and backup import. |
| 6 Security | The open limit guards against a hostile oversized file; 500 MB keeps that guard while covering anything the app saves. |
| 7 UI | The existing save banner / `alertModal()`. |
| 8 Legal | None. |
| 9 Cross-form | Not form-specific. |

---

## 76D — Open Backup keeps the newer work and the password

### What a filer sees today

A guardian opens an older password-protected backup to recover one filing.
Three things happen without asking: a filing that exists in both is replaced
by the backup's older copy (three weeks of edits gone in the probe); from
then on the app saves to the backup file instead of the main case file; and
if the open case has no password, the next save rewrites the backup
**unencrypted**, SSNs readable.

### Verified

*Reproduced* (the reviewer's probe; the code paths are in
`src/core/persistence/case-import.js`):

1. A filing present in both is replaced by the backup's copy without
   comparing dates. The prompt says only "1 existing ward(s) will be
   updated", and the merge is written to the main file at once.
2. The backup file becomes the auto-save target, so later saves go to it and
   the main file goes stale.
3. Opening a password-protected backup into a case with no password asks
   only for the backup's password; the next save rewrote the backup as plain
   text (`securityMode` "none"). Between two password-protected cases, the
   backup is silently re-locked under the current case's password.

### Proposed

Open Backup never changes where the case saves, or any file's password. For
each filing in both, the newer copy is kept, and the filer is asked when the
backup's copy is older.

### Decisions

**Settled 2026-10-19 by the requester: each as recommended.**

**76D-1 — What Open Backup does.**
1. **(Recommended)** Merge into the open case, keep the newer copy of each
   filing, and ask when the backup's copy is older; never change the save
   target or any password. *What a filer sees:* a list of the filings the
   backup would replace, with dates, and a choice for each older one.
2. Replace the whole case with the backup, with a plain warning first.
   *What a filer sees:* one clear "this replaces everything" step.
3. Open the backup as its own case, never merging. *What a filer sees:*
   recovering one filing means copying it across by hand.

### Checklist (AGENTS.md §8)

| # | Answer |
| --- | --- |
| 1 Data model | None. |
| 2 Legacy data | None. |
| 3 Fixtures | None. |
| 4 Tests | Unit and browser: an older backup never replaces newer work unasked; the save target is unchanged; a password-protected backup never becomes plain text (red first). `TEST-INDEX.md` rows. |
| 5 Export/import | Open Backup / drop import. |
| 6 Security | Removes a path that writes a protected file unencrypted. |
| 7 UI | The existing confirm dialog pattern (`confirmModal()`). |
| 8 Legal | None. |
| 9 Cross-form | Not form-specific. |

---

## 76E — A date the filer can always fix

### What a filer sees today

A guardian types an impossible date (02/30/2026) in a box that is later
hidden -- an attorney-waiver order date, then they enter an attorney; or a
date in Schedule B-1, then they start a new year and B-1 is emptied. Every
output is now blocked by "… must be a valid date", marked "can't be
overridden", and there is no box on any page to fix it. Leaving a schedule
page can also move an unfinished date onto a different line, so fixing it
overwrites a correct date. A date from an imported workbook that can't be
read is reported only as "Imported from Excel — Line 1", under Part I.

### Verified

All four come from one store, the filing's unfinished-date drafts
(`__fieldDrafts`, `src/core/form/commit-coordinator.js`):

1. **A hidden box's draft still blocks.** *Confirmed and reproduced.*
   `getFieldDraftIssues()` reports every stored date draft that can't be
   read, never asking whether its box is shown. The issue is non-bypassable
   (`issue-registry.js`, decision 73F-3). Reachable from any date box that
   comes and goes: the attorney-waiver order date, the bond waived and
   receipt dates, Part VIII trust dates under No, a Trust Accounting's trust
   dates after a Filing Type change.
2. **Start New Year keeps the drafts.** *Confirmed and reproduced.*
   `resetYearlyFieldsForNewYear()` (`filing-years.js`) never clears
   `__fieldDrafts`, and `commitStoredDateDrafts()` drops an orphaned draft
   only if it *can* be read. The probe: "03/41/2024" left in B-1 row 1, new
   year, B-1 empty, export blocked by "Schedule B-1 — Line 1 — Date Paid
   must be a valid date". A cleared signature date with a bad draft shows
   last year's text.
3. **Leaving a schedule page moves a draft to the wrong line.** *Confirmed
   and reproduced.* `pruneBlankCards()` (`src/core/form/prune-cards.js:36-44`)
   removes untouched schedule rows with `data[key] = kept` and never calls
   `remapFieldDrafts()`; its card pass (and every Add/Remove) does. Line 1
   untouched, Line 2 holding "02/30/2026", Line 3 holding 03/01/2026: after
   leaving, Line 2's draft shows in what was Line 3. Covers all eleven
   Inventory schedules, all fourteen Annual schedules and the Final Report.
4. **An imported date that can't be read names nothing.** *Confirmed.* The
   three importers call `recordDateDraft()` with section "Imported from
   Excel" and no route or label (`annual-accounting/excel.js:215`,
   `guardian-inventory/excel.js:152`, `simplified-accounting/excel.js:126`);
   `getFieldDraftIssues()` falls back to route `/`. A Part I field comes out
   as "Imported from Excel — periodTo must be …" (the raw field name).

### Proposed

- A draft whose box is not shown, or whose row is gone, no longer blocks:
  it is kept (hiding never deletes, AGENTS.md §4) but asked about only where
  the box is, and dropped with its row.
- Start New Year clears the drafts of everything it clears.
- Removing untouched rows moves drafts with their rows, as Add/Remove do.
- An imported draft names its schedule, line and field, and its page.

### Decisions

None. (Whether a hidden draft is *kept* is settled by AGENTS.md §4; the
proposal keeps it.)

### Checklist (AGENTS.md §8)

| # | Answer |
| --- | --- |
| 1 Data model | None (`__fieldDrafts` is internal and already persisted). |
| 2 Legacy data | A saved file holding an orphaned draft stops being blocked on open. |
| 3 Fixtures | None. |
| 4 Tests | Unit: each of the four (red first). Browser: an impossible date in a box then hidden doesn't block; leaving a schedule keeps a draft on its line. `TEST-INDEX.md` rows. |
| 5 Export/import | The three Excel importers' draft recording. |
| 6 Security | None. |
| 7 UI | Issues name their page and box like every other issue. |
| 8 Legal | None. |
| 9 Cross-form | All forms share the store; checked on all nine. |

---

## 76F — Years and links

### What a filer sees today

A guardian opens last year's filing from Prior Years to fix a typo, then
clicks New Year. The new year repeats a period that already exists and
starts from the wrong Starting Balance -- the older year's ending, not the
latest's -- which the Clerk will list as a discrepancy. Linking a filing to
its case while in one year and switching to another year drops the link, so
the filing leaves its case group on the dashboard. An Initial Inventory's
supporting documents disappear after its first New Year.

### Verified

1. **A new year is built from whichever year is open.** *Confirmed and
   reproduced.* `startNewWardYear()` (`filing-years.js`) snapshots the active
   year. With 2024 open via Edit Prior Year and 2025 archived, Year 3 gets
   Period From 2025-01-01 (2025's period again), 2024's ending balance and
   2024's Schedule D. No note fires: the balance equals what was carried.
2. **The case link and shared-record links belong to each year.**
   *Confirmed and reproduced.* `WARD_SYSTEM_KEYS` (`filing-years.js:27`)
   leaves out `caseId`, `wardPartyId`, `guardianPartyIds`, `attorneyPartyId`
   and `preparerPartyId`, so every year holds its own. Link in Year 2, open
   Year 1: both `caseId` and `wardPartyId` are back to null. The filing drops
   out of its case group, the Judge copy-across and county sync stop, and New
   Filing from Existing made from Year 1 creates a second case.
3. **An Initial Inventory's first-year documents disappear.** *Confirmed and
   reproduced.* Before any new year, uploads are filed under `'initial'`
   (`doc-period.js`: `activeYearKey || 'initial'`); `checkInActiveYear()`
   then names that year "Year 1", and every lookup uses that name. After
   reopening Year 1 its documents are gone from the screen and the PDF
   supplement; deleting Year 1 removes only the "Year 1" bucket, leaving the
   PDFs in the file although the dialog says they will be deleted.
4. **Deleting a year deletes another year's documents.** *Reproduced.*
   Documents are deleted by period key (`periodKeyForYearData()`), and two
   years can share one (both blank, or the repeated period of item 1).
5. **New Year and Edit Prior Year go ahead after failing to take the
   filing's lock.** *Confirmed.* `confirmStartNewYear()` and
   `editPriorYear()` (`src/core/modals/year-dialogs.js`) ignore
   `switchTo()`'s result; the "open in another tab" notice appears and the
   year is archived or switched underneath the other tab anyway.

### Proposed

- New Year always builds from the latest year (see 76F-1).
- The case link and shared-record links belong to the filing, not to a year.
- The Inventory's first-year documents keep one key through its first New
  Year; deleting a year deletes only its own documents.
- The year dialogs stop when the filing can't be locked.

### Decisions

**Settled 2026-10-19 by the requester: each as recommended.**

**76F-1 — New Year while an earlier year is open.**
1. **(Recommended)** Always build the new year from the latest year, whichever
   is open. *What a filer sees:* the new year's period and Starting Balance
   always follow the most recent year.
2. Refuse, and ask the filer to return to the latest year first. *What a
   filer sees:* one extra step, nothing built from the wrong year.

**76F-2 — Where the links live.**
1. **(Recommended)** On the filing. Existing files: the link of the latest
   year that has one becomes the filing's. *What a filer sees:* a link made
   in any year holds in every year.

### Checklist (AGENTS.md §8)

| # | Answer |
| --- | --- |
| 1 Data model | `caseId` and the four party ids move from year data to filing level; they gain the data-model rows they lack today (see 76L part 7). |
| 2 Legacy data | Migration on open: take the latest year's links for the filing; Inventory documents under `'initial'` are found again. Nothing is lost; a link that differed between years is resolved to the latest (visible on the dashboard). |
| 3 Fixtures | Year-rollover golden regenerated with a stated note. |
| 4 Tests | Unit for each item (red first); the year-rollover characterization updated. `TEST-INDEX.md` rows. |
| 5 Export/import | `.sav` save/open (the link location). |
| 6 Security | None. |
| 7 UI | The existing year dialogs and lock notice. |
| 8 Legal | None. |
| 9 Cross-form | All filing types have years; the document key differs only on the Inventory. |

---

## 76G — Conversions and case links

### What a filer sees today

A guardian starts an Annual Accounting for 2025, then realizes the ward
qualifies for the Simplified, and makes a Simplified from it for the same
year. The Simplified's Starting Balance is the Annual's **ending** balance,
so once the year's interest and charges are entered again, the year is
counted twice and Line 8 is wrong. Nothing flags it. Other conversions drop
details the source held, or answer a question for the filer.

### Verified

1. **A same-period conversion starts from the ending balance.** *Confirmed
   and reproduced.* Annual → Simplified (`conversion.js:239` with `:259`) and
   Simplified → Annual (`:307` with `:308`) call
   `applyCarriedStartingBalance()` -- "carry the prior filing's ending
   balance" -- and then copy the source's own period ("Same ward, same
   period, smaller form"). The Clerk's Simplified workbook defines Line 1 as
   "Starting Balance [Net Assets per the Prior Report]" (`'PARTS I, II
   '!C19`; Line 8 `=H19+H24-H29`); for the same period, that is the source's
   own Starting Balance. Example: an Annual for 2025 starting at $10,000 with
   $50 interest and $20 charges ends at $10,030; the Simplified starts at
   $10,030 and, once the same $50/$20 are entered, Line 8 is $10,060 against
   a true $10,030. Decision D6 (Milestone 71) answered which prior figure
   carries into a *new* period; the same-period case was never asked.
2. **Initial Inventory → Annual.** *Confirmed and reproduced*
   (`conversion.js:160-176`):
   - Schedule A gets each C-1 income source's full projected amount, ignoring
     the ward's share ($24,000 at 50% arrives as $24,000), although the
     function's own comment says this year's income "is left for the user to
     confirm rather than silently assumed".
   - Every trust carried from C-4 is answered "Created after the GID? No"
     (`createdAfterGID:'No'`) instead of left unanswered -- an answer the
     filer never gave (AGENTS.md §4, tri-state never coerced).
   - Trusts beyond three are dropped (`slice(0,3)`) without a word.
3. **Carries drop the guardian's address and co-guardians.** *Reproduced.*
   Annual or Annual Plan ↔ Simplified: the Annual's office address and the
   Simplified's residence address are the same address, but the carry writes
   blank (`carry-over.js`); the Simplified requires it, so the filer gets an
   export error for data the source held. Carrying into an Initial Inventory
   or Initial Plan keeps only Guardian 1, though those forms take three and
   four.
4. **Annual → Final.** *Reproduced.* The notice says "The accounting period
   and every schedule start blank" (`conversion.js:73`), but Period From has
   been filled since 74K. The Final also starts without Schedule D, Part
   VIII's trusts, Part IX's bond, the guardian's relationship, the B-4
   accounts and the ward's status, all of which Start New Year keeps.
5. **"+ New Case" can't split a filing off its case.** *Confirmed.*
   `doCreateCaseFromWard()` (`pick-record-dialogs.js`) calls
   `getOrCreateCaseForWard()`, which returns the case the filing is already
   linked to (`case-resolver.js:65`). A filing joined to the wrong ward's
   case stays there and keeps sharing its Judge.
6. **A linked case's county is looked up through a field that doesn't
   exist.** *Confirmed and reproduced.* `syncLinkedCaseCounty()`
   (`navigation/ward-county.js:162`) reads `filing.casePartyId`; the field is
   `caseId`. The lookup always misses and falls back to matching typed case
   numbers: the linked case keeps its old county and an unrelated case with
   the same typed number gets the new one. Warnings only.
7. **Add Form links to a same-named ward unasked.** *Read.* When exactly one
   filing has the typed name, it is chosen as the source (`carry-over.js`);
   accepting links the new filing to that person's ward record and case, so
   two different wards with one name then sync identity edits into each
   other.
8. **Convert does nothing when the source name is typed.** *Read.*
   `convert-ward-modal.js` clears the chosen filing and then returns
   silently; the dialog stays open with no message.

### Proposed

Each conversion carries what the source holds, in the right place, and
nothing the filer didn't answer; its notice says exactly what it carried.
Detailed in the decisions.

### Decisions

**Settled 2026-10-19 by the requester: each as recommended.**

**76G-1 — A same-period conversion's Starting Balance.** *A calculation
change: AGENTS.md §5 requires it be checked against the template, done
above, and accepted by name.*
1. **(Recommended)** Carry the source's own Starting Balance when the periods
   are the same; the prior period's ending balance otherwise, as today.
   *What a filer sees:* a same-year conversion starts where the source
   started; Line 8 / Line 20 come out right once the year is re-entered.
2. Leave it blank for a same-period conversion. *What a filer sees:* the
   filer enters it.

**76G-2 — Initial Inventory → Annual, Schedule A.**
1. **(Recommended)** Leave Schedule A blank, as the code's own comment says.
   *What a filer sees:* this year's income entered as received.
2. Carry the ward's share of each C-1 source. *What a filer sees:* a draft to
   correct.

**76G-3 — Annual → Final.**
1. **(Recommended)** Carry what Start New Year keeps (Schedule D, trusts,
   bond, relationship, B-4 accounts, ward's status) and correct the notice.
   *What a filer sees:* the Final starts from the last Annual's holdings.
2. Keep today's carry and correct the notice only.

**76G-4 — Add Form and a same-named ward.**
1. **(Recommended)** Ask before linking to a filing with the same name,
   showing its case number. *What a filer sees:* one confirmation.
2. Leave as is.

(Items 2's trust answer and dropped trusts, 3, 5, 6 and 8 need no decision:
the trust question stays unanswered and dropped trusts are named; the address
and co-guardians carry; "+ New Case" makes a new case; the lookup reads
`caseId`; Convert says what it needs.)

### Checklist (AGENTS.md §8)

| # | Answer |
| --- | --- |
| 1 Data model | None. |
| 2 Legacy data | None: conversions run once; existing filings are unchanged. |
| 3 Fixtures | The conversion golden (`filing-conversion.characterization`) regenerated with a stated note. |
| 4 Tests | Unit per item (red first); `convert-ward.spec.ts` for the notices. `TEST-INDEX.md` rows. |
| 5 Export/import | None directly. |
| 6 Security | None. |
| 7 UI | The existing conversion notice. |
| 8 Legal | 76G-1 follows the Clerk's workbook's own definition of Line 1; no legal reading is made. |
| 9 Cross-form | Every conversion pair checked; 76G-3 follows Start New Year's rule (2026-10-17). |

---

## 76H — The PDFs

### What a filer sees today

A guardian writes a full answer to the Plan for Minors' Question 5 --
about 250 words. The filed PDF stops mid-sentence; the rest is drawn off the
page. A trust entered on Part VIII without its name disappears from the PDF
with its $50,000, and export doesn't flag it. The Annual's attorney statement
can name the attorney's home county instead of the filing's. Names with
letters like ř, Ł or ş print with gaps.

### Verified

1. **Long text runs off the page and is lost.** *Reproduced.* In
   `src/core/pdf/pdf-engine.js`, only the `question` block continues onto a
   new page. Key-value rows, table rows, notice boxes and supporting-document
   comments start a new page and then draw the whole block anyway, past the
   footer. Plan for Minors 5A–D (`plan-minor/pdf-model.js`) sits two to a
   row in columns about 115 pt wide: about 1,700 characters runs through the
   footer, about 2,700 is drawn to y=1063 on a 792 pt page. Also reproduced:
   an Inventory A-1 note of 450 words, an Annual B-4 payee of 300 words, a
   4,800-character reconciliation explanation or Plan explanation.
2. **A trust without a name drops out.** *Confirmed and reproduced.* The PDF
   prints only trusts with a name (`annual-accounting/pdf-model.js`,
   `filter((t) => t && t.name)`); the export checks ask for a name only when
   no trust card is described at all (`validation/engines/annual.js`). A card
   with trustee, account, type and a $50,000 ward's amount but no name
   passes export; the PDF prints "Does the Ward have one or more Trusts?
   Yes" and no details; the workbook writes the trust.
3. **The attorney statement names the wrong county.** *Confirmed.* The Annual
   family's Part V statement uses `d.attorney_county || county`
   (`annual-accounting/pdf-model.js:379`). The Clerk's workbook fills it from
   the filing's county (`'PART IV, V'!B29 ='PART I'!H2`); the attorney's
   county is never written there. A Pinellas filing with an attorney's
   county of Hillsborough says the accounting conforms to "the standards for
   accountings in Hillsborough County". The Simplified and the Inventory use
   the filing's county.
4. **Letters outside Latin-1 print as gaps.** *Reproduced.* The embedded font
   (`scripts/generate-embedded-font.mjs`) holds ASCII, Latin-1 and a few
   symbols; ř, Ł, ś, Ş, ı, ă, Đ, Vietnamese letters, ≥, → are absent. Names
   such as "Dvořák" print with a gap on the caption, header and signature
   blocks. Nothing on screen warns.
5. **Part XI (Part VII) vanishes after an override.** *Confirmed* on both
   forms. The Annual
   family prints Part XI only when it has entries or the "none" declaration
   (`annual-accounting/pdf-model.js:1269`); the Simplified's Part VII the
   same (`simplified-accounting/pdf-model.js`). The unanswered declaration is
   overridable, and then the Part is left out entirely -- which the code's
   own 58D/60J comments say must not happen, because a missing Part can't be
   told from "none received".
6. **An overridden unreadable amount prints as a figure the filer never
   typed.** *Reproduced.* `presentAmount()` reads with `parseFloat`:
   "1.500,00" prints $1.50 and totals as $1.50; "approx 900" prints $0.00. A
   ward's % of "50%" prints "—" while the ward's amount is figured at 50%.
   (The Annual Plan's Q11 already prints unreadable text as typed.)
7. **Schedule B-4's category summary hides a negative category.**
   *Confirmed and reproduced.* `catTotals[c] > 0 ? … : '—'`
   (`annual-accounting/pdf-model.js:544`, and the screen at `index.js:839`).
   Rent $1,000 and a Medical refund of –$50: Medical prints "—", the total
   prints $950.00, and the lines don't add up. The workbook's summary shows
   ($50.00) (`'SCH B-4 OTHER DISB SUMMARY p1'!I10:I27`).
8. **Part IX's bond table doesn't add up, and cites a statute the workbook
   doesn't.** *Confirmed.* All five lines sit in one Amount column
   (`annual-accounting/pdf-model.js:1111-1121`) while the total adds only the
   three bonded ones; the workbook keeps the restricted lines in their own
   column (`'PART IX '` H12–H13 against G14–G16, H17 `=SUM(G14:G16)`), as the
   Inventory PDF already does. The total's label, "Total Required Bond Amount
   (§ 744.351)", adds a citation the workbook's "Total for BOND REQUIREMENT"
   doesn't make.
9. **Checklists print "Yes — " or "No — " before every item.** *Confirmed.*
   `pdf-engine.js:1283` draws the prefix as ordinary text (its comment says
   it is for screen readers). An unticked certification prints as "No — The
   guardian has consulted with the Ward…", which reads as a sworn denial; the
   Initial Plan's 10F answered No prints "☐ No — Yes" and "☒ Yes — No". An
   existing test asserts the prefix, so it may have been deliberate.
10. **The Plan for Minors caption omits "Minor".** *Reproduced.* The engine
    has a ", A MINOR" caption branch (`getCaseCaptionTitle()`), but no model
    sets `metadata.wardType`. To be checked against the court's original
    form in `reference/` before building.
11. **The Simplified Plan can print no signature line.** *Reproduced.* With
    Guardian 1's card untouched (exported by override) it prints "No
    signature entered." and nothing to sign; the other Plans print a blank
    line.
12. **Plan co-guardians are labelled by position.** *Reproduced.* Annual Plan
    card 3 with card 2 blank prints as "Co-Guardian 2" (`plan-annual` and
    `plan-initial` PDF models); 74B fixed this for the accountings only.
13. **The Initial Plan prints a revoking order after "No".** *Read.*
    `plan-initial/pdf-model.js` prints "Date of Order … entered …" whenever
    filled; the page shows those boxes always. The Annual Plan was fixed on
    2026-10-17.

### Proposed

Items 1, 2, 3, 5, 7, 11, 12 and 13 are defects with one obvious fix: the PDF
paginates every block; a described trust needs a name and always prints; the
attorney statement uses the filing's county (the workbook's own rule,
AGENTS.md §5: the template wins); Part XI/VII always prints, with lines to
complete when unanswered; the B-4 summary prints negative categories; the
Simplified Plan prints a signature line; co-guardians keep their card's
number; the Initial Plan's revoking order prints only under Yes (and its page
shows those boxes only under Yes). The rest need decisions.

### Decisions

**Settled 2026-10-19 by the requester: each as recommended.**

**76H-1 — Letters the PDF font lacks.**
1. **(Recommended)** Embed Latin Extended-A as well (covers Czech, Polish,
   Turkish, Romanian and similar names). *What a filer sees:* those names
   print correctly; the app and each PDF grow by tens of kilobytes.
2. Warn on screen when a name holds a letter the PDF can't print. *What a
   filer sees:* a note to type it differently.

**76H-2 — The checklists' "Yes — / No — ".**
1. **(Recommended)** Remove it from the printed text; keep the meaning in the
   PDF's accessibility tags. *What a filer sees:* "☐ The guardian has
   consulted with the Ward…", as the court's form reads.
2. Keep it.

**76H-3 — Overridden unreadable amounts.**
1. **(Recommended)** Print the text as typed, as the Annual Plan's Q11 does,
   and leave it out of totals with a note. *What a filer sees:* the filed PDF
   shows what they typed, never an invented figure.
2. Leave as is.

**76H-4 — Part IX's bond table.** *A label with a statute citation: for a
qualified person if kept.*
1. **(Recommended)** The workbook's own layout and words: restricted lines in
   their own column, total labelled "Total for BOND REQUIREMENT". *What a
   filer sees:* the PDF matches the Clerk's form.
2. Separate columns, keep the citation.

**76H-5 — The Plan for Minors caption.**
1. **(Recommended)** Follow the court's original form, once read in
   `reference/`.

### Checklist (AGENTS.md §8)

| # | Answer |
| --- | --- |
| 1 Data model | None (item 2 adds a requiredness: a described trust's name; the data-model row's `required_when` updated). |
| 2 Legacy data | Saved filings print correctly on their next export; nothing is migrated. |
| 3 Fixtures | Item 2: every fixture with a described trust already has a name (to be confirmed by grep). |
| 4 Tests | Unit per item against the PDF models; an engine test that a long block continues onto the next page (red first). Browser: `pdf-form-specific`, `pdf-table-semantics`, `plan-pdf-wcag-compliance` for the layout and tag changes. `TEST-INDEX.md` rows. Packaging-relevant (76H-1, the font): recommend `npm run test:e2e:portable`. |
| 5 Export/import | PDF only, except item 2's export check. |
| 6 Security | None. |
| 7 UI | Item 13's page uses the routed-reveal pattern (67F). |
| 8 Legal | Items 3 and 76H-4 follow the Clerk's workbook; 76H-5 the court's form. 76H-2 changes how certifications read on the filed PDF -- flagged for a qualified person. |
| 9 Cross-form | Items 3, 5, 12 and 13 were each checked across the sibling forms; the fixes bring the lagging forms into line. |

---

## 76I — The court workbooks

### What a filer sees today

A guardian fills in the Clerk's Annual workbook by hand and imports it into
the app: "This file has 90 sheets — far more than a Clerk of Court template
ever has. It was not imported." Importing the wrong form's workbook into a
filing empties its schedules with no warning. A Schedule B-4 disbursement
with no category is counted on the PDF but not in the workbook, so the two
filed documents disagree.

### Verified

1. **The Clerk's own Annual workbook is refused on import.** *Confirmed by
   running the app's check on the template.* `assertWorkbookWithinLimits()`
   (`input-hardening.js:149`) refuses more than 60 sheets, and
   `workbookAdapter()` (`workbook-contract/index.js:136`) applies it to every
   import. The Clerk's Annual template has **90 sheets** (the Inventory's 40,
   the Simplified's 7). So Import from Excel on an Annual, Final or Trust
   Accounting works only on a workbook the app itself exported, after its
   unused pages were removed -- and fails even then once a filing keeps more
   than about 36 B-4 register pages.
2. **Importing another form's workbook empties the filing.** *Confirmed.* An
   empty sheet list resets each `alwaysRead` schedule to `[]`
   (`workbook-contract/engine.js:244`); the B-4 reader always empties the B-4
   rows and accounts (`annual.js:137`); the Inventory puts in a blank
   guardian and recipient when Parts III / VI are missing
   (`guardian.js:340-341`); and the workbook-type check returns `''`
   (`index.js:120`), so no "different form" warning appears. An Inventory
   workbook imported into an Annual empties B-1 to F-2, B-4 and the bank
   accounts after a prompt that says only "replaces … in 3 place(s)".
3. **A B-4 row with no category: on the PDF, not in the workbook.**
   *Confirmed and reproduced.* `calcTotalsAnnual()` sums every B-4 row
   (`annual-totals.js:58`); the workbook totals by category, each register
   cell `=IF(E20="Accounting",I20,0)` and so on for the 18 categories, and
   Part VI `H16 = -'SCH B-4 OTHER DISB SUMMARY p1'!I28`. A blank category
   lands nowhere. The "Category is required" check is overridable
   (`engines/annual.js:270`), and an import can bring a category outside the
   18. Starting Balance $1,000, B-4 $500 with no category and $100 Rent: the
   PDF shows Line 20 $400, the workbook $900 and out of balance.
4. **An overridden unreadable amount is filed differently on each output.**
   *Confirmed.* The Inventory writes the text itself (`codecs.js:59`,
   `amountRaw`), so the workbook's `=G27*H27` becomes #VALUE! and spreads
   into the A-1 total, Summary I and the audit-fee base, while the PDF prints
   $1.23 for "1.234,56". The Annual and Simplified write `parseFloat(…) || 0`
   (`excel-engine.js:280`): "1.234,56" is filed as 1.234, "about 200" as 0.
5. **Text starting with -, +, = or @ is filed with a visible apostrophe.**
   *Confirmed.* `sanitizeCellValue()` (`excel-engine.js:125-131`) stores a
   literal `'` in front, as a guard against formula injection; Excel shows it,
   because the cell's style lacks the quote-prefix flag. A payee "-Refund"
   reads "'-Refund" on the court's form.
6. **A blank, untouched B-4 row blocks Save as Excel.** *Read.* Once bank
   accounts exist, `b4-export-plan.js` counts every B-4 row, blank ones
   included, and refuses with "1 Schedule B-4 disbursement is not assigned…"
   -- non-bypassable, although decision 73F says an untouched "+ Add" row is
   no row.
7. **Part XI / Part VII lines come back wrong on re-import.** *Reproduced.*
   `remuneration-line.js` writes `{amount: 500}` with no guardian as "  —
   —  $500.00"; the reader trims leading spaces (`cell-reader.js`), and it
   comes back as guardian "—", type "$500.00", no amount. A numeric
   description with a blank amount comes back as the amount. (Needs an
   overridden required field.)
8. **Re-import replaces a hidden office address.** *Read.* With "same as
   mailing" ticked, the export files the mailing address in the office boxes;
   re-import writes it over the office address the filer typed, so unticking
   no longer brings theirs back (`annual.js` reconcile with
   `import-transaction.js`; AGENTS.md §4). An Inventory C-3 row is re-imported
   only if its first line has text (`guardian.js`).
9. **The audit fee goes up a tier at an exact boundary.** *Confirmed and
   reproduced.* `calcTotalsAnnual()` compares the unrounded Line 30 with the
   tiers (`netAssetsFromD > 25000`, `annual-totals.js:82-86`). D-1 rows of
   $24,999.90 + $0.02 + $0.08 sum to 25000.000000000004: the PDF prints
   "Estate value … $25,000.00" beside $85.00 instead of $20.00 (the
   workbook's tiers, `'PART II, III'!B14:G17`: "$25,000 or less" = $20). The
   Inventory already compares the rounded total (`guardian-inventory/totals.js:84`).

### Proposed

Defects with one fix: the import cap admits the Clerk's own sheet counts;
the audit fee compares the rounded figure (the workbook's rule, AGENTS.md
§5); B-4 untouched rows are no rows; remuneration lines are written so they
read back; re-import keeps a hidden office address; a C-3 row with an amount
is kept. The rest need decisions.

### Decisions

**Settled 2026-10-19 by the requester: each as recommended.**

**76I-1 — Another form's workbook.**
1. **(Recommended)** Recognise a workbook's form from its sheets, and refuse
   another form's, saying which form it is. *What a filer sees:* "This is an
   Initial Inventory workbook; open an Initial Inventory to import it."
2. Warn and let them continue.

**76I-2 — A B-4 row the workbook can't file.**
1. **(Recommended)** Save as Excel can't be overridden for a B-4 row without
   one of the Clerk's 18 categories (the workbook can't total it); the PDF
   stays overridable as today. *What a filer sees:* a clear "pick a category"
   before the workbook, never two filings that disagree.
2. File it under the workbook's catch-all category. *What a filer sees:* a
   category they didn't choose on the court's form.
3. Leave it out of the app's own total too. *What a filer sees:* the PDF and
   workbook agree, and a disbursement is silently not counted.

**76I-3 — An unreadable amount and Save as Excel.**
1. **(Recommended)** It blocks Save as Excel (can't be overridden there); the
   PDF prints it as typed (76H-3). *What a filer sees:* the workbook never
   gets #VALUE! or a figure they didn't type.
2. Leave as is.

**76I-4 — The apostrophe.**
1. **(Recommended)** Store such text with Excel's quote-prefix style, which
   still keeps it from being read as a formula, so no apostrophe shows.
   *What a filer sees:* "-Refund" on the court's form.
2. Leave as is.

### Checklist (AGENTS.md §8)

| # | Answer |
| --- | --- |
| 1 Data model | None. |
| 2 Legacy data | None; workbooks are written fresh on each export. |
| 3 Fixtures | 76I-2: fixtures with B-4 rows already carry a category (to be confirmed by grep). |
| 4 Tests | Unit, reading the exported workbook itself, never re-importing to check (AGENTS.md §5, §10 P1/P2): the Clerk's Annual template imports; another form's workbook is refused; the B-4, amount, apostrophe and remuneration cases (red first). Browser: `excel-*` specs, `export-helper.contract`. `TEST-INDEX.md` rows. |
| 5 Export/import | The three workbook contracts and the import adapter. |
| 6 Security | The import cap guards against a hostile oversized workbook; it moves to the Clerk's largest template plus margin. The apostrophe guard keeps its purpose (no formula injection) through the style flag. |
| 7 UI | The existing import dialog and export reason line. |
| 8 Legal | Item 9 and 76I-2 follow the Clerk's workbook formulas. |
| 9 Cross-form | Items 4, 5 and 9 were compared across the three workbooks; the fixes bring the lagging form into line. |

---

## 76J — The export checks

### What a filer sees today

A guardian has a blank Type of Guardianship (an ordinary item they can
override) and a supporting statement that isn't a real PDF. Save as Excel
says to choose "Continue despite outstanding requirements" -- but there is no
Continue button, because the statement problem can't be overridden, though
the workbook never contains statements. A recipient listed only on card 2 is
reported as "no recipient", steering the filer to answer "no one needs to be
served".

### Verified

1. **Save as Excel can't be overridden for a PDF-only problem.** *Confirmed
   and reproduced.* `acknowledgeOutstandingRequirements()`
   (`src/core/filing/output-authorization.js:13`) refuses if any issue in the
   whole list is non-bypassable, without filtering by output;
   `authorizeFilingOutput()` filters by output. Supporting-document problems
   block only Preview, Print and PDF (`engines/index.js`), yet they make the
   workbook's override impossible.
2. **Ordinary checks fire on boxes the page hides.** Part VIII's ward % is
   checked on every trust card under No or unanswered (`engines/annual.js`;
   *Confirmed*); the Inventory's D-4 bond period under a waived bond or
   depository-only; the Annual Plan's Q10 and the Initial Plan's Q11 "Other"
   directive when "executed" is unticked (*Reproduced*). Each leaves a mark
   the filer can't clear without un-hiding the box. (The amount checks were
   fixed on 2026-10-18.)
3. **Supporting-document problems land on Part I.** *Reproduced.*
   `supplemental-checks.js` gives no route; the section falls through to `/`.
   The schedule that holds the file shows nothing.
4. **Part VIII's "created after the GID?" points at the wrong card.**
   *Confirmed and reproduced.* `engines/annual.js:343` numbers cards within
   the described ones, not by position: card 1 blank, card 2 filled →
   "Trust 1", and Go-to opens the blank card. The Annual Plan's residences
   and providers do the same (lower risk: untouched rows are pruned on
   leaving).
5. **A recipient on card 2 counts as none.** *Confirmed and reproduced.*
   `service-recipients.js:99-101` looks only at card 1 (Annual, Simplified,
   Inventory).
6. **The certificate attorney's signature date isn't checked against the
   period.** *Reproduced.* Every other signature must be on or after Period
   To; this one passes at any date (`engines/annual.js`, `simplified.js`).

### Proposed

A problem blocks only the outputs it affects; checks follow what the page
shows; each issue names its own page and card; any listed recipient counts;
the certificate attorney's date follows the same rule as the others.

### Decisions

None: each follows an existing rule (AGENTS.md §4's bypassable rule; the
2026-10-18 hidden-box rule; the signature-date rule every other signature
follows).

### Checklist (AGENTS.md §8)

| # | Answer |
| --- | --- |
| 1 Data model | None. |
| 2 Legacy data | None. |
| 3 Fixtures | The validator golden regenerated with a stated note if any variant changes. |
| 4 Tests | Unit per item (red first); `sidebar-export-parity`, `validator-engines`, `navigation-status.contract`. `TEST-INDEX.md` rows. |
| 5 Export/import | The output gate. |
| 6 Security | None. |
| 7 UI | Issues route like every other. |
| 8 Legal | Item 6 applies the existing signature-date rule; no new reading. |
| 9 Cross-form | Items 2, 4 and 5 checked on all forms that have the field. |

---

## 76K — Security hardening

### What a filer sees today

Nothing, day to day. These are protections that are weaker than they should
be: a password-protected file accepts parts saved without a password, so
someone who edits an emailed file can plant figures that look genuine; the
open filing's ward name and case number sit unencrypted in browser storage;
and pressing Escape dismisses the lock screen, stranding the filer on a
blank "Locked" page until they reload.

### Verified

1. **Unencrypted parts are accepted in a protected file.** *Reproduced.*
   `decryptJSONWithKey()` accepts the `PLAIN:` prefix whatever the file's
   mode (`crypto.js:96-99`). A verifier stored as plain text let any password
   through the check; a filing swapped for plain text with an altered balance
   opened as authentic. Parts aren't tied to their place in the file, so they
   can be swapped or rolled back. Integrity, not confidentiality.
2. **Key strengthening.** *Confirmed* (the setting); *Read* (the lockout and
   the log). PBKDF2-SHA-256 at 210,000 rounds
   (`src/core/persistence/crypto.js:3`, `PBKDF2_ITERATIONS`); current OWASP
   guidance for SHA-256 is 600,000. The count isn't recorded in the file, so
   raising it would break every existing file. The 5-attempt lockout is held
   in memory only; after a reload the prompt has no limit. Failed-unlock
   entries are dropped from the Activity Log when the lock re-reads the file.
3. **Names in browser storage.** *Read.* `tab-coordination.js` writes the
   open filing's ward name and case number to localStorage
   (`pg-tab-heartbeats-v1`) every 4 seconds, unencrypted even with a password
   -- against the app's design, in which case data lives only in the case
   file and localStorage holds UI preferences (AGENTS.md §6).
   After a crash the entry stays until the next launch.
4. **Leftovers.** *Read.* In no-password mode every unsaved change writes a
   full plain-text copy of the case to IndexedDB (`recovery-cache.js`);
   nothing clears it at startup. The lock screen hides the sidebar but leaves
   the ward's name, guardian and info card in the page (readable in the
   browser's developer tools).
5. **Escape dismisses the lock screen.** *Confirmed.* The lock screen is a
   `.modal-overlay` (`index.html`), and `handleModalKeydown()`
   (`modal-events.js:86-95`) closes the topmost one on Escape. The case is
   already cleared from memory, so nothing is exposed, but the filer is
   stranded until they reload; a dialog that was open when it locked (the
   filing switcher's list of names) shows again.
6. **The Plan yes/no migration runs on only some opens.** *Read.* It runs on
   Open Backup and drop-import, not on a normal open or lock recovery; an old
   Plan's explicit "No" stored as `false` shows as unanswered (visible; the
   filer re-answers).

### Proposed

A protected file refuses unprotected parts; the strengthening setting is
recorded in each file; no case data goes to browser storage unencrypted; the
lock screen can't be dismissed and clears the page behind it; the migration
runs on every open.

### Decisions

**Settled 2026-10-19 by the requester: each as recommended.**

**76K-1 — Key strengthening.**
1. **(Recommended)** Record the setting in each file; new saves use 600,000;
   older files open with the setting they were saved with. *What a filer
   sees:* nothing, except unlocking takes a little longer.
2. Leave it.

**76K-2 — The no-password recovery copy.**
1. **(Recommended)** Clear it once the case is saved to a file, and at
   startup after a clean close. *What a filer sees:* nothing.
2. Leave it (the filer chose no password).

### Checklist (AGENTS.md §8)

| # | Answer |
| --- | --- |
| 1 Data model | The case file's manifest records the strengthening setting (not a filing field; the `.sav` format notes updated). |
| 2 Legacy data | Files without the setting open at 210,000, as today; they are re-saved with the new setting. A file with plain parts in a protected mode is refused with a message (visible). |
| 3 Fixtures | Encrypted test fixtures re-saved if needed. |
| 4 Tests | Unit: plain parts refused, the setting read and written, lock screen ignores Escape (red first). `TEST-INDEX.md` rows. |
| 5 Export/import | `.sav` save/open. |
| 6 Security | Threat model: someone who can edit a saved or emailed file, or read this browser's storage. Protects the file's integrity and keeps names out of plain storage. Does not protect against malware on the guardian's computer or a weak password. |
| 7 UI | None visible. |
| 8 Legal | None. |
| 9 Cross-form | Not form-specific. |

---

## 76L — Pages and smaller fixes

### What a filer sees today

Small frictions: the dashboard's status menu saves (and logs) a change on
every arrow key and loses keyboard focus; correcting a middle digit of a
phone number on the Initial Inventory scrambles it; Escape in a suggestion
list closes the whole dialog and loses what was typed.

### Verified

1. **The dashboard redraws on every status or Judge change.** *Read.*
   `dashboard/index.js` redraws the whole grid; on Windows an arrow key on
   the closed status menu saves a status and writes an audit entry per
   keypress, and focus is lost each time.
2. **Inventory phone, SSN and case boxes reformat on every keystroke.**
   *Read.* `guardian-inventory/form-binding.js`: the cursor jumps to the end,
   so fixing 555 to 556 in (727) 555-1234 gives (727) 551-2346; account and
   check numbers trim a typed space at once.
3. **Escape in a suggestion list closes the dialog.** *Read.*
   `modal-events.js` runs after the combobox's own Escape (Add Form's ward
   names, the convert source picker); a code comment already notes it.
4. **The C-1 yearly-total helper rounds the retired way.** *Confirmed.*
   `entry-helpers.js:42` uses `Math.round(x*100)/100`: 1.005 annually gives
   1.00 where `roundCents()` gives 1.01. A proposal the filer sees in its box.
5. **The Initial Plan's new year clears the ward's residence.** *Reproduced.*
   It clears inception date, Letters date, successor answer, and the ward's
   residence and mailing address (`filing-years.js`). Under the requester's
   rule of 2026-10-17 ("Name, address etc should carry over") these may
   belong carried.
6. **The Simplified Plan keeps last year's attorney signature date.**
   *Reproduced.* Not printed; cleared for consistency.
7. **The data model has drifted from the forms' defaults.** *Reproduced.*
   The Simplified's `remuneration[]` has `initial_item_count` 2, the form
   starts empty; `caseId` and the party ids are saved on every filing with no
   data-model rows; the Simplified Plan's first guardian row lacks
   `signatureState`/`signatureImage`; the Inventory's `preparer.email` and
   `serviceAttorney.signatureDate` are rows with no default.

### Decisions

**Settled 2026-10-19 by the requester: each as recommended.**

**76L-1 — The Initial Plan's new year.**
1. **(Recommended)** Keep the ward's residence and mailing address, inception
   date and Letters date (they describe the ward and the guardianship);
   clear the rest as today. *What a filer sees:* the same rule as the other
   Plans.
2. Leave as is (the Initial Plan is normally filed once).

### Checklist (AGENTS.md §8)

| # | Answer |
| --- | --- |
| 1 Data model | Item 7 corrects the data model (documentation); `verify:data-model` passes. |
| 2 Legacy data | None. |
| 3 Fixtures | The year-rollover golden for 76L-1, with a stated note. |
| 4 Tests | Unit for items 4–6 (red first); browser for items 1–3 (real keys, AGENTS.md §6). `TEST-INDEX.md` rows. |
| 5 Export/import | None. |
| 6 Security | None. |
| 7 UI | The dashboard keeps focus like the circuit select already does. |
| 8 Legal | None. |
| 9 Cross-form | 76L-1 follows the other Plans' rule. |

---

## Appendix A — Every decision, with its recommendation

All settled 2026-10-19 by the requester, each as recommended (76G-1 and
76H-2 accepted by name).

| Decision | Recommended |
| --- | --- |
| 76A-1 How an unlock reloads | No save until the reload finishes; a failed reload leaves the file and says so |
| 76A-2 A second tab | Check the file before writing; a stale tab doesn't write and offers to reload |
| 76B-1 How text is made safe | Keep what's typed; escape where it's shown |
| 76C-1 Large case files | Open up to 500 MB; warn on Save past 40 MB |
| 76D-1 Open Backup | Keep the newer copy, ask when the backup's is older; never change the save target or password |
| 76F-1 New Year from an earlier year | Always build from the latest year |
| 76F-2 Where links live | On the filing; existing files take the latest year's |
| 76G-1 Same-period Starting Balance | The source's own Starting Balance (accept by name, AGENTS.md §5) |
| 76G-2 Inventory → Annual Schedule A | Leave blank |
| 76G-3 Annual → Final | Carry what Start New Year keeps; correct the notice |
| 76G-4 A same-named ward | Ask before linking |
| 76H-1 Missing letters | Embed Latin Extended-A |
| 76H-2 Checklist prefix | Remove from the printed text; keep in the tags |
| 76H-3 Unreadable amounts on the PDF | Print as typed, out of totals, with a note |
| 76H-4 Part IX bond table | The workbook's layout and words |
| 76H-5 Plan for Minors caption | The court's original form |
| 76I-1 Another form's workbook | Refuse, naming the form |
| 76I-2 A B-4 row without a category | Save as Excel can't be overridden |
| 76I-3 Unreadable amounts and Excel | Save as Excel can't be overridden |
| 76I-4 The apostrophe | Quote-prefix style |
| 76K-1 Key strengthening | Record it; 600,000 for new saves |
| 76K-2 No-password recovery copy | Clear after a save and at a clean startup |
| 76L-1 Initial Plan new year | Keep the ward's residence and guardianship dates |

## Appendix B — Checked and found sound

So that the coverage is visible, what the reviewers checked and found
correct:

- **Calculations against the Clerk's templates** (read with a parser): the
  Annual's Line 20 and Line 30, every schedule total and sign, the restricted
  and bond formulas, Schedules E and F; the Inventory's Summary I and II,
  every row product and its bond; the Simplified's Lines 1–8; every workbook
  row map; the 18 B-4 categories against all 50 register pages; ward's %
  stored 0–100 and written as a fraction; `roundCents()` and
  `formatMoney()`; the Line 20/30 comparison as printed. Only the audit-fee
  boundary (76I item 9) and the same-period carry (76G item 1) differ.
- **Workbook structure:** only the two approved formula overwrites remove a
  formula; every total rebuilt after page pruning references only existing
  pages; defined names, print areas, dropdowns, merges and protection
  survive; round trips of negatives, shares, dates and B-4 accounts.
- **Nothing leaves the device:** no fetch, beacon or telemetry carries case
  data; the content-security policy limits connections to the app's origin;
  the service worker caches only the app's own files.
- **Encryption basics:** a fresh random IV per encryption, a random salt per
  case, a non-extractable key cleared on lock; the encrypted manifest holds
  no names; a failed write leaves the original file intact.
- **The testing adapter** can't be enabled from a URL or stored setting.
- **The readiness card agrees with the export checks** in both directions;
  no attorney requirement fires on an unrepresented filing (pro se / Ch.
  393); no tri-state is coerced; every issue route exists; impossible dates
  are rejected and leap years pass.
- **Signature modes, certificates of service, apportionment, signs and
  rounding on the PDFs**; every persisted input reaches its PDF or is left
  out by a recorded decision.
- **Pages:** every `href="#"` action calls `preventDefault()`; 587 unrouted
  answers flipped with no hidden reveal; no two boxes share a path; Add,
  Remove and Duplicate re-render and move links and drafts correctly (apart
  from 76E item 3); late blurs land on the right filing.
- **Filing model:** tri-state handling in conversion; the Starting Balance
  carry into a new period; row removal and guardian links; party merge and
  unmerge; the 2026-10-17 new-year rule; in-place Filing Type change.

## Appendix C — Not part of this milestone

- The pending decision on a UI framework (AGENTS.md §1) is separate and
  unaffected.
- Consolidating every form's "started row" tests onto one rule was discussed
  on 2026-10-18; the accountings' Summary badges were fixed then (87f8a904)
  and nothing further is proposed here.
