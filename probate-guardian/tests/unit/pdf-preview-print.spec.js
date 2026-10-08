import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

// Milestone 74C: Print opens the filing's PDF in a new tab, and that tab gets
// no handle back to the app -- as the Florida Courts E-Filing Portal's link
// already had (court-portal.js). Until then the tab was opened with nothing
// cut, so the PDF page could reach the app's window.
//
// The proposal asked for window.open's 'noopener' feature, after a browser
// check that a blob: URL opened with it still shows the PDF in Chromium,
// Firefox, WebKit and Edge. That check could not be confirmed in any of the
// four, so Print opens the tab exactly as before and then cuts the link
// (tab.opener = null), which needs no such check.

vi.mock('../../src/core/pdf/pdf-engine.js', () => ({ generateCourtFormPdf: vi.fn(async () => ({})) }));
vi.mock('../../src/core/pdf/pdf-finalizer.js', () => ({ finalizeCourtFormPdf: vi.fn(async () => new Uint8Array([37, 80, 68, 70])), saveFinalizedPdf: vi.fn() }));
vi.mock('../../src/core/pdf/pdfjs-loader.js', () => ({ ensurePdfjs: vi.fn() }));
vi.mock('../../src/core/pdf/pdf-annotate.js', () => ({ AnnotationSession: class {}, computeContentFingerprint: vi.fn() }));
vi.mock('../../src/core/status/live-region.js', () => ({ announceStatus: vi.fn() }));
vi.mock('../../src/core/filing/output-preflight.js', () => ({ prepareFilingOutput: vi.fn(), previewStatusHtml: vi.fn(() => '') }));
vi.mock('../../src/core/filing/output-authorization.js', () => ({
  acknowledgeOutstandingRequirements: vi.fn(), beginFreshPreview: vi.fn(),
  authorizeFilingOutput: vi.fn(() => ({ status: 'allowed', issues: [] })),
}));
vi.mock('../../src/core/ui/dialogs.js', () => ({ alertModal: vi.fn(async () => {}), confirmModal: vi.fn(async () => true) }));
vi.mock('../../src/core/ui/print-pager.js', () => ({ initPrintPager: vi.fn() }));
vi.mock('../../src/core/state.js', () => ({ requestSave: vi.fn() }));
vi.mock('../../src/core/persistence/case-file.js', () => ({ markDirtySinceExport: vi.fn() }));

const { printGeneratedPdf } = await import('../../src/core/pdf/pdf-preview.js');
const { alertModal } = await import('../../src/core/ui/dialogs.js');
const { authorizeFilingOutput } = await import('../../src/core/filing/output-authorization.js');

describe("Print's new tab", () => {
  let opened;
  beforeEach(() => {
    opened = [];
    vi.stubGlobal('window', {
      open: vi.fn((url, target, features) => {
        const tab = { opener: 'the app', url, target, features };
        opened.push(tab);
        return tab;
      }),
    });
    vi.stubGlobal('URL', Object.assign(Object.create(URL), { createObjectURL: () => 'blob:pdf-1' }));
  });
  afterEach(() => { vi.unstubAllGlobals(); vi.clearAllMocks(); });

  test('opens the PDF in a new tab, exactly as before, with no handle back to the app', async () => {
    await printGeneratedPdf(() => ({}), {}, []);
    expect(alertModal).not.toHaveBeenCalled();
    expect(opened).toHaveLength(1);
    expect([opened[0].url, opened[0].target]).toEqual(['blob:pdf-1', '_blank']);
    expect(opened[0].opener).toBe(null);
  });

  test('a blocked pop-up (window.open returns null) is not an error', async () => {
    window.open = vi.fn(() => null);
    await printGeneratedPdf(() => ({}), {}, []);
    expect(alertModal).not.toHaveBeenCalled();
  });

  test('nothing is opened when the filing cannot be printed', async () => {
    authorizeFilingOutput.mockReturnValueOnce({ status: 'blocked', issues: [{}, {}] });
    await printGeneratedPdf(() => ({}), {}, []);
    expect(opened).toHaveLength(0);
    expect(alertModal).toHaveBeenCalledWith('Cannot print: 2 required items still missing. Open Print Preview to see what they are.');
  });
});
