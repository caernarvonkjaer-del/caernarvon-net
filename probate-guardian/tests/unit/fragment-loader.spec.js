// src/fragment-loader.js: only allowlisted fragment names are ever fetched.
//
// Moved from tests/e2e/security.spec.ts by Milestone 70's 70T: that test
// called window.loadFragment('../index') in the page and watched the network.
// A browser spec now names no app global but GuardianForms, and the rule is
// the module's own -- so it is checked here, by direct import, with fetch()
// stubbed to record every request. The control shows the allowlisted name
// does reach fetch(), so the empty list for the others means something.
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

let loadFragment;
let requests;
beforeEach(async () => {
  requests = [];
  vi.stubGlobal('window', {});
  vi.stubGlobal('location', { protocol: 'http:' });
  vi.stubGlobal('document', { baseURI: 'http://localhost/app/index.html' });
  vi.stubGlobal('fetch', vi.fn(async (url) => { requests.push(String(url)); throw new Error('network stubbed'); }));
  vi.resetModules();
  ({ loadFragment } = await import('../../src/fragment-loader.js'));
});
afterEach(() => { vi.unstubAllGlobals(); });

describe('loadFragment()', () => {
  test.each(['../index', 'common-modals/../../secret', 'index', '', 'COMMON-MODALS'])('rejects %j without a request', async (name) => {
    await expect(loadFragment(name)).rejects.toThrow('Unknown fragment');
    expect(requests).toEqual([]);
  });

  test('control: the allowlisted fragment is fetched from fragments/ beside the page', async () => {
    await expect(loadFragment('common-modals')).rejects.toThrow('network stubbed');
    expect(requests).toEqual(['http://localhost/app/fragments/common-modals.html']);
  });
});
