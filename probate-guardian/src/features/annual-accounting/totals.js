// Canonical statutory calculations and reconciliation state for Annual Guardianship Accounting.
// Single source of truth shared between UI forms, preview, Excel export, and accessible PDF generation.
import { getD } from '../../core/state.js';
import { wardShare, roundCents } from '../../core/format/money.js';

export function n(v) {
  const num = parseFloat(v);
  return isNaN(num) ? 0 : num;
}

// Ward's % is always a percentage: 50 means half, 1 means 1%. Until
// 2026-09-24 any value of 1 or less was read as a fraction, so a 1% share
// counted as 100% here and in the court workbook (percentValue() in
// core/excel/excel-engine.js); changed with the requester's approval, per
// AGENTS.md section 5 -- the workbook holds each share in a percentage cell
// it multiplies into the ward's share.
//
// Milestone 71D (decision D3, approved by the requester under AGENTS.md
// section 5): a blank or unreadable share counts as 0%, as the workbook's own
// `=H25*I25` does with an empty share cell and as the Initial Inventory
// always has -- one rule, wardShare() in src/core/format/money.js. It used to
// count as 100% here (the on-screen totals, Line 30, the bond and the audit
// fee base) while the D-1/D-5 PDF rows counted it as 0%. Validation still
// requires Ward's % on every populated line, and flags an unreadable one.
export function pct(v) {
  return wardShare(1, v);
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
  const d = customD || getD();
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

// Milestone 71E: the two figures are compared as they PRINT -- each rounded
// to cents by the Clerk's workbook's rule (roundCents()) -- and "equals" is
// said only when the printed figures are identical. It used to call two lines
// balanced whenever they differed by $0.01 or less, so the QA filing printed
// "Net Assets from Changes (797,229.19) equals Net Assets from Balances
// (797,229.18)". The workbook itself says "Line 20 should equal line 30".
export function annualReconcileState(t, customD) {
  const totals = t || calcTotalsAnnual(customD);
  const shown20 = roundCents(totals.netAssets);
  const shown30 = roundCents(totals.netAssetsFromD);
  const diff = roundCents(shown20 - shown30);
  const hasFigures = shown20 !== 0 || shown30 !== 0;
  const outOfBalance = hasFigures && shown20 !== shown30;
  const d = customD || getD();
  const explanation = String(d.reconcileExplanation || '').trim();
  return { diff, outOfBalance, explanation, explained: outOfBalance && explanation.length > 0 };
}


