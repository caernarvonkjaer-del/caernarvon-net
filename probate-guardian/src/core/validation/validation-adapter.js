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
    '4. medical treatment': '/p5',
    '5–7. skills & rights': '/p6',
    '8. daily living': '/p7',
    '9. disabilities & devices': '/p8',
    '10. advance directives': '/p9',
    '11. remuneration': '/p10',
    'signatures': '/p11',
  },
  planInitial: {
    'cover': '/',
    '2–3. setting & medical care': '/p2',
    '4–5. mental health & personal care': '/p3',
    '6–7. socialization & benefits': '/p4',
    '9. examining providers': '/p5',
    '10a. daily living': '/p6',
    '10b–d. disabilities & devices': '/p7',
    '11. advance directives': '/p8',
    'signatures': '/p9',
    'attorney certification': '/p10',
  },
  planMinor: {
    'cover': '/',
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
  if (typeof window !== 'undefined' && typeof window.errorRoute === 'function') {
    const viaLegacy = window.errorRoute(clean);
    if (viaLegacy) return viaLegacy;
  }
  const planMap = PLAN_SECTION_ROUTE_MAPS[filingType];
  if (planMap) {
    const hit = planMap[clean.toLowerCase()];
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
    let path = '';
    const dLower = detail.toLowerCase();
    const sLower = section.toLowerCase();
    const rowMatch = sLower.match(/row\s*(\d+)/i);
    const rowIdx = rowMatch ? parseInt(rowMatch[1], 10) - 1 : 0;
    // D-1 ("D-1 Guardian #N") and D-5's recipient array ("D-5 Recipient N")
    // put their row ordinal in the section string too, but not as "row N" --
    // computed separately so the two never cross-match each other's prefix.
    const guardianOrdMatch = sLower.match(/guardian\s*#?\s*(\d+)/i);
    const guardianOrdIdx = guardianOrdMatch ? parseInt(guardianOrdMatch[1], 10) - 1 : 0;
    const recipientMatch = sLower.match(/recipient\s*(\d+)/i);
    const recipientIdx = recipientMatch ? parseInt(recipientMatch[1], 10) - 1 : 0;

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
    } else if (sLower.startsWith('b-2') || sLower.startsWith('b2')) {
      // Vehicle sub-fields (Year/Make/Model/VIN/Odometer Mileage) are raw
      // inputs with no data-bind at all (guardian-inventory/index.js's
      // renderB2Fields()) -- their only focusable selector is the literal
      // element id, not a dot-path.
      if (dLower.includes('year')) path = `b2-vehicle-year-${rowIdx}`;
      else if (dLower.includes('make')) path = `b2-vehicle-make-${rowIdx}`;
      else if (dLower.includes('model')) path = `b2-vehicle-model-${rowIdx}`;
      else if (dLower.includes('vin')) path = `b2-vehicle-vin-${rowIdx}`;
      else if (dLower.includes('odometer') || dLower.includes('mileage')) path = `b2-vehicle-mileage-${rowIdx}`;
      else if (dLower.includes('description')) path = `scheduleB2.${rowIdx}.description`;
      else if (dLower.includes('street')) path = `scheduleB2.${rowIdx}.streetAddress`;
      else if (dLower.includes('city') || dLower.includes('zip')) path = `scheduleB2.${rowIdx}.cityStateZip`;
      else if (dLower.includes('valuation method')) path = `scheduleB2.${rowIdx}.valuationMethod`;
      else if (dLower.includes('value')) path = `scheduleB2.${rowIdx}.fullAssetValue`;
    } else if (sLower.startsWith('b-3') || sLower.startsWith('b3')) {
      if (dLower.includes('description')) path = `scheduleB3.${rowIdx}.description`;
      else if (dLower.includes('street')) path = `scheduleB3.${rowIdx}.streetAddress`;
      else if (dLower.includes('city') || dLower.includes('zip')) path = `scheduleB3.${rowIdx}.cityStateZip`;
      else if (dLower.includes('value')) path = `scheduleB3.${rowIdx}.fullAssetValue`;
    } else if (sLower.startsWith('b-4') || sLower.startsWith('b4')) {
      if (dLower.includes('lender name')) path = `scheduleB4.${rowIdx}.lenderName`;
      else if (dLower.includes('related property')) path = `scheduleB4.${rowIdx}.relatedProperty`;
      else if (dLower.includes('lender address')) path = `scheduleB4.${rowIdx}.lenderAddress`;
      else if (dLower.includes('liability balance')) path = `scheduleB4.${rowIdx}.fullLiabilityBalance`;
    } else if (sLower.startsWith('c-1') || sLower.startsWith('c1')) {
      if (dLower.includes('payer name')) path = `scheduleC1.${rowIdx}.payerName`;
      else if (dLower.includes('type of income')) path = `scheduleC1.${rowIdx}.typeOfIncome`;
      else if (dLower.includes('payer address')) path = `scheduleC1.${rowIdx}.payerAddress`;
      else if (dLower.includes('basis for payment')) path = `scheduleC1.${rowIdx}.paymentBasis`;
      else if (dLower.includes('income amount')) path = `scheduleC1.${rowIdx}.annualIncomeAmount`;
    } else if (sLower.startsWith('c-2') || sLower.startsWith('c2')) {
      if (dLower.includes('claimant name')) path = `scheduleC2.${rowIdx}.claimantName`;
      else if (dLower.includes('lawsuit description')) path = `scheduleC2.${rowIdx}.lawsuitDescription`;
      else if (dLower.includes('court') || dLower.includes('jurisdiction')) path = `scheduleC2.${rowIdx}.courtJurisdiction`;
      else if (dLower.includes('case number')) path = `scheduleC2.${rowIdx}.caseNumber`;
      else if (dLower.includes('date filed')) path = `scheduleC2.${rowIdx}.dateFiled`;
      else if (dLower.includes('amount of claim')) path = `scheduleC2.${rowIdx}.amountOfClaim`;
    } else if (sLower.startsWith('c-3') || sLower.startsWith('c3')) {
      if (dLower.includes('defendant name')) path = `scheduleC3.${rowIdx}.defendantName`;
      else if (dLower.includes('action description')) path = `scheduleC3.${rowIdx}.actionDescription`;
      else if (dLower.includes('status')) path = `scheduleC3.${rowIdx}.status`;
      else if (dLower.includes('court') || dLower.includes('jurisdiction')) path = `scheduleC3.${rowIdx}.courtJurisdiction`;
      else if (dLower.includes('action date')) path = `scheduleC3.${rowIdx}.actionDate`;
      else if (dLower.includes('estimated settlement')) path = `scheduleC3.${rowIdx}.estimatedSettlement`;
    } else if (sLower.startsWith('c-4') || sLower.startsWith('c4')) {
      if (dLower.includes('trust name')) path = `scheduleC4.${rowIdx}.trustName`;
      else if (dLower.includes('trustee name')) path = `scheduleC4.${rowIdx}.trusteeName`;
      else if (dLower.includes('trustee address')) path = `scheduleC4.${rowIdx}.trusteeAddress`;
      else if (dLower.includes('trustee city')) path = `scheduleC4.${rowIdx}.trusteeCityStateZip`;
      else if (dLower.includes('date created')) path = `scheduleC4.${rowIdx}.dateCreated`;
      else if (dLower.includes('trust amount')) path = `scheduleC4.${rowIdx}.trustAmount`;
    } else if (sLower.startsWith('c-5') || sLower.startsWith('c5')) {
      if (dLower.includes('asset description')) path = `scheduleC5.${rowIdx}.assetDescription`;
      else if (dLower.includes('owner name')) path = `scheduleC5.${rowIdx}.ownerName`;
      else if (dLower.includes('owner address')) path = `scheduleC5.${rowIdx}.ownerAddress`;
      else if (dLower.includes('owner city') || dLower.includes('zip')) path = `scheduleC5.${rowIdx}.ownerCityStateZip`;
      else if (dLower.includes('relationship')) path = `scheduleC5.${rowIdx}.relationshipToWard`;
      else if (dLower.includes('total asset value')) path = `scheduleC5.${rowIdx}.totalAssetValue`;
    } else if (sLower.startsWith('d-1')) {
      // "D-1 Guardian #N" -- fixing a real live bug where every co-guardian's
      // missing signature date used to point at guardian #1 regardless of
      // which one was actually incomplete (see the old bottom-of-chain
      // fallback below, which still hardcodes index 0 for other formTypes).
      if (dLower.includes('name')) path = `guardians.${guardianOrdIdx}.name`;
      else if (dLower.includes('signature date')) path = `guardians.${guardianOrdIdx}.signatureDate`;
      else if (dLower.includes('ssn')) path = `guardians.${guardianOrdIdx}.ssnEin`;
      else if (dLower.includes('phone')) path = `guardians.${guardianOrdIdx}.phone`;
      else if (dLower.includes('street')) path = `guardians.${guardianOrdIdx}.streetAddress`;
      else if (dLower.includes('city') || dLower.includes('zip')) path = `guardians.${guardianOrdIdx}.cityStateZip`;
    } else if (sLower.startsWith('d-2')) {
      // Preparer and Attorney share the "D-2" prefix and are disambiguated
      // only by the SECTION text, never the detail (bare labels like "Name"
      // or "Phone" say nothing about which party they belong to).
      if (sLower.includes('preparer')) {
        if (dLower.includes('name')) path = 'preparer.name';
        else if (dLower.includes('ssn')) path = 'preparer.ssnEin';
        else if (dLower.includes('phone')) path = 'preparer.phone';
        else if (dLower.includes('street')) path = 'preparer.streetAddress';
        else if (dLower.includes('city') || dLower.includes('zip')) path = 'preparer.cityStateZip';
        else if (dLower.includes('date')) path = 'preparer.signatureDate'; // Preparer's own error text says just "Date", not "Signature Date"
      } else if (sLower.includes('attorney')) {
        if (dLower.includes('name')) path = 'attorney.name';
        else if (dLower.includes('filing date')) path = 'attorney.filingDate'; // must check before the generic "signature date" below
        else if (dLower.includes('signature date')) path = 'attorney.signatureDate';
        else if (dLower.includes('bar number')) path = 'attorney.barNumber';
        else if (dLower.includes('phone')) path = 'attorney.phone';
        else if (dLower.includes('street')) path = 'attorney.streetAddress';
        else if (dLower.includes('city') || dLower.includes('zip')) path = 'attorney.cityStateZip';
      }
    } else if (sLower === 'd-3') {
      // Yes/No radios with no data-bind/id matching the state field name --
      // the only focusable target is the radio input's own literal id.
      if (dLower.includes('filed')) path = 'sdb-filed-yes';
      else path = 'sdb-yes';
    } else if (sLower === 'd-4') {
      if (dLower.includes('bond amount')) path = 'bondAmount';
      else if (dLower.includes('bond period from')) path = 'bondPeriodFrom';
      else if (dLower.includes('bond period to')) path = 'bondPeriodTo';
      else if (dLower.includes('bonding company')) path = 'bondingCompany';
    } else if (sLower.startsWith('d-5')) {
      if (sLower.includes('recipient')) {
        if (dLower.includes('name')) path = `serviceRecipients.${recipientIdx}.name`;
        else if (dLower.includes('city') || dLower.includes('zip')) path = `serviceRecipients.${recipientIdx}.cityStateZip`;
        else if (dLower.includes('address')) path = `serviceRecipients.${recipientIdx}.address`;
      } else if (sLower.includes('attorney')) {
        if (dLower.includes('name')) path = 'serviceAttorney.name';
        else if (dLower.includes('signature date')) path = 'serviceAttorney.signatureDate';
        else if (dLower.includes('bar number')) path = 'serviceAttorney.barNumber';
        else if (dLower.includes('phone')) path = 'serviceAttorney.phone';
        else if (dLower.includes('street')) path = 'serviceAttorney.streetAddress';
        else if (dLower.includes('city') || dLower.includes('zip')) path = 'serviceAttorney.cityStateZip';
      } else if (dLower.includes('service date')) path = 'serviceDate';
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

