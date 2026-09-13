import { beforeEach, describe, expect, test } from 'vitest';
import { readFile } from 'node:fs/promises';
import {
  THEME_STORAGE_KEY,
  THEMES,
  isValidTheme,
  readStoredTheme,
  writeStoredTheme,
  seedStoredThemeFromLegacy,
  resolvePaintTheme,
} from '../../src/core/theme-preference.js';

// Milestone 40D. Theme moved out of the .sav file's app state into localStorage.
// The point is the flash: the .sav-stored theme could only be applied after the
// file finished loading -- and for an encrypted save, after the master password
// was entered -- so every reload painted the OS preference first and then
// corrected itself. localStorage is the only browser storage an inline <head>
// script can read synchronously, before first paint.

/** Minimal localStorage double; the real one is absent in node. */
function installStorage(initial = {}) {
  const store = new Map(Object.entries(initial));
  globalThis.localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => { store.set(k, String(v)); },
    removeItem: (k) => { store.delete(k); },
    clear: () => { store.clear(); },
  };
  return store;
}

/** A localStorage that throws on every access, as some privacy modes do. */
function installThrowingStorage() {
  globalThis.localStorage = {
    getItem() { throw new Error('access denied'); },
    setItem() { throw new Error('access denied'); },
    removeItem() { throw new Error('access denied'); },
  };
}

function installMatchMedia(prefersDark) {
  globalThis.window = {
    ...(globalThis.window || {}),
    matchMedia: (query) => ({ matches: prefersDark && /prefers-color-scheme:\s*dark/.test(query) }),
  };
}

describe('Milestone 40D: theme is stored per device, not in the .sav', () => {
  beforeEach(() => {
    installStorage();
    installMatchMedia(false);
  });

  test('the enum is exactly light and dark, and nothing else validates', () => {
    expect(THEMES).toEqual(['light', 'dark']);
    expect(isValidTheme('light')).toBe(true);
    expect(isValidTheme('dark')).toBe(true);
    for (const bad of ['Dark', 'DARK', 'sepia', '', null, undefined, 0, {}]) {
      expect(isValidTheme(bad), `${JSON.stringify(bad)} must not validate`).toBe(false);
    }
  });

  test('a write goes to localStorage under the documented key', () => {
    const store = installStorage();
    expect(writeStoredTheme('dark')).toBe(true);
    expect(store.get(THEME_STORAGE_KEY)).toBe('dark');
    expect(readStoredTheme()).toBe('dark');
  });

  test('an invalid theme is refused rather than stored', () => {
    const store = installStorage();
    expect(writeStoredTheme('sepia')).toBe(false);
    expect(store.has(THEME_STORAGE_KEY)).toBe(false);
    expect(readStoredTheme()).toBeNull();
  });

  test('a corrupt stored value reads as unset instead of being trusted', () => {
    installStorage({ [THEME_STORAGE_KEY]: 'chartreuse' });
    expect(readStoredTheme()).toBeNull();
  });

  test('storage that throws degrades to unset rather than crashing the page', () => {
    installThrowingStorage();
    expect(readStoredTheme()).toBeNull();
    expect(writeStoredTheme('dark')).toBe(false);
    // And the paint decision still resolves, falling through to the OS.
    installMatchMedia(true);
    expect(resolvePaintTheme()).toBe('dark');
  });

  describe('the one-time legacy seed', () => {
    test("seeds from a .sav's appState theme when nothing is stored yet", () => {
      const store = installStorage();
      expect(seedStoredThemeFromLegacy('dark')).toBe(true);
      expect(store.get(THEME_STORAGE_KEY)).toBe('dark');
    });

    test('never overwrites an existing per-device choice', () => {
      const store = installStorage({ [THEME_STORAGE_KEY]: 'light' });
      expect(seedStoredThemeFromLegacy('dark')).toBe(false);
      expect(store.get(THEME_STORAGE_KEY), 'the device choice wins over the file').toBe('light');
    });

    test('seeds at most once, so a second file cannot re-seed', () => {
      const store = installStorage();
      expect(seedStoredThemeFromLegacy('dark')).toBe(true);
      expect(seedStoredThemeFromLegacy('light')).toBe(false);
      expect(store.get(THEME_STORAGE_KEY)).toBe('dark');
    });

    test('a .sav with no theme, or a junk one, seeds nothing', () => {
      const store = installStorage();
      for (const bad of [undefined, null, '', 'Dark', 'sepia']) {
        expect(seedStoredThemeFromLegacy(bad)).toBe(false);
      }
      expect(store.has(THEME_STORAGE_KEY)).toBe(false);
    });
  });

  describe('the paint decision', () => {
    test('prefers a stored choice over the OS preference, in both directions', () => {
      installStorage({ [THEME_STORAGE_KEY]: 'light' });
      installMatchMedia(true);
      expect(resolvePaintTheme(), 'stored light beats an OS dark preference').toBe('light');

      installStorage({ [THEME_STORAGE_KEY]: 'dark' });
      installMatchMedia(false);
      expect(resolvePaintTheme(), 'stored dark beats an OS light preference').toBe('dark');
    });

    test('falls back to the OS preference when nothing is stored', () => {
      installStorage();
      installMatchMedia(true);
      expect(resolvePaintTheme()).toBe('dark');
      installMatchMedia(false);
      expect(resolvePaintTheme()).toBe('light');
    });

    test('falls back to light when matchMedia is unavailable', () => {
      installStorage();
      globalThis.window = {};
      expect(resolvePaintTheme()).toBe('light');
    });
  });
});

