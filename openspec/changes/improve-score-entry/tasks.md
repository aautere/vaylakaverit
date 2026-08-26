# Implementation Tasks

## 1. Shared score authorization and synchronization

- [ ] 1.1 Update the score mutation contract and authorization so any joined active-round participant
      can create or correct a score for any player in that round, while invitation-link viewers and
      non-members remain read-only.
- [ ] 1.2 Preserve target player and hole identity through persisted score updates, live snapshots,
      revision conflicts, and offline pending-write replay without changing game calculation rules.
- [ ] 1.3 Add targeted API, store, and synchronization coverage for shared entry, shared correction,
      viewer rejection, non-member rejection, target-player validation, conflicts, and pending replay.

## 2. Complete active-round scorecard

- [ ] 2.1 Replace the single-hole score-entry form with an accessible 18-hole, all-player scorecard
      using direct numeric score cells and no hole-selection dropdown.
- [ ] 2.2 Implement the approved iPhone-first grid and responsive expansion so two to four players'
      controls have clear boundaries, meet 44 by 44 CSS-pixel targets, and do not overlap.
- [ ] 2.3 Add cell-level pending, success, validation, permission, offline, synchronization, and
      conflict feedback with the documented focus restoration and Finnish wording.
- [ ] 2.4 Add targeted frontend coverage for scorecard rendering, direct shared entry and correction,
      read-only viewer mode, keyboard sequence, focus recovery, and iPhone-sized non-overlapping
      layout.

## 3. Review and close

- [ ] 3.1 Review the implemented active round against the approved UX, visual-design, and copy
      records in the shared development environment; record and resolve required findings in a
      `ux-reviews/` record.
- [ ] 3.2 Run the active task's targeted checks, the UX harness check with visual-design requirements,
      and OpenSpec validation; update these artifacts if implementation changes an approved behavior.
