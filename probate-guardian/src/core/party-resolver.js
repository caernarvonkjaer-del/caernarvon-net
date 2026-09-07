// Hydration/dehydration core for the shared party-record model (persistence
// rewrite Milestone 3). NOT wired to anything yet -- afterChange() doesn't
// call syncIdentityField() until Milestone 4, and no filing has a non-null
// party FK until the party picker (also later) sets one. This file exists so
// that mechanism can be proven independently first, against hand-built
// parties and filings, before any UI depends on it.
//
// legacy-app.js is a classic (non-module) script (see src/core/state.js's
// file header for why), so this reaches into `window.*` directly rather than
// importing from another module -- the same convention every other file in
// src/core/ already uses.

/** Follows a merge tombstone (see the de-dup screen, a later phase) to the surviving party. */
export function resolveParty(partyId) {
  const caseFile = window.caseFile;
  if (!partyId || !caseFile || !Array.isArray(caseFile.parties)) return null;
  const party = caseFile.parties.find(p => p.id === partyId) || null;
  if (party && party.mergedInto) return resolveParty(party.mergedInto);
  return party;
}

function newPartyId() {
  if (globalThis.crypto && typeof globalThis.crypto.randomUUID === 'function') return globalThis.crypto.randomUUID();
  return 'party-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2);
}

/** Creates a blank party with the given role already set, appends it to caseFile.parties, and returns it. */
export function createParty(role) {
  const caseFile = window.caseFile;
  const now = new Date().toISOString();
  const party = {
    id: newPartyId(),
    roles: role ? [role] : [],
    name: '',
    identifiers: { taxId: null, barNumber: null },
    phone: null,
    email: null,
    secondaryEmail: null,
    address: { street: '', cityStateZip: '' },
    officeAddress: null,
    notes: null,
    createdAt: now,
    updatedAt: now,
    mergedInto: null,
  };
  if (caseFile && Array.isArray(caseFile.parties)) caseFile.parties.push(party);
  return party;
}

