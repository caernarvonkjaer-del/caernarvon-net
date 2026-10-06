// Milestone 73E part 1: an import is one transaction.
//
// Today each Excel importer writes into the open filing as it reads (the
// Annual about seventy times), so the Inventory and the Annual replace every
// page without asking, the Simplified asks only after it has written the
// cover -- and its Cancel leaves all of that in the filing -- and imported
// people bypass the shared records: correcting one field of a linked guardian
// afterwards put back that guardian's old details, and correcting the ward's
// name after importing another ward's workbook renamed that ward on its other
// filings. Opening a .sav backup reads everything, confirms and only then
// applies (src/core/persistence/case-import.js); this is that, for imports.
//
// The engine is workbook-independent (Codex's design, Milestone 73
// Appendix B): an ADAPTER turns some source into a detached draft -- the
// filing's fields as the source has them -- and the engine does the rest:
//
//   1. take the draft (never touching the filing while it is read);
//   2. diff it against the filing, its shared-record links and the records;
//   3. find conflicts, never resolving one by a name alone: a near-name match,
//      a linked person whose details differ, a workbook marked as another type;
//   4. confirm ONCE, naming what changes and each conflict with its choice;
//   5. commit the filing and the shared records together, in one step;
//   6. one save, one Activity Log entry, one change event (73J part 1);
//   7. Cancel changes nothing anywhere and queues no save;
//   8. after the redraw, a notice of what was imported and what was kept.
//
// No importer uses this yet: 73T part 1 supplies the workbook contract, and
// 73T parts 2-4 move each form's importer onto it, which is where filers
// first see the confirmation, the safe Cancel and the notice. Until then the
// importers keep their own name rule (import-keep.js's samePerson()).
import { auditLog } from '../activity/audit-log.js';
import { getCaseFile } from '../state.js';
import { commitModelChange } from '../model-change.js';
import { normalizeWardData } from '../filing/normalize-filing.js';
import { resolveDescriptorForInventoryType } from '../filing/filing-descriptor.js';
import {
  dehydrateIntoParty, getPartyIdForSlot, hydrateFromParty, isFilingClosed, namesNearlyMatch,
  normalizePartyName, readRoleFields, resolveParty, setPartyIdForSlot, slotsReferencing,
} from '../party-resolver.js';
import { sameName, samePerson as containsName } from './import-keep.js';
import { noItemsKeyFor } from '../form/no-items-keys.js';
import { rowStarted } from '../validation/row-started.js';

// Never taken from a draft: what the filing is, and what this app keeps that
// no source carries -- its identity, its type (a filing keeps its own type,
// decision 73E-N2), its signature rule (73A), its years, its shared-record
// links (decided slot by slot below) and the dates still being typed.
const KEPT_KEYS = Object.freeze(['wardId', 'inventoryType', 'signaturePolicy', 'years', 'archived', 'caseId',
  'wardPartyId', 'attorneyPartyId', 'preparerPartyId', 'guardianPartyIds', '__fieldDrafts']);

const ROLES = Object.freeze(['ward', 'guardian', 'attorney', 'preparer']);
const filingLabel = (type) => resolveDescriptorForInventoryType(type)?.displayName || type || 'filing';
const json = (x) => (x === undefined ? undefined : JSON.parse(JSON.stringify(x)));
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// The same person: the same name ignoring case, spaces and punctuation
// (import-keep.js's sameName(), the requester's decision of 2026-10-05).
export { sameName };

/**
 * Probably the same person, but not the same name: listed in the
 * confirmation for the filer to decide, never settled by the name alone. A
 * near match by the shared-records review's rule (a middle name on one side,
 * a typo) or by the containment rule the importers use today ("Robert T.
 * Nguyen" and "Robert T. Nguyen, Esq.").
 */
export function namesNearMatch(a, b) {
  if (!String(a ?? '').trim() || !String(b ?? '').trim() || sameName(a, b)) return false;
  return namesNearlyMatch(normalizePartyName(a), normalizePartyName(b)) || containsName(a, b);
}

