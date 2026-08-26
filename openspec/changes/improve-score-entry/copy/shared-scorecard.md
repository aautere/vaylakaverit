# Finnish copy guidance: shared scorecard

- Change: `openspec/changes/improve-score-entry`
- Status: approved
- Links: UX [shared scorecard](../ux/shared-scorecard.md); visual plan [shared scorecard](../visual-design/shared-scorecard.md); tasks [tasks](../tasks.md)

## Voice and accessibility

Use short, plain Finnish that tells the player what changed and what they can do next. Mention the
affected player and hole for a cell-specific outcome. Labels and status messages must remain
understandable without colour, and must not expose transport, revision, or other implementation
details.

## Strings

| UI context/state      | Finnish copy                                          | Next action                                                    | Notes (label, announcement, limit)                 |
| --------------------- | ----------------------------------------------------- | -------------------------------------------------------------- | -------------------------------------------------- |
| Page title            | Tulokset                                              | Review or enter scores.                                        | Scorecard heading.                                 |
| Navigation/control    | Reikä                                                 | Scan the course holes.                                         | Column label.                                      |
| Navigation/control    | Lyönnit                                               | Enter a stroke count.                                          | Player score-column label.                         |
| Help text             | Voit merkitä kaikkien pelaajien tulokset.             | Enter a score in the relevant cell.                            | Visible before the scorecard.                      |
| Empty                 | Tuloksia ei ole vielä merkitty.                       | Merkitse tulos mille tahansa reiälle.                          | Neutral text status.                               |
| Loading               | Ladataan tuloksia.                                    | Wait for the scorecard to refresh.                             | Polite status.                                     |
| Success/confirmation  | Tulos tallennettu: [Pelaaja], reikä [n].              | Continue entering scores.                                      | Polite, cell-specific status.                      |
| Validation/error      | Anna kelvollinen tulos: [Pelaaja], reikä [n].         | Correct the named score cell.                                  | Inline assertive error.                            |
| Permission denied     | Liity kierrokseen, jotta voit merkitä tuloksia.       | Use the existing join flow.                                    | The scorecard remains readable.                    |
| Offline/synchronizing | Tulos odottaa yhteyttä: [Pelaaja], reikä [n].         | Continue playing; the score is sent automatically.             | Pending cell text.                                 |
| Offline/synchronizing | Tallennetaan odottavia tuloksia.                      | Wait for confirmation.                                         | Polite status with pending count where applicable. |
| Conflict/retry        | Tulos muuttui muualla. Tarkista [Pelaaja], reikä [n]. | Review the refreshed score and enter the intended value again. | Assertive status and focus return.                 |
