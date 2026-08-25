# Technology and Course Data Decision Plan

## Purpose

This plan completes tasks 1.1 through 1.3 without beginning implementation. It selects the
application-level technology within the approved Azure architecture and verifies the data and
rules needed for Golf Talma Master handicap match play.

The outcome is a short, reviewed decision record added to `design.md`, an authoritative course
data snapshot, and acceptance tests. No application code, Azure resource, GitHub repository, or
production deployment is created during this plan.

## Decision sequence

1. Confirm the runtime constraints from the approved design: iPhone PWA, current plus two
   preceding iOS versions in Safari and Chrome, local score outbox, Azure, GitHub, under-one-second
   live updates, and scale-to-zero application compute.
2. Compare the technology candidates against those constraints.
3. Verify the exact Golf Talma Master data from an authoritative club source.
4. Specify the handicap and match-play rule examples that the implementation must pass.
5. Record the selected technologies, course-data provenance, and accepted golf rules in
   `design.md`.
6. Update `tasks.md` only if the decisions introduce a previously unknown implementation task.

## Application technology selection

### Candidate baseline

The default candidate is a TypeScript codebase because the PWA, Azure Functions API, shared game
rules, and validation schemas can then share types and executable tests.

| Concern             | Preferred candidate                                                                             | Alternative to reject or justify                 | Acceptance criteria                                                                                          |
| ------------------- | ----------------------------------------------------------------------------------------------- | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------ |
| PWA UI              | React with Vite                                                                                 | Another static SPA framework                     | Builds to static assets, works as an installable PWA, and supports the required iPhone browsers.             |
| Mobile styling      | Tailwind CSS with accessible component primitives                                               | A custom CSS system                              | Large touch targets, high contrast, and WCAG AA are testable without a large bespoke design system.          |
| Browser state       | TanStack Query plus a small local UI state layer                                                | Custom fetch/cache code                          | Handles API caching, reconnection, and explicit pending score state.                                         |
| Offline outbox      | IndexedDB behind a small score-outbox abstraction                                               | Local storage only                               | Survives PWA restart, stores only the current participant's pending score writes, and replays them in order. |
| API runtime         | TypeScript on Azure Functions Flex Consumption                                                  | A long-running server or a second web framework  | HTTP handlers remain small, scale to zero, and support authenticated APIs.                                   |
| Boundary validation | Zod schemas shared by PWA and Functions                                                         | Hand-written validation                          | Every score, game, invitation, and identity payload is validated at the API boundary.                        |
| Persistent data     | Azure Cosmos DB for NoSQL in serverless mode                                                    | Relational Azure database                        | Supports atomic round/score updates, invitation lookup, history queries, and request-based idle cost.        |
| Live events         | Azure Web PubSub                                                                                | Client polling or application-managed WebSockets | Delivers a confirmed score update to connected participants within one second.                               |
| Authentication      | Sign in with Apple token verification in the API plus app sessions; device-bound guest sessions | A dependency on a third-party identity SaaS      | Supports Apple identity, guest joining, score authorization, and account deletion.                           |
| Tests               | Vitest for rules and API units; Playwright for PWA flows                                        | Browser-only manual testing                      | Covers deterministic game rules, multiple client flows, QR join, reconnection, and iPhone-sized views.       |
| Infrastructure      | Bicep and Azure CLI in GitHub Actions                                                           | Console-created resources                        | Recreates development and production environments with no untracked cloud configuration.                     |

### Evaluation method

For every preferred candidate, produce a minimal, disposable spike outside production:

1. Build and install a PWA on an iPhone-sized Safari viewport.
2. Authenticate a test Apple identity and create a guest session without exposing secrets.
3. Submit a score through an Azure Function, persist it to Cosmos DB, and publish it through Web
   PubSub.
4. Measure the time until a second browser client receives the update.
5. Temporarily disconnect one client, queue a score, reconnect, and verify ordered synchronization
   without overwriting a newer server revision.
6. Verify that the Functions workload has no always-on application instance while idle.

The selected stack must pass all six checks. A failed candidate is replaced only with an alternative
that is evaluated against the same checks and documented in `design.md`.

## Golf Talma Master source verification

### Authoritative source policy

