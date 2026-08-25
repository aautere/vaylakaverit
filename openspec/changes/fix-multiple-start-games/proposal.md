---
scope: application
status: approved
---

# Fix multiple games at round start

## Why

The approved shared-game experience lets a group run one or more full-round match-play games
concurrently. The current round-creation form and API accept only one game, forcing creators to
wait until active play to add another game and preventing them from setting all intended games up
at the start.

## What Changes

Let a round creator configure one or more independent full-round games before creating the round.
The start form keeps one required game, lets the creator add or remove additional game settings,
and submits the complete collection when creating the lobby. Each configured game uses its own
scratch or handicap mode, optional reward, and tie rules; it includes all players who join the
round and is displayed and retained independently in the lobby, active round, and history.

## Impact

The shared round contract, preview API, game persistence, game recalculation, creation UI, lobby,
active standings, history, and their targeted tests must support multiple full-round games. Existing
single-game rounds remain readable as one configured full-round game. No identity, invitation,
score-entry authorization, side-game behavior, payment, or external integration changes.

## Non-goals

- Changing the approved match-play, handicap, tie, or side-game rules.
- Adding participant subsets to games configured before the round starts.
- Setting a product maximum for concurrent full-round games.
