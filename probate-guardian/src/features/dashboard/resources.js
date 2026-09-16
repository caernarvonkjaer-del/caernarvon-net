// Helpful Resources panel for the dashboard sidebar (Milestone 47B & Milestone 54).
// Pure module: resource link directory, circuit & county scoping policy, and markup generator.

import { normalizeCountyName } from '../../core/navigation/ward-county.js';
import { FL_COUNTY_CIRCUIT, CIRCUIT_ORDINALS, circuitForCounty } from '../../core/pdf/circuit-lookup.js';

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
        id: 'pinellas-court-records',
        label: 'Court Records',
        // The Clerk moved public case-records access to courtrecords.mypinellasclerk.gov;
        // the old public.co.pinellas.fl.us/login/login_nonsubscriber.jsp link was the
        // legacy portal. Description narrowed to "court records" to match: Pinellas
        // serves OFFICIAL records (deeds, liens) from a separate host,
        // officialrecords.mypinellasclerk.gov, which this link does not reach.
        description: 'Search Pinellas County court records',
        url: 'https://courtrecords.mypinellasclerk.gov/',
      },
      {
        id: 'pinellas-guardian-association',
        label: 'Guardian Association of Pinellas County',
        description: 'Education, resources, and professional guardian network',
        url: 'https://guardianassociation.org/',
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
 * Resolve county names belonging to a Florida Judicial Circuit (1 through 20).
 * @param {number|string} circuitNum
 * @returns {string[]} Alphabetical array of county names
 */
export function countiesForCircuit(circuitNum) {
  const cNum = Number(circuitNum) || 6;
  const validNum = cNum >= 1 && cNum <= 20 ? cNum : 6;
  return Object.keys(FL_COUNTY_CIRCUIT)
    .filter(county => FL_COUNTY_CIRCUIT[county] === validNum)
    .sort((a, b) => a.localeCompare(b));
}

/**
 * Build resource groups for a given Judicial Circuit (Milestone 54):
 * - One group per county in the selected circuit.
 * - Included circuit-level group if present (e.g. Sixth Judicial Circuit).
 * - "Florida" statewide group always included at the bottom.
 * @param {number|string} [circuitNum=6]
 * @returns {Array}
 */
export function groupsForCircuit(circuitNum = 6) {
  const cNum = Number(circuitNum) || 6;
  const counties = countiesForCircuit(cNum);
  const result = [];

  for (const county of counties) {
    const existingGroup = RESOURCE_GROUPS.find(g => g.scope === county);
    if (existingGroup) {
      result.push(existingGroup);
    } else {
      result.push({
        id: `county-${county.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
        heading: `${county} County`,
        scope: county,
        links: [],
      });
    }
  }

  // Circuit-level group (e.g. "Sixth Judicial Circuit"), if RESOURCE_GROUPS
  // has one for this circuit -- keyed by `scope`, not hardcoded to circuit 6,
  // so a future circuit-level group (Milestone 54's helpful-links wiring
  // task) is picked up automatically rather than needing this function
  // edited per circuit. This is also the AO 2024-025 link's gate (Milestone
  // 36-5/47B): it renders only inside the Sixth Circuit's own group, which
  // itself renders only when circuit 6 is the one selected -- a different
  // mechanism than 47B's filing-county gate, but the same guarantee AGENTS.md
  // section 5 requires: never shown unconditionally, only when the SELECTED
  // circuit is 6, and always inside this panel's own third-party disclaimer.
  // See tests/unit/content-corrections.spec.js's "AO 2024-025 removal guard".
  const circuitGroup = RESOURCE_GROUPS.find(g => g.scope === `circuit-${cNum}`);
  if (circuitGroup && !result.includes(circuitGroup)) {
    result.push(circuitGroup);
  }

  // Always append Florida statewide group at the end
  const floridaGroup = RESOURCE_GROUPS.find(g => g.id === 'florida');
  if (floridaGroup && !result.includes(floridaGroup)) {
    result.push(floridaGroup);
  }

  return result;
}

/**
 * Milestone 54, Decision D4's successor: the circuit selector's DEFAULT,
 * not a filter. Derived from the counties that actually appear on the
 * user's filings -- the most common circuit among them wins a tie broken by
 * circuit number, so one outlier filing doesn't flip the default back and
 * forth. Returns null when no filing has a resolvable county, so the caller
 * can fall back to the neutral default (6) instead of guessing.
 *
 * Superseded here (Milestone 47B's `groupsForCounties`, which filtered
 * RESOURCE_GROUPS directly to Pinellas/Pasco/Sixth-Circuit-only): this app
 * now shows every county's accordion for whichever circuit is selected
 * (`groupsForCircuit`), so "which groups to show" is no longer county-list
 * dependent -- only "which circuit is selected by default" still is, which
 * is what this function answers. This is a *default*, not a filter: a
 * manual selection always overrides it (see dashboard/index.js), and this
 * function's result is never written back to caseFile.selectedCircuit.
 * @param {string[]} [counties]
 * @returns {number|null}
 */
export function deriveDefaultCircuit(counties = []) {
  const rawList = Array.isArray(counties) ? counties : [];
  const normalized = rawList.map(c => normalizeCountyName(c)).filter(Boolean);
  const tally = new Map();
  for (const county of normalized) {
    const circuit = circuitForCounty(county);
    if (!circuit) continue;
    tally.set(circuit, (tally.get(circuit) || 0) + 1);
  }
  if (tally.size === 0) return null;
  let best = null;
  for (const [circuit, count] of tally) {
    if (!best || count > best.count || (count === best.count && circuit < best.circuit)) {
      best = { circuit, count };
    }
  }
  return best.circuit;
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
 * Render the Helpful Resources panel markup with Judicial Circuit selector (Milestone 54).
 *
 * `groups` left `undefined` derives the panel's groups from `selectedCircuit`
 * via `groupsForCircuit()`; an explicit array (including `[]`) is rendered
 * as given, and an empty result renders nothing -- a caller passing no
 * groups on purpose gets an empty panel, not a silent circuit-6 fallback.
 * @param {Array} [groups]
 * @param {{ selectedCircuit?: number, esc?: (s: string) => string, ic?: (name: string, size?: number) => string }} [options]
 * @returns {string}
 */
export function resourcesPanelHTML(groups, { selectedCircuit = 6, esc = defaultEsc, ic = defaultIc } = {}) {
  const activeCircuit = selectedCircuit >= 1 && selectedCircuit <= 20 ? Number(selectedCircuit) : 6;
  const displayGroups = groups === undefined ? groupsForCircuit(activeCircuit) : (Array.isArray(groups) ? groups : []);

  if (!displayGroups || displayGroups.length === 0) return '';

  const circuitOptionsHTML = Array.from({ length: 20 }, (_, idx) => {
    const num = idx + 1;
    const ordinal = CIRCUIT_ORDINALS[num] || String(num);
    const selected = num === activeCircuit ? ' selected' : '';
    return `<option value="${num}"${selected}>${esc(ordinal)} Judicial Circuit</option>`;
  }).join('');

  const groupsHTML = displayGroups.map(group => `
    <details class="sidebar-resource-group">
      <summary class="nav-section-label sidebar-resource-summary">${esc(group.heading)}</summary>
      ${group.links && group.links.length > 0 ? group.links.map(link => `
        <div class="sidebar-resource-item">
          <a class="sidebar-resource-link" href="${esc(link.url)}" target="_blank" rel="noopener noreferrer">${esc(link.label)} ${ic('external', 12)}<span class="visually-hidden"> (opens in a new tab)</span></a>
          <div class="sidebar-resource-desc">${esc(link.description)}</div>
        </div>
      `).join('') : '<div class="sidebar-resource-empty">No county-specific links yet — see Florida below.</div>'}
    </details>
  `).join('');

  return `<section class="sidebar-resources-panel" aria-labelledby="sidebar-resources-title">
    <h2 class="sidebar-resources-title visually-hidden" id="sidebar-resources-title">Helpful Resources</h2>
    <div class="sidebar-circuit-selector-wrap">
      <label for="sidebar-circuit-select" class="nav-section-label sidebar-circuit-label">Judicial Circuit</label>
      <select id="sidebar-circuit-select" class="form-select form-select-sm sidebar-circuit-select" data-action="change-circuit">
        ${circuitOptionsHTML}
      </select>
    </div>
    ${groupsHTML}
    <div class="sidebar-resource-disclaimer">
      These are independent government and third-party sites. Probate Guardian isn't affiliated with them and doesn't control their content.
    </div>
  </section>`;
}
