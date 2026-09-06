import { test, expect } from '@playwright/test';
import { freshStartNoPassword } from './support/target';

test('attestation cards use two columns on desktop and stack on narrow screens', async ({ page }) => {
  await freshStartNoPassword(page);
  await page.evaluate(() => (window as any).addWard('Layout Ward', 'guardian'));
  await page.evaluate(() => {
    const data = (window as any).D;
    data.guardians = [
      { name: 'First Guardian', signatureDate: '', phone: '', ssnEin: '', streetAddress: '', cityStateZip: '', useSlashS: true },
    ];
    data.witnesses = [
      { name: 'Witness One', address: '1 Main Street', occupation: 'Notary' },
      { name: 'Witness Two', address: '2 Main Street', occupation: 'Agent' },
    ];
  });
  await page.evaluate(() => (window as any).navigate('/d1'));
  const oneCardGrid = page.locator('.attestation-card-grid').first();
  await expect(oneCardGrid.locator(':scope > .entry-card')).toHaveCount(1);
  const oneCardWidth = await oneCardGrid.locator(':scope > .entry-card').evaluate((card) => (card as HTMLElement).getBoundingClientRect().width);
  expect(oneCardWidth).toBeLessThan(600);

  await page.evaluate(() => {
    const data = (window as any).D;
    data.guardians = [
      { name: 'First Guardian', signatureDate: '', phone: '', ssnEin: '', streetAddress: '', cityStateZip: '', useSlashS: true },
      { name: 'Second Guardian', signatureDate: '', phone: '', ssnEin: '', streetAddress: '', cityStateZip: '', useSlashS: true },
    ];
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

  await page.setViewportSize({ width: 1280, height: 900 });
  await page.evaluate(() => (window as any).navigate('/d2'));
  const d2Grid = page.locator('.attestation-card-grid').first();
  await expect(d2Grid.locator(':scope > div')).toHaveCount(2);
  const d2Columns = await d2Grid.locator(':scope > div').evaluateAll(elements => new Set(elements.map(element => (element as HTMLElement).getBoundingClientRect().x)).size);
  expect(d2Columns).toBe(2);

  await page.evaluate(() => (window as any).navigate('/d5'));
  const recipientGrid = page.locator('.service-recipient-grid');
  await expect(recipientGrid).toBeVisible();
  const recipientColumns = await recipientGrid.locator(':scope > .entry-card').evaluateAll(elements => new Set(elements.map(element => (element as HTMLElement).getBoundingClientRect().x)).size);
  expect(recipientColumns).toBe(2);
  await expect(recipientGrid.locator('input[data-bind="serviceRecipients.0.address"]')).toBeVisible();
  const certification = page.locator('.attorney-certification-card');
  const certificationWidth = await certification.evaluate(element => (element as HTMLElement).getBoundingClientRect().width);
  expect(certificationWidth).toBeLessThan(700);

  await page.evaluate(() => (window as any).navigate('/'));
  const witnessGrid = page.locator('.witness-card-grid');
  await expect(witnessGrid).toBeVisible();
  const witnessColumns = await witnessGrid.locator(':scope > .entry-card').evaluateAll(elements => new Set(elements.map(element => (element as HTMLElement).getBoundingClientRect().x)).size);
  expect(witnessColumns).toBe(2);
  const witnessName = witnessGrid.locator('input[data-bind="witnesses.0.name"]');
  const witnessAddress = witnessGrid.locator('input[data-bind="witnesses.0.address"]');
  expect((await witnessAddress.boundingBox())!.y).toBeGreaterThan((await witnessName.boundingBox())!.y);
});

test('Guardian Inventory removes empty co-guardian placeholders from active state', async ({ page }) => {
  await freshStartNoPassword(page);
  await page.evaluate(() => (window as any).addWard('Guardian cleanup', 'guardian'));
  await page.evaluate(() => {
    (window as any).D.guardians = [
      { name: 'Primary Guardian', signatureDate: '', phone: '', ssnEin: '', streetAddress: '', cityStateZip: '' },
      { name: '', signatureDate: '', phone: '', ssnEin: '', streetAddress: '', cityStateZip: '' },
    ];
  });
  await page.evaluate(() => (window as any).navigate('/d1'));
  expect(await page.evaluate(() => (window as any).D.guardians.length)).toBe(1);
  await expect(page.locator('.attestation-card-grid > .entry-card')).toHaveCount(1);
});

test('Add Co-Guardian preserves one temporary blank editor', async ({ page }) => {
  await freshStartNoPassword(page);
  await page.evaluate(() => (window as any).addWard('Guardian add', 'guardian'));
  await page.evaluate(() => { (window as any).D.guardians[0].name = 'Primary Guardian'; });
  await page.evaluate(() => (window as any).navigate('/d1'));
  await page.locator('[data-inventory-action="add-guardian"]').click();
  await expect(page.locator('.attestation-card-grid > .entry-card')).toHaveCount(2);
});
