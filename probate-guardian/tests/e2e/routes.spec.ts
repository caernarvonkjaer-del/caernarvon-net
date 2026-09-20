// Milestone 43D (Decision 4, option b): despite its name, most of this
// file's bulk is dashboard shell UI -- triage rows/queue, archive/closed
// disclosure, sidebar nav accordion, inline-event-handler audits, dark-mode
// toggle -- with route-table/mount coverage proper as a smaller share.
// Pure organization, no correctness defect, left as one file with its scope
// named here rather than split into routes.spec.ts/dashboard-shell-ui.spec.ts.
import { test, expect } from '@playwright/test';
import { freshStartNoPassword, assertNoInlineEventHandlers } from './support/target';

// One smoke test per filing type, per Milestone 1's scoped safety net (not
// exhaustive per-schedule coverage -- that's a later milestone). Uses
// addWard(name, inventoryType) directly (index.html:5266) rather than
// driving each type's Add Ward modal/eligibility screen, since those UI
// paths are a separate concern from "does this filing type's page render."
const INVENTORY_TYPES = [
  'guardian',
  'simplified',
  'annual',
  'finalAccounting',
  'trustAccounting',
  'planSimplified',
  'planAnnual',
  'planInitial',
  'planMinor',
];

test.describe('routes', () => {
  for (const type of INVENTORY_TYPES) {
    test(`${type} ward renders its cover page with no console errors`, async ({ page }) => {
      const errors: string[] = [];
      page.on('pageerror', (e) => errors.push(e.message));
      page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

      await freshStartNoPassword(page);
      await page.evaluate((t) => (window as any).addWard('Route Smoke Test Ward', t), type);

      const main = page.locator('#main-content');
      await expect(main).not.toBeEmpty();
      const text = await main.innerText();
      expect(text.trim().length).toBeGreaterThan(0);
      expect(errors, `console/page errors while rendering ${type}: ${errors.join('\n')}`).toEqual([]);
    });
  }

  test('dashboard renders once a ward exists, with no console errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

    await freshStartNoPassword(page);
    await page.evaluate(() => (window as any).addWard('Dashboard Smoke Test Ward', 'guardian'));
    await page.locator('[data-inventory-change="import-excel"]').waitFor({ state: 'attached' });
    await page.evaluate(() => (window as any).navigate('/dashboard'));

    await expect(page).toHaveURL(/#\/dashboard/);
    await expect(page.locator('#main-content')).toContainText('Dashboard Smoke Test Ward');
    expect(errors).toEqual([]);
  });

  // Milestone 38C cleared activeWardId/window.D on dashboard entry so the
  // ward lock would release from every navigation path, not just the sidebar's
  // own Close Ward button -- but updateSidebar() itself was never taught to
  // blank the per-filing context strip and nav checklist for the no-active-
  // filing case, so both silently kept showing whatever filing was open last.
  test('returning to the dashboard clears the previous filing\'s sidebar context and nav checklist', async ({ page }) => {
    await freshStartNoPassword(page);
    await page.evaluate(() => (window as any).addWard('Stale Sidebar Ward', 'guardian'));
    await page.locator('[data-inventory-change="import-excel"]').waitFor({ state: 'attached' });

    const ctx = page.locator('#sidebar-context');
    const nav = page.locator('#nav-sections');
    await expect(ctx).toBeVisible();
    await expect(nav.locator('.nav-section')).not.toHaveCount(0);

    await page.evaluate(() => (window as any).navigate('/dashboard'));
    await expect(page).toHaveURL(/#\/dashboard/);

    await expect(ctx).toBeHidden();
    await expect(nav).toBeEmpty();
  });

  // Milestone 47B: Helpful Resources panel in the dashboard sidebar.
  // Visible on dashboard, hidden and emptied inside a filing, restored on return.
  test('helpful resources panel is visible on dashboard, hidden inside filings, and restored on return', async ({ page }) => {
    await freshStartNoPassword(page);
    await page.evaluate(() => (window as any).addWard('Resource Sidebar Ward', 'guardian'));
    await page.locator('[data-inventory-change="import-excel"]').waitFor({ state: 'attached' });

    const resources = page.locator('#sidebar-resources');
    const nav = page.locator('#nav-sections');

    // Inside a filing: #sidebar-resources is hidden and empty; #nav-sections has sections
    await expect(resources).toBeHidden();
    await expect(resources).toBeEmpty();
    await expect(nav.locator('.nav-section')).not.toHaveCount(0);

    // Navigate to dashboard
    await page.evaluate(() => (window as any).navigate('/dashboard'));
    await expect(page).toHaveURL(/#\/dashboard/);

    // On dashboard: #sidebar-resources is visible and contains Pinellas Property Appraiser link.
    //
    // Milestone 47B rendered each group's links inline; 7e9596e ("organize
    // dashboard resources") moved them inside collapsed <details> accordions and
    // pinned that intent in dashboard-resources.spec.js
    // ('renders county sections as collapsed accordions', which asserts the
    // markup is NOT emitted with `open`). It did not update this spec, so these
    // assertions were still describing the pre-7e9596e layout and had been
    // failing on master since. A link now has to be reached the way a user
    // reaches it: expand the group first.
    await expect(resources).toBeVisible();
    const pcpaoLink = resources.locator('a[href="https://www.pcpao.gov/"]');
    const pinellasSummary = resources.locator('summary.sidebar-resource-summary', { hasText: 'Pinellas County' });

    // Collapsed by default -- in the DOM, not yet visible. Asserting this rather
    // than just working around it means the accordion itself stays covered here,
    // so a regression to always-open (or always-closed) fails at this level too.
    await expect(pinellasSummary).toBeVisible();
    await expect(pcpaoLink).toBeHidden();

    await pinellasSummary.click();
    await expect(pcpaoLink).toBeVisible();
    await expect(pcpaoLink).toContainText('Property Appraiser');

    // Return to the filing via the triage queue Open button
    const main = page.locator('#main-content');
    await main.locator('[data-dashboard-bound="true"]').waitFor();
    await main.locator('[data-dashboard-action="open-ward"]').first().click();
    await page.locator('[data-inventory-change="import-excel"]').waitFor({ state: 'attached' });

    // Inside filing again: hidden and empty
    await expect(resources).toBeHidden();
    await expect(resources).toBeEmpty();
    await expect(nav.locator('.nav-section')).not.toHaveCount(0);

    // Return to dashboard again: restored. dispose() empties the panel and
    // renderSidebarResources() rebuilds it, so the group is collapsed afresh --
    // the expansion above is not expected to survive the round trip.
    await page.evaluate(() => (window as any).navigate('/dashboard'));
    await expect(page).toHaveURL(/#\/dashboard/);
    await expect(resources).toBeVisible();
    await expect(pcpaoLink).toBeHidden();
    await resources.locator('summary.sidebar-resource-summary', { hasText: 'Pinellas County' }).click();
    await expect(pcpaoLink).toBeVisible();
  });

  test('sidebar footer shows the current-year copyright notice, present regardless of dashboard vs. filing view', async ({ page }) => {
    await freshStartNoPassword(page);
    const copyright = page.locator('#sidebar-copyright');
    await expect(copyright).toHaveText(
      `© Copyright ${new Date().getFullYear()} Pinellas County Clerk of the Circuit Court and Comptroller`
    );

    await page.evaluate(() => (window as any).addWard('Copyright Notice Ward', 'guardian'));
    await page.locator('[data-inventory-change="import-excel"]').waitFor({ state: 'attached' });
    await expect(copyright).toBeVisible();
  });

  // Milestone 50I. updateSidebar()'s save-controls auto-collapse used to gate
  // on activeInventoryType (a filing page being open), which left the section
  // expanded on every SPECIAL_PAGES route for a session that reached one
  // before ever opening a filing -- the real case being a restored case file
  // with no stored active ward, which initApp() leaves activeInventoryType
  // unset for before its own updateSidebar() call. That exact boot sequence
  // can't be staged through a real reload in this harness (the no-password
  // harness doesn't persist across reloads), so this drives updateSidebar()
  // itself in that state -- the faithful, if indirect, proxy. See
  // MILESTONE-50-PROPOSAL.md's 50I "Verified" section.
  test('save controls default collapsed even with no active filing, and the toggle stays reachable to reopen it', async ({ page }) => {
    await freshStartNoPassword(page);
    await page.evaluate(() => (window as any).addWard('Save Controls Ward', 'guardian'));
    await page.locator('[data-inventory-change="import-excel"]').waitFor({ state: 'attached' });

    const toggleBtn = page.locator('#save-controls-toggle-btn');
    const body = page.locator('#save-controls-body');
    // On a filing page it is already collapsed by the existing behavior.
    await expect(toggleBtn).toHaveText('Show save controls ▾');

    await page.evaluate(() => {
      const w = window as any;
      w.caseFile.activeWardId = null;
      w.activeInventoryType = null;
      w.updateSidebar();
    });
    await expect(body).toBeHidden();
    await expect(toggleBtn).toBeVisible();
    await expect(toggleBtn).toHaveText('Show save controls ▾');

    // A user who explicitly expands it keeps that choice -- the gate must
    // never re-collapse over an explicit toggle.
    await toggleBtn.click();
    await expect(toggleBtn).toHaveText('Hide save controls ▴');
    await page.evaluate(() => (window as any).updateSidebar());
    await expect(toggleBtn).toHaveText('Hide save controls ▴');
  });

  test('dashboard controls work without inline event handlers', async ({ page }) => {
    await freshStartNoPassword(page);
    await page.evaluate(() => (window as any).addWard('Alpha Dashboard Ward', 'guardian'));
    await page.locator('[data-inventory-change="import-excel"]').waitFor({ state: 'attached' });
    await page.evaluate(() => (window as any).addWard('Beta Dashboard Ward', 'annual'));
    // Milestone 40C-B renamed this heading to say Cover as well as Part I.
    await expect(page.locator('#main-content').getByRole('heading', { name: 'Cover & Part I — Required Information' })).toBeVisible();
    await page.evaluate(() => (window as any).navigate('/dashboard'));

    const main = page.locator('#main-content');
    await main.locator('[data-dashboard-bound="true"]').waitFor();
    await assertNoInlineEventHandlers(main, ['[onchange]', '[onclick]', '[oninput]', '[onkeydown]']);
    // The grouped-by-type/case/flat toggle was removed as dead code (no
    // dashboard role ever reached its render branch) -- see Milestone 8.
    await expect(main.locator('#dashboard-group-toggle')).toHaveCount(0);

    // The single professional layout renders triage rows, and the closed
    // disclosure at the foot of the page now renders the same rows rather than
    // the retired family layout's ward cards.
    await page.locator('#dashboard-search').fill('Alpha');
    await expect(main.locator('.dashboard-triage-row')).toHaveCount(1);
    await expect(main.locator('.dashboard-triage-row')).toContainText('Alpha Dashboard Ward');

    await main.locator('[data-dashboard-action="archive"]').first().dispatchEvent('click');
    // Closed filings leave the active queue and the disclosure starts shut.
    await expect(main.locator('.dashboard-triage-queue:not(.dashboard-triage-queue-closed) .dashboard-triage-row')).toHaveCount(0);
    await expect(main.locator('#dashboard-closed-queue')).toBeHidden();
    await expect(main.locator('.dashboard-closed-toggle')).toHaveAttribute('aria-expanded', 'false');

    await main.getByRole('button', { name: /Closed Filings/ }).dispatchEvent('click');
    await expect(main.locator('#dashboard-closed-queue')).toBeVisible();
    await expect(main.locator('.ward-card')).toHaveCount(0);
    await expect(main.locator('.dashboard-triage-queue-closed .dashboard-triage-row')).toContainText('Alpha Dashboard Ward');

    await page.evaluate(() => (window as any).navigate('/inventory-select'));
    await page.evaluate(() => (window as any).navigate('/dashboard'));
    await main.locator('[data-dashboard-bound="true"]').waitFor();
    await assertNoInlineEventHandlers(main, ['[onchange]', '[onclick]', '[oninput]', '[onkeydown]']);
  });

  test('dashboard triage uses local preferences without mutating wards', async ({ page }) => {
    await freshStartNoPassword(page);
    await page.evaluate(() => (window as any).addWard('<img src=x onerror=alert(1)> Alpha Ward', 'guardian'));
    await page.locator('[data-inventory-change="import-excel"]').waitFor({ state: 'attached' });
    await page.evaluate(() => (window as any).addWard('Beta Ward', 'annual'));
    await page.evaluate(() => (window as any).addWard('Gamma Ward', 'planSimplified'));
    await page.evaluate(() => (window as any).addWard('Delta Ward', 'annual'));
    await page.evaluate(() => {
      const wards = (window as any).getCaseFile().wards;
      const periodTo = new Date();
      periodTo.setDate(periodTo.getDate() - 90);
      const dueTodayPeriodEnd = [periodTo.getFullYear(), String(periodTo.getMonth() + 1).padStart(2, '0'), String(periodTo.getDate()).padStart(2, '0')].join('-');
      wards[0].gid = '2026-01-01';
      wards[0].dashboardWorkflow = { status: 'disapproved-needs-correction', assigneeName: 'Alex Attorney' };
      wards[1].periodTo = dueTodayPeriodEnd;
      wards[1].dashboardWorkflow = { status: 'pending-court-review' };
      wards[2].periodTo = dueTodayPeriodEnd;
      wards[3].periodTo = dueTodayPeriodEnd;
      wards[3].dashboardWorkflow = { status: 'approved' };
    });
    await page.evaluate(() => (window as any).navigate('/dashboard'));
    const beforePreferences = await page.evaluate(() => JSON.stringify((window as any).getCaseFile().wards));

    const main = page.locator('#main-content');
    await main.locator('[data-dashboard-bound="true"]').waitFor();
    const expectPrimaryMetricStrip = async () => {
      const primaryMetrics = main.locator('.dashboard-triage-summary .dashboard-stat:not(.dashboard-stat-secondary)');
      await expect(primaryMetrics).toHaveCount(3);
      await expect(primaryMetrics.filter({ hasText: 'Action Items / Exceptions' })).toContainText('1');
      await expect(primaryMetrics.filter({ hasText: 'Approaching Deadlines' })).toContainText('1');
      await expect(primaryMetrics.filter({ hasText: 'Pending Court Review' })).toContainText('1');
      await expect(main.locator('.dashboard-triage-summary')).not.toContainText('Combined total');
      await expect(main.locator('.dashboard-summary-secondary')).toHaveCount(0);
    };

    // Milestone 36-1 collapsed the family/professional/assistant layouts to a
    // single professional one, so there is no role select and no role walk.
    await expect(main.locator('.dashboard-triage-row')).toHaveCount(4);
    await expect(main.locator('#dashboard-role')).toHaveCount(0);
    await expect(main.locator('.dashboard-family-row')).toHaveCount(0);
    // The Status/Deadline/Contact/Assignment selects were retired; the toolbar
    // now carries search alone, and the column headers do the narrowing.
    await expect(main.locator('#dashboard-status-filter')).toHaveCount(0);
    await expect(main.locator('#dashboard-deadline-filter')).toHaveCount(0);
    await expect(main.locator('#dashboard-contact-filter')).toHaveCount(0);
    await expect(main.locator('#dashboard-assignment-filter')).toHaveCount(0);
    await expect(main.locator('.dashboard-supervisor-control')).toHaveCount(0);
    await expect(main.locator('[data-dashboard-action="select-existing"]')).toHaveCount(1);
    await expect(main.locator('.dashboard-page-header [data-dashboard-action="select-existing"]')).toHaveText(/New Filing from Existing/);
    await expect(main.locator('.inventory-convert-banner')).toHaveCount(0);
    await expect(main.locator('img[src="x"]')).toHaveCount(0);
    await expect(main).toContainText('<img src=x onerror=alert(1)> Alpha Ward');
    await expectPrimaryMetricStrip();

    // Milestone 47A: header buttons are unified to btn-primary and the legacy
    // .dashboard-filing-controls divider wrapper is removed.
    await expect(main.locator('.dashboard-page-header .dashboard-filing-controls')).toHaveCount(0);
    const headerBtns = main.locator('.dashboard-page-header .dashboard-header-actions button');
    await expect(headerBtns).toHaveCount(3);
    for (const btn of await headerBtns.all()) {
      await expect(btn).toHaveClass(/btn-primary/);
      await expect(btn).not.toHaveClass(/btn-outline/);
    }
    await expect(main.locator('.dashboard-page-header #new-ward-btn')).toHaveCount(1);
    await expect(main.locator('.dashboard-page-header #new-ward-btn')).toHaveText(/^\s*New Form\s*$/);

    // The three buttons share background, border, text color and height in
    // both themes. .btn transitions its colors, so transitions are switched
    // off while reading; otherwise the dark read could land mid-fade.
    const html = page.locator('html');
    const initialTheme = await html.getAttribute('data-theme');
    await headerBtns.evaluateAll(btns => btns.forEach(b => { (b as HTMLElement).style.transition = 'none'; }));
    const expectUniformHeaderBtns = async (theme: 'light' | 'dark') => {
      await page.evaluate(t => { document.documentElement.dataset.theme = t; }, theme);
      const styles = await headerBtns.evaluateAll(btns => btns.map(b => {
        const cs = window.getComputedStyle(b);
        return { bg: cs.backgroundColor, border: cs.borderColor, color: cs.color, height: cs.height };
      }));
      for (const prop of ['bg', 'border', 'color', 'height'] as const) {
        expect(new Set(styles.map(s => s[prop])).size, `${theme} ${prop}`).toBe(1);
      }
      return page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--ink').trim());
    };
    const lightInk = await expectUniformHeaderBtns('light');
    const darkInk = await expectUniformHeaderBtns('dark');
    // btn-primary is the same maroon in both themes, so confirm the switch
    // through a token that does change.
    expect(darkInk, 'dark theme actually applied').not.toBe(lightInk);
    await headerBtns.evaluateAll(btns => btns.forEach(b => { (b as HTMLElement).style.transition = ''; }));
    await page.evaluate(t => {
      if (t === null) delete document.documentElement.dataset.theme;
      else document.documentElement.dataset.theme = t;
    }, initialTheme);

    await expect(main.locator('.dashboard-page-header .dashboard-close-ward')).toHaveCount(0);
    await expect(main.locator('.dashboard-page-header .dashboard-delete-ward')).toHaveCount(0);
    await expect(main.locator('.dashboard-triage-actions [data-dashboard-action="delete"]')).toHaveCount(4);

    await expect(main.locator('[data-dashboard-change="workflow-status"]')).toHaveCount(4);
    await expect(main.locator('[data-dashboard-change="assignee"]')).toHaveCount(4);
    await expect(main.locator('.dashboard-triage-row').filter({ hasText: 'Alpha Ward' })).toHaveAttribute('data-dashboard-priority', 'urgent');
    await expect(main.locator('.dashboard-triage-row').filter({ hasText: 'Beta Ward' })).toHaveAttribute('data-dashboard-priority', 'pending');
    await expect(main.locator('.dashboard-triage-row').filter({ hasText: 'Gamma Ward' })).toHaveAttribute('data-dashboard-priority', 'warning');
    await expect(main.locator('.dashboard-triage-row').filter({ hasText: 'Delta Ward' })).toHaveAttribute('data-dashboard-priority', 'approved');
    // Search replaces the retired selects as the way to narrow the queue.
    await page.locator('#dashboard-search').fill('Gamma');
    await expect(main.locator('.dashboard-triage-row')).toHaveCount(1);
    await expect(main.locator('.dashboard-triage-row')).toContainText('Gamma Ward');
    await page.locator('#dashboard-search').fill('Alex Attorney');
    await expect(main.locator('.dashboard-triage-row')).toHaveCount(1);
    await expect(main.locator('.dashboard-triage-row')).toContainText('Alpha Ward');
    await page.locator('#dashboard-search').fill('');
    await expect(main.locator('.dashboard-triage-row')).toHaveCount(4);

    const afterPreferences = await page.evaluate(() => JSON.stringify((window as any).getCaseFile().wards));
    expect(afterPreferences).toBe(beforePreferences);

    await page.evaluate(() => (window as any).navigate('/inventory-select'));
    await page.evaluate(() => (window as any).navigate('/dashboard'));
    await page.evaluate(() => (window as any).navigate('/inventory-select'));
    await page.evaluate(() => (window as any).navigate('/dashboard'));
    await main.locator('[data-dashboard-bound="true"]').waitFor();
    await main.locator('[data-dashboard-ward-id="' + await page.evaluate(() => (window as any).getCaseFile().wards[2].wardId) + '"] [data-dashboard-action="archive"]').dispatchEvent('click');
    // Archived filings remain visible in the dashboard's all-filings review
    // queue; archive changes workflow state, not the row's visibility.
    await expect(main.locator('.dashboard-triage-row')).toHaveCount(4);
    expect(await page.evaluate(() => (window as any).getCaseFile().wards[2].archived)).toBe(true);
  });

  test('explicit dashboard workflow changes persist normalized metadata', async ({ page }) => {
    await freshStartNoPassword(page);
    await page.evaluate(() => (window as any).addWard('Workflow Ward', 'guardian'));
    await page.locator('[data-inventory-change="import-excel"]').waitFor({ state: 'attached' });
    await page.evaluate(() => (window as any).navigate('/dashboard'));
    await page.locator('#main-content [data-dashboard-bound="true"]').waitFor();

    const row = page.locator('.dashboard-triage-row').filter({ hasText: 'Workflow Ward' });
    await row.locator('[data-dashboard-change="workflow-status"]').selectOption('approved');
    await expect.poll(() => page.evaluate(() => (window as any).getCaseFile().wards[0].dashboardWorkflow)).toEqual({ status: 'approved' });
    await expect(page.locator('#last-saved-indicator')).toContainText('Unsaved changes');

    const assignee = row.locator('[data-dashboard-change="assignee"]');
    await assignee.fill('  <img src=x onerror=alert(1)> Alex   Attorney  ');
    await assignee.press('Tab');
    await expect.poll(() => page.evaluate(() => (window as any).getCaseFile().wards[0].dashboardWorkflow)).toEqual({
      status: 'approved',
      assigneeName: '<img src=x onerror=alert(1)> Alex Attorney',
    });
    await expect(page.locator('.dashboard-triage-row img[src="x"]')).toHaveCount(0);

    await row.locator('[data-dashboard-change="workflow-status"]').selectOption('auto');
    await expect.poll(() => page.evaluate(() => (window as any).getCaseFile().wards[0].dashboardWorkflow)).toEqual({
      assigneeName: '<img src=x onerror=alert(1)> Alex Attorney',
    });
    await row.locator('[data-dashboard-change="assignee"]').fill('   ');
    await row.locator('[data-dashboard-change="assignee"]').press('Tab');
    await expect.poll(() => page.evaluate(() => (window as any).getCaseFile().wards[0].dashboardWorkflow)).toBeUndefined();
  });

  test('shell controls work without inline event handlers', async ({ page }) => {
    await freshStartNoPassword(page);
    await page.keyboard.press('Tab');
    await expect(page.locator('.skip-link')).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.locator('#main-content')).toBeFocused();
    await page.evaluate(() => (window as any).addWard('Alpha Shell Ward', 'guardian'));
    await page.locator('[data-inventory-change="import-excel"]').waitFor({ state: 'attached' });
    await page.evaluate(() => (window as any).addWard('Beta Shell Ward', 'annual'));
    // Milestone 40C-B renamed this heading to say Cover as well as Part I.
    await expect(page.locator('#main-content').getByRole('heading', { name: 'Cover & Part I — Required Information' })).toBeVisible();
    await page.evaluate(() => (window as any).navigate('/dashboard'));
    await page.locator('[data-dashboard-bound="true"]').waitFor();

    await assertNoInlineEventHandlers(page, [
      '[data-shell-action][onclick]', '[data-shell-action][oninput]', '[data-shell-action][onchange]',
      '[data-shell-action][onfocus]', '[data-shell-action][onkeydown]',
      '#ward-selector[oninput]', '#ward-selector[onfocus]', '#ward-selector[onkeydown]',
    ]);

    const html = page.locator('html');
    const initialTheme = await html.getAttribute('data-theme');
    await page.locator('#theme-toggle-btn').dispatchEvent('click');
    await expect(html).toHaveAttribute('data-theme', initialTheme === 'dark' ? 'light' : 'dark');

    await page.locator('#help-toggle-btn').dispatchEvent('click');
    await expect(page.locator('#help-panel')).toBeVisible();
    await page.locator('.help-panel-close').dispatchEvent('click');
    await expect(page.locator('#help-panel')).toBeHidden();

    const selector = page.locator('#ward-selector');
    await selector.focus();
    await expect(page.locator('#ward-selector-dropdown')).toContainText('Alpha Shell Ward');
    await expect(selector).toHaveAttribute('aria-expanded', 'true');
    await selector.press('ArrowDown');
    await expect(selector).toHaveAttribute('aria-activedescendant', /ward-selector-option-/);
    await selector.fill('Alpha Shell Ward');
    await selector.press('Enter');
    await expect(selector).toHaveValue('Alpha Shell Ward');

    await page.setViewportSize({ width: 700, height: 800 });
    const mobileMenu = page.locator('#mobile-menu-btn');
    await mobileMenu.click();
    await expect(mobileMenu).toHaveAttribute('aria-expanded', 'true');
    await expect(page.locator('#sidebar')).toHaveClass(/mobile-open/);
    await page.locator('#sidebar-backdrop').click({ position: { x: 690, y: 400 } });
    await expect(mobileMenu).toHaveAttribute('aria-expanded', 'false');
    await expect(page.locator('#sidebar')).not.toHaveClass(/mobile-open/);
  });

  // The sidebar accordion remembers at most one section the user opened by
  // hand; while that memory is set it wins over "expand whichever section holds
  // the current page." Navigating is what clears it. That reset lived inside
  // legacy-app.js's own navigate(), which stopped running the moment
  // router.js published window.navigate over its global binding -- so a
  // hand-opened section stayed stuck open and the current page's section stayed
  // collapsed, for every navigation after the first click. router.js now calls
  // window.resetNavSectionExpanded() and this pins the behaviour down.
  test('navigating forgets a hand-opened sidebar section so the current page\'s section expands', async ({ page }) => {
    await freshStartNoPassword(page);
    await page.evaluate(() => (window as any).addWard('Nav Accordion Ward', 'guardian'));
    await page.locator('[data-inventory-change="import-excel"]').waitFor({ state: 'attached' });

    const section = (i: number) => page.locator('#nav-sections .nav-section').nth(i);
    const label = (i: number) => section(i).locator('.nav-section-label');

    // Case Info (index 0) holds the landing route '/', so it starts expanded.
    await expect(label(0)).toHaveAttribute('aria-expanded', 'true');

    // Open Schedule B (index 2) by hand: it expands, and Case Info gives way.
    await label(2).click();
    await expect(label(2)).toHaveAttribute('aria-expanded', 'true');
    await expect(label(0)).toHaveAttribute('aria-expanded', 'false');

    // Now go to a page in Schedule A (index 1). The hand-opened section must be
    // forgotten, so the section holding the new current page expands itself.
    await page.evaluate(() => (window as any).navigate('/a1'));
    await expect(label(1)).toHaveAttribute('aria-expanded', 'true');
    await expect(label(2)).toHaveAttribute('aria-expanded', 'false');
    await expect(section(1)).not.toHaveClass(/collapsed/);
    await expect(section(2)).toHaveClass(/collapsed/);
  });

  test('ward management modals work without inline event handlers', async ({ page }) => {
    await freshStartNoPassword(page);
    await page.evaluate(() => (window as any).showAddWardModalForType('guardian'));
    await assertNoInlineEventHandlers(page, [
      '#lazy-fragment-host [onclick]', '#lazy-fragment-host [oninput]', '#lazy-fragment-host [onchange]',
      '#lazy-fragment-host [onfocus]', '#lazy-fragment-host [onkeydown]',
    ]);

    await page.locator('#new-ward-name').fill('alpha modal ward');
    // Name fields format on blur (not live per-keystroke -- see modal-events.js's
    // handleModalBlur), so leaving the field is what title-cases it.
    await page.locator('#new-ward-type').focus();
    await expect(page.locator('#new-ward-name')).toHaveValue('Alpha Modal Ward');
    await page.locator('#addWardModal [data-modal-action="add-ward"]').click();
    await expect(page.locator('#addWardModal')).toBeHidden();
    await expect(page.locator('#ward-selector')).toHaveValue('Alpha Modal Ward');

    await page.evaluate(() => (window as any).showRenameWardModal());
    await page.locator('#rename-ward-input').fill('renamed modal ward');
    await page.locator('#renameWardModal [data-modal-action="rename-ward"]').click();
    await expect(page.locator('#renameWardModal')).toBeHidden();
    await expect(page.locator('#ward-selector')).toHaveValue('Renamed Modal Ward');

    await page.evaluate(() => (window as any).confirmDeleteWard());
    await page.locator('#deleteWardModal [data-modal-action="delete-ward"]').click();
    await expect(page.locator('#deleteWardModal')).toBeHidden();
    await expect.poll(() => page.evaluate(() => (window as any).caseFile.wards.length)).toBe(0);
  });

  // Milestone 58E. The confirmation must say WHICH filing is about to be
  // permanently deleted. Two filings for the same ward previously produced
  // byte-identical prompts, so the only thing distinguishing an Initial
  // Inventory from this year's Annual Accounting was which button the filer
  // had pressed a moment earlier.
  test('delete confirmation names the individual filing, and deletes exactly that one', async ({ page }) => {
    await freshStartNoPassword(page);
    await page.evaluate(async () => {
      const w = window as any;
      await w.addWard('Dorothy Jean Ashford', 'guardian');
      await w.addWard('Dorothy Jean Ashford', 'annual');
      const wards = w.caseFile.wards;
      wards[0].caseNumber = '26-001203-GD';
      wards[1].caseNumber = '26-001203-GD';
      wards[1].periodFrom = '2025-01-01';
      wards[1].periodTo = '2025-12-31';
    });

    const ids = await page.evaluate(() => (window as any).caseFile.wards.map((x: any) => x.wardId));

    const messageFor = async (wardId: string) => {
      await page.evaluate((id) => (window as any).confirmDeleteWard(id), wardId);
      const text = await page.locator('#delete-ward-msg').textContent();
      await page.locator('#deleteWardModal [data-modal-action="close"]').click();
      await expect(page.locator('#deleteWardModal')).toBeHidden();
      return text || '';
    };

    const inventoryMsg = await messageFor(ids[0]);
    const annualMsg = await messageFor(ids[1]);

    expect(inventoryMsg).toContain('Initial Inventory');
    expect(inventoryMsg).toContain('Dorothy Jean Ashford');
    expect(inventoryMsg, 'an Initial Inventory has no reporting period').not.toContain('through');
    expect(annualMsg).toContain('Annual Accounting');
    expect(annualMsg).toContain('01/01/2025 through 12/31/2025');
    expect(annualMsg, 'two filings on one ward must not read identically').not.toBe(inventoryMsg);

    // Cancelling deleted nothing.
    expect(await page.evaluate(() => (window as any).caseFile.wards.length)).toBe(2);

    // Confirming deletes exactly the filing the prompt named.
    await page.evaluate((id) => (window as any).confirmDeleteWard(id), ids[1]);
    await page.locator('#deleteWardModal [data-modal-action="delete-ward"]').click();
    await expect(page.locator('#deleteWardModal')).toBeHidden();
    await expect.poll(() => page.evaluate(() => (window as any).caseFile.wards.map((x: any) => x.inventoryType)))
      .toEqual(['guardian']);
  });

  test('shared plan controls persist through delegated form events', async ({ page }) => {
    await freshStartNoPassword(page);
    await page.evaluate(() => (window as any).addWard('Shared Form Ward', 'planSimplified'));
    await page.locator('[data-shell-action="hide-auto-export-reminder"]').click();

    const caseNumber = page.locator('#caseNumber');
    await caseNumber.fill('2026cp123');
    await caseNumber.blur();
    await expect(caseNumber).toHaveValue('20-026123-GD');
    await expect.poll(() => page.evaluate(() => (window as any).D.caseNumber)).toBe('20-026123-GD');

    const county = page.locator('#county');
    await county.fill('Ora');
    await page.locator('#county-dropdown [data-county="Orange"]').click();
    await expect(county).toHaveValue('Orange');
    await expect.poll(() => page.evaluate(() => (window as any).D.county)).toBe('Orange');

    await page.locator('#sidebar [data-form-action="navigate"][data-route="/p2"]').click();
    await expect(page).toHaveURL(/#\/p2$/);
    await page.locator('#q1Residences').fill('A supported residence');
    await expect.poll(() => page.evaluate(() => (window as any).D.q1Residences)).toBe('A supported residence');

    const restoreRights = page.locator('input[type="radio"][data-form-path="q7RestoreRights"][value="Yes"]');
    await restoreRights.check();
    await expect.poll(() => page.evaluate(() => (window as any).D.q7RestoreRights)).toBe('Yes');
    await expect(page.locator('[data-form-path][oninput], [data-form-path][onchange], [data-form-path][onfocus], [data-form-path][onblur], [data-form-control][oninput], [data-form-control][onfocus], [data-form-control][onblur]')).toHaveCount(0);
  });

  test('all 9 form types render a standardized summary page at /summary with case info', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

    for (const type of INVENTORY_TYPES) {
      await freshStartNoPassword(page);
      await page.evaluate((t) => (window as any).addWard(`Summary Test Ward ${t}`, t), type);
      await page.evaluate(() => (window as any).navigate('/summary'));

      const main = page.locator('#main-content');
      await expect(main).not.toBeEmpty();
      await expect(main.locator('.summary-box').first()).toBeVisible();
      await expect(main.getByRole('heading', { level: 1 })).toContainText('Summary');

      // Milestone 50G: addWard() above leaves the debounced autosave dirty,
      // which writes to the shared pg-session-cache IndexedDB store. Left in
      // place, the NEXT iteration's freshStartNoPassword() reload would hit
      // checkSessionRestoreCacheAtLaunch()'s confirmModal() before its own
      // #startup-choice-overlay ever shows -- a DOM dialog nobody interacts
      // with just sits there, unlike a native confirm() (which a previous
      // run's unlistened dialog would have had auto-dismissed by Playwright,
      // clearing the cache as a side effect of declining, not of saving).
      await page.evaluate(async () => {
        await (window as any).flushPendingSave();
        await (window as any).clearSessionRestoreCache();
        // Confirmed live: without this, some later mount/render tick
        // re-marks the app dirty and re-arms the debounced autosave, which
        // can fire and re-populate the cache before the next reload's
        // navigation actually unloads this page -- clearing alone isn't
        // enough to prevent the offer from reappearing.
        (window as any)._dirtySinceExport = false;
      });
    }

    expect(errors).toEqual([]);
  });

  // A real click on a Summary page's Section Completion link, not the direct
  // window.navigate() call the test above uses -- summary-renderer.js's
  // navigation links are <a href="#">, and the shared click handler used to
  // call window.navigate() without calling event.preventDefault(). The
  // anchor's own default action then also ran, setting location.hash to ""
  // (from href="#") right behind it, which queued a second, later hashchange
  // that found no matching route and fell back to Cover -- so every summary
  // link appeared to navigate, then silently bounced back to the cover a
  // beat later. Reported live via screenshots of Plan Minor's and Guardian
  // Inventory's Summary pages, both built on this one shared renderer.
  test('Summary page: clicking a real Section Completion link navigates there and stays, instead of bouncing back to Cover', async ({ page }) => {
    await freshStartNoPassword(page);
    await page.evaluate(() => (window as any).addWard('Summary Link Ward', 'planMinor'));
    await page.evaluate(() => (window as any).navigate('/summary'));

    const main = page.locator('#main-content');
    await main.getByRole('link', { name: 'Prior Residences' }).click();

    await expect(page.locator('#main-content h1')).toContainText('2. Residences During the Preceding 12 Months');
    expect(await page.evaluate(() => (window as any).currentPage)).toBe('/p2');
  });

  test('form fields in dark mode use light gray background with black font', async ({ page }) => {
    await freshStartNoPassword(page);
    await page.evaluate(() => (window as any).addWard('Dark Theme Form Ward', 'simplified'));
    await page.evaluate(() => { document.documentElement.dataset.theme = 'dark'; });

    const wardNameInput = page.locator('#wardName');
    await expect(wardNameInput).toBeVisible();

    const styles = await wardNameInput.evaluate((el) => {
      const computed = window.getComputedStyle(el);
      return {
        bg: computed.backgroundColor,
        color: computed.color,
      };
    });

    // #dde3eb is rgb(221, 227, 235), black font is rgb(0, 0, 0)
    expect(styles.bg).toBe('rgb(221, 227, 235)');
    expect(styles.color).toBe('rgb(0, 0, 0)');
  });
});


