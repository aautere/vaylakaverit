# Visual design plan: shared scorecard

- Change: `openspec/changes/improve-score-entry`
- Status: approved
- Links: UX [shared scorecard](../ux/shared-scorecard.md); requirements [shared golf games](../specs/shared-golf-games/spec.md); tasks [tasks](../tasks.md)

## Intent and hierarchy

The active round makes **Tulokset** the first action after compact round identity and connection
status. A player scans hole progression vertically and compares the whole group horizontally within
the same scorecard. The hole number, par, and completion state lead each row; player score cells
follow in a stable order. Standings remain immediately after the scorecard as live context, while
side games and round completion stay secondary.

## iPhone-first layout and responsive behaviour

On iPhone, render one full-width scorecard with a sticky player-label row and 18 vertically stacked
hole rows. The hole context column and each score cell retain a 44 CSS-pixel minimum. Player headers
use compact visible names or initials while each cell retains the full player-and-hole accessible
label. With two to four players, the grid must fit within the content width without overlapping;
long player names truncate visually only after their full name is available to assistive technology.

The scorecard remains a single continuous group, rather than a paged or selectable hole control.
On wider screens, increase the player-column width and show full player names; do not move the
scorecard into a sidebar or break its row order. The sticky header must not obscure focused cells.
Outdoor use requires high contrast, clear row separation, and direct numeric entry with no
hover-only information.

## Components and semantic foundation

| UI area                                 | Shared/domain component           | Semantic token intent                                               | Foundation gap |
| --------------------------------------- | --------------------------------- | ------------------------------------------------------------------- | -------------- |
| Round identity and connection           | `Card` and `StatusMessage`        | `surface-inverse`, `text-inverse`, status tokens                    | None           |
| Scorecard container and hole rows       | `Card` with domain scorecard grid | `surface-raised`, `surface-subtle`, `border-subtle`, spacing tokens | None           |
| Hole context                            | Domain row label                  | `text-strong`, `text-muted`                                         | None           |
| Player headers                          | Domain grid header                | `surface-subtle`, `text-primary`, `border-subtle`                   | None           |
| Editable score                          | `TextField` number composition    | `surface-raised`, `text-primary`, `border-strong`, `focus-ring`     | None           |
| Read-only score                         | Text value in the same grid cell  | `text-primary`, `surface-subtle`                                    | None           |
| Pending, confirmed, error, and conflict | `StatusMessage` plus cell state   | `status-warning`, `status-success`, `status-danger`, `focus-ring`   | None           |

Direct score cells use the shared field treatment; they are not native select controls and do not
introduce feature-local tokens. A cell's pending or error state uses a border and textual status in
addition to colour.

## Important visual states

| State         | Visual treatment                                                                                                   |
| ------------- | ------------------------------------------------------------------------------------------------------------------ |
| Empty         | Every row remains visible with an unentered score placeholder and a concise empty-score message.                   |
| Loading       | Keep the card and known cells visible with a compact loading status; do not replace the screen with a spinner.     |
| Success       | Show a short polite status near the card; the updated cell remains stable.                                         |
| Error         | Show inline text below or adjacent to the affected cell without covering neighbouring controls.                    |
| Permission    | Render the same grid with read-only values and an explanatory status rather than disabled-looking editable inputs. |
| Offline       | Mark only the affected pending cell and show the pending count above the scorecard.                                |
| Synchronizing | Use a compact status in the round summary and retain the per-cell pending marker.                                  |
| Conflict      | Pair an assertive message with an error border and focus on the refreshed affected cell.                           |

## Accessibility

- WCAG AA contrast and non-colour state cues: cells have visible borders; status text, icons or
  shape, and labels supplement all tonal changes.
- Visible focus and keyboard affordances: the shared `focus-ring` encloses the entire score cell;
  focus is never hidden by the sticky player row.
- Interactive targets: every score cell is at least 44 by 44 CSS pixels.

## Behavioural questions returned to UX

None. The approved UX record defines shared entry and correction for joined participants, read-only
invitation viewers, and cell-level conflict recovery.
