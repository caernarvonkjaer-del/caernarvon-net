#!/usr/bin/env node
import { spawn } from 'node:child_process';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

// The port playwright.config.ts's `web` target binds. This script pins
// PG_TARGET=web below, so this is the server the capture run depends on.
const WEB_PORT = 4173;

// Milestone 59B. A capture run is ~40s including the build. This bound exists
// only so a run that stops making progress ENDS, with evidence, instead of
// sitting at a passed-looking test list forever -- the symptom reported during
// 59B review, which could not be reproduced afterwards (see the note on
// STEP_TIMEOUT_MS's use below). It is deliberately far above any healthy run:
// if this fires, something is genuinely wrong, not merely slow.
const STEP_TIMEOUT_MS = 10 * 60 * 1000;

/** Resolves true if something is already listening on `port`, on either stack. */
function portInUse(port) {
  // Both loopback addresses, because `vite preview` binds ::1 ONLY on this
  // platform -- a 127.0.0.1-only probe gets ECONNREFUSED against a server that
  // is plainly running, and reports the port free. Verified directly: with a
  // preview server up, 127.0.0.1 refused while ::1 and localhost connected.
  const hosts = ['::1', '127.0.0.1'];

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

  return Promise.all(hosts.map(tryHost)).then((results) => results.some(Boolean));
}

/**
 * Kills a child and everything it spawned. `shell: true` means proc.pid is
 * cmd.exe, whose children (npx -> playwright -> vite preview) survive a plain
 * proc.kill() -- which is how a `vite preview` came to outlive its run by two
 * days on this workstation, silently serving later runs that reused it.
 */
function killTree(pid) {
  try {
    if (process.platform === 'win32') {
      spawn('taskkill', ['/pid', String(pid), '/T', '/F'], { stdio: 'ignore', shell: false });
    } else {
      process.kill(-pid, 'SIGKILL');
    }
  } catch {
    // Already gone, or never started -- nothing to clean up.
  }
}

function run(command, args, env, label) {
  return new Promise((resolve, reject) => {
    const proc = spawn(command, args, { cwd: root, stdio: 'inherit', shell: true, env });

    const watchdog = setTimeout(() => {
      // Do not just hang. Say what was still held, then end the run: an
      // unexplained stall that reports nothing costs more than a failed run.
      console.error(`\n[capture] ${label} produced no exit after ${STEP_TIMEOUT_MS / 1000}s.`);
      console.error(`[capture] Node still holds: ${JSON.stringify(process.getActiveResourcesInfo())}`);
      portInUse(WEB_PORT).then((busy) => {
        console.error(`[capture] Port ${WEB_PORT} in use: ${busy}`);
        console.error('[capture] Killing the process tree. Re-run; if this repeats, capture the');
        console.error('[capture] output above -- it is the evidence the 59B review lacked.');
        killTree(proc.pid);
        const error = new Error(`${label} timed out after ${STEP_TIMEOUT_MS / 1000}s`);
        error.code = 1;
        reject(error);
      });
    }, STEP_TIMEOUT_MS);

    proc.on('exit', (code) => {
      clearTimeout(watchdog);
      if (code === 0) {
        resolve();
      } else {
        const error = new Error(`${command} ${args.join(' ')} exited with code ${code}`);
        error.code = code;
        reject(error);
      }
    });
    proc.on('error', (err) => {
      clearTimeout(watchdog);
      reject(err);
    });
  });
}

async function main() {
  // Playwright reuses a server it finds already running and does NOT tear that
  // one down afterwards. Reuse is fine -- `vite preview` serves dist/web off
  // disk per request, so the freshly built files are what gets captured -- but
  // a server nobody owns should be visible rather than assumed.
  if (await portInUse(WEB_PORT)) {
    console.warn(`[capture] NOTE: a server is already listening on ${WEB_PORT}.`);
    console.warn('[capture] Playwright will reuse it and will NOT shut it down when the run ends.');
  }

  console.log('Building web target (npm run build:web)...');
  await run('npm', ['run', 'build:web'], process.env, 'npm run build:web');

  console.log('Running guide capture harness (playwright.capture.config.ts)...');
  const env = {
    ...process.env,
    PG_TARGET: 'web',
    PG_BROWSER: 'chromium',
  };
  const args = ['playwright', 'test', '--config=playwright.capture.config.ts'];
  await run('npx', args, env, 'playwright capture run');

  // A cheap backstop, not a fix: this script terminates on its own without it
  // (verified by running it with this line removed). It cannot address a stall
  // inside Playwright, because the await above only returns once the child has
  // already exited. The watchdog in run() is what covers that case.
  process.exit(0);
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(typeof err.code === 'number' ? err.code : 1);
});
