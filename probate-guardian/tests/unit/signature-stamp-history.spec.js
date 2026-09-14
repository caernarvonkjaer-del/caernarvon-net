import { describe, it, expect, beforeEach } from 'vitest';

// party-resolver.js bridges its exports onto `window` at module scope for
// legacy-app.js (a classic script), so the node test environment needs a
// stub before importing it -- the same pattern excel-capacity-issues.spec.js
// and case-file.spec.js already use for this reason.
globalThis.window = globalThis.window || {};

const {
  addSignatureImage, getActiveSignatureImage, getSignatureImageById, listSignatureImages,
} = await import('../../src/core/party-resolver.js');

// Milestone 46A: party.signatureImages is an append-only, versioned store of
// a party's reusable signature stamps. The two invariants below are not
// stylistic -- they are what makes 46B's compound { partyId, imageId }
// reference safe. A filing signed with an old stamp holds a reference to
// that exact entry and must keep rendering that same mark forever, so an
// entry can never be deleted or mutated, and the array can never be trimmed
// to reclaim space. (That is also why Milestone 46's storage answer is
// per-image size limits from 39-B rather than any cap on this array.)

function party(overrides = {}) {
  return { id: 'party-test', signatureImages: [], updatedAt: null, ...overrides };
}

describe('addSignatureImage', () => {
  let p;
  beforeEach(() => { p = party(); });

  it('appends the first stamp as active, with a per-party id starting at 1', () => {
    const created = addSignatureImage(p, 'data:image/png;base64,AAA');
    expect(created.id).toBe(1);
    expect(created.active).toBe(true);
    expect(created.imageData).toBe('data:image/png;base64,AAA');
    expect(typeof created.capturedAt).toBe('string');
    expect(listSignatureImages(p)).toHaveLength(1);
  });

  it('keeps every prior entry when a new active stamp is added -- only the active flag moves', () => {
    const first = addSignatureImage(p, 'first');
    const second = addSignatureImage(p, 'second');
    const third = addSignatureImage(p, 'third');

    expect(listSignatureImages(p)).toHaveLength(3);
    expect(first.imageData).toBe('first');
    expect(second.imageData).toBe('second');
    expect([first.active, second.active, third.active]).toEqual([false, false, true]);
    expect(getActiveSignatureImage(p)).toBe(third);
  });

  it('never lets two entries be active at once, across several changes', () => {
    addSignatureImage(p, 'a');
    addSignatureImage(p, 'b');
    addSignatureImage(p, 'c');
    expect(listSignatureImages(p).filter((e) => e.active)).toHaveLength(1);
  });

  it('an old entry is still retrievable by id after the active stamp changes twice more', () => {
    const old = addSignatureImage(p, 'the-old-mark');
    addSignatureImage(p, 'newer');
    addSignatureImage(p, 'newest');

    // This is the 46B guarantee in miniature: a filing holding
    // { partyId, imageId: 1 } still resolves to the exact original bytes.
    const resolved = getSignatureImageById(p, old.id);
    expect(resolved.imageData).toBe('the-old-mark');
    expect(resolved.active).toBe(false);
  });

  it('scopes ids per party, so two parties both have an entry 1 and an entry 2', () => {
    const other = party({ id: 'party-other' });
    addSignatureImage(p, 'p-one');
    addSignatureImage(p, 'p-two');
    addSignatureImage(other, 'o-one');
    addSignatureImage(other, 'o-two');

    expect(listSignatureImages(p).map((e) => e.id)).toEqual([1, 2]);
    expect(listSignatureImages(other).map((e) => e.id)).toEqual([1, 2]);
    // Which is exactly why a bare imageId is ambiguous and 46B's reference
    // must be compound: entry 2 means different marks for different parties.
    expect(getSignatureImageById(p, 2).imageData).toBe('p-two');
    expect(getSignatureImageById(other, 2).imageData).toBe('o-two');
  });

  it('derives the next id from the max existing id, not the array length', () => {
    // A record arriving from an import (or any legacy shape) may not be
    // densely numbered from 1. Using length would reuse an id and silently
    // collide with an existing filing's reference.
    const imported = party({ signatureImages: [{ id: 7, imageData: 'x', capturedAt: 'x', active: true }] });
    const next = addSignatureImage(imported, 'y');
    expect(next.id).toBe(8);
  });

  it('accepts an explicit capturedAt but never treats it as a filing signature date', () => {
    const created = addSignatureImage(p, 'z', { capturedAt: '2020-01-01T00:00:00.000Z' });
    expect(created.capturedAt).toBe('2020-01-01T00:00:00.000Z');
    // Nothing in the entry carries a filing-level signature date -- that is
    // always a per-document field, entered fresh on each filing.
    expect(created).not.toHaveProperty('signatureDate');
  });

  it('refuses to create an entry with no image data rather than storing an empty stamp', () => {
    expect(() => addSignatureImage(p, '')).toThrow(/imageData/);
    expect(listSignatureImages(p)).toHaveLength(0);
  });

  it('exposes no delete path at all', async () => {
    const mod = await import('../../src/core/party-resolver.js');
    const names = Object.keys(mod).filter((k) => /signatureimage/i.test(k));
    expect(names.some((n) => /remove|delete|clear/i.test(n))).toBe(false);
  });
});

describe('getActiveSignatureImage', () => {
  it('returns null for a party that has never captured a stamp', () => {
    expect(getActiveSignatureImage(party())).toBeNull();
  });

  it('tolerates a party record with no signatureImages array at all', () => {
    expect(listSignatureImages({ id: 'legacy' })).toEqual([]);
    expect(getActiveSignatureImage({ id: 'legacy' })).toBeNull();
  });
});