// ── Per-type, per-role field correspondence ────────────────────────────────
// Ward identity itself needs no entry here -- every type stores it as the
// single flat field `wardName`, with no other contact fields, so
// readRoleFields()/writeRoleFields() special-case role==='ward' directly
// rather than needing the container machinery below at all.
//
// Three container shapes exist across the 7 form types:
//   'array'  -- a row lives at filing[field][index] (guardian rows)
//   'object' -- a single nested object at filing[field] (some attorney/preparer)
//   'flat'   -- fields live directly on the filing as their own top-level
//               keys, named explicitly in `keys` below (no indirection) --
//               this covers every type's attorney_*/preparer_* convention,
//               which is NOT a fixed prefix (attorney_bar vs attorney_
//               barNumber, attorney_secondary_email vs attorney_secondaryEmail)
// `joinedAddress` (only on planSimplified's guardian rows) names a field
// that holds "street, cityStateZip" as one joined string instead of two.
const ROLE_FIELD_MAPS = {
  guardian: { // Initial Inventory
    guardian: { container: { type: 'array', field: 'guardians' },
      keys: { name: 'name', taxId: 'ssnEin', phone: 'phone', street: 'streetAddress', cityStateZip: 'cityStateZip' } },
    attorney: { container: { type: 'object', field: 'attorney' },
      keys: { name: 'name', barNumber: 'barNumber', phone: 'phone', email: 'email', secondaryEmail: 'secondaryEmail', street: 'streetAddress', cityStateZip: 'cityStateZip' } },
    preparer: { container: { type: 'object', field: 'preparer' },
      keys: { name: 'name', taxId: 'ssnEin', phone: 'phone', street: 'streetAddress', cityStateZip: 'cityStateZip' } },
  },
  simplified: {
    guardian: { container: { type: 'array', field: 'guardians' },
      keys: { name: 'name', taxId: 'ssn', phone: 'phone', email: 'email', street: 'mailingStreet', cityStateZip: 'mailingCityStateZip' } },
    attorney: { container: { type: 'flat' },
      keys: { name: 'attorney', barNumber: 'attorney_barNumber', phone: 'attorney_phone', email: 'attorney_email', secondaryEmail: 'attorney_secondaryEmail', street: 'attorney_street', cityStateZip: 'attorney_cityStateZip' } },
    preparer: null, // this type has no preparer
  },
  annual: { // also finalAccounting/trustAccounting via formEngine()
    guardian: { container: { type: 'array', field: 'guardians' },
      keys: { name: 'name', taxId: 'ssn', phone: 'phone', email: 'email', street: 'mailingStreet', cityStateZip: 'mailingCityStateZip', officeStreet: 'officeStreet', officeCityStateZip: 'officeCityStateZip' } },
    attorney: { container: { type: 'flat' },
      keys: { name: 'attorney', barNumber: 'attorney_bar', phone: 'attorney_phone', email: 'attorney_email', secondaryEmail: 'attorney_secondaryEmail', street: 'attorney_street', cityStateZip: 'attorney_cityStateZip' } },
    preparer: { container: { type: 'object', field: 'preparer' },
      keys: { name: 'name', taxId: 'ssn', phone: 'phone', street: 'street', cityStateZip: 'cityStateZip' } },
  },
  planInitial: {
    guardian: { container: { type: 'array', field: 'planGuardians' },
      keys: { name: 'name', taxId: 'ssn', phone: 'phone', street: 'street', cityStateZip: 'cityStateZip' } },
    attorney: { container: { type: 'flat' },
      keys: { name: 'attorney_name', barNumber: 'attorney_bar', phone: 'attorney_phone', email: 'attorney_email', secondaryEmail: 'attorney_secondaryEmail', street: 'attorney_street', cityStateZip: 'attorney_cityStateZip' } },
    preparer: null,
  },
  planSimplified: {
    guardian: { container: { type: 'array', field: 'planGuardians' },
      keys: { name: 'name', phone: 'phone', email: 'email' }, joinedAddress: 'mailingAddress' },
    attorney: { container: { type: 'flat' },
      keys: { name: 'attorney_name', barNumber: 'attorney_bar', phone: 'attorney_phone', email: 'attorney_email', secondaryEmail: 'attorney_secondary_email', street: 'attorney_street', cityStateZip: 'attorney_cityStateZip' } },
    preparer: { container: { type: 'flat' },
      keys: { name: 'preparer_name', phone: 'preparer_phone', email: 'preparer_email', street: 'preparer_mailingStreet', cityStateZip: 'preparer_cityStateZip' } },
  },
  planAnnual: {
    guardian: { container: { type: 'array', field: 'planGuardians' },
      keys: { name: 'name', taxId: 'ssn', phone: 'phone', email: 'email', street: 'mailingStreet', cityStateZip: 'mailingCityStateZip', officeStreet: 'officeStreet', officeCityStateZip: 'officeCityStateZip' } },
    attorney: { container: { type: 'flat' },
      keys: { name: 'attorney', barNumber: 'attorney_bar', phone: 'attorney_phone', email: 'attorney_email', secondaryEmail: 'attorney_secondary_email', street: 'attorney_street', cityStateZip: 'attorney_cityStateZip' } },
    preparer: null,
  },
  planMinor: {
    guardian: { container: { type: 'array', field: 'planGuardians' },
      keys: { name: 'name', taxId: 'tin', phone: 'phone', email: 'email', street: 'mailingStreet', cityStateZip: 'mailingCityStateZip' } },
    attorney: { container: { type: 'flat' },
      keys: { name: 'attorney_name', barNumber: 'attorney_bar', phone: 'attorney_phone', email: 'attorney_email', secondaryEmail: 'attorney_secondary_email', street: 'attorney_street', cityStateZip: 'attorney_cityStateZip' } },
    preparer: { container: { type: 'flat' },
      keys: { name: 'preparer_name', taxId: 'preparer_tin', phone: 'preparer_phone', email: 'preparer_email', street: 'preparer_mailingStreet', cityStateZip: 'preparer_cityStateZip' } },
  },
};

function engineTypeFor(filing) {
  const type = filing && filing.inventoryType;
  return window.formEngine ? window.formEngine(type) : type;
}

function roleConfigFor(filing, role) {
  const engine = engineTypeFor(filing);
  const forType = ROLE_FIELD_MAPS[engine];
  return (forType && forType[role]) || null;
}

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Reverse lookup: given a data-form-path/data-bind path that was just
 * written (e.g. "planGuardians.0.ssn", "attorney_bar", "attorney.phone"),
 * returns the {role, index} identity slot it falls inside for this filing's
 * type, or null if the path isn't part of any identity slot at all (the
 * common case -- most fields on a form are schedules/Q&A/totals, not
 * identity). Built from the same ROLE_FIELD_MAPS table readRoleFields()/
 * writeRoleFields() use, so there is exactly one place that knows which
 * fields are "identity" for a given type.
 */
export function identitySlotForPath(filing, path) {
  if (!filing || !path) return null;
  if (path === 'wardName') return { role: 'ward', index: 0 };
  const engine = engineTypeFor(filing);
  const forType = ROLE_FIELD_MAPS[engine];
  if (!forType) return null;
  for (const role of ['guardian', 'attorney', 'preparer']) {
    const config = forType[role];
    if (!config) continue;
    const { container, keys, joinedAddress } = config;
    const fieldNames = new Set(Object.values(keys));
    if (joinedAddress) fieldNames.add(joinedAddress);
    if (container.type === 'array') {
      const m = path.match(new RegExp('^' + escapeRegExp(container.field) + '\\.(\\d+)\\.(.+)$'));
      if (m && fieldNames.has(m[2])) return { role, index: Number(m[1]) };
    } else if (container.type === 'object') {
      const prefix = container.field + '.';
      if (path.startsWith(prefix) && fieldNames.has(path.slice(prefix.length))) return { role, index: 0 };
    } else if (fieldNames.has(path)) { // 'flat'
      return { role, index: 0 };
    }
  }
  return null;
}

