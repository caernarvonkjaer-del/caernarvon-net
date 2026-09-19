// Identifying a Schedule B-4 bank account.
//
// Every output has to name the same account the same way. The workbook prints
// the bank name and account number at the head of that account's register
// block; the PDF heads that account's register with the same thing; the editor
// names it in the picker and in the confirmation before it is removed. When
// those disagree, a filer reconciling a withheld workbook against the PDF
// cannot tell whether two names are two accounts or one -- which is the whole
// point of attribution.
//
// So the naming rules live here, once, and are format-agnostic: this module
// knows nothing about ExcelJS or jsPDF and is used from both.
//
// Two forms, because they are read in different places:
//   b4AccountLabel   -- compact, last four digits only. For prose that runs
//                       inline, chiefly the messages explaining why an export
//                       was withheld.
//   b4AccountHeading -- the full account number. For anything that stands as a
//                       heading over that account's own rows, where a reader
//                       is matching it against a bank statement.
//
// Both fall back to the same positional name, so an account the filer has not
// named yet reads as "Account 3" everywhere rather than three different ways.

const str = (v) => String(v ?? '').trim();

/** The positional fallback for an account with neither a name nor a number. */
function positionalName(index) {
  return `Account ${Number.isFinite(index) ? index + 1 : 1}`;
}

/**
 * A compact name, masking all but the last four digits of the account number.
 * Suited to inline prose -- "Bay Bank …2345 has 200 disbursements; its section
 * of the court's workbook holds 160."
 */
export function b4AccountLabel(account, index) {
  const bank = str(account?.bankName);
  const number = str(account?.accountNumber);
  const tail = number ? `…${number.slice(-4)}` : '';
  if (bank && tail) return `${bank} ${tail}`;
  if (bank) return bank;
  if (number) return `Account ${tail}`;
  return positionalName(index);
}

/**
 * The full name, with the account number unmasked, for a heading that sits
 * over that account's own rows.
 *
 * Unmasked deliberately. This is what the court's own workbook prints in the
 * register block header (`ACCOUNT NUMBER #:`), and the PDF register is the
 * filing the court reads when the workbook is withheld -- masking it there
 * would make the two documents disagree and leave the reviewer unable to tie a
 * disbursement to a bank statement.
 */
export function b4AccountHeading(account, index) {
  const bank = str(account?.bankName);
  const number = str(account?.accountNumber);
  if (bank && number) return `${bank} — Account No. ${number}`;
  if (bank) return bank;
  if (number) return `Account No. ${number}`;
  return positionalName(index);
}

/**
 * A permanent, opaque id for a bank account.
 *
 * Never the array index, the bank name or the account number: a disbursement
 * points at this id, so deriving it from anything the filer can edit would
 * orphan that account's disbursements the moment they corrected a typo.
 * Mirrors createSupplementalFileId()'s shape and its fallback for browsers
 * without crypto.randomUUID().
 */
export function createBankAccountId() {
  if (globalThis.crypto?.randomUUID) return `bank-${crypto.randomUUID()}`;
  return `bank-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
