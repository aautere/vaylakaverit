---
scope: application
status: approved
---

# Delete user data

## Why

Players need a clear way to remove their account or local guest data without removing the shared
round records that other players rely on.

## What Changes

- Add an authenticated account-deletion endpoint.
- Anonymize the requesting player's identity and display name in active and completed shared rounds,
  while retaining round-scoped player IDs, scores, games, and results.
- Add a Finnish confirmation flow in the player UI and reset the local preview guest identity after
  deletion.

## Impact

The round-store persistence boundary, preview implementation, Cosmos implementation, API, and PWA
will support deletion. Existing shared rounds remain available to other participants.

## Non-goals

- Deleting shared rounds, other participants, scores, games, or outcomes.
- Allowing one player to request deletion for another identity.
- Recovering an anonymized identity after deletion.
