import { test, expect, type Page } from '@playwright/test';
import { freshStartNoPassword, createWard, fillMinimalValidPlanInitialWard } from './support/target';

// Milestone 68F. The court's Initial Plan (page 6) offers "None" on 10D
// (assistive devices used) and 10E (assistive devices needed) as one box
// among the others, and has no "None" on 10B/10C -- so no box is added there
// (reversed 2026-09-23 on seeing the form). What was an app defect regardless
// of the form: a filer could tick "None" beside "Wheelchair" and file a plan
// stating both. The rule built for question 4 in 68E (core/form/
// exclusive-none.js) now covers 10D and 10E: "None" clears the devices and a
// device clears "None", on the click, in the model and on screen.

const go = (page: Page, route: string) => page.evaluate((r) => (window as any).navigate(r), route);
const box = (page: Page, id: string) => page.locator(`#main-content input#${id}`);
const model = (page: Page, keys: string[]) => page.evaluate((k) => Object.fromEntries(k.map((key) => [key, (window as any).D[key]])), keys);

for (const group of [
  { label: '10D — assistive devices used', route: '/p7', none: 'usesNone', a: 'usesWheelchair', b: 'usesGlasses' },
  { label: '10E — assistive devices needed', route: '/p8', none: 'needsNone', a: 'needsWheelchair', b: 'needsGlasses' },
]) {
  test(`${group.label}: "None" is exclusive with the devices, in both directions, on the click`, async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, `Initial Plan ${group.none}`, 'planInitial');
    await fillMinimalValidPlanInitialWard(page);
    await go(page, group.route);

    // The fixture ticks None; a device clears it.
    await box(page, group.a).check();
    await expect(box(page, group.none), 'a device clears None').not.toBeChecked();
    await expect(box(page, group.a)).toBeChecked();
    expect(await model(page, [group.none, group.a])).toEqual({ [group.none]: false, [group.a]: true });

    // Two devices, then None: both devices clear.
    await box(page, group.b).check();
    await box(page, group.none).check();
    await expect(box(page, group.a), 'None clears the devices').not.toBeChecked();
    await expect(box(page, group.b)).not.toBeChecked();
    await expect(box(page, group.none)).toBeChecked();
    expect(await model(page, [group.none, group.a, group.b])).toEqual({ [group.none]: true, [group.a]: false, [group.b]: false });

    // Unticking None clears nothing else and leaves the question unanswered.
    await box(page, group.none).uncheck();
    expect(await model(page, [group.none, group.a, group.b])).toEqual({ [group.none]: false, [group.a]: false, [group.b]: false });
  });
}
