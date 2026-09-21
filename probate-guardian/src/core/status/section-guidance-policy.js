// Milestone 63A. Three questions that one function used to answer as one.
//
// On a Guardian Inventory the sidebar marked six pages incomplete -- Cover and
// D-1..D-5 -- and counted them in "16 of 17 sections complete", but the pages
// never said what was missing. The yellow "Complete these items" box was drawn
// only when the page's Next button was gated, and the gate looked pages up in
// SCHEDULE_NAV_KEYS, the 11 schedule pages: narrower than the sidebar's 17. The
// function that decided this existed twice (legacy-app.js, for the live patch
// after every edit; the Guardian module, for the first render), so a fix to one
// copy would have shown the box on page load and wiped it on the first keystroke.
//
// The questions are separate, and each is answered once, here:
//
//   1. Is this section incomplete?      isSectionIncomplete()
//        -> the sidebar mark, the progress card, and whether to EXPLAIN. Read from
//           the same completeness map the sidebar reads, for every filing type.
//   2. Does incompleteness block Next?  blocksNext()
//        -> a per-type policy. Every type except the Guardian Inventory gates
//           every page it marks. The Guardian Inventory gates only its 11
//           schedule pages and explains, without blocking, on Cover and
//           D-1..D-5 (D1, decided 2026-09-21): a filer waiting on the bond
//           paperwork can still page forward.
//   3. What should the advice say?      guidanceAdvice()
//        -> "add an item or tick the none box" is right only on a page that has
//           that checkbox; on a Cover, signature or bond page it told the filer
//           to tick a box that is not there (D2, decided: all filing types).
//
// Pure functions, so the classic-script live patch (legacy-app.js) and the
// Guardian module's first render read the same rule. Bridged on `window` for the
// classic script, the same way service-recipients.js is.

export const VERIFY_NONE_ADVICE = 'Add at least one item, or check the box verifying there are none, before continuing.';
export const REQUIRED_ITEMS_ADVICE = 'Complete the required items on this page before continuing.';

// computeNavChecks() prefixes every non-Guardian type's keys with its own.
const PREFIX = {
  simplified: 's-',
  annual: 'a-',
  finalAccounting: 'a-',
  trustAccounting: 'a-',
  planInitial: 'pi-',
  planAnnual: 'pa-',
  planMinor: 'pm-',
  planSimplified: 'ps-',
};

// Annual's Cover page is labelled "Part I", not "Cover", so computeNavChecks()
// stores it as 'a-p1'. Without this override the lookup for these three types'
// Cover route always misses and reports the Cover complete however many required
// fields are blank. (finalAccounting and trustAccounting are formEngine() aliases
// of the same branch.)
const COVER_KEY_OVERRIDE = { annual: 'p1', finalAccounting: 'p1', trustAccounting: 'p1' };

/**
 * The key a route has in computeNavChecks().checks, or null for an unknown type or
 * an empty route. A route with no mark (Summary, Print) still gets a key; it just
 * is not in `checks`, so isSectionIncomplete() reports it complete.
 */
export function sectionCheckKey(type, route) {
  if (!route) return null;
  const key = route.startsWith('/') ? route.slice(1) : route;
  if (type === 'guardian') return key === '' ? 'cover' : key;
  const prefix = PREFIX[type];
  if (!prefix) return null;
  return prefix + (key === '' ? (COVER_KEY_OVERRIDE[type] || 'cover') : key);
}

/** Question 1. True only for a key that has a mark and whose mark says incomplete. */
export function isSectionIncomplete(checks, checkKey) {
  return !!checks && checkKey != null
    && Object.prototype.hasOwnProperty.call(checks, checkKey)
    && !checks[checkKey];
}

/**
 * Question 2. `guardianScheduleKeys` is the Guardian Inventory's 11 schedule keys
 * (SCHEDULE_NAV_KEYS in legacy-app.js), passed in rather than restated here so
 * there is still exactly one list of them.
 */
export function blocksNext({ type, checkKey, incomplete, guardianScheduleKeys }) {
  if (!incomplete) return false;
  if (type === 'guardian') return (guardianScheduleKeys || []).includes(checkKey);
  return true;
}

/** Question 3. */
export function guidanceAdvice({ hasVerifyNoneBox }) {
  return hasVerifyNoneBox ? VERIFY_NONE_ADVICE : REQUIRED_ITEMS_ADVICE;
}

if (typeof window !== 'undefined') {
  window.sectionGuidancePolicy = { sectionCheckKey, isSectionIncomplete, blocksNext, guidanceAdvice };
}
