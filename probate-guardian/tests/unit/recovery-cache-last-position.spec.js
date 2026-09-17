// Milestone 57 review: saveLastPosition()/loadLastPosition()/clearLastPosition()
// (recovery-cache.js) replaced 57H's cross-session encrypted IndexedDB
// restore with a localStorage marker that carries no case data -- just the
// last route and ward id, so reopening a case can land back where the filer
// was instead of always on the dashboard. See that file's header comment.
import { describe, it, expect, beforeEach } from 'vitest';
import { LAST_POSITION_KEY, saveLastPosition, loadLastPosition, clearLastPosition } from '../../src/core/persistence/recovery-cache.js';

function fakeLocalStorage() {
  const store = new Map();
  return {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
  };
}

describe('pg-last-position (localStorage marker, no case data)', () => {
  beforeEach(() => {
    globalThis.localStorage = fakeLocalStorage();
  });

  it('round-trips a route and ward id', () => {
    saveLastPosition('/b4', 'ward-123');
    const pos = loadLastPosition();
    expect(pos.route).toBe('/b4');
    expect(pos.wardId).toBe('ward-123');
    expect(typeof pos.savedAt).toBe('number');
  });

  it('stores no case content -- only route/wardId/savedAt keys', () => {
    saveLastPosition('/dashboard', 'ward-abc');
    const raw = JSON.parse(localStorage.getItem(LAST_POSITION_KEY));
    expect(Object.keys(raw).sort()).toEqual(['route', 'savedAt', 'wardId']);
  });

  it('defaults wardId to empty string for a non-ward route', () => {
    saveLastPosition('/party-management');
    expect(loadLastPosition()).toMatchObject({ route: '/party-management', wardId: '' });
  });

  it('does nothing for an empty route', () => {
    saveLastPosition('', 'ward-123');
    expect(loadLastPosition()).toBeNull();
  });

  it('clearLastPosition() removes the marker', () => {
    saveLastPosition('/b4', 'ward-123');
    clearLastPosition();
    expect(loadLastPosition()).toBeNull();
  });

  it('loadLastPosition() tolerates corrupted JSON rather than throwing', () => {
    localStorage.setItem(LAST_POSITION_KEY, 'not-json{');
    expect(loadLastPosition()).toBeNull();
  });

  it('returns null when nothing has been saved yet', () => {
    expect(loadLastPosition()).toBeNull();
  });
});
