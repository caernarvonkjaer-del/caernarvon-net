// Shared export boundary. Preview, PDF, DOCX, and Excel all use this instead
// of independently deciding whether a filing has a safe identity or pending
// date input.

import { resolveFilingDescriptor } from './filing-descriptor.js';
import { countyDriftWarnings } from '../case-county-drift.js';
import {
  commitStoredDateDrafts,
  formatDraftIssues,
  getFieldDraftIssues,
} from '../form/commit-coordinator.js';

function messageFor(issue) {
  return typeof issue === 'string' ? issue : issue?.message || String(issue);
}

export function prepareFilingOutput(data, baseIssues = [], options = {}) {
  const target = data || window.D || {};
  commitStoredDateDrafts(target, options.setPath || window.setPath);
  const resolvedBaseIssues = typeof baseIssues === 'function'
    ? baseIssues()
    : baseIssues;

  const identity = resolveFilingDescriptor(target);
  const structuredIssues = [
    ...getFieldDraftIssues(target),
    ...identity.issues,
  ];
  const messages = [
    ...resolvedBaseIssues.map(messageFor),
    ...formatDraftIssues(structuredIssues),
  ];
  const advisories = countyDriftWarnings(target);

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
