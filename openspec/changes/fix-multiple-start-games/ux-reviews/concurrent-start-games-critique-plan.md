# UX review: concurrent games at round creation

- Change: `openspec/changes/fix-multiple-start-games`
- Review status: passed
- Working preview/build and date: iPhone 13 Chromium local preview, 26 August 2026; `FUNCTIONS_WORKER_RUNTIME=node pnpm e2e`
- Links: UX [record](../ux/concurrent-start-games.md); visual plan [record](../visual-design/concurrent-start-games.md); copy [guidance](../copy/concurrent-start-games.md); [tasks](../tasks.md)

## Coverage and evidence

The iPhone-sized two-participant preview created scratch and handicap games before round creation,
showed both in the lobby, played and recalculated them alongside a side game, and retained both
their names, rewards, and results in completed history. The test also exercised invitation copying,
joining, readiness, score correction after temporary offline state, round completion, guest-data
deletion, and invitation revocation.

Source review confirms a required first card, labelled add/remove controls, 44-pixel action
components, native labelled controls, visible focus from the shared UI foundation, and focus
restoration to the added or preceding card. The Finnish headings, help, controls, loading text, and
success message match the approved copy. Card headings, textual status, and settings labels provide
non-colour cues; existing semantic token classes provide the documented surfaces.

## Findings

| ID   | Evidence                                                                                                                               | Affected UI            | Severity | Owner                   | Resolution state | Resolution / accepted rationale |
| ---- | -------------------------------------------------------------------------------------------------------------------------------------- | ---------------------- | -------- | ----------------------- | ---------------- | ------------------------------- |
| None | The documented iPhone preview and source-level accessibility review found no Critical, High, Medium, or Low issue in this scoped flow. | Concurrent start games | Low      | `vaylakaverit-frontend` | resolved         | No action required.             |

## Outcome

The concurrent-game creation flow is ready. No unresolved UX, visual, copy, or frontend finding
remains. Future changes to game-card editing or participant selection require a new UX review.
