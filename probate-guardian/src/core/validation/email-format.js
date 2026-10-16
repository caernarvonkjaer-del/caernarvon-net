// Milestone 74G (decision 74G-5, the requester, 2026-10-06): the one e-mail
// address pattern -- a name, an "@" and a domain with a dot. Moved from the
// feedback form (feedback-message.js imports it back). Rule 2.515(c) asks a
// signature block for the signer's "e-mail address for service of court
// documents" and names no format; this checks an address's shape and nothing
// more: "rnguyen@" and "rnguyen@firm" fail, "rnguyen@firm.com" passes.
export const EMAIL = /^[^\s@,?&]+@[^\s@,?&]+\.[^\s@,?&]+$/;

export const EMAIL_MESSAGE = 'Enter a complete e-mail address, such as name@example.com';

/** The message for a box holding text that isn't an e-mail address; '' for a blank box or a good address. */
export function emailProblem(value) {
  const text = String(value ?? '').trim();
  return text && !EMAIL.test(text) ? EMAIL_MESSAGE : '';
}

/** Whether a field path names an e-mail box ("attorney.email", "attorney_secondary_email", "guardians.0.email"). */
export function isEmailPath(path) {
  return /e-?mail$/i.test(String(path || '').split('.').pop() || '');
}
