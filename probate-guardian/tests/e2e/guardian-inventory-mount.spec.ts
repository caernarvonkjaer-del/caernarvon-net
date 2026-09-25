import { test, expect } from '@playwright/test';
import path from 'node:path';
import os from 'node:os';
import JSZip from 'jszip';
import { freshStartNoPassword, createWard, fillMinimalValidGuardianWard, crossCheckNavAndSummaryStatus, acceptDynDialog, dismissScheduleDocPrompt } from './support/target';

// Guardian Inventory is Milestone 8 of INDEX-SPLIT-PLAN.md: Phase A moved
// page/nav/validation/row UI into src/features/guardian-inventory/index.js;
// Phase B moved print/PDF/Excel import-export into that same feature's
// print.js/excel.js (mirroring Annual's/Simplified's shape -- both load
// together via one Promise.all() at first mount, since the Cover page has
// its own Excel-import control that must work immediately).

const GUARDIAN_PAGES = [
  '/', '/summary',
  '/a1', '/a2',
  '/b1', '/b2', '/b3', '/b4',
  '/c1', '/c2', '/c3', '/c4', '/c5',
  '/d1', '/d2', '/d3', '/d4', '/d5',
  '/print',
];

test.describe('guardian-inventory feature module', () => {
  test('first Guardian mount exposes import and print actions without compatibility globals', async ({ page }) => {
    await freshStartNoPassword(page);

    await createWard(page, 'Annual Before Guardian', 'annual');
    await page.evaluate(() => (window as any).GuardianForms.testing.navigate('/p2'));
    await expect(page.locator('[data-inventory-change="import-excel"]')).toHaveCount(0);

    await createWard(page, 'Guardian Lazy Load Ward', 'guardian');
    await page.locator('[data-inventory-change="import-excel"]').waitFor({ state: 'attached' });
    // "without compatibility globals": pinned in tests/unit/removed-window-bridges.spec.js
    // since Milestone 70's 70T (a browser spec names no app global but GuardianForms).
    await page.evaluate(() => (window as any).GuardianForms.testing.navigate('/print'));
    await expect(page.locator('[data-inventory-action="save-pdf"]')).toBeVisible();
  });
  test('Guardian #1\'s attestation card renders on /d1 for a brand-new filing with no guardian data typed in yet', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'Fresh Guardian Ward', 'guardian');
    await page.evaluate(() => (window as any).GuardianForms.testing.navigate('/d1'));

    await expect(page.locator('.entry-card-header', { hasText: 'Guardian #1' })).toBeVisible();
    await expect(page.locator('[data-bind="guardians.0.name"]')).toBeVisible();
  });
  test('Summary page completion badges (D1-D5) agree with the sidebar and computeNavChecks(), both blank and fully filled', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'Nav Parity Guardian Ward', 'guardian');
    const entries = [
      { route: '/d1', key: 'd1' },
      { route: '/d2', key: 'd2' },
      { route: '/d3', key: 'd3' },
      { route: '/d4', key: 'd4' },
      { route: '/d5', key: 'd5' },
    ];

    await page.evaluate(() => (window as any).GuardianForms.testing.navigate('/summary'));
    const blankResults = await crossCheckNavAndSummaryStatus(page, entries);
    for (const r of blankResults) {
      expect(r.summaryComplete, `${r.route} (blank filing)`).toBe(r.expectComplete);
      expect(r.summaryComplete, `${r.route} (blank filing)`).toBe(r.sidebarComplete);
    }
    // The specific bug report: D-1 must NOT show complete on a genuinely
    // blank filing (a validate() gap -- guardian #1 was skipped entirely
    // when blank -- made this true before both that fix and this one).
    expect(blankResults.find(r => r.route === '/d1')!.expectComplete).toBe(false);

    await fillMinimalValidGuardianWard(page);
    await page.evaluate(() => (window as any).GuardianForms.testing.navigate('/summary'));
    for (const r of await crossCheckNavAndSummaryStatus(page, entries)) {
      expect(r.summaryComplete, `${r.route} (fully filled)`).toBe(r.expectComplete);
      expect(r.summaryComplete, `${r.route} (fully filled)`).toBe(r.sidebarComplete);
    }
  });
  test('every page renders with no console errors, navigating via the extracted mount()', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

    await freshStartNoPassword(page);
    await createWard(page, 'Guardian Nav Test Ward', 'guardian');

    for (const route of GUARDIAN_PAGES) {
      await page.evaluate((r) => (window as any).GuardianForms.testing.navigate(r), route);
      await expect(page.locator('#main-content')).not.toBeEmpty();
    }

    expect(errors, `console/page errors while navigating Guardian pages: ${errors.join('\n')}`).toEqual([]);
  });

  test('duplicateEntry copies a Guardian schedule row through the module global bridge', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'Guardian Duplicate Test Ward', 'guardian');
    await page.evaluate(() => (window as any).GuardianForms.testing.navigate('/a1'));

    await page.evaluate(() => {
      const t = (window as any).GuardianForms.testing;
      // Setup (D9): one Schedule A-1 row as an older save stored it.
      t.patchFiling({ scheduleA1: [{
        propertyDescription: 'Homestead',
        streetAddress: '123 Main St',
        cityStateZip: 'Clearwater, FL 33755',
        notes: '',
        isPersonalResidence: true,
        isIncomeProperty: false,
        fullAssetValue: 100000,
        wardPercent: 50,
      }] });
      t.createFiling.duplicateRow('a1', 0); // duplicateEntry(), the bridge 51E kept
    });

    const rows = await page.evaluate(() => (window as any).GuardianForms.testing.field('scheduleA1'));
    expect(rows).toHaveLength(2);
    expect(rows[1]).toEqual(rows[0]);
  });

  test('an incomplete filing is blocked from export with a clear error', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'Incomplete Guardian Ward', 'guardian');
    await page.evaluate(() => (window as any).GuardianForms.testing.navigate('/print'));

    await page.locator('[data-inventory-action="save-pdf"]').evaluate((button: HTMLButtonElement) => {
      button.disabled = false;
      button.click();
    });
    const alertMessage = await acceptDynDialog(page);

    expect(alertMessage).toContain('Cannot export');
  });

  test('a fully completed filing exports a real PDF through legacy print/PDF code', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'Complete Guardian PDF Ward', 'guardian');
    await fillMinimalValidGuardianWard(page);
    await page.evaluate(() => (window as any).GuardianForms.testing.navigate('/print'));

    const downloadPromise = page.waitForEvent('download', { timeout: 20_000 });
    await page.locator('[data-inventory-action="save-pdf"]').click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toMatch(/\.pdf$/i);
    const stream = await download.createReadStream();
    const chunks: Buffer[] = [];
    for await (const chunk of stream) chunks.push(chunk as Buffer);
    const bytes = Buffer.concat(chunks);
    expect(bytes.length).toBeGreaterThan(1000);
    expect(bytes.subarray(0, 5).toString('latin1')).toBe('%PDF-');
  });

  test('repeated entry/exit does not race post-render binding or leave stale mounts', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

    await freshStartNoPassword(page);
    await createWard(page, 'Guardian Cycle Ward', 'guardian');
    await createWard(page, 'Annual Cycle Ward', 'annual');

    const wards = await page.evaluate(() => (window as any).GuardianForms.testing.snapshot().caseFile.wards
      .map((w: any) => ({ id: w.wardId, type: w.inventoryType })));
    const guardianId = wards.find((w: any) => w.type === 'guardian').id;
    const annualId = wards.find((w: any) => w.type === 'annual').id;

    await page.evaluate((id) => (window as any).GuardianForms.testing.activateFiling.open(id), guardianId);
    await page.evaluate(() => (window as any).GuardianForms.testing.navigate('/b2'));
    await page.evaluate(() => (window as any).GuardianForms.testing.createFiling.addRow('b2'));
    // A row that's still exactly what +Add left it as gets pruned by
    // pruneBlankCards() the moment navigate() actually leaves the
    // page (see legacy-app.js) -- deliberate, so an untouched +Add row
    // doesn't linger as a false "incomplete" warning or a blank PDF line.
    // Fill it in before the first switch so the cycle below is testing
    // real row survival, not accidentally relying on pruning not having
    // run yet.
    await page.fill('input[data-bind="scheduleB2.0.description"]', 'Seed row');
    // This field title-cases as a "name"-type data-bind input, but only on
    // blur (not live per-keystroke -- see legacy-app.js's bindForms(), which
    // would otherwise misread an in-progress 2-letter word as a state
    // abbreviation and force-uppercase it mid-typing).
    await page.locator('input[data-bind="scheduleB2.0.description"]').blur();
    await expect(page.locator('input[data-bind="scheduleB2.0.description"]')).toHaveValue('Seed Row');

    for (let i = 0; i < 15; i++) {
      await page.evaluate((id) => (window as any).GuardianForms.testing.activateFiling.open(id), guardianId);
      await page.evaluate((r) => (window as any).GuardianForms.testing.navigate(r), '/b2');
      await page.fill('input[data-bind="scheduleB2.0.description"]', `Cycle ${i}`);
      await expect(page.locator('input[data-bind="scheduleB2.0.description"]')).toHaveValue(`Cycle ${i}`);
      await page.evaluate((id) => (window as any).GuardianForms.testing.activateFiling.open(id), annualId);
    }

    const mainContentCount = await page.locator('#main-content').count();
    expect(mainContentCount).toBe(1);
    await expect(page.locator('#main-content')).not.toBeEmpty();

    // Milestone 43G: the currently-mounted page is Annual Accounting's (the
    // loop above ends on annualId), so Guardian Inventory's own
    // data-inventory-action click delegate should have been unbound on
    // dispose -- a probe element using that attribute must not still reach
    // Guardian's handler. Same technique simplified-mount.spec.ts already
    // uses against its own data-simplified-action delegate. What is watched
    // is what the handler does -- open the Link to Shared Record dialog --
    // not a stub of the app function behind it (70T).
    const probeLinkParty = () => page.evaluate(() => {
      const probe = document.createElement('button');
      probe.dataset.inventoryAction = 'link-party';
      probe.dataset.role = 'guardian';
      probe.dataset.index = '0';
      document.getElementById('main-content')?.append(probe);
      probe.click();
      probe.remove();
    });
    const linkDialog = page.locator('#pickPartyModal.show');
    await probeLinkParty();
    await page.waitForTimeout(1_000); // longer than the live handler takes (the control below)
    await expect(linkDialog, 'a disposed delegate opens nothing').toHaveCount(0);
    // Control: with the Guardian filing mounted, the same probe opens it. The
    // loop left a Schedule B-2 row, so the supporting-documentation prompt
    // (Milestone 57C-R) may be up first and would sit over the dialog.
    await page.evaluate((id) => (window as any).GuardianForms.testing.activateFiling.open(id), guardianId);
    await page.evaluate((r) => (window as any).GuardianForms.testing.navigate(r), '/');
    await dismissScheduleDocPrompt(page);
    await probeLinkParty();
    await expect(linkDialog, 'the probe reaches a live delegate').toBeVisible({ timeout: 1_000 });
    await page.locator('[data-modal-action="close"][data-modal-id="pickPartyModal"]').click();
    await expect(linkDialog).toHaveCount(0);

    expect(errors, `console/page errors during repeated entry/exit: ${errors.join('\n')}`).toEqual([]);
  });

  test('exporting to the bundled blank template then re-importing round-trips key fields', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'Excel Roundtrip Guardian Ward', 'guardian');
    await fillMinimalValidGuardianWard(page);
    await page.evaluate(() => (window as any).GuardianForms.testing.navigate('/print'));

    const downloadPromise = page.waitForEvent('download', { timeout: 20_000 });
    await page.locator('[data-inventory-action="save-excel"]').click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/\.xlsx$/i);
    const xlsxPath = path.join(os.tmpdir(), `pg-guardian-excel-${Date.now()}.xlsx`);
    await download.saveAs(xlsxPath);

    // A second, blank Guardian ward to import into.
    await createWard(page, 'Blank Guardian Import Target', 'guardian');
    await page.evaluate(() => (window as any).GuardianForms.testing.navigate('/'));

    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.setInputFiles('input[type="file"][accept=".xlsx"]', xlsxPath);
    await page.waitForFunction(() => (window as any).GuardianForms.testing.field('caseNumber') === '2026-CP-000123', { timeout: 10_000 });

    const imported = await page.evaluate(() => ({
      wardName: (window as any).GuardianForms.testing.field('wardName'),
      caseNumber: (window as any).GuardianForms.testing.field('caseNumber'),
      county: (window as any).GuardianForms.testing.field('county'),
      guardianName: (window as any).GuardianForms.testing.field('guardianName'),
    }));
    expect(imported.caseNumber).toBe('2026-CP-000123');
    expect(imported.county).toBe('Pinellas');
    expect(errors, `console/page errors during Excel import: ${errors.join('\n')}`).toEqual([]);
  });

  test('D-3 Audit Fee & Safe Deposit Box tri-state lifecycle and summary completion', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'D3 TriState Ward', 'guardian');

    // Milestone 38E: D-3 stores the tri-state STRING 'Yes'/'No', same as
    // every other yesNoRadioHTML() field -- a fresh ward's unanswered
    // question is '' (unanswered), not the pre-38E null-vs-boolean pair.
    const initialD3 = await page.evaluate(() => ({
      hasSafeDepositBox: (window as any).GuardianForms.testing.field('hasSafeDepositBox'),
      safeDepositBoxFiled: (window as any).GuardianForms.testing.field('safeDepositBoxFiled'),
      navChecks: (window as any).GuardianForms.testing.status.navChecks(),
    }));
    expect(initialD3.hasSafeDepositBox).toBe('');
    expect(initialD3.safeDepositBoxFiled).toBe('');
    expect(initialD3.navChecks.checks.d3).toBe(false);

    // Summary page shows D-3 as incomplete / not completed
    await page.evaluate(() => (window as any).GuardianForms.testing.navigate('/summary'));
    const d3SummaryLine = page.locator('.summary-line', { hasText: 'D-3' });
    await expect(d3SummaryLine).toContainText('Incomplete');

    // Navigate to /d3. Milestone 38E replaced the hand-rolled #sdb-yes/
    // #sdb-no radios with the shared yesNoRadioHTML() component, whose
    // element ids are derived from the field's data path
    // (yesno_<path>_yes/_no) -- #sdb-filed-row's own wrapper id is
    // unchanged.
    await page.evaluate(() => (window as any).GuardianForms.testing.navigate('/d3'));
    const sdbYes = page.locator('#yesno_hasSafeDepositBox_yes');
    const sdbNo = page.locator('#yesno_hasSafeDepositBox_no');
    const sdbFiledRow = page.locator('#sdb-filed-row');
    const sdbFiledYes = page.locator('#yesno_safeDepositBoxFiled_yes');

    await expect(sdbYes).not.toBeChecked();
    await expect(sdbNo).not.toBeChecked();
    await expect(sdbFiledRow).toBeHidden();

    // Selecting "No" marks D-3 as complete
    await sdbNo.check();
    await expect(sdbNo).toBeChecked();
    const noState = await page.evaluate(() => ({
      hasSafeDepositBox: (window as any).GuardianForms.testing.field('hasSafeDepositBox'),
      navChecks: (window as any).GuardianForms.testing.status.navChecks(),
    }));
    expect(noState.hasSafeDepositBox).toBe('No');
    expect(noState.navChecks.checks.d3).toBe(true);

    // Selecting "Yes" displays the Filed question and marks D-3 incomplete until filed is answered
    await sdbYes.check();
    await expect(sdbFiledRow).toBeVisible();
    const yesUnfiledState = await page.evaluate(() => ({
      hasSafeDepositBox: (window as any).GuardianForms.testing.field('hasSafeDepositBox'),
      navChecks: (window as any).GuardianForms.testing.status.navChecks(),
    }));
    expect(yesUnfiledState.hasSafeDepositBox).toBe('Yes');
    expect(yesUnfiledState.navChecks.checks.d3).toBe(false);

    // Answering Filed: Yes completes D-3
    await sdbFiledYes.check();
    const yesFiledState = await page.evaluate(() => ({
      hasSafeDepositBox: (window as any).GuardianForms.testing.field('hasSafeDepositBox'),
      safeDepositBoxFiled: (window as any).GuardianForms.testing.field('safeDepositBoxFiled'),
      navChecks: (window as any).GuardianForms.testing.status.navChecks(),
    }));
    expect(yesFiledState.hasSafeDepositBox).toBe('Yes');
    expect(yesFiledState.safeDepositBoxFiled).toBe('Yes');
    expect(yesFiledState.navChecks.checks.d3).toBe(true);

    // Milestone 40H-B: toggling the parent off then back on must not lose the
    // child answer entered above. The row is already hidden purely by CSS
    // while the parent is No (#sdb-filed-row keeps class d-none), independent
    // of the child's stored value, so nothing needs to be destroyed for the
    // hide/show itself -- data loss here was solely the toggle handler
    // deleting the stored answer on every parent-off transition.
    await sdbNo.check();
    const parentOffState = await page.evaluate(() => ({
      hasSafeDepositBox: (window as any).GuardianForms.testing.field('hasSafeDepositBox'),
      safeDepositBoxFiled: (window as any).GuardianForms.testing.field('safeDepositBoxFiled'),
    }));
    expect(parentOffState.hasSafeDepositBox).toBe('No');
    expect(parentOffState.safeDepositBoxFiled).toBe('Yes'); // preserved, not wiped to ''

    await sdbYes.check();
    await expect(sdbFiledRow).toBeVisible();
    const restoredState = await page.evaluate(() => ({
      hasSafeDepositBox: (window as any).GuardianForms.testing.field('hasSafeDepositBox'),
      safeDepositBoxFiled: (window as any).GuardianForms.testing.field('safeDepositBoxFiled'),
    }));
    expect(restoredState.hasSafeDepositBox).toBe('Yes');
    expect(restoredState.safeDepositBoxFiled).toBe('Yes');
    // The child radios must reflect the restored value, not render blank.
    await expect(sdbFiledYes).toBeChecked();
  });
});

