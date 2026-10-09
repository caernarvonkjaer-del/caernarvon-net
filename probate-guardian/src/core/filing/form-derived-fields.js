// Fields the court's Annual Accounting workbook computes for itself, where
// the app keeps a field of its own.
//
// Two cells in the annual template are formulas, not input boxes:
//
//   'PART IX '!E21 / G21   the bond period, = From_Date / = To_Date, so the
//                          form derives it from the accounting period
//   'PART II, III'!F25     Guardian #1's name, linked to PART I's Guardian
//
// The app keeps its own field for each -- bondPeriodFrom / bondPeriodTo and
// guardians[0].name. Until 2026-09-19 a divergence between the app's field
// and the form's own value was invisible: a filer could enter a bond period
// that disagreed with the accounting period, or a Guardian #1 name that
// disagreed with the Guardian named in Part I, and nothing said so. Decided
// then: warn on it. These are advisories, not blocks -- the app has no
// standing to overrule the filer, only to say the two no longer match.
//
// The two cells are now handled differently, and the messages say which:
//
//   Guardian #1 (F25): the app still writes its field over the formula
//   (decided 2026-09-19; the ALLOWED entry in tests/unit/excel-write-
//   targets.spec.js records it), so the filed Excel carries what was typed.
//
//   Bond period (E21/G21): Milestone 67D, decided 2026-09-23 -- the bond
//   period IS the accounting period. The app no longer writes those cells;
//   the form's formulas fill them. A typed bond period that differs still
//   reaches the PDF, but the filed Excel will show the accounting period, and
//   the advisory tells the filer so in the words approved for it. Silent when
//   the app's field is blank: the form derives it, and a warning would push
//   the filer to fill in what the form fills for them.
//
// The Initial Inventory has one such cell too (Milestone 72A): 'PART III'!F8,
// Guardian #1's name box, is the form's own ='SUMMARY I '!D23 -- the Cover's
// Guardian Name(s). The app writes guardians[0].name over it, by the same
// decision applied to the Inventory (2026-10-01), and warns the same way. Its
// bond cells are genuine input boxes, so there is no bond advisory there.
//
// "Is Guardian #1 among the names?" is a containment test, not equality and
// not a split (nameAmong() below): a Cover or Part I may list co-guardians
// ("Jane Doe and John Doe"), and a name may itself hold a comma ("Smith,
// Jr.", "Acme Trust Co., Inc."). Milestone 72A moved the Annual's rule onto
// the same test -- it used to require the two to be identical, so listing a
// co-guardian in Part I raised a false warning. Any doubt resolves to no
// warning: a missed one costs nothing the printed form doesn't show, and a
// false one teaches the filer to ignore the panel.

import { resolveDescriptorForInventoryType } from './filing-descriptor.js';
import { displayDate } from '../form/date-parser.js';

/** The form engine a filing type runs on ('annual' for Final and Trust too), from the registry. */
const engineOf = (type) => resolveDescriptorForInventoryType(type)?.engineId || '';

/** A date as the workbook stores it: YYYY-MM-DD, or '' when absent. */
function asDay(value) {
  if (!value) return '';
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  const text = String(value).trim();
  return text.length >= 10 ? text.slice(0, 10) : text;
}

const asName = (value) => String(value || '').trim().replace(/\s+/g, ' ');

/** A name reduced for comparison: case folded; . , ; & / and runs of spaces become one space. */
const nameWords = (value) => String(value ?? '').replace(/[‘’]/g, "'").toLowerCase()
  .replace(/[.,;&\/]/g, ' ').replace(/\s+/g, ' ').trim();

/**
 * Whether `name` appears in `names` as a run of whole words, after both are
 * reduced by nameWords(). "Robert T. Nguyen" is among "Robert T. Nguyen,
 * Esq."; "Jane Doe" is among "Jane Doe and John Doe"; "R. M. Alvarez" is not
 * among "Rachel Alvarez". A blank on either side is never "not among" -- the
 * callers stay silent then.
 */
