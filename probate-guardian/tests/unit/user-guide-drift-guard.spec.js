import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// Milestone 56H: a static tripwire over help/index.html.
//
// Eleven simultaneous staleness findings is not eleven mistakes; it is one
// missing gate. test-index-guard.spec.js polices the test index,
// window-bridge.spec.js polices the bridge, native-dialog-guard.spec.js
// polices native dialogs -- and nothing at all failed when the standalone user
// guide described a control the app does not have. Milestones 54 and 55 each
// shipped correctly and each left the guide behind, because nothing in either
// one's gate could notice.
//
// SCOPE, ONE DIRECTION ONLY. This guards against the guide claiming a control
// the app lacks. It does NOT assert the converse -- that every control the app
// ships is documented. The first has a decidable answer against named
// evidence; the second is a completeness judgment with no mechanical answer,
// and a gate built on it is either trivially satisfiable or permanently red.
//
// WHAT THIS IS NOT. It is a source-markup sentinel, not proof that a control
// renders. It checks that the guide's claims still correspond to identifiable
// markup in the source it names. Runtime evidence lives in the Playwright
// contracts, which actually render the app. Where such a contract exists it is
// the real evidence and this file is redundant to it; where none exists
// (Report a Bug and Comment Card have no direct browser coverage today),
// nothing proves the control renders and a green here says only that the
// marker is still in the source. Registering a control does not create runtime
// coverage for it.
//
// It also cannot see: a control the app has and the guide never mentions; a
// behavioral explanation that is wrong while the control exists; a
// conditional validation rule described incorrectly; a stale screenshot; a
// legal or privacy claim that is false but syntactically plausible; or dead
// application markup that still carries a matching identifier. Six of the
// eleven findings sit outside what this can ever catch, which is why 56B-56G
// were hand-verified against the shipped source and why that reading was the
// whole gate for them.

const repo = (p) => fileURLToPath(new URL(`../../${p}`, import.meta.url));

// H4: strip the data: payloads first. help/index.html is ~11 MB almost
// entirely because screenshots are embedded. Stripping keeps the scan fast and
// stops a base64 blob from coincidentally matching a retired term.
function guideText() {
  return readFileSync(repo('help/index.html'), 'utf8').replace(
    /data:image\/[a-z+]+;base64,[A-Za-z0-9+/=]+/g,
    'data:image/stripped',
  );
}

// ── Part 1: the retired-term scan ────────────────────────────────────────
//
// Modelled on native-dialog-guard.spec.js (50G-3): a plain content scan with
// no fixture file, because the target is "this string must not appear", not
// "these occurrences are permitted".
//
// It RATCHETS. A future milestone that retires a control adds its string here
// in the same commit, and the guide can never quietly reacquire it.
const RETIRED_TERMS = [
  // 56E renamed the Help panel's button to "View User Guide"; 56A deleted the
  // orphaned exportHelpGuideAsPDF() that once backed the old label.
  'Download PDF guide',
  // 56C: AO 2019-005 is superseded by AO 2024-025. The guide named the old one
  // while the app's own help text had already stopped naming any number.
  '2019-005',
  // 56B: an Excel export is not a fallback against a lost master password --
  // it is not restorable, and the four Plan filings cannot produce one at all.
  'unencrypted fallback',
  // 56E: the Signature Stamp widget has two tabs, Draw and Upload. 55C removed
  // Type.
  'Draw / Type / Upload',
  // 56B: the app does keep on-device state outside the .sav -- a recovery
  // snapshot, launch preferences, the theme, and cross-tab coordination data
  // carrying the ward name and case number in plain localStorage.
  'no hidden copy elsewhere',
  // Milestone 62 renamed the app "Probate Guardian" -> "Guardian Forms"
  // (item 9). The guide's own prose was already clean (0 hits) when Milestone
  // 66 checked -- this ratchets it. It does NOT catch the old name sitting in
  // an embedded screenshot's pixels, which is a different, larger problem
  // Milestone 66's findings record separately: this scan only ever sees text.
  'Probate Guardian',
];

describe('help/index.html does not reacquire a retired term', () => {
  it.each(RETIRED_TERMS)('never says %s', (term) => {
    const text = guideText();
    const count = text.split(term).length - 1;
    expect(count, `help/index.html still contains the retired term "${term}"`).toBe(0);
  });
});

