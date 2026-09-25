#!/usr/bin/env node
// Records Milestone 1's baseline metrics (INDEX-SPLIT-PLAN.md step 1) so
// Milestone 2+ extraction work has real numbers to compare against, not
// vibes. Chromium/CDP only -- Performance.getMetrics() is Chromium-specific,
// and the 'source' target (today's unmodified index.html) is the
// meaningful baseline: it's what ships today, before any tooling or
// extraction touches it.
//
// Usage: node scripts/measure-baseline.mjs [--target=source|web|portable|portable-http] [--output=<path>]
//
// Milestone 70, 70A: --output writes the record to a path of your choosing
// (repo-relative), so MS 70's before/after records never overwrite
// Milestone 13's; without it the Milestone 13 file is written as before.
// Every record carries the Node and browser versions, the git SHA, and any
// page or console errors seen while measuring. `portable-http` measures the
// portable build as production serves it (scripts/serve-portable-http.mjs).
// The ports are the milestone-70 branch's own (4332-4334), so a measurement
// here can never read a server the master worktree started; restore
// 4322/4323 at the merge (MILESTONE-70-FIX-LEDGER.md).

import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const targetArg = process.argv.find((a) => a.startsWith('--target='));
const target = targetArg ? targetArg.split('=')[1] : 'source';
const outputArg = process.argv.find((a) => a.startsWith('--output='));

const SERVERS = {
  source: { command: 'npx', args: ['vite', 'preview', '--outDir', '.', '--port', '4332', '--strictPort'], url: 'http://localhost:4332/index.html' },
  web: { command: 'npx', args: ['vite', 'preview', '--outDir', 'dist/web', '--port', '4333', '--strictPort'], url: 'http://localhost:4333/probate-guardian/' },
  'portable-http': { command: 'node', args: ['scripts/serve-portable-http.mjs', '--port=4334'], url: 'http://localhost:4334/Portals/0/Guardian-Forms/index.html' },
};

async function waitForServer(url, timeoutMs = 15000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok || res.status === 304) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error(`Server at ${url} did not become ready within ${timeoutMs}ms`);
}

async function withServer(target, fn) {
  if (target === 'portable') {
    const filePath = path.join(root, 'dist/portable/index.html');
    return fn(pathToFileURL(filePath).href);
  }
  const cfg = SERVERS[target];
  if (!cfg) throw new Error(`Unknown target: ${target}`);
  const proc = spawn(cfg.command, cfg.args, { cwd: root, stdio: 'ignore', shell: true });
  try {
    await waitForServer(cfg.url);
    return await fn(cfg.url);
  } finally {
    proc.kill();
  }
}

