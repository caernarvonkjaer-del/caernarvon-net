import { afterEach, describe, expect, test, vi } from 'vitest';
import * as SupplementalPdf from '../../src/core/pdf/supplemental-pdf.js';
import { getSupplementalPdfTools } from '../../src/core/filing/schedule-docs.js';

// Milestone 70, 70F finding. getSupplementalPdfTools() moved from legacy-app.js
// with its fallback, import('./src/core/pdf/supplemental-pdf.js'): a classic
// script resolves that path against the page, a module against itself --
// src/core/filing/src/core/pdf/..., which does not exist. It was reached only
// when form-events.js had not handed the tools over on window, so an upload
// never failed; the module now imports them itself and nothing is handed over.
describe('schedule supporting documents', () => {
  afterEach(() => vi.unstubAllGlobals());

  test('reach the supplemental-PDF tools by import, with nothing handed over on window', async () => {
    vi.stubGlobal('window', {});
    expect(await getSupplementalPdfTools()).toBe(SupplementalPdf);
  });
});
