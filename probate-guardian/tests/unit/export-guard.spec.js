import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { beginExport } from '../../src/core/ui/export-guard.js';

// Milestone 67. Reported live: clicking "Save as PDF" produced a browser
// warning that the download was blocked because "this page tried to save
// multiple files automatically." Root cause: every doSavePdf()/doSaveExcel()
// across all seven filing types had no re-entrancy guard, so a second click
// while the first export was still generating fired a second, near-
// simultaneous automatic download -- exactly what a browser's multiple-
// automatic-downloads protection blocks. See export-guard.js's own header
// for the full explanation.

function fakeButton(overrides = {}) {
  return { disabled: false, ...overrides };
}

describe('beginExport', () => {
  let btn;

  beforeEach(() => {
    btn = fakeButton();
    vi.stubGlobal('document', { querySelector: (sel) => (sel === '#the-button' ? btn : null) });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test('disables the button and returns it, when it is enabled', () => {
    const returned = beginExport('#the-button');
    expect(returned).toBe(btn);
    expect(btn.disabled).toBe(true);
  });

  test('returns null and leaves it disabled, when the button is already disabled -- the second-click case this exists to catch', () => {
    btn.disabled = true;
    const returned = beginExport('#the-button');
    expect(returned).toBeNull();
    expect(btn.disabled).toBe(true);
  });

  test('returns null, not a throw, when the selector matches nothing (page navigated away mid-export)', () => {
    expect(beginExport('#does-not-exist')).toBeNull();
  });
});
