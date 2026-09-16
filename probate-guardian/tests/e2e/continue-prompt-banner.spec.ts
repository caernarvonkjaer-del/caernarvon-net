import { test, expect } from '@playwright/test';
import { gotoApp, startNewCase, chooseNoPassword, freshStartNoPassword, createWard, exportAndCapture } from './support/target';

// Milestone 52A: getRecentlyOpenedWards, addToRecentlyOpened, and
// formatRelativeTime were all reachable in source but never bridged onto
// window, so dashboard/index.js's showContinuePromptIfNeeded() threw the
// instant it ran (getRecentlyOpenedWards is not a function), and the
// ward-lifecycle.js call to addToRecentlyOpened had been silently
// unreachable since Milestone 27. No spec exercised any of this chain.
// See MILESTONE-52-PROPOSAL.md's 52A section for the full trace.

test.describe('continue-prompt banner (Milestone 52A)', () => {
  test('activating a ward adds it to the recently-opened list', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'Recent Ward One', 'guardian');

    const recent = await page.evaluate(() => (window as any).getRecentlyOpenedWards());
    expect(recent).toHaveLength(1);
    expect(recent[0]).toMatchObject({ wardName: 'Recent Ward One', inventoryType: 'guardian' });
  });

  test('dashboard renders the banner with a real relative time, no crash', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

    await freshStartNoPassword(page);
    await createWard(page, 'Banner Ward', 'guardian');
    // enterDashboardEditingFocus() (called by unloadWard()) is what actually
    // clears caseFile.activeWardId -- navigate('/dashboard') alone does not
    // -- and that's what makes last.wardId !== caseFile.activeWardId true so
    // the banner shows.
    await page.evaluate(() => (window as any).unloadWard());

    const banner = page.locator('#continue-prompt-banner');
    await expect(banner).toBeVisible();
    await expect(banner.locator('.continue-prompt-ward-name')).toHaveText('Banner Ward');
    await expect(banner.locator('.continue-prompt-meta')).toContainText(/just now|minute|hour|day/);
    // The dashboard grid/summary/sidebar below the banner must still render --
    // this was the original defect: the whole render died on the first line.
    await expect(page.locator('#main-content')).not.toBeEmpty();

    expect(errors, `console/page errors rendering the continue-prompt banner: ${errors.join('\n')}`).toEqual([]);
  });

  test('the banner does not reappear on a later dashboard visit in the same session', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'Once Only Ward', 'guardian');
    await page.evaluate(() => (window as any).unloadWard());
    await expect(page.locator('#continue-prompt-banner')).toBeVisible();
    expect(await page.evaluate(() => (window as any).isContinuePromptShown())).toBe(true);

    await createWard(page, 'Second Ward', 'guardian');
    await page.evaluate(() => (window as any).unloadWard());

    await expect(page.locator('#continue-prompt-container')).toBeEmpty();
  });

  test('an exported and reopened case does not re-show the banner for the same ward pairing', async ({ browser }) => {
    const context = await browser.newContext();
    let savPath = '';
    try {
      const page = await context.newPage();
      await gotoApp(page);
      await startNewCase(page);
      await chooseNoPassword(page);
      await createWard(page, 'Persisted Banner Ward', 'guardian');
      await page.evaluate(() => (window as any).unloadWard());
      await expect(page.locator('#continue-prompt-banner')).toBeVisible();

      savPath = await exportAndCapture(page);
    } finally {
      await context.close();
    }

    const reopenContext = await browser.newContext();
    try {
      const reopenPage = await reopenContext.newPage();
      await gotoApp(reopenPage);
      await reopenPage.locator('#startup-choice-overlay.show').waitFor({ state: 'visible' });
      await reopenPage.setInputFiles('#startup-open-input', savPath);
      await expect(reopenPage.locator('#startup-choice-overlay')).not.toHaveClass(/show/);

      // 38C lands a reopened file on /dashboard with no active editor, which
      // is exactly where showContinuePromptIfNeeded() runs as part of mount.
      await expect(reopenPage.locator('#continue-prompt-container')).toBeEmpty();
      expect(await reopenPage.evaluate(() => (window as any).isContinuePromptShown())).toBe(true);
    } finally {
      await reopenContext.close();
    }
  });
});
