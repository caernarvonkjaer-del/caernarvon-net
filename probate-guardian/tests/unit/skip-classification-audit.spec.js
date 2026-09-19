import { test, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Milestone 31, Phase 0.3 / Milestone 59B: every dynamic skip in the E2E
// suite must go through one of target-profile.ts's three classified helpers
// (skipExpectedTargetExclusion / skipEnvironmentLimitation /
// skipTemporaryGap) rather than calling test.skip() directly, so a skip
// reason is always both human-readable and machine-classifiable. This is a
// static source audit, not a runtime check -- it fails if a future spec adds
// a bare test.skip() call instead of using the helpers.
//
// In Milestone 59B, this audit moved from Playwright to Vitest so that a pure
// filesystem policy scan does not incur browser runner overhead. It scans
// `tests/e2e/*.spec.ts`.

const e2eDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'e2e');

function withoutJsComments(source) {
  let result = '';
  let quote = '';
  let lineComment = false;
  let blockComment = false;
  for (let index = 0; index < source.length; index += 1) {
    const current = source[index];
    const next = source[index + 1];
    if (lineComment) {
      if (current === '\n') { lineComment = false; result += current; }
    } else if (blockComment) {
      if (current === '*' && next === '/') { blockComment = false; index += 1; }
    } else if (quote) {
      result += current;
      if (current === '\\') result += source[++index] || '';
      else if (current === quote) quote = '';
    } else if (current === '/' && next === '/') {
      lineComment = true;
      index += 1;
    } else if (current === '/' && next === '*') {
      blockComment = true;
      index += 1;
    } else {
      result += current;
      if (current === '"' || current === "'" || current === '`') quote = current;
    }
  }
  return result;
}

test('no spec calls test.skip() directly outside the classified skip helpers', () => {
  const specFiles = fs.readdirSync(e2eDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.spec.ts'))
    .map((entry) => entry.name);

  const offenders = [];
  for (const name of specFiles) {
    const source = withoutJsComments(fs.readFileSync(path.join(e2eDir, name), 'utf8'));
    if (/\btest\.skip\(/.test(source)) offenders.push(name);
  }

  expect(offenders, `these specs call test.skip() directly instead of skipExpectedTargetExclusion/skipEnvironmentLimitation/skipTemporaryGap from support/target-profile.ts: ${offenders.join(', ')}`).toEqual([]);
});
