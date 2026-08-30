#!/usr/bin/env node

import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const url = 'http://localhost:4322/index.html';
const features = [
  { name: 'simplified-accounting', type: 'simplified', route: '/p2' },
  { name: 'plan-simplified', type: 'planSimplified', route: '/p2' },
  { name: 'plan-annual', type: 'planAnnual', route: '/p2' },
  { name: 'plan-initial', type: 'planInitial', route: '/p2' },
  { name: 'plan-minor', type: 'planMinor', route: '/p2' },
  { name: 'annual-accounting', type: 'annual', route: '/scha' },
  { name: 'guardian-inventory', type: 'guardian', route: '/b2' },
];

async function waitForServer(timeoutMs = 15000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok || response.status === 304) return;
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  throw new Error(`Server at ${url} did not become ready within ${timeoutMs}ms`);
}

async function waitForMount(page) {
  await page.waitForFunction(() => document.getElementById('main-content')?.childElementCount > 0);
}

async function dispose(page) {
  await page.evaluate(() => {
    const container = document.getElementById('main-content');
    window.disposeActiveFeature?.(container);
  });
  await page.waitForFunction(() => document.getElementById('main-content')?.childElementCount === 0);
}

async function collect(cdp) {
  await cdp.send('HeapProfiler.enable');
  await cdp.send('HeapProfiler.collectGarbage');
  const metrics = Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map(metric => [metric.name, metric.value]));
  return { heapBytes: metrics.JSHeapUsedSize, nodes: metrics.Nodes };
}

const server = spawn('npx', ['vite', 'preview', '--outDir', '.', '--port', '4322', '--strictPort'], {
  cwd: root,
  stdio: 'ignore',
  shell: true,
});

let browser;
try {
  await waitForServer();
  browser = await chromium.launch();
  const page = await browser.newPage();
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Performance.enable');
  await page.addInitScript(() => {
    delete window.showSaveFilePicker;
    delete window.showOpenFilePicker;
  });
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.locator('#startup-newcase-btn').click();
  await page.locator('#security-choice-overlay [data-startup-action="select-security"][data-security-mode="none"]').click();

  const wardIds = new Map();
  for (const feature of features) {
    const wardId = await page.evaluate(
      ({ name, type }) => addWard(`Lifecycle ${name}`, type),
      feature,
    );
    wardIds.set(feature.name, wardId);
    await waitForMount(page);
  }

  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => {
    if (message.type() === 'error') errors.push(message.text());
  });

  const results = [];
  for (const feature of features) {
    await page.evaluate(id => switchWard(id), wardIds.get(feature.name));
    await waitForMount(page);
    await page.evaluate(route => navigate(route), feature.route);
    await waitForMount(page);
    await dispose(page);
    const warmed = await collect(cdp);

    for (let cycle = 0; cycle < 20; cycle++) {
      await page.evaluate(route => navigate(route), feature.route);
      await waitForMount(page);
      await dispose(page);
    }

    const afterCycles = await collect(cdp);
    results.push({
      feature: feature.name,
      cycles: 20,
      warmed,
      afterCycles,
      heapGrowthBytes: afterCycles.heapBytes - warmed.heapBytes,
      nodeGrowth: afterCycles.nodes - warmed.nodes,
    });
  }

  await page.evaluate(() => navigate('/dashboard'));
  await waitForMount(page);
  await dispose(page);
  const dashboardWarmed = await collect(cdp);
  for (let cycle = 0; cycle < 20; cycle++) {
    await page.evaluate(() => navigate('/dashboard'));
    await waitForMount(page);
    await dispose(page);
  }
  const dashboardAfterCycles = await collect(cdp);
  results.push({
    feature: 'dashboard',
    cycles: 20,
    warmed: dashboardWarmed,
    afterCycles: dashboardAfterCycles,
    heapGrowthBytes: dashboardAfterCycles.heapBytes - dashboardWarmed.heapBytes,
    nodeGrowth: dashboardAfterCycles.nodes - dashboardWarmed.nodes,
  });

  if (errors.length) throw new Error(`Lifecycle console errors:\n${errors.join('\n')}`);
  const record = {
    target: 'source',
    browser: 'chromium',
    measuredAt: new Date().toISOString(),
    cyclesPerFeature: 20,
    results,
  };
  const outputPath = path.join(root, 'tests', 'baseline', 'milestone-13-lifecycle.json');
  await fs.writeFile(outputPath, JSON.stringify(record, null, 2));
  console.log(JSON.stringify(record, null, 2));
  console.log('\nSaved to tests/baseline/milestone-13-lifecycle.json');
} finally {
  await browser?.close();
  server.kill();
}