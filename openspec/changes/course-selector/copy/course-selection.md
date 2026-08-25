# Finnish copy guidance: course selection

- Change: `openspec/changes/course-selector`
- Status: approved planning record
- Links: [UX record](../ux/course-selection.md); [visual plan](../visual-design/course-selection.md);
  [tasks](../tasks.md)

## Voice and accessibility

Use short Finnish wording that helps a golfer choose before playing. State the course and length in
text; a selected border or icon is supporting feedback only. “18 reikää (2 × 9 reikää)” explicitly
explains repetition without technical course-data language.

## Strings

| UI context/state | Finnish copy | Next action | Notes (label, announcement, limit) |
| --- | --- | --- | --- |
| Page/section title | `Valitse kenttä ja kierroksen pituus` | Select a course. | Group heading. |
| Course label | `Kenttä` | Choose Golf Talma Master or Rock Golf. | Radio-group legend. |
| Talma choice | `Golf Talma Master · 18 reikää` | Select the course. | No separate length choice appears. |
| Rock choice | `Rock Golf` | Select the course. | Reveals length group. |
| Length label | `Kierroksen pituus` | Choose 9 or 18 holes. | Radio-group legend, only for Rock Golf. |
| Rock 9-hole choice | `9 reikää` | Play one round of Rock Golf's layout. | Option label. |
| Rock 18-hole choice/help | `18 reikää (2 × 9 reikää)` / `Pelaat Rock Golfin yhdeksän reikää kahdesti.` | Confirm the desired length. | Visible help, not tooltip-only. |
| Selected summary | `{course} · {holes} reikää` | Continue to tee selection. | For Rock 18, use `Rock Golf · 18 reikää (2 × 9)`. |
| Rock rating-table information | `Pelitasoitustaulukko: miehet` / `Rock Golfilla käytetään tällä hetkellä miesten pelitasoitustaulukkoa.` | Continue to player setup. | Labelled information row; do not hide the applied table. |
| Unavailable Rock rating table | `Rock Golfilla ei voi tällä hetkellä käyttää naisten pelitasoitustaulukkoa. Käytössä on miesten pelitasoitustaulukko.` | Continue with the available table. | Assertive text only after a stale or invalid women's selection. |
| Loading | `Kenttiä ladataan…` | Wait. | Polite status. |
| Course unavailable | `Kenttäasetuksia ei voitu ladata. Yritä uudelleen.` | `Yritä uudelleen` | Assertive status near selector. |
| Stale selection | `Kentän asetukset päivittyivät. Valitse kenttä ja kierroksen pituus uudelleen.` | Reselect deliberately. | Return focus to course group. |
| Missing selection | `Valitse kenttä ja kierroksen pituus ennen kierroksen luontia.` | Select required values. | Field validation. |
| Offline | `Uuden kierroksen luominen tarvitsee yhteyden. Yritä uudelleen, kun yhteys palautuu.` | Reconnect and submit. | Do not imply that an unsent round exists. |
| Second pass context | `Toinen kierros, reikä {sourceHole}` | Enter or review the score. | Pair with primary `Reikä {roundHole}` label. |
| Success | `Kierros luotiin: {course}, {holes} reikää.` | Continue to lobby. | Polite confirmation and destination focus. |
| Permission denied | `Ei sovellu: kentän valinta on kaikkien kierroksen luojien käytettävissä.` | N/A. | No permission-specific UI is expected. |
| Synchronizing/conflict | `Ei sovellu: valinta vahvistetaan, kun kierros luodaan.` | N/A. | Existing round sync remains unchanged. |

All controls retain visible labels. Loading uses a polite live region; validation, unavailable
configuration, and stale-selection errors use an assertive region associated with the affected
group.
