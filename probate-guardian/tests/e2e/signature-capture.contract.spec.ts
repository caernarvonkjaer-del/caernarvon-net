import { test, expect } from '@playwright/test';
import {
  freshStartNoPassword, createWard,
  fillMinimalValidPlanSimplifiedWard, fillMinimalValidPlanAnnualWard,
  fillMinimalValidPlanInitialWard, fillMinimalValidPlanMinorWard,
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
