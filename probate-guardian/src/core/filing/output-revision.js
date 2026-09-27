// The open filing's revision -- advanced by every edit that could change what
// its court output says -- and the filer's acknowledgement of a Preview's
// outstanding requirements, which holds only for the revision and filing it
// was given for. In memory only, never saved (Milestones 38D and 44B).
//
// Its own module since Milestone 70's 70K: output-authorization.js imports the
// output preflight, which with the draft store must mark a revision or ask
// whether output was acknowledged -- through window, until now, since
// importing output-authorization.js back would be a cycle.
import { getCaseFile } from '../state.js';

let revision = 0;
let acknowledgement = null;

export function getOutputRevision() { return revision; }
export function clearOutputAcknowledgement() { acknowledgement = null; }
/** @param {string} [reason] why it changed -- for a reader of the call; not recorded */
export function markFilingRevisionChanged(reason) { revision += 1; clearOutputAcknowledgement(); return revision; }
export function beginFreshPreview() { clearOutputAcknowledgement(); }

function identityFor(data, descriptor) {
  return { wardId: data?.wardId || getCaseFile().activeWardId || '', inventoryType: descriptor?.inventoryType || data?.inventoryType || '' };
}

export function isOutputAcknowledgedFor(data, descriptor) {
  const identity = identityFor(data, descriptor);
  return Boolean(acknowledgement && acknowledgement.revision === revision && acknowledgement.wardId === identity.wardId && acknowledgement.inventoryType === identity.inventoryType);
}

/** output-authorization.js's, once it has judged the requirements bypassable. */
export function recordOutputAcknowledgement(data, descriptor) {
  acknowledgement = { ...identityFor(data, descriptor), revision };
}
