## MODIFIED Requirements

### Requirement: Shared round creation and joining

The system SHALL let a guest create a shared round for two to four players and become its first
joined participant. The creator MAY issue or revoke that round's invitations and start its ready
lobby, but those creator rights SHALL apply only within the round they joined.

The system SHALL let a browser with a valid or newly created guest session join a shared round by
using a valid QR code or invitation link. An invitation token MUST NOT grant access to a round
snapshot, history, live connection, lobby, or score controls before that guest has joined.

The system SHALL display a course's tee labels exactly as configured, whether the labels are
numbers, colours, or both. A course configuration SHALL define the initial default tee. Golf Talma
Master SHALL use tee 52 as its initial default tee.

#### Scenario: A guest creates and shares a new round

- **GIVEN** a browser has a valid guest session
- **WHEN** the guest creates a round at Golf Talma Master
- **THEN** the system joins that guest as the creator and first participant
- **AND** provides a QR code and invitation link for other guests to join

#### Scenario: A guest joins through an invitation

- **GIVEN** a guest opens a valid invitation link for a round they have not joined
- **WHEN** they complete the join action
- **THEN** the system adds that guest as a participant and opens the lobby
- **AND** the guest can access only that joined round according to their participant permissions

#### Scenario: An invitation holder has not joined

- **GIVEN** a browser holds a valid invitation token but is not a participant
- **WHEN** it requests the round snapshot or a live connection
- **THEN** the system refuses the request
- **AND** presents only the safe join route

### Requirement: Shared round lobby and readiness

The system SHALL place a newly created shared round in a lobby before active play. The lobby SHALL
show every participant's display name, selected tee, Handicap Index, selected rating table,
looked-up playing handicap, readiness, and configured main-game settings.

Each joined participant SHALL be able to update and confirm only their own display name, tee,
Handicap Index, and rating table while the round is in the lobby. Updating any of those settings
SHALL require that participant to confirm readiness again. The backend MUST reject an attempt to
change another participant's settings or any setting in a round the guest has not joined.

Only the round creator SHALL be allowed to start the round. The system SHALL allow starting only
when the lobby has two to four participants, every participant has valid required settings and has
confirmed readiness, and the main game has valid settings. The backend MUST enforce these
conditions and reject score or side-game mutations before the round starts.

#### Scenario: A guest cannot alter another participant

- **GIVEN** two guests have joined the same lobby
- **WHEN** one guest attempts to update the other's lobby setting or score
- **THEN** the system rejects the request
- **AND** leaves the other participant's data unchanged

### Requirement: Configurable shared match-play games

The system SHALL allow a group to run one or more shared match-play games concurrently, either
from the beginning of a round or for a selected consecutive range of upcoming holes.

Each game SHALL let the group choose scratch play or handicap play. For handicap play, the system
MUST look up each player's playing handicap from the course's official selected-tee rating table
using their entered golf handicap index. The system SHALL use a 100% match-play handicap allowance.

The selected rating table SHALL be stored with the participant in that round only. The system MUST
NOT create or use a saved account-profile default rating table.

Each game SHALL allow the group to record an optional free-text reward, such as a beer for the
winner, without processing money or payments. Existing approved shared-game, handicap-stroke, and
tie-handling rules remain unchanged.

#### Scenario: A returning guest joins a later round

- **GIVEN** a guest selected a rating table in a previous round
- **WHEN** the guest joins a new round
- **THEN** the system asks for the rating-table selection in the new round
- **AND** does not restore a profile-level rating-table default
