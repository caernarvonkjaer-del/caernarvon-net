// Device-only acknowledgement gate for the Clerk's current Terms of Use.
// Kept outside case state so it is never persisted in, imported from, or
// exported with a user's .sav file.
export const TERMS_STORAGE_KEY = 'pg.termsAccepted';
export const TERMS_VERSION = '2026-09-15';

export function hasAcceptedCurrentTerms() {
  try {
    return localStorage.getItem(TERMS_STORAGE_KEY) === TERMS_VERSION;
  } catch (error) {
    return false;
  }
}

function setStartupAvailability(available) {
  const startup = document.getElementById('startup-choice-overlay');
  if (!startup) return;
  startup.inert = !available;
  startup.setAttribute('aria-hidden', String(!available));
}

function focusableElements(container) {
  return [...container.querySelectorAll('a[href], button:not([disabled]), input:not([disabled])')]
    .filter((element) => element instanceof HTMLElement && !element.hasAttribute('hidden'));
}

function initializeTermsAcceptance() {
  const overlay = document.getElementById('pg-terms-overlay');
  const checkbox = document.getElementById('pg-terms-agree');
  const continueButton = document.getElementById('pg-terms-continue');
  if (!(overlay instanceof HTMLElement) || !(checkbox instanceof HTMLInputElement) || !(continueButton instanceof HTMLButtonElement)) return Promise.resolve();

  const accepted = hasAcceptedCurrentTerms();
  if (accepted) {
    overlay.classList.remove('show');
    overlay.setAttribute('aria-hidden', 'true');
    setStartupAvailability(true);
    return Promise.resolve();
  }

  document.addEventListener('keydown', (event) => {
    if (!overlay.classList.contains('show')) return;
    if (event.key === 'Escape') {
      // modal-events.js normally closes the topmost .modal-overlay on Escape.
      // This acknowledgement is the explicit exception: it has no dismiss path.
      event.preventDefault();
      event.stopImmediatePropagation();
      return;
    }
    if (event.key !== 'Tab') return;
    const focusable = focusableElements(overlay);
    const first = focusable[0];
    const last = focusable.at(-1);
    if (!first || !last) return;
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  }, true);
  document.addEventListener('focusin', (event) => {
    if (overlay.classList.contains('show') && !overlay.contains(event.target)) checkbox.focus();
  });
  requestAnimationFrame(() => checkbox.focus());

  return new Promise((resolve) => {
    document.documentElement.removeAttribute('data-terms-accepted');
    setStartupAvailability(false);
    checkbox.addEventListener('change', () => { continueButton.disabled = !checkbox.checked; });
    continueButton.addEventListener('click', () => {
      if (!checkbox.checked) return;
      try { localStorage.setItem(TERMS_STORAGE_KEY, TERMS_VERSION); } catch (error) { /* require acknowledgement again next visit */ }
      overlay.classList.remove('show');
      overlay.setAttribute('aria-hidden', 'true');
      document.documentElement.setAttribute('data-terms-accepted', 'true');
      setStartupAvailability(true);
      document.dispatchEvent(new CustomEvent('pg:termsAccepted', { detail: { version: TERMS_VERSION } }));
      resolve();
    });
  });
}

export const termsAcceptanceReady = typeof document !== 'undefined'
  ? initializeTermsAcceptance()
  : Promise.resolve();
