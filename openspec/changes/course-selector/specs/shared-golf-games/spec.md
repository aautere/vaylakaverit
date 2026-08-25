## MODIFIED Requirements

### Requirement: Shared round creation and joining

The system SHALL let a guest or Apple-signed-in player create a shared round for two to four
players by selecting a supported course and an available round length before selecting each
player's tee from the labels defined by that course. The system SHALL offer Golf Talma Master as
an 18-hole round and Rock Golf as either a 9-hole or 18-hole round.

The system SHALL display a course's tee labels exactly as configured, whether the labels are
numbers, colours, or both. A course configuration SHALL define the initial default tee. Golf Talma
Master SHALL use tee 52 as its initial default tee.

The system MUST make a course available for selection only when its current, official scorecard,
tee, and playing-handicap data have been recorded in a versioned course configuration. The system
SHALL retain the selected course configuration with each round so a later update cannot alter a
completed round.

The system SHALL allow anyone holding a round's invitation link or QR code to view that round and
its history without permission to alter player scores.

#### Scenario: Creator selects Golf Talma Master

- **GIVEN** a player starts creating a shared round
- **WHEN** they select Golf Talma Master
- **THEN** the system configures an 18-hole round
- **AND** initially selects tee 52 for the creator

#### Scenario: Creator selects a Rock Golf 9-hole round

- **GIVEN** Rock Golf has a verified course configuration
- **WHEN** a player selects Rock Golf and the 9-hole round length
- **THEN** the system creates a round with the nine configured Rock Golf holes
- **AND** it limits scoring and game ranges to holes 1 through 9

#### Scenario: Creator selects a Rock Golf 18-hole round

- **GIVEN** Rock Golf has a verified course configuration
- **WHEN** a player selects Rock Golf and the 18-hole round length
- **THEN** the system creates 18 ordered round holes from two consecutive passes of Rock Golf's
  configured nine-hole layout
- **AND** it identifies the second pass as round holes 10 through 18

#### Scenario: Players join a new round

- **GIVEN** a player has created a round at a supported course
- **WHEN** the creator displays its QR code and other players scan it
- **THEN** the joining players enter the same round from their own iPhones
- **AND** the player list updates for every participant

#### Scenario: Joining is rejected when the round is full

- **GIVEN** a shared round already has four players
- **WHEN** another player scans its QR code
- **THEN** the system refuses the join request
- **AND** explains that the round already has the maximum number of players
- **AND** allows the recipient to view the round without joining it

### Requirement: Course-configured round progression and game evaluation

The system SHALL use the selected round's ordered, versioned course configuration for score entry,
score validation, game ranges, handicap-stroke allocation, live standings, corrections, and
history.

For a Rock Golf 18-hole round, the system SHALL use the same configured nine-hole layout for round
holes 1 through 9 and 10 through 18. It SHALL keep the two passes distinct through their round-hole
number, while showing the underlying Rock Golf hole number and pass where context is needed. The
system MUST use the selected layout's official round-hole handicap indexes and MUST NOT assume that
the second pass repeats the first pass's handicap indexes.

The system SHALL prevent a score, side game, or end-tie extension from referring to a round hole
outside the selected round length. An unresolved game that reaches the final round hole without a
winner SHALL retain the existing unresolved outcome.

#### Scenario: A score is entered on Rock Golf's second pass

- **GIVEN** an active Rock Golf 18-hole round has reached round hole 12
- **WHEN** a participant records their own score
- **THEN** the system records it against round hole 12
- **AND** presents it as the second pass of underlying Rock Golf hole 3

#### Scenario: A second-pass hole uses its official handicap index

- **GIVEN** an active Rock Golf 18-hole round has reached round hole 12
- **WHEN** the system evaluates a handicap game
- **THEN** it uses the official handicap index 8 recorded for round hole 12
- **AND** that index is one greater than the handicap index 7 on the first-pass round hole 3

#### Scenario: A 9-hole round uses the first-pass handicap indexes

- **GIVEN** a Rock Golf 9-hole round is configured
- **WHEN** the system evaluates a handicap game on its first hole
- **THEN** it uses the official normalized handicap index 3 for round hole 1
- **AND** that value is derived from the first-pass 18-hole handicap index 5

#### Scenario: A 9-hole game cannot extend past the round

- **GIVEN** a Rock Golf 9-hole game's end-tie rule is continue-until-winner
- **AND** the game remains tied after round hole 9
- **WHEN** the round is completed
- **THEN** the system records that game as unresolved
- **AND** does not create a score or game result for round hole 10

#### Scenario: A historical course version remains stable

- **GIVEN** a completed round uses an earlier course configuration version
- **WHEN** a newer official configuration for that course is added
- **THEN** the completed round continues to display and evaluate with its recorded version
- **AND** newly created rounds use the newer configured version
