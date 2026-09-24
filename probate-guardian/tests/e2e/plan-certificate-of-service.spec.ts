import { test, expect, type Page } from '@playwright/test';
import {
  freshStartNoPassword, createWard,
  fillMinimalValidPlanAnnualWard, fillMinimalValidPlanSimplifiedWard, fillMinimalValidPlanMinorWard, fillMinimalValidPlanInitialWard,
} from './support/target';
import { readAll } from './support/stream';
import { extractPdfText } from './support/pdf-extract';

// Milestone 68C. Every Plan's readiness card told the filer to "serve a copy
// on all interested persons and file the certificate of service", and no Plan
// had a certificate of service anywhere -- the implementation existed only in
// the accounting family. The Clerk's own review checklists ask "Certificate of
// service filed?" on the Initial, Annual and Minor plans and say it is not
// required for the Simplified Plan; the court's plan forms carry none; the
// Probate Rules put the duty to serve on the guardian and Rule 2.516's
// certificate is signed by "the attorney or party".
//
// Decided: build it on all four Plans -- recipient cards, the "no recipients
// are required" attestation, a Date of Service and method, and one "Certified
// by" block signed by the attorney when the plan names one, otherwise the
// guardian -- optional and so marked on the Simplified Plan, whose readiness
// text was wrong. NOTHING on the page blocks export. Driven through the real
// buttons: the sidebar asks; the export gate never does.

type Form = {
  label: string; type: string; route: string; navKey: string; validator: string; pdfButton: string; optional: boolean;
  fill: (page: Page) => Promise<void>;
};

const FORMS: Form[] = [
  { label: 'Annual Plan', type: 'planAnnual', route: '/p12', navKey: 'pa-p12', validator: 'validatePlanAnnual', pdfButton: '[data-form-action="save-pdf-plan-annual"]', optional: false, fill: fillMinimalValidPlanAnnualWard },
  { label: 'Simplified Plan', type: 'planSimplified', route: '/p4', navKey: 'ps-p4', validator: 'validatePlanSimplified', pdfButton: '[data-plan-simplified-action="save-pdf"]', optional: true, fill: fillMinimalValidPlanSimplifiedWard },
  { label: 'Minor Plan', type: 'planMinor', route: '/p8', navKey: 'pm-p8', validator: 'validatePlanMinor', pdfButton: '[data-form-action="save-pdf-plan-minor"]', optional: false, fill: fillMinimalValidPlanMinorWard },
  { label: 'Initial Plan', type: 'planInitial', route: '/p11', navKey: 'pi-p11', validator: 'validatePlanInitial', pdfButton: '[data-form-action="save-pdf-plan-initial"]', optional: false, fill: fillMinimalValidPlanInitialWard },
];

const messages = (page: Page, validator: string) =>
  page.evaluate((v) => ((window as any)[v]() || []).map((i: any) => String(i?.message ?? i)), validator);
const certIssues = async (page: Page, validator: string) => (await messages(page, validator)).filter((m) => /Certificate of Service/i.test(m));
const navKey = (page: Page, key: string) => page.evaluate((k) => (window as any).computeNavChecks().checks[k], key);
const go = (page: Page, route: string) => page.evaluate((r) => (window as any).navigate(r), route);
const nameInput = (page: Page, i: number) => page.locator(`#main-content input[data-form-path="certRecipients.${i}.name"]`);

async function download(page: Page, selector: string) {
  await page.evaluate(() => (window as any).flushPendingSave());
  await go(page, '/print');
  const button = page.locator(selector);
  await expect(button).toBeEnabled({ timeout: 20_000 });
  const dl = page.waitForEvent('download', { timeout: 40_000 });
  await button.click();
  return readAll(await (await dl).createReadStream());
}

