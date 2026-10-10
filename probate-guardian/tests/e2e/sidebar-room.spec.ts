import { test, expect, type Page } from '@playwright/test';
import { freshStartNoPassword, createWard } from './support/target';

// Milestone 73R part 1 (R1): more room for the sidebar's section list. At a
// 768px-tall window the fixed blocks left it 176px, and 15px with the save
// controls open. Now: the filing type shows once, on the card (73R-2); the
// copyright notice is one line with its full text on hover (73R-1); the open
// save controls float over the list (73R-3); and a short window sets the
// card's label and total, and its percent and count, on one line each.
// Measured 2026-10-09: 347px closed and open.

const height = (page: Page, selector: string) => page.locator(selector).evaluate((el) => Math.round(el.getBoundingClientRect().height));

test.describe('73R part 1: room for the section list', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 768 });
    await freshStartNoPassword(page);
    await createWard(page, 'Pemberton Height Ward', 'guardian');
  });

  test('at 768px tall the list has room, and opening the save controls takes none of it', async ({ page }) => {
    const closed = await height(page, '#nav-sections');
    expect(closed).toBeGreaterThanOrEqual(320);
    await page.getByRole('button', { name: /Show save controls/ }).click();
    const save = page.getByRole('button', { name: /Save Backup \(\.sav\)/ });
    await expect(save).toBeInViewport();
    expect(await height(page, '#nav-sections')).toBe(closed);
    // The open controls lie over the list, not beside or under anything.
    const covered = await save.evaluate((el) => {
      const b = el.getBoundingClientRect();
      return document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2) === el || el.contains(document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2));
    });
    expect(covered, 'the Save Backup button is on top').toBe(true);
  });

  test('the filing type shows once, on the card; the copyright notice is one line with its whole text on hover', async ({ page }) => {
    await expect(page.locator('#sidebar-context')).toBeHidden();
    await expect(page.locator('#ward-info-display .ward-info-type')).toHaveText('Initial Inventory');
    const notice = page.locator('#sidebar-copyright');
    expect(await height(page, '#sidebar-copyright')).toBeLessThan(30);
    await expect(notice).toHaveAttribute('title', /^© Copyright \d{4} Pinellas County Clerk of the Circuit Court and Comptroller$/);
    await expect(notice).toHaveText(/Comptroller$/);
  });

  test('a short window sets the card\'s label and total on one line, and the progress count beside the percent; the save lines keep their whole text on hover', async ({ page }) => {
    const top = (selector: string) => page.locator(selector).evaluate((el) => Math.round(el.getBoundingClientRect().top));
    expect(Math.abs((await top('.ward-info-total-label')) - (await top('.ward-info-total')))).toBeLessThan(12);
    await expect(page.locator('.ward-progress-count-inline')).toBeVisible();
    await expect(page.locator('.ward-progress-count')).toBeHidden();
    await expect(page.getByRole('progressbar', { name: /of 17 pages to fill in complete/ })).toBeVisible();
    for (const id of ['#last-saved-indicator', '#auto-save-armed-indicator']) {
      const el = page.locator(id);
      expect(await el.getAttribute('title'), id).toBe((await el.textContent())?.trim());
    }

    // A tall window keeps the card as it was.
    await page.setViewportSize({ width: 1366, height: 1000 });
    expect((await top('.ward-info-total')) - (await top('.ward-info-total-label'))).toBeGreaterThan(8);
    await expect(page.locator('.ward-progress-count')).toBeVisible();
  });
});
