// Fields the court's Annual Accounting workbook computes for itself, which the
// app writes a literal over.
//
// Two cells in the annual template are formulas, not input boxes:
//
//   'PART IX '!E21 / G21   the bond period, = From_Date / = To_Date, so the
//                          form derives it from the accounting period
//   'PART II, III'!F25     Guardian #1's name, linked to PART I's Guardian
//
// The app keeps its own field for each -- bondPeriodFrom / bondPeriodTo and
// guardians[0].name -- and writes them into those cells, replacing the
// formula. Dropping the write would silently discard something the filer
// typed, so it stays; but until now the divergence was invisible. A filer
// could enter a bond period that disagreed with the accounting period, or a
// Guardian #1 name that disagreed with the Guardian named in Part I, and the
// filed workbook would carry the contradiction with nothing saying so -- while
// the on-screen form, which still shows the derived value, agreed with neither.
//
// Decided 2026-09-19: conform to the form, allow the overwrite, warn on it.
// These are advisories, not blocks. The filer may have a real reason -- a bond
// written for a term that is not the accounting year is an ordinary thing --
// and the app has no standing to decide that for them. It does have standing
// to say the two no longer match.
//
// Annual family only. The Initial Inventory's bond cells are genuine input
// boxes in its own template, so there is nothing derived there to disagree
// with; see the ALLOWED map in tests/unit/excel-write-targets.spec.js, which
// lists exactly these three cells and no others.

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
      message: `Part IX — ${label} (${a}) differs from ${derivedLabel} (${b}). `
        + "The court's form derives the bond period from the accounting period; this filing will be "
        + 'exported with the date you entered instead. Confirm it is right before filing.',
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
