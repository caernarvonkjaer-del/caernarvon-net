// A date field whose year is implausible -- before 1900, or more than 30 years
// ahead -- is cleared once the filer leaves it. Moved from legacy-app.js, which
// added the listener as it loaded, by Milestone 70's 70K; installed once by
// startGuardianForms().
//
// Native date inputs treat any 1-4 digit year as a "complete", non-empty
// value, so nothing else in the app ever sees this as invalid or unanswered.
// One delegated listener on `document`, registered once rather than per
// input, so it covers every date field regardless of which of the app's
// several wiring conventions that field uses -- catching this everywhere
// without touching each of the ~50 individual date inputs.
// MUST be 'focusout', not 'change': Chrome fires 'change' on a date input
// the instant the year segment LOOKS complete, including every transient
// state while the user is still typing it digit-by-digit (typing "2026"
// passes through "0002", "0020", "0202" first). Hooking 'change' here
// blanked the field mid-keystroke on that transient "0002", which the
// browser's date control then treated as a fresh, empty field and
// restarted segment focus from the month -- so the rest of what the user
// was typing landed in the wrong segments (reported: typing "05102026"
// kept "0510" but the year ended up "0026" with month/day scrambled).
// 'focusout' only fires once the user actually leaves the control -- HTML5
// date inputs keep focus on the whole control while moving between their
// internal month/day/year segments, so this never fires mid-entry, only
// once a real (if implausible) value has actually been committed.
// Bubbles on its own (unlike 'blur'), so no capture flag is needed.
// Re-dispatches 'change' after clearing so bindForms()'s own listener
// (and anything else watching 'change') sees the correction and doesn't
// leave the blanked-out DOM value out of sync with the open filing.
export function installDateYearGuard({ signal } = {}) {
  document.addEventListener('focusout', (e) => {
    const el = e.target;
    if (!el || el.tagName !== 'INPUT' || el.type !== 'date' || !el.value) return;
    const m = el.value.match(/^(\d{4})-\d{2}-\d{2}$/);
    if (m && (+m[1] < 1900 || +m[1] > new Date().getFullYear() + 30)) {
      el.value = '';
      el.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }, { signal });
}
