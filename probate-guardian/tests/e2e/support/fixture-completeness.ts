import { expect, type Page } from '@playwright/test';

// Milestone 57A follow-up: a fixture-completeness assertion.
//
// The PDF specs build their documents by calling the model builders directly
// in the page -- buildVerifiedInventoryModel(d), buildAnnualAccountingModel(d)
// -- with a hand-written object literal. That path never touches the export
// gate, so a fixture can be missing a field the court requires and every
// assertion in the spec still passes. The PDF under test is then a document no
// filer could actually submit, and the spec quietly stops describing the
// product.
//
// 57A was the first instance to surface: pdf-structure-tags called its state
// "full Verified Initial Inventory mock state" while never answering the bond
// waiver, because the bond waiver did not exist when the literal was written.
// Nothing in the suite noticed, and nothing would have noticed the next one.
//
// So this runs the real export boundary over a fixture and reports what would
// have blocked it. It is the same authority the Excel and PDF save actions
// consult -- window.prepareFilingOutput(), fed by the filing type's own
// validator -- not a second opinion maintained alongside it. A field that
// becomes required in the product becomes required here on the same commit,
// with no test-side list to remember to update.

/** One blocking issue, flattened for transport across the page boundary. */
export type FixtureIssue = {
  code: string;
  message: string;
  /** false when the filer cannot acknowledge it away. */
  bypassable: boolean;
};

/**
 * Installs the page-side fixture helpers: __pgMergeFixture (merge an overlay
 * onto a filing), __pgBuildFixture (a filing built the way the app builds
 * one), and __pgFixtureIssues (what would block that filing at the export
 * gate).
 *
 * Call once per page, after the app has loaded. They have to live inside
 * the page because that is where the fixtures are: they are object literals
 * declared inside the spec's own page.evaluate() callback, so a Node-side
 * helper can never see them. It is async because each filing type's validator
 * only reaches window when that feature module is loaded, and a spec that
 * builds a PDF has loaded the type's *pdf* module, not its feature module.
 *
 * The validators read window.D rather than taking an argument, so the probe
 * swaps it -- the same trick getWardProgress() uses in legacy-app.js, and
 * under the same rule it documents: the swap and the restore have no await
 * between them, so nothing can observe D pointing at the wrong filing. The
 * feature module is loaded before the swap opens, for exactly that reason.
 *
 * The fixture is deep-copied first, because prepareFilingOutput() commits
 * pending date drafts into whatever it is given and the caller's object goes
 * on to build the PDF being asserted against. The probe must not be able to
 * change the document under test.
 */
