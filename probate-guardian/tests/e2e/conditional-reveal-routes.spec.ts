import { test, expect, type Page } from '@playwright/test';
import { freshStartNoPassword, createWard } from './support/target';

// Milestone 67F. A question whose answer reveals another field has to show
// that field on the click. The page is a template re-evaluated only by a
// full render, and src/form-events.js asks for one only when the control
// carries data-form-route -- so a control that gates a reveal but has no
// route leaves the filer looking at a page that did not change. The court
// user's report had three symptoms of this (Annual Plan Q11, Annual Part
// IX, Initial Plan Q2/Q4/Q5); the guard at the bottom found the rest.
//
// Every test here drives the real click (AGENTS.md section 6: never call the
// underlying window function -- that is the only way this bug class gets
// caught). Fixtures that set window.D directly never exercised this path,
// which is why the suite never saw it.

type Offender = { route: string; id: string; path: string; value: string };

/**
 * Clicks every checkbox/radio on the current page that carries no
 * data-form-route, then force-renders the page the way a routed control
 * would have, and reports each one whose click changed the set of fields
 * on the page. That set is the reveal: a control that gates nothing leaves
 * it identical, so this discovers reveal gates by observation rather than
 * by reading the templates -- a new form, or a new "Other (explain)" box on
 * an old one, is covered without anyone editing a list.
 *
 * Runs in the browser in one evaluate() per page: hundreds of controls
 * across six forms, two renders each, and a round trip per click would make
 * this a minutes-long test. element.click() is still the real DOM click --
 * it toggles the control and fires input/change through form-events.js,
 * exactly as a pointer does.
 */
async function sweepUnroutedControls(page: Page, route: string): Promise<Offender[]> {
  await page.evaluate((r) => (window as any).navigate(r), route);
  await expect(page.locator('#main-content')).not.toBeEmpty();
  return page.evaluate(async (r) => {
    const w = window as any;
    const main = document.getElementById('main-content') as HTMLElement;
    const boundPath = (el: HTMLElement) => el.dataset.fieldPath || el.dataset.formPath || el.dataset.annualPath || '';

    // What is on the page, as the filer would notice it: which bound fields
    // exist. Labels, hints and completion markers are deliberately left out
    // so a click that only changes a section's "complete" status is not
    // mistaken for a reveal.
    const signature = () => Array.from(main.querySelectorAll<HTMLInputElement>('input,select,textarea'))
      .filter((el) => boundPath(el))
      .map((el) => `${el.tagName}|${el.type}|${boundPath(el)}|${el.type === 'radio' ? el.value : ''}`)
      .sort()
      .join('\n');

    const getPath = (obj: any, path: string) => path.split('.').reduce((o, k) => (o == null ? o : o[k]), obj);
    const setPath = (obj: any, path: string, value: unknown) => {
      const keys = path.split('.');
      const last = keys.pop() as string;
      const parent = keys.reduce((o, k) => (o[k] ??= {}), obj);
      if (value === undefined) delete parent[last];
      else parent[last] = value;
    };

    const offenders: Offender[] = [];
    const seen = new Set<string>();
    const sweep = async () => {
      const candidates = Array.from(main.querySelectorAll<HTMLInputElement>('input[type="checkbox"],input[type="radio"]'))
        .filter((el) => boundPath(el) && !el.dataset.formRoute)
        // A click on an already-selected radio fires no change event, so it
        // cannot reveal anything; every other option in the group is tried.
        .filter((el) => !(el.type === 'radio' && el.checked))
        .map((el) => ({ id: el.id, path: boundPath(el), value: el.value, type: el.type }))
        .filter((c) => !seen.has(`${c.type}|${c.path}|${c.value}`));
      for (const c of candidates) {
        seen.add(`${c.type}|${c.path}|${c.value}`);
        const el = c.id
          ? document.getElementById(c.id) as HTMLInputElement | null
          : main.querySelector<HTMLInputElement>(`input[type="${c.type}"][data-form-path="${c.path}"][value="${c.value}"]`);
        if (!el) continue;
        const before = signature();
        const prev = getPath(w.D, c.path);
        el.click();
        await w.renderPage(r);
        const after = signature();
        if (after !== before) offenders.push({ route: r, id: c.id, path: c.path, value: c.value });
        setPath(w.D, c.path, prev);
        await w.renderPage(r);
      }
    };

    // Pass 1: the page as a fresh filing shows it.
    await sweep();

    // Pass 2: a reveal can sit inside another reveal -- the "Other" box in
    // the advance-directive checklist exists only once "the ward executed
    // directives" is ticked -- and a fresh filing never shows it. Open every
    // routed checkbox gate (those re-render correctly and are not under
    // test), sweep what they exposed, then put the model back. The model is
    // set directly rather than clicked so the test's own render is the only
    // one running; a click on a routed control would start a second,
    // un-awaited render through form-events.js.
    const gates = Array.from(main.querySelectorAll<HTMLInputElement>('input[type="checkbox"][data-form-route]'))
      .filter((el) => boundPath(el) && !el.checked)
      .map((el) => ({
        path: boundPath(el),
        collection: el.dataset.formChange === 'ensure-directive-row' ? el.dataset.collection || '' : '',
      }))
      .map((g) => ({ ...g, prev: getPath(w.D, g.path), prevCollection: g.collection ? w.D[g.collection] : undefined }));
    if (gates.length) {
      for (const g of gates) {
        setPath(w.D, g.path, true);
        if (g.collection && !(w.D[g.collection] || []).length) w.D[g.collection] = [w.emptyPlanDirective()];
      }
      await w.renderPage(r);
      await sweep();
      for (const g of gates) {
        setPath(w.D, g.path, g.prev);
        if (g.collection) setPath(w.D, g.collection, g.prevCollection);
      }
      await w.renderPage(r);
    }
    return offenders;
  }, route);
}

