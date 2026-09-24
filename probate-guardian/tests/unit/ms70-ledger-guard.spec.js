import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';
import {
  LEDGER_FILE, DISPOSITIONS, STATUSES, parseBranchPoint, parseLedgerRows, findUnlistedCommits,
  findMalformedRows, findOpenRows, countReimplementRows,
} from '../../scripts/ms70-ledger-guard.mjs';

// Milestone 70, 70A. MS 70 is built on the milestone-70 branch while
// production fixes keep landing on master (decision D1). Every master commit
// after the branch point must be carried into the migrated code, and the
// ledger guard is what stops one being forgotten. Its gate (70A): it must
// fail on a deliberately unlisted master commit.

const SHA = (c) => c.repeat(40);
const row = (sha, disposition = 're-implement', status = 'open') =>
  `| \`${sha}\` | 2026-09-25 | fix something | src/legacy-app.js | ${disposition} | tests/e2e/x.spec.ts | -- | ${status} |`;
const ledger = (...rows) => [
  '# Ledger',
  '',
  `Branch point: \`${SHA('a')}\` (master at aaaaaaa)`,
  '',
  '| SHA | Date | Summary | Files touched | Disposition | Proving test(s) | Branch commit | Status |',
  '| --- | --- | --- | --- | --- | --- | --- | --- |',
  ...rows,
  '',
  `Prose mentioning ${SHA('f')} is not a row.`,
].join('\n');

describe('parsing the ledger', () => {
  test('reads the branch point from its own line', () => {
    expect(parseBranchPoint(ledger())).toBe(SHA('a'));
    expect(parseBranchPoint('no branch point here')).toBeNull();
  });

  test('a row is a table line whose first cell is a full SHA; header, separator and prose are not', () => {
    const rows = parseLedgerRows(ledger(row(SHA('b')), row(SHA('c'), 'merges-cleanly', 'carried')));
    expect(rows.map((r) => r.sha)).toEqual([SHA('b'), SHA('c')]);
    expect(rows[1]).toMatchObject({ disposition: 'merges-cleanly', status: 'carried' });
    expect(parseLedgerRows('| abc1234 | short SHAs are not rows | x | x | re-implement | x | x | open |')).toEqual([]);
  });
});

describe('the guard', () => {
  test('passes when every master commit since the branch point is listed', () => {
    expect(findUnlistedCommits(ledger(row(SHA('b')), row(SHA('c'))), [SHA('b'), SHA('c')])).toEqual([]);
  });

  test('fails on a deliberately unlisted master commit (the 70A gate)', () => {
    expect(findUnlistedCommits(ledger(row(SHA('b'))), [SHA('b'), SHA('d')])).toEqual([SHA('d')]);
    expect(findUnlistedCommits(ledger(), [SHA('d')]), 'an empty ledger lists nothing').toEqual([SHA('d')]);
  });

  test('flags malformed rows: wrong cell count, or a disposition or status outside the allowed words', () => {
    const bad = [
      row(SHA('b'), 'maybe'),
      row(SHA('c'), 're-implement', 'done'),
      `| \`${SHA('e')}\` | too | few | cells |`,
    ];
    expect(findMalformedRows(ledger(row(SHA('d')), ...bad)).map((r) => r.sha)).toEqual([SHA('b'), SHA('c'), SHA('e')]);
    expect(DISPOSITIONS).toEqual(['merges-cleanly', 're-implement', 'not-applicable']);
    expect(STATUSES).toEqual(['open', 'carried', 'n/a']);
  });

  test('merge mode finds the rows still open, and D7 counts the re-implement rows', () => {
    const text = ledger(row(SHA('b')), row(SHA('c'), 're-implement', 'carried'), row(SHA('d'), 'not-applicable', 'n/a'));
    expect(findOpenRows(text).map((r) => r.sha)).toEqual([SHA('b')]);
    expect(countReimplementRows(text)).toBe(2);
  });
});

describe('the real ledger', () => {
  const text = fs.readFileSync(path.join(__dirname, '..', '..', LEDGER_FILE), 'utf8');

  test('records the milestone-70 branch point', () => {
    expect(parseBranchPoint(text)).toBe('a9c993011c4b3081b004637bf21752b95698f85b');
  });

  test('has no malformed rows', () => {
    expect(findMalformedRows(text)).toEqual([]);
  });
});
