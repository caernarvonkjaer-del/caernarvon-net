import { afterEach, beforeAll, beforeEach, describe, expect, test, vi } from 'vitest';
import { readFile } from 'node:fs/promises';

// Milestone 63C. On the hosted build a failed feature chunk used to reload the
// page by itself (src/features-loader.js, added in 60b0133), which replaced the
// "This section could not be loaded" panel before anyone could read it, closed
// the open case for any filer without a remembered file handle, and left the
// unsaved-work prompt as the only protection. The reload is gone; the panel is
// the recovery, so it has to cover every chunk a page needs, including the ones
// a feature imports while it mounts (its print and Excel modules) -- those fail
// inside mod.mount(), outside the original load() try/catch.
//
// The feature bridge is an ES module that writes to `window` and builds DOM
// nodes, and the unit environment is plain node, so both are stubbed minimally.

function fakeElement(tag) {
  return {
    tag,
    className: '',
    textContent: '',
    type: '',
    attrs: {},
    children: [],
    listeners: {},
    setAttribute(name, value) { this.attrs[name] = value; },
    append(...nodes) { this.children.push(...nodes); },
    replaceChildren() { this.children = []; },
    addEventListener(type, fn) { this.listeners[type] = fn; },
  };
}

const walk = (node, out = []) => {
  out.push(node);
  (node.children || []).forEach((child) => walk(child, out));
  return out;
};
const textOf = (node) => walk(node).map((n) => n.textContent).join(' ');

let bridgeModule;
const reload = vi.fn();

beforeAll(async () => {
  vi.stubGlobal('window', { location: { reload } });
  vi.stubGlobal('document', { createElement: fakeElement });
  bridgeModule = await import('../../src/core/feature-bridge.js');
});

beforeEach(() => {
  reload.mockClear();
  window.attachFormHeaderActions = vi.fn();
});

afterEach(() => {
  vi.restoreAllMocks();
});

const chunkError = () => new TypeError('Failed to fetch dynamically imported module: https://x.test/assets/print-abc123.js');

describe('Milestone 63C: isChunkLoadError', () => {
  test.each([
    ['Chrome', 'Failed to fetch dynamically imported module: https://x.test/a.js'],
    ['Firefox', 'error loading dynamically imported module: https://x.test/a.js'],
    ['Safari', 'Importing a module script failed.'],
    ['Vite CSS preload', 'Unable to preload CSS for /assets/index-abc.css'],
  ])('recognizes the %s wording', (_browser, message) => {
    expect(bridgeModule.isChunkLoadError(new TypeError(message))).toBe(true);
  });

  test('accepts a bare message string as well as an Error', () => {
    expect(bridgeModule.isChunkLoadError('Failed to fetch dynamically imported module: x')).toBe(true);
  });

  test.each([
    ['an ordinary bug', new TypeError("Cannot read properties of undefined (reading 'name')")],
    ['an application fetch() failing', new TypeError('Failed to fetch')],
    ['a null', null],
    ['an undefined', undefined],
    ['an object with no message', {}],
  ])('does not treat %s as a chunk failure', (_label, value) => {
    expect(bridgeModule.isChunkLoadError(value)).toBe(false);
  });
});

describe('Milestone 63C: mountPage', () => {
  test('a chunk that fails while the page mounts shows the panel instead of rejecting', async () => {
    const container = fakeElement('main');
    const bridge = bridgeModule.createFeatureBridge(async () => ({
      mount: async () => { throw chunkError(); },
    }));

    await expect(bridge.mountPage(container, '/a1')).resolves.toBeUndefined();

    const panel = container.children[0];
    expect(panel.attrs.role).toBe('alert');
    expect(textOf(panel)).toContain('This section could not be loaded.');
    expect(walk(panel).some((n) => n.tag === 'button' && n.textContent === 'Reload')).toBe(true);
    expect(window.attachFormHeaderActions).not.toHaveBeenCalled();
    expect(reload).not.toHaveBeenCalled();
  });

  test('an ordinary error from mount() is not swallowed', async () => {
    const container = fakeElement('main');
    const bug = new TypeError("Cannot read properties of undefined (reading 'name')");
    const bridge = bridgeModule.createFeatureBridge(async () => ({
      mount: async () => { throw bug; },
    }));

    await expect(bridge.mountPage(container, '/a1')).rejects.toBe(bug);
    expect(container.children).toEqual([]);
  });

  test('a feature module that fails to load still shows the panel, and is retried next time', async () => {
    const container = fakeElement('main');
    const loader = vi.fn()
      .mockRejectedValueOnce(chunkError())
      .mockResolvedValueOnce({ mount: async () => {} });
    const bridge = bridgeModule.createFeatureBridge(loader);

    await bridge.mountPage(container, '/');
    expect(textOf(container.children[0])).toContain('This section could not be loaded.');

    await bridge.mountPage(container, '/');
    expect(loader).toHaveBeenCalledTimes(2);
    expect(window.attachFormHeaderActions).toHaveBeenCalledTimes(1);
  });

  test('a page that mounts normally still gets its header actions', async () => {
    const container = fakeElement('main');
    const mount = vi.fn(async () => {});
    const bridge = bridgeModule.createFeatureBridge(async () => ({ mount }));

    await bridge.mountPage(container, '/');

    expect(mount).toHaveBeenCalledWith(container, '/');
    expect(window.attachFormHeaderActions).toHaveBeenCalledWith(container);
  });

  test('the panel explains that an update can cause this, and Reload reloads', async () => {
    const container = fakeElement('main');
    const bridge = bridgeModule.createFeatureBridge(async () => { throw chunkError(); });

    await bridge.mountPage(container, '/');

    const panel = container.children[0];
    expect(textOf(panel)).toContain('This can also happen after Guardian Forms has been updated.');
    const button = walk(panel).find((n) => n.tag === 'button');
    button.listeners.click();
    expect(reload).toHaveBeenCalledTimes(1);
  });
});

describe('Milestone 63C: nothing reloads the page on its own', () => {
  // A source scan on purpose. features-loader.js runs at import time against the
  // real `window`, and the behaviour it used to have (reloading) is exactly what
  // a headless unit cannot observe; the browser side is proved in
  // tests/e2e/feature-load-failure.spec.ts. Line comments are stripped so the
  // history note left in the file does not trip the assertions.
  const executable = async () => (await readFile(new URL('../../src/features-loader.js', import.meta.url), 'utf8'))
    .split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('//') && !l.startsWith('*'));

  test('features-loader.js has no automatic reload listener', async () => {
    const lines = (await executable()).join('\n');
    expect(lines).not.toMatch(/vite:preloadError/);
    expect(lines).not.toMatch(/unhandledrejection/);
    expect(lines).not.toMatch(/location\.reload/);
  });
});
