// Milestone 70, 70A; technical choice T1 in MILESTONE-70-PROPOSAL.md.
// Production is the portable build (dist/portable) served over HTTPS from a
// subfolder of the DNN site. The `portable` e2e profile opens that build as a
// literal file:// page instead, where four code paths take different
// branches -- the cross-tab filing lock is bypassed entirely, fragments load
// another way -- so no profile ran the shipped bundle the way production runs
// it. This server is the `portable-http` profile's host: dist/portable
// mounted at a non-root subfolder on http://localhost. localhost is a secure
// context, and the application has no code that distinguishes HTTP from
// HTTPS, so this reproduces production's branches; the parity spec
// (tests/e2e/portable-http-parity.spec.ts) asserts that on every run rather
// than trusting it.
//
// Production's response headers were captured once, with the requester's
// go-ahead, into tests/e2e/support/production-headers.json; the ones that can
// change how the page behaves are replayed on every response here, and HTML
// is sent as plain "text/html" with no charset, as production sends it. Only
// index.html was requested, so the same headers are assumed for the other
// files -- unverified, and recorded as such in that file.
//
// Usage: node scripts/serve-portable-http.mjs [--port=4341] [--base=/Portals/0/Guardian-Forms/]
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const PRODUCTION = JSON.parse(fs.readFileSync(path.join(ROOT, 'tests', 'e2e', 'support', 'production-headers.json'), 'utf8'));
export const DEFAULT_PORT = 4341;
// Production's own folder on the DNN site, capitals and all.
export const DEFAULT_BASE = PRODUCTION.basePath;

const MIME = {
  '.html': PRODUCTION.htmlContentType, '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.map': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon', '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.txt': 'text/plain; charset=utf-8',
  '.pdf': 'application/pdf', '.wasm': 'application/wasm', '.bcmap': 'application/octet-stream', '.pfb': 'application/octet-stream',
};

/**
 * Map a request path to a file under `dir`, or a redirect, or null (404).
 * Exported for the unit test: the traversal and mount rules are what keep
 * this host from serving anything outside dist/portable.
 */
export function resolveRequest(urlPath, { base = DEFAULT_BASE, dir } = {}) {
  let pathname;
  try { pathname = decodeURIComponent(new URL(urlPath, 'http://localhost').pathname); } catch { return null; }
  if (pathname === '/' || pathname === base.replace(/\/$/, '')) return { redirect: base };
  if (!pathname.startsWith(base)) return null;
  const rel = pathname.slice(base.length) || 'index.html';
  const file = path.resolve(dir, rel);
  if (file !== dir && !file.startsWith(dir + path.sep)) return null;
  return { file: rel.endsWith('/') ? path.join(file, 'index.html') : file };
}

export function startServer({ port = DEFAULT_PORT, base = DEFAULT_BASE, dir = path.join(ROOT, 'dist', 'portable') } = {}) {
  const server = http.createServer((req, res) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405); res.end(); return; }
    const target = resolveRequest(req.url, { base, dir });
    if (target?.redirect) { res.writeHead(302, { Location: target.redirect }); res.end(); return; }
    if (!target || !fs.existsSync(target.file) || !fs.statSync(target.file).isFile()) { res.writeHead(404); res.end('Not found'); return; }
    res.writeHead(200, { ...PRODUCTION.replayed, 'Content-Type': MIME[path.extname(target.file).toLowerCase()] || 'application/octet-stream' });
    if (req.method === 'HEAD') { res.end(); return; }
    fs.createReadStream(target.file).pipe(res);
  });
  return new Promise((resolve) => server.listen(port, 'localhost', () => resolve(server)));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const arg = (k, d) => (process.argv.find((a) => a.startsWith(`--${k}=`)) || '').slice(k.length + 3) || d;
  const port = Number(arg('port', DEFAULT_PORT));
  const base = arg('base', DEFAULT_BASE);
  const dir = path.join(ROOT, 'dist', 'portable');
  if (!fs.existsSync(path.join(dir, 'index.html'))) {
    console.error('dist/portable/index.html is missing: run npm run build:portable first.');
    process.exit(1);
  }
  await startServer({ port, base, dir });
  console.log(`serving dist/portable at http://localhost:${port}${base}`);
}
