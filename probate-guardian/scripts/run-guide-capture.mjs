#!/usr/bin/env node
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

function run(command, args, env) {
  return new Promise((resolve, reject) => {
    const proc = spawn(command, args, { cwd: root, stdio: 'inherit', shell: true, env });
    proc.on('exit', (code) => {
      if (code === 0) {
        resolve();
      } else {
        const error = new Error(`${command} ${args.join(' ')} exited with code ${code}`);
        error.code = code;
        reject(error);
      }
    });
    proc.on('error', (err) => reject(err));
  });
}

async function main() {
  console.log('Building web target (npm run build:web)...');
  await run('npm', ['run', 'build:web'], process.env);

  console.log('Running guide capture harness (playwright.capture.config.ts)...');
  const env = {
    ...process.env,
    PG_TARGET: 'web',
    PG_BROWSER: 'chromium',
  };
  const args = ['playwright', 'test', '--config=playwright.capture.config.ts'];
  await run('npx', args, env);
  process.exit(0);
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(typeof err.code === 'number' ? err.code : 1);
});
