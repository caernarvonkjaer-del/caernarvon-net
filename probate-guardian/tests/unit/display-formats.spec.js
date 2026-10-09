// Milestone 73H: one way to show dates and negative amounts.
//
// Decisions (settled 2026-10-04/05, and two raised while building, 2026-10-08):
//   73H-1  a negative amount prints ($5,000.00) on every PDF and screen --
//          the Clerk's workbooks' own format; it printed five ways
//          ("$-5,000.00", "-$5,000.00", "(5,000.00)", hand-wrapped
//          "($1,021.21)", and "($5,000.00)").
//   73H-N1 a dollar sign on every amount, the Annual screens included.
//   73H-2  a blank date in a PDF sentence or labelled field prints a line to
//          write it on -- never "for the period  through ." -- except the bond
//          lines' approved "[date]".
//   73H-N2 a signature block with no date still leaves its date line out.
// And the design's: every date shown goes through formatDisplayDate()
// (MM/DD/YYYY); Part VI, Part VII and the Quick Summary show a disbursement or
// liability negated, as the workbook holds it; the Annual Plan's Q11 prints as
// currency; a blank remuneration amount prints blank, not $0.00; the fee line
// says what it is based on (Line 30).
//
// Red-first: before 73H, the helpers don't exist and the models print the old
// styles (see each case).
import { beforeAll, describe, expect, test } from 'vitest';
import { presentAmount, withMinusCue } from '../../src/core/form/amount-codec.js';
import { BLANK_DATE_LINE, dateOrLine, displayDate, displayLocalDate } from '../../src/core/form/date-parser.js';
import { fmt } from '../../src/core/format/money.js';

globalThis.window = globalThis.window || {};

let m;
beforeAll(async () => {
  const [annual, simplified, inventory, planAnnual, planInitial, planMinor, planSimplified, engines, summary] = await Promise.all([
    import('../../src/features/annual-accounting/pdf-model.js'),
    import('../../src/features/simplified-accounting/pdf-model.js'),
    import('../../src/features/guardian-inventory/pdf-model.js'),
    import('../../src/features/plan-annual/pdf-model.js'),
    import('../../src/features/plan-initial/pdf-model.js'),
    import('../../src/features/plan-minor/pdf-model.js'),
    import('../../src/features/plan-simplified/pdf-model.js'),
    import('../../src/core/validation/engines/annual.js'),
    import('../../src/core/summary-renderer.js'),
  ]);
  m = { annual, simplified, inventory, planAnnual, planInitial, planMinor, planSimplified, engines, summary };
}, 120_000);

/** Every string a model holds, for "does it print X" questions. */
const text = (model) => JSON.stringify(model);
const rowOf = (model, sectionId, first) => model.sections.find((s) => s.id === sectionId)?.blocks
  .flatMap((b) => b.rows || []).find((r) => r[0] === first);

