---
status: approved
---

## Why

Vaylakaverit's product and technical decisions are reviewed through OpenSpec, but the repository
does not yet provide a repeatable way to plan user flows, visual hierarchy, interface copy, or
post-implementation UX quality. The current frontend embeds visual choices directly in one screen,
which makes accessible, consistent iPhone-first experiences hard to extend and review.

## What Changes

- Add a local user-harness UX design workflow with clearly separated planning, visual design, copy,
  frontend implementation, and critique responsibilities.
- Make UX planning records durable OpenSpec artifacts for material user-facing changes, covering
  navigation, task flows, states, accessibility, decisions, and open questions.
- Define a shared UI foundation for semantic design tokens and reusable accessible primitives, so
  frontend code does not define a parallel visual system with literal values.
- Add an evidence-based UX critique step with severity, ownership, and a defined response path.
- Preserve the current explicit proposal and task-list approval gates before implementation.
- Use the MIT-licensed `Zure/zure-vibes` design harness as the reference model for separating UX,
  visual design, copy, frontend implementation, and critique workflows.

## Capabilities

### New Capabilities

- `ux-design-workflow`: Plans and records material user-facing flows, states, accessibility, and
  handoffs before frontend implementation.
- `ui-design-foundation`: Defines the shared token and component ownership model used to implement
  visual plans consistently and accessibly.
- `ux-quality-review`: Reviews visual plans and working UI against documented intent, accessibility,
  responsive behaviour, copy, and the shared foundation.

### Modified Capabilities

- None.

## Impact

The change will add OpenSpec requirements and design-planning artifacts, and refactor the web UI
only after its visual plan is approved. Skills, templates, and harness checks will be installed
only in the local user harness under `~/.copilot/skills/`; they will not be committed to this
repository. The change may add a small shared frontend foundation and targeted UI/accessibility
checks; it does not change golf rules, APIs, Azure infrastructure, authentication, or persistent
data.

## Assumptions

The harness remains tool-optional: Markdown records are authoritative, while mockups are optional
planning aids. `Zure/zure-vibes` is a behavioural reference only; the local user harness will
define its own focused instructions and will not add it as a runtime dependency. Product-facing
copy remains Finnish and repository documentation remains English.

## Non-goals

- Adopting a mandatory external design tool or pixel-perfect mockup workflow.
- Rebranding the product or changing approved game behaviour.
- Building a broad general-purpose component library beyond this product's needs.
