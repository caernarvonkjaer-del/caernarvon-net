import { describe, expect, test } from 'vitest';

globalThis.window = globalThis.window || {};

const {
  RESOURCE_GROUPS,
  countiesForCircuit,
  groupsForCircuit,
  deriveDefaultCircuit,
  resourcesPanelHTML,
} = await import('../../src/features/dashboard/resources.js');

describe('Milestone 47B: dashboard resources directory & policy', () => {
  const EXPECTED_HOSTS = new Set([
    'www.pcpao.gov',
    'www.mypinellasclerk.gov',
    'courtrecords.mypinellasclerk.gov',
    'guardianassociation.org',
    'pinellastaxcollector.gov',
    'pascopa.com',
    'www.pascoclerk.com',
    'www.pascotaxes.com',
    'www.jud6.org',
    'www.myflcourtaccess.com',
    'www.leg.state.fl.us',
    'www.floridabar.org',
    'www.flcourts.gov',
    'elderaffairs.org',
    'www.myflfamilies.com',
    'www.fltreasurehunt.gov',
    'www.ssa.gov',
    'www.benefits.va.gov',
  ]);

  test('RESOURCE_GROUPS and link collections are frozen', () => {
    expect(Object.isFrozen(RESOURCE_GROUPS)).toBe(true);
    for (const group of RESOURCE_GROUPS) {
      expect(Object.isFrozen(group)).toBe(true);
      expect(Object.isFrozen(group.links)).toBe(true);
      for (const link of group.links) {
        expect(Object.isFrozen(link)).toBe(true);
      }
    }
  });

  test('link ids are unique across all groups', () => {
    const allIds = [];
    for (const group of RESOURCE_GROUPS) {
      for (const link of group.links) {
        allIds.push(link.id);
      }
    }
    const uniqueIds = new Set(allIds);
    expect(uniqueIds.size).toBe(allIds.length);
  });

  test("every URL is https: with a hostname on the expected-host allowlist", () => {
    for (const group of RESOURCE_GROUPS) {
      for (const link of group.links) {
        const parsed = new URL(link.url);
        expect(parsed.protocol, `${link.id} protocol`).toBe('https:');
        expect(EXPECTED_HOSTS.has(parsed.hostname), `${link.id} host ${parsed.hostname}`).toBe(true);
      }
    }
  });

  describe('deriveDefaultCircuit (Milestone 54, Decision D4\'s successor)', () => {
    test('[] (no filings, or none with a resolvable county) returns null', () => {
      expect(deriveDefaultCircuit([])).toBeNull();
      expect(deriveDefaultCircuit(['', 'Not A Real County'])).toBeNull();
    });

    test("['Pinellas'] returns 6", () => {
      expect(deriveDefaultCircuit(['Pinellas'])).toBe(6);
    });

    test("['pasco'] is case/whitespace tolerant via normalizeCountyName and returns 6", () => {
      expect(deriveDefaultCircuit(['pasco'])).toBe(6);
    });

    test("['Hillsborough'] returns 13, not the app's historical Pinellas/Pasco home circuit", () => {
      expect(deriveDefaultCircuit(['Hillsborough'])).toBe(13);
    });

    test('the most common circuit among several filings wins', () => {
      expect(deriveDefaultCircuit(['Pinellas', 'Pasco', 'Hillsborough'])).toBe(6);
      expect(deriveDefaultCircuit(['Hillsborough', 'Hillsborough', 'Pinellas'])).toBe(13);
    });

    test('a tie is broken by the lower circuit number, deterministically', () => {
      // Escambia = circuit 1, Hillsborough = circuit 13 -- one filing each.
      expect(deriveDefaultCircuit(['Escambia', 'Hillsborough'])).toBe(1);
      expect(deriveDefaultCircuit(['Hillsborough', 'Escambia'])).toBe(1);
    });
  });

  describe('resourcesPanelHTML rendering', () => {
    test('returns empty string for empty groups', () => {
      expect(resourcesPanelHTML([])).toBe('');
      expect(resourcesPanelHTML(null)).toBe('');
    });

    test('labels, headings, and descriptions are escaped', () => {
      const mockGroups = [
        {
          id: 'test-group',
          heading: '<Group & Test>',
          links: [
            {
              id: 'test-link',
              label: 'Label <with> "quotes" & ampersand',
              description: 'Desc <b>bold</b> & "safe"',
              url: 'https://example.com/test?a=1&b=2',
            },
          ],
        },
      ];

      const html = resourcesPanelHTML(mockGroups, {
        esc: s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'),
        ic: () => '<svg></svg>',
      });

      expect(html).toContain('&lt;Group &amp; Test&gt;');
      expect(html).not.toContain('<Group & Test>');
      expect(html).toContain('Label &lt;with&gt; &quot;quotes&quot; &amp; ampersand');
      expect(html).not.toContain('Label <with>');
      expect(html).toContain('Desc &lt;b&gt;bold&lt;/b&gt; &amp; &quot;safe&quot;');
      expect(html).not.toContain('<b>bold</b>');
    });

    test('every <a> has target="_blank" and rel with both noopener and noreferrer', () => {
      const html = resourcesPanelHTML(RESOURCE_GROUPS, {
        esc: s => s,
        ic: (name, size) => `<span class="ic-${name}-${size}"></span>`,
      });

      const anchorRegex = /<a\b[^>]*>/g;
      const matches = html.match(anchorRegex) || [];
      expect(matches.length).toBeGreaterThan(0);

      for (const anchor of matches) {
        expect(anchor).toContain('target="_blank"');
        const relMatch = anchor.match(/rel="([^"]*)"/);
        expect(relMatch, 'has rel attribute').not.toBeNull();
        const relTokens = (relMatch?.[1] || '').split(/\s+/);
        expect(relTokens).toContain('noopener');
        expect(relTokens).toContain('noreferrer');
      }
    });

  test('renders section with aria-labelledby and footer disclaimer', () => {
      const html = resourcesPanelHTML(groupsForCircuit(6), {
        esc: s => s,
        ic: () => '',
      });

      expect(html).toContain('aria-labelledby="sidebar-resources-title"');
      expect(html).toContain('id="sidebar-resources-title"');
      expect(html).toContain(
      "These are independent government and third-party sites. Probate Guardian isn't affiliated with them and doesn't control their content."
    );
  });

  test('renders county sections as collapsed accordions', () => {
    const html = resourcesPanelHTML(groupsForCircuit(6), { esc: s => s, ic: () => '' });
    expect(html).toContain('<details class="sidebar-resource-group">');
    expect(html).toContain('<summary class="nav-section-label sidebar-resource-summary">Pinellas County</summary>');
    expect(html).not.toContain('<details class="sidebar-resource-group" open>');
  });

  test('includes Pinellas court records and guardian association resources', () => {
    const pinellas = RESOURCE_GROUPS.find(group => group.id === 'pinellas');
    expect(pinellas.links).toContainEqual(expect.objectContaining({ id: 'pinellas-court-records', url: 'https://courtrecords.mypinellasclerk.gov/' }));
    expect(pinellas.links).toContainEqual(expect.objectContaining({ id: 'pinellas-guardian-association', url: 'https://guardianassociation.org/' }));
  });
});
});

