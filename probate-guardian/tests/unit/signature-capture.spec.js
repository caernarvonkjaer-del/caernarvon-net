import { describe, it, expect } from 'vitest';
import {
  validateSignatureImage, readPngDimensions,
  MAX_SIGNATURE_WIDTH_PX, MAX_SIGNATURE_FILE_SIZE_BYTES,
  removeLightBackground, DEFAULT_BACKGROUND_LUMINANCE_THRESHOLD,
} from '../../src/core/signature/signature-pad.js';
import { checkSignatureState, inferLegacySignatureState, SIGNATURE_STATES } from '../../src/core/validation/signature-state.js';

// Builds a byte buffer that looks like a PNG to validateSignatureImage()'s
// own checks (magic bytes + a real IHDR width/height) without needing a
// real, renderable image -- these functions only ever read header bytes,
// never decode pixels, so a synthetic buffer is a faithful, fast fixture.
const PNG_MAGIC = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
function fakePngDataUrl(width, height, paddingBytes = 0) {
  const bytes = new Uint8Array(24 + paddingBytes);
  bytes.set(PNG_MAGIC, 0);
  const view = new DataView(bytes.buffer);
  view.setUint32(16, width, false);
  view.setUint32(20, height, false);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return `data:image/png;base64,${btoa(binary)}`;
}

describe('signature-pad: readPngDimensions', () => {
  it('reads width/height from the IHDR chunk', () => {
    const bytes = new Uint8Array(24);
    bytes.set(PNG_MAGIC, 0);
    new DataView(bytes.buffer).setUint32(16, 300, false);
    new DataView(bytes.buffer).setUint32(20, 100, false);
    expect(readPngDimensions(bytes)).toEqual({ width: 300, height: 100 });
  });

  it('returns null for a buffer too short to hold an IHDR', () => {
    expect(readPngDimensions(new Uint8Array(10))).toBeNull();
  });
});

describe('signature-pad: validateSignatureImage', () => {
  it('accepts a well-formed PNG within size and width limits', () => {
    const result = validateSignatureImage(fakePngDataUrl(600, 180));
    expect(result.valid).toBe(true);
    expect(result.width).toBe(600);
  });

  it('rejects a non-PNG data URL', () => {
    expect(validateSignatureImage('data:image/jpeg;base64,AAAA').valid).toBe(false);
    expect(validateSignatureImage('not a data url at all').valid).toBe(false);
  });

  it('rejects a PNG wider than MAX_SIGNATURE_WIDTH_PX', () => {
    const result = validateSignatureImage(fakePngDataUrl(MAX_SIGNATURE_WIDTH_PX + 1, 300));
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/too wide/i);
  });

  it('accepts a PNG exactly at MAX_SIGNATURE_WIDTH_PX', () => {
    expect(validateSignatureImage(fakePngDataUrl(MAX_SIGNATURE_WIDTH_PX, 300)).valid).toBe(true);
  });

  it('rejects a file larger than MAX_SIGNATURE_FILE_SIZE_BYTES', () => {
    const result = validateSignatureImage(fakePngDataUrl(600, 180, MAX_SIGNATURE_FILE_SIZE_BYTES + 1));
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/too large/i);
  });

  it('rejects data with correct extension/prefix but fake magic bytes', () => {
    const bytes = new Uint8Array(24);
    bytes.set([1, 2, 3, 4, 5, 6, 7, 8], 0); // wrong magic
    let binary = '';
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    const result = validateSignatureImage(`data:image/png;base64,${btoa(binary)}`);
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/content check/i);
  });
});

