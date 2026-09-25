import { expect, test, type Page } from '@playwright/test';
import { freshStartNoPassword } from './support/target';

// Milestone 63B. Milestone 57B's decision D16 says a filer who lists a recipient
// "never sees the question" -- "No recipients are required for this certificate
// (filer attestation ...)". The validation honoured that (it asks only when
// Recipient 1 is blank) but all three pages rendered the Yes/No unconditionally,
// so a filer with a recipient listed still saw a question that looked required.
// It is now shown only when it applies: Recipient 1 blank, or 'Yes' selected
// (the cards are hidden then, and the control is the only way back).
//
// The rule is unit-tested (service-recipients.spec.js,
// service-attestation-visibility.spec.js); what only a browser can prove is that
// the toggle happens in place -- typing in Recipient 1 must not re-render the page
// under the filer -- on each of the three certificate pages.

const FAMILIES = [
  { label: 'Initial Inventory D-5', type: 'guardian', route: '/d5', attestation: 'serviceNoRecipients', rows: 'serviceRecipients' },
  { label: 'Annual Part X', type: 'annual', route: '/p10', attestation: 'certNoRecipients', rows: 'certRecipients' },
  { label: 'Simplified Part VI', type: 'simplified', route: '/p6', attestation: 'certNoRecipients', rows: 'certRecipients' },
] as const;

const question = (page: Page, attestation: string) => page.locator(`[data-yes-no-group="${attestation}"]`);
const recipientCards = (page: Page) => page.locator('.entry-card').filter({ hasText: /Recipient\s*1/ });
const recipient1Name = (page: Page) => recipientCards(page).first().locator('input[type="text"], input:not([type])').first();

async function openCertificate(page: Page, type: string, route: string) {
  await freshStartNoPassword(page);
  await page.evaluate(([t]) => (window as any).GuardianForms.testing.createFiling.add(`Attestation ${t}`, t), [type]);
  await page.evaluate((r) => (window as any).GuardianForms.testing.navigate(r), route);
}

for (const family of FAMILIES) {
  test.describe(family.label, () => {
    test('the question shows only while it applies, and toggling never re-renders the page', async ({ page }) => {
      await openCertificate(page, family.type, family.route);
      const q = question(page, family.attestation);

      // Nobody listed and unanswered: this is the one state that asks.
      await expect(q).toBeVisible();

      await page.evaluate(() => { (document.querySelector('#main-content') as any).__stamp = 'same-render'; });
      const name = recipient1Name(page);

      // Listing a recipient answers the question by itself.
      await name.fill('A Recipient');
      await name.blur();
      await expect(q).toBeHidden();
      expect(await page.evaluate(() => (document.querySelector('#main-content') as any).__stamp),
        'typing in Recipient 1 must not re-render the page under the filer').toBe('same-render');

      // Clearing Recipient 1 brings the question back.
      await name.fill('');
      await name.blur();
      await expect(q).toBeVisible();
    });

    test("'Yes' hides the cards but keeps the question, and 'No' brings the cards back", async ({ page }) => {
      await openCertificate(page, family.type, family.route);
      const q = question(page, family.attestation);

      await q.getByLabel('Yes', { exact: true }).check();
      await expect(recipientCards(page)).toHaveCount(0);
      await expect(q, "'Yes' hides the cards, so the control is the only way back").toBeVisible();

      await q.getByLabel('No', { exact: true }).check();
      await expect(recipientCards(page).first()).toBeVisible();
      await expect(q).toBeVisible();
    });

    test('a page opened with Recipient 1 already listed does not show the question at all', async ({ page }) => {
      await openCertificate(page, family.type, family.route);
      await page.evaluate(([rows]) => {
        const w = window as any;
        const t = w.GuardianForms.testing;
        t.patchFiling({ [`${rows}.0`]: { ...((t.field(rows) || [])[0] || {}), name: 'Already Listed' } });
        return w.GuardianForms.testing.navigate(location.hash.replace(/^#/, '') || '/');
      }, [family.rows]);
      await page.evaluate((r) => (window as any).GuardianForms.testing.navigate(r), family.route);

      await expect(question(page, family.attestation)).toBeHidden();
      await expect(recipient1Name(page)).toHaveValue('Already Listed');
    });
  });
}
