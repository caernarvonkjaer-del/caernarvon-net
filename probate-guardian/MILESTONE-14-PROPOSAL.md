# Milestone 14: Role-Aware Dashboard Triage

## Goal

Add role-aware caseload triage through a pure dashboard view-model layer.

Do not migrate existing wards automatically. Do not duplicate computed filing data. Do not use mock data in production. Production rendering must use parsed `.sav` state, primarily `guardianData.wards`, plus browser-local dashboard preferences.

Preserve strict CSP, lazy dashboard loading, `mount()`/`dispose()`, current declarative actions, and `.sav` compatibility.

## Implementation Discipline

Before editing code, verify that this file is the active approved scope and confirm:

1. Production dashboard rendering stays bound to real `.sav` state, not mock data.
2. 14A has zero persistence or schema changes.
3. Workflow status and assignment persistence happen only in 14C after explicit user action.
4. Do not bump `SAV_FORMAT_VERSION`; stop and request renewed sign-off if implementation reveals that a bump is necessary.
5. Existing dashboard action names and behavior remain unchanged; new controls may add delegated `data-dashboard-action` values.
6. CSP and no-inline-handler rules remain intact.
7. Tests will cover view-model projection, preferences, `.sav` compatibility, role rendering, sorting, escaping, and mount/dispose behavior.

Work in slices and checkpoint after each family of handlers or phase. Each checkpoint must report:

- Files touched
- Behavior changed
- Tests run and results
- Any deferrals or newly discovered risks

Phase gates:

- 14A must pass projection tests before 14B begins.
- 14B must prove preferences never mutate wards or enter `.sav` before 14C begins.
- 14C persistence work begins only after the 14A and 14B gates pass.

## Data Ownership

| Category | Fields |
| --- | --- |
| Derived from wards | Identity, display type, case number, archive state, total, progress, statutory deadline, deadline bucket, recency, filing contacts |
| Optional ward persistence | Explicit user-tracked filing status and operational assignee |
| Browser preference | Dashboard role, supervising-professional filter, onboarding dismissal |
| Rejected | Persisted progress, persisted statutory deadline, generated professional IDs, automatic hydration defaults |

Browser preferences must never enter `.sav` data.

### Persisted Ward Shape

Persist metadata only after explicit user action:

```js
ward.dashboardWorkflow = {
  status: 'pending-court-review',
  assigneeName: 'Professional Name'
};
```

Both properties are optional.

Valid persisted statuses:

- `not-started`
- `draft`
- `ready-to-file`
- `pending-court-review`
- `disapproved-needs-correction`
- `approved`

`auto` is a UI command, never a persisted value. Selecting it removes `status`. Remove `dashboardWorkflow` when both properties are absent.

Validate persisted values when reading. Invalid values must fall back without rewriting the ward.

### Filing Contacts

Normalize all usable contacts into an array:

```js
filingContacts: [
  {
    name: 'Professional Name',
    role: 'attorney',
    filterKey: 'professional name'
  }
]
```

Derivation must accommodate:

- Guardian Inventory: `preparer.name`, `attorney.name`, `attorneyForGuardian`
- Simplified Accounting: `attorney`
- Annual/final/trust Accounting: `preparer.name`, `attorney`
- Initial Plan: `attorneyName`, `attorney_name`
- Annual Plan: `attorney`
- Minor Plan: `preparer_name`, `attorney_name`
- Simplified Plan: no professional contact field

Deduplicate matching names while retaining distinct roles where useful.

A filing contact is not an assignee. Assigned/unassigned filtering must use only explicit `dashboardWorkflow.assigneeName`.

Normalized keys are for filtering only and are not durable identities.

## View Model

Add:

`probate-guardian/src/features/dashboard/view-model.js`

The module must be pure. It must not read the DOM, localStorage, `window`, or mutable global state.

Suggested entry point:

```js
projectDashboardWard(ward, {
  displayType,
  total,
  progress,
  today
});
```

`today` uses local calendar-day semantics and must be injectable for deterministic tests.

Each projection exposes at least:

```js
{
  wardId,
  wardName,
  inventoryType,
  displayType,
  caseNumber,
  isArchived,
  total,
  progressPercent,
  deadlineDate,
  deadlineBasis,
  deadlineBucket,
  isDeadlineActionable,
  workflowStatus,
  workflowSource,
  filingContacts,
  assigneeName,
  assigneeKey,
  lastModified,
  priorityRank
}
```

For Minor Plans, display case identification may fall back through `caseNumber`, `ucn`, and `ref` without altering source data.

### Workflow Fallback

Status precedence:

