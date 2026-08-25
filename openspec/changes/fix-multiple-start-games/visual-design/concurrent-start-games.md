# Visual design plan: concurrent games at round creation

- Change: `openspec/changes/fix-multiple-start-games`
- Status: approved
- Links: UX [record](../ux/concurrent-start-games.md); [requirements](../specs/shared-golf-games/spec.md); [tasks](../tasks.md)

## Intent and hierarchy

The creator's details come first. A distinct **Pelit alusta** section follows with concise help that
games are independent. Numbered game cards are the scan units: each has a heading, settings, and,
except for the required first card, a secondary remove action. The add action follows the cards and
the primary create action remains last.

## iPhone-first layout and responsive behaviour

On iPhone widths, cards stack with one-column settings and a full-width add action. The card boundary
and heading make independent rules legible outdoors. Wider layouts may place related selects in two
columns but retain each card's heading, settings, and action together in keyboard order. No setting
depends on hover.

## Components and semantic foundation

| UI area            | Shared/domain component              | Semantic token intent                          | Foundation gap                                               |
| ------------------ | ------------------------------------ | ---------------------------------------------- | ------------------------------------------------------------ |
| Games section      | `Card` with section heading          | Default surface and strong text                | None.                                                        |
| Game card          | `Card` or nested neutral surface     | Grouped settings and secondary boundary        | None.                                                        |
| Add/remove actions | `Action` secondary variant           | Secondary action, with explicit remove text    | None.                                                        |
| Settings           | `TextField` and native select fields | Existing input, label, focus, and error tokens | Select wrapper consistency remains existing foundation work. |
| Create feedback    | `StatusMessage`                      | Semantic success and error cues                | None.                                                        |

## Important visual states

One game card is always present. Added cards expose a visible remove action. A busy create action
does not hide the cards. An error keeps all cards and values visible and presents text near the
affected content. Successful creation proceeds to the existing lobby.

## Accessibility

- WCAG AA contrast and non-colour state cues: card headings, ordering, labels, and status text carry
  the meaning in addition to semantic surfaces.
- Visible focus and keyboard affordances: all controls have focus rings; focus moves to a new card
  and returns predictably after removal.
- Interactive targets: at least 44x44 CSS pixels.

## Behavioural questions returned to UX

None; the UX record establishes required-card, all-player, and add/remove behavior.