async function staticScriptBytes(target) {
  // Computed directly from source rather than at runtime -- still
  // comparable once code moves into hashed chunk files (sum of chunks
  // actually loaded on the initial path), and doesn't require any
  // instrumentation added to index.html itself.
  const distDir = target === 'portable-http' ? 'portable' : target;
  const htmlPath = target === 'source'
    ? path.join(root, 'index.html')
    : path.join(root, 'dist', distDir, 'index.html');
  const html = await fs.readFile(htmlPath, 'utf8');
  const inlinePattern = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g;
  let match;
  let inline = 0;
  while ((match = inlinePattern.exec(html))) inline += Buffer.byteLength(match[1], 'utf8');

  const external = [];
  if (target === 'portable' || target === 'portable-http') {
    for (const script of html.matchAll(/<script[^>]*\bsrc="([^"]+)"[^>]*><\/script>/g)) {
      const src = script[1];
      if (/^(?:https?:|data:|\/\/)/i.test(src)) continue;
      const filePath = path.resolve(path.dirname(htmlPath), src.split(/[?#]/, 1)[0]);
      external.push({ src, bytes: (await fs.stat(filePath)).size });
    }
  }
  return { inline, external };
}

function isApplicationScript(name) {
  const pathname = new URL(name, 'https://measure.invalid').pathname;
  return !pathname.includes('/lib/') && !pathname.includes('/templates/');
}

const ROUTE_CYCLE = ['/dashboard', '/a1', '/a2', '/b1', '/b2', '/b3', '/b4', '/c1', '/c2', '/c3', '/c4', '/c5', '/d1', '/d2', '/d3', '/d4', '/d5', '/print', '/summary', '/'];

async function measure(url) {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const pageErrors = [];
  const consoleErrors = [];
  page.on('pageerror', (e) => pageErrors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Performance.enable');

  await page.addInitScript(() => {
    delete window.showSaveFilePicker;
    delete window.showOpenFilePicker;
    // The terms screen now comes before anything else (added after
    // Milestone 13 wrote this script); accept it the way the e2e harness's
    // gotoApp() does, so the app actually starts and is measured running.
    localStorage.setItem('pg.termsAccepted', '2026-09-15');
  });

  await page.goto(url, { waitUntil: 'networkidle' });
  // Settle point: dashboard/inventory-select has rendered into #main-content.
  await page.waitForFunction(() => {
    const el = document.getElementById('main-content');
    return el && el.innerHTML.trim().length > 0;
  });
  await page.waitForTimeout(300);

  const cdpMetrics = Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map((m) => [m.name, m.value]));
  const nav = await page.evaluate(() => {
    const e = performance.getEntriesByType('navigation')[0];
    return e ? { transferSize: e.transferSize, encodedBodySize: e.encodedBodySize, duration: e.duration } : null;
  });
  const resourceCount = await page.evaluate(() => performance.getEntriesByType('resource').length + 1);
  const scriptResources = await page.evaluate(() => performance.getEntriesByType('resource')
    .filter((entry) => entry.initiatorType === 'script')
    .map((entry) => ({
      name: entry.name,
      transferSize: entry.transferSize,
      encodedBodySize: entry.encodedBodySize,
      decodedBodySize: entry.decodedBodySize,
    })));

  // Route-switch cycle: create one real ward, then cycle through every
  // schedule page 5x, forcing GC before each heap read. Informational only
  // in Milestone 1 -- there's no dispose()/cleanup logic yet for a bound to
  // mean anything against (that's step 8, once mount()/dispose() exist).
  await page.evaluate(() => {
    document.getElementById('startup-newcase-btn')?.click();
  });
  await page.waitForTimeout(200);
  await page.evaluate(() => {
    document.querySelector('#security-choice-overlay [data-startup-action="select-security"][data-security-mode="none"]')?.click();
  });
  await page.waitForTimeout(200);
  await page.evaluate(() => { (window).addWard?.('Baseline Measurement Ward', 'guardian'); });
  await page.waitForFunction(() => window.D?.wardName === 'Baseline Measurement Ward');

  const heapSamples = [];
  for (let cycle = 0; cycle < 5; cycle++) {
    for (const route of ROUTE_CYCLE) {
      await page.evaluate((r) => (window).navigate?.(r), route);
    }
    await cdp.send('HeapProfiler.enable');
    await cdp.send('HeapProfiler.collectGarbage');
    const m = Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map((x) => [x.name, x.value]));
    heapSamples.push(m.JSHeapUsedSize);
  }

  const browserVersion = browser.version();
  await browser.close();
  return {
    browserVersion,
    pageErrors,
    consoleErrors,
    JSHeapUsedSize: cdpMetrics.JSHeapUsedSize,
    Nodes: cdpMetrics.Nodes,
    ScriptDuration: cdpMetrics.ScriptDuration,
    navigation: nav,
    resourceCount,
    scriptResources,
    initialScriptResourceEncodedBytes: scriptResources.reduce((total, resource) => total + resource.encodedBodySize, 0),
    initialScriptResourceDecodedBytes: scriptResources.reduce((total, resource) => total + resource.decodedBodySize, 0),
    heapAfterRouteCycles: heapSamples,
  };
}

const staticScripts = await staticScriptBytes(target);
const result = await withServer(target, measure);
const isPortable = target === 'portable' || target === 'portable-http';
const portableExternalBytes = staticScripts.external.reduce((total, script) => total + script.bytes, 0);
const portableApplicationExternalBytes = staticScripts.external
  .filter(script => isApplicationScript(script.src))
  .reduce((total, script) => total + script.bytes, 0);
const runtimeApplicationBytes = result.scriptResources
  .filter(resource => isApplicationScript(resource.name))
  .reduce((total, resource) => total + resource.decodedBodySize, 0);

const record = {
  target,
  measuredAt: new Date().toISOString(),
  gitSha: (await import('node:child_process').then((cp) => new Promise((resolve) => {
    cp.exec('git rev-parse --short HEAD', { cwd: root }, (err, stdout) => resolve(err ? null : stdout.trim()));
  }))),
  staticInlineScriptBytes: staticScripts.inline,
  staticExternalScripts: staticScripts.external,
  nodeVersion: process.version,
  initialEvaluatedScriptBytes: staticScripts.inline + (isPortable ? portableExternalBytes : result.initialScriptResourceDecodedBytes),
  initialApplicationScriptBytes: staticScripts.inline + (isPortable ? portableApplicationExternalBytes : runtimeApplicationBytes),
  ...result,
};

console.log(JSON.stringify(record, null, 2));

const outputRel = outputArg ? outputArg.slice('--output='.length) : `tests/baseline/milestone-13-${target}.json`;
await fs.mkdir(path.dirname(path.join(root, outputRel)), { recursive: true });
await fs.writeFile(path.join(root, outputRel), JSON.stringify(record, null, 2) + '\n');
console.log(`\nSaved to ${outputRel}`);
