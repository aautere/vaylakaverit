## ADDED Requirements

### Requirement: Device-bound guest session

The system SHALL create an opaque device-bound guest session when a browser without a valid session
submits a required display name. The system MUST NOT require or collect a password, email address,
App Store account, Apple identity, or other third-party account for a player to create or join a
round.

The system SHALL trim the display name and accept one to 40 visible characters. A display name MUST
NOT be used as an authorization identifier or required to be unique.

#### Scenario: A new player creates a guest session

- **GIVEN** a browser has no valid guest session
- **WHEN** the player enters a valid display name and chooses to create or join a round
- **THEN** the system creates a device-bound guest session
- **AND** the player continues to the requested round flow without account registration

#### Scenario: A blank or overlong display name is rejected

- **GIVEN** a browser has no valid guest session
- **WHEN** the player submits an empty, whitespace-only, or more-than-40-character display name
- **THEN** the system does not create a session
- **AND** explains how to correct the displayed name

### Requirement: Guest session retention and clearing

The system SHALL retain a guest session on its originating browser profile for 180 days after its
most recent authenticated use. It MUST reject an expired or revoked credential and return that
browser to the display-name entry flow.

The system SHALL offer an explicit clear-device-data action that revokes the current device
credential and clears its local credential and pending own-score outbox. Clearing device data MUST
NOT delete or alter shared-round records, scores, games, standings, or outcomes.

The system SHALL offer a separate irreversible delete-guest-data action that derives the guest only
from the current session, anonymizes that guest in shared rounds while preserving other
participants' records, revokes the credential, and clears local guest data.

#### Scenario: An inactive guest session expires

- **GIVEN** a guest has not made an authenticated request for more than 180 days
- **WHEN** the browser next attempts to use its stored credential
- **THEN** the system rejects the expired credential
- **AND** the browser removes it and asks for a display name before a new round action

#### Scenario: A guest clears only this device

- **GIVEN** a guest has joined completed shared rounds on one browser
- **WHEN** they confirm clear-device-data
- **THEN** the browser loses access to those rounds and removes pending local scores
- **AND** the shared rounds and other participants' history remain unchanged

### Requirement: No production Apple identity dependency

The production system MUST NOT depend on Sign in with Apple, an Apple Developer account, Apple
provider credentials, or Apple identity data to create, join, score, or review a round.

Apple Sign In MAY be proposed later only as an optional account-recovery or cross-device-history
feature in a separately approved change. Such a feature MUST NOT make an account mandatory for the
guest-first flow.

#### Scenario: A player uses the production round flow

- **GIVEN** a player opens the production application
- **WHEN** they provide a display name and create or join a round
- **THEN** the flow completes without an Apple sign-in prompt or Apple provider configuration
