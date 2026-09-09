import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

// Milestone 31, Phase 0.3: every dynamic skip in the E2E suite must go
// through one of target-profile.ts's three classified helpers
// (skipExpectedTargetExclusion / skipEnvironmentLimitation /
// skipTemporaryGap) rather than calling test.skip() directly, so a skip
// reason is always both human-readable and machine-classifiable. This is a
// static source audit, not a runtime check -- it fails if a future spec adds
// a bare test.skip() call instead of using the helpers.

const specsDir = path.resolve(import.meta.dirname);

// A file listed here is allowed to call test.skip() directly. Only this
// file's own name is present, and only because its prose describing the
// banned pattern contains the literal substring it's scanning for -- it has
// no real test.skip() calls of its own. Every actual former use has been
// migrated (ward-lock.spec.ts, offline.spec.ts, feature-load-failure.spec.ts,
// tab-and-update.spec.ts). Add another entry only with a documented reason a
// classified helper genuinely cannot express -- not as a migration shortcut.
const ALLOWLIST: readonly string[] = ['skip-classification-audit.spec.ts'];

function withoutJsComments(source: string): string {
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
  const specFiles = fs.readdirSync(specsDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.spec.ts'))
    .map((entry) => entry.name);

  const offenders: string[] = [];
  for (const name of specFiles) {
    if (ALLOWLIST.includes(name)) continue;
    const source = withoutJsComments(fs.readFileSync(path.join(specsDir, name), 'utf8'));
    if (/\btest\.skip\(/.test(source)) offenders.push(name);
  }

  expect(offenders, `these specs call test.skip() directly instead of skipExpectedTargetExclusion/skipEnvironmentLimitation/skipTemporaryGap from support/target-profile.ts: ${offenders.join(', ')}`).toEqual([]);
});
