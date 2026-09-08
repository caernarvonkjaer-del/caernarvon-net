import { parseFlexibleDate } from './date-parser.js';

function draftStore(data) {
  if (!data) return {};
  if (!data.__fieldDrafts || typeof data.__fieldDrafts !== 'object') data.__fieldDrafts = {};
  return data.__fieldDrafts;
}

function activeData(data) {
  return data || window.D || {};
}

export function recordDateDraft({ data, path, rawValue, label = '', section = '', route = '' }) {
  const target = activeData(data);
  if (!path) return null;
  const store = draftStore(target);
  const record = { kind: 'date', rawValue: String(rawValue ?? ''), label, section, route };
  store[path] = record;
  window._transientDrafts = window._transientDrafts || {};
  window._transientDrafts[path] = record.rawValue;
  return record;
}

export function getFieldDraft(path, data) {
  return activeData(data).__fieldDrafts?.[path] || null;
}

export function getFieldDraftDisplay(path, fallback = '', data) {
  const record = getFieldDraft(path, data);
  return record ? record.rawValue : fallback;
}

export function clearFieldDraft(path, data) {
  const target = activeData(data);
  if (target.__fieldDrafts) delete target.__fieldDrafts[path];
  if (window._transientDrafts) delete window._transientDrafts[path];
}

export function getFieldDraftIssues(data) {
  const target = activeData(data);
  return Object.entries(target.__fieldDrafts || {}).flatMap(([path, record]) => {
    if (record?.kind !== 'date' || !record.rawValue || parseFlexibleDate(record.rawValue) !== null) return [];
    const label = record.label || path;
    return [{
      code: 'field.date.invalid', severity: 'blocking', section: record.section || 'Date entry',
      path, label, route: record.route || '/',
      message: `${record.section || 'Date entry'} - ${label} must be a valid date using a four-digit year.`,
    }];
  });
}

export function commitStoredDateDrafts(data, setPath) {
  const target = activeData(data);
  const setter = setPath || window.setPath;
  const committed = [];
  for (const [path, record] of Object.entries(target.__fieldDrafts || {})) {
    if (record?.kind !== 'date') continue;
    const parsed = parseFlexibleDate(record.rawValue);
    if (parsed === null) continue;
    if (setter) setter(target, path, parsed);
    clearFieldDraft(path, target);
    committed.push(path);
  }
  return committed;
}

export function formatDraftIssues(issues) {
  return issues.map((entry) => entry.message);
}

if (typeof window !== 'undefined') {
  window.getFieldDraftDisplay = getFieldDraftDisplay;
  window.getFieldDraftIssues = getFieldDraftIssues;
  window.commitStoredDateDrafts = commitStoredDateDrafts;
  window.formatDraftIssues = formatDraftIssues;
}
