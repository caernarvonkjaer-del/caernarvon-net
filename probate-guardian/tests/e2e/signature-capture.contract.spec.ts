import { test, expect } from '@playwright/test';
import {
  freshStartNoPassword, createWard, createSimplifiedWard,
  fillMinimalValidPlanSimplifiedWard, fillMinimalValidPlanAnnualWard,
  fillMinimalValidPlanInitialWard, fillMinimalValidPlanMinorWard,
  fillMinimalValidSimplifiedWard, fillMinimalValidAnnualWard,
} from './support/target';

// Milestone 39-B: three-state signature control (Unsigned / "/s/" Signed /
// Signature Stamp) on Plan Simplified's Guardian card -- the pilot role for
// this mechanism (src/core/signature/signature-pad.js,
// src/core/signature/signature-state-control.js,
// src/core/validation/signature-state.js). Proves the real export-blocking
// path agrees with the UI, not just the validator in isolation.

async function gotoSignaturesPage(page: import('@playwright/test').Page) {
  await page.evaluate(() => (window as any).navigate('/p3'));
  await page.locator('[data-signature-state-group^="planGuardians.0"]').waitFor({ state: 'visible' });
}

test.describe('Milestone 39-B: signature state control (pilot: Plan Simplified Guardian)', () => {
  test('legacy migration: a filing with a signatureDate but no stored signatureState shows "/s/" Signed pre-selected', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'Sig Legacy Ward', 'planSimplified');
    await fillMinimalValidPlanSimplifiedWard(page); // sets signatureDate, never signatureState
    await gotoSignaturesPage(page);

    const typedRadio = page.locator('[data-signature-state-group="planGuardians.0"] input[value="typed"]');
    await expect(typedRadio).toBeChecked();

    // And the real export path already treats this filing as complete --
    // the inference is read-time only, never written back into window.D.
    const storedState = await page.evaluate(() => (window as any).D.planGuardians[0].signatureState);
    expect(storedState).toBeFalsy();
  });

  test('Unsigned validates and exports cleanly with no date required', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'Sig Unsigned Ward', 'planSimplified');
    await fillMinimalValidPlanSimplifiedWard(page);
    await gotoSignaturesPage(page);

    await page.locator('[data-signature-state-group="planGuardians.0"] input[value="none"]').check();
    await page.waitForTimeout(200); // route re-render on change

    await page.evaluate(() => (window as any).navigate('/print'));
    await expect(page.locator('#print-doc-container .pdf-page').first()).toBeVisible({ timeout: 15000 });
    await expect(page.locator('.print-preview-banner')).toContainText('Ready to export');
  });

  test('"/s/" Signed selected but date blank blocks with the tri-state message', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'Sig Typed Incomplete Ward', 'planSimplified');
    await fillMinimalValidPlanSimplifiedWard(page);
    await page.evaluate(() => { (window as any).D.planGuardians[0].signatureDate = ''; });
    await gotoSignaturesPage(page);

    await page.locator('[data-signature-state-group="planGuardians.0"] input[value="typed"]').check();
    await page.evaluate(() => (window as any).navigate('/print'));

    await expect(page.locator('body')).toContainText('date signed is required to apply "/s/" Signed', { timeout: 10000 });
    await expect(page.locator('#print-doc-container .pdf-page')).toHaveCount(0);
  });

  test('Signature Stamp: capture widget only mounts in Stamp state; drawing and applying persists an image and unblocks export', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'Sig Stamp Ward', 'planSimplified');
    await fillMinimalValidPlanSimplifiedWard(page);
    await gotoSignaturesPage(page);

    // Not visible in the other two states.
    await expect(page.locator('.signature-pad')).toHaveCount(0);

    await page.locator('[data-signature-state-group="planGuardians.0"] input[value="stamp"]').check();
    await page.waitForTimeout(200);
    const pad = page.locator('.signature-pad');
    await expect(pad).toBeVisible();

    // Before applying anything, the filing is blocked on the stamp image.
    await page.evaluate(() => (window as any).navigate('/print'));
    await expect(page.locator('body')).toContainText('signature stamp image is required', { timeout: 10000 });
    await gotoSignaturesPage(page);

    // Draw something and apply it.
    const canvas = page.locator('.signature-pad-panel[data-sig-panel="draw"] canvas');
    const box = await canvas.boundingBox();
    if (!box) throw new Error('signature canvas not visible');
    await page.mouse.move(box.x + 20, box.y + 20);
    await page.mouse.down();
    await page.mouse.move(box.x + 150, box.y + 60, { steps: 10 });
    await page.mouse.up();
    await page.locator('[data-sig-action="apply"]').click();

    await expect.poll(() => page.evaluate(() => !!(window as any).D.planGuardians[0].signatureImage)).toBe(true);
    await expect(page.locator('.signature-stamp-preview img')).toBeVisible();

    await page.evaluate(() => (window as any).navigate('/print'));
    await expect(page.locator('#print-doc-container .pdf-page').first()).toBeVisible({ timeout: 15000 });
    await expect(page.locator('.print-preview-banner')).toContainText('Ready to export');

    // Not just "didn't throw" -- confirm pdf-engine.js's renderSignatureImage()
    // actually painted an image XObject onto the Signatures page, via
    // pdf.js's own operator list for the finalized bytes (independent of
    // the live preview's own canvas render).
    const paintedImage = await page.evaluate(async () => {
      const { buildPlanSimplifiedModel } = await import('/probate-guardian/src/features/plan-simplified/pdf-model.js');
      const { generateCourtFormPdf } = await import('/probate-guardian/src/core/pdf/pdf-engine.js');
      const { finalizeCourtFormPdf } = await import('/probate-guardian/src/core/pdf/pdf-finalizer.js');
      const { ensurePdfjs } = await import('/probate-guardian/src/core/pdf/pdfjs-loader.js');
      const model = buildPlanSimplifiedModel((window as any).D);
      const doc = await generateCourtFormPdf(model);
      const finalized = await finalizeCourtFormPdf(doc);
      const pdfjsLib = await ensurePdfjs();
      const pdfDoc = await pdfjsLib.getDocument({ data: finalized }).promise;
      for (let i = 1; i <= pdfDoc.numPages; i++) {
        const p = await pdfDoc.getPage(i);
        const opList = await p.getOperatorList();
        if (opList.fnArray.includes(pdfjsLib.OPS.paintImageXObject)) return true;
      }
      return false;
    });
    expect(paintedImage).toBe(true);
  });
});

