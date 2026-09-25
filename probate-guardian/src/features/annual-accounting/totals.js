// Canonical statutory calculations and reconciliation state for Annual Guardianship Accounting.
// Single source of truth shared between UI forms, preview, Excel export, and accessible PDF generation.

export function n(v) {
  const num = parseFloat(v);
  return isNaN(num) ? 0 : num;
}

// Ward's % is always a percentage: 50 means half, 1 means 1%. Until
// 2026-09-24 any value of 1 or less was read as a fraction, so a 1% share
// counted as 100% here and in the court workbook (percentValue() in
// core/excel/excel-engine.js); changed with the requester's approval, per
// AGENTS.md section 5 -- the workbook holds each share in a percentage cell
// it multiplies into the ward's share. A blank share still counts as the
// whole asset for the in-progress totals; validation requires Ward's % on
// every populated line before export.
export function pct(v) {
  if (v === '' || v === null || v === undefined) return 1;
  const p = parseFloat(v);
  return isNaN(p) ? 1 : p / 100;
}

// Milestone 64B-1, item 9.1 / D7. Shared by calcTotalsAnnual() below and by
// pdf-model.js's D-2/D-3/D-4 row builders, so the two stop computing this
// independently (they drifted once already -- see this milestone's
// proposal, section 9.1). Schedules D-2, D-3 and D-4 each store a plain
// entered "Carrying Value" the workbook never scales (form column I/H/I;
// the page total is a plain SUM of that column) -- `cv` is that value,
// unscaled. `wv` is the figure Ward's % DOES apply to: Full Value/Amount x
// Ward's %, the workbook's own G*H, which is also what D-4's Restricted Amt
// is built from on a restricted line (K = IF(F="Yes", G*H, 0)) -- never from
// Carrying Value. `fullField` differs by schedule ('fullValue' for D-2,
// 'fullAmount' for D-3/D-4).
export function scheduleDRow(r, fullField = 'fullAmount') {
  const full = n(r[fullField]);
  const carry = n(r.carryingValue);
  const wardFraction = pct(r.wardPct);
  return { full, carry, wardFraction, cv: carry, wv: full * wardFraction };
}

export function calcTotalsAnnual(customD) {
  const d = customD || (typeof window !== 'undefined' ? window.D : null) || {};
  const schA = (d.schA || []).reduce((s, r) => s + n(r.amount), 0);
  const schB1 = (d.schB1 || []).reduce((s, r) => s + n(r.amount), 0);
  const schB2 = (d.schB2 || []).reduce((s, r) => s + n(r.amount), 0);
  const schB3 = (d.schB3 || []).reduce((s, r) => s + n(r.amount), 0);
  const schB4 = (d.schB4 || []).reduce((s, r) => s + n(r.amount), 0);
  const totalDisb = schB1 + schB2 + schB3 + schB4;
  const schC_gains = (d.schC || []).reduce((s, r) => s + n(r.gain), 0);
  const schC_losses = (d.schC || []).reduce((s, r) => s + n(r.loss), 0);
  const schC_net = schC_gains + schC_losses; // losses entered as negative
  const netAssets = n(d.startingBalance) + schA - totalDisb + schC_net;

  // Schedule D totals
  const schD1_restricted = (d.schD1 || []).reduce((s, r) => s + (r.restricted === 'Yes' ? n(r.fullAmount) * pct(r.wardPct) : 0), 0);
  const schD1_total = (d.schD1 || []).reduce((s, r) => s + n(r.fullAmount) * pct(r.wardPct), 0);
  const schD2_carrying = (d.schD2 || []).reduce((s, r) => s + scheduleDRow(r, 'fullValue').cv, 0);
  const schD2_ward = (d.schD2 || []).reduce((s, r) => s + scheduleDRow(r, 'fullValue').wv, 0);
  const schD3_carrying = (d.schD3 || []).reduce((s, r) => s + scheduleDRow(r).cv, 0);
  const schD3_ward = (d.schD3 || []).reduce((s, r) => s + scheduleDRow(r).wv, 0);
  const schD4_restricted = (d.schD4 || []).reduce((s, r) => s + (r.restricted === 'Yes' ? scheduleDRow(r).wv : 0), 0);
  const schD4_carrying = (d.schD4 || []).reduce((s, r) => s + scheduleDRow(r).cv, 0);
  const schD4_ward = (d.schD4 || []).reduce((s, r) => s + scheduleDRow(r).wv, 0);
  const schD5_total = (d.schD5 || []).reduce((s, r) => s + n(r.fullDebt) * pct(r.wardPct), 0);
  const netAssetsFromD = schD1_total + schD2_ward + schD3_ward + schD4_ward - schD5_total;

  // Bond calc
  const bondReq = (schD1_total - schD1_restricted) + schD3_ward + (schD4_ward - schD4_restricted);

  // Audit fee
  let auditFee = 0;
  if (netAssetsFromD > 500000) auditFee = 250;
  else if (netAssetsFromD > 100000) auditFee = 170;
  else if (netAssetsFromD > 25000) auditFee = 85;
  else auditFee = 20;

  // Milestone 40H-H: Schedule E/F-1/F-2 were the only three schedule totals
  // in annual-accounting/index.js computed locally at render time instead of
  // through this shared function -- so, unlike every other schedule total,
  // they had no data-annual-total binding for refreshAnnualTotals() to
  // update live, and stayed frozen at whatever they were when the page
  // first rendered (often 0.00, since a freshly-added empty row starts with
  // no amount entered). Same reduce() shape the local computations already
  // used, just relocated here so the figure updates on every input/blur
  // like the rest of this schedule's totals.
  const schE_in = (d.schE || []).reduce((s, r) => s + n(r.transferInAmt), 0);
  const schE_out = (d.schE || []).reduce((s, r) => s + n(r.transferOutAmt), 0);
  const schF1 = (d.schF1 || []).reduce((s, r) => s + n(r.salePrice), 0);
  const schF2 = (d.schF2 || []).reduce((s, r) => s + n(r.salePrice), 0);

  return {
    schA, schB1, schB2, schB3, schB4, totalDisb,
    schC_gains, schC_losses, schC_net, netAssets,
    schD1_restricted, schD1_total,
    schD2_carrying, schD2_ward,
    schD3_carrying, schD3_ward,
    schD4_restricted, schD4_carrying, schD4_ward,
    schD5_total, netAssetsFromD, bondReq, auditFee,
    schE_in, schE_out, schF1, schF2,
  };
}

export function annualReconcileState(t, customD) {
  const totals = t || calcTotalsAnnual(customD);
  const diff = totals.netAssets - totals.netAssetsFromD;
  const hasFigures = [totals.netAssets, totals.netAssetsFromD].some(v => Math.abs(v) > 0.005);
  const outOfBalance = hasFigures && Math.abs(diff) > 0.01;
  const d = customD || (typeof window !== 'undefined' ? window.D : null) || {};
  const explanation = String(d.reconcileExplanation || '').trim();
  return { diff, outOfBalance, explanation, explained: outOfBalance && explanation.length > 0 };
}

if (typeof window !== 'undefined') {
  window.calcTotalsAnnual = calcTotalsAnnual;
  window.annualReconcileState = annualReconcileState;
}