// ── Part 2: the declared-control check ───────────────────────────────────
//
// Modelled on window-bridge-allowlist.json (42C): a declared surface, policed.
//
// WHY THE LABEL-MATCHING DESIGN WAS REJECTED, recorded so it is not retried.
// An earlier design annotated the guide with a control's visible label and
// asserted that label appeared somewhere in src/. A label can be present for
// reasons that have nothing to do with a control rendering, and this
// repository supplies a verified example: help-content.js:175 and :179 carry
// "Save Backup (.sav)" and "Open Backup (.sav)" as ordinary PROSE inside the
// in-app Help panel. If the Save Backup control were removed from the toolbar
// tomorrow, that prose alone would keep the literal text in src/ and a label
// scan would pass while the control no longer existed. The same hole swallows
// comments, dead code, an unrelated control sharing a word, and a constant no
// longer rendered. It fails in the other direction too: a control that does
// exist can be icon-only with its label in an aria-label, assembled by
// interpolation, entity-encoded, produced by a shared helper, or visually
// renamed while keeping a stable action attribute.
//
// The contract instead: a stable ID in the guide, and the exact marker that
// renders it in the app. That is what makes the ID indirection load-bearing
// rather than decorative -- the guide is free to call the control whatever
// reads best, and the guard still tracks the thing that actually renders it.
//
// EVIDENCE MUST COVER EVERY SURFACE. A control rendered in more than one place
// names every file, and every one must match. "At least one source matches" is
// not acceptable: if the Preview banner's Help button disappeared while the
// dashboard's remained, an at-least-one check stays green and the guide keeps
// promising a control that is gone from the page it documents. Within a file
// the rule is at-least-once, not an exact count -- a shared helper should not
// turn an ordinary refactor red.
//
// KNOWN LIMIT, named rather than papered over: this catches a surface that
// DISAPPEARS, not one that is ADDED. Registering a control freezes the
// surfaces known at registration time; keeping the list current is a human
// obligation, the same one window-bridge-allowlist.json carries. That is not
// hypothetical -- writing this file found two controls rendering on a surface
// the proposal's own table did not list (see dashboard-report-bug below).
const GUIDE_CONTROLS = {
  'signature-tab-draw': {
    label: 'Draw',
    evidence: [{ file: 'src/core/signature/signature-pad.js', pattern: /data-sig-tab="draw"/ }],
  },
  'signature-tab-upload': {
    label: 'Upload',
    evidence: [{ file: 'src/core/signature/signature-pad.js', pattern: /data-sig-tab="upload"/ }],
  },
  'shell-all-filings': {
    label: 'All Filings',
    // Two sites, not three. The dashboard has no All Filings button because it
    // IS All Filings.
    evidence: [
      { file: 'src/core/navigation/router.js', pattern: /data-shell-action="dashboard"/ },
      { file: 'src/legacy-app.js', pattern: /data-shell-action="dashboard"/ },
    ],
  },
  'shell-theme-toggle': {
    label: 'Theme toggle',
    // id=, not data-shell-action=: the id marks the button itself, and the
    // filing shell, the dashboard and the Preview banner each render one.
    evidence: [
      { file: 'src/core/navigation/router.js', pattern: /id="theme-toggle-btn"/ },
      { file: 'src/features/dashboard/index.js', pattern: /id="theme-toggle-btn"/ },
      { file: 'src/legacy-app.js', pattern: /id="theme-toggle-btn"/ },
    ],
  },
  'shell-help': {
    label: '"?" Help',
    // id="help-toggle-btn" rather than data-shell-action="toggle-help": the
    // ACTION is shared with the Help panel's own close "x" (index.html:117),
    // which is a different control. The id matches exactly the three "?"
    // buttons -- filing shell, dashboard, Preview banner.
    evidence: [
      { file: 'src/core/navigation/router.js', pattern: /id="help-toggle-btn"/ },
      { file: 'src/features/dashboard/index.js', pattern: /id="help-toggle-btn"/ },
      { file: 'src/legacy-app.js', pattern: /id="help-toggle-btn"/ },
    ],
  },
  'dashboard-report-bug': {
    label: 'Report a Bug',
    // TWO surfaces, and the proposal's table listed one. The Start New Form
    // page (legacy-app.js's pageInventorySelector()) carries the same feedback
    // pair as the dashboard toolbar. Found by re-deriving this table at
    // execution time instead of trusting the written rows -- which is exactly
    // the "a surface was added" case the limit note above says nothing
    // detects.
    evidence: [
      { file: 'src/features/dashboard/index.js', pattern: /data-feedback-open="bug"/ },
      { file: 'src/legacy-app.js', pattern: /data-feedback-open="bug"/ },
    ],
  },
  'annotation-note-color': {
    label: 'Note color',
    evidence: [{ file: 'src/core/pdf/pdf-annotate.js', pattern: /'Note color'/ }],
  },
  'annotation-note-delete': {
    label: 'Delete note',
    evidence: [{ file: 'src/core/pdf/pdf-annotate.js', pattern: /'Delete note'/ }],
  },
  'sidebar-circuit-select': {
    label: 'Judicial Circuit selector',
    evidence: [{ file: 'src/features/dashboard/resources.js', pattern: /id="sidebar-circuit-select"/ }],
  },
  'guide-view-user-guide': {
    label: 'View User Guide',
    // The Help panel footer button, in the static shell rather than in src/.
    // The proposal flagged this as possibly needing exclusion for lack of a
    // stable marker; it has one.
    evidence: [{ file: 'index.html', pattern: /data-shell-action="export-help"/ }],
  },
  // Milestone 66. Three controls the guide never mentioned before this pass --
  // two are new (64A-1/D16, 64A-2/65A), one is old (57B/63B) but was never
  // documented at all, found only by reading the D-5/Part VI/Part X source
  // directly rather than trusting the guide's prior silence on it.
  'bond-depository-arrangement': {
    label: 'Which applies to this guardianship?',
    // Milestone 67B replaced the Inventory's "Has the surety bond been waived
    // by court order?" (and the Annual family's "Restricted depository?")
    // with one four-state question on both D-4 and Part IX. The label lives
    // in the shared module; each form renders it by that constant.
    evidence: [
      { file: 'src/core/filing/bond-depository.js', pattern: /BOND_DEPOSITORY_QUESTION = 'Which applies to this guardianship\?'/ },
      { file: 'src/features/guardian-inventory/index.js', pattern: /label:BOND_DEPOSITORY_QUESTION/ },
      { file: 'src/features/annual-accounting/index.js', pattern: /label:BOND_DEPOSITORY_QUESTION/ },
    ],
  },
  'guardian-indicate-if-ward': {
    label: 'Indicate if Ward is:',
    // Guardian Inventory D-5 only (65A's own finding: the identically-worded
    // "Indicate if" on Annual/Simplified's certificate pages is a different
    // question -- method of service, not the ward's status -- and is not
    // this control).
    evidence: [{ file: 'src/features/guardian-inventory/index.js', pattern: /reqLabel\('Indicate if Ward is:'\)/ }],
  },
  'service-no-recipients-attestation': {
    label: 'No recipients are required for this certificate',
    // Three surfaces, all required (per the rule above): Initial Inventory
    // D-5, Annual/Final/Trust Part X, Simplified Part VI. Each file declares
    // its own ATTESTATION_57B constant rather than importing a shared one.
    evidence: [
      { file: 'src/features/guardian-inventory/index.js', pattern: /const ATTESTATION_57B\s*=\s*'No recipients are required for this certificate/ },
      { file: 'src/features/annual-accounting/index.js', pattern: /const ATTESTATION_57B\s*=\s*'No recipients are required for this certificate/ },
      { file: 'src/features/simplified-accounting/index.js', pattern: /const ATTESTATION_57B\s*=\s*'No recipients are required for this certificate/ },
      // Milestone 68C: the four Plans render the same control through one
      // shared module -- the words are declared there once and each Plan's
      // page calls its renderer, so the evidence is the declaration plus the
      // call in each form (the 67B bond-question pattern).
      { file: 'src/core/filing/plan-certificate-of-service.js', pattern: /export const ATTESTATION_57B\s*=\s*'No recipients are required for this certificate/ },
      { file: 'src/core/form/plan-certificate-of-service-page.js', pattern: /label: ATTESTATION_57B/ },
      { file: 'src/features/plan-annual/index.js', pattern: /renderPlanCertificateOfServicePage\(/ },
      { file: 'src/features/plan-simplified/index.js', pattern: /renderPlanCertificateOfServicePage\(/ },
      { file: 'src/features/plan-initial/index.js', pattern: /renderPlanCertificateOfServicePage\(/ },
      { file: 'src/features/plan-minor/index.js', pattern: /renderPlanCertificateOfServicePage\(/ },
    ],
  },
  'guardian-c2-claimant-attorney': {
    label: "Claimant's Attorney (if any)",
    // Guardian Inventory C-2 only (64A-2, item 3.4).
    evidence: [{ file: 'src/features/guardian-inventory/index.js', pattern: /optLabel\("Claimant's Attorney \(if any\)"\)/ }],
  },
  'guardian-preparer-as-of-date': {
    label: 'Compilation "as of" date',
    // Guardian Inventory D-2 only (64A-2, item 2.5's second half).
    evidence: [{ file: 'src/features/guardian-inventory/index.js', pattern: /optLabel\('Compilation "as of" date/ }],
  },
  'dashboard-test-system-label': {
    label: 'TEST SYSTEM - Do not use for filing',
    evidence: [{ file: 'src/features/dashboard/index.js', pattern: /TEST SYSTEM - Do not use for filing/ }],
  },
};

// Controls deliberately NOT registered, with the reason. An honest exclusion
// is worth more than a match that passes for the wrong reason.
const EXCLUSIONS = {
  // Per H5, adding a marker to application code is a code change outside this
  // test-only sub-delivery's scope, and falling back to matching its label is
  // what the whole design exists to prevent.
};

// H5: a deliberately narrow regex. Milestone 53D replaced a regex with an AST
// parser, so the contrast is worth stating rather than looking like a lapse.
// This extracts one attribute THIS milestone defines, on a fixed shape, in a
// document this repository controls -- the right tool. The registry's evidence
// patterns are a different matter: they match markup inside real source files
// and inherit the weakness 53D documented, which is precisely why every one is
// an action attribute, id or selector rather than a prose label.
function annotatedIds(text) {
  return [...text.matchAll(/data-app-control="([^"]+)"/g)].map((m) => m[1]);
}

describe('help/index.html declared-control sentinel', () => {
  it('every data-app-control in the guide resolves to a registered id', () => {
    const found = [...new Set(annotatedIds(guideText()))];
    const unknown = found.filter((id) => !(id in GUIDE_CONTROLS));
    expect(unknown, `guide annotates unregistered control id(s): ${unknown.join(', ')}`).toEqual([]);
  });

  it('every registered id is annotated at least once in the guide', () => {
    // Annotations may repeat -- a control is often documented in a section AND
    // in the Quick Reference, which is expected and legal. Registry keys are
    // unique by construction. Nothing is asserted about multiplicity beyond
    // "at least one". A registry entry no claim references is dead weight.
    const found = new Set(annotatedIds(guideText()));
    const orphaned = Object.keys(GUIDE_CONTROLS).filter((id) => !found.has(id));
    expect(orphaned, `registered but never annotated: ${orphaned.join(', ')}`).toEqual([]);
  });

  it.each(Object.entries(GUIDE_CONTROLS))(
    '%s: its marker is present in every file that renders it',
    (id, entry) => {
      expect(Array.isArray(entry.evidence) && entry.evidence.length > 0).toBe(true);
      for (const { file, pattern, expectCount } of entry.evidence) {
        let source;
        try {
          source = readFileSync(repo(file), 'utf8');
        } catch {
          throw new Error(`${id}: named file does not exist: ${file}`);
        }
        const hits = source.match(new RegExp(pattern.source, pattern.flags.includes('g') ? pattern.flags : `${pattern.flags}g`)) || [];
        expect(
          hits.length > 0,
          `${id}: evidence ${pattern} not found in ${file} -- the guide claims this control appears there`,
        ).toBe(true);
        // Opt-in only, for a genuinely unique marker. The default rule is
        // per-file at-least-once: requiring an exact count is brittle for a
        // control rendered from a shared helper and turns an ordinary refactor
        // red for no safety gain.
        if (expectCount !== undefined) {
          expect(hits.length, `${id}: expected ${expectCount} occurrence(s) of ${pattern} in ${file}`).toBe(expectCount);
        }
      }
    },
  );

  it('records its exclusions rather than silently omitting them', () => {
    for (const [id, reason] of Object.entries(EXCLUSIONS)) {
      expect(typeof reason === 'string' && reason.length > 0, `${id} is excluded without a reason`).toBe(true);
      expect(id in GUIDE_CONTROLS, `${id} is both registered and excluded`).toBe(false);
    }
  });
});
