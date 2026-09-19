import type { Page } from '@playwright/test';

export interface SupplementalFileFixture {
  id: string;
  name: string;
  type: string;
  size: number;
  dataUrl: string;
  contentDigest: string;
  attestedDigest: string;
  technicalStatus: string;
  attestationStatus: string;
  pageCount: number;
}

// Milestone 43E: the createJsPdfInstance -> .text() -> dataUrl ->
// digestDataUrl -> files[] entry shape was hand-built independently at (at
// least) four call sites across output-semantics.artifact.spec.ts,
// supplemental-pdf-accounting.spec.ts, pdf-evidence-lab.spec.ts, and
// pdf-accessibility-and-signatures.spec.ts -- two of them even shared the
// identical ward name/case number/dates, a copy-paste tell. Builds the
// attachment itself only; where it gets inserted into scheduleDocs
// (period-keyed for the accounting family, year-keyed for Guardian
// Inventory, single-key for Plan types) genuinely differs per call site and
// stays there. createJsPdfInstance/digestDataUrl are core modules, not
// feature-specific -- no need to reach them through any one feature's own
// loadXPdf() global the way every original call site happened to.
export async function buildSupplementalAttachmentFixture(
  page: Page,
  text: string,
  overrides: Partial<SupplementalFileFixture> = {},
): Promise<SupplementalFileFixture> {
  const { dataUrl, digest } = await page.evaluate(async (attachmentText) => {
    // These two imports run inside the browser page (Section 11's web build
    // base), not resolved by tsc/Node -- the absolute URL is only valid at
    // runtime, once the dev/preview server serves it. tsc structurally cannot
    // resolve it, so this is a real, permanent, non-fixable false positive.
    // Using the "expect" form of the suppression (rather than "ignore") means
    // a future refactor that makes this resolvable statically re-surfaces as
    // an error here instead of staying silently suppressed.
    // @ts-expect-error -- runtime-only browser URL, see comment above.
    const { createJsPdfInstance } = await import('/probate-guardian/src/core/pdf/pdf-engine.js');
    // @ts-expect-error -- runtime-only browser URL, see comment above.
    const { digestDataUrl } = await import('/probate-guardian/src/core/pdf/supplemental-pdf.js');
    const doc = await createJsPdfInstance();
    doc.setFontSize(16);
    doc.text(attachmentText, 50, 100);
    const generatedDataUrl = doc.output('datauristring');
    return { dataUrl: generatedDataUrl, digest: await digestDataUrl(generatedDataUrl) };
  }, text);

  return {
    id: 'test-attachment',
    name: 'attachment.pdf',
    type: 'application/pdf',
    size: 4200,
    dataUrl,
    contentDigest: digest,
    attestedDigest: digest,
    technicalStatus: 'ready',
    attestationStatus: 'accepted',
    pageCount: 1,
    ...overrides,
  };
}
