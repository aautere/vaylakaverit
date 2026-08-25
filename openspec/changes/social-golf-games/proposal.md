---
scope: application
status: approved
---

# Väyläkaverit: social golf games

## Why

Friends currently calculate golf side games and small stakes mentally during a round. That is
error-prone and makes it hard for the group to see who is leading. Existing Garmin scorecards
already cover personal scorekeeping, so this product must complement rather than replace them.

## What Changes

Create an iPhone-first shared round experience for two to four golfers:

- Every player joins the same round on their own iPhone and enters their own score. Players can
  participate with either a guest name or Apple sign-in.
- A group starts a round and selects Golf Talma's Master course, then selects each player's tee
  from the labels used by that course. A course configuration supplies the initial default tee.
- The group creates one or more simultaneous match-play games before or during the round. A game
  is played either scratch or with automatically calculated handicaps based on each player's golf
  handicap index and selected tee. A game can have a non-monetary or small-stake reward, such as
  a beer for the winner.
- A match-play game with three or four players is one shared game: each hole has one winner rather
  than separate head-to-head matches.
- After each hole, players enter their stroke counts. The product calculates the active games and
  shows each participant the current status in real time, including the match-play standing.
- The group can add a short side game for a selected upcoming range of holes without disrupting
  the main games.
- Completed rounds and their games remain available for later review.

The first release contains only Golf Talma Master. Personal Garmin scorecard integration,
payments, and a comprehensive Finnish course catalogue are not required.

## Impact

This establishes the product's first capability: shared social golf games. Later artifacts will
define the exact game rules, handicap calculation, data retention, and real-time collaboration
model. The product name is Väyläkaverit. The first release will be deployed to Azure from a GitHub
repository. The application will store round, score, game, and result history, but it will not
process money or integrate with Garmin in this scope.

## Non-goals

- Replacing Garmin or another player's personal scorecard.
- Supporting every Finnish golf course in the first release.
- Taking payments, holding money, or enforcing wagers.
- Supporting more than four players in one round.
