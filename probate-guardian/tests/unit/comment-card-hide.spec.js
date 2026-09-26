import { afterAll, beforeAll, describe, expect, test, vi } from 'vitest';
import fs from 'node:fs';

// Milestone 65D. Milestone 62 hid the Comment Card link (the Pinellas
// Clerk's GovQA form) on the dashboard toolbar only, behind a module-level
// flag. The identical link -- same URL, same label -- also renders on the
// Start New Form page (pageInventorySelector()), which 62 left
// unconditional; Milestone 56H's drift-guard construction had already found
// and recorded both surfaces. 65D closes that gap and puts both surfaces
// behind one shared flag, so a future reinstate is one flip instead of two.
//
// Milestone 70, 70H: the flag is src/core/shell/start-new-form.js's
// SHOW_COMMENT_CARD_LINK (it was window's, set by legacy-app.js), and both
// renderers are imported; each takes the flag as an optional argument, so
// the spec renders both states without flipping a const.

const read = (rel) => fs.readFileSync(new URL(`../../${rel}`, import.meta.url), 'utf8');

describe('Milestone 65D: one shared flag', () => {
  test('start-new-form.js exports it, off, and the dashboard imports that one', () => {
    expect(read('src/core/shell/start-new-form.js')).toMatch(/export const SHOW_COMMENT_CARD_LINK = false;/);
    expect(read('src/features/dashboard/index.js')).toMatch(/import \{ SHOW_COMMENT_CARD_LINK \} from '\.\.\/\.\.\/core\/shell\/start-new-form\.js';/);
  });
});

describe('Milestone 65D: Start New Form page (pageInventorySelector) Comment Card link', () => {
  let pageInventorySelector;
  beforeAll(async () => {
    ({ pageInventorySelector } = await import('../../src/core/shell/start-new-form.js'));
  });

  test('hidden by default -- the flag is off', () => {
    const html = pageInventorySelector();
    expect(html).not.toContain('Comment Card');
    expect(html).not.toContain('pinellascountyfl.govqa.us');
    // The other control in the same block is untouched by the gate.
    expect(html).toContain('Report a Bug');
  });

  test('shown when the flag is on -- proves the markup itself, not just the gate, still renders correctly', () => {
    const html = pageInventorySelector({ showCommentCardLink: true });
    expect(html).toContain('Comment Card');
    expect(html).toContain('https://pinellascountyfl.govqa.us/WEBAPP/_rs/(S(ymqkyi4ihgwnngmluraqqkeh))/RequestOpen.aspx?sSessionID=&rqst=23');
  });
});

describe('Milestone 65D: dashboard toolbar reads the same shared flag', () => {
  let dashboardToolbarActionsHTML;

  beforeAll(async () => {
    vi.stubGlobal('window', {});
    ({ dashboardToolbarActionsHTML } = await import('../../src/features/dashboard/index.js'));
  });

  afterAll(() => {
    vi.unstubAllGlobals();
  });

  test('hidden by default -- the flag is off', () => {
    expect(dashboardToolbarActionsHTML()).not.toContain('Comment Card');
  });

  test('shown when the flag is on', () => {
    expect(dashboardToolbarActionsHTML({ showCommentCardLink: true })).toContain('Comment Card');
  });
});
