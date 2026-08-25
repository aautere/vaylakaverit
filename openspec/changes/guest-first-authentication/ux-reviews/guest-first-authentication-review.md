# UX review: guest-first authentication

- Change: `openspec/changes/guest-first-authentication`
- Review status: passed
- Working preview/build and date: local Node 22 preview; Playwright iPhone 13 Chromium evidence, 25 August 2026
- Links: UX [guest-first-authentication.md](../ux/guest-first-authentication.md); visual plan [guest-first-authentication.md](../visual-design/guest-first-authentication.md); copy [guest-first-authentication.md](../copy/guest-first-authentication.md); tasks [tasks.md](../tasks.md)

## Coverage and evidence

- The iPhone-sized two-browser flow creates a guest from a display name, joins the second guest
  through a copied invitation link, confirms separate lobby settings, starts the round, records and
  queues a score offline, synchronizes it, and reviews completed history.
- The iPhone-sized data flow confirms both **Clear data on this device** and irreversible **Delete
  guest data**. The browser returns to Start with the documented Finnish success status after each.
- The keyboard flow tabs to the persistent display-name label/control, submits it with Enter, and
  verifies that focus moves to the lobby destination heading.
- API tests cover invalid display names, opaque credentials, 180-day sliding expiration, revocation,
  link-only non-disclosure, joined-round isolation, own-score authorization, completed-history
  isolation, and only-current-guest anonymization.
- The start/join flow uses `Card`, `TextField`, `Action`, and `StatusMessage`. It provides
  44-by-44-or-larger controls, visible foundation focus treatment, text status cues, QR/link
  alternatives, and the approved Finnish labels. Existing shared semantic token styles provide
  WCAG AA treatments for the added information, success, error, and destructive states.

## Findings

| ID     | Evidence                                                                                                       | Affected UI                                 | Severity | Owner                   | Resolution state | Resolution / accepted rationale                                                                                                                                             |
| ------ | -------------------------------------------------------------------------------------------------------------- | ------------------------------------------- | -------- | ----------------------- | ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GFA-01 | Initial preview startup prompted for a Functions worker runtime when no ignored `local.settings.json` existed. | Local preview and browser-flow verification | High     | `vaylakaverit-frontend` | resolved         | The API development command explicitly sets `FUNCTIONS_WORKER_RUNTIME=node`, so `pnpm preview` starts the guest API without local credentials or interactive configuration. |
| GFA-02 | A concurrent Cosmos session restore could overwrite a clear/delete revocation.                                 | Clear and delete guest data                 | High     | `vaylakaverit-frontend` | resolved         | Cosmos guest-session writes now use ETag conditions and retry from the latest record. A regression test verifies a concurrent revocation leaves the credential unusable.    |

## Outcome

The approved guest-first flow is ready. No Critical or unresolved High findings remain. A future
optional account-recovery or cross-device-history change requires a new UX record and review.
