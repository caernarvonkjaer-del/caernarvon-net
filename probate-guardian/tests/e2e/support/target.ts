import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { expect, type Locator, type Page } from '@playwright/test';
import { currentTarget } from './target-profile';
import { installFixtureSupport } from './fixture-completeness';
import {
  MINIMAL_VALID_GUARDIAN, MINIMAL_VALID_ANNUAL, MINIMAL_VALID_SIMPLIFIED, MINIMAL_VALID_PLAN_ANNUAL,
} from './fixtures';

// package.json has "type": "module", so this file runs as ESM under
// Playwright's loader -- no __dirname available, derive it the ESM way.
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// See playwright.config.ts — same PG_TARGET values, same four parity targets
// from INDEX-SPLIT-PLAN.md's Milestone 1 acceptance criteria. `dev` and any
// unrecognized value resolve to null here (see target-profile.ts); this file
// only ever branches on 'portable' specifically, so null is equivalent to
// "not portable" for its purposes.
const target = currentTarget;

// Every browser project forces the File System Access API's feature-detect
// off, so the app always takes the download/upload fallback path that real
// Firefox/Safari users already hit today (index.html:3885, 3946, 4234 all
// gate on window.showSaveFilePicker). That fallback path is what makes
// save/open automatable at all — real native pickers can't be driven by
// Playwright, and this exercises a genuinely shipped path rather than a
// synthetic shortcut.
export async function gotoApp(page: Page, options: { acceptTerms?: boolean } = {}): Promise<void> {
  const acceptTerms = options.acceptTerms !== false;
  await page.addInitScript((termsAccepted) => {
    delete window.showSaveFilePicker;
    delete window.showOpenFilePicker;
    if (termsAccepted) localStorage.setItem('pg.termsAccepted', '2026-09-15');
  }, acceptTerms);
  if (target === 'portable') {
    const filePath = path.resolve(__dirname, '../../../dist/portable/index.html');
    await page.goto(pathToFileURL(filePath).href, { waitUntil: 'networkidle' });
  } else {
    await page.goto('/', { waitUntil: 'networkidle' });
  }
}

/** Fresh install / brand-new browser: dismiss the startup screen with "Start a New Ward". */
export async function startNewCase(page: Page): Promise<void> {
  await page.locator('#startup-choice-overlay.show').waitFor({ state: 'visible' });
  await page.click('#startup-newcase-btn, #startup-newcase-link');
  await page.locator('#startup-choice-overlay').waitFor({ state: 'hidden' });
}
export const startNewWard = startNewCase;

/** Choose "No Password / No Encryption" on the data-protection screen. */
export async function chooseNoPassword(page: Page): Promise<void> {
  await page.locator('#security-choice-overlay.show').waitFor({ state: 'visible' });
  await page.click('#security-choice-overlay [data-startup-action="select-security"][data-security-mode="none"]');
  await page.locator('#security-choice-overlay').waitFor({ state: 'hidden' });
}

/** Choose "Encrypted & Password Protected" and set the master password. */
export async function chooseEncrypted(page: Page, pw: string): Promise<void> {
  await page.locator('#security-choice-overlay.show').waitFor({ state: 'visible' });
  await page.click('#security-choice-overlay [data-startup-action="select-security"][data-security-mode="encrypted"]');
  await page.locator('#unlock-overlay.show').waitFor({ state: 'visible' });
  await page.fill('#unlock-password', pw);
  await page.fill('#unlock-password-confirm', pw);
  await page.click('#unlock-submit-btn');
  await page.locator('#unlock-overlay').waitFor({ state: 'hidden' });
}

/** Full fresh-install fast path used by most specs that don't care about the choice screens themselves. */
export async function freshStartNoPassword(page: Page): Promise<void> {
  await gotoApp(page);
  await startNewCase(page);
  await chooseNoPassword(page);
}
export const freshStartWardNoPassword = freshStartNoPassword;

