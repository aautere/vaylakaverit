---
scope: application
status: approved
---

# Course selector

## Why

The first release lets a group create a round only at Golf Talma Master. Groups who play at
Rock Golf cannot create a round that matches its nine-hole layout, and cannot choose to play its
course twice as an 18-hole round.

## What Changes

Add a course selector to shared-round creation with Golf Talma Master first and Rock Golf second.

- A group selects a course before configuring the players and game.
- Rock Golf offers a 9-hole round and an 18-hole round.
- A Rock Golf 18-hole round plays the configured nine holes twice, in the same order. The second
  pass is represented as round holes 10 through 18 so that score entry, live standings, game
  ranges, history, and corrections work consistently with an 18-hole round.
- Each course configuration defines its available round lengths, tee labels, default tee, hole
  order, supported rating tables, and official playing-handicap data.
- Rock Golf initially supports only the men's rating table. The women's table remains unavailable
  until its official values have been verified.
- Rock Golf course, tee, and handicap data is imported only after its official source and effective
  date have been recorded.

## Impact

Round creation, round persistence, lobby setup, score entry, match-play evaluation, history,
preview data, and their tests must support a selected course and its configured round length
instead of assuming Golf Talma Master's 18-hole configuration. Existing Golf Talma Master rounds
retain their original course configuration and remain unchanged.

## Non-goals

- Adding more courses beyond Golf Talma Master and Rock Golf.
- Changing the match-play rules, player limit, invitation flow, or score ownership.
- Replacing a historical round's course data after an official course-data update.
- Inferring tees or handicap values from unofficial or crowd-sourced sources.
