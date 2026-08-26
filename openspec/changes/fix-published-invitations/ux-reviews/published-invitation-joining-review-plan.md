# UX review plan: published invitation joining

- Change: `openspec/changes/fix-published-invitations`
- Review status: planned — this is not a post-implementation readiness review
- Links: UX [record](../ux/published-invitation-joining.md); copy
  [guidance](../copy/published-invitation-joining.md); tasks [tasks](../tasks.md)
- Future evidence source: two independent iPhone-sized browser contexts against the published
  development environment. Use synthetic guest identities and test rounds only.

## Required future review evidence

| Area                     | Evidence to capture before readiness                                                                                                                          |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Cross-device lobby join  | Create a round on one device, scan its QR code on a second, join before start, and show the same two-player roster on both devices.                           |
| Durable recovery         | Repeat invitation lookup after API restart or idle scale-to-zero; show that the valid lobby remains available.                                                |
| Expired/revoked recovery | Open expired and revoked synthetic links; verify the Finnish error gives the next action and keeps safe join details.                                         |
| Race and limit handling  | Attempt joining after the creator starts and after four players have joined; verify a clear conflict message and no partial join.                             |
| Accessibility            | Verify focus after a successful join and after a failed request, assertive error announcement, visible focus, QR label, and 44 by 44 CSS-pixel join controls. |
| Copy                     | Compare invitation labels, loading, success, unavailable-link, offline, and conflict strings with the copy guidance.                                          |
