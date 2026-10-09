import { test, expect, type Page } from '@playwright/test';
import {
  freshStartNoPassword, createWard, createSimplifiedWard, dismissScheduleDocPrompt,
  fillMinimalValidGuardianWard, fillMinimalValidAnnualWard, fillMinimalValidSimplifiedWard, confirmRemoveIfAsked,
} from './support/target';

// Milestone 73F part 3, through the real pages:
//  - an impossible date names its page and field, and can't be overridden
//    (decision 73F-3) -- Preview says so instead of offering a button that did
//    nothing;
//  - "+ Add" after "I verify there are no items to report" withdraws the tick,
//    on every form that has one -- the Inventory's stayed, so the filing said
//    both "here is an entry" and "nothing to report";
//  - a date still being typed moves with its row on Remove and goes with it,
//    named by the line it is on now.

const go = (page: Page, route: string) => page.evaluate((r) => (window as any).GuardianForms.testing.navigate(r), route);
const patch = (page: Page, shape: Record<string, unknown>) => page.evaluate((s) => (window as any).GuardianForms.testing.patchFiling(s), shape);
const field = (page: Page, path: string) => page.evaluate((p) => (window as any).GuardianForms.testing.field(p), path);
const guidance = (page: Page) => page.locator('#main-content #page-local-guidance');

function watchErrors(page: Page) {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  return errors;
}

test('an impossible date: the page names it by section and field, and Preview says it can\'t be overridden', async ({ page }) => {
  test.setTimeout(180_000);
  const errors = watchErrors(page);
  await freshStartNoPassword(page);
  await createWard(page, 'Rules Bad Date', 'guardian');
  await fillMinimalValidGuardianWard(page);
  await go(page, '/');
  const gid = page.locator('input[data-field-path="gid"]').first();
  await gid.fill('02/30/2025');
  await gid.blur();
  // The Inventory's date boxes carried no label, so it read "gid" here, and
  // Preview listed "gid" under "Date entry".
  await expect(guidance(page).locator('[data-form-action="jump-to-field"][data-field-path="gid"]')).toContainText('Guardianship Inception Date (GID)');
  await go(page, '/print');
  const blocked = page.locator('#print-doc-container .pdf-preview-blocked');
  await expect(blocked.locator('.pdf-preview-blocked-section')).toHaveText(['Cover']);
  await expect(blocked.locator('[data-jump-path="gid"]')).toHaveText('Guardianship Inception Date (GID)');
  await expect(blocked.locator('[data-preview-action="override"]')).toHaveCount(0);
  await expect(blocked.locator('[data-preview-final]')).toHaveText('At least one of these can\'t be overridden: correct it to continue.');
  expect(errors).toEqual([]);
});

const ADD_AFTER_NONE: Array<{ form: string; make: (p: Page) => Promise<void>; route: string; list: string; tick: string; add: string; setup?: Record<string, unknown> }> = [
  {
    form: 'the Inventory', route: '/a1', list: 'scheduleA1', tick: 'scheduleNoItems.a1',
    add: '[data-inventory-action="add-entry"][data-schedule="a1"]',
    make: async (p) => { await createWard(p, 'Rules Add Inv', 'guardian'); await fillMinimalValidGuardianWard(p); },
  },
  {
    form: 'the Annual', route: '/schb1', list: 'schB1', tick: 'scheduleNoItems.schb1',
    add: '[data-annual-action="add-row"][data-collection="schB1"]', setup: { schB1: [], 'scheduleNoItems.schb1': true },
    make: async (p) => { await createWard(p, 'Rules Add Ann', 'annual'); await fillMinimalValidAnnualWard(p); },
  },
  {
    form: 'the Simplified', route: '/p7', list: 'remuneration', tick: 'scheduleNoItems.remuneration',
    add: '[data-simplified-action="add-remuneration"]',
    make: async (p) => { await createSimplifiedWard(p, 'Rules Add Simp'); await fillMinimalValidSimplifiedWard(p); },
  },
];

for (const c of ADD_AFTER_NONE) {
  test(`${c.form}: "+ Add" after "I verify there are no items to report" withdraws the tick`, async ({ page }) => {
    test.setTimeout(180_000);
    const errors = watchErrors(page);
    await freshStartNoPassword(page);
    await c.make(page);
    if (c.setup) await patch(page, c.setup);
    await go(page, c.route);
    expect(await field(page, c.tick), 'ticked to begin with').toBe(true);
    expect(await field(page, c.list)).toHaveLength(0);
    await page.locator(`#main-content ${c.add}`).first().click();
    await expect.poll(() => field(page, c.tick), { message: 'the tick is withdrawn' }).toBe(false);
    expect(await field(page, c.list)).toHaveLength(1);
    expect(errors).toEqual([]);
  });
}

test('a date still being typed moves with its row on Remove, is named by its new line, and goes with its row', async ({ page }) => {
  test.setTimeout(180_000);
  const errors = watchErrors(page);
  await freshStartNoPassword(page);
  await createWard(page, 'Rules Drafts', 'annual');
  await fillMinimalValidAnnualWard(page);
  await patch(page, {
    'scheduleNoItems.schb1': false,
    schB1: [{ payee: 'First Payee', amount: 10 }, { payee: 'Second Payee', amount: 20 }],
  });
  await go(page, '/schb1');
  await dismissScheduleDocPrompt(page); // Milestone 57C-R advisory modal
  // The page lists the impossible date by its line ("Line 2 — Date Paid"),
  // apart from "Line 2 — Date Paid is required".
  const draftItem = (line: number) => guidance(page).locator('[data-form-action="jump-to-field"]', { hasText: new RegExp(`Line ${line} — Date Paid\\s*$`) });
  const second = page.locator('input[data-field-path="schB1.1.datePaid"]');
  await second.fill('02/30/2026');
  await second.blur();
  await expect(draftItem(2)).toHaveCount(1);

  // Remove the first row: the second, with its date, becomes Line 1.
  await page.locator('#main-content [data-annual-action="remove-row"][data-collection="schB1"][data-index="0"]').click();
  await confirmRemoveIfAsked(page); // 73P: Remove asks first
  await expect.poll(() => field(page, 'schB1.0.payee')).toBe('Second Payee');
  await expect(page.locator('input[data-field-path="schB1.0.datePaid"]')).toHaveValue('02/30/2026');
  await expect(draftItem(1)).toHaveCount(1);
  await expect(draftItem(2)).toHaveCount(0);

  // Remove it too: nothing is left that nobody can see or clear.
  await page.locator('#main-content [data-annual-action="remove-row"][data-collection="schB1"][data-index="0"]').click();
  await confirmRemoveIfAsked(page); // 73P: Remove asks first
  await expect.poll(() => field(page, 'schB1')).toHaveLength(0);
  await expect(draftItem(1)).toHaveCount(0);
  expect(await page.evaluate(() => Object.keys((window as any).GuardianForms.testing.snapshot().filing.__fieldDrafts || {}))).toEqual([]);
  expect(errors).toEqual([]);
});
