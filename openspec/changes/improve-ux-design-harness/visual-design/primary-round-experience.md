# Visual design plan: primary round experience

- Change: `openspec/changes/improve-ux-design-harness`
- Status: approved planning record
- Links: [UX record](../ux/primary-round-experience.md); [design](../design.md); [requirements](../specs/ui-design-foundation/spec.md); [task list](../tasks.md) task 3.3
- Scope: create/join, lobby, active round, side-game setup, completed history, and their documented states. This is an implementation guide, not a pixel-perfect contract.

## Intent and mobile hierarchy

The iPhone-first page must make the next outdoor action obvious before secondary context:

1. **Create/join:** one task card, then the name/setup fields, primary submit, alternate join/create
   action, and completed history. An invitation preview states whether the user is viewing or joining.
2. **Lobby:** round/course identity and share action; roster/readiness; own-settings form; then
   creator-only start readiness. The readiness condition is text, not a coloured pill alone.
3. **Active:** persistent round identity and connection status; own score entry as the first
   actionable card after the summary; players and main standing as scannable context; side-game setup
   and active games below. Round completion is visually separated as consequential.
4. **History:** outcome and return action first; then players, settings/side games, entered scores,
   and standings. Empty history has a dedicated card rather than disappearing.

On narrow viewports content is one column with full-width primary actions. At wider widths, preserve
the task order and group related cards; do not turn score entry or status messages into small
sidebars. Keep critical actions reachable with one hand and avoid information that depends on hover.

## Shared foundation and components

| Area                                                             | Primitive or semantic treatment                                                 | Token intent                                                                                       |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Page and task groups                                             | Page surface plus `Card` for raised task, roster, setup, and history groups     | `surface-page`, `surface-raised`, `border-subtle`, `radius-card`, `elevation-card`, spacing tokens |
| Inverse round summary                                            | A deliberate inverse summary card, not feature-local colours                    | `surface-inverse`, `text-inverse`, `text-inverse-muted`                                            |
| Create, join, save, start, and retry                             | `Action` primary; one secondary action for alternate route or back navigation   | `action-primary`, `action-primary-text`, `border-strong`, disabled treatment                       |
| Inputs and selects                                               | `TextField` where applicable; equivalent labelled select/number field treatment | `text-primary`, `surface-raised`, `border-strong`, `focus-ring`                                    |
| Scores, roster, standings, and result rows                       | `Card` or compact subtle surface rows with a text label and value               | `surface-subtle`, `text-strong`, `text-muted`                                                      |
| Loading, success, error, permission, offline, sync, and conflict | `StatusMessage` with explicit `role`/live behavior appropriate to urgency       | `status-info`, `status-success`, `status-warning`, `status-danger` surface/text tokens             |

The existing foundation supplies `Action`, `TextField`, `Card`, `StatusMessage`, and semantic
surface, text, border, action, status, spacing, shape, elevation, focus, and disabled tokens. A QR
display and a select/checkbox field composition may remain domain markup, but must consume the same
tokens and focus treatment. No new primitive or token is requested by this plan. If implementation
discovers a gap, record it here and return it for a separately approved foundation decision rather
than adding a local literal override.

## Important states

| State                                              | Visual treatment                                                                                                                                |
| -------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Empty history / no side games / no completed score | A neutral card with a direct next-action sentence; never a blank region.                                                                        |
| Loading                                            | Keep the current card visible with a concise busy status and a disabled submitting action; do not replace the entire screen.                    |
| Success                                            | A success status adjacent to the action result; copied-link and saved-score feedback are textual.                                               |
| Error or permission denial                         | An error status close to the failed control; invalid fields include inline error text. Camera denial keeps the link input visible.              |
| Offline/pending                                    | Warning status directly above score entry, with pending count and automatic-send wording; a distinct text cue remains if colour is unavailable. |
| Connecting/polling/reconnecting                    | Compact information status in the round summary; it must not displace score entry.                                                              |
| Conflict                                           | Error status at score entry plus the refreshed score and a deliberate resubmission path.                                                        |
| Disabled completion                                | Secondary/disabled treatment with visible explanatory text, not disabled appearance alone.                                                      |

## Accessibility and responsive behavior

- All actions and checkbox rows are at least 44 by 44 CSS pixels. `Action` and form controls retain
  the shared `focus-ring`; domain controls must match it.
- Status tone is accompanied by explicit Finnish wording and suitable live-region semantics. Contrast
  meets WCAG AA in every token pairing, including inverse, warning, and disabled contexts.
- Use semantic headings for each task card and retain DOM order across breakpoints. The visual order
  cannot hide status, focus, or required form context.
- QR image has an accessible label and text/copy alternative. Pairs such as readiness and live
  connection use text, not colour or an icon alone.

## Behavioural questions returned to UX

Visual design does not decide conflict choices, manual retry behavior, link-only viewing navigation,
or the completion rule. Those unresolved behavior questions are recorded in the
[UX record](../ux/primary-round-experience.md) and require an approved update before frontend
implementation.
