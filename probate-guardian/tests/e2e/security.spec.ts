import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { gotoApp } from './support/target';

const projectRoot = path.resolve(import.meta.dirname, '../..');
const sourceSurfaces = [
  'index.html',
  'fragments',
  'src',
  'templates',
];

function sourceFiles(entry: string): string[] {
  const absolute = path.join(projectRoot, entry);
  if (!fs.statSync(absolute).isDirectory()) return [absolute];
  return fs.readdirSync(absolute, { recursive: true, withFileTypes: true })
    .filter((item) => item.isFile() && /\.(?:html|js)$/.test(item.name))
    .map((item) => path.join(item.parentPath, item.name));
}

function withoutJsComments(source: string): string {
  let result = '';
  let quote = '';
  let lineComment = false;
  let blockComment = false;
  for (let index = 0; index < source.length; index += 1) {
    const current = source[index];
    const next = source[index + 1];
    if (lineComment) {
      if (current === '\n') { lineComment = false; result += current; }
    } else if (blockComment) {
      if (current === '*' && next === '/') { blockComment = false; index += 1; }
    } else if (quote) {
      result += current;
      if (current === '\\') result += source[++index] || '';
      else if (current === quote) quote = '';
    } else if (current === '/' && next === '/') {
      lineComment = true;
      index += 1;
    } else if (current === '/' && next === '*') {
      blockComment = true;
      index += 1;
    } else {
      result += current;
      if (current === '"' || current === "'" || current === '`') quote = current;
    }
  }
  return result;
}

test.describe('Milestone 11 security boundaries', () => {
  test('source markup has no executable event attributes or inline scripts', () => {
    const files = sourceSurfaces.flatMap(sourceFiles);
    const eventAttributes: string[] = [];
    const inlineScripts: string[] = [];
    for (const file of files) {
      const source = fs.readFileSync(file, 'utf8');
      const executableSource = file.endsWith('.js') ? withoutJsComments(source) : source;
      if (/\son[a-z]+\s*=/i.test(executableSource)) eventAttributes.push(path.relative(projectRoot, file));
      if (file.endsWith('.html') && /<script(?![^>]*\bsrc=)[^>]*>/i.test(source)) {
        inlineScripts.push(path.relative(projectRoot, file));
      }
    }
    expect(eventAttributes).toEqual([]);
    expect(inlineScripts).toEqual([]);
  });

  test('CSP disallows inline and evaluated scripts', async ({ page }) => {
    await gotoApp(page);
    const policy = await page.locator('meta[http-equiv="Content-Security-Policy"]').getAttribute('content');
    const directives = new Map((policy || '').split(';').map((directive) => {
      const [name, ...values] = directive.trim().split(/\s+/);
      return [name, values];
    }));
    expect(directives.get('script-src')).toContain("'self'");
    expect(directives.get('script-src')).not.toContain("'unsafe-inline'");
    expect(directives.get('script-src')).not.toContain("'unsafe-eval'");
    expect(directives.get('script-src-elem') || []).not.toContain("'unsafe-inline'");
  });

  test('unknown fragment names are rejected without a request', async ({ page }) => {
    const fragmentRequests: string[] = [];
    page.on('request', (request) => {
      if (request.url().includes('/fragments/')) fragmentRequests.push(request.url());
    });
    await gotoApp(page);
    await expect(page.evaluate(() => (window as any).loadFragment('../index'))).rejects.toThrow('Unknown fragment');
    expect(fragmentRequests).toEqual([]);
  });

  test('hosted script and module responses use JavaScript MIME types', async ({ page }) => {
    const wrongMime: string[] = [];
    const checks: Promise<void>[] = [];
    page.on('response', (response) => {
      if (response.request().resourceType() !== 'script') return;
      checks.push(response.allHeaders().then((headers) => {
        const contentType = headers['content-type'] || '';
        if (!/(?:text|application)\/javascript/i.test(contentType)) wrongMime.push(`${response.url()} -> ${contentType}`);
      }));
    });
    await gotoApp(page);
    await page.waitForLoadState('networkidle');
    await Promise.all(checks);
    expect(wrongMime).toEqual([]);
  });
});