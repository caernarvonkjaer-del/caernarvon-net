// Structured intermediate representation for Simplified Annual Accounting PDF generation.
// Maps window.D into the unified, accessible court document model.

import { yesNoText } from '../../core/form/form-contract.js';
import { resolveDescriptorForInventoryType } from '../../core/filing/filing-descriptor.js';
import { composePdfAddressLines } from '../../core/pdf/address-format.js';
import { maskSSN } from '../../core/pdf/ssn-format.js';
import { REMUNERATION_DECLARATION, REMUNERATION_NONE_REPORTED } from '../../core/filing/statutory-text.js';
import { presentAmount } from '../../core/form/amount-codec.js';
import { dateOrLine, displayDate } from '../../core/form/date-parser.js';
import { isUnrepresented, resolveServiceCertifier } from '../../core/filing/unrepresented-filing.js';
import { methodOfServiceLine } from '../../core/filing/service-method.js';
import { resolveSignatureModes } from '../../core/pdf/signature-modes.js';
import { rowStarted } from '../../core/validation/row-started.js';
import { recipientAddressLines, recipientListed } from '../../core/filing/recipient-shape.js';
import { noRecipientsLine } from '../../core/validation/service-recipients.js';
import { ATTORNEY_NOT_AUDITED } from '../../core/filing/court-text/accountings.js';

