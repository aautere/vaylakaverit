# Design: durable published invitations

## Context

The public development site calls a Flex Consumption Function App. Its current `preview` round
store holds every round only in process memory. A subsequent request can be handled by a restarted
or different instance and cannot find the invitation, even though the creator has not started,
revoked, or allowed it to expire. Cosmos DB is already provisioned for development but is not used
there.

## Goals / Non-Goals

**Goals:**

- Preserve a new development round and its invitation across Function App instances and restarts.
- Allow separate devices to use the existing create, scan, join, lobby, and readiness flow.
- Keep the public development site usable without production Apple credentials.
- Keep local preview fully local, in-memory, and Azure-independent.

**Non-Goals:**

- Change invitation lifetime, revocation, lobby, score, or player-limit behaviour.
- Make guest sessions production authentication.
- Migrate existing in-memory development rounds; they are already unavailable after a restart.

## Decisions

### Use Cosmos DB for the published development environment

The development Function App will use the existing Cosmos round container rather than its
process-local preview store. A successful creation is therefore available to every Function App
instance until the existing completion or account-deletion flow changes it.

The alternative—keeping an in-memory store and forcing one API instance—would still lose rounds on
a restart and conflicts with the approved scale-to-zero deployment model. A separate test-only
database would add cost and operations without improving this app's first shared test environment.

### Introduce an explicit shared-guest runtime mode

The API configuration will distinguish:

- local preview: in-memory rounds, local preview guests, and polling;
- shared development: Cosmos-backed rounds, device-local pseudonymous guests, and polling;
- production: Cosmos-backed rounds, Apple identity, and Web PubSub.

The shared-guest mode is explicit so production cannot silently accept preview guest identities.
The device keeps its existing random guest identifier. The server continues to authorize player
updates and scores against that identifier; holding an invitation remains insufficient to edit a
participant's data.

The alternative—loosening the current preview-mode validation whenever Cosmos is configured—would
make the deployment safety boundary implicit and could allow guest identity in production.

### Keep polling for shared development

Shared development will poll the durable authoritative snapshot. This verifies cross-device
creation and joining without requiring the production live-update identity and Web PubSub setup.
Production continues to use Web PubSub.

### Treat an unavailable invitation as a recovery state

The client will preserve the join context and say that the link is no longer valid, with the next
action to ask the creator for a new link. The message will not claim that a round has ended, because
unavailability can also mean expiry or revocation.

## Risks / Trade-offs

- **Shared development guest data persists in Cosmos** → The existing account-deletion flow remains
  available; test participants must not use sensitive names or real scores.
- **Polling is slower than production live updates** → It is sufficient for the development
  environment and does not alter production behaviour.
- **A malformed environment setting can select the wrong mode** → Configuration unit tests and
  deployment settings will require an explicit valid mode.

## Migration Plan

1. Deploy the API configuration and shared-guest support.
2. Deploy the web build with the corrected invitation recovery text.
3. Create a new round on the public development site and join it from a second browser device
   before starting; repeat after an API restart or idle scale-to-zero.
4. Roll back by restoring the prior API package and infrastructure settings. No in-memory rounds can
   be recovered; durable guest rounds remain safely isolated by their guest identifiers.

## Open Questions

None. The approved scope uses the existing 24-hour invitation lifetime and non-production guest
testing flow.