// Milestone 41-3 (Guardian Inventory step): textInput() now delegates to
// Tier 1's renderFormField(), with zero changes to its 85 call sites --
// the same delegation pattern inpS()/txtP()/radioP()/chkP() got in 41-1.
//
// This test exists because the delegation's real risk is invisible in
// markup. This filing type's write tail, afterChange(), does strictly more
// than the shared one: updateCalcFields(), then runFieldWriteSideEffects(),
// then a repaint of the live inventory totals. Moving a field onto the
// shared data-form-path listener would silently stop those totals updating
// as the filer types -- which is exactly why the delegation passes
// binding: 'bind' to keep these fields on bindForms()'s path, and why
// data-form-path must be absent so the two listeners can't both claim the
// field and double-write on every keystroke.
test.describe('Milestone 41-3: Guardian Inventory Tier 1 delegation', () => {
  test('a delegated field still writes through bindForms, repaints live totals, and is claimed by exactly one listener', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'GI Delegation Ward', 'guardian');
    await page.evaluate(() => (window as any).GuardianForms.testing.navigate('/a1'));

    await page.locator('[data-inventory-action="add-entry"], button:has-text("Add")').first().click();
    const desc = page.locator('[data-bind^="scheduleA1."][data-bind$=".propertyDescription"]').first();
    await desc.waitFor({ state: 'visible', timeout: 10000 });
    await desc.fill('Delegated Homestead');
    await desc.dispatchEvent('input');
    expect(await page.evaluate(() => (window as any).GuardianForms.testing.field('scheduleA1')?.[0]?.propertyDescription)).toBe('Delegated Homestead');

    // The live total must track the amount as it is typed -- afterChange()'s
    // extra work, which the shared write tail does not perform.
    const amount = page.locator('[data-bind^="scheduleA1."][data-bind$=".fullAssetValue"]').first();
    await amount.fill('150000');
    await amount.dispatchEvent('input');
    expect(await page.locator('#totalA1').innerText()).toContain('150,000');

    // Exactly one write path claims the field, and bindForms()'s own
    // formatting switch still has the attribute it reads.
    expect(await desc.evaluate((el) => ({
      hasBind: el.hasAttribute('data-bind'),
      hasFormPath: el.hasAttribute('data-form-path'),
      inputType: el.getAttribute('data-input-type'),
    }))).toEqual({ hasBind: true, hasFormPath: false, inputType: 'name' });
  });

  // Milestone 41-3: numInput()'s 24 sites and dateInput()'s 13 now delegate
  // to the same Tier 1 renderer as textInput() above, closing out
  // data-bind's last hand-rolled markup. numInput() is the one genuinely
  // different case: bindForms()'s own decimal branch stores a Number
  // (setPath(...,parseFloat(val)||0)), so a second writer claiming the
  // field is not the harmless no-op it is for textInput()'s string-typed
  // kinds -- the shared writeDraftValue() would compare its own String
  // control.value against that Number with strict !==, always true, and
  // silently overwrite the correct Number with a String on every keystroke.
  // This is why numInput() omits data-field-path (claimSharedWriteListener:
  // false in form-fields.js) where textInput() and dateInput() both keep it.
  test('a numInput field stores a Number, keeps its $/% wrapping, and is claimed by exactly one listener', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'Numeric Delegation Ward', 'guardian');
    await page.evaluate(() => (window as any).GuardianForms.testing.navigate('/a1'));
    await page.locator('[data-inventory-action="add-entry"], button:has-text("Add")').first().click();

    const amount = page.locator('[data-bind^="scheduleA1."][data-bind$=".fullAssetValue"]').first();
    await amount.waitFor({ state: 'visible', timeout: 10000 });
    await amount.fill('150000');
    await amount.dispatchEvent('input');

    const stored = await page.evaluate(() => (window as any).GuardianForms.testing.field('scheduleA1')?.[0]?.fullAssetValue);
    expect(stored).toBe(150000);
    expect(typeof stored).toBe('number');

    const attrs = await amount.evaluate((el) => ({
      hasBind: el.hasAttribute('data-bind'),
      hasFormPath: el.hasAttribute('data-form-path'),
      hasFieldPath: el.hasAttribute('data-field-path'),
      inputType: el.getAttribute('data-input-type'),
      dollarSign: el.closest('.input-group')?.querySelector('.input-group-text')?.textContent,
    }));
    expect(attrs).toEqual({ hasBind: true, hasFormPath: false, hasFieldPath: false, inputType: 'decimal', dollarSign: '$' });

    // wardPercent has no label of its own (a separate reqLabel() call renders
    // it), so its '%' wrapping comes entirely from its bind path's own
    // "...Percent" suffix, not from renderFormField()'s usual label-text check.
    const pct = page.locator('[data-bind^="scheduleA1."][data-bind$=".wardPercent"]').first();
    const pctSign = await pct.evaluate((el) => el.closest('.input-group')?.querySelector('.input-group-text')?.textContent);
    expect(pctSign).toBe('%');
  });

  // dateInput()'s fields, unlike numInput()'s, keep data-field-path: unlike
  // decimal, bindForms() already defers date-kind fields entirely to the
  // shared writeDraftValue()/finalizeFieldValue() (its own
  // dataset.fieldKind==='date' early return on 'input'), so there is no
  // competing writer or type mismatch to guard against for dates.
  test('a dateInput field keeps data-field-path and its MM/DD/YYYY hint', async ({ page }) => {
    await freshStartNoPassword(page);
    await createWard(page, 'Date Delegation Ward', 'guardian');

    const gid = page.locator('[data-bind="gid"]');
    await gid.waitFor({ state: 'visible', timeout: 10000 });
    const attrs = await gid.evaluate((el) => ({
      hasBind: el.hasAttribute('data-bind'),
      hasFieldPath: el.hasAttribute('data-field-path'),
      fieldKind: el.getAttribute('data-field-kind'),
      inWrap: el.closest('.date-field-wrap') !== null,
    }));
    expect(attrs).toEqual({ hasBind: true, hasFieldPath: true, fieldKind: 'date', inWrap: true });
    await expect(page.locator('.date-field-wrap').filter({ has: gid }).locator('.form-text')).toHaveText('Use MM/DD/YYYY');
  });
});
