// Milestone 76C: every encrypted part of a case file is base64'd by
// crypto.js's _b64FromBytes(). It built the text one character per byte: 60 MB
// of attached statements took 18-38 seconds of each save there (Node,
// 2026-10-19), and the string it grew piece by piece is the likeliest reason a
// case near 200 MB could not be saved. Now the browser's own encoder, or 32 KB
// at a time -- same output. Red first: the old encoder made one
// String.fromCharCode() call per byte (1,048,576 for a megabyte).
import { afterEach, describe, expect, test, vi } from 'vitest';
import { _b64FromBytes, _bytesFromB64 } from '../../src/core/persistence/crypto.js';

const bytes = (n) => {
  const out = new Uint8Array(n);
  for (let i = 0; i < n; i++) out[i] = (i * 2654435761) >>> 24;
  return out;
};

afterEach(() => vi.restoreAllMocks());

describe('base64 of a case file part', () => {
  test('the same text as a standard encoder, at sizes around each chunk edge, and back', () => {
    for (const n of [0, 1, 2, 3, 32767, 32768, 32769, 100000]) {
      const b = bytes(n);
      const text = _b64FromBytes(b);
      expect(text).toBe(Buffer.from(b).toString('base64'));
      expect(Array.from(_bytesFromB64(text))).toEqual(Array.from(b));
    }
  });

  test('a megabyte is built from a few dozen pieces, not one per byte', () => {
    const spy = vi.spyOn(String, 'fromCharCode');
    _b64FromBytes(bytes(1024 * 1024));
    // 32 with the chunked encoder; 0 where the engine has its own.
    expect(spy.mock.calls.length).toBeLessThanOrEqual(64);
  });
});
