// Milestone 63D. The preparer-authorization note shown at the top of every page
// where a signature can be attached, on every filing type.
//
// It is written for the person operating the app, who is not necessarily the
// person signing: attaching a signature on someone else's behalf requires that
// person's actual authorization. Milestone 40H-E added it beside each page's
// sworn statement, as seven hand-typed copies; that put it on 6 of the 16 signing
// pages (three below the fold), on none of the ten attorney/preparer/certificate
// pages, and on one page that captures no signature. The rule is "where a
// signature is attached", so every such page renders this helper as the first
// thing under its <h1>, and no other page does.
//
// tests/unit/preparer-note.spec.js derives the signing pages from source and
// enforces that; tests/e2e/preparer-note-placement.spec.ts proves it rendered.
// This is display text for the screen only -- it is never printed into a filing
// (the same spec asserts no pdf-model.js mentions it).
//
// A separate, dependency-free module rather than a function in
// signature-state-control.js: that module pulls in the party resolver and the
// dialogs, which a plain unit test cannot import.

export const PREPARER_NOTE_TEXT =
  "Preparer's note: Before attaching any signature on this page, confirm you have that party's actual legal authorization to sign on their behalf. Do not sign for a party you have not been authorized to sign for.";

export function preparerNoteHTML() {
  return `<div class="preparer-note">${PREPARER_NOTE_TEXT}</div>`;
}
