import { describe, expect, test } from 'vitest';
import { buildVerifiedInventoryModel } from '../../src/features/guardian-inventory/pdf-model.js';

// Milestone 64A-2, item 2.1 / D1 (decided 2026-09-21, reopened same day: the
// app's Gross/Debts/Net table would have printed mostly empty cells for a
// single-figure schedule row, so the final layout is the form's own single
// Amount column instead). Printed Part II used to collapse eleven schedules
// into two rows ("Schedule A" / "Schedule B") under Gross/Debts/Net headers
// that don't match anything on the court's own SUMMARY I. The form lists
// each schedule individually (A-1, A-2, a net-of-liabilities line, B-1
// through B-4, a second net line, and the grand total) -- this pins that the
// print now matches, using the same schedule totals as the on-screen
// Summary and the individual schedule tables elsewhere on the page.
describe('Milestone 64A-2, item 2.1: Summary I lists every schedule individually, not two collapsed rows', () => {
  const base = (extra = {}) => ({
    wardName: 'Harold Thomas Bennett', caseNumber: '26-002487-GD', county: 'Pasco',
    scheduleA1: [], scheduleA2: [], scheduleB1: [], scheduleB2: [], scheduleB3: [], scheduleB4: [],
    scheduleC1: [], scheduleC2: [], scheduleC3: [], scheduleC4: [], scheduleC5: [],
    ...extra,
  });

  test('prints A-1, A-2 (negative), net of liabilities, B-1 through B-4 (B-4 negative), the second net line, and the grand total, in that order', () => {
    const model = buildVerifiedInventoryModel(base({
      scheduleA1: [{ propertyDescription: 'Home', fullAssetValue: '100000', wardPercent: '100' }],
      scheduleA2: [{ lenderName: 'Bank', fullDebtBalance: '20000', wardPercent: '100' }],
      scheduleB1: [{ institutionName: 'Bank', fullAssetAmount: '5000', wardPercent: '100', restricted: 'No' }],
      scheduleB2: [{ description: 'Furniture', fullAssetValue: '3000', wardPercent: '100' }],
      scheduleB3: [{ description: 'Stocks', fullAssetValue: '2000', wardPercent: '100' }],
      scheduleB4: [{ lenderName: 'Card Co', fullLiabilityBalance: '1000', wardPercent: '100' }],
    }));
    const summary = model.sections.find((s) => s.id === 'summary').blocks[0];

    expect(summary.headers).toEqual(['Schedule', 'Title', 'Amount']);
    expect(summary.rows).toEqual([
      ['A-1', 'Real Estate / Real Property', '$100,000.00'],
      ['A-2', 'Real Estate Liabilities', '-$20,000.00'],
      ['', 'Real Estate Assets, Net of Liabilities', '$80,000.00'],
      ['B-1', 'Cash Assets / Cash Equivalent Assets', '$5,000.00'],
      ['B-2', 'Personal Property Assets', '$3,000.00'],
      ['B-3', 'Intangible Assets', '$2,000.00'],
      ['B-4', 'Liabilities / Secured and Unsecured Debt / Notes / Loans', '-$1,000.00'],
      ['', 'Cash / Personal Property / Intangible Assets, Net of Liabilities', '$9,000.00'],
    ]);
    expect(summary.totals).toEqual({ label: 'VERIFIED INITIAL INVENTORY OF GUARDIAN', value: '$89,000.00' });
  });

  test('an empty filing prints all zeroes in the Amount column, not blank cells', () => {
    const model = buildVerifiedInventoryModel(base());
    const summary = model.sections.find((s) => s.id === 'summary').blocks[0];
    expect(summary.rows.map((row) => row.at(-1))).toEqual(Array(8).fill('$0.00'));
    expect(summary.totals.value).toBe('$0.00');
  });
});

