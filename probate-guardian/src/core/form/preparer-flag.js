// Milestone 67A. Who prepared this filing, when it was not an outside preparer.
//
// The Initial Inventory (D-2) and the Annual/Final/Trust Accounting (Part IV)
// each carry a Preparer block whose sworn text is an outside accountant's
// compilation disclaimer -- "I have compiled the accompanying ... and is the
// representation of the guardian. I have not audited or reviewed ..." -- and
// each tells the filer, in the form's own words, "If you are the Guardian,
// Co-Guardian, or Guardian Attorney -- DO NOT SIGN HERE." Until this
// milestone the app then required all six preparer fields and a signature
// anyway, so a guardian who prepared their own filing -- the ordinary case
// for a family member without an accountant -- could not export at all.
//
// The Clerk of the Circuit Court, Pinellas County, will accept an accounting
// with no outside preparer IF THE GUARDIAN IDENTIFIES THEMSELF AS THE
// PREPARER (obtained by the requester 2026-09-23; county practice, recorded
// in MILESTONE-67-PROPOSAL.md, not a statutory finding). So the filing must
// NAME the person, not merely assert that a guardian prepared it: with
// co-guardians, "prepared by the guardian" identifies nobody.
//
// The design, as decided: one checkbox on each guardian card and one on the
// attorney card -- "This person prepared this filing" -- stored as a flag ON
// THE ROW (guardians[i].isPreparer; attorney.isPreparer where the attorney
// is an object, attorney_isPreparer where the filing keeps flat attorney_*
// keys). Not a single index pointer: guardian rows have no stable id and are
// removed by position, so a stored index would silently name the wrong
// person once a guardian before the preparer is deleted. A flag travels with
// its row and disappears with it, which is the correct result -- a deleted
// preparer leaves the filing back at "no preparer identified".
//
// Only one party may be the preparer; claimPreparer() enforces that at write
// time. While one is identified: the preparer block's requirements and its
// signature check drop, the card hides behind a notice saying who is named
// and where to change it, the PDF prints "Prepared by <name>, guardian" in
// place of the block, and the Excel preparer cells are left empty. Nothing
// already typed into the block is deleted (AGENTS.md section 4); unticking
// brings it all back. The guardian is never placed into the compilation
// attestation or made to sign it, so the form's own prohibition holds.
//
// Simplified Accounting has no preparer block at all (party-resolver.js), so
// nothing here applies to it.

import { escapeHtml as esc } from '../filing/escape-html.js';

/** The data-form-change token form-events.js dispatches claimPreparer() on. */
export const PREPARER_FLAG_CHANGE = 'preparer-flag';

export const PREPARER_FLAG_LABEL = 'This person prepared this filing (no outside preparer)';

const attorneyIsObject = (filing) => !!filing && typeof filing.attorney === 'object' && filing.attorney !== null;

/** The attorney's flag, whichever shape this filing keeps its attorney in. */
export function attorneyIsPreparer(filing) {
  if (!filing) return false;
  return attorneyIsObject(filing) ? !!filing.attorney.isPreparer : !!filing.attorney_isPreparer;
}

/** The attorney's printed name, whichever shape. */
export function attorneyDisplayName(filing) {
  if (!filing) return '';
  return String((attorneyIsObject(filing) ? filing.attorney.name : filing.attorney) || '').trim();
}

/** The flag's data path for a role on this filing. */
export function preparerFlagPath(filing, role, index = 0) {
  if (role === 'guardian') return `guardians.${index}.isPreparer`;
  return attorneyIsObject(filing) ? 'attorney.isPreparer' : 'attorney_isPreparer';
}

/**
 * Who is identified as the preparer: the first flagged guardian, else the
 * attorney if flagged, else null. The name is read live from the row, so a
 * renamed guardian is still the same preparer.
 * @returns {{ role: 'guardian' | 'attorney', index: number, name: string } | null}
 */
