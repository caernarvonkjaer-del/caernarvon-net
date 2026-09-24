// Milestone 70 (MILESTONE-70-PROPOSAL.md, "Branch workflow and the
// master-fix ledger"; technical choice T2). MS 70 is built on the
// milestone-70 branch while production fixes keep landing on master (D1).
// Every master commit made after the branch point has to be carried into the
// migrated code before the branch merges, and MILESTONE-70-FIX-LEDGER.md is
// the record of that. This guard is what keeps the record honest: it lists
// the master commits since the branch point and fails on any the ledger does
// not name, so a fix cannot be lost by being forgotten.
//
// Usage (from probate-guardian/):
//   node scripts/ms70-ledger-guard.mjs            every master commit is listed
//   node scripts/ms70-ledger-guard.mjs --merge    ...and no row is still open
//   options: --upstream=<ref> (default origin/master), --no-fetch,
//            --branch-point=<sha> (overrides the ledger's, for checking the guard)
//
// It also reports the number of rows marked "re-implement": decision D7
// merges master into the branch at the 70I checkpoint when that count is 10
// or more.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const LEDGER_FILE = 'MILESTONE-70-FIX-LEDGER.md';
export const DISPOSITIONS = ['merges-cleanly', 're-implement', 'not-applicable'];
export const STATUSES = ['open', 'carried', 'n/a'];
export const D7_REIMPLEMENT_TRIGGER = 10;

const SHA_CELL = /^`?([0-9a-f]{40})`?$/;

/** The branch point the ledger records: the full SHA on its "Branch point:" line. */
export function parseBranchPoint(text) {
  const match = /^Branch point:\s*`?([0-9a-f]{40})`?/m.exec(String(text || ''));
  return match ? match[1] : null;
}

/**
 * The ledger's commit rows: every markdown table row whose first cell is a
 * full 40-character SHA. Header, separator and prose lines are not rows.
 * Columns: SHA | Date | Summary | Files touched | Disposition |
 * Proving test(s) | Branch commit | Status.
 */
export function parseLedgerRows(text) {
  const rows = [];
  for (const line of String(text || '').split(/\r?\n/)) {
    if (!line.startsWith('|')) continue;
    const cells = line.split('|').slice(1, -1).map((c) => c.trim());
    const sha = SHA_CELL.exec(cells[0] || '');
    if (!sha) continue;
    rows.push({
      sha: sha[1],
      cells,
      disposition: (cells[4] || '').replace(/`/g, ''),
      status: (cells[7] || '').replace(/`/g, ''),
    });
  }
  return rows;
}

/** Master commits (in the order given) that no ledger row names. */
export function findUnlistedCommits(ledgerText, masterShas) {
  const listed = new Set(parseLedgerRows(ledgerText).map((r) => r.sha));
  return masterShas.filter((sha) => !listed.has(sha));
}

/** Rows that are malformed: wrong cell count, or a disposition/status outside the allowed words. */
export function findMalformedRows(ledgerText) {
  return parseLedgerRows(ledgerText).filter((r) => r.cells.length !== 8
    || !DISPOSITIONS.includes(r.disposition)
    || !STATUSES.includes(r.status));
}

/** Rows still to be carried over; the merge requires none. */
export const findOpenRows = (ledgerText) => parseLedgerRows(ledgerText).filter((r) => r.status === 'open');

/** How many rows are marked re-implement (decision D7's trigger). */
export const countReimplementRows = (ledgerText) => parseLedgerRows(ledgerText).filter((r) => r.disposition === 're-implement').length;

function git(args, cwd) {
  return execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}

function main() {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const flags = new Map(process.argv.slice(2).map((a) => {
    const [k, ...v] = a.replace(/^--/, '').split('=');
    return [k, v.length ? v.join('=') : true];
  }));
  const text = fs.readFileSync(path.join(root, LEDGER_FILE), 'utf8');
  const branchPoint = flags.get('branch-point') || parseBranchPoint(text);
  if (!branchPoint) {
    console.error(`${LEDGER_FILE} has no "Branch point: <full sha>" line.`);
    process.exit(2);
  }
  const upstream = flags.get('upstream') || 'origin/master';
  if (!flags.has('no-fetch')) {
    try { git(['fetch', '-q', 'origin', 'master'], root); } catch (err) {
      console.warn(`git fetch failed (${err.message.split('\n')[0]}); checking against the local ${upstream}.`);
    }
  }
  const range = git(['rev-list', '--reverse', `${branchPoint}..${upstream}`], root);
  const masterShas = range ? range.split('\n') : [];

  const problems = [];
  const unlisted = findUnlistedCommits(text, masterShas);
  for (const sha of unlisted) {
    problems.push(`not in the ledger: ${sha.slice(0, 7)} ${git(['log', '-1', '--format=%s', sha], root)}`);
  }
  for (const row of findMalformedRows(text)) {
    problems.push(`malformed row ${row.sha.slice(0, 7)}: ${row.cells.length} cells, disposition "${row.disposition}", status "${row.status}"`);
  }
  if (flags.has('merge')) {
    for (const row of findOpenRows(text)) problems.push(`still open (the merge requires none): ${row.sha.slice(0, 7)}`);
  }

  const reimplement = countReimplementRows(text);
  console.log(`branch point ${branchPoint.slice(0, 7)}; ${masterShas.length} master commit(s) since, ${unlisted.length} unlisted.`);
  console.log(`re-implement rows: ${reimplement} (decision D7 merges master into the branch at 70I at ${D7_REIMPLEMENT_TRIGGER} or more).`);
  if (problems.length) {
    for (const p of problems) console.error(`  ${p}`);
    process.exit(1);
  }
  console.log('ledger guard: OK');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
