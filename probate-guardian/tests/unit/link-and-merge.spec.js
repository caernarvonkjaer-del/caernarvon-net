// Milestone 73E part 2 (decision 73E-N3): Link Person and Merge through the
// shared records.
//
// Link Person used to hydrate the slot wholesale from the shared record --
// every field, blanks included -- so a phone typed on the filing was replaced
// and a detail the record lacked was blanked. Now the record fills only the
// slot's blanks, a typed detail it holds differently is replaced only when
// the filer chooses the record's, nothing typed is ever blanked, and the
// record takes what it lacks from the slot. Merge's confirmation names the
// open filings whose typed details it will change (mergeFilingChanges(),
// which shares the merge's own adoption step).
//
// Red-first: linkConflicts(), linkSlotToParty() and mergeFilingChanges()
// don't exist; Link Person overwrote and blanked.
import { beforeEach, describe, expect, test, vi } from 'vitest';

vi.hoisted(() => { globalThis.window = globalThis.window || {}; });
vi.mock('../../src/core/navigation/tab-state.js', () => ({ notifyProbateGuardianTabStateChanged: () => {}, getProbateGuardianTabState: () => ({}) }));
import {
  createParty, getPartyIdForSlot, linkConflicts, linkSlotToParty, LINK_FIELD_LABELS, mergeFilingChanges, mergeParties, readRoleFields, resolveParty, setPartyIdForSlot,
} from '../../src/core/party-resolver.js';
import { getCaseFile, replaceCaseFile } from '../../src/core/state.js';

beforeEach(() => {
  replaceCaseFile({ guardianName: '', guardianEmail: '', wards: [], parties: [], cases: [], dismissedPartyPairs: [], activeWardId: null });
});

// The Annual's guardian card keeps its address as mailingStreet / mailingCityStateZip.
const annual = (guardian) => ({ wardId: `w${Math.random()}`, wardName: 'Pat Ward', inventoryType: 'annual', guardians: [{ name: '', ssn: '', phone: '', email: '', mailingStreet: '', mailingCityStateZip: '', ...guardian }], guardianPartyIds: [] });
const guardianParty = (fields) => {
  const party = createParty('guardian');
  Object.assign(party, { name: fields.name || '', phone: fields.phone || null, email: fields.email || null });
  if (fields.street || fields.cityStateZip) party.address = { street: fields.street || '', cityStateZip: fields.cityStateZip || '' };
  if (fields.taxId) party.identifiers = { taxId: fields.taxId, barNumber: null };
  return party;
};

describe('Link Person fills blanks and asks before replacing what was typed', () => {
  test('the differences it asks about: typed and held differently; blank on either side, or a difference of punctuation only, is not one', () => {
    const party = guardianParty({ name: 'Mary J. Smith', phone: '(727) 555-0100', email: 'mary@example.com' });
    const filing = annual({ name: 'Mary Smith', phone: '727-555-0100', email: '' });
    const conflicts = linkConflicts(party, filing, 'guardian', 0);
    expect(conflicts).toEqual([{ key: 'name', typed: 'Mary Smith', shared: 'Mary J. Smith' }]);
    expect(LINK_FIELD_LABELS.name).toBe('Name');
  });

  test('keeping what was typed: only the blanks are filled; nothing typed changes; the record takes what it lacked', () => {
    const party = guardianParty({ name: 'Mary J. Smith', email: 'mary@example.com' });
    const filing = annual({ name: 'Mary Smith', phone: '727-555-0199', mailingStreet: '1 Oak St' });
    getCaseFile().wards.push(filing);
    setPartyIdForSlot(filing, 'guardian', 0, party.id);
    linkSlotToParty(party, filing, 'guardian', 0, { replace: false });
    const slot = readRoleFields(filing, 'guardian', 0);
    expect(slot.name, 'typed, kept').toBe('Mary Smith');
    expect(slot.phone, 'typed, kept -- the record had none, and it used to be blanked').toBe('727-555-0199');
    expect(slot.email, 'blank, filled from the record').toBe('mary@example.com');
    expect(slot.street).toBe('1 Oak St');
    expect(resolveParty(party.id).phone, 'the record takes what it lacked').toBe('727-555-0199');
    expect(resolveParty(party.id).name, "the record's own value is not overwritten").toBe('Mary J. Smith');
  });

  test("choosing the record's: a typed detail held differently is replaced; still nothing is blanked", () => {
    const party = guardianParty({ name: 'Mary J. Smith' });
    const filing = annual({ name: 'Mary Smith', phone: '727-555-0199' });
    linkSlotToParty(party, filing, 'guardian', 0, { replace: true });
    const slot = readRoleFields(filing, 'guardian', 0);
    expect(slot.name).toBe('Mary J. Smith');
    expect(slot.phone, 'the record holds no phone: the typed one stays').toBe('727-555-0199');
  });

  test('an empty slot takes the whole record, as linking always did', () => {
    const party = guardianParty({ name: 'Ann Lee', phone: '727-555-0101', street: '2 Elm St', cityStateZip: 'Clearwater, FL 33755' });
    const filing = annual({});
    expect(linkConflicts(party, filing, 'guardian', 0)).toEqual([]);
    linkSlotToParty(party, filing, 'guardian', 0);
    expect(readRoleFields(filing, 'guardian', 0)).toMatchObject({ name: 'Ann Lee', phone: '727-555-0101', street: '2 Elm St', cityStateZip: 'Clearwater, FL 33755' });
  });
});

