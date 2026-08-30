# Milestone 15: Dashboard UX Redesign

## Goal

Redesign the dashboard presentation so the first screen is triage-first instead of inventory-total-first.

Milestone 14 completed the data/view-model foundation. Milestone 15 is a presentation-layer milestone: use the existing projected dashboard model, role preferences, workflow metadata, and declarative actions without changing `.sav` schema, `SAV_FORMAT_VERSION`, archive hydration, or workflow persistence rules.

The dashboard should let a user understand within five seconds what needs attention.

Milestone 15 refines and repositions existing Milestone 14 dashboard capabilities. Do not duplicate role controls, assistant filtering, metrics, family priority views, or the professional/assistant triage queue if they already exist. The work is to make those capabilities visually obvious, better placed, and easier to scan.

## Non-Negotiables

- Do not change `.sav` schema or `SAV_FORMAT_VERSION`.
- Do not change archive hydration, ward factories, or workflow persistence rules.
- Do not use mock data in production rendering.
- Preserve existing dashboard action names and behavior.
- New controls must use delegated `data-dashboard-action` values.
- Preserve CSP: no source-authored executable inline scripts or inline event handlers.
- Preserve dashboard `mount()`/`dispose()` lifecycle safety.
- Financial totals may remain visible, but they must be secondary to compliance triage.

## Visual Priority System

Use a restrained compliance-exception treatment, not application-error styling.

Preferred pattern for urgent filings:

- A left priority rail on the row/card.
- A clear status badge.
- A lightly tinted background.
- Bold, plain-language reason text such as `52 days overdue` or `Needs correction`.
- Priority ordering plus the metric strip should do most of the attention work.

Avoid:

- Toast/error styling for ordinary filing states.
- Alert-dialog styling.
- Full red cards.
- Blinking, pulsing, or animated warning treatments.
- Warning icons on every row.
- Visual language that implies the app itself failed.

Severity treatments:

| State | Treatment |
| --- | --- |
| `disapproved-needs-correction` | Strongest treatment: rose/red left rail, rose badge, lightly tinted row, reason text `Needs correction` |
| Actionable overdue | Strong treatment: red/rose left rail, overdue badge, reason text such as `52 days overdue` |
| Due today or within 14 days | Amber left rail/badge, reason text such as `Due in 8 days` |
| `pending-court-review` | Blue/indigo badge, neutral row, visible in metric strip, not styled as urgent |
| `approved` | Muted green badge, visually quiet |
| Archived/closed | Muted presentation, separated from active triage |

The standard urgent-row pattern is: red or rose left rail + status badge + muted red-tinted background + bold deadline/reason text.

Color values must support both the light default theme and the dark theme. Do not paste in a light-dashboard palette such as white cards and pale rose backgrounds unless it is validated against both themes. Prefer mapping to the existing app tokens in `index.html` such as `--surface`, `--surface-2`, `--surface-3`, `--line`, `--ink`, `--ink-4`, `--danger-text`, `--warn-text`, `--ok-text`, `--brand-text`, and `--accent-text` instead of creating broad new root variables. The visual system should use the current surfaces, borders, typography, and accent vocabulary, with theme-appropriate tints for urgent, warning, pending, and approved states.

Suggested dark-theme token shape:

```css
--dashboard-surface: existing app panel surface;
--dashboard-border: existing app muted border;
--priority-urgent-rail: rose/red accent;
--priority-urgent-bg: subtle dark rose tint;
--priority-urgent-text: accessible rose text;
--priority-warning-rail: amber accent;
--priority-warning-bg: subtle dark amber tint;
--priority-pending-rail: blue/indigo accent;
--priority-approved-rail: muted green accent;
```

## Current UI Rebalance

Inspect the current dashboard DOM and screenshot before coding. Decide whether each visible legacy element is removed, demoted, or retained:

