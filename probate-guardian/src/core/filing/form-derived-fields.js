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
// Annual family only. The Initial Inventory's bond cells are genuine input
// boxes in its own template, so there is nothing derived there to disagree
// with.

const ANNUAL_ENGINE = new Set(['annual', 'finalAccounting', 'trustAccounting']);

/** A date as the workbook stores it: YYYY-MM-DD, or '' when absent. */
function asDay(value) {
  if (!value) return '';
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  const text = String(value).trim();
  return text.length >= 10 ? text.slice(0, 10) : text;
}

const asName = (value) => String(value || '').trim().replace(/\s+/g, ' ');

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
  if (!ANNUAL_ENGINE.has(type)) return [];

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
      // which.
      message: 'Part IX — The bond period entered differs from the accounting period. '
        + 'The filed Excel will show the accounting period. '
        + `${label} entered: ${a}; ${derivedLabel}: ${b}.`,
    });
  }

  const guardianOne = asName(filing?.guardians?.[0]?.name);
  const partOne = asName(filing?.guardian);
  if (guardianOne && partOne && guardianOne !== partOne) {
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

// Deliberately NOT bridged onto window. countyDriftWarnings is, for legacy
// callers that predate the preflight; this has only one consumer --
// output-preflight.js -- which imports it as a module. A global nothing reads
// is a maintained declaration and an allow-list entry for nothing.
