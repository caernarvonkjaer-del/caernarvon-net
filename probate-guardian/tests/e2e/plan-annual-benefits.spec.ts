import { test, expect } from '@playwright/test';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import { freshStartNoPassword, createWard, dismissScheduleDocPrompt, expectExportReady, clickExport, fillMinimalValidPlanAnnualWard } from './support/target';
import { readAll } from './support/stream';

// Milestone 75C: the Annual Plan's Question 3G has the court form's VA row,
// between Medicaid and Trusts, on the screen and in the PDF; a guardian can
// say the ward is eligible for VA benefits, or has applied.

test('Annual Plan 3G: the VA row sits between Medicaid and Trusts, and its answer is filed', async ({ page }) => {
  test.setTimeout(180_000);
  await freshStartNoPassword(page);
  await createWard(page, 'VA Ward', 'planAnnual');
  await fillMinimalValidPlanAnnualWard(page);
  await page.evaluate(() => (window as any).GuardianForms.testing.navigate('/p4'));
  await dismissScheduleDocPrompt(page);

  const rows = await page.locator('#main-content th[scope="row"]').allTextContents();
  const at = rows.indexOf('VA');
  expect(at, `3G's rows: ${rows.join(', ')}`).toBeGreaterThan(0);
  expect(rows.slice(at - 1, at + 2)).toEqual(['Medicaid', 'VA', 'Trusts']);

  // Unanswered until answered (AGENTS.md section 4), then the filer's Yes.
  const va = page.locator('#main-content tr', { has: page.locator('th[scope="row"]', { hasText: /^VA$/ }) });
  await expect(va.getByRole('radio', { checked: true })).toHaveCount(0);
  await va.locator('td').first().getByRole('radio', { name: 'Yes' }).check();
  await expect.poll(() => page.evaluate(() => (window as any).GuardianForms.testing.field('benefits.va'))).toEqual({ eligible: 'Yes', appliedFor: '' });

  await page.evaluate(() => (window as any).GuardianForms.testing.save.flush());
  await page.evaluate(() => (window as any).GuardianForms.testing.navigate('/print'));
  const save = page.locator('[data-output-action="save-pdf"]').first();
  await expectExportReady(save, 60_000);
  const loading = pdfjsLib.getDocument({ data: new Uint8Array(await readAll(await (await clickExport(save)).createReadStream())), verbosity: 0 });
  const pdf = await loading.promise;
  let text = '';
  for (let p = 1; p <= pdf.numPages; p++) text += ` ${(await (await pdf.getPage(p)).getTextContent()).items.map((item: any) => item.str).join(' ')}`;
  await loading.destroy().catch(() => {});
  expect(text.replace(/\s+/g, ' '), 'the PDF\'s 3G table').toMatch(/Medicaid — — VA Yes — Trusts/);
});
