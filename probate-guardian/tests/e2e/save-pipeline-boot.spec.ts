import { test, expect } from '@playwright/test';
import { freshStartNoPassword, createWard } from './support/target';

// Milestone 40F: startup.spec.ts already asserts a clean console, and it
// passed for the whole life of this bug -- because on a FRESH install initApp()
// blocks at the startup-choice overlay (promptOpenOrStartAtLaunch) and never
// reaches the later startup steps. The crash only occurred once a case
// existed, which is every real user's every load after their first. These
// tests deliberately boot with a case already present.
test.describe('Milestone 40F: startup completes when a case already exists', () => {
  test('no uncaught exception from the save pipeline on a reload with an existing case', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (e) => pageErrors.push(`${e.name}: ${e.message}`));

    await freshStartNoPassword(page);
    await createWard(page, 'Boot Path Ward');

    // The reload is the point: this is the path that runs initApp() all the
    // way through, past the former throw site.
    await page.reload();
    await page.locator('#main-content').waitFor({ state: 'visible' });

    // updateLastSavedIndicator() read an undeclared _lastAutoSavedAt as the
    // fallback arm of a ternary whose guard is false until the first save, so
    // this threw on every load and aborted the rest of initApp().
    const lastAutoSavedErrors = pageErrors.filter((m) => m.includes('_lastAutoSavedAt'));
    expect(lastAutoSavedErrors).toEqual([]);

    // Nothing in the save/export pipeline should throw on this path at all.
    const savePipelineErrors = pageErrors.filter((m) =>
      /_lastExportAt|_autoSaveArmed|updateLastSavedIndicator|loadAutoExportPrefs|setupAutoExportTimer|setupLastSavedTicker|setupFallbackSaveReminder/.test(m)
    );
    expect(savePipelineErrors).toEqual([]);
  });

  test('the last-saved indicator does not claim a backup before any real write', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'Boot Path Ward');

    // No file handle has ever been established in this browser context, so no
    // .sav write can have happened -- the indicator must not imply one. It
    // previously read "Last backup: just now" here, because saveData() stamped
    // its clock before checking for a handle at all.
    const indicator = page.locator('#last-saved-indicator');
    await expect(indicator).not.toContainText('Last backup');
    await expect(indicator).toContainText('Unsaved changes');
  });
});
