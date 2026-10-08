import { test, expect, type Page } from '@playwright/test';
import { freshStartNoPassword, createWard, createSimplifiedWard, fillMinimalValidGuardianWard, fillMinimalValidAnnualWard, fillMinimalValidSimplifiedWard, expectExportReady, clickExport } from './support/target';
import { readAll } from './support/stream';
import { extractPdfText } from './support/pdf-extract';

// Milestone 71B. A pro se guardian filing a Simplified Accounting (section
// 744.3679(3)) or a guardian advocate (Fla. Prob. R. 5.030(a)) filing an
// Initial Inventory or an Annual, Final or Trust Accounting could not finish:
// every attorney field was required, export stayed blocked until the filer
// overrode it, and the PDF then carried an empty attorney attestation and an
// attorney certificate of service nobody signed. Here each reaches an enabled
// Save as PDF with NO override; the PDF is certified by the guardian who
// served the copies (and, since Milestone 72D, prints the attorney block
// blank, as the Clerk's forms do, with no app-written reason); Preview & Export notes the
// Excel workbook's attorney-only certificate line. The controls a filer uses
// are driven with real clicks and keystrokes.

async function clearAnnualAttorney(page: Page) {
  await page.evaluate(() => {
    const t = (window as any).GuardianForms.testing;
    t.patchFiling({
      attorney: '', attorney_bar: '', attorney_phone: '', attorney_email: '', attorney_secondaryEmail: '',
      attorney_street: '', attorney_cityStateZip: '', attorney_signatureDate: '', attorney_signatureState: '',
      attorney_signatureImage: '', attorney_isPreparer: false,
    });
    t.save.auto();
  });
}

async function openPrint(page: Page) {
  await page.evaluate(() => (window as any).GuardianForms.testing.save.flush());
  await page.evaluate(() => (window as any).GuardianForms.testing.navigate('/print'));
}

async function downloadPdf(page: Page, selector: string) {
  await openPrint(page);
  await expect(page.locator('#main-content .print-preview-banner'), 'no issues: exported without any override').not.toContainText('issue(s)');
  const button = page.locator(selector);
  await expectExportReady(button, 20_000);
  const dl = clickExport(button, 40_000);
  return (await extractPdfText(await readAll(await (await dl).createReadStream()))).replace(/\s+/g, ' ');
}

const EXCEL_NOTE = "The court's Excel workbook has a certificate-of-service signature line for an attorney only";

