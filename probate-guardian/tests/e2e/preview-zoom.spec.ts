import { test, expect, type Page } from '@playwright/test';
import { freshStartNoPassword, createWard, fillMinimalValidGuardianWard, fillMinimalValidPlanSimplifiedWard } from './support/target';

// Milestone 73R part 3 (R3): "Fit height" and "Full width" in Print Preview,
// beside Prev / Next, remembered on this device; pages drawn only as they come
// on screen, within today's canvas memory; notes kept across a size change
// (decision 73R-5); the bar on a one-page Preview too (decision 73R-6).

const preview = (page: Page) => page.evaluate(() => (window as any).GuardianForms.testing.preview.state());

async function waitSettled(page: Page, timeout = 20_000) {
  await expect.poll(async () => (await preview(page))?.settled ?? false, { timeout, intervals: [25] }).toBe(true);
}

/** Opens the Preview and waits for its bar (drawn once every page is in place). */
async function openPreview(page: Page) {
  await page.evaluate(() => (window as any).GuardianForms.testing.save.flush());
  await page.evaluate(() => (window as any).GuardianForms.testing.navigate('/print'));
  await page.locator('#print-doc-container .pdf-page').first().waitFor({ state: 'visible', timeout: 60_000 });
  await page.locator('#pv-bar').waitFor({ state: 'visible', timeout: 60_000 });
}

/** An Inventory; with `accounts`, Schedule B-1 lists that many bank accounts. */
async function inventory(page: Page, accounts = 0) {
  await createWard(page, 'Zoom Inventory', 'guardian');
  await fillMinimalValidGuardianWard(page);
  if (!accounts) return;
  await page.evaluate((n) => {
    const t = (window as any).GuardianForms.testing;
    const d = t.snapshot().filing;
    d.scheduleB1 = Array.from({ length: n }, (_, i) => ({
      institutionName: `Bank ${i + 1}`, accountNumber: `ACCT-${i + 1}`,
      streetAddress: `${i + 1} Main St`, cityStateZip: 'Clearwater, FL 33755',
      restricted: 'No', accountType: 'Checking', fullAssetAmount: 1000 + i, wardPercent: 100,
    }));
    // fillMinimalValidGuardianWard() marks every schedule "no items".
    if (d.scheduleNoItems) d.scheduleNoItems.b1 = false;
    t.replaceFiling(d);
  }, accounts);
}

/** Every Preview canvas's pixels, summed: the canvas memory a Preview holds. */
const liveCanvasPixels = (page: Page) => page.evaluate(() =>
  [...document.querySelectorAll('#print-doc-container .pdf-page canvas')]
    .reduce((sum, c) => sum + (c as HTMLCanvasElement).width * (c as HTMLCanvasElement).height, 0));

const fitHeight = (page: Page) => page.getByRole('button', { name: 'Fit height' });
const fullWidth = (page: Page) => page.getByRole('button', { name: 'Full width' });

