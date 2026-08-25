# UX record: guest-first authentication

- Change: `openspec/changes/guest-first-authentication`
- Status: approved planning record
- Links: [proposal](../proposal.md); [design](../design.md); [guest requirements](../specs/guest-first-authentication/spec.md); [round requirements](../specs/shared-golf-games/spec.md); [tasks](../tasks.md)
- Users and outcome: golfers on their own iPhones provide a display name once, then create or join a shared round without an account. They understand that access remains on this browser only, can score only for themselves, and can deliberately clear or delete their guest data.

## Information architecture and navigation

1. **Start** — offers create round and join round. A browser with no valid guest session sees the display-name field in the selected task context; a valid session continues directly.
2. **Join** — a QR scan or pasted/opened invitation opens a join confirmation with the display name. The round is not visible before joining. Invalid, full, expired, and revoked invitations retain a safe route to Start.
3. **Lobby, active round, and joined history** — retain existing round navigation, but expose no unjoined or link-only round content. A guest can change only their own lobby settings and scores.
4. **Device data** — a settings route distinguishes clearing this device (access reset) from deleting guest data (irreversible shared-history anonymization). Both return to Start with focus on its heading.

## Primary flow

1. A new browser chooses **Luo kierros** or opens/scans/pastes an invitation. It enters a visible display name and receives concise help that this creates a guest session for this browser only.
2. On creation, the guest becomes the first joined participant, sees the lobby and QR/link sharing controls, and may later start the round when existing readiness rules pass.
3. On joining, the guest confirms the join. Only after success does the lobby load; if the round is full or the link is invalid, no round details are disclosed.
4. In a joined round, every participant may update only their own settings and submit or correct only their own scores. A guest creator also has existing round-scoped invitation and start actions.
5. After 180 days without authenticated use, an expired session returns to display-name entry. The prior rounds cannot be recovered from that browser as the prior guest.
6. The guest may clear device data to revoke only this browser's access, or choose delete guest data to irreversibly anonymize their identity in shared rounds. Both actions explain their distinct outcomes before confirmation.

## States and recovery

| State | Trigger | User-visible message/action | Recovery | Non-colour cue |
| --- | --- | --- | --- | --- |
| Empty | New browser or no valid guest | Explain that only a display name is needed to create or join. | Enter name and choose task. | Heading and instructional text. |
| Loading | Creating/restoring guest, invitation lookup, joining, clearing, or deleting | Keep the active form/context and mark its submit action busy. | Wait; do not allow duplicate submit. | Status text and disabled busy action. |
| Success | Guest created, round joined, device cleared, or data deleted | State the result and destination; do not call a session an account. | Move to lobby or Start. | Polite status text. |
| Error | Invalid name, create/join failure, invalid/full/expired/revoked link, clear/delete failure | Preserve safe name input where applicable and state the corrective action in Finnish. | Correct, retry, or return to Start. | Inline/assertive text. |
| Permission denied | Unjoined round access, another player's mutation, or non-creator start | Explain that a guest can use only joined rounds and only their own changes; name creator-only action when applicable. | Join the round or return to own controls. | Text plus unavailable control. |
| Offline | Guest creation, join, clear, or delete attempted offline | State that identity/access changes need a connection; retain non-sensitive input. Existing own-score queue behavior applies only after joining. | Reconnect and retry deliberately. | Textual connection status. |
| Synchronizing | Existing joined-round outbox replay | Show existing pending-score status; guest session remains valid unless server rejection reports expiry/revocation. | Refresh authoritative joined-round state. | Pending count and status text. |
| Conflict | Stale session, revoked session, or simultaneous clear/delete | Do not retry with the old credential; remove it and explain that a new display name starts a new guest. | Return focus to display name. | Assertive status and reset state. |

## Accessibility

- Keyboard order and visible focus: Start heading, task choice, display-name label/help/input/error, primary action, secondary navigation, then data actions. On create/join success focus the lobby heading; on name error focus the name field; on expired/revoked session or clear/delete completion focus the Start heading. Never move focus for a live round update.
- Labels, instructions, and error communication: The display-name field has a persistent Finnish label, hint, character limit, and associated error. Invitation links have text/copy alternatives to QR scanning. Clear and delete actions state whether shared-round data changes; delete requires a clear destructive confirmation. Errors use assertive announcements; success and connection state use polite announcements.
- Touch targets: every task choice, QR/copy control, input, confirmation, and data action is at least 44 by 44 CSS pixels.
- Contrast and status cues: WCAG AA contrast is required. Expiry, busy, permission, destructive, and success states use explicit text and appropriate icons/status semantics, never colour alone.

## Alternatives, assumptions, and open questions

- **Decision:** guests can create rounds. Creation joins the creator immediately; creator authority remains round-scoped and does not become an account role.
- **Decision:** invitation holders cannot view a round before joining. This removes public data exposure and makes guest access consistently limited to joined rounds.
- **Decision:** a session lasts 180 days after its last authenticated use. Clear-device-data preserves shared records; delete-guest-data anonymizes the guest in them.
- **Alternative rejected:** retain Apple Sign In now for history recovery. It requires Developer enrollment and adds unnecessary account friction.
- **Alternative rejected:** use the display name as an identity or allow a link-only viewer. Neither meets the privacy or joined-round authorization boundary.
- **Assumption:** a browser profile is the meaningful device boundary; private browsing and clearing browser storage can lose access and must be explained.
- **Open question:** none. Future account recovery and cross-device history are explicitly out of scope and require a new approved change.

## Handoff

- Visual direction needed? yes; the start/join decision, guest-session explanation, join confirmation, and destructive data choices need hierarchy and responsive treatment.
- Copy scope: Finnish labels, 40-character guidance, browser-only explanation, invitation states, permissions, expiry, clear-device-data, and irreversible delete-guest-data wording.
