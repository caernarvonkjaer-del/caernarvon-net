// Milestone 40C-A: the ward-county lifecycle.
//
// The governing product decision: a ward has NO default county until the user
// selects County on that ward's first filing Cover. That first explicit choice
// is stored on the canonical ward Party. Later filings linked to the same ward
// Party start with that persisted county while still exposing it on their own
// Cover. No global, form-type, Pinellas, case-registry, or unrelated-source
// default may precede the first explicit choice.
//
// This lives in its own module, and deliberately NOT in party-resolver.js's
// syncIdentityField() fan-out, because that function propagates an edit to
// every OTHER slot referencing the same Party -- which for county would rewrite
// historical sibling filings that were correctly filed under a different
// county. County is a per-filing SNAPSHOT plus one canonical forward-looking
// value, not a field to keep identical everywhere.
//
// Terminology, because the codebase overloads "ward": an entry in
// `caseFile.wards[]` is a FILING. A ward Party (`caseFile.parties[]` with the
// 'ward' role) is the person. Several filings link to one ward Party via
// `filing.wardPartyId`; that is what makes a canonical county possible.

import { getCaseFile } from '../state.js';
import { FL_COUNTY_CIRCUIT } from '../pdf/circuit-lookup.js';
import { createParty, resolveParty, setPartyIdForSlot, getPartyIdForSlot, reconcileSlotWithParty, backfillWardPartyIdentity } from '../party-resolver.js';

/**
 * Canonical Florida county spelling for a user-entered value, or '' if it is
 * blank or not a Florida county. Case- and whitespace-insensitive, so a legacy
 * 'pinellas' and a typed 'PINELLAS' both normalize to 'Pinellas' and compare
 * equal -- which matters for the unanimity check below, where two spellings of
 * the same county must not read as a conflict.
 */
export function normalizeCountyName(value) {
  const trimmed = String(value ?? '').trim();
  if (!trimmed) return '';
  for (const key of Object.keys(FL_COUNTY_CIRCUIT)) {
    if (key.toLowerCase() === trimmed.toLowerCase()) return key;
  }
  return '';
}

/** Every filing in the case file linked to this ward Party id. */
function filingsForWardParty(partyId) {
  if (!partyId) return [];
  const caseFile = getCaseFile();
  return (caseFile?.wards || []).filter((w) => w && w.wardPartyId === partyId);
}

/**
 * The ward Party a filing is linked to, or null. Never guesses from the ward
 * NAME: two different people can share a name, and silently linking them would
 * merge two wards' counties (and identities) on a coincidence.
 */
export function wardPartyForFiling(filing) {
  const partyId = getPartyIdForSlot(filing, 'ward', 0);
  return partyId ? resolveParty(partyId) : null;
}

/**
 * The ward Party for a filing, creating and linking one if absent. Only called
 * from paths where the user has actually supplied ward identity (a Cover county
 * selection, or an explicit carryover source choice).
 */
export function ensureWardPartyForFiling(filing) {
  if (!filing) return null;
  const existing = wardPartyForFiling(filing);
  if (existing) return existing;
  const party = createParty('ward');
  if (!party) return null;
  setPartyIdForSlot(filing, 'ward', 0, party.id);
  reconcileSlotWithParty(filing, 'ward', 0); // name, and whatever else this type holds for the ward
  return party;
}

/** The canonical county stored on a filing's ward Party, or '' when none. */
export function wardPartyCounty(filing) {
  const party = wardPartyForFiling(filing);
  return normalizeCountyName(party?.county);
}

/**
 * Commits a county the user selected on a filing's Cover.
 *
 * Writes the filing's own snapshot and the ward Party's canonical value. A
 * LATER edit changes this filing and the Party's value for filings created
 * afterwards -- it must never rewrite existing sibling filings or
 * already-generated output, which remain auditable snapshots of what was filed.
 * Those siblings may then legitimately disagree, which is what the existing
 * county-drift advisory is for.
 *
 * Returns what happened, so callers can describe it accurately to the user:
 *   { county, established, changed, previousPartyCounty, siblingCount }
 */
