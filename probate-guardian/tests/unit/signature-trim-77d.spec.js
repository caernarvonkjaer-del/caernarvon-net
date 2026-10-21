// Milestone 77D: a drawn signature prints at its size, on its line. A
// signature drawn with a mouse or finger was saved as the whole 600 x 180
// drawing box, empty space and all, so it printed as a fraction of its line;
// inkBounds() finds the box the ink occupies, with a small margin, so only
// that is saved. Pure: plain RGBA arrays, no canvas.
import { describe, expect, test } from 'vitest';

const { inkBounds } = await import('../../src/core/signature/signature-pad.js');

/** A width x height transparent image with opaque pixels at `dots`. */
function image(width, height, dots) {
  const px = new Uint8ClampedArray(width * height * 4);
  for (const [x, y] of dots) px[(y * width + x) * 4 + 3] = 255;
  return px;
}

describe('77D: the box a signature\'s ink occupies', () => {
  test('nothing drawn: null', () => {
    expect(inkBounds(image(100, 50, []), 100, 50, 4)).toBeNull();
  });

  test('one mark, with the margin around it', () => {
    expect(inkBounds(image(100, 50, [[10, 5]]), 100, 50, 4)).toEqual({ x: 6, y: 1, width: 9, height: 9 });
  });

  test('a stroke across the box keeps every mark', () => {
    expect(inkBounds(image(600, 180, [[100, 80], [140, 95], [180, 70]]), 600, 180, 0)).toEqual({ x: 100, y: 70, width: 81, height: 26 });
  });

  test('the margin stops at the image edge', () => {
    expect(inkBounds(image(40, 20, [[0, 0], [39, 19]]), 40, 20, 6)).toEqual({ x: 0, y: 0, width: 40, height: 20 });
  });

  test("by default the margin is 4% of the ink's longer side, at least 4 pixels", () => {
    expect(inkBounds(image(600, 180, [[300, 90]]), 600, 180)).toEqual({ x: 296, y: 86, width: 9, height: 9 });
    const stroke = [[100, 70], [400, 95]];
    expect(inkBounds(image(600, 180, stroke), 600, 180)).toEqual({ x: 88, y: 58, width: 325, height: 50 });
  });

  test('trimming a trimmed signature changes nothing (it is trimmed once, on opening)', () => {
    const first = inkBounds(image(600, 180, [[100, 70], [400, 95]]), 600, 180);
    const moved = [[100 - first.x, 70 - first.y], [400 - first.x, 95 - first.y]];
    expect(inkBounds(image(first.width, first.height, moved), first.width, first.height)).toEqual({ x: 0, y: 0, width: first.width, height: first.height });
  });
});
