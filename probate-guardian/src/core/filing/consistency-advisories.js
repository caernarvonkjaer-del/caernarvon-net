// Milestone 74H: answers within one filing that contradict each other, named
// in Preview's "Review recommended" -- each warning quotes both answers and
// where they are. None blocks, none changes a figure, and none says which
// answer is right (decision 74H-1, the requester, 2026-10-06). Checks that
// compare one filing with another (74H f, i, k) are not built: decision 74H-3,
// a second part once every filing has one set of checks the others can read.
// A C-5 joint owner's share against its asset's (74H d) is not checkable:
// nothing links a C-5 row to its asset (74P decision 2 chose no link).
//
//   a  Inventory: no safe deposit box, while a B-2 or B-3 item is in one
//   c  Inventory A-1, Annual family D-2: two properties marked Personal Residence
//   e  Initial Plan: the Cover says "In a facility", question 2 ticks only Private Residence
//   g  Initial Plan, Plan for Minors: both "declared totally incapacitated" and "a minor"
//   h  Annual Plan: question 2 "N/A -- has not moved", while question 1 lists two residences
//   j  Annual family: Part XI's "no remuneration" beside Schedule B-2's guardian fees
//      (whether those fees are remuneration is for a qualified person -- section 744.367(3)(a);
//      the wording was reviewed by the requester, 2026-10-08)
//   -  Annual family, Schedule E: transfers in and out that don't balance
//   -  Simplified: Line 8, Remaining Assets On Hand, below zero
// The bond below its requirement (74H b) is with the bond block's own notes
// (bond-depository.js).
import { amountForStore, presentAmount } from '../form/amount-codec.js';
import { roundCents } from '../format/money.js';
import { startedRows } from '../validation/row-started.js';

// Milestone 73H: the one amount style, $1,000.00 / ($1,000.00).
const money = presentAmount;
const yes = (v) => v === true || v === 'Yes';
const no = (v) => v === false || v === 'No';
const rowsOf = (d, key) => (Array.isArray(d?.[key]) ? d[key] : []);
// A Plan's checkbox, read as its own checks read it (truthy).
const ticked = (v) => !!v && v !== 'No';

/** An amount as a number; blank and unreadable text read as 0. */
function amount(v) {
  const x = typeof v === 'number' ? v : amountForStore(v, { blank: '' });
  return typeof x === 'number' && Number.isFinite(x) ? x : 0;
}

/** "1", "1 and 2", "1, 2 and 3". */
function listed(numbers) {
  return numbers.length < 2 ? numbers.join('') : `${numbers.slice(0, -1).join(', ')} and ${numbers[numbers.length - 1]}`;
}

const advisory = (code, field, message) => ({ code: `consistency.${code}`, severity: 'advisory', field, message });

// c: more than one property marked Personal Residence.
function twoResidences(d, key, section, rowWord) {
  const marked = rowsOf(d, key).map((row, i) => (yes(row?.residence) ? i + 1 : 0)).filter(Boolean);
  if (marked.length < 2) return [];
  return [advisory('two-residences', `${key}.${marked[1] - 1}.residence`,
    `${section} — ${rowWord} ${listed(marked)} are ${marked.length === 2 ? 'both' : 'all'} marked "Personal Residence?" Yes. Review them before filing.`)];
}

/** The Verified Initial Inventory: a and c. */
export function guardianConsistencyAdvisories(d) {
  if (!d) return [];
  const out = [];
  if (no(d.hasSafeDepositBox)) {
    const inBox = [['scheduleB2', 'B-2'], ['scheduleB3', 'B-3']].flatMap(([key, label]) => rowsOf(d, key)
      .map((row, i) => (yes(row?.inSafeDepositBox) ? `${label} row ${i + 1}` : '')).filter(Boolean));
    if (inBox.length) {
      out.push(advisory('safe-deposit-box', 'hasSafeDepositBox',
        `D-3 — "Does the ward have a safe deposit box…?" is answered No, while ${listed(inBox)} ${inBox.length === 1 ? 'is' : 'are'} marked "In Safe Deposit Box?" Yes. Review both before filing.`));
    }
  }
  out.push(...twoResidences(d, 'scheduleA1', 'A-1', 'Rows'));
  // Milestone 74S (74S-1): a VIN is usually 17 characters; an older vehicle's
  // can be shorter (the Clerk's own example has ten), so this only asks.
  rowsOf(d, 'scheduleB2').forEach((row, i) => {
    const vin = String(row?.vehicleVin ?? '').trim();
    if (row?.isVehicle && vin && vin.length !== 17) {
      out.push(advisory('vin-length', `b2-vehicle-vin-${i}`,
        `B-2 — Row ${i + 1} — the VIN has ${vin.length} character${vin.length === 1 ? '' : 's'}; most have 17. An older vehicle's can be shorter — check it against the title.`));
    }
  });
  return out;
}

