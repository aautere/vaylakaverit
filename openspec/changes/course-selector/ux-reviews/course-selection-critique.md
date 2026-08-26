# UX review: course selection

- Change: `openspec/changes/course-selector`
- Review status: passed
- Working preview/build and date: local Azure Functions and Vite preview, iPhone 13 Chromium
  Playwright flows, 2026-08-26.
- Links: [UX record](../ux/course-selection.md); [visual plan](../visual-design/course-selection.md);
  [copy guidance](../copy/course-selection.md); [tasks](../tasks.md)

## Coverage and evidence

- **Course and length selection:** the preview lists Golf Talma Master and Rock Golf as native
  labelled radio choices. Rock reveals the 9-hole and `18 reikää (2 × 9 reikää)` choices inline.
  The iPhone flow created Talma, Rock 9-hole, and Rock 18-hole rounds and preserved their summaries
  in the lobby and completed history.
- **Dynamic course settings:** the Rock 9-hole flow displayed tees R, O, C, and K and its labelled
  men's-only rating-table information. Talma retained its configured table choices. The API tests
  cover the unavailable Rock women's selection.
- **Repeated layout and recovery:** the Rock 18-hole flow selected round hole 12, displayed
  `Toinen kierros, reikä 3`, saved a score, corrected it, and completed the round. The Rock 9-hole
  flow exposed exactly nine score-hole choices.
- **Accessibility and responsive use:** Playwright used iPhone 13 viewports. Native fieldsets and
  legends provide the course and length groups, option rows have a 44 CSS-pixel minimum height, and
  `StatusMessage` supplies polite loading/success and assertive error semantics. A keyboard flow
  focused Rock Golf and verified focus movement to the newly revealed length legend.
- **Visual foundation and copy:** selector states use `Card`, `Action`, `StatusMessage`, shared
  semantic tokens, explicit Finnish selected-course/rating-table/status text, and non-colour native
  checked controls. No hover-only action or colour-only status was observed.

## Findings

No Critical, High, Medium, or Low findings were identified in the reviewed scope.

## Outcome

The course-selection flow meets its approved UX, visual, copy, responsive, and accessibility
records. The tested preview covers Talma compatibility, Rock 9-hole boundaries, Rock 18-hole second
pass context, score correction, history, and keyboard disclosure focus. No re-review is required
unless a future course-data version or selector interaction changes.
