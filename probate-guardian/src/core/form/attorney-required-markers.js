// Milestone 71B: the attorney block's required markers follow whether an
// attorney has been started, live, on the Inventory and the Annual, Final,
// Trust and Simplified Accountings -- Milestone 58C's Initial Plan pattern
// (plan-initial/index.js's syncAttorneyEmailRequired()), generalized to a list
// of fields.
//
// A pro se or Guardian Advocate filer opens these pages with no asterisks on
// the attorney fields, because none of them is required. The moment they type
// anything identifying an attorney, the asterisks appear, because from then on
// the whole block is required (a half-entered attorney is worse than none). The
// validators apply the same rule; this only keeps what the page shows in step
// with it as the filer types.
import { isAttorneyStarted } from '../validation/attorney-block.js';
import { getD } from '../state.js';

function inputsFor(container, path) {
  // `input`/`select`/`textarea` only: the local-guidance panel renders
  // jump-to-field BUTTONS carrying the same data-field-path (58C's note).
  return container.querySelectorAll(
    `input[data-field-path="${path}"], input[data-bind="${path}"], input[data-form-path="${path}"], select[data-field-path="${path}"], select[data-bind="${path}"], textarea[data-field-path="${path}"]`,
  );
}

function labelFor(container, input) {
  if (input.id) {
    const byFor = container.querySelector(`label[for="${CSS.escape(input.id)}"]`);
    if (byFor) return byFor;
  }
  return null;
}

/** Sets or clears the required state of each field in `paths`. */
export function syncRequiredMarkers(container, { required, paths }) {
  if (!container) return;
  for (const path of paths) {
    inputsFor(container, path).forEach((input) => {
      if (input.type === 'radio' || input.type === 'checkbox') return;
      if (required) {
        input.setAttribute('data-field-required', 'true');
        input.setAttribute('aria-required', 'true');
      } else {
        input.removeAttribute('data-field-required');
        input.removeAttribute('aria-required');
      }
      const label = labelFor(container, input);
      if (!label) return;
      const mark = label.querySelector('.req');
      if (required && !mark) {
        const span = document.createElement('span');
        span.className = 'req';
        span.textContent = '*';
        label.appendChild(span);
      } else if (!required && mark) {
        mark.remove();
      }
    });
  }
}

/**
 * Keeps `paths`' markers in step with isAttorneyStarted(getD(), engineId) as
 * the filer types. Returns an AbortController; abort it on dispose so the
 * listener never outlives the page (the 40F/40H-A/43G bug class).
 */
export function watchAttorneyRequiredMarkers(container, { engineId, paths, triggerPaths }) {
  const controller = new AbortController();
  const sync = () => syncRequiredMarkers(container, { required: isAttorneyStarted(getD(), engineId), paths });
  const watches = new Set([...(triggerPaths || []), ...paths]);
  window.addEventListener('pg:field-written', (event) => {
    const path = event?.detail?.path;
    if (typeof path === 'string' && (watches.has(path) || [...watches].some((w) => path.startsWith(`${w}.`)))) sync();
  }, { signal: controller.signal });
  sync();
  return controller;
}
