import { test, expect } from '@playwright/test';
import { freshStartNoPassword } from './support/target';

test('attestation cards use two columns on desktop and stack on narrow screens', async ({ page }) => {
  await freshStartNoPassword(page);
  await page.evaluate(() => (window as any).addWard('Layout Ward', 'guardian'));
  await page.evaluate(() => {
    const data = (window as any).D;
    data.guardians.push({ name: '', signatureDate: '', phone: '', ssnEin: '', streetAddress: '', cityStateZip: '', useSlashS: true });
  });
  await page.evaluate(() => (window as any).navigate('/d1'));
  const grid = page.locator('.attestation-card-grid').first();
  await expect(grid).toBeVisible();

  await page.setViewportSize({ width: 1280, height: 900 });
  const desktop = await grid.evaluate((element) => {
    const cards = [...element.querySelectorAll(':scope > .entry-card')].map(card => (card as HTMLElement).getBoundingClientRect());
    return { columns: new Set(cards.map(card => card.x)).size, width: cards[0]?.width || 0 };
  });
  expect(desktop.columns).toBe(2);
  expect(desktop.width).toBeLessThan(600);

  await page.setViewportSize({ width: 700, height: 900 });
  const mobile = await grid.evaluate((element) => {
    const cards = [...element.querySelectorAll(':scope > .entry-card')].map(card => (card as HTMLElement).getBoundingClientRect());
    return new Set(cards.map(card => card.x)).size;
  });
  expect(mobile).toBe(1);
});
