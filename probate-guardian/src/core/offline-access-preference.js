// Milestone 62: whether the filer has already answered the "Offline access
// available" notice (pwa-ui.js) on this device. A per-DEVICE display
// preference in localStorage, like theme-preference.js -- not case data.
//
// Stored value is the answer itself, so the notice can tell "asked and
// declined" from "asked and accepted":
//   'accepted'  -- clicked Download.
//   'dismissed' -- clicked Dismiss on the offer.
// Absent (never answered, or site data was cleared) means ask.
//
// pwa-ui.js is a top-level-side-effect module that needs a live document, so
// the decision lives here where it can be unit-tested.

export const OFFLINE_ACCESS_ANSWER_KEY = 'pg-offline-access-answered';
export const OFFLINE_ACCESS_ANSWERS = ['accepted', 'dismissed'];

/** The stored answer, or null when none is stored or storage is unavailable. */
export function readOfflineAccessAnswer() {
  try {
    if (typeof localStorage === 'undefined') return null;
    const raw = localStorage.getItem(OFFLINE_ACCESS_ANSWER_KEY);
    return OFFLINE_ACCESS_ANSWERS.includes(raw) ? raw : null;
  } catch (error) {
    return null;
  }
}

/** Records an answer. Returns false if invalid or storage refused. */
export function writeOfflineAccessAnswer(answer) {
  if (!OFFLINE_ACCESS_ANSWERS.includes(answer)) return false;
  try {
    if (typeof localStorage === 'undefined') return false;
    localStorage.setItem(OFFLINE_ACCESS_ANSWER_KEY, answer);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Whether to show the "Offline access available" offer.
 *
 * `status` is the service worker's GET_OFFLINE_STATUS reply. Nothing to offer
 * when offline access is unavailable or already ready for this version.
 * Otherwise: never answered -> ask. Answered 'dismissed' -> stay quiet. Answered
 * 'accepted' -> ask again, because that is when it becomes relevant: the filer
 * wanted offline access but this version's pack isn't downloaded (a new
 * version shipped, or the earlier download didn't finish).
 */
export function shouldOfferOfflineAccess(status) {
  if (!status || !status.available || status.ready) return false;
  return readOfflineAccessAnswer() !== 'dismissed';
}
