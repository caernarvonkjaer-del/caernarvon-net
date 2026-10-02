import { test, expect, type Page } from '@playwright/test';
import {
  freshStartNoPassword, createWard, createSimplifiedWard, reopenFilingWithStoredShape,
  fillMinimalValidGuardianWard, fillMinimalValidSimplifiedWard, fillMinimalValidPlanSimplifiedWard,
} from './support/target';
import { readAll } from './support/stream';
import { extractPdfText } from './support/pdf-extract';

// Milestone 72C, as a filer meets it.
//
// The guardian's email: the Simplified Accounting and the Simplified Plan used
// to refuse to export without Guardian #1's; the Initial Inventory and the
// Initial Plan had nowhere to enter one. Now every form collects it, none
// blocks on it, and Preview & Export warns -- only while no attorney is
// entered -- that the court's rules expect each signer's e-mail address for
// service (Fla. R. Gen. Prac. & Jud. Admin. 2.515(c)).
//
// The attorney: on the Annual Plan and the Plan for Minors any attorney detail
// now starts an attorney and asks for the name and primary email, marked live
// as the filer types; the Annual, Final and Trust Accountings ask for the
// attorney's name in its own right.
//
// Driven through the real inputs and Preview & Export.

const inputFor = (page: Page, path: string) =>
  page.locator(`#main-content input[data-form-path="${path}"], #main-content input[data-field-path="${path}"], #main-content input[data-bind="${path}"]`).first();
const go = (page: Page, route: string) => page.evaluate((r) => (window as any).GuardianForms.testing.navigate(r), route);
const field = (page: Page, path: string) => page.evaluate((p) => (window as any).GuardianForms.testing.field(p), path);
const warning = (page: Page, text: string) => page.locator('#main-content .alert-warning li', { hasText: text });

async function type(page: Page, path: string, value: string) {
  const input = inputFor(page, path);
  await input.fill(value);
  await input.blur();
}

async function openPrint(page: Page) {
  await page.evaluate(() => (window as any).GuardianForms.testing.save.flush());
  await go(page, '/print');
}

const required = (page: Page, path: string) => page.evaluate((p) => {
  const input = document.querySelector(`#main-content input[data-form-path="${p}"], #main-content input[data-field-path="${p}"]`) as HTMLInputElement | null;
  return input?.getAttribute('aria-required') === 'true';
}, path);

test.describe('Milestone 72C: a guardian with no email', () => {
  test('Simplified Accounting, no attorney: exports with no override; Preview & Export warns until the email is typed', async ({ page }) => {
    test.setTimeout(180_000);
    await freshStartNoPassword(page);
    await createSimplifiedWard(page, 'Guardian Email Simplified');
    await fillMinimalValidSimplifiedWard(page);
    await page.evaluate(() => {
      const t = (window as any).GuardianForms.testing;
      t.patchFiling({
        attorney: '', attorney_barNumber: '', attorney_phone: '', attorney_email: '', attorney_secondaryEmail: '',
        attorney_street: '', attorney_cityStateZip: '', attorney_signatureDate: '', attorney_signatureState: '',
      });
      t.save.auto();
    });
    await go(page, '/p4');
    await type(page, 'guardians.0.email', '');
    expect(await required(page, 'guardians.0.email'), 'no longer marked required').toBe(false);

    await openPrint(page);
    await expect(warning(page, 'Part IV — Guardian #1 has no email address')).toBeVisible({ timeout: 20_000 });
    await expect(page.locator('#main-content .print-preview-banner')).not.toContainText('issue(s)');
    await expect(page.locator('[data-simplified-action="save-pdf"]'), 'a warning, never a blocker').toBeEnabled({ timeout: 20_000 });
    expect(await page.evaluate(() => (window as any).GuardianForms.testing.status.navChecks().checks['s-p4']), 'the sidebar does not hold Part IV back for it').toBe(true);

    await go(page, '/p4');
    await type(page, 'guardians.0.email', 'pat@example.com');
    await openPrint(page);
    await expect(page.locator('[data-simplified-action="save-pdf"]')).toBeEnabled({ timeout: 20_000 });
    await expect(warning(page, 'has no email address')).toHaveCount(0);
  });

  test('Simplified Plan: the warning stays for an attorney name alone, and goes once the attorney has an email too', async ({ page }) => {
    test.setTimeout(180_000);
    await freshStartNoPassword(page);
    await createWard(page, 'Guardian Email Simplified Plan', 'planSimplified');
    await fillMinimalValidPlanSimplifiedWard(page);
    await go(page, '/p3');
    await type(page, 'planGuardians.0.email', '');

    await openPrint(page);
    await expect(warning(page, 'Signatures — Guardian #1 has no email address')).toBeVisible({ timeout: 20_000 });
    await expect(page.locator('[data-plan-simplified-action="save-pdf"]'), 'it used to block here').toBeEnabled({ timeout: 20_000 });

    await go(page, '/p3');
    await type(page, 'attorney_name', 'Rachel Lawyer, Esq.');
    await openPrint(page);
    await expect(page.locator('[data-plan-simplified-action="save-pdf"]')).toBeEnabled({ timeout: 20_000 });
    await expect(warning(page, 'Guardian #1 has no email address'), 'a name alone is not an attorney anyone can serve').toHaveCount(1);

    await go(page, '/p3');
    await type(page, 'attorney_email', 'rachel@law.example');
    await openPrint(page);
    await expect(page.locator('[data-plan-simplified-action="save-pdf"]')).toBeEnabled({ timeout: 20_000 });
    await expect(warning(page, 'has no email address')).toHaveCount(0);
  });

  // The two forms that had no field: typing one clears the warning, and it
  // survives closing and reopening the filing.
  for (const [type_, route, path, label] of [
    ['guardian', '/d1', 'guardians.0.email', 'D-1'],
    ['planInitial', '/p9', 'planGuardians.0.email', 'Signatures'],
  ] as const) {
    test(`${type_}: a field for it now -- typed, it clears the warning and survives reopening`, async ({ page }) => {
      test.setTimeout(120_000);
      await freshStartNoPassword(page);
      await createWard(page, `Guardian Email ${type_}`, type_);
      await openPrint(page);
      await expect(warning(page, `${label} — Guardian #1 has no email address`), 'no attorney entered: warned').toBeVisible({ timeout: 20_000 });

      await go(page, route);
      await type(page, path, 'pat@example.com');
      await expect.poll(() => field(page, path)).toBe('pat@example.com');
      const reopened = await reopenFilingWithStoredShape(page, {});
      expect(path.split('.').reduce((v: any, k) => v?.[k], reopened), 'kept through closing and reopening').toBe('pat@example.com');
      await openPrint(page);
      await expect(page.locator('#main-content .print-preview-banner')).toBeVisible({ timeout: 20_000 });
      await expect(warning(page, 'has no email address')).toHaveCount(0);
    });
  }

  test('the Initial Inventory prints the email typed on D-1 in the guardian signature block', async ({ page }) => {
    test.setTimeout(180_000);
    await freshStartNoPassword(page);
    await createWard(page, 'Guardian Email Inventory PDF', 'guardian');
    await fillMinimalValidGuardianWard(page);
    await go(page, '/d1');
    await type(page, 'guardians.0.email', 'pat.rivera@example.com');
    await openPrint(page);
    const button = page.locator('[data-inventory-action="save-pdf"]');
    await expect(button).toBeEnabled({ timeout: 20_000 });
    const dl = page.waitForEvent('download', { timeout: 40_000 });
    await button.click();
    const text = (await extractPdfText(await readAll(await (await dl).createReadStream()))).replace(/\s+/g, ' ');
    expect(text).toContain('pat.rivera@example.com');
  });
});