/**
 * Creates a ward via the Add Ward modal (index.html: showAddWardModal() /
 * doAddWard()). Works from any page the modal is reachable from — the
 * inventory-select cards and the sidebar's "+ Add Ward" both just call
 * showAddWardModal()/showAddWardModalForType(type) then doAddWard().
 * 'simplified' has its own eligibility modal first and isn't handled here.
 */
export async function createWard(page: Page, name: string, type = 'guardian'): Promise<void> {
  await page.evaluate((t) => (window as any).showAddWardModalForType(t), type);
  await page.locator('#addWardModal.show').waitFor({ state: 'visible' });
  await page.fill('#new-ward-name', name);
  await page.click('#addWardModal [data-modal-action="add-ward"]');
  await page.locator('#addWardModal').waitFor({ state: 'hidden' });
}

/**
 * Fills every field validate() (index.html:15854) requires for a Guardian
 * Inventory ward, directly on window.D via evaluate rather than driving 18
 * form pages of UI -- the export/validation logic under test doesn't care
 * how the data got there. All 11 schedules are marked via their "no items
 * to report" checkbox (scheduleNoItems) rather than populated with rows,
 * since validate() accepts either.
 */
export async function fillMinimalValidGuardianWard(page: Page): Promise<void> {
  await applyMinimalValid(page, MINIMAL_VALID_GUARDIAN);
}

/**
 * Writes one of fixtures.ts's MINIMAL_VALID_* overlays onto the open ward.
 *
 * The fields themselves live in fixtures.ts, not here, because the PDF specs
 * need the same answer to "what does a complete filing contain" and cannot
 * reach a helper that mutates window.D -- they never create a ward. Keeping
 * the list in one place is what stops the two from drifting apart, which is
 * exactly what happened when Milestone 57A added the bond-waiver question.
 *
 * An existing ward name is preserved: callers create the ward with a name
 * that identifies the test, and the overlay's own name is only a fallback.
 */
async function applyMinimalValid(
  page: Page,
  overlay: Record<string, unknown>,
  { planDefaults = false }: { planDefaults?: boolean } = {},
): Promise<void> {
  await installFixtureSupport(page);
  await page.evaluate(([o, withPlanDefaults]) => {
    const w = window as any;
    const d = w.D;
    const existingName = d.wardName;
    // The plan types' per-right and per-ADL answers are derived from the app's
    // own lists rather than copied into fixtures.ts, so that adding a right
    // cannot leave a fixture silently unanswered.
    if (withPlanDefaults) Object.assign(d, w.__pgMergeFixture(d, w.__pgPlanDefaults()));
    Object.assign(d, w.__pgMergeFixture(d, o));
    if (existingName) d.wardName = existingName;
    w.autoSave();
  }, [overlay, planDefaults] as [Record<string, unknown>, boolean]);
  await page.evaluate(() => (window as any).flushPendingSave());
}

/**
 * Simplified Accounting has its own dedicated creation flow --
 * showAddWardModalForType('simplified') redirects straight to the
 * eligibility modal instead of the generic Add Ward modal (index.html's
 * doConfirmSimplifiedEligibility() then creates a 'simplified' ward if both
 * answers are 'Yes', or falls back to a plain 'annual' ward otherwise), so
 * createWard() above can't be used for this type. Always answers both
 * eligibility questions 'Yes' so the resulting ward is genuinely Simplified.
 */
export async function createSimplifiedWard(page: Page, name: string): Promise<void> {
  await page.evaluate(() => (window as any).showAddWardModalForType('simplified'));
  await page.locator('#simplifiedEligibilityModal.show').waitFor({ state: 'visible' });
  await page.fill('#elig-ward-name', name);
  await page.selectOption('#elig-depository', 'Yes');
  await page.selectOption('#elig-only-transactions', 'Yes');
  await page.click('#simplifiedEligibilityModal [data-modal-action="confirm-simplified-eligibility"]');
  await page.locator('#simplifiedEligibilityModal').waitFor({ state: 'hidden' });
}

