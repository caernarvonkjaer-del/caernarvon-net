// Milestone 73O part 2 (decisions 73O-3 and 73O-N2): one shape for a
// certificate of service's recipient on all seven certificates -- the
// Inventory's D-5, the Annual, Final and Trust Accounting's Part X, the
// Simplified's Part VI and the four Plans' certificates.
//
// Each of the Clerk's three workbooks gives a recipient a five-line box under
// "Name and Address of Recipient" (read with a parser: Inventory PART VI
// B13:G17 and three more, Annual PART X B11:H15 and three more, Simplified
// PARTS V, VI  B27:H31 and three more -- none of them a formula). So a
// recipient is a name and four address lines. Before this the Inventory kept a
// name, a street address and a city/state/ZIP; the accountings and the Plans a
// name and three lines; and the Simplified's third line had no box on screen.
//
// Requiredness (decision 73O-N3, the requester, 2026-10-08): a listed
// recipient needs a name on every form -- the address lines are optional, as
// they already were everywhere but the Inventory.

/** The four address lines, in order; the name is the box's first line. */
export const RECIPIENT_LINES = Object.freeze(['line2', 'line3', 'line4', 'line5']);
/** Every field a recipient has; any of them filled makes the card started. */
export const RECIPIENT_FIELDS = Object.freeze(['name', ...RECIPIENT_LINES]);

/** A blank recipient card. */
export const emptyRecipient = () => ({ name: '', line2: '', line3: '', line4: '', line5: '' });

const text = (v) => String(v ?? '').trim();

/** Whether a card holds anything. */
export const recipientListed = (row) => !!row && RECIPIENT_FIELDS.some((k) => text(row[k]) !== '');

/** A card's address lines that hold something, in order, for a printed certificate. */
export const recipientAddressLines = (row) => RECIPIENT_LINES.map((k) => text(row?.[k])).filter(Boolean);

/**
 * The workbook cells of each recipient box, from the box's first (name) cell:
 * the name, then the four lines below it.
 * @param {Array<[string, number]>} origins  [column, row] of each box's name cell
 */
export function recipientSlots(origins) {
  return origins.map(([c, r]) => ({ name: `${c}${r}`, line2: `${c}${r + 1}`, line3: `${c}${r + 2}`, line4: `${c}${r + 3}`, line5: `${c}${r + 4}` }));
}

/**
 * A filing saved before Milestone 73O part 2 is read in the one shape: the
 * Inventory's street address and city/state/ZIP become its first two lines.
 * Nothing is lost -- a line already holding something is never overwritten,
 * and the old keys go only once their values are in place. Idempotent; true
 * when anything changed.
 */
export function normalizeRecipientShape(filing) {
  if (!filing || typeof filing !== 'object' || !Array.isArray(filing.serviceRecipients)) return false;
  let changed = false;
  filing.serviceRecipients.forEach((row) => {
    if (!row || typeof row !== 'object') return;
    for (const [old, line] of [['address', 'line2'], ['cityStateZip', 'line3']]) {
      if (!(old in row)) continue;
      if (text(row[line]) === '') row[line] = row[old] ?? '';
      else if (text(row[old]) !== '' && text(row[old]) !== text(row[line])) continue; // both hold something different: keep the old key, lose nothing
      delete row[old];
      changed = true;
    }
    for (const k of RECIPIENT_FIELDS) if (!(k in row)) { row[k] = ''; changed = true; }
  });
  return changed;
}
