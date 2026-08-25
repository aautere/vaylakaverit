## Context

Vaylakaverit has an approved product and technical design, but its UX decisions, visual direction,
copy review, and frontend review do not yet have separate durable ownership. The only web screen
contains both product flow and literal visual styling, so a later feature can introduce inconsistent
patterns without a planning or review checkpoint.

`Zure/zure-vibes` is the reference model: it separates UX, visual design, copy, frontend, and
critique into five discoverable workflows. Vaylakaverit keeps its stricter OpenSpec sequence:
proposal approval remains required before requirements and design, and task-list approval remains
required before implementation. The reference informs responsibility boundaries, not copied source
or a runtime dependency. The workflows, their templates, and their validation logic are user-local
harness assets, not repository files.

The affected stakeholders are golfers using the iPhone-first PWA outdoors, product owners approving
behaviour, and contributors changing the web client. Planning artifacts contain no player identity,
round data, invitation links, or production screenshots.

## Goals / Non-Goals

**Goals:**

- Make user-flow, visual, copy, implementation, and critique decisions discoverable and traceable.
- Give the web client a small semantic token and primitive foundation appropriate to one PWA.
- Make accessibility, offline/recovery states, and Finnish user-facing copy reviewable before release.
- Preserve the current OpenSpec approval gates and tool-optional Markdown-first workflow.

**Non-Goals:**

- Create a general-purpose multi-app design system, require mockup software, or reproduce the Zure
  Vibes implementation.
- Redesign approved golf rules, backend contracts, or the Azure architecture.
- Require pixel-perfect mockup matching over accessible responsive behaviour.

## Decisions

### Use five user-local skills with explicit boundaries

Add five GitHub Copilot user skills under `~/.copilot/skills/`: UX planning, visual design, copy,
frontend implementation, and critique. Their names will use a `vaylakaverit-` prefix and their
descriptions will restrict them to the Vaylakaverit workspace. Their frontmatter and instructions
will define the material-UI trigger and the handoff chain:

`vaylakaverit-ux` -> `vaylakaverit-design` -> `vaylakaverit-copy` ->
`vaylakaverit-frontend` -> `vaylakaverit-critique`.

The UX skill returns missing behavioural decisions to the product/OpenSpec record; visual design
returns missing interaction choices to UX; frontend returns missing tokens or primitives to visual
design; critique assigns findings back to one of the preceding owners. This mirrors the responsibility
boundaries in Zure Vibes while retaining the existing approval gates.

Alternative considered: repository-scoped skills or one broad `AGENTS.md` design instruction. They
are rejected because the user requires the harness to remain local and neither option provides
reliable, isolated handoffs.

### Store UX, visual-plan, copy, and critique records inside each OpenSpec change

Material UI changes will store English planning records under:

```text
openspec/changes/<change>/
  ux/<flow>.md
  visual-design/<screen-or-flow>.md
  copy/<screen-or-flow>.md
  ux-reviews/<screen-or-flow>.md
```

The UX record is mandatory for material UI work. A visual plan is mandatory only when visual
direction changes. Copy guidance and critique records are mandatory when the change includes a
material frontend implementation. The records link to the proposal, requirement, and task that they
support; archived changes preserve the decision history.

Alternative considered: place these records under `apps/web/docs/`, following Zure Vibes. It is
rejected because this repository's approved change, rather than the application directory, is the
source of truth for a scoped product decision.

The templates that create and validate these records live only under the user-local skill
directories; the filled-in OpenSpec records remain repository artifacts because they document an
approved product change.

### Build a local semantic UI foundation before migrating the current screen

Because the repository has one web application, create `apps/web/src/ui/` and a token stylesheet
loaded from `index.css` rather than a workspace-level UI package. The foundation will own semantic
tokens for surface, text, action, status, border, spacing, shape, elevation, focus, and disabled
states; it will expose only primitives proven by the current PWA, initially actions, fields, cards,
and status messages.

Tailwind remains the implementation utility layer. Feature code consumes semantic classes, tokens,
and primitives instead of introducing new global tokens or literal values. The existing `App.tsx`
is migrated only after a UX record and visual plan establish the intended hierarchy and states.

Alternative considered: introduce shadcn/ui or a broad component package. It is rejected because
the product has one mobile PWA and needs a small, testable foundation before a library dependency.

### Make accessibility and recovery states first-class design inputs

UX templates will require empty, loading, success, error, permission, offline, synchronization, and
conflict states when relevant. They will record keyboard sequence, focus restoration, Finnish labels
and errors, non-colour status cues, WCAG AA contrast, and 44 by 44 CSS-pixel minimum touch targets.
The first migration focuses on create/join, active-round score entry, pending synchronization, and
completed-history paths because they cover the primary and failure flows already present.

### Use evidence-based review as a release gate for material UI work

The local critique skill produces an `ux-reviews` record comparing the working preview to its
records and the UI foundation. Findings include evidence, affected UI, severity, owner, and
resolution state. Critical findings block readiness; High findings require resolution or an
explicitly approved exception. The review checks hierarchy, states, keyboard and focus behaviour,
responsive mobile use, semantic token use, and Finnish copy rather than visual similarity to a
mockup.

## Risks / Trade-offs

- **[Five skills add ceremony]** -> Keep the workflow scoped to material UI work and provide concise
  templates; minor polish and backend-only work bypass it.
- **[Token migration changes an established screen]** -> Migrate one documented flow at a time and
  compare the mobile preview, rather than replacing all styling in one change.
- **[Templates become stale documentation]** -> Require critique records to cite the UX and visual
  records and verify their paths in review.
- **[Accessibility is treated as a checklist]** -> Combine source-level checks with keyboard and
  iPhone-sized preview evidence for primary and recovery flows.
- **[Local harness changes are lost or unavailable to another machine]** -> Keep the harness outside
  the repository by request, document its local install location in the user's harness, and accept
  that contributors must install their own equivalent harness.
- **[Reference use causes unwanted platform coupling]** -> Treat Zure Vibes as an attributed
  behavioural reference only; do not import its packages, code, or deployment assumptions.

## Migration Plan

1. Install the five skills, their templates, and their structural check under `~/.copilot/skills/`;
   do not add harness files or repository guidance for them to the project.
2. Add the local token stylesheet and the smallest set of accessible UI primitives, with focused
   tests for their semantic and interactive contracts.
3. Create UX, visual-design, copy, and critique records for the existing create/join and active-round
   flows; have the product owner approve the resulting implementation task list.
4. Migrate the web screen flow by flow to the approved foundation, preserving API behaviour and
   offline outbox semantics.
5. Run the critique against an iPhone-sized preview, resolve blocking findings, validate OpenSpec,
   and update the README and contributor guidance.

If migration causes a functional or accessibility regression, restore the previous flow implementation
while keeping the planning records, record the failed foundation assumption, and resume only through
a revised approved task.

## Test Strategy

- Validate the OpenSpec artifacts and skill discovery/record-path rules.
- Add focused unit tests for reusable primitives and status semantics.
- Exercise keyboard focus, invalid join links, score save failure, queued score recovery, and
  completed-history navigation in an iPhone-sized browser flow.
- Conduct the documented critique against the working preview before the change is ready.

## Open Questions

None. The approved implementation task list will select exact file names and test commands while
preserving this design's boundaries.
