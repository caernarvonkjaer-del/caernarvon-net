import { test, expect } from '@playwright/test';
import { freshStartNoPassword, createWard } from './support/target';

// Milestone 33, Phase 2.2 -- Migration Sequence step 3. Organized by field
// behavior, not page ownership, per this milestone's own instruction. Each
// test picks ONE representative filing type/field rather than looping over
// every type: the underlying mechanism (src/core/form/form-contract.js's
// two-phase writeDraftValue/finalizeFieldValue pipeline, and the format
// functions it calls) is confirmed shared and type-agnostic, unlike the
// navigation-status contract's bugs, which were genuinely per-type. This is
// additive to form-entry-ux.spec.ts (dates on Guardian/Annual, Guardian's
// account/notes preserve-policy fields, bounded guidance) and
// annual-mount.spec.ts's rapid Schedule B-2 date test -- not duplicated here.

test.describe('Form entry contract', () => {
  test('a real paste commits the same way typing does', async ({ page, context }) => {
    // form-events.js has no dedicated 'paste' listener -- a paste is only
    // ever exercised via the native 'input' event a real paste produces, the
    // same as typing. Using the actual OS clipboard (via grantPermissions +
    // Ctrl+V) rather than a synthetic ClipboardEvent proves the real
    // browser-native paste path, not just a hand-rolled approximation of one.
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await freshStartNoPassword(page);
    await createWard(page, 'Paste Entry Ward', 'guardian');
    await page.evaluate(() => (window as any).navigate('/a2'));
    await page.locator('[data-inventory-action="add-entry"][data-schedule="a2"]').click();

    const pasteText = "Trustee's note (SNT-2024-778) c/o USAA LLC";
    await page.evaluate((text) => navigator.clipboard.writeText(text), pasteText);

    const notesInput = page.locator('[data-field-path="scheduleA2.0.notes"]');
    await expect(notesInput).toBeVisible();
    await notesInput.click();
    await page.keyboard.press('Control+V');
    await notesInput.blur();

    // Same preserve-policy assertion form-entry-ux.spec.ts already proves
    // for typed entry of this exact string -- pasted entry must match.
    const storedNotes = await page.evaluate(() => (window as any).D.scheduleA2[0].notes);
    expect(storedNotes).toBe(pasteText);
  });

  test('a synthetic compositionend commits a value the same way input does', async ({ page }) => {
    // Playwright has no native IME automation primitive, and nothing else in
    // this suite exercises composition events -- this dispatches a synthetic
    // compositionstart/compositionupdate/compositionend sequence to prove
    // form-events.js's dedicated compositionend listener (writeDraftValue)
    // actually fires and commits, not that a real IME candidate window works.
    await freshStartNoPassword(page);
    await createWard(page, 'Composition Entry Ward', 'guardian');
    await page.evaluate(() => (window as any).navigate('/a2'));
    await page.locator('[data-inventory-action="add-entry"][data-schedule="a2"]').click();

    const notesInput = page.locator('[data-field-path="scheduleA2.0.notes"]');
    await expect(notesInput).toBeVisible();
    await notesInput.evaluate((el: HTMLInputElement) => {
      el.value = 'Composed Value';
      el.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }));
      el.dispatchEvent(new CompositionEvent('compositionupdate', { bubbles: true, data: 'Composed Value' }));
      el.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true, data: 'Composed Value' }));
    });

    const storedNotes = await page.evaluate(() => (window as any).D.scheduleA2[0].notes);
    expect(storedNotes).toBe('Composed Value');
  });

  test('a real Tab keypress commits a field the same way blur does', async ({ page }) => {
    // Every existing test drives finalization via .blur() directly -- none
    // press a real Tab key between two actual filing-form fields. A field
    // losing focus because the user tabbed away must finalize identically.
    await freshStartNoPassword(page);
    await createWard(page, 'Tab Commit Ward', 'planSimplified');
    await page.evaluate(() => (window as any).navigate('/'));

    const wardNameInput = page.locator('[data-form-path="wardName"]');
    await wardNameInput.click();
    await wardNameInput.fill('harold example');
    await page.keyboard.press('Tab');

    await expect(page.locator('[data-form-path="caseNumber"]')).toBeFocused();
    // formatSafeTitleCase capitalizes pure-lowercase words on finalize.
    await expect(wardNameInput).toHaveValue('Harold Example');
    const storedWardName = await page.evaluate(() => (window as any).D.wardName);
    expect(storedWardName).toBe('Harold Example');
  });

  test('rapid multi-field date entry commits every value before immediate navigation, on a Plan type', async ({ page }) => {
    // annual-mount.spec.ts already proves this pattern for Annual's Schedule
    // B-2 dates; plan-fixture.ts (the four Plan types' shared mount tests)
    // never touches date fields at all, so this closes the "zero date-field
    // coverage for any Plan type" gap on real Cover-page fields.
    await freshStartNoPassword(page);
    await createWard(page, 'Rapid Plan Date Ward', 'planAnnual');
    await page.evaluate(() => (window as any).navigate('/'));

    await page.evaluate(() => {
      const values: Record<string, string> = {
        periodFrom: '02/14/2026',
        periodTo: '03/14/2026',
      };
      for (const [path, value] of Object.entries(values)) {
        const input = document.querySelector<HTMLInputElement>(`[data-form-path="${path}"]`)!;
        input.value = value;
        input.dispatchEvent(new Event('input', { bubbles: true }));
      }
      (window as any).navigate('/p2');
    });

    await page.evaluate(() => (window as any).navigate('/'));
    const dates = await page.evaluate(() => ({
      periodFrom: (window as any).D.periodFrom,
      periodTo: (window as any).D.periodTo,
    }));
    expect(dates).toEqual({ periodFrom: '2026-02-14', periodTo: '2026-03-14' });
  });

  test('identifier fields split into two real, distinct policies: normalize vs. preserve', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'Identifier Policy Ward', 'annual');
    await page.evaluate(() => (window as any).navigate('/p5'));

    // Normalize policy: bar number keeps digits only, capped at 6 -- tested
    // nowhere else in this suite (form-entry-ux.spec.ts only covers case
    // number normalization, and only via Guardian's legacy data-bind path).
    const barInput = page.locator('[data-form-path="attorney_bar"]');
    await expect(barInput).toBeVisible();
    await barInput.fill('AB-123456789');
    await barInput.blur();
    expect(await barInput.inputValue()).toBe('123456');

    // Preserve policy on the modern data-field-path pipeline (not Guardian's
    // legacy data-bind path, the only place preserve-policy is proven today).
    await page.evaluate(() => (window as any).navigate('/p4'));
    const preparerNameInput = page.locator('[data-form-path="preparer.name"]');
    await expect(preparerNameInput).toBeVisible();
    await preparerNameInput.fill('McLeod');
    await preparerNameInput.blur();
    // formatSafeTitleCase leaves already-mixed-case names untouched.
    expect(await preparerNameInput.inputValue()).toBe('McLeod');
  });

  test('name and address fields format correctly through the modern pipeline', async ({ page }) => {
    // form-fields.js's inferFieldKind() derives kind purely from label text:
    // "Preparer's Name" -> name (title-case), "...Street Address" -> address
    // (title-case), "...City / State / Zip Code" -> zip (formatCityStateZip,
    // which additionally uppercases the state abbreviation). None of these
    // three have any existing test coverage on the modern pipeline.
    await freshStartNoPassword(page);
    await createWard(page, 'Name Address Format Ward', 'annual');
    await page.evaluate(() => (window as any).navigate('/p4'));

    const nameInput = page.locator('[data-form-path="preparer.name"]');
    await nameInput.fill('jane smith');
    await nameInput.blur();
    expect(await nameInput.inputValue()).toBe('Jane Smith');

    const streetInput = page.locator('[data-form-path="preparer.street"]');
    await streetInput.fill('123 main st');
    await streetInput.blur();
    expect(await streetInput.inputValue()).toBe('123 Main St');

    const cityStateZipInput = page.locator('[data-form-path="preparer.cityStateZip"]');
    await cityStateZipInput.fill('orlando fl 32801');
    await cityStateZipInput.blur();
    expect(await cityStateZipInput.inputValue()).toBe('Orlando FL 32801');
  });

  test('an invalid date blocks export immediately, without a reload', async ({ page }) => {
    // The reload-and-still-blocked half of this behavior (Phase 2.4's
    // "invalid input preservation and output blocking") lives in
    // persistence-recovery.contract.spec.ts -- reopening a saved file is
    // fundamentally a persistence action. This proves the live-session half.
    await freshStartNoPassword(page);
    await createWard(page, 'Live Block Ward', 'guardian');
    await page.evaluate(() => (window as any).navigate('/'));

    const gidInput = page.locator('[data-field-path="gid"]');
    await gidInput.fill('02/14/26'); // 2-digit year, rejected
    await gidInput.blur();
    await expect(gidInput).toHaveAttribute('aria-invalid', 'true');

    await page.evaluate(() => (window as any).navigate('/print'));
    let alertMessage = '';
    page.once('dialog', (d) => { alertMessage = d.message(); d.accept(); });
    await page.locator('[data-inventory-action="save-pdf"]').evaluate((button: HTMLButtonElement) => {
      button.disabled = false;
      button.click();
    });
    await page.waitForTimeout(500);
    expect(alertMessage).toContain('Cannot export');
  });
});
