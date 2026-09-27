// Which reporting period a filing's supplemental documents are filed under:
// the active year's key when the filing has multi-year history, else the
// reporting period, else 'initial'. The one resolver the supporting-document
// slots, their acknowledgement and the PDF supplement all key by.
//
// Moved out of src/core/pdf/supplemental-pdf.js by Milestone 70's 70C, which
// re-exports it: the acknowledgement (schedule-doc-ack.js) and so the filing
// normalizer and registry needed only this, and importing it from there
// pulled the PDF-appending code into every page that loads the registry.
export function resolveActiveDocPeriod(sourceData) {
  if (!sourceData || typeof sourceData !== 'object') return 'initial';
  if (sourceData.activeYearKey) return sourceData.activeYearKey;
  if (sourceData.periodFrom || sourceData.periodTo) {
    return `${sourceData.periodFrom || ''}__${sourceData.periodTo || ''}`;
  }
  return 'initial';
}
