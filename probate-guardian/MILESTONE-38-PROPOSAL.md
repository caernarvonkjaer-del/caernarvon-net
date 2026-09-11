# Milestone 38: Executable Delivery Index

## Status

**Executable plans; runtime unchanged by this documentation pass.** The former
omnibus proposal has been split into four independent deliveries. Each fixes
its code owners, migration behavior, test outcomes, and completion evidence.

| Delivery | Scope | Proposal |
| --- | --- | --- |
| 38A | Simplified guardian schema repair, legacy conflict resolution, party-ID integrity, and Excel capacity/import behavior | `MILESTONE-38A-PROPOSAL.md` |
| 38B | Universal Filing / Clerk Review Readiness cards for all nine filing types | `MILESTONE-38B-PROPOSAL.md` |
| 38C | Neutral dashboard editing focus and unambiguous lifecycle terminology | `MILESTONE-38C-PROPOSAL.md` |
| 38D | Affirmative override of bypassable output-validation blocks | `MILESTONE-38D-PROPOSAL.md` |

## Decisions Corrected During Review

### Output override and the former draft marker

The old 38-8 text proposed an on-screen **Draft — requirements outstanding**
notice and a print-visible draft notice or watermark. That was the “draft
marker” identified during review. It was a proposal requirement, not an
existing mark on saved or printed court output. The current Preview-only
override does display an on-screen `Draft preview` notice, but currently keeps
Print and Save blocked.

That direction is superseded. Milestone 38D now requires an explicit
affirmative acknowledgement to bypass ordinary user-correctable validation
blocks. After acknowledgement, the filing retains its normal Preview, Print,
Save as PDF, Save as Word, and Save as Excel functionality wherever the output
can be generated faithfully. Generated documents receive no draft wording,
watermark, filename change, metadata marker, or reduced-output treatment.
Validation remains failed and visible; acknowledgement does not claim filing
readiness. Technical failures and format-capacity omissions remain
non-bypassable for the affected format.

38D therefore records the settled product decision that an incomplete but
technically faithful court document may leave the application without an
artifact-level draft marker. That risk is not an incidental result of the
typed-preflight implementation; it is the specified behavior.

### Dashboard final state

The old 38-6 requirement for a dashboard **Close Editor** button contradicted
old 38-7's requirement that dashboard entry clear editing focus and show no
such action. Milestone 38C adopts the latter as the final state: dashboard
entry ends editing focus after a safe flush and lock release. Dashboard row
terminology is **Edit**, **Mark Closed**, and **Mark Open**; there is no Close
Editor button on the neutral dashboard.

### Legacy guardian conflicts

Milestone 38A preserves both canonical and legacy address values when they
conflict, blocks export, and requires the user to choose which value becomes
canonical. It does not silently overwrite or discard either value. Legacy-only
values are recovered into blank canonical fields; redundant legacy keys are
removed only after successful persistence.

### Excel populated-row capacity

Milestone 38A extends the capacity contract with a per-entry populated-row
predicate rather than adding a raw `guardians` count to the existing helper.
This prevents blank compatibility rows from producing a false capacity block.
Excel import replaces its three official slots after confirmation while
preserving any legacy overflow rows and their party-ID positions.

### Editing-focus persistence

Milestone 38C defines `activeWardId` as runtime/session editing focus, not
persisted case state. New archives and recovery records do not use it to reopen
an editor. Existing `recentWards` drives explicit Continue Editing history, and
peer-tab state reports an active case only while a filing is actually selected
for editing.

### Readiness pass language

Milestone 38B uses **Automated checks passed; manual review remains** whenever
automatic checks pass but manual or unsupported items remain. New cards follow
the same distinction as the current Plan cards and never turn manual review
into an automatic pass or export block.

### Shared validation identity

Milestones 38B and 38D must use one canonical registry of stable issue IDs for
checks that represent the same validator failure. A blocking automatic
readiness condition references that canonical validation ID; 38D preserves the
same ID through preflight and acknowledgement. Neither delivery may create a
second independently maintained ID namespace for the same underlying check.
Readiness-only manual, unsupported, or non-blocking conditions may retain their
own condition IDs because they have no validation issue counterpart.

## Delivery Order

Execute the independent deliveries in this dependency order: 38A, 38C, 38D
Phase 1, 38B, then 38D Phase 2.

1. 38A closes an existing data-loss boundary and is otherwise isolated.
2. 38C changes editing-session state and should stabilize before 38D binds
   acknowledgement lifetime to filing switches and session transitions.
3. 38D Phase 1 owns the canonical typed validation registry and migrates all
   issue producers. This closes validation-ID ownership; 38B consumes the
   registry and may not define a parallel namespace.
4. 38B adds readiness cards from its completed source inventory and references
   the Phase 1 IDs for automatic blocking conditions.
5. 38D Phase 2 adds revision-bound acknowledgement and unifies output gates
   after readiness mappings can be parity-tested against the typed registry.

38B begins only after 38D Phase 1 exists. This is an explicit code dependency,
not an unresolved design question; it does not couple 38B to 38D Phase 2.

## Execution Status

The discovery and design gates are closed by the executable maps in each
proposal and by `MILESTONE-38B-SOURCE-INVENTORY.md`. Implementation must
re-check named symbols against current `master`; ordinary line movement or a
renamed private helper does not reopen planning. Stop and return for scope
scope review only if a named owner no longer controls the behavior, a listed
invariant cannot be preserved, or a newly found output gate can omit or corrupt
filed data.

| Delivery | Readiness | Closed execution artifact |
| --- | --- | --- |
| 38A | Executable | Exact factory, compatibility-normalization, conflict, persistence, party-ID, and Excel slot map in 38A. |
| 38B | Executable after 38D Phase 1 | Nine-filing condition dispositions and DSHP decision in `MILESTONE-38B-SOURCE-INVENTORY.md`; renderer/host map in 38B. |
| 38C | Executable | Ordered dashboard transition, failure semantics, legacy-read migration, and owner map in 38C. |
| 38D | Executable in two phases | Phase 1 issue registry/producer map and Phase 2 output-gate/revision-state map in 38D. |

## Outcome and Catalogue Contract

Every acceptance criterion must close four outcomes in the delivery report:

1. **Code:** name the changed owner and observable behavior.
2. **Persistence:** state the persisted-shape/migration result, or explicitly
   record `No persisted data-model change`.
3. **Tests:** name the focused tests proving the behavior. Add or modify tests
   only for changed observable behavior or contracts.
4. **Documentation:** update user/developer documentation affected by the
   behavior, or explicitly record `No documentation update required`.

Update `TEST-INDEX.md` only when a test file is added, removed, renamed,
materially repurposed, or changes category/filing scope. Update
`probate-guardian-data-model.csv` whenever persisted shape, meaning, bounds,
defaults, or migration behavior changes, and run `npm run verify:data-model`.
Do not churn either catalogue merely because implementation touched a nearby
module. Each delivery report records the positive update or the explicit
no-update disposition.

Each proposal contains its own acceptance criteria, fixed implementation map,
and focused verification plan. At implementation start, confirm the dependency
order above, re-check named owners against current `master`, select tests
through `TEST-INDEX.md`, and follow `AGENTS.md`'s commit and regression policy.
