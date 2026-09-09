import { expect, test } from '@playwright/test';
import { createWard, freshStartNoPassword } from './support/target';

test.describe('Milestone 24: Form Entry UX, Dates, Preservation, and Guidance', () => {
  test('forgiving date normalization and invalid date retention', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'Harold Test Ward', 'guardian');

    // Find GID date field on cover page
    const gidInput = page.locator('[data-field-path="gid"]');
    await expect(gidInput).toBeVisible();

    // 1. Enter flexible date: Feb 14, 2026
    await gidInput.fill('Feb 14, 2026');
    // Raw typing stays in DOM before blur
    expect(await gidInput.inputValue()).toBe('Feb 14, 2026');

    // Trigger blur
    await gidInput.blur();

    // On blur: display formatted as 02/14/2026, model stored as 2026-02-14
    await expect(gidInput).toHaveValue('02/14/2026');
    const storedGid = await page.evaluate(() => (window as any).D.gid);
    expect(storedGid).toBe('2026-02-14');
    expect(await gidInput.getAttribute('aria-invalid')).toBeNull();

    // 2. Enter 2-digit year (rejected per court rules)
    await gidInput.fill('02/14/26');
    await gidInput.blur();

    // Invalid date retains raw text, marks aria-invalid="true", and preserves
    // the last valid canonical value so a mistyped date cannot silently erase
    // data before the blocking export check is resolved.
    await expect(gidInput).toHaveValue('02/14/26');
    await expect(gidInput).toHaveAttribute('aria-invalid', 'true');
    const invalidStoredGid = await page.evaluate(() => (window as any).D.gid);
    expect(invalidStoredGid).toBe('2026-02-14');
  });

  test('non-destructive identifier and punctuation preservation', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, "Harold O'Connor-Smith", 'guardian');

    // Name with apostrophe and hyphen preserved
    const storedWardName = await page.evaluate(() => (window as any).D.wardName);
    expect(storedWardName).toBe("Harold O'Connor-Smith");

    // Navigate to A-2 schedule
    await page.evaluate(() => (window as any).navigate('/a2'));
    const addBtn = page.locator('[data-inventory-action="add-entry"][data-schedule="a2"]');
    await expect(addBtn).toBeVisible();
    await addBtn.click();

    // Fill account number: "CHK-104A/2026-USAA"
    const acctInput = page.locator('[data-field-path="scheduleA2.0.accountNumber"]');
    await expect(acctInput).toBeVisible();
    await acctInput.fill('CHK-104A/2026-USAA');
    await acctInput.blur();

    // Value must preserve dashes, slashes, and uppercase acronyms
    const storedAcct = await page.evaluate(() => (window as any).D.scheduleA2[0].accountNumber);
    expect(storedAcct).toBe('CHK-104A/2026-USAA');

    // Fill notes: "Trustee's note (SNT-2024-778) c/o USAA LLC"
    const notesInput = page.locator('[data-field-path="scheduleA2.0.notes"]');
    await expect(notesInput).toBeVisible();
    await notesInput.fill("Trustee's note (SNT-2024-778) c/o USAA LLC");
    await notesInput.blur();

    const storedNotes = await page.evaluate(() => (window as any).D.scheduleA2[0].notes);
    expect(storedNotes).toBe("Trustee's note (SNT-2024-778) c/o USAA LLC");
  });

  test('bounded local section guidance and jump-to-field interaction', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'Test Section Guidance Ward', 'guardian');

    // Navigate to A-1 schedule without items or checkbox
    await page.evaluate(() => (window as any).navigate('/a1'));
    const addBtn = page.locator('[data-inventory-action="add-entry"][data-schedule="a1"]');
    await expect(addBtn).toBeVisible();

    // Next button should be disabled and guidance visible
    const nextBtn = page.locator('#page-next-btn');
    await expect(nextBtn).toBeDisabled();

    const guidance = page.locator('#page-local-guidance');
    await expect(guidance).toBeVisible();
    await expect(guidance).toContainText('Add at least one entry, or check the box verifying there are none');

    // Add an entry with empty required fields to test field-level jump links
    await addBtn.click();

    // Check guidance has jump links
    const jumpBtn = page.locator('[data-form-action="jump-to-field"]').first();
    await expect(jumpBtn).toBeVisible();
    await jumpBtn.click();

    // Target input should be focused
    const focusedPath = await page.evaluate(() => (document.activeElement as HTMLElement)?.dataset?.fieldPath);
    expect(focusedPath).toBeTruthy();
  });

  test('screen reader live region status announcements for PDF preview', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'Preview Live Region Ward', 'guardian');

    // Navigate to /print
    await page.evaluate(() => (window as any).navigate('/print'));
    await expect(page.locator('[data-inventory-action="save-pdf"]')).toBeVisible();

    // Live region should exist with role="status" and aria-live="polite"
    const liveRegion = page.locator('#print-preview-status');
    await expect(liveRegion).toBeAttached();
    await expect(liveRegion).toHaveAttribute('role', 'status');
    await expect(liveRegion).toHaveAttribute('aria-live', 'polite');
    await expect(liveRegion).toContainText('Preview ready.');
  });

  test('8-digit unpunctuated date input auto-masks on typing and commits valid canonical date on blur across forms', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'Harold Annual Date Ward', 'annual');

    // On Annual Accounting cover page. data-form-path (not data-field-path)
    // is used here because a disabled-Next guidance jump-to-field button can
    // also carry data-field-path="periodFrom" on a blank Cover page (Annual's
    // Cover-gate bug fix means guidance now legitimately renders there) --
    // data-form-path is unique to the real input.
    const periodFromInput = page.locator('[data-form-path="periodFrom"]');
    const periodToInput = page.locator('[data-form-path="periodTo"]');
    await expect(periodFromInput).toBeVisible();
    await expect(periodToInput).toBeVisible();

    // Type 8 unpunctuated digits: 07102026 into Period From
    await periodFromInput.focus();
    await periodFromInput.fill('07102026');
    // Instantly formatted to 07/10/2026 live
    await expect(periodFromInput).toHaveValue('07/10/2026');
    await periodFromInput.blur();
    await expect(periodFromInput).toHaveValue('07/10/2026');
    expect(await periodFromInput.getAttribute('aria-invalid')).toBeNull();

    // Type 8 unpunctuated digits: 07102027 into Period To
    await periodToInput.focus();
    await periodToInput.fill('07102027');
    await expect(periodToInput).toHaveValue('07/10/2027');
    await periodToInput.blur();
    await expect(periodToInput).toHaveValue('07/10/2027');
    expect(await periodToInput.getAttribute('aria-invalid')).toBeNull();

    // Verify stored canonical state in window.D
    const storedState = await page.evaluate(() => ({
      from: (window as any).D.periodFrom,
      to: (window as any).D.periodTo,
    }));
    expect(storedState.from).toBe('2026-07-10');
    expect(storedState.to).toBe('2027-07-10');
  });
});
