import { test, expect } from '@playwright/test';
import { freshStartNoPassword, createWard, createSimplifiedWard } from './support/target';

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
    data.serviceRecipients = [
      { name: 'Recipient One', address: '1 Main Street', cityStateZip: 'Tampa, FL' },
      { name: 'Recipient Two', address: '2 Main Street', cityStateZip: 'Tampa, FL' },
    ];
  });
  await page.evaluate(() => (window as any).navigate('/d1'));
  const oneCardGrid = page.locator('.card-grid-2col').first();
  await expect(oneCardGrid.locator(':scope > .col-lg-6 > .entry-card')).toHaveCount(1);
  const oneCardWidth = await oneCardGrid.locator(':scope > .col-lg-6 > .entry-card').evaluate((card) => (card as HTMLElement).getBoundingClientRect().width);
  expect(oneCardWidth).toBeLessThan(600);

  await page.evaluate(() => {
    const data = (window as any).D;
    data.guardians = [
      { name: 'First Guardian', signatureDate: '', phone: '', ssnEin: '', streetAddress: '', cityStateZip: '', useSlashS: true },
      { name: 'Second Guardian', signatureDate: '', phone: '', ssnEin: '', streetAddress: '', cityStateZip: '', useSlashS: true },
    ];
  });
  await page.evaluate(() => (window as any).navigate('/d1'));
  const grid = page.locator('.card-grid-2col').first();
  await expect(grid).toBeVisible();

  await page.setViewportSize({ width: 1280, height: 900 });
  const desktop = await grid.evaluate((element) => {
    const cards = [...element.querySelectorAll(':scope > .col-lg-6 > .entry-card')].map(card => (card as HTMLElement).getBoundingClientRect());
    return { columns: new Set(cards.map(card => card.x)).size, width: cards[0]?.width || 0 };
  });
  expect(desktop.columns).toBe(2);
  expect(desktop.width).toBeLessThan(600);

  await page.setViewportSize({ width: 700, height: 900 });
  const mobile = await grid.evaluate((element) => {
    const cards = [...element.querySelectorAll(':scope > .col-lg-6 > .entry-card')].map(card => (card as HTMLElement).getBoundingClientRect());
    return new Set(cards.map(card => card.x)).size;
  });
  expect(mobile).toBe(1);

  await page.setViewportSize({ width: 1280, height: 900 });
  await page.evaluate(() => (window as any).navigate('/d2'));
  const d2Grid = page.locator('.card-grid-2col').first();
  await expect(d2Grid.locator(':scope > .col-lg-6')).toHaveCount(2);
  const d2Columns = await d2Grid.locator(':scope > .col-lg-6').evaluateAll(elements => new Set(elements.map(element => (element as HTMLElement).getBoundingClientRect().x)).size);
  expect(d2Columns).toBe(2);

  await page.evaluate(() => (window as any).navigate('/d5'));
  const recipientGrid = page.locator('.card-grid-2col');
  await expect(recipientGrid).toBeVisible();
  const recipientColumns = await recipientGrid.locator(':scope > .col-lg-6 > .entry-card').evaluateAll(elements => new Set(elements.map(element => (element as HTMLElement).getBoundingClientRect().x)).size);
  expect(recipientColumns).toBe(2);
  await expect(recipientGrid.locator('input[data-bind="serviceRecipients.0.address"]')).toBeVisible();
  const certification = page.locator('.attorney-certification-card');
  const certificationWidth = await certification.evaluate(element => (element as HTMLElement).getBoundingClientRect().width);
  expect(certificationWidth).toBeLessThan(700);

  await page.evaluate(() => (window as any).navigate('/'));
  const witnessGrid = page.locator('.card-grid-2col');
  await expect(witnessGrid).toBeVisible();
  const witnessColumns = await witnessGrid.locator(':scope > .col-lg-6 > .entry-card').evaluateAll(elements => new Set(elements.map(element => (element as HTMLElement).getBoundingClientRect().x)).size);
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
  await expect(page.locator('.card-grid-2col > .col-lg-6 > .entry-card')).toHaveCount(1);
});

