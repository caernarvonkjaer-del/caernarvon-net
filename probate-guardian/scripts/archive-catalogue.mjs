// TEST-REVIEW.md Delivery 7 (2026-10-15): archive/testing/suite-reference.json
// and README.md -- a catalogue of retired tests and tools (where each last
// lived, the commit that retired it, the command that reads it back), the
// comparisons against older builds that still run, and the recorded
// baselines. Nothing is copied: every entry is a path, a commit and a
// command, derived from git history and tests/baseline/, so the catalogue
// needs no hand upkeep. tests/unit/archive-catalogue.spec.js holds the file
// to what this would derive now, and to naming only files that are gone and
// commits that exist.
//
// Usage (from probate-guardian/):
//   node scripts/archive-catalogue.mjs            print what would be written
//   node scripts/archive-catalogue.mjs --write    write both files
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PREFIX = 'probate-guardian/';
export const REFERENCE_PATH = 'archive/testing/suite-reference.json';
export const README_PATH = 'archive/testing/README.md';

export function git(...args) {
  return execFileSync('git', args, { cwd: path.dirname(ROOT), encoding: 'utf8' });
}

const RETIRED_KINDS = /\.(spec\.js|spec\.ts|mjs|js|ts|json|txt)$/;

/** Every test or tool file under tests/ or scripts/ that git records as deleted and that does not exist today. */
export function retiredFiles() {
  const log = git('log', '--diff-filter=D', '--name-only', '--format=%H%x09%h%x09%ad%x09%s', '--date=short', '--', `${PREFIX}tests`, `${PREFIX}scripts`);
  const out = [];
  const seen = new Set();
  let commit = null;
  for (const line of log.split('\n')) {
    if (line.includes('\t')) {
      const [full, , date, subject] = line.split('\t');
      // A fixed seven characters of the full hash: git's own abbreviation grows with
      // the repository's objects and so differs by machine (this workstation's had
      // grown to eight on 2026-10-15 while GitHub's runner still gave seven).
      commit = { short: full.slice(0, 7), date, subject: subject.slice(0, 140) };
    } else if (line.trim() && commit) {
      const full = line.trim();
      if (!full.startsWith(PREFIX)) continue;
      const rel = full.slice(PREFIX.length);
      if (!RETIRED_KINDS.test(rel) || seen.has(rel) || fs.existsSync(path.join(ROOT, rel))) continue;
      seen.add(rel);
      out.push({ path: rel, retiredBy: commit.short, retiredOn: commit.date, subject: commit.subject, lastVersion: `${commit.short}^:${full}`, readBack: `git show ${commit.short}^:${full}` });
    }
  }
  return out;
}

export const HISTORICAL = [
  {
    what: "Milestone 70's merge-gate output comparison: every filing type's PDF and court workbook from this tree against a pinned pre-merge build, served side by side",
    paths: ['tests/historical/pre-merge-output.characterization.spec.ts', 'tests/e2e/support/pre-merge-case.ts', 'tests/e2e/support/pre-70-build.ts'],
    runWith: 'npm run test:e2e:historical (playwright.historical.config.ts); PG_PREMERGE_SHA pins the build, the default is in tests/e2e/support/pre-merge-case.ts',
    pinnedBuild: '44f46ec',
    since: 'TEST-REVIEW.md Delivery 2, cc66ae4 (2026-10-14); in tests/e2e behind a skip before that',
  },
  {
    what: 'The mixed-version and rollback characterizations: an old tab beside a new one; a file saved by the migrated version opened in the pre-merge one',
    paths: ['tests/e2e/mixed-version.characterization.spec.ts', 'tests/e2e/rollback.contract.spec.ts', 'scripts/ms70-sav-corpus.mjs'],
    runWith: 'part of npm test (the source profile); the old build is extracted once with git archive into the temp folder ms70-sav-corpus/<sha> (scripts/ms70-sav-corpus.mjs, extract()); a copy on C: cannot run git, so extract from D: first',
    pinnedBuild: 'b28bf25 and 44f46ec',
  },
  {
    what: 'The .sav corpus -- every archive version this app has written -- and its golden',
    paths: ['tests/fixtures/sav', 'tests/baseline/ms70-sav-corpus-golden.json', 'tests/e2e/sav-corpus.characterization.spec.ts'],
    runWith: 'tests/e2e/sav-corpus.characterization.spec.ts in npm test',
  },
];