test.describe('Milestone 73R part 3: Fit height and Full width in Print Preview', () => {
  test('the two buttons sit beside Prev / Next, say which is on, and size the page to the window', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await freshStartNoPassword(page);
    await inventory(page);
    await openPreview(page);

    const next = page.locator('#pv-next');
    for (const button of [fitHeight(page), fullWidth(page)]) {
      await expect(button).toHaveAttribute('aria-pressed', 'false');
      const [b, n] = [await button.boundingBox(), await next.boundingBox()];
      expect(Math.abs(b!.y - n!.y), 'on the same line as Next').toBeLessThan(4);
      expect(b!.x, 'after Next').toBeGreaterThan(n!.x);
    }
    const firstPage = page.locator('#print-doc-container .pdf-page').first();
    expect((await firstPage.boundingBox())!.width, 'the usual size: a Letter page 918px wide').toBeCloseTo(918, 0);

    // Fit height: Next brings a whole page into the window, below the bar.
    await fitHeight(page).click();
    await expect(fitHeight(page)).toHaveAttribute('aria-pressed', 'true');
    await expect(fullWidth(page)).toHaveAttribute('aria-pressed', 'false');
    await waitSettled(page);
    await next.click();
    const second = page.locator('#print-doc-container .pdf-page.pv-show');
    await expect.poll(async () => {
      const [box, bar] = [await second.boundingBox(), await page.locator('#pv-bar').boundingBox()];
      const viewport = page.viewportSize()!;
      return !!box && !!bar && box.y >= bar.y + bar.height && box.y + box.height <= viewport.height;
    }, { timeout: 5_000, message: 'the whole page shows between the bar and the window\'s bottom edge' }).toBe(true);
    expect((await second.boundingBox())!.height, 'and fills most of it').toBeGreaterThan(page.viewportSize()!.height * 0.6);

    // Full width: the page spans the Preview, which drops its 9.5in cap.
    await fullWidth(page).click();
    await expect(fullWidth(page)).toHaveAttribute('aria-pressed', 'true');
    await expect(fitHeight(page)).toHaveAttribute('aria-pressed', 'false');
    await waitSettled(page);
    const across = await page.evaluate(() => {
      const c = document.getElementById('print-doc-container')!;
      const p = c.querySelector('.pdf-page.pv-show') as HTMLElement;
      return { maxWidth: getComputedStyle(c).maxWidth, container: c.clientWidth, pageWidth: p.getBoundingClientRect().width, overflow: c.scrollWidth - c.clientWidth };
    });
    expect(across.maxWidth).toBe('none');
    expect(across.pageWidth, 'the page spans the Preview').toBeGreaterThan(across.container - 8);
    expect(across.overflow, 'no sideways scroll').toBeLessThanOrEqual(0);

    // Pressing the chosen size again returns to the usual one.
    await fullWidth(page).click();
    await expect(fullWidth(page)).toHaveAttribute('aria-pressed', 'false');
    await expect(fitHeight(page)).toHaveAttribute('aria-pressed', 'false');
    await waitSettled(page);
    expect((await second.boundingBox())!.width).toBeCloseTo(918, 0);
    expect(errors, `page errors: ${errors.join('\n')}`).toEqual([]);
  });

  test('the size is remembered on this device, never in the case file', async ({ page }) => {
    await freshStartNoPassword(page);
    await inventory(page);
    await openPreview(page);
    await fullWidth(page).click();
    await waitSettled(page);

    await page.evaluate(() => (window as any).GuardianForms.testing.navigate('/'));
    await openPreview(page);
    await expect(fullWidth(page)).toHaveAttribute('aria-pressed', 'true');
    await expect.poll(async () => (await preview(page))?.mode).toBe('full-width');
    expect(await page.evaluate(() => localStorage.getItem('pg-preview-zoom-v1'))).toBe('full-width');
    expect(await page.evaluate(() => JSON.stringify((window as any).GuardianForms.testing.snapshot())), 'not in the case file').not.toContain('full-width');
  });

  test('a one-page Preview gets the bar and its two buttons too (decision 73R-6)', async ({ page }) => {
    // No filing prints a single page today -- every type's Preview is four
    // pages or more -- so this builds the shared bar over a Preview cut to its
    // first page, as a future one-page form would draw it.
    await freshStartNoPassword(page);
    await createWard(page, 'Zoom One Page', 'planSimplified');
    await fillMinimalValidPlanSimplifiedWard(page);
    await openPreview(page);
    await page.evaluate(async () => {
      const c = document.getElementById('print-doc-container')!;
      [...c.querySelectorAll('.pdf-page')].slice(1).forEach((p) => p.remove());
      document.getElementById('pv-bar')?.remove();
      const { initPrintPager } = await import('/probate-guardian/src/core/ui/print-pager.js');
      initPrintPager();
    });
    await expect(page.locator('#pv-bar')).toBeVisible();
    await expect(page.locator('#pv-count')).toHaveText('Page 1 of 1');
    await expect(fitHeight(page)).toBeVisible();
    await fitHeight(page).click();
    await expect(fitHeight(page)).toHaveAttribute('aria-pressed', 'true');
  });

  test('notes are kept, in place, across a size change, and a new note lands where it is placed (decision 73R-5)', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await freshStartNoPassword(page);
    await createWard(page, 'Zoom Notes', 'planSimplified');
    await fillMinimalValidPlanSimplifiedWard(page);
    await openPreview(page);
    const pdfPage = page.locator('#print-doc-container .pdf-page').first();

    await page.locator('[data-annotate-action="toggle"]').click();
    await page.locator('[data-annotate-action="note"]').click();
    let box = (await pdfPage.boundingBox())!;
    await pdfPage.click({ position: { x: box.width * 0.6, y: box.height * 0.3 } });
    await page.keyboard.type('Kept across zoom');

    const where = async (editor: ReturnType<Page['locator']>) => {
      const [p, e] = [(await pdfPage.boundingBox())!, (await editor.boundingBox())!];
      return { x: (e.x - p.x) / p.width, y: (e.y - p.y) / p.height };
    };
    const note = pdfPage.locator('.freeTextEditor').first();
    const before = await where(note);

    await fullWidth(page).click();
    await waitSettled(page);
    expect((await pdfPage.boundingBox())!.width, 'the page grew').toBeGreaterThan(918);
    await expect(pdfPage.locator('.freeTextEditor')).toHaveCount(1);
    await expect(note).toContainText('Kept across zoom');
    const after = await where(note);
    expect(Math.abs(after.x - before.x), 'the note stays where it was across the page').toBeLessThan(0.01);
    expect(Math.abs(after.y - before.y), 'and down it').toBeLessThan(0.01);

    // At the new size, a new note lands at the click, not off by the size
    // change. (A click while a filled note is active only closes that note --
    // pdf.js's own rule -- so the first click goes to an empty corner.)
    box = (await pdfPage.boundingBox())!;
    await pdfPage.click({ position: { x: box.width * 0.95, y: box.height * 0.5 } });
    await pdfPage.click({ position: { x: box.width * 0.2, y: box.height * 0.7 } });
    await page.keyboard.type('Placed after zoom');
    const second = pdfPage.locator('.freeTextEditor', { hasText: 'Placed after zoom' });
    await expect(second).toHaveCount(1);
    const placed = await where(second);
    expect(Math.abs(placed.x - 0.2), 'across').toBeLessThan(0.03);
    expect(Math.abs(placed.y - 0.7), 'down').toBeLessThan(0.03);

    // What the filer saves carries both notes where they were put.
    // (Clear of the backup reminder in the window's bottom-right corner.)
    await pdfPage.click({ position: { x: box.width * 0.45, y: box.height * 0.92 } });
    const download = page.waitForEvent('download', { timeout: 10_000 });
    await page.locator('[data-annotate-action="save"]').click();
    await download;
    const saved = await page.evaluate(async () => {
      const D = (window as any).GuardianForms.testing.snapshot().filing;
      const { ensurePdfjs } = await import('/probate-guardian/src/core/pdf/pdfjs-loader.js');
      const pdfjsLib = await ensurePdfjs();
      const binary = atob(D.printAnnotations.pdfBytes);
      const raw = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) raw[i] = binary.charCodeAt(i);
      const stream = new Blob([raw]).stream().pipeThrough(new DecompressionStream('gzip'));
      const doc = await pdfjsLib.getDocument({ data: new Uint8Array(await new Response(stream).arrayBuffer()) }).promise;
      const page1 = await doc.getPage(1);
      const [, , w, h] = page1.view;
      return (await page1.getAnnotations({ intent: 'display' }))
        .filter((a: any) => a.subtype === 'FreeText')
        .map((a: any) => ({ text: a.contentsObj?.str ?? a.contents ?? '', x: a.rect[0] / w, y: (h - a.rect[3]) / h }));
    });
    const kept = saved.find((a: any) => a.text.includes('Kept across zoom'));
    const later = saved.find((a: any) => a.text.includes('Placed after zoom'));
    expect(kept, JSON.stringify(saved)).toBeTruthy();
    expect(later, JSON.stringify(saved)).toBeTruthy();
    expect(Math.abs(kept.x - before.x)).toBeLessThan(0.03);
    expect(Math.abs(kept.y - before.y)).toBeLessThan(0.03);
    expect(Math.abs(later.x - 0.2)).toBeLessThan(0.03);
    expect(Math.abs(later.y - 0.7)).toBeLessThan(0.03);
    expect(errors, `page errors: ${errors.join('\n')}`).toEqual([]);
  });
});

