import { test, expect, type Page } from '@playwright/test';
import { freshStartNoPassword, createWard, fillMinimalValidPlanSimplifiedWard, reopenFilingWithStoredShape } from './support/target';

// Milestone 77D: a drawn signature prints at its size, on its line. A
// guardian's mouse-drawn signature printed small and over its own heading
// ("Guardian #1" on her screenshot): the whole 600 x 180 drawing box was saved,
// empty space and all, and the image was drawn from 6pt down the block -- the
// heading's baseline is 12pt down -- at most 28pt tall. Now a signature is
// saved trimmed to its ink, prints below its heading with its bottom on the
// line, up to 36pt tall (decision 77D-1), and one saved before is trimmed
// when its filing is opened, once, with an Activity Log entry (77D-2).

const field = (page: Page, path: string) => page.evaluate((p) => (window as any).GuardianForms.testing.field(p), path);
const pngSize = (page: Page, dataUrl: string) => page.evaluate((u) => new Promise<[number, number]>((resolve) => {
  const img = new Image();
  img.onload = () => resolve([img.naturalWidth, img.naturalHeight]);
  img.src = u;
}), dataUrl);

/** A 600 x 180 stamp, as the drawing box saved it before 77D: one short stroke in the middle. */
const untrimmedStamp = (page: Page) => page.evaluate(() => {
  const c = document.createElement('canvas');
  c.width = 600; c.height = 180;
  const ctx = c.getContext('2d')!;
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(250, 95); ctx.lineTo(330, 80); ctx.lineTo(360, 100); ctx.stroke();
  return c.toDataURL('image/png');
});

/** Where the Plan Simplified's guardian signature image and its heading and caption print (PDF points, from the page bottom). */
async function stampGeometry(page: Page) {
  return page.evaluate(async () => {
    const { buildPlanSimplifiedModel } = await import('/probate-guardian/src/features/plan-simplified/pdf-model.js');
    const { generateCourtFormPdf } = await import('/probate-guardian/src/core/pdf/pdf-engine.js');
    const { finalizeCourtFormPdf } = await import('/probate-guardian/src/core/pdf/pdf-finalizer.js');
    const { ensurePdfjs } = await import('/probate-guardian/src/core/pdf/pdfjs-loader.js');
    const filing = (window as any).GuardianForms.testing.snapshot().filing;
    const doc = await generateCourtFormPdf(buildPlanSimplifiedModel(filing));
    const pdfjsLib = await ensurePdfjs();
    const pdf = await pdfjsLib.getDocument({ data: await finalizeCourtFormPdf(doc) }).promise;
    for (let i = 1; i <= pdf.numPages; i++) {
      const p = await pdf.getPage(i);
      const ops = await p.getOperatorList();
      let last: number[] | null = null;
      let image: number[] | null = null;
      ops.fnArray.forEach((fn: number, k: number) => {
        if (fn === pdfjsLib.OPS.transform) last = ops.argsArray[k];
        if (fn === pdfjsLib.OPS.paintImageXObject && !image) image = last;
      });
      if (!image) continue;
      const items = (await p.getTextContent()).items as Array<{ str: string; transform: number[] }>;
      const caption = items.find((t) => t.str.startsWith('Signature of '));
      // The block's heading ("<role> Signature"): the nearest such line above the caption.
      const heading = caption ? items
        .filter((t) => / Signature$/.test(t.str) && t.transform[5] > caption.transform[5])
        .sort((a, b) => a.transform[5] - b.transform[5])[0] : undefined;
      const [w, , , h, x, y] = image;
      return { x, bottom: y, top: y + h, width: w, height: h, captionY: caption?.transform[5] ?? null, headingY: heading?.transform[5] ?? null };
    }
    return null;
  });
}

