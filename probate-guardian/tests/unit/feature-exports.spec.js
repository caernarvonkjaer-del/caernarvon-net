import { describe, expect, test } from 'vitest';
import { readFile } from 'node:fs/promises';

// Every filing feature module must keep exporting its validator. These are
// consumed across the app (readiness panels, export preflight, navigation
// checks) through the module's public surface, and the whole feature silently
// fails to mount if one stops being exported.
//
// This is a source-level check because these modules are browser feature
// modules -- they are not importable in a node unit test. The gap it closes is
// real and was found the hard way: a text edit that inserted a declaration
// between `export` and `function validateGuardian(){` turned the export into
// `export const <helper>` and detached the validator. The full unit suite
// (456 tests) still passed, `tsc --noEmit` passed, and `node --check` passed,
// because `export const …` is perfectly valid syntax. Only an e2e timeout
// revealed it, three specs deep.
const VALIDATORS = {
  'annual-accounting': 'validateAnnual',
  'guardian-inventory': 'validateGuardian',
  'plan-annual': 'validatePlanAnnual',
  'plan-initial': 'validatePlanInitial',
  'plan-minor': 'validatePlanMinor',
  'plan-simplified': 'validatePlanSimplified',
  'simplified-accounting': 'validateSimplified',
};

describe('filing feature modules keep their public validator export', () => {
  for (const [feature, validator] of Object.entries(VALIDATORS)) {
    test(`${feature} exports ${validator}`, async () => {
      const source = await readFile(
        new URL(`../../src/features/${feature}/index.js`, import.meta.url),
        'utf8'
      );
      // Must be the export keyword immediately followed by the declaration --
      // anything wedged between them detaches the export from the function.
      const pattern = new RegExp(`^export\\s+(?:async\\s+)?function\\s+${validator}\\s*\\(`, 'm');
      expect(
        pattern.test(source),
        `${feature}/index.js must declare "export function ${validator}(" with nothing between export and function`
      ).toBe(true);
    });
  }
});