// Milestone 39-C: "Upload background-transparency gate" -- the luminance-
// threshold fix lives in the one shared capture widget
// (src/core/signature/signature-pad.js), so proving it once here, through
// the real Upload tab and a real produced PNG, covers every role/filing
// type 39-C touches; it needs no per-type re-proof (unlike the field-shape
// rollout below, which is genuinely per-type).
test.describe('Milestone 39-C: Upload background-transparency (luminance-threshold fix)', () => {
  // Builds a real PNG in the browser -- a light "paper" background plus a
  // dark "ink" square placed well away from the edges -- and returns it as
  // a Buffer suitable for page.setInputFiles(), so the test exercises the
  // actual file-upload path rather than injecting a data URL directly.
  async function buildSyntheticUploadPng(page: import('@playwright/test').Page) {
    const dataUrl = await page.evaluate(() => {
      const canvas = document.createElement('canvas');
      canvas.width = 100;
      canvas.height = 40;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#ffffff'; // light background, above the default threshold
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#111111'; // dark ink, well below the default threshold
      ctx.fillRect(30, 10, 20, 20);
      return canvas.toDataURL('image/png');
    });
    return Buffer.from(dataUrl.split(',')[1], 'base64');
  }

  test('an uploaded photo\'s light background is stripped to transparent; the dark ink is kept opaque', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'Sig Upload Ward', 'planSimplified');
    await fillMinimalValidPlanSimplifiedWard(page);
    await gotoSignaturesPage(page);

    await page.locator('[data-signature-state-group="planGuardians.0"] input[value="stamp"]').check();
    await page.waitForTimeout(200);
    await page.locator('[data-sig-tab="upload"]').click();

    const buffer = await buildSyntheticUploadPng(page);
    await page.setInputFiles('[data-sig-upload]', { name: 'upload.png', mimeType: 'image/png', buffer });

    // Wait for the async Image/onload decode to finish and the upload
    // preview canvas to actually be painted before applying.
    await expect.poll(() => page.locator('[data-sig-panel="upload"] canvas').evaluate((c) => {
      const ctx = (c as HTMLCanvasElement).getContext('2d')!;
      const data = ctx.getImageData(0, 0, (c as HTMLCanvasElement).width, (c as HTMLCanvasElement).height).data;
      for (let i = 3; i < data.length; i += 4) if (data[i] !== 0) return true;
      return false;
    })).toBe(true);

    await page.locator('[data-sig-action="apply"]').click();
    await expect.poll(() => page.evaluate(() => !!(window as any).D.planGuardians[0].signatureImage)).toBe(true);

    const { bgAlpha, inkAlpha } = await page.evaluate(async () => {
      const dataUrl = (window as any).D.planGuardians[0].signatureImage;
      return new Promise<{ bgAlpha: number; inkAlpha: number }>((resolve) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;
          const ctx = canvas.getContext('2d')!;
          ctx.drawImage(img, 0, 0);
          const bg = ctx.getImageData(5, 5, 1, 1).data;
          const ink = ctx.getImageData(40, 20, 1, 1).data;
          resolve({ bgAlpha: bg[3], inkAlpha: ink[3] });
        };
        img.src = dataUrl;
      });
    });
    expect(bgAlpha).toBe(0);
    expect(inkAlpha).toBe(255);
  });
});

