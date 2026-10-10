import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { SUPPORTING_DOC_SECTIONS, supportingDocSections } from '../../src/core/pdf/document-sections.js';
import { FILING_TYPE_KEYS, resolveDescriptorForInventoryType } from '../../src/core/filing/filing-descriptor.js';

// Found 2026-10-10: supporting documents never reached the PDF on the Plan for
// Minors (its table was keyed by a title the registry spells differently), the
// Simplified Accounting (no entry) and the Initial Plan's Attorney screen (no
// entry). This guards the table against the next screen or rename: every
// screen with an upload control has an entry, naming a section the form's PDF
// model draws. Where each document lands is proven against the saved PDF by
// tests/e2e/supporting-documents-reach-pdf.spec.ts.

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const uploadKeys = (feature) => [...read(`src/features/${feature}/index.js`).matchAll(/renderScheduleDocsSection\('([^']+)'\)/g)].map((m) => m[1]);
// Coarse: every `id:` in the model, sections and their parts alike.
const sectionIds = (feature) => new Set([...read(`src/features/${feature}/pdf-model.js`).matchAll(/\bid: '([^']+)'/g)].map((m) => m[1]));

const MAPPED = { planAnnual: 'plan-annual', planInitial: 'plan-initial', planMinor: 'plan-minor', planSimplified: 'plan-simplified', simplified: 'simplified-accounting' };

describe('Supporting documents: which PDF section each screen\'s documents follow', () => {
  it('the table is keyed by filing type', () => {
    expect(Object.keys(SUPPORTING_DOC_SECTIONS).every((type) => FILING_TYPE_KEYS.includes(type))).toBe(true);
    expect(Object.keys(SUPPORTING_DOC_SECTIONS).sort()).toEqual(Object.keys(MAPPED).sort());
  });

  for (const [type, feature] of Object.entries(MAPPED)) {
    it(`${type}: every screen with an upload control has an entry, naming a section its PDF draws`, () => {
      const keys = uploadKeys(feature);
      expect(keys.length).toBeGreaterThan(0);
      expect(keys.filter((key) => !(key in SUPPORTING_DOC_SECTIONS[type])), 'screens with no entry').toEqual([]);
      const ids = sectionIds(feature);
      expect(Object.values(SUPPORTING_DOC_SECTIONS[type]).filter((id) => !ids.has(id)), 'entries naming no section').toEqual([]);
    });

    it(`${type}: found by the title its PDF carries`, () => {
      expect(supportingDocSections(resolveDescriptorForInventoryType(type).documentTitle)).toBe(SUPPORTING_DOC_SECTIONS[type]);
    });
  }

  it('the Plan for Minors is found by the registry\'s spelling, with a hyphen', () => {
    expect(resolveDescriptorForInventoryType('planMinor').documentTitle).toBe('ANNUAL GUARDIANSHIP PLAN - MINOR');
    expect(supportingDocSections('ANNUAL GUARDIANSHIP PLAN - MINOR')).toBe(SUPPORTING_DOC_SECTIONS.planMinor);
  });

  it('the Annual Accounting family needs no table: each screen\'s key is its section\'s id', () => {
    const ids = sectionIds('annual-accounting');
    expect(uploadKeys('annual-accounting').filter((key) => !ids.has(key))).toEqual([]);
    for (const type of ['annual', 'finalAccounting', 'trustAccounting', 'guardian']) {
      expect(supportingDocSections(resolveDescriptorForInventoryType(type).documentTitle), type).toEqual({});
    }
  });
});
