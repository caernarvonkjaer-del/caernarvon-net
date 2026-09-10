import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

// Milestone 36-6 item 15. Florida Bar member numbers run up to seven digits.
// formatBarNumber() capped at six, so a seven-digit number lost its last digit
// with no warning and printed a different attorney's number onto a filing.
//
// formatBarNumber lives in legacy-app.js, which is a browser-bound script
// rather than an importable module, so the function is sliced out of the
// source and evaluated on its own.
function loadFormatBarNumber() {
  const src = fs.readFileSync(path.resolve(__dirname, '../../src/legacy-app.js'), 'utf8');
  const header = 'function formatBarNumber(';
  const start = src.indexOf(header);
  expect(start, 'formatBarNumber not found in legacy-app.js').toBeGreaterThan(-1);
  const open = src.indexOf('{', start);
  let depth = 0;
  let end = -1;
  for (let i = open; i < src.length; i++) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}') { depth--; if (depth === 0) { end = i + 1; break; } }
  }
  const body = src.slice(start, end);
  // eslint-disable-next-line no-new-func
  return new Function(`${body}; return formatBarNumber;`)();
}

describe('formatBarNumber', () => {
  const formatBarNumber = loadFormatBarNumber();

  it('keeps a six-digit bar number intact', () => {
    expect(formatBarNumber('008921')).toBe('008921');
  });

  it('keeps a seven-digit bar number intact', () => {
    expect(formatBarNumber('0089214')).toBe('0089214');
  });

  it('strips non-digits without dropping a significant digit', () => {
    expect(formatBarNumber('008-9214')).toBe('0089214');
    expect(formatBarNumber(' 12 34 567 ')).toBe('1234567');
  });

  it('caps at seven digits rather than six', () => {
    expect(formatBarNumber('12345678')).toBe('1234567');
  });

  it('handles empty and nullish input', () => {
    expect(formatBarNumber('')).toBe('');
    expect(formatBarNumber(null)).toBe('');
    expect(formatBarNumber(undefined)).toBe('');
  });
});
