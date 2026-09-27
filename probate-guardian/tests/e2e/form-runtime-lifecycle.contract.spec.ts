import { test, expect, type Page } from '@playwright/test';
import { freshStartNoPassword, createWard, createSimplifiedWard } from './support/target';

// Milestone 70, 70F gate: "Repeated mount/unmount does not duplicate a
// listener, observer, autosave call, or validation update. An edit followed by
// rapid route navigation or filing switching saves the old filing exactly
// once and cannot write its data into the newly active filing."
//
// Observed from outside the app by an init script in the page's own world:
// every save writes the recovery snapshot while the case has changes since its
// last export, so its writes are counted and read back; event listeners on the
// window, the document and connected elements, and the observers and intervals
// still live, are counted as the page adds and removes them. (The test
// runner's own listeners live in its isolated world and are not seen.) The app
// itself is reached only through GuardianForms.testing and the real page.

async function instrument(page: Page) {
  await page.addInitScript(() => {
    const probe: any = { writes: [] as string[], listeners: [] as any[], observers: new Set(), intervals: new Set() };
    (globalThis as any).__formRuntimeProbe = probe;
    const put = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function (value: any, key?: any) {
      if (this.name === 'snapshot' && key === 'current') probe.writes.push(JSON.stringify(value));
      return put.apply(this, arguments as any);
    };
    const add = EventTarget.prototype.addEventListener;
    const remove = EventTarget.prototype.removeEventListener;
    const capture = (o: any) => (typeof o === 'boolean' ? o : !!(o && o.capture));
    const find = (t: any, type: string, l: any, c: boolean) => probe.listeners.findIndex((r: any) => r.t === t && r.type === type && r.l === l && r.c === c);
    EventTarget.prototype.addEventListener = function (type: string, listener: any, options?: any) {
      const c = capture(options);
      const signal = options && typeof options === 'object' ? options.signal : null;
      if (listener && !(options && options.once) && !(signal && signal.aborted) && find(this, type, listener, c) < 0) {
        const rec = { t: this, type, l: listener, c };
        probe.listeners.push(rec);
        if (signal) add.call(signal, 'abort', () => { const i = probe.listeners.indexOf(rec); if (i >= 0) probe.listeners.splice(i, 1); }, { once: true });
      }
      return add.call(this, type, listener, options);
    };
    EventTarget.prototype.removeEventListener = function (type: string, listener: any, options?: any) {
      const i = find(this, type, listener, capture(options));
      if (i >= 0) probe.listeners.splice(i, 1);
      return remove.call(this, type, listener, options);
    };
    for (const Ctor of [MutationObserver, ResizeObserver, IntersectionObserver] as any[]) {
      const observe = Ctor.prototype.observe;
      const disconnect = Ctor.prototype.disconnect;
      Ctor.prototype.observe = function (...args: any[]) { probe.observers.add(this); return observe.apply(this, args); };
      Ctor.prototype.disconnect = function () { probe.observers.delete(this); return disconnect.apply(this); };
    }
    const setI = globalThis.setInterval;
    const clearI = globalThis.clearInterval;
    (globalThis as any).setInterval = function (...args: any[]) { const id = (setI as any).apply(this, args); probe.intervals.add(id); return id; };
    (globalThis as any).clearInterval = function (id: any) { probe.intervals.delete(id); return clearI.call(this, id); };
  });
}

/** Every save since the page loaded: each filing's data by id. */
const saves = (page: Page) => page.evaluate(() => ((globalThis as any).__formRuntimeProbe.writes as string[]).map((s) => {
  const v = JSON.parse(s);
  return Object.fromEntries(v.wards.map((w: any) => [w.wardId, JSON.parse(String(w.enc).slice('PLAIN:'.length))]));
}));
/** What is live on the page: listeners on the window, the document and connected elements, observers, intervals. */
const live = (page: Page) => page.evaluate(() => {
  const p = (globalThis as any).__formRuntimeProbe;
  const listeners = p.listeners.filter((r: any) => r.t === window || r.t === document || (r.t instanceof Node && r.t.isConnected)).length;
  return { listeners, observers: p.observers.size, intervals: p.intervals.size };
});
const openFiling = (page: Page, id: string) => page.evaluate((fid) => (window as any).GuardianForms.testing.activateFiling.open(fid), id);
const openFilingId = (page: Page) => page.evaluate(() => (window as any).GuardianForms.testing.snapshot().filing.wardId as string);
const filingById = (page: Page, id: string) => page.evaluate((fid) => (window as any).GuardianForms.testing.snapshot().caseFile.wards.find((w: any) => w.wardId === fid), id);
const settle = (page: Page) => page.waitForTimeout(2500); // past autoSave()'s one-second debounce
const FIELD = 'input[type="text"][data-form-path]:visible, input[type="text"][data-annual-path]:visible, input[type="text"][data-field-path]:visible';
const pathOf = async (field: ReturnType<Page['locator']>) => (await field.getAttribute('data-form-path'))
  || (await field.getAttribute('data-annual-path')) || (await field.getAttribute('data-field-path'));

async function create(page: Page, name: string, type: string) {
  if (type === 'simplified') await createSimplifiedWard(page, name);
  else await createWard(page, name, type);
  return openFilingId(page);
}

