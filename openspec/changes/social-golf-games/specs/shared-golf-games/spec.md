## ADDED Requirements

### Requirement: Shared round creation and joining

The system SHALL let a guest or Apple-signed-in player create a shared round for two to four
players, select Golf Talma Master, select each player's tee from the labels defined by that
course, and invite other players by displaying a QR code.

The system SHALL display a course's tee labels exactly as configured, whether the labels are
numbers, colours, or both. A course configuration SHALL define the initial default tee.

Golf Talma Master SHALL use tee 52 as its initial default tee.

The system SHALL allow anyone holding a round's invitation link or QR code to view that round and
its history without permission to alter player scores.

#### Scenario: Players join a new round

- **GIVEN** a player has created a round at Golf Talma Master
- **WHEN** the creator displays its QR code and other players scan it
- **THEN** the joining players enter the same round from their own iPhones
- **AND** the player list updates for every participant

#### Scenario: Joining is rejected when the round is full

- **GIVEN** a shared round already has four players
- **WHEN** another player scans its QR code
- **THEN** the system refuses the join request
- **AND** explains that the round already has the maximum number of players
- **AND** allows the recipient to view the round without joining it

### Requirement: Shared round lobby and readiness

The system SHALL place a newly created shared round in a lobby before active play. The lobby SHALL
show every participant's name, selected tee, Handicap Index, selected rating table, looked-up
playing handicap, readiness, and the configured main-game settings.

Each participant SHALL be able to update and confirm only their own name, tee, Handicap Index, and
rating table while the round is in the lobby. Updating any of those settings SHALL require that
participant to confirm readiness again. The backend MUST reject an attempt to change another
participant's settings.

Only the round creator SHALL be allowed to start the round. The system SHALL allow starting only
when the lobby has two to four participants, every participant has valid required settings and has
confirmed readiness, and the main game has valid settings. The backend MUST enforce these
conditions and reject score or side-game mutations before the round starts.

#### Scenario: Players confirm lobby settings

- **GIVEN** a creator has opened a new shared-round lobby
- **WHEN** each participant selects their own tee, Handicap Index, rating table, and confirms their
  settings
- **THEN** every participant sees the roster with each player's looked-up playing handicap and
  readiness
- **AND** no participant can change another participant's settings

#### Scenario: Creator starts a ready group

- **GIVEN** a lobby contains two to four ready participants with valid required settings
- **WHEN** the creator starts the round
- **THEN** the system changes the round to active play
- **AND** participants can enter scores and create side games

#### Scenario: Starting is blocked while the lobby is incomplete

- **GIVEN** a lobby has fewer than two participants or a participant has not confirmed valid settings
- **WHEN** the creator tries to start the round
- **THEN** the system refuses the request
- **AND** explains that the roster and settings must be ready first

### Requirement: Player score entry and correction

The system SHALL let each participant enter and later correct only their own stroke count for each
hole, and SHALL recalculate all affected active games as soon as a score changes.

#### Scenario: A player records a hole score

- **GIVEN** a participant is in an active round
- **WHEN** they record their stroke count for the current hole
- **THEN** every participant sees the score and updated game standings in real time

#### Scenario: A player corrects a previous score

- **GIVEN** a participant has recorded a score for an earlier hole
- **WHEN** they correct their own stroke count
- **THEN** the system updates every affected game standing in real time
- **AND** other players' scores remain unchanged

### Requirement: Configurable shared match-play games

The system SHALL allow a group to run one or more shared match-play games concurrently, either
from the beginning of a round or for a selected consecutive range of upcoming holes.

Each game SHALL let the group choose scratch play or handicap play. For handicap play, the system
MUST look up each player's playing handicap from the course's official selected-tee rating table
using their entered golf handicap index. The system SHALL use a 100% match-play handicap
allowance.

For a handicap game, the system SHALL use the participant with the lowest looked-up playing
handicap as the comparison baseline. Every other participant SHALL receive the non-negative
difference from that baseline as handicap strokes. The system SHALL allocate those strokes in
ascending HCP-index order from 1 through 18, repeating the order when the difference exceeds 18.

The system SHALL support negative playing handicaps by allowing a participant with a negative
handicap to become the comparison baseline; the baseline participant receives no penalty strokes.