// The slots a filing has people in, as [role, index].
function slotsOf(filing, draft) {
  const out = [];
  for (const role of ROLES) {
    if (role !== 'guardian') { out.push([role, 0]); continue; }
    const list = filing.inventoryType && Array.isArray(filing.planGuardians) ? 'planGuardians' : 'guardians';
    const n = Math.max((filing[list] || []).length, (draft[list] || []).length, (filing.guardianPartyIds || []).length);
    for (let i = 0; i < n; i++) out.push([role, i]);
  }
  return out;
}

const slotLabel = (role, index) => (role === 'guardian' ? `Guardian #${index + 1}` : role === 'ward' ? 'The ward' : role === 'attorney' ? 'The attorney' : 'The preparer');

// A party's values in the fields this filing's type maps for the slot -- the
// same comparison the closed-filing drift uses, so a form that keeps only a
// name never "differs" on an address it has no box for.
function partyValuesFor(filing, role, index, party) {
  const scratch = { inventoryType: filing.inventoryType };
  hydrateFromParty(party, scratch, role, index);
  return readRoleFields(scratch, role, index);
}

/**
 * The plan for importing `draft` into `filing`: what changes and what the
 * filer must decide. Reads only; changes nothing.
 *
 * @param {Record<string, any>} filing  the filing the import replaces
 * @param {Record<string, any>} draft   the filing's fields as the source has them
 * @param {{ workbookType?: string, caseFile?: Record<string, any> }} [options]
 */
export function planImport(filing, draft, { workbookType, caseFile = getCaseFile() } = {}) {
  const incoming = { ...json(draft), inventoryType: filing.inventoryType };
  const fieldChanges = Object.keys(draft)
    .filter((key) => !KEPT_KEYS.includes(key) && !same(filing[key], draft[key]))
    .map((key) => ({ path: key, before: json(filing[key]), after: json(draft[key]) }));

  const people = [];
  const list = Array.isArray(filing.planGuardians) ? 'planGuardians' : 'guardians';
  for (const [role, index] of slotsOf(filing, incoming)) {
    const had = readRoleFields(filing, role, index);
    // Only what the draft carries: a field it doesn't carry is kept, never
    // read as a blank to write over the shared record.
    const gets = readRoleFields(incoming, role, index, { presentOnly: true });
    // A guardian row the draft's list no longer has is a person removed.
    const removed = role === 'guardian' && Array.isArray(incoming[list]) && index >= incoming[list].length;
    if (!Object.keys(gets).length && !removed) continue; // the draft says nothing about this person
    const partyId = getPartyIdForSlot(filing, role, index);
    const party = partyId ? resolveParty(partyId) : null;
    const before = String(had.name || '');
    const after = removed ? '' : ('name' in gets ? String(gets.name || '') : before);
    // Who the slot holds after the import, by name: the same person; a near
    // match, for the filer; or someone else.
    const identity = sameName(before, after) ? 'same' : namesNearMatch(before, after) ? 'near' : 'different';
    const otherFilings = party ? (caseFile?.wards || [])
      .filter((other) => other !== filing && !isFilingClosed(other) && slotsReferencing(other, partyId).length)
      .map((other) => ({ wardId: other.wardId, wardName: other.wardName || '', type: other.inventoryType })) : [];
    const theirs = party ? partyValuesFor(filing, role, index, party) : null;
    const differences = theirs ? Object.keys(gets)
      .filter((key) => String(gets[key] || '') !== String(theirs[key] || ''))
      .map((key) => ({ key, shared: theirs[key] || '', incoming: gets[key] || '' })) : [];
    people.push({ role, index, label: slotLabel(role, index), before, after, identity, partyId, sharedName: party?.name || '', otherFilings, differences });
  }

  const conflicts = [];
  for (const p of people) {
    if (p.identity === 'near') {
      conflicts.push({ id: `near:${p.role}:${p.index}`, kind: 'near-name', person: p,
        options: [{ value: 'same', label: `The same person -- keep ${p.before}'s signature choice and shared record` },
          { value: 'different', label: `A different person -- ${p.after} starts afresh on this filing` }] });
    }
    if (p.partyId && p.identity !== 'different' && p.differences.length) {
      // For a near match, asked only if the filer says it is the same person.
      conflicts.push({ id: `shared:${p.role}:${p.index}`, kind: 'shared-record', person: p,
        ...(p.identity === 'near' ? { onlyIf: { id: `near:${p.role}:${p.index}`, value: 'same' } } : {}),
        options: [{ value: 'update', label: p.otherFilings.length ? `Update the shared record -- it changes on ${p.otherFilings.length} other filing(s) too` : 'Update the shared record' },
          { value: 'unlink', label: 'This filing only -- stop sharing the record here' }] });
    }
  }

  const sourceType = workbookType || draft.inventoryType || '';
  return {
    filingName: filing.wardName || '',
    filingType: filing.inventoryType,
    workbookWardName: draft.wardName !== undefined && !sameName(draft.wardName, filing.wardName) ? String(draft.wardName || '') : null,
    typeDiffers: sourceType && sourceType !== filing.inventoryType ? { filing: filing.inventoryType, source: sourceType } : null,
    fieldChanges,
    people,
    conflicts,
  };
}

