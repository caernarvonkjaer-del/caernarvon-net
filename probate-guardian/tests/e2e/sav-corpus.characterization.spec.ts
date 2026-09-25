import { test, expect, type Page } from '@playwright/test';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { gotoApp } from './support/target';

// Milestone 70, 70A gate: "the historical and current format-v1 fixtures open
// successfully". tests/fixtures/sav/ holds a synthetic case file written by
// each of 28 earlier versions of the app -- one per milestone that changed a
// stored shape, every build that left the development machine, and the
// branch point -- each by that version's own writer
// (scripts/ms70-sav-corpus.mjs; corpus.json names each file's commit).
// Fixtures written by today's code would prove only today's shape.
//
// Every fixture is opened here the way a filer opens one: the startup
// screen's Open, and the password prompt for an encrypted file. Then:
//   - every filing it was written with is there, in order, by name and type;
//   - every field the writer stored is read back with the same value;
//   - the shared records (parties, cases) are at least what was written, and
//     the dismissed pairs exactly;
//   - each filing opens for editing with no page error;
//   - and a digest of everything loaded -- filings, parties, cases,
//     dismissals, with ids replaced by their order of appearance and times
//     by a placeholder -- matches tests/baseline/ms70-sav-corpus-golden.json.
//     That golden is what today's reader makes of each file; 70I's new reader
//     must make the same (regenerate it at the branch point to compare).
// Wrong passwords and damaged files are characterized too: what a filer sees
// today, recorded so 70I can prove the same safe failure.
//
// Regenerate the golden only for a deliberate, recorded change:
// PG_UPDATE_GOLDEN=1 npx playwright test tests/e2e/sav-corpus.characterization.spec.ts

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, '..', '..');
const CORPUS = path.join(ROOT, 'tests', 'fixtures', 'sav');
const MANIFEST = JSON.parse(fs.readFileSync(path.join(CORPUS, 'corpus.json'), 'utf8'));
const GOLDEN = path.join(ROOT, 'tests', 'baseline', 'ms70-sav-corpus-golden.json');
const UPDATE = process.env.PG_UPDATE_GOLDEN === '1';
const DYN_DIALOG = '.modal-overlay[id^="dyn-dialog-"].show';

type Golden = { note: string; fixtures: Record<string, unknown>; wrongPassword: Record<string, unknown>; damaged: Record<string, unknown> };
function readGolden(): Golden {
  return fs.existsSync(GOLDEN) ? JSON.parse(fs.readFileSync(GOLDEN, 'utf8')) : { note: '', fixtures: {}, wrongPassword: {}, damaged: {} };
}
function record(section: 'fixtures' | 'wrongPassword' | 'damaged', key: string, value: unknown): unknown {
  const golden = readGolden();
  if (UPDATE) {
    golden.note = "Milestone 70, 70A: what today's reader makes of each tests/fixtures/sav/ case file (a digest of everything loaded), and what a filer sees for a wrong password or a damaged file; written by tests/e2e/sav-corpus.characterization.spec.ts. Regenerate only for a deliberate, recorded change.";
    golden[section][key] = value;
    fs.writeFileSync(GOLDEN, JSON.stringify(golden, null, 1) + '\n');
  }
  return golden[section][key];
}

const get = (o: any, p: string) => p.split('.').reduce((v, k) => (v == null ? v : v[k]), o);

/**
 * Canonical JSON with run-to-run noise removed: keys sorted, every id
 * replaced by its order of first appearance (so which record links to which
 * survives), every timestamp by a placeholder.
 */
function canonical(value: unknown): string {
  const sortKeys = (v: any): any => Array.isArray(v) ? v.map(sortKeys)
    : v && typeof v === 'object' ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, sortKeys(v[k])])) : v;
  const ids: string[] = [];
  const collect = (v: any, key = '') => {
    if (Array.isArray(v)) { v.forEach((x) => (/Ids$|Pairs$/.test(key) && typeof x === 'string' ? ids.push(x) : collect(x, key))); return; }
    if (v && typeof v === 'object') { for (const [k, x] of Object.entries(v)) collect(x, k); return; }
    if (typeof v === 'string' && v && /(^id$|Id$)/.test(key)) ids.push(v);
  };
  const sorted = sortKeys(value);
  collect(sorted);
  let text = JSON.stringify(sorted);
  [...new Set(ids)].filter((id) => id.length >= 6).forEach((id, i) => { text = text.split(id).join(`<id${i + 1}>`); });
  return text.replace(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z?/g, '<time>');
}

async function waitForOutcome(page: Page) {
  await page.waitForFunction((dyn) => !!document.querySelector(dyn)
    || !!document.querySelector('#unlock-overlay.show')
    || !document.querySelector('#startup-choice-overlay.show'), DYN_DIALOG, { timeout: 20_000 });
}

