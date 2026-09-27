import { test, expect, type Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  freshStartNoPassword, createWard, createSimplifiedWard, acceptDynDialog,
  fillMinimalValidGuardianWard, fillMinimalValidSimplifiedWard, fillMinimalValidAnnualWard,
  fillMinimalValidPlanSimplifiedWard, fillMinimalValidPlanAnnualWard, fillMinimalValidPlanInitialWard, fillMinimalValidPlanMinorWard,
} from './support/target';

// Milestone 70, 70G gate: "Every supported conversion produces exactly the
// same data it did before." Converting a filing into another form type
// (convertExistingWard() and the schedule, header and Simplified mappings
// behind it) moved out of legacy-app.js in 70G. This characterization records,
// from the app before that move, what every conversion the app offers
// produces: for each filing type, a minimal valid filing is converted into
// each type convertTargetsFor() lists, and the new filing's data is recorded
// field by field, with ids and times normalized, along with what the
// conversions did to the source filing itself. Driven through the test adapter's
// convertFiling.convert(), the same function the Convert dialog calls.
//
// Regenerate only for a deliberate, recorded change:
// PG_UPDATE_GOLDEN=1 npx playwright test tests/e2e/filing-conversion.characterization.spec.ts

const GOLDEN = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'baseline', 'ms70-conversion-golden.json');
const UPDATE = process.env.PG_UPDATE_GOLDEN === '1';

type Fill = (page: Page) => Promise<void>;
const SOURCES: [string, Fill][] = [
  ['guardian', fillMinimalValidGuardianWard],
  ['simplified', fillMinimalValidSimplifiedWard],
  ['annual', fillMinimalValidAnnualWard],
  ['finalAccounting', fillMinimalValidAnnualWard],
  ['trustAccounting', fillMinimalValidAnnualWard],
  ['planSimplified', fillMinimalValidPlanSimplifiedWard],
  ['planAnnual', fillMinimalValidPlanAnnualWard],
  ['planInitial', fillMinimalValidPlanInitialWard],
  ['planMinor', fillMinimalValidPlanMinorWard],
];

/** Replace values that differ from run to run: ids, and date-times. */
function normalize(value: unknown, key = ''): unknown {
  if (Array.isArray(value)) return value.map((v) => normalize(v));
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => [k, normalize(v, k)]));
  }
  if (typeof value === 'string') {
    if (/(^id$|Id$|Ids$)/.test(key) && value) return '<id>';
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(value)) return '<time>';
  }
  if (/(^id$|Id$)/.test(key) && typeof value === 'number') return '<id>';
  if (/^(lastModified|createdDate|archivedAt|updatedAt|createdAt|timestamp)$/.test(key)) return '<time>';
  return value;
}

/** Flatten to path -> JSON value, so a change is reported by field. */
function flatten(value: unknown, prefix = '', out: Record<string, string> = {}): Record<string, string> {
  if (value && typeof value === 'object' && Object.keys(value as object).length) {
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) flatten(v, prefix ? `${prefix}.${k}` : k, out);
  } else {
    out[prefix] = JSON.stringify(value);
  }
  return out;
}

function changes(before: unknown, after: unknown) {
  const a = flatten(before);
  const b = flatten(after);
  const out: Record<string, { from: string | null; to: string | null }> = {};
  for (const p of new Set([...Object.keys(a), ...Object.keys(b)])) {
    if (a[p] !== b[p]) out[p] = { from: a[p] ?? null, to: b[p] ?? null };
  }
  return Object.fromEntries(Object.entries(out).sort(([x], [y]) => x.localeCompare(y)));
}

const wardById = (page: Page, id: string) => page.evaluate((wardId) => {
  const w = window as any;
  return JSON.parse(JSON.stringify(w.GuardianForms.testing.snapshot().caseFile.wards.find((x: any) => x.wardId === wardId)));
}, id);
const wardIds = (page: Page) => page.evaluate(() => (window as any).GuardianForms.testing.snapshot().caseFile.wards.map((x: any) => x.wardId));

for (const [source, fill] of SOURCES) {
  test(`${source}: every conversion it offers produces the data it did before Milestone 70`, async ({ page }) => {
    test.setTimeout(300_000);
    await freshStartNoPassword(page);
    if (source === 'simplified') await createSimplifiedWard(page, `Convert ${source}`);
    else await createWard(page, `Convert ${source}`, source);
    await fill(page);
    await page.evaluate(() => (window as any).GuardianForms.testing.save.flush());
    const sourceId = await page.evaluate(() => (window as any).GuardianForms.testing.snapshot().filing.wardId);
    const sourceBefore = normalize(await wardById(page, sourceId));
    const targets: string[] = await page.evaluate((t) => (window as any).GuardianForms.testing.convertFiling.targetsFor(t), source);

    const conversions: Record<string, unknown> = {};
    for (const target of targets) {
      const before = new Set(await wardIds(page));
      // convertExistingWard() closes on an alert dialog: started without
      // awaiting here, the dialog accepted, then the promise read back.
      await page.evaluate(({ id, t }) => {
        (window as any).__conversion = (window as any).GuardianForms.testing.convertFiling.convert(id, t);
      }, { id: sourceId, t: target });
      await acceptDynDialog(page);
      await page.evaluate(() => (window as any).__conversion);
      const created = (await wardIds(page)).filter((id: string) => !before.has(id));
      expect(created, `${source} -> ${target} creates one filing`).toHaveLength(1);
      conversions[target] = normalize(await wardById(page, created[0]));
    }
    const record = {
      targets,
      // What converting it did to the source filing (the app re-opens it
      // first, which normalizes some values), field by field.
      sourceChanges: changes(sourceBefore, normalize(await wardById(page, sourceId))),
      conversions,
    };

    const golden = fs.existsSync(GOLDEN) ? JSON.parse(fs.readFileSync(GOLDEN, 'utf8')) : { note: '', types: {} };
    if (UPDATE) {
      golden.note = golden.note || "Milestone 70, 70G: what converting a filing into each type the app offers produces, recorded from the app before 70G moved conversion out of legacy-app.js by tests/e2e/filing-conversion.characterization.spec.ts. Regenerate only for a deliberate, recorded change.";
      golden.types[source] = record;
      fs.writeFileSync(GOLDEN, JSON.stringify(golden, null, 1) + '\n');
    }
    expect(record,`the golden record for ${source}; regenerate only for a deliberate change`).toEqual(golden.types[source]);
  });
}
