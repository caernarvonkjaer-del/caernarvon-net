import { test, expect, type Page } from '@playwright/test';
import { freshStartNoPassword } from './support/target';
import { FILING_MATRIX } from './support/filing-matrix';
import { MINIMAL_VALID } from './support/fixtures';

// Milestone 76B (decision 76B-1, the requester's, 2026-10-19): text is kept
// exactly as typed, opened or imported, and made safe where it is shown.
//
// What a filer could hit before: the app stripped quote marks and angle
// brackets out of every filing's text each time a case opened ("Donation=500
// to church" opened as "D500 to church"), and emptied Annual-family boxes on
// leaving them. The stripping was there to stop text being drawn as markup --
// and it missed the shared people and case records altogether, so a crafted
// case file could put markup on the page anyway.
//
// This opens a case file crafted the way an attacker would: every filing of
// all nine types complete (fixtures.ts's MINIMAL_VALID), every non-empty text
// in it, and the people's and cases' names and ids, ending in markup that
// breaks out of an attribute and adds an element. It then draws every page of
// every filing, the record pickers, the dashboard, People and the Activity
// Log, and fails naming each place where that element exists on the page --
// where text reached the page unescaped. Red first: on the code before 76B the
// record pickers drew a person's id as markup.

const TAINT = `"'><b data-taint></b>`;

async function buildCraftedCase(page: Page) {
  await page.evaluate(async ({ types, valid, taint }) => {
    const t = (window as any).GuardianForms.testing;
    for (const type of types) await t.createFiling.add(`Ward ${type}`, type);
    t.updateSharedRecords.createCase({ caseNumber: '2026-GA-000076', county: 'Pinellas' });
    t.updateSharedRecords.createParty('guardian', { name: 'Pat Guardian', email: 'pat@example.com' });
    await t.activateFiling.close();
    const keep = /^(wardId|inventoryType|activeYearKey|yearCounter|createdDate|lastModified|archived|caseId|partyId|[A-Za-z]+PartyIds?)$/;
    const mark = (v: any, key: string): any => {
      if (typeof v === 'string') return (v === '' || v === 'Yes' || v === 'No' || keep.test(key)) ? v : v + taint;
      if (Array.isArray(v)) return v.map((x) => mark(x, key));
      if (v && typeof v === 'object') return Object.fromEntries(Object.keys(v).map((k) => [k, k === 'years' ? v[k] : mark(v[k], k)]));
      return v;
    };
    const merge = (base: any, overlay: any): any => {
      if (Array.isArray(overlay)) return overlay.map((v, i) => merge(Array.isArray(base) ? base[i] : undefined, v));
      if (overlay && typeof overlay === 'object') {
        const out: any = base && typeof base === 'object' && !Array.isArray(base) ? { ...base } : {};
        for (const k of Object.keys(overlay)) out[k] = merge(out[k], overlay[k]);
        return out;
      }
      return overlay;
    };
    const plain = 'PLAIN:';
    const zip = await (window as any).JSZip.loadAsync(await t.exportArchive.caseFile());
    const manifest = JSON.parse(await zip.file('manifest.json').async('string'));
    for (const entry of manifest.wards) {
      const ward = JSON.parse((await zip.file(entry.file).async('string')).slice(plain.length));
      const filled = merge(ward, valid[ward.inventoryType] || {});
      zip.file(entry.file, plain + JSON.stringify({ ...mark(filled, ''), wardId: ward.wardId, inventoryType: ward.inventoryType }));
    }
    for (const part of ['parties.enc', 'cases.enc']) {
      const records = JSON.parse((await zip.file(part).async('string')).slice(plain.length));
      zip.file(part, plain + JSON.stringify(records.map((r: any) => ({ ...mark(r, ''), id: r.id + taint }))));
    }
    manifest.guardian = plain + JSON.stringify({ guardianName: 'Pat Guardian' + taint, guardianEmail: 'pat@example.com' + taint });
    zip.file('manifest.json', JSON.stringify(manifest));
    const crafted = await (window as any).JSZip.loadAsync(await zip.generateAsync({ type: 'blob' }));
    await t.importArchive(crafted, manifest, null);
  }, { types: FILING_MATRIX.map((f) => f.id), valid: MINIMAL_VALID, taint: TAINT });
}

/** Where markup from the case reached the page, if anywhere. */
async function markupOnPage(page: Page, where: string): Promise<string[]> {
  return page.evaluate((w) => [...document.querySelectorAll('[data-taint]')].map((el) => {
    const host = el.parentElement;
    const label = host ? `${host.tagName.toLowerCase()}${host.id ? `#${host.id}` : ''}${host.className && typeof host.className === 'string' ? `.${host.className.split(' ').filter(Boolean).slice(0, 2).join('.')}` : ''}` : '(detached)';
    return `${w}: inside ${label}`;
  }), where);
}

test('text from a crafted case file is drawn as text on every page, picker and list', async ({ page }) => {
  test.setTimeout(600_000);
  await freshStartNoPassword(page);
  await buildCraftedCase(page);
  const found: string[] = [];
  const settle = () => page.waitForTimeout(120);
  // A page may ask a question of its own as it opens (its dialog is checked
  // with the page); each is dismissed before the walk goes on.
  const dismissDialogs = async () => {
    for (let i = 0; i < 6 && await page.locator('.modal-overlay.show').count(); i++) {
      await page.keyboard.press('Escape');
      await settle();
    }
  };

  for (const route of ['/dashboard', '/party-management', '/activity-log']) {
    await page.evaluate((r) => (window as any).GuardianForms.testing.navigate(r), route);
    await settle();
    found.push(...await markupOnPage(page, route));
    await dismissDialogs();
  }
  // The dashboard's case picker.
  await page.evaluate((r) => (window as any).GuardianForms.testing.navigate(r), '/dashboard');
  const linkCase = page.locator('[data-dashboard-action="link-case"]').first();
  if (await linkCase.count()) {
    await linkCase.click();
    await settle();
    found.push(...await markupOnPage(page, 'the Link to a Case picker'));
    await dismissDialogs();
  }

  const filings: { wardId: string; inventoryType: string }[] = await page.evaluate(() => (window as any).GuardianForms.testing.snapshot().caseFile.wards
    .map((w: any) => ({ wardId: w.wardId, inventoryType: w.inventoryType })));
  expect(filings.length).toBe(FILING_MATRIX.length);
  for (const filing of filings) {
    const routes = FILING_MATRIX.find((f) => f.id === filing.inventoryType)!.routeSet;
    await page.evaluate((id) => (window as any).GuardianForms.testing.activateFiling.open(id), filing.wardId);
    for (const route of routes) {
      await page.evaluate((r) => (window as any).GuardianForms.testing.navigate(r), route);
      await settle();
      found.push(...await markupOnPage(page, `${filing.inventoryType} ${route}`));
      await dismissDialogs();
      const linkParty = page.locator('[data-form-action="link-party"]').first();
      if (await linkParty.count() && await linkParty.isVisible()) {
        await linkParty.click({ timeout: 5000 });
        await settle();
        found.push(...await markupOnPage(page, `${filing.inventoryType} ${route} Link Person picker`));
        await dismissDialogs();
      }
    }
  }
  expect([...new Set(found)], 'text drawn as markup').toEqual([]);
});
