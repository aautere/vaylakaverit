# UX review: published invitation joining

- Change: `openspec/changes/fix-published-invitations`
- Review status: passed
- Working preview/build and date: published development PWA at
  `https://vaylakaveritdevelopmentv.z1.web.core.windows.net/`, two independent iPhone 13 Playwright
  contexts, 26 August 2026
- Links: UX [record](../ux/published-invitation-joining.md); visual plan not required; copy
  [guidance](../copy/published-invitation-joining.md); [tasks](../tasks.md)

## Coverage and evidence

The published-development review used two independent iPhone 13 contexts and synthetic guests. The
creator made a round, copied its invitation, and the recipient opened and joined it in the second
context; both lobbies showed `2 / 4 pelaajaa`. A second round survived a restart of
`vaylakaverit-development-api-veecdv`: after `/api/health` recovered, a second context joined the
same pre-restart invitation. The published verification script passed for this environment.

The local iPhone 13 browser flow covers the same invitation UI's revoked-link recovery, offline join
feedback, and joining rejection after a round has started. Source review confirms the Finnish
unavailable-link, loading, success, offline, and conflict strings match the copy guidance; labels
the QR image and all form controls; uses an assertive alert for failures and polite status for
progress and success; moves focus to the lobby heading after a successful join; and keeps join
controls and fields at least 48 CSS pixels high. Roster text, busy text, and error text provide
non-colour status cues. The reviewed flow uses the existing shared layout and status primitives;
no visual-plan change was in scope.

The published run opened the copied invitation URL rather than using a hardware camera scan. Camera
scanning was not independently exercised in this review; the labelled QR image and pasted-link
fallback remain covered by source and local-browser review.

## Findings

| ID   | Evidence                                                                                                                                                                                          | Affected UI                  | Severity | Owner                   | Resolution state | Resolution / accepted rationale |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- | -------- | ----------------------- | ---------------- | ------------------------------- |
| None | The published two-device and restart checks, local recovery coverage, and source-level accessibility and copy review found no Critical, High, Medium, or Low issue in the scoped invitation flow. | Published invitation joining | Low      | `vaylakaverit-frontend` | resolved         | No action required.             |

## Outcome

The published invitation-joining flow is ready for its approved shared-development scope. The
durable invitation requirement is evidenced across independent contexts and an API restart, while
the recovery and accessibility states are covered by the existing local iPhone-sized browser flow
and source review. A future change to QR scanning, invitation recovery, or join controls requires a
new UX review; a physical-device camera check can supplement this evidence but does not block the
supported copied-link flow.
