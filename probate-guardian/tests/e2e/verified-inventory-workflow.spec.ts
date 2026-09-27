import { test, expect, type Page } from '@playwright/test';
import { freshStartNoPassword } from './support/target';
import { dismissScheduleDocPrompt } from './support/target';

// Milestone 43D: split from one mega-test covering six unrelated concerns
// (label associations, guided-tour absence, case-number normalization, the
// save-event hook, Schedule B-2 DOM stability, D-3 tri-state radio flow) into
// six independently-reportable tests, so one failure doesn't mask the other
// five's results. `openGuardianWard` factors the setup every one of them
// needs (fresh start, Add Ward modal, land on the form).
async function openGuardianWard(page: Page, name: string) {
  await freshStartNoPassword(page);
  await page.evaluate(() => (window as any).GuardianForms.testing.createFiling.openDialog('guardian'));
  const addWardModal = page.locator('#addWardModal');
  await expect(addWardModal).toBeVisible();
  await page.locator('#new-ward-name').fill(name);
  await page.locator('#new-ward-type').selectOption('guardian');
  await page.locator('[data-modal-action="add-ward"]').click();
  await expect(addWardModal).toBeHidden();
}

test.describe('Verified Initial Inventory Workflow & Usability Improvements', () => {
  test('label associations: clicking the Add Ward modal label focuses its input, and the landed form has no duplicate or empty visible labels', async ({ page }) => {
    await freshStartNoPassword(page);
    await page.evaluate(() => (window as any).GuardianForms.testing.createFiling.openDialog('guardian'));
    const addWardModal = page.locator('#addWardModal');
    await expect(addWardModal).toBeVisible();

    const wardNameLabel = page.locator('label[for="new-ward-name"]');
    await expect(wardNameLabel).toBeVisible();
    await wardNameLabel.click();
    await expect(page.locator('#new-ward-name')).toBeFocused();

    await page.locator('#new-ward-name').fill('Harold Thomas Bennett');
    await page.locator('#new-ward-type').selectOption('guardian');
    await page.locator('[data-modal-action="add-ward"]').click();
    await expect(addWardModal).toBeHidden();

    const labelAudit = await page.evaluate(() => ({
      duplicateLabels: [...document.querySelectorAll('label[for]')]
        .filter(label => label.querySelector('input, select, textarea')).length,
      emptyVisibleLabels: [...document.querySelectorAll('label')]
        .filter(label => label.getClientRects().length > 0 && !label.textContent?.trim()).length,
    }));
    expect(labelAudit.duplicateLabels).toBe(0);
    expect(labelAudit.emptyVisibleLabels).toBe(0);
  });

  test('no unprompted auto-tour on landing', async ({ page }) => {
    await openGuardianWard(page, 'Harold Thomas Bennett');

    // Commit cab6b67 removed handleHash()'s setTimeout(startWalkthrough, 1000)
    // (guarded by !walkthroughCompleted && !firstLaunchSeen); there is no
    // event for an absence, so this waits 500ms past that timer's own delay
    // to catch a regression that reintroduces it.
    await page.waitForTimeout(1500);
    // #walkthrough-overlay/.active is the current implementation (see
    // guided-tour-navigation.spec.ts) -- the previous selectors here
    // (.pg-walkthrough-overlay, .driver-popover, #walkthrough-modal) matched
    // no element in the current app at all, so this assertion would have
    // passed trivially even if the auto-tour timer above were reintroduced.
    const walkthroughOverlay = page.locator('#walkthrough-overlay.active, .pg-walkthrough-overlay, .driver-popover, #walkthrough-modal');
    await expect(walkthroughOverlay).toHaveCount(0);
  });

  test('case number normalization rules on the Cover page', async ({ page }) => {
    await openGuardianWard(page, 'Harold Thomas Bennett');

    const caseNumInput = page.locator('input[data-bind="caseNumber"]');
    await expect(caseNumInput).toBeVisible();

    // 262487 -> 26-002487-GD
    await caseNumInput.fill('262487');
    await caseNumInput.blur();
    await expect(caseNumInput).toHaveValue('26-002487-GD');

    // Preserves a non-GD division code: 26-004218-GA -> 26-004218-GA
    await caseNumInput.fill('26-004218-GA');
    await caseNumInput.blur();
    await expect(caseNumInput).toHaveValue('26-004218-GA');

    await caseNumInput.fill('262487');
    await caseNumInput.blur();
    await expect(caseNumInput).toHaveValue('26-002487-GD');
  });

  test('deterministic save event hook (pg:backup-saved) fires with the expected filename', async ({ page }) => {
    await openGuardianWard(page, 'Harold Thomas Bennett');
    await page.locator('input[data-bind="gid"]').fill('2026-01-15');
    await page.locator('select[data-bind="county"], input[data-bind="county"]').fill('Orange');
    await page.locator('input[data-bind="guardianName"]').fill('Sarah Jenkins');
    await page.locator('input[data-bind="attorneyForGuardian"]').fill('Robert Vance, Esq.');

    // Milestone 41B relabeled the sidebar's backup-all-wards button "Save
    // Backup (.sav)" -- the same text the auto-export-reminder toast's own
    // save-backup button already used, so a text-based OR-selector here now
    // matches both. Target the sidebar action specifically.
    const saveBtn = page.locator('[data-shell-action="backup-all-wards"]');
    if (await saveBtn.isVisible()) {
      // Registered only once the button is confirmed visible, so a
      // not-visible button (this `if` guard's whole point) never leaves an
      // unawaited page.evaluate() listener dangling into test teardown.
      const savePromise = page.evaluate(() => {
        return new Promise((resolve) => {
          window.addEventListener('pg:backup-saved', (e) => {
            resolve((e as CustomEvent).detail);
          }, { once: true });
        });
      });
      // Mock window.alert so it doesn't block
      await page.evaluate(() => { window.alert = () => {}; });
      await saveBtn.click();
      const saveDetail: any = await savePromise;
      expect(saveDetail).toBeDefined();
      // Under the unified case-file model, the first save of a brand-new
      // case defaults to a generic filename -- there is no more per-ward
      // naming convention for the PRIMARY save file (only the separate
      // single-ward "share a copy" export still names itself after the ward).
      expect(saveDetail.fileName).toBe('guardianshipwarddata.sav');
    }
  });

  test('Schedule B-2 vehicle fields appear in-place without a page crash', async ({ page }) => {
    await openGuardianWard(page, 'Harold Thomas Bennett');
    await page.evaluate(() => (window as any).GuardianForms.testing.navigate('/b2'));

    await page.locator('[data-inventory-action="add-entry"][data-schedule="b2"]').click();
    await dismissScheduleDocPrompt(page); // Milestone 57C-R advisory modal

    const descField = page.locator('#b2-description-0');
    await expect(descField).toBeVisible();
    await descField.fill('2021 Honda Accord Sedan');

    const vehicleCheckbox = page.locator('input[data-inventory-change="toggle-vehicle"][data-index="0"]');
    await vehicleCheckbox.check();

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

    await page.locator('input[data-bind="scheduleB2.0.streetAddress"]').fill('123 Orange Ave');
    await page.locator('input[data-bind="scheduleB2.0.cityStateZip"]').fill('Orlando, FL 32801');
    await page.locator('input[data-bind="scheduleB2.0.valuationMethod"]').fill('Kelley Blue Book');
    await page.locator('input[data-bind="scheduleB2.0.fullAssetValue"]').fill('22500');
    await page.locator('input[data-bind="scheduleB2.0.wardPercent"]').fill('100');
  });

  test('Schedule D-3 Safe Deposit Box tri-state flow, reflected on the Summary page', async ({ page }) => {
    await openGuardianWard(page, 'Harold Thomas Bennett');
    await page.evaluate(() => (window as any).GuardianForms.testing.navigate('/d3'));

    const sdbGroup = page.locator('fieldset[data-yes-no-group="hasSafeDepositBox"]');
    const sdbYes = sdbGroup.locator('input[type="radio"][value="Yes"]');
    const sdbNo = sdbGroup.locator('input[type="radio"][value="No"]');
    const sdbFiledRow = page.locator('#sdb-filed-row');

    await expect(sdbYes).toBeVisible();
    await expect(sdbNo).toBeVisible();

    // When No is selected, filed row should be hidden
    await sdbNo.check();
    await expect(sdbFiledRow).toBeHidden();

    // When Yes is selected, filed row should be visible
    await sdbYes.check();
    await expect(sdbFiledRow).toBeVisible();

    const sdbFiledYes = page.locator('fieldset[data-yes-no-group="safeDepositBoxFiled"] input[type="radio"][value="Yes"]');
    await expect(sdbFiledYes).toBeVisible();
    await sdbFiledYes.check();

    // Summary page reflects completion.
    await page.evaluate(() => (window as any).GuardianForms.testing.navigate('/summary'));
    const d3Status = page.locator('text=D-3 — Audit Fee & Safe Deposit');
    await expect(d3Status).toBeVisible();
  });

  // Milestone 64A-1, item 4.1. The Summary page's "Part V -- Audit Fee &
  // Bond Calculation" box lists Restricted/Unrestricted Cash and
  // Intangibles by dollar figure, but its "Personal Property (B-2)" line
  // has always been a hardcoded blank (index.js's rightCards line had
  // `value:''`, no binding) -- so a filer with $22,500 of B-2 personal
  // property sees that line rendered empty next to five sibling lines that
  // all show a figure, with no way to tell from the Summary page whether
  // entered B-2 data ever reached the calculation at all. The schedule-link
  // value already on the same page (#totalB2, "Schedule B-2 -- Personal
  // Property Assets") already computes the correct figure from the same
  // calc.totalB2(); the fix binds the Part V line to the same value rather
  // than hand-coding the expected string.
  test('Summary page Part V box shows the Personal Property (B-2) total, not a blank line', async ({ page }) => {
    await openGuardianWard(page, 'Harold Thomas Bennett');
    await page.evaluate(() => (window as any).GuardianForms.testing.navigate('/b2'));
    await page.locator('[data-inventory-action="add-entry"][data-schedule="b2"]').click();
    await dismissScheduleDocPrompt(page);
    await page.locator('#b2-description-0').fill('Household furnishings');
    await page.locator('input[data-bind="scheduleB2.0.fullAssetValue"]').fill('22500');
    await page.locator('input[data-bind="scheduleB2.0.wardPercent"]').fill('100');

    await page.evaluate(() => (window as any).GuardianForms.testing.navigate('/summary'));
    const provenTotal = await page.locator('#totalB2').innerText();
    expect(provenTotal).not.toBe('');

    const partVLine = page.locator('#personalPropertyB2Home');
    await expect(partVLine).toBeVisible();
    await expect(partVLine).toHaveText(provenTotal);
  });
});
