import { describe, expect, test } from 'vitest';
import fs from 'fs';
import path from 'path';
import { emptyDataGuardian, mk } from '../../src/core/filing/models/guardian.js';

const root = path.resolve(__dirname, '../..');
const inventoryCode = fs.readFileSync(path.join(root, 'src/features/guardian-inventory/index.js'), 'utf8');

// Milestone 43B kept the checks below as source-text greps of legacy-app.js,
// because emptyDataGuardian() and the row factories were classic-script
// functions with no module export. Milestone 70's 70C moved them into
// src/core/filing/models/guardian.js, so they are called and their values read.
describe('Milestone 38E Item 1: Guardian Inventory & Plan Benefits Radio Migration', () => {
  test('emptyDataGuardian initializes amendedForm as a tri-state string', () => {
    expect(emptyDataGuardian().amendedForm).toBe('');
  });

  test('emptyDataGuardian initializes all D-3 and amended answers as unanswered strings', () => {
    expect(emptyDataGuardian().hasSafeDepositBox).toBe('');
    expect(emptyDataGuardian().safeDepositBoxFiled).toBe('');
    expect(emptyDataGuardian().amendedForm).toBe('');
  });

  test('row factories initialize tri-state strings for schedule flags', () => {
    expect([mk.a1().residence, mk.a1().income]).toEqual(['', '']);
    expect([mk.b1().restricted, mk.b3().restricted]).toEqual(['', '']);
    expect([mk.b2().inSafeDepositBox, mk.b3().inSafeDepositBox]).toEqual(['', '']);
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
