// Milestone 76B (decision 76B-1, the requester's, 2026-10-19): a case file
// opens exactly as it was saved. Opening a case file, restoring a backup and
// an Excel import used to run every filing's text through sanitizeInput():
// " < > and backticks went, and anything shaped like an inline handler was
// cut -- "Donation=500 to church" opened as "D500 to church", `30" Flat
// screen TV` as "30 Flat screen TV", every time the case opened. The same cut
// damaged stored files: a drawn signature stamp or a supporting PDF ending in
// "...onXk=" (about 1 in 50, found 2026-10-04 -- Milestone 73U then exempted
// strict base64 data URLs), and the raw base64 of a saved annotated preview,
// which the exemption missed. Text is escaped where it is shown instead
// (tests/e2e/escaped-text.spec.ts). Red first: on the code before 76B the
// text below came back changed.
import { describe, expect, test, vi } from 'vitest';
import JSZip from 'jszip';
import { deriveKeyFromPassword, encryptJSON, generateSaltB64 } from '../../src/core/persistence/crypto.js';
import { decodeWardRecord } from '../../src/core/persistence/case-file.js';
import { readCaseFileZip } from '../../src/core/persistence/case-zip-read.js';

vi.mock('../../src/core/navigation/tab-state.js', () => ({ notifyProbateGuardianTabStateChanged: () => {}, getProbateGuardianTabState: () => ({}) }));
vi.mock('../../src/core/shell/sidebar.js', () => ({ refreshWardInfoCard: () => {}, syncActiveWardNameDisplay: () => {}, syncGuardianNameDisplay: () => {}, updateSidebar: () => {} }));

// Valid, canonical base64 whose last characters are an "on...=" run.
const STAMP = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAAAAonXk=';
const PDF = 'data:application/pdf;base64,JVBERi0xLjQKJSVFT0YKAAOnAg==';
const ANNOTATION = 'H4sIAAAAAAAAA+3BMQEAAADCoPVPbQwfoAAAAAAAAAAAAAAAAAAAAIC3AYbSVKsAQAAAonQk=';

const ward = () => ({
  wardId: 'w_76b',
  wardName: 'Ann <b>Lee</b>',
  schA: [{ payer: 'Church', description: 'Donation=500 to church' }],
  schC: [{ description: '30" Flat screen TV' }, { description: 'Pension (monthly = $1,200)' }, { description: 'See ../2024 statement' }],
  guardians: [{ name: 'Pat Lee', signatureState: 'stamp', signatureImage: STAMP }],
  attorney_signatureImage: STAMP,
  scheduleDocs: { a1: { '2026-01-01_2026-12-31': [{ name: 'statement.pdf', dataUrl: PDF }] } },
  printAnnotations: { pdfBytes: ANNOTATION, encoding: 'gzip', contentFingerprint: 'f' },
  notes: ['onload=alert(1)', STAMP],
});

describe('a case file opens exactly as it was saved', () => {
  test('the payloads are the shapes the old filter cut', () => {
    for (const url of [STAMP, PDF]) {
      const b64 = url.slice(url.indexOf(',') + 1);
      expect(Buffer.from(b64, 'base64').toString('base64')).toBe(b64);
      expect(/on\w+=/i.test(b64)).toBe(true);
    }
    expect(/on\w+=/i.test(ANNOTATION)).toBe(true);
  });

  test('an encrypted filing record (Open Backup, drop-import) comes back unchanged', async () => {
    const key = await deriveKeyFromPassword('MasterPassword!', generateSaltB64());
    expect(await decodeWardRecord(await encryptJSON(ward(), key, 'encrypted'), key)).toEqual(ward());
  });

  test('a case file\'s filings (opening it, and a save reading it to merge) come back unchanged', async () => {
    const zip = new JSZip();
    zip.file('wards/w_76b.enc', 'PLAIN:' + JSON.stringify(ward()));
    const read = await readCaseFileZip(zip, { wards: [{ wardId: 'w_76b', file: 'wards/w_76b.enc' }] }, null);
    expect(read.unreadable).toEqual([]);
    expect(read.caseFile.wards).toEqual([ward()]);
  });
});
