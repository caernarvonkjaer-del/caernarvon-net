/**
 * scripts/ttf-cmap.mjs
 *
 * Milestone 76H item 4: which characters a TrueType font can draw, read from
 * its own character map (the `cmap` table, formats 4 and 12). The font
 * generator writes the result beside the fonts (src/core/pdf/printable-chars.js),
 * and tests/unit/printable-chars.spec.js reads the embedded fonts again with
 * this reader and holds that list to them -- so the on-screen note about a
 * letter the PDF can't print never disagrees with the PDF.
 */

/**
 * The code points `bytes` (a TrueType font) maps to a glyph, sorted.
 * @param {Uint8Array} bytes
 * @returns {number[]}
 */
export function fontCodePoints(bytes) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const numTables = view.getUint16(4);
  let cmap = -1;
  for (let i = 0; i < numTables; i++) {
    const rec = 12 + i * 16;
    const tag = String.fromCharCode(bytes[rec], bytes[rec + 1], bytes[rec + 2], bytes[rec + 3]);
    if (tag === 'cmap') cmap = view.getUint32(rec + 8);
  }
  if (cmap < 0) throw new Error('The font has no character map (cmap).');
  const subtables = [];
  const count = view.getUint16(cmap + 2);
  for (let i = 0; i < count; i++) {
    const rec = cmap + 4 + i * 8;
    const offset = cmap + view.getUint32(rec + 4);
    subtables.push({ platform: view.getUint16(rec), encoding: view.getUint16(rec + 2), offset, format: view.getUint16(offset) });
  }
  // The full-Unicode map when there is one, else the Basic Multilingual Plane's.
  const pick = subtables.find((s) => s.format === 12) || subtables.find((s) => s.format === 4 && (s.platform === 3 || s.platform === 0));
  if (!pick) throw new Error('The font has no Unicode character map (format 4 or 12).');
  const points = new Set();
  if (pick.format === 12) {
    const groups = view.getUint32(pick.offset + 12);
    for (let g = 0; g < groups; g++) {
      const at = pick.offset + 16 + g * 12;
      const start = view.getUint32(at);
      const end = view.getUint32(at + 4);
      const glyph = view.getUint32(at + 8);
      for (let c = start; c <= end; c++) if (glyph + (c - start) !== 0) points.add(c);
    }
  } else {
    const t = pick.offset;
    const segs = view.getUint16(t + 6) / 2;
    const ends = t + 14;
    const starts = ends + segs * 2 + 2;
    const deltas = starts + segs * 2;
    const ranges = deltas + segs * 2;
    for (let s = 0; s < segs; s++) {
      const end = view.getUint16(ends + s * 2);
      const start = view.getUint16(starts + s * 2);
      const delta = view.getInt16(deltas + s * 2);
      const rangeAt = ranges + s * 2;
      const rangeOffset = view.getUint16(rangeAt);
      for (let c = start; c <= end && c !== 0xFFFF; c++) {
        let glyph;
        if (rangeOffset === 0) glyph = (c + delta) & 0xFFFF;
        else {
          const g = view.getUint16(rangeAt + rangeOffset + (c - start) * 2);
          glyph = g === 0 ? 0 : (g + delta) & 0xFFFF;
        }
        if (glyph !== 0) points.add(c);
      }
    }
  }
  return [...points].sort((a, b) => a - b);
}

/**
 * Sorted code points as [first, last] runs.
 * @param {number[]} points
 * @returns {Array<[number, number]>}
 */
export function toRanges(points) {
  const out = [];
  for (const p of points) {
    const last = out[out.length - 1];
    if (last && p === last[1] + 1) last[1] = p;
    else out.push([p, p]);
  }
  return out;
}
