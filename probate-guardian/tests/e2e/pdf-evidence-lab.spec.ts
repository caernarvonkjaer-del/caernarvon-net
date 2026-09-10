import { test, expect } from '@playwright/test';
import { freshStartNoPassword, createWard, fillMinimalValidAnnualWard } from './support/target';

async function attachJson(testInfo: import('@playwright/test').TestInfo, name: string, value: unknown) {
  await testInfo.attach(name, {
    body: Buffer.from(JSON.stringify(value, null, 2)),
    contentType: 'application/json',
  });
}

test.describe('Milestone 34-1D: PDF evidence lab', () => {
  test('captures source, PDF.js, canvas, and finalized-packet observations for a supplemental PDF', async ({ page }, testInfo) => {
    await freshStartNoPassword(page);
    await createWard(page, 'Supplemental Evidence Ward', 'annual');
    await fillMinimalValidAnnualWard(page);

    const evidence = await page.evaluate(async () => {
      const d = (window as any).D;
      const { buildAnnualAccountingModel, createJsPdfInstance } = await (window as any).loadAnnualPdf();
      const { generateCourtFormPdf } = await import('/probate-guardian/src/core/pdf/pdf-engine.js');
      const { finalizeCourtFormPdf } = await import('/probate-guardian/src/core/pdf/pdf-finalizer.js');
      const { digestDataUrl } = await import('/probate-guardian/src/core/pdf/supplemental-pdf.js');
      const { ensurePdfjs } = await import('/probate-guardian/src/core/pdf/pdfjs-loader.js');

      const attachment = await createJsPdfInstance();
      attachment.setFontSize(16);
      attachment.text('EVIDENCE FIXTURE: Supplemental statement content', 50, 100);
      const dataUrl = attachment.output('datauristring');
      const sourceBytes = Uint8Array.from(atob(dataUrl.split(',')[1]), c => c.charCodeAt(0));
      const sourcePdf = await (await ensurePdfjs()).getDocument({ data: sourceBytes }).promise;
      const sourcePage = await sourcePdf.getPage(1);
      const sourceText = (await sourcePage.getTextContent()).items.map((item: any) => item.str).join(' ');
      const viewport = sourcePage.getViewport({ scale: 1 });
      const canvas = document.createElement('canvas');
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      await sourcePage.render({ canvasContext: canvas.getContext('2d')!, viewport, canvas }).promise;
      const pixels = canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height).data;
      let nonWhitePixels = 0;
      for (let index = 0; index < pixels.length; index += 4) {
        if (pixels[index] < 245 || pixels[index + 1] < 245 || pixels[index + 2] < 245) nonWhitePixels++;
      }

      const digest = await digestDataUrl(dataUrl);
      const periodKey = `${d.periodFrom}__${d.periodTo}`;
      d.scheduleDocs = { schA: { [periodKey]: { files: [{
        id: 'evidence-fixture', name: 'evidence-fixture.pdf', type: 'application/pdf', size: sourceBytes.length,
        dataUrl, contentDigest: digest, attestedDigest: digest, technicalStatus: 'ready', attestationStatus: 'accepted', pageCount: 1,
      }] } } };

      const base = await generateCourtFormPdf(buildAnnualAccountingModel({ ...d, scheduleDocs: {} }), { sourceData: { ...d, scheduleDocs: {} } });
      const packet = await finalizeCourtFormPdf(await generateCourtFormPdf(buildAnnualAccountingModel(d), { sourceData: d }));
      const packetPdf = await (await ensurePdfjs()).getDocument({ data: packet }).promise;
      let packetText = '';
      for (let pageNumber = 1; pageNumber <= packetPdf.numPages; pageNumber++) {
        packetText += (await (await packetPdf.getPage(pageNumber)).getTextContent()).items.map((item: any) => item.str).join(' ');
      }
      return {
        source: { bytes: sourceBytes.length, pages: sourcePdf.numPages, text: sourceText, nonWhitePixels },
        finalizedPacket: { pages: packetPdf.numPages, basePages: base.internal.getNumberOfPages(), containsSourceText: packetText.includes('EVIDENCE FIXTURE') },
      };
    });

    await attachJson(testInfo, 'supplemental-pdf-evidence.json', evidence);
    expect(evidence.source.text).toContain('EVIDENCE FIXTURE');
    expect(evidence.source.nonWhitePixels).toBeGreaterThan(0);
    expect(evidence.finalizedPacket.pages).toBeGreaterThan(evidence.finalizedPacket.basePages);
    expect(evidence.finalizedPacket.containsSourceText).toBe(true);
  });

  test('captures Trust toolbar, preview DOM, and finalized page-count evidence', async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await freshStartNoPassword(page);
    await createWard(page, 'Trust Preview Evidence Ward', 'trustAccounting');
    await fillMinimalValidAnnualWard(page);
    await expect.poll(() => page.evaluate(() => (window as any).validateAnnual())).toEqual([]);
    await page.evaluate(() => (window as any).navigate('/print'));
    await expect(page.locator('#print-doc-container .pdf-page').first()).toBeVisible({ timeout: 15000 });

    const evidence = await page.evaluate(async () => {
      const { buildAnnualAccountingModel } = await (window as any).loadAnnualPdf();
      const { generateCourtFormPdf } = await import('/probate-guardian/src/core/pdf/pdf-engine.js');
      const { finalizeCourtFormPdf } = await import('/probate-guardian/src/core/pdf/pdf-finalizer.js');
      const { ensurePdfjs } = await import('/probate-guardian/src/core/pdf/pdfjs-loader.js');
      const finalized = await finalizeCourtFormPdf(await generateCourtFormPdf(buildAnnualAccountingModel((window as any).D)));
      const finalizedPages = (await (await ensurePdfjs()).getDocument({ data: finalized }).promise).numPages;
      const toolbar = document.querySelector('#pv-bar');
      return {
        viewport: { width: window.innerWidth, height: window.innerHeight },
        previewPages: document.querySelectorAll('#print-doc-container .pdf-page').length,
        finalizedPages,
        pagerText: document.querySelector('#pv-count')?.textContent?.trim() || '',
        toolbarPresent: !!toolbar,
        toolbarRect: toolbar ? { width: toolbar.getBoundingClientRect().width, height: toolbar.getBoundingClientRect().height } : null,
      };
    });

    await attachJson(testInfo, 'trust-preview-evidence.json', evidence);
    await testInfo.attach('trust-preview-1440x900.png', { body: await page.screenshot({ fullPage: true }), contentType: 'image/png' });
    expect(evidence.toolbarPresent).toBe(true);
    expect(evidence.previewPages).toBe(evidence.finalizedPages);
    expect(evidence.pagerText).toBe(`Page 1 of ${evidence.finalizedPages}`);
  });
});