describe('the shared helpers', () => {
  test('an amount: $5,000.00, and a negative ($5,000.00), rounded by the workbook\'s rule', () => {
    expect(presentAmount(5000)).toBe('$5,000.00');
    expect(presentAmount(-5000)).toBe('($5,000.00)');
    expect(presentAmount(-1.005)).toBe('($1.01)');
    expect(presentAmount(0)).toBe('$0.00');
    expect(presentAmount(-0.004)).toBe('$0.00');
    expect(fmt(-1089.89), "the Inventory's screens and PDF").toBe('($1,089.89)');
    expect(m.engines.fmtAnnual(-5000), "the Annual's screens (a dollar sign now, 73H-N1)").toBe('($5,000.00)');
    expect(m.engines.fmtAnnual(5000)).toBe('$5,000.00');
    expect(m.engines.fmtAnnual('')).toBe('');
  });

  test('on a screen a negative also says "minus" to a screen reader; nothing else changes', () => {
    expect(withMinusCue('($5,000.00)')).toBe('<span class="visually-hidden">minus </span>($5,000.00)');
    for (const t of ['$5,000.00', '—', '', 'Ward (a note)']) expect(withMinusCue(t), t).toBe(t);
  });

  test('a date: MM/DD/YYYY; a timestamp or a Date by its stored day; other text as it is; blank empty', () => {
    expect(displayDate('2026-01-01')).toBe('01/01/2026');
    expect(displayDate('2026-05-20T00:00:00Z')).toBe('05/20/2026');
    expect(displayDate(new Date('2026-05-20T00:00:00Z'))).toBe('05/20/2026');
    expect(displayDate(new Date('2026-01-01T23:59:59Z')), 'the stored (UTC) day, never shifted by the clock').toBe('01/01/2026');
    expect(displayDate('13/45/2026')).toBe('13/45/2026');
    for (const blank of ['', null, undefined]) expect(displayDate(blank)).toBe('');
    expect(displayDate(new Date('nope'))).toBe('');
  });

  test('a PDF\'s blank date is a line to write it on', () => {
    expect(BLANK_DATE_LINE).toBe('__________');
    expect(dateOrLine('')).toBe(BLANK_DATE_LINE);
    expect(dateOrLine('2026-12-31')).toBe('12/31/2026');
  });

  test('a local moment (a deadline, a merge) by its own calendar day', () => {
    expect(displayLocalDate(new Date(2028, 3, 1))).toBe('04/01/2028');
    expect(displayLocalDate(new Date(2026, 9, 8, 23, 59))).toBe('10/08/2026');
    expect(displayLocalDate('2026-10-08')).toBe('');
  });

  test('the summary pages\' period: MM/DD/YYYY, blank "—"', () => {
    expect(m.summary.formatSummaryDate('2025-01-01')).toBe('01/01/2025');
    expect(m.summary.formatSummaryDate('')).toBe('—');
  });
});

