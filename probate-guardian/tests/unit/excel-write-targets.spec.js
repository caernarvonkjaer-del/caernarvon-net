import { describe, expect, test } from 'vitest';
import JSZip from 'jszip';
import { readFileSync } from 'node:fs';

// Every setCell() target in every exporter, checked against the court's
// template. This is the guard for a defect class that shipped three times.
//
// Twice the app wrote a value onto the cell holding a printed LABEL, leaving
// the form's real input box empty: Simplified's Part I identity block, and
// Guardian's PART IV/V/VI signature and bond pages. Once it wrote onto a cell
// the workbook computes, destroying propagation. And once it wrote to a cell
// inside a merge, which ExcelJS silently redirects to the merge master --
// Simplified's starting balance landed on the "Income" banner that way, while
// Line 1 stayed blank and Line 8 came out negative.
//
// All of it survived every suite because each importer read the same wrong
// cell. The round trips agreed with a broken exporter perfectly. So this looks
// at the template instead and asks, for each address the exporter writes:
//
//   LABEL    a shared string sits there -- unless the cell carries a dropdown,
//            in which case the string is a default the app is meant to replace
//   FORMULA  the workbook computes it; writing a literal freezes it
//   COVERED  inside a merge but not its master; the write lands elsewhere
//
// ALLOWED below is the deliberate exceptions list, each with the reason. A new
// entry there is a decision, not a formality: it means the app is knowingly
// overwriting something the court's form put in that cell.

const EXPORTERS = [
  ['annual', 'src/features/annual-accounting/excel.js'],
  ['guardian', 'src/features/guardian-inventory/excel.js'],
  ['simplified', 'src/features/simplified-accounting/excel.js'],
];

/**
 * Targets that legitimately overwrite something in the template.
 * Key: `${template}|${sheet}|${cell}`.
 */
const ALLOWED = new Map([
  // Dropdown defaults. The template ships a starting option and the app
  // replaces it with the filer's answer; each of these cells carries a
  // dataValidation list, which is what distinguishes a default from a label.
  ['annual|PART I|H4', 'filing type: dropdown default'],
  ['annual|PART I|J6', 'amended form: dropdown default'],
  ['guardian|SUMMARY I |I8', 'amended form: dropdown default'],
  ['guardian|SUMMARY I |D26', 'safe deposit box: dropdown default'],
  ['guardian|SUMMARY I |H26', 'safe deposit box filed: dropdown default'],
  // The one cell the court's form computes for itself that the app still
  // writes a literal over. DECIDED 2026-09-19 (Alan, by name): conform to the
  // form, allow the overwrite, warn on it -- src/core/filing/form-derived-
  // fields.js raises an advisory when the entered value differs from the one
  // the form derives, surfaced on the print page through the existing
  // renderOutputAdvisories() panel. See tests/unit/form-derived-fields.spec.js.
  //
  // 'PART IX '!E21/G21 (the bond period, = From_Date / = To_Date) were on
  // this list until Milestone 67D. DECIDED 2026-09-23: the bond period IS the
  // accounting period, so the app no longer writes those two cells and the
  // form's formulas fill them. The advisory on a differing typed value stays;
  // the allowance does not, so a reintroduced write fails this test.
  ['annual|PART II, III|F25', 'guardian 1 name: form links it to PART I; overwrite allowed, advisory on divergence'],
]);

const dec = (s) => s.replace(/&apos;/g, "'").replace(/&quot;/g, '"')
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');

const colNum = (col) => [...col].reduce((n, ch) => n * 26 + (ch.charCodeAt(0) - 64), 0);