Do not seed the course from crowd-sourced scorecard sites. Obtain the current Master-course
scorecard and rating data directly from Golf Talma, either from its official published scorecard
or written confirmation from the club. Record:

- source URL or the club contact and confirmation date;
- effective date and any stated seasonal restrictions;
- the source file or a permitted reference to it;
- the reviewer who checked the imported values.

If an official source cannot be obtained, pause handicap-game implementation rather than treating
an unofficial listing as authoritative.

### Approved Master source

The user approved Golf Talma's official Master page as the authoritative source on 25 August 2026:
<https://golftalma.fi/master/>.

The page contains a Master scorecard and men's and women's slope-table images. It labels tees as
48, 52, 56, 60, and 64 rather than colours. The displayed slope tables are dated June 2017. The
user accepted these official published values for the first release without a separate Golf Talma
confirmation. The implementation records the source URL and retrieval date, and versions a later
official update rather than silently changing historical rounds.

### Required course data

For every supported tee, capture:

| Data                                 | Why it is needed                                                        |
| ------------------------------------ | ----------------------------------------------------------------------- |
| Course name and tee label            | Identifies the selected course setup.                                   |
| Hole number, par, and length         | Renders the scorecard and validates scores.                             |
| Hole stroke index                    | Allocates handicap strokes to holes.                                    |
| Total par                            | Calculates the course-handicap adjustment.                              |
| Course Rating and Slope Rating       | Calculates course handicap from handicap index.                         |
| Rating-table label and applicability | Identifies the official table used for a player's handicap calculation. |

The import must reject incomplete, duplicate, or non-18-hole data. The course configuration is
versioned with an effective date so a later club change does not silently rewrite completed-round
history. The application displays each imported tee label exactly as supplied by the course; a
separate product configuration selects the initial default tee and must not infer it from a colour
or number. Golf Talma Master uses tee 52 as its first-release default.

## Handicap and match-play rule decision

Before coding, document and approve the following concrete policy:

1. **Handicap input:** a player enters their current Handicap Index for the round.
2. **Rating-table preference:** a signed-in player's default begins as the men's rating table. It
   is a changeable calculation preference, not stored gender, and may be overridden for a round.
3. **Playing handicap lookup:** use the official selected-tee rating table to map a player's
   Handicap Index range to the published playing handicap. The application does not recalculate
   this value from a WHS formula.
4. **Match-play allowance:** apply a fixed 100% allowance to the official looked-up playing
   handicap.
5. **Stroke allocation:** use the lowest looked-up playing handicap in the game as the baseline.
   Assign every other player the non-negative difference, then allocate those strokes by ascending
   HCP index from 1 through 18, repeating for differences above 18. A negative playing handicap
   may be the baseline and receives no penalty strokes.
6. **Shared multi-player winner:** compare gross scores for scratch games and gross scores less
   each player's game-specific relative handicap strokes for handicap games. The lowest applicable
   score wins the hole, subject to the selected tie rule.
7. **Examples:** write test cases for a zero-handicap player, a mid-handicap player, a handicap
   above 18, a tied best net score, a carried win, and a score correction that changes a prior hole
   winner.

Use the official course rating table and its published playing-handicap values. The confirmed
lookup, allowance, and examples become executable tests and are referenced from `design.md`.

## Decision record template

Add the following to `design.md` once the work above is reviewed:

```markdown
## Implementation decisions

### Technology

- PWA:
- API:
- Data:
- Live updates:
- Authentication:
- Validation and shared contracts:
- Testing:
- Infrastructure:

### Talma Master data

- Authoritative source:
- Source checked on:
- Supported tees:
- Course-data version:

### Handicap match play

- Official playing-handicap lookup source:
- Match-play allowance:
- Stroke allocation:
- Multi-player relative-net-score comparison:
- Tested examples:
```

## Exit criteria

This planning item is complete only when:

- every technology selection has passed the defined spike or has a documented exception;
- the chosen stack satisfies the iPhone, scale-to-zero, one-second update, and local-outbox NFRs;
- Golf Talma has provided or confirmed the imported course data;
- the handicap policy and its examples have been approved;
- the decision record is added to `design.md`; and
- no production Azure resources, app code, or GitHub repository has been created as a side effect.
