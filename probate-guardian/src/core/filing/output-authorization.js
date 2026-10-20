import { prepareFilingOutput } from './output-preflight.js';
import { isOutputAcknowledgedFor, recordOutputAcknowledgement } from './output-revision.js';
import { ALL_CAPABILITIES } from '../validation/issue-registry.js';

// The filing's revision and the acknowledgement it invalidates are
// output-revision.js's (Milestone 70, 70K), so the preflight and the draft
// store can reach them without an import cycle through this module.
export {
  getOutputRevision, clearOutputAcknowledgement, markFilingRevisionChanged, beginFreshPreview, isOutputAcknowledgedFor,
} from './output-revision.js';

// Milestone 76J item 1: an acknowledgement covers the outputs it can. It was
// refused whenever any issue couldn't be overridden, whatever output that
// issue stops -- so a damaged supporting statement, which only the PDF
// includes, left Save as Excel saying "choose Continue" with no Continue
// anywhere. authorizeFilingOutput() still blocks each output on its own
// unoverridable issues.
export function acknowledgeOutstandingRequirements(data, baseIssues) {
  const preflight = prepareFilingOutput(data, baseIssues);
  const issues = preflight.structuredIssues;
  const affects = (issue, capability) => !issue.capabilities || issue.capabilities.includes(capability);
  const acknowledgeable = ALL_CAPABILITIES.some((capability) => {
    const its = issues.filter((issue) => affects(issue, capability));
    return its.length && its.every((issue) => issue.bypassable !== false);
  });
  if (!acknowledgeable) return false;
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
