// What the Preview page's Print button prints: the open filing's PDF, as the
// feature whose Preview is showing builds it. Each feature's print module
// registers its own when its Preview & Export page is drawn.
//
// Its own module, apart from pdf-preview.js, so the page's action dispatcher
// (src/form-events.js, loaded at startup) and a feature's pages can reach the
// Print button's target without loading the PDF engine: pdf-preview.js brings
// pdf-lib and the embedded fonts, about 1.8 MB, which load when a filer first
// opens Preview & Export (tests/unit/startup-import-graph.spec.js). Until
// Milestone 70's 70K this was window.printCurrentFilingPdf, which the print
// modules assigned; 70K imported it from pdf-preview.js, and so loaded the
// engine at every start, until 70L.
let printCurrentFiling = null;

/** A feature's Preview registers how the open filing prints. */
export function setPrintCurrentFiling(fn) {
  printCurrentFiling = fn;
}

/** The Print button (data-form-action="print", and Plan Simplified's own). */
export function printCurrentFilingPdf() {
  if (typeof printCurrentFiling !== 'function') throw new Error('printCurrentFilingPdf(): no Preview has been shown');
  return printCurrentFiling();
}
