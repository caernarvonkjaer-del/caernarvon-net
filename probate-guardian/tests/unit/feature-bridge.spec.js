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
// The feature bridge builds DOM nodes and its Reload button reloads the page,
// and the unit environment is plain node, so both are stubbed minimally.
//
// Milestone 70, 70K: mountPage() resolves true once the page is drawn and false
// when it was not (the feature failed to load, or the navigation was
// superseded); it takes the router's mount context -- the navigation's
// AbortSignal and the filing -- and hands it to the feature's mount(). The
// heading's buttons are the router's to add, after a filing page mounts.

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

    await expect(bridge.mountPage(container, '/a1')).resolves.toBe(false);

    const panel = container.children[0];
    expect(panel.attrs.role).toBe('alert');
    expect(textOf(panel)).toContain('This section could not be loaded.');
    expect(walk(panel).some((n) => n.tag === 'button' && n.textContent === 'Reload')).toBe(true);
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

    expect(await bridge.mountPage(container, '/')).toBe(false);
    expect(textOf(container.children[0])).toContain('This section could not be loaded.');

    expect(await bridge.mountPage(container, '/')).toBe(true);
    expect(loader).toHaveBeenCalledTimes(2);
  });

  test("a page that mounts normally is drawn, the feature given the router's mount context", async () => {
    const container = fakeElement('main');
    const mount = vi.fn(async () => {});
    const bridge = bridgeModule.createFeatureBridge(async () => ({ mount }));
    const context = { signal: new AbortController().signal, filing: { wardId: 'w1' } };

    expect(await bridge.mountPage(container, '/', context)).toBe(true);

    expect(mount).toHaveBeenCalledWith(container, '/', context);
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

// Milestone 70, 70K: two mounts racing for one host. The router aborts a
// navigation's signal when a newer one begins; a mount that learns it has
// been superseded draws nothing more (the race 70G recorded: a slow feature's
// first mount drawn over the page the filer had moved on to).
describe('a superseded navigation draws nothing', () => {
  test('superseded while its feature loaded: its mount never runs, and the page is left to the newer one', async () => {
    const container = fakeElement('main');
    const mount = vi.fn(async () => {});
    let finish;
    const bridge = bridgeModule.createFeatureBridge(() => new Promise((resolve) => { finish = () => resolve({ mount }); }));
    const nav = new AbortController();

    const mounting = bridge.mountPage(container, '/p2', { signal: nav.signal });
    nav.abort();
    finish();
    const drawn = await mounting;

    expect(mount, 'the superseded mount never runs').not.toHaveBeenCalled();
    expect(container.children).toEqual([]);
    expect(drawn).toBe(false);
  });

  test('superseded before its feature failed to load: no panel over the newer page', async () => {
    const container = fakeElement('main');
    const nav = new AbortController();
    const bridge = bridgeModule.createFeatureBridge(async () => { nav.abort(); throw chunkError(); });

    const drawn = await bridge.mountPage(container, '/', { signal: nav.signal });
    expect(container.children, 'no failure panel over the newer page').toEqual([]);
    expect(drawn).toBe(false);
  });

  test('superseded while it drew: it is still the feature to dispose next, and reports that it was superseded', async () => {
    const container = fakeElement('main');
    const nav = new AbortController();
    const dispose = vi.fn();
    const first = { mount: async () => { nav.abort(); }, dispose };
    const bridge = bridgeModule.createFeatureBridge(async () => first);

    expect(await bridge.mountPage(container, '/', { signal: nav.signal })).toBe(false);
    bridgeModule.disposeActiveFeature(container);
    expect(dispose).toHaveBeenCalledWith(container);
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
