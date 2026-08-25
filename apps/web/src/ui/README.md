# UI foundation

This directory owns reusable visual decisions for the Väyläkaverit web client. It is intentionally
small and supports the approved mobile PWA flows; it is not a general-purpose component library.

## Ownership

- `tokens.css` owns semantic colour, spacing, shape, elevation, focus, disabled, and status tokens.
- `Action`, `TextField`, `Card`, and `StatusMessage` own their accessible shared markup and semantic
  classes.
- Feature code composes these primitives and semantic tokens. It does not introduce a parallel
  master token set or literal visual values where an applicable semantic token exists.

## Adding a shared decision

When a feature needs a token or primitive that does not exist:

1. Record the need in the change's visual-design artifact.
2. Decide whether the visual plan can use an existing semantic treatment.
3. If not, add a separately approved UI-foundation task before creating a feature-local override.

The local `vaylakaverit-design` and `vaylakaverit-frontend` harness skills govern this handoff.

## Accessibility baseline

Primitives must retain visible focus, WCAG AA contrast, 44 by 44 CSS-pixel minimum interactive
targets, labels connected to controls, and non-colour status cues. User-facing flows are reviewed
against these requirements through the local `vaylakaverit-critique` harness skill.
