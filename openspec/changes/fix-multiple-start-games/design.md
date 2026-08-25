# Design: Multiple full-round games at round creation

## Context

The existing round model stores one full-round `game`, derives the round standing and outcome from
it, and stores later games in `sideGames`. This does not meet the approved ability to configure
multiple full-round games before the lobby exists.

## Decision

Add a collection of full-round games to new round records and accept that collection at the
round-creation API boundary. The first item remains the primary game for existing round-level
standing and outcome fields; every configured game is recalculated independently and exposed to the
client. This preserves established history and avoids changing side-game behavior.

Older persisted rounds that contain only the legacy `game` field are normalized as a one-item
full-round-game collection when read and calculated. New records retain the legacy primary-game
field alongside the collection during this compatibility transition. No existing player, score, or
game result is rewritten solely for this correction.

The create API validates a non-empty game collection and each game's approved settings before
creating the lobby. A full-round game has an empty participant list until the round starts; at start,
each full-round game receives the complete roster. This matches the existing main-game behavior and
does not introduce participant subsets before play.

## UI behavior

The start form contains a **Pelit alusta** section with one required, numbered game card. The
creator adds cards with **Lisää peli** and removes additional cards with **Poista peli**. Each card
contains its own mode, reward, and tie-rule settings. The submit request sends all cards together.
The lobby, active view, and history render the full-round-game collection as independent settings
and standings; side games remain in their existing separate section.

## Error handling and accessibility

The client keeps all cards and values when creation fails. Server validation rejects an empty or
invalid collection with a Finnish error that identifies the game configuration. Adding a card moves
focus to its heading; removing a card restores focus to the preceding card heading or the add
control. Native labels, visible focus, text feedback, WCAG AA contrast, and 44 by 44 CSS-pixel
targets apply to each card and control.

## Alternatives considered

- **Use side games for all additional start games:** rejected because side games start only after the
  round is active and support selected upcoming ranges.
- **Replace the legacy single-game fields immediately:** rejected because stored single-game rounds
  and their current history contract must remain readable.
- **Configure participant subsets before the lobby:** rejected because the roster does not yet exist
  and the approved scope reserves participant selection for side games.

## Testing

Targeted store and API tests cover creation with multiple games, independent recalculation, all-player
assignment at round start, rejection of an empty collection, and legacy single-game normalization.
Frontend coverage verifies adding and removing game cards, submitting their independent settings,
and rendering multiple games in lobby, active, and history states.
