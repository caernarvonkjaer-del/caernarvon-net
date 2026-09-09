import { test, expect, type Page } from '@playwright/test';
import { freshStartNoPassword, createWard, fillMinimalValidAnnualWard } from './support/target';
import { extractPdfText, getPdfMetadata } from './support/pdf-extract';
import { extractDocx } from './support/docx-extract';
import { filingCapabilities, type FilingType } from './support/filing-matrix';

// Milestone 33, Phase 2.1 -- pilot scope per the proposal's own Migration
// Sequence ("begin with Annual/Final/Trust"): the shared annual-accounting
// engine is where Milestone 25's filing-identity unification (commit
// 32626d3, "feat: unify filing identity and field commits") is what makes
// three otherwise-identical-code filing types emit distinct legal identity
// via src/core/filing/filing-descriptor.js. Verified directly against the
// current tree before writing this contract: filing-descriptor.js already
// has fully distinct documentTitle/displayName/filenameStem per alias,
// pdf-model.js and print.js both resolve identity through it (not a
// hard-coded "Annual Accounting" string), and annual-mount.spec.ts already
// has a passing model-level identity test. This contract goes one layer
// further: it proves the *generated PDF/DOCX file*, not just the in-memory
// model object, carries the right identity -- the semantic-artifact
// direction Phase 3 formalizes.
//
// Guardian, Simplified, and the four Plan types are out of scope for this
// pass; they get their own identity-contract coverage once this pilot's new
// helpers (pdf-extract.ts's getPdfMetadata, support/docx-extract.ts) are
// proven here, per the proposal's "do not combine all phases in one change"
// instruction.
//
// Setup uses direct window.D injection (fillMinimalValidAnnualWard(),
// already established by annual-mount.spec.ts/target.ts) rather than
// driving all ~11 Annual pages by hand for three filing-type variants --
// Non-Negotiable #7 permits controlled window.D state for model- and
// artifact-focused setup; this contract tests artifact identity, not
// field-entry behavior. The PDF/DOCX bytes themselves are still produced
// through the real Save as PDF/Save as Word buttons and a real download
// event (not by calling the generator functions directly), so filename
// derivation and the preflight "allowed to export" gate are exercised for
// real, not simulated.

const PILOT_TYPES: FilingType[] = ['annual', 'finalAccounting', 'trustAccounting'];

async function readAll(stream: NodeJS.ReadableStream): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(chunk as Buffer);
  return Buffer.concat(chunks);
}

async function setFilingIdentity(page: Page, id: FilingType): Promise<void> {
  await fillMinimalValidAnnualWard(page);
  if (id !== 'annual') {
    const filingTypeValue = id === 'finalAccounting' ? 'Final' : 'Trust';
    await page.evaluate((v) => { (window as any).D.filingType = v; }, filingTypeValue);
    await page.evaluate(() => (window as any).autoSave());
    await page.evaluate(() => (window as any).flushPendingSave());
  }
}

test.describe('Filing identity contract (Annual / Final / Trust pilot)', () => {
  for (const id of PILOT_TYPES) {
    const expected = filingCapabilities(id);

    test(`${id}: sidebar, Summary, PDF, and DOCX all agree on filing identity`, async ({ page }) => {
      await freshStartNoPassword(page);
      await createWard(page, `${expected.displayName} Identity Ward`, id);
      await setFilingIdentity(page, id);

      // Surface 1: sidebar section label (buildNavAnnual()'s first
      // .nav-section-label, driven by formDisplayName(D.inventoryType)).
      await expect(page.locator('#sidebar .nav-section-label').first()).toHaveText(expected.displayName);

      // Surface 2: Summary page heading (getSummaryConfigAnnual()'s formTitle).
      await page.evaluate(() => (window as any).navigate('/summary'));
      await expect(page.getByRole('heading', { level: 1 })).toContainText(expected.displayName);

      // Surface 3: export gate agrees this valid filing is allowed to export.
      await page.evaluate(() => (window as any).navigate('/print'));
      await expect(page.locator('[data-annual-action="save-pdf"]')).toBeEnabled();
      await expect(page.locator('[data-annual-action="save-word"]')).toBeEnabled();

      // Surface 4: the real generated PDF -- metadata and visible legal copy.
      const pdfDownloadPromise = page.waitForEvent('download', { timeout: 20_000 });
      await page.locator('[data-annual-action="save-pdf"]').click();
      const pdfDownload = await pdfDownloadPromise;
      const formSlug = expected.displayName.replace(/[^a-z0-9]/gi, '');
      expect(pdfDownload.suggestedFilename()).toMatch(new RegExp(`_${formSlug}\\.pdf$`));
      const pdfBytes = await readAll(await pdfDownload.createReadStream());

      // pdfMeta.title/subject/keywords are composed identification strings
      // (pdf-model.js's metadata.title = "<ward> - <case> - <displayName> -
      // Printed <date>"; subject/keywords come from filingCopy(descriptor),
      // both built around descriptor.displayName), not the court-form
      // heading itself -- that heading is descriptor.documentTitle
      // (metadata.formName), which pdf-engine.js prints as the page's
      // actual title text, asserted below via the extracted page text.
      const pdfMeta = await getPdfMetadata(pdfBytes);
      expect(pdfMeta.title).toContain(expected.displayName);
      expect(pdfMeta.subject).toContain(expected.displayName);
      expect(pdfMeta.keywords).toContain(expected.displayName);
      const pdfText = await extractPdfText(pdfBytes);
      expect(pdfText).toContain(expected.documentTitle);

      // Surface 5: the real generated DOCX -- metadata and visible legal copy.
      const docxDownloadPromise = page.waitForEvent('download', { timeout: 20_000 });
      await page.locator('[data-annual-action="save-word"]').click();
      const docxDownload = await docxDownloadPromise;
      expect(docxDownload.suggestedFilename()).toMatch(new RegExp(`_${formSlug}\\.docx$`));
      const docxBytes = await readAll(await docxDownload.createReadStream());

      const docx = await extractDocx(docxBytes);
      expect(docx.title).toContain(expected.displayName);
      expect(docx.visibleText).toContain(expected.documentTitle);

      // Final/Trust must not be emitted as Annual Accountings -- the exact
      // premise Milestone 25 fixed and this contract now proves against the
      // real artifact, not just the in-memory model.
      if (id !== 'annual') {
        const annual = filingCapabilities('annual');
        expect(pdfMeta.title, `${id}'s PDF metadata must not identify as Annual Accounting`).not.toContain(annual.displayName);
        expect(pdfText, `${id}'s PDF heading must not read as an Annual Accounting`).not.toContain(annual.documentTitle);
        expect(docx.title, `${id}'s DOCX metadata must not identify as Annual Accounting`).not.toContain(annual.displayName);
        expect(docx.visibleText, `${id}'s DOCX heading must not read as an Annual Accounting`).not.toContain(annual.documentTitle);
      }
    });
  }
});
