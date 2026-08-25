# UX review plan: course selection

- Change: `openspec/changes/course-selector`
- Review status: planned — this is not a post-implementation readiness review
- Links: [UX record](../ux/course-selection.md); [visual plan](../visual-design/course-selection.md);
  [copy guidance](../copy/course-selection.md); [tasks](../tasks.md)
- Future evidence source: local preview with verified synthetic Rock Golf configuration in an
  iPhone-sized viewport and a keyboard-only pass. Do not use real player data or production links.

## Required future review evidence

| Area | Evidence to capture before readiness |
| --- | --- |
| Course and length selection | Create a Talma 18-hole round, a Rock 9-hole round, and a Rock 18-hole round; confirm only valid lengths appear and the chosen summary persists into the lobby. |
| Rating-table availability | Select Rock Golf after a women's-table choice; verify that the table changes to the labelled men's-only state, the server rejects a forged women's payload, and Talma still offers both configured tables. |
| Repeated layout | Enter and correct scores on Rock round holes 3 and 12; verify that they remain distinct and that the latter identifies the second pass of source hole 3. |
| Boundaries and games | Attempt score, side-game, and extension actions outside a 9-hole round; verify the visible recovery and absence of hole 10 data. |
| Data/version safety | Exercise unavailable and stale configurations in preview; verify selection errors, deliberate reselection, and stable historical rendering for a prior version. |
| Accessibility and responsive use | Keyboard-test legends, radio rows, conditional length focus, stale-error focus restoration, visible focus, 44x44 targets, WCAG AA contrast, and non-colour selection/status cues. |
| Finnish copy | Compare visible course, length, help, second-pass, loading, error, offline, and success text against the copy record. |
