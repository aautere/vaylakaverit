# Technology Evaluation Draft

## Status

The product owner approved this technology selection on 25 August 2026. It does not create
application code, provision Azure resources, or change the approved Azure architecture.

## Recommended application stack

| Area                            | Recommendation                                                                | Rationale                                                                                                                                                                    |
| ------------------------------- | ----------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Language and workspace          | TypeScript with pnpm workspaces                                               | One language and shared schemas for the PWA, API, game engine, and tests.                                                                                                    |
| PWA                             | React with Vite and a PWA plugin                                              | A static, iPhone-first SPA with a mature PWA build path and no server-side rendering requirement.                                                                            |
| UI and accessibility            | Tailwind CSS with accessible primitives                                       | Enables a small mobile UI with high contrast, large touch targets, and consistent WCAG AA work.                                                                              |
| Data fetching                   | TanStack Query                                                                | Makes API caching, refresh, mutation status, and reconnect handling explicit.                                                                                                |
| Offline score outbox            | IndexedDB behind a small outbox abstraction                                   | Survives PWA restart and can replay a participant's own pending score writes in order.                                                                                       |
| HTTP API                        | TypeScript Azure Functions using Node.js v4 programming model                 | Azure Functions recommends v4 for new Node.js projects; direct HTTP handlers keep the backend smaller than adding a second server framework.                                 |
| Validation and shared contracts | Zod                                                                           | Validates every external payload and shares game/API shapes between the client and backend.                                                                                  |
| Data store                      | Azure Cosmos DB for NoSQL, serverless account                                 | Fits low-volume, bursty rounds and request-based billing. Mutable round, score, and game state can share a `/roundId` partition for atomic updates.                          |
| Live events                     | Azure Web PubSub Free tier                                                    | Delivers confirmed score updates to joined participants within one second, capped at 20 concurrent participant connections for the first release.                            |
| Authentication                  | Sign in with Apple OAuth handled by the API, plus device-bound guest sessions | The backend must own account linking, score authorization, and deletion. Static Web Apps has built-in GitHub and Entra providers, but Apple requires a custom identity flow. |
| Testing                         | Vitest and Playwright                                                         | Vitest covers deterministic handicap and game rules; Playwright covers the PWA, QR joining, local outbox, and multiple browser clients.                                      |
| Infrastructure                  | Bicep, Azure CLI, and GitHub Actions OIDC                                     | Reproducible Azure environments and no long-lived deployment credentials in the public repository.                                                                           |

### Supported runtime

Use the current Azure Functions-supported Node.js LTS line when implementation begins. The current
Azure Functions Node.js v4 documentation supports Node.js 22 and 24, while the existing harness
currently uses Node 20. The selected runtime must be updated consistently in `.nvmrc`, CI, and
the deployment configuration only after the technology decision is approved.

## Data and consistency design

Cosmos DB documents that must change together for one round use `/roundId` as their partition key.
A score submission writes the score revision and recalculated affected game state in one
single-partition transactional batch. Every response includes a revision so an offline client can
detect a conflict rather than overwrite a newer result.

Player-history indexes may be maintained separately because they do not need to be transactionally
updated with the live round. A history view always reloads authoritative round data before showing
a completed result.

## Realtime decision: accepted

The first release uses Azure Web PubSub Free tier for server-to-client push. This provides managed
WebSocket delivery for up to 20 concurrent participant connections and 20,000 messages per day
without a service charge.

This is an explicit beta constraint rather than automatic unlimited scaling. At four players per
round, it supports up to five full rounds if no player has multiple active connections. Link-only
viewers receive persisted snapshots over HTTPS rather than a Web PubSub connection. The system
alerts the operator before the cap is reached; the documented response is to upgrade to Standard
tier, which has an ongoing instance cost.

## Apple identity prerequisites

Sign in with Apple requires an Apple Developer account, an app identifier or Service ID, approved
return URLs, and signing material. These are later deployment prerequisites. They must be stored
in Azure Key Vault and never sent in chat or committed to the public GitHub repository.

## Talma Master data findings

Golf Talma's official Master page publishes:

- a 18-hole scorecard with tees labelled 48, 52, 56, 60, and 64;
- per-hole par, length, and HCP stroke index; and
- separate men's and women's slope tables for the same tee labels.

The slope-table images display a June 2017 date. The product owner accepted the official published
source for first-release import without a separate Golf Talma confirmation. The implementation
records the source URL and retrieval date and versions a later official change deliberately.

The separate slope tables require a rating-table selection for handicap calculations. A signed-in
profile starts with the men's table as a changeable default, and the player can override it for an
individual round. This is a calculation preference and not stored gender or inferred identity.

Handicap match-play uses the official playing-handicap lookup for the selected tee and rating
table, with a fixed 100% allowance. The lowest playing handicap in a game is the baseline; every
other player receives the non-negative difference as strokes on HCP-index holes 1 through 18,
repeating as needed. A negative playing handicap can be the baseline and receives no penalty
strokes.

## Required implementation validation

1. Build a disposable React/Vite PWA and verify installability and IndexedDB persistence on
   Safari and Chrome in an iPhone-sized viewport.
2. Run a disposable Functions v4 endpoint in the selected Node.js LTS runtime and verify
   scale-to-zero configuration with no always-ready instances.
3. Verify one `/roundId` Cosmos DB transactional batch for a score revision and game-state update.
4. Run two browser clients through the selected live-update approach and measure a score update
   becoming visible within one second.
5. Exercise a disconnected client outbox, reconnection, ordered replay, and a deliberately stale
   score revision.
6. Verify a Sign in with Apple callback and guest-session flow using test credentials supplied
   outside source control.

## Sources

- [Azure Functions Flex Consumption](https://learn.microsoft.com/en-us/azure/azure-functions/flex-consumption-plan)
- [Azure Functions Node.js v4](https://learn.microsoft.com/en-us/azure/azure-functions/functions-reference-node)
- [Azure Static Web Apps authentication](https://learn.microsoft.com/en-us/azure/static-web-apps/authentication-authorization)
- [Azure Web PubSub internals](https://learn.microsoft.com/en-us/azure/azure-web-pubsub/concept-service-internals)
- [Azure Web PubSub pricing](https://azure.microsoft.com/en-us/pricing/details/web-pubsub/)
- [Golf Talma Master](https://golftalma.fi/master/)
