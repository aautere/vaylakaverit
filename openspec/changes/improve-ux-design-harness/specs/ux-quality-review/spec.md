## ADDED Requirements

### Requirement: UX quality is reviewed against documented intent

Each material frontend implementation SHALL receive an evidence-based UX quality review from the
local user harness before it is declared ready. The review SHALL compare the working interface with
its UX record and visual plan for hierarchy, flow states, responsive behaviour, accessibility,
semantic token use, and user-facing copy; accessible responsive behaviour SHALL take precedence
over mockup similarity.

#### Scenario: A completed round view is ready for review

- **GIVEN** the completed round view has been implemented from approved UX and visual plans
- **WHEN** the change is reviewed
- **THEN** the review records findings against the documented flow, states, accessibility, copy, and
  UI foundation

### Requirement: Review findings have severity and ownership

Each UX quality finding SHALL state its evidence, affected screen or component, severity, and next
owner. Severity SHALL be Critical, High, Medium, or Low; Critical findings block comprehension,
task completion, or accessibility, and High findings materially harm a primary flow or violate the
shared foundation.

#### Scenario: Score submission error is not announced

- **GIVEN** a review finds that a score-saving failure is visible but not announced to assistive
  technology
- **WHEN** the finding is recorded
- **THEN** it identifies the score form, cites the missing announcement, marks the severity, and
  assigns the appropriate UX, visual-design, copy, or frontend owner

### Requirement: User-facing copy is reviewed as part of the flow

UX quality review SHALL cover page titles, navigation labels, controls, form labels, help text,
validation, empty states, loading messages, confirmations, and errors. Copy SHALL describe what
happened and the next available action in the product language without exposing technical details.

#### Scenario: A join link is invalid

- **GIVEN** a player supplies an invalid join link
- **WHEN** the join flow is reviewed
- **THEN** the error tells the player what is invalid and how to continue in Finnish

### Requirement: Review outcomes are traceable

The review SHALL record whether each Critical or High finding is resolved, accepted with a documented
rationale, or returned to the owning planning stage. Unresolved Critical findings MUST prevent the
affected frontend work from being marked ready.

#### Scenario: A critical focus defect remains open

- **GIVEN** a review identifies a Critical focus-management defect
- **WHEN** the implementation status is evaluated
- **THEN** the affected frontend work cannot be marked ready until the defect is resolved or the
  documented plan is changed and re-reviewed