export function nameAmong(name, names) {
  const a = nameWords(name);
  const b = nameWords(names);
  if (!a || !b) return true;
  return ` ${b} `.includes(` ${a} `);
}

/**
 * Advisories for each form-derived cell the filing overwrites with something
 * different. Returns [] when the values agree, when the app's field is blank
 * (nothing is being overwritten), or for any filing type outside the annual
 * family.
 *
 * Deliberately silent when the app's field is empty: an unset bond period is
 * not a disagreement with the form, and warning about it would push the filer
 * toward filling in a field the form would have derived anyway.
 */
export function formDerivedOverwriteWarnings(filing, descriptor = null) {
  const type = descriptor?.inventoryType || filing?.inventoryType || '';
  const engine = engineOf(type);
  if (engine === 'guardian') return inventoryWarnings(filing);
  if (engine === 'simplified') return simplifiedWarnings(filing);
  if (PLAN_COVER_GUARDIANS[engine]) return planSignerWarnings(filing, engine);
  if (engine !== 'annual') return [];

  const out = [];

  const bondPeriod = [
    ['from', filing?.bondPeriodFrom, filing?.periodFrom, 'Bond period start', 'Accounting Period From'],
    ['to', filing?.bondPeriodTo, filing?.periodTo, 'Bond period end', 'Accounting Period To'],
  ];
  for (const [edge, entered, derived, label, derivedLabel] of bondPeriod) {
    const a = asDay(entered);
    const b = asDay(derived);
    if (!a || !b || a === b) continue;
    out.push({
      code: `form-derived.bond-period.${edge}`,
      severity: 'advisory',
      field: `bondPeriod${edge === 'from' ? 'From' : 'To'}`,
      entered: a,
      derived: b,
      // Wording approved by the requester 2026-09-23 (Milestone 67D); the two
      // sentences ship verbatim, then the values so the filer sees which is
      // which -- MM/DD/YYYY since Milestone 73H (they read "2026-03-01").
      message: 'Part IX — The bond period entered differs from the accounting period. '
        + 'The filed Excel will show the accounting period. '
        + `${label} entered: ${displayDate(a)}; ${derivedLabel}: ${displayDate(b)}.`,
    });
  }

  const guardianOne = asName(filing?.guardians?.[0]?.name);
  const partOne = asName(filing?.guardian);
  if (guardianOne && partOne && !nameAmong(guardianOne, partOne)) {
    out.push({
      code: 'form-derived.guardian-name',
      severity: 'advisory',
      field: 'guardians.0.name',
      entered: guardianOne,
      derived: partOne,
      message: `Parts II & III — Guardian #1 (${guardianOne}) differs from the Guardian named in Part I (${partOne}). `
        + "The court's form links the two; this filing will be exported with both names as entered. "
        + 'Confirm which is right before filing.',
    });
  }

  return out;
}

