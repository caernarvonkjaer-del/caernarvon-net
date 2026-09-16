// Milestone 52L: the fake-DOM primitives two specs had each rebuilt.
//
// These tests run in plain Node with no jsdom, so anything touching the DOM
// hand-rolls just enough of an element to drive the code under test.
// form-contract.spec.js's createMockInput() and live-region.spec.js's
// createMockDocument() had each written their own attrs-Map-backed attribute
// methods, character for character.
//
// Only what genuinely overlapped is shared. The two mocks are otherwise
// nothing alike -- one is an <input> with value/dataset/type/checked and a
// classList, the other a tree node with tagName/children/appendChild/
// insertBefore and no classList at all -- so this module deliberately does
// NOT export a single "mock element" shape for both to conform to. Each spec
// keeps building the object its own subject needs and spreads these in.
//
// Behavior is preserved verbatim, including getAttribute()'s `|| null`, which
// reports an attribute explicitly set to the empty string as absent. That is
// not what a real DOM does; it is what both specs have always done, and
// changing it here would alter what they assert.

/** attrs-Map-backed setAttribute/getAttribute/hasAttribute/removeAttribute. */
export function attributeBag() {
  const attrs = new Map();
  return {
    setAttribute: (k, v) => attrs.set(k, String(v)),
    getAttribute: (k) => attrs.get(k) || null,
    hasAttribute: (k) => attrs.has(k),
    removeAttribute: (k) => attrs.delete(k),
  };
}

/** Set-backed classList with the three methods the form-contract mock uses. */
export function classListBag(initial = []) {
  const classes = new Set(initial);
  return {
    add: (c) => classes.add(c),
    remove: (c) => classes.delete(c),
    contains: (c) => classes.has(c),
  };
}
