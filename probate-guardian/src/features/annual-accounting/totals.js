// Canonical statutory calculations and reconciliation state for Annual Guardianship Accounting.
// Single source of truth shared between UI forms, preview, Excel export, and accessible PDF generation.

export function n(v) {
  const num = parseFloat(v);
  return isNaN(num) ? 0 : num;
}

export function pct(v) {
  const p = parseFloat(v);
  return isNaN(p) ? 0 : p > 1 ? p / 100 : p;
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
  const schD2_carrying = (d.schD2 || []).reduce((s, r) => s + n(r.carryingValue) * pct(r.wardPct), 0);
  const schD2_ward = (d.schD2 || []).reduce((s, r) => s + n(r.fullValue) * pct(r.wardPct), 0);
  const schD3_carrying = (d.schD3 || []).reduce((s, r) => s + n(r.carryingValue) * pct(r.wardPct), 0);
  const schD3_ward = (d.schD3 || []).reduce((s, r) => s + n(r.fullAmount) * pct(r.wardPct), 0);
  const schD4_restricted = (d.schD4 || []).reduce((s, r) => s + (r.restricted === 'Yes' ? n(r.carryingValue) * pct(r.wardPct) : 0), 0);
  const schD4_carrying = (d.schD4 || []).reduce((s, r) => s + n(r.carryingValue) * pct(r.wardPct), 0);
  const schD4_ward = (d.schD4 || []).reduce((s, r) => s + n(r.fullAmount) * pct(r.wardPct), 0);
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

  return {
    schA, schB1, schB2, schB3, schB4, totalDisb,
    schC_gains, schC_losses, schC_net, netAssets,
    schD1_restricted, schD1_total,
    schD2_carrying, schD2_ward,
    schD3_carrying, schD3_ward,
    schD4_restricted, schD4_carrying, schD4_ward,
    schD5_total, netAssetsFromD, bondReq, auditFee
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