/** The Initial Inventory's one derived cell: Guardian #1's name box (Milestone 72A). */
function inventoryWarnings(filing) {
  const out = [];
  const guardianOne = asName(filing?.guardians?.[0]?.name);
  const cover = asName(filing?.guardianName);
  if (guardianOne && cover && !nameAmong(guardianOne, cover)) {
    out.push({
      code: 'form-derived.guardian-name',
      severity: 'advisory',
      field: 'guardians.0.name',
      entered: guardianOne,
      derived: cover,
      message: `D-1 — Guardian #1 (${guardianOne}) is not among the Guardian Name(s) on the Cover (${cover}). `
        + "The court's form fills Guardian #1's name from the Cover; this filing will be exported with Guardian #1's name as entered. "
        + 'Confirm which is right before filing.',
    });
  }
  // Milestone 72H (decided 2026-10-02): the Inventory keeps both attorney
  // names -- the Cover's, which the workbook prints in Summary I and, by its
  // own links, Parts IV and VI; and D-2's, which the PDF prints in its
  // signature blocks. Nothing compared them, so the two outputs could name
  // different attorneys. Warned, never blocked; the same containment test as
  // the guardian's, either way round, so "Robert T. Nguyen" against "Robert
  // T. Nguyen, Esq." is the same person.
  const d2Attorney = asName(filing?.attorney?.name);
  const coverAttorney = asName(filing?.attorneyForGuardian);
  if (d2Attorney && coverAttorney && !nameAmong(d2Attorney, coverAttorney) && !nameAmong(coverAttorney, d2Attorney)) {
    out.push({
      code: 'form-derived.attorney-name',
      severity: 'advisory',
      field: 'attorney.name',
      entered: d2Attorney,
      derived: coverAttorney,
      message: `D-2 — The attorney's name (${d2Attorney}) differs from the Cover's Attorney for Guardian (${coverAttorney}). `
        + "The Excel workbook prints the Cover's name in Summary I and Parts IV and VI; the PDF prints D-2's name in its signature blocks. "
        + 'Confirm which is right before filing.',
    });
  }
  return out;
}

/**
 * Milestone 73O part 1 (decision 73O-1): the Simplified Accounting's Guardian
 * #1 in Part IV and the Guardian on its Cover. The Clerk's workbook keeps its
 * own link -- Part IV's name box ('PARTS III, IV'!F15) is ='PARTS I, II '!D16,
 * never written -- so the workbook prints the Cover's name while the PDF
 * prints Part IV's. Warned, never blocked, as 72H warns for the Inventory's
 * attorney.
 */
function simplifiedWarnings(filing) {
  const partFour = asName(filing?.guardians?.[0]?.name);
  const cover = asName(filing?.guardian);
  if (!partFour || !cover || nameAmong(partFour, cover)) return [];
  return [{
    code: 'form-derived.guardian-name',
    severity: 'advisory',
    field: 'guardians.0.name',
    entered: partFour,
    derived: cover,
    message: `Part IV — Guardian #1 (${partFour}) is not among the Guardian named on the Cover (${cover}). `
      + "The Excel workbook prints the Cover's name in Part IV; the PDF prints Part IV's. "
      + 'Confirm which is right before filing.',
  }];
}

/** Each Plan's cover list of guardians: the field, and what the cover calls it. */
const PLAN_COVER_GUARDIANS = Object.freeze({
  planInitial: ['guardianNames', 'Guardian Name(s)'],
  planAnnual: ['guardian', 'Guardian Name(s)'],
  planMinor: ['guardianName', 'Guardian Name'],
});

/**
 * Milestone 73O part 1 (decision 73O-N1): on the Initial, Annual and Minors
 * Plans the cover keeps its own list of guardians, and each signer is checked
 * against it, as 72A checks the Inventory's Guardian #1 -- a signer the cover
 * doesn't name is said, never blocked.
 */
function planSignerWarnings(filing, engine) {
  const [field, coverLabel] = PLAN_COVER_GUARDIANS[engine];
  const cover = asName(filing?.[field]);
  if (!cover) return [];
  const out = [];
  (Array.isArray(filing?.planGuardians) ? filing.planGuardians : []).forEach((g, i) => {
    const signer = asName(g?.name);
    if (!signer || nameAmong(signer, cover)) return;
    out.push({
      code: 'form-derived.plan-signer',
      severity: 'advisory',
      field: `planGuardians.${i}.name`,
      entered: signer,
      derived: cover,
      message: `Signatures — ${i ? `Co-guardian ${signer}` : signer} signs this plan but is not among the ${coverLabel} on the cover (${cover}). `
        + 'Confirm which is right before filing.',
    });
  });
  return out;
}

// One consumer -- output-preflight.js -- which imports it. (Deliberately never
// put on window, when countyDriftWarnings still was: a global nothing reads is
// a maintained declaration and an allow-list entry for nothing.)