export function commitCoverCounty(filing, rawCounty) {
  const county = normalizeCountyName(rawCounty);
  const result = {
    county,
    established: false,
    changed: false,
    previousPartyCounty: '',
    siblingCount: 0,
  };
  if (!filing || !county) return result;

  filing.county = county;

  const party = ensureWardPartyForFiling(filing);
  if (!party) return result;

  const previous = normalizeCountyName(party.county);
  result.previousPartyCounty = previous;
  result.siblingCount = filingsForWardParty(party.id).filter((w) => w !== filing).length;

  if (!previous) {
    party.county = county;
    party.updatedAt = new Date().toISOString();
    result.established = true;
  } else if (previous !== county) {
    // Forward-looking only. Siblings keep their own snapshots on purpose.
    party.county = county;
    party.updatedAt = new Date().toISOString();
    result.changed = true;
  }

  syncLinkedCaseCounty(filing, county);
  return result;
}

/**
 * Guarded entry point for the form layer. No-ops unless `path` is exactly the
 * filing-level `county` field, so callers can hand it every committed path
 * without repeating the check.
 *
 * Called from form-contract.js's runFieldWriteSideEffects() (Milestone 42D),
 * the one post-write tail every binding convention shares -- data-form-path
 * and data-annual-path via writeDraftValue()/finalizeFieldValue(), and
 * legacy-app.js's bindForms()/afterChange() for Guardian Inventory's
 * data-bind. Before 42D each write path called this separately, and hooking
 * only one had silently covered six filing types and missed three.
 *
 * `attorney_county` deliberately does not match: it is a separate field and must
 * never establish the ward's county.
 */
export function maybeCommitCoverCounty(path, filing) {
  if (path !== 'county') return null;
  const target = filing || (typeof window !== 'undefined' ? window.D : null);
  if (!target) return null;
  return commitCoverCounty(target, target.county);
}

/**
 * Keeps a linked `caseFile.cases[]` record's county in step when the user edits
 * the Cover for that same case. A stale case record is NOT a stronger default
 * than an explicitly stored ward-Party county -- this only ever follows an
 * explicit Cover edit, it never seeds one.
 */
export function syncLinkedCaseCounty(filing, county) {
  const normalized = normalizeCountyName(county);
  if (!filing || !normalized) return false;
  const caseFile = getCaseFile();
  const cases = caseFile?.cases;
  if (!Array.isArray(cases)) return false;
  const linked = cases.find((c) => c && filing.casePartyId && c.id === filing.casePartyId)
    || cases.find((c) => c && c.caseNumber && filing.caseNumber && c.caseNumber === filing.caseNumber);
  if (!linked || normalizeCountyName(linked.county) === normalized) return false;
  linked.county = normalized;
  linked.updatedAt = new Date().toISOString();
  return true;
}

/**
 * Seeds a NEW filing's county from its linked ward Party. Returns true only if
 * a value was actually applied.
 *
 * Leaves the filing blank when the Party has no county -- that is the whole
 * point of the decision: the first filing for a ward asks, it does not guess.
 * Also refuses to overwrite a county the new filing already carries.
 */
export function hydrateCountyFromWardParty(filing) {
  if (!filing) return false;
  if (normalizeCountyName(filing.county)) return false;
  const county = wardPartyCounty(filing);
  if (!county) return false;
  filing.county = county;
  return true;
}

// Milestone 51B removed linkDestinationToSourceWardParty() from here. It had no
// production caller -- despite a comment in ward-lifecycle.js claiming
// legacy-app.js's carryOverFields() was its single entry point, legacy-app.js
// never referenced it at all.
//
// carryOverFields() (legacy-app.js) reimplements the same intent inline and
// reaches the same end state by a different route, because it builds a field bag
// for a destination that does not exist yet rather than mutating one that does:
// it blanks county, carries wardPartyId on the returned bag, runs
// reconcileSlotWithParty() against a filing-shaped probe to hydrate ward
// identity, then sets county from the resolved Party via normalizeCountyName().
// The difference is the shape of the caller, not the policy -- Milestone 40C-A
// item 3's rule (county comes from the Party, never from an arbitrary source
// filing) is enforced by both, and remains covered against the live path by
// tests/e2e/cover-county.spec.ts's two carryOverFields() tests.

