import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  BASE_SCALE, MAX_CANVAS_PIXELS, MAX_DRAWN_PAGES,
  canvasCap, canvasRatio, pageAreaAtBase, scaleFor, storedZoomMode,
} from '../../src/core/pdf/preview-zoom.js';

// Milestone 73R part 3 (R3): the sizing rules behind Print Preview's
// "Fit height" and "Full width" -- the canvas caps that keep a long filing
// within the canvas memory today's Preview used, and the remembered choice.

const LETTER = pageAreaAtBase(612, 792); // 918 x 1188, one page at 1.5x as drawn today

describe('Milestone 73R part 3: Preview canvas caps', () => {
  it('a Letter page at the usual size is 918 x 1188 pixels, as today', () => {
    expect(BASE_SCALE).toBe(1.5);
    expect(LETTER).toBe(918 * 1188);
  });

  it('four pages at most are drawn, so a long filing never holds more canvas than drawing every page at 1.5x', () => {
    for (const pages of [16, 19, 20, 40, 100]) {
      expect(MAX_DRAWN_PAGES * canvasCap(pages, LETTER), `${pages} pages`).toBeLessThanOrEqual(pages * LETTER);
    }
  });

  it('a short filing may still draw one page sharp on a screen of pixel ratio 2', () => {
    expect(canvasCap(2, LETTER)).toBe(4 * LETTER);
    expect(canvasRatio(918, 1188, 2, canvasCap(2, LETTER))).toBe(2);
  });

  it('no canvas passes 16 million pixels, below iOS Safari\'s limit', () => {
    expect(MAX_CANVAS_PIXELS).toBe(16_000_000);
    expect(canvasCap(500, LETTER)).toBe(MAX_CANVAS_PIXELS);
  });

  it('the screen\'s pixel ratio is lowered first when a canvas would pass its cap', () => {
    const cap = canvasCap(20, LETTER);
    expect(canvasRatio(918, 1188, 1, cap)).toBe(1);
    const fullWidth = canvasRatio(2550, 3300, 2, cap);
    expect(fullWidth).toBeLessThan(2);
    expect(2550 * 3300 * fullWidth * fullWidth).toBeCloseTo(cap, -2);
    expect(canvasRatio(918, 1188, 0.5, cap), 'never fewer pixels than CSS pixels while it fits').toBe(1);
  });
});

describe('Milestone 73R part 3: the remembered size', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('is the usual size when nothing, or something unknown, is remembered', () => {
    expect(storedZoomMode()).toBe('actual');
    vi.stubGlobal('localStorage', { getItem: () => 'zoom-200' });
    expect(storedZoomMode()).toBe('actual');
  });

  it('reads the remembered choice from this device', () => {
    vi.stubGlobal('localStorage', { getItem: (key) => (key === 'pg-preview-zoom-v1' ? 'fit-height' : null) });
    expect(storedZoomMode()).toBe('fit-height');
  });

  it('is the usual size when browser storage refuses to be read (a private window)', () => {
    vi.stubGlobal('localStorage', { getItem: () => { throw new Error('denied'); } });
    expect(storedZoomMode()).toBe('actual');
  });

  it('Full width spans the Preview; the usual size is 1.5x', () => {
    expect(scaleFor('actual', 612, 792, null)).toBe(1.5);
    expect(scaleFor('full-width', 612, 792, { clientWidth: 1228 })).toBeCloseTo(2, 5);
  });
});
