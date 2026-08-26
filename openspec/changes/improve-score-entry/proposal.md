---
scope: application
status: approved
---

# improve-score-entry

## Why

Recording scores interrupts play: players must choose each hole from a dropdown, enter one score at a
time, and cannot see the round's complete scorecard. The current controls visually overlap and make
the active round difficult to use outdoors. A group also needs a practical way for any joined
participant to record the whole group's scores from one device.

## What Changes

- Let every joined round participant enter scores for every participant in that round.
- Replace single-hole score entry with a complete, scannable scorecard that shows all holes and every
  player's recorded score at once.
- Use direct, touch-friendly score controls in the scorecard rather than a hole-selection dropdown.
- Correct the score-entry layout so fields and controls have clear boundaries and do not overlap.
- Plan the shared-score permissions, simultaneous-edit recovery, accessible keyboard and focus
  behaviour, iPhone-first hierarchy, responsive expansion, Finnish user-facing wording, and visual
  states before implementation.

This change does not alter the course data, stroke-count rules, handicap calculation, game
evaluation, player limit, invitation access, or the existing live update requirement.

## Impact

This changes the active-round permission model from own-score entry to shared score entry for joined
participants. It affects score mutation authorization, revision/conflict handling, offline pending
scores, live updates, active-round accessibility, and the responsive score-entry interface. It
modifies the `shared-golf-games` capability and will require focused tests for the updated
authorization and scorecard behaviour.

## Non-goals

- Allowing invitation-link viewers who have not joined the round to edit scores.
- Changing who may create, start, complete, or configure a round or side game.
- Changing golf scoring, handicap, match-play, tie, or course rules.
- Building a desktop-first administration view or a separate scorekeeper role.
- Redesigning unrelated lobby, history, invitation, or side-game flows.
