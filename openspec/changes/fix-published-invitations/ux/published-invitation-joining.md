# UX record: published invitation joining

- Change: `openspec/changes/fix-published-invitations`
- Status: draft
- Links: proposal [proposal](../proposal.md); requirements
  [requirements](../specs/durable-published-invitations/spec.md); design [design](../design.md);
  tasks [tasks](../tasks.md)
- Users and outcome: a creator shares a newly created public-development round with a golfer on
  another device; the recipient scans the QR code, joins the same lobby, and both see the roster.

## Information architecture and navigation

The existing route remains the sole invitation entry point: QR or copied link opens the join screen,
then successful joining opens the shared lobby. A failed lookup leaves the recipient in that safe
join context with their entered details intact. The creator remains in the lobby and does not need
to recreate or start the round for a recipient to join.

## Primary flow

1. The creator creates a round and sees its QR code and copy-link action in the lobby.
2. The recipient scans the QR code on another supported device.
3. The recipient sees the round context, enters personal details, and chooses **Liity
   kierrokseen**.
4. The system opens the same lobby for the recipient and refreshes both rosters.
5. Each participant confirms only their own settings; the creator can start only once the existing
   readiness conditions are met.

## States and recovery

| State             | Trigger                                            | User-visible message/action                                                                         | Recovery                                                                | Non-colour cue                                |
| ----------------- | -------------------------------------------------- | --------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- | --------------------------------------------- |
| Empty             | No invitation has been opened                      | Not applicable; the normal start screen offers create and join.                                     | Choose create or join.                                                  | Explicit action labels.                       |
| Loading           | QR link lookup or join request is in progress      | Keep the join details visible and announce the operation.                                           | Prevent duplicate submit for that request only.                         | Text/status and busy control.                 |
| Success           | A valid recipient joins                            | Open the lobby and announce successful joining.                                                     | Confirm own settings.                                                   | Updated roster count and status text.         |
| Error             | Link is unavailable                                | State that the link is no longer valid and ask for a new link.                                      | Return to a pasted link or scan a new code without clearing safe input. | Assertive text associated with the join task. |
| Permission denied | Camera access is denied                            | Offer pasted-link joining.                                                                          | Paste the copied invitation link.                                       | Text and visible input.                       |
| Offline           | The recipient has no network before joining        | State that joining requires a connection.                                                           | Reconnect and submit the existing details again.                        | Text, not colour alone.                       |
| Synchronizing     | A created or joined lobby refreshes                | Show roster refresh without moving focus.                                                           | Continue in the lobby.                                                  | Roster count and status text.                 |
| Conflict          | The lobby becomes full or starts during submission | Explain that joining is no longer available and retain read-only invitation access where permitted. | View the round or ask the creator to make a new lobby.                  | Assertive text and clear next action.         |

## Accessibility

- Keyboard order and visible focus: scan/copy or pasted-link input, personal details, and join action
  follow visual order. After successful joining, focus moves to the lobby heading. A failed request
  leaves focus on the join action and announces the error.
- Labels, instructions, and error communication: the QR image has an accessible label; the pasted
  link input and join fields retain programmatic labels. Error feedback has `role="alert"` and names
  a next action.
- Touch targets: all join, scan, copy, and retry controls are at least 44 by 44 CSS pixels.
- Contrast and status cues: all text/background combinations meet WCAG AA. Roster, busy, and error
  states use text in addition to colour.

## Alternatives, assumptions, and open questions

- **Decision:** a valid public invitation does not require the creator to start the round; joining
  remains a lobby action.
- **Alternative rejected:** ask the recipient to retry a process-local development link. That would
  not address a restart or a different server instance.
- **Assumption:** the recipient uses an HTTPS public development URL and has a network connection.
- **Open questions:** none.

## Handoff

- Visual direction needed? no; the existing invitation and status layout remains unchanged.
- Copy scope: unavailable invitation, loading, join success, offline, and lobby-conflict strings.
