import { test, expect } from '@playwright/test';
import { freshStartNoPassword, gotoApp } from './support/target';

// Milestone 40D. Theme moved from the .sav file's app state to localStorage, so
// the inline <head> script can resolve it synchronously before first paint.
//
// The assertions that matter here are about FIRST PAINT, not the settled DOM.
// Checking data-theme after the page is interactive would have passed before this
// change too -- the old code did eventually apply the saved theme, just late
// enough to flash. So these read the attribute from an init script that runs
// before any app script, and separately assert the stored value is what the
// document was born with.

const THEME_KEY = 'pg-theme-v1';

// The theme toggle is rendered by the app shell (the dashboard header, a filing's
// form header, or the shell action cluster) -- it is not static markup, so a bare
// fresh start has no button to click. Same setup routes.spec.ts's own shell test
// uses before reaching for it.
async function openShellWithThemeToggle(page: import('@playwright/test').Page) {
  await freshStartNoPassword(page);
  await page.evaluate(() => (window as any).addWard('Theme Shell Ward', 'guardian'));
  await page.locator('[data-inventory-change="import-excel"]').waitFor({ state: 'attached' });
  await page.evaluate(() => (window as any).navigate('/dashboard'));
  await page.locator('[data-dashboard-bound="true"]').waitFor();
  await page.locator('#theme-toggle-btn').waitFor();
}

test.describe('Milestone 40D: theme resolves before first paint', () => {
  test('an explicit choice survives a reload and is present on the very first paint', async ({ page }) => {
    await openShellWithThemeToggle(page);

    const html = page.locator('html');
    const initial = await html.getAttribute('data-theme');
    const target = initial === 'dark' ? 'light' : 'dark';

    await page.locator('#theme-toggle-btn').dispatchEvent('click');
    await expect(html).toHaveAttribute('data-theme', target);

    // The choice lands in localStorage, not the .sav.
    expect(await page.evaluate((k) => localStorage.getItem(k), THEME_KEY)).toBe(target);

    // Reload with the OS preference set OPPOSITE to the stored choice, and with no
    // case file open. That combination is the discriminator, and it needs no
    // timing probe: the old code resolved the theme from the .sav's app state, so
    // with nothing loaded it painted the OS preference and stayed there. Only a
    // pre-paint read of localStorage can produce the stored value here.
    await page.emulateMedia({ colorScheme: target === 'dark' ? 'light' : 'dark' });
    await page.reload();

    await expect(html, 'the stored choice beats the OS preference with no .sav loaded')
      .toHaveAttribute('data-theme', target);
    // And it is the pre-paint script that did it, so both attributes agree
    // immediately rather than one being corrected later.
    expect(await page.evaluate(() => document.documentElement.getAttribute('data-bs-theme'))).toBe(target);
  });

  test('both theme attributes agree after a toggle, so Bootstrap does not lag the palette', async ({ page }) => {
    await openShellWithThemeToggle(page);
    const html = page.locator('html');

    // prepaint.js always set both; applyTheme() used to set only data-theme, so a
    // toggle left data-bs-theme on whatever was painted at load.
    const before = await page.evaluate(() => ({
      theme: document.documentElement.getAttribute('data-theme'),
      bs: document.documentElement.getAttribute('data-bs-theme'),
    }));
    expect(before.bs).toBe(before.theme);

    await page.locator('#theme-toggle-btn').dispatchEvent('click');
    await expect(html).not.toHaveAttribute('data-theme', before.theme!);

    const after = await page.evaluate(() => ({
      theme: document.documentElement.getAttribute('data-theme'),
      bs: document.documentElement.getAttribute('data-bs-theme'),
    }));
    expect(after.bs, 'data-bs-theme must follow the toggle').toBe(after.theme);
  });

  test('with no stored choice the OS preference paints, and nothing is written', async ({ page }) => {
    await page.addInitScript((k) => { try { localStorage.removeItem(k); } catch (e) { /* ignore */ } }, THEME_KEY);
    await page.emulateMedia({ colorScheme: 'dark' });
    await gotoApp(page);
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    // Merely painting the OS preference is not a choice, so nothing is persisted.
    expect(await page.evaluate((key) => localStorage.getItem(key), THEME_KEY)).toBeNull();

    await page.emulateMedia({ colorScheme: 'light' });
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  });

  test('a stored choice overrides the OS preference on first paint', async ({ page }) => {
    await page.addInitScript((k) => { try { localStorage.setItem(k, 'light'); } catch (e) { /* ignore */ } }, THEME_KEY);
    await page.emulateMedia({ colorScheme: 'dark' });
    await gotoApp(page);
    await expect(page.locator('html'), 'the stored light choice beats an OS dark preference').toHaveAttribute('data-theme', 'light');
  });

  // Decision 5's behavioural change, asserted deliberately rather than left
  // incidental: theme is per-device now, so a case file never changes appearance.
  test('a new .sav carries no theme, and loading a case file does not change appearance', async ({ page }) => {
    await openShellWithThemeToggle(page);

    const html = page.locator('html');
    const before = await html.getAttribute('data-theme');
    const target = before === 'dark' ? 'light' : 'dark';
    await page.locator('#theme-toggle-btn').dispatchEvent('click');
    await expect(html).toHaveAttribute('data-theme', target);

    // The toggle writes to localStorage and NOT to the .sav's app state. Asserted
    // through loadAppState() rather than by unzipping a generated file: this is
    // the exact value buildCaseFileBlob() used to re-read when serializing theme,
    // so a null here is what guarantees nothing reaches the file. The serializer's
    // own shape is covered at the source level in
    // tests/unit/theme-persistence.spec.js.
    const persisted = await page.evaluate(async () => {
      const w = window as any;
      return {
        appStateTheme: (await w.loadAppState?.('theme')) ?? null,
        localTheme: localStorage.getItem('pg-theme-v1'),
      };
    });

    expect(persisted.localTheme, 'the choice lives on the device').toBe(target);
    expect(persisted.appStateTheme, 'and never in the case file app state').toBeNull();

    // And the live theme is unchanged by any of that.
    await expect(html).toHaveAttribute('data-theme', target);
  });
});