// Milestone 64A-2, item 2.2. Form SUMMARY II: H9 = -'C-2'!H50 (a liability
// against the ward, printed negative like A-2/B-4 on Summary I); its five
// row labels and section title are also the form's own (this item and part
// of 2.6's title table cover the same Summary II text, so both land here).
describe('Milestone 64A-2, item 2.2: Summary II prints C-2 negative and the form\'s own labels', () => {
  const base = (extra = {}) => ({
    wardName: 'Harold Thomas Bennett', caseNumber: '26-002487-GD', county: 'Pasco',
    scheduleA1: [], scheduleA2: [], scheduleB1: [], scheduleB2: [], scheduleB3: [], scheduleB4: [],
    scheduleC1: [], scheduleC2: [], scheduleC3: [], scheduleC4: [], scheduleC5: [],
    ...extra,
  });

  test('prints the form\'s own section title and five row labels, with C-2 negative', () => {
    const model = buildVerifiedInventoryModel(base({
      scheduleC1: [{ payerName: 'SSA', annualIncomeAmount: '1000', wardPercent: '100' }],
      scheduleC2: [{ claimantName: 'Claimant', amountOfClaim: '1000', wardPercent: '100' }],
      scheduleC3: [{ defendantName: 'Defendant', estimatedSettlement: '1000', wardPercent: '100' }],
      scheduleC4: [{ trustName: 'Trust', trustAmount: '1000', wardPercent: '100' }],
      scheduleC5: [{ assetDescription: 'Joint account', totalAssetValue: '1000', jointOwnerPercent: '100' }],
    }));
    const summary = model.sections.find((s) => s.id === 'summary');
    const summaryII = summary.blocks[1];
    expect(summaryII.title).toBe('Summary II — Other Financial Information');
    expect(summaryII.rows.map((r) => r[1])).toEqual([
      'Income (Annualized)',
      'Lawsuits Pending Against the Ward',
      'Lawsuits Pending by the Ward',
      'Value of Trusts for the Ward',
      "Joint Owners of Ward's Assets",
    ]);
    expect(summaryII.rows[1][2]).toBe('-$1,000.00');
  });
});

// Milestone 64A-2, item 2.3. Form SUMMARY I B26 "Does Ward have a Safe
// Deposit Box?" (D26) and E26 "If yes, has the Safe Deposit Box Inventory
// been filed?" (H26) never printed on Part I at all -- only Part V (Schedule
// D-3) asked, and only when the answer was Yes. Part I now asks both,
// always, printing "N/A" for the second when the first isn't Yes; Part V's
// existing behavior (omit the second line entirely unless Yes) is untouched.
describe('Milestone 64A-2, item 2.3: Part I prints the Safe Deposit Box questions', () => {
  const base = (extra = {}) => ({
    wardName: 'Harold Thomas Bennett', caseNumber: '26-002487-GD', county: 'Pasco',
    scheduleA1: [], scheduleA2: [], scheduleB1: [], scheduleB2: [], scheduleB3: [], scheduleB4: [],
    scheduleC1: [], scheduleC2: [], scheduleC3: [], scheduleC4: [], scheduleC5: [],
    ...extra,
  });
  const part1Items = (model) => model.sections.find((s) => s.id === 'cover').blocks[0].items;

  test('SDB Yes, filed No: Part I prints both answers', () => {
    const model = buildVerifiedInventoryModel(base({ hasSafeDepositBox: 'Yes', safeDepositBoxFiled: 'No' }));
    const items = part1Items(model);
    expect(items).toContainEqual({ label: 'Does Ward have a Safe Deposit Box?', value: 'Yes' });
    expect(items).toContainEqual({ label: 'If yes, has the Safe Deposit Box Inventory been filed?', value: 'No' });
  });

  test('SDB No: Part I prints "No" and "N/A", not the omission Part V uses', () => {
    const model = buildVerifiedInventoryModel(base({ hasSafeDepositBox: 'No' }));
    const items = part1Items(model);
    expect(items).toContainEqual({ label: 'Does Ward have a Safe Deposit Box?', value: 'No' });
    expect(items).toContainEqual({ label: 'If yes, has the Safe Deposit Box Inventory been filed?', value: 'N/A' });
  });
});