/**
 * Fills every field validateSimplified() (src/features/simplified-
 * accounting/index.js) requires for a Simplified Accounting ward, directly
 * on window.D via evaluate -- same reasoning as fillMinimalValidGuardianWard.
 */
export async function fillMinimalValidSimplifiedWard(page: Page): Promise<void> {
  await applyMinimalValid(page, MINIMAL_VALID_SIMPLIFIED);
}

/**
 * Plan Simplified has no eligibility redirect like Simplified Accounting --
 * showAddWardModalForType('planSimplified') goes straight to the generic
 * Add Ward modal (confirmed by reading that function: only 'simplified' is
 * special-cased), so the existing createWard() helper above works unchanged
 * for this type; no dedicated creation helper is needed.
 *
 * Fills every field validatePlanSimplified()
 * (src/features/plan-simplified/index.js) requires, directly on window.D --
 * same reasoning as the other fillMinimalValid* helpers. q7/q9 are answered
 * 'No' and q8 is answered via the NONE box, so no conditional explanation
 * fields are required on top of the base set.
 */
export async function fillMinimalValidPlanSimplifiedWard(page: Page): Promise<void> {
  await page.evaluate(() => {
    const d = (window as any).D;
    Object.assign(d, {
      wardName: d.wardName || 'Plan Simplified Export Test Ward',
      caseNumber: '2026-CP-000789',
      county: 'Pinellas',
      periodFrom: '2026-01-01',
      periodTo: '2026-12-31',
      q1Residences: '123 Main St, Clearwater, FL 33755 (all year)',
      q2BestPlacement: 'Familiar setting close to family and medical providers.',
      q3MedicalTreatment: 'Annual check-up with Dr. Alvarez in March.',
      q4Diagnosis: 'Stable; continues to require assistance with daily decisions.',
      q5SocialServices: 'Weekly day program and family visits.',
      q6Interaction: 'Regular positive contact with guardian and family.',
      q7RestoreRights: 'No',
      q8DNR: false, q8LivingWill: false, q8Surrogate: false, q8POA: false, q8Other: false, q8None: true,
      q9Remuneration: 'No',
    });
    d.planGuardians = [
      { name: 'Sample Guardian', signatureDate: '2027-01-05', email: 'guardian@example.com', phone: '555-555-5555', mailingAddress: '123 Main St, Clearwater, FL 33755' },
      { name: '', signatureDate: '', email: '', phone: '', mailingAddress: '' },
    ];
    (window as any).autoSave();
  });
  await page.evaluate(() => (window as any).flushPendingSave());
}

/**
 * Plan Annual has no eligibility redirect either -- same confirmation as
 * Plan Simplified, createWard() above works unchanged for this type.
 *
 * Fills every field validatePlanAnnual() (src/features/plan-annual/index.js)
 * requires, directly on window.D. Answers every window.PLAN_RIGHTS/
 * window.PLAN_ADLS key generically (reading the live constant rather than
 * hardcoding its 12/16 keys, so this doesn't silently go stale if the form
 * changes) rather than enumerating them here. Populates one row each in the
 * three repeating tables (residences, providers, directives) so the
 * extracted row-CRUD path (addPlanRow/removePlanRow/duplicatePlanRow) is
 * actually exercised, not just flat fields.
 */
export async function fillMinimalValidPlanAnnualWard(page: Page): Promise<void> {
  await applyMinimalValid(page, MINIMAL_VALID_PLAN_ANNUAL, { planDefaults: true });
}