async function openFromStartup(page: Page, file: string) {
  await gotoApp(page);
  await page.locator('#startup-choice-overlay.show').waitFor({ state: 'visible' });
  await page.setInputFiles('#startup-open-input', file);
  await waitForOutcome(page);
}

async function enterPassword(page: Page, password: string) {
  await page.locator('#unlock-overlay.show').waitFor({ state: 'visible' });
  await page.fill('#unlock-password', password);
  await page.click('#unlock-submit-btn');
}

/** What a filer is looking at right now, for a failed or partial open. */
async function observe(page: Page, pageErrors: string[]) {
  await page.waitForTimeout(500); // let an error dialog or a partial load settle
  const seen = await page.evaluate((dyn) => ({
    dialog: (document.querySelector(`${dyn} .modal-box-intro`)?.textContent || '').trim() || null,
    startupScreen: !!document.querySelector('#startup-choice-overlay.show'),
    passwordPrompt: !!document.querySelector('#unlock-overlay.show'),
    passwordError: (() => { const e = document.querySelector('#unlock-error') as HTMLElement | null; return e && e.offsetParent !== null ? (e.textContent || '').trim() : null; })(),
    filingsLoaded: ((window as any).GuardianForms.testing.snapshot().caseFile?.wards || []).length,
  }), DYN_DIALOG);
  return { ...seen, pageErrors: [...pageErrors] };
}

const tmpFile = (name: string, bytes: Buffer) => {
  const file = path.join(os.tmpdir(), `ms70-sav-${process.pid}-${name}`);
  fs.writeFileSync(file, bytes);
  return file;
};

for (const entry of MANIFEST.fixtures) {
  test(`${entry.file} (written by ${entry.sha.slice(0, 7)}) opens with everything it was written with`, async ({ page }) => {
    test.setTimeout(120_000);
    const pageErrors: string[] = [];
    page.on('pageerror', (e) => pageErrors.push(e.message));
    await openFromStartup(page, path.join(CORPUS, entry.file));
    if (entry.password) {
      await enterPassword(page, entry.password);
      await expect(page.locator('#unlock-overlay')).not.toHaveClass(/show/);
    }
    await expect(page.locator('#startup-choice-overlay')).not.toHaveClass(/show/);
    await page.waitForFunction((n) => ((window as any).GuardianForms.testing.snapshot().caseFile?.wards || []).length === n, entry.wrote.filings.length);

    const loaded = await page.evaluate(() => {
      const w = window as any;
      const cf = w.GuardianForms.testing.snapshot().caseFile;
      return JSON.parse(JSON.stringify({
        wards: cf.wards, parties: cf.parties || [], cases: cf.cases || [], dismissedPartyPairs: cf.dismissedPartyPairs || [],
        guardianName: cf.guardianName ?? null, guardianEmail: cf.guardianEmail ?? null, selectedCircuit: cf.selectedCircuit ?? null,
        securityMode: w.GuardianForms.testing.persistenceState.securityMode(),
      }));
    });
    expect(loaded.wards.map((x: any) => [x.wardName, x.inventoryType]), 'every filing, in order')
      .toEqual(entry.wrote.filings.map((x: any) => [x.wardName, x.inventoryType]));
    entry.filings.forEach((filing: any, i: number) => {
      for (const [p, v] of Object.entries(filing.stored)) {
        expect(get(loaded.wards[i], p), `${filing.inventoryType} (${filing.wardName}): ${p}`).toEqual(v);
      }
    });
    expect(loaded.parties.length, 'shared people records').toBeGreaterThanOrEqual(entry.wrote.parties);
    expect(loaded.cases.length, 'case records').toBeGreaterThanOrEqual(entry.wrote.cases);
    expect(loaded.dismissedPartyPairs.length, 'dismissed pairs').toBe(entry.wrote.dismissedPartyPairs);
    expect(loaded.securityMode, 'security mode').toBe(entry.password ? 'encrypted' : 'none');
    const digest = crypto.createHash('sha256').update(canonical(loaded)).digest('hex');

    // Each filing opens for editing.
    const opened: string[] = [];
    for (const ward of loaded.wards) {
      const ok = await page.evaluate((id) => (window as any).GuardianForms.testing.activateFiling.open(id), ward.wardId);
      const active = await page.evaluate(() => (window as any).GuardianForms.testing.snapshot().filing?.wardId);
      if (ok !== false && active === ward.wardId) opened.push(ward.inventoryType);
    }
    expect(opened, 'every filing opens for editing').toEqual(loaded.wards.map((x: any) => x.inventoryType));
    expect(pageErrors, 'no page error while opening the file or any filing').toEqual([]);

    const result = {
      parties: loaded.parties.length, cases: loaded.cases.length, dismissedPartyPairs: loaded.dismissedPartyPairs.length,
      filingKeys: loaded.wards.map((x: any) => Object.keys(x).length), digest,
    };
    expect(result, "today's reader, against the golden").toEqual(record('fixtures', entry.file, result));
  });
}

