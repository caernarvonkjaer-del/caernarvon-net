// Milestone 73A: when a year's data moves to signature policy 2 (guardians
// sign by hand or with a stamp; src/core/validation/signature-state.js), and
// what New Year clears.
//
//   - New filings and New Year write 2 (filing-registry.js's
//     initializeEmptyData(); filing-years.js's startNewWardYear()).
//   - A filing prepared before, opened while it is not closed, is upgraded
//     (state.js's setActiveFiling()) -- only when its year never decided a
//     policy: an archived year switched back in is marked 1 instead
//     (keepYearSignaturePolicy()), so a reprint of a filed year matches the
//     filed copy.
//   - A closed filing keeps its policy; Mark Open upgrades it (asked again).
//   - An Excel import never touches the policy.
//
// Upgrading makes a legacy guardian block's implied "/s/" explicit -- a blank
// choice with a date printed "/s/ Name" under the old rule -- so exactly the
// blocks that signed with "/s/" are asked again; nothing typed is deleted.
import { SIGNATURE_POLICIES, SIGNATURE_STATES } from '../validation/signature-state.js';
import { resolveCertSigner, planCertAttorneyName } from '../filing/plan-certificate-of-service.js';

const has = (v) => v !== '' && v !== null && v !== undefined;

/** Every block a guardian signs, as { get(), set(state) } over its stored choice and date. */
function guardianSignatureSlots(d) {
  const slots = [];
  const row = (obj) => obj && typeof obj === 'object' && slots.push({
    state: () => obj.signatureState, date: () => obj.signatureDate, setState: (v) => { obj.signatureState = v; },
  });
  (Array.isArray(d.guardians) ? d.guardians : []).forEach(row);
  (Array.isArray(d.planGuardians) ? d.planGuardians : []).forEach(row);
  row(d.serviceGuardian);
  if ('certGuardianSignatureState' in d || 'certGuardianSignDate' in d) {
    slots.push({ state: () => d.certGuardianSignatureState, date: () => d.certGuardianSignDate, setState: (v) => { d.certGuardianSignatureState = v; } });
  }
  // The Plans' certificate, while a guardian certifies it.
  if (Array.isArray(d.planGuardians) && resolveCertSigner(d, { attorneyName: planCertAttorneyName }).role === 'guardian') {
    slots.push({ state: () => d.certSignatureState, date: () => d.certSignatureDate, setState: (v) => { d.certSignatureState = v; } });
  }
  return slots;
}

/**
 * Moves a year's data to policy 2. Returns true when it changed anything.
 * A year marked 1 keeps it unless `force` (Mark Open asks again).
 * @param {Record<string, any>|null|undefined} d
 * @param {{ force?: boolean }} [options]
 */
export function upgradeSignaturePolicy(d, { force = false } = {}) {
  if (!d || typeof d !== 'object') return false;
  if (d.signaturePolicy === SIGNATURE_POLICIES.BY_HAND_OR_STAMP) return false;
  if (d.signaturePolicy === SIGNATURE_POLICIES.LEGACY && !force) return false;
  for (const slot of guardianSignatureSlots(d)) {
    if (!has(slot.state()) && has(slot.date())) slot.setState(SIGNATURE_STATES.TYPED);
  }
  d.signaturePolicy = SIGNATURE_POLICIES.BY_HAND_OR_STAMP;
  return true;
}

/**
 * On opening a filing: upgrade it if it is not closed and its year never
 * decided a policy. Returns true when it changed anything.
 * @param {Record<string, any>|null|undefined} ward
 */
export function applySignaturePolicyOnOpen(ward) {
  // Absent (or null, as a JSON round trip can leave it) means never decided.
  if (!ward || ward.archived || ward.signaturePolicy != null) return false;
  return upgradeSignaturePolicy(ward);
}

/**
 * An archived year switched back in keeps the policy it was filed under:
 * one that never decided is marked 1, so later opens leave it alone.
 * @param {Record<string, any>|null|undefined} d
 */
export function keepYearSignaturePolicy(d) {
  if (d && typeof d === 'object' && d.signaturePolicy == null) d.signaturePolicy = SIGNATURE_POLICIES.LEGACY;
}

// Every signer's choice and stamp, in whichever shape the form stores them.
const ROW_LISTS = ['guardians', 'planGuardians'];
const OBJECT_SIGNERS = ['preparer', 'attorney', 'serviceAttorney', 'serviceGuardian'];
const FLAT_SIGNERS = [
  ['attorney_signatureState', 'attorney_signatureImage'], ['preparer_signatureState', 'preparer_signatureImage'],
  ['certAttySignatureState', 'certAttySignatureImage'], ['certGuardianSignatureState', 'certGuardianSignatureImage'],
  ['certSignatureState', 'certSignatureImage'],
];

/**
 * New Year: every signer's choice and stamp image cleared (the dates are
 * resetYearlyFieldsForNewYear()'s), and the new year on policy 2. A stamp
 * carried into the new year printed on an unsigned filing (the QA finding).
 * @param {Record<string, any>} d
 */
export function clearSignaturesForNewYear(d) {
  const clear = (obj) => {
    if (!obj || typeof obj !== 'object') return;
    if ('signatureState' in obj) obj.signatureState = '';
    if ('signatureImage' in obj) obj.signatureImage = '';
  };
  for (const list of ROW_LISTS) (Array.isArray(d[list]) ? d[list] : []).forEach(clear);
  for (const key of OBJECT_SIGNERS) clear(d[key]);
  for (const [stateKey, imageKey] of FLAT_SIGNERS) {
    if (stateKey in d) d[stateKey] = '';
    if (imageKey in d) d[imageKey] = '';
  }
  d.signaturePolicy = SIGNATURE_POLICIES.BY_HAND_OR_STAMP;
}
