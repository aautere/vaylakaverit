# Visual design plan: course selection

- Change: `openspec/changes/course-selector`
- Status: approved planning record
- Links: [UX record](../ux/course-selection.md); [requirements](../specs/shared-golf-games/spec.md);
  [tasks](../tasks.md)

## Intent and hierarchy

The first card in create-round setup answers one outdoor-use question: where and how long is the
group playing? Present the two supported courses as large labelled radio rows. When Rock Golf is
selected, reveal a compact second group directly below it for 9 holes and 18 holes (2 × 9 holes).
The course summary remains above the tee field after selection so the creator does not need to
scroll upward to verify it.

Do not present a visual course card gallery, a map, or a search field for this two-course release.
The selected indicator, course name, and round-length text are sufficient and remain clear in
bright outdoor conditions.

For Rock Golf, render the men's rating table as a compact labelled information row below the tee
selection. It is not an unavailable-looking select or an omitted setting: the row plainly explains
that this is the only available calculation table. Golf Talma Master retains its interactive,
configured rating-table control.

## iPhone-first layout and responsive behaviour

Use one full-width column on iPhone. Each entire course or length row is the tappable target. The
Rock Golf length group appears inline after its course row; it does not open a modal or navigate
away from the form. Other form controls remain below the selection and retain their order.

At wider widths, preserve the vertical course-then-length order inside the setup card; a maximum
content width may make the labels easier to scan but must not create a dense multi-column form.
The active-round and history summary can use a compact text row, with the round-hole number given
more visual emphasis than the repeated source-hole label.

## Components and semantic foundation

| UI area                                     | Shared/domain component                          | Semantic token intent                                                             | Foundation gap |
| ------------------------------------------- | ------------------------------------------------ | --------------------------------------------------------------------------------- | -------------- |
| Course and length groups                    | Native radio groups and labelled full-width rows | `surface-raised`, `border-strong`, `focus-ring`, selected action/border treatment | None           |
| Selected course summary                     | `Card` or compact summary row                    | `surface-subtle`, `text-strong`, `text-muted`                                     | None           |
| Rock Golf rating table                      | Labelled read-only information row               | `surface-subtle`, `text-strong`, `text-muted`                                     | None           |
| Loading, unavailable, stale, offline states | `StatusMessage`                                  | Existing info, warning, and danger status tokens                                  | None           |
| Create action                               | `Action`                                         | Existing primary and disabled action tokens                                       | None           |
| Second-pass score context                   | Existing score row/card text                     | `text-strong` for round hole, `text-muted` for pass/source-hole context           | None           |

## Important visual states

Loading keeps the course group's space and shows a concise busy message rather than shifting the
rest of the form. An unavailable or stale configuration uses visible explanatory status text and an
unavailable control state; it is never represented only by a muted colour. An invalid submission
places the status next to the course/length group. Offline pre-creation prevents submission and
keeps selected values readable. There is no empty course list in ordinary release operation, but if
it occurs the create card names the problem and leaves join/history visible.

When a stale women's-table selection is cleared for Rock Golf, keep the field location stable,
show the men's rating-table row, and give a short text status. Do not show a disabled women's
option without its explanation.

## Accessibility

- WCAG AA contrast and non-colour state cues: checked native controls, text summaries, status text,
  and icons where present communicate state independently of colour.
- Visible focus and keyboard affordances: every full-width option uses the shared focus ring; focus
  follows the UX record's conditional length-group and stale-error rules.
- Interactive targets: at least 44x44 CSS pixels.

## Behavioural questions returned to UX

No behavioural rules are created here. Rock Golf's official configuration and the resulting
availability of its choices remain the technical-design data gate.
