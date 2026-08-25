# UX review plan: guest-first authentication

- Change: `openspec/changes/guest-first-authentication`
- Review status: planned — not a post-implementation readiness review
- Links: [UX record](../ux/guest-first-authentication.md); [visual plan](../visual-design/guest-first-authentication.md); [copy guidance](../copy/guest-first-authentication.md); [tasks](../tasks.md) task 4.2

## Required future review evidence

| Area                   | Evidence to capture before readiness                                                                                                                                         |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| First use              | In an iPhone-sized browser with no session, enter a valid name, create a round, and show that no Apple, email, password, or account prompt occurs.                           |
| Name validation        | Submit blank, whitespace-only, and 41-character names; verify Finnish error text, focus return, and no guest creation.                                                       |
| Join isolation         | Open a synthetic link in a second browser, verify no round content before joining, join with a name, then verify joined lobby access.                                        |
| Authorization          | Attempt to read an unjoined round and mutate another participant's lobby settings and score; capture clear denial without data or mutation exposure.                         |
| Creator boundary       | Create as a guest, share the invitation, and show the creator can manage invitations/start only in that joined round.                                                        |
| Session lifecycle      | Force expiry/revocation, verify stored credential removal, name-entry recovery, and no access to former history.                                                             |
| Clear and delete       | Verify clear-device-data removes browser access and pending outbox while shared records remain; verify delete anonymizes only the requester and is irreversible.             |
| Accessibility and copy | Keyboard-test all flows and confirmations; verify focus restoration, labels, status announcements, 44 by 44 targets, WCAG AA/non-colour cues, and all approved Finnish copy. |

## Future outcome rules

Record each finding with evidence, affected UI, severity, exactly one owner, and `resolved`,
`accepted` with approved rationale, or `returned` status. Critical findings block readiness. High
findings must be resolved or explicitly accepted before the affected frontend work is ready.
