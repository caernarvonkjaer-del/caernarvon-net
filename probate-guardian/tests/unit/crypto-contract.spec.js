import { afterEach, describe, expect, test, vi } from 'vitest';
import {
  PBKDF2_ITERATIONS, CRYPTO_VERIFIER_PLAINTEXT, PLAIN_MODE_PREFIX, _bytesFromB64,
  generateSaltB64, deriveKeyFromPassword, encryptJSON, decryptJSONWithKey, deriveAndVerifyKey,
} from '../../src/core/persistence/crypto.js';

// Milestone 70, 70A: "Fill the security contract gaps before ownership
// moves." 70I moves key lifetime, lock and unlock into services; these pin
// the encryption-at-rest parameters it must keep, beyond the iteration count
// and round trips tests/unit/case-file.spec.js already covers. What this
// protects: a stolen .sav file cannot be read without the password. What it
// does not: an attacker with the file can still try passwords offline, and
// PBKDF2's cost is the only thing slowing them.

afterEach(() => vi.restoreAllMocks());

describe('key derivation', () => {
  test('PBKDF2 with SHA-256 at 210,000 iterations, deriving a non-extractable AES-GCM-256 key for encrypt/decrypt only', async () => {
    const importKey = vi.spyOn(crypto.subtle, 'importKey');
    const deriveKey = vi.spyOn(crypto.subtle, 'deriveKey');
    const salt = generateSaltB64();
    const key = await deriveKeyFromPassword('correct horse battery', salt);

    expect(importKey).toHaveBeenCalledWith('raw', expect.anything(), 'PBKDF2', false, ['deriveKey']);
    const [params, , derived, extractable, usages] = deriveKey.mock.calls[0];
    expect(params).toMatchObject({ name: 'PBKDF2', iterations: 210000, hash: 'SHA-256' });
    expect(PBKDF2_ITERATIONS).toBe(210000);
    expect([...params.salt]).toEqual([..._bytesFromB64(salt)]);
    expect(derived).toEqual({ name: 'AES-GCM', length: 256 });
    expect(extractable).toBe(false);
    expect(usages).toEqual(['encrypt', 'decrypt']);
    expect(key.algorithm).toMatchObject({ name: 'AES-GCM', length: 256 });
  });

  test('the derived key can never be exported, so it cannot be written anywhere', async () => {
    const key = await deriveKeyFromPassword('correct horse battery', generateSaltB64());
    expect(key.extractable).toBe(false);
    await expect(crypto.subtle.exportKey('raw', key)).rejects.toThrow();
    expect(JSON.stringify({ key })).toBe('{"key":{}}');
  });

  test('each salt is 16 fresh random bytes', () => {
    const a = generateSaltB64();
    const b = generateSaltB64();
    expect(_bytesFromB64(a)).toHaveLength(16);
    expect(a).not.toBe(b);
  });
});

describe('encryption', () => {
  test('AES-GCM with a fresh 12-byte IV per value; the ciphertext carries the 16-byte authentication tag', async () => {
    const key = await deriveKeyFromPassword('correct horse battery', generateSaltB64());
    const value = { wardName: 'Eleanor Whitfield' };
    const one = await encryptJSON(value, key, 'encrypted');
    const two = await encryptJSON(value, key, 'encrypted');
    const [iv1, ct1] = one.split(':');
    const [iv2, ct2] = two.split(':');
    expect(_bytesFromB64(iv1)).toHaveLength(12);
    expect(iv1).not.toBe(iv2);
    expect(ct1).not.toBe(ct2);
    expect(_bytesFromB64(ct1).length).toBe(new TextEncoder().encode(JSON.stringify(value)).length + 16);
    expect(one).not.toContain('Eleanor');
    expect(await decryptJSONWithKey(one, key)).toEqual(value);
  });

  test('a tampered ciphertext is rejected, not decrypted into something else', async () => {
    const key = await deriveKeyFromPassword('correct horse battery', generateSaltB64());
    const [iv, ct] = (await encryptJSON({ a: 1 }, key, 'encrypted')).split(':');
    const bytes = _bytesFromB64(ct);
    bytes[0] ^= 0xff;
    const tampered = `${iv}:${btoa(String.fromCharCode(...bytes))}`;
    await expect(decryptJSONWithKey(tampered, key)).rejects.toThrow();
  });

  test('unencrypted mode is marked PLAIN: and needs no key; encrypted data without a key is refused', async () => {
    const plain = await encryptJSON({ a: 1 }, null, 'none');
    expect(plain).toBe(`${PLAIN_MODE_PREFIX}{"a":1}`);
    expect(await decryptJSONWithKey(plain, null)).toEqual({ a: 1 });
    const key = await deriveKeyFromPassword('correct horse battery', generateSaltB64());
    const sealed = await encryptJSON({ a: 1 }, key, 'encrypted');
    await expect(decryptJSONWithKey(sealed, null)).rejects.toThrow('App is locked');
  });
});

describe('verifying a password against an archive', () => {
  test('the verifier opens with the right password and refuses a wrong one', async () => {
    const salt = generateSaltB64();
    const key = await deriveKeyFromPassword('correct horse battery', salt);
    const manifest = { salt, verifier: await encryptJSON(CRYPTO_VERIFIER_PLAINTEXT, key, 'encrypted') };
    await expect(deriveAndVerifyKey('correct horse battery', manifest)).resolves.toBeTruthy();
    await expect(deriveAndVerifyKey('wrong horse battery', manifest)).rejects.toThrow();
  });

  test('a version-1 archive with no verifier is verified against its encrypted guardian block', async () => {
    const salt = generateSaltB64();
    const key = await deriveKeyFromPassword('correct horse battery', salt);
    const manifest = { salt, guardian: await encryptJSON({ guardianName: 'G' }, key, 'encrypted') };
    await expect(deriveAndVerifyKey('correct horse battery', manifest)).resolves.toBeTruthy();
    await expect(deriveAndVerifyKey('wrong horse battery', manifest)).rejects.toThrow();
  });
});
