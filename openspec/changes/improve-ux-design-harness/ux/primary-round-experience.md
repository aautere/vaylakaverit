# UX record: primary round experience

- Change: `openspec/changes/improve-ux-design-harness`
- Status: approved planning record
- Links: [proposal](../proposal.md); [design](../design.md); [requirements](../specs/ux-design-workflow/spec.md); [task list](../tasks.md) tasks 3.1 and 3.2; [social-golf design](../../social-golf-games/design.md)
- Users and outcome: golfers using an iPhone outdoors create or join a two-to-four-player Golf Talma Master round, confirm their own settings, follow the shared game, record only their own scores, recover from temporary connectivity loss, and later review the result.

## Information architecture and navigation

The current experience is a single iPhone-first application state with an invitation-link entry
point. It must retain the following logical destinations; a future implementation may improve
navigation affordances without changing these product rules.

1. **Start and history** — create a round, open a valid invitation, manually paste or scan an
   invitation link, and open a completed round from the history list.
2. **Lobby** — share the invitation, see the roster and readiness, confirm only the current
   participant's name, tee, Handicap Index, and rating table; the creator starts a ready group.
3. **Active round** — see the connection state, invitation sharing, players, main-game standing,
   own score entry/correction, side-game setup, and active side games.
4. **Completed round** — see outcome, players, game settings, side games, entered scores, and final
   standings; return to the history list.

An invitation holder may view the shared round and history without score-edit permission. A joined
participant may edit only their own scores. The backend remains authoritative for readiness, round
start, score revisions, and game outcomes.

## Primary and recovery flows

| Flow                        | User action                                                                                                                        | System outcome and recovery                                                                                                                                                                                                   |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Create                      | Enter own setup and main-game choices, then choose **Luo kierros**.                                                                | Create a lobby, make the creator the current participant, and offer a QR code and copyable invitation link. On failure, retain inputs and explain the next action.                                                            |
| Join by link                | Open a valid invitation link, enter own setup, and choose **Liity kierrokseen**.                                                   | Join the round as the current participant and open the lobby. A full, expired, revoked, or malformed link does not join the user and keeps a safe way to return or paste another link.                                        |
| Join manually               | Choose **Liity kierrokseen**, scan a QR code or paste a link, then join.                                                           | Scanning fills the same link input; camera denial or lack of camera support offers pasted-link continuation.                                                                                                                  |
| Lobby and start             | Each participant confirms only their own settings; the creator chooses **Aloita kierros** once two to four participants are ready. | Refresh the roster and readiness for all participants. If requirements are not met, explain which condition remains; do not enable an unauthorized start.                                                                     |
| Record or correct own score | Select a hole and stroke count, then choose **Tallenna tulos**.                                                                    | Submit with the displayed revision. A confirmed write refreshes standings and gives a success message. A correction changes only the current participant's score and recalculates affected games.                             |
| Queue and reconnect         | Save while offline, while a prior write is pending, or after a transient server failure.                                           | Persist the own-score change locally, show its pending count and automatic retry intent, replay in creation order after online/focus/retry, then refresh the authoritative round. Do not silently overwrite a newer revision. |
| Conflict                    | A score write returns the current revision.                                                                                        | Load the authoritative round, state that the displayed score changed elsewhere, and return focus to the affected score controls so the participant can inspect and deliberately resubmit their own value.                     |
| Side game                   | Select two or more participants, upcoming-hole range, mode, optional reward, and tie rules; choose **Aloita sivupeli**.            | Start only from the next unplayed hole and preserve existing games. Invalid settings remain editable with an explanation.                                                                                                     |
| Complete and review         | Choose **Päätä kierros** after pending writes are synchronized.                                                                    | Disable completion while queued writes exist and explain why. On success, show completed history; the history item returns to its detailed result.                                                                            |

## States and recovery

