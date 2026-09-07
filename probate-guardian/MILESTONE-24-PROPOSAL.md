# Milestone 24: Safer Form Entry, Date UX, and Navigation Guidance

## Goal

Improve data-entry trust and completion guidance across Probate Guardian forms:

1. Prevent unsafe normalization of legal/account/case identifiers.
2. Make date parsing more forgiving and visibly explain accepted formats.
3. Improve disabled Next guidance with section-local missing-field details.
4. Audit rapid input/save timing for paste, tabbing, and assistive-tech workflows.
5. Add assistive-tech completion announcement for preview generation.

This milestone is about making the existing workflow less surprising. It should not change filing math, form eligibility rules, `.sav` compatibility, PDF layout, or the single-source validation model.

## Why This Is Needed

The form workflow is broadly understandable: sidebar checks, progress counts, Print Preview, autosave status, and "no items to report" controls give users a clear sense of progress. The remaining friction is concentrated around user trust:

- Some identifiers appear to be normalized too aggressively. Legal descriptions, case numbers, trust names, account numbers, check numbers, and court/order identifiers may contain dashes, spaces, letters, punctuation, or jurisdiction-specific formatting. Silently stripping those characters can alter meaning.
- Date inputs are strict because many fields use native `type="date"` values, but real users often type or paste dates as `02/14/2026`, `2/14/26`, `Feb 14 2026`, or `2026-02-14`.
- Disabled Next buttons communicate that something is missing, but not always which local fields caused the block.
- Fast input, paste, tabbing, automation, and assistive-technology workflows can expose races between formatting, validation, autosave, rerendering, and focus.
- PDF preview generation is asynchronous. Visual users can see when the preview appears; screen-reader users should receive an equivalent completion announcement.

## Non-Negotiables

1. **No silent destructive normalization**: no legal, account, trust, court, case, check, policy, file, or instrument identifier may lose user-entered letters, punctuation, dashes, slashes, or spaces unless the field has an explicit safe formatter and tests.
2. **Canonical storage for dates**: successful date parsing still stores dates as `YYYY-MM-DD` so existing validators, PDF models, Excel exports, and `.sav` files remain stable.
3. **User-visible date affordance**: date fields that accept flexible text must show concise accepted-format help near the field, not only in external documentation.
4. **Validation remains the source of truth**: missing-field guidance must be derived from existing validators/nav checks, or from a shared validation metadata layer, not duplicated by one-off UI conditions.
5. **No autosave regression**: input changes must still mark dirty and schedule autosave exactly once per logical user edit.
6. **No forced workflow detours**: guidance may explain what is missing, but it must not add modal acknowledgements or extra confirmation steps.
7. **Accessible status updates**: preview loading, success, and failure states must be exposed through an appropriate live region without stealing focus during normal generation.

## Current Implementation Notes

Relevant surfaces observed in the current modular build:

- Date display/parsing helpers and many legacy field helpers still live in `src/legacy-app.js`.
- Feature modules use a mix of shared helpers and local render helpers, including `data-form-path`, `data-annual-path`, `data-form-format`, native `type="date"` fields, and inline path bindings.
- Guardian schedule navigation already has a shared `pageNav()` helper in `src/features/guardian-inventory/index.js` that disables Next when the current schedule is incomplete.
- Print/export pages already render missing-field panels using validator output, but normal section pages do not always expose the same detail near disabled Next controls.
- PDF preview generation is centralized in `src/core/pdf/pdf-preview.js`, which currently writes "Generating preview..." and error text into the preview container.

## Scope

In scope:

- Field-format inventory and formatter allowlist.
- Safer identifier handling for all active form types.
- Flexible date parsing and date-field hints.
- Section-local missing-field details for disabled Next/navigation controls.
- Tests and manual audit paths for paste, tabbing, fast entry, rerendering, and autosave retention.
- Live-region status updates for preview generation.

Out of scope:

- Rewriting all forms to a new component system.
- Changing court-form validation requirements.
- Changing PDF page layout or Excel template mapping except where tests need to prove dates/identifiers survive unchanged.
- Introducing server-side validation.
- Claiming uploaded supplemental PDFs are ADA/WCAG/PDF-UA compliant.

## Slice 24A: Inventory and Classify Field Normalization

Create a field-format inventory before changing behavior.

For each formatter, identify:

- Helper name, such as `formatName`, `formatAddress`, `formatCaseNumber`, `formatBarNumber`, `formatAccountNumber`, `formatCheckNumber`, `formatSSN`, `formatPhone`, `formatCityStateZip`, and import capitalization helpers.
- Fields using it.
- Whether the field is a human-name/address field, numeric-only regulatory identifier, masked sensitive identifier, money/percent field, date field, or free-form legal identifier.
- Whether destructive normalization is acceptable.

Classification:

- **Safe structured formatters**: phone, SSN/EIN masking, ZIP extraction, currency/percent formatting, and bar-number formatting where the court format is known and documented.
- **Presentation-only formatters**: name/address capitalization. These may adjust display when the user leaves the field, but must not alter all-caps acronyms, initials, entity names, trust names, or legal phrases in ways that change meaning.
- **Identifier-preserving fields**: case numbers, account numbers, check numbers, policy numbers, loan numbers, trust names, lawsuit case numbers, court order numbers, file numbers, legal descriptions, bank/institution names, and document titles. These should preserve the user's text except for trimming leading/trailing whitespace and rejecting unsafe control characters.

Deliverables:

- Add a short checked-in field-format inventory document, or a clearly named section in this milestone's implementation notes.
- Add regression tests proving that representative identifiers preserve punctuation and letters:
  - `SNT-2024-778`
  - `25-002487-GD`
  - `Acct 123-45 / POD`
  - `CHK-104A`
  - `Trust u/a/d 04/12/2020`

## Slice 24B: Make Identifier Preservation the Default

Introduce a shared preservation helper for identifier-like text, for example:

```js
function preserveIdentifierText(value) {
  return validateSecurityInput('identifier', String(value ?? '')).trim();
}
```

Then route identifier fields through that helper instead of through digit-only or title-casing formatters.

Implementation requirements:

- Do not infer "account number" means numeric-only. Bank, brokerage, loan, and trust account numbers can contain letters, suffixes, dashes, spaces, and slashes.
- Do not run trust names, legal descriptions, institution names, court names, or case numbers through title-case normalization.
- Keep explicit formatters only where the field's legal/business format is known.
- If a formatter changes a value on blur, the change must be reversible by the user and must not re-run on every input event while typing.
- Imported Excel data must follow the same preservation rules as typed data.

Testing:

- Unit tests for each formatter category.
- E2E tests that type and paste representative identifiers into at least Guardian Inventory, Annual Accounting, Simplified Accounting, and one Plan form, then verify:
  - the visible field retains the intended value;
  - the in-memory model retains the intended value;
  - a save/reload cycle retains the intended value;
  - exported PDF text contains the intended value where applicable.

## Slice 24C: Flexible Date Entry With Canonical Storage

Replace strict date-only entry assumptions with a shared date-entry path.

Accepted user inputs should include:

- `YYYY-MM-DD`
- `MM/DD/YYYY`
- `M/D/YYYY`
- `MM/DD/YY` with an explicit pivot rule
- `Month D, YYYY`
- `Mon D YYYY`

Rules:

- Store valid dates as `YYYY-MM-DD`.
- Display date fields consistently after commit/blur.
- Reject impossible dates such as `02/30/2026`.
- Treat implausible years before the app's existing validity threshold as invalid/missing, consistent with the current defensive `fmtDate` comments.
- Do not silently guess ambiguous international formats such as `14/02/2026`; show an error or leave the field uncommitted.
- Keep keyboard entry, paste, picker selection, and screen-reader interaction working.

UI:

- Date controls should visibly show accepted formats near the field, for example: `Use MM/DD/YYYY or YYYY-MM-DD`.
- If keeping native `type="date"` for picker support, add a companion flexible text path only if it can avoid double-focus confusion.
- Prefer a single component/helper used by all feature modules over ad hoc per-form date hints.

Testing:

- Unit tests for date parser edge cases, leap years, two-digit year pivot behavior, invalid dates, empty values, and canonical output.
- E2E tests for typing and pasting common date formats into required fields.
- Regression tests for Print Preview/PDF/Excel still receiving canonical `YYYY-MM-DD` model values.

## Slice 24D: Section-Local Missing-Field Guidance

Disabled Next buttons should explain the specific local blockers.

Implementation approach:

- Add a shared helper that accepts:
  - the current route/section key;
  - validator output;
  - optional route-to-section mapping;
  - optional maximum number of displayed items.
- It returns a compact local list of missing fields for the current page/section.
- The disabled Next button's title may remain short, but the page should show visible text near the navigation controls when blocked.

Example copy:

```text
Complete these before continuing:
- Guardian #1 printed name
- Guardian #1 signature date
```

Requirements:

- Guidance must come from the same validation messages that block export, or from shared metadata consumed by both validation and guidance.
- Long sections should show the first few blockers plus a count of remaining blockers.
- Each item should become a jump link or focus target when the app can map it to a field reliably.
- The guidance should use accessible markup: `aria-describedby` on the disabled button is not sufficient because disabled controls may not be announced consistently. Put the message in normal page content near the control.
- Keep Print Preview's existing global missing-fields panel.

Testing:

- E2E tests for at least one Guardian schedule and one Plan/Accounting page:
  - blank page shows local missing details;
  - filling each field removes its item;
  - Next enables when local blockers are gone;
  - visible guidance matches validator output.

## Slice 24E: Input Timing and Autosave Audit

Create an audit/test suite for high-speed and alternate input paths before making broad event changes.

Scenarios:

- Fast typing into several fields followed by immediate tabbing.
- Pasting full values into text, money, identifier, and date fields.
- Programmatic fill through Playwright.
- Selecting dates via picker-compatible input.
- Screen-reader-like navigation: focus, type, blur, tab, change.
- IME/composition safety for text fields.
- Saving while validation or formatting is running.