// Milestone 64A-2, item 2.6. The entry pages already use the form's own
// schedule titles; the print used the app's own paraphrases instead
// (templates/guardian-template.js is the reference). This also updates the
// "verified none" sentence's noun to match, per the item's own example
// ("no real estate / real property to report"). Bookmark strings (a
// separate, shorter navigation label) are untouched -- 2.6 names what
// prints on the page, not the outline tree.
describe('Milestone 64A-2, item 2.6: printed schedule titles match the court form', () => {
  const base = (extra = {}) => ({
    wardName: 'Harold Thomas Bennett', caseNumber: '26-002487-GD', county: 'Pasco',
    scheduleA1: [], scheduleA2: [], scheduleB1: [], scheduleB2: [], scheduleB3: [], scheduleB4: [],
    scheduleC1: [], scheduleC2: [], scheduleC3: [], scheduleC4: [], scheduleC5: [],
    ...extra,
  });

  test.each([
    ['a1', 'Schedule A-1: Real Estate / Real Property'],
    ['a2', 'Schedule A-2: Real Estate Liabilities (Mortgages / Notes / Loans)'],
    ['b1', 'Schedule B-1: Cash Assets / Cash Equivalent Assets'],
    ['b2', 'Schedule B-2: Personal Property Assets'],
    ['b3', 'Schedule B-3: Intangible Assets'],
    ['b4', 'Schedule B-4: Liabilities / Secured and Unsecured Debts / Notes / Loans'],
    ['c1', 'Schedule C-1: Income (Annualized)'],
    ['c2', 'Schedule C-2: Lawsuits Pending Against the Ward'],
    ['c3', 'Schedule C-3: Lawsuits Pending by the Ward'],
    ['c4', 'Schedule C-4: Value of Trusts for the Ward'],
    ['c5', "Schedule C-5: Joint Owners of Ward's Assets"],
  ])('%s prints the form title %j', (id, expectedTitle) => {
    const model = buildVerifiedInventoryModel(base());
    expect(model.sections.find((s) => s.id === id).title).toBe(expectedTitle);
  });

  test('an empty schedule\'s "verified none" sentence uses the form\'s sense of the schedule, not the app\'s old paraphrase', () => {
    const model = buildVerifiedInventoryModel(base({
      scheduleNoItems: { a1: true, a2: true },
    }));
    const a1Notice = model.sections.find((s) => s.id === 'a1').blocks[0];
    const a2Notice = model.sections.find((s) => s.id === 'a2').blocks[0];
    expect(a1Notice.text).toBe('The filer verifies there are no real estate / real property to report for this schedule.');
    expect(a2Notice.text).toBe('The filer verifies there are no real estate liabilities to report for this schedule.');
  });
});

// Milestone 64A-2, item 2.7. Form PART V B8/B9 states the fee schedule
// itself ("Property Value in Excess of $25,000 ... $85.00" / "below $25,000
// ... $0.00") before the determination; the print only showed the base
// figure and the determination, never the rule those numbers come from.
describe('Milestone 64A-2, item 2.7: the two-line audit fee schedule prints above the determination', () => {
  test('prints both fee-schedule lines before Audit Fee Determination', () => {
    const model = buildVerifiedInventoryModel({
      wardName: 'Harold Thomas Bennett', caseNumber: '26-002487-GD', county: 'Pasco',
      scheduleA1: [], scheduleA2: [], scheduleB1: [], scheduleB2: [], scheduleB3: [], scheduleB4: [],
      scheduleC1: [], scheduleC2: [], scheduleC3: [], scheduleC4: [], scheduleC5: [],
    });
    const items = model.sections.find((s) => s.id === 'd3_d4').blocks[0].items;
    const labels = items.map((i) => i.label);
    const excessIndex = labels.indexOf('Property Value in Excess of $25,000');
    const belowIndex = labels.indexOf('Property Value Below $25,000');
    const determinationIndex = labels.indexOf('Audit Fee Determination');
    expect(excessIndex).toBeGreaterThan(-1);
    expect(belowIndex).toBeGreaterThan(-1);
    expect(items[excessIndex].value).toBe('$85.00');
    expect(items[belowIndex].value).toBe('$0.00');
    expect(excessIndex).toBeLessThan(determinationIndex);
    expect(belowIndex).toBeLessThan(determinationIndex);
  });
});

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
      title: 'Schedule A-1: Real Estate / Real Property', // Milestone 64A-2, item 2.6: form title
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

    // Column positions follow the court form's own order since Milestone 60B
    // ('B-1 CASH pg 1' row 17: description block, Restricted?, Type?, Full
    // Asset Amount, Ward's %, Ward's Asset Amount, Restricted Asset Amount),
    // which is why these indices moved -- the authority changed, not the
    // implementation's convenience.
    const b1Table = model.sections.find(section => section.id === 'b1').blocks[0];
    expect(b1Table.headers).toEqual(['Institution Name', 'Address', 'Restricted?', 'Account Type & Number', 'Full Asset Amount', "Ward's %", "Ward's Asset Amount", 'Restricted Asset Amount']);
    expect(b1Table.rows[0][2]).toBe('Yes');
    expect(b1Table.rows[0].at(-1)).toBe('$1,000.00');
    expect(b1Table.rows[1][2]).toBe('No');
    expect(b1Table.rows[1].at(-1)).toBe('—');
    // Two totals, in the last two columns: Ward's Asset Amount, then Restricted.
    expect(b1Table.totals.values.map(v => v.value)).toEqual(['$3,000.00', '$1,000.00']);
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
    expect(row('a1').slice(5)).toEqual(['No', 'Yes']); // 60E removed A-1's phantom column
    expect(row('b1')[2]).toBe('—'); // 60B: Restricted? is column 3 (form order)
    // 60K moved the answer columns ahead of the derived amount columns, so
    // both totals rows land in the table's last columns (form order).
    expect(row('b2')[5]).toBe('No');
    expect(row('b3').slice(4, 6)).toEqual(['Yes', 'No']);
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
    // And the summaries read the same figures. Milestone 64A-2, item 2.1:
    // Summary I now lists A-2 and B-4 individually (negative, as liabilities)
    // rather than a "Schedule A"/"Schedule B" debts column.
    expect(summaryI(model).rows[1]).toEqual(['A-2', 'Real Estate Liabilities', '-$500.00']);
    expect(summaryI(model).rows[6]).toEqual(['B-4', 'Liabilities / Secured and Unsecured Debt / Notes / Loans', '-$500.00']);
    // Milestone 64A-2, item 2.2: C-2 (Lawsuits Pending Against the Ward)
    // prints negative on Summary II, matching the form's own H9 = -'C-2'!H50.
    expect(summaryII(model).rows.map(r => r[2])).toEqual(['$500.00', '-$500.00', '$500.00', '$500.00', '$500.00']);
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

  test('Summary I nets are not clamped at zero: debts above assets print as a negative figure (60A)', () => {
    const model = buildVerifiedInventoryModel(base({
      scheduleA1: [{ propertyDescription: 'Home', fullAssetValue: '1000', wardPercent: '100' }],
      scheduleA2: [{ lenderName: 'Lender', fullDebtBalance: '5000', wardPercent: '100' }],
    }));
    // Milestone 64A-2, item 2.1: the net-of-liabilities line is now its own
    // row ("Real Estate Assets, Net of Liabilities"), not column 4 of a
    // "Schedule A" rollup row.
    expect(summaryI(model).rows[2]).toEqual(['', 'Real Estate Assets, Net of Liabilities', '-$4,000.00']);
    expect(summaryI(model).totals.value).toBe('-$4,000.00');
  });
});

