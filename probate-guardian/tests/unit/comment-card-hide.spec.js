import { afterAll, beforeAll, describe, expect, test, vi } from 'vitest';
import { extractLegacyFunction, LEGACY_APP, readRepoSource } from './support/legacy-source-extract.js';

// Milestone 65D. Milestone 62 hid the Comment Card link (the Pinellas
// Clerk's GovQA form) on the dashboard toolbar only, behind a module-level
// flag. The identical link -- same URL, same label -- also renders on the
// Start New Form page (legacy-app.js's pageInventorySelector()), which 62
// left unconditional; Milestone 56H's drift-guard construction had already
// found and recorded both surfaces. 65D closes that gap and puts both
// surfaces behind one shared flag, window.SHOW_COMMENT_CARD_LINK, set once
// in legacy-app.js, so a future reinstate is one flip instead of two.

const ICON_STUB = () => '';
// pageInventorySelector() reads INVENTORY_TYPES.<type>.description for eight
// filing types; a Proxy answers all of them without naming each one.
const INVENTORY_TYPES_STUB = new Proxy({}, { get: () => ({ description: 'x' }) });

function loadPageInventorySelector() {
  const body = extractLegacyFunction('pageInventorySelector');
  // eslint-disable-next-line no-new-func
  return new Function('INVENTORY_TYPES', 'ic', 'SHOW_COMMENT_CARD_LINK', `${body}; return pageInventorySelector;`);
}

describe('Milestone 65D: legacy-app.js sets the shared flag on window', () => {
  test('window.SHOW_COMMENT_CARD_LINK is assigned from the module-scope const', () => {
    const source = readRepoSource(LEGACY_APP);
    expect(source).toMatch(/window\.SHOW_COMMENT_CARD_LINK\s*=\s*SHOW_COMMENT_CARD_LINK/);
  });
});

describe('Milestone 65D: Start New Form page (pageInventorySelector) Comment Card link', () => {
  const factory = loadPageInventorySelector();

  test('hidden when the flag is false', () => {
    const html = factory(INVENTORY_TYPES_STUB, ICON_STUB, false)();
    expect(html).not.toContain('Comment Card');
    expect(html).not.toContain('pinellascountyfl.govqa.us');
    // The other control in the same block is untouched by the gate.
    expect(html).toContain('Report a Bug');
  });

  test('shown when the flag is true -- proves the markup itself, not just the gate, still renders correctly', () => {
    const html = factory(INVENTORY_TYPES_STUB, ICON_STUB, true)();
    expect(html).toContain('Comment Card');
    expect(html).toContain('https://pinellascountyfl.govqa.us/WEBAPP/_rs/(S(ymqkyi4ihgwnngmluraqqkeh))/RequestOpen.aspx?sSessionID=&rqst=23');
  });
});

describe('Milestone 65D: dashboard toolbar reads the same shared flag', () => {
  let dashboardToolbarActionsHTML;

  beforeAll(async () => {
    // Same technique as guardian-inventory-64a1-validation.spec.js: window
    // must exist as an object before this ES module's own top-level
    // `const { ... } = window` destructure runs at import time.
    vi.stubGlobal('window', { ic: ICON_STUB, SHOW_COMMENT_CARD_LINK: false });
    ({ dashboardToolbarActionsHTML } = await import('../../src/features/dashboard/index.js'));
  });

  afterAll(() => {
    vi.unstubAllGlobals();
  });

  test('hidden when window.SHOW_COMMENT_CARD_LINK is false', () => {
    window.SHOW_COMMENT_CARD_LINK = false;
    expect(dashboardToolbarActionsHTML()).not.toContain('Comment Card');
  });

  test('shown when window.SHOW_COMMENT_CARD_LINK is true', () => {
    window.SHOW_COMMENT_CARD_LINK = true;
    expect(dashboardToolbarActionsHTML()).toContain('Comment Card');
    window.SHOW_COMMENT_CARD_LINK = false;
  });
});
