import { test, expect } from '@playwright/test';
import { freshStartNoPassword } from './support/target';
import { currentTarget, skipExpectedTargetExclusion } from './support/target-profile';

// Milestone 70, 70A; technical choice T1 in MILESTONE-70-PROPOSAL.md.
// Production is the portable build served over HTTPS from a subfolder of the
// DNN site. The `portable` profile opens that build as a file:// page, where
// the cross-tab filing lock is bypassed entirely and fragments load through
// an inlined import instead of a fetch, so no profile ran the shipped bundle
// the way production runs it. The `portable-http` profile serves it from a
// subfolder on http://localhost (scripts/serve-portable-http.mjs), and this
// spec asserts, on every run, that the parity the profile claims is real
// rather than assumed.
//
// One of the branches it pins is easy to break without noticing: over http
// the portable build FETCHES fragments/common-modals.html from its own
// folder, though vite.config.js describes that copy as unused at runtime.
// Remove it and every modal on the production site stops opening while the
// file:// profile stays green.

const BASE = '/dnn/guardian-forms/';

test.describe('portable-http: parity with how production serves the portable build (Milestone 70, 70A)', () => {
  test('served from a subfolder in a secure context, with no service worker, the real filing lock, and fragments fetched from the package', async ({ page }) => {
    skipExpectedTargetExclusion(currentTarget !== 'portable-http', "Asserts the portable-http profile's parity with production; other targets are not served that way");
    const problems: string[] = [];
    page.on('pageerror', (e) => problems.push(`page error: ${e.message}`));
    page.on('console', (m) => { if (m.type() === 'error') problems.push(`console error: ${m.text()}`); });
    const requests: { path: string; status: number }[] = [];
    page.on('response', (r) => {
      const url = new URL(r.url());
      if (url.origin === 'http://localhost:4341') requests.push({ path: url.pathname, status: r.status() });
    });

    await freshStartNoPassword(page);
    const facts = await page.evaluate(async () => ({
      protocol: location.protocol,
      pathname: location.pathname,
      secure: window.isSecureContext,
      webBuildMarker: !!document.querySelector('meta[name="pg-build"][content="web"]'),
      registrations: 'serviceWorker' in navigator ? (await navigator.serviceWorker.getRegistrations()).length : 0,
      webLocks: typeof (navigator as any).locks?.request === 'function',
    }));
    expect(facts.protocol, 'served over http, not opened as a file').toBe('http:');
    expect(facts.pathname.startsWith(BASE), `served from the ${BASE} subfolder, not the site root`).toBe(true);
    expect(facts.secure, 'a secure context, as production HTTPS is').toBe(true);
    expect(facts.webBuildMarker, 'the portable package, not the hosted web build').toBe(false);
    expect(facts.registrations, 'no service worker, as in production').toBe(0);
    expect(facts.webLocks, 'Web Locks exist, so the cross-tab filing lock is real rather than bypassed').toBe(true);

    // A real click on a control whose dialog lives in the lazy fragment.
    await page.locator('[data-feedback-open]').first().click();
    await expect(page.locator('#feedbackModal'), 'the fragment-backed dialog opens').toBeVisible();
    expect(requests, 'the modal fragment was fetched from the package folder').toContainEqual({ path: `${BASE}fragments/common-modals.html`, status: 200 });

    expect(requests.filter((r) => r.status >= 400), 'no request failed').toEqual([]);
    expect(requests.filter((r) => r.path !== '/' && !r.path.startsWith(BASE)), 'no request escaped the subfolder').toEqual([]);
    expect(problems, 'no page or console error').toEqual([]);
  });
});
