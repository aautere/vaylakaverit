---
scope: application
status: approved
---

# Fix published invitations

## Why

Players testing the published development application cannot reliably join a newly created round
from another device. The deployment currently uses an in-memory preview round store, so a round can
be unavailable to a later request when the Function App restarts or serves requests from another
instance. This makes the QR invitation fail before the creator starts the round.

## What Changes

- Make rounds and invitations created in the publicly reachable development environment durable and
  available to another device for their existing 24-hour lifetime.
- Retain a non-production guest testing experience so testers can create and join rounds without
  production sign-in.
- Keep local `pnpm preview` ephemeral and independent of Azure credentials.
- Surface a clear recovery error when an invitation has genuinely expired or been revoked.

## Impact

The deployment configuration, API configuration validation, durable round storage, and invitation
integration coverage will change. The development environment will persist pseudonymous guest
round data and use the already provisioned data services, incurring their existing serverless usage
costs.

## Non-goals

- Changing invitation expiry, revocation, player-limit, or lobby-readiness rules.
- Requiring Apple sign-in in the development test environment.
- Turning local preview data into persistent data.