1. Archived wards return presentation status `closed` with source `presentation`.
2. A valid explicit status returns with source `explicit`.
3. Progress of 100% returns `ready-to-file` with source `derived`.
4. Any lower or unavailable progress returns `draft` with source `derived`.

`not-started` remains available as an explicit status. It must not be inferred from 0% because current completion checks can mark sections complete on untouched forms.

Pending, disapproved, and approved statuses are manually recorded. UI copy must describe them as user-tracked status, not court-synchronized information.

### Deadline Rules

Continue deriving statutory deadlines from existing filing fields:

- Guardian Inventory: `gid + 60 days`
- Simplified/Annual Accounting: `periodTo + 90 days`
- Initial Plan: `lettersSignedDate + 60 days`
- Annual/Simplified/Minor Plan: `periodTo + 90 days`

Buckets:

- `overdue`
- `today`
- `due-soon`
- `future`
- `none`

Deadlines are actionable only when the filing is active and its status is:

- `not-started`
- `draft`
- `ready-to-file`
- `disapproved-needs-correction`

Pending and approved filings may show a muted informational date but must not appear as overdue or approaching action items. Archived deadlines remain hidden.

### Priority Order

1. `disapproved-needs-correction`
2. Actionable overdue deadline
3. Actionable deadline due today or within 14 days
4. `pending-court-review`
5. `ready-to-file`
6. `draft`
7. Explicit `not-started`
8. `approved`
9. Archived/closed

Resolve ties by:

1. Earliest due date, with missing dates last
2. Oldest `lastModified`
3. Ward name

## Dashboard Preferences

Add:

`probate-guardian/src/features/dashboard/preferences.js`

Store one validated browser-local record under:

```text
pg-dashboard-preferences-v1
```

Shape:

```js
{
  role: 'family',
  supervisingProfessionalFilter: null,
  onboardingDismissed: false
}
```

Supported roles:

- `family`
- `professional`
- `assistant`

`supervisingProfessionalFilter` stores a normalized assignee filter key, not ward data or a fabricated professional ID.

Do not store email, phone, ward PII, or an unused profile object.

If storage is unavailable:

- Retain preferences in module-local memory for the browser session.
- Do not clear that memory during dashboard `dispose()`.
- Fall back to family view after a page reload.

Invalid or obsolete filters fall back to "All."

Always provide a dashboard role control after onboarding so users are not locked into their first selection.

## Metrics

Metrics operate on active projected filings.

### Action Items / Exceptions

Count each filing once when it is:

- `disapproved-needs-correction`, or
- Actionably overdue

### Approaching Deadlines

Count filings due today through 14 days from today that:

- Have an actionable deadline
- Are not disapproved

### Pending Court Review

Count explicit `pending-court-review` filings.

Pending review remains visible even when no pending filing is the highest-priority row.

## Phases

### 14A: Projection Foundation

Add:

- `probate-guardian/src/features/dashboard/view-model.js`
- `probate-guardian/tests/unit/dashboard-view-model.spec.js`

Refactor:

- `probate-guardian/src/features/dashboard/index.js`

Requirements:

- Preserve existing search, sorting, grouping, summary, and worklist behavior while changing the rendering source to projected wards. New role/filter behavior belongs to 14B.
- Move deadline derivation into the view model.
- Precompute totals and progress through existing services before projection.
- Preserve current appearance as much as possible.
- Preserve every existing `data-dashboard-action`.
- Preserve `open-ward`, `backup`, `pdf`, `archive`, and all other current actions.
- Keep production data sourced from `guardianData.wards`.
- Escape all ward-derived strings at the rendering boundary.
- Do not change persistence, factories, archive hydration, or `SAV_FORMAT_VERSION`.

### 14B: Role-Aware Triage

Add:

- `probate-guardian/src/features/dashboard/preferences.js`
- `probate-guardian/tests/unit/dashboard-preferences.spec.js`

Refactor:

- `probate-guardian/src/features/dashboard/index.js`
- `probate-guardian/index.html`

#### Family View

- Feature the active, non-archived filing.
- If unavailable, feature the highest-priority active filing.
- Show a clear Continue action.
- Keep every active filing accessible in a compact secondary list.
- Keep archived filings accessible through the existing archived section.
- Never hide sibling filings for the same person or case.

#### Professional View

- Render a high-density triage queue.
- Show metrics, workflow status, actionable deadlines, contacts, and assignment.
- Provide status, deadline, contact, and assignment filters.
- Add priority sorting.

#### Assistant View

- Use the professional queue layout.
- Add a supervising-professional filter based on explicit assignment.
- Include All, each known assignee, and Unassigned buckets.
- Treat wards with contacts but no explicit assignee as Unassigned.

