// Milestone 73F part 3 (decision 73F-2): a filing's county must be a Florida
// county, on all nine forms. Every form checked only that it wasn't blank, so
// "P", "Pinelas" or "Zzyzx" passed everywhere and the PDF printed no court
// heading. Common variants are corrected to the official name as they are
// written and when a filing opens (73F-N3), so what is left here is a name
// that is not a Florida county at all. Like a blank county it can still be
// overridden at Preview (73F-N2, the requester's choice); the PDF then has no
// court heading.
import { canonicalFloridaCounty } from '../pdf/circuit-lookup.js';

/**
 * What is wrong with a filing's county: 'blank', the text as written when it
 * is not a Florida county, or '' when it is one.
 * @param {unknown} county
 * @returns {string}
 */
export function countyProblem(county) {
  const written = String(county ?? '').trim();
  if (!written) return 'blank';
  return canonicalFloridaCounty(written) ? '' : written;
}

/** True when a county is a Florida county (the readiness card's county rows). */
export const isFloridaCounty = (county) => countyProblem(county) === '';

/** The message for a county that is not a Florida county, after the section's own prefix. */
export const notFloridaCountyMessage = (prefix, written) => `${prefix} — County: "${written}" is not a Florida county, so the court heading can't be printed. Choose the county from the list.`;
