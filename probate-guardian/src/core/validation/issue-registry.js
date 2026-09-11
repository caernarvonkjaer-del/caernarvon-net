const ALL = ['preview', 'print', 'pdf', 'docx', 'excel'];
const definitions = Object.freeze({
  'validation.legacy-unmapped': { category: 'validation', bypassable: true, capabilities: ALL, showInReadiness: true },
  'field.date.invalid': { category: 'validation', bypassable: true, capabilities: ALL, showInReadiness: true },
  'filing.identity.unknown': { category: 'data-integrity', bypassable: false, capabilities: ALL, showInReadiness: false },
  'filing.identity.conflict': { category: 'data-integrity', bypassable: false, capabilities: ALL, showInReadiness: false },
  'simplified.guardian.address-conflict': { category: 'data-integrity', bypassable: false, capabilities: ALL, showInReadiness: true },
});

export function getIssueDefinition(code) {
  if (definitions[code]) return definitions[code];
  if (/^(guardian|simplified|annual|finalAccounting|trustAccounting|planSimplified|planAnnual|planInitial|planMinor)\./.test(code)) return definitions['validation.legacy-unmapped'];
  return null;
}

export function createIssue(code, detail = {}) {
  const definition = getIssueDefinition(code) || definitions['validation.legacy-unmapped'];
  return { code, message: detail.message || code, section: detail.section || '', label: detail.label || '', path: detail.path || '', route: detail.route || '', ...definition };
}

export function createRequiredIssue({ filingType, path = '', section = '', label = '', route = '', message = '' }) {
  const canonicalPath = String(path).replace(/\.\d+(?=\.|$)/g, '[]').replace(/[^A-Za-z0-9_.\[\]-]/g, '-');
  return createIssue(`${filingType}.${canonicalPath || 'form'}.required`, { path, section, label, route, message });
}

export function assertRegisteredIssues(issues) {
  return (issues || []).every(issue => typeof issue === 'object' && typeof issue.code === 'string' && Boolean(getIssueDefinition(issue.code)));
}
