// Milestone 70, 70A: the pre-migration `.sav` corpus (MILESTONE-70-PROPOSAL.md,
// 70A: "Generate the old-format .sav corpus from history, not only from
// today's writer"). Fixtures written by today's code prove only today's shape,
// so every fixture here is written by the version of the app it is named for:
// that commit's probate-guardian/ is extracted with `git archive` into a
// temporary folder, served on http://localhost, and driven through its own
// startup and Add Filing screens; the case is then saved by that version's
// own writer, buildCaseFileBlob() -- the function its Save and Export run.
//
// Checkpoints: one per milestone that changed a persisted shape
// (probate-guardian-data-model.csv's history), taking the milestone's last
// such commit, plus every build that left the development machine (the 9/16
// test server, the 9/22 production portable and both 9/24 zips, each matched
// to its commit by the monolith's exact bytes), plus the branch point -- the
// last code before Milestone 70. Nothing earlier than 2026-09-10 (the first
// data-model contract) is included: no build left the machine before 9/16.
// Milestone 55D changed only a requiredness rule, not a stored shape, and has
// no checkpoint of its own.
//
// Two cases per checkpoint, all synthetic and non-sensitive:
//   plain     no password; a caseload of five wards and all nine filing
//             identities -- Corpus Ward One has a Guardian Inventory, an
//             Annual Accounting, an Annual Plan and an Initial Plan on one
//             case; four more wards have one or two filings each;
//   encrypted the documented test password below; Corpus Ward One's Guardian
//             Inventory and Annual Accounting.
// Each filing gets the fields every version stores the same way (case number,
// county, period, the first guardian's name and address, one row on the main
// schedules), written into the open filing directly as the e2e fixtures do,
// and only where that version's filing already has the key. Yes/No answers are
// left at each version's own defaults: their stored form changed (booleans,
// then '' / 'Yes' / 'No'), and each version's default is exactly the shape a
// filer's file from that version carries.
//
// Shared records are made by the app's own functions, where the version has
// them: choosing the county on the Cover (the ward's record), "+ New Shared
// Record" for the guardian on the first filing and attaching that record to
// every later one, the ward's record attached to its later filings, the case
// record for each filing, one dismissed pair of possible duplicates (Wards
// Three and Four), and an audit entry. The manifest records, per filing, the
// values as stored after all of that, the steps each version supported, and
// any step that threw -- so the reader test checks what was really written.
//
// Usage (from probate-guardian/):
//   node scripts/ms70-sav-corpus.mjs --write            every checkpoint
//   node scripts/ms70-sav-corpus.mjs --write --only=<label>[,<label>]
//   node scripts/ms70-sav-corpus.mjs --list
// Writes tests/fixtures/sav/<label>-<case>.sav and tests/fixtures/sav/corpus.json.
import { chromium } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { startServer } from './serve-portable-http.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const CORPUS_DIR = 'tests/fixtures/sav';
export const CORPUS_MANIFEST = `${CORPUS_DIR}/corpus.json`;
/** Documented, synthetic, committed: it protects nothing real. */
export const TEST_PASSWORD = 'MS70-corpus-test-password';
const PORT = 4336; // the milestone-70 branch's own (MILESTONE-70-FIX-LEDGER.md)
const BASE = '/era/';

