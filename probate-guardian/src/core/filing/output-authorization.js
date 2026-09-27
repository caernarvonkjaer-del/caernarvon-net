import { prepareFilingOutput } from './output-preflight.js';
import { isOutputAcknowledgedFor, recordOutputAcknowledgement } from './output-revision.js';

// The filing's revision and the acknowledgement it invalidates are
// output-revision.js's (Milestone 70, 70K), so the preflight and the draft
// store can reach them without an import cycle through this module.
export {
  getOutputRevision, clearOutputAcknowledgement, markFilingRevisionChanged, beginFreshPreview, isOutputAcknowledgedFor,
} from './output-revision.js';

export function acknowledgeOutstandingRequirements(data, baseIssues) {
  const preflight = prepareFilingOutput(data, baseIssues);
  if (!preflight.structuredIssues.length || preflight.structuredIssues.some(issue => issue.bypassable === false)) return false;
  recordOutputAcknowledgement(data, preflight.descriptor);
  return true;
}

export function authorizeFilingOutput(data, baseIssues, { capability, additionalIssues = [] } = {}) {
  const preflight = prepareFilingOutput(data, baseIssues);
  const issues = [...preflight.structuredIssues, ...additionalIssues]
    .filter(issue => !issue.capabilities || issue.capabilities.includes(capability));
  if (!issues.length) return { status: 'allowed', issues, advisories: preflight.advisories };
  if (issues.some(issue => issue.bypassable === false)) return { status: 'blocked', issues, advisories: preflight.advisories };
  const acknowledged = isOutputAcknowledgedFor(data, preflight.descriptor);
  return { status: acknowledged ? 'allowed' : 'acknowledgement-required', issues, advisories: preflight.advisories };
}
