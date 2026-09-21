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

// ---------------------------------------------------------------------------------------------------------
// Milestone 63F. Pages the sidebar marks incomplete that the validators cannot fully list.
//
// The sidebar asks "have you finished with this page?"; the export gate asks "does this satisfy the court?",
// and AGENTS.md section 4 lets them differ. On three pages that left the box with a generic sentence and
// nothing to jump to, for two different reasons:
//
//   1. Route ownership. Simplified's period dates are rendered on the Cover AND on Part III, but the one
//      validator message for each is filed under the Cover, so Part III could not explain a mark that
//      depends on them.                                                        -> pageAlsoOwns()
//   2. Sidebar-only rules. Plan - Annual 3G and Plan - Minors Preparer & Attorney have rules the validators
//      do not, so there is no message anywhere to list.                       -> sidebarOnlyWants()
//
// The export is deliberately NOT changed to demand these (option 2 of D13, rejected): the box only tells the
// filer what the sidebar is waiting for. sidebarOnlyWants() is consulted only for a page the sidebar already
// says is incomplete, and lists only what is blank, so it mirrors -- rather than restates -- the rule;
// tests/e2e/sidebar-only-wants.spec.ts proves that doing exactly what it lists turns the mark green.

const PAGE_ALSO_OWNS = {
  simplified: { '/p3': ['periodFrom', 'periodTo'] },
};

/** Field paths a page renders and may explain even though their validator message is routed elsewhere. */
export function pageAlsoOwns(type, route) {
  const owned = PAGE_ALSO_OWNS[type] && PAGE_ALSO_OWNS[type][route];
  return owned ? [...owned] : [];
}

const blank = (value) => value === undefined || value === null || String(value).trim() === '';

/**
 * What a sidebar-only rule still wants, as { label, path } items the guidance box can render as jump links.
 * Empty for every page that has no such rule, and for a page whose rule is already satisfied.
 */
export function sidebarOnlyWants(type, route, data) {
  const d = data || {};
  if (type === 'planAnnual' && route === '/p4') {
    // pa-p4: any benefit answered (eligible or applied for), or "None of the above", or "Other".
    const answered = Object.values(d.benefits || {}).some((b) => b && (b.eligible || b.appliedFor));
    if (answered || d.q3BenefitsNone || d.q3BenefitsOther) return [];
    return [{ label: 'Answer at least one benefit above, or check "None of the above" or "Other"', path: 'q3BenefitsNone' }];
  }
  if (type === 'planMinor' && route === '/p7') {
    // pm-p7: preparer name, attorney name and the attorney's signature date.
    return [
      ['preparer_name', 'Preparer name'],
      ['attorney_name', 'Attorney name'],
      ['attorney_signatureDate', 'Attorney signature date'],
    ].filter(([key]) => blank(d[key])).map(([path, label]) => ({ label, path }));
  }
  return [];
}

if (typeof window !== 'undefined') {
  window.sectionGuidancePolicy = { sectionCheckKey, isSectionIncomplete, blocksNext, guidanceAdvice, pageAlsoOwns, sidebarOnlyWants };
}
