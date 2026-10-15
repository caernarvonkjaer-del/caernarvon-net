#!/usr/bin/env node
// Milestone 33, Phase 5: a single cross-platform runner for the distribution/
// browser execution profiles ("source"/"web"/"portable"/portable-http/
// browser-specific smoke). Exists because every profile invocation needs
// PG_TARGET/PG_BROWSER set for a spawned Playwright process, and this repo
// has no cross-env dependency -- setting process.env directly here (rather
// than "PG_TARGET=x npx playwright test" in package.json's scripts) avoids
// depending on shell-specific env-var syntax, since this project's own
// HOW-TO-RUN.txt documents PowerShell's `$env:X=` form, which the bare
// POSIX "X=y cmd" form doesn't work with on Windows.
//
// TEST-REVIEW.md, Delivery 1 (2026-10-13). This runner is what `npm test`'s
// browser leg and `test:quick` go through, so both are source/Chromium here
// whatever PG_TARGET/PG_BROWSER the shell carries (T1); the quick tier's four
// specs are owned here, not copied into package.json; `all` runs an explicit
// release list, never "every key of PROFILES"; and a profile refuses to start
// while the port its server needs is held by another process (T2) -- the
// server that answers there could be another checkout's or a stale preview,
// and nothing can tell. The port comes from playwright.config.ts, which stays
// the owner of server URLs. The functions are exported so
// tests/unit/test-profile-runner.spec.js can drive them with a fake child;
// the command line below runs only when this file is the entry point.
//
// Usage: node scripts/run-e2e-profile.mjs <a profile of scripts/test-profiles.mjs|all>

import { spawn } from 'node:child_process';
import net from 'node:net';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const root = path.resolve(__dirname, '..');

// TEST-REVIEW.md Delivery 4 (T5, 2026-10-14; the 4P prototype first). The
// profiles come from two owners and nowhere else: scripts/test-profiles.mjs
// (each profile's id, target, browser, build, manifest selection; the
// release's order) and tests/profile-manifest.json (the curated spec lists:
// web, portable, portable-http, the extra browsers' files and tags, the
// quick tier). This file names no spec path and no profile value of its
// own; tests/unit/test-profile-runner.spec.js holds it to that, and
// tests/unit/profile-membership.spec.js holds the manifest to the specs (a
// spec that branches on a built target must be in that target's list).
// MILESTONE-33-PROPOSAL.md, Phase 5 Sec.1, is where the curated idea comes
// from: "The hosted and portable profiles run all distribution-sensitive
// specs, not the whole source suite."
import { PROFILE_REGISTRY, RELEASE_ORDER, validateRegistry } from './test-profiles.mjs';

export const MANIFEST_PATH = 'tests/profile-manifest.json';
export function readManifest() {
  return JSON.parse(fs.readFileSync(path.join(root, MANIFEST_PATH), 'utf8'));
}
/** A manifest profile's specs, with what it extends first (portable-http runs portable's list and its own). */
export function profileSpecs(manifest, name) {
  const p = manifest.profiles[name];
  if (!p) throw new Error(`${MANIFEST_PATH} has no profile "${name}"`);
  return [...(p.extends ? profileSpecs(manifest, p.extends) : []), ...p.specs];
}
/** What a registry selection runs: null for the whole suite (and for a profile with its own config), else the manifest's list. */
export function selectionSpecs(manifest, selection) {
  return selection === 'all' || selection === 'historical' ? null : profileSpecs(manifest, selection);
}
/** The runnable profiles: the registry's values with the manifest's specs and, for the extra browsers, the manifest's tag. */
export function composeProfiles(registry = PROFILE_REGISTRY, manifest = readManifest()) {
  const out = {};
  for (const [name, entry] of Object.entries(registry)) {
    const tags = manifest.profiles[entry.selection]?.tags;
    out[name] = { ...entry, specs: selectionSpecs(manifest, entry.selection), ...(tags?.[entry.browser] ? { grep: tags[entry.browser] } : {}) };
  }
  return out;
}

const MANIFEST = readManifest();
export const PROFILES = composeProfiles(PROFILE_REGISTRY, MANIFEST);
export const RELEASE_PROFILES = [...RELEASE_ORDER];
export const QUICK_SPECS = profileSpecs(MANIFEST, 'quick');
export const CROSS_BROWSER_SMOKE_SPECS = profileSpecs(MANIFEST, 'cross-browser');
export const CROSS_BROWSER_TAG = MANIFEST.profiles['cross-browser'].tags.firefox;
export const EDGE_SMOKE_TAG = MANIFEST.profiles['cross-browser'].tags.edge;

