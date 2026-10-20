// Milestone 76K items 1 and 6.
//  1. A password-protected case file accepted parts saved without a password
//     ("PLAIN:"), so someone who edited a protected file -- an emailed copy --
//     could plant a filing with an altered balance that opened as genuine, or
//     a plain password check that let any password through. A file marked
//     protected now refuses them; a file saved with no password still reads.
//  6. An older Plan's Yes/No answers stored as true/false were converted only
//     on Open Backup and a dropped file; a normal open left an explicit "No"
//     showing unanswered.
import { describe, expect, test, vi } from 'vitest';
import JSZip from 'jszip';
import {
  CRYPTO_VERIFIER_PLAINTEXT, PLAIN_MODE_PREFIX, generateSaltB64, deriveKeyFromPassword, encryptJSON,
  decryptJSONWithKey, deriveAndVerifyKey,
} from '../../src/core/persistence/crypto.js';

vi.stubGlobal('window', globalThis);
const { readCaseFileZip } = await import('../../src/core/persistence/case-zip-read.js');

const plain = (value) => PLAIN_MODE_PREFIX + JSON.stringify(value);

async function caseZip(securityMode, key, wards) {
  const zip = new JSZip();
  const manifest = { format: 'probate-guardian-case', securityMode, wards: [] };
  for (const [i, { ward, asPlain }] of wards.entries()) {
    const file = `wards/w${i}.enc`;
    zip.file(file, asPlain ? plain(ward) : await encryptJSON(ward, key, 'encrypted'));
    manifest.wards.push({ file, wardName: ward.wardName });
  }
  zip.file('manifest.json', JSON.stringify(manifest));
  return { zip: await JSZip.loadAsync(await zip.generateAsync({ type: 'uint8array' })), manifest };
}

describe('item 1: a protected file refuses parts saved without a password', () => {
  test('the reader names the planted part unreadable and keeps the genuine one', async () => {
    const key = await deriveKeyFromPassword('correct horse', generateSaltB64());
    const { zip, manifest } = await caseZip('encrypted', key, [
      { ward: { wardId: 'w1', wardName: 'Genuine Ward', inventoryType: 'annual', startingBalance: 1000 } },
      { ward: { wardId: 'w2', wardName: 'Planted Ward', inventoryType: 'annual', startingBalance: 999999 }, asPlain: true },
    ]);
    const read = await readCaseFileZip(zip, manifest, key);
    expect(read.caseFile.wards.map((w) => w.wardName)).toEqual(['Genuine Ward']);
    expect(read.unreadable).toEqual([{ kind: 'filing', name: 'Planted Ward', file: 'wards/w1.enc' }]);
  });

  test('a plain password check in a protected file lets no password through', async () => {
    const manifest = { securityMode: 'encrypted', salt: generateSaltB64(), verifier: plain(CRYPTO_VERIFIER_PLAINTEXT) };
    await expect(deriveAndVerifyKey('any guess at all', manifest)).rejects.toThrow(/saved without a password/);
  });

  test('a file saved with no password still reads, and the refusal is only on request', async () => {
    const { zip, manifest } = await caseZip('none', null, [
      { ward: { wardId: 'w1', wardName: 'Plain Ward', inventoryType: 'annual' }, asPlain: true },
    ]);
    expect((await readCaseFileZip(zip, manifest, null)).caseFile.wards.map((w) => w.wardName)).toEqual(['Plain Ward']);
    expect(await decryptJSONWithKey(plain({ a: 1 }), null)).toEqual({ a: 1 });
    await expect(decryptJSONWithKey(plain({ a: 1 }), null, { refusePlain: true })).rejects.toThrow(/saved without a password/);
  });
});

describe('item 6: every open converts an older Plan\'s Yes/No answers', () => {
  test('an explicit "No" saved as false opens as "No"; a missing answer stays unanswered', async () => {
    const { zip, manifest } = await caseZip('none', null, [
      { ward: { wardId: 'p1', wardName: 'Old Plan', inventoryType: 'planInitial', committeeIncorporated: false,
        q11Directives: [{ courtRevoked: true }] }, asPlain: true },
      { ward: { wardId: 'p2', wardName: 'Unanswered Plan', inventoryType: 'planMinor' }, asPlain: true },
    ]);
    const [initial, minor] = (await readCaseFileZip(zip, manifest, null)).caseFile.wards;
    expect(initial.committeeIncorporated).toBe('No');
    expect(initial.q11Directives[0].courtRevoked).toBe('Yes');
    expect(minor.amendedForm).toBeUndefined();
  });
});
