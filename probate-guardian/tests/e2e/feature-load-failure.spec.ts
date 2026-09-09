import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from '@playwright/test';
import { freshStartNoPassword } from './support/target';
import { currentTarget, skipEnvironmentLimitation } from './support/target-profile';

const sourceTarget = currentTarget === 'source';
const webTarget = currentTarget === 'web';
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

test('failed feature chunk shows a reload action instead of a blank view', async ({ page }) => {
  skipEnvironmentLimitation(!sourceTarget, 'The source target exposes a stable unbundled chunk URL for failure injection');

  await freshStartNoPassword(page);
  await page.evaluate(() => (window as any).addWard('Chunk Retry Ward', 'guardian'));

  let failedOnce = false;
  await page.route('**/src/features/dashboard/index.js', async route => {
    failedOnce = true;
    await route.abort('failed');
  });
  await page.evaluate(() => (window as any).navigate('/dashboard'));

  const main = page.locator('#main-content');
  await expect(main).toContainText('This section could not be loaded.');
  await expect(main.getByRole('button', { name: 'Reload' })).toBeVisible();
  expect(failedOnce).toBe(true);

  await page.unroute('**/src/features/dashboard/index.js');
  await Promise.all([
    page.waitForEvent('load'),
    main.getByRole('button', { name: 'Reload' }).click(),
  ]);
  await expect(page).toHaveURL(/#\/dashboard/);
  await expect(main).not.toContainText('This section could not be loaded.');
});

/**
 * Milestone 34: `dist/web`'s Vite build hashes every chunk filename (e.g.
 * `assets/dashboard-lbmMcAnk.js`), so the source test's literal unbundled
 * path above cannot survive a rebuild under `web`. Reads the built
 * `dist/web/sw.js` precache manifest -- the same authoritative source
 * `offline.spec.ts`'s own `generatedManifest()` helper parses -- and returns
 * the single dashboard feature chunk's real built URL. Throws loudly (rather
 * than falling back to a basename glob) if zero or more than one candidate
 * is found, since a silently-wrong chunk selection would inject failure into
 * the wrong request.
 */
async function dashboardChunkUrl(): Promise<string> {
  const workerSource = await readFile(path.join(repoRoot, 'dist/web/sw.js'), 'utf8');
  const match = workerSource.match(/const PRECACHE_MANIFEST=(\{.*\});\r?\nconst CACHE_PREFIX=/);
  if (!match) throw new Error('Generated precache manifest not found in dist/web/sw.js -- run `npm run build:web` first');
  const manifest = JSON.parse(match[1]) as { entries: Array<{ url: string }> };
  const candidates = manifest.entries.filter(entry => /^\.\/assets\/dashboard-[^/]+\.js$/.test(entry.url));
  if (candidates.length !== 1) {
    throw new Error(`Expected exactly one built dashboard chunk in the precache manifest, found ${candidates.length}: ${JSON.stringify(candidates)}`);
  }
  return candidates[0].url.replace(/^\.\//, '');
}

test('failed feature chunk shows a reload action instead of a blank view (web, hashed build)', async ({ page }) => {
  skipEnvironmentLimitation(
    !webTarget,
    'This test proves failure injection against the built, hashed dist/web chunk URL; other targets serve the chunk at a stable unbundled path already covered by the source-only test above.'
  );

  const chunkPath = await dashboardChunkUrl();

  await freshStartNoPassword(page);

  // The dashboard chunk is precached at "offline" tier, not "critical" (see
  // generate-service-worker.mjs), so it is not fetched into the cache on
  // first load -- only critical-tier entries are. This service worker also
  // never calls clients.claim() (sw.js has no such call), so a client is
  // never controlled by a worker that activated after that client's own
  // navigation started. A brand-new Playwright context's first navigation
  // therefore must be uncontrolled, and the dashboard chunk request below
  // must be a genuine network fetch Playwright's page.route can intercept --
  // proven here rather than assumed, so a future change to the install/claim
  // behavior that would silently defeat this test's interception fails
  // loudly instead of leaving a test that always passes regardless of
  // whether the failure was really injected.
  const controlled = await page.evaluate(() => Boolean(navigator.serviceWorker?.controller));
  expect(controlled, 'a fresh session must not already be controlled by a service worker, or route interception below would not see the request').toBe(false);

  await page.evaluate(() => (window as any).addWard('Chunk Retry Ward', 'guardian'));

  let failedOnce = false;
  await page.route(`**/${chunkPath}`, async route => {
    failedOnce = true;
    await route.abort('failed');
  });
  await page.evaluate(() => (window as any).navigate('/dashboard'));

  const main = page.locator('#main-content');
  await expect(main).toContainText('This section could not be loaded.');
  await expect(main.getByRole('button', { name: 'Reload' })).toBeVisible();
  expect(failedOnce).toBe(true);

  await page.unroute(`**/${chunkPath}`);
  await Promise.all([
    page.waitForEvent('load'),
    main.getByRole('button', { name: 'Reload' }).click(),
  ]);
  await expect(page).toHaveURL(/#\/dashboard/);
  await expect(main).not.toContainText('This section could not be loaded.');
});
