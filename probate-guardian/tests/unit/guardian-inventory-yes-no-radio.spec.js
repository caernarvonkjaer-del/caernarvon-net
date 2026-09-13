import { describe, expect, test } from 'vitest';
import fs from 'fs';
import path from 'path';

const root = path.resolve(__dirname, '../..');
const legacyCode = fs.readFileSync(path.join(root, 'src/legacy-app.js'), 'utf8');
const inventoryCode = fs.readFileSync(path.join(root, 'src/features/guardian-inventory/index.js'), 'utf8');

// Milestone 43B: the source-text checks below (emptyDataGuardian's defaults,
// row-factory initializers) stay as-is deliberately, not from inertia.
// emptyDataGuardian() is a classic-script function in legacy-app.js with no
// ES-module export and no jsdom in this suite (vitest.config.ts), so there is
// no unit-test path to call it directly and inspect its return value -- the
// same reachability gap Milestone 43A found for normalizeWardData()/
// window.calc. Real coverage of these defaults would need a real browser.
describe('Milestone 38E Item 1: Guardian Inventory & Plan Benefits Radio Migration', () => {
  test('emptyDataGuardian initializes amendedForm as a tri-state string', () => {
    expect(legacyCode).toContain("amendedForm:''");
  });

  test('emptyDataGuardian initializes all D-3 and amended answers as unanswered strings', () => {
    expect(legacyCode).toContain("hasSafeDepositBox:''");
    expect(legacyCode).toContain("safeDepositBoxFiled:''");
    expect(legacyCode).toContain("amendedForm:''");
  });

  test('row factories initialize tri-state strings for schedule flags', () => {
    expect(legacyCode).toContain("residence:'',income:''");
    expect(legacyCode).toContain("restricted:''");
    expect(legacyCode).toContain("inSafeDepositBox:''");
  });

  // Milestone 43B: this used to grep source text for the yesNoRadioHTML(...)
  // call sites, which would pass even if the rendered fieldset were missing,
  // mislabeled, or wired to the wrong state path -- it never rendered
  // anything or read window.D back. pageScheduleA1()/B1()/B2()/B3() aren't
  // exported (no ES-module path to call them directly in this Node-only
  // suite), so real coverage lives in
  // tests/e2e/guardian-inventory-tri-state-radios.spec.ts, which renders each
  // page in a real browser, clicks each radio, and confirms the state write
  // lands at the exact path the source claims.

  test('vehicle Make and Model auto-capitalize on blur/change', () => {
    expect(inventoryCode).toContain("field === 'vehicleMake' || field === 'vehicleModel'");
    expect(inventoryCode).toContain("formatName(control.value)");
  });

  test('D-3 uses the shared fieldset-backed radio renderer', () => {
    expect(inventoryCode).toContain("yesNoRadioHTML('hasSafeDepositBox'");
    expect(inventoryCode).toContain("yesNoRadioHTML('safeDepositBoxFiled'");
    expect(inventoryCode).toContain("'safeDepositBoxFiled',true)");
  });
});