/** Reads a role's fields off a filing into the flat shape hydrate/dehydrate share. Returns {} if this type/role has no mapping (e.g. simplified has no preparer). */
export function readRoleFields(filing, role, index = 0) {
  if (role === 'ward') return { name: filing && filing.wardName || '' };
  const config = roleConfigFor(filing, role);
  if (!config) return {};
  const { container, keys, joinedAddress } = config;
  let sub;
  if (container.type === 'array') sub = ((filing[container.field] || [])[index]) || {};
  else if (container.type === 'object') sub = filing[container.field] || {};
  else sub = filing; // 'flat' -- keys name exact top-level fields already

  const out = {};
  for (const flatKey of ['name', 'taxId', 'barNumber', 'phone', 'email', 'secondaryEmail', 'street', 'cityStateZip', 'officeStreet', 'officeCityStateZip']) {
    if (keys[flatKey]) out[flatKey] = sub[keys[flatKey]] || '';
  }
  if (joinedAddress) {
    const raw = String(sub[joinedAddress] || '');
    const i = raw.indexOf(', ');
    out.street = i === -1 ? raw : raw.slice(0, i);
    out.cityStateZip = i === -1 ? '' : raw.slice(i + 2);
  }
  return out;
}

/** Writes the flat shape back into a filing's role fields. No-ops if this type/role has no mapping. */
export function writeRoleFields(filing, role, index, fields) {
  if (role === 'ward') { filing.wardName = fields.name || ''; return; }
  const config = roleConfigFor(filing, role);
  if (!config) return;
  const { container, keys, joinedAddress } = config;
  let sub;
  if (container.type === 'array') {
    if (!Array.isArray(filing[container.field])) filing[container.field] = [];
    if (!filing[container.field][index]) filing[container.field][index] = {};
    sub = filing[container.field][index];
  } else if (container.type === 'object') {
    if (!filing[container.field]) filing[container.field] = {};
    sub = filing[container.field];
  } else {
    sub = filing;
  }

  // joinedAddress roles simply omit `street`/`cityStateZip` from `keys`
  // (see the config table above), so this loop already leaves them alone.
  for (const flatKey of ['name', 'taxId', 'barNumber', 'phone', 'email', 'secondaryEmail', 'street', 'cityStateZip', 'officeStreet', 'officeCityStateZip']) {
    if (keys[flatKey] && fields[flatKey] !== undefined) {
      sub[keys[flatKey]] = fields[flatKey];
    }
  }
  if (joinedAddress) {
    sub[joinedAddress] = [fields.street, fields.cityStateZip].filter(Boolean).join(', ');
  }
}

// ── Party <-> flat-fields conversion ───────────────────────────────────────
function partyToFlatFields(party) {
  if (!party) return {};
  return {
    name: party.name || '',
    taxId: (party.identifiers && party.identifiers.taxId) || '',
    barNumber: (party.identifiers && party.identifiers.barNumber) || '',
    phone: party.phone || '',
    email: party.email || '',
    secondaryEmail: party.secondaryEmail || '',
    street: (party.address && party.address.street) || '',
    cityStateZip: (party.address && party.address.cityStateZip) || '',
    officeStreet: (party.officeAddress && party.officeAddress.street) || '',
    officeCityStateZip: (party.officeAddress && party.officeAddress.cityStateZip) || '',
  };
}

/** Merges non-empty flat fields onto a party's canonical (nested) shape. Only overwrites fields actually present in `fields`. */
function mergeFlatFieldsIntoParty(party, fields) {
  if (fields.name !== undefined) party.name = fields.name;
  if (fields.taxId !== undefined) { party.identifiers = party.identifiers || {}; party.identifiers.taxId = fields.taxId || null; }
  if (fields.barNumber !== undefined) { party.identifiers = party.identifiers || {}; party.identifiers.barNumber = fields.barNumber || null; }
  if (fields.phone !== undefined) party.phone = fields.phone || null;
  if (fields.email !== undefined) party.email = fields.email || null;
  if (fields.secondaryEmail !== undefined) party.secondaryEmail = fields.secondaryEmail || null;
  if (fields.street !== undefined || fields.cityStateZip !== undefined) {
    party.address = party.address || { street: '', cityStateZip: '' };
    if (fields.street !== undefined) party.address.street = fields.street;
    if (fields.cityStateZip !== undefined) party.address.cityStateZip = fields.cityStateZip;
  }
  if (fields.officeStreet !== undefined || fields.officeCityStateZip !== undefined) {
    party.officeAddress = party.officeAddress || { street: '', cityStateZip: '' };
    if (fields.officeStreet !== undefined) party.officeAddress.street = fields.officeStreet;
    if (fields.officeCityStateZip !== undefined) party.officeAddress.cityStateZip = fields.officeCityStateZip;
  }
}

