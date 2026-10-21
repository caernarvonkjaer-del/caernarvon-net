# Milestone 77 Proposal — What a guardian's first real use found

## Status

**Draft (2026-10-20).** 77E approved to build (the requester, 2026-10-20:
"Yes, the /s/ Name is supposed to be allowed for all filers … Let's just put
it back in. If someone doesn't like it they can let us know.") -- built
2026-10-20, its three decisions settled. 77A, 77B, 77C, 77D and 77F approved
to build (the requester, 2026-10-20: "Do the other 5 parts now"), every
remaining decision settled as recommended ("Take all six"), built in the
order 77A, 77C, 77D, 77F, 77B -- each delivery's build record says when it
landed.

## Where these came from

A professional guardian tested the app and wrote to the requester on
2026-10-20, with four attachments: three screenshots (Preview & Export with
Print refused, a drawn signature on the PDF, the Certificate of Service
items flagged) and a sample Initial Inventory PDF made from fictional test
data. She had also used the app's Excel download for a real report due that
week. The requester confirmed (2026-10-20) that guardians may use the test
system for real filings, and AGENTS.md §8 item 2 now requires full backward
compatibility (`9d5a6a68`).

The requester answered each of her points on 2026-10-20, as choices:

| Her point | The requester's answer | Here |
| --- | --- | --- |
| Print, PDF and Excel refused while fields are missing | The override exists but can't be found: make it easy to find, and say plainly a draft can have blanks | 77A |
| Saving the case for later reports | Already built; make it more visible | 77B |
| Sending a report to the attorney from the e-portal button | Declined: it would need a server holding case data | — |
| A typed signature instead of a mouse-drawn one | Allow it: guardians get the same "/s/ Name" attorneys have (reverses 73A) | 77E |
| Saving without the Certificate of Service date | Stop flagging a blank service date; after the screenshots, a blank attorney Filing Date too. The attorney's signature date stays required when "/s/" is chosen | 77C |
| Getting a bond before filing | Clerk practice: the initial reports may be filed before the bond is issued; add a line saying so | 77F |
| A default bond of $18,000 | Clerk practice: no guardianship minimum (the $18,000 rule is for estate administration); declined | — |

Her screenshots also showed a defect she didn't name: a drawn signature
prints small and over its own heading (77D).

The two declined points need no work. The $18,000 answer is recorded as
Pinellas Clerk practice (AGENTS.md §5): the bond figure stays the one the
Clerk's Inventory workbook computes (`PART V` rows 18–23: unrestricted cash,
plus Schedule B-2, plus unrestricted intangibles, with no minimum;
`src/features/guardian-inventory/totals.js:149`).

### How each finding was checked

Three read-only reviewers mapped the export override, the certificate and
filing dates, and the signature, carry-over and bond code on all nine forms.
The author re-read the lines each delivery rests on (cited below) and
rendered the tester's PDFs page by page with the vendored pdf.js.

### Recommended order

77A first: until it is built, the Continue button is how a guardian produces
a draft with blank dates, so 77C's interim advice depends on it. The others
are independent of each other.

---

## 77A — A draft can be made, and the app says how

### What a filer sees today

