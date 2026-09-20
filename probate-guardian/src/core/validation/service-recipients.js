// Milestone 57B: one rule for who must be served, across all three families.
//
// Two opposite defects, from three divergent rules over the same idea:
//
//   Initial Inventory  every serviceRecipients row needed name + address +
//                      cityStateZip, so clicking "+ Add Recipient" by accident
//                      blocked export until the empty card was filled or
//                      removed.
//   Annual, Simplified only certRecipients[0].name was checked and rows 2-4
//                      were never looked at, so a second recipient with a name
//                      and no address exported silently -- a filed certificate
//                      showing a half-addressed person.
//
// And on all three, a filer with genuinely no one to serve could not say so.
// They left Recipient 1 blank and were blocked, or invented an entry.
//
// D17: Recipient 1 complete satisfies validation, cards 2+ are optional, and a
// partly-filled card blocks until completed or cleared. That loosens the
// Inventory and tightens both accountings.
//
// D16: the attestation is asked only when no recipient is listed. Listing
// someone already answers the question, so the majority of filers never see it.
//
// WHAT "COMPLETE" MEANS STAYS WITH EACH FAMILY. The row shapes differ --
// {name, address, cityStateZip} for the Inventory, {name, line2..line4} for the
// accountings, where probate-guardian-data-model.csv marks the address lines
// optional. This module decides WHICH ROWS to judge, never which fields are
// required; promoting line2 to required would change requiredness the data
// model owns, and 57B does not authorize that.

/** True if any field on the row carries content. */
export function recipientRowStarted(row, fields) {
  if (!row) return false;
  return fields.some((f) => {
    const v = row[f];
    return v !== '' && v !== null && v !== undefined;
  });
}

/**
 * Decides what a filing owes for its service recipients.
 *
 * @param {object}   args
 * @param {any[]}    args.rows          The recipient collection.
 * @param {string}   args.attestation   The tri-state: '' | 'Yes' | 'No'.
 * @param {string[]} args.startedFields Fields that make a row "started".
 * @param {(row:any)=>string[]} args.missingFields
 *        Family-owned: the required fields this row is missing, by label.
 * @returns {{ needsAttestation: boolean, firstRowMissing: string[],
 *             extraRows: Array<{index:number, missing:string[]}> }}
 */
export function serviceRecipientIssues({ rows, attestation, startedFields, missingFields }) {
  const list = Array.isArray(rows) ? rows : [];
  const started = (row) => recipientRowStarted(row, startedFields);

  // D16/D17: an affirmative attestation means the filer has stated there is no
  // one to serve. The cards are then irrelevant -- and are deliberately NOT
  // cleared, per section 4's non-destructive rule, so clearing the attestation
  // brings back whatever was typed.
  if (attestation === 'Yes') {
    return { needsAttestation: false, firstRowMissing: [], extraRows: [] };
  }

  // Nothing entered at all, and the question unanswered: this is the only case
  // that asks it. A filer who has listed someone never reaches here.
  if (!started(list[0]) && attestation !== 'No') {
    return { needsAttestation: true, firstRowMissing: [], extraRows: [] };
  }

  // Otherwise Recipient 1 is owed in full -- either because it was started, or
  // because the filer answered 'No' and must therefore list someone.
  const firstRowMissing = missingFields(list[0] || {});

  // Cards 2+ are optional. An untouched one is ignored; a started one must be
  // finished or cleared, which is what stopped a half-addressed recipient from
  // reaching the clerk.
  const extraRows = [];
  for (let i = 1; i < list.length; i += 1) {
    if (!started(list[i])) continue;
    const missing = missingFields(list[i]);
    if (missing.length) extraRows.push({ index: i, missing });
  }

  return { needsAttestation: false, firstRowMissing, extraRows };
}

// Bridged for legacy-app.js's hand-written nav checks (a-p10, s-p6), which are
// a classic script and cannot import. The Initial Inventory needs no bridge:
// it derives its nav state from validate() through errorRoute(), so an issue
// whose section starts "D-5" buckets onto /d5 with no nav edit at all.
//
// Bridged rather than reimplemented deliberately. Milestone 57's Simplified
// signature gap and 58C's attorney predicate were both caused by a second
// reading of the same data drifting from the first.
if (typeof window !== 'undefined') {
  window.serviceRecipientIssues = serviceRecipientIssues;
  window.recipientRowStarted = recipientRowStarted;
}
