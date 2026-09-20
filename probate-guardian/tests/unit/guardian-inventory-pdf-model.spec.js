import { describe, expect, test } from 'vitest';
import { buildVerifiedInventoryModel } from '../../src/features/guardian-inventory/pdf-model.js';

describe('guardian inventory PDF model', () => {
  test('prints Part III as a body heading before the asset schedules', () => {
    const model = buildVerifiedInventoryModel({
      wardName: 'Harold Thomas Bennett',
      caseNumber: '26-002487-GD',
      county: 'Pasco',
      scheduleA1: [{ propertyDescription: 'Primary Residence', fullAssetValue: '275000', wardPercent: '100' }],
      scheduleA2: [],
      scheduleB1: [],
      scheduleB2: [],
      scheduleB3: [],
      scheduleB4: [],
      scheduleC1: [],
      scheduleC2: [],
      scheduleC3: [],
      scheduleC4: [],
      scheduleC5: [],
    });

    const assetsIndex = model.sections.findIndex(section => section.id === 'assets');
    const firstScheduleIndex = model.sections.findIndex(section => section.id === 'a1');

    expect(model.sections[assetsIndex]).toMatchObject({
      title: 'Part III — ASSETS OF THE WARD',
      bookmarkTitle: 'Part III - Assets of the Ward',
      level: 1,
      pageBreakBefore: false,
      blocks: [],
    });
    expect(firstScheduleIndex).toBe(assetsIndex + 1);
    expect(model.sections[firstScheduleIndex]).toMatchObject({
      title: 'Schedule A-1: Real Property Assets',
      parentBookmark: 'Part III - Assets of the Ward',
      level: 2,
      pageBreakBefore: false,
    });
  });

  // Milestone 40H-B: hasSafeDepositBox=false gates the child item out of the
  // Schedule D-3 table entirely, regardless of what safeDepositBoxFiled
  // holds in state -- so a stale/preserved child value while the parent is
  // No is never read, exported, or shown. Confirmed explicitly rather than
  // assumed, since Task 40H-B stops wiping that child value on parent
  // toggle-off and this is the guarantee that makes doing so safe.
  test('Schedule D-3 never emits the safe-deposit-box-filed answer while the parent is No, even if state holds a stale value', () => {
    const model = buildVerifiedInventoryModel({
      wardName: 'Harold Thomas Bennett',
      caseNumber: '26-002487-GD',
      county: 'Pasco',
      hasSafeDepositBox: false,
      safeDepositBoxFiled: true, // stale/preserved answer from before the parent was set to No
      scheduleA1: [], scheduleA2: [], scheduleB1: [], scheduleB2: [], scheduleB3: [], scheduleB4: [],
      scheduleC1: [], scheduleC2: [], scheduleC3: [], scheduleC4: [], scheduleC5: [],
    });

    const d3Section = model.sections.find((section) => section.id === 'd3_d4');
    const d3Table = d3Section.blocks.find((block) => block.title === 'Schedule D-3: Safe Deposit Box & Audit Fee');

    expect(d3Table.items.some((item) => item.label === 'Initial inventory of safe deposit box filed?')).toBe(false);
    expect(d3Table.items.find((item) => item.label === 'Does the ward have a safe deposit box?').value).toBe('No');
  });

  // Schedule B-1's "Restricted?"/"Restricted Amt" columns and subtotal read
  // r.isRestricted, a boolean field the current UI never writes -- it binds
  // the tri-state radio to r.restricted ('Yes'/'No'/'') instead
  // (src/features/guardian-inventory/index.js's schB1_rest_ radio). Every
  // row entered through the current UI therefore always showed "No" and
  // "—" here, and the restricted-cash subtotal was always $0.00, regardless
  // of what the filer actually selected.
  test('Schedule B-1 reads the current tri-state restricted field, not the dead isRestricted boolean', () => {
    const model = buildVerifiedInventoryModel({
      wardName: 'Harold Thomas Bennett',
      caseNumber: '26-002487-GD',
      county: 'Pasco',
      scheduleA1: [], scheduleA2: [],
      // Milestone 60A: every schedule is ward-apportioned now, so a fixture
      // that wants the full figure must say 100% -- a blank percentage is 0%,
      // the same thing a blank Ward's % cell means in the court workbook.
      scheduleB1: [
        { institutionName: 'Fifth Third Bank', fullAssetAmount: '1000', restricted: 'Yes', wardPercent: '100' },
        { institutionName: 'Regions Bank', fullAssetAmount: '2000', restricted: 'No', wardPercent: '100' },
      ],
      scheduleB2: [], scheduleB3: [], scheduleB4: [],
      scheduleC1: [], scheduleC2: [], scheduleC3: [], scheduleC4: [], scheduleC5: [],
    });

    const b1Table = model.sections.find(section => section.id === 'b1').blocks[0];
    expect(b1Table.rows[0][4]).toBe('Yes');
    expect(b1Table.rows[0][5]).toBe('$1,000.00');
    expect(b1Table.rows[1][4]).toBe('No');
    expect(b1Table.rows[1][5]).toBe('—');
    expect(b1Table.totals.values[1].value).toBe('$1,000.00');
  });

  test('Schedules A-1, B-2, and B-3 print explicit answers and preserve unanswered status', () => {
    const model = buildVerifiedInventoryModel({
      wardName: 'Harold Thomas Bennett',
      caseNumber: '26-002487-GD',
      county: 'Pasco',
      scheduleA1: [{ propertyDescription: 'Home', residence: 'No', income: 'Yes', fullAssetValue: '100000', wardPercent: '100' }],
      scheduleA2: [],
      scheduleB1: [{ institutionName: 'Bank', fullAssetAmount: '1000', restricted: '', wardPercent: '100' }],
      scheduleB2: [{ description: 'Furniture', inSafeDepositBox: 'No', fullAssetValue: '1200', wardPercent: '100' }],
      scheduleB3: [{ description: 'Brokerage', restricted: 'Yes', inSafeDepositBox: 'No', fullAssetValue: '500', wardPercent: '100' }],
      scheduleB4: [], scheduleC1: [], scheduleC2: [], scheduleC3: [], scheduleC4: [], scheduleC5: [],
    });

    const row = id => model.sections.find(section => section.id === id).blocks[0].rows[0];
    expect(row('a1').slice(6)).toEqual(['No', 'Yes']);
    expect(row('b1')[4]).toBe('—');
    expect(row('b2')[6]).toBe('No');
    expect(row('b3').slice(5)).toEqual(['Yes', 'No']);
  });

  test('adds uploaded supporting documents to the matching schedule section', () => {
    const model = buildVerifiedInventoryModel({
      wardName: 'Harold Thomas Bennett',
      caseNumber: '26-002487-GD',
      county: 'Pasco',
      activeYearKey: 'initial',
      scheduleB1: [{ institutionName: 'Fifth Third Bank', fullAssetAmount: '68500', restricted: 'Yes' }],
      scheduleDocs: {
        b1: {
          initial: {
            comment: 'Bank statement confirms account balance.',
            files: [{
            name: 'mock_bank_statement.pdf',
            type: 'application/pdf',
            size: 3600,
            dataUrl: 'data:application/pdf;base64,JVBERi0xLjQK',
            contentDigest: 'sha256-test',
            technicalStatus: 'ready',
            pageCount: 1,
          }],
          },
        },
      },
    });

    const b1 = model.sections.find(section => section.id === 'b1');
    expect(b1.blocks.at(-1)).toMatchObject({
      type: 'supporting-documents',
      title: 'Supporting Documents',
      comment: 'Bank statement confirms account balance.',
      files: [{
        name: 'mock_bank_statement.pdf',
        type: 'application/pdf',
        size: 3600,
        technicalStatus: 'ready',
        pageCount: 1,
      }],
    });
  });
});

