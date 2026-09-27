import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import { parse } from 'acorn';
import {
  renderTextareaField,
  renderYesNoField,
  renderRadioGroupField,
  renderCheckboxField,
} from '../../src/core/form/form-fields.js';
import {
  txtP, chkP, radioP, yesNoRadioHTML, yesNoRadioAnnualHTML, yesNoCheckboxS, yesNoCheckboxD,
} from '../../src/core/form/field-html.js';

// Milestone 41-1: the page helpers the Simplified, Annual and Plan pages call
// -- txtP(), radioP(), chkP() and yesNoRadioHTML() -- render through the
// Tier 1 primitives in form-fields.js with zero call-site changes, as inpS()
// first did. This is a permanent guard against that delegation silently
// drifting, not a one-time migration check: each helper's output must equal
// calling its Tier 1 primitive directly with equivalent arguments.
//
// Milestone 70's 70F moved the helpers out of legacy-app.js into
// src/core/form/field-html.js, so they are imported here; until then this
// spec sliced each one out of the monolith and handed it a stand-in window.

describe('page-helper delegation to Tier 1 primitives (Milestone 41-1)', () => {
  it('txtP() renders through renderTextareaField() with equivalent arguments', () => {
    const delegated = txtP('q5Notes', 'Notes', 'Some text', 4, true, 'A hint');
    const direct = renderTextareaField({
      path: 'q5Notes', label: 'Notes', value: 'Some text', rows: 4, required: true, hint: 'A hint', id: 'q5Notes',
    });
    expect(delegated).toBe(direct);
  });

  it('chkP() renders through renderCheckboxField() with equivalent arguments', () => {
    const delegated = chkP('q11NoRemuneration', 'I have received NO remuneration', true);
    const direct = renderCheckboxField({
      path: 'q11NoRemuneration', label: 'I have received NO remuneration', checked: true, id: 'q11NoRemuneration',
    });
    expect(delegated).toBe(direct);
  });

  it('yesNoRadioHTML() renders through renderYesNoField() with equivalent arguments', () => {
    const delegated = yesNoRadioHTML('q9DNR', 'DNR order?', 'Yes', 'q9DNR', true);
    const direct = renderYesNoField({
      path: 'q9DNR', label: 'DNR order?', value: 'Yes', id: 'q9DNR', required: true, route: '', binding: 'form', tooltipKey: '',
    });
    expect(delegated).toBe(direct);
  });

  it('yesNoRadioHTML() forwards the "annual" binding unchanged', () => {
    const delegated = yesNoRadioHTML('schD1_0_restricted', 'Restricted?', 'No', 'schD1.0.restricted', false, '', 'annual');
    const direct = renderYesNoField({
      path: 'schD1.0.restricted', label: 'Restricted?', value: 'No', id: 'schD1_0_restricted', required: false, route: '', binding: 'annual', tooltipKey: '',
    });
    expect(delegated).toBe(direct);
    expect(delegated).toContain('data-annual-path="schD1.0.restricted"');
  });

  it('radioP() renders through renderRadioGroupField() with equivalent arguments', () => {
    const delegated = radioP('visitFrequency', 'Frequency', 'Monthly', ['Weekly', 'Monthly', 'Annually']);
    const direct = renderRadioGroupField({
      path: 'visitFrequency', label: 'Frequency', value: 'Monthly', options: ['Weekly', 'Monthly', 'Annually'], required: false, hint: '', id: 'visitFrequency',
    });
    expect(delegated).toBe(direct);
  });

  // Milestone 67F: the three helpers that could not carry a route -- which is
  // why the Initial Plan's explanation boxes, Annual's receipt-date field and
  // Annual Plan Q11's name field never appeared on the click -- now forward
  // one as their trailing argument. Trailing, so every existing call site is
  // unchanged; the tests above still pass with no route at all.
  it('chkP(), radioP() and yesNoRadioAnnualHTML() forward a trailing route argument to the Tier 1 primitive', () => {
    expect(chkP('q11NoRemuneration', 'No remuneration', false, '/p10'))
      .toBe(renderCheckboxField({ path: 'q11NoRemuneration', label: 'No remuneration', checked: false, id: 'q11NoRemuneration', route: '/p10' }));

    expect(radioP('q2Setting', '', 'Other', ['Private Residence', 'Other'], false, '', '/p2'))
      .toBe(renderRadioGroupField({ path: 'q2Setting', label: '', value: 'Other', options: ['Private Residence', 'Other'], required: false, hint: '', id: 'q2Setting', route: '/p2' }));

    // yesNoRadioAnnualHTML() delegates through yesNoRadioHTML(); the route
    // must survive both hops and land in the annual-bound output next to
    // data-annual-path. (The sample is a per-row schedule flag; Milestone 67B
    // retired the "Restricted depository?" question this test first used.)
    const annual = yesNoRadioAnnualHTML('schD1_0_restricted', 'Restricted?', '', 'schD1.0.restricted', true, 'restricted', '/schd1');
    expect(annual).toBe(renderYesNoField({
      path: 'schD1.0.restricted', label: 'Restricted?', value: '', id: 'schD1_0_restricted', required: true, route: '/schd1', binding: 'annual', tooltipKey: 'restricted',
    }));
    expect(annual).toContain('data-annual-path="schD1.0.restricted" data-form-value="yes-no" data-form-route="/schd1"');
  });

  // Milestone 41-1's own audit (flagged as an open question by the
  // milestone proposal) found chkP() is the only genuine checkbox among
  // the three candidates: yesNoCheckboxS() and yesNoCheckboxD() are not
  // checkboxes at all -- both call yesNoRadioHTML() directly, identically to
  // yesNoRadioAnnualHTML(). Pinned here so a future edit that reintroduces a
  // real, independent implementation under either name is a deliberate,
  // reviewed change, not a silent drift.
  it('yesNoCheckboxS(), yesNoCheckboxD(), and yesNoRadioAnnualHTML() remain thin wrappers around yesNoRadioHTML(), not independent checkboxes', () => {
    const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
    const src = fs.readFileSync(path.join(root, 'src/core/form/field-html.js'), 'utf8');
    const bodyOf = (name) => {
      const st = parse(src, { ecmaVersion: 'latest', sourceType: 'module' }).body
        .find((s) => s.type === 'ExportNamedDeclaration' && s.declaration?.id?.name === name);
      return st ? src.slice(st.declaration.body.start, st.declaration.body.end) : '';
    };
    for (const name of ['yesNoCheckboxS', 'yesNoCheckboxD', 'yesNoRadioAnnualHTML']) {
      expect(bodyOf(name), name).toContain('return yesNoRadioHTML(');
    }
    expect(bodyOf('yesNoCheckboxS')).not.toContain('type="checkbox"');
    expect(bodyOf('yesNoCheckboxD')).not.toContain('type="checkbox"');
    // And behaviourally: a Yes/No "checkbox" is the radio pair.
    expect(yesNoCheckboxS('x', 'X?', 'Yes')).toContain('type="radio"');
    expect(yesNoCheckboxD('X?', 'Yes', 'x')).toContain('type="radio"');
  });
});