const PLAN_INITIAL_ROUTES = ['/', '/p2', '/p3', '/p4', '/p5', '/p6', '/p7', '/p8', '/p9', '/p10'];
const PLAN_ANNUAL_ROUTES = ['/', '/p2', '/p3', '/p4', '/p5', '/p6', '/p7', '/p8', '/p9', '/p10', '/p11'];
const PLAN_MINOR_ROUTES = ['/', '/p2', '/p3', '/p4', '/p5', '/p6', '/p7'];
const PLAN_SIMPLIFIED_ROUTES = ['/', '/p2', '/p3'];
const ANNUAL_ROUTES = ['/', '/p2', '/p3', '/p4', '/p5', '/scha', '/schb1', '/schb2', '/schb3', '/schb4', '/schc',
  '/schd1', '/schd2', '/schd3', '/schd4', '/schd5', '/sche', '/schf1', '/schf2', '/p67', '/p8', '/p9', '/p10', '/p11'];
const GUARDIAN_ROUTES = ['/', '/a1', '/a2', '/b1', '/b2', '/b3', '/b4', '/c1', '/c2', '/c3', '/c4', '/c5',
  '/d1', '/d2', '/d3', '/d4', '/d5'];

test.describe('Milestone 67F: answering a question reveals its field on the click', () => {
  // The tester's most damaging symptom. Before this, ticking the box left the
  // *other* branch's name field on screen; the name typed into it was saved
  // as q11ReceivedName, and the validator kept reporting
  // q11NoRemunerationName as missing with a name plainly on the page.
  test('Annual Plan Q11: "NO remuneration" swaps in the declaring-name field, and the typed name lands in it', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'Q11 Reveal Ward', 'planAnnual');
    await page.evaluate(() => (window as any).navigate('/p10'));

    const receivedName = page.locator('#main-content [data-form-path="q11ReceivedName"]');
    const declaringName = page.locator('#main-content [data-form-path="q11NoRemunerationName"]');
    await expect(receivedName, 'unanswered: the received-remuneration branch is shown').toBeVisible();
    await expect(declaringName).toHaveCount(0);

    await page.locator('#q11NoRemuneration').check();

    await expect(declaringName, 'the no-remuneration branch appears on the click').toBeVisible();
    await expect(receivedName, 'and the other branch is gone').toHaveCount(0);
    await expect(page.locator('#q11NoRemuneration'), 'the answer survives the re-render').toBeChecked();

    await declaringName.fill('Jane Guardian');
    await declaringName.dispatchEvent('change');
    const saved = await page.evaluate(() => ({
      declaring: (window as any).D.q11NoRemunerationName,
      received: (window as any).D.q11ReceivedName,
    }));
    expect(saved.declaring).toBe('Jane Guardian');
    expect(saved.received || '').toBe('');
  });

  test('Annual Accounting Part IX: "Restricted depository? Yes" reveals the receipt-date field', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'Depository Reveal Ward', 'annual');
    await page.evaluate(() => (window as any).navigate('/p9'));

    const receiptDate = page.locator('#main-content [data-form-path="restrictedDepositoryReceiptDate"]');
    await expect(receiptDate).toHaveCount(0);

    await page.locator('#yesno_restrictedDepository_yes').check();

    await expect(receiptDate, 'Date of Most Recent Receipt appears on the click').toBeVisible();
    await expect(page.locator('#yesno_restrictedDepository_yes')).toBeChecked();
  });

  test('Initial Plan Q2, Q4 and Q5: choosing "Other" reveals the explanation box', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'Initial Reveal Ward', 'planInitial');

    await page.evaluate(() => (window as any).navigate('/p2'));
    await expect(page.locator('#main-content [data-form-path="q2Explain"]')).toHaveCount(0);
    await page.locator('#q2Setting_7').check(); // Other
    await expect(page.locator('#main-content [data-form-path="q2Explain"]')).toBeVisible();

    await page.evaluate(() => (window as any).navigate('/p3'));
    await expect(page.locator('#main-content [data-form-path="q4Explain"]')).toHaveCount(0);
    await page.locator('#q4Mental_4').check(); // Other
    await expect(page.locator('#main-content [data-form-path="q4Explain"]')).toBeVisible();

    await expect(page.locator('#main-content [data-form-path="q5Explain"]')).toHaveCount(0);
    await page.locator('#q5Personal_3').check(); // Other
    await expect(page.locator('#main-content [data-form-path="q5Explain"]')).toBeVisible();
    await expect(page.locator('#q4Mental_4'), 'Q4 keeps its answer through Q5\'s re-render').toBeChecked();
  });

  // Two of the forms the proposal said to audit before building: they use
  // the same helpers and had the same defect.
  test('Plan Minor Q4: ticking an examination reveals its frequency', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'Minor Reveal Ward', 'planMinor');
    await page.evaluate(() => (window as any).navigate('/p4'));

    const frequency = page.locator('#main-content input[name="radio_q4PrimaryFreq"]');
    await expect(frequency).toHaveCount(0);
    await page.locator('#q4Primary').check();
    await expect(frequency, 'Weekly / Monthly / Annually appear on the click').toHaveCount(3);
  });

  test('Plan Simplified Q8: "Other Advance Directive" reveals its description field', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'Simplified Reveal Ward', 'planSimplified');
    await page.evaluate(() => (window as any).navigate('/p2'));

    const other = page.locator('#main-content [data-form-path="q8OtherText"]');
    await expect(other).toHaveCount(0);
    await page.locator('#q8Other').check();
    await expect(other).toBeVisible();
  });
});

