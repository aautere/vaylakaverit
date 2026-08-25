## ADDED Requirements

### Requirement: Material user experience is deliberately planned

The local user harness SHALL identify a new or materially changed user-facing screen, form,
navigation path, workflow, information hierarchy, or interaction rule as UX-impacting work.
Before frontend implementation begins, the change SHALL contain a durable English UX record that
defines the users, intended outcome, information architecture, primary flow, meaningful
alternatives, assumptions, and open questions. Backend-only work, copy-only corrections, and local
visual polish SHALL not require a new UX record unless they alter documented user behaviour.

#### Scenario: A score-entry flow is changed

- **GIVEN** an approved change adds or changes a player-facing score-entry flow
- **WHEN** its implementation tasks are prepared
- **THEN** the change contains a UX record for the flow before frontend implementation starts

#### Scenario: A backend validation rule changes without a new interaction

- **GIVEN** an approved change modifies only backend validation and preserves the existing interface
- **WHEN** its implementation tasks are prepared
- **THEN** the change does not require a separate UX record

### Requirement: UX records define complete and accessible flows

Each UX record SHALL define navigation and recovery paths plus applicable empty, loading, success,
error, permission-denied, offline, synchronizing, and conflict states. It SHALL state keyboard
behaviour, visible focus, labels, error communication, touch-target expectations, and non-colour
cues for every primary user flow.

#### Scenario: A score is waiting for synchronization

- **GIVEN** a player enters a score while the connection is unavailable
- **WHEN** the UX record is reviewed
- **THEN** it defines how the pending state, retry, recovery, and any conflict are communicated

### Requirement: UX planning remains tool-optional

The local user harness SHALL treat the repository Markdown UX record as the authoritative planning
artifact. An external mockup or design tool MAY support communication, but SHALL not be required
to define or approve a user flow.

#### Scenario: A flow is planned without a mockup

- **GIVEN** the team documents a complete user flow in Markdown
- **WHEN** no external design file exists
- **THEN** the UX planning stage is complete

### Requirement: UX decisions have an explicit visual-design handoff

The local UX workflow SHALL hand off to local visual design only when hierarchy, layout, responsive
behaviour, component selection, or other visual direction requires a decision. It SHALL return
unresolved behavioural questions to UX planning instead of deciding them in visual design or
frontend code.

#### Scenario: A visual plan lacks a join-flow decision

- **GIVEN** visual design needs to know whether a joined player can edit a shared setting
- **WHEN** the UX record does not define that behaviour
- **THEN** the issue is returned to UX planning before visual design proceeds