test('Add Co-Guardian preserves one temporary blank editor', async ({ page }) => {
  await freshStartNoPassword(page);
  await page.evaluate(() => (window as any).addWard('Guardian add', 'guardian'));
  await page.evaluate(() => { (window as any).D.guardians[0].name = 'Primary Guardian'; });
  await page.evaluate(() => (window as any).navigate('/d1'));
  await page.locator('[data-inventory-action="add-guardian"]').click();
  await expect(page.locator('.card-grid-2col > .col-lg-6 > .entry-card')).toHaveCount(2);
});

test('Annual Accounting cards and cover layout use responsive 2-column grid', async ({ page }) => {
  await freshStartNoPassword(page);
  await createWard(page, 'Annual Layout Ward', 'annual');
  await page.setViewportSize({ width: 1280, height: 900 });

  // Cover
  await page.evaluate(() => (window as any).navigate('/'));
  const coverBoxes = page.locator('.cover-info-row > .col-md-6 > .summary-box');
  await expect(coverBoxes).toHaveCount(2);
  const coverCols = await coverBoxes.evaluateAll(elements => new Set(elements.map(el => (el as HTMLElement).getBoundingClientRect().x)).size);
  expect(coverCols).toBe(2);

  // Signatures (/p3)
  await page.evaluate(() => {
    (window as any).D.guardians = [
      { name: 'Guardian One' },
      { name: 'Co-Guardian Two' },
    ];
  });
  await page.evaluate(() => (window as any).navigate('/p3'));
  const p3Grid = page.locator('.card-grid-2col').first();
  await expect(p3Grid.locator(':scope > .col-12.col-lg-6 > .entry-card')).toHaveCount(2);
  const p3Cols = await p3Grid.locator(':scope > .col-12.col-lg-6 > .entry-card').evaluateAll(elements => new Set(elements.map(el => (el as HTMLElement).getBoundingClientRect().x)).size);
  expect(p3Cols).toBe(2);

  // Preparer (/p4)
  await page.evaluate(() => (window as any).navigate('/p4'));
  const p4Card = page.locator('.card-grid-2col > .col-12.col-lg-6 > .entry-card').first();
  await expect(p4Card).toBeVisible();
  const p4Width = await p4Card.evaluate(el => (el as HTMLElement).getBoundingClientRect().width);
  expect(p4Width).toBeLessThan(700);

  // Attorney (/p5)
  await page.evaluate(() => (window as any).navigate('/p5'));
  const p5Card = page.locator('.card-grid-2col > .col-12.col-lg-6 > .entry-card').first();
  await expect(p5Card).toBeVisible();
  const p5Width = await p5Card.evaluate(el => (el as HTMLElement).getBoundingClientRect().width);
  expect(p5Width).toBeLessThan(700);

  // Service / Cert (/p10)
  await page.evaluate(() => (window as any).navigate('/p10'));
  const p10CertCard = page.locator('.card-grid-2col > .col-12.col-lg-6 > .entry-card').first();
  await expect(p10CertCard).toBeVisible();
  const p10CertWidth = await p10CertCard.evaluate(el => (el as HTMLElement).getBoundingClientRect().width);
  expect(p10CertWidth).toBeLessThan(700);
});