// The guard. This defect recurred because nothing detected it: each fix was
// made at a call site, and the next form reintroduced it. One test per form
// so a failure names the form, and each failure names the exact control.
test.describe('Milestone 67F guard: every control that reveals a field can ask for a re-render', () => {
  const forms: Array<{ label: string; type: string; routes: string[] }> = [
    { label: 'Initial Plan', type: 'planInitial', routes: PLAN_INITIAL_ROUTES },
    { label: 'Annual Plan', type: 'planAnnual', routes: PLAN_ANNUAL_ROUTES },
    { label: 'Plan Minor', type: 'planMinor', routes: PLAN_MINOR_ROUTES },
    { label: 'Plan Simplified', type: 'planSimplified', routes: PLAN_SIMPLIFIED_ROUTES },
    { label: 'Annual Accounting', type: 'annual', routes: ANNUAL_ROUTES },
    { label: 'Guardian Inventory', type: 'guardian', routes: GUARDIAN_ROUTES },
  ];

  for (const form of forms) {
    test(`${form.label}: no unrouted checkbox or radio changes which fields are on its page`, async ({ page }) => {
      await freshStartNoPassword(page);
      await createWard(page, `${form.label} Guard Ward`, form.type);

      const offenders: Offender[] = [];
      for (const route of form.routes) {
        offenders.push(...await sweepUnroutedControls(page, route));
      }

      expect(offenders, [
        `${form.label}: these controls reveal a field but carry no data-form-route, so the field appears`,
        'only after the filer leaves the page and returns. Pass the page route through chkP()/radioP()/',
        'yesNoRadioAnnualHTML() at each call site:',
        ...offenders.map((o) => `  ${o.route}  #${o.id || '(no id)'}  ${o.path}${o.value && o.value !== 'on' ? ` = ${o.value}` : ''}`),
      ].join('\n')).toEqual([]);
    });
  }
});
