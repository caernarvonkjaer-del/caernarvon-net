import { test, expect, type Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  freshStartNoPassword, createWard, createSimplifiedWard,
  fillMinimalValidGuardianWard, fillMinimalValidSimplifiedWard, fillMinimalValidAnnualWard,
  fillMinimalValidPlanSimplifiedWard, fillMinimalValidPlanAnnualWard, fillMinimalValidPlanInitialWard, fillMinimalValidPlanMinorWard,
} from './support/target';

// Milestone 70, 70A: "Add characterization for prior-year/year-rollover
// behavior, which currently lacks a single dedicated contract." Starting a
// new year archives the current one under the filing and clears what
// describes one specific period (signatures, dates, the period, Annual's
// transaction schedules, every Plan answer) while carrying identity,
// addresses and asset schedules forward, with the ending total becoming the
// next starting balance on the accountings. resetYearlyFieldsForNewYear()
// alone is 154 lines of legacy-app.js, and 70G moves it.
//
// This is a characterization, not a specification: it records what the app
// does today, for every filing identity, in tests/baseline/
// ms70-year-rollover-golden.json -- every field the new year changed (from
// and to), which keys the archive leaves out, where the archived year differs
// from the data just before it, and whether switching back restores exactly
// what was archived -- and fails on any difference. Driven through the real
// controls: the dashboard card's "New year" and "Prior years" buttons and the
// dialogs they open.
//
// The archive is not byte-for-byte the year before, and that is recorded, not
// asserted away. "Start new year" re-opens the filing first, and opening a
// Guardian Inventory or an accounting runs sanitizeNegativeAmounts() (money
// text becomes a number: "12.50" -> 12.5, the same value the form stores when
// a filer types it) and normalizeWardData()'s migration of pre-tri-state
// booleans (false -> 'No'; only the Guardian fixture still writes those). The
// Plans archive their data unchanged. Traced 2026-09-24 with a setter trap.
// Regenerate the golden only for a deliberate, recorded change:
// PG_UPDATE_GOLDEN=1 npx playwright test tests/e2e/year-rollover.characterization.spec.ts

const GOLDEN = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'baseline', 'ms70-year-rollover-golden.json');
const UPDATE = process.env.PG_UPDATE_GOLDEN === '1';

