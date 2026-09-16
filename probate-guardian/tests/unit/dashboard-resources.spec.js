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
  // Generated from RESOURCE_GROUPS itself (every link's hostname, deduped and
  // sorted) rather than retyped by hand, so this allowlist and the data it
  // checks can never drift apart -- see the Milestone 54 helpful-links
  // wiring task in MILESTONE-53-PROPOSAL.md's appendix.
  const EXPECTED_HOSTS = new Set([
    '2ndcircuit.leoncountyfl.gov',
    'alachuacounty.us',
    'app02.clerk.org',
    'apps.stjohnsclerk.com',
    'appsgp.mypalmbeachclerk.com',
    'bakerclerk.com',
    'baypa.net',
    'bcpa.net',
    'bradfordclerk.com',
    'browardtax.org',
    'calhounpa.net',
    'ccpao.com',
    'charlotteclerk.com',
    'circuit7.org',
    'circuit8.org',
    'clayclerk.com',
    'clerkapps.okaloosaclerk.com',
    'cms.collierclerk.com',
    'columbia.floridapa.com',
    'columbiaclerk.com',
    'core.duvalclerk.com',
    'court.baycoclerk.com',
    'courtcasesearch.stlucieclerk.gov',
    'courtrecords.mypinellasclerk.gov',
    'courtrecords.seminoleclerk.org',
    'courts.charlotteclerk.com',
    'courts.osceolaclerk.com',
    'cvweb.leonclerk.com',
    'dixieclerk.com',
    'dixiecountytaxcollector.com',
    'elderaffairs.org',
    'fl-gilchrist-taxcollector.publicaccessnow.com',
    'fl-suwannee-taxcollector.manatron.com',
    'flaglerclerk.gov',
    'flaglerpa.com',
    'flcourts18.org',
    'franklincountypa.net',
    'gadsdenpa.com',
    'gilchristclerk.com',
    'gladesclerk.com',
    'guardianassociation.org',
    'gulfpa.com',
    'hamiltonclerk.com',
    'hamiltonpa.com',
    'hardeepa.com',
    'hendryprop.com',
    'hernandoclerk.com',
    'hover.hillsclerk.com',
    'indianriverclerk.com',
    'inquiry.clayclerk.com',
    'jeffersonpa.net',
    'jeffersontc.com',
    'jud10.flcourts.org',
    'jud14.flcourts.org',
    'keyscourts.net',
    'leonclerk.com',
    'levytaxcollector.com',
    'libertyclerk.com',
    'libertypa.org',
    'madisonpa.com',
    'matrix.leeclerk.org',
    'mcpafl.org',
    'myeclerk.myorangeclerk.com',
    'myokeeclerk.com',
    'mywakullapa.com',
    'nassautaxes.com',
    'ninthcircuit.org',
    'ocpaweb.ocpafl.org',
    'okaloosaclerk.com',
    'okaloosapa.com',
    'osceolaclerk.com',
    'pa.putnam-fl.com',
    'pascopa.com',
    'pbcpao.gov',
    'pinellastaxcollector.gov',
    'pro.polkcountyclerk.net',
    'public.brevardclerk.com',
    'public.escambiaclerk.com',
    'pubrecords.taylorclerk.com',
    'putnamclerk.com',
    'qpublic.net',
    'records.flaglerclerk.gov',
    'records.manateeclerk.com',
    'santarosaclerk.com',
    'scorss.citrusclerk.org',
    'secure.sarasotaclerk.com',
    'seminolecounty.tax',
    'srcpa.gov',
    'stjohnsclerk.com',
    'stlucieclerk.gov',
    'suwanneepa.com',
    'taxcol.martin.fl.us',
    'taxcollector.charlottecountyfl.gov',
    'taxcollector.jacksonville.gov',
    'thirdcircuitfl.org',
    'union.floridapa.com',
    'unionclerk.com',
    'vcpa.vcgov.org',
    'vctaxcollector.org',
    'wakullaclerk.org',
    'waltonclerkfl.gov',
    'waltonpa.com',
    'www.15thcircuit.com',
    'www.17th.flcourts.org',
    'www.acpafl.org',
    'www.alachuaclerk.org',
    'www.alachuacollector.com',
    'www.bakerpa.com',
    'www.baycoclerk.com',
    'www.baytaxcollector.com',
    'www.bcpao.us',
    'www.benefits.va.gov',
    'www.bradfordappraiser.com',
    'www.bradfordtaxcollector.com',
    'www.brevardclerk.us',
    'www.brevardtaxcollector.com',
    'www.browardclerk.org',
    'www.ca.cjis20.org',
    'www.calhounclerk.com',
    'www.calhountc.com',
    'www.ccappraiser.com',
    'www.circuit19.org',
    'www.circuit5.org',
    'www.citrusclerk.org',
    'www.citruspa.org',
    'www.citrustc.us',
    'www.civitekflorida.com',
    'www.claycountytax.com',
    'www.clerk.org',
    'www.coj.net',
    'www.collierappraiser.com',
    'www.collierclerk.com',
    'www.colliertax.com',
    'www.columbiataxcollector.com',
    'www.desotoclerk.com',
    'www.desotopa.com',
    'www.desototaxcollector.com',
    'www.duvalclerk.com',
    'www.escambiaclerk.com',
    'www.escambiataxcollector.com',
    'www.escpa.org',
    'www.firstjudicialcircuit.org',
    'www.flaglertax.com',
    'www.flcourts.gov',
    'www.fljud13.org',
    'www.floridabar.org',
    'www.fltreasurehunt.gov',
    'www.franklinclerk.com',
    'www.franklintaxcollector.com',
    'www.gadsdenclerk.com',
    'www.gadsdentaxcollector.com',
    'www.gladestc.com',
    'www.gulfclerk.com',
    'www.gulftaxcollector.com',
    'www.hamiltontaxcollector.com',
    'www.hardeeclerk.com',
    'www.hardeetaxcollector.com',
    'www.hcclerk.org',
    'www.hcpafl.org',
    'www.hcpao.org',
    'www.hctaxcollector.com',
    'www.hendryclerk.org',
    'www.hendrycountytc.com',
    'www.hernandocounty.us',
    'www.hernandopa-fl.us',
    'www.hillsclerk.com',
    'www.hillstax.org',
    'www.holmesclerk.com',
    'www.holmestax.com',
    'www.ircpa.org',
    'www.irctax.com',
    'www.jacksonclerk.com',
    'www.jacksontc.com',
    'www.jeffersonclerk.com',
    'www.jud10.flcourts.org',
    'www.jud11.flcourts.org',
    'www.jud12.flcourts.org',
    'www.jud4.org',
    'www.jud6.org',
    'www.lafayetteclerk.com',
    'www.lafayettepa.com',
    'www.lafayettetc.com',
    'www.lakecopropappr.com',
    'www.lakecountyclerkfl.gov',
    'www.laketax.com',
    'www.leeclerk.org',
    'www.leepa.org',
    'www.leetc.com',
    'www.leg.state.fl.us',
    'www.leonpa.gov',
    'www.leontaxcollector.net',
    'www.levyclerk.com',
    'www.libertytaxcollector.com',
    'www.madisonclerk.com',
    'www.madisontc.com',
    'www.manateeclerk.com',
    'www.manateepao.gov',
    'www.marioncountyclerk.org',
    'www.mariontax.com',
    'www.martinclerk.com',
    'www.miamidade.gov',
    'www.miamidadeclerk.gov',
    'www.monroe-clerk.com',
    'www.monroetaxcollector.com',
    'www.mybakertc.com',
    'www.myflcourtaccess.com',
    'www.myflfamilies.com',
    'www.myorangeclerk.com',
    'www.mypalmbeachclerk.com',
    'www.mypinellasclerk.gov',
    'www.nassauclerk.com',
    'www.nassauflpa.com',
    'www.octaxcol.com',
    'www.okaloosatax.com',
    'www.okeechobeepa.com',
    'www.okeechobeetc.com',
    'www.osceolataxcollector.org',
    'www.pa.marion.fl.us',
    'www.pa.martin.fl.us',
    'www.pascoclerk.com',
    'www.pascotaxes.com',
    'www.paslc.gov',
    'www.pbctax.gov',
    'www.pcpao.gov',
    'www.polkclerkfl.gov',
    'www.polkpa.org',
    'www.polktaxes.com',
    'www.property-appraiser.org',
    'www.putnamcountytaxcollector.com',
    'www.qpublic.net',
    'www.sarasotaclerk.com',
    'www.sarasotataxcollector.gov',
    'www.sc-pa.com',
    'www.scpafl.org',
    'www.seminoleclerkfl.gov',
    'www.sjcpa.gov',
    'www.sjctax.us',
    'www.srctc.com',
    'www.ssa.gov',
    'www.sumterclerk.com',
    'www.sumterpa.com',
    'www.sumtertaxcollector.com',
    'www.suwgov.org',
    'www.taxcollector.com',
    'www.taylorclerk.com',
    'www.taylorcountytaxcollector.com',
    'www.tcslc.com',
    'www.unioncountytaxcollector.com',
    'www.wakullatax.com',
    'www.waltontaxcollector.com',
    'www.washingtonclerk.com',
    'www.washingtoncountytaxcollector.com',
    'www2.miamidadeclerk.gov',
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
    expect(html).toContain('<details class="sidebar-resource-group" name="sidebar-resource-accordion">');
    expect(html).toContain('<summary class="nav-section-label sidebar-resource-summary">Pinellas County</summary>');
    expect(html).not.toContain('<details class="sidebar-resource-group" name="sidebar-resource-accordion" open>');
  });

  test('accordion sections share a name so opening one collapses the others', () => {
    // <details> elements that share a `name` form a native, mutually-exclusive
    // accordion group -- the browser closes any open sibling when one opens,
    // with no JS required.
    const html = resourcesPanelHTML(groupsForCircuit(6), { esc: s => s, ic: () => '' });
    const openTags = html.match(/<details class="sidebar-resource-group"[^>]*>/g) || [];
    expect(openTags.length).toBeGreaterThan(1);
    for (const tag of openTags) {
      expect(tag).toContain('name="sidebar-resource-accordion"');
    }
  });

  test('includes Pinellas court records and guardian association resources', () => {
    const pinellas = RESOURCE_GROUPS.find(group => group.id === 'pinellas');
    // URL updated to the more specific search path as part of the follow-up
    // that added a Court Records link to every county -- see
    // MILESTONE-53-PROPOSAL.md's Milestone 54 appendix.
    expect(pinellas.links).toContainEqual(expect.objectContaining({ id: 'pinellas-court-records', url: 'https://courtrecords.mypinellasclerk.gov/MyCr/Cases/Search' }));
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
    // 'First Judicial Circuit' is the circuit-level group (Milestone 54's
    // helpful-links wiring); every one of Florida's 20 circuits has one now,
    // not just the Sixth.
    expect(firstHeadings).toEqual(['Escambia County', 'Okaloosa County', 'Santa Rosa County', 'Walton County', 'First Judicial Circuit', 'Florida']);
  });

  // Milestone 54's helpful-links wiring task populated real data for every
  // one of Florida's 67 counties, so there is no longer a county left with
  // an empty stub group -- this is the acceptance check that task's own
  // proposal named for that: the stub count across every circuit is zero.
  test('no circuit produces an empty-stub county group (all 67 counties have real data)', () => {
    for (let circuit = 1; circuit <= 20; circuit++) {
      const stubs = groupsForCircuit(circuit).filter(g => g.scope !== 'statewide' && !g.scope.startsWith('circuit-') && g.links.length === 0);
      expect(stubs, `circuit ${circuit} stub groups`).toEqual([]);
    }
  });

  // Follow-up to the helpful-links wiring: every county gets its own Court
  // Records link (id ending in "court-records", or "court-records-civil"/
  // "court-records-criminal" for Miami-Dade and Seminole, whose clerks split
  // civil/family/probate lookups from criminal ones) in addition to its
  // Clerk/probate-guardianship link -- not a replacement for it.
  test('every non-statewide, non-circuit-level group has a Court Records link', () => {
    const countyGroups = RESOURCE_GROUPS.filter(g => g.scope !== 'statewide' && !g.scope.startsWith('circuit-'));
    expect(countyGroups.length).toBe(67);
    for (const group of countyGroups) {
      const courtRecordsLinks = group.links.filter(l => l.id.includes('court-records'));
      expect(courtRecordsLinks.length, `${group.heading} has at least one Court Records link`).toBeGreaterThan(0);
      for (const link of courtRecordsLinks) {
        expect(link.label, `${group.heading}'s ${link.id} label`).toMatch(/Court Records/);
      }
    }
  });

  test('resourcesPanelHTML renders circuit select dropdown with selected circuit option', () => {
    const html = resourcesPanelHTML(groupsForCircuit(12), { selectedCircuit: 12, esc: s => s, ic: () => '' });
    expect(html).toContain('<select id="sidebar-circuit-select" class="form-select form-select-sm sidebar-circuit-select" data-action="change-circuit">');
    expect(html).toContain('<option value="12" selected>Twelfth Judicial Circuit</option>');
    expect(html).toContain('DeSoto County');
    expect(html).toContain('Manatee County');
    expect(html).toContain('Sarasota County');
    // Milestone 54's helpful-links wiring gave circuit 12 real county data,
    // so its accordions no longer fall back to the empty-stub placeholder.
    expect(html).not.toContain('No county-specific links yet');
    expect(html).toContain('Twelfth Judicial Circuit');
  });

  test('resourcesPanelHTML with no explicit groups derives them from selectedCircuit', () => {
    const html = resourcesPanelHTML(undefined, { selectedCircuit: 1, esc: s => s, ic: () => '' });
    expect(html).toContain('Escambia County');
    expect(html).toContain('<option value="1" selected>First Judicial Circuit</option>');
  });
});
