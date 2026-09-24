import path from 'node:path';
import { describe, expect, test } from 'vitest';
import { resolveRequest, DEFAULT_BASE } from '../../scripts/serve-portable-http.mjs';

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
});
