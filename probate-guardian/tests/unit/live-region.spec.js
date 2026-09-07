import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

function createMockDocument() {
  const elements = new Map();

  function createElement(tag) {
    const attrs = new Map();
    const children = [];
    const el = {
      tagName: tag.toUpperCase(),
      id: '',
      className: '',
      textContent: '',
      parentNode: null,
      nextSibling: null,
      children,
      setAttribute: (k, v) => attrs.set(k, String(v)),
      getAttribute: (k) => attrs.get(k) || null,
      hasAttribute: (k) => attrs.has(k),
      removeAttribute: (k) => attrs.delete(k),
      appendChild: (child) => {
        child.parentNode = el;
        children.push(child);
        if (child.id) elements.set(child.id, child);
        return child;
      },
      insertBefore: (newChild, refChild) => {
        newChild.parentNode = el;
        newChild.nextSibling = refChild || null;
        const idx = children.indexOf(refChild);
        if (idx >= 0) children.splice(idx, 0, newChild);
        else children.push(newChild);
        if (newChild.id) elements.set(newChild.id, newChild);
        return newChild;
      },
    };
    return el;
  }

  const body = createElement('body');
  elements.set('body', body);

  return {
    body,
    createElement: (tag) => {
      const el = createElement(tag);
      return el;
    },
    getElementById: (id) => elements.get(id) || null,
    _registerElement: (el) => {
      if (el.id) elements.set(el.id, el);
    },
    _reset: () => {
      elements.clear();
      body.children.length = 0;
      elements.set('body', body);
    },
  };
}

describe('live-region', () => {
  let announceStatus;
  let mockDoc;

  beforeEach(async () => {
    vi.useFakeTimers();
    mockDoc = createMockDocument();
    global.window = global;
    global.document = mockDoc;

    const printDoc = mockDoc.createElement('div');
    printDoc.id = 'print-doc-container';
    mockDoc.body.appendChild(printDoc);

    const mod = await import('../../src/core/status/live-region.js');
    announceStatus = mod.announceStatus;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('creates a stable sibling live region before print-doc-container', () => {
    const region = announceStatus('Generating preview…');
    expect(region).toBeDefined();
    expect(region.id).toBe('print-preview-status');
    expect(region.getAttribute('role')).toBe('status');
    expect(region.getAttribute('aria-live')).toBe('polite');

    const printDoc = mockDoc.getElementById('print-doc-container');
    expect(region.nextSibling).toBe(printDoc);

    vi.advanceTimersByTime(60);
    expect(region.textContent).toBe('Generating preview…');
  });

  it('updates priority to assertive on error message', () => {
    const region = announceStatus('Preview failed to render.', { priority: 'assertive' });
    expect(region.getAttribute('role')).toBe('alert');
    expect(region.getAttribute('aria-live')).toBe('assertive');

    vi.advanceTimersByTime(60);
    expect(region.textContent).toBe('Preview failed to render.');
  });
});
