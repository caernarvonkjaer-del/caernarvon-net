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

/** US-dollar display ($1,234.56); blank and null print as $0.00. */
export const fmt = (v)=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(v||0);

export function formatDashboardCurrency(v){
  if(v===null||v===undefined)return '—';
  const abs=Math.abs(v);
  const str=abs.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
  return v<0?`($${str})`:`$${str}`;
}
