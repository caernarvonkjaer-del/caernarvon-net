// Milestone 74L (decision 74L-3): no app text smaller than 0.75rem (12px).
// Labels, badges and the sidebar's section names were as small as 0.62rem
// (about 10px). Reads every stylesheet, and the inline styles in the pages'
// templates, for a font size below the minimum.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const MIN = { rem: 0.75, em: 0.75, px: 12, pt: 9 };
const SIZE = /font-size\s*:\s*([0-9]*\.?[0-9]+)(rem|em|px|pt)\b/gi;

function files(dir, ext) {
  return fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true }).flatMap((entry) => {
    const rel = path.posix.join(dir, entry.name);
    if (entry.isDirectory()) return files(rel, ext);
    return entry.name.endsWith(ext) ? [rel] : [];
  });
}

function tooSmall(rel) {
  const found = [];
  fs.readFileSync(path.join(ROOT, rel), 'utf8').split('\n').forEach((line, i) => {
    for (const m of line.matchAll(SIZE)) {
      if (Number(m[1]) < MIN[m[2].toLowerCase()]) found.push(`${rel}:${i + 1} ${m[0]}`);
    }
  });
  return found;
}

describe('74L: the smallest text', () => {
  it('no stylesheet sets text below 0.75rem (12px)', () => {
    const sheets = files('src/styles', '.css');
    expect(sheets.length).toBeGreaterThan(5);
    expect(sheets.flatMap(tooSmall)).toEqual([]);
  });

  it('no inline style in the pages, fragments or index.html does either', () => {
    const sources = [...files('src', '.js'), ...files('fragments', '.html'), 'index.html'];
    expect(sources.flatMap(tooSmall)).toEqual([]);
  });

  it('the check finds a small size (so an empty result means something)', () => {
    const sample = 'a{font-size:.62rem} b{font-size: 11px} c{font-size:0.75rem}';
    expect([...sample.matchAll(SIZE)].filter((m) => Number(m[1]) < MIN[m[2].toLowerCase()]).map((m) => m[0]))
      .toEqual(['font-size:.62rem', 'font-size: 11px']);
  });
});
