import { describe, expect, test } from 'vitest';

globalThis.window = globalThis.window || {};

const {
  RESOURCE_GROUPS,
  groupsForCounties,
  resourcesPanelHTML,
} = await import('../../src/features/dashboard/resources.js');

describe('Milestone 47B: dashboard resources directory & policy', () => {
  const EXPECTED_HOSTS = new Set([
    'www.pcpao.gov',
    'www.mypinellasclerk.gov',
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

  describe('groupsForCounties policy (Decision D4)', () => {
    test('[] returns Pinellas, Pasco, Sixth Circuit, and Florida', () => {
      const groups = groupsForCounties([]);
      const groupIds = groups.map(g => g.id);
      expect(groupIds).toEqual(['pinellas', 'pasco', 'sixth-circuit', 'florida']);
    });

    test("['Hillsborough'] returns Florida only", () => {
      const groups = groupsForCounties(['Hillsborough']);
      const groupIds = groups.map(g => g.id);
      expect(groupIds).toEqual(['florida']);
    });

    test("['pinellas'] returns Pinellas, Sixth Circuit, and Florida", () => {
      const groups = groupsForCounties(['pinellas']);
      const groupIds = groups.map(g => g.id);
      expect(groupIds).toEqual(['pinellas', 'sixth-circuit', 'florida']);
    });

    test("['pasco'] returns Pasco, Sixth Circuit, and Florida", () => {
      const groups = groupsForCounties(['pasco']);
      const groupIds = groups.map(g => g.id);
      expect(groupIds).toEqual(['pasco', 'sixth-circuit', 'florida']);
    });

    test("['Pinellas', 'Pasco', ''] returns each group exactly once", () => {
      const groups = groupsForCounties(['Pinellas', 'Pasco', '']);
      const groupIds = groups.map(g => g.id);
      expect(groupIds).toEqual(['pinellas', 'pasco', 'sixth-circuit', 'florida']);
      const unique = new Set(groupIds);
      expect(unique.size).toBe(groupIds.length);
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
      const html = resourcesPanelHTML(groupsForCounties([]), {
        esc: s => s,
        ic: () => '',
      });

      expect(html).toContain('aria-labelledby="sidebar-resources-title"');
      expect(html).toContain('id="sidebar-resources-title"');
      expect(html).toContain(
        "These are independent government and third-party sites. Probate Guardian isn't affiliated with them and doesn't control their content."
      );
    });
  });
});
