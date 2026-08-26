# Väyläkaverit

Väyläkaverit is an iPhone-first shared golf-game application. The product is intentionally not
implemented until its requirements, design, and delivery tasks have been agreed through OpenSpec.

## Working agreement

1. Start a capability with `pnpm spec:new <change-name>`.
2. Complete the proposal and review it together.
3. Mark the proposal approved only after an explicit user approval in chat.
4. Add the design, requirement deltas, and tasks.
5. Build only after the task list has been approved.
6. After implementation begins, complete the approved task list one ready task at a time, committing
   and pushing each completed task before continuing automatically to the next.

## Setup

```bash
corepack enable
nvm install 22
nvm use 22
node --version # must print v22.x
pnpm install --frozen-lockfile
pnpm preview
```

## Useful commands

| Command                       | Purpose                                            |
| ----------------------------- | -------------------------------------------------- |
| `pnpm spec:new <change-name>` | Create an OpenSpec change with a proposal          |
| `pnpm spec:validate`          | Validate committed specs and in-flight changes     |
| `pnpm harness:test`           | Test the OpenSpec change wrapper and Azure scripts |
| `pnpm format`                 | Format tracked project files                       |
| `pnpm check`                  | Run all currently applicable quality gates         |

See `AGENTS.md` for the working rules and `openspec/config.yaml` for the specification workflow.

## Local preview

The local preview starts the PWA and in-memory API without Azure credentials. Use Node.js 22:

```bash
nvm use 22
pnpm preview
```

`pnpm preview` invokes `scripts/with-node22.sh`, which selects an already-installed Node 22 runtime
(including the standard `nvm` location) even if the invoking shell is on a newer Node version. It
never installs Node. If it cannot find Node 22, run `nvm install 22 && nvm use 22` first.

The web application is served at <http://127.0.0.1:5173> and the API at
<http://127.0.0.1:7071>. The API defaults to `APP_RUNTIME=local-preview`, which uses an in-memory
round store, so no Azure configuration is required locally. Published development uses
`APP_RUNTIME=shared-development`: it stores rounds in Cosmos DB, keeps device-local guest
identities, and polls for updates so separate devices can join the same test round. Production uses
`APP_RUNTIME=production`, Cosmos DB, Apple authentication, and Web PubSub. The API authenticates to
Cosmos with `DefaultAzureCredential`; grant the Function App's managed identity Cosmos data-plane
access with `scripts/azure-grant-function-data-access.sh` rather than using a connection key.

Local preview and published development use `AUTH_MODE=guest`, creating a device-local guest
identity without Apple credentials. Production requires `AUTH_MODE=apple`, `APPLE_CLIENT_ID`,
`APPLE_TEAM_ID`, `APPLE_KEY_ID`, `APPLE_PRIVATE_KEY`, and a 32-character-or-longer
`SESSION_JWT_SECRET`, all supplied through secure runtime configuration. The current seam
deliberately rejects Apple sign-in requests until a production Apple token verifier and real
settings are supplied; it must not be presented as working Apple login.

Local preview and published development use `ROUND_UPDATE_TRANSPORT=poll`. Joined browser sessions
receive round updates by polling the authoritative snapshot once per second. Production uses
`ROUND_UPDATE_TRANSPORT=web-pubsub`, `WEB_PUBSUB_ENDPOINT`, and `WEB_PUBSUB_HUB`; the Function App
obtains Azure Web PubSub tokens and publishes only to `round:<round-id>` groups after verifying the
caller is a participant. `scripts/azure-grant-function-data-access.sh` assigns the Function App
managed identity the `Web PubSub Service Owner` role those calls require. Link-only viewers can still
refresh the normal round snapshot but cannot obtain a live connection.

### Browser E2E

Run the local two-browser preview flow with:

```bash
nvm use 22
pnpm e2e
```

The test starts `pnpm preview` with Node 22 and uses iPhone 13-sized Chromium contexts. It covers
the Talma shared-round flow plus Rock Golf's 9-hole and two-pass 18-hole choices, dynamic tees,
men's-only rating table, second-pass score correction, and completed history. The PWA manifest
configures standalone display; installation itself still requires manual verification on physical
iPhone Safari. Created rounds also display the opaque invitation URL as a QR code. The join screen
can scan it with a supported mobile camera or accept a pasted link; the latter keeps local browser
E2E independent of camera permissions. It uses preview storage, guest identities, and polling only;
Azure credentials are not required. On a new machine, install the local Chromium binary once with
`pnpm exec playwright install chromium`.

## Azure and production caveats

Local preview does not validate an Azure deployment. Before production release, manually verify
Apple Sign In with production Apple credentials, Azure managed-identity permissions for Cosmos DB
and Web PubSub, deployed PWA installation and updates on physical iPhone Safari, Azure monitoring
and alerts, and GitHub branch protections/required checks. Never place Apple keys, session secrets,
or Azure credentials in this repository.

A deployment workflow reporting success does not prove an environment works. After deploying,
run `./scripts/azure-verify-deployment.sh <environment>` to check the deployed environment against
Azure. See `infra/README.md` for the deployment order and what the verification covers.

## License

MIT. See `LICENSE`.