#### Onboarding

- When no preference exists, render family view immediately.
- Show a non-blocking prompt inside the lazy dashboard.
- Allow role selection or dismissal.
- Keep a permanent role control available afterward.

All new controls must use delegated declarative actions. No inline scripts or executable handler attributes may be introduced.

### 14C: Explicit Workflow And Assignment

Refactor:

- `probate-guardian/src/features/dashboard/index.js`
- `probate-guardian/src/legacy-app.js`
- `probate-guardian/src/features/dashboard/view-model.js`

Requirements:

- Persist only after explicit workflow or assignment changes.
- Trim and validate assignee names before persistence.
- Remove empty properties rather than storing blank strings.
- Use `saveWardToState()`.
- Mark the case dirty and refresh the saved-state indicator.
- Keep `dashboardWorkflow` outside `WARD_SYSTEM_KEYS`.
- Do not change the archive manifest or format version.

#### New-Year Behavior

The existing new-year path snapshots current year data before creating the next year.

Update `resetYearlyFieldsForNewYear()` so:

- The prior-year snapshot retains status and assignment.
- The new year removes explicit `status`.
- The new year carries `assigneeName`.
- An empty `dashboardWorkflow` object is removed.

Switching to a prior year restores that year's recorded status and assignment.

### 14D: Validation And Sign-Off

Extend:

- `probate-guardian/tests/e2e/routes.spec.ts`
- `probate-guardian/tests/e2e/save-open-sav.spec.ts`
- `probate-guardian/tests/e2e/feature-load-failure.spec.ts`

Required coverage:

- Projection preserves current ward identity and display data.
- Deep-frozen projection input is not mutated.
- All filing-type deadline rules are deterministic.
- Professional contacts normalize and deduplicate correctly.
- Untouched wards do not rely on 0% to infer `not-started`.
- Old wards without metadata render without mutation.
- Invalid metadata falls back without rewriting.
- Explicit workflow status round-trips through `.sav`.
- `auto` removes explicit status.
- Empty workflow containers are removed.
- Assignee metadata round-trips through `.sav`.
- New-year creation clears status and carries assignment.
- Prior-year switching restores prior metadata.
- Family view retains access to every filing.
- Professional and assistant views render correctly.
- Assistant filtering distinguishes assigned and unassigned.
- Disapproved and actionable overdue filings sort first.
- Pending and approved filings are not treated as overdue action items.
- All three metrics use the defined non-overlapping rules.
- Browser preferences survive dashboard remount.
- Storage failure uses session-memory fallback.
- Exported `.sav` data contains no dashboard browser preferences.
- Ward names, contacts, assignees, and imported strings are escaped safely.
- Existing declarative actions continue working.
- Repeated mount/dispose does not accumulate listeners.
- Lazy-load failure and reload behavior remain unchanged.
- No source-authored executable inline handlers or scripts are introduced. The portable build may still emit its existing CSP-hashed inline bundle.

Run:

- Unit tests
- Full source suite
- Web build
- Portable build
- Source/dev/web/portable target matrix
- Chromium, Edge, Firefox, and WebKit matrix where supported

Record completion, results, and any explicit deferrals in:

- `probate-guardian/INDEX-SPLIT-PLAN.md`

## Deferred Work

The following are outside Milestone 14:

- Professional identity registry or durable professional IDs
- Court-system integration or automatic status verification
- Automatic migration or hydration of existing wards
- Persisted progress or deadline fields
- Cross-device synchronization of browser preferences
- Targeted per-card rendering optimization
- Production sample or mock ward data

## Sign-Off Decisions

Approve before implementation:

- No automatic `.sav` migration.
- Do not bump `SAV_FORMAT_VERSION`; stop and request renewed sign-off if implementation reveals that a bump is necessary.
- Progress and statutory deadlines remain derived.
- `not-started` is explicit rather than inferred from progress.
- Filing status is user-tracked, not court-synchronized.
- Pending and approved filings do not generate deadline alerts.
- Explicit status and assignment use optional `dashboardWorkflow` metadata.
- `auto` removes persisted status.
- Assignment uses a human-readable name, not `preparerId`.
- Filing contacts remain distinct from assignment.
- Browser preferences never enter `.sav`.
- Family view is the default and retains access to all filings.
- Onboarding is dashboard-local and non-blocking.
- Full dashboard rerender is acceptable initially.
- Existing action names and behavior remain unchanged; new controls may add delegated `data-dashboard-action` values.
- Mock data is allowed only in isolated tests.
