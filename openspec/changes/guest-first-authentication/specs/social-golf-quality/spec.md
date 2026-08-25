## MODIFIED Requirements

### Requirement: Private guest history and removal

The system SHALL make completed round history available only to a valid device-bound guest session
that joined the round, until the session expires, is cleared, or is deleted.

When a guest requests deletion of their data, the system SHALL delete or anonymize that guest's
identity in shared rounds while preserving the other participants' round and game history.

#### Scenario: A guest deletes their data

- **GIVEN** a guest has joined completed shared rounds
- **WHEN** they request deletion of their guest data
- **THEN** their guest identity and display name are removed or anonymized in shared history
- **AND** other participants can still view the round and game results

### Requirement: Link-based joining and score authorization

The system SHALL let a guest holding a valid opaque invitation link or QR code join that round. The
system SHALL allow only a joined participant to read round state, receive a live participant
connection, update their own lobby settings, or change their own scores.

The system SHALL let the round creator revoke or replace a sharing token.

#### Scenario: A guest cannot access an unjoined round

- **GIVEN** a guest has not joined a round
- **WHEN** they request its history or submit a score mutation
- **THEN** the system refuses the request
- **AND** does not reveal round data or alter a score

### Requirement: Azure-independent local preview

The system SHALL provide a local preview mode that runs the PWA and API without Azure resources,
Apple sign-in, Apple credentials, or cloud credentials.

Preview mode SHALL use realistic in-memory Golf Talma Master round data, device-bound local guest
sessions, and a shareable local join link in place of QR scanning. It SHALL support end-to-end
testing of round creation, joining, score entry and correction, scratch and handicap match-play
standings, and completed-game history.

Preview mode SHALL preserve the production user-facing labels and flows. It SHALL NOT expose
preview, E2E, mock-data, or test-mode labels to a player.

#### Scenario: A developer previews a guest round locally

- **GIVEN** a developer starts the documented local preview command
- **WHEN** one guest creates a round and another browser guest uses its local join link
- **THEN** the guests join the same in-memory round without Azure or Apple resources
- **AND** they can complete, correct, and review the game's results
