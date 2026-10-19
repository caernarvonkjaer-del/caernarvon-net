// WebCrypto PBKDF2/AES-GCM encryption at rest for Probate Guardian case files.

export const PBKDF2_ITERATIONS = 210000;
export const CRYPTO_VERIFIER_PLAINTEXT = 'PG_VERIFIER_V1';
export const PLAIN_MODE_PREFIX = 'PLAIN:';

// The session's key, and whether this case encrypts at all. Every filing,
// and the guardian's own name and email, are encrypted before they reach the
// .sav file, which only ever holds ciphertext. The AES key is derived from the
// filer's password with PBKDF2 and lives only here, in this module's closure
// (Milestone 70, 70I; it was a window property of legacy-app.js): set once a
// password is verified, cleared by every lock and every failed attempt, and
// never written anywhere. There is no recovery path if the password is lost --
// the deliberate design.
//
// 'encrypted' (the default, recommended) uses AES-256-GCM; 'none' stores plain
// JSON with no password gate, chosen once when a case is started.
let cryptoKey = null;
let securityMode = 'encrypted'; // 'encrypted' | 'none'

export function getCryptoKey() {
  return cryptoKey;
}

/** Hold a verified key for the session. */
export function setCryptoKey(key) {
  cryptoKey = key || null;
}

/** Forget the key: a lock, or a password that did not verify. */
export function clearCryptoKey() {
  cryptoKey = null;
}

export function getSecurityMode() {
  return securityMode;
}

export function setSecurityMode(mode) {
  securityMode = mode;
}

// Milestone 76C: base64 of every encrypted part of a case file. It was built
// one character per byte -- 60 MB of attached statements took 18-38 seconds
// here alone, on every save (and on every lock with unsaved work), and the
// string it built piece by piece is the likeliest reason a case near 200 MB
// could not be saved at all. The browser's own encoder where it has one;
// otherwise 32 KB at a time. The output is the same.
const B64_CHUNK = 0x8000;
export function _b64FromBytes(bytes) {
  const native = /** @type {any} */ (bytes).toBase64;
  if (typeof native === 'function') return native.call(bytes);
  let bin = '';
  for (let i = 0; i < bytes.length; i += B64_CHUNK) {
    bin += String.fromCharCode.apply(null, /** @type {any} */ (bytes.subarray(i, i + B64_CHUNK)));
  }
  return btoa(bin);
}

export function _bytesFromB64(b64) {
  const fromBase64 = /** @type {any} */ (Uint8Array).fromBase64;
  if (typeof fromBase64 === 'function') return fromBase64.call(Uint8Array, b64);
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

export function generateSaltB64() {
  const c = (typeof crypto !== 'undefined' && crypto) || (typeof window !== 'undefined' && window.crypto);
  if (!c || !c.getRandomValues) {
    throw new Error('WebCrypto getRandomValues unavailable');
  }
  return _b64FromBytes(c.getRandomValues(new Uint8Array(16)));
}

export async function deriveKeyFromPassword(password, saltB64) {
  const c = (typeof crypto !== 'undefined' && crypto) || (typeof window !== 'undefined' && window.crypto);
  if (!c || !c.subtle) {
    throw new Error('window.crypto.subtle unavailable (insecure context)');
  }
  const enc = new TextEncoder();
  const salt = _bytesFromB64(saltB64);
  const baseKey = await c.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveKey']);
  return c.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function encryptJSON(value, explicitKey = null, explicitMode = null) {
  const mode = explicitMode || getSecurityMode();
  if (mode === 'none') return PLAIN_MODE_PREFIX + JSON.stringify(value);
  const key = explicitKey || getCryptoKey();
  if (!key) throw new Error('App is locked — no encryption key available');

  const c = (typeof crypto !== 'undefined' && crypto) || (typeof window !== 'undefined' && window.crypto);
  const iv = c.getRandomValues(new Uint8Array(12));
  const plaintext = new TextEncoder().encode(JSON.stringify(value));
  const ciphertext = await c.subtle.encrypt({ name: 'AES-GCM', iv }, key, plaintext);
  return `${_b64FromBytes(iv)}:${_b64FromBytes(new Uint8Array(ciphertext))}`;
}

export async function decryptJSONWithKey(packed, key) {
  const s = String(packed);
  if (s.startsWith(PLAIN_MODE_PREFIX)) return JSON.parse(s.slice(PLAIN_MODE_PREFIX.length));
  if (!key) throw new Error('App is locked — no encryption key available');

  const c = (typeof crypto !== 'undefined' && crypto) || (typeof window !== 'undefined' && window.crypto);
  const [ivB64, ctB64] = s.split(':');
  const plaintext = await c.subtle.decrypt(
    { name: 'AES-GCM', iv: _bytesFromB64(ivB64) },
    key,
    _bytesFromB64(ctB64)
  );
  return JSON.parse(new TextDecoder().decode(plaintext));
}

export async function decryptJSON(packed, explicitKey = null) {
  const key = explicitKey || getCryptoKey();
  return decryptJSONWithKey(packed, key);
}

export async function deriveAndVerifyKey(password, manifest, fileHandle) {
  const salt = manifest.salt || '';
  const key = await deriveKeyFromPassword(password, salt);
  if (manifest.verifier) {
    const decoded = await decryptJSONWithKey(manifest.verifier, key);
    if (decoded !== CRYPTO_VERIFIER_PLAINTEXT) {
      throw new Error('verifier mismatch');
    }
  } else if (manifest.guardian) {
    // V1 archives without a verifier entry verify against the encrypted guardian block
    await decryptJSONWithKey(manifest.guardian, key);
  }
  return key;
}
