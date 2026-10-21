// Milestone 77D (decision 77D-2): signatures saved before trimming are trimmed
// when their filing is opened. A drawn signature was saved as the whole
// 600 x 180 drawing box, empty space and all, and printed fitted to the
// signature line's box -- the ink a fraction of a 1.3-inch-wide image. Only
// blank margin is removed (signature-pad.js's inkBounds()); the mark itself is
// untouched, and the Activity Log says how many were trimmed.
//
// What is trimmed: the open year's stamps on a filing being prepared, and the
// case's saved stamps (each person's reusable signature history). Not a closed
// filing, an earlier year opened for correction, or an archived year
// (ward.years): their reprint matches what was filed. Browser-only (it decodes the image on a canvas); a failure leaves the
// image as it was.
import { trimCanvasToInk } from './signature-pad.js';
import { isFilingClosed } from '../party-resolver.js';

const isPng = (v) => typeof v === 'string' && v.startsWith('data:image/png;base64,');
const IMAGE_KEY = /ignatureImage$/;
// Never descended into: the archived years, and the filing's own bookkeeping.
const SKIP = new Set(['years', 'scheduleDocs']);

/**
 * The image trimmed to its ink, or null when it is already tight, can't be
 * decoded, or the browser can't draw.
 * @param {string} dataUrl
 * @returns {Promise<string|null>}
 */
export function trimDataUrlToInk(dataUrl) {
  if (!isPng(dataUrl) || typeof Image === 'undefined' || typeof document === 'undefined') return Promise.resolve(null);
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        canvas.getContext('2d').drawImage(img, 0, 0);
        const trimmed = trimCanvasToInk(canvas);
        resolve(trimmed === canvas ? null : trimmed.toDataURL('image/png'));
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = dataUrl;
  });
}

/** Each saved stamp on the open year of `ward`, as [holder, key, path]. */
function stampSlots(ward) {
  const slots = [];
  for (const [key, value] of Object.entries(ward || {})) {
    if (SKIP.has(key)) continue;
    if (IMAGE_KEY.test(key) && isPng(value)) slots.push([ward, key, key]);
    else if (Array.isArray(value)) {
      value.forEach((row, i) => {
        if (!row || typeof row !== 'object') return;
        for (const [k, v] of Object.entries(row)) if (IMAGE_KEY.test(k) && isPng(v)) slots.push([row, k, `${key}.${i}.${k}`]);
      });
    } else if (value && typeof value === 'object') {
      for (const [k, v] of Object.entries(value)) if (IMAGE_KEY.test(k) && isPng(v)) slots.push([value, k, `${key}.${k}`]);
    }
  }
  return slots;
}

/**
 * Trims every untrimmed stamp of a filing being prepared, and the case's
 * saved stamps. Returns the filing paths changed and how many images in all.
 * @param {Record<string, any>} ward
 * @param {Array<Record<string, any>>} [parties]
 * @returns {Promise<{ paths: string[], count: number }>}
 */
export async function trimSavedSignatureStamps(ward, parties = []) {
  const paths = [];
  let count = 0;
  // A closed filing, or an earlier year opened for correction (76F-4), reprints as filed.
  if (ward && !isFilingClosed(ward)) {
    for (const [holder, key, path] of stampSlots(ward)) {
      const before = holder[key];
      const trimmed = await trimDataUrlToInk(before);
      // Kept only if nothing replaced it meanwhile (a stamp applied while this ran).
      if (trimmed && holder[key] === before) { holder[key] = trimmed; paths.push(path); count += 1; }
    }
  }
  for (const party of Array.isArray(parties) ? parties : []) {
    for (const entry of Array.isArray(party?.signatureImages) ? party.signatureImages : []) {
      const before = entry?.imageData;
      const trimmed = await trimDataUrlToInk(before);
      if (trimmed && entry.imageData === before) { entry.imageData = trimmed; count += 1; }
    }
  }
  return { paths, count };
}
