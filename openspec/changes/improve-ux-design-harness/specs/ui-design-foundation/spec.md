## ADDED Requirements

### Requirement: Visual plans are separated from interaction decisions

For UX-impacting work that requires visual direction, the repository SHALL maintain an English
visual plan linked to its UX record. The visual plan SHALL define hierarchy, selected shared and
domain-specific components, semantic token intent, important visual states, and responsive
behaviour without redefining user-flow decisions or serving as a pixel-perfect implementation
contract.

#### Scenario: A round screen receives a visual redesign

- **GIVEN** an approved UX record for the round screen
- **WHEN** visual direction is needed before implementation
- **THEN** a linked visual plan defines the screen hierarchy, mobile layout, states, components, and
  semantic token intent

### Requirement: The UI foundation owns reusable visual decisions

The web application SHALL use a shared UI foundation for semantic colour, typography, spacing,
shape, elevation, and interaction-state tokens. Reusable accessible primitives SHALL consume those
tokens. Feature code MUST NOT establish a parallel master token system or use literal visual values
where an applicable semantic token exists.

#### Scenario: A primary score action is implemented

- **GIVEN** the shared UI foundation defines the primary-action token and button primitive
- **WHEN** a score-saving action is implemented
- **THEN** the action uses the shared primitive and semantic token rather than feature-local styling

### Requirement: Shared foundation gaps are resolved explicitly

The system SHALL require a documented visual-plan gap to return to visual design for a plan
adjustment or a separately approved foundation change. Implementation MUST NOT conceal a missing
token or reusable primitive with feature-local overrides.

#### Scenario: A plan needs a status treatment that does not exist

- **GIVEN** a visual plan specifies an offline-status treatment
- **WHEN** the foundation has no semantic status token or accessible primitive for it
- **THEN** the implementation records a foundation decision before adding the treatment

### Requirement: Mobile outdoor accessibility is preserved

The UI foundation and visual plans SHALL support the product's iPhone-first outdoor-use requirement
with WCAG AA contrast, visible keyboard focus, touch targets of at least 44 by 44 CSS pixels, and
states distinguishable without colour alone.

#### Scenario: A pending score is shown

- **GIVEN** a score is pending synchronization
- **WHEN** the UI renders the status
- **THEN** it communicates the state with text or another non-colour cue and retains compliant
  contrast and touch targets for available actions
