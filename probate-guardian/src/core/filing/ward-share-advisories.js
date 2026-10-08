// Preview & Export notes for small Schedule D ward shares on the Annual
// Accounting family. The Annual Accounting reads Ward's % as a percentage
// everywhere -- the field says "if the ward owns 50%, enter 50" -- since
// 2026-09-24; before that, any value of 1 or less was read as a fraction, so
// a 1% share counted as 100% on screen, in the PDF and in the court workbook
// (tests/e2e/annual-ward-share-export.spec.ts). A filer who typed a fraction
// under the old reading (0.5 meaning half) now gets 0.5%; this says so for
// every share above 0 and at most 1, without blocking anything.
//
// Milestone 73G part 2: the Inventory too -- its shares have read as
// percentages since Milestone 60K, and a fraction typed under the old reading
// is the same 0.5% -- and beside the box as well as in Preview
// (smallShareNote(), drawn by form-contract.js and the Inventory's binding).
import { resolveDescriptorForInventoryType } from './filing-descriptor.js';

const SCHEDULES = [['schD1', 'D-1'], ['schD2', 'D-2'], ['schD3', 'D-3'], ['schD4', 'D-4'], ['schD5', 'D-5']];

// The Inventory's shares: [collection, schedule, field, label]. Its export
// checks read the same list (src/core/validation/engines/guardian.js).
export const INVENTORY_SHARE_FIELDS = [
  ['scheduleA1', 'A-1', 'wardPercent', "Ward's %"], ['scheduleA2', 'A-2', 'wardPercent', "Ward's %"],
  ['scheduleB1', 'B-1', 'wardPercent', "Ward's %"], ['scheduleB2', 'B-2', 'wardPercent', "Ward's %"],
  ['scheduleB3', 'B-3', 'wardPercent', "Ward's %"], ['scheduleB4', 'B-4', 'wardPercent', "Ward's %"],
  ['scheduleC1', 'C-1', 'wardPercent', "Ward's %"], ['scheduleC2', 'C-2', 'wardPercent', "Ward's %"],
  ['scheduleC3', 'C-3', 'wardPercent', "Ward's %"], ['scheduleC4', 'C-4', 'wardPercent', "Ward's %"],
  ['scheduleC5', 'C-5', 'jointOwnerPercent', "Joint Owner's %"],
];

/** A share above 0 and at most 1, as a number; otherwise null. */
function smallShare(raw) {
  if (raw === '' || raw == null) return null;
  const p = parseFloat(raw);
  return Number.isFinite(p) && p > 0 && p <= 1 ? p : null;
}

// What the note says, by the share's label: the ward's share, or C-5's joint owner's.
const shareWords = (label, p) => (label === "Joint Owner's %"
  ? `${label} reads as ${p}%. Enter a share as a percentage: 50 for half.`
  : `${label} reads as ${p}%. If the ward's share is the whole amount, enter 100.`);

/** Advisory notes for Schedule D ward shares above 0 and at most 1. */
export function wardShareAdvisories(filing) {
  if (!filing) return [];
  const out = [];
  for (const [key, label] of SCHEDULES) {
    const rows = Array.isArray(filing[key]) ? filing[key] : [];
    rows.forEach((row, i) => {
      const p = smallShare(row?.wardPct);
      if (p === null) return;
      out.push({
        code: 'ward-share.small',
        severity: 'advisory',
        field: `${key}.${i}.wardPct`,
        message: `Schedule ${label} — Line ${i + 1} — ${shareWords("Ward's %", p)}`,
      });
    });
  }
  return out;
}

/** Milestone 73G part 2: the same notes for the Inventory's shares, A-1 to C-5. */
export function inventoryShareAdvisories(filing) {
  if (!filing) return [];
  const out = [];
  for (const [key, schedule, field, label] of INVENTORY_SHARE_FIELDS) {
    const rows = Array.isArray(filing[key]) ? filing[key] : [];
    rows.forEach((row, i) => {
      const p = smallShare(row?.[field]);
      if (p === null) return;
      out.push({
        code: 'ward-share.small',
        severity: 'advisory',
        field: `${key}.${i}.${field}`,
        message: `${schedule} row ${i + 1} — ${shareWords(label, p)}`,
      });
    });
  }
  return out;
}

/**
 * Milestone 73G part 2: the note beside a share box, or '' -- for a Schedule
 * D share on the Annual family and every Inventory share, holding a value
 * above 0 and at most 1.
 * @param {string} type the filing's inventoryType
 * @param {string} path the box's path, as "schD1.0.wardPct"
 * @param {unknown} value what the box holds
 */
export function smallShareNote(type, path, value) {
  const p = smallShare(value);
  if (p === null) return '';
  // By the form's engine: the Annual family is one.
  const engineId = resolveDescriptorForInventoryType(type)?.engineId;
  if (engineId === 'annual') return /^schD[1-5]\.\d+\.wardPct$/.test(path || '') ? shareWords("Ward's %", p) : '';
  if (engineId !== 'guardian') return '';
  const m = /^(schedule[A-C]\d)\.\d+\.(\w+)$/.exec(path || '');
  const entry = m && INVENTORY_SHARE_FIELDS.find(([key, , field]) => key === m[1] && field === m[2]);
  return entry ? shareWords(entry[3], p) : '';
}