export async function fillMinimalValidPlanMinorWard(page: Page): Promise<void> {
  await page.evaluate(() => {
    const d = (window as any).D;
    Object.assign(d, {
      wardName: d.wardName || 'Plan Minor Export Test Ward',
      ucn: d.ucn || '2026-CP-000987',
      caseNumber: d.caseNumber || '2026-CP-000987',
      county: 'Pinellas',
      amendedForm: 'No',
      periodFrom: '2026-01-01',
      periodTo: '2026-12-31',
      guardianName: 'Sample Guardian',
      q1ResidenceName: 'Sample Residence',
      q1Street: '123 Main St',
      q1City: 'Clearwater',
      q1State: 'FL',
      q1Zip: '33755',
      q3Providers: [{ first: 'Sample', mi: '', last: 'Provider', street: '', city: '', state: '', zip: '', phone: '', providerType: 'Primary Care Physician', visits: '4' }],
      q4Primary: true,
      q5SchoolProgress: 'Progressing well in all subjects.',
      q5SocialDevelopment: 'Age-appropriate social development.',
      q5Communicates: 'Communicates clearly with peers and adults.',
      q5Interpersonal: 'Maintains healthy relationships with family and friends.',
      q5NoUnmetNeeds: true,
      certConsulted: true,
      preparer_name: 'Sample Preparer',
      preparer_signatureDate: '2027-01-12',
      attorney_name: 'Sample Attorney',
      attorney_signatureDate: '2027-01-12',
    });
    d.planGuardians = [
      { name: 'Sample Guardian', tin: '123-45-6789', phone: '555-555-5555', mailingStreet: '123 Main St', mailingCityStateZip: 'Clearwater, FL 33755', relationship: 'Parent', email: 'guardian@example.com', signatureDate: '2027-01-11' },
      { name: '', tin: '', phone: '', mailingStreet: '', mailingCityStateZip: '', relationship: '', email: '', signatureDate: '' },
    ];
    (window as any).autoSave();
  });
  await page.evaluate(() => (window as any).flushPendingSave());
}

export async function fillMinimalValidPlanInitialWard(page: Page): Promise<void> {
  await page.evaluate(() => {
    const d = (window as any).D;
    const adls: Record<string, string> = {};
    for (const [k] of (window as any).INITIAL_ADLS) adls[k] = 'Ward needs no help';
    Object.assign(d, {
      wardName: d.wardName || 'Plan Initial Export Test Ward',
      caseNumber: '2026-CP-000654',
      county: 'Pinellas',
      inceptionDate: '2026-01-05',
      lettersSignedDate: '2026-01-06',
      guardianNames: 'Sample Guardian',
      wardLiving: 'In a facility (Skilled Nursing, Assisted Living, etc.)',
      residenceAddress: '123 Main St',
      residenceCityStateZip: 'Clearwater, FL 33755',
      q2Setting: 'Assisted Living (ALF)',
      q3MedPrimary: true,
      q4Mental: 'Routine examination by Psychiatrist/Psychologist',
      q5Personal: 'Care Facility',
      q6CareFacility: true,
      q9Providers: [{ name: 'Dr. Sample Provider', providerType: 'Primary Care Physician', examDate: '2026-01-10', street: '', cityStateZip: '', phone: '' }],
      adls,
      mentalDementia: true,
      physMobility: true,
      usesNone: true,
      needsNone: true,
      q11NoDirectives: false,
      q11Executed: true,
      q11ExecDNR: true,
      q11Directives: [{ title: 'Do Not Resuscitate Order', dateSigned: '2025-06-01', signedBy: 'Sample Guardian', agents: '', alternates: '', relationship: '', contact: '', courtRevoked: 'No', orderDate: '', orderCounty: '' }],
      committeeIncorporated: 'Yes',
      certConsulted: true,
      attorney_name: 'Sample Attorney',
      attorney_email: 'attorney@example.com', // Milestone 55D: now required once attorney info is "started"
      attorney_signatureDate: '2026-01-12',
    });
    d.planGuardians = [
      { name: 'Sample Guardian', ssn: '123-45-6789', street: '123 Main St', phone: '555-555-5555', cityStateZip: 'Clearwater, FL 33755', signatureDate: '2026-01-11', relationship: 'Parent' },
      { name: '', ssn: '', street: '', phone: '', cityStateZip: '', signatureDate: '', relationship: '' },
      { name: '', ssn: '', street: '', phone: '', cityStateZip: '', signatureDate: '', relationship: '' },
      { name: '', ssn: '', street: '', phone: '', cityStateZip: '', signatureDate: '', relationship: '' },
    ];
    (window as any).autoSave();
  });
  await page.evaluate(() => (window as any).flushPendingSave());
}

