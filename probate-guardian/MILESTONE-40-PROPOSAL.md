# Milestone 40: Deprecations and Party-Record Security Controls

## Status

**Draft — candidate item list, not yet scoped or approved for execution.**
Two unrelated items landed here because both surfaced during
`MILESTONE-39-PROPOSAL.md`'s scoping conversation but neither belongs in
that milestone's own scope: DOCX export removal is a deprecation decision,
not a PDF/signature feature, and the party PIN is a general security
control, not a PDF/signature feature either. Nothing here is authorized
for implementation.

## Candidate Items

### 1. Deprecate DOCX export; remove the code

`src/core/docx/docx-engine.js` and its "Save as Word" export path are
deprecated. The code is to be removed as part of this milestone, not kept
around as a maintained fallback format. This supersedes the DOCX-related
notes in `MILESTONE-39-PROPOSAL.md` (39-B's signature-image-in-DOCX
fallback, and the "Related, Out-of-Scope Work" DOCX-fidelity item) — once
this milestone removes the feature, there's nothing left to design a
fallback for. Until this milestone actually lands, DOCX export keeps
working as it does today (including 39-B's interim text-only fallback for
signature stamps, which only matters for whatever window remains before
removal).

Removal isn't just deleting `docx-engine.js` — checked `TEST-INDEX.md`
directly, and DOCX has its own real test surface: `docx-engine.spec.js`
(unit tests for DOCX generation), `docx-extract.ts` (an e2e support
helper), and a `docx-xlsx-export` test category that currently bundles
DOCX and Excel export together. `docx-extract.ts` is **not** safe to
delete outright — confirmed it's also imported by `xlsx-extract.ts`,
`output-semantics.artifact.spec.ts`, and `filing-identity.contract.spec.ts`,
none of which are DOCX-specific. Removal must delete `docx-engine.spec.js`,
keep `docx-extract.ts` (or extract whatever cross-cutting piece those
other three files actually need from it) rather than deleting it wholesale,
and split or rename the `docx-xlsx-export` category so Excel-export
coverage isn't accidentally described as covering DOCX after DOCX no
longer exists. Any UI entry point for "Save as Word" (buttons, menu items)
needs its own e2e coverage removed or updated, not just the generation
code.

### 2. 4-digit PIN per party, required to create or apply a signature stamp

Raised alongside `MILESTONE-39-PROPOSAL.md`'s 39-D (reusable, versioned
per-party signature stamp): each party record (`party-resolver.js`) may
have a 4-digit PIN assigned. Two gates, both required:

- **Creating a signature image for a party is mandatory-gated on that party
  having a PIN.** If the party has no PIN yet, capturing their first
  signature image (39-D's `party.signatureImages`) must also set one at the
  same time — a party cannot end up with a stored signature image and no
  PIN.
- **Applying a stored stamp to a new filing requires the PIN to be entered
  at that moment**, every time — not only at initial creation.

### Open question: what this PIN actually protects against

This app already encrypts the whole case file behind a master password
(`encryptJSON`, per `src/core/persistence/`). A 4-digit PIN (10,000
possible values) stored anywhere inside that same encrypted payload adds
essentially no protection against anyone who can already decrypt the file —
they could read or patch the stored data directly regardless of the PIN
check. So the realistic threat model here is narrower: a deterrent within
an already-unlocked, shared session (for example, a firm's office where
several staff share one unlocked device or browser tab), not a
cryptographic control against a determined attacker with file access.

Before this is scoped for real, confirm that reading is the intended
purpose — if so, the PIN can be stored as a simple hash (not plaintext) for
basic accident-resistance, and the UI copy/design should not imply a
stronger guarantee than that. If a stronger guarantee is actually wanted,
that's a materially different (and larger) feature than "a 4-digit PIN."

### Design questions still open

- Where is the PIN entry/creation UI — on the party record itself (wherever
  attorney/preparer/guardian contact info is already edited), or inline the
  first time a signature image is captured?
- What happens if the PIN is forgotten — is there a recovery path, or does
  losing it mean the party's stored stamp(s) become permanently
  unreusable (a new party record, or a support-mediated reset)?
- Does a wrong PIN entry get rate-limited or lock out after repeated
  failures, given the small 4-digit space is otherwise guessable within a
  session?

## Next Step

Resolve the threat-model and design questions above, then scope this as a
real, execute-ready plan the same way `MILESTONE-39-PROPOSAL.md`'s
sub-milestones were — this draft is a placeholder for the idea, not a spec.
