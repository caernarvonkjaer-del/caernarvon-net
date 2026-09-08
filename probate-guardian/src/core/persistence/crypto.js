// WebCrypto PBKDF2/AES-GCM encryption at rest for Probate Guardian case files.

export const PBKDF2_ITERATIONS = 210000;
export const CRYPTO_VERIFIER_PLAINTEXT = 'PG_VERIFIER_V1';
export const PLAIN_MODE_PREFIX = 'PLAIN:';

let _cryptoKey = null; // CryptoKey in memory during unlocked session
let _securityMode = 'encrypted'; // 'encrypted' | 'none'

export function getCryptoKey() {
  if (typeof window !== 'undefined' && window._cryptoKey !== undefined) {
    return window._cryptoKey;
  }
  return _cryptoKey;
}

export function setCryptoKey(key) {
  _cryptoKey = key;
  if (typeof window !== 'undefined') {
    window._cryptoKey = key;
  }
}

export function getSecurityMode() {
  if (typeof window !== 'undefined' && window._securityMode !== undefined) {
    return window._securityMode;
  }
  return _securityMode;
}

export function setSecurityMode(mode) {
  _securityMode = mode;
  if (typeof window !== 'undefined') {
    window._securityMode = mode;
  }
}

export function _b64FromBytes(bytes) {
  let bin = '';
  bytes.forEach((b) => {
    bin += String.fromCharCode(b);
  });
  return btoa(bin);
}

export function _bytesFromB64(b64) {
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

// OS keychain integration (Tauri desktop)
export function tauriInvoke() {
  return (typeof window !== 'undefined' && window.__TAURI__ && window.__TAURI__.core && window.__TAURI__.core.invoke) || null;
}

export function hasKeychainSupport() {
  return !!tauriInvoke();
}

export async function keychainSave(password) {
  const invoke = tauriInvoke();
  if (!invoke) return false;
  try {
    await invoke('keychain_save', { password });
    return true;
  } catch (e) {
    console.warn('keychain_save failed', e);
    return false;
  }
}

export async function keychainLoad() {
  const invoke = tauriInvoke();
  if (!invoke) return null;
  try {
    return await invoke('keychain_load');
  } catch (e) {
    console.warn('keychain_load failed', e);
    return null;
  }
}

export async function keychainDelete() {
  const invoke = tauriInvoke();
  if (!invoke) return false;
  try {
    await invoke('keychain_delete');
    return true;
  } catch (e) {
    console.warn('keychain_delete failed', e);
    return false;
  }
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

// Global bridge for legacy scripts and test harnesses
if (typeof window !== 'undefined') {
  window.PBKDF2_ITERATIONS = PBKDF2_ITERATIONS;
  window.CRYPTO_VERIFIER_PLAINTEXT = CRYPTO_VERIFIER_PLAINTEXT;
  window.PLAIN_MODE_PREFIX = PLAIN_MODE_PREFIX;
  window._b64FromBytes = _b64FromBytes;
  window._bytesFromB64 = _bytesFromB64;
  window.generateSaltB64 = generateSaltB64;
  window.deriveKeyFromPassword = deriveKeyFromPassword;
  window.encryptJSON = encryptJSON;
  window.decryptJSON = decryptJSON;
  window.decryptJSONWithKey = decryptJSONWithKey;
  window.deriveAndVerifyKey = deriveAndVerifyKey;
  window.hasKeychainSupport = hasKeychainSupport;
  window.keychainSave = keychainSave;
  window.keychainLoad = keychainLoad;
  window.keychainDelete = keychainDelete;
}