test.describe('Milestone 72C: the attorney, one rule', () => {
  for (const [type_, route, name] of [['planAnnual', '/p11', 'attorney'], ['planMinor', '/p7', 'attorney_name']] as const) {
    test(`${type_}: a Bar number alone marks the attorney's name and email required, live; clearing it unmarks them`, async ({ page }) => {
      await freshStartNoPassword(page);
      await createWard(page, `Attorney Rule ${type_}`, type_);
      await go(page, route);
      expect(await required(page, name), 'no attorney: the name is not required').toBe(false);
      expect(await required(page, 'attorney_email')).toBe(false);

      await type(page, 'attorney_bar', '0123456');
      await expect.poll(() => required(page, name), { message: 'a Bar number starts the attorney' }).toBe(true);
      await expect.poll(() => required(page, 'attorney_email')).toBe(true);
      const messages: string[] = await page.evaluate(async () => ((await (window as any).GuardianForms.testing.validate.open()) || []).map((i: any) => String(i?.message ?? i)));
      expect(messages.filter((m) => /Attorney (name|email) is required/.test(m)), 'and export asks for both').toHaveLength(2);

      await type(page, 'attorney_bar', '');
      await expect.poll(() => required(page, name)).toBe(false);
      await expect.poll(() => required(page, 'attorney_email')).toBe(false);
    });
  }

  // Found while building 72C: the Plan for Minors marked "Preparer Name" and
  // the attorney's "Date Signed" required on every plan, though neither role
  // is required until started and the other Plans mark neither date.
  test("planMinor: Preparer Name follows the preparer's own rule, and the attorney's Date Signed is not marked", async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'Preparer Rule planMinor', 'planMinor');
    await go(page, '/p7');
    expect(await required(page, 'preparer_name'), 'no preparer: not required').toBe(false);
    expect(await required(page, 'attorney_signatureDate')).toBe(false);
    await type(page, 'preparer_signatureDate', '01/15/2027');
    await expect.poll(() => required(page, 'preparer_name'), { message: "a preparer's date starts the preparer" }).toBe(true);
    await type(page, 'preparer_signatureDate', '');
    await expect.poll(() => required(page, 'preparer_name')).toBe(false);
  });

  test("Annual Accounting: Parts I and V mark, and Part V asks for, the attorney's name once an attorney is started; Part III's guardian email is not marked", async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'Attorney Name Annual', 'annual');
    await go(page, '/p3');
    expect(await required(page, 'guardians.0.email'), 'Part III: the guardian email is a warning, not a required field').toBe(false);

    await go(page, '/p1');
    expect(await required(page, 'attorney'), "Part I's Attorney for Guardian: not marked with no attorney").toBe(false);
    await go(page, '/p5');
    expect(await required(page, 'attorney')).toBe(false);
    await type(page, 'attorney_bar', '0123456');
    await expect.poll(() => required(page, 'attorney')).toBe(true);
    // The same field on Part I is marked too, as the Simplified's Cover marks its own.
    await go(page, '/p1');
    expect(await required(page, 'attorney')).toBe(true);
    await go(page, '/p5');
    // "/s/" applied with no name: the name is asked for once, by its own rule.
    await page.evaluate(() => (window as any).GuardianForms.testing.patchFiling({ attorney_signatureState: 'typed', attorney_signatureDate: '2027-01-05' }));
    const messages: string[] = await page.evaluate(async () => ((await (window as any).GuardianForms.testing.validate.open()) || []).map((i: any) => String(i?.message ?? i)));
    expect(messages).toContain('Part V — Attorney Name');
    expect(messages.filter((m) => /Attorney printed name/.test(m)), 'reported once, not again by the "/s/" check').toEqual([]);
  });
});
