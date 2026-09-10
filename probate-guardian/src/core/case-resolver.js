// Case entity (persistence rewrite Milestone 6) -- mirrors src/core/
// party-resolver.js's shape and window-bridge convention exactly. A Case
// groups several Filings (still internally called "wards", see this
// rewrite's plan for why that wasn't renamed) that belong to the same
// real-world guardianship matter under one court case number, replacing the
// dashboard's original exact-caseNumber-string-match grouping with a real,
// ID-backed one that survives a case number being edited later on only one
// of the linked filings.
//
// Case linking is always an explicit user action (the Add Ward carry-source
// picker, or the "Link to Case" picker) -- never inferred automatically from
// two filings happening to share typed text, the same design rule party
// linking follows and for the same reason (silent, fragile, invisible
// grouping was the whole problem this rewrite exists to fix).

function newCaseId() {
  if (globalThis.crypto && typeof globalThis.crypto.randomUUID === 'function') return globalThis.crypto.randomUUID();
  return 'case-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2);
}

/** Follows nothing (Cases have no merge/tombstone concept, unlike parties) -- just a null-safe lookup by id. */
export function resolveCase(caseId) {
  const caseFile = window.caseFile;
  if (!caseId || !caseFile || !Array.isArray(caseFile.cases)) return null;
  return caseFile.cases.find(c => c.id === caseId) || null;
}

/** planMinor alone stores its case number as `ucn`, with `ref` (a distinct, independently-editable
 * secondary reference) as fallback -- matching dashboard/view-model.js's own `caseNumber || ucn || ref`
 * precedence -- so a filing that only has `ref` filled in still resolves to a case. Every other type uses
 * `caseNumber`. */
export function caseNumberOf(ward) {
  if (!ward) return '';
  return ward.inventoryType === 'planMinor' ? (ward.ucn || ward.ref || '') : (ward.caseNumber || '');
}

export function countyOf(ward) {
  return (ward && ward.county) || '';
}

/** Creates a new Case, appends it to caseFile.cases, and returns it. */
export function createCase({ caseNumber = '', county = '' } = {}) {
  const caseFile = window.caseFile;
  const now = new Date().toISOString();
  const kase = {
    id: newCaseId(),
    caseNumber: caseNumber || '',
    county: county || '',
    wardPartyId: null,
    createdAt: now,
    updatedAt: now,
  };
  if (caseFile && Array.isArray(caseFile.cases)) caseFile.cases.push(kase);
  return kase;
}

/**
 * Returns the Case a ward is linked to, creating one from the ward's current
 * case number/county if it doesn't have one yet. Does NOT search other wards
 * for a matching case number -- see this file's header comment.
 */
export function getOrCreateCaseForWard(ward) {
  if (!ward) return null;
  if (ward.caseId) {
    const existing = resolveCase(ward.caseId);
    if (existing) return existing;
  }
  const kase = createCase({ caseNumber: caseNumberOf(ward), county: countyOf(ward) });
  if (!kase.wardPartyId && ward.wardPartyId) kase.wardPartyId = ward.wardPartyId;
  ward.caseId = kase.id;
  return kase;
}

/**
 * Groups a list of wards for the dashboard's "Grouped by Case" view. Wards
 * with a real caseId group by that id (resolved via resolveCase, so an
 * edited case number on only one linked filing doesn't split the group).
 * Wards without one fall back to the exact-caseNumber-string match the
 * dashboard has always used -- unlinked filings behave exactly as before.
 * Returns [{ key, caseNumber, wards }], same shape renderCaseWardSections()
 * already builds internally.
 */
export function casesGroupingWards(wards) {
  const groups = new Map();
  for (const ward of wards) {
    let key, caseNumber;
    if (ward.caseId) {
      const kase = resolveCase(ward.caseId);
      key = `id:${ward.caseId}`;
      caseNumber = (kase && kase.caseNumber) || caseNumberOf(ward);
    } else {
      const c = caseNumberOf(ward).trim();
      key = c ? `num:${c}` : `solo:${ward.wardId}`;
      caseNumber = c;
    }
    if (!groups.has(key)) groups.set(key, { key, caseNumber, wards: [] });
    groups.get(key).wards.push(ward);
  }
  return [...groups.values()];
}

// Bridged onto window for legacy-app.js (classic script) and for e2e tests
// to call directly -- see this file's header comment.
window.resolveCase = resolveCase;
window.caseNumberOf = caseNumberOf;
window.countyOf = countyOf;
window.createCase = createCase;
window.getOrCreateCaseForWard = getOrCreateCaseForWard;
window.casesGroupingWards = casesGroupingWards;
