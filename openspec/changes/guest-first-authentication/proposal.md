---
scope: application
status: draft
---

# guest-first-authentication

<!--
Keep status: draft until the user explicitly approves this proposal in chat.
Then change it to status: approved before creating design, specs, and tasks.
Delete this comment when completing the proposal.
-->

## Why

<!-- What problem does this solve, and for whom? -->

## What Changes

<!-- Describe the user-visible outcome and important scope decisions. -->

## Impact

<!-- Note affected capabilities, data, integrations, privacy, or operating costs. -->

## Non-goals

<!-- Name intentionally excluded work so the scope remains clear. -->
---
scope: application
status: approved
---

# Guest-first authentication

## Why

The planned production Sign in with Apple dependency requires an Apple Developer account and adds
account setup before friends can start a shared golf round. The approved product direction is to
remove that dependency for now: a player needs only a display name, and their browser creates a
device-bound guest session.

## What Changes

- Replace production Apple Sign In and account profiles with a guest-first session created after a
  player provides a display name. The product does not ask for a password, email address, or
  App Store account.
- Let a guest create a round as its first joined participant, or join a round through its QR code
  or invitation link. A guest can access only rounds they have joined and can mutate only their own
  scores and lobby settings; a guest creator retains the existing round-scoped invite and start
  authority.
- Make an invitation a join route rather than a public read-only round-viewing credential. Opening
  it shows only the join context until the guest joins.
- Retain the opaque device-bound session for 180 days after its most recent authenticated use.
  Clearing device data revokes that session, removes its local credential and pending-score outbox,
  and removes access from that browser without deleting shared-round records. A separate irreversible
  guest-data deletion flow anonymizes the guest in shared rounds.
- Remove account-profile behavior, including a saved rating-table default. Each participant selects
  a rating table only for the round they join.
- Reserve optional account recovery and cross-device history for a later approved change; it may
  use Apple Sign In or another provider, but is not part of this release.

## Capabilities

### New Capabilities

- `guest-first-authentication`: Creates, restores, expires, clears, and deletes device-bound guest
  sessions without a third-party identity provider.

### Modified Capabilities

- `shared-golf-games`: Uses guest sessions for creation and QR/link joining, confines access and
  mutations to joined rounds and the current participant, and removes signed-in profile settings.
- `social-golf-quality`: Replaces Apple-account history assumptions with guest-session retention,
  clear-data behavior, guest-data deletion, and Apple-independent local preview.

## Impact

This supersedes **social-golf-games task 2.5**. Its unstarted Apple Sign In scope must be replaced
by the approved tasks in this change; no Apple Developer account, Apple credentials, Key Vault
secret, or Apple identity-provider runtime dependency is needed for the guest-first release.

Future implementation will change authentication/session boundaries, round authorization,
invitation handling, browser storage, data-retention behavior, and related UI. It does not change
golf rules, course data, live-update transport, or the existing shared-round player limit.

## Non-goals

- Implementing application, infrastructure, credential, provider, or migration code in this change.
- Password, email, social, App Store, or other account registration.
- Cross-device access, account recovery, persistent personal profiles, or history transfer.
- Public or link-only viewing of a round without joining it.
- Changing round scoring, game rules, course selection, player limits, or payment behavior.
