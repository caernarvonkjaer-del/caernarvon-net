// Structured intermediate representation for Verified Initial Inventory PDF generation.
// Single source of truth for section hierarchy, bookmark outlines, table structures,
// metadata, reading order, and electronic signature formatting.

import { yesNoText } from '../../core/form/form-contract.js';
import { resolveActiveDocPeriod } from '../../core/pdf/supplemental-pdf.js';
import { resolveDescriptorForInventoryType } from '../../core/filing/filing-descriptor.js';
import { composePdfAddress } from '../../core/pdf/address-format.js';
import { maskSSN } from '../../core/pdf/ssn-format.js';

export function buildVerifiedInventoryModel(D, options = {}) {
  const d = D || {};
  const wardName = (d.wardName || 'Ward').trim();
  const caseNumber = (d.caseNumber || '').trim();
  const county = d.county || 'Pinellas';
  const gid = d.gid || '';
  const printDate = options.printDate || new Date().toISOString().slice(0, 10);
  const signatureStyle = options.signatureStyle || d.signatureStyle || 'typed';
  const descriptor = resolveDescriptorForInventoryType('guardian');

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
    formName: 'VERIFIED INITIAL INVENTORY',
    formSubtitle: 'Verified Initial Inventory',
    keywords: 'Florida, Probate, Guardianship, Verified Initial Inventory',
    lang: 'en-US',
    creationDate: printDate,
    wardName,
    caseNumber,
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
          { label: 'Amended Form?', value: yesNoText(d.isAmended) },
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
    pageBreakBefore: false,
    blocks: [],
  });

  // Schedule A-1
  addScheduleSection(
    'a1',
    'Schedule A-1: Real Property Assets',
    'Schedule A-1: Real Property',
    ['Property Description', 'Location Address', 'Valuation Method', 'Full Value', "Ward's %", "Ward's Value"],
    (d.scheduleA1 || []).map(r => [r.notes ? { main: r.propertyDescription || '', sub: [{ text: r.notes, italic: true }] } : (r.propertyDescription || ''), composePdfAddress(r.streetAddress, r.cityStateZip), r.valuationMethod || '', fmt(r.fullAssetValue), `${r.wardPercent || 100}%`, fmt(calcWard(r.fullAssetValue, r.wardPercent))]),
    "Schedule A-1 Total (Ward's Value)",
    totalA1,
    'real property assets',
    [22, 22, 16, 14, 12, 14],
    ['left', 'left', 'left', 'right', 'right', 'right'],
    null,
    false
  );

  // Schedule A-2
  addScheduleSection(
    'a2',
    'Schedule A-2: Debts on Real Property',
    'Schedule A-2: Debts on Real Property',
    ['Lender Name', 'Lender Address', 'Related Property Description', 'Full Debt Balance'],
    (d.scheduleA2 || []).map(r => [r.lenderName || '', composePdfAddress(r.lenderAddress, r.lenderCityStateZip), r.relatedProperty || '', fmt(r.fullDebtBalance)]),
    'Schedule A-2 Total (Full Debt Balance)',
    totalA2,
    'debts on real property',
    [22, 28, 33, 17],
    ['left', 'left', 'left', 'right']
  );

  // Schedule B-1. isRestricted/restricted-amount were previously dropped
  // entirely (no column, no second total) -- the HTML preview shows a
  // per-row "Restricted Amt" column and a second numeric total alongside
  // "Schedule B-1 Total", which the vector PDF's totals shape had no way
  // to express before the engine's multi-value totals support.
  const restrictedCash = (d.scheduleB1 || []).filter(r => r.isRestricted).reduce((s, r) => s + (parseFloat(r.fullAssetAmount) || 0), 0);
  addScheduleSection(
    'b1',
    'Schedule B-1: Cash & Financial Accounts',
    'Schedule B-1: Cash & Financial Accounts',
    ['Institution Name', 'Account Type & Number', 'Address', 'Full Asset Amount', 'Restricted?', 'Restricted Amt'],
    (d.scheduleB1 || []).map(r => [r.institutionName || '', `${r.accountType || ''} ${r.accountNumber ? '— Acct ' + r.accountNumber : ''}`, composePdfAddress(r.streetAddress, r.cityStateZip), fmt(r.fullAssetAmount), r.isRestricted ? 'Yes' : 'No', r.isRestricted ? fmt(r.fullAssetAmount) : '—']),
    'Schedule B-1 Total',
    totalB1,
    'cash and financial accounts',
    [18, 22, 24, 15, 9, 12],
    ['left', 'left', 'left', 'right', 'center', 'right'],
    [restrictedCash]
  );

  // Schedule B-2
  addScheduleSection(
    'b2',
    'Schedule B-2: Personal Property Assets',
    'Schedule B-2: Personal Property',
    ['Description', 'Location Address', 'Valuation Method', 'Full Value', "Ward's %", "Ward's Value"],
    (d.scheduleB2 || []).map(r => [r.description || '', composePdfAddress(r.streetAddress, r.cityStateZip), r.valuationMethod || '', fmt(r.fullAssetValue), `${r.wardPercent || 100}%`, fmt(calcWard(r.fullAssetValue, r.wardPercent))]),
    "Schedule B-2 Total (Ward's Value)",
    totalB2,
    'personal property assets',
    [24, 24, 16, 13, 9, 14],
    ['left', 'left', 'left', 'right', 'right', 'right']
  );

  // Schedule B-3
  addScheduleSection(
    'b3',
    'Schedule B-3: Intangible & Other Personal Property',
    'Schedule B-3: Intangible & Other Personal Property',
    ['Description', 'Custodian / Address', 'Full Value', "Ward's %", "Ward's Value"],
    (d.scheduleB3 || []).map(r => [r.description || '', composePdfAddress(r.streetAddress, r.cityStateZip), fmt(r.fullAssetValue), `${r.wardPercent || 100}%`, fmt(calcWard(r.fullAssetValue, r.wardPercent))]),
    "Schedule B-3 Total (Ward's Value)",
    totalB3,
    'intangible personal property assets',
    [33, 25, 16, 12, 14],
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
    [22, 28, 33, 17],
    ['left', 'left', 'left', 'right']
  );

  // Schedule C-1
  addScheduleSection(
    'c1',
    'Schedule C-1: Periodic Income',
    'Schedule C-1: Periodic Income',
    // r.frequencyOfPayment was previously silently dropped -- present in
    // the HTML preview's "Frequency" column but never read here.
    ['Payer Name', 'Type of Income', 'Frequency', 'Basis for Payment', 'Annual Income Amount'],
    (d.scheduleC1 || []).map(r => [r.payerName || '', r.typeOfIncome || '', r.frequencyOfPayment || '', r.paymentBasis || '', fmt(r.annualIncomeAmount)]),
    'Schedule C-1 Total (Annual Income)',
    totalC1,
    'periodic income sources',
    [22, 18, 16, 22, 22],
    ['left', 'left', 'left', 'left', 'right']
  );

  // Schedule C-2: Claims and Lawsuits Against the Ward (Corrected Sequence)
  addScheduleSection(
    'c2',
    'Schedule C-2: Claims and Lawsuits Against the Ward',
    'Schedule C-2: Lawsuits & Claims Against Ward',
    ['Claimant Name', 'Lawsuit / Claim Description', 'Court / Case #', 'Date Filed', 'Amount of Claim'],
    // r.claimantAddress was previously silently dropped -- present in the
    // HTML preview as a sub-line under the claimant name but never read
    // here; rendered as a mixed-style cell sub-line now.
    (d.scheduleC2 || []).map(r => [r.claimantAddress ? { main: r.claimantName || '', sub: [{ text: r.claimantAddress }] } : (r.claimantName || ''), r.lawsuitDescription || '', `${r.courtJurisdiction || ''} ${r.caseNumber || ''}`.trim(), fmtDate(r.dateFiled), fmt(r.amountOfClaim)]),
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
    (d.scheduleC4 || []).map(r => [r.trustName || '', composePdfAddress(r.trusteeName, r.trusteeAddress), fmtDate(r.dateCreated), fmt(r.trustAmount)]),
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
    (d.scheduleC5 || []).map(r => [r.assetDescription || '', composePdfAddress(r.ownerName, r.ownerAddress), r.relationshipToWard || '', fmt(r.totalAssetValue)]),
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
    fields: [
      [{ label: 'Phone', value: g.phone || '' }, { label: 'SSN/EIN', value: maskSSN(g.ssnEin || '') }],
      [{ label: 'Address', value: composePdfAddress(g.streetAddress, g.cityStateZip) }],
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
    fields: [
      [{ label: 'Phone', value: preparer.phone || '' }, { label: 'SSN/EIN', value: maskSSN(preparer.ssnEin || '') }],
      [{ label: 'Address', value: composePdfAddress(preparer.streetAddress, preparer.cityStateZip) }],
    ],
  };

  sections.push({
    id: 'd1_d2',
    title: 'Part III & IV — ATTESTATIONS & OATHS OF GUARDIAN & PREPARER',
    bookmarkTitle: 'Guardian & Preparer Attestation (D-1 & D-2)',
    parentBookmark: 'Part IV - Attestations & Oaths',
    level: 1,
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
  const attorneyDetails = {
    'Florida Bar #': attorney.barNumber || '',
    'Filing Date': fmtDate(attorney.filingDate),
    'Phone': attorney.phone || '',
    'Primary Email': attorney.email || '',
    ...(attorney.secondaryEmail ? { 'Secondary Email': attorney.secondaryEmail } : {}),
    'Address': composePdfAddress(attorney.streetAddress, attorney.cityStateZip),
  };

  sections.push({
    id: 'd2_attorney',
    title: 'Part III-B — ATTORNEY ATTESTATION',
    bookmarkTitle: 'Attorney Attestation (D-2)',
    parentBookmark: 'Part IV - Attestations & Oaths',
    level: 1,
    pageBreakBefore: false,
    blocks: [
      {
        type: 'notice',
        tag: 'P',
        text: 'The undersigned attorney certifies that this Verified Initial Inventory complies with the applicable Florida Statutes and Florida Probate Rules.',
      },
      {
        type: 'signature-block',
        tag: 'Part',
        role: 'Attorney for Guardian',
        signerName: attorney.name || '',
        signature: formatSignature(attorney.name),
        signatureStyle,
        signatureDate: fmtDate(attorney.signatureDate),
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
    title: 'Part V — AUDIT FEE, BOND & SAFE DEPOSIT BOX',
    bookmarkTitle: 'Part V - Audit Fee, Bond & Safe Deposit (D-3 & D-4)',
    parentBookmark: null,
    level: 1,
    pageBreakBefore: false,
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
    pageBreakBefore: false,
    blocks: [
      {
        type: 'notice',
        tag: 'P',
        text: `I certify that a copy of this Verified Initial Inventory was served on ${fmtDate(d.serviceDate) || 'the date indicated below'} to the following persons:`,
      },
      ...(d.serviceRecipients && d.serviceRecipients.length ? [
        {
          type: 'table',
          tag: 'Table',
          title: 'Service Recipients',
          headers: ['Recipient Name', 'Address', 'Date Served'],
          rows: d.serviceRecipients.map(r => [r.name || '', composePdfAddress(r.address, r.cityStateZip), fmtDate(r.dateServed || d.serviceDate)]),
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
        type: 'signature-block',
        tag: 'Part',
        role: 'Attorney for Guardian (Service)',
        signerName: serviceAttorney.name || '',
        signature: formatSignature(serviceAttorney.name),
        signatureStyle,
        signatureDate: fmtDate(serviceAttorney.signatureDate),
        fields: [
          [{ label: 'Florida Bar #', value: serviceAttorney.barNumber || '' }, { label: 'Phone', value: serviceAttorney.phone || '' }],
          [{ label: 'Primary Email', value: serviceAttorney.email || attorney.email || '' }],
          [{ label: 'Address', value: composePdfAddress(serviceAttorney.streetAddress, serviceAttorney.cityStateZip) }],
        ],
      },
    ],
  });

  return {
    metadata,
    sections,
  };
}