export async function installFixtureSupport(page: Page): Promise<void> {
  await page.evaluate(() => {
    const w = window as any;

    // Merges a fixtures.ts overlay onto a base filing. Recursive rather than
    // Object.assign because the overlays describe rows: guardians[0] carries
    // only the fields that make a guardian complete, and must land *in* the
    // base's row rather than replacing it and dropping every key the app's
    // own factory defined there. A scalar always wins, so an overlay can set
    // a field empty.
    //
    // An overlay array decides the list's length, and each entry is merged
    // onto the base entry at the same index. Keeping surplus base rows instead
    // would mean an overlay could never say "none": a test that empties
    // serviceRecipients to exercise the empty-list fallback would silently
    // keep the base's recipient and assert against the wrong document.
    w.__pgMergeFixture = function mergeFixture(base: any, overlay: any): any {
      if (Array.isArray(overlay)) {
        return overlay.map((v: any, i: number) => mergeFixture(Array.isArray(base) ? base[i] : undefined, v));
      }
      if (overlay && typeof overlay === 'object') {
        const out = base && typeof base === 'object' && !Array.isArray(base) ? { ...base } : {};
        for (const k of Object.keys(overlay)) out[k] = mergeFixture(out[k], overlay[k]);
        return out;
      }
      return overlay;
    };

    // Builds a filing the way the app builds one: the app's own empty filing
    // for the type, then each overlay in turn -- normally fixtures.ts's
    // MINIMAL_VALID_* followed by whatever the individual test is actually
    // about. What the builders receive is then the same shape a real filing
    // has, not a literal that happens to carry the keys one test reads.
    w.__pgBuildFixture = (type: string, ...overlays: any[]) => {
      if (typeof w.initializeEmptyData !== 'function') {
        throw new Error('initializeEmptyData is not reachable; legacy-app.js has not loaded');
      }
      // initializeEmptyData() stamps inventoryType only for the annual engine
      // (its three types share one factory and have to be told apart). Every
      // other type gets it from the ward record instead, which a fixture has
      // no equivalent of -- so it is stamped here, or nothing downstream can
      // tell what filing this is.
      const empty = w.initializeEmptyData(type);
      if (!empty.inventoryType) empty.inventoryType = type;
      return overlays.reduce((acc: any, overlay: any) => w.__pgMergeFixture(acc, overlay), empty);
    };
    // The plan types answer one question per right and per ADL, and the lists
    // themselves are the app's (window.PLAN_RIGHTS / PLAN_ADLS). A static
    // overlay cannot carry them: the answer set has to be derived from
    // whatever the app currently defines, or a plan fixture goes stale the
    // moment a right is added. Returned as an overlay to sit between the
    // MINIMAL_VALID_* base and a test's own values.
    w.__pgPlanDefaults = () => {
      const rights: Record<string, string> = {};
      for (const [k] of w.PLAN_RIGHTS || []) rights[k] = 'Not removed';
      const adls: Record<string, string> = {};
      for (const [k] of w.PLAN_ADLS || []) adls[k] = 'Ward needs no help';
      return { rights, adls };
    };

    const BY_TYPE: Record<string, { validator: string; feature: string }> = {
      guardian: { validator: 'validateGuardian', feature: 'loadGuardianFeature' },
      annual: { validator: 'validateAnnual', feature: 'loadAnnualFeature' },
      finalAccounting: { validator: 'validateAnnual', feature: 'loadAnnualFeature' },
      trustAccounting: { validator: 'validateAnnual', feature: 'loadAnnualFeature' },
      simplified: { validator: 'validateSimplified', feature: 'loadSimplifiedFeature' },
      planAnnual: { validator: 'validatePlanAnnual', feature: 'loadPlanAnnualFeature' },
      planInitial: { validator: 'validatePlanInitial', feature: 'loadPlanInitialFeature' },
      planMinor: { validator: 'validatePlanMinor', feature: 'loadPlanMinorFeature' },
      planSimplified: { validator: 'validatePlanSimplified', feature: 'loadPlanSimplifiedFeature' },
    };

    w.__pgFixtureIssues = async (fixture: any) => {
      const type = fixture?.inventoryType || '';
      const entry = BY_TYPE[type];
      if (!entry) {
        throw new Error(
          `fixture has no recognized inventoryType (got ${JSON.stringify(type)}). `
          + 'A fixture that does not say what it is cannot be checked against the '
          + "court's requirements for that filing.",
        );
      }
      if (typeof w[entry.validator] !== 'function' && typeof w[entry.feature] === 'function') {
        await w[entry.feature]();
      }
      if (typeof w[entry.validator] !== 'function') {
        throw new Error(`${entry.validator} is not available even after ${entry.feature}()`);
      }

      // A bare literal is not a shape the app can ever hold. Every real
      // filing starts life as initializeEmptyData(type) and has the filer's
      // answers written over it, so the validators are entitled to assume the
      // collections that factory guarantees -- validateAnnual() goes straight
      // to d.guardians.forEach without a guard, and a literal that omits it
      // crashes the validator instead of being judged by it.
      //
      // So the fixture is judged as the app would hold it: the app's own
      // factory underneath, the fixture's values on top. This reads
      // initializeEmptyData off window because legacy-app.js is a classic
      // script, not a module -- its top-level functions are already globals,
      // so no product change is needed to reach it.
      //
      // JSON round-tripping afterwards is what the app's own storage does to a
      // filing, so it is the shape the product actually validates.
      if (typeof w.initializeEmptyData !== 'function') {
        throw new Error('initializeEmptyData is not reachable; legacy-app.js has not loaded');
      }
      const copy = JSON.parse(JSON.stringify({ ...w.initializeEmptyData(type), ...fixture }));
      const prevD = w.D;
      w.D = copy;
      try {
        const raw = w[entry.validator](copy) || [];
        const pre = w.prepareFilingOutput(copy, raw);
        return (pre.structuredIssues || []).map((i: any) => ({
          code: String(i?.code || ''),
          message: String(i?.message || ''),
          bypassable: i?.bypassable !== false,
        }));
      } finally {
        w.D = prevD;
      }
    };
  });
}

/**
 * Asserts a fixture would survive the export gate.
 *
 * `allow` is the deliberate exceptions map, issue code to reason, and an entry
 * in it is a decision rather than a formality: it says this fixture is
 * knowingly incomplete because completing it would destroy what the test
 * exists to prove. A stale entry fails too -- once the fixture stops producing
 * an exempted code, the exemption has to go, or the next real instance of that
 * code is waved through by a comment about something else.
 */
export function expectFileableFixture(
  issues: FixtureIssue[],
  label: string,
  allow: Record<string, string> = {},
): void {
  const allowed = new Set(Object.keys(allow));
  const seen = new Set(issues.map((i) => i.code));

  const unexpected = issues.filter((i) => !allowed.has(i.code));
  expect(
    unexpected.map((i) => `${i.code}${i.bypassable ? '' : ' (hard block)'}: ${i.message}`),
    `${label} is not a fileable filing -- the PDF built from it is a document `
      + 'no filer could submit. Fill the missing fields in, or, if this fixture is '
      + 'deliberately incomplete, add the code to its allow map with the reason.',
  ).toEqual([]);

  const stale = [...allowed].filter((code) => !seen.has(code));
  expect(
    stale,
    `${label} has allow entries for issues it no longer produces. Remove them, `
      + 'or a later regression of the same code is exempted by a note about something else.',
  ).toEqual([]);
}
