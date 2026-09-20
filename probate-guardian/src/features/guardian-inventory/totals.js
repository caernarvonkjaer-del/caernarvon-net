// Canonical calculations for the Verified Initial Inventory (Guardian
// Inventory). Single source of truth shared by the live UI (sidebar totals,
// calculated fields, summary page), the accessible PDF, and anything else
// that prints a dollar figure for this form -- the same role
// annual-accounting/totals.js plays for Annual/Final/Trust Accounting.
//
// Milestone 60A. Before this module existed the arithmetic lived twice:
// legacy-app.js's `calc` object (which the UI trusted) and a private copy
// inside guardian-inventory/pdf-model.js (which the court-filed PDF used).
// The PDF copy ignored the Ward's % on eight of eleven schedules, ran Annual
// Accounting's four-tier audit-fee ladder instead of this form's two-tier
// rule, and clamped Summary I nets at zero. legacy-app.js's `calc` now
// forwards to makeGuardianCalc() and the PDF imports calcTotalsGuardian(),
// so there is one implementation to be right.
//
// Authority: the Pinellas County Clerk's Verified Initial Inventory workbook
// (templates/guardian-template.js), AGENTS.md section 5. Verified 2026-09-20:
//
//   - Ward's Value is a bare product, e.g. 'A-1-REAL ESTATE pg 1'!I17
//     `=G17*H17`, 'B-2 PER PROP pg 1'!G18 `=E18*F18`. No ROUND(). Schedule
//     totals sum those raw products; SUMMARY I!H32 `=G30+G31` nets them
//     without clamping.
//   - Audit fee, 'PART V'!G8/G9: $85 when the inventory value is "in excess
//     of $25,000", $0 when "below $25,000". Exactly $25,000 matches neither
//     label and is an UNRESOLVED authority gap (MILESTONE-60-PROPOSAL.md,
//     60A); this module keeps the pre-existing `> 25000` reading and does
//     not certify it.
//   - Bond requirement, 'PART V' rows 18-23: B-1 cash not in a restricted
//     depository + B-2 personal property + B-3 intangibles not restricted.
//
// ROUNDING CONTRACT (approved by the requester 2026-09-20): compute each
// ward-adjusted value at full precision; sum the unrounded values; round the
// aggregate to cents only when producing a monetary figure for display or
// output; never sum already-rounded row displays. The legacy calculator
// rounded every row before summing, which disagrees with the workbook by a
// cent on fixtures with fractional percentages ($2,042.11 vs $2,042.10 --
// see tests/unit/guardian-inventory-totals.spec.js). So: every function
// here returns an UNROUNDED number. Callers round when they format.

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
 * precision. A blank percentage is 0%, exactly what a blank Ward's % cell
 * produces in the workbook (`=G17*H17` with H17 empty is 0). The UI's row
 * factories default the percentage to 100, so a blank one only arises from
 * an import or an old save -- and it must not be silently read as 100%.
 */
export function wardShare(full, percent) {
  return n(full) * (n(percent) / 100);
}

/**
 * Whether a B-1 / B-3 row is in a restricted depository. A current explicit
 * 'Yes'/'No' string always wins; the boolean alias is honoured only while
 * loading an older save that has not yet passed through normalization.
 * (Moved verbatim from legacy-app.js, Milestone 60A.)
 */
export function isRestrictedAnswer(entry) {
  return entry?.restricted === 'Yes' || (entry?.restricted !== 'No' && entry?.isRestricted === true);
}

export const AUDIT_FEE_THRESHOLD = 25000;
export const AUDIT_FEE_OVER_THRESHOLD = 85;

/**
 * 'PART V'!G8/G9: $85 above $25,000, otherwise $0. The comparison is made on
 * the cents-rounded total so a floating-point residue on an exact boundary
 * ($25,000.0000001 from summing raw products) does not flip the fee.
 */
export function auditFeeFor(totalInventory) {
  return r2(totalInventory) > AUDIT_FEE_THRESHOLD ? AUDIT_FEE_OVER_THRESHOLD : 0;
}

/**
 * The per-row helpers and schedule totals, bound to a data source. `source`
 * is either the filing object or a function returning it (legacy-app.js
 * passes a getter so the adapter always reads the CURRENT window.D).
 *
 * Method names and signatures are the legacy `calc` object's, unchanged, so
 * every existing `calc.totalA1()` / `calc.wardVal(entry)` call site keeps
 * working through the adapter.
 */
