# Implementation Tasks

## 1. Model and API

- [x] 1.1 Add a compatible collection of full-round games to the round model, normalize existing
      single-game records, and calculate every configured game independently while retaining the
      existing primary round-level standing and outcome.
- [x] 1.2 Accept and validate one or more full-round game configurations at the create-round API
      boundary; persist them and assign the complete roster when the lobby starts.
- [x] 1.3 Add targeted store and API tests for multiple games, validation, roster assignment,
      independent results, and legacy single-game compatibility.

## 2. Round creation and presentation

- [x] 2.1 Add accessible, repeatable full-round-game settings to the create-round form, including a
      required first card, add/remove controls, focus restoration, Finnish validation, and
      all-card submission.
- [x] 2.2 Present every configured full-round game independently in the lobby, active-round
      standings, and completed-round history while retaining the existing side-game presentation.
- [x] 2.3 Add targeted frontend coverage for game-card interaction and multiple-game rendering.

## 3. Review and close

- [x] 3.1 Perform the documented UX and accessibility critique with a multiple-game local preview;
      resolve applicable findings and update the review record.
- [x] 3.2 Run the active task's targeted validation and OpenSpec validation; update these artifacts
      if the implementation changes an approved behavior.