// [label, sha, why]. Labels sort in history order.
export const CHECKPOINTS = [
  ['01-ms34-2', '4244ea7', 'Milestone 34-2: the canonical data-model contract, the first recorded persisted shape'],
  ['02-guardianship-type', '78ee85a', 'Guardianship selection controls (typeOfGuardianship)'],
  ['03-ms36', 'e5fb9cf', 'Milestone 36: dashboard consolidation and data-entry fields'],
  ['04-ms37', 'c032b3b', 'Milestone 37: advance-directive cards; explicit yes/no controls'],
  ['05-ms39', '8c80e49', 'Milestone 39: three-state signature capture on every form'],
  ['06-ms40c-1', 'cc3732a', 'Milestone 40C-1: county on the ward Party (the Party model)'],
  ['07-ms38e', '1981b71', 'Milestone 38E: global yes/no radio pairs and legacy normalization'],
  ['08-ms46a', 'a457bbd', 'Milestone 46A: per-party signature stamp store'],
  ['09-ms49', 'f4a87ec', 'Milestone 49: Compare, unmerge, near-name matches'],
  ['10-ms49b', 'ec0b5cf', 'Milestone 49B: ward identity as a shared role'],
  ['11-test-server-0916', 'ba66083', 'The 9/16 test-server build (probate-guardian-test-server.zip)'],
  ['12-ms57', '460a228', 'Milestone 57 and 57C-R: filing fidelity; the schedule-documents acknowledgement'],
  ['13-ms57-b4', 'cda0b57', 'Schedule B-4 multi-account filing'],
  ['14-ms58b', '60a1f0c', 'Milestone 58B: Minor Plan carry and cover fields'],
  ['15-ms58d', 'b1aafcf', 'Milestone 58D: Part XI answered'],
  ['16-ms57b', 'f517df9', 'Milestone 57B: one service-recipient rule'],
  ['17-ms60k', '86dcd01', 'Milestone 60K: derived safe-deposit amounts; C-2 fields'],
  ['18-ms60g-j', '7a10b19', 'Milestones 60G/I/J: the remuneration declaration on every filing'],
  ['19-ms61a', '12c2914', 'Milestone 61A: Plan Simplified preparer and attorney details'],
  ['20-ms63e', '3a96e3d', 'Milestone 63E: Uniform Case Number'],
  ['21-ms64a-2', '7e5d8b3', "Milestone 64A-2: D-5 'Indicate if', compilation date, C-2 attorney"],
  ['22-production-0922', '979ebe6', 'The 9/22 production portable (probate-forms-portable.zip)'],
  ['23-ms67a', '8181ced', 'Milestone 67A: a guardian or attorney as the preparer'],
  ['24-ms67b', '1b69806', 'Milestone 67B: the four-state bond question'],
  ['25-ms68', 'c434e33', 'Milestone 68B/C/E/G: Plan periods, certificates, multi-answer questions'],
  ['26-zip-0924', '2178d4b', 'The 9/24 morning zip (probate-forms-portable-2026-09-24.zip)'],
  ['27-branch-point', 'a9c9930', 'The milestone-70 branch point: the last code before Milestone 70'],
  ['28-zip-0924b', 'b28bf25', 'The 9/24 evening zip (probate-forms-portable-2026-09-24b.zip), on master after the branch point'],
];

const PERSON = { name: 'Corpus Guardian', streetAddress: '1 Corpus Way', cityStateZip: 'Clearwater, FL 33755', mailingStreet: '1 Corpus Way', mailingCityStateZip: 'Clearwater, FL 33755', email: 'guardian@example.invalid' };
const ACCOUNTING = {
  fields: { county: 'Pinellas', periodFrom: '2025-01-01', periodTo: '2025-12-31', startingBalance: '5000' },
  firstOf: { guardians: PERSON },
  rows: {
    schA: { payer: 'Social Security', description: 'Benefits', bank: 'First Corpus Bank', accountNo: '1001', amount: 1200 },
    schD1: { description: 'Checking', accountNo: '1001', type: 'Checking', fullAmount: 5000, wardPct: '100' },
  },
};
/** What each identity's filing is given, besides its case number. */
export const FILL = {
  guardian: {
    fields: { county: 'Pinellas', guardianName: 'Corpus Guardian' },
    firstOf: { guardians: PERSON },
    rows: { scheduleA1: { propertyDescription: 'Family Home', streetAddress: '1 Corpus Way', cityStateZip: 'Clearwater, FL 33755', fullAssetValue: 250000, wardPercent: 50 } },
  },
  simplified: { fields: { county: 'Pinellas', periodFrom: '2025-01-01', periodTo: '2025-12-31', startingBalance: '1000', interestIncome: '12.50' }, firstOf: { guardians: PERSON }, rows: {} },
  annual: ACCOUNTING,
  finalAccounting: ACCOUNTING,
  trustAccounting: ACCOUNTING,
  planSimplified: { fields: { county: 'Pinellas', q1Residences: 'At home with family' }, firstOf: { planGuardians: PERSON }, rows: {} },
  planAnnual: { fields: { county: 'Pinellas' }, firstOf: { planGuardians: PERSON }, rows: {} },
  planInitial: { fields: { county: 'Pinellas', guardianNames: 'Corpus Guardian', mailingAddress: '1 Corpus Way', mailingCityStateZip: 'Clearwater, FL 33755' }, firstOf: {}, rows: {} },
  planMinor: { fields: { county: 'Pinellas', guardianName: 'Corpus Guardian' }, firstOf: { planGuardians: PERSON }, rows: {} },
};