test('Simplified Accounting cards and cover layout use responsive 2-column grid', async ({ page }) => {
  await freshStartNoPassword(page);
  await createSimplifiedWard(page, 'Simplified Layout Ward');
  await page.setViewportSize({ width: 1280, height: 900 });

  // Cover
  await page.evaluate(() => (window as any).navigate('/'));
  const coverBoxes = page.locator('.cover-info-row > .col-md-6 > .summary-box');
  await expect(coverBoxes).toHaveCount(2);
  const coverCols = await coverBoxes.evaluateAll(elements => new Set(elements.map(el => (el as HTMLElement).getBoundingClientRect().x)).size);
  expect(coverCols).toBe(2);

  // Signatures (/p4)
  await page.evaluate(() => {
    (window as any).D.guardians = [
      { name: 'Guardian One' },
      { name: 'Co-Guardian Two' },
    ];
  });
  await page.evaluate(() => (window as any).navigate('/p4'));
  const p4Grid = page.locator('.card-grid-2col').first();
  await expect(p4Grid.locator(':scope > .col-12.col-lg-6 > .entry-card')).toHaveCount(2);
  const p4Cols = await p4Grid.locator(':scope > .col-12.col-lg-6 > .entry-card').evaluateAll(elements => new Set(elements.map(el => (el as HTMLElement).getBoundingClientRect().x)).size);
  expect(p4Cols).toBe(2);

  // Attorney (/p5)
  await page.evaluate(() => (window as any).navigate('/p5'));
  const p5Card = page.locator('.card-grid-2col > .col-12.col-lg-6 > .entry-card').first();
  await expect(p5Card).toBeVisible();
  const p5Width = await p5Card.evaluate(el => (el as HTMLElement).getBoundingClientRect().width);
  expect(p5Width).toBeLessThan(700);

  // Recipients & Cert (/p6)
  await page.evaluate(() => (window as any).navigate('/p6'));
  const p6Card = page.locator('.card-grid-2col > .col-12.col-lg-6 > .entry-card').first();
  await expect(p6Card).toBeVisible();
});

test('Plan forms cards and cover layout use responsive 2-column grid', async ({ page }) => {
  await freshStartNoPassword(page);
  await page.setViewportSize({ width: 1280, height: 900 });

  // Plan Annual
  await createWard(page, 'Plan Annual Layout Ward', 'planAnnual');
  await page.evaluate(() => (window as any).navigate('/'));
  const paCoverBoxes = page.locator('.cover-info-row > .col-md-6 > .summary-box');
  await expect(paCoverBoxes).toHaveCount(2);
  await page.evaluate(() => (window as any).navigate('/p11'));
  const paSigCards = page.locator('.card-grid-2col > .col-12.col-lg-6 > .entry-card');
  await expect(paSigCards.first()).toBeVisible();

  // Plan Initial
  await createWard(page, 'Plan Initial Layout Ward', 'planInitial');
  await page.evaluate(() => (window as any).navigate('/'));
  const piCoverBoxes = page.locator('.cover-info-row > .col-md-6 > .summary-box');
  await expect(piCoverBoxes).toHaveCount(2);
  await page.evaluate(() => (window as any).navigate('/p9'));
  const piSigCards = page.locator('.card-grid-2col > .col-12.col-lg-6 > .entry-card');
  await expect(piSigCards.first()).toBeVisible();
  await page.evaluate(() => (window as any).navigate('/p10'));
  const piAttyCard = page.locator('.card-grid-2col > .col-12.col-lg-6 > .entry-card').first();
  await expect(piAttyCard).toBeVisible();

  // Plan Minor
  await createWard(page, 'Plan Minor Layout Ward', 'planMinor');
  await page.evaluate(() => (window as any).navigate('/'));
  const pmCoverBoxes = page.locator('.cover-info-row > .col-md-6 > .summary-box');
  await expect(pmCoverBoxes).toHaveCount(2);
  await page.evaluate(() => (window as any).navigate('/p6'));
  const pmSigCards = page.locator('.card-grid-2col > .col-12.col-lg-6 > .entry-card');
  await expect(pmSigCards.first()).toBeVisible();
  await page.evaluate(() => (window as any).navigate('/p7'));
  const pmPrepAttyCards = page.locator('.card-grid-2col > .col-12.col-lg-6 > .entry-card');
  await expect(pmPrepAttyCards).toHaveCount(2);
  const pmPrepAttyCols = await pmPrepAttyCards.evaluateAll(elements => new Set(elements.map(el => (el as HTMLElement).getBoundingClientRect().x)).size);
  expect(pmPrepAttyCols).toBe(2);

  // Plan Simplified
  await createWard(page, 'Plan Simplified Layout Ward', 'planSimplified');
  await page.evaluate(() => (window as any).navigate('/'));
  const psCoverBoxes = page.locator('.cover-info-row > .col-md-6 > .summary-box');
  await expect(psCoverBoxes).toHaveCount(2);
  await page.evaluate(() => (window as any).navigate('/p3'));
  const psSigCards = page.locator('.card-grid-2col > .col-12.col-lg-6 > .entry-card');
  await expect(psSigCards.first()).toBeVisible();
});

