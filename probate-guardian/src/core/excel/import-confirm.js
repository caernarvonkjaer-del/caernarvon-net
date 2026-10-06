// Milestone 73E part 1: the one confirmation an import asks, in a filer's
// words -- built from the transaction's plan (import-transaction.js) and
// shown by dialogs.js's choicesModal(). Modelled on the .sav restore's
// confirmation: say exactly what will change before anything does.
//
// No importer asks it yet; 73T parts 2-4 pass confirmImport() as each
// form's importer moves onto the transaction.
import { choicesModal } from '../ui/dialogs.js';
import { resolveDescriptorForInventoryType } from '../filing/filing-descriptor.js';

const typeName = (type) => resolveDescriptorForInventoryType(type)?.displayName || type || 'filing';

// The shared record's fields, as a filer knows them.
const FIELD_NAMES = {
  name: 'Name', taxId: 'SSN/EIN', barNumber: 'Bar number', phone: 'Phone', email: 'Email', secondaryEmail: 'Second email',
  street: 'Street', cityStateZip: 'City/State/Zip', officeStreet: 'Office street', officeCityStateZip: 'Office City/State/Zip',
  mailingStreet: 'Mailing street', mailingCityStateZip: 'Mailing City/State/Zip',
};
const shown = (v) => (String(v ?? '').trim() ? `"${v}"` : '(blank)');

/**
 * What the confirmation says and asks, for a plan.
 * @param {ReturnType<import('./import-transaction.js').planImport>} plan
 * @param {{ sourceName?: string }} [options]
 * @returns {{ title: string, message: string, questions: Array<{ id: string, prompt: string, options: Array<{ value: string, label: string }>, onlyIf?: { id: string, value: string } }>, confirmLabel: string, cancelLabel: string }}
 */
export function importConfirmContent(plan, { sourceName } = {}) {
  const filing = plan.filingName || 'this filing';
  const lines = [`Importing ${sourceName || 'this workbook'} replaces what ${filing}'s ${typeName(plan.filingType)} holds in ${plan.fieldChanges.length} place(s) with the workbook's entries.`];
  if (plan.workbookWardName !== null) {
    lines.push(`The workbook is for ${plan.workbookWardName || 'an unnamed ward'}, not ${filing}. This filing will no longer share ${filing}'s record, so the name can't change on the ward's other filings.`);
  }
  if (plan.typeDiffers) lines.push(`The workbook is marked ${typeName(plan.typeDiffers.source)}; this filing stays a ${typeName(plan.typeDiffers.filing)}.`);
  for (const p of plan.people) {
    if (p.identity !== 'different' || !p.before || p.role === 'ward') continue;
    lines.push(`${p.label}: ${p.after || 'no one'} in place of ${p.before}${p.partyId ? `; this filing will no longer share ${p.before}'s record` : ''}.`);
  }
  lines.push('Kept as they are: the signature rule, the signature choices and stamps of the same people, and everything the workbook does not carry.');

  const questions = plan.conflicts.map((c) => {
    const p = c.person;
    if (c.kind === 'near-name') {
      return { id: c.id, prompt: `${p.label}: the workbook says ${shown(p.after)}, this filing ${shown(p.before)}. Is this the same person?`, options: c.options };
    }
    const where = p.otherFilings.length ? ` It is also used by ${p.otherFilings.map((f) => `${f.wardName || 'a filing'} (${typeName(f.type)})`).join(', ')}.` : '';
    const changes = p.differences.map((d) => `${FIELD_NAMES[d.key] || d.key} ${shown(d.shared)} to ${shown(d.incoming)}`).join('; ');
    return { id: c.id, prompt: `${p.label} (${p.sharedName || p.before}) is a shared record.${where} The workbook changes: ${changes}.`, options: c.options, ...(c.onlyIf ? { onlyIf: c.onlyIf } : {}) };
  });
  return { title: 'Import this workbook?', message: lines.join('\n\n'), questions, confirmLabel: 'Import', cancelLabel: 'Cancel' };
}

/**
 * The confirmation: resolves with the filer's choice for each question asked,
 * or null for Cancel or Escape. What runImportTransaction() takes as `confirmChoices`.
 */
export function confirmImport(plan, options) {
  return choicesModal(importConfirmContent(plan, options));
}
