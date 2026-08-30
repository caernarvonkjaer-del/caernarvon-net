#!/usr/bin/env node

import { cp, copyFile, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outputDir = path.join(root, 'probate-guardian', 'dist', 'pages');
const probateOutputDir = path.join(outputDir, 'probate-guardian');
const hostedBuildDir = path.join(root, 'probate-guardian', 'dist', 'web');
const hostedIndexPath = path.join(hostedBuildDir, 'index.html');
const hostedWorkerPath = path.join(hostedBuildDir, 'sw.js');

const hostedIndex = await readFile(hostedIndexPath, 'utf8');
const hostedWorker = await readFile(hostedWorkerPath, 'utf8');
if (!hostedIndex.includes('<meta name="pg-build" content="web">')) {
  throw new Error('Hosted Probate Guardian build marker is missing. Run npm run build:web first.');
}
if (!/"cacheVersion":"[a-f0-9]{16}"/.test(hostedWorker)) {
  throw new Error('Generated Probate Guardian service-worker manifest is missing.');
}

await rm(outputDir, { recursive: true, force: true });
await mkdir(outputDir, { recursive: true });
await copyFile(path.join(root, 'index.html'), path.join(outputDir, 'index.html'));
await cp(hostedBuildDir, probateOutputDir, { recursive: true });

const commit = process.env.CF_PAGES_COMMIT_SHA
  || execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
await writeFile(path.join(probateOutputDir, 'deployment.json'), `${JSON.stringify({ commit }, null, 2)}\n`);
await writeFile(path.join(outputDir, '_headers'), `/probate-guardian/
  Cache-Control: no-cache, must-revalidate
/probate-guardian/index.html
  Cache-Control: no-cache, must-revalidate
/probate-guardian/sw.js
  Cache-Control: no-cache, no-store, must-revalidate
/probate-guardian/deployment.json
  Cache-Control: no-cache, no-store, must-revalidate
/probate-guardian/assets/*
  Cache-Control: public, max-age=31536000, immutable
`);

console.log(`Assembled Cloudflare Pages output for ${commit} at ${outputDir}`);