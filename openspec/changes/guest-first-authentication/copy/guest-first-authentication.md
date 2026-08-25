# Finnish copy guidance: guest-first authentication

- Change: `openspec/changes/guest-first-authentication`
- Status: approved planning record
- Links: [UX record](../ux/guest-first-authentication.md); [visual plan](../visual-design/guest-first-authentication.md); [tasks](../tasks.md) task 3.1
- Principle: use short plain Finnish. Say **vierasistunto**, not account, and never imply recovery after device data is cleared.

| UI context/state | Finnish copy | Next action |
| --- | --- | --- |
| Display name | `Nimi kierrokselle` / `Kirjoita nimi, jolla muut pelaajat tunnistavat sinut.` | Enter 1–40 characters. |
| Browser-only help | `Nimesi tallennetaan tälle selaimelle. Et tarvitse tiliä tai salasanaa.` | Create or join. |
| Create | `Luo kierros` / `Luo kierros omalla nimelläsi ja kutsu kaverit mukaan.` | Create round. |
| Join | `Liity kierrokseen` / `Liity omalla nimelläsi.` | Confirm join. |
| Invalid name | `Kirjoita 1–40 merkin nimi.` | Correct name. |
| Join privacy | `Näet kierroksen tiedot, kun olet liittynyt siihen.` | Join or return. |
| Invalid/full link | `Tähän kierrokseen ei voi liittyä tällä linkillä.` / `Kierros on jo täynnä.` | Ask for a new link or return. |
| Own-data permission | `Voit muuttaa vain omia asetuksiasi ja tuloksiasi.` | Return to own controls. |
| Unjoined access | `Liity kierrokseen nähdäksesi sen tiedot.` | Join or return. |
| Expired session | `Tämän selaimen vierasistunto on vanhentunut. Kirjoita nimi jatkaaksesi.` | Enter name. |
| Clear device | `Tyhjennä tämän laitteen tiedot` / `Poistaa tältä selaimelta vierasistunnon ja tallentamattomat tulokset. Yhteiset kierrokset säilyvät muille pelaajille.` | Cancel or clear. |
| Clear success | `Tämän laitteen vierastiedot tyhjennettiin.` | Return to Start. |
| Delete guest data | `Poista vierastietoni` / `Nimesi ja tunnisteesi anonymisoidaan yhteisistä kierroksista. Toimintoa ei voi perua.` | Cancel or delete. |
| Delete success | `Vierastietosi poistettiin.` | Return to Start. |
| Offline identity action | `Toiminto vaatii verkkoyhteyden. Yritä uudelleen, kun yhteys palautuu.` | Retry after reconnect. |

Use a persistent field label, not a placeholder alone. Pair every status with the relevant control
and an explicit action. `Tyhjennä tämän laitteen tiedot` must remain visually and semantically
distinct from irreversible `Poista vierastietoni`.