export function resolvePreparer(filing) {
  const guardians = Array.isArray(filing?.guardians) ? filing.guardians : [];
  const gi = guardians.findIndex((g) => !!g?.isPreparer);
  if (gi >= 0) return { role: 'guardian', index: gi, name: String(guardians[gi].name || '').trim() };
  if (attorneyIsPreparer(filing)) return { role: 'attorney', index: 0, name: attorneyDisplayName(filing) };
  return null;
}

export function hasIdentifiedPreparer(filing) {
  return resolvePreparer(filing) !== null;
}

/**
 * Only one party may be the preparer. Called after the ticked box has
 * already been written to `path`: clears every OTHER flag on the filing.
 * Unticking a box clears nothing else -- the filing simply returns to "no
 * preparer identified".
 */
export function claimPreparer(filing, path) {
  if (!filing) return;
  const guardians = Array.isArray(filing.guardians) ? filing.guardians : [];
  guardians.forEach((g, i) => {
    if (g && g.isPreparer && `guardians.${i}.isPreparer` !== path) g.isPreparer = false;
  });
  if (attorneyIsObject(filing)) {
    if (filing.attorney.isPreparer && path !== 'attorney.isPreparer') filing.attorney.isPreparer = false;
  } else if (filing.attorney_isPreparer && path !== 'attorney_isPreparer') {
    filing.attorney_isPreparer = false;
  }
}

const roleWords = (resolved) => (resolved.role === 'guardian' ? 'guardian' : "guardian's attorney");

/**
 * The line the filed PDF prints in place of the preparer block, or '' when
 * an outside preparer applies. Names the person, per the Clerk's condition.
 */
export function preparedByLine(filing) {
  const resolved = resolvePreparer(filing);
  if (!resolved) return '';
  return `Prepared by ${resolved.name || '[name]'}, ${roleWords(resolved)}. No outside preparer.`;
}

/**
 * The checkbox for a guardian or attorney card. Carries data-form-route so
 * the page re-renders on the click (the other cards' boxes must visibly
 * clear -- Milestone 67F), and data-form-change so form-events.js runs
 * claimPreparer() before that re-render.
 */
export function preparerFlagCheckboxHTML({ path, checked = false, route, id = null, label = PREPARER_FLAG_LABEL }) {
  const safeId = id || `preparer_flag_${String(path).replace(/[^A-Za-z0-9_-]/g, '_')}`;
  return `<div class="form-check plan-check mt-2">
    <input class="form-check-input" type="checkbox" id="${esc(safeId)}" ${checked ? 'checked' : ''} data-form-path="${esc(path)}" data-form-value="boolean" data-form-change="${PREPARER_FLAG_CHANGE}" data-form-route="${esc(route)}">
    <label class="form-check-label" for="${esc(safeId)}">${esc(label)}</label>
  </div>`;
}

/**
 * What the Preparer page shows in place of the hidden card, so an empty
 * page does not read as a missing section: who is named, and where the box
 * that changes it lives (a different page -- D-1 / Part III -- from the one
 * the filer is looking at).
 */
export function preparerWaivedNoticeHTML(filing, { cardLocation }) {
  const resolved = resolvePreparer(filing);
  if (!resolved) return '';
  const who = resolved.role === 'guardian'
    ? `${resolved.name || 'The guardian'} (Guardian #${resolved.index + 1})`
    : `${resolved.name || 'The attorney'} (guardian's attorney)`;
  return `<div class="alert alert-secondary" role="status" data-preparer-waived>
    <strong>No outside preparer.</strong> ${esc(who)} is identified as the preparer of this filing, so the Preparer block is not required and is not filed. To use an outside preparer instead, untick "${esc(PREPARER_FLAG_LABEL)}" on their card in ${esc(cardLocation)}.
  </div>`;
}

// legacy-app.js's Annual sidebar check ('a-p4') is a classic-script function
// and can only reach this through window, the same way it reaches
// countyDriftWarnings.
if (typeof window !== 'undefined') {
  window.resolvePreparer = resolvePreparer;
}