// The change a slot's choices make: keep the link and the details nobody
// can import ('keep'), keep the link and update the record ('update'), or
// stop sharing it here ('unlink'); a different person always starts afresh.
function slotOutcome(person, choices) {
  const near = choices[`near:${person.role}:${person.index}`];
  const isSame = person.identity === 'same' || (person.identity === 'near' && near === 'same');
  if (!isSame) return { isSame: false, link: person.partyId ? 'unlink' : 'none' };
  if (!person.partyId) return { isSame: true, link: 'none' };
  if (!person.differences.length) return { isSame: true, link: 'keep' };
  return { isSame: true, link: choices[`shared:${person.role}:${person.index}`] === 'update' ? 'update' : 'unlink' };
}

/** Whether a conflict is asked, given the filer's other choices (a near match's record question). */
export function conflictApplies(conflict, choices) {
  return !conflict.onlyIf || choices[conflict.onlyIf.id] === conflict.onlyIf.value;
}

/**
 * Applies a confirmed plan: the filing and the shared records together, in
 * one synchronous step -- nothing renders or saves between them. Returns
 * what changed, for the notice.
 */
function commitImport(filing, draft, plan, choices, { unboxed = {} } = {}) {
  const incoming = json(draft);
  const people = plan.people.map((p) => ({ ...p, outcome: slotOutcome(p, choices) }));
  const list = Array.isArray(filing.planGuardians) ? 'planGuardians' : 'guardians';

  for (const [key, value] of Object.entries(incoming)) {
    if (KEPT_KEYS.includes(key)) continue;
    if (key === list && Array.isArray(value)) {
      // A guardian row of the same person keeps what the source can't carry
      // (signature choice, stamp, the certificate tick); someone else's
      // starts from the source's row alone.
      filing[key] = value.map((row, i) => {
        const p = people.find((x) => x.role === 'guardian' && x.index === i);
        const old = (filing[key] || [])[i];
        return p?.outcome.isSame && old && typeof old === 'object' ? { ...old, ...row } : row;
      });
      continue;
    }
    filing[key] = value;
  }

  const updated = [], unlinked = [];
  for (const p of people) {
    if (!p.outcome.isSame) {
      // A different person in a role kept outside the source's rows: the
      // details the source can't carry belonged to the one before.
      for (const key of unboxed[p.role] || []) if (key in filing) filing[key] = '';
    }
    if (p.outcome.link === 'unlink') { setPartyIdForSlot(filing, p.role, p.index, null); unlinked.push(p); }
    if (p.outcome.link === 'update') {
      const party = resolveParty(p.partyId);
      dehydrateIntoParty(filing, p.role, p.index, party, p.differences.map((d) => d.key));
      for (const other of getCaseFile()?.wards || []) {
        if (other === filing || isFilingClosed(other)) continue;
        for (const slot of slotsReferencing(other, p.partyId)) hydrateFromParty(party, other, slot.role, slot.index);
      }
      updated.push(p);
    }
  }

  // A schedule the import fills is no longer declared empty.
  const cleared = [];
  for (const [key, value] of Object.entries(incoming)) {
    if (!Array.isArray(value) || !value.some((row) => rowStarted(row))) continue;
    const tick = noItemsKeyFor(filing.inventoryType, key);
    if (tick && filing.scheduleNoItems?.[tick]) { filing.scheduleNoItems[tick] = false; cleared.push(tick); }
  }
  return { updated, unlinked, cleared, people };
}

