## ADDED Requirements

### Requirement: Authenticated player data deletion

The system SHALL let an authenticated player request deletion of their own account or device-local
guest data. The deletion request MUST derive its target identity from the authenticated session and
MUST NOT accept another player's identity as input.

For every active or completed shared round containing the requesting player, the system SHALL
remove the identity reference and anonymize that player's display name while retaining the
round-scoped player record, scores, games, standings, and outcomes. The system SHALL NOT delete or
anonymize any other participant or delete the shared round.

#### Scenario: A player deletes their completed shared-round data

- **GIVEN** a player and another participant have a completed shared round
- **WHEN** the first player confirms deletion of their data
- **THEN** the first player's account identity and display name are removed from that shared history
- **AND** the other participant, score history, game settings, standings, and outcome remain
  available

#### Scenario: A player cannot delete another participant

- **GIVEN** a player is authenticated for a shared round
- **WHEN** they request deletion
- **THEN** the system deletes only the identity represented by their authenticated session
- **AND** the identities and display names of other participants remain unchanged

#### Scenario: A local guest deletes their data

- **GIVEN** a local preview guest has joined a shared round
- **WHEN** they confirm deletion of their data
- **THEN** the system anonymizes that guest in the shared round
- **AND** the browser clears the guest identity and pending local score changes