// Milestone 39-C: "Upload background-transparency gate" -- these cover the
// exact scenarios MILESTONE-39-PROPOSAL.md's own verification plan calls
// for (plain white/dark ink, off-white/gray, low-contrast ink, a shadow
// gradient), documenting both where the heuristic holds and where it
// visibly degrades, rather than only proving the happy path.
describe('signature-pad: removeLightBackground (Upload transparency fix)', () => {
  // Builds a flat RGBA byte array from [r, g, b, a] pixel tuples, matching
  // the layout removeLightBackground() expects from a real ImageData.data.
  function pixels(...rgba) {
    return new Uint8ClampedArray(rgba.flat());
  }

  it('strips a plain white background and keeps dark ink opaque', () => {
    const white = [255, 255, 255, 255];
    const ink = [10, 10, 10, 255]; // near-black pen
    const data = pixels(white, ink, white);
    removeLightBackground(data);
    expect(data[3]).toBe(0); // background pixel 1
    expect(data[7]).toBe(255); // ink pixel
    expect(data[11]).toBe(0); // background pixel 2
  });

  it('strips an off-white/gray background at the default threshold', () => {
    const offWhite = [235, 235, 230, 255]; // luminance ~234
    const midGray = [210, 210, 210, 255]; // luminance 210, still >= 200 default
    const data = pixels(offWhite, midGray);
    removeLightBackground(data);
    expect(data[3]).toBe(0);
    expect(data[7]).toBe(0);
  });

  it('keeps a pixel just below the threshold opaque and strips one at or above it', () => {
    // Pure gray (R=G=B=v) makes luminance === v exactly, so the boundary is
    // easy to hit precisely.
    const belowThreshold = [DEFAULT_BACKGROUND_LUMINANCE_THRESHOLD - 1, DEFAULT_BACKGROUND_LUMINANCE_THRESHOLD - 1, DEFAULT_BACKGROUND_LUMINANCE_THRESHOLD - 1, 255];
    const atThreshold = [DEFAULT_BACKGROUND_LUMINANCE_THRESHOLD, DEFAULT_BACKGROUND_LUMINANCE_THRESHOLD, DEFAULT_BACKGROUND_LUMINANCE_THRESHOLD, 255];
    const data = pixels(belowThreshold, atThreshold);
    removeLightBackground(data);
    expect(data[3]).toBe(255); // just below threshold: kept opaque
    expect(data[7]).toBe(0); // at threshold: stripped
  });

  it('known limit: low-contrast ink near the threshold is not reliably distinguished from background', () => {
    // A pale/faded pen stroke can land close enough to the same gray level
    // as the paper itself that the heuristic cannot separate the two --
    // this is the "low-contrast ink" limitation MILESTONE-39-PROPOSAL.md's
    // Upload background-transparency gate documents, not a bug to fix here.
    const paleInk = [190, 188, 185, 255]; // faded pen, luminance ~188
    const paperNearby = [205, 205, 200, 255]; // luminance ~204, barely different
    const data = pixels(paleInk, paperNearby);
    removeLightBackground(data);
    expect(data[3]).toBe(255); // pale ink survives (below threshold)...
    expect(data[7]).toBe(0); // ...but its nearly-identical paper neighbor is stripped
    // The two source pixels differ by only ~16 luminance units yet land on
    // opposite sides of the cutoff -- exactly the fragility being documented.
  });

  it('known limit: a shadow gradient across the page is only partially removed', () => {
    // A photographed page lit unevenly can shade from bright paper down
    // through a mid-gray shadow before reaching true ink -- the threshold
    // can only cut once, so part of the shadow survives as an opaque
    // "halo" around the signature rather than being fully removed.
    const brightPaper = [250, 250, 250, 255];
    const shadowEdge = [150, 150, 150, 255]; // shadow, well under threshold
    const trueInk = [15, 15, 15, 255];
    const data = pixels(brightPaper, shadowEdge, trueInk);
    removeLightBackground(data);
    expect(data[3]).toBe(0); // bright paper: correctly removed
    expect(data[7]).toBe(255); // shadow: incorrectly kept opaque (the known limit)
    expect(data[11]).toBe(255); // true ink: correctly kept opaque
  });

  it('returns the same array it mutates, for convenient chaining', () => {
    const data = pixels([255, 255, 255, 255]);
    expect(removeLightBackground(data)).toBe(data);
  });
});

describe('signature-state: checkSignatureState', () => {
  const base = { sectionLabel: 'Signatures', roleLabel: 'Guardian 1' };

  it('Unsigned always passes, regardless of other fields', () => {
    expect(checkSignatureState({ ...base, state: SIGNATURE_STATES.NONE, date: '', image: '' })).toEqual([]);
    expect(checkSignatureState({ ...base, state: '', date: '', image: '' })).toEqual([]);
  });

  it('"/s/" Signed passes only once date is present', () => {
    expect(checkSignatureState({ ...base, state: SIGNATURE_STATES.TYPED, date: '2026-01-01' })).toEqual([]);
    const errs = checkSignatureState({ ...base, state: SIGNATURE_STATES.TYPED, date: '' });
    expect(errs.length).toBeGreaterThan(0);
    expect(errs[0]).toContain('date signed is required');
  });

  it('"/s/" Signed also checks name when the caller opts in', () => {
    const errs = checkSignatureState({ ...base, state: SIGNATURE_STATES.TYPED, date: '2026-01-01', name: '' });
    expect(errs.some((e) => e.includes('printed name is required'))).toBe(true);
  });

  it('"/s/" Signed does not duplicate a name error when the caller omits name', () => {
    const errs = checkSignatureState({ ...base, state: SIGNATURE_STATES.TYPED, date: '2026-01-01' });
    expect(errs).toEqual([]);
  });

  it('Signature Stamp passes only once an image is present', () => {
    expect(checkSignatureState({ ...base, state: SIGNATURE_STATES.STAMP, image: 'data:image/png;base64,AAAA' })).toEqual([]);
    const errs = checkSignatureState({ ...base, state: SIGNATURE_STATES.STAMP, image: '' });
    expect(errs.length).toBe(1);
    expect(errs[0]).toContain('signature stamp image is required');
  });

  it('flags an unrecognized state as incomplete rather than silently passing', () => {
    const errs = checkSignatureState({ ...base, state: 'bogus' });
    expect(errs.length).toBe(1);
    expect(errs[0]).toContain('invalid');
  });
});

describe('signature-state: inferLegacySignatureState', () => {
  it('returns the stored state when one exists', () => {
    expect(inferLegacySignatureState('stamp', '2026-01-01')).toBe('stamp');
  });

  it('infers "typed" for a legacy filing with a date but no stored state', () => {
    expect(inferLegacySignatureState('', '2026-01-01')).toBe(SIGNATURE_STATES.TYPED);
    expect(inferLegacySignatureState(undefined, '2026-01-01')).toBe(SIGNATURE_STATES.TYPED);
  });

  it('infers "none" only when neither field is present', () => {
    expect(inferLegacySignatureState('', '')).toBe(SIGNATURE_STATES.NONE);
    expect(inferLegacySignatureState(undefined, undefined)).toBe(SIGNATURE_STATES.NONE);
  });
});
