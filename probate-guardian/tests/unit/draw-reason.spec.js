// Milestone 73K part 1: every page drawn says why, and which field or row the
// filer was working on.
//
// renderPage() used to be told only which page to draw; with the current page
// already set before it ran, it could not tell arriving at a page from the
// same page drawn again after an Add or a Remove. Now it takes a reason
// (draw-reason.js's DRAW) and a focus target -- a field by its path, or a row
// by 73V's in-memory row identity, never an index -- records them, and hands
// them to the feature's mount. Nothing reads them yet (73K part 2 keeps the
// filer's place with them), so no filer sees a change.
//
// Red-first: draw-reason.js doesn't exist, renderPage() takes one argument,
// and the callers pass none.
import fs from 'node:fs';
import path from 'node:path';
import { beforeEach, describe, expect, test } from 'vitest';
import { DRAW, afterAdd, afterDuplicate, afterRemove, fieldTarget, isDrawReason, onChange, rowTarget } from '../../src/core/navigation/draw-reason.js';
import { getLastDraw, navigate, renderPage, setCurrentPage } from '../../src/core/navigation/router.js';
import { rowIdentity } from '../../src/core/form/collections.js';
import { walkSourceFiles } from './support/source-scan.js';

describe('the reasons and targets', () => {
  test('five reasons; nothing else is one', () => {
    expect(Object.values(DRAW).sort()).toEqual(['background', 'change', 'navigation', 'preview', 'switch']);
    for (const r of Object.values(DRAW)) expect(isDrawReason(r)).toBe(true);
    for (const r of ['', 'redraw', undefined, null, 3]) expect(isDrawReason(r)).toBe(false);
  });

  test('a row is named by its identity, which survives a Remove or a Duplicate above it; never by its index', () => {
    const d = { rows: [{ a: 1 }, { a: 2 }, { a: 3 }] };
    const third = d.rows[2];
    const added = afterAdd(d, 'rows');
    expect(added).toEqual({ list: 'rows', row: rowIdentity(third) });
    d.rows.splice(0, 1); // a Remove above it
    expect(rowIdentity(d.rows[1]), 'the same row, now at index 1').toBe(added.row);
    const copy = { a: 9 };
    expect(afterDuplicate({ rows: [d.rows[0], copy] }, 'rows', 0), 'the copy, just below the row duplicated').toEqual({ list: 'rows', row: rowIdentity(copy) });
  });

  test('after a Remove: the row that took its place, else the one above, else the list', () => {
    const a = { a: 1 }; const b = { b: 1 };
    expect(afterRemove({ rows: [a, b] }, 'rows', 0)).toEqual({ list: 'rows', row: rowIdentity(a) });
    expect(afterRemove({ rows: [a] }, 'rows', 1)).toEqual({ list: 'rows', row: rowIdentity(a) });
    expect(afterRemove({ rows: [] }, 'rows', 0)).toEqual({ list: 'rows' });
    expect(afterAdd({}, 'rows')).toEqual({ list: 'rows' });
  });

  test('a field by its path; a change carries its target', () => {
    expect(fieldTarget('schC.0.loss')).toEqual({ path: 'schC.0.loss' });
    expect(onChange(fieldTarget('q2NoMove'))).toEqual({ reason: 'change', focus: { path: 'q2NoMove' } });
    expect(onChange()).toEqual({ reason: 'change', focus: null });
    expect(rowTarget('rows', null)).toEqual({ list: 'rows' });
  });
});

describe('the router records why it drew', () => {
  beforeEach(() => setCurrentPage('/dashboard'));

  test('navigate() is arriving at a page unless the caller says otherwise', async () => {
    await navigate('/p1', { updateHash: false });
    expect(getLastDraw()).toEqual({ page: '/p1', reason: 'navigation', focus: null });
  });

  test('a change on the page shown carries its reason and target through to renderPage()', async () => {
    setCurrentPage('/p2');
    await navigate('/p2', { updateHash: false, ...onChange(fieldTarget('q1Residences.1.name')) });
    expect(getLastDraw()).toEqual({ page: '/p2', reason: 'change', focus: { path: 'q1Residences.1.name' } });
    await renderPage('/print', { reason: DRAW.PREVIEW });
    expect(getLastDraw()).toEqual({ page: '/print', reason: 'preview', focus: null });
  });

  test('a reason that is not one is refused, loudly', async () => {
    await expect(renderPage('/p1', { reason: 'redraw' })).rejects.toThrow('is not a reason a page is drawn');
  });

  test('the record is a copy', async () => {
    await renderPage('/p3', onChange(fieldTarget('x')));
    const draw = getLastDraw();
    draw.focus.path = 'changed';
    expect(getLastDraw().focus.path).toBe('x');
  });
});

describe('every caller says why', () => {
  const sources = walkSourceFiles(path.resolve('src'))
    .filter((file) => !file.endsWith(path.join('navigation', 'router.js')))
    .map((file) => ({ file: path.relative(process.cwd(), file).split(path.sep).join('/'), text: fs.readFileSync(file, 'utf8') }));

  // Each call's argument list, balanced across parentheses (a coarse scan of
  // source, AGENTS.md section 10 P2: fine for finding call sites).
  function calls(text, name) {
    const out = [];
    const re = new RegExp(`(?<![\\w.])${name}\\(`, 'g');
    let m;
    while ((m = re.exec(text))) {
      const line = text.slice(text.lastIndexOf('\n', m.index) + 1, m.index);
      if (/^\s*(\/\/|\*)/.test(line) || /function\s+$/.test(line)) continue;
      let depth = 1; let i = m.index + m[0].length;
      while (i < text.length && depth) { if (text[i] === '(') depth++; else if (text[i] === ')') depth--; i++; }
      out.push(text.slice(m.index + m[0].length, i - 1));
    }
    return out;
  }
  const topLevelArgs = (args) => {
    let depth = 0; let count = args.trim() ? 1 : 0;
    for (const ch of args) { if ('([{'.includes(ch)) depth++; else if (')]}'.includes(ch)) depth--; else if (ch === ',' && depth === 0) count++; }
    return count;
  };

  test('every renderPage() call names a reason', () => {
    const bare = sources.flatMap(({ file, text }) => calls(text, 'renderPage')
      .filter((args) => topLevelArgs(args) < 2 || !/reason|onChange\(/.test(args))
      .map((args) => `${file}: renderPage(${args})`));
    expect(bare).toEqual([]);
  });

  test('every navigate() right after a committed change says it is a change on the page, with its target', () => {
    const bare = sources.flatMap(({ file, text }) => {
      const found = [];
      const re = /commitModelChange\([^;]*\);[^;\n]*\n?[^;\n]*?(?<![\w.])navigate\(/g;
      let m;
      while ((m = re.exec(text))) {
        const rest = text.slice(m.index + m[0].length);
        const args = rest.slice(0, rest.indexOf(';'));
        if (!/onChange\(|reason/.test(args)) found.push(`${file}: navigate(${args}`);
      }
      return found;
    });
    expect(bare).toEqual([]);
  });

  test('the scans find the callers they are meant to (they cannot pass by finding nothing)', () => {
    const renderCalls = sources.reduce((n, { text }) => n + calls(text, 'renderPage').length, 0);
    expect(renderCalls).toBeGreaterThan(35);
    const changeNavigations = sources.reduce((n, { text }) => n + calls(text, 'navigate').filter((a) => /onChange\(/.test(a)).length, 0);
    expect(changeNavigations).toBeGreaterThan(15);
  });
});
