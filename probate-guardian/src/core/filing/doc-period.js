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
// Milestone 76F item 3: the Initial Inventory's first year is one folder.
// Its documents were filed under 'initial' until its first New Year named the
// year "Year 1" -- and every lookup then used "Year 1", so they disappeared
// (and deleting Year 1 left them in the case file). "Year 1" is 'initial'.
export function inventoryDocKey(yearKey) {
  return !yearKey || yearKey === 'Year 1' ? 'initial' : yearKey;
}

/**
 * Milestone 76F item 3: an Inventory's documents filed under "Year 1" (after
 * its first New Year, before this) join its 'initial' folder -- files after
 * the ones already there, comments joined. Idempotent; a filing of another
 * type is left alone.
 * @param {any} filing
 */
export function mergeInventoryYearOneDocs(filing) {
  if (!filing || filing.inventoryType !== 'guardian' || !filing.scheduleDocs || typeof filing.scheduleDocs !== 'object') return false;
  let changed = false;
  for (const slots of Object.values(filing.scheduleDocs)) {
    if (!slots || typeof slots !== 'object' || !slots['Year 1']) continue;
    const from = slots['Year 1'];
    const into = slots.initial || { comment: '', files: [] };
    into.files = [...(Array.isArray(into.files) ? into.files : []), ...(Array.isArray(from.files) ? from.files : [])];
    const comments = [into.comment, from.comment].map((c) => String(c || '').trim()).filter(Boolean);
    into.comment = [...new Set(comments)].join('\n\n');
    for (const [k, v] of Object.entries(from)) if (!(k in into)) into[k] = v;
    slots.initial = into;
    delete slots['Year 1'];
    changed = true;
  }
  return changed;
}

export function resolveActiveDocPeriod(sourceData) {
  if (!sourceData || typeof sourceData !== 'object') return 'initial';
  const type = sourceData.inventoryType;
  if (type === 'guardian') return inventoryDocKey(sourceData.activeYearKey);
  if (type) return `${sourceData.periodFrom || ''}__${sourceData.periodTo || ''}`;
  if (sourceData.activeYearKey) return sourceData.activeYearKey;
  if (sourceData.periodFrom || sourceData.periodTo) {
    return `${sourceData.periodFrom || ''}__${sourceData.periodTo || ''}`;
  }
  return 'initial';
}
