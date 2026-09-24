// Structured intermediate representation for Verified Initial Inventory PDF generation.
// Single source of truth for section hierarchy, bookmark outlines, table structures,
// metadata, reading order, and electronic signature formatting.

import { yesNoText, triStateText } from '../../core/form/form-contract.js';
import { resolveActiveDocPeriod } from '../../core/pdf/supplemental-pdf.js';
import { resolveDescriptorForInventoryType } from '../../core/filing/filing-descriptor.js';
import { composePdfAddressLines } from '../../core/pdf/address-format.js';
import { maskSSN } from '../../core/pdf/ssn-format.js';
import { calcTotalsGuardian, makeGuardianCalc, isRestrictedAnswer, isInSafeDepositBox, AUDIT_FEE_THRESHOLD, AUDIT_FEE_OVER_THRESHOLD } from './totals.js';
import { effectiveAnswer } from '../../core/validation/dependent-question.js';
import { preparedByLine } from '../../core/form/preparer-flag.js';

export function buildVerifiedInventoryModel(D, options = {}) {
  const d = D || {};
  const wardName = (d.wardName || 'Ward').trim();
  const caseNumber = (d.caseNumber || '').trim();
  // Milestone 40C-A item 6: output must never invent a county. A blank one
  // yields no court caption at all (see core/pdf/circuit-lookup.js); export is
  // already blocked by this form's County validation.
  const county = d.county || '';
  const gid = d.gid || '';
  const printDate = options.printDate || new Date().toISOString().slice(0, 10);
  const signatureStyle = options.signatureStyle || d.signatureStyle || 'typed';
  const descriptor = resolveDescriptorForInventoryType('guardian');

  // Format currency. This is the ONE place a figure is rounded to cents
  // (totals.js's rounding contract: sums are unrounded until display). A
  // negative net -- debts above assets in Summary I, which the workbook prints
  // rather than clamping -- reads "-$4,000.00", sign first.
  const fmt = (v) => {
    const cents = Math.round((parseFloat(v) || 0) * 100) / 100;
    const body = Math.abs(cents).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return (cents < 0 ? '-$' : '$') + body;
  };
  // A blank Ward's % is 0% in the calculation (as in the workbook) and prints
  // as unanswered, never as "100%" -- the two must not disagree on the page.
  const fmtPct = (p) => {
    const num = parseFloat(p);
    return Number.isFinite(num) ? `${num}%` : '—';
  };
  const triText = (value, legacyValue) => triStateText(value) || triStateText(legacyValue) || '—';
  const triIsYes = (value, legacyValue) => triText(value, legacyValue) === 'Yes';

  const fmtDate = (iso) => {
    if (!iso) return '';
    const [y, m, day] = String(iso).split('-');
    if (!y || !m || !day) return iso;
    return `${m}/${day}/${y}`;
  };

  // Calculations -- Milestone 60A: all from the shared Guardian calculator,
  // the same implementation the live UI's sidebar and calculated fields use.
  // This model used to carry its own copy that ignored the Ward's % on eight
  // schedules, ran Annual's four-tier audit fee, and clamped nets at zero.
  const gc = makeGuardianCalc(d);
  const t = calcTotalsGuardian(d);
  const {
    totalA1, totalA2, netA, totalB1, totalB2, totalB3, totalB4, netB,
    totalC1, totalC2, totalC3, totalC4, totalC5, restrictedCash,
  } = t;
  const totalRealPersonal = t.total;

  const metadata = {
    title: `${wardName} - ${caseNumber} - Printed ${printDate}`,
    subject: 'Verified Initial Inventory',
    author: 'Guardian Forms',
    creator: 'Guardian Forms',
    formName: 'VERIFIED INITIAL INVENTORY',
    formSubtitle: 'Verified Initial Inventory',
    keywords: 'Florida, Probate, Guardianship, Verified Initial Inventory',
    lang: 'en-US',
    creationDate: printDate,
    wardName,
    caseNumber,
    ucn: (d.ucn || '').trim(),
    county,
    gid,
    signatureStyle,
  };
  const outputName = descriptor.outputName || descriptor.displayName;
  metadata.title = `${wardName} - ${caseNumber} - ${outputName} - Printed ${printDate}`;
  metadata.subject = outputName;
  metadata.formName = descriptor.documentTitle;
  metadata.formSubtitle = outputName;
  metadata.keywords = `Florida, Probate, Guardianship, ${outputName}`;
  metadata.filingId = descriptor.id;

  const isConfirmedEmpty = (key) => !!(d.scheduleNoItems && d.scheduleNoItems[key]);
  const activeDocPeriod = resolveActiveDocPeriod(d);
  const scheduleDocSlot = (key) => {
    const scheduleDocs = d.scheduleDocs && d.scheduleDocs[key];
    if (!scheduleDocs) return { comment: '', files: [] };
    if (Array.isArray(scheduleDocs.files) || scheduleDocs.comment) {
      return { comment: scheduleDocs.comment || '', files: scheduleDocs.files || [] };
    }
    const slot = scheduleDocs[activeDocPeriod] || scheduleDocs.initial || { comment: '', files: [] };
    return { comment: slot.comment || '', files: slot.files || [] };
  };
  const supportingDocumentBlocks = (key) => {
    const slot = scheduleDocSlot(key);
    const files = (slot.files || []).filter(file => file && file.dataUrl);
    const comment = String(slot.comment || '').trim();
    if (!files.length && !comment) return [];
    return [{
      type: 'supporting-documents',
      tag: 'Part',
      title: 'Supporting Documents',
      comment,
      files: files.map(file => ({
        name: file.name || 'Supporting document',
        type: file.type || '',
        size: file.size || 0,
        dataUrl: file.dataUrl,
        id: file.id || '',
        contentDigest: file.contentDigest || '',
        technicalStatus: file.technicalStatus || 'pending',
        technicalWarnings: file.technicalWarnings || [],
        pageCount: file.pageCount || 0,
        encrypted: !!file.encrypted,
        corrupt: !!file.corrupt,
        removed: !!file.removed,
        stale: !!file.stale,
      })),
    }];
  };

  const sections = [];

  // 1. Cover / Case Information
  sections.push({
    id: 'cover',
    title: 'Part I — REQUIRED INFORMATION',
    bookmarkTitle: 'Part I - Required Information (Cover)',
    parentBookmark: null,
    level: 1,
    pageBreakBefore: false,
    blocks: [
      {
        type: 'key-value-grid',
        tag: 'Table',
        items: [
          { label: 'Name of Ward', value: wardName },
          { label: 'Case Number', value: caseNumber },
          { label: 'Guardianship Inception Date (GID)', value: fmtDate(gid) },
          { label: 'County', value: county },
          { label: 'Guardian Name(s)', value: d.guardianName || '' },
          { label: 'Attorney for Guardian', value: d.attorneyForGuardian || '' },
          { label: 'Type of Guardianship', value: d.typeOfGuardianship || 'Plenary' },
          { label: 'Amended Form?', value: triText(d.amendedForm, d.isAmended) },
          // Milestone 64A-2, item 2.3. Form SUMMARY I B26/E26 -- these never
          // printed on Part I before, only on Part V (Schedule D-3), and only
          // the second one when Yes. Part V's own behavior (below) is
          // untouched; Part I always asks both, printing "N/A" for the
          // second whenever the first isn't Yes.
          { label: 'Does Ward have a Safe Deposit Box?', value: triText(d.hasSafeDepositBox) },
          { label: 'If yes, has the Safe Deposit Box Inventory been filed?', value: triIsYes(d.hasSafeDepositBox) ? triText(d.safeDepositBoxFiled) : 'N/A' },
        ],
      },
      ...(d.witnesses && d.witnesses.length ? [{
        type: 'table',
        tag: 'Table',
        title: 'Inventory Witnesses',
        headers: ['Witness Name', 'Address', 'Occupation'],
        rows: d.witnesses.map(w => [w.name || '', w.address || '', w.occupation || '']),
        colWidths: [35, 40, 25],
      }] : []),
    ],
  });

  // 2. Summary of Assets (Part I & II)
  sections.push({
    id: 'summary',
    title: 'Part II — SUMMARY OF ASSETS',
    bookmarkTitle: 'Part II - Summary of Assets',
    parentBookmark: null,
    level: 1,
    pageBreakBefore: false,
    blocks: [
      {
        // Milestone 64A-2, item 2.1 / D1 (decided 2026-09-21). The form's
        // SUMMARY I (rows 30-39) lists each schedule individually, not a
        // Gross/Debts/Net rollup of "Schedule A" and "Schedule B" -- this
        // prints the form's own rows, labels and order, reusing the same
        // schedule totals the on-screen Summary and the individual schedule
        // tables already use. A-2 and B-4 print negative (liabilities), and
        // the two net-of-liabilities lines are ordinary rows: the PDF engine
        // supports one bold `totals` row per table, already spent on the
        // grand total below, so the two net lines print at the same weight
        // as the schedule rows above them, distinguished by their own label
        // rather than by boldness.
        type: 'table',
        tag: 'Table',
        title: 'Summary I — Real & Personal Property',
        headers: ['Schedule', 'Title', 'Amount'],
        rows: [
          ['A-1', 'Real Estate / Real Property', fmt(totalA1)],
          ['A-2', 'Real Estate Liabilities', fmt(-totalA2)],
          ['', 'Real Estate Assets, Net of Liabilities', fmt(netA)],
          ['B-1', 'Cash Assets / Cash Equivalent Assets', fmt(totalB1)],
          ['B-2', 'Personal Property Assets', fmt(totalB2)],
          ['B-3', 'Intangible Assets', fmt(totalB3)],
          ['B-4', 'Liabilities / Secured and Unsecured Debt / Notes / Loans', fmt(-totalB4)],
          ['', 'Cash / Personal Property / Intangible Assets, Net of Liabilities', fmt(netB)],
        ],
        totals: { label: 'VERIFIED INITIAL INVENTORY OF GUARDIAN', value: fmt(totalRealPersonal) },
        colWidths: [12, 58, 30],
        colAlign: ['left', 'left', 'right'],
      },
      {
        // Milestone 64A-2, item 2.2 (with 2.6's Summary II title/row labels
        // folded in, since both name the same text). Form: SUMMARY II H9 =
        // -'C-2'!H50 -- Lawsuits Pending Against the Ward is a liability
        // against the ward and prints negative, matching A-2/B-4 on Summary I.
        type: 'table',
        tag: 'Table',
        title: 'Summary II — Other Financial Information',
        headers: ['Schedule', 'Schedule Title', 'Reported Amount / Value'],
        rows: [
          ['Schedule C-1', 'Income (Annualized)', fmt(totalC1)],
          ['Schedule C-2', 'Lawsuits Pending Against the Ward', fmt(-totalC2)],
          ['Schedule C-3', 'Lawsuits Pending by the Ward', fmt(totalC3)],
          ['Schedule C-4', 'Value of Trusts for the Ward', fmt(totalC4)],
          ['Schedule C-5', "Joint Owners of Ward's Assets", fmt(totalC5)],
        ],
        colWidths: [20, 55, 25],
        colAlign: ['left', 'left', 'right'],
      },
    ],
  });

  // Helper for schedule table sections. extraTotalValues (optional array
  // of raw numbers) adds further numeric total columns beyond totalVal --
  // e.g. Schedule B-1's "Restricted Amt" total alongside its main total,
  // which the single-{label,value} totals shape had no way to express.
  const addScheduleSection = (id, title, bookmarkTitle, headers, rows, totalLabel, totalVal, emptyNoun, colWidths, colAlign, extraTotalValues, pageBreak = false) => {
    const empty = rows.length === 0;
    const contentBlocks = empty ? [
      {
        type: 'notice',
        tag: 'P',
        text: isConfirmedEmpty(id)
          ? `The filer verifies there are no ${emptyNoun} to report for this schedule.`
          : 'No entries to report.',
      }
    ] : [
      {
        type: 'table',
        tag: 'Table',
        title,
        headers,
        rows,
        totals: totalLabel
          ? (extraTotalValues && extraTotalValues.length
            ? { label: totalLabel, values: [{ value: fmt(totalVal) }, ...extraTotalValues.map(v => ({ value: fmt(v) }))] }
            : { label: totalLabel, value: fmt(totalVal) })
          : null,
        colWidths,
        colAlign,
      }
    ];

    sections.push({
      id,
      title,
      bookmarkTitle,
      parentBookmark: 'Part III - Assets of the Ward',
      level: 2,
      pageBreakBefore: pageBreak,
      blocks: [...contentBlocks, ...supportingDocumentBlocks(id)],
    });
  };

  sections.push({
    id: 'assets',
    title: 'Part III — ASSETS OF THE WARD',
    bookmarkTitle: 'Part III - Assets of the Ward',
    parentBookmark: null,
    level: 1,
    // No forced break. This heading-only Part divider used to strand alone at
    // the foot of page 1 (D14 baseline). Milestone 64A-3 forced a page break
    // here as a stopgap; Milestone 64 D4 then taught the shared PDF engine to
    // keep a section heading with its first unit -- and for a heading-only
    // section, with the NEXT section's heading and first unit -- so the engine
    // now does this by rule and the special case is retired. Measured
    // identical: the divider heads page 2 above Schedule A-1 either way.
    pageBreakBefore: false,
    blocks: [],
  });

  // Milestones 60B-60E (2026-09-20): every schedule table below carries every
  // field the UI captures for it, with the court form's own column labels
  // (templates/guardian-template.js) where the form has a column. The form
  // stacks a liability's account number on a detail line under the lender
  // rather than giving it a column, so A-2/B-4 print it as a sub-line; C-4's
  // form has a literal "Account Number" column, so C-4 gets one.
  const acctLine = (r) => (r.accountNumber ? { text: `Acct # ${r.accountNumber}` } : null);
  const nameWithSubLines = (name, ...subs) => {
    const sub = subs.filter(Boolean);
    return sub.length ? { main: name || '', sub } : (name || '');
  };

  // Schedule A-1. 60E: no "Valuation Method" column -- scheduleA1 has no such
  // field (it is B-2's), so the column was blank on every filing.
  addScheduleSection(
    'a1',
    'Schedule A-1: Real Estate / Real Property',
    'Schedule A-1: Real Property',
    ['Property Description', 'Location Address', 'Full Value', "Ward's %", "Ward's Value", 'Personal Residence?', 'Income Property?'],
    (d.scheduleA1 || []).map(r => [nameWithSubLines(r.propertyDescription, r.notes ? { text: r.notes, italic: true } : null), composePdfAddressLines(r.streetAddress, r.cityStateZip), fmt(r.fullAssetValue), fmtPct(r.wardPercent), fmt(gc.wardVal(r)), triText(r.residence, r.isPersonalResidence), triText(r.income, r.isIncomeProperty)]),
    "Schedule A-1 Total (Ward's Value)",
    totalA1,
    'real estate / real property',
    [21, 22, 13, 9, 13, 11, 11],
    ['left', 'left', 'right', 'right', 'right', 'center', 'center'],
    null,
    false
  );

  // Schedule A-2. 60B: Ward's % / Ward's Debt Balance (the form's column);
  // 60C: Type, account number as a sub-line; 60D: the real `notes` field
  // replaces a `relatedProperty` column that read a field A-2 rows never had.
  addScheduleSection(
    'a2',
    'Schedule A-2: Real Estate Liabilities (Mortgages / Notes / Loans)',
    'Schedule A-2: Debts on Real Property',
    ['Lender / Liability Description', 'Lender Address', 'Type', 'Full Debt Balance', "Ward's %", "Ward's Debt Balance"],
    (d.scheduleA2 || []).map(r => [nameWithSubLines(r.lenderName, acctLine(r), r.notes ? { text: r.notes, italic: true } : null), composePdfAddressLines(r.lenderAddress, r.lenderCityStateZip), r.liabilityType || '', fmt(r.fullDebtBalance), fmtPct(r.wardPercent), fmt(gc.wardDebt(r))]),
    "Schedule A-2 Total (Ward's Debt Balance)",
    totalA2,
    'real estate liabilities',
    [25, 23, 9, 14, 9, 20],
    ['left', 'left', 'left', 'right', 'right', 'right']
  );

  // Schedule B-1. Restricted/restricted-amount were previously dropped
  // entirely (no column, no second total) -- the HTML preview shows a
  // per-row "Restricted Amt" column and a second numeric total alongside
  // "Schedule B-1 Total", which the vector PDF's totals shape had no way
  // to express before the engine's multi-value totals support.
  //
  // Read the canonical tri-state field written by the current radio control,
  // falling back to the legacy boolean only for direct callers that bypass
  // setD() normalization -- isRestrictedAnswer() is that rule, shared with
  // the calculator so the row, the subtotal and Part V's bond table agree.
  // The restricted amount is the WARD'S share (Milestone 60A); it used to be
  // the full account balance even when the subtotal beside it was adjusted.
  //
  // 60B: Ward's % and Ward's Asset Amount added. Column order is the court
  // form's ('B-1 CASH pg 1' row 17): the institution's stacked description
  // block (name / account number / street / city-state-ZIP), then Restricted?,
  // Type?, Full Asset Amount, Ward's %, Ward's Asset Amount, Restricted Asset
  // Amount. That order also puts the two totals in the last two columns, where
  // the engine places multi-value totals.
  addScheduleSection(
    'b1',
    'Schedule B-1: Cash Assets / Cash Equivalent Assets',
    'Schedule B-1: Cash & Financial Accounts',
    ['Institution Name', 'Address', 'Restricted?', 'Account Type & Number', 'Full Asset Amount', "Ward's %", "Ward's Asset Amount", 'Restricted Asset Amount'],
    (d.scheduleB1 || []).map(r => [r.institutionName || '', composePdfAddressLines(r.streetAddress, r.cityStateZip), triText(r.restricted, r.isRestricted), `${r.accountType || ''} ${r.accountNumber ? '— Acct ' + r.accountNumber : ''}`.trim(), fmt(r.fullAssetAmount), fmtPct(r.wardPercent), fmt(gc.wardAmt(r)), isRestrictedAnswer(r) ? fmt(gc.wardAmt(r)) : '—']),
    "Schedule B-1 Total (Ward's Asset Amount)",
    totalB1,
    'cash assets / cash equivalent assets',
    // Milestone 64A-3 (D14 baseline): 'Restricted?' is the workbook's own
    // header (B-1 sheet E17) and cannot be shortened, but at 8% of 468pt
    // (37.4pt) it broke mid-word as 'Restrict' / 'ed?'. Widened to 12%
    // (56.2pt), taken from Address, which wraps at word boundaries and is
    // meant to occupy several lines anyway.
    [14, 12, 12, 14, 13, 9, 13, 13],
    ['left', 'left', 'center', 'left', 'right', 'right', 'right', 'right'],
    [restrictedCash]
  );

  // Schedule B-2
  addScheduleSection(
    'b2',
    'Schedule B-2: Personal Property Assets',
    'Schedule B-2: Personal Property',
    // Milestone 60K: "Amount In Safe Deposit Box" is the form's own column
    // ('B-2 PER PROP pg 1'!I, =IF(H="Yes",G,0), totalled at I63/I64) -- derived
    // from the answer and the ward share by the calculator, never stored.
    ['Description', 'Location Address', 'Valuation Method', 'Full Value', "Ward's %", 'In Safe Deposit Box?', "Ward's Value", 'Amount in Safe Deposit Box'],
    (d.scheduleB2 || []).map(r => [r.description || '', composePdfAddressLines(r.streetAddress, r.cityStateZip), r.valuationMethod || '', fmt(r.fullAssetValue), fmtPct(r.wardPercent), triText(r.inSafeDepositBox), fmt(gc.wardB2(r)), isInSafeDepositBox(r) ? fmt(gc.sdbB2(r)) : '—']),
    "Schedule B-2 Total (Ward's Value)",
    totalB2,
    'personal property assets',
    [17, 16, 12, 12, 9, 8, 13, 13],
    ['left', 'left', 'left', 'right', 'right', 'center', 'right', 'right'],
    [t.totalSdbB2]
  );

  // Schedule B-3
  addScheduleSection(
    'b3',
    'Schedule B-3: Intangible Assets',
    'Schedule B-3: Intangible & Other Personal Property',
    // Milestone 60K: the form's "Restricted" (column I, =IF(E="Yes",H,0)) and
    // "Amount In Safe Deposit Box" (column K) figures, each totalled at rows
    // 67/68; both derived, as in the workbook. Three totals, last three columns.
    ['Description', 'Custodian / Address', 'Full Value', "Ward's %", 'Restricted?', 'In Safe Deposit Box?', "Ward's Value", 'Restricted Amount', 'Amount in Safe Deposit Box'],
    (d.scheduleB3 || []).map(r => [r.description || '', composePdfAddressLines(r.streetAddress, r.cityStateZip), fmt(r.fullAssetValue), fmtPct(r.wardPercent), triText(r.restricted, r.isRestricted), triText(r.inSafeDepositBox), fmt(gc.wardB3(r)), isRestrictedAnswer(r) ? fmt(gc.wardB3(r)) : '—', isInSafeDepositBox(r) ? fmt(gc.sdbB3(r)) : '—']),
    "Schedule B-3 Total (Ward's Value)",
    totalB3,
    'intangible assets',
    // Same fix as B-1: 'Restricted?' (workbook B-3 sheet E16) needs 12% to
    // stay one word; taken from Description, which wraps as prose.
    [11, 12, 12, 8, 12, 8, 12, 12, 13],
    ['left', 'left', 'right', 'right', 'center', 'center', 'right', 'right', 'right'],
    [t.restrictedIntang, t.totalSdbB3]
  );

  // Schedule B-4. 60B: Ward's % / Ward's Liability Balance; 60C: Type and
  // account number (sub-line). Unlike A-2, B-4's relatedProperty is a real,
  // required UI field, so its column stays.
  addScheduleSection(
    'b4',
    'Schedule B-4: Liabilities / Secured and Unsecured Debts / Notes / Loans',
    'Schedule B-4: Debts on Personal Property',
    ['Lender / Creditor', 'Lender Address', 'Related Personal Property', 'Type', 'Full Liability Balance', "Ward's %", "Ward's Liability Balance"],
    // Milestone 64A-1, item 3.2. relatedProperty is now optional (form B-4
    // C6/C7 lists unsecured debts too); "Unsecured" prints when blank rather
    // than an empty cell.
    (d.scheduleB4 || []).map(r => [nameWithSubLines(r.lenderName, acctLine(r)), r.lenderAddress || '', r.relatedProperty || 'Unsecured', r.liabilityType || '', fmt(r.fullLiabilityBalance), fmtPct(r.wardPercent), fmt(gc.wardB4(r))]),
    "Schedule B-4 Total (Ward's Liability Balance)",
    totalB4,
    'liabilities / secured and unsecured debts',
    [18, 18, 17, 8, 14, 9, 16],
    ['left', 'left', 'left', 'left', 'right', 'right', 'right']
  );

  // Schedule C-1. 60B: the payer's street address and city/state/ZIP (the
  // form's "Payer Information" block is name / street / city-state-ZIP on
  // three lines), Ward's % and Ward's Annual Income Amount.
  addScheduleSection(
    'c1',
    'Schedule C-1: Income (Annualized)',
    'Schedule C-1: Periodic Income',
    // r.frequencyOfPayment was previously silently dropped -- present in
    // the HTML preview's "Frequency" column but never read here.
    ['Payer Name & Address', 'Type of Income', 'Frequency', 'Basis for Payment', 'Annual Income Amount', "Ward's %", "Ward's Annual Income"],
    (d.scheduleC1 || []).map(r => [composePdfAddressLines(r.payerName, r.payerAddress, r.payerCityStateZip), r.typeOfIncome || '', r.frequencyOfPayment || '', r.paymentBasis || '', fmt(r.annualIncomeAmount), fmtPct(r.wardPercent), fmt(gc.wardC1(r))]),
    "Schedule C-1 Total (Ward's Annual Income)",
    totalC1,
    'income',
    [23, 12, 10, 15, 14, 9, 17],
    ['left', 'left', 'left', 'left', 'right', 'right', 'right']
  );

  // Milestone 64A-2, item 3.4. Form C-2 C7 asks for the "Name of
  // claimant/petitioner and their attorney" on one line, and the form's own
  // worked example writes it as prose: "Atty John Smith for Bob Jones,
  // plaintiff". Same shape here, and the claimant alone when no attorney is
  // recorded.
  const c2ClaimantLine = (r) => {
    const claimant = (r.claimantName || '').trim();
    const atty = (r.claimantAttorney || '').trim();
    if (!atty) return claimant;
    return claimant ? `Atty ${atty} for ${claimant}` : `Atty ${atty}`;
  };

  // Schedule C-2: Claims and Lawsuits Against the Ward (Corrected Sequence).
  // 60B: Ward's % and Ward's Share of Claim (the form's column label).
  addScheduleSection(
    'c2',
    'Schedule C-2: Lawsuits Pending Against the Ward',
    'Schedule C-2: Lawsuits & Claims Against Ward',
    ['Claimant Name & Address', 'Lawsuit / Claim Description', 'Court / Case #', 'Date Filed', 'Amount of Claim', "Ward's %", "Ward's Share of Claim"],
    // r.claimantAddress was previously silently dropped -- present in the
    // HTML preview as a sub-line under the claimant name but never read
    // here; rendered as a mixed-style cell sub-line now.
    // 60K: the claimant's city/state/ZIP is its own stored line now (the form's
    // fifth C-2 line); a save made before 60K holds the whole address in
    // claimantAddress and prints exactly as it did.
    (d.scheduleC2 || []).map(r => [nameWithSubLines(c2ClaimantLine(r), r.claimantAddress ? { text: r.claimantAddress } : null, r.claimantCityStateZip ? { text: r.claimantCityStateZip } : null), r.lawsuitDescription || '', `${r.courtJurisdiction || ''} ${r.caseNumber || ''}`.trim(), fmtDate(r.dateFiled), fmt(r.amountOfClaim), fmtPct(r.wardPercent), fmt(gc.wardC2(r))]),
    "Schedule C-2 Total (Ward's Share of Claims)",
    totalC2,
    'lawsuits pending against the ward',
    [21, 18, 14, 11, 13, 9, 14],
    ['left', 'left', 'left', 'center', 'right', 'right', 'right']
  );

  // Schedule C-3: Claims and Lawsuits by the Ward (Corrected Sequence).
  // 60B: Action Date (required by this form's own validation, never printed),
  // Ward's % and Ward's Share.
  addScheduleSection(
    'c3',
    'Schedule C-3: Lawsuits Pending by the Ward',
    'Schedule C-3: Lawsuits & Claims by Ward',
    ['Defendant Name', 'Action Description', 'Court / Case #', 'Status', 'Action Date', 'Estimated Settlement', "Ward's %", "Ward's Share"],
    // Milestone 64A-1, item 3.1. actionDate is now optional (form C-3 C8: "if
    // filed"); "Not yet filed" prints when blank rather than an empty cell.
    (d.scheduleC3 || []).map(r => [r.defendantName || '', r.actionDescription || '', `${r.courtJurisdiction || ''} ${r.caseNumber || ''}`.trim(), r.status || '', fmtDate(r.actionDate) || 'Not yet filed', fmt(r.estimatedSettlement), fmtPct(r.wardPercent), fmt(gc.wardC3(r))]),
    "Schedule C-3 Total (Ward's Share of Estimated Settlements)",
    totalC3,
    'lawsuits pending by the ward',
    [14, 15, 12, 12, 11, 14, 9, 13],
    ['left', 'left', 'left', 'left', 'center', 'right', 'right', 'right']
  );

  // Schedule C-4. 60B: trustee city/state/ZIP as the address block's third
  // line (it was dropped by a two-argument call), Ward's % and Ward's Share;
  // 60C: Account Number and Type -- the form has a column for each.
  addScheduleSection(
    'c4',
    'Schedule C-4: Value of Trusts for the Ward',
    'Schedule C-4: Trusts',
    ['Trust Name', 'Trustee Name & Address', 'Date Created', 'Account Number', 'Type', 'Trust Amount', "Ward's %", "Ward's Share"],
    // The trustee's NAME is deliberately passed as the first line, not as part
    // of an address: this column is headed "Trustee Name & Address", so the
    // name belongs on its own line above the address block rather than run
    // into it with a comma. Confirmed by Alan, 2026-09-19. Same shape in C-5.
    (d.scheduleC4 || []).map(r => [r.trustName || '', composePdfAddressLines(r.trusteeName, r.trusteeAddress, r.trusteeCityStateZip), fmtDate(r.dateCreated), r.accountNumber || '', r.trustType || '', fmt(r.trustAmount), fmtPct(r.wardPercent), fmt(gc.wardC4(r))]),
    "Schedule C-4 Total (Ward's Share of Trusts)",
    totalC4,
    'trusts',
    [15, 20, 11, 11, 9, 13, 9, 12],
    ['left', 'left', 'center', 'left', 'left', 'right', 'right', 'right']
  );

  // Schedule C-5. 60B: owner city/state/ZIP as the third address line, and
  // the form's own "Joint Owner's %" / "Joint Owner's Value" columns.
  addScheduleSection(
    'c5',
    "Schedule C-5: Joint Owners of Ward's Assets",
    'Schedule C-5: Joint / Other Property',
    ['Asset Description', "Joint Owner's Name & Address", 'Relationship to Ward', 'Total Asset Value', "Joint Owner's %", "Joint Owner's Value"],
    // Owner's NAME on its own line above the address block -- see C-4 above;
    // this column is likewise headed "... Name & Address".
    (d.scheduleC5 || []).map(r => [r.assetDescription || '', composePdfAddressLines(r.ownerName, r.ownerAddress, r.ownerCityStateZip), r.relationshipToWard || '', fmt(r.totalAssetValue), fmtPct(r.jointOwnerPercent), fmt(gc.wardC5(r))]),
    "Schedule C-5 Total (Joint Owners' Value)",
    totalC5,
    'joint or other property assets',
    [22, 26, 13, 13, 9, 17],
    ['left', 'left', 'left', 'right', 'right', 'right']
  );

  // Helper for /s/ signature format
  const formatSignature = (name) => {
    const n = (name || '').trim();
    if (!n) return '';
    return n.startsWith('/s/') || n.startsWith('s/') || n.startsWith('/s') ? n : `/s/ ${n}`;
  };

  // 14. Part III & IV: Attestations & Oaths (Guardian & Preparer)
  const guardianBlocks = (d.guardians || []).filter(g => [
    g.name, g.signatureDate, g.ssnEin, g.phone, g.streetAddress, g.cityStateZip,
  ].some(value => String(value || '').trim())).map((g, i) => ({
    type: 'signature-block',
    tag: 'Part',
    role: `Guardian #${i + 1}`,
    signerName: g.name || '',
    signature: formatSignature(g.name),
    signatureStyle,
    signatureDate: fmtDate(g.signatureDate),
    signatureState: g.signatureState || '',
    signatureImage: g.signatureImage || '',
    fields: [
      [{ label: 'Phone', value: g.phone || '' }, { label: 'SSN/EIN', value: maskSSN(g.ssnEin || '') }],
      [{ label: 'Address', value: composePdfAddressLines(g.streetAddress, g.cityStateZip) }],
    ],
  }));

  const preparer = d.preparer || {};
  const preparerBlock = {
    type: 'signature-block',
    tag: 'Part',
    role: 'Preparer',
    signerName: preparer.name || '',
    signature: formatSignature(preparer.name),
    signatureStyle,
    signatureDate: fmtDate(preparer.signatureDate),
    signatureState: preparer.signatureState || '',
    signatureImage: preparer.signatureImage || '',
    fields: [
      [{ label: 'Phone', value: preparer.phone || '' }, { label: 'SSN/EIN', value: maskSSN(preparer.ssnEin || '') }],
      [{ label: 'Address', value: composePdfAddressLines(preparer.streetAddress, preparer.cityStateZip) }],
    ],
  };

  // Milestone 64A-2, item 2.5. Part III is the guardian's oath ALONE. The
  // preparer's block used to sit directly under this perjury oath with no
  // statement of its own, so a preparer -- whom the form explicitly tells not
  // to sign at all if they are the guardian, co-guardian or attorney --
  // appeared to be swearing the guardian's oath. It moves to Part IV below,
  // with the form's own compilation statement. Oath text is the form's own
  // (Part III B6); the form spells it "PENALITIES", corrected here.
  sections.push({
    id: 'd1_d2',
    title: 'Part III — GUARDIAN(S) ATTESTATION(S)',
    // Bookmark labels are the PDF outline's short navigation text, not the
    // printed heading (same split as item 2.6). Kept free of the heading's
    // "(s)" parentheses, which the PDF string encoder backslash-escapes.
    bookmarkTitle: 'Part III - Guardian Attestations (D-1)',
    parentBookmark: null,
    level: 1,
    pageBreakBefore: true,
    blocks: [
      {
        type: 'notice',
        tag: 'P',
        text: 'UNDER PENALTIES OF PERJURY, I declare that I have read the foregoing, and the facts alleged are true, to the best of my knowledge and belief.',
      },
      ...guardianBlocks,
    ],
  });

  // 15. Part III-B: Attorney Attestation
  const attorney = d.attorney || {};
  const attorneyDetails = {
    'Florida Bar #': attorney.barNumber || '',
    'Filing Date': fmtDate(attorney.filingDate),
    'Phone': attorney.phone || '',
    'Primary Email': attorney.email || '',
    ...(attorney.secondaryEmail ? { 'Secondary Email': attorney.secondaryEmail } : {}),
    'Address': composePdfAddressLines(attorney.streetAddress, attorney.cityStateZip),
  };

  // Milestone 64A-2, item 2.5. Part IV holds BOTH the preparer and the
  // guardian attorney, each under its own heading with the form's own
  // wording (Part IV B6-B11 and B18-B23). The preparer's "as of" date is
  // its own field where entered, falling back to the signature date.
  const preparerAsOf = fmtDate(preparer.asOfDate) || fmtDate(preparer.signatureDate);
  const preparedBy = preparedByLine(d);
  sections.push({
    id: 'd2_attorney',
    title: 'Part IV — PREPARER & GUARDIAN ATTORNEY ATTESTATIONS',
    bookmarkTitle: 'Part IV - Preparer & Attorney Attestations (D-2)',
    parentBookmark: null,
    level: 1,
    pageBreakBefore: false,
    blocks: [
      // Milestone 67A: with a guardian or the attorney identified as the
      // preparer, the outside accountant's compilation disclaimer, the form's
      // "DO NOT SIGN HERE" and the signature block are replaced by one line
      // naming the person -- the Clerk's condition for accepting a filing
      // with no outside preparer. The named guardian is never placed into
      // the compilation attestation or made to sign it.
      ...(preparedBy ? [{
        type: 'notice',
        tag: 'P',
        title: 'PREPARER SIGNATURE',
        text: preparedBy,
      }] : [
      {
        type: 'notice',
        tag: 'P',
        title: 'PREPARER SIGNATURE',
        text: `I have compiled the accompanying Verified Initial Inventory of assets and liabilities arising from cash transactions, current market valuation, and current estimated market valuation of the guardianship of ${wardName || '[Ward]'} as of ${preparerAsOf || '[date]'}.`,
      },
      {
        type: 'notice',
        tag: 'P',
        text: 'This compilation is limited to presenting information in the form of a Verified Initial Inventory information and is the representation of the Guardian. I have not audited or reviewed the accompanying Verified Initial Inventory and, accordingly, do not express an opinion or any other form of assurance on it.',
      },
      {
        type: 'notice',
        tag: 'P',
        text: 'If you are the Guardian, Co-Guardian, or Guardian Attorney - DO NOT SIGN HERE.',
      },
      preparerBlock,
      ]),
      {
        type: 'notice',
        tag: 'P',
        title: 'GUARDIAN ATTORNEY SIGNATURE',
        text: 'The attorney may use an electronic signature "/s/".',
      },
      {
        type: 'notice',
        tag: 'P',
        text: `The undersigned Attorney hereby notifies the Court of the filing of the Verified Initial Inventory as of ${fmtDate(attorney.filingDate) || '[date]'}.`,
      },
      {
        type: 'notice',
        tag: 'P',
        text: `This Verified Initial Inventory is the representation of the Guardian. I have not audited the accompanying Verified Initial Inventory. The undersigned Attorney represents that he/she has examined the contents of the Inventory and that it conforms to the requirements of the Florida Guardianship Law and the standards for inventories in ${county || '[County]'} County, Florida.`,
      },
      {
        type: 'signature-block',
        tag: 'Part',
        role: 'Attorney for Guardian',
        signerName: attorney.name || '',
        signature: formatSignature(attorney.name),
        signatureStyle,
        signatureDate: fmtDate(attorney.signatureDate),
        signatureState: attorney.signatureState || '',
        signatureImage: attorney.signatureImage || '',
        fields: [
          [{ label: 'Florida Bar #', value: attorneyDetails['Florida Bar #'] }, { label: 'Filing Date', value: attorneyDetails['Filing Date'] }, { label: 'Phone', value: attorneyDetails.Phone }],
          [{ label: 'Primary Email', value: attorneyDetails['Primary Email'] }, { label: 'Secondary Email', value: attorneyDetails['Secondary Email'] || '' }],
          [{ label: 'Address', value: attorneyDetails.Address }],
        ],
      },
    ],
  });

  // 16. Part V: Audit Fee, Bond & Safe Deposit (D-3 & D-4)
  sections.push({
    id: 'd3_d4',
    // Milestone 64A-2, item 2.5. The form's own Part V heading; "Schedule
    // D-3"/"D-4" are this app's nav labels, not form terms, so they leave
    // the printed page (the sub-heads below use the form's AUDIT FEE
    // SCHEDULE / SURETY BOND REQUIREMENT wording instead).
    title: 'Part V — OTHER INFORMATION',
    bookmarkTitle: 'Part V - Other Information',
    parentBookmark: null,
    level: 1,
    pageBreakBefore: false,
    blocks: [
      {
        type: 'key-value-grid',
        tag: 'Table',
        title: 'AUDIT FEE SCHEDULE',
        items: [
          { label: 'Does the ward have a safe deposit box?', value: triText(d.hasSafeDepositBox) },
          ...(triIsYes(d.hasSafeDepositBox) ? [
            { label: 'Initial inventory of safe deposit box filed?', value: triText(d.safeDepositBoxFiled) },
          ] : []),
          // PART V!G8/G9: $85 when the inventory value is in excess of
          // $25,000, else $0 -- no upper tiers (those were Annual's, printed
          // here by mistake until Milestone 60A). The base is shown too, as
          // the live UI does, so the reader can check the determination.
          // Milestone 64A-2, item 2.7. PART V B8/B9 states the fee schedule
          // itself before the determination -- only the base and the
          // determination printed before this, never the rule the
          // determination applies.
          { label: 'Property Value in Excess of $25,000', value: fmt(AUDIT_FEE_OVER_THRESHOLD) },
          { label: 'Property Value Below $25,000', value: fmt(0) },
          { label: 'Total Inventory Value (audit-fee base)', value: fmt(totalRealPersonal) },
          {
            label: 'Audit Fee Determination',
            value: t.auditFee > 0
              ? `${fmt(t.auditFee)} (inventory value in excess of ${fmt(AUDIT_FEE_THRESHOLD)})`
              : `${fmt(0)} (inventory value not in excess of ${fmt(AUDIT_FEE_THRESHOLD)})`,
          },
        ],
      },
      // Milestone 60H: the workbook's own bond calculation, PART V rows 16-23,
      // itemized as the form does -- the two RESTRICTED lines are shown for
      // context in their own column and are NOT summed; the bond requirement
      // (row 23, =G20+G21+G22) is the three liquid lines. Figures come from
      // the shared calculator, the same ones the live Part V page shows.
      {
        type: 'notice',
        tag: 'P',
        title: 'Bond Calculation',
        text: 'Bond Calculation consists of liquid assets: all cash, personal property or intangible assets. Only real property is not considered liquid. Guardianship bond amount should be the amount of all liquid assets less those in a restricted depository or frozen account.',
      },
      {
        type: 'table',
        tag: 'Table',
        title: 'Surety Bond Requirement (calculated)',
        headers: ['Schedule', 'Bond Calculation', 'Restricted (not bonded)', 'Liquid (bonded)'],
        rows: [
          ['Schedule B-1', 'Cash Assets in RESTRICTED Depository', fmt(t.restrictedCash), '—'],
          ['Schedule B-3', 'Other Liquid Assets - Intangible Assets RESTRICTED', fmt(t.restrictedIntang), '—'],
          ['Schedule B-1', 'Cash Assets NOT in a Restricted Depository', '—', fmt(t.unrestrictedCash)],
          ['Schedule B-2', 'Other Liquid Assets - Personal Property Assets', '—', fmt(totalB2)],
          ['Schedule B-3', 'Other Liquid Assets - Intangible Assets NOT RESTRICTED', '—', fmt(t.unrestrictedIntang)],
        ],
        totals: { label: 'Total for BOND REQUIREMENT (liquid assets)', values: [{ value: '' }, { value: fmt(t.bondRequired) }] },
        colWidths: [16, 46, 19, 19],
        colAlign: ['left', 'left', 'right', 'right'],
      },
      {
        type: 'key-value-grid',
        tag: 'Table',
        title: 'SURETY BOND REQUIREMENT',
        items: [
          { label: 'Bond Amount', value: fmt(d.bondAmount) },
          { label: 'Bond Period', value: `${fmtDate(d.bondPeriodFrom)} to ${fmtDate(d.bondPeriodTo)}` },
          { label: 'Bonding Company', value: d.bondingCompany || '' },
          // Milestone 60H: the bond-waiver answer (Milestone 57A's app-side
          // question; PART V row 15 records only the order date) and, when
          // waived, that date. effectiveAnswer() is the same predicate the UI
          // and validator use: an explicit answer wins, a legacy save with the
          // date and no answer reads Yes, and an absent date is UNANSWERED --
          // never coerced to No (AGENTS.md section 4).
          ...(() => {
            const waived = effectiveAnswer(d.bondWaived, d.bondWaivedDate);
            return [
              { label: 'Surety bond waived by court order?', value: waived || '—' },
              ...(waived === 'Yes' ? [{ label: 'Date of the order waiving the bond', value: fmtDate(d.bondWaivedDate) }] : []),
            ];
          })(),
        ],
      },
    ],
  });

  // 17. Part VI: Certificate of Service (D-5)
  const serviceAttorney = d.serviceAttorney || {};
  sections.push({
    id: 'd5',
    title: 'Part VI — CERTIFICATE OF SERVICE',
    bookmarkTitle: 'Part VI - Certificate of Service (D-5)',
    parentBookmark: null,
    level: 1,
    pageBreakBefore: false,
    blocks: [
      {
        // Milestone 64A-2, item 2.4. Form PART VI B8 + B24, combined into one
        // sentence (the form has them as separate cells; the app's prior
        // sentence already combined a certify-clause with a date the same
        // way, dropping the statutory cite entirely).
        type: 'notice',
        tag: 'P',
        text: `Pursuant to the Florida Statute 744.362(1), I hereby certify that a copy of this inventory has been furnished to the following persons on this date, ${fmtDate(d.serviceDate) || 'the date indicated below'}:`,
      },
      ...(d.serviceRecipients && d.serviceRecipients.length && d.serviceNoRecipients !== 'Yes' ? [
        {
          type: 'table',
          tag: 'Table',
          title: 'Service Recipients',
          headers: ['Recipient Name', 'Address', 'Date Served'],
          rows: d.serviceRecipients.map(r => [r.name || '', composePdfAddressLines(r.address, r.cityStateZip), fmtDate(r.dateServed || d.serviceDate)]),
          colWidths: [35, 45, 20],
        }
      ] : [
        {
          type: 'notice',
          tag: 'P',
          text: 'None listed.',
        }
      ]),
      {
        // Milestone 64A-2, item 2.4. Form PART VI J24/J25, never printed at
        // all before this.
        type: 'notice',
        tag: 'P',
        text: `Indicate if Ward is: ${d.serviceIndicateIf || '—'}`,
      },
      {
        type: 'signature-block',
        tag: 'Part',
        role: 'Attorney for Guardian (Service)',
        signerName: serviceAttorney.name || '',
        signature: formatSignature(serviceAttorney.name),
        signatureStyle,
        signatureDate: fmtDate(serviceAttorney.signatureDate),
        signatureState: serviceAttorney.signatureState || '',
        signatureImage: serviceAttorney.signatureImage || '',
        fields: [
          [{ label: 'Florida Bar #', value: serviceAttorney.barNumber || '' }, { label: 'Phone', value: serviceAttorney.phone || '' }],
          [{ label: 'Primary Email', value: serviceAttorney.email || attorney.email || '' }],
          [{ label: 'Address', value: composePdfAddressLines(serviceAttorney.streetAddress, serviceAttorney.cityStateZip) }],
        ],
      },
    ],
  });

  return {
    metadata,
    sections,
  };
}
