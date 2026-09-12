# Milestone 40B: Party PIN for Signature Stamps

## Status

**Withdrawn — will not be implemented.** Presented as an explicit choice
against dropping the feature entirely; the requester chose to drop it. The
realistic threat model (a shared-session deterrent, not a real security
boundary, since the file is already encrypted behind a master password —
see below) was judged not worth building for. This delivery is closed; no
further scoping or implementation should occur under 40B unless a future
request reopens it with a materially different shape (e.g. a real
second-factor control rather than a party attribute).

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

## Decision (Resolved)

Presented to the requester as an explicit choice among: (1) build it as a
shared-session deterrent only, hashed, with UI copy that makes no stronger
claim; (2) scope a materially larger real authentication control instead;
or (3) drop the feature. The requester chose to drop it — along with the
three dependent implementation questions (PIN entry location, forgotten-PIN
recovery, rate-limiting), which are now moot.

## Next Step

None. This delivery is closed.