test.describe('Milestone 73R part 3 acceptance: a long Inventory on a 2,560px screen at pixel ratio 2', () => {
  test.use({ viewport: { width: 2560, height: 1440 }, deviceScaleFactor: 2 });

  test('holds no more canvas than drawing every page at 1.5x did, and each size change settles within 2 seconds', async ({ page }, testInfo) => {
    test.setTimeout(180_000);
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => { if (m.type() === 'error') errors.push(`console: ${m.text()}`); });
    await freshStartNoPassword(page);
    await inventory(page, 200);
    await openPreview(page);
    await page.locator('#pv-select').selectOption('all');
    // Sharper than before: the page on screen is drawn for the screen's pixel
    // ratio (today: 918px wide on any screen).
    await expect.poll(() => page.locator('#print-doc-container .pdf-page canvas').first().evaluate((c) => (c as HTMLCanvasElement).width),
      { timeout: 20_000, message: 'drawn for a pixel ratio of 2' }).toBe(1836);
    await waitSettled(page);

    // Today's render drew every page's canvas at 1.5x: one per page box at the usual size.
    const { pages, today } = await page.evaluate(() => {
      const boxes = [...document.querySelectorAll('#print-doc-container .pdf-page')] as HTMLElement[];
      return { pages: boxes.length, today: boxes.reduce((sum, b) => sum + parseFloat(b.style.width) * parseFloat(b.style.height), 0) };
    });
    expect(pages, 'a long Inventory').toBeGreaterThanOrEqual(19);
    let peak = await liveCanvasPixels(page);
    expect(peak).toBeLessThanOrEqual(today);

    const timings: Record<string, number> = {};
    const measure = async (label: string, press: () => Promise<void>) => {
      const started = Date.now();
      await press();
      await waitSettled(page, 10_000);
      timings[label] = Date.now() - started;
      expect(timings[label], `${label} settles within 2 seconds`).toBeLessThanOrEqual(2_000);
      const live = await liveCanvasPixels(page);
      peak = Math.max(peak, live);
      expect(live, `${label}: canvas memory`).toBeLessThanOrEqual(today);
    };
    await measure('Fit height', () => fitHeight(page).click());
    await measure('Full width', () => fullWidth(page).click());

    // Scrolling down a Full width Preview draws each page as it comes and lets the others go.
    for (const index of [4, 9, 14, pages - 1]) {
      await page.locator('#print-doc-container .pdf-page').nth(index).scrollIntoViewIfNeeded();
      await waitSettled(page);
      expect(await page.locator('#print-doc-container .pdf-page').nth(index).getAttribute('data-drawn-scale'), `page ${index + 1} is drawn`).not.toBeNull();
      const live = await liveCanvasPixels(page);
      peak = Math.max(peak, live);
      expect(live, `at page ${index + 1}: canvas memory`).toBeLessThanOrEqual(today);
    }

    // A size change while pages are still drawing cancels those draws first.
    await fitHeight(page).click();
    await fullWidth(page).click();
    await measure('back to the usual size', () => fullWidth(page).click());
    expect((await preview(page)).scale).toBe(1.5);

    testInfo.annotations.push({ type: 'measured', description: JSON.stringify({ pages, today, peak, timings }) });
    expect(errors, `page errors: ${errors.join('\n')}`).toEqual([]);
  });
});
