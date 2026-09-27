// Milestone 70, 70K: the feature services -- what core reaches of the filing
// features (src/core/runtime/features.js), built by the composition root from
// src/features-loader.js and handed to startGuardianForms(). They replaced the
// monolith's services (src/core/runtime/monolith.js) and its window.mount*,
// window.load* and window.validate* globals; tests/unit/monolith-services.spec.js
// and tests/unit/legacy-bridge.spec.js, which held those two doors, went with
// them. Two feature packs are stood in for, so a load is observable.
import { describe, expect, test, vi } from 'vitest';

const packs = vi.hoisted(() => ({ loads: [] }));
vi.mock('../../src/features/plan-minor/index.js', () => {
  packs.loads.push('planMinor');
  return {
    validatePlanMinor: () => [{ message: 'Minor' }],
    doSavePdfPlanMinor: async (arg) => `saved ${arg}`,
    startNow: () => 'started now',
    // An export that is not a command (a constant a feature might export).
    notACommand: 'a value',
    mount: async () => {},
    mountNav: () => {},
  };
});
vi.mock('../../src/features/guardian-inventory/index.js', () => {
  packs.loads.push('guardian');
  return { validateGuardian: () => [], mount: async () => {}, mountNav: () => {} };
});

const { featureServices } = await import('../../src/features-loader.js');
const { calcTotalsGuardian } = await import('../../src/features/guardian-inventory/totals.js');
const { calcTotals } = await import('../../src/features/simplified-accounting/totals.js');
const { calcTotalsAnnual } = await import('../../src/features/annual-accounting/totals.js');
const { FILING_ENGINE_IDS } = await import('../../src/core/filing/filing-descriptor.js');

describe('src/core/runtime/features.js: provided once, before anything uses it', () => {
  test('asking before the root provided it throws rather than doing nothing; afterwards it is what was provided', async () => {
    vi.resetModules();
    const f = await import('../../src/core/runtime/features.js');
    expect(f.hasFeatureServices()).toBe(false);
    expect(() => f.features()).toThrow('before startGuardianForms() provided the feature services');
    expect(() => f.provideFeatureServices(null)).toThrow();
    const services = { load: () => {} };
    f.provideFeatureServices(services);
    expect(f.hasFeatureServices()).toBe(true);
    expect(f.features()).toBe(services);
  });
});

describe("src/features-loader.js's feature services", () => {
  test('a feature loads once, and its validator exists only once it has', async () => {
    expect(featureServices.loadedFeatures()).toEqual([]);
    expect(featureServices.loaded('planMinor')).toBeNull();
    expect(featureServices.validator('planMinor')).toBeNull();
    const [a, b] = await Promise.all([featureServices.load('planMinor'), featureServices.load('planMinor')]);
    expect(a).toBe(b);
    expect(packs.loads.filter((x) => x === 'planMinor')).toEqual(['planMinor']);
    expect(featureServices.loaded('planMinor')).toBe(a);
    expect(featureServices.loadedFeatures()).toEqual(['planMinor']);
    expect(featureServices.validator('planMinor')()).toEqual([{ message: 'Minor' }]);
  });

  test("completion's inputs carry the Inventory's validator only once its feature has loaded", async () => {
    expect(featureServices.completionDeps().validateGuardian).toBeUndefined();
    expect(typeof featureServices.completionDeps().calcTotalsAnnual).toBe('function');
    await featureServices.load('guardian');
    expect(typeof featureServices.completionDeps().validateGuardian).toBe('function');
  });

  test("run() loads a feature and runs one of its own commands; one it does not have is refused", async () => {
    expect(await featureServices.run('planMinor', 'doSavePdfPlanMinor', 'x')).toBe('saved x');
    expect(() => featureServices.run('planMinor', 'notACommand')).toThrow('has no command notACommand');
  });

  // Milestone 67: a save disables its button before its first await, so a
  // second click does nothing. A loaded feature's command therefore starts in
  // the click itself, with no await in front of it: its own return value comes
  // straight back, not a promise (export-button-guard.spec.ts holds the button).
  test("run() starts a loaded feature's command at once, in the same turn", async () => {
    await featureServices.load('planMinor');
    expect(featureServices.run('planMinor', 'startNow')).toBe('started now');
  });

  test('every filing engine and the dashboard has a loader; an unknown feature is refused', () => {
    for (const id of [...FILING_ENGINE_IDS, 'dashboard']) expect(() => featureServices.loaded(id)).not.toThrow();
    expect(() => featureServices.load('nope')).toThrow('No feature named nope');
    expect(() => featureServices.mountNav('nope', {})).toThrow('No feature named nope');
    expect(Object.keys(featureServices.pdf).sort()).toEqual([...FILING_ENGINE_IDS].sort());
  });

  // The dashboard's figure for each kind of filing -- moved from legacy-app.js's
  // getWardHeadlineTotal(), and computed for a filing whose feature never loaded.
  test("the headline total is each form's own figure for the filing handed in", () => {
    const inventory = { inventoryType: 'guardian', scheduleA1: [{ fullAssetValue: '150', wardPercent: '100' }] };
    expect(featureServices.headlineTotal(inventory)).toBe(calcTotalsGuardian(inventory).total);
    const simplified = { inventoryType: 'simplified', startingBalance: '1000' };
    expect(featureServices.headlineTotal(simplified)).toBe(calcTotals(simplified).remaining);
    for (const inventoryType of ['annual', 'finalAccounting', 'trustAccounting']) {
      const t = calcTotalsAnnual({ inventoryType });
      expect(featureServices.headlineTotal({ inventoryType })).toBe(t.netAssetsFromD !== 0 ? t.netAssetsFromD : (t.netAssets || 0));
    }
    expect(featureServices.headlineTotal({ inventoryType: 'planMinor' })).toBeNull();
    expect(featureServices.headlineTotal(null)).toBeNull();
  });

  test('the services are frozen, and put nothing on window', () => {
    expect(Object.isFrozen(featureServices)).toBe(true);
    expect(typeof globalThis.window === 'undefined' || !('loadGuardianFeature' in globalThis.window)).toBe(true);
  });
});
