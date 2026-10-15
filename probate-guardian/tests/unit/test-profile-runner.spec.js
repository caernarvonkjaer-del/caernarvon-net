import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { describe, expect, test } from 'vitest';
import config, { TARGETS, workersFor } from '../../playwright.config.ts';
import {
  CROSS_BROWSER_SMOKE_SPECS, CROSS_BROWSER_TAG, EDGE_SMOKE_TAG, MANIFEST_PATH, PROFILES, QUICK_SPECS, RELEASE_PROFILES,
  collisionDiagnostic, composeProfiles, mentionsPortCollision, playwrightArgs, profileEnv, readManifest, registryProblems, root, run,
  runProfile, runRelease,
} from '../../scripts/run-e2e-profile.mjs';
import { BUILDS, NEVER_RELEASED, PROFILE_REGISTRY, RELEASE_ORDER, validateRegistry } from '../../scripts/test-profiles.mjs';

// TEST-REVIEW.md Delivery 1 (T1, T2): what the named test commands actually
// run. Before 2026-10-13, `npm test`'s browser leg was a bare `playwright
// test` and `test:quick` listed its four specs in package.json, so a
// PG_TARGET or PG_BROWSER left in the shell chose the target or browser for
// both; `all` ran every key of the profile table; and a run whose port was
// held reused whatever answered there. These drive the runner with a fake
// child and inspect what it would have launched; the one real child proves
// an exit code comes back.

const fakeSpawn = (exitCode = 0, output = '') => {
  const calls = [];
  const spawn = async (command, args, { env, onOutput }) => {
    calls.push({ command, args, env });
    if (output) onOutput?.(output);
    return exitCode;
  };
  return { spawn, calls };
};
const noServer = async () => null;
const quiet = () => {};
const polluted = { PG_TARGET: 'web', PG_BROWSER: 'firefox', PATH: process.env.PATH };

describe('the named tiers are fixed to source/Chromium', () => {
  test.each(['source', 'quick'])('%s launches Playwright with PG_TARGET=source and PG_BROWSER=chromium over a shell that says web/firefox', async (name) => {
    const { spawn, calls } = fakeSpawn();
    await runProfile(name, { spawn, env: polluted, serverUrl: noServer, log: quiet });
    expect(calls).toHaveLength(1);
    expect(calls[0].command).toBe('npx');
    expect(calls[0].args.slice(0, 2)).toEqual(['playwright', 'test']);
    expect(calls[0].env.PG_TARGET).toBe('source');
    expect(calls[0].env.PG_BROWSER).toBe('chromium');
  });

  test('source runs the whole suite; quick runs exactly its four specs, each a file that exists', async () => {
    expect(playwrightArgs(PROFILES.source)).toEqual(['playwright', 'test']);
    expect(playwrightArgs(PROFILES.quick)).toEqual(['playwright', 'test', ...QUICK_SPECS]);
    expect(QUICK_SPECS.length).toBeGreaterThan(0);
    for (const spec of QUICK_SPECS) expect(fs.existsSync(path.join(root, spec)), spec).toBe(true);
  });

  test('package.json composes the tiers through the runner and carries no copied spec list', () => {
    const { scripts } = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
    expect(scripts.test).toBe('npm run test:unit && npm run test:e2e');
    expect(scripts['test:e2e']).toBe('npm run test:e2e:source');
    expect(scripts['test:e2e:source']).toBe('node scripts/run-e2e-profile.mjs source');
    expect(scripts['test:e2e:quick']).toBe('node scripts/run-e2e-profile.mjs quick');
    expect(scripts['test:quick']).toBe('npm run test:unit && npm run test:e2e:quick');
    expect(scripts['test:e2e:all-profiles']).toBe('node scripts/run-e2e-profile.mjs all');
    for (const [name, command] of Object.entries(scripts)) {
      expect(command, `${name} names a spec path`).not.toContain('tests/e2e/');
    }
  });

  test('a profile with an empty fixed selection is refused, not run as the whole suite', async () => {
    PROFILES.__empty = { target: 'source', browser: 'chromium', build: null, specs: [] };
    try {
      const { spawn, calls } = fakeSpawn();
      await expect(runProfile('__empty', { spawn, env: polluted, serverUrl: noServer, log: quiet })).rejects.toThrow(/selects no specs/);
      expect(calls).toHaveLength(0);
    } finally {
      delete PROFILES.__empty;
    }
  });

  test('an unknown profile is refused by name', async () => {
    await expect(runProfile('nope', { spawn: fakeSpawn().spawn, log: quiet })).rejects.toThrow(/Unknown profile: nope/);
  });
});