// Milestones 60B-60E. Fields the UI captures -- several of them required by
// the form's own validation -- that never reached the PDF, one schedule at a
// time, with the court form's column labels (templates/guardian-template.js,
// read 2026-09-20) as the reference for what the filer should see.
describe('Milestones 60B-60E: every UI-captured schedule field reaches the PDF', () => {
  const base = (extra = {}) => ({
    wardName: 'Harold Thomas Bennett', caseNumber: '26-002487-GD', county: 'Pasco',
    scheduleA1: [], scheduleA2: [], scheduleB1: [], scheduleB2: [], scheduleB3: [], scheduleB4: [],
    scheduleC1: [], scheduleC2: [], scheduleC3: [], scheduleC4: [], scheduleC5: [],
    ...extra,
  });
  const table = (model, id) => model.sections.find(s => s.id === id).blocks[0];
  const headers = (model, id) => table(model, id).headers;
  const row = (model, id, i = 0) => table(model, id).rows[i];
  /** Every string anywhere in a row, including inside array and mixed cells. */
  const flat = (cells) => JSON.stringify(cells);

  test('60E: Schedule A-1 has no "Valuation Method" column -- that field belongs to B-2 only', () => {
    const model = buildVerifiedInventoryModel(base({
      scheduleA1: [{ propertyDescription: 'Home', fullAssetValue: '1000', wardPercent: '100' }],
    }));
    expect(headers(model, 'a1')).not.toContain('Valuation Method');
    expect(row(model, 'a1')).toHaveLength(headers(model, 'a1').length);
    expect(headers(model, 'a1')).toEqual(expect.arrayContaining(["Ward's %", "Ward's Value", 'Personal Residence?', 'Income Property?']));
  });

  test('60D: Schedule A-2 prints the real notes field, not the nonexistent relatedProperty', () => {
    const model = buildVerifiedInventoryModel(base({
      scheduleA2: [{ lenderName: 'MegaBank Mortgage', notes: 'For property at 123 Main St.', fullDebtBalance: '1000', wardPercent: '100' }],
    }));
    expect(headers(model, 'a2')).not.toContain('Related Property Description');
    const first = row(model, 'a2')[0];
    expect(first.main).toBe('MegaBank Mortgage');
    expect(first.sub).toEqual(expect.arrayContaining([expect.objectContaining({ text: 'For property at 123 Main St.', italic: true })]));
  });

  test('60C: Schedule A-2 prints Type and, as a sub-line under the lender, the account number', () => {
    const model = buildVerifiedInventoryModel(base({
      scheduleA2: [{ lenderName: 'MegaBank Mortgage', liabilityType: 'Note', accountNumber: '123456', fullDebtBalance: '1000', wardPercent: '100' }],
    }));
    expect(headers(model, 'a2')).toContain('Type');
    expect(row(model, 'a2')).toContain('Note');
    expect(flat(row(model, 'a2'))).toContain('123456');
  });

  test('60C: Schedule B-4 prints Type and the account number, and keeps its real Related Property column', () => {
    const model = buildVerifiedInventoryModel(base({
      scheduleB4: [{ lenderName: 'Cars R Us Lenders', liabilityType: 'Loan', accountNumber: '112358132134', relatedProperty: '1992 Toyota Corolla', lenderAddress: '10272 Ulmerton Road, Largo FL 33777', fullLiabilityBalance: '3000', wardPercent: '100' }],
    }));
    expect(headers(model, 'b4')).toContain('Type');
    expect(row(model, 'b4')).toContain('Loan');
    expect(flat(row(model, 'b4'))).toContain('112358132134');
    expect(flat(row(model, 'b4'))).toContain('1992 Toyota Corolla');
  });

  // Milestone 64A-1, item 3.2. Related Personal Property Asset (if secured)
  // is now optional (form B-4 C6/C7 lists unsecured debts too), so a row
  // with none must still print something in that column rather than a blank
  // cell that reads as a data-entry gap.
  test('64A-1: Schedule B-4 prints "Unsecured" in the Related Property column when the row has none', () => {
    const model = buildVerifiedInventoryModel(base({
      scheduleB4: [{ lenderName: 'Capital One', liabilityType: 'Credit Card', lenderAddress: '123 Main St, Largo FL 33770', fullLiabilityBalance: '1000', wardPercent: '100' }],
    }));
    expect(row(model, 'b4')).toContain('Unsecured');
  });

  // Milestone 64A-1, item 3.1. Action Date is now optional (form C-3 C8: "if
  // filed"), so an action the ward intends to bring but hasn't filed yet
  // must still print something in that column rather than a blank cell.
  test('64A-1: Schedule C-3 prints "Not yet filed" in the Action Date column when the row has none', () => {
    const model = buildVerifiedInventoryModel(base({
      scheduleC3: [{ defendantName: 'John Smith', actionDescription: 'Negligence', status: 'Pre-suit investigation', courtJurisdiction: 'Pinellas County Circuit Court', estimatedSettlement: '5000', wardPercent: '100' }],
    }));
    expect(row(model, 'c3')).toContain('Not yet filed');
  });

  test('60C: Schedule C-4 prints the trust type and the trustee account number -- the form has a column for each', () => {
    const model = buildVerifiedInventoryModel(base({
      scheduleC4: [{ trustName: 'Deependofthe Pooled Trust', trusteeName: 'Chas Addams, Trustee', trustType: 'Pooled', accountNumber: '34567890', trustAmount: '2000', wardPercent: '100' }],
    }));
    expect(headers(model, 'c4')).toEqual(expect.arrayContaining(['Type', 'Account Number']));
    expect(row(model, 'c4')).toContain('Pooled');
    expect(row(model, 'c4')).toContain('34567890');
  });

  test.each([
    ['a2', 'scheduleA2', { lenderName: 'L', fullDebtBalance: '1000', wardPercent: '50' }, "Ward's Debt Balance"],
    ['b1', 'scheduleB1', { institutionName: 'B', fullAssetAmount: '1000', wardPercent: '50', restricted: 'No' }, "Ward's Asset Amount"],
    ['b4', 'scheduleB4', { lenderName: 'L', fullLiabilityBalance: '1000', wardPercent: '50' }, "Ward's Liability Balance"],
    ['c1', 'scheduleC1', { payerName: 'P', annualIncomeAmount: '1000', wardPercent: '50' }, "Ward's Annual Income"],
    ['c2', 'scheduleC2', { claimantName: 'C', amountOfClaim: '1000', wardPercent: '50' }, "Ward's Share of Claim"],
    ['c3', 'scheduleC3', { defendantName: 'D', estimatedSettlement: '1000', wardPercent: '50' }, "Ward's Share"],
    ['c4', 'scheduleC4', { trustName: 'T', trustAmount: '1000', wardPercent: '50' }, "Ward's Share"],
  ])('60B: Schedule %s prints the ward\'s percentage and the ward\'s share on every row', (id, key, entry, shareHeader) => {
    const model = buildVerifiedInventoryModel(base({ [key]: [entry] }));
    expect(headers(model, id)).toContain("Ward's %");
    expect(headers(model, id)).toContain(shareHeader);
    expect(row(model, id)).toContain('50%');
    expect(row(model, id)).toContain('$500.00');
    expect(row(model, id)).toHaveLength(headers(model, id).length);
  });

  test('60B: Schedule C-5 prints the Joint Owner\'s % and the joint owner\'s value, in the form\'s own words', () => {
    const model = buildVerifiedInventoryModel(base({
      scheduleC5: [{ assetDescription: 'Residence', ownerName: 'Jane E. Miller', totalAssetValue: '1000', jointOwnerPercent: '50' }],
    }));
    expect(headers(model, 'c5')).toEqual(expect.arrayContaining(["Joint Owner's %", "Joint Owner's Value"]));
    expect(row(model, 'c5')).toContain('50%');
    expect(row(model, 'c5')).toContain('$500.00');
  });

  test('60B: Schedule C-1 prints the payer\'s street address and city/state/ZIP under the payer name', () => {
    const model = buildVerifiedInventoryModel(base({
      scheduleC1: [{ payerName: 'Social Security Administration', payerAddress: '6401 Security Boulevard', payerCityStateZip: 'Baltimore, MD 21235', annualIncomeAmount: '7200', wardPercent: '100' }],
    }));
    const cells = flat(row(model, 'c1'));
    expect(cells).toContain('6401 Security Boulevard');
    expect(cells).toContain('Baltimore, MD 21235');
  });

  test('60B: Schedule C-3 prints the required Action Date', () => {
    const model = buildVerifiedInventoryModel(base({
      scheduleC3: [{ defendantName: 'Big Chain Store', actionDate: '2026-03-04', estimatedSettlement: '30000', wardPercent: '100' }],
    }));
    expect(headers(model, 'c3')).toContain('Action Date');
    expect(row(model, 'c3')).toContain('03/04/2026');
  });

  test('60B: Schedule C-4 prints the trustee\'s city/state/ZIP, not just name and street', () => {
    const model = buildVerifiedInventoryModel(base({
      scheduleC4: [{ trustName: 'T', trusteeName: 'Chas Addams, Trustee', trusteeAddress: '5000 Dale Mayberry Avenue', trusteeCityStateZip: 'Tampa FL 32012', trustAmount: '2000', wardPercent: '100' }],
    }));
    expect(flat(row(model, 'c4'))).toContain('Tampa FL 32012');
  });

  test('60B: Schedule C-5 prints the joint owner\'s city/state/ZIP, not just name and street', () => {
    const model = buildVerifiedInventoryModel(base({
      scheduleC5: [{ assetDescription: 'Residence', ownerName: 'Jane E. Miller', ownerAddress: '123 Main St.', ownerCityStateZip: 'Clearwater, FL 33762', totalAssetValue: '1000', jointOwnerPercent: '50' }],
    }));
    expect(flat(row(model, 'c5'))).toContain('Clearwater, FL 33762');
  });

  test('60K: Schedule C-2 prints the claimant\'s city/state/ZIP under the street, and an old save with only the street prints as before', () => {
    const withCity = buildVerifiedInventoryModel(base({
      scheduleC2: [{ claimantName: 'Bob Jones', claimantAddress: '1000 Bayshore Dr NE', claimantCityStateZip: 'St Petersburg, FL 33710', amountOfClaim: '1000', wardPercent: '100' }],
    }));
    expect(row(withCity, 'c2')[0].sub.map(s => s.text)).toEqual(['1000 Bayshore Dr NE', 'St Petersburg, FL 33710']);
    const legacy = buildVerifiedInventoryModel(base({
      scheduleC2: [{ claimantName: 'Bob Jones', claimantAddress: '1000 Bayshore Dr NE, St Petersburg, FL 33710', amountOfClaim: '1000', wardPercent: '100' }],
    }));
    expect(row(legacy, 'c2')[0].sub.map(s => s.text)).toEqual(['1000 Bayshore Dr NE, St Petersburg, FL 33710']);
  });
});

