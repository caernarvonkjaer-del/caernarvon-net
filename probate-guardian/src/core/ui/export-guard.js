// Milestone 67. Reported live against the deployed portable build: clicking
// "Save as PDF" produced a browser warning that the download was blocked
// because "this page tried to save multiple files automatically."
//
// What this fixes, in the filer's terms: click Save as PDF (or Save as
// Excel), and if the file takes a moment to generate -- a large filing, a
// slower machine -- nothing on screen stops a second click while the first
// is still working. Every doSavePdf()/doSaveExcel() across all seven filing
// types started its own independent export with no re-entrancy guard, so
// two clicks close together each triggered their own download. A browser
// that sees a page start more than one automatic download without a fresh
// click in between blocks the second one -- which reads to the filer like
// the export itself failed, when what actually happened is it ran twice.
//
// The fix is identical for every filing type's export button, so it lives
// once here instead of copied into ten handlers (seven Save as PDF, three
// Save as Excel).

/**
 * Call right after a handler's own authorization check passes. Disables
 * `selector`'s button and returns it, or returns `null` -- meaning the
 * caller must return immediately without starting an export -- when either
 * the button doesn't exist (page navigated away) or it's already disabled
 * (an export is already in flight from an earlier click, or it's disabled
 * for its own unrelated reason; either way this call should not have
 * happened yet).
 *
 * The caller is responsible for re-enabling the button itself, in its own
 * `finally`, once the export finishes -- success, failure, or otherwise --
 * so the filer can always try again:
 *
 *   const btn = beginExport('[data-inventory-action="save-pdf"]');
 *   if (!btn) return;
 *   try { ...generate and save... }
 *   catch (e) { ...report the error... }
 *   finally { btn.disabled = false; }
 */
export function beginExport(selector) {
  const btn = document.querySelector(selector);
  if (!btn || btn.disabled) return null;
  btn.disabled = true;
  return btn;
}
