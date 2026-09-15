import { describe, it, expect, beforeEach } from 'vitest';
import {
  renderReadinessCard, bindReadinessCard, resetReadinessCardState,
  READINESS_CARD_ID, MANUAL_REVIEW_SUMMARY, ALL_CHECKS_PASS_SUMMARY,
} from '../../src/core/filing/readiness-card.js';
import { createIssue, createRequiredIssue } from '../../src/core/validation/issue-registry.js';

// Milestone 38B / 44C: the shared readiness card's renderer/controller
// contract -- one native <details>/<summary>, county-policy title, the
// open-by-default rule, the exact manual-only summary wording, escaping,
// routing, and the retained-toggle/reset state rule. Pure string output, so
// no DOM is needed; bindReadinessCard() is exercised through a fake container.

// A complete Plan Simplified filing: every predicate row passes.
const READY_PLAN = Object.freeze({
  wardId: 'w1', inventoryType: 'planSimplified',
  wardName: 'Jordan Rivera', caseNumber: '25-001234-GD', county: 'Orange',
  periodFrom: '2025-01-01', periodTo: '2025-12-31',
  q1Residences: 'home', q2BestPlacement: 'x', q3MedicalTreatment: 'x', q4Diagnosis: 'x',
  q5SocialServices: 'x', q6Interaction: 'x', q7RestoreRights: 'No', q8None: true, q9Remuneration: 'No',
  planGuardians: [{ name: 'Pat', signatureDate: '2026-01-15', email: 'p@x.org', phone: '727-555-0100', mailingAddress: '1 Main St' }],
});

const count = (html, re) => (html.match(re) || []).length;
const isOpen = (html) => /<details[^>]*\sopen>/.test(html);

beforeEach(() => resetReadinessCardState());

describe('markup contract', () => {
  it('renders exactly one <details id="filing-readiness-card"> whose first child is a <summary>, marked no-print', () => {
    const html = renderReadinessCard({ data: READY_PLAN });
    expect(count(html, /<details/g)).toBe(1);
    expect(html).toMatch(new RegExp(`<details id="${READINESS_CARD_ID}"[^>]*class="[^"]*no-print`));
    expect(html.replace(/\s+/g, ' ')).toMatch(/<details[^>]*> <summary/);
    expect(count(html, /<summary/g)).toBe(1);
  });

  it('uses the Clerk title only for Pinellas/Pasco and the Filing title for every other or blank county', () => {
    expect(renderReadinessCard({ data: { ...READY_PLAN, county: 'Pinellas' } })).toContain("Clerk&#39;s Review Readiness");
    expect(renderReadinessCard({ data: { ...READY_PLAN, county: ' pasco ' } })).toContain("Clerk&#39;s Review Readiness");
    for (const county of ['Orange', '', undefined, 'Unknownshire']) {
      const html = renderReadinessCard({ data: { ...READY_PLAN, county } });
      expect(html).toContain('Filing Readiness');
      expect(html).not.toMatch(/Pinellas|Pasco|Sixth (Judicial )?Circuit/);
    }
  });

  it('escapes every label and renders no inline event handlers', () => {
    const issue = createRequiredIssue({ filingType: 'guardian', path: 'wardName', message: '<img src=x onerror="alert(1)"> "quoted" & <b>bold</b>' });
    const html = renderReadinessCard({ filingType: 'guardian', data: { wardId: 'w1', county: 'Orange' }, validationIssues: [issue] });
    expect(html).not.toContain('<img');
    expect(html).not.toContain('<b>');
    expect(html).toContain('&lt;img src=x onerror=&quot;alert(1)&quot;&gt;');
    // No real tag carries an inline handler (the escaped text above is not a tag).
    expect(html).not.toMatch(/<[^>]*\son\w+=/);
  });

  it('shows detailed, form-specific validation coverage for the inventory and accounting forms', () => {
    for (const filingType of ['guardian', 'simplified', 'annual', 'finalAccounting', 'trustAccounting']) {
      const html = renderReadinessCard({ filingType, data: { wardId: 'w1', county: 'Pinellas' } });
      expect(html).toContain('data-readiness-class="overview"');
      expect(html).not.toContain('No automated issues found.');
    }
    expect(renderReadinessCard({ filingType: 'guardian', data: { wardId: 'w1' } })).toContain('Schedule A');
    expect(renderReadinessCard({ filingType: 'annual', data: { wardId: 'w1' } })).toContain('Schedules A through F');
  });
});

