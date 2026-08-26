## ADDED Requirements

### Requirement: Multiple full-round games at round creation

The system SHALL let a round creator configure one or more independent shared match-play games before
creating a lobby. Each configured game SHALL cover the full round, include every player who joins
the round, and retain its own scratch or handicap mode, optional reward, tied-hole rule,
carry-forward eligible players, end-tie rule, standing, and completed result.

The system SHALL keep one full-round game configured by default, let the creator add or remove
additional games before creating the round, and require at least one valid full-round game. The
system SHALL show each configured full-round game independently in the lobby, active round, and
completed-round history.

#### Scenario: Creator configures multiple games before sharing a round

- **GIVEN** a creator is creating a new round
- **WHEN** they configure a scratch match-play game and add a handicap match-play game
- **THEN** the system creates one lobby containing both full-round games
- **AND** both games include every player who joins the round
- **AND** each game calculates and displays its standing independently after the round starts

#### Scenario: Creator removes an additional game before creating a round

- **GIVEN** a creator has configured a default full-round game and an additional game
- **WHEN** they remove the additional game
- **THEN** the default game remains configured
- **AND** the creator can create the round with the remaining valid game

#### Scenario: Legacy single-game round remains available

- **GIVEN** a previously stored round has one full-round game
- **WHEN** a participant opens its lobby, active round, or history
- **THEN** the system presents that game as its single configured full-round game
- **AND** preserves its existing settings, standing, and outcome
