import { describe, it, expect } from 'vitest';
import {
  renderTextareaField,
  renderYesNoField,
  renderRadioGroupField,
  renderCheckboxField,
} from '../../src/core/form/form-fields.js';
import { extractLegacyFunction } from './support/legacy-source-extract.js';

// Milestone 41-1: inpS() already proved (in production, on every call once
// main.js's eager import has run) that a legacy helper can delegate its
// rendering to a Tier 1 primitive with zero call-site changes. txtP(),
// radioP(), chkP(), and yesNoRadioHTML() now use the identical
// `if (typeof window.renderX === 'function') return window.renderX(...)`
// pattern. This is a permanent guard against that delegation silently
// drifting -- not a one-time migration check -- by extracting each
// un-exported legacy-app.js function via source-slicing (Milestone 52L:
// now the shared support/legacy-source-extract.js, rather than the third
// hand-copy of the technique bar-number.spec.js established for this
// classic, zero-export, browser-bound script) and confirming its
// output, given a real window.renderX, equals calling that Tier 1
// primitive directly with equivalent arguments.
function loadWithWindow(name, windowStub) {
  const body = extractLegacyFunction(name);
  // eslint-disable-next-line no-new-func
  const factory = new Function('window', `${body}; return ${name};`);
  return factory(windowStub);
}

describe('legacy call-site delegation to Tier 1 primitives (Milestone 41-1)', () => {
  it('txtP() delegates to window.renderTextareaField with equivalent arguments', () => {
    const txtP = loadWithWindow('txtP', { renderTextareaField });
    const delegated = txtP('q5Notes', 'Notes', 'Some text', 4, true, 'A hint');
    const direct = renderTextareaField({
      path: 'q5Notes', label: 'Notes', value: 'Some text', rows: 4, required: true, hint: 'A hint', id: 'q5Notes',
    });
    expect(delegated).toBe(direct);
  });

  it('chkP() delegates to window.renderCheckboxField with equivalent arguments', () => {
    const chkP = loadWithWindow('chkP', { renderCheckboxField });
    const delegated = chkP('q11NoRemuneration', 'I have received NO remuneration', true);
    const direct = renderCheckboxField({
      path: 'q11NoRemuneration', label: 'I have received NO remuneration', checked: true, id: 'q11NoRemuneration',
    });
    expect(delegated).toBe(direct);
  });

  it('yesNoRadioHTML() delegates to window.renderYesNoField with equivalent arguments', () => {
    const yesNoRadioHTML = loadWithWindow('yesNoRadioHTML', { renderYesNoField });
    const delegated = yesNoRadioHTML('q9DNR', 'DNR order?', 'Yes', 'q9DNR', true);
    const direct = renderYesNoField({
      path: 'q9DNR', label: 'DNR order?', value: 'Yes', id: 'q9DNR', required: true, route: '', binding: 'form', tooltipKey: '',
    });
    expect(delegated).toBe(direct);
  });

  it('yesNoRadioHTML() forwards the "annual" binding through delegation unchanged', () => {
    const yesNoRadioHTML = loadWithWindow('yesNoRadioHTML', { renderYesNoField });
    const delegated = yesNoRadioHTML('schD1_0_restricted', 'Restricted?', 'No', 'schD1.0.restricted', false, '', 'annual');
    const direct = renderYesNoField({
      path: 'schD1.0.restricted', label: 'Restricted?', value: 'No', id: 'schD1_0_restricted', required: false, route: '', binding: 'annual', tooltipKey: '',
    });
    expect(delegated).toBe(direct);
    expect(delegated).toContain('data-annual-path="schD1.0.restricted"');
  });

  it('radioP() delegates to window.renderRadioGroupField with equivalent arguments', () => {
    const radioP = loadWithWindow('radioP', { renderRadioGroupField });
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
    const chkP = loadWithWindow('chkP', { renderCheckboxField });
    expect(chkP('q11NoRemuneration', 'No remuneration', false, '/p10'))
      .toBe(renderCheckboxField({ path: 'q11NoRemuneration', label: 'No remuneration', checked: false, id: 'q11NoRemuneration', route: '/p10' }));

    const radioP = loadWithWindow('radioP', { renderRadioGroupField });
    expect(radioP('q2Setting', '', 'Other', ['Private Residence', 'Other'], false, '', '/p2'))
      .toBe(renderRadioGroupField({ path: 'q2Setting', label: '', value: 'Other', options: ['Private Residence', 'Other'], required: false, hint: '', id: 'q2Setting', route: '/p2' }));

    // yesNoRadioAnnualHTML() delegates through yesNoRadioHTML(), so both are
    // loaded into one scope; the route must survive both hops and land in
    // the annual-bound output next to data-annual-path.
    const body = `${extractLegacyFunction('yesNoRadioHTML')}; ${extractLegacyFunction('yesNoRadioAnnualHTML')}; return yesNoRadioAnnualHTML;`;
    // eslint-disable-next-line no-new-func
    const yesNoRadioAnnualHTML = new Function('window', body)({ renderYesNoField });
    // (The sample is a per-row schedule flag; Milestone 67B retired the
    // "Restricted depository?" question this test first used as its sample.)
    const annual = yesNoRadioAnnualHTML('schD1_0_restricted', 'Restricted?', '', 'schD1.0.restricted', true, 'restricted', '/schd1');
    expect(annual).toBe(renderYesNoField({
      path: 'schD1.0.restricted', label: 'Restricted?', value: '', id: 'schD1_0_restricted', required: true, route: '/schd1', binding: 'annual', tooltipKey: 'restricted',
    }));
    expect(annual).toContain('data-annual-path="schD1.0.restricted" data-form-value="yes-no" data-form-route="/schd1"');
  });

  // Milestone 41-1's own audit (flagged as an open question by the
  // milestone proposal) found chkP() is the only genuine checkbox among
  // the three candidates: yesNoCheckboxS() and yesNoCheckboxD() are not
  // checkboxes at all -- both already call yesNoRadioHTML() directly,
  // identically to yesNoRadioAnnualHTML(). Pinned here so a future edit
  // that reintroduces a real, independent implementation under either
  // name is a deliberate, reviewed change, not a silent drift.
  it('yesNoCheckboxS(), yesNoCheckboxD(), and yesNoRadioAnnualHTML() remain thin wrappers around yesNoRadioHTML(), not independent checkboxes', () => {
    expect(extractLegacyFunction('yesNoCheckboxS')).toContain('return yesNoRadioHTML(');
    expect(extractLegacyFunction('yesNoCheckboxD')).toContain('return yesNoRadioHTML(');
    expect(extractLegacyFunction('yesNoRadioAnnualHTML')).toContain('return yesNoRadioHTML(');
    expect(extractLegacyFunction('yesNoCheckboxS')).not.toContain('type="checkbox"');
    expect(extractLegacyFunction('yesNoCheckboxD')).not.toContain('type="checkbox"');
  });
});