/**
 * Covers every field validateAnnual() requires. Also works unchanged for
 * finalAccounting/trustAccounting wards (formEngine() aliases -- same data
 * shape, same validator). No schedule rows are required by validateAnnual()
 * itself (rows are only checked for completeness if they have any data), so
 * one populated Schedule A row is added to exercise duplicateAnnualRow/the
 * row-add path, matching the pattern used for the other Excel-capable type
 * (Simplified Accounting).
 */
export async function fillMinimalValidAnnualWard(page: Page): Promise<void> {
  await applyMinimalValid(page, MINIMAL_VALID_ANNUAL);
}

/**
 * Cross-checks, for each {route, key} pair, that three sources of
 * completion status for the same section all agree: computeNavChecks()'s
 * own {checks, incomplete} result (the single source of truth), the
 * sidebar's ✓/− mark (the [data-nav="<key>"] element applyNavChecks()
 * writes into), and the Summary page's own badge for the line linking to
 * that route (rendered by navStatus()/renderStatusBadge()). Call while on
 * the /summary route -- the sidebar persists across routes for one form
 * type, but the Summary markup itself only exists on that page.
 *
 * `key` may be an array for a Summary line that covers several sidebar
 * checks at once (e.g. Annual's single "Sch D1-D5" line) -- there is no
 * one sidebar element to compare against in that case, so `sidebarComplete`
 * comes back null and only the computeNavChecks()/Summary agreement is
 * checked.
 */
export async function crossCheckNavAndSummaryStatus(
  page: Page,
  entries: { route: string; key: string | string[] }[],
): Promise<Array<{ route: string; expectComplete: boolean; sidebarComplete: boolean | null; summaryComplete: boolean | null }>> {
  return page.evaluate((entries) => {
    const w = window as any;
    const nav = w.computeNavChecks();
    return entries.map(({ route, key }) => {
      const keys = Array.isArray(key) ? key : [key];
      const expectComplete = keys.every((k) => !!nav.checks?.[k]);
      const sidebarEl = keys.length === 1 ? document.querySelector(`[data-nav="${keys[0]}"] .nav-check`) : null;
      const sidebarComplete = sidebarEl ? sidebarEl.classList.contains('complete') : null;
      // Scoped to .summary-line specifically -- a card's footerAction link
      // (e.g. "-> Complete Bond & Surety Info (D-4)") can point at the same
      // route as a real status line and isn't wrapped in .summary-line, so
      // an unscoped selector could match the wrong element first.
      const link = document.querySelector(`.summary-line a[data-route="${route}"]`);
      const line = link ? link.closest('.summary-line') : null;
      const summaryComplete = line ? line.textContent!.includes('✓ Complete') : null;
      return { route, expectComplete, sidebarComplete, summaryComplete };
    });
  }, entries);
}

