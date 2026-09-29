// Milestone 71E: the one carry of an ending balance into a new filing's
// Starting Balance, and the notes that read what was carried.
//
// Why, in filer terms. Five paths carried a Starting Balance and none agreed:
// all four that carried anything carried an unrounded float (the QA filing's
// next year showed `797229.1849999999`), two definitions of "ending balance"
// were in use (Annual -> Final/Trust always took Line 30, even a $0 one from a
// filing with no Schedule D, while New Year took Line 20 in that case), an
// Initial Inventory converted into its first Annual carried nothing at all,
// and a Trust Accounting created from an Annual started from the whole
// guardianship estate. The Clerk's audit compares the new Starting Balance
// with the prior filing's printed ending balance and lists any difference as a
// discrepancy (GD ANN WORK SLIP AUDIT, TRUST, Simplified).
//
// The rule (decisions D6, D9, D12 in MILESTONE-71-PROPOSAL.md):
//   - Annual family: Line 30 if the source has any Schedule D figure
//     (schedule-d-figure.js), else Line 20;
//   - Initial Inventory: its Summary I total (SUMMARY I!H39) -- Rule
//     5.696(b)(1)'s "if none, the value of assets on the inventory";
//   - Simplified: the remaining assets on hand;
//   - across the trust boundary (exactly one of source and target is a Trust
//     Accounting) nothing is carried: a trust accounting starts from the
//     amount the annual accounting disbursed into the trust, or from the last
//     trust accounting's ending balance (the Clerk's trust work slip) -- never
//     from the estate's net assets;
//   - the value is rounded to cents by the workbook's own rule (roundCents())
//     and stored as a number; a negative figure is carried as it is.
// The source is read as it stands when the carry runs, never a snapshot, so
// an accounting amended in place carries its amended figures.

import { roundCents, formatMoney } from '../format/money.js';
import { formEngine, INVENTORY_TYPES } from './filing-registry.js';
import { features } from '../runtime/features.js';
import { hasScheduleDFigure } from './schedule-d-figure.js';
import { escapeHtml as esc } from './escape-html.js';

const isTrust = (type) => type === 'trustAccounting';

/** True when a carry from `srcType` to `targetType` crosses the Trust Accounting boundary (nothing is carried). */
export const crossesTrustBoundary = (srcType, targetType) => isTrust(srcType) !== isTrust(targetType);

const fmtDate = (iso) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || ''));
  return m ? `${m[2]}/${m[3]}/${m[1]}` : '';
};

/** "Annual Accounting 03/15/2026–08/31/2026" -- form type and period, no names. */
export function carrySourceLabel(src) {
  const type = src?.inventoryType;
  const name = INVENTORY_TYPES?.[type]?.name || 'Filing';
  if (type === 'guardian') return src.gid ? `${name} as of ${fmtDate(src.gid)}` : name;
  const from = fmtDate(src?.periodFrom);
  const to = fmtDate(src?.periodTo);
  return from || to ? `${name} ${from || '?'}–${to || '?'}` : name;
}

/**
 * The ending balance `src` hands to a new filing of `targetType`.
 * @returns {{ value: number | '', line20: number | '', line30: number | '', used: string } | null}
 *   null when `src` is not an accounting that carries a balance.
 */
export function carriedEndingBalance(src, targetType) {
  if (!src) return null;
  const srcType = src.inventoryType;
  if (crossesTrustBoundary(srcType, targetType)) return { value: '', line20: '', line30: '', used: 'none-trust' };
  if (formEngine(srcType) === 'annual') {
    const t = features().totals.annual(src);
    const line20 = roundCents(t.netAssets);
    const line30 = roundCents(t.netAssetsFromD);
    const used = hasScheduleDFigure(src) ? 'line30' : 'line20';
    return { value: used === 'line30' ? line30 : line20, line20, line30, used };
  }
  if (srcType === 'guardian') return { value: roundCents(features().totals.guardian(src).total), line20: '', line30: '', used: 'inventoryTotal' };
  if (srcType === 'simplified') return { value: roundCents(features().totals.simplified(src).remaining), line20: '', line30: '', used: 'simplifiedRemaining' };
  return null;
}

