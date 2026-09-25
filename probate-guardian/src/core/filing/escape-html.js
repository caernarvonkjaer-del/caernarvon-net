// Milestone 52E: the one HTML-escaper for filing-surface renderers.
//
// readiness-card.js and output-advisories.js each had their own copy --
// behaviorally identical (all five of &<>"' escaped), written two different
// ways: a chained .replace() in one, a single regex with a character map in
// the other. This is the character-map form, kept verbatim.
//
// It lives in its own module rather than in either caller. MS52's proposal
// suggested output-advisories.js should own it on the grounds that
// readiness-card.js already imports from it -- that turned out to be false
// (readiness-card.js imports only readiness-config.js and county-guidance.js),
// so adopting that plan would have created a new and semantically odd
// dependency from a card renderer to an advisories renderer purely to borrow
// a string utility.
//
// Not the only escaper in the codebase, and deliberately not a consolidation
// of all of them: form-fields.js's esc() does NOT escape apostrophes (see the
// note at its definition), and dialogs.js, signature-state-control.js and
// pdf-preview.js each carry their own. Only the two that were already
// byte-equivalent in behavior were merged here.
export function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[character]));
}

// esc(): the escaper legacy-app.js's renderers and the filing pages use,
// moved here from legacy-app.js by Milestone 70's 70B. Not escapeHtml(): it
// prints every falsy value -- 0 and false included -- as an empty string,
// where escapeHtml() prints "0" and "false". Kept distinct because the pages
// that use it rely on that.
export function esc(s){return String(s||'').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/'/g,'&#39;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