// Milestone 39-C: rolls 39-B's exact mechanism out to the three remaining
// Plan types. Each type's Guardian card is the same collection-row shape as
// the pilot -- one full legacy/Unsigned/incomplete/Stamp-draw cycle per type
// proves that shape generalizes correctly. Each type's Attorney/Preparer
// card is the new scalar shape (`attorney_signatureState`, not
// `attorney.signatureState` -- see signature-state-control.js's statePath/
// imagePath override) -- a lighter "blank still passes" + "Stamp paints"
// pair per card proves the override plumbing and each pdf-model.js's own
// wiring, without re-proving the shared capture widget's UI mechanics
// (already exercised above; unchanged by this rollout).
async function paintedImageFor(page: import('@playwright/test').Page, featurePath: string, buildFnName: string) {
  return page.evaluate(async ({ featurePath, buildFnName }) => {
    const model = await import(/* @vite-ignore */ `/probate-guardian/src/features/${featurePath}/pdf-model.js`);
    const { generateCourtFormPdf } = await import('/probate-guardian/src/core/pdf/pdf-engine.js');
    const { finalizeCourtFormPdf } = await import('/probate-guardian/src/core/pdf/pdf-finalizer.js');
    const { ensurePdfjs } = await import('/probate-guardian/src/core/pdf/pdfjs-loader.js');
    const doc = await generateCourtFormPdf((model as any)[buildFnName]((window as any).D));
    const finalized = await finalizeCourtFormPdf(doc);
    const pdfjsLib = await ensurePdfjs();
    const pdfDoc = await pdfjsLib.getDocument({ data: finalized }).promise;
    for (let i = 1; i <= pdfDoc.numPages; i++) {
      const p = await pdfDoc.getPage(i);
      const opList = await p.getOperatorList();
      if (opList.fnArray.includes(pdfjsLib.OPS.paintImageXObject)) return true;
    }
    return false;
  }, { featurePath, buildFnName });
}

const SAMPLE_PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';

test.describe('Milestone 39-C: signature state control rollout -- Plan Annual', () => {
  async function gotoSignaturesPage(page: import('@playwright/test').Page) {
    await page.evaluate(() => (window as any).navigate('/p11'));
    await page.locator('[data-signature-state-group="planGuardians.0"]').waitFor({ state: 'visible' });
  }

  test('Guardian legacy migration, Unsigned-passes, and incomplete-"/s/" blocking', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'PA Sig Ward', 'planAnnual');
    await fillMinimalValidPlanAnnualWard(page); // sets signatureDate, never signatureState
    await gotoSignaturesPage(page);

    await expect(page.locator('[data-signature-state-group="planGuardians.0"] input[value="typed"]')).toBeChecked();

    await page.locator('[data-signature-state-group="planGuardians.0"] input[value="none"]').check();
    await page.waitForTimeout(200);
    await page.evaluate(() => (window as any).navigate('/print'));
    await expect(page.locator('#print-doc-container .pdf-page').first()).toBeVisible({ timeout: 15000 });
    await expect(page.locator('.print-preview-banner')).toContainText('Ready to export');

    await gotoSignaturesPage(page);
    await page.evaluate(() => { (window as any).D.planGuardians[0].signatureDate = ''; });
    await page.locator('[data-signature-state-group="planGuardians.0"] input[value="typed"]').check();
    await page.evaluate(() => (window as any).navigate('/print'));
    await expect(page.locator('body')).toContainText('date signed is required to apply "/s/" Signed', { timeout: 10000 });
    await expect(page.locator('#print-doc-container .pdf-page')).toHaveCount(0);
  });

  test('Guardian Signature Stamp: draw, apply, unblocks export, and paints an image', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'PA Sig Stamp Ward', 'planAnnual');
    await fillMinimalValidPlanAnnualWard(page);
    await gotoSignaturesPage(page);

    await page.locator('[data-signature-state-group="planGuardians.0"] input[value="stamp"]').check();
    await page.waitForTimeout(200);
    const canvas = page.locator('[data-signature-state-group="planGuardians.0"] .signature-pad-panel[data-sig-panel="draw"] canvas');
    const box = await canvas.boundingBox();
    if (!box) throw new Error('signature canvas not visible');
    await page.mouse.move(box.x + 20, box.y + 20);
    await page.mouse.down();
    await page.mouse.move(box.x + 150, box.y + 60, { steps: 10 });
    await page.mouse.up();
    await page.locator('[data-signature-state-group="planGuardians.0"] [data-sig-action="apply"]').click();
    await expect.poll(() => page.evaluate(() => !!(window as any).D.planGuardians[0].signatureImage)).toBe(true);

    await page.evaluate(() => (window as any).navigate('/print'));
    await expect(page.locator('.print-preview-banner')).toContainText('Ready to export');
    expect(await paintedImageFor(page, 'plan-annual', 'buildPlanAnnualModel')).toBe(true);
  });

  test('Attorney card left entirely blank does not block ("leave blank if no attorney involved")', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'PA Sig Attorney Blank Ward', 'planAnnual');
    await fillMinimalValidPlanAnnualWard(page); // never sets any attorney_* field
    await page.evaluate(() => (window as any).navigate('/print'));
    await expect(page.locator('#print-doc-container .pdf-page').first()).toBeVisible({ timeout: 15000 });
    await expect(page.locator('.print-preview-banner')).toContainText('Ready to export');
  });

  test('Attorney Signature Stamp applied paints an image', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'PA Sig Attorney Stamp Ward', 'planAnnual');
    await fillMinimalValidPlanAnnualWard(page);
    await page.evaluate((img) => {
      const d = (window as any).D;
      d.attorney = 'Sample Attorney';
      d.attorney_signatureState = 'stamp';
      d.attorney_signatureImage = img;
    }, SAMPLE_PNG);
    await page.evaluate(() => (window as any).navigate('/print'));
    await expect(page.locator('.print-preview-banner')).toContainText('Ready to export');
    expect(await paintedImageFor(page, 'plan-annual', 'buildPlanAnnualModel')).toBe(true);
  });
});

