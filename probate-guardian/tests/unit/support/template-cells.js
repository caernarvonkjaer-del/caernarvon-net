import JSZip from 'jszip';
import { readFileSync } from 'node:fs';

// The cells of the court's embedded workbooks (templates/<name>-template.js),
// sheet by sheet: each non-empty cell's formula or text, the merge ranges that
// cover non-master cells, and the cells carrying a dropdown (data validation).
//
// Moved here from tests/unit/excel-write-targets.spec.js (Milestone 72A) so
// more than one spec can check its own tables against the template with the
// same reader. It reads the XML with patterns, not a DOM -- unit tests run
// under Node with no XML parser -- and the cell pattern below is the one that
// survives self-closing tags (AGENTS.md section 10, P2): a naive
// <c ...>...</c> match would attach the next cell's formula to an empty one.

export const dec = (s) => s.replace(/&apos;/g, "'").replace(/&quot;/g, '"')
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');

export const colNum = (col) => [...col].reduce((n, ch) => n * 26 + (ch.charCodeAt(0) - 64), 0);

const colLabel = (c) => {
  let label = '', n = c;
  while (n > 0) { const rem = (n - 1) % 26; label = String.fromCharCode(65 + rem) + label; n = Math.floor((n - 1) / 26); }
  return label;
};

/**
 * Map of sheet name -> { cells, covered, validated }:
 *   cells      ref -> { kind: 'FORMULA' | 'VALUE', text }
 *   covered    ref -> 'A1:B2' for every merge member that is not the master
 *   validated  Set of refs carrying a single-cell dataValidation
 */
export async function templateSheets(name) {
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
    const sheetName = dec(/name="([^"]+)"/.exec(tag)?.[1] ?? '');
    const rid = /r:id="([^"]+)"/.exec(tag)?.[1];
    if (!sheetName || !rid) continue;
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
          const ref = `${colLabel(c)}${r}`;
          if (ref !== a) covered.set(ref, `${a}:${b}`);
        }
      }
    }

    const validated = new Set();
    for (const m of xml.matchAll(/<dataValidation\b[^>]*sqref="([^"]+)"/g)) {
      for (const part of m[1].split(/\s+/)) if (/^[A-Z]+\d+$/.test(part)) validated.add(part);
    }

    out.set(sheetName, { cells, covered, validated });
  }
  return out;
}
