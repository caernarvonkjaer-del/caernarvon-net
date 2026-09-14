import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  renderTextareaField,
  renderYesNoField,
  renderRadioGroupField,
  renderCheckboxField,
} from '../../src/core/form/form-fields.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC = fs.readFileSync(path.resolve(__dirname, '../../src/legacy-app.js'), 'utf8');

// Milestone 41-1: inpS() already proved (in production, on every call once
// main.js's eager import has run) that a legacy helper can delegate its
// rendering to a Tier 1 primitive with zero call-site changes. txtP(),
// radioP(), chkP(), and yesNoRadioHTML() now use the identical
// `if (typeof window.renderX === 'function') return window.renderX(...)`
// pattern. This is a permanent guard against that delegation silently
// drifting -- not a one-time migration check -- by extracting each
// un-exported legacy-app.js function via source-slicing (the technique
// tests/unit/bar-number.spec.js already established for this file, since
// it's a classic, zero-export, browser-bound script) and confirming its
// output, given a real window.renderX, equals calling that Tier 1
// primitive directly with equivalent arguments.
function extractFunction(name) {
  const header = `function ${name}(`;
  const start = SRC.indexOf(header);
  expect(start, `${name} not found in legacy-app.js`).toBeGreaterThan(-1);
  const open = SRC.indexOf('{', start);
  let depth = 0;
  let end = -1;
  for (let i = open; i < SRC.length; i++) {
    if (SRC[i] === '{') depth++;
    else if (SRC[i] === '}') { depth--; if (depth === 0) { end = i + 1; break; } }
  }
  return SRC.slice(start, end);
}

function loadWithWindow(name, windowStub) {
  const body = extractFunction(name);
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

  // Milestone 41-1's own audit (flagged as an open question by the
  // milestone proposal) found chkP() is the only genuine checkbox among
  // the three candidates: yesNoCheckboxS() and yesNoCheckboxD() are not
  // checkboxes at all -- both already call yesNoRadioHTML() directly,
  // identically to yesNoRadioAnnualHTML(). Pinned here so a future edit
  // that reintroduces a real, independent implementation under either
  // name is a deliberate, reviewed change, not a silent drift.
  it('yesNoCheckboxS(), yesNoCheckboxD(), and yesNoRadioAnnualHTML() remain thin wrappers around yesNoRadioHTML(), not independent checkboxes', () => {
    expect(extractFunction('yesNoCheckboxS')).toContain('return yesNoRadioHTML(');
    expect(extractFunction('yesNoCheckboxD')).toContain('return yesNoRadioHTML(');
    expect(extractFunction('yesNoRadioAnnualHTML')).toContain('return yesNoRadioHTML(');
    expect(extractFunction('yesNoCheckboxS')).not.toContain('type="checkbox"');
    expect(extractFunction('yesNoCheckboxD')).not.toContain('type="checkbox"');
  });
});
