import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import {
  renderServiceAttestationRow,
  syncServiceAttestationVisibility,
} from '../../src/core/form/service-attestation-visibility.js';

// Milestone 63B. The Certificate of Service asks "No recipients are required for
// this certificate" only when it applies (D16): when Recipient 1 is blank, or
// when 'Yes' is selected. The rule lives in attestationRelevant()
// (core/validation/service-recipients.js); this module is its page half, shared
// by the three certificate pages -- Initial Inventory D-5, Annual Part X,
// Simplified Part VI -- so they cannot diverge. Node environment: the DOM is a
// minimal stand-in, and the browser behaviour is proved in
// tests/e2e/service-attestation-visibility.spec.ts.

const FIELDS = ['name', 'line2'];
const options = (over = {}) => ({
  html: '<fieldset>the question</fieldset>',
  rows: [{ name: '', line2: '' }],
  attestation: '',
  startedFields: FIELDS,
  recipientsPath: 'certRecipients',
  attestationPath: 'certNoRecipients',
  ...over,
});

describe('renderServiceAttestationRow()', () => {
  test('is visible when nobody is listed', () => {
    const html = renderServiceAttestationRow(options());
    expect(html).toContain('data-service-attestation');
    expect(html).not.toContain('d-none');
    expect(html).toContain('the question');
  });

  test("is rendered hidden — but still present, so it can come back — once Recipient 1 is started and the answer isn't Yes", () => {
    const html = renderServiceAttestationRow(options({ rows: [{ name: 'A Person', line2: '' }] }));
    expect(html).toContain('d-none');
    expect(html).toContain('the question');
  });

  test("stays visible on 'Yes' with a recipient typed (the cards are hidden; this is the way back)", () => {
    const html = renderServiceAttestationRow(options({ rows: [{ name: 'A Person' }], attestation: 'Yes' }));
    expect(html).not.toContain('d-none');
  });

  test('carries what the live toggle needs, so no page has to bind anything', () => {
    const html = renderServiceAttestationRow(options());
    expect(html).toContain('data-recipients-path="certRecipients"');
    expect(html).toContain('data-attestation-path="certNoRecipients"');
    expect(html).toContain('data-started-fields="name,line2"');
  });
});

describe('syncServiceAttestationVisibility()', () => {
  let row;
  let classes;
  beforeEach(() => {
    classes = new Set();
    row = {
      dataset: { recipientsPath: 'certRecipients', attestationPath: 'certNoRecipients', startedFields: 'name,line2' },
      classList: { toggle: (name, force) => { if (force) classes.add(name); else classes.delete(name); } },
    };
    vi.stubGlobal('document', { querySelector: (sel) => (sel === '[data-service-attestation]' ? row : null) });
    vi.stubGlobal('window', { D: { certRecipients: [{ name: '', line2: '' }], certNoRecipients: '' } });
  });
  afterEach(() => vi.unstubAllGlobals());

  test('hides the row once Recipient 1 has content, and shows it again when cleared', () => {
    window.D.certRecipients[0].name = 'A Person';
    syncServiceAttestationVisibility();
    expect(classes.has('d-none')).toBe(true);

    window.D.certRecipients[0].name = '';
    syncServiceAttestationVisibility();
    expect(classes.has('d-none')).toBe(false);
  });

  test("keeps it showing when the answer is 'Yes'", () => {
    window.D.certRecipients[0].name = 'A Person';
    window.D.certNoRecipients = 'Yes';
    syncServiceAttestationVisibility();
    expect(classes.has('d-none')).toBe(false);
  });

  test('does nothing, and does not throw, when the page has no such row', () => {
    vi.stubGlobal('document', { querySelector: () => null });
    expect(() => syncServiceAttestationVisibility()).not.toThrow();
  });
});
