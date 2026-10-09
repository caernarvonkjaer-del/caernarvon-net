// Milestone 73P (decision 73P-1): removing a card asks first when the card
// holds anything -- on every form and every list, as the co-guardian cards
// already did on most forms. An untouched card (the list's own `isBlank`,
// collections.js) goes without a question, as a mistaken "+ Add" should.
//
// A co-guardian keeps the question the forms already asked; any other card
// is named by what it is, never by the list's internal key.
import { confirmModal } from '../ui/dialogs.js';
import { getCollection } from './collections.js';

const PEOPLE = new Set(['guardians', 'planGuardians']);

/** What the question calls a card of `listKey` ("this entry", "this recipient"). */
function cardNoun(rules, listKey) {
  if (/^sch/i.test(listKey)) return 'this entry';
  return `this ${String(rules?.label || 'card').toLowerCase()}`;
}

/**
 * Whether to go ahead with removing `row` (at `index`) from `listKey` on a
 * `filingType` filing: true at once for an untouched card, else the filer's
 * answer.
 * @param {string} filingType
 * @param {string} listKey
 * @param {any} row
 * @param {number} index
 */
export async function okToRemove(filingType, listKey, row, index) {
  const rules = getCollection(filingType, listKey);
  if (!row || !rules || !rules.policies?.confirmRemove || rules.isBlank(row)) return true;
  if (PEOPLE.has(listKey)) {
    return confirmModal(`Remove co-guardian ${row.name || `#${index + 1}`}? This will delete the entered signature information.`);
  }
  return confirmModal({
    title: 'Remove this card?',
    message: `Remove ${cardNoun(rules, listKey)} (${index + 1})? What is entered on it is deleted.`,
    confirmLabel: 'Remove',
    cancelLabel: 'Keep it',
  });
}
