// Milestone 74E: what the filer types stays as typed (decision 74E-1, the
// requester, 2026-10-06; QA report BUG-09). Names and addresses keep the app's
// capitalization with two token fixes -- a word holding a digit stays as
// typed, and a single letter with a period is an initial and is capitalized --
// while every description or type box keeps exactly what was typed, on its
// page and on import. Before: "margaret a. collins" filed as "Margaret a.
// Collins", "xxxx5510" as "Xxxx5510", and a description was capitalized word
// by word.
import { describe, expect, test } from 'vitest';
import { readFileSync } from 'node:fs';
import { formatAddress, formatCityStateZip, formatName } from '../../src/core/form/form-contract.js';
import { inferFieldKind } from '../../src/core/form/form-fields.js';
import { GUARDIAN_CONTRACT } from '../../src/core/excel/workbook-contract/guardian.js';
import { ANNUAL_CONTRACT } from '../../src/core/excel/workbook-contract/annual.js';
import { SIMPLIFIED_CONTRACT } from '../../src/core/excel/workbook-contract/simplified.js';

describe('names and addresses: the token fixes', () => {
  test("the QA report's cases", () => {
    expect(formatName('margaret a. collins')).toBe('Margaret A. Collins');
    expect(formatName('xxxx5510')).toBe('xxxx5510');
    expect(formatName('iPhone')).toBe('iPhone');
  });

  test('a word holding a digit stays as typed; the words around it as before', () => {
    expect(formatName('unit b12 holdings')).toBe('Unit b12 Holdings');
    expect(formatAddress('100 oak st. suite a4')).toBe('100 Oak St. Suite a4');
  });

  test('an initial is capitalized, even one that reads as a connecting word', () => {
    expect(formatName('harold t. bennett jr.')).toBe('Harold T. Bennett Jr.');
    expect(formatName('mary a. jones of tampa')).toBe('Mary A. Jones of Tampa');
  });

  test('unchanged: connecting words, mixed case, capitals and the city line', () => {
    expect(formatName('Sunrise Assisted Living of Clearwater')).toBe('Sunrise Assisted Living of Clearwater');
    expect(formatName('sunrise assisted living of clearwater')).toBe('Sunrise Assisted Living of Clearwater');
    expect(formatName('Robert McLeod')).toBe('Robert McLeod');
    expect(formatName('Acme Holdings LLC')).toBe('Acme Holdings LLC');
    expect(formatCityStateZip('st. petersburg, fl 33701')).toBe('St. Petersburg, FL 33701');
  });
});

describe('descriptions and types: kept as typed', () => {
  // The Inventory declares each box's kind; a box with none is plain text.
  const inventory = readFileSync('src/features/guardian-inventory/index.js', 'utf8');
  const literal = (s) => s.replace(/[.${}]/g, '\\$&');
  const kindOf = (path) => {
    const call = new RegExp(`textInput\\(\`${literal(path)}\`(?:,'[^']*')?(?:,'(\\w+)')?\\)`).exec(inventory);
    if (call) return call[1] || 'text';
    const raw = new RegExp(`data-bind="${literal(path)}" data-input-type="(\\w+)"`).exec(inventory);
    if (raw) return raw[1];
    throw new Error(`${path}: no box found`);
  };

  test.each([
    'scheduleA1.${i}.propertyDescription', 'scheduleB1.${i}.accountType', 'scheduleB2.${i}.description',
    'scheduleB3.${i}.description', 'scheduleC2.${i}.lawsuitDescription', 'scheduleC3.${i}.actionDescription',
    'scheduleC5.${i}.assetDescription',
  ])("the Inventory's %s box is plain text", (path) => {
    expect(kindOf(path)).toBe('text');
  });

  test("the Inventory's names and addresses still are", () => {
    expect(kindOf('scheduleB1.${i}.institutionName')).toBe('name');
    expect(kindOf('scheduleC2.${i}.claimantName')).toBe('name');
    expect(kindOf('scheduleB3.${i}.streetAddress')).toBe('address');
  });

  test('a label that opens with "Description" or "Type of" is plain text, whatever else it names', () => {
    for (const label of ['Description / Address / Owners', 'Description / Lender / Related Asset',
      'Description of Sale / Address / Parties', 'Type of Trust']) expect(inferFieldKind(label), label).toBe('text');
    expect(inferFieldKind('Name of the Trust')).toBe('name');
    expect(inferFieldKind('Name of the Trustee')).toBe('name');
    expect(inferFieldKind('Street Address')).toBe('address');
  });

  test("the Simplified's remuneration Type box declares no name format", () => {
    const simplified = readFileSync('src/features/simplified-accounting/index.js', 'utf8');
    const box = /<input[^>]*data-form-path="remuneration\.\$\{i\}\.type"[^>]*>/.exec(simplified)?.[0];
    expect(box).toBeTruthy();
    expect(box).not.toContain('data-form-format="name"');
    expect(box).not.toContain('formatName(');
  });

  test('no import formats a description or a type', () => {
    for (const [form, contract] of [['guardian', GUARDIAN_CONTRACT], ['annual', ANNUAL_CONTRACT], ['simplified', SIMPLIFIED_CONTRACT]]) {
      for (const [kind, paths] of Object.entries(contract.casing)) {
        for (const p of paths) expect(/description|type$/i.test(p.split('.').pop()), `${form} ${kind}: ${p}`).toBe(false);
      }
    }
  });
});