function describeNotice(plan, result, { sourceName, notCarried }) {
  const lines = [`Imported ${sourceName || 'the workbook'} into ${plan.filingName || 'this filing'}.`];
  if (result.updated.length) lines.push(`Shared records updated: ${result.updated.map((p) => p.after || p.before).join(', ')}.`);
  if (result.unlinked.length) lines.push(`No longer shared on this filing: ${result.unlinked.map((p) => `${p.label} (${p.sharedName || p.before})`).join(', ')}.`);
  if (plan.typeDiffers) lines.push(`This filing stays a ${filingLabel(plan.filingType)}; the workbook is marked ${filingLabel(plan.typeDiffers.source)}.`);
  const kept = ['the signature rule', 'the signature choices and stamps of the same people'];
  if (notCarried && notCarried.length) kept.push(...notCarried);
  lines.push(`Kept as they were: ${kept.join('; ')}.`);
  return lines.join('\n');
}

/**
 * Runs an import as one transaction.
 *
 * @param {object} options
 * @param {Record<string, any>} options.filing  the filing the import replaces (the live object)
 * @param {() => Promise<{ draft: Record<string, any>, sourceName?: string, workbookType?: string, notCarried?: string[], unboxed?: Record<string, string[]> }>} options.adapter
 * @param {(plan: ReturnType<typeof planImport>) => Promise<Record<string, string> | null>} options.confirmChoices
 *   the one confirmation: the filer's choice for each conflict, or null for Cancel
 * @param {() => Promise<void>|void} [options.redraw]  redraws the page after the commit
 * @param {(notice: string) => Promise<void>|void} [options.notify]  shows the notice after the redraw
 * @param {(filing: Record<string, any>) => void} [options.afterCommit]  a migration the source's form needs (the bond answer)
 * @returns {Promise<{ committed: boolean, plan?: ReturnType<typeof planImport>, notice?: string }>}
 */
export async function runImportTransaction({ filing, adapter, confirmChoices, redraw, notify, afterCommit }) {
  const read = await adapter();
  const draft = json(read.draft || {});
  const plan = planImport(filing, draft, { workbookType: read.workbookType });
  const choices = await confirmChoices(plan);
  if (!choices) return { committed: false, plan };
  const unanswered = plan.conflicts.filter((c) => conflictApplies(c, choices) && !c.options.some((o) => o.value === choices[c.id]));
  if (unanswered.length) throw new Error(`Import not applied: no choice for ${unanswered.map((c) => c.id).join(', ')}.`);

  const result = commitImport(filing, draft, plan, choices, { unboxed: read.unboxed });
  normalizeWardData(filing);
  afterCommit?.(filing);
  commitModelChange('excel-import', ['*']);
  await auditLog('DATA_IMPORT', `Imported ${read.sourceName || 'a workbook'} into ${filing.wardName || 'a filing'} (${filingLabel(filing.inventoryType)}): ${plan.fieldChanges.length} field(s) replaced`
    + (result.updated.length ? `; shared records updated: ${result.updated.length}` : '')
    + (result.unlinked.length ? `; unlinked: ${result.unlinked.length}` : ''), true, filing.wardId || null);
  await redraw?.();
  const notice = describeNotice(plan, result, { sourceName: read.sourceName, notCarried: read.notCarried });
  await notify?.(notice);
  return { committed: true, plan, notice };
}