test.describe('Milestone 39-C: signature state control rollout -- Plan Initial', () => {
  async function gotoGuardianPage(page: import('@playwright/test').Page) {
    await page.evaluate(() => (window as any).navigate('/p9'));
    await page.locator('[data-signature-state-group="planGuardians.0"]').waitFor({ state: 'visible' });
  }
  async function gotoAttorneyPage(page: import('@playwright/test').Page) {
    await page.evaluate(() => (window as any).navigate('/p10'));
    await page.locator('[data-signature-state-group="attorney"]').waitFor({ state: 'visible' });
  }
  // Pre-existing, unrelated bug found while writing this suite (confirmed via
  // git-stash against the unmodified baseline, not introduced by 39-C):
  // fillMinimalValidPlanInitialWard() never sets q7Trusts/q7PendingBenefits,
  // which then default to the tri-state STRING "No" -- and
  // validatePlanInitial()'s `if(d.q7Trusts||d.q7PendingBenefits||d.q7Other)`
  // (index.js:581) treats any non-blank string, including an explicit "No",
  // as "needs an explanation," the exact class of bug form-contract.js's own
  // yesNoText() doc comment warns about. This blocks the fixture from ever
  // reaching a genuinely clean baseline. Worked around here (reset to '',
  // which the validator correctly treats as not-yet-answered and therefore
  // not requiring an explanation) rather than fixed, since fixing
  // validatePlanInitial() itself is unrelated to Milestone 39-C's scope --
  // flagged to the requester instead.
  async function workaroundPreExistingQ7Bug(page: import('@playwright/test').Page) {
    await page.evaluate(() => {
      const d = (window as any).D;
      d.q7Trusts = ''; d.q7PendingBenefits = '';
    });
  }

  test('Guardian legacy migration, Unsigned-passes, and incomplete-"/s/" blocking', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'PI Sig Ward', 'planInitial');
    await fillMinimalValidPlanInitialWard(page); // sets signatureDate, never signatureState
    await workaroundPreExistingQ7Bug(page);
    await gotoGuardianPage(page);

    await expect(page.locator('[data-signature-state-group="planGuardians.0"] input[value="typed"]')).toBeChecked();

    await page.locator('[data-signature-state-group="planGuardians.0"] input[value="none"]').check();
    await page.waitForTimeout(200);
    await page.evaluate(() => (window as any).navigate('/print'));
    await expect(page.locator('#print-doc-container .pdf-page').first()).toBeVisible({ timeout: 15000 });
    await expect(page.locator('.print-preview-banner')).toContainText('Ready to export');

    await gotoGuardianPage(page);
    await page.evaluate(() => { (window as any).D.planGuardians[0].signatureDate = ''; });
    await page.locator('[data-signature-state-group="planGuardians.0"] input[value="typed"]').check();
    await page.evaluate(() => (window as any).navigate('/print'));
    await expect(page.locator('body')).toContainText('date signed is required to apply "/s/" Signed', { timeout: 10000 });
    await expect(page.locator('#print-doc-container .pdf-page')).toHaveCount(0);
  });

  test('Guardian Signature Stamp: draw, apply, unblocks export, and paints an image', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'PI Sig Stamp Ward', 'planInitial');
    await fillMinimalValidPlanInitialWard(page);
    await workaroundPreExistingQ7Bug(page);
    await gotoGuardianPage(page);

    await page.locator('[data-signature-state-group="planGuardians.0"] input[value="stamp"]').check();
    await page.waitForTimeout(200);
    const canvas = page.locator('[data-signature-state-group="planGuardians.0"] .signature-pad-panel[data-sig-panel="draw"] canvas');
    const box = await canvas.boundingBox();
    if (!box) throw new Error('signature canvas not visible');
    await page.mouse.move(box.x + 20, box.y + 20);
    await page.mouse.down();
    await page.mouse.move(box.x + 150, box.y + 60, { steps: 10 });
    await page.mouse.up();
    await page.locator('[data-signature-state-group="planGuardians.0"] [data-sig-action="apply"]').click();
    await expect.poll(() => page.evaluate(() => !!(window as any).D.planGuardians[0].signatureImage)).toBe(true);

    await page.evaluate(() => (window as any).navigate('/print'));
    await expect(page.locator('.print-preview-banner')).toContainText('Ready to export');
    expect(await paintedImageFor(page, 'plan-initial', 'buildPlanInitialModel')).toBe(true);
  });

  test('Attorney card left entirely blank does not block (pro se / Guardian Advocate exemption)', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'PI Sig Attorney Blank Ward', 'planInitial');
    await fillMinimalValidPlanInitialWard(page); // sets attorney_name/signatureDate by default
    await workaroundPreExistingQ7Bug(page);
    await page.evaluate(() => {
      const d = (window as any).D;
      d.attorney_name = '';
      d.attorney_signatureDate = '';
    });
    await page.evaluate(() => (window as any).navigate('/print'));
    await expect(page.locator('#print-doc-container .pdf-page').first()).toBeVisible({ timeout: 15000 });
    await expect(page.locator('.print-preview-banner')).toContainText('Ready to export');
  });

  test('Attorney Signature Stamp applied paints an image', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'PI Sig Attorney Stamp Ward', 'planInitial');
    await fillMinimalValidPlanInitialWard(page);
    await workaroundPreExistingQ7Bug(page);
    await page.evaluate((img) => {
      const d = (window as any).D;
      d.attorney_signatureState = 'stamp';
      d.attorney_signatureImage = img;
    }, SAMPLE_PNG);
    await page.evaluate(() => (window as any).navigate('/print'));
    await expect(page.locator('.print-preview-banner')).toContainText('Ready to export');
    expect(await paintedImageFor(page, 'plan-initial', 'buildPlanInitialModel')).toBe(true);
  });
});

