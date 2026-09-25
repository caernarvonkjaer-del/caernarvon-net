import { test, expect } from '@playwright/test';
import { freshStartNoPassword, createWard } from './support/target';

// Milestone 52J Decision 4: onWardSelectorKeydown()'s full Up/Down/Home/
// End/Enter implementation (with aria-activedescendant/aria-selected
// bookkeeping) is now shared, via bindComboboxKeyboardNav(), by the ward
// selector, the "Add Ward" modal's ward-name combobox, and the "Convert
// Ward" modal's source combobox. Before this delivery, the latter two had
// Escape only (plus a bare preventDefault on Enter for convert-source) --
// a keyboard-only or screen-reader user could not pick a suggestion from
// either without a mouse, despite both already carrying role="combobox"
// ARIA markup that promised otherwise (Milestone 50H). No prior e2e
// coverage exercised keyboard navigation on any of the three.
//
// The county combobox (Cover page) is deliberately excluded from this
// file: it already had full keyboard nav before 52J and was not switched
// to the shared handler (see legacy-app.js's bindComboboxKeyboardNav()
// comment and MILESTONE-52-PROPOSAL.md's 52J section for why) -- its own
// existing coverage is unaffected by this delivery.

test.describe('Combobox keyboard navigation (Milestone 52J)', () => {
  test('ward selector: Home/End/Arrow navigation and Enter switches the ward, unchanged from before this delivery', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'Alpha Ward', 'guardian');
    await createWard(page, 'Beta Ward', 'annual');

    const selector = page.locator('#ward-selector');
    await selector.click();
    await expect(page.locator('#ward-selector-dropdown [role="option"]').first()).toBeVisible();

    await selector.press('End');
    await expect(selector).toHaveAttribute('aria-activedescendant', /ward-selector-option-/);
    const lastId = await selector.getAttribute('aria-activedescendant');

    await selector.press('Home');
    const firstId = await selector.getAttribute('aria-activedescendant');
    expect(firstId).not.toBe(lastId);

    await selector.press('ArrowDown');
    const secondId = await selector.getAttribute('aria-activedescendant');
    expect(secondId).not.toBe(firstId);

    await selector.press('Enter');
    await expect(page.locator('#ward-selector-dropdown')).toBeHidden();
    // Enter on the highlighted option switches the filing outright
    // (unqualified today per Milestone 43's own switchWard() call).
    const active = await page.evaluate(() => (window as any).GuardianForms.testing.snapshot().filing?.wardName);
    expect(['Alpha Ward', 'Beta Ward']).toContain(active);
  });

  test('Add Ward modal: ward-name combobox gains Home/End/Arrow navigation it did not have before this delivery', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'Alpha Existing Ward', 'guardian');
    await createWard(page, 'Beta Existing Ward', 'annual');

    // The dashboard's own New Filing button.
    await page.evaluate(() => (window as any).GuardianForms.testing.navigate('/dashboard'));
    await page.locator('[data-dashboard-action="add-ward"]').first().click();
    await page.locator('#addWardModal.show').waitFor({ state: 'visible' });

    const input = page.locator('#new-ward-name');
    await expect(input).toHaveAttribute('role', 'combobox');
    await expect(input).toHaveAttribute('aria-controls', 'new-ward-name-dropdown');
    await input.click();
    await expect(page.locator('#new-ward-name-dropdown [role="option"]').first()).toBeVisible();

    await input.press('ArrowDown');
    await expect(input).toHaveAttribute('aria-activedescendant', /new-ward-name-dropdown-option-/);
    const firstId = await input.getAttribute('aria-activedescendant');

    await input.press('End');
    const lastId = await input.getAttribute('aria-activedescendant');
    expect(lastId).not.toBe(firstId);

    await input.press('Home');
    const homeId = await input.getAttribute('aria-activedescendant');
    expect(homeId).toBe(firstId);

    await input.press('Enter');
    await expect(page.locator('#new-ward-name-dropdown')).toBeHidden();
    await expect(input).toHaveValue('Alpha Existing Ward');
  });

  test('Convert Ward modal: source combobox gains Home/End/Arrow navigation it did not have before this delivery', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'Alpha Convert Source', 'guardian');
    await createWard(page, 'Beta Convert Source', 'annual');

    // The dashboard's own New Filing from Existing button.
    await page.evaluate(() => (window as any).GuardianForms.testing.navigate('/dashboard'));
    await page.locator('[data-dashboard-action="select-existing"]').first().click();
    await page.locator('#convertWardModal.show').waitFor({ state: 'visible' });

    const input = page.locator('#convert-source-ward');
    await expect(input).toHaveAttribute('role', 'combobox');
    await expect(input).toHaveAttribute('aria-controls', 'convert-source-ward-dropdown');
    await input.click();
    await expect(page.locator('#convert-source-ward-dropdown [role="option"]').first()).toBeVisible();

    await input.press('ArrowDown');
    await expect(input).toHaveAttribute('aria-activedescendant', /convert-source-ward-dropdown-option-/);
    const firstId = await input.getAttribute('aria-activedescendant');

    await input.press('ArrowDown');
    const secondId = await input.getAttribute('aria-activedescendant');
    expect(secondId).not.toBe(firstId);

    await input.press('Home');
    const homeId = await input.getAttribute('aria-activedescendant');
    expect(homeId).toBe(firstId);

    await input.press('Enter');
    await expect(page.locator('#convert-source-ward-dropdown')).toBeHidden();
    expect(await input.inputValue()).toBeTruthy();
  });
});