/** The Annual, Final and Trust Accountings: c, j and Schedule E's balance. */
export function annualConsistencyAdvisories(d) {
  if (!d) return [];
  const out = [...twoResidences(d, 'schD2', 'Schedule D-2', 'Lines')];

  if (d.scheduleNoItems?.remuneration === true) {
    const fees = rowsOf(d, 'schB2').map((row) => amount(row?.amount)).filter((x) => x !== 0);
    if (fees.length) {
      const total = fees.reduce((s, x) => s + x, 0);
      out.push(advisory('remuneration-and-fees', 'scheduleNoItems.remuneration',
        `Part XI — No remuneration is declared, while Schedule B-2 lists guardian fees and costs of ${money(total)} (${fees.length} ${fees.length === 1 ? 'entry' : 'entries'}). The app does not decide whether those fees are remuneration Part XI must declare (§744.367(3)(a)); review both before filing.`));
    }
  }

  // The Clerk's `SCH E BANK TRANS p1`!C7: each transfer is listed twice, once
  // going out of an account and again going into another. Compared by size,
  // so an out entered without its minus is the sign note's business, not this.
  const transfers = rowsOf(d, 'schE');
  const inTotal = transfers.reduce((s, row) => s + Math.abs(amount(row?.transferInAmt)), 0);
  const outTotal = transfers.reduce((s, row) => s + Math.abs(amount(row?.transferOutAmt)), 0);
  if ((inTotal || outTotal) && roundCents(inTotal) !== roundCents(outTotal)) {
    out.push(advisory('transfers-unbalanced', 'schE.0.transferInAmt',
      `Schedule E — Transfers in add up to ${money(inTotal)} and transfers out to ${money(outTotal)}, so they don't balance. The Clerk's workbook says: "Each transfer should be listed twice. Once going out of an account and again going into another account." Review them before filing.`));
  }
  return out;
}

/**
 * The Simplified Accounting: Line 8 below zero.
 * @param {Record<string, any>} d
 * @param {{ remaining?: number } | null} totals the form's own totals (simplified-accounting/totals.js's calcTotals())
 */
export function simplifiedConsistencyAdvisories(d, totals) {
  if (!d || !totals || !Number.isFinite(totals.remaining) || roundCents(totals.remaining) >= 0) return [];
  return [advisory('remaining-below-zero', 'startingBalance',
    `Part II — Line 8 — Remaining Assets On Hand is below zero: ${money(totals.remaining)}. Review the amounts in Part II before filing.`)];
}

const FACILITY = 'In a facility (Skilled Nursing, Assisted Living, etc.)';
const Q2_KEYS = ['q2ALF', 'q2GroupHome', 'q2Intermediate', 'q2PrivateResidence', 'q2SkilledNursing', 'q2Specialized', 'q2StateHospital', 'q2Other'];

/** The Initial Guardianship Plan: e and g. */
export function planInitialConsistencyAdvisories(d) {
  if (!d) return [];
  const out = [];
  if (d.wardLiving === FACILITY && ticked(d.q2PrivateResidence) && Q2_KEYS.every((k) => k === 'q2PrivateResidence' || !ticked(d[k]))) {
    out.push(advisory('facility-and-private-residence', 'q2PrivateResidence',
      `2–3. Setting & Medical Care — Question 2 ticks only "Private Residence", while the Cover says the ward is living "${FACILITY}". Review both before filing.`));
  }
  if (ticked(d.certIncapacitatedNoCopy) && ticked(d.certMinorNoCopy)) {
    out.push(advisory('incapacitated-and-minor', 'certMinorNoCopy',
      'Signatures — Both "The Ward was declared totally incapacitated and has not been given a copy of this plan" and "The Ward is a minor under the age of 14 and has not been given a copy of this plan" are ticked. Review both before filing.'));
  }
  return out;
}

/** The Plan for Minors: g. */
export function planMinorConsistencyAdvisories(d) {
  if (!d || !(ticked(d.certIncapacitated) && ticked(d.certMinor))) return [];
  return [advisory('incapacitated-and-minor', 'certMinor',
    'Guardian Signatures — Both "The Ward was declared totally incapacitated." and "The Ward is a minor." are ticked. Review both before filing.')];
}

/** The Annual Guardianship Plan: h. */
export function planAnnualConsistencyAdvisories(d) {
  if (!d || !ticked(d.q2NoMove)) return [];
  const residences = startedRows(d.q1Residences).length;
  if (residences < 2) return [];
  return [advisory('not-moved-and-residences', 'q2NoMove',
    `2–3. Residence & Care — Question 2 is ticked "N/A — the ward has not moved since the last plan was filed", while question 1 lists ${residences} residences. Review both before filing.`)];
}

/**
 * Every within-filing contradiction for a filing, by its form's engine id.
 * @param {Record<string, any>} filing
 * @param {string} engineId the registry's engine id
 * @param {{ totals?: Record<string, any> | null }} [options] the form's own totals, where a check reads one
 */
export function consistencyAdvisories(filing, engineId, { totals = null } = {}) {
  switch (engineId) {
    case 'guardian': return guardianConsistencyAdvisories(filing);
    case 'annual': return annualConsistencyAdvisories(filing);
    case 'simplified': return simplifiedConsistencyAdvisories(filing, totals);
    case 'planInitial': return planInitialConsistencyAdvisories(filing);
    case 'planMinor': return planMinorConsistencyAdvisories(filing);
    case 'planAnnual': return planAnnualConsistencyAdvisories(filing);
    default: return [];
  }
}
