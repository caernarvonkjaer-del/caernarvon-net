// Milestone 70, 70J: a unit test opens a filing the way the app has one open --
// the case store (src/core/state.js) holds the case, and the open filing is
// the one its activeWardId names. Until 70J tests assigned window.D and
// window.caseFile, which the store read; nothing reads either now.
import { blankCaseFile, getCaseFile, replaceCaseFile } from '../../../src/core/state.js';

/**
 * Make `filing` the open filing, in a case of its own (or, with
 * `{ keepCase: true }`, in the case already in the store). A filing with no
 * wardId is given one. It is not normalized, as an assigned window.D was not.
 * Returns the filing.
 */
export function openFiling(filing, { keepCase = false } = {}) {
  if (!filing.wardId) filing.wardId = 'w-unit';
  const cf = keepCase ? getCaseFile() : blankCaseFile();
  if (!cf.wards.includes(filing)) cf.wards.push(filing);
  cf.activeWardId = filing.wardId;
  if (!keepCase) replaceCaseFile(cf);
  return filing;
}
