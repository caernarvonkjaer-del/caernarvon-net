// Milestone 40A removed 'docx' from this list along with the export format
// itself. Nothing passed 'docx' as a capability once doSaveDocx() was gone, so
// this is the channel list shrinking to the outputs that still exist.
export const ALL_CAPABILITIES = ['preview', 'print', 'pdf', 'excel'];
export const PDF_CAPABILITIES = ['preview', 'print', 'pdf'];
export const EXCEL_CAPABILITIES = ['excel'];

const definitions = Object.freeze({
  'validation.legacy-unmapped': { category: 'validation', bypassable: true, capabilities: ALL_CAPABILITIES, showInReadiness: true },
  'field.date.invalid': { category: 'validation', bypassable: true, capabilities: ALL_CAPABILITIES, showInReadiness: true },
  'filing.identity.unknown': { category: 'data-integrity', bypassable: false, capabilities: ALL_CAPABILITIES, showInReadiness: false },
  'filing.identity.conflict': { category: 'data-integrity', bypassable: false, capabilities: ALL_CAPABILITIES, showInReadiness: false },
  'simplified.guardian.address-conflict': { category: 'data-integrity', bypassable: false, capabilities: ALL_CAPABILITIES, showInReadiness: true },
  // Milestone 38D / 44B: Supplemental PDF boundary issues
  'supplemental.missing-data': { category: 'supplemental', bypassable: false, capabilities: PDF_CAPABILITIES, showInReadiness: false },
  'supplemental.decode-failed': { category: 'supplemental', bypassable: false, capabilities: PDF_CAPABILITIES, showInReadiness: false },
  'supplemental.not-pdf': { category: 'supplemental', bypassable: false, capabilities: PDF_CAPABILITIES, showInReadiness: false },
  'supplemental.too-large': { category: 'supplemental', bypassable: false, capabilities: PDF_CAPABILITIES, showInReadiness: false },
  'supplemental.checking': { category: 'supplemental', bypassable: false, capabilities: PDF_CAPABILITIES, showInReadiness: false },
  'supplemental.not-ready': { category: 'supplemental', bypassable: false, capabilities: PDF_CAPABILITIES, showInReadiness: false },
  'supplemental.page-limit': { category: 'supplemental', bypassable: false, capabilities: PDF_CAPABILITIES, showInReadiness: false },
  'supplemental.blocked': { category: 'supplemental', bypassable: false, capabilities: PDF_CAPABILITIES, showInReadiness: false },
  'supplemental.total-bytes': { category: 'supplemental', bypassable: false, capabilities: PDF_CAPABILITIES, showInReadiness: false },
  'supplemental.total-pages': { category: 'supplemental', bypassable: false, capabilities: PDF_CAPABILITIES, showInReadiness: false },
  // Milestone 38D / 44B: Technical & security output boundary issues
  'output.template.missing': { category: 'technical', bypassable: false, capabilities: ALL_CAPABILITIES, showInReadiness: false },
  'output.resource.unavailable': { category: 'technical', bypassable: false, capabilities: ALL_CAPABILITIES, showInReadiness: false },
  'output.generation.failed': { category: 'technical', bypassable: false, capabilities: ALL_CAPABILITIES, showInReadiness: false },
  'output.capability.unsupported': { category: 'technical', bypassable: false, capabilities: ALL_CAPABILITIES, showInReadiness: false },
  'output.security.denied': { category: 'security', bypassable: false, capabilities: ALL_CAPABILITIES, showInReadiness: false },
});

export function getIssueDefinition(code) {
  if (definitions[code]) return definitions[code];
  if (/^excel\.capacity\.(guardian|simplified|annual|finalAccounting|trustAccounting)\./.test(code)) {
    return { category: 'capacity', bypassable: false, capabilities: EXCEL_CAPABILITIES, showInReadiness: false };
  }
  if (/^supplemental\.(missing-data|decode-failed|not-pdf|too-large|checking|not-ready|page-limit|blocked|total-bytes|total-pages)$/.test(code)) {
    return { category: 'supplemental', bypassable: false, capabilities: PDF_CAPABILITIES, showInReadiness: false };
  }
  if (/^output\.(template\.missing|resource\.unavailable|generation\.failed|capability\.unsupported)$/.test(code)) {
    return { category: 'technical', bypassable: false, capabilities: ALL_CAPABILITIES, showInReadiness: false };
  }
  if (code === 'output.security.denied') {
    return { category: 'security', bypassable: false, capabilities: ALL_CAPABILITIES, showInReadiness: false };
  }
  if (/^(guardian|simplified|annual|finalAccounting|trustAccounting|planSimplified|planAnnual|planInitial|planMinor)\./.test(code)) {
    return definitions['validation.legacy-unmapped'];
  }
  return null;
}

export function createIssue(code, detail = {}) {
  const definition = getIssueDefinition(code) || definitions['validation.legacy-unmapped'];
  let capabilities = definition.capabilities;
  if (String(code).startsWith('output.') && Array.isArray(detail.capabilities) && detail.capabilities.length > 0) {
    const filtered = detail.capabilities.filter(c => ALL_CAPABILITIES.includes(c));
    if (filtered.length > 0) capabilities = filtered;
  }
  return {
    code,
    message: detail.message || code,
    section: detail.section || '',
    label: detail.label || '',
    path: detail.path || '',
    route: detail.route || '',
    category: definition.category,
    bypassable: definition.bypassable,
    capabilities,
    showInReadiness: definition.showInReadiness,
  };
}

export function createRequiredIssue({ filingType, path = '', section = '', label = '', route = '', message = '' }) {
  const canonicalPath = String(path).replace(/\.\d+(?=\.|$)/g, '[]').replace(/[^A-Za-z0-9_.\[\]-]/g, '-');
  return createIssue(`${filingType}.${canonicalPath || 'form'}.required`, { path, section, label, route, message });
}

export function assertRegisteredIssues(issues) {
  return (issues || []).every(issue => Boolean(issue) && typeof issue === 'object' && typeof issue.code === 'string' && Boolean(getIssueDefinition(issue.code)));
}