// Milestone 60H. Two things Part V captured or computed and never printed:
// the bond-waiver answer/date (index.js requires bondWaived and, when Yes,
// bondWaivedDate; the workbook records the date at PART V!G15) and the
// bond-requirement breakdown the workbook itemizes at PART V rows 18-23 and
// the live UI already shows on its Part V page.
describe('Milestone 60H: Part V prints the bond-waiver answer and the bond-requirement breakdown', () => {
  const base = (extra = {}) => ({
    wardName: 'Harold Thomas Bennett', caseNumber: '26-002487-GD', county: 'Pasco',
    scheduleA1: [], scheduleA2: [], scheduleB1: [], scheduleB2: [], scheduleB3: [], scheduleB4: [],
    scheduleC1: [], scheduleC2: [], scheduleC3: [], scheduleC4: [], scheduleC5: [],
    ...extra,
  });
  const partV = (model) => model.sections.find(s => s.id === 'd3_d4');
  const bondGrid = (model) => partV(model).blocks.find(b => b.title === 'Schedule D-4: Guardian Bond');
  const item = (grid, label) => grid.items.find(i => i.label === label);
  const WAIVED = 'Surety bond waived by court order?';
  const WAIVED_DATE = 'Date of the order waiving the bond';

  test('a waived bond prints Yes and the order date', () => {
    const grid = bondGrid(buildVerifiedInventoryModel(base({ bondWaived: 'Yes', bondWaivedDate: '2026-03-04' })));
    expect(item(grid, WAIVED).value).toBe('Yes');
    expect(item(grid, WAIVED_DATE).value).toBe('03/04/2026');
  });

  test('a bond not waived prints No and no date line', () => {
    const grid = bondGrid(buildVerifiedInventoryModel(base({ bondWaived: 'No', bondWaivedDate: '' })));
    expect(item(grid, WAIVED).value).toBe('No');
    expect(item(grid, WAIVED_DATE)).toBeUndefined();
  });

  // AGENTS.md section 4: unanswered is never coerced to No. And Milestone 57A's
  // legacy rule: a filing saved before the question existed has the date and
  // no answer, and a date can only have been entered because the bond WAS
  // waived -- so it reads Yes; an absent date stays unanswered.
  test('unanswered stays unanswered ("—"), and a legacy save with only the date reads as Yes', () => {
    const blank = bondGrid(buildVerifiedInventoryModel(base({ bondWaived: '', bondWaivedDate: '' })));
    expect(item(blank, WAIVED).value).toBe('—');
    expect(item(blank, WAIVED_DATE)).toBeUndefined();
    const legacy = bondGrid(buildVerifiedInventoryModel(base({ bondWaivedDate: '2026-03-04' })));
    expect(item(legacy, WAIVED).value).toBe('Yes');
    expect(item(legacy, WAIVED_DATE).value).toBe('03/04/2026');
  });

  // Hand-computed against PART V rows 18-23 (the same fixture as
  // guardian-inventory-totals.spec.js, so the two proofs share their numbers):
  //   row 18  B-1 restricted            = 5000 + 2000        = 7,000
  //   row 19  B-3 restricted            = 10000              = 10,000
  //   row 20  B-1 not restricted        = 10000 - 7000       = 3,000
  //   row 21  B-2 personal property     = 4000               = 4,000
  //   row 22  B-3 not restricted        = 11000 - 10000      = 1,000
  //   row 23  Total for BOND REQUIREMENT = row 20 + 21 + 22  = 8,000
  test('the bond-requirement table itemizes PART V rows 18-23 in order and totals only the liquid lines', () => {
    const model = buildVerifiedInventoryModel(base({
      scheduleB1: [
        { institutionName: 'A', fullAssetAmount: '10000', wardPercent: '50', restricted: 'Yes' },
        { institutionName: 'B', fullAssetAmount: '6000', wardPercent: '50', restricted: 'No' },
        { institutionName: 'C', fullAssetAmount: '4000', wardPercent: '50', isRestricted: true },
      ],
      scheduleB2: [{ description: 'D', fullAssetValue: '8000', wardPercent: '50' }],
      scheduleB3: [
        { description: 'E', fullAssetValue: '20000', wardPercent: '50', restricted: 'Yes' },
        { description: 'F', fullAssetValue: '2000', wardPercent: '50', restricted: '' },
      ],
    }));
    const table = partV(model).blocks.find(b => b.type === 'table' && /Bond/i.test(b.title));
    expect(table, 'no bond-requirement table in Part V').toBeTruthy();
    expect(table.headers).toEqual(['Schedule', 'Bond Calculation', 'Restricted (not bonded)', 'Liquid (bonded)']);
    expect(table.rows.map(r => [r[0], r[2], r[3]])).toEqual([
      ['Schedule B-1', '$7,000.00', '—'],
      ['Schedule B-3', '$10,000.00', '—'],
      ['Schedule B-1', '—', '$3,000.00'],
      ['Schedule B-2', '—', '$4,000.00'],
      ['Schedule B-3', '—', '$1,000.00'],
    ]);
    expect(table.rows.map(r => r[1])).toEqual([
      'Cash Assets in RESTRICTED Depository',
      'Other Liquid Assets - Intangible Assets RESTRICTED',
      'Cash Assets NOT in a Restricted Depository',
      'Other Liquid Assets - Personal Property Assets',
      'Other Liquid Assets - Intangible Assets NOT RESTRICTED',
    ]);
    expect(table.totals.values.map(v => v.value)).toEqual(['', '$8,000.00']);
    // The table sits where the form puts it: after the audit fee / safe deposit
    // box block and before the bond amount / period / company block.
    const blocks = partV(model).blocks;
    expect(blocks.indexOf(table)).toBeGreaterThan(blocks.findIndex(b => b.title === 'Schedule D-3: Safe Deposit Box & Audit Fee'));
    expect(blocks.indexOf(table)).toBeLessThan(blocks.indexOf(bondGrid(model)));
  });
});

