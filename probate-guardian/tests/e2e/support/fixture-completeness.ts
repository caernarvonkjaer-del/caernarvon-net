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
    // Milestone 70, 70T: the app is reached only through GuardianForms.testing.
    const t = w.GuardianForms.testing;
    w.__pgBuildFixture = (type: string, ...overlays: any[]) => {
      // initializeEmptyData() stamps inventoryType only for the annual engine
      // (its three types share one factory and have to be told apart). Every
      // other type gets it from the ward record instead, which a fixture has
      // no equivalent of -- so it is stamped here, or nothing downstream can
      // tell what filing this is.
      const empty = t.createFiling.emptyData(type);
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
      for (const [k] of t.constants('PLAN_RIGHTS') || []) rights[k] = 'Not removed';
      const adls: Record<string, string> = {};
      for (const [k] of t.constants('PLAN_ADLS') || []) adls[k] = 'Ward needs no help';
      return { rights, adls };
    };

    // The export-gate issues for a filing that exists only as data: the
    // app's own blank filing of the type with the fixture on top, JSON
    // round-tripped as storage would, judged by the type's validator and
    // prepareFilingOutput() -- all inside the adapter, which restores the open
    // filing afterwards (it used to swap window.D here).
    w.__pgFixtureIssues = (fixture: any) => t.validate.fixture(fixture);
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