/** Hydrate direction: party -> filing. Overwrites this role's fields on the filing with the party's current values. */
export function hydrateFromParty(party, filing, role, index = 0) {
  writeRoleFields(filing, role, index, partyToFlatFields(party));
}

/** Dehydrate direction: filing -> party. Reads this role's current fields off the filing and merges them onto the party. */
export function dehydrateIntoParty(filing, role, index, party) {
  mergeFlatFieldsIntoParty(party, readRoleFields(filing, role, index));
  party.updatedAt = new Date().toISOString();
}

// ── FK bookkeeping ─────────────────────────────────────────────────────────
/** Reads the party id a filing's role/index slot currently points at, or null. */
export function getPartyIdForSlot(filing, role, index = 0) {
  if (!filing) return null;
  if (role === 'ward') return filing.wardPartyId || null;
  if (role === 'attorney') return filing.attorneyPartyId || null;
  if (role === 'preparer') return filing.preparerPartyId || null;
  if (role === 'guardian') return (filing.guardianPartyIds || [])[index] || null;
  return null;
}

/** Points a filing's role/index slot at a party id (or clears it with null). */
export function setPartyIdForSlot(filing, role, index, partyId) {
  if (!filing) return;
  if (role === 'ward') { filing.wardPartyId = partyId; return; }
  if (role === 'attorney') { filing.attorneyPartyId = partyId; return; }
  if (role === 'preparer') { filing.preparerPartyId = partyId; return; }
  if (role === 'guardian') {
    if (!Array.isArray(filing.guardianPartyIds)) filing.guardianPartyIds = [];
    filing.guardianPartyIds[index] = partyId;
  }
}

/** Every {role, index} slot on a filing that currently references the given party id. */
export function slotsReferencing(filing, partyId) {
  if (!filing || !partyId) return [];
  const slots = [];
  if (filing.wardPartyId === partyId) slots.push({ role: 'ward', index: 0 });
  if (filing.attorneyPartyId === partyId) slots.push({ role: 'attorney', index: 0 });
  if (filing.preparerPartyId === partyId) slots.push({ role: 'preparer', index: 0 });
  (filing.guardianPartyIds || []).forEach((id, i) => { if (id === partyId) slots.push({ role: 'guardian', index: i }); });
  return slots;
}

// ── The orchestrator (not wired to afterChange() until Milestone 4) ───────
/**
 * Called after a user edits something inside a known identity slot (a
 * guardian row, attorney block, preparer block, or ward-identity field).
 * Dehydrates the filing's just-edited values into the party it's linked to
 * (that edit wins -- it's what triggered this), then hydrates that party's
 * now-current values into every OTHER slot (on this filing or any other)
 * that references the same party. A no-op if this slot has no party
 * attached yet -- the filing's own copy stays authoritative until one is.
 *
 * Deliberately does not call autoSave() itself: the edit that triggered
 * this already goes through the normal persistFormControl()/bindForms()
 * write path, which calls autoSave() on its own. markDirtySinceExport() is
 * still called directly so the flag is set even if some future caller
 * doesn't happen to go through that path.
 */
export function syncIdentityField(filing, role, index = 0) {
  const partyId = getPartyIdForSlot(filing, role, index);
  if (!partyId) return;
  const party = resolveParty(partyId);
  if (!party) return;
  dehydrateIntoParty(filing, role, index, party);

  const caseFile = window.caseFile;
  if (caseFile && Array.isArray(caseFile.wards)) {
    for (const other of caseFile.wards) {
      for (const slot of slotsReferencing(other, partyId)) {
        if (other === filing && slot.role === role && slot.index === index) continue; // already current
        hydrateFromParty(party, other, slot.role, slot.index);
      }
    }
  }
  if (window.markDirtySinceExport) window.markDirtySinceExport();
}

// Bridged onto window for legacy-app.js (classic script) and for e2e tests
// to call directly -- see this file's header comment.
window.resolveParty = resolveParty;
window.createParty = createParty;
window.identitySlotForPath = identitySlotForPath;
window.readRoleFields = readRoleFields;
window.writeRoleFields = writeRoleFields;
window.hydrateFromParty = hydrateFromParty;
window.dehydrateIntoParty = dehydrateIntoParty;
window.getPartyIdForSlot = getPartyIdForSlot;
window.setPartyIdForSlot = setPartyIdForSlot;
window.slotsReferencing = slotsReferencing;
window.syncIdentityField = syncIdentityField;