describe('a failing child fails the profile', () => {
  test('a fake child exiting 1 rejects with that code', async () => {
    const { spawn } = fakeSpawn(1);
    await expect(runProfile('quick', { spawn, env: polluted, serverUrl: noServer, log: quiet })).rejects.toMatchObject({ exitCode: 1 });
  });

  test('a real child exiting 3 rejects with 3', async () => {
    // A parenthesis-free expression: the runner spawns through the shell, and
    // sh (the Linux CI runner's) rejects a bare `(` where cmd.exe passes it on.
    await expect(run('node', ['-e', 'process.exitCode=3'], process.env)).rejects.toMatchObject({ exitCode: 3 });
  });
});

describe('`all` is the explicit release list', () => {
  test('runs each release profile once, in order, with its build first, and never quick or an unlisted entry', async () => {
    PROFILES.__diagnostic = { target: 'source', browser: 'chromium', build: null, specs: ['tests/e2e/startup.spec.ts'] };
    try {
      const { spawn, calls } = fakeSpawn();
      await runRelease({ spawn, env: polluted, serverUrl: noServer, log: quiet });
      const launches = calls.filter((c) => c.command === 'npx').map((c) => `${c.env.PG_TARGET}/${c.env.PG_BROWSER}`);
      expect(launches).toEqual(RELEASE_PROFILES.map((n) => `${PROFILES[n].target}/${PROFILES[n].browser}`));
      expect(RELEASE_PROFILES).not.toContain('quick');
      expect(RELEASE_PROFILES).not.toContain('__diagnostic');
      expect(Object.keys(PROFILES)).toContain('quick');
      const quickLaunches = calls.filter((c) => c.command === 'npx' && c.args.slice(2).join(' ') === QUICK_SPECS.join(' '));
      expect(quickLaunches).toHaveLength(0);
      // Each artifact is built once per `all` (TEST-REVIEW.md Delivery 1M):
      // dist/portable serves both portable and portable-http. Until
      // 2026-10-14 the release built it twice.
      const builds = calls.filter((c) => c.command === 'npm').map((c) => c.args.join(' '));
      expect(builds).toEqual(['run build:web', 'run build:portable']);
      const portableLaunches = calls.filter((c) => c.command === 'npx' && /^portable/.test(c.env.PG_TARGET));
      expect(portableLaunches).toHaveLength(2);
    } finally {
      delete PROFILES.__diagnostic;
    }
  });

  test('a built profile run on its own still builds its artifact', async () => {
    const { spawn, calls } = fakeSpawn();
    await runProfile('portable-http', { spawn, env: polluted, serverUrl: noServer, log: quiet });
    expect(calls.filter((c) => c.command === 'npm').map((c) => c.args.join(' '))).toEqual(['run build:portable']);
  });
});

