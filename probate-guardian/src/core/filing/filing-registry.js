// Milestone 70, 70C: the eager filing registry. Every one of the nine filing
// identities, with what the app needs about it before its feature is ever
// imported: its engine (Final and Trust are the Annual engine under their own
// names -- distinct identities in saved data and on every page, one shared
// implementation), its name, description and dashboard look, its blank
// filing, the normalizer every loaded filing passes through, and the feature
// mount it routes to. Built on src/core/filing/filing-descriptor.js (names,
// output copy, capabilities) and the per-engine models in
// src/core/filing/models/. Moved from legacy-app.js's GLOBAL STATE & CONFIG,
// INVENTORY TYPE MANAGEMENT and dashboard sections; nothing here renders a
// page, so the dashboard and a new filing never load PDF, Excel or page code.
import { ic } from '../ui/icons.js';
import { resolveDescriptorForInventoryType, mountFeatureFnName, FILING_TYPE_KEYS } from './filing-descriptor.js';
import { normalizeWardData } from './normalize-filing.js';
import { emptyDataGuardian, PAGES_GUARDIAN } from './models/guardian.js';
import { emptyDataSimplified, PAGES_SIMPLIFIED } from './models/simplified.js';
import { emptyDataAnnual, PAGES_ANNUAL } from './models/annual.js';
import { emptyDataPlanSimplified, PAGES_PLAN_SIMPLIFIED } from './models/plan-simplified.js';
import { emptyDataPlanAnnual, PAGES_PLAN_ANNUAL } from './models/plan-annual.js';
import { emptyDataPlanInitial, PAGES_PLAN_INITIAL } from './models/plan-initial.js';
import { emptyDataPlanMinor, PAGES_PLAN_MINOR } from './models/plan-minor.js';

// Each identity's name on screen, its label and one-line description (the
// new-filing picker and dashboard use these).
export const INVENTORY_TYPES = {
  guardian: {
    name: 'Initial Inventory',
    label: 'Verified Initial Inventory',
    description: 'Initial inventory of assets as of Guardianship Inception Date'
  },
  simplified: {
    name: 'Simplified Annual Accounting',
    label: 'Simplified Annual Accounting',
    description: 'Simplified annual accounting for guardianship'
  },
  annual: {
    name: 'Annual Accounting',
    label: 'Annual Accounting',
    description: 'Full annual accounting with detailed schedules'
  },
  // Final and Trust accountings use the SAME form, schedules, totals and
  // validation as the Annual Accounting — they differ only in what the
  // filing is called on screen and on the finished document. See
  // ANNUAL_FORM_ALIASES / formEngine() below: every behavioural lookup
  // resolves these back to 'annual', so there is one implementation to
  // maintain rather than three copies that could drift apart.
  finalAccounting: {
    name: 'Final Accounting',
    label: 'Final Accounting',
    description: 'Closing accounting filed when the guardianship ends, using the full annual schedules'
  },
  trustAccounting: {
    name: 'Trust Accounting',
    label: 'Trust Accounting',
    description: 'Accounting for a trust, using the full annual schedules'
  },
  // Plans report on the ward's PERSON (where they live, their care, their
  // rights) — a separate court filing from the Inventory/Accountings above,
  // which report on their PROPERTY. A guardian of both person and property
  // files one of each.
  planSimplified: {
    name: 'Simplified Annual Plan',
    label: 'Simplified Annual Plan',
    description: "Short annual report on the ward's residence, care, and wellbeing"
  },
  planAnnual: {
    name: 'Annual Guardianship Plan',
    label: 'Annual Guardianship Plan',
    description: "Full annual report on the ward's residence, care, rights, and abilities"
  },
  planInitial: {
    name: 'Initial Guardianship Plan',
    label: 'Initial Guardianship Plan',
    description: "The first plan filed after Letters of Guardianship are signed, due within 60 days"
  },
  planMinor: {
    name: 'Annual Plan — Minors',
    label: 'Annual Plan — Minors',
    description: "Annual report for a minor ward, covering residence, care, education, and social development"
  }
};

// Ward types that are the Annual Accounting form under a different filing
// name. Kept as their own inventoryType so the dashboard, the ward picker
// and the finished document all say the right thing, but resolved through
// formEngine() wherever behaviour is chosen — pages, nav, empty data,
// totals, validation, export — so they cannot drift from Annual.
export const ANNUAL_FORM_ALIASES = ['finalAccounting','trustAccounting'];

// Maps a ward's inventoryType to the form engine that drives it. Use this
// for behaviour; use the raw inventoryType for naming/identity.
export function formEngine(type){
  return ANNUAL_FORM_ALIASES.includes(type) ? 'annual' : type;
}

// The filing's display name, e.g. "Final Accounting" — used in headings and
// on the exported document so an alias never shows as "Annual Accounting".
export function formDisplayName(type){
  return resolveDescriptorForInventoryType(type)?.displayName
    || (INVENTORY_TYPES[type] && INVENTORY_TYPES[type].name)
    || 'Accounting';
}

