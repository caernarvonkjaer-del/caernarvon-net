import { describe, expect, test, beforeEach, afterEach, vi } from 'vitest';
import { setStatus, scheduleStatusClear, clearStatusNow } from '../../src/core/ui/transient-status.js';

// The filer-visible bug this guards: export a workbook, see "✓ Exported!",
// and watch it disappear a moment later with no sign the file was written.
//
// Each export and import used to end with its own
// `setTimeout(() => el.textContent = '', 3000)` and nothing cancelled it, so
// the first action's timer was still armed when a second one finished three
// seconds later and wiped its message. tests/e2e/vendor-loader-retry.spec.ts
// catches exactly one instance of that (a retry after a blocked export). These
// cover the rule itself, which four call sites across the three filing
// families now depend on.

/** A stand-in for the status <span>; only textContent is ever touched. */
function statusEl() {
  return { textContent: '' };
}

describe('transient status lines', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  test('a scheduled clear empties the line when it comes due', () => {
    const el = statusEl();
    setStatus(el, '✓ Exported!');
    scheduleStatusClear(el);
    expect(el.textContent).toBe('✓ Exported!');
    vi.advanceTimersByTime(2999);
    expect(el.textContent).toBe('✓ Exported!');
    vi.advanceTimersByTime(1);
    expect(el.textContent).toBe('');
  });

  // The regression itself. A second action's *progress* message is what has to
  // disarm the first action's clear -- by the time the second action succeeds,
  // the stale timer may already have fired.
  test("a later write cancels an earlier action's pending clear", () => {
    const el = statusEl();
    setStatus(el, '❌ blocked');
    scheduleStatusClear(el);          // first attempt arms a clear at T+3000

    vi.advanceTimersByTime(500);
    setStatus(el, 'Preparing Excel export…');  // retry starts
    vi.advanceTimersByTime(500);
    setStatus(el, '✓ Exported!');              // retry succeeds at T+1000

    // T+3000 arrives: the first attempt's timer must be gone.
    vi.advanceTimersByTime(5000);
    expect(el.textContent, 'the retry\'s confirmation was wiped by the first attempt\'s timer').toBe('✓ Exported!');
  });

  test('a rescheduled clear replaces the earlier one rather than adding to it', () => {
    const el = statusEl();
    setStatus(el, 'first');
    scheduleStatusClear(el);
    vi.advanceTimersByTime(2000);
    setStatus(el, 'second');
    scheduleStatusClear(el);

    // The first clear would have fired 1000ms from here; the second is 3000.
    vi.advanceTimersByTime(1500);
    expect(el.textContent).toBe('second');
    vi.advanceTimersByTime(1500);
    expect(el.textContent).toBe('');
  });

  // guardian-inventory's print.js and excel.js share #export-status. print.js
  // clears it outright when a PDF finishes; that must not leave the Excel
  // export's timer armed against whatever is written next.
  test('an immediate clear also disarms a pending one', () => {
    const el = statusEl();
    setStatus(el, '✓ Exported!');
    scheduleStatusClear(el);
    clearStatusNow(el);
    expect(el.textContent).toBe('');

    setStatus(el, 'Generating PDF…');
    vi.advanceTimersByTime(5000);
    expect(el.textContent).toBe('Generating PDF…');
  });

  test('timers are tracked per element, not globally', () => {
    const a = statusEl();
    const b = statusEl();
    setStatus(a, 'export');
    scheduleStatusClear(a);
    setStatus(b, 'import');           // must not disarm a's clear
    vi.advanceTimersByTime(3000);
    expect(a.textContent).toBe('');
    expect(b.textContent).toBe('import');
  });

  // Every caller previously guarded with `if(stat)`; the helpers absorb that,
  // so a page that does not render the line is not a crash.
  test('a missing element is accepted and ignored', () => {
    expect(() => setStatus(null, 'x')).not.toThrow();
    expect(() => scheduleStatusClear(null)).not.toThrow();
    expect(() => clearStatusNow(undefined)).not.toThrow();
  });
});
