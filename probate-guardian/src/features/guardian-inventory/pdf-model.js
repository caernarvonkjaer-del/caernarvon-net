// Structured intermediate representation for Verified Initial Inventory PDF generation.
// Single source of truth for section hierarchy, bookmark outlines, table structures,
// metadata, reading order, and electronic signature formatting.

export function buildVerifiedInventoryModel(D, options = {}) {
  const d = D || {};
  const wardName = (d.wardName || 'Ward').trim();
  const caseNumber = (d.caseNumber || '').trim();
  const county = d.county || 'Pinellas';
  const gid = d.gid || '';
  const printDate = options.printDate || new Date().toISOString().slice(0, 10);
  const signatureStyle = options.signatureStyle || d.signatureStyle || 'typed';

  // Format currency
  const fmt = (v) => {
    const n = parseFloat(v) || 0;
    return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const fmtDate = (iso) => {
    if (!iso) return '';
    const [y, m, day] = String(iso).split('-');
    if (!y || !m || !day) return iso;
    return `${m}/${day}/${y}`;
  };

  // Calculations
  const sum = (arr, key) => (arr || []).reduce((s, x) => s + (parseFloat(x[key]) || 0), 0);
  const calcWard = (full, pct) => ((parseFloat(full) || 0) * (parseFloat(pct) || 0)) / 100;
  const sumWard = (arr, fullKey, pctKey) => (arr || []).reduce((s, x) => s + calcWard(x[fullKey], x[pctKey]), 0);

  const totalA1 = sumWard(d.scheduleA1, 'fullAssetValue', 'wardPercent');
  const totalA2 = sum(d.scheduleA2, 'fullDebtBalance');
  const netA = Math.max(0, totalA1 - totalA2);

  const totalB1 = sum(d.scheduleB1, 'fullAssetAmount');
  const totalB2 = sumWard(d.scheduleB2, 'fullAssetValue', 'wardPercent');
  const totalB3 = sumWard(d.scheduleB3, 'fullAssetValue', 'wardPercent');
  const totalB4 = sum(d.scheduleB4, 'fullLiabilityBalance');
  const netB = Math.max(0, totalB1 + totalB2 + totalB3 - totalB4);

  const totalRealPersonal = netA + netB;

  const totalC1 = sum(d.scheduleC1, 'annualIncomeAmount');
  const totalC2 = sum(d.scheduleC2, 'amountOfClaim');
  const totalC3 = sum(d.scheduleC3, 'estimatedSettlement');
  const totalC4 = sum(d.scheduleC4, 'trustAmount');
  const totalC5 = sum(d.scheduleC5, 'totalAssetValue');

  const metadata = {
    title: `${wardName} - ${caseNumber} - Printed ${printDate}`,
    subject: 'Verified Initial Inventory',
    author: 'Probate Guardian',
    creator: 'Probate Guardian',
    lang: 'en-US',
    creationDate: printDate,
    wardName,
    caseNumber,
    county,
    gid,
    signatureStyle,
  };

  const isConfirmedEmpty = (key) => !!(d.scheduleNoItems && d.scheduleNoItems[key]);

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
          { label: 'Amended Form?', value: d.isAmended ? 'Yes' : 'No' },
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
    pageBreakBefore: true,
    blocks: [
      {
        type: 'table',
        tag: 'Table',
        title: 'Summary I — Real & Personal Property',
        headers: ['Schedule', 'Schedule Title', 'Gross Value', 'Debts / Liabilities', 'Net Value'],
        rows: [
          ['Schedule A', 'Real Property Assets', fmt(totalA1), fmt(totalA2), fmt(netA)],
          ['Schedule B', 'Personal Property Assets', fmt(totalB1 + totalB2 + totalB3), fmt(totalB4), fmt(netB)],
        ],
        totals: { label: 'TOTAL REAL & PERSONAL PROPERTY (Net Value)', value: fmt(totalRealPersonal) },
        colWidths: [18, 34, 16, 16, 16],
        colAlign: ['left', 'left', 'right', 'right', 'right'],
      },
      {
        type: 'table',
        tag: 'Table',
        title: 'Summary II — Other Assets & Sources of Income',
        headers: ['Schedule', 'Schedule Title', 'Reported Amount / Value'],
        rows: [
          ['Schedule C-1', 'Periodic Income', fmt(totalC1)],
          ['Schedule C-2', 'Claims & Lawsuits Against the Ward', fmt(totalC2)],
          ['Schedule C-3', 'Claims & Lawsuits by the Ward', fmt(totalC3)],
          ['Schedule C-4', 'Trusts', fmt(totalC4)],
          ['Schedule C-5', 'Joint / Other Property', fmt(totalC5)],
        ],
        colWidths: [20, 55, 25],
        colAlign: ['left', 'left', 'right'],
      },
    ],
  });

  // Helper for schedule table sections
  const addScheduleSection = (id, title, bookmarkTitle, headers, rows, totalLabel, totalVal, emptyNoun, colWidths, colAlign) => {
    const empty = rows.length === 0;
    sections.push({
      id,
      title,
      bookmarkTitle,
      parentBookmark: 'Part III - Assets of the Ward',
      level: 2,
      pageBreakBefore: true,
      blocks: empty ? [
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
          totals: totalLabel ? { label: totalLabel, value: fmt(totalVal) } : null,
          colWidths,
          colAlign,
        }
      ],
    });
  };

  // Schedule A-1
  addScheduleSection(
    'a1',
    'Schedule A-1: Real Property Assets',
    'Schedule A-1: Real Property',
    ['Property Description', 'Location Address', 'Valuation Method', 'Full Value', "Ward's %", "Ward's Value"],
    (d.scheduleA1 || []).map(r => [r.propertyDescription || '', `${r.streetAddress || ''}, ${r.cityStateZip || ''}`.replace(/^, /, ''), r.valuationMethod || '', fmt(r.fullAssetValue), `${r.wardPercent || 100}%`, fmt(calcWard(r.fullAssetValue, r.wardPercent))]),
    "Schedule A-1 Total (Ward's Value)",
    totalA1,
    'real property assets',
    [25, 25, 20, 10, 10, 10],
    ['left', 'left', 'left', 'right', 'right', 'right']
  );

  // Schedule A-2
  addScheduleSection(
    'a2',
    'Schedule A-2: Debts on Real Property',
    'Schedule A-2: Debts on Real Property',
    ['Lender Name', 'Lender Address', 'Related Property Description', 'Full Debt Balance'],
    (d.scheduleA2 || []).map(r => [r.lenderName || '', `${r.lenderAddress || ''}, ${r.lenderCityStateZip || ''}`.replace(/^, /, ''), r.relatedProperty || '', fmt(r.fullDebtBalance)]),
    'Schedule A-2 Total (Full Debt Balance)',
    totalA2,
    'debts on real property',
    [25, 25, 30, 20],
    ['left', 'left', 'left', 'right']
  );

  // Schedule B-1
  addScheduleSection(
    'b1',
    'Schedule B-1: Cash & Financial Accounts',
    'Schedule B-1: Cash & Financial Accounts',
    ['Institution Name', 'Account Type & Number', 'Address', 'Full Asset Amount'],
    (d.scheduleB1 || []).map(r => [r.institutionName || '', `${r.accountType || ''} ${r.accountNumber ? '— Acct ' + r.accountNumber : ''}`, `${r.streetAddress || ''}, ${r.cityStateZip || ''}`.replace(/^, /, ''), fmt(r.fullAssetAmount)]),
    'Schedule B-1 Total',
    totalB1,
    'cash and financial accounts',
    [30, 25, 25, 20],
    ['left', 'left', 'left', 'right']
  );

  // Schedule B-2
  addScheduleSection(
    'b2',
    'Schedule B-2: Personal Property Assets',
    'Schedule B-2: Personal Property',
    ['Description', 'Location Address', 'Valuation Method', 'Full Value', "Ward's %", "Ward's Value"],
    (d.scheduleB2 || []).map(r => [r.description || '', `${r.streetAddress || ''}, ${r.cityStateZip || ''}`.replace(/^, /, ''), r.valuationMethod || '', fmt(r.fullAssetValue), `${r.wardPercent || 100}%`, fmt(calcWard(r.fullAssetValue, r.wardPercent))]),
    "Schedule B-2 Total (Ward's Value)",
    totalB2,
    'personal property assets',
    [25, 25, 20, 10, 10, 10],
    ['left', 'left', 'left', 'right', 'right', 'right']
  );

  // Schedule B-3
  addScheduleSection(
    'b3',
    'Schedule B-3: Intangible & Other Personal Property',
    'Schedule B-3: Intangible & Other Personal Property',
    ['Description', 'Custodian / Address', 'Full Value', "Ward's %", "Ward's Value"],
    (d.scheduleB3 || []).map(r => [r.description || '', `${r.streetAddress || ''}, ${r.cityStateZip || ''}`.replace(/^, /, ''), fmt(r.fullAssetValue), `${r.wardPercent || 100}%`, fmt(calcWard(r.fullAssetValue, r.wardPercent))]),
    "Schedule B-3 Total (Ward's Value)",
    totalB3,
    'intangible personal property assets',
    [35, 25, 13, 13, 14],
    ['left', 'left', 'right', 'right', 'right']
  );

  // Schedule B-4
  addScheduleSection(
    'b4',
    'Schedule B-4: Debts on Personal Property',
    'Schedule B-4: Debts on Personal Property',
    ['Lender Name', 'Lender Address', 'Related Property Description', 'Full Debt Balance'],
    (d.scheduleB4 || []).map(r => [r.lenderName || '', r.lenderAddress || '', r.relatedProperty || '', fmt(r.fullLiabilityBalance)]),
    'Schedule B-4 Total',
    totalB4,
    'debts on personal property',
    [25, 25, 30, 20],
    ['left', 'left', 'left', 'right']
  );

  // Schedule C-1
  addScheduleSection(
    'c1',
    'Schedule C-1: Periodic Income',
    'Schedule C-1: Periodic Income',
    ['Payer Name', 'Type of Income', 'Basis for Payment', 'Annual Income Amount'],
    (d.scheduleC1 || []).map(r => [r.payerName || '', r.typeOfIncome || '', r.paymentBasis || '', fmt(r.annualIncomeAmount)]),
    'Schedule C-1 Total (Annual Income)',
    totalC1,
    'periodic income sources',
    [30, 25, 25, 20],
    ['left', 'left', 'left', 'right']
  );

  // Schedule C-2: Claims and Lawsuits Against the Ward (Corrected Sequence)
  addScheduleSection(
    'c2',
    'Schedule C-2: Claims and Lawsuits Against the Ward',
    'Schedule C-2: Lawsuits & Claims Against Ward',
    ['Claimant Name', 'Lawsuit / Claim Description', 'Court / Case #', 'Date Filed', 'Amount of Claim'],
    (d.scheduleC2 || []).map(r => [r.claimantName || '', r.lawsuitDescription || '', `${r.courtJurisdiction || ''} ${r.caseNumber || ''}`.trim(), fmtDate(r.dateFiled), fmt(r.amountOfClaim)]),
    'Schedule C-2 Total',
    totalC2,
    'claims or lawsuits against the ward',
    [25, 30, 20, 10, 15],
    ['left', 'left', 'left', 'center', 'right']
  );

  // Schedule C-3: Claims and Lawsuits by the Ward (Corrected Sequence)
  addScheduleSection(
    'c3',
    'Schedule C-3: Claims and Lawsuits by the Ward',
    'Schedule C-3: Lawsuits & Claims by Ward',
    ['Defendant Name', 'Action Description', 'Court / Case #', 'Status', 'Estimated Settlement'],
    (d.scheduleC3 || []).map(r => [r.defendantName || '', r.actionDescription || '', `${r.courtJurisdiction || ''} ${r.caseNumber || ''}`.trim(), r.status || '', fmt(r.estimatedSettlement)]),
    'Schedule C-3 Total',
    totalC3,
    'claims or lawsuits by the ward',
    [25, 30, 20, 10, 15],
    ['left', 'left', 'left', 'left', 'right']
  );

  // Schedule C-4
  addScheduleSection(
    'c4',
    'Schedule C-4: Trusts',
    'Schedule C-4: Trusts',
    ['Trust Name', 'Trustee Name & Address', 'Date Created', 'Trust Amount / Value'],
    (d.scheduleC4 || []).map(r => [r.trustName || '', `${r.trusteeName || ''}, ${r.trusteeAddress || ''}`.replace(/^, /, ''), fmtDate(r.dateCreated), fmt(r.trustAmount)]),
    'Schedule C-4 Total',
    totalC4,
    'trusts',
    [30, 35, 15, 20],
    ['left', 'left', 'center', 'right']
  );

  // Schedule C-5
  addScheduleSection(
    'c5',
    'Schedule C-5: Joint / Other Property',
    'Schedule C-5: Joint / Other Property',
    ['Asset Description', 'Owner Name & Address', 'Relationship to Ward', 'Total Asset Value'],
    (d.scheduleC5 || []).map(r => [r.assetDescription || '', `${r.ownerName || ''}, ${r.ownerAddress || ''}`.replace(/^, /, ''), r.relationshipToWard || '', fmt(r.totalAssetValue)]),
    'Schedule C-5 Total',
    totalC5,
    'joint or other property assets',
    [30, 30, 20, 20],
    ['left', 'left', 'left', 'right']
  );

  // Helper for /s/ signature format
  const formatSignature = (name) => {
    const n = (name || '').trim();
    if (!n) return '';
    return n.startsWith('/s/') || n.startsWith('s/') || n.startsWith('/s') ? n : `/s/ ${n}`;
  };

  // 14. Part III & IV: Attestations & Oaths (Guardian & Preparer)
  const guardianBlocks = (d.guardians || []).map((g, i) => ({
    type: 'signature-block',
    tag: 'Figure',
    role: `Guardian #${i + 1}`,
    signerName: g.name || '',
    signature: formatSignature(g.name),
    signatureStyle,
    signatureDate: fmtDate(g.signatureDate),
    details: {
      'Phone': g.phone || '',
      'Address': `${g.streetAddress || ''}, ${g.cityStateZip || ''}`.replace(/^, /, ''),
      'SSN/EIN': g.ssnEin || '',
    },
  }));

  const preparer = d.preparer || {};
  const preparerBlock = {
    type: 'signature-block',
    tag: 'Figure',
    role: 'Preparer',
    signerName: preparer.name || '',
    signature: formatSignature(preparer.name),
    signatureStyle,
    signatureDate: fmtDate(preparer.signatureDate),
    details: {
      'Phone': preparer.phone || '',
      'Address': `${preparer.streetAddress || ''}, ${preparer.cityStateZip || ''}`.replace(/^, /, ''),
      'SSN/EIN': preparer.ssnEin || '',
    },
  };

  sections.push({
    id: 'd1_d2',
    title: 'Part III & IV — ATTESTATIONS & OATHS OF GUARDIAN & PREPARER',
    bookmarkTitle: 'Guardian & Preparer Attestation (D-1 & D-2)',
    parentBookmark: 'Part IV - Attestations & Oaths',
    level: 2,
    pageBreakBefore: true,
    blocks: [
      {
        type: 'notice',
        tag: 'P',
        text: 'Under penalties of perjury, I declare that I have read the foregoing Verified Initial Inventory and that the facts stated in it are true and complete to the best of my knowledge and belief.',
      },
      ...guardianBlocks,
      preparerBlock,
    ],
  });

  // 15. Part III-B: Attorney Attestation
  const attorney = d.attorney || {};
  sections.push({
    id: 'd2_attorney',
    title: 'Part III-B — ATTORNEY ATTESTATION',
    bookmarkTitle: 'Attorney Attestation (D-2)',
    parentBookmark: 'Part IV - Attestations & Oaths',
    level: 2,
    pageBreakBefore: true,
    blocks: [
      {
        type: 'notice',
        tag: 'P',
        text: 'The undersigned attorney certifies that this Verified Initial Inventory complies with the applicable Florida Statutes and Florida Probate Rules.',
      },
      {
        type: 'signature-block',
        tag: 'Figure',
        role: 'Attorney for Guardian',
        signerName: attorney.name || '',
        signature: formatSignature(attorney.name),
        signatureStyle,
        signatureDate: fmtDate(attorney.signatureDate),
        details: {
          'Florida Bar #': attorney.barNumber || '',
          'Filing Date': fmtDate(attorney.filingDate),
          'Phone': attorney.phone || '',
          'Address': `${attorney.streetAddress || ''}, ${attorney.cityStateZip || ''}`.replace(/^, /, ''),
        },
      },
    ],
  });

  // 16. Part V: Audit Fee, Bond & Safe Deposit (D-3 & D-4)
  sections.push({
    id: 'd3_d4',
    title: 'Part V — AUDIT FEE, BOND & SAFE DEPOSIT BOX',
    bookmarkTitle: 'Part V - Audit Fee, Bond & Safe Deposit (D-3 & D-4)',
    parentBookmark: null,
    level: 1,
    pageBreakBefore: true,
    blocks: [
      {
        type: 'key-value-grid',
        tag: 'Table',
        title: 'Schedule D-3: Safe Deposit Box & Audit Fee',
        items: [
          { label: 'Does the ward have a safe deposit box?', value: d.hasSafeDepositBox === true ? 'Yes' : d.hasSafeDepositBox === false ? 'No' : 'Unanswered' },
          ...(d.hasSafeDepositBox === true ? [
            { label: 'Initial inventory of safe deposit box filed?', value: d.safeDepositBoxFiled === true ? 'Yes' : d.safeDepositBoxFiled === false ? 'No' : 'Unanswered' },
          ] : []),
          { label: 'Audit Fee Determination', value: totalRealPersonal <= 25000 ? '$0.00 (Estate <= $25k)' : totalRealPersonal <= 100000 ? '$85.00 ($25k-$100k)' : totalRealPersonal <= 500000 ? '$170.00 ($100k-$500k)' : '$250.00 (> $500k)' },
        ],
      },
      {
        type: 'key-value-grid',
        tag: 'Table',
        title: 'Schedule D-4: Guardian Bond',
        items: [
          { label: 'Bond Amount', value: fmt(d.bondAmount) },
          { label: 'Bond Period', value: `${fmtDate(d.bondPeriodFrom)} to ${fmtDate(d.bondPeriodTo)}` },
          { label: 'Bonding Company', value: d.bondingCompany || '' },
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
    pageBreakBefore: true,
    blocks: [
      {
        type: 'notice',
        tag: 'P',
        text: `I certify that a copy of this Verified Initial Inventory was served on ${fmtDate(d.serviceDate) || 'the date indicated below'} to the following persons:`,
      },
      {
        type: 'table',
        tag: 'Table',
        title: 'Service Recipients',
        headers: ['Recipient Name', 'Address', 'Method of Service'],
        rows: (d.serviceRecipients || []).map(r => [r.name || '', `${r.address || ''}, ${r.cityStateZip || ''}`.replace(/^, /, ''), r.method || 'Electronic / Portal']),
        colWidths: [35, 45, 20],
      },
      {
        type: 'signature-block',
        tag: 'Figure',
        role: 'Attorney for Guardian (Service)',
        signerName: serviceAttorney.name || '',
        signature: formatSignature(serviceAttorney.name),
        signatureStyle,
        signatureDate: fmtDate(serviceAttorney.signatureDate),
        details: {
          'Florida Bar #': serviceAttorney.barNumber || '',
          'Phone': serviceAttorney.phone || '',
          'Address': `${serviceAttorney.streetAddress || ''}, ${serviceAttorney.cityStateZip || ''}`.replace(/^, /, ''),
        },
      },
    ],
  });

  return {
    metadata,
    sections,
  };
}
