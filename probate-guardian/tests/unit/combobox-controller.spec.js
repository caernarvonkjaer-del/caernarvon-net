import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ComboboxController } from '../../src/core/form/combobox-controller.js';

function createMockElement(id = '', tagName = 'div') {
  const attrs = new Map();
  const listeners = new Map();
  const classList = new Set();
  const style = {};

  return {
    id,
    tagName: tagName.toUpperCase(),
    value: '',
    innerHTML: '',
    style,
    classList: {
      add: (c) => classList.add(c),
      remove: (c) => classList.delete(c),
      contains: (c) => classList.has(c),
    },
    setAttribute: (k, v) => attrs.set(k, String(v)),
    getAttribute: (k) => attrs.get(k) || null,
    hasAttribute: (k) => attrs.has(k),
    removeAttribute: (k) => attrs.delete(k),
    addEventListener: (ev, fn) => {
      if (!listeners.has(ev)) listeners.set(ev, []);
      listeners.get(ev).push(fn);
    },
    dispatchEvent: (event) => {
      const fns = listeners.get(event.type) || [];
      fns.forEach((fn) => fn(event));
    },
    contains: () => false,
    querySelectorAll: () => [],
  };
}

describe('ComboboxController', () => {
  let origDocument;
  let input;
  let dropdown;
  let docListeners;

  beforeEach(() => {
    origDocument = global.document;
    docListeners = new Map();
    global.document = {
      addEventListener: (ev, fn) => {
        if (!docListeners.has(ev)) docListeners.set(ev, []);
        docListeners.get(ev).push(fn);
      },
    };

    input = createMockElement('test-input', 'input');
    dropdown = createMockElement('test-dropdown', 'div');
  });

  afterEach(() => {
    global.document = origDocument;
  });

  it('initializes ARIA attributes on input and dropdown', () => {
    new ComboboxController({ input, dropdown });

    expect(input.getAttribute('role')).toBe('combobox');
    expect(input.getAttribute('aria-autocomplete')).toBe('list');
    expect(input.getAttribute('aria-expanded')).toBe('false');
    expect(input.getAttribute('aria-controls')).toBe('test-dropdown');
    expect(dropdown.getAttribute('role')).toBe('listbox');
  });

  it('filters items case-insensitively', () => {
    const items = [
      { label: 'Miami-Dade' },
      { label: 'Florida' },
      { label: 'Orange' },
      { label: 'Osceola' },
    ];

    const controller = new ComboboxController({ input, dropdown, items });
    const matches = controller.filterItems('or');

    expect(matches.length).toBe(2);
    expect(matches[0].label).toBe('Florida');
    expect(matches[1].label).toBe('Orange');
  });

  it('renders dropdown items HTML and updates aria-expanded', () => {
    const items = [{ label: 'Alpha' }, { label: 'Beta' }];
    const controller = new ComboboxController({ input, dropdown, items });

    controller.filterAndRender('Al');

    expect(dropdown.style.display).toBe('block');
    expect(input.getAttribute('aria-expanded')).toBe('true');
    expect(dropdown.innerHTML).toContain('Alpha');
    expect(dropdown.innerHTML).not.toContain('Beta');
  });

  it('handles Escape key to close dropdown', () => {
    const items = [{ label: 'Alpha' }];
    const controller = new ComboboxController({ input, dropdown, items });

    controller.open();
    expect(controller.isOpen).toBe(true);

    input.dispatchEvent({ type: 'keydown', key: 'Escape', preventDefault: vi.fn() });
    expect(controller.isOpen).toBe(false);
    expect(input.getAttribute('aria-expanded')).toBe('false');
    expect(dropdown.style.display).toBe('none');
  });

  it('selects item and fires onPick callback', () => {
    const onPick = vi.fn();
    const items = [{ label: 'Selected Item' }];
    const controller = new ComboboxController({ input, dropdown, items, onPick });

    controller.selectItem(items[0]);
    expect(input.value).toBe('Selected Item');
    expect(onPick).toHaveBeenCalledWith(items[0]);
    expect(controller.isOpen).toBe(false);
  });
});
