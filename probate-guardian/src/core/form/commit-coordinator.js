import { parseFlexibleDate } from './date-parser.js';
import { getD } from '../state.js';
import { setPath as writePath } from './paths.js';
import { markFilingRevisionChanged } from '../filing/output-revision.js';
import { dateUse, dateRowWords } from '../filing/date-fields.js';

function draftStore(data) {
  if (!data) return {};
  if (!data.__fieldDrafts || typeof data.__fieldDrafts !== 'object') data.__fieldDrafts = {};
  return data.__fieldDrafts;
}

function activeData(data) {
  return data || getD() || {};
}

// `imported`: read from a workbook (Milestone 73T), not typed on a page --
// named by its page from date-fields.js, and its text quoted.
export function recordDateDraft({ data, path, rawValue, label = '', section = '', route = '', imported = false }) {
  const target = activeData(data);
  if (!path) return null;
  const store = draftStore(target);
  const record = { kind: 'date', rawValue: String(rawValue ?? ''), label, section, route };
  if (imported) record.imported = true;
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

// Milestone 76E: a draft whose path date-fields.js names is called what its
// page and its form's checks call it -- "Part VIII — Trust 2 — Date Trust
// Created" (it said "Line 2"), the Inventory's "C-2 row 2 — Date Filed" (it
// said "Line 2" under the page's heading), and an imported one by its page
// (it said "Imported from Excel — Line 1") -- in the words the form's other
// checks, and its amount checks, use for that page. A draft typed on a page
// keeps the box's own label.
function draftPlace(path, record, { entry, index }) {
  if (!entry) return { section: record.section || 'Date entry', label: draftLabelFor(path, record.label) };
  const label = (!record.imported && record.label) || entry.label;
  if (entry.inline && index !== undefined) return { section: dateRowWords(entry, index), label };
  const section = entry.section;
  const row = dateRowWords(entry, index);
  return { section, label: row ? `${row} — ${label}` : label };
}

// Whether the object a draft would be written into still exists: a draft
// whose row was removed has nowhere to go.
function draftParent(target, path) {
  return path.includes('.') ? path.slice(0, path.lastIndexOf('.')).split('.').reduce((o, k) => (o == null ? o : o[k]), target) : target;
}
function rowIsGone(target, path) {
  const parent = draftParent(target, path);
  return !parent || typeof parent !== 'object';
}

export function getFieldDraftIssues(data) {
  const target = activeData(data);
  return Object.entries(target.__fieldDrafts || {}).flatMap(([path, record]) => {
    if (record?.kind !== 'date' || !record.rawValue || parseFlexibleDate(record.rawValue) !== null) return [];
    // Milestone 76E: a draft whose row is gone blocks nothing (the next save
    // drops it). It used to block every output for a line that no longer
    // existed, with nothing on any page to correct.
    if (rowIsGone(target, path)) return [];
    // Milestone 76E (design 1): only while its box is in use -- shown by the
    // page, or carried by the court output. A hidden box's bad date blocked
    // every output with the box nowhere on the page; it is kept, and blocks
    // again if its answer shows it. The bond period, hidden yet printed
    // while the bond question is unanswered, still blocks, and says so.
    const use = dateUse(target, path);
    if (!use.inUse) return [];
    const { section, label } = draftPlace(path, record, use);
    let message = `${section} — ${label} must be a valid date using a four-digit year.`;
    if (record.imported) message += ` The imported workbook has "${record.rawValue}" here.`;
    if (use.hiddenButPrinted) message += ` Its box shows once ${use.entry.reveal}; until then the date is still printed on the filing.`;
    return [{
      code: 'field.date.invalid', severity: 'blocking', section,
      path, label, route: use.entry?.route || record.route || '/',
      message,
    }];
  });
}

export function commitStoredDateDrafts(data, setPath) {
  const target = activeData(data);
  const setter = setPath || writePath;
  const committed = [];
  for (const [path, record] of Object.entries(target.__fieldDrafts || {})) {
    if (record?.kind !== 'date') continue;
    // Milestone 73F part 3: a draft whose row is gone is dropped, never written
    // -- writing it used to create the missing row as a bare { date } object.
    // Milestone 76E: checked first, so an impossible date whose row is gone is
    // dropped too (only a readable one was; the other blocked for good).
    if (rowIsGone(target, path)) { delete target.__fieldDrafts[path]; continue; }
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

