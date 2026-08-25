# Design: guest-first authentication

## Decision

The first production release uses only an opaque, device-bound guest session. On a browser without
a valid session, the application asks for a display name before creating or joining a round. The
browser creates and persistently stores an opaque guest credential for its browser profile; the
service stores only a one-way verifier and session metadata. The credential is neither a user
account nor a transferable invite and must not be derived from a fingerprint, email address, or
Apple identity.

Display names are required, trimmed, and limited to 1–40 visible characters. They are round-visible
labels, not unique usernames. The service records a separate guest and round-participant identifier
so two equal display names remain separately authorized.

## Session lifecycle and data clearing

| Event | Required behavior |
| --- | --- |
| Create or restore | A valid browser credential restores the same guest on that browser profile only. No sign-in screen is shown. |
| Inactivity | The service expires a guest session after 180 days since its most recent authenticated use. The next request removes the stale local credential and returns the browser to name entry. |
| Clear device data | The user explicitly chooses **Clear data on this device**. The service revokes the current device credential and the browser deletes it and all pending-score outbox items. Shared-round records, scores, and results remain unchanged; the browser no longer has access to previous rounds. |
| Browser/app storage cleared | This has the same access outcome as clear-device-data when the credential becomes unavailable. It cannot recover the previous guest or its history. |
| Delete guest data | The existing destructive deletion flow derives the current guest from its credential, anonymizes that guest in shared rounds, revokes the credential, and clears local data. It is irreversible. |

The 180-day sliding lifetime balances a completed-round review period with an explicit limit on
unclaimed guest identity. Clearing local browser data cannot reliably notify the service, so expired
or revoked credentials are enforced at every authenticated request.

## Round authorization

A guest may create a round. Creation creates the round and immediately joins the creator as its
first participant, so the creator's existing round-scoped authority remains intact: they may issue
or revoke invitations and start a ready lobby. Those rights do not grant access outside that round.

An invitation token authorizes only invitation lookup and a join attempt. It does not reveal a
round snapshot, authorize a live connection, or establish participant status. A guest becomes a
participant only after successful joining. Every round read, live-connection request, lobby update,
and score mutation requires the current guest to be a joined participant in that round. Score
mutations are further restricted to that participant's own scores. Existing creator-only start and
invite-management checks still apply.

## Removed account behavior

The release does not have an account profile or cross-device history. Consequently, the rating
table is selected and stored only in the joined round; no saved default exists. Existing completed
rounds are visible only through a still-valid device session that joined them.

Apple Sign In is deliberately deferred. A future approved recovery/history change may introduce an
optional account and a consent-based process for attaching or migrating guest history. It must not
make an account required for creating, joining, scoring, or reviewing a round.

## Security and privacy tradeoffs

Browser persistence is a convenience credential, not a recoverable identity. Anyone who can use
the same unlocked browser profile can act as that guest in its joined rounds; the product must say
this before the user clears device data and must never claim device storage is an account. The
opaque credential, server-side verifier, expiration, and round-scoped authorization prevent
invitation possession or a guessed display name from impersonating a participant.

This intentionally gives up recovery after device-data loss. It removes the immediate dependency
on Apple Developer enrollment and minimizes collected personal data. No Apple provider credentials
or account identifiers are introduced in production, preview, telemetry, or infrastructure.