test.describe('Milestone 71B: a filing with no attorney', () => {
  test('a pro se Simplified Accounting exports with no override; the attorney asterisks appear only once an attorney is typed', async ({ page }) => {
    test.setTimeout(240_000);
    await freshStartNoPassword(page);
    await createSimplifiedWard(page, 'Pro Se Simplified');
    await fillMinimalValidSimplifiedWard(page);
    await page.evaluate(() => {
      const t = (window as any).GuardianForms.testing;
      t.patchFiling({
        attorney: '', attorney_barNumber: '', attorney_phone: '', attorney_email: '', attorney_secondaryEmail: '',
        attorney_street: '', attorney_cityStateZip: '', attorney_signatureDate: '', attorney_signatureState: '',
      });
      t.save.auto();
    });

    // Part V: nothing marked required while no attorney is started...
    await page.evaluate(() => (window as any).GuardianForms.testing.navigate('/p5'));
    await expect(page.locator('#main-content [data-no-attorney-notice]')).toContainText('744.3679(3)');
    // Milestone 72D: and it says what the PDF does -- the attestation with a blank attorney block.
    await expect(page.locator('#main-content [data-no-attorney-notice]')).toContainText("signature block blank, as the Clerk's form does");
    const barRequired = () => page.evaluate(() => {
      const input = document.querySelector('#main-content input[data-form-path="attorney_barNumber"], #main-content input[data-field-path="attorney_barNumber"]') as HTMLInputElement | null;
      return input?.getAttribute('aria-required') === 'true';
    });
    expect(await barRequired(), 'no attorney: Bar Number is not required').toBe(false);
    // ...and marked the moment the filer types one in.
    const phone = page.locator('#main-content input[data-form-path="attorney_phone"], #main-content input[data-field-path="attorney_phone"]').first();
    await phone.pressSequentially('7275550143');
    await phone.blur();
    await expect.poll(barRequired, { message: 'an attorney phone starts the attorney: Bar Number becomes required' }).toBe(true);
    // Clearing it again returns the filing to pro se.
    await phone.fill('');
    await phone.blur();
    await expect.poll(barRequired).toBe(false);

    const pdf = await downloadPdf(page, '[data-simplified-action="save-pdf"]');
    // Milestone 72D: Part V prints blank, as the Clerk's workbook leaves it --
    // no app-written "not represented by counsel" line.
    expect(pdf).not.toContain('not represented by counsel');
    expect(pdf).toContain('The undersigned Attorney hereby notifies the Court');
    expect(pdf).toContain('Part VI — CERTIFICATE OF SERVICE');
    expect(pdf).not.toContain('GUARDIAN ATTORNEY CERTIFICATE OF SERVICE');
    await expect(page.locator('#main-content')).toContainText(EXCEL_NOTE);
    expect(await page.evaluate(() => (window as any).GuardianForms.testing.status.navChecks().checks['s-p5']), 'the sidebar agrees').toBe(true);
  });

  test('a Guardian Advocate Initial Inventory: the Cover asks why; the PDF files no reason (72D)', async ({ page }) => {
    test.setTimeout(240_000);
    await freshStartNoPassword(page);
    await createWard(page, 'Advocate Inventory', 'guardian');
    await fillMinimalValidGuardianWard(page);
    await page.evaluate(() => {
      const t = (window as any).GuardianForms.testing;
      const d = t.snapshot().filing;
      d.attorneyForGuardian = '';
      d.attorney = { ...d.attorney, name: '', barNumber: '', phone: '', email: '', secondaryEmail: '', streetAddress: '', cityStateZip: '', signatureDate: null, filingDate: null, signatureState: '', signatureImage: '', isPreparer: false };
      d.serviceAttorney = { ...d.serviceAttorney, name: '', barNumber: '', phone: '', streetAddress: '', cityStateZip: '', signatureDate: null, signatureState: '', signatureImage: '' };
      d.typeOfGuardianship = 'Guardian Advocate';
      t.replaceFiling(d);
      t.save.auto();
    });

    await page.evaluate(() => (window as any).GuardianForms.testing.navigate('/'));
    const question = page.locator('#main-content [data-attorney-waiver-basis]');
    await expect(question).toBeVisible();
    await expect(question.locator('[data-waiver-advocate-hint]'), 'a hint, never an automatic answer').toBeVisible();
    expect(await page.evaluate(() => (window as any).GuardianForms.testing.field('attorneyWaiverBasis'))).toBe('');
    await question.locator('#attorney_waiver_basis_guardian-advocate').check();
    await expect.poll(() => page.evaluate(() => (window as any).GuardianForms.testing.field('attorneyWaiverBasis'))).toBe('guardian-advocate');

    const pdf = await downloadPdf(page, '[data-inventory-action="save-pdf"]');
    // Milestone 72D: the reason is asked on screen and filed nowhere.
    expect(pdf).not.toContain('not represented by counsel');
    expect(pdf).toContain('The undersigned Attorney hereby notifies the Court');
    await expect(page.locator('#main-content')).toContainText(EXCEL_NOTE);
    await expect(page.locator('#main-content'), 'the basis is answered, so no basis note').not.toContainText('does not say why');
  });

  test('an Annual Accounting with co-guardians: the filer ticks who served the copies, and that guardian certifies', async ({ page }) => {
    test.setTimeout(300_000);
    await freshStartNoPassword(page);
    await createWard(page, 'Co-Guardian Annual', 'annual');
    await fillMinimalValidAnnualWard(page);
    await clearAnnualAttorney(page);
    await page.evaluate(() => {
      const t = (window as any).GuardianForms.testing;
      const d = t.snapshot().filing;
      d.guardians = [d.guardians[0], { ...d.guardians[0], name: 'Second Guardian', isPreparer: false, certifiesService: false }];
      d.attorneyWaiverBasis = 'court-order';
      t.replaceFiling(d);
      t.save.auto();
    });
    const issues = () => page.evaluate(async () => (await (window as any).GuardianForms.testing.validate.open()).map((e: any) => String(e.message ?? e)));
    expect((await issues()).filter((m) => /attorney/i.test(m)), 'no attorney issue at all').toEqual([]);
    expect(await issues(), 'co-guardians: which one served is asked').toContain('Part X — Tick the guardian who served the copies; that guardian signs the certificate of service');

    await page.evaluate(() => (window as any).GuardianForms.testing.navigate('/p10'));
    await expect(page.locator('#main-content h1')).toContainText('Part X — Certificate of Service');
    await expect(page.locator('#main-content h1')).not.toContainText('Guardian Attorney');
    await page.locator('#service_certifier_1').check();
    await expect(page.locator('#main-content [data-guardian-certificate]')).toContainText('Second Guardian');
    // Ticking the first clears the second (only one guardian certifies), and back.
    await page.locator('#service_certifier_0').check();
    await expect(page.locator('#service_certifier_1')).not.toBeChecked();
    await page.locator('#service_certifier_1').check();
    expect(await page.evaluate(() => (window as any).GuardianForms.testing.field('guardians.0.certifiesService'))).toBe(false);
    expect(await page.evaluate(() => (window as any).GuardianForms.testing.field('guardians.1.certifiesService'))).toBe(true);
    expect((await issues()).filter((m) => m.includes('Tick the guardian'))).toEqual([]);

    const pdf = await downloadPdf(page, '[data-annual-action="save-pdf"]');
    // Milestone 72D: the reason is asked on screen and filed nowhere.
    expect(pdf).not.toContain('not represented by counsel');
    expect(pdf).toContain('Part X — CERTIFICATE OF SERVICE');
    // The court order's date is blank: noted, never blocked.
    await expect(page.locator('#main-content')).toContainText("the order's date is blank");
    await expect(page.locator('#main-content')).toContainText(EXCEL_NOTE);
    const nav = await page.evaluate(() => (window as any).GuardianForms.testing.status.navChecks().checks);
    expect(nav['a-p5'], 'Part V is complete with no attorney').toBe(true);
  });
});
