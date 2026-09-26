import { beforeEach, describe, expect, test } from 'vitest';
import { currentHelpContext, updateHelpContext } from '../../src/core/help/help-panel.js';
import { setActiveInventoryType, setCaseFile } from '../../src/core/state.js';

// Milestone 70, 70H finding. The Help panel's context: the page a filer is on
// chooses the help it shows. updateHelpContext() took no argument, so the
// router's updateHelpContext('inventory-select') was ignored and Help on the
// Start New Form page showed the dashboard's welcome instead of the text
// written for choosing a form (HELP_CONTENT['inventory-select']).

describe('the Help panel shows the help for the page it is on', () => {
  beforeEach(() => {
    setCaseFile({ wards: [], activeWardId: null });
    setActiveInventoryType(null);
  });

  test("a page that names its help gets it -- the Start New Form picker's", () => {
    updateHelpContext('inventory-select');
    expect(currentHelpContext).toBe('inventory-select');
  });

  test('with nothing named and no filing open, the welcome', () => {
    updateHelpContext();
    expect(currentHelpContext).toBe('default');
  });

  test("with nothing named, the open filing's form decides", () => {
    setCaseFile({ wards: [{ wardId: 'w1', inventoryType: 'planAnnual' }], activeWardId: 'w1' });
    setActiveInventoryType('planAnnual');
    updateHelpContext();
    expect(currentHelpContext).toBe('plan-annual');
  });

  test('a name the Help text does not have is not taken', () => {
    updateHelpContext('no-such-help');
    expect(currentHelpContext).toBe('default');
  });
});