export function makeGuardianCalc(source) {
  const data = () => (typeof source === 'function' ? source() : source) || {};
  const rows = (key) => {
    const list = data()[key];
    return Array.isArray(list) ? list : [];
  };
  const sum = (key, perRow) => rows(key).reduce((s, e) => s + perRow(e), 0);

  const calc = {
    // Per-row ward shares (unrounded).
    wardVal: (e) => wardShare(e?.fullAssetValue, e?.wardPercent),          // A-1
    wardDebt: (e) => wardShare(e?.fullDebtBalance, e?.wardPercent),        // A-2
    wardAmt: (e) => wardShare(e?.fullAssetAmount, e?.wardPercent),         // B-1
    wardB2: (e) => wardShare(e?.fullAssetValue, e?.wardPercent),           // B-2
    wardB3: (e) => wardShare(e?.fullAssetValue, e?.wardPercent),           // B-3
    wardB4: (e) => wardShare(e?.fullLiabilityBalance, e?.wardPercent),     // B-4
    wardC1: (e) => wardShare(e?.annualIncomeAmount, e?.wardPercent),       // C-1
    wardC2: (e) => wardShare(e?.amountOfClaim, e?.wardPercent),            // C-2
    wardC3: (e) => wardShare(e?.estimatedSettlement, e?.wardPercent),      // C-3
    wardC4: (e) => wardShare(e?.trustAmount, e?.wardPercent),              // C-4
    wardC5: (e) => wardShare(e?.totalAssetValue, e?.jointOwnerPercent),    // C-5

    // Schedule totals (unrounded sums of the unrounded rows).
    totalA1: () => sum('scheduleA1', calc.wardVal),
    totalA2: () => sum('scheduleA2', calc.wardDebt),
    netA: () => calc.totalA1() - calc.totalA2(),                            // SUMMARY I!H32
    totalB1: () => sum('scheduleB1', calc.wardAmt),
    totalB2: () => sum('scheduleB2', calc.wardB2),
    totalB3: () => sum('scheduleB3', calc.wardB3),
    totalB4: () => sum('scheduleB4', calc.wardB4),
    netB: () => calc.totalB1() + calc.totalB2() + calc.totalB3() - calc.totalB4(), // SUMMARY I!H38
    total: () => calc.netA() + calc.netB(),                                 // SUMMARY I!H39
    totalC1: () => sum('scheduleC1', calc.wardC1),
    totalC2: () => sum('scheduleC2', calc.wardC2),
    totalC3: () => sum('scheduleC3', calc.wardC3),
    totalC4: () => sum('scheduleC4', calc.wardC4),
    totalC5: () => sum('scheduleC5', calc.wardC5),

    // Bond requirement, 'PART V' rows 18-23.
    restrictedCash: () => rows('scheduleB1').filter(isRestrictedAnswer).reduce((s, e) => s + calc.wardAmt(e), 0),
    unrestrictedCash: () => rows('scheduleB1').filter((e) => !isRestrictedAnswer(e)).reduce((s, e) => s + calc.wardAmt(e), 0),
    restrictedIntang: () => rows('scheduleB3').filter(isRestrictedAnswer).reduce((s, e) => s + calc.wardB3(e), 0),
    unrestrictedIntang: () => rows('scheduleB3').filter((e) => !isRestrictedAnswer(e)).reduce((s, e) => s + calc.wardB3(e), 0),
    bondRequired: () => calc.unrestrictedCash() + calc.totalB2() + calc.unrestrictedIntang(),

    // 'PART V'!G8/G9.
    auditFee: () => auditFeeFor(calc.total()),
  };
  return calc;
}

/** The names on a makeGuardianCalc() object; the legacy adapter is built from this list. */
export const GUARDIAN_CALC_METHODS = Object.freeze(Object.keys(makeGuardianCalc({})));

/**
 * Every schedule total, both summaries, the bond lines and the audit fee for
 * one filing, as a flat object -- the shape calcTotalsAnnual() returns for
 * Annual, and what the PDF model consumes. Unrounded; format before printing.
 */
export function calcTotalsGuardian(customD) {
  const d = customD || (typeof window !== 'undefined' ? window.D : null) || {};
  const c = makeGuardianCalc(d);
  return {
    totalA1: c.totalA1(), totalA2: c.totalA2(), netA: c.netA(),
    totalB1: c.totalB1(), totalB2: c.totalB2(), totalB3: c.totalB3(), totalB4: c.totalB4(), netB: c.netB(),
    total: c.total(),
    totalC1: c.totalC1(), totalC2: c.totalC2(), totalC3: c.totalC3(), totalC4: c.totalC4(), totalC5: c.totalC5(),
    restrictedCash: c.restrictedCash(), unrestrictedCash: c.unrestrictedCash(),
    restrictedIntang: c.restrictedIntang(), unrestrictedIntang: c.unrestrictedIntang(),
    bondRequired: c.bondRequired(),
    auditFee: c.auditFee(),
  };
}

// legacy-app.js is a classic script and cannot import this module, so the two
// entry points it needs are published on window -- the same bridge
// annual-accounting/totals.js uses for calcTotalsAnnual. features-loader.js
// imports this module eagerly so both exist before any filing is opened.
if (typeof window !== 'undefined') {
  window.calcTotalsGuardian = calcTotalsGuardian;
  window.makeGuardianCalc = makeGuardianCalc;
}