describe('the Annual family\'s PDF', () => {
  const filing = (extra = {}) => ({
    inventoryType: 'annual', wardName: 'Pat Ward', county: 'Pinellas',
    periodFrom: '2026-01-01', periodTo: '2026-12-31', startingBalance: -5000,
    schB1: [{ amount: 1000 }], schB2: [{ amount: -250 }],
    schD5: [{ fullDebt: 400, wardPct: 100 }],
    ...extra,
  });

  test('Part VI shows each disbursement subtracted -- the negated figure, as the workbook holds it; a refund prints positive', () => {
    const model = m.annual.buildAnnualAccountingModel(filing());
    expect(rowOf(model, 'part6', 'Starting Balance [Net Assets per Prior Report]')[1]).toBe('($5,000.00)');
    expect(rowOf(model, 'part6', 'Schedule B-1 — Attorney Fees and Costs')[1], 'it printed "($1,000.00)" by hand').toBe('($1,000.00)');
    expect(rowOf(model, 'part6', 'Schedule B-2 — Guardian Fees and Costs')[1], 'a refund; it printed "($-250.00)"').toBe('$250.00');
    expect(rowOf(model, 'part6', 'Total Disbursements (B-1 through B-4)')[1]).toBe('($750.00)');
    expect(text(model)).not.toMatch(/\$-|\(\(|\(\$-/);
  });

  test('Part VII shows the liabilities subtracted the same way; a credit balance prints positive', () => {
    const d5 = (fullDebt) => m.annual.buildAnnualAccountingModel(filing({ schD5: [{ fullDebt, wardPct: 100 }] }))
      .sections.flatMap((s) => s.blocks).flatMap((b) => b.rows || []).find((r) => r[0] === 'Schedule D-5 — Mortgages / Liabilities')[2];
    expect(d5(400)).toBe('($400.00)');
    expect(d5(-400), 'it printed "($-400.00)"').toBe('$400.00');
  });

  test('the fee line says the estate value is Line 30', () => {
    expect(text(m.annual.buildAnnualAccountingModel(filing()))).toContain('Applicable Audit Fee — Estate value (Net Assets, Line 30): ');
  });

  test('a blank period prints a line in every sentence and labelled field; a filled one MM/DD/YYYY', () => {
    const blank = text(m.annual.buildAnnualAccountingModel(filing({ periodFrom: '', periodTo: '' })));
    expect(blank).not.toMatch(/for the period\s+through \./);
    // Milestone 73N part 2: the declaration continues past the period, as the
    // workbook's does ("... and includes a statement of the ward's assets").
    expect(blank).toContain(`from ${BLANK_DATE_LINE} through ${BLANK_DATE_LINE} and includes a statement`);
    expect(blank).toContain(`From: ${BLANK_DATE_LINE}   To: ${BLANK_DATE_LINE}`);
    expect(text(m.annual.buildAnnualAccountingModel(filing()))).toContain('from 01/01/2026 through 12/31/2026 and includes a statement');
  });

  test('a blank remuneration amount prints blank, not $0.00', () => {
    const model = m.annual.buildAnnualAccountingModel(filing({ remuneration: [{ guardian: 'Pat', type: 'Fee', amount: '' }, { guardian: 'Pat', type: 'Fee', amount: -10 }] }));
    const rows = model.sections.flatMap((s) => s.blocks).find((b) => b.title === 'Declaration of Remuneration').rows;
    expect(rows.map((r) => r[4])).toEqual(['', '($10.00)']);
  });
});

describe('the Simplified\'s PDF', () => {
  test('a negative prints ($...); disbursements stay positive, as its workbook holds them; a blank remuneration amount is blank', () => {
    const model = m.simplified.buildSimplifiedAccountingModel({
      inventoryType: 'simplified', startingBalance: -250.5, serviceCharges: 10, periodFrom: '', periodTo: '',
      remuneration: [{ guardian: 'Pat', type: 'Fee', amount: '' }],
    });
    const all = text(model);
    expect(all, 'it printed "$-250.50"').toContain('($250.50)');
    expect(all).not.toContain('$-');
    expect(all).toContain(`From: ${BLANK_DATE_LINE}  To: ${BLANK_DATE_LINE}`);
    const rem = model.sections.flatMap((s) => s.blocks).find((b) => Array.isArray(b.headers) && b.headers.includes('Amount') && (b.rows || []).some((r) => r[1] === 'Pat'));
    expect(rem.rows[0][4]).toBe('');
  });
});

describe('the Inventory\'s PDF', () => {
  test('a negative prints ($...), never "-$..."; a blank GID and "as of" date print a line', () => {
    const model = m.inventory.buildVerifiedInventoryModel({
      inventoryType: 'guardian', gid: '', scheduleA2: [{ lenderName: 'L', fullDebtBalance: 20000, wardPercent: 100 }],
      preparer: { name: 'Prep', asOfDate: '', signatureDate: '' }, attorney: {},
    }, { printDate: '2026-10-08' });
    const all = text(model);
    expect(all, 'Summary I nets the liability: it printed "-$20,000.00"').toContain('($20,000.00)');
    expect(all).not.toMatch(/-\$\d/);
    expect(all).toContain(`"value":"${BLANK_DATE_LINE}"`);
    expect(all).toContain(`as of ${BLANK_DATE_LINE}.`);
    expect(all).not.toContain('[date].');
  });
});

describe('the Plans\' PDFs', () => {
  test('Annual Plan: Q11 prints as currency (it printed "1259.59"); blank, a line', () => {
    const base = { q11ReceivedName: 'Pat', q11From: 'the estate' };
    // Milestone 73N part 2: the court's "the monies of $___".
    expect(text(m.planAnnual.buildPlanAnnualModel({ ...base, q11Amount: 1259.59 }))).toContain('I have received the monies of $1,259.59 from the estate');
    expect(text(m.planAnnual.buildPlanAnnualModel({ ...base, q11Amount: '' }))).toContain(`I have received the monies of ${BLANK_DATE_LINE} from the estate`);
  });

  test('each Plan\'s period prints a line when blank, MM/DD/YYYY when filled', () => {
    for (const [name, build] of [['planAnnual', m.planAnnual.buildPlanAnnualModel], ['planInitial', m.planInitial.buildPlanInitialModel], ['planMinor', m.planMinor.buildPlanMinorModel], ['planSimplified', m.planSimplified.buildPlanSimplifiedModel]]) {
      expect(text(build({ periodFrom: '', periodTo: '' }, {})), name).toContain(BLANK_DATE_LINE);
      expect(text(build({ periodFrom: '2026-01-01', periodTo: '2026-12-31' }, {})), name).toContain('01/01/2026');
    }
  });
});
