// Milestone 74G (decision 74G-5, the requester, 2026-10-06): every e-mail box
// a filing keeps, and the one check made of them -- a box holding text that
// isn't an e-mail address is named before anything is filed, an ordinary
// error the filer can override (Continue despite outstanding requirements).
// A blank box is judged exactly as before: required where its form requires
// it, a warning for a guardian with no attorney (72C), nothing otherwise.
//
// The list is probate-guardian-data-model.csv's e-mail rows for each filing
// type (tests/unit/date-and-email-checks.spec.js holds the two in step), with
// the words its form's own checks use, so the message sits on the right page
// beside them. One check for every form, as the unreadable amounts are
// (amount-fields.js); the message beside the box is form-contract.js's.
import { emailProblem } from '../validation/email-format.js';
import { errorRoute } from '../validation/error-route.js';

// `path` for a single field, `list` + `field` for a column of a repeating
// list, with `section(i)` (and on the Plans `label(i)`) naming the card the
// way the form's checks do.
const ANNUAL_FAMILY = [
  { list: 'guardians', field: 'email', section: (i) => `Part III — Guardian #${i + 1}`, label: 'Email Address' },
  { path: 'attorney_email', section: 'Part V', label: 'Attorney Email' },
  { path: 'attorney_secondaryEmail', section: 'Part V', label: 'Attorney Secondary Email' },
];
const SIMPLIFIED_GUARDIANS = ['Guardian #1', 'Co-Guardian #2', 'Co-Guardian #3'];
const SIMPLIFIED = [
  { list: 'guardians', field: 'email', section: (i) => `Part IV — ${SIMPLIFIED_GUARDIANS[i] || `Co-Guardian #${i + 1}`}`, label: 'Email Address' },
  { path: 'attorney_email', section: 'Part V', label: 'Attorney Email' },
  { path: 'attorney_secondaryEmail', section: 'Part V', label: 'Attorney Secondary Email' },
];
const INVENTORY = [
  { list: 'guardians', field: 'email', section: (i) => `D-1 Guardian #${i + 1}`, label: 'Email Address' },
  { path: 'preparer.email', section: 'D-2 Preparer', label: 'Email' },
  { path: 'attorney.email', section: 'D-2 Attorney', label: 'Primary Email' },
  { path: 'attorney.secondaryEmail', section: 'D-2 Attorney', label: 'Secondary Email' },
];
const planGuardian = (section, co = (i) => `Co-Guardian ${i + 1}`) => (
  { list: 'planGuardians', field: 'email', section: () => section, label: (i) => `${i === 0 ? 'Guardian' : co(i)} email` });
const BY_TYPE = {
  annual: ANNUAL_FAMILY,
  finalAccounting: ANNUAL_FAMILY,
  trustAccounting: ANNUAL_FAMILY,
  simplified: SIMPLIFIED,
  guardian: INVENTORY,
  planInitial: [
    planGuardian('Signatures'),
    { path: 'attorney_email', section: 'Attorney Certification', label: 'Attorney email' },
    { path: 'attorney_secondaryEmail', section: 'Attorney Certification', label: 'Attorney secondary email' },
  ],
  planAnnual: [
    planGuardian('Signatures'),
    { path: 'attorney_email', section: 'Signatures', label: 'Attorney email' },
    { path: 'attorney_secondary_email', section: 'Signatures', label: 'Attorney secondary email' },
  ],
  planMinor: [
    planGuardian('Guardian Signatures'),
    { path: 'preparer_email', section: 'Preparer & Attorney', label: 'Preparer email' },
    { path: 'attorney_email', section: 'Preparer & Attorney', label: 'Attorney email' },
    { path: 'attorney_secondary_email', section: 'Preparer & Attorney', label: 'Attorney secondary email' },
  ],
  planSimplified: [
    planGuardian('Signatures', (i) => `Guardian ${i + 1}`),
    { path: 'preparer_email', section: 'Signatures', label: 'Preparer email' },
    { path: 'attorney_email', section: 'Signatures', label: 'Attorney email' },
    { path: 'attorney_secondary_email', section: 'Signatures', label: 'Attorney secondary email' },
  ],
};

/** The e-mail fields a filing type keeps (empty for a type that keeps none). */
export function emailFieldsFor(type) {
  return Object.hasOwn(BY_TYPE, type) ? BY_TYPE[type] : [];
}

const at = (d, path) => String(path).split('.').reduce((v, k) => (v == null ? undefined : v[k]), d);

// Every e-mail value a filing holds, as { path, value, section, label }.
function* storedEmails(d) {
  for (const entry of emailFieldsFor(d?.inventoryType)) {
    if (entry.path) {
      yield { path: entry.path, value: at(d, entry.path), section: entry.section, label: entry.label };
      continue;
    }
    const rows = Array.isArray(d[entry.list]) ? d[entry.list] : [];
    for (let i = 0; i < rows.length; i++) {
      if (!rows[i] || typeof rows[i] !== 'object') continue;
      const label = typeof entry.label === 'function' ? entry.label(i) : entry.label;
      yield { path: `${entry.list}.${i}.${entry.field}`, value: rows[i][entry.field], section: entry.section(i), label };
    }
  }
}

/** Each e-mail box holding text that isn't an address, as a blocking issue the filer can override. */
export function emailFieldIssues(d) {
  if (!d || typeof d !== 'object') return [];
  const issues = [];
  for (const { path, value, section, label: field } of storedEmails(d)) {
    const problem = emailProblem(value);
    if (!problem) continue;
    const label = `${field}: "${String(value).trim()}" is not a complete e-mail address. ${problem}.`;
    issues.push({
      code: 'field.email.malformed', severity: 'blocking',
      section, label, path, route: errorRoute(section, d.inventoryType),
      message: `${section} — ${label}`,
    });
  }
  return issues;
}
