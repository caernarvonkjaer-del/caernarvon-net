#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outputDir = path.join(root, 'dist', 'web');
const indexPath = path.join(outputDir, 'index.html');
const workerPath = path.join(outputDir, 'sw.js');
const buildMarker = '<meta name="pg-build" content="web">';
const manifestToken = '/*__PG_PRECACHE_MANIFEST__*/ null';

async function walk(directory, prefix = '') {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const relativePath = path.posix.join(prefix, entry.name);
    if (entry.isDirectory()) files.push(...await walk(path.join(directory, entry.name), relativePath));
    else files.push(relativePath);
  }
  return files;
}

function revision(content) {
  return createHash('sha256').update(content).digest('hex').slice(0, 16);
}

function normalizeBuildUrl(value) {
  const pathname = new URL(value, 'https://build.invalid/probate-guardian/').pathname;
  return pathname.replace(/^\/probate-guardian\//, '').replace(/^\//, '');
}

let indexHtml = await readFile(indexPath, 'utf8');
if (!indexHtml.includes(buildMarker)) {
  const markedHtml = indexHtml.replace('<meta charset="UTF-8">', `<meta charset="UTF-8">\n${buildMarker}`);
  if (markedHtml === indexHtml) throw new Error('Could not insert the hosted-build marker into dist/web/index.html');
  indexHtml = markedHtml;
  await writeFile(indexPath, indexHtml);
}
if (indexHtml.split(buildMarker).length !== 2) throw new Error('Hosted-build marker must appear exactly once');

const criticalReferences = new Set(['src/legacy-app.js', 'lib/bootstrap.bundle.min.js']);
for (const match of indexHtml.matchAll(/(?:src|href)="([^"]+)"/g)) {
  const file = normalizeBuildUrl(match[1]);
  if (/^assets\/.*\.(?:js|css)$/.test(file)) criticalReferences.add(file);
}

const runtimeAsset = /\.(?:html|js|css|json|png|jpe?g|svg|webp|woff2?|ttf)$/i;
const files = (await walk(outputDir))
  .filter(file => file !== 'sw.js' && runtimeAsset.test(file) && !/\.LICENSE\.txt$/i.test(file))
  .sort();

const entries = [];
for (const file of files) {
  const content = await readFile(path.join(outputDir, file));
  entries.push({
    url: `./${file}`,
    revision: revision(content),
    tier: file === 'index.html' || criticalReferences.has(file) ? 'critical' : 'offline',
    size: content.byteLength,
  });
}

const workerSource = await readFile(path.join(root, 'sw.js'), 'utf8');
const cacheVersion = revision(JSON.stringify({ entries, workerRevision: revision(workerSource) }));
const manifest = { cacheVersion, entries };
if (!workerSource.includes(manifestToken)) {
  throw new Error(`Service worker manifest token is missing: ${manifestToken}`);
}
await writeFile(workerPath, workerSource.replace(manifestToken, JSON.stringify(manifest)));

const critical = entries.filter(entry => entry.tier === 'critical');
const offline = entries.filter(entry => entry.tier === 'offline');
const sum = list => list.reduce((total, entry) => total + entry.size, 0);
console.log(`Generated service worker ${cacheVersion}: ${critical.length} critical (${sum(critical)} bytes), ${offline.length} offline (${sum(offline)} bytes)`);
