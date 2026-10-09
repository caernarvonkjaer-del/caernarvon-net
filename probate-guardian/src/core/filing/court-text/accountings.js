// Milestone 73N part 2: the accountings' sworn and certification statements
// as the Clerk's own workbooks word them (templates/annual-template.js and
// simplified-template.js, read with an XML parser; the cells are named
// below). Read by both the screen and the PDF. The PDF had shortened them:
// the Annual family's receipts certification dropped "and will upon request
// make available for inspection as the court may order", the guardian's
// declaration stopped at the period, and the attorney statement, on the
// Annual family and the Simplified, dropped "I have not audited the
// accompanying guardianship accounting". tests/unit/court-text-parity.spec.js
// reads the workbooks and compares.
//
// Three plain typing errors in the workbooks are not copied, and the parity
// test names each: "UNDER PENALITIES" (PENALTIES), "l have" with a lower-case
// L (I have), and "F.S.744.3678" without its space.

/** The Annual family's receipts certification ('PART II, III'!B8). */
export const ANNUAL_RECEIPTS_CERTIFICATION = 'The undersigned guardian certifies that said guardian has obtained a receipt or canceled check for all expenditures and disbursements made on behalf of the ward, which said guardian will preserve along with other substantiating papers for a three (3) year period after discharge and will upon request make available for inspection as the court may order. (As per F.S. 744.3678 (3).)';

/**
 * The Annual family's guardian declaration ('PART II, III'!B20, the period
 * from B21-B22, B23), around the period the filer's dates fill.
 */
export const ANNUAL_DECLARATION = Object.freeze({
  before: "UNDER PENALTIES OF PERJURY, I declare that I have read and examined the foregoing return and that, to the best of my knowledge and belief, it constitutes a full and correct account of all the ward's property of which this guardian has control, and is a complete report of all cash and property transactions and of all receipts and any disbursements by me from",
  after: "and includes a statement of the ward's assets at the close of said period. I also certify that any and all annual investigatory forms and fees have been filed and paid, unless exempt by Florida Statute or Court Order.",
});

/** The declaration with its period: "... by me from 01/01/2026 through 12/31/2026 and includes ...". */
export const annualDeclaration = (from, to) => `${ANNUAL_DECLARATION.before} ${from} through ${to} ${ANNUAL_DECLARATION.after}`;

/** In the attorney statement, after "... is the representation of the guardian." ('PART IV, V'!B27; 'PARTS V, VI'!B13). */
export const ATTORNEY_NOT_AUDITED = 'I have not audited the accompanying guardianship accounting.';