// prepaint.js cannot import this module -- it runs as a classic inline <head>
// script before any module graph exists -- so it duplicates the storage key and
// the valid-value check as literals. These source-level assertions are what stop
// that duplication drifting: rename the key in one place and this fails.
describe('Milestone 40D: prepaint.js agrees with the shared module', () => {
  const prepaintSource = () => readFile(new URL('../../src/prepaint.js', import.meta.url), 'utf8');

  test('it reads the same storage key', async () => {
    const source = await prepaintSource();
    expect(source).toContain(`'${THEME_STORAGE_KEY}'`);
  });

  test('it validates against the same two values', async () => {
    const source = await prepaintSource();
    for (const theme of THEMES) expect(source).toContain(`'${theme}'`);
  });

  test('it reads localStorage before consulting matchMedia', async () => {
    const source = await prepaintSource();
    const storageAt = source.indexOf('localStorage.getItem');
    const mediaAt = source.indexOf('matchMedia');
    expect(storageAt).toBeGreaterThan(-1);
    expect(mediaAt).toBeGreaterThan(-1);
    expect(storageAt, 'the stored choice must be consulted first').toBeLessThan(mediaAt);
  });

  test('it sets both theme attributes, so Bootstrap and the token palette agree', async () => {
    const source = await prepaintSource();
    expect(source).toContain("setAttribute('data-theme'");
    expect(source).toContain("setAttribute('data-bs-theme'");
  });

  test('it guards storage access, which throws outright in some privacy modes', async () => {
    const source = await prepaintSource();
    expect((source.match(/try\s*\{/g) || []).length).toBeGreaterThanOrEqual(2);
  });

  test('it imports nothing -- it must run before any module graph exists', async () => {
    const source = await prepaintSource();
    expect(source).not.toMatch(/^\s*import\s/m);
    expect(source).not.toMatch(/\brequire\s*\(/);
  });
});

// The write side of the migration: a .sav produced from now on must carry no
// theme at all. Removing applyTheme()'s write alone would not have achieved this,
// because buildCaseFileBlob() re-read persisted app state directly.
describe('Milestone 40D: a new .sav serializes no theme', () => {
  test('buildCaseFileBlob\'s appState blob no longer includes a theme key', async () => {
    const source = await readFile(new URL('../../src/core/persistence/case-file.js', import.meta.url), 'utf8');
    const blob = source.slice(source.indexOf('const appStateBlob = {'));
    const body = blob.slice(0, blob.indexOf('};') + 2);
    expect(body).not.toMatch(/^\s*theme:/m);
    // The sibling keys are still serialized, so this asserts an absence inside a
    // blob that demonstrably still exists.
    expect(body).toMatch(/walkthroughCompleted:/);
    expect(body).toMatch(/recentWards:/);
  });

  test('applyTheme persists through the localStorage helper, not saveAppState', async () => {
    const source = await readFile(new URL('../../src/legacy-app.js', import.meta.url), 'utf8');
    const fn = source.slice(source.indexOf('function applyTheme('));
    const body = fn.slice(0, fn.indexOf('\n}'));
    // Comment lines are stripped first: the body deliberately explains what the
    // old saveAppState('theme') write was and why it moved, and an assertion that
    // matched that prose would fail for the wrong reason.
    const code = body
      .split(/\r?\n/)
      .filter((line) => !line.trim().startsWith('//'))
      .join('\n');
    expect(code).toContain('writeStoredTheme');
    expect(code, 'no live saveAppState theme write may remain').not.toContain("saveAppState('theme'");
  });
});