test.describe('Milestone 39-C: signature state control rollout -- Plan Minor', () => {
  async function gotoGuardianPage(page: import('@playwright/test').Page) {
    await page.evaluate(() => (window as any).navigate('/p6'));
    await page.locator('[data-signature-state-group="planGuardians.0"]').waitFor({ state: 'visible' });
  }
  async function gotoPreparerAttorneyPage(page: import('@playwright/test').Page) {
    await page.evaluate(() => (window as any).navigate('/p7'));
    await page.locator('[data-signature-state-group="preparer"]').waitFor({ state: 'visible' });
  }

  test('Guardian legacy migration, Unsigned-passes, and incomplete-"/s/" blocking', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'PM Sig Ward', 'planMinor');
    await fillMinimalValidPlanMinorWard(page); // sets signatureDate, never signatureState
    await gotoGuardianPage(page);

    await expect(page.locator('[data-signature-state-group="planGuardians.0"] input[value="typed"]')).toBeChecked();

    await page.locator('[data-signature-state-group="planGuardians.0"] input[value="none"]').check();
    await page.waitForTimeout(200);
    await page.evaluate(() => (window as any).navigate('/print'));
    await expect(page.locator('#print-doc-container .pdf-page').first()).toBeVisible({ timeout: 15000 });
    await expect(page.locator('.print-preview-banner')).toContainText('Ready to export');

    await gotoGuardianPage(page);
    await page.evaluate(() => { (window as any).D.planGuardians[0].signatureDate = ''; });
    await page.locator('[data-signature-state-group="planGuardians.0"] input[value="typed"]').check();
    await page.evaluate(() => (window as any).navigate('/print'));
    await expect(page.locator('body')).toContainText('date signed is required to apply "/s/" Signed', { timeout: 10000 });
    await expect(page.locator('#print-doc-container .pdf-page')).toHaveCount(0);
  });

  test('Guardian Signature Stamp: draw, apply, unblocks export, and paints an image', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'PM Sig Stamp Ward', 'planMinor');
    await fillMinimalValidPlanMinorWard(page);
    await gotoGuardianPage(page);

    await page.locator('[data-signature-state-group="planGuardians.0"] input[value="stamp"]').check();
    await page.waitForTimeout(200);
    const canvas = page.locator('[data-signature-state-group="planGuardians.0"] .signature-pad-panel[data-sig-panel="draw"] canvas');
    const box = await canvas.boundingBox();
    if (!box) throw new Error('signature canvas not visible');
    await page.mouse.move(box.x + 20, box.y + 20);
    await page.mouse.down();
    await page.mouse.move(box.x + 150, box.y + 60, { steps: 10 });
    await page.mouse.up();
    await page.locator('[data-signature-state-group="planGuardians.0"] [data-sig-action="apply"]').click();
    await expect.poll(() => page.evaluate(() => !!(window as any).D.planGuardians[0].signatureImage)).toBe(true);

    await page.evaluate(() => (window as any).navigate('/print'));
    await expect(page.locator('.print-preview-banner')).toContainText('Ready to export');
    expect(await paintedImageFor(page, 'plan-minor', 'buildPlanMinorModel')).toBe(true);
  });

  test('Preparer and Attorney cards left entirely blank do not block (pro se / Guardian Advocate exemption)', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'PM Sig Blank Ward', 'planMinor');
    await fillMinimalValidPlanMinorWard(page); // sets preparer_*/attorney_* by default
    await page.evaluate(() => {
      const d = (window as any).D;
      d.preparer_name = ''; d.preparer_signatureDate = '';
      d.attorney_name = ''; d.attorney_signatureDate = '';
    });
    await page.evaluate(() => (window as any).navigate('/print'));
    await expect(page.locator('#print-doc-container .pdf-page').first()).toBeVisible({ timeout: 15000 });
    await expect(page.locator('.print-preview-banner')).toContainText('Ready to export');
  });

  test('Preparer Signature Stamp applied paints an image', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'PM Sig Preparer Stamp Ward', 'planMinor');
    await fillMinimalValidPlanMinorWard(page);
    await page.evaluate((img) => {
      const d = (window as any).D;
      d.preparer_signatureState = 'stamp';
      d.preparer_signatureImage = img;
    }, SAMPLE_PNG);
    await page.evaluate(() => (window as any).navigate('/print'));
    await expect(page.locator('.print-preview-banner')).toContainText('Ready to export');
    expect(await paintedImageFor(page, 'plan-minor', 'buildPlanMinorModel')).toBe(true);
  });

  test('Attorney Signature Stamp applied paints an image', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'PM Sig Attorney Stamp Ward', 'planMinor');
    await fillMinimalValidPlanMinorWard(page);
    await page.evaluate((img) => {
      const d = (window as any).D;
      d.attorney_signatureState = 'stamp';
      d.attorney_signatureImage = img;
    }, SAMPLE_PNG);
    await page.evaluate(() => (window as any).navigate('/print'));
    await expect(page.locator('.print-preview-banner')).toContainText('Ready to export');
    expect(await paintedImageFor(page, 'plan-minor', 'buildPlanMinorModel')).toBe(true);
  });
});

