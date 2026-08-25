## Context

The current application assumes one course, Golf Talma Master, one 18-hole layout, Talma tee
labels, and Talma's official playing-handicap lookup. Those assumptions exist in the shared domain
module, API contracts and stores, preview seed data, and the round-creation screen. Rock Golf is a
second course with one nine-hole layout that must be playable once or twice without treating an
18-hole round as a different course.

The existing system persists round-hole scores by round-hole number, which is useful for the Rock
Golf 18-hole option: round holes 10 through 18 can remain distinct even though they reuse course
holes 1 through 9. The backend remains authoritative for course-data validation and game outcomes.

## Goals / Non-Goals

**Goals:**

- Replace Talma-specific course assumptions with a small, versioned course registry.
- Let a creator select a course and its valid round length before a round exists.
- Represent a Rock Golf 18-hole round as two explicit passes of one verified nine-hole layout.
- Preserve the exact course snapshot that a round used for scoring, games, and history.
- Keep the existing invitation, player, readiness, score-ownership, and match-play behaviours.

**Non-Goals:**

- Add a course search, map, favourites, administration interface, or a general course import system.
- Derive official tee, par, handicap-index, course-rating, slope, or playing-handicap values.
- Retroactively change existing Golf Talma Master rounds.

## Decisions

### Course registry and immutable round snapshot

Define a common course-configuration shape in the domain package. It contains a stable course ID,
display name, source URL, source/effective dates, a version identifier, tees, the rating tables it
supports, and one or more supported layouts. A layout defines its available round length and an
ordered list of round-hole definitions.

At creation, the API validates the requested course and layout, then records an immutable course
snapshot or version reference with the round. API responses expose the course name, layout length,
round-hole mapping, and valid tee labels. Both the preview store and persistent store use the same
domain validation.

This is preferred to passing a course name and looking it up whenever a score is evaluated: a later
course update must not silently change historical scorecards or results.

### Rock Golf two-pass layout

The Rock Golf course configuration has a nine-hole layout and an 18-hole layout. The 18-hole layout
contains two ordered passes of the same physical source-hole definitions: source holes 1–9 map to
round holes 1–9 in pass one and to round holes 10–18 in pass two. Course configuration separates
the repeated physical hole data from the official layout-specific round-hole handicap indexes.
Round-hole numbers are the score and game keys; source-hole number and pass are display context.

This is preferred to duplicating Rock Golf as separate front-nine and back-nine courses, which
would obscure a single round and complicate invitations, games, and history.

### Official data as a release gate

Rock Golf is enabled only after an official club or course source supplies the scorecard, every tee,
par, handicap index, rating-table values, and playing-handicap lookup needed for each offered
layout. The import records its source and effective date and validates the data before it is exposed
to round creation. No formula or crowd-sourced data is a fallback.

This preserves the existing policy for handicap match play. Scratch play is not used as a reason to
publish a partly configured course, because all players must be able to select valid tees and a
round must remain coherent in history.

### Rock Golf rating-table scope

Rock Golf's first configuration exposes only the men's rating table. The client presents it as the
fixed available table and the API rejects a women's-table payload for Rock Golf. Golf Talma Master
continues to expose both its verified tables. The course registry represents supported tables
explicitly so a later verified Rock Golf women's table can be added as a new version without
changing historical rounds.

This is preferred to presenting an unavailable option or reusing men's values for women, either of
which would imply an unsupported handicap calculation.

### Generic API and UI contracts

Round creation accepts a course ID and layout length rather than selecting an implicit Talma course.
Join and lobby updates validate tee labels against the selected round snapshot. Score and side-game
validation use the snapshot length rather than the number 18. The UI renders the course selector
first, conditionally reveals Rock Golf's 9- and 18-hole choices, then derives tee choices and
defaults from the selected layout.

This is preferred to client-only conditionals because the API must reject invalid or stale input
from old clients and invitation holders.

## Risks / Trade-offs

- [Rock Golf official data is incomplete or its 9/18-hole handicap treatment is unclear] → Do not
  enable the course; obtain written club clarification or official published tables and record the
  applicable configuration.
- [Rock Golf women's rating data is unavailable] → Expose only the verified men's table and reject
  the unavailable selection until a later version is verified.
- [Existing serialized rounds lack a course ID and layout] → Read legacy persisted and preview
  Talma rounds as the versioned 18-hole Talma configuration, then write explicit values for all new
  rounds. Add compatibility tests before deployment.
- [Repeated source holes confuse players] → Display the round-hole number as the primary identifier
  and pair later holes with concise text such as “toinen kierros, reikä 3”.
- [More configurable courses expand type complexity] → Keep the registry static and typed in the
  domain package; do not introduce runtime management or a database catalogue.

## Migration Plan

1. Verify and transcribe Rock Golf's official data into a versioned domain configuration with
   provenance tests.
2. Add the registry, layouts, round snapshot fields, and legacy Talma fallback in the domain/API
   boundary.
3. Update both stores, API schemas, local preview seed data, and game evaluation to use the
   snapshot's round holes.
4. Implement the creation selector and round/history labels.
5. Deploy the server and client together; old clients receive validation errors for unsupported
   creation payloads and must refresh. Existing rounds remain readable using the Talma fallback.
6. Roll back by hiding Rock Golf from new-round creation while retaining the course configuration
   needed to read any Rock rounds already created.

## Open Questions

- Rock Golf's official site confirms its nine-hole par-3 layout, tee labels, tee lengths, and that
  18 holes are played as two nine-hole rounds. As recorded in
  `course-data/rock-golf.md`, eBirdie provides the official 18-hole handicap-index sequence.
  The 9-hole layout normalizes the first-pass odd indexes to the 1–9 scale: `(first-pass index +
  1) / 2`. Its sequence is 3, 6, 4, 8, 9, 1, 7, 2, and 5. For each physical hole, the 18-hole
  second pass uses the first-pass index plus one, producing the even indexes. Rock Golf's linked
  calculator provides men's rating/slope values, but its tee lengths conflict with Rock Golf's
  published length page. Rock Golf must resolve that version difference and provide the men's
  playing-handicap lookup data and effective date before enabling the initial configuration.
  Women's values are intentionally outside that initial configuration.
- Confirm whether the official source designates a preferred default tee for Rock Golf; otherwise
  the product owner must choose one explicitly before implementation.
