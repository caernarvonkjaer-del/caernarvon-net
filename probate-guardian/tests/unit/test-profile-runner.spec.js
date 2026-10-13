import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { describe, expect, test } from 'vitest';
import config, { TARGETS } from '../../playwright.config.ts';
import {
  PROFILES, QUICK_SPECS, RELEASE_PROFILES, collisionDiagnostic, mentionsPortCollision,
  playwrightArgs, profileEnv, root, run, runProfile, runRelease,
} from '../../scripts/run-e2e-profile.mjs';

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
    await expect(run('node', ['-e', 'process.exit(3)'], process.env)).rejects.toMatchObject({ exitCode: 3 });
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
      // Built profiles still build their own artifact, as before this delivery.
      const builds = calls.filter((c) => c.command === 'npm').map((c) => c.args.join(' '));
      expect(builds).toEqual(['run build:web', 'run build:portable', 'run build:portable']);
    } finally {
      delete PROFILES.__diagnostic;
    }
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
    expect(config.webServer.url).toBe(TARGETS.source.url);
    expect(profileEnv(PROFILES.source, { PG_TARGET: 'web' }).PG_TARGET).toBe('source');
  });
});
