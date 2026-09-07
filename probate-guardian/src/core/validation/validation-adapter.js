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

/**
 * Resolves a route from a section prefix or legacy string error message.
 */
export function resolveRouteFromSection(sectionStr) {
  if (!sectionStr) return '/';
  const clean = String(sectionStr).trim().toLowerCase();
  for (const [prefix, route] of Object.entries(LEGACY_ROUTE_MAP)) {
    if (clean === prefix || clean.startsWith(prefix)) return route;
  }
  if (clean.includes('cover')) return '/';
  if (clean.includes('signature') || clean.includes('guardian')) return '/d1';
  if (clean.includes('preparer')) return '/d2';
  if (clean.includes('service') || clean.includes('recipient')) return '/d3';
  if (clean.includes('attorney')) return '/d4';
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
        route: err.route || resolveRouteFromSection(err.section),
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

    const route = resolveRouteFromSection(section);
    let path = '';
    const dLower = detail.toLowerCase();
    const sLower = section.toLowerCase();
    const rowMatch = sLower.match(/row\s*(\d+)/i);
    const rowIdx = rowMatch ? parseInt(rowMatch[1], 10) - 1 : 0;

    if (sLower.startsWith('a-1') || sLower.startsWith('a1')) {
      if (dLower.includes('property description') || dLower.includes('description')) path = `scheduleA1.${rowIdx}.propertyDescription`;
      else if (dLower.includes('street')) path = `scheduleA1.${rowIdx}.streetAddress`;
      else if (dLower.includes('city') || dLower.includes('zip')) path = `scheduleA1.${rowIdx}.cityStateZip`;
      else if (dLower.includes('value')) path = `scheduleA1.${rowIdx}.fullAssetValue`;
      else if (dLower.includes('%') || dLower.includes('percent')) path = `scheduleA1.${rowIdx}.wardPercent`;
    } else if (sLower.startsWith('a-2') || sLower.startsWith('a2')) {
      if (dLower.includes('lender name') || dLower.includes('lender')) path = `scheduleA2.${rowIdx}.lenderName`;
      else if (dLower.includes('street')) path = `scheduleA2.${rowIdx}.lenderAddress`;
      else if (dLower.includes('city') || dLower.includes('zip')) path = `scheduleA2.${rowIdx}.lenderCityStateZip`;
      else if (dLower.includes('account')) path = `scheduleA2.${rowIdx}.accountNumber`;
    } else if (sLower.startsWith('b-1') || sLower.startsWith('b1')) {
      if (dLower.includes('institution')) path = `scheduleB1.${rowIdx}.institutionName`;
      else if (dLower.includes('type')) path = `scheduleB1.${rowIdx}.accountType`;
      else if (dLower.includes('account')) path = `scheduleB1.${rowIdx}.accountNumber`;
      else if (dLower.includes('street')) path = `scheduleB1.${rowIdx}.streetAddress`;
      else if (dLower.includes('city') || dLower.includes('zip')) path = `scheduleB1.${rowIdx}.cityStateZip`;
    } else if (dLower.includes('ward')) path = 'wardName';
    else if (dLower.includes('case number')) path = 'caseNumber';
    else if (dLower.includes('county')) path = 'county';
    else if (dLower.includes('period from')) path = 'periodFrom';
    else if (dLower.includes('period to')) path = 'periodTo';
    else if (dLower.includes('signature date')) path = 'guardians.0.signatureDate';
    else if (dLower.includes('guardian')) path = 'guardians.0.name';
    else if (dLower.includes('attorney')) path = 'attorney';
    else if (dLower.includes('preparer')) path = 'preparer.name';

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

