import { test, expect, type Page } from '@playwright/test';
import { freshStartNoPassword, createWard, fillMinimalValidPlanInitialWard } from './support/target';
import { readAll } from './support/stream';
import { extractPdfText } from './support/pdf-extract';

// Milestone 68E. The court's Initial Guardianship Plan shows questions 2
// (residential setting), 4 (mental health services) and 5 (personal care) as
// checkbox lists -- page 2 of reference/plan-forms/plan-initial-original.pdf,
// the same glyphs as questions 3 and 6. The app rendered all three as radio
// groups, so a ward in an assisted-living facility whose family also provides
// daily care could not be described; §744.363(1)(a) requires the provision of
// care to be described and sets no cardinality. Decided: every
// radio-rendered checkbox list converts (the requester widened the item
// from Q5 to every question the form shows that way).
//
// Driven through the real clicks (AGENTS.md section 6): several boxes hold;
// question 4's "None" is exclusive with its siblings; "Other" reveals its
// explanation on the click (67F) and a blank explanation still blocks; a
// filing saved under the old one-string shape reads back as one ticked box,
// with free text kept under Other; nothing ticked is still an export issue.

const messages = (page: Page) => page.evaluate(() => ((window as any).validatePlanInitial() || []).map((i: any) => String(i?.message ?? i)));
const model = (page: Page, keys: string[]) => page.evaluate((k) => Object.fromEntries(k.map((key) => [key, (window as any).D[key]])), keys);
const go = (page: Page, route: string) => page.evaluate((r) => (window as any).navigate(r), route);
const box = (page: Page, id: string) => page.locator(`#main-content input#${id}`);

test('questions 2, 4 and 5 hold several answers, and every ticked box reaches the model and the PDF', async ({ page }) => {
  test.setTimeout(120_000);
  await freshStartNoPassword(page);
  await createWard(page, 'Initial Plan Multi-select', 'planInitial');
  await fillMinimalValidPlanInitialWard(page);

  await go(page, '/p2');
  await box(page, 'q2ALF').check();
  await box(page, 'q2GroupHome').check();
  await expect(box(page, 'q2ALF')).toBeChecked();
  await expect(box(page, 'q2GroupHome')).toBeChecked();

  await go(page, '/p3');
  await box(page, 'q4Psych').check();
  await box(page, 'q4Outpatient').check();
  await box(page, 'q5CareFacility').check();
  await box(page, 'q5FamilyFriends').check();
  await expect(box(page, 'q4Psych')).toBeChecked();
  await expect(box(page, 'q4Outpatient')).toBeChecked();

  expect(await model(page, ['q2ALF', 'q2GroupHome', 'q4Psych', 'q4Outpatient', 'q5CareFacility', 'q5FamilyFriends']))
    .toEqual({ q2ALF: true, q2GroupHome: true, q4Psych: true, q4Outpatient: true, q5CareFacility: true, q5FamilyFriends: true });
  expect((await messages(page)).filter((m) => /^(2–3|4–5)\./.test(m)), 'several answers are valid answers').toEqual([]);

  // The PDF prints each ticked row as ticked -- the engine's checklist rows
  // carry "Yes — "/"No — " in the tagged text (the box glyph is decorative),
  // so the text layer says which rows are ticked.
  await page.evaluate(() => (window as any).flushPendingSave());
  await go(page, '/print');
  const button = page.locator('[data-form-action="save-pdf-plan-initial"]');
  await expect(button).toBeEnabled({ timeout: 20_000 });
  const dl = page.waitForEvent('download', { timeout: 40_000 });
  await button.click();
  const text = (await extractPdfText(await readAll(await (await dl).createReadStream()))).replace(/\s+/g, ' ');
  for (const label of ['Assisted Living (ALF)', 'Group Home', 'Routine examination by Psychiatrist/Psychologist', 'Ongoing Treatment Outpatient', 'Care Facility', 'Family and Friends']) {
    expect(text, `${label} is printed ticked`).toContain(`Yes — ${label}`);
  }
  expect(text, 'an unticked row is printed unticked').toContain('No — Ongoing Treatment Inpatient');
  expect(text).not.toContain('Yes — Ongoing Treatment Inpatient');
});

test('question 4: "None" is exclusive with its siblings, in both directions, on the click', async ({ page }) => {
  await freshStartNoPassword(page);
  await createWard(page, 'Initial Plan Q4 None', 'planInitial');
  await fillMinimalValidPlanInitialWard(page);
  await go(page, '/p3');
  await box(page, 'q4Outpatient').check();
  await box(page, 'q4Inpatient').check();
  await box(page, 'q4None').check();
  await expect(box(page, 'q4Outpatient'), 'None clears the siblings').not.toBeChecked();
  await expect(box(page, 'q4Inpatient')).not.toBeChecked();
  await expect(box(page, 'q4None')).toBeChecked();
  expect(await model(page, ['q4Outpatient', 'q4Inpatient', 'q4None'])).toEqual({ q4Outpatient: false, q4Inpatient: false, q4None: true });

  await box(page, 'q4Psych').check();
  await expect(box(page, 'q4None'), 'a sibling clears None').not.toBeChecked();
  await expect(box(page, 'q4Psych')).toBeChecked();
  expect(await model(page, ['q4None', 'q4Psych'])).toEqual({ q4None: false, q4Psych: true });
});