// [identity, ward (already title case: the app title-cases a new name), case number]
const CASELOAD = [
  ['guardian', 'Corpus Ward One', '2026-CP-000101'],
  ['annual', 'Corpus Ward One', '2026-CP-000101'],
  ['planAnnual', 'Corpus Ward One', '2026-CP-000101'],
  ['planInitial', 'Corpus Ward One', '2026-CP-000101'],
  ['simplified', 'Corpus Ward Two', '2026-CP-000102'],
  ['planSimplified', 'Corpus Ward Two', '2026-CP-000102'],
  ['finalAccounting', 'Corpus Ward Three', '2026-CP-000103'],
  ['trustAccounting', 'Corpus Ward Four', '2026-CP-000104'],
  ['planMinor', 'Corpus Ward Five', '2026-CP-000105'],
];
export const CASES = {
  plain: { password: null, filings: CASELOAD, dismiss: ['Corpus Ward Three', 'Corpus Ward Four'] },
  encrypted: { password: TEST_PASSWORD, filings: CASELOAD.slice(0, 2), dismiss: null },
};

/** That commit's probate-guardian/, extracted once into the temp folder; returns its path. */
export function extract(sha) {
  const dir = path.join(os.tmpdir(), 'ms70-sav-corpus', sha);
  const app = path.join(dir, 'probate-guardian');
  if (fs.existsSync(path.join(app, 'index.html'))) return app;
  fs.mkdirSync(dir, { recursive: true });
  execFileSync('git', ['archive', '--format=tar', '-o', path.join(dir, 'tree.tar'), sha, 'probate-guardian'], { cwd: path.dirname(ROOT), stdio: ['ignore', 'ignore', 'pipe'] });
  // Relative names: GNU tar reads a drive letter (C:) as a remote host.
  execFileSync('tar', ['-xf', 'tree.tar'], { cwd: dir });
  fs.rmSync(path.join(dir, 'tree.tar'));
  return app;
}

async function startCase(page, password) {
  await page.locator('#startup-choice-overlay.show').waitFor({ state: 'visible', timeout: 30_000 });
  await page.click('#startup-newcase-btn, #startup-newcase-link');
  await page.locator('#startup-choice-overlay').waitFor({ state: 'hidden' });
  await page.locator('#security-choice-overlay.show').waitFor({ state: 'visible' });
  const mode = password ? 'encrypted' : 'none';
  await page.click(`#security-choice-overlay [data-startup-action="select-security"][data-security-mode="${mode}"]`);
  if (password) {
    await page.locator('#unlock-overlay.show').waitFor({ state: 'visible' });
    await page.fill('#unlock-password', password);
    await page.fill('#unlock-password-confirm', password);
    await page.click('#unlock-submit-btn');
    await page.locator('#unlock-overlay').waitFor({ state: 'hidden' });
  }
  await page.locator('#security-choice-overlay').waitFor({ state: 'hidden' });
}