// The requester, 2026-10-08 (found while building 73E part 2): the guardian's
// e-mail -- every form has had the box since Milestone 72C -- is part of the
// shared record on every form. The Initial Inventory's and the Initial Plan's
// was not, so it was neither shared with the guardian's other filings nor
// filled by Link Person. Red-first: those two forms read no e-mail.
describe("every form's guardian e-mail is part of the shared record", () => {
  test('all seven forms read and write it', async () => {
    const { initializeEmptyData } = await import('../../src/core/filing/filing-registry.js');
    const { FILING_TYPE_KEYS } = await import('../../src/core/filing/filing-descriptor.js');
    const { writeRoleFields } = await import('../../src/core/party-resolver.js');
    for (const type of FILING_TYPE_KEYS) {
      const d = { ...JSON.parse(JSON.stringify(initializeEmptyData(type))), inventoryType: type };
      const list = Array.isArray(d.planGuardians) ? 'planGuardians' : 'guardians';
      if (!Array.isArray(d[list]) || !d[list].length) d[list] = [{}];
      d[list][0].email = 'pat@example.com';
      expect(readRoleFields(d, 'guardian', 0).email, `${type} reads the guardian's e-mail`).toBe('pat@example.com');
      writeRoleFields(d, 'guardian', 0, { email: 'lee@example.com' });
      expect(d[list][0].email, `${type} writes it`).toBe('lee@example.com');
    }
  });
});

describe('Merge names the open filings whose typed details it will change', () => {
  test('each open filing linked to the record merged away, with the details that change; a closed one keeps its copy and is not listed', () => {
    const keep = guardianParty({ name: 'Mary J. Smith', phone: '727-555-0100' });
    const discard = guardianParty({ name: 'Mary Smith', email: 'mary@example.com' });
    const open = annual({ name: 'Mary Smith', phone: '727-555-0199', email: 'mary@example.com' });
    const closed = { ...annual({ name: 'Mary Smith', phone: '727-555-0199' }), archived: true };
    const same = annual({ name: 'Mary J. Smith', phone: '727-555-0100' });
    getCaseFile().wards.push(open, closed, same);
    setPartyIdForSlot(open, 'guardian', 0, discard.id);
    setPartyIdForSlot(closed, 'guardian', 0, discard.id);
    setPartyIdForSlot(same, 'guardian', 0, discard.id);

    const changes = mergeFilingChanges(keep.id, discard.id, { adoptBlankFields: true });
    expect(changes.map((c) => ({ filing: c.filing === open ? 'open' : c.filing === same ? 'same' : 'closed', role: c.role, index: c.index, fields: c.fields })))
      .toEqual([{ filing: 'open', role: 'guardian', index: 0, fields: ['name', 'phone'] }]);
    expect(resolveParty(keep.id).email, 'the preview changes nothing').toBe(null);

    mergeParties(keep.id, discard.id, { adoptBlankFields: true });
    expect(readRoleFields(open, 'guardian', 0)).toMatchObject({ name: 'Mary J. Smith', phone: '727-555-0100', email: 'mary@example.com' });
    expect(readRoleFields(closed, 'guardian', 0).phone, 'a closed filing keeps its copy').toBe('727-555-0199');
    expect(getPartyIdForSlot(closed, 'guardian', 0)).toBe(keep.id);
    expect(resolveParty(keep.id).email, 'adopted, as the preview said it would be').toBe('mary@example.com');
  });

  test('a merge that changes no typed detail lists nothing', () => {
    const keep = guardianParty({ name: 'Ann Lee', phone: '1' });
    const discard = guardianParty({ name: 'Ann Lee' });
    const filing = annual({ name: 'Ann Lee', phone: '' });
    getCaseFile().wards.push(filing);
    setPartyIdForSlot(filing, 'guardian', 0, discard.id);
    expect(mergeFilingChanges(keep.id, discard.id), 'a blank being filled is not a typed detail changing').toEqual([]);
    expect(mergeFilingChanges(keep.id, keep.id)).toEqual([]);
  });
});
