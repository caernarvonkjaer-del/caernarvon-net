import { prepareFilingOutput } from './output-preflight.js';

let revision = 0;
let acknowledgement = null;

export function getOutputRevision() { return revision; }
export function clearOutputAcknowledgement() { acknowledgement = null; }
export function markFilingRevisionChanged() { revision += 1; clearOutputAcknowledgement(); return revision; }
export function beginFreshPreview() { clearOutputAcknowledgement(); }

function identityFor(data, descriptor) {
  return { wardId: data?.wardId || window.getCaseFile?.().activeWardId || '', inventoryType: descriptor?.inventoryType || data?.inventoryType || '' };
}

export function isOutputAcknowledgedFor(data, descriptor) {
  const identity = identityFor(data, descriptor);
  return Boolean(acknowledgement && acknowledgement.revision === revision && acknowledgement.wardId === identity.wardId && acknowledgement.inventoryType === identity.inventoryType);
}

export function acknowledgeOutstandingRequirements(data, baseIssues) {
  const preflight = prepareFilingOutput(data, baseIssues);
  if (!preflight.structuredIssues.length || preflight.structuredIssues.some(issue => issue.bypassable === false)) return false;
  acknowledgement = { ...identityFor(data, preflight.descriptor), revision };
  return true;
}

export function authorizeFilingOutput(data, baseIssues, { capability, additionalIssues = [] } = {}) {
  const preflight = prepareFilingOutput(data, baseIssues);
  const issues = [...preflight.structuredIssues, ...additionalIssues]
    .filter(issue => !issue.capabilities || issue.capabilities.includes(capability));
  const identity = identityFor(data, preflight.descriptor);
  if (!issues.length) return { status: 'allowed', issues, advisories: preflight.advisories };
  if (issues.some(issue => issue.bypassable === false)) return { status: 'blocked', issues, advisories: preflight.advisories };
  const acknowledged = isOutputAcknowledgedFor(data, preflight.descriptor);
  return { status: acknowledged ? 'allowed' : 'acknowledgement-required', issues, advisories: preflight.advisories };
}
