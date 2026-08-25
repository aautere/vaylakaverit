# Finnish copy guidance: published invitation joining

- Change: `openspec/changes/fix-published-invitations`
- Status: draft
- Links: UX [record](../ux/published-invitation-joining.md); visual plan not required; tasks
  [tasks](../tasks.md)

## Voice and accessibility

Use plain Finnish that says what happened and what the recipient can do next. Do not expose storage,
server-instance, or authentication details. Errors use text associated with the join task and do not
rely on colour.

## Strings

| UI context/state      | Finnish copy                                                                   | Next action                                                           | Notes (label, announcement, limit)           |
| --------------------- | ------------------------------------------------------------------------------ | --------------------------------------------------------------------- | -------------------------------------------- |
| Page title            | `Liity kaverin kierrokseen.`                                                   | Enter details and join.                                               | Existing heading.                            |
| Navigation/control    | `Skannaa QR-koodi kameralla` / `Liity kierrokseen`                             | Scan or submit details.                                               | Existing labels.                             |
| Help text             | `Skannaa QR-koodi tai liitä liittymislinkki tähän.`                            | Scan or paste a link.                                                 | Link input instruction.                      |
| Validation/error      | `Liittymislinkki ei ole enää voimassa. Pyydä kierroksen luojalta uusi linkki.` | Ask the creator for a new link.                                       | Assertive error; do not say the round ended. |
| Empty                 | Not applicable; joining always begins with a link or QR code.                  | N/A                                                                   | No new empty state.                          |
| Loading               | `Avataan kierrosta…` / `Liitytään kierrokseen…`                                | Wait for completion.                                                  | Polite status and busy join control.         |
| Success/confirmation  | `Liityit kierrokseen. Vahvista seuraavaksi omat asetuksesi.`                   | Confirm settings.                                                     | Polite status after lobby opens.             |
| Permission denied     | `Kameran käyttö estettiin. Liitä liittymislinkki alle.`                        | Paste link.                                                           | Existing continuation.                       |
| Offline/synchronizing | `Liittyminen vaatii verkkoyhteyden. Yhdistä verkkoon ja yritä uudelleen.`      | Reconnect and retry.                                                  | Preserve entered safe details.               |
| Conflict/retry        | `Kierrokseen ei voi enää liittyä, koska se on aloitettu tai ryhmä on täynnä.`  | View the round if available or ask the creator to create a new round. | Server-confirmed join conflict.              |
