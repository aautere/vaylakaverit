# Implementation Tasks

## 1. Verify Rock Golf course data

- [ ] 1.1 Obtain and record Rock Golf's official scorecard, tee labels, par, handicap indexes,
      men's rating table, men's playing-handicap lookup data, source URL, and effective date for
      every offered round length. Rock Golf initially excludes the women's rating table. Blocked
      until Rock Golf publishes or confirms the missing official men's rating/slope tables, men's
      playing-handicap lookup data, and their effective date; see
      `course-data/rock-golf.md`.
- [ ] 1.2 Confirm Rock Golf's official 9- and 18-hole handicap treatment and the product default
      tee; update the approved design and requirements if the official source changes any stated
      assumption.
- [ ] 1.3 Add a versioned Rock Golf configuration only after the verified data is complete, with
      provenance and data-integrity tests for its 9-hole and two-pass 18-hole layouts.

## 2. Generalize course and round data

- [ ] 2.1 Introduce the typed course registry, layout, round-hole mapping, and course-version
      snapshot in the domain package while preserving the existing Talma Master configuration.
- [ ] 2.2 Update playing-handicap lookup, handicap-stroke allocation, score validation, and
      match-play evaluation to use the selected round snapshot and its valid round-hole range.
- [ ] 2.3 Add domain tests for Talma compatibility, Rock 9-hole validation, Rock's two-pass hole
      mapping, second-pass score distinction, game-range limits, and unresolved 9-hole extensions.

## 3. Update the round API and persistence

- [ ] 3.1 Extend create-round schemas, contracts, and responses with course ID, layout length,
      course version, and round-hole context; reject unsupported or stale selections at the API
      boundary.
- [ ] 3.2 Persist the selected course snapshot in the preview and Cosmos stores, including a
      backward-compatible Talma 18-hole fallback for existing serialized rounds.
- [ ] 3.3 Update player, score, side-game, live-update, completion, and history paths to use the
      persisted snapshot and round length rather than Talma-specific constants.
- [ ] 3.4 Add API and store tests for valid course creation, invalid course/length/tee rejection,
      legacy Talma round reads, Rock 9-hole boundaries, and stable historical course versions.

## 4. Build the course-selection flow

- [ ] 4.1 Implement the accessible iPhone-first course and conditional length selector using the
      approved UX, visual, and Finnish copy records.
- [ ] 4.2 Derive tee choices and defaults from the selected configuration, retain valid form input,
      and show loading, unavailable, offline, stale-selection, validation, and success states.
- [ ] 4.3 Show selected course and length consistently in the lobby, active-round, and history
      views; identify Rock Golf's second pass alongside its round-hole number where needed.
- [ ] 4.4 Add focused UI tests for selector behaviour, keyboard/focus restoration, Finnish
      validation/status text, and distinct Rock first- and second-pass score context.

## 5. Verify the completed flow

- [ ] 5.1 Exercise Talma 18-hole, Rock 9-hole, and Rock 18-hole create-to-history flows in local
      preview, including score corrections, game boundaries, errors, and stable history.
- [ ] 5.2 Complete the planned UX critique with iPhone-sized and keyboard evidence; resolve or
      explicitly accept every finding in `ux-reviews/course-selection-critique.md`.
- [ ] 5.3 Run the change's targeted tests, formatting, type checks, and OpenSpec validation; update
      user-facing preview documentation if the course-selection flow changes it.
