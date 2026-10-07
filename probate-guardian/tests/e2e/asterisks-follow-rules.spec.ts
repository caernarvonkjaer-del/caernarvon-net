import { expect, test, type Page } from '@playwright/test';
import {
  freshStartNoPassword, createWard, createSimplifiedWard, dismissScheduleDocPrompt,
  fillMinimalValidGuardianWard, fillMinimalValidAnnualWard, fillMinimalValidSimplifiedWard,
  fillMinimalValidPlanAnnualWard, fillMinimalValidPlanInitialWard, fillMinimalValidPlanMinorWard, fillMinimalValidPlanSimplifiedWard,
} from './support/target';

// Milestone 73F part 3 (requester, 2026-10-05): a red asterisk means the export
// checks will stop on that field when it is blank, and nothing else. Before
// this, ~70 labels across the nine forms disagreed -- a starred Signature Date
// the court doesn't need, an unstarred "Amended Form?" that blocked Print.
//
// For each form: open a minimal valid filing, visit every page, add one row
// to every list, fill the rows' blanks, then for each control ask the export
// checks whether blanking that one field (and nothing else) blocks output
// (testing.validate.requiredPaths). The answer must match whether the
// control's label -- or the question, group or table heading that labels it --
// carries an asterisk.
//
// A heading that labels several controls is "required" when any one of them
// is: a radio pair, a check-box group ("choose at least one") or a rating
// table is starred as a whole.

const T = (page: Page, fn: string, ...args: unknown[]) => page.evaluate(({ fn, args }) => {
  const t = (window as any).GuardianForms.testing;
  return fn.split('.').reduce((o: any, k: string) => o[k], t)(...args);
}, { fn, args });

const FORMS: Array<[string, (p: Page) => Promise<void>]> = [
  ['guardian', async (p) => { await createWard(p, 'Stars Inv', 'guardian'); await fillMinimalValidGuardianWard(p); }],
  ['annual', async (p) => { await createWard(p, 'Stars Ann', 'annual'); await fillMinimalValidAnnualWard(p); }],
  ['simplified', async (p) => { await createSimplifiedWard(p, 'Stars Simp'); await fillMinimalValidSimplifiedWard(p); }],
  ['planAnnual', async (p) => { await createWard(p, 'Stars PA', 'planAnnual'); await fillMinimalValidPlanAnnualWard(p); }],
  ['planInitial', async (p) => { await createWard(p, 'Stars PI', 'planInitial'); await fillMinimalValidPlanInitialWard(p); }],
  ['planMinor', async (p) => { await createWard(p, 'Stars PM', 'planMinor'); await fillMinimalValidPlanMinorWard(p); }],
  ['planSimplified', async (p) => { await createWard(p, 'Stars PS', 'planSimplified'); await fillMinimalValidPlanSimplifiedWard(p); }],
];

// Starred on purpose although clearing one alone never blocks Preview. Each
// must still turn up, so one that stops disagreeing is removed from here
// rather than left.
//  - Either-or pairs: each is half of a pair, and the pair is required.
//  - Fields 73B will require (decided): kept starred until it adds the
//    checks, by the requester's choice (2026-10-06).
const EXEMPT: Array<{ form: string; path: RegExp; why: string }> = [
  { form: 'annual', path: /^schC\.\d+\.(gain|loss)$/, why: 'Schedule C: a gain or a loss' },
  { form: 'annual', path: /^schE\.\d+\.transfer(In|Out)(Date|Amt)$/, why: 'Schedule E: a transfer in or a transfer out' },
  { form: 'planMinor', path: /^ucn$/, why: 'the Plan for Minors case number: Milestone 73S settles it' },
  { form: 'guardian', path: /^scheduleA2\.\d+\.liabilityType$/, why: 'A-2 liability Type: 73B will require it' },
  { form: 'guardian', path: /^scheduleB4\.\d+\.liabilityType$/, why: 'B-4 liability Type: 73B will require it' },
  { form: 'guardian', path: /^scheduleC1\.\d+\.frequencyOfPayment$/, why: 'C-1 payment Frequency: 73B will require it' },
  { form: 'guardian', path: /^scheduleC4\.\d+\.trustType$/, why: 'C-4 Type of Trust: 73B will require it' },
  { form: 'annual', path: /^typeOfGuardianship$/, why: 'Type of Guardianship on the Annual family: 73B will require it' },
];