// accent is a fixed hex — used for the ward-card stripe / left-border,
// where it's a decorative fill and doesn't need to react to theme.
// accentText is the SAME colour family but as a var() reference, used
// everywhere this accent sits on top of a surface as plain text — those
// three raw hex values read fine on white (light mode) but fail badly as
// text on a dark surface (as low as 1.9:1), same problem --brand/--accent/
// --ok had, same fix: route through the *-text token instead.
// financial:false marks a document that reports on the ward's PERSON (care,
// residence, medical treatment) rather than their property. Those have no
// money total at all, so anywhere a dollar headline would normally render,
// the filing-progress percentage is shown instead — a "$0.00" or a bare "—"
// under a "Total" label reads as a real figure and is actively misleading.
export const INVENTORY_TYPE_META={
  guardian:   {iconName:'clipboard', accent:'#1e5799', accentText:'var(--accent-text)', totalLabel:'Total Value',  financial:true},
  simplified: {iconName:'receipt',   accent:'#1f7a3d', accentText:'var(--ok-text)',     totalLabel:'Ending Balance', financial:true},
  annual:     {iconName:'chart',     accent:'#820024', accentText:'var(--brand-text)',  totalLabel:'Net Assets',     financial:true},
  finalAccounting: {iconName:'chart', accent:'#820024', accentText:'var(--brand-text)', totalLabel:'Net Assets',     financial:true},
  trustAccounting: {iconName:'chart', accent:'#820024', accentText:'var(--brand-text)', totalLabel:'Net Assets',     financial:true},
  planSimplified:{iconName:'shield', accent:'#6b3fa0', accentText:'var(--accent-text)', totalLabel:'Filing Progress', financial:false},
  planAnnual:{iconName:'shield',     accent:'#4a3f9e', accentText:'var(--accent-text)', totalLabel:'Filing Progress', financial:false},
  planInitial:{iconName:'shield',    accent:'#2f6e8c', accentText:'var(--accent-text)', totalLabel:'Filing Progress', financial:false},
  planMinor:  {iconName:'shield',    accent:'#8a5a1e', accentText:'var(--accent-text)', totalLabel:'Filing Progress', financial:false},
};
export function typeIcon(type,size){
  return ic((INVENTORY_TYPE_META[type]||{}).iconName||'folder',size||16);
}

// Milestone 40C-A item 1 — applies to EVERY blank-data factory in
// src/core/filing/models/: `county` starts blank, never
// 'Pinellas'. A ward has no default county until the user selects one on that
// ward's first filing Cover; that first explicit choice is then stored on the
// canonical ward Party and hydrates later filings (see
// core/navigation/ward-county.js). `attorney_county` starts blank for the same
// reason and is a separate field -- it is never populated from the ward county.
// Do not reintroduce a default here: a filing that silently claims Pinellas
// names the wrong court on a real filed document, and County validation already
// blocks export until the filer chooses.
//
export function initializeEmptyData(type){
  // Each factory's own shape, plus the party and case links added below.
  const data=/** @type {Record<string, any>} */ ((()=>{
    switch(formEngine(type)){
      case 'guardian': return emptyDataGuardian();
      case 'simplified': return emptyDataSimplified();
      case 'annual': return emptyDataAnnual();
      case 'planSimplified': return emptyDataPlanSimplified();
      case 'planAnnual': return emptyDataPlanAnnual();
      case 'planInitial': return emptyDataPlanInitial();
      case 'planMinor': return emptyDataPlanMinor();
      default: return emptyDataGuardian();
    }
  })());
  // Party-record references -- unwired so far (see the persistence-rewrite
  // plan's later phases: hydration/dehydration, write-through, the party
  // picker). Added here, once, rather than in each emptyData*() factory
  // above, so every filing type gets the exact same shape regardless of
  // which factory built it, and so the phases that actually consume these
  // have one consistent place to look. guardianPartyIds starts empty and
  // grows to match however many guardian rows a given type carries (1 for
  // guardian/D-5, up to 4 for planInitial, etc.) once something populates it.
  data.wardPartyId=null;
  data.guardianPartyIds=[];
  data.attorneyPartyId=null;
  data.preparerPartyId=null;
  // Case FK (Milestone 6) -- null until explicitly linked, same convention.
  data.caseId=null;
  if(formEngine(type)==='annual'){
    data.inventoryType=type;
    data.filingType=type==='finalAccounting'?'Final':type==='trustAccounting'?'Trust':'Annual';
  }
  return data;
}

// Each identity's page list (legacy-app.js's PAGES until Milestone 70's 70C):
// the Final and Trust Accountings use the Annual engine's pages.
export const FILING_PAGES={
  guardian: PAGES_GUARDIAN,
  finalAccounting: PAGES_ANNUAL,
  trustAccounting: PAGES_ANNUAL,
  simplified: PAGES_SIMPLIFIED,
  annual: PAGES_ANNUAL,
  planSimplified: PAGES_PLAN_SIMPLIFIED,
  planAnnual: PAGES_PLAN_ANNUAL,
  planInitial: PAGES_PLAN_INITIAL,
  planMinor: PAGES_PLAN_MINOR,
};

// One entry per filing identity, in FILING_TYPE_KEYS order.
export const FILING_REGISTRY = Object.freeze(Object.fromEntries(FILING_TYPE_KEYS.map((type) => [type, Object.freeze({
  type,
  engineId: formEngine(type),
  descriptor: resolveDescriptorForInventoryType(type),
  info: INVENTORY_TYPES[type],
  meta: INVENTORY_TYPE_META[type],
  mountFeature: mountFeatureFnName(formEngine(type)),
  pages: FILING_PAGES[type],
  blank: () => initializeEmptyData(type),
  normalize: normalizeWardData,
})])));

export { normalizeWardData };
