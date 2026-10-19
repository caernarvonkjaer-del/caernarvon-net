// Milestone 76A (decision 76A-2, the requester's, 2026-10-19): two tabs or
// windows on one case file merge their saves filing by filing.
//
// Every tab writes the whole case. Before 76A a tab simply wrote its copy, so
// a tab that had Ward A open undid every save the tab on Ward B had made since
// -- Milestone 16 allows exactly that pair of tabs ("Ward A open in tab 1 and
// Ward B open in tab 2"). Now a save first reads the file again and compares,
// record by record, three copies: what this tab last read from or wrote to
// the file (its base), this tab's copy, and the file's. A record only this tab
// changed keeps this tab's copy; one only the file changed takes the file's;
// one both changed differently is a conflict -- the file keeps its copy, this
// tab keeps its own, and the filer is asked (case-file.js). Records are the
// filings, the shared people and the cases; the guardian's name and the "not
// the same person" list merge as wholes. No stored field is needed: a record
// changed when its fingerprint (a SHA-256 of it, without the save stamp
// `lastModified`) differs from the base's.
//
// This module is the pure part -- fingerprints and the decision -- plus the
// base itself, which case-reader.js sets when a file is read and case-file.js
// when one is written.

/** The lists merged record by record, and the field that names a record. */
export const MERGED_LISTS = Object.freeze({ wards: 'wardId', parties: 'id', cases: 'id' });

function stableText(value) {
  return JSON.stringify(value === undefined ? null : value, (k, v) => (k === 'lastModified' ? undefined : v));
}

async function digest(text) {
  const hash = await globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(hash), (b) => b.toString(16).padStart(2, '0')).join('');
}

/** The records a save writes and a merge compares, taken from a case. */
export function caseRecords(caseFile) {
  const c = caseFile || {};
  return {
    wards: Array.isArray(c.wards) ? c.wards : [],
    parties: Array.isArray(c.parties) ? c.parties : [],
    cases: Array.isArray(c.cases) ? c.cases : [],
    dismissedPartyPairs: Array.isArray(c.dismissedPartyPairs) ? c.dismissedPartyPairs : [],
    guardianName: c.guardianName || '',
    guardianEmail: c.guardianEmail || '',
  };
}

/** A fingerprint of each record of a case (or of caseRecords()' result). */
export async function fingerprintCase(caseFile) {
  const r = caseRecords(caseFile);
  const fp = { guardian: '', dismissals: '' };
  for (const [list, idKey] of Object.entries(MERGED_LISTS)) {
    fp[list] = new Map();
    for (const record of r[list]) {
      const id = record && record[idKey];
      if (id != null && id !== '') fp[list].set(String(id), await digest(stableText(record)));
    }
  }
  fp.guardian = await digest(stableText({ guardianName: r.guardianName, guardianEmail: r.guardianEmail }));
  fp.dismissals = await digest(stableText(r.dismissedPartyPairs));
  return fp;
}

// What this tab last read from or wrote to its case file: { handle, fp, stat }.
// `handle` is the file it belongs to -- null for a file just read and not yet
// remembered (case-file.js's rememberCaseFileHandle() attaches it); `stat` is
// the file's size and time once this tab wrote it, so a save can tell, without
// reading it, that nothing has written it since.
let diskBase = null;

export function getDiskBase() {
  return diskBase;
}

export function setDiskBase(base) {
  diskBase = base || null;
}

/** A file was just read into the open case (case-reader.js). */
export function rememberReadContents(fp) {
  diskBase = { handle: null, fp, stat: null };
}

function pairKey(pair) {
  return JSON.stringify(pair);
}

/**
 * Decide each record. `base`, `mineFp` and `theirsFp` are fingerprints;
 * `mine` and `theirs` are caseRecords(). `pending` holds the keys
 * (`wards:<id>`) of conflicts the filer has not answered yet: the file keeps
 * its copy of each until they do, even once this tab wrote it there.
 * `activeWardId` is the filing open in this tab, which a merge never closes
 * underneath the filer (a deletion of it elsewhere is asked).
 * Returns the records this tab keeps (`next`), the records to write (`written`:
 * the same, but the file's copy of each unresolved conflict), the conflicts,
 * and which records came from the file (`pulled`).
 */
export function mergeCase({ base, mine, mineFp, theirs, theirsFp, pending = new Set(), activeWardId = null }) {
  const next = { ...mine };
  const written = { ...mine };
  const conflicts = [];
  const pulled = [];
  for (const [list, idKey] of Object.entries(MERGED_LISTS)) {
    const mineById = new Map(mine[list].filter((r) => r && r[idKey] != null).map((r) => [String(r[idKey]), r]));
    const theirsById = new Map(theirs[list].filter((r) => r && r[idKey] != null).map((r) => [String(r[idKey]), r]));
    const ids = [...mineById.keys(), ...[...theirsById.keys()].filter((id) => !mineById.has(id))];
    const nextList = [];
    const writtenList = [];
    for (const id of ids) {
      const key = `${list}:${id}`;
      const b = base[list].get(id);
      const m = mineFp[list].get(id);
      const t = theirsFp[list].get(id);
      const mineRecord = mineById.get(id) || null;
      const theirsRecord = theirsById.get(id) || null;
      let decision;
      if (m === t) decision = 'mine';
      else if (pending.has(key)) decision = 'conflict';
      else if (t === b) decision = 'mine';
      else if (m === b && !(list === 'wards' && id === activeWardId && !theirsRecord)) decision = 'theirs';
      else decision = 'conflict';
      if (decision === 'mine') {
        if (mineRecord) { nextList.push(mineRecord); writtenList.push(mineRecord); }
      } else if (decision === 'theirs') {
        if (theirsRecord) { nextList.push(theirsRecord); writtenList.push(theirsRecord); }
        pulled.push({ list, id, record: theirsRecord });
      } else {
        if (mineRecord) nextList.push(mineRecord);
        if (theirsRecord) writtenList.push(theirsRecord);
        conflicts.push({ key, list, id, mine: mineRecord, theirs: theirsRecord });
      }
    }
    next[list] = nextList;
    written[list] = writtenList;
  }
  // The guardian's name and email: this tab's if it changed them, else the file's.
  if (theirsFp.guardian !== base.guardian && mineFp.guardian === base.guardian) {
    next.guardianName = written.guardianName = theirs.guardianName;
    next.guardianEmail = written.guardianEmail = theirs.guardianEmail;
  }
  // "Not the same person" decisions: one list, merged whole.
  if (theirsFp.dismissals !== base.dismissals) {
    let pairs = theirs.dismissedPartyPairs;
    if (mineFp.dismissals !== base.dismissals) {
      const seen = new Set(mine.dismissedPartyPairs.map(pairKey));
      pairs = [...mine.dismissedPartyPairs, ...theirs.dismissedPartyPairs.filter((p) => !seen.has(pairKey(p)))];
    }
    next.dismissedPartyPairs = written.dismissedPartyPairs = pairs;
  }
  return { next, written, conflicts, pulled };
}
