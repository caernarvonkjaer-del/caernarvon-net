import { test, expect } from '@playwright/test';
import { freshStartNoPassword, createWard } from './support/target';

// Milestone 68I. The Initial Plan's Cover asks for both "Guardianship
// Inception Date" and "Date Letters Were Signed", required and adjacent, with
// no word on how they differ; the tester read them as the same date. The
// court's form asks for both (page 1), and they differ for a successor
// guardian: the guardianship began earlier than this guardian's letters, and
// the 60-day filing deadline runs from the letters (F.S. 744.362(1)).
// Decided: keep both, explain them -- each field's hint says what it is and
// how it differs, and stays tied to its input for screen readers.

const INCEPTION = /when this guardianship began/i;
const LETTERS = /when this guardian's letters were signed.*successor guardian.*60-day/i;

test('the Cover explains how the inception date and the letters date differ, beside each field', async ({ page }) => {
  await freshStartNoPassword(page);
  await createWard(page, 'Initial Plan Dates Explained', 'planInitial');
  await page.evaluate(() => (window as any).navigate('/'));

  for (const [id, pattern] of [['inceptionDate', INCEPTION], ['lettersSignedDate', LETTERS]] as const) {
    const input = page.locator(`#main-content input#${id}`);
    await expect(input).toHaveCount(1);
    const hintId = await input.getAttribute('aria-describedby');
    expect(hintId, `${id} is described by its hint`).toBeTruthy();
    const hint = page.locator(`#${hintId}`);
    await expect(hint, `${id}'s hint explains it`).toHaveText(pattern);
    await expect(hint, `${id} keeps its date format`).toContainText('Use MM/DD/YYYY');
  }
});
