import { test, expect, type Page } from '@playwright/test';
import {
  freshStartNoPassword, createWard, createSimplifiedWard,
  fillMinimalValidGuardianWard, fillMinimalValidAnnualWard, fillMinimalValidSimplifiedWard,
} from './support/target';

// Milestone 74A: on the Inventory, the Annual family and the Simplified, a
// filer who filled in a co-guardian card before the first card and then left
// the page came back to find the co-guardian in the Guardian #1 card and the
// empty first card gone -- silently, and the check asking for Guardian #1's
// name went quiet. The clean-up on leaving a page kept "at least one card",
// and the co-guardian satisfied that. Every other path already keeps the first
// card (the pages offer no Remove on it, the three Excel imports keep slot 1,
// the Plans' clean-up keeps their first block), and now so does the clean-up.
// Every case uses the real "+ Add Co-Guardian" button and name box.

const field = (page: Page, path: string) => page.evaluate((p) => (window as any).GuardianForms.testing.field(p), path);
const go = (page: Page, route: string) => page.evaluate((r) => (window as any).GuardianForms.testing.navigate(r), route);

function watchErrors(page: Page) {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  return errors;
}

const FORMS = [
  {
    type: 'guardian', route: '/d1', add: '[data-inventory-action="add-guardian"]', message: 'D-1 Guardian #1 — Name',
    start: async (page: Page) => { await createWard(page, 'First Stays Inventory', 'guardian'); await fillMinimalValidGuardianWard(page); },
  },
  {
    type: 'annual', route: '/p3', add: '[data-annual-action="add-row"][data-collection="guardians"]', message: 'Part III — Guardian #1 — Name',
    start: async (page: Page) => { await createWard(page, 'First Stays Annual', 'annual'); await fillMinimalValidAnnualWard(page); },
  },
  {
    type: 'simplified', route: '/p4', add: '[data-simplified-action="add-guardian"]', message: 'Part IV — Guardian #1 — Name',
    start: async (page: Page) => { await createSimplifiedWard(page, 'First Stays Simplified'); await fillMinimalValidSimplifiedWard(page); },
  },
] as const;

for (const form of FORMS) {
  test(`${form.type}: a filled co-guardian stays second when Guardian #1's card is empty and the filer leaves the page`, async ({ page }) => {
    test.setTimeout(180_000);
    const errors = watchErrors(page);
    await freshStartNoPassword(page);
    await form.start(page);
    // Guardian #1's card emptied, as on a filing where the filer starts with
    // the co-guardian: every field blank, no shared-record link.
    await page.evaluate(() => {
      const t = (window as any).GuardianForms.testing;
      const first = t.field('guardians')[0];
      const blank = Object.fromEntries(Object.entries(first).map(([k, v]) => [k, typeof v === 'boolean' ? false : v === null ? null : '']));
      t.patchFiling({ guardians: [blank], guardianPartyIds: [null] });
      return t.save.flush();
    });
    await go(page, form.route);

    await page.locator(form.add).click();
    const coName = page.locator('#main-content input[data-field-path="guardians.1.name"]');
    await coName.fill('Carol Co-Guardian');
    await coName.dispatchEvent('change');
    expect((await field(page, 'guardians')).map((g: any) => g.name)).toEqual(['', 'Carol Co-Guardian']);

    // Leave the page and come back: the order the filer entered is kept.
    await go(page, '/');
    await go(page, form.route);
    expect((await field(page, 'guardians')).map((g: any) => g.name), 'the co-guardian is still second').toEqual(['', 'Carol Co-Guardian']);
    await expect(page.locator('#main-content input[data-field-path="guardians.0.name"]')).toHaveValue('');
    await expect(page.locator('#main-content input[data-field-path="guardians.1.name"]')).toHaveValue('Carol Co-Guardian');

    // And the checks still ask for Guardian #1's name.
    const messages: string[] = await page.evaluate(async () => (await (window as any).GuardianForms.testing.validate.open()).map((m: any) => String(m.message)));
    expect(messages).toContain(form.message);
    expect(errors).toEqual([]);
  });
}
