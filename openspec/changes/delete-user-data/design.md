# Design: delete user data

## Decision

`DELETE /api/account` derives the identity solely from the authenticated session and asks the round
store to delete that identity. It never accepts a target identity in the request.

The store retains each round player and all round-scoped IDs, scores, game settings, standings, and
outcomes. For every active or completed round containing the requesting identity, it clears the
identity reference, replaces the display name with `Poistettu pelaaja`, and clears the creator
identity when it is the deleted account. This preserves the other participants' history and results
without retaining the deleted account's identifier or display name.

## Local preview guests

Preview guests use the existing device-local guest identity. They can use the same deletion flow.
After a successful request, the PWA clears the local guest ID and unsent score outbox, resets its
round view, and creates a new guest identity only when the player next uses the app.

## Tradeoffs

Round-scoped player IDs and score values remain because deleting them would corrupt shared game
history and alter other participants' results. They are not linked to the deleted account after
anonymization. A deleted creator cannot start an unstarted lobby; the remaining group can create a
new shared round instead.
