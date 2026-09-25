import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, test } from 'vitest';
import { resolveRequest, startServer, DEFAULT_BASE } from '../../scripts/serve-portable-http.mjs';

// Milestone 70, 70A (T1): the portable-http profile's host serves
// dist/portable from a subfolder, the way production's DNN site does. These
// rules are what keep it from serving anything outside the package.

const dir = path.resolve('/srv/portable');

describe('the portable-http host', () => {
  test('the site root and the bare subfolder redirect into the subfolder', () => {
    expect(resolveRequest('/', { dir })).toEqual({ redirect: DEFAULT_BASE });
    expect(resolveRequest(DEFAULT_BASE.replace(/\/$/, ''), { dir })).toEqual({ redirect: DEFAULT_BASE });
  });

  test('paths inside the subfolder map into the package; the subfolder itself serves index.html', () => {
    expect(resolveRequest(`${DEFAULT_BASE}`, { dir })).toEqual({ file: path.join(dir, 'index.html') });
    expect(resolveRequest(`${DEFAULT_BASE}fragments/common-modals.html`, { dir })).toEqual({ file: path.join(dir, 'fragments', 'common-modals.html') });
    expect(resolveRequest(`${DEFAULT_BASE}help/`, { dir })).toEqual({ file: path.join(dir, 'help', 'index.html') });
  });

  test('anything outside the subfolder, or climbing out of the package, is not served', () => {
    expect(resolveRequest('/index.html', { dir })).toBeNull();
    expect(resolveRequest(`${DEFAULT_BASE}../../etc/passwd`, { dir })).toBeNull();
    expect(resolveRequest(`${DEFAULT_BASE}%2e%2e/%2e%2e/secret.txt`, { dir })).toBeNull();
  });

  // The mixed-version spec serves two versions of the app from one origin.
  test('two mounts on one origin each serve their own folder, and nothing outside them', async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'pg-mounts-'));
    for (const name of ['old', 'new']) {
      fs.mkdirSync(path.join(root, name));
      fs.writeFileSync(path.join(root, name, 'index.html'), `<p>${name}</p>`);
    }
    const server = await startServer({ port: 4338, mounts: [
      { base: '/old/', dir: path.join(root, 'old') },
      { base: '/new/', dir: path.join(root, 'new') },
    ] });
    try {
      const get = async (p) => { const r = await fetch(`http://localhost:4338${p}`, { redirect: 'manual' }); return [r.status, r.status === 200 ? await r.text() : r.headers.get('location')]; };
      expect(await get('/old/index.html')).toEqual([200, '<p>old</p>']);
      expect(await get('/new/index.html')).toEqual([200, '<p>new</p>']);
      expect(await get('/new')).toEqual([302, '/new/']);
      expect(await get('/')).toEqual([302, '/old/']);
      expect((await get('/other/index.html'))[0]).toBe(404);
      expect((await get('/new/../old/index.html'))[1]).not.toBe('<p>new</p>');
    } finally {
      await new Promise((resolve) => server.close(resolve));
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});
