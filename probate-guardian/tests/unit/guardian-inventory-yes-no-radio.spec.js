import { describe, expect, test, beforeEach } from 'vitest';
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

  // Milestone 40H-C: D-3's two Safe Deposit Box radio pairs (hasSafeDepositBox,
  // safeDepositBoxFiled) are hand-rolled rather than built through
  // yesNoRadioHTML(), which is why they were missed when the other four
  // groups (checked above) were migrated -- confirmed by AGENTS.md Section 6
  // ("Binary radio pairs ... must be wrapped in semantic <fieldset>/<legend>")
  // and by `grep -c fieldset` on this file returning 0 before this fix.
  // Milestone 43B: the original version inferred nesting from indexOf/
  // lastIndexOf ordering, which proves the legend and radios come *after*
  // the fieldset's opening tag in the text, not that they are *inside* it --
  // it would pass even if the fieldset closed early and the legend/radios
  // were actually siblings after it. findMatchingFieldsetClose() below walks
  // real <fieldset>/</fieldset> tokens with depth tracking to find the
  // fieldset's true matching close tag (handling nested fieldsets correctly,
  // which pure indexOf ordering cannot), then confirms the legend and target
  // radio both fall strictly inside [open, matchingClose). This is a real
  // structural check, not a text-order proxy -- still done against source
  // text rather than a rendered DOM because pageScheduleB1() isn't exported
  // (see the note above this describe block).
  function findMatchingFieldsetClose(source, openTagIndex) {
    const tagRe = /<fieldset\b|<\/fieldset>/g;
    tagRe.lastIndex = openTagIndex;
    let depth = 0;
    let match;
    while ((match = tagRe.exec(source))) {
      if (match[0].startsWith('</')) {
        depth -= 1;
        if (depth === 0) return match.index;
      } else {
        depth += 1;
      }
    }
    return -1;
  }

  function expectLegendAndControlNestedInFieldset(source, fieldsetOpenIndex, legendText, controlMarker) {
    expect(fieldsetOpenIndex, 'fieldset open tag not found').toBeGreaterThan(-1);
    const closeIndex = findMatchingFieldsetClose(source, fieldsetOpenIndex);
    expect(closeIndex, 'matching </fieldset> not found').toBeGreaterThan(-1);
    const legendIndex = source.indexOf(legendText, fieldsetOpenIndex);
    const controlIndex = source.indexOf(controlMarker, fieldsetOpenIndex);
    expect(legendIndex, `legend "${legendText}" not found after fieldset open`).toBeGreaterThan(fieldsetOpenIndex);
    expect(legendIndex, 'legend is not inside this fieldset').toBeLessThan(closeIndex);
    expect(controlIndex, `control "${controlMarker}" not found after legend`).toBeGreaterThan(legendIndex);
    expect(controlIndex, 'control is not inside this fieldset').toBeLessThan(closeIndex);
  }

  test('D-3 Safe Deposit Box parent and child groups are wrapped in semantic fieldset/legend', () => {
    const parentFieldsetIndex = inventoryCode.indexOf('<fieldset class="mb-3">');
    expectLegendAndControlNestedInFieldset(
      inventoryCode,
      parentFieldsetIndex,
      'Does the ward have a safe deposit box',
      'id="sdb-yes"'
    );

    // The child fieldset carries no distinguishing class -- anchor on the
    // row wrapper unique to it, then take the <fieldset> immediately inside.
    const childRowIndex = inventoryCode.indexOf('id="sdb-filed-row"');
    expect(childRowIndex, 'sdb-filed-row wrapper not found').toBeGreaterThan(-1);
    const childFieldsetIndex = inventoryCode.indexOf('<fieldset>', childRowIndex);
    expectLegendAndControlNestedInFieldset(
      inventoryCode,
      childFieldsetIndex,
      'Safe Deposit Box Inventory Filed with Court?',
      'id="sdb-filed-yes"'
    );
  });
});

