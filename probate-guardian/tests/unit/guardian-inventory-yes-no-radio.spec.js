import { describe, expect, test, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';

const root = path.resolve(__dirname, '../..');
const legacyCode = fs.readFileSync(path.join(root, 'src/legacy-app.js'), 'utf8');
const inventoryCode = fs.readFileSync(path.join(root, 'src/features/guardian-inventory/index.js'), 'utf8');

describe('Milestone 38E Item 1: Guardian Inventory & Plan Benefits Radio Migration', () => {
  test('emptyDataGuardian initializes amendedForm as a tri-state string', () => {
    expect(legacyCode).toContain("amendedForm:''");
  });

  // hasSafeDepositBox/safeDepositBoxFiled are a different tri-state shape
  // from amendedForm above -- boolean (null/true/false), driven by raw
  // radio markup (data-inventory-change="set-sdb"/"set-sdb-filed"), not
  // yesNoRadioHTML()'s string convention ('Yes'/'No'/''). A stray '' default
  // here meant a brand-new filing's D-3 answer displayed as "Unanswered" in
  // the PDF (pdf-model.js already checks strictly for === true/=== false)
  // while validateGuardian() silently treated the same '' as complete (it
  // only checked === null/=== undefined) -- a real, if narrow, gap where an
  // untouched question could export as done. null is what the field
  // actually becomes once a filer clears it (see index.js's set-sdb
  // handler), so the initial default should match that, not amendedForm's.
  test('emptyDataGuardian initializes hasSafeDepositBox/safeDepositBoxFiled as unanswered (null)', () => {
    expect(legacyCode).toContain('hasSafeDepositBox:null');
    expect(legacyCode).toContain('safeDepositBoxFiled:null');
  });

  test('row factories initialize tri-state strings for schedule flags', () => {
    expect(legacyCode).toContain("residence:'',income:''");
    expect(legacyCode).toContain("restricted:''");
    expect(legacyCode).toContain("inSafeDepositBox:''");
  });

  test('Schedule A-1, B-1, B-2, B-3 use yesNoRadioHTML for binary questions', () => {
    expect(inventoryCode).toContain("yesNoRadioHTML(`schA1_res_${i}`,'Personal Residence?'");
    expect(inventoryCode).toContain("yesNoRadioHTML(`schA1_inc_${i}`,'Income Property?'");
    expect(inventoryCode).toContain("yesNoRadioHTML(`schB1_rest_${i}`,'Restricted?'");
    expect(inventoryCode).toContain("yesNoRadioHTML(`schB2_sdb_${i}`,'In Safe Deposit Box?'");
    expect(inventoryCode).toContain("yesNoRadioHTML(`schB3_rest_${i}`,'Restricted?'");
    expect(inventoryCode).toContain("yesNoRadioHTML(`schB3_sdb_${i}`,'In Safe Deposit Box?'");
    expect(inventoryCode).toContain("yesNoRadioHTML('amendedForm','Amended Form?'");
  });

  test('vehicle Make and Model auto-capitalize on blur/change', () => {
    expect(inventoryCode).toContain("field === 'vehicleMake' || field === 'vehicleModel'");
    expect(inventoryCode).toContain("formatName(control.value)");
  });

  // Milestone 40H-C: D-3's two Safe Deposit Box radio pairs (hasSafeDepositBox,
  // safeDepositBoxFiled) are hand-rolled rather than built through
  // yesNoRadioHTML(), which is why they were missed when the other four
  // groups (checked above) were migrated -- confirmed by AGENTS.md Section 6
  // ("Binary radio pairs ... must be wrapped in semantic <fieldset>/<legend>")
  // and by `grep -c fieldset` on this file returning 0 before this fix.
  test('D-3 Safe Deposit Box parent and child groups are wrapped in semantic fieldset/legend', () => {
    expect(inventoryCode).toContain('<legend class="form-label mb-1" style="font-size:.83rem;">Does the ward have a safe deposit box');
    expect(inventoryCode).toContain('<legend class="form-label d-block mb-1">Safe Deposit Box Inventory Filed with Court?');

    const parentFieldsetIndex = inventoryCode.indexOf('<fieldset class="mb-3">');
    const parentLegendIndex = inventoryCode.indexOf('Does the ward have a safe deposit box');
    const parentRadiosIndex = inventoryCode.indexOf('id="sdb-yes"');
    expect(parentFieldsetIndex).toBeGreaterThan(-1);
    expect(parentFieldsetIndex).toBeLessThan(parentLegendIndex);
    expect(parentLegendIndex).toBeLessThan(parentRadiosIndex);

    const childFieldsetIndex = inventoryCode.lastIndexOf('<fieldset>', inventoryCode.indexOf('id="sdb-filed-yes"'));
    const childLegendIndex = inventoryCode.indexOf('Safe Deposit Box Inventory Filed with Court?');
    const childRadiosIndex = inventoryCode.indexOf('id="sdb-filed-yes"');
    expect(childFieldsetIndex).toBeGreaterThan(-1);
    expect(childFieldsetIndex).toBeLessThan(childLegendIndex);
    expect(childLegendIndex).toBeLessThan(childRadiosIndex);
  });
});