// window.showSaveFilePicker/showOpenFilePicker are deleted for every test
// (see below), so exportGuardianDataZip()/the startup Open flow always take
// the download-link / <input type=file> fallback path real Firefox/Safari
// users hit today (saveBlobAs(), index.html:3884; openCaseFileAtLaunch(),
// index.html:4550). Fixtures are generated live through the real export flow
// rather than hand-authored, since hand-crafting a byte-correct
// AES-256-GCM+HMAC archive would be far more fragile than just using the app
// to make one. Shared by save-open-sav's case-file-roundtrip and
// dashboard-backup specs.
export async function exportAndCapture(page: Page): Promise<string> {
  // Milestone 50G: exportGuardianDataZip() (an alias for exportCaseFileZip())
  // triggers the download synchronously, then shows a trailing "Backup
  // complete" alertModal() once saving finishes -- awaited in that order,
  // same as captureDownload()'s own reasoning in backup-restore-sav.spec.ts.
  const downloadPromise = page.waitForEvent('download');
  await page.evaluate(() => { void (window as any).exportGuardianDataZip(); });
  const download = await downloadPromise;
  await acceptDynDialog(page);
  const savePath = path.join(os.tmpdir(), `pg-test-${Date.now()}-${Math.random().toString(36).slice(2)}.sav`);
  await download.saveAs(savePath);
  for (let i = 0; i < 50; i++) {
    if (fs.existsSync(savePath) && fs.statSync(savePath).size > 0) break;
    await new Promise((r) => setTimeout(r, 50));
  }
  return savePath;
}

// Milestone 43D: routes.spec.ts asserted "no inline event handler attribute
// anywhere in this scope" four times, each hand-writing out its own
// comma-joined attribute-selector list and toHaveCount(0) call. The four
// lists aren't all identical (some scope to a container and any of a fixed
// attribute set; one checks specific elements against specific attributes),
// so this doesn't collapse them to one call with one fixed selector -- it
// factors the repeated "join list, locate, assert empty" shape itself, with
// each call site still passing its own selector list.
export async function assertNoInlineEventHandlers(scope: Locator | Page, selectors: string[]) {
  await expect(scope.locator(selectors.join(', '))).toHaveCount(0);
}

/**
 * Milestone 41-2: a "0 visual diff" proof technique for the Tier 1/2/3
 * refactor. `Element.innerText` alone is not enough -- confirmed by direct
 * capture that it excludes every <input>/<textarea>/<select> value
 * entirely (they're control state, not text nodes), so a page whose field
 * *values* silently changed would still show identical innerText. This
 * combines the rendered static text (headings, hints, labels) with an
 * explicit, DOM-order dump of every form control's current value, so a
 * before/after capture across a markup refactor catches both.
 */
export async function extractFormContentSnapshot(page: Page, containerSelector = '#main-content'): Promise<string> {
  return page.evaluate((selector) => {
    const root = document.querySelector(selector);
    if (!root) return '';
    const text = (root as HTMLElement).innerText;
    const values = Array.from(root.querySelectorAll('input, textarea, select'))
      .map((el) => {
        const control = el as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
        if (control instanceof HTMLInputElement && (control.type === 'checkbox' || control.type === 'radio')) {
          // Prefer a stable binding path over `id`: Guardian Inventory's
          // checkboxes carry randomized ids (auto_xxxxxxx) and no name, which
          // made this snapshot differ between two runs of identical code --
          // caught while proving the Milestone 41-3 delegation, and fixed
          // here so the pins measure content rather than render nonce.
          // `id` is last and is rejected when auto-generated:
          // linkLabelsToInputs() (legacy-app.js) stamps `auto_<random>` onto
          // any input lacking an id, so keying on it made this snapshot
          // differ between two runs of identical code.
          const stableId = /^auto_/.test(control.id) ? '' : control.id;
          const key = control.name
            || control.getAttribute('data-bind')
            || control.getAttribute('data-form-path')
            || control.getAttribute('data-field-path')
            || control.getAttribute('data-schedule')
            || stableId
            || (control.closest('label')?.textContent || '').trim().slice(0, 40);
          return `[${control.type}:${key}=${control.checked ? 'checked' : 'unchecked'}]`;
        }
        return `[${control.tagName.toLowerCase()}:${control.value}]`;
      })
      .join('\n');
    return `${text}\n---CONTROL VALUES---\n${values}`;
  }, containerSelector);
}

