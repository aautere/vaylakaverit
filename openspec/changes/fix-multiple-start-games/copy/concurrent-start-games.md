# Finnish copy guidance: concurrent games at round creation

- Change: `openspec/changes/fix-multiple-start-games`
- Status: approved
- Links: UX [record](../ux/concurrent-start-games.md); visual plan [record](../visual-design/concurrent-start-games.md); [tasks](../tasks.md)

## Voice and accessibility

Use short Finnish that says each game has its own result. Preserve visible labels, state what failed
and the next action, and do not rely on colour alone.

## Strings

| UI context/state                      | Finnish copy                                                                 | Next action                                | Notes                                                 |
| ------------------------------------- | ---------------------------------------------------------------------------- | ------------------------------------------ | ----------------------------------------------------- |
| Section title                         | `Pelit alusta`                                                               | Review or configure games.                 | Heading after creator settings.                       |
| Help                                  | `Voit pelata useaa peliä samanaikaisesti. Jokainen peli lasketaan erikseen.` | Add or edit a game.                        | Visible text under the title.                         |
| Card heading                          | `Peli {n}`                                                                   | Configure that game.                       | Number cards from 1.                                  |
| Add action                            | `Lisää peli`                                                                 | Add a game card.                           | Secondary action.                                     |
| Remove action                         | `Poista peli`                                                                | Remove the additional card.                | Include game number in its accessible name if needed. |
| Required-game error                   | `Valitse vähintään yksi peli.`                                               | Keep the first game or add another.        | Assertive form error.                                 |
| Invalid-game error                    | `Tarkista pelin {n} asetukset.`                                              | Correct the named card and retry.          | Assertive error near the card.                        |
| Loading                               | `Luodaan kierrosta ja pelejä…`                                               | Wait.                                      | Busy create action and polite status.                 |
| Success                               | `Kierros ja pelit luotiin.`                                                  | Share the invitation and confirm settings. | Polite lobby confirmation.                            |
| Offline/error                         | `Kierrosta ja pelejä ei voitu luoda. Tarkista yhteys ja yritä uudelleen.`    | Retry.                                     | Retain entered settings.                              |
| Permission, synchronization, conflict | Not applicable before a round exists.                                        | Not applicable.                            | No shared state exists yet.                           |
