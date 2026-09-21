import { describe, it, expect, beforeEach } from 'vitest';
import {
  OFFLINE_ACCESS_ANSWER_KEY,
  readOfflineAccessAnswer,
  writeOfflineAccessAnswer,
  shouldOfferOfflineAccess,
} from '../../src/core/offline-access-preference.js';

// Milestone 62: the "Offline access available" notice (pwa-ui.js) is asked
// once per device; the answer is a localStorage flag.
function fakeLocalStorage() {
  const store = new Map();
  return {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
  };
}

const OFFERABLE = { available: true, ready: false };

describe('offline access answered flag (localStorage)', () => {
  beforeEach(() => {
    globalThis.localStorage = fakeLocalStorage();
  });

  it('has no answer until one is written', () => {
    expect(readOfflineAccessAnswer()).toBeNull();
  });

  it('round-trips accepted and dismissed', () => {
    expect(writeOfflineAccessAnswer('accepted')).toBe(true);
    expect(readOfflineAccessAnswer()).toBe('accepted');
    expect(writeOfflineAccessAnswer('dismissed')).toBe(true);
    expect(readOfflineAccessAnswer()).toBe('dismissed');
  });

  it('rejects an unknown answer on write and treats one on read as unset', () => {
    expect(writeOfflineAccessAnswer('maybe')).toBe(false);
    expect(readOfflineAccessAnswer()).toBeNull();
    localStorage.setItem(OFFLINE_ACCESS_ANSWER_KEY, 'maybe');
    expect(readOfflineAccessAnswer()).toBeNull();
  });

  it('tolerates storage that throws', () => {
    globalThis.localStorage = {
      getItem() { throw new Error('denied'); },
      setItem() { throw new Error('denied'); },
    };
    expect(readOfflineAccessAnswer()).toBeNull();
    expect(writeOfflineAccessAnswer('accepted')).toBe(false);
  });

  it('tolerates no localStorage at all', () => {
    delete globalThis.localStorage;
    expect(readOfflineAccessAnswer()).toBeNull();
    expect(writeOfflineAccessAnswer('dismissed')).toBe(false);
  });
});

describe('shouldOfferOfflineAccess', () => {
  beforeEach(() => {
    globalThis.localStorage = fakeLocalStorage();
  });

  it('offers on first use', () => {
    expect(shouldOfferOfflineAccess(OFFERABLE)).toBe(true);
  });

  it('does not offer again once dismissed', () => {
    writeOfflineAccessAnswer('dismissed');
    expect(shouldOfferOfflineAccess(OFFERABLE)).toBe(false);
  });

  it('offers again after the flag disappears (site data cleared)', () => {
    writeOfflineAccessAnswer('dismissed');
    localStorage.removeItem(OFFLINE_ACCESS_ANSWER_KEY);
    expect(shouldOfferOfflineAccess(OFFERABLE)).toBe(true);
  });

  it('offers again when a previously accepted pack is not ready for this version', () => {
    writeOfflineAccessAnswer('accepted');
    expect(shouldOfferOfflineAccess(OFFERABLE)).toBe(true);
  });

  it('never offers when the pack is already ready or offline access is unavailable', () => {
    expect(shouldOfferOfflineAccess({ available: true, ready: true })).toBe(false);
    expect(shouldOfferOfflineAccess({ available: false, ready: false })).toBe(false);
    expect(shouldOfferOfflineAccess(null)).toBe(false);
  });
});