For handicap play, the system SHALL let a signed-in player store a changeable default rating table
for their course-handicap calculation. The initial default SHALL be the men's rating table. The
player SHALL be able to change the selected table for an individual round without changing their
stored default.

Each game SHALL allow the group to record an optional free-text reward, such as a beer for the
winner, without processing money or payments.

Each game SHALL require the group to choose whether a tie at the end of its selected holes is
recorded as a draw or extended to subsequent holes until there is a winner.

For games with three or four players, the system SHALL treat each hole as one shared contest with
one winner rather than separate head-to-head matches.

#### Scenario: The group starts concurrent games

- **GIVEN** a shared round has two to four players
- **WHEN** the group creates a scratch match-play game and a handicap match-play game
- **THEN** both games are active for their selected holes
- **AND** each game calculates its standing independently

#### Scenario: The group creates a side game during a round

- **GIVEN** a round is in progress
- **WHEN** the group starts a game for the next three holes
- **THEN** the new game starts at the next unplayed hole
- **AND** it does not alter any existing game's configuration or results

#### Scenario: Handicap input is unavailable

- **GIVEN** the group configures a handicap match-play game
- **WHEN** a participating player has not entered a golf handicap index
- **THEN** the system prevents that player from joining the handicap game
- **AND** explains that a handicap index is required

#### Scenario: A signed-in player changes their rating table for one round

- **GIVEN** a signed-in player has the men's rating table as their stored default
- **WHEN** they select the women's rating table for a new round
- **THEN** the system uses the women's table to calculate their handicap for that round
- **AND** retains the men's table as their stored default for future rounds

#### Scenario: A handicap-game stroke difference is allocated

- **GIVEN** a handicap game has players with looked-up playing handicaps of 15 and 20
- **WHEN** the game begins
- **THEN** the player with handicap 20 receives five handicap strokes relative to the player with
  handicap 15
- **AND** the strokes apply on HCP-index holes 1 through 5

#### Scenario: A negative handicap is the comparison baseline

- **GIVEN** a handicap game has players with looked-up playing handicaps of -2 and 3
- **WHEN** the game begins
- **THEN** the player with handicap 3 receives five handicap strokes on HCP-index holes 1 through 5
- **AND** the player with handicap -2 receives no penalty strokes

### Requirement: Tie handling selected per game

The system SHALL require the group to choose a tie-handling rule when creating each shared
match-play game: award no winner for a tied hole, or carry the unresolved win to the next hole.

When the group chooses to carry a tied hole forward, the system SHALL require the group to select
which players may resolve the carried win on the next hole.

#### Scenario: A tied hole has no winner

- **GIVEN** a game uses the no-winner tie rule
- **WHEN** two or more players tie for the best applicable score on a hole
- **THEN** the hole has no winner in that game
- **AND** the next hole is played normally

#### Scenario: A tied hole is carried forward

- **GIVEN** a game uses the carry-forward tie rule
- **AND** the group has selected the players eligible to resolve a carried win
- **WHEN** two or more players tie for the best applicable score on a hole
- **THEN** the system records the unresolved win
- **AND** only the selected eligible players can resolve it on the next hole

#### Scenario: A game ends tied

- **GIVEN** the selected holes of a game have been completed with no overall winner
- **WHEN** the game uses the draw-at-end rule
- **THEN** the system records the game as a draw

#### Scenario: A game continues after an end tie

- **GIVEN** the selected holes of a game have been completed with no overall winner
- **WHEN** the game uses the continue-until-winner rule
- **THEN** the system extends the game one hole at a time until there is a winner

#### Scenario: An extended game ends before a winner

- **GIVEN** a game is continuing hole by hole after an end tie
- **WHEN** the round ends before the game has a winner
- **THEN** the system records the game as unresolved
- **AND** does not record a winner or a draw

### Requirement: Live standings and game history

The system SHALL show every participant the live standing of each active game and retain completed
rounds and games for later review.

#### Scenario: Participants view a live shared-game standing

- **GIVEN** scores have been entered for an active game
- **WHEN** any participant opens the game view
- **THEN** they see the current hole-by-hole result and current leader
- **AND** the view refreshes when another participant enters or corrects a score

#### Scenario: Players review a completed game

- **GIVEN** a game has reached the end of its selected holes
- **WHEN** a participant opens their past rounds
- **THEN** they can view the completed game, its settings, participating players, hole results,
  and final outcome
