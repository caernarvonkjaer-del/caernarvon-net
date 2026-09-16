import { test, expect } from '@playwright/test';
import { freshStartNoPassword, createWard, fillMinimalValidGuardianWard } from './support/target';

// Milestone 52H: html2pdf-loader.js and exceljs-loader.js's identical
// script-injection + promise-caching logic moved to a shared
// loadGlobalScript() (src/core/vendor-loader.js). Neither loader had any
// test coverage for the one behavior both deliberately kept: a failed load
// must not poison the cache, so a later retry can still succeed. This is
// the regression gate for that, exercised through exceljs-loader.js (both
// loaders now share the exact same retry logic, so covering one covers the
// mechanism -- per the milestone doc's own Cross-cutting note).

test('a blocked ExcelJS script load fails cleanly, and a later export retries successfully', async ({ page }) => {
  let requests = 0;
  await page.route('**/lib/exceljs.min.js', (route) => {
    requests += 1;
    if (requests === 1) {
      route.abort('failed');
    } else {
      route.continue();
    }
  });

  await freshStartNoPassword(page);
  await createWard(page, 'Vendor Loader Retry Ward', 'guardian');
  await fillMinimalValidGuardianWard(page);
  await page.evaluate(() => (window as any).navigate('/print'));

  // First attempt: the script request is aborted, loadGlobalScript()'s
  // promise rejects, and doSaveExcel()'s own catch surfaces it as status
  // text rather than an uncaught page error.
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.locator('[data-inventory-action="save-excel"]').click();
  await expect(page.locator('#export-status')).toContainText('❌', { timeout: 10_000 });
  expect(errors, `uncaught page error on the blocked first attempt: ${errors.join('\n')}`).toEqual([]);
  expect(await page.evaluate(() => (window as any).ExcelJS)).toBeUndefined();

  // Second attempt: the request now succeeds. If the failed promise had
  // stayed cached, this would hang or repeat the same rejection instead of
  // ever reaching a real download.
  const downloadPromise = page.waitForEvent('download', { timeout: 20_000 });
  await page.locator('[data-inventory-action="save-excel"]').click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/\.xlsx$/i);
  await expect(page.locator('#export-status')).toContainText('Exported', { timeout: 10_000 });
  expect(requests).toBe(2);
});