/** The registry's problems against what playwright.config.ts and the manifest define; empty when it is right. */
export async function registryProblems(registry = PROFILE_REGISTRY, order = RELEASE_ORDER, manifest = MANIFEST) {
  const config = await import(pathToFileURL(path.join(root, 'playwright.config.ts')).href);
  return validateRegistry(registry, order, {
    targets: Object.keys(config.TARGETS),
    browsers: Object.keys(config.BROWSERS),
    selections: Object.keys(manifest.profiles),
  });
}

/** The child's environment: the profile's target and browser, over whatever the shell carries. */
export function profileEnv(profile, baseEnv = process.env) {
  return { ...baseEnv, PG_TARGET: profile.target, PG_BROWSER: profile.browser };
}

export function playwrightArgs(profile) {
  return ['playwright', 'test', ...(profile.config ? [`--config=${profile.config}`] : []), ...(profile.specs || []), ...(profile.grep ? ['--grep', profile.grep] : [])];
}

/**
 * Resolves true if something is listening on `port`, on either loopback
 * stack. Both, because `vite preview` binds ::1 only on this platform -- a
 * 127.0.0.1-only probe gets ECONNREFUSED against a server that is plainly
 * running (scripts/run-guide-capture.mjs found the same).
 */
export function portInUse(port) {
  const tryHost = (host) => new Promise((resolve) => {
    const socket = net.createConnection({ port, host });
    const done = (result) => {
      socket.removeAllListeners();
      socket.destroy();
      resolve(result);
    };
    socket.once('connect', () => done(true));
    socket.once('error', () => done(false));
    socket.setTimeout(1500, () => done(false));
  });
  return Promise.all(['::1', '127.0.0.1'].map(tryHost)).then((results) => results.some(Boolean));
}

/**
 * The URL a target's server answers at, from playwright.config.ts, which
 * owns it (Node strips the config's types on import). The config checks
 * PG_BROWSER as it loads, so it sees a known browser here whatever the shell
 * carries; the table it exports does not depend on either variable. Null
 * for a target with no server (portable opens a file:// page).
 */
export async function serverUrlForTarget(target) {
  const saved = process.env.PG_BROWSER;
  process.env.PG_BROWSER = 'chromium';
  try {
    const { TARGETS } = await import(pathToFileURL(path.join(root, 'playwright.config.ts')).href);
    return TARGETS[target]?.url ?? null;
  } finally {
    if (saved === undefined) delete process.env.PG_BROWSER;
    else process.env.PG_BROWSER = saved;
  }
}

/** What a maintainer reads when a profile's port is held: what, why, how to look, and that nothing was stopped. */
export function collisionDiagnostic(profileName, url) {
  const { hostname, port } = new URL(url);
  return [
    `Profile "${profileName}" needs ${url}, but port ${port} on ${hostname} is already held by another process.`,
    'That process was not reused: a run must test this working tree through a server it started itself,',
    'and nothing here can tell whether the listener is another checkout, a preview server left over from',
    'an earlier run, or something unrelated. Nothing was stopped.',
    'To see what holds the port (Windows PowerShell):',
    `  Get-NetTCPConnection -LocalPort ${port} -State Listen | Select-Object LocalAddress, OwningProcess`,
    '  Get-Process -Id <OwningProcess>',
    'Stop it only once you know it is yours -- Stop-Process -Id <pid>, or its own terminal -- then run again.',
    'If those commands show nothing, the port is still held: the listener may be on the other loopback',
    'address or owned by another user, and this check cannot say more.',
  ].join('\n');
}

const COLLISION_TEXT = /is already used|already in use|EADDRINUSE|was not able to start/i;

/** Whether Playwright's own output reports a server it could not start because the port was taken. */
export function mentionsPortCollision(output) {
  return COLLISION_TEXT.test(output);
}

/**
 * Runs a command and resolves with its exit code. Output is forwarded as it
 * arrives and also handed to `onOutput`, so a profile can recognise a late
 * port collision in Playwright's own words; nothing else is read into it.
 */