for (const form of FORMS) {
  test.describe(`Milestone 68C — ${form.label}`, () => {
    test('the page exists, recipients add and remove through the real buttons, and export is never blocked', async ({ page }) => {
      test.setTimeout(120_000);
      await freshStartNoPassword(page);
      await createWard(page, `${form.label} Certificate`, form.type);
      await form.fill(page);
      await go(page, form.route);
      await expect(page.locator('#main-content h1')).toContainText('Certificate of Service');
      await expect(page.locator(`#sidebar [data-nav="${form.navKey}"]`), 'the sidebar lists the page').toHaveCount(1);

      // One blank card to start; Add and Remove work the Plans' row path.
      await expect(nameInput(page, 0)).toHaveCount(1);
      await page.locator('#main-content [data-form-action="add-plan-row"][data-collection="certRecipients"]').click();
      await expect(nameInput(page, 1)).toHaveCount(1);
      await nameInput(page, 1).fill('Second Recipient');
      await nameInput(page, 1).blur();
      expect(await page.evaluate(() => (window as any).D.certRecipients[1].name)).toBe('Second Recipient');
      await page.locator('#main-content [data-form-action="remove-plan-row"][data-collection="certRecipients"][data-index="1"]').click();
      await expect(nameInput(page, 1)).toHaveCount(0);
      expect(await page.evaluate(() => (window as any).D.certRecipients.length)).toBe(1);

      // Blank, attested, named, and half-finished: never an export issue.
      for (const [label, patch] of [
        ['blank', { certNoRecipients: '', certRecipients: [{ name: '', line2: '', line3: '', line4: '' }] }],
        ['attested', { certNoRecipients: 'Yes' }],
        ['named', { certNoRecipients: '', certRecipients: [{ name: 'Sam Recipient', line2: '', line3: '', line4: '' }] }],
        ['half-finished', { certNoRecipients: '', certRecipients: [{ name: 'Sam Recipient', line2: '', line3: '', line4: '' }, { name: '', line2: 'PO Box 1', line3: '', line4: '' }] }],
      ] as const) {
        await page.evaluate((p) => { Object.assign((window as any).D, p); (window as any).autoSave(); }, patch);
        expect(await certIssues(page, form.validator), `${form.label} ${label}: the export gate says nothing`).toEqual([]);
      }
      await go(page, '/print');
      await expect(page.locator(form.pdfButton), 'Save as PDF stays enabled with a half-finished certificate').toBeEnabled();
    });

    test('the attestation hides the cards without deleting them, and the sidebar asks until someone is listed or the attestation is Yes', async ({ page }) => {
      await freshStartNoPassword(page);
      await createWard(page, `${form.label} Certificate Attest`, form.type);
      await form.fill(page);
      await go(page, form.route);

      // Blank: the sidebar asks, and the page says why -- except on the
      // Simplified Plan, whose certificate is not required, where an
      // untouched one asks nothing (its own test, below).
      if (!form.optional) {
        expect(await navKey(page, form.navKey)).toBe(false);
        await expect(page.locator('#page-local-guidance'), 'the page explains the mark').toContainText(/recipient/i);
      }

      // The question is asked only while Recipient 1 is blank (the
      // accountings' D16 rule), so the data that must survive it lives in a
      // second card.
      await page.locator('#main-content [data-form-action="add-plan-row"][data-collection="certRecipients"]').click();
      await nameInput(page, 1).fill('Kept Recipient');
      await nameInput(page, 1).blur();
      expect(await navKey(page, form.navKey), 'started, Recipient 1 blank: the sidebar asks on every Plan').toBe(false);
      await expect(page.locator('#yesno_certNoRecipients_yes'), 'Recipient 1 blank: the question is visible').toBeVisible();
      await page.locator('#yesno_certNoRecipients_yes').check();
      await expect(nameInput(page, 1), 'Yes hides the cards').toHaveCount(0);
      expect(await page.evaluate(() => (window as any).D.certRecipients[1].name), 'hidden, not deleted').toBe('Kept Recipient');
      expect(await navKey(page, form.navKey), 'attested: the sidebar is satisfied').toBe(true);
      await page.locator('#yesno_certNoRecipients_no').check();
      await expect(nameInput(page, 1), 'No brings the cards back with what was typed').toHaveValue('Kept Recipient');

      // Naming Recipient 1 satisfies the sidebar and retires the question.
      await nameInput(page, 0).fill('First Recipient');
      await nameInput(page, 0).blur();
      expect(await navKey(page, form.navKey), 'named: the sidebar is satisfied').toBe(true);
      await expect(page.locator('[data-service-attestation]'), 'someone is listed: the question hides').toHaveClass(/d-none/);
    });

    test('the PDF prints the certificate with its recipients, date, method and the "Certified by" signer', async ({ page }) => {
      test.setTimeout(120_000);
      await freshStartNoPassword(page);
      await createWard(page, `${form.label} Certificate PDF`, form.type);
      await form.fill(page);
      await page.evaluate(() => {
        const w = window as any;
        Object.assign(w.D, {
          certRecipients: [{ name: 'Sam Recipient', line2: '1 Main St', line3: 'Clearwater, FL 33755', line4: '' }],
          certNoRecipients: '', certDate: '2026-03-01', certIndicator: 'mailed', certSigner: 'guardian',
          certSignatureDate: '2026-03-02', certSignatureState: 'typed',
        });
        w.autoSave();
      });
      const text = (await extractPdfText(await download(page, form.pdfButton))).replace(/\s+/g, ' ');
      expect(text).toContain('Certificate of Service');
      expect(text).toContain('Sam Recipient');
      expect(text).toContain('on this date: 03/01/2026 | mailed');
      expect(text).toContain('Certified by (Guardian)');
    });

    if (form.optional) {
      test('the Simplified Plan says the certificate is not required, instead of calling it a local requirement', async ({ page }) => {
        await freshStartNoPassword(page);
        await createWard(page, 'Simplified Plan Certificate Text', form.type);
        await form.fill(page);
        await go(page, '/print');
        const card = page.locator('#filing-readiness-card');
        await expect(card).toContainText(/does not require a certificate of service/i);
        await expect(card).not.toContainText(/and file the certificate of service/i);
      });

      // Follow-up, 2026-09-24. Every Simplified Plan filer who skipped the
      // certificate -- which the Clerk does not require -- was told "Not
      // completed" on Preview & Export, saw the page marked unfinished in the
      // sidebar, and could never reach every-section-complete. Decided: say
      // nothing until the filer starts it; from then on, ask like any Plan.
      test('an untouched certificate asks nothing anywhere; a started one asks like every other Plan', async ({ page }) => {
        test.setTimeout(120_000);
        await freshStartNoPassword(page);
        await createWard(page, 'Simplified Plan Certificate Untouched', form.type);
        await form.fill(page);
        const mark = () => page.evaluate((k) => {
          const r = (window as any).computeNavChecks();
          return { done: !!r.checks[k], incomplete: !!r.incomplete[k] };
        }, form.navKey);
        const guidance = page.locator('#page-local-guidance', { hasText: /recipient/i });
        const advisory = page.locator('.alert-warning li', { hasText: 'Certificate of Service —' });

        expect(await mark(), 'untouched: the sidebar counts the page finished').toEqual({ done: true, incomplete: false });
        await go(page, form.route);
        await expect(page.locator('#main-content h1')).toContainText('Certificate of Service');
        await expect(guidance, 'untouched: the page asks for nothing').toHaveCount(0);
        await expect(page.locator('#page-next-btn'), 'untouched: the way on to Preview & Export is open').toBeEnabled();
        await page.evaluate(() => (window as any).flushPendingSave());
        await go(page, '/print');
        await expect(page.locator(form.pdfButton)).toBeEnabled({ timeout: 20_000 });
        await expect(advisory, 'untouched: Preview & Export says nothing about it').toHaveCount(0);

        // Entering anything starts it; from then on it is asked like any Plan's.
        await go(page, form.route);
        await page.locator('#certDate').fill('2026-03-01');
        await page.locator('#certDate').blur();
        expect(await mark(), 'started: marked unfinished').toEqual({ done: false, incomplete: true });
        await page.evaluate(() => (window as any).flushPendingSave());
        await go(page, form.route);
        await expect(guidance, 'started: the page says what it still wants').toHaveCount(1);
        await go(page, '/print');
        await expect(page.locator(form.pdfButton), 'still never blocks export').toBeEnabled({ timeout: 20_000 });
        await expect(advisory.first(), 'started: Preview & Export says what is blank').toBeVisible();
        await expect(advisory.filter({ hasText: 'No recipient is listed' })).toHaveCount(1);
      });
    }
  });
}
