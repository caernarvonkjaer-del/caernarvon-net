# Milestone 25-1: HTML/CSS Warning Remediation & Modal Style Unification

## Goal

Eliminate all actionable compile/lint warnings in `index.html`, `fragments/common-modals.html`, and `docs/pdf-architecture-and-signatures.md`, moving all inline CSS into `src/styles/app.css` while preserving accessible names, modal behaviors, and theme integrity.

---

## Background & Scope

During the Milestone 25 review, diagnostic scans flagged inline styling in `index.html` (48 instances) and `fragments/common-modals.html` (56 instances), along with missing accessible label bindings and Markdown lint warnings.

### Scope of Changes:
1. **`index.html` Inline CSS Extraction**:
   - Replaced all static `style="..."` attributes with semantic CSS classes defined in `src/styles/app.css`.
   - Associated form labels (`for="unlock-password"`, `for="unlock-password-confirm"`) with password inputs for complete accessibility.
   - Refactored `#save-error-banner`, `#sidebar-context`, ward controls buttons, save controls toggles, indicator text, loading placeholders, and startup/unlock modal containers.

2. **`fragments/common-modals.html` Inline CSS Extraction**:
   - Replaced all 56 inline `style="..."` attributes with centralized CSS classes and standard Bootstrap flex utility classes (`d-flex gap-2 flex-fill`).
   - Added `aria-label` attributes to dropdown listboxes (`convert-source-ward-dropdown`, `new-ward-name-dropdown`, `elig-ward-name-dropdown`) to maintain full ARIA accessibility.
   - Preserved all data attributes (`data-modal-action`, `data-modal-id`, `data-modal-input`, `data-modal-change`) and modal IDs.

3. **`src/styles/app.css` Consolidation**:
   - Added styles for `#dropzone-overlay`, `.dropzone-box`, `.modal-box-title`, `.modal-title-danger`, `.modal-desc`, `.modal-desc-sm`, `.modal-note-box`, `.modal-help-text`, `.modal-help-text-sm`, `.modal-autonote`, and `.modal-scroll-list`.
   - Re-ordered vendor prefixes (`-webkit-backdrop-filter` before `backdrop-filter`, `-webkit-user-select` with `user-select`).

4. **`docs/pdf-architecture-and-signatures.md` Markdown Linter**:
   - Specified fenced code languages (`text`), fixed list spacing/indentation, and cleaned trailing punctuation in headings.

---

## Verification & Acceptance

- `npm run test:unit`: 116/116 unit tests passing.
- `npx playwright test`: 202/207 tests passing (5 hosted offline cache tests skipped by design in non-hosted mode).
- `npm run build`: Web and portable distributions compile without errors.
- Diagnostics: 0 inline style errors across all HTML files and fragments.