/**
 * The suite before this remediation (TEST-REVIEW.md section 8.2's stable
 * reference): the tree where the last pre-remediation full regression passed,
 * agreed by the requester on 2026-10-15 (no tag, no external snapshot -- the
 * commit and GitHub's view of it are the reference). The spec verifies the
 * commit exists, the short form resolves to it, and every path resolves at it.
 */
export const CAPTURE_POINT = Object.freeze({
  sha: 'a5833f5f975b73ac481f0aa2a610c78b67fbba1a',
  short: 'a5833f5',
  date: '2026-10-12',
  what: "the tree where the 2026-10-12 full regression passed, before TEST-REVIEW.md's deliveries changed the suite (Milestone 73Q's last fix)",
  paths: ['probate-guardian/tests', 'probate-guardian/scripts', 'probate-guardian/playwright.config.ts', 'probate-guardian/vitest.config.ts', 'probate-guardian/package-lock.json', 'probate-guardian/TEST-INDEX.md', 'probate-guardian/AGENTS.md'],
  browse: 'https://github.com/caernarvonkjaer-del/caernarvon-net/tree/a5833f5f975b73ac481f0aa2a610c78b67fbba1a/probate-guardian/tests',
  download: 'https://github.com/caernarvonkjaer-del/caernarvon-net/archive/a5833f5f975b73ac481f0aa2a610c78b67fbba1a.zip',
  checkout: 'git worktree add ../pg-a5833f5 a5833f5 (from D:/caernarvon-net, the git root), then npm ci in ../pg-a5833f5/probate-guardian; the archived tests need the matching source, which that worktree is',
  toolchain: 'Node 24 and the lockfile at that commit (package-lock.json pins Playwright, Vitest and Vite); browsers as npx playwright install puts them',
});

export function baselines() {
  return fs.readdirSync(path.join(ROOT, 'tests/baseline')).sort().map((name) => {
    let note = '';
    if (name.endsWith('.json')) {
      try { const d = JSON.parse(fs.readFileSync(path.join(ROOT, 'tests/baseline', name), 'utf8')); note = typeof d === 'object' && d ? String(d.note || d.generatedBy || '') : ''; } catch { note = ''; }
    }
    return { file: `tests/baseline/${name}`, note: note.slice(0, 220) };
  });
}

export function derive() {
  return {
    note: 'TEST-REVIEW.md Delivery 7 (2026-10-15): a catalogue, not a copy. Where retired tests and tools last lived and the commit that retired them (read one back with the command given), which comparisons against older builds still run and how, and what each recorded baseline is. Historical evidence is not current coverage: a green run of anything here says nothing about the suite as it is today (TEST-INDEX.md and the live specs say that). Regenerate with node scripts/archive-catalogue.mjs --write; the retired list is derived from git history, so it needs no hand upkeep.',
    capturePoint: CAPTURE_POINT,
    retired: retiredFiles(),
    historicalComparisons: HISTORICAL,
    baselines: baselines(),
  };
}

const cell = (s) => String(s).replace(/\|/g, '\\|');

export function readme(reference) {
  const rows = reference.retired.map((r) => `| \`${r.path}\` | ${r.retiredOn} \`${r.retiredBy}\` | ${cell(r.subject)} | \`${r.readBack}\` |`).join('\n');
  const hist = reference.historicalComparisons.map((h) => `- **${h.what}** -- ${h.paths.map((p) => `\`${p}\``).join(', ')}; run with: ${h.runWith}${h.pinnedBuild ? `; pinned build: ${h.pinnedBuild}` : ''}${h.since ? `; ${h.since}` : ''}`).join('\n');
  return `# Archived testing: a catalogue, not a copy