// Milestone 60K: the workbook derives two figures the PDF never printed --
// B-2's "Amount In Safe Deposit Box" ('B-2 PER PROP pg 1'!I18
// =IF(H18="Yes",G18,0), totalled at I63/I64) and B-3's "Restricted" (I) and
// safe-deposit (K) amounts, likewise totalled. They come from the answers and
// the ward share, never from a stored field: the persisted `amountInSDB` the
// importer used to hardcode to 0 is gone.
describe('Milestone 60K: derived safe-deposit and restricted amounts on B-2 and B-3', () => {
  const base = (extra = {}) => ({
    wardName: 'Harold Thomas Bennett', caseNumber: '26-002487-GD', county: 'Pasco',
    scheduleA1: [], scheduleA2: [], scheduleB1: [], scheduleB2: [], scheduleB3: [], scheduleB4: [],
    scheduleC1: [], scheduleC2: [], scheduleC3: [], scheduleC4: [], scheduleC5: [],
    ...extra,
  });
  const table = (model, id) => model.sections.find(s => s.id === id).blocks[0];

  test('B-2 prints the amount in the safe deposit box per row (the ward share when Yes) and totals it beside the schedule total', () => {
    const model = buildVerifiedInventoryModel(base({
      scheduleB2: [
        { description: 'Ring', fullAssetValue: '1000', wardPercent: '50', inSafeDepositBox: 'Yes' },
        { description: 'Car', fullAssetValue: '2000', wardPercent: '100', inSafeDepositBox: 'No' },
        { description: 'Unanswered', fullAssetValue: '400', wardPercent: '100', inSafeDepositBox: '' },
      ],
    }));
    const b2 = table(model, 'b2');
    expect(b2.headers.slice(-2)).toEqual(["Ward's Value", 'Amount in Safe Deposit Box']);
    expect(b2.rows.map(r => r.at(-1))).toEqual(['$500.00', '—', '—']);
    expect(b2.totals.values.map(v => v.value)).toEqual(['$2,900.00', '$500.00']);
    b2.rows.forEach((r) => expect(r).toHaveLength(b2.headers.length));
  });

  test('B-3 prints the restricted amount and the amount in the safe deposit box per row and totals all three figures', () => {
    const model = buildVerifiedInventoryModel(base({
      scheduleB3: [
        { description: 'Brokerage', fullAssetValue: '1000', wardPercent: '50', restricted: 'Yes', inSafeDepositBox: 'Yes' },
        { description: 'Bonds', fullAssetValue: '2000', wardPercent: '100', restricted: 'No', inSafeDepositBox: 'No' },
      ],
    }));
    const b3 = table(model, 'b3');
    expect(b3.headers.slice(-3)).toEqual(["Ward's Value", 'Restricted Amount', 'Amount in Safe Deposit Box']);
    expect(b3.rows[0].slice(-3)).toEqual(['$500.00', '$500.00', '$500.00']);
    expect(b3.rows[1].slice(-3)).toEqual(['$2,000.00', '—', '—']);
    expect(b3.totals.values.map(v => v.value)).toEqual(['$2,500.00', '$500.00', '$500.00']);
  });

  test('a stale stored amountInSDB on an old save is ignored: the figure is derived from the answer', () => {
    const model = buildVerifiedInventoryModel(base({
      scheduleB2: [{ description: 'Ring', fullAssetValue: '1000', wardPercent: '100', inSafeDepositBox: 'No', amountInSDB: 999 }],
    }));
    const b2 = table(model, 'b2');
    expect(b2.rows[0].at(-1)).toBe('—');
    expect(b2.totals.values[1].value).toBe('$0.00');
  });
});
