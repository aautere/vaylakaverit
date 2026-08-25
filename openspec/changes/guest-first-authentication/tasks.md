# Implementation Tasks

Task-list approval is required before any implementation begins.

## 1. Replace the identity boundary

- [ ] 1.1 Remove the production Apple Sign In dependency and account-profile assumptions from the
      authentication configuration, API contracts, data model, and deployment configuration without
      adding another identity provider.
- [ ] 1.2 Implement opaque device-bound guest-session creation and restoration from a required
      display name; validate the 1–40 visible-character rule without treating names as unique IDs.
- [ ] 1.3 Enforce the 180-day sliding inactivity expiry and invalid-credential handling at every
      authenticated boundary; clear stale browser credentials when the service rejects them.
- [ ] 1.4 Implement explicit clear-device-data and irreversible delete-guest-data flows, including
      credential revocation, local-outbox clearing, shared-history preservation/anonymization, and
      Finnish destructive confirmation copy.

## 2. Apply guest round authorization

- [ ] 2.1 Allow a guest to create a round and become its first joined participant, retaining only
      existing creator-only invite and lobby-start authority in that round.
- [ ] 2.2 Change QR/link invitations to authenticate a guest and join them as a participant; reject
      public or link-only round reads and live connections before joining.
- [ ] 2.3 Enforce joined-round access for reads, lobby changes, invitation management, and live
      connections, and enforce own-participant authorization for every score mutation.
- [ ] 2.4 Remove persisted profile defaults and store the selected rating table solely with each
      round participant.

## 3. Build the guest-first user flow

- [ ] 3.1 Implement the approved display-name, create, QR/link join, session-expiry, clear-data, and
      guest-data-deletion flows using the linked UX, visual, and Finnish copy records.
- [ ] 3.2 Preserve accessible keyboard order, focus restoration, live-status feedback, non-colour
      cues, WCAG AA contrast, and 44 by 44 CSS-pixel targets across the new flow.
- [ ] 3.3 Update local preview to use the same guest-first production behavior without Apple Sign In
      or provider credentials.

## 4. Verify and document

- [ ] 4.1 Add targeted tests for guest creation, restoration, name validation, expiry, clear/delete
      behavior, guest round creation, QR/link joining, joined-round isolation, own-score
      authorization, and per-round rating-table selection.
- [ ] 4.2 Exercise the UX review evidence in two iPhone-sized browser contexts, including keyboard
      use, expired credentials, clear/delete recovery, and unauthorized-round attempts; resolve or
      explicitly approve all High findings and resolve all Critical findings.
- [ ] 4.3 Run applicable formatting, type checking, unit, integration, browser-flow, harness, and
      OpenSpec validation; update player and developer documentation without exposing credentials.
