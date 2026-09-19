import { describe, expect, test } from 'vitest';
import JSZip from 'jszip';
import { readFileSync } from 'node:fs';

// Print areas in every shipped template, checked against sheet order.
//
// A print area is stored as a defined name keyed by localSheetId -- a
// POSITIONAL index into the workbook's sheet list, not a name. Insert a sheet
// ahead of one and its print area silently belongs to a different sheet.
//
// Milestone 57D's twelve-account extension inserted 32 register sheets ahead
// of PART XI and left its print area saying localSheetId 57, which had become
// 'SCH B-4 OTHER DISB p48'. The consequence reached filers: ExcelJS reads
// print areas into worksheet.pageSetup, which the exporter never strips, so
// the register page shipped clipped to A1:G32 -- losing columns H and I and
// the end of its own register -- while PART XI shipped with none at all.
//
// This is a template guard rather than an export guard on purpose. ExcelJS
// regenerates each print area from pageSetup on write, so the exported file is
// always self-consistent even when it is consistently wrong; the drift is only
// visible in the committed template. See AGENTS.md section 14 -- parsed, not
// regexed, and checked where the answer actually lives.

const TEMPLATES = ['annual', 'guardian', 'simplified'];

async function workbookOf(name) {
  const js = readFileSync(`templates/${name}-template.js`, 'utf8');
  const b64 = /["'`]([A-Za-z0-9+/=]{500,})["'`]/.exec(js)[1];
  const zip = await JSZip.loadAsync(Buffer.from(b64, 'base64'));
  const xml = await zip.file('xl/workbook.xml').async('string');
  const dec = (s) => s.replace(/&apos;/g, "'").replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
  const sheets = (xml.match(/<sheet\b[^>]*\/?>/g) || [])
    .map((t) => dec(/name="([^"]+)"/.exec(t)?.[1] ?? ''));
  const printAreas = [];
  for (const m of xml.matchAll(/<definedName\b([^>]*)>([\s\S]*?)<\/definedName>/g)) {
    if (!/name="_xlnm\.Print_Area"/.test(m[1])) continue;
    const localSheetId = Number(/localSheetId="(\d+)"/.exec(m[1])?.[1]);
    const target = dec(m[2]);
    printAreas.push({ localSheetId, target, declared: /'?([^'!]+)'?!/.exec(target)?.[1] });
  }
  return { sheets, printAreas };
}

describe.each(TEMPLATES)('%s template print areas', (name) => {
  test('each one points at the sheet it names', async () => {
    const { sheets, printAreas } = await workbookOf(name);
    const wrong = printAreas
      .filter((p) => sheets[p.localSheetId] !== p.declared)
      .map((p) => `${p.target} has localSheetId ${p.localSheetId}, which is '${sheets[p.localSheetId]}'`);
    expect(wrong, 'a print area belongs to a different sheet than it names').toEqual([]);
  });

  test('each one names a sheet that exists', async () => {
    const { sheets, printAreas } = await workbookOf(name);
    for (const p of printAreas) {
      expect(sheets, `${p.target} names a sheet that is not in the workbook`).toContain(p.declared);
      expect(p.localSheetId, `${p.target} has an out-of-range localSheetId`).toBeLessThan(sheets.length);
    }
  });
});

// The specific regression, pinned by name so it cannot come back unnoticed the
// next time the workbook grows.
test('PART XI keeps its own print area, and no B-4 register page has one', async () => {
  const { sheets, printAreas } = await workbookOf('annual');
  const partXi = printAreas.find((p) => p.declared === 'PART XI');
  expect(partXi, 'PART XI lost its print area').toBeTruthy();
  expect(sheets[partXi.localSheetId]).toBe('PART XI');

  const onRegister = printAreas.filter((p) => /^SCH B-4 OTHER DISB p\d+$/.test(sheets[p.localSheetId] ?? ''));
  expect(onRegister, 'a register page would print clipped').toEqual([]);
});