// In the page: each visible, editable control with a path, and the element
// that carries (or should carry) its asterisk.
const SCAN = () => {
  const out: any[] = [];
  const seen = new Set<string>();
  const main = document.querySelector('#main-content')!;
  const controls = main.querySelectorAll(['input', 'select', 'textarea'].flatMap((tag) =>
    ['data-form-path', 'data-annual-path', 'data-field-path', 'data-bind'].map((attr) => `${tag}[${attr}]`)).join(', '));
  const labelOf = (el: HTMLElement): HTMLElement | null => {
    const isChoice = /radio|checkbox/.test((el as HTMLInputElement).type || '');
    const named = document.getElementById((el.getAttribute('aria-labelledby') || '').split(/\s+/)[0]);
    if (named) return named;
    if (el.id && !isChoice) { const l = main.querySelector(`label[for="${CSS.escape(el.id)}"]`); if (l) return l as HTMLElement; }
    const question = el.closest('.plan-question');
    const questionTitle = question?.querySelector(':scope > h2') as HTMLElement | null;
    if (isChoice) {
      const fs = el.closest('fieldset'); if (fs) { const lg = fs.querySelector('legend'); if (lg) return lg as HTMLElement; }
      const grid = el.closest('.plan-check-grid');
      const groupLabel = grid?.parentElement?.querySelector(':scope > label.form-label') as HTMLElement | null;
      if (groupLabel && groupLabel.textContent?.trim()) return groupLabel;
    }
    const table = el.closest('table');
    if (table) {
      const caption = table.querySelector(':scope > caption') as HTMLElement | null;
      if (caption) return caption;
      if (questionTitle) return questionTitle;
      const pageTitle = el.closest('.schedule-page')?.querySelector(':scope > h1') as HTMLElement | null;
      if (pageTitle) return pageTitle;
    }
    if (isChoice && questionTitle) return questionTitle;
    const fs = el.closest('fieldset'); if (fs) { const lg = fs.querySelector('legend'); if (lg) return lg as HTMLElement; }
    let node: HTMLElement | null = el.parentElement;
    for (let depth = 0; node && depth < 4; depth++, node = node.parentElement) {
      const cand = node.querySelector(':scope > label, :scope > .form-label, :scope > .line-label, :scope > legend, :scope > div > label.form-label');
      if (cand && cand !== el && !(cand as HTMLElement).contains(el)) return cand as HTMLElement;
    }
    return null;
  };
  let hostSeq = 0;
  controls.forEach((node) => {
    const el = node as HTMLInputElement;
    if (el.offsetParent === null || el.disabled || el.readOnly) return;
    const path = el.dataset.formPath || el.dataset.annualPath || el.dataset.fieldPath || el.dataset.bind || '';
    if (!path || seen.has(path)) return;
    seen.add(path);
    const label = labelOf(el);
    if (label && !label.dataset.starHost) label.dataset.starHost = String(++hostSeq);
    out.push({
      path, kind: el.dataset.fieldKind || el.type, tag: el.tagName,
      host: label?.dataset.starHost || `path:${path}`, starred: !!label?.querySelector('.req'),
      label: (label?.textContent || '(no label found)').replace(/\s+/g, ' ').trim().slice(0, 70),
    });
  });
  return out;
};

