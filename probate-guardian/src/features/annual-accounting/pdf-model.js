// Structured intermediate representation for Annual Guardianship Accounting PDF generation.
// Maps window.D into the unified, accessible court document model (WCAG 2.1 Level AA).

import { calcTotalsAnnual, annualReconcileState } from './totals.js';

export const DISB_CATS = [
  'Accounting',
  'Bank Service Charges',
  'Care Facility',
  'Clothing / Personal Needs',
  'Entertainment / Travel',
  'Food / Meals',
  'Insurance: Automobile / Property',
  'Insurance: Health / Life',
  'Medical / Pharmacy',
  'Mortgage',
  'Nurse / Care Giver / Employer Tax',
  'Other Legal Expenses',
  'Rent',
  'Repairs / Maintenance',
  'Taxes: Income',
  'Taxes: Intangible',
  'Utilities',
  'Other',
];

export function buildAnnualAccountingModel(D, options = {}) {
  const d = D || {};
  const wardName = (d.wardName || 'Ward').trim();
  const caseNumber = (d.caseNumber || '').trim();
  const county = d.county || 'Pinellas';
  const printDate = options.printDate || new Date().toISOString().slice(0, 10);
  const signatureStyle = options.signatureStyle || d.signatureStyle || 'typed';

  const fmtS = (v) => {
    const num = parseFloat(v) || 0;
    return '$' + num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const fmtD = (iso) => {
    if (!iso) return '';
    const parts = String(iso).split('-');
    if (parts.length < 3) return iso;
    return `${parts[1]}/${parts[2]}/${parts[0]}`;
  };

  const formatSig = (name) => {
    const str = (name || '').trim();
    if (!str) return '';
    return str.startsWith('/s/') || str.startsWith('s/') || str.startsWith('/s') ? str : `/s/ ${str}`;
  };

  // Authoritative financial calculations from single source of truth
  const t = calcTotalsAnnual(d);
  const rec = annualReconcileState(t, d);

  const metadata = {
    title: `${wardName} - ${caseNumber} - Annual Accounting - Printed ${printDate}`,
    subject: 'Annual Accounting of Guardian of the Property (§ 744.3678)',
    author: 'Probate Guardian',
    creator: 'Probate Guardian',
    formName: 'ANNUAL GUARDIANSHIP ACCOUNTING',
    formSubtitle: `Annual Accounting — ${wardName}`,
    keywords: 'Florida, Probate, Guardianship, Annual Accounting',
    wardName,
    caseNumber,
    county,
    signatureStyle,
  };

  const sections = [];

  // ── Part I: Required Information ──────────────────────────────────────────
  const caseInfoItems = [
    { label: 'Name of Ward', value: wardName },
    { label: 'Case Number', value: caseNumber },
    { label: 'For the Period', value: `From: ${fmtD(d.periodFrom)}   To: ${fmtD(d.periodTo)}` },
    { label: 'Guardian', value: d.guardian || '' },
    { label: 'Attorney for Guardian', value: d.attorney || '' },
    { label: 'Type of Guardianship', value: d.typeOfGuardianship || 'Plenary' },
    { label: 'County', value: county },
    { label: 'Filing Type', value: d.filingType || 'Annual Accounting' },
    { label: 'Amended Form?', value: d.amendedForm ? 'Yes' : 'No' },
  ];
  if (d.relatedCaseNumbers) {
    caseInfoItems.push({ label: 'Related Case Numbers', value: d.relatedCaseNumbers });
  }

  sections.push({
    id: 'part1',
    title: 'Part I — REQUIRED INFORMATION',
    bookmarkTitle: 'Part I - Required Information',
    parentBookmark: null,
    level: 1,
    pageBreakBefore: false,
    blocks: [
      {
        type: 'key-value-grid',
        tag: 'Table',
        title: 'Case & Filer Information',
        items: caseInfoItems,
      },
    ],
  });

  // ── Part II: Guardian Certification & Audit Fee ───────────────────────────
  sections.push({
    id: 'part2',
    title: 'Part II — GUARDIAN CERTIFICATION & AUDIT FEE',
    bookmarkTitle: 'Part II - Certification & Audit Fee',
    parentBookmark: null,
    level: 1,
    pageBreakBefore: false,
    blocks: [
      {
        type: 'notice',
        tag: 'P',
        text: 'The undersigned guardian certifies that said guardian has obtained a receipt or canceled check for all expenditures and disbursements made on behalf of the ward, which said guardian will preserve along with other substantiating papers for a three (3) year period after discharge.',
      },
      {
        type: 'table',
        tag: 'Table',
        title: 'Audit Fee Schedule',
        headers: ['Estate Value Tier', 'Statutory Audit Fee'],
        rows: [
          ['Annual Accounting Estates with value of $25,000 or less', '$20.00'],
          ['From $25,000.01 up to and including $100,000', '$85.00'],
          ['From $100,000.01 up to and including $500,000', '$170.00'],
          ['In excess of $500,000', '$250.00'],
        ],
        totals: {
          label: `Applicable Audit Fee (Total Assets: ${fmtS(t.netAssetsFromD)})`,
          value: `$${t.auditFee.toFixed(2)}`,
        },
        colWidths: [75, 25],
        colAlign: ['left', 'right'],
      },
    ],
  });

  // ── Part VI: Changes in Net Assets ────────────────────────────────────────
  sections.push({
    id: 'part6',
    title: 'Part VI — CHANGES IN NET ASSETS',
    bookmarkTitle: 'Part VI - Changes in Net Assets',
    parentBookmark: null,
    level: 1,
    pageBreakBefore: true,
    blocks: [
      {
        type: 'table',
        tag: 'Table',
        title: 'Summary of Net Assets',
        headers: ['Line Item', 'Amount'],
        rows: [
          ['Starting Balance [Net Assets per Prior Report]', fmtS(d.startingBalance)],
          ['Schedule A — Income/Receipts', fmtS(t.schA)],
          ['Schedule B-1 — Attorney Fees and Costs', `(${fmtS(t.schB1)})`],
          ['Schedule B-2 — Guardian Fees and Costs', `(${fmtS(t.schB2)})`],
          ['Schedule B-3 — Other Court-Ordered Disbursements', `(${fmtS(t.schB3)})`],
          ['Schedule B-4 — All Other Disbursements', `(${fmtS(t.schB4)})`],
          ['Total Disbursements (B-1 through B-4)', `(${fmtS(t.totalDisb)})`],
          ['Schedule C — Capital Adjustments Net', fmtS(t.schC_net)],
        ],
        totals: {
          label: 'Line 20 — Net Assets at End of Accounting Period',
          value: fmtS(t.netAssets),
        },
        colWidths: [75, 25],
        colAlign: ['left', 'right'],
      },
    ],
  });

  // ── Part VII: Assets & Liabilities at End of Period ───────────────────────
  const part7Blocks = [
    {
      type: 'table',
      tag: 'Table',
      title: 'Assets & Liabilities Breakdown',
      headers: ['Schedule', 'Carrying Value', 'Ward Value / Amount'],
      rows: [
        ['Schedule D-1 — Cash Assets', '—', fmtS(t.schD1_total)],
        ['Schedule D-2 — Real Estate', fmtS(t.schD2_carrying), fmtS(t.schD2_ward)],
        ['Schedule D-3 — Personal Property', fmtS(t.schD3_carrying), fmtS(t.schD3_ward)],
        ['Schedule D-4 — Intangible Assets', fmtS(t.schD4_carrying), fmtS(t.schD4_ward)],
        ['Schedule D-5 — Mortgages / Liabilities', '—', `(${fmtS(t.schD5_total)})`],
      ],
      totals: {
        label: 'Line 30 — Net Assets at End of Accounting Period',
        value: fmtS(t.netAssetsFromD),
      },
      colWidths: [50, 25, 25],
      colAlign: ['left', 'right', 'right'],
    },
  ];

  if (rec.outOfBalance) {
    let noticeText = `Explanation of Difference Between Line 20 and Line 30:\nDifference: ${fmtS(rec.diff)}`;
    if (rec.explanation) {
      noticeText += `\n${rec.explanation}`;
    }
    part7Blocks.push({
      type: 'notice',
      tag: 'P',
      text: noticeText,
    });
  }

  sections.push({
    id: 'part7',
    title: 'Part VII — ASSETS & LIABILITIES AT END OF PERIOD',
    bookmarkTitle: 'Part VII - Assets & Liabilities',
    parentBookmark: null,
    level: 1,
    pageBreakBefore: false,
    blocks: part7Blocks,
  });

  // ── Part III: Guardian Declarations & Signatures ──────────────────────────
  const guardianList = (d.guardians || []).filter((g) => g && g.name);
  const guardianSigBlocks = guardianList.map((g, i) => {
    const gRole = ['Guardian #1', 'Co-Guardian #2', 'Co-Guardian #3'][i] || `Guardian #${i + 1}`;
    return {
      type: 'signature-block',
      tag: 'Figure',
      role: gRole,
      signerName: g.name || '',
      signature: formatSig(g.name),
      signatureStyle,
      signatureDate: fmtD(g.signatureDate),
      details: {
        'Phone': g.phone || '',
        'SSN / EIN': g.ssn || '',
        'Email': g.email || '',
        'Mailing Address': `${g.mailingStreet || ''}, ${g.mailingCityStateZip || ''}`.replace(/^, /, ''),
        'Residence / Office': `${g.officeStreet || ''}, ${g.officeCityStateZip || ''}`.replace(/^, /, ''),
      },
    };
  });

  sections.push({
    id: 'part3',
    title: 'Part III — GUARDIAN(S) SIGNATURE & DECLARATION',
    bookmarkTitle: 'Part III - Guardian Declaration',
    parentBookmark: null,
    level: 1,
    pageBreakBefore: true,
    blocks: [
      {
        type: 'notice',
        tag: 'P',
        text: `UNDER PENALTIES OF PERJURY, I declare that I have read and examined the foregoing return and that, to the best of my knowledge and belief, it constitutes a full and correct account of all the ward's property of which this guardian has control, and is a complete report of all cash and property transactions and of all receipts and any disbursements by me from ${fmtD(d.periodFrom)} through ${fmtD(d.periodTo)}.`,
      },
      ...guardianSigBlocks,
    ],
  });

  // ── Part IV: Preparer Attestation ─────────────────────────────────────────
  const p = d.preparer || {};
  sections.push({
    id: 'part4',
    title: 'Part IV — PREPARER ATTESTATION',
    bookmarkTitle: 'Part IV - Preparer Attestation',
    parentBookmark: null,
    level: 1,
    pageBreakBefore: false,
    blocks: [
      {
        type: 'notice',
        tag: 'P',
        text: `I have compiled the accompanying Annual Accounting of assets and liabilities arising from cash transactions, current market valuation, and current estimated market valuation of the guardianship of ${wardName} for the period ${fmtD(d.periodFrom)} through ${fmtD(d.periodTo)}. This compilation is limited to presenting information in the form of an Annual Accounting and is the representation of the guardian. I have not audited or reviewed the accompanying guardianship accounting and, accordingly, do not express an opinion or any other form of assurance on it.\n\nNOTICE: If you are the Guardian, Co-Guardian, or Guardian Attorney — DO NOT SIGN HERE.`,
      },
      {
        type: 'signature-block',
        tag: 'Figure',
        role: 'Preparer',
        signerName: p.name || '',
        signature: formatSig(p.name),
        signatureStyle,
        signatureDate: fmtD(p.signatureDate),
        details: {
          'Phone': p.phone || '',
          'SSN / EIN': p.ssn || '',
          'Address': `${p.street || ''}, ${p.cityStateZip || ''}`.replace(/^, /, ''),
        },
      },
    ],
  });

  // ── Part V: Guardian Attorney Signature ───────────────────────────────────
  sections.push({
    id: 'part5',
    title: 'Part V — GUARDIAN ATTORNEY SIGNATURE',
    bookmarkTitle: 'Part V - Attorney Signature',
    parentBookmark: null,
    level: 1,
    pageBreakBefore: false,
    blocks: [
      {
        type: 'notice',
        tag: 'P',
        text: `The undersigned Attorney hereby notifies the Court of the filing of the annual guardianship accounting of the Guardian ${wardName} for the period ${fmtD(d.periodFrom)} through ${fmtD(d.periodTo)}. This annual accounting is the representation of the guardian. The undersigned attorney represents that he/she has examined the contents of the accounting and that it conforms to the requirements of the Florida Guardianship Law and the standards for accountings in ${d.attorney_county || county} County, Florida.`,
      },
      {
        type: 'signature-block',
        tag: 'Figure',
        role: 'Attorney for Guardian',
        signerName: d.attorney || '',
        signature: formatSig(d.attorney),
        signatureStyle,
        signatureDate: fmtD(d.attorney_signatureDate),
        details: {
          'Florida Bar #': d.attorney_bar || d.attorney_barNumber || '',
          'Phone': d.attorney_phone || '',
          'Address': `${d.attorney_street || ''}, ${d.attorney_cityStateZip || ''}`.replace(/^, /, ''),
        },
      },
    ],
  });

  // ── Schedule A: Income ───────────────────────────────────────────────────
  const schARows = (d.schA || []).map((r, i) => [
    String(i + 1),
    r.payer || '',
    r.description || '',
    r.bank || '',
    r.accountNo || '',
    fmtS(r.amount),
  ]);
  sections.push({
    id: 'schA',
    title: 'SCHEDULE A: Income Received During Period',
    bookmarkTitle: 'Schedule A - Income',
    parentBookmark: null,
    level: 2,
    pageBreakBefore: true,
    blocks: [
      {
        type: 'table',
        tag: 'Table',
        title: 'Schedule A: Income Received During Period',
        headers: ['#', 'Income Source / Payer', 'Description', 'Bank', 'Account #', "Ward's Income Amount"],
        rows: schARows.length ? schARows : [['—', 'No income entries', '—', '—', '—', '$0.00']],
        totals: { label: 'Schedule A Total — Income/Receipts', value: fmtS(t.schA) },
        colWidths: [5, 25, 25, 18, 12, 15],
        colAlign: ['center', 'left', 'left', 'left', 'left', 'right'],
      },
    ],
  });

  // ── Schedule B-1: Attorney Fees ──────────────────────────────────────────
  const schB1Rows = (d.schB1 || []).map((r, i) => [
    String(i + 1),
    r.bankAcct || '',
    r.checkNo || '',
    fmtD(r.periodFrom),
    fmtD(r.periodTo),
    fmtD(r.datePaid),
    r.payee || '',
    fmtD(r.courtOrderDate),
    fmtS(r.amount),
  ]);
  sections.push({
    id: 'schB1',
    title: 'SCHEDULE B-1: Attorney Fees and Costs',
    bookmarkTitle: 'Schedule B-1 - Attorney Fees',
    parentBookmark: null,
    level: 2,
    pageBreakBefore: true,
    blocks: [
      {
        type: 'table',
        tag: 'Table',
        title: 'Schedule B-1: Attorney Fees and Costs During Period',
        headers: ['#', 'Bank Acct', 'Check #', 'Period From', 'Period To', 'Date Paid', 'Payee', 'Court Order', 'Amount'],
        rows: schB1Rows.length ? schB1Rows : [['—', '—', '—', '—', '—', '—', 'No entries', '—', '$0.00']],
        totals: { label: 'Schedule B-1 Total', value: fmtS(t.schB1) },
        colWidths: [5, 12, 10, 11, 11, 11, 20, 10, 10],
        colAlign: ['center', 'left', 'left', 'left', 'left', 'left', 'left', 'left', 'right'],
      },
    ],
  });

  // ── Schedule B-2: Guardian Fees ──────────────────────────────────────────
  const schB2Rows = (d.schB2 || []).map((r, i) => [
    String(i + 1),
    r.bankAcct || '',
    r.checkNo || '',
    fmtD(r.periodFrom),
    fmtD(r.periodTo),
    fmtD(r.datePaid),
    r.payee || '',
    fmtD(r.courtOrderDate),
    fmtS(r.amount),
  ]);
  sections.push({
    id: 'schB2',
    title: 'SCHEDULE B-2: Guardian Fees and Costs',
    bookmarkTitle: 'Schedule B-2 - Guardian Fees',
    parentBookmark: null,
    level: 2,
    pageBreakBefore: false,
    blocks: [
      {
        type: 'table',
        tag: 'Table',
        title: 'Schedule B-2: Guardian Fees and Costs During Period',
        headers: ['#', 'Bank Acct', 'Check #', 'Period From', 'Period To', 'Date Paid', 'Payee', 'Court Order', 'Amount'],
        rows: schB2Rows.length ? schB2Rows : [['—', '—', '—', '—', '—', '—', 'No entries', '—', '$0.00']],
        totals: { label: 'Schedule B-2 Total', value: fmtS(t.schB2) },
        colWidths: [5, 12, 10, 11, 11, 11, 20, 10, 10],
        colAlign: ['center', 'left', 'left', 'left', 'left', 'left', 'left', 'left', 'right'],
      },
    ],
  });

  // ── Schedule B-3: Court-Ordered Disbursements ────────────────────
  const schB3Rows = (d.schB3 || []).map((r, i) => [
    String(i + 1),
    r.bankAcct || '',
    r.checkNo || '',
    fmtD(r.datePaid),
    r.payee || '',
    fmtD(r.courtOrderDate),
    fmtS(r.amount),
  ]);
  sections.push({
    id: 'schB3',
    title: 'SCHEDULE B-3: Other Court-Ordered Disbursements',
    bookmarkTitle: 'Schedule B-3 - Court-Ordered Disbursements',
    parentBookmark: null,
    level: 2,
    pageBreakBefore: false,
    blocks: [
      {
        type: 'table',
        tag: 'Table',
        title: 'Schedule B-3: Other Court-Ordered Disbursements During Period',
        headers: ['#', 'Bank Acct', 'Check #', 'Date Paid', 'Payee', 'Court Order Date', 'Amount'],
        rows: schB3Rows.length ? schB3Rows : [['—', '—', '—', '—', 'No entries', '—', '$0.00']],
        totals: { label: 'Schedule B-3 Total', value: fmtS(t.schB3) },
        colWidths: [6, 16, 12, 14, 26, 14, 12],
        colAlign: ['center', 'left', 'left', 'left', 'left', 'left', 'right'],
      },
    ],
  });

  // ── Schedule B-4: All Other Disbursements (Summary + Register) ────────────
  const catTotals = {};
  DISB_CATS.forEach((c) => { catTotals[c] = 0; });
  (d.schB4 || []).forEach((r) => {
    if (r.category && catTotals[r.category] !== undefined) {
      const num = parseFloat(r.amount);
      catTotals[r.category] += isNaN(num) ? 0 : num;
    }
  });

  const catRows = DISB_CATS.map((c, i) => [
    String(i + 1),
    c,
    catTotals[c] > 0 ? fmtS(catTotals[c]) : '—',
  ]);

  const schB4Blocks = [
    {
      type: 'table',
      tag: 'Table',
      title: 'Schedule B-4: All Other Disbursements — Summary by Category',
      headers: ['#', 'Category', 'Amount'],
      rows: catRows,
      totals: { label: 'All Other Disbursements Total', value: fmtS(t.schB4) },
      colWidths: [10, 65, 25],
      colAlign: ['center', 'left', 'right'],
    },
  ];

  if ((d.schB4 || []).length > 0) {
    const regRows = d.schB4.map((r, i) => [
      String(i + 1),
      r.checkNo || '',
      fmtD(r.datePaid),
      r.category || '',
      r.payee || '',
      fmtS(r.amount),
    ]);
    schB4Blocks.push({
      type: 'table',
      tag: 'Table',
      title: 'Schedule B-4: All Other Disbursements — Check Register',
      headers: ['#', 'Check #', 'Date Paid', 'Category', 'Payee', 'Amount'],
      rows: regRows,
      totals: { label: 'Schedule B-4 Detail Total', value: fmtS(t.schB4) },
      colWidths: [6, 14, 14, 26, 26, 14],
      colAlign: ['center', 'left', 'left', 'left', 'left', 'right'],
    });
  }

  sections.push({
    id: 'schB4',
    title: 'SCHEDULE B-4: All Other Disbursements',
    bookmarkTitle: 'Schedule B-4 - Other Disbursements',
    parentBookmark: null,
    level: 2,
    pageBreakBefore: true,
    blocks: schB4Blocks,
  });

  // ── Schedule C: Capital Adjustments ───────────────────────────────────────
  const schCRows = (d.schC || []).map((r, i) => [
    String(i + 1),
    r.description || '',
    fmtD(r.date),
    r.gain ? fmtS(r.gain) : '—',
    r.loss ? fmtS(r.loss) : '—',
  ]);
  sections.push({
    id: 'schC',
    title: 'SCHEDULE C: Capital Adjustments During Period',
    bookmarkTitle: 'Schedule C - Capital Adjustments',
    parentBookmark: null,
    level: 2,
    pageBreakBefore: true,
    blocks: [
      {
        type: 'table',
        tag: 'Table',
        title: 'Schedule C: Capital Adjustments During Period',
        headers: ['#', 'Description', 'Date', 'Gain / Addition', 'Loss / Reduction'],
        rows: schCRows.length ? schCRows : [['—', 'No entries', '—', '—', '—']],
        totals: { label: 'Capital Adjustments Net (Gains + Losses)', value: fmtS(t.schC_net) },
        colWidths: [6, 46, 16, 16, 16],
        colAlign: ['center', 'left', 'left', 'right', 'right'],
      },
    ],
  });

  // ── Schedule D-1: Cash Assets ─────────────────────────────────────────────
  const schD1Rows = (d.schD1 || []).map((r, i) => {
    const p = parseFloat(r.wardPct);
    const wardFraction = isNaN(p) ? 0 : p > 1 ? p / 100 : p;
    const full = parseFloat(r.fullAmount) || 0;
    const wa = full * wardFraction;
    return [
      String(i + 1),
      r.description || '',
      r.accountNo || '',
      r.restricted || 'No',
      r.type || '',
      fmtS(r.fullAmount),
      r.wardPct ? `${r.wardPct}%` : '100%',
      fmtS(wa),
    ];
  });
  sections.push({
    id: 'schD1',
    title: 'SCHEDULE D-1: Cash Assets',
    bookmarkTitle: 'Schedule D-1 - Cash Assets',
    parentBookmark: null,
    level: 2,
    pageBreakBefore: true,
    blocks: [
      {
        type: 'table',
        tag: 'Table',
        title: 'Schedule D-1: Cash Assets on Hand',
        headers: ['#', 'Description', 'Account #', 'Restricted?', 'Type', 'Full Amount', "Ward's %", "Ward's Amount"],
        rows: schD1Rows.length ? schD1Rows : [['—', 'No entries', '—', '—', '—', '$0.00', '—', '$0.00']],
        totals: { label: "Cash Assets Total (Ward's Amount)", value: fmtS(t.schD1_total) },
        colWidths: [5, 25, 14, 10, 12, 12, 10, 12],
        colAlign: ['center', 'left', 'left', 'center', 'left', 'right', 'right', 'right'],
      },
    ],
  });

  // ── Schedule D-2: Real Estate ─────────────────────────────────────────────
  const schD2Rows = (d.schD2 || []).map((r, i) => {
    const p = parseFloat(r.wardPct);
    const wardFraction = isNaN(p) ? 0 : p > 1 ? p / 100 : p;
    const full = parseFloat(r.fullValue) || 0;
    const carry = parseFloat(r.carryingValue) || 0;
    const wv = full * wardFraction;
    const cv = carry * wardFraction;
    return [
      String(i + 1),
      r.description || '',
      r.residence || 'No',
      r.income || 'No',
      fmtS(r.fullValue),
      r.wardPct ? `${r.wardPct}%` : '100%',
      fmtS(cv),
      fmtS(wv),
    ];
  });
  sections.push({
    id: 'schD2',
    title: 'SCHEDULE D-2: Real Estate and Real Property Assets',
    bookmarkTitle: 'Schedule D-2 - Real Estate',
    parentBookmark: null,
    level: 2,
    pageBreakBefore: false,
    blocks: [
      {
        type: 'table',
        tag: 'Table',
        title: 'Schedule D-2: Real Estate and Real Property Assets',
        headers: ['#', 'Description / Address', 'Residence?', 'Income?', 'Full Value', "Ward's %", 'Carrying Value', "Ward's Value"],
        rows: schD2Rows.length ? schD2Rows : [['—', 'No entries', '—', '—', '$0.00', '—', '$0.00', '$0.00']],
        totals: { label: 'Schedule D-2 Totals (Carrying / Ward Value)', value: `${fmtS(t.schD2_carrying)} / ${fmtS(t.schD2_ward)}` },
        colWidths: [5, 25, 10, 10, 13, 10, 13, 14],
        colAlign: ['center', 'left', 'center', 'center', 'right', 'right', 'right', 'right'],
      },
    ],
  });

  // ── Schedule D-3: Personal Property ───────────────────────────────────────
  const schD3Rows = (d.schD3 || []).map((r, i) => {
    const p = parseFloat(r.wardPct);
    const wardFraction = isNaN(p) ? 0 : p > 1 ? p / 100 : p;
    const full = parseFloat(r.fullAmount) || 0;
    const carry = parseFloat(r.carryingValue) || 0;
    const wa = full * wardFraction;
    const cv = carry * wardFraction;
    return [
      String(i + 1),
      r.description || '',
      fmtS(r.fullAmount),
      r.wardPct ? `${r.wardPct}%` : '100%',
      fmtS(cv),
      fmtS(wa),
    ];
  });
  sections.push({
    id: 'schD3',
    title: 'SCHEDULE D-3: Personal Property Assets',
    bookmarkTitle: 'Schedule D-3 - Personal Property',
    parentBookmark: null,
    level: 2,
    pageBreakBefore: false,
    blocks: [
      {
        type: 'table',
        tag: 'Table',
        title: 'Schedule D-3: Personal Property Assets',
        headers: ['#', 'Description / Location', 'Full Amount', "Ward's %", 'Carrying Value', "Ward's Amount"],
        rows: schD3Rows.length ? schD3Rows : [['—', 'No entries', '$0.00', '—', '$0.00', '$0.00']],
        totals: { label: 'Schedule D-3 Totals (Carrying / Ward Amount)', value: `${fmtS(t.schD3_carrying)} / ${fmtS(t.schD3_ward)}` },
        colWidths: [6, 40, 14, 12, 14, 14],
        colAlign: ['center', 'left', 'right', 'right', 'right', 'right'],
      },
    ],
  });

  // ── Schedule D-4: Intangible Assets ───────────────────────────────────────
  const schD4Rows = (d.schD4 || []).map((r, i) => {
    const p = parseFloat(r.wardPct);
    const wardFraction = isNaN(p) ? 0 : p > 1 ? p / 100 : p;
    const full = parseFloat(r.fullAmount) || 0;
    const carry = parseFloat(r.carryingValue) || 0;
    const wv = full * wardFraction;
    const cv = carry * wardFraction;
    const ra = r.restricted === 'Yes' ? cv : 0;
    return [
      String(i + 1),
      r.description || '',
      r.restricted || 'No',
      fmtS(r.fullAmount),
      r.wardPct ? `${r.wardPct}%` : '100%',
      fmtS(cv),
      fmtS(wv),
      ra > 0 ? fmtS(ra) : '—',
    ];
  });
  sections.push({
    id: 'schD4',
    title: 'SCHEDULE D-4: Intangible Assets',
    bookmarkTitle: 'Schedule D-4 - Intangible Assets',
    parentBookmark: null,
    level: 2,
    pageBreakBefore: false,
    blocks: [
      {
        type: 'table',
        tag: 'Table',
        title: 'Schedule D-4: Intangible Assets',
        headers: ['#', 'Description', 'Restricted?', 'Full Amount', "Ward's %", 'Carrying Value', "Ward's Value", 'Restricted Amt'],
        rows: schD4Rows.length ? schD4Rows : [['—', 'No entries', '—', '$0.00', '—', '$0.00', '$0.00', '—']],
        totals: { label: 'Schedule D-4 Totals (Carrying / Ward Value)', value: `${fmtS(t.schD4_carrying)} / ${fmtS(t.schD4_ward)}` },
        colWidths: [5, 23, 10, 13, 9, 13, 13, 14],
        colAlign: ['center', 'left', 'center', 'right', 'right', 'right', 'right', 'right'],
      },
    ],
  });

  // ── Schedule D-5: Mortgages / Liabilities ─────────────────────────────────
  const schD5Rows = (d.schD5 || []).map((r, i) => {
    const p = parseFloat(r.wardPct);
    const wardFraction = isNaN(p) ? 0 : p > 1 ? p / 100 : p;
    const fullDebt = parseFloat(r.fullDebt) || 0;
    const wb = fullDebt * wardFraction;
    return [
      String(i + 1),
      r.description || '',
      r.loanNo || '',
      r.loanType || '',
      fmtS(r.fullDebt),
      r.wardPct ? `${r.wardPct}%` : '100%',
      fmtS(wb),
    ];
  });
  sections.push({
    id: 'schD5',
    title: 'SCHEDULE D-5: Mortgages / Loans / Notes / Other Liabilities',
    bookmarkTitle: 'Schedule D-5 - Liabilities',
    parentBookmark: null,
    level: 2,
    pageBreakBefore: false,
    blocks: [
      {
        type: 'table',
        tag: 'Table',
        title: 'Schedule D-5: Mortgages / Loans / Notes / Other Liabilities',
        headers: ['#', 'Description / Lender', 'Loan/Acct #', 'Type', 'Full Debt', "Ward's %", "Ward's Balance"],
        rows: schD5Rows.length ? schD5Rows : [['—', 'No entries', '—', '—', '$0.00', '—', '$0.00']],
        totals: { label: "Schedule D-5 Total — Ward's Balance Due", value: fmtS(t.schD5_total) },
        colWidths: [6, 26, 16, 14, 13, 11, 14],
        colAlign: ['center', 'left', 'left', 'left', 'right', 'right', 'right'],
      },
    ],
  });

  // ── Schedule E: Bank Transfers (Conditional) ──────────────────────────────
  if ((d.schE || []).length > 0) {
    const schERows = d.schE.map((r, i) => [
      String(i + 1),
      r.bankName || '',
      fmtD(r.transferInDate),
      r.transferInAmt ? fmtS(r.transferInAmt) : '—',
      fmtD(r.transferOutDate),
      r.transferOutAmt ? fmtS(r.transferOutAmt) : '—',
    ]);
    sections.push({
      id: 'schE',
      title: 'SCHEDULE E: Bank Transfers During Period',
      bookmarkTitle: 'Schedule E - Bank Transfers',
      parentBookmark: null,
      level: 2,
      pageBreakBefore: true,
      blocks: [
        {
          type: 'table',
          tag: 'Table',
          title: 'Schedule E: Bank Transfers During Period',
          headers: ['#', 'Bank Name / Account #', 'Transfer In Date', 'Transfer In Amt', 'Transfer Out Date', 'Transfer Out Amt'],
          rows: schERows,
          colWidths: [6, 34, 15, 15, 15, 15],
          colAlign: ['center', 'left', 'left', 'right', 'left', 'right'],
        },
      ],
    });
  }

  // ── Schedule F-1: Sales of Real Property (Conditional) ────────────────────
  if ((d.schF1 || []).length > 0) {
    const schF1Rows = d.schF1.map((r, i) => [
      String(i + 1),
      r.description || '',
      r.bank || '',
      r.accountNo || '',
      fmtD(r.courtOrderDate),
      fmtS(r.salePrice),
    ]);
    const num = (v) => { const n = parseFloat(v); return isNaN(n) ? 0 : n; };
    const totalF1 = d.schF1.reduce((s, r) => s + num(r.salePrice), 0);
    sections.push({
      id: 'schF1',
      title: 'SCHEDULE F-1: Sales of Real Property During Period',
      bookmarkTitle: 'Schedule F-1 - Real Property Sales',
      parentBookmark: null,
      level: 2,
      pageBreakBefore: false,
      blocks: [
        {
          type: 'table',
          tag: 'Table',
          title: 'Schedule F-1: Sales of Real Property During Period',
          headers: ['#', 'Description', 'Bank', 'Account #', 'Court Order Date', 'Sale Price'],
          rows: schF1Rows,
          totals: { label: 'Schedule F-1 Total', value: fmtS(totalF1) },
          colWidths: [6, 34, 16, 14, 16, 14],
          colAlign: ['center', 'left', 'left', 'left', 'left', 'right'],
        },
      ],
    });
  }

  // ── Schedule F-2: Sales of Personal Property (Conditional) ────────────────
  if ((d.schF2 || []).length > 0) {
    const schF2Rows = d.schF2.map((r, i) => [
      String(i + 1),
      r.description || '',
      r.bank || '',
      r.accountNo || '',
      fmtD(r.courtOrderDate),
      fmtS(r.salePrice),
    ]);
    const num = (v) => { const n = parseFloat(v); return isNaN(n) ? 0 : n; };
    const totalF2 = d.schF2.reduce((s, r) => s + num(r.salePrice), 0);
    sections.push({
      id: 'schF2',
      title: 'SCHEDULE F-2: Sales of Personal Property During Period',
      bookmarkTitle: 'Schedule F-2 - Personal Property Sales',
      parentBookmark: null,
      level: 2,
      pageBreakBefore: false,
      blocks: [
        {
          type: 'table',
          tag: 'Table',
          title: 'Schedule F-2: Sales of Personal Property During Period',
          headers: ['#', 'Description', 'Bank', 'Account #', 'Court Order Date', 'Sale Price'],
          rows: schF2Rows,
          totals: { label: 'Schedule F-2 Total', value: fmtS(totalF2) },
          colWidths: [6, 34, 16, 14, 16, 14],
          colAlign: ['center', 'left', 'left', 'left', 'left', 'right'],
        },
      ],
    });
  }

  // ── Part VIII: Trust Information ──────────────────────────────────────────
  const trustBlocks = [
    {
      type: 'key-value-grid',
      tag: 'Table',
      title: 'Trust Disclosure',
      items: [
        { label: 'Does the Ward have one or more Trusts?', value: (d.trusts && d.trusts[0] && d.trusts[0].hasTrust) || 'No' },
      ],
    },
  ];

  const trustList = (d.trusts || []).filter((t) => t && t.name);
  if (trustList.length > 0) {
    const trustRows = trustList.map((t, i) => [
      String(i + 1),
      t.name || '',
      t.trustee || '',
      t.accountNo || '',
      t.createdAfterGID || 'No',
      t.wardPct ? `${t.wardPct}%` : '100%',
      fmtS(t.wardAmount),
    ]);
    trustBlocks.push({
      type: 'table',
      tag: 'Table',
      title: 'Trust Accounts Details',
      headers: ['#', 'Name of Trust', 'Trustee', 'Account #', 'After GID?', "Ward's %", "Ward's Amount"],
      rows: trustRows,
      colWidths: [6, 26, 20, 16, 12, 10, 10],
      colAlign: ['center', 'left', 'left', 'left', 'center', 'right', 'right'],
    });
  }

  sections.push({
    id: 'part8',
    title: 'Part VIII — TRUST INFORMATION',
    bookmarkTitle: 'Part VIII - Trust Information',
    parentBookmark: null,
    level: 1,
    pageBreakBefore: true,
    blocks: trustBlocks,
  });

  // ── Part IX: Other Information & Bond Calculation ─────────────────────────
  sections.push({
    id: 'part9',
    title: 'Part IX — OTHER INFORMATION & BOND CALCULATION',
    bookmarkTitle: 'Part IX - Bond Calculation',
    parentBookmark: null,
    level: 1,
    pageBreakBefore: false,
    blocks: [
      {
        type: 'key-value-grid',
        tag: 'Table',
        title: 'Depository and Relationship Information',
        items: [
          { label: "Guardian's Relationship to Ward", value: d.guardianRelationship || 'None' },
          { label: 'Date of Restricted Depository Receipt', value: fmtD(d.restrictedDepositoryReceiptDate) || 'None' },
        ],
      },
      {
        type: 'table',
        tag: 'Table',
        title: 'Statutory Bond Calculation Breakdown',
        headers: ['Bond Component', 'Amount'],
        rows: [
          ['Schedule D-1 — Cash Assets in RESTRICTED Depository', fmtS(t.schD1_restricted)],
          ['Schedule D-4 — Intangible Assets RESTRICTED', fmtS(t.schD4_restricted)],
          ['Schedule D-1 — Cash Assets NOT in Restricted Depository', fmtS(t.schD1_total - t.schD1_restricted)],
          ['Schedule D-3 — Personal Property Assets', fmtS(t.schD3_ward)],
          ['Schedule D-4 — Intangible Assets (Unrestricted)', fmtS(t.schD4_ward - t.schD4_restricted)],
        ],
        totals: {
          label: 'Total Required Bond Amount (§ 744.351)',
          value: fmtS(t.bondReq),
        },
        colWidths: [75, 25],
        colAlign: ['left', 'right'],
      },
      {
        type: 'key-value-grid',
        tag: 'Table',
        title: 'Bond Policy Details',
        items: [
          { label: 'Bond Amount', value: fmtS(d.bondAmount) },
          { label: 'Bond Period', value: `From: ${fmtD(d.bondPeriodFrom)}   To: ${fmtD(d.bondPeriodTo)}` },
          { label: 'Name of Bonding Company', value: d.bondingCompany || '' },
        ],
      },
    ],
  });

  // ── Part X: Certificate of Service ────────────────────────────────────────
  const certRecipients = (d.certRecipients || []).filter(r => r && (r.name || r.line2 || r.line3 || r.line4));
  const certBlocks = [
    {
      type: 'notice',
      tag: 'P',
      text: 'Pursuant to Florida Statute 744.367(4), I hereby certify that a copy of this accounting has been furnished to:',
    },
  ];

  if (certRecipients.length > 0) {
    certBlocks.push({
      type: 'table',
      tag: 'Table',
      title: 'Certificate of Service Recipients',
      headers: ['#', 'Recipient Name', 'Address Details'],
      rows: certRecipients.map((r, i) => [
        String(i + 1),
        r.name || '',
        [r.line2, r.line3, r.line4].filter(Boolean).join(', '),
      ]),
      colWidths: [6, 44, 50],
      colAlign: ['center', 'left', 'left'],
    });
  } else {
    certBlocks.push({
      type: 'notice',
      tag: 'P',
      text: 'No service recipients listed.',
    });
  }

  certBlocks.push({
    type: 'notice',
    tag: 'P',
    text: `on this date: ${fmtD(d.certDate) || 'the date indicated below'}${d.certIndicator ? ` | ${d.certIndicator}` : ''}`,
  });

  certBlocks.push({
    type: 'signature-block',
    tag: 'Figure',
    role: 'Attorney for Guardian (Service)',
    signerName: d.attorney || '',
    signature: formatSig(d.attorney),
    signatureStyle,
    signatureDate: fmtD(d.certAttySignDate),
    details: {
      'Florida Bar #': d.attorney_bar || d.attorney_barNumber || '',
      'Phone': d.attorney_phone || '',
      'Address': `${d.attorney_street || ''}, ${d.attorney_cityStateZip || ''}`.replace(/^, /, ''),
    },
  });

  sections.push({
    id: 'part10',
    title: 'Part X — GUARDIAN ATTORNEY CERTIFICATE OF SERVICE',
    bookmarkTitle: 'Part X - Certificate of Service',
    parentBookmark: null,
    level: 1,
    pageBreakBefore: true,
    blocks: certBlocks,
  });

  // ── Part XI: Remuneration ──────────────────────────────────────────────────
  const remList = (d.remuneration || []).filter(r => r && (r.amount || r.guardian || r.type || r.description));
  if (remList.length > 0) {
    sections.push({
      id: 'part11',
      title: 'Part XI — GUARDIAN(S) DECLARATION OF REMUNERATION',
      bookmarkTitle: 'Part XI - Remuneration',
      parentBookmark: null,
      level: 1,
      pageBreakBefore: true,
      blocks: [
        {
          type: 'notice',
          tag: 'P',
          text: 'Per 744.367(3)(a), the annual guardianship report must include a declaration of all remuneration received by the guardian from any source for services rendered to or on behalf of the ward.',
        },
        {
          type: 'table',
          tag: 'Table',
          title: 'Declaration of Remuneration',
          headers: ['#', 'Guardian Name', 'Type', 'Description', 'Amount'],
          rows: remList.map((r, i) => [
            String(i + 1),
            r.guardian || '',
            r.type || '',
            r.description || '',
            fmtS(r.amount),
          ]),
          colWidths: [6, 26, 20, 32, 16],
          colAlign: ['center', 'left', 'left', 'left', 'right'],
        },
      ],
    });
  }

  return { metadata, sections };
}
