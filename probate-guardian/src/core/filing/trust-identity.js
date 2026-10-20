// Milestone 74N (decisions 74N-1 and 74N-3, the requester, 2026-10-06; QA
// report BUG-08): a Trust Accounting names the trust it reports on, one trust
// each, as the Clerk's Annual workbook says: "If the answers to questions #1
// and #2 for Each trust are both 'YES' you MUST file a separate trust
// accounting for Each trust" (PART VIII). The details sit in a "This
// accounting reports on" block on the Cover and print under the caption; the
// workbook has no cell for them, which the export says. Made from an Annual
// with New Filing from Existing, the filer picks one of its Part VIII trusts
// created after the guardianship began, and that trust's details fill the
// block; the trustee-is-guardian answer and the date funds were received,
// which Part VIII doesn't ask, start blank. A first trust accounting's
// Starting Balance stays blank, the work slip quoted (decision 74N-2).

// Milestone 76H item 2: whether a Part VIII trust card describes a trust --
// any answer on it besides the first card's "does the ward have trusts?". The
// export checks ask each such card for its name, and the PDF prints each one
// under its card's number; one rule for both. A card with a trustee, an
// account, a type and $50,000 but no name passed export and dropped out of
// the PDF, which printed only named trusts.
export function describesATrust(t) {
  return Object.entries(t || {}).some(([key, value]) => key !== 'hasTrust' && value !== '' && value != null);
}

/** The block's fields, in the order the Cover and the PDF show them. */
export const TRUST_INFO_FIELDS = Object.freeze(['name', 'trustee', 'trusteeIsGuardian', 'dateCreated', 'dateFunded', 'accountNo']);

/** A blank block; `trusteeIsGuardian` is tri-state ('' / 'Yes' / 'No', AGENTS.md section 4). */
export function emptyTrustInfo() {
  return { name: '', trustee: '', trusteeIsGuardian: '', dateCreated: '', dateFunded: '', accountNo: '' };
}

const text = (v) => String(v ?? '').trim();

/**
 * An Annual-family filing's Part VIII trusts that need a trust accounting of
 * their own: question #1 answered Yes (it is asked once, on the first trust),
 * the trust's own question #2 answered Yes, and the trust named.
 * @param {Record<string, any> | null | undefined} filing
 * @returns {Array<{ trust: Record<string, any>, index: number }>}
 */
export function qualifyingTrusts(filing) {
  const trusts = Array.isArray(filing?.trusts) ? filing.trusts : [];
  if (trusts[0]?.hasTrust !== 'Yes') return [];
  return trusts.map((trust, index) => ({ trust, index }))
    .filter(({ trust }) => trust && trust.createdAfterGID === 'Yes' && text(trust.name));
}

/**
 * The block a Trust Accounting made from `source` starts with: the details of
 * its Part VIII trust at `index`, when that trust qualifies; blank otherwise.
 * @param {Record<string, any> | null | undefined} source
 * @param {number | string | null | undefined} index
 */
export function trustInfoFrom(source, index) {
  const block = emptyTrustInfo();
  const pick = index === '' || index == null ? null : qualifyingTrusts(source).find((q) => q.index === Number(index));
  if (!pick) return block;
  const t = pick.trust;
  return { ...block, name: text(t.name), trustee: text(t.trustee), dateCreated: text(t.dateCreated), accountNo: text(t.accountNo) };
}

/** Whether a filing type is the Trust Accounting, the one filing that carries the block. */
export const isTrustAccountingType = (type) => type === 'trustAccounting';

/** Whether a filing's block holds anything. */
export function trustInfoStarted(filing) {
  return TRUST_INFO_FIELDS.some((k) => text(filing?.trustInfo?.[k]));
}