describe('summary and open-by-default rule', () => {
  it('opens and counts outstanding items when an automatic check is pending', () => {
    const html = renderReadinessCard({ data: { ...READY_PLAN, wardName: '', periodTo: '' } });
    expect(isOpen(html)).toBe(true);
    expect(html).toContain('2 items outstanding');
    expect(count(html, /readiness-mark pending/g)).toBe(2);
  });

  it('singular wording for exactly one outstanding item', () => {
    expect(renderReadinessCard({ data: { ...READY_PLAN, wardName: '' } })).toContain('1 item outstanding');
  });

  it('collapses with the exact manual-review sentence when automatic checks pass and manual items remain', () => {
    const html = renderReadinessCard({ data: READY_PLAN });
    expect(isOpen(html)).toBe(false);
    expect(html).toContain(`Filing Readiness — ${MANUAL_REVIEW_SUMMARY}`);
    expect(count(html, /readiness-mark pending/g)).toBe(0);
  });

  it('only claims all configured checks pass when no item of any class remains, and never claims approval', () => {
    const html = renderReadinessCard({ filingType: 'not-a-filing', data: { wardId: 'w1' } });
    expect(html).toContain(ALL_CHECKS_PASS_SUMMARY);
    expect(html).not.toMatch(/approved|approval granted/i);
    expect(isOpen(html)).toBe(false);
  });

  it('manual rows are distinct from automatic ones and never carry a pass or pending mark', () => {
    const html = renderReadinessCard({ data: READY_PLAN });
    const manualGroup = html.slice(html.indexOf("can't verify"));
    expect(manualGroup).not.toMatch(/readiness-mark (ok|pending)/);
    expect(count(manualGroup, /data-readiness-class="manual"/g)).toBeGreaterThan(0);
    expect(manualGroup).not.toContain('data-readiness-class="automatic"');
  });
});

describe('routing', () => {
  it('issue-derived rows with a route delegate to the shared jump-to-field handler; readiness-only rows render no link', () => {
    const issue = createRequiredIssue({ filingType: 'guardian', path: 'wardName', route: '/', message: 'Cover — Name of Ward is required' });
    const html = renderReadinessCard({ filingType: 'guardian', data: { wardId: 'w1' }, validationIssues: [issue] });
    expect(html).toContain('data-form-action="jump-to-field" data-route="/" data-jump-path="wardName"');

    const plan = renderReadinessCard({ data: { ...READY_PLAN, wardName: '' } });
    expect(plan).not.toContain('jump-to-field');
  });

  it('issues outside the card scope (supplemental, capacity, technical, security, hidden identity) render no row', () => {
    const outside = [
      createIssue('supplemental.missing-data', { message: 'supp' }),
      createIssue('excel.capacity.annual.schA', { message: 'cap' }),
      createIssue('output.template.missing', { message: 'tech' }),
      createIssue('output.security.denied', { message: 'sec' }),
      createIssue('filing.identity.conflict', { message: 'ident' }),
    ];
    const html = renderReadinessCard({ filingType: 'annual', data: { wardId: 'w1' }, validationIssues: outside });
    for (const word of ['supp', 'cap', 'tech', 'sec', 'ident']) expect(html).not.toContain(`>${word}<`);
    expect(html).toContain('Schedules A through F are complete for every entered line');
    expect(isOpen(html)).toBe(false);
  });
});

describe('retained toggle and reset', () => {
  function fakeContainer() {
    const listeners = [];
    return {
      calls: 0,
      addEventListener(type, fn, capture) { this.calls++; listeners.push({ type, fn, capture }); },
      fire(open, key) {
        for (const l of listeners) l.fn({ target: { id: READINESS_CARD_ID, open, dataset: { readinessKey: key } } });
      },
      listeners,
    };
  }

  it("binds once per container, in the capture phase (toggle doesn't bubble)", () => {
    const c = fakeContainer();
    bindReadinessCard(c);
    bindReadinessCard(c);
    expect(c.calls).toBe(1);
    expect(c.listeners[0].type).toBe('toggle');
    expect(c.listeners[0].capture).toBe(true);
  });

  it('keeps the hand-opened state on a rerender of the same wardId + filingType, and ignores other cards', () => {
    const c = fakeContainer();
    bindReadinessCard(c);
    expect(isOpen(renderReadinessCard({ data: READY_PLAN }))).toBe(false);
    c.fire(true, 'w1:planSimplified');
    expect(isOpen(renderReadinessCard({ data: READY_PLAN }))).toBe(true);
    c.listeners[0].fn({ target: { id: 'some-other-details', open: false, dataset: {} } });
    expect(isOpen(renderReadinessCard({ data: READY_PLAN }))).toBe(true);
  });

  it('a hand-collapsed card stays collapsed on rerender even while items are pending', () => {
    const c = fakeContainer();
    bindReadinessCard(c);
    const pendingData = { ...READY_PLAN, wardName: '' };
    expect(isOpen(renderReadinessCard({ data: pendingData }))).toBe(true);
    c.fire(false, 'w1:planSimplified');
    expect(isOpen(renderReadinessCard({ data: pendingData }))).toBe(false);
  });

  it('recomputes the default for a different ward or filing type, and after resetReadinessCardState()', () => {
    const c = fakeContainer();
    bindReadinessCard(c);
    c.fire(true, 'w1:planSimplified');
    expect(isOpen(renderReadinessCard({ data: { ...READY_PLAN, wardId: 'w2' } }))).toBe(false);
    expect(isOpen(renderReadinessCard({ data: READY_PLAN, filingType: 'guardian' }))).toBe(false);
    expect(isOpen(renderReadinessCard({ data: READY_PLAN }))).toBe(true);
    resetReadinessCardState();
    expect(isOpen(renderReadinessCard({ data: READY_PLAN }))).toBe(false);
  });

  it('an explicit `expanded` argument overrides both memory and the default', () => {
    expect(isOpen(renderReadinessCard({ data: READY_PLAN, expanded: true }))).toBe(true);
    expect(isOpen(renderReadinessCard({ data: { ...READY_PLAN, wardName: '' }, expanded: false }))).toBe(false);
  });
});
