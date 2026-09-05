# Milestone 19-4: Render-Unification Cleanup

## Goal

Remove the code made dead by Milestones 19-1 through 19-3, now that Preview, Save as PDF, and Print all run through one renderer. This is deliberately its own milestone rather than folded into 19-3: deletion should happen only after every feature's viewer-based preview has been verified equivalent to what it replaces, so there's a clean, reviewable checkpoint between "new path verified working" and "old path removed" rather than deleting-as-you-go.

> [!IMPORTANT]
> **Sequencing**: depends on `MILESTONE-19-3-PROPOSAL.md` being complete for all seven features. Nothing here should start until every feature's Preview/Print has been re-pointed at the generated PDF and verified.

---

## Scope

Each item below needs to be checked for other consumers before deletion — some of this CSS/code may still be shared with non-print on-screen UI, not exclusively the old render path.

1. **Per-feature `buildPrintHTML()` functions** in each `src/features/*/print.js`, once that feature's viewer-based preview is confirmed equivalent (per 19-3's acceptance criteria).
2. **Print-only CSS**: the `@media print` block and `.pdf-export-mode` rules in `index.html` (~L780-934) — these exist to make the HTML/CSS preview print/export correctly; once Print no longer touches the DOM at all, this entire block is dead. Includes the `.mobile-topbar`/`.sidebar-backdrop` hide-list fix added in 19-1 — that fix becomes moot (not wrong, just unreachable) once this CSS is deleted, since Print stops rendering the DOM entirely.
3. **The legacy `#pdf-content` div** (`index.html` L1151, `display:none`) — appears to be a leftover from before the Milestone 17 vector engine existed; confirm nothing still references it (`index.html` L33's comment and L789/L908 CSS selectors reference it) before removing.
4. **`src/assets/signature-font.js`** — remove outright. Not a "check before deleting" case like the others: `injectSignatureFontStyles()` is confirmed unreferenced anywhere in the repo (not called by any feature, not just decoupled from PDF output) — the whole module is dead code, not a live on-screen-only path with an unclear future. No hedge needed.
5. **Doc-content CSS classes** (`.doc-table`, `.doc-schedule-title`, `.doc-signature-line`, `.doc-field-label`, `.doc-table-div`, etc.) used only by the now-deleted `buildPrintHTML()` output — remove only the ones with zero remaining references; several of these class names are generic enough that they're worth a repo-wide grep before deletion, not an assumption.

---

## Non-Negotiables

- No functional regression — this milestone is pure deletion of code already proven dead by 19-3's verification, not new behavior.
- Each deletion individually verified (grep for remaining references) rather than batch-removed on the assumption that "it was only used by the old path."

---

## Acceptance Criteria

- [x] `buildPrintHTML()` removed from all seven features' `print.js`.
- [x] `@media print` block and `.pdf-export-mode` CSS removed from `index.html`.
- [x] `#pdf-content` legacy div removed (or explicitly kept with a documented reason if still referenced).
- [x] `src/assets/signature-font.js` removed (confirmed fully dead code — no hedge/keep case applies).
- [x] Dead `.doc-*` CSS classes removed, each individually confirmed to have zero remaining references first.
- [x] Full app smoke test (all seven features' Preview/Save-PDF/Print) after cleanup — no visual or functional regression.

## Verification

- Repo-wide grep for each removed selector/class/function name before and after deletion, confirming zero remaining references.
- Full `npx playwright test` suite (not just the PDF-specific specs) — cleanup touches shared `index.html` CSS, so anything relying on it incidentally should surface here.
- Manual smoke test of all seven features end-to-end post-cleanup.
