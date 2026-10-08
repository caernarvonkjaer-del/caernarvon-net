import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';

globalThis.window = globalThis.window || {};
// Milestone 73H: the Annual's screens show dates through displayDate(); the
// re-export of the importer's fmtDate as fmtD, which this spec reached, is gone.
const { displayDate } = await import('../../src/core/form/date-parser.js');
const { fmtDate } = await import('../../src/core/excel/cell-reader.js');

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
  // Both remaining Group A copies are importable as of Milestone 53B, which
  // moved legacy-app.js's fmtDate into src/core/excel/cell-reader.js -- it was
  // a classic-script global before and could only be source-scanned. The other
  // three were closures local to their excel.js writers until Milestone 67E
  // retired them (see the source-scan block below).
  test('displayDate() normalizes a Date through toISOString(), not Date#toString()', () => {
    expect(displayDate(new Date('2026-05-20T00:00:00Z'))).toBe('05/20/2026');
    // A timestamp late in the UTC day is the case a local-timezone conversion
    // would shift backwards a day.
    expect(displayDate(new Date('2026-01-01T23:59:59Z'))).toBe('01/01/2026');
  });

  test('displayDate() for every non-Date input: MM/DD/YYYY, blank empty, other text as it is', () => {
    expect(displayDate('2026-09-15')).toBe('09/15/2026');
    expect(displayDate('2026-09-15T14:30:00Z')).toBe('09/15/2026');
    expect(displayDate('')).toBe('');
    expect(displayDate(null)).toBe('');
    expect(displayDate(undefined)).toBe('');
    expect(displayDate('abc')).toBe('abc');
  });

  test('fmtDate() normalizes a Date through toISOString(), not Date#toString()', () => {
    expect(fmtDate(new Date('2026-05-20T00:00:00Z'))).toBe('2026-05-20');
    expect(fmtDate(new Date('2026-01-01T23:59:59Z'))).toBe('2026-01-01');
  });

  test('fmtDate() still behaves as before for every non-Date input', () => {
    expect(fmtDate('2026-09-15')).toBe('2026-09-15');
    expect(fmtDate('2026-09-15T14:30:00Z')).toBe('2026-09-15');
    expect(fmtDate('')).toBe('');
    expect(fmtDate(null)).toBe('');
    expect(fmtDate(undefined)).toBe('');
    expect(fmtDate(0)).toBe('');
    expect(fmtDate('abc')).toBe('abc');
  });

  // Milestone 53C made annual-accounting's fmtD a RE-EXPORT of cell-reader.js's
  // fmtDate, not a second implementation. Milestone 73H: that form's screens
  // show dates through displayDate() (MM/DD/YYYY, the guard above), so it keeps
  // no date reader of its own at all -- no fmtD, no copy that could drift.
  test('annual-accounting/index.js keeps no date reader of its own; it shows dates through displayDate()', () => {
    const source = fs.readFileSync(path.resolve('src/features/annual-accounting/index.js'), 'utf8');
    expect(source, 'no call, binding or re-export of fmtD').not.toMatch(/\bfmtD\s*\(|import \{[^}]*\bas fmtD\b|export \{ fmtD/);
    expect(source).toContain('displayDate(d.periodFrom)');
  });
});

// A source scan, because this copy was a top-level function in a classic
// script when the guard was written (it is importable since Milestone 53B,
// but the scan is kept: it proves the guard precedes the first String() call,
// which the behavioural test cannot). Asserting the guard is present rather
// than re-implementing the logic here, which would prove nothing about the
// shipped code.
//
// Milestone 67E: the three excel.js closures (annual's fD, guardian's and
// simplified's fmtD) that used to be scanned alongside are DELETED. Every
// Excel date write now goes through setDateCell()/toExcelSerialDate() in
// src/core/excel/excel-engine.js, which never stringifies a Date at all --
// it takes the UTC year, month and day and writes a serial. tests/unit/
// excel-engine.spec.js covers that path and asserts the closures stay gone.
describe('Group A date-truncation helpers: every copy carries the Date guard', () => {
  const COPIES = [
    // Milestone 53B moved this copy out of legacy-app.js (a classic script) into
    // an ES module; the guard it carries is unchanged. Milestone 53C made
    // annual-accounting/index.js's fmtD a re-export of it, covered by the
    // identity assertion above, which is strictly stronger than a scan.
    { file: 'src/core/excel/cell-reader.js', name: 'fmtDate' },
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

  test('finds the copy, so a rename cannot make this pass vacuously', () => {
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
