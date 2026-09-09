#!/usr/bin/env node
// Milestone 33, Phase 5: a single cross-platform runner for the four
// distribution/browser execution profiles ("source"/"web"/"portable"/
// browser-specific smoke). Exists because every profile invocation needs
// PG_TARGET/PG_BROWSER set for a spawned Playwright process, and this repo
// has no cross-env dependency -- setting process.env directly here (rather
// than "PG_TARGET=x npx playwright test" in package.json's scripts) avoids
// depending on shell-specific env-var syntax, since this project's own
// HOW-TO-RUN.txt documents PowerShell's `$env:X=` form, which the bare
// POSIX "X=y cmd" form doesn't work with on Windows.
//
// Usage: node scripts/run-e2e-profile.mjs <source|web|portable|firefox|webkit|edge|all>

import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

// MILESTONE-33-PROPOSAL.md, Phase 5 Sec.1: "The hosted and portable profiles
// run all distribution-sensitive specs, not the whole source suite." These
// lists are that curated set, mapped directly from the doc's own per-profile
// prose (verified against tests/e2e/support/target-profile.ts's skip
// classification -- ward-lock.spec.ts and tab-and-update.spec.ts already
// self-exclude their Locks-API/service-worker-dependent portions under
// `portable` via existing skipExpectedTargetExclusion guards, which is the
// doc's "explicit service-worker exclusions" requirement, exercised for
// real here rather than assumed).
const HOSTED_PARITY_SPECS = [
  'tests/e2e/pwa-registration.spec.ts',
  'tests/e2e/offline.spec.ts',
  'tests/e2e/startup.spec.ts',
  'tests/e2e/case-file-roundtrip.spec.ts',
  'tests/e2e/backup-restore-sav.spec.ts',
  'tests/e2e/dashboard-backup.spec.ts',
  // Milestone 34: the doc's "hosted parity" row names "chunk-load failure";
  // feature-load-failure.spec.ts now has a web-mode sibling test (manifest-
  // driven, hashed-chunk interception) alongside its original source-only
  // test, closing the gap MILESTONE-33-PROPOSAL.md's Phase 5 progress note
  // recorded.
  'tests/e2e/feature-load-failure.spec.ts',
];

const PORTABLE_PARITY_SPECS = [
  'tests/e2e/startup.spec.ts',
  'tests/e2e/case-file-roundtrip.spec.ts',
  'tests/e2e/backup-restore-sav.spec.ts',
  'tests/e2e/pwa-registration.spec.ts',
  'tests/e2e/ward-lock.spec.ts',
  'tests/e2e/tab-and-update.spec.ts',
];

const CROSS_BROWSER_SMOKE_SPECS = [
  'tests/e2e/form-entry-ux.spec.ts',
  'tests/e2e/form-entry.contract.spec.ts',
  'tests/e2e/case-file-roundtrip.spec.ts',
  'tests/e2e/navigation-status.contract.spec.ts',
  'tests/e2e/startup.spec.ts',
  'tests/e2e/unlock.spec.ts',
];

// specs: null means "run the whole tests/e2e/ suite unscoped" -- that IS
// what "Core full" already means, no new restriction needed.
const PROFILES = {
  source: { target: 'source', browser: 'chromium', build: null, specs: null },
  web: { target: 'web', browser: 'chromium', build: 'build:web', specs: HOSTED_PARITY_SPECS },
  portable: { target: 'portable', browser: 'chromium', build: 'build:portable', specs: PORTABLE_PARITY_SPECS },
  firefox: { target: 'source', browser: 'firefox', build: null, specs: CROSS_BROWSER_SMOKE_SPECS },
  webkit: { target: 'source', browser: 'webkit', build: null, specs: CROSS_BROWSER_SMOKE_SPECS },
  edge: { target: 'source', browser: 'edge', build: null, specs: CROSS_BROWSER_SMOKE_SPECS },
};

function run(command, args, env) {
  return new Promise((resolve, reject) => {
    const proc = spawn(command, args, { cwd: root, stdio: 'inherit', shell: true, env });
    proc.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`${command} ${args.join(' ')} exited with code ${code}`))));
  });
}

async function runProfile(name) {
  const profile = PROFILES[name];
  if (!profile) throw new Error(`Unknown profile: ${name}. Expected one of: ${Object.keys(PROFILES).join(', ')}, all`);

  const label = `${profile.target}/${profile.browser}`;
  console.log(`\n=== profile: ${label} ===`);

  if (profile.build) {
    console.log(`Building (npm run ${profile.build})...`);
    await run('npm', ['run', profile.build], process.env);
  }

  const env = { ...process.env, PG_TARGET: profile.target, PG_BROWSER: profile.browser };
  const args = ['playwright', 'test', ...(profile.specs || [])];

  try {
    await run('npx', args, env);
    console.log(`=== profile: ${label} -- done ===\n`);
  } catch (e) {
    console.log(`=== profile: ${label} -- FAILED ===\n`);
    throw e;
  }
}

const requested = process.argv[2];
if (!requested) {
  console.error(`Usage: node scripts/run-e2e-profile.mjs <${Object.keys(PROFILES).join('|')}|all>`);
  process.exit(1);
}

if (requested === 'all') {
  // Scheduled/release validation runs all profiles, one at a time -- same
  // "retain serial execution" discipline workers:1 already applies within
  // a single run, extended here across profiles rather than run concurrently.
  for (const name of Object.keys(PROFILES)) {
    await runProfile(name);
  }
} else {
  await runProfile(requested);
}