- Combined Total
- Grouped by Type
- Active Wards
- Due Within 14 Days
- Deadlines/Recent card
- Select Existing Ward prompt
- Inventory type accordions

Expected direction:

- Replace the headline financial total with triage metrics.
- Move financial totals to individual rows/cards or secondary details.
- Collapse the large `Select an Existing Ward` panel into a compact primary action such as `New Filing from Existing`.
- Make grouping by inventory type optional or secondary, not the dominant mode.
- Reserve horizontal space for the triage queue.

## Hooks To Preserve

Before replacing dashboard markup, inventory the current dashboard action surface in `src/features/dashboard/index.js`, then preserve or deliberately remap the existing hooks used by routing, tests, and delegated actions:

- `#main-content` remains the route-owned mount host.
- `data-dashboard-action` remains the dashboard delegated action attribute.
- `data-dashboard-change="workflow-status"` remains the workflow status change hook.
- `data-dashboard-change="assignee"` remains the assignment change hook.
- Existing dashboard action names and behavior remain intact, including but not limited to:
  - `open-ward`
  - `backup`
  - `pdf`
  - `archive`
  - `new-year`
  - `delete`
  - `prior-years`
  - `toggle-archived`
  - `toggle-section`
  - `group`
  - `worklist-tab`
  - `dismiss-continue`
  - `add-ward`
  - `select-existing`
  - `set-role`
  - `dismiss-onboarding`
- Existing ward identity payload attributes used by those actions remain present or are deliberately remapped with tests.
- Existing search, sort, and group controls remain until their replacements are wired and tested.
- Existing dashboard readiness/test markers remain available or are deliberately updated with tests.
- Existing archived-section access remains available.
- Existing create/new-from-existing behavior remains intact even if the large panel becomes a compact button. Prefer keeping the current `select-existing` action name for this behavior; use a new `new-from-existing` action only if it is deliberately mapped to the same behavior and covered by tests.

New action names such as `change-role`, `filter-professional`, and `new-from-existing` are allowed only through the same delegated `data-dashboard-action` path. Do not add separate source-authored inline handlers.

Workflow controls must continue through the existing delegated `data-dashboard-change` path. Do not introduce separate listeners for status or assignment controls unless the change is deliberately reviewed and covered by lifecycle tests.

## Layout Architecture

### Header Controls

Anchor role and assistant controls within the dashboard header area, physically separate from the ward queue. Do not move controls into the global shell/navigation unless separately approved.

- Dashboard role selector.
- Assistant `working on behalf of` / supervising-professional filter.
- Compact create-from-existing action.

These controls should remain easy to find without cluttering the triage rows.

### Metric Strip

Make these three triage metrics the primary dashboard signals across dashboard roles:

- Action Items / Exceptions
- Approaching Deadlines
- Pending Court Review

Each metric should be populated from the Milestone 14 projected dashboard model and should respect `isDeadlineActionable`.

`Active Filings` may remain as a quieter secondary metric. Family view may simplify presentation, but it must not use a different definition of urgency than professional or assistant views.

### Role Views

Family view:

- Lead with the current or highest-priority active filing.
- Show the next action clearly.
- Keep all active filings accessible.
- Keep archived filings accessible through the existing archived section.

Professional view:

- Refine the existing dense triage queue.
- Prioritize exceptions, overdue filings, approaching deadlines, pending review, and ready-to-file states.
- Keep search, status, deadline, contact, assignment, and grouping controls efficient.

Assistant view:

- Use the professional queue layout.
- Refine the existing supervising-professional filter.
- Include All, each known assignee, and Unassigned buckets.

### Grouping Decision

- Preserve existing grouping for ward-card layouts.
- Do not require grouping inside the professional/assistant triage queue for Milestone 15.
- Queue grouping is deferred unless implementation evidence shows it is needed for usability.

### Status Indicator Decision

