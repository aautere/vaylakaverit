# UX record: shared scorecard

- Change: `openspec/changes/improve-score-entry`
- Status: approved
- Links: [proposal](../proposal.md); [requirements](../specs/shared-golf-games/spec.md); [tasks](../tasks.md)
- Users and outcome: joined golfers in an active round can record or correct every group member's
  score quickly from one complete iPhone-first scorecard; invitation-link viewers can follow scores
  without editing them.

## Information architecture and navigation

The active-round destination retains round identity and connection state, then presents **Tulokset**
as the first actionable section. It contains one scorecard with holes 1–18 and every player. Main
standings, side-game setup, active games, and round completion remain below the scorecard. There is
no hole-selection route or separate score-entry form. A link viewer reaches the same destination in
read-only mode and sees the join requirement adjacent to the scorecard.

## Primary flow

1. A joined participant opens the active round and scans all holes and current scores in the
   scorecard.
2. They enter or replace a valid score directly in the cell for a player and hole.
3. That cell shows that the score is being saved or retained for synchronization.
4. After confirmation, the cell's saved state clears and live standings refresh without moving focus.
5. Other participants receive the authoritative scorecard update and can continue recording any
   player's score.

## States and recovery

| State             | Trigger                                                     | User-visible message/action                                     | Recovery                                                                    | Non-colour cue                                                         |
| ----------------- | ----------------------------------------------------------- | --------------------------------------------------------------- | --------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Empty             | No scores are recorded.                                     | “Tuloksia ei ole vielä merkitty.”                               | Enter a score in any player-hole cell.                                      | Empty score cells and explicit text.                                   |
| Loading           | Active round or scorecard refresh is in progress.           | “Ladataan tuloksia.”                                            | Keep the latest scorecard context visible until refreshed.                  | Status text and unavailable cells only while their values are unknown. |
| Success           | A cell write is confirmed.                                  | “Tulos tallennettu: [Pelaaja], reikä [n].”                      | Continue with another cell.                                                 | Polite status and updated cell value.                                  |
| Error             | A score is invalid or cannot be saved.                      | Name the player and hole, and say that the score was not saved. | Correct the named cell or retry it.                                         | Inline text associated with that cell.                                 |
| Permission denied | A link viewer opens the scorecard.                          | “Liity kierrokseen, jotta voit merkitä tuloksia.”               | Join through the existing invitation flow.                                  | Read-only values and explanatory text.                                 |
| Offline           | A score change cannot be sent.                              | “Tulos odottaa yhteyttä: [Pelaaja], reikä [n].”                 | Keep playing; the existing automatic synchronization retries.               | Pending text and a pending cell marker.                                |
| Synchronizing     | A pending score is being replayed or live state reconnects. | “Tallennetaan odottavia tuloksia.”                              | Wait for confirmation; the latest authoritative scorecard then refreshes.   | Status text and per-cell pending marker.                               |
| Conflict          | The scorecard revision changed before a cell write.         | “Tulos muuttui muualla. Tarkista [Pelaaja], reikä [n].”         | Review the refreshed value and deliberately enter the intended score again. | Assertive text and focus returned to the affected cell.                |

## Accessibility

- Keyboard order and visible focus: round summary precedes the scorecard heading; each hole row
  proceeds from hole context to player score cells in visual order. Focus stays in a confirmed cell,
  and returns to the named cell after an error or conflict.
- Labels, instructions, and error communication: every editable cell is labelled with player and
  hole. The scorecard explains that each cell records one stroke count. Errors, pending state, and
  read-only access use explicit text and appropriate live announcements.
- Touch targets: every score cell and action is at least 44 by 44 CSS pixels.
- Contrast and status cues: WCAG AA; score values, read-only access, pending changes, and errors use
  text and shape or icon cues in addition to colour.

## Alternatives, assumptions, and open questions

- **Decision:** any joined participant can record and correct every player's score; this is the
  approved shared-score requirement.
- **Decision:** a cell is the unit of saving and feedback, so a player need not submit a whole
  scorecard.
- **Alternative rejected:** separate controls for selecting a player and a hole, because they do not
  provide a complete, directly editable scorecard.
- **Assumption:** the existing API's valid stroke-count range remains unchanged.
- **Open questions:** None.

## Handoff

- Visual direction: required for the dense four-player iPhone scorecard, responsive expansion,
  direct numeric score controls, and cell states; see [visual plan](../visual-design/shared-scorecard.md).
- Copy: see [Finnish copy guidance](../copy/shared-scorecard.md).