// Milestone 60A. The PDF used to carry its own arithmetic: eight of eleven
// schedules summed the FULL value and ignored the Ward's %, the audit fee ran
// Annual Accounting's four-tier ladder instead of this form's two-tier rule
// (PART V!G8/G9: $85 above $25,000, else $0), and Summary I clamped a net
// figure at zero where the workbook (SUMMARY I!H32 = G30+G31) does not. The
// figures now come from the shared Guardian calculator in totals.js. Each
// test below isolates ONE of those defects, because a single fixture can turn
// $170 into $85 through either the fee rule or the percentage.
describe('Milestone 60A: PDF totals come from the shared Guardian calculator', () => {
  const base = (extra = {}) => ({
    wardName: 'Harold Thomas Bennett', caseNumber: '26-002487-GD', county: 'Pasco',
    scheduleA1: [], scheduleA2: [], scheduleB1: [], scheduleB2: [], scheduleB3: [], scheduleB4: [],
    scheduleC1: [], scheduleC2: [], scheduleC3: [], scheduleC4: [], scheduleC5: [],
    ...extra,
  });
  const auditFee = (model) => model.sections.find(s => s.id === 'd3_d4').blocks[0].items
    .find(i => i.label === 'Audit Fee Determination').value;
  const scheduleTotals = (model, id) => model.sections.find(s => s.id === id).blocks[0].totals;
  const summaryI = (model) => model.sections.find(s => s.id === 'summary').blocks[0];
  const summaryII = (model) => model.sections.find(s => s.id === 'summary').blocks[1];

  test('fee rule alone: $120,000 at 100% ownership is $85, not Annual\'s $170 tier', () => {
    const model = buildVerifiedInventoryModel(base({
      scheduleA1: [{ propertyDescription: 'Home', fullAssetValue: '120000', wardPercent: '100' }],
    }));
    expect(auditFee(model)).toMatch(/^\$85\.00\b/);
    expect(auditFee(model)).not.toContain('170');
  });

  test('fee rule alone: above $500,000 is still $85, not Annual\'s $250 tier', () => {
    const model = buildVerifiedInventoryModel(base({
      scheduleA1: [{ propertyDescription: 'Home', fullAssetValue: '750000', wardPercent: '100' }],
    }));
    expect(auditFee(model)).toMatch(/^\$85\.00\b/);
  });

  // Exactly $25,000 is an unresolved authority gap (MILESTONE-60-PROPOSAL.md,
  // 60A): the form says "in excess of $25,000" -> $85 and "below $25,000" ->
  // $0 and names neither for the boundary. Today's rule is `> 25000`, so the
  // boundary prints $0. This pins that behavior so a change to it is made on
  // purpose, not as a side effect; it does not certify $0 as correct.
  test.each([
    ['25000', /^\$0\.00\b/],
    ['25000.01', /^\$85\.00\b/],
    ['100000', /^\$85\.00\b/],
    ['500000.01', /^\$85\.00\b/],
  ])('fee boundary: a total of $%s prints %s', (total, expected) => {
    const model = buildVerifiedInventoryModel(base({
      scheduleB1: [{ institutionName: 'Bank', fullAssetAmount: total, wardPercent: '100', restricted: 'No' }],
    }));
    expect(auditFee(model)).toMatch(expected);
  });

  test('apportionment alone: every schedule total is the ward\'s share, not the full figure', () => {
    const model = buildVerifiedInventoryModel(base({
      scheduleA2: [{ lenderName: 'Lender', fullDebtBalance: '1000', wardPercent: '50' }],
      scheduleB1: [{ institutionName: 'Bank', fullAssetAmount: '1000', wardPercent: '50', restricted: 'Yes' }],
      scheduleB4: [{ lenderName: 'Lender', fullLiabilityBalance: '1000', wardPercent: '50' }],
      scheduleC1: [{ payerName: 'SSA', annualIncomeAmount: '1000', wardPercent: '50' }],
      scheduleC2: [{ claimantName: 'Claimant', amountOfClaim: '1000', wardPercent: '50' }],
      scheduleC3: [{ defendantName: 'Defendant', estimatedSettlement: '1000', wardPercent: '50' }],
      scheduleC4: [{ trustName: 'Trust', trustAmount: '1000', wardPercent: '50' }],
      scheduleC5: [{ assetDescription: 'Joint account', totalAssetValue: '1000', jointOwnerPercent: '50' }],
    }));
    expect(scheduleTotals(model, 'a2').value).toBe('$500.00');
    // B-1 carries two totals: the schedule total and the restricted subtotal,
    // and the restricted subtotal was unadjusted even where the main one was not.
    expect(scheduleTotals(model, 'b1').values.map(v => v.value)).toEqual(['$500.00', '$500.00']);
    expect(scheduleTotals(model, 'b4').value).toBe('$500.00');
    for (const id of ['c1', 'c2', 'c3', 'c4', 'c5']) {
      expect(scheduleTotals(model, id).value, id).toBe('$500.00');
    }
    // The per-row restricted amount in B-1 is the ward's share too.
    expect(model.sections.find(s => s.id === 'b1').blocks[0].rows[0].at(-1)).toBe('$500.00');
    // And the summaries read the same figures.
    expect(summaryI(model).rows[0][3]).toBe('$500.00'); // Schedule A debts
    expect(summaryI(model).rows[1][3]).toBe('$500.00'); // Schedule B debts
    expect(summaryII(model).rows.map(r => r[2])).toEqual(['$500.00', '$500.00', '$500.00', '$500.00', '$500.00']);
  });

  test('a blank Ward\'s % is 0%, as in the workbook, and is printed as unanswered rather than as 100%', () => {
    const model = buildVerifiedInventoryModel(base({
      scheduleA1: [{ propertyDescription: 'Home', fullAssetValue: '1000' }],
    }));
    const row = model.sections.find(s => s.id === 'a1').blocks[0].rows[0];
    expect(row).toContain('—');
    expect(row).not.toContain('100%');
    expect(scheduleTotals(model, 'a1').value).toBe('$0.00');
  });

  test('Summary I nets are not clamped at zero: debts above assets print as a negative figure', () => {
    const model = buildVerifiedInventoryModel(base({
      scheduleA1: [{ propertyDescription: 'Home', fullAssetValue: '1000', wardPercent: '100' }],
      scheduleA2: [{ lenderName: 'Lender', fullDebtBalance: '5000', wardPercent: '100' }],
    }));
    expect(summaryI(model).rows[0][4]).toBe('-$4,000.00');
    expect(summaryI(model).totals.value).toBe('-$4,000.00');
  });
});
