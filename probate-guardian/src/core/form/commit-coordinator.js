import { parseFlexibleDate } from './date-parser.js';
import { getD } from '../state.js';
import { setPath as writePath } from './paths.js';
import { markFilingRevisionChanged } from '../filing/output-revision.js';

function draftStore(data) {
  if (!data) return {};
  if (!data.__fieldDrafts || typeof data.__fieldDrafts !== 'object') data.__fieldDrafts = {};
  return data.__fieldDrafts;
}

function activeData(data) {
  return data || getD() || {};
}

export function recordDateDraft({ data, path, rawValue, label = '', section = '', route = '' }) {
  const target = activeData(data);
  if (!path) return null;
  const store = draftStore(target);
  const record = { kind: 'date', rawValue: String(rawValue ?? ''), label, section, route };
  store[path] = record;
  markFilingRevisionChanged('date-draft-recorded');
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
  // Milestone 73F part 3: only the open filing's revision. Judging a copy
  // (evaluateFiling(), on every change since 73F part 2) commits the copy's
  // drafts through here, and used to mark the open filing changed -- clearing
  // an override the filer had just made at Preview.
  if (target === getD()) markFilingRevisionChanged('date-draft-cleared');
}

// Milestone 73F part 3: a row's draft is named by its row ("Line 2 — Date
// Paid", "Guardian #2 — Signature Date"), read from the path when the message
// is drawn -- Remove and Duplicate move a draft to another row
// (row-links.js's remapFieldDrafts()), and a row number stored with it would
// name the row it left.
function draftLabelFor(path, label) {
  const row = /^([A-Za-z]\w*)\.(\d+)\./.exec(path || '');
  if (!row) return label || path;
  const n = Number(row[2]) + 1;
  const where = /^(?:plan)?[Gg]uardians$/.test(row[1]) ? `Guardian #${n}` : `Line ${n}`;
  return label ? `${where} — ${label}` : where;
}

export function getFieldDraftIssues(data) {
  const target = activeData(data);
  return Object.entries(target.__fieldDrafts || {}).flatMap(([path, record]) => {
    if (record?.kind !== 'date' || !record.rawValue || parseFlexibleDate(record.rawValue) !== null) return [];
    const label = draftLabelFor(path, record.label);
    return [{
      code: 'field.date.invalid', severity: 'blocking', section: record.section || 'Date entry',
      path, label, route: record.route || '/',
      message: `${record.section || 'Date entry'} — ${label} must be a valid date using a four-digit year.`,
    }];
  });
}

export function commitStoredDateDrafts(data, setPath) {
  const target = activeData(data);
  const setter = setPath || writePath;
  const committed = [];
  for (const [path, record] of Object.entries(target.__fieldDrafts || {})) {
    if (record?.kind !== 'date') continue;
    const parsed = parseFlexibleDate(record.rawValue);
    if (parsed === null) continue;
    // Milestone 73F part 3: a draft whose row is gone is dropped, never written
    // -- writing it used to create the missing row as a bare { date } object.
    const parent = path.includes('.') ? path.slice(0, path.lastIndexOf('.')).split('.').reduce((o, k) => (o == null ? o : o[k]), target) : target;
    if (!parent || typeof parent !== 'object') { delete target.__fieldDrafts[path]; continue; }
    if (setter) setter(target, path, parsed);
    clearFieldDraft(path, target);
    committed.push(path);
  }
  return committed;
}

export function formatDraftIssues(issues) {
  return issues.map((entry) => entry.message);
}

