# Milestone 40B: Party PIN for Signature Stamps

## Status

**Blocked — not a workable implementation plan yet.** This is scoped as far
as it can go without requester decisions on what the PIN is actually meant
to protect against. Approving this delivery number does not mean approving
an implementation; three open decisions below must be answered first, and
the plan may change shape once they are. Approval of another Milestone 40
delivery does not authorize this work.

## Goal

Raised alongside `MILESTONE-39-PROPOSAL.md`'s 39-D (reusable, versioned
per-party signature stamp): require a 4-digit PIN per party before a
signature stamp can be created or reused.

## Proposed Mechanic (pending the decisions below)

- **Creating** a signature image for a party is mandatory-gated on that
  party having a PIN. If the party has none yet, capturing their first
  signature image (39-D's `party.signatureImages`) must also set one at
  the same time — a party cannot end up with a stored signature image and
  no PIN.
- **Applying** a stored stamp to a new filing requires the PIN to be
  entered at that moment, every time — not only at initial creation.

## Why This Can't Be Scoped Further Yet: What the PIN Actually Protects Against

This app already encrypts the whole case file behind a master password
(`encryptJSON`, per `src/core/persistence/`). A 4-digit PIN (10,000
possible values) stored anywhere inside that same encrypted payload adds
essentially no protection against anyone who can already decrypt the
file — they could read or patch the stored data directly regardless of the
PIN check. The realistic threat model is narrower: a deterrent within an
already-unlocked, shared session (for example, a firm's office where
several staff share one unlocked device or browser tab), not a
cryptographic control against a determined attacker with file access.

If that deterrent-only purpose is correct, the PIN can be stored as a
simple hash (not plaintext) for basic accident-resistance, and the UI copy
must not imply a stronger guarantee than that. If a stronger guarantee is
actually wanted, this is a materially different and larger feature than "a
4-digit PIN" — likely a second authentication factor, not a party
attribute — and should be scoped as such rather than retrofitted onto this
shape.

## Open Decisions Required Before Implementation

1. **Confirm the threat model above** (shared-session deterrent, not a
   cryptographic control) is actually what's wanted, before any storage
   design is picked.
2. **Where does PIN entry/creation live?** On the party record itself
   (wherever attorney/preparer/guardian contact info is already edited),
   or inline the first time a signature image is captured?
3. **What happens if the PIN is forgotten?** Is there a recovery path, or
   does losing it mean the party's stored stamp(s) become permanently
   unreusable (a new party record, or a support-mediated reset)?
4. **Does a wrong entry get rate-limited or locked out?** A 4-digit space
   is guessable within a single unlocked session without some throttle.

## Next Step

Answer the four questions above (or redirect the feature's shape
entirely) before this delivery is re-scoped into an implementable plan
with concrete file references, acceptance criteria, and a verification
plan, matching the other Milestone 40 deliveries.
