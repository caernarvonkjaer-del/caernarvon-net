import { describe, expect, test } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { walkSourceFiles } from './support/source-scan.js';

// Milestone 43G: moved from tests/e2e/security.spec.ts -- none of these
// three touch `page`; they're pure Node fs/regex source-text audits paying
// full Playwright browser-launch overhead for no reason. The remaining
// page-driven security tests (CSP header, fragment-name rejection, hosted
// script MIME types) stay in security.spec.ts.

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const sourceSurfaces = [
  'index.html',
  'fragments',
  'src',
  'templates',
];

// Milestone 52L: the shared walker. Its results feed emptiness assertions
// below, so the depth-first order it uses in place of readdirSync's
// { recursive: true } changes nothing here -- the set is what matters.
// A scan target may name an individual file rather than a directory, which
// walkSourceFiles handles directly.
function sourceFiles(entry) {
  return walkSourceFiles(path.join(projectRoot, entry), { extensions: ['.html', '.js'] });
}

function withoutJsComments(source) {
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

// An inline event handler is an on<event>= attribute INSIDE a tag: a tag
// name, then attributes containing no angle brackets, then the attribute.
// The previous /\son[a-z]+\s*=/i matched any identifier starting with "on"
// that was assigned to -- `const onAbort = () => ...` in pdf-annotate.js
// tripped it -- so a real violation (pdf-preview.js's onclick=) and a false
// positive were indistinguishable for weeks. Milestone 42B.
const EVENT_ATTRIBUTE_PATTERN = /<[a-z][a-z0-9-]*(?:\s[^<>]*)?\son[a-z]+\s*=/i;

describe('Milestone 11 security boundaries (source audits)', () => {
  test('event-attribute detector matches tags, not identifiers', () => {
    expect(EVENT_ATTRIBUTE_PATTERN.test('`<button type="button" onclick="window.location.reload()">Reload</button>`')).toBe(true);
    expect(EVENT_ATTRIBUTE_PATTERN.test('<div\n  class="x"\n  onmouseover=alert(1)>')).toBe(true);
    expect(EVENT_ATTRIBUTE_PATTERN.test('const onAbort = () => this.off(eventName, listener);')).toBe(false);
    expect(EVENT_ATTRIBUTE_PATTERN.test('let onePage = 1; const only = a < b;')).toBe(false);
    expect(EVENT_ATTRIBUTE_PATTERN.test('<button type="button" class="btn">on = off</button>')).toBe(false);
  });

  test('source markup has no executable event attributes or inline scripts', () => {
    const files = sourceSurfaces.flatMap(sourceFiles);
    const eventAttributes = [];
    const inlineScripts = [];
    for (const file of files) {
      const source = fs.readFileSync(file, 'utf8');
      const executableSource = file.endsWith('.js') ? withoutJsComments(source) : source;
      if (EVENT_ATTRIBUTE_PATTERN.test(executableSource)) eventAttributes.push(path.relative(projectRoot, file));
      if (file.endsWith('.html') && /<script(?![^>]*\bsrc=)[^>]*>/i.test(source)) {
        inlineScripts.push(path.relative(projectRoot, file));
      }
    }
    expect(eventAttributes).toEqual([]);
    expect(inlineScripts).toEqual([]);
  });

  test('service worker guards redirect-sensitive navigations', () => {
    const worker = fs.readFileSync(path.join(projectRoot, 'sw.js'), 'utf8');
    expect(worker).toContain("event.request.redirect==='error'");
    expect(worker).toContain('recoveryResponse');
    expect(worker).toContain('Redirected response for ${entry.url} was not cached.');
  });
});
