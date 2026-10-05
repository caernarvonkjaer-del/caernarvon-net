import { test, expect, type Page } from '@playwright/test';
import { freshStartNoPassword, createWard } from './support/target';

// Milestone 73C: "+ Add Co-Guardian" on the four Plans did nothing. The click
// added a blank co-guardian row and redrew the Signatures page, and drawing the
// page dropped every co-guardian row holding nothing -- the one just added
// included. The Inventory's D-1 had the same tidy-up with a one-draw grace
// period, so a new card lost itself at the next redraw (a signature choice
// redraws the page).
//
// Now a new row stays through redraws, and the clean-up that runs when the
// filer leaves the page removes it if it is still untouched (the first
// guardian's row always stays). Every case clicks the real button.

const field = (page: Page, path: string) => page.evaluate((p) => (window as any).GuardianForms.testing.field(p), path);
const go = (page: Page, route: string) => page.evaluate((r) => (window as any).GuardianForms.testing.navigate(r), route);

function watchErrors(page: Page) {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  return errors;
}

// One "Link Person" button per guardian block on every Plan's Signatures page.
const blocks = (page: Page) => page.locator('#main-content [data-form-action="link-party"][data-role="guardian"]');
const addButton = (page: Page) => page.getByRole('button', { name: '+ Add Co-Guardian' });

const PLANS = [
  { type: 'planInitial', route: '/p9', max: 4 },
  { type: 'planAnnual', route: '/p11', max: 3 },
  { type: 'planSimplified', route: '/p3', max: 2 },
  { type: 'planMinor', route: '/p6', max: 2 },
] as const;

for (const plan of PLANS) {
  test(`${plan.type}: "+ Add Co-Guardian" adds a block, up to ${plan.max} guardians; an untouched one goes when the filer leaves`, async ({ page }) => {
    test.setTimeout(120_000);
    const errors = watchErrors(page);
    await freshStartNoPassword(page);
    await createWard(page, `Add Co ${plan.type}`, plan.type);
    await go(page, plan.route);
    await expect(blocks(page)).toHaveCount(1);

    await addButton(page).click();
    await expect(blocks(page), 'the new co-guardian block appears').toHaveCount(2);
    expect((await field(page, 'planGuardians')).length).toBe(2);

    // Filled in, it stays after the filer leaves and comes back.
    await page.locator('[data-form-path="planGuardians.1.name"]').fill('Carol Co-Guardian');
    await page.locator('[data-form-path="planGuardians.1.name"]').press('Tab');
    await go(page, '/');
    await go(page, plan.route);
    await expect(blocks(page)).toHaveCount(2);
    expect((await field(page, 'planGuardians')).map((g: any) => g.name)).toEqual(['', 'Carol Co-Guardian']);

    // The button adds up to this Plan's limit, then goes away.
    for (let count = 3; count <= plan.max; count++) {
      await addButton(page).click();
      await expect(blocks(page)).toHaveCount(count);
    }
    await expect(addButton(page), `${plan.max} guardians is this Plan's limit`).toHaveCount(0);

    // Untouched blocks are removed when the filer leaves; the first guardian's
    // block stays though it is empty, and the co-guardian is not moved into it.
    await go(page, '/');
    await go(page, plan.route);
    await expect(blocks(page)).toHaveCount(2);
    expect((await field(page, 'planGuardians')).map((g: any) => g.name)).toEqual(['', 'Carol Co-Guardian']);
    expect(errors).toEqual([]);
  });
}

test('the Inventory D-1: a new co-guardian card keeps a signature choice through the redraw it causes', async ({ page }) => {
  test.setTimeout(120_000);
  const errors = watchErrors(page);
  await freshStartNoPassword(page);
  await createWard(page, 'Add Co Inventory', 'guardian');
  await go(page, '/d1');
  const cards = page.locator('#main-content [data-inventory-action="link-party"][data-role="guardian"]');
  await expect(cards).toHaveCount(1);

  await addButton(page).click();
  await expect(cards).toHaveCount(2);
  await page.locator('label[for="sigstate_guardians_1_typed"]').click();
  await expect(page.locator('#sigstate_guardians_1_typed'), 'the choice redrew the page and is still shown').toBeChecked();
  await expect(cards, 'the card survives the redraw').toHaveCount(2);
  expect((await field(page, 'guardians'))[1].signatureState).toBe('typed');

  // A signature choice alone is not an entered co-guardian on D-1 (its PDF and
  // checks ignore such a card), so leaving the page removes it, as before.
  await go(page, '/');
  await go(page, '/d1');
  await expect(cards).toHaveCount(1);
  expect(errors).toEqual([]);
});
