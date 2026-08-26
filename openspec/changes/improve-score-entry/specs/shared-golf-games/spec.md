## MODIFIED Requirements

### Requirement: Player score entry and correction

The system SHALL let every joined participant enter and correct the stroke count for every player in
an active round. The system SHALL present all 18 holes and every player's entered score together in
one active-round scorecard, without requiring a hole-selection control. It SHALL recalculate all
affected active games as soon as a score changes.

The backend MUST reject score mutations from invitation-link viewers who have not joined the round
and from participants outside the active round. It SHALL continue to apply the authoritative round
revision when accepting, rejecting, or reconciling a shared score change.

#### Scenario: A participant records the group's scores

- **GIVEN** a joined participant is in an active round
- **WHEN** they enter a valid stroke count for any player on an unscored hole in the shared scorecard
- **THEN** the system records that player's score
- **AND** every participant sees the updated score and game standings in real time

#### Scenario: A participant corrects a group score

- **GIVEN** a joined participant is in an active round with a recorded score
- **WHEN** they replace that score with a valid stroke count in the shared scorecard
- **THEN** the system records the corrected score
- **AND** every affected game standing updates in real time

#### Scenario: A participant reviews the complete scorecard

- **GIVEN** a joined participant is in an active round
- **WHEN** they open the active-round score entry
- **THEN** they can scan every hole and every player's current score in one scorecard
- **AND** they can enter scores directly without choosing a hole from a dropdown

#### Scenario: A link viewer cannot change the scorecard

- **GIVEN** a person opens an active round through an invitation link without joining it
- **WHEN** they view the scorecard
- **THEN** they can see the recorded scores
- **AND** the system does not offer editable score controls
- **AND** it explains that joining the round is required to record scores
