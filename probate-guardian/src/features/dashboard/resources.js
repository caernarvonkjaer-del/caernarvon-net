// Helpful Resources panel for the dashboard sidebar (Milestone 47B).
// Pure module: resource link directory, county-scoping policy, and markup generator.

import { normalizeCountyName } from '../../core/navigation/ward-county.js';
import { hasSixthCircuitLocalGuidance } from '../../core/filing/county-guidance.js';

export const RESOURCE_GROUPS = Object.freeze([
  {
    id: 'pinellas',
    heading: 'Pinellas County',
    scope: 'Pinellas',
    links: [
      {
        id: 'pinellas-property-appraiser',
        label: 'Property Appraiser',
        description: 'Look up parcel ownership and assessed values',
        url: 'https://www.pcpao.gov/',
      },
      {
        id: 'pinellas-clerk-guardianships',
        label: 'Clerk — Guardianships',
        description: 'Clerk of Court guardianship information',
        url: 'https://www.mypinellasclerk.gov/Home/Probate-Mental-Health#49273-guardianships',
      },
      {
        id: 'pinellas-tax-collector',
        label: 'Tax Collector',
        description: 'Property tax bills and payments',
        url: 'https://pinellastaxcollector.gov/',
      },
    ],
  },
  {
    id: 'pasco',
    heading: 'Pasco County',
    scope: 'Pasco',
    links: [
      {
        id: 'pasco-property-appraiser',
        label: 'Property Appraiser',
        description: 'Look up parcel ownership and assessed values',
        url: 'https://pascopa.com/',
      },
      {
        id: 'pasco-clerk-guardianships',
        label: 'Clerk — Guardianships',
        description: 'Clerk of Court guardianship information',
        url: 'https://www.pascoclerk.com/272/Guardianships',
      },
      {
        id: 'pasco-tax-collector',
        label: 'Tax Collector',
        description: 'Property tax bills and payments',
        url: 'https://www.pascotaxes.com/',
      },
    ],
  },
  {
    id: 'sixth-circuit',
    heading: 'Sixth Judicial Circuit',
    scope: 'circuit-6',
    links: [
      {
        id: 'sixth-circuit-guardianship',
        label: 'Guardianship information',
        description: "The circuit's guardianship page",
        url: 'https://www.jud6.org/guardianship-information/',
      },
      {
        id: 'sixth-circuit-ao',
        label: 'Probate & guardianship administrative orders',
        description: 'Local orders, including AO 2024-025',
        url: 'https://www.jud6.org/LegalCommunity/LegalPractice/AOSAndRules/aos/SubjectAO/Proguard/proguard.html',
      },
    ],
  },
  {
    id: 'florida',
    heading: 'Florida',
    scope: 'statewide',
    links: [
      {
        id: 'fl-efiling-portal',
        label: 'Florida Courts E-Filing Portal',
        description: 'File documents with the court',
        url: 'https://www.myflcourtaccess.com/',
      },
      {
        id: 'fl-statutes-744',
        label: 'Florida Statutes, Chapter 744',
        description: 'Guardianship law (current year)',
        url: 'https://www.leg.state.fl.us/statutes/index.cfm?App_mode=Display_Statute&URL=0700-0799/0744/0744ContentsIndex.html',
      },
      {
        id: 'fl-probate-rules',
        label: 'Florida Probate Rules',
        description: "The Florida Bar's court rules page",
        url: 'https://www.floridabar.org/rules/ctproc/',
      },
      {
        id: 'fl-courts-guardianship',
        label: 'Florida Courts — Guardianship',
        description: 'Statewide court guardianship resources',
        url: 'https://www.flcourts.gov/Services/Family-Courts/domestic-relations-court-resources/guardianship',
      },
      {
        id: 'fl-oppg',
        label: 'Office of Public & Professional Guardians',
        description: 'Department of Elder Affairs oversight of professional guardians',
        url: 'https://elderaffairs.org/programs-and-services/office-of-public-professional-guardians-oppg/',
      },
      {
        id: 'fl-abuse-hotline',
        label: 'Florida Abuse Hotline',
        description: 'Report abuse, neglect or exploitation: 1-800-962-2873',
        url: 'https://www.myflfamilies.com/services/abuse/abuse-hotline',
      },
      {
        id: 'fl-treasure-hunt',
        label: 'Florida Treasure Hunt',
        description: 'Search unclaimed property that may belong to the ward',
        url: 'https://www.fltreasurehunt.gov/',
      },
      {
        id: 'us-ssa-payee',
        label: 'SSA Representative Payee',
        description: 'Managing Social Security benefits for someone else',
        url: 'https://www.ssa.gov/payee/',
      },
      {
        id: 'us-va-fiduciary',
        label: 'VA Fiduciary Program',
        description: 'Managing VA benefits for a beneficiary',
        url: 'https://www.benefits.va.gov/fiduciary/',
      },
    ],
  },
].map(group => Object.freeze({
  ...group,
  links: Object.freeze(group.links.map(link => Object.freeze({ ...link }))),
})));

/**
 * Filter resource groups matching Decision D4:
 * - "Florida" always.
 * - Pinellas, Pasco and the Sixth Circuit group for counties that appear on any filing.
 * - Both Pinellas and Pasco while no filing has a county.
 */
export function groupsForCounties(counties = []) {
  const rawList = Array.isArray(counties) ? counties : [];
  const normalized = Array.from(new Set(
    rawList.map(c => normalizeCountyName(c)).filter(Boolean)
  ));

  const hasCounties = normalized.length > 0;
  const showPinellas = !hasCounties || normalized.includes('Pinellas');
  const showPasco = !hasCounties || normalized.includes('Pasco');
  const showSixth = showPinellas || showPasco || normalized.some(c => hasSixthCircuitLocalGuidance(c));

  return RESOURCE_GROUPS.filter(g => {
    if (g.id === 'pinellas') return showPinellas;
    if (g.id === 'pasco') return showPasco;
    if (g.id === 'sixth-circuit') return showSixth;
    if (g.id === 'florida') return true;
    return false;
  });
}

function defaultEsc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function defaultIc(name, size) {
  if (typeof window !== 'undefined' && typeof window.ic === 'function') {
    return window.ic(name, size);
  }
  return '';
}

/**
 * Render the Helpful Resources panel markup.
 * @param {Array} groups
 * @param {{ esc?: (s: string) => string, ic?: (name: string, size?: number) => string }} [helpers]
 * @returns {string}
 */
export function resourcesPanelHTML(groups = [], { esc = defaultEsc, ic = defaultIc } = {}) {
  if (!groups || groups.length === 0) return '';

  const groupsHTML = groups.map(group => `
    <div class="sidebar-resource-group">
      <div class="nav-section-label">${esc(group.heading)}</div>
      ${group.links.map(link => `
        <div class="sidebar-resource-item">
          <a class="sidebar-resource-link" href="${esc(link.url)}" target="_blank" rel="noopener noreferrer">${esc(link.label)} ${ic('external', 12)}<span class="visually-hidden"> (opens in a new tab)</span></a>
          <div class="sidebar-resource-desc">${esc(link.description)}</div>
        </div>
      `).join('')}
    </div>
  `).join('');

  return `<section class="sidebar-resources-panel" aria-labelledby="sidebar-resources-title">
    <h2 class="sidebar-resources-title visually-hidden" id="sidebar-resources-title">Helpful Resources</h2>
    ${groupsHTML}
    <div class="sidebar-resource-disclaimer">
      These are independent government and third-party sites. Probate Guardian isn't affiliated with them and doesn't control their content.
    </div>
  </section>`;
}
