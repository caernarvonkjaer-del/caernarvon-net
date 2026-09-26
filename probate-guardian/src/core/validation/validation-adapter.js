// @ts-nocheck -- pulled into tsconfig.json's checked program only
// transitively (readiness-config.js -> readiness-card.js -> router.js, an
// included file). This file itself was never written with JSDoc types and
// isn't part of the deliberate check:types surface (AGENTS.md §1) -- opting
// out documents that honestly instead of inventing types nobody asked for.
import { getActiveInventoryType } from '../state.js';

// Milestone 24: Structured Validation Error Adapter & Resilient Jump Link Handler

const LEGACY_ROUTE_MAP = {
  // Guardian Inventory
  'cover': '/',
  'd-1': '/d1',
  'd-2': '/d2',
  'd-3': '/d3',
  'd-4': '/d4',
  'd-5': '/d5',
  'a-1': '/a1',
  'a-2': '/a2',
  'b-1': '/b1',
  'b-2': '/b2',
  'b-3': '/b3',
  'b-4': '/b4',
  'c-1': '/c1',
  'c-2': '/c2',
  'c-3': '/c3',
  'c-4': '/c4',
  'd-1-prop': '/d1p',
  'd-2-notes': '/d2n',
  'd-3-other': '/d3o',
  'd-4-restr': '/d4r',
  'd-5-liab': '/d5l',
  'e-1': '/e1',
  'f-1': '/f1',
  'f-2': '/f2',
  // Annual / Simplified / Plans
  'part 1': '/',
  'part 2': '/p2',
  'part 3': '/p3',
  'part 4': '/p4',
  'part 5': '/p5',
  'part 6': '/p6',
  'part 7': '/p7',
  'part 8': '/p8',
  'part 9': '/p9',
  'part 10': '/p10',
  'part 11': '/p11',
};

// Milestone 33 follow-up: the four Plan types validate against narrative,
// per-type-numbered headings ("1. Residences", "5–7. Skills & Rights", ...)
// with no shared convention a regex can generalize (unlike Guardian/Annual/
// Simplified's letter-dash-number and Roman-numeral "Part N" sections,
// already handled correctly by legacy-app.js's errorRoute() -- see
// resolveRouteFromSection() below). Some labels are also reused verbatim
// across types for different pages -- bare "Signatures" alone resolves to
// /p11 for Plan Annual, /p9 for Plan Initial, and /p3 for Plan Simplified --
// so lookup must be scoped by filing type, and by exact match (not prefix):
// every row-indexed detail in these validators lives after the " — " split,
// never in the section prefix itself, so there's no case needing prefix
// matching, and exact match is strictly safer given the "Signatures"
// collision. Keys are lowercased exactly as each validate*() function
// writes them (verified against src/features/plan-*/index.js directly).
// planAnnual's own /p4 ("3G. Insurance & Benefits") and planMinor's /p2
// ("2. Prior Residences") have no validator coverage at all today -- a
// separate, pre-existing gap, not something this map should paper over.
const PLAN_SECTION_ROUTE_MAPS = {
  planAnnual: {
    'cover': '/',
    '1. residences': '/p2',
    '2–3. residence & care': '/p3',
    '2-3. residence & care': '/p3',
    '3g. insurance & benefits': '/p4',
    '4. medical treatment': '/p5',
    '5–7. skills & rights': '/p6',
    '5-7. skills & rights': '/p6',
    '8. daily living': '/p7',
    '9. disabilities & devices': '/p8',
    '10. advance directives': '/p9',
    '11. remuneration': '/p10',
    'signatures': '/p11',
  },
  planInitial: {
    'cover': '/',
    '2–3. setting & medical care': '/p2',
    '2-3. setting & medical care': '/p2',
    '4–5. mental health & personal care': '/p3',
    '4-5. mental health & personal care': '/p3',
    '6–7. socialization & benefits': '/p4',
    '6-7. socialization & benefits': '/p4',
    '9. examining providers': '/p5',
    '10a. daily living': '/p6',
    '10b–d. disabilities & devices': '/p7',
    '10b-d. disabilities & devices': '/p7',
    '11. advance directives': '/p8',
    'signatures': '/p9',
    'attorney certification': '/p10',
  },
  planMinor: {
    'cover': '/',
    '2. prior residences': '/p2',
    '3. treatment providers': '/p3',
    '4. medical services': '/p4',
    '5. education & social development': '/p5',
    'guardian signatures': '/p6',
    'preparer & attorney': '/p7',
  },
  planSimplified: {
    'cover': '/',
    'the plan': '/p2',
    'signatures': '/p3',
  },
};