test('a drawn signature is saved trimmed to its ink, and prints below its heading, on its line', async ({ page }) => {
  test.setTimeout(180_000);
  await freshStartNoPassword(page);
  await createWard(page, 'Stamp Size Ward', 'planSimplified');
  await fillMinimalValidPlanSimplifiedWard(page);
  await page.evaluate(() => (window as any).GuardianForms.testing.navigate('/p3'));
  await page.locator('[data-signature-state-group="planGuardians.0"] input[value="stamp"]').check();
  const canvas = page.locator('.signature-pad-panel[data-sig-panel="draw"] canvas');
  await expect(canvas).toBeVisible();
  const box = (await canvas.boundingBox())!;
  // A short signature in the middle of the box, as a mouse draws one.
  await page.mouse.move(box.x + box.width * 0.4, box.y + box.height * 0.5);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.55, box.y + box.height * 0.4, { steps: 8 });
  await page.mouse.move(box.x + box.width * 0.6, box.y + box.height * 0.55, { steps: 8 });
  await page.mouse.up();
  await page.locator('[data-sig-action="apply"]').click();
  await expect.poll(() => field(page, 'planGuardians.0.signatureImage')).toBeTruthy();
  const [w, h] = await pngSize(page, await field(page, 'planGuardians.0.signatureImage'));
  expect(w, 'saved narrower than the 600px drawing box').toBeLessThan(300);
  expect(h, 'saved shorter than the 180px drawing box').toBeLessThan(150);

  const g = await stampGeometry(page);
  expect(g, 'the signature image is on the PDF').not.toBeNull();
  expect(g!.headingY).not.toBeNull();
  expect(g!.captionY).not.toBeNull();
  expect(g!.top, 'below the heading\'s baseline, not over it').toBeLessThan(g!.headingY! - 2);
  // The line is drawn 10pt above the caption's baseline; the image sits on it.
  expect(Math.abs(g!.bottom - (g!.captionY! + 10)), 'its bottom on the line').toBeLessThan(0.6);
  expect(g!.height).toBeLessThanOrEqual(36.01);
  expect(g!.height, 'a trimmed signature fills the height it is given').toBeGreaterThan(20);
});

test('a signature saved untrimmed is trimmed when its filing is opened, once, and the Activity Log says so; a closed filing is left as filed', async ({ page }) => {
  test.setTimeout(180_000);
  await freshStartNoPassword(page);
  await createWard(page, 'Saved Stamp Ward', 'planSimplified');
  await fillMinimalValidPlanSimplifiedWard(page);
  const old = await untrimmedStamp(page);
  expect(await pngSize(page, old)).toEqual([600, 180]);

  // A closed filing keeps it as filed.
  await reopenFilingWithStoredShape(page, { archived: true, 'planGuardians.0.signatureState': 'stamp', 'planGuardians.0.signatureImage': old });
  await page.waitForTimeout(1500);
  expect(await field(page, 'planGuardians.0.signatureImage'), 'closed: untouched').toBe(old);

  // A filing being prepared: trimmed as it opens.
  await reopenFilingWithStoredShape(page, { archived: false });
  await expect.poll(async () => (await pngSize(page, await field(page, 'planGuardians.0.signatureImage')))[0], { timeout: 15_000 }).toBeLessThan(200);
  const [w, h] = await pngSize(page, await field(page, 'planGuardians.0.signatureImage'));
  expect(h).toBeLessThan(60);
  expect(w).toBeGreaterThan(100);
  const trimmed = await field(page, 'planGuardians.0.signatureImage');
  await expect.poll(() => page.evaluate(async () => (await (window as any).GuardianForms.testing.persistenceState.auditEntries())
    .filter((e: any) => e.eventType === 'SIGNATURE_TRIMMED').length)).toBe(1);

  // Once: opening it again changes nothing and logs nothing more.
  await reopenFilingWithStoredShape(page, {});
  await page.waitForTimeout(1500);
  expect(await field(page, 'planGuardians.0.signatureImage')).toBe(trimmed);
  expect(await page.evaluate(async () => (await (window as any).GuardianForms.testing.persistenceState.auditEntries())
    .filter((e: any) => e.eventType === 'SIGNATURE_TRIMMED').length)).toBe(1);
});