/**
 * Writes the carried Starting Balance and its provenance record onto `dest`
 * (a new filing of `targetType`). Returns what was carried, or null.
 */
export function applyCarriedStartingBalance(dest, src, targetType = dest?.inventoryType) {
  const carried = carriedEndingBalance(src, targetType);
  if (!carried || !dest) return null;
  dest.startingBalance = carried.value;
  dest.startingBalanceCarry = {
    sourceWardId: src.wardId || '',
    sourceLabel: carrySourceLabel(src),
    used: carried.used,
    value: carried.value,
    line20: carried.line20,
    line30: carried.line30,
    carriedAt: new Date().toISOString(),
  };
  return carried;
}

const money = (v) => formatMoney(v, { style: 'dollarParens' });

/**
 * Non-blocking notes about the Starting Balance, for the page beside it and
 * Preview & Export (output-preflight.js). `wards` is the case's filings, for
 * the amended-period note; omit it to skip that one.
 */
export function startingBalanceNotes(filing, { wards = null, section = 'Part II' } = {}) {
  const carry = filing?.startingBalanceCarry;
  if (!carry || typeof carry !== 'object') return [];
  const out = [];
  const note = (code, message) => out.push({ code, severity: 'advisory', field: 'startingBalance', message: `${section} — ${message}` });
  if (carry.used === 'none-trust') {
    note('starting-balance.trust-not-carried', isTrust(filing.inventoryType)
      ? `Starting Balance was not carried from the ${carry.sourceLabel}. A trust accounting does not start from the guardianship's net assets: the Clerk compares it with the amount the annual accounting disbursed into the trust (first trust accounting) or the last trust accounting's ending balance.`
      : `Starting Balance was not carried from the ${carry.sourceLabel}. Enter the guardianship's ending net assets from its last accounting or inventory.`);
    return out;
  }
  if (carry.used === 'line30' && carry.line20 !== '' && carry.line30 !== '' && carry.line20 !== carry.line30) {
    note('starting-balance.prior-unbalanced', `The prior filing's ending balances differ — Line 20 ${money(carry.line20)}, Line 30 ${money(carry.line30)}. ${money(carry.line30)} was carried. The Clerk compares this Starting Balance with the prior filing's ending balance and lists any difference as a discrepancy.`);
  }
  const current = filing.startingBalance;
  if (carry.value !== '' && current !== '' && current !== null && current !== undefined && roundCents(current) !== roundCents(carry.value)) {
    note('starting-balance.changed-since-carry', `Starting Balance (${money(current)}) differs from the prior filing's ending balance (${money(carry.value)}), carried ${fmtDate(carry.carriedAt)} from the ${carry.sourceLabel}.`);
  }
  if (Array.isArray(wards) && carry.sourceWardId) {
    const src = wards.find((w) => w && w.wardId === carry.sourceWardId);
    if (src && src.amendedForm !== 'Yes') {
      const amended = wards.find((w) => w && w !== src && w.wardId !== filing.wardId
        && w.inventoryType === src.inventoryType && w.amendedForm === 'Yes'
        && (w.caseId || null) === (src.caseId || null)
        && w.periodFrom && w.periodFrom === src.periodFrom && w.periodTo === src.periodTo);
      if (amended) note('starting-balance.amended-source-exists', `An amended accounting for this period exists (${carrySourceLabel(amended)}). The Clerk compares Starting Balance with the amended accounting's ending balance.`);
    }
  }
  return out;
}

/** The same notes, beside Starting Balance on the page (empty when there are none). */
export function startingBalanceNotesHTML(filing, options) {
  const notes = startingBalanceNotes(filing, options);
  if (!notes.length) return '';
  return `<div class="alert alert-warning mt-2" role="status" data-starting-balance-notes style="font-size:.85rem;">
    <ul class="mb-0 ps-3">${notes.map((n) => `<li>${esc(n.message.replace(/^[^—]*— /, ''))}</li>`).join('')}</ul>
  </div>`;
}