describe('a held port is refused, and the listener left alone', () => {
  async function listen() {
    const server = http.createServer((_req, res) => res.end('not this suite'));
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    return server;
  }

  test('the profile stops before Playwright, names the profile and port, says what to run, and stops nothing', async () => {
    const server = await listen();
    const { port } = server.address();
    const url = `http://localhost:${port}/index.html`;
    try {
      const { spawn, calls } = fakeSpawn();
      const failure = await runProfile('source', { spawn, env: polluted, serverUrl: async () => url, log: quiet }).catch((e) => e);
      expect(failure).toBeInstanceOf(Error);
      expect(failure.portCollision).toBe(true);
      expect(failure.message).toContain('Profile "source"');
      expect(failure.message).toContain(`port ${port}`);
      expect(failure.message).toContain(`Get-NetTCPConnection -LocalPort ${port}`);
      expect(failure.message).toContain('Nothing was stopped');
      expect(calls, 'Playwright was never launched').toHaveLength(0);
      expect(server.listening, 'the foreign listener is untouched').toBe(true);
      const reply = await new Promise((resolve, reject) => {
        http.get(`http://127.0.0.1:${port}/`, (res) => {
          let body = '';
          res.on('data', (c) => { body += c; });
          res.on('end', () => resolve(body));
        }).on('error', reject);
      });
      expect(reply).toBe('not this suite');
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  test('once the port is free the same profile launches', async () => {
    const server = await listen();
    const { port } = server.address();
    await new Promise((resolve) => server.close(resolve));
    const { spawn, calls } = fakeSpawn();
    await runProfile('source', { spawn, env: polluted, serverUrl: async () => `http://localhost:${port}/index.html`, log: quiet });
    expect(calls).toHaveLength(1);
  });

  test("Playwright's own late collision gets the same guidance after its error", async () => {
    const late = 'Error: http://localhost:4321/index.html is already used, make sure that nothing is running on the port/url or set reuseExistingServer:true in config.webServer.';
    const { spawn } = fakeSpawn(1, late);
    const failure = await runProfile('source', { spawn, env: polluted, serverUrl: async () => 'http://localhost:4321/index.html', checkPort: async () => false, log: quiet }).catch((e) => e);
    expect(failure.exitCode).toBe(1);
    expect(failure.portCollision).toBe(true);
    expect(failure.message).toContain('exited with code 1');
    expect(failure.message).toContain('Get-NetTCPConnection -LocalPort 4321');
    expect(mentionsPortCollision('Port 4321 is already in use')).toBe(true);
    expect(mentionsPortCollision('47 passed')).toBe(false);
  });

  test('the diagnostic itself names the URL and the port', () => {
    const text = collisionDiagnostic('web', 'http://localhost:4173/probate-guardian/');
    expect(text).toContain('Profile "web" needs http://localhost:4173/probate-guardian/');
    expect(text).toContain('port 4173');
  });

  test('playwright.config.ts never reuses a server already answering, and owns the source URL the runner checks', () => {
    expect(config.webServer.reuseExistingServer).toBe(false);
    expect(TARGETS.source.url).toBe('http://localhost:4321/index.html');
    // The config reads the shell's own PG_TARGET (the runner sets its own per
    // profile, proven above); the unit stage must pass under any shell.
    const chosen = process.env.PG_TARGET || 'source';
    expect(config.webServer?.url).toBe(TARGETS[chosen]?.url);
    expect(profileEnv(PROFILES.source, { PG_TARGET: 'web' }).PG_TARGET).toBe('source');
  });
});

describe('workers (TEST-REVIEW.md Delivery 1M)', () => {
  test('four on a fast volume, one on FAT32, and PG_WORKERS over either', () => {
    expect(workersFor('NTFS', {})).toBe(4);
    expect(workersFor('', {})).toBe(4);
    expect(workersFor('FAT32', {})).toBe(1);
    expect(workersFor('FAT32', { PG_WORKERS: '2' })).toBe(2);
    expect(workersFor('NTFS', { PG_WORKERS: '1' })).toBe(1);
    expect([1, 2, 4]).toContain(config.workers);
  });
});

// TEST-REVIEW.md Delivery 1M (2026-10-14): the Firefox, WebKit and Edge legs
// of the release run only the cases tagged for them, each saying why it runs
// there; the Chromium profiles select by file alone.
describe('the extra-browser legs run their tagged cases', () => {
  const listed = async (tag) => {
    let out = '';
    await run('npx', ['playwright', 'test', ...CROSS_BROWSER_SMOKE_SPECS, '--list', '--grep', tag],
      { ...process.env, PG_TARGET: 'source', PG_BROWSER: 'chromium' }, { onOutput: (text) => { out += text; } });
    return out.split('\n').filter((line) => line.includes('›')).map((line) => line.trim());
  };

  test('firefox and webkit launch with --grep @cross-browser, edge with --grep @edge-smoke, the Chromium profiles with no grep', () => {
    for (const name of ['firefox', 'webkit']) expect(playwrightArgs(PROFILES[name]).slice(-2), name).toEqual(['--grep', CROSS_BROWSER_TAG]);
    expect(playwrightArgs(PROFILES.edge).slice(-2)).toEqual(['--grep', EDGE_SMOKE_TAG]);
    for (const name of ['source', 'quick', 'web', 'portable', 'portable-http']) expect(playwrightArgs(PROFILES[name]), name).not.toContain('--grep');
    expect(CROSS_BROWSER_TAG.startsWith('@') && EDGE_SMOKE_TAG.startsWith('@')).toBe(true);
  });

  test('every listed file exists, carries a tagged case, and every tagged case names its browser risk', () => {
    for (const spec of CROSS_BROWSER_SMOKE_SPECS) {
      const file = path.join(root, spec);
      expect(fs.existsSync(file), spec).toBe(true);
      const lines = fs.readFileSync(file, 'utf8').split('\n');
      const tagged = lines.filter((line) => line.includes(CROSS_BROWSER_TAG) || line.includes(EDGE_SMOKE_TAG));
      expect(tagged.length, `${spec} tags a case`).toBeGreaterThan(0);
      for (const line of tagged) {
        if (/^\s*\/\//.test(line)) continue; // a comment naming the tag
        const call = lines.slice(Math.max(0, lines.indexOf(line) - 3), lines.indexOf(line) + 3).join('\n');
        expect(call, `${spec}: ${line.trim().slice(0, 70)}`).toMatch(/annotation: .*type: 'browser risk'/);
      }
    }
  });

  test('Playwright selects 17 @cross-browser cases and 6 @edge-smoke cases from those files', async () => {
    expect((await listed(CROSS_BROWSER_TAG)).length).toBe(17);
    expect((await listed(EDGE_SMOKE_TAG)).length).toBe(6);
  }, 180_000);
});

// TEST-REVIEW.md Delivery 2 (T6): the historical comparisons are a profile
// of their own, found by their own config and by nothing the everyday or
// release commands run.
describe('the historical profile runs by its own config and is outside the release', () => {
  const list = async (args) => {
    let out = '';
    await run('npx', ['playwright', 'test', ...args, '--list'], { ...process.env, PG_TARGET: 'source', PG_BROWSER: 'chromium' }, { onOutput: (text) => { out += text; } });
    return out.split('\n').filter((line) => line.includes('›')).map((line) => line.trim());
  };

  test('historical names playwright.historical.config.ts, waits for no server, and is not in the release list', async () => {
    expect(playwrightArgs(PROFILES.historical).slice(0, 3)).toEqual(['playwright', 'test', '--config=playwright.historical.config.ts']);
    expect(PROFILES.historical.server).toBe(false);
    expect(RELEASE_PROFILES).not.toContain('historical');
    const { spawn, calls } = fakeSpawn();
    await runProfile('historical', { spawn, env: polluted, log: quiet, checkPort: async () => { throw new Error('must not probe a port'); } });
    expect(calls.map((c) => c.args.slice(0, 3))).toEqual([['playwright', 'test', '--config=playwright.historical.config.ts']]);
    const failing = fakeSpawn(2);
    await expect(runProfile('historical', { spawn: failing.spawn, env: polluted, log: quiet })).rejects.toMatchObject({ exitCode: 2 });
  });

  test('the historical config finds the pre-merge comparison and the base config does not', async () => {
    const historical = await list(['--config=playwright.historical.config.ts']);
    expect(historical.length).toBeGreaterThan(0);
    expect(historical.every((line) => line.includes('pre-merge-output.characterization.spec.ts'))).toBe(true);
    const everyday = await list(['tests/e2e/startup.spec.ts', 'tests/historical']);
    expect(everyday.some((line) => line.includes('pre-merge-output'))).toBe(false);
    expect(everyday.some((line) => line.includes('startup.spec.ts'))).toBe(true);
  }, 180_000);
});

// TEST-REVIEW.md Delivery 4 (T5, 2026-10-14): the registry is the one owner
// of profile ids, target/browser/build values and release inclusion; the
// manifest the one owner of curated paths; the runner holds neither.
describe('the registry owns the profiles, the manifest the paths, the runner neither', () => {
  test('every runnable profile is the registry\'s, value for value, and the release list is its order', () => {
    expect(Object.keys(PROFILES)).toEqual(Object.keys(PROFILE_REGISTRY));
    for (const [name, entry] of Object.entries(PROFILE_REGISTRY)) {
      expect([PROFILES[name].target, PROFILES[name].browser, PROFILES[name].build], name).toEqual([entry.target, entry.browser, entry.build]);
    }
    expect(RELEASE_PROFILES).toEqual([...RELEASE_ORDER]);
    for (const never of NEVER_RELEASED) expect(RELEASE_PROFILES).not.toContain(never);
  });

  test('the runner names no spec path and no profile value of its own', () => {
    const source = fs.readFileSync(path.join(root, 'scripts/run-e2e-profile.mjs'), 'utf8').replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
    expect(source.match(/tests\/e2e\/[\w./-]+\.spec\.ts/g) ?? []).toEqual([]);
    expect(source.match(/build:(web|portable)/g) ?? []).toEqual([]);
    expect(source.match(/'(firefox|webkit|edge)'/g) ?? []).toEqual([]);
  });

  test('the registry as it is passes its own validation against the config and the manifest', async () => {
    expect(await registryProblems()).toEqual([]);
    expect(Object.keys(readManifest().profiles)).toContain('quick');
    expect(QUICK_SPECS).toEqual(readManifest().profiles.quick.specs);
  });

  test('a profile with an unknown target, browser, build or selection, and a release list naming quick, historical or an unknown profile, are refused by name', () => {
    const known = { targets: ['source', 'web', 'portable', 'portable-http'], browsers: ['chromium', 'firefox', 'webkit', 'edge'], builds: BUILDS, selections: ['web', 'portable', 'portable-http', 'cross-browser', 'quick'] };
    const bad = {
      ...PROFILE_REGISTRY,
      mars: { target: 'mars', browser: 'chromium', build: null, selection: 'all' },
      opera: { target: 'source', browser: 'opera', build: null, selection: 'all' },
      built: { target: 'web', browser: 'chromium', build: 'build:mars', selection: 'web' },
      listed: { target: 'web', browser: 'chromium', build: 'build:web', selection: 'nowhere' },
      old: { target: 'source', browser: 'chromium', build: null, selection: 'historical' },
    };
    expect(validateRegistry(bad, ['source', 'quick', 'historical', 'ghost', 'source'], known)).toEqual([
      'mars: target "mars" is not one playwright.config.ts defines (source, web, portable, portable-http)',
      'opera: browser "opera" is not one playwright.config.ts defines (chromium, firefox, webkit, edge)',
      'built: build "build:mars" is not a build script (build:web, build:portable)',
      'listed: selection "nowhere" is not a manifest profile (web, portable, portable-http, cross-browser, quick) nor "all"',
      'old: a historical profile needs its own config and server: false',
      'the release order names "quick", which the release never runs',
      'the release order names "historical", which the release never runs',
      'the release order names "ghost", which the registry does not define',
      'the release order repeats source',
    ]);
    expect(validateRegistry(PROFILE_REGISTRY, RELEASE_ORDER, known)).toEqual([]);
  });

  test('a wrong registry stops a profile before its build, its port check and Playwright', async () => {
    const { spawn, calls } = fakeSpawn();
    const problems = async () => ['mars: target "mars" is not one playwright.config.ts defines (source)'];
    await expect(runProfile('web', { spawn, env: polluted, log: quiet, serverUrl: noServer, registryProblems: problems })).rejects.toThrow(/cannot run as it is:\n {2}mars: target "mars"/);
    expect(calls).toEqual([]);
  });

  test('composeProfiles reads each selection from the manifest, and a browser\'s tag from its selection', () => {
    const manifest = { profiles: { quick: { specs: ['tests/e2e/a.spec.ts'] }, web: { target: 'web', specs: ['tests/e2e/b.spec.ts'] }, portable: { target: 'portable', specs: ['tests/e2e/c.spec.ts'] }, 'portable-http': { target: 'portable-http', extends: 'portable', specs: ['tests/e2e/d.spec.ts'] }, 'cross-browser': { specs: ['tests/e2e/e.spec.ts'], tags: { firefox: '@x', webkit: '@x', edge: '@y' } } } };
    const composed = composeProfiles(PROFILE_REGISTRY, manifest);
    expect(composed.source.specs).toBeNull();
    expect(composed.historical.specs).toBeNull();
    expect(composed.quick.specs).toEqual(['tests/e2e/a.spec.ts']);
    expect(composed['portable-http'].specs).toEqual(['tests/e2e/c.spec.ts', 'tests/e2e/d.spec.ts']);
    expect([composed.firefox.grep, composed.edge.grep, composed.web.grep]).toEqual(['@x', '@y', undefined]);
    expect(MANIFEST_PATH).toBe('tests/profile-manifest.json');
  });
});
