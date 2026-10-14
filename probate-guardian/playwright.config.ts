import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { chromium, defineConfig, devices } from '@playwright/test';

// PG_TARGET selects which target the suite runs against (see
// INDEX-SPLIT-PLAN.md / tests/e2e/support/target.ts):
//   source        - today's raw index.html, served statically, unmodified (default)
//   dev           - vite dev server against the same unmodified source
//   web           - built dist/web, served (the chunked/PWA target)
//   portable      - built dist/portable/index.html opened via a literal file:// URL
//   portable-http - the same build served from a subfolder over http (Milestone 70, 70A)
// The named commands (`npm test`, `test:quick`, `test:e2e:*`) set both
// variables themselves through scripts/run-e2e-profile.mjs; a direct
// `npx playwright test` reads whatever the shell carries.
const target = process.env.PG_TARGET || 'source';
const browser = process.env.PG_BROWSER || 'chromium';

function existingPath(candidates: string[]) {
  return candidates.find((candidate) => {
    try {
      return fs.existsSync(candidate);
    } catch {
      return false;
    }
  });
}

function playwrightBrowsersRoot() {
  if (process.env.PLAYWRIGHT_BROWSERS_PATH && process.env.PLAYWRIGHT_BROWSERS_PATH !== '0') {
    return process.env.PLAYWRIGHT_BROWSERS_PATH;
  }

  if (process.platform === 'win32' && process.env.LOCALAPPDATA) {
    return path.join(process.env.LOCALAPPDATA, 'ms-playwright');
  }

  if (process.platform === 'darwin') {
    return path.join(os.homedir(), 'Library', 'Caches', 'ms-playwright');
  }

  return path.join(process.env.XDG_CACHE_HOME || path.join(os.homedir(), '.cache'), 'ms-playwright');
}