type Fill = (page: Page) => Promise<void>;
const TYPES: [string, Fill, Record<string, unknown>][] = [
  ['guardian', fillMinimalValidGuardianWard, { scheduleA1: [{ propertyDescription: 'Family Home', streetAddress: '1 Main St', cityStateZip: 'Clearwater, FL 33755', notes: '', residence: 'Yes', income: 'No', fullAssetValue: 250000, wardPercent: 100 }] }],
  ['simplified', fillMinimalValidSimplifiedWard, { interestIncome: '12.50', serviceCharges: '3.00' }],
  ['annual', fillMinimalValidAnnualWard, { schA: [{ payer: 'SSA', description: 'Benefits', bank: 'First Bank', accountNo: '1', amount: 1200 }], schD1: [{ description: 'Checking', accountNo: '1', restricted: 'No', type: 'Checking', fullAmount: 5000, wardPct: '100', restrictedAmt: '' }] }],
  ['finalAccounting', fillMinimalValidAnnualWard, { schA: [{ payer: 'SSA', description: 'Benefits', bank: 'First Bank', accountNo: '1', amount: 1200 }] }],
  ['trustAccounting', fillMinimalValidAnnualWard, { schA: [{ payer: 'SSA', description: 'Benefits', bank: 'First Bank', accountNo: '1', amount: 1200 }] }],
  ['planSimplified', fillMinimalValidPlanSimplifiedWard, {}],
  ['planAnnual', fillMinimalValidPlanAnnualWard, {}],
  ['planInitial', fillMinimalValidPlanInitialWard, {}],
  ['planMinor', fillMinimalValidPlanMinorWard, {}],
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
  if (/^(lastModified|createdDate|archivedAt|updatedAt|createdAt)$/.test(key)) return '<time>';
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

function changes(before: Record<string, unknown>, after: Record<string, unknown>) {
  const a = flatten(before);
  const b = flatten(after);
  const out: Record<string, { from: string | null; to: string | null }> = {};
  for (const p of new Set([...Object.keys(a), ...Object.keys(b)])) {
    if (a[p] !== b[p]) out[p] = { from: a[p] ?? null, to: b[p] ?? null };
  }
  return Object.fromEntries(Object.entries(out).sort(([x], [y]) => x.localeCompare(y)));
}

const activeWard = (page: Page) => page.evaluate(() => {
  const w = window as any;
  return JSON.parse(JSON.stringify(w.GuardianForms.testing.snapshot().caseFile.wards.find((x: any) => x.wardId === w.GuardianForms.testing.snapshot().caseFile.activeWardId)));
});

async function clearOverlays(page: Page) {
  const reminder = page.locator('[data-shell-action="hide-auto-export-reminder"]');
  if (await reminder.isVisible().catch(() => false)) await reminder.click();
}

for (const [type, fill, extra] of TYPES) {
  test(`${type}: starting a new year resets, carries and archives exactly what it did before Milestone 70`, async ({ page }) => {
    test.setTimeout(120_000);
    await freshStartNoPassword(page);
    // A Simplified Accounting is created through its eligibility dialog.
    if (type === 'simplified') await createSimplifiedWard(page, `Rollover ${type}`);
    else await createWard(page, `Rollover ${type}`, type);
    await fill(page);
    await page.evaluate((patch) => { const w = window as any; w.GuardianForms.testing.patchFiling(patch); return w.GuardianForms.testing.save.flush(); }, extra);
    const before = await activeWard(page);
    const wardId = before.wardId;

    await page.evaluate(() => (window as any).GuardianForms.testing.navigate('/dashboard'));
    await clearOverlays(page);
    await page.locator(`[data-dashboard-action="new-year"][data-ward-id="${wardId}"]`).click();
    await page.locator('[data-modal-action="start-new-year"]').click();
    await page.waitForFunction((id) => (window as any).GuardianForms.testing.snapshot().caseFile.wards.find((x: any) => x.wardId === id)?.activeYearKey === 'Year 2', wardId);
    await page.evaluate(() => (window as any).GuardianForms.testing.save.flush());
    const after = await activeWard(page);

    const archived = after.years.find((y: any) => y.key === 'Year 1');
    const archivedKeys = Object.keys(archived.data).sort();
    const pick = (o: Record<string, unknown>) => normalize(Object.fromEntries(archivedKeys.map((k) => [k, o[k]]))) as Record<string, unknown>;
    const record: Record<string, unknown> = {
      activeYearKey: after.activeYearKey,
      yearCounter: after.yearCounter,
      years: after.years.map((y: any) => ({ key: y.key, label: y.label })),
      keysLeftOutOfTheArchive: Object.keys(before).filter((k) => !archivedKeys.includes(k)).sort(),
      // Where the archived year differs from the data just before the new
      // year was started: the rollover re-activates the filing first, and
      // what that adds or changes lands in the archive.
      archiveDiffersFromTheYearBeforeAt: changes(pick(before), normalize(archived.data) as Record<string, unknown>),
      changedByTheNewYear: changes(normalize(before) as Record<string, unknown>, normalize(after) as Record<string, unknown>),
    };

    // Back to Year 1 through the Prior years dialog: the year comes back as it was.
    await page.evaluate(() => (window as any).GuardianForms.testing.navigate('/dashboard'));
    await clearOverlays(page);
    await page.locator(`[data-dashboard-action="prior-years"][data-ward-id="${wardId}"]`).click();
    await page.locator(`[data-form-action="edit-prior-year"][data-year-key="Year 1"]`).click();
    await page.waitForFunction((id) => (window as any).GuardianForms.testing.snapshot().caseFile.wards.find((x: any) => x.wardId === id)?.activeYearKey === 'Year 1', wardId);
    const restored = await activeWard(page);
    record.priorYearRestoresTheArchive = JSON.stringify(pick(restored)) === JSON.stringify(normalize(archived.data));

    const golden = fs.existsSync(GOLDEN) ? JSON.parse(fs.readFileSync(GOLDEN, 'utf8')) : { note: '', types: {} };
    if (UPDATE) {
      golden.note = 'Milestone 70, 70A: what starting a new year does to each filing identity, recorded from the app before migration by tests/e2e/year-rollover.characterization.spec.ts. Regenerate only for a deliberate, recorded change.';
      golden.types[type] = record;
      fs.writeFileSync(GOLDEN, JSON.stringify(golden, null, 1) + '\n');
    }
    expect(record.priorYearRestoresTheArchive, 'switching back restores exactly what was archived').toBe(true);
    expect(record, `the golden record for ${type}; regenerate only for a deliberate change`).toEqual(golden.types[type]);
  });
}
