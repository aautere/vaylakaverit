# Implementation Tasks

## 1. Resolve implementation decisions

- [x] 1.1 Select the PWA frontend, cloud backend, persistent data, authentication, and real-time
      implementation libraries against the approved Azure architecture; document the decision and
      tradeoffs in `design.md`.
- [x] 1.2 Select Golf Talma's official Master page as the authoritative source for hole, tee, par,
      stroke-index, course-rating, and slope data; document its provenance and update process.
- [x] 1.3 Define the official playing-handicap lookup, relative handicap-stroke allocation, and
      fixed 100% match-play allowance from each player's handicap index and selected tee; add the
      resulting rule to the specification and design before implementing the evaluator.
- [x] 1.4 Define cancellation and final-history behaviour when a round ends before an extended
      tie-breaker produces a winner; update the specification and design.

## 2. Establish the application foundation

- [ ] 2.1 Create the Väyläkaverit iPhone-first PWA foundation, including installable web-app
      metadata, responsive mobile layout, environment configuration, and local development
      instructions.
- [ ] 2.2 Define Azure infrastructure with Bicep: Azure Static Web Apps, Azure Functions Flex
      Consumption, Azure Cosmos DB serverless, Azure Web PubSub, Key Vault, and Application Insights /
      Azure Monitor. Verify regional availability, scale-to-zero behaviour, cold-start performance,
      telemetry privacy, and expected idle costs. Provision Web PubSub Free tier initially, restrict
      live connections to joined round participants, and create a documented alert and Standard-tier
      upgrade procedure before its 20-connection cap.
- [ ] 2.3 Create the Azure Functions API foundation with persistent storage, authenticated API
      boundaries, live round-update transport, managed-identity data access, and a deployment-safe
      configuration model.
- [ ] 2.4 Create a public MIT-licensed GitHub repository under the `aautere` personal profile;
      configure protected pull requests, secret scanning, GitHub Actions quality checks, Bicep
      validation, OpenID Connect Azure federation, separate development and production resource
      groups, and explicit production-deployment approval.
- [ ] 2.5 Implement Apple sign-in and a device-bound guest session with a display name; ensure
      guest access is restricted to the joined round and their own score mutations.
- [ ] 2.6 Add the verified Golf Talma Master course configuration and validate its hole and tee
      data in automated tests.

## 3. Build shared-round setup

- [ ] 3.1 Implement round creation, course selection, individual tee selection using
      course-configured labels and defaults, round-player handicap-index entry, and a signed-in
      player's changeable men's-rating-table default with per-round override.
- [ ] 3.2 Implement short-lived opaque QR invitations, QR scanning on iPhone, two-to-four player
      joining, expiration/revocation, and full-round error handling.
- [ ] 3.3 Build the shared round lobby so participants can confirm players, tees, and handicap
      readiness before games begin.

## 4. Build score and game logic

- [ ] 4.1 Implement round-scoped score entry for a participant's own scores and score corrections
      for prior holes, with authorization and revision/conflict handling.
- [ ] 4.2 Implement the deterministic scratch and handicap game evaluator, including gross/net
      score calculation, the shared multi-player hole outcome, and recomputation after corrections.
- [ ] 4.3 Implement concurrent game setup for full rounds and selected upcoming hole ranges,
      including participant selection, optional reward text, scratch/handicap mode, and game history.
- [ ] 4.4 Implement per-game tied-hole rules: no winner or carry-forward, plus the group-selected
      participants eligible to resolve a carried win.
- [ ] 4.5 Implement per-game end-tie rules: recorded draw or one-hole-at-a-time continuation until
      a winner, including recording an unfinished extension as unresolved without a winner or draw.

## 5. Build the live round experience

- [ ] 5.1 Publish authoritative score and game-state updates through Azure Web PubSub to every
      joined round participant; let link-only viewers refresh persisted snapshots without a live
      connection; and resynchronize a reconnecting client from a backend snapshot.
- [ ] 5.2 Build the iPhone round view with per-hole score entry, live hole results, game standings,
      pending/reconnecting state, and correction feedback.
- [ ] 5.3 Build the completed-round and completed-game history view with settings, participants,
      hole results, reward text, and final outcome.

## 6. Verify the release

- [ ] 6.1 Add unit tests for course configuration, playing-handicap calculation, scratch and
      handicap outcomes, all tie rules, multi-player outcomes, and score corrections.
- [ ] 6.2 Add integration tests for QR joining, player limits, score authorization, invitation
      expiry, persistence, real-time updates, and reconnection.
- [ ] 6.3 Exercise a two-to-four player round on iPhone-sized Safari viewports, including PWA
      installation, QR joining, a side game, score correction, tie handling, and history review.
- [ ] 6.4 Run the selected project's formatting, type checking, tests, security checks, and
      OpenSpec validation; update the README with setup and preview instructions.
