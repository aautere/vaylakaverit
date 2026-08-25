## ADDED Requirements

### Requirement: Private persistent history and removal

The system SHALL retain a player's Apple-account profile and round history until the player
requests deletion.

When a player requests deletion, the system SHALL delete or anonymize that player's identity in
shared rounds while preserving the other participants' round and game history.

#### Scenario: A player deletes their data

- **GIVEN** a player has joined completed shared rounds
- **WHEN** they request deletion of their account and data
- **THEN** their personal account data is removed
- **AND** their name is removed or anonymized in other participants' shared history
- **AND** the other participants can still view the round and game results

### Requirement: Link-based viewing and score authorization

The system SHALL let anyone holding a round's opaque invitation link or QR code view that round
and its history, while allowing only a joined participant to change their own scores.

The system SHALL let the round owner revoke or replace a sharing token.

#### Scenario: A link recipient views a round

- **GIVEN** a player has received a valid round invitation link
- **WHEN** they open the link without joining the round
- **THEN** they can view the round and its game standings
- **AND** they cannot enter or change scores

#### Scenario: A revoked link is opened

- **GIVEN** the round owner has revoked a sharing token
- **WHEN** a recipient opens its old invitation link
- **THEN** the system refuses access
- **AND** explains that the link is no longer valid

### Requirement: Live update responsiveness

The system SHALL publish a persisted score entry or correction to active round participants within
one second under normal supported mobile-network conditions.

#### Scenario: A player enters a score on a supported connection

- **GIVEN** two participants have an active supported mobile-network connection
- **WHEN** one participant enters a confirmed score
- **THEN** the other participant sees the updated score and game standing within one second

### Requirement: Temporary connection-loss recovery

The system SHALL preserve a participant's pending own-score changes locally during a temporary
connection loss and synchronize them in order when connectivity returns.

#### Scenario: A participant records a score while disconnected

- **GIVEN** a participant has temporarily lost network connectivity
- **WHEN** they enter their own score
- **THEN** the system retains the pending score locally and clearly marks it as unsynchronized
- **WHEN** connectivity returns
- **THEN** the system synchronizes the score and refreshes the authoritative round state

### Requirement: Durable confirmed scores

The system SHALL persist a score change and its resulting game state before confirming the change
to the participant.

#### Scenario: The application restarts after score confirmation

- **GIVEN** a participant has received confirmation that a score was saved
- **WHEN** the application or backend restarts
- **THEN** the saved score and its game outcome remain available after reconnecting

### Requirement: Demand-based backend capacity

The system SHALL scale Functions compute and Cosmos DB request capacity according to demand and
SHALL scale idle application compute capacity to zero.

The first release SHALL use Azure Web PubSub Free tier for live participant updates and SHALL limit
the service to 20 concurrent participant connections. The system SHALL alert the operator before
the connection cap is reached so the service can be upgraded to Standard tier.

#### Scenario: Demand returns after an idle period

- **GIVEN** the service has no active rounds and idle capacity has scaled to zero
- **WHEN** a player starts or joins a round
- **THEN** the service provisions the required capacity and the player can continue the round flow

#### Scenario: Live participant capacity approaches its limit

- **GIVEN** the first-release Web PubSub Free tier is in use
- **WHEN** active participant connections approach 20
- **THEN** the system alerts the operator to upgrade the live-update service before the cap is
  reached

#### Scenario: A link-only viewer opens an active round

- **GIVEN** a viewer has a valid round invitation link but has not joined the round
- **WHEN** they open an active round
- **THEN** they see the latest persisted round snapshot
- **AND** they do not consume a live participant connection

### Requirement: Azure-hosted, GitHub-delivered service

The system SHALL run in Azure and SHALL define its complete cloud infrastructure as code.

The system SHALL keep application source, infrastructure, and deployment automation in a public
GitHub repository under the `aautere` personal profile. Deployments SHALL use GitHub Actions OpenID
Connect federation rather than long-lived Azure credentials.

The public repository SHALL be licensed under MIT and SHALL not contain credentials, secrets, or
production data.

#### Scenario: A production deployment is approved

- **GIVEN** an approved change has passed the repository quality checks
- **WHEN** a maintainer explicitly approves production deployment
- **THEN** GitHub Actions deploys the version and its infrastructure changes to Azure
- **AND** deployment authentication uses a short-lived OpenID Connect token

#### Scenario: A contributor opens the repository

- **GIVEN** a contributor visits the public GitHub repository
- **WHEN** they inspect its root files
- **THEN** they can find the MIT license
- **AND** no credentials, secrets, or production data are present in source control

### Requirement: iPhone browser support and accessible outdoor use

The system SHALL support Safari and Chrome on the current and two immediately preceding iOS major
versions.

The system SHALL provide WCAG AA conformance, high contrast, large touch targets, and one-handed
access to primary round actions.

#### Scenario: A player records a score outdoors

- **GIVEN** a player uses a supported iPhone browser in bright outdoor conditions
- **WHEN** they open the active-round score entry view
- **THEN** the primary score controls are readable, reachable with one hand, and operable by touch
