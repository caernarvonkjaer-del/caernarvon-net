// Which reporting period a filing's supplemental documents are filed under.
// The one resolver the supporting-document slots, their acknowledgement and
// the PDF supplement all key by, so it must say exactly what the screen's
// scheduleDocPeriodKey() (schedule-docs.js) files them under: the Initial
// Inventory by its year (activeYearKey, else 'initial'); every other filing
// by its reporting period's dates, `${periodFrom}__${periodTo}` -- empty dates
// included, as the screen files a document attached before them.
//
// Found 2026-10-10: this read activeYearKey first for every filing type. Start
// New Year gives every filing one ("Year 2"), so from a filing's second year
// on, the Accountings' and the Plans' documents -- filed by their dates --
// were looked up under "Year 2" and never reached the PDF, nor its export
// checks. Input with no filing type keeps the old order (year, dates,
// 'initial'), as the unit tests and the PDF's own callers pass.
//
// Moved out of src/core/pdf/supplemental-pdf.js by Milestone 70's 70C, which
// re-exports it: the acknowledgement (schedule-doc-ack.js) and so the filing
// normalizer and registry needed only this, and importing it from there
// pulled the PDF-appending code into every page that loads the registry.
export function resolveActiveDocPeriod(sourceData) {
  if (!sourceData || typeof sourceData !== 'object') return 'initial';
  const type = sourceData.inventoryType;
  if (type === 'guardian') return sourceData.activeYearKey || 'initial';
  if (type) return `${sourceData.periodFrom || ''}__${sourceData.periodTo || ''}`;
  if (sourceData.activeYearKey) return sourceData.activeYearKey;
  if (sourceData.periodFrom || sourceData.periodTo) {
    return `${sourceData.periodFrom || ''}__${sourceData.periodTo || ''}`;
  }
  return 'initial';
}
