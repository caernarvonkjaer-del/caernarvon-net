import { test, expect } from '@playwright/test';
import { freshStartNoPassword, createWard, fillMinimalValidAnnualWard } from './support/target';
import { buildSupplementalAttachmentFixture } from './support/supplemental-pdf-fixture';

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

    const fixture = await buildSupplementalAttachmentFixture(page, 'EVIDENCE FIXTURE: Supplemental statement content', {
      id: 'evidence-fixture', name: 'evidence-fixture.pdf',
    });

    const evidence = await page.evaluate(async (file) => {
      const d = (window as any).GuardianForms.testing.snapshot().filing;
      const { buildAnnualAccountingModel } = await (window as any).GuardianForms.testing.generateOutput.annualPdf();
      const { generateCourtFormPdf } = await import('/probate-guardian/src/core/pdf/pdf-engine.js');
      const { finalizeCourtFormPdf } = await import('/probate-guardian/src/core/pdf/pdf-finalizer.js');
      const { ensurePdfjs } = await import('/probate-guardian/src/core/pdf/pdfjs-loader.js');

      const sourceBytes = Uint8Array.from(atob(file.dataUrl.split(',')[1]), c => c.charCodeAt(0));
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

      const periodKey = `${d.periodFrom}__${d.periodTo}`;
      d.scheduleDocs = { schA: { [periodKey]: { files: [{ ...file, size: sourceBytes.length }] } } };

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
    }, fixture);

    await attachJson(testInfo, 'supplemental-pdf-evidence.json', evidence);
    expect(evidence.source.text).toContain('EVIDENCE FIXTURE');
    // Milestone 43E: >0 is satisfied by a single stray dark pixel anywhere
    // on the page -- the 52-character 16pt string actually drawn here paints
    // on the order of thousands of ink pixels, so a much higher floor still
    // leaves comfortable margin while actually requiring real rendered text,
    // not just "something, somewhere, wasn't pure white".
    expect(evidence.source.nonWhitePixels).toBeGreaterThan(500);
    expect(evidence.finalizedPacket.pages).toBeGreaterThan(evidence.finalizedPacket.basePages);
    expect(evidence.finalizedPacket.containsSourceText).toBe(true);
  });

  // Milestone 43E: the Trust toolbar/pager evidence test that used to live
  // here is gone -- folded into pdf-preview-viewer.spec.ts's own FEATURES
  // loop, which gained a Trust Accounting entry (previously the loop had
  // none at all, so this closes a real gap, not just a duplicate: Trust's
  // "Preview renders the real generated PDF" and "embedded preview blocked"
  // tests are now real coverage that didn't exist before, and its own
  // "pager uses the finalized PDF page count" test already proved the exact
  // previewPages===finalizedPages/#pv-count agreement this file re-proved
  // for Trust specifically). This file's remaining test above (supplemental
  // PDF source/canvas/digest/finalized-packet evidence) is kept: it proves
  // things nothing else in the suite does (a real rendered ink-pixel count,
  // the finalized packet actually containing the attachment's own text),
  // so the file stays rather than being deleted as debugging scaffolding.
});