test.describe('the shared form runtime across mounts, navigation and filing switches', () => {
  for (const type of ['guardian', 'simplified', 'annual', 'planSimplified', 'planAnnual', 'planInitial', 'planMinor']) {
    test(`${type}: repeated mount and unmount leaves no listener, observer or interval behind, and an edit afterwards saves once`, async ({ page }) => {
      test.setTimeout(180_000);
      await instrument(page);
      await freshStartNoPassword(page);
      const id = await create(page, 'Mount Cycles', type);
      const cycle = async () => {
        const routes = await page.locator('[data-page]:visible, [data-route]:visible').evaluateAll(
          (els) => [...new Set(els.map((e) => (e as HTMLElement).dataset.page || (e as HTMLElement).dataset.route).filter(Boolean))].slice(0, 4));
        for (const route of routes) await page.evaluate((r) => (window as any).GuardianForms.testing.navigate(r), route);
        await page.evaluate(() => (window as any).GuardianForms.testing.activateFiling.close());
        // As a filer does: the dashboard is on the page before the filing is
        // opened again. (Opening one while the dashboard is still loading can
        // leave the dashboard drawn over it -- a mount race Milestone 12
        // recorded, which 70K's router and feature context arbitrate; it is not
        // what this test measures.)
        await expect(page.locator('#main-content [data-dashboard-bound="true"]')).toBeVisible();
        await openFiling(page, id);
        await page.evaluate(() => (window as any).GuardianForms.testing.navigate('/'));
        // Counted once the Cover is on the page: a feature loads on its first
        // opening, and its fields arrive with it.
        await expect(page.locator(FIELD).first()).toBeVisible();
        await page.waitForTimeout(200);
        return live(page);
      };
      // The first cycle warms up what is created once; every later one must
      // leave the page as it found it.
      const baseline = await cycle();
      for (let i = 0; i < 3; i++) expect(await cycle(), `${type}, cycle ${i + 2} against cycle 1`).toEqual(baseline);

      await settle(page);
      const before = (await saves(page)).length;
      const field = page.locator(FIELD).first();
      await field.click();
      await field.press('End');
      await field.pressSequentially(' Once');
      await field.blur();
      await settle(page);
      expect((await saves(page)).length - before, 'one edit, one save').toBe(1);
    });
  }

  for (const type of ['planAnnual', 'annual', 'simplified']) {
    test(`${type}: an edit, then switching filings at once, saves the old filing with the edit, adds no save of its own, and never writes into the new one`, async ({ page }) => {
      await instrument(page);
      await freshStartNoPassword(page);
      const a = await create(page, 'Filing A', type);
      const b = await create(page, 'Filing B', type);
      await openFiling(page, a);
      await settle(page);

      // What a switch saves on its own: the flush, and the recent-filings
      // list the opened filing joins (it is saved with the case).
      let n = (await saves(page)).length;
      await openFiling(page, b);
      await settle(page);
      const plainSwitch = (await saves(page)).length - n;
      await openFiling(page, a);
      await settle(page);

      const field = page.locator(FIELD).first();
      const path = await pathOf(field);
      const bBefore = (await filingById(page, b))[path!];
      n = (await saves(page)).length;
      await field.click();
      await field.press('End');
      await field.pressSequentially(' Edited');
      await openFiling(page, b); // the field still has focus
      await settle(page);

      expect(await openFilingId(page)).toBe(b);
      const aAfter = (await filingById(page, a))[path!];
      expect(String(aAfter)).toMatch(/Edited$/);
      expect((await filingById(page, b))[path!], 'the new filing keeps its own value').toBe(bBefore);
      const written = (await saves(page)).slice(n);
      expect(written.length, 'the edit adds no save to the switch').toBe(plainSwitch);
      for (const save of written) {
        expect(save[a][path!], 'every save carries the edit in the old filing').toBe(aAfter);
        expect(save[b][path!], 'and the new filing as it was').toBe(bBefore);
      }
    });
  }

  test('a field only focused, then switching filings at once, writes nothing into the new filing', async ({ page }) => {
    await instrument(page);
    await freshStartNoPassword(page);
    const a = await create(page, 'Filing A', 'planAnnual');
    const b = await create(page, 'Filing B', 'planAnnual');
    await openFiling(page, a);
    await settle(page);
    const field = page.locator(FIELD).first();
    const path = await pathOf(field);
    const bBefore = (await filingById(page, b))[path!];
    await field.click();
    await openFiling(page, b);
    await settle(page);
    expect((await filingById(page, b))[path!]).toBe(bBefore);
  });

  test('an edit, then navigating at once, saves the filing once, with the edit', async ({ page }) => {
    await instrument(page);
    await freshStartNoPassword(page);
    const a = await create(page, 'Filing A', 'planAnnual');
    await page.evaluate(() => (window as any).GuardianForms.testing.navigate('/'));
    await settle(page);
    const field = page.locator(FIELD).first();
    const path = await pathOf(field);
    const before = (await saves(page)).length;
    await field.click();
    await field.press('End');
    await field.pressSequentially(' Edited');
    await page.evaluate(() => (window as any).GuardianForms.testing.navigate('/p2'));
    await settle(page);
    const value = (await filingById(page, a))[path!];
    expect(String(value)).toMatch(/Edited$/);
    const written = (await saves(page)).slice(before);
    expect(written.length, 'one save').toBe(1);
    expect(written[0][a][path!]).toBe(value);
  });
});
