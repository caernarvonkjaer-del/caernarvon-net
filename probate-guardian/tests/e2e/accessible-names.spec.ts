import { test, expect, type Page } from '@playwright/test';
import { freshStartNoPassword, createWard } from './support/target';
import { skipEnvironmentLimitation } from './support/target-profile';

// Milestone 73O part 3: what a screen reader hears is what the filer reads --
// never the app's internal names. A screen reader said "startingBalance" for
// the Simplified's Part II boxes and "Comments about schA" for every schedule's
// Comments box; the Start New Form cards said "Create ... ward"; Link Person
// and Link to Case showed "O&#39;Brien". And the ward's name is no longer
// written to the browser console when a form is created.
//
// Names are read from Chromium's own accessibility tree (what a screen reader
// is given), not re-derived from the markup.

const FORMS = ['guardian', 'simplified', 'annual', 'finalAccounting', 'trustAccounting', 'planSimplified', 'planAnnual', 'planInitial', 'planMinor'];
const ROLES = new Set(['textbox', 'combobox', 'checkbox', 'radio', 'spinbutton', 'searchbox', 'listbox', 'button', 'link', 'group', 'switch', 'tab', 'menuitem', 'option']);
// A program's name: camelCase ("startingBalance", "schA"), a dotted data path
// ("guardians.0.name"), or a generated id ("auto_k3j9x2").
const INTERNAL = /\b[a-z]+[A-Z][A-Za-z0-9]*\b|\b[A-Za-z]+\.\d+\.[A-Za-z]+|\b(auto|txt)_[a-z0-9]{5,}\b/;

const navigate = (page: Page, route: string) => page.evaluate((r) => (window as any).GuardianForms.testing.navigate(r), route);
const heading = (page: Page) => page.evaluate(() => {
  const h1 = document.querySelector('#main-content .schedule-page h1') as HTMLElement | null;
  if (!h1) return '';
  const copy = h1.cloneNode(true) as HTMLElement;
  copy.querySelectorAll('.test-system-title-prefix, .form-header-actions, [aria-hidden="true"]').forEach((n) => n.remove());
  return (copy.textContent || '').replace(/\s+/g, ' ').trim();
});

test.describe('73O part 3: names a screen reader reads', () => {
  test('no control on any page of any form, or on the dashboard, is named by an internal name; each Comments box and upload is named by its page', async ({ page, browserName }) => {
    skipEnvironmentLimitation(browserName !== 'chromium', "Reads the names Chromium's accessibility tree gives a screen reader (the DevTools protocol)");
    test.setTimeout(600_000);
    await freshStartNoPassword(page);
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Accessibility.enable');
    const internal: string[] = [];
    const scan = async (where: string) => {
      const { nodes } = await cdp.send('Accessibility.getFullAXTree') as any;
      for (const node of nodes) {
        const role = node.role?.value;
        const name = String(node.name?.value || '');
        if (!node.ignored && ROLES.has(role) && INTERNAL.test(name)) internal.push(`${where}: ${role} "${name}"`);
      }
    };
    const pageNamed: string[] = [];

    await scan('Start New Form');
    for (const [i, type] of FORMS.entries()) {
      await page.evaluate(([t, n]) => (window as any).GuardianForms.testing.createFiling.add(n, t), [type, `Names Ward ${i + 1}`]);
      await page.locator('#main-content').waitFor({ state: 'visible' });
      const routes = await page.locator('[data-page]').evaluateAll((els) => [...new Set(els.map((e: any) => e.dataset.page))]);
      for (const route of routes) {
        await navigate(page, route);
        await page.locator('#main-content').waitFor({ state: 'visible' });
        await scan(`${type} ${route}`);
        const comments = page.locator('#main-content [data-form-input="schedule-comment"]');
        if (await comments.count()) {
          const title = await heading(page);
          const got = [await comments.first().getAttribute('aria-label'), await page.locator('#main-content [data-form-change="schedule-doc-upload"]').first().getAttribute('aria-label')];
          const want = [`Comments on ${title}`, `Upload PDF supporting documents for ${title}`];
          if (!title || got[0] !== want[0] || got[1] !== want[1]) pageNamed.push(`${type} ${route}: ${JSON.stringify(got)}`);
        }
      }
    }
    await navigate(page, '/dashboard');
    await scan('dashboard');
    expect(internal, 'controls named by an internal name').toEqual([]);
    expect(pageNamed, 'documents controls not named by their page').toEqual([]);
  });

  test("the Simplified's Part II boxes are named by their lines' captions", async ({ page }) => {
    await freshStartNoPassword(page);
    await page.evaluate(() => (window as any).GuardianForms.testing.createFiling.add('Part Two Ward', 'simplified'));
    await navigate(page, '/p2');
    for (const caption of ['Starting Balance — Net Assets per Prior Report', 'Interest Income', 'Deposits Pursuant to Settlement', 'Financial Institution Service Charges', 'Federal Income Tax']) {
      await expect(page.getByRole('textbox', { name: caption })).toBeVisible();
    }
  });

  test('the Start New Form cards are named by what they show', async ({ page }) => {
    await freshStartNoPassword(page);
    await navigate(page, '/inventory-select');
    const cards = page.locator('.inventory-card[data-form-action="add-ward-type"]');
    await expect(cards).toHaveCount(9);
    for (const card of await cards.all()) {
      const shown = (await card.locator('h2').innerText()).trim();
      await expect(card).toHaveAccessibleName(`${shown}: Create Form for a Ward`);
    }
  });

  test("Link to Case and Link Person show an apostrophe as typed", async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, "O'Brien Ward", 'annual');
    await page.evaluate(async () => {
      const t = (window as any).GuardianForms.testing;
      t.patchFiling({ attorney: "Pat O'Brien" }); // setup (D9)
      await t.save.flush();
    });
    await navigate(page, '/p5');
    await page.locator('[data-annual-action="link-party"][data-role="attorney"]').click();
    await expect(page.locator('#pick-party-slot-label')).toHaveText('"Pat O\'Brien"');
    await page.keyboard.press('Escape');

    await navigate(page, '/dashboard');
    await page.getByRole('button', { name: "Link O'Brien Ward to a Case" }).click();
    await expect(page.locator('#pick-case-ward-name')).toHaveText('"O\'Brien Ward"');
  });

  test("creating a form writes no ward's name to the browser console", async ({ page }) => {
    const lines: string[] = [];
    page.on('console', (message) => lines.push(message.text()));
    await freshStartNoPassword(page);
    await createWard(page, 'Quintessa Console Ward', 'guardian');
    await page.locator('#main-content').waitFor({ state: 'visible' });
    expect(lines.filter((line) => line.includes('Quintessa'))).toEqual([]);
  });
});
