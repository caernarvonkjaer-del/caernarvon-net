import { test, expect } from '@playwright/test';
import { freshStartNoPassword } from './support/target';

const FORM_TYPES = [
  'guardian',
  'simplified',
  'annual',
  'finalAccounting',
  'trustAccounting',
  'planSimplified',
  'planAnnual',
  'planInitial',
  'planMinor',
] as const;

for (const formType of FORM_TYPES) {
  test(`form pages preserve landmarks and heading structure: ${formType}`, async ({ page }) => {
    await freshStartNoPassword(page);
    await page.evaluate((type) => (window as any).addWard(`Structure ${type}`, type), formType);
    const routes = await page.locator('[data-page]').evaluateAll((elements) => [
      ...new Set(elements.map((element: any) => element.dataset.page)),
    ]);

    for (const route of routes) {
      await test.step(`route ${route}`, async () => {
        await page.evaluate((nextRoute) => (window as any).navigate(nextRoute), route);
        await page.locator('#main-content').waitFor({ state: 'visible' });
        const structure = await page.evaluate(() => {
          const main = document.querySelector('main#main-content');
          const headings = main ? [...main.querySelectorAll('h1, h2, h3, h4, h5, h6')]
            .filter((heading: any) => heading.getClientRects().length > 0)
            .map((heading: any) => Number(heading.tagName.slice(1))) : [];
          return {
            mainCount: document.querySelectorAll('main#main-content').length,
            navigationCount: document.querySelectorAll('nav[aria-label="Application navigation"]').length,
            headings,
          };
        });
        expect(structure.mainCount, `${formType} ${route} main landmark count`).toBe(1);
        expect(structure.navigationCount, `${formType} ${route} navigation landmark count`).toBe(1);
        expect(structure.headings[0], `${formType} ${route} first visible main heading`).toBe(1);
        for (let index = 1; index < structure.headings.length; index += 1) {
          expect(
            structure.headings[index] - structure.headings[index - 1],
            `${formType} ${route} heading level jump: ${JSON.stringify(structure.headings)}`
          ).toBeLessThanOrEqual(1);
        }
      });
    }
  });
}
