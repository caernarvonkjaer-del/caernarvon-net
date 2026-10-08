import { describe, expect, test } from 'vitest';
import {
  CONTINUE_LABEL, EXPORT_REASON_ID, OUTPUT_BUTTONS,
  excelOmissionsHtml, excelOmissionsQuestion, exportReasonHtml, outputReason, outputRefusal,
} from '../../src/core/filing/output-reasons.js';

// Milestone 74C and 73M step 5: Save as PDF and Save as Excel stay clickable
// on all nine forms, and say why they can't export -- in a reason line beside
// them, before the click, and on the click. Until then a greyed-out button
// gave no reason, not on hover and not to a screen reader; after "Continue
// despite outstanding requirements" the Simplified Plan's Save as PDF stayed
// greyed out; and Save as Excel, back on Preview after a Continue, redrew the
// page and said nothing.

const allowed = { status: 'allowed', issues: [] };
const outstanding = (n) => ({ status: 'acknowledgement-required', issues: Array.from({ length: n }, (_, i) => ({ code: `x.${i}` })) });
const blocked = (n) => ({ status: 'blocked', issues: Array.from({ length: n }, (_, i) => ({ code: `x.${i}` })) });

describe('what stops an output', () => {
  test('nothing, for an allowed output or none given', () => {
    expect(outputReason(allowed)).toBe(null);
    expect(outputReason(undefined)).toBe(null);
  });

  test('items that cannot be overridden, and requirements Continue can acknowledge, are counted and told apart', () => {
    expect(outputReason(blocked(1))).toEqual(['blocked', '1 item to correct first — see the list on this page']);
    expect(outputReason(blocked(3))[1]).toMatch(/^3 items to correct first/);
    expect(outputReason(outstanding(1))).toEqual(['outstanding', `1 requirement outstanding — see the list on this page, or choose “${CONTINUE_LABEL}”`]);
    expect(outputReason(outstanding(2))[1]).toMatch(/^2 requirements outstanding/);
  });

  test("a workbook that can't hold every entry is said first and names what overflows -- Continue never clears it", () => {
    const [kind, text] = outputReason(outstanding(2), { capacity: [{ label: 'Schedule B-1' }, { key: 'certRecipients' }] });
    expect(kind).toBe('capacity');
    expect(text).toBe("more entries than the court's workbook can hold (Schedule B-1, certRecipients) — save as PDF instead");
    expect(outputReason(allowed, { capacity: [{ label: 'Part XI' }] })[0]).toBe('capacity');
  });
});

describe('the reason line beside the buttons', () => {
  const reasons = (html) => [...html.matchAll(/data-export-reason="([a-z]+)">([^<]*)</g)].map((m) => [m[1], m[2].replace(/&#39;/g, "'")]);

  test('is always there for the buttons to point at, and empty when every output can go', () => {
    const html = exportReasonHtml({ pdf: allowed, excel: { authorization: allowed } });
    expect(html).toContain(`id="${EXPORT_REASON_ID}"`);
    expect(reasons(html)).toEqual([]);
  });

  test('says the same sentence once for both buttons when they share it', () => {
    expect(reasons(exportReasonHtml({ pdf: outstanding(2), excel: { authorization: outstanding(2) } })))
      .toEqual([['outstanding', `Save as PDF and Save as Excel: 2 requirements outstanding — see the list on this page, or choose “${CONTINUE_LABEL}”.`]]);
  });

  test('gives each button its own sentence when they differ, and a Plan only its Save as PDF', () => {
    const both = reasons(exportReasonHtml({ pdf: allowed, excel: { authorization: allowed, capacity: [{ label: 'Part XI' }] } }));
    expect(both).toEqual([['capacity', "Save as Excel: more entries than the court's workbook can hold (Part XI) — save as PDF instead."]]);
    const plan = reasons(exportReasonHtml({ pdf: blocked(1) }));
    expect(plan).toEqual([['blocked', 'Save as PDF: 1 item to correct first — see the list on this page.']]);
  });

  test('escapes what it prints', () => {
    expect(exportReasonHtml({ excel: { authorization: allowed, capacity: [{ label: '<b>B-1</b>' }] } })).toContain('&lt;b&gt;B-1&lt;/b&gt;');
  });

  test('every export button is found by one selector', () => {
    expect(OUTPUT_BUTTONS).toBe('[data-output-action]');
  });
});

describe('the click', () => {
  test("says today's \"Cannot export\" and, when Continue can, how to go on", () => {
    expect(outputRefusal(outstanding(1), 'PDF')).toBe(`Cannot export — 1 required field missing. See the list on this page, or choose “${CONTINUE_LABEL}” to export anyway.`);
    expect(outputRefusal(outstanding(2), 'Excel')).toMatch(/^Cannot export to Excel — 2 required fields missing\./);
    expect(outputRefusal(blocked(1), 'PDF')).toBe("Cannot export — 1 required field missing. See the list on this page; it can't be overridden.");
    expect(outputRefusal(blocked(2), 'Excel')).toBe("Cannot export to Excel — 2 required fields missing. See the list on this page; they can't be overridden.");
  });
});

// Milestone 73M: what the filing holds that the court's workbook has no box
// for. Said beside the buttons; what the filer must file another way (A-2's
// Notes, the Lines 20/30 explanation) is also asked about at Save as Excel.
describe("what the Excel workbook won't carry", () => {
  test('beside the buttons: nothing when there is nothing, else each thing named', () => {
    expect(excelOmissionsHtml([])).toBe('');
    expect(excelOmissionsHtml(undefined)).toBe('');
    expect(excelOmissionsHtml([{ text: 'the UCN' }])).toContain('Not in the Excel workbook (it has no box for it; the PDF includes it): the UCN.');
    expect(excelOmissionsHtml([{ text: "A-2's Notes" }, { text: 'the UCN' }])).toContain('(it has no box for them; the PDF includes them): A-2&#39;s Notes; the UCN.');
  });

  test('at Save as Excel: the question names it and says how to file it', () => {
    expect(excelOmissionsQuestion([{ text: "A-2's Notes" }]))
      .toBe("The court's Excel workbook has no box for A-2's Notes. The PDF includes it; file the PDF, or file it separately. Save the workbook without it?");
    expect(excelOmissionsQuestion([{ text: 'the explanation' }, { text: "A-2's Notes" }])).toMatch(/no box for the explanation or A-2's Notes\. The PDF includes them;.*without them\?$/);
  });
});