// Milestone 50G. confirm()/alert()/prompt() were replaced app-wide with
// confirmModal()/alertModal()/promptModal() (src/core/ui/dialogs.js) --
// awaitable dialogs built on the app's own .modal-overlay/.modal-box, not
// Playwright's native `dialog` event. These four replace the
// page.once('dialog', ...) / page.on('dialog', ...) idiom used throughout
// this suite before that milestone.
//
// The control-flow shape changed, not just the selector: a native dialog is
// synchronous (registering the listener before the triggering click is what
// caught it, since the browser blocked on it inside that same click), so
// the old idiom always reads "arm the listener, then click, dialog handled
// inline". The DOM dialog is asynchronous -- clicking the trigger returns
// immediately, and the modal appears a tick later -- so the natural
// Playwright shape is sequential instead: click the trigger, wait for
// `.modal-overlay.show`, then act on it. These helpers are written for that
// call-after shape; call them AFTER the action that opens the dialog, not
// before.
// Scoped to dialogs.js's own dyn-dialog-N ids (see buildShell() there), not
// just '.modal-overlay.show .modal-box' -- that broader selector also
// matches the app's real static overlays (e.g. #startup-choice-overlay),
// which share the same modal classes and can legitimately be showing at the
// same time a dyn dialog is expected. Confirmed live: without this scoping,
// autoAcceptDynDialogs mistook a freshly-shown #startup-choice-overlay for a
// prompt (it also contains a hidden file <input>) and hung trying to fill it.
const DYN_DIALOG = '.modal-overlay[id^="dyn-dialog-"].show .modal-box';

/** Reads the currently-open dynamic dialog's message text without closing it. */
export async function readDynDialogMessage(page: Page): Promise<string> {
  const box = page.locator(DYN_DIALOG);
  await box.waitFor();
  return (await box.locator('.modal-box-intro').textContent()) ?? '';
}

/** Waits for a confirmModal()/alertModal() dialog and clicks its affirmative button (Confirm or OK), returning its message. */
export async function acceptDynDialog(page: Page): Promise<string> {
  const box = page.locator(DYN_DIALOG);
  await box.waitFor();
  const message = (await box.locator('.modal-box-intro').textContent()) ?? '';
  await box.locator('[data-dyn-action="confirm"], [data-dyn-action="ok"]').click();
  return message;
}

/** Waits for a confirmModal() dialog and clicks Cancel, returning its message. */
export async function dismissDynDialog(page: Page): Promise<string> {
  const box = page.locator(DYN_DIALOG);
  await box.waitFor();
  const message = (await box.locator('.modal-box-intro').textContent()) ?? '';
  await box.locator('[data-dyn-action="cancel"]').click();
  return message;
}

/** Waits for a confirmModal()/alertModal() dialog and dismisses it via Escape (matches native Escape-cancels semantics), returning its message. */
export async function escapeDynDialog(page: Page): Promise<string> {
  const box = page.locator(DYN_DIALOG);
  await box.waitFor();
  const message = (await box.locator('.modal-box-intro').textContent()) ?? '';
  await page.keyboard.press('Escape');
  return message;
}

/** Waits for a promptModal() dialog, fills its input, and clicks OK. Pass value=null to click Cancel instead (matches native prompt()'s null-on-cancel). */
export async function fillDynPrompt(page: Page, value: string | null): Promise<void> {
  const box = page.locator(DYN_DIALOG);
  await box.waitFor();
  if (value === null) {
    await box.locator('[data-dyn-action="cancel"]').click();
    return;
  }
  await box.locator('input').fill(value);
  await box.locator('[data-dyn-action="ok"]').click();
}

