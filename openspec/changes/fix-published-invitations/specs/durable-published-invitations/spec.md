## ADDED Requirements

### Requirement: Durable shared development invitations

The publicly reachable development environment SHALL persist a successfully created round and its
invitation in shared durable storage. It MUST make that invitation available to a different
supported device for its existing validity lifetime, regardless of Function App restart, idle
scale-to-zero, or request routing to a different instance.

The shared development environment SHALL preserve the existing invitation expiry, revocation,
participant limit, lobby, and authorization rules.

#### Scenario: A second device joins an unstarted round

- **GIVEN** a guest creates a round on the publicly reachable development site
- **AND** the creator has not started or revoked the round
- **WHEN** a second guest scans the displayed QR code before the invitation expires
- **THEN** the second guest can view and join the same lobby
- **AND** both guests see the updated participant roster

#### Scenario: A durable invitation survives an API instance change

- **GIVEN** a creator has received a successful response for a new development round
- **WHEN** the API restarts, scales to zero and back, or handles the invitation request on another instance
- **THEN** a valid invitation lookup returns that same unstarted round
- **AND** the recipient can join subject to the existing lobby rules

### Requirement: Explicit shared-guest runtime boundary

The system SHALL support a non-production shared-guest runtime mode for the publicly reachable
development environment. It MUST use durable round storage and device-local pseudonymous guest
identities without requiring Apple credentials.

The system MUST keep local preview separate: local preview SHALL use in-memory rounds and SHALL not
require cloud credentials or cloud resources. Production MUST NOT accept shared-guest identities.

#### Scenario: A developer runs local preview

- **GIVEN** a developer starts the documented local preview command
- **WHEN** they create and join a round in local browser sessions
- **THEN** the sessions use in-memory round data without Azure configuration
- **AND** this local state is not used by the publicly reachable development environment

#### Scenario: A production API starts

- **GIVEN** the production API is configured
- **WHEN** it starts
- **THEN** it rejects a shared-guest runtime configuration
- **AND** it requires its configured production identity mode

### Requirement: Unavailable invitation recovery

The system SHALL state that an invitation is no longer valid and direct the recipient to ask the
creator for a new link when it has expired, been revoked, or cannot be found. It MUST preserve any
safely entered join details and MUST NOT state that the round has ended unless the system has
confirmed that fact.

#### Scenario: A recipient opens an expired invitation

- **GIVEN** an invitation has expired
- **WHEN** a recipient opens its QR link
- **THEN** the system does not join the recipient to a round
- **AND** it explains that the link is no longer valid and the creator must provide a new link
