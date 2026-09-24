// Shared export boundary. Preview, PDF and Excel all use this instead
// of independently deciding whether a filing has a safe identity or pending
// date input.

import { resolveFilingDescriptor } from './filing-descriptor.js';
import { countyDriftWarnings } from '../case-county-drift.js';
import { formDerivedOverwriteWarnings } from './form-derived-fields.js';
import { bondDepositoryAdvisories } from './bond-depository.js';

// Milestone 67B. The page each form asks the bond / restricted-depository
// question on, by the registry's own engine id (the Annual family shares
// one); every other type has no bond block and gets no advisory.
const bondSectionFor = (descriptor) => (
  descriptor?.engineId === 'guardian' ? 'D-4' : descriptor?.engineId === 'annual' ? 'Part IX' : ''
);
import {
  commitStoredDateDrafts,
  formatDraftIssues,
  getFieldDraftIssues,
} from '../form/commit-coordinator.js';
import { createIssue } from '../validation/issue-registry.js';

function normalizeIssue(issue) {
  if (typeof issue === 'string') return createIssue('validation.legacy-unmapped', { message: issue });
  if (issue?.code) return createIssue(issue.code, issue);
  return createIssue('validation.legacy-unmapped', { message: issue?.message || String(issue) });
}

export function prepareFilingOutput(data, baseIssues = [], options = {}) {
  const target = data || window.D || {};
  commitStoredDateDrafts(target, options.setPath || window.setPath);
  const resolvedBaseIssues = typeof baseIssues === 'function'
    ? baseIssues()
    : baseIssues;

  const identity = resolveFilingDescriptor(target);
  const base = (resolvedBaseIssues || []).map(normalizeIssue);
  const structuredIssues = [...base, ...getFieldDraftIssues(target).map(normalizeIssue), ...identity.issues.map(normalizeIssue)];
  const rawMessages = [
    ...structuredIssues.map(issue => issue?.message || String(issue)),
  ];
  // Existing feature-owned save actions still consume `messages`.  Once the
  // in-memory acknowledgement matches this filing revision, bypassable issues
  // remain visible in `structuredIssues` but no longer veto ordinary output.
  const acknowledged = typeof window !== 'undefined'
    && typeof window.isOutputAcknowledgedFor === 'function'
    && window.isOutputAcknowledgedFor(target, identity.descriptor);
  const messages = acknowledged && structuredIssues.every(issue => issue.bypassable !== false) ? [] : rawMessages;
  const bondSection = bondSectionFor(identity.descriptor);
  const advisories = [
    ...countyDriftWarnings(target),
    // Cells the court's form computes for itself that this filing overwrites
    // with a different value. Advisory by decision, not by omission -- see
    // form-derived-fields.js.
    ...formDerivedOverwriteWarnings(target, identity.descriptor),
    // Milestone 67B: nothing in the bond block gates export on either form;
    // what it still wants is said here, in the same non-blocking channel.
    ...(bondSection ? bondDepositoryAdvisories(target, { section: bondSection }) : []),
  ];

  return {
    descriptor: identity.descriptor,
    structuredIssues,
    messages,
    advisories,
    canExport: messages.length === 0,
  };
}

if (typeof window !== 'undefined') {
  window.prepareFilingOutput = prepareFilingOutput;
}
