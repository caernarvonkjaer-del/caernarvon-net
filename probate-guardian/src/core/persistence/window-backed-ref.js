// Shared shape for a module-private value mirrored onto `window` for legacy
// classic-script consumers, where the module's own value is the fallback
// once `window`'s copy is defined. See MILESTONE-52-PROPOSAL.md 52D.
export function windowBackedRef(read, write, initial) {
  let _value = initial;
  return {
    get: () => {
      const w = read();
      return w !== undefined ? w : _value;
    },
    set: (v) => {
      _value = v;
      write(v);
    },
  };
}