describe('Milestone 54: Judicial Circuit selector and per-county accordions', () => {
  test('countiesForCircuit resolves correct counties for selected circuit', () => {
    expect(countiesForCircuit(6)).toEqual(['Pasco', 'Pinellas']);
    expect(countiesForCircuit(1)).toEqual(['Escambia', 'Okaloosa', 'Santa Rosa', 'Walton']);
    expect(countiesForCircuit(11)).toEqual(['Miami-Dade']);
    expect(countiesForCircuit(99)).toEqual(['Pasco', 'Pinellas']); // Fallback to 6th Circuit
  });

  test('groupsForCircuit returns county accordions for circuit and includes Florida section', () => {
    const sixthGroups = groupsForCircuit(6);
    const sixthHeadings = sixthGroups.map(g => g.heading);
    expect(sixthHeadings).toContain('Pasco County');
    expect(sixthHeadings).toContain('Pinellas County');
    expect(sixthHeadings).toContain('Sixth Judicial Circuit');
    expect(sixthHeadings[sixthHeadings.length - 1]).toBe('Florida');

    const firstGroups = groupsForCircuit(1);
    const firstHeadings = firstGroups.map(g => g.heading);
    expect(firstHeadings).toEqual(['Escambia County', 'Okaloosa County', 'Santa Rosa County', 'Walton County', 'Florida']);
  });

  test('groupsForCircuit generates empty stub groups for counties with no pre-defined links', () => {
    const firstGroups = groupsForCircuit(1);
    const escambia = firstGroups.find(g => g.heading === 'Escambia County');
    expect(escambia).toBeDefined();
    expect(escambia.links).toEqual([]);
  });

  test('resourcesPanelHTML renders circuit select dropdown with selected circuit option', () => {
    const html = resourcesPanelHTML(groupsForCircuit(12), { selectedCircuit: 12, esc: s => s, ic: () => '' });
    expect(html).toContain('<select id="sidebar-circuit-select" class="form-select form-select-sm sidebar-circuit-select" data-action="change-circuit">');
    expect(html).toContain('<option value="12" selected>Twelfth Judicial Circuit</option>');
    expect(html).toContain('DeSoto County');
    expect(html).toContain('Manatee County');
    expect(html).toContain('Sarasota County');
    expect(html).toContain('No county-specific links yet');
  });

  test('resourcesPanelHTML with no explicit groups derives them from selectedCircuit', () => {
    const html = resourcesPanelHTML(undefined, { selectedCircuit: 1, esc: s => s, ic: () => '' });
    expect(html).toContain('Escambia County');
    expect(html).toContain('<option value="1" selected>First Judicial Circuit</option>');
  });
});