On Preview & Export, with something still missing (the tester's screenshots):

- the line under the buttons says "Save as PDF and Save as Excel: 3
  requirements outstanding — see the list on this page, or choose “Continue
  despite outstanding requirements”" -- and there is no such button there;
- a red box says "3 required fields still missing … These must be completed
  before this ward can be exported" -- which is not so: they can be
  overridden;
- Print says "Cannot print: 3 required items still missing. Open Print
  Preview to see what they are." with only OK -- on Print Preview itself;
- Save as PDF and Save as Excel refuse with "Cannot export — … or choose
  “Continue despite outstanding requirements” to export anyway." in a box
  whose only button is OK.

The one Continue button is at the bottom of the page, in a "Preview
blocked" box under the Filing Readiness checklist. A guardian who doesn't
scroll there concludes she can't produce a draft for the attorney's audit.

### Verified

1. **The red box's wording** is `validationPanel()`'s default subtitle
   (`src/core/validation/validation-panel.js:41`); all seven preview pages
   call it with no subtitle. *Confirmed.*
2. **The Continue button** is drawn only by `blockedPanelHTML()`
   (`src/core/pdf/pdf-preview.js:339-366`, the button at `:357`) into
   `#print-doc-container`, which every preview page places after the
   validation panel, readiness card and advisories (the Inventory's order at
   `src/features/guardian-inventory/print.js:66-86`). *Confirmed.* The one
   other Continue is Save as Excel's, added to the reason line only when
   something that stops just the PDF is in the way (`pdf-preview.js:511-527`).
3. **Print refuses with no way on** (`printGeneratedPdf()`,
   `pdf-preview.js:563-587`, the text at `:570`). *Confirmed.*
4. **The Save refusals name the button** (`outputRefusal()`,
   `src/core/filing/output-reasons.js:72-78`) **in an OK-only alert**, after
   redrawing the page (every form's `doSavePdf()`, and the three workbooks'
   Save as Excel). *Confirmed.*
5. **Continue lasts for the visit**: it is held in memory for the open
   filing's current revision; an edit, a redraw of Preview & Export, or
   leaving the page clears it (`src/core/filing/output-revision.js`;
   `beginFreshPreview()`, called by every preview page). Once given, it lets
   Print, Save as PDF and Save as Excel through. *Confirmed.*

### Earlier work this touches

- 38D/44B (each output's own authorization); 73M/74C (the export buttons
  stay clickable and the reason line says what stops each one); 73F part 3
  (a Continue that cannot work is not offered -- an impossible date, a data
  conflict and the workbook's own limits stay unoverridable); 76J item 1
  (Save as Excel's own Continue).
- AGENTS.md §4, "Bypassable output acknowledgement": the output after
  Continue is faithful, with no watermark. Unchanged.

### Proposed

1. **Continue where the filer is** (decision 77A-1): beside the reason line
   under the export buttons, and in the refusal itself -- Print, Save as PDF
   and Save as Excel ask "Requirements remain outstanding. Continue anyway?"
   with Continue and Cancel, instead of an OK-only alert. The "Preview
   blocked" box keeps its button. Only bypassable issues are offered it, as
   today.
2. **The red box says what is true**: "3 required fields still missing,
   across 2 sections, listed below. Complete them, or choose Continue
   despite outstanding requirements to produce a draft with them blank."
   When one of them can't be overridden, it says that instead.
3. **The user guide** (`help/index.html`, the Preview & Export section and
   its Print entry) says a draft for the attorney can be made with blanks,
   and where Continue is.
4. Unchanged: what is required, what can't be overridden, the confirmation
   step, and that Continue lasts for the visit.

### Decisions

**77A-1 — Where Continue is offered.**
1. **(Recommended)** **Beside the reason line, and in each refusal.** *What a
   filer sees:* the choice wherever she runs into the refusal, and still
   one confirmation before anything is produced.
2. **Beside the reason line only.** The refusals still end in OK.
3. **In each refusal only.** Nothing on the page itself until she tries.

**Settled 2026-10-20 by the requester: option 1** ("Take all six", with 77A, 77B, 77C, 77D and 77F approved to build).

### Checklist (AGENTS.md §8)

| # | Answer |
| --- | --- |
| 1 Data model | None. |
| 2 Legacy data | None: nothing stored changes. |
| 3 Fixtures | None. `exportOutput()` and `clickExport()` (`tests/e2e/support/target.ts:682-756`) read the refusal and the override; they change with the dialog, and `gate: 'acknowledgement-required'` stays the explicit opt-in (AGENTS.md §7). |
| 4 Tests | Updated: `output-reasons.spec.js`, `pdf-preview-print.spec.js`, `output-buttons-after-override.spec.ts`, `preview-print-button.spec.ts`, `section-marks-follow-export.spec.ts`, `export-helper.contract.spec.ts`, `persistence-recovery.contract.spec.ts`, `form-entry.contract.spec.ts`. New browser spec on all seven preview pages, by real clicks (AGENTS.md §6): Continue from the reason line and from each refusal, Cancel producing nothing, an unoverridable issue offering none. Red first. `TEST-INDEX.md` rows. |
| 5 Export/import | The outputs are unchanged; only how the filer reaches them. |
| 6 Security | None. |
| 7 UI | The existing confirm dialog and reason line; the "Preview blocked" box unchanged. |
| 8 Legal | None: what is required to file is unchanged. |
| 9 Cross-form | All seven preview pages share the panel, the reason line and the refusals; one change covers the nine forms. |

### Build record — BUILT 2026-10-20

Approved by name (Status), decision 77A-1 option 1. What a filer now sees:

- **The reason line carries its Continue**: "Save as PDF and Save as Excel:
  3 requirements outstanding — see the list on this page, or continue with
  them blank." followed by a **Continue despite outstanding requirements**
  button. Only a reason Continue can answer carries one; beside a PDF
  blocked for good, Save as Excel's own reason keeps its Continue (76J).
- **Print, Save as PDF and Save as Excel ask** when Continue can answer:
  "Cannot export yet — 3 required fields missing, listed on this page.
  Choose “Continue despite outstanding requirements” to save the PDF anyway,
  with them blank, or Cancel to complete them first." (and "to save the Excel
  workbook", "Cannot print yet … to print"), with Continue and Cancel.
  Continue produces the output and the page says Continue was given, as the
  Preview's own button does. What can't be overridden still says why, with
  only OK (Print's: "Cannot print — … they can't be overridden.").
- **The red box** says "Across 5 sections, listed below. Complete them, or
  choose “Continue despite outstanding requirements” to produce a draft with
  them blank." -- or, when one can't be overridden, "At least one of them
  can't be overridden: correct it to continue."
- The "Preview blocked" box keeps its button; Continue still lasts for the
  visit; the user guide says a draft for the attorney can be made with
  blanks, and how.

Code: `src/core/filing/output-continue.js` (new: `refuseOrContinue()`,
`continueDespiteOutstanding()`, `onOutputAcknowledged()`),
`output-reasons.js`, `validation-panel.js`, `pdf-preview.js` (one Continue
for the Preview's button and the reason line's; Print asks), the seven
`print.js` (Save as PDF; the red box's flag), the three workbooks'
`excel.js` (Save as Excel), `help/index.html`.

Tests: `tests/unit/output-reasons.spec.js` and `pdf-preview-print.spec.js`
(red first: 8 fail at HEAD); `tests/e2e/continue-77a.spec.ts` (new, real
clicks on all seven preview pages; red first: its four fail at HEAD -- the
red box said "These must be completed …", the refusals offered neither Cancel
nor Continue); updated: `output-buttons-after-override.spec.ts`,
`preview-print-button.spec.ts`, `export-helper.contract.spec.ts`, and
`tests/e2e/support/target.ts` (`clickExport()` cancels a refusal that asks,
never continuing; `exportOutput()` is still the explicit opt-in).
Browser (C: copy, chromium): those, `excel-continue-pdf-only`,
`section-marks-follow-export`, `persistence-recovery.contract` and
`form-entry.contract` (an impossible date still refuses with OK), 49 in all.

---

## 77B — Next year's report, from this one

### What a filer sees today

The tester wasn't sure the case was meant to carry into later reports ("I
am not 100% sure if that is the final intent based on the demo"). It is:
the case file holds every filing, each row's "New year" starts the next
year's report from it, and "New Filing from Existing" starts another form
(an Annual Accounting from the Inventory, with its closing figures). Nothing
says so until a filer finds the buttons.

### Verified

1. **The start screen** speaks of the case file only (`index.html:196-228`).
   **The dashboard** has the buttons -- "Save case file as…", "New Form",
   "New Filing from Existing" (`src/features/dashboard/index.js:103-117`),
   each row's "New year" (`:274`) -- and no word on carrying a case forward.
   *Confirmed.*
2. **The dashboard tour** (`src/core/help/walkthrough.js:93-100`, started
   only from Help) mentions saving and opening the case file, not New year or
   New Filing from Existing. *Confirmed.*
3. **The user guide** covers them (`help/index.html:247`; the `#year`
   section, `:787-792`).

### Earlier work this touches

74J-3 (the Annual Plan as the Initial Plan's next filing), 76G (what a
conversion carries), 76L-1 (what the Initial Plan's new year keeps). Not
touched: `walkthroughCompleted`, which nothing sets (`walkthrough.js:108`) --
noted, not in scope.

### Proposed

1. **A short line on the dashboard** (decision 77B-1), under its buttons
   while the case has a filing: "Next year: use New year on a filing's row --
   it starts from this year's figures. Another form for the same ward: New
   Filing from Existing." with a link to the guide's section.
2. **The dashboard tour** gains a step each for New year and New Filing from
   Existing.

### Decisions

**77B-1 — Where carry-over is explained.**
1. **(Recommended)** **A line on the dashboard, and the tour.** *What a
   filer sees:* the explanation where the buttons are, every visit, in one
   line.
2. **The tour and the guide only.** Seen only by a filer who opens Help.
3. **Once, after the first save** ("Your case is saved; next year…"), then
   not again.

**Settled 2026-10-20 by the requester: option 1** ("Take all six", with 77A, 77B, 77C, 77D and 77F approved to build).

### Checklist (AGENTS.md §8)

| # | Answer |
| --- | --- |
| 1 Data model | None. |
| 2 Legacy data | None. |
| 3 Fixtures | None. |
| 4 Tests | Browser: the line shows with a filing and not on an empty dashboard; its link opens the guide's section; the tour's new steps point at the buttons. `TEST-INDEX.md` rows. A dashboard snapshot that includes the header is regenerated with a stated note. |
| 5 Export/import | None. |
| 6 Security | None. |
| 7 UI | The dashboard's existing help-text style (`form-text`). |
| 8 Legal | None. |

---

## 77C — Dates left for whoever serves and files

### What a filer sees today

A guardian signs the report and sends it to her attorney for audit; it is
served and filed days or weeks later. The Initial Inventory, the Annual,
Final and Trust Accountings and the Simplified Accounting flag a blank
Certificate of Service date as a required field, and the Inventory flags a
blank attorney Filing Date -- dates she can't know when she drafts. The
tester's screenshot lists three: "Service Date", "Attorney — Filing Date"
and "Attorney — date signed is required to apply "/s/" Signed".

### Verified

1. **The service dates are required on three forms, unconditionally**: the
   Inventory's `serviceDate` (`src/core/validation/engines/guardian.js:217`),
   the Annual family's `certDate` (`engines/annual.js:174`, with an "on or
   after Period To" check at `:179-182`) and the Simplified's
   `certServiceDate` (`engines/simplified.js:128`, the same check at
   `:129-132`). *Confirmed.* Each fails the readiness card's "Bond and
   certificate-of-service information is complete" row
   (`src/core/filing/readiness-config.js:405,413,436`), and each field
   carries the required star.
2. **The four Plans already allow it**: their Date of Service is optional,
   with "Date of Service is blank. The plan can be filed without it."
   (`src/core/filing/plan-certificate-of-service.js:152`; 68C). *Confirmed.*
3. **The Inventory's attorney Filing Date** is required once an attorney is
   entered (`guardian.js:153`); the data model calls it optional
   (`probate-guardian-data-model.csv:365`) -- the code and the model
   disagree today. No other form has one. *Confirmed.*
4. **A blank date already prints and exports cleanly**: the PDFs read "on
   this date, the date indicated below" (Inventory, `pdf-model.js:858`) or
   "on this date: the date indicated below" (Annual `pdf-model.js:1220`,
   Simplified `:340`); the Filing Date prints a blank line (73H-2); the
   workbooks write an empty input cell (Inventory `PART IV`!C21 and
   `PART VI`!G25, Annual `PART X`!G23, Simplified `PARTS V, VI `!H39), and no
   formula refers to any of them (read from the templates).
5. **The attorney's "/s/" date** is required only because "/s/" Signed is
   chosen (`signature-state.js:77`); leaving the attorney Unsigned removes
   it. Unchanged here, by the requester's answer.

### Earlier work this touches

- **Reverses a recorded decision**: "D-5 "Service Date" is a hard export
  blocker. … RESOLVED — keep required/blocking. Treated as data entry
  (recording a known fact — the date service occurred)" (2026-09-13,
  Archive:16991). The requester's answer of 2026-10-20 reverses it, for the
  reason the tester gives: when the guardian drafts, service hasn't happened.
- 68C (the Plans' optional date, the pattern followed); 71B (attorney
  checks only once an attorney is entered -- kept); 76J item 6 (the "on or
  after Period To" check is the app's own consistency rule -- kept for a date
  that is entered).

### Proposed

1. **No longer flagged when blank**: the Inventory's Service Date and
   attorney Filing Date, the Annual family's Certificate of Service Date and
   the Simplified's Date of Service. Their stars go; a date that is entered
   is still checked (a real date, and on or after Period To where that check
   applies).
2. **A reminder, as the Plans have** (decision 77C-1): "Date of Service is
   blank. The report can be filed without it; fill it in when it is served."
   on the page and on Preview & Export, never a block.
3. **The data model**: `serviceDate`, `certDate` and `certServiceDate`
   become optional; `attorney.filingDate` already is, and the code now
   agrees.

### Decisions

**77C-1 — A reminder when the date is blank.**
1. **(Recommended)** **A reminder, never a block**, worded as the Plans'.
   *What a filer sees:* a note that the date is open, so it isn't forgotten
   at filing, and no Continue needed for it.
2. **Nothing.** The blank date is simply allowed.

**Settled 2026-10-20 by the requester: option 1** ("Take all six", with 77A, 77B, 77C, 77D and 77F approved to build).

### Checklist (AGENTS.md §8)

| # | Answer |
| --- | --- |
| 1 Data model | Three rows from required to optional (`:103`, `:184`, `:367`); `verify:data-model`. |
| 2 Legacy data | None: a rule is relaxed; nothing stored changes, and every saved file opens as before. |
| 3 Fixtures | `MINIMAL_VALID_GUARDIAN`, `_ANNUAL` and `_SIMPLIFIED` keep their dates (a complete filing still has them); `fixture-contract.spec.js` is unaffected. The completion and validator goldens, where they record these issues, are regenerated with a stated note. |
| 4 Tests | New unit spec: each form's blank date passes export, an entered one is still checked, and the reminder appears (red first). Updated: `navigation-status.contract.spec.ts` (`:421`, `:485`, `:670` look these issues up), `asterisks-follow-rules.spec.ts` (the stars). `TEST-INDEX.md` rows. |
| 5 Export/import | The PDF and workbook already handle a blank date (Verified 4); a workbook with blank cells imports as today. |
| 6 Security | None. |
| 7 UI | The Plans' certificate reminder. |
| 8 Legal | The certificate of service and its date remain the filer's to complete before filing (§744.362(1) for the Inventory; the accountings' own certificates); the app stops checking that the date is filled in while the report is a draft. Whether a certificate filed undated is acceptable is not something this app decides. |
| 9 Cross-form | The Inventory and the three accountings are brought to the Plans' rule; the Plans are unchanged. |

### Build record — BUILT 2026-10-20

Approved by name (Status), decision 77C-1 option 1. What a filer now sees:

- **A blank date of service is not listed** on the Initial Inventory (D-5
  Service Date), the Annual, Final and Trust Accountings (Part X Certificate
  of Service Date) or the Simplified (Part VI Date of Service), nor a blank
  attorney Filing Date on the Inventory; their stars are gone, and each date
  box says "Leave blank until the copies are served; the PDF then reads “the
  date indicated below”." A date that is entered is still checked -- a real
  date, and on or after Period To on the Annual family and the Simplified.
  The attorney's "/s/" date stays required with "/s/".
- **A reminder** on Preview & Export, in the "Review recommended before
  filing" box, while the date is blank and someone is to be served: "Part X
  — Date of Service is blank. The report can be filed without it; fill it in
  when it is served." Never a block.
- The data model: `serviceDate`, `certDate` and `certServiceDate` optional;
  `attorney.filingDate` already was, and the code now agrees. The user
  guide's certificate entries say the date may be left blank.

Code: `engines/guardian.js`, `engines/annual.js`, `engines/simplified.js`,
`service-method.js` (`serviceDateAdvisories()`), `output-preflight.js`, the
Inventory's, the Annual's and the Simplified's `index.js` (stars, hints, the
Inventory's live attorney markers), `help/index.html`, the data model.

Tests: `tests/unit/certificate-dates-77c.spec.js` (new, 8; red first -- 6 fail
with the engines, `service-method.js` and `output-preflight.js` at HEAD, the
two date-order cases passing on both); `navigation-status.contract.spec.ts`
updated (its D-2 link now the attorney's signature date; the Simplified's
Part VI path proved by a date before Period To); the completion golden
regenerated (13 of 4,936 outcomes: a page whose only gap was one of these
dates is now complete) and the validator golden (751 of 4,936, each losing
one of the six retired messages, nothing gained), both diffed outcome by
outcome. Unit: the whole suite on the C: copy, the timeouts under load
passing alone; `verify:data-model`. Browser (C: copy, chromium): every spec
naming these dates, the asterisk rule and the readiness card.

---

## 77D — A drawn signature prints at its size, on its line

### What a filer sees today

A signature drawn with a mouse or finger, or uploaded, prints small and
over its own heading: in the tester's screenshot, and on the sample
Inventory's Guardian #1 and Preparer blocks, the mark runs into "Guardian
#1" / "Preparer" above it.

### Verified

1. **It is drawn over the heading**: the heading's baseline is 12 points
   down the block, the image's top 6 points (`renderSignatureImage(…, { y:
   curY + 6, maxHeight: 28, maxWidth: 246 })`, `src/core/pdf/pdf-engine.js:1910`;
   the heading at `:1881`, the line at `:1903`), anchored at its top-left
   (`:715-733`). *Confirmed.*
2. **It is never trimmed**: the drawing box is 600 × 180 pixels
   (`src/core/signature/signature-pad.js:136-165`) and is saved whole, empty
   space and all; nothing crops it. Fitted to 28 points high, the whole box
   prints about 93 points (1.3 in) wide, and the ink is a fraction of that.
   *Confirmed* (no crop in `signature-pad.js`; the tester's PDF).
3. **No test pins the stamp's geometry** (only that an image is drawn,
   `tests/e2e/signature-capture.contract.spec.ts:129-150`).

### Earlier work this touches

39-B (the stamp, its 1024-pixel width cap and 100 KB limit); 73A (a guardian
signs by hand or with a stamp -- 77E changes that, not this).

### Proposed

1. **Trimmed to its ink**: a drawn or uploaded signature is cropped to the
   marks, with a small margin, when it is applied (decision 77D-2 for those
   already saved).
2. **Placed below the heading, sitting on the line**, up to about half an
   inch tall (decision 77D-1); a stamped block grows by what it needs, so
   nothing below it moves into it. "/s/" and blank blocks are unchanged.

### Decisions

**77D-1 — How tall a signature prints.**
1. **(Recommended)** **Up to about half an inch (36 points)**, the block
   growing 8 points for a stamp. *What a filer sees:* a signature the size
   of one written on the line.
2. **The same 28 points**, placed below the heading. Fixes the overlap; with
   trimming, already much larger than today.

**Settled 2026-10-20 by the requester: option 1** ("Take all six", with 77A, 77B, 77C, 77D and 77F approved to build).

**77D-2 — Signatures already saved.**
1. **(Recommended)** **Trimmed when the filing is opened**, once: only empty
   margin is removed, the mark itself is untouched, and the Activity Log
   says so. *What a filer sees:* her existing signature prints larger
   without signing again (AGENTS.md §8 item 2: nothing to re-enter).
2. **Left as saved**: only new signatures are trimmed; an old one prints in
   the new place at its old size until it is applied again.

**Settled 2026-10-20 by the requester: option 1** ("Take all six", with 77A, 77B, 77C, 77D and 77F approved to build).

### Checklist (AGENTS.md §8)

| # | Answer |
| --- | --- |
| 1 Data model | None: `signatureImage` stays a PNG within the same limits. |
| 2 Legacy data | Decision 77D-2. Option 1 is a migration that removes only blank margin, tested on a file saved before it; the saved-file corpus gains one. |
| 3 Fixtures | A stamp fixture with known ink bounds. |
| 4 Tests | Unit: trimming (bounds, margin, an all-blank image refused as today). Browser: the image's box on the PDF lies below the heading and above the caption, its bottom at the line (read from the PDF's drawing operators). Red first. `TEST-INDEX.md` rows. |
| 5 Export/import | PDF only; the workbooks carry no signature. |
| 6 Security | None new. |
| 7 UI | The capture widget unchanged, except that what it saves is trimmed. |
| 8 Legal | None. |
| 9 Cross-form | One engine draws every form's signature block; every form's stamped blocks change together. |

### Build record — BUILT 2026-10-20

Approved by name (Status), decisions 77D-1 and 77D-2 option 1. What a filer
now sees:

- **A drawn or uploaded signature is saved trimmed to its ink**, with a
  margin of 4% of the ink's longer side (at least 4 pixels) -- not the whole
  600 x 180 drawing box.
- **It prints below its heading, sitting on the line**, up to 36 points
  (half an inch) tall: the line and the "Signature of …" caption move 16
  points down for a stamp, and its block grows 8 points; "/s/" and blank
  blocks are unchanged.
- **A signature saved before is trimmed when its filing opens**, once (the
  margin comes from the ink, so trimming a trimmed signature changes
  nothing), with an Activity Log entry, "Saved signatures trimmed"; the
  case's saved signatures (each person's reusable stamps) too. Not a closed
  filing, an earlier year opened for correction, or an archived year: those
  reprint as filed. Only blank margin is removed. No saved shape changes, so
  the saved-file corpus needs no new fixture (AGENTS.md §8 item 2).

Code: `signature-pad.js` (`inkBounds()`, `trimCanvasToInk()`; Draw's Apply
and Upload save trimmed), `src/core/signature/stamp-trim.js` (new: the
open-time trim), `ward-lifecycle.js` (runs it as a filing opens; saves and
logs when anything changed), `activity-log-view.js` (`SIGNATURE_TRIMMED`),
`pdf-engine.js` (the stamp's placement), `help/index.html`.

Tests: `tests/unit/signature-trim-77d.spec.js` (new, 6; red first --
`inkBounds()` doesn't exist at HEAD); `tests/e2e/signature-stamp-77d.spec.ts`
(new, 2: a signature drawn by real mouse moves saved trimmed and placed on
the PDF below its heading, its bottom on the line, read from pdf.js's
operators; a saved untrimmed one left alone on a closed filing, trimmed once
on a filing being prepared, with one log entry). Red first: with the source
at HEAD both fail (the 600-pixel box saved and kept); with only
`pdf-engine.js` at HEAD the first fails on placement (the image's top 8
points above the heading's baseline). The first run also caught the trim
not repeating cleanly (a margin taken from the image's size shrank a
trimmed image again); the margin now comes from the ink. Updated:
`signature-capture.contract.spec.ts` (an upload is saved trimmed, so its
background is read at the margin). Browser (C: copy, chromium): every spec
that touches a signature stamp, plus `form-runtime-lifecycle.contract`,
`signature-block-address-margin` and `activity-log-actions`, 113 of 114, the
one the upload test updated here.

---

## 77E — A guardian can sign "/s/ Name"

### What a filer sees today

A guardian on a desktop computer signs with the mouse, and it looks poor.
Attorneys and preparers can choose "/s/" Signed, which prints their typed
name on the line -- "/s/ Daniel R. Okafor, Esq." with "Signature (Electronic
/s/ pursuant to Fla. R. Gen. Prac. & Jud. Admin. 2.515)" under it (the
sample Inventory, page 24). A guardian is offered only Unsigned (sign by
hand) or Signature Stamp.

### Verified

1. **Guardians may not use "/s/"** (73A, the requester, 2026-10-04, as
   Pinellas Clerk practice resting on the court workbook's "Only the
   guardian's signature must be original" (`PART II, III`!B19); flagged then
   for a qualified person, Archive:61728). *Confirmed*, end to end:
   - each year's data carries `signaturePolicy`; new filings and New Year
     write 2 (`src/core/validation/signature-state.js:21-28`;
     `src/core/signature/signature-policy.js`), and an open filing is
     upgraded to 2 when opened, a guardian's earlier "/s/" being "asked
     again";
   - the choice isn't offered for a guardian
     (`src/core/signature/signature-state-control.js:89-90`), validation
     refuses it (`signature-state.js:71-73`), and the PDF prints a blank line
     instead (`signaturePrintMode()`, `:171-178`);
   - a closed filing and an archived year keep their policy, so a reprint
     matches what was filed.
2. **Policy 1 is not the same as before-73A-without-the-ban**: under it a
   blank choice with a date also prints "/s/" (the legacy inference 73A
   ended for guardians). *Confirmed* (`inferLegacySignatureState()`).
3. **Excel carries no signature choice**; an import keeps each person's
   choice and never changes the policy (`import-keep.js`,
   `import-transaction.js:50`). *Confirmed* (agent report).

### Earlier work this touches

- **Reverses 73A** (the requester, 2026-10-04) by the requester's answer of
  2026-10-20: "/s/ Name", as attorneys have. *Why 73A was made, as the
  requester now records it:* "I think I had the impression that our local
  judge didn't want it, that is why I removed the option for non attorneys."
  "/s/ Name" is meant to be allowed for all filers; if the court or anyone
  objects, they can say so.
- 55C (`70e2e28`, 2026-09-16) removed a "Type" tab that drew a typed name as
  a stamp; not brought back -- the requester chose "/s/" over a script-font
  stamp.
- 39-B/39-C (the three signature states); 71B (attorney blocks only when an
  attorney is entered).

### Proposed

1. **A new policy, 3** (decision 77E-1): a guardian may choose "/s/" Signed
   again, explicitly, with a date, as attorneys do; a blank choice stays
   Unsigned (no inference from a date, unlike policy 1). New filings and New
   Year write 3.
2. **Filings already at policy 2** are upgraded to 3 when opened, as 73A
   upgraded to 2; a closed filing and an archived year keep their policy, so
   a reprint still matches what was filed.
3. **A guardian's "/s/" that 73A asked again** (decision 77E-2).
4. **The caption** under a guardian's "/s/" (decision 77E-3).
5. The guardian's date becomes required when "/s/" is chosen, as for
   attorneys (the existing rule for the typed state); Unsigned and Stamp
   unchanged.

### Decisions

**77E-1 — How the rule changes.**
1. **(Recommended)** **A new policy, 3**, for new filings, New Year and
   upgraded open filings. *What a filer sees:* "/s/" Signed offered on every
   guardian block of an open filing; a filed year reprints as filed.
2. **Retire the guardian rule outright** (every filing, whatever its
   policy). Simpler code, but a closed filing signed by hand under 73A could
   reprint differently from the copy filed.

**Settled 2026-10-20 by the requester: option 2** ("Change everywhere").

**77E-2 — A guardian's "/s/" that 73A asked again.** Under policy 2 such a
block still holds the old "/s/" choice, shown unchosen with "A guardian no
longer signs with "/s/"", and prints a blank line until the guardian picks
again.
1. **(Recommended)** **Shown as chosen again**, with its date, and printed
   "/s/ Name". *What a filer sees:* the signature she originally chose,
   restored; a guardian who has since picked Unsigned or Stamp keeps that.
2. **Stays unchosen** until she picks "/s/" herself; the note changes to say
   "/s/" is offered again.

**Settled 2026-10-20 by the requester: option 1.**

**77E-3 — The caption under a guardian's "/s/".**
1. **(Recommended)** **The same as an attorney's**, as it was before 73A:
   "Signature (Electronic /s/ pursuant to Fla. R. Gen. Prac. & Jud. Admin.
   2.515)".
2. **Without the rule citation**: "Electronic signature (/s/)".

**Settled 2026-10-20 by the requester: option 2.**

*For a qualified person:* whether a non-attorney guardian may sign a
verified report with "/s/", given the workbook's "Only the guardian's
signature must be original", and whether Rule 2.515's caption is the right
one for a guardian, are legal questions; 73A's own question (Archive:61728)
stays recorded, and this proposal neither asserts nor resolves either. The
change rests on the requester's decision, as 73A did.

### Checklist (AGENTS.md §8)

| # | Answer |
| --- | --- |
| 1 Data model | `signaturePolicy`'s domain gains 3 (`probate-guardian-data-model.csv:66`); the guardian signature-date rows' condition notes that "/s/" is a guardian's choice again. `verify:data-model`. |
| 2 Legacy data | Policy 2 files upgrade to 3 when opened, open filings only; policy 1 and closed or archived years untouched (option 1). Tested on the saved-file corpus's policy-2 fixtures (`29-ms76k-*`). Nothing to re-enter. |
| 3 Fixtures | The year-rollover and filing-shape goldens (`ms70-year-rollover-golden.json`, `ms70-70C-filing-shapes.json`) record policy 2 for new filings; regenerated with a stated note. |
| 4 Tests | Updated by name: `signature-by-hand.spec.js` (the 36 rules, now per policy), `signature-by-hand.spec.ts` (every form offers Unsigned, "/s/" Signed and Stamp under 3; a policy-2 closed filing reprints a blank line), `signature-capture.contract.spec.ts` (its no-"/s/"-for-guardians helper), `pdf-accessibility-and-signatures.spec.ts:252-257` (a guardian's "/s/" now prints). New: the upgrade 2 → 3 and decision 77E-2. Red first. `TEST-INDEX.md` rows. |
| 5 Export/import | Excel unchanged (no signature cell; the policy is kept on import). PDF: "/s/ Name" on guardian blocks. |
| 6 Security | None. |
| 7 UI | The existing three-choice signature control, as attorneys have it. |
| 8 Legal | Flagged above. |
| 9 Cross-form | One policy, one control and one print rule serve all nine forms' guardian blocks, the certificates' guardian signer included. |

### Build record — BUILT 2026-10-20

Approved by name (above), decisions 77E-1 option 2, 77E-2 option 1 and
77E-3 option 2. What a filer now sees:

- **Every signer has three choices** -- Unsigned, "/s/" Signed, Signature
  Stamp -- on every guardian block of all nine forms, the certificates'
  guardian signer included, on every filing whatever its year's policy (no
  policy 3: decision 77E-1 option 2 retires the guardian rule outright).
- **A guardian's "/s/" prints "/s/ Name"** with "Electronic signature (/s/)"
  beneath it; an attorney's or preparer's keeps "Signature (Electronic /s/
  pursuant to Fla. R. Gen. Prac. & Jud. Admin. 2.515)". A guardian's "/s/"
  needs its date, as anyone's ("date signed is required to apply "/s/"
  Signed"); the date's star follows the choice.
- **A "/s/" 73A asked again is her choice again**: it shows as chosen, with
  no note, and prints; a closed filing and Mark Open keep it.
- **Kept from 73A**: under policy 2 a guardian's blank choice is Unsigned,
  date or no date (typing the date doesn't pick "/s/"); the upgrade on open,
  New Year's clearing of every choice and stamp, and an Excel import leaving
  the policy alone are unchanged. The policy values and their data-model
  domain are unchanged (`signaturePolicy` 1 or 2).
- The readiness card's guardian rows read "Guardian's signature block
  complete"; the Plans' certificate no longer advises a guardian's "/s/";
  the user guide's Signatures section describes three choices for everyone
  and both captions.

Code: `signature-state.js` (the refusal and the blank print for a guardian's
"/s/" removed; `blankChoiceIsUnsigned()` keeps policy 2's reading of a blank
choice), `signature-state-control.js` (all three choices; the ask-again note
removed; `signatureDateRequired()` by the choice alone), `pdf-engine.js` (the
guardian's caption), `plan-certificate-of-service.js`, `readiness-config.js`,
`signature-policy.js`, `filing-registry.js` and `state.js` (comments),
`help/index.html`; the data model's notes on the ten guardian signature rows
and `signaturePolicy` (`verify:data-model`, 1,088 rows).

Tests: `tests/unit/signature-by-hand.spec.js` (36; red first -- with
`signature-state.js` and `signature-state-control.js` at HEAD, 21 fail: the
guardian refused "/s/", not offered it, or printed a blank line);
`tests/e2e/signature-by-hand.spec.ts` and
`signature-capture.contract.spec.ts` (red first -- with the source at HEAD,
7 fail: the four changed by-hand cases and the three capture cases; New
Year's and the accessibility case pass on both); updated for the rule:
`sidebar-export-parity.spec.js`, `pdf-accessibility-and-signatures.spec.ts`
(comment), `print-preview-signature-jump.spec.ts` and
`navigation-status.contract.spec.ts` (their guardian signature issue is now
the undated "/s/"'s date), the four Plans' `*-mount.spec.ts` snapshots (one
more choice), `plan-pdf-wcag-compliance.spec.ts` (the Plan Simplified's
guardian caption); `tests/baseline/ms73-validator-golden.json` regenerated
(8 of 4,936 outcomes -- the undated guardian "/s/" variants ask for the date
in place of 73A's choice; nothing else changed). Unit: the whole suite
(3,487; four slow-file timeouts under a concurrent browser run, passing
alone); `check:types`; the index, skip-classification and assertion-count
guards. Browser (C: copy, chromium): the three changed specs (37) and every
spec that touches a signature, the readiness card or a Plan's certificate
(125, then the nine updated cases' files, 59). Full regression not run.

---

## 77F — Filing before the bond is issued

### What a filer sees today

The tester worried the app expects a bond before the initial reports are
filed; her surety won't issue one without a court order, and petitioning for
one costs the ward. The app doesn't expect it -- nothing in the bond section
blocks filing (67B), and "Bond waived by court order" is an answer -- but
nothing tells her so.

### Verified

The Inventory's bond question carries "Not required to file. Each answer
shows only the fields it needs." (`src/features/guardian-inventory/index.js:1366`),
the Annual's Part IX the same (`src/features/annual-accounting/index.js:1577`);
the guide's D-4 entry says nothing blocks filing (`help/index.html:443`).
67B is recorded at `src/core/filing/bond-depository.js:21-34`. *Confirmed.*

### Proposed

A line under the Inventory's bond question, and in the guide's D-4 entry
(decision 77F-1): "The bond doesn't have to be issued before you file this
inventory. A surety may need the court's order first; enter the bond here
once it is." Recorded as the requester's statement of Pinellas Clerk
practice (2026-10-20), not as statute (AGENTS.md §5).

### Decisions

**77F-1 — Where the line goes.**
1. **(Recommended)** **The Inventory only**, where the question first comes
   up, for Pinellas and Pasco filings (`county-guidance.js`, AGENTS.md §5).
2. **The Inventory, for every county**, worded as general guidance.
3. **The Inventory and the Annual's Part IX.**

**Settled 2026-10-20 by the requester: option 1** ("Take all six", with 77A, 77B, 77C, 77D and 77F approved to build).

### Checklist (AGENTS.md §8)

| # | Answer |
| --- | --- |
| 1–7, 9 | None beyond the text; a unit check that the line renders where decision 77F-1 puts it. `TEST-INDEX.md` if a spec is added. |
| 8 Legal | County practice, worded and gated as such. |

---

## Appendix A — Every decision

| Decision | Question | Recommended | Status |
| --- | --- | --- | --- |
| 77A-1 | Where Continue is offered | Beside the reason line, and in each refusal | Settled: as recommended |
| 77B-1 | Where carry-over is explained | A line on the dashboard, and the tour | Settled: as recommended |
| 77C-1 | A reminder when a certificate date is blank | A reminder, never a block | Settled: as recommended |
| 77D-1 | How tall a signature prints | Up to about half an inch | Settled: as recommended |
| 77D-2 | Signatures already saved | Trimmed when the filing is opened | Settled: as recommended |
| 77E-1 | How the guardian rule changes | A new policy, 3 | Settled: retire it outright (option 2) |
| 77E-2 | A guardian's "/s/" that 73A asked again | Shown as chosen again | Settled: as recommended |
| 77E-3 | The caption under a guardian's "/s/" | The same as an attorney's | Settled: no rule citation (option 2) |
| 77F-1 | Where the bond line goes | The Inventory only, Pinellas and Pasco | Settled: as recommended |

Settled 2026-10-20 by the requester, before this proposal: the answers in
the table under "Where these came from" -- among them 77C's scope (the
service dates and the Inventory's attorney Filing Date, not the "/s/" date)
and 77E's form ("/s/ Name", as attorneys, not a script-font stamp).
