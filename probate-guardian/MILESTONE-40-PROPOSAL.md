# Milestone 40: Delivery Index

## Status

**Planning index only — no delivery is authorized.** The former single
draft has been split into six independently reviewed and approved
deliveries, the same pattern used for Milestone 38. Approval or
implementation of one does not authorize another.

| Delivery | Scope | Status | Proposal |
| --- | --- | --- | --- |
| 40A | Deprecate and remove DOCX export, including its test surface | Ready to scope for implementation | `MILESTONE-40A-PROPOSAL.md` |
| 40B | 4-digit PIN per party for signature stamps | **Withdrawn** — requester chose not to build it (deterrent-only value judged not worth it) | `MILESTONE-40B-PROPOSAL.md` |
| 40C | Validated browser QA/UX remediation (county defaulting, Cover labeling, date-range entry, readiness/export parity, carryover, Plan Initial Q7 validation bug) | Ready to scope for implementation | `MILESTONE-40C-PROPOSAL.md` |
| 40D | Move theme/UI-only preferences from `.sav` app state to `localStorage` | Ready to scope for implementation | `MILESTONE-40D-PROPOSAL.md` |
| 40E | Fix PDF table cells overflowing instead of wrapping multi-line addresses | Ready to scope for implementation | `MILESTONE-40E-PROPOSAL.md` |
| 40F | Unify the duplicate save/autosave/export pipeline (`legacy-app.js` vs. `case-file.js`), fix its false "Last backup" indicator bugs, and remove the inert Tauri desktop scaffolding (filesystem ward-backup, OS-keychain "remember password") | Ready to scope for implementation | `MILESTONE-40F-PROPOSAL.md` |

## How These Ended Up Together

40A and 40B surfaced during `MILESTONE-39-PROPOSAL.md`'s scoping
conversation but belong to neither that milestone's scope nor each
other's: DOCX removal is a deprecation decision, not a PDF/signature
feature, and the party PIN is a general security control, not a
PDF/signature feature either. 40C records the validated browser QA/UX
findings reviewed after Milestone 37. 40D and 40E each surfaced
independently while reviewing unrelated work (the portfolio UI starter
kit, and a live PDF export bug report). 40F surfaced from a requested
review of the autosave feature, which found two complete, independent
implementations of the same save pipeline silently shadowing each other.
None of the six depends on any other; there is no required implementation
order between them.

## Approval

Each proposal is self-contained: its own Status, Goal, Background,
concrete implementation steps, Acceptance Criteria, and Verification
plan. Before implementing any one, obtain explicit approval naming that
delivery, re-check its assumptions against current `master` (several
reference exact file/line locations that may have moved), select tests
through `TEST-INDEX.md`, and follow `AGENTS.md`'s commit and regression
policy. 40B is withdrawn and will not be scoped further.
