// Milestone 74H: answers within one filing that contradict each other, named
// in Preview's "Review recommended" -- each warning quotes both answers and
// where they are. None blocks, none changes a figure, and none says which
// answer is right (decision 74H-1, the requester, 2026-10-06). The checks that
// compare a Plan with the ward's other filings (f, i, k) are the second part,
// built after 73F part 2 as decision 74H-3 set out (2026-10-16, decision
// 74H-N1): caseConsistencyAdvisories() below.
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
import { accountingName, accountingsForYearEnded, caseFilings, remunerationPart } from './carry-forward-hints.js';
import { displayDate } from '../form/date-parser.js';
import { resolveDescriptorForInventoryType } from './filing-descriptor.js';
import { PLAN_INITIAL_CHOICES } from './court-text/plan-initial.js';
import { PLAN_ANNUAL_CHOICES } from './court-text/plan-annual.js';

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

// ---------------------------------------------------------------------------
// Part 2 (decision 74H-N1, the requester, 2026-10-16; the wording approved as
// drafted): a Plan read against the ward's other filings -- those linked to
// the same case, or with the same Case # when one isn't linked (74O-N1,
// carry-forward-hints.js's caseFilings()). The Plans hold no Type of
// Guardianship of their own (73B), so it is read from the newest other filing
// that answers it, and that filing is named.
//
//   f  Initial Plan (questions 3 and 6), Annual Plan (question 3's four
//      boxes): "the ward retains the right" ticked on a Plenary guardianship
//      (the Annual Plan's boxes by decision 74H-N1 -- the same contradiction)
//   i  Initial Plan: question 7 answers Trusts No while the ward's Initial
//      Inventory lists a trust on C-4
//   k  Plan for Minors on a Minor - Property guardianship: section 744.367(1)
//      has each guardian of the person file a plan; whether a guardian of the
//      property alone files one is for a qualified person, and the warning
//      decides nothing
//   74O-5 (answered 2026-10-16: a plan's remuneration declaration covers the
//      year just ended, Pinellas Clerk practice; 74O-N2): the Annual Plan's
//      Question 11 against the accounting for that year -- one declaring none
//      while the other lists some -- in the facts only
// ---------------------------------------------------------------------------

const text = (v) => String(v ?? '').trim();

/** A filing as a warning names it: "the ward's Annual Accounting". */
const filingName = (w) => (w.inventoryType === 'guardian'
  ? 'Verified Initial Inventory'
  : resolveDescriptorForInventoryType(w.inventoryType)?.displayName || 'other filing');

/** The Type of Guardianship the ward's newest other filing records, and that filing's name; null when none does. */
function caseGuardianshipType(others) {
  const source = others.find((w) => text(w.typeOfGuardianship));
  return source ? { type: text(source.typeOfGuardianship), name: filingName(source) } : null;
}

/** "A", "A" and "B", "A", "B" and "C" -- each quoted. */
const quotedList = (labels) => {
  const q = labels.map((l) => `"${l}"`);
  return q.length < 2 ? q.join('') : `${q.slice(0, -1).join(', ')} and ${q[q.length - 1]}`;
};

// The "retains the right" boxes, by Plan, grouped by the question they answer.
const RETAINS = {
  planInitial: [
    { section: '2–3. Setting & Medical Care', question: '3', keys: ['q3MedWardDecides'] },
    { section: '6–7. Socialization & Benefits', question: '6', keys: ['q6WardDecides'] },
  ],
  planAnnual: [
    { section: '2–3. Residence & Care', question: '3', keys: ['q3EnsureWardDecides', 'q3MedWardDecides', 'q3MentalWardDecides', 'q3SocialWardDecides'] },
  ],
};
const RETAINS_LABEL = { planInitial: PLAN_INITIAL_CHOICES, planAnnual: PLAN_ANNUAL_CHOICES };

