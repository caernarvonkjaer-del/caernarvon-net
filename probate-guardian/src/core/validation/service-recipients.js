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
/**
 * Milestone 72J: what an empty certificate needs, in words a filer can act on
 * -- the Plans' wording, now every form's. The accountings used to report the
 * checkbox's own caption ("No recipients are required for this certificate
 * (filer attestation - ...)") as if it were the missing item.
 */
export const RECIPIENTS_OR_ATTESTATION = 'List at least one recipient who was served, or state that no recipients are required';

// Milestone 74F (decision 74F-1, the requester, 2026-10-06): the question on
// all seven certificates, asked plainly. It read "No recipients are required
// for this certificate (filer attestation - app does not determine legal
// necessity)" -- a double negative with the app's own disclaimer inside it;
// the disclaimer is now the hint beneath. The stored answer keeps its meaning:
// Yes = no one needs to be served.
export const NO_RECIPIENTS_QUESTION = 'Are you certifying that no one needs to be served with a copy of this filing?';
export const NO_RECIPIENTS_HINT = 'The app does not decide who must be served.';

// Milestone 74F (decision 74F-2, Pinellas Clerk practice): what every filed
// certificate says in place of a recipient table -- one wording on all seven,
// and never the question or its disclaimer (a Plan printed both). The Clerk's
// workbooks have no such sentence; both are the app's.
export const NO_RECIPIENTS_LISTED_LINE = 'No service recipients are listed.';
export const NO_RECIPIENTS_REQUIRED_LINE = 'No service recipients are required.';

/**
 * The certificate's line when no recipient is printed: "required" when the
 * filer answered Yes to the question, "listed" otherwise.
 * @param {string} attestation  the stored answer: '' | 'Yes' | 'No'
 */
export function noRecipientsLine(attestation) {
  return attestation === 'Yes' ? NO_RECIPIENTS_REQUIRED_LINE : NO_RECIPIENTS_LISTED_LINE;
}

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
 * @param {readonly string[]} args.startedFields Fields that make a row "started".
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

/**
 * Milestone 63B. Whether the page should show the "No recipients are required"
 * question -- the page's half of D16, defined next to the validator's half so the
 * two cannot drift. D16 says a filer who lists a recipient "never sees the
 * question"; the validation honoured that but the three pages rendered the Yes/No
 * unconditionally, so it looked required to filers it had no bearing on.
 *
 * Shown when the validator could ask it -- Recipient 1 not started -- and when
 * 'Yes' is selected: the cards are hidden then, and this control is the only way
 * back to them (section 4, non-destructive toggling). A stale 'No' beside a
 * listed recipient is consistent ("someone must be served", and one is listed),
 * so it hides, and the validator already ignores it.
 *
 * @param {object}   args
 * @param {any[]}    args.rows           The recipient collection.
 * @param {string}   args.attestation    The tri-state: '' | 'Yes' | 'No'.
 * @param {readonly string[]} args.startedFields  Fields that make a row "started".
 * @returns {boolean}
 */
export function attestationRelevant({ rows, attestation, startedFields }) {
  if (attestation === 'Yes') return true;
  const list = Array.isArray(rows) ? rows : [];
  return !recipientRowStarted(list[0], startedFields);
}
