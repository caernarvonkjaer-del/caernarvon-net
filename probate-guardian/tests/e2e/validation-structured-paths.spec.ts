import { test, expect } from '@playwright/test';
import { freshStartNoPassword } from './support/target';

// Milestone 42F. Every validateX() states each issue's field path itself
// (src/core/validation/validation-issue.js) instead of leaving
// validation-adapter.js to pattern-match it out of the message text. This
// spec runs each validator in the real app against (1) a blank filing and
// (2) a deliberately "worst" one -- every tri-state answered Yes, one empty
// row in every collection, reporting dates reversed -- so conditional and
// row-indexed branches fire too, and asserts every issue is a structured
// object with a section, and that field issues carry a path.
//
// During the migration this spec was the oracle: it compared each explicit
// path against the pre-42F text-matching chain (kept temporarily as
// _legacyDerivePath) and was red for all nine types until every validator
// converted. The disagreements it surfaced were the old chain's misroutes,
// now fixed by the explicit paths: Plan Annual's "Attorney printed name"
// went to the guardian's name field; four Guardian Inventory Cover messages
// (GID, Attorney for Guardian, Type of Guardianship, Guardian Name(s)) went
// to guardians.0.name because they contain "guardian"; and A-2's
// `|| includes('lender')` catch-all sent Lender Address and Lender
// City/State/Zip to Lender Name. The chain is deleted; this is the guard.

const TYPES = ['guardian', 'simplified', 'annual', 'finalAccounting', 'trustAccounting', 'planSimplified', 'planAnnual', 'planInitial', 'planMinor'];

const VALIDATOR: Record<string, string> = {
  guardian: 'validateGuardian', simplified: 'validateSimplified', annual: 'validateAnnual',
  finalAccounting: 'validateAnnual', trustAccounting: 'validateAnnual', planSimplified: 'validatePlanSimplified',
  planAnnual: 'validatePlanAnnual', planInitial: 'validatePlanInitial', planMinor: 'validatePlanMinor',
};

type Row = { message: string; isObject: boolean; section: string; path: string; code: string };

async function collect(page: import('@playwright/test').Page, validator: string, worst: boolean): Promise<Row[]> {
  // The open filing's own validator runs (the one `validator` names for its type).
  void validator;
  return page.evaluate(async ([makeWorst]) => {
    const t = (window as any).GuardianForms.testing;
    // Setup (D9): the worst case is built on a copy and written back in one patchFiling().
    const D = t.snapshot().filing;
    if (makeWorst) {
      for (const key of Object.keys(D)) {
        const v = D[key];
        if (v === '') D[key] = 'Yes';
        else if (Array.isArray(v)) { if (!v.length || typeof v[0] === 'object') v.push({}); }
      }
      D.periodFrom = '2026-02-01';
      D.periodTo = '2026-01-01';
      D.gid = '2027-01-01';
      D.inceptionDate = '2027-01-01';
      D.wardName = '';
      D.county = '';
      t.replaceFiling(D);
    }
    return (await t.validate.open()).map((issue: any) => {
      const isObject = issue !== null && typeof issue === 'object';
      return {
        message: isObject ? String(issue.message) : String(issue),
        isObject,
        section: isObject ? String(issue.section || '') : '',
        path: isObject ? String(issue.path || '') : '',
        code: isObject ? String(issue.code || '') : '',
      };
    });
  }, [worst] as const);
}

test.describe('Milestone 42F: validators state their own field paths', () => {
  for (const type of TYPES) {
    test(`${type}: every issue is a structured object; field issues carry a path`, async ({ page }) => {
      await freshStartNoPassword(page);
      await page.evaluate((t) => (window as any).GuardianForms.testing.createFiling.add(`Structured ${t}`, t), type);
      // validate.open() loads the filing type's validator if it is not loaded yet.

      const rows = [...await collect(page, VALIDATOR[type], false), ...await collect(page, VALIDATOR[type], true)];
      expect(rows.length, 'a blank/worst filing must produce issues').toBeGreaterThan(0);

      expect(rows.filter((r) => !r.isObject).map((r) => r.message), 'issues still pushed as bare strings').toEqual([]);
      expect(rows.filter((r) => !r.section).map((r) => r.message), 'issues with no section').toEqual([]);
      expect(rows.filter((r) => !r.path).map((r) => r.message), 'issues with no field path').toEqual([]);

      // Codes are filing-scoped (issue-registry.js recognises the prefix as a
      // bypassable validation issue), and this validator's own filing type,
      // not a sibling's -- Annual/Final/Trust share a validator and must
      // each name themselves.
      const wrongType = rows.filter((r) => !r.code.startsWith(`${type}.`)).map((r) => `${r.code}: ${r.message}`);
      expect(wrongType, 'issue codes not scoped to this filing type').toEqual([]);

      // The same message must always name the same field.
      const byMessage = new Map<string, Set<string>>();
      for (const r of rows) byMessage.set(r.message, new Set([...(byMessage.get(r.message) || []), r.path]));
      expect([...byMessage].filter(([, paths]) => paths.size > 1).map(([m]) => m), 'one message resolving to several paths').toEqual([]);
    });
  }
});
