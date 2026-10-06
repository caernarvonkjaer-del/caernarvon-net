// The filing features' lazy loaders, and the feature services built on them
// (Milestone 70, 70K) -- the one place a feature pack is imported.
//
// Every loader below is a literal dynamic import() in a module Vite
// processes, so the build discovers, bundles and hashes each feature's module
// graph (dist/web), and vite-plugin-singlefile's codeSplitting:false inlines
// it into the one page (dist/portable), which therefore never performs a
// runtime import() of a separate file -- ES module loading is restricted
// under file://, the fetch restriction fragment-loader.js's comment describes.
// Inlined is not evaluated: a feature's code still runs only when its first
// page is shown (checked over file:// on 2026-09-24: no Plan, Annual or
// Inventory validator exists at startup). That deferred evaluation is part of
// the lazy boundary Milestone 70 keeps. (This file was created because
// legacy-app.js, a classic script Vite cannot see into, did its imports
// itself and src/features/simplified-accounting/*.js were missing from both
// builds.)
//
// Core may not import a feature, so src/main.js, the composition root, hands
// featureServices to startGuardianForms(), which provides it to core
// (src/core/runtime/features.js). Until 70K the loaders and the feature
// bridges were window globals the monolith called.
//
// The canonical totals are eager, as they were: the dashboard's headline
// figure, progress and a new year's opening balance need them for a filing
// whose feature has never loaded.
import { calcTotalsAnnual, annualReconcileState } from './features/annual-accounting/totals.js';
import { calcTotalsGuardian } from './features/guardian-inventory/totals.js';
import { calcTotals } from './features/simplified-accounting/totals.js';
import { createFeatureBridge } from './core/feature-bridge.js';
import { formEngine } from './core/filing/filing-registry.js';
import { hasScheduleDFigure } from './core/filing/schedule-d-figure.js';
import { validatorFnName } from './core/filing/filing-descriptor.js';

export function loadSimplifiedFeature() {
  return import('./features/simplified-accounting/index.js');
}

// Plan Simplified (Milestone 3, Phase B) -- same reasoning as
// loadSimplifiedFeature above.
export function loadPlanSimplifiedFeature() {
  return import('./features/plan-simplified/index.js');
}

// Plan Annual (Milestone 4, Phase A) -- same reasoning.
export function loadPlanAnnualFeature() {
  return import('./features/plan-annual/index.js');
}

// Plan Initial (Milestone 5, Phase A) -- same reasoning.
export function loadPlanInitialFeature() {
  return import('./features/plan-initial/index.js');
}

// Plan Minor (Milestone 6, Phase A) -- same reasoning.
export function loadPlanMinorFeature() {
  return import('./features/plan-minor/index.js');
}

// Annual Accounting (Milestone 7, Phase A) -- same reasoning. Also covers
// the finalAccounting/trustAccounting aliases (formEngine() maps both to
// 'annual' everywhere the app dispatches on type).
export function loadAnnualFeature() {
  return import('./features/annual-accounting/index.js');
}

// Guardian Inventory (Milestone 8, Phase A) -- same reasoning.
export function loadGuardianFeature() {
  return import('./features/guardian-inventory/index.js');
}

// Dashboard (Milestone 9) -- same reasoning.
export function loadDashboardFeature() {
  return import('./features/dashboard/index.js');
}

// Accessible PDF loaders (Milestone 19) -- bridges PDF model and engine
// modules into Vite's bundle discovery graph so both web (dev/preview) and
// portable (file:// single-file) distributions can execute and test PDF generation.
export async function loadGuardianPdf() {
  const [model, engine, access] = await Promise.all([
    import('./features/guardian-inventory/pdf-model.js'),
    import('./features/guardian-inventory/pdf-engine.js'),
    import('./core/pdf/pdf-accessibility.js'),
  ]);
  return { ...model, ...engine, ...access };
}

export async function loadSimplifiedPdf() {
  const [model, engine] = await Promise.all([
    import('./features/simplified-accounting/pdf-model.js'),
    import('./core/pdf/pdf-engine.js'),
  ]);
  return { ...model, ...engine };
}

export async function loadAnnualPdf() {
  const [model, engine] = await Promise.all([
    import('./features/annual-accounting/pdf-model.js'),
    import('./core/pdf/pdf-engine.js'),
  ]);
  return { ...model, ...engine };
}

// Plan-* accessible PDF loaders (Milestone 19-2) -- same reasoning as the
// three loaders above; these four forms previously had no vector PDF path
// (html2pdf raster only), so there was no pdf-model.js/pdf-engine.js pair
// to bridge until now.
export async function loadPlanInitialPdf() {
  const [model, engine] = await Promise.all([
    import('./features/plan-initial/pdf-model.js'),
    import('./core/pdf/pdf-engine.js'),
  ]);
  return { ...model, ...engine };
}

export async function loadPlanAnnualPdf() {
  const [model, engine] = await Promise.all([
    import('./features/plan-annual/pdf-model.js'),
    import('./core/pdf/pdf-engine.js'),
  ]);
  return { ...model, ...engine };
}

export async function loadPlanMinorPdf() {
  const [model, engine] = await Promise.all([
    import('./features/plan-minor/pdf-model.js'),
    import('./core/pdf/pdf-engine.js'),
  ]);
  return { ...model, ...engine };
}

export async function loadPlanSimplifiedPdf() {
  const [model, engine] = await Promise.all([
    import('./features/plan-simplified/pdf-model.js'),
    import('./core/pdf/pdf-engine.js'),
  ]);
  return { ...model, ...engine };
}

