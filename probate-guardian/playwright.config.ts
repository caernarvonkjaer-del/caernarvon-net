import { defineConfig, devices } from '@playwright/test';

// PG_TARGET selects which of Milestone 1's four parity targets the suite
// runs against (see INDEX-SPLIT-PLAN.md / tests/e2e/support/target.ts):
//   source   - today's raw index.html, served statically, unmodified (default)
//   dev      - vite dev server against the same unmodified source
//   web      - built dist/web, served (the chunked/PWA target)
//   portable - built dist/portable/index.html opened via a literal file:// URL
const target = process.env.PG_TARGET || 'source';
const browser = process.env.PG_BROWSER || 'chromium';

const TARGETS = {
  source:   { command: 'npx vite preview --outDir . --port 4321 --strictPort', url: 'http://localhost:4321/index.html', baseURL: 'http://localhost:4321/index.html' },
  dev:      { command: 'npx vite --port 5173 --strictPort', url: 'http://localhost:5173/', baseURL: 'http://localhost:5173/' },
  web:      { command: 'npx vite preview --outDir dist/web --port 4173 --strictPort', url: 'http://localhost:4173/probate-guardian/', baseURL: 'http://localhost:4173/probate-guardian/' },
  portable: null, // no server — tests/e2e/support/target.ts builds a literal file:// URL instead
};

const webServer = TARGETS[target]
  ? { command: TARGETS[target].command, url: TARGETS[target].url, reuseExistingServer: !process.env.CI }
  : undefined;

const BROWSERS = {
  chromium: { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
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
  timeout: 30_000,
  use: {
    baseURL: TARGETS[target]?.baseURL,
    trace: 'retain-on-failure',
  },
  webServer,
  projects: [BROWSERS[browser as keyof typeof BROWSERS]],
});