const valueFor = (c: { tag: string; kind: string; path: string }) => {
  if (c.tag === 'SELECT' || c.kind === 'checkbox' || c.kind === 'radio') return null;
  if (/date/i.test(c.kind) || /date/i.test(c.path.split('.').pop() || '')) return '2026-06-01';
  if (/money|percent|decimal|number/.test(c.kind)) return 50;
  return 'Test';
};

for (const [form, make] of FORMS) {
  test(`${form}: every asterisk marks a field the export checks require, and every required field has one`, async ({ page }) => {
    test.setTimeout(600_000);
    await freshStartNoPassword(page);
    await make(page);
    const routes: string[] = await page.evaluate(() => [...new Set([...document.querySelectorAll('[data-form-action="navigate"][data-route], [data-nav][data-route]')]
      .map((b) => (b as HTMLElement).dataset.route || ''))]
      .filter((r) => r && !['/print', '/summary', '/dashboard'].includes(r)));
    expect(routes.length, 'the sidebar lists the form\'s pages').toBeGreaterThan(1);

    const disagreements: string[] = [];
    const exemptionsSeen = new Set<string>();
    for (const route of routes) {
      await T(page, 'navigate', route);
      await dismissScheduleDocPrompt(page).catch(() => {});
      const adds = page.locator('#main-content [data-annual-action="add-row"], #main-content [data-inventory-action="add-entry"], #main-content [data-simplified-action="add-remuneration"], #main-content [data-form-action="add-plan-row"]');
      const n = await adds.count();
      for (let i = 0; i < n; i++) {
        await adds.nth(0).click().catch(() => {});
        await dismissScheduleDocPrompt(page).catch(() => {});
      }
      let controls = await page.evaluate(SCAN);
      // Fill the rows' blanks, so a row field is judged in a row that is in use.
      const fills: Record<string, unknown> = {};
      for (const c of controls) {
        if (!/\.\d+\./.test(c.path)) continue;
        const current = await T(page, 'field', c.path);
        if (current !== '' && current != null) continue;
        const v = valueFor(c);
        if (v !== null) fills[c.path] = v;
      }
      if (Object.keys(fills).length) {
        await T(page, 'patchFiling', fills);
        await T(page, 'navigate', '/');
        await T(page, 'navigate', route);
        await dismissScheduleDocPrompt(page).catch(() => {});
        controls = await page.evaluate(SCAN);
      }
      const compare = async (scanned: any[], when: string) => {
        const required = new Set(await T(page, 'validate.requiredPaths', scanned.map((c: any) => c.path)) as string[]);
        const hosts = new Map<string, { label: string; starred: boolean; req: boolean; paths: string[] }>();
        for (const c of scanned) {
          const h = hosts.get(c.host) || { label: c.label, starred: c.starred, req: false, paths: [] };
          h.req = h.req || required.has(c.path);
          h.paths.push(c.path);
          hosts.set(c.host, h);
        }
        for (const h of hosts.values()) {
          if (h.req === h.starred) continue;
          const exemption = EXEMPT.find((x) => x.form === form && h.paths.some((p) => x.path.test(p)));
          if (exemption) { exemptionsSeen.add(exemption.why); continue; }
          disagreements.push(`${route}${when}  "${h.label}"  ${h.paths.join(', ')}: ${h.req ? 'required, but has no asterisk' : 'has an asterisk, but is not required'}`);
        }
      };
      await compare(controls, '');
      // A signature's date is required only under "/s/" Signed: look again
      // with every block on the page that offers it signed that way.
      const signed = page.locator('#main-content input[type="radio"][value="typed"]');
      const offered = await signed.count();
      if (offered) {
        for (let i = 0; i < offered; i++) await signed.nth(i).check();
        await compare(await page.evaluate(SCAN), ' (with "/s/" Signed)');
      }
    }
    expect(disagreements, 'asterisks that disagree with the export checks').toEqual([]);
    expect([...exemptionsSeen].sort(), 'each exemption still needed').toEqual(EXEMPT.filter((x) => x.form === form).map((x) => x.why).sort());
  });
}
