# Probate Guardian — Help Guide

Probate Guardian is a browser-based app that prepares Florida guardianship
court filings as court-ready PDFs and, for some filing types, an official
Excel template. It runs entirely on your own computer: your case data lives
in one `.sav` file that you open and save yourself, and nothing is ever
transmitted anywhere. This guide explains every feature, function, and form
in the app.

---

## Table of Contents

1. [Getting Started](#1-getting-started)
2. [The Dashboard](#2-the-dashboard)
3. [Filing Types](#3-filing-types)
4. [Filling Out a Filing](#4-filling-out-a-filing)
5. [Signatures](#5-signatures)
6. [Supporting Documents (Attachments)](#6-supporting-documents-attachments)
7. [Readiness Checks](#7-readiness-checks)
8. [Print Preview, Export &amp; Annotation](#8-print-preview-export--annotation)
9. [Saving, Backups &amp; Auto-Save](#9-saving-backups--auto-save)
10. [New Year &amp; Prior Years](#10-new-year--prior-years)
11. [Converting a Filing](#11-converting-a-filing)
12. [Shared Records (Party Management)](#12-shared-records-party-management)
13. [Themes &amp; Accessibility](#13-themes--accessibility)
14. [Activity Log](#14-activity-log)
15. [In-App Help &amp; Guided Tour](#15-in-app-help--guided-tour)
16. [Data Security &amp; Privacy](#16-data-security--privacy)

---

## 1. Getting Started

### Opening the App

The first time you open Probate Guardian in a browser (or any time no
in-progress case is remembered), you land on a start screen with two choices:

- **Open Case File (.sav)** — resumes a case exactly where you left it.
  In Chrome or Edge, once you've opened a file this way, auto-save re-arms
  automatically for the rest of the session. In Firefox or Safari, the
  browser can only *read* the file — you'll need to save/export it again
  manually before closing the tab, since those browsers don't support
  writing back to a previously opened file.
- **Start a New Case** — begins with no forms and no file open. You'll be
  asked how to protect the data, then where to save it.

If the app remembers a previously opened file but can't reconnect to it
(e.g. you're in a new browser profile), it shows a warning and asks you to
select that file again.

### Choosing How to Protect Your Data

The first time you start a new case, you choose a protection level. **This
choice applies to that case going forward and cannot be changed later
without starting over:**

- **No Password / No Encryption** — the app opens straight to your data
  every time. Case data is stored as plain, readable text in the `.sav`
  file — anyone with access to the file can read it. Faster and simpler,
  but offers none of the protections below.
- **Encrypted &amp; Password Protected** — all case data is encrypted
  (AES-256) and unreadable without your master password, which is required
  every time you open the app. **If the password is lost, the data cannot
  be recovered** unless you've separately exported the data to Excel — there
  is no reset option.

### Unlocking

If a case is encrypted, an **Unlock** screen asks for your master password
before showing any data. Setting a password for the first time asks you to
confirm it.

### Locking

The **Lock** button (in the sidebar's save section) closes the case back to
the unlock/start screen without losing anything you've already saved, so you
can step away from an unattended device.

---

## 2. The Dashboard

The Dashboard ("All Filings") is the home screen, showing every filing in
your case as a compliance overview.

### Summary Strip

Four live counters across all active (non-archived) filings:

- **Action Items / Exceptions** — filings needing correction.
- **Approaching Deadlines** — filings due today or soon.
- **Pending Court Review** — filings marked as submitted and awaiting the
  court.
- **Active Filings** — total count.

### Finding a Filing

- **Search** — by ward name, case number, or contact.
- **Sort** — click a column header to sort the filing list; click again to
  reverse direction.
- **Active vs. Closed** — closed (archived) filings collapse into a
  separate "Closed Filings" section you can expand on demand, so they don't
  clutter the working view.

### Priority Badges

Each row is flagged automatically: **Needs correction** (a court-flagged
disapproval), **Overdue**, **Due today**, **Due soon**, **Pending review**,
or **Approved** — computed from the filing's deadline and workflow status,
not something you set by hand.

### Row Actions

Each filing row offers:

- **Edit** — opens the filing for editing.
- **Backup** — saves a `.sav` backup of just this filing.
- **PDF** — jumps straight to that filing's Print Preview/export screen.
- **New year** — starts the next year's filing from this one (see
  [§10](#10-new-year--prior-years)).
- **Prior years** *(shown once a filing has more than one year of
  history)* — lets you view or delete a past year's version.
- **Mark Closed / Mark Open** — archives the filing (or restores it).
- **Delete** — permanently removes the filing.
- A **workflow status** dropdown, defaulted to "Automatic" (the app infers
  status from your data), which can be manually overridden to reflect
  where the filing actually stands with the court (Draft, Ready to file,
  Pending court review, Needs correction, Approved, Closed).

### Creating &amp; Managing Filings

- **+ New Form** — starts a brand-new, blank filing of any type.
- **New Filing from Existing** — start a new filing and pre-fill it by
  carrying over compatible data from an existing filing for the same ward
  (see [§11](#11-converting-a-filing) for the related Convert feature).
- **Export All Filings** — downloads every filing in the case as one
  combined `.sav` archive, distinct from backing up a single filing.

### Continue Where You Left Off

If the app reopens on a different filing than the one you were last
actively editing, a one-time banner offers a shortcut back to that filing.

---

## 3. Filing Types

Probate Guardian supports nine Florida guardianship filing types, grouped
into two families that serve different purposes:

> **Plan vs. Accounting:** A **Plan** reports on the ward as a *person* —
> where they live, the care they receive, their well-being. An
> **Accounting** reports on their *money and property*. These are always
> two separate court filings. If you're guardian of both the person and the
> property, create one of each and give them the same case number — the
> Dashboard groups them together automatically.

### Inventory

**Initial Inventory** *(Verified Initial Inventory)* — filed at the start of
a guardianship, listing all of the ward's assets and liabilities as of the
Guardianship Inception Date. Sections: Cover/Required Info; Schedule A-1/A-2
(real property assets/debts); Schedule B-1–B-4 (cash &amp; financial
accounts, personal property, intangible property, personal-property debts);
Schedule C-1–C-5 (periodic income, lawsuits by/against the ward, trusts,
joint/other property); D-1–D-5 (Guardian Attestation, Preparer &amp; Attorney,
Audit Fee &amp; Safe Deposit Box, Bond &amp; Surety, Certificate of Service).
The Summary computes net Real Estate and Personal Property totals and an
automatic **bond requirement**/**audit fee** (the audit fee triggers once the
inventory exceeds $25,000). Supports PDF and Excel export.

### Accounting Filings

**Simplified Annual Accounting** — available only when *all* estate
property is held in a single designated depository and the only
transactions are interest, settlement deposits, and service charges. Far
simpler than the full accounting. Sections: Cover/Part I; Part II Accounting
Summary (Starting Balance carried from the prior report, Interest Income,
Settlement Deposits, Total Income, Service Charges, Federal Income Tax,
Total Disbursements, Remaining Assets on Hand); Guardian Declaration &amp;
Information; Attorney Signature; Certificate of Service; Remuneration.
Supports PDF and Excel export.

**Annual / Final / Trust Accounting** — one form (`annual-accounting`) that
produces three closely related filings, selected by a "Filing Type" field:
**Annual Accounting** (the standard yearly accounting), **Final Accounting**
(closing accounting when a guardianship ends), and **Trust Accounting**.
Sections: Cover &amp; Part I; Part II Accounting (Schedule A Income, Schedule
B1–B4 Disbursements, Schedule C Gains/Losses, Schedule D1–D5 Assets &amp;
Liabilities, Schedule E Transfers, Schedule F1–F2 Sales); Part III
Guardians, Part IV Preparer, Part V Attorney; Parts VI &amp; VII (Changes in
Net Assets, Assets &amp; Liabilities at period end — cross-checked against
Schedule D); Part VIII Trusts; Part IX Bond; Part X Certificate of Service;
Part XI Remuneration. Starting Balance is carried forward from the prior
year's ending total. Supports PDF and Excel export.

### Plan Filings (PDF only — no Excel version)

**Initial Guardianship Plan** — the first person-side filing, due within
**60 days** of the Letters of Guardianship (F.S. 744.362(1)). Covers the
ward's residential setting, medical/mental-health/personal-care services,
socialization, examining providers, 15 activities-of-daily-living ratings
(the baseline future Annual Plans are compared against), disabilities and
devices, and advance directives (confirm none exist, describing how you
verified that, or record each one, including court suspension/revocation
status). **Filings in Pinellas or Pasco County** see an additional local
reminder: the Sixth Judicial Circuit requires a separate **Disaster Plan**
filed alongside every initial plan (exempt if the ward is a minor living
with a parent/relative guardian) — the app does not produce that document.

**Annual Guardianship Plan** — the yearly update, due within 90 days after
the anniversary month of the Letters of Guardianship (F.S. 744.367). Only
half of the full Annual Report of the Guardian of the Person — a separate
physician's report (obtained independently, not produced by this app) is
required alongside it. Covers where the ward lived in the past 12 months and
why, residence and care, insurance/benefits, medical treatment, skills and
rights, 16 activities-of-daily-living ratings, disabilities and devices,
advance directives, and remuneration received. Question 6 (rights capable of
restoration) does not itself restore anything — a separate court petition is
required if you and the physician agree a right should be restored.

**Annual Plan — Minors** — the Annual Plan variant for a minor ward. No
rights-restoration table and no activities-of-daily-living ratings; instead
it focuses on present and prior (past-12-month) residences, treatment
providers, medical/dental services, and — uniquely — **education and social
development**. Uniquely among the Plans, it has a separate **Preparer
certification** block in addition to guardian and attorney certifications.

**Simplified Annual Plan** — a condensed annual plan structured as nine
direct questions (the progress indicator literally counts "X of 9 questions
answered") covering residence, medical/mental-health treatment, diagnosis,
social activities, interactions with others, rights restoration, advance
directives, and remuneration. Answer plainly and specifically — "Saw Dr.
Alvarez for a check-up in March and a follow-up in September" serves the
court far better than "routine care."

---

## 4. Filling Out a Filing

- **Sidebar navigation** — each filing's sections/schedules are listed in
  the sidebar; click any to jump directly to it.
- **Filing progress bar** — tracks how much of the current filing is
  complete, with a **"Jump to…"** link straight to the next incomplete
  section.
- **Completion indicators** — a green checkmark next to a section means all
  required fields are filled; a red warning means you started but didn't
  finish it.
- **Tri-state Yes/No fields** — binary questions are never silently
  defaulted; a field stays visibly unanswered until you explicitly choose
  Yes or No.
- **Conditional fields** — many Yes/No or "Other" answers reveal an
  additional explanation field only when relevant (e.g. choosing "Other" for
  a residential setting, or answering "No" to a committee-incorporation
  question) — collapsing unneeded fields out of the form rather than showing
  everything at once.
- **Non-destructive toggling** — unchecking a section (e.g. turning off
  "advance directives executed") never deletes what you'd already entered
  there; re-checking it restores your data.
- **County** — entered via a filtered autocomplete field rather than free
  text, so it matches the county's actual name consistently across the
  filing (and any local guidance that depends on it).

---

## 5. Signatures

Every signature block offers three states, chosen with a radio control:

- **Unsigned** — no signature captured yet.
- **"/s/" Signed** — the standard legal notation for an electronically
  signed document; no image is captured.
- **Signature Stamp** — an actual signature image, captured one of three
  ways:
  - **Draw** — sign with mouse, stylus, or touch on a canvas.
  - **Type** — type your name in a script-style rendered signature.
  - **Upload** — upload a photo or scan of a signature; the background is
    automatically stripped for a clean overlay.
- **Reusable stamps** — once you've captured a signature stamp for a
  person, the app can reuse that same image on their other signature blocks
  across filings, so you don't need to re-draw or re-upload it every time
  (applying a saved stamp copies the image — it doesn't create a shared live
  reference, so later editing one filing's copy never changes another's).

---

## 6. Supporting Documents (Attachments)

Certain schedules let you upload supporting PDF documents (for example,
bank statements backing up an account balance). These:

- Are inserted into the exported PDF packet alongside the generated pages.
- Are limited per file and, in total, by both file size and page count —
  the app blocks export if either limit is exceeded and tells you which.
- Carry an accessibility caveat: **uploaded PDFs are inserted as-is and may
  not be ADA/accessibility compliant** — the app warns you to review them
  before filing, since it can't fix an uploaded file's own structure.

---

## 7. Readiness Checks

Before you export or print, a **Readiness** panel (titled "Filing
Readiness," or "Clerk's Review Readiness" for Pinellas/Pasco filings, where
extra local guidance also applies) summarizes whether the filing is ready to
go:

- **Automatic items** — machine-checkable blockers (a missing required
  field, dates out of order, an incomplete grid). These are driven by the
  exact same validation that would block export, so the readiness panel
  can never disagree with what actually stops you from exporting.
- **Manual items** — plain-English reminders for things the app cannot
  verify itself, like physically attaching a report or serving copies on
  interested parties. These never block export — they're your own
  checklist.
- Each item can **jump-link** you straight to the page/field it concerns.
- The panel's expanded/collapsed state is remembered per filing and resets
  when you switch to a different one.

If an issue is a soft warning rather than a hard blocker, you can
acknowledge it and export anyway — the resulting document generates
faithfully, with no draft watermark or degraded formatting, and the warning
stays visible in the app afterward. Genuine data-integrity problems or
generation failures can't be overridden this way.

---

## 8. Print Preview, Export &amp; Annotation

Print Preview renders the exact PDF your filing would produce, with a real,
selectable, screen-reader-exposed text layer over the visual render (not
just a picture of the page).

### Exporting

- **Save as PDF** — the primary court-filing output.
- **Save as Excel** — available for Inventory and Accounting-family filings
  only (Plan filings are PDF-only); fills in the clerk's official Excel
  template where one is provided.
- **Print** — opens the generated PDF for your browser/OS print dialog.

### Annotating a Preview

An **Annotate PDF** toggle in the preview toolbar reveals lightweight
markup tools:

- **Add Note** — place editable text notes directly on the rendered page.
- **Highlight** — highlight passages.
- **Undo** — step back through annotation edits.
- **Clear Annotations** — remove all annotations from the preview (asks
  for confirmation first).
- **Save Annotated PDF** — downloads the annotated version and remembers
  it with the filing. The app also fingerprints the underlying filing data
  at the moment you save, so if you later change form answers and the
  content no longer matches what you annotated, that drift is detectable.

Annotations are additive marks layered on top of the rendered page — they
never feed back into or change your actual form data.

---

## 9. Saving, Backups &amp; Auto-Save

- **Continuous local save** — your work saves to this device automatically
  as you type; the sidebar shows the live save status.
- **Auto-Save interval** — choose how often the app tries to save a backup
  automatically once a backup file is already open: every 5, 10, or 30
  minutes, or Off.
- **Save Backup (.sav)** — manually download an encrypted (or plain, per
  your chosen protection level) backup of the whole case. Store this file
  somewhere safe — it's your safeguard if this device is lost or damaged.
- **Open Backup (.sav)** — restore from a previously saved backup file.
- **Unsaved-changes reminder** — a toast appears when you have changes
  since your last saved backup, offering **Save Backup Now** or
  **Remind Me Later**.
- **Save error banner** — if a save genuinely fails (e.g. storage or
  connection trouble), a banner tells you so you're never left assuming
  work was saved when it wasn't.
- **Clear All Data** — wipes everything from this device (a deliberate,
  separate action from Lock — Lock keeps your data, this removes it).

---

## 10. New Year &amp; Prior Years

Guardianship filings recur annually. Rather than re-entering everything:

- **New year** carries a filing forward: for the Initial Inventory, the new
  year opens with a copy of the current schedules so you edit down what's
  changed instead of retyping it; for Accounting filings, the new year opens
  with the **Starting Balance pre-filled from the prior year's ending
  total**. Either way, signatures and dates are cleared so the new filing
  starts unsigned.
- **Prior years** lists every past year saved for a filing. From here you
  can:
  - **Edit this year** — reopen a past year's version for editing.
  - **Delete** — permanently remove a specific past year (and any supporting
    documents/comments filed under it). This cannot be undone.

---

## 11. Converting a Filing

**New Filing from Existing** / the Convert action lets you turn an existing
filing into a related filing type for the same ward, carrying over the
compatible data instead of starting from a blank form — for example,
turning an Initial Inventory into an Annual Accounting, or a Guardian
Inventory into a Plan. Only sensible target types are offered for a given
source type (some filing types can't be converted to another at all), and a
preview explains exactly what will and won't carry over before you confirm.

---

## 12. Shared Records (Party Management)

People and entities (the ward, guardians, attorneys, preparers) are shared
"Party" records that can be referenced by multiple filings, rather than
retyped for each one. The **Manage shared records** panel (linked from the
Help panel) offers:

- **Duplicate detection** — automatically surfaces likely-duplicate party
  pairs (same name and contact info, or same name only), so you can
  **Keep This One** (merge the two, updating every filing that referenced
  the discarded record to point at the kept one, and offering to backfill
  any currently-blank fields on the kept record from the discarded one) or
  mark the pair **Not the Same Person** to dismiss the suggestion. Merging
  cannot be undone from within the app.
- **Directory** — a searchable list of every shared record, showing how
  many filings reference each one.

---

## 13. Themes &amp; Accessibility

- **Light &amp; dark mode** — toggle with the sun/moon button in the top
  toolbar; your choice is remembered per device and applied before the page
  even paints, so there's no flash of the wrong theme on load.
- **Accessibility** — native interactive controls throughout (not
  clickable `div`s), visible focus outlines, accessible names on icon-only
  buttons, a "Skip to filing content" link, and a fully tagged, selectable
  PDF text layer in Print Preview. The app maintains WCAG 2.1 AA-oriented
  test coverage across its generated PDFs.

---

## 14. Activity Log

Every unlock and backup made on this device is recorded in the **Activity
Log** (linked from the Help panel), which supports:

- **Search** — free-text search across event details.
- **Filters** — by result (success/failure) and event type.
- **Save as text file** — export the full log (including anything hidden
  by the on-screen display cap) for your own records — useful for
  confirming a backup actually ran.

---

## 15. In-App Help &amp; Guided Tour

- **Help panel** — click the **?** button anywhere in the app for
  context-sensitive guidance about whatever page you're currently on
  (updates automatically as you navigate, including county-specific notes
  where relevant).
- **Start guided tour** — an interactive, step-by-step walkthrough tailored
  to the filing type you currently have open, highlighting the relevant
  sidebar sections and controls one at a time with a progress indicator.
- **Download PDF guide** — exports the help content as a standalone PDF you
  can read outside the app.

---

## 16. Data Security &amp; Privacy

- **Nothing leaves your device.** Probate Guardian is a client-side app —
  there is no server component and no network transmission of your case
  data.
- **You control the file.** Your entire case lives in one `.sav` file you
  choose the location of; there is no hidden copy stored anywhere else by
  the app itself (browsers may cache locally, per normal browser behavior).
- **Encryption is optional but irreversible as a choice.** If you choose
  password protection, it applies to that case going forward and can't be
  turned off later without starting a new case. A lost password means lost
  access to that `.sav` file — there is no recovery mechanism.
- **Sensitive fields are masked.** Social Security Numbers, EINs, and TINs
  are masked to their last four digits everywhere the document is printed,
  saved for preview, or exported, reducing exposure of the full number.