async function createFiling(page, type, name) {
  const before = await page.evaluate(() => (window.caseFile.wards || []).length);
  await page.evaluate((t) => window.showAddWardModalForType(t), type);
  if (type === 'simplified') {
    await page.locator('#simplifiedEligibilityModal.show').waitFor({ state: 'visible' });
    await page.fill('#elig-ward-name', name);
    await page.selectOption('#elig-depository', 'Yes');
    await page.selectOption('#elig-only-transactions', 'Yes');
    await page.click('#simplifiedEligibilityModal [data-modal-action="confirm-simplified-eligibility"]');
    await page.locator('#simplifiedEligibilityModal').waitFor({ state: 'hidden' });
  } else {
    await page.locator('#addWardModal.show').waitFor({ state: 'visible' });
    await page.fill('#new-ward-name', name);
    await page.click('#addWardModal [data-modal-action="add-ward"]');
    await page.locator('#addWardModal').waitFor({ state: 'hidden' });
  }
  // The new filing is open: one more filing, and it is the active one.
  await page.waitForFunction((count) => {
    const wards = window.caseFile.wards || [];
    return wards.length === count + 1 && window.D && window.D.wardId === wards[wards.length - 1].wardId;
  }, before, { timeout: 15_000 });
}

/** Write `spec` into the open filing, only where the key already exists; return the paths written. */
function fillInPage({ spec, caseNumber }) {
  const D = window.D;
  const paths = [];
  const put = (obj, key, value, at) => { if (obj && typeof obj === 'object' && key in obj) { obj[key] = value; paths.push(at); } };
  put(D, 'caseNumber', caseNumber, 'caseNumber');
  for (const [k, v] of Object.entries(spec.fields)) put(D, k, v, k);
  for (const [arr, vals] of Object.entries(spec.firstOf)) {
    const first = Array.isArray(D[arr]) ? D[arr][0] : null;
    for (const [k, v] of Object.entries(vals)) put(first, k, v, `${arr}.0.${k}`);
  }
  for (const [arr, row] of Object.entries(spec.rows)) {
    if (!Array.isArray(D[arr])) continue;
    const seed = D[arr][0] && typeof D[arr][0] === 'object' ? D[arr][0] : null;
    // A seeded row gives this version's own row keys; without one, the row as given.
    const keys = seed ? Object.keys(seed) : Object.keys(row);
    D[arr] = [Object.fromEntries(keys.map((k) => [k, k in row ? row[k] : seed[k]]))];
    for (const k of keys) if (k in row) paths.push(`${arr}.0.${k}`);
  }
  window.autoSave();
  return paths;
}

/** The app's own shared-record steps, where this version has them. */
function sharedRecordsInPage({ wardPartyId, guardianPartyId }) {
  const w = window;
  const D = w.D;
  const did = [];
  const errors = [];
  const has = (...names) => names.every((n) => typeof w[n] === 'function');
  const step = (label, fn) => { try { fn(); did.push(label); } catch (e) { errors.push(`${label}: ${e.message}`); } };
  if (wardPartyId && has('resolveParty', 'setPartyIdForSlot', 'hydrateFromParty')) {
    step('attach the ward record', () => { const p = w.resolveParty(wardPartyId); if (!p) throw new Error('not found'); w.setPartyIdForSlot(D, 'ward', 0, p.id); w.hydrateFromParty(p, D, 'ward', 0); });
  }
  if (has('commitCoverCounty')) step('county on the Cover', () => w.commitCoverCounty(D, 'Pinellas'));
  else if (has('ensureWardPartyForFiling')) step('the ward record', () => w.ensureWardPartyForFiling(D));
  if (has('getOrCreateCaseForWard')) step('the case record', () => { const k = w.getOrCreateCaseForWard(D); if (k) D.caseId = k.id; });
  if (has('createParty', 'setPartyIdForSlot', 'dehydrateIntoParty')) {
    if (!guardianPartyId) {
      step('new guardian record', () => { const p = w.createParty('guardian'); w.setPartyIdForSlot(D, 'guardian', 0, p.id); w.dehydrateIntoParty(D, 'guardian', 0, p); guardianPartyId = p.id; });
    } else if (has('resolveParty', 'hydrateFromParty')) {
      step('attach the guardian record', () => { const p = w.resolveParty(guardianPartyId); if (!p) throw new Error('not found'); w.setPartyIdForSlot(D, 'guardian', 0, p.id); w.hydrateFromParty(p, D, 'guardian', 0); });
    }
  }
  const wardParty = has('wardPartyForFiling') ? w.wardPartyForFiling(D) : null;
  w.autoSave();
  return { did, errors, wardPartyId: wardParty?.id ?? wardPartyId ?? null, guardianPartyId };
}