| State                      | Applies to                                                                                           | User-visible requirement and next action                                                                                               | Non-colour cue                                    |
| -------------------------- | ---------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| Empty                      | History, side games, per-player completed scores                                                     | State that there are no completed rounds, side games, or scores yet and state the relevant next action.                                | Explicit text, not an empty card alone.           |
| Loading                    | Invitation lookup, history, round refresh, create/join/save/complete                                 | Keep the current context and announce that the named operation is in progress; prevent duplicate submission only for that operation.   | Text/status and disabled busy control.            |
| Success                    | Create/join, settings confirmation, saved/corrected score, copied link, completed round              | Identify what completed and where the user is now.                                                                                     | Polite status text.                               |
| Error                      | Invalid/full/expired/revoked invitation; failed create/join/settings/save/side-game/complete/history | Name the failed task in Finnish, preserve safe input, and offer a concrete retry or return action.                                     | Assertive text associated with the affected task. |
| Permission denied          | Camera, score authorization, and start authorization                                                 | Camera denial offers pasted link; score/start denial says the user can only change their own score or that only the creator can start. | Text and unavailable action state.                |
| Offline                    | Score entry and live delivery                                                                        | Say the score is retained locally and waiting to synchronize; do not imply that it is confirmed.                                       | Pending count and text.                           |
| Synchronizing/reconnecting | Outbox replay and live connection                                                                    | Say whether updates are connecting, live, polling, or reconnecting; after replay, refresh the authoritative snapshot.                  | Text status, not colour alone.                    |
| Conflict                   | Revision mismatch                                                                                    | Show that the authoritative score was refreshed, identify the affected hole, and require a deliberate new submission.                  | Assertive text and returned focus.                |

## Accessibility and interaction requirements

- The document title and current destination heading identify the task. Landmark order is header,
  primary task content, feedback, then account actions.
- Keyboard order follows the rendered mobile order. Every control has a programmatic label; grouped
  side-game checkboxes use a legend. Native submit remains available with Enter.
- All interactive controls, including copied-link, retry, history, checkbox rows, and destructive
  account action, have a visible focus indicator and a minimum 44 by 44 CSS-pixel target.
- After a successful create, join, start, or completion transition, move focus to the destination
  heading. After a field error, focus the first invalid field; after a score conflict, focus the
  hole selector. Do not move focus merely for a live standings update.
- Errors use an assertive announcement; confirmations, connection state, and queued-score count use
  polite status announcements. Labels, status text, iconography, and contrast convey meaning without
  relying on colour. All text/background pairs meet WCAG AA.
- QR content has a text alternative and a copy-link route. Camera permission is optional; it is not
  required to join.

## Decisions, alternatives, assumptions, and open questions

- **Decision:** Markdown records, not a mockup, are the authority for this flow. The mobile preview
  is later evidence, not a visual contract.
- **Decision:** direct invitation link, QR scan, and manual pasted link are equivalent join inputs;
  scanning is a convenience rather than a separate join behavior.
- **Decision:** an own score is either confirmed by the backend or visibly pending locally. Automatic
  ordered replay is preferred to a user-operated batch send because it minimizes outdoor interaction.
- **Alternative rejected:** permit local resolution of shared-game results while offline. The approved
  design keeps the server authoritative.
- **Assumption:** a participant can review a valid invitation without joining, as required by the
  social-golf specifications; the present UI needs an explicit read-only route before migration.
- **Open question returned to UX/OpenSpec:** specify the exact recovery choice after a revision
  conflict (replace, discard, or edit again) and whether a manual “retry now” control is needed in
  addition to automatic replay. Frontend and visual design must not choose either behavior.
- **Open question returned to UX/OpenSpec:** define the empty-history call to action and a visible
  explanation for disabled round completion while pending scores remain.

## Handoff

Visual direction is required for the mobile hierarchy, status prominence, foundation primitive
selection, responsive expansion, and dense score/standing information. See
[visual plan](../visual-design/primary-round-experience.md). Finnish language treatment is in
[copy guidance](../copy/primary-round-experience.md); implementation and review must not alter the
documented product behavior without an approved UX record update.