Risks to look for:

- Rerendering a page before the input event commits.
- Formatting on `input` fighting the user's caret position.
- `autoSave()` scheduled before the final normalized value lands.
- `updateNavDots()` or section rerender clearing an in-progress edit.
- Field-specific handlers diverging from generic `data-form-path` handlers.

Deliverables:

- Add E2E tests that intentionally type quickly and paste values across multiple fields.
- Add unit tests around any shared input commit helper.
- Document any fields that still require per-field special handling.

Acceptance bar:

- A typed or pasted value that passes validation remains visible after blur, navigation away/back, autosave, and reload.
- One logical edit should not trigger duplicate conflicting model writes.
- Rapid entry should not produce "input did not retain requested value" failures in the app's own supported input paths.

## Slice 24F: Preview Generation Live Region

Update `src/core/pdf/pdf-preview.js` so PDF preview loading, completion, and failure have accessible status announcements.

Implementation requirements:

- Add or reuse a visually hidden status node inside the print preview surface.
- Loading state announces: `Generating preview.`
- Success announces: `Preview ready.`
- Failure announces: `Preview failed to render.`
- Use `role="status"` and `aria-live="polite"` for loading/success.
- Use `role="alert"` or assertive live behavior only for failures.
- Do not move focus on successful generation.
- Preserve the existing visual preview behavior.

Testing:

- Unit or E2E test that the status node exists during preview generation.
- E2E test that a successful preview updates the live-region text to `Preview ready.`
- Existing PDF preview rendering tests must continue to pass.

## Migration Sequence

1. **Baseline and inventory**
   - Run current unit/build/E2E tests.
   - Produce the normalization inventory.
   - Identify all date fields and formatter attributes across feature modules.

2. **Formatter safety first**
   - Add preservation helper and tests.
   - Move identifier-like fields off destructive formatters.
   - Update Excel import capitalization/normalization paths to respect the same rules.

3. **Date parser and hints**
   - Add shared parser/formatter tests.
   - Update shared input/date helpers.
   - Convert forms in small batches, starting with Guardian Inventory and one Plan form.

4. **Local missing-field guidance**
   - Add route/section mapping helpers.
   - Add guidance to Guardian `pageNav()` first.
   - Extend to Annual/Simplified/Plan navigation surfaces after the shape is proven.

5. **Timing audit**
   - Add paste/rapid-entry tests around the changed fields.
   - Fix only confirmed timing defects, keeping changes tightly scoped.

6. **Preview live region**
   - Update shared PDF preview status handling.
   - Verify across all feature preview specs.

7. **Regression pass**
   - Run unit tests, build, focused E2E tests for affected forms, and the shared PDF preview suite.
   - If possible, run one manual browser pass with keyboard-only navigation through a changed section.

## Acceptance Criteria

- Representative legal/account/case identifiers retain punctuation, spaces, and letters across typing, paste, autosave, save/reload, preview, and export.
- No identifier-like field uses a destructive formatter unless explicitly documented and tested.
- Common U.S. date inputs parse successfully and store as `YYYY-MM-DD`.
- Date fields visibly explain accepted formats.
- Impossible or ambiguous dates are rejected without corrupting the model.
- Disabled Next guidance identifies local missing fields near the navigation controls.
- Missing-field guidance remains consistent with export-blocking validation.
- Rapid typing, paste, tabbing, and Playwright fills do not lose committed values.
- Preview generation announces loading, success, and failure to assistive tech.
- Existing `.sav` files remain compatible.
- Existing unit tests, build, and affected E2E suites pass.

## Test Plan

Minimum automated checks:

- `npm.cmd run test:unit`
- `npm.cmd run build`
- Focused Playwright suites for:
  - Guardian Inventory mount/navigation
  - Annual Accounting mount/navigation
  - Simplified Accounting mount/navigation
  - Plan Initial or Plan Annual mount/navigation
  - PDF preview viewer

Local Playwright note:

- This machine has the bundled Chromium executable at:

  ```text
  C:\Users\No Name\AppData\Local\ms-playwright\chromium-1234\chrome-win64\chrome.exe
  ```

- Edge is also available through the project config:

  ```powershell
  $env:PG_BROWSER='edge'
  npx.cmd playwright test --reporter=list
  ```

## Open Questions

1. Should two-digit years use a fixed pivot, such as `00-49 => 2000-2049` and `50-99 => 1950-1999`, or should the app reject two-digit years entirely for legal forms?
2. Which fields, if any, should intentionally retain strict native `type="date"` controls instead of accepting flexible text entry?
3. Should name/address auto-capitalization remain default, move to blur-only, or become opt-in per field?
4. How much local missing-field detail is useful before the page feels noisy: first 3 items, first 5 items, or all blockers for short sections?
5. Should field jump links be part of the first implementation, or a follow-up once validation messages have stable field IDs?