// Milestone 39-C, continued: Simplified Accounting and Annual Accounting
// (the shared 'annual' feature also serving Final/Trust Accounting, which
// carry no separate code path -- confirmed during the 39-C inventory audit,
// so testing 'annual' alone covers all three). Guardian is the
// collection-row shape (same as the Plan-family rollout above); Preparer
// (Annual only) is nested-object; Attorney and the Certificate-of-Service
// Attorney cards are the scalar shape.
test.describe('Milestone 39-C: signature state control rollout -- Simplified Accounting', () => {
  async function gotoPage(page: import('@playwright/test').Page, route: string, groupPath: string) {
    await page.evaluate((r) => (window as any).navigate(r), route);
    await page.locator(`[data-signature-state-group="${groupPath}"]`).waitFor({ state: 'visible' });
  }

  test('Guardian legacy migration, Unsigned-passes, and incomplete-"/s/" blocking', async ({ page }) => {
    await freshStartNoPassword(page);
    await createSimplifiedWard(page, 'SA Sig Ward');
    await fillMinimalValidSimplifiedWard(page); // sets signatureDate, never signatureState
    await gotoPage(page, '/p4', 'guardians.0');

    await expect(page.locator('[data-signature-state-group="guardians.0"] input[value="typed"]')).toBeChecked();

    await page.locator('[data-signature-state-group="guardians.0"] input[value="none"]').check();
    await page.waitForTimeout(200);
    await page.evaluate(() => (window as any).navigate('/print'));
    await expect(page.locator('#print-doc-container .pdf-page').first()).toBeVisible({ timeout: 15000 });
    await expect(page.locator('.print-preview-banner')).toContainText('Ready to export');

    await gotoPage(page, '/p4', 'guardians.0');
    await page.evaluate(() => { (window as any).D.guardians[0].signatureDate = ''; });
    await page.locator('[data-signature-state-group="guardians.0"] input[value="typed"]').check();
    await page.evaluate(() => (window as any).navigate('/print'));
    await expect(page.locator('body')).toContainText('date signed is required to apply "/s/" Signed', { timeout: 10000 });
    await expect(page.locator('#print-doc-container .pdf-page')).toHaveCount(0);
  });

  test('Guardian Signature Stamp: draw, apply, unblocks export, and paints an image', async ({ page }) => {
    await freshStartNoPassword(page);
    await createSimplifiedWard(page, 'SA Sig Stamp Ward');
    await fillMinimalValidSimplifiedWard(page);
    await gotoPage(page, '/p4', 'guardians.0');

    await page.locator('[data-signature-state-group="guardians.0"] input[value="stamp"]').check();
    await page.waitForTimeout(200);
    const canvas = page.locator('[data-signature-state-group="guardians.0"] .signature-pad-panel[data-sig-panel="draw"] canvas');
    const box = await canvas.boundingBox();
    if (!box) throw new Error('signature canvas not visible');
    await page.mouse.move(box.x + 20, box.y + 20);
    await page.mouse.down();
    await page.mouse.move(box.x + 150, box.y + 60, { steps: 10 });
    await page.mouse.up();
    await page.locator('[data-signature-state-group="guardians.0"] [data-sig-action="apply"]').click();
    await expect.poll(() => page.evaluate(() => !!(window as any).D.guardians[0].signatureImage)).toBe(true);

    await page.evaluate(() => (window as any).navigate('/print'));
    await expect(page.locator('.print-preview-banner')).toContainText('Ready to export');
    expect(await paintedImageFor(page, 'simplified-accounting', 'buildSimplifiedAccountingModel')).toBe(true);
  });

  test('Attorney (Part V) and Attorney Certificate of Service (Part VI) Signature Stamp both paint an image', async ({ page }) => {
    await freshStartNoPassword(page);
    await createSimplifiedWard(page, 'SA Sig Attorney Stamp Ward');
    await fillMinimalValidSimplifiedWard(page); // sets attorney name, never attorney_signatureState/certAttySignatureState
    await page.evaluate((img) => {
      const d = (window as any).D;
      d.attorney_signatureState = 'stamp';
      d.attorney_signatureImage = img;
    }, SAMPLE_PNG);
    await page.evaluate(() => (window as any).navigate('/print'));
    await expect(page.locator('.print-preview-banner')).toContainText('Ready to export');
    expect(await paintedImageFor(page, 'simplified-accounting', 'buildSimplifiedAccountingModel')).toBe(true);

    // Part VI's Certificate-of-Service Attorney card is a genuinely separate
    // field (certAttySignatureState/Image, not attorney_*) -- confirmed by
    // also exercising it, not assuming the same result as Part V above.
    await page.evaluate((img) => {
      const d = (window as any).D;
      d.attorney_signatureState = ''; d.attorney_signatureImage = '';
      d.certAttySignatureState = 'stamp';
      d.certAttySignatureImage = img;
    }, SAMPLE_PNG);
    await page.evaluate(() => (window as any).navigate('/print'));
    await expect(page.locator('.print-preview-banner')).toContainText('Ready to export');
    expect(await paintedImageFor(page, 'simplified-accounting', 'buildSimplifiedAccountingModel')).toBe(true);
  });

  test('Attorney Certificate of Service left entirely blank does not block (previously unvalidated card)', async ({ page }) => {
    await freshStartNoPassword(page);
    await createSimplifiedWard(page, 'SA Sig CoS Blank Ward');
    await fillMinimalValidSimplifiedWard(page); // never sets certAttySignDate/certAttySignatureState
    await page.evaluate(() => (window as any).navigate('/print'));
    await expect(page.locator('#print-doc-container .pdf-page').first()).toBeVisible({ timeout: 15000 });
    await expect(page.locator('.print-preview-banner')).toContainText('Ready to export');
  });
});

