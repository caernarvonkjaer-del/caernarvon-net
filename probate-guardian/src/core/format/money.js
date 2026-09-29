// Money arithmetic and display shared by the filing forms. Milestone 70's 70B
// gathered these here: n() and r2() from src/features/guardian-inventory/totals.js
// (which re-exports them, so its importers are unchanged), and fmt() and
// formatDashboardCurrency() from src/legacy-app.js. Annual Accounting's
// importer used a local copy of r2() (master's 945b5a8) -- the same formula for
// the numbers it passes -- and imports this one now.

/** Numeric coercion: blank, null, and unparseable all read as 0. */
export function n(v) {
  const num = parseFloat(v);
  return Number.isFinite(num) ? num : 0;
}

/** Round to cents. For DISPLAY of an aggregate, never for intermediate sums. */
export function r2(v) {
  return Math.round(n(v) * 100) / 100;
}

/**
 * The ward's share of a full figure at a percentage expressed 0-100, at full
 * precision. A blank or unreadable percentage is 0%, exactly what a blank
 * Ward's % cell produces in the court's workbooks (`=G17*H17`, `=H25*I25`
 * with the share cell empty is 0) -- never silently the whole asset.
 *
 * Milestone 71D moved this here from src/features/guardian-inventory/totals.js
 * (which re-exports it) so the Annual, Final and Trust Accountings use the
 * same rule: their pct() read a blank share as 100% for the on-screen totals
 * and Line 30 while their D-1/D-5 PDF rows read it as 0%, so a filing exported
 * through the override printed a column that did not add up (decision D3).
 */
export function wardShare(full, percent) {
  return n(full) * (n(percent) / 100);
}

/**
 * How a Ward's % prints on a filed page: the number the filer entered, as
 * `50%`; a blank or unreadable share as "—" -- never a figure the filer did not
 * enter. (Milestone 71D: all six Annual share columns printed a blank share as
 * "100%", beside a Ward's Amount that counted it as 0%.)
 */
export function formatShare(v) {
  if (v === '' || v === null || v === undefined) return '—';
  if (typeof v === 'number') return Number.isFinite(v) ? `${v}%` : '—';
  const s = String(v).trim();
  return s !== '' && Number.isFinite(Number(s)) ? `${s}%` : '—';
}

/** US-dollar display ($1,234.56); blank and null print as $0.00. */
export const fmt = (v)=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(v||0);

export function formatDashboardCurrency(v){
  if(v===null||v===undefined)return '—';
  const abs=Math.abs(v);
  const str=abs.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
  return v<0?`($${str})`:`$${str}`;
}
