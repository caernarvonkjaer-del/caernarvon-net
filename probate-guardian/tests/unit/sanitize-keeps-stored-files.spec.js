// Opening a case file, restoring a backup or the recovery snapshot, and an
// Excel import all pass the filing through sanitizeObjectData(), which runs
// sanitizeInput() over every string -- including the drawn signature stamps
// and the attached supporting PDFs, stored as base64 data URLs. Its
// /on\w+=/gi strip matched the end of about 1 in 50 of them ("...onXk=",
// "...OnAg==") and cut it off, so the next save kept a stamp that no longer
// decodes or a PDF pdf-lib can no longer read (found 2026-10-04 reviewing
// Milestone 73). A strict base64 data URL can hold none of the characters the
// filter exists to remove, so it is left exactly as stored; every other
// string is filtered as before.
import { describe, expect, test, vi } from 'vitest';
import { sanitizeInput, sanitizeObjectData, sanitizeObjectDataInPlace } from '../../src/core/security/input-hardening.js';
import { deriveKeyFromPassword, encryptJSON, generateSaltB64 } from '../../src/core/persistence/crypto.js';
import { decodeWardRecord } from '../../src/core/persistence/case-file.js';

vi.mock('../../src/core/navigation/tab-state.js', () => ({ notifyProbateGuardianTabStateChanged: () => {}, getProbateGuardianTabState: () => ({}) }));
vi.mock('../../src/core/shell/sidebar.js', () => ({ refreshWardInfoCard: () => {}, syncActiveWardNameDisplay: () => {}, syncGuardianNameDisplay: () => {}, updateSidebar: () => {} }));

// Valid, canonical base64 whose last characters are an "on...=" run.
const STAMP = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAAAAonXk=';
const PDF = 'data:application/pdf;base64,JVBERi0xLjQKJSVFT0YKAAOnAg==';

const ward = () => ({
  wardName: 'Ann <b>Lee</b>',
  guardians: [{ name: 'Pat Lee', signatureState: 'stamp', signatureImage: STAMP }],
  attorney_signatureImage: STAMP,
  scheduleDocs: { a1: { '2026-01-01_2026-12-31': [{ name: 'statement.pdf', dataUrl: PDF }] } },
  notes: ['onload=alert(1)', STAMP],
});

describe('stored stamps and supporting PDFs survive the import filter', () => {
  test('the payloads are valid base64 that today\'s filter would cut', () => {
    for (const url of [STAMP, PDF]) {
      const b64 = url.slice(url.indexOf(',') + 1);
      expect(Buffer.from(b64, 'base64').toString('base64')).toBe(b64);
      expect(/on\w+=/i.test(b64)).toBe(true);
    }
  });

  test('sanitizeInput leaves a base64 data URL exactly as stored', () => {
    expect(sanitizeInput(STAMP)).toBe(STAMP);
    expect(sanitizeInput(PDF)).toBe(PDF);
  });

  test('sanitizeObjectData keeps every stored file and still filters text', () => {
    const out = sanitizeObjectData(ward());
    expect(out.guardians[0].signatureImage).toBe(STAMP);
    expect(out.attorney_signatureImage).toBe(STAMP);
    expect(out.scheduleDocs.a1['2026-01-01_2026-12-31'][0].dataUrl).toBe(PDF);
    expect(out.wardName).toBe('Ann bLee/b');
  });

  test('sanitizeObjectDataInPlace (the Annual and Simplified Excel imports) does the same', () => {
    const d = ward();
    sanitizeObjectDataInPlace(d);
    expect(d.guardians[0].signatureImage).toBe(STAMP);
    expect(d.scheduleDocs.a1['2026-01-01_2026-12-31'][0].dataUrl).toBe(PDF);
    expect(d.notes[1]).toBe(STAMP);
    expect(d.wardName).toBe('Ann bLee/b');
    expect(d.notes[0]).toBe('alert(1)');
  });

  test('opening an encrypted ward record keeps its stamp and PDF', async () => {
    const key = await deriveKeyFromPassword('MasterPassword!', generateSaltB64());
    const decoded = await decodeWardRecord(await encryptJSON(ward(), key, 'encrypted'), key);
    expect(decoded.guardians[0].signatureImage).toBe(STAMP);
    expect(decoded.scheduleDocs.a1['2026-01-01_2026-12-31'][0].dataUrl).toBe(PDF);
  });

  test('anything that is not a strict base64 data URL is still filtered', () => {
    expect(sanitizeInput('data:text/html,<script>alert(1)</script>')).toBe('data:text/html,scriptalert(1)/script');
    expect(sanitizeInput('data:image/png;base64,AAAA"onerror=x')).toBe('data:image/png;base64,AAAAx');
    expect(sanitizeInput('data:image/png;onload=x;base64,AAAA')).toBe('data:image/png;x;base64,AAAA');
    expect(sanitizeInput('javascript:alert(1)')).toBe('alert(1)');
  });
});