// Milestone 63C. This file used to end with two listeners (added in 60b0133) that
// reloaded the page by themselves when a chunk failed to load -- on Vite's
// `vite:preloadError`, and on any unhandled "Failed to fetch dynamically imported
// module" rejection. That replaced the "This section could not be loaded" panel
// before anyone could read it, closed the open case for a filer with no remembered
// file handle, and left the browser's unsaved-changes prompt as the only guard. A
// failed chunk is now reported by the feature bridge (core/feature-bridge.js), for
// the feature's own module and for anything it imports while mounting, with a
// Reload button the filer chooses to press. Do not reintroduce an automatic reload
// here; MILESTONE-63-PROPOSAL.md, 63C, records why.

// Each feature by the id the router and sidebar use: the dashboard, and each
// filing engine (filing-descriptor.js's FILING_ENGINE_IDS).
const LOADERS = Object.freeze({
  dashboard: loadDashboardFeature,
  guardian: loadGuardianFeature,
  simplified: loadSimplifiedFeature,
  annual: loadAnnualFeature,
  planSimplified: loadPlanSimplifiedFeature,
  planAnnual: loadPlanAnnualFeature,
  planInitial: loadPlanInitialFeature,
  planMinor: loadPlanMinorFeature,
});

const loadedModules = new Map();
const pending = new Map();

function loaderFor(id) {
  const loader = LOADERS[id];
  if (!loader) throw new Error(`No feature named ${id}`);
  return loader;
}

// A feature's module, loaded once. A failed load is forgotten, so the next
// attempt (the Reload panel's page, or the next navigation) tries again.
function load(id) {
  let promise = pending.get(id);
  if (!promise) {
    promise = loaderFor(id)().then(
      (mod) => { loadedModules.set(id, mod); return mod; },
      (error) => { pending.delete(id); throw error; },
    );
    pending.set(id, promise);
  }
  return promise;
}

const bridges = new Map();
function bridge(id) {
  let b = bridges.get(id);
  if (!b) {
    loaderFor(id);
    b = createFeatureBridge(() => load(id));
    bridges.set(id, b);
  }
  return b;
}

// The dashboard's figure for a filing: the Initial Inventory's total, what
// remains in a Simplified Accounting, an Annual (Final, Trust) accounting's
// net assets -- from Schedule D when it has any, else the reconciled total.
// Moved from legacy-app.js's getWardHeadlineTotal() in 70K; since 70J it is
// handed the filing (it used to point window.D at each filing in turn).
function headlineTotal(ward) {
  if (!ward) return null;
  let total = null;
  try {
    if (ward.inventoryType === 'guardian') total = calcTotalsGuardian(ward).total;
    else if (ward.inventoryType === 'simplified') total = calcTotals(ward).remaining;
    else if (formEngine(ward.inventoryType) === 'annual') {
      const t = calcTotalsAnnual(ward);
      // Milestone 71E: "has a Schedule D" means entered amounts
      // (schedule-d-figure.js), the same test the carry uses -- the computed
      // ward's-share totals read zero for a D with blank shares (71D).
      total = hasScheduleDFigure(ward) ? t.netAssetsFromD : (t.netAssets || 0);
    }
  } catch (e) { console.warn('Dashboard: could not compute total for ward', ward.wardId, e); }
  return total;
}

/** What core reaches of the features (src/core/runtime/features.js). */
export const featureServices = Object.freeze({
  /** Draw a feature's page into the host; resolves false if superseded or it failed to load. */
  mountPage: (id, container, page, options) => bridge(id).mountPage(container, page, options),
  /** Draw a filing feature's sidebar. */
  mountNav: (id, container) => bridge(id).mountNav(container),
  /** A feature's module, loaded once. */
  load,
  /** A feature's module if it has loaded, else null. */
  loaded: (id) => loadedModules.get(id) || null,
  /** The features loaded so far, by id (GuardianForms.testing's status.loadedFeatures()). */
  loadedFeatures: () => [...loadedModules.keys()].sort(),
  /** A filing engine's export validator, once its feature has loaded (else null). */
  validator(engineId) {
    const fn = loadedModules.get(engineId)?.[validatorFnName(engineId)];
    return typeof fn === 'function' ? fn : null;
  },
  headlineTotal,
  /** The canonical totals, for core code that carries or reports them. */
  totals: Object.freeze({ annual: calcTotalsAnnual, annualReconcile: annualReconcileState, guardian: calcTotalsGuardian, simplified: calcTotals }),
  /**
   * Run one of a feature's own exported commands (its Save as PDF, ...). A
   * loaded feature's runs at once, in the click that asked for it -- a save
   * disables its button before its first await, which is what stops a second
   * click starting a second download (Milestone 67) -- and one not yet loaded
   * is loaded first. Returns what the command returns.
   */
  run(id, name, ...args) {
    const command = (mod) => {
      if (typeof mod[name] !== 'function') throw new Error(`Feature ${id} has no command ${name}`);
      return mod[name](...args);
    };
    const mod = loadedModules.get(id);
    return mod ? command(mod) : load(id).then(command);
  },
  /** The accessible-PDF builders, by filing engine. */
  pdf: Object.freeze({
    guardian: loadGuardianPdf,
    simplified: loadSimplifiedPdf,
    annual: loadAnnualPdf,
    planInitial: loadPlanInitialPdf,
    planAnnual: loadPlanAnnualPdf,
    planMinor: loadPlanMinorPdf,
    planSimplified: loadPlanSimplifiedPdf,
  }),
});