export function buildSimplifiedAccountingModel(D, options = {}) {
  const d = D || {};
  const wardName = (d.wardName || 'Ward').trim();
  const caseNumber = (d.caseNumber || '').trim();
  // Milestone 40C-A item 6: output must never invent a county. A blank one
  // yields no court caption at all (see core/pdf/circuit-lookup.js); export is
  // already blocked by this form's County validation.
  const county = d.county || '';
  const printDate = options.printDate || new Date().toISOString().slice(0, 10);
  const signatureStyle = options.signatureStyle || d.signatureStyle || 'typed';
  const descriptor = resolveDescriptorForInventoryType('simplified');

  // Milestone 71E: formatMoney() (src/core/format/money.js) -- the Clerk's workbook's own rounding.
  // Milestone 73H (decision 73H-1): $5,000.00 and ($5,000.00), as on every
  // screen and PDF (presentAmount()); a negative printed $-5,000.00 here.
  // Disbursements stay positive: the Simplified workbook holds them so
  // (PARTS I, II H29 =SUM(G27:G28)).
  const fmtS = presentAmount;

  // Milestone 73H: a date as every screen and PDF shows it (displayDate());
  // in a sentence or a labelled field a blank date prints a line to write it
  // on (dateOrLine(), decision 73H-2). A signature block's stays blank (73H-N2).
  const fmtDate = displayDate;

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
    author: 'Guardian Forms',
    creator: 'Guardian Forms',
    formName: 'SIMPLIFIED ANNUAL ACCOUNTING',
    formSubtitle: 'Simplified Annual Accounting',
    keywords: 'Florida, Probate, Guardianship, Simplified Annual Accounting',
    wardName,
    caseNumber,
    ucn: (d.ucn || '').trim(),
    county,
    signatureStyle,
  };
  metadata.title = `${wardName} - ${caseNumber} - ${descriptor.displayName} - Printed ${printDate}`;
  metadata.subject = `${descriptor.displayName} of Guardian of the Property`;
  metadata.formName = descriptor.documentTitle;
  metadata.formSubtitle = descriptor.displayName;
  metadata.keywords = `Florida, Probate, Guardianship, ${descriptor.displayName}`;
  metadata.filingId = descriptor.id;

  const sections = [];

  // 1. Part I: Required Information
  const caseInfoItems = [
    { label: 'Name of Ward', value: wardName },
    { label: 'Case Number', value: caseNumber },
    { label: 'Social Security Number', value: maskSSN(d.ssn || '') },
    { label: 'Accounting Period', value: `From: ${dateOrLine(d.periodFrom)}  To: ${dateOrLine(d.periodTo)}` },
    { label: 'Guardian', value: d.guardian || '' },
    { label: 'Attorney for Guardian', value: d.attorney || '' },
    // Milestone 73B: a blank prints blank -- it used to print "Plenary".
    { label: 'Type of Guardianship', value: d.typeOfGuardianship || '' },
    { label: 'County', value: county },
    { label: 'Amended Form?', value: yesNoText(d.amendedForm, '') },
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
        text: `Under penalties of perjury, I declare that I have read and examined the foregoing return and that, to the best of my knowledge and belief, it constitutes a full and correct account of all the ward's property of which this guardian has control, and is a complete report of all cash and property transactions and of all receipts and disbursements by me from ${dateOrLine(d.periodFrom)} through ${dateOrLine(d.periodTo)}.`,
      },
    ],
  });

  // 4. Part IV: Guardian(s) Information
  // Milestone 74B: Guardian #1's block always prints, and each co-guardian card the
  // filer started (rowStarted(): a stamp or a signature choice counts) prints in its
  // own card's place, labelled by its card. This kept only guardians with a name
  // and numbered the blocks by position, so a stamped co-guardian was left out and,
  // after an override, a nameless Guardian #1 moved the next card up into its label.
  const guardianCards = (d.guardians || []).map((g, i) => [g || {}, i]).filter(([g, i]) => i === 0 || rowStarted(g));
  const guardianBlocks = guardianCards.map(([g, i]) => {
    const gRole = i === 0 ? 'Guardian #1' : `Co-Guardian #${i + 1}`;
    return {
      type: 'signature-block',
      tag: 'Part',
      role: gRole,
      signerRole: 'guardian',
      signerName: g.name || '',
      signature: formatSig(g.name),
      signatureStyle,
      signatureDate: fmtDate(g.signatureDate),
      // Milestone 39-C
      signatureState: g.signatureState || '',
      signatureImage: g.signatureImage || '',
      // Milestone 60F: `fields`, not the legacy `details` stack -- see the
      // matching block in annual-accounting/pdf-model.js for the grouping rule.
      fields: [
        [{ label: 'Phone', value: g.phone || '' }, { label: 'SSN/EIN', value: maskSSN(g.ssn || '') }],
        [{ label: 'Email', value: g.email || '' }],
        [{ label: 'Mailing Address', value: composePdfAddressLines(g.mailingStreet, g.mailingCityStateZip) }],
        [{ label: 'Residence Address', value: composePdfAddressLines(g.residenceStreet, g.residenceCityStateZip) }],
      ],
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
  // Milestone 71B: section 744.3679(3) -- no attorney is needed to file this
  // accounting. Milestone 72D: Part V is printed either way, blank with no
  // attorney, as the Clerk's workbook leaves it (71B's one app-written line
  // in its place is gone). `unrepresented` still decides who signs Part VI.
  const unrepresented = isUnrepresented(d, 'simplified');
  sections.push({
    id: 'part5',
    title: 'Part V — SIGNATURE OF GUARDIAN ATTORNEY',
    bookmarkTitle: 'Part V - Attorney Signature',
    parentBookmark: null,
    level: 1,
    pageBreakBefore: false,
    blocks: [
      {
        type: 'notice',
        tag: 'P',
        text: `The undersigned Attorney hereby notifies the Court of the filing of the simplified annual accounting of the Guardian ${wardName} for the period ${dateOrLine(d.periodFrom)} through ${dateOrLine(d.periodTo)}. This simplified annual accounting is the representation of the guardian. ${ATTORNEY_NOT_AUDITED} The undersigned attorney represents that he/she has examined the contents of the accounting and that it conforms to the requirements of the Florida Guardianship Law and the standards for accountings in ${county} County, Florida.`,
      },
      {
        type: 'signature-block',
        tag: 'Part',
        role: 'Attorney for Guardian',
        signerRole: 'attorney',
        signerName: d.attorney || '',
        signature: formatSig(d.attorney),
        signatureStyle,
        signatureDate: fmtDate(d.attorney_signatureDate),
        // Milestone 39-C
        signatureState: d.attorney_signatureState || '',
        signatureImage: d.attorney_signatureImage || '',
        fields: [
          [{ label: 'Florida Bar #', value: d.attorney_barNumber || '' }, { label: 'Phone', value: d.attorney_phone || '' }],
          [{ label: 'Primary Email', value: d.attorney_email || '' }, { label: 'Secondary Email', value: d.attorney_secondaryEmail || '' }],
          [{ label: 'Address', value: composePdfAddressLines(d.attorney_street, d.attorney_cityStateZip) }],
        ],
      },
    ],
  });

  // 6. Part VI: Certificate of Service
  // line4 belongs in this test as much as the others. Omitting it dropped a
  // recipient whose only populated field was line4 out of the certificate of
  // service entirely -- no row at all, rather than a truncated address.
  // Annual Accounting's equivalent filter already included it.
  const certRecipients = (d.certRecipients || []).filter(recipientListed);

  // Milestone 71B: with no attorney, the guardian who served the copies signs,
  // with the name and contact details from their Part IV card.
  const certifier = unrepresented ? resolveServiceCertifier(d) : null;
  const cg = certifier ? certifier.guardian : {};
  const serviceSigner = unrepresented ? {
    type: 'signature-block',
    tag: 'Part',
    role: 'Guardian (Service)',
    signerRole: 'guardian',
    signerName: certifier ? certifier.name : '',
    signature: formatSig(certifier ? certifier.name : ''),
    signatureStyle,
    signatureDate: fmtDate(d.certGuardianSignDate),
    signatureState: d.certGuardianSignatureState || '',
    signatureImage: d.certGuardianSignatureImage || '',
    fields: [
      [{ label: 'Phone', value: cg.phone || '' }, { label: 'Email', value: cg.email || '' }],
      [{ label: 'Address', value: composePdfAddressLines(cg.mailingStreet, cg.mailingCityStateZip) }],
    ],
  } : null;

  sections.push({
    id: 'part6',
    title: unrepresented ? 'Part VI — CERTIFICATE OF SERVICE' : 'Part VI — GUARDIAN ATTORNEY CERTIFICATE OF SERVICE',
    bookmarkTitle: 'Part VI - Certificate of Service',
    parentBookmark: null,
    level: 1,
    pageBreakBefore: false,
    blocks: [
      {
        type: 'notice',
        tag: 'P',
        text: 'Pursuant to Florida Statute 744.362(1), I hereby certify that a copy of this simplified annual accounting has been furnished to:',
      },
      ...(certRecipients.length > 0 && d.certNoRecipients !== 'Yes' ? [
        {
          type: 'table',
          tag: 'Table',
          title: 'Service Recipients',
          keepTitleWithTable: true, // Milestone 73N part 1 (73O-6): the title stays with the table.
          headers: ['#', 'Recipient Name', 'Address / Details'],
          rows: certRecipients.map((r, i) => [
            String(i + 1),
            r.name || '',
            // Discrete lines, not a joined string -- see the Annual Accounting
            // model's matching comment. This also restores line4, which the
            // old space-join omitted outright: any recipient needing a fourth
            // address line had it silently missing from the filed document.
            recipientAddressLines(r),
          ]),
          colWidths: [10, 45, 45],
        }
      ] : [
        {
          // Milestone 74F: one wording on all seven certificates.
          type: 'notice',
          tag: 'P',
          text: noRecipientsLine(d.certNoRecipients),
        }
      ]),
      // Milestone 72G: the method on its own line (omitted when none is
      // entered), no longer passed off as "Indicate if:"; the ward's status
      // prints as the Inventory's does.
      {
        type: 'notice',
        tag: 'P',
        text: `on this date: ${fmtDate(d.certServiceDate) || 'the date indicated below'}`,
      },
      ...(methodOfServiceLine(d.certIndicator) ? [{ type: 'notice', tag: 'P', text: methodOfServiceLine(d.certIndicator) }] : []),
      { type: 'notice', tag: 'P', text: `Indicate if Ward is: ${d.certWardStatus || '—'}` },
      serviceSigner || {
        type: 'signature-block',
        tag: 'Part',
        role: 'Attorney for Guardian (Service)',
        signerRole: 'attorney',
        signerName: d.attorney || '',
        signature: formatSig(d.attorney),
        signatureStyle,
        signatureDate: fmtDate(d.certAttySignDate),
        // Milestone 39-C
        signatureState: d.certAttySignatureState || '',
        signatureImage: d.certAttySignatureImage || '',
        fields: [
          // Milestone 72H: Part V's attorney, as the Clerk's workbook links
          // it; the details once typed on Part VI are no longer printed.
          [{ label: 'Florida Bar #', value: d.attorney_barNumber || '' }, { label: 'Phone', value: d.attorney_phone || '' }],
          [{ label: 'Primary Email', value: d.attorney_email || '' }, { label: 'Secondary Email', value: d.attorney_secondaryEmail || '' }],
          [{ label: 'Address', value: composePdfAddressLines(d.attorney_street, d.attorney_cityStateZip) }],
        ],
      },
    ],
  });

  // 7. Part VII: Remuneration.
  //
  // Milestone 60J: this prints on EVERY Simplified filing, not only when there
  // are entries -- the same fix Milestone 58D made for Annual's Part XI, which
  // nobody had checked applied here too. 744.367(3)(a) requires the report to
  // INCLUDE a declaration of remuneration, and a part that silently vanishes
  // is not a declaration: a reader cannot tell a guardian who received nothing
  // from a form that never asked. With no entries it carries the statutory
  // paragraph and an explicit statement that none was received, which is what
  // the filer affirmed to get here (export is blocked until Part VII is
  // answered -- see validateSimplified()).
  //
  // Milestone 60G: `amount` reaches the filed document. The filter includes it
  // for the same reason the Annual filter does -- a payment with no type typed
  // beside it is still a disclosable benefit, and dropping the row would file
  // a declaration that omits it.
  const remList = (d.remuneration || []).filter(r => r && (r.guardian || r.type || r.description || r.amount));
  const remDeclaredNone = !!(d.scheduleNoItems && d.scheduleNoItems.remuneration);
  if (remList.length > 0 || remDeclaredNone) {
    sections.push({
      id: 'part7',
      title: 'Part VII — GUARDIAN(S) DECLARATION OF REMUNERATION',
      bookmarkTitle: 'Part VII - Remuneration',
      parentBookmark: null,
      level: 1,
      pageBreakBefore: false,
      blocks: [
        {
          type: 'notice',
          tag: 'P',
          text: `Per s. 744.367(3)(a), Florida Statutes: ${REMUNERATION_DECLARATION}`,
        },
        remList.length > 0 ? {
          type: 'table',
          tag: 'Table',
          title: 'Declaration of Remuneration',
          headers: ['#', 'Guardian Name', 'Type', 'Description', 'Amount'],
          rows: remList.map((r, i) => [
            String(i + 1),
            r.guardian || '',
            r.type || '',
            r.description || '',
            r.amount === '' || r.amount == null ? '' : fmtS(r.amount),
          ]),
          colWidths: [6, 22, 18, 38, 16],
          colAlign: ['center', 'left', 'left', 'left', 'right'],
        } : {
          type: 'notice',
          tag: 'P',
          title: 'Declaration of Remuneration',
          text: REMUNERATION_NONE_REPORTED,
        },
      ],
    });
  }

  // Milestone 73A: each signature block's print mode, from its signer's role
  // and the year's signature policy (src/core/pdf/signature-modes.js).
  return resolveSignatureModes({ metadata, sections }, d);
}
