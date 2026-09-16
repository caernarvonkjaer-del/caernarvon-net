import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';

globalThis.window = globalThis.window || {};
const { fmtD } = await import('../../src/features/annual-accounting/index.js');

// Milestone 51's fmtDate audit found thirteen date-truncating copies in this app,
// in four groups. The five "Group A" copies all shared one latent bug: they
// stringified their input with String(value) before slicing to 10 characters,
// which for a real Date object yields a prefix of Date#toString() --
// locale-dependent AND timezone-shifted. For 2026-05-20T00:00:00Z in a negative
// UTC offset that is "Tue May 19": wrong format and the wrong DAY.
//
// These values reach filed court documents -- Excel cells, PDF bodies, and the
// under-penalties-of-perjury attestation's "from X through Y" line -- so a
// silently off-by-one date is a correctness problem, not a formatting nit.
//
// Not reachable at the time of the fix: both Excel import readers normalize to
// strings, and the fields these helpers format (gid, periodFrom, periodTo,
// signatureDate) are populated from date inputs. Guarded anyway, because the
// cost is one expression and the failure mode is a wrong date in a sworn
// statement.
describe('Group A date-truncation helpers: Date objects', () => {
  // The only Group A copy that is importable; the other four are a classic-script
  // global and three closures local to their excel.js writers, which the source
  // scan below covers instead.
  test('fmtD() normalizes a Date through toISOString(), not Date#toString()', () => {
    expect(fmtD(new Date('2026-05-20T00:00:00Z'))).toBe('2026-05-20');
    // A timestamp late in the UTC day is the case a local-timezone conversion
    // would shift backwards a day.
    expect(fmtD(new Date('2026-01-01T23:59:59Z'))).toBe('2026-01-01');
  });

  test('fmtD() still behaves as before for every non-Date input', () => {
    expect(fmtD('2026-09-15')).toBe('2026-09-15');
    expect(fmtD('2026-09-15T14:30:00Z')).toBe('2026-09-15');
    expect(fmtD('')).toBe('');
    expect(fmtD(null)).toBe('');
    expect(fmtD(undefined)).toBe('');
    expect(fmtD(0)).toBe('');
    expect(fmtD('abc')).toBe('abc');
  });
});

// A source scan, because four of the five copies cannot be imported: one is a
// top-level function in a classic script and three are closures inside an
// exported function's body. This asserts the guard is present in all five rather
// than re-implementing their logic here, which would prove nothing about the
// shipped code.
describe('Group A date-truncation helpers: every copy carries the Date guard', () => {
  const COPIES = [
    { file: 'src/legacy-app.js', name: 'fmtDate' },
    { file: 'src/features/annual-accounting/index.js', name: 'fmtD' },
    { file: 'src/features/annual-accounting/excel.js', name: 'fD' },
    { file: 'src/features/guardian-inventory/excel.js', name: 'fmtD' },
    { file: 'src/features/simplified-accounting/excel.js', name: 'fmtD' },
  ];

  // Matches either declaration shape: `function name(s){...}` /
  // `export function name(s){...}` and `const name=s=>{...}`.
  function bodyOf(source, name) {
    const re = new RegExp(
      `(?:export\\s+)?(?:function\\s+${name}\\s*\\(s\\)|const\\s+${name}\\s*=\\s*s\\s*=>)([\\s\\S]{0,400})`,
    );
    const m = source.match(re);
    return m ? m[1] : null;
  }

  test('finds all five copies, so a rename cannot make this pass vacuously', () => {
    for (const { file, name } of COPIES) {
      const source = fs.readFileSync(path.resolve(process.cwd(), file), 'utf8');
      expect(bodyOf(source, name), `${name} must still be findable in ${file}`).toBeTruthy();
    }
  });

  test.each(COPIES)('$file: $name guards instanceof Date before stringifying', ({ file, name }) => {
    const source = fs.readFileSync(path.resolve(process.cwd(), file), 'utf8');
    const body = bodyOf(source, name);
    expect(body).toBeTruthy();
    // The guard must appear before the first String(...) call in the body,
    // otherwise a Date would already have been stringified by Date#toString().
    const guardAt = body.indexOf('instanceof Date');
    const stringifyAt = body.indexOf('String(');
    expect(guardAt, `${name} in ${file} has no 'instanceof Date' guard`).toBeGreaterThanOrEqual(0);
    expect(stringifyAt, `${name} in ${file} no longer stringifies -- re-check this test`).toBeGreaterThanOrEqual(0);
    expect(
      guardAt,
      `${name} in ${file} stringifies before guarding Date, so Date#toString() wins`,
    ).toBeLessThan(stringifyAt);
    expect(body, `${name} in ${file} must normalize via toISOString()`).toContain('toISOString()');
  });
});