/**
 * The `page.on('dialog', ...)` replacement: auto-accepts every dynamic
 * dialog that appears until `.stop()` is called, for flows where an
 * unknown or variable number of confirm/alert/prompt dialogs fire in
 * sequence (e.g. a restore flow that confirms, then prompts for a
 * password, then alerts on completion). Polls for `.modal-overlay.show`
 * rather than listening for a browser event, since these dialogs are
 * plain DOM, not the native `dialog` event. `promptValue` fills any
 * promptModal() encountered; a promptModal with no `promptValue` given is
 * cancelled (matching native prompt()'s behavior when nothing can answer
 * it). `messages` records each dialog's text as it's accepted, in order.
 * Always call `.stop()` when the flow is done, ideally in a `finally` --
 * an unstopped watcher keeps polling for the rest of the test.
 *
 * Real gotcha, confirmed live, not hypothetical: this poll loop shares the
 * one page/CDP session with everything else the test does on that page, so
 * it can be **starved for many seconds** by uninterrupted foreground
 * activity (evaluate/waitForFunction calls back-to-back) running at the
 * same time -- it is not a true background thread. If a test does other
 * meaningful work on the page while a dialog might still be open or about
 * to appear (switching wards, more evaluates, ...), insert
 * `await expect.poll(() => watcher.messages.length).toBe(N)` (the exact
 * count for that step) or, if the count can genuinely vary, `await
 * expect.poll(() => page.locator('.modal-overlay.show').count()).toBe(0)`
 * right after triggering that step and BEFORE the next piece of foreground
 * work -- `expect.poll()`'s own repeated re-checks are what give the
 * watcher's loop a turn to run; without one, a fast sequence of foreground
 * calls can outrun it for the rest of the test.
 */
export function autoAcceptDynDialogs(page: Page, { promptValue }: { promptValue?: string } = {}): { stop: () => void; messages: string[] } {
  let stopped = false;
  const messages: string[] = [];
  const loop = (async () => {
    while (!stopped) {
      const box = page.locator(DYN_DIALOG);
      const appeared = await box.waitFor({ timeout: 200 }).then(() => true).catch(() => false);
      if (!appeared || stopped) continue;
      const text = (await box.locator('.modal-box-intro').textContent().catch(() => '')) ?? '';
      if (await box.locator('input').count() > 0) {
        await fillDynPrompt(page, promptValue ?? null).catch(() => {});
      } else {
        await box.locator('[data-dyn-action="confirm"], [data-dyn-action="ok"]').click().catch(() => {});
      }
      messages.push(text);
    }
  })();
  return { stop: () => { stopped = true; return loop; }, messages };
}

/**
 * Milestone 57C-R: dismiss the supporting-documentation acknowledgement if it
 * is showing, and do nothing if it is not.
 *
 * Adding a row to a financial schedule now raises an advisory modal (see
 * src/core/filing/schedule-doc-ack.js). That is intended behaviour, but it
 * lands in front of specs that populate a schedule to test something else
 * entirely -- 18 of them, all failing the same way, with the overlay
 * intercepting the next click. Those specs call this immediately after the
 * row-adding action.
 *
 * Dismiss rather than accept, deliberately: accepting would write an
 * acknowledgement into the ward data and quietly change what the spec is
 * carrying, while Cancel records nothing (Decision 5). It is also safe to call
 * when no prompt appeared, so a spec that later stops triggering one does not
 * break -- it just becomes a no-op.
 *
 * The prompt itself is covered by schedule-doc-ack.spec.ts, which does NOT use
 * this helper. Suppressing it everywhere would leave nothing asserting it
 * still fires.
 */
export async function dismissScheduleDocPrompt(page: Page): Promise<boolean> {
  const cancel = page.locator(`${DYN_DIALOG} [data-dyn-action="cancel"]`);
  try {
    await cancel.waitFor({ state: 'visible', timeout: 1500 });
  } catch {
    return false; // no prompt -- nothing to do
  }
  await cancel.click();
  await page.locator(DYN_DIALOG).waitFor({ state: 'hidden' }).catch(() => {});
  return true;
}
