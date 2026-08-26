# UX record: course selection

- Change: `openspec/changes/course-selector`
- Status: approved planning record
- Links: [proposal](../proposal.md); [requirements](../specs/shared-golf-games/spec.md);
  [design](../design.md); [tasks](../tasks.md)
- Users and outcome: a golfer creating a shared round on an iPhone can choose Golf Talma Master or
  Rock Golf, understand the valid round lengths, and create a 9- or two-pass 18-hole Rock Golf
  round without losing the existing player and game setup flow.

## Information architecture and navigation

The start screen's create-round task gains a first **Kenttä ja kierroksen pituus** step before the
creator's name, tee, Handicap Index, and game settings. The initial course list contains Golf Talma
Master and Rock Golf; it is a short, direct choice rather than a searchable catalogue.

Selecting Golf Talma Master makes its 18-hole layout active without an additional length control.
Selecting Rock Golf reveals two mutually exclusive choices: 9 reikää and 18 reikää (2 × 9 reikää).
The selected course and length remain visible in the following setup, lobby, active-round summary,
and history. The course and length cannot change after creation; the user returns to start to create
a different round.

Rock Golf initially supports only the men's rating table. Its setup and lobby show that table as the
available calculation table and do not offer the women's option. Golf Talma Master continues to
offer its configured rating-table choices.

## Primary flow

1. The creator selects **Luo kierros** and lands on the create-round form with the course selection
   before the creator-specific fields.
2. They choose Golf Talma Master or Rock Golf. The system announces the selected course and exposes
   only the valid length choices.
3. If they choose Rock Golf, they choose either 9 holes or 18 holes (two passes). The helper text
   explains that the 18-hole choice plays the same nine holes twice.
4. The system applies the selected configuration's default tee, updates the labelled tee choices,
   and, for Rock Golf, applies and identifies the men's rating table as the only available option.
5. The system preserves only valid field values; a stale women's-table selection is cleared before
   the creator continues with Rock Golf.
6. The creator completes the existing round, player, and main-game settings and creates the lobby.
7. In a Rock Golf 18-hole round, later score and game context uses the round-hole number first and
   names the second pass where necessary, for example “Reikä 12 · toinen kierros, reikä 3”.

## States and recovery

| State                    | Trigger                                                                  | User-visible message/action                                                        | Recovery                                                       | Non-colour cue                            |
| ------------------------ | ------------------------------------------------------------------------ | ---------------------------------------------------------------------------------- | -------------------------------------------------------------- | ----------------------------------------- |
| Empty                    | No course configurations are available.                                  | State that a round cannot be created until a course is available.                  | Show join and history paths.                                   | Explicit empty-state text.                |
| Loading                  | Course configurations are loading.                                       | Keep the form context and state that courses are loading.                          | Disable only the create action until a valid selection exists. | Busy text and disabled action.            |
| Success                  | Course or length selection changes.                                      | Confirm the selected course and length near the control.                           | Continue with tee and player setup.                            | Text summary.                             |
| Unavailable rating table | Rock Golf is selected while a women's-table choice is present.           | Explain that Rock Golf currently uses the men's table and show the applied value.  | Continue with the available table.                             | Explicit field text.                      |
| Error                    | Course data cannot load or the server rejects a stale selection.         | Say that the course selection could not be used and retain any safe input.         | Retry loading or select an available course.                   | Assertive text associated with the field. |
| Permission denied        | Not applicable: selecting a course is available to every creator.        | N/A.                                                                               | N/A.                                                           | N/A.                                      |
| Offline                  | A creator has no connection before a round exists.                       | Explain that a new round requires a connection.                                    | Retry after reconnecting; retain form values where safe.       | Explicit text.                            |
| Synchronizing            | Not applicable: course selection is confirmed when the round is created. | N/A.                                                                               | N/A.                                                           | N/A.                                      |
| Conflict                 | The selected configuration changed after the form loaded.                | Explain that the course settings were updated and identify the affected selection. | Refresh choices and require deliberate reselection.            | Assertive text and returned focus.        |

## Accessibility

- Keyboard order and visible focus: heading, course radio group, conditional length radio group,
  tee, existing creator fields, game settings, and create action. Focus moves to the newly revealed
  length-group legend after Rock Golf is selected only when keyboard interaction caused the reveal;
  it remains on the chosen course control for pointer input. On stale-selection error, focus returns
  to the course group.
- Labels, instructions, and error communication: course and length use native radio groups with
  legends. The Rock Golf 18-hole option includes visible text that it is “2 × 9 reikää”; no label
  relies on an icon or colour. Rock Golf's fixed men's rating table remains a labelled text field,
  not a hidden value. Validation error text is adjacent to the relevant group and announced
  assertively.
- Touch targets: every course and round-length option, including its full label row, is at least 44
  by 44 CSS pixels.
- Contrast and status cues: WCAG AA contrast applies to selected, unavailable, busy, error, and
  summary states. Selected state is conveyed by checked control and text, not colour alone.

## Alternatives, assumptions, and open questions

- **Decision:** show Rock Golf's 18-hole option as one explicit “2 × 9” choice, rather than asking
  players to create two separate rounds. This preserves a single invitation, lobby, game history,
  and standings.
- **Alternative rejected:** a generic numeric hole-count input. It would permit unsupported lengths
  and conceal that Rock Golf repeats its layout.
- **Assumption:** verified course configuration data is available before Rock Golf is shown.
- **Decision:** Rock Golf exposes only its verified men's rating table in the first version. A
  future verified women's table is a course-data version, not a client-side fallback.
- **Decision:** Rock Golf uses the selected calculator snapshot for its men's rating/slope values,
  playing-handicap policy, and O-tee default. A future source update creates a new course-data
  version rather than changing historical rounds.

## Handoff

- Visual direction needed? yes; course and length controls need an iPhone-first hierarchy that keeps
  the 18-hole repetition clear without increasing setup burden.
- Copy scope: the selector title, Rock Golf length labels and help, unavailable/stale selection,
  loading, offline, and second-pass score context need Finnish wording.
