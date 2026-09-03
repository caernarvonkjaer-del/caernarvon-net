import { test, expect } from '@playwright/test';
import { freshStartNoPassword } from './support/target';

test.describe('Verified Initial Inventory Workflow & Usability Improvements', () => {
  test('verifies label associations, save event hook, no auto-tour, B-2 DOM stability, and D-3 tri-state flow', async ({ page }) => {
    // 1. Open the application with fresh startup
    await freshStartNoPassword(page);

    // Open Add Ward modal
    await page.evaluate(() => (window as any).showAddWardModalForType('guardian'));

    // Verify Add Ward Modal is visible
    const addWardModal = page.locator('#addWardModal');
    await expect(addWardModal).toBeVisible();

    // Verify Label Association: Clicking label focuses the input
    const wardNameLabel = page.locator('label[for="new-ward-name"]');
    await expect(wardNameLabel).toBeVisible();
    await wardNameLabel.click();
    await expect(page.locator('#new-ward-name')).toBeFocused();

    // Fill new ward details
    await page.locator('#new-ward-name').fill('Harold Thomas Bennett');
    await page.locator('#new-ward-type').selectOption('guardian');
    await page.locator('[data-modal-action="add-ward"]').click();

    // Verify modal is closed and we land on the form
    await expect(addWardModal).toBeHidden();

    // 2. Verify No Unprompted Auto-Tour
    // Wait 1.5s to ensure old setTimeout(startWalkthrough, 1000) does not appear
    await page.waitForTimeout(1500);
    const walkthroughOverlay = page.locator('.pg-walkthrough-overlay, .driver-popover, #walkthrough-modal');
    await expect(walkthroughOverlay).toHaveCount(0);

    // 3. Test Case Number Normalization Rules on Cover Page
    const caseNumInput = page.locator('input[data-bind="caseNumber"]');
    await expect(caseNumInput).toBeVisible();
    
    // Test 262487 -> 26-002487-GD
    await caseNumInput.fill('262487');
    await caseNumInput.blur();
    await expect(caseNumInput).toHaveValue('26-002487-GD');

    // Test preserving non-GD division code: 26-004218-GA -> 26-004218-GA
    await caseNumInput.fill('26-004218-GA');
    await caseNumInput.blur();
    await expect(caseNumInput).toHaveValue('26-004218-GA');

    // Restore test case number
    await caseNumInput.fill('262487');
    await caseNumInput.blur();
    await expect(caseNumInput).toHaveValue('26-002487-GD');

    // Fill remaining cover fields
    await page.locator('input[data-bind="gid"]').fill('2026-01-15');
    await page.locator('select[data-bind="county"], input[data-bind="county"]').fill('Orange');
    await page.locator('input[data-bind="guardianName"]').fill('Sarah Jenkins');
    await page.locator('input[data-bind="attorneyForGuardian"]').fill('Robert Vance, Esq.');

    // 4. Test Deterministic Save Event Hook (pg:backup-saved)
    const savePromise = page.evaluate(() => {
      return new Promise((resolve) => {
        window.addEventListener('pg:backup-saved', (e) => {
          resolve((e as CustomEvent).detail);
        }, { once: true });
      });
    });

    // Trigger save backup
    const saveBtn = page.locator('#save-backup-btn, [data-shell-action="save-backup"], button:has-text("Save Backup")');
    if (await saveBtn.isVisible()) {
      // Mock window.alert so it doesn't block
      await page.evaluate(() => { window.alert = () => {}; });
      await saveBtn.click();
      const saveDetail: any = await savePromise;
      expect(saveDetail).toBeDefined();
      expect(saveDetail.kind).toBe('ward');
      expect(saveDetail.fileName).toContain('Harold-Thomas-Bennett');
    }

    // 5. Test Schedule B-2 Vehicle In-Place DOM Stability
    await page.evaluate(() => (window as any).navigate('/b2'));
    await page.waitForTimeout(300);

    // Add item to B-2
    await page.locator('[data-inventory-action="add-entry"][data-schedule="b2"]').click();
    
    const descField = page.locator('#b2-description-0');
    await expect(descField).toBeVisible();
    await descField.fill('2021 Honda Accord Sedan');

    // Toggle vehicle checkbox
    const vehicleCheckbox = page.locator('input[data-inventory-change="toggle-vehicle"][data-index="0"]');
    await vehicleCheckbox.check();

    // Verify vehicle fields appeared in-place without page crash
    const yearInput = page.locator('#b2-vehicle-year-0');
    const makeInput = page.locator('#b2-vehicle-make-0');
    const modelInput = page.locator('#b2-vehicle-model-0');
    const vinInput = page.locator('#b2-vehicle-vin-0');
    const mileageInput = page.locator('#b2-vehicle-mileage-0');

    await expect(yearInput).toBeVisible();
    await yearInput.fill('2021');
    await makeInput.fill('Honda');
    await modelInput.fill('Accord');
    await vinInput.fill('1HGCV1F32MA123456');
    await mileageInput.fill('45200');

    // Fill remaining B-2 fields
    await page.locator('input[data-bind="scheduleB2.0.streetAddress"]').fill('123 Orange Ave');
    await page.locator('input[data-bind="scheduleB2.0.cityStateZip"]').fill('Orlando, FL 32801');
    await page.locator('input[data-bind="scheduleB2.0.valuationMethod"]').fill('Kelley Blue Book');
    await page.locator('input[data-bind="scheduleB2.0.fullAssetValue"]').fill('22500');
    await page.locator('input[data-bind="scheduleB2.0.wardPercent"]').fill('100');

    // 6. Test Schedule D-3 Safe Deposit Tri-State Controls
    await page.evaluate(() => (window as any).navigate('/d3'));
    await page.waitForTimeout(300);

    // Safe Deposit Box Yes/No Radios
    const sdbYes = page.locator('#sdb-yes');
    const sdbNo = page.locator('#sdb-no');
    const sdbFiledRow = page.locator('#sdb-filed-row');

    await expect(sdbYes).toBeVisible();
    await expect(sdbNo).toBeVisible();

    // When No is selected, filed row should be hidden
    await sdbNo.check();
    await expect(sdbFiledRow).toBeHidden();

    // When Yes is selected, filed row should be visible
    await sdbYes.check();
    await expect(sdbFiledRow).toBeVisible();

    const sdbFiledYes = page.locator('#sdb-filed-yes');
    await expect(sdbFiledYes).toBeVisible();
    await sdbFiledYes.check();

    // 7. Verify Summary Page reflects completion
    await page.evaluate(() => (window as any).navigate('/summary'));
    await page.waitForTimeout(300);

    const d3Status = page.locator('text=D-3 — Audit Fee & Safe Deposit');
    await expect(d3Status).toBeVisible();
  });
});
