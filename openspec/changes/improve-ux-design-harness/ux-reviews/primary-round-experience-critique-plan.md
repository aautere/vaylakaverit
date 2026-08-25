# UX review plan: primary round experience

- Change: `openspec/changes/improve-ux-design-harness`
- Review status: planned — this is not a post-implementation readiness review
- Links: [UX record](../ux/primary-round-experience.md); [visual plan](../visual-design/primary-round-experience.md); [copy guidance](../copy/primary-round-experience.md); [task list](../tasks.md) task 5.1
- Future evidence source: a working local preview in two iPhone-sized browser contexts, plus
  keyboard-only checks. Do not use player data, real invitation links, or production screenshots.

## Required future review evidence

| Area                          | Evidence to capture before readiness                                                                                                                                                                                 |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Create and join               | Create a round; copy and use a synthetic local invitation link; join in another iPhone-sized context; test pasted-link and camera-denied continuation; show invalid and full/revoked link responses.                 |
| Lobby and permissions         | Confirm that each participant can change only their own settings; show readiness text and creator-only start; keyboard test the start path.                                                                          |
| Active score flow             | Save an own score and correction; show the updated standing in both contexts; verify form labels, focus visibility, focus after success/error, and 44 by 44 targets.                                                 |
| Offline and reconnect         | Disconnect one context, queue more than one own score, reconnect, verify ordered replay and authoritative refresh, then verify the pending indicator clears only after confirmation.                                 |
| Conflict and errors           | Force a revision mismatch and save failure; show Finnish assertion text, affected hole context, focus return, and deliberate recovery without overwriting another participant.                                       |
| Side games and completion     | Start a valid side game; verify disabled/invalid messages; attempt completion with a pending score; complete the round after synchronization.                                                                        |
| History                       | Open a completed result from history; verify settings, players, scores, side games, outcome, empty states, and back navigation.                                                                                      |
| Foundation and responsive use | Inspect iPhone-sized and wider layouts for `Action`, `TextField`, `Card`, and `StatusMessage` use; verify semantic token use, WCAG AA contrast, non-colour status cues, and no clipped or hover-only primary action. |
| Finnish copy                  | Compare every title, label, help text, validation, loading, confirmation, and error against the copy guidance; verify that no technical implementation detail is exposed.                                            |

## Baseline observations before migration

These are source-level observations of the currently implemented preview, not an executed
working-preview critique. They are returned work, not readiness conclusions.

| ID      | Evidence                                                                                                                                             | Affected UI                 | Severity | Owner                   | Resolution state | Resolution / rationale                                                                                        |
| ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------- | -------- | ----------------------- | ---------------- | ------------------------------------------------------------------------------------------------------------- |
| PLAN-01 | `App.tsx` still contains feature-local literal colour and spacing classes although the shared foundation defines applicable tokens and primitives.   | All primary screens         | High     | `vaylakaverit-frontend` | returned         | Migrate flow by flow in tasks 4.1–4.5; future review verifies semantic foundation use.                        |
| PLAN-02 | Source provides status roles for some feedback, but no documented focus restoration after create, join, start, completion, field error, or conflict. | Transitions and score entry | High     | `vaylakaverit-frontend` | returned         | Implement the UX-record focus contract and demonstrate it with keyboard evidence.                             |
| PLAN-03 | Completed history is rendered only when entries exist; there is no dedicated visible empty-history explanation or call to action.                    | Start/history               | Medium   | `vaylakaverit-frontend` | returned         | Implement the documented empty state and verify it in preview.                                                |
| PLAN-04 | Completion is disabled while a score is pending, but the disabled control has no adjacent explanatory copy.                                          | Active-round completion     | Medium   | `vaylakaverit-copy`     | returned         | Use the planned completion-pending wording with the frontend implementation.                                  |
| PLAN-05 | Invitation lookup shows join context, but the explicit read-only navigation for a valid link holder is not evident in the current screen.            | Invitation entry            | High     | `vaylakaverit-ux`       | returned         | Resolve the documented UX open question before implementation; visual and frontend must not infer a behavior. |

## Future outcome rules

The eventual review records each finding with fresh preview evidence, affected UI, severity, exactly
one owner, and `resolved`, `accepted` (with approved rationale), or `returned` status. Critical
findings block comprehension, task completion, or accessibility and must be resolved. High findings
must be resolved or explicitly accepted before the affected frontend work is ready. Accessible,
responsive behavior takes precedence over visual similarity to this plan.