/** Read the given paths back from the open filing, as stored. */
function readBackInPage(paths) {
  const get = (o, p) => p.split('.').reduce((v, k) => (v == null ? v : v[k]), o);
  return Object.fromEntries(paths.map((p) => [p, get(window.D, p)]));
}

async function finishInPage(dismiss) {
  const w = window;
  const cf = w.caseFile;
  const out = { dismissed: null, audited: false, errors: [] };
  if (dismiss && typeof w.dismissPartyPair === 'function' && typeof w.wardPartyForFiling === 'function') {
    try {
      const ids = dismiss.map((name) => w.wardPartyForFiling(cf.wards.find((x) => x.wardName === name))?.id);
      if (ids.every(Boolean)) { w.dismissPartyPair(ids[0], ids[1]); out.dismissed = dismiss; }
    } catch (e) { out.errors.push(`dismiss: ${e.message}`); }
  }
  if (typeof w.auditLog === 'function') {
    try { await w.auditLog('ms70-corpus', 'Milestone 70 synthetic corpus fixture', true, null); out.audited = true; } catch (e) { out.errors.push(`audit: ${e.message}`); }
  }
  await w.flushPendingSave?.();
  return out;
}

async function saveInPage() {
  const w = window;
  await w.flushPendingSave?.();
  const cf = w.caseFile;
  const r = await w.buildCaseFileBlob();
  const blob = r instanceof Blob ? r : r.blob;
  const bytes = new Uint8Array(await blob.arrayBuffer());
  // What the file itself says, read back with the app's own JSZip.
  const archived = JSON.parse(await (await w.JSZip.loadAsync(blob)).file('manifest.json').async('string'));
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return {
    base64: btoa(bin),
    wrote: {
      securityMode: archived.securityMode ?? null,
      formatVersion: archived.version ?? null,
      filings: (cf.wards || []).map((x) => ({ wardName: x.wardName, inventoryType: x.inventoryType, keys: Object.keys(x).length })),
      parties: (cf.parties || []).length,
      cases: (cf.cases || []).length,
      dismissedPartyPairs: (cf.dismissedPartyPairs || []).length,
      auditEntries: (w._auditLogEntries || []).length,
    },
  };
}

async function writeCase(browser, url, caseName) {
  const spec = CASES[caseName];
  const context = await browser.newContext();
  const page = await context.newPage();
  const pageErrors = [];
  page.on('pageerror', (e) => pageErrors.push(e.message));
  await page.addInitScript(() => {
    delete window.showSaveFilePicker;
    delete window.showOpenFilePicker;
    localStorage.setItem('pg.termsAccepted', '2026-09-15');
  });
  try {
    await page.goto(url, { waitUntil: 'networkidle' });
    await startCase(page, spec.password);
    const filings = [];
    const wardParties = {};
    let guardianPartyId = null;
    for (const [type, ward, caseNumber] of spec.filings) {
      await createFiling(page, type, ward);
      const paths = await page.evaluate(fillInPage, { spec: FILL[type], caseNumber });
      const shared = await page.evaluate(sharedRecordsInPage, { wardPartyId: wardParties[ward] || null, guardianPartyId });
      if (shared.wardPartyId) wardParties[ward] = shared.wardPartyId;
      guardianPartyId = shared.guardianPartyId;
      await page.evaluate(() => window.flushPendingSave?.());
      filings.push({ inventoryType: type, wardName: ward, stored: await page.evaluate(readBackInPage, paths), sharedRecordSteps: shared.did, sharedRecordErrors: shared.errors });
    }
    const finish = await page.evaluate(finishInPage, spec.dismiss);
    const saved = await page.evaluate(saveInPage);
    return { ...saved, filings, finish, pageErrors };
  } finally {
    await context.close();
  }
}

