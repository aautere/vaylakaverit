# Design: Shared scorecard entry

## Context

The active round currently authorizes a participant to record only their own score through a
single-hole form. Its hole dropdown interrupts entry, hides the rest of the scorecard, and the
field layout can overlap at iPhone widths. The approved change makes score recording a shared
group task while retaining the active round, live update, offline outbox, and authoritative
revision model.

## Decision

Authorize any joined participant in an active round to create or replace the score of any player in
that round. The score mutation identifies the player whose score changes rather than inferring that
player from the caller. Invitation-link viewers remain read-only, and all other active-round
authorization checks remain in place.

Replace the single-hole form with a scorecard model that contains all course holes, each player,
and the score for every player-hole pair. A scorecard change continues to use the authoritative
round revision. Offline entries retain both the target player and target hole in the pending write,
replay in creation order, and refresh from the server after reconciliation. A rejected revision
reloads the authoritative scorecard and identifies the affected cell for deliberate resubmission.

No persisted score data is migrated: existing player-hole scores are projected into the same
scorecard model. Game calculation, result history, and live-update messages continue to operate
from the authoritative round snapshot.

## UI behavior

The active round shows the complete scorecard before standings and side games. Each row represents a
hole and its course context; each player has a direct numeric score cell. A joined participant can
change any cell. A link viewer sees the same values as static text and a clear explanation that
joining is required for score entry.

The scorecard submits a deliberate cell change rather than a separate whole-card save. The client
shows that cell as pending until the server confirms it. It does not imply that a locally queued
value is shared or final. On server validation or conflict, the cell retains clear error feedback,
the authoritative value is shown, and focus returns to that cell.

## Alternatives considered

- **Keep a per-hole dropdown and add player selection:** rejected because it preserves the
  interruption and fails the complete-scorecard requirement.
- **Give only the round creator shared score access:** rejected because every joined participant must
  be able to record the group’s scores.
- **Add a separate scorekeeper role:** rejected because it creates an unnecessary permission model
  and is outside the approved scope.
- **Save an entire scorecard as one request:** rejected because it increases conflict risk and would
  obscure the pending state of individual scores.

## Error handling and accessibility

The API validates an active joined caller, a player belonging to the round, a valid hole, a valid
stroke count, and the round revision. Client-side field errors identify the player and hole. A
permission denial leaves the scorecard readable but not editable. Network failure queues a local
cell change according to the existing outbox model; an irrecoverable failure preserves the entered
value and exposes a retry path.

Keyboard order follows each visible hole row from its context to the players' score cells. Each
editable cell has a programmatic label containing the player and hole. After a confirmed save,
focus remains in the edited cell; after an error or conflict it returns there. All controls preserve
visible focus, a minimum 44 by 44 CSS-pixel target, WCAG AA contrast, and text-based pending,
success, error, and conflict cues.

## Testing

Targeted API and store tests cover shared authorization, rejection of viewers and non-members,
target-player validation, corrections, revision conflicts, and pending replay. Frontend coverage
verifies complete scorecard rendering, direct entry without a hole dropdown, read-only viewing,
cell-level feedback, keyboard order, and non-overlapping iPhone layouts.
