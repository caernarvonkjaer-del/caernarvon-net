import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { chromium, defineConfig, devices } from '@playwright/test';

// PG_TARGET selects which of Milestone 1's four parity targets the suite
// runs against (see INDEX-SPLIT-PLAN.md / tests/e2e/support/target.ts):
//   source   - today's raw index.html, served statically, unmodified (default)
//   dev      - vite dev server against the same unmodified source
//   web      - built dist/web, served (the chunked/PWA target)
//   portable - built dist/portable/index.html opened via a literal file:// URL
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

// Milestone 70 branch only (MILESTONE-70-FIX-LEDGER.md, "Branch-only
// settings"): master's worktree serves its tests on 4321/4173 and reuses a
// server already listening there (reuseExistingServer, below). With master
// and milestone-70 checked out side by side, a run in either worktree could
// silently test the other's files. The branch therefore uses its own ports.
// Restore 4321/4173 in the merge.
const TARGETS = {
  source:   { command: 'npx vite preview --outDir . --port 4331 --strictPort', url: 'http://localhost:4331/index.html', baseURL: 'http://localhost:4331/index.html' },
  dev:      { command: 'npx vite --port 5183 --strictPort', url: 'http://localhost:5183/', baseURL: 'http://localhost:5183/' },
  web:      { command: 'npx vite preview --outDir dist/web --port 4183 --strictPort', url: 'http://localhost:4183/probate-guardian/', baseURL: 'http://localhost:4183/probate-guardian/' },
  portable: null, // no server — tests/e2e/support/target.ts builds a literal file:// URL instead
};

const webServer = TARGETS[target]
  ? { command: TARGETS[target].command, url: TARGETS[target].url, reuseExistingServer: !process.env.CI }
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
  fullyParallel: false, // fullyParallel only affects tests within one file; workers below is what actually serializes across files
  workers: 1, // all specs hit one shared webServer process (vite preview/dev) -- concurrent contexts overloaded it
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