test('"Other" reveals its explanation on the click, a blank explanation blocks, and None on question 4 asks for one too', async ({ page }) => {
  await freshStartNoPassword(page);
  await createWard(page, 'Initial Plan Other Explain', 'planInitial');
  await fillMinimalValidPlanInitialWard(page);

  await go(page, '/p2');
  await expect(page.locator('#main-content #q2Explain')).toHaveCount(0);
  await box(page, 'q2Other').check();
  await expect(page.locator('#main-content #q2Explain'), 'Q2 Other reveals on the click').toBeVisible();
  expect(await messages(page)).toContain('2–3. Setting & Medical Care — Explanation for "Other" residential setting is required');

  await go(page, '/p3');
  await box(page, 'q4Other').check();
  await expect(page.locator('#main-content #q4Explain'), 'Q4 Other reveals on the click').toBeVisible();
  expect(await messages(page)).toContain('4–5. Mental Health & Personal Care — Explanation is required');
  await page.locator('#main-content #q4Explain').fill('Seen by a counselor monthly.');
  await page.locator('#main-content #q4Explain').blur();
  expect((await messages(page)).filter((m) => m.startsWith('4–5.'))).toEqual([]);

  await box(page, 'q5Other').check();
  await expect(page.locator('#main-content #q5Explain'), 'Q5 Other reveals on the click').toBeVisible();
  expect(await messages(page)).toContain('4–5. Mental Health & Personal Care — Explanation for "Other" personal care is required');
});

test('a filing saved under the old one-string shape reads back as one ticked box; free text is kept under Other', async ({ page }) => {
  await freshStartNoPassword(page);
  await createWard(page, 'Initial Plan Legacy Shape', 'planInitial');
  await fillMinimalValidPlanInitialWard(page);
  await page.evaluate(() => {
    const d = (window as any).D;
    for (const k of ['q2ALF', 'q2GroupHome', 'q2Intermediate', 'q2PrivateResidence', 'q2SkilledNursing', 'q2Specialized', 'q2StateHospital', 'q2Other',
      'q4Psych', 'q4Outpatient', 'q4Inpatient', 'q4None', 'q4Other', 'q5CareFacility', 'q5NursesAides', 'q5FamilyFriends', 'q5Other']) delete d[k];
    Object.assign(d, { q2Setting: 'Skilled Nursing', q4Mental: 'Ongoing Treatment Inpatient', q5Personal: 'Family provides personal care assistance', q5Explain: '' });
    (window as any).autoSave();
  });
  await go(page, '/p3');
  const after = await page.evaluate(() => {
    const d = (window as any).D;
    return { q2SkilledNursing: d.q2SkilledNursing, q4Inpatient: d.q4Inpatient, q5Other: d.q5Other, q5Explain: d.q5Explain, legacy: ['q2Setting', 'q4Mental', 'q5Personal'].filter((k) => k in d) };
  });
  expect(after).toEqual({ q2SkilledNursing: true, q4Inpatient: true, q5Other: true, q5Explain: 'Family provides personal care assistance', legacy: [] });
  await expect(box(page, 'q4Inpatient')).toBeChecked();
  await expect(box(page, 'q5Other')).toBeChecked();
});

test('nothing ticked on a question is still an export issue, as it was', async ({ page }) => {
  await freshStartNoPassword(page);
  await createWard(page, 'Initial Plan Nothing Ticked', 'planInitial');
  await fillMinimalValidPlanInitialWard(page);
  await page.evaluate(() => {
    const d = (window as any).D;
    for (const k of ['q2ALF', 'q2GroupHome', 'q2Intermediate', 'q2PrivateResidence', 'q2SkilledNursing', 'q2Specialized', 'q2StateHospital', 'q2Other',
      'q4Psych', 'q4Outpatient', 'q4Inpatient', 'q4None', 'q4Other', 'q5CareFacility', 'q5NursesAides', 'q5FamilyFriends', 'q5Other']) d[k] = false;
    (window as any).autoSave();
  });
  const issues = await messages(page);
  expect(issues).toContain('2–3. Setting & Medical Care — Best-suited residential setting is required');
  expect(issues).toContain('4–5. Mental Health & Personal Care — Mental health service provision is required');
  expect(issues).toContain('4–5. Mental Health & Personal Care — Personal care provision is required');
  expect(await page.evaluate(() => (window as any).computeNavChecks().checks['pi-p3']), 'the sidebar agrees').toBe(false);
});