export function defaultSpawn(command, args, { cwd, env, onOutput } = {}) {
  return new Promise((resolve, reject) => {
    const proc = spawn(command, args, { cwd, env, shell: true, stdio: ['inherit', 'pipe', 'pipe'] });
    proc.stdout.on('data', (chunk) => { process.stdout.write(chunk); onOutput?.(String(chunk)); });
    proc.stderr.on('data', (chunk) => { process.stderr.write(chunk); onOutput?.(String(chunk)); });
    proc.on('error', reject);
    proc.on('close', (code, signal) => resolve(code ?? (signal ? 1 : 0)));
  });
}

export async function run(command, args, env, { spawn: spawner = defaultSpawn, onOutput } = {}) {
  const code = await spawner(command, args, { cwd: root, env, onOutput });
  if (code !== 0) {
    const error = new Error(`${command} ${args.join(' ')} exited with code ${code}`);
    error.exitCode = code;
    throw error;
  }
}

/**
 * Runs one profile: its build if it has one, then Playwright with the
 * profile's target and browser pinned. Refuses, before Playwright starts,
 * when the target's port is held. `options` exist for the unit spec: a fake
 * `spawn`, a fixed `env`, a `serverUrl` lookup and a `checkPort` probe.
 * `built` is the set of build scripts already run in this invocation --
 * `all` passes one set through every profile, so an artifact two profiles
 * share (dist/portable, for portable and portable-http) is built once.
 */
export async function runProfile(name, options = {}) {
  const {
    spawn: spawner = defaultSpawn,
    env = process.env,
    log = console.log,
    serverUrl = serverUrlForTarget,
    checkPort = portInUse,
    built = new Set(),
  } = options;
  const profile = PROFILES[name];
  if (!profile) throw new Error(`Unknown profile: ${name}. Expected one of: ${Object.keys(PROFILES).join(', ')}, all`);
  const wrong = await (options.registryProblems ?? registryProblems)();
  if (wrong.length) throw new Error(`scripts/test-profiles.mjs cannot run as it is:\n  ${wrong.join('\n  ')}`);
  if (Array.isArray(profile.specs) && profile.specs.length === 0) {
    throw new Error(`Profile "${name}" selects no specs; a fixed selection must name at least one.`);
  }

  const label = `${profile.target}/${profile.browser}`;
  log(`\n=== profile: ${name} (${label}) ===`);

  if (profile.build && built.has(profile.build)) {
    log(`Built earlier in this run (npm run ${profile.build}); reusing it.`);
  } else if (profile.build) {
    log(`Building (npm run ${profile.build})...`);
    await run('npm', ['run', profile.build], env, { spawn: spawner });
    built.add(profile.build);
  }

  const url = profile.server === false ? null : await serverUrl(profile.target);
  if (url && await checkPort(Number(new URL(url).port))) {
    const error = new Error(collisionDiagnostic(name, url));
    error.portCollision = true;
    throw error;
  }

  let tail = '';
  const onOutput = (text) => { tail = (tail + text).slice(-8192); };
  try {
    await run('npx', playwrightArgs(profile), profileEnv(profile, env), { spawn: spawner, onOutput });
    log(`=== profile: ${name} -- done ===\n`);
  } catch (error) {
    // A preflight can race a later bind; Playwright's own startup failure is
    // then the fatal one, explained in the same words.
    if (url && mentionsPortCollision(tail)) {
      error.message += `\n\nPlaywright could not start its server.\n${collisionDiagnostic(name, url)}`;
      error.portCollision = true;
    }
    log(`=== profile: ${name} -- FAILED ===\n`);
    throw error;
  }
}

export async function runRelease(options = {}) {
  const built = new Set();
  for (const name of RELEASE_PROFILES) await runProfile(name, { ...options, built });
}

function isEntryPoint() {
  if (!process.argv[1]) return false;
  const a = path.resolve(process.argv[1]);
  const b = fileURLToPath(import.meta.url);
  return process.platform === 'win32' ? a.toLowerCase() === b.toLowerCase() : a === b;
}

if (isEntryPoint()) {
  const requested = process.argv[2];
  if (!requested) {
    console.error(`Usage: node scripts/run-e2e-profile.mjs <${Object.keys(PROFILES).join('|')}|all>`);
    process.exit(1);
  }
  try {
    if (requested === 'all') await runRelease();
    else await runProfile(requested);
  } catch (error) {
    console.error(`\n${error.message}`);
    process.exit(typeof error.exitCode === 'number' && error.exitCode > 0 ? error.exitCode : 1);
  }
}