async function templateSheets(name) {
  const js = readFileSync(`templates/${name}-template.js`, 'utf8');
  const b64 = /["'`]([A-Za-z0-9+/=]{500,})["'`]/.exec(js)[1];
  const zip = await JSZip.loadAsync(Buffer.from(b64, 'base64'));
  const wbXml = await zip.file('xl/workbook.xml').async('string');
  const relsXml = await zip.file('xl/_rels/workbook.xml.rels').async('string');
  const rels = new Map();
  for (const m of relsXml.matchAll(/Id="([^"]+)"[^>]*Target="([^"]+)"/g)) rels.set(m[1], m[2]);

  const shared = [];
  const ssFile = zip.file('xl/sharedStrings.xml');
  if (ssFile) {
    const ss = await ssFile.async('string');
    for (const m of ss.matchAll(/<si>([\s\S]*?)<\/si>/g)) {
      shared.push(dec([...m[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((t) => t[1]).join('')));
    }
  }

  const out = new Map();
  for (const tag of wbXml.match(/<sheet\b[^>]*\/?>/g) || []) {
    const name2 = dec(/name="([^"]+)"/.exec(tag)?.[1] ?? '');
    const rid = /r:id="([^"]+)"/.exec(tag)?.[1];
    if (!name2 || !rid) continue;
    const xml = await zip.file('xl/' + rels.get(rid).replace(/^\//, '')).async('string');

    const cells = new Map();
    // Self-closing cells are why this cannot be a naive <c ...>...</c> match.
    const cellRe = /<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g;
    for (let m = cellRe.exec(xml); m; m = cellRe.exec(xml)) {
      const ref = /r="([A-Z]+\d+)"/.exec(m[1])?.[1];
      if (!ref) continue;
      const body = m[2] ?? '';
      const f = /<f[^>]*>([\s\S]*?)<\/f>/.exec(body)?.[1];
      const v = /<v>([\s\S]*?)<\/v>/.exec(body)?.[1];
      if (f) cells.set(ref, { kind: 'FORMULA', text: dec(f) });
      else if (v !== undefined) {
        const text = /t="s"/.test(m[1]) ? (shared[Number(v)] ?? '') : v;
        if (String(text).trim()) cells.set(ref, { kind: 'VALUE', text: String(text) });
      }
    }

    const covered = new Map();
    for (const m of xml.matchAll(/<mergeCell ref="([A-Z]+\d+):([A-Z]+\d+)"/g)) {
      const [, a, b] = m;
      const [, ca, ra] = /([A-Z]+)(\d+)/.exec(a);
      const [, cb, rb] = /([A-Z]+)(\d+)/.exec(b);
      for (let r = Number(ra); r <= Number(rb); r++) {
        for (let c = colNum(ca); c <= colNum(cb); c++) {
          let label = '', n = c;
          while (n > 0) { const rem = (n - 1) % 26; label = String.fromCharCode(65 + rem) + label; n = Math.floor((n - 1) / 26); }
          const ref = `${label}${r}`;
          if (ref !== a) covered.set(ref, `${a}:${b}`);
        }
      }
    }

    const validated = new Set();
    for (const m of xml.matchAll(/<dataValidation\b[^>]*sqref="([^"]+)"/g)) {
      for (const part of m[1].split(/\s+/)) if (/^[A-Z]+\d+$/.test(part)) validated.add(part);
    }

    out.set(name2, { cells, covered, validated });
  }
  return out;
}

/**
 * (sheet, cell, line) for every setCell / setDateCell whose worksheet
 * variable resolves. setDateCell() (Milestone 67E) writes the same cells the
 * string writer used to, so it is policed the same way -- a date written
 * onto a caption or a formula is no less a defect for being a real date.
 */
function writeTargets(jsPath) {
  const src = readFileSync(jsPath, 'utf8');
  const varSheet = new Map();
  for (const m of src.matchAll(/(?:const|let)\s+(\w+)\s*=\s*workbook\.getWorksheet\(\s*'([^']+)'\s*\)/g)) {
    varSheet.set(m[1], m[2]);
  }
  const out = [];
  for (const m of src.matchAll(/set(?:Date)?Cell\(\s*(\w+)\s*,\s*['`]([A-Z]+)(\d+)['`]/g)) {
    const sheet = varSheet.get(m[1]);
    if (!sheet) continue;
    out.push({ sheet, cell: `${m[2]}${m[3]}`, line: src.slice(0, m.index).split('\n').length });
  }
  return out;
}

describe.each(EXPORTERS)('%s exporter write targets', (tpl, jsPath) => {
  test('never write onto a label, a formula, or a covered merge cell', async () => {
    const sheets = await templateSheets(tpl);
    const offences = [];
    for (const { sheet, cell, line } of writeTargets(jsPath)) {
      if (ALLOWED.has(`${tpl}|${sheet}|${cell}`)) continue;
      const info = sheets.get(sheet);
      if (!info) {
        offences.push(`${jsPath}:${line} writes to unknown sheet '${sheet}'`);
        continue;
      }
      if (info.covered.has(cell)) {
        const range = info.covered.get(cell);
        offences.push(`${jsPath}:${line} '${sheet}'!${cell} is inside merge ${range}; `
          + `ExcelJS writes it to ${range.split(':')[0]} instead`);
        continue;
      }
      const at = info.cells.get(cell);
      if (!at) continue;
      if (at.kind === 'FORMULA') {
        offences.push(`${jsPath}:${line} '${sheet}'!${cell} holds the workbook's formula =${at.text}`);
      } else if (!info.validated.has(cell)) {
        offences.push(`${jsPath}:${line} '${sheet}'!${cell} holds the printed label ${JSON.stringify(at.text.slice(0, 60))}`);
      }
    }
    expect(offences, `write targets that overwrite the court's own form:\n${offences.join('\n')}`).toEqual([]);
  });
});

describe('the exceptions list itself', () => {
  test('every entry names a target the exporter still writes', async () => {
    const written = new Set();
    for (const [tpl, jsPath] of EXPORTERS) {
      for (const { sheet, cell } of writeTargets(jsPath)) written.add(`${tpl}|${sheet}|${cell}`);
    }
    const stale = [...ALLOWED.keys()].filter((k) => !written.has(k));
    expect(stale, 'allowances kept for writes that no longer happen').toEqual([]);
  });

  test('every entry carries a reason', () => {
    for (const [key, reason] of ALLOWED) {
      expect(String(reason).length, `${key} needs a reason`).toBeGreaterThan(10);
    }
  });
});