- Prefer styling the existing workflow status selector as the status indicator.
- Add a separate badge only when the row is read-only or when it clarifies urgency without competing with the selector.
- Urgency badges such as overdue or due soon may sit beside the status selector because they describe deadline priority, not editable workflow state.

## Responsive Strategy

Do not build the professional/assistant queue as a rigid table.

Use CSS Grid or similarly flexible row/card markup that can reflow:

- Desktop: dense horizontal data row with stable columns.
- Tablet/mobile: stacked card layout with the same priority rail and badges.

Text must not overlap, overflow buttons, or occlude adjacent content at desktop or mobile widths.

## Implementation Slices

Work in slices and checkpoint after each slice with:

- Files touched
- Visible behavior changed
- Screenshot or DOM evidence
- Tests run and results
- Any deferrals or newly discovered risks

### 15A: Metric Strip Redesign

- Replace headline financial-total emphasis with triage metrics.
- Keep financial total available as secondary information.
- Verify pending review remains visible and pending/approved filings do not count as actionable deadlines.
- Establish the dashboard CSS architecture for metric cards, row/card rails, badges, and responsive queue layout using the existing theme system.
- 15A may add reusable CSS classes, but must not replace family/professional queue markup beyond the metric strip. Queue replacement belongs to 15D.

### 15B: Header Actions And Role Controls

- Reposition and refine the existing visible role mode control.
- Reposition and refine the existing assistant supervising-professional filter.
- Collapse the large `Select an Existing Ward` panel into a compact action.
- Keep existing declarative actions intact.

### 15C: Family View Layout

- Refine the existing family priority/next-action view.
- Preserve access to all active filings and archived filings.
- Apply left-rail/badge severity styling where relevant.

### 15D: Professional And Assistant Queue

- Refine the existing dense triage queue.
- Use priority ordering, filters, badges, and left rails.
- Make grouping by type secondary or optional.
- Ensure disapproved/overdue items grab attention without looking like app errors.

### 15E: Responsive Polish

- Validate desktop, laptop/tablet, tablet, and mobile widths.
- Capture screenshots in both light and dark themes at:
  - Desktop: 1920 x 1080
  - Laptop/tablet-ish: 1366 x 768
  - Tablet: 768 x 1024
  - Mobile: 390 x 844
- Ensure controls and text fit.
- Ensure grid rows reflow cleanly into stacked cards.
- Avoid a rigid HTML table for the professional/assistant queue; use CSS Grid or equivalent flexible markup that can move from desktop rows to mobile cards.

### 15F: Validation And Documentation

- Extend dashboard route coverage for the redesigned metric strip, role controls, priority styling, filters, and compact create-from-existing action.
- Preserve existing route, save/open, CSP, lifecycle, web, and portable checks.
- Update `INDEX-SPLIT-PLAN.md` or the appropriate project plan record with completion notes and any deferrals.

## Acceptance Criteria

- A user can tell within five seconds what needs attention.
- Action Items / Exceptions, Approaching Deadlines, and Pending Court Review are the primary dashboard signals.
- Financial totals are secondary, not the dashboard headline.
- Grouping by inventory type is secondary or optional.
- Pending review is visibly tracked without being styled as urgent.
- Disapproved and overdue filings are visually prioritized with left rail plus badge treatment.
- Due-soon filings use amber priority treatment.
- Approved and archived filings are visually quiet.
- Role mode is visible and usable without duplicating existing controls.
- Assistant filtering is visible without crowding the queue or duplicating existing controls.
- Existing workflow status and assignment controls continue through `data-dashboard-change`.
- Light and dark themes both remain coherent and readable.
- Required viewport screenshots show no overlap, clipped controls, unreadable badges, or broken rail/card layout.
- Existing declarative actions still work.
- Existing route/test hooks are preserved or intentionally remapped with coverage.
- No source-authored executable inline scripts or inline event handlers are introduced.
- Dashboard mount/dispose remains clean.
- Web and portable builds remain valid.
