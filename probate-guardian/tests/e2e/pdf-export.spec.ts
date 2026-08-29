import { test, expect } from '@playwright/test';
import { freshStartNoPassword, createWard, fillMinimalValidGuardianWard } from './support/target';

test.describe('pdf-export', () => {
  test('an incomplete filing is blocked from export with a clear error', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'Incomplete PDF Ward');
    await page.evaluate(() => (window as any).navigate('/print'));

    let alertMessage = '';
    page.once('dialog', (d) => { alertMessage = d.message(); d.accept(); });
    await page.evaluate(() => { void (window as any).doSavePdf(); });
    await page.waitForTimeout(500);

    expect(alertMessage).toContain('Cannot export');
  });

  test('a fully completed filing exports a real PDF', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'Complete PDF Ward');
    await fillMinimalValidGuardianWard(page);
    await page.evaluate(() => (window as any).navigate('/print'));

    const downloadPromise = page.waitForEvent('download', { timeout: 20_000 });
    await page.evaluate(() => { void (window as any).doSavePdf(); });
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toMatch(/\.pdf$/i);
    const stream = await download.createReadStream();
    const chunks: Buffer[] = [];
    for await (const chunk of stream) chunks.push(chunk as Buffer);
    const bytes = Buffer.concat(chunks);
    expect(bytes.length).toBeGreaterThan(1000);
    expect(bytes.subarray(0, 5).toString('latin1')).toBe('%PDF-');
  });
});
