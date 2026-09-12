import { describe, it, expect } from 'vitest';
import { computeContentFingerprint, MiniEventBus } from '../../src/core/pdf/pdf-annotate.js';

// Milestone 39-A "Persistence design": the fingerprint is what decides
// whether a stored, previously-annotated PDF is still safe to reapply on
// reload, or must be discarded because the underlying filing content
// changed. It only needs to be sensitive to that content, not
// cryptographically strong.

function fakePdfDocument(pagesText) {
  return {
    numPages: pagesText.length,
    getPage: async (pageNum) => ({
      getTextContent: async () => ({ items: pagesText[pageNum - 1].map((str) => ({ str })) }),
    }),
  };
}

describe('pdf-annotate: computeContentFingerprint', () => {
  it('is stable for the same content across separate calls', async () => {
    const doc = fakePdfDocument([['Guardian Annual Plan'], ['Certification and Signature']]);
    const a = await computeContentFingerprint(doc);
    const b = await computeContentFingerprint(fakePdfDocument([['Guardian Annual Plan'], ['Certification and Signature']]));
    expect(a).toBe(b);
  });

  it('changes when a page\'s text content changes', async () => {
    const before = await computeContentFingerprint(fakePdfDocument([['Ward: Jane Doe']]));
    const after = await computeContentFingerprint(fakePdfDocument([['Ward: John Smith']]));
    expect(before).not.toBe(after);
  });

  it('changes when the page count changes even if shared page text is identical', async () => {
    const onePage = await computeContentFingerprint(fakePdfDocument([['Same text']]));
    const twoPages = await computeContentFingerprint(fakePdfDocument([['Same text'], ['Extra page']]));
    expect(onePage).not.toBe(twoPages);
  });

  it('is insensitive to nothing -- an empty document still produces a fingerprint', async () => {
    const fp = await computeContentFingerprint(fakePdfDocument([]));
    expect(typeof fp).toBe('string');
    expect(fp.length).toBeGreaterThan(0);
  });
});

describe('pdf-annotate: MiniEventBus', () => {
  it('dispatches to registered listeners in registration order', () => {
    const bus = new MiniEventBus();
    const calls = [];
    bus.on('x', () => calls.push('first'));
    bus.on('x', () => calls.push('second'));
    bus.dispatch('x', {});
    expect(calls).toEqual(['first', 'second']);
  });

  it('off() removes a listener so it no longer receives dispatches', () => {
    const bus = new MiniEventBus();
    let count = 0;
    const listener = () => { count += 1; };
    bus.on('x', listener);
    bus.dispatch('x', {});
    bus.off('x', listener);
    bus.dispatch('x', {});
    expect(count).toBe(1);
  });

  it('an AbortSignal passed via options unregisters the listener on abort', () => {
    const bus = new MiniEventBus();
    const controller = new AbortController();
    let count = 0;
    bus.on('x', () => { count += 1; }, { signal: controller.signal });
    bus.dispatch('x', {});
    controller.abort();
    bus.dispatch('x', {});
    expect(count).toBe(1);
  });

  it('passes dispatched data through to the listener', () => {
    const bus = new MiniEventBus();
    let received = null;
    bus.on('x', (data) => { received = data; });
    bus.dispatch('x', { hello: 'world' });
    expect(received).toEqual({ hello: 'world' });
  });
});
