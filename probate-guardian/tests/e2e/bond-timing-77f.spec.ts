import { test, expect, type Page } from '@playwright/test';
import { freshStartNoPassword, createWard } from './support/target';

// Milestone 77F: filing before the bond is issued. A guardian worried the app
// expects a bond before the initial reports are filed; her surety won't issue
// one without a court order, and petitioning for one costs the ward. The app
// never expected it (nothing in the bond section blocks filing, 67B), but
// nothing said so. The requester, 2026-10-20, as Pinellas Clerk practice: the
// initial reports may be filed before the bond is issued. The Inventory's
// bond question now says so -- for Pinellas and Pasco filings only
// (county-guidance.js, AGENTS.md section 5), never as statute.

const go = (page: Page, route: string) => page.evaluate((r) => (window as any).GuardianForms.testing.navigate(r), route);
const LINE = "Pinellas and Pasco: the bond doesn't have to be issued before you file this inventory. A surety may need the court's order first; enter the bond here once it is.";

test('the Inventory\'s bond question says the bond may follow the filing, in Pinellas and Pasco only', async ({ page }) => {
  test.setTimeout(120_000);
  await freshStartNoPassword(page);
  await createWard(page, 'Bond Timing Ward', 'guardian');
  for (const [county, shown] of [['Pinellas', true], ['Pasco', true], ['Hillsborough', false], ['', false]] as const) {
    await page.evaluate((c) => (window as any).GuardianForms.testing.patchFiling({ county: c }), county);
    await go(page, '/d4');
    await expect(page.locator('#bondDepositoryState, [data-form-path="bondDepositoryState"]').first(), county || 'blank').toBeAttached();
    const line = page.locator('#main-content [data-bond-timing]');
    if (shown) await expect(line, county).toHaveText(LINE);
    else await expect(line, county || 'blank').toHaveCount(0);
    await go(page, '/');
  }
});