function commitInfo(sha) {
  const [full, date] = execFileSync('git', ['log', '-1', '--format=%H %cI', sha], { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim().split(' ');
  return { sha: full, committed: date };
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes('--list')) {
    for (const [label, sha, why] of CHECKPOINTS) console.log(`${label.padEnd(24)} ${sha}  ${why}`);
    return;
  }
  if (!args.includes('--write')) {
    console.log('Pass --write to generate (or --list). See the header for details.');
    return;
  }
  const only = (args.find((a) => a.startsWith('--only=')) || '').slice(7).split(',').filter(Boolean);
  const manifestPath = path.join(ROOT, CORPUS_MANIFEST);
  const manifest = fs.existsSync(manifestPath) ? JSON.parse(fs.readFileSync(manifestPath, 'utf8')) : { fixtures: [] };
  fs.mkdirSync(path.join(ROOT, CORPUS_DIR), { recursive: true });
  const browser = await chromium.launch();
  let failed = 0;
  try {
    for (const [label, sha, why] of CHECKPOINTS) {
      if (only.length && !only.includes(label)) continue;
      const app = extract(sha);
      const server = await startServer({ port: PORT, base: BASE, dir: app });
      try {
        for (const caseName of Object.keys(CASES)) {
          const file = `${label}-${caseName}.sav`;
          const started = Date.now();
          try {
            const r = await writeCase(browser, `http://localhost:${PORT}${BASE}index.html`, caseName);
            const bytes = Buffer.from(r.base64, 'base64');
            fs.writeFileSync(path.join(ROOT, CORPUS_DIR, file), bytes);
            const entry = {
              file, label, ...commitInfo(sha), why, case: caseName,
              password: CASES[caseName].password,
              bytes: bytes.length, sha256: crypto.createHash('sha256').update(bytes).digest('hex'),
              wrote: r.wrote, filings: r.filings, finish: r.finish, pageErrorsWhileWriting: r.pageErrors,
            };
            manifest.fixtures = manifest.fixtures.filter((f) => f.file !== file).concat(entry).sort((a, b) => a.file.localeCompare(b.file));
            const stepErrors = r.filings.flatMap((f) => f.sharedRecordErrors).concat(r.finish.errors);
            console.log(`${file}: ${bytes.length} bytes; ${r.wrote.filings.length} filings, ${r.wrote.parties} parties, ${r.wrote.cases} cases, ${r.wrote.dismissedPartyPairs} dismissed, ${r.wrote.auditEntries} audit; ${stepErrors.length} step errors, ${r.pageErrors.length} page errors (${Math.round((Date.now() - started) / 1000)}s)`);
            for (const e of stepErrors.concat(r.pageErrors)) console.log(`    ${e}`);
          } catch (e) {
            failed++;
            console.error(`${file}: FAILED -- ${String(e.message || e).split('\n')[0]}`);
          }
        }
      } finally {
        await new Promise((resolve) => server.close(resolve));
      }
    }
  } finally {
    await browser.close();
  }
  const note = 'Milestone 70, 70A: synthetic pre-migration .sav fixtures, each written by the commit it names (scripts/ms70-sav-corpus.mjs). Regenerating one replaces a historical artifact: do it only to add a checkpoint or for a recorded reason.';
  fs.writeFileSync(manifestPath, JSON.stringify({ note, testPassword: TEST_PASSWORD, fixtures: manifest.fixtures }, null, 1) + '\n');
  if (failed) { console.error(`${failed} case(s) failed`); process.exitCode = 1; }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
