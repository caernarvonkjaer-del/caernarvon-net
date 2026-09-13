import { test, expect } from '@playwright/test';
import { freshStartNoPassword } from './support/target';

// Milestone 42F oracle. Every validateX() now states each issue's field path
// itself (validation-issue.js) instead of leaving validation-adapter.js to
// pattern-match it out of the message text. This spec runs each validator
// in the real app against (1) a blank filing and (2) a deliberately
// "worst" one -- every tri-state answered Yes, one empty row in every
// collection, reporting dates reversed -- so conditional and row-indexed
// branches fire too, and checks every issue against the pre-42F
// derivation (_legacyDerivePath, kept only for this until Step 3 of 42F
// deletes it): wherever the old text-matching found a path, the explicit
// one must agree with it. A validator that still pushes a bare string
// shows up as a non-object issue.
//
// After Step 3 this spec keeps running without the legacy comparison:
// every issue must be an object with a message and a section, and every
// type must resolve a path for at least one issue.

const TYPES = ['guardian', 'simplified', 'annual', 'finalAccounting', 'trustAccounting', 'planSimplified', 'planAnnual', 'planInitial', 'planMinor'];

const VALIDATOR: Record<string, string> = {
  guardian: 'validateGuardian', simplified: 'validateSimplified', annual: 'validateAnnual',
  finalAccounting: 'validateAnnual', trustAccounting: 'validateAnnual', planSimplified: 'validatePlanSimplified',
  planAnnual: 'validatePlanAnnual', planInitial: 'validatePlanInitial', planMinor: 'validatePlanMinor',
};

type Row = { message: string; isObject: boolean; section: string; explicit: string; legacy: string | null };

// Messages the pre-42F text matching sent to the WRONG field. The explicit
// path is the correct one; these are the misroutes 42F exists to end, kept
// here as evidence until Step 3 deletes _legacyDerivePath. Key: message
// prefix -> the field the old chain wrongly resolved to.
const KNOWN_LEGACY_MISROUTES: Array<{ type: string; message: RegExp; legacyWrong: string; because: string }> = [
  // 'printed name' was matched before the attorney-specific branch, so the
  // attorney's own printed-name message went to the guardian's name field.
  { type: 'planAnnual', message: /^Signatures — Attorney printed name is required/, legacyWrong: 'planGuardians.0.name', because: 'attorney message matched the guardian "printed name" keyword first' },
  // Guardian Inventory had no Cover branch at all, so its Cover messages hit
  // the generic fallback, where anything containing "guardian" went to the
  // D-1 guardian's name field.
  { type: 'guardian', message: /^Cover — Guardianship Inception Date \(GID\)/, legacyWrong: 'guardians.0.name', because: '"guardianship" contains "guardian"' },
  { type: 'guardian', message: /^Cover — Guardian Name\(s\)/, legacyWrong: 'guardians.0.name', because: 'top-level guardianName, not the D-1 collection' },
  { type: 'guardian', message: /^Cover — Attorney for Guardian/, legacyWrong: 'guardians.0.name', because: 'contains "guardian"' },
  { type: 'guardian', message: /^Cover — Type of Guardianship/, legacyWrong: 'guardians.0.name', because: '"guardianship" contains "guardian"' },
  // The A-2 branch's `|| dLower.includes('lender')` catch-all sent every
  // Lender message to the Lender Name field.
  { type: 'guardian', message: /^A-2 row \d+ — Lender Address/, legacyWrong: /^scheduleA2\.\d+\.lenderName$/ as unknown as string, because: 'A-2 "lender" catch-all' },
  { type: 'guardian', message: /^A-2 row \d+ — Lender City\/State\/Zip/, legacyWrong: /^scheduleA2\.\d+\.lenderName$/ as unknown as string, because: 'A-2 "lender" catch-all' },
];

async function collect(page: import('@playwright/test').Page, validator: string, worst: boolean): Promise<Row[]> {
  return page.evaluate(([fn, makeWorst]) => {
    const w = window as any;
    const D = w.D;
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
    }
    const issues = w[fn]();
    const legacy = typeof w._legacyDerivePath === 'function' ? w._legacyDerivePath : null;
    return issues.map((issue: any) => {
      const isObject = issue !== null && typeof issue === 'object';
      const message = isObject ? String(issue.message) : String(issue);
      const dash = message.indexOf(' — ');
      const section = isObject ? String(issue.section || '') : (dash > -1 ? message.slice(0, dash).trim() : '');
      const detail = dash > -1 ? message.slice(dash + 3).trim() : message;
      return {
        message, isObject, section,
        explicit: isObject ? String(issue.path || '') : '',
        legacy: legacy ? String(legacy(section, detail, D.inventoryType) || '') : null,
      };
    });
  }, [validator, worst] as const);
}

test.describe('Milestone 42F: validators state their own field paths', () => {
  for (const type of TYPES) {
    test(`${type}: explicit paths agree with the pre-42F text-matched derivation`, async ({ page }) => {
      await freshStartNoPassword(page);
      await page.evaluate((t) => (window as any).addWard(`Oracle ${t}`, t), type);
      await page.waitForFunction((fn) => typeof (window as any)[fn] === 'function', VALIDATOR[type]);

      const rows = [...await collect(page, VALIDATOR[type], false), ...await collect(page, VALIDATOR[type], true)];
      expect(rows.length, 'a blank/worst filing must produce issues').toBeGreaterThan(0);

      const bareStrings = rows.filter((r) => !r.isObject).map((r) => r.message);
      expect(bareStrings, 'issues still pushed as bare strings').toEqual([]);

      const noSection = rows.filter((r) => !r.section).map((r) => r.message);
      expect(noSection, 'issues with no section').toEqual([]);

      const legacyMatches = (expected: string | RegExp, actual: string | null) =>
        actual !== null && (expected instanceof RegExp ? expected.test(actual) : expected === actual);
      const isKnownMisroute = (r: Row) => KNOWN_LEGACY_MISROUTES.some((k) => k.type === type && k.message.test(r.message) && legacyMatches(k.legacyWrong as unknown as string | RegExp, r.legacy));
      const legacyKnown = rows.filter((r) => r.legacy !== null && !isKnownMisroute(r));
      if (legacyKnown.length) {
        const disagree = legacyKnown
          .filter((r) => r.legacy && r.explicit !== r.legacy)
          .map((r) => `${r.message}\n      explicit=${r.explicit || '(none)'}  legacy=${r.legacy}`);
        expect(disagree, 'explicit path disagrees with the pre-42F derivation').toEqual([]);
        const lost = legacyKnown.filter((r) => r.legacy && !r.explicit).map((r) => r.message);
        expect(lost, 'legacy derived a path but the validator states none').toEqual([]);
      }
      expect(rows.some((r) => r.explicit), 'at least one issue resolves a path').toBe(true);
    });
  }
});
