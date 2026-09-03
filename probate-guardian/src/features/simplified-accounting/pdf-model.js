// Structured intermediate representation for Simplified Annual Accounting PDF generation.
// Maps window.D into the unified, accessible court document model.

export function buildSimplifiedAccountingModel(D, options = {}) {
  const d = D || {};
  const wardName = (d.wardName || 'Ward').trim();
  const caseNumber = (d.caseNumber || '').trim();
  const county = d.county || 'Pinellas';
  const printDate = options.printDate || new Date().toISOString().slice(0, 10);
  const signatureStyle = options.signatureStyle || d.signatureStyle || 'typed';

  const fmtS = (v) => {
    const n = parseFloat(v) || 0;
    return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const fmtDate = (iso) => {
    if (!iso) return '';
    const parts = String(iso).split('-');
    if (parts.length < 3) return iso;
    return `${parts[1]}/${parts[2]}/${parts[0]}`;
  };

  const formatSig = (name) => {
    const n = (name || '').trim();
    if (!n) return '';
    return n.startsWith('/s/') || n.startsWith('s/') || n.startsWith('/s') ? n : `/s/ ${n}`;
  };

  // Calculate totals
  const starting = parseFloat(d.startingBalance) || 0;
  const interest = parseFloat(d.interestIncome) || 0;
  const settlement = parseFloat(d.depositsSettlement) || 0;
  const totalIncome = interest + settlement;

  const serviceCharges = parseFloat(d.serviceCharges) || 0;
  const fedTax = parseFloat(d.federalIncomeTax) || 0;
  const totalDisbursements = serviceCharges + fedTax;

  const remaining = starting + totalIncome - totalDisbursements;

  const metadata = {
    title: `${wardName} - ${caseNumber} - Simplified Accounting - Printed ${printDate}`,
    subject: 'Simplified Annual Accounting of Guardian of the Property (§ 744.3679)',
    author: 'Probate Guardian',
    creator: 'Probate Guardian',
    formName: 'SIMPLIFIED ANNUAL ACCOUNTING',
    formSubtitle: 'Simplified Annual Accounting',
    keywords: 'Florida, Probate, Guardianship, Simplified Annual Accounting',
    wardName,
    caseNumber,
    county,
    signatureStyle,
  };

  const sections = [];

  // 1. Part I: Required Information
  const caseInfoItems = [
    { label: 'Name of Ward', value: wardName },
    { label: 'Case Number', value: caseNumber },
    { label: 'Social Security Number', value: d.ssn || '' },
    { label: 'Accounting Period', value: `From: ${fmtDate(d.periodFrom)}  To: ${fmtDate(d.periodTo)}` },
    { label: 'Guardian', value: d.guardian || '' },
    { label: 'Attorney for Guardian', value: d.attorney || '' },
    { label: 'Type of Guardianship', value: d.typeOfGuardianship || 'Plenary' },
    { label: 'County', value: county },
    { label: 'Amended Form?', value: d.amendedForm ? 'Yes' : 'No' },
  ];
  if (d.gid) {
    caseInfoItems.push({ label: 'Guardianship Inception Date (GID)', value: fmtDate(d.gid) });
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
      {
        type: 'notice',
        tag: 'P',
        text: `Eligibility under § 744.3679: all estate property is held in a designated depository under § 69.031 (${d.eligDepository || '—'}); the only account transactions are interest accrual, settlement deposits, and/or financial institution service charges (${d.eligOnlyTransactions || '—'}).`,
      },
    ],
  });

  // 2. Part II: Accounting Summary and Remaining Assets on Hand
  sections.push({
    id: 'part2',
    title: 'Part II — ACCOUNTING SUMMARY AND REMAINING ASSETS ON HAND',
    bookmarkTitle: 'Part II - Accounting Summary',
    parentBookmark: null,
    level: 1,
    pageBreakBefore: false,
    blocks: [
      {
        type: 'table',
        tag: 'Table',
        title: 'Accounting Summary',
        headers: ['Line', 'Description', 'Amount'],
        rows: [
          ['Line 1', 'Starting Balance [Net Assets per the Prior Report]', fmtS(starting)],
          ['Line 2', 'Interest Income', fmtS(interest)],
          ['Line 3', 'Deposits Pursuant to Settlement', fmtS(settlement)],
          ['Line 4', 'Total Income (Lines 2 + 3)', fmtS(totalIncome)],
          ['Line 5', 'Financial Institution Service Charges', fmtS(serviceCharges)],
          ['Line 6', 'Federal Income Tax', fmtS(fedTax)],
          ['Line 7', 'Total Disbursements (Lines 5 + 6)', fmtS(totalDisbursements)],
          ['Line 8', 'Remaining Assets On Hand (Line 1 + Line 4 - Line 7)', fmtS(remaining)],
        ],
        totals: { label: 'LINE 8 — REMAINING ASSETS ON HAND', value: fmtS(remaining) },
        colWidths: [15, 60, 25],
        colAlign: ['left', 'left', 'right'],
      },
    ],
  });

  // 3. Part III: Guardian(s) Declaration
  sections.push({
    id: 'part3',
    title: 'Part III — GUARDIAN(S) DECLARATION',
    bookmarkTitle: 'Part III - Guardian Declaration',
    parentBookmark: null,
    level: 1,
    pageBreakBefore: true,
    blocks: [
      {
        type: 'notice',
        tag: 'P',
        text: `Under penalties of perjury, I declare that I have read and examined the foregoing return and that, to the best of my knowledge and belief, it constitutes a full and correct account of all the ward's property of which this guardian has control, and is a complete report of all cash and property transactions and of all receipts and disbursements by me from ${fmtDate(d.periodFrom)} through ${fmtDate(d.periodTo)}.`,
      },
    ],
  });

  // 4. Part IV: Guardian(s) Information
  const guardianList = (d.guardians || []).filter(g => g && g.name);
  const guardianBlocks = guardianList.map((g, i) => {
    const gRole = ['Guardian #1', 'Co-Guardian #2', 'Co-Guardian #3'][i] || `Guardian #${i + 1}`;
    return {
      type: 'signature-block',
      tag: 'Figure',
      role: gRole,
      signerName: g.name || '',
      signature: formatSig(g.name),
      signatureStyle,
      signatureDate: fmtDate(g.signatureDate),
      details: {
        'Phone': g.phone || '',
        'SSN/EIN': g.ssn || '',
        'Email': g.email || '',
        'Mailing Address': `${g.mailingStreet || ''}, ${g.mailingCityStateZip || ''}`.replace(/^, /, ''),
        'Residence Address': `${g.residenceStreet || ''}, ${g.residenceCityStateZip || ''}`.replace(/^, /, ''),
      },
    };
  });

  sections.push({
    id: 'part4',
    title: 'Part IV — GUARDIAN(S) INFORMATION',
    bookmarkTitle: 'Part IV - Guardian Information',
    parentBookmark: null,
    level: 1,
    pageBreakBefore: false,
    blocks: [
      {
        type: 'notice',
        tag: 'P',
        text: 'All guardians of the property must sign and provide the most current address, telephone number, and social security number. Only reports with original signatures will be audited by the Clerk of the Court.',
      },
      ...guardianBlocks,
    ],
  });

  // 5. Part V: Signature of Guardian Attorney
  sections.push({
    id: 'part5',
    title: 'Part V — SIGNATURE OF GUARDIAN ATTORNEY',
    bookmarkTitle: 'Part V - Attorney Signature',
    parentBookmark: null,
    level: 1,
    pageBreakBefore: true,
    blocks: [
      {
        type: 'notice',
        tag: 'P',
        text: `The undersigned Attorney hereby notifies the Court of the filing of the simplified annual accounting of the Guardian ${wardName} for the period ${fmtDate(d.periodFrom)} through ${fmtDate(d.periodTo)}. This simplified annual accounting is the representation of the guardian. The undersigned attorney represents that he/she has examined the contents of the accounting and that it conforms to the requirements of the Florida Guardianship Law and the standards for accountings in ${county} County, Florida.`,
      },
      {
        type: 'signature-block',
        tag: 'Figure',
        role: 'Attorney for Guardian',
        signerName: d.attorney || '',
        signature: formatSig(d.attorney),
        signatureStyle,
        signatureDate: fmtDate(d.attorney_signatureDate),
        details: {
          'Florida Bar #': d.attorney_barNumber || '',
          'Phone': d.attorney_phone || '',
          'Address': `${d.attorney_street || ''}, ${d.attorney_cityStateZip || ''}`.replace(/^, /, ''),
        },
      },
    ],
  });

  // 6. Part VI: Certificate of Service
  const certRecipients = (d.certRecipients || []).filter(r => r && (r.name || r.line2 || r.line3));
  const serviceDateText = fmtDate(d.certServiceDate) || 'the date indicated below';
  const indicatorNote = d.certIndicator ? ` | Indicate if: ${d.certIndicator}` : '';

  sections.push({
    id: 'part6',
    title: 'Part VI — GUARDIAN ATTORNEY CERTIFICATE OF SERVICE',
    bookmarkTitle: 'Part VI - Certificate of Service',
    parentBookmark: null,
    level: 1,
    pageBreakBefore: false,
    blocks: [
      {
        type: 'notice',
        tag: 'P',
        text: `Pursuant to Florida Statute 744.362(1), I hereby certify that a copy of this simplified annual accounting has been furnished on ${serviceDateText}${indicatorNote} to the following persons:`,
      },
      ...(certRecipients.length > 0 ? [
        {
          type: 'table',
          tag: 'Table',
          title: 'Service Recipients',
          headers: ['#', 'Recipient Name', 'Address / Details'],
          rows: certRecipients.map((r, i) => [
            String(i + 1),
            r.name || '',
            `${r.line2 || ''} ${r.line3 || ''}`.trim(),
          ]),
          colWidths: [10, 45, 45],
        }
      ] : [
        {
          type: 'notice',
          tag: 'P',
          text: 'None listed.',
        }
      ]),
      ...(d.certIndicator ? [
        {
          type: 'notice',
          tag: 'P',
          text: `Service delivery method / indicator: ${d.certIndicator}`,
        }
      ] : []),
      {
        type: 'signature-block',
        tag: 'Figure',
        role: 'Attorney for Guardian (Service)',
        signerName: d.attorney || '',
        signature: formatSig(d.attorney),
        signatureStyle,
        signatureDate: fmtDate(d.certAttySignDate),
        details: {
          'Florida Bar #': d.certAttyBarNumber || '',
          'Phone': d.certAttyPhone || '',
          'Address': `${d.certAttyStreet || ''}, ${d.certAttyCityStateZip || ''}`.replace(/^, /, ''),
        },
      },
    ],
  });

  // 7. Part VII: Remuneration (if present)
  const remList = (d.remuneration || []).filter(r => r && (r.guardian || r.type || r.description));
  if (remList.length > 0) {
    sections.push({
      id: 'part7',
      title: 'Part VII — GUARDIAN(S) DECLARATION OF REMUNERATION',
      bookmarkTitle: 'Part VII - Remuneration',
      parentBookmark: null,
      level: 1,
      pageBreakBefore: true,
      blocks: [
        {
          type: 'notice',
          tag: 'P',
          text: 'Per 744.367(3)(a), the annual guardianship report must include a declaration of all remuneration received by the guardian from any source for services rendered to or on behalf of the ward. As used in this paragraph, the term "remuneration" means any payment or other benefit made directly or indirectly, overtly or covertly, or in cash or in kind to the guardian.',
        },
        {
          type: 'table',
          tag: 'Table',
          title: 'Declaration of Remuneration',
          headers: ['#', 'Guardian Name', 'Type', 'Description'],
          rows: remList.map((r, i) => [
            String(i + 1),
            r.guardian || '',
            r.type || '',
            r.description || '',
          ]),
          colWidths: [10, 30, 25, 35],
        },
      ],
    });
  }

  return {
    metadata,
    sections,
  };
}