/**
 * Legacy migration (40C-A's migration rule). For a ward Party with no county,
 * infer one ONLY when every linked filing that has a nonblank county agrees on
 * the same normalized Florida county; persist that unanimous value.
 *
 * Returns the inferred county, or '' when the Party already has one, when
 * linked filings conflict, or when none has a county. A conflict deliberately
 * leaves it blank for the user to resolve rather than picking a winner --
 * choosing silently between two real counties would mis-caption a filing.
 *
 * Never infers from attorney county, from a filing belonging to another ward
 * Party, or from the historical Pinellas fallback.
 */
export function inferWardPartyCounty(party) {
  if (!party || normalizeCountyName(party.county)) return '';
  const counties = new Set(
    filingsForWardParty(party.id)
      .map((w) => normalizeCountyName(w.county))
      .filter(Boolean)
  );
  if (counties.size !== 1) return '';
  return [...counties][0];
}

/**
 * Runs the legacy inference across every ward Party in the loaded case file.
 * Existing nonblank Party counties are left exactly as stored. Returns a
 * summary: { inferred, conflicted, untouched }.
 */
export function backfillWardPartyCounties() {
  const caseFile = getCaseFile();
  if (!caseFile) return { inferred: 0, conflicted: 0, untouched: 0 };
  if (!Array.isArray(caseFile.parties)) caseFile.parties = [];

  // For single-ward imports (which carry no Party records at all), reconstruct
  // a ward Party only when the exported filing itself supplied a county --
  // that is the one case where ensureWardPartyForFiling()'s own "only where the
  // user has actually supplied ward identity" contract is satisfied here. A
  // party-less ward with no county is left exactly as before: no Party is
  // manufactured for it, so nothing new is written into an ordinary legacy
  // .sav that never carried an explicit county.
  for (const ward of (caseFile.wards || [])) {
    if (ward && !wardPartyForFiling(ward) && normalizeCountyName(ward.county)) {
      ensureWardPartyForFiling(ward);
    }
  }

  const parties = caseFile.parties;
  const summary = { inferred: 0, conflicted: 0, untouched: 0 };
  const now = new Date().toISOString();
  for (const party of parties) {
    if (!party || !(party.roles || []).includes('ward')) continue;
    if (normalizeCountyName(party.county)) { summary.untouched++; continue; }
    const inferred = inferWardPartyCounty(party);
    if (inferred) {
      party.county = inferred;
      party.updatedAt = now;
      summary.inferred++;
    } else {
      // Either conflicting linked counties or none at all -- both stay blank
      // and are resolved by the user on a Cover.
      if (party.county !== null && party.county !== undefined) party.county = party.county || null;
      summary.conflicted++;
    }
  }
  // Milestone 49B rides on the same load-time hook: with the Parties now in
  // place, fill the ward identity blanks both ways (see its own doc comment).
  backfillWardPartyIdentity();
  return summary;
}

/**
 * Party-merge guard. A merge must never silently choose between two different
 * nonblank ward counties. Returns null when there is no conflict (either side
 * blank, or both the same), otherwise { keepCounty, discardCounty } for the
 * caller to resolve explicitly.
 */
export function wardCountyMergeConflict(keepId, discardId) {
  const keep = resolveParty(keepId);
  const discard = resolveParty(discardId);
  const keepCounty = normalizeCountyName(keep?.county);
  const discardCounty = normalizeCountyName(discard?.county);
  if (!keepCounty || !discardCounty || keepCounty === discardCounty) return null;
  return { keepCounty, discardCounty };
}

// Global bridge for legacy-app.js, which is a classic script and cannot import
// an ES module (same pattern as the other core/navigation modules).
if (typeof window !== 'undefined') {
  window.normalizeCountyName = normalizeCountyName;
  window.wardPartyForFiling = wardPartyForFiling;
  window.ensureWardPartyForFiling = ensureWardPartyForFiling;
  window.wardPartyCounty = wardPartyCounty;
  window.commitCoverCounty = commitCoverCounty;
  window.maybeCommitCoverCounty = maybeCommitCoverCounty;
  window.hydrateCountyFromWardParty = hydrateCountyFromWardParty;
  window.inferWardPartyCounty = inferWardPartyCounty;
  window.backfillWardPartyCounties = backfillWardPartyCounties;
  window.wardCountyMergeConflict = wardCountyMergeConflict;
}