function latestBrowserInstall(root: string, prefix: string) {
  try {
    if (!fs.existsSync(root)) return undefined;

    return fs.readdirSync(root, { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && entry.name.startsWith(prefix))
      .map((entry) => entry.name)
      .sort((a, b) => b.localeCompare(a, undefined, { numeric: true }))
      .at(0);
  } catch {
    return undefined;
  }
}

function defaultChromiumExecutablePath() {
  if (process.env.PG_CHROMIUM_EXECUTABLE_PATH) {
    return process.env.PG_CHROMIUM_EXECUTABLE_PATH;
  }

  const browsersRoot = playwrightBrowsersRoot();
  const headlessShellInstall = latestBrowserInstall(browsersRoot, 'chromium_headless_shell-');
  const chromiumInstall = latestBrowserInstall(browsersRoot, 'chromium-');

  return existingPath([
    ...(headlessShellInstall ? [
      path.join(browsersRoot, headlessShellInstall, 'chrome-headless-shell-win64', 'chrome-headless-shell.exe'),
      path.join(browsersRoot, headlessShellInstall, 'chrome-win64', 'headless_shell.exe'),
    ] : []),
    ...(chromiumInstall ? [
      path.join(browsersRoot, chromiumInstall, 'chrome-win64', 'chrome.exe'),
    ] : []),
    chromium.executablePath(),
  ]) || chromium.executablePath();
}

const chromiumExecutablePath = defaultChromiumExecutablePath();

/**
 * The file system of the volume holding `dir`, on Windows, as `fsutil`
 * reports it without elevation -- "FAT32" for this workstation's D:; the
 * system drive answers "Access is denied", which reads as '' here. Empty
 * anywhere the answer is unknown.
 */
export function volumeFileSystem(dir: string): string {
  if (process.platform !== 'win32') return '';
  try {
    const out = execFileSync('fsutil', ['fsinfo', 'volumeinfo', dir.slice(0, 2)], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
    return (out.match(/File System Name\s*:\s*(\S+)/) || [])[1] || '';
  } catch {
    return '';
  }
}

/**
 * TEST-REVIEW.md Delivery 1M (2026-10-13). Workers were 1 -- "all specs hit
 * one shared webServer process; concurrent contexts overloaded it". Measured
 * on C: (NTFS) with the twelve heaviest specs (PDF, Excel, downloads,
 * cross-tab; 132 cases): serial 15.9 min; two workers 10.2 and 11.1 min, all
 * passing; four workers 9.3, 7.2 and 7.1 min, the only failure a race in
 * tab-and-update's own reload test, since fixed. No timeout or server error
 * in six runs. On the FAT32 drive D:, four workers hung three context
 * teardowns and truncated two downloads in one run of six specs, and took
 * longer than one worker (11.4 min against 9.7), so a FAT32 volume keeps one
 * worker. PG_WORKERS overrides either way. Files still run whole on one worker.
 */
export function workersFor(fileSystem: string, env: NodeJS.ProcessEnv = process.env): number {
  return Number(env.PG_WORKERS) || (fileSystem === 'FAT32' ? 1 : 4);
}

// Exported (TEST-REVIEW.md Delivery 1) so scripts/run-e2e-profile.mjs can
// read each target's port for its collision check; this table stays the one
// owner of server commands and URLs.
export const TARGETS = {
  source:   { command: 'npx vite preview --outDir . --port 4321 --strictPort', url: 'http://localhost:4321/index.html', baseURL: 'http://localhost:4321/index.html' },
  dev:      { command: 'npx vite --port 5173 --strictPort', url: 'http://localhost:5173/', baseURL: 'http://localhost:5173/' },
  web:      { command: 'npx vite preview --outDir dist/web --port 4173 --strictPort', url: 'http://localhost:4173/probate-guardian/', baseURL: 'http://localhost:4173/probate-guardian/' },
  portable: null, // no server — tests/e2e/support/target.ts builds a literal file:// URL instead
  // Milestone 70, 70A (T1): dist/portable served from a subfolder over
  // http://localhost, as the DNN site serves it in production.
  'portable-http': { command: 'node scripts/serve-portable-http.mjs --port=4341', url: 'http://localhost:4341/Portals/0/Guardian-Forms/index.html', baseURL: 'http://localhost:4341/Portals/0/Guardian-Forms/index.html' },
};

// TEST-REVIEW.md Delivery 1 (T2): never reuse a server already answering on
// the port. It may serve another checkout or a stale build, and a green run
// would then say nothing about this tree -- on 2026-10-07 a second run beside
// a first would have tested the first run's tree. Playwright fails instead
// with "is already used"; scripts/run-e2e-profile.mjs checks the port first
// and explains what to do. Before 2026-10-13 this was `!process.env.CI`.
const webServer = TARGETS[target]
  ? { command: TARGETS[target].command, url: TARGETS[target].url, reuseExistingServer: false }
  : undefined;

const BROWSERS = {
  chromium: {
    name: 'chromium',
    use: {
      ...devices['Desktop Chrome'],
      ...(chromiumExecutablePath ? { launchOptions: { executablePath: chromiumExecutablePath } } : {}),
    },
  },
  edge: { name: 'edge', use: { ...devices['Desktop Chrome'], channel: 'msedge' } },
  firefox: { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
  webkit: { name: 'webkit', use: { ...devices['Desktop Safari'] } },
};

if (!(browser in BROWSERS)) throw new Error(`Unknown PG_BROWSER: ${browser}`);

export default defineConfig({
  testDir: 'tests/e2e',
  // TEST-REVIEW.md Delivery 2 (T6): a `.only` left in a spec fails the run instead of silently narrowing it -- the
  // runtime backstop for tests/unit/skip-classification-audit.spec.js, which reads the sources.
  forbidOnly: true,
  fullyParallel: false, // fullyParallel only affects tests within one file; workers below is what parallelizes across files
  workers: workersFor(volumeFileSystem(process.cwd())), // see workersFor()
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  timeout: 60_000,
  use: {
    baseURL: TARGETS[target]?.baseURL,
    // Milestone 59C-1. CI keeps one retry, so 'on-first-retry' there records a
    // trace for exactly the runs that need one and nothing for the green
    // majority.
    //
    // Local stays 'retain-on-failure' deliberately, against C6's original
    // proposal of 'off'. Almost all work on this repo happens locally, and a
    // local failure with no trace costs a full reproduce-and-rerun cycle --
    // which is worse than the disk. The gigabyte artifact trees C1 measured
    // are the price of that choice, knowingly paid; they are transient
    // (Playwright discards traces for passing tests at the end of a run) and
    // `test-results/` is ignored.
    trace: process.env.CI ? 'on-first-retry' : 'retain-on-failure',
  },
  webServer,
  projects: [BROWSERS[browser as keyof typeof BROWSERS]],
});