// 74O-5: the ward's accountings for the year just ended, those whose period
// ends the day before the plan year begins -- an Annual, Final or Trust
// Accounting's Part XI, or the Simplified's Part VII (carry-forward-hints.js's
// accountingsForYearEnded(), the one rule the Question 11 note reads too). The
// warning says what each declares and the accounting's period, and not which
// period a plan covers (74O-N2), so it asserts nothing a filer elsewhere might
// read differently. Since the code review (2026-10-17): a plan declaring none
// is warned by any accounting for the year that lists some; one recording
// some only when none lists any and one declares none; $0.00 is not
// remuneration received.
function remunerationAgainstAccounting(filing, others) {
  const read = accountingsForYearEnded(filing, others).map(({ filing: w, data }) => {
    const entries = startedRows(data.remuneration || []);
    return {
      entries, none: !entries.length && data.scheduleNoItems?.remuneration === true, part: remunerationPart(w),
      where: `the ward's ${accountingName(w)} for ${displayDate(data.periodFrom) || '—'} through ${displayDate(data.periodTo) || '—'}`,
    };
  });
  if (!read.length) return [];
  const planNone = ticked(filing.q11NoRemuneration);
  const received = amountForStore(filing.q11Amount, { blank: '' });
  const planSome = !planNone && !!(text(filing.q11ReceivedName) || text(filing.q11From)
    || (typeof received === 'number' ? received !== 0 : text(received)));
  const listing = read.find((a) => a.entries.length);
  if (planNone && listing) {
    const { entries, where, part } = listing;
    const total = roundCents(entries.reduce((sum, r) => sum + amount(r.amount), 0));
    return [advisory('remuneration-plan-and-accounting', 'q11NoRemuneration',
      `11. Remuneration — Question 11 declares that no remuneration was received, while ${where} lists ${money(total)} in ${part} (${entries.length} ${entries.length === 1 ? 'entry' : 'entries'}). Review both before filing.`)];
  }
  const declaresNone = read.find((a) => a.none);
  if (planSome && !listing && declaresNone) {
    return [advisory('remuneration-plan-and-accounting', 'q11NoRemuneration',
      `11. Remuneration — Question 11 records remuneration received, while ${declaresNone.where} declares in ${declaresNone.part} that there is none to report. Review both before filing.`)];
  }
  return [];
}

/**
 * f, i and k for a Plan: what it says against the ward's other filings.
 * @param {Record<string, any>} filing
 * @param {string} engineId the registry's engine id
 * @param {any[] | null | undefined} wards the case file's filings
 */
export function caseConsistencyAdvisories(filing, engineId, wards) {
  if (!filing || !Array.isArray(wards) || !wards.length) return [];
  const out = [];
  // The case's other filings, found once for every comparison below.
  const others = caseFilings(filing, wards);
  const held = caseGuardianshipType(others);
  if (held?.type === 'Plenary') {
    for (const { section, question, keys } of RETAINS[engineId] || []) {
      const ticks = keys.filter((k) => ticked(filing[k]));
      if (!ticks.length) continue;
      const labels = ticks.map((k) => RETAINS_LABEL[engineId][k]);
      out.push(advisory('retains-right-on-plenary', ticks[0],
        `${section} — Question ${question} ticks ${quotedList(labels)}, while the ward's ${held.name} records the Type of Guardianship as "Plenary". Review both before filing.`));
    }
  }
  if (engineId === 'planInitial' && no(filing.q7Trusts)) {
    const inventory = others.find((w) => w.inventoryType === 'guardian');
    const trusts = rowsOf(inventory, 'scheduleC4').map((r) => text(r?.trustName)).filter(Boolean);
    if (trusts.length) {
      out.push(advisory('trusts-no-and-inventory-trust', 'q7Trusts',
        `6–7. Socialization & Benefits — Question 7 answers Trusts "No", while the ward's Verified Initial Inventory lists ${trusts.length === 1 ? 'a trust' : 'trusts'} on Schedule C-4: ${trusts.join('; ')}. Review both before filing.`));
    }
  }
  if (engineId === 'planMinor' && held?.type === 'Minor - Property') {
    out.push(advisory('minor-plan-on-property-guardianship', 'wardName',
      `Cover — The ward's ${held.name} records the Type of Guardianship as "Minor - Property", while this filing is a Plan for Minors. Section 744.367(1) has each guardian of the person file an annual guardianship plan; the app does not decide whether a guardian of the property alone files one. Review before filing.`));
  }
  if (engineId === 'planAnnual') out.push(...remunerationAgainstAccounting(filing, others));
  return out;
}
