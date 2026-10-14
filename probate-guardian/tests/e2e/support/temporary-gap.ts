// TEST-REVIEW.md Delivery 2 (T6): what a deliberately deferred test must
// name before it may skip -- the proposal whose acceptance criteria un-skip
// it, who owns getting there, and the date by which it must be back. One
// check, used twice: at run time by skipTemporaryGap() (support/
// target-profile.ts), where a lapsed or unreferenced gap fails the test it
// would have hidden, and statically by tests/unit/skip-classification-
// audit.spec.js over every call's literal arguments. No Playwright import
// here, so the unit audit can load it.

export type TemporaryGap = { proposal: string; owner: string; until: string };

export const PROPOSAL_PATTERN = /^MILESTONE-\d+[A-Z]?-PROPOSAL\.md$/;

/**
 * Null when the gap is well-formed and current; otherwise one sentence
 * saying what is wrong. `today` is an ISO date (YYYY-MM-DD); `exists`
 * answers whether a repository-root file is there.
 */
export function temporaryGapProblem(gap: unknown, today: string, exists: (file: string) => boolean): string | null {
  if (!gap || typeof gap !== 'object') return 'the gap must be an object { proposal, owner, until }';
  const { proposal, owner, until } = gap as Record<string, unknown>;
  if (typeof proposal !== 'string' || !PROPOSAL_PATTERN.test(proposal)) return 'proposal must name a MILESTONE-N-PROPOSAL.md';
  if (!exists(proposal)) return `${proposal} is not in the repository`;
  if (typeof owner !== 'string' || !owner.trim()) return 'owner must name who closes the gap';
  if (typeof until !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(until) || Number.isNaN(Date.parse(until))) return 'until must be a date, YYYY-MM-DD';
  if (until < today) return `the gap lapsed on ${until}; un-skip the case or renew the date with a reason`;
  return null;
}

/** Today as an ISO date in local time. */
export function isoToday(now: Date = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}
