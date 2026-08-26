# UX record: concurrent games at round creation

- Change: `openspec/changes/fix-multiple-start-games`
- Status: approved
- Links: [proposal](../proposal.md); [requirements](../specs/shared-golf-games/spec.md); [tasks](../tasks.md)
- Users and outcome: a round creator on an iPhone can configure one or more independent, full-round
  match-play games before creating and sharing a lobby.

## Information architecture and navigation

The start screen remains the entry point. After the creator's own settings, a **Pelit alusta**
section contains numbered game cards. The creator adds a card with **Lisää peli**, removes an
additional card with **Poista peli**, and submits all cards with **Luo kierros**. The lobby, active
round, and completed history each show every start game separately. Joining and side-game flows do
not change.

## Primary flow

1. The creator sees one configured full-round game after their own settings.
2. They set its rules and use **Lisää peli** for each additional independent game.
3. They remove any unneeded additional card and choose **Luo kierros**.
4. The system validates every card together, creates the lobby, and includes each joining player in
   every configured start game.
5. Each game calculates and displays its own standing in the lobby, active round, and history.

## States and recovery

| State             | Trigger                                                    | User-visible message/action                                 | Recovery                                       | Non-colour cue                               |
| ----------------- | ---------------------------------------------------------- | ----------------------------------------------------------- | ---------------------------------------------- | -------------------------------------------- |
| Empty             | No additional game exists.                                 | The required first game card remains visible.               | Choose **Lisää peli** for another game.        | Numbered game heading.                       |
| Loading           | The creator submits the form.                              | State that the round and games are being created.           | Keep all card values until the result arrives. | Busy submit control and status text.         |
| Success           | Creation succeeds.                                         | Open the lobby with all configured games.                   | Continue sharing and confirming settings.      | Destination heading and polite confirmation. |
| Error             | A card is invalid or creation fails.                       | Name the invalid game configuration and retain all entries. | Correct the named card and retry.              | Assertive text associated with the form.     |
| Permission denied | Not applicable before a round exists.                      | Not applicable.                                             | The creator owns this step.                    | Not applicable.                              |
| Offline           | The create request cannot be sent.                         | Explain that no round was created and invite a retry.       | Retain all cards and values.                   | Assertive text, not colour alone.            |
| Synchronizing     | Not applicable before a round exists.                      | Not applicable.                                             | Normal synchronization begins after creation.  | Not applicable.                              |
| Conflict          | Not applicable because a new round has no shared revision. | Not applicable.                                             | Not applicable.                                | Not applicable.                              |

## Accessibility

- Keyboard order and visible focus: own settings precede the games heading; each card follows its
  numbered heading, controls in visual order, and remove control; **Lisää peli** follows the cards
  and **Luo kierros** follows it. Adding moves focus to the new card heading; removing restores it
  to the preceding card heading or add control.
- Labels, instructions, and error communication: every card has a programmatic heading and distinct
  labels. Help text says that games calculate independently. Errors are assertive and identify the
  affected card.
- Touch targets: at least 44x44 CSS pixels.
- Contrast and status cues: WCAG AA; headings, order, and text convey status without colour alone.

## Alternatives, assumptions, and open questions

- **Decision:** One required first card implements the approved requirement for one or more games;
  additional cards can be removed.
- **Decision:** Start games include all players who join the round. Participant subsets remain an
  active-round side-game option.
- **Alternative rejected:** require the group to create more games after starting, because it fails
  the approved concurrent-at-start requirement.
- **Assumption:** The approved scope has no product maximum for concurrent full-round games.
- **Open questions:** None; game rules are already approved.

## Handoff

- Visual direction: required for repeatable-card hierarchy and responsive presentation; see
  [visual plan](../visual-design/concurrent-start-games.md).
- Copy: see [Finnish copy guidance](../copy/concurrent-start-games.md).