// A wrong password is refused and the right one still opens -- for the
// oldest encrypted file, the 9/22 production build's, and the branch point's.
for (const label of ['01-ms34-2', '22-production-0922', '27-branch-point']) {
  const entry = MANIFEST.fixtures.find((f: any) => f.label === label && f.password);
  test(`${entry.file}: a wrong password is refused, then the right one opens`, async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (e) => pageErrors.push(e.message));
    await openFromStartup(page, path.join(CORPUS, entry.file));
    await enterPassword(page, 'not-the-corpus-password');
    await expect(page.locator('#unlock-error')).toBeVisible();
    const refused = await observe(page, pageErrors);
    expect(refused.passwordPrompt, 'still asking').toBe(true);
    expect(refused.filingsLoaded, 'nothing loaded').toBe(0);
    await enterPassword(page, entry.password);
    await expect(page.locator('#unlock-overlay')).not.toHaveClass(/show/);
    await page.waitForFunction((n) => ((window as any).GuardianForms.testing.snapshot().caseFile?.wards || []).length === n, entry.wrote.filings.length);
    expect(pageErrors).toEqual([]);
    expect(refused, 'what a filer sees').toEqual(record('wrongPassword', entry.file, refused));
  });
}

// Damaged files, made from the branch point's fixtures inside the page with
// the app's own JSZip. What a filer sees today is recorded, not judged here;
// 70I's gate is that each still fails safely.
const DAMAGE: [string, string, string | null][] = [
  ['truncated', '27-branch-point-plain.sav', null],
  ['no-manifest', '27-branch-point-plain.sav', null],
  ['a-listed-filing-missing', '27-branch-point-plain.sav', null],
  ['unsupported-version', '27-branch-point-plain.sav', null],
  ['not-a-case-file', '27-branch-point-plain.sav', null],
  ['unreadable-filing', '27-branch-point-plain.sav', null],
  ['tampered-encrypted-filing', '27-branch-point-encrypted.sav', 'password'],
];

for (const [kind, source, needsPassword] of DAMAGE) {
  test(`a damaged case file (${kind}) fails safely`, async ({ page }) => {
    const entry = MANIFEST.fixtures.find((f: any) => f.file === source);
    const pageErrors: string[] = [];
    page.on('pageerror', (e) => pageErrors.push(e.message));
    await gotoApp(page);
    await page.locator('#startup-choice-overlay.show').waitFor({ state: 'visible' });
    const original = fs.readFileSync(path.join(CORPUS, source));
    const damagedB64 = kind === 'truncated'
      ? original.subarray(0, Math.floor(original.length / 3)).toString('base64')
      : await page.evaluate(async ({ b64, kind }) => {
        const JSZip = (window as any).JSZip;
        const zip = await JSZip.loadAsync(b64, { base64: true });
        const manifest = JSON.parse(await zip.file('manifest.json').async('string'));
        const firstFiling = manifest.wards[0].file;
        if (kind === 'no-manifest') zip.remove('manifest.json');
        if (kind === 'a-listed-filing-missing') zip.remove(firstFiling);
        if (kind === 'unsupported-version') zip.file('manifest.json', JSON.stringify({ ...manifest, version: 2 }));
        if (kind === 'not-a-case-file') zip.file('manifest.json', JSON.stringify({ ...manifest, format: 'something-else' }));
        if (kind === 'unreadable-filing') zip.file(firstFiling, 'PLAIN:{"wardId": not json');
        if (kind === 'tampered-encrypted-filing') {
          const text: string = await zip.file(firstFiling).async('string');
          const at = Math.floor(text.length / 2);
          zip.file(firstFiling, text.slice(0, at) + (text[at] === 'A' ? 'B' : 'A') + text.slice(at + 1));
        }
        return zip.generateAsync({ type: 'base64' });
      }, { b64: original.toString('base64'), kind });
    await page.setInputFiles('#startup-open-input', tmpFile(`${kind}.sav`, Buffer.from(damagedB64, 'base64')));
    await waitForOutcome(page);
    if (needsPassword && await page.locator('#unlock-overlay.show').isVisible()) {
      await enterPassword(page, entry.password);
      await page.waitForFunction((dyn) => !!document.querySelector(dyn) || !document.querySelector('#unlock-overlay.show')
        || !!(document.querySelector('#unlock-error') as HTMLElement | null)?.offsetParent, DYN_DIALOG, { timeout: 20_000 });
    }
    const seen = await observe(page, pageErrors);
    expect(seen, 'what a filer sees').toEqual(record('damaged', kind, seen));
  });
}