/**
 * Resolves a route from a section prefix or legacy string error message.
 *
 * Resolution order: (1) legacy-app.js's own errorRoute() -- a regex-based
 * resolver, not a hardcoded table, that already correctly drives Print
 * Preview's "Go to section" links and computeNavChecks()'s guardian branch
 * for every Guardian/Annual/Simplified section label (Cover, Schedule X[-N],
 * guardian's letter-dash-number sections, Roman-numeral "Part N" / combined
 * "Parts VI & VII"). legacy-app.js loads as a classic script before the
 * ES-module bootstrap (index.html's script order), so window.errorRoute is
 * always defined by the time this runs -- reusing it here is the same
 * single-source-of-truth approach this suite already uses elsewhere (e.g.
 * crossCheckNavAndSummaryStatus compares against the real
 * window.computeNavChecks() rather than a second, parallel implementation).
 * (2) the Plan-type map above, for the four Plan types' narrative headings
 * errorRoute() can't generalize. (3) today's original table + substring
 * fallback, unchanged, for backward compatibility when filingType is
 * omitted or unrecognized.
 */
export function resolveRouteFromSection(sectionStr, filingType) {
  if (!sectionStr) return '/';
  const clean = String(sectionStr).trim();
  const type = filingType || getActiveInventoryType();
  if (typeof window !== 'undefined' && typeof window.errorRoute === 'function') {
    const viaLegacy = window.errorRoute(clean, type);
    if (viaLegacy) return viaLegacy;
  }
  const planMap = type ? PLAN_SECTION_ROUTE_MAPS[type] : null;
  if (planMap) {
    const hit = planMap[clean.toLowerCase()] || planMap[clean.toLowerCase().replace(/[\u2013\u2014]/g, '-')];
    if (hit) return hit;
  }
  const lower = clean.toLowerCase();
  for (const [prefix, route] of Object.entries(LEGACY_ROUTE_MAP)) {
    if (lower === prefix || lower.startsWith(prefix)) return route;
  }
  if (lower.includes('cover')) return '/';
  if (lower.includes('signature') || lower.includes('guardian')) return '/d1';
  if (lower.includes('preparer')) return '/d2';
  if (lower.includes('service') || lower.includes('recipient')) return '/d3';
  if (lower.includes('attorney')) return '/d4';
  return '/';
}

/**
 * Adapts an array of validation errors (either legacy strings or structured objects)
 * into uniform structured validation records.
 */

export function adaptValidationErrors(errors = [], formType = 'guardian') {
  if (!Array.isArray(errors)) return [];
  return errors.map((err) => {
    if (err && typeof err === 'object' && err.message) {
      return {
        code: err.code || 'validation.error',
        section: err.section || '',
        path: err.path || '',
        label: err.label || err.message,
        route: err.route || resolveRouteFromSection(err.section, formType),
        severity: err.severity || 'required',
        message: err.message,
      };
    }

    const str = String(err || '').trim();
    const dashIdx = str.indexOf(' — ');
    let section = '';
    let detail = str;
    if (dashIdx > -1) {
      section = str.slice(0, dashIdx).trim();
      detail = str.slice(dashIdx + 3).trim();
    }

    const route = resolveRouteFromSection(section, formType);
    // Milestone 42F: validators state their own path (validation-issue.js);
    // a bare string here is one of the few non-field issues still emitted as
    // text (e.g. getSupplementalFilingIssues()) and carries no field path.
    // The pre-42F text-matching derivation that lived here is gone.
    const path = '';

    return {
      code: `validation.${section.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
      section,
      path,
      label: detail,
      route,
      severity: 'required',
      message: str,
    };
  });
}

/**
 * Navigates to the route (if needed) and focuses the field matching fieldPath.
 * Focuses immediately if element is already present in DOM; otherwise waits for render frame.
 */
export async function focusFieldByPath(route, fieldPath) {
  const findTarget = (path) => {
    if (!path) return null;
    const escaped = CSS.escape(path);
    return document.querySelector(
      `[data-field-path="${escaped}"], [data-form-path="${escaped}"], [data-annual-path="${escaped}"], [data-bind="${escaped}"], #${escaped}`
    );
  };

  let target = findTarget(fieldPath);

  if (!target && route && window.navigate && window.getCurrentPage?.() !== route) {
    window.navigate(route);
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    target = findTarget(fieldPath);
  }

  if (target) {
    target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    target.focus?.();
  }
}

if (typeof window !== 'undefined') {
  window.adaptValidationErrors = adaptValidationErrors;
  window.focusFieldByPath = focusFieldByPath;
}

