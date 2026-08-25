## 1. Establish the local UX design harness

- [ ] 1.1 Install the five discoverable `vaylakaverit-*` skills under `~/.copilot/skills/` for UX
      planning, visual design, copy, frontend implementation, and critique, with the responsibility
      boundaries and handoffs defined in the approved design.
- [ ] 1.2 Configure the user-local skill metadata and instructions to identify material UI impact,
      preserve the repository's existing OpenSpec approval gates, and route work through the correct
      local design skill without modifying repository guidance.
- [ ] 1.3 Add concise English templates for UX, visual-design, copy, and UX-review records to the
      local skill directories; include required flow states, accessibility fields, evidence,
      severity, ownership, and resolution status.
- [ ] 1.4 Add a local harness check that verifies skill discovery and that material UI tasks
      reference the required planning and review record paths, without committing validation logic
      to this repository.

## 2. Create the local UI foundation

- [ ] 2.1 Define and load the semantic token stylesheet for surfaces, text, actions, status,
      borders, spacing, shape, elevation, focus, and disabled states without changing product
      behaviour.
- [ ] 2.2 Implement the initial accessible primitives in `apps/web/src/ui/` for actions, fields,
      cards, and status messages using the shared semantic tokens.
- [ ] 2.3 Add focused tests for the primitives' labels, focus treatment, disabled behaviour, status
      semantics, and token-backed styling contracts.
- [ ] 2.4 Document UI-foundation ownership and the process for proposing a missing token or shared
      primitive instead of adding a feature-local override.

## 3. Plan the current primary experience

- [ ] 3.1 Create the UX record for create round, join round, and their empty, validation, loading,
      error, success, and permission-related states.
- [ ] 3.2 Extend the UX record for active-round score entry, queued-score synchronization, retry,
      conflict recovery, and round completion with keyboard, focus, touch, and non-colour behaviour.
- [ ] 3.3 Create the visual plan for the create/join, active-round, and completed-history mobile
      screens, selecting foundation primitives, semantic tokens, hierarchy, and responsive behaviour.
- [ ] 3.4 Create Finnish copy guidance for labels, help text, invalid join links, score-save errors,
      pending synchronization, empty history, and confirmations.

## 4. Migrate the web experience

- [ ] 4.1 Refactor the create/join experience to the approved foundation and visual plan while
      preserving current API requests, guest identity, and join-link behaviour.
- [ ] 4.2 Refactor active-round summary, player, standings, and score-entry surfaces to approved
      primitives and semantic tokens without changing game or outbox behaviour.
- [ ] 4.3 Implement the documented accessible loading, error, pending, reconnecting, conflict, and
      completion feedback, including focus and assistive-technology announcements where required.
- [ ] 4.4 Refactor side-game setup and completed-history views to the approved hierarchy, components,
      tokens, responsive behaviour, and Finnish copy.
- [ ] 4.5 Remove superseded feature-local visual literals and duplicate interaction styling after all
      affected surfaces use the foundation.

## 5. Review and verify the result

- [ ] 5.1 Produce an evidence-based UX review of the working iPhone-sized create/join, active-round,
      offline-recovery, and completed-history flows; resolve or explicitly approve all High findings
      and resolve all Critical findings.
- [ ] 5.2 Add or update targeted browser-flow coverage for invalid joining, keyboard focus, score
      failures, queued-score recovery, and completed-history navigation.
- [ ] 5.3 Run formatting, type checking, unit tests, browser-flow checks, harness checks, and OpenSpec
      validation; record the review outcome and update contributor documentation.