TEST-REVIEW.md Delivery 7 (2026-10-15). This folder holds references, never
a second copy of any test, fixture or result. A reader can find and read
back a retired test or tool, run the comparisons against older builds that
still exist, and know what each recorded baseline is -- without mistaking
any of it for current coverage. What the suite covers today is
\`TEST-INDEX.md\` and the live specs; a green run of anything catalogued here
says nothing about today's suite.

\`suite-reference.json\` beside this file is the machine-readable form.
Both are written by \`node scripts/archive-catalogue.mjs --write\` from git
history (\`git log --diff-filter=D\` over \`tests/\` and \`scripts/\`), the
historical comparisons the script lists, and \`tests/baseline/\`; they need
no hand upkeep, and \`tests/unit/archive-catalogue.spec.js\` fails when the
files no longer say what the script would derive, name a file that still
exists, or cite a commit that does not.

## The suite before this remediation

The reference is ${reference.capturePoint.what}: commit \`${reference.capturePoint.short}\`
(\`${reference.capturePoint.sha}\`, ${reference.capturePoint.date}), agreed by the
requester on 2026-10-15 as the stable reference. No tag was created and no
snapshot exists outside the repository (both decided the same day): the
commit is the reference.

- Without Git: browse it at ${reference.capturePoint.browse} or download the
  whole tree at that commit from ${reference.capturePoint.download}.
- With Git: ${reference.capturePoint.checkout}. Toolchain: ${reference.capturePoint.toolchain}.
  Ask before running its full regression (AGENTS.md section 2); a green run
  there says what the suite was, not what it is.
- What it holds: ${reference.capturePoint.paths.map((p) => `\`${p}\``).join(', ')}.

## Retired tests and tools

Every test or tool file under \`tests/\` or \`scripts/\` that git records as
deleted and that does not exist today, with the commit that retired it and
the command that reads its last version back (run from \`D:\\caernarvon-net\`,
the git root; a copy on C: cannot run git). The commit message says why.

| Path (as it was) | Retired | Why (the commit) | Read it back |
| --- | --- | --- | --- |
${rows}

## Comparisons against older builds that still run

${hist}

## Recorded baselines (\`tests/baseline/\`)

Measurements and goldens the live specs compare against, each with its own
note inside the file (listed in \`suite-reference.json\`). They are evidence
of a run on a day and a machine, re-measured rather than trusted (AGENTS.md
section 1): \`runtime-2026-10-12.json\` (before TEST-REVIEW.md Delivery 1M)
and \`runtime-2026-10-14.json\` (after) record the cut in \`npm test\`'s time;
the \`ms70-*\` files are Milestone 70's migration goldens and inventories;
\`milestone-*\` and \`20*-*\` are older lifecycle and startup measurements.

## What is deliberately not here

- No in-repository snapshot of the suite at any date: git holds every
  version (\`git show <commit>:<path>\`), and the table above says which
  commit to ask.
- No tag and no external snapshot: the requester decided both on
  2026-10-15; the commit above and GitHub's view of it are the reference.
  No moved tool: each would need the requester's explicit approval (the
  plan's Delivery 7).
- No retired tool reachable from active discovery: the test-index guard and
  the profile membership check read only \`tests/unit\`, \`tests/e2e\` and
  \`tests/historical\`, and the catalogue check above holds this folder to
  naming only files that are gone.
`;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const reference = derive();
  if (process.argv.includes('--write')) {
    fs.mkdirSync(path.join(ROOT, 'archive/testing'), { recursive: true });
    fs.writeFileSync(path.join(ROOT, REFERENCE_PATH), JSON.stringify(reference, null, 1) + '\n');
    fs.writeFileSync(path.join(ROOT, README_PATH), readme(reference));
    console.log(`wrote ${REFERENCE_PATH} and ${README_PATH}: ${reference.retired.length} retired, ${reference.baselines.length} baselines`);
  } else {
    console.log(`${reference.retired.length} retired files, ${reference.historicalComparisons.length} historical comparisons, ${reference.baselines.length} baselines`);
    for (const r of reference.retired) console.log(`  ${r.retiredOn} ${r.retiredBy} ${r.path}`);
  }
}