test.describe('Milestone 39-C: signature state control rollout -- Annual Accounting (also Final/Trust)', () => {
  async function gotoPage(page: import('@playwright/test').Page, route: string, groupPath: string) {
    await page.evaluate((r) => (window as any).navigate(r), route);
    await page.locator(`[data-signature-state-group="${groupPath}"]`).waitFor({ state: 'visible' });
  }

  test('Guardian legacy migration, Unsigned-passes, and incomplete-"/s/" blocking', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'AA Sig Ward', 'annual');
    await fillMinimalValidAnnualWard(page); // sets signatureDate, never signatureState
    await gotoPage(page, '/p3', 'guardians.0');

    await expect(page.locator('[data-signature-state-group="guardians.0"] input[value="typed"]')).toBeChecked();

    await page.locator('[data-signature-state-group="guardians.0"] input[value="none"]').check();
    await page.waitForTimeout(200);
    await page.evaluate(() => (window as any).navigate('/print'));
    await expect(page.locator('#print-doc-container .pdf-page').first()).toBeVisible({ timeout: 15000 });
    await expect(page.locator('.print-preview-banner')).toContainText('Ready to export');

    await gotoPage(page, '/p3', 'guardians.0');
    await page.evaluate(() => { (window as any).D.guardians[0].signatureDate = ''; });
    await page.locator('[data-signature-state-group="guardians.0"] input[value="typed"]').check();
    await page.evaluate(() => (window as any).navigate('/print'));
    await expect(page.locator('body')).toContainText('date signed is required to apply "/s/" Signed', { timeout: 10000 });
    await expect(page.locator('#print-doc-container .pdf-page')).toHaveCount(0);
  });

  test('Guardian Signature Stamp: draw, apply, unblocks export, and paints an image', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'AA Sig Stamp Ward', 'annual');
    await fillMinimalValidAnnualWard(page);
    await gotoPage(page, '/p3', 'guardians.0');

    await page.locator('[data-signature-state-group="guardians.0"] input[value="stamp"]').check();
    await page.waitForTimeout(200);
    const canvas = page.locator('[data-signature-state-group="guardians.0"] .signature-pad-panel[data-sig-panel="draw"] canvas');
    const box = await canvas.boundingBox();
    if (!box) throw new Error('signature canvas not visible');
    await page.mouse.move(box.x + 20, box.y + 20);
    await page.mouse.down();
    await page.mouse.move(box.x + 150, box.y + 60, { steps: 10 });
    await page.mouse.up();
    await page.locator('[data-signature-state-group="guardians.0"] [data-sig-action="apply"]').click();
    await expect.poll(() => page.evaluate(() => !!(window as any).D.guardians[0].signatureImage)).toBe(true);

    await page.evaluate(() => (window as any).navigate('/print'));
    await expect(page.locator('.print-preview-banner')).toContainText('Ready to export');
    expect(await paintedImageFor(page, 'annual-accounting', 'buildAnnualAccountingModel')).toBe(true);
  });

  test('Preparer Signature Stamp applied paints an image', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'AA Sig Preparer Stamp Ward', 'annual');
    await fillMinimalValidAnnualWard(page); // sets preparer.name, never preparer.signatureState
    await page.evaluate((img) => {
      const d = (window as any).D;
      d.preparer.signatureState = 'stamp';
      d.preparer.signatureImage = img;
    }, SAMPLE_PNG);
    await page.evaluate(() => (window as any).navigate('/print'));
    await expect(page.locator('.print-preview-banner')).toContainText('Ready to export');
    expect(await paintedImageFor(page, 'annual-accounting', 'buildAnnualAccountingModel')).toBe(true);
  });

  test('Attorney (Part V) with Signature Stamp selected but no image blocks, then applying it unblocks and paints', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'AA Sig Attorney Stamp Ward', 'annual');
    await fillMinimalValidAnnualWard(page); // sets d.attorney (name) but never attorney_signatureState
    await page.evaluate(() => { (window as any).D.attorney_signatureState = 'stamp'; });
    await page.evaluate(() => (window as any).navigate('/print'));
    await expect(page.locator('body')).toContainText('Part V — Attorney signature stamp image is required', { timeout: 10000 });
    await expect(page.locator('#print-doc-container .pdf-page')).toHaveCount(0);

    await page.evaluate((img) => {
      const d = (window as any).D;
      d.attorney = 'Sample Attorney';
      d.attorney_signatureImage = img;
    }, SAMPLE_PNG);
    await page.evaluate(() => (window as any).navigate('/print'));
    await expect(page.locator('.print-preview-banner')).toContainText('Ready to export');
    expect(await paintedImageFor(page, 'annual-accounting', 'buildAnnualAccountingModel')).toBe(true);
  });

  test('Attorney Certificate of Service (Part X) Signature Stamp applied paints an image (previously unvalidated card)', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'AA Sig CoS Stamp Ward', 'annual');
    await fillMinimalValidAnnualWard(page);
    await page.evaluate((img) => {
      const d = (window as any).D;
      d.certAttySignatureState = 'stamp';
      d.certAttySignatureImage = img;
    }, SAMPLE_PNG);
    await page.evaluate(() => (window as any).navigate('/print'));
    await expect(page.locator('.print-preview-banner')).toContainText('Ready to export');
    expect(await paintedImageFor(page, 'annual-accounting', 'buildAnnualAccountingModel')).toBe(true);
  });
});
