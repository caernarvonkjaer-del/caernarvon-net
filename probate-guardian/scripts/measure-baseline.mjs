#!/usr/bin/env node
// Records Milestone 1's baseline metrics (INDEX-SPLIT-PLAN.md step 1) so
// Milestone 2+ extraction work has real numbers to compare against, not
// vibes. Chromium/CDP only -- Performance.getMetrics() is Chromium-specific,
// and the 'source' target (today's unmodified index.html) is the
// meaningful baseline: it's what ships today, before any tooling or
// extraction touches it.
//
// Usage: node scripts/measure-baseline.mjs [--target=source|web|portable]

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

const SERVERS = {
  source: { args: ['vite', 'preview', '--outDir', '.', '--port', '4322', '--strictPort'], url: 'http://localhost:4322/index.html' },
  web: { args: ['vite', 'preview', '--outDir', 'dist/web', '--port', '4323', '--strictPort'], url: 'http://localhost:4323/probate-guardian/' },
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
  const proc = spawn('npx', cfg.args, { cwd: root, stdio: 'ignore', shell: true });
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
  const htmlPath = target === 'source'
    ? path.join(root, 'index.html')
    : path.join(root, 'dist', target, 'index.html');
  const html = await fs.readFile(htmlPath, 'utf8');
  const inlinePattern = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g;
  let match;
  let inline = 0;
  while ((match = inlinePattern.exec(html))) inline += Buffer.byteLength(match[1], 'utf8');

  const external = [];
  if (target === 'portable') {
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
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Performance.enable');

  await page.addInitScript(() => {
    delete window.showSaveFilePicker;
    delete window.showOpenFilePicker;
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

  await browser.close();
  return {
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
  initialEvaluatedScriptBytes: staticScripts.inline + (target === 'portable' ? portableExternalBytes : result.initialScriptResourceDecodedBytes),
  initialApplicationScriptBytes: staticScripts.inline + (target === 'portable' ? portableApplicationExternalBytes : runtimeApplicationBytes),
  ...result,
};

console.log(JSON.stringify(record, null, 2));

const outDir = path.join(root, 'tests/baseline');
await fs.mkdir(outDir, { recursive: true });
const outputName = `milestone-13-${target}.json`;
await fs.writeFile(path.join(outDir, outputName), JSON.stringify(record, null, 2));
console.log(`\nSaved to tests/baseline/${outputName}`);
