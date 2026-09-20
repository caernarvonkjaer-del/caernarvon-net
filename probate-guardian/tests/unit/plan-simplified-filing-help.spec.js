import { describe, expect, test, beforeEach } from 'vitest';

// Milestone 61D. The Simplified Annual Plan's court original ends with two
// blocks the app never reproduced anywhere: where to file the original (a
// different clerk for Pinellas than for Pasco) and who to call for procedural
// help (reference/plan-forms/plan-simplified-original.txt:120-135).
//
// Decision (2026-09-20): this is guidance, not filed-document content. It goes
// in Help, pointing filers at the clerk's own published contact details rather
// than transcribing addresses and phone numbers into the app, where they go
// stale silently. The generated PDF keeps its existing generic filing line.
//
// County-gated like the Initial Plan's Disaster Plan paragraph: the two clerks
// named on that form serve the Sixth Circuit, and AGENTS.md's authority
// hierarchy forbids presenting circuit-specific procedure as statewide.

const { HELP_CONTENT } = await import('../../src/features/help/help-content.js');

const render = (key) => {
  const entry = HELP_CONTENT[key];
  return typeof entry.content === 'function' ? entry.content() : entry.content;
};

describe('Milestone 61D: Simplified Plan filing guidance lives in Help', () => {
  beforeEach(() => {
    global.window = { ...(global.window || {}), D: {} };
  });

  test('a Pinellas filing is told where the original goes and who to ask', () => {
    global.window.D = { county: 'Pinellas' };
    const html = render('plan-simplified');
    expect(html).toMatch(/Where to File/i);
    expect(html).toMatch(/Clerk of the Circuit Court/i);
    expect(html).toMatch(/myflcourtaccess/i);
  });

  test('a Pasco filing gets the same section', () => {
    global.window.D = { county: 'Pasco' };
    expect(render('plan-simplified')).toMatch(/Where to File/i);
  });

  test('a filing outside the Sixth Circuit is not given its local procedure', () => {
    global.window.D = { county: 'Hillsborough' };
    const html = render('plan-simplified');
    expect(html).not.toMatch(/Where to File/i);
    // The rest of the guide still renders -- only the circuit-specific block
    // is withheld.
    expect(html).toMatch(/Plan vs\. Accounting/);
  });

  // The decision was to point at the clerk, not to copy their details in. A
  // transcribed phone number or street address in this file is the failure
  // mode this guards: it looks authoritative and silently goes stale.
  test('no clerk phone numbers or street addresses are transcribed', () => {
    global.window.D = { county: 'Pinellas' };
    const html = render('plan-simplified');
    expect(html).not.toMatch(/\(727\)\s?\d{3}-\d{4}/);
    expect(html).not.toMatch(/315 Court Street/i);
    expect(html).not.toMatch(/P\.?O\.? Box 338/i);
    expect(html).not.toMatch(/@mypinellasclerk\.gov/i);
  });
});
